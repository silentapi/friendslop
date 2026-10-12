// Reusable trailer environments: suburban street + job-site house, bathroom, stairwell, living room, doorway.
import { THREE, PAL, mat, mesh, box, cyl, sphere, addOutlines, textPlane, toilet, bathtub, bucket, gnome, van } from '../lib.js';
import {
  T, tmat, surf, skyDome, clouds, shaft, motes, glow, cord, cautionTape, toolbox, paintCan, coffee, tapeMeasure,
  trafficCone, plant, pictureFrame, outlet, windowFrame, treeFancy, hedge, flowers, powerPole, streetLamp, mailbox, pallet,
  wheelbarrow, rr,
} from '../fx.js';

export function texWall(scene, a, b, { y = 0, h = 2.8, t = 0.18, tex, size = 2, openings = [], opts = {} } = {}) {
  const alongX = a[1] === b[1];
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const start = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const fixed = alongX ? a[1] : a[0];
  const g = new THREE.Group();
  const sg = (s, e, y0, y1) => {
    if (e - s <= 0.01 || y1 - y0 <= 0.01) return;
    const m = alongX ? surf(e - s, y1 - y0, t, tex, size, opts) : surf(t, y1 - y0, e - s, tex, size, opts);
    const c = start + (s + e) / 2;
    m.position.set(alongX ? c : fixed, y + (y0 + y1) / 2, alongX ? fixed : c);
    g.add(m);
  };
  let cur = 0;
  for (const o of [...openings].sort((p, q) => p.at - q.at)) {
    sg(cur, o.at - o.w / 2, 0, h);
    sg(o.at - o.w / 2, o.at + o.w / 2, o.top ?? 2.2, h);
    if (o.sill) sg(o.at - o.w / 2, o.at + o.w / 2, 0, o.sill);
    cur = o.at + o.w / 2;
  }
  sg(cur, len, 0, h);
  scene.add(g);
  return g;
}

export function floor(scene, x1, z1, x2, z2, y, tex, size = 2, th = 0.2, opts) {
  const m = surf(Math.abs(x2 - x1), th, Math.abs(z2 - z1), tex, size, opts);
  m.position.set((x1 + x2) / 2, y - th / 2, (z1 + z2) / 2);
  scene.add(m);
  return m;
}

export function trim(scene, x, y, z, w, h, d, color = 0xffffff) {
  const m = box(w, h, d, color, { roughness: 0.5 });
  m.position.set(x, y, z);
  m.userData.noOutline = true;
  scene.add(m);
  return m;
}

export const chrome = (color = 0xdfe6ee) => mat(color, { metalness: 0.9, roughness: 0.18 });

// ---------------------------------------------------------------- vehicles
export function car(color = 0xa070d0) {
  const g = new THREE.Group();
  const paint = mat(color, { roughness: 0.25, metalness: 0.35 });
  const body = mesh(new THREE.BoxGeometry(4.4, 0.75, 1.95), paint);
  body.position.y = 0.72;
  g.add(body);
  const cabin = mesh(new THREE.BoxGeometry(2.4, 0.75, 1.75), paint);
  cabin.position.set(-0.25, 1.45, 0);
  g.add(cabin);
  const glassM = mat(0x2a3a4c, { roughness: 0.05, metalness: 0.6 });
  for (const z of [-0.88, 0.88]) {
    const win = mesh(new THREE.BoxGeometry(2.1, 0.55, 0.02), glassM);
    win.position.set(-0.25, 1.48, z);
    win.userData.noOutline = true;
    g.add(win);
  }
  const ws = mesh(new THREE.BoxGeometry(0.02, 0.6, 1.6), glassM);
  ws.position.set(0.98, 1.47, 0);
  ws.rotation.z = -0.35;
  ws.userData.noOutline = true;
  g.add(ws);
  for (const x of [2.22, -2.22]) {
    const bump = box(0.12, 0.25, 2.0, 0xd9dde3);
    bump.material = chrome(0xd9dde3);
    bump.position.set(x, 0.45, 0);
    g.add(bump);
  }
  const wheels = [];
  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.98, 0.98]) {
      const wh = new THREE.Group();
      const tire = cyl(0.4, 0.4, 0.28, 0x1c1c1c);
      tire.rotation.x = Math.PI / 2;
      wh.add(tire);
      const hub = cyl(0.22, 0.22, 0.3, 0xcfd5db);
      hub.material = chrome();
      hub.rotation.x = Math.PI / 2;
      hub.userData.noOutline = true;
      wh.add(hub);
      const spoke = box(0.36, 0.06, 0.31, 0x888888);
      spoke.userData.noOutline = true;
      wh.add(spoke);
      wh.position.set(x, 0.4, z);
      g.add(wh);
      wheels.push(wh);
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
  g.userData.wheels = wheels;
  return addOutlines(g, 0.02);
}

