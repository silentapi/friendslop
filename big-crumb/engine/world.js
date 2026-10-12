// The giant backyard: instanced grass (gradient + backlit tips + wind), soil, pebbles, clover,
// dandelions, the anthill, pollen and bokeh orbs, and every snack. World = flat, no outlines.
// Food = glossy hero props with a thin outline.
import { THREE, PAL, mat, mesh, outline, rnd, rr, pick, canvasTex, dotTex, bokehTex, keep, clay } from './render.js';
import { hash } from './anim.js';

// ---------------------------------------------------------------- grass
// Blocky grass stalk (Pokopia-style): a thin box, slight forward lean, uv.y = height.
function blockBladeGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 0.45, 1, 5, 1);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); uv.setY(i, y); p.setZ(i, p.getZ(i) + y * y * 0.25); p.setX(i, p.getX(i) * (1 - y * 0.25)); }
  g.computeVertexNormals();
  return g;
}
function bladeGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 6);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - Math.pow(y, 1.6) * 0.92));
    p.setZ(i, y * y * 0.35); // gentle forward curl
  }
  g.computeVertexNormals();
  return g;
}

function grassMaterial(ctx, { root = PAL.grassRoot, mid = PAL.grass, tip = PAL.grassTip } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide });
  const U = ctx.uniforms;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.uniforms.uGlow = U.uGlow;
    sh.uniforms.cRoot = { value: new THREE.Color(root) };
    sh.uniforms.cMid = { value: new THREE.Color(mid) };
    sh.uniforms.cTip = { value: new THREE.Color(tip) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; varying float vH;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vH = uv.y;
        vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float ph = ip.x * 0.37 + ip.z * 0.23;
        float sw = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7) * 0.25;
        transformed.x += sw * 0.09 * vH * vH;
        transformed.z += sw * 0.05 * vH * vH;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow; uniform vec3 cRoot, cMid, cTip; varying float vH;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 g = vH < 0.55 ? mix(cRoot, cMid, smoothstep(0.0, 0.55, vH)) : mix(cMid, cTip, smoothstep(0.55, 1.0, vH));
        diffuseColor.rgb *= g;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += cTip * pow(vH, 2.5) * 0.35 * uGlow;`);
  };
  m.customProgramCacheKey = () => `grass${root}${mid}${tip}`;
  return m;
}

// Scatter blades over a rectangle, skipping clearings [{x,z,r}].
export function grass(ctx, { center = [0, 0], size = [30, 30], count = 4000, h = [2.5, 7], w = [0.22, 0.42], clear = [], colors, shadows = true, tilt = 0.25, block = true } = {}) {
  const geo = block ? blockBladeGeometry() : bladeGeometry();
  const im = new THREE.InstancedMesh(geo, grassMaterial(ctx, colors), count);
  im.castShadow = shadows;
  im.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 6; tries++) {
    const x = center[0] + rr(-size[0], size[0]) / 2;
    const z = center[1] + rr(-size[1], size[1]) / 2;
    let blocked = false;
    for (const c of clear) {
      let d;
      if (c.x2 !== undefined) { // capsule lane (camera sightline)
        const vx = c.x2 - c.x, vz = c.z2 - c.z;
        const u = Math.max(0, Math.min(1, ((x - c.x) * vx + (z - c.z) * vz) / (vx * vx + vz * vz)));
        d = Math.hypot(x - (c.x + vx * u), z - (c.z + vz * u));
      } else d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r && rnd() > Math.pow(d / c.r, 6) * 0.6) { blocked = true; break; }
    }
    if (blocked) continue;
    const hh = rr(h[0], h[1]);
    const ww = rr(w[0], w[1]) * (0.7 + hh / h[1] * 0.4);
    e.set(rr(-tilt, tilt), rr(0, Math.PI * 2), rr(-tilt, tilt));
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(ww, hh, ww));
    im.setMatrixAt(n, m4);
    const v = rr(0.82, 1.12);
    col.setRGB(v * rr(0.92, 1.05), v, v * rr(0.85, 1.0));
    im.setColorAt(n, col);
    n++;
  }
  im.count = n;
  im.userData.noOutline = true;
  ctx.scene.add(im);
  return im;
}

// ---------------------------------------------------------------- ground
const soilTex = () => canvasTex('soil', 512, (g, s) => {
  g.fillStyle = '#8a5a3c';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * s, y = rnd() * s, r = rr(20, 90);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = pick(['176,122,82', '120,78,52', '95,120,60', '150,100,66']);
    gr.addColorStop(0, `rgba(${c},0.45)`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${pick(['60,36,24', '190,140,100', '230,190,150'])},${rr(0.15, 0.45)})`;
    const r = rr(1, 3.5);
    g.beginPath(); g.arc(rnd() * s, rnd() * s, r, 0, 7); g.fill();
  }
});

