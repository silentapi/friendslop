// Bake the procedural pitbull (src/dogmesh.js) into assets/m/dog.json: base64 typed arrays, skinned, vertex-coloured.
// node tip-bait/game/tools/bakedog.mjs
import { writeFileSync } from 'node:fs';
import { bakeDog } from '../src/dogmesh.js';
const t0 = Date.now();
const d = bakeDog(Number(process.env.H || 0.0068));
const nv = d.pos.length / 3;
const b64 = (ta) => Buffer.from(ta.buffer).toString('base64');
const out = {
  bones: d.bones, count: nv,
  pos: b64(new Float32Array(d.pos)),
  nrm: b64(Int8Array.from(d.nrm, (v) => Math.round(v * 127))),
  col: b64(Uint8Array.from(d.col, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255))),
  si: b64(Uint8Array.from(d.si)),
  sw: b64(Uint8Array.from(d.sw, (v) => Math.round(v * 255))),
  idx: b64(nv < 65536 ? Uint16Array.from(d.idx) : Uint32Array.from(d.idx)),
};
const p = new URL('../assets/m/dog.json', import.meta.url);
writeFileSync(p, JSON.stringify(out));
console.log('dog baked', nv, 'verts', d.idx.length / 3, 'tris', ((Date.now() - t0) / 1000).toFixed(1) + 's', (JSON.stringify(out).length / 1024).toFixed(0) + 'KB');
