// Level content along a route: obstacles, boost pads, ramps, ice cubes, tourist crossings, the SunRail crossing.
// Everything lives in route space (s along the street, lat across it: lanes at -2.6 / 0 / +2.6).
import { THREE, BGU, V, mat, lam, mesh, box, cyl, mulberry, loadGLB, canvasTex, clamp } from './core.js';
import { character } from './chars.js';

export const LANES = [-2.6, 0, 2.6];
const CAR_PAINT = [0xb8152a, 0xf2f2f0, 0x1b1d22, 0x2a4f8a, 0x8a8f96, 0x0e5c4a, 0xd9a21b];

// Build per-part InstancedMeshes from a glTF scene so N copies cost one draw call per part.
function instancer(src, count, { length = null, height = null, paint = null } = {}) {
  src.updateMatrixWorld(true);
  const parts = [];
  src.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), mat: o.material }); });
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
export async function buildLevel(scene, route, { order, cross, rail = null, storm = false }) {
  const r = mulberry(1000 + order * 77);
  const d = clamp((order - 1) / 5); // difficulty 0..1
  const L = route.length;
  const obs = [];   // {kind, s, lat, len, w, h, v (forward m/s), vl (lateral), solid}
  const pads = [], ramps = [], ice = [], puddles = [], groups = [];
  const used = (s, lat, pad = 6) => obs.some((o) => Math.abs(o.s - s) < pad + o.len / 2 && Math.abs(o.lat - lat) < 1.5) || ramps.some((o) => Math.abs(o.s - s) < pad + 3) || pads.some((o) => Math.abs(o.s - s) < 4 && Math.abs(o.lat - lat) < 1.5);
  const nearCross = (s, pad) => cross.some((c) => Math.abs(c - s) < pad);
  const railS = rail ? rail.s : -999;
  const start = 34, end = L - 46;
  // tourist crossings at the first two intersections after the start (Orange & Church is always one)
  for (const c of cross.filter((c) => c > start + 10 && c < end && Math.abs(c - railS) > 40).slice(0, 2 + Math.round(d))) groups.push({ s: c, n: 4 + Math.round(r() * 2 + d * 2), seed: r() });
  // the SunRail crossing: gates + a ramp in the middle lane, boost pad before it, train scripted to the player
  if (rail) { ramps.push({ s: railS - 13, lat: 0, rail: true }); pads.push({ s: railS - 40, lat: 0 }); obs.push({ kind: 'gate', s: railS - 6, lat: 0, len: 0.6, w: 9, h: 1.25, v: 0 }); }
  // the rhythm: a pattern every 22–34 m, denser with difficulty
  let s = start;
  while (s < end) {
    s += lerpN(34, 20, d) + r() * 10;
    if (s > end) break;
    if (Math.abs(s - railS) < 50 || groups.some((g) => Math.abs(g.s - s) < 22)) continue;
    const pick = r();
    const free = Math.floor(r() * 3); // guarantee one open lane
    if (pick < 0.28) { // traffic: slower cars in two lanes
      for (let li = 0; li < 3; li++) if (li !== free && r() < 0.75) obs.push({ kind: 'car', s: s + r() * 6, lat: LANES[li], len: 4.7, w: 1.9, h: 1.45, v: 3 + r() * 4 });
    } else if (pick < 0.42) { // LYNX bus pulling out of the curb lane
      const li = r() < 0.5 ? 0 : 2; if (li === free) continue;
      obs.push({ kind: 'bus', s, lat: LANES[li] + (li ? 1.2 : -1.2), len: 12, w: 2.6, h: 3.1, v: 4, pull: LANES[li], t0: null });
    } else if (pick < 0.62) { // cones / road work: jumpable
      for (let li = 0; li < 3; li++) if (li !== free) obs.push({ kind: r() < 0.5 ? 'cone' : 'barrier', s, lat: LANES[li], len: 0.6, w: 1.2, h: r() < 0.5 ? 0.75 : 0.95, v: 0 });
    } else if (pick < 0.74) { // boost pad lane + ice trail
      pads.push({ s, lat: LANES[free] });
      for (let k = 1; k <= 6; k++) ice.push({ s: s + 6 + k * 3, lat: LANES[free], y: 0.9 });
    } else if (pick < 0.86) { // ramp over a parked car
      const li = free; ramps.push({ s, lat: LANES[li] });
      obs.push({ kind: 'car', s: s + 11, lat: LANES[li], len: 4.7, w: 1.9, h: 1.45, v: 0 });
      for (let k = 0; k < 5; k++) { const u = k / 4; ice.push({ s: s + 4 + u * 14, lat: LANES[li], y: 1.2 + Math.sin(u * Math.PI) * 2.6 }); }
    } else { // ice cube zig-zag
      let li = free; for (let k = 0; k < 8; k++) { ice.push({ s: s + k * 3.2, lat: LANES[li], y: 0.9 }); if (k % 3 === 2) li = clamp(li + (r() < 0.5 ? -1 : 1), 0, 2); }
    }
    if (storm && r() < 0.5) puddles.push({ s: s + 12, lat: LANES[Math.floor(r() * 3)] });
  }
  return { obs, pads, ramps, ice, puddles, groups, rail };
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
  cones.forEach((o, i) => { for (let k = 0; k < 3; k++) cim.setMatrixAt(i * 3 + k, place(o.s, o.lat + (k - 1) * 0.42)); });
  cim.castShadow = true; scene.add(cim);
  const barTex = canvasTex('barrier', 256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff6a00'; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, h); c.lineTo(i * 32 - 16, h); c.fill(); } c.fillStyle = '#111'; c.font = '900 26px system-ui'; c.textAlign = 'center'; });
  const barG = BGU.mergeGeometries([new THREE.BoxGeometry(1.5, 0.32, 0.08).translate(0, 0.78, 0), new THREE.BoxGeometry(0.08, 0.95, 0.6).translate(-0.62, 0.47, 0), new THREE.BoxGeometry(0.08, 0.95, 0.6).translate(0.62, 0.47, 0)]);
  const bim = new THREE.InstancedMesh(barG, new THREE.MeshLambertMaterial({ map: barTex }), Math.max(1, bars.length));
  bars.forEach((o, i) => bim.setMatrixAt(i, place(o.s, o.lat, 0, Math.PI / 2 - Math.PI / 2)));
  bim.castShadow = true; scene.add(bim);
  // boost pads (scrolling chevrons)
  const padT = boostPadTex();
  const pim = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: padT, transparent: true, opacity: 0.95 }), Math.max(1, lv.pads.length));
  lv.pads.forEach((o, i) => pim.setMatrixAt(i, place(o.s, o.lat, 0.06)));
  scene.add(pim); out.padTex = padT;
  // ramps (orange wedge with chevrons)
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(3.4, 0); sh.lineTo(3.4, 1.1); sh.lineTo(0, 0);
  const rg = new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: false }); rg.translate(-1.7, 0, -1.1); rg.rotateY(-Math.PI / 2);
  const rim = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0x401400 }), Math.max(1, lv.ramps.length));
  lv.ramps.forEach((o, i) => rim.setMatrixAt(i, place(o.s, o.lat)));
  rim.castShadow = true; scene.add(rim);
  // ice cubes
  const iceG = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const iim = new THREE.InstancedMesh(iceG, new THREE.MeshStandardMaterial({ color: 0xc8f2ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x2a6a88, emissiveIntensity: 0.6 }), Math.max(1, lv.ice.length));
  iim.frustumCulled = false; scene.add(iim); out.iceMesh = iim;
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
      const dir = k % 2 ? 1 : -1;
      out.walkers.push({ c, s: g.s + (rr() - 0.5) * 4, lat0: dir * (5.5 + rr() * 2.5), dir: -dir, speed: 0.9 + rr() * 0.5, ph: rr() * 3, delay: rr() * 0.8, group: g });
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
