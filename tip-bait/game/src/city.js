// Real Downtown Orlando corridor (OpenStreetMap © contributors, ODbL): building footprints + heights, street
// widths and surfaces (asphalt / brick), the level street with lanes and curbs, palms and twin-globe lamps.
import { THREE, BGU, V, mat, lam, emissive, mesh, box, cyl, tex, mulberry, loadGLB, canvasTex, plane, signTex } from './core.js';

const HERO = new Set(['615948622']); // Citi Tower is the hand-built model
const PALETTE = [[0.93, 0.91, 0.87], [0.87, 0.83, 0.75], [0.96, 0.95, 0.93], [0.8, 0.78, 0.74], [0.84, 0.76, 0.64], [0.66, 0.64, 0.62], [0.9, 0.88, 0.82], [0.74, 0.58, 0.48]];
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; } return a / 2; }
function heightOf(b) {
  if (b.h) return b.h;
  const k = b.kind, area = Math.abs(polyArea(b.pts));
  if (k === 'house' || k === 'roof') return 6.5; if (k === 'church') return 14; if (k === 'parking') return 16; if (k === 'apartments') return 30;
  return area > 2500 ? 22 : area > 800 ? 14 : 9;
}

// facade: procedural windows / storefronts / curtain walls on a cheap Lambert material
function facadeMaterial() {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aStyle; attribute vec3 aTint;\nvarying vec3 vWP; varying vec3 vWN; varying vec4 vStyle; varying vec3 vTint;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vStyle = aStyle; vTint = aTint;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; varying vec4 vStyle; varying vec3 vTint;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `
        vec3 nW = normalize(vWN);
        float isRoof = step(0.6, nW.y);
        vec2 wd = normalize(vec2(-nW.z, nW.x) + 1e-5);
        float u = dot(vWP.xz, wd), v = vWP.y;
        float fh = vStyle.x, bw = vStyle.y, gr = vStyle.z, kind = vStyle.w;
        vec2 cell = vec2(u / bw, (v - 0.4) / fh); vec2 f = fract(cell);
        float rid = h21(floor(cell) + vStyle.w * 7.0 + floor(vTint.r * 40.0));
        float wx = kind > 1.5 ? step(0.04, f.x) * step(f.x, 0.96) : step(0.5 - gr * 0.5, f.x) * step(f.x, 0.5 + gr * 0.5);
        float wy = kind > 1.5 ? step(0.05, f.y) * step(f.y, 0.96) : kind > 0.5 ? step(0.3, f.y) * step(f.y, 0.9) : step(0.25, f.y) * step(f.y, 0.85);
        float ground = 1.0 - step(4.4, v);
        float store = ground * step(0.6, v) * step(0.05, fract(u / 4.5)) * step(fract(u / 4.5), 0.95);
        float glass = (1.0 - isRoof) * max(wx * wy * (1.0 - ground), store * step(0.35, h21(vec2(floor(u / 4.5), vTint.g * 31.0))));
        vec3 sky = mix(vec3(0.55, 0.62, 0.70), vec3(0.95, 0.78, 0.6), clamp(v / 90.0, 0.0, 1.0));
        vec3 glassC = mix(vec3(0.07, 0.1, 0.12), sky * 0.55, 0.35 + 0.4 * rid) * (kind > 1.5 ? vec3(0.85, 1.0, 1.05) : vec3(1.0));
        float reveal = (1.0 - isRoof) * (1.0 - ground) * (1.0 - glass) * wx * step(0.2, f.y) * step(f.y, 0.92) * (kind < 1.5 ? 1.0 : 0.0);
        vec3 roofC = vec3(0.45, 0.45, 0.47);
        diffuseColor.rgb = isRoof > 0.5 ? roofC : mix(vTint * (1.0 - reveal * 0.3) * (0.92 + 0.08 * h21(floor(vWP.xz * 0.3))), glassC, glass);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += (1.0 - isRoof) * glass * sky * 0.12;');
  };
  m.customProgramCacheKey = () => 'facade-lambert';
  return m;
}
function styleFor(b, h) {
  const r = mulberry((Number(b.id) || 7) % 2147483647);
  const tall = h > 45;
  const kind = tall ? (r() < 0.55 ? 2 : r() < 0.5 ? 1 : 0) : (r() < 0.15 ? 1 : 0);
  const tint = tall && kind === 2 ? [0.56, 0.63, 0.67] : PALETTE[Math.floor(r() * PALETTE.length)];
  return { style: [kind === 2 ? 3.8 : 3.4, kind === 2 ? 1.6 : 2.2 + r() * 1.6, kind === 1 ? 0.95 : 0.45 + r() * 0.25, kind], tint };
}
export function buildings(scene, city) {
  const geos = [];
  for (const b of city.buildings) {
    if (HERO.has(String(b.id))) continue;
    const h = heightOf(b), base = b.min || 0;
    const shape = new THREE.Shape(b.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    let g; try { g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1, h - base), bevelEnabled: false }); } catch { continue; }
    g.rotateX(-Math.PI / 2); g.translate(0, base, 0); g.deleteAttribute('uv');
    g = g.index ? g.toNonIndexed() : g;
    const n = g.attributes.position.count, { style, tint } = styleFor(b, h);
    g.setAttribute('aStyle', new THREE.Float32BufferAttribute(new Array(n).fill(style).flat(), 4));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(new Array(n).fill(tint).flat(), 3));
    geos.push(g);
  }
  const merged = BGU.mergeGeometries(geos, false); merged.computeVertexNormals();
  const m = mesh(merged, facadeMaterial(), { cast: true, receive: true });
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------- streets
function ribbon(pts, w, y, uvScale = 0) {
  const pos = [], idx = [], uv = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (i) run += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const nx = -dz * w / 2, nz = dx * w / 2;
    pos.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
    uv.push(0, run / (uvScale || 1), w / (uvScale || 1), run / (uvScale || 1));
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const asphaltM = () => { const t = tex('tex/asphalt.jpg'); return new THREE.MeshLambertMaterial({ color: 0xb4b4b6, map: t }); };
const brickM = () => { const t = tex('tex/brick.jpg'); return new THREE.MeshLambertMaterial({ color: 0xd2b8ad, map: t }); };
export function streets(scene, city, route) {
  const asph = [], brick = [];
  for (const r of city.roads) { if (r.pts.length < 2) continue; (r.surface === 'bricks' ? brick : asph).push(ribbon(r.pts, r.w, 0.02, 6)); }
  // the level street: at least 10.4 m wide so three lanes always sit on the road, surface per real street
  for (const st of route.streets) {
    const pts = []; for (let s = st.s0; s <= st.s1 + 0.01; s += 2) { const f = route.at(s); pts.push([f.x, f.z]); }
    if (pts.length > 1) (st.surface === 'bricks' ? brick : asph).push(ribbon(pts, Math.max(10.4, st.w), 0.035, 6));
  }
  const am = asphaltM(), bm = brickM();
  am.polygonOffset = bm.polygonOffset = true; am.polygonOffsetFactor = bm.polygonOffsetFactor = -1;
  if (asph.length) scene.add(mesh(BGU.mergeGeometries(asph), am, { cast: false }));
  if (brick.length) scene.add(mesh(BGU.mergeGeometries(brick), bm, { cast: false }));
  // intersections along the route: other streets crossing within 9 m of the centerline
  const cross = [];
  for (const r of city.roads) for (const p of r.pts) {
    for (let s = 0; s < route.length; s += 3) { const f = route.at(s); if (Math.hypot(p[0] - f.x, p[1] - f.z) < 7 && !route.streets.some((st) => st.name === r.name)) { cross.push(s); break; } }
  }
  const nearCross = (s, pad = 10) => cross.some((c) => Math.abs(c - s) < pad);
  // lane dashes + edge lines + curbs
  const dash = [], edge = [];
  const half = (s) => Math.max(10.4, route.street(s).w) / 2;
  for (let s = 4; s < route.length - 4; s += 6) {
    if (nearCross(s, 6)) continue;
    for (const lat of [-1.3, 1.3]) { const a = route.world(s, lat), b = route.world(s + 2.6, lat); dash.push(ribbon([[a.x, a.z], [b.x, b.z]], 0.13, 0.05)); }
  }
  const curbs = [];
  for (let s = 0; s < route.length; s += 2) {
    if (nearCross(s, 8)) continue;
    for (const side of [-1, 1]) curbs.push([s, side * (half(s) + 0.12)]);
    for (const side of [-1, 1]) { const a = route.world(s, side * (half(s) - 0.35)), b = route.world(s + 2, side * (half(s) - 0.35)); edge.push(ribbon([[a.x, a.z], [b.x, b.z]], 0.12, 0.05)); }
  }
  scene.add(mesh(BGU.mergeGeometries(dash), new THREE.MeshLambertMaterial({ color: 0xeeeeea }), { cast: false }));
  scene.add(mesh(BGU.mergeGeometries(edge), new THREE.MeshLambertMaterial({ color: 0xd9b23a }), { cast: false }));
  const cm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.16, 2.05), new THREE.MeshLambertMaterial({ color: 0xcfcac2 }), curbs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  curbs.forEach(([s, lat], i) => { const f = route.at(s + 1); const p = route.world(s + 1, lat); q.setFromAxisAngle(up, f.yaw); m4.compose(V(p.x, 0.08, p.z), q, V(1, 1, 1)); cm.setMatrixAt(i, m4); });
  cm.receiveShadow = true; scene.add(cm);
  // crosswalk zebras where streets cross the route
  const zeb = [];
  const seen = [];
  for (const c of cross) { if (seen.some((x) => Math.abs(x - c) < 18)) continue; seen.push(c); for (const off of [-7, 7]) { if (c + off < 3 || c + off > route.length - 3) continue; for (let lat = -4.6; lat <= 4.6; lat += 1.15) { const a = route.world(c + off - 1.5, lat), b = route.world(c + off + 1.5, lat); zeb.push(ribbon([[a.x, a.z], [b.x, b.z]], 0.5, 0.05)); } } }
  if (zeb.length) scene.add(mesh(BGU.mergeGeometries(zeb), new THREE.MeshLambertMaterial({ color: 0xf2f2ee }), { cast: false }));
  return { cross: seen, half };
}

export function ground(scene, center) {
  const t = tex('tex/concrete.jpg'); t.repeat.set(600, 600);
  const g = mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: 0xd2ccc2, map: t }), { cast: false });
  g.rotation.x = -Math.PI / 2; g.position.set(center.x, 0, center.z); scene.add(g);
  return g;
}

// ---------------------------------------------------------------- palms + lamps along the route (instanced)
export async function dressing(scene, route, { cross, half }, skip = []) {
  const pg = await loadGLB('m/palm_tall.glb');
  const parts = [];
  pg.scene.updateMatrixWorld(true);
  pg.scene.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), mat: o.material }); });
  const bb = new THREE.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); bb.union(p.geo.boundingBox); }
  const r = mulberry(5);
  const spots = [], lamps = [];
  const blocked = (s) => cross.some((c) => Math.abs(c - s) < 14) || skip.some(([a, b]) => s > a && s < b) || s < 6 || s > route.length - 30;
  for (let s = 8; s < route.length; s += 15) {
    if (blocked(s)) continue;
    for (const side of [-1, 1]) {
      if (r() < 0.35) continue;
      spots.push([s + r() * 4, side * (half(s) + 1.6 + r() * 0.6), 7.5 + r() * 4]);
    }
    if ((s / 15) % 2 < 1) lamps.push([s + 7, half(s) + 0.9]), lamps.push([s + 7, -(half(s) + 0.9)]);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  for (const p of parts) {
    const m = p.mat.clone(); if (m.map) { m.alphaTest = 0.4; m.side = THREE.DoubleSide; }
    const im = new THREE.InstancedMesh(p.geo, m, spots.length);
    spots.forEach(([s, lat, h], i) => { const w = route.world(s, lat); const sc = h / (bb.max.y - bb.min.y); q.setFromAxisAngle(up, (i * 2.39) % 6.28); m4.compose(V(w.x, -bb.min.y * sc, w.z), q, V(sc, sc, sc)); im.setMatrixAt(i, m4); });
    im.castShadow = true; scene.add(im);
  }
  // twin-globe lamp posts (downtown Orlando style)
  const postG = BGU.mergeGeometries([new THREE.CylinderGeometry(0.16, 0.22, 0.8, 8).translate(0, 0.4, 0), new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8).translate(0, 2.6, 0), new THREE.BoxGeometry(1.3, 0.06, 0.06).translate(0, 4.4, 0)]);
  const globeG = BGU.mergeGeometries([new THREE.SphereGeometry(0.25, 12, 8).scale(1, 1.3, 1).translate(-0.6, 4.75, 0), new THREE.SphereGeometry(0.25, 12, 8).scale(1, 1.3, 1).translate(0.6, 4.75, 0)]);
  const posts = new THREE.InstancedMesh(postG, new THREE.MeshLambertMaterial({ color: 0x141517 }), lamps.length);
  const globes = new THREE.InstancedMesh(globeG, new THREE.MeshBasicMaterial({ color: 0xfff1d8 }), lamps.length);
  lamps.forEach(([s, lat], i) => { const w = route.world(s, lat); const f = route.at(s); q.setFromAxisAngle(up, f.yaw + Math.PI / 2); m4.compose(V(w.x, 0, w.z), q, V(1, 1, 1)); posts.setMatrixAt(i, m4); globes.setMatrixAt(i, m4); });
  posts.castShadow = true; scene.add(posts, globes);
}

// ---------------------------------------------------------------- landmarks
export function starbucks(scene, route, s, side = 1) {
  const g = new THREE.Group();
  const f = route.at(s), p = route.world(s, side * (Math.max(10.4, route.street(s).w) / 2 + 4.5));
  g.position.set(p.x, 0, p.z); g.rotation.y = f.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2); scene.add(g);
  const W = 14;
  box(W + 1, 6.6, 0.5, new THREE.MeshLambertMaterial({ color: 0x2b2420 }), 0, 3.3, -0.4, g);
  const glass = new THREE.MeshLambertMaterial({ color: 0x2d4148, emissive: 0x3a2a14 });
  box(W, 4.0, 0.1, glass, 0, 2.0, 0, g);
  for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 5) box(0.12, 4.2, 0.16, new THREE.MeshLambertMaterial({ color: 0x15171a }), x, 2.1, 0.02, g);
  const aw = box(W - 1, 0.1, 1.6, new THREE.MeshLambertMaterial({ color: 0x0e3b2b }), 0, 4.6, 0.8, g); aw.rotation.x = 0.12;
  const wm = plane(signTex('sbword', 'STARBUCKS', { font: '800 150px system-ui, sans-serif' }), 7.5, 1.8, { emit: 0.9 }); wm.position.set(1.4, 5.5, 0.12); g.add(wm);
  const logo = canvasTex('sblogo', 256, 256, (c, w, h) => { c.fillStyle = '#00704a'; c.beginPath(); c.arc(w / 2, h / 2, 120, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, 96, 0, 7); c.stroke(); c.fillStyle = '#fff'; c.font = '900 120px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', w / 2, h / 2 + 6); });
  const lg = plane(logo, 1.9, 1.9, { emit: 0.6 }); lg.position.set(-3.6, 5.5, 0.12); g.add(lg);
  return g;
}

// SunRail at Church Street Station: tracks along the real rail line, crossing gates, the 1889 depot, a train
export function sunrail(scene, city, route) {
  let best = null;
  for (const r of city.rail) for (let i = 0; i < r.pts.length - 1; i++) { const [x, z] = r.pts[i]; const d = Math.hypot(x + 801, z - 66); if (!best || d < best.d) best = { d, a: r.pts[i], b: r.pts[i + 1] }; }
  if (!best) return null;
  const dir = V(best.b[0] - best.a[0], 0, best.b[1] - best.a[1]).normalize();
  // where the route crosses the rail line
  let sx = 0, bd = 1e9;
  for (let s = 0; s < Math.min(route.length, 400); s += 0.5) { const f = route.at(s); const d = Math.abs((f.x - best.a[0]) * dir.z - (f.z - best.a[1]) * dir.x); if (d < bd) { bd = d; sx = s; } }
  const X = route.world(sx, 0);
  const yaw = Math.atan2(dir.x, dir.z);
  const g = new THREE.Group(); g.position.copy(X); g.rotation.y = yaw; scene.add(g);
  const L = 420;
  box(4.5, 0.25, L, new THREE.MeshLambertMaterial({ color: 0x7a7268 }), 0, 0.12, 0, g, { cast: false });
  const tie = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.16, 0.24), new THREE.MeshLambertMaterial({ color: 0x2e2620 }), Math.floor(L / 0.62));
  const m4 = new THREE.Matrix4(); for (let i = 0; i < tie.count; i++) tie.setMatrixAt(i, m4.makeTranslation(0, 0.3, -L / 2 + i * 0.62)); g.add(tie);
  for (const dx of [-0.72, 0.72]) box(0.08, 0.16, L, new THREE.MeshStandardMaterial({ color: 0xc0c0c8, metalness: 1, roughness: 0.25 }), dx, 0.45, 0, g);
  // depot (1889 brick, cupola), north-east of the crossing
  const dep = new THREE.Group(); dep.position.set(-784, 0, 121); dep.rotation.y = yaw; scene.add(dep);
  const brick = new THREE.MeshLambertMaterial({ color: 0x9a4a32 });
  box(40, 7, 11, brick, 0, 3.5, 0, dep); box(42, 0.6, 13, new THREE.MeshLambertMaterial({ color: 0x3a3430 }), 0, 7.3, 0, dep);
  const roofG = new THREE.CylinderGeometry(0.01, 8.2, 4, 4, 1); const roof = mesh(roofG, new THREE.MeshLambertMaterial({ color: 0x4a3a34 })); roof.rotation.y = Math.PI / 4; roof.scale.set(2.5, 1, 0.75); roof.position.y = 9.6; dep.add(roof);
  box(3, 3, 3, brick, 0, 12.6, 0, dep);
  const sign = plane(signTex('depot', 'CHURCH STREET STATION', { font: '800 90px system-ui', color: '#f4efe6', bg: '#1d3b2c' }), 9, 2.2, { transparent: false }); sign.position.set(0, 5.2, 5.6); dep.add(sign);
  // gates either side of the crossing (arms span the road when down)
  const gates = [];
  for (const side of [-1, 1]) {
    const gt = new THREE.Group();
    const f = route.at(sx + side * 8); const p = route.world(sx + side * 8, side * (route.street(sx).w / 2 + 0.6));
    gt.position.copy(p); gt.rotation.y = f.yaw + (side > 0 ? Math.PI : 0); scene.add(gt);
    cyl(0.12, 0.14, 3.4, new THREE.MeshLambertMaterial({ color: 0xdedede }), 10, 0, 1.7, 0, gt);
    const xb = canvasTex('xing', 256, 256, (c) => { c.fillStyle = '#fff'; c.save(); c.translate(128, 128); for (const a of [0.78, -0.78]) { c.save(); c.rotate(a); c.fillRect(-120, -22, 240, 44); c.strokeStyle = '#111'; c.lineWidth = 6; c.strokeRect(-120, -22, 240, 44); c.restore(); } c.restore(); c.fillStyle = '#111'; c.font = '800 34px system-ui'; c.textAlign = 'center'; });
    const xs = plane(xb, 1.4, 1.4); xs.position.set(0, 3.2, 0.15); gt.add(xs);
    const lamps = [];
    for (const dx of [-0.42, 0.42]) { const l = cyl(0.16, 0.16, 0.06, new THREE.MeshBasicMaterial({ color: 0x400808 }), 14, dx, 2.5, 0.15, gt); l.rotation.x = Math.PI / 2; lamps.push(l); }
    const arm = new THREE.Group(); arm.position.set(0, 1.1, 0.2); gt.add(arm);
    const stripes = canvasTex('armstripe', 512, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#d61f1f'; c.fillRect(i * w / 8, 0, w / 8, h); } });
    const a = mesh(new THREE.BoxGeometry(7.2, 0.12, 0.1), new THREE.MeshLambertMaterial({ map: stripes })); a.position.x = 3.6; arm.add(a);
    gates.push({ arm, lamps, side });
  }
  // the train (3 cars, cab local +z)
  const liv = canvasTex('sunrail', 1024, 256, (c, w, h) => {
    c.fillStyle = '#f0f0ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#163a6a'; c.fillRect(0, h * 0.66, w, h * 0.34);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ffcf00'); gr.addColorStop(0.6, '#ff9a00'); gr.addColorStop(1, '#2fa84a'); c.fillStyle = gr; c.fillRect(0, h * 0.58, w, h * 0.08);
    c.fillStyle = '#0d141c'; for (let i = 0; i < 8; i++) { c.fillRect(20 + i * 125, h * 0.12, 92, h * 0.17); c.fillRect(20 + i * 125, h * 0.35, 92, h * 0.17); }
    c.fillStyle = '#163a6a'; c.font = '900 40px system-ui'; c.fillText('SunRail', w * 0.44, h * 0.56 - 6);
  });
  const cm = new THREE.MeshLambertMaterial({ map: liv });
  const train = new THREE.Group();
  for (let k = 0; k < 3; k++) { const b = mesh(new THREE.BoxGeometry(3.1, 4.6, 25), [cm, cm, lam(0xd8d8d8), lam(0x222222), lam(0xf0f0ee), lam(0xf0f0ee)]); b.position.set(0, 3.0, -k * 26); train.add(b); }
  box(3.1, 1.6, 0.4, lam(0xffc400), 0, 1.8, 12.7, train); box(2.6, 1.1, 0.1, lam(0x0a0e14), 0, 3.9, 12.55, train);
  for (const x of [-0.9, 0.9]) box(0.35, 0.35, 0.1, new THREE.MeshBasicMaterial({ color: 0xffffff }), x, 1.6, 12.9, train);
  scene.add(train); train.visible = false;
  return { s: sx, X, dir, yaw, gates, train };
}
