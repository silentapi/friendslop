// TIP BAIT — mobile web game. Deliver an iced caramel macchiato through real Downtown Orlando to Kyle S at
// Citi Tower (101 Lake Ave, floor 20). Swipe lanes, jump, hit boost pads and ramps, crash → watch an ad →
// continue from where you were. Kyle takes the tip anyway.
import { THREE, V, clamp, lerp, damp, seg, smooth, easeOut, easeInOut, loadJSON, loadTex, tex, progress, mulberry } from './core.js';
import { Route } from './route.js';
import * as City from './city.js';
import { citiTower } from './citi.js';
import { rider } from './rider.js';
import { buildLevel, populate, LANES, PHYS } from './level.js';
import { Audio } from './audio.js';
import * as UI from './ui.js';
import { Finale } from './finale.js';
import * as K from './kyle.js';

// ---------------------------------------------------------------- persistent state
const store = {
  get(k, d) { try { const v = localStorage.getItem('tipbait:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tipbait:' + k, JSON.stringify(v)); } catch {} },
};
const ORDERS = [
  { route: 'orange', tip: 50, note: '1 iced caramel macchiato. $50 tip if ur fast 🙏', pickup: 'Starbucks · 325 S Orange Ave', storm: false },
  { route: 'sunrail', tip: 75, note: 'same order. $75 this time fr fr', pickup: 'Starbucks · Church Street Station', storm: false },
  { route: 'orange', tip: 100, note: 'its raining so $100 tip 🙏 trust', pickup: 'Starbucks · 325 S Orange Ave', storm: true },
  { route: 'sunrail', tip: 250, note: '$250 tip on god. last time was a glitch', pickup: 'Starbucks · Church Street Station', storm: true },
];
const orderDef = (n) => { const o = ORDERS[(n - 1) % ORDERS.length]; const tip = o.tip * (1 + Math.floor((n - 1) / ORDERS.length)); return { ...o, tip, note: n === 1 ? o.note : K.pickLine(K.NOTES, mulberry(n * 31 + 7)).replace('$TIP', '$' + tip) }; };

// ---------------------------------------------------------------- renderer + scene
const canvas = document.getElementById('gl');
const TOUCH_EARLY = () => matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 1600);
const hemi = new THREE.HemisphereLight(0xe2ecff, 0xa08c74, 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2bc, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH_EARLY() ? 1024 : 2048, TOUCH_EARLY() ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 400 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.07;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 24), THREE.MathUtils.degToRad(222)).normalize();
let quality = 1, frameMs = 16, lastQ = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * quality);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
export const TOUCH = matchMedia('(pointer: coarse)').matches;
const baseFov = () => camera.aspect >= 1 ? 56 : clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42) / 2) / camera.aspect) * 180 / Math.PI, 52, 82);

// ---------------------------------------------------------------- game state
const G = {
  state: 'loading', order: store.get('order', 1), delivered: store.get('delivered', 0), best: store.get('best', null),
  world: null, R: null, route: null, lv: null, pop: null, rail: null, citi: null, streetInfo: null,
  s: 0, lat: 0, lane: 1, y: 0, vy: 0, v: 0, boostT: 0, boostCharge: 0, slowT: 0, invT: 0, eta: 0, time: 0, ice: 100,
  crashes: 0, nearMiss: 0, dist: 0, tip: 50, def: null, dmDone: new Set(), crashT: 0, crashAt: null, slowmo: 1, cine: 0,
  score: 0, mult: 1, combo: 0, comboT: 0, coins: 0, powers: [], bestScore: store.get('bestScore', 0), seed: 1,
};
const URLQ = new URLSearchParams(location.search);
// ---------------------------------------------------------------- score + combo
const MULT_STEP = 10;
function addCombo(n) { G.combo += n; G.comboT = 4; const m = Math.min(5, 1 + Math.floor(G.combo / MULT_STEP)); if (m > G.mult) { G.mult = m; G.bestMult = Math.max(G.bestMult || 1, m); Audio.sfx('ding', 0.35, 1 + m * 0.12); } }
function addScore(pts) { G.score += pts * G.mult; }
function breakCombo() { G.combo = 0; G.mult = 1; G.comboT = 0; }
const power = (id) => G.powers.find((p) => p.id === id);
function loseTip(frac, text) { const before = G.tip; G.tip = Math.max(0, Math.round((G.tip - G.def.tip * frac) * 100) / 100); if (G.tip < before && text) UI.dm(text, { tone: 'angry' }); }
window.__G = G; G.LANES = LANES; window.__camera = camera; window.__THREE = THREE; // debug / QA hook
window.__regen = (seed, order = G.order) => buildLevel(null, G.route, { order, seed, cross: G.streetInfo.cross, rail: G.rail, storm: G.def.storm });
window.__frameMs = () => ({ ms: Math.round(frameMs), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, q: quality });

const sky = { tex: null, env: null };
async function initSky() { // Poly Haven pure-sky panoramas (CC0): partly cloudy, and overcast for storm orders
  const pm = new THREE.PMREMGenerator(renderer);
  for (const [k, file] of [['clear', 'tex/sky.jpg'], ['storm', 'tex/sky_storm.jpg']]) {
    const t = await loadTex(file, { repeat: false });
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    sky[k] = { tex: t, env: pm.fromEquirectangular(t).texture };
  }
  pm.dispose();
  scene.background = sky.clear.tex; scene.environment = sky.clear.env; scene.backgroundIntensity = 1; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0xc4d2de, 170, 750);
}

// ---------------------------------------------------------------- world build per order
let cityData = null, routes = null;
async function buildWorld(n) {
  G.def = orderDef(n);
  if (G.world) { scene.remove(G.world); G.world.traverse((o) => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose?.(); }); }
  const world = new THREE.Group(); scene.add(world); G.world = world;
  const route = new Route(routes[G.def.route]); G.route = route;
  const end = route.world(route.length);
  City.ground(world, end);
  await City.buildings(world, cityData);
  G.streetInfo = City.streets(world, cityData, route);
  const skip = [];
  G.rail = G.def.route === 'sunrail' ? City.sunrail(world, cityData, route) : null;
  if (G.rail) skip.push([G.rail.s - 30, G.rail.s + 30]);
  if (G.def.route === 'orange') City.starbucks(world, route, 4, 1);
  await City.dressing(world, route, G.streetInfo, skip);
  G.citi = await citiTower(world);
  G.seed = URLQ.has('seed') ? Number(URLQ.get('seed')) : QA ? n : Math.floor(Math.random() * 1e9);
  G.lv = await buildLevel(world, route, { order: n, seed: G.seed, cross: G.streetInfo.cross, rail: G.rail, storm: G.def.storm });
  G.pop = await populate(world, route, G.lv);
  if (!G.R) { G.R = await rider(); }
  world.add(G.R.root);
  setWeather(G.def.storm);
  resetRun();
}
function setWeather(storm) {
  const k = storm ? sky.storm : sky.clear; scene.background = k.tex; scene.environment = k.env;
  scene.backgroundIntensity = storm ? 0.8 : 1; scene.environmentIntensity = storm ? 0.4 : 0.55;
  sun.intensity = storm ? 0.5 : 2.8; hemi.intensity = storm ? 1.0 : 1.7;
  scene.fog.color.set(storm ? 0x8a929a : 0xc4d2de); scene.fog.near = storm ? 40 : 160; scene.fog.far = storm ? 320 : 700;
  rain.visible = storm;
}
// rain: streaks around the camera
const RN = 900, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RN * 6);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xd6dee8, transparent: true, opacity: 0.55 }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const rainSeed = (() => { const r = mulberry(9); return Array.from({ length: RN }, () => [r(), r(), r()]); })();
function updateRain(t) {
  if (!rain.visible) return;
  const c = camera.position;
  for (let i = 0; i < RN; i++) { const [a, b, d] = rainSeed[i]; const px = c.x - 9 + a * 18, pz = c.z - 9 + b * 18, py = c.y - 4 + (((d * 14 - t * 22) % 14) + 14) % 14; rainPos.set([px, py, pz, px + 0.02, py + 0.6, pz], i * 6); }
  rainGeo.attributes.position.needsUpdate = true;
}

