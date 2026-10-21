// The pitbull's body as one smooth surface: a signed-distance sculpt (round cones + ellipsoids, smooth-unioned like
// clay), meshed with surface nets, coloured per vertex (blue brindle, white blaze + socks) and skinned to a skeleton.
// Pure math (no three.js) so tools/bakedog.mjs can bake it offline into assets/m/dog.json.
// Dog frame: forward = +z, up = +y, origin on the floor under the chest. Units: metres.

// ---------------------------------------------------------------- skeleton (rest pose, world positions, identity rotations)
export const BONES = [
  ['root', null, [0, 0, 0]],
  ['hips', 'root', [0, 0.43, -0.2]],
  ['spine', 'hips', [0, 0.43, -0.02]],
  ['chest', 'spine', [0, 0.42, 0.15]],
  ['neck', 'chest', [0, 0.47, 0.25]],
  ['head', 'neck', [0, 0.575, 0.35]],
  ['jaw', 'head', [0, 0.522, 0.38]],
  ['earL', 'head', [0.068, 0.655, 0.33]], ['earR', 'head', [-0.068, 0.655, 0.33]],
  ['shL', 'chest', [0.095, 0.4, 0.18]], ['elL', 'shL', [0.095, 0.23, 0.15]], ['wrL', 'elL', [0.095, 0.065, 0.17]],
  ['shR', 'chest', [-0.095, 0.4, 0.18]], ['elR', 'shR', [-0.095, 0.23, 0.15]], ['wrR', 'elR', [-0.095, 0.065, 0.17]],
  ['thL', 'hips', [0.09, 0.42, -0.22]], ['stL', 'thL', [0.09, 0.25, -0.15]], ['hoL', 'stL', [0.09, 0.115, -0.27]],
  ['thR', 'hips', [-0.09, 0.42, -0.22]], ['stR', 'thR', [-0.09, 0.25, -0.15]], ['hoR', 'stR', [-0.09, 0.115, -0.27]],
  ['tail1', 'hips', [0, 0.47, -0.33]], ['tail2', 'tail1', [0, 0.455, -0.42]], ['tail3', 'tail2', [0, 0.42, -0.5]],
];
const BI = Object.fromEntries(BONES.map(([n], i) => [n, i]));
export const ATTACH = {
  nose: [0, 0.576, 0.508], eyeL: [0.046, 0.607, 0.414], eyeR: [-0.046, 0.607, 0.414],
  neckA: [0, 0.46, 0.22], neckB: [0, 0.545, 0.33], // collar sits between these
};

// ---------------------------------------------------------------- SDF primitives
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function roundCone(a, b, r1, r2) {
  const ba = sub(b, a), l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pa0 = x - a[0], pa1 = y - a[1], pa2 = z - a[2];
    const yy = pa0 * ba[0] + pa1 * ba[1] + pa2 * ba[2], zz = yy - l2;
    const q0 = pa0 * l2 - ba[0] * yy, q1 = pa1 * l2 - ba[1] * yy, q2 = pa2 * l2 - ba[2] * yy;
    const x2 = q0 * q0 + q1 * q1 + q2 * q2, y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
}
// ellipsoid with an optional rotation (about z, then x) — the ears need a tilt
function ellipsoid(c, r, rz = 0, rx = 0) {
  const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
  return (x, y, z) => {
    let px = x - c[0], py = y - c[1], pz = z - c[2];
    // inverse rotation: undo x, then z
    let ty = py * cx + pz * sx, tz = -py * sx + pz * cx; py = ty; pz = tz;
    const tx = px * cz + py * sz; ty = -px * sz + py * cz; px = tx; py = ty;
    const k0 = Math.hypot(px / r[0], py / r[1], pz / r[2]), k1 = Math.hypot(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]));
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
  };
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

