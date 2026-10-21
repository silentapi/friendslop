// Citi Tower, 101 Lake Ave (NE corner of E Church St & Lake Ave). Real OSM footprint 32.3 x 63.9 m, 89 m tall.
// Modelled on the street-level reference photos (Feb 2026 street view + corner photo):
//  - ground floor glazing (dark teal glass, silver mullion grid) set back under a white overhang with downlights
//  - round white columns at the overhang edge, one at the Church/Lake corner
//  - slatted grey metal canopy wrapping the corner; brushed-metal 3D letters "CITITOWER 101" standing on it (Lake Ave)
//  - gravel beds with agaves, fan palms, boulders, a blue abstract sculpture; tall sabal palm; spiral bike racks
//  - twin-globe black lamp posts, stop sign + yellow curb at the corner; brick-paved Lake Ave
//  - cream rounded corner mass above the entrance, then rounded corner balconies with glass rails up the tower
//  - 11 four-storey geometric aluminium art panels (Israel Guevara) on the garage podium; rooftop pool deck
// Local frame = world (origin at the OSM centroid of the footprint ≈ (-3.2, -6.3)); x east, z south.
import { THREE, V, mat, emissive, mesh, box, cyl, canvasTex, mulberry, loadJSON , mergeStatic } from './core.js';
import { palm } from './props.js';
// game port: physical → standard materials, no texture maps for plaster/brick, no extra dynamic lights
const pbr = (id, o = {}) => mat(o.color ?? 0xcccccc, { roughness: o.rough ?? 0.85 });
const physM = (o) => { for (const k of ['clearcoat', 'clearcoatRoughness', 'ior', 'specularIntensity', 'transmission']) delete o[k]; return new THREE.MeshStandardMaterial(o); };
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export const CITI = { x0: -16.2, x1: 16.2, z0: -31.8, z1: 31.9, H: 89, floors: 25, glassH: 7.4, podTop: 22.0, setback: 3.2 };
let fontP = null; const font = () => (fontP ||= loadJSON('fonts/helvetiker_bold.typeface.json').then((j) => new FontLoader().parse(j)));

