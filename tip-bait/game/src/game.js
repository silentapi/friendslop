// TIP BAIT — mobile web game. Deliver an iced caramel macchiato through real Downtown Orlando to Kyle S at
// Citi Tower (101 Lake Ave, floor 20). Swipe lanes, jump, hit boost pads and ramps, crash → watch an ad →
// continue from where you were. Kyle takes the tip anyway.
import { THREE, V, clamp, lerp, damp, seg, smooth, easeOut, loadJSON, loadTex, tex, progress, mulberry } from './core.js';
import { Route } from './route.js';
import * as City from './city.js';
import { citiTower } from './citi.js';
import { rider } from './rider.js';
import { buildLevel, populate, LANES } from './level.js';
import { Audio } from './audio.js';
import * as UI from './ui.js';
import { Finale } from './finale.js';

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
const orderDef = (n) => { const o = ORDERS[(n - 1) % ORDERS.length]; return { ...o, tip: o.tip * (1 + Math.floor((n - 1) / ORDERS.length)) }; };

// ---------------------------------------------------------------- renderer + scene
const canvas = document.getElementById('gl');
const TOUCH_EARLY = () => matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.15, 1600);
const hemi = new THREE.HemisphereLight(0xe2ecff, 0x8f7c66, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2bc, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH_EARLY() ? 1024 : 2048, TOUCH_EARLY() ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 400 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
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
};
window.__G = G; // debug / QA hook

const sky = { tex: null, env: null };
async function initSky() {
  const t = await loadTex('tex/sky.jpg', { repeat: false });
  t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  sky.tex = t; scene.background = t; scene.backgroundIntensity = 0.95;
  const pm = new THREE.PMREMGenerator(renderer); sky.env = pm.fromEquirectangular(t).texture; scene.environment = sky.env; scene.environmentIntensity = 0.55; pm.dispose();
  scene.fog = new THREE.Fog(0xcdbba6, 160, 700);
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
  City.buildings(world, cityData);
  G.streetInfo = City.streets(world, cityData, route);
  const skip = [];
  G.rail = G.def.route === 'sunrail' ? City.sunrail(world, cityData, route) : null;
  if (G.rail) skip.push([G.rail.s - 30, G.rail.s + 30]);
  if (G.def.route === 'orange') City.starbucks(world, route, 4, 1);
  await City.dressing(world, route, G.streetInfo, skip);
  G.citi = await citiTower(world);
  G.lv = await buildLevel(world, route, { order: n, cross: G.streetInfo.cross, rail: G.rail, storm: G.def.storm });
  G.pop = await populate(world, route, G.lv);
  if (!G.R) { G.R = await rider(); }
  world.add(G.R.root);
  setWeather(G.def.storm);
  resetRun();
}
function setWeather(storm) {
  scene.backgroundIntensity = storm ? 0.45 : 0.95; scene.environmentIntensity = storm ? 0.35 : 0.55;
  sun.intensity = storm ? 0.5 : 2.6; hemi.intensity = storm ? 0.75 : 1.05;
  scene.fog.color.set(storm ? 0x6d757e : 0xcdbba6); scene.fog.near = storm ? 40 : 160; scene.fog.far = storm ? 320 : 700;
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
  G.s = atS; G.lat = 0; G.lane = 1; G.y = 0; G.vy = 0; G.v = 0; G.runT = 0; G.boostT = 0; G.slowT = 0; G.invT = 0; G.crashT = 0; G.slowmo = 1; G.cine = 0;
  if (atS === 0) {
    G.base = Math.min(18, 12.5 + (G.order - 1) * 0.9);
    G.eta = Math.round(G.route.length / (G.base * 0.9) + 10); G.etaTotal = G.eta; G.time = 0; G.ice = 100; G.crashes = 0; G.nearMiss = 0; G.boostCharge = 0.34; G.tip = G.def.tip; G.dmDone = new Set();
    for (const o of G.lv.obs) { o.dead = false; o.s0 ??= o.s; o.s = o.s0; o.lat0 ??= o.lat; o.lat = o.lat0; o.passed = false; }
    for (const ic of G.lv.ice) ic.got = false;
    for (const w of G.pop.walkers) w.t = null;
    G.trainCab = null; G.trainGone = false;
  }
  const R = G.R; R.C.root.rotation.set(0, 0, 0); R.bike.rotation.set(0, 0, 0); R.root.visible = true;
}

