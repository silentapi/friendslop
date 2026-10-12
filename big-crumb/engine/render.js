// BIG CRUMB render core: deterministic random, scene setup, picture-book sky, post stack
// (AO + bloom + macro depth of field + grade). Every frame is a pure function of time.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
export const W = globalThis.__W || 1280;
export const H = globalThis.__H || 720;

// ---------------------------------------------------------------- deterministic randomness
let seed = 1;
export function reseed(s = 1) { seed = s; }
export function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rr = (a, b) => a + (b - a) * rnd();
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------------------------------------------------------------- palette (docs/ART.md)
export const PAL = {
  antBody: 0x8a3e2a, antDark: 0x5a2618, antHi: 0xb05a3a,
  grassRoot: 0x2f5a2a, grass: 0x4f8a3a, grassTip: 0xb8d070,
  soil: 0x6a4630, soilLight: 0x8a6040, pebble: 0xb8aa98, plum: 0x3a2430, ink: 0x2a1730,
  strawberry: 0xe8283c, frosting: 0xff86b8, chip: 0xf2c050, sugar: 0xfff6ea, crumb: 0xe0a860, dough: 0xd8964e,
  stone: 0xb8aa98, hose: 0x3a9a4a, tile: 0xe8e2d6, counter: 0xf4efe6, wood: 0xb07a4a, leaf: 0xc08040,
  cardigan: 0xe8a0a8, pants: 0x8a8aa0, slipper: 0xfff0e0, skin: 0xf0c0a0, hair: 0x6a4030,
  pip: 0xff4a3a, dot: 0x3aa0ff, bean: 0xffd02a, moss: 0x32d07a, queen: 0x8a5a9a, gold: 0xffc93c, cream: 0xfff7e8,
};
export const CSS = { pip: '#ff4a3a', dot: '#3aa0ff', bean: '#ffd02a', moss: '#32d07a', queen: '#c9a7ff', mom: '#e8a0a8', everyone: '#ffffff' };

// Sky / light presets. "gold" = 5pm picnic, "sunset" = the clock is running out, "nest" = underground.
export const LIGHT = {
  gold: { top: 0x7fc4ff, horizon: 0xffe6c8, bottom: 0xf0d0b0, sun: 0xfff2d0, sunColor: 0xfff0d8, sunInt: 2.6, hemiSky: 0xd8ecff, hemiGround: 0x8a7aa8, hemiInt: 1.0, fog: 0xdcecff, env: 0.35, glow: 0.6, exposure: 1.0, grass: { root: 0x4aa060, mid: 0x7ed08a, tip: 0xc8f0a0 } },
  sunset: { top: 0x7a78d8, horizon: 0xffb48a, bottom: 0xe0906a, sun: 0xffd0a0, sunColor: 0xffb070, sunInt: 2.6, hemiSky: 0xc8b8ff, hemiGround: 0x7a5a8a, hemiInt: 0.85, fog: 0xffc0a0, env: 0.3, glow: 1.0, exposure: 1.0, grass: { root: 0x5a8a50, mid: 0x9ac878, tip: 0xffd090 } },
  kitchen: { top: 0xcfe6ff, horizon: 0xcfe6ff, bottom: 0xcfe6ff, sun: 0xffffff, sunColor: 0xfff0dc, sunInt: 1.6, hemiSky: 0xe8f0ff, hemiGround: 0x6a4a4a, hemiInt: 0.5, fog: 0xd8c8b4, env: 0.3, glow: 0.3, exposure: 0.92 },
  nest: { top: 0x3a2030, horizon: 0x3a2030, bottom: 0x2a1520, sun: 0x000000, sunColor: 0xffb46a, sunInt: 0.0, hemiSky: 0xffc89a, hemiGround: 0x3a2030, hemiInt: 0.55, fog: 0x2a1520, env: 0.15, glow: 0, exposure: 1.05 },
};

const matCache = new Map();
const shared = new Set([]);
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts }); matCache.set(key, m); shared.add(m); }
  return matCache.get(key);
}
export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });
shared.add(outlineMat);
export const keep = (m) => { shared.add(m); return m; };
// Inverted-hull outline (ants + food only; the world stays outline-free so it recedes).
export function outline(root, thickness = 0.025) {
  const list = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.noOutline && !o.userData.isOutline && !o.isInstancedMesh) list.push(o); });
  for (const m of list) {
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere.radius || 1;
    const o = new THREE.Mesh(m.geometry, outlineMat);
    o.userData.isOutline = true;
    o.scale.setScalar(1 + thickness / r);
    o.castShadow = false;
    m.add(o);
  }
  return root;
}

