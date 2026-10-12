// OVER BUDGET: job-site mockups, polished pass.
// "Same moment, four perspectives" at 4:46 PM, client due 5:00:
//   KEV  upstairs bath, tightening toilet bolts, hears sawing below
//   GUS  basement, sawing the post that holds up Kev's bathroom
//   MO   sent for the shop-vac, sneaking down the stairs, phone up
//   YOU  front yard with drywall as Grandma's car pulls in early
import {
  THREE, PAL, W, H, mat, mesh, box, cyl, sphere, capsule, addOutlines, worker, poseArm, poseLeg, grandma,
  textPlane, toilet, bathtub, bucket, gnome, van, viewCone, pin,
} from './lib.js';
import {
  T, tmat, surf, setup, skyDome, clouds, shaft, motes, lightPatch, glow, cord, cautionTape, toolbox, paintCan, coffee,
  tapeMeasure, sawhorse, trafficCone, plant, pictureFrame, outlet, windowFrame, treeFancy, hedge, flowers, powerPole,
  streetLamp, mailbox, pallet, wheelbarrow, renderFx, rr,
} from './fx.js';

const C = { kev: '#4f8dff', gus: '#a65cff', mo: '#3ccf7a', you: '#ff8a3d', red: '#ff4d5e' };
const HEX = { kev: PAL.blue, gus: PAL.purple, mo: PAL.green, you: PAL.orange };
const SKIN = { kev: 0xe0a77d, gus: 0xf2c09b, mo: 0x9c6b4a, you: 0xf2c09b };

const face = (o, x, z) => { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); };
const done = () => { window.__ready = true; };

// ---------------------------------------------------------------- building helpers

// Textured axis-aligned wall with openings { at, w, top, sill }.
function texWall(scene, a, b, { y = 0, h = 2.8, t = 0.18, tex, size = 2, openings = [], opts = {} } = {}) {
  const alongX = a[1] === b[1];
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const start = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const fixed = alongX ? a[1] : a[0];
  const seg = (s, e, y0, y1) => {
    if (e - s <= 0.01 || y1 - y0 <= 0.01) return;
    const m = alongX ? surf(e - s, y1 - y0, t, tex, size, opts) : surf(t, y1 - y0, e - s, tex, size, opts);
    const c = start + (s + e) / 2;
    m.position.set(alongX ? c : fixed, y + (y0 + y1) / 2, alongX ? fixed : c);
    scene.add(m);
  };
  let cur = 0;
  for (const o of [...openings].sort((p, q) => p.at - q.at)) {
    seg(cur, o.at - o.w / 2, 0, h);
    seg(o.at - o.w / 2, o.at + o.w / 2, o.top ?? 2.2, h);
    if (o.sill) seg(o.at - o.w / 2, o.at + o.w / 2, 0, o.sill);
    cur = o.at + o.w / 2;
  }
  seg(cur, len, 0, h);
}

function floor(scene, x1, z1, x2, z2, y, tex, size = 2, th = 0.2, opts) {
  const m = surf(Math.abs(x2 - x1), th, Math.abs(z2 - z1), tex, size, opts);
  m.position.set((x1 + x2) / 2, y - th / 2, (z1 + z2) / 2);
  scene.add(m);
  return m;
}

function trim(scene, x, y, z, w, h, d, color = 0xffffff) {
  const m = box(w, h, d, color, { roughness: 0.5 });
  m.position.set(x, y, z);
  m.userData.noOutline = true;
  scene.add(m);
  return m;
}

function chrome(color = 0xdfe6ee) {
  return mat(color, { metalness: 0.9, roughness: 0.18 });
}

// ---------------------------------------------------------------- first-person rig

function fpCam(camera, eye, look, fov = 70) {
  camera.fov = fov;
  camera.near = 0.03;
  camera.updateProjectionMatrix();
  camera.position.set(...eye);
  camera.lookAt(...look);
}

function fpArm(color, skin, { pos, rot }) {
  const g = new THREE.Group();
  const sleeve = mesh(new THREE.CapsuleGeometry(0.085, 0.42, 6, 14), tmat(T.fabric(color), 2, 2, { rough: 0.9, bump: 0.3 }));
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.24;
  g.add(sleeve);
  const cuff = cyl(0.1, 0.1, 0.07, PAL.hivis, 18);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 0.02;
  cuff.userData.noOutline = true;
  g.add(cuff);
  const stripe = cyl(0.103, 0.103, 0.02, 0xdfe3ea, 18);
  stripe.material = mat(0xdfe3ea, { metalness: 0.6, roughness: 0.3 });
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = 0.02;
  stripe.userData.noOutline = true;
  g.add(stripe);
  const glove = sphere(0.105, 0xd9a441);
  glove.material = mat(0xd9a441, { roughness: 0.9 });
  glove.scale.set(1, 0.85, 1.2);
  glove.position.z = -0.07;
  g.add(glove);
  const thumb = sphere(0.04, 0xd9a441);
  thumb.material = glove.material;
  thumb.position.set(0.07, 0.03, -0.08);
  g.add(thumb);
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.scale.setScalar(0.82);
  return addOutlines(g, 0.01);
}

function wrench() {
  const g = new THREE.Group();
  const h = box(0.05, 0.028, 0.42, 0xb9c0c8);
  h.material = chrome(0xc4ccd4);
  h.position.z = -0.2;
  g.add(h);
  const grip = box(0.056, 0.034, 0.16, 0xe8352f, { roughness: 0.6 });
  grip.position.z = -0.04;
  g.add(grip);
  const head = mesh(new THREE.TorusGeometry(0.06, 0.024, 8, 18, Math.PI * 1.5), chrome());
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.44;
  g.add(head);
  return addOutlines(g, 0.006);
}

function handsaw() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.09);
  shape.lineTo(0.66, 0.035);
  shape.lineTo(0.66, -0.02);
  shape.lineTo(0, -0.09);
  shape.closePath();
  const blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false }), chrome(0xd7dde3));
  blade.rotation.y = Math.PI / 2;
  blade.position.set(0, 0, -0.08);
  g.add(blade);
  const teeth = box(0.008, 0.012, 0.64, 0x6d737a);
  teeth.position.set(0.003, -0.075, -0.4);
  teeth.rotation.x = -0.09;
  teeth.userData.noOutline = true;
  g.add(teeth);
  const grip = box(0.05, 0.2, 0.16, 0xd9a066, { roughness: 0.7 });
  grip.position.set(0.003, 0.0, -0.02);
  g.add(grip);
  const hole = box(0.052, 0.08, 0.07, 0x3a2410);
  hole.position.set(0.003, 0.02, -0.02);
  hole.userData.noOutline = true;
  g.add(hole);
  return addOutlines(g, 0.006);
}

function phoneMesh(screenTex) {
  const g = new THREE.Group();
  const body = box(0.17, 0.32, 0.022, 0x1d1824, { roughness: 0.3, metalness: 0.3 });
  g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.3), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = 0.0115;
  screen.userData.noOutline = true;
  g.add(screen);
  const caseRim = box(0.18, 0.33, 0.016, 0x3ccf7a, { roughness: 0.6 });
  caseRim.position.z = -0.006;
  g.add(caseRim);
  return addOutlines(g, 0.005);
}

function car(color = 0xb07cd8) {
  const g = new THREE.Group();
  const paint = mat(color, { roughness: 0.25, metalness: 0.35 });
  const body = mesh(new THREE.BoxGeometry(4.4, 0.75, 1.95), paint);
  body.position.y = 0.72;
  g.add(body);
  const cabin = mesh(new THREE.BoxGeometry(2.4, 0.75, 1.75), paint);
  cabin.position.set(-0.25, 1.45, 0);
  g.add(cabin);
  const glassM = mat(0x223344, { roughness: 0.05, metalness: 0.6 });
  for (const z of [-0.88, 0.88]) {
    const win = mesh(new THREE.BoxGeometry(2.1, 0.55, 0.02), glassM);
    win.position.set(-0.25, 1.48, z);
    win.userData.noOutline = true;
    g.add(win);
    const mirror = box(0.12, 0.12, 0.2, color);
    mirror.position.set(0.85, 1.25, z * 1.12);
    g.add(mirror);
  }
  const ws = mesh(new THREE.BoxGeometry(0.02, 0.6, 1.6), glassM);
  ws.position.set(0.98, 1.47, 0);
  ws.rotation.z = -0.35;
  ws.userData.noOutline = true;
  g.add(ws);
  for (const [x, w] of [[2.22, 0.12], [-2.22, 0.12]]) {
    const bump = box(w, 0.25, 2.0, 0xd9dde3);
    bump.material = chrome(0xd9dde3);
    bump.position.set(x, 0.45, 0);
    g.add(bump);
  }
  const grille = box(0.04, 0.22, 0.9, 0x2a2a2a);
  grille.position.set(2.21, 0.75, 0);
  g.add(grille);
  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.98, 0.98]) {
      const wh = cyl(0.4, 0.4, 0.28, 0x1c1c1c);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(x, 0.4, z);
      g.add(wh);
      const hub = cyl(0.22, 0.22, 0.3, 0xcfd5db);
      hub.material = chrome();
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.4, z);
      hub.userData.noOutline = true;
      g.add(hub);
    }
  }
  for (const z of [-0.65, 0.65]) {
    const hl = glow(0xfff2c0, 0.13);
    hl.scale.set(0.5, 0.9, 1.4);
    hl.position.set(2.2, 0.82, z);
    g.add(hl);
    const tl = glow(0xff3b30, 0.1);
    tl.scale.set(0.5, 0.8, 1.6);
    tl.position.set(-2.2, 0.85, z);
    g.add(tl);
  }
  return addOutlines(g, 0.02);
}

// ---------------------------------------------------------------- HUD builders

const ring = (pct, label, color) => `<div class="g-ring"><svg width="58" height="58">
  <circle cx="29" cy="29" r="24" fill="rgba(10,6,14,.55)" stroke="rgba(255,255,255,.22)" stroke-width="5"/>
  <circle cx="29" cy="29" r="24" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
    stroke-dasharray="${(2 * Math.PI * 24 * pct).toFixed(1)} 999" transform="rotate(-90 29 29)"/></svg><span class="ts">${label}</span></div>`;

const waves = '<div class="w"><i style="height:6px"></i><i style="height:12px"></i><i style="height:18px"></i><i style="height:11px"></i><i style="height:5px"></i></div>';

