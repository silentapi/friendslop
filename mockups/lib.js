// Shared helpers for the OVER BUDGET mockup screenshots.
// Chunky, toy-like low-poly look: soft materials, inverted-hull outlines, pastel palette.
import * as THREE from 'three';

export { THREE };

export const W = globalThis.__W || 1600;
export const H = globalThis.__H || 900;

export const PAL = {
  sky: 0xbfe6ff,
  grass: 0x8fd16a,
  mint: 0xa8e6cf,
  salmon: 0xff8b7b,
  cream: 0xfff3d6,
  butter: 0xffe08a,
  lilac: 0xc9b6ff,
  wood: 0xc98b55,
  darkWood: 0x8a5a33,
  tile: 0xe9f4f7,
  white: 0xffffff,
  hivis: 0xd8ff3a,
  // player colours
  orange: 0xff8a3d,
  blue: 0x4f8dff,
  green: 0x3ccf7a,
  purple: 0xa65cff,
};

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...opts }));
  }
  return matCache.get(key);
}

export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function box(w, h, d, color, opts) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
}

// Rounded box via scaled capsule-ish geometry is overkill; bevel look comes from outlines.
export function cyl(rt, rb, h, color, seg = 20) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
}

export function sphere(r, color, ws = 20, hs = 14) {
  return mesh(new THREE.SphereGeometry(r, ws, hs), mat(color));
}

export function capsule(r, len, color) {
  return mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat(color));
}

function darker(hex, f = 0.72) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2a1d2e, side: THREE.BackSide });
// Inverted-hull outline for that cartoon pop.
export function addOutlines(root, thickness = 0.03) {
  const targets = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.noOutline && !o.userData.isOutline) targets.push(o);
  });
  for (const m of targets) {
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere.radius || 1;
    const o = new THREE.Mesh(m.geometry, outlineMat);
    o.userData.isOutline = true;
    const f = 1 + thickness / r;
    o.scale.setScalar(f);
    m.add(o);
  }
  return root;
}

// ---------------------------------------------------------------- characters

// A stubby construction worker: bean body, big head, noodle arms, hard hat, mustache.
export function worker({
  color = PAL.orange,
  skin = 0xf2c09b,
  stache = 'walrus',
  hat = 0xffd23f,
  stacheColor = 0x4a2c17,
} = {}) {
  const root = new THREE.Group();
  const parts = {};

  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(0.21 * s, 0.62, 0);
    const l = capsule(0.17, 0.28, darker(color, 0.8));
    l.position.y = -0.26;
    leg.add(l);
    const boot = sphere(0.21, 0x6b4423);
    boot.scale.set(1, 0.6, 1.35);
    boot.position.set(0, -0.54, 0.07);
    leg.add(boot);
    root.add(leg);
    parts[s < 0 ? 'legL' : 'legR'] = leg;
  }

  const torso = new THREE.Group();
  torso.position.y = 1.08;
  torso.scale.set(1, 1, 0.86);
  const body = capsule(0.5, 0.42, color);
  torso.add(body);
  const vest = mesh(
    new THREE.CylinderGeometry(0.515, 0.53, 0.5, 28, 1, true),
    mat(PAL.hivis, { side: THREE.DoubleSide }),
  );
  vest.position.y = 0.08;
  vest.userData.noOutline = true;
  torso.add(vest);
  for (const y of [-0.04, 0.2]) {
    const stripe = mesh(new THREE.CylinderGeometry(0.535, 0.535, 0.06, 28, 1, true), mat(0xdfe3ea, { metalness: 0.4, roughness: 0.4 }));
    stripe.position.y = y;
    stripe.userData.noOutline = true;
    torso.add(stripe);
  }
  root.add(torso);
  parts.torso = torso;

  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0.55 * s, 1.42, 0);
    const a = capsule(0.13, 0.42, color);
    a.position.y = -0.3;
    arm.add(a);
    const hand = sphere(0.16, skin);
    hand.position.y = -0.62;
    arm.add(hand);
    arm.rotation.z = 0.25 * s;
    root.add(arm);
    parts[s < 0 ? 'armL' : 'armR'] = arm;
    arm.userData.hand = hand;
  }

  const head = new THREE.Group();
  head.position.y = 2.02;
  const skull = sphere(0.56, skin, 28, 20);
  head.add(skull);
  for (const s of [-1, 1]) {
    const eye = sphere(0.075, 0x1b1420, 12, 10);
    eye.position.set(0.19 * s, 0.08, 0.5);
    eye.scale.set(1, 1.3, 0.6);
    eye.userData.noOutline = true;
    head.add(eye);
    const shine = sphere(0.025, 0xffffff, 8, 6);
    shine.position.set(0.19 * s + 0.02, 0.12, 0.54);
    shine.userData.noOutline = true;
    head.add(shine);
  }
  const nose = sphere(0.12, darker(skin, 0.9));
  nose.position.set(0, -0.04, 0.55);
  nose.userData.noOutline = true;
  head.add(nose);

  const sc = stacheColor;
  if (stache === 'walrus') {
    const m = capsule(0.09, 0.34, sc);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, -0.17, 0.52);
    m.scale.set(1.2, 1, 0.8);
    head.add(m);
  } else if (stache === 'handlebar') {
    for (const s of [-1, 1]) {
      const m = capsule(0.055, 0.22, sc);
      m.rotation.z = Math.PI / 2 - 0.5 * s;
      m.position.set(0.13 * s, -0.13, 0.52);
      head.add(m);
    }
  } else if (stache === 'pencil') {
    const m = capsule(0.03, 0.26, sc);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, -0.15, 0.54);
    head.add(m);
  } else if (stache === 'beard') {
    const b = sphere(0.36, sc);
    b.scale.set(1.1, 0.75, 0.6);
    b.position.set(0, -0.32, 0.3);
    head.add(b);
  }

  if (hat !== null) {
    const dome = mesh(new THREE.SphereGeometry(0.6, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(hat, { roughness: 0.45 }));
    dome.position.y = 0.16;
    head.add(dome);
    const ridge = box(0.12, 0.08, 0.95, darker(hat, 0.85));
    ridge.position.set(0, 0.74, 0);
    ridge.userData.noOutline = true;
    head.add(ridge);
    const brim = cyl(0.7, 0.7, 0.06, hat, 28);
    brim.position.set(0, 0.17, 0.08);
    brim.scale.set(1, 1, 1.05);
    head.add(brim);
  }
  root.add(head);
  parts.head = head;

  root.userData.parts = parts;
  return root;
}

