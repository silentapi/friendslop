// "Same moment, four perspectives": first-person mockups for the explorable job-site version.
// Story beat (4:46 PM, client due 5:00):
//   KEV  upstairs bathroom, installing the toilet. Hears sawing below.
//   GUS  basement, alone (he thinks), sawing the post under Kev's bathroom.
//   MO   at the basement door, sees Gus, raises his phone to snap evidence.
//   YOU  outside at the van with drywall. Grandma's car pulls in EARLY.
import {
  THREE, PAL, W, H, mat, mesh, box, cyl, sphere, capsule, addOutlines, worker, poseArm, poseLeg, grandma,
  textPlane, toilet, bathtub, rug, ladder, bucket, gnome, raccoon, van, house, tree, fence, viewCone,
  setupScene, pin, finish,
} from './lib.js';

const hud = (html) => { document.getElementById('hud').innerHTML = html; };
const C = { kev: PAL.blue, gus: PAL.purple, mo: PAL.green, you: PAL.orange };
const SKIN = { kev: 0xe0a77d, gus: 0xf2c09b, mo: 0x9c6b4a, you: 0xf2c09b };

function face(obj, x, z) {
  obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
}

// Axis-aligned wall from a=[x,z] to b=[x,z] with door/window openings.
// openings: { at (m from start), w, top, sill }
function wall(a, b, { y = 0, h = 3.2, t = 0.2, color = 0xffffff, openings = [] } = {}) {
  const g = new THREE.Group();
  const alongX = a[1] === b[1];
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const start = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const fixed = alongX ? a[1] : a[0];
  const seg = (s, e, y0, y1) => {
    const L = e - s;
    const Hh = y1 - y0;
    if (L <= 0.01 || Hh <= 0.01) return;
    const m = box(alongX ? L : t, Hh, alongX ? t : L, color);
    const c = start + (s + e) / 2;
    m.position.set(alongX ? c : fixed, y + (y0 + y1) / 2, alongX ? fixed : c);
    m.userData.noOutline = true;
    g.add(m);
  };
  let cur = 0;
  for (const o of [...openings].sort((p, q) => p.at - q.at)) {
    const s = o.at - o.w / 2;
    const e = o.at + o.w / 2;
    seg(cur, s, 0, h);
    seg(s, e, o.top ?? 2.4, h);
    if (o.sill) seg(s, e, 0, o.sill);
    cur = e;
  }
  seg(cur, len, 0, h);
  return g;
}

function slab(x1, z1, x2, z2, y, color, th = 0.2) {
  const m = box(Math.abs(x2 - x1), th, Math.abs(z2 - z1), color);
  m.position.set((x1 + x2) / 2, y - th / 2, (z1 + z2) / 2);
  m.userData.noOutline = true;
  return m;
}

function tileFloor(x1, z1, x2, z2, y, a = 0xffffff, b = 0x9fd6e8, size = 0.6) {
  const g = new THREE.Group();
  let i = 0;
  for (let x = x1; x < x2 - 0.01; x += size) {
    let j = 0;
    for (let z = z1; z < z2 - 0.01; z += size) {
      const t = box(size * 0.97, 0.06, size * 0.97, (i + j) % 2 ? a : b);
      t.position.set(x + size / 2, y + 0.03, z + size / 2);
      t.userData.noOutline = true;
      g.add(t);
      j++;
    }
    i++;
  }
  return g;
}

function bulb(scene, x, y, z, intensity = 30, dist = 14) {
  const cord = cyl(0.015, 0.015, 0.6, 0x222222, 6);
  cord.position.set(x, y + 0.35, z);
  scene.add(cord);
  const b = mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
  b.position.set(x, y, z);
  b.userData.noOutline = true;
  scene.add(b);
  const l = new THREE.PointLight(0xffd59a, intensity, dist, 1.6);
  l.position.set(x, y - 0.05, z);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  l.shadow.bias = -0.003;
  scene.add(l);
  return l;
}

// ---------------------------------------------------------------- first-person rig

function fpCamera(camera, scene, eye, look, fov = 74) {
  camera.fov = fov;
  camera.near = 0.05;
  camera.updateProjectionMatrix();
  camera.position.set(...eye);
  camera.lookAt(...look);
  scene.add(camera);
}

// One arm in camera space: sleeve in player colour + hi-vis cuff + mitt hand.
function fpArm(color, skin, { pos, rot }) {
  const g = new THREE.Group();
  const sleeve = capsule(0.085, 0.42, color);
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.24;
  g.add(sleeve);
  const cuff = cyl(0.1, 0.1, 0.06, PAL.hivis, 16);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 0.02;
  cuff.userData.noOutline = true;
  g.add(cuff);
  const hand = sphere(0.1, skin);
  hand.scale.set(1, 0.85, 1.15);
  hand.position.z = -0.06;
  g.add(hand);
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.userData.hand = hand;
  return addOutlines(g, 0.012);
}

function wrench() {
  const g = new THREE.Group();
  const h = box(0.05, 0.03, 0.42, 0xb9c0c8, { metalness: 0.6, roughness: 0.35 });
  h.position.z = -0.2;
  g.add(h);
  const head = mesh(new THREE.TorusGeometry(0.06, 0.025, 8, 16, Math.PI * 1.5), mat(0xb9c0c8, { metalness: 0.6, roughness: 0.35 }));
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.44;
  g.add(head);
  return addOutlines(g, 0.008);
}

function handsaw() {
  const g = new THREE.Group();
  const blade = box(0.012, 0.16, 0.62, 0xd7dde3, { metalness: 0.7, roughness: 0.3 });
  blade.position.set(0, -0.02, -0.38);
  g.add(blade);
  const teeth = box(0.014, 0.025, 0.6, 0x8a9199);
  teeth.position.set(0, -0.1, -0.38);
  teeth.userData.noOutline = true;
  g.add(teeth);
  const grip = box(0.05, 0.18, 0.14, 0xff4d5e);
  grip.position.set(0, 0.0, -0.02);
  g.add(grip);
  return addOutlines(g, 0.008);
}