function gameHud({ pc, obj, compass, time, due, card, radio, hot, hotName, extra = '' }) {
  const steps = obj.steps.map((s) => `<div class="g-step ts ${s.st || ''} ${s.secret ? 'secret' : ''}"><div class="bx">${s.st === 'done' ? '✓' : ''}</div>${s.t}${s.m ? `<span class="mt">${s.m}</span>` : ''}</div>`).join('');
  const labels = compass.labels.map(([x, l]) => `<div class="l ts" style="left:${x}%">${l}</div>`).join('');
  const marks = compass.marks.map(([x, ic, c]) => `<div class="m" style="left:${x}%;--c:${c}">${ic}<i></i></div>`).join('');
  const msgs = radio.map((r) => `<div class="g-msg ${r.cls || ''}" style="--c:${r.c}"><b>${r.who}</b><span>${r.t}</span></div>`).join('');
  const slots = hot.map((s, i) => `<div class="g-slot ${s.on ? 'on' : ''}"><span class="k">${i + 1}</span>${s.i}</div>`).join('');
  return `<div class="g" style="--pc:${pc};--pcg:${pc}88">
    <div class="g-shade tl"></div><div class="g-shade bl"></div><div class="g-shade br"></div><div class="g-shade tr"></div>
    <div class="g-obj">
      <div class="kick ts">${obj.kick}<span>${obj.kickR || ''}</span></div>
      <div class="ttl ts">${obj.title}</div>
      <div class="sub ts">${obj.sub}</div>
      ${steps}
    </div>
    <div class="g-compass"><div class="ticks"></div><div class="ticks big"></div>${labels}${marks}</div>
    <div class="g-needle"></div>
    <div class="g-time"><div class="clk ts">🕓 ${time}</div><div class="due">${due}</div></div>
    <div class="g-card"><div class="av ts">${card.i}</div><div><div class="nm ts">${card.n} <span class="rk">${card.rk}</span></div><div class="loc">📍 ${card.loc}</div></div><div class="cash">${card.cash}</div></div>
    <div class="g-radio"><div class="hd ts"><i class="live"></i>WALKIE · CREW<span class="ch">CH 1 · hold V</span></div>${msgs}</div>
    <div class="g-hotname ts"><div class="n">${hotName[0]}</div><div class="d">${hotName[1]}</div></div>
    <div class="g-hot">${slots}</div>
    <div class="g-x"></div>
    ${extra}
  </div>`;
}

const RADIO_BASE = [
  { who: 'GUS', c: C.gus, t: 'copy. i\'m in the, uh. garage.', cls: 'old' },
  { who: 'YOU', c: C.you, t: 'GRANDMA\'S CAR JUST PULLED IN. SHE\'S EARLY!!' },
];

function hud(html) { document.getElementById('hud').innerHTML = html; }
function pinHtml(camera, v, html, cls) { return pin(camera, v.isVector3 ? v : new THREE.Vector3(...v), html, { cls }); }

// =================================================================== BASEMENT (shared by GUS + MO)
// Floor y=0, ceiling y=2.8. Stair along the back wall from (x=3.2,y=0) up to (x=-1.5,y=2.8).
// Ceiling hole for the stairwell: x∈[-2.8,0.4], z∈[-6,-2.6]. Hallway floor above at y=3.0.
function basement(scene, { moOnStairs = true } = {}) {
  const concrete = T.concrete();
  const cinder = T.cinder();
  const wood = T.wood(0xa98060, 8);
  floor(scene, -6, -6, 6, 4, 0, concrete, 3);
  texWall(scene, [-6, -6], [6, -6], { h: 3.0, tex: cinder, size: 3 });
  texWall(scene, [-6, -6], [-6, 4], { h: 3.0, tex: cinder, size: 3 });
  texWall(scene, [6, -6], [6, 4], { h: 3.0, tex: cinder, size: 3, openings: [{ at: 5.0, w: 1.4, sill: 2.0, top: 2.6 }] });
  texWall(scene, [-6, 4], [6, 4], { h: 3.0, tex: cinder, size: 3 });

  // subfloor (ceiling) with stair hole
  const sub = T.wood(0xb8987a, 4);
  const ceil = (x1, z1, x2, z2) => {
    const m = surf(x2 - x1, 0.12, z2 - z1, sub, 2.5, { bump: 0.3 });
    m.position.set((x1 + x2) / 2, 2.86, (z1 + z2) / 2);
    scene.add(m);
  };
  ceil(-6, -2.6, 6, 4);
  ceil(-6, -6, -2.8, -2.6);
  ceil(0.4, -6, 6, -2.6);
  for (let x = -5.7; x < 6; x += 0.6) {
    const inHole = x > -2.9 && x < 0.5;
    const z1 = inHole ? -2.6 : -6;
    const j = surf(0.1, 0.26, 4 - z1, wood, 2, { bump: 0.4 });
    j.position.set(x, 2.67, (z1 + 4) / 2);
    scene.add(j);
  }
  const beam = surf(12, 0.32, 0.3, wood, 2);
  beam.position.set(0, 2.38, -2.5);
  scene.add(beam);
  // header framing the hole
  const hdr = surf(3.4, 0.26, 0.14, wood, 2);
  hdr.position.set(-1.2, 2.67, -2.6);
  scene.add(hdr);

  // the post under Kev's bathroom, half sawn through at y≈1.15
  const postM = tmat(T.wood(0xc2966a, 3), 0.3, 1.2, { bump: 0.5 });
  const lower = mesh(new THREE.BoxGeometry(0.28, 1.12, 0.28), postM);
  lower.position.set(0, 0.56 + 0.06, -2.5);
  scene.add(addOutlines(lower, 0.012));
  const upper = mesh(new THREE.BoxGeometry(0.28, 1.08, 0.28), postM);
  upper.position.set(0.015, 1.18 + 0.54 + 0.02, -2.5);
  upper.rotation.z = 0.025;
  scene.add(addOutlines(upper, 0.012));
  const kerf = box(0.16, 0.03, 0.3, 0x1a1008);
  kerf.position.set(0.07, 1.19, -2.5);
  kerf.userData.noOutline = true;
  scene.add(kerf);
  const foot = surf(0.6, 0.12, 0.6, concrete, 1);
  foot.position.set(0, 0.06, -2.5);
  scene.add(foot);
  // sawdust pile
  for (let i = 0; i < 220; i++) {
    const d = box(rr(0.015, 0.04), 0.012, rr(0.015, 0.04), 0xf3d9a8);
    const a = rr(0, Math.PI * 2);
    const r = Math.abs(rr(-0.5, 0.5)) * rr(0.2, 1);
    d.position.set(Math.cos(a) * r + 0.05, 0.01 + rr(0, 0.03) * (0.5 - r), -2.5 + Math.sin(a) * r);
    d.rotation.y = rr(0, 3);
    d.userData.noOutline = true;
    d.castShadow = false;
    scene.add(d);
  }
  // steel lally column (intact)
  const lally = cyl(0.09, 0.09, 2.25, 0x4a4f56);
  lally.material = mat(0x4a4f56, { metalness: 0.6, roughness: 0.5 });
  lally.position.set(4, 1.12, -2.5);
  scene.add(addOutlines(lally, 0.01));

  // stairs
  const treadM = tmat(T.wood(0xc98b55, 2), 0.6, 1, { bump: 0.4 });
  for (let i = 0; i < 10; i++) {
    const x = 3.2 - (i + 0.5) * 0.47;
    const y = (i + 1) * 0.28;
    const tr = mesh(new THREE.BoxGeometry(0.5, 0.05, 1.1), treadM);
    tr.position.set(x, y, -5.45);
    tr.userData.noOutline = true;
    scene.add(tr);
  }
  for (const z of [-4.88, -6.0]) {
    const str = surf(5.6, 0.25, 0.06, T.wood(0xb97c48, 2), 2);
    str.position.set(0.85, 1.35, z);
    str.rotation.z = -Math.atan2(2.8, 4.7);
    scene.add(str);
  }
  for (let i = 0; i < 5; i++) {
    const x = 3.0 - i * 1.0;
    const yb = (3.2 - x) * 0.596;
    const bal = box(0.05, 0.95, 0.05, 0x8a5a33);
    bal.position.set(x, yb + 0.48, -4.85);
    scene.add(bal);
  }
  const rail = box(5.5, 0.07, 0.08, 0x8a5a33);
  rail.position.set(0.85, 2.3, -4.85);
  rail.rotation.z = -Math.atan2(2.8, 4.7);
  scene.add(rail);

  // utilities on the right
  const heater = cyl(0.5, 0.5, 1.9, 0xe3e6ea);
  heater.material = mat(0xe8ebee, { metalness: 0.3, roughness: 0.35 });
  heater.position.set(5.1, 0.95, -4.6);
  scene.add(addOutlines(heater, 0.012));
  const furnace = box(1.2, 1.7, 1.1, 0x8d949c, { metalness: 0.4, roughness: 0.5 });
  furnace.position.set(5.1, 0.85, -2.9);
  scene.add(addOutlines(furnace, 0.012));
  const pilot = glow(0x5ab8ff, 0.05);
  pilot.position.set(4.48, 0.35, -2.9);
  scene.add(pilot);
  const duct = box(4.6, 0.4, 0.6, 0xb9c0c8, { metalness: 0.7, roughness: 0.35 });
  duct.position.set(3.6, 2.3, 1.8);
  scene.add(addOutlines(duct, 0.012));
  const copper = mat(0xc87533, { metalness: 0.8, roughness: 0.3 });
  for (const [z, y] of [[0.8, 2.48], [1.0, 2.48]]) {
    const p = mesh(new THREE.CylinderGeometry(0.03, 0.03, 11, 8), copper);
    p.rotation.z = Math.PI / 2;
    p.position.set(0, y, z);
    scene.add(p);
  }
  // Kev's toilet drain: white PVC down through the ceiling near the post, dripping
  const pvc = cyl(0.08, 0.08, 1.4, 0xf2f2ee);
  pvc.position.set(-0.9, 2.2, -2.2);
  scene.add(addOutlines(pvc, 0.01));
  const elbow = cyl(0.08, 0.08, 1.6, 0xf2f2ee);
  elbow.rotation.z = Math.PI / 2;
  elbow.position.set(-1.7, 1.5, -2.2);
  elbow.visible = false;
  scene.add(addOutlines(elbow, 0.01));
  const drip = sphere(0.035, 0x9fdcff);
  drip.scale.y = 1.5;
  drip.position.set(-0.9, 1.3, -2.2);
  scene.add(drip);

  // storage on the left: metal shelving, boxes, washer/dryer, bike
  const shelfM = mat(0x5b6168, { metalness: 0.6, roughness: 0.5 });
  for (const x of [-5.75, -4.35]) {
    for (const z of [-1.0, 0.6]) {
      const up = mesh(new THREE.BoxGeometry(0.04, 2.0, 0.04), shelfM);
      up.position.set(x, 1.0, z);
      scene.add(up);
    }
  }
  for (const y of [0.3, 0.95, 1.6]) {
    const sh = mesh(new THREE.BoxGeometry(1.45, 0.03, 1.65), shelfM);
    sh.position.set(-5.05, y, -0.2);
    scene.add(sh);
    for (let i = 0; i < 3; i++) {
      const bx = box(rr(0.35, 0.5), rr(0.25, 0.45), rr(0.35, 0.5), [0xc49a6c, 0xb8875a, 0xd4ab7c][i]);
      bx.position.set(-5.05 + rr(-0.3, 0.3), y + 0.17, -0.8 + i * 0.55);
      bx.rotation.y = rr(-0.2, 0.2);
      scene.add(addOutlines(bx, 0.01));
    }
  }
  const lbl = textPlane('XMAS', 0.36, 0.16, { w: 256, h: 112, fg: '#c22', font: '900 80px "Permanent Marker"' });
  lbl.position.set(-4.32, 1.15, -0.8);
  lbl.rotation.y = Math.PI / 2;
  scene.add(lbl);
  for (const [z, c] of [[2.0, 0xf4f4f0], [2.9, 0xf4f4f0]]) {
    const wm = box(0.8, 1.0, 0.8, c, { roughness: 0.35 });
    wm.position.set(-5.5, 0.5, z);
    scene.add(addOutlines(wm, 0.01));
    const door = mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 24), chrome(0xb0b8c0));
    door.rotation.y = Math.PI / 2;
    door.position.set(-5.09, 0.48, z);
    scene.add(door);
    const glassD = cyl(0.2, 0.2, 0.02, 0x2a3a4a);
    glassD.rotation.z = Math.PI / 2;
    glassD.position.set(-5.09, 0.48, z);
    scene.add(glassD);
  }
  const bike = new THREE.Group();
  for (const x of [-0.5, 0.5]) {
    const wh = mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 30), mat(0x222222));
    wh.position.set(x, 0.34, 0);
    bike.add(wh);
  }
  const frame = box(1.0, 0.05, 0.05, 0xff4d5e);
  frame.position.set(0, 0.6, 0);
  frame.rotation.z = 0.15;
  bike.add(frame);
  bike.position.set(-3.6, 0, 3.6);
  bike.rotation.y = 0.2;
  scene.add(bike);
  const paints = [[2.6, 3.5, 0xa8e6cf], [2.95, 3.6, 0xff8b7b], [2.75, 3.15, 0xc9b6ff]];
  for (const [x, z, c] of paints) {
    const pc = paintCan(c);
    pc.position.set(x, 0, z);
    scene.add(pc);
  }
  const sh = sawhorse(1.3);
  sh.position.set(1.8, 0, 1.6);
  sh.rotation.y = 0.5;
  scene.add(sh);
  const tb = toolbox(0xe8352f);
  tb.position.set(0.95, 0, -1.7);
  tb.rotation.y = -0.6;
  scene.add(tb);
  cord(scene, [[5.98, 0.4, 0.5], [5.2, 0.02, 0.8], [3.0, 0.02, 0.2], [1.6, 0.02, -1.2], [1.1, 0.06, -1.6]]);

  // raccoon eyes in the dark corner
  for (const s of [-1, 1]) {
    const e = glow(0xfff36b, 0.03);
    e.position.set(-5.8, 0.35, 3.75 + s * 0.06);
    scene.add(e);
  }

  // lights: bare bulb + evening sun through the little window + hallway glow above the stairs
  const cordL = cyl(0.01, 0.01, 0.55, 0x111111, 6);
  cordL.position.set(1.4, 2.55, -0.9);
  scene.add(cordL);
  const bulbM = glow(0xfff3c4, 0.07);
  bulbM.scale.y = 1.3;
  bulbM.position.set(1.4, 2.22, -0.9);
  scene.add(bulbM);
  const bl = new THREE.PointLight(0xffc77a, 9, 11, 1.4);
  bl.position.set(1.4, 2.12, -0.9);
  bl.castShadow = true;
  bl.shadow.mapSize.set(2048, 2048);
  bl.shadow.bias = -0.002;
  bl.shadow.radius = 4;
  scene.add(bl);
  motes(scene, [1.2, 1.6, -1.2], [3, 2, 3], 140, 0xffe2b0, 0.012);

  const sunWin = new THREE.SpotLight(0xff9a4a, 220, 30, 0.22, 0.5, 1.2);
  sunWin.position.set(10, 4.5, 6.5);
  sunWin.target.position.set(1.5, 0, 1.5);
  sunWin.castShadow = true;
  sunWin.shadow.mapSize.set(2048, 2048);
  scene.add(sunWin, sunWin.target);
  const winF = windowFrame(1.3, 0.55, { frame: 0xe8e2d6, glass: 0xffc48a, emissive: 0x3a1a00, sill: false });
  winF.rotation.y = -Math.PI / 2;
  winF.position.set(5.92, 2.3, 5.0 - 4);
  scene.add(winF);
  shaft(scene, [5.9, 2.3, 1.0], [1.6, 0.0, 2.1], 0.45, 0.7, { color: 0xff9a4a, opacity: 0.16 });
  motes(scene, [3.6, 1.2, 1.6], [4, 2.2, 1.0], 120, 0xffb070, 0.014);

  const hall = new THREE.PointLight(0xffe0a8, 30, 9, 1.3);
  hall.position.set(-1.2, 4.6, -4.4);
  scene.add(hall);
  // hallway above: floor ring around the hole + a wall and a lit doorway glimpse
  floor(scene, -4, -6, -2.8, -2.6, 3.0, T.wood(0xd9a066, 6), 2, 0.14);
  floor(scene, 0.4, -6, 2, -2.6, 3.0, T.wood(0xd9a066, 6), 2, 0.14);
  texWall(scene, [-4, -6], [2, -6], { y: 2.9, h: 2.6, tex: T.wallpaper(0xa8e6cf, 0x93d6bb), size: 1.6 });
  shaft(scene, [-1.2, 3.1, -4.4], [0.6, 0.0, -3.2], 0.9, 1.5, { color: 0xffe0a8, opacity: 0.08 });

  if (moOnStairs) {
    const mo = worker({ color: HEX.mo, stache: 'beard', skin: SKIN.mo, stacheColor: 0x2b1a10 });
    mo.position.set(1.75, 0.95 - 0.48, -5.45);
    face(mo, 0.5, -1.55);
    mo.rotation.x = 0.0;
    mo.userData.parts.torso.rotation.x = 0.45;
    mo.userData.parts.head.position.z += 0.35;
    mo.userData.parts.head.position.y -= 0.25;
    poseLeg(mo, 'L', 1.4);
    poseLeg(mo, 'R', 1.1);
    poseArm(mo, 'R', 1.4, 0.0);
    poseArm(mo, 'L', 1.4, 0.0);
    scene.add(addOutlines(mo));
  }
}