// Arm pose helper: forward (x) and outward (z) in radians.
export function poseArm(w, side, forward = 0, outward = 0.25) {
  const arm = w.userData.parts[side === 'L' ? 'armL' : 'armR'];
  const s = side === 'L' ? -1 : 1;
  arm.rotation.x = -forward;
  arm.rotation.z = outward * s;
}

export function poseLeg(w, side, forward = 0) {
  const leg = w.userData.parts[side === 'L' ? 'legL' : 'legR'];
  leg.rotation.x = -forward;
}

// Grandma client: cone dress, hair bun, round glasses, handbag.
export function grandma() {
  const root = new THREE.Group();
  const parts = {};
  const skin = 0xf5cfb3;
  const dress = mesh(new THREE.ConeGeometry(0.75, 1.5, 28), mat(0xb07cd8));
  dress.position.y = 0.95;
  root.add(dress);
  const collar = cyl(0.3, 0.42, 0.2, 0xffffff);
  collar.position.y = 1.6;
  root.add(collar);
  for (const s of [-1, 1]) {
    const shoe = sphere(0.18, 0x3b2a40);
    shoe.scale.set(1, 0.6, 1.4);
    shoe.position.set(0.22 * s, 0.1, 0.1);
    root.add(shoe);
    const arm = new THREE.Group();
    arm.position.set(0.38 * s, 1.55, 0);
    const a = capsule(0.11, 0.42, 0xb07cd8);
    a.position.y = -0.28;
    arm.add(a);
    const hand = sphere(0.13, skin);
    hand.position.y = -0.58;
    arm.add(hand);
    arm.rotation.z = 0.3 * s;
    root.add(arm);
    parts[s < 0 ? 'armL' : 'armR'] = arm;
  }
  const head = new THREE.Group();
  head.position.y = 2.15;
  head.add(sphere(0.6, skin, 28, 20));
  const hair = sphere(0.63, 0xd9d9e3, 28, 20);
  hair.scale.set(1, 0.75, 1);
  hair.position.set(0, 0.2, -0.08);
  head.add(hair);
  const bun = sphere(0.28, 0xd9d9e3);
  bun.position.set(0, 0.68, -0.2);
  head.add(bun);
  for (const s of [-1, 1]) {
    const eye = sphere(0.06, 0x1b1420, 10, 8);
    eye.position.set(0.2 * s, 0.03, 0.55);
    eye.userData.noOutline = true;
    head.add(eye);
    const glass = mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 20), mat(0xc9a227, { metalness: 0.6, roughness: 0.3 }));
    glass.position.set(0.2 * s, 0.03, 0.57);
    glass.userData.noOutline = true;
    head.add(glass);
  }
  const nose = sphere(0.1, 0xe8b496);
  nose.position.set(0, -0.1, 0.6);
  nose.userData.noOutline = true;
  head.add(nose);
  const cheekL = sphere(0.09, 0xff9fa8);
  cheekL.position.set(-0.32, -0.12, 0.46);
  cheekL.userData.noOutline = true;
  head.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.32;
  head.add(cheekR);
  root.add(head);
  parts.head = head;

  // handbag
  const bag = box(0.45, 0.35, 0.18, 0xff6f91);
  bag.position.set(-0.6, 0.95, 0.15);
  root.add(bag);
  const strap = mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16, Math.PI), mat(0xff6f91));
  strap.position.set(-0.6, 1.12, 0.15);
  root.add(strap);

  root.userData.parts = parts;
  return root;
}