export function ground(ctx, { size = 200, repeat = 18, color = 0xffffff } = {}) {
  const t = soilTex().clone();
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  const m = mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.95, normalMap: clay(0xffffff, { repeat: repeat * 1.6 }).normalMap, normalScale: new THREE.Vector2(1.6, 1.6) }), { cast: false });
  m.rotation.x = -Math.PI / 2;
  m.userData.noOutline = true;
  ctx.scene.add(m);
  return m;
}

export function pebble(r = 0.5, color = PAL.pebble) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.85 + hash(i * 1.7 + r * 13) * 0.3;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const m = mesh(g, mat(color, { roughness: 0.9, flatShading: true }));
  m.userData.noOutline = true;
  return m;
}
export function pebbles(ctx, list) {
  for (const [x, z, r, c] of list) {
    const p = pebble(r, c ?? pick([0xc9b8a6, 0xb8a594, 0xd8cbb8, 0xa89482]));
    p.position.set(x, r * 0.25, z);
    p.rotation.y = rr(0, 6);
    ctx.scene.add(p);
  }
}
export function scatterPebbles(ctx, { center = [0, 0], size = [20, 20], count = 40, r = [0.08, 0.35], clear = [] } = {}) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const x = center[0] + rr(-size[0], size[0]) / 2;
    const z = center[1] + rr(-size[1], size[1]) / 2;
    if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 0.6)) continue;
    list.push([x, z, rr(r[0], r[1])]);
  }
  pebbles(ctx, list);
}

export function clover(scale = 1) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6), mat(0x4f9a4a));
  stem.position.y = 1.6;
  g.add(stem);
  const leafM = mat(0x5cba55, { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const lg = new THREE.Group();
    for (const s of [-1, 1]) {
      const l = mesh(new THREE.CircleGeometry(0.7, 20), leafM);
      l.position.set(s * 0.42, 0, 0.75);
      l.rotation.x = -Math.PI / 2;
      lg.add(l);
    }
    lg.position.y = 3.2;
    lg.rotation.set(0.2, a, 0);
    g.add(lg);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}

export function dandelion({ height = 9, puff = true } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, height * 0.5, 0.1), new THREE.Vector3(0.1, height, 0)]);
  const stem = mesh(new THREE.TubeGeometry(curve, 16, 0.07, 6), mat(0x7fbf5a, { roughness: 0.7 }));
  g.add(stem);
  const head = new THREE.Group();
  head.position.set(0.1, height, 0);
  if (puff) {
    const core = mesh(new THREE.SphereGeometry(0.28, 14, 10), mat(0xd8c89a));
    head.add(core);
    const seedM = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 0.55, roughness: 1, transparent: true, opacity: 0.9 }));
    const n = 140;
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 4), seedM, n);
    const st = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 3), seedM, n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.399963;
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      m4.compose(d.clone().multiplyScalar(1.05), new THREE.Quaternion(), new THREE.Vector3(1.4, 0.5, 1.4));
      fl.setMatrixAt(i, m4);
      m4.compose(d.clone().multiplyScalar(0.62), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), new THREE.Vector3(1, 0.75, 1));
      st.setMatrixAt(i, m4);
    }
    head.add(fl, st);
  } else {
    const fm = mat(0xffd23f, { roughness: 0.6, emissive: 0x6a4a00, emissiveIntensity: 0.25 });
    for (let i = 0; i < 26; i++) {
      const p = mesh(new THREE.BoxGeometry(0.18, 0.05, 0.9), fm);
      const a = i * 2.399963;
      p.position.set(Math.cos(a) * 0.45, 0.05 * (i % 3), Math.sin(a) * 0.45);
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.x = -0.35;
      head.add(p);
    }
    const c = mesh(new THREE.SphereGeometry(0.3, 12, 8), fm);
    c.scale.y = 0.5;
    head.add(c);
  }
  g.add(head);
  g.userData.head = head;
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}

