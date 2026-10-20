// The courier + e-bike. Real proportions (1.78 m), face always behind a tinted visor.
// The body is posed from a set of joint points (rig space, forward = +z): every limb is a segment
// placed between two points, so poses come from simple 2-bone IK instead of hand-keyed angles.
import { THREE, PAL, V, mat, glow, mesh, box, cyl, canvasTex, glowSprite, keep, lerp, clamp } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DIM = { thigh: 0.46, shin: 0.45, upper: 0.3, fore: 0.28, torso: 0.5, hipW: 0.12, shW: 0.2 };
const Y = V(0, 1, 0);
const _q = new THREE.Quaternion();

function fabric(color, sheen = 0.4) {
  return keep(new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffffff).multiplyScalar(0.3) }));
}
// segment mesh: unit-length along +y from its origin, scaled to fit between two joints
// tapered segment (r0 at the start joint, r1 at the end) with a rounded cap at the end joint
function limb(r0, r1, material) {
  const m = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(r1, r0, 1, 14, 1, true), material, { cast: true });
  shaft.geometry.translate(0, 0.5, 0);
  m.add(shaft);
  const cap0 = mesh(new THREE.SphereGeometry(r0, 14, 10), material, { cast: true });
  m.add(cap0);
  const cap1 = mesh(new THREE.SphereGeometry(r1, 14, 10), material, { cast: true });
  m.add(cap1);
  m.userData = { shaft, cap1 };
  return m;
}
function placeLimb(m, a, b) {
  const d = b.clone().sub(a);
  const L = Math.max(0.001, d.length());
  m.position.copy(a);
  m.quaternion.copy(_q.setFromUnitVectors(Y, d.normalize()));
  m.userData.shaft.scale.set(1, L, 1);
  m.userData.cap1.position.set(0, L, 0);
}

