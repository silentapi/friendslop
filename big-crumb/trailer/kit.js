// Trailer kit: cue access, shot builders (lawn / kitchen / patio), particles, food rigs, overlays.
import CUES from './cues.json' with { type: 'json' };
import { THREE, PAL, CSS, setup, aimSun, clay, mesh, keep, twos, rr, rnd, dotTex } from '../engine/render.js';
import * as An from '../engine/anim.js';
import * as A from '../engine/ant.js';
import * as Wd from '../engine/world.js';
import * as UI from '../engine/ui.js';
import { lawn, anthill, twig, dryLeaf, hoseOverPuddle, backDoor, farHouse } from '../engine/sets.js';
import { kitchen, kitchenLight } from '../engine/kitchen.js';
import { M2U } from '../engine/human.js';
import * as Bk from '../engine/blocks.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { CUES };
const SH = Object.fromEntries(CUES.shots.map((s) => [s.name, s]));
export const DUR = (n) => SH[n].dur;
export const Q = (n) => SH[n].cues;
export const STR = (k) => CUES.strength[k] ?? 0.5;
export const CHAT = (n) => CUES.chat.filter((c) => c.shot === n);
export const CARD = (n) => CUES.cards.find((c) => c.shot === n);
export const CREW = ['pip', 'dot', 'bean', 'moss'];
export const TOP = 0.9 * M2U; // counter height in units

// Card sticker for a shot (tell-show-repeat "tell"), held until just before the cut.
export function cardHtml(name, lt, opts = {}) {
  const c = CARD(name);
  if (!c) return '';
  const t0 = c.cue ? Q(name)[c.cue] : 0;
  return UI.sticker(lt, t0, Math.min(DUR(name) - 0.04, t0 + (opts.hold ?? 2.6)), c.text, { pos: c.style || opts.pos || 'bl', size: opts.size || (c.style === 'c' ? 84 : 64), rot: opts.rot ?? -3 });
}
export function chatHtml(name, lt) {
  return UI.chat(lt, CHAT(name).map((l) => ({ ...l, text: l.whisper ? `<i style="opacity:.8">${l.text}</i>` : l.text })));
}

export function makeCrew(ctx, who = CREW) {
  const C = {};
  for (const w of who) { C[w] = A.ant(w); ctx.scene.add(C[w]); }
  return C;
}

// Pose an ant from a fresh neutral each frame (characters animate on twos).
export function antAt(a, x, y, z, yaw) { A.neutral(a); a.position.set(x, y, z); a.rotation.set(0, yaw, 0); }

// Gait phase from distance travelled (stride ≈ 1.1 units / cycle), capped ~3 Hz for on-twos read.
export const gait = (dist) => (dist / 1.1) * Math.PI * 2;

// ---------------------------------------------------------------- shot builders
export function lawnShot({ light = 'gold', sunDir = [0.2, 0.25, -1], focus = [0, 0, 0], cam, clear = [], center = [0, -40], size = [160, 160], count = 9000, house = true, shadowBox = 50, laneR = 9 } = {}) {
  const ctx = setup({ light, sunDir, shadowBox });
  lawn(ctx, { center, size, count, cam, clear, house, laneR, pollenAt: [focus[0], 8, focus[2]] });
  aimSun(ctx, focus);
  return ctx;
}

export function kitchenShot({ focus = [0, TOP, -60], shadowBox = 140, fogFar = 3500 } = {}) {
  const ctx = setup({ light: 'kitchen', fogNear: 700, fogFar, sky: false, shadowBox, sunDist: 1200 });
  ctx.scene.background = new THREE.Color(0xd8c8b4);
  const K = kitchen(ctx);
  kitchenLight(ctx, focus);
  Wd.pollen(ctx, focus, [120, 80, 120], 220, 0xfff4dc, 0.3);
  return { ctx, K };
}

