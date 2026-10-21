// Interior sets ported from the trailer: Citi Tower lobby (elevators OUT OF ORDER), 21-floor stairwell, 20th-floor hallway.
import { THREE, V, mat, emissive, mesh, box, cyl, canvasTex, mulberry } from './core.js';
const pbr = (id, o = {}) => new THREE.MeshLambertMaterial({ color: o.color ?? 0xcccccc });
const signTex = (key, text, { w = 1024, h = 256, font = '800 150px system-ui, sans-serif', color = '#fff', bg = 'rgba(0,0,0,0)', align = 'center' } = {}) =>
  canvasTex('set:' + key, w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.font = font; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(text, align === 'center' ? w / 2 : 40, h / 2 + 6); });
const plane = (t, w, h, { emit = 0, transparent = true } = {}) => mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, transparent, emissive: emit ? 0xffffff : 0, emissiveMap: emit ? t : null, emissiveIntensity: emit }), { cast: false });
export function lobby(ctx) {
  const g = new THREE.Group();
  const marble = pbr('marble_01', { world: 2.5, rough: 0.12, color: 0xe2ddd4 });
  const f = mesh(new THREE.PlaneGeometry(20, 20), marble, { cast: false }); f.rotation.x = -Math.PI / 2; g.add(f);
  box(20, 0.2, 20, mat(0xf2efe8, { roughness: 0.8 }), 0, 4.2, 0, g);
  const wall = pbr('wood_table_001', { world: 1.5, color: 0x8a6a4c, rough: 0.5 });
  box(20, 4.2, 0.2, wall, 0, 2.1, -3, g);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.25 });
  for (let i = -1; i <= 1; i++) {
    const x = i * 3.2;
    box(2.0, 2.9, 0.15, mat(0x16171b, { metalness: 0.6, roughness: 0.4 }), x, 1.45, -2.9, g);
    box(0.84, 2.6, 0.06, steel, x - 0.43, 1.32, -2.82, g); box(0.84, 2.6, 0.06, steel, x + 0.43, 1.32, -2.82, g);
    const ind = plane(signTex('ind' + i, i === 0 ? '20' : 'L', { w: 256, h: 64, font: '700 48px system-ui', color: '#ff9a3a', bg: '#080808' }), 0.5, 0.13, { emit: 1.4, transparent: false }); ind.position.set(x, 3.05, -2.82); g.add(ind);
  }
  const ooo = canvasTex('ooo', 512, 380, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b01010'; c.font = '900 100px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('OUT OF', w / 2, 120); c.font = '900 124px system-ui, sans-serif'; c.fillText('ORDER', w / 2, 240); c.fillStyle = '#333'; c.font = 'italic 500 40px system-ui'; c.fillText('use stairs — mgmt', w / 2, 330); });
  const sg = plane(ooo, 0.62, 0.46, { rough: 0.9 }); sg.position.set(0, 1.55, -2.78); sg.rotation.z = 0.05; g.add(sg);
  for (let i = -3; i <= 3; i++) box(0.2, 0.02, 0.2, emissive(0xfff2dc, 6), i * 2.2, 4.09, -1, g);
  const sp = new THREE.SpotLight(0xffe2c0, 30, 12, 0.9, 0.6, 1.5); sp.position.set(0, 4, 1.5); sp.target.position.set(0, 1, -3); g.add(sp, sp.target);
  g.userData.sign = V(0, 1.55, -2.78);
  const frame = mat(0x16171b, { metalness: 0.6, roughness: 0.4 });
  if (!ctx?.glass) {
    // back wall: lobby entrance glazing onto Lake Ave (daylight)
    box(20, 4.2, 0.2, wall, 0, 2.1, 4.2, g);
    const day = emissive(0xdfe9f2, 1.6);
    for (let i = -1; i <= 1; i++) { box(2.4, 3.0, 0.05, day, i * 2.8, 1.6, 4.08, g); box(0.12, 3.2, 0.12, frame, i * 2.8 - 1.26, 1.6, 4.05, g); }
    return g;
  }
  // entrance seen from the sidewalk: a glass storefront with a pair of (locked) sliding doors
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xb8dce8, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false });
  box(20, 0.9, 0.2, frame, 0, 3.75, 4.2, g);
  for (const x of [-9.4, -6.2, -3.0, 3.0, 6.2, 9.4]) box(0.14, 3.3, 0.16, frame, x, 1.65, 4.2, g);
  for (const x of [-7.8, -4.6, 4.6, 7.8]) box(3.05, 3.3, 0.03, glassM, x, 1.65, 4.2, g);
  box(6.0, 0.08, 0.2, frame, 0, 3.3, 4.2, g); box(6.0, 0.05, 0.3, frame, 0, 0.02, 4.2, g);
  const doors = [];
  for (const sx of [-1, 1]) {
    const d = new THREE.Group(); d.position.set(sx * 0.75, 0, 4.22); g.add(d);
    box(1.5, 3.2, 0.03, glassM, 0, 1.62, 0, d);
    for (const x of [-0.72, 0.72]) box(0.06, 3.2, 0.06, frame, x, 1.62, 0, d);
    box(1.5, 0.08, 0.06, frame, 0, 0.06, 0, d); box(1.5, 0.08, 0.06, frame, 0, 3.2, 0, d);
    box(0.04, 0.5, 0.05, mat(0xd8dadc, { metalness: 1, roughness: 0.2 }), -sx * 0.6, 1.1, 0.06, d);
    doors.push(d);
  }
  const decal = plane(signTex('citidoor', 'CITITOWER 101', { w: 1024, h: 128, font: '700 76px system-ui', color: '#e8eef2' }), 2.4, 0.3, { transparent: true }); decal.position.set(0, 2.95, 4.26); g.add(decal);
  const hours = plane(signTex('hours', 'GUESTS PLEASE CHECK IN', { w: 1024, h: 96, font: '600 52px system-ui', color: '#e8eef2' }), 0.9, 0.085, { transparent: true }); hours.position.set(0.75, 1.32, 4.26); g.add(hours);
  // sidewalk outside
  const walk = mesh(new THREE.PlaneGeometry(20, 10), pbr('concrete', { color: 0xb8b2a8 }), { cast: false }); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.005, 9.3); g.add(walk);
  // front desk + monitor + plant
  const desk = new THREE.Group(); desk.position.set(-2.1, 0, 0.9); g.add(desk);
  box(3.0, 1.08, 0.75, mat(0x2a221c, { roughness: 0.6 }), 0, 0.54, 0, desk);
  box(3.1, 0.06, 0.85, pbr('marble', { color: 0xeeeae2 }), 0, 1.11, 0, desk);
  box(2.8, 0.12, 0.02, emissive(0xffd8a8, 1.5), 0, 0.95, 0.39, desk);
  box(0.55, 0.36, 0.04, mat(0x101114, { roughness: 0.3 }), 0.8, 1.36, -0.1, desk); box(0.08, 0.2, 0.08, mat(0x101114), 0.8, 1.2, -0.1, desk);
  const lbl = plane(signTex('desk', 'CONCIERGE', { w: 512, h: 96, font: '700 60px system-ui', color: '#d8b880' }), 0.9, 0.17, { transparent: true }); lbl.position.set(0, 0.7, 0.385); desk.add(lbl);
  cyl(0.28, 0.22, 0.6, mat(0xe8e4dc), 14, -4.2, 0.3, 1.0, g);
  g.userData.doors = doors; g.userData.desk = desk;
  return g;
}
export const FH = 3.1;
export function stairwell(ctx, floors = 21) {
  const g = new THREE.Group();
  const conc = pbr('concrete_pavement', { world: 2, color: 0xa8a49c });
  const paint = mat(0xdcd8cc, { roughness: 0.9 });
  const yellow = mat(0xe8b800, { roughness: 0.6 }), rail = mat(0x2a6a3a, { roughness: 0.4, metalness: 0.5 });
  const Ht = floors * FH + 4;
  box(0.3, Ht, 6, paint, -3.15, Ht / 2, 0, g); box(0.3, Ht, 6, paint, 3.15, Ht / 2, 0, g); box(6.6, Ht, 0.3, paint, 0, Ht / 2, -3.15, g);
  const stepG = new THREE.BoxGeometry(1.3, 0.18, 0.3); const steps = [];
  for (let f = 0; f < floors; f++) {
    const y0 = f * FH;
    box(6, 0.2, 1.6, conc, 0, y0 - 0.1, 2.2, g); box(6, 0.2, 1.4, conc, 0, y0 + FH / 2 - 0.1, -2.2, g);
    box(6, 0.04, 0.08, yellow, 0, y0 + 0.01, 1.42, g);
    for (let k = 0; k < 9; k++) steps.push([-1.5, y0 + (k + 1) * FH / 18 - 0.09, 1.25 - k * 0.32], [1.5, y0 + FH / 2 + (k + 1) * FH / 18 - 0.09, -1.3 + k * 0.32]);
    for (const [x, ya, za, zb] of [[-0.75, y0, 1.4, -1.5], [0.75, y0 + FH / 2, -1.5, 1.4]]) { const a = V(x, ya + 1, za), b = V(x, ya + FH / 2 + 1, zb), d = b.clone().sub(a); const r = mesh(new THREE.CylinderGeometry(0.03, 0.03, d.length(), 8), rail); r.position.copy(a).add(b).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(r); }
    const num = plane(signTex('fl' + (f + 1), String(f + 1), { w: 256, h: 256, font: '900 190px system-ui, sans-serif', color: '#1a1a1a', bg: '#dcd8cc' }), 1.5, 1.5, { transparent: false }); num.position.set(2.99, y0 + 1.7, 2.2); num.rotation.y = -Math.PI / 2; g.add(num);
    box(1.4, 0.06, 0.1, emissive(0xeef4ff, 4), 0, y0 + FH - 0.25, 2.9, g);
    if (f % 3 === 0) { const pl = new THREE.PointLight(0xe8f0ff, 10, 9, 2); pl.position.set(0, y0 + FH - 0.6, 2); g.add(pl); }
  }
  const im = new THREE.InstancedMesh(stepG, conc, steps.length); const m4 = new THREE.Matrix4();
  steps.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, y, z))); im.castShadow = im.receiveShadow = true; g.add(im);
  return g;
}
export function stairPath(s) {
  const k = Math.floor(s), u = s - k, y = (k + u) * FH / 2;
  return k % 2 === 0 ? { p: V(-1.5, y, 1.3 - u * 2.8), dir: V(0, 0, -1) } : { p: V(1.5, y, -1.4 + u * 2.8), dir: V(0, 0, 1) };
}
// 20th-floor hallway along -z; Kyle's door 2004 on the right (x = +1.25) at z = DOOR_Z.
export const DOOR_Z = -9;
export function hallway(ctx) {
  const g = new THREE.Group();
  const len = 30;
  const carpet = pbr('Carpet012', { world: 1.6, color: 0x8a8aa0, rough: 1 });
  const f = mesh(new THREE.PlaneGeometry(2.6, len), carpet, { cast: false }); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, -len / 2 + 4); g.add(f);
  const wallM = pbr('painted_plaster_wall', { world: 2, color: 0xe8e2d6 });
  const doorZs = [-3, DOOR_Z, -15, -21];
  for (const sx of [-1, 1]) {
    let z = 4;
    for (const dz of doorZs) { const L = z - (dz + 0.55); if (L > 0) box(0.12, 2.8, L, wallM, sx * 1.3, 1.4, z - L / 2, g); box(0.12, 0.7, 1.1, wallM, sx * 1.3, 2.45, dz, g); z = dz - 0.55; }
    const L = z - (-len + 4); box(0.12, 2.8, L, wallM, sx * 1.3, 1.4, z - L / 2, g);
  }
  box(2.7, 0.1, len, mat(0xf2eee6, { roughness: 0.9 }), 0, 2.8, -len / 2 + 4, g);
  box(2.7, 2.8, 0.1, wallM, 0, 1.4, -len + 4, g);
  const doors = {};
  doorZs.forEach((dz, i) => {
    for (const sx of [-1, 1]) {
      const n = 2001 + i * 2 + (sx > 0 ? 1 : 0);
      for (const o of [-0.55, 0.55]) box(0.16, 2.2, 0.07, mat(0x2a221c), sx * 1.27, 1.1, dz + o, g);
      box(0.16, 0.07, 1.17, mat(0x2a221c), sx * 1.27, 2.17, dz, g);
      const leaf = new THREE.Group(); leaf.position.set(sx * 1.27, 0, dz - 0.5); g.add(leaf);
      box(0.05, 2.12, 1.0, pbr('wood_table_001', { world: 1, color: 0x6a4a34, rough: 0.5 }), 0, 1.06, 0.5, leaf);
      const knob = cyl(0.03, 0.03, 0.07, mat(0xc8a860, { metalness: 1, roughness: 0.25 }), 12, -sx * 0.05, 1.0, 0.92, leaf); knob.rotation.z = Math.PI / 2;
      const plate = plane(signTex('d' + n, String(n), { w: 256, h: 128, font: '700 80px system-ui', color: '#f4efe6', bg: '#1a1a1a' }), 0.22, 0.11, { transparent: false }); plate.position.set(sx * 1.23, 1.65, dz + 0.75); plate.rotation.y = -sx * Math.PI / 2; g.add(plate);
      const sc = box(0.06, 0.28, 0.14, emissive(0xffd8a8, 2.2), sx * 1.24, 1.95, dz + 1.2, g); void sc;
      doors[n] = { leaf, z: dz, sx };
    }
  });
  for (let z = 2; z > -len + 4; z -= 4) { box(0.5, 0.03, 0.5, emissive(0xfff0dc, 5), 0, 2.74, z, g); const pl = new THREE.PointLight(0xffe2c0, 3.5, 6, 2); pl.position.set(0, 2.5, z); g.add(pl); }
  // Kyle's apartment glimpse: warm lamp light + window with the skyline beyond the door
  const apt = new THREE.Group(); g.add(apt);
  box(4, 0.05, 4, pbr('wood_floor', { world: 2, rough: 0.5 }), 3.3, 0.01, DOOR_Z, apt);
  box(0.1, 2.8, 4, mat(0xd8cfc0, { roughness: 0.9 }), 5.2, 1.4, DOOR_Z, apt);
  const L = new THREE.PointLight(0xffc890, 0, 8, 1.6); L.position.set(3, 2, DOOR_Z + 0.5); apt.add(L);
  g.userData = { doors, aptLight: L };
  return g;
}