// A single floating dandelion seed (for the "byeee" gag).
export function dandySeed(scale = 1) {
  const g = new THREE.Group();
  const m = mat(0xffffff, { emissive: 0xfff4dc, emissiveIntensity: 0.5, roughness: 1 });
  const stalk = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), m);
  stalk.position.y = 1.1;
  g.add(stalk);
  const seedBody = mesh(new THREE.ConeGeometry(0.09, 0.4, 6), mat(0xb89a6a));
  seedBody.rotation.x = Math.PI;
  seedBody.position.y = -0.1;
  g.add(seedBody);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const f = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 3), m);
    f.position.set(Math.cos(a) * 0.6, 2.4, Math.sin(a) * 0.6);
    f.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    g.add(f);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => { o.userData.noOutline = true; });
  return g;
}

// Anthill: soft soil mound with a dark hole and loose grains.
export function anthill({ r = 4.5, h = 1.6, hole = 0.9 } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const x = hole + (r - hole) * u;
    const y = h * Math.pow(1 - u, 1.6) * (u < 0.08 ? u / 0.08 : 1);
    pts.push(new THREE.Vector2(x, y));
  }
  const lg = new THREE.LatheGeometry(pts, 48);
  const pos = lg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, pos.getY(i) * (0.9 + 0.2 * hash(Math.round(Math.atan2(z, x) * 6))));
  }
  lg.computeVertexNormals();
  const mound = mesh(lg, clay(0x9a6a48, { rough: 1, repeat: 8, strength: 2.0 }));
  g.add(mound);
  const throat = mesh(new THREE.CylinderGeometry(hole, hole * 0.7, hole * 2.4, 32, 1, true), mat(0x2a1520, { roughness: 1, side: THREE.BackSide }));
  throat.position.y = -hole * 1.1 + h * 0.08;
  g.add(throat);
  const dark = mesh(new THREE.CircleGeometry(hole * 0.72, 32), new THREE.MeshBasicMaterial({ color: 0x1a0c14 }));
  dark.rotation.x = -Math.PI / 2;
  dark.position.y = -hole * 2.2;
  g.add(dark);
  const grainM = mat(0xc48a5c, { roughness: 1, flatShading: true });
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rr(hole * 1.05, r * 1.15);
    const gr = mesh(new THREE.IcosahedronGeometry(rr(0.12, 0.4), 1), grainM);
    const u = (d - hole) / (r - hole);
    gr.position.set(Math.cos(a) * d, Math.max(0.03, h * Math.pow(Math.max(0, 1 - u), 1.6)) + 0.02, Math.sin(a) * d);
    g.add(gr);
  }
  g.traverse((o) => { o.userData.noOutline = true; });
  g.userData.holeR = hole;
  return g;
}

// ---------------------------------------------------------------- atmosphere
export function pollen(ctx, center, size, n = 260, color = 0xfff0c0, sz = 0.06) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = center[0] + rr(-size[0], size[0]) / 2;
    pos[i * 3 + 1] = center[1] + rr(-size[1], size[1]) / 2;
    pos[i * 3 + 2] = center[2] + rr(-size[2], size[2]) / 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const base = pos.slice();
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: sz, map: dotTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  p.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 0.25;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.3 + i * 1.7) * 0.2 + t * 0.05;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.35 + i * 0.7) * 0.25;
    }
    geo.attributes.position.needsUpdate = true;
  };
  ctx.scene.add(p);
  ctx.tick = ctx.tick || [];
  ctx.tick.push(p.userData.update);
  return p;
}

// Big soft bokeh orbs far behind the action (macro lens highlights).
export function bokehOrbs(ctx, center, size, n = 22, colors = [0xfff1c4, 0xffd9a8, 0xd8f07a]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokehTex(), color: pick(colors), transparent: true, opacity: rr(0.12, 0.32), depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.set(center[0] + rr(-size[0], size[0]) / 2, center[1] + rr(-size[1], size[1]) / 2, center[2] + rr(-size[2], size[2]) / 2);
    s.scale.setScalar(rr(1.5, 4.5));
    g.add(s);
  }
  ctx.scene.add(g);
  return g;
}

