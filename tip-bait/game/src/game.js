// TIP BAIT — mobile web game. Deliver an iced caramel macchiato through real Downtown Orlando to Kyle S at
// Citi Tower (101 Lake Ave, floor 20). Swipe lanes, jump, hit boost pads and ramps, crash → watch an ad →
// continue from where you were. Kyle takes the tip anyway.
import { THREE, V, clamp, lerp, damp, seg, smooth, easeOut, easeInOut, loadJSON, loadTex, tex, progress, mulberry, rnd, seedRun, hashStr } from './core.js';
import { Route } from './route.js';
import * as City from './city.js';
import { citiTower } from './citi.js';
import { rider } from './rider.js';
import { buildLevel, populate, LANES, PHYS } from './level.js';
import { Audio } from './audio.js';
import * as UI from './ui.js';
import { Finale } from './finale.js';
import * as K from './kyle.js';
import { createFX } from './fx.js';
import { createEvents } from './events.js';
import { createCosmetics } from './cosmetics.js';
import { openShop } from './shop.js';
import { openBattlePass, runXP, award as awardXP, xpWidget, levelOf, state as bpState } from './battlepass.js';

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
// Daily: one route, one seed, one difficulty for everyone on a given (local) date — a skill check between friends.
const DAILY_ORDER = 3; // fixed difficulty for the daily (speed, layouts, QTE windows)
const pad2 = (x) => String(x).padStart(2, '0');
const dailyKey = (d = new Date()) => URLQ.get('daily')?.match(/^\d{4}-\d{2}-\d{2}$/) ? URLQ.get('daily') : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dailyLabel = (key) => { const [, m, d] = key.split('-').map(Number); return `${m}/${d}`; };
function dailyInfo(key = dailyKey()) {
  const seed = hashStr('tipbait-daily-' + key), o = ORDERS[seed % ORDERS.length], tip = o.tip;
  return { key, label: dailyLabel(key), seed, def: { ...o, tip, note: K.pickLine(K.NOTES, mulberry(seed)).replace('$TIP', '$' + tip) } };
}
const dailyState = () => store.get('daily', { key: null, best: 0, tries: 0, done: false, streak: 0, last: null });
const orderDef = (n) => { const o = ORDERS[(n - 1) % ORDERS.length]; const tip = o.tip * (1 + Math.floor((n - 1) / ORDERS.length)); return { ...o, tip, note: n === 1 ? o.note : K.pickLine(K.NOTES, mulberry(n * 31 + 7)).replace('$TIP', '$' + tip) }; };

// ---------------------------------------------------------------- renderer + scene
const canvas = document.getElementById('gl');
const TOUCH_EARLY = () => matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const FX = createFX(scene);
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
window.__sfx = (n, g, r) => Audio.sfx(n, g, r);
window.__UI = UI; // QA: drive toasts/overlays directly
const SHARE_URL = 'http://media.basedboats.com:8000/'; // where friends can play (self-hosted: its link unfurls with the og card)
window.__G = G; G.LANES = LANES; window.__camera = camera; window.__THREE = THREE; // debug / QA hook
window.__regen = (seed, order = G.order) => buildLevel(null, G.route, { order, seed, cross: G.streetInfo.cross, rail: G.rail, storm: G.def.storm });
const EV = createEvents({ G, UI, Audio, FX, baseFov: () => baseFov(), halfAt: (s) => halfAt(s), addCombo, breakCombo, saveTut: () => store.set('tut', TUT), tumble: (d, o) => tumble(d, o) }); window.__EV = EV;
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
  G.def = G.daily ? G.daily.def : orderDef(n);
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
  G.seed = G.daily ? G.daily.seed : URLQ.has('seed') ? Number(URLQ.get('seed')) : QA ? n : Math.floor(Math.random() * 1e9);
  G.lv = await buildLevel(world, route, { order: n, seed: G.seed, cross: G.streetInfo.cross, rail: G.rail, storm: G.def.storm });
  G.pop = await populate(world, route, G.lv);
  G.tut = TUT; EV.bind(G.pop.events);
  warmup(world);
  if (!G.R) { G.R = await rider(); G.cos = createCosmetics(G.R); G.cos.applyAll(store.get('equipped', {})); }
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
  G.s = atS; G.lat = 0; G.lane = 1; G.y = 0; G.vy = 0; G.v = 0; G.runT = 0; G.boostT = 0; G.slowT = 0; G.invT = 0; G.crashT = 0; G.slowmo = 1; G.cine = 0; G.camK = 0; G.airKind = null; G.qte = null; G.trick = null; G.trickGrade = null; G.qteAt = null; UI.remove('qte'); UI.remove('combo'); G.akira = null; G.akK = 0; G.tech = null;
  if (atS === 0) {
    G.base = Math.min(21, 15.2 + (G.order - 1) * 1.0);
    G.eta = Math.round(G.route.length / (G.base * 0.98) + 8); G.etaTotal = G.eta; G.time = 0; G.ice = 100; G.crashes = 0; G.nearMiss = 0; G.boostCharge = 0.34; G.tip = G.def.tip; G.dmDone = new Set();
    seedRun(G.seed); // every gameplay roll this run comes off the seed (daily = same run for everyone)
    G.score = 0; G.mult = 1; G.combo = 0; G.comboT = 0; G.coins = 0; G.banked = 0; G.powers = []; G.lateT = 0; G.tricks = 0; G.smashes = 0; G.bestMult = 1; G.fin = {}; G.qteMisses = 0; G.tumbleT = 0;
    const rr = mulberry(G.seed * 13 + 5); G.rideTexts = K.RIDE_TEXTS.map(([p, a]) => [p, K.pickLine(a, rr)]);
    for (const o of G.lv.obs) { o.dead = false; o.s0 ??= o.s; o.s = o.s0; o.lat0 ??= o.lat; o.lat = o.lat0; o.passed = false; o.t0 = null; o.mt = null; o.on = false; o.teched = false; }
    for (const ic of G.lv.ice) ic.got = false;
    for (const c of G.lv.coins) { c.got = false; c.s0 ??= c.s; c.lat0 ??= c.lat; c.y0 ??= c.y; c.s = c.s0; c.lat = c.lat0; c.y = c.y0; }
    for (const p of G.lv.pickups) p.got = false;
    for (const w of G.pop.walkers) { w.t = null; w.gone = false; w.stopped = false; }
    G.trainCab = null; G.trainGone = false;
  }
  const R = G.R; R.C.root.rotation.set(0, 0, 0); R.bike.rotation.set(0, 0, 0); R.bike.position.set(0, 0, 0); R.root.visible = true;
  EV.reset(atS);
}

// ---------------------------------------------------------------- input: swipes, taps, keys
const input = { x0: 0, y0: 0, t0: 0, active: false };
function onSwipe(dir) {
  if (G.state !== 'run') return;
  if (G.tech) { techPress(dir); return; }
  if (G.akira && !G.akira.res) { akiraPress(dir); return; }
  if (G.qte) { qtePress(dir); return; }
  if (EV.locked) { EV.key({ L: 'arrowleft', R: 'arrowright', U: 'arrowup', D: 'arrowdown' }[dir]); return; }
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
  if (G.state === 'title' && k === 's') { e.preventDefault(); openStore(); return; }
  if (G.state === 'title' && k === 'b') { e.preventDefault(); openPass(); return; }
  if (G.state === 'title' && k === 'd') { e.preventDefault(); document.getElementById('dailybtn')?.click(); return; }
  if (G.state === 'results' && k === 'enter') { document.getElementById('next')?.click(); return; }
  if (k === 'm') { Audio.unlock(); Audio.setMuted(!Audio.muted); UI.toast(Audio.muted ? 'Sound off' : 'Sound on', 900); return; }
  if ((k === 'escape' || k === 'p') && (G.state === 'run' || G.state === 'paused')) { G.state === 'run' ? pause() : resume(); return; }
  if (G.state === 'paused') { if (k === 'r') { resume(); startOrder(true); } return; }
  if (G.state === 'finale' && (k === 'enter' || k === ' ' || k === 'escape')) { e.preventDefault(); finale?.skip(); return; }
  if (G.state === 'run' && G.tech) { if (techPress(k)) { e.preventDefault(); return; } }
  if (G.state === 'run' && G.akira && !G.akira.res) { if (akiraPress(k)) { e.preventDefault(); return; } }
  if (G.state === 'run' && G.qte) { if (qtePress(k)) { e.preventDefault(); return; } }
  if (G.state === 'run' && EV.locked && QKEYS.includes(QALIAS[k] || k)) { e.preventDefault(); EV.key(QALIAS[k] || k); return; }
  if (['arrowleft', 'a'].includes(k)) onSwipe('L'); else if (['arrowright', 'd'].includes(k)) onSwipe('R');
  else if (['arrowup', 'w', ' '].includes(k)) onSwipe('U'); else if (['arrowdown', 's', 'shift'].includes(k)) onSwipe('D');
  if (G.state !== 'run' && k === ' ') e.preventDefault();
});
// pause: Esc / P, and automatically when the window loses focus mid-run
function pause() {
  if (G.state !== 'run') return;
  G.state = 'paused'; Audio.music(null);
  UI.pauseMenu({ onResume: resume, onRestart: () => { bankCoins(); partialXP(); resume(); startOrder(true); }, onQuit: () => { bankCoins(); partialXP(); UI.clear(); hud = null; G.state = 'title'; showTitle(); } });
}
function resume() { if (G.state !== 'paused') return; UI.remove('pause'); G.state = 'run'; Audio.music('full'); }
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function useBoost() { if (G.boostCharge >= 1 && G.state === 'run') { G.boostCharge = 0; startBoost('BOOST!'); } }
function startBoost(label, dur = 2.2) { G.boostT = dur; const rp = G.R.root.position; FX.shock(rp, { color: 0x46ff8f, radius: 8, dur: 0.55 }); FX.burst(rp.clone().setY(0.6), { color: 0x46ff8f, n: 36, speed: 8, up: 3, life: 0.7, size: 0.4 }); UI.flash(); G.shake = Math.max(G.shake || 0, 0.25); UI.pop(label, '2× speed'); Audio.sfx('boom', 0.6); Audio.sfx('whoosh', 0.9, 0.8); navigator.vibrate?.(30); }

