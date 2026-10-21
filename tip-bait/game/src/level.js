// Level content along a route: obstacles, boost pads, ramps, ice cubes, tourist crossings, the SunRail crossing.
// Everything lives in route space (s along the street, lat across it: lanes at -2.6 / 0 / +2.6).
import { THREE, BGU, V, mat, lam, mesh, box, cyl, mulberry, loadGLB, canvasTex, clamp, floatGeo } from './core.js';
import { character } from './chars.js';

export const LANES = [-2.4, 0, 2.4];
const CAR_PAINT = [0xb8152a, 0xf2f2f0, 0x1b1d22, 0x2a4f8a, 0x8a8f96, 0x0e5c4a, 0xd9a21b];

// Build per-part InstancedMeshes from a glTF scene so N copies cost one draw call per part.
function instancer(src, count, { length = null, height = null, paint = null } = {}) {
  src.updateMatrixWorld(true);
  const parts = [];
  src.traverse((o) => { if (o.isMesh) parts.push({ geo: floatGeo(o.geometry).applyMatrix4(o.matrixWorld), mat: o.material }); });
  const bb = new THREE.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); bb.union(p.geo.boundingBox); }
  const size = bb.getSize(V()), k = length ? length / Math.max(size.x, size.z) : height ? height / size.y : 1;
  const fix = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2));
  const meshes = parts.map((p) => {
    p.geo.applyMatrix4(fix);
    let m = p.mat;
    const n = (m.name || '').toLowerCase();
    const isPaint = paint && (/paint|body|exterior/.test(n) || (m.metalness > 0.3 && !/chrome|glass|window|tire|rim|light/.test(n)));
    if (isPaint) { m = m.clone(); m.color = new THREE.Color(0xffffff); }
    const im = new THREE.InstancedMesh(p.geo, m, count);
    if (isPaint) for (let i = 0; i < count; i++) im.setColorAt(i, new THREE.Color(paint[i % paint.length]));
    im.castShadow = true; im.frustumCulled = false;
    return im;
  });
  const sz = size.multiplyScalar(k);
  return { meshes, size: sz, set(i, m4) { for (const m of meshes) m.setMatrixAt(i, m4); }, commit() { for (const m of meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } } };
}

function lynxBusMesh() {
  const g = new THREE.Group();
  const liv = canvasTex('lynx', 1024, 256, (c, w, h) => {
    c.fillStyle = '#f2f2f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#10141c'; c.fillRect(30, 35, w - 60, 95);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c4005e'); gr.addColorStop(1, '#ff3d8f');
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, 190); c.bezierCurveTo(w * 0.3, 150, w * 0.6, 235, w, 165); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#fff'; c.font = '900 60px system-ui'; c.fillText('LYNX', w * 0.66, 235);
  });
  const rear = canvasTex('lynxrear', 512, 384, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c4005e'); gr.addColorStop(1, '#ff3d8f'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#10141c'; c.fillRect(30, 20, w - 60, 120); c.fillStyle = '#fff'; c.font = '900 96px system-ui'; c.textAlign = 'center'; c.fillText('LYNX', w / 2, 260); c.fillStyle = '#ff2a1a'; c.fillRect(10, 300, 70, 60); c.fillRect(w - 80, 300, 70, 60); });
  const bm = new THREE.MeshLambertMaterial({ map: liv }), rm = new THREE.MeshLambertMaterial({ map: rear }), wm = lam(0xe8e8ee);
  const body = mesh(new THREE.BoxGeometry(2.55, 3.1, 12), [bm, bm, wm, lam(0x222222), wm, rm]); body.position.y = 1.85; g.add(body);
  box(2.35, 1.4, 0.06, lam(0x0c1218), 0, 2.35, 6.02, g);
  for (const [x, z] of [[-1.2, 3.8], [1.2, 3.8], [-1.2, -3.6], [1.2, -3.6]]) { const w = cyl(0.5, 0.5, 0.35, lam(0x0c0c0e), 14, x, 0.5, z, g); w.rotation.z = Math.PI / 2; }
  return g; // faces +z, rear (-z) carries the LYNX ad + tail lights
}