// Glowing scent ping (rises through the grass in a player's colour).
export function ping(color) {
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(s);
    puffs.push(s);
  }
  g.userData.update = (u) => { // u = seconds since ping
    puffs.forEach((s, i) => {
      const k = Math.max(0, u - i * 0.06);
      s.position.set(Math.sin(i * 2.1 + k * 2) * 0.3, k * 2.2 + i * 0.25, Math.cos(i * 1.3 + k * 2) * 0.3);
      s.scale.setScalar((0.6 + k * 0.9) * (1 + i * 0.08));
      s.material.opacity = Math.max(0, 0.85 - k * 0.35) * (u > 0 ? 1 : 0);
    });
  };
  return g;
}

// ---------------------------------------------------------------- food (glossy heroes)
const glossy = (color, o = {}) => keep(new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.2, ...o }));

function displaced(geo, amt, freq = 3, sd = 1) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + sd) * Math.sin(v.y * freq * 1.3 + sd * 2) * Math.sin(v.z * freq * 0.9 + sd * 3);
    v.multiplyScalar(1 + n * amt + (hash(i + sd) - 0.5) * amt * 0.4);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function crumb(size = 0.45, sd = 1) {
  const g = new THREE.Group();
  const geo = displaced(new THREE.IcosahedronGeometry(size, 2), 0.28, 3.2 / size, sd);
  geo.scale(1.15, 0.8, 1);
  const c = mesh(geo, mat(PAL.crumb, { roughness: 0.85, flatShading: true }));
  c.position.y = size * 0.7;
  g.add(c);
  const crust = mesh(displaced(new THREE.IcosahedronGeometry(size * 0.55, 1), 0.2, 4 / size, sd + 4), mat(0xb87a3e, { roughness: 0.8, flatShading: true }));
  crust.position.set(size * 0.5, size * 0.95, -size * 0.2);
  g.add(crust);
  g.userData.grabs = [[0, size * 1.6, 0]];
  g.userData.lift = size * 0.7;
  return outline(g, 0.02);
}

export function strawberry(s = 1) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const r = Math.sin(Math.pow(u, 0.75) * Math.PI) * (0.9 + 0.25 * u) * (u > 0.85 ? 1 - (u - 0.85) * 2.2 : 1);
    pts.push(new THREE.Vector2(Math.max(0.001, r), u * 2.1));
  }
  const geo = new THREE.LatheGeometry(pts, 32);
  const body = mesh(geo, glossy(PAL.strawberry, { roughness: 0.3, clearcoat: 0.9 }));
  body.rotation.x = Math.PI;
  body.position.y = 2.1;
  g.add(body);
  const seedGeo = new THREE.SphereGeometry(0.05, 6, 4);
  seedGeo.scale(1, 1.6, 0.6);
  const seeds = new THREE.InstancedMesh(seedGeo, mat(0xffe28a, { roughness: 0.5 }), 90);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) {
    const u = 0.12 + (i / 90) * 0.75;
    const a = i * 2.399963;
    const r = Math.sin(Math.pow(u, 0.75) * Math.PI) * (0.9 + 0.25 * u) * 1.0;
    const p = new THREE.Vector3(Math.cos(a) * r, 2.1 - u * 2.1, Math.sin(a) * r);
    const n = new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a)).normalize();
    m4.compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n), new THREE.Vector3(1, 1, 1));
    seeds.setMatrixAt(i, m4);
  }
  g.add(seeds);
  const leafM = mat(0x3fae4a, { roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const l = mesh(new THREE.ConeGeometry(0.22, 1.0, 4), leafM);
    l.scale.set(1, 1, 0.25);
    l.position.set(Math.cos(a) * 0.45, 2.08, Math.sin(a) * 0.45);
    l.rotation.set(0, -a, 0);
    l.rotateZ(-Math.PI / 2 + 0.25);
    g.add(l);
  }
  const stem = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.45, 6), leafM);
  stem.position.y = 2.3;
  g.add(stem);
  g.rotation.z = 0.0;
  g.scale.setScalar(s);
  g.userData.grabs = [[-0.75 * s, 1.9 * s, 0], [0.75 * s, 1.9 * s, 0]];
  return outline(g, 0.02);
}