function phone(screenTex) {
  const g = new THREE.Group();
  const bodyM = box(0.17, 0.3, 0.02, 0x2a1d2e);
  g.add(bodyM);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.27), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.z = 0.011;
  screen.userData.noOutline = true;
  g.add(screen);
  return addOutlines(g, 0.006);
}

function car(color = 0xb07cd8) {
  const g = new THREE.Group();
  const body = box(4.4, 0.9, 2.0, color);
  body.position.y = 0.75;
  g.add(body);
  const cabin = box(2.4, 0.8, 1.8, color);
  cabin.position.set(-0.2, 1.55, 0);
  g.add(cabin);
  for (const z of [-0.91, 0.91]) {
    const win = box(2.1, 0.6, 0.02, 0x9fd6ff, { roughness: 0.1 });
    win.position.set(-0.2, 1.58, z);
    win.userData.noOutline = true;
    g.add(win);
  }
  const ws = box(0.02, 0.62, 1.6, 0x9fd6ff, { roughness: 0.1 });
  ws.position.set(1.02, 1.55, 0);
  ws.rotation.z = -0.3;
  ws.userData.noOutline = true;
  g.add(ws);
  for (const x of [-1.4, 1.4]) {
    for (const z of [-1.0, 1.0]) {
      const wh = cyl(0.42, 0.42, 0.3, 0x2b2b2b);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(x, 0.42, z);
      g.add(wh);
    }
  }
  for (const z of [-0.6, 0.6]) {
    const hl = sphere(0.14, 0xfff6b0);
    hl.position.set(2.2, 0.85, z);
    hl.userData.noOutline = true;
    g.add(hl);
  }
  return g;
}

function postAndBeam(x, z, yFloor, yCeil, cut = true) {
  const g = new THREE.Group();
  const h = yCeil - yFloor;
  if (cut) {
    const lower = box(0.32, h * 0.55, 0.32, 0xc98b55);
    lower.position.set(x, yFloor + h * 0.275, z);
    g.add(lower);
    const upper = box(0.32, h * 0.4, 0.32, 0xc98b55);
    upper.position.set(x + 0.04, yCeil - h * 0.2, z);
    upper.rotation.z = 0.05;
    g.add(upper);
  } else {
    const p = box(0.32, h, 0.32, 0xc98b55);
    p.position.set(x, yFloor + h / 2, z);
    g.add(p);
  }
  const foot = box(0.6, 0.12, 0.6, 0x9a9a9a);
  foot.position.set(x, yFloor + 0.06, z);
  g.add(foot);
  return g;
}

// Basement + stair shaft + ground-floor hallway, shared by GUS and MO shots.
// Basement floor y=-3.2, ground floor y=0. Stair shaft x∈[-1.2,1.2], z∈[-3.2,1].
function basementAndStairs(scene, { withMoPeeking = false } = {}) {
  const yB = -3.2;
  const concrete = 0x9c9a96;
  const block = 0xb5b1aa;
  scene.add(slab(-8, -12, 8, -3.2, yB, concrete));
  scene.add(wall([-8, -12], [8, -12], { y: yB, h: 3.2, color: block }));
  scene.add(wall([-8, -12], [-8, -3.2], { y: yB, h: 3.2, color: block }));
  scene.add(wall([8, -12], [8, -3.2], { y: yB, h: 3.2, color: block }));
  // basement front wall with the stair opening
  scene.add(wall([-8, -3.2], [8, -3.2], { y: yB, h: 3.2, color: block, openings: [{ at: 8, w: 2.4, top: 3.2 }] }));
  // ground floor slab = basement ceiling, with joists
  scene.add(slab(-8, -12, 8, -3.2, 0.2, 0xd9c7a8, 0.2));
  for (let x = -7.5; x <= 7.5; x += 1.0) {
    const j = box(0.16, 0.3, 8.8, 0xc98b55);
    j.position.set(x, -0.15, -7.6);
    j.userData.noOutline = true;
    scene.add(j);
  }
  const beam = box(16, 0.4, 0.4, 0xb07a48);
  beam.position.set(0, -0.5, -4.6);
  scene.add(beam);
  // stair shaft
  scene.add(wall([-1.2, -3.2], [-1.2, 1], { y: yB, h: 6.0, color: 0xe8dcc8 }));
  scene.add(wall([1.2, -3.2], [1.2, 1], { y: yB, h: 6.0, color: 0xe8dcc8 }));
  scene.add(slab(-1.2, -3.2, 1.2, 1, 2.8, 0xfff3d6));
  const lintel = box(2.4, 2.8, 0.2, 0xe8dcc8);
  lintel.position.set(0, 1.4, -3.3);
  lintel.userData.noOutline = true;
  scene.add(lintel);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const s = box(2.3, 0.27, 0.36, i % 2 ? 0xb97c48 : 0xc98b55);
    s.position.set(0, -0.135 - i * 0.267, 0.8 - i * 0.35);
    s.userData.noOutline = true;
    scene.add(s);
  }
  const rail = box(0.08, 0.08, 4.6, 0x8a5a33);
  rail.position.set(1.05, -0.7, -1.2);
  rail.rotation.x = -0.65;
  scene.add(rail);

  // props
  const heater = cyl(0.55, 0.55, 2.0, 0xe3e6ea);
  heater.position.set(5.5, yB + 1.0, -10.8);
  scene.add(addOutlines(heater));
  const furnace = box(1.4, 1.8, 1.2, 0x7d8590);
  furnace.position.set(3.6, yB + 0.9, -10.9);
  scene.add(addOutlines(furnace));
  for (const [x, z, s] of [[-6.5, -10.8, 1], [-5.6, -11.1, 0.8], [-6.2, -9.9, 0.7], [-6.9, -7.5, 0.9]]) {
    const b = box(0.9 * s, 0.7 * s, 0.9 * s, 0xc49a6c);
    b.position.set(x, yB + 0.35 * s, z);
    b.rotation.y = s;
    scene.add(addOutlines(b));
  }
  const xmas = textPlane('XMAS\nSTUFF', 0.8, 0.55, { w: 256, h: 176, fg: '#2a1d2e', font: '900 64px "Permanent Marker"' });
  xmas.position.set(-6.5, yB + 0.45, -10.33);
  scene.add(xmas);
  // raccoon eyes in the dark corner
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff36b }));
    e.position.set(-7.4 + s * 0.09, yB + 0.5, -4.4);
    e.userData.noOutline = true;
    scene.add(e);
  }

  // The post under Kev's bathroom (being sawed)
  scene.add(addOutlines(postAndBeam(-1.0, -4.9, yB, -0.7, true)));
  // toilet drain pipe coming down through the ceiling
  const drain = cyl(0.12, 0.12, 2.0, 0xe9edf0);
  drain.position.set(-2.3, -1.3, -5.4);
  scene.add(addOutlines(drain));
  const drip = sphere(0.05, 0x8fd8ff, 8, 6);
  drip.position.set(-2.3, -2.4, -5.4);
  drip.scale.y = 1.4;
  scene.add(drip);
  // sawdust
  for (let i = 0; i < 40; i++) {
    const d = box(0.05, 0.02, 0.05, 0xf3d9a8);
    d.position.set(-1.0 + (Math.random() - 0.5) * 1.2, yB + 0.02, -4.9 + (Math.random() - 0.5) * 1.2);
    d.userData.noOutline = true;
    d.castShadow = false;
    scene.add(d);
  }
  const lightB = bulb(scene, -0.6, -1.0, -6.9, 30, 13);

  // hallway at the top of the stairs (ground floor)
  scene.add(slab(-4, 1, 4, 6, 0, 0xd9a066));
  scene.add(wall([-4, 1], [4, 1], { y: 0, h: 2.8, color: 0xa8e6cf, openings: [{ at: 4, w: 1.3, top: 2.3 }] }));
  const door = box(1.2, 2.25, 0.08, 0xffffff);
  door.position.set(-0.9, 1.13, 1.55);
  door.rotation.y = -1.25;
  scene.add(addOutlines(door));
  const sign = textPlane('BASEMENT\nKEEP OUT', 0.7, 0.4, { w: 256, h: 150, bg: '#ffd23f', fg: '#2a1d2e', font: '900 48px Inter' });
  sign.position.set(-0.9 + 0.3, 1.6, 1.55 + 0.05);
  sign.rotation.y = -1.25;
  scene.add(sign);

  return { lightB };
}

