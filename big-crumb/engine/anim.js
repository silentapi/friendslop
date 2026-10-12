// Animation toolkit: easing, springs (follow-through), anticipation, squash, deterministic noise,
// camera helpers. All pure functions of time so any frame renders on its own.
import { THREE } from './render.js';

export const FPS = 24;
export const FR = 1 / FPS;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const sstep = (a, b, x) => { const t = seg(x, a, b); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t) => Math.pow(clamp01(t), 3);
export const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeBack = (t) => { t = clamp01(t); const c1 = 1.9; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerp3 = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));

// Piecewise path through points, u in 0..1.
export function pathAt(pts, u) {
  const n = pts.length - 1;
  const f = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  return lerp3(pts[i], pts[i + 1], f - i);
}
// Keyframed scalar/vec: keys = [[t, value], ...], eased between keys.
export function keys(t, ks, ease = easeInOut) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, a] = ks[i];
    const [t1, b] = ks[i + 1];
    if (t <= t1) {
      const u = ease((t - t0) / (t1 - t0));
      return Array.isArray(a) ? lerp3(a, b, u) : lerp(a, b, u);
    }
  }
  return ks[ks.length - 1][1];
}

// Damped spring kicked at t0 (follow-through / overshoot). damp .2 loose, .55 firm.
export function spring(t, t0, { amp = 1, freq = 2.2, damp = 0.22 } = {}) {
  const dt = t - t0;
  if (dt < 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(Math.max(1e-4, 1 - damp * damp));
  return amp * Math.exp(-damp * w * dt) * Math.cos(wd * dt);
}
// Settle from 1 toward 0 with a spring wobble (useful for "arrive with overshoot").
export function settle(t, t0, { freq = 2.5, damp = 0.4 } = {}) {
  if (t < t0) return 1;
  return spring(t, t0, { amp: 1, freq, damp });
}
// Anticipation: 0→1 over dur before tAction, then snaps back.
export function anticipate(t, tAction, dur = 0.3) {
  if (t < tAction - dur) return 0;
  if (t <= tAction) return easeInOut((t - (tAction - dur)) / dur);
  return 1 - easeOut(seg(t, tAction, tAction + 0.08));
}
export function impact(t, t0, strength = 0.3) { return spring(t, t0, { amp: strength, freq: 3.2, damp: 0.5 }); }
export function stretch(t, t0, amount = 0.25, dur = 0.16) {
  if (t < t0 || t > t0 + dur) return 0;
  return -amount * Math.sin(Math.PI * (t - t0) / dur);
}
export function arc(a, b, u, apex) {
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 4 * apex * u * (1 - u), lerp(a[2], b[2], u)];
}

// Deterministic value noise.
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise = (x, sd = 0) => { const i = Math.floor(x); const f = x - i; const a = hash(i + sd * 57); const b = hash(i + 1 + sd * 57); const u = f * f * (3 - 2 * f); return a + (b - a) * u; };
export const nz = (x, sd = 0) => noise(x, sd) * 2 - 1;

// ---------------------------------------------------------------- camera
export function aim(camera, pos, look, fov) {
  camera.position.set(...pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...look);
  if (fov && Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
export function handheld(camera, t, amt = 1, sd = 0) {
  camera.rotation.x += nz(t * 0.7, sd + 3) * 0.006 * amt;
  camera.rotation.y += nz(t * 0.6, sd + 7) * 0.007 * amt;
  camera.rotation.z += nz(t * 0.5, sd + 11) * 0.004 * amt;
}
export function shake(camera, t, amt) {
  if (amt <= 0) return;
  camera.position.x += Math.sin(t * 61) * amt + Math.sin(t * 23) * amt * 0.5;
  camera.position.y += Math.cos(t * 53) * amt * 0.8;
  camera.rotation.z += Math.sin(t * 47) * amt * 0.25;
}
// Decaying shake envelope over a list of hit times.
export function shakeAmt(t, hits, amt = 0.06, dur = 0.35) {
  let k = 0;
  for (const h of hits) { const dt = t - h; if (dt >= 0 && dt < dur) k = Math.max(k, Math.pow(1 - dt / dur, 2)); }
  return k * amt;
}
export function punch(camera, baseFov, t, events, amt = 0.05, dur = 0.45) {
  let k = 0;
  for (const t0 of events) {
    const dt = t - t0;
    if (dt >= 0 && dt < dur) k = Math.max(k, dt < 0.05 ? dt / 0.05 : 1 - easeOut((dt - 0.05) / (dur - 0.05)));
  }
  const fov = baseFov * (1 - amt * k);
  if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