export function patioShot({ focus = [0, 0, 0], light = 'sunset', sunDir = [-0.9, 0.18, -0.4] } = {}) {
  const ctx = setup({ light, sunDir, shadowBox: 80 });
  // stone slabs with soil gaps
  const soil = mesh(new THREE.PlaneGeometry(2000, 2000), clay(0x4a3424, { rough: 1, repeat: 40, strength: 1.5 }), { cast: false });
  soil.rotation.x = -Math.PI / 2;
  ctx.scene.add(soil);
  const S = 100;
  for (let i = -4; i <= 4; i++) for (let j = -6; j <= 2; j++) {
    const st = mesh(new RoundedBoxGeometry(S - 5 + rr(-1.5, 1.5), 6, S - 5 + rr(-1.5, 1.5), 2, 2), clay([0xe4dcd0, 0xd8cec0, 0xeee6da][(i + j + 12) % 3], { rough: 0.9, repeat: 3, strength: 1.6 }));
    st.position.set(i * S + rr(-1, 1), 0, j * S + rr(-1, 1));
    st.rotation.y = rr(-0.02, 0.02);
    st.userData.noOutline = true;
    ctx.scene.add(st);
  }
  for (let i = 0; i < 40; i++) { // grass tufts in the gaps
    const x = (Math.floor(rr(-4, 5)) - 0.5) * S, z = rr(-600, 200);
    Wd.grass(ctx, { center: [x, z], size: [4, 40], count: 30, h: [4, 12], w: [0.6, 1.1], shadows: false });
  }
  farHouse(ctx, { pos: [700, 0, -2600] });
  Wd.pollen(ctx, [focus[0], 10, focus[2]], [140, 30, 140], 300, 0xffd8a0, 0.35);
  aimSun(ctx, focus);
  return ctx;
}

// ---------------------------------------------------------------- particles (deterministic ballistic)
export class Burst {
  constructor(ctx, { n = 30, origin = [0, 0, 0], dir = [0, 1, 0], spread = 0.8, speed = [6, 14], g = -40, size = [0.15, 0.4], color = 0xffffff, mat = null, floor = 0, t0 = 0, life = 1.2, geo = null, seed = 1 }) {
    this.geo = geo || new THREE.SphereGeometry(1, 8, 6);
    this.mesh = new THREE.InstancedMesh(this.geo, mat || clay(color, { rough: 0.5 }), n);
    this.mesh.castShadow = true;
    this.mesh.userData.noOutline = true;
    this.p = [];
    const d = new THREE.Vector3(...dir).normalize();
    for (let i = 0; i < n; i++) {
      const h = (k) => An.hash(i * 7.13 + k * 3.7 + seed * 11);
      const v = new THREE.Vector3(h(1) - 0.5, h(2) - 0.5, h(3) - 0.5).multiplyScalar(2 * spread).add(d).normalize().multiplyScalar(An.lerp(speed[0], speed[1], h(4)));
      this.p.push({ v, s: An.lerp(size[0], size[1], h(5)), spin: h(6) * 10 });
    }
    Object.assign(this, { origin, g, floor, t0, life });
    ctx.scene.add(this.mesh);
    this.update(-1);
  }
  update(t) {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const dt = t - this.t0;
    this.p.forEach((p, i) => {
      if (dt < 0 || dt > this.life) { m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m4); return; }
      let y = this.origin[1] + p.v.y * dt + 0.5 * this.g * dt * dt;
      y = Math.max(this.floor + p.s * 0.5, y);
      const k = 1 - An.sstep(this.life * 0.7, this.life, dt);
      q.setFromEuler(new THREE.Euler(p.spin * dt, p.spin * dt * 0.7, 0));
      m4.compose(new THREE.Vector3(this.origin[0] + p.v.x * dt, y, this.origin[2] + p.v.z * dt), q, new THREE.Vector3(p.s * k, p.s * k, p.s * k));
      this.mesh.setMatrixAt(i, m4);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Soft dust puff (additive sprites expanding).
export class Puff {
  constructor(ctx, { origin = [0, 0, 0], n = 10, r = 4, t0 = 0, life = 0.9, color = 0xe8d8c0, seed = 1, opacity = 0.6 }) {
    this.g = new THREE.Group();
    this.s = [];
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color, transparent: true, depthWrite: false, opacity }));
      const a = An.hash(i + seed) * Math.PI * 2;
      this.s.push({ sp, a, k: 0.5 + An.hash(i * 3 + seed) * 0.8 });
      this.g.add(sp);
    }
    Object.assign(this, { origin, r, t0, life, opacity });
    this.g.position.set(...origin);
    ctx.scene.add(this.g);
    this.update(-1);
  }
  update(t) {
    const u = (t - this.t0) / this.life;
    for (const { sp, a, k } of this.s) {
      if (u < 0 || u > 1) { sp.visible = false; continue; }
      sp.visible = true;
      const e = An.easeOut(u);
      sp.position.set(Math.cos(a) * this.r * e * k, this.r * 0.3 * e * k, Math.sin(a) * this.r * e * k);
      sp.scale.setScalar(this.r * (0.4 + e * 0.8) * k);
      sp.material.opacity = this.opacity * (1 - u);
    }
  }
}

// Expanding water ripple ring.
export function ripple(ctx, pos) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })));
  m.rotation.x = -Math.PI / 2;
  m.position.set(...pos);
  ctx.scene.add(m);
  return (t, t0) => {
    const u = (t - t0) / 1.2;
    m.visible = u > 0 && u < 1;
    m.scale.setScalar(1 + u * 14);
    m.material.opacity = 0.5 * (1 - u);
  };
}

