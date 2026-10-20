// CitiTower interiors: lobby elevator bank, the stairwell (20 floors), the 20th-floor corridor.
import { THREE, V, mat, glow, mesh, box, cyl, canvasTex, keep, glowSprite, rr, reseed } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function textTex(key, w, h, lines, { bg = '#000', color = '#fff', font = '800 120px Inter', align = 'center' } = {}) {
  return canvasTex(key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
    lines.forEach(([t, f, y, c]) => { g.font = f || font; if (c) g.fillStyle = c; g.fillText(t, w / 2, y); });
  }, { repeat: false });
}
function panel(tex, w, h, { emissive = 0, rough = 0.6 } = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), keep(new THREE.MeshStandardMaterial({ map: tex, roughness: rough, emissive: emissive ? 0xffffff : 0, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive })));
}

// Lobby: polished stone floor, walnut wall, brushed-steel elevator doors with an OUT OF ORDER sign. Faces +z.
export function lobby(ctx) {
  const S = ctx.scene;
  const g = new THREE.Group(); S.add(g);
  const stone = canvasTex('stone', 512, 512, (c, w, h) => {
    c.fillStyle = '#d8d4cc'; c.fillRect(0, 0, w, h);
    reseed(8); for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(120,115,110,${rr(0.05, 0.2)})`; c.lineWidth = rr(0.5, 2); c.beginPath(); let x = rr(0, w), y = rr(0, h); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rr(-60, 60); y += rr(-20, 60); c.lineTo(x, y); } c.stroke(); }
    c.strokeStyle = 'rgba(60,60,60,0.5)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h);
  });
  stone.repeat.set(8, 8);
  const floor = mesh(new THREE.PlaneGeometry(20, 20), keep(new THREE.MeshPhysicalMaterial({ map: stone, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 })), { receive: true });
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const ceil = box(20, 0.2, 20, mat(0x2a2624), 0, 4.2, 0, g); void ceil;
  const wood = canvasTex('walnut', 256, 512, (c, w, h) => { c.fillStyle = '#4a2e1e'; c.fillRect(0, 0, w, h); reseed(3); for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(${rr(20, 60)},${rr(10, 30)},${rr(5, 15)},0.25)`; c.fillRect(x, 0, 1, h); } for (let x = 0; x < w; x += 64) { c.fillStyle = '#2a1a10'; c.fillRect(x, 0, 2, h); } });
  wood.repeat.set(6, 1);
  const wall = mesh(new THREE.PlaneGeometry(20, 4.2), keep(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 })), { receive: true });
  wall.position.set(0, 2.1, -3); g.add(wall);
  // elevator bank: 3 cars; doors steel, frames dark
  const steel = keep(new THREE.MeshPhysicalMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.28, clearcoat: 0.3 }));
  const doors = [];
  for (let i = -1; i <= 1; i++) {
    const x = i * 3.4;
    box(2.0, 2.9, 0.15, mat(0x16171b, { metalness: 0.6, roughness: 0.4 }), x, 1.45, -2.93, g);
    const dl = box(0.84, 2.6, 0.06, steel, x - 0.43, 1.32, -2.84, g);
    const dr = box(0.84, 2.6, 0.06, steel, x + 0.43, 1.32, -2.84, g);
    doors.push([dl, dr]);
    // floor indicator above each door
    const ind = panel(textTex(`ind${i}`, 256, 64, [[i === 0 ? '20' : i < 0 ? 'L' : '7', '700 48px "JetBrains Mono"', 34, '#ff9a3a']], { bg: '#080808' }), 0.5, 0.13, { emissive: 1.6 });
    ind.position.set(x, 3.05, -2.84); g.add(ind);
    // call button panel
    box(0.12, 0.3, 0.03, mat(0x16171b, { metalness: 0.6 }), x + 1.25, 1.2, -2.9, g);
  }
  const btn = mesh(new THREE.CircleGeometry(0.03, 16), glow(0xffffff, 0.3)); btn.position.set(1.25, 1.25, -2.87); g.add(btn);
  // OUT OF ORDER sign taped on the middle car
  const sign = panel(textTex('ooo', 512, 360, [['OUT OF', '900 96px "Inter Display"', 110, '#b01010'], ['ORDER', '900 120px "Inter Display"', 220, '#b01010'], ['sorry — mgmt', 'italic 500 36px Inter', 310, '#333']], { bg: '#f4f1e8' }), 0.6, 0.42, { rough: 0.9 });
  sign.position.set(0, 1.55, -2.8); sign.rotation.z = 0.06; g.add(sign);
  for (const [dx, dy] of [[-0.28, 0.2], [0.28, 0.19], [-0.27, -0.2], [0.29, -0.21]]) { const t = box(0.1, 0.03, 0.002, mat(0xe8e0c0, { transparent: true, opacity: 0.7 }), dx, dy, 0.002, sign); t.rotation.z = 0.7; }
  // light: cove strip + downlights + warm fill
  box(20, 0.06, 0.2, glow(0xffe2bc, 1.6), 0, 4.05, -2.8, g);
  for (let i = -3; i <= 3; i++) { const s = glowSprite(0xffe8cc, 0.6, 0.6); s.position.set(i * 2.2, 4.08, -1); g.add(s); box(0.18, 0.02, 0.18, glow(0xfff2dc, 6), i * 2.2, 4.09, -1, g); }
  const sp = new THREE.SpotLight(0xffe2c0, 18, 12, 0.9, 0.6, 1.5); sp.position.set(0, 4, 1.5); sp.target.position.set(0, 1, -3); g.add(sp, sp.target);
  const fill = new THREE.PointLight(0xffd8b0, 3, 10, 2); fill.position.set(2, 2.5, 2); g.add(fill);
  g.userData = { doors, sign, btn };
  return g;
}