const POWERS = { magnet: { icon: '🧲', dur: 8, name: 'MAGNET', sub: 'coins come to you' }, shield: { icon: '🪖', dur: 30, name: 'HELMET', sub: 'blocks one crash' }, cool: { icon: '❄️', dur: 10, name: 'COOLER BAG', sub: 'ice stops melting' }, x2: { icon: '✖2', dur: 10, name: 'DOUBLE COINS', sub: '2× tip coins' }, rocket: { icon: '🚀', dur: 1.5, name: 'ROCKET!', sub: 'smash through anything' } };
function followSpeed(o) {
  let gap = 1e9;
  for (const q of G.lv.obs) if (q !== o && !q.dead && q.s > o.s && Math.abs(q.lat - o.lat) < (q.w + o.w) / 2 + 0.2) gap = Math.min(gap, q.s - q.len / 2 - (o.s + o.len / 2));
  for (const q of G.lv.ramps) if (q.s > o.s && Math.abs(q.lat - o.lat) < 2) gap = Math.min(gap, q.s - (q.len ?? 3.4) / 2 - (o.s + o.len / 2));
  return Math.min(o.v, Math.max(0, (gap - 1.5) * 1.6));
}
const route0 = () => G.route;
function grabPower(p) {
  p.got = true; const d = POWERS[p.kind];
  G.powers = G.powers.filter((w) => w.id !== p.kind); G.powers.push({ id: p.kind, t: d.dur, dur: d.dur, icon: d.icon });
  { const at = route0().world(p.s, p.lat, 1.2); const col = { magnet: 0xff3d5a, shield: 0x3d8bff, cool: 0x46d8ff, x2: 0xffc83d }[p.kind]; FX.burst(at, { color: col, n: 40, speed: 5, up: 3, life: 0.8, size: 0.4 }); FX.shock(at, { color: col, radius: 5 }); }
  addScore(50); addCombo(2); UI.pop(d.name, d.sub); Audio.sfx('jingle', 0.6, 1.3); Audio.sfx('ding', 0.5, 1.5);
  if (p.kind === 'rocket') { G.invT = 0; G.shake = Math.max(G.shake || 0, 0.4); UI.flash(); Audio.sfx('boom', 0.9, 0.7); Audio.sfx('whoosh', 1, 0.5); FX.shock(G.R.root.position, { color: 0xff7a1a, radius: 9, dur: 0.6 }); }
}
// ---------------------------------------------------------------- the Akira slide into Citi Tower's front spot
function startAkira() {
  const first = !G.daily && !TUT.akira; if (first) { TUT.akira = 1; store.set('tut', TUT); }
  const pool = ['arrowleft', 'arrowdown', 'arrowright', 'arrowup'], rr = () => rnd('akira');
  const seq = ['arrowdown']; for (let k = 1; k < (first ? 3 : 4); k++) { let n; do n = pool[Math.floor(rr() * 4)]; while (n === seq[k - 1]); seq.push(n); }
  G.akira = { seq, idx: 0, t: 0, dur: first ? 3.0 : 2.15, res: null, ui: UI.combo({ seq, label: first ? 'A TOURIST STEPS OUT — <b>SLIDE IN!</b><br><small style="font-size:16px">press the keys in order, fast</small>' : 'TOURIST! <b>SLIDE IN!</b>' }) };
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
  if (res === 'ok') { G.score += 1500; Audio.sfx('skid', 1.2, 0.6); } else { breakCombo(); Audio.sfx('bwomp', 0.7); UI.timeCost(6, 'botched the parking slide'); }
  G.fin = { ...(G.fin || {}), akira: res === 'ok' ? 'NAILED' : 'WIPEOUT', akiraT: res === 'ok' ? 0 : 6 };
}
// ---------------------------------------------------------------- tech landing: come down on a car → a split-second kick off its roof
function startTech(o) {
  const first = !G.daily && !TUT.tech; if (first) { TUT.tech = 1; store.set('tut', TUT); }
  let dir = rnd('tech') < 0.5 ? -1 : 1; if (G.lane + dir < 0 || G.lane + dir > 2) dir = -dir;
  const key = dir < 0 ? 'arrowleft' : 'arrowright';
  G.tech = { o, dir, key, t: 0, dur: first ? 0.7 : 0.5, ui: UI.qte({ key, label: 'TECH IT!' }) };
  G.slowmo = 0.06; Audio.rate(0.6); Audio.sfx('skid', 0.9, 1.4); G.shake = 0.15;
}
function updateTech(dt) { const q = G.tech; q.t += dt; q.ui.set(1 - q.t / q.dur); if (q.t >= q.dur) endTech(false); }
function techPress(k) { k = QALIAS[k] || k; if (!QKEYS.includes(k)) return false; endTech(k === G.tech.key); return true; }
function endTech(ok) {
  const q = G.tech; G.tech = null;
  if (!ok) { q.ui.result('MISS', 'ate the car'); G.slowmo = 1; Audio.rate(1); G.techMiss = true; G.techSide = q.dir; crash(q.o.kind); UI.pop('ATE THE CAR', 'missed the tech'); return; }
  q.ui.result('PERFECT', 'TECH! +300');
  G.lane = clamp(G.lane + q.dir, 0, 2); G.vy = 6.5; G.y = Math.max(G.y, q.o.h + 0.15); G.invT = 0.6; G.airKind = null;
  addScore(300); addCombo(6); G.boostCharge = Math.min(1, G.boostCharge + 0.5); Audio.sfx('boom', 0.6, 1.5); Audio.sfx('ding', 0.8, 1.6);
  FX.burst(G.R.root.position.clone().setY(q.o.h), { color: 0xffffff, n: 24, speed: 5, up: 2, life: 0.5, size: 0.35 });
}
// ---------------------------------------------------------------- quick-time tricks on big jumps
const QKEYS = ['arrowup', 'arrowleft', 'arrowright', 'arrowdown'];
const QALIAS = { w: 'arrowup', a: 'arrowleft', d: 'arrowright', s: 'arrowdown', ' ': 'arrowup', shift: 'arrowdown', U: 'arrowup', L: 'arrowleft', R: 'arrowright', D: 'arrowdown' };
const TRICKS = { arrowup: ['BACKFLIP', 'flip'], arrowleft: ['TAIL WHIP', 'whip'], arrowright: ['TAIL WHIP', 'whip'], arrowdown: ['NO-HANDER', 'nohand'] };
function startQTE(kind) {
  // a trick is a key combo punched in mid-air: 2 keys over the tracks, 3 over the bus (4 on later orders); fast = PERFECT
  const rr = () => rnd('trick'), first = !G.daily && !TUT.qte; if (first) { TUT.qte = 1; store.set('tut', TUT); }
  const n = (kind === 'rail' ? 2 : 3) + (G.order >= 4 ? 1 : 0), seq = []; for (let i = 0; i < n; i++) { let k; do k = QKEYS[Math.floor(rr() * 4)]; while (k === seq[i - 1]); seq.push(k); }
  const key = seq[n - 1];
  G.qte = { kind, key, seq, idx: 0, t: 0, dur: (first ? 1.35 : 0.75) + n * 0.25, ui: UI.combo({ seq, label: first ? 'TRICK COMBO — punch them in, <b>fast</b>' : kind === 'rail' ? 'TRICK OVER THE TRACKS!' : 'TRICK OVER THE BUS!' }) };
  Audio.rate(0.7); Audio.sfx('whoosh', 0.8, 0.5); UI.coach(null);
}
function updateQTE(dt) { const q = G.qte; q.t += dt; q.ui.set(q.idx, 1 - q.t / q.dur); if (q.t >= q.dur) endQTE('MISS', 'too slow'); }
function qtePress(k) {
  k = QALIAS[k] || k; if (!QKEYS.includes(k)) return false;
  const q = G.qte, u = 1 - q.t / q.dur, now = performance.now();
  if (k !== q.seq[q.idx]) {
    // forgiving on speed: a stray key in the first beat (still mashing from the ramp) or a double-tap of the key you just hit doesn't count
    if (q.t < 0.15 || (k === q.seq[q.idx - 1] && now - (q.lastAt || 0) < 160)) return true;
    endQTE('MISS', 'wrong key'); return true;
  }
  q.idx++; q.lastAt = now; Audio.sfx('pop', 0.8, 1 + q.idx * 0.15);
  if (q.idx >= q.seq.length) endQTE(u > 0.35 ? 'PERFECT' : 'GOOD');
  return true;
}
function endQTE(grade, why = '') {
  const q = G.qte; G.qte = null; G.trickGrade = grade;
  if (grade === 'MISS') {
    G.qteMisses = (G.qteMisses || 0) + 1; q.ui.result(false, why); breakCombo(); Audio.sfx('bwomp', 0.6, 1.2);
    if (q.kind === 'rail' && G.rail && G.s < G.rail.s + 0.5 && !power('rocket')) { G.railClip = true; Audio.sfx('trainhorn', 1, 1.1); } // botched it over the tracks: the train is coming for you
    return;
  }
  const [name, kind] = TRICKS[q.key], pts = grade === 'PERFECT' ? 500 : 250;
  const tLand = (G.vy + Math.sqrt(Math.max(0, G.vy * G.vy + 48 * G.y))) / 24;
  G.trick = { name, kind, t: 0, dur: Math.max(0.3, Math.min(0.7, tLand * 0.85)) };
  addScore(pts); addCombo(grade === 'PERFECT' ? 8 : 5); G.tricks++;
  if (grade === 'PERFECT') G.boostCharge = 1;
  q.ui.result(true, `${grade} · ${name} +${pts * G.mult}`); Audio.sfx('ding', 0.9, grade === 'PERFECT' ? 1.5 : 1.2); Audio.sfx('boom', 0.4, 1.4);
}
function land() {
  const g = G.trickGrade, kind = G.airKind; G.airKind = null; G.trickGrade = null;
  if (G.qte) endQTE('MISS', 'too slow');
  if (G.trick) { G.R.bike.rotation.y = 0; G.trick = null; }
  if (g && g !== 'MISS') { addScore(100); UI.pop('LANDED!', kind === 'rail' ? 'cleared the SunRail' : 'cleared the LYNX'); }
  else { G.railClip = false; G.shake = 0.5; UI.pop('BAILED!', 'over the bars · combo lost'); tumble(1.6, { kind: 'bars', label: 'bailed the landing' }); }
  G.shake = Math.max(G.shake || 0, 0.25); navigator.vibrate?.(25);
  const rp = G.R.root.position; FX.burst(rp.clone().setY(0.1), { color: 0xd8d2c6, n: 26, speed: 5, up: 1.2, life: 0.8, size: 0.6, grav: 2 }); FX.shock(rp, { color: 0xffffff, radius: 4, dur: 0.4 });
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
  if (!power('cool')) G.ice = Math.max(0, G.ice - sdt * (G.def.storm ? 0.85 : 1.0));
  for (const p of G.powers) p.t -= sdt;
  G.powers = G.powers.filter((p) => p.t > 0);
  if (G.comboT > 0) { G.comboT -= sdt; if (G.comboT <= 0 && G.mult > 1) { G.mult--; G.combo = (G.mult - 1) * MULT_STEP; G.comboT = 2.5; } }
  // Kyle watches the map: late → he starts docking the tip
  if (G.eta < 0) { G.lateT += dt; if (G.lateT > 6) { G.lateT = 0; loseTip(0.1, K.pickLine(K.LATE_TEXTS)); Audio.sfx('bwomp', 0.4, 1.3); } }
  if (!G.dmDone.has('fast') && G.s / G.route.length > 0.5 && G.eta > G.etaTotal * 0.55) { G.dmDone.add('fast'); UI.dm(K.pickLine(K.FAST_TEXTS)); }
  // speed
  G.boostT = Math.max(0, G.boostT - sdt); G.slowT = Math.max(0, G.slowT - sdt); G.invT = Math.max(0, G.invT - sdt);
  const target = (G.tumbleT > 0 ? 0 : 1) * G.base * (power('rocket') ? 2.0 : G.boostT > 0 ? 1.75 : 1) * (G.slowT > 0 ? 0.6 : 1) * EV.speedK * smooth(seg(G.runT, 0, 1.2));
  G.runT += sdt;
  G.v = damp(G.v, target, G.tumbleT > 0 ? 7 : power('rocket') ? 9 : G.boostT > 0 ? 6 : 2.5, sdt);
  const prevS = G.s;
  G.s = Math.min(L, G.s + G.v * sdt); G.dist += G.v * sdt; G.score += G.v * sdt;
  // lanes + jump + ramps
  const tl = LANES[G.lane]; const prevLat = G.lat; G.lat = damp(G.lat, tl, 13, sdt); const latV = (G.lat - prevLat) / Math.max(1e-4, sdt);
  const rh = rampHeight(G.s, G.lat);
  G.vy -= 24 * sdt; G.y += G.vy * sdt;
  // ramps: launch when the bike crosses the lip in the ramp's lane (frame-rate and speed independent)
  const rr = G.lv.ramps.find((r) => { const lip = r.s + (r.len ?? 3.4) / 2; return prevS < lip && G.s >= lip && Math.abs(G.lat - r.lat) < 1.15 && G.y < (r.h ?? 1.1) + 0.25; });
  if (rr) {
    G.vy = rr.mega ? 13.5 : 9.2; G.y = Math.max(G.y, rr.h ?? 1.1); G.rampT = G.time; Audio.sfx('whoosh', 1, 0.7);
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
  if (G.tech) { G.slowmo = 0.06; updateTech(dt); if (G.state !== 'run') return; } // a missed tech already crashed you: don't also run into the car this frame
  else if (G.akira && !G.akira.res) G.slowmo = damp(G.slowmo, 0.12, 10, dt);
  else if (G.qte) { G.slowmo = damp(G.slowmo, 0.26, 14, dt); updateQTE(dt); }
  else if (EV.slow != null) { G.slowmo = damp(G.slowmo, EV.slow, 9, dt); Audio.rate(0.75 + 0.25 * G.slowmo); }
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
      route.world(c.s, c.lat, c.y, tmp); FX.burst(tmp, { color: x2 ? 0xffe680 : 0xffcf3a, n: 9, speed: 2.6, up: 2.4, life: 0.45, size: 0.26, grav: 7 }); tmp.project(camera);
      if (hud && G.time - (G.lastFly || 0) > 0.04) { G.lastFly = G.time; UI.coinFly((tmp.x + 1) / 2 * innerWidth, (1 - tmp.y) / 2 * innerHeight, hud.coinTarget()); }
    }
  }
  // power-ups
  for (const p of G.lv.pickups) if (!p.got && Math.abs(G.s - p.s) < 1.4 && Math.abs(G.lat - p.lat) < 1.2 && G.y < 2.2) grabPower(p);
  for (const ic of G.lv.ice) if (!ic.got && Math.abs(G.s - ic.s) < 1.0 && Math.abs(G.lat - ic.lat) < 0.9 && Math.abs(G.y + 0.9 - ic.y) < 1.0) { ic.got = true; G.ice = Math.min(100, G.ice + 6); G.boostCharge = Math.min(1, G.boostCharge + 0.06); Audio.sfx('ice', 0.7, 1 + Math.random() * 0.2); }
  for (const p of G.lv.puddles) if (Math.abs(G.s - p.s) < 1.4 && Math.abs(G.lat - p.lat) < 1.2 && G.y < 0.2 && G.slowT <= 0) { G.slowT = 0.8; Audio.sfx('splash', 0.8); UI.pop('SPLASH', 'slowed down'); }
  EV.update(dt, sdt); // the rival duel + the crane drop
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
    if (G.railClip && G.state === 'run') {
      const R0 = G.rail, F = route.at(rs), sinA = Math.max(0.3, Math.abs(F.fx * R0.dir.z - F.fz * R0.dir.x)), edge = rs + 1.55 / sinA - 0.45; // the far edge of the train's path
      const along = route.world(edge, G.lat, 0, tmp).sub(R0.X).dot(R0.dir);
      if (G.s < edge) G.trainCab = damp(G.trainCab ?? 60, (edge - G.s) * 1.6 + along, 7, sdt);
      else { G.railClip = false; return trainClip(); }
    }
  }
  // collisions (route space)
  if (G.invT <= 0 && !G.tech) {
    const hit = (o, len, w, h) => Math.abs(o.s - G.s) < len / 2 + 0.7 && Math.abs(o.lat - G.lat) < w / 2 + 0.32 && G.y < h - 0.08;
    for (const o of G.lv.obs) {
      if (o.dead || (o.drop && !o.landed)) continue;
      if (hit(o, o.len, o.w, o.h)) {
        if (power('rocket') && o.kind !== 'gate') { rocketSmash(o); continue; }
        if (G.boostT > 0 && (o.kind === 'cone' || o.kind === 'barrier')) { o.dead = true; G.smashes++; FX.burst(G.R.root.position.clone().setY(0.6).addScaledVector(V(route.at(G.s).fx, 0, route.at(G.s).fz), 1), { color: 0xff7a1a, n: 22, speed: 6, up: 4, life: 0.7, size: 0.32, grav: 12 }); addScore(25); addCombo(2); G.boostT = Math.min(3.5, G.boostT + 0.4); UI.pop('SMASH!', `+${25 * G.mult} · boost +`); Audio.sfx('crash', 0.5, 1.6); continue; }
        if ((o.kind === 'car' || o.kind === 'bus') && !o.parked && G.y > 0.12 && G.time - (G.rampT ?? -9) < 2.2 && !G.tech && !o.teched) { o.teched = true; startTech(o); continue; } // landing on a car off a ramp: tech it
        const sh = power('shield'); if (sh) { sh.t = 0; o.dead = true; G.invT = 1.2; G.shake = 0.4; UI.pop('SHIELD!', 'helmet saved you'); Audio.sfx('crash', 0.7, 1.2); continue; }
        if (o.drop) { EV.clonk(o); continue; }
        return crash(o.kind);
      }
      if (!o.passed && o.s < G.s - o.len / 2 - 0.7) { o.passed = true; const dl = Math.abs(o.lat - G.lat); if ((o.kind === 'car' || o.kind === 'bus') && !o.parked && dl < 3.0) { G.nearMiss++; G.boostCharge = Math.min(1, G.boostCharge + 0.34); addScore(50); addCombo(4); if (G.boostT > 0) G.boostT = Math.min(3.5, G.boostT + 0.6); UI.pop('NEAR MISS', `+${50 * G.mult}${G.boostT > 0 ? ' · boost extended' : ' · +boost'}`); Audio.sfx('whoosh', 0.9, 1.2); } }
    }
    for (const w of G.pop.walkers) if (!w.gone && Math.abs(w.s - G.s) < 0.9 && Math.abs(w.lat - G.lat) < 0.6 && G.y < 1.5) { if (power('rocket')) { w.gone = true; FX.burst(route.world(w.s, w.lat, 1.2), { color: 0xff6ad5, n: 30, speed: 7, up: 6, life: 0.9, size: 0.4, grav: 9 }); UI.pop('YEET', 'sorry ma’am'); Audio.sfx('pop', 1, 0.6); continue; } return crash('tourist'); }
    if (G.rail && !G.railClip && G.trainCab != null && G.trainCab < 1.6 && G.trainCab > -78 && Math.abs(G.s - G.rail.s) < 2.2 && G.y < 4.8) return crash('train');
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
  R.ride(G.dist, { lean: 0.42 + (G.boostT > 0 ? 0.12 : 0) - nh * 0.5, bank: clamp(-latV * 0.05 - curve * G.v * G.v * 0.012 + EV.bank(), -0.45, 0.45), stand: G.y > 0.3 ? 0.6 + nh * 0.4 : 0, look: G.y > 0.3 ? 0.15 + nh * 0.3 : 0 });
  EV.pose(R); updateRocket(dt);
  if (G.tumbleT > 0) { // went down: skid off the bike, a beat on the ground, back on (costs time, never the run)
    G.tumbleT -= sdt; const u = 1 - Math.max(0, G.tumbleT) / G.tumbleDur, down = smooth(seg(u, 0, 0.25)) * (1 - smooth(seg(u, 0.72, 1)));
    if (G.tumbleKind === 'bars') { // over the bars: the front wheel digs in, the bike stands on its nose, you fly over and land flat on your back
      const fly = seg(u, 0.04, 0.4), up = smooth(seg(u, 0.66, 0.94)), nose = Math.sin(Math.PI * clamp(u / 0.34)) * 0.75, side = smooth(seg(u, 0.22, 0.42)) * (1 - up);
      R.bike.rotation.set(nose, 0, side * 1.4); R.bike.position.set(0, Math.sin(nose) * 0.62, 0);
      if (u < 0.94) {
        const zL = 2.6, z = lerp(0.1 + easeOut(fly) * zL, 0.3, up), y = (0.2 + Math.sin(Math.PI * fly) * 1.25) * (1 - smooth(seg(u, 0.4, 0.46))) + 0.1;
        R.walk(u < 0.66 ? 'falling' : 'defeated', u < 0.66 ? 0.2 + Math.min(u, 0.5) * 2.4 : (u - 0.66) * 3, { offset: V(0.1, y, z), yaw: 0, loop: false });
        R.C.root.rotation.x = smooth(fly) * Math.PI * 1.5 + up * Math.PI * 0.5; // one forward flip, flat on the back, then sit up and stand
        if (u > 0.4 && !G.tumbleThud) { G.tumbleThud = 1; G.shake = Math.max(G.shake || 0, 0.45); Audio.sfx('crash', 0.9, 0.8); Audio.sfx('step', 1.3, 0.5); FX.burst(R.root.localToWorld(V(0.1, 0.2, z)), { color: 0xd8d2c6, n: 26, speed: 4, up: 1.6, life: 0.8, size: 0.6, grav: 3 }); }
      }
      if (G.tumbleT <= 0) R.bike.position.set(0, 0, 0);
    } else R.bike.rotation.set(0, 0, down * 1.35);
    if (u < 0.78 && G.tumbleKind !== 'bars') { R.walk(u < 0.5 ? 'falling' : 'defeated', u < 0.5 ? 0.3 + u * 2 : (u - 0.5) * 2.4, { offset: V(0.15 + down * 0.6, 0.15 * (1 - down), 0.4 * down), yaw: 0, loop: false }); R.C.root.rotation.x = down * 1.2 * (1 - smooth(seg(u, 0.5, 0.78))); }
    if (G.tumbleT <= 0) { G.tumbleT = 0; R.bike.rotation.set(0, 0, 0); R.C.root.rotation.set(0, 0, 0); G.invT = Math.max(G.invT, 0.6); G.runT = 0.3; }
  }
  R.root.visible = G.tumbleT > 0 || G.invT <= 0 || Math.floor(G.invT * 12) % 2 === 0;
}
// the rocket: everything you touch goes up in a fireball (short and capped: ~20 m more than riding)
function tumble(d = 1.1, { kind = 'skid', label = 'wiped out' } = {}) {
  if (G.tumbleT > 0) return; G.tumbleT = d; G.tumbleDur = d; G.tumbleKind = kind; G.tumbleThud = 0; G.invT = d + 0.6;
  UI.timeCost(d + 1.3, label); // the stop plus getting back up to speed (measured in QA: ~d + 1.3 s behind a clean ride)
  Audio.sfx('crash', 0.8, 1.1); Audio.sfx('skid', 0.7); FX.burst(G.R.root.position.clone().setY(0.4), { color: 0xd8d2c6, n: 22, speed: 4, up: 1.5, life: 0.7, size: 0.5, grav: 3 }); navigator.vibrate?.(60); }
