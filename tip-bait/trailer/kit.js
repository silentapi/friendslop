// Trailer kit: cues, exterior set builder, path helpers, shared timeline for the in-game HUD.
import CUES from './cues.json' with { type: 'json' };
import { THREE, V, setup } from '../engine/core.js';
import * as Wd from '../engine/world.js';

export { CUES };
const SH = Object.fromEntries(CUES.shots.map((s) => [s.name, s]));
export const DUR = (n) => SH[n].dur;
export const Q = (n) => SH[n].cues || {};
export const START = (() => { const o = {}; let t = 0; for (const s of CUES.shots) { o[s.name] = t; t += s.dur; } return o; })();

// Exterior: sky + sun + OSM city around `center`.
export async function exterior({ center, radius = 650, sky = 'golden', sunAz = 222, sunEl = 19, shadowBox = 40, fov = 50, dressR = 140, dressNames = null, night = 0, water = true, skipDress = [], fog = null }) {
  const ctx = await setup({ sky, sunAz, sunEl, shadowBox, fov, fog });
  await Wd.city(ctx, { center, radius, dressR, dressNames, night, water, skipDress });
  ctx.focusSun(V(center[0], 0, center[1]), 500);
  return ctx;
}
// Walk along a polyline [[x,z]...] by distance s → { p: Vector3, yaw } (yaw: forward = (sin, cos)).
export function along(pts, s) {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], L = Math.hypot(x2 - x1, z2 - z1);
    if (s <= acc + L || i === pts.length - 2) { const k = Math.min(1, Math.max(0, (s - acc) / L)); return { p: V(x1 + (x2 - x1) * k, 0, z1 + (z2 - z1) * k), yaw: Math.atan2(x2 - x1, z2 - z1) }; }
    acc += L;
  }
  return { p: V(pts[0][0], 0, pts[0][1]), yaw: 0 };
}
export const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
// Order countdown shown in the game HUD across gameplay shots (game time runs fast).
export function eta(t) {
  const keys = [[START.hook + Q('hook').accept, 600], [START.closed, 560], [START.pickup, 410], [START.dodge, 380], [START.storm, 210], [START.sunrail, 150], [START.arrive, 41], [START.stairs, 25], [START.kyle, 4]];
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return keys[i][1] + (keys[i + 1][1] - keys[i][1]) * (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  return keys[keys.length - 1][1];
}
export { Wd };
