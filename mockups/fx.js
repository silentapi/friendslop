// Polish layer for the mockups: procedural textures, sky, clouds, light shafts, dust,
// set-dressing props, and a post-processing stack (AO + bloom + grade/vignette/grain).
import { THREE, W, H, mat, mesh, box, cyl, sphere, capsule, addOutlines } from './lib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// ---------------------------------------------------------------- deterministic randomness
let seed = 1337;
export function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rr = (a, b) => a + (b - a) * rnd();

function css(hex, shade = 0, alpha = 1) {
  const c = new THREE.Color(hex);
  if (shade > 0) c.lerp(new THREE.Color(0xffffff), shade);
  if (shade < 0) c.multiplyScalar(1 + shade);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}

// ---------------------------------------------------------------- canvas textures
const texCache = new Map();
function canvasTex(key, size, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

function speckle(g, s, n, color, a0, a1, r0 = 0.5, r1 = 1.5) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = css(color, 0, rr(a0, a1));
    const r = rr(r0, r1);
    g.fillRect(rnd() * s, rnd() * s, r, r);
  }
}
function blotches(g, s, n, color, a, r0, r1) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * s;
    const y = rnd() * s;
    const r = rr(r0, r1);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, css(color, 0, a));
    gr.addColorStop(1, css(color, 0, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export const T = {
  wood: (base = 0xc98b55, rows = 6) => canvasTex(`wood${base}${rows}`, 1024, (g, s) => {
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      let x = -rnd() * s * 0.6;
      while (x < s) {
        const len = rr(s * 0.35, s * 0.8);
        g.fillStyle = css(base, rr(-0.12, 0.1));
        g.fillRect(x, y, len, rh);
        for (let k = 0; k < 26; k++) {
          g.strokeStyle = css(base, rr(-0.35, -0.15), rr(0.12, 0.35));
          g.lineWidth = rr(0.6, 2);
          g.beginPath();
          const yy = y + rnd() * rh;
          g.moveTo(x, yy);
          for (let xx = x; xx < x + len; xx += 20) g.lineTo(xx, yy + Math.sin(xx * 0.02 + k) * rr(0.5, 2.5));
          g.stroke();
        }
        if (rnd() < 0.35) {
          g.fillStyle = css(base, -0.45, 0.6);
          g.beginPath();
          g.ellipse(x + rnd() * len, y + rh / 2, rr(4, 10), rr(3, 6), 0, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = 'rgba(40,20,10,.55)';
        g.fillRect(x, y, 3, rh);
        x += len;
      }
      g.fillStyle = 'rgba(40,20,10,.6)';
      g.fillRect(0, y, s, 3);
    }
  }),
  tile: (a = 0xffffff, b = 0xf2c6d0, n = 8, grout = 0xd9d4cc) => canvasTex(`tile${a}${b}${n}`, 1024, (g, s) => {
    const ts = s / n;
    g.fillStyle = css(grout);
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const base = (i + j) % 2 ? a : b;
        const gr = g.createLinearGradient(i * ts, j * ts, (i + 1) * ts, (j + 1) * ts);
        gr.addColorStop(0, css(base, 0.12));
        gr.addColorStop(1, css(base, rr(-0.08, -0.02)));
        g.fillStyle = gr;
        g.fillRect(i * ts + 5, j * ts + 5, ts - 10, ts - 10);
      }
    }
    speckle(g, s, 3000, 0x000000, 0.02, 0.06);
  }),
  plaster: (base = 0xfff3d6) => canvasTex(`plaster${base}`, 512, (g, s) => {
    g.fillStyle = css(base);
    g.fillRect(0, 0, s, s);
    blotches(g, s, 30, 0x000000, 0.035, 30, 120);
    blotches(g, s, 20, 0xffffff, 0.05, 30, 100);
    speckle(g, s, 6000, 0x000000, 0.02, 0.07);
  }),
  wallpaper: (base = 0xa8e6cf, stripe = 0x8fd3b8) => canvasTex(`wp${base}${stripe}`, 512, (g, s) => {
    g.fillStyle = css(base);
    g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 64) {
      g.fillStyle = css(stripe);
      g.fillRect(x, 0, 22, s);
      for (let y = 16; y < s; y += 48) {
        g.fillStyle = css(0xffffff, 0, 0.35);
        g.beginPath();
        g.arc(x + 43, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    blotches(g, s, 12, 0x000000, 0.03, 40, 120);
    speckle(g, s, 3000, 0x000000, 0.02, 0.05);
  }),
  concrete: (base = 0x9c9a96) => canvasTex(`concrete${base}`, 1024, (g, s) => {
    g.fillStyle = css(base);
    g.fillRect(0, 0, s, s);
    blotches(g, s, 60, 0x000000, 0.08, 20, 140);
    blotches(g, s, 30, 0xffffff, 0.06, 20, 100);
    blotches(g, s, 6, 0x3a2a1a, 0.18, 30, 80);
    speckle(g, s, 20000, 0x000000, 0.04, 0.15, 0.5, 2);
    speckle(g, s, 8000, 0xffffff, 0.04, 0.12, 0.5, 2);
    for (let c = 0; c < 5; c++) {
      g.strokeStyle = 'rgba(30,25,20,.35)';
      g.lineWidth = rr(1, 2.5);
      g.beginPath();
      let x = rnd() * s;
      let y = rnd() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 12; k++) {
        x += rr(-30, 30);
        y += rr(5, 30);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }),
  cinder: (base = 0xb5b1aa) => canvasTex(`cinder${base}`, 1024, (g, s) => {
    g.fillStyle = css(base, -0.25);
    g.fillRect(0, 0, s, s);
    const bh = s / 8;
    const bw = s / 4;
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * bw / 2;
      for (let c = -1; c < 5; c++) {
        const x = c * bw + off;
        const y = r * bh;
        g.fillStyle = css(base, rr(-0.1, 0.06));
        g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
      }
    }
    speckle(g, s, 30000, 0x000000, 0.05, 0.18, 0.5, 2);
    blotches(g, s, 20, 0x2a2018, 0.1, 30, 120);
  }),
  grass: () => canvasTex('grass', 1024, (g, s) => {
    g.fillStyle = '#6fb04f';
    g.fillRect(0, 0, s, s);
    blotches(g, s, 50, 0x8ccf5a, 0.25, 40, 160);
    blotches(g, s, 40, 0x4d8a3a, 0.22, 40, 160);
    for (let i = 0; i < 26000; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      g.strokeStyle = css([0x5e9e44, 0x7cc25a, 0x92d468, 0x4f8a38][i % 4], 0, rr(0.35, 0.8));
      g.lineWidth = rr(0.8, 1.6);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rr(-2, 2), y - rr(3, 8));
      g.stroke();
    }
  }),
  asphalt: () => canvasTex('asphalt', 512, (g, s) => {
    g.fillStyle = '#5d6068';
    g.fillRect(0, 0, s, s);
    blotches(g, s, 30, 0x000000, 0.12, 20, 100);
    speckle(g, s, 30000, 0x000000, 0.1, 0.3, 0.5, 1.8);
    speckle(g, s, 12000, 0xffffff, 0.06, 0.2, 0.5, 1.5);
  }),
  pavers: () => canvasTex('pavers', 512, (g, s) => {
    g.fillStyle = '#9a958c';
    g.fillRect(0, 0, s, s);
    const n = 4;
    const ts = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = css(0xd6d0c4, rr(-0.08, 0.04));
      g.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
    }
    speckle(g, s, 9000, 0x000000, 0.04, 0.12);
    blotches(g, s, 10, 0x000000, 0.08, 20, 60);
  }),
  siding: (base = 0xffd6a5) => canvasTex(`siding${base}`, 512, (g, s) => {
    const n = 12;
    const bh = s / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(0, i * bh, 0, (i + 1) * bh);
      gr.addColorStop(0, css(base, -0.18));
      gr.addColorStop(0.15, css(base, 0.04));
      gr.addColorStop(1, css(base, -0.04));
      g.fillStyle = gr;
      g.fillRect(0, i * bh, s, bh);
    }
    speckle(g, s, 5000, 0x000000, 0.02, 0.06);
    blotches(g, s, 8, 0x000000, 0.04, 40, 120);
  }),
  shingles: (base = 0x5b6d9e) => canvasTex(`shingles${base}`, 1024, (g, s) => {
    g.fillStyle = css(base, -0.5);
    g.fillRect(0, 0, s, s);
    const rows = 16;
    const rh = s / rows;
    const tw = s / 10;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * tw / 2;
      for (let c = -1; c < 11; c++) {
        const gr = g.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
        const sh = rr(-0.18, 0.08);
        gr.addColorStop(0, css(base, sh - 0.15));
        gr.addColorStop(1, css(base, sh + 0.05));
        g.fillStyle = gr;
        g.fillRect(c * tw + off + 2, r * rh + 2, tw - 4, rh - 3);
      }
    }
    speckle(g, s, 20000, 0x000000, 0.08, 0.2, 0.5, 2);
  }),
  fabric: (base) => canvasTex(`fabric${base}`, 256, (g, s) => {
    g.fillStyle = css(base);
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) {
      g.fillStyle = css(0x000000, 0, 0.05);
      g.fillRect(i, 0, 1, s);
      g.fillStyle = css(0xffffff, 0, 0.04);
      g.fillRect(0, i, s, 1);
    }
    speckle(g, s, 1500, 0x000000, 0.03, 0.08);
  }),
  stripes: (a, b, n = 8) => canvasTex(`stripes${a}${b}${n}`, 256, (g, s) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = css(i % 2 ? a : b);
      g.fillRect((i * s) / n, 0, s / n, s);
    }
  }),
  caution: () => canvasTex('caution', 256, (g, s) => {
    g.fillStyle = '#ffd23f';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#1b1b1b';
    for (let i = -s; i < s * 2; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 32, 0);
      g.lineTo(i + 32 - s, s);
      g.lineTo(i - s, s);
      g.fill();
    }
  }),
  gradient: () => canvasTex('grad', 64, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(1, '#000');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }),
  dot: () => canvasTex('dot', 64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }),
};

