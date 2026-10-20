// Courier on the city bike: seated base clip + 2-bone IK (hands on grips, feet on rotating pedals), spinning wheels.
// Rider frame: forward = +z, up = +y; origin on the ground between the wheels.
import { THREE, V, mat, box, mesh, cyl, clamp } from './core.js';
import { mixCharacter, helmet, deliveryBag } from './chars.js';
import { model } from './props.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const BIKE = { seat: V(0, 0.86, -0.21), grip: (s) => V(s * 0.215, 1.0, 0.25), crank: V(0, 0.25, -0.05), crankR: 0.16, pedalX: 0.13, wheelR: 0.32, front: V(0, 0.32, 0.555), back: V(0, 0.32, -0.555) };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
// rotate `bone` (world space) so that the vector from bone to `childPos` points along `dir`
function aimBone(bone, childPos, target) {
  bone.getWorldPosition(_a);
  const from = childPos.clone().sub(_a).normalize(), to = target.clone().sub(_a).normalize();
  _q.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2);
  const want = _q.multiply(_q2);
  const pw = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pw);
  bone.quaternion.copy(pw.invert().multiply(want));
  bone.updateMatrixWorld(true);
}
// Two-bone IK: upper → lower → end reaches `target`; `pole` = world point the middle joint bends toward.
export function ik2(upper, lower, end, target, pole) {
  upper.updateMatrixWorld(true);
  const pa = upper.getWorldPosition(new THREE.Vector3()), pb = lower.getWorldPosition(new THREE.Vector3()), pc = end.getWorldPosition(new THREE.Vector3());
  const la = pa.distanceTo(pb), lb = pb.distanceTo(pc);
  const d = target.clone().sub(pa); let L = clamp(d.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3); const dir = d.normalize();
  const cosA = (la * la + L * L - lb * lb) / (2 * la * L), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pv = pole.clone().sub(pa); const perp = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const knee = pa.clone().add(dir.clone().multiplyScalar(la * cosA)).add(perp.multiplyScalar(la * sinA));
  aimBone(upper, pb, knee);
  const pc2 = end.getWorldPosition(new THREE.Vector3()), pb2 = lower.getWorldPosition(new THREE.Vector3());
  aimBone(lower, pc2, pa.clone().add(dir.clone().multiplyScalar(L)));
  void pb2;
}

