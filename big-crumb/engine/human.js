// Giant clay human ("the Mom"): built in metres, then scaled into ant units (1 m = 320 units).
// Everyday homeowner: cardigan, tee, sweatpants, fuzzy slippers, hair in a bun. Comedic faces.
import { THREE, PAL, mesh, clay, outline } from './render.js';

export const M2U = 320; // metres → world units (ant ≈ 5 mm long ≈ 1.6 units)

const skin = () => clay(0xf6c8a8, { rough: 0.6, repeat: 6, strength: 0.6, sheen: 0.2 });
const knit = () => clay(0xf0a0b0, { rough: 0.95, repeat: 14, strength: 1.4, sheen: 0.5 });
const tee = () => clay(0xfff6ec, { rough: 0.9, repeat: 10, strength: 1.0 });
const pants = () => clay(0x9a9ab8, { rough: 0.95, repeat: 10, strength: 1.4, sheen: 0.4 });
const fuzz = () => clay(PAL.slipper, { rough: 1, repeat: 20, strength: 2.0, sheen: 1 });
const hairM = () => clay(PAL.hair, { rough: 0.7, repeat: 12, strength: 1.6, sheen: 0.4 });

function limb(r0, r1, len, m) { // hangs down from pivot (−Y)
  const g = new THREE.CylinderGeometry(r1, r0, len, 16, 4);
  g.translate(0, -len / 2, 0);
  const l = mesh(g, m);
  const j = mesh(new THREE.SphereGeometry(r0, 16, 12), m);
  l.add(j);
  return l;
}
function blob(r, sx, sy, sz, m, ws = 24, hs = 18) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  return mesh(g, m);
}

