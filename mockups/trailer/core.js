// Trailer toolkit: bean rigs + poses, deterministic particles, overlay HTML helpers.
import { THREE, PAL, W, H, mat, mesh, box, cyl, sphere, addOutlines, worker, grandma, pin } from '../lib.js';
import { rr, glow } from '../fx.js';

export const BEAN_SCALE = 0.72;
export const COL = { kev: '#4f8dff', gus: '#a65cff', mo: '#3ccf7a', you: '#ff8a3d', red: '#ff4d5e', gold: '#ffd23f' };
export const HEXC = { kev: PAL.blue, gus: PAL.purple, mo: PAL.green, you: PAL.orange };
const LOOK = {
  kev: { stache: 'handlebar', skin: 0xe0a77d },
  gus: { stache: 'pencil', skin: 0xf2c09b },
  mo: { stache: 'beard', skin: 0x9c6b4a, stacheColor: 0x2b1a10 },
  you: { stache: 'walrus', skin: 0xf2c09b },
};

// ---------------------------------------------------------------- easing
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t) => Math.pow(clamp01(t), 3);
export const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeBack = (t) => { t = clamp01(t); const c1 = 1.9; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function pathAt(pts, u) {
  const n = pts.length - 1;
  const f = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  return pts[i].map((a, j) => lerp(a, pts[i + 1][j], k));
}

// ---------------------------------------------------------------- beans
export function bean(who, { hat, scale = BEAN_SCALE } = {}) {
  const w = worker({ color: HEXC[who], ...LOOK[who], ...(hat !== undefined ? { hat } : {}) });
  const head = w.userData.parts.head;
  const mouth = mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0x5a1420, { roughness: 0.6 }));
  mouth.position.set(0, -0.3, 0.47);
  mouth.scale.set(1, 0.05, 0.5);
  mouth.userData.noOutline = true;
  head.add(mouth);
  w.userData.mouth = mouth;
  w.userData.eyes = head.children.filter((c) => c.isMesh && c.geometry.parameters && c.geometry.parameters.radius === 0.075);
  w.scale.setScalar(scale);
  w.userData.who = who;
  return addOutlines(w);
}

export function granny(scale = BEAN_SCALE) {
  const g = grandma();
  g.scale.setScalar(scale);
  return addOutlines(g);
}

export function face(o, x, z) { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); }

// Reset limbs to neutral before applying a pose each frame.
export function neutral(w) {
  const P = w.userData.parts;
  for (const k of ['legL', 'legR', 'torso', 'head']) P[k]?.rotation.set(0, 0, 0);
  P.armL.rotation.set(0, 0, -0.25);
  P.armR.rotation.set(0, 0, 0.25);
  if (w.userData.mouth) w.userData.mouth.scale.set(1, 0.05, 0.5);
  for (const e of w.userData.eyes || []) e.scale.set(1, 1.3, 0.6);
}

export function mouth(w, open) {
  if (w.userData.mouth) w.userData.mouth.scale.set(1 + open * 0.3, 0.05 + open * 1.4, 0.5);
}
export function eyes(w, wide) {
  for (const e of w.userData.eyes || []) e.scale.set(1 + wide * 0.6, 1.3 + wide * 0.9, 0.6);
}

// Walk/run cycle. Returns vertical bob to add to the root height.
export function walk(w, phase, amt = 0.6, armAmt = amt * 0.8) {
  const P = w.userData.parts;
  const s = Math.sin(phase);
  if (P.legL) { P.legL.rotation.x = s * amt; P.legR.rotation.x = -s * amt; }
  P.armL.rotation.x = -s * armAmt;
  P.armR.rotation.x = s * armAmt;
  if (P.torso) P.torso.rotation.z = s * 0.06;
  P.head.rotation.z = -s * 0.05;
  return Math.abs(Math.cos(phase)) * 0.09 * amt;
}

export function arm(w, side, forward, out = 0.25) {
  const a = w.userData.parts[side === 'L' ? 'armL' : 'armR'];
  a.rotation.x = -forward;
  a.rotation.z = side === 'L' ? -out : out;
}
export function leg(w, side, forward) {
  w.userData.parts[side === 'L' ? 'legL' : 'legR'].rotation.x = -forward;
}

export function flail(w, t, k = 1) {
  arm(w, 'L', 2.2 + Math.sin(t * 23) * 0.9 * k, 0.6 + Math.sin(t * 17) * 0.5);
  arm(w, 'R', 2.2 + Math.sin(t * 21 + 1) * 0.9 * k, 0.6 + Math.sin(t * 19 + 2) * 0.5);
  leg(w, 'L', Math.sin(t * 18) * 0.7 * k);
  leg(w, 'R', Math.sin(t * 18 + 2) * 0.7 * k);
}

