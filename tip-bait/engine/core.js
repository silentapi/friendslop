// TIP BAIT render core. Physically based: HDRI image-based light + matching sky, a shadowed sun, GTAO, filmic
// tone mapping, and offline accumulation (N sub-frames per frame → real motion blur + anti-aliasing).
// Every frame is a pure function of time; nothing uses Math.random().
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export { THREE };
export const OUT_W = 1080, OUT_H = 1920;
export const SCALE = globalThis.__GL_SCALE || 0.8; // GL resolution relative to the 1080x1920 output
export const W = Math.round(OUT_W * SCALE), H = Math.round(OUT_H * SCALE);
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const ASSETS = new URL('../assets/', import.meta.url).href;

// ---------------------------------------------------------------- deterministic randomness
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function mulberry(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function noise1(t) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }

// ---------------------------------------------------------------- easing / animation helpers
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeIn = (k) => k * k * k;
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const lerpV = (a, b, k) => V(lerp(a[0] ?? a.x, b[0] ?? b.x, k), lerp(a[1] ?? a.y, b[1] ?? b.y, k), lerp(a[2] ?? a.z, b[2] ?? b.z, k));
export function handheld(t, amt = 1, s = 0) { return V((noise1(t * 1.1 + s) - 0.5) * amt, (noise1(t * 0.9 + 17 + s) - 0.5) * amt, (noise1(t * 0.7 + 33 + s) - 0.5) * amt * 0.5); }
export function shake(t, t0, amt = 1, dur = 0.35) {
  if (t < t0 || t > t0 + dur) return V();
  const k = 1 - (t - t0) / dur, f = Math.floor((t - t0) * 60);
  return V((hash(f) - 0.5) * amt * k * k, (hash(f + 50) - 0.5) * amt * k * k, 0);
}
export function spring(t, t0, { amp = 1, freq = 3, damp = 0.3 } = {}) { if (t < t0) return 0; const u = t - t0; return amp * Math.exp(-u / damp) * Math.sin(u * freq * Math.PI * 2); }
export function aim(cam, pos, target, roll = 0) { cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(target); if (roll) cam.rotateZ(roll); }

