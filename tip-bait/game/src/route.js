// A level route along real streets: arc-length parameterised, resampled every metre with a smoothed heading.
// World frame: x east, z south (metres from Citi Tower). right(s) = forward × up.
import { THREE } from './core.js';

export class Route {
  constructor(def) {
    this.def = def;
    const src = def.pts;
    // resample at 1 m
    const pts = [src[0].slice()];
    for (let i = 0; i < src.length - 1; i++) {
      const [x1, z1] = src[i], [x2, z2] = src[i + 1];
      const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L));
      for (let k = 1; k <= n; k++) pts.push([x1 + (x2 - x1) * k / n, z1 + (z2 - z1) * k / n]);
    }
    // light smoothing (keeps the filleted corners round)
    for (let it = 0; it < 4; it++) for (let i = 1; i < pts.length - 1; i++) { pts[i][0] = (pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4; pts[i][1] = (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4; }
    this.pts = pts;
    this.s = [0];
    for (let i = 1; i < pts.length; i++) this.s.push(this.s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.s[this.s.length - 1];
    // headings, smoothed over ±4 m
    this.h = pts.map((p, i) => { const a = pts[Math.max(0, i - 4)], b = pts[Math.min(pts.length - 1, i + 4)]; return Math.atan2(b[0] - a[0], b[1] - a[1]); });
    this.streets = def.streets;
  }
  idx(s) {
    s = Math.min(Math.max(s, 0), this.length);
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m; else hi = m; }
    const t = (s - this.s[lo]) / (this.s[hi] - this.s[lo] || 1);
    return [lo, hi, t];
  }
  // frame at distance s: position, heading (yaw: forward = (sin, cos)), right vector
  at(s, out = {}) {
    const [a, b, t] = this.idx(s);
    const p = this.pts[a], q = this.pts[b];
    let ha = this.h[a], hb = this.h[b]; if (hb - ha > Math.PI) hb -= 2 * Math.PI; if (ha - hb > Math.PI) hb += 2 * Math.PI;
    const yaw = ha + (hb - ha) * t;
    out.x = p[0] + (q[0] - p[0]) * t; out.z = p[1] + (q[1] - p[1]) * t; out.yaw = yaw;
    out.fx = Math.sin(yaw); out.fz = Math.cos(yaw); out.rx = -out.fz; out.rz = out.fx;
    return out;
  }
  // past either end the street continues straight, so cameras behind the start never collapse onto it
  world(s, lateral = 0, y = 0, out = new THREE.Vector3()) { const c = Math.min(Math.max(s, 0), this.length), f = this.at(c), ex = s - c; return out.set(f.x + f.fx * ex + f.rx * lateral, y, f.z + f.fz * ex + f.rz * lateral); }
  street(s) { return this.streets.find((st) => s >= st.s0 && s <= st.s1) || this.streets[this.streets.length - 1]; }
  // curvature (rad per metre) around s, for bank/lean
  curve(s) { const a = this.at(s - 3).yaw, b = this.at(s + 3).yaw; let d = b - a; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d / 6; }
}
