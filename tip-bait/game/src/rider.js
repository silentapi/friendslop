// The courier on the city bike: seated clip + IK hands to grips, feet on rotating pedals, spinning wheels.
// Rider frame: forward = +z, up = +y, origin on the ground between the wheels.
import { THREE, V, SkeletonUtils, loadGLB } from './core.js';
import { character, ik2, helmet, deliveryBag, coldCup } from './chars.js';

const BIKE = { seat: V(0, 0.86, -0.21), grip: (s) => V(s * 0.215, 1.0, 0.25), crank: V(0, 0.25, -0.05), crankR: 0.16, pedalX: 0.13, wheelR: 0.32 };

export async function rider() {
  const root = new THREE.Group();
  const bikeG = await loadGLB('m/city_bike.glb');
  const bike = SkeletonUtils.clone(bikeG.scene);
  bike.rotation.y = -Math.PI / 2;
  const bikeHolder = new THREE.Group(); bikeHolder.add(bike); root.add(bikeHolder);
  const pivots = { front: new THREE.Group(), back: new THREE.Group(), crank: new THREE.Group() };
  pivots.front.position.set(0.555, 0.32, 0); pivots.back.position.set(-0.555, 0.32, 0); pivots.crank.position.set(-0.05, 0.25, 0);
  const moves = [];
  bike.traverse((o) => { if (o.isMesh) { moves.push(o); o.castShadow = true; } });
  bike.updateMatrixWorld(true);
  for (const o of moves) {
    // classify by name, falling back to position (deduplicated wheel meshes can share names)
    const n = o.name, wp = bike.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
    let p = null;
    if (/wheel|needles/.test(n)) p = wp.x > 0.1 ? pivots.front : wp.x < -0.1 ? pivots.back : null;
    if (/pedals|gear_main/.test(n)) p = pivots.crank;
    if (!p) continue;
    if (!p.parent) bike.add(p);
    p.attach(o);
  }
  const C = await character('m/courier.glb', { tint: { casualsuit05: 0x2b3a2f } });
  await C.load('sitidle', 'jog', 'idle', 'falling', 'facepalm', 'shrug');
  root.add(C.root);
  const helm = helmet(); C.attach('Head', helm, [0, 0.095, 0.0], [-0.12, 0, 0], 0.88);
  const bag = deliveryBag(); C.attach('Spine2', bag, [0, 0.02, -0.25], [0, Math.PI, 0], 0.82);
  const cup = coldCup(); bikeHolder.add(cup); cup.position.set(-0.12, 0.97, 0.3);
  const R = { root, bike: bikeHolder, C, helm, bag, cup, pivots };
  R.ride = (dist, { lean = 0.35, bank = 0, stand = 0, look = 0, footDown = 0 } = {}) => {
    pivots.front.rotation.z = -dist / BIKE.wheelR; pivots.back.rotation.z = -dist / BIKE.wheelR;
    const ca = dist / 1.6;
    pivots.crank.rotation.z = -ca;
    root.rotation.z = 0;
    root.updateMatrixWorld(true);
    C.root.position.set(0, 0, 0); C.root.rotation.set(0, 0, 0);
    C.pose([['sitidle', 2]]);
    const hips = C.bone('Hips');
    const want = root.localToWorld(BIKE.seat.clone().add(V(0, 0.07 + stand * 0.22, -0.02 + stand * 0.12)));
    const have = hips.getWorldPosition(new THREE.Vector3());
    C.root.position.add(root.worldToLocal(want.clone()).sub(root.worldToLocal(have.clone())));
    root.updateMatrixWorld(true);
    const sp = C.bone('Spine'); sp.rotateX(lean); sp.updateMatrixWorld(true);
    const hd = C.bone('Head'); hd.rotateX(-lean * 0.6 + look); hd.updateMatrixWorld(true);
    for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) {
      ik2(C.bone(side + 'Arm'), C.bone(side + 'ForeArm'), C.bone(side + 'Hand'), root.localToWorld(BIKE.grip(s)), root.localToWorld(V(s * 0.6, 0.7, -0.4)));
    }
    for (const [s, side, ph] of [[1, 'Left', 0], [-1, 'Right', Math.PI]]) {
      const a = ca + ph;
      let p = BIKE.crank.clone().add(V(s * BIKE.pedalX, Math.sin(a) * BIKE.crankR, Math.cos(a) * BIKE.crankR));
      if (footDown && s === 1) p = p.lerp(V(0.3, 0.06, 0.15), footDown);
      ik2(C.bone(side + 'UpLeg'), C.bone(side + 'Leg'), C.bone(side + 'Foot'), root.localToWorld(p.add(V(0, 0.05, 0))), root.localToWorld(V(s * 0.15, 0.9, 1.2)));
    }
    root.rotation.z = bank;
  };
  R.walk = (clip, t, { offset = V(0.55, 0, 0.1), yaw = 0, loop = true } = {}) => {
    C.root.position.copy(offset); C.root.rotation.set(0, yaw, 0);
    C.pose([[clip, t, 1, loop]]);
  };
  return R;
}