export function ragdollPose(w) {
  arm(w, 'L', 1.2, 1.4);
  arm(w, 'R', 0.6, 1.5);
  leg(w, 'L', 0.6);
  leg(w, 'R', -0.4);
}

// ---------------------------------------------------------------- particles

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

// Ballistic instanced burst. Particles may have staggered emission (emit window).
export class Burst {
  constructor(scene, {
    count = 60, geo, material, origin = [0, 0, 0], originJitter = 0, dir = [0, 1, 0], spread = 0.6,
    speed = [3, 6], gravity = -9.8, floor = 0, size = [0.7, 1.2], life = [1.2, 2.0], emit = [0, 0], bounce = 0.35, spin = 8,
  }) {
    this.mesh = new THREE.InstancedMesh(geo, material, count);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.floor = floor;
    this.g = gravity;
    this.bounce = bounce;
    const d = new THREE.Vector3(...dir).normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const a1 = new THREE.Vector3().crossVectors(d, up).normalize();
    const a2 = new THREE.Vector3().crossVectors(d, a1).normalize();
    this.p = [];
    for (let i = 0; i < count; i++) {
      const th = rr(0, spread);
      const ph = rr(0, Math.PI * 2);
      const v = d.clone().multiplyScalar(Math.cos(th))
        .add(a1.clone().multiplyScalar(Math.sin(th) * Math.cos(ph)))
        .add(a2.clone().multiplyScalar(Math.sin(th) * Math.sin(ph)))
        .multiplyScalar(rr(speed[0], speed[1]));
      this.p.push({
        o: new THREE.Vector3(origin[0] + rr(-originJitter, originJitter), origin[1] + rr(-originJitter, originJitter) * 0.3, origin[2] + rr(-originJitter, originJitter)),
        v, t0: rr(emit[0], emit[1]), life: rr(life[0], life[1]), s: rr(size[0], size[1]),
        r: [rr(0, 6), rr(0, 6), rr(0, 6)], w: [rr(-spin, spin), rr(-spin, spin), rr(-spin, spin)],
      });
    }
    this.update(-1);
  }
  update(t) {
    this.p.forEach((q, i) => {
      const lt = t - q.t0;
      if (lt < 0 || lt > q.life) {
        tmpM.makeScale(0, 0, 0);
      } else {
        tmpP.copy(q.o).addScaledVector(q.v, lt);
        tmpP.y = q.o.y + q.v.y * lt + 0.5 * this.g * lt * lt;
        let rest = false;
        if (tmpP.y < this.floor) {
          // crude bounce: reflect the overshoot, damped, then settle
          const over = this.floor - tmpP.y;
          tmpP.y = this.floor + Math.min(over * this.bounce, 0.25) * Math.max(0, 1 - lt);
          rest = true;
        }
        const k = rest ? 0.35 : 1;
        tmpE.set(q.r[0] + q.w[0] * lt * k, q.r[1] + q.w[1] * lt * k, q.r[2] + q.w[2] * lt * k);
        tmpQ.setFromEuler(tmpE);
        const fade = 1 - sstep(q.life * 0.75, q.life, lt);
        tmpS.setScalar(q.s * fade);
        tmpM.compose(tmpP, tmpQ, tmpS);
      }
      this.mesh.setMatrixAt(i, tmpM);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export const GEO = {
  drop: new THREE.SphereGeometry(0.07, 8, 6),
  coin: new THREE.CylinderGeometry(0.1, 0.1, 0.025, 18),
  chip: new THREE.BoxGeometry(0.08, 0.03, 0.06),
  leaf: new THREE.BoxGeometry(0.12, 0.01, 0.08),
  confetti: new THREE.BoxGeometry(0.1, 0.01, 0.16),
  spark: new THREE.BoxGeometry(0.02, 0.02, 0.14),
};
export const MAT = {
  water: new THREE.MeshStandardMaterial({ color: 0x7fd0ff, roughness: 0.05, metalness: 0.1, emissive: 0x1a4a70, emissiveIntensity: 0.35 }),
  coin: new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.25, metalness: 0.9, emissive: 0x5a3a00, emissiveIntensity: 0.4 }),
  debris: new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xd98c2b, roughness: 0.9 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xfff1a0 }),
};

export function coinBurst(scene, origin, opts = {}) {
  return new Burst(scene, { count: 24, geo: GEO.coin, material: MAT.coin, origin, speed: [2.5, 4.5], spread: 0.7, size: [0.9, 1.2], life: [1.3, 1.9], spin: 12, floor: 0.02, ...opts });
}