// Material from a texture with world-size tiling. `size` = metres per texture repeat.
const tmCache = new Map();
export function tmat(tex, repeatU, repeatV, { rough = 0.85, bump = 0.6, color = 0xffffff, metal = 0 } = {}) {
  const key = `${tex.uuid}|${repeatU.toFixed(2)}|${repeatV.toFixed(2)}|${rough}|${bump}|${color}`;
  if (tmCache.has(key)) return tmCache.get(key);
  const t = tex.clone();
  t.repeat.set(repeatU, repeatV);
  t.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: t, color, roughness: rough, metalness: metal, bumpMap: bump ? t : null, bumpScale: bump });
  tmCache.set(key, m);
  return m;
}

// Textured slab/wall: picks the two largest dimensions for tiling.
export function surf(w, h, d, tex, size = 2, opts = {}) {
  const dims = [w, h, d].sort((a, b) => b - a);
  const m = mesh(new THREE.BoxGeometry(w, h, d), tmat(tex, dims[0] / size, dims[1] / size, opts));
  m.userData.noOutline = true;
  // box faces use different axis pairs; for thin walls/floors the big faces dominate, which is what we see
  if (h < w && h < d) {
    m.material = tmat(tex, w / size, d / size, opts);
  } else if (d < w && d < h) {
    m.material = tmat(tex, w / size, h / size, opts);
  } else {
    m.material = tmat(tex, d / size, h / size, opts);
  }
  return m;
}

