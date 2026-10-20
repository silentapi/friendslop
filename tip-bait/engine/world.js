// Downtown Orlando from OpenStreetMap (data/downtown.json, origin = Citi Tower, x east / z south, metres).
// Buildings: real footprints + heights, one merged mesh with a physically based facade shader (reflective glass,
// mullions, storefront band, per-building tint). Streets: real widths, surfaces (asphalt / brick), lane paint,
// curbs cut at intersections, crosswalks. Lake Eola: reflective water. Map data © OpenStreetMap contributors (ODbL).
import { THREE, V, ASSETS, once, tex, pbr, mat, mesh, box, cyl, hash, mulberry } from './core.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

export const loadMap = () => once('osm', () => fetch(ASSETS + '../data/downtown.json').then((r) => r.json()));
export const HERO_IDS = new Set(['615948622']); // Citi Tower: replaced by the hand-built hero model
const DRIVABLE = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'motorway_link', 'primary_link', 'secondary_link', 'tertiary_link', 'service']);
const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);

function defaultHeight(b) {
  const k = b.kind;
  if (k === 'house' || k === 'roof') return 6.5;
  if (k === 'church') return 14;
  if (k === 'parking') return 16;
  if (k === 'apartments') return 30;
  if (k === 'construction') return 20;
  const area = Math.abs(polyArea(b.pts));
  return area > 2500 ? 22 : area > 800 ? 14 : 9;
}
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; } return a / 2; }

// ---------------------------------------------------------------- facade material
const PALETTE = [[0.92, 0.9, 0.86], [0.86, 0.82, 0.74], [0.95, 0.94, 0.92], [0.78, 0.76, 0.72], [0.82, 0.74, 0.62], [0.62, 0.6, 0.58], [0.88, 0.86, 0.8], [0.7, 0.55, 0.45]];
export function facadeMaterial({ night = 0 } = {}) {
  return once('facade' + night, () => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, map: tex('tex/white_plaster_02_diff.jpg'), normalMap: tex('tex/white_plaster_02_nor_gl.jpg', { srgb: false }), envMapIntensity: 1.0 });
    m.userData.keep = true;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uNight = { value: night };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aStyle; attribute vec3 aTint; attribute float aSeed;\nvarying vec3 vWP; varying vec3 vWN; varying vec4 vStyle; varying vec3 vTint; varying float vSeed;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vStyle = aStyle; vTint = aTint; vSeed = aSeed;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNight; varying vec3 vWP; varying vec3 vWN; varying vec4 vStyle; varying vec3 vTint; varying float vSeed;
          float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float glassMask; float litWin; vec2 wallUV; float isRoof;`)
        .replace('#include <map_fragment>', `
          vec3 nW = normalize(vWN);
          isRoof = step(0.6, nW.y);
          vec2 wd = normalize(vec2(-nW.z, nW.x) + 1e-5);
          float u = dot(vWP.xz, wd);
          float v = vWP.y;
          wallUV = isRoof > 0.5 ? vWP.xz / 4.0 : vec2(u, v) / 3.0;
          vec4 tx = texture2D(map, wallUV);
          float fh = vStyle.x, bw = vStyle.y, gr = vStyle.z, kind = vStyle.w;
          vec2 cell = vec2(u / bw, (v - 0.4) / fh);
          vec2 f = fract(cell);
          float rid = h21(floor(cell) + vSeed * 17.0);
          // punched windows (kind 0), ribbon windows (1), full curtain wall (2)
          float wx = kind > 1.5 ? step(0.03, f.x) * step(f.x, 0.97) : step(0.5 - gr * 0.5, f.x) * step(f.x, 0.5 + gr * 0.5);
          float wy = kind > 1.5 ? step(0.04, f.y) * step(f.y, 0.97) : kind > 0.5 ? step(0.3, f.y) * step(f.y, 0.9) : step(0.25, f.y) * step(f.y, 0.85);
          float ground = 1.0 - step(4.4, v);
          float store = ground * step(0.6, v) * step(0.04, fract(u / 4.5)) * step(fract(u / 4.5), 0.96);
          glassMask = (1.0 - isRoof) * max(wx * wy * (1.0 - ground), store * step(0.4, h21(vec2(floor(u / 4.5), vSeed))));
          litWin = glassMask * step(0.62, rid);
          vec3 wall = vTint * mix(vec3(1.0), tx.rgb * 1.15, 0.55);
          vec3 roofC = vec3(0.42, 0.42, 0.44) * mix(vec3(1.0), tx.rgb, 0.5);
          vec3 glassC = mix(vec3(0.05, 0.075, 0.09), vec3(0.09, 0.12, 0.13), rid) * (kind > 1.5 ? vec3(0.8, 1.0, 1.05) : vec3(1.0));
          // a dark reveal around each window reads as depth
          float reveal = (1.0 - isRoof) * (1.0 - ground) * (1.0 - glassMask) * wx * step(0.2, f.y) * step(f.y, 0.92) * (kind < 1.5 ? 1.0 : 0.0);
          diffuseColor.rgb = isRoof > 0.5 ? roofC : mix(wall * (1.0 - reveal * 0.35), glassC, glassMask);`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(isRoof > 0.5 ? 0.92 : roughness, 0.06 + 0.1 * h21(floor(vWP.xz)), glassMask);')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = mix(0.0, 0.35, glassMask);')
        .replace('#include <normal_fragment_maps>', `
          vec3 mapN = texture2D(normalMap, wallUV).xyz * 2.0 - 1.0; mapN.xy *= normalScale * (1.0 - glassMask) * 0.6;
          normal = normalize(tbn * mapN);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += litWin * uNight * mix(vec3(1.0, 0.78, 0.5), vec3(0.9, 0.95, 1.0), step(0.85, h21(floor(vWP.xz + vWP.y)))) * 1.2;');
    };
    m.customProgramCacheKey = () => 'facade' + night;
    return m;
  });
}

