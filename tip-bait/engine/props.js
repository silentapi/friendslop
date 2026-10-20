// Props: real glTF assets (palms, cars, bike, Poly Haven street furniture) + a few procedural ones.
// Credits (CC-BY 4.0): Tesla Model 3 (David_Holiday), Mini Cooper S (cenobyte), City bike (TheDrone), palm_tall (Šimon Ustal),
// palm_coconut (evolveduk). CC0: Poly Haven street furniture, Quaternius.
import { THREE, V, ASSETS, once, mat, mesh, box, cyl, getRenderer } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let loader = null;
function gl() {
  if (loader) return loader;
  loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const k = new KTX2Loader().setTranscoderPath(ASSETS + '../node_modules/three/examples/jsm/libs/basis/').detectSupport(getRenderer());
  loader.setKTX2Loader(k);
  return loader;
}
export const model = (path) => once('model:' + path, () => new Promise((res, rej) => gl().load(ASSETS + path, (g) => {
  g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.userData.keep = true; if (o.geometry) o.geometry.userData.keep = true; } });
  res(g);
}, undefined, rej)));
// clone + normalise to a target size along one axis
export async function instance(path, { height = null, length = null, width = null } = {}) {
  const g = await model(path);
  const o = SkeletonUtils.clone(g.scene);
  const bb = new THREE.Box3().setFromObject(o), s = bb.getSize(V());
  const k = height ? height / s.y : length ? length / Math.max(s.x, s.z) : width ? width / Math.min(s.x, s.z) : 1;
  o.scale.setScalar(k);
  const bb2 = new THREE.Box3().setFromObject(o);
  o.position.y -= bb2.min.y;
  const holder = new THREE.Group(); holder.add(o);
  holder.userData.size = bb2.getSize(V());
  return holder;
}

export async function palm(h = 10, kind = 'tall') { return instance(kind === 'tall' ? 'models/palm_tall.glb' : 'models/palm_coconut.glb', { height: h }); }
const CAR_PAINT = [0xe9e9ea, 0x16181c, 0x8e1a1a, 0x24364f, 0x9ea4aa, 0x5a5f66, 0xc9c2b0, 0x1d3b2e];
export async function car(i = 0) {
  const path = i % 3 === 2 ? 'models/mini_cooper_s.glb' : 'models/tesla_model_3.glb';
  const c = await instance(path, { length: path.includes('mini') ? 3.9 : 4.7 });
  // repaint body panels (largest-area paint material) per index
  c.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.material.name || '').toLowerCase();
    if (/paint|body|car_?paint|exterior/.test(n) || (o.material.color && o.material.metalness > 0.3 && !/chrome|glass|window|tire|rim/.test(n))) {
      o.material = o.material.clone(); o.material.color = new THREE.Color(CAR_PAINT[i % CAR_PAINT.length]);
    }
  });
  return c;
}
export async function bike() { return instance('models/city_bike.glb', { length: 1.8 }); }
export async function streetLamp() { return instance('models/ph/street_lamp_01/street_lamp_01.gltf', { height: 5.2 }); }
export async function hydrant() { return instance('models/ph/fire_hydrant/fire_hydrant.gltf', { height: 0.8 }); }
export async function trashCan() { return instance('models/ph/metal_trash_can/metal_trash_can.gltf', { height: 1.0 }); }

// Downtown Orlando traffic signal: black mast arm, three-section heads.
export function signal(armLen = 9, state = 'green') {
  const g = new THREE.Group();
  const blk = mat(0x15171a, { metalness: 0.5, roughness: 0.45 });
  cyl(0.18, 0.24, 6.4, blk, 12, 0, 3.2, 0, g);
  const arm = cyl(0.09, 0.13, armLen, blk, 10, armLen / 2, 6.0, 0, g); arm.rotation.z = Math.PI / 2;
  const on = { red: 0, yellow: 1, green: 2 }[state];
  for (const x of [armLen * 0.55, armLen * 0.92]) {
    const head = box(0.42, 1.25, 0.32, mat(0x1d1f22, { roughness: 0.5 }), x, 5.2, 0, g);
    [0xff2a1a, 0xffb000, 0x30ff8a].forEach((c, i) => { const l = cyl(0.12, 0.12, 0.05, i === on ? mat(c, { emissive: c, emissiveIntensity: 3 }) : mat(0x222222), 16, 0, 0.38 - i * 0.38, 0.17); l.rotation.x = Math.PI / 2; head.add(l); });
  }
  return g;
}