// =================================================================== SITE 1: KEV
function kevPOV() {
  const ctx = setup({ bg: 0xffcf9e, fog: null, sunPos: [5, 14, -25], sunInt: 2.4, sunColor: 0xffc890, hemiInt: 0.45, env: 0.45, shadowBox: 10, exposure: 1.0 });
  const { scene, camera, sun } = ctx;
  sun.target.position.set(0, 0, -3);
  skyDome(scene, { top: 0x6aa7e8, horizon: 0xffc690, sunDir: [-0.15, 0.45, 0.85] });
  clouds(scene, [[-30, 40, -160, 9], [40, 55, -170, 11], [5, 25, -120, 6]]);

  const tile = T.tile(0xffffff, 0xf6c9d2, 8);
  const wain = T.tile(0xbfe6f2, 0xaedcec, 6, 0xe7eef0);
  const plaster = T.plaster(0xfff0d2);
  floor(scene, -3, -5, 3, 2, 0, tile, 2.4, 0.2, { rough: 0.35, bump: 0.25 });
  texWall(scene, [-3, -5], [3, -5], { h: 2.9, tex: plaster, size: 2, openings: [{ at: 4.6, w: 1.5, sill: 1.05, top: 2.35 }] });
  texWall(scene, [-3, -5], [-3, 2], { h: 2.9, tex: plaster, size: 2 });
  texWall(scene, [3, -5], [3, 2], { h: 2.9, tex: plaster, size: 2 });
  // tile wainscot + chair rail
  const wz = surf(6, 1.1, 0.03, wain, 1.2, { rough: 0.3, bump: 0.2 });
  wz.position.set(-0.85, 0.55, -4.89);
  wz.scale.x = 0.7;
  scene.add(wz);
  const wzL = surf(0.03, 1.1, 7, wain, 1.2, { rough: 0.3, bump: 0.2 });
  wzL.position.set(-2.89, 0.55, -1.5);
  scene.add(wzL);
  const wzR = wzL.clone();
  wzR.position.x = 2.89;
  scene.add(wzR);
  trim(scene, -0.85, 1.12, -4.86, 4.2, 0.06, 0.06);
  trim(scene, -2.86, 1.12, -1.5, 0.06, 0.06, 7);
  trim(scene, 2.86, 1.12, -1.5, 0.06, 0.06, 7);
  const ceilM = surf(6, 0.12, 7, plaster, 3);
  ceilM.position.set(0, 2.96, -1.5);
  scene.add(ceilM);
  trim(scene, 0, 2.86, -4.88, 6, 0.08, 0.08);

  // window + curtains + the outside world
  const win = windowFrame(1.5, 1.3, { frame: 0xffffff, glass: 0xcfeaff });
  win.position.set(1.6, 1.7, -5.0);
  scene.add(win);
  const rod = cyl(0.02, 0.02, 2.2, 0xc9a227);
  rod.material = chrome(0xc9a227);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(1.6, 2.5, -4.85);
  scene.add(rod);
  for (const s of [-1, 1]) {
    const cur = mesh(new THREE.BoxGeometry(0.42, 1.7, 0.06), tmat(T.stripes(0xffffff, 0xff9fb0, 6), 1, 1, { rough: 0.9, bump: 0.1 }));
    cur.position.set(1.6 + s * 0.95, 1.62, -4.8);
    scene.add(addOutlines(cur, 0.008));
  }
  const ground = surf(120, 0.2, 120, T.grass(), 6);
  ground.position.set(0, -3.5, -40);
  scene.add(ground);
  for (const [x, z, s] of [[7, -16, 1.4], [-4, -20, 1.6], [14, -26, 1.8], [2, -30, 1.3]]) {
    const tr = treeFancy(s);
    tr.position.set(x, -3.4, z);
    scene.add(tr);
  }
  const nb = surf(9, 5, 7, T.siding(0xc9b6ff), 2);
  nb.position.set(-2, -1, -34);
  scene.add(nb);
  const nbr = mesh(new THREE.CylinderGeometry(0.01, 6.5, 2.6, 4), tmat(T.shingles(0x7a5b4a), 3, 2));
  nbr.rotation.y = Math.PI / 4;
  nbr.scale.set(1.0, 1, 0.75);
  nbr.position.set(-2, 2.8, -34);
  scene.add(nbr);

  // sunlight: shaft + floor patch + dust in the beam
  shaft(scene, [1.6, 1.7, -4.95], [0.85, 0.0, -2.3], 0.7, 0.9, { opacity: 0.045 });
  motes(scene, [1.3, 1.1, -3.9], [1.2, 1.6, 1.8], 220, 0xffe2b0, 0.014);

  // toilet being installed
  const t = toilet();
  t.position.set(-0.25, 0, -4.25);
  t.rotation.y = 0.06;
  scene.add(addOutlines(t, 0.012));
  for (const s of [-1, 1]) {
    const bolt = cyl(0.035, 0.035, 0.1, 0xc9a227);
    bolt.material = chrome(0xd9b437);
    bolt.position.set(-0.25 + 0.31 * s, 0.05, -3.98);
    scene.add(bolt);
    const cap = cyl(0.05, 0.05, 0.02, 0xffffff);
    cap.position.set(-0.25 + 0.31 * s, 0.11, -3.98);
    scene.add(cap);
  }
  const sig = textPlane('K.B.', 0.4, 0.2, { w: 256, h: 128, fg: '#4f8dff', font: '80px "Permanent Marker"' });
  sig.position.set(-0.25, 0.42, -3.7);
  sig.rotation.y = 0.06;
  scene.add(sig);
  const supply = cord(scene, [[0.3, 0.25, -4.86], [0.32, 0.2, -4.6], [0.2, 0.55, -4.45]], 0xdfe6ee, 0.018);
  supply.material = chrome();
  const valve = cyl(0.05, 0.05, 0.12, 0xdfe6ee);
  valve.material = chrome();
  valve.rotation.x = Math.PI / 2;
  valve.position.set(0.3, 0.25, -4.84);
  scene.add(valve);
  const tp = cyl(0.06, 0.06, 0.12, 0xffffff);
  tp.rotation.z = Math.PI / 2;
  tp.position.set(-1.05, 0.7, -4.82);
  scene.add(addOutlines(tp, 0.006));
  const plunger = new THREE.Group();
  const cup = mesh(new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc0281f, { roughness: 0.4 }));
  cup.rotation.x = Math.PI;
  cup.position.y = 0.12;
  plunger.add(cup);
  const stick = cyl(0.018, 0.018, 0.75, 0xd9a066);
  stick.position.y = 0.5;
  plunger.add(stick);
  plunger.position.set(0.55, 0, -4.6);
  plunger.rotation.z = 0.12;
  scene.add(addOutlines(plunger, 0.008));
  // floor crack + rising sawdust from below
  const crackPts = [[0.25, -3.6], [0.05, -3.25], [0.3, -2.95], [0.0, -2.55], [0.22, -2.2], [0.05, -1.95]];
  for (let i = 0; i < crackPts.length - 1; i++) {
    const [x1, z1] = crackPts[i];
    const [x2, z2] = crackPts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const c = box(0.025, 0.012, len, 0x1a1210);
    c.position.set((x1 + x2) / 2, 0.006, (z1 + z2) / 2);
    c.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    c.userData.noOutline = true;
    scene.add(c);
  }
  motes(scene, [0.15, 0.35, -2.9], [0.5, 0.7, 1.4], 120, 0xf3d9a8, 0.03);

  // vanity + mirror on the left of the back wall
  const vanity = box(1.3, 0.85, 0.55, 0xffe08a, { roughness: 0.6 });
  vanity.position.set(-2.1, 0.43, -4.6);
  scene.add(addOutlines(vanity, 0.01));
  for (const s of [-1, 1]) {
    const dr = box(0.58, 0.7, 0.02, 0xffd36a, { roughness: 0.55 });
    dr.position.set(-2.1 + s * 0.31, 0.43, -4.32);
    scene.add(dr);
    const kn = sphere(0.025, 0xc9a227);
    kn.material = chrome(0xc9a227);
    kn.position.set(-2.1 + s * 0.08, 0.55, -4.3);
    scene.add(kn);
  }
  const counter = box(1.38, 0.05, 0.6, 0xf3f0ea, { roughness: 0.25 });
  counter.position.set(-2.1, 0.88, -4.6);
  scene.add(addOutlines(counter, 0.008));
  const basin = cyl(0.22, 0.18, 0.1, 0xffffff);
  basin.position.set(-2.1, 0.94, -4.6);
  scene.add(addOutlines(basin, 0.008));
  const faucet = cyl(0.02, 0.02, 0.22, 0xdfe6ee);
  faucet.material = chrome();
  faucet.position.set(-2.1, 1.02, -4.82);
  scene.add(faucet);
  const mirror = box(0.9, 1.0, 0.04, 0xbfe2f2, { metalness: 0.1, roughness: 0.08 });
  mirror.position.set(-2.1, 1.75, -4.86);
  scene.add(addOutlines(mirror, 0.01));
  const cupT = cyl(0.04, 0.035, 0.1, 0x7fd3ff);
  cupT.position.set(-1.75, 0.96, -4.72);
  scene.add(cupT);
  const brush = box(0.012, 0.18, 0.012, 0xff4d5e);
  brush.position.set(-1.75, 1.05, -4.72);
  brush.rotation.z = 0.2;
  scene.add(brush);
  const soap = box(0.07, 0.15, 0.05, 0xff9fb0);
  soap.position.set(-2.45, 0.98, -4.7);
  scene.add(addOutlines(soap, 0.006));

  // tub + shower curtain on the left wall
  const tub = bathtub();
  tub.scale.setScalar(0.85);
  tub.position.set(-2.15, 0, -1.4);
  scene.add(addOutlines(tub, 0.012));
  const scur = mesh(new THREE.PlaneGeometry(1.5, 1.8, 20, 1), tmat(T.stripes(0xffffff, 0x8fd3ff, 10), 1, 1, { rough: 0.8, bump: 0 }));
  const pa = scur.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 14) * 0.05);
  scur.geometry.computeVertexNormals();
  scur.material.side = THREE.DoubleSide;
  scur.rotation.y = Math.PI / 2;
  scur.position.set(-1.38, 1.15, -2.0);
  scene.add(scur);
  const srod = cyl(0.015, 0.015, 2.8, 0xdfe6ee);
  srod.material = chrome();
  srod.rotation.x = Math.PI / 2;
  srod.position.set(-1.38, 2.08, -1.4);
  scene.add(srod);

  // construction clutter
  const old = toilet();
  old.traverse((o) => { if (o.isMesh && !o.userData.isOutline) o.material = mat(0xd9cfa8, { roughness: 0.9 }); });
  old.position.set(2.3, 0, -2.4);
  old.rotation.y = -1.9;
  old.rotation.z = 0.08;
  scene.add(addOutlines(old, 0.012));
  cautionTape(scene, [[1.9, 0.5, -2.1], [2.4, 0.62, -1.95], [2.75, 0.55, -2.45], [2.5, 0.45, -2.85], [1.95, 0.5, -2.7], [1.9, 0.5, -2.1]]);
  const tb = toolbox();
  tb.position.set(1.15, 0, -3.35);
  tb.rotation.y = -0.4;
  scene.add(tb);
  const cof = coffee();
  cof.position.set(1.6, 0, -3.0);
  scene.add(cof);
  const tm = tapeMeasure();
  tm.position.set(0.75, 0, -2.8);
  tm.rotation.y = 0.7;
  scene.add(tm);
  const wax = box(0.2, 0.08, 0.2, 0xffd23f);
  wax.position.set(-0.95, 0.04, -3.6);
  wax.rotation.y = 0.3;
  scene.add(addOutlines(wax, 0.006));
  const tarp = mesh(new THREE.PlaneGeometry(2.0, 1.6, 24, 18), mat(0xe9e4d8, { roughness: 0.95, side: THREE.DoubleSide }));
  const tpa = tarp.geometry.attributes.position;
  for (let i = 0; i < tpa.count; i++) tpa.setZ(i, Math.max(0, Math.sin(tpa.getX(i) * 5 + tpa.getY(i) * 3) * 0.04 + rr(0, 0.015)));
  tarp.geometry.computeVertexNormals();
  tarp.rotation.x = -Math.PI / 2;
  tarp.position.set(1.8, 0.02, -0.9);
  tarp.rotation.z = 0.2;
  scene.add(tarp);
  const pcan = paintCan(0xc9b6ff);
  pcan.position.set(2.2, 0.03, -0.6);
  scene.add(pcan);
  const ol = outlet();
  ol.position.set(2.88, 0.35, -3.6);
  ol.rotation.y = -Math.PI / 2;
  scene.add(ol);
  const sw = outlet(false);
  sw.position.set(2.88, 1.3, -0.5);
  sw.rotation.y = -Math.PI / 2;
  scene.add(sw);
  cord(scene, [[2.86, 0.33, -3.6], [2.6, 0.02, -3.4], [2.0, 0.02, -3.8], [1.4, 0.02, -3.9], [0.9, 0.05, -3.7]]);
  const worklight = new THREE.Group();
  const wlb = box(0.3, 0.25, 0.12, 0xffd23f, { roughness: 0.5 });
  wlb.position.y = 0.16;
  worklight.add(wlb);
  const wlf = glow(0xfff6dc, 0.1);
  wlf.scale.set(1.2, 0.9, 0.2);
  wlf.position.set(0, 0.16, 0.07);
  worklight.add(wlf);
  worklight.position.set(0.95, 0, -3.7);
  worklight.rotation.y = -0.9;
  scene.add(addOutlines(worklight, 0.008));
  const wl = new THREE.PointLight(0xfff0d0, 4, 4, 1.5);
  wl.position.set(0.7, 0.3, -3.8);
  scene.add(wl);
  const towel = box(0.45, 0.6, 0.05, 0x8fd3ff, { roughness: 1 });
  towel.position.set(2.86, 1.45, -1.8);
  towel.rotation.y = -Math.PI / 2;
  scene.add(addOutlines(towel, 0.008));
  const art = pictureFrame(0.5, 0.4, 0xffffff, 0x9fd6ff);
  art.position.set(2.88, 1.85, -3.3);
  art.rotation.y = -Math.PI / 2;
  scene.add(art);
  const fixture = glow(0xfff4dc, 0.22);
  fixture.scale.y = 0.35;
  fixture.position.set(0, 2.88, -2.0);
  scene.add(fixture);
  const ceilLight = new THREE.PointLight(0xffe6c0, 6, 8, 1.4);
  ceilLight.position.set(0, 2.6, -2.0);
  scene.add(ceilLight);

  fpCam(camera, [0.15, 1.5, -1.25], [-0.2, 0.42, -4.0], 70);
  camera.add(fpArm(HEX.kev, SKIN.kev, { pos: [0.3, -0.36, -0.62], rot: [-0.35, 0.35, 0] }));
  const wr = wrench();
  wr.position.set(0.27, -0.33, -0.72);
  wr.rotation.set(-0.6, 0.5, 0.7);
  camera.add(wr);
  camera.add(fpArm(HEX.kev, SKIN.kev, { pos: [-0.42, -0.38, -0.66], rot: [-0.3, -0.4, 0] }));

  renderFx(ctx, { ao: 1.0, bloom: 0.22, bloomThreshold: 0.92, grade: { vig: 0.38, warm: 0.035, sat: 1.12 } });

  pinHtml(camera, [0.06, 0.06, -3.98], `${ring(0.75, '3/4', C.kev)}<div class="g-acts">
      <div class="g-act ts"><span class="g-key">E</span>Hold · tighten bolt <span class="s">proper · +$30</span></div>
      <div class="g-act hack ts"><span class="g-key">Q</span>🤫 Skip the last bolt <span class="s">instant</span></div></div>`, 'g-int');
  pinHtml(camera, [0.2, 0.0, -2.35], `${waves}SAWING<small>· somewhere below you</small>`, 'g-snd');

  hud(gameHud({
    pc: C.kev,
    obj: {
      kick: 'Work order #14', kickR: 'from GUS 👷', title: 'Install the toilet', sub: 'Upstairs bath · Grandma WILL flush this',
      steps: [{ t: 'Haul out the old toilet', st: 'done' }, { t: 'Set the wax ring', st: 'done' }, { t: 'Tighten floor bolts', st: 'cur', m: '3 / 4' }, { t: 'Hook up water line' }, { t: 'Caulk the base' }],
    },
    compass: { labels: [[12, 'W'], [37, 'NW'], [62, 'N'], [87, 'NE']], marks: [[30, '🚐', C.you], [80, '👵', C.red], [55, '🔊', '#ffd23f']] },
    time: '4:46 PM', due: 'Client in 14:00',
    card: { i: 'K', n: 'KEV', rk: '#1', loc: 'Upstairs bath', cash: '$1,840' },
    radio: [...RADIO_BASE, { who: 'KEV', c: C.kev, t: 'uh. does anyone else hear SAWING??' }],
    hot: [{ i: '🔧', on: true }, { i: '🪛' }, { i: '📱' }, { i: '📏' }],
    hotName: ['Pipe Wrench', 'Hold E on a bolt'],
  }));
  done();
}

