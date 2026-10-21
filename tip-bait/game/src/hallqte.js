// Floor-20 hallway encounters besides the pitbull (each run picks one of the three):
//  • LADDER: a maintenance guy in big headphones carries a 3.6 m ladder on his shoulder, hunting for a door number.
//    Every time he turns, the ladder comes for you: swings at your LEFT (→) or RIGHT (←), at your HEAD (↓ duck) or
//    your SHINS (↑ hop). His head turn + pointing hand is the tell; three swings, each faster.
//  • MOP: the janitor just mopped the whole corridor. You hit the wet floor and slide all the way to 2004 on a balance
//    meter: tap ← → to keep the needle centred (it drifts away from the middle), and when your foot SLIPS the needle
//    kicks hard one way — counter with the opposite key before you go over. Wrong key or too slow: SPLAT.
// Both end like the dog: grade into G.fin.hall / hallT / hallKind, then the finale walks you to Kyle's door.
import { THREE, V, clamp, lerp, seg, smooth, easeOut, easeInOut, damp, mat, box, cyl, canvasTex, tex } from './core.js';
import * as Sets from './sets.js';
import { character, ik2 } from './chars.js';

const HC = { c0: 3.0, c: -1.5, cx: 0.25 }, DOOR_Z = -9;
// reaction windows, tight; a touch more lenient on your very first delivery
export const hallWindows = (G) => (G.delivered === 0 ? [0.6, 0.48, 0.4] : [0.52, 0.42, 0.34]);
const DODGE_X = { arrowleft: -0.52, arrowright: 0.52 };
const KEYMAP = { a: 'arrowleft', d: 'arrowright', w: 'arrowup', ' ': 'arrowup', s: 'arrowdown' };
const GRADES = {
  ladder: [['LADDER’D', 0], ['BONKED', 100], ['GRAZED', 250], ['UNTOUCHABLE', 700]],
  mop: [['MOPPED UP', 0], ['SOGGY', 100], ['WOBBLY', 250], ['SURFED IT', 700]],
};

let pPrefetch = null;
export function prefetchHallFolks() {
  return (pPrefetch ||= Promise.all([
    character('m/tourist_m.glb', { tint: { casualsuit04: 0xf0d43a } }).then(async (C) => { await C.load('walk', 'idle', 'point', 'shrug', 'reaction'); return C; }),
    character('m/tourist_m.glb', { tint: { casualsuit04: 0x4a5866 } }).then(async (C) => { await C.load('idle', 'walk', 'reaction', 'point', 'shrug'); return C; }),
  ]));
}

// ---------------------------------------------------------------- shared bits
function bangSprite(txt, bg) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
  x.font = '76px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(txt, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.renderOrder = 9; s.visible = false; return s;
}
function ladderMesh() {
  const g = new THREE.Group(), al = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.75, roughness: 0.32 });
  const L = 3.6;
  for (const x of [-0.2, 0.2]) { const r = box(0.035, 0.075, L, al, x, 0, 0, g); r.castShadow = true; }
  for (let k = 0; k < 12; k++) { const r = cyl(0.016, 0.016, 0.4, al, 8, 0, 0, -L / 2 + 0.15 + k * 0.3, g); r.rotation.z = Math.PI / 2; }
  for (const z of [-L / 2, L / 2]) for (const x of [-0.2, 0.2]) box(0.05, 0.09, 0.07, mat(0x1a1a1a, { roughness: 0.8 }), x, 0, z, g); // rubber end caps
  // hazard tape on the front end so you can read where it's pointing
  const tape = canvasTex('ladtape', 128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#111' : '#ffd21a'; c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 8, h); c.lineTo(i * 16 - 8, h); c.fill(); } });
  for (const x of [-0.2, 0.2]) box(0.04, 0.08, 0.35, new THREE.MeshLambertMaterial({ map: tape }), x, 0, L / 2 - 0.25, g);
  return g;
}
function headphones() {
  const g = new THREE.Group(), blk = mat(0x15161a, { roughness: 0.4 }), or = mat(0xff5a1f, { roughness: 0.35 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.013, 8, 24, Math.PI), blk); band.rotation.z = 0; g.add(band);
  for (const s of [-1, 1]) { const cup = cyl(0.05, 0.05, 0.04, or, 18, s * 0.105, -0.01, 0, g); cup.rotation.z = Math.PI / 2; }
  return g;
}
function wetSign() {
  const t = canvasTex('wetsign', 256, 320, (c, w, h) => { c.fillStyle = '#ffd21a'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.beginPath(); c.moveTo(w / 2, 26); c.lineTo(w - 50, 150); c.lineTo(50, 150); c.closePath(); c.fill(); c.fillStyle = '#ffd21a'; c.font = '900 84px system-ui'; c.textAlign = 'center'; c.fillText('!', w / 2, 136); c.fillStyle = '#111'; c.font = '900 40px system-ui'; c.fillText('CAUTION', w / 2, 205); c.font = '800 30px system-ui'; c.fillText('WET FLOOR', w / 2, 245); c.font = '700 22px system-ui'; c.fillText('PISO MOJADO', w / 2, 282); });
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.62), m); p.position.set(0, 0.31, s * 0.09); p.rotation.x = -s * 0.28; p.castShadow = true; g.add(p); }
  return g;
}
function mopBucket() {
  const g = new THREE.Group(), y = mat(0xffc20e, { roughness: 0.5 }), gr = mat(0x3a3d42, { roughness: 0.6 });
  box(0.42, 0.34, 0.52, y, 0, 0.24, 0, g); box(0.38, 0.02, 0.48, mat(0x6d7f7a, { roughness: 0.05, metalness: 0.2 }), 0, 0.4, 0, g);
  box(0.42, 0.3, 0.14, gr, 0, 0.52, -0.2, g); for (const [x, z] of [[-0.18, -0.22], [0.18, -0.22], [-0.18, 0.22], [0.18, 0.22]]) { const w = cyl(0.04, 0.04, 0.03, gr, 10, x, 0.04, z, g); w.rotation.z = Math.PI / 2; }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function mop() {
  const g = new THREE.Group();
  cyl(0.014, 0.014, 1.35, mat(0x2a6fd6, { roughness: 0.4 }), 8, 0, 0.68, 0, g);
  const head = new THREE.Group(); g.add(head);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, s = cyl(0.012, 0.016, 0.22, mat(0xe8e2d2, { roughness: 1 }), 5, Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05, head); s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
  return g;
}
// a big balance meter hung under the banner
function balanceBar(ui) {
  const host = ui.el.querySelector('.dogui');
  const el = document.createElement('div'); el.className = 'balbar';
  el.innerHTML = '<em class="bz"></em><i class="bn"></i><b class="bl">⟵ tipping</b><b class="br">tipping ⟶</b>';
  host.appendChild(el);
  const n = el.querySelector('.bn');
  return { set(b, slip) { n.style.left = `${(50 + clamp(b, -1, 1) * 50).toFixed(1)}%`; el.classList.toggle('slip', !!slip); el.classList.toggle('warn', Math.abs(b) > 0.62); } };
}

// courier helpers (same rig as the dog scene)
function poseCourier(F, { x, z, yaw = Math.PI, walk = 0, jog = false, dodge = null, duck = 0, hop = 0, hit = 0, roll = 0, arms = 0, fall = 0, t }) {
  const R = F.G.R;
  R.root.position.set(x, hop, z); R.root.rotation.set(0, yaw, 0);
  if (walk > 0.05) R.walk(jog ? 'jog' : 'walk', t * (jog ? 1.05 : 1), { offset: V(0, 0, 0), yaw: 0 });
  else if (fall > 0) { const u = fall; R.walk(u < 0.62 ? 'idle' : 'defeated', u < 0.62 ? 1 : (u - 0.62) * 2.5, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.62 }); }
  else if (hit > 0) { R.C.root.position.set(0, 0, 0); R.C.root.rotation.set(0, 0, 0); R.C.pose([['idle', t, 1], ['reaction', 0.25 + (1 - hit) * 1.2, 0.5 * hit, false]]); }
  else R.walk('idle', t, { offset: V(0, 0, 0), yaw: 0 });
  if (roll) R.root.rotateZ(roll);
  if (fall > 0) { const k = smooth(seg(fall, 0, 0.2)) * (1 - smooth(seg(fall, 0.62, 0.95))); R.root.rotateX(-1.25 * k); R.root.position.y += 0.18 * k; }
  if (hit > 0) R.root.rotateX(-0.14 * hit);
  R.C.root.updateMatrixWorld(true);
  if (duck > 0.01) { // drop the hips, knees out front, chest folded forward
    R.C.root.position.y = -0.42 * duck; R.C.root.updateMatrixWorld(true);
    for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) ik2(R.C.bone(side + 'UpLeg'), R.C.bone(side + 'Leg'), R.C.bone(side + 'Foot'), R.root.localToWorld(V(s * 0.13, 0.09, 0.06)), R.root.localToWorld(V(s * 0.2, 0.5, 1.4)));
    const sp = R.C.bone('Spine'); sp.rotateX(0.55 * duck); sp.updateMatrixWorld(true);
  }
  if (hop > 0.02) for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) ik2(R.C.bone(side + 'UpLeg'), R.C.bone(side + 'Leg'), R.C.bone(side + 'Foot'), R.root.localToWorld(V(s * 0.12, 0.2 + hop * 0.2, 0.12)), R.root.localToWorld(V(s * 0.12, 0.6, 1.2)));
  if (arms > 0.01) for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) ik2(R.C.bone(side + 'Arm'), R.C.bone(side + 'ForeArm'), R.C.bone(side + 'Hand'), R.root.localToWorld(V(s * 0.72, 1.3 + Math.sin(t * 11 + s) * 0.18 * arms, 0.12)), R.root.localToWorld(V(s * 0.6, 0.9, -0.6)));
  R.C.root.updateMatrixWorld(true);
  F.palmCup(F.cup, R.C);
}
function camera(F, cp, cl, fov, key, rdt, shake) {
  const cam = F.camera;
  if (key !== F.camK) { F.camK = key; cam.position.copy(cp); }
  cam.position.lerp(cp, 1 - Math.exp(-8 * rdt));
  const sh = shake * shake * 0.05; cam.position.add(V(Math.sin(F.t * 71) * sh, Math.sin(F.t * 53) * sh, 0));
  cam.lookAt(cl); cam.fov = fov; cam.updateProjectionMatrix();
}
function caption(F, who, text, ttl = 1700, color = '#ffd27a') { F.UI.sceneCap(`<span style="color:${color}">${who}:</span> “${text}”`); clearTimeout(F.capT); F.capT = setTimeout(() => F.phase === 'hall' && F.UI.remove('scene'), ttl); }
function finish(F, kind, res, pen) {
  const G = F.G, UI = F.UI, n = res.filter((r) => r === true).length, [g, pts] = GRADES[kind][n];
  G.score += pts; G.fin = { ...(G.fin || {}), hall: g, hallT: pen, hallKind: kind, hallPerfect: n === 3 && pen === 0 };
  return { g, pts, n };
}