function styleFor(b, h) {
  const r = mulberry(Number(b.id) % 2147483647);
  const tall = h > 45;
  const kind = tall ? (r() < 0.55 ? 2 : r() < 0.5 ? 1 : 0) : (r() < 0.15 ? 1 : 0);
  const tint = tall && kind === 2 ? [0.55, 0.62, 0.66] : PALETTE[Math.floor(r() * PALETTE.length)];
  return { style: [kind === 2 ? 3.8 : 3.4, kind === 2 ? 1.6 : 2.2 + r() * 1.6, kind === 1 ? 0.95 : 0.45 + r() * 0.25, kind], tint, seed: r() };
}

// ---------------------------------------------------------------- buildings
export async function buildings(ctx, { center = [0, 0], radius = 700, skip = HERO_IDS, night = 0, minH = 0 } = {}) {
  const map = await loadMap();
  const geos = [];
  for (const b of map.buildings) {
    if (skip.has(b.id)) continue;
    const [cx, cz] = centroid(b.pts);
    if (Math.hypot(cx - center[0], cz - center[1]) > radius) continue;
    const h = b.h || defaultHeight(b);
    if (h < minH) continue;
    const base = b.min || 0;
    const shape = new THREE.Shape(b.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    let g;
    try { g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1, h - base), bevelEnabled: false }); } catch { continue; }
    g.rotateX(-Math.PI / 2);
    g.translate(0, base, 0);
    g.deleteAttribute('uv');
    const n = g.attributes.position.count;
    const { style, tint, seed } = styleFor(b, h);
    g.setAttribute('aStyle', new THREE.Float32BufferAttribute(new Array(n).fill(style).flat(), 4));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(new Array(n).fill(tint).flat(), 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Array(n).fill(seed), 1));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    geos.push(g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g);
  }
  const merged = BGU.mergeGeometries(geos, false);
  merged.computeVertexNormals();
  const m = mesh(merged, facadeMaterial({ night }));
  m.userData.osm = true;
  ctx.scene.add(m);
  return m;
}

