// Shared sets at real scale (1 unit ≈ 3 mm; ant ≈ 1.6 long; lawn grass 14–30 tall).
import { THREE, PAL, mesh, clay, rnd, rr, keep } from './render.js';
import * as Wd from './world.js';
import { M2U } from './human.js';
import * as Bk from './blocks.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Lawn patch around clearings, with an optional camera sightline lane.
export function lawn(ctx, { clear = [], center = [0, 0], size = [160, 160], count = 7000, cam = null, laneR = 9, h = [10, 24], short = 0, house = true, pollenAt = null, knolls = 10, flowerN = 22 } = {}) {
  if (cam) clear = [...clear, { x: cam[0], z: cam[1], x2: cam[2], z2: cam[3], r: laneR }, { x: cam[0], z: cam[1], r: laneR * 1.2 }];
  const G = ctx.L.grass || {};
  const colors = G.root ? { root: G.root, mid: G.mid, tip: G.tip } : undefined;
  const pal = ctx.L === undefined ? undefined : (G.mid ? { top: G.mid, lip: G.root } : undefined);
  Bk.terrain(ctx, { center, size: [size[0] * 3, size[1] * 3], clear: [...clear, { x: center[0], z: center[1], r: size[0] * 0.25 }], knolls, palette: pal });
  // far ring of big blocks so the horizon reads blocky, not flat
  const far = [];
  for (let k = 0; k < 70; k++) { const a = rr(0, Math.PI * 2), d = rr(700, 1600); far.push([center[0] + Math.cos(a) * d, rr(0, 3) * 40, center[1] + Math.sin(a) * d, rr(3, 6)]); }
  Bk.blocks(ctx, far, { size: 40, palette: pal, shadows: false });
  Wd.grass(ctx, { center, size, count, h, w: [1.0, 1.8], clear, colors, tilt: 0.18 });
  Wd.grass(ctx, { center: [center[0], center[1] - size[1] * 1.4], size: [size[0] * 3.5, size[1] * 2], count: 3500, h: [h[0] * 1.2, h[1] * 1.6], w: [1.6, 2.8], colors, shadows: false });
  Bk.flowers(ctx, { center, size: [size[0] * 1.6, size[1] * 1.6], n: flowerN, clear });
  cubePebbles(ctx, { center, size: [size[0] * 0.8, size[1] * 0.8], n: 40, clear });
  Wd.pollen(ctx, pollenAt || [center[0], 10, center[1]], [120, 40, 120], 300, 0xffffff, 0.3);
  Bk.skyClouds(ctx, [[-1800, 900, -4200, 260], [900, 1100, -4600, 320], [2600, 800, -3600, 220], [-3600, 1000, -2600, 280]]);
  for (const [x, z, s2] of [[-2200, -3800, 1300], [1800, -4200, 1500], [3600, -2600, 1100], [-3800, -1800, 1200]]) { const t = Bk.tree(s2); t.position.set(x, 0, z); ctx.scene.add(t); }
  if (house) farHouse(ctx);
}

// Rounded stone cubes at ant scale (pebbles) + tiny grit cubes.
export function cubePebbles(ctx, { center = [0, 0], size = [80, 80], n = 40, clear = [] } = {}) {
  const cols = [0xd8d0c4, 0xc8bcae, 0xe4dcd0, 0xb8aca0];
  for (let i = 0; i < n; i++) {
    const x = center[0] + rr(-size[0], size[0]) / 2, z = center[1] + rr(-size[1], size[1]) / 2;
    if (clear.some((c) => c.x2 === undefined && Math.hypot(x - c.x, z - c.z) < c.r * 0.5)) continue;
    const s = rnd() < 0.8 ? rr(0.5, 1.6) : rr(2.5, 5);
    const m = mesh(new RoundedBoxGeometry(s, s * rr(0.6, 0.9), s * rr(0.8, 1.2), 2, s * 0.2), clay(cols[i % 4], { rough: 0.8, repeat: 1 }));
    m.position.set(x, s * 0.3, z);
    m.rotation.set(rr(-0.2, 0.2), rr(0, 6), rr(-0.2, 0.2));
    m.userData.noOutline = true;
    ctx.scene.add(m);
  }
}