// =================================================================== SITE 2: GUS
function gusPOV() {
  const ctx = setup({ bg: 0x0d0a10, fog: [0x140e12, 7, 16], sunInt: 0, hemiSky: 0x7f8cb0, hemiGround: 0x2a1c14, hemiInt: 0.12, env: 0.12, exposure: 1.1 });
  const { scene, camera } = ctx;
  basement(scene, { moOnStairs: true });

  fpCam(camera, [0.55, 1.55, -1.45], [0.95, 1.35, -5.4], 72);
  const saw = handsaw();
  saw.position.set(0.16, -0.27, -0.38);
  saw.rotation.set(0.05, 0.12, 0.08);
  camera.add(saw);
  camera.add(fpArm(HEX.gus, SKIN.gus, { pos: [0.2, -0.34, -0.42], rot: [-0.1, 0.25, 0] }));
  camera.add(fpArm(HEX.gus, SKIN.gus, { pos: [-0.36, -0.3, -0.62], rot: [-0.05, -0.4, 0] }));

  renderFx(ctx, { ao: 1.2, aoRadius: 0.7, bloom: 0.6, bloomThreshold: 0.7, grade: { vig: 0.55, warm: 0.05, lift: 0.03 } });

  pinHtml(camera, [0.0, 1.19, -2.36], `${ring(0.6, '60%', C.gus)}<div class="g-acts">
      <div class="g-act ts"><span class="g-key">F</span>Hold · saw through the post <span class="s">sabotage</span></div>
      <div class="g-act danger ts"><span class="g-key">!</span>LOUD · carries through the floor</div></div>`, 'g-int');
  pinHtml(camera, [1.6, 1.0, -5.4], `${waves}CREAK<small>· the stairs?</small>`, 'g-snd');

  hud(gameHud({
    pc: C.gus,
    obj: {
      kick: '🤫 Side hustle · secret', kickR: '+$400', title: 'Make something fall', sub: '…during the walkthrough. Blame someone else.',
      steps: [{ t: 'Ditch your work order (sweep garage)', st: 'done', secret: true }, { t: 'Weaken the post under Kev\'s bath', st: 'cur', m: '60%', secret: true }, { t: 'Get back upstairs unseen', secret: true }],
    },
    compass: { labels: [[18, 'W'], [43, 'NW'], [68, 'N'], [93, 'NE']], marks: [[52, '🧰', C.kev], [88, '🚐', C.you]] },
    time: '4:46 PM', due: 'Client in 14:00',
    card: { i: 'G', n: 'GUS', rk: '#4 · FOREMAN', loc: 'Basement ("garage")', cash: '$990' },
    radio: [{ who: 'KEV', c: C.kev, t: 'uh. does anyone else hear SAWING??' }, ...RADIO_BASE.slice(0, 1), { who: 'YOU', c: C.you, t: 'GRANDMA\'S CAR JUST PULLED IN. SHE\'S EARLY!!', cls: 'old' }],
    hot: [{ i: '🪚', on: true }, { i: '🔧' }, { i: '📱' }, { i: '🧹' }],
    hotName: ['Hand Saw', 'Fast · very loud'],
  }));
  done();
}