function resetRun(atS = 0) {
  G.s = atS; G.lat = 0; G.lane = 1; G.y = 0; G.vy = 0; G.v = 0; G.runT = 0; G.boostT = 0; G.slowT = 0; G.invT = 0; G.crashT = 0; G.slowmo = 1; G.cine = 0; G.camK = 0; G.airKind = null; G.qte = null; G.trick = null; G.trickGrade = null; G.qteAt = null; UI.remove('qte'); UI.remove('combo'); G.akira = null; G.akK = 0;
  if (atS === 0) {
    G.base = Math.min(18.5, 13.2 + (G.order - 1) * 0.9);
    G.eta = Math.round(G.route.length / (G.base * 0.9) + 10); G.etaTotal = G.eta; G.time = 0; G.ice = 100; G.crashes = 0; G.nearMiss = 0; G.boostCharge = 0.34; G.tip = G.def.tip; G.dmDone = new Set();
    G.score = 0; G.mult = 1; G.combo = 0; G.comboT = 0; G.coins = 0; G.powers = []; G.lateT = 0; G.tricks = 0; G.smashes = 0; G.bestMult = 1; G.fin = {};
    const rr = mulberry(G.seed * 13 + 5); G.rideTexts = K.RIDE_TEXTS.map(([p, a]) => [p, K.pickLine(a, rr)]);
    for (const o of G.lv.obs) { o.dead = false; o.s0 ??= o.s; o.s = o.s0; o.lat0 ??= o.lat; o.lat = o.lat0; o.passed = false; o.t0 = null; o.mt = null; o.on = false; }
    for (const ic of G.lv.ice) ic.got = false;
    for (const c of G.lv.coins) { c.got = false; c.s0 ??= c.s; c.lat0 ??= c.lat; c.y0 ??= c.y; c.s = c.s0; c.lat = c.lat0; c.y = c.y0; }
    for (const p of G.lv.pickups) p.got = false;
    for (const w of G.pop.walkers) { w.t = null; w.gone = false; w.stopped = false; }
    G.trainCab = null; G.trainGone = false;
  }
  const R = G.R; R.C.root.rotation.set(0, 0, 0); R.bike.rotation.set(0, 0, 0); R.root.visible = true;
}

// ---------------------------------------------------------------- input: swipes, taps, keys
const input = { x0: 0, y0: 0, t0: 0, active: false };
function onSwipe(dir) {
  if (G.state !== 'run') return;
  if (G.akira && !G.akira.res) { akiraPress(dir); return; }
  if (G.qte) { qtePress(dir); return; }
  if (dir === 'L') G.lane = Math.max(0, G.lane - 1), Audio.sfx('whoosh', 0.35, 1.6);
  if (dir === 'R') G.lane = Math.min(2, G.lane + 1), Audio.sfx('whoosh', 0.35, 1.6);
  if (dir === 'U' && G.y <= 0.02) { G.vy = 7.8; Audio.sfx('pop', 0.6, 0.7); }
  if (dir === 'D') useBoost();
  G.hintT = 0; G.swiped = true; G.coachSlow = 0; UI.coach(null);
}
canvas.parentElement.addEventListener('pointerdown', (e) => { Audio.unlock(); if (e.pointerType === 'mouse') return; input.active = true; input.x0 = e.clientX; input.y0 = e.clientY; input.t0 = performance.now(); input.fired = false; }, { passive: true });
canvas.parentElement.addEventListener('pointermove', (e) => {
  if (!input.active || input.fired) return;
  const dx = e.clientX - input.x0, dy = e.clientY - input.y0, th = Math.max(26, Math.min(window.innerWidth, 500) * 0.06);
  if (Math.hypot(dx, dy) > th) { input.fired = true; onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D')); }
}, { passive: true });
canvas.parentElement.addEventListener('pointerup', (e) => {
  if (!input.active) return; input.active = false;
  if (!input.fired && performance.now() - input.t0 < 260 && G.state === 'run' && e.target === canvas) onSwipe(e.clientX < window.innerWidth / 2 ? 'L' : 'R'); // tap left/right half
}, { passive: true });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.repeat && G.state !== 'order') return;
  if (G.state === 'title' && (k === 'enter' || k === ' ')) { e.preventDefault(); document.getElementById('play')?.click(); return; }
  if (G.state === 'crashed' && k === 'enter') { document.getElementById('watchad')?.click(); return; }
  if (G.state === 'crashed' && k === 'r') { document.getElementById('rs')?.click(); return; }
  if (G.state === 'results' && k === 'enter') { document.getElementById('next')?.click(); return; }
  if (k === 'm') { Audio.unlock(); Audio.setMuted(!Audio.muted); UI.toast(Audio.muted ? 'Sound off' : 'Sound on', 900); return; }
  if ((k === 'escape' || k === 'p') && (G.state === 'run' || G.state === 'paused')) { G.state === 'run' ? pause() : resume(); return; }
  if (G.state === 'paused') { if (k === 'r') { resume(); startOrder(true); } return; }
  if (G.state === 'finale' && (k === 'enter' || k === ' ' || k === 'escape')) { e.preventDefault(); finale?.skip(); return; }
  if (G.state === 'run' && G.akira && !G.akira.res) { if (akiraPress(k)) { e.preventDefault(); return; } }
  if (G.state === 'run' && G.qte) { if (qtePress(k)) { e.preventDefault(); return; } }
  if (['arrowleft', 'a'].includes(k)) onSwipe('L'); else if (['arrowright', 'd'].includes(k)) onSwipe('R');
  else if (['arrowup', 'w', ' '].includes(k)) onSwipe('U'); else if (['arrowdown', 's', 'shift'].includes(k)) onSwipe('D');
  if (G.state !== 'run' && k === ' ') e.preventDefault();
});
// pause: Esc / P, and automatically when the window loses focus mid-run
function pause() {
  if (G.state !== 'run') return;
  G.state = 'paused'; Audio.music(null);
  UI.pauseMenu({ onResume: resume, onRestart: () => { resume(); startOrder(true); }, onQuit: () => { UI.clear(); hud = null; G.state = 'title'; showTitle(); } });
}
function resume() { if (G.state !== 'paused') return; UI.remove('pause'); G.state = 'run'; Audio.music('full'); }
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function useBoost() { if (G.boostCharge >= 1 && G.state === 'run') { G.boostCharge = 0; startBoost('BOOST!'); } }
function startBoost(label, dur = 2.2) { G.boostT = dur; UI.pop(label, '2× speed'); Audio.sfx('boom', 0.6); Audio.sfx('whoosh', 0.9, 0.8); navigator.vibrate?.(30); }