export function rider({ outfit = 'courier' } = {}) {
  const R = new THREE.Group();
  const P = outfit === 'courier'
    ? { top: fabric(PAL.hoodie, 0.5), legs: fabric(PAL.jeans, 0.3), shoe: mat(0xf2f2f2, { roughness: 0.5 }), sole: mat(0x111111), glove: mat(0x15161a, { roughness: 0.6 }) }
    : { top: fabric(0xd8cfc0, 0.5), legs: fabric(0x3a3a44, 0.3), shoe: mat(0x8a6a4a), sole: mat(0x222222), glove: mat(PAL.skin, { roughness: 0.6 }) };
  const parts = {};
  parts.pelvis = mesh(new RoundedBoxGeometry(0.34, 0.2, 0.22, 3, 0.07), P.legs, { cast: true });
  parts.torso = mesh(new RoundedBoxGeometry(0.42, 0.52, 0.25, 4, 0.1), P.top, { cast: true });
  parts.torso.geometry.translate(0, 0.26, 0);
  // jacket details: hi-vis green piping + zip (courier)
  if (outfit === 'courier') {
    const pip = glow(PAL.eats, 0.6);
    for (const sx of [-1, 1]) { const s = box(0.012, 0.44, 0.012, pip, sx * 0.13, 0.27, 0.128); parts.torso.add(s); }
    box(0.01, 0.46, 0.01, mat(0x88888c, { metalness: 0.8 }), 0, 0.26, 0.13, parts.torso);
    const hood = mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 16, Math.PI), P.top); hood.rotation.set(-0.3, 0, Math.PI); hood.position.set(0, 0.5, -0.05); parts.torso.add(hood);
  }
  parts.neck = limb(0.055, 0.055, mat(PAL.skin, { roughness: 0.55 }));
  // head + helmet + visor
  parts.head = new THREE.Group();
  const skull = mesh(new THREE.SphereGeometry(0.105, 20, 16), mat(PAL.skin, { roughness: 0.5 })); skull.scale.set(0.9, 1.05, 1); parts.head.add(skull);
  if (outfit === 'courier') {
    const helm = mesh(new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), keep(new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 })));
    helm.scale.set(0.95, 1.0, 1.12); helm.position.y = 0.02; parts.head.add(helm);
    const stripe = mesh(new THREE.TorusGeometry(0.142, 0.008, 6, 30, Math.PI), glow(PAL.eats, 1.2)); stripe.rotation.set(0, Math.PI / 2, Math.PI / 2); stripe.position.y = 0.03; stripe.scale.set(1, 1.12, 1); parts.head.add(stripe);
    const visor = mesh(new THREE.SphereGeometry(0.135, 24, 12, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.42, Math.PI * 0.28), keep(new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, roughness: 0.02, metalness: 0.6, clearcoat: 1, envMapIntensity: 2.5 })));
    visor.scale.set(0.98, 1.0, 1.12); visor.position.set(0, 0.0, 0.012); parts.head.add(visor);
  } else {
    const hair = mesh(new THREE.SphereGeometry(0.115, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0x8a5a2a, { roughness: 0.9 })); hair.position.set(0, 0.015, -0.01); parts.head.add(hair);
    for (const sx of [-1, 1]) {
      const e = mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(0x101010, { roughness: 0.2 })); e.position.set(sx * 0.035, 0.01, 0.092); parts.head.add(e);
      const br = box(0.035, 0.008, 0.01, mat(0x5a3a1a), sx * 0.036, 0.034, 0.096, parts.head); br.rotation.z = sx * -0.25; // the eyebrow
    }
    box(0.04, 0.006, 0.01, mat(0x8a4a3a), 0, -0.045, 0.098, parts.head); // flat mouth
    const nose = mesh(new THREE.ConeGeometry(0.014, 0.035, 6), mat(PAL.skin, { roughness: 0.5 })); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.108); parts.head.add(nose);
  }
  for (const s of ['L', 'R']) {
    parts['upper' + s] = limb(0.058, 0.05, P.top);
    parts['fore' + s] = limb(0.048, 0.04, P.top);
    parts['hand' + s] = mesh(new RoundedBoxGeometry(0.07, 0.1, 0.04, 2, 0.02), P.glove, { cast: true });
    parts['thigh' + s] = limb(0.085, 0.065, P.legs);
    parts['shin' + s] = limb(0.062, 0.05, P.legs);
    const shoe = new THREE.Group();
    const up = mesh(new RoundedBoxGeometry(0.1, 0.08, 0.27, 2, 0.035), P.shoe, { cast: true }); up.position.set(0, 0.04, 0.06); shoe.add(up);
    box(0.105, 0.025, 0.28, P.sole, 0, 0.0, 0.06, shoe);
    parts['foot' + s] = shoe;
  }
  // insulated delivery bag (black, green band + wordmark), rides on the torso frame
  if (outfit === 'courier') {
    const bag = new THREE.Group();
    const bt = canvasTex('eatsbag', 512, 512, (c, w, h) => {
      c.fillStyle = '#121316'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1b1c20'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
      c.fillStyle = '#06C167'; c.fillRect(0, h * 0.72, w, h * 0.08);
      c.fillStyle = '#ffffff'; c.font = '600 92px Inter'; c.textAlign = 'center'; c.fillText('Uber', w / 2, h * 0.4); c.font = '800 92px Inter'; c.fillStyle = '#06C167'; c.fillText('Eats', w / 2, h * 0.6);
    }, { repeat: false });
    const bm = keep(new THREE.MeshStandardMaterial({ map: bt, roughness: 0.65 }));
    const side = mat(0x15161a, { roughness: 0.7 });
    const b = mesh(new RoundedBoxGeometry(0.44, 0.44, 0.3, 3, 0.04), [side, side, side, side, side, bm], { cast: true });
    b.rotation.y = Math.PI; // wordmark faces backward
    b.position.set(0, 0.3, -0.29);
    bag.add(b);
    box(0.4, 0.015, 0.02, glow(0xd8ffe8, 1.5), 0, 0.08, -0.445, bag); // reflective strip
    for (const sx of [-1, 1]) { const s = box(0.04, 0.42, 0.02, mat(0x0a0a0c), sx * 0.12, 0.28, -0.13, bag); s.rotation.x = 0.1; }
    parts.torso.add(bag);
    parts.bag = bag;
  }
  for (const p of Object.values(parts)) if (!p.parent) R.add(p);
  R.userData.parts = parts;
  R.userData.joints = {};
  return R;
}

