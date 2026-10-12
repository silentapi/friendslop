import {
  THREE, PAL, W, H, mat, mesh, box, cyl, sphere, capsule, addOutlines, worker, poseArm, poseLeg, grandma, guest,
  textPlane, toilet, bathtub, rug, ladder, bucket, paintRoller, gnome, raccoon, moldBlob, van, house, tree, fence,
  viewCone, setupScene, pin, finish,
} from './lib.js';

const hud = (html) => { document.getElementById('hud').innerHTML = html; };

function face(obj, x, z) {
  obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
}

function handPos(w, side) {
  const v = new THREE.Vector3();
  w.updateMatrixWorld(true);
  w.userData.parts[side === 'L' ? 'armL' : 'armR'].userData.hand.getWorldPosition(v);
  return v;
}

// Dollhouse interior: two full walls (back + left), open front/right so the camera can see in.
function interior(scene, { wallBack = 0xc9b6ff, wallLeft = 0xa8e6cf } = {}) {
  const g = new THREE.Group();
  // outside lawn
  const lawn = box(80, 0.2, 80, PAL.grass);
  lawn.position.y = -0.15;
  lawn.userData.noOutline = true;
  g.add(lawn);
  // floor: bathroom tiles (x<0) and wood (x>=0)
  for (let x = -7; x < 0; x++) {
    for (let z = -5; z < 4; z++) {
      const t = box(0.98, 0.1, 0.98, (x + z) % 2 === 0 ? 0xffffff : 0x9fd6e8);
      t.position.set(x + 0.5, 0.0, z + 0.5);
      t.userData.noOutline = true;
      g.add(t);
    }
  }
  for (let z = -5; z < 4; z += 0.5) {
    const plank = box(7, 0.1, 0.48, (z * 2) % 3 === 0 ? 0xd9a066 : 0xcf955c);
    plank.position.set(3.5, 0.0, z + 0.25);
    plank.userData.noOutline = true;
    g.add(plank);
  }
  const back = box(14.6, 4.6, 0.3, wallBack);
  back.position.set(0, 2.3, -5.15);
  g.add(back);
  const left = box(0.3, 4.6, 9.3, wallLeft);
  left.position.set(-7.15, 2.3, -0.5);
  g.add(left);
  const trimB = box(14.6, 0.3, 0.36, 0xffffff);
  trimB.position.set(0, 0.15, -5.0);
  g.add(trimB);
  const trimL = box(0.36, 0.3, 9.3, 0xffffff);
  trimL.position.set(-7.0, 0.15, -0.5);
  g.add(trimL);
  // wall cut-edge caps so it reads as a dollhouse
  const capB = box(14.6, 0.2, 0.34, 0xfff3d6);
  capB.position.set(0, 4.65, -5.15);
  g.add(capB);
  const capL = box(0.34, 0.2, 9.3, 0xfff3d6);
  capL.position.set(-7.15, 4.65, -0.5);
  g.add(capL);
  // window on back wall
  const win = box(2.2, 1.6, 0.1, 0x9fd6ff, { roughness: 0.1 });
  win.position.set(-4.2, 2.8, -4.98);
  g.add(win);
  const winFrame = box(2.5, 0.18, 0.3, 0xffffff);
  winFrame.position.set(-4.2, 1.95, -4.9);
  g.add(winFrame);
  scene.add(g);
  return g;
}

function kitchen(scene) {
  const g = new THREE.Group();
  const counter = box(4.6, 1.1, 1.1, 0xfff3d6);
  counter.position.set(4.4, 0.55, -4.45);
  g.add(counter);
  const top = box(4.8, 0.14, 1.2, 0x5a6b7a);
  top.position.set(4.4, 1.17, -4.45);
  g.add(top);
  for (let i = 0; i < 4; i++) {
    const door = box(1.0, 0.85, 0.06, 0xffe08a);
    door.position.set(2.75 + i * 1.12, 0.56, -3.87);
    g.add(door);
    const knob = sphere(0.06, 0x8a5a33);
    knob.position.set(2.75 + i * 1.12 + 0.35, 0.7, -3.82);
    knob.userData.noOutline = true;
    g.add(knob);
  }
  const upper = box(4.6, 1.1, 0.6, 0xffe08a);
  upper.position.set(4.4, 3.2, -4.7);
  g.add(upper);
  const sink = box(1.0, 0.08, 0.6, 0xc9d3dc, { metalness: 0.5, roughness: 0.3 });
  sink.position.set(3.4, 1.25, -4.45);
  g.add(sink);
  const tap = capsule(0.05, 0.35, 0xc9d3dc);
  tap.position.set(3.4, 1.5, -4.8);
  g.add(tap);
  scene.add(g);
  return g;
}

function boombox() {
  const g = new THREE.Group();
  const b = box(1.0, 0.55, 0.35, 0xff4d5e);
  b.position.y = 0.28;
  g.add(b);
  for (const s of [-1, 1]) {
    const sp = cyl(0.17, 0.17, 0.05, 0x2a1d2e);
    sp.rotation.x = Math.PI / 2;
    sp.position.set(0.27 * s, 0.28, 0.18);
    sp.userData.noOutline = true;
    g.add(sp);
  }
  const handle = mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI), mat(0x2a1d2e));
  handle.position.y = 0.55;
  g.add(handle);
  return g;
}

function sweat(w, n = 3) {
  const p = w.userData.parts.head;
  for (let i = 0; i < n; i++) {
    const d = sphere(0.08, 0x8fd8ff, 10, 8);
    d.scale.set(0.7, 1.2, 0.7);
    d.position.set(0.5 + i * 0.12, 0.35 - i * 0.18, 0.2);
    d.userData.noOutline = true;
    p.add(d);
  }
}

