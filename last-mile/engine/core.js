// LAST MILE render core: deterministic random, dusk sky, scene setup, post stack
// (bloom + cinematic grade: CA, zoom blur, vignette, grain, flash). Every frame is a pure function of time.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
export const W = globalThis.__W || 720;
export const H = globalThis.__H || 1280;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

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
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function noise1(t) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }

// ---------------------------------------------------------------- palette (docs/ART.md)
export const PAL = {
  eats: 0x06c167, eatsDark: 0x05944f, ink: 0x0b0d14, asphalt: 0x1c1e26, asphaltWet: 0x15171e, curb: 0x8a8a90, walk: 0x5a5a62,
  brick: 0x8e3b2b, brickDark: 0x5e2318, cream: 0xf3e6cc, glassBlue: 0x2b4a6e, glassTeal: 0x2e6a70, concrete: 0xb8b2aa,
  palm: 0x2f6a3a, trunk: 0x7a5a3a, hoodie: 0x1d2230, jeans: 0x2a3550, skin: 0xc68a62, helmet: 0xf2f2f2, visor: 0x101418,
  sbGreen: 0x00704a, caramel: 0xc77a2a, coffee: 0x6a3a1e, milk: 0xe9d6b8, swan: 0xf6f4ee, beak: 0xff7a1a,
  neonPink: 0xff3d8b, neonCyan: 0x34e4ff, neonAmber: 0xffb03a, lynx: 0xe8e8ee, sunrail: 0xf2c200,
};
export const CSS = { eats: '#06C167', sb: '#00704A', red: '#ff3b3b', gold: '#ffd23a', cyan: '#34e4ff', pink: '#ff3d8b' };

// Light presets. "dusk" = blue hour downtown, "night" = after dark, "inside" = lobby / stairwell.
export const LIGHT = {
  dusk: { top: 0x0d1a44, mid: 0x3a3e86, horizon: 0xff8a5c, glowC: 0xffb070, fog: 0x3a3a6e, hemiSky: 0x8a94c4, hemiGround: 0x3a2e2a, hemiInt: 0.85, key: 0xffb27a, keyInt: 1.4, env: 0.35, exposure: 1.05 },
  night: { top: 0x050818, mid: 0x15204a, horizon: 0x6a3a7a, glowC: 0xff7a50, fog: 0x1a1a3a, hemiSky: 0x4a5aa8, hemiGround: 0x1a1020, hemiInt: 0.7, key: 0x9ab0ff, keyInt: 0.8, env: 0.25, exposure: 1.1 },
  inside: { top: 0x101010, mid: 0x101010, horizon: 0x101010, glowC: 0x000000, fog: 0x14161c, hemiSky: 0xd8e0ff, hemiGround: 0x3a3030, hemiInt: 0.6, key: 0xfff0dc, keyInt: 1.2, env: 0.4, exposure: 1.0 },
};

const matCache = new Map();
const shared = new Set();
export const keep = (m) => { shared.add(m); return m; };
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache.has(key)) matCache.set(key, keep(new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts })));
  return matCache.get(key);
}
export function glow(color, intensity = 2) { return mat(0x000000, { emissive: color, emissiveIntensity: intensity, roughness: 1 }); }
export function mesh(geo, material, { cast = false, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
export function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
export function cyl(rt, rb, h, material, seg = 16, x = 0, y = 0, z = 0, parent) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------------- textures
const texCache = new Map();
export function canvasTex(key, w, h, draw, { repeat = true, srgb = true } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
export const dotTex = () => canvasTex('dot', 64, 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
}, { repeat: false });
// Vertical streak (wet-road light reflection).
export const streakTex = () => canvasTex('streak', 32, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  const id = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = 1 - Math.abs(x - w / 2) / (w / 2);
    id.data[(y * w + x) * 4 + 3] *= Math.pow(k, 1.6);
  }
  g.putImageData(id, 0, 0);
}, { repeat: false });

// Additive glow sprite (lamps, headlights). Never occludes.
export function glowSprite(color, size, intensity = 1) {
  const m = new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(color).multiplyScalar(intensity), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, toneMapped: false });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.userData.noDepth = true;
  return s;
}
// Flat additive quad (reflection streaks, light pools).
export function addQuad(tex, color, w, h, intensity = 1) {
  const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(intensity), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false, side: THREE.DoubleSide });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noDepth = true;
  q.renderOrder = 2;
  return q;
}

