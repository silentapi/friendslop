// Characters: Quaternius CC0 human bodies (UE-style 65-joint rig) + the Universal Animation Library clips.
// A character = { root, mixer, bones, play(name, t, {weight, speed, offset}) } posed deterministically per frame.
import { THREE, V, ASSETS, once, mat, mesh, box, cyl, tex } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const load = (path) => once('gltf:' + path, () => new Promise((res, rej) => loader.load(ASSETS + path, res, undefined, rej)));
export const loadGLTF = load;

let CLIPS = null;
export async function clips() {
  if (CLIPS) return CLIPS;
  const [a, b] = await Promise.all([load('chars/gaits.glb'), load('chars/animations.glb')]);
  CLIPS = {};
  for (const c of [...a.animations, ...b.animations]) {
    // keep in-place: drop root translation so we drive position ourselves
    c.tracks = c.tracks.filter((t) => !/^root\.position/.test(t.name));
    CLIPS[c.name] = c;
  }
  return CLIPS;
}

const BODIES = { male: 'chars/base/Superhero_Male_FullBody.gltf', female: 'chars/base/Superhero_Female_FullBody.gltf' };

// Outfit = recolour of the body-suit regions via a shader mask on the base texture's UV islands is not available,
// so outfits are tints of the suit material + attached garments (helmet, bag, hoodie hood, cap...).
export async function character({ body = 'male', suit = 0x2a2d34, skin = null, hair = null, scale = 1 } = {}) {
  const [g] = await Promise.all([load(BODIES[body]), clips()]);
  const root = SkeletonUtils.clone(g.scene);
  const bones = {};
  root.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = o.material.clone();
      const n = o.material.name || '';
      if (/Superhero/.test(n)) { o.material.color = new THREE.Color(suit); o.material.userData.suit = true; }
      if (/Hair/.test(n) && hair) o.material.color = new THREE.Color(hair);
      o.material.envMapIntensity = 0.8;
    }
  });
  root.scale.setScalar(scale);
  const holder = new THREE.Group();
  holder.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  const C = { root: holder, model: root, mixer, bones, actions };
  // Pose: list of [clipName, localTime, weight]. Deterministic: reset mixer, set each action's time, evaluate once.
  C.pose = (layers) => {
    for (const a of Object.values(actions)) { a.enabled = false; a.setEffectiveWeight(0); }
    for (const [name, t, w = 1] of layers) {
      if (!actions[name]) { actions[name] = mixer.clipAction(CLIPS[name]); actions[name].play(); }
      const a = actions[name];
      a.enabled = true;
      a.setEffectiveWeight(w);
      a.time = ((t % CLIPS[name].duration) + CLIPS[name].duration) % CLIPS[name].duration;
      if (/Enter|Exit|Start|Land|Consume|PickUp|Interact|Hit|Yes|Death|Roll|Jump_Start|OverhandThrow/.test(name)) a.time = Math.min(Math.max(t, 0), CLIPS[name].duration - 1e-3);
    }
    mixer.update(0);
    root.updateMatrixWorld(true);
  };
  C.dur = (name) => CLIPS[name].duration;
  // Wear a Quaternius part/outfit/hair glTF: rebind its skinned meshes to this character's skeleton by bone name.
  C.wear = async (path, { color = null, rough = null, map = true, hide = null } = {}) => {
    const g = await load(path);
    const src = SkeletonUtils.clone(g.scene);
    const add = [];
    src.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) add.push(o); });
    const host = root.getObjectByProperty('type', 'SkinnedMesh');
    for (const o of add) {
      o.material = o.material.clone();
      if (color !== null) o.material.color = new THREE.Color(color);
      if (rough !== null) o.material.roughness = rough;
      if (!map) o.material.map = null;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (o.isSkinnedMesh) {
        const skel = new THREE.Skeleton(o.skeleton.bones.map((b) => bones[b.name]), o.skeleton.boneInverses);
        host.parent.add(o);
        o.bind(skel, host.bindMatrix);
      }
    }
    if (hide) root.traverse((o) => { if ((o.isSkinnedMesh) && hide.test(o.material.name || '')) o.visible = false; });
    return add;
  };
  C.attach = (boneName, obj, pos = [0, 0, 0], rot = [0, 0, 0]) => { const b = bones[boneName]; obj.position.set(...pos); obj.rotation.set(...rot); b.add(obj); return obj; };
  C.boneWorld = (name, local = [0, 0, 0]) => { const b = bones[name]; b.updateWorldMatrix(true, false); return b.localToWorld(V(...local)); };
  return C;
}