// =================================================================== SHOT 1: WORK PHASE
function shotWork() {
  const { renderer, scene, camera } = setupScene();
  interior(scene);
  kitchen(scene);

  // bathroom fixtures
  const t = toilet();
  t.position.set(-5.6, 0.05, -4.1);
  scene.add(addOutlines(t));
  const tub = bathtub();
  tub.position.set(-5.9, 0.05, 0.9);
  scene.add(addOutlines(tub));
  const pipe = cyl(0.09, 0.09, 1.2, 0xc9d3dc);
  pipe.position.set(-4.9, 0.7, -4.85);
  scene.add(pipe);
  const tape = cyl(0.13, 0.13, 0.25, 0xb8b8b8);
  tape.position.set(-4.9, 0.7, -4.85);
  scene.add(addOutlines(tape));

  // raccoon peeking from a hole in the left wall
  const holeL = mesh(new THREE.CircleGeometry(0.55, 24), mat(0x120a14));
  holeL.rotation.y = Math.PI / 2;
  holeL.position.set(-6.98, 1.3, -2.0);
  scene.add(holeL);
  const rac = raccoon();
  rac.position.set(-6.75, 1.25, -2.0);
  rac.rotation.y = Math.PI / 2;
  scene.add(addOutlines(rac, 0.02));

  // half-painted back wall over a mold blob
  const fresh = mesh(new THREE.PlaneGeometry(2.6, 3.3), mat(0xfff3d6));
  fresh.position.set(-0.9, 2.15, -4.99);
  scene.add(fresh);
  const mold = moldBlob();
  mold.position.set(-2.55, 2.3, -4.98);
  scene.add(mold);

  // poster hack covering a hole
  const poster = textPlane('HANG\nIN THERE', 1.3, 1.7, { w: 260, h: 340, bg: '#7fd3ff', fg: '#2a1d2e', font: '900 54px "Lilita One"' });
  poster.position.set(1.0, 2.4, -4.98);
  poster.rotation.z = 0.08;
  scene.add(poster);

  // ladder + boombox + buckets
  const lad = ladder(3.4);
  lad.position.set(-6.6, 0, 0.3);
  lad.rotation.z = -0.12;
  lad.rotation.y = Math.PI / 2;
  scene.add(addOutlines(lad, 0.02));
  const bb = boombox();
  bb.position.set(1.9, 0.05, -4.3);
  bb.rotation.y = -0.3;
  scene.add(addOutlines(bb));
  const b1 = bucket(0x4f8dff);
  b1.position.set(-0.2, 0.05, -3.3);
  scene.add(addOutlines(b1));
  const b2 = bucket(0xff8a3d, 0xc9b6ff);
  b2.position.set(-3.6, 0.05, -2.6);
  b2.rotation.z = 1.4;
  b2.position.y = 0.32;
  scene.add(addOutlines(b2));
  const spill = mesh(new THREE.CircleGeometry(0.9, 20), mat(0xc9b6ff));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(-3.0, 0.07, -2.4);
  spill.scale.set(1.3, 0.8, 1);
  scene.add(spill);

  // hole in the floor + rolled-up rug ready to hide it
  const hole = mesh(new THREE.CircleGeometry(0.75, 24), mat(0x120a14));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(-2.6, 0.07, 1.4);
  scene.add(hole);
  const rolled = cyl(0.25, 0.25, 2.2, 0xff6f91);
  rolled.rotation.z = Math.PI / 2;
  rolled.position.set(-0.6, 0.3, 2.6);
  scene.add(addOutlines(rolled));

  // --- YOU (orange) painting
  const me = worker({ color: PAL.orange, stache: 'walrus' });
  me.position.set(-1.0, 0.05, -3.1);
  me.rotation.y = Math.PI + 0.15;
  poseArm(me, 'L', 2.3, 0.1);
  poseArm(me, 'R', 2.3, 0.1);
  scene.add(addOutlines(me));
  const roller = paintRoller();
  roller.position.set(-0.85, 1.55, -3.75);
  roller.rotation.x = -0.55;
  roller.rotation.y = Math.PI;
  scene.add(addOutlines(roller, 0.02));

  // --- KEV (blue) + MO (green) carrying drywall. Mo is "holding it" (he's not).
  const kev = worker({ color: PAL.blue, stache: 'handlebar', skin: 0xe0a77d });
  kev.position.set(1.4, 0.05, 1.0);
  face(kev, 5, 1.3);
  poseArm(kev, 'L', 1.45, 0.15);
  poseArm(kev, 'R', 1.45, 0.15);
  scene.add(addOutlines(kev));
  const mo = worker({ color: PAL.green, stache: 'beard', skin: 0x9c6b4a, stacheColor: 0x2b1a10 });
  mo.position.set(5.3, 0.05, 1.4);
  face(mo, 1, 1.1);
  poseArm(mo, 'R', 2.7, 0.0);
  poseArm(mo, 'L', 0.2, 0.3);
  mo.userData.parts.head.rotation.z = 0.15;
  scene.add(addOutlines(mo));
  const panel = box(2.9, 0.12, 1.7, 0xeceff3);
  panel.position.set(3.35, 1.0, 1.2);
  panel.rotation.z = -0.38;
  panel.rotation.y = -0.08;
  scene.add(addOutlines(panel));
  const sig = textPlane('K.B.', 0.9, 0.45, { w: 256, h: 128, fg: '#4f8dff', font: '64px "Permanent Marker"' });
  sig.rotation.x = -Math.PI / 2;
  sig.position.set(0.6, 0.07, 0.3);
  panel.add(sig);

  // --- GUS (purple) kneeling at the cabinets, sabotaging Kev's install
  const gus = worker({ color: PAL.purple, stache: 'pencil', skin: 0xf2c09b });
  gus.position.set(4.9, -0.3, -2.9);
  gus.rotation.y = Math.PI;
  poseLeg(gus, 'L', -1.3);
  poseLeg(gus, 'R', -1.3);
  poseArm(gus, 'R', 1.6, -0.1);
  poseArm(gus, 'L', 0.9, 0.4);
  scene.add(addOutlines(gus));
  const driver = capsule(0.04, 0.4, 0xff4d5e);
  const gh = handPos(gus, 'R');
  driver.position.copy(gh).add(new THREE.Vector3(0, 0, -0.3));
  driver.rotation.x = Math.PI / 2;
  scene.add(driver);
  const kbDoor = textPlane('K.B.', 0.7, 0.35, { w: 256, h: 128, fg: '#4f8dff', font: '64px "Permanent Marker"' });
  kbDoor.position.set(4.99, 0.75, -3.83);
  scene.add(kbDoor);

  camera.fov = 52;
  camera.updateProjectionMatrix();
  camera.position.set(0.2, 7.2, 11.8);
  camera.lookAt(0.0, 0.9, -1.6);

  finish(renderer, scene, camera, () => {
    pin(camera, me.userData.parts.head, 'YOU <small>· DALE</small>', { dy: 1.0, cls: 'tag orange' });
    pin(camera, kev.userData.parts.head, 'KEV', { dy: 1.0, cls: 'tag blue' });
    pin(camera, mo.userData.parts.head, 'MO', { dy: 1.0, cls: 'tag green' });
    pin(camera, gus.userData.parts.head, 'GUS <small>👷 FOREMAN</small>', { dy: 1.0, cls: 'tag purple' });
    pin(camera, kev.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-1.4, 1.2, 0.6)), 'ARE YOU HOLDING IT??', { cls: 'bubble shout' });
    pin(camera, mo.userData.parts.head, 'yeah', { dy: 1.5, cls: 'bubble' });
    pin(camera, new THREE.Vector3(5.0, 0.1, -1.2), '🤫 LOOSENING KEV\'S CABINET… 70%', { cls: 'flaw' });
    pin(camera, new THREE.Vector3(-2.6, 0.4, 1.4), '🤫 HOLE · <b>MO</b>', { cls: 'flaw' });
    pin(camera, new THREE.Vector3(-6.7, 2.2, -2.0), '🦝 SURPRISE!', { cls: 'flaw' });
    pin(camera, new THREE.Vector3(-4.9, 1.5, -4.8), '🤫 DUCT TAPE · <b>GUS</b>', { cls: 'flaw' });
  });

  hud(`
    <div class="panel clipboard">
      <h3>📋 MRS. HENDERSON · BATH + KITCHEN</h3>
      <div class="row"><span class="done">✔</span> Tile floor <span class="who" style="background:var(--green)">MO</span></div>
      <div class="row"><span class="hack">🤫</span> Drywall hole <span class="who" style="background:var(--orange)">YOU</span></div>
      <div class="row" style="display:block">⬜ Paint walls <span style="float:right;font-size:15px">64%</span><div class="bar"><i style="width:64%"></i></div></div>
      <div class="row">⬜ Install cabinets <span class="who" style="background:var(--blue)">KEV</span></div>
      <div class="row"><span class="hack">🤫</span> Fix pipe <span class="who" style="background:var(--purple)">GUS</span></div>
      <div class="row">⬜ Hang drywall <span class="who" style="background:var(--blue)">KEV</span><span class="who" style="background:var(--green);margin-left:4px">MO</span></div>
    </div>
    <div class="panel timer">⏰ WALKTHROUGH IN 3:42</div>
    <div class="panel receipt">
      <div class="line"><span>JOB BUDGET</span><span>$22,000</span></div>
      <div class="line"><span>MATERIALS</span><span>-$9,480</span></div>
      <div class="line"><span>BARGAIN BIN x3</span><span>⚠</span></div>
      <div class="line big"><span>PROFIT</span><span>$12,520</span></div>
      <div class="line" style="color:#d9304a"><span>YOU SKIMMED 🤫</span><span>$1,200</span></div>
    </div>
    <div class="panel ranks" style="bottom:110px">
      <h4>💵 WALLETS · WEEK 1</h4>
      <div class="rank" style="background:var(--blue)"><span class="n">1</span>KEV<span class="m">$1,840</span></div>
      <div class="rank me" style="background:var(--orange)"><span class="n">2</span>YOU<span class="m">$1,610</span></div>
      <div class="rank" style="background:var(--green)"><span class="n">3</span>MO<span class="m">$1,320</span></div>
      <div class="rank" style="background:var(--purple)"><span class="n">4</span>GUS<span class="m">$990</span></div>
    </div>
    <div class="panel prompts">
      <div class="prompt"><span class="key">LMB</span> Paint it right · <b>+$80</b></div>
      <div class="prompt hackp"><span class="key">Q</span> 🤫 Paint over the mold · <b>instant</b></div>
    </div>
    <div class="panel voice">
      <div><span class="dot" style="background:var(--blue)"></span> KEV 🔊🔊🔊</div>
      <div><span class="dot" style="background:var(--green)"></span> MO 🔈</div>
      <div><span class="dot" style="background:var(--purple)"></span> GUS <i style="opacity:.6">(suspiciously quiet)</i></div>
    </div>
    <div class="caption">MOCKUP 1 · WORK PHASE</div>
  `);
}