// =================================================================== SITE 3: MO
function moPOV() {
  const ctx = setup({ bg: 0x0d0a10, fog: [0x140e12, 8, 18], sunInt: 0, hemiSky: 0x7f8cb0, hemiGround: 0x2a1c14, hemiInt: 0.16, env: 0.14, exposure: 1.1 });
  const { scene, camera, renderer } = ctx;
  basement(scene, { moOnStairs: false });

  // Gus at the post, sawing, facing the stairs but staring at his work
  const gus = worker({ color: HEX.gus, stache: 'pencil', skin: SKIN.gus });
  gus.position.set(0.5, 0, -1.55);
  face(gus, 0, -2.5);
  gus.userData.parts.head.rotation.x = 0.4;
  gus.userData.parts.torso.rotation.x = 0.15;
  poseArm(gus, 'R', 1.25, -0.35);
  poseArm(gus, 'L', 1.4, 0.15);
  scene.add(addOutlines(gus));
  const saw = handsaw();
  saw.position.set(0.24, 1.2, -2.2);
  saw.rotation.set(0, Math.PI / 2 + 0.4, 0.1);
  scene.add(saw);

  fpCam(camera, [1.72, 2.2, -5.25], [0.7, 1.35, -1.9], 70);

  // phone screen = zoomed live view
  const rt = new THREE.WebGLRenderTarget(320, 620, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const pcam = new THREE.PerspectiveCamera(30, 320 / 620, 0.05, 100);
  pcam.position.set(1.68, 2.12, -5.05);
  pcam.lookAt(0.45, 1.45, -1.8);
  const ph = phoneMesh(rt.texture);
  ph.position.set(0.17, -0.13, -0.42);
  ph.rotation.set(-0.08, -0.25, 0.08);
  camera.add(ph);
  camera.add(fpArm(HEX.mo, SKIN.mo, { pos: [0.27, -0.3, -0.36], rot: [0.55, 0.45, 0] }));
  camera.add(fpArm(HEX.mo, SKIN.mo, { pos: [0.05, -0.31, -0.36], rot: [0.55, -0.55, 0] }));
  ph.visible = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, pcam);
  renderer.setRenderTarget(null);
  ph.visible = true;

  renderFx(ctx, { ao: 1.1, bloom: 0.55, bloomThreshold: 0.72, grade: { vig: 0.55, warm: 0.04, lift: 0.03 } });

  const top = new THREE.Vector3(-0.065, 0.135, 0.012);
  ph.localToWorld(top);
  pinHtml(camera, top, '<i></i>REC · 00:07', 'g-rec');
  const gh = new THREE.Vector3();
  gus.userData.parts.head.getWorldPosition(gh);
  pinHtml(camera, [-1.9, 1.7, -1.6], `<div class="g-acts">
      <div class="g-act ts"><span class="g-key">LMB</span>📸 Snap evidence</div>
      <div class="g-act ts"><span class="g-key">R</span>Report Gus <span class="s">+$300 · needs photo</span></div>
      <div class="g-act hack ts"><span class="g-key">B</span>🤐 Blackmail him instead…</div></div>`, 'g-int');
  pinHtml(camera, [0.5, 2.75, -1.55], '<i style="--c:#a65cff"></i>GUS', 'g-tag');

  hud(gameHud({
    pc: C.mo,
    obj: {
      kick: 'Work order #11', kickR: 'from GUS 👷', title: 'Grab the shop-vac', sub: 'Basement · "it\'s by the furnace" — Gus',
      steps: [{ t: 'Find the shop-vac', st: 'cur' }, { t: 'Bring it to the kitchen' }, { t: '👀 You witnessed sabotage', st: 'cur', m: 'NEW' }],
    },
    compass: { labels: [[10, 'N'], [35, 'NE'], [60, 'E'], [85, 'SE']], marks: [[50, '🪚', C.gus], [22, '🧰', C.kev]] },
    time: '4:46 PM', due: 'Client in 14:00',
    card: { i: 'M', n: 'MO', rk: '#3', loc: 'Basement stairs', cash: '$1,320' },
    radio: [...RADIO_BASE, { who: 'KEV', c: C.kev, t: 'uh. does anyone else hear SAWING??' }],
    hot: [{ i: '📱', on: true }, { i: '🔦' }, { i: '🧽' }, { i: '📏' }],
    hotName: ['Phone · Camera', 'Photos are timestamped evidence'],
    extra: '<div class="g-toast" style="top:auto;bottom:150px;background:linear-gradient(90deg,rgba(40,170,90,0),rgba(40,170,90,.85) 18%,rgba(40,170,90,.85) 82%,rgba(40,170,90,0))"><div class="a">👀 GUS HASN\'T SEEN YOU</div><div class="b">stay quiet · don\'t step on the creaky stair</div></div>',
  }));
  done();
}

