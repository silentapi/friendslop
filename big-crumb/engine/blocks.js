// Block Backyard: soft rounded cubes for terrain, anthill, flowers, clouds and trees (Pokopia-inspired).
// Terrain top surface sits at y = 0 unless raised; one lawn block (B = 8) is ~5 ant-lengths.
import { THREE, mesh, rr, rnd, pick, keep } from './render.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hash } from './anim.js';

export const B = 8;

// Grass-topped dirt cube: vertex colours by height (green cap with a soft lip, dirt below).
function grassBlockGeo(size, { top = 0x7ed08a, lip = 0x5fb070, dirt = 0xb07850, dirtDark = 0x8a5a3a } = {}) {
  const g = new RoundedBoxGeometry(size, size, size, 2, size * 0.14);
  const p = g.attributes.position;
  const cols = new Float32Array(p.count * 3);
  const cT = new THREE.Color(top), cL = new THREE.Color(lip), cD = new THREE.Color(dirt), cK = new THREE.Color(dirtDark);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / size + 0.5; // 0 bottom .. 1 top
    const wav = Math.sin(p.getX(i) * 1.7 / size * 6) * 0.03 + Math.sin(p.getZ(i) * 1.3 / size * 6) * 0.03;
    if (y > 0.8 + wav) c.copy(cT);
    else if (y > 0.68 + wav) c.copy(cL);
    else c.copy(cD).lerp(cK, 1 - y);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}
const solidGeo = (size, r = 0.16) => new RoundedBoxGeometry(size, size, size, 2, size * r);
const blockMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));