// Bystander for outdoor shots (party guests etc.)
export function guest(color = 0x59c3c3, skin = 0xd9a07a) {
  return worker({ color, skin, stache: 'none', hat: null });
}

// ---------------------------------------------------------------- props

export function textTexture(text, {
  w = 512, h = 128, bg = 'rgba(0,0,0,0)', fg = '#222', font = '900 72px Inter', align = 'center', stroke = null,
} = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.font = font;
  g.textAlign = align;
  g.textBaseline = 'middle';
  const lines = text.split('\n');
  const lh = h / lines.length;
  lines.forEach((ln, i) => {
    const x = align === 'center' ? w / 2 : 20;
    const y = lh * i + lh / 2;
    if (stroke) {
      g.lineWidth = 10;
      g.strokeStyle = stroke;
      g.strokeText(ln, x, y);
    }
    g.fillStyle = fg;
    g.fillText(ln, x, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function textPlane(text, width, height, opts) {
  const t = textTexture(text, opts);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: t, transparent: true }),
  );
  m.userData.noOutline = true;
  return m;
}

export function toilet() {
  const g = new THREE.Group();
  const bowl = cyl(0.42, 0.3, 0.55, 0xffffff);
  bowl.position.y = 0.28;
  bowl.scale.z = 1.25;
  g.add(bowl);
  const seat = mesh(new THREE.TorusGeometry(0.36, 0.07, 10, 24), mat(0xffffff));
  seat.rotation.x = Math.PI / 2;
  seat.position.y = 0.58;
  seat.scale.y = 1.25;
  g.add(seat);
  const tank = box(0.8, 0.75, 0.3, 0xffffff);
  tank.position.set(0, 0.85, -0.5);
  g.add(tank);
  const lid = box(0.86, 0.08, 0.36, 0xf0f0f0);
  lid.position.set(0, 1.25, -0.5);
  g.add(lid);
  return g;
}

export function bathtub() {
  const g = new THREE.Group();
  const outer = box(1.6, 0.8, 3.2, 0xffffff);
  outer.position.y = 0.4;
  g.add(outer);
  const water = box(1.3, 0.05, 2.9, 0x8fd8ff, { roughness: 0.2 });
  water.position.y = 0.72;
  water.userData.noOutline = true;
  g.add(water);
  for (const [x, z] of [[-0.65, -1.4], [0.65, -1.4], [-0.65, 1.4], [0.65, 1.4]]) {
    const foot = sphere(0.12, 0xc9a227);
    foot.position.set(x, 0.02, z);
    g.add(foot);
  }
  return g;
}

export function rug(w, d, color = 0xff6f91, stripe = 0xffe08a) {
  const g = new THREE.Group();
  const r = box(w, 0.04, d, color);
  r.position.y = 0.02;
  g.add(r);
  const s = box(w * 0.8, 0.045, d * 0.15, stripe);
  s.position.y = 0.025;
  s.userData.noOutline = true;
  g.add(s);
  const s2 = s.clone();
  s2.position.z = d * 0.3;
  g.add(s2);
  const s3 = s.clone();
  s3.position.z = -d * 0.3;
  g.add(s3);
  return g;
}

export function ladder(h = 3.2) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const rail = box(0.1, h, 0.1, 0xff5a3c);
    rail.position.set(0.35 * s, h / 2, 0);
    g.add(rail);
  }
  for (let y = 0.4; y < h; y += 0.5) {
    const rung = box(0.7, 0.07, 0.08, 0xd9d9d9);
    rung.position.set(0, y, 0);
    rung.userData.noOutline = true;
    g.add(rung);
  }
  return g;
}

