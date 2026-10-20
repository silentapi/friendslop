// Frame driver: any time t renders deterministically. Shots build lazily (async: assets), one at a time.
// Shot = { name, dur, build: async () => ({ ctx, update(lt), post?(lt, composer), hud?(lt), fx?, shutter? }) }.
// sub > 1 renders that many sub-frames across the shutter interval and averages them (motion blur + AA).
import { THREE, W, H, makePost, disposeScene, waitTextures } from './core.js';

let SHOTS = [], starts = [], total = 0, cur = null, curIdx = -1, post = null, globalHud = null, SUB = 1;
export const FPS = 30;

export async function boot(mode, { sub = 1 } = {}) {
  SUB = sub;
  const mod = await import(mode === 'trailer' ? '../trailer/shots.js' : '../trailer/lab.js');
  SHOTS = mod.SHOTS;
  globalHud = mod.globalHud || null;
  starts = []; total = 0;
  for (const s of SHOTS) { starts.push(total); total += s.dur; }
  window.STAGE = { fps: FPS, duration: total, frames: Math.round(total * FPS), shots: SHOTS.map((s, i) => ({ name: s.name, start: starts[i], dur: s.dur })), renderTime, renderFrame: (f) => renderTime(f / FPS + 1e-4) };
  window.__booted = true;
}
const shotAt = (t) => { for (let i = 0; i < SHOTS.length; i++) if (t < starts[i] + SHOTS[i].dur - 1e-6) return i; return SHOTS.length - 1; };

export async function renderTime(t) {
  const i = shotAt(t);
  if (i !== curIdx) {
    if (cur) { post?.dispose2(); disposeScene(cur.ctx.scene); }
    cur = await SHOTS[i].build();
    post = makePost(cur.ctx, cur.fx || {});
    curIdx = i;
    await waitTextures();
  }
  const lt = t - starts[i];
  const shutter = cur.shutter ?? 0.5; // fraction of a frame the shutter is open (180° = 0.5)
  const cam = cur.ctx.camera;
  for (let k = 0; k < SUB; k++) {
    const st = lt + (SUB > 1 ? ((k + 0.5) / SUB - 0.5) * shutter / FPS : 0);
    cur.update(st);
    for (const f of cur.ctx.tick) f(st);
    cam.updateProjectionMatrix();
    if (SUB > 1) applyJitter(cam, jitter(k));
    cam.updateMatrixWorld(true);
    const g = post.grade.uniforms;
    for (const [key, v] of Object.entries(post.base)) g[key].value = v;
    if (cur.post) cur.post(st, post);
    post.render();
    post.accumulate(k, SUB);
  }
  post.present((t * 37.13) % 100);
  document.getElementById('hud').innerHTML = (cur.hud ? cur.hud(lt) : '') + (globalHud ? globalHud(t, starts, i, lt) : '');
  await new Promise((r) => requestAnimationFrame(() => r()));
  return { shot: SHOTS[i].name, lt };
}
// Sub-pixel jitter (Halton 2,3) applied through the projection matrix.
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
function jitter(k) { return [halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5]; }
function applyJitter(cam, [jx, jy]) {
  cam.projectionMatrix.elements[8] += (jx * 2) / W;
  cam.projectionMatrix.elements[9] += (jy * 2) / H;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}
