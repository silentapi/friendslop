// Downtown Orlando kit: street grid (real street names, stylised spacing), procedural towers with lit
// windows, wet asphalt, palms, live oaks, lamps, traffic, the LYNX bus and I-4 light trails.
// World axes: x = east, z = south (north = -z), metres.
import { THREE, PAL, V, mat, glow, mesh, box, cyl, canvasTex, rnd, rr, pick, reseed, hash, glowSprite, addQuad, streakTex, dotTex, keep } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- map (docs/TRAILER.md "Map")
export const NS = { i4: -520, hughey: -400, rail: -250, garland: -150, orange: 0, magnolia: 80, rosalind: 170, lake: 290, eolaDr: 560, summerlin: 680 };
// Streets that only run part of the grid (Lake Ave starts south of the park).
export const NS_RANGE = { 290: [120, 9999] };
export const EW = { livingston: -480, robinson: -260, washington: -110, central: 120, pine: 250, church: 380, south: 540 };
export const LAKE = { x: 365, z: -70, r: 160 };
export const ROAD_W = { orange: 22, central: 16, church: 16, robinson: 16, default: 13 };
export const PLACES = {
  starbucks: [-14, 80], citi: [325, 340], vue: [215, -300], aspire: [120, -60], society: [40, -540], truist: [35, 318],
  church: [-212, 400], kia: [-470, 470], drp: [115, 610], fountain: [362, -95],
};
const X_LIST = Object.values(NS).sort((a, b) => a - b);
const Z_LIST = Object.values(EW).sort((a, b) => a - b);
const roadW = (name) => ROAD_W[name] || ROAD_W.default;
const NSW = Object.fromEntries(Object.entries(NS).map(([k, v]) => [v, k === 'rail' ? 30 : roadW(k)]));
const EWW = Object.fromEntries(Object.entries(EW).map(([k, v]) => [v, roadW(k)]));

// ---------------------------------------------------------------- facade textures
// One canvas = 16 bays × 32 floors. map = daytime albedo, emissiveMap = lit windows.
const FACADES = {
  glass: { bay: 1.6, floor: 3.4, frame: '#262c38', glass: ['#1d3550', '#22405e', '#1a2c44'], lit: ['#ffe2b8', '#fff1dc', '#e2ecff'], litP: 0.22, mullion: 2, mx: 1 },
  teal: { bay: 1.6, floor: 3.4, frame: '#1e3438', glass: ['#1d4a50', '#24525a', '#183a40'], lit: ['#ffe6c0', '#eaf6ff'], litP: 0.2, mullion: 2, mx: 1 },
  concrete: { bay: 2.4, floor: 3.4, frame: '#8a857c', glass: ['#161a22', '#1e222c'], lit: ['#ffcf90', '#ffe2b8', '#ffd8a0'], litP: 0.32, mullion: 9, mx: 13 },
  resi: { bay: 2.2, floor: 3.1, frame: '#b8b1a4', glass: ['#181d28', '#20262f'], lit: ['#ffc888', '#ffdcac', '#ffe9c8', '#d8e6ff'], litP: 0.36, mullion: 6, mx: 10, balcony: true },
  brick: { bay: 2.2, floor: 3.6, frame: '#6e3226', glass: ['#1a1618', '#221c1e'], lit: ['#ffc070', '#ffd896'], litP: 0.35, mullion: 10, mx: 16 },
  cream: { bay: 3.0, floor: 3.3, frame: '#e6decf', glass: ['#22303e', '#2a3848', '#1c2632'], lit: ['#ffd8a8', '#ffe8c8', '#fff2e0'], litP: 0.34, mullion: 7, mx: 4 },
  dark: { bay: 1.5, floor: 3.6, frame: '#121418', glass: ['#10141c', '#161c28'], lit: ['#f0f4ff', '#ffe8c8'], litP: 0.18, mullion: 2, mx: 1 },
};
function facadeTextures(style) {
  const F = FACADES[style];
  const S = 1024, bw = S / 16, fh = S / 32;
  let lits = [];
  const draw = (emit) => (g) => {
    reseed(style.length * 97 + 3);
    g.fillStyle = emit ? '#000' : F.frame;
    g.fillRect(0, 0, S, S);
    lits = [];
    for (let fy = 0; fy < 32; fy++) {
      const floorLit = rnd() < 0.06 ? 0.85 : F.litP; // whole lit floors (offices still working)
      for (let bx = 0; bx < 16; bx++) {
        const m = F.mullion, mx = F.mx ?? m;
        const x = bx * bw + mx, y = fy * fh + m, w = bw - mx * 2, h = fh - m * 2 - (F.balcony ? 3 : 0);
        const lit = rnd() < floorLit;
        const lc = pick(F.lit);
        const gc = pick(F.glass);
        const blind = rr(0, 0.6);
        if (emit) {
          if (lit) {
            const gr = g.createLinearGradient(0, y, 0, y + h);
            gr.addColorStop(0, lc);
            gr.addColorStop(blind, lc);
            gr.addColorStop(Math.min(1, blind + 0.02), shade(lc, 0.55));
            gr.addColorStop(1, shade(lc, 0.75));
            g.fillStyle = gr;
            g.globalAlpha = rr(0.35, 1);
            g.fillRect(x, y, w, h);
            g.globalAlpha = 1;
          }
        } else {
          const gr = g.createLinearGradient(x, y, x + w, y + h);
          gr.addColorStop(0, shade(gc, 1.25));
          gr.addColorStop(1, gc);
          g.fillStyle = gr;
          g.fillRect(x, y, w, h);
        }
        if (F.balcony) { g.fillStyle = emit ? '#000' : '#e8e2d6'; g.fillRect(bx * bw, fy * fh + fh - 4, bw, 3); }
      }
    }
  };
  const map = canvasTex(`fac-${style}`, S, S, draw(false));
  const em = canvasTex(`fac-${style}-e`, S, S, draw(true));
  return { map, em, F };
}
function shade(hex, k) {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
}
const facadeMats = {};
export function facadeMat(style, glowK = 0.9) {
  const key = style + glowK;
  if (!facadeMats[key]) {
    const { map, em } = facadeTextures(style);
    facadeMats[key] = keep(new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: glowK, roughness: style === 'glass' || style === 'teal' || style === 'dark' ? 0.12 : 0.85, metalness: style === 'glass' || style === 'teal' || style === 'dark' ? 0.55 : 0, envMapIntensity: 1.4 }));
  }
  return facadeMats[key];
}
// Box whose side UVs tile the facade by real bay / floor size; u0/v0 shift so neighbours differ.
export function facadeBox(w, h, d, style, { roof = PAL.concrete, glowK = 0.9, u0 = 0, v0 = 0 } = {}) {
  const F = FACADES[style];
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const faceDims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [a, b] = faceDims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * (a / F.bay / 16) + u0 + f * 0.37, uv.getY(k) * (b / F.floor / 32) + v0);
    }
  }
  const fm = facadeMat(style, glowK);
  const rm = mat(roof, { roughness: 0.9 });
  const m = mesh(g, [fm, fm, rm, rm, fm, fm]);
  return m;
}