export function bucket(color = 0x4f8dff, paint = 0xfff3d6) {
  const g = new THREE.Group();
  const b = cyl(0.32, 0.26, 0.6, color);
  b.position.y = 0.3;
  g.add(b);
  const p = cyl(0.3, 0.3, 0.02, paint);
  p.position.y = 0.58;
  p.userData.noOutline = true;
  g.add(p);
  return g;
}

export function paintRoller(color = 0xfff3d6) {
  const g = new THREE.Group();
  const handle = capsule(0.04, 0.9, 0xff5a3c);
  handle.position.y = 0.45;
  g.add(handle);
  const arm = box(0.04, 0.04, 0.3, 0x999999);
  arm.position.set(0, 0.95, 0.15);
  g.add(arm);
  const roll = cyl(0.11, 0.11, 0.55, color);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 1.0, 0.3);
  g.add(roll);
  return g;
}

export function gnome() {
  const g = new THREE.Group();
  const body = cyl(0.18, 0.25, 0.4, 0x3c8dff);
  body.position.y = 0.2;
  g.add(body);
  const face = sphere(0.15, 0xf5cfb3);
  face.position.y = 0.48;
  g.add(face);
  const beard = mesh(new THREE.ConeGeometry(0.16, 0.3, 14), mat(0xffffff));
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.36, 0.1);
  g.add(beard);
  const hat = mesh(new THREE.ConeGeometry(0.17, 0.45, 14), mat(0xff3c3c));
  hat.position.y = 0.75;
  g.add(hat);
  return g;
}

export function raccoon() {
  const g = new THREE.Group();
  const head = sphere(0.3, 0x8d8d99);
  head.scale.set(1.2, 1, 1);
  g.add(head);
  const mask = sphere(0.31, 0x2a2a33);
  mask.scale.set(1.25, 0.35, 1);
  mask.position.set(0, 0.03, 0.02);
  mask.userData.noOutline = true;
  g.add(mask);
  for (const s of [-1, 1]) {
    const eye = sphere(0.06, 0xffffff, 10, 8);
    eye.position.set(0.13 * s, 0.05, 0.27);
    eye.userData.noOutline = true;
    g.add(eye);
    const pupil = sphere(0.03, 0x000000, 8, 6);
    pupil.position.set(0.13 * s, 0.05, 0.32);
    pupil.userData.noOutline = true;
    g.add(pupil);
    const ear = mesh(new THREE.ConeGeometry(0.1, 0.18, 8), mat(0x6d6d79));
    ear.position.set(0.2 * s, 0.3, 0);
    g.add(ear);
  }
  const snout = sphere(0.1, 0xe6e6ee);
  snout.position.set(0, -0.08, 0.3);
  g.add(snout);
  return g;
}

export function moldBlob() {
  const g = new THREE.Group();
  for (const [x, y, r] of [[0, 0, 0.45], [0.4, 0.2, 0.3], [-0.35, 0.25, 0.28], [0.1, -0.35, 0.25]]) {
    const b = sphere(r, 0x7fae3a);
    b.scale.z = 0.25;
    b.position.set(x, y, 0);
    b.userData.noOutline = true;
    g.add(b);
  }
  for (const s of [-1, 1]) {
    const eye = sphere(0.08, 0xffffff, 10, 8);
    eye.position.set(0.14 * s, 0.05, 0.1);
    eye.userData.noOutline = true;
    g.add(eye);
    const p = sphere(0.04, 0x000000, 8, 6);
    p.position.set(0.14 * s, 0.03, 0.16);
    p.userData.noOutline = true;
    g.add(p);
  }
  return g;
}