// ---------------------------------------------------------------- input: swipes, taps, keys
const input = { x0: 0, y0: 0, t0: 0, active: false };
function onSwipe(dir) {
  if (G.state !== 'run') return;
  UI.toastHide?.();
  if (dir === 'L') G.lane = Math.max(0, G.lane - 1), Audio.sfx('whoosh', 0.35, 1.6);
  if (dir === 'R') G.lane = Math.min(2, G.lane + 1), Audio.sfx('whoosh', 0.35, 1.6);
  if (dir === 'U' && G.y <= 0.02) { G.vy = 7.2; Audio.sfx('pop', 0.6, 0.7); }
  if (dir === 'D') useBoost();
  G.hintT = 0; G.swiped = true;
}
canvas.parentElement.addEventListener('pointerdown', (e) => { Audio.unlock(); input.active = true; input.x0 = e.clientX; input.y0 = e.clientY; input.t0 = performance.now(); input.fired = false; }, { passive: true });
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
  if (G.state === 'crashed' && k === 'enter') { document.getElementById('ad')?.click(); return; }
  if (G.state === 'crashed' && k === 'r') { document.getElementById('rs')?.click(); return; }
  if (G.state === 'results' && k === 'enter') { document.getElementById('next')?.click(); return; }
  if (k === 'm') { Audio.unlock(); Audio.setMuted(!Audio.muted); UI.toast(Audio.muted ? 'Sound off' : 'Sound on', 900); return; }
  if (['arrowleft', 'a'].includes(k)) onSwipe('L'); else if (['arrowright', 'd'].includes(k)) onSwipe('R');
  else if (['arrowup', 'w', ' '].includes(k)) onSwipe('U'); else if (['arrowdown', 's', 'shift'].includes(k)) onSwipe('D');
  if (G.state !== 'run' && k === ' ') e.preventDefault();
});
function useBoost() { if (G.boostCharge >= 1 && G.state === 'run') { G.boostCharge = 0; startBoost('BOOST!'); } }
function startBoost(label) { G.boostT = 2.2; UI.pop(label, '2× speed'); Audio.sfx('boom', 0.6); Audio.sfx('whoosh', 0.9, 0.8); navigator.vibrate?.(30); }