export function companyVan() {
  const v = van('DALE & SONS\n(NO SONS)');
  // sliding side door on the +z side that can swing open
  const door = new THREE.Group();
  const panel = box(1.6, 2.1, 0.08, 0xf6f6f6, { roughness: 0.5 });
  panel.position.set(0.8, 0, 0);
  door.add(panel);
  door.position.set(-1.9, 1.7, 1.33);
  v.add(addOutlines(door, 0.01));
  v.userData.door = door;
  const dark = box(1.55, 2.0, 0.02, 0x1a1418);
  dark.position.set(-1.1, 1.7, 1.31);
  dark.userData.noOutline = true;
  v.add(dark);
  return addOutlines(v, 0.02);
}

// ---------------------------------------------------------------- street + job-site house
export function buildStreet(scene, { sky = true } = {}) {
  if (sky) {
    skyDome(scene, { top: 0x4f86d6, horizon: 0xffbe8a, bottom: 0xf0a878, sunDir: [-0.9, 0.16, -0.38], sunColor: 0xffc070 });
    clouds(scene, [[-120, 70, -260, 16], [60, 90, -300, 20], [-260, 60, -60, 14], [180, 75, -200, 15], [-40, 110, -380, 22], [250, 60, 120, 14]]);
  }
  const g = surf(260, 0.2, 260, T.grass(), 5);
  g.position.set(0, -0.1, 0);
  scene.add(g);
  const road = surf(260, 0.06, 7, T.asphalt(), 4, { rough: 0.9 });
  road.position.set(0, 0.03, 19);
  scene.add(road);
  for (let x = -120; x < 120; x += 5) {
    const dash = box(2.4, 0.07, 0.18, 0xfff1c0);
    dash.position.set(x, 0.05, 19);
    dash.userData.noOutline = true;
    scene.add(dash);
  }
  for (const z of [15.4, 22.6]) {
    const curb = surf(260, 0.18, 0.3, T.concrete(0xc9c4ba), 2);
    curb.position.set(0, 0.09, z);
    scene.add(curb);
  }
  const walk = surf(260, 0.08, 1.8, T.pavers(), 1.6);
  walk.position.set(0, 0.04, 13.8);
  scene.add(walk);
  const drive = surf(5.2, 0.07, 15.3, T.concrete(0xcfcac0), 3);
  drive.position.set(4.6, 0.035, 7.7);
  scene.add(drive);
  const path = surf(1.4, 0.06, 6.0, T.pavers(), 1.4);
  path.position.set(-2.2, 0.035, 3.0);
  scene.add(path);

  const sid = T.siding(0xffd2a0);
  const H1 = 6.4;
  const hx0 = -9, hx1 = 8, hz0 = -11, hz1 = 0;
  texWall(scene, [hx0, hz1], [hx1, hz1], { h: H1, t: 0.25, tex: sid, size: 3, openings: [{ at: 2.0, w: 1.6, sill: 0.9, top: 2.4 }, { at: 6.8, w: 1.3, top: 2.4 }, { at: 13.6, w: 4.2, top: 2.9 }] });
  const upWins = [-6.9, -2.2, 1.6, 6.0];
  const windows = [];
  for (const x of upWins) {
    const lit = x === 1.6;
    const wf = windowFrame(1.4, 1.3, { frame: 0xffffff, glass: lit ? 0xffe2a0 : 0x7fb3d9, emissive: lit ? 0x8a5a10 : 0x000000 });
    wf.position.set(x, 4.8, hz1 + 0.16);
    scene.add(wf);
    windows.push([x, 4.8, hz1 + 0.3]);
    for (const s of [-1, 1]) {
      const sh = box(0.45, 1.4, 0.06, 0x3a5a8a, { roughness: 0.6 });
      sh.position.set(x + s * 1.0, 4.8, hz1 + 0.17);
      scene.add(addOutlines(sh, 0.008));
    }
  }
  const lowWin = windowFrame(1.6, 1.5, { frame: 0xffffff, glass: 0x7fb3d9 });
  lowWin.position.set(-7.0, 1.65, hz1 + 0.16);
  scene.add(lowWin);
  const bw = windowFrame(1.0, 0.35, { frame: 0xe8e2d6, glass: 0xffb860, emissive: 0xa0500a, mull: false, sill: false });
  bw.position.set(-4.4, 0.32, hz1 + 0.16);
  scene.add(bw);
  // interior darkness behind openings
  const back = box(16.5, 6.2, 0.1, 0x2a2024);
  back.position.set(-0.5, 3.1, hz1 - 1.6);
  back.userData.noOutline = true;
  scene.add(back);
  const side = surf(0.25, H1, 11, sid, 3);
  side.position.set(hx1, H1 / 2, (hz0 + hz1) / 2);
  scene.add(side);
  const side2 = side.clone();
  side2.position.x = hx0;
  scene.add(side2);
  const rear = surf(hx1 - hx0, H1, 0.25, sid, 3);
  rear.position.set((hx0 + hx1) / 2, H1 / 2, hz0);
  scene.add(rear);
  trim(scene, (hx0 + hx1) / 2, 3.2, hz1 + 0.15, hx1 - hx0, 0.18, 0.08);
  trim(scene, hx0, H1 / 2, hz1 + 0.15, 0.25, H1, 0.12);
  trim(scene, hx1, H1 / 2, hz1 + 0.15, 0.25, H1, 0.12);
  const found = surf(hx1 - hx0 + 0.3, 0.5, 0.3, T.concrete(0xb9b4aa), 1.5);
  found.position.set((hx0 + hx1) / 2, 0.2, hz1 + 0.05);
  scene.add(found);
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
  // gable ends
  for (const x of [hx0, hx1]) {
    const sh = new THREE.Shape();
    sh.moveTo(-5.9, 0);
    sh.lineTo(5.9, 0);
    sh.lineTo(0, 4.1);
    sh.closePath();
    const gb = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), tmat(sid, 0.35, 0.35));
    gb.rotation.y = Math.PI / 2;
    gb.position.set(x - 0.1, H1, (hz0 + hz1) / 2);
    gb.userData.noOutline = true;
    scene.add(gb);
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
  const tarp = mesh(new THREE.PlaneGeometry(5, 3.6, 20, 14), mat(0x2f74d0, { roughness: 0.6, side: THREE.DoubleSide }));
  const tpa = tarp.geometry.attributes.position;
  for (let i = 0; i < tpa.count; i++) tpa.setZ(i, Math.sin(tpa.getX(i) * 3) * 0.08 + Math.cos(tpa.getY(i) * 4) * 0.06);
  tarp.geometry.computeVertexNormals();
  tarp.position.set(3.2, H1 + 1.4, -1.25);
  tarp.rotation.x = -Math.PI / 2 + pitch;
  scene.add(tarp);
  const door = box(1.1, 2.3, 0.08, 0xff6f91, { roughness: 0.5 });
  door.position.set(-2.2, 1.15, hz1 + 0.05);
  scene.add(addOutlines(door, 0.01));
  const porch = surf(3.4, 0.3, 2.2, T.wood(0xc9b8a0, 6), 1.5);
  porch.position.set(-2.2, 0.15, 1.1);
  scene.add(porch);
  const st = surf(1.8, 0.16, 0.36, T.concrete(0xcfcac0), 1);
  st.position.set(-2.2, 0.08, 2.4);
  scene.add(st);
  const proof = box(3.8, 0.18, 2.5, 0xffffff);
  proof.position.set(-2.2, 2.75, 1.05);
  scene.add(addOutlines(proof, 0.01));
  for (const x of [-3.7, -0.7]) {
    const col = cyl(0.11, 0.13, 2.45, 0xffffff);
    col.position.set(x, 1.5, 2.0);
    scene.add(addOutlines(col, 0.01));
  }
  const gdoor = surf(4.0, 2.8, 0.1, T.siding(0xf4f0e8), 1.4);
  gdoor.position.set(4.6, 1.42, hz1 + 0.06);
  scene.add(gdoor);

  // scaffolding
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

  // yard props
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
  const sign = new THREE.Group();
  for (const s of [-1, 1]) {
    const lg = box(0.06, 1.0, 0.06, 0xffffff);
    lg.position.set(s * 0.6, 0.5, 0);
    sign.add(lg);
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
  for (const [x, z, s] of [[-17, -2, 1.7], [16, -6, 1.5], [-22, 9, 1.4], [21, 7, 1.3], [-14, -16, 2.0], [9, -18, 1.9], [-30, -8, 1.8], [30, -14, 2.0]]) {
    const tr = treeFancy(s);
    tr.position.set(x, 0, z);
    scene.add(tr);
  }
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
  for (const x of [-26, 0, 26]) {
    const pole = powerPole(9);
    pole.position.set(x, 0, 24.2);
    scene.add(pole);
  }
  for (const dx of [-0.9, 0, 0.9]) {
    for (const [a, b] of [[-52, -26], [-26, 0], [0, 26], [26, 52]]) {
      cord(scene, [[a + dx, 8.55, 24.2], [(a + b) / 2 + dx, 7.6, 24.2], [b + dx, 8.55, 24.2]], 0x1b1b1b, 0.02);
    }
  }
  for (const x of [-14, 14]) {
    const sl = streetLamp(true);
    sl.position.set(x, 0, 14.9);
    sl.rotation.y = -Math.PI / 2;
    scene.add(sl);
  }
  // porta-potty (returned so scenes can tip it)
  const pp = new THREE.Group();
  const ppInner = new THREE.Group();
  const ppb = box(1.3, 2.4, 1.3, 0x3a7fe0, { roughness: 0.5 });
  ppb.position.set(0, 1.2, 0);
  ppInner.add(ppb);
  const ppr = cyl(0.78, 0.78, 0.16, 0xf4f4f4);
  ppr.position.y = 2.46;
  ppInner.add(ppr);
  const occ = textPlane('OCCUPIED', 0.7, 0.18, { w: 256, h: 64, bg: '#e8352f', fg: '#fff', font: '900 40px Inter' });
  occ.position.set(0, 1.4, 0.66);
  ppInner.add(occ);
  const ppDoor = new THREE.Group();
  const ppd = box(1.0, 2.1, 0.05, 0x2f6fd0, { roughness: 0.5 });
  ppd.position.set(0.5, 0, 0);
  ppDoor.add(ppd);
  ppDoor.position.set(-0.5, 1.15, 0.67);
  ppInner.add(ppDoor);
  // pivot at the front-bottom edge so it can tip forward
  ppInner.position.set(0, 0, -0.65);
  pp.add(ppInner);
  pp.position.set(13.8, 0, -2.15);
  pp.rotation.y = -0.5;
  scene.add(addOutlines(pp, 0.012));
  pp.userData = { inner: ppInner, door: ppDoor };
  return { pp, windows, porch: [-2.2, 0.3, 1.1] };
}