// =================================================================== SHOT 2: WALKTHROUGH
function shotWalkthrough() {
  const { renderer, scene, camera } = setupScene();
  interior(scene, { wallBack: 0xffd6a5, wallLeft: 0xa8e6cf });
  kitchen(scene);

  const t = toilet();
  t.position.set(-5.6, 0.05, -4.1);
  scene.add(addOutlines(t));

  // rug over the hole, with Mo standing on it, sweating
  const r = rug(2.6, 1.8);
  r.position.set(2.2, 0.06, 0.6);
  r.rotation.y = 0.15;
  scene.add(addOutlines(r, 0.02));
  const mo = worker({ color: PAL.green, stache: 'beard', skin: 0x9c6b4a, stacheColor: 0x2b1a10 });
  mo.position.set(2.2, 0.1, 0.6);
  face(mo, -1, -0.8);
  poseArm(mo, 'L', 0.1, 0.05);
  poseArm(mo, 'R', 0.1, 0.05);
  sweat(mo, 3);
  scene.add(addOutlines(mo));

  // wardrobe, door open, Gus inside holding the shelf up
  const wardrobe = new THREE.Group();
  const shell = box(2.0, 3.2, 1.3, 0xffe08a);
  shell.position.set(0, 1.6, 0);
  wardrobe.add(shell);
  const inside = box(1.8, 3.0, 1.2, 0x5c4033);
  inside.position.set(0, 1.6, 0.12);
  inside.userData.noOutline = true;
  wardrobe.add(inside);
  const door = box(1.0, 3.0, 0.08, 0xffe08a);
  door.position.set(1.5, 1.6, 0.9);
  door.rotation.y = -1.2;
  wardrobe.add(door);
  wardrobe.position.set(-6.0, 0.05, 0.4);
  wardrobe.rotation.y = Math.PI / 2;
  scene.add(addOutlines(wardrobe));
  const gus = worker({ color: PAL.purple, stache: 'pencil' });
  gus.scale.setScalar(0.82);
  gus.position.set(-5.75, 0.05, 0.4);
  gus.rotation.y = Math.PI / 2;
  poseArm(gus, 'L', 3.0, 0.3);
  poseArm(gus, 'R', 3.0, 0.3);
  scene.add(addOutlines(gus));
  const shelf = box(1.1, 0.1, 1.6, 0xd9a066);
  shelf.position.set(-5.85, 2.75, 0.4);
  shelf.rotation.x = 0.12;
  scene.add(addOutlines(shelf));
  for (let i = 0; i < 3; i++) {
    const can = cyl(0.13, 0.13, 0.3, [0xff4d5e, 0x4f8dff, 0xffd23f][i]);
    can.position.set(-5.85, 2.98, -0.1 + i * 0.4);
    scene.add(can);
  }

  // Kev body-blocking a mold stain on the back wall, arms spread
  const mold = moldBlob();
  mold.position.set(-4.0, 1.8, -4.98);
  scene.add(mold);
  const kev = worker({ color: PAL.blue, stache: 'handlebar', skin: 0xe0a77d });
  kev.position.set(-4.0, 0.05, -4.2);
  kev.rotation.y = 0.15;
  poseArm(kev, 'L', 0.0, 1.45);
  poseArm(kev, 'R', 0.0, 1.45);
  scene.add(addOutlines(kev));

  // Grandma + view cone
  const gm = grandma();
  gm.position.set(-1.0, 0.05, -1.5);
  face(gm, -0.3, 1.5);
  gm.userData.parts.armR.rotation.x = -0.6;
  scene.add(addOutlines(gm));
  const cone = viewCone(5.4, 1.2);
  cone.position.set(-1.0, 0.08, -1.5);
  cone.rotation.y = gm.rotation.y;
  scene.add(cone);
  const mug = cyl(0.14, 0.12, 0.28, 0xffffff);
  const mh = new THREE.Vector3();
  gm.updateMatrixWorld(true);
  gm.userData.parts.armR.children[1].getWorldPosition(mh);
  mug.position.copy(mh).add(new THREE.Vector3(0, 0.18, 0));
  scene.add(addOutlines(mug));

  // YOU doing small talk
  const me = worker({ color: PAL.orange, stache: 'walrus' });
  me.position.set(-2.3, 0.05, 0.7);
  face(me, -1.0, -1.5);
  poseArm(me, 'R', 1.2, 0.9);
  poseArm(me, 'L', 0.6, 0.7);
  scene.add(addOutlines(me));

  const lad = ladder(3.4);
  lad.position.set(6, 0, -4.6);
  lad.rotation.z = 0.15;
  scene.add(addOutlines(lad, 0.02));

  camera.fov = 52;
  camera.updateProjectionMatrix();
  camera.position.set(1.2, 7.4, 11.2);
  camera.lookAt(-1.2, 0.8, -1.4);

  finish(renderer, scene, camera, () => {
    pin(camera, me.userData.parts.head, 'YOU', { dy: 1.0, cls: 'tag orange' });
    pin(camera, kev.userData.parts.head, 'KEV <small>· BODY BLOCK 3s</small>', { dy: 1.0, cls: 'tag blue' });
    pin(camera, mo.userData.parts.head, 'MO', { dy: 1.0, cls: 'tag green' });
    pin(camera, gus.userData.parts.head, 'GUS <small>· HOLD IT UP 💪</small>', { dy: 1.2, cls: 'tag purple' });
    pin(camera, gm.userData.parts.head, 'MRS. HENDERSON', { dy: 1.2, cls: 'tag npc' });
    pin(camera, me.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(1.0, -0.6, 2.4)), 'WHAT a lovely mug, Mrs. H! Is that… vintage?', { cls: 'bubble' });
    pin(camera, gm.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(1.6, 1.9, 0)), 'mmhm… hrrm… <i>what\'s that creaking?</i>', { cls: 'bubble think' });
    pin(camera, new THREE.Vector3(2.2, 0.5, 0.6), '🤫 RUG OVER HOLE · <b>MO</b>', { cls: 'flaw' });
    pin(camera, new THREE.Vector3(-5.9, 3.7, 0.4), '🤫 SHELF · <b>GUS</b>', { cls: 'flaw' });
    pin(camera, new THREE.Vector3(3.2, 3.3, 0.6), '*creak*', { cls: 'note' });
  });

  hud(`
    <div class="panel meter">
      <div class="label"><span>🙂</span><span>GRANDMA SUSPICION · 🤨 HMM…</span><span>😠⚖️</span></div>
      <div class="track"><div class="fill" style="left:58%"></div><div class="tick" style="left:45%"></div><div class="tick" style="left:80%"></div></div>
    </div>
    <div class="panel route">
      <h4>Mrs. Henderson's route</h4>
      ✔ Kitchen<br>➡ <b>Hallway</b> (now)<br>⬜ Bathroom — <span style="color:#d9304a">SHE WILL FLUSH</span><br>⬜ Wardrobe 😬
      <div style="margin-top:8px;font-size:16px">Quirks: ☕ loves her mug · 🧐 retired inspector · 🐩 Biscuit (in car)</div>
    </div>
    <div class="panel ranks" style="top:130px">
      <h4>💵 IF SHE PAYS…</h4>
      <div class="rank" style="background:var(--blue)"><span class="n">1</span>KEV<span class="m">$2,310</span></div>
      <div class="rank me" style="background:var(--orange)"><span class="n">2</span>YOU<span class="m">$2,280</span></div>
      <div class="rank" style="background:var(--green)"><span class="n">3</span>MO<span class="m">$1,690</span></div>
      <div class="rank" style="background:var(--purple)"><span class="n">4</span>GUS<span class="m">$1,105</span></div>
    </div>
    <div class="panel prompts" style="transform:translateX(-50%) scale(.82);bottom:16px">
      <div class="prompt" style="background:#fff59d"><span class="key">1</span> 💬 Small Talk <small>(2 topics left)</small></div>
      <div class="prompt"><span class="key">2</span> 🧍 Body Block</div>
      <div class="prompt"><span class="key">3</span> 💪 Hold It Up</div>
      <div class="prompt cd"><span class="key">4</span> 🔊 Noise Cover <small>8s</small></div>
      <div class="prompt"><span class="key">5</span> 🤕 Fake Injury <small>x1</small></div>
      <div class="prompt hackp"><span class="key">T</span> 🗺️ Tour Guide → Gus's shelf?</div>
    </div>
    <div class="panel voice" style="bottom:110px">
      <div>♪ elevator muzak · <b>1.4×</b> speed</div>
    </div>
    <div class="caption">MOCKUP 2 · THE WALKTHROUGH</div>
  `);
}