// ---------------------------------------------------------------- run update
const tmp = V(), tmp2 = V(), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), UP = V(0, 1, 0), ONE = V(1, 1, 1);
const DMS = [[0.08, 'where r u'], [0.3, 'i can see u on the map 👀'], [0.55, 'my ice is melting 😤'], [0.78, 'hurry up i have a zoom call'], [0.93, 'fl 20. elevators r broken btw']];
function rampHeight(s, lat) {
  let best = 0;
  for (const r of G.lv.ramps) { const ds = s - (r.s - 1.7); if (ds >= 0 && ds <= 3.4 && Math.abs(lat - r.lat) < 1.15) best = Math.max(best, 1.1 * ds / 3.4); }
  return best;
}
function update(dt, t) {
  const R = G.R, route = G.route, L = route.length;
  const sdt = dt * G.slowmo;
  G.time += dt; G.eta -= dt;
  G.ice = Math.max(0, G.ice - sdt * (G.def.storm ? 0.9 : 1.15));
  // speed
  G.boostT = Math.max(0, G.boostT - sdt); G.slowT = Math.max(0, G.slowT - sdt); G.invT = Math.max(0, G.invT - sdt);
  const target = G.base * (G.boostT > 0 ? 1.75 : 1) * (G.slowT > 0 ? 0.6 : 1) * smooth(seg(G.runT, 0, 1.2));
  G.runT += sdt;
  G.v = damp(G.v, target, G.boostT > 0 ? 6 : 2.5, sdt);
  G.s = Math.min(L, G.s + G.v * sdt); G.dist += G.v * sdt;
  // lanes + jump + ramps
  const tl = LANES[G.lane]; const prevLat = G.lat; G.lat = damp(G.lat, tl, 13, sdt); const latV = (G.lat - prevLat) / Math.max(1e-4, sdt);
  const rh = rampHeight(G.s, G.lat);
  G.vy -= 24 * sdt; G.y += G.vy * sdt;
  if (G.y <= rh) {
    if (G.onRamp && rh === 0 && G.lastRh > 0.9) { // left the lip → launch
      G.vy = 9.2; G.y = G.lastRh; Audio.sfx('whoosh', 1, 0.7); UI.pop('AIR TIME!', '+$0.00');
      const rr = G.lv.ramps.find((r) => Math.abs(G.s - (r.s + 1.7)) < 2 && Math.abs(G.lat - r.lat) < 1.2);
      if (rr?.rail) { G.cine = 1.25; G.slowmo = 0.42; Audio.rate(0.7); }
    } else { if (G.vy < -6) Audio.sfx('step', 1.2, 0.6); G.y = rh; G.vy = Math.max(0, G.vy); }
  }
  G.onRamp = rh > 0; G.lastRh = rh;
  if (G.cine > 0) { G.cine -= dt; G.slowmo = G.cine > 0.25 ? 0.42 : damp(G.slowmo, 1, 8, dt); if (G.cine <= 0) { G.slowmo = 1; Audio.rate(1); } }
  // pads, ice, puddles
  for (const p of G.lv.pads) if (!p.hitAt || G.time - p.hitAt > 3) { if (Math.abs(G.s - p.s) < 2.5 && Math.abs(G.lat - p.lat) < 1.1 && G.y < 0.3) { p.hitAt = G.time; startBoost('BOOST PAD!'); } }
  for (const ic of G.lv.ice) if (!ic.got && Math.abs(G.s - ic.s) < 1.0 && Math.abs(G.lat - ic.lat) < 0.9 && Math.abs(G.y + 0.9 - ic.y) < 1.0) { ic.got = true; G.ice = Math.min(100, G.ice + 6); G.boostCharge = Math.min(1, G.boostCharge + 0.06); Audio.sfx('ice', 0.7, 1 + Math.random() * 0.2); }
  for (const p of G.lv.puddles) if (Math.abs(G.s - p.s) < 1.4 && Math.abs(G.lat - p.lat) < 1.2 && G.y < 0.2 && G.slowT <= 0) { G.slowT = 0.8; Audio.sfx('splash', 0.8); UI.pop('SPLASH', 'slowed down'); }
  // obstacles: moving traffic, buses pulling out, tourists crossing, the train
  for (const o of G.lv.obs) {
    if (o.dead) continue;
    if (o.v && o.kind !== 'bus') o.s += o.v * sdt;
    if (o.kind === 'bus') { if (o.s - G.s < 42 && !o.t0) o.t0 = G.time; if (o.t0) { o.lat = lerp(o.lat0, o.pull, smooth(seg(G.time - o.t0, 0, 1.4))); o.s += o.v * sdt; } }
  }
  for (const w of G.pop.walkers) {
    if (w.t == null && w.s - G.s < 75) w.t = 0;
    if (w.t != null) w.t += sdt;
    const k = w.t == null ? 0 : Math.max(0, w.t - w.delay);
    w.lat = w.lat0 + w.dir * w.speed * k;
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
        if (G.boostT > 0 && (o.kind === 'cone' || o.kind === 'barrier')) { o.dead = true; UI.pop('SMASH!', ''); Audio.sfx('crash', 0.5, 1.6); continue; }
        return crash(o.kind);
      }
      if (!o.passed && o.s < G.s - o.len / 2 - 0.7) { o.passed = true; const dl = Math.abs(o.lat - G.lat); if ((o.kind === 'car' || o.kind === 'bus') && dl < 3.0) { G.nearMiss++; G.boostCharge = Math.min(1, G.boostCharge + 0.34); UI.pop('NEAR MISS', '+boost'); Audio.sfx('whoosh', 0.9, 1.2); } }
    }
    for (const w of G.pop.walkers) if (Math.abs(w.s - G.s) < 0.9 && Math.abs(w.lat - G.lat) < 0.6 && G.y < 1.5) return crash('tourist');
    if (G.rail && G.trainCab != null && G.trainCab < 1.6 && G.trainCab > -78 && Math.abs(G.s - G.rail.s) < 2.2 && G.y < 4.8) return crash('train');
  }
  // DMs + places
  const prog = G.s / L;
  for (const [p, text] of DMS) if (prog > p && !G.dmDone.has(p)) { G.dmDone.add(p); UI.dm(text); Audio.sfx('pop', 0.7); }
  for (const st of route.streets) if (G.s > st.s0 + 2 && !G.dmDone.has(st.name)) { G.dmDone.add(st.name); UI.place(st.name, 'Downtown Orlando'); }
  if (G.rail && G.s > G.rail.s - 60 && !G.dmDone.has('station')) { G.dmDone.add('station'); UI.place('Church Street Station', 'SunRail · since 1889', 3000); Audio.sfx('bell', 0.8); }
  if (G.s >= L - 0.5) return arrive();
  // rider pose
  const f = route.at(G.s);
  R.root.position.copy(route.world(G.s, G.lat, G.y));
  R.root.rotation.set(0, f.yaw, 0);
  const curve = route.curve(G.s);
  R.ride(G.dist, { lean: 0.42 + (G.boostT > 0 ? 0.12 : 0), bank: clamp(-latV * 0.05 - curve * G.v * G.v * 0.012, -0.45, 0.45), stand: G.y > 0.3 ? 0.6 : 0, look: G.y > 0.3 ? 0.15 : 0 });
  R.root.visible = G.invT <= 0 || Math.floor(G.invT * 12) % 2 === 0;
}
function crash(kind) {
  G.state = 'crashing'; G.crashT = 0; G.crashes++; G.crashAt = G.s; G.crashKind = kind;
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
  for (const w of G.pop.walkers) if (Math.abs(w.s - at) < 28) w.lat = 40;
  const keep = { time: G.time, eta: G.eta, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, boostCharge: G.boostCharge, dist: G.dist, dmDone: G.dmDone, trainCab: G.trainCab, trainGone: G.trainGone };
  resetRun(at); Object.assign(G, keep);
  G.invT = 2.0; G.runT = 0.6; G.v = G.base * 0.6;
  G.state = 'run'; Audio.music('full'); UI.dm('?? anyway hurry');
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
  for (const o of P.buses) { const f = route.at(o.s); route.world(o.s, o.lat, 0, o.mesh.position); o.mesh.rotation.y = f.yaw + (o.t0 ? 0.08 * Math.sin(Math.PI * seg(G.time - o.t0, 0, 1.4)) * Math.sign(o.pull - o.lat0) : 0); o.mesh.visible = !o.dead; }
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
    const walking = w.t != null && w.t > w.delay;
    w.c.root.rotation.y = f.yaw + (walking ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI);
    w.c.pose(walking ? [['walk', w.ph + (w.t || 0) * 0.85]] : [['point', 0.5 + (t % 2)]]);
  }
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