// ---------------------------------------------------------------- scene setup

export function setup({
  bg = 0xffd6a5, fog = [0xffd6a5, 30, 140], exposure = 1.0, env = 0.35,
  sunPos = [-30, 18, 20], sunColor = 0xffc48a, sunInt = 3.0, hemiSky = 0xbfd8ff, hemiGround = 0x8a6a4a, hemiInt = 0.7,
  shadowBox = 30, renderer: existing = null, shadowMap = 4096,
} = {}) {
  seed = 1337;
  const renderer = existing || new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  if (!existing) {
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('stage').appendChild(renderer.domElement);
  }
  renderer.toneMappingExposure = exposure;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;

  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiInt);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(sunColor, sunInt);
  sun.position.set(...sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMap, shadowMap);
  Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 0.5, far: 200 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(72, W / H, 0.05, 1500);
  scene.add(camera);
  return { renderer, scene, camera, sun, hemi };
}

// Gradient sky dome with a sun glow (colours in sRGB hex).
export function skyDome(scene, { top = 0x5f9be0, horizon = 0xffc79a, bottom = 0xf2b48a, sunDir = [-0.8, 0.18, 0.5], sunColor = 0xffd9a0 } = {}) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, bottom: { value: new THREE.Color(bottom) },
      sunDir: { value: new THREE.Vector3(...sunDir).normalize() }, sunColor: { value: new THREE.Color(sunColor) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, horizon, bottom, sunDir, sunColor; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(horizon, top, pow(clamp(h,0.0,1.0), 0.55));
        col = mix(col, bottom, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        col += sunColor * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.45 + pow(s, 3.0) * 0.12);
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const dome = new THREE.Mesh(geo, m);
  dome.userData.noOutline = true;
  scene.add(dome);
  return dome;
}