// ---------------------------------------------------------------- setup
let sharedRenderer = null;
export function setup({ light = 'dusk', keyDir = [-0.7, 0.35, -0.6], fogNear = 120, fogFar = 1400, sky = true, shadow = false, shadowBox = 20, fov = 50 } = {}) {
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
  scene.background = new THREE.Color(L.mid);
  if (fogFar) scene.fog = new THREE.Fog(L.fog, fogNear, fogFar);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = L.env;
  const hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiInt);
  scene.add(hemi);
  const kd = new THREE.Vector3(...keyDir).normalize();
  const key = new THREE.DirectionalLight(L.key, L.keyInt);
  key.position.copy(kd).multiplyScalar(200);
  key.castShadow = shadow;
  if (shadow) {
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 1, far: 600 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3;
  }
  scene.add(key, key.target);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.05, 6000);
  scene.add(camera);
  const ctx = { renderer, scene, camera, key, hemi, L, keyDir: kd, tick: [], uniforms: { uTime: { value: 0 } } };
  if (sky && light !== 'inside') ctx.sky = skyDome(scene, L, kd);
  return ctx;
}
export function aimKey(ctx, target) {
  ctx.key.target.position.set(...target);
  ctx.key.position.copy(ctx.keyDir).multiplyScalar(200).add(ctx.key.target.position);
}

// Blue-hour sky: deep indigo top, violet middle, a hot coral band on the western horizon, a few stars.
export function skyDome(scene, L, keyDir) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color(L.top) }, mid: { value: new THREE.Color(L.mid) }, horizon: { value: new THREE.Color(L.horizon) }, glowC: { value: new THREE.Color(L.glowC) }, sunDir: { value: new THREE.Vector3(keyDir.x, 0, keyDir.z).normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, horizon, glowC, sunDir; varying vec3 vDir;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        float s = max(dot(normalize(vec3(d.x,0.0,d.z)), sunDir), 0.0);
        vec3 hz = mix(mid, horizon, 0.35 + 0.65 * pow(s, 2.0));
        vec3 col = mix(hz, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.75, h));
        col += glowC * pow(s, 6.0) * exp(-max(h, 0.0) * 9.0) * 0.6;
        col = mix(col, hz * 0.35, smoothstep(0.0, -0.15, h));
        // high cirrus lit coral from below by the set sun
        vec2 cp = d.xz / max(d.y + 0.08, 0.02) * 0.6;
        float cl = 0.0, a = 0.5; vec2 q = cp;
        for (int i = 0; i < 5; i++) { cl += a * vn(q); q = q * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        cl = smoothstep(0.5, 0.85, cl) * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.35, 0.8, h));
        vec3 cc = mix(mid * 0.55, horizon * 1.1, pow(s, 1.5) * 0.8 + 0.15);
        col = mix(col, cc, cl * 0.75);
        vec2 g = floor(vec2(atan(d.z, d.x) * 300.0, h * 300.0));
        float st = step(0.9965, h21(g)) * smoothstep(0.25, 0.6, h) * (1.0 - cl);
        col += vec3(st) * 0.8;
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), m);
  dome.userData.noDepth = true;
  scene.add(dome);
  return dome;
}

// Capture the built city into the environment map, so wet asphalt, glass and paint reflect the real scene.
export function captureEnv(ctx, pos, { size = 256, intensity = 1 } = {}) {
  const { renderer, scene } = ctx;
  const crt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cc = new THREE.CubeCamera(0.5, 4000, crt);
  cc.position.copy(pos.isVector3 ? pos : V(...pos));
  scene.add(cc);
  const hidden = [];
  scene.traverse((o) => { if (o.userData.noEnv && o.visible) { o.visible = false; hidden.push(o); } });
  const prevEnv = scene.environment;
  scene.environment = null;
  cc.update(renderer, scene);
  scene.environment = prevEnv;
  for (const o of hidden) o.visible = true;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromCubemap(crt.texture).texture;
  pm.dispose();
  crt.dispose();
  scene.remove(cc);
  scene.environment = env;
  scene.environmentIntensity = intensity;
  return env;
}