// 2-bone IK: hip → knee → foot. Returns middle joint. pole = bend direction hint.
export function ik2(a, target, l1, l2, pole) {
  const d = target.clone().sub(a);
  let L = d.length();
  L = clamp(L, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const dir = d.normalize();
  const cosA = (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return a.clone().add(dir.clone().multiplyScalar(l1 * cosA)).add(perp.multiplyScalar(l1 * sinA));
}

// Apply joints (rig space): pelvis, chest (torso top), head, shoulders, elbows, wrists, hips, knees, ankles.
// fwd = body forward (unit, rig space) to orient torso / pelvis.
export function applyJoints(R, J, { fwd = V(0, 0, 1), headFwd = null, footFwd = null } = {}) {
  const P = R.userData.parts;
  // pelvis
  const up = J.chest.clone().sub(J.pelvis).normalize();
  const basis = (u, f) => { const x = new THREE.Vector3().crossVectors(u, f).normalize(); const z = new THREE.Vector3().crossVectors(x, u).normalize(); return new THREE.Matrix4().makeBasis(x.negate().negate(), u, z); };
  const mP = basis(V(0, 1, 0).lerp(up, 0.3).normalize(), fwd);
  P.pelvis.position.copy(J.pelvis);
  P.pelvis.quaternion.setFromRotationMatrix(mP);
  P.torso.position.copy(J.pelvis).add(up.clone().multiplyScalar(0.06));
  P.torso.quaternion.setFromRotationMatrix(basis(up, fwd));
  // x axis of basis is (up × fwd) = left side; so torso local +x = rig left. Fine for symmetric parts.
  placeLimb(P.neck, J.chest.clone().add(up.clone().multiplyScalar(0.02)), J.head);
  P.head.position.copy(J.head);
  const hf = (headFwd || fwd).clone().normalize();
  const hu = V(0, 1, 0).lerp(up, 0.5).normalize();
  P.head.quaternion.setFromRotationMatrix(basis(hu, hf));
  for (const s of ['L', 'R']) {
    placeLimb(P['upper' + s], J['sh' + s], J['el' + s]);
    placeLimb(P['fore' + s], J['el' + s], J['wr' + s]);
    const hd = J['wr' + s].clone().sub(J['el' + s]).normalize();
    P['hand' + s].position.copy(J['wr' + s]).add(hd.clone().multiplyScalar(0.05));
    P['hand' + s].quaternion.setFromUnitVectors(Y, hd);
    placeLimb(P['thigh' + s], J['hip' + s], J['kn' + s]);
    placeLimb(P['shin' + s], J['kn' + s], J['an' + s]);
    P['foot' + s].position.copy(J['an' + s]).add(V(0, -0.06, 0));
    const ff = (J['toe' + s] ? J['toe' + s].clone().sub(J['an' + s]) : (footFwd || fwd).clone()).setY(0).normalize();
    P['foot' + s].quaternion.setFromUnitVectors(V(0, 0, 1), ff.lengthSq() > 0 ? ff : V(0, 0, 1));
  }
  R.userData.joints = J;
}

// Torso frame helpers: from pelvis, chest, fwd → shoulder & hip points.
function frame(pelvis, chest, fwd) {
  const up = chest.clone().sub(pelvis).normalize();
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const f = new THREE.Vector3().crossVectors(left, up).normalize();
  return { up, left, f };
}

// ---------------------------------------------------------------- e-bike (fat-tyre courier e-bike), faces +z
export const BIKE = { wheelR: 0.34, base: 1.18, seat: V(0, 0.98, -0.2), bars: V(0, 1.12, 0.46), gripW: 0.31, crank: V(0, 0.33, 0.02), crankL: 0.17 };
export function bike() {
  const B = new THREE.Group();
  const frameM = keep(new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.15 }));
  const accent = mat(PAL.eats, { roughness: 0.35, metalness: 0.4, emissive: PAL.eats, emissiveIntensity: 0.15 });
  const tyre = mat(0x111114, { roughness: 0.9 });
  const rim = mat(0x8a8c94, { metalness: 0.9, roughness: 0.25 });
  const wheels = [];
  for (const z of [-BIKE.base / 2, BIKE.base / 2]) {
    const w = new THREE.Group();
    w.position.set(0, BIKE.wheelR, z);
    const t = mesh(new THREE.TorusGeometry(BIKE.wheelR - 0.05, 0.055, 12, 40), tyre, { cast: true }); t.rotation.y = Math.PI / 2; w.add(t);
    const r = mesh(new THREE.TorusGeometry(BIKE.wheelR - 0.1, 0.014, 6, 40), rim); r.rotation.y = Math.PI / 2; w.add(r);
    const spokes = new THREE.Group();
    for (let i = 0; i < 12; i++) { const s = box(0.006, (BIKE.wheelR - 0.1) * 2, 0.006, rim, 0, 0, 0, spokes); s.rotation.x = (i / 12) * Math.PI; }
    const disc = mesh(new THREE.CircleGeometry(0.08, 16), rim); disc.rotation.y = Math.PI / 2; disc.position.x = 0.03; spokes.add(disc);
    w.add(spokes);
    w.userData.spin = spokes;
    w.userData.tyre = t;
    B.add(w);
    wheels.push(w);
  }
  const tube = (a, b, r, m = frameM) => { const d = b.clone().sub(a); const c = mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), m, { cast: true }); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(Y, d.normalize()); B.add(c); return c; };
  const rear = V(0, BIKE.wheelR, -BIKE.base / 2), front = V(0, BIKE.wheelR, BIKE.base / 2), bb = BIKE.crank.clone();
  const head = V(0, 0.92, 0.38), seatT = V(0, 0.86, -0.17);
  tube(bb, head, 0.038); // down tube (battery rides on it)
  tube(seatT, head.clone().add(V(0, -0.04, 0)), 0.026);
  tube(bb, seatT, 0.03);
  for (const sx of [-0.06, 0.06]) { tube(bb.clone().add(V(sx, 0, 0)), rear.clone().add(V(sx, 0, 0)), 0.016); tube(seatT.clone().add(V(sx, 0, 0)), rear.clone().add(V(sx, 0, 0)), 0.014); tube(head.clone().add(V(sx, -0.05, 0)), front.clone().add(V(sx, 0, 0)), 0.02); }
  const batt = mesh(new RoundedBoxGeometry(0.11, 0.1, 0.5, 2, 0.03), mat(0x1c1e24, { roughness: 0.4 }), { cast: true });
  batt.position.copy(bb.clone().lerp(head, 0.5)).add(V(0, 0.06, 0)); batt.lookAt(head.clone().add(V(0, 0.06, 0))); B.add(batt);
  const stripe = box(0.112, 0.02, 0.4, accent, 0, 0.04, 0, batt); void stripe;
  // seat + post, bars + stem, crank + pedals
  tube(seatT, BIKE.seat.clone().add(V(0, -0.04, 0)), 0.016, rim);
  const seat = mesh(new RoundedBoxGeometry(0.16, 0.06, 0.28, 2, 0.03), mat(0x0e0e10, { roughness: 0.6 }), { cast: true }); seat.position.copy(BIKE.seat); B.add(seat);
  tube(head, BIKE.bars.clone().add(V(0, -0.02, -0.04)), 0.02, frameM);
  const bar = cyl(0.014, 0.014, BIKE.gripW * 2 + 0.1, frameM, 8); bar.rotation.z = Math.PI / 2; bar.position.copy(BIKE.bars); B.add(bar);
  for (const sx of [-1, 1]) { const gr = cyl(0.02, 0.02, 0.11, mat(0x0a0a0c), 8); gr.rotation.z = Math.PI / 2; gr.position.copy(BIKE.bars).add(V(sx * BIKE.gripW, 0, 0)); B.add(gr); }
  // phone mount (screen is set by the shot)
  const mount = new THREE.Group(); mount.position.copy(BIKE.bars).add(V(0, 0.07, 0.02)); B.add(mount);
  const phoneBody = mesh(new RoundedBoxGeometry(0.078, 0.16, 0.009, 3, 0.008), mat(0x0a0a0c, { metalness: 0.5, roughness: 0.3 }));
  phoneBody.rotation.set(-2.39, 0, Math.PI); mount.add(phoneBody); // screen (+z) faces the rider, top away
  B.userData.phone = phoneBody;
  // cup holder clamped to the right of the stem (the order rides where you can see it)
  const holder = new THREE.Group(); holder.position.copy(BIKE.bars).add(V(-0.17, -0.07, 0.05)); B.add(holder);
  const ringH = mesh(new THREE.TorusGeometry(0.065, 0.008, 6, 20), mat(0x15161a, { metalness: 0.5 })); ringH.rotation.x = Math.PI / 2; ringH.position.y = 0.08; holder.add(ringH);
  box(0.012, 0.1, 0.012, mat(0x15161a), 0, 0.03, -0.065, holder);
  B.userData.holder = holder;
  // front light + rear light (real light + glow + wet-road beam)
  const lamp = cyl(0.03, 0.035, 0.06, mat(0x222228, { metalness: 0.7 }), 10); lamp.rotation.x = Math.PI / 2; lamp.position.copy(BIKE.bars).add(V(0, -0.06, 0.08)); B.add(lamp);
  const lg = glowSprite(0xf2f6ff, 0.3, 0.6); lg.position.copy(lamp.position).add(V(0, 0, 0.05)); B.add(lg);
  const spot = new THREE.SpotLight(0xf2f6ff, 12, 30, 0.35, 0.5, 1.6); spot.position.copy(lamp.position); spot.target.position.set(0, 0, 8); B.add(spot, spot.target);
  B.userData.spot = spot;
  const tl = box(0.06, 0.03, 0.02, glow(0xff1a1a, 6), 0, 0.72, -0.62, B); void tl;
  const tg = glowSprite(0xff2020, 0.25, 0.9); tg.position.set(0, 0.72, -0.64); B.add(tg);
  tube(seatT, V(0, 0.72, -0.6), 0.012, rim);
  const crank = new THREE.Group(); crank.position.copy(bb); B.add(crank);
  const ring = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), rim); ring.rotation.y = Math.PI / 2; ring.position.x = 0.07; crank.add(ring);
  const motor = cyl(0.09, 0.09, 0.12, mat(0x222228, { metalness: 0.6, roughness: 0.4 }), 16); motor.rotation.z = Math.PI / 2; crank.add(motor);
  const arms = new THREE.Group(); crank.add(arms);
  for (const sx of [-1, 1]) { const a = box(0.02, BIKE.crankL, 0.03, rim, sx * 0.09, -sx * BIKE.crankL / 2, 0, arms); void a; const p = box(0.1, 0.02, 0.07, mat(0x111111), sx * 0.15, -sx * BIKE.crankL, 0, arms); void p; }
  B.userData.crankArms = arms;
  // fender
  for (const w of wheels) { const f = mesh(new THREE.TorusGeometry(BIKE.wheelR + 0.03, 0.035, 6, 20, Math.PI * 0.7), frameM); f.rotation.set(0, Math.PI / 2, 0.25 * Math.PI); f.position.copy(w.position); B.add(f); }
  B.userData.wheels = wheels;
  return B;
}
// Spin wheels / cranks by distance travelled.
export function rollBike(B, dist, pedal = null) {
  for (const w of B.userData.wheels) w.userData.spin.rotation.x = dist / BIKE.wheelR;
  B.userData.crankArms.rotation.x = pedal ?? dist / 2.2;
}
// Pose the rider seated (or standing on pedals) on the bike. Rider + bike share the same parent frame.
export function poseRide(R, B, { lean = 0.35, stand = 0, look = null, reachR = null, reachL = null, crank = null, tuck = 0 } = {}) {
  const c = crank ?? B.userData.crankArms.rotation.x;
  const crankC = BIKE.crank;
  const pedal = (side) => { const a = c + (side > 0 ? Math.PI : 0); return crankC.clone().add(V(side * 0.15, -Math.cos(a) * BIKE.crankL * (side > 0 ? -1 : 1), Math.sin(a) * BIKE.crankL * (side > 0 ? -1 : 1))); };
  const pelvis = BIKE.seat.clone().add(V(0, 0.1 + stand * 0.3, -0.02 + stand * 0.12));
  const chestDir = V(0, Math.cos(lean + tuck * 0.4), Math.sin(lean + tuck * 0.4));
  const chest = pelvis.clone().add(chestDir.multiplyScalar(DIM.torso));
  const fwd = V(0, 0, 1);
  const F = frame(pelvis, chest, fwd);
  const head = chest.clone().add(F.up.clone().multiplyScalar(0.18)).add(V(0, 0.02, 0.05));
  const J = { pelvis, chest, head };
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    J['sh' + s] = chest.clone().add(F.left.clone().multiplyScalar(sx * DIM.shW)).add(F.up.clone().multiplyScalar(-0.06));
    const reach = s === 'R' ? reachR : reachL;
    J['wr' + s] = reach ? reach.clone() : BIKE.bars.clone().add(V(sx * BIKE.gripW, 0.01, -0.02));
    J['el' + s] = ik2(J['sh' + s], J['wr' + s], DIM.upper, DIM.fore, V(sx * 0.8, -0.6, -0.3));
    J['hip' + s] = pelvis.clone().add(F.left.clone().multiplyScalar(sx * DIM.hipW)).add(V(0, -0.04, 0));
    const ped = pedal(sx);
    J['an' + s] = ped.clone().add(V(0, 0.06, -0.03));
    J['kn' + s] = ik2(J['hip' + s], J['an' + s], DIM.thigh, DIM.shin, V(sx * 0.15, 0.3, 1));
    J['toe' + s] = J['an' + s].clone().add(V(0, -0.02, 0.2));
  }
  applyJoints(R, J, { fwd, headFwd: look || V(0, -0.15, 1) });
}
// Running / sprinting gait. phase in cycles; speed 0..1 (jog → sprint); up = stairs climb (step height).
export function poseRun(R, phase, { speed = 1, lean = 0.25, stairs = 0, carry = null, look = null } = {}) {
  const a = phase * Math.PI * 2;
  const stride = 0.55 + speed * 0.35;
  const bob = Math.abs(Math.sin(a)) * 0.06 * speed;
  const pelvis = V(0, 0.98 + bob - stairs * 0.05, 0);
  const L2 = lean + speed * 0.12;
  const chest = pelvis.clone().add(V(Math.sin(a) * 0.02, Math.cos(L2), Math.sin(L2)).normalize().multiplyScalar(DIM.torso));
  const fwd = V(Math.sin(a) * 0.12, 0, 1).normalize();
  const F = frame(pelvis, chest, fwd);
  const J = { pelvis, chest, head: chest.clone().add(F.up.clone().multiplyScalar(0.18)).add(V(0, 0, 0.04)) };
  for (const [s, sx, off] of [['L', 1, 0], ['R', -1, Math.PI]]) {
    const p = a + off;
    J['hip' + s] = pelvis.clone().add(F.left.clone().multiplyScalar(sx * DIM.hipW)).add(V(0, -0.05, 0));
    const sw = Math.sin(p), lift = Math.max(0, Math.cos(p));
    const fz = sw * stride * 0.5;
    const fy = 0.08 + lift * (0.18 + speed * 0.12) + (stairs ? (sw > 0 ? 0.18 * sw : 0) * stairs : 0);
    J['an' + s] = V(sx * 0.11, fy, fz);
    J['kn' + s] = ik2(J['hip' + s], J['an' + s], DIM.thigh, DIM.shin, V(0, 0.2, 1));
    J['toe' + s] = J['an' + s].clone().add(V(0, -0.03 + lift * -0.05, 0.2));
    J['sh' + s] = chest.clone().add(F.left.clone().multiplyScalar(sx * DIM.shW)).add(F.up.clone().multiplyScalar(-0.06));
    const arm = -Math.sin(p) * (0.35 + speed * 0.25);
    const held = carry && carry[s];
    J['wr' + s] = held ? held.clone() : J['sh' + s].clone().add(V(sx * 0.06, -0.38 + Math.abs(arm) * 0.18, arm * 0.55 + 0.08));
    J['el' + s] = ik2(J['sh' + s], J['wr' + s], DIM.upper, DIM.fore, V(sx * 0.3, -0.2, -1));
  }
  applyJoints(R, J, { fwd, headFwd: look || V(0, -0.05, 1) });
}
// Standing / idle pose with optional hand targets (rig space).
export function poseStand(R, { lean = 0.04, t = 0, handR = null, handL = null, look = null, crouch = 0, twist = 0 } = {}) {
  const pelvis = V(0, 0.98 - crouch * 0.35 + Math.sin(t * 1.6) * 0.004, 0);
  const chest = pelvis.clone().add(V(Math.sin(twist) * 0.1, Math.cos(lean + crouch * 0.5), Math.sin(lean + crouch * 0.5)).normalize().multiplyScalar(DIM.torso));
  const fwd = V(Math.sin(twist), 0, Math.cos(twist));
  const F = frame(pelvis, chest, fwd);
  const J = { pelvis, chest, head: chest.clone().add(F.up.clone().multiplyScalar(0.18)).add(V(0, 0, 0.03)) };
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    J['hip' + s] = pelvis.clone().add(F.left.clone().multiplyScalar(sx * DIM.hipW)).add(V(0, -0.05, 0));
    J['an' + s] = V(sx * 0.14, 0.08, sx * 0.04);
    J['kn' + s] = ik2(J['hip' + s], J['an' + s], DIM.thigh, DIM.shin, V(sx * 0.1, 0, 1));
    J['toe' + s] = J['an' + s].clone().add(V(sx * 0.03, -0.03, 0.2));
    J['sh' + s] = chest.clone().add(F.left.clone().multiplyScalar(sx * DIM.shW)).add(F.up.clone().multiplyScalar(-0.06));
    const h = s === 'R' ? handR : handL;
    J['wr' + s] = h ? h.clone() : J['sh' + s].clone().add(V(sx * 0.05, -0.55, 0.05));
    J['el' + s] = ik2(J['sh' + s], J['wr' + s], DIM.upper, DIM.fore, V(sx * 0.4, -0.3, -1));
  }
  applyJoints(R, J, { fwd, headFwd: look || fwd.clone().add(V(0, -0.1, 0)) });
}
// World position of a rig-space point (for attaching props / camera targets).
export function rigToWorld(root, p) { root.updateMatrixWorld(true); return root.localToWorld(p.clone()); }
export function handWorld(R, s = 'R') { const h = R.userData.parts['hand' + s]; h.updateMatrixWorld(true); return h.getWorldPosition(V()); }