export function clouds(scene, list) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffc8a0, emissiveIntensity: 0.25, fog: false });
  for (const [x, y, z, s] of list) {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(rr(0.6, 1.1), 16, 12), m);
      p.position.set(rr(-1.8, 1.8), rr(-0.2, 0.6), rr(-0.6, 0.6));
      p.scale.y = 0.7;
      g.add(p);
    }
    const base = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), m);
    base.scale.set(1.8, 0.45, 0.8);
    base.position.y = -0.2;
    g.add(base);
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    g.lookAt(0, y, 0);
    scene.add(g);
  }
}

// Visible light shaft from `from` to `to` (additive, fades along its length).
export function shaft(scene, from, to, r0, r1, { color = 0xffd9a0, opacity = 0.22, segs = 4 } = {}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r0, r1, len, segs, 1, true);
  geo.translate(0, -len / 2, 0);
  if (segs === 4) geo.rotateY(Math.PI / 4);
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, alphaMap: T.gradient(), blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const s = new THREE.Mesh(geo, m);
  s.position.copy(a);
  s.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
  s.userData.noOutline = true;
  s.castShadow = false;
  s.receiveShadow = false;
  scene.add(s);
  return s;
}

export function motes(scene, center, size, n = 300, color = 0xffe2b0, ptSize = 0.035) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = center[0] + rr(-size[0], size[0]) / 2;
    pos[i * 3 + 1] = center[1] + rr(-size[1], size[1]) / 2;
    pos[i * 3 + 2] = center[2] + rr(-size[2], size[2]) / 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: ptSize, map: T.dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
  }));
  scene.add(p);
  return p;
}

// Bright glowing patch (sunlight on the floor/wall).
export function lightPatch(scene, w, h, pos, rot, { color = 0xffc98a, opacity = 0.35 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, alphaMap: T.dot(),
  }));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.userData.noOutline = true;
  scene.add(m);
  return m;
}

export function glow(color, r = 0.15) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color }));
  m.userData.noOutline = true;
  m.castShadow = false;
  return m;
}

// ---------------------------------------------------------------- props

export function cord(scene, pts, color = 0xff8a1f, r = 0.025) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const m = mesh(new THREE.TubeGeometry(curve, 80, r, 8), mat(color, { roughness: 0.5 }));
  m.userData.noOutline = true;
  scene.add(m);
  return m;
}

export function cautionTape(scene, pts) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const t = T.caution().clone();
  t.repeat.set(curve.getLength() * 3, 1);
  t.needsUpdate = true;
  const m = mesh(new THREE.TubeGeometry(curve, 60, 0.04, 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide }));
  m.scale.set(1, 1, 1);
  m.userData.noOutline = true;
  scene.add(m);
}