export function van(label) {
  const g = new THREE.Group();
  const body = box(6.2, 2.6, 2.6, 0xffffff);
  body.position.set(-0.4, 1.75, 0);
  g.add(body);
  const cab = box(1.6, 1.9, 2.5, 0xffffff);
  cab.position.set(3.4, 1.4, 0);
  g.add(cab);
  const windshield = box(0.05, 0.9, 2.2, 0x9fd6ff, { roughness: 0.15 });
  windshield.position.set(4.22, 1.8, 0);
  windshield.userData.noOutline = true;
  g.add(windshield);
  const stripe = box(7.8, 0.25, 2.62, 0xff8a3d);
  stripe.position.set(0.4, 0.75, 0);
  stripe.userData.noOutline = true;
  g.add(stripe);
  for (const x of [-2.4, 2.9]) {
    for (const z of [-1.25, 1.25]) {
      const wheel = cyl(0.55, 0.55, 0.35, 0x2b2b2b);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.55, z);
      g.add(wheel);
      const hub = cyl(0.25, 0.25, 0.37, 0xcccccc);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.55, z);
      hub.userData.noOutline = true;
      g.add(hub);
    }
  }
  const ladderTop = ladder(5);
  ladderTop.rotation.z = Math.PI / 2;
  ladderTop.position.set(2, 3.15, 0.4);
  ladderTop.scale.setScalar(0.8);
  g.add(ladderTop);
  const sign = textPlane(label, 5.8, 1.9, {
    w: 1024, h: 340, fg: '#ff6a1f', font: '900 92px "Lilita One", Inter', stroke: '#ffffff',
  });
  sign.position.set(-0.4, 1.9, 1.31);
  g.add(sign);
  return g;
}

export function house(wall = PAL.mint, roof = 0xff8b7b) {
  const g = new THREE.Group();
  const body = box(8, 4.4, 6, wall);
  body.position.y = 2.2;
  g.add(body);
  const roofGeo = new THREE.CylinderGeometry(0.01, 5.1, 2.6, 4, 1);
  const r = mesh(roofGeo, mat(roof));
  r.rotation.y = Math.PI / 4;
  r.scale.set(1.15, 1, 0.85);
  r.position.y = 5.7;
  g.add(r);
  const door = box(1.2, 2.2, 0.1, 0xff6f91);
  door.position.set(0, 1.1, 3.02);
  g.add(door);
  for (const x of [-2.6, 2.6]) {
    const win = box(1.5, 1.3, 0.08, 0x9fd6ff, { roughness: 0.15 });
    win.position.set(x, 2.6, 3.02);
    g.add(win);
    const sill = box(1.7, 0.15, 0.25, 0xffffff);
    sill.position.set(x, 1.9, 3.08);
    g.add(sill);
  }
  return g;
}

export function tree(scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.2, 0.28, 1.6, 0x8a5a33);
  trunk.position.y = 0.8;
  g.add(trunk);
  for (const [x, y, z, r] of [[0, 2.1, 0, 1.1], [0.6, 1.8, 0.2, 0.7], [-0.5, 1.9, -0.2, 0.75]]) {
    const leaf = sphere(r, 0x5fbf4a, 16, 12);
    leaf.position.set(x, y, z);
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

export function fence(len = 10) {
  const g = new THREE.Group();
  for (let x = -len / 2; x <= len / 2; x += 0.6) {
    const p = box(0.18, 1.1, 0.08, 0xffffff);
    p.position.set(x, 0.55, 0);
    p.userData.noOutline = true;
    g.add(p);
  }
  const rail = box(len, 0.12, 0.06, 0xffffff);
  rail.position.y = 0.75;
  rail.userData.noOutline = true;
  g.add(rail);
  return g;
}

// Flat sector on the floor showing an NPC's line of sight.
export function viewCone(radius = 6, angle = Math.PI / 3, color = 0xffd23f) {
  const geo = new THREE.CircleGeometry(radius, 32, -angle / 2, angle);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  // CircleGeometry sector points along +X; rotate so it points +Z.
  m.rotation.z = Math.PI / 2;
  m.userData.noOutline = true;
  const g = new THREE.Group();
  g.add(m);
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.08, radius, 32, 1, -angle / 2, angle),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  edge.rotation.copy(m.rotation);
  edge.position.y = 0.01;
  g.add(edge);
  g.position.y = 0.06;
  return g;
}

// ---------------------------------------------------------------- scene + render

export function setupScene({ bg = PAL.sky, fog = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(bg, 40, 90);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8a58a, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.position.set(12, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 200);
  return { renderer, scene, camera, sun };
}

// Pin HTML labels to 3D points after rendering.
export function pin(camera, obj, html, { dy = 0, cls = 'tag' } = {}) {
  const v = new THREE.Vector3();
  if (obj.isVector3) v.copy(obj);
  else obj.getWorldPosition(v);
  v.y += dy;
  v.project(camera);
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  el.style.left = ((v.x + 1) / 2) * W + 'px';
  el.style.top = ((1 - v.y) / 2) * H + 'px';
  document.getElementById('pins').appendChild(el);
  return el;
}

export function finish(renderer, scene, camera, afterRender) {
  renderer.render(scene, camera);
  if (afterRender) afterRender();
  window.__ready = true;
}
