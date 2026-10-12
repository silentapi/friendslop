// The Kitchen, built in metres then scaled to ant units (M2U). Counter top at 0.9 m, front edge z = 0.
// Ants live on the counter (y = 0.9 m) or the floor (y = 0).
import { THREE, PAL, mesh, clay, canvasTex, rnd, rr, pick, keep } from './render.js';
import { M2U } from './human.js';

const tileTex = (key, tile, grout, n = 4, jitter = 0.04) => canvasTex(key, 512, (g, s) => {
  g.fillStyle = grout;
  g.fillRect(0, 0, s, s);
  const c = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = tile;
    g.globalAlpha = 1;
    g.fillRect(i * c + 4, j * c + 4, c - 8, c - 8);
    g.fillStyle = `rgba(${pick(['255,255,255', '200,190,170', '230,220,200'])},${rr(0.05, 0.18 + jitter)})`;
    g.fillRect(i * c + 4, j * c + 4, c - 8, c - 8);
  }
});
const subwayTex = () => canvasTex('subway', 512, (g, s) => {
  g.fillStyle = '#cfc6b6';
  g.fillRect(0, 0, s, s);
  const h = s / 8, w = s / 4;
  for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
    const x = c * w + (r % 2 ? w / 2 : 0);
    g.fillStyle = pick(['#eef3ee', '#e6efe9', '#f2f5f0']);
    g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
  }
});

function T(tex, rx, ry) { const t = tex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; }

