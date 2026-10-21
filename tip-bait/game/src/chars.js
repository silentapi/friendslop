// Characters: MakeHuman + Mixamo rig, clips retargeted in place (no root-motion snap), rest pose restored every
// pose() so IK never accumulates. Props: helmet, gobbl bag, the iced caramel macchiato. Two-bone IK.
import { THREE, SkeletonUtils, V, clamp, loadGLB, loadJSON, tex, mesh, box, cyl, mat, canvasTex } from './core.js';

const CLIPS = new Map();
const clip = (name) => once(name);
function once(name) { if (!CLIPS.has(name)) CLIPS.set(name, loadJSON(`clips/${name}.json`).then((j) => THREE.AnimationClip.parse(j))); return CLIPS.get(name); }

export async function character(path, { tint = null, maps = null } = {}) {
  const g = await loadGLB(path);
  const root = SkeletonUtils.clone(g.scene);
  const bones = {};
  let prefix = '';
  root.traverse((o) => {
    if (o.isBone) { bones[o.name] = o; if (/Hips$/.test(o.name)) prefix = o.name.slice(0, -4); }
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      const m = (o.material = o.material.clone());
      m.envMapIntensity = 0.8;
      const n = (m.name + ' ' + o.name).toLowerCase();
      if (/hair|short0|bob0|afro|ponytail|long0|brow|lash/.test(n)) { m.transparent = false; m.alphaTest = 0.45; m.depthWrite = true; m.side = THREE.DoubleSide; m.roughness = 0.7; }
      if (/eye|low-poly|high-poly/.test(n) && !/brow|lash/.test(n)) m.roughness = 0.15;
      if (/suit|shoes|clothes/.test(n)) { m.roughness = Math.max(m.roughness, 0.85); }
      if (tint) for (const [k, c] of Object.entries(tint)) if (n.includes(k)) m.color = new THREE.Color(c);
      if (maps) for (const [k, url] of Object.entries(maps)) if (n.includes(k)) { const t = tex(url, { repeat: false }); t.flipY = false; m.map = t; m.needsUpdate = true; }
    }
  });
  const hips = bones[prefix + 'Hips'];
  const holder = new THREE.Group(); holder.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const actions = {}, retarget = new Map();
  async function getClip(name) {
    if (retarget.has(name)) return retarget.get(name);
    const c = (await clip(name)).clone();
    let srcHipsY = null;
    c.tracks = c.tracks.filter((t) => {
      const [bn, prop] = t.name.split('.');
      const target = bones[bn] ? bn : bones[prefix + bn] ? prefix + bn : null;
      if (!target) return false;
      t.name = target + '.' + prop;
      if (prop === 'position') { if (!/Hips$/.test(target)) return false; srcHipsY = t.values[1]; }
      if (prop === 'scale') return false;
      return true;
    });
    root.updateMatrixWorld(true);
    const pm = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(hips.parent.matrixWorld);
    const pq = new THREE.Quaternion(), ps = new THREE.Vector3();
    pm.decompose(new THREE.Vector3(), pq, ps);
    const pqi = pq.clone().invert();
    const bindWorldY = hips.getWorldPosition(new THREE.Vector3()).y - root.getWorldPosition(new THREE.Vector3()).y;
    for (const t of c.tracks) {
      const v = t.values;
      if (t.name.endsWith('Hips.quaternion')) { const q = new THREE.Quaternion(); for (let i = 0; i < v.length; i += 4) { q.fromArray(v, i); q.premultiply(pqi); q.toArray(v, i); } }
      if (t.name.endsWith('Hips.position') && srcHipsY) {
        const k = bindWorldY / srcHipsY, x0 = v[0], z0 = v[2], n = v.length / 3, xl = v[v.length - 3], zl = v[v.length - 1], p = new THREE.Vector3();
        const tm = t.times, T = tm[n - 1] - tm[0] || 1;
        for (let i = 0; i < v.length; i += 3) {
          const f = (tm[i / 3] - tm[0]) / T;
          p.set((v[i] - x0 - (xl - x0) * f) * k, v[i + 1] * k, (v[i + 2] - z0 - (zl - z0) * f) * k).applyQuaternion(pqi).divide(ps);
          p.toArray(v, i);
        }
      }
    }
    retarget.set(name, c);
    return c;
  }
  const C = { root: holder, model: root, bones, prefix };
  const rest = Object.values(bones).map((b) => [b, b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
  C.load = async (...names) => { for (const n of names) await getClip(n); };
  C.captureRest = () => { for (const r of rest) { r[1].copy(r[0].position); r[2].copy(r[0].quaternion); r[3].copy(r[0].scale); } };
  C.pose = (layers) => {
    for (const [b, p, q, sc] of rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
    for (const a of Object.values(actions)) { a.enabled = false; a.setEffectiveWeight(0); }
    for (const [name, t, w = 1, loop = true] of layers) {
      const cl = retarget.get(name); if (!cl) continue;
      if (!actions[name]) { actions[name] = mixer.clipAction(cl); actions[name].play(); }
      const a = actions[name]; a.enabled = true; a.setEffectiveWeight(w);
      a.time = loop ? ((t % cl.duration) + cl.duration) % cl.duration : Math.min(Math.max(t, 0), cl.duration - 1e-3);
    }
    mixer.update(0);
    holder.updateMatrixWorld(true);
  };
  C.dur = (name) => retarget.get(name)?.duration ?? 1;
  C.bone = (n) => bones[prefix + n];
  C.attach = (n, obj, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) => { const b = C.bone(n); obj.position.set(...pos); obj.rotation.set(...rot); obj.scale.setScalar(s); b.add(obj); return obj; };
  C.boneWorld = (n, out = new THREE.Vector3()) => { const b = C.bone(n); b.updateWorldMatrix(true, false); return b.getWorldPosition(out); };
  return C;
}

// ---------------------------------------------------------------- IK
const _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pw = new THREE.Quaternion();
function aimBone(bone, childPos, target) {
  bone.getWorldPosition(_a);
  const from = childPos.clone().sub(_a).normalize(), to = target.clone().sub(_a).normalize();
  _q.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2);
  const want = _q.multiply(_q2);
  bone.parent.getWorldQuaternion(_pw);
  bone.quaternion.copy(_pw.invert().multiply(want));
  bone.updateMatrixWorld(true);
}
export function ik2(upper, lower, end, target, pole) {
  upper.updateMatrixWorld(true);
  const pa = upper.getWorldPosition(new THREE.Vector3()), pb = lower.getWorldPosition(new THREE.Vector3()), pc = end.getWorldPosition(new THREE.Vector3());
  const la = pa.distanceTo(pb), lb = pb.distanceTo(pc);
  const d = target.clone().sub(pa); const L = clamp(d.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3); const dir = d.normalize();
  const cosA = (la * la + L * L - lb * lb) / (2 * la * L), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pv = pole.clone().sub(pa); const perp = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const knee = pa.clone().add(dir.clone().multiplyScalar(la * cosA)).add(perp.multiplyScalar(la * sinA));
  aimBone(upper, pb, knee);
  aimBone(lower, end.getWorldPosition(new THREE.Vector3()), pa.clone().add(dir.clone().multiplyScalar(L)));
}

// ---------------------------------------------------------------- props
export function helmet(color = 0x16181d) {
  const g = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(0.135, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(color, { roughness: 0.3, metalness: 0.1 }));
  shell.scale.set(0.95, 1.0, 1.15); g.add(shell);
  const strip = mesh(new THREE.TorusGeometry(0.137, 0.007, 6, 30, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2ee66f }));
  strip.rotation.set(0, Math.PI / 2, Math.PI / 2); strip.scale.set(1, 1.15, 1); strip.position.y = 0.02; g.add(strip);
  return g;
}
const bagTex = () => canvasTex('bag', 512, 512, (x) => {
  x.fillStyle = '#18191d'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#22c55e'; x.font = '900 128px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('gobbl', 256, 290);
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.font = '700 34px system-ui, sans-serif'; x.fillText('HOT · FAST · HONEST', 256, 352);
});
export function deliveryBag() {
  const g = new THREE.Group();
  const side = mat(0x1a1c20, { roughness: 0.75 }), front = mat(0xffffff, { roughness: 0.6, map: bagTex() });
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.44, 0.3), [side, side, side, side, front, side]));
  box(0.43, 0.02, 0.31, mat(0x22c55e, { roughness: 0.5 }), 0, -0.12, 0, g);
  return g;
}
export function coldCup(scale = 1) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.3 });
  cyl(0.046, 0.034, 0.1, mat(0xe6d4b8, { roughness: 0.4 }), 14, 0, 0.05, 0, g);
  cyl(0.051, 0.046, 0.05, mat(0xa86a38, { roughness: 0.3 }), 14, 0, 0.125, 0, g);
  cyl(0.054, 0.051, 0.04, mat(0x6b3a1c, { roughness: 0.3 }), 14, 0, 0.17, 0, g);
  cyl(0.056, 0.038, 0.2, shell, 16, 0, 0.1, 0, g, { cast: false });
  const straw = cyl(0.005, 0.005, 0.2, mat(0x1e7a3e), 6, 0.01, 0.27, 0, g); straw.rotation.z = 0.1;
  g.scale.setScalar(scale);
  return g;
}
export { V };
