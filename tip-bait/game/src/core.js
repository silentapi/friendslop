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

// ---------------------------------------------------------------- loading with progress
const cache = new Map();
let total = 0, done = 0;
export const progress = { onChange: null };
function track(p) { total++; progress.onChange?.(done, total); return p.finally(() => { done++; progress.onChange?.(done, total); }); }
export function once(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
const gltf = new GLTFLoader();
export const loadGLB = (p) => once('glb:' + p, () => track(gltf.loadAsync(ASSETS + p)));
export const loadJSON = (p) => once('json:' + p, () => track(fetch(ASSETS + p).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); })));
const texLoader = new THREE.TextureLoader();
export function tex(p, { srgb = true, repeat = true } = {}) {
  return once('tex:' + p, () => {
    let res, rej; const ready = new Promise((a, b) => { res = a; rej = b; });
    const t = texLoader.load(ASSETS + p, () => res(t), undefined, (e) => rej(e));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.userData.ready = track(ready);
    return t;
  });
}
export const loadTex = (p, o) => tex(p, o).userData.ready;

// ---------------------------------------------------------------- mesh helpers
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
export const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
export const emissive = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(Math.min(1, k)) });
export function mesh(geo, material, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; return m; }
export function box(w, h, d, material, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.BoxGeometry(w, h, d), material, o); m.position.set(x, y, z); parent?.add(m); return m; }
export function cyl(rt, rb, h, material, seg = 16, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, o); m.position.set(x, y, z); parent?.add(m); return m; }
export function canvasTex(key, w, h, draw) {
  return once('canvas:' + key, () => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; });
}
export function plane(t, w, h, { emit = 0, transparent = true, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: t, transparent, roughness: 0.7, emissive: emit ? 0xffffff : 0, emissiveMap: emit ? t : null, emissiveIntensity: emit, side });
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}
export function signTex(key, text, { w = 1024, h = 256, font = '800 150px Inter, system-ui, sans-serif', color = '#fff', bg = null } = {}) {
  return canvasTex('sign:' + key, w, h, (c) => { if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } c.fillStyle = color; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 6); });
}