// =================================================================== SITE 4: YOU
function youPOV() {
  const ctx = setup({ bg: 0xffc79a, fog: [0xffc8a0, 45, 170], sunPos: [-60, 16, -25], sunInt: 3.6, sunColor: 0xffb070, hemiSky: 0x9cc2ff, hemiGround: 0x7a5a3a, hemiInt: 0.75, env: 0.35, shadowBox: 40, exposure: 1.0 });
  const { scene, camera, sun } = ctx;
  sun.target.position.set(0, 0, 3);
  skyDome(scene, { top: 0x4f86d6, horizon: 0xffbe8a, bottom: 0xf0a878, sunDir: [-0.9, 0.16, -0.38], sunColor: 0xffc070 });
  clouds(scene, [[-120, 70, -260, 16], [60, 90, -300, 20], [-260, 60, -60, 14], [180, 75, -200, 15], [-40, 110, -380, 22]]);

  const grass = T.grass();
  const g = surf(240, 0.2, 240, grass, 5);
  g.position.set(0, -0.1, 0);
  scene.add(g);
  const road = surf(240, 0.06, 7, T.asphalt(), 4, { rough: 0.9 });
  road.position.set(0, 0.03, 19);
  scene.add(road);
  for (let x = -110; x < 110; x += 5) {
    const dash = box(2.4, 0.07, 0.18, 0xfff1c0);
    dash.position.set(x, 0.05, 19);
    dash.userData.noOutline = true;
    scene.add(dash);
  }
  for (const z of [15.4, 22.6]) {
    const curb = surf(240, 0.18, 0.3, T.concrete(0xc9c4ba), 2);
    curb.position.set(0, 0.09, z);
    scene.add(curb);
  }
  const walk = surf(240, 0.08, 1.8, T.pavers(), 1.6);
  walk.position.set(0, 0.04, 13.8);
  scene.add(walk);
  const drive = surf(5.2, 0.07, 15.3, T.concrete(0xcfcac0), 3);
  drive.position.set(4.6, 0.035, 7.7);
  scene.add(drive);
  const path = surf(1.4, 0.06, 6.0, T.pavers(), 1.4);
  path.position.set(-2.2, 0.035, 3.0);
  scene.add(path);

  // ---- the job-site house
  const sid = T.siding(0xffd2a0);
  const H1 = 6.4;
  const hx0 = -9, hx1 = 8, hz0 = -11, hz1 = 0;
  texWall(scene, [hx0, hz1], [hx1, hz1], {
    h: H1, t: 0.25, tex: sid, size: 3,
    openings: [{ at: 2.0, w: 1.6, sill: 0.9, top: 2.4 }, { at: 6.8, w: 1.3, top: 2.4 }, { at: 13.6, w: 4.2, top: 2.9 }],
  });
  // upper floor windows
  const upWins = [-6.9, -2.2, 1.6, 6.0];
  for (const x of upWins) {
    const lit = x === 1.6;
    const wf = windowFrame(1.4, 1.3, { frame: 0xffffff, glass: lit ? 0xffe2a0 : 0x7fb3d9, emissive: lit ? 0x8a5a10 : 0x000000 });
    wf.position.set(x, 4.8, hz1 + 0.16);
    scene.add(wf);
    for (const s of [-1, 1]) {
      const sh = box(0.45, 1.4, 0.06, 0x3a5a8a, { roughness: 0.6 });
      sh.position.set(x + s * 1.0, 4.8, hz1 + 0.17);
      scene.add(addOutlines(sh, 0.008));
    }
  }
  const lowWin = windowFrame(1.6, 1.5, { frame: 0xffffff, glass: 0x7fb3d9 });
  lowWin.position.set(-7.0, 1.65, hz1 + 0.16);
  scene.add(lowWin);
  // Kev silhouette in the lit bathroom window
  const ks = sphere(0.32, 0x3a2a20);
  ks.position.set(1.4, 4.75, hz1 - 0.3);
  ks.userData.noOutline = true;
  scene.add(ks);
  const kl = new THREE.PointLight(0xffd08a, 6, 4);
  kl.position.set(1.6, 4.9, hz1 - 1.0);
  scene.add(kl);
  // basement window glowing at ground level
  const bw = windowFrame(1.0, 0.35, { frame: 0xe8e2d6, glass: 0xffb860, emissive: 0xa0500a, mull: false, sill: false });
  bw.position.set(-4.4, 0.32, hz1 + 0.16);
  scene.add(bw);
  // side + back walls (simple), floor line trim, corner boards
  const side = surf(0.25, H1, 11, sid, 3);
  side.position.set(hx1, H1 / 2, (hz0 + hz1) / 2);
  scene.add(side);
  const side2 = side.clone();
  side2.position.x = hx0;
  scene.add(side2);
  trim(scene, (hx0 + hx1) / 2, 3.2, hz1 + 0.15, hx1 - hx0, 0.18, 0.08);
  trim(scene, hx0, H1 / 2, hz1 + 0.15, 0.25, H1, 0.12);
  trim(scene, hx1, H1 / 2, hz1 + 0.15, 0.25, H1, 0.12);
  const found = surf(hx1 - hx0 + 0.3, 0.5, 0.3, T.concrete(0xb9b4aa), 1.5);
  found.position.set((hx0 + hx1) / 2, 0.2, hz1 + 0.05);
  scene.add(found);
  // gable roof
  const shg = T.shingles(0x5b6d9e);
  const rw = 7.0;
  const pitch = 0.62;
  for (const s of [-1, 1]) {
    const plane = mesh(new THREE.BoxGeometry(hx1 - hx0 + 1.2, 0.16, rw), tmat(shg, 6, 2.5, { bump: 0.8 }));
    plane.position.set((hx0 + hx1) / 2, H1 + Math.sin(pitch) * rw / 2, (hz0 + hz1) / 2 + s * Math.cos(pitch) * rw / 2);
    plane.rotation.x = s * pitch;
    plane.userData.noOutline = true;
    scene.add(plane);
  }
  const fascia = trim(scene, (hx0 + hx1) / 2, H1 + 0.05, hz1 + 0.75, hx1 - hx0 + 1.2, 0.22, 0.1);
  fascia.userData.noOutline = false;
  const gutter = box(hx1 - hx0 + 1.2, 0.14, 0.16, 0xf2f2ee);
  gutter.position.set((hx0 + hx1) / 2, H1 - 0.05, hz1 + 0.85);
  scene.add(gutter);
  const down = box(0.12, H1, 0.12, 0xf2f2ee);
  down.position.set(hx1 + 0.4, H1 / 2, hz1 + 0.8);
  scene.add(down);
  const chim = surf(1.0, 3.2, 1.0, T.cinder(0xb4553f), 1);
  chim.position.set(-5.5, H1 + 3.0, -3.2);
  scene.add(chim);
  // blue tarp on part of the roof (it's a job site)
  const tarp = mesh(new THREE.PlaneGeometry(5, 3.6, 20, 14), mat(0x2f74d0, { roughness: 0.6, side: THREE.DoubleSide }));
  const tpa = tarp.geometry.attributes.position;
  for (let i = 0; i < tpa.count; i++) tpa.setZ(i, Math.sin(tpa.getX(i) * 3) * 0.08 + Math.cos(tpa.getY(i) * 4) * 0.06);
  tarp.geometry.computeVertexNormals();
  tarp.position.set(3.2, H1 + 1.4, -1.25);
  tarp.rotation.x = -Math.PI / 2 + pitch;
  scene.add(tarp);
  // porch: roof, columns, steps, door
  const door = box(1.1, 2.3, 0.08, 0xff6f91, { roughness: 0.5 });
  door.position.set(-2.2, 1.15, hz1 + 0.05);
  scene.add(addOutlines(door, 0.01));
  const knob = sphere(0.05, 0xc9a227);
  knob.material = chrome(0xc9a227);
  knob.position.set(-1.8, 1.15, hz1 + 0.12);
  scene.add(knob);
  const porch = surf(3.4, 0.3, 2.2, T.wood(0xc9b8a0, 6), 1.5);
  porch.position.set(-2.2, 0.15, 1.1);
  scene.add(porch);
  for (let i = 0; i < 2; i++) {
    const st = surf(1.8, 0.16, 0.36, T.concrete(0xcfcac0), 1);
    st.position.set(-2.2, 0.08 + (1 - i) * 0.0, 2.35 + i * 0.36);
    st.scale.y = i === 0 ? 1.6 : 1;
    scene.add(st);
  }
  const proof = box(3.8, 0.18, 2.5, 0xffffff);
  proof.position.set(-2.2, 2.75, 1.05);
  scene.add(addOutlines(proof, 0.01));
  for (const x of [-3.7, -0.7]) {
    const col = cyl(0.11, 0.13, 2.45, 0xffffff);
    col.position.set(x, 1.5, 2.0);
    scene.add(addOutlines(col, 0.01));
  }
  const lamp = glow(0xffd88a, 0.1);
  lamp.position.set(-3.1, 2.0, hz1 + 0.2);
  scene.add(lamp);
  // garage door
  const gdoor = surf(4.0, 2.8, 0.1, T.siding(0xf4f0e8), 1.4);
  gdoor.position.set(4.6, 1.42, hz1 + 0.06);
  scene.add(gdoor);

  // ---- scaffolding on the left of the house
  const pipeM = mat(0x9aa3ad, { metalness: 0.7, roughness: 0.4 });
  for (const x of [-8.6, -6.3, -4.0]) {
    for (const z of [0.5, 1.6]) {
      const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.4, 8), pipeM);
      p.position.set(x, 3.2, z);
      scene.add(p);
    }
  }
  for (const y of [2.0, 4.0]) {
    for (const z of [0.5, 1.6]) {
      const hb = mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.8, 8), pipeM);
      hb.rotation.z = Math.PI / 2;
      hb.position.set(-6.3, y, z);
      scene.add(hb);
    }
    const plank = surf(4.8, 0.06, 1.0, T.wood(0xd9b07a, 2), 2);
    plank.position.set(-6.3, y + 0.05, 1.05);
    scene.add(plank);
  }
  const brace = mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 8), pipeM);
  brace.position.set(-7.45, 3.0, 1.6);
  brace.rotation.z = 0.8;
  scene.add(brace);
  const bucketS = bucket(0xff8a3d, 0xffffff);
  bucketS.position.set(-5.2, 4.08, 1.0);
  scene.add(addOutlines(bucketS, 0.01));

  // ---- yard: van, pallets, dumpster, porta-potty, sign, cones, landscaping
  const v = van('DALE & SONS\n(NO SONS)');
  v.position.set(-11.5, 0, 9.0);
  v.rotation.y = 0.12;
  scene.add(addOutlines(v, 0.02));
  const p1 = pallet(10);
  p1.position.set(-5.4, 0, 6.6);
  p1.rotation.y = 0.2;
  scene.add(p1);
  const p2 = pallet(5, 0xc9b6ff);
  p2.position.set(-6.8, 0, 5.0);
  p2.rotation.y = -0.3;
  scene.add(p2);
  const wb = wheelbarrow();
  wb.position.set(-3.6, 0, 7.4);
  wb.rotation.y = 0.8;
  scene.add(wb);
  const dump = new THREE.Group();
  const db = box(4.0, 1.5, 2.0, 0x2f7a42, { roughness: 0.5, metalness: 0.3 });
  db.position.y = 0.85;
  dump.add(db);
  for (let i = 0; i < 14; i++) {
    const deb = box(rr(0.2, 1.4), rr(0.08, 0.3), rr(0.15, 0.5), [0xd9a066, 0xeceff3, 0x8a8f96, 0xd9cfa8][i % 4]);
    deb.position.set(rr(-1.6, 1.6), 1.6 + rr(0, 0.35), rr(-0.7, 0.7));
    deb.rotation.set(rr(-0.4, 0.4), rr(0, 3), rr(-0.6, 0.6));
    dump.add(deb);
  }
  dump.position.set(11.5, 0, 2.8);
  dump.rotation.y = -0.25;
  scene.add(addOutlines(dump, 0.012));
  const pp = new THREE.Group();
  const ppb = box(1.3, 2.4, 1.3, 0x3a7fe0, { roughness: 0.5 });
  ppb.position.y = 1.2;
  pp.add(ppb);
  const ppr = cyl(0.78, 0.78, 0.16, 0xf4f4f4);
  ppr.position.y = 2.46;
  pp.add(ppr);
  const occ = textPlane('OCCUPIED', 0.7, 0.18, { w: 256, h: 64, bg: '#e8352f', fg: '#fff', font: '900 40px Inter' });
  occ.position.set(0, 1.4, 0.66);
  pp.add(occ);
  pp.position.set(13.8, 0, -2.8);
  pp.rotation.y = -0.5;
  scene.add(addOutlines(pp, 0.012));
  const sign = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = box(0.06, 1.0, 0.06, 0xffffff);
    leg.position.set(s * 0.6, 0.5, 0);
    sign.add(leg);
  }
  const board = textPlane('DALE & SONS\nRenovations in progress', 1.6, 0.8, { w: 512, h: 256, bg: '#ff8a3d', fg: '#fff', font: '900 52px "Lilita One"' });
  board.position.y = 1.15;
  sign.add(board);
  sign.position.set(1.0, 0, 11.5);
  sign.rotation.y = -0.25;
  scene.add(sign);
  for (const [x, z] of [[7.6, 13.0], [7.6, 10.0], [1.8, 13.2]]) {
    const cn = trafficCone();
    cn.position.set(x, 0.05, z);
    scene.add(cn);
  }
  cautionTape(scene, [[-3.9, 0.95, 2.4], [-3.0, 0.8, 3.4], [-1.4, 0.8, 3.4], [-0.5, 0.95, 2.4]]);
  const mb = mailbox();
  mb.position.set(7.8, 0, 12.6);
  scene.add(mb);
  const gn = gnome();
  gn.position.set(-0.4, 0, 4.5);
  gn.scale.setScalar(1.3);
  scene.add(addOutlines(gn, 0.012));
  const hd = hedge(5);
  hd.position.set(-6.8, 0, 0.9);
  scene.add(hd);
  const fl = flowers(60, [5, 0.8]);
  fl.position.set(-6.8, 0, 1.6);
  scene.add(fl);
  const hd2 = hedge(3);
  hd2.position.set(0.4, 0, 0.9);
  scene.add(hd2);
  for (const [x, z, s] of [[-17, -2, 1.7], [16, -6, 1.5], [-22, 9, 1.4], [21, 7, 1.3], [-14, -16, 2.0], [9, -18, 1.9]]) {
    const tr = treeFancy(s);
    tr.position.set(x, 0, z);
    scene.add(tr);
  }
  // neighbours
  for (const [x, c, rc] of [[-28, 0xc9b6ff, 0x7a5b4a], [27, 0xa8e6cf, 0x9e5b4a]]) {
    const nb = surf(12, 5.5, 9, T.siding(c), 3);
    nb.position.set(x, 2.75, -6);
    scene.add(nb);
    const nr = mesh(new THREE.CylinderGeometry(0.01, 8.6, 3.2, 4), tmat(T.shingles(rc), 4, 2));
    nr.rotation.y = Math.PI / 4;
    nr.scale.set(1.0, 1, 0.75);
    nr.position.set(x, 7.1, -6);
    scene.add(nr);
  }
  // power poles + sagging lines, street lamps
  for (const x of [-26, 0, 26]) {
    const pole = powerPole(9);
    pole.position.set(x, 0, 24.2);
    scene.add(pole);
  }
  for (const dx of [-0.9, 0, 0.9]) {
    for (const [a, b] of [[-26, 0], [0, 26], [26, 52]]) {
      cord(scene, [[a, 8.55, 24.2 + dx * 0.0], [(a + b) / 2, 7.6, 24.2], [b, 8.55, 24.2]].map((p, i) => [p[0], p[1], p[2] + dx * 0.02 + (i === 1 ? 0 : 0)]).map((p) => [p[0] + dx, p[1], p[2]]), 0x1b1b1b, 0.02);
    }
  }
  for (const x of [-14, 14]) {
    const sl = streetLamp(true);
    sl.position.set(x, 0, 14.9);
    sl.rotation.y = -Math.PI / 2;
    scene.add(sl);
  }

  // Grandma's car turning into the driveway, headlights on
  const c = car(0xa070d0);
  c.position.set(6.2, 0, 13.2);
  c.rotation.y = 2.25;
  scene.add(c);
  const gm = grandma();
  gm.scale.setScalar(0.5);
  c.updateMatrixWorld(true);
  const seat = new THREE.Vector3(-0.1, 0.35, -0.4).applyMatrix4(c.matrixWorld);
  gm.position.copy(seat);
  gm.rotation.y = c.rotation.y + Math.PI / 2;
  scene.add(gm);
  const dog = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0, 0, 0.2], [0, 0.22, 0.05, 0.16], [0.12, 0.25, 0, 0.08], [-0.12, 0.25, 0, 0.08]]) {
    const pf = sphere(r, 0xffffff);
    pf.position.set(x, y, z);
    dog.add(pf);
  }
  dog.position.copy(new THREE.Vector3(-0.1, 1.35, 0.42).applyMatrix4(c.matrixWorld));
  scene.add(dog);
  const head = new THREE.SpotLight(0xfff0c8, 40, 18, 0.45, 0.6, 1.5);
  head.position.copy(new THREE.Vector3(2.3, 0.8, 0).applyMatrix4(c.matrixWorld));
  head.target.position.copy(new THREE.Vector3(9, 0, 0).applyMatrix4(c.matrixWorld));
  scene.add(head, head.target);

  fpCam(camera, [-3.0, 1.75, 21.6], [1.2, 2.5, 5.0], 72);
  const dw = surf(1.45, 0.05, 0.75, T.plaster(0xeceef0), 1);
  dw.position.set(0, -0.62, -0.75);
  dw.rotation.set(0.12, 0, -0.03);
  camera.add(addOutlines(dw, 0.006));
  camera.add(fpArm(HEX.you, SKIN.you, { pos: [0.5, -0.55, -0.55], rot: [-0.1, 0.12, 0] }));
  camera.add(fpArm(HEX.you, SKIN.you, { pos: [-0.5, -0.55, -0.55], rot: [-0.1, -0.12, 0] }));

  renderFx(ctx, { ao: 0.9, aoRadius: 1.0, bloom: 0.45, bloomThreshold: 0.8, grade: { vig: 0.3, warm: 0.05, sat: 1.1 } });

  pinHtml(camera, [6.2, 2.9, 13.2], '<i style="--c:#ff4d5e"></i>MRS. HENDERSON', 'g-tag');
  pinHtml(camera, [4.6, 2.2, 13.2], `<div class="g-acts" style="margin-left:-160px">
      <div class="g-act ts"><span class="g-key">E</span>Go greet her <span class="s">stall the walkthrough</span></div></div>`, 'g-int');
  pinHtml(camera, [-4.4, 1.05, 0.2], `${waves}SAWING<small>· basement window</small>`, 'g-snd');

  hud(gameHud({
    pc: C.you,
    obj: {
      kick: 'Work order #12', kickR: 'from GUS 👷', title: 'Drywall to the bedroom', sub: 'Van → upstairs · two people carry faster',
      steps: [{ t: 'Carry drywall sheets', st: 'cur', m: '0 / 2' }, { t: 'Hang it in the bedroom' }, { t: 'Stall the client (optional)', st: 'cur', m: 'NEW' }],
    },
    compass: { labels: [[15, 'NW'], [40, 'N'], [65, 'NE'], [90, 'E']], marks: [[40, '🏠', '#ffffff'], [74, '👵', C.red], [12, '🚐', C.you]] },
    time: '4:46 PM', due: 'Client is here',
    card: { i: 'Y', n: 'YOU', rk: '#2', loc: 'Front yard', cash: '$1,610' },
    radio: [{ who: 'GUS', c: C.gus, t: 'copy. i\'m in the, uh. garage.', cls: 'old' }, { who: 'KEV', c: C.kev, t: 'uh. does anyone else hear SAWING??' }, { who: 'YOU', c: C.you, t: 'GRANDMA\'S CAR JUST PULLED IN. SHE\'S EARLY!!' }],
    hot: [{ i: '🧱', on: true }, { i: '🔨' }, { i: '📱' }, { i: '🔦' }],
    hotName: ['Drywall Sheet', 'Two hands · slow on stairs'],
    extra: '<div class="g-toast"><div class="a">⚠ CLIENT ARRIVED EARLY</div><div class="b">walkthrough starts when she reaches the front door</div></div>',
  }));
  done();
}