// ---------------------------------------------------------------- ground + streets
const groundTex = () => canvasTex('pavers', 512, 512, (g, s) => {
  g.fillStyle = '#4c4c54';
  g.fillRect(0, 0, s, s);
  reseed(4);
  for (let y = 0; y < s; y += 32) for (let x = 0; x < s; x += 32) {
    g.fillStyle = `rgb(${70 + rr(-8, 8)},${70 + rr(-8, 8)},${78 + rr(-8, 8)})`;
    g.fillRect(x + 1, y + 1, 30, 30);
  }
});
const asphaltTex = () => canvasTex('asphalt', 512, 512, (g, s) => {
  g.fillStyle = '#26272e';
  g.fillRect(0, 0, s, s);
  reseed(5);
  for (let i = 0; i < 9000; i++) { const v = rr(20, 60); g.fillStyle = `rgba(${v},${v},${v + 6},0.5)`; g.fillRect(rr(0, s), rr(0, s), 2, 2); }
  for (let i = 0; i < 26; i++) { // puddles: darker, glossier patches
    const x = rr(0, s), y = rr(0, s), r = rr(20, 70);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(8,8,12,0.75)');
    gr.addColorStop(1, 'rgba(8,8,12,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
});
const roughTex = () => canvasTex('asphalt-r', 512, 512, (g, s) => {
  g.fillStyle = '#b0b0b0';
  g.fillRect(0, 0, s, s);
  reseed(5);
  for (let i = 0; i < 9000; i++) rnd();
  for (let i = 0; i < 26; i++) {
    const x = rr(0, s), y = rr(0, s), r = rr(20, 70);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(10,10,10,1)');
    gr.addColorStop(1, 'rgba(10,10,10,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}, { srgb: false });

export function asphaltMat(rep = 40) {
  const key = 'asph' + rep;
  return mat(0xffffff, { map: rep2(asphaltTex(), rep, key), roughnessMap: rep2(roughTex(), rep, key + 'r'), roughness: 0.55, metalness: 0.15, envMapIntensity: 1.5 });
}
const repCache = new Map();
function rep2(t, r, key) {
  if (!repCache.has(key)) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(r, r); repCache.set(key, c); }
  return repCache.get(key);
}

// Ground plane, road strips with markings, curbs, crosswalks for the window [x0,x1]×[z0,z1].
export function streets(ctx, { x0 = -700, x1 = 800, z0 = -700, z1 = 750 } = {}) {
  const S = ctx.scene;
  const ground = mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat(0x8a8a92, { map: rep2(groundTex(), (x1 - x0) / 6, 'gnd' + (x1 - x0)), roughness: 0.5, metalness: 0.1, envMapIntensity: 1.2 }), { receive: true });
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  S.add(ground);
  const am = asphaltMat(1);
  const dashes = [], edges = [], curbs = [];
  const roadNS = (x, w) => {
    if (x < x0 - 30 || x > x1 + 30 || x === NS.rail) return;
    const [ra, rb] = NS_RANGE[x] || [-1e9, 1e9];
    const za = Math.max(z0, ra), zb = Math.min(z1, rb);
    if (zb <= za) return;
    const r = mesh(new THREE.PlaneGeometry(w, zb - za), asphaltMatFor(w, zb - za), { receive: true });
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.03, (za + zb) / 2);
    S.add(r);
    for (let z = za; z < zb; z += 9) if (!nearList(z, Z_LIST, 12)) dashes.push([x, z, 0.15, 4, 0]);
    curbs.push([x - w / 2 - 0.15, (za + zb) / 2, 0.3, zb - za], [x + w / 2 + 0.15, (za + zb) / 2, 0.3, zb - za]);
  };
  const roadEW = (z, w) => {
    if (z < z0 - 30 || z > z1 + 30) return;
    const r = mesh(new THREE.PlaneGeometry(x1 - x0, w), asphaltMatFor(x1 - x0, w), { receive: true });
    r.rotation.x = -Math.PI / 2;
    r.position.set((x0 + x1) / 2, 0.035, z);
    S.add(r);
    for (let x = x0; x < x1; x += 9) if (!nearList(x, X_LIST, 12)) dashes.push([x, z, 4, 0.15, 0]);
    curbs.push([(x0 + x1) / 2, z - w / 2 - 0.15, x1 - x0, 0.3], [(x0 + x1) / 2, z + w / 2 + 0.15, x1 - x0, 0.3]);
  };
  for (const x of X_LIST) roadNS(x, NSW[x]);
  for (const z of Z_LIST) roadEW(z, EWW[z]);
  // crosswalk zebras at every intersection
  for (const x of X_LIST) for (const z of Z_LIST) {
    if (x === NS.rail || x < x0 || x > x1 || z < z0 || z > z1) continue;
    if (NS_RANGE[x] && (z < NS_RANGE[x][0] || z > NS_RANGE[x][1])) continue;
    const wx = NSW[x], wz = EWW[z];
    for (let k = -wx / 2 + 1; k < wx / 2 - 0.5; k += 1.2) { edges.push([x + k, z - wz / 2 - 2, 0.6, 3]); edges.push([x + k, z + wz / 2 + 2, 0.6, 3]); }
    for (let k = -wz / 2 + 1; k < wz / 2 - 0.5; k += 1.2) { edges.push([x - wx / 2 - 2, z + k, 3, 0.6]); edges.push([x + wx / 2 + 2, z + k, 3, 0.6]); }
  }
  const inst = (list, color, y, ei = 0) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat(color, { roughness: 0.5, emissive: color, emissiveIntensity: ei }), list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    list.forEach(([x, z, w, d], i) => im.setMatrixAt(i, m4.compose(V(x, y, z), q, V(w, d, 1))));
    im.receiveShadow = true;
    S.add(im);
  };
  inst(dashes.filter(([x, z]) => true), 0xd8c46a, 0.05, 0.05);
  inst(edges, 0xdedede, 0.05, 0.04);
  const cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.18, 1), mat(PAL.curb, { roughness: 0.8 }), curbs.length);
  const m4 = new THREE.Matrix4();
  curbs.forEach(([x, z, w, d], i) => cm.setMatrixAt(i, m4.compose(V(x, 0.09, z), new THREE.Quaternion(), V(w, 1, d))));
  S.add(cm);
}
const asphCache = new Map();
function asphaltMatFor(w, d) {
  const key = `${Math.round(w / 8)}x${Math.round(d / 8)}`;
  if (!asphCache.has(key)) {
    const map = asphaltTex().clone(); map.needsUpdate = true; map.repeat.set(w / 8, d / 8);
    const rm = roughTex().clone(); rm.needsUpdate = true; rm.repeat.set(w / 8, d / 8);
    asphCache.set(key, keep(new THREE.MeshStandardMaterial({ map, roughnessMap: rm, roughness: 0.6, metalness: 0.2, envMapIntensity: 1.6 })));
  }
  return asphCache.get(key);
}
const nearList = (v, list, d) => list.some((x) => Math.abs(v - x) < d);