// ---------------------------------------------------------------- bathroom (open front for third-person shots)
export function buildBathroom(scene, { ceiling = false } = {}) {
  const tile = T.tile(0xffffff, 0xf6c9d2, 8);
  const wain = T.tile(0xbfe6f2, 0xaedcec, 6, 0xe7eef0);
  const plaster = T.plaster(0xfff0d2);
  floor(scene, -3, -5, 3, 2.5, 0, tile, 2.4, 0.2, { rough: 0.35, bump: 0.25 });
  texWall(scene, [-3, -5], [3, -5], { h: 2.9, tex: plaster, size: 2, openings: [{ at: 4.6, w: 1.5, sill: 1.05, top: 2.35 }] });
  texWall(scene, [-3, -5], [-3, 2.5], { h: 2.9, tex: plaster, size: 2 });
  texWall(scene, [3, -5], [3, 2.5], { h: 2.9, tex: plaster, size: 2, openings: [{ at: 4.6, w: 1.1, top: 2.2 }] });
  const wz = surf(6, 1.1, 0.03, wain, 1.2, { rough: 0.3, bump: 0.2 });
  wz.position.set(0, 0.55, -4.89);
  scene.add(wz);
  const wzL = surf(0.03, 1.1, 7.5, wain, 1.2, { rough: 0.3, bump: 0.2 });
  wzL.position.set(-2.89, 0.55, -1.25);
  scene.add(wzL);
  const wzR1 = surf(0.03, 1.1, 4.0, wain, 1.2, { rough: 0.3, bump: 0.2 });
  wzR1.position.set(2.89, 0.55, -3.0);
  scene.add(wzR1);
  trim(scene, 0, 1.12, -4.86, 6, 0.06, 0.06);
  trim(scene, -2.86, 1.12, -1.25, 0.06, 0.06, 7.5);
  if (ceiling) {
    const c = surf(6, 0.12, 7.5, plaster, 3);
    c.position.set(0, 2.96, -1.25);
    scene.add(c);
  }
  // door frame on right wall
  trim(scene, 2.92, 2.25, -0.4, 0.12, 0.1, 1.3);
  trim(scene, 2.92, 1.1, -0.95, 0.12, 2.2, 0.08);
  trim(scene, 2.92, 1.1, 0.15, 0.12, 2.2, 0.08);
  // hallway beyond the door
  floor(scene, 3, -3, 8, 2.5, 0, T.wood(0xd9a066, 6), 2);
  texWall(scene, [3, -3], [8, -3], { h: 2.9, tex: T.wallpaper(0xa8e6cf, 0x93d6bb), size: 1.6 });
  const hl = new THREE.PointLight(0xffe0b0, 8, 8, 1.4);
  hl.position.set(5, 2.5, -1);
  scene.add(hl);

  const win = windowFrame(1.5, 1.3, { frame: 0xffffff, glass: 0xcfeaff });
  win.position.set(1.6, 1.7, -5.0);
  scene.add(win);
  for (const s of [-1, 1]) {
    const cur = mesh(new THREE.BoxGeometry(0.42, 1.7, 0.06), tmat(T.stripes(0xffffff, 0xff9fb0, 6), 1, 1, { rough: 0.9, bump: 0.1 }));
    cur.position.set(1.6 + s * 0.95, 1.62, -4.8);
    scene.add(addOutlines(cur, 0.008));
  }
  const outside = surf(80, 0.2, 80, T.grass(), 6);
  outside.position.set(0, -3.5, -45);
  scene.add(outside);
  for (const [x, z, s] of [[7, -16, 1.4], [-4, -20, 1.6], [14, -26, 1.8]]) {
    const tr = treeFancy(s);
    tr.position.set(x, -3.4, z);
    scene.add(tr);
  }
  shaft(scene, [1.6, 1.7, -4.95], [0.85, 0.0, -2.3], 0.7, 0.9, { opacity: 0.05 });
  motes(scene, [1.3, 1.1, -3.9], [1.2, 1.6, 1.8], 160, 0xffe2b0, 0.014);

  const t = toilet();
  t.position.set(-0.25, 0, -4.25);
  scene.add(addOutlines(t, 0.012));
  const vanity = box(1.3, 0.85, 0.55, 0xffe08a, { roughness: 0.6 });
  vanity.position.set(-2.1, 0.43, -4.6);
  scene.add(addOutlines(vanity, 0.01));
  const counter = box(1.38, 0.05, 0.6, 0xf3f0ea, { roughness: 0.25 });
  counter.position.set(-2.1, 0.88, -4.6);
  scene.add(addOutlines(counter, 0.008));
  const basin = cyl(0.22, 0.18, 0.1, 0xffffff);
  basin.position.set(-2.1, 0.94, -4.6);
  scene.add(addOutlines(basin, 0.008));
  const mirror = box(0.9, 1.0, 0.04, 0xbfe2f2, { roughness: 0.08 });
  mirror.position.set(-2.1, 1.75, -4.86);
  scene.add(addOutlines(mirror, 0.01));
  const tub = bathtub();
  tub.scale.setScalar(0.85);
  tub.position.set(-2.15, 0, -1.2);
  scene.add(addOutlines(tub, 0.012));
  const tb = toolbox();
  tb.position.set(1.4, 0, -3.3);
  tb.rotation.y = -0.4;
  scene.add(tb);
  const cof = coffee();
  cof.position.set(1.9, 0, -3.0);
  scene.add(cof);
  const pc = paintCan(0xc9b6ff);
  pc.position.set(2.3, 0.03, -1.6);
  scene.add(pc);
  const art = pictureFrame(0.5, 0.4, 0xffffff, 0x9fd6ff);
  art.position.set(2.88, 1.85, -3.3);
  art.rotation.y = -Math.PI / 2;
  scene.add(art);
  const ceilLight = new THREE.PointLight(0xffe6c0, 7, 9, 1.4);
  ceilLight.position.set(0, 2.7, -2.0);
  scene.add(ceilLight);
  return { toilet: t, bowl: [-0.25, 0.55, -4.05] };
}