// ---------------------------------------------------------------- textures
const texCache = new Map();
export function canvasTex(key, size, draw, { repeat = true } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
export const dotTex = () => canvasTex('dot', 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
}, { repeat: false });
// Bokeh disc: flat bright disc with a slightly brighter rim (lens-ish).
export const bokehTex = () => canvasTex('bokeh', 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.78, 'rgba(255,255,255,0.7)');
  gr.addColorStop(0.9, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
}, { repeat: false });

// ---------------------------------------------------------------- clay
// Thumbprint height field → normal map. Shared image; each material gets its own offset so
// boil() can nudge all of them each animated frame (clay touched between frames).
let clayCanvas = null;
function clayNormalCanvas() {
  if (clayCanvas) return clayCanvas;
  const S = 512;
  const hc = document.createElement('canvas');
  hc.width = hc.height = S;
  const g = hc.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  // soft dents and bumps
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S, y = rnd() * S, r = rr(6, 38), up = rnd() < 0.45;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, up ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
  }
  // thumbprints: concentric ridged ellipses
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, y = rnd() * S, rx = rr(14, 30), ry = rx * rr(1.2, 1.6), rot = rr(0, Math.PI);
    wrap(() => {
      g.save(); g.translate(x, y); g.rotate(rot);
      for (let k = 2; k < rx; k += 2.6) { g.strokeStyle = `rgba(${k % 5.2 < 2.6 ? '255,255,255' : '0,0,0'},0.13)`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, k, k * ry / rx, 0, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    });
  }
  // tool smears
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S, y = rnd() * S, l = rr(20, 70), a = rr(0, Math.PI);
    wrap(() => { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = rr(2, 5); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 8, y + Math.sin(a) * l * 0.5 - 8, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
  const src = g.getImageData(0, 0, S, S).data;
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const og = out.getContext('2d');
  const img = og.createImageData(S, S);
  const H = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2;
    const dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1);
    const o = (y * S + x) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[o + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[o + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  clayCanvas = out;
  return out;
}
// Style switch: Pokopia-like clean finish keeps only a whisper of surface detail.
export const STYLE = { texture: 0.14, rough: 0.9 };
const clayTexs = [];
const clayCache = new Map();
// Plasticine material. scale = texture repeats per unit (bigger objects → lower).
export function clay(color, { rough = 0.62, repeat = 2, strength = 0.55, sheen = 0, metal = 0, emissive = 0x000000, ei = 0, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const key = [color, rough, repeat, strength, sheen, emissive, ei, side, opacity].join('|');
  if (clayCache.has(key)) return clayCache.get(key);
  const t = new THREE.CanvasTexture(clayNormalCanvas());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  clayTexs.push(t);
  const ns = strength * STYLE.texture;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: Math.min(1, rough * STYLE.rough), metalness: metal, normalMap: t, normalScale: new THREE.Vector2(ns, ns), sheen, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), emissive, emissiveIntensity: ei, side, transparent, opacity });
  clayCache.set(key, m);
  shared.add(m);
  return m;
}
// Clay boil: shift every clay normal map a hair per animated frame (on twos).
export function boil(frame) {
  const k = Math.floor(frame / 2);
  for (const t of clayTexs) t.offset.set(((k * 0.6180339) % 1) * 0.02, ((k * 0.4142135) % 1) * 0.02);
}
// Stop-motion time: characters animate on twos (12 fps) inside 24 fps.
export const twos = (t) => t; // v3 animates on ones (smooth, Pokopia-like)

// ---------------------------------------------------------------- setup
let sharedRenderer = null;
export function setup({ light = 'gold', sunDir = [-0.6, 0.22, -0.75], shadowBox = 40, fogNear = 300, fogFar = 7000, sky = true, sunDist = 400 } = {}) {
  reseed(7);
  const L = typeof light === 'string' ? LIGHT[light] : light;
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.setSize(W, H);
    sharedRenderer.shadowMap.enabled = true;
    sharedRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('stage').appendChild(sharedRenderer.domElement);
  }
  const renderer = sharedRenderer;
  renderer.toneMappingExposure = L.exposure;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(L.horizon);
  if (fogFar) scene.fog = new THREE.Fog(L.fog, fogNear, fogFar);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = L.env;
  const hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiInt);
  scene.add(hemi);
  const sd = new THREE.Vector3(...sunDir).normalize();
  const sun = new THREE.DirectionalLight(L.sunColor, L.sunInt);
  sun.position.copy(sd).multiplyScalar(sunDist);
  sun.castShadow = L.sunInt > 0;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 1, far: sunDist * 2.5 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.2, 20000);
  scene.add(camera);
  const ctx = { renderer, scene, camera, sun, hemi, L, sunDir: sd, sunDist, uniforms: { uTime: { value: 0 }, uGlow: { value: L.glow }, uSunDir: { value: sd } } };
  if (sky && L.sunInt > 0) ctx.sky = skyDome(scene, L, sd);
  return ctx;
}