// =================================================================== SITE 1: KEV — upstairs bathroom
function kevPOV() {
  const { renderer, scene, camera, sun } = setupScene({ bg: 0xbfe6ff, fog: false });
  const y = 0;
  scene.add(tileFloor(-3, -5, 3, 2, y, 0xffffff, 0xffd6e0, 0.5));
  // floor crack + dust telegraphing the sabotage below
  const crack = new THREE.Group();
  const pts = [[0.4, -3.2], [0.1, -2.6], [0.35, -2.1], [-0.05, -1.5], [0.2, -1.0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const c = box(0.05, 0.02, len, 0x2a1d2e);
    c.position.set((x1 + x2) / 2, y + 0.07, (z1 + z2) / 2);
    c.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    c.userData.noOutline = true;
    crack.add(c);
  }
  scene.add(crack);
  for (let i = 0; i < 26; i++) {
    const d = box(0.04, 0.04, 0.04, 0xf3d9a8);
    d.position.set(0.2 + (Math.random() - 0.5) * 0.9, y + 0.1 + Math.random() * 1.3, -2.3 + (Math.random() - 0.5) * 1.6);
    d.userData.noOutline = true;
    d.castShadow = false;
    scene.add(d);
  }

  const tile = 0xbfe9ff;
  scene.add(wall([-3, -5], [3, -5], { y, h: 3.0, color: 0xfff3d6, openings: [{ at: 4.6, w: 1.4, sill: 1.2, top: 2.4 }] }));
  scene.add(wall([-3, -5], [-3, 2], { y, h: 3.0, color: tile }));
  scene.add(wall([3, -5], [3, 2], { y, h: 3.0, color: tile }));
  const glass = box(1.4, 1.2, 0.05, 0x9fd6ff, { roughness: 0.05, transparent: true, opacity: 0.35 });
  glass.position.set(1.6, 1.8, -5);
  glass.userData.noOutline = true;
  scene.add(glass);
  // outside (seen through the window): yard far below, Grandma's car turning in
  const ground = box(80, 0.2, 80, PAL.grass);
  ground.position.set(0, -3.6, -30);
  ground.userData.noOutline = true;
  scene.add(ground);
  const tr = tree(1.6);
  tr.position.set(5, -3.5, -16);
  scene.add(addOutlines(tr));
  const c = car();
  c.position.set(3.2, -3.5, -13);
  c.rotation.y = 0.9;
  scene.add(addOutlines(c));

  // wainscot tiles on the back wall
  const wain = box(6, 1.1, 0.04, tile);
  wain.position.set(0, 0.55, -4.88);
  wain.userData.noOutline = true;
  scene.add(wain);
  const mirror = box(1.0, 1.3, 0.05, 0xd8f1ff, { metalness: 0.3, roughness: 0.1 });
  mirror.position.set(-1.6, 1.9, -4.87);
  scene.add(addOutlines(mirror));
  const sink = box(1.0, 0.25, 0.6, 0xffffff);
  sink.position.set(-1.6, 1.0, -4.6);
  scene.add(addOutlines(sink));
  const ped = cyl(0.15, 0.2, 0.9, 0xffffff);
  ped.position.set(-1.6, 0.45, -4.6);
  scene.add(addOutlines(ped));
  const tub = bathtub();
  tub.position.set(-2.1, y, -0.3);
  scene.add(addOutlines(tub));
  const duck = sphere(0.15, 0xffd23f);
  duck.position.set(-2.1, 0.85, -0.6);
  scene.add(addOutlines(duck));

  const t = toilet();
  t.position.set(0.35, y, -3.9);
  t.rotation.y = 0.12;
  t.rotation.z = 0.04;
  scene.add(addOutlines(t));
  for (const s of [-1, 1]) {
    const bolt = cyl(0.04, 0.04, 0.12, 0xc9a227);
    bolt.position.set(0.35 + 0.3 * s, y + 0.1, -3.65);
    scene.add(bolt);
  }
  const sig = textPlane('K.B.', 0.5, 0.25, { w: 256, h: 128, fg: '#4f8dff', font: '72px "Permanent Marker"' });
  sig.position.set(0.32, 0.86, -3.34);
  sig.rotation.y = 0.12;
  scene.add(sig);
  const bucketM = bucket(0xff8a3d, 0xffffff);
  bucketM.position.set(2.2, y, -2.6);
  scene.add(addOutlines(bucketM));

  // ceiling + light
  scene.add(slab(-3, -5, 3, 2, 3.2, 0xffffff));
  const lamp = new THREE.PointLight(0xfff1d6, 18, 12);
  lamp.position.set(0, 2.7, -1.5);
  scene.add(lamp);
  sun.position.set(6, 10, -20);

  fpCamera(camera, scene, [0.3, 2.0, 0.6], [0.3, 0.6, -3.4]);
  camera.add(fpArm(C.kev, SKIN.kev, { pos: [0.34, -0.36, -0.5], rot: [-0.1, 0.25, 0] }));
  const wr = wrench();
  wr.position.set(0.32, -0.33, -0.58);
  wr.rotation.set(-0.5, 0.35, 0.6);
  camera.add(wr);
  camera.add(fpArm(C.kev, SKIN.kev, { pos: [-0.3, -0.3, -0.55], rot: [-0.3, -0.2, 0] }));

  finish(renderer, scene, camera, () => {
    pin(camera, new THREE.Vector3(-1.3, 0.3, -2.4), '👂 *SKRRT SKRRT* … from below?', { cls: 'sound' });
    pin(camera, new THREE.Vector3(1.4, 0.3, -2.4), '⚠ floor creaking', { cls: 'sound' });
  });

  hud(`
    <div class="xhair"></div>
    <div class="ctx">
      <div class="ring" style="background:conic-gradient(var(--blue) 0 75%, rgba(42,29,46,.6) 75%)">3/4</div>
      <div class="prompt"><span class="key">E</span> Hold: tighten bolt <b>(proper)</b></div>
      <div class="prompt hackp"><span class="key">Q</span> 🤫 Skip the last bolt</div>
    </div>
    <div class="panel order">
      <div class="top"><span>📋 WORK ORDER #14</span><span>from GUS 👷</span></div>
      <div class="body"><b>Install toilet</b>Upstairs bath · 4 bolts · wax ring<div class="meta">Signed: K.B. · pays $120 · Grandma WILL flush this</div></div>
    </div>
    <div class="panel clock">🕓 4:46 PM · Client due 5:00</div>
    <div class="panel wallet" style="background:var(--blue);color:#fff">KEV · $1,840</div>
    <div class="panel walkie">
      <div class="hd">📻 WALKIE · CH 1</div>
      <div><span class="who" style="background:var(--orange)">YOU</span>grandma's car is here!!! early!!!</div>
      <div><span class="who" style="background:var(--purple)">GUS</span>copy. i'm in the, uh. garage.</div>
      <div><span class="who" style="background:var(--green)">MO</span>…</div>
    </div>
    <div class="povtag" style="background:var(--blue)">KEV'S VIEW · 1ST PERSON</div>
  `);
}

// =================================================================== SITE 2: GUS — basement sabotage
function gusPOV() {
  const { renderer, scene, camera, sun } = setupScene({ bg: 0x120c10, fog: false });
  sun.intensity = 0;
  scene.children.find((o) => o.isHemisphereLight).intensity = 0.28;
  scene.fog = new THREE.Fog(0x120c10, 6, 18);
  basementAndStairs(scene);
  // Mo peeking around the door at the top of the stairs
  const mo = worker({ color: C.mo, stache: 'beard', skin: SKIN.mo, stacheColor: 0x2b1a10 });
  mo.position.set(0.55, 0.0, 1.6);
  mo.rotation.y = Math.PI;
  mo.rotation.z = 0.28;
  poseArm(mo, 'R', 1.6, -0.2);
  poseArm(mo, 'L', 1.6, -0.2);
  scene.add(addOutlines(mo));
  const ph = box(0.17, 0.3, 0.03, 0x2a1d2e);
  ph.position.set(0.55, 1.45, 1.0);
  scene.add(ph);
  const hallLight = new THREE.PointLight(0xfff1d6, 14, 6);
  hallLight.position.set(0, 2.4, 2.4);
  scene.add(hallLight);

  fpCamera(camera, scene, [1.7, -1.2, -7.3], [-0.6, -1.25, -4.9], 76);
  camera.add(fpArm(C.gus, SKIN.gus, { pos: [0.3, -0.34, -0.48], rot: [0.1, 0.35, 0] }));
  const saw = handsaw();
  saw.position.set(0.28, -0.3, -0.56);
  saw.rotation.set(0.15, 0.55, 0.15);
  camera.add(saw);
  camera.add(fpArm(C.gus, SKIN.gus, { pos: [-0.3, -0.36, -0.55], rot: [0.05, -0.15, 0] }));

  finish(renderer, scene, camera, () => {
    pin(camera, new THREE.Vector3(-2.3, -2.0, -5.4), '💧 Kev\'s toilet drain', { cls: 'sound' });
  });

  hud(`
    <div class="dark-vignette"></div>
    <div class="xhair"></div>
    <div class="ctx">
      <div class="ring" style="background:conic-gradient(var(--purple) 0 60%, rgba(42,29,46,.6) 60%)">60%</div>
      <div class="prompt hackp"><span class="key">F</span> Hold: 🤫 weaken post under <b>KEV'S</b> bathroom</div>
      <div class="prompt" style="background:#ffe08a">🔊 NOISE: LOUD — anyone nearby can hear</div>
    </div>
    <div class="panel order" style="background:#f3ecff">
      <div class="top" style="background:var(--purple)"><span>🤫 SIDE HUSTLE (secret)</span><span>+$400</span></div>
      <div class="body"><b>"Something falls during the walkthrough"</b>Make it someone else's fault.<div class="meta">Assigned task: "Sweep the garage" (ignored)</div></div>
    </div>
    <div class="panel clock">🕓 4:46 PM · Client due 5:00</div>
    <div class="panel wallet" style="background:var(--purple);color:#fff">GUS · $990 👷</div>
    <div class="panel walkie">
      <div class="hd">📻 WALKIE · CH 1</div>
      <div><span class="who" style="background:var(--orange)">YOU</span>grandma's car is here!!! early!!!</div>
      <div><span class="who" style="background:var(--purple)">GUS</span>copy. i'm in the, uh. garage.</div>
    </div>
    <div class="povtag" style="background:var(--purple)">GUS'S VIEW · BASEMENT</div>
  `);
}

// =================================================================== SITE 3: MO — the witness
function moPOV() {
  const { renderer, scene, camera, sun } = setupScene({ bg: 0x120c10, fog: false });
  sun.intensity = 0;
  scene.children.find((o) => o.isHemisphereLight).intensity = 0.5;
  basementAndStairs(scene);
  const hallLight = new THREE.PointLight(0xfff1d6, 12, 7);
  hallLight.position.set(0, 2.5, 3.2);
  scene.add(hallLight);
  // hallway dressing behind the doorframe
  const frame = box(0.12, 2.35, 0.3, 0xffffff);
  frame.position.set(-0.7, 1.18, 1.0);
  scene.add(frame);
  const frame2 = frame.clone();
  frame2.position.x = 0.7;
  scene.add(frame2);

  // Gus at the bottom, sawing
  const gus = worker({ color: C.gus, stache: 'pencil' });
  gus.position.set(0.75, -3.2, -6.2);
  face(gus, -1.0, -4.9);
  poseArm(gus, 'R', 1.5, -0.3);
  poseArm(gus, 'L', 1.3, -0.4);
  scene.add(addOutlines(gus));
  const saw = handsaw();
  saw.position.set(-0.35, -2.0, -5.35);
  saw.rotation.y = gus.rotation.y;
  scene.add(saw);

  fpCamera(camera, scene, [0.15, 1.95, 2.7], [-0.1, -2.2, -5.2], 70);

  // phone screen = live zoomed view rendered to a texture
  const rt = new THREE.WebGLRenderTarget(300, 540);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const phoneCam = new THREE.PerspectiveCamera(22, 300 / 540, 0.1, 100);
  phoneCam.position.set(0.15, 1.85, 2.4);
  phoneCam.lookAt(0.0, -2.0, -5.4);
  const ph = phone(rt.texture);
  ph.position.set(0.02, -0.12, -0.42);
  ph.rotation.set(-0.05, 0, 0.04);
  camera.add(ph);
  camera.add(fpArm(C.mo, SKIN.mo, { pos: [0.11, -0.28, -0.36], rot: [0.5, 0.5, 0] }));
  camera.add(fpArm(C.mo, SKIN.mo, { pos: [-0.08, -0.3, -0.36], rot: [0.5, -0.5, 0] }));
  ph.visible = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, phoneCam);
  renderer.setRenderTarget(null);
  ph.visible = true;

  finish(renderer, scene, camera, () => {
    pin(camera, new THREE.Vector3(-1.4, -0.4, -4.9), '🪚 *skrrt skrrt*', { cls: 'sound' });
    const top = new THREE.Vector3(0, 0.15, 0);
    ph.localToWorld(top);
    pin(camera, top, '<span style="color:#ff4d5e">●</span> REC · EVIDENCE: GUS', { cls: 'chip' });
  });

  hud(`
    <div class="panel" style="left:50%;top:50%;transform:translate(-50%,-50%);width:1px;height:1px;border:none;box-shadow:none;background:none"></div>
    <div class="ctx" style="top:auto;bottom:30px">
      <div style="display:flex;gap:12px">
        <div class="prompt"><span class="key">LMB</span> 📸 Snap evidence</div>
        <div class="prompt hackp"><span class="key">R</span> 📣 Report Gus · <b>+$300</b></div>
        <div class="prompt" style="background:#e8f7ff"><span class="key">B</span> 🤐 Blackmail instead…</div>
      </div>
    </div>
    <div class="panel order" style="background:#eafff1">
      <div class="top" style="background:var(--green)"><span>📋 WORK ORDER #11</span><span>from GUS 👷</span></div>
      <div class="body"><b>Fix basement light</b>Basement · "go check it, I'm busy"<div class="meta">…the light works fine. why is he sawing.</div></div>
    </div>
    <div class="panel clock">🕓 4:46 PM · Client due 5:00</div>
    <div class="panel wallet" style="background:var(--green);color:#fff">MO · $1,320</div>
    <div class="sound" style="left:50%;top:120px">🫣 Gus hasn't seen you</div>
    <div class="povtag" style="background:var(--green)">MO'S VIEW · TOP OF THE STAIRS</div>
  `);
}