// ---------------------------------------------------------------- stairwell (side view): top landing x∈[3,6] y=3, bottom x<-2 y=0
export function buildStairs(scene) {
  const wp = T.wallpaper(0xd6c8ff, 0xc4b2f5);
  floor(scene, -8, -1.4, 3.2, 3, 0, T.wood(0xd9a066, 8), 2.5);
  floor(scene, 3.2, -1.4, 8, 3, 3.0, T.wood(0xd9a066, 8), 2.5, 0.3);
  const under = surf(4.8, 3.0, 0.2, wp, 1.6);
  under.position.set(5.6, 1.5, 1.2);
  scene.add(under);
  texWall(scene, [-8, -1.4], [8, -1.4], { h: 6.2, tex: wp, size: 1.6 });
  const treadM = tmat(T.wood(0xc98b55, 2), 0.6, 1, { bump: 0.4 });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const x = 3.2 - (i + 0.5) * 0.52;
    const y = 3.0 - (i + 1) * 0.3;
    const tr = mesh(new THREE.BoxGeometry(0.56, 0.3 + y, 1.4), treadM);
    tr.position.set(x, (0.3 + y) / 2, -0.6);
    tr.userData.noOutline = true;
    scene.add(tr);
  }
  for (let i = 0; i < 6; i++) {
    const x = 3.0 - i * 1.0;
    const yb = 3.0 - (3.2 - x) * (3 / 5.2);
    const bal = box(0.06, 1.0, 0.06, 0xffffff);
    bal.position.set(x, yb + 0.5, 0.1);
    scene.add(bal);
  }
  const rail = box(6.0, 0.09, 0.1, 0x8a5a33);
  rail.position.set(0.6, 2.0, 0.1);
  rail.rotation.z = Math.atan2(3, 5.2);
  scene.add(addOutlines(rail, 0.01));
  for (const [x, y, c] of [[-3.5, 2.0, 0x9fd6ff], [-1.0, 3.4, 0xffd6a5], [1.5, 4.4, 0xc9f0d8]]) {
    const pf = pictureFrame(0.8, 0.6, 0xffffff, c);
    pf.position.set(x, y, -1.28);
    pf.rotation.z = rr(-0.08, 0.08);
    scene.add(pf);
  }
  const pl = plant();
  pl.position.set(-6, 0, -0.8);
  scene.add(pl);
  const rugM = box(2.4, 0.03, 1.6, 0xff8b7b);
  rugM.position.set(-4.0, 0.015, 0.6);
  rugM.userData.noOutline = true;
  scene.add(rugM);
  const l1 = new THREE.PointLight(0xffe0b0, 12, 12, 1.3);
  l1.position.set(0, 4.5, 2.5);
  scene.add(l1);
  return { top: [4.3, 3.0, -0.5], bottom: [-2.6, 0, -0.4] };
}

