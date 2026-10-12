// Clay ant: real anatomy (head + mandibles + compound eyes, elbowed antennae, mesosoma, petiole,
// gaster, 6 jointed legs), softened into plasticine. Players are told apart by a paint dab on the
// gaster and a matching thread scarf. Root sits on the ground facing +Z; body length ≈ 1.6.
import { THREE, PAL, mesh, clay, outline } from './render.js';
import { spring, nz, hash } from './anim.js';

const SEEDS = { pip: 1, dot: 2, bean: 3, moss: 4, queen: 5 };
const BODY = () => clay(PAL.antBody, { rough: 0.32, repeat: 2.2, strength: 1.1, sheen: 0.35 });
const DARK = () => clay(PAL.antDark, { rough: 0.4, repeat: 3, strength: 0.9 });
const EYE = () => clay(0x120a08, { rough: 0.15, repeat: 6, strength: 0.25 });

function seg(r0, r1, len, m, radial = 10) {
  // tapered limb along +X from the pivot
  const g = new THREE.CylinderGeometry(r1, r0, len, radial, 3);
  g.rotateZ(-Math.PI / 2);
  g.translate(len / 2, 0, 0);
  const cap = new THREE.SphereGeometry(r0, radial, 8);
  const mm = mesh(g, m);
  const j = mesh(cap, m);
  mm.add(j);
  return mm;
}
function blob(r, sx, sy, sz, m, ws = 28, hs = 20) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  return mesh(g, m);
}