// ---------------------------------------------------------------- loading (cached across shots)
const cache = new Map();
export function once(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
const texLoader = new THREE.TextureLoader();
export function tex(path, { srgb = true, repeat = 1, aniso = 8 } = {}) {
  return once('tex:' + path + srgb, () => {
    const t = texLoader.load(ASSETS + path);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.repeat.set(repeat, repeat);
    return t;
  });
}
export const waitTextures = () => new Promise((r) => { const m = THREE.DefaultLoadingManager; if (!m.itemsLoading) return r(); const prev = m.onLoad; m.onLoad = () => { prev && prev(); r(); }; });
// PBR set from assets/tex: <id>_diff/_nor_gl/_rough (Poly Haven) or <id>_Color/_NormalGL/_Roughness (ambientCG).
export function pbr(id, { color = 0xffffff, rough = 1, normal = 1, metal = 0, env = 1, world = 0, ...rest } = {}) {
  return once(`pbr:${id}:${color}:${rough}:${normal}:${metal}:${world}:${JSON.stringify(rest)}`, () => {
    const acg = /^[A-Z]/.test(id);
    const m = new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal, envMapIntensity: env,
      map: tex(`tex/${id}${acg ? '_Color' : '_diff'}.jpg`),
      normalMap: tex(`tex/${id}${acg ? '_NormalGL' : '_nor_gl'}.jpg`, { srgb: false }),
      roughnessMap: tex(`tex/${id}${acg ? '_Roughness' : '_rough'}.jpg`, { srgb: false }),
      normalScale: new THREE.Vector2(normal, normal), ...rest,
    });
    if (world) worldUV(m, world);
    m.userData.keep = true;
    return m;
  });
}
// Replace mesh UVs with world-space planar mapping (xz for floors, wall-aligned for walls). scale = metres per tile.
export function worldUV(material, scale) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uWS = { value: 1 / scale };
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      vec4 wpUV = modelMatrix * vec4(position, 1.0);
      vec3 wnUV = normalize(mat3(modelMatrix) * normal);
      vec2 wuv = abs(wnUV.y) > 0.7 ? wpUV.xz : vec2(dot(wpUV.xz, normalize(vec2(-wnUV.z, wnUV.x) + 1e-5)), wpUV.y);
      #ifdef USE_MAP
        vMapUv = wuv * uWS;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = wuv * uWS;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = wuv * uWS;
      #endif`).replace('void main() {', 'uniform float uWS;\nvoid main() {');
  };
  material.customProgramCacheKey = () => 'wuv' + scale;
}
export function mat(color, o = {}) { return once('mat:' + color + JSON.stringify(o), () => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }); m.userData.keep = true; return m; }); }
export function emissive(color, k = 2) { return mat(0x000000, { emissive: color, emissiveIntensity: k, roughness: 1 }); }
export function mesh(geo, material, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; return m; }
export function box(w, h, d, material, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.BoxGeometry(w, h, d), material, o); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function cyl(rt, rb, h, material, seg = 16, x = 0, y = 0, z = 0, parent, o) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, o); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function canvasTex(key, w, h, draw, { srgb = true } = {}) {
  return once('ctex:' + key, () => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
}

// ---------------------------------------------------------------- skies (HDR light + high-res tonemapped background)
export const SKIES = {
  golden: { hdr: 'hdri/evening_road_01_puresky_2k.hdr', bg: 'hdri/evening_road_01_puresky_6k.jpg', sunColor: 0xffd2a0, sunInt: 3.0, env: 0.8, bgInt: 0.9, exposure: 0.78 },
  storm: { hdr: 'hdri/kloofendal_overcast_puresky_2k.hdr', bg: 'hdri/kloofendal_overcast_puresky_6k.jpg', sunColor: 0xc8d0e0, sunInt: 0.25, env: 1.0, bgInt: 0.55, exposure: 0.85 },
  dusk: { hdr: 'hdri/qwantani_dusk_2_puresky_2k.hdr', bg: 'hdri/qwantani_dusk_2_puresky_6k.jpg', sunColor: 0xffb07a, sunInt: 0.8, env: 1.0, bgInt: 1.0, exposure: 1.0 },
};
let renderer = null, pmrem = null;
const envCache = new Map();
// Pure-sky HDRIs are black below the horizon: fill the lower hemisphere with a lit city ground (asphalt/concrete
// tone scaled by the horizon brightness) so reflective surfaces facing down don't turn black.
function getEnv(path, ground = [0.42, 0.40, 0.38]) {
  if (!envCache.has(path)) envCache.set(path, new Promise((res) => new RGBELoader().load(ASSETS + path, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const sc = new THREE.Scene();
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { tMap: { value: t }, ground: { value: new THREE.Vector3(...ground) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tMap; uniform vec3 ground; varying vec3 vD;
        vec2 eq(vec3 d){ return vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5); }
        void main(){ vec3 d = normalize(vD);
          vec3 sky = texture2D(tMap, eq(d)).rgb;
          vec3 hz = texture2D(tMap, eq(normalize(vec3(d.x, 0.04, d.z)))).rgb;
          float hb = dot(hz, vec3(0.333));
          vec3 gnd = ground * clamp(hb, 0.2, 3.0) * 0.55;
          gl_FragColor = vec4(mix(gnd, sky, smoothstep(-0.03, 0.02, d.y)), 1.0); }`,
    });
    sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), m));
    const crt = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.1, 100, crt);
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    cc.update(renderer, sc);
    renderer.toneMapping = tm;
    const env = pmrem.fromCubemap(crt.texture).texture;
    res({ hdr: t, env, cube: crt });
  })));
  return envCache.get(path);
}
export function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.domElement.style.width = OUT_W + 'px';
  renderer.domElement.style.height = OUT_H + 'px';
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  document.getElementById('stage').appendChild(renderer.domElement);
  pmrem = new THREE.PMREMGenerator(renderer);
  return renderer;
}
// Prepare a scene: sky, env light, sun. sunAz/sunEl in degrees (az 0 = north/-z, 90 = east/+x).
export async function setup({ sky = 'golden', sunAz = 250, sunEl = 14, skyRot = 0, fov = 50, shadowBox = 30, near = 0.05, far = 4000, fog = null } = {}) {
  const r = getRenderer();
  const S = SKIES[sky];
  const scene = new THREE.Scene();
  const { env } = await getEnv(S.hdr);
  const bg = tex(S.bg);
  bg.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.environmentIntensity = S.env;
  scene.background = bg;
  scene.backgroundIntensity = S.bgInt;
  scene.backgroundRotation.set(0, skyRot, 0);
  scene.environmentRotation.set(0, skyRot, 0);
  if (fog) scene.fog = new THREE.FogExp2(fog.color, fog.density);
  r.toneMappingExposure = S.exposure;
  const az = THREE.MathUtils.degToRad(sunAz), el = THREE.MathUtils.degToRad(sunEl);
  const sunDir = V(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const sun = new THREE.DirectionalLight(S.sunColor, S.sunInt);
  sun.castShadow = S.sunInt > 0.4;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 1, far: 1500 });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  const camera = new THREE.PerspectiveCamera(fov, W / H, near, far);
  scene.add(camera);
  const ctx = { renderer: r, scene, camera, sun, sunDir, sky: S, tick: [] };
  ctx.focusSun = (p, dist = 600) => { sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sunDir, dist); sun.target.updateMatrixWorld(); };
  ctx.focusSun(V());
  return ctx;
}

// ---------------------------------------------------------------- post + accumulation
const gradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.28 }, ca: { value: 0.0012 }, sat: { value: 1.06 }, contrast: { value: 1.04 }, warm: { value: 0.02 }, lift: { value: 0.0 },
    flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) }, fade: { value: 0 }, zoom: { value: 0 }, mono: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, ca, sat, contrast, warm, lift, flash, fade, zoom, mono; uniform vec3 flashColor; varying vec2 vUv;
    vec3 samp(vec2 uv){ vec2 d = uv - 0.5; vec2 o = d * ca * (1.0 + dot(d,d) * 5.0);
      return vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
    void main(){
      vec3 c;
      if (zoom > 0.0) { c = vec3(0.0); for (int i = 0; i < 10; i++) { float k = float(i) / 9.0; c += samp(vUv - (vUv - 0.5) * zoom * k); } c /= 10.0; }
      else c = samp(vUv);
      c = (c - 0.5) * contrast + 0.5 + lift;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      c = mix(c, vec3(l), mono);
      c *= vec3(1.0 + warm, 1.0, 1.0 - warm);
      vec2 d = (vUv - 0.5) * vec2(0.62, 1.0);
      c *= 1.0 - vig * smoothstep(0.25, 0.78, length(d));
      c = mix(c, flashColor, flash);
      c *= 1.0 - fade;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};
const accumShader = {
  uniforms: { tDiffuse: { value: null }, k: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * k, 1.0); }',
};
const grainShader = {
  uniforms: { tDiffuse: { value: null }, grain: { value: 0.025 }, seed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float grain, seed; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; c += (rand(vUv * 1000.0 + seed) - 0.5) * grain; c += (rand(vUv * 1731.0 + seed + 0.37) - 0.5) / 255.0; gl_FragColor = vec4(c, 1.0); }`,
};
export function makePost(ctx, { ao = 0.65, aoRadius = 0.35, bloom = 0.35, bloomThreshold = 0.9, grade = {} } = {}) {
  const { renderer: r, scene, camera } = ctx;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(r, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  if (ao) {
    const p = new GTAOPass(scene, camera, W, H);
    p.blendIntensity = ao;
    p.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.4, thickness: 1.5, scale: 1.0, samples: 12 });
    p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    p.overrideVisibility = function () { const c = this._visibilityCache; this.scene.traverse((o) => { c.set(o, o.visible); if (o.isPoints || o.isSprite || o.userData.noAO) o.visible = false; }); };
    composer.addPass(p);
  }
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bloom, 0.5, bloomThreshold));
  composer.addPass(new OutputPass());
  const gp = new ShaderPass(gradeShader);
  composer.addPass(gp);
  composer.grade = gp;
  composer.base = Object.fromEntries(Object.entries(gradeShader.uniforms).filter(([, u]) => typeof u.value === 'number').map(([k, u]) => [k, u.value]));
  for (const [k, v] of Object.entries(grade)) { gp.uniforms[k].value = v; composer.base[k] = v; }
  // accumulation target + quad
  const acc = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const accMat = new THREE.ShaderMaterial({ ...accumShader, uniforms: THREE.UniformsUtils.clone(accumShader.uniforms), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat);
  quadScene.add(quad);
  const outMat = new THREE.ShaderMaterial({ ...grainShader, uniforms: THREE.UniformsUtils.clone(grainShader.uniforms), depthTest: false, depthWrite: false });
  composer.accumulate = (i, n) => {
    accMat.uniforms.tDiffuse.value = composer.readBuffer.texture;
    accMat.uniforms.k.value = 1 / n;
    r.setRenderTarget(acc);
    if (i === 0) { r.setClearColor(0x000000, 1); r.clear(); }
    const tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
    r.render(quadScene, quadCam);
    r.toneMapping = tm;
  };
  composer.present = (seed) => {
    quad.material = outMat;
    outMat.uniforms.tDiffuse.value = acc.texture;
    outMat.uniforms.seed.value = seed;
    r.setRenderTarget(null);
    const tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
    r.render(quadScene, quadCam);
    r.toneMapping = tm;
    quad.material = accMat;
  };
  composer.dispose2 = () => { composer.dispose(); rt.dispose(); acc.dispose(); };
  return composer;
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry && !o.geometry.userData?.keep) o.geometry.dispose();
    if (o.material) for (const m of [].concat(o.material)) if (!m.userData?.keep) m.dispose();
  });
}