// ---------------------------------------------------------------- living room / kitchen (golden job)
export function buildLiving(scene) {
  floor(scene, -7, -5, 7, 5, 0, T.wood(0xd9a066, 8), 2.5);
  texWall(scene, [-7, -5], [7, -5], { h: 2.9, tex: T.wallpaper(0xa8e6cf, 0x93d6bb), size: 1.6, openings: [{ at: 3.0, w: 1.6, sill: 1.0, top: 2.3 }] });
  texWall(scene, [-7, -5], [-7, 5], { h: 2.9, tex: T.wallpaper(0xa8e6cf, 0x93d6bb), size: 1.6 });
  texWall(scene, [7, -5], [7, 5], { h: 2.9, tex: T.wallpaper(0xa8e6cf, 0x93d6bb), size: 1.6 });
  const win = windowFrame(1.6, 1.3, { frame: 0xffffff, glass: 0xffd9a8, emissive: 0x6a3a10 });
  win.position.set(-4.0, 1.65, -4.95);
  scene.add(win);
  shaft(scene, [-4.0, 1.65, -4.9], [-2.6, 0, -1.6], 0.75, 1.0, { opacity: 0.05 });
  const counter = box(4.0, 0.95, 0.8, 0xfff3d6, { roughness: 0.4 });
  counter.position.set(2.0, 0.475, -4.5);
  scene.add(addOutlines(counter, 0.01));
  const top = box(4.1, 0.07, 0.86, 0x5a6b7a, { roughness: 0.3 });
  top.position.set(2.0, 0.98, -4.5);
  scene.add(top);
  const sink = box(0.9, 0.06, 0.55, 0xc9d3dc, { metalness: 0.6, roughness: 0.3 });
  sink.position.set(2.0, 1.02, -4.5);
  scene.add(sink);
  const fridge = box(1.0, 2.1, 0.8, 0xf2f4f6, { roughness: 0.3 });
  fridge.position.set(4.6, 1.05, -4.5);
  scene.add(addOutlines(fridge, 0.01));
  const sofa = box(3.0, 0.8, 1.1, 0x4fbf8a);
  sofa.position.set(-4.6, 0.4, 2.5);
  sofa.rotation.y = 0.3;
  scene.add(addOutlines(sofa, 0.01));
  const back = box(3.0, 0.7, 0.3, 0x3fa878);
  back.position.set(-4.75, 0.95, 3.0);
  back.rotation.y = 0.3;
  scene.add(addOutlines(back, 0.01));
  const rug = box(3.2, 0.03, 2.2, 0xff8b7b);
  rug.position.set(-0.5, 0.015, 0.5);
  rug.userData.noOutline = true;
  scene.add(rug);
  const pl = plant();
  pl.position.set(-6.3, 0, -4.3);
  scene.add(pl);
  const lamp = new THREE.PointLight(0xffe0b0, 10, 12, 1.3);
  lamp.position.set(0, 2.6, 0);
  scene.add(lamp);
  return { goldPos: [2.0, 1.1, -4.4] };
}