export function ant(who, { scale = 1, queen = false } = {}) {
  const paint = PAL[who] ?? 0xff4a3a;
  const body = BODY();
  const dark = DARK();
  const root = new THREE.Group();
  const bodyG = new THREE.Group(); // bob + pitch pivot at the waist
  bodyG.position.y = 0.36;
  root.add(bodyG);

  // mesosoma (thorax): sloped capsule with a hump
  const meso = new THREE.Group();
  meso.position.set(0, 0, 0.12);
  bodyG.add(meso);
  const thor = blob(0.15, 1, 0.95, 2.1, body);
  thor.rotation.x = -0.22;
  meso.add(thor);
  const hump = blob(0.1, 1.05, 0.9, 1.2, body);
  hump.position.set(0, 0.07, -0.1);
  meso.add(hump);

  // petiole node + gaster
  const pet = blob(0.07, 1, 1.2, 1, body, 14, 10);
  pet.position.set(0, 0.02, -0.24);
  bodyG.add(pet);
  const gasterP = new THREE.Group();
  gasterP.position.set(0, 0.03, -0.3);
  gasterP.rotation.x = 0.28;
  bodyG.add(gasterP);
  const gaster = blob(0.23, 0.92, 0.84, 1.42, body);
  gaster.position.z = -0.34;
  gasterP.add(gaster);
  for (const [z, s] of [[-0.18, 0.8], [-0.36, 0.98], [-0.54, 0.82]]) {
    const band = mesh(new THREE.TorusGeometry(0.21 * s, 0.012, 6, 32), dark);
    band.position.z = z;
    band.scale.set(0.92, 0.84, 1);
    band.userData.noOutline = true;
    gasterP.add(band);
  }
  // paint dab (player ID): irregular flattened blob on top of the gaster
  const dab = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const d = blob(0.1 - i * 0.012, 1.3, 0.25, 1.1, clay(paint, { rough: 0.35, repeat: 6, strength: 0.6 }), 14, 8);
    d.position.set((hash(i + 1) - 0.5) * 0.06, 0, (hash(i + 5) - 0.5) * 0.08);
    d.userData.noOutline = true;
    dab.add(d);
  }
  dab.position.set(0, 0.19, -0.36);
  dab.rotation.x = -0.12;
  gasterP.add(dab);

  // neck + head
  const neck = new THREE.Group();
  neck.position.set(0, 0.08, 0.44);
  bodyG.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const skull = blob(0.2, 1.08, 0.9, 1.1, body);
  skull.position.set(0, 0.04, 0.17);
  head.add(skull);
  const cheekL = blob(0.1, 1, 0.9, 1, body, 14, 10);
  cheekL.position.set(-0.1, -0.02, 0.27);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.1;
  head.add(cheekL, cheekR);
  const eyes = [];
  for (const sd of [-1, 1]) {
    const e = blob(0.085, 0.75, 1.05, 1.0, EYE(), 18, 14);
    e.position.set(sd * 0.165, 0.09, 0.2);
    e.rotation.y = sd * 0.5;
    e.userData.noOutline = true;
    const sh = blob(0.024, 1, 1, 0.6, clay(0xffffff, { emissive: 0xffffff, ei: 0.8 }), 8, 6);
    sh.position.set(sd * 0.0, 0.035, 0.075);
    sh.userData.noOutline = true;
    e.add(sh);
    const sh2 = blob(0.011, 1, 1, 0.6, clay(0xffffff, { emissive: 0xffffff, ei: 0.8 }), 6, 4);
    sh2.position.set(sd * -0.02, -0.03, 0.078);
    sh.userData.noOutline = true;
    e.add(sh2);
    head.add(e);
    eyes.push(e);
  }
  // mandibles: curved hooks that open/close
  const mand = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(sd * 0.07, -0.06, 0.33);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(sd * 0.06, -0.01, 0.12), new THREE.Vector3(-sd * 0.04, -0.02, 0.18));
    const m = mesh(new THREE.TubeGeometry(curve, 8, 0.028, 6), dark);
    pv.add(m);
    head.add(pv);
    mand.push({ pv, side: sd });
  }
  // antennae: long scape up-forward, elbow, funiculus with a club
  const antennae = [];
  for (const sd of [-1, 1]) {
    const base = new THREE.Group();
    base.position.set(sd * 0.08, 0.13, 0.28);
    const scape = seg(0.022, 0.018, 0.36, dark, 6);
    base.add(scape);
    const elbow = new THREE.Group();
    elbow.position.x = 0.36;
    const fun = seg(0.018, 0.02, 0.34, dark, 6);
    elbow.add(fun);
    const club = blob(0.03, 1.6, 1, 1, dark, 8, 6);
    club.position.x = 0.36;
    elbow.add(club);
    base.add(elbow);
    const mir = new THREE.Group();
    mir.scale.x = sd;
    mir.add(base);
    base.position.x = 0.08;
    mir.position.set(0, 0.13, 0.28);
    base.position.set(0.08, 0, 0);
    head.add(mir);
    antennae.push({ base, elbow, side: sd });
  }
  // thread scarf (player colour) with a trailing end for follow-through
  const scarfM = clay(paint, { rough: 0.85, repeat: 8, strength: 0.8 });
  const scarf = mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 20), scarfM);
  scarf.position.set(0, 0.02, 0.3);
  scarf.rotation.x = Math.PI / 2 - 0.5;
  bodyG.add(scarf);
  const tailP = new THREE.Group();
  tailP.position.set(0.06, 0.12, 0.24);
  bodyG.add(tailP);
  const tail1 = new THREE.Group();
  tailP.add(tail1);
  const t1 = mesh(new THREE.BoxGeometry(0.07, 0.025, 0.16), scarfM);
  t1.position.z = -0.08;
  tail1.add(t1);
  const tail2 = new THREE.Group();
  tail2.position.z = -0.16;
  tail1.add(tail2);
  const t2 = mesh(new THREE.BoxGeometry(0.065, 0.022, 0.14), scarfM);
  t2.position.z = -0.07;
  tail2.add(t2);

  // legs: coxa on the mesosoma underside; femur up-out, tibia down, tarsus to the ground
  const legs = [];
  const attach = [[0.26, -0.75], [0.12, 0.05], [-0.02, 0.75]]; // z, base yaw (front reaches forward)
  attach.forEach(([z, yaw], idx) => {
    for (const sd of [-1, 1]) {
      const mir = new THREE.Group();
      mir.scale.x = sd;
      mir.position.set(0, -0.06, z);
      const hip = new THREE.Group();
      hip.position.x = 0.07;
      hip.rotation.order = 'YZX';
      const femur = seg(0.034, 0.03, 0.32, dark, 8);
      hip.add(femur);
      const knee = new THREE.Group();
      knee.position.x = 0.32;
      const tibia = seg(0.028, 0.022, 0.4, dark, 8);
      knee.add(tibia);
      const ankle = new THREE.Group();
      ankle.position.x = 0.4;
      const tars = seg(0.02, 0.016, 0.17, dark, 6);
      ankle.add(tars);
      knee.add(ankle);
      hip.add(knee);
      mir.add(hip);
      meso.add(mir);
      legs.push({ hip, knee, ankle, side: sd, idx, yaw0: yaw });
    }
  });

  root.userData = { who, seed: SEEDS[who] || 9, bodyG, meso, neck, head, gasterP, gaster, dab, legs, mand, antennae, eyes, scarf: { tail1, tail2 }, baseScale: scale, paint };
  root.scale.setScalar(scale);
  outline(root, 0.012);
  neutral(root);
  return root;
}