const POWERS = { magnet: { icon: '🧲', dur: 8, name: 'MAGNET', sub: 'coins come to you' }, shield: { icon: '🪖', dur: 30, name: 'HELMET', sub: 'blocks one crash' }, cool: { icon: '❄️', dur: 10, name: 'COOLER BAG', sub: 'ice stops melting' }, x2: { icon: '✖2', dur: 10, name: 'DOUBLE COINS', sub: '2× tip coins' } };
function followSpeed(o) {
  let gap = 1e9;
  for (const q of G.lv.obs) if (q !== o && !q.dead && q.s > o.s && Math.abs(q.lat - o.lat) < (q.w + o.w) / 2 + 0.2) gap = Math.min(gap, q.s - q.len / 2 - (o.s + o.len / 2));
  for (const q of G.lv.ramps) if (q.s > o.s && Math.abs(q.lat - o.lat) < 2) gap = Math.min(gap, q.s - (q.len ?? 3.4) / 2 - (o.s + o.len / 2));
  return Math.min(o.v, Math.max(0, (gap - 1.5) * 1.6));
}
function grabPower(p) {
  p.got = true; const d = POWERS[p.kind];
  G.powers = G.powers.filter((w) => w.id !== p.kind); G.powers.push({ id: p.kind, t: d.dur, dur: d.dur, icon: d.icon });
  addScore(50); addCombo(2); UI.pop(d.name, d.sub); Audio.sfx('jingle', 0.6, 1.3); Audio.sfx('ding', 0.5, 1.5);
}
// ---------------------------------------------------------------- the Akira slide into Citi Tower's front spot
function startAkira() {
  const first = !TUT.akira; if (first) { TUT.akira = 1; store.set('tut', TUT); }
  const pool = ['arrowleft', 'arrowdown', 'arrowright', 'arrowup'], rr = QA ? mulberry(G.seed + 3) : Math.random;
  const seq = ['arrowdown']; for (let k = 1; k < (first ? 3 : 4); k++) { let n; do n = pool[Math.floor(rr() * 4)]; while (n === seq[k - 1]); seq.push(n); }
  G.akira = { seq, idx: 0, t: 0, dur: first ? 4.2 : 3.0, res: null, ui: UI.combo({ seq, label: first ? 'A TOURIST STEPS OUT — <b>SLIDE IN!</b><br><small style="font-size:16px">press the keys in order, fast</small>' : 'TOURIST! <b>SLIDE IN!</b>' }) };
  const st = G.pop.stepper; if (st) { st.t = 0; st.c.root.visible = true; }
  Audio.sfx('skid', 1, 0.8); Audio.rate(0.7); UI.coach(null);
}
function updateAkira(dt) {
  const a = G.akira; a.t += dt; a.ui.set(a.idx, 1 - a.t / a.dur);
  if (a.t >= a.dur) resolveAkira('fail', 'too slow');
}
function akiraPress(k) {
  k = QALIAS[k] || k; if (!QKEYS.includes(k)) return false;
  const a = G.akira;
  if (k === a.seq[a.idx]) { a.idx++; Audio.sfx('pop', 0.8, 1 + a.idx * 0.15); if (a.idx >= a.seq.length) resolveAkira('ok'); }
  else resolveAkira('fail', 'wrong key');
  return true;
}
function resolveAkira(res, why = '') {
  const a = G.akira; a.res = res; a.resT = G.time; a.ui.result(res === 'ok', res === 'ok' ? '' : why);
  if (res === 'ok') { G.score += 1500; Audio.sfx('skid', 1.2, 0.6); } else { breakCombo(); Audio.sfx('bwomp', 0.7); }
  G.fin = { ...(G.fin || {}), akira: res === 'ok' ? 'NAILED' : 'WIPEOUT', akiraT: res === 'ok' ? 0 : 6 };
}
// ---------------------------------------------------------------- quick-time tricks on big jumps
const QKEYS = ['arrowup', 'arrowleft', 'arrowright', 'arrowdown'];
const QALIAS = { w: 'arrowup', a: 'arrowleft', d: 'arrowright', s: 'arrowdown', ' ': 'arrowup', shift: 'arrowdown', U: 'arrowup', L: 'arrowleft', R: 'arrowright', D: 'arrowdown' };
const TRICKS = { arrowup: ['BACKFLIP', 'flip'], arrowleft: ['TAIL WHIP', 'whip'], arrowright: ['TAIL WHIP', 'whip'], arrowdown: ['NO-HANDER', 'nohand'] };
function startQTE(kind) {
  const key = QKEYS[Math.floor((QA ? G.s * 7 : Math.random() * 4)) % 4];
  const first = !TUT.qte; if (first) { TUT.qte = 1; store.set('tut', TUT); }
  G.qte = { kind, key, t: 0, dur: first ? 1.6 : 1.25, ui: UI.qte({ key, label: first ? 'press it when the ring turns <span style="color:var(--gobbl)">GREEN</span>' : kind === 'rail' ? 'TRICK OVER THE TRACKS!' : 'TRICK OVER THE BUS!' }) };
  Audio.rate(0.7); Audio.sfx('whoosh', 0.8, 0.5); UI.coach(null);
}
function updateQTE(dt) { const q = G.qte; q.t += dt; q.ui.set(1 - q.t / q.dur); if (q.t >= q.dur) endQTE('MISS', 'too slow'); }
function qtePress(k) {
  k = QALIAS[k] || k; if (!QKEYS.includes(k)) return false;
  const q = G.qte, u = 1 - q.t / q.dur;
  if (k !== q.key) endQTE('MISS', 'wrong key'); else if (u > 0.6) endQTE('MISS', 'too early'); else endQTE(u < 0.28 ? 'PERFECT' : 'GOOD');
  return true;
}
function endQTE(grade, why = '') {
  const q = G.qte; G.qte = null; G.trickGrade = grade;
  if (grade === 'MISS') { q.ui.result('MISS', why); breakCombo(); Audio.sfx('bwomp', 0.6, 1.2); return; }
  const [name, kind] = TRICKS[q.key], pts = grade === 'PERFECT' ? 500 : 250;
  const tLand = (G.vy + Math.sqrt(Math.max(0, G.vy * G.vy + 48 * G.y))) / 24;
  G.trick = { name, kind, t: 0, dur: Math.max(0.3, Math.min(0.7, tLand * 0.85)) };
  addScore(pts); addCombo(grade === 'PERFECT' ? 8 : 5); G.tricks++;
  if (grade === 'PERFECT') G.boostCharge = 1;
  q.ui.result(grade, `${name} +${pts * G.mult}`); Audio.sfx('ding', 0.9, grade === 'PERFECT' ? 1.5 : 1.2); Audio.sfx('boom', 0.4, 1.4);
}
function land() {
  const g = G.trickGrade, kind = G.airKind; G.airKind = null; G.trickGrade = null;
  if (G.qte) endQTE('MISS', 'too slow');
  if (G.trick) { G.R.bike.rotation.y = 0; G.trick = null; }
  if (g && g !== 'MISS') { addScore(100); UI.pop('LANDED!', kind === 'rail' ? 'cleared the SunRail' : 'cleared the LYNX'); }
  else { G.slowT = 0.9; G.shake = 0.35; UI.pop('SKETCHY LANDING', 'combo lost'); Audio.sfx('crash', 0.4, 1.3); }
  G.shake = Math.max(G.shake || 0, 0.25); navigator.vibrate?.(25);
}
// ---------------------------------------------------------------- run update
const tmp = V(), tmp2 = V(), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), UP = V(0, 1, 0), ONE = V(1, 1, 1);
const TUT = store.get('tut', {});
const COACH = {
  dodge: { text: TOUCH_EARLY() ? 'Swipe ⟵ ⟶ to switch lanes' : 'Press <b>←</b> <b>→</b> to switch lanes', slow: true },
  jump: { text: TOUCH_EARLY() ? 'Swipe ↑ to jump the cones' : 'Press <b>↑</b> or <b>Space</b> to jump the cones', slow: true },
  pad: { text: 'Ride over <b>green pads</b> for a speed boost' },
  ramp: { text: 'Hit the <b>ramp</b> to launch over traffic' },
  boost: { text: TOUCH_EARLY() ? 'BOOST is charged · tap the button' : 'BOOST is charged · press <b>Shift</b>' },
  tourists: { text: 'Tourists stopping for photos. <b>Take the open lane.</b>' },
  merge: { text: '<b>Blinker</b> = that car is cutting over. Take the lane it leaves.', slow: true },
  chicane: { text: 'Too tall to jump · <b>weave</b> through the barriers', slow: true },
  wall: { text: 'Road closed · <b>jump</b> it, then dodge', slow: true },
  mega: { text: '<b>MEGA RAMP</b> over the bus · get in the <b>middle lane</b>' },
};
function coach(key) {
  if (TUT[key] || G.coachT > 0) return;
  TUT[key] = 1; store.set('tut', TUT);
  UI.coach(COACH[key].text); G.coachT = 2.2;
  if (COACH[key].slow) { G.coachSlow = 1.1; }
}
function tutorial() {
  if (G.airKind || G.qte || G.y > 0.3) return; // never on top of a jump or a trick prompt
  const LN = LANES[G.lane];
  const ahead = (pred, d) => G.lv.obs.some((o) => !o.dead && pred(o) && o.s - G.s > 0 && o.s - G.s < d && Math.abs(o.lat - LN) < 1.4);
  const near = (pred, d) => G.lv.obs.some((o) => !o.dead && pred(o) && o.s - G.s > 0 && o.s - G.s < d);
  if (!TUT.mega && near((o) => o.parked, 75)) coach('mega');
  else if (!TUT.merge && TUT.dodge && near((o) => o.merge && o.mt == null, 40)) coach('merge');
  else if (!TUT.chicane && TUT.dodge && near((o) => o.kind === 'jersey', 30)) coach('chicane');
  else if (!TUT.wall && TUT.jump && near((o) => o.wall, 22)) coach('wall');
  else if (!TUT.dodge && ahead((o) => o.h > 1.0, 32)) coach('dodge');
  else if (!TUT.jump && ahead((o) => o.h <= 1.0, 24)) coach('jump');
  else if (!TUT.pad && G.lv.pads.some((p) => p.s - G.s > 0 && p.s - G.s < 34)) coach('pad');
  else if (!TUT.ramp && G.lv.ramps.some((p) => p.s - G.s > 0 && p.s - G.s < 34)) coach('ramp');
  else if (!TUT.tourists && G.pop.walkers.some((w) => w.s - G.s > 0 && w.s - G.s < 40)) coach('tourists');
  else if (!TUT.boost && G.boostCharge >= 1) coach('boost');
}
function rampHeight(s, lat) {
  let best = 0;
  for (const r of G.lv.ramps) { const len = r.len ?? 3.4, ds = s - (r.s - len / 2); if (ds >= 0 && ds <= len && Math.abs(lat - r.lat) < 1.15) best = Math.max(best, (r.h ?? 1.1) * ds / len); }
  return best;
}
function update(dt, t) {
  const R = G.R, route = G.route, L = route.length;
  G.coachT = Math.max(0, (G.coachT || 0) - dt);
  if (G.coachSlow > 0) G.coachSlow -= dt;
  tutorial();
  G.coachK = damp(G.coachK ?? 1, G.coachSlow > 0 ? 0.45 : 1, 6, dt); // tutorial slow-mo eases in and out
  const sdt = dt * G.slowmo * G.coachK;
  G.time += dt; G.eta -= dt;
  if (!power('cool')) G.ice = Math.max(0, G.ice - sdt * (G.def.storm ? 0.9 : 1.15));
  for (const p of G.powers) p.t -= sdt;
  G.powers = G.powers.filter((p) => p.t > 0);
  if (G.comboT > 0) { G.comboT -= sdt; if (G.comboT <= 0 && G.mult > 1) { G.mult--; G.combo = (G.mult - 1) * MULT_STEP; G.comboT = 2.5; } }
  // Kyle watches the map: late → he starts docking the tip
  if (G.eta < 0) { G.lateT += dt; if (G.lateT > 6) { G.lateT = 0; loseTip(0.1, K.pickLine(K.LATE_TEXTS)); Audio.sfx('bwomp', 0.4, 1.3); } }
  if (!G.dmDone.has('fast') && G.s / G.route.length > 0.5 && G.eta > G.etaTotal * 0.55) { G.dmDone.add('fast'); UI.dm(K.pickLine(K.FAST_TEXTS)); }
  // speed
  G.boostT = Math.max(0, G.boostT - sdt); G.slowT = Math.max(0, G.slowT - sdt); G.invT = Math.max(0, G.invT - sdt);
  const target = G.base * (G.boostT > 0 ? 1.75 : 1) * (G.slowT > 0 ? 0.6 : 1) * smooth(seg(G.runT, 0, 1.2));
  G.runT += sdt;
  G.v = damp(G.v, target, G.boostT > 0 ? 6 : 2.5, sdt);
  const prevS = G.s;
  G.s = Math.min(L, G.s + G.v * sdt); G.dist += G.v * sdt; G.score += G.v * sdt;
  // lanes + jump + ramps
  const tl = LANES[G.lane]; const prevLat = G.lat; G.lat = damp(G.lat, tl, 13, sdt); const latV = (G.lat - prevLat) / Math.max(1e-4, sdt);
  const rh = rampHeight(G.s, G.lat);
  G.vy -= 24 * sdt; G.y += G.vy * sdt;
  // ramps: launch when the bike crosses the lip in the ramp's lane (frame-rate and speed independent)
  const rr = G.lv.ramps.find((r) => { const lip = r.s + (r.len ?? 3.4) / 2; return prevS < lip && G.s >= lip && Math.abs(G.lat - r.lat) < 1.15 && G.y < (r.h ?? 1.1) + 0.25; });
  if (rr) {
    G.vy = rr.mega ? 13.5 : 9.2; G.y = Math.max(G.y, rr.h ?? 1.1); Audio.sfx('whoosh', 1, 0.7);
    if (rr.mega) { G.v = Math.max(G.v, G.base * 1.15); G.slowT = 0; }
    if (rr.rail || rr.mega) { G.airKind = rr.rail ? 'rail' : 'mega'; G.qteAt = G.time + 0.1; Audio.sfx('boom', 0.6, 0.6); }
    else { addScore(40); addCombo(2); UI.pop('AIR TIME!', `+${40 * G.mult}`); }
  } else if (G.y <= rh) {
    if (G.vy < -6) Audio.sfx('step', 1.2, 0.6);
    if (G.airKind && G.vy < 0) land();
    G.y = rh; G.vy = Math.max(0, G.vy);
  }
  G.onRamp = rh > 0; G.lastRh = rh;
  // quick-time trick: slow-mo while the prompt is up, then ease back to full speed
  if (G.qteAt != null && G.time >= G.qteAt) { G.qteAt = null; startQTE(G.airKind); }
  if (G.akira && !G.akira.res) G.slowmo = damp(G.slowmo, 0.12, 10, dt);
  else if (G.qte) { G.slowmo = damp(G.slowmo, 0.26, 14, dt); updateQTE(dt); }
  else if (G.slowmo < 1) { G.slowmo = damp(G.slowmo, 1, 5, dt); if (G.slowmo > 0.98) { G.slowmo = 1; Audio.rate(1); } }
  G.camK = damp(G.camK, G.airKind && (G.y > 0.25 || G.qte || G.qteAt != null) ? 1 : 0, G.airKind ? 3 : 1.8, dt);
  // pads, ice, puddles
  for (const p of G.lv.pads) if (!p.hitAt || G.time - p.hitAt > 3) { if (Math.abs(G.s - p.s) < 2.5 && Math.abs(G.lat - p.lat) < 1.1 && G.y < 0.3) { p.hitAt = G.time; const perfect = Math.abs(G.lat - p.lat) < 0.45; startBoost(perfect ? 'PERFECT PAD!' : 'BOOST PAD!', perfect ? 3.0 : 2.2); if (perfect) { addScore(100); addCombo(3); } } }
  // tip coins (magnet pulls them in)
  const mag = power('magnet'), x2 = power('x2');
  for (const c of G.lv.coins) {
    if (c.got) continue;
    const ds = c.s - G.s;
    if (ds < -2 || ds > 14) continue;
    if (mag && ds < 12) { const k = 1 - Math.exp(-7 * sdt); c.lat += (G.lat - c.lat) * k; c.y += (G.y + 1 - c.y) * k; c.s += (G.s + 0.5 - c.s) * k * 0.6; }
    if (Math.abs(ds) < 1.0 && Math.abs(G.lat - c.lat) < 0.95 && Math.abs(G.y + 0.9 - c.y) < 1.1) {
      c.got = true; const n = x2 ? 2 : 1; G.coins += n; addScore(10 * n); addCombo(1);
      Audio.sfx('ice', 0.45, 1.5 + Math.min(0.8, G.mult * 0.1) + (G.coins % 4) * 0.05);
      route.world(c.s, c.lat, c.y, tmp); tmp.project(camera);
      if (hud && G.time - (G.lastFly || 0) > 0.04) { G.lastFly = G.time; UI.coinFly((tmp.x + 1) / 2 * innerWidth, (1 - tmp.y) / 2 * innerHeight, hud.coinTarget()); }
    }
  }
  // power-ups
  for (const p of G.lv.pickups) if (!p.got && Math.abs(G.s - p.s) < 1.4 && Math.abs(G.lat - p.lat) < 1.2 && G.y < 2.2) grabPower(p);
  for (const ic of G.lv.ice) if (!ic.got && Math.abs(G.s - ic.s) < 1.0 && Math.abs(G.lat - ic.lat) < 0.9 && Math.abs(G.y + 0.9 - ic.y) < 1.0) { ic.got = true; G.ice = Math.min(100, G.ice + 6); G.boostCharge = Math.min(1, G.boostCharge + 0.06); Audio.sfx('ice', 0.7, 1 + Math.random() * 0.2); }
  for (const p of G.lv.puddles) if (Math.abs(G.s - p.s) < 1.4 && Math.abs(G.lat - p.lat) < 1.2 && G.y < 0.2 && G.slowT <= 0) { G.slowT = 0.8; Audio.sfx('splash', 0.8); UI.pop('SPLASH', 'slowed down'); }
  // obstacles: moving traffic, buses pulling out, tourists crossing, the train
  for (const o of G.lv.obs) {
    if (o.dead) continue;
    if (o.v && o.kind !== 'bus') { // traffic waits until you're close, then drives — and brakes for anything ahead in its lane
      if (!o.on && o.s - G.s < (o.act ?? PHYS.ACT)) o.on = true;
      if (o.on) { o.s += followSpeed(o) * sdt; if (o.s > L - 40) o.dead = true; }
    }
    if (o.merge) { // blinker on from far away; it cuts over with a fixed reaction window regardless of speed
      if (o.mt == null && o.s - G.s > 0 && o.s - G.s < (G.v - o.v) * 1.9 + 6) { o.mt = 0; Audio.sfx('skid', 0.25, 1.5); }
      if (o.mt != null) { o.mt += sdt; o.lat = lerp(o.lat0, o.to, smooth(seg(o.mt, 0, 1.0))); }
    }
    if (o.kind === 'bus') { if (o.s - G.s < 42 && !o.t0) o.t0 = G.time; if (o.t0) { o.lat = lerp(o.lat0, o.pull, smooth(seg(G.time - o.t0, 0, 1.4))); o.s += followSpeed(o) * sdt; if (o.s > L - 40) o.dead = true; } }
  }
  for (const w of G.pop.walkers) {
    if (w.t == null && w.s - G.s < 130) w.t = 0;
    if (w.t != null) w.t += sdt;
    const k = w.t == null ? 0 : Math.max(0, w.t - w.delay);
    const reach = Math.abs(w.target - w.lat0);
    w.lat = w.gone ? 40 : w.lat0 + w.dir * Math.min(reach, w.speed * k); w.stopped = w.speed * k >= reach;
  }
  if (G.rail) { // the SunRail is scripted to the player: its cab reaches the road just after you clear the tracks
    const rs = G.rail.s;
    if (G.trainCab == null && G.s > rs - 75) G.trainCab = (rs + 8 - G.s) * 1.6;
    if (G.trainCab != null) G.trainCab = G.s < rs + 8 && !G.trainGone ? Math.min(G.trainCab, (rs + 8 - G.s) * 1.6) : G.trainCab - 24 * sdt;
  }
  // collisions (route space)
  if (G.invT <= 0) {
    const hit = (o, len, w, h) => Math.abs(o.s - G.s) < len / 2 + 0.7 && Math.abs(o.lat - G.lat) < w / 2 + 0.32 && G.y < h - 0.08;
    for (const o of G.lv.obs) {
      if (o.dead) continue;
      if (hit(o, o.len, o.w, o.h)) {
        if (G.boostT > 0 && (o.kind === 'cone' || o.kind === 'barrier')) { o.dead = true; G.smashes++; addScore(25); addCombo(2); G.boostT = Math.min(3.5, G.boostT + 0.4); UI.pop('SMASH!', `+${25 * G.mult} · boost +`); Audio.sfx('crash', 0.5, 1.6); continue; }
        const sh = power('shield'); if (sh) { sh.t = 0; o.dead = true; G.invT = 1.2; G.shake = 0.4; UI.pop('SHIELD!', 'helmet saved you'); Audio.sfx('crash', 0.7, 1.2); continue; }
        return crash(o.kind);
      }
      if (!o.passed && o.s < G.s - o.len / 2 - 0.7) { o.passed = true; const dl = Math.abs(o.lat - G.lat); if ((o.kind === 'car' || o.kind === 'bus') && !o.parked && dl < 3.0) { G.nearMiss++; G.boostCharge = Math.min(1, G.boostCharge + 0.34); addScore(50); addCombo(4); if (G.boostT > 0) G.boostT = Math.min(3.5, G.boostT + 0.6); UI.pop('NEAR MISS', `+${50 * G.mult}${G.boostT > 0 ? ' · boost extended' : ' · +boost'}`); Audio.sfx('whoosh', 0.9, 1.2); } }
    }
    for (const w of G.pop.walkers) if (Math.abs(w.s - G.s) < 0.9 && Math.abs(w.lat - G.lat) < 0.6 && G.y < 1.5) return crash('tourist');
    if (G.rail && G.trainCab != null && G.trainCab < 1.6 && G.trainCab > -78 && Math.abs(G.s - G.rail.s) < 2.2 && G.y < 4.8) return crash('train');
  }
  // DMs + places
  const prog = G.s / L;
  for (const [p, text] of G.rideTexts) if (prog > p && !G.dmDone.has(p)) { G.dmDone.add(p); UI.dm(text); Audio.sfx('pop', 0.7); }
  if (G.rail && G.s > G.rail.s - 120 && !G.dmDone.has('railtxt')) { G.dmDone.add('railtxt'); UI.thought(K.pickLine(K.THOUGHTS.rail)); }
  if (G.def.storm && prog > 0.16 && !G.dmDone.has('storm')) { G.dmDone.add('storm'); UI.dm(K.pickLine(K.STORM_TEXTS)); }
  for (const st of route.streets) if (G.s > st.s0 + 2 && !G.dmDone.has(st.name)) { G.dmDone.add(st.name); UI.place(st.name, 'Downtown Orlando'); }
  if (G.rail && G.s > G.rail.s - 60 && !G.dmDone.has('station')) { G.dmDone.add('station'); UI.place('Church Street Station', 'SunRail · since 1889', 3000); Audio.sfx('bell', 0.8); }
  // Citi Tower: heads-up, then a tourist steps out in front of the spot → the Akira slide
  if (G.s > L - 125 && !G.dmDone.has('park')) { G.dmDone.add('park'); UI.dm('📍 Citi Tower is right up ahead — get ready to park!', { who: 'gobbl', tone: 'sys', ttl: 4200 }); UI.thought('there it is. floor 20. time to park in style.'); Audio.sfx('ding', 0.7); }
  if (G.s > L - 34 && !G.akira) startAkira();
  if (G.akira && !G.akira.res) { updateAkira(dt); if (G.state !== 'run') return; }
  if (G.akira?.res && G.time - G.akira.resT > 0.35) return arrive();
  if (G.s >= L - 0.5) { if (!G.akira) G.akira = { res: 'ok', resT: G.time, seq: [] }; return arrive(); }
  // rider pose
  const f = route.at(G.s);
  R.root.position.copy(route.world(G.s, G.lat, G.y));
  R.root.rotation.set(0, f.yaw, 0);
  const curve = route.curve(G.s);
  let tr = null;
  if (G.trick) { G.trick.t += sdt; tr = G.trick; const e = easeInOut(clamp(tr.t / tr.dur)); tr.e = e;
    if (tr.kind === 'flip') { const ang = -e * Math.PI * 2, piv = V(0, 0.95, 0), rot = piv.clone().applyAxisAngle(V(1, 0, 0), ang); R.root.rotateX(ang); R.root.position.add(piv.sub(rot).applyAxisAngle(UP, f.yaw)); }
    if (tr.kind === 'whip') R.bike.rotation.y = e * Math.PI * 2;
    if (tr.t >= tr.dur && tr.kind !== 'nohand') { R.bike.rotation.y = 0; G.trick = null; } }
  const nh = tr && tr.kind === 'nohand' ? Math.sin(Math.PI * clamp(tr.e)) : 0;
  R.ride(G.dist, { lean: 0.42 + (G.boostT > 0 ? 0.12 : 0) - nh * 0.5, bank: clamp(-latV * 0.05 - curve * G.v * G.v * 0.012, -0.45, 0.45), stand: G.y > 0.3 ? 0.6 + nh * 0.4 : 0, look: G.y > 0.3 ? 0.15 + nh * 0.3 : 0 });
  R.root.visible = G.invT <= 0 || Math.floor(G.invT * 12) % 2 === 0;
}
function crash(kind) {
  G.state = 'crashing'; G.crashT = 0; G.crashes++; G.crashAt = G.s; G.crashKind = kind; breakCombo(); G.powers = []; if (G.qte) { G.qte.ui.remove(); G.qte = null; } G.qteAt = null; G.airKind = null; G.trick = null; G.R.bike.rotation.y = 0; G.slowmo = 1; Audio.rate(1);
  Audio.sfx('crash', 1); Audio.sfx('skid', 0.8); Audio.music(null); Audio.sfx('scratch', 0.9);
  navigator.vibrate?.([60, 40, 60]);
}
function updateCrash(dt) {
  G.crashT += dt;
  const R = G.R, u = clamp(G.crashT / 0.6);
  R.bike.rotation.set(-0.35 * Math.sin(Math.PI * Math.min(1, G.crashT / 0.35)), 0, smooth(clamp((G.crashT - 0.1) / 0.45)) * 1.4);
  const uu = easeOut(u), fwd = uu * 3.8, y = (0.85 + 1.6 * 4 * u * (1 - u)) * (1 - u) + 0.12 * u;
  R.walk('falling', 0.3 + G.crashT * 1.4, { offset: V(0, y, 0.2 + fwd), yaw: 0 });
  R.C.root.rotation.x = uu * Math.PI * 2.5;
  if (G.crashT > 1.0 && G.state === 'crashing') {
    G.state = 'crashed';
    UI.crash({ tip: G.tip, onAd: () => { UI.remove('crash'); G.state = 'ad'; Audio.sfx('jingle', 0.9); UI.ad({ seconds: 4, onDone: continueRun }); }, onRestart: () => { UI.remove('crash'); startOrder(true); } });
  }
}
function continueRun() {
  // respawn where you crashed; clear what's right ahead; 2 s of invulnerability
  let at = G.crashAt;
  if (G.crashKind === 'train' || (G.rail && Math.abs(at - G.rail.s) < 12)) { at = G.rail.s + 9; G.trainGone = true; }
  for (const o of G.lv.obs) if (o.s > at - 3 && o.s < at + 28) o.dead = true;
  for (const w of G.pop.walkers) if (Math.abs(w.s - at) < 28) w.gone = true;
  const keep = { time: G.time, eta: G.eta, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, boostCharge: G.boostCharge, dist: G.dist, dmDone: G.dmDone, trainCab: G.trainCab, trainGone: G.trainGone, score: G.score, coins: G.coins, lateT: G.lateT, tricks: G.tricks, smashes: G.smashes, bestMult: G.bestMult };
  resetRun(at); Object.assign(G, keep);
  G.invT = 2.0; G.runT = 0.6; G.v = G.base * 0.6;
  G.state = 'run'; Audio.music('full'); loseTip(0.1, K.pickLine(K.CRASH_TEXTS));
  UI.pop('CONTINUE ▶', 'from right here');
}