export function mom({ prop = 'mug' } = {}) {
  const root = new THREE.Group();
  const P = {};
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);
  P.hips = hips;
  const seat = blob(0.2, 1.05, 0.62, 0.8, pants());
  seat.position.y = 0.0;
  hips.add(seat);
  // legs
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sd * 0.095, 0, 0);
    hips.add(hip);
    const thigh = limb(0.11, 0.085, 0.44, pants());
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = limb(0.085, 0.072, 0.4, pants());
    knee.add(shin);
    const cuff = mesh(new THREE.TorusGeometry(0.066, 0.022, 8, 18), pants());
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.39;
    knee.add(cuff);
    const ankle = new THREE.Group();
    ankle.position.y = -0.42;
    knee.add(ankle);
    const slip = blob(0.07, 0.75, 0.55, 1.75, fuzz());
    slip.position.set(0, -0.03, 0.06);
    ankle.add(slip);
    const sole = blob(0.07, 0.8, 0.18, 1.85, clay(0xe8b0b8, { rough: 0.8, repeat: 6 }));
    sole.position.set(0, -0.065, 0.06);
    ankle.add(sole);
    const pom = blob(0.045, 1, 0.9, 1, fuzz());
    pom.position.set(0, 0.01, 0.15);
    ankle.add(pom);
    P[sd < 0 ? 'legL' : 'legR'] = { hip, knee, ankle };
  }
  // torso (lathe) + cardigan
  const torso = new THREE.Group();
  torso.position.y = 0.02;
  hips.add(torso);
  P.torso = torso;
  const prof = [[0.0, -0.04], [0.17, -0.02], [0.175, 0.08], [0.15, 0.2], [0.165, 0.33], [0.17, 0.42], [0.15, 0.5], [0.07, 0.54], [0.0, 0.55]].map(([x, y]) => new THREE.Vector2(x, y));
  const tg = new THREE.LatheGeometry(prof, 28);
  tg.scale(1.15, 1, 0.78);
  torso.add(mesh(tg, tee()));
  // cardigan: two open front panels + back (slightly larger shell, open in front)
  const cg = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x * 1.07 + 0.006, v.y)), 28, Math.PI * 0.17, Math.PI * 1.66);
  cg.scale(1.15, 1, 0.78);
  const card = mesh(cg, knit());
  torso.add(card);
  for (let i = 0; i < 4; i++) {
    const b = blob(0.012, 1, 1, 0.5, clay(0xfff0d0, { rough: 0.3 }), 8, 6);
    b.position.set(0.07, 0.12 + i * 0.09, 0.135);
    torso.add(b);
  }
  // arms
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sd * 0.2, 0.47, 0);
    torso.add(sh);
    const up = limb(0.058, 0.05, 0.28, knit());
    sh.add(up);
    const el = new THREE.Group();
    el.position.y = -0.28;
    sh.add(el);
    const fo = limb(0.05, 0.045, 0.25, knit());
    el.add(fo);
    const wr = new THREE.Group();
    wr.position.y = -0.26;
    el.add(wr);
    const hand = blob(0.045, 0.9, 1.3, 0.55, skin());
    hand.position.y = -0.05;
    wr.add(hand);
    const thumb = blob(0.017, 1, 2.2, 1, skin(), 10, 8);
    thumb.position.set(-sd * 0.03, -0.035, 0.02);
    thumb.rotation.z = sd * 0.5;
    wr.add(thumb);
    P[sd < 0 ? 'armL' : 'armR'] = { sh, el, wr };
  }
  // neck + head
  const neck = new THREE.Group();
  neck.position.y = 0.55;
  torso.add(neck);
  P.neck = neck;
  const nk = limb(0.05, 0.05, 0.1, skin());
  nk.position.y = 0.1;
  neck.add(nk);
  const head = new THREE.Group();
  head.position.y = 0.13;
  head.scale.setScalar(1.3); // chunky, friendly proportions
  neck.add(head);
  P.head = head;
  const skull = blob(0.11, 0.92, 1.12, 1.0, skin(), 32, 24);
  skull.position.y = 0.06;
  head.add(skull);
  const jaw = blob(0.085, 0.95, 0.75, 0.95, skin());
  jaw.position.set(0, -0.015, 0.02);
  head.add(jaw);
  for (const sd of [-1, 1]) {
    const ear = blob(0.022, 0.5, 1, 0.8, skin(), 10, 8);
    ear.position.set(sd * 0.1, 0.05, -0.005);
    head.add(ear);
  }
  const nose = blob(0.02, 0.9, 1, 1.1, skin(), 12, 10);
  nose.position.set(0, 0.045, 0.108);
  head.add(nose);
  const eyes = [];
  for (const sd of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(sd * 0.04, 0.085, 0.088);
    const wh = blob(0.026, 1.1, 1, 0.6, clay(0xffffff, { rough: 0.2 }), 14, 10);
    const ir = blob(0.015, 1, 1, 0.5, clay(0x4a6a3a, { rough: 0.2 }), 10, 8);
    ir.position.z = 0.014;
    const pu = blob(0.006, 1, 1, 0.5, clay(0x101010, { rough: 0.1 }), 8, 6);
    pu.position.z = 0.02;
    ir.userData.noOutline = pu.userData.noOutline = true;
    const lid = blob(0.028, 1.15, 1, 0.75, skin(), 14, 10);
    lid.position.z = -0.002;
    eg.add(wh, ir, pu, lid);
    head.add(eg);
    const brow = blob(0.01, 3.2, 0.9, 1, hairM(), 10, 6);
    brow.position.set(sd * 0.042, 0.12, 0.1);
    head.add(brow);
    eyes.push({ eg, wh, ir, pu, lid, brow, sd });
  }
  P.eyes = eyes;
  const mouthG = new THREE.Group();
  mouthG.position.set(0, -0.005, 0.096);
  head.add(mouthG);
  const mouth = blob(0.03, 1.2, 0.3, 0.5, clay(0x6a2030, { rough: 0.5 }), 16, 10);
  mouthG.add(mouth);
  const teeth = blob(0.025, 1.2, 0.25, 0.4, clay(0xffffff, { rough: 0.3 }), 12, 8);
  teeth.position.set(0, 0.012, 0.004);
  mouthG.add(teeth);
  const lips = mesh(new THREE.TorusGeometry(0.031, 0.007, 8, 20), clay(0xd8707a, { rough: 0.5 }));
  lips.scale.set(1.15, 0.45, 1);
  lips.visible = false;
  mouthG.add(lips);
  const tongue = blob(0.016, 1.2, 0.4, 0.5, clay(0xff7a8a, { rough: 0.5 }), 12, 8);
  tongue.position.set(0, -0.006, 0.006);
  mouthG.add(tongue);
  P.tongue = tongue;
  P.mouth = { g: mouthG, mouth, teeth, lips };
  for (const sd of [-1, 1]) {
    const bl = blob(0.022, 1, 0.7, 0.3, clay(0xf09a9a, { rough: 0.8, transparent: true, opacity: 0.6 }), 10, 8);
    bl.position.set(sd * 0.065, 0.02, 0.085);
    bl.userData.noOutline = true;
    head.add(bl);
  }
  // hair: cap + bun + loose strands + scrunchie
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM());
  cap.scale.set(0.98, 1.1, 1.05);
  cap.position.set(0, 0.07, -0.01);
  cap.rotation.x = -0.35;
  cap.castShadow = true;
  head.add(cap);
  const bun = blob(0.06, 1, 0.9, 1, hairM());
  bun.position.set(0, 0.2, -0.05);
  head.add(bun);
  const scr = mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 18), clay(0xffc93c, { rough: 0.7, repeat: 10, strength: 1.5 }));
  scr.position.set(0, 0.17, -0.04);
  scr.rotation.x = Math.PI / 2 - 0.3;
  head.add(scr);
  // prop in right hand
  if (prop === 'mug') {
    const mug = new THREE.Group();
    const cup = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 20, 1, false), clay(0x5aa0d8, { rough: 0.3, repeat: 4 }));
    mug.add(cup);
    const coffee = mesh(new THREE.CircleGeometry(0.042, 20), clay(0x4a2a18, { rough: 0.2 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.04;
    mug.add(coffee);
    const handle = mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 14), clay(0x5aa0d8, { rough: 0.3 }));
    handle.position.x = 0.05;
    mug.add(handle);
    mug.position.set(0, -0.08, 0.04);
    P.armR.wr.add(mug);
    P.prop = mug;
  } else if (prop === 'magazine') {
    const mag = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 16), clay(0xff6a3a, { rough: 0.5, repeat: 8 }));
    mag.rotation.x = Math.PI / 2;
    mag.position.set(0, -0.07, 0.1);
    P.armR.wr.add(mag);
    P.prop = mag;
  }
  root.userData = P;
  root.scale.setScalar(M2U);
  momNeutral(root);
  return root;
}

