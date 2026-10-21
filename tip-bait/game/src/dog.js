// The floor-20 pitbull: one smooth skinned body baked from src/dogmesh.js (assets/m/dog.json), driven by a small
// procedural rig — IK legs that keep the paws planted, a hinged jaw, ears, a whip tail — plus glossy eyes, nose,
// teeth, tongue and a red collar riding the bones. Dog frame: forward = +z, up = +y, origin on the floor.
// Nothing animates itself: the finale drives everything through dog.pose(p) every frame.
import { THREE, V, clamp, loadJSON } from './core.js';
import { ik2 } from './chars.js';
import { ATTACH } from './dogmesh.js';

const dec = (s, T) => { const b = Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); return new T(b.buffer); };
let dataP = null;
export function prefetchDog() {
  return (dataP ||= loadJSON('m/dog.json').then((j) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dec(j.pos, Float32Array), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(dec(j.nrm, Int8Array), 3, true));
    const c8 = dec(j.col, Uint8Array), col = new Float32Array(c8.length), C = new THREE.Color();
    for (let i = 0; i < c8.length; i += 3) { C.setRGB(c8[i] / 255, c8[i + 1] / 255, c8[i + 2] / 255, THREE.SRGBColorSpace); col[i] = C.r; col[i + 1] = C.g; col[i + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(dec(j.si, Uint8Array)), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(dec(j.sw, Uint8Array), 4, true));
    g.setIndex(new THREE.BufferAttribute(j.count < 65536 ? dec(j.idx, Uint16Array) : dec(j.idx, Uint32Array), 1));
    g.computeBoundingSphere();
    return { g, bones: j.bones };
  }));
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
// turn a bone so a direction fixed in its own (rest) frame points at a world-space target
function aim(bone, localDir, target) {
  bone.updateWorldMatrix(true, false);
  bone.getWorldPosition(_a); bone.getWorldQuaternion(_q);
  const cur = localDir.clone().applyQuaternion(_q).normalize(), want = _b.copy(target).sub(_a).normalize();
  _q2.setFromUnitVectors(cur, want).multiply(_q);
  bone.parent.getWorldQuaternion(_q); bone.quaternion.copy(_q.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

export async function pitbull() {
  const { g, bones: B } = await prefetchDog();
  const root = new THREE.Group();
  const bones = {}, rest = {};
  for (const [n, parent, p] of B) {
    const b = new THREE.Bone(); b.name = n; bones[n] = b; rest[n] = V(...p);
    if (parent) { b.position.copy(rest[n]).sub(rest[parent]); bones[parent].add(b); }
  }
  for (const [n, parent] of B) if (parent) rest[n + '_local'] = bones[n].position.clone();
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.7, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x7a7a88) });
  const body = new THREE.SkinnedMesh(g, skin); body.castShadow = true; body.frustumCulled = false;
  root.add(body); body.add(bones.root);
  root.updateMatrixWorld(true);
  body.bind(new THREE.Skeleton(B.map(([n]) => bones[n])));

  // face + collar parts ride their bones (rest bones are unrotated, so local = rest world − bone rest world)
  const on = (bone, obj, at) => { obj.position.copy(V(...at).sub(rest[bone])); bones[bone].add(obj); obj.castShadow = true; return obj; };
  const gloss = (c, r = 0.12) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 1, clearcoatRoughness: 0.08 });
  const sph = (r, m, seg = 20) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m);
  const nose = on('head', sph(1, gloss(0x24232a, 0.35)), ATTACH.nose); nose.scale.set(0.025, 0.018, 0.016);
  for (const e of [ATTACH.eyeL, ATTACH.eyeR]) {
    const eye = on('head', sph(0.0145, gloss(0x3b2410, 0.05)), e);
    const glint = sph(0.0035, new THREE.MeshBasicMaterial({ color: 0xffffff }), 8); glint.position.set(e[0] > 0 ? -0.004 : 0.004, 0.006, 0.012); eye.add(glint);
  }
  const toothM = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.25 });
  const tooth = (len, r) => { const t = new THREE.Mesh(new THREE.ConeGeometry(r, len, 8), toothM); return t; };
  for (const s of [-1, 1]) {
    const up = on('head', tooth(0.024, 0.0068), [s * 0.03, 0.512, 0.47]); up.rotation.x = Math.PI;
    const lo = on('jaw', tooth(0.02, 0.006), [s * 0.025, 0.531, 0.452]);
    void lo;
  }
  for (let i = 0; i < 4; i++) { const t = on('head', new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.011, 0.006), toothM), [-0.015 + i * 0.01, 0.516, 0.493]); void t; }
  const mouth = on('head', sph(1, new THREE.MeshStandardMaterial({ color: 0x4a1218, roughness: 0.6 })), [0, 0.522, 0.43]); mouth.scale.set(0.04, 0.016, 0.06);
  const tongue = on('jaw', sph(1, new THREE.MeshStandardMaterial({ color: 0xd65a72, roughness: 0.4 })), [0, 0.528, 0.43]); tongue.scale.set(0.026, 0.008, 0.045);
  // collar: a red strap around the middle of the neck, a brass tag hanging off the front, the leash clip on top
  const nA = V(...ATTACH.neckA), nB = V(...ATTACH.neckB), nDir = nB.clone().sub(nA).normalize(), mid = nA.clone().lerp(nB, 0.42);
  const collar = on('neck', new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.014, 10, 32), new THREE.MeshStandardMaterial({ color: 0xb8142a, roughness: 0.45 })), mid.toArray());
  collar.quaternion.setFromUnitVectors(V(0, 0, 1), nDir);
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 16), new THREE.MeshStandardMaterial({ color: 0xd6ae4a, metalness: 1, roughness: 0.3 }));
  tag.rotation.x = Math.PI / 2; tag.position.set(0, -0.12, 0.012); collar.add(tag);
  const ring = new THREE.Object3D(); ring.position.set(0, 0.1, 0); collar.add(ring);

  const LEGS = [
    { s: 1, f: true, up: 'shL', lo: 'elL', end: 'wrL', ph: 0 }, { s: -1, f: true, up: 'shR', lo: 'elR', end: 'wrR', ph: Math.PI },
    { s: 1, f: false, up: 'thL', lo: 'stL', end: 'hoL', ph: Math.PI }, { s: -1, f: false, up: 'thR', lo: 'stR', end: 'hoR', ph: 0 },
  ];
  const C0 = V(0, 0.43, -0.02), S0 = V(0, 0.4, 0.18), hipsRest = rest.hips.clone();
  const D = { root, body, bones, head: bones.head, ring };
  const toW = (x, y, z) => root.localToWorld(V(x, y, z));
  // p: gait (rad), stride 0..1, crouch 0..1, pitch, roll, rise (m), fwd (m), headYaw, headPitch, jaw 0..1, angry 0..1,
  //    tail (rad up), wag 0..1, sit 0..1, reach 0..1 (front legs flung forward in a lunge), t (s)
  D.pose = (p = {}) => {
    const { gait = 0, stride = 0, crouch = 0, roll = 0, rise = 0, fwd = 0, headYaw = 0, headPitch = 0, angry = 0, wag = 0, sit = 0, reach = 0, t = 0 } = p;
    for (const [n, parent] of B) { if (parent) bones[n].position.copy(rest[n + '_local']); bones[n].quaternion.identity(); }
    // body: sit tips the body back about the shoulders (rump to the floor); pitch tips about the middle
    const th = (p.pitch ?? 0) - sit * 0.62, piv = C0.clone().lerp(S0, sit);
    const hp = hipsRest.clone().sub(piv).applyAxisAngle(V(1, 0, 0), th).add(piv);
    hp.y += -crouch * 0.085 - sit * 0.04 + rise + Math.abs(Math.sin(gait)) * stride * 0.016; hp.z += fwd;
    bones.hips.position.copy(hp); bones.hips.rotation.set(th, 0, roll);
    bones.spine.rotation.x = -crouch * 0.06; bones.chest.rotation.x = crouch * 0.1 + sit * 0.12;
    bones.neck.rotation.set(-th * 0.7 + crouch * 0.35 + headPitch * 0.4 - sit * 0.1, headYaw * 0.35, 0);
    bones.head.rotation.set(headPitch * 0.6 - th * 0.3 - crouch * 0.15, headYaw * 0.65, -headYaw * 0.18);
    bones.jaw.rotation.x = clamp(p.jaw ?? 0) * 0.62;
    for (const [n, s] of [['earL', 1], ['earR', -1]]) bones[n].rotation.set(-angry * 0.55, 0, -s * angry * 0.35);
    const tl = p.tail ?? 0.15, wg = wag * 0.55;
    bones.tail1.rotation.set(tl - sit * 0.8, Math.sin(t * 14) * wg, 0);
    bones.tail2.rotation.set(tl * 0.35, Math.sin(t * 14 - 0.7) * wg * 0.8, 0);
    bones.tail3.rotation.set(tl * 0.2, Math.sin(t * 14 - 1.4) * wg * 0.6, 0);
    root.updateMatrixWorld(true);
    // legs: IK to planted paws (with the trot cycle on top), flung forward in a lunge, folded under in a sit
    for (const L of LEGS) {
      const ph = gait + L.ph, sw = Math.sin(ph) * 0.07 * stride, lift = Math.max(0, Math.cos(ph)) * 0.055 * stride;
      let tgt, pole;
      if (L.f) {
        tgt = toW(L.s * 0.095, 0.065 + lift, 0.17 + fwd * 0.85 + sw);
        if (reach > 0) { const ch = bones.chest.getWorldPosition(V()); tgt.lerp(ch.add(root.localToWorld(V(L.s * 0.085, -0.1, 0.3)).sub(root.localToWorld(V()))), reach); }
        pole = toW(L.s * 0.12, 0.25, -0.6 + fwd);
      } else {
        tgt = toW(L.s * 0.09, 0.115 + lift, -0.27 + fwd + sw).lerp(toW(L.s * 0.11, 0.05, -0.17), sit);
        pole = toW(L.s * 0.1, 0.3, 0.8 + fwd);
      }
      ik2(bones[L.up], bones[L.lo], bones[L.end], tgt, pole);
      if (L.f) { if (reach < 0.5) aim(bones[L.end], V(0, -0.035, 0.03), tgt.clone().add(root.localToWorld(V(0, -0.04, 0.035)).sub(root.localToWorld(V())))); }
      else aim(bones[L.end], V(0, -0.08, 0.025), sit > 0 ? tgt.clone().lerp(toW(L.s * 0.11, 0.025, -0.05), sit).add(root.localToWorld(V(0, -0.075 * (1 - sit), 0.02)).sub(root.localToWorld(V()))) : toW(L.s * 0.09, 0.03, -0.245 + fwd + sw));
    }
    root.updateMatrixWorld(true);
  };
  D.mouth = (out = V()) => bones.head.localToWorld(out.set(0, -0.04, 0.14));
  D.clip = (out = V()) => ring.getWorldPosition(out);
  D.pose();
  return D;
}