// ---------------------------------------------------------------- filler towers
const reserved = [];
export function reserve(x, z, hw, hd) { reserved.push([x - hw, x + hw, z - hd, z + hd]); }
for (const [k, [x, z]] of Object.entries(PLACES)) {
  const r = { starbucks: [22, 24], citi: [30, 30], vue: [26, 26], aspire: [24, 26], society: [26, 26], truist: [32, 32], church: [40, 30], kia: [90, 70], drp: [60, 45], fountain: [0, 0] }[k];
  reserve(x, z, r[0], r[1]);
}
const inLake = (x, z, pad = 30) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + pad;
const parkRect = (x, z) => x > NS.rosalind && x < NS.eolaDr && z > EW.robinson && z < EW.central;

// Height field: tallest along Orange Ave between Washington and Church, falling off outward.
function heightAt(x, z) {
  const dx = Math.abs(x - 20), dz = Math.abs(z - 150);
  const core = Math.exp(-(dx * dx) / (2 * 230 * 230) - (dz * dz) / (2 * 330 * 330));
  return 14 + core * 95;
}
export function filler(ctx, { focus = [0, 0], radius = 900, skip = [] } = {}) {
  const S = ctx.scene;
  const styles = ['glass', 'concrete', 'resi', 'teal', 'brick', 'dark', 'resi', 'concrete'];
  const beacons = [];
  for (let i = 0; i < X_LIST.length - 1; i++) for (let j = 0; j < Z_LIST.length - 1; j++) {
    const xa = X_LIST[i] + NSW[X_LIST[i]] / 2 + 6, xb = X_LIST[i + 1] - NSW[X_LIST[i + 1]] / 2 - 6;
    const za = Z_LIST[j] + EWW[Z_LIST[j]] / 2 + 6, zb = Z_LIST[j + 1] - EWW[Z_LIST[j + 1]] / 2 - 6;
    reseed(1000 + i * 37 + j * 101);
    // lots: split the block into a grid of ~45 m lots
    const nx = Math.max(1, Math.round((xb - xa) / 48)), nz = Math.max(1, Math.round((zb - za) / 48));
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const lx0 = xa + (xb - xa) * a / nx, lx1 = xa + (xb - xa) * (a + 1) / nx;
      const lz0 = za + (zb - za) * b / nz, lz1 = za + (zb - za) * (b + 1) / nz;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
      const w = (lx1 - lx0) - rr(3, 10), d = (lz1 - lz0) - rr(3, 10);
      const retailRoll = rnd(), hRoll = rnd(), sRoll = rnd(), uRoll = rnd(), vRoll = rnd(), setRoll = rnd(), crownRoll = rnd(), ledC = pick([0x34e4ff, 0xff3d8b, 0xffb03a, 0x8a6bff, 0xffffff]);
      if (Math.hypot(cx - focus[0], cz - focus[1]) > radius) continue;
      if (inLake(cx, cz) || parkRect(cx, cz)) continue;
      if (reserved.some(([x0, x1, z0, z1]) => cx > x0 - w / 2 && cx < x1 + w / 2 && cz > z0 - d / 2 && cz < z1 + d / 2)) continue;
      if (Math.abs(cx - NS.rail) < 40) continue;
      if (skip.some(([sx, sz, sr]) => Math.hypot(cx - sx, cz - sz) < sr)) continue;
      const h = Math.max(10, heightAt(cx, cz) * (0.35 + hRoll * 0.9));
      const style = h < 22 ? pick(['brick', 'resi', 'concrete']) : styles[Math.floor(sRoll * styles.length)];
      const bld = facadeBox(w, h, d, style, { u0: Math.floor(uRoll * 16) / 16, v0: Math.floor(vRoll * 32) / 32, roof: 0x3a3a42 });
      bld.position.set(cx, h / 2, cz);
      S.add(bld);
      if (h > 40 && setRoll < 0.5) { // setback crown
        const h2 = h * rr(0.12, 0.3);
        const c = facadeBox(w * 0.7, h2, d * 0.7, style, { u0: 0.25, roof: 0x3a3a42 });
        c.position.set(cx, h + h2 / 2, cz);
        S.add(c);
      }
      if (h > 60 && crownRoll < 0.3) { // LED edge crown (downtown towers light their tops)
        const t = h + 0.3;
        for (const [px, pz, sw, sd] of [[cx, cz - d / 2, w, 0.4], [cx, cz + d / 2, w, 0.4], [cx - w / 2, cz, 0.4, d], [cx + w / 2, cz, 0.4, d]]) box(sw, 0.4, sd, glow(ledC, 1.6), px, t, pz, S);
      }
      if (h > 60) beacons.push([cx, h + 2, cz]);
      // ground-floor retail glow
      if (h > 15 && retailRoll < 0.65) {
        const gm = glow(pick([0xffcf98, 0xffe2c0, 0xd8ecff]), 0.55);
        box(w + 0.1, 3.0, d + 0.1, gm, cx, 1.7, cz, S);
        box(w + 0.6, 0.5, d + 0.6, mat(0x2a2a30, { roughness: 0.6 }), cx, 3.5, cz, S); // canopy line
      }
      // roof clutter: mech penthouse, AC units, water tank
      if (h > 20) {
        const rm = mat(0x6a6a70, { roughness: 0.8 });
        box(w * 0.3, 3.5, d * 0.3, rm, cx + w * 0.15, h + 1.75, cz - d * 0.1, S);
        for (let k = 0; k < 3; k++) box(2, 1.2, 2, rm, cx - w * 0.3 + k * 2.8, h + 0.6, cz + d * 0.3, S);
      }
    }
  }
  for (const [x, y, z] of beacons) { // red aircraft beacons
    const s = glowSprite(0xff2a2a, 3, 1);
    s.position.set(x, y, z);
    S.add(s);
  }
}