// =================================================================== SHOT 3: BLAME VOTE
function shotBlame() {
  const { renderer, scene, camera } = setupScene({ bg: 0xffd6a5 });
  interior(scene, { wallBack: 0xffd6a5, wallLeft: 0xc9b6ff });
  kitchen(scene);

  // leaking pipe under the sink spraying an arc of water
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(3.4, 0.9, -3.8),
    new THREE.Vector3(3.2, 3.2, -1.5),
    new THREE.Vector3(2.4, 0.1, 0.6),
  );
  const water = mesh(new THREE.TubeGeometry(curve, 40, 0.16, 10), mat(0x6fc8ff, { roughness: 0.1 }));
  water.userData.noOutline = true;
  scene.add(water);
  for (let i = 0; i < 18; i++) {
    const d = sphere(0.06 + Math.random() * 0.06, 0x8fd8ff, 8, 6);
    const p = curve.getPoint(0.2 + Math.random() * 0.8);
    d.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8));
    d.userData.noOutline = true;
    scene.add(d);
  }
  const puddle = mesh(new THREE.CircleGeometry(1.6, 24), mat(0x8fd8ff, { roughness: 0.05 }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(2.4, 0.07, 0.4);
  puddle.scale.set(1.4, 1, 1);
  scene.add(puddle);
  const openDoor = box(1.0, 0.85, 0.06, 0xffe08a);
  openDoor.position.set(3.6, 0.56, -3.4);
  openDoor.rotation.y = -1.1;
  scene.add(addOutlines(openDoor));

  // Grandma, soaked, pointing at the leak
  const gm = grandma();
  gm.position.set(2.0, 0.05, 2.0);
  face(gm, 3.4, -3.8);
  gm.userData.parts.armR.rotation.x = -1.5;
  gm.userData.parts.armR.rotation.z = 0;
  scene.add(addOutlines(gm));
  for (let i = 0; i < 4; i++) {
    const d = sphere(0.07, 0x8fd8ff, 8, 6);
    d.position.set(2.0 + (i - 1.5) * 0.35, 3.0 + (i % 2) * 0.3, 2.0);
    d.scale.set(0.7, 1.3, 0.7);
    d.userData.noOutline = true;
    scene.add(d);
  }

  // Workers in a ring pointing at each other
  const crew = {
    me: worker({ color: PAL.orange, stache: 'walrus' }),
    kev: worker({ color: PAL.blue, stache: 'handlebar', skin: 0xe0a77d }),
    mo: worker({ color: PAL.green, stache: 'beard', skin: 0x9c6b4a, stacheColor: 0x2b1a10 }),
    gus: worker({ color: PAL.purple, stache: 'pencil' }),
  };
  crew.me.position.set(-2.4, 0.05, 2.4);
  crew.kev.position.set(-4.4, 0.05, -0.6);
  crew.mo.position.set(0.6, 0.05, 1.0);
  crew.gus.position.set(-1.6, 0.05, -1.8);
  const point = (who, target) => {
    face(who, target.position.x, target.position.z);
    poseArm(who, 'R', 1.5, 0.0);
  };
  point(crew.me, crew.gus);
  point(crew.kev, crew.gus);
  point(crew.mo, crew.gus);
  point(crew.gus, crew.kev);
  poseArm(crew.gus, 'L', 2.9, 0.5);
  sweat(crew.gus, 3);
  for (const w of Object.values(crew)) scene.add(addOutlines(w));

  // spotlight on Gus
  const spot = new THREE.SpotLight(0xffffff, 60, 14, 0.35, 0.6);
  spot.position.set(-1.6, 9, -1.8);
  spot.target = crew.gus;
  scene.add(spot);

  camera.fov = 52;
  camera.updateProjectionMatrix();
  camera.position.set(-0.4, 6.6, 9.8);
  camera.lookAt(-0.6, 0.9, -0.6);

  finish(renderer, scene, camera, () => {
    pin(camera, crew.me.userData.parts.head, 'YOU', { dy: 1.0, cls: 'tag orange' });
    pin(camera, crew.kev.userData.parts.head, 'KEV', { dy: 1.0, cls: 'tag blue' });
    pin(camera, crew.mo.userData.parts.head, 'MO', { dy: 1.0, cls: 'tag green' });
    pin(camera, crew.gus.userData.parts.head, 'GUS', { dy: 1.0, cls: 'tag purple' });
    pin(camera, crew.gus.userData.parts.head, '🗳️ 3 VOTES', { dy: -2.6, cls: 'chip' });
    pin(camera, crew.kev.userData.parts.head, '🗳️ 1', { dy: -2.6, cls: 'chip' });
    pin(camera, crew.gus.userData.parts.head, 'IT SAYS K.B. ON IT!! LOOK!!', { dy: 2.5, cls: 'bubble shout' });
    pin(camera, crew.kev.userData.parts.head, 'that is NOT my handwriting', { dy: 1.7, cls: 'bubble' });
    pin(camera, gm.userData.parts.head, 'WHO. DID. THIS.', { dy: 1.6, cls: 'bubble shout' });
    pin(camera, new THREE.Vector3(4.6, 0.3, -3.4), 'PIPE · signed <b>K.B.</b> ✍️ <i>forged?</i>', { cls: 'flaw' });
  });

  hud(`
    <div class="vignette"></div>
    <div class="banner" style="top:14px;font-size:78px">WHOSE WORK IS THIS?</div>
    <div class="panel" style="right:40px;top:190px;width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:64px;background:#ff4d5e;color:#fff">7</div>
    <div class="panel" style="left:30px;top:200px;width:300px;padding:14px 16px;font-size:19px">
      <div style="font-size:22px;margin-bottom:6px">🔍 EVIDENCE</div>
      ✍️ Signature: <b>K.B.</b> — wobbly<br>
      👣 Purple paint footprints near sink<br>
      🕐 Last touched by: <b>???</b><br>
      <div style="margin-top:8px;color:#d9304a">Blame = −$450 + Lawyer risk</div>
    </div>
    <div class="panel prompts">
      <div class="prompt"><span class="key">🖱</span> Point at someone</div>
      <div class="prompt hackp"><span class="key">R</span> 📣 REPORT forgery (needs proof)</div>
    </div>
    <div class="caption">MOCKUP 3 · BLAME VOTE</div>
  `);
}

// =================================================================== SHOT 4: PAYDAY
function shotPayday() {
  const { renderer, scene, camera } = setupScene({ bg: 0xffc58f });
  const lawn = box(120, 0.2, 120, PAL.grass);
  lawn.position.y = -0.1;
  lawn.userData.noOutline = true;
  scene.add(lawn);
  const road = box(120, 0.05, 6, 0x6b6f7a);
  road.position.set(0, 0.02, 7);
  road.userData.noOutline = true;
  scene.add(road);
  const sidewalk = box(120, 0.12, 1.6, 0xe6e1d8);
  sidewalk.position.set(0, 0.02, 3.4);
  sidewalk.userData.noOutline = true;
  scene.add(sidewalk);

  const h1 = house(PAL.mint, 0xff8b7b);
  h1.position.set(-2, 0, -9);
  scene.add(addOutlines(h1));
  const h2 = house(0xffd6a5, 0x7f9cff);
  h2.position.set(-14, 0, -10);
  scene.add(addOutlines(h2));
  const h3 = house(0xc9b6ff, 0x4fbf8a);
  h3.position.set(11, 0, -11);
  scene.add(addOutlines(h3));
  const f = fence(12);
  f.position.set(-2, 0, -4.5);
  scene.add(f);
  for (const [x, z, s] of [[-8, -5, 1.2], [6, -6, 1.4], [-20, -4, 1.6], [18, -6, 1.3]]) {
    const tr = tree(s);
    tr.position.set(x, 0, z);
    scene.add(addOutlines(tr));
  }
  const gn = gnome();
  gn.position.set(-4.6, 0, -2.2);
  gn.scale.setScalar(1.4);
  scene.add(addOutlines(gn));

  const v = van('DALE & SONS\n(NO SONS)');
  v.position.set(8.2, 0, 1.0);
  v.rotation.y = -0.5;
  scene.add(addOutlines(v));

  // pallet podium
  const podium = (x, hgt) => {
    for (let i = 0; i < hgt; i++) {
      const p = box(1.8, 0.35, 1.8, 0xd9a066);
      p.position.set(x, 0.18 + i * 0.37, 0);
      scene.add(addOutlines(p, 0.02));
    }
    return hgt * 0.37;
  };
  const yKev = podium(0, 4);
  const yMe = podium(-2.4, 3);
  const yMo = podium(2.4, 2);

  const kev = worker({ color: PAL.blue, stache: 'handlebar', skin: 0xe0a77d, hat: 0xffcc00 });
  kev.position.set(0, yKev, 0);
  poseArm(kev, 'L', 3.0, 0.4);
  poseArm(kev, 'R', 3.0, 0.4);
  scene.add(addOutlines(kev));
  const crown = mesh(new THREE.ConeGeometry(0.35, 0.5, 5), mat(0xffd700, { metalness: 0.7, roughness: 0.25 }));
  crown.position.y = 0.95;
  kev.userData.parts.head.add(crown);

  const me = worker({ color: PAL.orange, stache: 'walrus' });
  me.position.set(-2.4, yMe, 0);
  poseArm(me, 'R', 2.6, 0.6);
  scene.add(addOutlines(me));

  const mo = worker({ color: PAL.green, stache: 'beard', skin: 0x9c6b4a, stacheColor: 0x2b1a10 });
  mo.position.set(2.4, yMo, 0);
  poseArm(mo, 'L', 0.3, 0.6);
  poseArm(mo, 'R', 0.3, 0.6);
  scene.add(addOutlines(mo));

  // Gus: fired, carrying a cardboard box to the curb
  const gus = worker({ color: PAL.purple, stache: 'pencil', hat: null });
  gus.position.set(4.6, 0.05, 2.6);
  gus.rotation.y = 0.75;
  gus.userData.parts.head.rotation.x = 0.35;
  poseArm(gus, 'L', 1.2, 0.2);
  poseArm(gus, 'R', 1.2, 0.2);
  scene.add(addOutlines(gus));
  const cbox = box(1.1, 0.7, 0.8, 0xc49a6c);
  const gh = handPos(gus, 'R');
  cbox.position.copy(gh).add(new THREE.Vector3(-0.15, 0.1, 0.25));
  cbox.rotation.y = 0.75;
  scene.add(addOutlines(cbox));
  const plant = sphere(0.25, 0x5fbf4a);
  plant.position.copy(cbox.position).add(new THREE.Vector3(0, 0.5, 0));
  scene.add(addOutlines(plant));

  // confetti
  const colors = [0xff4d5e, 0xffd23f, 0x4f8dff, 0x3ccf7a, 0xa65cff, 0xffffff];
  for (let i = 0; i < 160; i++) {
    const c = box(0.12, 0.02, 0.2, colors[i % colors.length]);
    c.position.set((Math.random() - 0.5) * 12, 1 + Math.random() * 7, (Math.random() - 0.5) * 6);
    c.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    c.castShadow = false;
    c.userData.noOutline = true;
    scene.add(c);
  }

  camera.position.set(0.6, 4.2, 12.5);
  camera.lookAt(0.6, 2.4, 0);

  finish(renderer, scene, camera, () => {
    pin(camera, kev.userData.parts.head, '👑 KEV · EMPLOYEE OF THE WEEK', { dy: 1.6, cls: 'tag blue' });
    pin(camera, me.userData.parts.head, 'YOU · #2', { dy: 1.1, cls: 'tag orange' });
    pin(camera, mo.userData.parts.head, 'MO · #3', { dy: 1.1, cls: 'tag green' });
    pin(camera, gus.userData.parts.head, 'GUS · FIRED 📦', { dy: 1.0, cls: 'tag purple' });
    pin(camera, gus.userData.parts.head, 'see you monday as the intern…', { dy: 2.2, cls: 'bubble think' });
  });

  const slip = (left, color, rank, name, lines, total, extra = '') => `
    <div class="slip" style="left:${left}px">
      <div class="hd" style="background:${color}"><span>#${rank} ${name}</span><span>PAYSLIP</span></div>
      ${lines.map(([a, b]) => `<div class="line"><span>${a}</span><span>${b}</span></div>`).join('')}
      <div class="line tot"><span>TOTAL</span><span>${total}</span></div>${extra}
    </div>`;
  hud(`
    <div class="banner" style="top:24px;font-size:84px">FRIDAY · PAYDAY!</div>
    ${slip(24, 'var(--blue)', 1, 'KEV', [['Timecard', '$2,140'], ['Tips 🎭', '$620'], ['Docked', '-$180']], '$2,580')}
    ${slip(334, 'var(--orange)', 2, 'YOU', [['Timecard', '$1,520'], ['Skim 🤫', '$1,200'], ['Docked', '-$410']], '$2,310')}
    ${slip(644, 'var(--green)', 3, 'MO', [['Timecard', '$1,880'], ['Reports 🐀', '$300'], ['Docked', '-$620']], '$1,560')}
    ${slip(954, 'var(--purple)', 4, 'GUS', [['Foreman cut', '$540'], ['Side hustle 🦩', '$400'], ['Fallout 💀', '-$900']], '$40',
      '<div class="stamp" style="color:#d9304a;right:14px;top:70px">FIRED</div>')}
    <div class="award" style="right:24px;top:150px;transform:rotate(4deg)"><div class="pic">🤥</div>SMOOTHEST LIAR<br><b>YOU +$200</b></div>
    <div class="award" style="left:30px;top:150px;transform:rotate(-5deg)"><div class="pic">🦩</div>SIDE HUSTLE REVEAL<br><b>GUS stole the lawn flamingo</b></div>
    <div class="caption">MOCKUP 4 · END-OF-WEEK RANKING</div>
  `);
}

// =================================================================== SHOT 5: 3 MONTHS LATER
function shotFallout() {
  const { renderer, scene, camera } = setupScene({ bg: 0x9fd6ff });
  const lawn = box(120, 0.2, 120, PAL.grass);
  lawn.position.y = -0.1;
  lawn.userData.noOutline = true;
  scene.add(lawn);
  const h = house(0xffd6a5, 0x7f9cff);
  h.position.set(0, 0, -6);
  h.scale.set(1.6, 1.2, 1);
  scene.add(addOutlines(h));

  // collapsing deck
  const deck = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const b = box(0.55, 0.12, 4.2, i % 2 ? 0xc98b55 : 0xb97c48);
    b.position.set(-3.3 + i * 0.6, 0, 0);
    b.rotation.z = (Math.random() - 0.5) * 0.25;
    b.rotation.y = (Math.random() - 0.5) * 0.15;
    if (i === 4 || i === 9) b.position.y += 0.6;
    deck.add(b);
  }
  deck.position.set(0, 1.0, -1.2);
  deck.rotation.x = 0.28;
  deck.rotation.z = -0.12;
  scene.add(addOutlines(deck, 0.02));
  for (const [x, rz] of [[-3.2, 0.6], [3.4, -0.2], [0.2, 1.2]]) {
    const post = box(0.3, 1.6, 0.3, 0x8a5a33);
    post.position.set(x, 0.6, 0.6);
    post.rotation.z = rz;
    scene.add(addOutlines(post));
  }
  const sig = textPlane('G.P.', 1.2, 0.6, { w: 256, h: 128, fg: '#a65cff', font: '72px "Permanent Marker"' });
  sig.position.set(3.5, 1.2, 0.8);
  sig.rotation.z = -0.2;
  scene.add(sig);

  // grill tipping, burgers flying
  const grill = new THREE.Group();
  const bowl = sphere(0.7, 0x2a2a2a);
  bowl.scale.y = 0.6;
  grill.add(bowl);
  for (const s of [-1, 1]) {
    const leg = cyl(0.05, 0.05, 1.3, 0x2a2a2a, 8);
    leg.position.set(0.35 * s, -0.7, 0);
    leg.rotation.z = 0.2 * s;
    grill.add(leg);
  }
  grill.position.set(2.4, 2.2, -0.4);
  grill.rotation.z = -0.9;
  scene.add(addOutlines(grill));
  for (let i = 0; i < 5; i++) {
    const burger = new THREE.Group();
    const bun = sphere(0.28, 0xe8a84c);
    bun.scale.y = 0.45;
    bun.position.y = 0.12;
    burger.add(bun);
    const patty = cyl(0.3, 0.3, 0.1, 0x5b3317);
    burger.add(patty);
    const bot = cyl(0.28, 0.28, 0.1, 0xe8a84c);
    bot.position.y = -0.1;
    burger.add(bot);
    burger.position.set(1 + i * 0.7, 3.4 + Math.sin(i) * 0.8, -0.2 + (i % 2) * 0.6);
    burger.rotation.set(i, i * 0.7, i * 0.3);
    scene.add(addOutlines(burger, 0.02));
  }

  // party guests mid-air
  const guests = [
    [guest(0x59c3c3), -2.0, 3.0, 0.4, 0.8],
    [guest(0xff6f91, 0xf2c09b), 0.2, 3.8, -0.3, -0.5],
    [guest(0xffd23f, 0x8c5a3c), -2.4, 1.0, 1.6, 1.4],
  ];
  for (const [g, x, y, z, rz] of guests) {
    g.position.set(x, y, z);
    g.rotation.z = rz;
    g.rotation.y = 0.3;
    poseArm(g, 'L', 3.0, 0.6);
    poseArm(g, 'R', 3.0, 0.6);
    poseLeg(g, 'L', 0.8);
    poseLeg(g, 'R', -0.5);
    const hat = mesh(new THREE.ConeGeometry(0.25, 0.6, 12), mat(0xff4d5e));
    hat.position.y = 0.75;
    g.userData.parts.head.add(hat);
    scene.add(addOutlines(g));
  }
  // grandma, unbothered, still in her lawn chair
  const gm = grandma();
  gm.position.set(-5.4, 0.05, 2.2);
  gm.rotation.y = 0.5;
  scene.add(addOutlines(gm));
  const flag = textPlane('🇺🇸', 1, 1, { w: 128, h: 128, font: '100px "Noto Color Emoji"' });
  flag.position.set(-6.8, 2.6, 1.6);
  scene.add(flag);

  camera.position.set(-1.2, 3.4, 11.5);
  camera.lookAt(-0.6, 2.0, -0.6);

  finish(renderer, scene, camera, () => {
    pin(camera, new THREE.Vector3(3.5, 2.1, 0.8), '💀 DECK · <b>GUS</b> · BARGAIN BIN LUMBER', { cls: 'flaw' });
    pin(camera, gm.userData.parts.head, 'I knew it.', { dy: 1.4, cls: 'bubble' });
  });

  hud(`
    <div class="vhs"></div>
    <div class="vhs-text" style="left:40px;top:30px;font-size:56px">▶ PLAY</div>
    <div class="vhs-text" style="right:40px;top:30px;font-size:44px">JUL 04 1:42 PM</div>
    <div class="vhs-text" style="left:50%;top:14px;transform:translateX(-50%);font-size:92px;white-space:nowrap">3 MONTHS LATER…</div>
    <div class="chyron">
      <div class="lbl">LIVE · KFLP 7</div>
      <div class="txt">DECK COLLAPSES AT 4TH OF JULY BBQ
        <small>Contractor “Dale &amp; Sons (No Sons)” could not be reached for comment · −$900 to GUS · ⚠ CALLBACK JOB ADDED</small></div>
    </div>
    <div class="caption">MOCKUP 5 · FALLOUT REEL</div>
  `);
}

export function render(shot) {
  ({ 1: shotWork, 2: shotWalkthrough, 3: shotBlame, 4: shotPayday, 5: shotFallout })[shot]();
}
