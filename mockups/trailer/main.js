// Trailer frame driver: renders any time t deterministically (scenes are built lazily, in order).
import { THREE, W, H } from '../lib.js';
import { makeComposer } from '../fx.js';
import { SCENES, globalHud } from './scenes.js';

export const FPS = 24;
const starts = [];
let total = 0;
for (const s of SCENES) { starts.push(total); total += s.dur; }

let renderer;
let cur = null;
let curIdx = -1;
let composer = null;

function disposeScene(c) {
  composer?.dispose2?.();
  c.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

function sceneAt(t) {
  for (let i = 0; i < SCENES.length; i++) if (t < starts[i] + SCENES[i].dur - 1e-6) return i;
  return SCENES.length - 1;
}

export async function renderTime(t) {
  window.__ready = false;
  const i = sceneAt(t);
  if (i !== curIdx) {
    if (cur) disposeScene(cur);
    cur = SCENES[i].build(renderer);
    composer = makeComposer({ renderer, scene: cur.scene, camera: cur.camera }, cur.fx || {});
    curIdx = i;
  }
  const lt = t - starts[i];
  cur.update(lt);
  cur.camera.updateMatrixWorld(true);
  if (cur.post) cur.post(lt, composer);
  composer.render();
  const pins = document.getElementById('pins');
  pins.innerHTML = '';
  if (cur.pins) cur.pins(lt);
  document.getElementById('hud').innerHTML = (cur.hud ? cur.hud(lt) : '') + globalHud(t, starts);
  document.getElementById('stage').style.filter = cur.css ? cur.css(lt) || 'none' : 'none';
  await new Promise((r) => requestAnimationFrame(() => r()));
  window.__ready = true;
  return { scene: SCENES[i].name, lt };
}

export async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('stage').appendChild(renderer.domElement);
  window.TRAILER = {
    fps: FPS, duration: total, frames: Math.round(total * FPS),
    scenes: SCENES.map((s, i) => ({ name: s.name, start: starts[i], dur: s.dur })),
    renderTime, renderFrame: (f) => renderTime(f / FPS),
  };
  const q = new URLSearchParams(location.search);
  if (q.has('t')) await renderTime(Number(q.get('t')));
  window.__booted = true;
}
