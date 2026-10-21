// Kyle's door: the secret knock. Kyle won't open ("who is it??") until you play the knock: an osu!-style map ON door
// 2004, synced to the 'knock' track (audio.js). Hit circles, sliders and an optional end spinner are door-face points
// projected onto a 2D overlay every frame, with approach circles, 300/100/50/✗ pops, combo, accuracy, score and a
// draining HP bar. HP empty → "WRONG KNOCK": the section restarts (+2.5 s); the third time Kyle opens anyway (+8 s).
// Input: click / tap the circle, or Z / X anywhere (osu keys: they hit whichever note is due; held, they track sliders).
// Timing runs off the AudioContext clock (sample-locked to the track); under ?qa=1 it runs off the game clock.
import { THREE, V, clamp, lerp, seg, smooth, easeInOut, easeOut, mulberry } from './core.js';
import * as Sets from './sets.js';
import { KNOCK_BPM, KNOCK_INTRO, KNOCK_BARS, knockBeat } from './audio.js';

const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa');
const TAU = Math.PI * 2;
// the playfield on the door: u across (z), v up (y), both -1..1
const FACE_X = 1.215, PY = 1.27, PH = 0.5, PW = 0.37;
const onDoor = (u, v, o = V()) => o.set(FACE_X, PY + v * PH, Sets.DOOR_Z + u * PW);
const COLS = [[255, 96, 160], [80, 196, 255], [255, 204, 60], [150, 240, 110]];
const rgba = (c, a, k = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
// checkpoints (song beats): a failed section restarts from its first beat, after one bar of lead-in
const A0 = KNOCK_INTRO * 4, SECS = [['A', A0], ['B', A0 + 16], ['C', A0 + 32], ['D', A0 + 44]];
const SPIN_B = (KNOCK_INTRO + KNOCK_BARS) * 4, END_B = SPIN_B + 4;
// per difficulty (order 1 / 2 / 3+): approach time, hit windows ±s for 300/100/50, HP drain per s, HP lost per miss
const LV = [{ ar: 1.2, w: [0.08, 0.14, 0.2], drain: 0.03, miss: 0.17 }, { ar: 1.0, w: [0.07, 0.125, 0.18], drain: 0.045, miss: 0.2 }, { ar: 0.85, w: [0.06, 0.115, 0.165], drain: 0.06, miss: 0.23 }];
// rhythm per bar: c = circle, s = slider (beat:length, r = with a reverse), f = finisher (clap + whistle)
const PAT = [
  { A: ['c0 c1 c2', 'c0 c1 s2:1', 'c0 c1 c2 c3', 's0:1 c2 c3'], B: ['c0 c1 c1.5 c2 c3', 's0:1.5 c2 c3', 'c0 c0.5 c1 s2:1', 's0:1 s2:1'], C: ['c0 c0.5 c1 c2 c2.5 c3', 's0:1 c1.5 c2 c3', 'c0 c0.5 c1 c1.5 s2:1.5'], D: ['f0 f1.5 f3'] },
  { A: ['c0 c1 c1.5 c2 c3', 's0:1 c1.5 c2 c3', 'c0 c0.5 c1 c2 c3', 's0:1 s2:1'], B: ['c0 c0.5 c1 c1.5 c2 c3', 's0:1r c1.5 c2 c2.5 c3', 'c0 c0.5 c1 s2:1 c3.5', 'c0 c1 c1.5 s2:1.5'], C: ['c0 c0.5 c1 c1.5 c2 c2.5 c3', 's0:0.5 c1 c1.5 s2:1 c3.5', 'c0 c0.5 c0.75 c1 c2 c2.5 c3 c3.5'], D: ['f0 f1.5 f3'] },
  { A: ['c0 c0.5 c1 c1.5 c2 c3', 's0:1r c1.5 c2 c3', 'c0 c0.5 c1 c1.5 c2 c2.5 c3', 's0:1 c1.5 s2:1 c3.5'], B: ['c0 c0.5 c0.75 c1 c2 c2.5 c2.75 c3', 's0:1r c1.5 c2 c2.5 c3 c3.5', 'c0 c0.5 c1 c1.5 c2 c2.25 c2.5 c3', 's0:0.5 c1 s1.5:1 c3 c3.5'], C: ['c0 c0.25 c0.5 c1 c1.5 c2 c2.25 c2.5 c3', 's0:1r c1.5 c1.75 c2 s2.5:1', 'c0 c0.5 c1 c1.25 c1.5 c2 c2.5 c3 c3.25 c3.5'], D: ['f0 f1.5 f3'] },
];
const bez = (p, s) => { const [a, b, c] = p, k = 1 - s; return [k * k * a[0] + 2 * k * s * b[0] + s * s * c[0], k * k * a[1] + 2 * k * s * b[1] + s * s * c[1]]; };
const inside = (x, y) => Math.abs(x) <= 0.86 && Math.abs(y) <= 0.86;

// the beatmap: built from the song's BPM/offset constants, positions flow like a mapper's (spacing ∝ time gap)
export function buildMap(lvl, tut, seed = 1) {
  const r = mulberry(seed), objs = [];
  const add = (b0, tok, nc) => { const m = /^([csf])([\d.]+)(?::([\d.]+)(r?))?$/.exec(tok); objs.push({ kind: m[1] === 's' ? 'slider' : 'circle', fin: m[1] === 'f', b: b0 + +m[2], len: m[3] ? +m[3] : 0, rep: m[4] ? 1 : 0, nc }); };
  if (tut) [3, 5, 7].forEach((b, i) => add(b, 'c0', i === 0));
  let bar = KNOCK_INTRO;
  for (const s of ['A', 'B', 'C', 'D']) for (const p of PAT[lvl][s]) { p.split(' ').forEach((tok, i) => add(bar * 4, tok, i === 0 && ((bar - KNOCK_INTRO) % 2 === 0 || s === 'D'))); bar++; }
  let x = -0.45, y = 0.35, ang = -0.5, prev = null, n = 0, ci = -1;
  for (const o of objs) {
    o.t = knockBeat(o.b); o.tEnd = knockBeat(o.b + o.len);
    if (o.nc || ci < 0) { ci++; n = 0; } o.n = ++n; o.col = COLS[ci % COLS.length];
    if (tut && o.b < A0) { [o.u, o.v] = [[-0.5, 0.1], [0, -0.25], [0.5, 0.1]][o.n - 1]; x = o.u; y = o.v; prev = o; continue; }
    if (prev) {
      const gap = o.b - (prev.b + prev.len), d = clamp(0.1 + gap * 0.5, 0.2, 0.95);
      ang += o.nc ? 1.6 + (r() - 0.5) * 1.6 : (r() - 0.5) * 0.9 + (gap <= 0.5 ? 0.3 : 0.7);
      let nx = x, ny = y;
      for (let k = 0; k < 12; k++) { nx = x + Math.cos(ang) * d; ny = y + Math.sin(ang) * d; if (inside(nx, ny)) break; ang += 0.55; }
      x = clamp(nx, -0.86, 0.86); y = clamp(ny, -0.86, 0.86);
    }
    o.u = x; o.v = y;
    if (o.kind === 'slider') {
      const L = clamp(0.32 + (o.len / (o.rep + 1)) * 0.38, 0.32, 0.8); let sa = ang + (r() - 0.5) * 1.2, ex = x, ey = y;
      for (let k = 0; k < 12; k++) { ex = x + Math.cos(sa) * L; ey = y + Math.sin(sa) * L; if (inside(ex, ey)) break; sa += 0.55; }
      ex = clamp(ex, -0.86, 0.86); ey = clamp(ey, -0.86, 0.86);
      const bend = (r() - 0.5) * 0.7 * L, mx = (x + ex) / 2 - Math.sin(sa) * bend, my = (y + ey) / 2 + Math.cos(sa) * bend;
      o.path = [[x, y], [mx, my], [ex, ey]];
      if (!o.rep) { x = ex; y = ey; ang = sa; } else ang = sa + Math.PI;
    }
    prev = o;
  }
  objs.push({ kind: 'spin', b: SPIN_B, len: 3.5, t: knockBeat(SPIN_B), tEnd: knockBeat(SPIN_B + 3.5), u: 0, v: 0, n: 0, col: COLS[0] });
  return objs;
}
const sliderAt = (o, t) => { const span = (o.tEnd - o.t) / (o.rep + 1); let s = clamp((t - o.t) / span, 0, o.rep + 1); const leg = Math.min(o.rep, Math.floor(s)); s -= leg; if (leg % 2) s = 1 - s; return bez(o.path, clamp(s)); };

export class Knock {
  constructor(F) {
    this.F = F; const G = F.G;
    this.lvl = G.order <= 1 ? 0 : G.order === 2 ? 1 : 2; this.L = LV[this.lvl];
    let seen = false; try { seen = localStorage.getItem('tipbait:knockSeen') === '1'; } catch {}
    this.tut = !seen;
    this.objs = buildMap(this.lvl, this.tut, 7 + G.order * 31);
    this.notes = this.objs.filter((o) => o.kind !== 'spin'); this.spin = this.objs.find((o) => o.kind === 'spin');
    Object.assign(this, { st: 'intro', t: 0, T: 0, clk: 0, useAudio: false, hp: 1, combo: 0, maxCombo: 0, fails: 0, pen: 0, forced: false, keys: new Set(), down: false, kc: [0, 0], fx: [], trail: [], cur: { x: -99, y: -99, on: 0, touch: false }, shake: 0, muffle: 0 });
    const cam = F.camera; this.c0 = cam.position.clone(); this.q0 = cam.quaternion.clone(); this.f0 = cam.fov;
    this.p0 = G.R.root.position.clone(); this.y0 = G.R.root.rotation.y;
    this.tmp = V(); this.W = innerWidth; this.H = innerHeight; this.r = 40; this.pts = 0; this.secPts = {};
  }
  // ------------------------------------------------------------------ setup / teardown
  start() {
    const { F } = this, UI = F.UI, A = F.Audio, touch = matchMedia('(pointer: coarse)').matches;
    A.music(null); A.prefetch('knock');
    this.el = UI.layer('knock', `<canvas class="kn-cv"></canvas>
      <div class="kn-top"><div class="kn-hp"><i></i></div><div class="kn-sc"><b>00000000</b><span><i class="kn-pie"></i><em>100.00%</em></span></div></div>
      <div class="kn-combo"><b>0x</b></div>
      <div class="kn-keys${touch ? ' off' : ''}"><span>Z<small>0</small></span><span>X<small>0</small></span></div>
      <div class="kn-shout"></div><div class="kn-big"></div>
      <div class="kn-card"><small>Kyle’s door · apt 2004</small><h2>PLAY THE SECRET KNOCK</h2><p>${touch ? 'tap the circles as the rings close · hold sliders' : 'click the circles as the rings close · or <kbd>Z</kbd> <kbd>X</kbd> anywhere · hold for sliders'}</p><p class="kn-warn">drop the HP bar and he won’t open · <b>+2.5 s</b> per retry</p></div>
      <div class="kn-rank"></div>`);
    this.el.classList.add('kn-on');
    this.cv = this.el.querySelector('.kn-cv'); this.cx = this.cv.getContext('2d');
    this.$ = (s) => this.el.querySelector(s);
    this.hpEl = this.$('.kn-hp i'); this.scEl = this.$('.kn-sc b'); this.accEl = this.$('.kn-sc em'); this.pieEl = this.$('.kn-pie'); this.comboEl = this.$('.kn-combo b'); this.keyEls = [...this.el.querySelectorAll('.kn-keys span')];
    const KEYS = { z: 0, x: 1 };
    this.onKey = (e) => { const k = e.key.toLowerCase(); if (!(k in KEYS)) return; e.preventDefault(); if (e.type === 'keyup') { this.keys.delete(k); this.keyEls[KEYS[k]].classList.remove('on'); return; } if (e.repeat) return; this.keys.add(k); this.kc[KEYS[k]]++; const ke = this.keyEls[KEYS[k]]; ke.classList.add('on'); ke.querySelector('small').textContent = this.kc[KEYS[k]]; this.press('key', null, null, k); };
    const xy = (e) => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.onPtr = (e) => {
      const [x, y] = xy(e), c = this.cur; c.touch = e.pointerType !== 'mouse';
      if (e.type === 'pointermove') { c.x = x; c.y = y; if (!c.touch || this.down) c.on = 1; return; }
      if (e.type === 'pointerdown') { this.down = true; c.x = x; c.y = y; c.on = 1; this.trail.length = 0; this.press('ptr', x, y); return; }
      this.down = false;
    };
    window.addEventListener('keydown', this.onKey); window.addEventListener('keyup', this.onKey);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) this.el.addEventListener(ev, this.onPtr);
    this.onVis = () => { if (document.hidden && this.st === 'play') { this.F.Audio.music(null); this.st = 'hold'; } else if (!document.hidden && this.st === 'hold') this.restart(false); };
    document.addEventListener('visibilitychange', this.onVis);
    this.onBlur = () => { this.keys.clear(); this.down = false; for (const k of this.keyEls) k.classList.remove('on'); };
    window.addEventListener('blur', this.onBlur);
  }
  dispose() {
    if (this.gone) return; this.gone = true;
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('keyup', this.onKey);
    document.removeEventListener('visibilitychange', this.onVis); window.removeEventListener('blur', this.onBlur);
    this.F.UI.remove('knock'); this.F.Audio.muffle(20000, 0.3);
  }
  // ------------------------------------------------------------------ clock
  songT() { if (this.useAudio) { const t = this.F.Audio.musicTime(); if (t != null) return t; } return this.clk; }
  startSong(off) {
    const A = this.F.Audio;
    this.clk = off; this.useAudio = !QA && A.unlocked && A.musicAt('knock', off);
    this.setMuffle(true);
  }
  setMuffle(now = false) { // through the door: the better the combo, the more the door "opens up"
    const hz = this.st === 'rank' || this.st === 'out' ? 20000 : 420 * Math.pow(2, Math.min(this.combo, 36) / 6);
    if (now || Math.abs(Math.log2(hz / (this.muffle || 1))) > 0.15) { this.F.Audio.muffle(hz, now ? 0.01 : 0.18); this.muffle = hz; }
  }
  // ------------------------------------------------------------------ judging
  due() { return this.notes.find((o) => o.hit == null); }
  press(src, x, y, key) {
    if (this.st === 'rank') { if (this.rt > 1.0) this.leave(); return; }
    if (this.st !== 'play') return;
    const t = this.songT(), sp = this.spin;
    if (t >= sp.t && t <= sp.tEnd + 0.05) { if (src === 'key' && key !== this.lastKey) this.spinAdd(0.25); this.lastKey = key; return; }
    const o = this.due(); if (!o) return;
    if (src === 'ptr' && Math.hypot(x - o.sx, y - o.sy) > this.r * 1.2) return; // clicked beside the note
    const d = t - o.t, w = this.L.w;
    if (d < -w[2]) { if (-d < this.L.ar) o.shake = this.T; return; } // too early: notelock shake, like osu
    if (d > w[2]) return;
    const v = Math.abs(d) <= w[0] ? 300 : Math.abs(d) <= w[1] ? 100 : 50;
    this.hitHead(o, v, d);
  }
  hitHead(o, v, d = 0) {
    const A = this.F.Audio; o.hit = v; o.err = d;
    if (o.kind === 'circle') return this.judge(o, v, o.u, o.v);
    if (v) { this.addCombo(); this.score(30, false); this.hp = Math.min(1, this.hp + 0.02); A.sfx('tok', 0.85); this.burst(o.u, o.v, o.col); }
    else this.breakCombo(o.u, o.v, true);
  }
  judge(o, v, u, w) { // final judgement for a circle / slider: score, HP, combo, pop
    const A = this.F.Audio; o.res = v; o.done = true;
    if (v) {
      if (o.kind === 'circle') this.addCombo();
      this.score(v, true); this.hp = Math.min(1, this.hp + (v === 300 ? 0.07 : v === 100 ? 0.035 : 0.005));
      if (o.kind === 'circle') { A.sfx('tok', 0.9); if (o.fin) { A.sfx('fclap', 0.9); A.sfx('whistle', 0.6); } this.burst(u, w, o.col, o.fin); }
    } else this.breakCombo(u, w, o.kind === 'circle');
    this.fx.push({ k: 'j', v, u, w, t: this.T, fin: o.fin });
  }
  addCombo() { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboPop = this.T; this.setMuffle(); }
  breakCombo(u, w, hpHit) {
    if (this.combo >= 5) this.F.Audio.sfx('cbreak', 0.7);
    this.combo = 0; this.setMuffle(); if (hpHit) this.hp -= this.L.miss;
    this.shake = 1;
  }
  score(v, mult) { this.pts = (this.pts || 0) + Math.round(v * (mult ? 1 + Math.max(0, this.combo - 1) / 25 : 1)); }
  spinAdd(rot) {
    const s = this.spin; s.rot = (s.rot || 0) + rot;
    const k = Math.floor(s.rot * 2); if (k > (s.ticks || 0)) { s.ticks = k; this.F.Audio.sfx('spin', 0.5, 1 + Math.min(1, s.rot / 6)); if (s.rot >= 3) this.score(100, false); }
    if (s.rot >= 3 && !s.clear) { s.clear = true; this.F.Audio.sfx('fclap', 0.8); this.F.Audio.sfx('whistle', 0.5, 1.2); }
  }
  burst(u, w, col, big = false) { this.fx.push({ k: 'b', u, w, col, t: this.T, big }); for (let i = 0; i < (big ? 16 : 7); i++) { const a = Math.random() * TAU, s = 0.6 + Math.random() * 0.9; this.fx.push({ k: 's', u, w, col, t: this.T, dx: Math.cos(a) * s, dy: Math.sin(a) * s }); } }
  stats() {
    const done = this.notes.filter((o) => o.res != null), c = { 300: 0, 100: 0, 50: 0, 0: 0 };
    for (const o of done) c[o.res]++;
    const acc = done.length ? (300 * c[300] + 100 * c[100] + 50 * c[50]) / (300 * done.length) : 1;
    return { c, acc, n: done.length };
  }
  rank(acc, miss) { return this.forced ? 'D' : acc >= 1 ? 'SS' : acc >= 0.93 && !miss ? 'S' : acc >= 0.9 ? 'A' : acc >= 0.8 ? 'B' : acc >= 0.7 ? 'C' : 'D'; }
  // ------------------------------------------------------------------ fail / restart
  fail() {
    const F = this.F, A = F.Audio; this.fails++; this.st = 'fail'; this.ft = 0;
    A.music(null); A.muffle(300, 0.05); A.sfx('boom', 0.7); A.sfx('cbreak', 0.8); A.sfx('bwomp', 0.5);
    this.shake = 1.6;
    const last = this.fails > 2;
    if (last) { this.forced = true; this.pen += 8; } else this.pen += 2.5;
    F.UI.timeCost?.(last ? 8 : 2.5, last ? 'kyle gave up on the knock' : 'wrong knock');
    this.big('WRONG KNOCK', last ? 'he’s opening anyway · <b>+8 s</b>' : `section restart · ${2 - this.fails} ${2 - this.fails === 1 ? 'retry' : 'retries'} left`);
    this.shout(['WRONG KNOCK.', 'that is NOT the knock bro', 'omg. FINE. i’m coming'][Math.min(2, this.fails - 1)], true);
  }
  restart(penalised = true) {
    const due = this.notes.find((o) => !o.done) || this.notes[this.notes.length - 1];
    let sb = SECS[0][1]; for (const [, b] of SECS) if (due.b >= b) sb = b;
    if (this.tut && due.b < A0) sb = 0;
    for (const o of this.notes) if (o.b >= sb) { o.hit = o.res = o.end = o.err = o.shake = null; o.done = false; o.trk = 0; o.reps = 0; }
    this.fx.length = 0; this.combo = 0; this.hp = 1; this.st = 'play'; this.fresh = this.T;
    const s = this.spin; s.rot = 0; s.ticks = 0; s.clear = false;
    this.pts = this.secPts[sb] ?? 0;
    this.startSong(Math.max(0, knockBeat(sb - 4) - 0.05));
    this.$('.kn-big').classList.remove('in'); void penalised;
  }
  big(h, sub) { const e = this.$('.kn-big'); e.innerHTML = `<b>${h}</b><small>${sub}</small>`; e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }
  shout(text, loud = false) { const e = this.$('.kn-shout'); e.innerHTML = `<small>Kyle, through the door</small>${text}`; e.classList.toggle('loud', loud); e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); clearTimeout(this.shT); this.shT = setTimeout(() => e.classList.remove('in'), 1700); }
  // ------------------------------------------------------------------ results
  finish() {
    const F = this.F, G = F.G, { c, acc } = this.stats(), rank = this.rank(acc, c[0]);
    this.st = 'rank'; this.rt = 0; this.result = { rank, acc, c };
    const s = this.spin, bonus = s.clear ? Math.round((s.rot - 3) * 1000 + 1000) : 0; this.pts += Math.max(0, bonus);
    G.score += Math.round(this.pts / 100);
    G.fin = { ...(G.fin || {}), knock: rank, knockT: this.pen, knockAcc: acc, knockCombo: this.maxCombo, knockLabel: `${rank} · ${(acc * 100).toFixed(2)}% · ${this.maxCombo}x${this.forced ? ' · he gave up' : ''}` };
    try { localStorage.setItem('tipbait:knockSeen', '1'); } catch {}
    F.Audio.muffle(20000, 0.25);
    const col = { SS: '#ffe27a', S: '#ffd23d', A: '#7dff8a', B: '#5ec8ff', C: '#c58cff', D: '#ff5e5e' }[rank];
    const row = (lab, n, cl) => `<div class="kn-r ${cl}"><b>${lab}</b><span>${n}</span></div>`;
    const el = this.$('.kn-rank');
    el.innerHTML = `<div class="kn-rl" style="--rc:${col}">${rank}</div><div class="kn-rd"><small>${this.forced ? 'he opened anyway' : rank === 'SS' || rank === 'S' ? 'that’s the knock' : 'close enough'}</small>
      <div class="kn-rs">${String(this.pts).padStart(8, '0')}</div>
      <div class="kn-rg">${row('300', c[300], 'g3')}${row('100', c[100], 'g1')}${row('50', c[50], 'g5')}${row('✗', c[0], 'gx')}</div>
      <div class="kn-rm"><span><small>accuracy</small>${(acc * 100).toFixed(2)}%</span><span><small>max combo</small>${this.maxCombo}x</span>${s.clear ? `<span><small>spinner</small>+${bonus}</span>` : ''}</div>
      ${this.pen ? `<div class="kn-rp">${this.fails} wrong knock${this.fails > 1 ? 's' : ''} · <b>+${this.pen} s</b></div>` : ''}
      <div class="kn-rc">${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click / Z'} to continue</div></div>`;
    el.classList.add('in'); this.$('.kn-big').classList.remove('in');
    F.Audio.sfx(rank === 'D' ? 'bwomp' : 'jingle', 0.6);
  }
  leave() { if (this.st !== 'rank') return; this.st = 'out'; this.ot = 0; this.$('.kn-rank').classList.remove('in'); this.el.classList.add('kn-fade'); this.F.Audio.sfx('snap', 0.5); this.F.Audio.sfx('creak', 0.5, 1.2); this.shout(this.forced ? 'ugh. coming.' : ['…ok that’s the knock', 'yeah yeah coming', 'oh it’s u. hold on'][Math.floor(this.F.G.order % 3)]); }
  skip() { if (this.st === 'rank') this.leave(); }
  // QA: what's on screen
  qa() { return { st: this.st, t: +this.songT().toFixed(3), hp: +this.hp.toFixed(2), combo: this.combo, fails: this.fails, pen: this.pen, r: this.r, objs: this.objs.filter((o) => !o.done && o.kind !== 'spin').slice(0, 4).map((o) => { const b = o.kind === 'slider' ? this.scr(...sliderAt(o, clamp(this.songT(), o.t, o.tEnd))) : []; return { i: this.objs.indexOf(o), kind: o.kind, t: o.t, tEnd: o.tEnd, x: o.sx, y: o.sy, bx: b[0], by: b[1], hit: o.hit }; }), spin: [this.spin.t, this.spin.tEnd, this.spin.rot || 0], cx: this.cx0, cy: this.cy0, res: this.result }; }
  // ------------------------------------------------------------------ per frame
  update(dt) {
    const F = this.F, cam = F.camera, A = F.Audio;
    this.t += dt; this.T += dt; this.shake = Math.max(0, this.shake - dt * 3);
    // intro: hall camera → the door, a normal knock, Kyle won't open, the card, then the count-in
    if (this.st === 'intro') {
      const t = this.t;
      if (t > 0.45 && !this.k1) { this.k1 = true; A.sfx('knock', 0.9); }
      if (t > 0.7 && !this.k2) { this.k2 = true; A.sfx('knock', 0.9, 1.05); }
      if (t > 1.05 && !this.sh) { this.sh = true; this.shout('who is it??'); A.sfx('bwomp', 0.25, 1.6); }
      if (t > 1.5 && !this.cd) { this.cd = true; this.$('.kn-card').classList.add('in'); A.sfx('rise', 0.5); }
      if (t > 3.5) { this.$('.kn-card').classList.remove('in'); this.st = 'play'; this.fresh = this.T; this.startSong(this.tut ? 0 : Math.max(0, knockBeat(4) - 0.05)); }
    } else if (this.st === 'play') {
      this.clk += dt; this.tick(this.songT(), dt);
    } else if (this.st === 'fail') {
      this.ft += dt;
      if (this.ft > 1.8) { if (this.forced) this.finish(); else this.restart(); }
    } else if (this.st === 'rank') {
      this.rt += dt; if (this.rt > (QA ? 3.2 : 6)) this.leave();
    }
    this.pose(dt);
    if (this.st === 'out') {
      this.ot += dt; const u = easeInOut(clamp(this.ot / 0.9));
      cam.position.copy(this.camK.p).lerp(V(-1.05, 1.12, Sets.DOOR_Z + 0.75), u);
      const look = this.camK.l.clone().lerp(V(1.2, 1.55, Sets.DOOR_Z - 0.05), u); cam.lookAt(look);
      cam.fov = lerp(this.camK.fov, 64, u); cam.updateProjectionMatrix();
      if (this.ot >= 0.9) { this.dispose(); F.beginDoor(); return; }
    } else this.frame(cam, dt);
    this.draw();
  }
  frame(cam, dt) { // the knock shot: square on to the door, lens fitted so the playfield fills portrait or landscape
    const D = 1.78, aspect = cam.aspect || 1, hh = Math.max(PH + 0.36, (PW + 0.2) / aspect);
    const fov = 2 * Math.atan(hh / D) * 180 / Math.PI, sh = this.shake * 0.006;
    const p = V(FACE_X - D, PY + 0.04, Sets.DOOR_Z + 0.02), l = V(FACE_X, PY + 0.02, Sets.DOOR_Z);
    p.x += Math.sin(this.T * 0.7) * 0.01 + (Math.random() - 0.5) * sh; p.y += Math.sin(this.T * 0.9) * 0.008 + (Math.random() - 0.5) * sh;
    this.camK = { p, l, fov };
    const u = this.st === 'intro' ? easeInOut(clamp(this.t / 1.1)) : 1;
    if (u < 1) { const q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p, l, cam.up)); cam.position.copy(this.c0).lerp(p, u); cam.quaternion.copy(this.q0).slerp(q1, u); cam.fov = lerp(this.f0, fov, u); }
    else { cam.position.copy(p); cam.lookAt(l); cam.fov = fov; }
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  pose(dt) { // the courier waits just behind the knock camera (the door stays a clean playfield), then steps up as it opens
    const F = this.F, R = F.G.R, A = V(-0.95, 0, Sets.DOOR_Z + 0.05), B = V(0.15, 0, Sets.DOOR_Z - 0.15);
    if (this.st === 'out') {
      const u = smooth(clamp(this.ot / 0.85)); R.root.position.copy(A).lerp(B, u); R.root.rotation.set(0, Math.PI / 2, 0);
      R.walk(u < 0.97 ? 'walk' : 'idle', this.ot * 1.3, { offset: V(0, 0, 0), yaw: 0 });
    } else {
      const u = this.st === 'intro' ? smooth(clamp(this.t / 0.9)) : 1;
      R.root.position.copy(this.p0).lerp(A, u); R.root.rotation.set(0, lerp(this.y0, Math.PI / 2, u), 0);
      R.walk('idle', 1 + this.T, { offset: V(0, 0, 0), yaw: 0 });
    }
    F.palmCup?.(F.cup, R.C); F.cup.visible = true;
  }
  tick(t, dt) {
    const L = this.L, w = L.w, A = this.F.Audio;
    for (const [, b] of SECS) if (t >= knockBeat(b) - 0.3 && this.secPts[b] == null) this.secPts[b] = this.pts; // score to roll back to on a retry
    for (const o of this.notes) {
      if (o.done) continue;
      if (o.hit == null && t > o.t + w[2]) this.hitHead(o, 0); // too late: miss
      if (o.kind === 'slider' && o.hit != null && !o.done) {
        if (t >= o.t) o.trk = this.tracking(o, t) ? Math.min(1, (o.trk || 0) + dt * 8) : 0;
        const legs = o.rep + 1, span = (o.tEnd - o.t) / legs;
        for (let k = 1; k < legs; k++) if (t >= o.t + span * k && !(o.reps > k - 1)) { o.reps = k; if (o.trk > 0) { A.sfx('tok', 0.6, 1.2); this.addCombo(); this.score(30, false); } }
        if (t >= o.tEnd) {
          o.end = o.trk > 0; const parts = (o.hit > 0 ? 1 : 0) + (o.end ? 1 : 0), [eu, ev] = sliderAt(o, o.tEnd);
          if (o.end) { this.addCombo(); this.score(30, false); A.sfx('sdrum', 0.9); this.burst(eu, ev, o.col); }
          this.judge(o, parts === 2 ? 300 : parts === 1 ? 100 : 0, eu, ev);
        }
      }
      if (o.t > t + L.ar) break;
    }
    // spinner: pointer held and circling the centre, or Z/X alternating
    const s = this.spin;
    if (t >= s.t && t <= s.tEnd && (this.down || this.keys.size) && this.cur.on) {
      const a = Math.atan2(this.cur.y - this.cy0, this.cur.x - this.cx0);
      if (this.sa != null) { let d = a - this.sa; d -= Math.round(d / TAU) * TAU; if (Math.abs(d) < 1.2) this.spinAdd(Math.abs(d) / TAU); }
      this.sa = a;
    } else this.sa = null;
    // HP drains while notes are live (not over the count-in, the tutorial or the spinner)
    const first = this.notes.find((o) => o.b >= A0), last = this.notes[this.notes.length - 1];
    if (t > first.t - 0.2 && t < last.tEnd) this.hp -= L.drain * dt;
    if (this.hp <= 0) { this.hp = 0; return this.fail(); }
    if (t >= knockBeat(END_B) - 0.02) this.finish();
  }
  tracking(o, t) { if (this.keys.size) return true; if (!this.down) return false; const [u, v] = sliderAt(o, t), p = this.scr(u, v); return Math.hypot(this.cur.x - p[0], this.cur.y - p[1]) < this.r * 2.4; }
  // ------------------------------------------------------------------ drawing
  scr(u, v) { const p = onDoor(u, v, this.tmp).project(this.F.camera); return [(p.x + 1) / 2 * this.W, (1 - p.y) / 2 * this.H]; }
  draw() {
    const cv = this.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    this.W = W; this.H = H; const c = this.cx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const top = this.scr(0, 1), bot = this.scr(0, -1); this.r = clamp(Math.abs(bot[1] - top[1]) * 0.095, 26, 64); const r = this.r;
    [this.cx0, this.cy0] = this.scr(0, 0);
    // Kyle's shout sits over the door's head jamb
    const sp = this.scr(0, 1.55); this.el.style.setProperty('--shx', sp[0] + 'px'); this.el.style.setProperty('--shy', Math.max(70, sp[1]) + 'px');
    const t = this.st === 'play' || this.st === 'fail' || this.st === 'hold' ? this.songT() : -9, ar = this.L.ar, fade = this.st === 'out' ? 1 - clamp(this.ot / 0.3) : 1;
    c.globalAlpha = fade;
    for (const o of this.objs) { const p = this.scr(o.u, o.v); o.sx = p[0]; o.sy = p[1]; }
    if (this.st === 'play' || this.st === 'fail' || this.st === 'hold') {
      const vis = this.objs.filter((o) => o.kind !== 'spin' && !o.done && t > o.t - ar && t < o.tEnd + 0.25);
      const gone = this.st === 'fail' ? 1 - clamp(this.ft / 0.5) : 1;
      // follow points between consecutive notes, like osu
      c.save(); c.globalAlpha = 0.35 * gone * fade; c.strokeStyle = '#fff'; c.lineWidth = 2;
      for (let i = 0; i < this.notes.length - 1; i++) { const a = this.notes[i], b = this.notes[i + 1]; if (b.nc || b.done || t < b.t - ar || t > b.t) continue; const ae = a.kind === 'slider' ? this.scr(...a.path[a.rep ? 0 : 2]) : [a.sx, a.sy], d = Math.hypot(b.sx - ae[0], b.sy - ae[1]); if (d < r * 2.6) continue; const n = Math.floor((d - 2 * r) / 28); for (let k = 1; k <= n; k++) { const f = (r + k * ((d - 2 * r) / (n + 1))) / d, x = lerp(ae[0], b.sx, f), y = lerp(ae[1], b.sy, f); c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fillStyle = '#fff'; c.fill(); } }
      c.restore();
      for (let i = vis.length - 1; i >= 0; i--) this.drawObj(vis[i], t, r, gone * fade);
      const s = this.spin; if (t > s.t - 0.4 && t < s.tEnd + 0.4) this.drawSpin(s, t, gone * fade);
    }
    // effects (screen-anchored to the door, so they ride the camera's breathing)
    this.fx = this.fx.filter((f) => this.T - f.t < 0.9);
    for (const f of this.fx) {
      const a = this.T - f.t, [x, y] = this.scr(f.u, f.w);
      if (f.k === 'b') { const k = clamp(a / 0.28); c.globalAlpha = (1 - k) * fade; c.lineWidth = r * 0.14; c.strokeStyle = rgba(f.col, 1, 1.15); c.beginPath(); c.arc(x, y, r * (1 + k * (f.big ? 0.9 : 0.45)), 0, TAU); c.stroke(); c.fillStyle = rgba(f.col, 0.35 * (1 - k)); c.fill(); }
      else if (f.k === 's') { const k = clamp(a / 0.45); c.globalAlpha = (1 - k) * fade; c.fillStyle = rgba(f.col, 1, 1.25); c.beginPath(); c.arc(x + f.dx * r * 1.8 * easeOut(k), y + f.dy * r * 1.8 * easeOut(k), r * 0.07 * (1 - k * 0.6), 0, TAU); c.fill(); }
      else if (f.k === 'j') {
        const k = clamp(a / 0.7), pop = a < 0.08 ? 0.7 + a / 0.08 * 0.6 : 1.3 - Math.min(0.3, (a - 0.08) * 2);
        const [txt, col] = f.v === 300 ? ['300', '#7fd6ff'] : f.v === 100 ? ['100', '#8dff6a'] : f.v === 50 ? ['50', '#ffc23d'] : ['✗', '#ff3b3b'];
        c.globalAlpha = (1 - easeOut(seg(k, 0.55, 1))) * fade; c.font = `900 ${Math.round(r * (f.v ? 0.62 : 1.0) * pop)}px Archivo, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const yy = y - (f.v ? r * 1.05 : -a * r * 0.8); c.lineWidth = Math.max(3, r * 0.1); c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(txt, x, yy); c.fillStyle = col; c.fillText(txt, x, yy);
      }
    }
    c.globalAlpha = 1;
    this.drawCursor(c, r);
    this.hud();
  }
  drawObj(o, t, r, A) {
    const c = this.cx, ar = this.L.ar, appear = clamp((t - (o.t - ar)) / (ar * 0.4)), x0 = o.sx, y0 = o.sy;
    let shx = 0; if (o.shake != null && this.T - o.shake < 0.25) shx = Math.sin((this.T - o.shake) * 70) * r * 0.12 * (1 - (this.T - o.shake) / 0.25);
    const x = x0 + shx, y = y0;
    if (o.kind === 'slider') {
      const pts = []; for (let k = 0; k <= 24; k++) pts.push(this.scr(...bez(o.path, k / 24)));
      const out = t > o.tEnd ? 1 - clamp((t - o.tEnd) / 0.2) : 1;
      c.save(); c.globalAlpha = A * appear * out; c.lineCap = c.lineJoin = 'round';
      const stroke = (wd, st) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0] + shx, p[1]) : c.moveTo(p[0] + shx, p[1]))); c.lineWidth = wd; c.strokeStyle = st; c.stroke(); };
      stroke(r * 2, 'rgba(255,255,255,.95)'); stroke(r * 1.8, rgba(o.col, 0.92, 0.32)); stroke(r * 1.1, rgba(o.col, 0.55, 0.5)); stroke(r * 0.4, rgba(o.col, 0.35, 0.8));
      const e = pts[24]; this.disc(e[0] + shx, e[1], r, o.col, 1, '');
      if (o.rep && !(o.reps >= 1)) { c.fillStyle = '#fff'; c.font = `900 ${Math.round(r * 0.9)}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↺', e[0] + shx, e[1]); }
      c.restore();
      if (t >= o.t && t <= o.tEnd + 0.05) { // the ball, and the follow circle while you're tracking it
        const [bu, bv] = sliderAt(o, Math.min(t, o.tEnd)), [bx, by] = this.scr(bu, bv);
        c.save(); c.globalAlpha = A; this.disc(bx, by, r * 0.9, o.col, 1, '');
        if (o.trk > 0) { c.globalAlpha = A * o.trk; c.lineWidth = r * 0.1; c.strokeStyle = rgba(o.col, 0.9, 1.2); c.beginPath(); c.arc(bx, by, r * (2.4 - o.trk * 0.4), 0, TAU); c.stroke(); }
        c.restore();
      }
      if (o.hit != null) return; // head already played
    }
    c.save(); c.globalAlpha = A * appear; this.disc(x, y, r, o.col, 1, String(o.n), o.fin); c.restore();
    if (t < o.t) { const k = clamp((o.t - t) / ar); c.save(); c.globalAlpha = A * appear; c.lineWidth = Math.max(2, r * 0.08); c.strokeStyle = rgba(o.col, 1, 1.1); c.beginPath(); c.arc(x, y, r * (1 + 2.8 * k), 0, TAU); c.stroke(); c.restore(); }
    if (this.tut && o.b < A0 && o.n === 1 && t < o.t + 0.1) { c.save(); c.globalAlpha = A * appear; c.font = `800 ${Math.round(clamp(r * 0.42, 13, 20))}px Figtree, system-ui`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4; const tx = matchMedia('(pointer: coarse)').matches ? 'tap when the ring closes' : 'click / Z when the ring closes'; c.strokeText(tx, x, y + r * 1.75); c.fillText(tx, x, y + r * 1.75); c.restore(); }
  }
  disc(x, y, r, col, a, num, fin = false) {
    const c = this.cx;
    c.beginPath(); c.arc(x, y + r * 0.06, r * 1.04, 0, TAU); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
    const g = c.createRadialGradient(x, y - r * 0.45, r * 0.1, x, y, r); g.addColorStop(0, rgba(col, 1, 1.18)); g.addColorStop(1, rgba(col, 1, 0.62));
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
    c.lineWidth = r * 0.13; c.strokeStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.93, 0, TAU); c.stroke();
    if (fin) { c.lineWidth = r * 0.06; c.beginPath(); c.arc(x, y, r * 0.7, 0, TAU); c.stroke(); }
    if (num) { c.font = `900 ${Math.round(r * 0.82)}px Archivo, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = r * 0.12; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(num, x, y + r * 0.05); c.fillStyle = '#fff'; c.fillText(num, x, y + r * 0.05); }
  }
  drawSpin(s, t, A) {
    const c = this.cx, x = this.cx0, y = this.cy0, R = Math.min(this.W, this.H) * 0.34, k = clamp((t - s.t) / (s.tEnd - s.t)), inA = clamp((t - s.t + 0.4) / 0.4) * (t > s.tEnd ? 1 - clamp((t - s.tEnd) / 0.4) : 1);
    c.save(); c.globalAlpha = A * inA;
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = 'rgba(8,10,16,.5)'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    const rot = (s.rot || 0) * TAU; for (let i = 0; i < 12; i++) { const a = rot + i * TAU / 12; c.beginPath(); c.arc(x, y, R * 0.8, a, a + 0.32); c.lineWidth = R * 0.08; c.strokeStyle = rgba(COLS[i % 4], 0.85); c.stroke(); }
    if (t >= s.t) { c.beginPath(); c.arc(x, y, Math.max(2, R * (1 - k)), 0, TAU); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke(); }
    const prog = clamp((s.rot || 0) / 3); c.beginPath(); c.arc(x, y, R * 0.5, -Math.PI / 2, -Math.PI / 2 + prog * TAU); c.lineWidth = R * 0.05; c.strokeStyle = s.clear ? '#7dff8a' : '#ffd23d'; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = `900 ${Math.round(R * 0.2)}px Archivo, system-ui`;
    c.fillText(s.clear ? 'CLEAR!' : 'SPIN!', x, y - R * 0.05);
    c.font = `800 ${Math.round(R * 0.08)}px Figtree, system-ui`; c.globalAlpha = A * inA * 0.85;
    c.fillText(s.clear ? `bonus +${Math.max(0, Math.round((s.rot - 3) * 1000 + 1000))}` : matchMedia('(pointer: coarse)').matches ? 'drag circles · optional' : 'hold + circle the mouse · or mash Z X', x, y + R * 0.16);
    c.restore();
  }
  drawCursor(c, r) {
    const cu = this.cur, now = this.T; if (this.st === 'out') return;
    if (cu.touch && !this.down) cu.on = Math.max(0, cu.on - 0.06);
    if (cu.on <= 0 || cu.x < -50) return;
    this.trail.push([cu.x, cu.y, now]); this.trail = this.trail.filter((p) => now - p[2] < 0.14).slice(-14);
    const s = clamp(r * 0.42, 11, 22);
    for (let i = 0; i < this.trail.length - 1; i++) { const p = this.trail[i], k = (i + 1) / this.trail.length; c.globalAlpha = 0.45 * k * cu.on; c.beginPath(); c.arc(p[0], p[1], s * 0.55 * (0.4 + 0.6 * k), 0, TAU); c.fillStyle = '#ffcf6b'; c.fill(); }
    c.globalAlpha = cu.on; const g = c.createRadialGradient(cu.x, cu.y, 0, cu.x, cu.y, s * (this.down || this.keys.size ? 1.25 : 1));
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fff3c4'); g.addColorStop(0.7, 'rgba(255,170,60,.9)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cu.x, cu.y, s * 1.3, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  hud() {
    const { acc } = this.stats(), live = this.st === 'play' || this.st === 'fail' || this.st === 'hold';
    this.el.classList.toggle('kn-live', live || this.st === 'rank');
    this.hpEl.style.transform = `scaleX(${clamp(this.hp).toFixed(3)})`; this.hpEl.parentElement.classList.toggle('low', this.hp < 0.3);
    const sc = String(this.pts || 0).padStart(8, '0'); if (this.scEl.textContent !== sc) this.scEl.textContent = sc;
    const ac = (acc * 100).toFixed(2) + '%'; if (this.accEl.textContent !== ac) this.accEl.textContent = ac;
    const t = live ? this.songT() : 0, p = clamp((t - knockBeat(A0)) / (knockBeat(END_B) - knockBeat(A0))); this.pieEl.style.setProperty('--p', (p * 100).toFixed(1) + '%');
    const cb = this.combo + 'x'; if (this.comboEl.textContent !== cb) { this.comboEl.textContent = cb; this.comboEl.classList.remove('kn-bump'); void this.comboEl.offsetWidth; this.comboEl.classList.add('kn-bump'); }
  }
}
export const KNOCK_INFO = { bpm: KNOCK_BPM, beats: (END_B - A0) };