// ================================================================ LADDER
async function buildLadder(F, scene) {
  const [guy] = await prefetchHallFolks();
  scene.add(guy.root); guy.root.visible = true;
  if (!guy.hp) { guy.hp = headphones(); guy.attach('Head', guy.hp, [0, 0.07, -0.01], [0, 0, 0], 1.05); }
  const lad = ladderMesh(); scene.add(lad);
  const bang = bangSprite('❗', '#ff2a1a'), note = bangSprite('🎵', '#2b2f36'), stars = bangSprite('💫', '#3a2a6a'); scene.add(bang, note, stars);
  const zone = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false })); zone.rotation.x = -Math.PI / 2; zone.renderOrder = 3; scene.add(zone);
  const KINDS = ['swingL', 'swingR', 'high', 'low'], beats = [...KINDS].sort(() => Math.random() - 0.5).slice(0, 3);
  const KEY = { swingL: 'arrowright', swingR: 'arrowleft', high: 'arrowdown', low: 'arrowup' };
  const LBL = { swingL: 'ladder at your <b>LEFT</b> — dodge right', swingR: 'ladder at your <b>RIGHT</b> — dodge left', high: 'coming at your <b>HEAD</b> — duck', low: 'sweeping your <b>SHINS</b> — hop' };
  const DOORS = { swingL: '2003?', swingR: '2004…?', high: 'where’s 2007', low: 'yo is this 2005' };
  const G0 = { gx: -0.18, zg0: -8.2, zg: HC.c - 1.62 };
  const h = { st: 'intro', t: 0, i: 0, res: [], pen: 0, slow: 1, shake: 0, cz: HC.c0, cx: HC.cx, gz: G0.zg0, dodge: null, tip: V(), tipV: V(), hitK: 0, look: 0 };
  let ui = null, q = null;
  const shoulder = () => guy.boneWorld('RightArm').add(V(0, 0.1, 0));
  const rest = () => V(G0.gx - 0.05 + Math.sin(F.t * 2.1) * 0.1, 2.25 + Math.sin(F.t * 4.2) * 0.04, h.gz + 2.0);
  const target = (k) => ({ swingL: V(h.cx - 0.34, 1.18, HC.c + 0.05), swingR: V(h.cx + 0.34, 1.18, HC.c + 0.05), high: V(h.cx, 1.6, HC.c + 0.05), low: V(h.cx, 0.3, HC.c + 0.05) })[k];
  const E = {
    kind: 'ladder', _h: h, _lad: lad, _guy: guy,
    state: () => ({ kind: 'ladder', st: h.st, t: h.t, key: h.atk?.key, done: !!h.dodge }),
    skippable: () => h.st === 'outro' || h.st === 'pass',
    start() { F.UI.remove('evui'); F.Audio.music('tense'); F.Audio.sfx('creak', 0.6, 1.3); h.tip.copy(rest()); },
    key(k, e) {
      k = KEYMAP[k] || k; if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) return;
      e?.preventDefault();
      if ((h.st !== 'tele' && h.st !== 'swing') || h.dodge) return;
      h.dodge = { k, t: 0, ok: k === h.atk.key }; F.Audio.sfx('whoosh', 0.6, k === 'arrowup' ? 1.3 : k === 'arrowdown' ? 1.0 : 1.6);
    },
    hide() { guy.root.visible = false; lad.visible = false; bang.visible = note.visible = stars.visible = false; zone.visible = false; },
    dispose() { guy.root.removeFromParent(); lad.removeFromParent(); },
    finish() { if (h.done) return; h.done = true; while (h.res.length < 3) h.res.push(false); const r = finish(F, 'ladder', h.res, h.pen); ui?.done(r.g); F.UI.remove('evui'); },
    update(rdt) {
      const G = F.G, UI = F.UI, A = F.Audio;
      h.slow = damp(h.slow, 1, 2.2, rdt); const dt = rdt * h.slow;
      F.t += dt; h.t += dt; h.shake = Math.max(0, h.shake - rdt * 2.5); h.hitK = Math.max(0, h.hitK - dt * 1.4);
      let walkC = 0, walkG = 0, camK = 'game', tipGoal = rest(), lean = 0, point = 0;
      if (h.st === 'intro') {
        const t = h.t; walkC = 1 - smooth(seg(t, 1.5, 2.0)); walkG = 1 - smooth(seg(t, 1.7, 2.1));
        h.cz = lerp(HC.c0, HC.c, easeOut(seg(t, 0, 2.0))); h.gz = lerp(G0.zg0, G0.zg, easeOut(seg(t, 0, 2.1)));
        note.visible = true;
        if (t > 1.0 && !h.l0) { h.l0 = true; UI.thought('…does he not see me'); }
        if (t > 2.2 && !h.l1) { h.l1 = true; caption(F, 'maintenance guy', '🎵 mmm-hmm-hmm (can’t hear a thing)', 2000); A.sfx('creak', 0.5, 1.8); }
        camK = t < 2.0 ? 'follow' : t < 3.5 ? 'guycu' : 'game';
        if (t > 3.5) {
          h.st = 'wait'; h.t = 0; h.wait = 0.9 + Math.random() * 0.4;
          ui = UI.evUI({ title: '🪜 LADDER GUY', pips: 3, hint: 'his head turn tells you where it’s going · <b>←/→</b> sidestep · <b>↓</b> duck · <b>↑</b> hop', keys: ['arrowleft', 'arrowdown', 'arrowup', 'arrowright'] });
          ui.el.querySelector('.dogui').classList.remove('run'); ui.bind((k) => E.key(k));
        }
      } else if (h.st === 'wait') {
        // shuffling on the spot, reading door numbers, humming
        note.visible = true; walkG = 0.25;
        if (h.t > h.wait) {
          const kind = beats[h.i]; h.atk = { kind, key: KEY[kind], tele: hallWindows(G)[h.i], from: h.tip.clone() };
          h.st = 'tele'; h.t = 0; h.dodge = null; note.visible = false;
          q = UI.qte({ key: h.atk.key, label: LBL[kind] }); A.sfx('creak', 0.8, 0.9); A.sfx('pop', 0.7, 0.6);
          caption(F, 'maintenance guy', DOORS[kind], 1100);
        }
      } else if (h.st === 'tele') {
        // the tell: he snaps his head to the side he's turning to and points at a door; the ladder starts to drift that way
        const a = h.atk, k = smooth(clamp(h.t / (a.tele * 0.6))), tg = target(a.kind);
        tipGoal = rest().lerp(tg, 0.22 * k); if (a.kind === 'high') tipGoal.y += 0.5 * k; if (a.kind === 'low') tipGoal.y -= 0.6 * k;
        h.look = a.kind === 'swingL' ? -1 : a.kind === 'swingR' ? 1 : 0; point = k;
        q.set(1 - h.t / (a.tele + 0.17));
        if (h.t >= a.tele) { h.st = 'swing'; h.t = 0; h.atk.from = h.tip.clone(); A.sfx('whoosh', 1, 0.7); }
      } else if (h.st === 'swing') {
        const a = h.atk, u = clamp(h.t / 0.17), tg = target(a.kind);
        tipGoal = a.from.clone().lerp(tg, 1 - (1 - u) * (1 - u)); h.tip.copy(tipGoal); point = 1;
        q.set(1 - (a.tele + h.t) / (a.tele + 0.17));
        if (h.t >= 0.17) {
          h.st = 'res'; h.t = 0; const ok = h.dodge?.ok; h.res.push(!!ok); ui.set(h.res);
          if (ok) { const pts = 150 * (h.i + 1); G.score += pts; h.slow = 0.22; q.result(h.i === 2 && h.res.every(Boolean) ? 'PERFECT' : 'NICE', { swingL: 'sidestepped', swingR: 'sidestepped', high: 'ducked it', low: 'hopped it' }[a.kind]); UI.pop('DODGED', `+${pts}`, { top: 24 }); A.sfx('whoosh', 0.9, 1.1); }
          else {
            h.hit = true; h.hitK = 1; h.pen += 1.6; G.ice = Math.max(0, G.ice - 7); G.combo = 0; G.mult = 1; h.shake = 0.9;
            q.result('MISS', h.dodge ? 'wrong move' : 'too slow'); UI.pop({ swingL: 'BONK', swingR: 'BONK', high: 'CLONK', low: 'SHIN DESTROYER' }[a.kind], '+1.6s · ice −7', { top: 24 });
            A.sfx('knock', 1.2, 0.7); A.sfx('crash', 0.4, 1.7); navigator.vibrate?.(60); stars.visible = true;
          }
        }
      } else if (h.st === 'res') {
        const a = h.atk, hold = h.hit ? 0.45 : 0.18;
        tipGoal = h.hit ? target(a.kind) : target(a.kind).add(V(a.kind === 'swingL' ? -0.5 : a.kind === 'swingR' ? 0.5 : 0, 0, 0.3));
        if (h.t > hold) tipGoal = rest(); point = 1 - smooth(seg(h.t, hold, hold + 0.4));
        if (h.t > hold + 0.1 && !h.said) { h.said = true; if (h.hit) caption(F, 'maintenance guy', ['huh? 🎵', 'did something hit me', '(still humming)'][h.i], 1200); }
        if (h.t > hold + 0.75) {
          h.i++; h.dodge = null; h.hit = false; h.said = false; h.t = 0; stars.visible = false; h.look = 0;
          if (h.i >= 3) { h.st = 'outro'; E.finish(); const n = h.res.filter(Boolean).length; UI.pop(GRADES.ladder[n][0], n === 3 ? `not a scratch · +${GRADES.ladder[n][1]}` : `${3 - n} hit${3 - n > 1 ? 's' : ''} · +${GRADES.ladder[n][1]}`, { top: 24 }); A.sfx(n === 3 ? 'jingle' : 'pop', 0.7); setTimeout(() => UI.remove('evui'), 1500); }
          else { h.st = 'wait'; h.wait = [1.0, 0.75, 0.55][h.i] * 0.8 + Math.random() * 0.5; }
        }
      } else if (h.st === 'outro') {
        // he finally notices you, pulls a headphone off, flattens himself against the wall
        const t = h.t; camK = t < 2.2 ? 'two' : 'game';
        tipGoal = V(G0.gx - 0.9, 2.5, h.gz + 0.6).lerp(V(-1.05, 2.4, h.gz + 1.2), smooth(seg(t, 0.3, 1.2)));
        if (t > 0.4 && !h.o1) { h.o1 = true; caption(F, 'maintenance guy', 'oh! my bad bro 🎧 you good?', 1700); A.sfx('pop', 0.6, 1.2); }
        if (t > 1.9 && !h.o2) { h.o2 = true; UI.thought(h.res.every(Boolean) ? 'not today, ladder.' : 'i am NOT good.', 1500); }
        if (t > 2.4) { h.st = 'pass'; h.t = 0; UI.remove('qte'); UI.skipChip(true).addEventListener('click', () => F.skip()); }
      } else if (h.st === 'pass') {
        const t = h.t, T = 3.0, u = easeInOut(seg(t, 0, T));
        tipGoal = V(-1.0, 2.5, h.gz + 1.4); h.gz = lerp(G0.zg, G0.zg + 0.2, seg(t, 0, 1));
        h.cz = lerp(HC.c, DOOR_Z - 0.15, u); h.cx = lerp(HC.cx, 0.62, smooth(seg(t, 0, 0.7))) * (1 - smooth(seg(t, 1.7, 2.6))) + 0.15 * smooth(seg(t, 1.7, 2.6));
        walkC = 1 - smooth(seg(t, T - 0.35, T)); camK = 'pass';
        if (t > T + 0.15) return F.enterDoor();
      }
      // ---- the ladder: rides his right shoulder, pointed at the tip goal
      h.tip.lerp(tipGoal, h.st === 'swing' ? 1 : 1 - Math.exp(-9 * dt));
      // ---- the guy
      guy.root.position.set(G0.gx, 0, h.gz);
      const sh0 = guy.root.localToWorld(V(-0.18, 1.45, 0)), dir0 = h.tip.clone().sub(sh0);
      guy.root.rotation.set(0, clamp(Math.atan2(dir0.x, dir0.z) * 0.55, -0.7, 0.7), 0);
      if (walkG > 0.05) guy.pose([['walk', F.t * 1.05, 1]]); else guy.pose([['idle', F.t]]);
      const hd = guy.bone('Head'); hd.rotateY(-h.look * 0.75 + Math.sin(F.t * 3) * 0.08 * (h.st === 'wait' ? 1 : 0)); hd.rotateX(h.st === 'intro' || h.st === 'wait' ? Math.sin(F.t * 7) * 0.07 : 0); hd.updateMatrixWorld(true);
      const sh = shoulder(), dir = h.tip.clone().sub(sh).normalize();
      lad.position.copy(sh).addScaledVector(dir, 0.15); lad.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
      const onL = (d) => lad.position.clone().addScaledVector(dir, d).add(V(0, -0.06, 0));
      ik2(guy.bone('RightArm'), guy.bone('RightForeArm'), guy.bone('RightHand'), onL(0.35), guy.root.localToWorld(V(-0.6, 0.8, -0.4)));
      const pt = guy.root.localToWorld(V(h.look * -0.9 + 0.5, 1.55, 0.5)); // free hand points at the door he's after
      ik2(guy.bone('LeftArm'), guy.bone('LeftForeArm'), guy.bone('LeftHand'), onL(-0.35).lerp(pt, point), guy.root.localToWorld(V(0.6, 0.6, -0.5)));
      // ---- you
      const d = h.dodge; let cDx = 0, hop = 0, duck = 0, roll = 0;
      if (d) {
        d.t += dt; const k = smooth(seg(d.t, 0, 0.15)) * (1 - smooth(seg(d.t, 0.75, 1.15)));
        if (d.k === 'arrowup') hop = Math.sin(Math.PI * seg(d.t, 0, 0.55)) * 0.7;
        else if (d.k === 'arrowdown') duck = k;
        else { cDx = DODGE_X[d.k] * k; roll = -DODGE_X[d.k] * 0.35 * Math.sin(Math.PI * seg(d.t, 0, 0.3)); }
      }
      const cx = h.cx + cDx, cz = h.cz;
      poseCourier(F, { x: cx, z: cz, yaw: h.st === 'pass' ? lerp(Math.PI, Math.PI / 2, smooth(seg(h.t, 2.5, 3.0))) : Math.PI, walk: walkC, jog: h.st === 'pass', duck, hop, roll, hit: h.hitK, t: F.t });
      // ---- tells
      bang.visible = h.st === 'tele'; if (bang.visible) { bang.position.copy(guy.boneWorld('Head')).add(V(0, 0.5, 0)); const s = 0.36 * (1 + 0.15 * Math.sin(F.t * 30)); bang.scale.set(s, s, 1); }
      if (note.visible) { note.position.copy(guy.boneWorld('Head')).add(V(0.25, 0.42 + Math.sin(F.t * 3) * 0.05, 0)); note.scale.set(0.28, 0.28, 1); }
      if (stars.visible) { stars.position.copy(F.G.R.C.boneWorld('Head')).add(V(0, 0.38, 0)); stars.scale.set(0.34, 0.34, 1); }
      const live = h.st === 'tele' || h.st === 'swing';
      if (live) { const tg = target(h.atk.kind); zone.position.set(h.atk.kind === 'swingL' || h.atk.kind === 'swingR' ? tg.x + Math.sign(tg.x - h.cx) * 0.05 : h.cx, 0.012, HC.c); zone.scale.setScalar(h.atk.kind === 'high' || h.atk.kind === 'low' ? 1.2 : 0.8); }
      zone.material.color.set(h.atk?.kind === 'high' ? 0xffa21a : 0xff2a1a);
      zone.material.opacity = live ? 0.38 + 0.22 * Math.sin(F.t * 40) : damp(zone.material.opacity, 0, 10, rdt);
      // ---- camera
      const push = h.st === 'swing' || (h.st === 'res' && h.t < 0.4) ? 1 : 0; F.camPush = damp(F.camPush || 0, push, 10, rdt);
      let cp, cl, fov;
      if (camK === 'follow') { cp = V(cx - 0.55, 1.68, cz + 2.0); cl = V(cx + 0.15, 1.15, cz - 3); fov = 56; }
      else if (camK === 'guycu') { const hp = guy.boneWorld('Head'); cp = V(G0.gx + 1.05, 1.5, h.gz + 1.15); cl = hp.add(V(-0.1, -0.15, 0)); fov = 42; }
      else if (camK === 'two') { const mz = (h.gz + HC.c) / 2; cp = V(1.02, 1.5, mz + 0.35); cl = V(-0.45, 1.2, mz - 0.5); fov = 54; }
      else if (camK === 'pass') { const u = seg(h.t, 0, 3.0); cp = V(-0.95, 1.7, DOOR_Z - 1.6); cl = V(lerp(0.2, 0.5, u), 1.1, lerp(-2.2, DOOR_Z + 0.3, easeInOut(u))); fov = 54; }
      else { cp = V(-0.95, 1.85 - F.camPush * 0.1, HC.c + 2.45 - F.camPush * 0.35); cl = V(-0.05, 1.05, HC.c - 1.4); fov = 56 - F.camPush * 4; }
      camera(F, cp, cl, fov, camK, rdt, h.shake);
    },
  };
  return E;
}