// ---------------------------------------------------------------- per-frame visuals of the level
function animateLevel(t, dt) {
  const route = G.route, P = G.pop, lv = G.lv;
  if (!P) return;
  P.padTex.offset.y = -(t * 1.8) % 1;
  // cars
  lv.obs.filter((o) => o.kind === 'car').forEach((o, i) => {
    if (o.dead) { m4.makeScale(0, 0, 0); P.cars.set(i, m4); return; }
    const f = route.at(o.s); route.world(o.s, o.lat, 0, tmp); qq.setFromAxisAngle(UP, f.yaw); m4.compose(tmp, qq, ONE); P.cars.set(i, m4);
  });
  P.cars.commit();
  // turn signals on merging cars
  const on = Math.floor(t * 3.2) % 2 === 0;
  P.mergers.forEach((o, i) => {
    const show = on && !o.dead && (o.mt == null || o.mt < 1.0) && o.s - G.s < 90 && o.s - G.s > -10, side = Math.sign(o.to - o.lat0);
    o.arrow.visible = show && o.s - G.s > 4; if (o.arrow.visible) route.world(o.s, o.lat, 2.4, o.arrow.position);
    for (let k = 0; k < 2; k++) { if (show) { route.world(o.s + (k ? 2.2 : -2.25), o.lat + side * 0.92, 0.78, tmp); m4.makeTranslation(tmp.x, tmp.y, tmp.z); } else m4.makeScale(0, 0, 0); P.blink.setMatrixAt(i * 2 + k, m4); }
  });
  P.blink.instanceMatrix.needsUpdate = true;
  // smashed / cleared cones and barriers disappear
  for (const st of P.statics) {
    let dirty = false, idx = 0;
    for (const o of st.list) { const vis = !o.dead; if (o._vis !== vis) { o._vis = vis; dirty = true; o.mats.forEach((m, k) => st.mesh.setMatrixAt(idx + k, vis ? m : m4.makeScale(0, 0, 0))); } idx += o.mats.length; }
    if (dirty) st.mesh.instanceMatrix.needsUpdate = true;
  }
  for (const o of P.buses) { const f = route.at(o.s); route.world(o.s, o.lat, 0, o.mesh.position); o.mesh.rotation.y = f.yaw + (o.t0 ? 0.08 * Math.sin(Math.PI * seg(G.time - o.t0, 0, 1.4)) * Math.sign(o.pull - o.lat0) : 0); o.mesh.visible = !o.dead; }
  // coins spin
  const cm = P.coinMesh; let ci = 0;
  for (const c of lv.coins) {
    if (c.got || c.s < G.s - 6 || c.s > G.s + 160) m4.makeScale(0, 0, 0);
    else { route.world(c.s, c.lat, c.y, tmp); qq.setFromAxisAngle(UP, t * 4 + c.s * 0.3 + route.at(c.s).yaw); m4.compose(tmp, qq, ONE); }
    cm.setMatrixAt(ci++, m4);
  }
  cm.instanceMatrix.needsUpdate = true;
  for (const p of lv.pickups) { p.mesh.visible = !p.got && Math.abs(p.s - G.s) < 170; if (p.mesh.visible) { p.sprite.position.y = 1.2 + Math.sin(t * 3 + p.s) * 0.15; p.mesh.children[1].rotation.y = t; } }
  // ice cubes spin
  lv.ice.forEach((ic, i) => {
    if (ic.got) m4.makeScale(0, 0, 0);
    else { route.world(ic.s, ic.lat, ic.y + Math.sin(t * 3 + i) * 0.08, tmp); qq.setFromEuler(new THREE.Euler(0.5, t * 2 + i, 0.3)); m4.compose(tmp, qq, ONE); }
    P.iceMesh.setMatrixAt(i, m4);
  });
  P.iceMesh.instanceMatrix.needsUpdate = true;
  // tourists
  for (const w of P.walkers) {
    const near = Math.abs(w.s - G.s) < 90 && Math.abs(w.lat) < 20;
    w.c.root.visible = near;
    if (!near) continue;
    const f = route.at(w.s); route.world(w.s, w.lat, 0, w.c.root.position);
    const walking = w.t != null && w.t > w.delay && !w.stopped;
    w.c.root.rotation.y = f.yaw + (walking ? (w.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.PI); // face the way they walk (+lat is the route's right)
    w.c.pose(walking ? [['walk', w.ph + (w.t || 0) * 1.4]] : [['point', 0.5 + (t % 2)]]);
  }
  // the curb-stepping tourist
  const st = P.stepper; if (st && st.t != null) { st.t += dt * G.slowmo; st.lat = Math.max(0.6, st.lat0 - st.t * 1.6); const f = route.at(st.s); route.world(st.s, st.lat, 0, st.c.root.position); st.c.root.rotation.y = f.yaw + (st.lat > 0.62 ? -Math.PI / 2 : Math.PI); st.c.pose(st.lat > 0.62 ? [['walk', st.t * 1.2]] : [['point', 0.6 + st.t]]); }
  // SunRail: gates + train
  if (G.rail) {
    const rail = G.rail, near = G.s > rail.s - 110 && G.s < rail.s + 60;
    for (const gt of rail.gates) { gt.arm.rotation.z = (1 - (near ? 1 : 0)) * Math.PI * 0.45; const ph = Math.floor(t * 2.5) % 2; gt.lamps.forEach((l, i) => l.material.color.set(near && i === ph ? 0xff2a1a : 0x400808)); }
    const tr = rail.train;
    if (G.trainCab != null && G.trainCab > -200) {
      tr.visible = true; // cab (local +z) at trainCab metres up the line from the road, heading south toward it
      tr.position.copy(rail.X).addScaledVector(rail.dir, G.trainCab + 12.7).add(V(0, 0.35, 0)); tr.rotation.y = rail.yaw + Math.PI;
      if (!G.dmDone.has('horn') && G.trainCab < 70) { G.dmDone.add('horn'); Audio.sfx('trainhorn', 1); }
    } else tr.visible = false;
  }
}

const COUNT = 2.4;
function countdownTick() {
  const n = Math.floor(G.introT / (COUNT / 3));
  if (n >= G.countN && n < 3) { UI.countdown(3 - n); Audio.sfx('pop', 0.8, 0.8 + n * 0.15); G.countN = n + 1; }
  if (G.introT >= COUNT) { UI.countdown('GO!'); Audio.sfx('boom', 0.7); Audio.music('full'); G.state = 'run'; G.runT = 0; setTimeout(() => hud?.hint(false), 4200); }
}
// ---------------------------------------------------------------- camera rig
// The camera lives in route space (metres along the street, lane offset, height) so it can never cut a corner
// into a building, and every parameter is eased by a critically damped spring so shots blend instead of snapping.
const CAM = { p: null, v: {} }, CKEYS = ['ds', 'lat', 'y', 'lds', 'llat', 'ly', 'fov'];
const SMOOTH = { ds: 0.22, lat: 0.2, y: 0.28, lds: 0.14, llat: 0.16, ly: 0.18, fov: 0.35 };
function smoothDamp(cur, tgt, k, T, dt) { const o = 2 / T, x = o * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), ch = cur - tgt, t = ((CAM.v[k] || 0) + o * ch) * dt; CAM.v[k] = ((CAM.v[k] || 0) - o * t) * e; return tgt + (ch + t) * e; }
const halfAt = (s) => Math.max(10.4, G.route.street(Math.max(0, Math.min(G.route.length, s))).w) / 2;
function chaseShot() {
  const b = G.boostT > 0 ? 1 : 0, wide = camera.aspect >= 1;
  return { ds: -((wide ? 7.2 : 8.2) + b * 1.4), lat: G.lat * 0.7, y: (wide ? 3.3 : 4.1) + G.y * 0.45, lds: wide ? 9 : 7, llat: G.lat * 0.55, ly: (wide ? 1.4 : 1.0) + G.y * 0.5, fov: baseFov() + b * 12 };
}
function jumpShot() { // big jumps: a low side angle inside the street (SunRail: train side; mega ramp: over the bus)
  const mega = (G.airKind || G.lastAir) === 'mega', side = mega ? -1 : 1, h = halfAt(G.s);
  // mega: from ahead and below, looking back as he sails over the bus; rail: side-on, the train in the background
  return mega ? { ds: 4.5, lat: side * (h - 1.0), y: 1.4 + G.y * 0.7, lds: 0, llat: G.lat, ly: 0.9 + G.y, fov: baseFov() - 4 }
    : { ds: 4.0, lat: side * (h - 0.8), y: 1.8 + G.y * 0.5, lds: 0.3, llat: G.lat, ly: 0.9 + G.y, fov: baseFov() - 2 };
}
function titleShot(t) { // front three-quarter on the rider at the start, drifting gently across the street
  return { ds: 6.2, lat: 2.6 * Math.sin(t * 0.18 + 0.6), y: 1.7 + 0.25 * Math.sin(t * 0.11), lds: 0, llat: 0, ly: 1.15, fov: baseFov() - 4 };
}
const mixShot = (a, b, k) => Object.fromEntries(CKEYS.map((c) => [c, a[c] + (b[c] - a[c]) * k]));
// blend two shots by swinging round the rider (polar around him) instead of cutting a straight line past him
function orbitMix(a, b, k, minR = 5.5) {
  const m = mixShot(a, b, k), c = G.lat;
  const ra = Math.hypot(a.ds, a.lat - c), rb = Math.hypot(b.ds, b.lat - c), ta = Math.atan2(a.lat - c, a.ds), tb = Math.atan2(b.lat - c, b.ds);
  let dt = tb - ta; if (dt > Math.PI) dt -= 2 * Math.PI; if (dt < -Math.PI) dt += 2 * Math.PI;
  const th = ta + dt * k, r = Math.max(minR, ra + (rb - ra) * k);
  m.ds = r * Math.cos(th); m.lat = c + r * Math.sin(th);
  return m;
}
function applyCam(shot, dt, { snap = false, scale = 1, lookScale = scale } = {}) {
  const route = G.route, h = halfAt(G.s + shot.ds);
  // keep the lens inside the street and out of anything solid (raise it over buses, cars and barriers)
  shot.lat = clamp(shot.lat, -h + 0.5, h - 0.5);
  if (G.lv) for (const o of G.lv.obs) if (!o.dead && Math.abs(o.s - (G.s + shot.ds)) < o.len / 2 + 1.2 && Math.abs(o.lat - shot.lat) < o.w / 2 + 0.9) shot.y = Math.max(shot.y, o.h + 1.0);
  if (snap || !CAM.p) { CAM.p = { ...shot }; CAM.v = {}; }
  else for (const k of CKEYS) CAM.p[k] = smoothDamp(CAM.p[k], shot[k], k, SMOOTH[k] * (k[0] === 'l' && k !== 'lat' ? lookScale : scale), dt);
  const p = CAM.p;
  route.world(G.s + p.ds, p.lat, Math.max(0.6, p.y), camera.position);
  route.world(G.s + p.lds, p.llat, p.ly, tmp2);
  if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt); const k = G.shake * 0.35; camera.position.x += Math.sin(T * 41) * k; camera.position.y += Math.sin(T * 33 + 1) * k; camera.position.z += Math.sin(T * 29 + 2) * k; } // smooth rumble, not white noise
  camera.lookAt(tmp2);
  camera.fov = p.fov; camera.updateProjectionMatrix();
  updateShadowCam(G.R.root.position);
}
function runCamera(dt) {
  let shot = chaseShot();
  G.akK = damp(G.akK || 0, G.akira ? 1 : 0, 3, dt);
  if (G.akK > 0.002) { const h = halfAt(G.s); shot = orbitMix(shot, { ds: 7, lat: -(h - 1.2), y: 0.9, lds: 1, llat: G.lat + 0.8, ly: 1.0, fov: baseFov() - 2 }, smooth(clamp(G.akK)), 5); }
  if (G.camK > 0.002) { G.lastAir = G.airKind || G.lastAir; shot = orbitMix(shot, jumpShot(), smooth(clamp(G.camK)), 4.5); }
  applyCam(shot, dt, G.camK > 0.002 ? { scale: 1.8, lookScale: 0.5 } : {});
}
// the countdown is the title shot handing over to the chase shot: it swings round the rider's side, never through him
function introCamera(dt, u) {
  const k = easeInOut(clamp(u)), a = titleShot(T), b = chaseShot();
  // orbit: angle from the title's front three-quarter round to behind, radius kept ≥ 5.5 m, eyes on the rider
  const ra = Math.hypot(a.ds, a.lat), rb = Math.hypot(b.ds, b.lat), th0 = Math.atan2(a.lat, a.ds), th1 = Math.atan2(b.lat, b.ds);
  let dth = th1 - th0; if (a.lat >= 0 && dth < 0) dth += Math.PI * 2; if (a.lat < 0 && dth > 0) dth -= Math.PI * 2;
  const th = th0 + dth * k, r = Math.max(5.5, ra + (rb - ra) * k);
  const look = smooth(clamp((k - 0.55) / 0.45));
  const shot = { ds: r * Math.cos(th), lat: r * Math.sin(th), y: a.y + (b.y - a.y) * k + Math.sin(Math.PI * k) * 0.6, lds: b.lds * look, llat: b.llat * look, ly: a.ly + (b.ly - a.ly) * look, fov: a.fov + (b.fov - a.fov) * k };
  applyCam(shot, dt, { scale: 0.4 });
}
// sun shadows follow the player, snapped to whole shadow-map texels so they don't crawl as you move
const _sp = V(), _sm = new THREE.Matrix4(), _si = new THREE.Matrix4();
function updateShadowCam(at) {
  const cam = sun.shadow.camera, texel = (cam.right - cam.left) / sun.shadow.mapSize.x;
  _sm.lookAt(V(0, 0, 0), SUN_DIR.clone().negate(), V(0, 1, 0)); _si.copy(_sm).invert();
  _sp.copy(at).applyMatrix4(_si); _sp.x = Math.round(_sp.x / texel) * texel; _sp.y = Math.round(_sp.y / texel) * texel; _sp.applyMatrix4(_sm);
  sun.target.position.copy(_sp); sun.position.copy(_sp).addScaledVector(SUN_DIR, 120);
}