export async function rider({ cup = true } = {}) {
  const root = new THREE.Group();
  const bikeG = await model('models/city_bike.glb');
  const bike = SkeletonUtils.clone(bikeG.scene);
  bike.rotation.y = -Math.PI / 2; // model forward +x → rider forward +z
  const bikeHolder = new THREE.Group(); bikeHolder.add(bike); root.add(bikeHolder);
  // pivots for spinning parts (model space: wheels at x=±0.555, y=0.32; crank at x=-0.05, y=0.25)
  const pivots = { front: new THREE.Group(), back: new THREE.Group(), crank: new THREE.Group() };
  pivots.front.position.set(0.555, 0.32, 0); pivots.back.position.set(-0.555, 0.32, 0); pivots.crank.position.set(-0.05, 0.25, 0);
  const moves = [];
  bike.traverse((o) => { if (o.isMesh) moves.push(o); });
  for (const o of moves) {
    const n = o.name;
    const p = /forward/.test(n) && /wheel|needles/.test(n) ? pivots.front : /back/.test(n) && /wheel_back|needles/.test(n) ? pivots.back : /pedals|gear_main/.test(n) ? pivots.crank : null;
    if (!p) continue;
    if (!p.parent) bike.add(p);
    o.updateMatrixWorld(true);
    p.attach(o);
  }
  // courier
  const C = await mixCharacter('cast/courier.glb', { tint: { casualsuit05: 0x2b3a2f } });
  await C.load('sitidle', 'jog', 'idle', 'defeated', 'facepalm', 'av-idle-male', 'shrug', 'lookdown');
  root.add(C.root);
  const helm = helmet(); C.attach('Head', helm, [0, 0.095, 0.0], [-0.12, 0, 0], 0.88);
  const bag = deliveryBag(); C.attach('Spine2', bag, [0, 0.02, -0.25], [0, Math.PI, 0], 0.82);
  const R = { root, bike: bikeHolder, C, helm, bag, pivots, mode: 'ride' };
  // pose: dist travelled (m) spins wheels; crank angle from dist; lean (rad, forward), bank (rad), stand (0..1 out of the saddle)
  R.ride = (dist, { lean = 0.35, bank = 0, stand = 0, look = 0, crank = null, footDown = 0 } = {}) => {
    R.mode = 'ride';
    pivots.front.rotation.z = -dist / BIKE.wheelR; pivots.back.rotation.z = -dist / BIKE.wheelR;
    const ca = crank ?? dist / 1.6;
    pivots.crank.rotation.z = -ca;
    root.updateMatrixWorld(true);
    C.root.position.set(0, 0, 0); C.root.rotation.set(0, 0, 0);
    C.pose([['sitidle', 2]]);
    // place the hips on the saddle
    const hips = C.bone('Hips');
    const want = BIKE.seat.clone().add(V(0, 0.07 + stand * 0.22, -0.02 + stand * 0.12));
    root.localToWorld(want);
    const have = hips.getWorldPosition(new THREE.Vector3());
    C.root.position.add(root.worldToLocal(want.clone()).sub(root.worldToLocal(have.clone())));
    root.updateMatrixWorld(true);
    // lean the torso over the bars
    const sp = C.bone('Spine'); sp.rotateX(lean); sp.updateMatrixWorld(true);
    const hd = C.bone('Head'); hd.rotateX(-lean * 0.6 + look); hd.updateMatrixWorld(true);
    // arms → grips
    for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) {
      const g = root.localToWorld(BIKE.grip(s === 1 ? 1 : -1).clone());
      const pole = root.localToWorld(V(s * 0.6, 0.7, -0.4));
      ik2(C.bone(side + 'Arm'), C.bone(side + 'ForeArm'), C.bone(side + 'Hand'), g, pole);
    }
    // legs → pedals (left pedal opposite the right)
    for (const [s, side, ph] of [[1, 'Left', 0], [-1, 'Right', Math.PI]]) {
      const a = ca + ph;
      let p = BIKE.crank.clone().add(V(s * BIKE.pedalX, Math.sin(a) * BIKE.crankR, Math.cos(a) * BIKE.crankR));
      if (footDown && s === 1) p = p.lerp(V(0.3, 0.06, 0.15), footDown);
      const pw = root.localToWorld(p.add(V(0, 0.05, 0)));
      const pole = root.localToWorld(V(s * 0.15, 0.9, 1.2));
      ik2(C.bone(side + 'UpLeg'), C.bone(side + 'Leg'), C.bone(side + 'Foot'), pw, pole);
    }
    root.rotation.z = bank;
  };
  // on foot: play a clip at time t
  R.walk = (clip, t, { offset = V(0.55, 0, 0.1), yaw = 0, loop = true } = {}) => {
    R.mode = 'foot';
    C.root.position.copy(offset); C.root.rotation.set(0, yaw, 0);
    C.pose([[clip, t, 1, loop]]);
  };
  R.hand = (side = 'Right') => C.boneWorld(side + 'Hand');
  if (cup) { const c = coldCup(); bikeHolder.add(c); c.position.set(-0.12, 0.97, 0.3); R.cup = c; }
  return R;
}

// The order: venti iced caramel macchiato in a clear cold cup (milk, espresso bleed, caramel drizzle, ice, green straw).
export function coldCup(scale = 1) {
  const g = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 1.5 });
  const milk = mat(0xe6d4b8, { roughness: 0.4 }), espresso = mat(0x6b3a1c, { roughness: 0.3 }), caramel = mat(0xc77a2a, { roughness: 0.2 });
  cyl(0.046, 0.034, 0.1, milk, 20, 0, 0.05, 0, g);
  cyl(0.051, 0.046, 0.05, mat(0xa86a38, { roughness: 0.3 }), 20, 0, 0.125, 0, g);
  cyl(0.054, 0.051, 0.04, espresso, 20, 0, 0.17, 0, g);
  cyl(0.056, 0.038, 0.2, shell, 24, 0, 0.1, 0, g, { cast: false });
  const dome = mesh(new THREE.SphereGeometry(0.056, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, { cast: false }); dome.position.y = 0.2; dome.scale.y = 0.5; g.add(dome);
  const straw = cyl(0.005, 0.005, 0.2, mat(0x1e7a3e, { roughness: 0.4 }), 8, 0.01, 0.27, 0, g); straw.rotation.z = 0.1;
  box(0.08, 0.003, 0.006, caramel, 0, 0.193, 0.01, g); box(0.006, 0.003, 0.08, caramel, 0.01, 0.193, 0, g);
  const lbl = mesh(new THREE.PlaneGeometry(0.04, 0.025), mat(0xffffff, { roughness: 0.6 })); lbl.position.set(0, 0.13, 0.052); g.add(lbl);
  g.scale.setScalar(scale);
  return g;
}