// Toilet geyser: rising column + continuous spray + floor splash.
export class Geyser {
  constructor(scene, origin, { height = 3.2, dur = 3, floor = 0.02, t0 = 0, scale = 1 } = {}) {
    this.o = origin;
    this.t0 = t0;
    this.h = height;
    const colGeo = new THREE.CylinderGeometry(0.14 * scale, 0.3 * scale, 1, 18, 8, true);
    colGeo.translate(0, 0.5, 0);
    this.col = new THREE.Mesh(colGeo, new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, transparent: true, opacity: 0.82, emissive: 0x2a6aa0, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
    this.col.position.set(...origin);
    scene.add(this.col);
    this.cap = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 16, 12), this.col.material);
    scene.add(this.cap);
    this.spray = new Burst(scene, {
      count: 420, geo: GEO.drop, material: MAT.water, origin: [origin[0], origin[1] + height, origin[2]], originJitter: 0.15,
      spread: 1.25, speed: [1.5, 4.5], emit: [t0 + 0.1, t0 + dur], life: [0.8, 1.5], size: [0.6, 1.6] .map((x) => x * scale), floor, bounce: 0.1, spin: 0,
    });
    this.base = new Burst(scene, {
      count: 120, geo: GEO.drop, material: MAT.water, origin: [origin[0], origin[1] + 0.2, origin[2]], originJitter: 0.2,
      dir: [0, 1, 0], spread: 1.5, speed: [1, 3], emit: [t0, t0 + dur], life: [0.5, 1.0], size: [0.5, 1.2], floor, bounce: 0.1, spin: 0,
    });
    this.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0x8fd0f0, roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.85 }));
    this.puddle.rotation.x = -Math.PI / 2;
    this.puddle.position.set(origin[0], floor + 0.012, origin[2] + 0.4);
    scene.add(this.puddle);
    this.update(-10);
  }
  update(t) {
    const lt = t - this.t0;
    const on = lt > 0;
    const grow = easeOut(seg(lt, 0, 0.25));
    const hh = on ? this.h * grow * (1 + Math.sin(lt * 30) * 0.04) : 0.0001;
    this.col.visible = on;
    this.cap.visible = on;
    this.col.scale.set(1 + Math.sin(lt * 40) * 0.08, hh, 1 + Math.cos(lt * 37) * 0.08);
    this.cap.position.set(this.o[0], this.o[1] + hh, this.o[2]);
    this.cap.scale.set(1 + Math.sin(lt * 25) * 0.15, 0.6 + Math.cos(lt * 31) * 0.1, 1);
    this.spray.update(t);
    this.base.update(t);
    const ps = on ? 0.4 + easeOut(seg(lt, 0, 2.5)) * 2.4 : 0.001;
    this.puddle.scale.set(ps * 1.3, ps, 1);
    this.puddle.visible = on;
  }
}

// Dust/smoke puff: individual spheres that expand and fade.
export class Puff {
  constructor(scene, origin, { count = 10, color = 0xf3eadb, t0 = 0, size = 0.5, spread = 0.8, rise = 0.6, life = 1.2 } = {}) {
    this.items = [];
    this.t0 = t0;
    this.life = life;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.8, depthWrite: false }));
      m.userData = { o: v3(origin[0] + rr(-spread, spread) * 0.3, origin[1] + rr(0, 0.2), origin[2] + rr(-spread, spread) * 0.3), d: v3(rr(-spread, spread), rr(0.2, rise), rr(-spread, spread)), s: rr(size * 0.6, size * 1.2) };
      m.castShadow = false;
      scene.add(m);
      this.items.push(m);
    }
    this.update(-10);
  }
  update(t) {
    const lt = t - this.t0;
    for (const m of this.items) {
      const u = clamp01(lt / this.life);
      m.visible = lt > 0 && lt < this.life;
      const e = easeOut(u);
      m.position.copy(m.userData.o).addScaledVector(m.userData.d, e);
      m.scale.setScalar(m.userData.s * (0.3 + e));
      m.material.opacity = 0.75 * (1 - u);
    }
  }
}