export function toolbox(color = 0xe8352f) {
  const g = new THREE.Group();
  const b = box(0.7, 0.32, 0.32, color, { roughness: 0.4, metalness: 0.3 });
  b.position.y = 0.16;
  g.add(b);
  const lid = box(0.72, 0.06, 0.34, color, { roughness: 0.4, metalness: 0.3 });
  lid.position.set(0, 0.38, -0.12);
  lid.rotation.x = -0.9;
  g.add(lid);
  const tray = box(0.66, 0.05, 0.28, 0x333333);
  tray.position.set(0, 0.3, 0);
  g.add(tray);
  for (let i = 0; i < 4; i++) {
    const t = box(0.04, 0.04, 0.22, [0xffd23f, 0x4f8dff, 0xb9c0c8, 0x3ccf7a][i], { metalness: 0.4, roughness: 0.4 });
    t.position.set(-0.24 + i * 0.16, 0.36, 0);
    t.rotation.y = rr(-0.4, 0.4);
    g.add(t);
  }
  return addOutlines(g, 0.012);
}

export function paintCan(color = 0xc9b6ff, label = 0xffffff) {
  const g = new THREE.Group();
  const c = cyl(0.17, 0.17, 0.32, 0xc9ced4);
  c.material = mat(0xc9ced4, { metalness: 0.6, roughness: 0.35 });
  c.position.y = 0.16;
  g.add(c);
  const l = cyl(0.172, 0.172, 0.18, label);
  l.position.y = 0.15;
  l.userData.noOutline = true;
  g.add(l);
  const sw = cyl(0.174, 0.174, 0.06, color);
  sw.position.y = 0.15;
  sw.userData.noOutline = true;
  g.add(sw);
  const drip = box(0.04, 0.12, 0.02, color);
  drip.position.set(0.1, 0.27, 0.14);
  drip.userData.noOutline = true;
  g.add(drip);
  return addOutlines(g, 0.01);
}

export function coffee() {
  const g = new THREE.Group();
  const c = cyl(0.055, 0.045, 0.16, 0xffffff);
  c.position.y = 0.08;
  g.add(c);
  const sl = cyl(0.058, 0.052, 0.06, 0xa36b3f);
  sl.position.y = 0.08;
  sl.userData.noOutline = true;
  g.add(sl);
  const lid = cyl(0.06, 0.06, 0.02, 0x2a2a2a);
  lid.position.y = 0.17;
  g.add(lid);
  return addOutlines(g, 0.006);
}

export function tapeMeasure() {
  const g = new THREE.Group();
  const b = box(0.12, 0.12, 0.05, 0xffd23f, { roughness: 0.4 });
  b.position.y = 0.06;
  g.add(b);
  const tape = box(0.5, 0.004, 0.025, 0xfff3a0);
  tape.position.set(0.3, 0.005, 0);
  tape.userData.noOutline = true;
  g.add(tape);
  return addOutlines(g, 0.006);
}

export function sawhorse(len = 1.4) {
  const g = new THREE.Group();
  const top = box(len, 0.1, 0.12, 0xd9a066);
  top.position.y = 0.8;
  g.add(top);
  for (const x of [-len / 2 + 0.15, len / 2 - 0.15]) {
    for (const s of [-1, 1]) {
      const leg = box(0.07, 0.85, 0.07, 0xc98b55);
      leg.position.set(x, 0.4, s * 0.15);
      leg.rotation.x = s * 0.3;
      g.add(leg);
    }
  }
  return addOutlines(g, 0.01);
}

export function trafficCone() {
  const g = new THREE.Group();
  const c = mesh(new THREE.ConeGeometry(0.2, 0.7, 20), mat(0xff6a1f, { roughness: 0.5 }));
  c.position.y = 0.38;
  g.add(c);
  const s = cyl(0.115, 0.15, 0.1, 0xffffff);
  s.position.y = 0.38;
  s.userData.noOutline = true;
  g.add(s);
  const b = box(0.48, 0.05, 0.48, 0xff6a1f);
  b.position.y = 0.025;
  g.add(b);
  return addOutlines(g, 0.01);
}

export function plant(potColor = 0xc96a3f) {
  const g = new THREE.Group();
  const pot = cyl(0.22, 0.16, 0.35, potColor);
  pot.position.y = 0.175;
  g.add(pot);
  for (let i = 0; i < 9; i++) {
    const leaf = sphere(0.14, i % 2 ? 0x4f9e44 : 0x62b552, 10, 8);
    leaf.scale.set(0.6, 1.6, 0.3);
    leaf.position.set(rr(-0.12, 0.12), 0.55 + rr(0, 0.2), rr(-0.12, 0.12));
    leaf.rotation.set(rr(-0.6, 0.6), rr(0, 3), rr(-0.6, 0.6));
    g.add(leaf);
  }
  return addOutlines(g, 0.01);
}