// ---------------------------------------------------------------- flow
let hud = null;
async function startOrder(restart = false) {
  UI.clear();
  if (restart || !G.world || G.builtFor !== G.order) { const ld = UI.loading(); progress.onChange = (d, t) => ld.set(t ? d / t : 0); await buildWorld(G.order); G.builtFor = G.order; UI.remove('load'); }
  else resetRun();
  G.state = 'order';
  Audio.music('chill');
  const def = G.def;
  UI.orderCard({ n: G.order, thought: K.introThought(G.delivered, mulberry(G.seed)), tip: def.tip, note: def.note, pickup: def.pickup, dropoff: 'Citi Tower · 101 Lake Ave', eta: G.eta, onAccept: () => { Audio.sfx('ding'); UI.remove('order'); countdownGo(); } });
  Audio.sfx('ding', 0.8);
}
function countdownGo() {
  const marks = G.route.streets.slice(1).map((st) => [st.s0 / G.route.length, st.name.replace(/^(East|West|South|North) /, '')]);
  if (G.rail) marks.push([G.rail.s / G.route.length, 'SunRail']);
  G.state = 'count'; hud = UI.hud(marks); hud.onBoost(useBoost); hud.hint(true);
  hud.update({ eta: G.eta, prog: 0, ice: G.ice, boost: G.boostCharge, tip: G.tip, speed: 0 });
  G.introT = 0; G.countN = 0; // the countdown runs on the game clock (see step) so the camera hand-off always lands on GO
}
let finale = null;
function arrive() {
  G.state = 'finale'; UI.remove('hud'); hud = null;
  finale = new Finale({ renderer, scene, camera, G, Audio, UI, sun, onDone: showResults }); window.__F = finale;
  finale.start();
}
function showResults(line) {
  G.state = 'results';
  G.delivered++; store.set('delivered', G.delivered);
  if (!G.best || G.time < G.best) { G.best = Math.round(G.time); store.set('best', G.best); }
  // delivery bonuses on top of the live score
  const timeLeft = Math.max(0, G.etaTotal - G.time - (G.fin?.doorT || 0) - (G.fin?.stairT || 0) * 0.5 - (G.fin?.akiraT || 0));
  const run = Math.round(G.score), timeB = Math.round(timeLeft * 25), iceB = Math.round(G.ice * 8), cleanB = G.crashes ? 0 : 1000;
  const total = run + timeB + iceB + cleanB;
  const per = total / G.route.length, grade = per >= 26 ? 'S' : per >= 18 ? 'A' : per >= 11 ? 'B' : per >= 6 ? 'C' : 'D';
  const newBest = total > (G.bestScore || 0); if (newBest) { G.bestScore = total; store.set('bestScore', total); }
  G.lastTotal = total; G.lastGrade = grade;
  Audio.music('chill');
  UI.results({ next: orderDef(G.order + 1), nextN: G.order + 1, tip: G.tip, promised: G.def.tip, pay: 3.25 + Math.round(G.dist / 100) * 0.25, time: G.time, eta: G.etaTotal, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, order: G.order, line,
    score: { run, timeB, iceB, cleanB, total, grade, newBest, best: G.bestScore, coins: G.coins, tricks: G.tricks, bestMult: G.bestMult || 1, door: G.fin?.door, stairs: G.fin?.stairs, akira: G.fin?.akira },
    onNext: () => { G.order++; store.set('order', G.order); finale?.dispose(); finale = null; scene.add(G.world); startOrder(true); },
    onShare: () => { const txt = `Scored ${total.toLocaleString('en-US')} (${grade}) delivering Kyle S his coffee to Citi Tower floor 20. He promised ${UI.money(G.def.tip)}. He tipped $0.00. Again. 🙄 #TIPBAIT`; navigator.clipboard?.writeText(txt).then(() => UI.toast('Copied. Go tag your Kyle.'), () => UI.toast(txt, 4000)); } });
}

