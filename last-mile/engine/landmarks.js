// Real downtown Orlando landmarks (stylised-real): CitiTower, the Starbucks on Orange Ave, Church Street
// Station + SunRail, Lake Eola with its saucer fountain and swans, The VUE, Aspire, Society Orlando,
// Truist Center, Kia Center, Dr. Phillips Center. Positions live in city.js PLACES.
import { THREE, PAL, V, mat, glow, mesh, box, cyl, canvasTex, rnd, rr, pick, reseed, hash, glowSprite, addQuad, dotTex, streakTex, keep } from './core.js';
import { facadeBox, facadeMat, PLACES, LAKE, NS, EW, oak, palm, lamp, reflect } from './city.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
const FONT = new FontLoader().parse(await (await fetch(new URL('../node_modules/three/examples/fonts/helvetiker_bold.typeface.json', import.meta.url))).json());

const at = (k) => PLACES[k];

// Text sign texture (signage, address numbers, menus).
export function signTex(key, w, h, draw) { return canvasTex(key, w, h, draw, { repeat: false }); }
function textSign(key, text, { w = 1024, h = 256, font = '800 150px Inter', color = '#fff', bg = 'rgba(0,0,0,0)', glowC = null, align = 'center' } = {}) {
  return signTex(key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    if (glowC) { g.shadowColor = glowC; g.shadowBlur = 30; }
    g.fillStyle = color;
    g.fillText(text, align === 'center' ? w / 2 : 30, h / 2 + 6);
  });
}
function signPlane(tex, w, h, intensity = 2.5) {
  const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensity, transparent: true, roughness: 0.6, depthWrite: false });
  return mesh(new THREE.PlaneGeometry(w, h), keep(m));
}