// Glowing "!" job marker (billboard-ish: sphere + bar)
export function marker(color = 0xffd23f) {
  const g = new THREE.Group();
  const bar = mesh(new THREE.CapsuleGeometry(0.07, 0.32, 6, 12), new THREE.MeshBasicMaterial({ color }));
  bar.position.y = 0.32;
  g.add(bar);
  const dot = mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshBasicMaterial({ color }));
  g.add(dot);
  const halo = mesh(new THREE.RingGeometry(0.32, 0.4, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  halo.position.y = 0.16;
  g.add(halo);
  g.userData.halo = halo;
  for (const m of [bar, dot, halo]) { m.userData.noOutline = true; m.castShadow = false; }
  return g;
}

// ---------------------------------------------------------------- camera
export function shake(camera, amt, t) {
  camera.position.x += Math.sin(t * 61) * amt + Math.sin(t * 23) * amt * 0.5;
  camera.position.y += Math.cos(t * 53) * amt * 0.8;
  camera.rotation.z += Math.sin(t * 47) * amt * 0.3;
}
export function aim(camera, pos, look, fov) {
  camera.position.set(...pos);
  camera.lookAt(...look);
  if (fov && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- overlay HTML

const fadeWin = (lt, t0, t1, fin = 0.12, fout = 0.12) => (lt < t0 || lt > t1 ? 0 : Math.min(seg(lt, t0, t0 + fin), 1 - seg(lt, t1 - fout, t1)));

// Big punchy rules card.
export function card(lt, t0, t1, text, { pos = 'bl', size = 92, color = '#fff', accent = '#ff8a3d', sub = '' } = {}) {
  if (lt < t0 || lt > t1) return '';
  const pop = easeBack(seg(lt, t0, t0 + 0.28));
  const out = seg(lt, t1 - 0.12, t1);
  const sc = 0.6 + 0.4 * pop + out * 0.15;
  const op = Math.min(1, pop * 1.5) * (1 - out);
  return `<div class="tr-card ${pos}" style="opacity:${op};transform:${pos === 'c' ? 'translate(-50%,-50%) ' : ''}scale(${sc}) rotate(-3deg);font-size:${size}px;color:${color}">
    <span class="hl" style="background:${accent}"></span>${text}${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

// Voice-chat subtitle (proximity chat style).
export function voice(lt, t0, t1, who, text, color) {
  const a = fadeWin(lt, t0, t1, 0.08, 0.15);
  if (!a) return '';
  const lvl = (k) => 6 + Math.abs(Math.sin(lt * 24 + k)) * 14;
  return `<div class="tr-voice" style="opacity:${a};--c:${color}"><div class="mic"><i style="height:${lvl(0)}px"></i><i style="height:${lvl(1)}px"></i><i style="height:${lvl(2)}px"></i></div><b>${who}</b><span>${text}</span></div>`;
}

export function money(camera, worldPos, lt, t0, text, color, { dur = 1.4, big = false } = {}) {
  const u = (lt - t0) / dur;
  if (u < 0 || u > 1) return;
  const p = worldPos.clone();
  p.y += easeOut(u) * 0.8;
  const el = pin(camera, p, text, { cls: `tr-money${big ? ' big' : ''}` });
  el.style.color = color;
  el.style.opacity = String(1 - sstep(0.7, 1, u));
  el.style.transform = `translate(-50%,-50%) scale(${0.5 + easeBack(seg(u, 0, 0.18)) * 0.5})`;
}

export function comic(camera, worldPos, lt, t0, text, { dur = 0.8, color = '#ffd23f', rot = -8, size = 80 } = {}) {
  const u = (lt - t0) / dur;
  if (u < 0 || u > 1) return;
  const el = pin(camera, worldPos, text, { cls: 'tr-comic' });
  el.style.color = color;
  el.style.fontSize = `${size}px`;
  el.style.opacity = String(1 - sstep(0.75, 1, u));
  el.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${0.3 + easeBack(seg(u, 0, 0.25)) * 0.8})`;
}

export function tag(camera, obj, who, dy = 1.25) {
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  p.y += dy;
  const el = pin(camera, p, `<i></i>${who.toUpperCase()}`, { cls: 'tr-tag' });
  el.style.setProperty('--c', COL[who]);
}

export function houseBar(pct, timer, { warn = false } = {}) {
  return `<div class="tr-house ${warn ? 'warn' : ''}"><div class="lbl"><span>🏠 HOUSE</span><b>${Math.round(pct)}%</b></div>
    <div class="bar"><i style="width:${pct}%"></i></div><div class="tmr">⏱ ${timer}</div></div>`;
}

export function wallets(vals, hi = null) {
  const order = Object.entries(vals).sort((a, b) => b[1] - a[1]);
  return `<div class="tr-wallets">${order.map(([k, v]) => `<div class="w ${hi === k ? 'hi' : ''}" style="--c:${COL[k]}"><i></i>${k.toUpperCase()}<b>$${Math.round(v)}</b></div>`).join('')}</div>`;
}

export function flash(a, color = '#fff') { return a > 0 ? `<div class="tr-flash" style="opacity:${a};background:${color}"></div>` : ''; }

export function timerStr(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