function boostPadTex() {
  const t = canvasTex('boostpad', 128, 256, (c, w, h) => {
    c.fillStyle = '#0a7a35'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8dffbd'; c.lineWidth = 18;
    for (let i = -1; i < 4; i++) { const y = i * 64 + 20; c.beginPath(); c.moveTo(12, y + 40); c.lineTo(w / 2, y); c.lineTo(w - 12, y + 40); c.stroke(); }
    c.strokeStyle = '#e8fff0'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ---------------------------------------------------------------- generation
// Rule-based layout. The street is cut into slots that never overlap: a pattern (with a guaranteed safe lane) is
// always followed by a breather whose coin trail leads you to the next pattern's safe lane. Coins sit on the safe
// line or on real jump trajectories. Traffic waits until you are close, so it meets you where it was placed.
export const PHYS = { G: 24, JUMP: 7.8, RAMP: 9.2, MEGA: 13.5, ACT: 40 };
const CAR = { kind: 'car', len: 4.7, w: 1.9, h: 1.45 };
const TIER = { cars: 1, cones: 1, rampcar: 1, bus: 2, merge: 2, chicane: 2, wall: 3, slalom: 3 };
export async function buildLevel(scene, route, { order, seed = order, cross, rail = null, storm = false }) {
  const r = mulberry(1000 + order * 77 + seed * 7919);
  const ri = (n) => Math.floor(r() * n);
  const d = clamp(0.12 + (order - 1) / 5); // difficulty 0..1
  const L = route.length, vb = Math.min(18.5, 13.2 + (order - 1) * 0.9); // the player's base speed this order
  const obs = [], pads = [], ramps = [], ice = [], puddles = [], groups = [], coins = [], pickups = [], slots = [];
  const railS = rail ? rail.s : -999;
  const start = 40, end = L - 50;
  // --- coin helpers: ground coins ride at the collection height; air coins follow the actual jump physics
  const ground = (s0, li, n, gap = 2.2) => { for (let k = 0; k < n; k++) coins.push({ s: s0 + k * gap, lat: LANES[li], y: 0.9 }); };
  const arc = (s0, li, vy, y0, v, n, every = 0.08) => { for (let k = 1; k <= n; k++) { const t = k * every, y = y0 + vy * t - PHYS.G / 2 * t * t; if (y < 0.2) break; coins.push({ s: s0 + v * t, lat: LANES[li], y: y + 0.9, air: true }); } };
  // moving traffic: placed so that it meets the player at sMeet (it only starts driving within ACT metres)
  const mover = (sMeet, li, v, extra = {}) => { const drift = v * PHYS.ACT / Math.max(4, vb - v); obs.push({ ...CAR, s: sMeet - drift, lat: LANES[li], v, ...extra }); };
  // --- fixed set pieces first, each reserves its stretch of street
  const reserve = (s0, s1, kind, safe = null) => slots.push({ s0, s1, kind, safe });
  const free = (s0, s1) => s0 > start - 1 && s1 < end + 1 && !slots.some((q) => s0 < q.s1 + 2 && s1 > q.s0 - 2);
  for (const c of cross.filter((c) => c > start + 30 && c < end && Math.abs(c - railS) > 50).slice(0, 1 + Math.round(d * 2))) { const safe = ri(3); groups.push({ s: c, n: 3 + Math.round(r() + d * 2), seed: r(), safe }); ground(c - 14, safe, 13); reserve(c - 16, c + 16, 'tourists', safe); }
  if (rail) { ramps.push({ s: railS - 13, lat: 0, rail: true }); pads.push({ s: railS - 40, lat: 0 }); obs.push({ kind: 'gate', s: railS - 6, lat: 0, len: 0.6, w: 9, h: 1.25, v: 0 }); arc(railS - 13 + 1.7, 1, PHYS.RAMP, 1.1, vb, 14, 0.09); ground(railS - 36, 1, 8); reserve(railS - 46, railS + 30, 'rail', 1); }
  let megaS = start + (end - start) * (0.42 + r() * 0.2);
  for (let k = 0; k < 8 && !free(megaS - 36, megaS + 34); k++) megaS += 37;
  if (free(megaS - 36, megaS + 34)) {
    const s = megaS, vm = vb * 1.15;
    pads.push({ s: s - 22, lat: 0 });
    ramps.push({ s, lat: 0, mega: true, len: 5, h: 1.8 });
    obs.push({ kind: 'bus', s: s + 14, lat: 0, len: 12, w: 2.6, h: 3.1, v: 0, pull: 0, parked: true });
    for (const li of [0, 2]) obs.push({ kind: 'jersey', s: s + 10, lat: LANES[li], len: 0.8, w: 2.2, h: 1.4, v: 0 }, { kind: 'jersey', s: s + 18, lat: LANES[li], len: 0.8, w: 2.2, h: 1.4, v: 0 });
    ground(s - 34, 1, 5); arc(s + 2.5, 1, PHYS.MEGA, 1.8, vm, 16, 0.075);
    reserve(s - 36, s + 34, 'mega', 1);
  }
  // --- the pattern library. Each returns its footprint length and the lane that is safe the whole way through.
  const P = {
    cars(s, safe) { const n = r() < 0.5 + d * 0.4 ? 2 : 1, lanes = [0, 1, 2].filter((l) => l !== safe).sort(() => r() - 0.5).slice(0, n), v = 3 + r() * 3; lanes.forEach((li, k) => mover(s + k * 7, li, v)); ground(s - 2, safe, 8); return 12; },
    cones(s, safe) { const blocked = [0, 1, 2].filter((l) => l !== safe); for (const li of blocked) obs.push({ kind: r() < 0.5 ? 'cone' : 'barrier', s, lat: LANES[li], len: 0.6, w: 1.2, h: 0.75, v: 0 }); const jl = blocked[ri(blocked.length)]; arc(s - 3.6, jl, PHYS.JUMP, 0, vb, 8, 0.075); return 4; },
    rampcar(s, safe) { const li = [0, 1, 2].filter((l) => l !== safe)[ri(2)]; ramps.push({ s, lat: LANES[li] }); obs.push({ ...CAR, s: s + 11, lat: LANES[li], v: 0 }); arc(s + 1.7, li, PHYS.RAMP, 1.1, vb, 14, 0.07); ground(s - 12, li, 4); if (d > 0.3 && r() < 0.5) obs.push({ kind: 'cone', s: s + 4, lat: LANES[3 - li - safe], len: 0.6, w: 1.2, h: 0.75, v: 0 }); return 16; },
    bus(s, safe) { const li = safe === 0 ? 2 : safe === 2 ? 0 : (r() < 0.5 ? 0 : 2); obs.push({ kind: 'bus', s, lat: LANES[li] + (li ? 1.2 : -1.2), len: 12, w: 2.6, h: 3.1, v: 4, pull: LANES[li], t0: null }); ground(s - 6, safe, 7); return 22; },
    merge(s, safe) { const a = safe === 1 ? (r() < 0.5 ? 0 : 2) : safe; const v = 4 + r() * 1.5; obs.push({ ...CAR, merge: true, s: s - v * PHYS.ACT / (vb - v), lat: LANES[a], to: LANES[1], v, t0: null, meet: s }); if (r() < 0.3 + d * 0.5) mover(s + 4, 2 - a, 4); ground(s + 7, a, 5); return 14; },
    chicane(s, safe) { const b = safe === 1 ? (r() < 0.5 ? 0 : 2) : (r() < 0.3 + d * 0.4 ? 2 - safe : 1), gap = lerpN(18, 13, d) * vb / 13.2; for (const [row, keep] of [[s, safe], [s + gap, b]]) for (let li = 0; li < 3; li++) if (li !== keep) obs.push({ kind: 'jersey', s: row, lat: LANES[li], len: 0.8, w: 2.2, h: 1.4, v: 0 }); ground(s - 4, safe, 3); ground(s + gap - 3, b, 3); return { len: gap + 2, exit: b }; },
    wall(s, safe) { for (let li = 0; li < 3; li++) obs.push({ kind: 'barrier', s, lat: LANES[li], len: 0.6, w: 1.2, h: 0.8, v: 0, wall: true }); const carL = [0, 1, 2].filter((l) => l !== safe)[ri(2)]; obs.push({ ...CAR, s: s + 17, lat: LANES[carL], v: 0 }); arc(s - 3.6, safe, PHYS.JUMP, 0, vb, 8, 0.075); ground(s + 8, safe, 5); return 22; },
    slalom(s, safe) { const gap = lerpN(17, 13, d) * vb / 13.2; [safe, 2 - safe, safe].forEach((fl, k) => { for (let li = 0; li < 3; li++) if (li !== fl) obs.push({ kind: k === 1 ? 'barrier' : 'cone', s: s + k * gap, lat: LANES[li], len: 0.6, w: 1.2, h: 0.75, v: 0 }); ground(s + k * gap - 2, fl, 2); }); return { len: gap * 2 + 2, exit: safe }; },
  };
  // --- walk the street: breather (coins lead you to the next safe lane) → pattern → breather → ...
  let s = start, lane = 1, last = '', sinceSet = 99, count = 0;
  const pool = (p) => { const tmax = p < 0.15 ? 1 : p < 0.45 ? 2 : 3; return Object.keys(TIER).filter((k) => TIER[k] <= tmax + (d > 0.5 ? 1 : 0) && k !== last); };
  while (s < end) {
    const p = (s - start) / (end - start);
    const breath = lerpN(26, 15, clamp(d + p * 0.4)) * vb / 13.2 + r() * 6;
    const kind = pool(p)[ri(pool(p).length)];
    const near = (q) => Math.abs(q - lane);
    const SIDE = kind === 'merge' || kind === 'slalom';
    let safe = SIDE ? (lane === 1 ? (r() < 0.5 ? 0 : 2) : breath < 18 ? lane : [0, 2][ri(2)]) : ri(3);
    if (breath < 18 && near(safe) > 1) safe = SIDE ? lane : 1;
    const s0 = s + breath;
    if (!free(s - 1, s0 + 30)) { const q = slots.find((q) => s0 + 30 > q.s0 - 2 && s - 1 < q.s1 + 2); if (q) { s = q.s1 + 4; lane = q.safe ?? lane; sinceSet = 0; continue; } }
    // breather: a coin trail (straight, or a lane-weave on easy stretches) that ends in the coming safe lane
    if (breath > 16 && r() < 0.35) { const n = Math.floor((breath - 10) / 2); const ph = Math.asin(clamp((LANES[safe] / 2.4))) - (n - 1) * 0.35; for (let k = 0; k < n; k++) coins.push({ s: s + 3 + k * 2, lat: 2.4 * Math.sin(ph + k * 0.35), y: 0.9 }); }
    else ground(s0 - Math.min(18, breath - 4), safe, Math.max(3, Math.floor(Math.min(18, breath - 6) / 2.2)));
    if (storm && r() < 0.45 && breath > 16) puddles.push({ s: s + breath * 0.4, lat: LANES[[0, 1, 2].filter((l) => l !== safe)[ri(2)]] });
    if (sinceSet > 2 && count % 5 === 3) { const pl = [0, 1, 2].filter((l) => l !== safe)[ri(2)]; pickups.push({ s: s + breath * 0.5, lat: LANES[pl], kind: ['magnet', 'shield', 'cool', 'x2'][ri(4)] }); }
    const res = P[kind](s0, safe);
    const len = typeof res === 'number' ? res : res.len, exit = typeof res === 'number' ? safe : res.exit;
    reserve(s0 - 3, s0 + len + 3, kind, exit);
    s = s0 + len; lane = exit; last = kind; sinceSet++; count++;
  }
  // --- parked-until-close traffic must not spawn on top of anything: slide it forward past what it overlaps
  for (const o of obs) if (o.v > 0 && o.kind === 'car') {
    for (let k = 0; k < 6; k++) { const hit = obs.find((q) => q !== o && !q.v && Math.abs(q.lat - o.lat) < 1.6 && Math.abs(q.s - o.s) < (q.len + o.len) / 2 + 1) || ramps.find((q) => Math.abs(q.lat - o.lat) < 1.6 && Math.abs(q.s - o.s) < (q.len ?? 3.4) / 2 + o.len / 2 + 1); if (!hit) break; o.s = hit.s + ((hit.len ?? 3.4) + o.len) / 2 + 1.5; }
  }
  // --- validation: drop any coin or pickup that overlaps something solid, and report overlapping obstacles
  const hits = (o, c, pad = 0.4) => Math.abs(o.s - c.s) < o.len / 2 + pad && Math.abs(o.lat - c.lat) < o.w / 2 + 0.3;
  const moving = obs.filter((o) => o.v > 0 || o.merge);
  const coinsOk = coins.filter((c) => {
    if (c.s < 8 || c.s > L - 20) return false;
    if (obs.some((o) => !o.v && hits(o, c) && c.y < o.h + 0.5)) return false;            // inside a parked thing
    if (moving.some((o) => Math.abs(o.lat - c.lat) < 1.5 && c.y < 2 && c.s > o.s - 3 && c.s < (o.meet ?? o.s) + 10 && !(o.merge && Math.abs(o.lat - c.lat) < 1 && c.s > (o.meet ?? 0) + 5))) return false; // in a traffic lane
    if (ramps.some((q) => Math.abs(q.s - c.s) < (q.len ?? 3.4) / 2 + 0.6 && Math.abs(q.lat - c.lat) < 1.2 && !c.air)) return false;
    if (obs.some((o) => o.merge && Math.abs(o.to - c.lat) < 1.5 && c.y < 2 && c.s > o.meet - 14 && c.s < o.meet + 12)) return false; // the lane a merging car cuts into
    return true;
  });
  const okPick = pickups.filter((q) => !obs.some((o) => hits(o, q, 3)) && !ramps.some((x) => Math.abs(x.s - q.s) < 6));
  if (typeof window !== 'undefined' && window.__qaLevel) {
    const stat = obs.filter((o) => !o.v);
    for (let i = 0; i < stat.length; i++) for (let j = i + 1; j < stat.length; j++) { const a = stat[i], b = stat[j]; if (a.kind !== 'gate' && b.kind !== 'gate' && Math.abs(a.s - b.s) < (a.len + b.len) / 2 && Math.abs(a.lat - b.lat) < (a.w + b.w) / 2 - 0.2) console.warn('[level] overlap', a.kind, b.kind, a.s.toFixed(1)); }
  }
  return { obs, pads, ramps, ice, puddles, groups, rail, coins: coinsOk, pickups: okPick, slots };
}
const lerpN = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- renderers
export async function populate(scene, route, lv) {
  const out = { scene };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), p = V(), one = V(1, 1, 1);
  const place = (s, lat, y = 0, yawOff = 0, scale = one) => { const f = route.at(s); route.world(s, lat, y, p); q.setFromAxisAngle(up, f.yaw + yawOff); return m4.compose(p, q, scale); };
  // cars
  const cars = lv.obs.filter((o) => o.kind === 'car');
  const tesla = await loadGLB('m/tesla_model_3.glb');
  out.cars = instancer(tesla.scene, Math.max(1, cars.length), { length: 4.7, paint: CAR_PAINT });
  out.cars.meshes.forEach((m) => scene.add(m));
  out.carList = cars;
  // buses
  out.buses = lv.obs.filter((o) => o.kind === 'bus').map((o) => { const b = lynxBusMesh(); scene.add(b); o.mesh = b; return o; });
  // cones + barriers
  const cones = lv.obs.filter((o) => o.kind === 'cone'), bars = lv.obs.filter((o) => o.kind === 'barrier');
  const coneG = BGU.mergeGeometries([new THREE.ConeGeometry(0.28, 0.75, 12).translate(0, 0.4, 0), new THREE.BoxGeometry(0.62, 0.05, 0.62).translate(0, 0.025, 0)]);
  const coneTex = canvasTex('cone', 64, 64, (c, w, h) => { c.fillStyle = '#ff6a00'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 22, w, 10); c.fillRect(0, 40, w, 8); });
  const cim = new THREE.InstancedMesh(coneG, new THREE.MeshLambertMaterial({ map: coneTex }), Math.max(1, cones.length * 3));
  cones.forEach((o, i) => { o.mats = []; for (let k = 0; k < 3; k++) { const m = place(o.s, o.lat + (k - 1) * 0.42).clone(); o.mats.push(m); cim.setMatrixAt(i * 3 + k, m); } });
  cim.castShadow = true; scene.add(cim);
  const barTex = canvasTex('barrier', 256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff6a00'; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, h); c.lineTo(i * 32 - 16, h); c.fill(); } c.fillStyle = '#111'; c.font = '900 26px system-ui'; c.textAlign = 'center'; });
  const barG = BGU.mergeGeometries([new THREE.BoxGeometry(1.5, 0.32, 0.08).translate(0, 0.78, 0), new THREE.BoxGeometry(0.08, 0.95, 0.6).translate(-0.62, 0.47, 0), new THREE.BoxGeometry(0.08, 0.95, 0.6).translate(0.62, 0.47, 0)]);
  const bim = new THREE.InstancedMesh(barG, new THREE.MeshLambertMaterial({ map: barTex }), Math.max(1, bars.length));
  bars.forEach((o, i) => { o.mats = [place(o.s, o.lat, 0, 0, V(1, o.h / 0.95, 1)).clone()]; bim.setMatrixAt(i, o.mats[0]); });
  bim.castShadow = true; scene.add(bim);
  out.statics = [{ mesh: cim, list: cones }, { mesh: bim, list: bars }];
  // concrete jersey barriers (chicanes): too tall to jump
  const jers = lv.obs.filter((o) => o.kind === 'jersey');
  const jTex = canvasTex('jersey', 256, 64, (c, w, h) => { c.fillStyle = '#c9c6bf'; c.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff5a00'; c.fillRect(i * 44 + 6, 8, 40, 20); } c.fillStyle = '#9d9a93'; c.fillRect(0, h - 10, w, 10); });
  const jG = BGU.mergeGeometries([new THREE.BoxGeometry(2.2, 0.85, 0.32).translate(0, 0.875, 0), new THREE.BoxGeometry(2.2, 0.45, 0.7).translate(0, 0.225, 0)]);
  const jim = new THREE.InstancedMesh(jG, new THREE.MeshLambertMaterial({ map: jTex }), Math.max(1, jers.length));
  jers.forEach((o, i) => jim.setMatrixAt(i, place(o.s, o.lat)));
  jim.castShadow = true; scene.add(jim); out.jersey = { mesh: jim, list: jers };
  // turn signals for merging cars (two per car, on the side it's turning toward)
  out.mergers = lv.obs.filter((o) => o.merge);
  out.blink = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), new THREE.MeshBasicMaterial({ color: 0xffb030 }), Math.max(1, out.mergers.length * 2));
  out.blink.frustumCulled = false; scene.add(out.blink);
  const arrowTex = (dir) => canvasTex('merge' + dir, 128, 96, (c, w, h) => { c.translate(w / 2, h / 2); c.scale(dir, 1); c.fillStyle = '#ffa21a'; c.strokeStyle = '#1a1206'; c.lineWidth = 8; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-50, -18); c.lineTo(8, -18); c.lineTo(8, -40); c.lineTo(54, 0); c.lineTo(8, 40); c.lineTo(8, 18); c.lineTo(-50, 18); c.closePath(); c.stroke(); c.fill(); });
  const arrowMat = { 1: new THREE.SpriteMaterial({ map: arrowTex(1), depthTest: false }), [-1]: new THREE.SpriteMaterial({ map: arrowTex(-1), depthTest: false }) };
  for (const o of out.mergers) { o.arrow = new THREE.Sprite(arrowMat[Math.sign(o.to - o.lat)]); o.arrow.scale.set(2.2, 1.6, 1); o.arrow.renderOrder = 5; o.arrow.visible = false; scene.add(o.arrow); }
  // boost pads (scrolling chevrons)
  const padT = boostPadTex();
  const pim = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: padT, transparent: true, opacity: 0.95 }), Math.max(1, lv.pads.length));
  lv.pads.forEach((o, i) => pim.setMatrixAt(i, place(o.s, o.lat, 0.06)));
  scene.add(pim); out.padTex = padT;
  // ramps (orange wedge with chevrons)
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(3.4, 0); sh.lineTo(3.4, 1.1); sh.lineTo(0, 0);
  const rg = new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: false }); rg.translate(-1.7, 0, -1.1); rg.rotateY(-Math.PI / 2);
  const rim = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0x401400 }), Math.max(1, lv.ramps.length));
  lv.ramps.forEach((o, i) => rim.setMatrixAt(i, place(o.s, o.lat, 0, 0, V(o.mega ? 1.15 : 1, (o.h ?? 1.1) / 1.1, (o.len ?? 3.4) / 3.4))));
  rim.castShadow = true; scene.add(rim);
  // ice cubes
  const iceG = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const iim = new THREE.InstancedMesh(iceG, new THREE.MeshStandardMaterial({ color: 0xc8f2ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x2a6a88, emissiveIntensity: 0.6 }), Math.max(1, lv.ice.length));
  iim.frustumCulled = false; scene.add(iim); out.iceMesh = iim;
  // tip coins (spinning gold discs)
  const coinG = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20).rotateX(Math.PI / 2);
  out.coinMesh = new THREE.InstancedMesh(coinG, new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.85, roughness: 0.28, emissive: 0x7a4a00, emissiveIntensity: 0.7 }), Math.max(1, lv.coins.length));
  out.coinMesh.frustumCulled = false; scene.add(out.coinMesh);
  // power-up pickups: glowing badge sprites over a ground ring
  const PU = { magnet: ['🧲', '#ff3d5a'], shield: ['🪖', '#3d8bff'], cool: ['❄️', '#46d8ff'], x2: ['✖2', '#ffc83d'] };
  out.pickMeshes = lv.pickups.map((p) => {
    const [icon, col] = PU[p.kind];
    const t = canvasTex('pu' + p.kind, 128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, '#fff'); g.addColorStop(0.55, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 40, 0, 7); c.fill(); c.font = '900 50px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#111'; c.fillText(icon, 64, 68); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(1.5, 1.5, 1);
    const ring = mesh(new THREE.RingGeometry(0.7, 0.95, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 }), { cast: false });
    const g = new THREE.Group(); g.add(sp, ring); route.world(p.s, p.lat, 0.07, g.position); scene.add(g); p.mesh = g; p.sprite = sp; return g;
  });
  // puddles
  const pud = new THREE.InstancedMesh(new THREE.CircleGeometry(1.4, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.7 }), Math.max(1, lv.puddles.length));
  lv.puddles.forEach((o, i) => pud.setMatrixAt(i, place(o.s, o.lat, 0.055, 0, V(1.2, 1, 0.8))));
  scene.add(pud);
  // tourist groups (Mixamo walkers with mouse ears)
  out.walkers = [];
  const kinds = ['tourist_m', 'tourist_f'];
  const maps = { casualsuit04: 'tex/tourist_m_shirt.jpg', casualsuit02: 'tex/tourist_f_shirt.jpg' };
  for (const g of lv.groups) {
    const rr = mulberry(Math.floor(g.seed * 1e6));
    for (let k = 0; k < g.n; k++) {
      const c = await character(`m/${kinds[k % 2]}.glb`, { maps });
      await c.load('walk', 'point');
      c.attach('Head', mouseEars(), [0, 0.1, 0], [0, 0, 0], 1.5);
      scene.add(c.root);
      // each tourist walks out from the curb and stops in one of the two blocked lanes to take a photo
      const lanesBlocked = [0, 1, 2].filter((l) => l !== g.safe), tl = lanesBlocked[k % 2];
      const from = LANES[tl] < 0 ? -1 : LANES[tl] > 0 ? 1 : (g.safe === 0 ? 1 : -1); // never walk through the open lane
      out.walkers.push({ c, s: g.s + (k - g.n / 2) * 0.9 + (rr() - 0.5) * 0.6, lat0: from * (6 + rr() * 1.5), target: LANES[tl] + (rr() - 0.5) * 0.5, dir: -from, speed: 1.9 + rr() * 0.3, ph: rr() * 3, delay: rr() * 0.4, group: g });
    }
  }
  return out;
}
function mouseEars() {
  const g = new THREE.Group(), blk = lam(0x0c0c0e);
  for (const sx of [-1, 1]) { const e = cyl(0.09, 0.09, 0.025, blk, 16, sx * 0.11, 0.13, 0, g); e.rotation.x = Math.PI / 2; }
  box(0.25, 0.04, 0.06, blk, 0, 0.03, 0, g);
  return g;
}