// Keep the shadow frustum centred on where the action is.
export function aimSun(ctx, target) {
  ctx.sun.target.position.set(...target);
  ctx.sun.position.copy(ctx.sunDir).multiplyScalar(ctx.sunDist).add(ctx.sun.target.position);
}

export function skyDome(scene, L, sunDir) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color(L.top) }, horizon: { value: new THREE.Color(L.horizon) }, bottom: { value: new THREE.Color(L.bottom) }, sunDir: { value: sunDir }, sunColor: { value: new THREE.Color(L.sun) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, horizon, bottom, sunDir, sunColor; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(horizon, top, pow(clamp(h,0.0,1.0), 0.6));
        col = mix(col, bottom, smoothstep(0.0, -0.2, h));
        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.28 + pow(s, 3.0) * 0.08);
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(15000, 32, 16), m);
  dome.userData.noOutline = true;
  scene.add(dome);
  return dome;
}

// ---------------------------------------------------------------- post
const gradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.18 }, grain: { value: 0.012 }, warm: { value: 0.02 }, lift: { value: 0.04 }, sat: { value: 1.1 }, fade: { value: 0 }, fadeColor: { value: new THREE.Color(0, 0, 0) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, grain, warm, lift, sat, fade; uniform vec3 fadeColor; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, sat);
      // plum-tinted shadows (picture-book: shadows are a colour, never grey)
      c.rgb = c.rgb * (1.0 - lift) + lift * vec3(0.42, 0.36, 0.6);
      c.rgb *= vec3(1.0 + warm, 1.0, 1.0 - warm * 0.8);
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.75);
      c.rgb *= 1.0 - vig * smoothstep(0.25, 0.8, length(d));
      c.rgb += (rand(vUv * 1000.0) - 0.5) * grain;
      float dth = rand(vUv * 1731.0 + 0.37) + rand(vUv * 913.0 + 0.71) - 1.0;
      c.rgb += dth / 255.0;
      c.rgb = mix(c.rgb, fadeColor, fade);
      gl_FragColor = c;
    }`,
};

export function makeComposer(ctx, { ao = 0.9, aoRadius = 0.35, bloom = 0.45, bloomThreshold = 0.82, bloomRadius = 0.55, dof = { focus: 6, aperture: 0.012, maxblur: 0.012 }, grade = {} } = {}) {
  const { renderer, scene, camera } = ctx;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (ao) {
    const p = new GTAOPass(scene, camera, W, H);
    p.blendIntensity = ao;
    p.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
    p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
    // additive sprites/points/glass must not occlude in the AO normal-depth pass (dark squares)
    p.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || o.isSprite || o.userData.noDepth) o.visible = false; });
    };
    composer.addPass(p);
  }
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), bloom, bloomRadius, bloomThreshold));
  if (dof) {
    const bp = new BokehPass(scene, camera, { focus: dof.focus, aperture: dof.aperture, maxblur: dof.maxblur });
    // same for the DOF depth pass: glows shouldn't punch focus holes
    const orig = bp.render.bind(bp);
    bp.render = (...args) => {
      const hidden = [];
      scene.traverse((o) => { if (o.visible && (o.isPoints || o.isSprite || o.userData.noDepth)) { o.visible = false; hidden.push(o); } });
      const r = orig(...args);
      for (const o of hidden) o.visible = true;
      return r;
    };
    composer.addPass(bp);
    composer.bokeh = bp;
  }
  composer.addPass(new OutputPass());
  const gp = new ShaderPass(gradeShader);
  for (const [k, v] of Object.entries(grade)) gp.uniforms[k].value = v;
  composer.addPass(gp);
  composer.grade = gp;
  composer.focusOn = (pt) => {
    if (!composer.bokeh) return;
    const p = pt.isVector3 ? pt : new THREE.Vector3(...pt);
    composer.bokeh.uniforms.focus.value = camera.position.distanceTo(p);
  };
  composer.dispose2 = () => { composer.dispose(); rt.dispose(); };
  return composer;
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (!shared.has(m) && m.dispose) m.dispose();
    }
  });
}
