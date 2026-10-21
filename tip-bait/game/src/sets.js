// Interior sets ported from the trailer: Citi Tower lobby (elevators OUT OF ORDER), 21-floor stairwell, 20th-floor hallway.
import { THREE, V, mat, emissive, mesh, box, cyl, canvasTex, mulberry, tex } from './core.js';
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
  const desk = new THREE.Group(); desk.position.set(-1.6, 0, 2.5); g.add(desk); // close to the glass so you can read her
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
// The stairwell, built as a dollhouse cutaway (no +x wall): painted block walls with a colour band, concrete steps
// with yellow anti-slip nosing on solid stringers, steel rails with balusters, and on every landing a metal door,
// a glowing EXIT sign, a stencilled floor number, strip lights and a red sprinkler riser.
export function stairwell(ctx, floors = 21) {
  const g = new THREE.Group(), Ht = floors * FH + 4;
  const tiled = (path, rx, ry, color = 0xffffff) => { const t = tex(path).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t, color }); };
  // walls: back (-x) and both ends (±z); the +x side stays open for the camera
  box(0.3, Ht, 6.6, tiled('tex/cmu_wall.jpg', 6.6 / 1.6, Ht / 1.6, 0xf2eee4), -3.15, Ht / 2, 0, g);
  for (const z of [-3.15, 3.15]) box(6.6, Ht, 0.3, tiled('tex/cmu_wall.jpg', 6.6 / 1.6, Ht / 1.6, 0xf2eee4), 0, Ht / 2, z, g);
  const concM = tiled('tex/stair_concrete.jpg', 1, 1, 0xd8d4cc), slabM = tiled('tex/stair_concrete.jpg', 3, 1, 0xcfcac2);
  const band = new THREE.MeshLambertMaterial({ color: 0x2f6f8f }), yellow = new THREE.MeshLambertMaterial({ color: 0xf2c200 }), steel = mat(0x5d656e, { metalness: 0.7, roughness: 0.35 }), red = mat(0xb3261e, { roughness: 0.5 });
  const steps = [], noses = [], stringers = [], balusters = [];
  const doorTex = canvasTex('stairdoor', 256, 512, (c, w, h) => { c.fillStyle = '#7d8790'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a737b'; c.fillRect(14, 14, w - 28, h - 28); c.fillStyle = '#20272e'; c.fillRect(60, 70, 70, 120); c.fillStyle = 'rgba(160,190,210,.6)'; c.fillRect(66, 76, 58, 108); c.fillStyle = '#c9ccd0'; c.fillRect(40, 270, w - 80, 16); c.fillStyle = '#a7abb0'; c.fillRect(w - 50, 250, 14, 60); });
  const exitTex = canvasTex('exitsign', 256, 96, (c, w, h) => { c.fillStyle = '#0d3b1d'; c.fillRect(0, 0, w, h); c.fillStyle = '#4dff8a'; c.font = '900 64px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h / 2 + 3); });
  const doorM = new THREE.MeshLambertMaterial({ map: doorTex }), exitM = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false });
  for (let f = 0; f < floors; f++) {
    const y0 = f * FH;
    // landings (floor level at the front, half-landing at the back) with a yellow safety edge
    box(5.7, 0.22, 1.6, slabM, 0, y0 - 0.11, 2.2, g); box(5.7, 0.04, 0.08, yellow, 0, y0 + 0.011, 1.42, g);
    box(5.7, 0.22, 1.4, slabM, 0, y0 + FH / 2 - 0.11, -2.2, g); box(5.7, 0.04, 0.08, yellow, 0, y0 + FH / 2 + 0.011, -1.52, g);
    // the painted colour band along the walls at this storey
    box(0.02, 0.32, 6.3, band, -2.99, y0 + 1.05, 0, g);
    // flights: 9 steps each way; nosing strips; a solid sloped stringer under each flight
    for (let k = 0; k < 9; k++) {
      steps.push([-1.5, y0 + (k + 1) * FH / 18 - 0.09, 1.25 - k * 0.32], [1.5, y0 + FH / 2 + (k + 1) * FH / 18 - 0.09, -1.3 + k * 0.32]);
      noses.push([-1.5, y0 + (k + 1) * FH / 18 + 0.005, 1.25 - k * 0.32 - 0.13], [1.5, y0 + FH / 2 + (k + 1) * FH / 18 + 0.005, -1.3 + k * 0.32 + 0.13]);
    }
    stringers.push([-1.5, y0 + FH / 4 - 0.25, -0.05, 1], [1.5, y0 + FH * 0.75 - 0.25, 0.0, -1]);
    // rails: a sloped steel tube with posts and balusters on the open side of each flight
    for (const [x, ya, za, zb] of [[-0.8, y0, 1.4, -1.5], [0.8, y0 + FH / 2, -1.5, 1.4]]) {
      const a = V(x, ya + 1.0, za), b2 = V(x, ya + FH / 2 + 1.0, zb), d = b2.clone().sub(a);
      const r = mesh(new THREE.CylinderGeometry(0.035, 0.035, d.length(), 8), steel); r.position.copy(a).add(b2).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(r);
      for (let k = 0; k <= 10; k++) { const p = a.clone().lerp(b2, k / 10); balusters.push([x, p.y - 0.5, p.z]); }
    }
    // landing furniture (visible wall = back wall at x = -3)
    const door = mesh(new THREE.PlaneGeometry(1.0, 2.1), doorM); door.position.set(-2.99, y0 + 1.05, 2.25); door.rotation.y = Math.PI / 2; g.add(door);
    box(0.06, 2.2, 0.08, steel, -2.98, y0 + 1.1, 1.72, g); box(0.06, 2.2, 0.08, steel, -2.98, y0 + 1.1, 2.78, g); box(0.06, 0.08, 1.14, steel, -2.98, y0 + 2.18, 2.25, g);
    const ex = mesh(new THREE.PlaneGeometry(0.5, 0.19), exitM, { cast: false }); ex.position.set(-2.97, y0 + 2.45, 2.25); ex.rotation.y = Math.PI / 2; g.add(ex);
    const num = mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshLambertMaterial({ map: signTex('stfl' + (f + 1), String(f + 1), { w: 256, h: 256, font: '900 190px system-ui, sans-serif', color: '#1d2a33' }), transparent: true }), { cast: false });
    num.position.set(-2.98, y0 + 1.9, 0.95); num.rotation.y = Math.PI / 2; g.add(num);
    const lab = mesh(new THREE.PlaneGeometry(1.0, 0.18), new THREE.MeshLambertMaterial({ map: signTex('stlab', 'FLOOR', { w: 512, h: 96, font: '800 64px system-ui, sans-serif', color: '#1d2a33' }), transparent: true }), { cast: false });
    lab.position.set(-2.98, y0 + 1.05, 0.95); lab.rotation.y = Math.PI / 2; g.add(lab);
    box(0.08, 0.05, 1.5, emissive(0xf4f8ff, 3), -2.6, y0 + FH - 0.3, 2.2, g); box(0.08, 0.05, 1.3, emissive(0xf4f8ff, 3), -2.6, y0 + FH / 2 - 0.3 + FH / 2 - 0.2, -2.2, g);
    box(0.12, 0.08, 6.0, red, -2.85, y0 + FH - 0.12, 0, g); // sprinkler branch
    if (f % 4 === 1) { cyl(0.09, 0.09, 0.5, red, 12, -2.85, y0 + 0.55, 0.3, g); box(0.06, 0.12, 0.06, mat(0x222222), -2.85, y0 + 0.85, 0.3, g); } // extinguisher
    if (f % 3 === 0) { const pl = new THREE.PointLight(0xf0f4ff, 10, 10, 2); pl.position.set(-1, y0 + FH - 0.6, 1.6); g.add(pl); }
  }
  cyl(0.07, 0.07, Ht, red, 10, -2.85, Ht / 2, -2.85, g); // sprinkler riser
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const inst = (geo, material, list, fn) => { const im = new THREE.InstancedMesh(geo, material, list.length); list.forEach((it, i) => { fn(it, m4); im.setMatrixAt(i, m4); }); im.castShadow = im.receiveShadow = true; g.add(im); return im; };
  inst(new THREE.BoxGeometry(1.3, 0.18, 0.32), concM, steps, ([x, y, z], m) => m.makeTranslation(x, y, z));
  inst(new THREE.BoxGeometry(1.3, 0.02, 0.06), yellow, noses, ([x, y, z], m) => m.makeTranslation(x, y, z));
  const flightLen = Math.hypot(9 * 0.32, FH / 2), slope = Math.atan2(FH / 2, 9 * 0.32);
  inst(new THREE.BoxGeometry(1.3, 0.25, flightLen), slabM, stringers, ([x, y, z, dir], m) => { q.setFromAxisAngle(V(1, 0, 0), dir * slope); m.compose(V(x, y, z), q, sc.set(1, 1, 1)); });
  inst(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), steel, balusters, ([x, y, z], m) => m.makeTranslation(x, y, z));
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
  const len = 30, z0 = 4, zEnd = -len + 4, W = 1.3;
  // CC0 photo materials (Poly Haven), tiled by real-world size so nothing stretches
  const T = (p, rx, ry, srgb = true) => { const t = tex(p, { srgb }).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  const std = (p, n, rx, ry, o = {}) => new THREE.MeshStandardMaterial({ map: p ? T(p, rx, ry) : null, normalMap: n ? T(n, rx, ry, false) : null, normalScale: new THREE.Vector2(o.ns ?? 0.8, o.ns ?? 0.8), color: o.color ?? 0xffffff, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0 });
  const plaster = (L, h) => std('tex/hall_wall.jpg', 'tex/hall_wall_n.jpg', L / 1.6, h / 1.6, { ns: 0.5, rough: 0.92 });
  const panelM = (L) => std(null, 'tex/hall_wall_n.jpg', L / 1.6, 0.6, { color: 0xf3eee4, rough: 0.55, ns: 0.25 });
  const trim = mat(0xf6f2ea, { roughness: 0.45 }), darkTrim = mat(0x3a2a20, { roughness: 0.5 });
  const brass = mat(0xc9a35a, { metalness: 1, roughness: 0.28 }), steel = mat(0xb8bcc2, { metalness: 1, roughness: 0.35 });
  // floor: patterned hotel runner with a navy border, carpet grain + normal
  const carpet = mesh(new THREE.PlaneGeometry(2.6, len), std('tex/hall_carpet.jpg', 'tex/hall_carpet_n.jpg', 2, len / 1.3, { ns: 0.6, rough: 1 }), { cast: false });
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0, z0 - len / 2); g.add(carpet);
  const border = std(null, 'tex/hall_carpet_n.jpg', 0.2, len / 1.3, { color: 0x1c2636, ns: 0.6, rough: 1 });
  for (const sx of [-1, 1]) { const bd = mesh(new THREE.PlaneGeometry(0.2, len), border, { cast: false }); bd.rotation.x = -Math.PI / 2; bd.position.set(sx * 1.14, 0.002, z0 - len / 2); g.add(bd); }
  // ceiling tiles + crown
  const ceil = mesh(new THREE.PlaneGeometry(2.6, len), std('tex/hall_ceiling.jpg', 'tex/hall_wall_n.jpg', 2.6 / 1.2, len / 1.2, { rough: 0.95, color: 0xfff8ee, ns: 0.3 }), { cast: false });
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 2.8, z0 - len / 2); g.add(ceil);
  // one run of wall between doors: plaster above a painted wainscot, chair rail, baseboard, crown
  const wallRun = (sx, za, zb) => {
    const L = za - zb; if (L <= 0.01) return; const zc = (za + zb) / 2, x = sx * W;
    box(0.12, 2.8, L, plaster(L, 2.8), x, 1.4, zc, g);
    box(0.02, 0.92, L, panelM(L), x - sx * 0.065, 0.46, zc, g);
    box(0.045, 0.05, L, trim, x - sx * 0.08, 0.93, zc, g);
    box(0.03, 0.14, L, darkTrim, x - sx * 0.075, 0.07, zc, g);
    box(0.05, 0.07, L, trim, x - sx * 0.08, 2.765, zc, g);
    // raised wainscot panels
    const n = Math.max(1, Math.round(L / 0.9));
    for (let i = 0; i < n; i++) { const pz = za - (i + 0.5) * (L / n); box(0.012, 0.56, L / n - 0.16, trim, x - sx * 0.077, 0.5, pz, g); }
  };
  const doorZs = [-3, DOOR_Z, -15, -21];
  for (const sx of [-1, 1]) {
    let z = z0;
    for (const dz of doorZs) { wallRun(sx, z, dz + 0.62); box(0.12, 0.66, 1.24, plaster(1.24, 0.66), sx * W, 2.47, dz, g); box(0.05, 0.07, 1.24, trim, sx * (W - 0.08), 2.765, dz, g); z = dz - 0.62; }
    wallRun(sx, z, zEnd);
  }
  // far end: a window onto the skyline; near end: the stairwell door we came through
  const endM = plaster(2.6, 2.8);
  box(2.7, 0.8, 0.1, endM, 0, 0.4, zEnd, g); box(2.7, 0.5, 0.1, endM, 0, 2.55, zEnd, g); for (const sx of [-1, 1]) box(0.55, 1.5, 0.1, endM, sx * 1.05, 1.55, zEnd, g);
  const sky = new THREE.MeshBasicMaterial({ map: T('tex/sky.jpg', 0.35, 0.5), toneMapped: false, color: 0xd8e2ea }); sky.map.offset.set(0.3, 0.32);
  const win = mesh(new THREE.PlaneGeometry(1.6, 1.5), sky, { cast: false }); win.position.set(0, 1.55, zEnd + 0.01); g.add(win);
  box(0.05, 1.5, 0.08, darkTrim, 0, 1.55, zEnd + 0.06, g); box(1.6, 0.05, 0.08, darkTrim, 0, 1.55, zEnd + 0.06, g); box(1.7, 0.06, 0.16, trim, 0, 0.8, zEnd + 0.08, g);
  box(2.7, 2.8, 0.1, endM, 0, 1.4, z0 + 0.05, g);
  const stairDoor = box(1.0, 2.1, 0.05, mat(0x7d8790, { metalness: 0.4, roughness: 0.5 }), 0, 1.05, z0 - 0.02, g); void stairDoor;
  box(0.8, 0.05, 0.04, steel, 0, 1.0, z0 - 0.06, g);
  const exitTex = canvasTex('hallexit', 256, 96, (c, w, h) => { c.fillStyle = '#0d3b1d'; c.fillRect(0, 0, w, h); c.fillStyle = '#4dff8a'; c.font = '900 64px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h / 2 + 4); });
  const ex = mesh(new THREE.PlaneGeometry(0.36, 0.135), new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false }), { cast: false }); ex.position.set(0, 2.38, z0 - 0.03); ex.rotation.y = Math.PI; g.add(ex);
  // doors: oak veneer leaves with raised panels, brass lever + peephole, steel kick plate, white casing, number plaque
  const woodM = std('tex/hall_wood.jpg', 'tex/hall_wood_n.jpg', 1, 1.8, { ns: 0.6, rough: 0.5, color: 0xb08a6a });
  const doors = {};
  doorZs.forEach((dz, i) => {
    for (const sx of [-1, 1]) {
      const n = 2001 + i * 2 + (sx > 0 ? 1 : 0), x = sx * (W - 0.03);
      for (const o of [-0.6, 0.6]) box(0.12, 2.2, 0.08, trim, x - sx * 0.02, 1.1, dz + o, g);
      box(0.12, 0.09, 1.28, trim, x - sx * 0.02, 2.2, dz, g);
      const leaf = new THREE.Group(); leaf.position.set(x, 0, dz - 0.52); g.add(leaf);
      box(0.05, 2.12, 1.04, woodM, 0, 1.06, 0.52, leaf);
      for (const [py, ph] of [[1.55, 0.8], [0.6, 0.8]]) { const pnl = box(0.012, ph, 0.72, woodM, -sx * 0.03, py, 0.52, leaf); pnl.scale.set(1, 1, 1); }
      box(0.008, 0.22, 0.9, steel, -sx * 0.03, 0.13, 0.52, leaf);
      const lever = box(0.03, 0.025, 0.13, brass, -sx * 0.05, 1.0, 0.92, leaf); void lever;
      cyl(0.03, 0.03, 0.02, brass, 14, -sx * 0.035, 1.0, 0.96, leaf).rotation.z = Math.PI / 2;
      cyl(0.012, 0.012, 0.02, brass, 10, -sx * 0.035, 1.55, 0.52, leaf).rotation.z = Math.PI / 2;
      const plate = plane(signTex('d' + n, String(n), { w: 256, h: 128, font: '700 80px Georgia, serif', color: '#e8cf8a', bg: '#1a1612' }), 0.2, 0.1, { transparent: false }); plate.position.set(sx * (W - 0.065), 1.6, dz + 0.78); plate.rotation.y = -sx * Math.PI / 2; g.add(plate);
      doors[n] = { leaf, z: dz, sx };
    }
  });
  // framed art + wall sconces between doors (the warm pools of light down the corridor)
  const artTex = (k) => canvasTex('hallart' + k, 256, 320, (c, w, h) => { const r = mulberry(31 + k); c.fillStyle = ['#e9e2d2', '#d9dfe3', '#efe6d6'][k % 3]; c.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { c.fillStyle = ['#c0553a', '#2d4b6b', '#d8a34a', '#6b8f71', '#2a2a2a'][Math.floor(r() * 5)]; c.globalAlpha = 0.75; c.beginPath(); c.arc(r() * w, r() * h, 20 + r() * 70, 0, 7); c.fill(); } c.globalAlpha = 1; });
  const shadeM = emissive(0xffe6c4, 2.4);
  let k = 0;
  for (const sx of [-1, 1]) for (const z of [0.6, -6, -12, -18]) {
    const art = plane(artTex(k++), 0.5, 0.62, { transparent: false }); art.position.set(sx * (W - 0.092), 1.62, z); art.rotation.y = -sx * Math.PI / 2; g.add(art);
    box(0.03, 0.68, 0.56, darkTrim, sx * (W - 0.075), 1.62, z, g);
    for (const dz of [-1.0, 1.0]) { box(0.02, 0.18, 0.1, brass, sx * (W - 0.07), 1.95, z + dz, g); cyl(0.07, 0.05, 0.16, shadeM, 14, sx * (W - 0.14), 2.02, z + dz, g, { cast: false }); }
  }
  // flush round ceiling fixtures
  for (let z = 2; z > zEnd; z -= 4) { cyl(0.2, 0.2, 0.03, emissive(0xfff0dc, 5), 24, 0, 2.785, z, g, { cast: false }); const pl = new THREE.PointLight(0xffe2c0, 3.5, 6, 2); pl.position.set(0, 2.5, z); g.add(pl); }
  // Kyle's apartment glimpse: warm lamp light + window with the skyline beyond the door
  const apt = new THREE.Group(); g.add(apt);
  box(4, 0.05, 4, std('tex/hall_wood.jpg', null, 2, 2, { rough: 0.5, color: 0x9a7a5a }), 3.3, 0.01, DOOR_Z, apt);
  box(0.1, 2.8, 4, mat(0xd8cfc0, { roughness: 0.9 }), 5.2, 1.4, DOOR_Z, apt);
  const L = new THREE.PointLight(0xffc890, 0, 8, 1.6); L.position.set(3, 2, DOOR_Z + 0.5); apt.add(L);
  g.userData = { doors, aptLight: L };
  return g;
}