// ---------------------------------------------------------------- post
const gradeShader = {
  uniforms: {
    tDiffuse: { value: null }, vig: { value: 0.32 }, grain: { value: 0.035 }, ca: { value: 0.0015 }, zoom: { value: 0 }, zoomC: { value: new THREE.Vector2(0.5, 0.5) },
    lift: { value: 0.03 }, sat: { value: 1.12 }, contrast: { value: 1.08 }, teal: { value: 0.12 }, flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) },
    fade: { value: 0 }, seed: { value: 0 }, mono: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, grain, ca, zoom, lift, sat, contrast, teal, flash, fade, seed, mono; uniform vec2 zoomC; uniform vec3 flashColor; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    vec3 samp(vec2 uv){
      vec2 d = uv - 0.5;
      float r = dot(d, d);
      vec2 o = d * ca * (1.0 + r * 6.0);
      return vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b);
    }
    void main(){
      vec3 c;
      if (zoom > 0.0) {
        vec2 dir = vUv - zoomC; c = vec3(0.0); float tw = 0.0;
        for (int i = 0; i < 12; i++) { float k = float(i) / 11.0; float w = 1.0 - k * 0.6; c += samp(vUv - dir * zoom * k * (0.9 + 0.2 * rand(vUv + k))) * w; tw += w; }
        c /= tw;
      } else c = samp(vUv);
      c = (c - 0.5) * contrast + 0.5;
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(vec3(l), c, sat);
      // teal shadows / warm highlights (blockbuster split-tone)
      c += teal * (vec3(-0.06, 0.02, 0.07) * (1.0 - smoothstep(0.0, 0.5, l)) + vec3(0.06, 0.015, -0.05) * smoothstep(0.45, 1.0, l));
      c = c * (1.0 - lift) + lift * vec3(0.10, 0.12, 0.22);
      c = mix(c, vec3(dot(c, vec3(0.299,0.587,0.114))), mono);
      vec2 d = (vUv - 0.5) * vec2(0.7, 1.0);
      c *= 1.0 - vig * smoothstep(0.2, 0.75, length(d));
      c += (rand(vUv * 1000.0 + seed) - 0.5) * grain;
      c += (rand(vUv * 1731.0 + 0.37) + rand(vUv * 913.0 + 0.71) - 1.0) / 255.0;
      c = mix(c, flashColor, flash);
      c *= 1.0 - fade;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export function makeComposer(ctx, { bloom = 0.5, bloomThreshold = 0.92, bloomRadius = 0.45, dof = null, grade = {} } = {}) {
  const { renderer, scene, camera } = ctx;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (bloom) { composer.bloomPass = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bloom, bloomRadius, bloomThreshold); composer.addPass(composer.bloomPass); }
  if (dof) {
    const bp = new BokehPass(scene, camera, { focus: dof.focus, aperture: dof.aperture, maxblur: dof.maxblur });
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
  composer.base = Object.fromEntries(Object.keys(gradeShader.uniforms).filter((k) => typeof gp.uniforms[k].value === 'number').map((k) => [k, gp.uniforms[k].value]));
  composer.focusOn = (pt) => { if (composer.bokeh) composer.bokeh.uniforms.focus.value = camera.position.distanceTo(pt.isVector3 ? pt : V(...pt)); };
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

// ---------------------------------------------------------------- animation helpers
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeIn = (k) => k * k * k;
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const expo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
export const sstep = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };
export const lerpV = (a, b, k) => V(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
export function spring(t, t0, { amp = 1, freq = 4, damp = 0.35 } = {}) {
  if (t < t0) return 0;
  const u = t - t0;
  return amp * Math.exp(-u / damp) * Math.sin(u * freq * Math.PI * 2);
}
// Handheld drift: low-frequency noise per axis.
export function handheld(t, amt = 1, seedK = 0) {
  return V((noise1(t * 0.9 + seedK) - 0.5) * amt, (noise1(t * 0.7 + 17 + seedK) - 0.5) * amt, (noise1(t * 0.8 + 33 + seedK) - 0.5) * amt);
}
// Impact shake: decaying jitter after t0.
export function shake(t, t0, amt = 1, dur = 0.35) {
  if (t < t0 || t > t0 + dur) return V();
  const k = 1 - (t - t0) / dur;
  const f = (t - t0) * 60;
  return V((hash(Math.floor(f)) - 0.5) * amt * k * k, (hash(Math.floor(f) + 50) - 0.5) * amt * k * k, 0);
}
// Camera rig: position + target (+ optional roll in radians).
export function aim(cam, pos, target, roll = 0) {
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
}
