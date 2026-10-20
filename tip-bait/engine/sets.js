// Sets: Starbucks (open interior + closed storefront), Citi Tower lobby / stairwell / 20th-floor hallway,
// LYNX bus, SunRail train + crossing, the 1889 Church Street depot, Lake Eola's saucer fountain, mouse ears.
import { THREE, V, pbr, mat, emissive, mesh, box, cyl, canvasTex, mulberry } from './core.js';
import { coldCup } from './rider.js';

const signTex = (key, text, { w = 1024, h = 256, font = '800 150px Inter', color = '#fff', bg = 'rgba(0,0,0,0)', align = 'center' } = {}) =>
  canvasTex(key, w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.font = font; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(text, align === 'center' ? w / 2 : 40, h / 2 + 6); });
const plane = (t, w, h, { emit = 0, rough = 0.6, transparent = true } = {}) => mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: rough, transparent, emissive: emit ? 0xffffff : 0, emissiveMap: emit ? t : null, emissiveIntensity: emit }), { cast: false });
const sbLogo = () => canvasTex('sblogo', 512, 512, (c, w) => {
  c.fillStyle = '#00704a'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 4, 0, 6.283); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 20; c.beginPath(); c.arc(w / 2, w / 2, w * 0.36, 0, 6.283); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 42 : 100, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill();
});