const P = []; // { f, bone, k }
const add = (f, bone, k = 0.03) => P.push({ f, bone: BI[bone], k });
const mir = (fn) => { fn(1, 'L'); fn(-1, 'R'); };
// torso: muscular rump, barrel, deep wide chest
add(ellipsoid([0, 0.445, -0.22], [0.125, 0.13, 0.13]), 'hips');
add(roundCone([0, 0.44, -0.14], [0, 0.425, 0.06], 0.122, 0.138), 'spine', 0.06);
add(ellipsoid([0, 0.41, 0.15], [0.148, 0.152, 0.14]), 'chest', 0.06);
add(ellipsoid([0, 0.335, 0.18], [0.1, 0.08, 0.1]), 'chest', 0.05);
// neck: thick, short
add(roundCone([0, 0.455, 0.22], [0, 0.545, 0.33], 0.1, 0.085), 'neck', 0.05);
// head: broad skull, big cheeks, short blunt muzzle, brow ridges, separate lower jaw
add(ellipsoid([0, 0.6, 0.35], [0.088, 0.074, 0.086]), 'head', 0.04);
mir((s) => add(ellipsoid([s * 0.054, 0.55, 0.38], [0.054, 0.05, 0.056]), 'head', 0.03));
add(roundCone([0, 0.566, 0.4], [0, 0.562, 0.47], 0.047, 0.04), 'head', 0.035);
mir((s) => add(ellipsoid([s * 0.044, 0.632, 0.405], [0.03, 0.012, 0.02]), 'head', 0.015));
add(roundCone([0, 0.5, 0.385], [0, 0.505, 0.462], 0.034, 0.027), 'jaw', 0.03);
// ears: small rose ears folded out to the sides
mir((s, n) => add(ellipsoid([s * 0.088, 0.67, 0.325], [0.036, 0.03, 0.008], s * 0.95, -0.35), 'ear' + n, 0.012));
// front legs: shoulder → elbow → wrist, compact paws
mir((s, n) => {
  add(roundCone([s * 0.095, 0.4, 0.18], [s * 0.095, 0.23, 0.15], 0.062, 0.046), 'sh' + n, 0.04);
  add(roundCone([s * 0.095, 0.23, 0.15], [s * 0.095, 0.065, 0.17], 0.043, 0.033), 'el' + n, 0.02);
  add(roundCone([s * 0.095, 0.065, 0.17], [s * 0.095, 0.03, 0.2], 0.032, 0.03), 'wr' + n, 0.02);
  add(ellipsoid([s * 0.095, 0.027, 0.205], [0.038, 0.027, 0.048]), 'wr' + n, 0.02);
});
// back legs: big thigh, stifle forward, hock back
mir((s, n) => {
  add(ellipsoid([s * 0.085, 0.37, -0.2], [0.062, 0.105, 0.095]), 'th' + n, 0.04);
  add(roundCone([s * 0.09, 0.42, -0.22], [s * 0.09, 0.25, -0.15], 0.07, 0.045), 'th' + n, 0.04);
  add(roundCone([s * 0.09, 0.25, -0.15], [s * 0.09, 0.115, -0.27], 0.042, 0.03), 'st' + n, 0.02);
  add(roundCone([s * 0.09, 0.115, -0.27], [s * 0.09, 0.035, -0.245], 0.03, 0.029), 'ho' + n, 0.02);
  add(ellipsoid([s * 0.09, 0.026, -0.226], [0.036, 0.026, 0.046]), 'ho' + n, 0.02);
});
// tail: thick at the base, whip-thin at the tip
add(roundCone([0, 0.47, -0.31], [0, 0.455, -0.42], 0.03, 0.022), 'tail1', 0.03);
add(roundCone([0, 0.455, -0.42], [0, 0.42, -0.5], 0.022, 0.015), 'tail2', 0.012);
add(roundCone([0, 0.42, -0.5], [0, 0.37, -0.57], 0.015, 0.007), 'tail3', 0.01);
// the mouth: a thin slit carved between muzzle and jaw so the jaw can open
const slit = ellipsoid([0, 0.523, 0.47], [0.06, 0.0055, 0.095]);

