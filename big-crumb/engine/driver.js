// Frame driver: renders any time t deterministically. Shots are built lazily, one at a time.
// A shot = { name, dur, build() → { ctx, update(lt), hud?(lt), fx?, post?(lt, composer) } }.
import { makeComposer, disposeScene, boil } from './render.js';

let SHOTS = [];
let starts = [];
let total = 0;
let cur = null;
let curIdx = -1;
let composer = null;
let globalHud = null;

export async function boot(mode) {
  const mod = mode === 'trailer' ? await import('../trailer/scenes.js') : await import('../lookdev/frames.js');
  SHOTS = mod.SHOTS;
  globalHud = mod.globalHud || null;
  starts = [];
  total = 0;
  for (const s of SHOTS) { starts.push(total); total += s.dur; }
  window.STAGE = {
    fps: 24, duration: total, frames: Math.round(total * 24),
    shots: SHOTS.map((s, i) => ({ name: s.name, start: starts[i], dur: s.dur })),
    renderTime, renderFrame: (f) => renderTime(f / 24 + 1e-4),
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
    curIdx = i;
  }
  const lt = t - starts[i];
  boil(Math.round(t * 24));
  cur.ctx.uniforms.uTime.value = lt + i * 3.1;
  for (const f of cur.ctx.tick || []) f(lt);
  cur.update(lt);
  cur.ctx.camera.updateMatrixWorld(true);
  if (cur.post) cur.post(lt, composer);
  composer.render();
  document.getElementById('pins').innerHTML = cur.pins ? cur.pins(lt) : '';
  document.getElementById('hud').innerHTML = (cur.hud ? cur.hud(lt) : '') + (globalHud ? globalHud(t, starts) : '');
  await new Promise((r) => requestAnimationFrame(() => r()));
  return { shot: SHOTS[i].name, lt };
}