// The house on the horizon: the destination you can always see (lit kitchen window).
export function farHouse(ctx, { pos = [400, 0, -2600] } = {}) {
  const g = new THREE.Group();
  const s = M2U;
  const wall = mesh(new THREE.BoxGeometry(9 * s, 3.2 * s, 6 * s), clay(0x8fd0c0, { rough: 0.9, repeat: 4 }));
  wall.position.y = 1.6 * s;
  g.add(wall);
  const roof = mesh(new THREE.ConeGeometry(6.6 * s, 2.2 * s, 4), clay(0xf06a5a, { rough: 0.9 }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.05, 1, 0.72);
  roof.position.y = 4.3 * s;
  g.add(roof);
  const lit = keep(new THREE.MeshBasicMaterial({ color: 0xffd890, fog: false }));
  for (const [x, y] of [[-2.6, 1.7], [0.9, 1.7], [3.2, 1.7]]) {
    const w = mesh(new THREE.PlaneGeometry(1.1 * s, 0.9 * s), lit, { cast: false });
    w.position.set(x * s, y * s, 3.01 * s);
    g.add(w);
  }
  const door = mesh(new THREE.PlaneGeometry(0.95 * s, 2.0 * s), clay(0x6a8a9a), { cast: false });
  door.position.set(-0.6 * s, 1.0 * s, 3.01 * s);
  g.add(door);
  // patio slab in front
  const pat = mesh(new THREE.BoxGeometry(7 * s, 0.05 * s, 3 * s), clay(PAL.stone, { repeat: 6 }));
  pat.position.set(0, 0.02 * s, 4.6 * s);
  g.add(pat);
  g.position.set(...pos);
  g.traverse((o) => { o.userData.noOutline = true; });
  ctx.scene.add(g);
  return g;
}

// Stepped block anthill; returns height-at-radius function (ant feet).
export function anthill(ctx, pos = [0, 0, 0]) {
  return Bk.blockAnthill(ctx, { at: pos });
}

// A fallen twig: round, barky (grooves + knots), one snapped end and a side stub. Length along X.
export function twig(len = 60, r = 2.2) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r * 0.85, r, len, 22, 30, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const groove = Math.sin(a * 11 + Math.sin(y * 0.3) * 1.5) * 0.06 + Math.sin(a * 5 + y * 0.12) * 0.04;
    const bend = Math.sin((y / len) * Math.PI) * r * 0.6;
    const k = 1 + groove;
    p.setXYZ(i, x * k + bend, y, z * k);
  }
  geo.computeVertexNormals();
  const barkM = clay(0x8a6040, { rough: 1, repeat: 4, strength: 2.4 });
  const body = mesh(geo, barkM);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  // snapped end: pale splintered wood
  const end = mesh(new THREE.ConeGeometry(r * 0.85, r * 1.4, 9, 1), clay(0xd8b888, { rough: 0.9, repeat: 2, strength: 2 }));
  end.rotation.z = Math.PI / 2;
  end.position.x = -len / 2 - r * 0.6;
  g.add(end);
  const stub = mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.5, r * 3, 12), barkM);
  stub.position.set(len * 0.15, r * 1.2, r * 0.6);
  stub.rotation.set(0.5, 0, -0.6);
  g.add(stub);
  for (let k = 0; k < 3; k++) {
    const knot = mesh(new THREE.TorusGeometry(r * 0.25, r * 0.08, 6, 12), clay(0x5a3a24, { rough: 1 }));
    knot.position.set(-len * 0.3 + k * len * 0.25, r * 0.92, (k - 1) * r * 0.3);
    knot.rotation.x = Math.PI / 2;
    g.add(knot);
  }
  g.position.y = r * 0.85;
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}

// Ground clutter at ant scale: soil clods, grit, seed husks, a crumb or two.
export function clutter(ctx, { center = [0, 0], size = [80, 80], n = 220, clear = [] } = {}) {
  const cols = [0x7a5038, 0x8a6040, 0x5a3a28, 0xa88060, 0xc0a080];
  for (let i = 0; i < n; i++) {
    const x = center[0] + rr(-size[0], size[0]) / 2, z = center[1] + rr(-size[1], size[1]) / 2;
    if (clear.some((c) => c.x2 === undefined && Math.hypot(x - c.x, z - c.z) < c.r * 0.3)) continue;
    const r = rnd() < 0.85 ? rr(0.12, 0.6) : rr(0.8, 1.6);
    const m = mesh(new THREE.IcosahedronGeometry(r, 1), clay(cols[i % cols.length], { rough: 1, repeat: 1, strength: 1.5 }));
    m.scale.y = rr(0.4, 0.8);
    m.position.set(x, r * 0.25, z);
    m.rotation.y = rr(0, 6);
    m.userData.noOutline = true;
    ctx.scene.add(m);
  }
}

// Dry curled leaf lying flat: pointed oval, curled edges, midrib + veins. yaw via .rotation.y.
export function dryLeaf(size = 30, color = PAL.leaf) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(size * 0.55, size, 12, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const v = y / (size / 2);
    const w = Math.max(0.02, Math.sin((v * 0.5 + 0.5) * Math.PI)) * (1 - 0.25 * v);
    const xx = x * w;
    p.setXYZ(i, xx, y, Math.pow(Math.abs(xx) / (size * 0.27), 2) * size * 0.12 + Math.sin(v * 3) * 0.6);
  }
  geo.computeVertexNormals();
  const leaf = mesh(geo, clay(color, { rough: 0.95, repeat: 2, strength: 1.8, side: THREE.DoubleSide }));
  leaf.rotation.x = -Math.PI / 2;
  g.add(leaf);
  const rib = mesh(new THREE.CylinderGeometry(0.18, 0.35, size, 6), clay(0x9a6030, { rough: 1 }));
  rib.rotation.x = Math.PI / 2;
  rib.position.y = 0.25;
  g.add(rib);
  g.position.y = 0.4;
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}