// ---------------------------------------------------------------- CITITOWER (101 Lake Ave, NE corner of Church St & Lake Ave)
// Modelled on the street photo: chamfered corner entrance facing the intersection, two-storey green-tinted
// curtain wall between white columns, a thin metal canopy wrapping the corner with "CITI TOWER 101" letters
// standing on it, a solid cream mass above the entrance, rounded corner balconies with glass rails stacked
// all the way up, striped mosaic murals on the podium, a palm at the corner, brick pavers, a black acorn lamp.
export const CITI = { floors: 25, floorH: 3.3, w: 46, d: 30, glassH: 7.4, massTop: 14.2 };
const cream = () => mat(0xece4d4, { roughness: 0.7 });
export function citiTower(ctx, { poolGlow = 1 } = {}) {
  const [x, z] = at('citi');
  const S = ctx.scene, C = CITI;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  S.add(g);
  const cx = -C.w / 2, cz = C.d / 2; // SW corner (local)
  const ch = 5; // chamfer leg length
  const CM = cream();
  const steel = keep(new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.32 }));
  const white = mat(0xf4f0e8, { roughness: 0.6 });
  // ---- podium body (behind the corner glazing), floors 1–5
  const GH = C.glassH;
  const podH = C.massTop + 3.3;
  box(C.w - 14, podH, C.d, CM, 7, podH / 2, 0, g).castShadow = true;
  box(14, podH, C.d - 14, CM, cx + 7, podH / 2, -7, g);
  box(14, podH - GH, 14, CM, cx + 7, GH + (podH - GH) / 2, cz - 7, g);
  // ---- ground floor (matches street view): glazing set back under a white overhang, round white columns at
  // the overhang edge, a slatted grey canopy wrapping the corner, 3D brushed-metal CITITOWER 101 letters on it.
  const RS = 3.2; // glass setback
  const gx = cx + RS, gz = cz - RS; // glass corner
  const WL = 26, SL = 18; // glazing lengths along the west (Lake Ave) and south (Church St) faces
  const mull = keep(new THREE.MeshPhysicalMaterial({ color: 0xa4aab0, metalness: 0.85, roughness: 0.35 }));
  const gm = keep(new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0x1e3c44, roughness: 0.03, metalness: 0.35, transparent: true, opacity: 0.72, envMapIntensity: 2.4, clearcoat: 1 }));
  const glazing = (a, b) => {
    const d = b.clone().sub(a), L = d.length(), mid = a.clone().add(b).multiplyScalar(0.5), yaw = Math.atan2(d.x, d.z) + Math.PI / 2;
    const pane = mesh(new THREE.PlaneGeometry(L, GH), gm); pane.position.copy(mid).add(V(0, GH / 2, 0)); pane.rotation.y = yaw; g.add(pane);
    const n = Math.round(L / 1.55);
    for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); const m = box(0.08, GH, 0.16, mull, p.x, GH / 2, p.z, g); m.rotation.y = yaw; }
    for (let ty = 0.05; ty < GH; ty += 1.24) { const m = box(L, 0.07, 0.17, mull, mid.x, ty, mid.z, g); m.rotation.y = yaw; }
  };
  glazing(V(gx, 0, gz), V(gx, 0, gz - WL + RS));
  glazing(V(gx, 0, gz), V(gx + SL - RS, 0, gz));
  // herringbone brick panel beside the entrance (north end of the Lake Ave glazing)
  const herr = canvasTex('herring', 256, 256, (c, w, h) => { c.fillStyle = '#5a3a2a'; c.fillRect(0, 0, w, h); reseed(12); for (let y = -32; y < h + 32; y += 16) for (let x2 = -32; x2 < w + 32; x2 += 32) { const v = rr(-14, 14); c.fillStyle = `rgb(${150 + v},${104 + v},${78 + v})`; c.save(); c.translate(x2 + ((y / 16) % 2) * 16, y); c.rotate(Math.PI / 4); c.fillRect(0, 0, 22, 9); c.restore(); } });
  herr.repeat.set(2, 3);
  const hp = mesh(new THREE.PlaneGeometry(3.4, GH), keep(new THREE.MeshStandardMaterial({ map: herr, roughness: 0.85 }))); hp.position.set(gx - 0.02, GH / 2, gz - WL + RS - 1.7); hp.rotation.y = -Math.PI / 2; g.add(hp);
  box(0.4, GH, 30, CM, gx + 0.2, GH / 2, gz - WL + RS - 3.4 - 15, g);
  // overhang soffit with downlights
  const sof = mat(0xf2eee6, { roughness: 0.8 });
  box(RS + 0.4, 0.3, WL + 2, sof, cx + RS / 2, GH + 0.15, cz - WL / 2, g);
  box(SL + 2, 0.3, RS + 0.4, sof, cx + SL / 2, GH + 0.15, cz - RS / 2, g);
  for (let k = 1; k < WL; k += 3) { box(0.2, 0.02, 0.2, glow(0xfff2dc, 5), cx + 1.6, GH - 0.01, cz - k, g); }
  for (let k = 4; k < SL; k += 3) { box(0.2, 0.02, 0.2, glow(0xfff2dc, 5), cx + k, GH - 0.01, cz - 1.6, g); }
  // round white columns at the overhang edge (one at the corner)
  const colM = mat(0xf4f2ec, { roughness: 0.45 });
  for (const k of [0.7, 8.2, 15.7, 23.2]) cyl(0.45, 0.45, GH, colM, 24, cx + 0.7, GH / 2, cz - k, g).castShadow = true;
  for (const k of [8.2, 15.7]) cyl(0.45, 0.45, GH, colM, 24, cx + k, GH / 2, cz - 0.7, g).castShadow = true;
  // lobby interior: stone floor, warm walls, double ring chandelier, plants, desk
  const stoneM = keep(new THREE.MeshPhysicalMaterial({ color: 0xd8d2c8, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 }));
  box(12, 0.05, WL - RS, stoneM, gx + 6, 0.03, gz - (WL - RS) / 2, g);
  box(0.2, GH, WL - RS, mat(0x6a4a34, { roughness: 0.55 }), gx + 12, GH / 2, gz - (WL - RS) / 2, g);
  box(SL - RS, GH, 0.2, mat(0x6a4a34, { roughness: 0.55 }), gx + (SL - RS) / 2, GH / 2, gz - 12, g);
  box(12, 0.2, WL - RS, mat(0xe8e2d8), gx + 6, GH - 0.1, gz - (WL - RS) / 2, g);
  for (const [rr2, yy] of [[1.4, GH - 1.6], [1.0, GH - 2.0]]) { const ring = mesh(new THREE.TorusGeometry(rr2, 0.05, 8, 40), glow(0xfff0d8, 3.5)); ring.rotation.x = Math.PI / 2; ring.position.set(gx + 5, yy, gz - 8); g.add(ring); }
  const rg2 = glowSprite(0xffe2b8, 5, 0.25); rg2.position.set(gx + 5, GH - 1.8, gz - 8); g.add(rg2);
  for (let i = 0; i < 6; i++) { box(0.16, 0.02, 0.16, glow(0xfff0dc, 6), gx + 2 + (i % 2) * 6, GH - 0.21, gz - 3 - Math.floor(i / 2) * 7, g); }
  box(1.0, 1.1, 4.0, mat(0x1a1612, { roughness: 0.3 }), gx + 9.5, 0.55, gz - 14, g);
  for (const [px, pz] of [[gx + 2, gz - 2], [gx + 2, gz - 20], [gx + 9, gz - 2]]) {
    cyl(0.4, 0.32, 0.8, mat(0x2a2a2e, { roughness: 0.4 }), 16, px, 0.4, pz, g);
    for (let k = 0; k < 5; k++) { const lf = mesh(new THREE.IcosahedronGeometry(0.45, 1), mat(0x2f5a2a, { roughness: 0.8 })); lf.position.set(px + rr(-0.3, 0.3), 1.1 + k * 0.28, pz + rr(-0.3, 0.3)); lf.scale.set(1, 0.6, 1); g.add(lf); }
  }
  const lobbyL = new THREE.PointLight(0xffd8b0, 14, 18, 1.8); lobbyL.position.set(gx + 5, GH - 1, gz - 8); g.add(lobbyL);
  // slatted canopy: two rails + angled fins, wraps the corner (Lake Ave run, then Church St run)
  const canM = keep(new THREE.MeshPhysicalMaterial({ color: 0xb4bac0, metalness: 0.8, roughness: 0.38 }));
  const cy = 4.0;
  const runW = { z0: cz + 0.8, z1: cz - 24, x0: cx - 0.6, x1: gx };
  box(0.18, 0.22, runW.z0 - runW.z1, canM, runW.x0, cy, (runW.z0 + runW.z1) / 2, g);
  box(0.12, 0.16, runW.z0 - runW.z1, canM, runW.x1, cy, (runW.z0 + runW.z1) / 2, g);
  for (let zz = runW.z0; zz > runW.z1; zz -= 0.75) { const f = box(runW.x1 - runW.x0, 0.03, 0.22, canM, (runW.x0 + runW.x1) / 2, cy - 0.06, zz, g); f.rotation.x = 0.6; }
  const runS = { x0: cx - 0.6, x1: cx + 15, z0: cz + 0.6, z1: gz };
  box(runS.x1 - runS.x0, 0.22, 0.18, canM, (runS.x0 + runS.x1) / 2, cy, runS.z0, g);
  box(runS.x1 - runS.x0, 0.16, 0.12, canM, (runS.x0 + runS.x1) / 2, cy, runS.z1, g);
  for (let xx = runS.x0; xx < runS.x1; xx += 0.75) { const f = box(0.22, 0.03, runS.z0 - runS.z1, canM, xx, cy - 0.06, (runS.z0 + runS.z1) / 2, g); f.rotation.z = 0.6; }
  for (const k of [3, 11, 19]) { const rod = box(0.04, 0.04, 3.5, canM, cx + 1.4, cy + 1.1, cz - k, g); rod.rotation.x = 0; rod.rotation.z = 0.0; rod.lookAt(V(x + gx, cy + 2.4, z + cz - k)); }
  // the letters: dimensional brushed metal, standing on the Lake Ave run, facing the street
  const letterM = keep(new THREE.MeshPhysicalMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.3, clearcoat: 0.4, envMapIntensity: 1.8, emissive: 0x6a6a70, emissiveIntensity: 0.15 }));
  const sign = new THREE.Group(); g.add(sign);
  const txt = 'CITITOWER 101';
  // the street reads it facing east: north is on the left, so the word runs north → south and ends near the corner
  const glyphs = [...txt].map((chr) => {
    if (chr === ' ') return { w: 0.5 };
    const tg = new TextGeometry(chr, { font: FONT, size: 1.15, depth: 0.2, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
    tg.computeBoundingBox();
    return { tg, w: tg.boundingBox.max.x - tg.boundingBox.min.x };
  });
  const gap = 0.42;
  const total = glyphs.reduce((t, gl) => t + gl.w + gap, -gap);
  let zc = cz - 1.6 - total;
  const zStart = zc;
  const letterZ = [];
  for (const gl of glyphs) {
    if (gl.tg) {
      const m = mesh(gl.tg, letterM, { cast: true });
      m.rotation.y = -Math.PI / 2; // glyph +x → world +z, face → west (the street)
      m.position.set(cx - 0.2, cy + 0.12, zc);
      sign.add(m);
      letterZ.push(zc + gl.w / 2);
    }
    zc += gl.w + gap;
  }
  // grazing light on the letters + a soft halo behind them
  const zMid = (zStart + zc) / 2;
  const sl = new THREE.SpotLight(0xfff4e8, 22, 16, 0.7, 0.6, 1.6); sl.position.set(cx - 4, cy - 0.5, zMid); sl.target.position.set(cx - 0.2, cy + 0.7, zMid); g.add(sl, sl.target);
  for (const lz of letterZ) { const h = glowSprite(0xffffff, 1.6, 0.05); h.position.set(cx + 0.1, cy + 0.7, lz); g.add(h); }
  const signP = V(cx - 0.2, cy + 0.7, zMid);
  // ---- cream mass above the entrance (rounded outer corner), floors 3–4
  const mH = C.massTop - GH;
  const ms = new THREE.Shape();
  const R = 3.2, ML = 16;
  ms.moveTo(R, 0); ms.lineTo(ML, 0); ms.lineTo(ML, ML); ms.lineTo(0, ML); ms.lineTo(0, R); ms.quadraticCurveTo(0, 0, R, 0);
  const mg = new THREE.ExtrudeGeometry(ms, { depth: mH, bevelEnabled: false, curveSegments: 12 });
  mg.rotateX(-Math.PI / 2); // shape (sx, sy) → (x = sx, z = -sy): footprint runs east and north from the rounded street corner
  const mass = mesh(mg, CM, { cast: true });
  mass.position.set(cx - 0.6, GH, cz + 0.6);
  g.add(mass);
  // ---- tower: cream body with window bands, recessed corner with rounded balconies stacked every floor
  const tH = C.floors * C.floorH - C.massTop;
  const tw = C.w - 4, td = C.d - 4;
  const tower = facadeBox(tw, tH, td, 'cream', { u0: 0.2, glowK: 1.0, roof: 0x8a8a90 });
  tower.position.set(1.5, C.massTop + tH / 2, -1.5);
  tower.castShadow = true;
  g.add(tower);
  const tcx = 1.5 - tw / 2, tcz = -1.5 + td / 2; // tower SW corner
  // balcony slab: L hugging the corner, protruding 2 m, rounded outer corner; one InstancedMesh for all floors
  const BL = 15, BD = 2.2, BR = 3;
  const bs = new THREE.Shape();
  bs.moveTo(-BD, BL); bs.lineTo(-BD, BR - BD); bs.quadraticCurveTo(-BD, -BD, BR - BD, -BD); bs.lineTo(BL, -BD); bs.lineTo(BL, 0.2); bs.lineTo(0.2, 0.2); bs.lineTo(0.2, BL); bs.lineTo(-BD, BL);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.32, bevelEnabled: false, curveSegments: 10 });
  bg.rotateX(Math.PI / 2); // shape (x, y) → world (x, -, y): y → +z
  const railShape = new THREE.Shape();
  railShape.moveTo(-BD, BL); railShape.lineTo(-BD, BR - BD); railShape.quadraticCurveTo(-BD, -BD, BR - BD, -BD); railShape.lineTo(BL, -BD);
  const railPts = railShape.getSpacedPoints(48);
  const rg = new THREE.BufferGeometry();
  { const pos = [], idx = []; railPts.forEach((p, i) => { pos.push(p.x, 0, p.y, p.x, 1.05, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals(); }
  const railM = keep(new THREE.MeshPhysicalMaterial({ color: 0xa8d0d8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, envMapIntensity: 2 }));
  const nF = Math.floor(tH / C.floorH);
  const slabs = new THREE.InstancedMesh(bg, mat(0xf4f0e8, { roughness: 0.6, side: THREE.DoubleSide }), nF);
  const rails = new THREE.InstancedMesh(rg, railM, nF);
  const m4 = new THREE.Matrix4();
  for (let f = 0; f < nF; f++) {
    const y = C.massTop + (f + 1) * C.floorH;
    m4.makeTranslation(tcx, y, tcz); // shape's +y (→ +z) must point away from the corner: mirror z
    m4.multiply(new THREE.Matrix4().makeScale(1, 1, -1));
    slabs.setMatrixAt(f, m4);
    rails.setMatrixAt(f, m4);
  }
  slabs.castShadow = true;
  g.add(slabs, rails);
  // dark recessed glass at the corner behind the balconies (so the stack reads as deep)
  box(BL, tH, 0.2, facadeMat('glass', 1.1), tcx + BL / 2, C.massTop + tH / 2, tcz + 0.15, g);
  box(0.2, tH, BL, facadeMat('glass', 1.1), tcx - 0.15, C.massTop + tH / 2, tcz - BL / 2, g);
  // ---- striped mosaic murals on the podium faces (west + south, away from the corner)
  const mural = canvasTex('mural', 256, 1024, (c, w, h) => {
    const cols = ['#d8282a', '#f08a1a', '#f4c81a', '#3aa84a', '#1a7ad8', '#6a3ab8', '#e83a8a', '#1aa8a8'];
    reseed(55);
    for (let x = 0; x < w; x += 10) { c.fillStyle = cols[Math.floor(rnd() * cols.length)]; c.fillRect(x, 0, 9, h); }
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(255,255,255,${rr(0, 0.25)})`; c.fillRect(rr(0, w), rr(0, h), 4, 4); }
    c.strokeStyle = '#2a2a30'; c.lineWidth = 10; c.strokeRect(0, 0, w, h);
  }, { repeat: false });
  const muralM = keep(new THREE.MeshStandardMaterial({ map: mural, roughness: 0.55, emissive: 0xffffff, emissiveMap: mural, emissiveIntensity: 0.25 }));
  for (let i = 0; i < 3; i++) {
    const mw = mesh(new THREE.PlaneGeometry(3.2, 12), muralM); mw.position.set(cx - 0.05, 9 + 6 - 3, cz - 18 - i * 4); mw.rotation.y = -Math.PI / 2; g.add(mw);
    const ms2 = mesh(new THREE.PlaneGeometry(3.2, 12), muralM); ms2.position.set(cx + 18 + i * 4, 12, cz + 0.05); g.add(ms2);
  }
  // ---- rooftop: pool deck + crown light
  const roofY = C.floors * C.floorH;
  box(tw + 1, 1.2, td + 1, white, 1.5, roofY + 0.6, -1.5, g);
  box(14, 0.2, 6, mat(0x000000, { emissive: 0x27d8e8, emissiveIntensity: 2.4 * poolGlow, roughness: 0.1 }), -4, roofY + 1.25, 4, g);
  const pg = glowSprite(0x40e8ff, 9, 0.2 * poolGlow); pg.position.set(-4, roofY + 3, 4); g.add(pg);
  box(tw + 1.2, 0.35, td + 1.2, glow(0xffffff, 2.0), 1.5, roofY + 0.15, -1.5, g);
  // ---- street (matches street view): gravel beds with agaves, fan palms, boulders and the blue sculpture,
  // a tall sabal palm, twin-globe lamp posts, stop sign, yellow curb, bike spirals, brick-paved Lake Ave
  const gravel = canvasTex('gravel', 256, 256, (c, w, h) => { c.fillStyle = '#b89e78'; c.fillRect(0, 0, w, h); reseed(31); for (let i = 0; i < 3000; i++) { const v = rr(-40, 40); c.fillStyle = `rgb(${190 + v},${165 + v},${125 + v})`; c.beginPath(); c.arc(rr(0, w), rr(0, h), rr(1, 3), 0, 6.3); c.fill(); } });
  gravel.repeat.set(2, 10);
  const gravM = keep(new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.95 }));
  const bed = (x0, z0, x1, z1) => { const b2 = mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)), gravM, { receive: true }); b2.rotation.x = -Math.PI / 2; b2.position.set((x0 + x1) / 2, 0.09, (z0 + z1) / 2); g.add(b2); box(Math.abs(x1 - x0), 0.12, 0.12, mat(0x8a8a86), (x0 + x1) / 2, 0.06, Math.max(z0, z1), g); };
  bed(cx - 2.7, cz - 2.5, cx - 0.1, cz - 9.2);
  bed(cx - 2.7, cz - 12.0, cx - 0.1, cz - 25);
  bed(cx + 2.5, cz + 2.7, cx + 15, cz + 0.1);
  const agaveM = mat(0x6a8a80, { roughness: 0.6 });
  const agave = (px, pz, s0 = 1) => { s0 *= 1.5; const a2 = new THREE.Group(); for (let i = 0; i < 11; i++) { const l = mesh(new THREE.ConeGeometry(0.07 * s0, 0.9 * s0, 4), agaveM); l.position.y = 0.35 * s0; l.rotation.set(0.7 + (i % 3) * 0.25, 0, 0); const p2 = new THREE.Group(); p2.rotation.y = i * 2.4; p2.add(l); a2.add(p2); } a2.position.set(px, 0.08, pz); g.add(a2); };
  const fan = (px, pz) => { const f2 = palm(rr(1.2, 1.8), 0.02, rr(0, 6)); f2.position.set(px, 0, pz); f2.scale.setScalar(0.45); g.add(f2); };
  reseed(77);
  for (let k = 3; k < 25; k += 1.6) { if (k > 9 && k < 12) continue; if (rnd() < 0.55) agave(cx - rr(0.6, 2.2), cz - k, rr(0.8, 1.3)); else fan(cx - rr(0.6, 2.2), cz - k); }
  for (let k = 3; k < 14; k += 1.8) agave(cx + k, cz + rr(0.7, 2.1), rr(0.8, 1.2));
  for (const [px, pz] of [[cx - 1.4, cz - 6], [cx - 2, cz - 17], [cx + 6, cz + 1.6]]) { const b3 = mesh(new THREE.DodecahedronGeometry(0.4, 0), mat(0x8a9088, { roughness: 0.9 })); b3.position.set(px, 0.2, pz); b3.scale.set(1.3, 0.7, 1); g.add(b3); }
  const blue = keep(new THREE.MeshPhysicalMaterial({ color: 0x1a4ad8, roughness: 0.25, clearcoat: 1 }));
  const sc = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.2, 0.7, 0.1), V(-0.1, 1.3, 0), V(0.25, 1.9, -0.1), V(0.5, 1.7, 0)]);
  const scm = mesh(new THREE.TubeGeometry(sc, 30, 0.14, 8), blue); scm.position.set(cx - 1.3, 0.08, cz - 14); g.add(scm);
  const scH = mesh(new THREE.SphereGeometry(0.22, 12, 10), blue); scH.position.set(cx - 0.8, 1.85, cz - 14); g.add(scH);
  const sab = palm(11, 0.04, 0.7); sab.position.set(cx - 1.6, 0, cz - 3.4); g.add(sab);
  // twin-globe black lamp posts on the curb line + stop sign at the corner
  const blk = mat(0x111214, { metalness: 0.6, roughness: 0.4 });
  const globeM = mat(0xfff2dc, { emissive: 0xffe0b0, emissiveIntensity: 2.4, roughness: 0.3 });
  for (const [px, pz] of [[cx - 4.8, cz + 2.5], [cx - 4.8, cz - 21]]) {
    const lp = new THREE.Group(); lp.position.set(px, 0, pz); g.add(lp);
    cyl(0.18, 0.24, 0.8, blk, 12, 0, 0.4, 0, lp); cyl(0.07, 0.09, 4.2, blk, 10, 0, 2.6, 0, lp);
    box(1.3, 0.06, 0.06, blk, 0, 4.4, 0, lp);
    for (const sx of [-0.6, 0.6]) { const gb = mesh(new THREE.SphereGeometry(0.25, 16, 12), globeM); gb.scale.y = 1.3; gb.position.set(sx, 4.75, 0); lp.add(gb); const lg = glowSprite(0xffd8a0, 2.0, 0.6); lg.position.set(sx, 4.75, 0); lp.add(lg); }
    const lpl = new THREE.PointLight(0xffd8a0, 18, 12, 1.8); lpl.position.y = 4.6; lp.add(lpl);
  }
  const stop = new THREE.Group(); stop.position.set(cx - 5.2, 0, cz + 4.6); stop.rotation.y = -Math.PI / 2 - 0.4; g.add(stop);
  cyl(0.035, 0.035, 2.6, mat(0x9aa0a6, { metalness: 0.8 }), 8, 0, 1.3, 0, stop);
  const oct = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 8), mat(0xc81818, { roughness: 0.5 })); oct.rotation.x = Math.PI / 2; oct.rotation.y = Math.PI / 8; oct.position.y = 2.4; stop.add(oct);
  const stopT = signPlane(textSign('stop', 'STOP', { w: 256, h: 128, font: '800 92px Inter', color: '#ffffff' }), 0.56, 0.28, 0.6); stopT.position.set(0, 2.4, 0.015); stop.add(stopT);
  const curbY = mat(0xe8c020, { roughness: 0.6 });
  box(0.3, 0.2, 9, curbY, cx - 5.9, 0.1, cz + 1.5, g);
  for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 18, Math.PI * 1.6), steel); r.position.set(cx + 4 + i * 0.9, 0.38, cz + 2.0); g.add(r); }
  // brick-paved Lake Ave
  const brick = canvasTex('brick-street', 256, 256, (c, w, h) => { c.fillStyle = '#4a3a34'; c.fillRect(0, 0, w, h); reseed(9); for (let y = 0; y < h; y += 16) for (let x2 = (y / 16) % 2 ? -16 : 0; x2 < w; x2 += 32) { const v = rr(-14, 14); c.fillStyle = `rgb(${118 + v},${88 + v * 0.7},${76 + v * 0.6})`; c.fillRect(x2 + 1, y + 1, 30, 14); } });
  brick.repeat.set(4, 130);
  const lakeAve = mesh(new THREE.PlaneGeometry(12.6, 420), keep(new THREE.MeshStandardMaterial({ map: brick, roughness: 0.5, metalness: 0.1, envMapIntensity: 1.5 })), { receive: true });
  lakeAve.rotation.x = -Math.PI / 2; lakeAve.position.set(NS.lake - x, 0.045, 330 - z); g.add(lakeAve);
  const o = oak(0.9); o.position.set(cx + 22, 0, cz + 5); g.add(o);
  g.userData.top = V(x + tcx, roofY, z + tcz);
  g.userData.corner = V(x + cx, 0, z + cz);
  g.userData.cornerDir = V(-Math.SQRT1_2, 0, Math.SQRT1_2);
  g.userData.door = V(x + gx, 0, z + cz - 10.5);
  g.userData.signMid = V(x + signP.x, signP.y, z + signP.z);
  g.userData.sign = V(x + signP.x, signP.y, z + signP.z);
  return g;
}

// ---------------------------------------------------------------- STARBUCKS (ground floor on Orange Ave, faces east)
export function starbucks(ctx) {
  const [x, z] = at('starbucks');
  const S = ctx.scene;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI / 2; // local +z faces east (onto Orange Ave)
  S.add(g);
  const bw = 26, bd = 22;
  // the building above: brick 4-storey (historic Orange Ave stock)
  const up = facadeBox(bw, 14, bd, 'brick', { u0: 0.1 });
  up.position.set(0, 5 + 7, -bd / 2);
  g.add(up);
  box(bw + 0.6, 0.6, bd + 0.6, mat(0x5e2318), 0, 5, -bd / 2, g);
  box(bw + 0.8, 0.8, bd + 0.8, mat(0xd8cfbf), 0, 19.2, -bd / 2, g); // cornice
  // interior box: warm walls, counter, menu boards, pendant lamps
  const inner = new THREE.Group();
  g.add(inner);
  box(bw - 1, 0.1, 10, mat(0x6a4a32, { roughness: 0.4 }), 0, 0.05, -5.2, inner); // wood floor
  box(bw - 1, 5, 0.3, mat(0x3a2a20), 0, 2.5, -10.2, inner); // back wall
  box(bw - 1, 0.2, 10, mat(0x2a201a), 0, 4.95, -5.2, inner); // ceiling
  for (const sx of [-1, 1]) box(0.3, 5, 10, mat(0x4a3428), sx * (bw / 2 - 0.6), 2.5, -5.2, inner);
  box(14, 1.1, 1.2, mat(0x1f1a17, { roughness: 0.3 }), -3, 0.55, -7.2, inner); // counter
  box(14, 0.08, 1.3, mat(0xe8e0d0, { roughness: 0.2 }), -3, 1.14, -7.2, inner);
  const menu = signTex('sb-menu', 1024, 256, (c, w, h) => {
    c.fillStyle = '#121212'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f4efe6'; c.font = '700 26px Inter';
    const items = ['ESPRESSO', 'COLD BREW', 'MACCHIATO', 'FRAPPUCCINO', 'REFRESHERS', 'LATTE'];
    items.forEach((t, i) => { c.fillText(t, 30 + (i % 3) * 330, 60 + Math.floor(i / 3) * 110); c.fillStyle = '#9a9a9a'; c.fillRect(30 + (i % 3) * 330, 80 + Math.floor(i / 3) * 110, 240, 4); c.fillRect(30 + (i % 3) * 330, 96 + Math.floor(i / 3) * 110, 180, 4); c.fillStyle = '#f4efe6'; });
  });
  const mb = signPlane(menu, 12, 3, 1.4); mb.position.set(-3, 3.4, -10.0); inner.add(mb);
  for (let i = 0; i < 6; i++) { const p = cyl(0.25, 0.4, 0.4, glow(0xffc070, 4), 10, -9 + i * 3.2, 4.2, -6, inner); void p; const s = glowSprite(0xffb060, 2.2, 0.8); s.position.set(-9 + i * 3.2, 3.9, -6); inner.add(s); }
  // mobile order pickup shelf (with orders waiting)
  box(4, 0.08, 0.8, mat(0xd8d0c0), 8, 1.4, -2.5, inner);
  box(4, 0.08, 0.8, mat(0xd8d0c0), 8, 2.2, -2.5, inner);
  const pk = signPlane(textSign('sb-pickup', 'MOBILE ORDER PICKUP', { font: '700 78px Inter', color: '#f4efe6', bg: '#00704a' }), 4, 1, 1.2); pk.position.set(8, 2.9, -2.9); inner.add(pk);
  for (let i = 0; i < 4; i++) { const c = cup({ scale: 1 }); c.position.set(6.6 + i * 0.9, 1.45, -2.4); inner.add(c); }
  for (let i = 0; i < 3; i++) { const c = cup({ scale: 1, hot: true }); c.position.set(6.9 + i * 1.1, 2.25, -2.4); inner.add(c); }
  const fill = new THREE.PointLight(0xffc890, 25, 14, 2); fill.position.set(0, 4, -4); inner.add(fill);
  // storefront: thin black mullions, glass, door, awning, sign
  const glass = mat(0x10141a, { roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.18 });
  box(bw, 4.6, 0.06, glass, 0, 2.4, 0, g);
  for (let k = -bw / 2; k <= bw / 2 + 0.01; k += 3.25) box(0.14, 4.8, 0.2, mat(0x111214, { metalness: 0.6 }), k, 2.4, 0, g);
  box(bw, 0.2, 0.3, mat(0x111214, { metalness: 0.6 }), 0, 4.75, 0, g);
  // awning
  const aw = mesh(new THREE.BoxGeometry(bw - 2, 0.12, 2.6), mat(0x0d3b2a, { roughness: 0.7 }));
  aw.position.set(0, 4.6, 1.3); aw.rotation.x = 0.18; g.add(aw);
  // logo disk (simplified: green roundel + white ring; no character art) + wordmark
  const logo = signTex('sb-logo', 512, 512, (c, w) => {
    c.fillStyle = '#00704a'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 22; c.beginPath(); c.arc(w / 2, w / 2, w * 0.36, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 40 : 95, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); }
    c.fill();
  });
  const lg = signPlane(logo, 3.2, 3.2, 1.0); lg.position.set(-8, 6.5, 0.4); g.add(lg);
  const wm = signPlane(textSign('sb-word', 'STARBUCKS', { font: '800 170px Inter', color: '#ffffff', glowC: '#a8ffd8' }), 11, 2.7, 1.1);
  wm.position.set(1.5, 6.5, 0.4); g.add(wm);
  const sg = glowSprite(0x60ffb0, 8, 0.08); sg.position.set(-2, 6.5, 1.2); g.add(sg);
  // sidewalk tables
  for (let i = 0; i < 3; i++) {
    const tx = -9 + i * 6;
    cyl(0.5, 0.5, 0.05, mat(0x1a1a1c, { metalness: 0.6 }), 16, tx, 0.95, 3.4, g);
    cyl(0.04, 0.04, 0.95, mat(0x1a1a1c), 6, tx, 0.47, 3.4, g);
  }
  // window spill on the sidewalk + streak reflections in the wet street
  const spill = addQuad(dotTex(), 0xffb878, 26, 8, 0.07); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.08, 3); g.add(spill);
  g.updateMatrixWorld(true);
  reflect(ctx, g.localToWorld(V(-8, 6.5, 0.6)), 0x40ff9a, 2.2, 0.18, 12);
  reflect(ctx, g.localToWorld(V(2, 6.5, 0.6)), 0xffffff, 4, 0.12, 12);
  g.userData.shelf = g.localToWorld(V(8, 1.45, -2.4));
  g.userData.door = g.localToWorld(V(5, 0, 0.5));
  return g;
}

// ---------------------------------------------------------------- the order: Venti iced caramel macchiato
export function cup({ scale = 1, hot = false, sleeve = false } = {}) {
  const g = new THREE.Group();
  if (hot) {
    cyl(0.055, 0.04, 0.16, mat(0xf4f0e8, { roughness: 0.6 }), 16, 0, 0.08, 0, g);
    cyl(0.058, 0.058, 0.02, mat(0xf4f0e8), 16, 0, 0.17, 0, g);
    cyl(0.0565, 0.0485, 0.05, mat(0xa07850, { roughness: 0.9 }), 16, 0, 0.09, 0, g);
  } else {
    const glassM = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transmission: 0.0, transparent: true, opacity: 0.32, metalness: 0, clearcoat: 1 }));
    // layered drink: milk bottom, espresso bleed, caramel drizzle top
    cyl(0.05, 0.038, 0.11, mat(PAL.milk, { roughness: 0.35 }), 16, 0, 0.055, 0, g);
    cyl(0.055, 0.05, 0.05, mat(0xa86a38, { roughness: 0.3 }), 16, 0, 0.135, 0, g);
    cyl(0.058, 0.055, 0.04, mat(PAL.coffee, { roughness: 0.25 }), 16, 0, 0.18, 0, g);
    for (let i = 0; i < 6; i++) { const ice = box(0.03, 0.03, 0.03, mat(0xf0f8ff, { roughness: 0.05, transparent: true, opacity: 0.6 }), rr(-0.03, 0.03), rr(0.12, 0.19), rr(-0.03, 0.03), g); ice.rotation.set(rnd() * 3, rnd() * 3, 0); }
    cyl(0.06, 0.04, 0.22, glassM, 20, 0, 0.11, 0, g);
    const dome = mesh(new THREE.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassM); dome.position.y = 0.22; dome.scale.y = 0.55; g.add(dome);
    cyl(0.006, 0.006, 0.2, mat(PAL.sbGreen, { roughness: 0.4 }), 8, 0.01, 0.3, 0, g).rotation.z = 0.08; // straw
    // caramel crosshatch on the foam
    box(0.09, 0.004, 0.006, mat(PAL.caramel, { roughness: 0.2 }), 0, 0.205, 0.01, g);
    box(0.006, 0.004, 0.09, mat(PAL.caramel, { roughness: 0.2 }), 0.01, 0.205, 0, g);
    // roundel on the side
    const lg = mesh(new THREE.CircleGeometry(0.02, 20), mat(PAL.sbGreen, { roughness: 0.4 })); lg.position.set(0, 0.13, 0.0525); lg.rotation.x = 0.09; g.add(lg);
    if (sleeve) { const st = mesh(new THREE.PlaneGeometry(0.05, 0.02), mat(0xffffff)); st.position.set(0, 0.17, 0.057); g.add(st); }
  }
  g.scale.setScalar(scale);
  return g;
}
// Order bag (paper, stapled receipt).
export function bag() {
  const g = new THREE.Group();
  box(0.26, 0.32, 0.16, mat(0xc8a878, { roughness: 0.9 }), 0, 0.16, 0, g);
  box(0.26, 0.06, 0.02, mat(0xb89868), 0, 0.33, 0, g);
  box(0.08, 0.12, 0.002, mat(0xffffff), 0.04, 0.28, 0.081, g);
  return g;
}

// ---------------------------------------------------------------- CHURCH STREET STATION (1889 depot) + SunRail
export function churchStation(ctx) {
  const [x, z] = at('church');
  const S = ctx.scene;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  S.add(g);
  const brickTex = canvasTex('brick', 512, 512, (c, w, h) => {
    c.fillStyle = '#5a2a20'; c.fillRect(0, 0, w, h);
    reseed(21);
    for (let y = 0; y < h; y += 16) for (let x2 = (y / 16) % 2 ? -16 : 0; x2 < w; x2 += 32) { const v = rr(-14, 14); c.fillStyle = `rgb(${142 + v},${58 + v * 0.5},${42 + v * 0.4})`; c.fillRect(x2 + 1, y + 1, 30, 14); }
  });
  brickTex.repeat.set(4, 2);
  const bm = keep(new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85 }));
  const L = 34, D = 11, Hh = 7;
  box(L, Hh, D, bm, 0, Hh / 2, 0, g).castShadow = true;
  // hip roof + cupola
  const roof = mesh(new THREE.ConeGeometry(1, 1, 4, 1), mat(0x3a2a2a, { roughness: 0.7 }));
  roof.scale.set(L * 0.74, 3.5, D * 0.85); roof.rotation.y = Math.PI / 4; roof.position.set(0, Hh + 1.75, 0); g.add(roof);
  box(L + 2, 0.4, D + 3.5, mat(0x4a3030), 0, Hh + 0.1, 0, g); // eaves
  box(3, 2.4, 3, bm, 0, Hh + 4.2, 0, g);
  const cup2 = mesh(new THREE.ConeGeometry(2.4, 2.6, 4), mat(0x3a2a2a)); cup2.rotation.y = Math.PI / 4; cup2.position.set(0, Hh + 6.7, 0); g.add(cup2);
  // arched lit windows both long sides
  const winM = glow(0xffc77a, 2.4);
  for (let i = -5; i <= 5; i++) for (const sz of [-1, 1]) {
    box(1.4, 2.6, 0.1, winM, i * 3, 3, sz * (D / 2 + 0.05), g);
    const arch = mesh(new THREE.CircleGeometry(0.7, 12, 0, Math.PI), winM); arch.position.set(i * 3, 4.3, sz * (D / 2 + 0.06)); if (sz < 0) arch.rotation.y = Math.PI; g.add(arch);
    box(1.8, 0.25, 0.3, mat(0xd8cfbf), i * 3, 1.6, sz * (D / 2 + 0.12), g);
  }
  const sign = signPlane(textSign('church-sign', 'CHURCH STREET STATION', { font: '700 92px Georgia', color: '#f8e8c8', bg: '#1a3a2a' }), 12, 1.6, 1.4);
  sign.position.set(0, 6.2, D / 2 + 0.12); g.add(sign);
  // platform canopy (SunRail, west side along the track)
  const tx = NS.rail - x;
  box(4, 0.9, 56, mat(0x9a9890), tx + 6, 0.45, 34, g);
  for (let k = 8; k <= 60; k += 10) cyl(0.12, 0.12, 4, mat(0x2a2c30, { metalness: 0.6 }), 8, tx + 7, 2.9, k, g);
  box(4.5, 0.25, 54, mat(0xe8e8ec, { metalness: 0.3 }), tx + 6.5, 5, 34, g);
  for (let k = 9; k <= 60; k += 7.5) { const s = glowSprite(0xe8f0ff, 2, 0.8); s.position.set(tx + 6.5, 4.7, k); g.add(s); box(0.5, 0.08, 1.4, glow(0xeef4ff, 4), tx + 6.5, 4.85, k, g); }
  // brick-paved Church St plaza strip
  tracks(ctx);
  return g;
}
export function tracks(ctx, { z0 = -700, z1 = 800 } = {}) {
  const S = ctx.scene, x = NS.rail;
  box(8, 0.25, z1 - z0, mat(0x4a4038, { roughness: 1 }), x, 0.12, (z0 + z1) / 2, S); // ballast
  const tie = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.16, 0.25), mat(0x3a2e26), Math.floor((z1 - z0) / 0.65));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < tie.count; i++) tie.setMatrixAt(i, m4.makeTranslation(x, 0.3, z0 + i * 0.65));
  S.add(tie);
  for (const dx of [-0.72, 0.72]) box(0.08, 0.16, z1 - z0, mat(0xb8b8c0, { metalness: 0.9, roughness: 0.25 }), x + dx, 0.45, (z0 + z1) / 2, S);
}
// Railroad crossing with gate arm + flashing reds (flash phase from t).
export function crossing(ctx, x, z, rotY = 0) {
  const g = new THREE.Group();
  const pm = mat(0xdedede, { metalness: 0.4, roughness: 0.4 });
  cyl(0.1, 0.12, 4.2, pm, 8, 0, 2.1, 0, g);
  const xb = box(1.4, 0.18, 0.04, mat(0xf2f2f2), 0, 3.9, 0.12, g); xb.rotation.z = 0.7;
  const xb2 = box(1.4, 0.18, 0.04, mat(0xf2f2f2), 0, 3.9, 0.12, g); xb2.rotation.z = -0.7;
  const lamps = [];
  for (const dx of [-0.45, 0.45]) {
    const l = mesh(new THREE.CircleGeometry(0.18, 16), glow(0xff1a10, 0)); l.position.set(dx, 3.0, 0.14); g.add(l);
    const s = glowSprite(0xff2a1a, 2.8, 1); s.position.set(dx, 3.0, 0.3); g.add(s);
    lamps.push([l, s]);
  }
  const arm = new THREE.Group(); arm.position.set(0.3, 1.2, 0); g.add(arm);
  const stripes = canvasTex('gate', 256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e8e8e8' : '#d01818'; c.fillRect(i * 32, 0, 32, h); } }, { repeat: false });
  const a = mesh(new THREE.BoxGeometry(9, 0.14, 0.1), mat(0xffffff, { map: stripes, roughness: 0.5 })); a.position.x = 4.5; arm.add(a);
  for (let k = 1; k < 4; k++) { const s = glowSprite(0xff2a1a, 0.9, 0.9); s.position.set(k * 2.4, 0.1, 0.1); arm.add(s); lamps.push([null, s]); }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.scene.add(g);
  g.userData.set = (t, down = 1, on = true) => {
    arm.rotation.z = (1 - down) * Math.PI * 0.45;
    const ph = Math.floor(t * 2.5) % 2;
    lamps.forEach(([l, s], i) => { const lit = on && (i < 2 ? (i === ph) : ph === 0); if (l) l.material = glow(0xff1a10, lit ? 6 : 0.2); s.visible = lit; });
  };
  return g;
}
// SunRail: bi-level commuter coaches behind a locomotive. Faces -z. Length ~ 3 × 26 m.
export function sunrail(ctx) {
  const g = new THREE.Group();
  const liv = canvasTex('sunrail', 1024, 256, (c, w, h) => {
    c.fillStyle = '#c8c8c6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a2a4a'; c.fillRect(0, h * 0.62, w, h * 0.38);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ffcf00'); gr.addColorStop(1, '#ff9a00');
    c.fillStyle = gr; c.fillRect(0, h * 0.54, w, h * 0.1);
    c.fillStyle = '#0e1420';
    for (let i = 0; i < 14; i++) { c.fillRect(30 + i * 70, h * 0.12, 52, h * 0.16); c.fillRect(30 + i * 70, h * 0.34, 52, h * 0.16); }
    c.fillStyle = '#1a2a4a'; c.font = '800 46px Inter'; c.fillText('SunRail', w * 0.42, h * 0.86 - 60);
  }, { repeat: false });
  const em = canvasTex('sunrail-e', 1024, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe8c0';
    for (let i = 0; i < 14; i++) { c.fillRect(30 + i * 70, h * 0.12, 52, h * 0.16); c.fillRect(30 + i * 70, h * 0.34, 52, h * 0.16); }
  }, { repeat: false });
  const cm = keep(new THREE.MeshStandardMaterial({ map: liv, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.3 }));
  for (let k = 0; k < 3; k++) {
    const body = mesh(new RoundedBoxGeometry(3.1, 4.8, 25, 2, 0.3), [cm, cm, mat(0xd8d8d8), mat(0x222222), mat(0xf2f2f0), mat(0xf2f2f0)], { cast: true });
    body.rotation.y = Math.PI / 2; // texture runs along the side
    body.rotation.y = 0;
    body.position.set(0, 3.1, k * 26);
    g.add(body);
  }
  // cab end: yellow nose, windshield, headlights
  box(3.1, 1.6, 0.4, mat(0xffc400, { roughness: 0.4 }), 0, 1.8, -12.6, g);
  box(2.6, 1.1, 0.1, mat(0x0a0e14, { roughness: 0.05, metalness: 0.8 }), 0, 4.0, -12.55, g);
  for (const dx of [-0.9, 0.9]) { box(0.35, 0.35, 0.1, glow(0xffffff, 9), dx, 1.6, -12.85, g); }
  const hl = glowSprite(0xfff4e0, 9, 1.4); hl.position.set(0, 2.2, -13.6); g.add(hl);
  const beam = new THREE.SpotLight(0xfff0d8, 400, 120, 0.35, 0.6, 1.5); beam.position.set(0, 2.2, -13); beam.target.position.set(0, 0, -60); g.add(beam, beam.target);
  return g;
}

// ---------------------------------------------------------------- LAKE EOLA: water, park ring, saucer fountain, swans
export function lakeEola(ctx, { swans = true, boats = true, oaks = true, fountainT = 0 } = {}) {
  const S = ctx.scene;
  const ripple = canvasTex('ripple', 512, 512, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = Math.sin(x * 0.09 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin(y * 0.13 + x * 0.03) * 0.5;
      const b = Math.cos(y * 0.08 + Math.sin(x * 0.06) * 2) * 0.5;
      const o = (y * w + x) * 4;
      img.data[o] = 128 + a * 30; img.data[o + 1] = 128 + b * 30; img.data[o + 2] = 255; img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { srgb: false });
  ripple.repeat.set(30, 30);
  const wm = keep(new THREE.MeshPhysicalMaterial({ color: 0x0a1820, roughness: 0.06, metalness: 0.1, normalMap: ripple, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const water = mesh(new THREE.CircleGeometry(LAKE.r, 96), wm, { receive: true });
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE.x, 0.02, LAKE.z);
  S.add(water);
  ctx.tick.push((t) => { ripple.offset.set(t * 0.01, t * 0.006); });
  // seawall ring + promenade + grass lawn ring
  const wall = mesh(new THREE.RingGeometry(LAKE.r, LAKE.r + 1.2, 96), mat(0xb8b0a2, { roughness: 0.8 }));
  wall.rotation.x = -Math.PI / 2; wall.position.set(LAKE.x, 0.25, LAKE.z); S.add(wall);
  const path = mesh(new THREE.RingGeometry(LAKE.r + 1.2, LAKE.r + 7, 96), mat(0x8a8478, { roughness: 0.75, metalness: 0.05 }), { receive: true });
  path.rotation.x = -Math.PI / 2; path.position.set(LAKE.x, 0.06, LAKE.z); S.add(path);
  const lw = NS.eolaDr - NS.rosalind - 14, ld = EW.central - EW.robinson - 14, lcx = (NS.rosalind + NS.eolaDr) / 2, lcz = (EW.robinson + EW.central) / 2;
  const ls = new THREE.Shape(); ls.moveTo(-lw / 2, -ld / 2); ls.lineTo(lw / 2, -ld / 2); ls.lineTo(lw / 2, ld / 2); ls.lineTo(-lw / 2, ld / 2); ls.lineTo(-lw / 2, -ld / 2);
  const hole = new THREE.Path(); hole.absarc(LAKE.x - lcx, -(LAKE.z - lcz), LAKE.r + 6.5, 0, Math.PI * 2, true); ls.holes.push(hole);
  const lawn = mesh(new THREE.ShapeGeometry(ls, 64), mat(0x2e4a26, { roughness: 0.95 }), { receive: true });
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(lcx, 0.045, lcz); S.add(lawn);
  // promenade lamps (globe lamps around the lake)
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, r = LAKE.r + 7.5;
    const lx = LAKE.x + Math.cos(a) * r, lz = LAKE.z + Math.sin(a) * r;
    cyl(0.07, 0.1, 4, mat(0x1a1c22, { metalness: 0.6 }), 6, lx, 2, lz, S);
    const gl = mesh(new THREE.SphereGeometry(0.32, 12, 8), glow(0xffe4b8, 3)); gl.position.set(lx, 4.2, lz); S.add(gl);
    const sp = glowSprite(0xffd8a0, 3.2, 0.8); sp.position.set(lx, 4.2, lz); S.add(sp);
    reflect(ctx, V(LAKE.x + Math.cos(a) * (LAKE.r - 0.5), 4.2, LAKE.z + Math.sin(a) * (LAKE.r - 0.5)), 0xffc888, 0.8, 0.55, 30);
  }
  if (oaks) {
    reseed(77);
    for (let i = 0; i < 40; i++) {
      const a = rr(0, Math.PI * 2), r = LAKE.r + rr(14, 40);
      const o = oak(rr(0.9, 1.3)); o.position.set(LAKE.x + Math.cos(a) * r, 0, LAKE.z + Math.sin(a) * r); o.rotation.y = rr(0, 6); S.add(o);
    }
  }
  const F = fountain(ctx);
  const out = { water, fountain: F, swans: [], boats: [] };
  if (boats) {
    reseed(31);
    for (let i = 0; i < 9; i++) {
      const b = swanBoat(); b.position.set(LAKE.x + 120 + (i % 3) * 5, 0, LAKE.z + 40 + Math.floor(i / 3) * 6); b.rotation.y = 0.4 + rr(-0.2, 0.2); S.add(b); out.boats.push(b);
    }
  }
  if (swans) {
    reseed(9);
    for (let i = 0; i < 6; i++) { const s = swan(i % 3 === 2); const a = rr(0, 6.28), r = rr(30, 120); s.position.set(LAKE.x + Math.cos(a) * r, 0, LAKE.z + Math.sin(a) * r); s.rotation.y = rr(0, 6); S.add(s); out.swans.push(s); }
  }
  return out;
}
// The Linton E. Allen Memorial Fountain: the green "flying saucer", nightly rainbow light show.
export function fountain(ctx) {
  const [x, z] = at('fountain');
  const S = ctx.scene;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  S.add(g);
  const conc = mat(0xd8d4c8, { roughness: 0.7 });
  const green = keep(new THREE.MeshPhysicalMaterial({ color: 0x3aa58a, emissive: 0x1a6a5a, emissiveIntensity: 0.6, roughness: 0.25, transparent: true, opacity: 0.92, clearcoat: 1 }));
  cyl(14, 15, 1.2, conc, 48, 0, 0.6, 0, g); // base basin
  cyl(3, 4.5, 6, conc, 24, 0, 4, 0, g); // stem
  const dish = mesh(new THREE.CylinderGeometry(11, 4, 3, 48, 1, true), green); dish.position.y = 8.2; g.add(dish);
  cyl(11, 11, 0.5, green, 48, 0, 9.8, 0, g);
  // lattice ring + stacked crown
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const p = box(0.4, 4, 0.4, conc, Math.cos(a) * 7, 12, Math.sin(a) * 7, g); p.rotation.y = -a; }
  cyl(8, 8, 0.6, conc, 32, 0, 14.2, 0, g);
  const dome = mesh(new THREE.SphereGeometry(5.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green); dome.position.y = 14.5; dome.scale.y = 0.75; g.add(dome);
  cyl(0.6, 1.2, 3.5, conc, 12, 0, 19.5, 0, g);
  // water: central plume + ring of arcing jets (additive, colour-cycled)
  const jets = [];
  const jetMat = (c) => new THREE.MeshBasicMaterial({ map: streakTex(), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const plume = mesh(new THREE.ConeGeometry(2.5, 26, 20, 1, true), jetMat(0xffffff)); plume.position.y = 33; plume.rotation.x = Math.PI; plume.userData.noDepth = true; g.add(plume); jets.push(plume);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const j = mesh(new THREE.PlaneGeometry(1.4, 14), jetMat(0xffffff));
    j.position.set(Math.cos(a) * 9, 15, Math.sin(a) * 9); j.rotation.set(0, -a + Math.PI / 2, 0); j.rotateZ(-0.5); j.userData.noDepth = true;
    g.add(j); jets.push(j);
  }
  const mist = glowSprite(0xffffff, 26, 0.12); mist.position.y = 20; g.add(mist);
  const pl = new THREE.PointLight(0xffffff, 600, 90, 1.8); pl.position.set(0, 12, 0); g.add(pl);
  const refl = reflect(ctx, V(x, 20, z), 0xffffff, 10, 0.5, 120);
  // rainbow show: hue drifts, each jet offset
  ctx.tick.push((t) => {
    const hue = (t * 0.12) % 1;
    jets.forEach((j, i) => { j.material.color.setHSL((hue + i * 0.035) % 1, 0.9, 0.55).multiplyScalar(i ? 0.6 : 0.8); });
    pl.color.setHSL(hue, 0.85, 0.55);
    mist.material.color.setHSL(hue, 0.8, 0.5).multiplyScalar(0.35);
    refl.material.color.setHSL(hue, 0.85, 0.55).multiplyScalar(0.7);
    green.emissive.setHSL((hue + 0.05) % 1, 0.6, 0.25);
    plume.scale.set(1, 1 + Math.sin(t * 2.1) * 0.08, 1);
  });
  return g;
}
// Mute swan (white) or black swan, ~1.4 m long. Faces +z.
export function swan(black = false) {
  const g = new THREE.Group();
  const fm = mat(black ? 0x141416 : PAL.swan, { roughness: 0.85 });
  const body = mesh(new THREE.SphereGeometry(0.42, 20, 14), fm); body.scale.set(0.8, 0.6, 1.25); body.position.y = 0.32; g.add(body);
  const tail = mesh(new THREE.ConeGeometry(0.22, 0.4, 10), fm); tail.rotation.x = -2.2; tail.position.set(0, 0.48, -0.55); g.add(tail);
  for (const sx of [-1, 1]) { const w = mesh(new THREE.SphereGeometry(0.36, 14, 10), fm); w.scale.set(0.22, 0.45, 1.05); w.position.set(sx * 0.24, 0.46, -0.08); w.rotation.x = -0.25; g.add(w); g.userData['wing' + sx] = w; }
  const curve = new THREE.CatmullRomCurve3([V(0, 0.45, 0.35), V(0, 0.75, 0.52), V(0, 1.05, 0.42), V(0, 1.25, 0.5)]);
  const neck = mesh(new THREE.TubeGeometry(curve, 20, 0.07, 8), fm); g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.28, 0.52); g.add(head);
  const hd = mesh(new THREE.SphereGeometry(0.1, 14, 10), fm); hd.scale.set(0.85, 0.9, 1.2); head.add(hd);
  const beak = mesh(new THREE.ConeGeometry(0.05, 0.2, 10), mat(black ? 0xd8202a : PAL.beak, { roughness: 0.4 })); beak.rotation.x = Math.PI / 2 + 0.3; beak.position.set(0, -0.03, 0.17); head.add(beak);
  const knob = mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x0a0a0a)); knob.position.set(0, 0.02, 0.1); head.add(knob);
  for (const sx of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.014, 6, 6), mat(0x050505, { roughness: 0.1 })); e.position.set(sx * 0.07, 0.02, 0.05); head.add(e); }
  g.userData.head = head; g.userData.neck = neck; g.userData.curve = curve;
  g.userData.fm = fm;
  return g;
}
// Re-shape the swan's neck: k = 0 resting S-curve, 1 = lunging hiss (neck forward and low).
export function swanPose(s, k, t = 0) {
  const c = [V(0, 0.45, 0.35), V(0, 0.75 - k * 0.2, 0.52 + k * 0.35), V(0, 1.05 - k * 0.35, 0.42 + k * 0.75), V(0, 1.25 - k * 0.55, 0.5 + k * 1.05)];
  s.remove(s.userData.neck);
  s.userData.neck.geometry.dispose();
  const neck = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c), 20, 0.07, 8), s.userData.fm);
  s.add(neck);
  s.userData.neck = neck;
  s.userData.head.position.copy(c[3]);
  s.userData.head.rotation.x = k * 0.5 + Math.sin(t * 30) * 0.04 * k;
  for (const sx of [-1, 1]) { const w = s.userData['wing' + sx]; w.rotation.z = sx * k * 0.45; w.rotation.x = -k * 0.35; w.position.y = 0.46 + k * 0.1; w.scale.set(0.22, 0.45 + k * 0.15, 1.05 + k * 0.1); }
}
// Lake Eola swan pedal boat.
export function swanBoat() {
  const g = new THREE.Group();
  const wm = mat(0xf2f0ea, { roughness: 0.35 });
  const hull = mesh(new RoundedBoxGeometry(1.8, 0.8, 2.6, 3, 0.35), wm); hull.position.y = 0.35; g.add(hull);
  const curve = new THREE.CatmullRomCurve3([V(0, 0.6, 1.0), V(0, 1.4, 1.5), V(0, 2.2, 1.2), V(0, 2.4, 1.55)]);
  g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.16, 8), wm));
  const hd = mesh(new THREE.SphereGeometry(0.25, 12, 8), wm); hd.position.set(0, 2.4, 1.6); g.add(hd);
  const bk = mesh(new THREE.ConeGeometry(0.1, 0.35, 8), mat(PAL.beak)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 2.35, 1.9); g.add(bk);
  for (const sx of [-1, 1]) { const w = mesh(new THREE.SphereGeometry(0.6, 12, 8), wm); w.scale.set(0.3, 0.9, 1.4); w.position.set(sx * 0.85, 0.9, -0.2); g.add(w); }
  box(1.3, 0.12, 0.8, mat(0x2a6aa8), 0, 0.85, -0.4, g);
  return g;
}

// ---------------------------------------------------------------- towers
// The VUE at Lake Eola: 36 floors, curved teal glass. Sails toward the lake.
export function vue(ctx) {
  const [x, z] = at('vue');
  const S = ctx.scene;
  const h = 36 * 3.4;
  const shape = new THREE.Shape();
  shape.moveTo(-18, -12); shape.lineTo(14, -12); shape.quadraticCurveTo(26, 0, 14, 12); shape.lineTo(-18, 12); shape.lineTo(-18, -12);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  // remap UVs: u along the perimeter (approx via x+z), v by height
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + pos.getZ(i)) / 3.0 / 16, pos.getY(i) / 3.4 / 32);
  const m = mesh(geo, facadeMat('teal', 1.4), { cast: true });
  m.position.set(x, 0, z);
  m.rotation.y = -0.6;
  S.add(m);
  const crown = box(30, 6, 22, mat(0xd8d8de, { roughness: 0.4, metalness: 0.4 }), x, h + 3, z, S); crown.rotation.y = -0.6;
  const band = box(30.4, 0.5, 22.4, glow(0x7ab8ff, 3), x, h + 6, z, S); band.rotation.y = -0.6;
  return m;
}
// Aspire: residential tower facing the lake from the west, stepped top.
export function aspire(ctx) {
  const [x, z] = at('aspire');
  const S = ctx.scene;
  const h = 27 * 3.3;
  const t = facadeBox(30, h, 34, 'resi', { u0: 0.62, glowK: 1.0 }); t.position.set(x, h / 2, z); t.castShadow = true; S.add(t);
  const t2 = facadeBox(22, 9, 26, 'glass', { u0: 0.2 }); t2.position.set(x, h + 4.5, z); S.add(t2);
  box(22.4, 0.4, 26.4, glow(0xffb070, 3), x, h + 9, z, S);
  return t;
}
// Society Orlando (410 N Orange): dark modern tower with lit vertical ribs.
export function society(ctx) {
  const [x, z] = at('society');
  const S = ctx.scene;
  const h = 28 * 3.3;
  const t = facadeBox(30, h, 30, 'dark', { u0: 0.4, glowK: 1.1 }); t.position.set(x, h / 2, z); S.add(t);
  for (let k = -12; k <= 12; k += 6) { box(0.3, h, 0.3, glow(0xfff0d8, 0.7), x + k, h / 2, z + 15.2, S); box(0.3, h, 0.3, glow(0xfff0d8, 0.7), x - 15.2, h / 2, z + k, S); }
  return t;
}
// Truist Center (200 S Orange): the tallest, granite + glass, lit octagonal crown and spire.
export function truist(ctx) {
  const [x, z] = at('truist');
  const S = ctx.scene;
  const h = 120;
  const t = facadeBox(40, h, 40, 'concrete', { u0: 0.05, glowK: 1.3 }); t.position.set(x, h / 2, z); t.castShadow = true; S.add(t);
  const c = cyl(16, 20, 10, facadeMat('glass', 2.2), 8, x, h + 5, z, S); c.rotation.y = Math.PI / 8;
  cyl(16.4, 16.4, 0.6, glow(0xffffff, 3.5), 8, x, h + 10.3, z, S);
  cyl(0.5, 1.2, 16, mat(0xd8d8de, { metalness: 0.6 }), 8, x, h + 18, z, S);
  const b = glowSprite(0xff2a2a, 6, 1.4); b.position.set(x, h + 27, z); S.add(b);
  return t;
}
// Kia Center: the arena — glass oval, metal crown and its iconic lit glass spire.
export function kiaCenter(ctx) {
  const [x, z] = at('kia');
  const S = ctx.scene;
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  const bowl = mesh(new THREE.CylinderGeometry(70, 74, 30, 48), facadeMat('glass', 1.6)); bowl.scale.set(1, 1, 0.68); bowl.position.y = 15; g.add(bowl);
  const roof = mesh(new THREE.SphereGeometry(72, 48, 12, 0, Math.PI * 2, 0, 0.35), mat(0xb8bcc4, { metalness: 0.6, roughness: 0.4 })); roof.scale.set(1, 1, 0.68); roof.position.y = 6; g.add(roof);
  box(150, 0.8, 0.8, glow(0x2a8aff, 3), 0, 30, 49, g);
  // spire: glass shard lit blue
  const sp = mesh(new THREE.CylinderGeometry(1.5, 6, 60, 6), keep(new THREE.MeshStandardMaterial({ color: 0x0a1a3a, emissive: 0x2a7aff, emissiveIntensity: 2.6, roughness: 0.2, metalness: 0.4 })));
  sp.position.set(60, 30, 30); g.add(sp);
  const screen = signPlane(textSign('kia', 'KIA CENTER', { font: '800 140px Inter', color: '#ffffff', bg: '#0a1a3a' }), 34, 8.5, 2.2); screen.position.set(0, 22, 49.5); g.add(screen);
  return g;
}
// Dr. Phillips Center for the Performing Arts: the big floating canopy.
export function drPhillips(ctx) {
  const [x, z] = at('drp');
  const S = ctx.scene;
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  box(110, 1.6, 70, mat(0xe8e8ec, { roughness: 0.4, metalness: 0.2 }), 0, 24, 0, g);
  box(108, 0.3, 68, glow(0xffe6c8, 1.6), 0, 23.1, 0, g);
  for (const [cx, cz] of [[-50, -30], [50, -30], [-50, 30], [50, 30]]) cyl(0.8, 0.8, 23, mat(0xd8d8dc), 10, cx, 11.5, cz, g);
  const hall = facadeBox(60, 20, 40, 'glass', { u0: 0.1, glowK: 2 }); hall.position.set(-10, 10, -10); g.add(hall);
  return g;
}

// Everything named, for wide shots.
export function allLandmarks(ctx, opts = {}) {
  return { citi: citiTower(ctx), sb: starbucks(ctx), church: churchStation(ctx), vue: vue(ctx), aspire: aspire(ctx), society: society(ctx), truist: truist(ctx), kia: kiaCenter(ctx), drp: drPhillips(ctx), lake: lakeEola(ctx, opts.lake || {}) };
}