// ---------------------------------------------------------------- doorway (bathtub gag): wall at z=0 with a 1m door
export function buildDoorway(scene) {
  floor(scene, -6, -5, 6, 5, 0, T.wood(0xd9a066, 8), 2.5);
  texWall(scene, [-6, 0], [6, 0], { h: 2.9, tex: T.wallpaper(0xffd6a5, 0xf5c690), size: 1.6, openings: [{ at: 6.0, w: 1.0, top: 2.15 }] });
  texWall(scene, [-6, -5], [6, -5], { h: 2.9, tex: T.plaster(0xfff0d2), size: 2 });
  trim(scene, 0, 2.2, 0.02, 1.25, 0.12, 0.24);
  trim(scene, -0.56, 1.1, 0.02, 0.1, 2.2, 0.24);
  trim(scene, 0.56, 1.1, 0.02, 0.1, 2.2, 0.24);
  for (const [x, c] of [[-3, 0x9fd6ff], [3, 0xc9f0d8]]) {
    const pf = pictureFrame(0.9, 0.7, 0xffffff, c);
    pf.position.set(x, 1.7, 0.12);
    scene.add(pf);
  }
  const l1 = new THREE.PointLight(0xffe0b0, 10, 12, 1.3);
  l1.position.set(0, 2.6, 2.5);
  scene.add(l1);
  const l2 = new THREE.PointLight(0xffe0b0, 6, 8, 1.3);
  l2.position.set(0, 2.6, -2.5);
  scene.add(l2);
}

export function podium(scene, x, hgt) {
  for (let i = 0; i < hgt; i++) {
    const p = surf(1.8, 0.35, 1.8, T.wood(0xd9a066, 4), 1.2);
    p.position.set(x, 0.18 + i * 0.37, 0);
    scene.add(p);
  }
  return hgt * 0.37;
}