function rocketSmash(o) {
  o.dead = true; G.smashes++;
  const at = G.route.world(o.s, o.lat, Math.min(1.2, o.h / 2));
  FX.burst(at, { color: 0xffa21a, n: 46, speed: 10, up: 5, life: 0.7, size: 0.55, grav: 6 });
  FX.burst(at, { color: 0x3a3632, n: 24, speed: 4, up: 3, life: 1.3, size: 1.1, grav: -1 });
  FX.shock(at, { color: 0xff5a1a, radius: 6, dur: 0.45 });
  Audio.sfx('boom', 1, 0.8 + Math.random() * 0.2); Audio.sfx('crash', 0.6, 1.3); G.shake = Math.max(G.shake || 0, 0.5);
  addScore(75); addCombo(3); UI.pop('KABOOM!', `+${75 * G.mult}`); navigator.vibrate?.(40);
}
let rocketMesh = null;
function rocketProp() {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.2 }), red = new THREE.MeshStandardMaterial({ color: 0xd8261c, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 16), white); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 16), red); nose.rotation.x = Math.PI / 2; nose.position.z = 0.55; g.add(nose);
  for (let k = 0; k < 3; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.22), red); fin.position.set(Math.cos(k * 2.09) * 0.15, Math.sin(k * 2.09) * 0.15, -0.3); fin.rotation.z = k * 2.09; g.add(fin); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa21a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); flame.rotation.x = -Math.PI / 2; flame.position.z = -0.85; g.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.rotation.x = -Math.PI / 2; core.position.z = -0.65; g.add(core);
  g.userData = { flame, core }; g.position.set(0, 1.32, -0.66); g.scale.setScalar(1.55); g.visible = false;
  return g;
}
function updateRocket(dt) {
  const R = G.R; if (!rocketMesh) { rocketMesh = rocketProp(); R.root.add(rocketMesh); }
  const on = G.state === 'run' && !!power('rocket'); rocketMesh.visible = on;
  if (G.rocketWas && !on && G.state === 'run') G.invT = Math.max(G.invT, 0.5); // a beat of grace as the burn ends inside traffic
  G.rocketWas = on;
  if (!on) return;
  const f = 0.85 + Math.random() * 0.4; rocketMesh.userData.flame.scale.set(f, 1 + Math.random() * 0.6, f); rocketMesh.userData.core.scale.setScalar(0.8 + Math.random() * 0.4);
  if (Math.random() < 0.6) FX.burst(R.root.localToWorld(V(0, 1.3, -1.5)), { color: 0x8a8580, n: 2, speed: 1.5, up: 0.6, life: 0.8, size: 0.7, grav: -0.5 });
}
function crash(kind) {
  G.state = 'crashing'; G.crashT = 0; G.crashY0 = G.y; G.clip = null; G.crashThud = 0; G.crashRoof = !!G.techMiss && G.y > 0.5; G.techMiss = false; G.railClip = false; G.crashes++; G.crashAt = G.s; G.crashKind = kind; breakCombo(); G.powers = []; if (G.qte) { G.qte.ui.remove(); G.qte = null; } G.qteAt = null; G.airKind = null; G.trick = null; G.R.bike.rotation.y = 0; G.slowmo = 1; Audio.rate(1);
  Audio.sfx('crash', 1); Audio.sfx('skid', 0.8); Audio.music(null); Audio.sfx('scratch', 0.9);
  FX.burst(G.R.root.position.clone().setY(0.7), { color: 0xfff1c0, n: 30, speed: 6, up: 4, life: 0.6, size: 0.35, grav: 10 });
  navigator.vibrate?.([60, 40, 60]);
}
// SunRail clip: botch the trick over the tracks and the cab catches your back wheel — slow-mo hit, spun through the air, thrown down the road
function trainClip() {
  const rail = G.rail, R = G.R, p = R.root.position;
  G.trainCab = p.clone().sub(rail.X).dot(rail.dir) - 0.15; // the cab's nose is right at you
  crash('train');
  const f = G.route.at(G.s), td = rail.dir.clone().negate(), tL = td.x * f.rx + td.z * f.rz, tS = td.x * f.fx + td.z * f.fz;
  G.clip = { vs: Math.max(7, G.v * 0.55) + Math.max(0, tS) * 6, vl: Math.sign(tL || 1) * 5.5, vy: Math.max(4, G.vy + 4), yaw: 0, roll: 0, pitch: 0, wy: 13 * Math.sign(tL || 1), wr: 10, wp: 4, ground: false, k: 0.18, dust: 0 };
  G.slowmo = 1; G.shake = 0.9; UI.flash(); Audio.sfx('boom', 1, 0.7); Audio.sfx('trainhorn', 1, 0.95); navigator.vibrate?.([120, 40, 80]);
  const at = p.clone().setY(Math.max(1, G.y + 0.9));
  FX.burst(at, { color: 0xfff1c0, n: 50, speed: 9, up: 4, life: 0.7, size: 0.4, grav: 10 }); FX.shock(at, { color: 0xffffff, radius: 6, dur: 0.5 });
  UI.pop('CLIPPED BY THE SUNRAIL', 'botched trick over the tracks');
}
function updateClip(dt) {
  const c = G.clip, R = G.R, route = G.route;
  c.k = Math.min(1, c.k + dt * (G.crashT < 0.45 ? 0.15 : 1.8)); const k = dt * c.k; // a held beat of slow-mo on impact, then full speed
  G.trainCab -= 24 * k;
  const h = halfAt(G.s) - 0.7;
  G.s += c.vs * k; G.lat = clamp(G.lat + c.vl * k, -h, h); if (Math.abs(G.lat) >= h) c.vl *= -0.3;
  if (!c.ground) {
    c.vy -= 16 * k; G.y += c.vy * k; c.yaw += c.wy * k; c.roll += c.wr * k; c.pitch += c.wp * k;
    if (G.y <= 0 && c.vy < 0) { // slam into the asphalt
      G.y = 0; c.ground = true; c.gT = G.crashT; c.r0 = { yaw: c.yaw, roll: c.roll, pitch: c.pitch };
      c.vs *= 0.6; c.vl *= 0.5; G.shake = 0.7; Audio.sfx('crash', 1, 0.8); Audio.sfx('skid', 1, 0.9); navigator.vibrate?.(90);
      FX.burst(R.root.position.clone().setY(0.3), { color: 0xd8d2c6, n: 40, speed: 6, up: 2, life: 1.0, size: 0.8, grav: 3 }); FX.shock(R.root.position.clone().setY(0.05), { color: 0xd8d2c6, radius: 4, dur: 0.4 });
    }
  } else { // skid to a stop on your side
    const sp = Math.hypot(c.vs, c.vl), nsp = Math.max(0, sp - 9 * k); if (sp > 0) { c.vs *= nsp / sp; c.vl *= nsp / sp; }
    const g = smooth(clamp((G.crashT - c.gT) / 0.35)), near = (a, t) => t + Math.round((a - t) / (2 * Math.PI)) * 2 * Math.PI;
    c.yaw = lerp(c.r0.yaw, c.r0.yaw + 0.6 * Math.sign(c.wy), g); c.roll = lerp(c.r0.roll, near(c.r0.roll, Math.PI / 2), g); c.pitch = lerp(c.r0.pitch, near(c.r0.pitch, 0), g);
    c.dust -= dt; if (nsp > 0.8 && c.dust <= 0) { c.dust = 0.05; FX.burst(R.root.position.clone().setY(0.15), { color: 0xcfc6b6, n: 6, speed: 2, up: 1, life: 0.7, size: 0.6, grav: 1 }); }
  }
  // spin about the body's middle, not the tyres
  const f = route.at(G.s), lift = c.ground ? 0.45 : 0.9;
  R.root.rotation.set(0, f.yaw + c.yaw, 0); R.root.rotateZ(c.roll); R.root.rotateX(c.pitch);
  route.world(G.s, G.lat, G.y + lift, R.root.position).sub(tmp.set(0, lift, 0).applyQuaternion(R.root.quaternion));
  R.bike.rotation.set(0, 0, 0);
  R.walk('falling', 0.3 + G.crashT * 1.2, { offset: V(0.15, 0.25, 0.25 + (c.ground ? smooth(clamp((G.crashT - c.gT) / 0.4)) * 0.6 : 0)), yaw: 0, loop: false });
  R.C.root.rotation.x = c.ground ? 0.4 : Math.sin(G.crashT * 9) * 0.5;
  return c.ground && G.crashT - c.gT > 1.3;
}
function updateCrash(dt) {
  G.crashT += dt;
  const R = G.R, u = clamp(G.crashT / 0.6);
  let done = G.crashT > 1.0;
  if (G.clip) done = updateClip(dt);
  else {
    const roof = G.crashRoof; // botched tech: the front wheel catches the roof edge and you're both flung off the side of the car onto the road
    R.bike.rotation.set(-0.35 * Math.sin(Math.PI * Math.min(1, G.crashT / 0.35)), 0, smooth(clamp((G.crashT - 0.1) / 0.45)) * 1.4 * (roof ? -G.techSide || 1 : 1));
    const uu = easeOut(u), fwd = uu * (roof ? 2.2 : 3.8), y = (0.85 + 1.6 * 4 * u * (1 - u)) * (1 - u) + 0.12 * u;
    const off = roof ? -G.techSide * 1.7 * easeOut(seg(u, 0, 0.5)) : 0; // root-local +x is the street's left
    const drop = G.crashY0 * smooth(roof ? seg(u, 0.2, 0.7) : seg(u, 0, 0.6)); // airborne crashes come down to the road, never hang in the air
    R.root.position.y = G.crashY0 - drop; R.bike.position.set(off * 0.75, 0, roof ? uu * 0.8 : 0);
    if (roof) { if (u >= 1 && !G.crashThud) { G.crashThud = 1; G.shake = 0.5; Audio.sfx('crash', 0.8, 0.8); FX.burst(R.root.localToWorld(V(0, 0.2, 0.2 + fwd)), { color: 0xd8d2c6, n: 24, speed: 4, up: 1.5, life: 0.8, size: 0.6, grav: 3 }); } }
    R.walk('falling', 0.3 + G.crashT * 1.4, { offset: V(off, y, 0.2 + fwd), yaw: 0 });
    R.C.root.rotation.x = uu * Math.PI * 2.5; if (roof) R.C.root.rotation.z = -G.techSide * uu * 1.2;
  }
  if (done && G.state === 'crashing') {
    G.state = 'crashed';
    UI.crash({ tip: G.tip, onAd: () => { UI.remove('crash'); G.state = 'ad'; Audio.sfx('jingle', 0.9); UI.ad({ seconds: 4, onDone: continueRun }); }, onRestart: () => { bankCoins(); partialXP(); UI.remove('crash'); startOrder(true); } });
  }
}
function continueRun() {
  // respawn where you crashed; clear what's right ahead; 2 s of invulnerability
  let at = G.crashAt;
  if (G.crashKind === 'train' || (G.rail && Math.abs(at - G.rail.s) < 12)) { at = G.rail.s + 9; G.trainGone = true; G.trainCab = Math.min(G.trainCab ?? -300, -300); } // the train has long gone by the time you're back up
  for (const o of G.lv.obs) if (o.s > at - 3 && o.s < at + 28) o.dead = true;
  for (const w of G.pop.walkers) if (Math.abs(w.s - at) < 28) w.gone = true;
  const keep = { time: G.time, eta: G.eta, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, boostCharge: G.boostCharge, dist: G.dist, dmDone: G.dmDone, trainCab: G.trainCab, trainGone: G.trainGone, score: G.score, coins: G.coins, lateT: G.lateT, tricks: G.tricks, smashes: G.smashes, bestMult: G.bestMult };
  G.R.bike.position.set(0, 0, 0); G.clip = null; G.crashThud = 0; G.crashRoof = false; CAM.p = null; // cut straight back to the chase cam
  resetRun(at); Object.assign(G, keep);
  // the wipeout itself costs time: picking yourself (and the bike) up off the road
  const lost = G.crashKind === 'train' ? 6 : 4; G.time += lost; G.eta -= lost;
  G.invT = 2.0; G.runT = 0.6; G.v = G.base * 0.6;
  G.state = 'run'; Audio.music('full'); loseTip(0.1, K.pickLine(K.CRASH_TEXTS));
  UI.pop('CONTINUE ▶', 'from right here'); setTimeout(() => UI.timeCost(lost, G.crashKind === 'train' ? 'clipped by the train' : 'wiped out'), 350);
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
    const vk = (st.vk ||= Symbol('vis'));
    for (const o of st.list) { const vis = !o.dead; if (o[vk] !== vis) { o[vk] = vis; dirty = true; o.mats.forEach((m, k) => st.mesh.setMatrixAt(idx + k, vis ? m : m4.makeScale(0, 0, 0))); } idx += o.mats.length; }
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
  for (const p of lv.pickups) { p.mesh.visible = !p.got && Math.abs(p.s - G.s) < 220; if (p.mesh.visible) { const u = p.mesh.userData; u.orbG.position.y = 1.25 + Math.sin(t * 3 + p.s) * 0.15; u.orbG.rotation.y = t * 1.5; u.ring.scale.setScalar(1 + 0.12 * Math.sin(t * 5 + p.s)); u.shell.scale.setScalar(1 + 0.06 * Math.sin(t * 7)); } }
  if (P.padHalo) P.padHalo.opacity = 0.65 + 0.35 * Math.sin(t * 6);
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
function crashShot() { const c = chaseShot(); return { ...c, ds: c.ds + 1.2, y: c.y + 2.4, lds: 2.5, ly: 0.5 }; } // a wipeout: lift the lens over traffic and look down at where you land
function clipShot() { // train clip: from up the road looking back, so the cab sweeps through behind you as you're thrown at the lens
  const sd = -Math.sign(G.clip.vl || 1), h = halfAt(G.s);
  return { ds: 8.5, lat: clamp(G.lat + sd * 2.5, -h + 0.8, h - 0.8), y: 2.6 + G.y * 0.4, lds: -1.5, llat: G.lat, ly: 0.7 + G.y * 0.7, fov: baseFov() + 4 };
}
function chaseShot() {
  const rk = power('rocket') ? 1 : 0, b = G.boostT > 0 || rk ? 1 : 0, wide = camera.aspect >= 1;
  const cruise = clamp(G.v / G.base);
  return { ds: -((wide ? 7.2 : 8.2) - cruise * 0.5 + b * 1.6), lat: G.lat * 0.7, y: (wide ? 3.3 : 4.1) - cruise * 0.25 + G.y * 0.45, lds: wide ? 9 : 7, llat: G.lat * 0.55, ly: (wide ? 1.4 : 1.0) + G.y * 0.5, fov: baseFov() + cruise * 5 + b * 11 + rk * 7 };
}
function jumpShot() { // big jumps: a low side angle inside the street (SunRail: train side; mega ramp: over the bus)
  const mega = (G.airKind || G.lastAir) === 'mega', side = mega ? -1 : 1, h = halfAt(G.s);
  // mega: from ahead and below, looking back as he sails over the bus; rail: side-on, the train in the background
  return mega ? { ds: 4.5, lat: side * (h - 1.0), y: 1.4 + G.y * 0.7, lds: 0, llat: G.lat, ly: 0.9 + G.y, fov: baseFov() - 4 }
    : { ds: 4.0, lat: side * (h - 0.8), y: 1.8 + G.y * 0.5, lds: 0.3, llat: G.lat, ly: 0.9 + G.y, fov: baseFov() - 2 };
}
function titleShot(t) { // front three-quarter on the rider at the start, drifting gently across the street
  if (G.state === 'shop' && window.__shopShot) return { fov: baseFov(), ...window.__shopShot }; // QA: frame cosmetics from any shot
  if (G.state === 'shop' && G.pass) { const port = camera.aspect < 1, a = window.__shopAngle ?? t * 0.45, r = port ? 5.6 : 5.4; return { ds: r * Math.cos(a), lat: r * Math.sin(a), y: 1.75, lds: 0, llat: 0, ly: 1.0, fov: port ? 54 : 42 }; } // the pass: wider, so whole bikes fit above the track
  if (G.state === 'shop') { const port = camera.aspect < 1, a = window.__shopAngle ?? t * 0.45, r = port ? 4.4 : 3.0; return { ds: r * Math.cos(a), lat: r * Math.sin(a), y: port ? 1.8 : 1.62, lds: 0, llat: 0, ly: port ? 1.15 : 1.22, fov: port ? 54 : 42 }; } // the store's turntable (tall enough for balloons and UFOs)
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
  if (G.state === 'run') { const r = 0.014 * clamp(G.v / G.base) + (G.boostT > 0 ? 0.03 : 0); camera.position.y += Math.sin(T * 57) * r + Math.sin(T * 89 + 1) * r * 0.6; camera.position.x += Math.sin(T * 71 + 2) * r * 0.5; } // road buzz: more the faster you go
  camera.lookAt(tmp2);
  camera.fov = p.fov; camera.updateProjectionMatrix();
  updateShadowCam(G.R.root.position);
}
function runCamera(dt) {
  let shot = chaseShot();
  G.akK = damp(G.akK || 0, G.akira ? 1 : 0, 3, dt);
  if (G.akK > 0.002) { const h = halfAt(G.s); shot = orbitMix(shot, { ds: 7, lat: -(h - 1.2), y: 0.9, lds: 1, llat: G.lat + 0.8, ly: 1.0, fov: baseFov() - 2 }, smooth(clamp(G.akK)), 5); }
  if (G.camK > 0.002) { G.lastAir = G.airKind || G.lastAir; shot = orbitMix(shot, jumpShot(), smooth(clamp(G.camK)), 4.5); }
  G.barsK = damp(G.barsK || 0, G.tumbleT > 0 && G.tumbleKind === 'bars' ? 1 : 0, 4, dt); if (G.barsK > 0.01) shot = { ...shot, lds: shot.lds + 2.4 * G.barsK, ly: shot.ly - 0.4 * G.barsK, ds: shot.ds + (shot.ds > 0 ? 2.4 : -1) * G.barsK }; // keep the thrown rider in frame, not just the bike
  const ec = EV.camera(); if (ec.shot) G.evShot = ec.shot; G.evK = damp(G.evK || 0, ec.w, 2.4, dt);
  if (G.evK > 0.002 && G.evShot) shot = orbitMix(shot, G.evShot, smooth(clamp(G.evK)), 4.5);
  applyCam(shot, dt, G.camK > 0.002 ? { scale: 1.8, lookScale: 0.5 } : G.evK > 0.002 ? { scale: 1.3, lookScale: 0.8 } : {});
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
  const built = G.daily ? 'daily:' + G.daily.key : G.order;
  if (restart || !G.world || G.builtFor !== built) { const ld = UI.loading(); progress.onChange = (d, t) => ld.set(t ? d / t : 0); await buildWorld(G.order); G.builtFor = built; UI.remove('load'); }
  else resetRun();
  G.state = 'order';
  Audio.music('chill');
  const def = G.def;
  UI.orderCard({ n: G.daily ? `DAILY · ${G.daily.label}` : G.order, thought: K.introThought(G.daily ? Math.max(1, G.delivered) : G.delivered, mulberry(G.seed)), tip: def.tip, note: def.note, pickup: def.pickup, dropoff: 'Citi Tower · 101 Lake Ave', eta: G.eta, onAccept: () => { Audio.sfx('ding'); UI.remove('order'); countdownGo(); } });
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
  G.state = 'finale'; UI.remove('hud'); hud = null; EV.reset(); // no set-piece banner carries into the building
  finale = new Finale({ renderer, scene, camera, G, Audio, UI, sun, onDone: showResults }); window.__F = finale;
  finale.start();
}
// after a run: a normal order moves the career on; the daily hands back the career order untouched
function leaveRun() { if (G.daily) { G.order = G.careerOrder ?? G.order; G.daily = null; G.builtFor = null; } else { G.order++; store.set('order', G.order); } }
function startDaily() { if (!G.daily) G.careerOrder = G.order; G.daily = dailyInfo(); G.order = DAILY_ORDER; startOrder(); }
window.__startDaily = startDaily;
const SQ = { PERFECT: '🟩', GREAT: '🟦', GOOD: '🟨', OK: '🟧', BAD: '🟥' };
// the copy-paste brag: multi-line, one line per section, a Wordle-style strip on top so a chat can compare at a glance
function shareText({ total, grade, rows, perfect, daily }) {
  const played = rows.filter((x) => x.r), paid = G.fin?.tipPaid || 0;
  const L = [daily ? `🛵 TIP BAIT DAILY · ${daily.label}${daily.tries > 1 ? ` · try #${daily.tries}` : ''}` : `🛵 TIP BAIT · Order #${G.order}`,
    `🏆 ${total.toLocaleString('en-US')} pts · grade ${grade}${perfect ? ' · ⭐ PERFECT RUN' : ''}`,
    played.map((x) => SQ[x.r.badge] || '⬛').join(''), ''];
  for (const x of played) { const lb = String(x.r.label || '').replace(/<[^>]+>/g, ''); L.push(`${SQ[x.r.badge] || '⬛'} ${x.icon} ${x.name}: ${x.r.badge}${lb && lb !== x.r.badge ? ` (${lb})` : ''}`); }
  L.push('', `⏱️ ${UI.fmtTime(G.time)} · 💥 ${G.crashes} crash${G.crashes === 1 ? '' : 'es'} · 🪙 ${G.coins} coins · 🔥 x${G.bestMult || 1} best combo`);
  L.push(perfect ? `🤯 Kyle actually tipped ${UI.money(G.tip)}` : paid > 0 ? `💸 Kyle tipped ${UI.money(paid)} of ${UI.money(G.def.tip)}` : `🙄 Kyle tipped $0.00 of ${UI.money(G.def.tip)}`);
  if (daily) L.push(`${daily.streak > 1 ? `🔥 ${daily.streak}-day streak · ` : ''}same route + same rolls for everyone today`, `👉 hit PLAY DAILY: ${SHARE_URL}`);
  else L.push(`👉 beat it: ${SHARE_URL}`);
  return L.join('\n');
}
window.__shareText = () => G.lastShare;
window.__showResults = (line = 'kinda melted ngl') => showResults(line); // QA: preview the results screen
function showResults(line) {
  G.state = 'results';
  G.delivered++; store.set('delivered', G.delivered);
  if (!G.best || G.time < G.best) { G.best = Math.round(G.time); store.set('best', G.best); }
  // delivery bonuses on top of the live score
  const timeLeft = Math.max(0, G.etaTotal - G.time - (G.fin?.doorT || 0) - (G.fin?.stairT || 0) * 0.5 - (G.fin?.akiraT || 0) - (G.fin?.hallT ?? G.fin?.dogT ?? 0) - (G.fin?.knockT || 0));
  const run = Math.round(G.score), timeB = Math.round(timeLeft * 25), iceB = Math.round(G.ice * 8), cleanB = G.crashes ? 0 : 1000;
  const total = run + timeB + iceB + cleanB;
  const newBest = total > (G.bestScore || 0); if (newBest) { G.bestScore = total; store.set('bestScore', total); }
  G.lastTotal = total;
  Audio.music('chill');
  // per-section success bars + badges (same thresholds decide a perfect run, where Kyle keeps the tip)
  const rated = UI.rateAll({ ...(G.fin || {}), time: G.time, eta: G.etaTotal, timeLeft, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, coins: G.coins, coinsTotal: G.lv?.coins?.length ?? 0, tricks: G.tricks });
  const perfect = !!G.fin?.perfect; // decided by the finale (Finale.isPerfect); the bars use the same rate() thresholds
  // the letter grade is pure gameplay: the average of the section ratings (route length, order and tip don't enter into it)
  const secs = rated.rows.filter((x) => x.r), mean = secs.reduce((a, x) => a + x.r.pct, 0) / Math.max(1, secs.length);
  const grade = perfect || mean >= 0.95 ? 'S' : mean >= 0.82 ? 'A' : mean >= 0.66 ? 'B' : mean >= 0.5 ? 'C' : 'D';
  G.lastGrade = grade;
  let daily = null;
  if (G.daily) { // first clear of the day pays a streak bonus; retries only chase the best score
    const ds = dailyState(), k = G.daily.key, same = ds.key === k, first = !same || !ds.done;
    const prev = (() => { const [y, m, d] = k.split('-').map(Number), t = new Date(y, m - 1, d - 1); return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`; })();
    const nd = { ...ds, key: k, tries: (same ? ds.tries : 0) + 1, best: Math.max(same ? ds.best : 0, total), done: true };
    if (first) { nd.streak = ds.last === prev ? (ds.streak || 0) + 1 : 1; nd.last = k; }
    store.set('daily', nd);
    daily = { ...G.daily, tries: nd.tries, best: nd.best, streak: nd.streak, gain: first ? { coins: 250 + 50 * Math.min(nd.streak - 1, 6), xp: 500 } : null };
  }
  G.lastShare = shareText({ total, grade, rows: rated.rows, perfect, daily });
  UI.results({ next: orderDef(G.order + 1), nextN: G.order + 1, tip: G.tip, promised: G.def.tip, pay: 3.25 + Math.round(G.dist / 100) * 0.25, time: G.time, eta: G.etaTotal, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, order: G.order, line, rows: rated.rows,
    score: { run, timeB, iceB, cleanB, total, grade, newBest, best: G.bestScore, coins: G.coins, tricks: G.tricks, bestMult: G.bestMult || 1, perfect, tipPaid: G.fin?.tipPaid || 0, tipShare: G.fin?.tipShare || 0, fin: G.fin, door: G.fin?.door, stairs: G.fin?.stairs, akira: G.fin?.akira, dog: G.fin?.dog, rival: G.fin?.rival, crane: G.fin?.crane },
    onNext: () => { const wasDaily = !!G.daily; leaveRun(); finale?.dispose(); finale = null; scene.add(G.world); if (wasDaily) { G.world.add(G.R.root); UI.clear(); hud = null; showTitle(); } else startOrder(true); },
    onShare: (btn) => UI.copyText(G.lastShare, daily ? 'Daily copied — drop it in the chat.' : 'Score copied — paste it anywhere.', btn),
    daily });
  // tip-coins → wallet: what you picked up plus a grade bonus (a perfect run pays big)
  const bonus = ({ S: 200, A: 120, B: 70, C: 35, D: 15 }[grade] || 0) + (perfect ? 500 : 0) + (daily?.gain?.coins || 0), got = G.coins - (G.banked || 0), earned = bankCoins(bonus);
  const res = document.querySelector('#results .res');
  if (res) {
    const w = document.createElement('div'); w.className = 'walletline';
    w.innerHTML = `<span>🪙 +${got.toLocaleString('en-US')} coins · +${bonus} ${daily?.gain ? `bonus (daily 🔥${daily.streak})` : 'grade bonus'} → wallet</span><button class="btn ghost shopbtn" id="tomenu">⌂ MAIN MENU</button><button class="btn ghost shopbtn" id="toshop">🛒 STORE</button>`;
    (res.querySelector('.nextup') || res.lastElementChild).before(w);
    const toMenu = (shop) => { leaveRun(); finale?.dispose(); finale = null; scene.add(G.world); G.world.add(G.R.root); UI.clear(); hud = null; showTitle(); if (shop) openStore(); };
    w.querySelector('#toshop').onclick = () => toMenu(true); w.querySelector('#tomenu').onclick = () => toMenu(false);
    const xp = runXP({ rows: rated.rows, grade, perfect, coins: G.coins, dist: G.dist }); if (daily?.gain) { xp.parts.push(['daily', daily.gain.xp]); xp.total += daily.gain.xp; }
    const aw = awardXP(store, xp.total);
    const xw = xpWidget(document.createElement('div'), { before: aw.before, after: aw.after, gained: aw.after - aw.before, parts: xp.parts, sfx: (n, g, r) => Audio.sfx(n, g, r), onOpen: () => { toMenu(false); openPass(); } });
    w.after(xw);
    UI.pouchFly({ from: w.querySelector('span'), before: store.get('wallet', 0) - (got + bonus), after: store.get('wallet', 0), n: Math.min(40, 8 + Math.round((got + bonus) / 15)) });
  }
  void earned;
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
  else if (G.state === 'shop') { titleCamera(T, dt); G.introT = 0; }
  else if (G.state === 'count') { G.introT = (G.introT || 0) + dt; countdownTick(); G.R.ride(0, { lean: 0.28 + 0.14 * clamp(G.introT / 1.8), footDown: 1 - clamp(G.introT / 1.6), look: 0 }); introCamera(dt, G.introT / COUNT); }
  else if (G.state === 'run') { update(dt, T); if (G.state === 'run') { animateLevel(T, dt); runCamera(dt); } }
  if (G.state === 'crashing' || G.state === 'crashed' || G.state === 'ad') { if (G.state === 'crashing') updateCrash(dt); animateLevel(T, 0); applyCam(G.clip ? clipShot() : crashShot(), dt, { scale: G.clip ? 1.2 : 3, snap: !!G.clip && !G.clip.cut && (G.clip.cut = true) });  }
  else if (G.state === 'finale' || G.state === 'results') finale?.update(dt, T);
  // effects run alongside (never in the state chain above: that once swallowed the crash update)
  FX.group.visible = G.state === 'run' || G.state === 'crashing' || G.state === 'crashed' || G.state === 'ad' || G.state === 'paused'; // speed streaks never freeze into the cutscenes
  if (G.world && G.route && (G.state === 'run' || G.state === 'crashing' || G.state === 'crashed')) { const f = G.route.at(G.s); FX.update(dt * (G.state === 'run' ? G.slowmo : 0.4), { rider: G.R.root, boosting: G.state === 'run' && (G.boostT > 0 || !!power('rocket')), cruise: G.state === 'run' ? clamp((G.v / G.base - 0.55) / 0.45) : 0, speed: G.v, fwd: V(f.fx, 0, f.fz), right: V(f.rx, 0, f.rz) }); }
  if (G.state === 'run' && hud) hud.update({ eta: G.eta, etaTotal: G.etaTotal, prog: G.s / G.route.length, ice: G.ice, boost: G.boostCharge, tip: G.tip, speed: power('rocket') ? 1 : G.boostT > 0 ? Math.min(1, 0.4 + G.boostT * 2) : 0.1 * clamp((G.v / G.base - 0.6) / 0.4), score: G.score, mult: G.mult, coins: G.coins, powers: G.powers.filter((p) => p.t > 0) });
  if (G.world) updateRain(T);
  G.cos?.tick(T, { speed: G.state === 'run' ? G.v : 6 });
  // ambience follows where you are: the city while riding (louder + brighter with speed), then the building's rooms
  if (G.state === 'run') { Audio.ambience('city', 1); Audio.ambienceLevel(clamp(G.v / (G.base * 1.75) + (G.boostT > 0 ? 0.25 : 0))); }
  else if (G.state === 'crashing' || G.state === 'crashed' || G.state === 'ad' || G.state === 'paused' || G.state === 'count') Audio.ambience('city', 0.6);
  else if (G.state === 'title' || G.state === 'order') Audio.ambience('city', 0.45);
  else if (G.state === 'finale' && finale) { const ph = finale.phase; Audio.ambience(ph === 'arrive' ? 'city' : /locked|elevator|Locked/.test(ph) ? 'lobby' : ph === 'stairs' ? 'stair' : 'hall', ph === 'arrive' ? 0.7 : 1); if (ph === 'arrive') Audio.ambienceLevel(0.15); }
  else if (G.state === 'results') Audio.ambience('hall', 0.5);
  if (draw && G.state !== 'loading') (finale?.active ? finale.render() : renderer.render(scene, camera));
}

// compile every shader and upload every texture up front, including things that stay hidden until you reach them
// (tourists at intersections, the rival, crane pieces): otherwise the first sight of each costs a hitch mid-turn
function warmup(root) {
  const hidden = []; root.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try { renderer.compile(scene, camera); } catch (e) { console.warn('warmup', e); }
  const seen = new Set(); root.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'emissiveMap', 'alphaMap']) { const t = m[k]; if (t && !seen.has(t) && t.image) { seen.add(t); renderer.initTexture(t); } } });
  for (const o of hidden) o.visible = false;
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
// ---------------------------------------------------------------- wallet + store
// coins you pick up are banked into the wallet when a run ends: delivered (plus a grade bonus), restarted or quit
function bankCoins(bonus = 0) {
  const n = Math.max(0, (G.coins || 0) - (G.banked || 0)) + bonus; G.banked = G.coins || 0;
  if (n) store.set('wallet', store.get('wallet', 0) + n);
  return n;
}
// battle pass XP: a crashed-out / quit run still earns a little (40%, no section ratings)
function partialXP() { const x = runXP({ coins: G.coins || 0, dist: G.dist || 0, partial: true }); if (x.total > 0 && (G.dist || 0) > 20) { awardXP(store, x.total); UI.toast(`+${x.total.toLocaleString('en-US')} XP · battle pass`, 1600); } }
function openPass() {
  if (G.state !== 'title') return;
  Audio.unlock(); UI.remove('title'); G.state = 'shop'; Audio.sfx('pop', 0.7, 1.1);
  G.pass = openBattlePass({ store, cos: G.cos, sfx: (n, g, r) => Audio.sfx(n, g, r), onClose: () => { G.pass = null; viewOffset(false); showTitle(); } });
  viewOffset(true, 'bp');
}
window.__openPass = openPass; window.__xpWidget = xpWidget; // QA
function viewOffset(on, kind = 'shop') { // in the store, slide the picture so the courier stands clear of the panel
  const w = innerWidth, h = innerHeight;
  if (!on) { camera.clearViewOffset(); return; }
  if (kind === 'bp') { // the pass track fills the bottom: centre the courier in the gap between the header and the track
    const hd = document.querySelector('.bp-hd')?.getBoundingClientRect(), tr = document.querySelector('.bp-rows')?.getBoundingClientRect();
    camera.setViewOffset(w, h, 0, hd && tr ? h / 2 - (hd.bottom + tr.top) / 2 : h * 0.2, w, h); return;
  }
  if (w >= h) camera.setViewOffset(w, h, w * 0.2, 0, w, h); else camera.setViewOffset(w, h, 0, h * 0.27, w, h);
}
function openStore() {
  if (G.state !== 'title') return;
  Audio.unlock(); UI.remove('title'); G.state = 'shop'; viewOffset(true); Audio.sfx('pop', 0.7, 1.1);
  const close = () => { viewOffset(false); showTitle(); };
  G.shop = openShop({ store, cos: G.cos, sfx: (n, g, r) => Audio.sfx(n, g, r), onClose: close });
}
window.__openStore = openStore;
function bpReadyCount() { const s = bpState(store), lv = levelOf(s.xp).tier; let n = 0; for (let t = 1; t <= lv; t++) { if (!s.claimed.free.includes(t)) n++; if (s.premium && !s.claimed.prem.includes(t)) n++; } return n; }
function showTitle() {
  G.state = 'title';
  const di = dailyInfo(), ds = dailyState(), today = ds.key === di.key;
  UI.title({ daily: { label: di.label, best: today ? ds.best : 0, done: today && ds.done, streak: ds.streak || 0, live: ds.last === di.key || ds.last === (() => { const t = new Date(); t.setDate(t.getDate() - 1); return dailyKey(t); })() }, onDaily: () => { Audio.unlock(); UI.remove('title'); startDaily(); },
    wallet: store.get('wallet', 0), onShop: openStore, onBP: openPass, bpTier: levelOf(bpState(store).xp).tier, bpReady: bpReadyCount(), bestScore: G.bestScore, best: G.best ? UI.fmtTime(G.best) : null, orders: G.delivered, muted: Audio.muted, onPlay: () => { Audio.unlock(); UI.remove('title'); startOrder(); }, onMute: () => { Audio.unlock(); Audio.setMuted(!Audio.muted); return Audio.muted; } });
}
requestAnimationFrame(frame);
boot();