// ---------------------------------------------------------------- props
const frondGeo = (() => {
  // A drooping palm frond: tapered strip with leaflet zig-zag, bent along its length.
  const pts = [], idx = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const u = i / N, len = u * 4.2, droop = -u * u * 2.2, w = Math.sin(u * Math.PI) * 0.9 + 0.05;
    pts.push(len, droop, -w, len, droop + 0.12, 0, len, droop, w);
  }
  for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();
export function palm(h = 9, lean = 0.08, rot = 0) {
  const g = new THREE.Group();
  const segs = 7;
  let p = V(0, 0, 0);
  const trunkM = mat(PAL.trunk, { roughness: 0.95 });
  for (let i = 0; i < segs; i++) {
    const sh = h / segs;
    const c = cyl(0.22 - i * 0.012, 0.26 - i * 0.012, sh, trunkM, 7);
    const off = V(Math.sin(lean * i * 0.6) * sh * 0.6, 0, 0);
    c.position.copy(p).add(V(off.x / 2, sh / 2, 0));
    c.rotation.z = -lean * i * 0.6 * 0.5;
    g.add(c);
    p = p.clone().add(V(off.x, sh, 0));
  }
  const crown = new THREE.Group();
  crown.position.copy(p);
  const fm = mat(PAL.palm, { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const f = mesh(frondGeo, fm);
    f.rotation.set(0, (i / 11) * Math.PI * 2 + hash(i + h) * 0.4, rr(-0.35, 0.45));
    crown.add(f);
  }
  g.add(crown);
  g.userData.crown = crown;
  g.rotation.y = rot;
  return g;
}
// Live oak with Spanish moss (Lake Eola's park trees).
export function oak(s = 1) {
  const g = new THREE.Group();
  cyl(0.5 * s, 0.7 * s, 3.5 * s, mat(0x4a3a2c), 8, 0, 1.75 * s, 0, g);
  const lm = mat(0x22401f, { roughness: 0.95 });
  const mm = mat(0x8a9080, { roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const r = rr(2.2, 3.6) * s;
    const b = mesh(new THREE.IcosahedronGeometry(r, 1), lm);
    b.position.set(rr(-4, 4) * s, rr(4.2, 6.8) * s, rr(-4, 4) * s);
    b.scale.y = 0.7;
    g.add(b);
    for (let k = 0; k < 3; k++) { const m = cyl(0.12 * s, 0.02, rr(1.2, 2.4) * s, mm, 4); m.position.set(b.position.x + rr(-r, r) * 0.6, b.position.y - r * 0.7 - 0.8 * s, b.position.z + rr(-r, r) * 0.6); g.add(m); }
  }
  return g;
}
// Street lamp: pole, arm, warm head, ground pool + wet-road streak.
export function lamp(ctx, x, z, dir = 1, { color = 0xffc98a, h = 7.5 } = {}) {
  const g = new THREE.Group();
  const pm = mat(0x22252c, { roughness: 0.5, metalness: 0.6 });
  cyl(0.09, 0.13, h, pm, 8, 0, h / 2, 0, g);
  box(1.6, 0.1, 0.1, pm, dir * 0.8, h, 0, g);
  box(0.7, 0.12, 0.35, glow(color, 3), dir * 1.5, h - 0.12, 0, g);
  const s = glowSprite(color, 1.8, 0.7);
  s.position.set(dir * 1.5, h - 0.4, 0);
  g.add(s);
  const pool = addQuad(dotTex(), color, 10, 10, 0.07);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(dir * 1.5, 0.07, 0);
  g.add(pool);
  g.position.set(x, 0, z);
  ctx.scene.add(g);
  reflect(ctx, V(x + dir * 1.5, h - 0.1, z), color, 0.9, 0.3);
  return g;
}
// Wet-road reflection: a ground streak running from under the light toward the camera.
export function reflect(ctx, pos, color, width = 1, intensity = 0.6, len = null) {
  const q = addQuad(streakTex(), color, width, 1, intensity);
  q.rotation.order = 'YXZ';
  ctx.scene.add(q);
  const L = len || pos.y * 2.2;
  ctx.tick.push(() => {
    const cam = ctx.camera.position;
    const dx = cam.x - pos.x, dz = cam.z - pos.z;
    const D = Math.hypot(dx, dz);
    const a = Math.atan2(dx, dz);
    // mirror point: where the camera sees the light's reflection; the streak spreads around it
    const c = Math.max(0.3, cam.y), m = D * pos.y / (pos.y + c);
    const l = Math.min(L, D * 0.9);
    const ctr = Math.min(m, D - l * 0.5) * 0.85;
    q.scale.set(1, l, 1);
    q.position.set(pos.x + Math.sin(a) * ctr, 0.08, pos.z + Math.cos(a) * ctr);
    q.rotation.set(-Math.PI / 2, a, 0);
    q.visible = D > 2;
  });
  return q;
}
export function trafficLight(ctx, x, z, rotY, state = 'red') {
  const g = new THREE.Group();
  const pm = mat(0x2a2c32, { roughness: 0.5, metalness: 0.5 });
  cyl(0.12, 0.14, 6, pm, 8, 0, 3, 0, g);
  box(5, 0.16, 0.16, pm, 2.5, 6, 0, g);
  const head = box(0.45, 1.3, 0.4, mat(0x1a1c20), 4.4, 5.3, 0, g);
  const cols = { red: [0xff2a1a, 0x3a0a08, 0x08300f], green: [0x3a0a08, 0x3a2a08, 0x1aff6a] };
  const c = cols[state] || cols.red;
  [[c[0], 0.38], [state === 'yellow' ? 0xffb000 : 0x3a2a08, 0], [c[2], -0.38]].forEach(([col, dy]) => {
    const on = col !== 0x3a0a08 && col !== 0x3a2a08 && col !== 0x08300f;
    box(0.26, 0.26, 0.05, on ? glow(col, 5) : mat(col), 0, dy, 0.21, head);
    if (on) { const s = glowSprite(col, 2.2, 1); s.position.set(4.4, 5.3 + dy, 0.4); g.add(s); }
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.scene.add(g);
  return g;
}

// ---------------------------------------------------------------- vehicles
const CAR_COLS = [0xd8d8dc, 0x1a1c22, 0x8a1c1c, 0x2a3a6a, 0x9aa0a8, 0xf2f2f2, 0x3a3a3a, 0xc8a050, 0x1e4a3a];
export function car(color = pick(CAR_COLS), { lights = true, brake = false } = {}) {
  const g = new THREE.Group();
  const paint = mat(color, { roughness: 0.25, metalness: 0.6, envMapIntensity: 1.2 });
  const glass = mat(0x0c1018, { roughness: 0.05, metalness: 0.9 });
  const body = mesh(new RoundedBoxGeometry(1.85, 0.75, 4.5, 3, 0.25), paint);
  body.position.y = 0.72;
  g.add(body);
  const cab = mesh(new RoundedBoxGeometry(1.6, 0.62, 2.4, 3, 0.25), glass);
  cab.position.set(0, 1.32, 0.2);
  g.add(cab);
  const wm = mat(0x0a0a0c, { roughness: 0.9 });
  for (const [x, z] of [[-0.85, -1.45], [0.85, -1.45], [-0.85, 1.45], [0.85, 1.45]]) { const w = cyl(0.36, 0.36, 0.28, wm, 14, x, 0.36, z, g); w.rotation.z = Math.PI / 2; }
  if (lights) {
    for (const x of [-0.65, 0.65]) {
      box(0.42, 0.12, 0.05, glow(0xf4f8ff, 6), x, 0.85, -2.26, g);
      const s = glowSprite(0xdfe8ff, 1.1, 0.9); s.position.set(x, 0.85, -2.4); g.add(s);
      box(0.42, 0.12, 0.05, glow(0xff1a1a, brake ? 7 : 3), x, 0.9, 2.26, g);
      const r = glowSprite(0xff2020, brake ? 1.4 : 0.8, brake ? 0.9 : 0.5); r.position.set(x, 0.9, 2.45); g.add(r);
    }
  }
  g.userData.fwd = -1; // cars face -z
  return g;
}
export function lynxBus() {
  const g = new THREE.Group();
  const tex = canvasTex('lynx', 1024, 256, (c, w, h) => {
    c.fillStyle = '#eeeef2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#121620'; c.fillRect(40, 40, w - 80, 110); // window band
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d6006e'); gr.addColorStop(1, '#ff4fa0');
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, 200); c.bezierCurveTo(w * 0.3, 150, w * 0.6, 240, w, 170); c.lineTo(w, 256); c.lineTo(0, 256); c.fill();
    c.fillStyle = '#fff'; c.font = '900 64px Inter'; c.fillText('LYNX', w * 0.62, 232);
  }, { repeat: false });
  const bm = mat(0xffffff, { map: tex, roughness: 0.35, metalness: 0.2 });
  const b = mesh(new RoundedBoxGeometry(2.55, 3.1, 12, 3, 0.3), [bm, bm, mat(0xe8e8ee), mat(0x222222), mat(0xe8e8ee), mat(0xe8e8ee)]);
  b.position.y = 1.85;
  g.add(b);
  box(2.3, 1.2, 0.05, mat(0x0c1018, { roughness: 0.05, metalness: 0.8 }), 0, 2.4, -6.02, g);
  box(1.6, 0.3, 0.05, glow(0xffa020, 4), 0, 3.15, -6.03, g); // destination sign
  for (const x of [-0.95, 0.95]) { box(0.35, 0.18, 0.05, glow(0xf4f8ff, 6), x, 0.8, -6.03, g); const s = glowSprite(0xdfe8ff, 2.6, 1); s.position.set(x, 0.8, -6.3); g.add(s); }
  const wm = mat(0x0a0a0c);
  for (const [x, z] of [[-1.2, -4], [1.2, -4], [-1.2, 3.5], [1.2, 3.5]]) { const w = cyl(0.5, 0.5, 0.35, wm, 14, x, 0.5, z, g); w.rotation.z = Math.PI / 2; }
  return g;
}

// I-4 viaduct with streaming head/tail-light trails (the city's pulse in wide shots).
export function i4(ctx, { z0 = -700, z1 = 800 } = {}) {
  const S = ctx.scene;
  const x = NS.i4;
  const deck = box(36, 1.6, z1 - z0, mat(0x6a6a72, { roughness: 0.8 }), x, 9, (z0 + z1) / 2, S);
  for (let z = z0; z < z1; z += 40) box(2.5, 9, 6, mat(0x5a5a62), x, 4.5, z, S);
  box(0.6, 1.1, z1 - z0, mat(0x8a8a90), x - 18, 10.3, (z0 + z1) / 2, S);
  box(0.6, 1.1, z1 - z0, mat(0x8a8a90), x + 18, 10.3, (z0 + z1) / 2, S);
  const trails = [];
  for (let lane = 0; lane < 6; lane++) {
    const isHead = lane < 3;
    const lx = x - 15 + lane * 6;
    for (let k = 0; k < 18; k++) {
      const q = addQuad(dotTex(), isHead ? 0xfff2dc : 0xff2a20, 1.2, 14, isHead ? 1.6 : 1.4);
      q.rotation.x = -Math.PI / 2;
      S.add(q);
      trails.push({ q, lx, off: hash(lane * 50 + k) * (z1 - z0), sp: (isHead ? 1 : -1) * rr(24, 32), z0, z1 });
    }
  }
  ctx.tick.push((t) => { for (const tr of trails) { const L = tr.z1 - tr.z0; let z = ((tr.off + tr.sp * t) % L + L) % L; tr.q.position.set(tr.lx, 10.1, tr.z0 + z); } });
  void deck;
}

// Lit street furniture along a road: lamps + palms on both sides, every `step` m.
export function dressRoadNS(ctx, x, z0, z1, { step = 32, palms = true, lamps = true, w = 22 } = {}) {
  for (let z = z0; z < z1; z += step) {
    if (nearList(z, Z_LIST, 14)) continue;
    if (lamps) { lamp(ctx, x - w / 2 - 1.2, z, 1); lamp(ctx, x + w / 2 + 1.2, z + step / 2, -1); }
    if (palms) {
      const p1 = palm(rr(8, 11), rr(-0.1, 0.1), rr(0, 6)); p1.position.set(x - w / 2 - 2.5, 0, z + step / 4); ctx.scene.add(p1);
      const p2 = palm(rr(8, 11), rr(-0.1, 0.1), rr(0, 6)); p2.position.set(x + w / 2 + 2.5, 0, z + step * 0.75); ctx.scene.add(p2);
    }
  }
}
export function dressRoadEW(ctx, z, x0, x1, { step = 32, palms = true, lamps = true, w = 16 } = {}) {
  for (let x = x0; x < x1; x += step) {
    if (nearList(x, X_LIST, 14)) continue;
    if (lamps) { const l = lamp(ctx, x, z - w / 2 - 1.2, 1); l.rotation.y = Math.PI / 2; const l2 = lamp(ctx, x + step / 2, z + w / 2 + 1.2, -1); l2.rotation.y = Math.PI / 2; }
    if (palms) {
      const p1 = palm(rr(8, 11), rr(-0.1, 0.1), rr(0, 6)); p1.position.set(x + step / 4, 0, z - w / 2 - 2.5); ctx.scene.add(p1);
      const p2 = palm(rr(8, 11), rr(-0.1, 0.1), rr(0, 6)); p2.position.set(x + step * 0.75, 0, z + w / 2 + 2.5); ctx.scene.add(p2);
    }
  }
}

// Generic people silhouettes on sidewalks (low detail, read as life in the background).
export function pedestrian(color = pick([0x2a2a3a, 0x6a2a2a, 0x2a4a6a, 0xd8d0c0, 0x3a5a3a])) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.8 });
  const b = mesh(new THREE.CapsuleGeometry(0.24, 0.8, 3, 8), m); b.position.y = 1.15; g.add(b);
  const h = mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(pick([0xc68a62, 0x8a5a3a, 0xe0b090, 0x5a3a2a]))); h.position.y = 1.78; g.add(h);
  for (const x of [-0.1, 0.1]) { const l = cyl(0.08, 0.07, 0.8, mat(0x1a1a22), 6, x, 0.4, 0, g); void l; }
  return g;
}