export function pictureFrame(w, h, color, art) {
  const g = new THREE.Group();
  const f = box(w, h, 0.05, color);
  g.add(f);
  const a = box(w * 0.82, h * 0.82, 0.055, art);
  a.userData.noOutline = true;
  g.add(a);
  const sun = sphere(Math.min(w, h) * 0.12, 0xffd23f, 10, 8);
  sun.scale.z = 0.2;
  sun.position.set(w * 0.18, h * 0.15, 0.03);
  sun.userData.noOutline = true;
  g.add(sun);
  const hill = sphere(w * 0.35, 0x62b552, 12, 8);
  hill.scale.set(1, 0.4, 0.1);
  hill.position.set(-w * 0.1, -h * 0.3, 0.03);
  hill.userData.noOutline = true;
  g.add(hill);
  return addOutlines(g, 0.008);
}

export function outlet(two = true) {
  const g = new THREE.Group();
  const p = box(0.08, two ? 0.12 : 0.1, 0.012, 0xf5f2ea);
  g.add(p);
  if (two) {
    for (const y of [-0.025, 0.025]) {
      const s = box(0.03, 0.025, 0.014, 0x8a8478);
      s.position.y = y;
      s.userData.noOutline = true;
      g.add(s);
    }
  } else {
    const s = box(0.015, 0.035, 0.016, 0xf0ece0);
    g.add(s);
  }
  return addOutlines(g, 0.004);
}

export function windowFrame(w, h, { frame = 0xffffff, glass = 0x9fd6ff, mull = true, sill = true, emissive = 0x000000 } = {}) {
  const g = new THREE.Group();
  const t = 0.08;
  const gl = box(w, h, 0.03, glass, { roughness: 0.05, metalness: 0.1, emissive, transparent: true, opacity: 0.45 });
  gl.userData.noOutline = true;
  g.add(gl);
  for (const [x, y, ww, hh] of [[0, h / 2, w + t * 2, t], [0, -h / 2, w + t * 2, t], [-w / 2, 0, t, h], [w / 2, 0, t, h]]) {
    const b = box(ww, hh, 0.12, frame);
    b.position.set(x, y, 0);
    g.add(b);
  }
  if (mull) {
    const v = box(0.05, h, 0.08, frame);
    g.add(v);
    const hm = box(w, 0.05, 0.08, frame);
    g.add(hm);
  }
  if (sill) {
    const s = box(w + 0.3, 0.07, 0.25, frame);
    s.position.set(0, -h / 2 - 0.05, 0.08);
    g.add(s);
  }
  return addOutlines(g, 0.01);
}

export function treeFancy(scale = 1, leaf = 0x5fae46) {
  const g = new THREE.Group();
  const trunk = cyl(0.18, 0.3, 2.2, 0x7a5232);
  trunk.position.y = 1.1;
  g.add(trunk);
  for (let i = 0; i < 14; i++) {
    const r = rr(0.6, 1.1);
    const l = sphere(r, new THREE.Color(leaf).offsetHSL(rr(-0.02, 0.03), rr(-0.1, 0.05), rr(-0.08, 0.06)).getHex(), 14, 10);
    const a = rnd() * Math.PI * 2;
    const d = rr(0, 1.2);
    l.position.set(Math.cos(a) * d, 2.5 + rr(-0.5, 1.2), Math.sin(a) * d);
    l.userData.noOutline = i % 3 !== 0;
    g.add(l);
  }
  g.scale.setScalar(scale);
  return addOutlines(g, 0.02);
}

export function hedge(len, color = 0x4f9a40) {
  const g = new THREE.Group();
  for (let x = -len / 2; x <= len / 2; x += 0.5) {
    const b = sphere(rr(0.45, 0.6), new THREE.Color(color).offsetHSL(0, 0, rr(-0.06, 0.05)).getHex(), 12, 10);
    b.position.set(x, 0.5, rr(-0.1, 0.1));
    b.userData.noOutline = true;
    g.add(b);
  }
  return g;
}