// ---------------------------------------------------------------- garments / props (sized in metres; bone space is cm-scaled in this rig, see fit())
export function fitScale(C, boneName) {
  // world-units per bone-local unit (the rig is authored with a 0.01 armature scale)
  const b = C.bones[boneName]; b.updateWorldMatrix(true, false);
  const s = new THREE.Vector3(); b.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
  return 1 / s.x;
}
export function helmet(color = 0x16181d) {
  const g = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(0.135, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }));
  shell.scale.set(0.95, 1.0, 1.15);
  g.add(shell);
  const vents = mat(0x0a0a0c, { roughness: 0.8 });
  for (let i = -1; i <= 1; i++) { const v = box(0.02, 0.012, 0.12, vents, i * 0.045, 0.128, -0.01, g); v.rotation.x = 0.1; }
  const strip = mesh(new THREE.TorusGeometry(0.137, 0.006, 6, 40, Math.PI), mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.6 }));
  strip.rotation.set(0, Math.PI / 2, Math.PI / 2); strip.scale.set(1, 1.15, 1); strip.position.y = 0.02; g.add(strip);
  return g;
}
export function deliveryBag() {
  const g = new THREE.Group();
  const side = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.75 });
  const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: bagTex() });
  const b = mesh(new THREE.BoxGeometry(0.42, 0.44, 0.3), [side, side, side, side, front, side]);
  g.add(b);
  box(0.43, 0.02, 0.31, mat(0x22c55e, { roughness: 0.5 }), 0, -0.12, 0, g);
  for (const sx of [-1, 1]) box(0.04, 0.4, 0.015, mat(0x0c0c0e), sx * 0.12, 0.02, -0.16, g);
  return g;
}
function bagTex() {
  return once('bagtex', () => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#18191d'; x.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 6) { x.fillStyle = 'rgba(255,255,255,0.025)'; x.fillRect(0, y, 512, 2); }
    x.fillStyle = '#22c55e'; x.font = '900 120px "Inter Display", Inter'; x.textAlign = 'center'; x.fillText('gobbl', 256, 290);
    x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = '600 34px Inter'; x.fillText('HOT · FAST · HONEST', 256, 350);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

// ---------------------------------------------------------------- Mixamo-rig characters (realistic, clothed)
// Clips are Mixamo exports as three.js AnimationClip JSON with bare bone names (Hips, Spine, LeftArm...).
const MIXCLIPS = new Map();
export async function mixClip(name) {
  if (!MIXCLIPS.has(name)) MIXCLIPS.set(name, fetch(ASSETS + `mixamo/clips/${name}.json`).then((r) => r.json()).then((j) => THREE.AnimationClip.parse(j)));
  return MIXCLIPS.get(name);
}
export async function mixCharacter(path, { tint = null, maps = null } = {}) {
  const g = await load(path);
  const root = SkeletonUtils.clone(g.scene);
  const bones = {};
  let prefix = '';
  root.traverse((o) => {
    if (o.isBone) { bones[o.name] = o; if (/Hips$/.test(o.name)) prefix = o.name.slice(0, -4); }
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const m = o.material = o.material.clone();
      m.envMapIntensity = 0.7;
      const n = (m.name + ' ' + o.name).toLowerCase();
      if (/hair|short0|bob0|afro|ponytail|long0|brow|lash/.test(n)) { m.transparent = false; m.alphaTest = 0.45; m.depthWrite = true; m.side = THREE.DoubleSide; m.roughness = 0.7; }
      if (/eye|low-poly|high-poly/.test(n) && !/brow|lash/.test(n)) { m.roughness = 0.15; }
      if (/suit|shoes|clothes/.test(n)) { m.roughness = Math.max(m.roughness, 0.85); m.color.multiplyScalar(0.92); }
      if (tint) for (const [k, c] of Object.entries(tint)) if (n.includes(k)) m.color = new THREE.Color(c);
      if (maps) for (const [k, url] of Object.entries(maps)) if (n.includes(k)) { const t = tex(url); t.flipY = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; m.map = t; m.needsUpdate = true; }
      o.userData.matName = n;
    }
  });
  // hips height in the model's own units (bind pose) to rescale clip hip translation
  const hips = bones[prefix + 'Hips'];
  const hipsY = hips.position.y;
  const holder = new THREE.Group();
  holder.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const own = Object.fromEntries((g.animations || []).map((c) => [c.name, c]));
  const actions = {}, retarget = new Map();
  const getClip = async (name) => {
    if (retarget.has(name)) return retarget.get(name);
    const src = own[name] || (await mixClip(name));
    const c = src.clone();
    let srcHipsY = null;
    c.tracks = c.tracks.filter((t) => {
      const [bn, prop] = t.name.split('.');
      const target = bones[bn] ? bn : bones[prefix + bn] ? prefix + bn : null;
      if (!target) return false;
      t.name = target + '.' + prop;
      if (prop === 'position') { if (!/Hips$/.test(target)) return false; srcHipsY = t.values[1]; }
      return true;
    });
    // the clip's Hips values live in a Y-up, metre space; convert into the Hips' parent space (some rigs are Z-up, 0.01 scale)
    root.updateMatrixWorld(true);
    const pm = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(hips.parent.matrixWorld);
    const pq = new THREE.Quaternion(), ps = new THREE.Vector3();
    pm.decompose(new THREE.Vector3(), pq, ps);
    const pqi = pq.clone().invert();
    const bindWorldY = hips.getWorldPosition(new THREE.Vector3()).y - root.getWorldPosition(new THREE.Vector3()).y;
    for (const t of c.tracks) {
      const v = t.values;
      if (t.name.endsWith('Hips.quaternion')) {
        const q = new THREE.Quaternion();
        for (let i = 0; i < v.length; i += 4) { q.fromArray(v, i); q.premultiply(pqi); q.toArray(v, i); }
      }
      if (t.name.endsWith('Hips.position') && srcHipsY) {
        const k = bindWorldY / srcHipsY, x0 = v[0], z0 = v[2], p = new THREE.Vector3();
        for (let i = 0; i < v.length; i += 3) {
          p.set((v[i] - x0) * k, v[i + 1] * k, (v[i + 2] - z0) * k).applyQuaternion(pqi).divide(ps);
          p.toArray(v, i);
        }
      }
    }
    retarget.set(name, c);
    return c;
  };
  const C = { root: holder, model: root, mixer, bones, prefix, actions };
  // rest pose of every bone: restored before each pose() so IK / additive tweaks never accumulate across frames
  const rest = Object.values(bones).map((b) => [b, b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
  C.load = async (...names) => { for (const n of names) await getClip(n); };
  C.captureRest = () => { for (const r of rest) { r[1].copy(r[0].position); r[2].copy(r[0].quaternion); r[3].copy(r[0].scale); } };
  C.pose = (layers) => {
    for (const [b, p, q, sc] of rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
    for (const a of Object.values(actions)) { a.enabled = false; a.setEffectiveWeight(0); }
    for (const [name, t, w = 1, loop = true] of layers) {
      const clip = retarget.get(name);
      if (!clip) throw new Error('clip not loaded: ' + name);
      if (!actions[name]) { actions[name] = mixer.clipAction(clip); actions[name].play(); }
      const a = actions[name];
      a.enabled = true; a.setEffectiveWeight(w);
      a.time = loop ? ((t % clip.duration) + clip.duration) % clip.duration : Math.min(Math.max(t, 0), clip.duration - 1e-3);
    }
    mixer.update(0);
    root.updateMatrixWorld(true);
  };
  C.dur = (name) => retarget.get(name).duration;
  C.bone = (n) => bones[prefix + n];
  C.attach = (n, obj, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) => { const b = C.bone(n); obj.position.set(...pos); obj.rotation.set(...rot); obj.scale.setScalar(s); b.add(obj); return obj; };
  C.boneWorld = (n, local = [0, 0, 0]) => { const b = C.bone(n); b.updateWorldMatrix(true, false); return b.localToWorld(V(...local)); };
  return C;
}