export function kitchen(ctx, { window = true } = {}) {
  const K = new THREE.Group();
  K.scale.setScalar(M2U);
  ctx.scene.add(K);
  const add = (m, x, y, z) => { m.position.set(x, y, z); K.add(m); return m; };
  // floor
  const fl = mesh(new THREE.PlaneGeometry(10, 10), keep(new THREE.MeshStandardMaterial({ map: T(tileTex('floor', '#e9dcc4', '#a89880', 2), 16, 16), roughness: 0.6 })));
  fl.rotation.x = -Math.PI / 2;
  add(fl, 0, 0, 2);
  // back wall + backsplash
  const wall = mesh(new THREE.PlaneGeometry(10, 3), clay(0xf2e6d0, { rough: 0.9, repeat: 1.5, strength: 0.6 }));
  add(wall, 0, 1.5, -0.64);
  const spl = mesh(new THREE.PlaneGeometry(6, 0.55), keep(new THREE.MeshStandardMaterial({ map: T(subwayTex(), 16, 2), roughness: 0.35 })));
  add(spl, 0, 1.18, -0.635);
  // base cabinets (sage clay doors) + counter slab
  const cabM = clay(0x6f9a7a, { rough: 0.7, repeat: 1.2, strength: 0.5 });
  const cab = mesh(new THREE.BoxGeometry(5.2, 0.82, 0.6), cabM);
  add(cab, 0, 0.47, -0.32);
  const kick = mesh(new THREE.BoxGeometry(5.2, 0.08, 0.55), clay(0x5a6a5c));
  add(kick, 0, 0.04, -0.35);
  for (let i = 0; i < 9; i++) {
    const x = -2.3 + i * 0.58;
    const door = mesh(new THREE.BoxGeometry(0.54, 0.7, 0.02), clay(0x7aa886, { rough: 0.65, repeat: 1.5 }));
    add(door, x, 0.48, -0.01);
    const handle = mesh(new THREE.CapsuleGeometry(0.008, 0.1, 4, 8), clay(0xd8c090, { rough: 0.25, metal: 0.6 }));
    add(handle, x + 0.2, 0.72, 0.012);
  }
  const top = mesh(new THREE.BoxGeometry(5.3, 0.04, 0.66), clay(0xc8925a, { rough: 0.45, repeat: 3, strength: 0.9 }));
  add(top, 0, 0.88, -0.3);
  // sink (dark steel inset) + faucet
  const sink = mesh(new THREE.BoxGeometry(0.62, 0.005, 0.42), clay(0x8a929a, { rough: 0.2, metal: 0.7 }));
  add(sink, 0.9, 0.901, -0.32);
  const sinkHole = mesh(new THREE.BoxGeometry(0.56, 0.006, 0.36), clay(0x50585e, { rough: 0.3, metal: 0.6 }));
  add(sinkHole, 0.9, 0.903, -0.32);
  const fauc = new THREE.Group();
  const fpost = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 14), clay(0xc8ccd0, { rough: 0.15, metal: 0.9 }));
  fpost.position.y = 0.15;
  const fneck = mesh(new THREE.TorusGeometry(0.1, 0.016, 10, 20, Math.PI), clay(0xc8ccd0, { rough: 0.15, metal: 0.9 }));
  fneck.position.set(0, 0.3, 0.1);
  fneck.rotation.y = Math.PI / 2;
  fauc.add(fpost, fneck);
  add(fauc, 0.9, 0.9, -0.56);
  // window above the sink: cool daylight
  if (window) {
    const glass = mesh(new THREE.PlaneGeometry(0.9, 0.7), keep(new THREE.MeshBasicMaterial({ color: 0xdff0ff })));
    add(glass, 0.9, 1.75, -0.635);
    const frM = clay(0xffffff, { rough: 0.6 });
    for (const [w, h, x, y] of [[0.98, 0.05, 0, 0.37], [0.98, 0.05, 0, -0.37], [0.05, 0.78, -0.47, 0], [0.05, 0.78, 0.47, 0], [0.03, 0.7, 0, 0]]) add(mesh(new THREE.BoxGeometry(w, h, 0.04), frM), 0.9 + x, 1.75 + y, -0.62);
    const sill = mesh(new THREE.BoxGeometry(1.05, 0.03, 0.12), frM);
    add(sill, 0.9, 1.38, -0.58);
    const pl = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 12), clay(0xd87a4a));
    add(pl, 0.7, 1.43, -0.58);
    const leaves = mesh(new THREE.SphereGeometry(0.07, 12, 8), clay(0x4f9a4a, { repeat: 6, strength: 1.4 }));
    add(leaves, 0.7, 1.51, -0.58);
  }
  // fridge (left), tall
  const fr = mesh(new THREE.BoxGeometry(0.85, 1.85, 0.7), clay(0xf6f2ea, { rough: 0.3, repeat: 0.6 }));
  add(fr, -3.2, 0.925, -0.3);
  // upper cabinets
  const up = mesh(new THREE.BoxGeometry(2.6, 0.7, 0.34), cabM);
  add(up, -1.3, 2.05, -0.47);
  // pendant lamp (warm)
  const shade = mesh(new THREE.ConeGeometry(0.2, 0.18, 24, 1, true), clay(0xffc93c, { rough: 0.6, side: THREE.DoubleSide }));
  add(shade, 0, 2.15, 0.25);
  const bulb = mesh(new THREE.SphereGeometry(0.05, 12, 8), keep(new THREE.MeshBasicMaterial({ color: 0xfff0c8 })));
  add(bulb, 0, 2.07, 0.25);
  const pl2 = new THREE.PointLight(0xffd8a0, 1.2, 0, 2);
  pl2.position.set(0, 2.0, 0.25);
  K.add(pl2);
  // counter props
  K.add(coffeeMaker(-1.35, -0.42));
  K.add(sugarBowl(-0.55, -0.45));
  K.add(paperTowel(-1.95, -0.45));
  K.add(fruitBowl(1.75, -0.4));
  // the rest of the room (behind the Mom from the counter's point of view)
  const wall2 = mesh(new THREE.PlaneGeometry(10, 3), clay(0xe8d4b8, { rough: 0.9, repeat: 1.5, strength: 0.6 }));
  wall2.rotation.y = Math.PI;
  add(wall2, 0, 1.5, 3.6);
  const win2 = mesh(new THREE.PlaneGeometry(1.4, 1.1), keep(new THREE.MeshBasicMaterial({ color: 0xd8ecff })));
  win2.rotation.y = Math.PI;
  add(win2, -1.2, 1.55, 3.59);
  const frM2 = clay(0xffffff, { rough: 0.6 });
  for (const [w, h, x, y] of [[1.5, 0.06, 0, 0.58], [1.5, 0.06, 0, -0.58], [0.06, 1.2, -0.72, 0], [0.06, 1.2, 0.72, 0], [0.04, 1.1, 0, 0]]) { const f = mesh(new THREE.BoxGeometry(w, h, 0.05), frM2); f.rotation.y = Math.PI; add(f, -1.2 + x, 1.55 + y, 3.57); }
  const curtain = mesh(new THREE.PlaneGeometry(0.4, 1.3, 8, 1), clay(0xffd86a, { rough: 0.9, repeat: 3, strength: 1.4, side: THREE.DoubleSide }));
  curtain.rotation.y = Math.PI;
  add(curtain, -2.1, 1.55, 3.5);
  const clock = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 32), clay(0xffffff, { rough: 0.4 }));
  clock.rotation.x = Math.PI / 2;
  add(clock, 1.0, 2.1, 3.56);
  const rim = mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 32), clay(0xe8604a));
  add(rim, 1.0, 2.1, 3.55);
  // dining table + chairs
  const tbl = new THREE.Group();
  const tt = mesh(new THREE.BoxGeometry(1.4, 0.05, 0.85), clay(PAL.wood, { rough: 0.6, repeat: 2, strength: 0.8 }));
  tt.position.y = 0.75;
  tbl.add(tt);
  for (const [x, z] of [[-0.62, -0.36], [0.62, -0.36], [-0.62, 0.36], [0.62, 0.36]]) { const l = mesh(new THREE.BoxGeometry(0.06, 0.74, 0.06), clay(0x8a5a3a)); l.position.set(x, 0.37, z); tbl.add(l); }
  const vase = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 16), clay(0x6aa0d0, { rough: 0.3 }));
  vase.position.set(0.1, 0.87, 0);
  tbl.add(vase);
  for (let k = 0; k < 3; k++) { const fl = mesh(new THREE.SphereGeometry(0.05, 10, 8), clay([0xff7a9a, 0xffd23f, 0xffffff][k])); fl.position.set(0.1 + (k - 1) * 0.05, 1.02 + (k % 2) * 0.04, 0); tbl.add(fl); }
  for (const [x, z, r] of [[-0.4, 0.62, 0], [0.4, 0.62, 0], [0, -0.62, Math.PI]]) {
    const ch = new THREE.Group();
    const seat = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), clay(0xd87a5a, { rough: 0.6 }));
    seat.position.y = 0.45;
    const back = mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), clay(0xd87a5a, { rough: 0.6 }));
    back.position.set(0, 0.7, 0.2);
    ch.add(seat, back);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = mesh(new THREE.BoxGeometry(0.035, 0.45, 0.035), clay(0x8a5a3a)); l.position.set(lx, 0.225, lz); ch.add(l); }
    ch.position.set(x, 0, z);
    ch.rotation.y = r;
    tbl.add(ch);
  }
  tbl.position.set(0.6, 0, 2.3);
  K.add(tbl);
  const rug = mesh(new THREE.CircleGeometry(1.2, 40), clay(0xc86a5a, { rough: 1, repeat: 6, strength: 1.6 }));
  rug.rotation.x = -Math.PI / 2;
  add(rug, 0.6, 0.004, 2.3);
  K.userData = { top: 0.9, front: 0.0 };
  return K;
}