// ---------------------------------------------------------------- camera
const camPos = V(), camLook = V();
function runCamera(dt, snap = false) {
  const route = G.route, b = G.boostT > 0 ? 1 : 0;
  const wide = camera.aspect >= 1;
  const back = (wide ? 7.2 : 8.2) + b * 1.4, up = (wide ? 3.3 : 4.1) + G.y * 0.45;
  route.world(G.s - back, G.lat * 0.7, up, tmp);
  route.world(G.s + (wide ? 9 : 7), G.lat * 0.55, (wide ? 1.4 : 1.0) + G.y * 0.5, tmp2);
  if (G.cine > 0) { // SunRail jump: swing out to the side, low, slow-mo
    const k = smooth(clamp((1.25 - G.cine) / 0.3)) * smooth(clamp(G.cine / 0.3));
    const side = route.world(G.s + 2, G.lat + 8, 1.4, V());
    tmp.lerp(side, k); tmp2.lerp(route.world(G.s, G.lat, 1.4 + G.y, V()), k);
  }
  if (snap) { camPos.copy(tmp); camLook.copy(tmp2); }
  camPos.x = damp(camPos.x, tmp.x, 9, dt); camPos.y = damp(camPos.y, tmp.y, 6, dt); camPos.z = damp(camPos.z, tmp.z, 9, dt);
  camLook.lerp(tmp2, 1 - Math.exp(-12 * dt));
  camera.position.copy(camPos);
  if (G.shake > 0) { G.shake -= dt; camera.position.x += (Math.random() - 0.5) * G.shake * 0.6; camera.position.y += (Math.random() - 0.5) * G.shake * 0.6; }
  camera.lookAt(camLook);
  const fov = baseFov() + b * 12;
  camera.fov = damp(camera.fov, fov, 5, dt); camera.updateProjectionMatrix();
  // keep the sun's shadow frustum on the player
  sun.target.position.copy(G.R.root.position); sun.position.copy(G.R.root.position).addScaledVector(SUN_DIR, 120);
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
  UI.orderCard({ tip: def.tip, note: def.note, pickup: def.pickup, dropoff: 'Citi Tower · 101 Lake Ave', eta: G.eta, onAccept: () => { Audio.sfx('ding'); UI.remove('order'); countdownGo(); } });
  Audio.sfx('ding', 0.8);
}
function countdownGo() {
  G.state = 'count'; hud = UI.hud(); hud.onBoost(useBoost); hud.hint(true);
  let n = 3; const step = () => { if (n > 0) { UI.countdown(n); Audio.sfx('pop', 0.8, 0.8 + (3 - n) * 0.15); n--; setTimeout(step, 600); } else { UI.countdown('GO!'); Audio.sfx('boom', 0.7); Audio.music('full'); G.state = 'run'; G.runT = 0; setTimeout(() => hud?.hint(false), 4200); } };
  step();
}
let finale = null;
function arrive() {
  G.state = 'finale'; UI.remove('hud'); hud = null;
  finale = new Finale({ renderer, scene, camera, G, Audio, UI, sun, onDone: showResults });
  finale.start();
}
function showResults(line) {
  G.state = 'results';
  G.delivered++; store.set('delivered', G.delivered);
  if (!G.best || G.time < G.best) { G.best = Math.round(G.time); store.set('best', G.best); }
  Audio.music('chill');
  UI.results({ tip: G.tip, pay: 3.25 + Math.round(G.dist / 100) * 0.25, time: G.time, eta: G.etaTotal, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, order: G.order, line,
    onNext: () => { G.order++; store.set('order', G.order); finale?.dispose(); finale = null; scene.add(G.world); startOrder(); },
    onShare: () => { const txt = `Kyle S promised me a ${UI.money(G.tip)} tip and took it back. Again. 🙄 Delivered on Lake Ave in ${UI.fmtTime(G.time)}. tag your Kyle 👇 #TIPBAIT`; navigator.clipboard?.writeText(txt).then(() => UI.toast('Copied. Go tag your Kyle.'), () => UI.toast(txt, 4000)); } });
}

