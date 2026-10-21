// Floor-20 hallway encounters besides the pitbull (each run picks one of the three):
//  • LADDER: a maintenance guy in big headphones carries a 3.6 m ladder on his shoulder, hunting for a door number.
//    Every time he turns, the ladder comes for you: swings at your LEFT (→) or RIGHT (←), at your HEAD (↓ duck) or
//    your SHINS (↑ hop). His head turn + pointing hand is the tell; three swings, each faster.
//  • MOP: the janitor just mopped the whole corridor. You hit the wet floor and slide all the way to 2004 on a balance
//    meter: tap ← → to keep the needle centred (it drifts away from the middle), and when your foot SLIPS the needle
//    kicks hard one way — counter with the opposite key before you go over. Wrong key or too slow: SPLAT.
// Both end like the dog: grade into G.fin.hall / hallT / hallKind, then the finale walks you to Kyle's door.
import { THREE, V, clamp, lerp, seg, smooth, easeOut, easeInOut, damp, mat, box, cyl, canvasTex } from './core.js';
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
    kind: 'ladder',
    state: () => ({ kind: 'ladder', st: h.st, t: h.t, key: h.atk?.key, done: !!h.dodge }),
    skippable: () => h.st === 'outro' || h.st === 'pass',
    start() { F.Audio.music('tense'); F.Audio.sfx('creak', 0.6, 1.3); h.tip.copy(rest()); },
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
        const t = h.t; camK = t < 2.2 ? 'guycu' : 'game';
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
        if (d.k === 'arrowup') hop = Math.sin(Math.PI * seg(d.t, 0, 0.5)) * 0.55;
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
      else if (camK === 'guycu') { const hp = guy.boneWorld('Head'); cp = V(G0.gx + 0.75, 1.55, h.gz + 1.5); cl = hp.add(V(0, -0.12, 0)); fov = 40; }
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
    start() { F.Audio.music('tense'); F.Audio.sfx('creak', 0.6, 1.3); },
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
      else if (camK === 'feet') { cp = V(h.cx + 0.95, 0.55, cz - 1.25); cl = V(h.cx, 0.45, cz + 0.2); fov = 48; }
      else if (camK === 'door') { cp = V(-0.85, 1.6, DOOR_Z - 1.7); cl = V(0.4, 1.1, DOOR_Z + 0.2); fov = 54; }
      else { cp = V(-0.75, 1.9, cz + 2.4); cl = V(0.05, 0.85, cz - 2.2); fov = 56; }
      camera(F, cp, cl, fov, camK, rdt, h.shake);
    },
  };
  return E;
}

export const HALL_KINDS = ['dog', 'ladder', 'mop'];
export function buildEncounter(kind, F, scene) { return kind === 'ladder' ? buildLadder(F, scene) : buildMop(F, scene); }
