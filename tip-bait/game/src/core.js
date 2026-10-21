// TIP BAIT (game) — shared helpers: three, loaders, math, canvas textures.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, SkeletonUtils, BGU };

export const ASSETS = (globalThis.TIPBAIT_ASSETS || './assets/');
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeIn = (t) => t * t;
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// Gameplay randomness: one named stream per system, all derived from the run seed, so a seed replays the same run
// (layouts, combos, dog bites, slips…) for everyone — that's what makes the daily fair. Visual-only noise (sparks,
// pitch jitter) stays on Math.random. Streams are independent, so one system drawing more never shifts another.
let RUN_SEED = 1; const streams = new Map();
export function seedRun(seed) { RUN_SEED = seed >>> 0; streams.clear(); }
export function rnd(name) { let f = streams.get(name); if (!f) streams.set(name, (f = mulberry(hashStr(name) ^ RUN_SEED))); return f(); }
// frame-rate independent seeded noise in -0.5..0.5: a fresh value every 1/30 s of game time, the same for every player
export const tnoise = (name, t) => mulberry(hashStr(name) ^ RUN_SEED ^ Math.imul(Math.floor(t * 30) + 1, 0x9e3779b1))() - 0.5;

// ---------------------------------------------------------------- loading with progress
const cache = new Map();
let total = 0, done = 0;
export const progress = { onChange: null };
function track(p) { total++; progress.onChange?.(done, total); return p.finally(() => { done++; progress.onChange?.(done, total); }); }
export function once(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
const gltf = new GLTFLoader();
// quantized glTF attributes (int16/int8 normalized) can't hold baked transforms: expand to float first
export function floatGeo(g) {
  g = g.clone();
  for (const [name, a] of Object.entries(g.attributes)) {
    if (a.isInterleavedBufferAttribute || a.normalized || !(a.array instanceof Float32Array)) {
      const n = a.count, k = a.itemSize, arr = new Float32Array(n * k);
      for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent ? a.getComponent(i, j) : [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)][j];
      g.setAttribute(name, new THREE.BufferAttribute(arr, k));
    }
  }
  return g;
}
// models ship as glTF JSON with the binary buffer embedded (base64); rebuild a GLB in memory and parse it, so no
// data: URL is ever fetched (strict CSPs) and hosts only need to serve .json
function toGLB(j) {
  const b64 = j.buffers[0].uri.split(',')[1]; delete j.buffers[0].uri;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const enc = new TextEncoder().encode(JSON.stringify(j));
  const jl = Math.ceil(enc.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4;
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true); out.set(enc, 20); for (let i = enc.length; i < jl; i++) out[20 + i] = 0x20;
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004e4942, true); out.set(bin, 28 + jl);
  return out.buffer;
}
export const loadGLB = (p) => once('glb:' + p, () => track(fetch(ASSETS + p.replace(/\.glb$/, '.json')).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }).then((j) => gltf.parseAsync(toGLB(j), '')).then(sharpen)));
// filter model textures properly at grazing angles (cars, palms, people)
function sharpen(g) { g.scene.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) m[k].anisotropy = 16; }); return g; }
export const loadJSON = (p) => once('json:' + p, () => track(fetch(ASSETS + p).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); })));
const texLoader = new THREE.TextureLoader();
export function tex(p, { srgb = true, repeat = true } = {}) {
  return once('tex:' + p, () => {
    let res, rej; const ready = new Promise((a, b) => { res = a; rej = b; });
    const t = texLoader.load(ASSETS + p, () => res(t), undefined, (e) => rej(e));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.userData.ready = track(ready);
    return t;
  });
}
export const loadTex = (p, o) => tex(p, o).userData.ready;
export const loadImage = (p) => once('img:' + p, () => track(new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + p)); i.src = ASSETS + p; })));

// ---------------------------------------------------------------- mesh helpers
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
export const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
export const emissive = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(Math.min(1, k)) });
export function mesh(geo, material, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; return m; }
export function box(w, h, d, material, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.BoxGeometry(w, h, d), material, o); m.position.set(x, y, z); parent?.add(m); return m; }
export function cyl(rt, rb, h, material, seg = 16, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, o); m.position.set(x, y, z); parent?.add(m); return m; }
export function canvasTex(key, w, h, draw) {
  return once('canvas:' + key, () => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; });
}
export function plane(t, w, h, { emit = 0, transparent = true, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: t, transparent, roughness: 0.7, emissive: emit ? 0xffffff : 0, emissiveMap: emit ? t : null, emissiveIntensity: emit, side });
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}
export function signTex(key, text, { w = 1024, h = 256, font = '800 150px Inter, system-ui, sans-serif', color = '#fff', bg = null } = {}) {
  return canvasTex('sign:' + key, w, h, (c) => { if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } c.fillStyle = color; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 6); });
}

// Merge every static mesh under `root` into one mesh per material (world-baked relative to root). Cuts draw calls
// for hand-built sets made of hundreds of small primitives. Meshes flagged userData.dynamic are left alone.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), drop = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.dynamic) return;
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible || p.userData.dynamic) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.morphAttributes = {}; g.clearGroups();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '') + ':' + o.renderOrder;
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder, geos: [] });
    groups.get(key).geos.push(g); drop.push(o);
  });
  for (const o of drop) o.removeFromParent();
  let n = 0;
  for (const { mat, cast, recv, ro, geos } of groups.values()) {
    const merged = BGU.mergeGeometries(geos, false); if (!merged) continue;
    merged.computeBoundingSphere(); const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = recv; m.renderOrder = ro; root.add(m); n++;
  }
  return { before: drop.length, after: n };
}
