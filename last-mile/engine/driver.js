// Frame driver: renders any time t deterministically. Shots are built lazily, one at a time.
// A shot = { name, dur, build() → { ctx, update(lt), hud?(lt), fx?, post?(lt, composer), env? } }.
import { makeComposer, disposeScene, captureEnv } from './core.js';

let SHOTS = [];
let starts = [];
let total = 0;
let cur = null;
let curIdx = -1;
let composer = null;
let globalHud = null;
const FPS = 30;

export async function boot(mode) {
  const mod = mode === 'trailer' ? await import('../trailer/shots.js') : await import('../trailer/lookdev.js');
  SHOTS = mod.SHOTS;
  globalHud = mod.globalHud || null;
  starts = [];
  total = 0;
  for (const s of SHOTS) { starts.push(total); total += s.dur; }
  window.STAGE = {
    fps: FPS, duration: total, frames: Math.round(total * FPS),
    shots: SHOTS.map((s, i) => ({ name: s.name, start: starts[i], dur: s.dur })),
    renderTime, renderFrame: (f) => renderTime(f / FPS + 1e-4),
  };
  window.__booted = true;
}

function shotAt(t) {
  for (let i = 0; i < SHOTS.length; i++) if (t < starts[i] + SHOTS[i].dur - 1e-6) return i;
  return SHOTS.length - 1;
}

export async function renderTime(t) {
  const i = shotAt(t);
  if (i !== curIdx) {
    if (cur) { composer?.dispose2(); disposeScene(cur.ctx.scene); }
    cur = SHOTS[i].build();
    composer = makeComposer(cur.ctx, cur.fx || {});
    if (cur.env) { for (const f of cur.ctx.tick) f(0); cur.update(0); captureEnv(cur.ctx, cur.env, { intensity: cur.envInt ?? 1 }); }
    curIdx = i;
  }
  const lt = t - starts[i];
  cur.ctx.uniforms.uTime.value = lt;
  cur.update(lt);
  for (const f of cur.ctx.tick) f(lt);
  cur.ctx.camera.updateMatrixWorld(true);
  const g = composer.grade.uniforms;
  for (const [k, v] of Object.entries(composer.base)) g[k].value = v;
  g.seed.value = (t * 37.13) % 100;
  if (cur.post) cur.post(lt, composer);
  composer.render();
  document.getElementById('hud').innerHTML = (cur.hud ? cur.hud(lt) : '') + (globalHud ? globalHud(t, starts, i) : '');
  await new Promise((r) => requestAnimationFrame(() => r()));
  return { shot: SHOTS[i].name, lt };
}