function coffeeMaker(x, z) {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.22, 0.36, 0.26), clay(0x2a2a30, { rough: 0.4 }));
  body.position.y = 0.18;
  const pot = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.13, 20), keep(new THREE.MeshPhysicalMaterial({ color: 0x5a3a28, roughness: 0.05, transmission: 0.5, transparent: true, opacity: 0.85 })));
  pot.position.set(0, 0.075, 0.07);
  g.add(body, pot);
  g.position.set(x, 0.9, z);
  return g;
}
function sugarBowl(x, z) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.07, 24), clay(0xffffff, { rough: 0.25 }));
  b.position.y = 0.035;
  const sug = mesh(new THREE.CircleGeometry(0.065, 24), clay(PAL.sugar, { rough: 0.9, repeat: 30, strength: 2 }));
  sug.rotation.x = -Math.PI / 2;
  sug.position.y = 0.065;
  g.add(b, sug);
  g.position.set(x, 0.9, z);
  return g;
}
function paperTowel(x, z) {
  const g = new THREE.Group();
  const r = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 24), clay(0xffffff, { rough: 0.95, repeat: 8, strength: 1.2 }));
  r.position.y = 0.14;
  g.add(r);
  g.position.set(x, 0.9, z);
  return g;
}
function fruitBowl(x, z) {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay(0xc87a4a, { rough: 0.5, side: THREE.DoubleSide }));
  b.position.y = 0.12;
  g.add(b);
  for (const [dx, dz, c, r] of [[0.04, 0.03, 0xe83a3a, 0.05], [-0.05, 0.02, 0xffa03a, 0.05], [0.0, -0.05, 0x9ad04a, 0.045]]) {
    const f = mesh(new THREE.SphereGeometry(r, 16, 12), clay(c, { rough: 0.3 }));
    f.position.set(dx, 0.1, dz);
    g.add(f);
  }
  g.position.set(x, 0.9, z);
  return g;
}

// Kitchen light rig: window key from behind-left of the counter + warm fill. Uses ctx.sun as window light.
export function kitchenLight(ctx, focus) {
  ctx.sun.color.set(0xeaf4ff);
  ctx.sun.intensity = 1.7;
  ctx.sunDir.set(0.25, 0.7, -0.6).normalize();
  ctx.sun.target.position.set(...focus);
  ctx.sun.position.copy(ctx.sunDir).multiplyScalar(ctx.sunDist).add(ctx.sun.target.position);
  const fill = new THREE.DirectionalLight(0xffd0a0, 0.55);
  fill.position.set(focus[0] - 200, focus[1] + 300, focus[2] + 400);
  fill.target.position.set(...focus);
  ctx.scene.add(fill, fill.target);
}