export async function citiTower(scene, { night = 0 } = {}) {
  const C = CITI, S = scene;
  const g = new THREE.Group(); S.add(g);
  const cx = C.x0, cz = C.z1; // SW corner = Church & Lake
  const W = C.x1 - C.x0, D = C.z1 - C.z0;
  const cream = new THREE.MeshStandardMaterial({ color: 0xf1e9da, roughness: 0.82 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfaf8f3, roughness: 0.6 });
  for (const m of [cream, white]) { m.userData.keep = true; }
  const steel = physM({ color: 0xa7adb3, metalness: 0.9, roughness: 0.35, envMapIntensity: 1.2 });
  const glassDark = physM({ color: 0x1c3a40, roughness: 0.04, metalness: 0.4, envMapIntensity: 1.6, clearcoat: 1, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const glassUp = physM({ color: 0x1e2e34, roughness: 0.03, metalness: 0.0, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6, clearcoat: 0.6 });
  const GH = C.glassH, RS = C.setback;
  const gx = cx + RS, gzz = cz - RS;

  // ---- ground floor: lobby glass set back under the overhang (Lake Ave run 30 m, Church St run 22 m)
  const WL = 30, SL = 22;
  const glazing = (a, b) => {
    const d = b.clone().sub(a), L = d.length(), mid = a.clone().add(b).multiplyScalar(0.5), yaw = Math.atan2(d.x, d.z) + Math.PI / 2;
    const p = mesh(new THREE.PlaneGeometry(L, GH), glassDark, { cast: false }); p.position.copy(mid).add(V(0, GH / 2, 0)); p.rotation.y = yaw; g.add(p);
    const n = Math.round(L / 1.55);
    for (let i = 0; i <= n; i++) { const q = a.clone().lerp(b, i / n); box(0.07, GH, 0.14, steel, q.x, GH / 2, q.z, g).rotation.y = yaw; }
    for (let y = 0.05; y < GH; y += 1.24) box(L, 0.06, 0.15, steel, mid.x, y, mid.z, g).rotation.y = yaw;
  };
  glazing(V(gx, 0, gzz), V(gx, 0, gzz - WL + RS));
  glazing(V(gx, 0, gzz), V(gx + SL - RS, 0, gzz));
  // doors (Lake Ave, ~10 m north of the corner): two glass leaves with pull bars + a dark frame
  const doorZ = cz - 11.5;
  box(0.2, 2.8, 3.6, mat(0x1d1f22, { metalness: 0.6, roughness: 0.4 }), gx - 0.05, 1.4, doorZ, g);
  for (const s of [-1, 1]) { box(0.05, 2.6, 1.6, glassDark, gx - 0.12, 1.32, doorZ + s * 0.85, g); box(0.06, 1.3, 0.04, steel, gx - 0.2, 1.1, doorZ + s * 0.2, g); }
  // herringbone brick panel at the north end of the glazing, then the cream wall carrying on
  const herr = pbr('herringbone_brick', { world: 1.4, color: 0xd8b8a0, rough: 0.9 });
  box(0.15, GH, 3.4, herr, gx - 0.02, GH / 2, gzz - WL + RS - 1.7, g);
  box(1, GH, D - WL - 1.5, cream, cx + 0.5, GH / 2, C.z0 + (D - WL - 1.5) / 2, g);
  box(W - SL, GH, 1, cream, cx + SL + (W - SL) / 2, GH / 2, cz - 0.5, g);
  // interior: polished floor, warm wood walls, ring chandeliers, plants, concierge desk
  const marble = pbr('marble_01', { world: 2.5, rough: 0.12, color: 0xe8e2d8 });
  const fl = mesh(new THREE.PlaneGeometry(12, WL), marble, { cast: false }); fl.rotation.x = -Math.PI / 2; fl.position.set(gx + 6, 0.02, gzz - WL / 2 + RS / 2); g.add(fl);
  box(0.2, GH, WL, mat(0x6a4a34, { roughness: 0.55 }), gx + 12, GH / 2, gzz - WL / 2 + RS / 2, g);
  box(SL, GH, 0.2, mat(0x6a4a34, { roughness: 0.55 }), gx + SL / 2, GH / 2, gzz - 12, g);
  for (const [rr, yy] of [[1.4, GH - 1.6], [1.0, GH - 2.0]]) { const ring = mesh(new THREE.TorusGeometry(rr, 0.05, 8, 48), emissive(0xffe6c4, 4), { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.set(gx + 5, yy, gzz - 8); g.add(ring); }
  box(1, 1.1, 4, mat(0x1a1612, { roughness: 0.3 }), gx + 9.5, 0.55, gzz - 14, g);
  
  // overhang soffit + downlights; round columns at its edge
  const sof = mat(0xf5f2ec, { roughness: 0.85 });
  box(RS + 0.6, 0.35, WL + 1, sof, cx + RS / 2, GH + 0.17, cz - WL / 2 + 0.5, g);
  box(SL + 1, 0.35, RS + 0.6, sof, cx + SL / 2, GH + 0.17, cz - RS / 2, g);
  for (let k = 1.5; k < WL; k += 3) box(0.22, 0.02, 0.22, emissive(0xfff2dc, 6), cx + 1.6, GH - 0.01, cz - k, g);
  for (let k = 4.5; k < SL; k += 3) box(0.22, 0.02, 0.22, emissive(0xfff2dc, 6), cx + k, GH - 0.01, cz - 1.6, g);
  for (const k of [0.7, 8.4, 16.1, 23.8]) cyl(0.46, 0.46, GH, white, 32, cx + 0.7, GH / 2, cz - k, g);
  for (const k of [8.4, 16.1]) cyl(0.46, 0.46, GH, white, 32, cx + k, GH / 2, cz - 0.7, g);

  // ---- slatted canopy wrapping the corner + the letters
  const cy = 4.1;
  const canM = physM({ color: 0xb6bcc2, metalness: 0.75, roughness: 0.4 });
  const runW = { z0: cz + 0.9, z1: cz - 26, x0: cx - 0.7, x1: gx };
  box(0.2, 0.24, runW.z0 - runW.z1, canM, runW.x0, cy, (runW.z0 + runW.z1) / 2, g);
  box(0.12, 0.16, runW.z0 - runW.z1, canM, runW.x1, cy, (runW.z0 + runW.z1) / 2, g);
  for (let z = runW.z0; z > runW.z1; z -= 0.7) box(runW.x1 - runW.x0, 0.03, 0.22, canM, (runW.x0 + runW.x1) / 2, cy - 0.06, z, g).rotation.x = 0.6;
  const runS = { x0: cx - 0.7, x1: cx + 15, z0: cz + 0.7, z1: gzz };
  box(runS.x1 - runS.x0, 0.24, 0.2, canM, (runS.x0 + runS.x1) / 2, cy, runS.z0, g);
  box(runS.x1 - runS.x0, 0.16, 0.12, canM, (runS.x0 + runS.x1) / 2, cy, runS.z1, g);
  for (let x = runS.x0; x < runS.x1; x += 0.7) box(0.22, 0.03, runS.z0 - runS.z1, canM, x, cy - 0.06, (runS.z0 + runS.z1) / 2, g).rotation.z = 0.6;
  for (const k of [4, 12, 20]) { const rod = box(0.05, 0.05, 3.9, canM, cx + 1.3, cy + 1.25, cz - k, g); rod.rotation.y = Math.PI / 2; rod.rotation.z = 0.62; }
  const letterM = physM({ color: 0xc4c8ce, metalness: 1, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 1.6 });
  const F = await font();
  const glyphs = [...'CITITOWER 101'].map((ch) => {
    if (ch === ' ') return { w: 0.55 };
    const tg = new TextGeometry(ch, { font: F, size: 1.12, depth: 0.2, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
    tg.computeBoundingBox();
    return { tg, w: tg.boundingBox.max.x - tg.boundingBox.min.x };
  });
  const gap = 0.44, total = glyphs.reduce((t, q) => t + q.w + gap, -gap);
  let zz = cz - 1.8 - total;
  const z0 = zz;
  for (const q of glyphs) { if (q.tg) { const m = mesh(q.tg, letterM); m.rotation.y = -Math.PI / 2; m.position.set(cx - 0.25, cy + 0.14, zz); g.add(m); } zz += q.w + gap; }
  const signMid = V(cx - 0.25, cy + 0.7, (z0 + zz) / 2);
  

  // ---- podium (floors 2–6, garage) with the cream rounded corner mass over the entrance
  // garage podium to 22 m everywhere except the 17 m corner square, which steps down to the mass top (15.2 m)
  const MT = GH + 7.85;
  box(W, C.podTop - GH, D - 17, cream, (C.x0 + C.x1) / 2, GH + (C.podTop - GH) / 2, C.z0 + (D - 17) / 2, g).castShadow = true;
  box(W - 17, C.podTop - GH, 17, cream, C.x0 + 17 + (W - 17) / 2, GH + (C.podTop - GH) / 2, C.z1 - 8.5, g).castShadow = true;
  box(16.6, MT - GH, 16.6, cream, C.x0 + 8.5, GH + (MT - GH) / 2, C.z1 - 8.5, g);
  const ms = new THREE.Shape(); const R = 3.4, ML = 17;
  ms.moveTo(R, 0); ms.lineTo(ML, 0); ms.lineTo(ML, ML); ms.lineTo(0, ML); ms.lineTo(0, R); ms.quadraticCurveTo(0, 0, R, 0);
  const mg = new THREE.ExtrudeGeometry(ms, { depth: 7.5, bevelEnabled: false, curveSegments: 16 }); mg.rotateX(-Math.PI / 2);
  const mass = mesh(mg, cream); mass.position.set(cx - 0.8, GH + 0.35, cz + 0.8); g.add(mass);
  // tower corner block between the mass and the podium top, so the balcony stack starts right above the mass
  box(15.5, C.podTop - MT, 15.5, glassUp, C.x0 + 1 + 7.75, MT + (C.podTop - MT) / 2, C.z1 - 1 - 7.75, g);
  // a band of second-floor glazing under the mass (photo: green-tinted glass above the canopy)
  // art panels: 11 four-storey geometric aluminium reliefs in bold colours
  const art = (seed) => canvasTex('guevara' + seed, 256, 1024, (c, w, h) => {
    const r = mulberry(seed); const cols = ['#d4262c', '#f2a51a', '#f6d21c', '#2f9c46', '#1e6fd0', '#5a2fa8', '#e2337f', '#14a6a0', '#f26b1d', '#9ad13c', '#0f2f6b'];
    c.fillStyle = '#e9e4da'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h;) { const bh = 30 + r() * 120; let x = 0; while (x < w) { const bw = 20 + r() * 90; c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(x + 2, y + 2, bw - 4, bh - 4); if (r() < 0.4) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.beginPath(); c.moveTo(x + 2, y + bh - 2); c.lineTo(x + bw - 2, y + 2); c.lineTo(x + bw - 2, y + bh - 2); c.fill(); } x += bw; } y += bh; }
  });
  const panel = (x, z, rotY, seed) => { const m = mesh(new THREE.BoxGeometry(3.6, 13.5, 0.25), [mat(0x9a9ea4, { metalness: 0.6 }), mat(0x9a9ea4, { metalness: 0.6 }), mat(0x9a9ea4), mat(0x9a9ea4), new THREE.MeshStandardMaterial({ map: art(seed), roughness: 0.45, metalness: 0.35 }), mat(0x9a9ea4)]); m.position.set(x, GH + 0.6 + 6.75, z); m.rotation.y = rotY; g.add(m); };
  let sd = 1;
  for (const z of [C.z0 + 4, C.z0 + 10, C.z0 + 16, C.z0 + 22]) panel(C.x0 - 0.14, z, -Math.PI / 2, sd++);
  for (const x of [C.x0 + 21, C.x0 + 27]) panel(x, C.z1 + 0.14, 0, sd++);
  for (const z of [C.z0 + 6, C.z0 + 14, C.z0 + 22, C.z0 + 30, C.z0 + 38]) panel(C.x1 + 0.14, z, Math.PI / 2, sd++);

  // ---- tower: cream walls with window columns, rounded corner balconies stacked to the roof
  const tH = C.H - C.podTop, tw = W - 2, td = D - 10;
  const tcx = C.x0 + 1 + tw / 2, tcz = C.z1 - 1 - td / 2;
  const facade = canvasTex('citifac', 512, 512, (c, w, h) => {
    c.fillStyle = '#efe8da'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 128) { c.fillStyle = '#1f2c36'; c.fillRect(x + 22, 40, 84, 200); c.fillRect(x + 22, 296, 84, 200); c.fillStyle = '#d9d2c4'; c.fillRect(x + 20, 236, 88, 8); c.fillRect(x + 20, 492, 88, 8); }
  });
  facade.wrapS = facade.wrapT = THREE.RepeatWrapping;
  const fm = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.6, metalness: 0.1, envMapIntensity: 1.1 });
  const tg2 = new THREE.BoxGeometry(tw, tH, td);
  { const uv = tg2.attributes.uv; const dims = [[td, tH], [td, tH], [tw, td], [tw, td], [tw, tH], [tw, tH]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / 6.4, uv.getY(k) * dims[f][1] / 6.6); } }
  const tower = mesh(tg2, [fm, fm, cream, cream, fm, fm]); tower.position.set(tcx, C.podTop + tH / 2, tcz); g.add(tower);
  const tcx0 = tcx - tw / 2, tcz1 = tcz + td / 2; // tower SW corner
  const BL = 15, BD = 2.3, BR = 3.2;
  const bs = new THREE.Shape();
  bs.moveTo(-BD, BL); bs.lineTo(-BD, BR - BD); bs.quadraticCurveTo(-BD, -BD, BR - BD, -BD); bs.lineTo(BL, -BD); bs.lineTo(BL, 0.2); bs.lineTo(0.2, 0.2); bs.lineTo(0.2, BL); bs.lineTo(-BD, BL);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.3, bevelEnabled: false, curveSegments: 12 }); bg.rotateX(Math.PI / 2);
  const rs = new THREE.Shape(); rs.moveTo(-BD, BL); rs.lineTo(-BD, BR - BD); rs.quadraticCurveTo(-BD, -BD, BR - BD, -BD); rs.lineTo(BL, -BD);
  const rp = rs.getSpacedPoints(60); const rpos = [], ridx = [];
  rp.forEach((p, i) => { rpos.push(p.x, 0, p.y, p.x, 1.05, p.y); if (i) { const a = (i - 1) * 2; ridx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); rg.setIndex(ridx); rg.computeVertexNormals();
  const railM = physM({ color: 0xa8c8d0, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const nF = Math.floor((C.H - MT) / 3.3) - 1;
  const slabs = new THREE.InstancedMesh(bg, mat(0xfbf9f4, { roughness: 0.6, side: THREE.DoubleSide }), nF), rails = new THREE.InstancedMesh(rg, railM, nF);
  const m4 = new THREE.Matrix4();
  for (let f = 0; f < nF + 2; f++) { if (f >= nF) break; m4.makeTranslation(tcx0, MT + (f + 1) * 3.3, tcz1).multiply(new THREE.Matrix4().makeScale(1, 1, -1)); slabs.setMatrixAt(f, m4); rails.setMatrixAt(f, m4); }
  slabs.castShadow = true; g.add(slabs, rails);
  // recessed dark glass behind the balcony stack
  box(BL, C.H - MT, 0.2, glassUp, tcx0 + BL / 2, MT + (C.H - MT) / 2, tcz1 + 0.15, g);
  box(0.2, C.H - MT, BL, glassUp, tcx0 - 0.15, MT + (C.H - MT) / 2, tcz1 - BL / 2, g);
  // roof: pool deck, glass rail, crown
  box(tw + 0.6, 1.2, td + 0.6, white, tcx, C.H + 0.6, tcz, g);
  box(12, 0.15, 5, physM({ color: 0x3ad0e0, roughness: 0.05, emissive: 0x1aa8c0, emissiveIntensity: 0.4 + night }), tcx - 4, C.H + 1.25, tcz + 6, g);

  // ---- street dressing (all in the photos)
  const gravel = pbr('gravel_floor', { world: 2, color: 0xd8c8a8, rough: 1 });
  const bed = (x0, z0, x1, z1) => { const b = mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)), gravel, { cast: false }); b.rotation.x = -Math.PI / 2; b.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2); g.add(b); box(Math.abs(x1 - x0), 0.1, 0.1, mat(0x8a8a86), (x0 + x1) / 2, 0.05, Math.max(z0, z1), g); };
  bed(cx - 2.8, cz - 2.6, cx - 0.1, doorZ + 1.6);
  bed(cx - 2.8, doorZ - 1.6, cx - 0.1, cz - 27);
  bed(cx + 2.6, cz + 2.8, cx + 16, cz + 0.1);
  const r = mulberry(77);
  const agaveM = new THREE.MeshStandardMaterial({ color: 0x6f8f86, roughness: 0.55 });
  const agave = (x, z, s) => { const a = new THREE.Group(); for (let i = 0; i < 13; i++) { const l = mesh(new THREE.ConeGeometry(0.07 * s, 0.95 * s, 5), agaveM); l.position.y = 0.4 * s; const p = new THREE.Group(); p.rotation.set(0, i * 2.4, 0.55 + (i % 3) * 0.28); p.add(l); a.add(p); } a.position.set(x, 0.06, z); g.add(a); };
  for (let k = 3; k < 27; k += 1.4) { if (Math.abs(cz - k - doorZ) < 2) continue; agave(cx - 0.6 - r() * 1.8, cz - k, 0.9 + r() * 0.6); }
  for (let k = 3; k < 15; k += 1.6) agave(cx + k, cz + 0.6 + r() * 1.8, 0.9 + r() * 0.5);
  for (const [x, z] of [[cx - 1.4, cz - 7], [cx - 2, cz - 19], [cx + 7, cz + 1.6]]) { const b = mesh(new THREE.DodecahedronGeometry(0.45, 1), pbr('concrete_pavement', { color: 0x8a908a, world: 1 })); b.position.set(x, 0.2, z); b.scale.set(1.3, 0.7, 1); g.add(b); }
  const blue = physM({ color: 0x1846d8, roughness: 0.25, clearcoat: 1 });
  const sc = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.2, 0.7, 0.1), V(-0.1, 1.3, 0), V(0.25, 1.9, -0.1), V(0.5, 1.7, 0)]);
  const scm = mesh(new THREE.TubeGeometry(sc, 30, 0.14, 10), blue); scm.position.set(cx - 1.3, 0.06, cz - 15); g.add(scm);
  // twin-globe lamp posts on the Lake Ave curb + stop sign and yellow curb at the corner
  const blk = mat(0x121315, { metalness: 0.6, roughness: 0.4 });
  const globe = mat(0xfff2dc, { emissive: 0xffe0b0, emissiveIntensity: 0.4 + night * 2.5, roughness: 0.3 });
  for (const [x, z] of [[cx - 9.3, cz + 2.6], [cx - 9.3, cz - 22]]) {
    const lp = new THREE.Group(); lp.position.set(x, 0, z); g.add(lp);
    cyl(0.18, 0.24, 0.8, blk, 12, 0, 0.4, 0, lp); cyl(0.07, 0.09, 4.2, blk, 10, 0, 2.6, 0, lp); box(1.3, 0.06, 0.06, blk, 0, 4.4, 0, lp);
    for (const sx of [-0.6, 0.6]) { const gb = mesh(new THREE.SphereGeometry(0.25, 16, 12), globe); gb.scale.y = 1.3; gb.position.set(sx, 4.75, 0); lp.add(gb); }
  }
  const stop = new THREE.Group(); stop.position.set(cx - 9.4, 0, cz + 5.2); stop.rotation.y = -Math.PI / 2 - 0.5; g.add(stop);
  cyl(0.035, 0.035, 2.6, mat(0x9aa0a6, { metalness: 0.8 }), 8, 0, 1.3, 0, stop);
  const stopTex = canvasTex('stop', 256, 256, (c, w, h) => { c.fillStyle = '#c4161c'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(w / 2 + Math.cos(a) * 124, h / 2 + Math.sin(a) * 124); } c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#fff'; c.font = '800 78px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', w / 2, h / 2 + 4); });
  const st = mesh(new THREE.CircleGeometry(0.38, 8), new THREE.MeshStandardMaterial({ map: stopTex, roughness: 0.5 })); st.position.y = 2.4; st.rotation.z = Math.PI / 8; stop.add(st);
  box(0.3, 0.17, 12, mat(0xe8c020, { roughness: 0.6 }), cx - 9.85, 0.085, cz + 0.5, g);
  const sabal = await palm(11);
  sabal.position.set(cx - 1.6, 0, cz - 3.4); g.add(sabal);
  for (let i = 0; i < 5; i++) { const ring = mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 18, Math.PI * 1.6), steel); ring.position.set(cx + 4 + i * 0.9, 0.38, cz + 3.5); g.add(ring); }

  g.userData = { corner: V(cx, 0, cz), door: V(gx, 0, doorZ), signMid, top: V(tcx0, C.H, tcz1), doorZ };
  const merged = mergeStatic(g); if (typeof window !== 'undefined' && window.__qaLevel) console.log('[citi] merged', merged.before, '→', merged.after);
  return g;
}