// Stairwell: switchback flights around a central well. Floor f landing at y = f * FH. Returns path(t) helpers.
export const FH = 3.1;
export function stairwell(ctx, { floors = 24 } = {}) {
  const S = ctx.scene;
  const g = new THREE.Group(); S.add(g);
  const conc = mat(0x9a968e, { roughness: 0.85 });
  const paint = mat(0xd8d4c8, { roughness: 0.9 });
  const yellow = mat(0xe8b800, { roughness: 0.6 });
  const rail = mat(0x2a6a3a, { roughness: 0.4, metalness: 0.5 });
  // shaft walls (open toward -z for the camera: walls at x ±3, z -2.4 back)
  const H = floors * FH + 4;
  box(0.3, H, 6, paint, -3.15, H / 2, 0, g);
  box(0.3, H, 6, paint, 3.15, H / 2, 0, g);
  box(6.6, H, 0.3, paint, 0, H / 2, -3.15, g);
  // each floor: landing on +z side (full width), mid-landing on -z side; two flights between, left goes up, right comes back
  const stepG = new THREE.BoxGeometry(1.3, 0.18, 0.3);
  const steps = [];
  for (let f = 0; f < floors; f++) {
    const y0 = f * FH;
    box(6, 0.2, 1.6, conc, 0, y0 - 0.1, 2.2, g); // floor landing
    box(6, 0.2, 1.4, conc, 0, y0 + FH / 2 - 0.1, -2.2, g); // mid landing
    box(6, 0.04, 0.08, yellow, 0, y0 + 0.01, 1.42, g); // nosing stripe
    // flight A: x = -1.5, from z=1.4 → -1.5 rising FH/2 (9 steps)
    for (let k = 0; k < 9; k++) steps.push([-1.5, y0 + (k + 1) * FH / 18 - 0.09, 1.25 - k * 0.32]);
    // flight B: x = +1.5, from z=-1.5 → 1.4 rising FH/2
    for (let k = 0; k < 9; k++) steps.push([1.5, y0 + FH / 2 + (k + 1) * FH / 18 - 0.09, -1.3 + k * 0.32]);
    // rails along the well edge
    for (const [x, ya, za, zb] of [[-0.75, y0, 1.4, -1.5], [0.75, y0 + FH / 2, -1.5, 1.4]]) {
      const a = V(x, ya + 1.0, za), b = V(x, ya + FH / 2 + 1.0, zb);
      const d = b.clone().sub(a);
      const r = mesh(new THREE.CylinderGeometry(0.03, 0.03, d.length(), 8), rail); r.position.copy(a).add(b).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(r);
      box(0.04, 0.9, 0.04, rail, x, ya + 0.5, za, g);
    }
    // painted floor number + fluorescent tube on the landing wall
    const n = f + 1;
    const num = panel(textTex(`fl${n}`, 256, 256, [[String(n), '900 190px "Inter Display"', 136, '#1a1a1a']], { bg: '#d8d4c8' }), 1.5, 1.5);
    num.position.set(2.99, y0 + 1.7, 2.2); num.rotation.y = -Math.PI / 2; g.add(num);
    const num2 = num.clone(); num2.position.set(-2.99, y0 + 1.7, 2.2); num2.rotation.y = Math.PI / 2; g.add(num2);
    box(1.4, 0.06, 0.1, glow(0xeef4ff, 4), 0, y0 + FH - 0.25, 2.9, g);
    box(1.0, 0.06, 0.1, glow(0xeef4ff, 4), 0, y0 + FH / 2 + FH - 0.25 - FH, -2.9, g);
    const pl = (f % 3 === 0) ? new THREE.PointLight(0xe8f0ff, 14, 9, 2) : null;
    if (pl) { pl.position.set(0, y0 + FH - 0.6, 2.0); g.add(pl); }
    box(1.0, 2.1, 0.08, mat(0x5a6a7a, { metalness: 0.4, roughness: 0.5 }), 0, y0 + 1.05, 2.98, g); // fire door
  }
  const im = new THREE.InstancedMesh(stepG, conc, steps.length);
  const m4 = new THREE.Matrix4();
  steps.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, y, z)));
  im.receiveShadow = true; im.castShadow = true;
  g.add(im);
  return g;
}
// Position on the stair path: s = progress in half-flights (each half-flight = FH/2 up). Returns {p, dir}.
export function stairPath(s) {
  const k = Math.floor(s), u = s - k;
  const f = Math.floor(k / 2), up = k % 2 === 0;
  const y = (k + u) * FH / 2;
  if (up) return { p: V(-1.5, y, 1.3 - u * 2.8), dir: V(0, 0, -1) };
  return { p: V(1.5, y, -1.4 + u * 2.8), dir: V(0, 0, 1) };
}