// ================================================================ MOP
async function buildMop(F, scene) {
  const [, jan] = await prefetchHallFolks();
  scene.add(jan.root); jan.root.visible = true;
  const mp = mop(); scene.add(mp);
  const bucket = mopBucket(); bucket.position.set(-0.55, 0, -10.6); bucket.rotation.y = 0.4; scene.add(bucket);
  const sign = wetSign(); sign.position.set(-0.85, 0, -1.05); sign.rotation.y = 0.5; scene.add(sign);
  const sign2 = wetSign(); sign2.position.set(0.9, 0, -6.2); sign2.rotation.y = -0.3; scene.add(sign2);
  // the freshly mopped floor: a glossy wet film with streaks
  const streak = canvasTex('wetfilm', 256, 512, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h; c.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.3})`; c.lineWidth = 2 + Math.random() * 8; c.beginPath(); c.arc(x, y, 30 + Math.random() * 80, Math.random() * 6, Math.random() * 6 + 1.2); c.stroke(); } });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.8), new THREE.MeshStandardMaterial({ color: 0x9fb6c8, roughness: 0.04, metalness: 0.65, transparent: true, opacity: 0.4, alphaMap: streak, depthWrite: false }));
  wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.006, -5.2); wet.renderOrder = 2; scene.add(wet);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.8), new THREE.MeshStandardMaterial({ color: 0x24303a, roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.22, depthWrite: false }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, 0.004, -5.2); scene.add(sheen);
  const bang = bangSprite('❗', '#ff2a1a'), splash = bangSprite('💦', '#1e5fa8'); scene.add(bang, splash);
  const h = { st: 'intro', t: 0, i: 0, res: [], pen: 0, slow: 1, shake: 0, cz: HC.c0, cx: 0.05, b: 0, bv: 0, slideV: 0, fallT: 0, slips: [], nextSlip: 0 };
  let ui = null, bar = null, q = null;
  const E = {
    kind: 'mop',
    state: () => ({ kind: 'mop', st: h.st, t: h.t, key: h.slip?.key, b: h.b, slip: !!h.slip, slipT: h.slip ? h.slip.t : 0 }),
    skippable: () => h.st === 'outro',
    start() { F.UI.remove('evui'); F.Audio.music('tense'); F.Audio.sfx('creak', 0.6, 1.3); },
    key(k, e) {
      k = KEYMAP[k] || k; if (k !== 'arrowleft' && k !== 'arrowright') return;
      e?.preventDefault();
      if (h.st !== 'slide' || h.fallT > 0) return;
      const dir = k === 'arrowright' ? 1 : -1;
      if (h.slip) {
        const s = h.slip;
        if (dir === -s.side) { // caught it
          const u = s.t / s.W, perfect = u < 0.5; h.res.push(true); ui.set(h.res); h.slip = null; bang.visible = false;
          h.b *= 0.3; h.bv = -s.side * 0.4; h.slow = 0.3;
          const pts = (perfect ? 220 : 140) * (h.i + 1); F.G.score += pts;
          q?.result(perfect ? 'PERFECT' : 'NICE', perfect ? 'caught it instantly' : 'caught it'); q = null;
          F.UI.pop(perfect ? 'SAVED!' : 'CAUGHT IT', `+${pts}`, { top: 24 }); F.Audio.sfx('skid', 0.7, 1.6); F.Audio.sfx('ding', 0.5, 1.4);
          h.i++;
        } else E.fall('overcorrected');
        return;
      }
      h.bv += dir * 1.15; h.b += dir * 0.05; F.Audio.sfx('step', 0.5, 1.4 + Math.random() * 0.2);
    },
    fall(why) {
      const G = F.G, UI = F.UI, A = F.Audio;
      if (h.slip) { h.res.push(false); ui?.set(h.res); q?.result('MISS', why); q = null; h.slip = null; h.i++; bang.visible = false; }
      h.fallT = 1.7; h.fallDur = 1.7; h.pen += 1.6; G.ice = Math.max(0, G.ice - 7); G.combo = 0; G.mult = 1; h.shake = 0.9; h.b = 0; h.bv = 0;
      UI.pop('SPLAT', `${why} · +1.6s · ice −7`, { top: 24 }); A.sfx('splash', 1, 0.8); A.sfx('crash', 0.5, 1.3); navigator.vibrate?.(60);
      splash.visible = true;
      if (!h.fl) { h.fl = true; caption(F, 'janitor', ['AY. I JUST MOPPED THAT', 'that’s gonna leave a mark', 'bro is SWIMMING'][Math.floor(Math.random() * 3)], 1500); }
    },
    hide() { jan.root.visible = false; mp.visible = false; bucket.visible = false; sign.visible = sign2.visible = false; wet.visible = sheen.visible = false; bang.visible = splash.visible = false; },
    dispose() { jan.root.removeFromParent(); },
    finish() { if (h.done) return; h.done = true; while (h.res.length < 3) h.res.push(false); const r = finish(F, 'mop', h.res, h.pen); ui?.done(r.g); F.UI.remove('evui'); return r; },
    update(rdt) {
      const G = F.G, UI = F.UI, A = F.Audio;
      h.slow = damp(h.slow, 1, 2.5, rdt); const dt = rdt * h.slow;
      F.t += dt; h.t += dt; h.shake = Math.max(0, h.shake - rdt * 2.5); h.fallT = Math.max(0, h.fallT - dt);
      let walkC = 0, camK = 'game', arms = 0, mopT = F.t;
      if (h.st === 'intro') {
        const t = h.t; walkC = 1 - smooth(seg(t, 1.55, 1.9));
        h.cz = lerp(HC.c0, -1.25, easeInOut(seg(t, 0, 1.9)));
        if (t > 0.9 && !h.l0) { h.l0 = true; caption(F, 'janitor', 'WAIT— don’t— i JUST mopped—', 1900); A.sfx('step', 1, 0.7); }
        camK = t < 1.9 ? 'follow' : 'feet';
        if (t > 1.9) { arms = smooth(seg(t, 1.9, 2.3)); }
        if (t > 2.0 && !h.sk) { h.sk = true; A.sfx('skid', 1, 0.7); UI.thought('oh no.', 1400); h.shake = 0.4; }
        if (t > 2.9) {
          h.st = 'slide'; h.t = 0; h.slideV = 1.25;
          ui = UI.evUI({ title: '🧽 WET FLOOR', pips: 3, hint: 'keep the needle centred: tap <b>←</b> <b>→</b> · when you <b>SLIP</b>, hit the <b>opposite</b> key fast · wrong way = SPLAT', keys: ['arrowleft', 'arrowright'] });
          ui.el.querySelector('.dogui').classList.remove('run'); ui.bind((k) => E.key(k)); bar = balanceBar(ui);
          // three slips spread over the slide, never evenly
          let tt = 0.9 + Math.random() * 0.5; for (let i = 0; i < 3; i++) { h.slips.push(tt); tt += 1.15 + Math.random() * 0.55; }
        }
      } else if (h.st === 'slide') {
        arms = 1;
        if (h.fallT > 0) h.slideV = damp(h.slideV, 0.55, 2, dt); else h.slideV = damp(h.slideV, h.i >= 3 ? 1.6 : 1.25, 1.5, dt);
        h.cz -= h.slideV * dt;
        // the needle: unstable (drifts away from the middle) plus a little wobble from the floor
        if (h.fallT <= 0) {
          if (h.slip) {
            const s = h.slip; s.t += dt; h.bv = (s.side * 1.05 - s.b0) / s.W; h.b += h.bv * dt;
            q?.set(1 - s.t / s.W);
            if (Math.abs(h.b) >= 1) E.fall(s.t >= s.W * 0.98 ? 'too slow' : 'went over');
          } else {
            h.bv += (Math.sin(F.t * 2.3) * 0.6 + (Math.random() - 0.5) * 2.2) * dt + h.b * 1.1 * dt; h.bv *= Math.exp(-2.2 * dt); h.b += h.bv * dt;
            if (Math.abs(h.b) >= 1) E.fall('lost it');
            // a slip: your foot finds a puddle, the needle gets kicked
            if (h.nextSlip < 3 && h.t >= h.slips[h.nextSlip]) {
              const side = Math.abs(h.b) > 0.25 ? Math.sign(h.b) : (Math.random() < 0.5 ? -1 : 1), W = hallWindows(G)[h.nextSlip];
              h.slip = { side, W, t: 0, b0: h.b, key: side < 0 ? 'arrowright' : 'arrowleft' }; h.nextSlip++;
              q = UI.qte({ key: h.slip.key, label: side < 0 ? 'SLIPPING <b>LEFT</b> — lean right' : 'SLIPPING <b>RIGHT</b> — lean left' }); A.sfx('skid', 1, 1.2); A.sfx('pop', 0.7, 0.6); bang.visible = true; h.shake = 0.35;
            }
          }
        } else { h.b = damp(h.b, 0, 4, dt); }
        bar?.set(h.b, !!h.slip);
        // a slip whose fall never resolved (shouldn't happen) still counts once
        if (h.nextSlip >= 3 && !h.slip && h.res.length >= 3 && h.cz < DOOR_Z + 0.9 && h.fallT <= 0) { h.st = 'outro'; h.t = 0; }
        if (h.cz < DOOR_Z - 0.15) { h.cz = DOOR_Z - 0.15; if (h.fallT <= 0 && !h.slip && h.res.length >= 3) { h.st = 'outro'; h.t = 0; } else h.slideV = 0; }
        if (!h.slip && h.fallT <= 0 && h.cz <= DOOR_Z - 0.1 && h.nextSlip < 3) { while (h.res.length < 3) h.res.push(false); h.nextSlip = 3; h.st = 'outro'; h.t = 0; }
      } else if (h.st === 'outro') {
        // he grabs the door frame of 2004 and stops dead
        const t = h.t; arms = 1 - smooth(seg(t, 0.2, 0.7));
        h.cz = damp(h.cz, DOOR_Z - 0.15, 8, dt); h.cx = damp(h.cx, 0.15, 6, dt);
        if (!h.fin) {
          h.fin = true; const r = E.finish();
          UI.pop(r.g, r.n === 3 ? `didn’t touch the floor · +${r.pts}` : `${3 - r.n} spill${3 - r.n > 1 ? 's' : ''} · +${r.pts}`, { top: 24 }); A.sfx(r.n === 3 ? 'jingle' : 'pop', 0.7); A.sfx('knock', 0.8, 0.8);
          bang.visible = false; UI.remove('qte'); setTimeout(() => UI.remove('evui'), 1500);
        }
        if (t > 0.5 && !h.o1) { h.o1 = true; caption(F, 'janitor', h.res.every(Boolean) ? 'ok that was actually smooth 👏' : 'i’m gonna need you to sign an incident form', 1800); }
        camK = 'door';
        if (t > 2.3) return F.enterDoor();
      }
      // ---- the janitor at the far end, mopping side to side
      jan.root.position.set(-0.35, 0, -10.9); jan.root.rotation.set(0, 0.15 + Math.sin(mopT * 1.6) * 0.15, 0);
      jan.pose([['idle', F.t]]);
      const mopHead = jan.root.localToWorld(V(Math.sin(mopT * 1.6) * 0.45, 0.02, 0.75)), grip = jan.root.localToWorld(V(0.05, 1.05, 0.28));
      mp.position.copy(mopHead); const md = grip.clone().sub(mopHead).normalize(); mp.quaternion.setFromUnitVectors(V(0, 1, 0), md);
      ik2(jan.bone('RightArm'), jan.bone('RightForeArm'), jan.bone('RightHand'), mopHead.clone().addScaledVector(md, 1.1), jan.root.localToWorld(V(-0.6, 0.6, -0.4)));
      ik2(jan.bone('LeftArm'), jan.bone('LeftForeArm'), jan.bone('LeftHand'), mopHead.clone().addScaledVector(md, 0.75), jan.root.localToWorld(V(0.6, 0.6, -0.4)));
      if (h.st === 'intro' && h.t > 0.9) { const hd = jan.bone('Head'); hd.rotateX(-0.15); hd.updateMatrixWorld(true); }
      // ---- you: windmilling, leaning with the needle, or flat on your back still sliding
      const fall = h.fallT > 0 ? 1 - h.fallT / h.fallDur : 0;
      poseCourier(F, { x: h.cx + h.b * 0.12, z: h.cz, walk: walkC, roll: h.st === 'slide' && !fall ? h.b * 0.42 : 0, arms: fall ? 0 : arms, fall, t: F.t });
      bang.visible = !!h.slip; if (bang.visible) { bang.position.copy(G.R.C.boneWorld('Head')).add(V(0, 0.5, 0)); const s = 0.34 * (1 + 0.15 * Math.sin(F.t * 30)); bang.scale.set(s, s, 1); }
      if (splash.visible) { splash.position.copy(G.R.root.position).add(V(0, 0.6, 0)); splash.scale.set(0.38, 0.38, 1); if (h.fallT <= 0) splash.visible = false; }
      // ---- camera: trails you down the corridor (the door end in view), low and close on the first skid
      let cp, cl, fov;
      const cz = h.cz;
      if (camK === 'follow') { cp = V(h.cx - 0.55, 1.68, cz + 2.0); cl = V(h.cx + 0.1, 1.05, cz - 3); fov = 56; }
      else if (camK === 'feet') { cp = V(h.cx + 0.95, 0.85, cz - 2.1); cl = V(h.cx - 0.05, 0.75, cz + 0.1); fov = 46; }
      else if (camK === 'door') { cp = V(-0.85, 1.6, DOOR_Z - 1.7); cl = V(0.4, 1.1, DOOR_Z + 0.2); fov = 54; }
      else { cp = V(-0.75, 1.9, cz + 2.4); cl = V(0.05, 0.85, cz - 2.2); fov = 56; }
      camera(F, cp, cl, fov, camK, rdt, h.shake);
    },
  };
  return E;
}

// ================================================================ BEAM: the floor caved in; one plank across the hole
const HOLE = { z0: -3.6, z1: -7.1, x: 0.12, deep: -3.1 };
function tiledM(p, rx, ry, o = {}) { const t = tex(p).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t, ...o }); }
function holeSet(F, scene) {
  const g = new THREE.Group(); scene.add(g);
  // cut the corridor runner: hide the full-length floor planes, put back the pieces either side of the hole
  const L = 30, zA = 4, zB = -26;
  for (const m of [...F.hall.children]) {
    const gp = m.geometry?.parameters;
    if (!m.isMesh || m.geometry.type !== 'PlaneGeometry' || gp.height !== L || Math.abs(m.rotation.x + Math.PI / 2) > 1e-3) continue;
    m.visible = false;
    for (const [a, b] of [[zA, HOLE.z0], [HOLE.z1, zB]]) {
      const len = a - b, geo = new THREE.PlaneGeometry(gp.width, len), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / L + (b - zB) / L);
      const piece = new THREE.Mesh(geo, m.material); piece.rotation.x = -Math.PI / 2; piece.position.set(m.position.x, m.position.y, (a + b) / 2); piece.receiveShadow = true; g.add(piece);
    }
  }
  const cem = tiledM('tex/cement.jpg', 2, 1, { color: 0xb8b2a6 }), dark = mat(0x1a1714, { roughness: 1 }), wood = tiledM('tex/plywood.jpg', 1, 1, { color: 0xb08a5a });
  // the slab's broken edges: concrete lips, splintered joists, bent rebar, torn carpet
  for (const z of [HOLE.z0, HOLE.z1]) {
    const s = z === HOLE.z0 ? -1 : 1;
    box(2.6, 0.3, 0.12, cem, 0, -0.15, z + s * 0.06, g);
    for (let i = 0; i < 9; i++) { const j = box(0.07, 0.18, 0.5 + Math.random() * 0.4, wood, -1.1 + i * 0.27, -0.12 - Math.random() * 0.08, z + s * 0.2, g); j.rotation.x = s * (0.15 + Math.random() * 0.3); j.rotation.y = (Math.random() - 0.5) * 0.3; }
    for (let i = 0; i < 6; i++) { const r = cyl(0.008, 0.008, 0.45 + Math.random() * 0.3, mat(0x5a3a28, { metalness: 0.6, roughness: 0.6 }), 5, -1 + Math.random() * 2, -0.18, z + s * 0.18, g); r.rotation.set(Math.PI / 2 + s * (0.3 + Math.random() * 0.6), 0, (Math.random() - 0.5) * 0.8); }
    for (let i = 0; i < 12; i++) { const t = box(0.24, 0.012, 0.06 + Math.random() * 0.14, mat(0x5a1a22, { roughness: 1 }), -1.15 + i * 0.21, 0.004, z + s * (0.02 + Math.random() * 0.05), g); t.rotation.y = (Math.random() - 0.5) * 0.5; }
  }
  // the shaft down to floor 19: walls, a dim corridor below with one flickering tube light
  const dz = HOLE.z0 - HOLE.z1, zc = (HOLE.z0 + HOLE.z1) / 2;
  for (const sx of [-1, 1]) box(0.1, 3.1, dz + 6, cem, sx * 1.32, HOLE.deep / 2 - 0.05, zc, g);
  const below = new THREE.Mesh(new THREE.PlaneGeometry(2.6, dz + 6), tiledM('tex/hall_carpet.jpg', 2, (dz + 6) / 1.3, { color: 0x6a6070 })); below.rotation.x = -Math.PI / 2; below.position.set(0, HOLE.deep, zc); below.receiveShadow = true; g.add(below);
  box(2.6, 0.06, dz + 6, dark, 0, -0.33, zc + (dz + 6) / 2 + 0.02, g).scale.z = 0.0001; // (keeps the group's bbox sane)
  for (const [a, b] of [[zc + dz / 2 + 3, HOLE.z0], [HOLE.z1, zc - dz / 2 - 3]]) box(2.6, 0.04, a - b, mat(0xd8d2c6, { roughness: 1 }), 0, -0.32, (a + b) / 2, g); // floor 19's ceiling, either side of the hole
  for (let i = 0; i < 14; i++) { const c = box(0.12 + Math.random() * 0.3, 0.08 + Math.random() * 0.15, 0.12 + Math.random() * 0.3, Math.random() < 0.5 ? cem : wood, (Math.random() - 0.5) * 2.2, HOLE.deep + 0.06, HOLE.z1 + Math.random() * dz, g); c.rotation.set(Math.random(), Math.random() * 3, Math.random()); }
  const tube = box(1.2, 0.05, 0.1, new THREE.MeshBasicMaterial({ color: 0xdff0ff }), 0, -0.36, zc - 2.2, g);
  const lamp = new THREE.PointLight(0xcfe6ff, 6, 9, 1.6); lamp.position.set(0, -0.6, zc - 1.5); g.add(lamp);
  const up = new THREE.PointLight(0xffd8a8, 2.5, 6, 2); up.position.set(0, -2.4, zc); g.add(up);
  // the plank, a sawhorse pushed aside, caution tape, a sign
  const plank = new THREE.Group(); g.add(plank);
  box(0.24, 0.05, dz + 0.8, tiledM('tex/plywood.jpg', 0.3, 3, { color: 0xc8a070 }), 0, 0, 0, plank).castShadow = true;
  plank.position.set(HOLE.x, 0.03, zc);
  const tape = canvasTex('caution', 512, 64, (c, w, h) => { c.fillStyle = '#ffd21a'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 40px system-ui'; for (let x = 10; x < w; x += 190) c.fillText('CAUTION', x, 46); });
  const tm = new THREE.MeshLambertMaterial({ map: tape, side: THREE.DoubleSide });
  const tapes = [];
  for (const [x0, z0, x1, z1] of [[-1.2, HOLE.z0 + 0.35, -0.25, HOLE.z0 + 0.25], [0.5, HOLE.z0 + 0.25, 1.2, HOLE.z0 + 0.35]]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), 0.08), tm); t.position.set((x0 + x1) / 2, 0.95, (z0 + z1) / 2); t.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(t); tapes.push(t); }
  for (const x of [-1.2, -0.25, 0.5, 1.2]) cyl(0.03, 0.04, 1.0, mat(0xff6a00), 8, x, 0.5, HOLE.z0 + 0.3, g);
  const sign = canvasTex('holesign', 384, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#d21f1f'; c.fillRect(0, 0, w, 70); c.fillStyle = '#fff'; c.font = '900 50px system-ui'; c.textAlign = 'center'; c.fillText('DANGER', w / 2, 52); c.fillStyle = '#111'; c.font = '800 34px system-ui'; c.fillText('FLOOR UNDER REPAIR', w / 2, 128); c.font = '700 30px system-ui'; c.fillText('use plank ⟶', w / 2, 180); c.font = '600 20px system-ui'; c.fillText('— mgmt (sorry)', w / 2, 226); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshLambertMaterial({ map: sign })); sg.position.set(-1.22, 1.35, HOLE.z0 + 0.9); sg.rotation.y = Math.PI / 2; g.add(sg);
  // dust motes drifting up out of the hole
  const dustT = canvasTex('dustmote', 64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, 'rgba(230,220,200,.9)'); gr.addColorStop(1, 'rgba(230,220,200,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const dust = Array.from({ length: 26 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false, opacity: 0.25 })); sp.scale.setScalar(0.06 + Math.random() * 0.1); sp.position.set((Math.random() - 0.5) * 2.2, HOLE.deep + Math.random() * 3.4, HOLE.z1 + Math.random() * dz); sp.userData.v = 0.1 + Math.random() * 0.2; g.add(sp); return sp; });
  return { g, plank, tube, lamp, dust, tapes };
}
async function buildBeam(F, scene) {
  const set = holeSet(F, scene);
  // a short stairwell, parked out of sight, for the trip back up if you fall
  const well = Sets.stairwell(null, 3); well.position.set(60, 0, 0); well.visible = false; scene.add(well);
  for (const o of well.children) if (o.isMesh && (Math.abs(o.position.x - 3.15) < 0.01 || (o.geometry?.type === 'PlaneGeometry' && o.position.x > 2.9))) o.visible = false;
  let nl = 0; well.traverse((o) => { if (o.isPointLight && nl++ % 3) o.visible = false; });
  // renumber the stencilled floors so the trip reads 18 → 19 → 20
  for (const o of well.children) if (o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.geometry.parameters.width === 1.5) {
    const f = Math.round((o.position.y - 1.9) / Sets.FH) + 18;
    o.material = o.material.clone(); o.material.map = canvasTex('stflb' + f, 256, 256, (c, w, hh) => { c.clearRect(0, 0, w, hh); c.fillStyle = '#1d2a33'; c.font = '900 150px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(f), w / 2, hh / 2 + 8); });
  }
  const bang = bangSprite('❗', '#ff2a1a'), dustS = bangSprite('💨', '#5a5048'); scene.add(bang, dustS);
  const h = { st: 'intro', t: 0, i: 0, res: [], pen: 0, slow: 1, shake: 0, cz: HC.c0, cx: 0.2, b: 0, bv: 0, lurch: null, next: 0, at: [], sumB: 0, nB: 0, fell: false, y: 0, vy: 0 };
  let ui = null, bar = null, q = null;
  const done = () => h.st === 'after' || h.st === 'fall' || h.st === 'below' || h.st === 'climb' || h.st === 'back';
  const E = {
    kind: 'beam', _h: h,
    state: () => ({ kind: 'beam', st: h.st === 'cross' ? 'slide' : h.st, t: h.t, key: h.lurch?.key, b: h.b, slip: !!h.lurch, slipT: h.lurch ? h.lurch.t : 0 }),
    skippable: () => h.st === 'after' || h.st === 'back',
    start() { F.UI.remove('evui'); F.Audio.music('tense'); F.Audio.sfx('creak', 0.7, 0.8); },
    key(k, e) {
      k = KEYMAP[k] || k; if (k !== 'arrowleft' && k !== 'arrowright') return;
      e?.preventDefault();
      if (h.st !== 'cross') return;
      const dir = k === 'arrowright' ? 1 : -1;
      if (h.lurch) {
        const s = h.lurch;
        if (dir === -s.side) {
          const u = s.t / s.W, perfect = u < 0.5; h.res.push(true); ui.set(h.res); h.lurch = null; bang.visible = false;
          h.b *= 0.35; h.bv = -s.side * 0.35; h.slow = 0.3; const pts = (perfect ? 220 : 140) * (h.i + 1); F.G.score += pts; h.i++;
          q?.result(perfect ? 'PERFECT' : 'NICE', perfect ? 'rock solid' : 'caught it'); q = null; F.UI.pop(perfect ? 'STEADY!' : 'CAUGHT IT', `+${pts}`, { top: 24 }); F.Audio.sfx('creak', 0.7, 1.6);
        } else E.fall('leaned the wrong way');
        return;
      }
      h.bv += dir * 1.0; h.b += dir * 0.04; F.Audio.sfx('creak', 0.25, 1.8 + Math.random() * 0.3);
    },
    fall(why) {
      const G = F.G, UI = F.UI, A = F.Audio;
      if (h.lurch) { q?.result('MISS', why); q = null; h.lurch = null; bang.visible = false; }
      while (h.res.length < 3) h.res.push(false); ui?.set(h.res);
      h.fell = true; h.st = 'fall'; h.t = 0; h.fallSide = Math.sign(h.b) || 1; h.slow = 0.3; h.y = 0; h.vy = 0; h.fallX = h.cx + h.b * 0.1;
      h.pen += 6; G.ice = Math.max(0, G.ice - 10); G.combo = 0; G.mult = 1; setTimeout(() => F.phase === 'hall' && UI.remove('evui'), 1100);
      UI.pop('AAAAAA', `${why} · +6s · ice −10`, { top: 24 }); A.sfx('whoosh', 1, 0.5); A.sfx('creak', 1, 0.5); navigator.vibrate?.(80);
    },
    hide() { set.g.visible = false; well.visible = false; bang.visible = dustS.visible = false; for (const m of F.hall.children) if (m.isMesh && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.height === 30) m.visible = true; },
    dispose() {},
    finish() {
      if (h.done) return h.r; h.done = true;
      while (h.res.length < 3) h.res.push(false);
      const avg = h.nB ? h.sumB / h.nB : 1;
      const g = h.fell ? 'FELL A FLOOR' : avg < 0.22 ? 'TIGHTROPE' : avg < 0.38 ? 'STEADY' : 'SHAKY', pts = { 'FELL A FLOOR': 0, TIGHTROPE: 700, STEADY: 350, SHAKY: 150 }[g];
      const G = F.G; G.score += pts; G.fin = { ...(G.fin || {}), hall: g, hallT: h.pen, hallKind: 'beam', hallPerfect: g === 'TIGHTROPE' && h.res.every(Boolean) };
      ui?.done(g); F.UI.remove('evui'); return (h.r = { g, pts, avg });
    },
    update(rdt) {
      const G = F.G, UI = F.UI, A = F.Audio, R = G.R;
      h.slow = damp(h.slow, 1, h.st === 'fall' ? 1.2 : 2.5, rdt); const dt = rdt * h.slow;
      F.t += dt; h.t += dt; h.shake = Math.max(0, h.shake - rdt * 2.5);
      for (const d of set.dust) { d.position.y += d.userData.v * dt; d.position.x += Math.sin(F.t + d.position.z) * 0.02 * dt; if (d.position.y > 1.2) d.position.y = HOLE.deep; }
      set.lamp.intensity = 6 * (Math.sin(F.t * 37) > -0.85 ? 1 : 0.15); set.tube.material.color.setScalar(set.lamp.intensity > 1 ? 1 : 0.3);
      for (const t of set.tapes) t.rotation.x = Math.sin(F.t * 5 + t.position.x) * 0.25;
      let walk = 0, camK = 'game', arms = 0, roll = 0, x = h.cx, z = h.cz, y = 0, yaw = Math.PI, fallPose = 0, wellOn = false;
      const bounce = h.st === 'cross' ? Math.sin(F.t * 9) * 0.012 * (1 + Math.abs(h.b)) - 0.02 * Math.sin(Math.PI * clamp((HOLE.z0 - h.cz) / (HOLE.z0 - HOLE.z1))) : 0;
      set.plank.position.y = 0.03 + bounce * 0.6; set.plank.rotation.z = h.st === 'cross' ? h.b * 0.04 : 0;
      if (h.st === 'intro') {
        const t = h.t; walk = 1 - smooth(seg(t, 1.6, 2.0));
        h.cz = lerp(HC.c0, HOLE.z0 + 0.55, easeInOut(seg(t, 0, 2.0))); h.cx = lerp(0.2, HOLE.x, seg(t, 1.6, 2.0)); z = h.cz; x = h.cx;
        camK = t < 1.9 ? 'follow' : t < 4.0 ? 'reveal' : 'plank';
        if (t > 2.0 && !h.l0) { h.l0 = true; UI.thought('…there is a HOLE in the floor', 1800); A.sfx('creak', 0.9, 0.6); h.shake = 0.3; }
        if (t > 3.0 && !h.l1) { h.l1 = true; UI.thought('and kyle is on the other side. of course he is.', 1800); }
        if (t > 4.6) {
          h.st = 'cross'; h.t = 0;
          ui = UI.evUI({ title: '🕳️ THE PLANK', pips: 3, hint: 'stay centred: tap <b>←</b> <b>→</b> against the sway · when the plank <b>LURCHES</b>, hit the <b>opposite</b> key fast · fall = floor 19', keys: ['arrowleft', 'arrowright'] });
          ui.el.querySelector('.dogui').classList.remove('run'); ui.bind((k) => E.key(k)); bar = balanceBar(ui);
          let tt = 0.9 + Math.random() * 0.5; for (let i = 0; i < 3; i++) { h.at.push(tt); tt += 1.35 + Math.random() * 0.6; }
        }
      } else if (h.st === 'cross') {
        // step by step along the plank; the sway feeds on itself and on how far you've leaned
        arms = 1; walk = 0.55; h.cz -= 0.62 * dt; z = h.cz; x = HOLE.x + h.b * 0.07; roll = h.b * 0.45;
        if (h.lurch) {
          const s = h.lurch; s.t += dt; h.bv = (s.side * 1.05 - s.b0) / s.W; h.b += h.bv * dt; q?.set(1 - s.t / s.W);
          if (Math.abs(h.b) >= 1) E.fall(s.t >= s.W * 0.98 ? 'too slow' : 'went over');
        } else {
          h.bv += (Math.sin(F.t * 2.9) * 0.9 + (Math.random() - 0.5) * 2.6) * dt + h.b * 1.6 * dt; h.bv *= Math.exp(-2.0 * dt); h.b += h.bv * dt;
          if (Math.abs(h.b) >= 1) E.fall('lost your balance');
          if (h.next < 3 && h.t >= h.at[h.next]) {
            const side = Math.abs(h.b) > 0.2 ? Math.sign(h.b) : (Math.random() < 0.5 ? -1 : 1), W = hallWindows(G)[h.next];
            h.lurch = { side, W, t: 0, b0: h.b, key: side < 0 ? 'arrowright' : 'arrowleft' }; h.next++;
            q = UI.qte({ key: h.lurch.key, label: side < 0 ? 'plank LURCHES <b>LEFT</b> — lean right' : 'plank LURCHES <b>RIGHT</b> — lean left' }); A.sfx('creak', 1.1, 0.7); A.sfx('crash', 0.25, 2.2); bang.visible = true; h.shake = 0.45;
          }
        }
        if (h.st === 'cross') { h.sumB += Math.abs(h.b) * dt; h.nB += dt; bar?.set(h.b, !!h.lurch); }
        camK = 'plank';
        if (h.st === 'cross' && h.cz <= HOLE.z1 - 0.35 && !h.lurch) {
          while (h.res.length < h.next) h.res.push(false);
          h.st = 'after'; h.t = 0; const r = E.finish();
          UI.pop(r.g, `${r.avg < 0.22 ? 'like a gymnast' : 'made it'} · +${r.pts}`, { top: 24 }); A.sfx(r.g === 'TIGHTROPE' ? 'jingle' : 'pop', 0.7); UI.remove('qte'); bang.visible = false;
          setTimeout(() => UI.remove('evui'), 1500); UI.skipChip(true).addEventListener('click', () => F.skip());
        }
      } else if (h.st === 'after') {
        const t = h.t; walk = 1 - smooth(seg(t, 1.9, 2.3)); arms = 1 - smooth(seg(t, 0, 0.5));
        h.cz = lerp(HOLE.z1 - 0.35, DOOR_Z - 0.15, easeInOut(seg(t, 0, 2.2))); h.cx = lerp(HOLE.x, 0.15, smooth(seg(t, 0.5, 2.0))); z = h.cz; x = h.cx;
        yaw = lerp(Math.PI, Math.PI / 2, smooth(seg(t, 1.8, 2.3))); camK = 'door';
        if (t > 0.6 && !h.l2) { h.l2 = true; UI.thought('never. again.', 1400); }
        if (t > 2.5) return F.enterDoor();
      } else if (h.st === 'fall') {
        // off the side, a beat of slow-mo, then down through the hole
        const t = h.t; fallPose = 1;
        if (t > 0.25) { h.vy -= 9.8 * dt; h.y += h.vy * dt; }
        y = Math.max(HOLE.deep, h.y); x = h.fallX + h.fallSide * Math.min(0.5, t * 0.9); z = h.cz;
        roll = h.fallSide * Math.min(1.2, t * 2.2); camK = 'down';
        if (y <= HOLE.deep && !h.landed) { h.landed = true; h.t = 0; h.st = 'below'; A.sfx('boom', 1, 0.8); A.sfx('crash', 0.9, 0.7); h.shake = 1; dustS.visible = true; dustS.position.set(x, HOLE.deep + 0.4, z); }
        h.fx = x;
      } else if (h.st === 'below') {
        // floor 19: flat on your back in the rubble, then up, dusting off
        const t = h.t; x = h.fx; z = h.cz; y = HOLE.deep; camK = 'below';
        fallPose = 0; const u = clamp(t / 2.0);
        dustS.scale.setScalar(0.5 + t * 0.2); dustS.material.opacity = 1 - u;
        if (t > 0.4 && !h.l3) { h.l3 = true; UI.thought('floor 19. cool. cool cool cool.', 1700); }
        h.lie = u;
        if (t > 2.1) { h.st = 'climb'; h.t = 0; dustS.visible = false; A.sfx('step', 1, 1); }
      } else if (h.st === 'climb') {
        // back up the stairs to 20 (the long way, again)
        const t = h.t, s = Math.min(1.999, t * 0.95); wellOn = true;
        const sp = Sets.stairPath(2 + s); x = 60 + sp.p.x; y = sp.p.y; z = sp.p.z; yaw = Math.atan2(sp.dir.x, sp.dir.z); walk = 1;
        camK = 'well';
        if (t > 0.2 && !h.l4) { h.l4 = true; UI.sceneCap('', { extra: '<div class="notif"><div class="ic">↑</div><div><b>Floor 19 → 20</b><small>the stairs. again.</small></div></div>' }); }
        if (t > 2.1) { h.st = 'back'; h.t = 0; UI.remove('scene'); }
      } else if (h.st === 'back') {
        // in through the far stair door, past the hole you fell through, to 2004
        const t = h.t; walk = 1 - smooth(seg(t, 1.6, 2.0));
        h.cz = lerp(-13.5, DOOR_Z - 0.15, easeInOut(seg(t, 0, 1.9))); z = h.cz; x = lerp(-0.3, 0.15, seg(t, 0, 1.9)); yaw = lerp(0, Math.PI / 2, smooth(seg(t, 1.5, 2.0)));
        camK = 'door';
        if (t > 0.3 && !h.l5) { h.l5 = true; UI.thought('do NOT look at the hole', 1400); }
        if (t > 2.2) { if (!h.r) E.finish(); return F.enterDoor(); }
      }
      well.visible = wellOn;
      // ---- you
      const lie = h.st === 'below' ? h.lie : 0;
      poseCourier(F, { x, z, yaw, walk, arms, roll, t: F.t, fall: lie ? (lie < 0.62 ? 0.3 : lie) : 0 });
      R.root.position.y = y + (h.st === 'cross' ? bounce + 0.055 : 0);
      if (fallPose) { R.walk('falling', 0.3 + h.t * 1.3, { offset: V(0, 0, 0), yaw: 0 }); R.root.rotation.set(0, yaw, 0); R.root.rotateZ(roll); R.C.root.updateMatrixWorld(true); F.palmCup(F.cup, R.C); }
      bang.visible = !!h.lurch; if (bang.visible) { bang.position.copy(R.C.boneWorld('Head')).add(V(0, 0.5, 0)); const sc = 0.34 * (1 + 0.15 * Math.sin(F.t * 30)); bang.scale.set(sc, sc, 1); }
      // ---- camera: tight over the shoulder on the plank so the drop is right there under you
      let cp, cl, fov;
      const P = R.root.position;
      if (camK === 'follow') { cp = V(P.x - 0.55, 1.68, P.z + 2.0); cl = V(P.x + 0.1, 0.9, P.z - 3); fov = 56; }
      else if (camK === 'reveal') { cp = V(-0.95, 1.65, HOLE.z1 - 0.9); cl = V(0.15, -0.5, (HOLE.z0 + HOLE.z1) / 2 + 0.6); fov = 54; }
      else if (camK === 'plank') { cp = V(P.x - 0.85, 1.55, P.z + 1.25); cl = V(P.x + 0.12, 0.15, P.z - 1.6); fov = 50; }
      else if (camK === 'down') { cp = V(h.fallX + 0.55, 2.45, h.cz + 0.75); cl = V(P.x, P.y + 0.5, P.z - 0.2); fov = 58; }
      else if (camK === 'below') { cp = V(-0.9, HOLE.deep + 1.4, h.cz + 1.9); cl = V(h.fx, HOLE.deep + 0.3, h.cz); fov = 56; }
      else if (camK === 'well') { cp = V(60 + 9.5, P.y + 1.6, 0.2); cl = V(60 + 0.4, P.y + 0.7, 0); fov = 50; }
      else if (h.st === 'back') { cp = V(-0.85, 1.65, DOOR_Z + 1.7); cl = V(0.2, 1.0, DOOR_Z - 2.6); fov = 54; }
      else { cp = V(-0.85, 1.6, DOOR_Z + 1.9); cl = V(0.3, 1.1, DOOR_Z + 0.2); fov = 54; }
      camera(F, cp, cl, fov, camK, rdt, h.shake);
    },
  };
  void done;
  return E;
}

export const HALL_KINDS = ['dog', 'ladder', 'mop', 'beam'];
export function buildEncounter(kind, F, scene) { return kind === 'ladder' ? buildLadder(F, scene) : kind === 'beam' ? buildBeam(F, scene) : buildMop(F, scene); }