// =================================================================== SITE 4: YOU — outside at the van
function youPOV() {
  const { renderer, scene, camera, sun } = setupScene({ bg: 0xffd6a5 });
  sun.position.set(-18, 14, 10);
  const lawn = box(140, 0.2, 140, PAL.grass);
  lawn.position.y = -0.1;
  lawn.userData.noOutline = true;
  scene.add(lawn);
  const road = box(140, 0.05, 7, 0x6b6f7a);
  road.position.set(0, 0.02, 14);
  road.userData.noOutline = true;
  scene.add(road);
  for (let x = -60; x < 60; x += 4) {
    const dash = box(2, 0.06, 0.25, 0xfff3d6);
    dash.position.set(x, 0.04, 14);
    dash.userData.noOutline = true;
    scene.add(dash);
  }
  const drive = box(5, 0.06, 12, 0xa8a49c);
  drive.position.set(4, 0.03, 6);
  drive.userData.noOutline = true;
  scene.add(drive);

  // two-storey house: the job site
  const hs = new THREE.Group();
  const body = box(14, 6.4, 10, 0xffd6a5);
  body.position.y = 3.2;
  hs.add(body);
  const roofG = new THREE.CylinderGeometry(0.01, 8.6, 3.2, 4, 1);
  const roof = mesh(roofG, mat(0x7f9cff));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.2, 1, 0.85);
  roof.position.y = 8.0;
  hs.add(roof);
  const garage = box(4.2, 3.0, 0.1, 0xffffff);
  garage.position.set(4, 1.5, 5.02);
  hs.add(garage);
  for (let i = 0; i < 4; i++) {
    const l = box(4.2, 0.05, 0.12, 0xdddddd);
    l.position.set(4, 0.6 + i * 0.7, 5.06);
    l.userData.noOutline = true;
    hs.add(l);
  }
  const door = box(1.2, 2.3, 0.1, 0xff6f91);
  door.position.set(-1.5, 1.15, 5.02);
  hs.add(door);
  const wins = [[-4.6, 2.2], [-4.6, 5.0], [-1.5, 5.0], [1.8, 5.0], [4.6, 5.0]];
  for (const [x, yy] of wins) {
    const lit = x === 1.8 && yy === 5.0;
    const w = box(1.6, 1.3, 0.08, lit ? 0xfff1b0 : 0x9fd6ff, { roughness: 0.15, emissive: lit ? 0x806a20 : 0x000000 });
    w.position.set(x, yy, 5.02);
    hs.add(w);
  }
  hs.position.set(-1, 0, -6);
  scene.add(addOutlines(hs));
  // Kev silhouette in the lit bathroom window
  const ks = sphere(0.35, 0x2a1d2e);
  ks.position.set(0.8, 5.1, -0.92);
  ks.userData.noOutline = true;
  scene.add(ks);
  // basement window with a flickering glow
  const bw = box(1.2, 0.4, 0.08, 0xffc46b, { emissive: 0x7a4a10 });
  bw.position.set(-5.6, 0.25, -0.95);
  scene.add(bw);

  const v = van('DALE & SONS\n(NO SONS)');
  v.position.set(-15, 0, 3.5);
  v.rotation.y = 0.2;
  scene.add(addOutlines(v));
  // porta-potty + dumpster
  const pp = new THREE.Group();
  const ppb = box(1.3, 2.4, 1.3, 0x4f8dff);
  ppb.position.y = 1.2;
  pp.add(ppb);
  const ppr = cyl(0.75, 0.75, 0.15, 0xffffff);
  ppr.position.y = 2.45;
  pp.add(ppr);
  const occ = textPlane('OCCUPIED', 0.9, 0.22, { w: 256, h: 64, bg: '#ff4d5e', fg: '#fff', font: '900 40px Inter' });
  occ.position.set(0, 1.9, 0.66);
  pp.add(occ);
  pp.position.set(9.5, 0, 1.5);
  pp.rotation.y = -0.4;
  scene.add(addOutlines(pp));
  const dump = box(4, 1.6, 2, 0x3c8a4a);
  dump.position.set(10.5, 0.8, -3.5);
  scene.add(addOutlines(dump));
  const gn = gnome();
  gn.position.set(-3.8, 0, 1.3);
  gn.scale.setScalar(1.3);
  scene.add(addOutlines(gn));
  const t1 = tree(1.6);
  t1.position.set(-14, 0, -2);
  scene.add(addOutlines(t1));
  const t2 = tree(1.4);
  t2.position.set(14, 0, -8);
  scene.add(addOutlines(t2));

  // Grandma's car pulling into the driveway early
  const c = car(0xb07cd8);
  c.position.set(5.0, 0, 9.6);
  c.rotation.y = 0.9;
  scene.add(addOutlines(c));
  const gm = grandma();
  gm.scale.setScalar(0.55);
  gm.position.set(5.2, 0.35, 9.3);
  gm.rotation.y = -1.2;
  scene.add(gm);
  const dog = sphere(0.28, 0xffffff);
  dog.position.set(4.2, 1.65, 10.4);
  scene.add(addOutlines(dog));

  fpCamera(camera, scene, [-6.5, 2.0, 12.5], [3.0, 1.6, 1.5], 74);
  // carrying drywall with both hands
  const dw = box(1.5, 0.06, 0.8, 0xeceff3);
  dw.position.set(0, -0.78, -0.9);
  dw.rotation.set(0.15, 0, -0.04);
  camera.add(addOutlines(dw, 0.01));
  camera.add(fpArm(C.you, SKIN.you, { pos: [0.5, -0.62, -0.6], rot: [-0.15, 0.1, 0] }));
  camera.add(fpArm(C.you, SKIN.you, { pos: [-0.5, -0.62, -0.6], rot: [-0.15, -0.1, 0] }));

  finish(renderer, scene, camera, () => {
    pin(camera, new THREE.Vector3(5.0, 2.8, 9.6), '🚨 MRS. HENDERSON · 14 MIN EARLY', { cls: 'tag npc' });
    pin(camera, new THREE.Vector3(0.8, 6.2, -0.9), 'Kev?', { cls: 'sound' });
    pin(camera, new THREE.Vector3(-5.6, 0.9, -0.9), '🪚 faint sawing from the basement window…', { cls: 'sound' });
    pin(camera, new THREE.Vector3(9.5, 3.0, 1.5), '💩 someone\'s been in there 9 min', { cls: 'sound' });
  });

  hud(`
    <div class="xhair"></div>
    <div class="warn">⚠ CLIENT IS EARLY · walkthrough starts at the front door</div>
    <div class="panel order" style="background:#fff3e6;top:150px">
      <div class="top" style="background:var(--orange)"><span>📋 WORK ORDER #12</span><span>from GUS 👷</span></div>
      <div class="body"><b>Drywall ×2 → upstairs bedroom</b>From the van · heavy · 2 people faster<div class="meta">0/2 delivered · pays $90</div></div>
    </div>
    <div class="ctx" style="top:auto;bottom:30px">
      <div style="display:flex;gap:12px">
        <div class="prompt" style="background:#fff59d"><span class="key">1</span> 💬 Intercept: Small Talk on the lawn</div>
        <div class="prompt"><span class="key">V</span> 📻 Walkie</div>
      </div>
    </div>
    <div class="panel clock">🕓 4:46 PM · Client due 5:00</div>
    <div class="panel wallet" style="background:var(--orange);color:#fff">YOU · $1,610</div>
    <div class="panel walkie" style="bottom:100px">
      <div class="hd">📻 WALKIE · CH 1</div>
      <div><span class="who" style="background:var(--orange)">YOU</span>grandma's car is here!!! early!!!</div>
      <div><span class="who" style="background:var(--purple)">GUS</span>copy. i'm in the, uh. garage.</div>
    </div>
    <div class="povtag" style="background:var(--orange)">YOUR VIEW · FRONT YARD</div>
  `);
}