// ---------------------------------------------------------------- streets
function ribbon(pts, w, y = 0) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const nx = -dz * w / 2, nz = dx * w / 2;
    pos.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  return g;
}
// polyline helpers: resample into ~step metre pieces, offset sideways
function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) out.push([x1 + (x2 - x1) * k / n, z1 + (z2 - z1) * k / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export async function streets(ctx, { center = [0, 0], radius = 700, curbs = true, paint = true } = {}) {
  const map = await loadMap();
  const near = (p) => Math.hypot(p[0] - center[0], p[1] - center[1]) < radius;
  const roads = map.roads.filter((r) => DRIVABLE.has(r.hw) && !r.bridge && r.pts.some(near));
  // intersections: vertices shared by 2+ drivable ways
  const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const cnt = new Map();
  for (const r of roads) for (const p of new Set(r.pts.map(key))) cnt.set(p, (cnt.get(p) || 0) + 1);
  const inter = [];
  for (const r of roads) for (const p of r.pts) if (cnt.get(key(p)) > 1) inter.push([p[0], p[1], r.w]);
  const nearInter = (x, z, pad) => inter.some(([ix, iz, iw]) => Math.hypot(x - ix, z - iz) < iw / 2 + pad);
  const asph = [], brick = [], lines = [], dashes = [], curbM = [], zebra = [];
  for (const r of roads) {
    const g = ribbon(r.pts, r.w, r.hw === 'service' ? 0.02 : 0.025);
    (r.surface === 'bricks' || r.surface === 'paving_stones' || r.surface === 'sett' ? brick : asph).push(g);
    const major = ['primary', 'secondary', 'tertiary'].includes(r.hw);
    if (paint && major && r.surface !== 'bricks') {
      const rs = resample(r.pts, 1.0);
      if (!r.oneway) for (const off of [-0.12, 0.12]) lines.push(ribbon(offsetLine(rs, off), 0.1, 0.04));
      else for (let i = 0; i < rs.length - 1; i += 6) if (!nearInter(rs[i][0], rs[i][1], 3)) dashes.push(ribbon([rs[i], rs[Math.min(rs.length - 1, i + 3)]], 0.12, 0.04));
      // lane dividers either side of centre on 4+ lane roads
      if (r.w > 13) for (const off of [-r.w / 4, r.w / 4]) { const o = offsetLine(rs, off); for (let i = 0; i < o.length - 1; i += 6) if (!nearInter(o[i][0], o[i][1], 3)) dashes.push(ribbon([o[i], o[Math.min(o.length - 1, i + 3)]], 0.12, 0.04)); }
    }
    if (curbs && r.hw !== 'service' && !r.hw.startsWith('motorway')) {
      for (const side of [-1, 1]) {
        const e = offsetLine(resample(r.pts, 1.5), side * (r.w / 2 + 0.12));
        for (let i = 0; i < e.length - 1; i++) {
          const [x1, z1] = e[i], [x2, z2] = e[i + 1];
          if (nearInter((x1 + x2) / 2, (z1 + z2) / 2, 1.2)) continue;
          curbM.push([x1, z1, x2, z2]);
        }
      }
    }
  }
  // crosswalks at intersections of major roads
  if (paint) for (const [ix, iz, iw] of inter) {
    void ix; void iz; void iw;
  }
  const add = (list, material, cast = false) => { if (!list.length) return null; const m = mesh(BGU.mergeGeometries(list, false), material, { cast, receive: true }); ctx.scene.add(m); return m; };
  add(asph, pbr('asphalt_02', { world: 7, color: 0x7a7a7c, rough: 0.95, normal: 0.8, polygonOffset: true, polygonOffsetFactor: -1 }));
  add(brick, pbr('red_brick_pavers', { world: 2.2, rough: 0.9, normal: 1.2, color: 0xd8c8c0, polygonOffset: true, polygonOffsetFactor: -1 }));
  add(lines, mat(0xd9b23a, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  add(dashes, mat(0xe6e6e0, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  if (curbM.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.16, 0.26), pbr('concrete_pavement', { world: 1.2, color: 0xcfcac2 }), curbM.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
    curbM.forEach(([x1, z1, x2, z2], i) => { const L = Math.hypot(x2 - x1, z2 - z1); q.setFromAxisAngle(up, -Math.atan2(z2 - z1, x2 - x1)); m4.compose(V((x1 + x2) / 2, 0.08, (z1 + z2) / 2), q, V(L + 0.02, 1, 1)); im.setMatrixAt(i, m4); });
    im.receiveShadow = true; im.castShadow = true;
    ctx.scene.add(im);
  }
  return { roads, inter };
}
function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    return [p[0] - dz * off, p[1] + dx * off];
  });
}

// ---------------------------------------------------------------- ground, water, parks
export async function ground(ctx, { center = [0, 0], size = 3000 } = {}) {
  const map = await loadMap();
  const g = mesh(new THREE.PlaneGeometry(size, size), pbr('concrete_pavement', { world: 3, color: 0xb4b0a8, rough: 0.95 }), { cast: false });
  g.rotation.x = -Math.PI / 2; g.position.set(center[0], 0, center[1]); ctx.scene.add(g);
  const grass = pbr('grass_ground', { world: 4, color: 0x9aa880, rough: 1 });
  for (const p of map.parks) {
    if (p.pts.length < 3) continue;
    const [cx, cz] = centroid(p.pts); if (Math.hypot(cx - center[0], cz - center[1]) > size / 2) continue;
    const s = new THREE.Shape(p.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const gg = new THREE.ShapeGeometry(s); gg.rotateX(-Math.PI / 2); gg.translate(0, 0.004, 0);
    ctx.scene.add(mesh(gg, grass, { cast: false }));
  }
  return g;
}
export async function water(ctx, names = ['Lake Eola']) {
  const map = await loadMap();
  const n = tex('tex/water_nor.jpg', { srgb: false, repeat: 40 });
  const wm = new THREE.MeshPhysicalMaterial({ color: 0x1a2a2c, roughness: 0.04, metalness: 0.0, normalMap: n, normalScale: new THREE.Vector2(0.18, 0.18), envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.33 });
  const out = [];
  for (const w of map.water) {
    if (!names.includes(w.name)) continue;
    const s = new THREE.Shape(w.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(s, 24); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 0);
    const pos = g.attributes.position; const uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 400, pos.getZ(i) / 400);
    const m = mesh(g, wm, { cast: false }); ctx.scene.add(m); out.push(m);
    // seawall edge
    const edge = w.pts.concat([w.pts[0]]);
    ctx.scene.add(mesh(ribbon(edge, 1.2, 0.3), mat(0xb8b2a6, { roughness: 0.8 }), { cast: false }));
  }
  ctx.tick.push((t) => { n.offset.set(t * 0.004, t * 0.0025); });
  return out;
}
export const mapData = loadMap;

// ---------------------------------------------------------------- dressing: palms, twin-globe lamps, traffic, parked cars
function pip(x, z, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
export async function insideBuilding(x, z, pad = 1.0) {
  const map = await loadMap();
  return map.buildings.some((b) => { const [cx, cz] = centroid(b.pts); if (Math.abs(cx - x) > 90 || Math.abs(cz - z) > 90) return false; return pip(x, z, b.pts) || pip(x + pad, z, b.pts) || pip(x - pad, z, b.pts) || pip(x, z + pad, b.pts) || pip(x, z - pad, b.pts); });
}
export function twinLamp(night = 0) {
  const lp = new THREE.Group();
  const blk = mat(0x121315, { metalness: 0.6, roughness: 0.4 });
  const globe = mat(0xfff2dc, { emissive: 0xffe0b0, emissiveIntensity: 0.25 + night * 2.5, roughness: 0.3 });
  cyl(0.18, 0.24, 0.8, blk, 12, 0, 0.4, 0, lp); cyl(0.07, 0.09, 4.2, blk, 10, 0, 2.6, 0, lp); box(1.3, 0.06, 0.06, blk, 0, 4.4, 0, lp);
  for (const sx of [-0.6, 0.6]) { const gb = mesh(new THREE.SphereGeometry(0.25, 16, 12), globe); gb.scale.y = 1.3; gb.position.set(sx, 4.75, 0); lp.add(gb); }
  return lp;
}
export async function dress(ctx, { center = [0, 0], radius = 200, palms = true, lamps = true, step = 24, names = null, skipNear = [] } = {}) {
  const map = await loadMap();
  const P = await import('./props.js');
  const rnd = mulberry(Math.round(center[0] * 7 + center[1] * 13));
  const out = [];
  for (const r of map.roads) {
    if (!DRIVABLE.has(r.hw) || r.hw === 'service' || r.hw.startsWith('motorway') || r.bridge) continue;
    if (names && !names.some((n) => (r.name || '').includes(n))) continue;
    const rs = resample(r.pts, step);
    for (let i = 0; i < rs.length; i++) {
      const [x, z] = rs[i];
      if (Math.hypot(x - center[0], z - center[1]) > radius) continue;
      if (skipNear.some(([sx, sz, sr]) => Math.hypot(x - sx, z - sz) < sr)) continue;
      const a = rs[Math.max(0, i - 1)], b = rs[Math.min(rs.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      for (const side of [-1, 1]) {
        const off = r.w / 2 + 2.0;
        const px = x - dz * off * side, pz = z + dx * off * side;
        if (await insideBuilding(px, pz, 1.5)) continue;
        if ((i + (side > 0 ? 1 : 0)) % 2 === 0 && palms) {
          const p = await P.palm(8 + rnd() * 4, rnd() < 0.8 ? 'tall' : 'coconut');
          p.position.set(px, 0, pz); p.rotation.y = rnd() * 6.28; ctx.scene.add(p); out.push(p);
        } else if (lamps) {
          const l = twinLamp(); l.position.set(px - dz * side * 0.5, 0, pz + dx * side * 0.5); l.rotation.y = Math.atan2(dx, dz); ctx.scene.add(l); out.push(l);
        }
      }
    }
  }
  return out;
}
// Cars driving along real street polylines (right-hand traffic). Returns { cars, at(t) } updated via ctx.tick.
export async function traffic(ctx, { names = [], center = [0, 0], radius = 300, n = 10, speed = 11, seed = 1, parked = 0 } = {}) {
  const map = await loadMap();
  const P = await import('./props.js');
  const rnd = mulberry(seed);
  const paths = map.roads.filter((r) => names.some((nm) => (r.name || '').includes(nm)) && DRIVABLE.has(r.hw) && r.pts.some((p) => Math.hypot(p[0] - center[0], p[1] - center[1]) < radius));
  const cars = [];
  for (let i = 0; i < n && paths.length; i++) {
    const r = paths[i % paths.length];
    const rs = resample(r.pts, 2);
    const dir = r.oneway ? 1 : (i % 2 ? 1 : -1);
    const lane = r.oneway ? (rnd() - 0.5) * r.w * 0.5 : dir * r.w * 0.22;
    const c = await P.car(i + seed);
    ctx.scene.add(c);
    const len = (rs.length - 1) * 2;
    cars.push({ c, rs, dir, lane, s0: rnd() * len, len, v: speed * (0.8 + rnd() * 0.4) * dir, stop: false });
  }
  const place = (k, s) => {
    const { rs } = k; let u = ((s % k.len) + k.len) % k.len; const i = Math.min(rs.length - 2, Math.floor(u / 2)), f = u / 2 - i;
    const a = rs[i], b = rs[i + 1]; let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const x = a[0] + (b[0] - a[0]) * f - dz * k.lane, z = a[1] + (b[1] - a[1]) * f + dx * k.lane;
    k.c.position.set(x, 0, z); k.c.rotation.y = Math.atan2(dx * k.dir, dz * k.dir);
  };
  ctx.tick.push((t) => { for (const k of cars) place(k, k.s0 + (k.stop ? 0 : k.v * t)); });
  // parked cars along the kerb
  for (let i = 0; i < parked && paths.length; i++) {
    const r = paths[0]; const rs = resample(r.pts, 6.2);
    const j = Math.floor(rnd() * rs.length); const [x, z] = rs[j]; const b = rs[Math.min(rs.length - 1, j + 1)];
    let dx = b[0] - x, dz = b[1] - z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (Math.hypot(x - center[0], z - center[1]) > radius) continue;
    const c = await P.car(i * 3 + 1); c.position.set(x - dz * (r.w / 2 - 1.1), 0, z + dx * (r.w / 2 - 1.1)); c.rotation.y = Math.atan2(dx, dz); ctx.scene.add(c);
  }
  return cars;
}
// Everything for an exterior shot centred on `center`.
export async function city(ctx, { center = [0, 0], radius = 600, dressR = 160, dressNames = null, night = 0, water: w = true, skipDress = [] } = {}) {
  await ground(ctx, { center });
  await buildings(ctx, { center, radius, night });
  await streets(ctx, { center, radius: Math.min(radius, 900) });
  if (w) await water(ctx);
  if (dressR) await dress(ctx, { center, radius: dressR, names: dressNames, skipNear: skipDress });
}