function sdf(x, y, z) {
  let d = 1e9;
  for (const p of P) d = smin(d, p.f(x, y, z), p.k);
  const s = slit(x, y, z);
  return -smin(-d, s, 0.006); // smooth subtraction
}

// ---------------------------------------------------------------- colour: blue brindle, white blaze, white socks
function hash(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(i, j, k), hash(i + 1, j, k), u), L(hash(i, j + 1, k), hash(i + 1, j + 1, k), u), v), L(L(hash(i, j, k + 1), hash(i + 1, j, k + 1), u), L(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), u), v), w);
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const eq = (x, y, z, c, r) => Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]);
function colour(x, y, z) {
  const n = fbm(x * 14, y * 14, z * 14);
  let c = mix([0.34, 0.335, 0.37], [0.43, 0.42, 0.45], n);
  const stripe = 0.5 + 0.5 * Math.sin(z * 62 + y * 10 + fbm(x * 9 + 3, y * 9, z * 9) * 6);
  c = mix(c, [0.2, 0.19, 0.22], ss(0.6, 0.95, stripe) * 0.4 * ss(0.35, 0.65, fbm(x * 6 + 7, y * 6, z * 6)) * ss(0.2, 0.32, y)); // brindle on the body, not the legs
  c = mix(c, [0.27, 0.26, 0.3], ss(0.47, 0.5, y) * ss(0.38, 0.42, z) * 0.6); // slightly darker mask on the muzzle
  const edge = (fbm(x * 30, y * 30, z * 30) - 0.5) * 0.25;
  const blaze = Math.min(eq(x, y, z, [0, 0.36, 0.27], [0.075, 0.135, 0.1]), eq(x, y, z, [0, 0.46, 0.3], [0.05, 0.075, 0.075]), eq(x, y, z, [0, 0.488, 0.45], [0.028, 0.02, 0.04]));
  c = mix(c, [0.9, 0.88, 0.85], 1 - ss(0.85, 1.1, blaze + edge));
  c = mix(c, [0.9, 0.88, 0.85], 1 - ss(0.045, 0.075, y + edge * 0.08)); // socks
  if (y > 0.5 && z > 0.38) c = mix(c, [0.1, 0.08, 0.09], 1 - ss(0.002, 0.009, slit(x, y, z))); // dark lip line
  for (const e of [ATTACH.eyeL, ATTACH.eyeR]) c = mix(c, [0.16, 0.14, 0.15], 1 - ss(0.018, 0.026, Math.hypot(x - e[0], y - e[1], z - e[2]))); // eye rims
  return c;
}

