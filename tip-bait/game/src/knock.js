// Kyle's door: the secret knock. Kyle won't open ("who is it??") until you play the knock: an osu!-style map ON door
// 2004, synced to the 'knock' track (audio.js). Hit circles (brass knocker plates) and sliders are door-face points
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
const FACE_X = 1.215, PY = 1.28, PH = 0.56, PW = 0.43;
const onDoor = (u, v, o = V()) => o.set(FACE_X, PY + v * PH, Sets.DOOR_Z + u * PW);
const COLS = [[46, 230, 111], [255, 200, 61], [214, 170, 110], [240, 236, 226]]; // combo colours: gobbl green, Kyle amber, brass, paper
const rgba = (c, a, k = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
// checkpoints (song beats): a failed section restarts from its first beat, after one bar of lead-in
const A0 = KNOCK_INTRO * 4, SECS = [['A', A0], ['B', A0 + 12], ['C', A0 + 20], ['D', A0 + 28]];
const END_B = (KNOCK_INTRO + KNOCK_BARS) * 4 + 2; // the ring-out stab, then straight to the ranking (no spinner)
// per difficulty (order 1 / 2 / 3+): approach time, hit windows ±s for 300/100/50, HP drain per s, HP lost per miss
const LV = [{ ar: 1.3, w: [0.095, 0.16, 0.22], drain: 0.0225, miss: 0.145 }, { ar: 1.1, w: [0.083, 0.14, 0.195], drain: 0.034, miss: 0.17 }, { ar: 0.95, w: [0.073, 0.13, 0.18], drain: 0.045, miss: 0.195 }];
// ------------------------------------------------------------------ the beatmap: generated under hard rules
// Every map (every level, every seed) is built bar by bar from rhythm cells and then checked by validateMap(); a map
// that breaks a rule throws under ?qa=1 (and is regenerated with the next seed in play, so a player never sees one).
//  R1 tempo   one BPM (KNOCK_BPM) for the whole song; every object starts on the 8th-note grid of that one tempo.
//             level 0 (order 1): quarter notes only. levels 1–2: quarters plus eighth PAIRS (an on-beat note and the
//             "and" right after it) — never a lone off-beat note, never syncopation. level 1: a pair is followed by ≥ 1
//             beat of air; level 2 may run on-and-on (a 3-note burst), never 4 eighths in a row.
//             sliders start on a beat and last exactly 1 or 2 beats (no reverses).
//  R2 spacing end of one object → start of the next ≥ 1 beat (level 0) / ≥ ½ beat (levels 1–2), ≥ 1 beat after any
//             slider. No two objects at the same time, no stacks.
//  R3 motion  on-door distance between consecutive objects is capped by the time between them (½ beat ≤ 0.27 m,
//             1 beat ≤ 0.42 m, longer ≤ 0.6 m) — big jumps only after ≥ 1 beat; pairs sit close (0.22–0.27 m).
//             Nothing on screen at the same time overlaps (centres ≥ 2 radii apart, slider bodies included).
//  R4 phrases 4-beat phrases (one bar): a new combo on every bar's first object; at least one empty beat in every
//             2 bars (a breath).
//  R5 audio   the song (audio.js knockG) has a hit on every beat and every 8th through the map bars, and the finisher
//             stabs sit on beats 1, 3 and 4 of the last bar — so every object lands on something you can hear.
const RAD = 0.1064, MINSEP = RAD * 2 + 0.01; // circle radius on the door (m) = 0.095 × door height (see draw)
const toM = (u, v) => [u * PW, v * PH]; // door units → metres (u spans 2·PW, v spans 2·PH)
const dM = (a, b) => { const [ax, ay] = toM(a[0], a[1]), [bx, by] = toM(b[0], b[1]); return Math.hypot(ax - bx, ay - by); };
const MAXD = (gap) => (gap <= 0.5 ? 0.27 : gap <= 1 ? 0.42 : 0.6);
const MIND = (gap) => (gap <= 0.5 ? 0.22 : 0.24);
// rhythm cells, one bar each: c = circle, s = slider (beat:length), f = finisher; a = easy cells (section A)
const CELLS = [
  { a: ['c0 c1 c2', 'c0 c2 c3', 's0:1 c2 c3', 'c0 s2:1'], x: ['c0 c1 c2 c3', 's0:2 c3', 'c0 c1 s2:1', 'c0 c2'] },
  { a: ['c0 c1 c2', 'c0 c2 c3', 's0:1 c2 c3', 'c0 c0.5 c2 c3'], x: ['c0 c0.5 c2 c3', 'c0 c1 c1.5 c3', 'c0 c1 c2 c2.5', 's0:1 c2 c2.5', 'c0 c1 c2 c3', 'c0 s2:1'] },
  { a: ['c0 c0.5 c2 c3', 'c0 c1 c2 c2.5', 's0:1 c2 c3'], x: ['c0 c0.5 c1 c2 c3', 'c0 c1 c1.5 c2', 's0:1 c2 c2.5 c3', 'c0 c0.5 c2 c2.5', 'c0 c1 c2 c2.5', 'c0 c0.5 c1 s2:1'] },
];
const FIN = 'f0 f2 f3'; // the stop-time finisher bar (audio.js plays the stabs on these beats)
const BARS = [['A', 3], ['B', 2], ['C', 2], ['D', 1]];
export function validateMap(objs, lvl) {
  const n = objs.filter((o) => o.kind !== 'spin'), bad = []; let minGap = 9, maxSpeed = 0, offGrid = 0, overlaps = 0;
  const minG = lvl === 0 ? 1 : 0.5;
  for (let i = 0; i < n.length; i++) {
    const o = n[i], p = n[i - 1], q = n[i + 1];
    if (Math.abs(o.b * 2 - Math.round(o.b * 2)) > 1e-9) { offGrid++; bad.push(`off-grid ${o.b}`); }
    const off = Math.abs(o.b % 1 - 0.5) < 1e-9;
    if (off) {
      if (lvl === 0) bad.push(`eighth on level 0 @${o.b}`);
      if (!p || Math.abs(o.b - 0.5 - p.b) > 1e-9 || p.b % 1 !== 0 || p.kind !== 'circle') bad.push(`lone off-beat @${o.b}`);
      if (lvl === 1 && q && q.b - o.b < 1.5 - 1e-9) bad.push(`level-1 pair not followed by air @${o.b}`);
      if (p && n[i - 2] && n[i - 3] && o.b - n[i - 3].b <= 1.5 + 1e-9) bad.push(`4 eighths in a row @${o.b}`);
    }
    if (o.kind === 'slider' && (o.b % 1 !== 0 || !(o.len === 1 || o.len === 2) || o.rep)) bad.push(`bad slider @${o.b}`);
    if (p) {
      const pe = p.b + p.len, gap = o.b - pe, need = p.kind === 'slider' ? 1 : minG;
      minGap = Math.min(minGap, gap); if (gap < need - 1e-9) bad.push(`gap ${gap} < ${need} @${o.b}`);
      const pp = p.kind === 'slider' ? p.path[2] : [p.u, p.v], d = dM(pp, [o.u, o.v]);
      maxSpeed = Math.max(maxSpeed, d / Math.max(gap, 0.5)); if (d > MAXD(gap) + 1e-6) bad.push(`jump ${d.toFixed(2)}m over ${gap} beats @${o.b}`);
    }
    for (let j = i - 1; j >= 0 && o.b - n[j].b <= 3.5; j--) { // everything that can be on screen together
      const a = n[j], pts = a.kind === 'slider' ? [0, 0.25, 0.5, 0.75, 1].map((k) => bez(a.path, k)) : [[a.u, a.v]];
      const mine = o.kind === 'slider' ? [0, 0.25, 0.5, 0.75, 1].map((k) => bez(o.path, k)) : [[o.u, o.v]];
      let m = 9; for (const x of pts) for (const y of mine) m = Math.min(m, dM(x, y));
      if (m < MINSEP - 1e-6) { overlaps++; bad.push(`overlap ${m.toFixed(2)}m @${a.b}/${o.b}`); }
    }
    if (o.b >= A0 && o.nc !== (i === 0 || Math.floor(o.b / 4) !== Math.floor(p.b / 4))) bad.push(`combo not on the bar @${o.b}`);
  }
  for (let b0 = A0; b0 < A0 + 32; b0 += 8) { // a breath in every 2 bars
    let rest = false;
    for (let b = b0; b < b0 + 8 && !rest; b++) rest = !n.some((o) => (o.b >= b && o.b < b + 1) || (o.b < b && o.b + o.len > b));
    if (!rest) bad.push(`no rest beat in bars at ${b0}`);
  }
  return { ok: !bad.length, bad, minGap, maxSpeed: +maxSpeed.toFixed(3), offGrid, overlaps, notes: n.length };
}
function rhythm(lvl, tut, r) {
  const objs = [], add = (b0, tok, nc) => { const m = /^([csf])([\d.]+)(?::([\d.]+))?$/.exec(tok); objs.push({ kind: m[1] === 's' ? 'slider' : 'circle', fin: m[1] === 'f', b: b0 + +m[2], len: m[3] ? +m[3] : 0, rep: 0, nc }); };
  if (tut) [3, 5, 7].forEach((b, i) => add(b, 'c0', i === 0));
  let bar = KNOCK_INTRO, prevCell = '';
  const cellsFor = (sec) => (sec === 'A' ? CELLS[lvl].a : [...CELLS[lvl].a, ...CELLS[lvl].x, ...CELLS[lvl].x]);
  for (const [sec, nb] of BARS) for (let k = 0; k < nb; k++, bar++) {
    if (sec === 'D') { FIN.split(' ').forEach((t, i) => add(bar * 4, t, i === 0)); continue; }
    const pool = cellsFor(sec);
    let cell; for (let tries = 0; tries < 12; tries++) { cell = pool[Math.floor(r() * pool.length)]; if (cell !== prevCell) break; }
    // a breath every 2 bars: if this is the 2nd bar of a pair and the 1st had no empty beat, take a cell that has one
    const pairStart = (bar - KNOCK_INTRO) % 2 === 1, has = (c) => [0, 1, 2, 3].some((b) => !c.split(' ').some((t) => { const m = /^[csf]([\d.]+)(?::([\d.]+))?/.exec(t), s0 = +m[1], ln = +(m[2] || 0); return (s0 >= b && s0 < b + 1) || (s0 < b && s0 + ln > b); }));
    if (pairStart && !has(prevCell) && !has(cell)) cell = pool.find(has) || cell;
    cell.split(' ').forEach((t, i) => add(bar * 4, t, i === 0)); prevCell = cell;
  }
  return objs;
}
function place(objs, tut, r) {
  let x = -0.35, y = 0.3, ang = -0.4, prev = null, n = 0, ci = -1;
  const placed = [];
  const clear = (pts, b) => { let m = 9; for (const a of placed) { if (b - a.b > 3.5) continue; const ap = a.kind === 'slider' ? [0, 0.25, 0.5, 0.75, 1].map((k) => bez(a.path, k)) : [[a.u, a.v]]; for (const p of ap) for (const q of pts) m = Math.min(m, dM(p, q)); } return m; };
  const inF = (u, v) => Math.abs(u) <= 0.86 && Math.abs(v) <= 0.86;
  for (const o of objs) {
    o.t = knockBeat(o.b); o.tEnd = knockBeat(o.b + o.len);
    if (o.nc || ci < 0) { ci++; n = 0; } o.n = ++n; o.col = COLS[ci % COLS.length];
    if (tut && o.b < A0) { [o.u, o.v] = [[-0.5, 0.1], [0, -0.25], [0.5, 0.1]][o.n - 1]; x = o.u; y = o.v; placed.push(o); prev = o; continue; }
    if (prev) {
      const gap = o.b - (prev.b + prev.len), lo = MIND(gap), hi = MAXD(gap);
      let best = null;
      for (let k = 0; k < 40; k++) { // spacing ∝ time; turn more at a new phrase; keep clear of anything still on screen
        const a = ang + (o.nc ? 1.4 : 0.5) * (r() - 0.5) * 2 + (k > 12 ? (k - 12) * 0.45 : 0), d = lo + (hi - lo) * (0.25 + r() * 0.6);
        const nx = x + Math.cos(a) * d / PW, ny = y + Math.sin(a) * d / PH;
        if (!inF(nx, ny)) continue;
        const c = clear([[nx, ny]], o.b);
        if (!best || c > best.c) best = { nx, ny, a, c };
        if (c >= MINSEP) break;
      }
      if (best) { x = best.nx; y = best.ny; ang = best.a; }
    }
    o.u = x; o.v = y;
    if (o.kind === 'slider') {
      const L = o.len === 1 ? 0.26 + r() * 0.06 : 0.36 + r() * 0.08; let bestS = null;
      for (let k = 0; k < 36; k++) {
        const sa = ang + (r() - 0.5) * 1.6 + k * 0.5, ex = x + Math.cos(sa) * L / PW, ey = y + Math.sin(sa) * L / PH;
        if (!inF(ex, ey)) continue;
        const bend = (r() - 0.5) * 0.5 * L, mx = (x + ex) / 2 - Math.sin(sa) * bend / PW, my = (y + ey) / 2 + Math.cos(sa) * bend / PH;
        const path = [[x, y], [mx, my], [ex, ey]], c = clear([0.25, 0.5, 0.75, 1].map((q) => bez(path, q)), o.b);
        if (!bestS || c > bestS.c) bestS = { path, sa, c };
        if (c >= MINSEP) break;
      }
      o.path = bestS.path; x = o.path[2][0]; y = o.path[2][1]; ang = bestS.sa;
    }
    placed.push(o); prev = o;
  }
}
export function buildMap(lvl, tut, seed = 1) {
  let last;
  for (let k = 0; k < 24; k++) { // a seed whose layout can't satisfy the rules just rolls the next one (deterministic)
    const r = mulberry((seed + k * 0x9e3779b9) >>> 0), objs = rhythm(lvl, tut, r); place(objs, tut, r);
    const v = validateMap(objs, lvl); last = { objs, v };
    if (v.ok) break;
  }
  if (!last.v.ok && QA) throw new Error('knock map breaks its rules: ' + last.v.bad.slice(0, 4).join('; '));
  last.objs.rules = last.v;
  last.objs.push({ kind: 'spin', b: 1e6, len: 0, t: 1e9, tEnd: 1e9, u: 0, v: 0, n: 0, col: COLS[0] }); // spinner retired (kept as a never-due stub)
  return last.objs;
}
const bez = (p, s) => { const [a, b, c] = p, k = 1 - s; return [k * k * a[0] + 2 * k * s * b[0] + s * s * c[0], k * k * a[1] + 2 * k * s * b[1] + s * s * c[1]]; };
const sliderAt = (o, t) => { const span = (o.tEnd - o.t) / (o.rep + 1); let s = clamp((t - o.t) / span, 0, o.rep + 1); const leg = Math.min(o.rep, Math.floor(s)); s -= leg; if (leg % 2) s = 1 - s; return bez(o.path, clamp(s)); };

export class Knock {
  constructor(F) {
    this.F = F; const G = F.G;
    this.daily = !!G.daily; // the daily: same map for everyone (order-2 level, no tutorial, seeded from the day)
    this.lvl = this.daily ? 1 : G.order <= 1 ? 0 : G.order === 2 ? 1 : 2; this.L = LV[this.lvl];
    let seen = false; try { seen = localStorage.getItem('tipbait:knockSeen') === '1'; } catch {}
    this.tut = !seen && !this.daily;
    this.objs = buildMap(this.lvl, this.tut, this.daily ? (G.seed ^ 0x6b6e6f63) >>> 0 : 7 + G.order * 31);
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
    this.el.classList.add('kn-on'); document.getElementById('dms')?.remove();
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
    if (this.st === 'rank') { if (this.rt > 0.6) this.leave(); return; }
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
    this.shout(['nah. that’s not the knock', 'that is NOT the knock bro', 'omg. FINE. i’m coming'][Math.min(2, this.fails - 1)], true);
  }
  restart(penalised = true) {
    const due = this.notes.find((o) => !o.done) || this.notes[this.notes.length - 1];
    let sb = SECS[0][1]; for (const [, b] of SECS) if (due.b >= b) sb = b;
    if (this.tut && due.b < A0) sb = 0;
    for (const o of this.notes) if (o.b >= sb) { o.hit = o.res = o.end = o.err = o.shake = null; o.done = false; o.trk = 0; o.reps = 0; }
    this.fx.length = 0; this.combo = 0; this.hp = 1; this.st = 'play'; this.fresh = this.T;
    const s = this.spin; s.rot = 0; s.ticks = 0; s.clear = false;
    this.pts = this.secPts[sb] ?? 0; for (const k in this.secPts) if (+k > sb) delete this.secPts[k];
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
    if (!this.daily) try { localStorage.setItem('tipbait:knockSeen', '1'); } catch {}
    F.Audio.muffle(20000, 0.25);
    const col = { SS: '#ffc83d', S: '#ffc83d', A: '#2ee66f', B: '#9fe6ff', C: '#c9a46a', D: '#ff3b30' }[rank];
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
      if (t > 0.3 && !this.k1) { this.k1 = true; A.sfx('knock', 0.9); }
      if (t > 0.5 && !this.k2) { this.k2 = true; A.sfx('knock', 0.9, 1.05); }
      if (t > 0.75 && !this.sh) { this.sh = true; this.shout('who is it??'); A.sfx('bwomp', 0.25, 1.6); }
      if (t > 0.95 && !this.cd) { this.cd = true; this.$('.kn-card').classList.add('in'); A.sfx('rise', 0.5); }
      if (t > 2.4 && (QA || !A.unlocked || A.ready('knock') || t > 6)) { this.$('.kn-card').classList.remove('in'); this.st = 'play'; this.fresh = this.T; this.startSong(this.tut ? 0 : Math.max(0, knockBeat(4) - 0.05)); }
    } else if (this.st === 'play') {
      this.clk += dt; this.tick(this.songT(), dt);
    } else if (this.st === 'fail') {
      this.ft += dt;
      if (this.ft > 1.4) { if (this.forced) this.finish(); else this.restart(); }
    } else if (this.st === 'rank') {
      this.rt += dt; if (this.rt > (QA ? 2.6 : 4)) this.leave();
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
    const u = this.st === 'intro' && this.c0.distanceTo(p) < 9 ? easeInOut(clamp(this.t / 0.8)) : 1; // glide in from the hall shot (cut if it came from elsewhere)
    if (u < 1) { const q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p, l, cam.up)); cam.position.copy(this.c0).lerp(p, u); cam.quaternion.copy(this.q0).slerp(q1, u); cam.fov = lerp(this.f0, fov, u); }
    else { cam.position.copy(p); cam.lookAt(l); cam.fov = fov; }
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  pose(dt) { // the courier waits just off the knock camera's left (the door stays a clean playfield), then steps up as it opens
    const F = this.F, R = F.G.R, A = V(-0.6, 0, Sets.DOOR_Z - 0.8), B = V(0.15, 0, Sets.DOOR_Z - 0.15);
    if (this.st === 'out') {
      const u = smooth(clamp(this.ot / 0.85)); R.root.position.copy(A).lerp(B, u); R.root.rotation.set(0, Math.PI / 2, 0);
      R.walk(u < 0.97 ? 'walk' : 'idle', this.ot * 1.3, { offset: V(0, 0, 0), yaw: 0 });
    } else {
      const u = this.st === 'intro' ? smooth(clamp(this.t / 0.7)) : 1;
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
      if (this.sa != null) { let d = a - this.sa; d -= Math.round(d / TAU) * TAU; if (Math.abs(d) < 2.0) this.spinAdd(Math.abs(d) / TAU); }
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
      c.save(); c.globalAlpha = 0.45 * gone * fade; c.lineWidth = 2;
      for (let i = 0; i < this.notes.length - 1; i++) { const a = this.notes[i], b = this.notes[i + 1]; if (b.nc || b.done || t < b.t - ar || t > b.t) continue; const ae = a.kind === 'slider' ? this.scr(...a.path[a.rep ? 0 : 2]) : [a.sx, a.sy], d = Math.hypot(b.sx - ae[0], b.sy - ae[1]); if (d < r * 2.6) continue; const n = Math.floor((d - 2 * r) / 28); for (let k = 1; k <= n; k++) { const f = (r + k * ((d - 2 * r) / (n + 1))) / d, x = lerp(ae[0], b.sx, f), y = lerp(ae[1], b.sy, f); c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fillStyle = '#f3e3c3'; c.fill(); } }
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
        const [txt, col] = f.v === 300 ? ['300', '#2ee66f'] : f.v === 100 ? ['100', '#ffc83d'] : f.v === 50 ? ['50', '#d6aa6e'] : ['✗', '#ff3b30'];
        c.globalAlpha = (1 - easeOut(seg(k, 0.55, 1))) * fade; c.font = `900 ${Math.round(r * (f.v ? 0.62 : 1.0) * pop)}px Archivo, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const yy = y - (f.v ? r * 1.05 : -a * r * 0.8); c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = r * 0.25; c.shadowOffsetY = 2; c.fillStyle = col; c.fillText(txt, x, yy); c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
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
      stroke(r * 2, rgba(o.col, 0.95, 0.9)); stroke(r * 1.8, 'rgba(24,16,10,.88)'); stroke(r * 1.2, rgba(o.col, 0.16)); stroke(r * 0.3, rgba(o.col, 0.4));
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
    if (t < o.t) { const k = clamp((o.t - t) / ar); c.save(); c.globalAlpha = A * appear; c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = rgba(o.col, 0.95, 1.1); c.beginPath(); c.arc(x, y, r * (1 + 2.6 * k), 0, TAU); c.stroke(); c.restore(); }
    if (this.tut && o.b < A0 && o.n === 1 && t < o.t + 0.1) { c.save(); c.globalAlpha = A * appear; c.font = `800 ${Math.round(clamp(r * 0.42, 13, 20))}px Figtree, system-ui`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4; const tx = matchMedia('(pointer: coarse)').matches ? 'tap when the ring closes' : 'click / Z when the ring closes'; c.strokeText(tx, x, y + r * 1.75); c.fillText(tx, x, y + r * 1.75); c.restore(); }
  }
  disc(x, y, r, col, a, num, fin = false) { // a knocker plate on the door: metal ring in the combo colour, dark wood-glass face, number
    const c = this.cx;
    c.beginPath(); c.arc(x, y + r * 0.08, r * 1.02, 0, TAU); c.fillStyle = 'rgba(0,0,0,.38)'; c.fill();
    c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fillStyle = 'rgba(22,15,10,.86)'; c.fill();
    const g = c.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, rgba(col, 1, 1.25)); g.addColorStop(0.45, rgba(col, 1, 1)); g.addColorStop(1, rgba(col, 1, 0.55));
    c.lineWidth = r * 0.2; c.strokeStyle = g; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.stroke();
    c.lineWidth = Math.max(1, r * 0.035); c.strokeStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x, y, r * 0.99, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); // a glint
    if (fin) { c.lineWidth = r * 0.05; c.strokeStyle = rgba(col, 0.8); c.beginPath(); c.arc(x, y, r * 0.62, 0, TAU); c.stroke(); }
    if (num) { c.font = `900 ${Math.round(r * 0.78)}px Archivo, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = rgba(col, 1, 1.1); c.fillText(num, x, y + r * 0.04); }
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
    for (let i = 0; i < this.trail.length - 1; i++) { const p = this.trail[i], k = (i + 1) / this.trail.length; c.globalAlpha = 0.45 * k * cu.on; c.beginPath(); c.arc(p[0], p[1], s * 0.55 * (0.4 + 0.6 * k), 0, TAU); c.fillStyle = '#7ff0a8'; c.fill(); }
    c.globalAlpha = cu.on; const g = c.createRadialGradient(cu.x, cu.y, 0, cu.x, cu.y, s * (this.down || this.keys.size ? 1.25 : 1));
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#d8ffe6'); g.addColorStop(0.7, 'rgba(46,230,111,.85)'); g.addColorStop(1, 'rgba(46,230,111,0)');
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