// ---------------------------------------------------------------- poses / faces
export function momNeutral(m) {
  const P = m.userData;
  P.hips.position.set(0, 0.9, 0);
  P.hips.rotation.set(0, 0, 0);
  P.torso.rotation.set(0, 0, 0);
  P.neck.rotation.set(0, 0, 0);
  P.head.rotation.set(0, 0, 0);
  for (const k of ['legL', 'legR']) { P[k].hip.rotation.set(0, 0, 0); P[k].knee.rotation.set(0, 0, 0); P[k].ankle.rotation.set(0, 0, 0); }
  P.armL.sh.rotation.set(0.05, 0, -0.12); P.armL.el.rotation.set(-0.25, 0, 0); P.armL.wr.rotation.set(0, 0, 0);
  P.armR.sh.rotation.set(-0.15, 0, 0.12); P.armR.el.rotation.set(-1.3, 0, 0); P.armR.wr.rotation.set(0, 0, 0);
  momFace(m, 'calm');
}

// face: calm | hum | alarmed | scream | disgust ; k blends intensity
export function momFace(m, kind, k = 1) {
  const P = m.userData;
  const F = { calm: [0.25, 0, 0.1, 0], hum: [0.55, 0.05, 0.05, 0], alarmed: [-0.1, 0.5, 0.7, 0.15], scream: [-0.2, 1.0, 1.0, 0.1], disgust: [0.5, 0.2, -0.3, 0.3] }[kind];
  const [lid, open, brow, side] = F.map((v) => v * k);
  for (const e of P.eyes) {
    e.lid.position.y = 0.012 - (1 - Math.max(0, lid)) * 0.03 + 0.02;
    e.lid.visible = lid > -0.05;
    e.eg.scale.setScalar(1 + Math.max(0, -lid) * 0.6 + Math.max(0, brow) * 0.15);
    e.brow.position.y = 0.12 + brow * 0.025;
    e.brow.rotation.z = e.sd * (brow * 0.35 - (kind === 'disgust' ? 0.3 : 0));
  }
  P.mouth.mouth.scale.set(1.2 * (1 + open * 0.25 - side * 0.3), 0.3 * (1 + open * 4.2), 0.5);
  P.mouth.lips.scale.set(1.15 * (1 + open * 0.2 - side * 0.3), 0.45 * (1 + open * 2.6), 1);
  P.mouth.teeth.scale.set(1.2, 0.25, 0.4);
  P.mouth.teeth.position.y = 0.012 + open * 0.02;
  if (P.tongue) { P.tongue.visible = open > 0.3; P.tongue.position.y = -0.004 - open * 0.012; }
  P.mouth.g.position.x = side * 0.012;
  P.mouth.teeth.visible = open > 0.3;
}