export function grape(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 32, 22);
  geo.scale(0.95, 0.9, 1.1);
  const b = mesh(geo, glossy(PAL.grape, { roughness: 0.28, clearcoat: 1, sheen: 0.6, sheenColor: new THREE.Color(0xd8c8ff) }));
  b.position.y = 0.9;
  g.add(b);
  const stub = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.35, 6), mat(0x6b8a3a));
  stub.position.set(0, 1.0, 1.15);
  stub.rotation.x = Math.PI / 2;
  g.add(stub);
  g.scale.setScalar(s);
  g.userData.grabs = [[-0.7 * s, 1.7 * s, 0], [0.7 * s, 1.7 * s, 0]];
  g.userData.radius = 1 * s;
  return outline(g, 0.02);
}

const chipTex = () => canvasTex('chip', 256, (g, s) => {
  g.fillStyle = '#f7c75a';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * s, y = rnd() * s, r = rr(10, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${pick(['255,225,140', '226,160,60'])},0.5)`);
    gr.addColorStop(1, 'rgba(255,225,140,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${pick(['120,70,30', '200,90,40', '90,140,60'])},${rr(0.3, 0.7)})`;
    g.beginPath(); g.arc(rnd() * s, rnd() * s, rr(0.8, 2.2), 0, 7); g.fill();
  }
}, { repeat: false });

export function chip(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(2.2, 64);
  { // add rings so the saddle bends smoothly
    const rg = new THREE.RingGeometry(0.001, 2.2, 64, 12);
    geo.copy(rg); rg.dispose();
  }
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const a = Math.atan2(y, x);
    const r = Math.hypot(x, y) * (1 + Math.sin(a * 5) * 0.04 + Math.sin(a * 3 + 1) * 0.05);
    p.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, (x * x - y * y) * 0.12 + Math.sin(x * 2) * 0.05);
  }
  geo.computeVertexNormals();
  const m = keep(new THREE.MeshPhysicalMaterial({ map: chipTex(), roughness: 0.4, clearcoat: 0.5, side: THREE.DoubleSide }));
  const c = mesh(geo, m);
  c.rotation.x = -Math.PI / 2;
  c.position.y = 0.45;
  c.userData.noOutline = true;
  g.add(c);
  g.scale.setScalar(s);
  g.userData.grabs = [[-1.4 * s, 0.9 * s, -0.6 * s], [1.4 * s, 0.9 * s, -0.6 * s], [0, 0.9 * s, 1.5 * s], [0, 0.9 * s, -1.6 * s]];
  return outline(g, 0.02);
}

export function donut(s = 1) {
  const g = new THREE.Group();
  const dough = mesh(new THREE.TorusGeometry(1.6, 0.85, 24, 48), mat(0xe0a060, { roughness: 0.75 }));
  dough.rotation.x = Math.PI / 2;
  dough.position.y = 0.85;
  dough.scale.z = 0.85;
  g.add(dough);
  const fgeo = new THREE.TorusGeometry(1.6, 0.88, 24, 48, Math.PI * 2);
  const fp = fgeo.attributes.position;
  for (let i = 0; i < fp.count; i++) { // keep the top half, wavy drip edge
    const x = fp.getX(i), y = fp.getY(i), z = fp.getZ(i);
    const a = Math.atan2(y, x);
    const drip = 0.15 + Math.sin(a * 9) * 0.12 + Math.sin(a * 4 + 1) * 0.08;
    if (z < -drip) fp.setZ(i, -drip + (z + drip) * 0.05);
  }
  fgeo.computeVertexNormals();
  const frost = mesh(fgeo, glossy(PAL.frosting, { roughness: 0.25, clearcoat: 1 }));
  frost.rotation.x = -Math.PI / 2;
  frost.position.y = 0.9;
  frost.scale.z = 0.85;
  g.add(frost);
  const cols = [0xffffff, 0x4fa8ff, 0xffd23f, 0x3fd08a, 0xff5a4e, 0x8a4fff];
  const spGeo = new THREE.CapsuleGeometry(0.05, 0.22, 2, 6);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 1.6 + rr(-0.55, 0.55);
    const sp = mesh(spGeo, mat(pick(cols), { roughness: 0.4 }));
    const yy = 0.9 + Math.sqrt(Math.max(0, 0.88 * 0.88 - (r - 1.6) * (r - 1.6))) * 0.85 + 0.02;
    sp.position.set(Math.cos(a) * r, yy, Math.sin(a) * r);
    sp.rotation.set(Math.PI / 2, 0, rnd() * 6);
    sp.userData.noOutline = true;
    g.add(sp);
  }
  g.scale.setScalar(s);
  g.userData.grabs = [[2.3 * s, 1.9 * s, 0], [-2.3 * s, 1.9 * s, 0], [0, 1.9 * s, 2.3 * s], [0, 1.9 * s, -2.3 * s]];
  return outline(g, 0.02);
}