// Donut rig for rolling: roller (spin about local Z) holds a donut stood on its edge.
export const DONUT_S = 1.5;
export const DONUT_R = 2.45 * DONUT_S; // outer radius
export function donutRig(ctx) {
  const d = Wd.donut(DONUT_S);
  const roller = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.x = Math.PI / 2;
  d.position.y = -0.875 * DONUT_S;
  inner.add(d);
  roller.add(inner);
  ctx.scene.add(roller);
  return { roller, inner, d };
}

// Shadow blob (giant foot / bird / magazine approaching): plum ellipse that darkens with k.
export function shadowBlob(ctx, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), keep(new THREE.MeshBasicMaterial({ color: 0x2a1420, map: dotTex(), transparent: true, opacity: 0, depthWrite: false })));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  ctx.scene.add(m);
  return m;
}

export const fade = (lt, t0, t1) => An.seg(lt, t0, t1);
export { An, A, Wd, UI, twos, M2U };

// Underground nest chamber, built from dirt blocks, lit by glowing cube mushrooms.
export function nestChamber(ctx) {
  const cells = [];
  const b = 4;
  for (let x = -40; x <= 40; x += b) for (let z = -40; z <= 24; z += b) {
    const r = Math.hypot(x / 1.3, z);
    if (r > 30) continue;
    cells.push([x, 0, z, 1, [0x9a6040, 0x8a5638, 0xa86a48][Math.floor(Bk.B + x * 7 + z * 3) % 3 >= 0 ? Math.abs(Math.floor(x * 7 + z * 3)) % 3 : 0]]);
    if (r > 22) for (let k = 1; k <= Math.min(7, Math.floor((r - 22) * 0.9) + 2); k++) cells.push([x, k * b, z, 1, [0x8a5638, 0x7a4a30, 0x9a6040][(k + Math.abs(x)) % 3]]);
  }
  Bk.blocks(ctx, cells, { size: b, kind: 'solid' });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(44, 32, 16), new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: 1, side: THREE.BackSide }));
  shell.scale.set(1.3, 0.55, 1);
  shell.position.y = 4;
  ctx.scene.add(shell);
  const cols = [0xffb46a, 0xffd28a, 0xff9ac0, 0xb8a0ff];
  for (let i = 0; i < 9; i++) {
    const a = -2.2 + i * 0.55;
    const g = new THREE.Group();
    const stem = mesh(new RoundedBoxGeometry(0.8, 2.4, 0.8, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0xfff0d8 }));
    stem.position.y = 1.2;
    const cap = mesh(new RoundedBoxGeometry(3, 1.4, 3, 2, 0.45), new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.7 }));
    cap.position.y = 2.6;
    g.add(stem, cap);
    g.position.set(Math.sin(a) * 23, 0, -Math.cos(a) * 19 - 2);
    g.scale.setScalar(0.8 + (i % 3) * 0.3);
    g.traverse((o) => { o.userData.noOutline = true; });
    ctx.scene.add(g);
  }
  for (const [x, y, z, c, k] of [[-12, 12, -6, 0xffb46a, 140], [12, 10, -4, 0xff9ac0, 90], [0, 14, 14, 0xfff0d0, 160]]) {
    const l = new THREE.PointLight(c, k, 70, 1.6);
    l.position.set(x, y, z);
    ctx.scene.add(l);
  }
}

// Glowing scent trail ribbon along points; returns setter for how much is drawn (0..1).
export function scentTrail(ctx, pts, color = 0xfff27a, w = 2.2) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0.9, p[2])));
  const N = 400;
  const geo = new THREE.TubeGeometry(curve, N, w, 6, false);
  geo.scale(1, 0.35, 1);
  const m = new THREE.Mesh(geo, keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  m.userData.noOutline = true;
  ctx.scene.add(m);
  const per = geo.index.count / N;
  return (u) => geo.setDrawRange(0, Math.floor(per * N * An.clamp01(u) / 3) * 3);
}

export { Bk, RoundedBoxGeometry };

// Orbit framing: camera at subject + (dist, yaw, pitch); looks at subject + lookOff. yaw 0 = camera on +Z side.
export function frame(camera, at, { dist = 12, yaw = 0, pitch = 0.2, fov = 45, lookOff = [0, 0, 0] } = {}) {
  const p = at.isVector3 ? at : new THREE.Vector3(...at);
  const c = [p.x + Math.sin(yaw) * Math.cos(pitch) * dist, p.y + Math.sin(pitch) * dist, p.z + Math.cos(yaw) * Math.cos(pitch) * dist];
  An.aim(camera, c, [p.x + lookOff[0], p.y + lookOff[1], p.z + lookOff[2]], fov);
}