// Garden hose arcing over a puddle. Returns { hose, curve, puddle }.
export function hoseOverPuddle(ctx, { at = [0, 0, 0], len = 120, r = 4.2 } = {}) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(at[0] - len * 1.5 + u * len * 3, r + Math.sin(u * Math.PI) * 6, at[2] + Math.sin(u * 2.5) * 8)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const hgeo = new THREE.TubeGeometry(curve, 240, r, 20);
  { const p = hgeo.attributes.position, uv = hgeo.attributes.uv, n = hgeo.attributes.normal; // ribs
    for (let i = 0; i < p.count; i++) { const k = Math.pow(Math.max(0, Math.sin(uv.getX(i) * 240 * Math.PI)), 6) * 0.35; p.setXYZ(i, p.getX(i) + n.getX(i) * k, p.getY(i) + n.getY(i) * k, p.getZ(i) + n.getZ(i) * k); }
    hgeo.computeVertexNormals(); }
  const hose = mesh(hgeo, clay(PAL.hose, { rough: 0.8, repeat: 6, strength: 1.2 }));
  hose.userData.noOutline = true;
  ctx.scene.add(hose);
  const pud = mesh(new THREE.CircleGeometry(48, 48), keep(new THREE.MeshPhysicalMaterial({ color: 0x8ab8e8, roughness: 0.12, metalness: 0.0, clearcoat: 0.8, transparent: true, opacity: 0.88 })), { cast: false });
  pud.rotation.x = -Math.PI / 2;
  pud.scale.set(1.2, 0.7, 1);
  pud.position.set(at[0], 0.15, at[2]);
  pud.userData.noOutline = true;
  ctx.scene.add(pud);
  const mud = mesh(new THREE.CircleGeometry(56, 48), clay(0x4a3020, { rough: 0.6, repeat: 4 }), { cast: false });
  mud.rotation.x = -Math.PI / 2;
  mud.scale.set(1.2, 0.72, 1);
  mud.position.set(at[0], 0.08, at[2]);
  ctx.scene.add(mud);
  return { hose, curve, puddle: pud };
}

// Back door from the outside: siding wall, door bottom with a crack of warm light under it.
export function backDoor(ctx, { at = [0, 0, 0] } = {}) {
  const g = new THREE.Group();
  const s = M2U;
  const wall = mesh(new THREE.BoxGeometry(3 * s, 2.6 * s, 0.1 * s), clay(0xe8d8c0, { rough: 0.9, repeat: 6, strength: 0.6 }));
  wall.position.set(0, 1.3 * s, -0.05 * s);
  g.add(wall);
  const door = mesh(new THREE.BoxGeometry(0.9 * s, 2.0 * s, 0.05 * s), clay(0xb8784a, { rough: 0.6, repeat: 3, strength: 1.2 }));
  door.position.set(0, 1.0 * s + 8, 0.03 * s);
  g.add(door);
  for (const [py, ph] of [[0.45, 0.6], [1.35, 0.8]]) { const pnl = mesh(new THREE.BoxGeometry(0.7 * s, ph * s, 0.01 * s), clay(0xa86a40, { rough: 0.6 })); pnl.position.set(0, py * s + 8, 0.06 * s); g.add(pnl); }
  const knob = mesh(new THREE.SphereGeometry(0.03 * s, 16, 12), clay(0xffd060, { rough: 0.2, metal: 0.7 }));
  knob.position.set(0.35 * s, 1.0 * s, 0.08 * s);
  g.add(knob);
  const sill = mesh(new THREE.BoxGeometry(1.1 * s, 3, 0.16 * s), clay(0xb8a080, { rough: 0.7, repeat: 2 }));
  sill.position.set(0, 1.5, 0.03 * s);
  g.add(sill);
  const glow = mesh(new THREE.PlaneGeometry(0.9 * s, 8), keep(new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false })), { cast: false });
  glow.position.set(0, 7, 0.01 * s);
  g.add(glow);
  const pl = new THREE.PointLight(0xffc880, 60, 140, 1.4);
  pl.position.set(0, 6, 0.08 * s);
  g.add(pl);
  g.position.set(...at);
  g.traverse((o) => { o.userData.noOutline = true; });
  ctx.scene.add(g);
  return g;
}