export function cookie(s = 1) {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(1.9, 0), new THREE.Vector2(2.05, 0.15), new THREE.Vector2(2.08, 0.35), new THREE.Vector2(1.95, 0.52), new THREE.Vector2(0, 0.6)];
  const geo = displaced(new THREE.LatheGeometry(pts, 40), 0.04, 2.5, 3);
  g.add(mesh(geo, mat(PAL.cookie, { roughness: 0.8 })));
  for (let i = 0; i < 16; i++) {
    const a = rnd() * 6.28, r = rr(0.2, 1.7);
    const c = mesh(new THREE.IcosahedronGeometry(rr(0.14, 0.24), 0), glossy(PAL.choc, { roughness: 0.4 }));
    c.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
    c.scale.y = 0.6;
    g.add(c);
  }
  g.scale.setScalar(s);
  g.userData.grabs = [[-1.6 * s, 1.2 * s, 0.8 * s], [1.6 * s, 1.2 * s, 0.8 * s], [0, 1.2 * s, -1.8 * s]];
  return outline(g, 0.02);
}

export function hotdog(s = 1) {
  const g = new THREE.Group();
  const bunM = mat(PAL.bun, { roughness: 0.7 });
  for (const side of [-1, 1]) {
    const b = mesh(new THREE.CapsuleGeometry(0.55, 5.2, 8, 20), bunM);
    b.rotation.z = Math.PI / 2;
    b.position.set(0, 0.55, side * 0.42);
    b.scale.set(1, 1, 0.8);
    g.add(b);
  }
  const saus = mesh(new THREE.CapsuleGeometry(0.42, 6.0, 8, 20), glossy(PAL.sausage, { roughness: 0.3, clearcoat: 0.9 }));
  saus.rotation.z = Math.PI / 2;
  saus.position.y = 0.95;
  g.add(saus);
  const pts = [];
  for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(new THREE.Vector3(-2.6 + u * 5.2, 1.37, Math.sin(u * Math.PI * 9) * 0.22)); }
  const must = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.08, 6), glossy(0xffd23f, { roughness: 0.3 }));
  must.userData.noOutline = true;
  g.add(must);
  g.scale.setScalar(s);
  g.userData.grabs = [[-2.4 * s, 2 * s, 0], [-0.8 * s, 2 * s, 0], [0.8 * s, 2 * s, 0], [2.4 * s, 2 * s, 0]];
  return outline(g, 0.02);
}

export function cheesePuff(s = 1) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(-2 + u * 4, 0.6 + Math.sin(u * 5) * 0.15, Math.sin(u * 3.5) * 0.6)); }
  const geo = displaced(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.55, 14), 0.12, 6, 2);
  g.add(mesh(geo, mat(PAL.puff, { roughness: 0.95 })));
  g.scale.setScalar(s);
  g.userData.grabs = [[-1.6 * s, 1.5 * s, 0], [1.6 * s, 1.5 * s, 0]];
  return outline(g, 0.02);
}

export function waterDrop(r = 1) {
  const m = keep(new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.05, transmission: 0.9, thickness: 1.2, ior: 1.33, transparent: true, opacity: 0.75, clearcoat: 1 }));
  const d = mesh(new THREE.SphereGeometry(r, 32, 24), m);
  d.userData.noOutline = true;
  return d;
}