// ---------------------------------------------------------------- title: slow orbit at the start of the route
function titleCamera(t, dt) {
  const route = G.route, f = route.at(0);
  G.s = 0; G.lat = 0; G.y = 0;
  route.world(0, 0, 0, G.R.root.position); G.R.root.rotation.set(0, f.yaw, 0);
  G.R.ride(0, { lean: 0.28, footDown: 1, look: -0.2 });
  applyCam(titleShot(t), dt, { scale: 2.5 });
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), T = 0;
const QA = URLQ.has('qa');
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (QA) return;
  step(dt, true);
}
// QA hook: advance the game deterministically (n steps of dt), render only the last one
window.__tick = (n = 1, dt = 1 / 30, draw = true) => { for (let i = 0; i < n; i++) step(dt, draw && i === n - 1); return { st: G.state, s: +G.s.toFixed(1) }; };
function step(dt, draw) {
  T += dt;
  const now = performance.now();
  if (!QA) frameMs = frameMs * 0.95 + (dt * 1000) * 0.05;
  if (!QA && now - lastQ > 2500 && G.state === 'run') { lastQ = now; const nq = frameMs > 24 ? Math.max(0.55, quality - 0.15) : frameMs < 15 && quality < 1 ? Math.min(1, quality + 0.1) : quality; if (nq !== quality) { quality = nq; resize(); } }
  if (G.state === 'title' || G.state === 'order') { titleCamera(T, dt); G.introT = 0; }
  else if (G.state === 'count') { G.introT = (G.introT || 0) + dt; countdownTick(); G.R.ride(0, { lean: 0.28 + 0.14 * clamp(G.introT / 1.8), footDown: 1 - clamp(G.introT / 1.6), look: 0 }); introCamera(dt, G.introT / COUNT); }
  else if (G.state === 'run') { update(dt, T); if (G.state === 'run') { animateLevel(T, dt); runCamera(dt); } }
  else if (G.state === 'crashing' || G.state === 'crashed' || G.state === 'ad') { if (G.state === 'crashing') updateCrash(dt); animateLevel(T, 0); applyCam(chaseShot(), dt, { scale: 3 }); }
  else if (G.state === 'finale' || G.state === 'results') finale?.update(dt, T);
  if (G.state === 'run' && hud) hud.update({ eta: G.eta, etaTotal: G.etaTotal, prog: G.s / G.route.length, ice: G.ice, boost: G.boostCharge, tip: G.tip, speed: G.boostT > 0 ? Math.min(1, G.boostT * 2) : 0, score: G.score, mult: G.mult, coins: G.coins, powers: G.powers.filter((p) => p.t > 0) });
  if (G.world) updateRain(T);
  if (draw && G.state !== 'loading') (finale?.active ? finale.render() : renderer.render(scene, camera));
}

// ---------------------------------------------------------------- boot
async function boot() {
  resize();
  const ld = UI.loading();
  progress.onChange = (d, t) => ld.set(t ? d / t : 0);
  try {
    [cityData, routes] = await Promise.all([loadJSON('city.json'), loadJSON('routes.json')]);
    await initSky();
    await buildWorld(G.order); G.builtFor = G.order;
  } catch (e) { console.error(e); ld.set(0); document.querySelector('#load .tagline').textContent = 'Could not load the city. Check your connection and reload.'; return; }
  UI.remove('load');
  G.state = 'title';
  showTitle();
  window.__ready = true;
}
function showTitle() {
  G.state = 'title';
  UI.title({ bestScore: G.bestScore, best: G.best ? UI.fmtTime(G.best) : null, orders: G.delivered, muted: Audio.muted, onPlay: () => { Audio.unlock(); UI.remove('title'); startOrder(); }, onMute: () => { Audio.unlock(); Audio.setMuted(!Audio.muted); return Audio.muted; } });
}
requestAnimationFrame(frame);
boot();