// ---------------------------------------------------------------- posing (call neutral() first each frame)
export function neutral(a) {
  const U = a.userData;
  const b = U.baseScale;
  a.scale.set(b, b, b);
  U.bodyG.position.set(0, 0.36, 0);
  U.bodyG.rotation.set(0, 0, 0);
  U.neck.rotation.set(0, 0, 0);
  U.head.rotation.set(0, 0, 0);
  U.gasterP.rotation.set(0.28, 0, 0);
  U.gasterP.scale.set(1, 1, 1);
  for (const L of U.legs) {
    L.hip.rotation.set(0, L.yaw0, 0.78);
    L.knee.rotation.set(0, 0, -2.15);
    L.ankle.rotation.set(0, 0, 0.75);
  }
  for (const M of U.mand) M.pv.rotation.set(0, M.side * 0.15, 0);
  for (const A of U.antennae) { A.base.rotation.set(0, -0.95, 0.75); A.elbow.rotation.set(0, -0.35, -1.35); }
  U.scarf.tail1.rotation.set(-0.5, 0, 0);
  U.scarf.tail2.rotation.set(-0.3, 0, 0);
}

// Tripod gait: front+back of one side with the middle of the other. amt 0..1.5.
export function walk(a, phase, amt = 1) {
  const U = a.userData;
  for (const L of U.legs) {
    const grp = ((L.idx === 1) === (L.side > 0)) ? 0 : Math.PI;
    const s = Math.sin(phase + grp);
    const lift = Math.max(0, Math.cos(phase + grp));
    L.hip.rotation.y = L.yaw0 + s * 0.42 * amt;
    L.hip.rotation.z = 0.78 + lift * 0.4 * amt;
    L.knee.rotation.z = -2.15 + lift * 0.25 * amt;
  }
  U.bodyG.rotation.z = Math.sin(phase * 2) * 0.03 * amt;
  U.bodyG.position.y = 0.36 + Math.abs(Math.sin(phase)) * 0.025 * amt;
  U.gasterP.rotation.y = Math.sin(phase) * 0.08 * amt;
  U.gasterP.rotation.x = 0.28 + Math.sin(phase * 2) * 0.03 * amt;
}

// Antennae: idle feel-around + springy follow-through after kicks [t0, amp].
export function antennae(a, t, kicks = [], { tap = 0.6, back = 0, perk = 0 } = {}) {
  const U = a.userData;
  const sd = U.seed;
  for (const A of U.antennae) {
    let k = 0, k2 = 0;
    for (const [t0, amp] of kicks) { k += spring(t, t0, { amp, freq: 2.6, damp: 0.18 }); k2 += spring(t, t0 + 0.05, { amp: amp * 1.3, freq: 3.2, damp: 0.15 }); }
    const n1 = nz(t * 1.3, sd * 3 + A.side) * tap;
    const n2 = nz(t * 1.7, sd * 5 + A.side * 2) * tap;
    A.base.rotation.z = 0.75 + perk * 0.35 - back * 0.4 + k * 0.6 + n1 * 0.22;
    A.base.rotation.y = -0.95 + back * 0.9 + n2 * 0.18;
    A.elbow.rotation.z = -1.35 + perk * 0.6 + back * 0.6 + k2 * 0.9 + n2 * 0.3;
    A.elbow.rotation.y = -0.35 + back * 0.4;
  }
}

// Mandibles: 0 closed, 1 wide open.
export function jaws(a, open) { for (const M of a.userData.mand) M.pv.rotation.y = M.side * (0.15 - open * 0.55); }

// Carry: head up, mandibles clamped, body leans back a touch under the load.
export function carry(a, t, strain = 0.3) {
  const U = a.userData;
  U.neck.rotation.x = -0.55 - strain * 0.1 + Math.sin(t * 15 + U.seed) * 0.03 * strain;
  U.bodyG.rotation.x = -0.08 - strain * 0.08;
  jaws(a, -0.1);
  antennae(a, t, [], { tap: 0.3, back: 0.6 });
}

// Scarf tail follow-through: vel = current speed, kick = [t0, amp] list.
export function scarf(a, t, vel = 0, kicks = []) {
  const S = a.userData.scarf;
  let k = 0;
  for (const [t0, amp] of kicks) k += spring(t, t0, { amp, freq: 2, damp: 0.2 });
  const flutter = Math.sin(t * 14 + a.userData.seed) * 0.15 * Math.min(1, vel);
  S.tail1.rotation.x = -0.5 + Math.min(0.9, vel * 0.25) * 0.8 + k + flutter;
  S.tail2.rotation.x = -0.3 + Math.min(0.9, vel * 0.25) * 0.5 + k * 1.3 + flutter * 1.5;
  S.tail1.rotation.y = Math.sin(t * 9 + a.userData.seed) * 0.15 * Math.min(1, vel);
}