// ---------------------------------------------------------------- surface nets + skin weights
export function bakeDog(h = 0.0072) {
  const B = { x0: -0.2, x1: 0.2, y0: -0.01, y1: 0.72, z0: -0.62, z1: 0.56 };
  const nx = Math.ceil((B.x1 - B.x0) / h) + 1, ny = Math.ceil((B.y1 - B.y0) / h) + 1, nz = Math.ceil((B.z1 - B.z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[id(i, j, k)] = sdf(B.x0 + i * h, B.y0 + j * h, B.z0 + k * h);
  const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = co.map(([a, b, c]) => F[id(i + a, j + b, k + c)]);
    let neg = 0; for (const x of v) if (x < 0) neg++;
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) { if ((v[a] < 0) === (v[b] < 0)) continue; const t = v[a] / (v[a] - v[b]); sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; n++; }
    vid[id(i, j, k)] = pos.length / 3;
    pos.push(B.x0 + (i + sx / n) * h, B.y0 + (j + sy / n) * h, B.z0 + (k + sz / n) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = F[id(i, j, k)] < 0;
    if (f0 !== (F[id(i + 1, j, k)] < 0)) quad(vid[id(i, j - 1, k - 1)], vid[id(i, j, k - 1)], vid[id(i, j, k)], vid[id(i, j - 1, k)], !f0);
    if (f0 !== (F[id(i, j + 1, k)] < 0)) quad(vid[id(i - 1, j, k - 1)], vid[id(i - 1, j, k)], vid[id(i, j, k)], vid[id(i, j, k - 1)], !f0);
    if (f0 !== (F[id(i, j, k + 1)] < 0)) quad(vid[id(i - 1, j - 1, k)], vid[id(i, j - 1, k)], vid[id(i, j, k)], vid[id(i - 1, j, k)], !f0);
  }
  // one pass of Laplacian smoothing, then snap back toward the surface along the gradient
  const nv = pos.length / 3, nb = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3]; nb[a].add(b); nb[b].add(a); }
  const grad = (x, y, z) => { const e = 0.0008; const g = [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)]; const l = Math.hypot(...g) || 1; return g.map((c) => c / l); };
  const sm = pos.slice();
  for (let v = 0; v < nv; v++) { if (!nb[v].size) continue; let ax = 0, ay = 0, az = 0; for (const u of nb[v]) { ax += pos[u * 3]; ay += pos[u * 3 + 1]; az += pos[u * 3 + 2]; } const m = nb[v].size; sm[v * 3] = pos[v * 3] * 0.5 + (ax / m) * 0.5; sm[v * 3 + 1] = pos[v * 3 + 1] * 0.5 + (ay / m) * 0.5; sm[v * 3 + 2] = pos[v * 3 + 2] * 0.5 + (az / m) * 0.5; }
  const nrm = new Array(nv * 3), col = new Array(nv * 3), si = new Array(nv * 4), sw = new Array(nv * 4);
  for (let v = 0; v < nv; v++) {
    let x = sm[v * 3], y = sm[v * 3 + 1], z = sm[v * 3 + 2];
    for (let it = 0; it < 2; it++) { const d = sdf(x, y, z), g = grad(x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    const g = grad(x, y, z); nrm[v * 3] = g[0]; nrm[v * 3 + 1] = g[1]; nrm[v * 3 + 2] = g[2];
    const c = colour(x, y, z); col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
    // skin: each primitive pulls toward its bone by how close the vertex is to that primitive's own surface
    const w = new Float64Array(BONES.length); let dmin = 1e9; const ds = P.map((p) => { const d = p.f(x, y, z); dmin = Math.min(dmin, d); return d; });
    P.forEach((p, i) => { w[p.bone] += Math.exp(-(ds[i] - dmin) / 0.012); });
    // the mouth splits cleanly: everything under the slit (in front of the cheeks) rides the jaw
    const jw = (1 - ss(0.514, 0.53, y)) * ss(0.35, 0.405, z) * (1 - ss(0.06, 0.085, Math.abs(x)));
    let tot = 0; for (let b = 0; b < w.length; b++) { if (b === BI.jaw) w[b] = 0; tot += w[b]; }
    for (let b = 0; b < w.length; b++) w[b] = (w[b] / tot) * (1 - jw);
    w[BI.jaw] = jw;
    const top = [...w.keys()].sort((a, b) => w[b] - w[a]).slice(0, 4), s4 = top.reduce((a, b) => a + w[b], 0);
    top.forEach((b, i) => { si[v * 4 + i] = b; sw[v * 4 + i] = w[b] / s4; });
  }
  // orient triangles so they face along the surface normal
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const u = sub(pos.slice(b * 3, b * 3 + 3), pos.slice(a * 3, a * 3 + 3)), w2 = sub(pos.slice(c * 3, c * 3 + 3), pos.slice(a * 3, a * 3 + 3));
    const fn = [u[1] * w2[2] - u[2] * w2[1], u[2] * w2[0] - u[0] * w2[2], u[0] * w2[1] - u[1] * w2[0]];
    const avg = [0, 1, 2].map((q) => nrm[a * 3 + q] + nrm[b * 3 + q] + nrm[c * 3 + q]);
    if (dot(fn, avg) < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
  return { pos, nrm, col, si, sw, idx, bones: BONES };
}