// 20th-floor corridor along -z: carpet, doors 2301…, sconces. Door 2004 on the left (x = -1.15) at z = -18.
export function corridor(ctx, { len = 40 } = {}) {
  const S = ctx.scene;
  const g = new THREE.Group(); S.add(g);
  const carpet = canvasTex('carpet', 256, 256, (c, w, h) => {
    c.fillStyle = '#2a2a3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3a3a52'; c.lineWidth = 6;
    for (let i = -w; i < w * 2; i += 48) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
    reseed(2); for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(255,255,255,${rr(0, 0.04)})`; c.fillRect(rr(0, w), rr(0, h), 1, 1); }
  });
  carpet.repeat.set(2.4, len / 1.2);
  const fl = mesh(new THREE.PlaneGeometry(2.4, len), keep(new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 })), { receive: true });
  fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -len / 2 + 3); g.add(fl);
  const wallM = mat(0xe4ddd0, { roughness: 0.9 });
  // side walls in segments with real openings at every door (z values match the door loop below)
  for (const sx of [-1, 1]) {
    const gaps = [];
    for (let i = 0; i < 6; i++) gaps.push(-2 - i * 6.5 + (sx > 0 ? 3 : 0));
    gaps.sort((a, b) => b - a);
    let zTop = 3;
    for (const gz of [...gaps, -len + 3 - 10]) {
      const a = Math.min(zTop, gz + 0.5), b = Math.max(-len + 3, gz + 0.5);
      const segEnd = gz > -len + 3 ? gz + 0.5 : -len + 3;
      const L0 = zTop - segEnd;
      if (L0 > 0.01) box(0.1, 2.8, L0, wallM, sx * 1.25, 1.4, zTop - L0 / 2, g);
      if (gz > -len + 3) box(0.1, 0.7, 1.0, wallM, sx * 1.25, 2.45, gz, g); // header over the door
      zTop = gz - 0.5;
      void a; void b;
    }
  }
  box(2.6, 0.1, len, mat(0xf0ece4), 0, 2.8, -len / 2 + 3, g);
  box(2.6, 2.8, 0.1, wallM, 0, 1.4, -len + 3, g);
  box(0.03, 0.12, len, mat(0x3a2a20), -1.19, 0.06, -len / 2 + 3, g);
  box(0.03, 0.12, len, mat(0x3a2a20), 1.19, 0.06, -len / 2 + 3, g);
  const doors = {};
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
    const z = -2 - i * 6.5 + (sx > 0 ? 3 : 0);
    const n = 2001 + i * 2 + (sx > 0 ? 1 : 0);
    for (const dz of [-0.53, 0.53]) box(0.14, 2.2, 0.06, mat(0x2a221c), sx * 1.22, 1.1, z + dz, g); // jambs
    box(0.14, 0.06, 1.12, mat(0x2a221c), sx * 1.22, 2.13, z, g);
    const leaf = new THREE.Group(); leaf.position.set(sx * 1.19, 0, z + 0.48 * -sx); g.add(leaf);
    const dm = mat(0x3a2a20, { roughness: 0.45 });
    const d = box(0.05, 2.1, 0.96, dm, 0, 1.05, 0.48 * sx, leaf); void d;
    const knob = cyl(0.03, 0.03, 0.06, mat(0xc8a860, { metalness: 1, roughness: 0.25 }), 10, -sx * 0.05, 1.0, 0.85 * sx, leaf); knob.rotation.z = Math.PI / 2;
    const plate = panel(textTex(`d${n}`, 256, 128, [[String(n), '700 80px Inter', 66, '#f4efe6']], { bg: '#1a1a1a' }), 0.22, 0.11);
    plate.position.set(sx * 1.17, 1.65, z - 0.72 * sx); plate.rotation.y = -sx * Math.PI / 2; g.add(plate);
    const sc = box(0.08, 0.3, 0.16, glow(0xffd8a8, 2.4), sx * 1.18, 1.95, z + 1.2 * sx, g); void sc;
    const s = glowSprite(0xffcf98, 0.8, 0.5); s.position.set(sx * 1.08, 1.95, z + 1.2 * sx); g.add(s);
    doors[n] = { leaf, z, sx };
  }
  for (let z = 1; z > -len + 3; z -= 4) { box(0.5, 0.03, 0.5, glow(0xfff0dc, 5), 0, 2.74, z, g); const pl = new THREE.PointLight(0xffe2c0, 3.5, 6, 2); pl.position.set(0, 2.5, z); g.add(pl); }
  g.userData.doors = doors;
  return g;
}
// Robot vacuum (the trip hazard).
export function roomba() {
  const g = new THREE.Group();
  cyl(0.17, 0.17, 0.08, mat(0x1a1a1e, { roughness: 0.3, metalness: 0.3 }), 24, 0, 0.05, 0, g);
  cyl(0.12, 0.12, 0.01, mat(0x2a2a30, { roughness: 0.2 }), 24, 0, 0.095, 0, g);
  const led = box(0.03, 0.01, 0.01, glow(0x34e4ff, 6), 0, 0.1, 0.1, g); void led;
  return g;
}