export function squash(a, s) {
  const b = a.userData.baseScale;
  const sy = Math.max(0.05, 1 - s);
  const sxz = 1 / Math.sqrt(sy);
  a.scale.set(b * sxz, b * sy, b * sxz);
}

// Idle life: breathing gaster, small weight shifts, head drift, antennae feeling around.
export function alive(a, t, k = 1) {
  const U = a.userData;
  const sd = U.seed;
  const br = Math.sin(t * 2 * Math.PI * (0.4 + sd * 0.03) + sd) * k;
  U.gasterP.scale.set(1 + br * 0.03, 1 + br * 0.04, 1 + br * 0.02);
  U.head.rotation.y += nz(t * 0.5, sd + 9) * 0.3 * k;
  U.head.rotation.x += nz(t * 0.4, sd + 13) * 0.12 * k;
  U.bodyG.rotation.z += nz(t * 0.35, sd) * 0.04 * k;
  for (const L of U.legs) L.hip.rotation.y += nz(t * 0.6, sd * 7 + L.idx * 3 + L.side) * 0.06 * k;
}

const _v = new THREE.Vector3();
export function headLook(a, target, amt = 1) {
  const U = a.userData;
  a.updateWorldMatrix(true, false);
  _v.copy(target);
  a.worldToLocal(_v);
  _v.y -= 0.5;
  _v.z -= 0.5;
  const yaw = Math.atan2(_v.x, _v.z);
  const pitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
  U.head.rotation.y += THREE.MathUtils.clamp(yaw, -1.0, 1.0) * amt;
  U.neck.rotation.x += THREE.MathUtils.clamp(-pitch, -0.8, 0.6) * amt;
}
export function face(o, x, z) { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); }

// Rear up on hind legs (surprise / cheering / looking up). k 0..1.
export function rear(a, k) {
  const U = a.userData;
  U.bodyG.rotation.x = -0.75 * k;
  U.bodyG.position.y = 0.36 + 0.3 * k;
  for (const L of U.legs) {
    if (L.idx === 0) { L.hip.rotation.z = 0.78 + 0.9 * k; L.knee.rotation.z = -2.15 + 0.9 * k; }
    if (L.idx === 2) { L.hip.rotation.z = 0.78 - 0.35 * k; }
  }
}

// Panic flail (airborne).
export function flail(a, t, k = 1) {
  const U = a.userData;
  for (const L of U.legs) {
    L.hip.rotation.y = L.yaw0 + Math.sin(t * 22 + L.idx * 2 + L.side) * 0.6 * k;
    L.hip.rotation.z = 1.0 + Math.sin(t * 19 + L.idx + L.side * 2) * 0.5 * k;
    L.knee.rotation.z = -1.6 + Math.sin(t * 25 + L.idx) * 0.4 * k;
  }
  jaws(a, 0.8);
  antennae(a, t, [], { tap: 1.5, perk: 0.6 });
}

// Climbing on a vertical wall: root oriented by caller; this just sets a hugging gait.
export function climb(a, phase, amt = 1) {
  walk(a, phase, amt);
  for (const L of a.userData.legs) L.hip.rotation.z -= 0.2;
  a.userData.bodyG.position.y = 0.3;
}

// The Queen: same clay anatomy, big, with a huge belly. belly 0..1.
export function queen() {
  const q = ant('queen', { scale: 4.5 });
  // tiara
  const gold = clay(PAL.gold, { rough: 0.25, metal: 0.5, emissive: 0x6a4000, ei: 0.3 });
  const tia = new THREE.Group();
  const band = mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 24), gold);
  band.rotation.x = Math.PI / 2;
  tia.add(band);
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    const sp = mesh(new THREE.ConeGeometry(0.03, 0.1, 6), gold);
    sp.position.set(Math.sin(a) * 0.13, 0.05, Math.cos(a) * 0.13);
    tia.add(sp);
  }
  const gem = mesh(new THREE.SphereGeometry(0.035, 10, 8), clay(0xff4fa0, { rough: 0.1, emissive: 0xff2f80, ei: 0.5 }));
  gem.position.set(0, 0.05, 0.14);
  tia.add(gem);
  tia.position.set(0, 0.22, 0.12);
  tia.rotation.x = -0.25;
  q.userData.head.add(tia);
  q.userData.isQueen = true;
  return q;
}
export function belly(q, b, wob = 0) {
  const s = 1.6 + b * 1.8;
  q.userData.gasterP.scale.set(s * (1 + wob * 0.08), s * (1 - wob * 0.06), s * (1 + wob * 0.05));
}