// =================================================================== SITE 5: exploded house diagram
function overview() {
  const { renderer, scene, camera, sun } = setupScene({ bg: 0xdff2ff, fog: false });
  sun.position.set(8, 40, 25);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;

  const X0 = -8, X1 = 8, Z0 = -10, Z1 = 0;
  const LV = {
    base: { y: -8, floor: 0x9c9a96, wallC: 0xb5b1aa, name: 'BASEMENT' },
    ground: { y: 0, floor: 0xd9a066, wallC: 0xa8e6cf, name: 'GROUND FLOOR' },
    up: { y: 8, floor: 0xe9c08a, wallC: 0xc9b6ff, name: 'UPSTAIRS' },
  };
  for (const L of Object.values(LV)) {
    scene.add(slab(X0, Z0, X1, Z1, L.y + 0.02, L.floor, 0.35));
    scene.add(wall([X0, Z0], [X1, Z0], { y: L.y, h: 2.8, color: L.wallC }));
    scene.add(wall([X0, Z0], [X0, Z1], { y: L.y, h: 2.8, color: L.wallC }));
    scene.add(wall([X1, Z0], [X1, Z1], { y: L.y, h: 2.8, color: L.wallC }));
  }
  // dashed "stair" connectors between levels
  for (const [y0, y1] of [[LV.base.y, LV.ground.y], [LV.ground.y, LV.up.y]]) {
    for (let y = y0 + 0.6; y < y1 - 0.3; y += 0.8) {
      const d = box(0.12, 0.4, 0.12, 0x2a1d2e);
      d.position.set(0, y, -1.2);
      d.userData.noOutline = true;
      scene.add(d);
    }
  }
  const iw = (a, b, y, c, openings = []) => scene.add(wall(a, b, { y, h: 2.2, color: c, t: 0.16, openings }));
  iw([-2.5, -10], [-2.5, 0], LV.up.y, 0xc9b6ff, [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([2.5, -10], [2.5, 0], LV.up.y, 0xc9b6ff, [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([-2.5, -10], [-2.5, 0], LV.ground.y, 0xa8e6cf, [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([2.5, -10], [2.5, 0], LV.ground.y, 0xa8e6cf, [{ at: 3, w: 1.2, top: 2.0 }]);
  iw([3, -10], [3, -5], LV.base.y, 0xb5b1aa);
  // stair blocks in the hallway on each level
  for (const L of [LV.ground, LV.up, LV.base]) {
    for (let i = 0; i < 5; i++) {
      const st = box(1.6, 0.3, 0.45, 0xc98b55);
      st.position.set(0, L.y + 0.15 + i * 0.3, -1.6 - i * 0.45);
      st.scale.y = 1 + i;
      st.position.y = L.y + 0.15 * (1 + i);
      st.userData.noOutline = true;
      scene.add(st);
    }
  }

  // furniture
  const t = toilet();
  t.position.set(-5.2, LV.up.y, -8.6);
  scene.add(addOutlines(t));
  const tub = bathtub();
  tub.scale.setScalar(0.8);
  tub.position.set(-7.0, LV.up.y, -4.5);
  scene.add(addOutlines(tub));
  const bed = box(2.6, 0.6, 3.4, 0xff8b7b);
  bed.position.set(5.4, LV.up.y + 0.3, -7.6);
  scene.add(addOutlines(bed));
  const sofa = box(3.2, 0.9, 1.1, 0x4fbf8a);
  sofa.position.set(-5.2, LV.ground.y + 0.45, -9.0);
  scene.add(addOutlines(sofa));
  const counter = box(4.6, 1.0, 1.0, 0xfff3d6);
  counter.position.set(5.4, LV.ground.y + 0.5, -9.3);
  scene.add(addOutlines(counter));
  scene.add(addOutlines(postAndBeam(-5.2, -7.6, LV.base.y, LV.base.y + 2.8, true)));
  const heater = cyl(0.5, 0.5, 1.8, 0xe3e6ea);
  heater.position.set(6.6, LV.base.y + 0.9, -9.0);
  scene.add(addOutlines(heater));
  for (const [x, z] of [[4.2, -8.8], [5.2, -8.0], [6.8, -6.8]]) {
    const b = box(0.8, 0.6, 0.8, 0xc49a6c);
    b.position.set(x, LV.base.y + 0.3, z);
    scene.add(addOutlines(b));
  }

  // lawn strip at ground level, out front
  for (const x of [-15, 12]) {
    const pad = box(12, 0.3, 8, PAL.grass);
    pad.position.set(x, -0.15, 6.5);
    pad.userData.noOutline = true;
    scene.add(pad);
  }

  // workers
  const S = 0.85;
  const kev = worker({ color: C.kev, stache: 'handlebar', skin: SKIN.kev });
  kev.scale.setScalar(S);
  kev.position.set(-5.0, LV.up.y, -6.6);
  face(kev, -5.2, -8.6);
  poseArm(kev, 'R', 1.3, 0);
  scene.add(addOutlines(kev));
  const gus = worker({ color: C.gus, stache: 'pencil', skin: SKIN.gus });
  gus.scale.setScalar(S);
  gus.position.set(-3.6, LV.base.y, -6.4);
  face(gus, -5.2, -7.6);
  poseArm(gus, 'R', 1.5, 0);
  scene.add(addOutlines(gus));
  const mo = worker({ color: C.mo, stache: 'beard', skin: SKIN.mo, stacheColor: 0x2b1a10 });
  mo.scale.setScalar(S);
  mo.position.set(0.5, LV.ground.y, -0.8);
  face(mo, 0, -5);
  poseArm(mo, 'R', 1.6, 0);
  poseArm(mo, 'L', 1.6, 0);
  scene.add(addOutlines(mo));
  const me = worker({ color: C.you, stache: 'walrus', skin: SKIN.you });
  me.scale.setScalar(S);
  me.position.set(-11, 0, 5);
  face(me, 10, 6);
  scene.add(addOutlines(me));
  const v = van('DALE & SONS\n(NO SONS)');
  v.scale.setScalar(0.7);
  v.position.set(-16, 0, 8);
  scene.add(addOutlines(v));
  const c = car(0xb07cd8);
  c.position.set(11, 0, 7);
  c.rotation.y = 2.8;
  scene.add(addOutlines(c));

  const cone = (w, color, r, ang) => {
    const vc = viewCone(r, ang, color);
    vc.position.copy(w.position);
    vc.position.y += 0.4;
    vc.rotation.y = w.rotation.y;
    scene.add(vc);
  };
  cone(kev, C.kev, 2.6, 1.2);
  cone(gus, C.gus, 2.4, 1.2);
  cone(me, C.you, 18, 0.6);

  // Mo's sightline down the stairs to Gus: a dotted green line between levels
  const from = new THREE.Vector3(0.5, LV.ground.y + 1.7, -0.8);
  const to = new THREE.Vector3(-3.6, LV.base.y + 1.6, -6.4);
  for (let i = 1; i < 14; i++) {
    const p = from.clone().lerp(to, i / 14);
    const d = sphere(0.14, C.mo, 10, 8);
    d.position.copy(p);
    d.userData.noOutline = true;
    scene.add(d);
  }

  camera.fov = 40;
  camera.updateProjectionMatrix();
  camera.position.set(3, 10, 41);
  camera.lookAt(-0.5, -0.2, -4.5);

  finish(renderer, scene, camera, () => {
    pin(camera, kev.userData.parts.head, 'KEV · fixing toilet · hears sawing', { dy: 1.0, cls: 'tag blue' });
    pin(camera, gus.userData.parts.head, 'GUS · sawing the post · thinks he\'s alone', { dy: 1.0, cls: 'tag purple' });
    pin(camera, mo.userData.parts.head, 'MO · "fix basement light" · sees Gus 📸', { dy: 1.0, cls: 'tag green' });
    pin(camera, me.userData.parts.head, 'YOU · sees grandma, nothing else', { dy: 1.0, cls: 'tag orange' });
    pin(camera, new THREE.Vector3(12, 1.4, 9), 'MRS. HENDERSON · early 🚗', { cls: 'tag npc' });
    pin(camera, new THREE.Vector3(X1 + 5.5, LV.up.y + 3.2, -5), 'UPSTAIRS · bath | landing | bedroom', { cls: 'chip' });
    pin(camera, new THREE.Vector3(X1 + 5.5, LV.ground.y + 3.2, -5), 'GROUND · living | hall | kitchen', { cls: 'chip' });
    pin(camera, new THREE.Vector3(X1 + 5.5, LV.base.y + 3.2, -5), 'BASEMENT · storage, furnace, the post', { cls: 'chip' });
    pin(camera, new THREE.Vector3(-10.5, LV.base.y + 1.2, -6), 'the post ➡ holds up Kev\'s toilet', { cls: 'flaw' });
  });

  hud(`
    <div class="banner" style="top:10px;font-size:50px">SAME MOMENT · NOBODY SEES EVERYTHING</div>
    <div class="panel legend">
      <div style="font-size:20px">👁 Cones = what each player can actually see</div>
      <div>🧱 Walls and floors block sight. To know, you have to <b>go look</b>.</div>
      <div>👂 Sound leaks through floors (sawing, flushing, screaming)</div>
      <div>📻 Walkie reaches everyone, and you can lie on it</div>
    </div>
    <div class="caption" style="color:#2a1d2e;text-shadow:none">DESIGN VIEW (EXPLODED HOUSE), NOT IN-GAME</div>
  `);
}

export function render(shot) {
  ({ 1: kevPOV, 2: gusPOV, 3: moPOV, 4: youPOV, 5: overview })[shot]();
}