export function flowers(n, spread, colors = [0xff6f91, 0xffd23f, 0xffffff, 0xa65cff]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const f = sphere(0.07, colors[i % colors.length], 8, 6);
    f.position.set(rr(-spread[0], spread[0]) / 2, rr(0.15, 0.35), rr(-spread[1], spread[1]) / 2);
    f.userData.noOutline = true;
    g.add(f);
  }
  return g;
}

export function powerPole(h = 9) {
  const g = new THREE.Group();
  const p = cyl(0.14, 0.18, h, 0x6b4a32);
  p.position.y = h / 2;
  g.add(p);
  const bar = box(2.2, 0.12, 0.12, 0x6b4a32);
  bar.position.y = h - 0.6;
  g.add(bar);
  for (const x of [-0.9, 0, 0.9]) {
    const ins = cyl(0.05, 0.05, 0.18, 0x7ec7c0);
    ins.position.set(x, h - 0.45, 0);
    g.add(ins);
  }
  const tx = cyl(0.3, 0.3, 0.8, 0x8a9199);
  tx.position.set(0.3, h - 1.6, 0);
  g.add(tx);
  return addOutlines(g, 0.015);
}

export function streetLamp(on = true) {
  const g = new THREE.Group();
  const p = cyl(0.07, 0.1, 4.2, 0x2e3440);
  p.position.y = 2.1;
  g.add(p);
  const arm = box(1.0, 0.07, 0.07, 0x2e3440);
  arm.position.set(0.45, 4.15, 0);
  g.add(arm);
  const head = box(0.5, 0.15, 0.28, 0x2e3440);
  head.position.set(0.9, 4.08, 0);
  g.add(head);
  if (on) {
    const bulbM = glow(0xffd88a, 0.12);
    bulbM.scale.set(1.6, 0.4, 1);
    bulbM.position.set(0.9, 3.98, 0);
    g.add(bulbM);
  }
  return addOutlines(g, 0.012);
}

export function mailbox() {
  const g = new THREE.Group();
  const post = box(0.1, 1.1, 0.1, 0xffffff);
  post.position.y = 0.55;
  g.add(post);
  const b = box(0.28, 0.28, 0.5, 0x3c8dff);
  b.position.y = 1.2;
  g.add(b);
  const top = cyl(0.14, 0.14, 0.5, 0x3c8dff);
  top.rotation.x = Math.PI / 2;
  top.position.y = 1.34;
  g.add(top);
  const flag = box(0.02, 0.2, 0.06, 0xff3c3c);
  flag.position.set(0.15, 1.38, -0.05);
  g.add(flag);
  return addOutlines(g, 0.01);
}

export function pallet(stack = 0, stackColor = 0xeceff3) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = box(0.18, 0.04, 1.2, 0xd9a066);
    s.position.set(-0.48 + i * 0.24, 0.13, 0);
    g.add(s);
  }
  for (const z of [-0.5, 0, 0.5]) {
    const b = box(1.2, 0.1, 0.12, 0xc98b55);
    b.position.set(0, 0.05, z);
    g.add(b);
  }
  for (let i = 0; i < stack; i++) {
    const sh = box(1.15, 0.05, 1.15, stackColor);
    sh.position.y = 0.18 + i * 0.055;
    sh.rotation.y = rr(-0.04, 0.04);
    g.add(sh);
  }
  return addOutlines(g, 0.01);
}

export function wheelbarrow() {
  const g = new THREE.Group();
  const tray = mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.35, 4, 1, true), mat(0x3c8a4a, { side: THREE.DoubleSide, roughness: 0.5 }));
  tray.rotation.y = Math.PI / 4;
  tray.scale.set(1.3, 1, 0.9);
  tray.position.y = 0.6;
  g.add(tray);
  const bottom = box(0.6, 0.04, 0.45, 0x2e6a38);
  bottom.position.y = 0.43;
  g.add(bottom);
  const wheel = cyl(0.2, 0.2, 0.1, 0x222222);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0.75, 0.2, 0);
  g.add(wheel);
  for (const z of [-0.25, 0.25]) {
    const h = box(1.4, 0.05, 0.05, 0x8a5a33);
    h.position.set(-0.2, 0.5, z);
    h.rotation.z = 0.25;
    g.add(h);
  }
  return addOutlines(g, 0.01);
}