// Instanced blocks: cells = [[x, yTop, z, size?, color?], ...]; yTop is the block's top face height.
export function blocks(ctx, cells, { size = B, kind = 'grass', color = 0xffffff, shadows = true, palette } = {}) {
  const geo = kind === 'grass' ? grassBlockGeo(size, palette) : solidGeo(size);
  const m = kind === 'grass' ? blockMat : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const im = new THREE.InstancedMesh(geo, m, cells.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  cells.forEach(([x, yTop, z, s = 1, c], i) => {
    m4.compose(new THREE.Vector3(x, yTop - (size * s) / 2, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    im.setMatrixAt(i, m4);
    const v = 0.93 + hash(i * 1.37) * 0.12;
    col.set(c ?? color).multiplyScalar(v);
    im.setColorAt(i, col);
  });
  im.castShadow = shadows;
  im.receiveShadow = true;
  im.userData.noOutline = true;
  ctx.scene.add(im);
  return im;
}

// Lawn terrain: a grid of grass blocks (top at y=0) with a few raised blocky knolls away from clearings.
export function terrain(ctx, { center = [0, 0], size = [480, 480], clear = [], knolls = 14, palette } = {}) {
  const cells = [];
  const nx = Math.ceil(size[0] / B), nz = Math.ceil(size[1] / B);
  const x0 = center[0] - (nx * B) / 2, z0 = center[1] - (nz * B) / 2;
  const isClear = (x, z, pad = 0) => clear.some((c) => {
    if (c.x2 !== undefined) {
      const vx = c.x2 - c.x, vz = c.z2 - c.z;
      const u = Math.max(0, Math.min(1, ((x - c.x) * vx + (z - c.z) * vz) / (vx * vx + vz * vz)));
      return Math.hypot(x - (c.x + vx * u), z - (c.z + vz * u)) < c.r + pad;
    }
    return Math.hypot(x - c.x, z - c.z) < c.r + pad;
  });
  const knollList = [];
  for (let k = 0; k < knolls; k++) {
    const kx = center[0] + rr(-size[0] / 2.4, size[0] / 2.4), kz = center[1] + rr(-size[1] / 2.4, size[1] / 2.4);
    if (!isClear(kx, kz, 30)) knollList.push([kx, kz, rr(14, 34), Math.floor(rr(1, 3.4))]);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = x0 + i * B + B / 2, z = z0 + j * B + B / 2;
    let h = 0;
    for (const [kx, kz, kr, kh] of knollList) {
      const d = Math.hypot(x - kx, z - kz);
      if (d < kr) h = Math.max(h, Math.ceil(kh * (1 - d / kr) + 0.2));
    }
    for (let y = 0; y <= h; y++) cells.push([x, y * B, z]);
  }
  const g = blocks(ctx, cells, { palette });
  g.userData.knolls = knollList;
  return g;
}

// Stepped anthill: small dirt blocks in tiers with a hole in the middle. Returns height(r).
export function blockAnthill(ctx, { at = [0, 0, 0], R = 30, tiers = 3, b = 2.5, hole = 3.4 } = {}) {
  const cells = [];
  const lv = (r) => (r < hole ? 0 : Math.max(0, Math.min(tiers, Math.ceil(((R - r) / (R - hole)) * tiers * 1.05))));
  for (let x = -R; x <= R; x += b) for (let z = -R; z <= R; z += b) {
    const r = Math.hypot(x, z);
    const n = lv(r);
    if (r > R) continue;
    for (let k = 1; k <= n; k++) cells.push([at[0] + x, at[1] + k * b, at[2] + z, 1, [0xc08a5a, 0xb07850, 0xa06a48, 0x9a6040][(k + Math.floor(hash(x * 3 + z) * 3)) % 4]]);
  }
  blocks(ctx, cells, { size: b, kind: 'solid' });
  // dark pit
  const pit = mesh(new THREE.CylinderGeometry(hole, hole * 0.8, 10, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x1a0c10, side: THREE.BackSide }));
  pit.position.set(at[0], at[1] - 4.9, at[2]);
  const floor = mesh(new THREE.CircleGeometry(hole, 24), new THREE.MeshBasicMaterial({ color: 0x120810 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(at[0], at[1] - 0.05, at[2]);
  ctx.scene.add(pit, floor);
  return (r) => lv(r) * b;
}

// Blocky flower: stem + cube centre + cube petals.
export function flower(height = 30, petal = 0xff9ac0, center = 0xffe070) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.BoxGeometry(1.2, height, 1.2), new THREE.MeshStandardMaterial({ color: 0x5fb070, roughness: 0.8 }));
  stem.position.y = height / 2;
  g.add(stem);
  const leaf = mesh(new RoundedBoxGeometry(6, 0.8, 3, 2, 0.35), new THREE.MeshStandardMaterial({ color: 0x6fc07a, roughness: 0.8 }));
  leaf.position.set(3, height * 0.35, 0);
  leaf.rotation.z = 0.35;
  g.add(leaf);
  const head = new THREE.Group();
  head.position.y = height;
  const cm = new THREE.MeshStandardMaterial({ color: center, roughness: 0.6 });
  head.add(mesh(new RoundedBoxGeometry(4, 3, 4, 2, 0.6), cm));
  const pm = new THREE.MeshStandardMaterial({ color: petal, roughness: 0.6 });
  for (let k = 0; k < 4; k++) {
    const p = mesh(new RoundedBoxGeometry(5, 1.6, 5, 2, 0.6), pm);
    const a = (k / 4) * Math.PI * 2;
    p.position.set(Math.cos(a) * 4.2, -0.3, Math.sin(a) * 4.2);
    p.rotation.y = a;
    head.add(p);
  }
  g.add(head);
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}
export function flowers(ctx, { center = [0, 0], size = [300, 300], n = 30, clear = [], h = [22, 46] } = {}) {
  const pal = [[0xff9ac0, 0xffe070], [0xffffff, 0xffd040], [0xb8a0ff, 0xfff0a0], [0xffe070, 0xff9a50]];
  for (let i = 0; i < n; i++) {
    const x = center[0] + rr(-size[0], size[0]) / 2, z = center[1] + rr(-size[1], size[1]) / 2;
    if (clear.some((c) => (c.x2 === undefined ? Math.hypot(x - c.x, z - c.z) < c.r + 8 : false))) continue;
    const [p, c] = pick(pal);
    const f = flower(rr(h[0], h[1]), p, c);
    f.position.set(x, 0, z);
    f.rotation.y = rr(0, 6);
    ctx.scene.add(f);
  }
}

// Blocky cumulus cloud far in the sky.
export function cloud(scale = 60) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xfff4e8, emissiveIntensity: 0.35, fog: false });
  const parts = [[0, 0, 0, 1.2], [1.1, -0.2, 0.2, 0.9], [-1.0, -0.25, -0.1, 0.85], [0.4, 0.55, 0, 0.8], [-0.5, 0.4, 0.3, 0.7], [1.9, -0.4, 0, 0.6], [-1.8, -0.45, 0.1, 0.55]];
  for (const [x, y, z, s] of parts) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(s, s * 0.8, s, 2, s * 0.2), m);
    c.position.set(x, y, z);
    g.add(c);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}
export function skyClouds(ctx, list) { for (const [x, y, z, s] of list) { const c = cloud(s); c.position.set(x, y, z); ctx.scene.add(c); } }

// Blocky tree (giant, background): box trunk + cube canopy.
export function tree(h = 900) {
  const g = new THREE.Group();
  const trunk = mesh(new RoundedBoxGeometry(h * 0.12, h * 0.55, h * 0.12, 2, h * 0.02), new THREE.MeshStandardMaterial({ color: 0x9a6a48, roughness: 0.9 }));
  trunk.position.y = h * 0.275;
  g.add(trunk);
  const lm = new THREE.MeshStandardMaterial({ color: 0x6fc07a, roughness: 0.85 });
  for (const [x, y, z, s] of [[0, 0.62, 0, 0.42], [0.22, 0.55, 0.1, 0.3], [-0.2, 0.56, -0.08, 0.32], [0.05, 0.82, 0.02, 0.3], [-0.1, 0.5, 0.2, 0.26]]) {
    const c = mesh(new RoundedBoxGeometry(h * s, h * s, h * s, 2, h * s * 0.15), lm);
    c.position.set(x * h, y * h, z * h);
    g.add(c);
  }
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}