export function merge(meshes) { return BufferGeometryUtils.mergeGeometries(meshes); }

// Wide-shot city lights: sodium lamp points along every street + a far city that runs to the horizon.
export function cityLights(ctx, { focus = [0, 0], radius = 900, far = 2600 } = {}) {
  const S = ctx.scene;
  const pts = [];
  for (const x of X_LIST) { if (x === NS.rail) continue; const [ra, rb] = NS_RANGE[x] || [-1e9, 1e9]; for (let z = Math.max(focus[1] - radius, ra); z < Math.min(focus[1] + radius, rb); z += 28) { pts.push(x - NSW[x] / 2 - 1, 7, z, x + NSW[x] / 2 + 1, 7, z + 14); } }
  for (const z of Z_LIST) for (let x = focus[0] - radius; x < focus[0] + radius; x += 28) { if (inLake(x, z, 0)) continue; pts.push(x, 7, z - EWW[z] / 2 - 1, x + 14, 7, z + EWW[z] / 2 + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const pm = new THREE.PointsMaterial({ map: dotTex(), color: new THREE.Color(0xffb060).multiplyScalar(1.6), size: 9, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const P = new THREE.Points(g, pm); S.add(P);
  const fgp = mesh(new THREE.CircleGeometry(far * 1.6, 48), mat(0x14141c, { roughness: 1 }));
  fgp.rotation.x = -Math.PI / 2; fgp.position.set(focus[0], -0.05, focus[1]); S.add(fgp);
  // far city: instanced towers with the concrete facade, low-rise and sparse, out to the horizon
  reseed(404);
  const n = 900, geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.25);
  const im = new THREE.InstancedMesh(geo, facadeMat('concrete', 0.9), n);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const a = rr(0, Math.PI * 2), r = rr(radius * 0.95, far);
    const x = focus[0] + Math.cos(a) * r, z = focus[1] + Math.sin(a) * r;
    if (inLake(x, z, 60)) continue;
    const h = rr(8, 30) * (r < radius * 1.3 ? 1.6 : 1) * (rnd() < 0.06 ? 2.5 : 1), w = rr(18, 50);
    im.setMatrixAt(k++, m4.compose(V(x, h / 2, z), new THREE.Quaternion(), V(w, h, rr(18, 50))));
  }
  im.count = k; S.add(im);
  const fp = [];
  for (let i = 0; i < 2500; i++) { const a = rr(0, Math.PI * 2), r = rr(radius, far * 1.3); fp.push(focus[0] + Math.cos(a) * r, rr(2, 8), focus[1] + Math.sin(a) * r); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  S.add(new THREE.Points(fg, new THREE.PointsMaterial({ map: dotTex(), color: new THREE.Color(0xffc080).multiplyScalar(1.2), size: 7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  return P;
}