// ---------------------------------------------------------------- post-processing

const gradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.32 }, grain: { value: 0.035 }, warm: { value: 0.04 }, lift: { value: 0.02 }, sat: { value: 1.08 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, grain, warm, lift, sat; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = c.rgb * (1.0 - lift) + lift * vec3(0.16, 0.12, 0.2);
      c.rgb *= vec3(1.0 + warm, 1.0, 1.0 - warm);
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.75);
      c.rgb *= 1.0 - vig * smoothstep(0.25, 0.75, length(d));
      c.rgb += (rand(vUv * 1000.0) - 0.5) * grain;
      // TPDF dither (±1/255) so sky / backdrop gradients don't band after 8-bit + H.264.
      float dth = rand(vUv * 1731.0 + 0.37) + rand(vUv * 913.0 + 0.71) - 1.0;
      c.rgb += dth / 255.0;
      gl_FragColor = c;
    }`,
};

export function renderFx(ctx, opts = {}) {
  if (opts.before) opts.before();
  makeComposer(ctx, opts).render();
}

export function makeComposer({ renderer, scene, camera }, { ao = 1.0, aoRadius = 0.6, aoSamples = 16, bloom = 0.35, bloomThreshold = 0.85, grade = {}, dof = null } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (ao) {
    const aoPass = new GTAOPass(scene, camera, W, H);
    aoPass.blendIntensity = ao;
    aoPass.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.5, thickness: 1.5, scale: 1.2, samples: aoSamples });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: aoSamples });
    composer.addPass(aoPass);
  }
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), bloom, 0.5, bloomThreshold));
  if (dof) {
    // Depth of field: scenes update composer.bokeh.uniforms.focus each frame to stay on the hero.
    const bp = new BokehPass(scene, camera, { focus: dof.focus ?? 8, aperture: dof.aperture ?? 0.0025, maxblur: dof.maxblur ?? 0.008 });
    composer.addPass(bp);
    composer.bokeh = bp;
  }
  composer.addPass(new OutputPass());
  const gp = new ShaderPass(gradeShader);
  for (const [k, v] of Object.entries(grade)) gp.uniforms[k].value = v;
  composer.addPass(gp);
  composer.grade = gp;
  composer.dispose2 = () => { composer.dispose(); rt.dispose(); };
  return composer;
}


// Three-point rig on top of setup(): warm key from the camera's front-right (~28° off axis),
// cool rim from behind-left to edge silhouettes, and the scene's hemi/env kept low as fill.
// camPos/target describe the shot's general framing so the rig follows the camera side.
export function keyRim(scene, camPos, target, { key = 0xffd7b0, keyInt = 1.6, rim = 0xbcd6ff, rimInt = 2.2, dist = 12, shadows = false } = {}) {
  const c = new THREE.Vector3(...camPos);
  const t = new THREE.Vector3(...target);
  const fwd = t.clone().sub(c).setY(0).normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const ang = THREE.MathUtils.degToRad(28);
  const keyDir = fwd.clone().multiplyScalar(-Math.cos(ang)).add(right.clone().multiplyScalar(Math.sin(ang))).normalize();
  const k = new THREE.DirectionalLight(key, keyInt);
  k.position.copy(t).addScaledVector(keyDir, dist).add(new THREE.Vector3(0, dist * 0.6, 0));
  k.target.position.copy(t);
  k.castShadow = shadows;
  const rimDir = fwd.clone().add(right.clone().multiplyScalar(-0.8)).normalize();
  const r = new THREE.DirectionalLight(rim, rimInt);
  r.position.copy(t).addScaledVector(rimDir, dist).add(new THREE.Vector3(0, dist * 0.45, 0));
  r.target.position.copy(t);
  scene.add(k, k.target, r, r.target);
  return { key: k, rim: r };
}
