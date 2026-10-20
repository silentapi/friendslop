// Trailer kit: cue access + set builders shared by shots.
import CUES from './cues.json' with { type: 'json' };
import { THREE, V, setup, aimKey, rr, reseed, pick } from '../engine/core.js';
import * as C from '../engine/city.js';
import * as Lm from '../engine/landmarks.js';
import * as Rd from '../engine/rider.js';

export { CUES };
const SH = Object.fromEntries(CUES.shots.map((s) => [s.name, s]));
export const DUR = (n) => SH[n].dur;
export const Q = (n) => SH[n].cues || {};
export const BEAT = 60 / CUES.bpm;

// A downtown set: streets + filler towers around `focus`, chosen landmarks, dressing on named roads.
export function downtown({ focus = [0, 0], radius = 700, light = 'dusk', keyDir, fogNear = 150, fogFar = 1600, shadow = true, shadowBox = 25, fov = 50, landmarks = 'all', lake = {}, dress = [], cars = 0, carRoad = null, i4 = true, skip = [] } = {}) {
  const ctx = setup({ light, keyDir, fogNear, fogFar, shadow, shadowBox, fov });
  const [fx, fz] = focus;
  C.streets(ctx, { x0: fx - radius, x1: fx + radius, z0: fz - radius, z1: fz + radius });
  C.filler(ctx, { focus, radius, skip });
  if (i4 && Math.abs(fx - C.NS.i4) < radius + 200) C.i4(ctx, { z0: fz - radius, z1: fz + radius });
  const L = {};
  const want = (k) => landmarks === 'all' || landmarks.includes(k);
  const near = (k, r = radius + 300) => { const [x, z] = C.PLACES[k]; return Math.hypot(x - fx, z - fz) < r; };
  if (want('citi') && near('citi')) L.citi = Lm.citiTower(ctx);
  if (want('sb') && near('starbucks')) L.sb = Lm.starbucks(ctx);
  if (want('church') && near('church')) L.church = Lm.churchStation(ctx);
  else if (Math.abs(fx - C.NS.rail) < radius) Lm.tracks(ctx, { z0: fz - radius, z1: fz + radius });
  if (want('vue') && near('vue')) L.vue = Lm.vue(ctx);
  if (want('aspire') && near('aspire')) L.aspire = Lm.aspire(ctx);
  if (want('society') && near('society')) L.society = Lm.society(ctx);
  if (want('truist') && near('truist')) L.truist = Lm.truist(ctx);
  if (want('kia') && near('kia')) L.kia = Lm.kiaCenter(ctx);
  if (want('drp') && near('drp')) L.drp = Lm.drPhillips(ctx);
  if (want('lake') && Math.hypot(C.LAKE.x - fx, C.LAKE.z - fz) < radius + 300) L.lake = Lm.lakeEola(ctx, lake);
  for (const d of dress) {
    reseed(d.seed || 3);
    if (d.ns !== undefined) C.dressRoadNS(ctx, d.ns, d.from, d.to, { w: d.w || 22, step: d.step || 30, palms: d.palms ?? true });
    else C.dressRoadEW(ctx, d.ew, d.from, d.to, { w: d.w || 16, step: d.step || 30, palms: d.palms ?? true });
  }
  aimKey(ctx, [fx, 0, fz]);
  return { ctx, L };
}

// Traffic stream along a N-S road: cars at fixed lane offsets moving with constant speed (wrapping).
export function trafficNS(ctx, x, z0, z1, { n = 10, lanes = [-7.5, -2.5, 2.5, 7.5], speed = 12, seed = 5, brake = false } = {}) {
  reseed(seed);
  const cars = [];
  for (let i = 0; i < n; i++) {
    const lane = lanes[i % lanes.length];
    const dir = lane < 0 ? 1 : -1; // west lanes drive south (+z), east lanes north (-z) (right-hand traffic)
    const c = C.car(undefined, { brake });
    c.rotation.y = dir > 0 ? Math.PI : 0;
    ctx.scene.add(c);
    cars.push({ c, lane, dir, off: rr(0, 1), sp: speed * rr(0.85, 1.15) });
  }
  const L = z1 - z0;
  ctx.tick.push((t) => { for (const k of cars) { const z = (((k.off * L + k.dir * k.sp * t) % L) + L) % L; k.c.position.set(x + k.lane, 0, z0 + z); } });
  return cars;
}
export function trafficEW(ctx, z, x0, x1, { n = 8, lanes = [-4, 4], speed = 11, seed = 6 } = {}) {
  reseed(seed);
  const cars = [];
  for (let i = 0; i < n; i++) {
    const lane = lanes[i % lanes.length];
    const dir = lane > 0 ? 1 : -1; // south lanes drive east
    const c = C.car();
    c.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    ctx.scene.add(c);
    cars.push({ c, lane, dir, off: rr(0, 1), sp: speed * rr(0.85, 1.15) });
  }
  const L = x1 - x0;
  ctx.tick.push((t) => { for (const k of cars) { const x = (((k.off * L + k.dir * k.sp * t) % L) + L) % L; k.c.position.set(x0 + x, 0, z + k.lane); } });
  return cars;
}

// Courier on bike, as one group (forward = +z local).
export function courier(ctx) {
  const root = new THREE.Group();
  const B = Rd.bike();
  const R = Rd.rider();
  root.add(B, R);
  ctx.scene.add(root);
  return { root, B, R };
}
// Phone screen texture, redrawn per frame.
export function phoneScreen(B, draw) {
  const c = document.createElement('canvas');
  c.width = 360; c.height = 740;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.15), m);
  scr.position.z = 0.0052;
  B.userData.phone.add(scr);
  return (t) => { draw(c.getContext('2d'), c.width, c.height, t); tex.needsUpdate = true; };
}
export { C, Lm, Rd };