// =================================================================== SITE 5: exploded design view
function overview() {
  const ctx = setup({ bg: 0xf3ead8, fog: null, sunPos: [14, 40, 26], sunInt: 2.6, sunColor: 0xfff0dc, hemiSky: 0xe8f0ff, hemiGround: 0xc8b090, hemiInt: 0.9, env: 0.4, shadowBox: 34 });
  const { scene, camera } = ctx;
  const bg = mesh(new THREE.PlaneGeometry(400, 400), mat(0xf0e6d2, { roughness: 1 }));
  bg.rotation.x = -Math.PI / 2;
  bg.position.y = -12;
  bg.userData.noOutline = true;
  scene.add(bg);

  const X0 = -8, X1 = 8, Z0 = -10, Z1 = 0;
  const LV = { base: -8, ground: 0, up: 8 };
  const levels = [
    { y: LV.base, fl: T.concrete(), wl: T.cinder(), fs: 3, ws: 3 },
    { y: LV.ground, fl: T.wood(0xd9a066, 8), wl: T.wallpaper(0xa8e6cf, 0x93d6bb), fs: 2.5, ws: 1.6 },
    { y: LV.up, fl: T.wood(0xe0b47a, 8), wl: T.wallpaper(0xd6c8ff, 0xc4b2f5), fs: 2.5, ws: 1.6 },
  ];
  for (const L of levels) {
    floor(scene, X0, Z0, X1, Z1, L.y, L.fl, L.fs, 0.35);
    texWall(scene, [X0, Z0], [X1, Z0], { y: L.y, h: 2.6, tex: L.wl, size: L.ws });
    texWall(scene, [X0, Z0], [X0, Z1], { y: L.y, h: 2.6, tex: L.wl, size: L.ws });
    texWall(scene, [X1, Z0], [X1, Z1], { y: L.y, h: 2.6, tex: L.wl, size: L.ws });
    // slab edge
    const edge = box(X1 - X0, 0.35, 0.05, 0xffffff);
    edge.position.set(0, L.y - 0.175, Z1 + 0.02);
    edge.userData.noOutline = true;
    scene.add(edge);
  }
  const iw = (a, b, y, tex, openings) => texWall(scene, a, b, { y, h: 2.2, t: 0.14, tex, size: 1.6, openings });
  iw([-2.5, -10], [-2.5, 0], LV.up, T.wallpaper(0xd6c8ff, 0xc4b2f5), [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([2.5, -10], [2.5, 0], LV.up, T.wallpaper(0xd6c8ff, 0xc4b2f5), [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([-2.5, -10], [-2.5, 0], LV.ground, T.wallpaper(0xa8e6cf, 0x93d6bb), [{ at: 8.5, w: 1.2, top: 2.0 }]);
  iw([2.5, -10], [2.5, 0], LV.ground, T.wallpaper(0xa8e6cf, 0x93d6bb), [{ at: 3, w: 1.2, top: 2.0 }]);
  // bathroom tile on upstairs left
  floor(scene, X0, Z0, -2.5, Z1, LV.up + 0.01, T.tile(0xffffff, 0xf6c9d2, 8), 2.4, 0.02);
  // stairs (in hallway) + dashed connectors
  for (const L of [LV.base, LV.ground, LV.up]) {
    for (let i = 0; i < 6; i++) {
      const st = surf(1.6, 0.28 * (i + 1), 0.45, T.wood(0xc98b55, 2), 1);
      st.position.set(0, L + 0.14 * (i + 1), -1.6 - i * 0.45);
      scene.add(st);
    }
  }
  for (const [y0, y1] of [[LV.base, LV.ground], [LV.ground, LV.up]]) {
    for (let y = y0 + 0.7; y < y1 - 0.5; y += 0.7) {
      const d = box(0.1, 0.35, 0.1, 0x2a1d2e);
      d.position.set(0, y, -1.2);
      d.userData.noOutline = true;
      scene.add(d);
    }
  }
  // furniture
  const t = toilet();
  t.position.set(-5.2, LV.up, -8.6);
  scene.add(addOutlines(t));
  const tub = bathtub();
  tub.scale.setScalar(0.8);
  tub.position.set(-7.0, LV.up, -4.5);
  scene.add(addOutlines(tub));
  const bed = box(2.6, 0.55, 3.4, 0xff8b7b);
  bed.position.set(5.4, LV.up + 0.3, -7.6);
  scene.add(addOutlines(bed));
  const pillow = box(2.2, 0.18, 0.6, 0xffffff);
  pillow.position.set(5.4, LV.up + 0.66, -9.0);
  scene.add(addOutlines(pillow));
  const pl = plant();
  pl.position.set(1.6, LV.up, -9.2);
  scene.add(pl);
  const sofa = box(3.2, 0.9, 1.1, 0x4fbf8a);
  sofa.position.set(-5.2, LV.ground + 0.45, -9.0);
  scene.add(addOutlines(sofa));
  const counter = box(4.6, 1.0, 1.0, 0xfff3d6);
  counter.position.set(5.4, LV.ground + 0.5, -9.3);
  scene.add(addOutlines(counter));
  const post = mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), tmat(T.wood(0xd9a066, 3), 0.3, 1));
  post.position.set(-5.2, LV.base + 1.2, -7.6);
  scene.add(addOutlines(post));
  const heater = cyl(0.5, 0.5, 1.8, 0xe3e6ea);
  heater.position.set(6.6, LV.base + 0.9, -9.0);
  scene.add(addOutlines(heater));
  for (const [x, z] of [[4.2, -8.8], [5.2, -8.0], [6.8, -6.8]]) {
    const b = box(0.8, 0.6, 0.8, 0xc49a6c);
    b.position.set(x, LV.base + 0.3, z);
    scene.add(addOutlines(b));
  }
  // lawn pads with van + car
  for (const x of [-16, 13]) {
    const pad = surf(12, 0.3, 8, T.grass(), 4);
    pad.position.set(x, -0.15, 6.5);
    scene.add(pad);
  }
  const v = van('DALE & SONS\n(NO SONS)');
  v.scale.setScalar(0.7);
  v.position.set(-17, 0, 7.5);
  scene.add(addOutlines(v));
  const cr = car(0xa070d0);
  cr.position.set(13, 0, 7.5);
  cr.rotation.y = 2.8;
  scene.add(cr);

  const S = 0.85;
  const kev = worker({ color: HEX.kev, stache: 'handlebar', skin: SKIN.kev });
  kev.scale.setScalar(S);
  kev.position.set(-5.0, LV.up, -6.6);
  face(kev, -5.2, -8.6);
  poseArm(kev, 'R', 1.3, 0);
  scene.add(addOutlines(kev));
  const gus = worker({ color: HEX.gus, stache: 'pencil', skin: SKIN.gus });
  gus.scale.setScalar(S);
  gus.position.set(-3.8, LV.base, -6.4);
  face(gus, -5.2, -7.6);
  poseArm(gus, 'R', 1.5, 0);
  scene.add(addOutlines(gus));
  const mo = worker({ color: HEX.mo, stache: 'beard', skin: SKIN.mo, stacheColor: 0x2b1a10 });
  mo.scale.setScalar(S);
  mo.position.set(0.3, LV.base + 1.2, -3.2);
  face(mo, -3.8, -6.4);
  poseArm(mo, 'R', 1.6, 0);
  poseArm(mo, 'L', 1.6, 0);
  scene.add(addOutlines(mo));
  const me = worker({ color: HEX.you, stache: 'walrus', skin: SKIN.you });
  me.scale.setScalar(S);
  me.position.set(-11, 0, 5);
  face(me, 13, 7);
  scene.add(addOutlines(me));

  const cone = (w, color, r, ang) => {
    const vc = viewCone(r, ang, color);
    vc.position.copy(w.position);
    vc.position.y += 0.4;
    vc.rotation.y = w.rotation.y;
    scene.add(vc);
  };
  cone(kev, HEX.kev, 2.6, 1.2);
  cone(gus, HEX.gus, 2.4, 1.2);
  cone(me, HEX.you, 20, 0.5);
  const from = new THREE.Vector3(0.3, LV.base + 2.9, -3.2);
  const to = new THREE.Vector3(-3.8, LV.base + 1.6, -6.4);
  for (let i = 1; i < 10; i++) {
    const d = sphere(0.12, HEX.mo, 10, 8);
    d.position.copy(from.clone().lerp(to, i / 10));
    d.userData.noOutline = true;
    scene.add(d);
  }

  camera.fov = 38;
  camera.updateProjectionMatrix();
  camera.position.set(4, 13, 44);
  camera.lookAt(-0.5, -0.3, -4.5);

  renderFx(ctx, { ao: 0.9, bloom: 0.15, grade: { vig: 0.18, grain: 0.02, warm: 0.02 } });

  const lbl = (obj, dy, c, b, s) => {
    const v3 = new THREE.Vector3();
    obj.userData.parts.head.getWorldPosition(v3);
    v3.y += dy;
    pinHtml(camera, v3, `<b>${b}</b><span>${s}</span>`, 'd-lbl').style.setProperty('--c', c);
  };
  lbl(kev, 1.0, C.kev, 'KEV · upstairs bath', 'tightening bolts · hears sawing');
  lbl(gus, 2.6, C.gus, 'GUS · basement', 'sawing the post · "I\'m in the garage"');
  const mh = new THREE.Vector3();
  mo.userData.parts.head.getWorldPosition(mh);
  pinHtml(camera, mh.add(new THREE.Vector3(4.2, 0.9, 0)), '<b>MO · basement stairs</b><span>came for the shop-vac · phone up 📸</span>', 'd-lbl').style.setProperty('--c', C.mo);
  lbl(me, 0.5, C.you, 'YOU · front yard', 'sees Grandma · nothing else');
  pinHtml(camera, [14, 2.4, 9], '<b>MRS. HENDERSON</b><span>14 minutes early</span>', 'd-lbl').style.setProperty('--c', C.red);
  const fl = (y, name, sub) => pinHtml(camera, [X0 - 0.4, y + 2.4, Z0], `${name}<span>${sub}</span>`, 'd-floor r');
  fl(LV.up, 'UPSTAIRS', 'bath · landing · bedroom');
  fl(LV.ground, 'GROUND', 'living · hall · kitchen');
  fl(LV.base, 'BASEMENT', 'storage · furnace · the post');
  pinHtml(camera, [-11.5, LV.base + 1.0, -2], '<b>THE POST ➜</b><span>holds up Kev\'s toilet, 2 floors up</span>', 'd-lbl').style.setProperty('--c', C.red);

  hud(`
    <div class="d-title"><div class="k">DESIGN VIEW · 4:46 PM</div><div class="t">Nobody sees everything</div>
      <div class="s">Same moment as the four first-person shots. Floors pulled apart so you can see who's where, and what each of them can actually see.</div></div>
    <div class="d-legend"><h4>How information moves</h4>
      <div><em>👁</em>Cones = each player's real view. Walls and floors block it.</div>
      <div><em>👂</em>Sound leaks through floors: sawing, flushing, screaming.</div>
      <div><em>📻</em>The walkie reaches everyone, and anyone can lie on it.</div>
      <div><em>📸</em>Photos are timestamped: the only proof that can't lie.</div></div>`);
  done();
}

export function render(shot) {
  ({ 1: kevPOV, 2: gusPOV, 3: moPOV, 4: youPOV, 5: overview })[shot]();
}