// ---------------------------------------------------------------- title: slow orbit at the start of the route
function titleCamera(t) {
  const route = G.route, p = route.world(2, 0, 0);
  const a = t * 0.12 + 2.2;
  camera.position.set(p.x + Math.sin(a) * 9, 3.4, p.z + Math.cos(a) * 9); camera.lookAt(p.x, 1.4, p.z);
  camera.fov = baseFov(); camera.updateProjectionMatrix();
  sun.target.position.copy(p); sun.position.copy(p).addScaledVector(SUN_DIR, 120);
  const f = route.at(2); G.R.root.position.copy(p); G.R.root.rotation.set(0, f.yaw, 0);
  G.R.ride(0, { lean: 0.28, footDown: 1, look: -0.2 });
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), T = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  frameMs = frameMs * 0.95 + (dt * 1000) * 0.05;
  if (now - lastQ > 2500 && G.state === 'run') { lastQ = now; const nq = frameMs > 24 ? Math.max(0.55, quality - 0.15) : frameMs < 15 && quality < 1 ? Math.min(1, quality + 0.1) : quality; if (nq !== quality) { quality = nq; resize(); } }
  if (G.state === 'title' || G.state === 'order') titleCamera(T);
  else if (G.state === 'count') { titleCamera(T); }
  else if (G.state === 'run') { update(dt, T); if (G.state === 'run') { animateLevel(T, dt); runCamera(dt); } }
  else if (G.state === 'crashing' || G.state === 'crashed' || G.state === 'ad') { if (G.state === 'crashing') updateCrash(dt); animateLevel(T, 0); runCamera(dt * 0.3); }
  else if (G.state === 'finale' || G.state === 'results') finale?.update(dt, T);
  if (G.state === 'run' && hud) hud.update({ eta: G.eta, prog: G.s / G.route.length, ice: G.ice, boost: G.boostCharge, tip: G.tip, speed: G.boostT > 0 ? Math.min(1, G.boostT * 2) : 0 });
  if (G.world) updateRain(T);
  if (G.state !== 'loading') (finale?.active ? finale.render() : renderer.render(scene, camera));
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
  UI.title({ best: G.best ? UI.fmtTime(G.best) : null, orders: G.delivered, muted: Audio.muted, onPlay: () => { Audio.unlock(); UI.remove('title'); startOrder(); }, onMute: () => { Audio.unlock(); Audio.setMuted(!Audio.muted); return Audio.muted; } });
  window.__ready = true;
}
requestAnimationFrame(frame);
boot();
