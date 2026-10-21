// Street props: palms (real CC-BY model, scaled), twin-globe lamps, cones, barriers.
import { THREE, SkeletonUtils, loadGLB, mat, box, cyl, mesh } from './core.js';
export async function palm(h = 9) {
  const g = await loadGLB('m/palm_tall.glb');
  const p = SkeletonUtils.clone(g.scene);
  const bb = new THREE.Box3().setFromObject(p); const s = h / (bb.max.y - bb.min.y);
  p.scale.setScalar(s); p.position.y = -bb.min.y * s;
  p.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material.map) { o.material.alphaTest = 0.4; o.material.side = THREE.DoubleSide; } } });
  const holder = new THREE.Group(); holder.add(p); return holder;
}