export function momWalk(m, phase, amt = 1) {
  const P = m.userData;
  const s = Math.sin(phase);
  P.legL.hip.rotation.x = s * 0.45 * amt;
  P.legR.hip.rotation.x = -s * 0.45 * amt;
  P.legL.knee.rotation.x = Math.max(0, -s) * 0.7 * amt;
  P.legR.knee.rotation.x = Math.max(0, s) * 0.7 * amt;
  P.armL.sh.rotation.x = -s * 0.3 * amt;
  P.hips.position.y = 0.9 + Math.abs(Math.cos(phase)) * 0.02 * amt;
  P.hips.rotation.y = s * 0.06 * amt;
  P.torso.rotation.y = -s * 0.08 * amt;
}

// Recoil: lean back, hands up by the face, one knee up. k 0..1
export function momRecoil(m, k) {
  const P = m.userData;
  P.torso.rotation.x = -0.25 * k;
  P.neck.rotation.x = 0.15 * k;
  P.armL.sh.rotation.set(-2.2 * k, 0, -0.4 * k); P.armL.el.rotation.set(-1.6 * k, 0, 0);
  P.armR.sh.rotation.set(-0.15 - 1.9 * k, 0, 0.12 + 0.4 * k); P.armR.el.rotation.set(-1.3 - 0.4 * k, 0, 0);
  P.legL.hip.rotation.x = -1.0 * k;
  P.legL.knee.rotation.x = 1.4 * k;
  P.hips.position.y = 0.9 + 0.04 * k;
}

// Stomp: lift right leg (k up 0..1), then slam (slam 0..1 brings it down hard)
export function momStomp(m, up, slam = 0) {
  const P = m.userData;
  const lift = up * (1 - slam);
  P.legR.hip.rotation.x = -1.1 * lift;
  P.legR.knee.rotation.x = 1.5 * lift;
  P.legR.ankle.rotation.x = 0.3 * lift;
  P.torso.rotation.x = 0.12 * up;
  P.armL.sh.rotation.set(-0.6 * up, 0, -0.8 * up);
  P.armR.sh.rotation.set(-0.15 - 0.5 * up, 0, 0.12 + 0.8 * up);
}

// Swat: magazine raised overhead (up) then slammed down (hit).
export function momSwat(m, up, hit = 0) {
  const P = m.userData;
  const a = up * (1 - hit);
  P.armR.sh.rotation.set(-0.15 - 2.6 * a - 0.9 * hit, 0, 0.12 + 0.2 * a);
  P.armR.el.rotation.set(-1.3 * (1 - hit) - 0.6 * a, 0, 0);
  P.torso.rotation.x = 0.35 * hit - 0.1 * a;
  P.torso.rotation.y = -0.2 * a + 0.1 * hit;
}