// ---------------------------------------------------------------- Starbucks storefront (faces +z in local space)
export function storefront(ctx, { open = true, width = 14, night = 0 } = {}) {
  const g = new THREE.Group();
  const frame = mat(0x15171a, { metalness: 0.5, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: open ? 0x2a3a40 : 0x0e1416, roughness: 0.03, transparent: true, opacity: open ? 0.25 : 0.7, envMapIntensity: 1.8, clearcoat: 1, side: THREE.DoubleSide });
  box(width, 4.2, 0.08, glass, 0, 2.1, 0, g, { cast: false });
  for (let x = -width / 2; x <= width / 2 + 0.01; x += width / 5) box(0.12, 4.4, 0.18, frame, x, 2.2, 0, g);
  box(width + 0.4, 0.25, 0.25, frame, 0, 4.35, 0, g);
  // awning + wordmark + roundel
  box(width - 1, 0.1, 1.6, mat(0x0e3b2b, { roughness: 0.7 }), 0, 4.75, 0.8, g).rotation.x = 0.12;
  const wm = plane(signTex('sbword', 'STARBUCKS', { font: '700 150px Inter', color: '#ffffff' }), 7.5, 1.8, { emit: open ? 0.9 : 0.05 }); wm.position.set(1.4, 5.6, 0.12); g.add(wm);
  const lg = plane(sbLogo(), 1.9, 1.9, { emit: open ? 0.6 : 0.05 }); lg.position.set(-3.6, 5.6, 0.12); g.add(lg);
  box(width + 1, 2.4, 0.3, pbr('painted_plaster_wall', { world: 2, color: 0x2b2420 }), 0, 5.6, -0.1, g);
  // interior volume
  box(width, 0.05, 8, pbr('wood_floor', { world: 2.5, rough: 0.5 }), 0, 0.02, -4, g, { cast: false });
  box(width, 4.4, 0.2, pbr('large_grey_tiles', { world: 1.6, color: 0xdedad2 }), 0, 2.2, -8, g);
  box(width, 0.2, 8, mat(0x2a221c), 0, 4.45, -4, g);
  if (open) {
    for (let i = 0; i < 5; i++) { cyl(0.32, 0.18, 0.3, emissive(0xffc890, 3 + night * 2), 16, -5 + i * 2.5, 3.7, -3.5, g); }
    const L = new THREE.PointLight(0xffd8a8, 30, 14, 1.6); L.position.set(0, 3.6, -3); g.add(L);
  } else {
    // dark store: stacked chairs, CLOSED sign on the door, a hand-written note
    for (let i = 0; i < 3; i++) { box(0.8, 0.05, 0.8, mat(0x3a2a20), -3 + i * 2.2, 0.75, -2.5, g); for (let k = 0; k < 2; k++) box(0.45, 0.45, 0.45, mat(0x1d1d1f), -3 + i * 2.2, 1.0 + k * 0.5, -2.5, g); }
    const closed = canvasTex('closedsign', 512, 384, (c, w, h) => {
      c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c4161c'; c.lineWidth = 16; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#c4161c'; c.font = '900 120px "Inter Display", Inter'; c.textAlign = 'center'; c.fillText('CLOSED', w / 2, 175);
      c.fillStyle = '#333'; c.font = 'italic 600 40px Inter'; c.fillText('sorry for the', w / 2, 260); c.fillText('inconvenience :(', w / 2, 310);
    });
    const cs = plane(closed, 1.3, 0.98, { emit: 0.25 }); cs.position.set(1.4, 1.55, 0.07); cs.rotation.z = 0.04; g.add(cs);
  }
  return g;
}
// Pickup counter interior for the shot (local: counter along x at z=0, customer side +z).
export function pickupCounter(ctx) {
  const g = new THREE.Group();
  const wood = pbr('wood_table_001', { world: 1.2, rough: 0.45 });
  box(4.2, 1.05, 0.7, mat(0x1d1a17, { roughness: 0.4 }), 0, 0.525, 0, g);
  box(4.3, 0.06, 0.8, wood, 0, 1.08, 0, g);
  const shelf = box(1.6, 0.04, 0.4, mat(0xe8e4dc, { roughness: 0.3 }), 1.0, 1.42, -0.1, g);
  const sign = plane(signTex('mop', 'MOBILE ORDER PICKUP', { font: '800 70px Inter', color: '#f4efe6', bg: '#00704a' }), 1.6, 0.4, { emit: 0.6, transparent: false }); sign.position.set(1.0, 1.75, -0.25); g.add(sign);
  for (let i = 0; i < 3; i++) { const c = coldCup(1); c.position.set(0.5 + i * 0.4, 1.44, -0.1); g.add(c); }
  // back wall + menu boards
  box(8, 4, 0.2, pbr('large_grey_tiles', { world: 1.4, color: 0xd6d1c8 }), 0, 2, -2.2, g);
  const menu = canvasTex('menu', 1024, 384, (c, w, h) => { c.fillStyle = '#121212'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4efe6'; c.font = '700 34px Inter'; ['ESPRESSO', 'COLD BREW', 'MACCHIATO', 'FRAPPUCCINO', 'REFRESHERS', 'LATTE'].forEach((t, i) => { c.fillText(t, 40 + (i % 3) * 330, 90 + Math.floor(i / 3) * 170); c.fillStyle = '#8a8a8a'; c.fillRect(40 + (i % 3) * 330, 120 + Math.floor(i / 3) * 170, 250, 5); c.fillStyle = '#f4efe6'; }); });
  const mb = plane(menu, 4.8, 1.8, { emit: 1.1, transparent: false }); mb.position.set(-0.4, 2.7, -2.08); g.add(mb);
  for (let i = 0; i < 4; i++) { const p = cyl(0.25, 0.14, 0.26, emissive(0xffc888, 4), 16, -1.6 + i * 1.3, 2.9, -0.6, g); void p; }
  const L = new THREE.PointLight(0xffd2a0, 18, 9, 1.6); L.position.set(0, 2.8, 0.6); g.add(L);
  g.userData.shelf = (i) => V(0.5 + i * 0.4, 1.44, -0.1);
  return g;
}

// ---------------------------------------------------------------- Citi Tower interiors
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
    const ind = plane(signTex('ind' + i, i === 0 ? '20' : 'L', { w: 256, h: 64, font: '700 48px Inter', color: '#ff9a3a', bg: '#080808' }), 0.5, 0.13, { emit: 1.4, transparent: false }); ind.position.set(x, 3.05, -2.82); g.add(ind);
  }
  const ooo = canvasTex('ooo', 512, 380, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b01010'; c.font = '900 100px "Inter Display", Inter'; c.textAlign = 'center'; c.fillText('OUT OF', w / 2, 120); c.font = '900 124px "Inter Display", Inter'; c.fillText('ORDER', w / 2, 240); c.fillStyle = '#333'; c.font = 'italic 500 40px Inter'; c.fillText('use stairs — mgmt', w / 2, 330); });
  const sg = plane(ooo, 0.62, 0.46, { rough: 0.9 }); sg.position.set(0, 1.55, -2.78); sg.rotation.z = 0.05; g.add(sg);
  for (let i = -3; i <= 3; i++) box(0.2, 0.02, 0.2, emissive(0xfff2dc, 6), i * 2.2, 4.09, -1, g);
  const sp = new THREE.SpotLight(0xffe2c0, 30, 12, 0.9, 0.6, 1.5); sp.position.set(0, 4, 1.5); sp.target.position.set(0, 1, -3); g.add(sp, sp.target);
  // back wall: lobby entrance glazing onto Lake Ave (daylight)
  box(20, 4.2, 0.2, wall, 0, 2.1, 4.2, g);
  const day = emissive(0xdfe9f2, 1.6);
  for (let i = -1; i <= 1; i++) { box(2.4, 3.0, 0.05, day, i * 2.8, 1.6, 4.08, g); box(0.12, 3.2, 0.12, mat(0x16171b, { metalness: 0.6, roughness: 0.4 }), i * 2.8 - 1.26, 1.6, 4.05, g); }
  g.userData.sign = V(0, 1.55, -2.78);
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
    const num = plane(signTex('fl' + (f + 1), String(f + 1), { w: 256, h: 256, font: '900 190px "Inter Display", Inter', color: '#1a1a1a', bg: '#dcd8cc' }), 1.5, 1.5, { transparent: false }); num.position.set(2.99, y0 + 1.7, 2.2); num.rotation.y = -Math.PI / 2; g.add(num);
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
      const plate = plane(signTex('d' + n, String(n), { w: 256, h: 128, font: '700 80px Inter', color: '#f4efe6', bg: '#1a1a1a' }), 0.22, 0.11, { transparent: false }); plate.position.set(sx * 1.23, 1.65, dz + 0.75); plate.rotation.y = -sx * Math.PI / 2; g.add(plate);
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

// ---------------------------------------------------------------- vehicles
export function lynxBus() {
  const g = new THREE.Group();
  const liv = canvasTex('lynx', 2048, 512, (c, w, h) => {
    c.fillStyle = '#f2f2f4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#10141c'; c.fillRect(60, 70, w - 120, 190);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c4005e'); gr.addColorStop(1, '#ff3d8f');
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, 380); c.bezierCurveTo(w * 0.3, 300, w * 0.6, 470, w, 330); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#fff'; c.font = '900 120px Inter'; c.fillText('LYNX', w * 0.66, 470);
  });
  const bm = new THREE.MeshPhysicalMaterial({ map: liv, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 });
  const body = mesh(new THREE.BoxGeometry(2.55, 3.1, 12), [bm, bm, mat(0xe8e8ee), mat(0x222222), mat(0xe8e8ee), mat(0xe8e8ee)]);
  body.position.y = 1.85; g.add(body);
  box(2.35, 1.4, 0.06, new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.2, clearcoat: 1 }), 0, 2.35, 6.02, g);
  const dest = plane(signTex('lynxdest', '9  ROSEMONT', { font: '800 120px Inter', color: '#ffb020', bg: '#050505' }), 1.9, 0.45, { emit: 2, transparent: false }); dest.position.set(0, 3.15, 6.04); g.add(dest);
  for (const x of [-0.95, 0.95]) box(0.32, 0.16, 0.05, emissive(0xf4f8ff, 5), x, 0.85, 6.03, g);
  // rear: back window, engine grille, ad panel, tail lights, bumper
  const rearGlass = new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  box(2.2, 0.9, 0.06, rearGlass, 0, 2.8, -6.02, g);
  const ad = canvasTex('lynxrear', 1024, 384, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c4005e'); gr.addColorStop(1, '#ff3d8f'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.fillText('LYNX', w / 2, 190);
    c.font = '700 54px Inter'; c.fillText('ride with us · golynx.com', w / 2, 300);
  });
  const adP = plane(ad, 2.2, 0.82, { transparent: false }); adP.position.set(0, 1.85, -6.04); adP.rotation.y = Math.PI; g.add(adP);
  for (let i = 0; i < 6; i++) box(1.9, 0.04, 0.04, mat(0x1a1a1e), 0, 1.0 + i * 0.07, -6.03, g);
  for (const x of [-1.05, 1.05]) { box(0.22, 0.5, 0.05, emissive(0xff2a1a, 4), x, 1.2, -6.04, g); box(0.22, 0.14, 0.05, emissive(0xffa020, 3), x, 0.85, -6.04, g); }
  box(2.6, 0.32, 0.18, mat(0x1c1c20, { roughness: 0.6 }), 0, 0.55, -6.05, g);
  const tire = mat(0x0c0c0e, { roughness: 0.9 });
  for (const [x, z] of [[-1.2, 3.8], [1.2, 3.8], [-1.2, -3.6], [1.2, -3.6]]) { const w = cyl(0.5, 0.5, 0.35, tire, 20, x, 0.5, z, g); w.rotation.z = Math.PI / 2; }
  return g; // faces +z
}
export function sunrail(cars = 3) {
  const g = new THREE.Group();
  const liv = canvasTex('sunrail', 2048, 512, (c, w, h) => {
    c.fillStyle = '#f0f0ee'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#163a6a'; c.fillRect(0, h * 0.66, w, h * 0.34);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ffcf00'); gr.addColorStop(0.6, '#ff9a00'); gr.addColorStop(1, '#2fa84a');
    c.fillStyle = gr; c.fillRect(0, h * 0.58, w, h * 0.08);
    c.fillStyle = '#0d141c'; for (let i = 0; i < 16; i++) { c.fillRect(40 + i * 125, h * 0.12, 92, h * 0.17); c.fillRect(40 + i * 125, h * 0.35, 92, h * 0.17); }
    c.fillStyle = '#163a6a'; c.font = '900 64px Inter'; c.fillText('SunRail', w * 0.44, h * 0.56 - 10);
  });
  const cm = new THREE.MeshPhysicalMaterial({ map: liv, roughness: 0.35, metalness: 0.3, clearcoat: 0.5 });
  for (let k = 0; k < cars; k++) { const b = mesh(new THREE.BoxGeometry(3.1, 4.6, 25), [cm, cm, mat(0xd8d8d8), mat(0x222222), mat(0xf0f0ee), mat(0xf0f0ee)]); b.position.set(0, 3.0, -k * 26); g.add(b); }
  box(3.1, 1.6, 0.4, mat(0xffc400, { roughness: 0.4 }), 0, 1.8, 12.7, g);
  box(2.6, 1.1, 0.1, new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, roughness: 0.05, clearcoat: 1 }), 0, 3.9, 12.55, g);
  for (const x of [-0.9, 0.9]) box(0.35, 0.35, 0.1, emissive(0xffffff, 8), x, 1.6, 12.9, g);
  return g; // cab faces +z
}
export function crossingGate() {
  const g = new THREE.Group();
  const pm = mat(0xe8e8e8, { metalness: 0.4, roughness: 0.4 });
  cyl(0.1, 0.12, 4.2, pm, 10, 0, 2.1, 0, g);
  for (const r of [0.7, -0.7]) { const x = box(1.4, 0.18, 0.04, mat(0xf2f2f2), 0, 3.9, 0.12, g); x.rotation.z = r; }
  const lamps = [];
  for (const dx of [-0.45, 0.45]) { const l = cyl(0.17, 0.17, 0.05, mat(0x330808), 16, dx, 3.0, 0.14, g); l.rotation.x = Math.PI / 2; lamps.push(l); }
  const arm = new THREE.Group(); arm.position.set(0.3, 1.2, 0); g.add(arm);
  const stripes = canvasTex('gate', 512, 32, (c, w, h) => { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#eee' : '#d01818'; c.fillRect(i * 43, 0, 43, h); } });
  const a = mesh(new THREE.BoxGeometry(8, 0.14, 0.1), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 })); a.position.x = 4; arm.add(a);
  g.userData.set = (t, down) => { arm.rotation.z = (1 - down) * Math.PI * 0.45; const ph = Math.floor(t * 2.5) % 2; lamps.forEach((l, i) => { l.material = i === ph ? emissive(0xff2010, 6) : mat(0x330808); }); };
  return g;
}
// The 1889 Church Street Station depot: red pressed brick, dark trim, hip roof with a cupola.
export function depot(ctx, L = 40, D = 11) {
  const g = new THREE.Group();
  const brick = pbr('red_brick_03', { world: 1.6, rough: 0.9 });
  box(D, 7, L, brick, 0, 3.5, 0, g);
  const roof = mesh(new THREE.ConeGeometry(1, 1, 4, 1), mat(0x2e2a2a, { roughness: 0.7 })); roof.scale.set(D * 0.82, 3.6, L * 0.74); roof.rotation.y = Math.PI / 4; roof.position.y = 8.8; g.add(roof);
  box(D + 3, 0.4, L + 2, mat(0x3a2e2a), 0, 7.1, 0, g);
  box(3, 2.4, 3, brick, 0, 11.4, 0, g); const cp = mesh(new THREE.ConeGeometry(2.4, 2.6, 4), mat(0x2e2a2a)); cp.rotation.y = Math.PI / 4; cp.position.y = 13.9; g.add(cp);
  const win = emissive(0xffc77a, 1.6), trim = mat(0xe8dcc8, { roughness: 0.7 });
  for (let i = -5; i <= 5; i++) for (const sx of [-1, 1]) {
    box(0.1, 2.6, 1.4, win, sx * (D / 2 + 0.05), 3, i * 3.4, g);
    const ar = mesh(new THREE.CircleGeometry(0.7, 14, 0, Math.PI), win); ar.position.set(sx * (D / 2 + 0.06), 4.3, i * 3.4); ar.rotation.y = sx * Math.PI / 2; g.add(ar);
    box(0.3, 0.25, 1.8, trim, sx * (D / 2 + 0.12), 1.6, i * 3.4, g);
  }
  const sign = plane(signTex('csssign', 'CHURCH STREET STATION', { font: '700 92px Georgia', color: '#f8e8c8', bg: '#1a3a2a' }), 12, 1.6, { emit: 0.5, transparent: false }); sign.position.set(D / 2 + 0.13, 6.1, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  return g;
}
export function tracks(len = 400) {
  const g = new THREE.Group();
  box(4.5, 0.25, len, pbr('gravel_floor', { world: 1.5, color: 0x7a7268, env: 0.5 }), 0, 0.12, 0, g, { cast: false });
  const tie = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.16, 0.24), mat(0x2e2620, { roughness: 1, envMapIntensity: 0.3 }), Math.floor(len / 0.62)); const m4 = new THREE.Matrix4();
  for (let i = 0; i < tie.count; i++) tie.setMatrixAt(i, m4.makeTranslation(0, 0.3, -len / 2 + i * 0.62)); g.add(tie);
  for (const dx of [-0.72, 0.72]) box(0.08, 0.16, len, new THREE.MeshPhysicalMaterial({ color: 0xc0c0c8, metalness: 1, roughness: 0.25 }), dx, 0.45, 0, g);
  return g;
}
// Linton E. Allen Memorial Fountain: the sea-green 'flying saucer' (60 ft), concrete base, water plume.
export function eolaFountain(night = 0) {
  const g = new THREE.Group();
  const conc = mat(0xdcd8cc, { roughness: 0.7 });
  const green = new THREE.MeshPhysicalMaterial({ color: 0x3fae92, roughness: 0.2, transmission: 0, clearcoat: 1, emissive: 0x1a6a5a, emissiveIntensity: 0.15 + night });
  cyl(9.5, 10, 1.0, conc, 48, 0, 0.5, 0, g);
  cyl(2.2, 3.2, 4.5, conc, 24, 0, 3, 0, g);
  const dish = mesh(new THREE.CylinderGeometry(9.2, 3, 2.6, 48, 1, true), green); dish.position.y = 6.4; g.add(dish);
  cyl(9.2, 9.2, 0.4, green, 48, 0, 7.75, 0, g);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; box(0.35, 3.4, 0.35, conc, Math.cos(a) * 5.6, 9.6, Math.sin(a) * 5.6, g).rotation.y = -a; }
  cyl(6.5, 6.5, 0.5, conc, 32, 0, 11.4, 0, g);
  const dome = mesh(new THREE.SphereGeometry(4.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green); dome.position.y = 11.6; dome.scale.y = 0.7; g.add(dome);
  const water = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const plume = mesh(new THREE.ConeGeometry(1.4, 16, 20, 1, true), water, { cast: false }); plume.position.y = 22; plume.rotation.x = Math.PI; g.add(plume);
  return g;
}
// Mickey-style ears on a headband, sized for the head bone.
export function mouseEars() {
  const g = new THREE.Group();
  const blk = mat(0x0c0c0e, { roughness: 0.6 });
  for (const sx of [-1, 1]) { const e = cyl(0.075, 0.075, 0.018, blk, 24, sx * 0.1, 0.19, 0, g); e.rotation.x = Math.PI / 2; }
  const band = mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 24, Math.PI), blk); band.position.y = 0.06; band.rotation.y = Math.PI / 2; g.add(band);
  return g;
}
