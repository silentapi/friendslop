// Procedural audio: an 88 BPM lo-fi / neo-soul groove (Rhodes keys, sub bass, swung drums, vinyl) rendered once
// into seamless stereo loops, city / interior ambience beds with random far-off one-shots, and synthesized SFX.
// Nothing is downloaded. Starts on the first tap (browser autoplay rules).
const SR = 44100;
let ctx = null, master = null, musicGain = null, sfxGain = null, current = null, muted = false;
const buffers = {};
const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 * 2 - 1; }; })();
const note = (n) => 440 * Math.pow(2, (n - 69) / 12);
function buf(len) { return new Float32Array(Math.floor(len * SR)); }
function add(dst, t0, src, g = 1) { const i0 = Math.floor(t0 * SR); for (let i = 0; i < src.length && i0 + i < dst.length; i++) if (i0 + i >= 0) dst[i0 + i] += src[i] * g; }
// one-pole filters (cheap, good enough)
function lp(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function hp(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
const noise = (d) => { const b = buf(d); for (let i = 0; i < b.length; i++) b[i] = rnd(); return b; };
function env(b, a, k) { for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.min(1, t / a) * Math.exp(-k * t); } return b; }


// ---------------------------------------------------------------- music: an 88 BPM lo-fi / neo-soul groove
// Rhodes-style FM keys on a ii–V–I–vi-ish progression in D, round sub bass, soft swung drums, dusty vinyl, a gentle
// whistled lead. Everything renders straight into a circular buffer (notes and reverb tails wrap around the loop
// point), so the loops are seamless. Stereo.
const run = (g) => { let r; while (!(r = g.next()).done); return r.value; };
const BPM = 88, BEAT = 60 / BPM, BAR = BEAT * 4;
const TAU = Math.PI * 2;
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
// swing: odd 16ths land a little late (lazy, behind-the-beat)
const at = (bar, beat) => { const p = beat * 4, i = Math.round(p), late = Math.abs(p - i) < 1e-6 && i % 2 ? 0.17 / 4 : 0; return bar * BAR + (beat + late) * BEAT; };
function addW(dst, t0, src, g = 1) { const N = dst.length; let j = ((Math.floor(t0 * SR) % N) + N) % N; for (let i = 0; i < src.length; i++) { dst[j] += src[i] * g; if (++j === N) j = 0; } }
// circular one-pole filters: a warm-up lap first, so the state at sample 0 is the state at the end of the loop
const WARM = Math.floor(0.3 * SR), TAIL = Math.floor(2.5 * SR); // warm-up lap length for filters; wrap lap length for feedback tails
function* lpCg(x, fc) { const a = Math.exp(-TAU * fc / SR), b = 1 - a, n = x.length; let y = 0; for (let i = Math.max(0, n - WARM); i < n; i++) y = b * x[i] + a * y; for (let i = 0; i < n; i++) { y = b * x[i] + a * y; x[i] = y; if ((i & 32767) === 32767) yield; } return x; }
const lpC = (x, fc) => run(lpCg(x, fc));
function* hpCg(x, fc) { const a = Math.exp(-TAU * fc / SR), n = x.length, s0 = Math.max(0, n - WARM); let y = 0, px = x[s0 > 0 ? s0 - 1 : n - 1]; for (let i = s0; i < n; i++) { y = a * (y + x[i] - px); px = x[i]; } for (let i = 0; i < n; i++) { const v = x[i]; y = a * (y + v - px); px = v; x[i] = y; if ((i & 32767) === 32767) yield; } return x; }
const hpC = (x, fc) => run(hpCg(x, fc));
// circular feedback delay + a small Schroeder reverb (two laps so the tail wraps into the loop head)
function* delayCg(x, sec, fb) { const n = x.length, d = Math.floor(sec * SR), y = new Float32Array(n); for (let p = 0; p < 2; p++) for (let i = 0, e = p ? Math.min(n, TAIL) : n; i < e; i++) { let j = i - d; if (j < 0) j += n; y[i] = x[i] + fb * y[j]; if ((i & 32767) === 32767) yield; } return y; }
function* combCg(x, d, fb, damp, out) { const n = x.length, y = new Float32Array(n); let f = 0; for (let p = 0; p < 2; p++) for (let i = 0, e = p ? Math.min(n, TAIL) : n; i < e; i++) { let j = i - d; if (j < 0) j += n; f = y[j] * (1 - damp) + f * damp; y[i] = x[i] + fb * f; if ((i & 32767) === 32767) yield; } for (let i = 0; i < n; i++) { out[i] += y[i]; if ((i & 32767) === 32767) yield; } }
const combC = (...a) => run(combCg(...a));
function* apCg(x, d, g) { const n = x.length, y = new Float32Array(n); for (let p = 0; p < 2; p++) for (let i = 0, e = p ? Math.min(n, TAIL) : n; i < e; i++) { let j = i - d; if (j < 0) j += n; y[i] = -g * x[i] + x[j] + g * y[j]; if ((i & 32767) === 32767) yield; } x.set(y); return x; }
function* verbG(send, size = 1, fb = 0.8) {
  const n = send.length, L = new Float32Array(n), R = new Float32Array(n);
  yield* combCg(send, Math.floor(1116 * size), fb, 0.4, L); yield* combCg(send, Math.floor(1277 * size), fb, 0.4, L);
  yield* combCg(send, Math.floor(1188 * size), fb, 0.4, R); yield* combCg(send, Math.floor(1356 * size), fb, 0.4, R);
  yield* apCg(L, 556, 0.5); yield* apCg(R, 441, 0.5);
  return [L, R];
}
// ---- instruments (mono note buffers)
function epNote(f, dur, vel) { // Rhodes-ish: 1:1 FM tine with a decaying bark, a faint bell partial, soft release
  const n = Math.floor((dur + 0.45) * SR), b = new Float32Array(n), w = TAU * f / SR, nd = Math.floor(dur * SR), A = Math.floor(0.004 * SR);
  const kd = Math.exp(-(0.75 + f / 600) / SR), ki = Math.exp(-7 / SR), kt = Math.exp(-30 / SR), kr = Math.exp(-10 / SR);
  let e = 1, ei = 1, et = 1, rel = 1;
  for (let i = 0; i < n; i++) {
    const ph = w * i, idx = 0.38 + 1.25 * vel * ei;
    const s = Math.sin(ph + idx * Math.sin(ph)) + 0.1 * et * Math.sin(ph * 7) + 0.12 * Math.sin(ph * 2) * ei;
    if (i > nd) rel *= kr;
    b[i] = s * e * rel * vel * (i < A ? i / A : 1);
    e *= kd; ei *= ki; et *= kt;
  }
  return b;
}
const memo = (fn) => { const c = new Map(); return (...a) => { const k = a.map((v) => (Array.isArray(v) ? v.map((x) => x.toFixed(2)).join(',') : typeof v === 'number' ? v.toFixed(3) : v)).join('|'); let b = c.get(k); if (!b) c.set(k, (b = fn(...a))); return b; }; };
const softclip = (x) => (x > 3 ? 1 : x < -3 ? -1 : (x * (27 + x * x)) / (27 + 9 * x * x));
const bassNote = memo(function (f, dur, vel) { // round sub: sine + a little 2nd/3rd harmonic so it reads on laptop speakers
  const n = Math.floor((dur + 0.07) * SR), b = new Float32Array(n), w = TAU * f / SR, nd = dur * SR, A = 0.012 * SR, R = 0.07 * SR, kd = Math.exp(-2.2 / SR);
  let e = 1;
  for (let i = 0; i < n; i++) { const ph = w * i, s = Math.sin(ph) + 0.42 * Math.sin(2 * ph) + 0.16 * Math.sin(3 * ph) + 0.05 * Math.sin(4 * ph); b[i] = softclip(s * 1.25) * vel * (0.7 + 0.3 * e) * Math.min(1, i / A) * (i > nd ? Math.max(0, 1 - (i - nd) / R) : 1); e *= kd; }
  return b;
});
const leadNote = memo(function (f, dur, vel) { // soft whistle: near-sine with delayed vibrato and a breathy onset
  const n = Math.floor((dur + 0.2) * SR), b = new Float32Array(n), nd = dur * SR, A = 0.035 * SR, R = 0.18 * SR, r = seeded(Math.floor(f * 100));
  let ph = 0, br = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, vib = Math.min(1, Math.max(0, (t - 0.18) / 0.3)) * 0.0045 * Math.sin(TAU * 5.1 * t);
    ph += TAU * f * (1 + vib) / SR; br = br * 0.9 + (r() * 2 - 1) * 0.1;
    const env = Math.min(1, i / A) * (i > nd ? Math.max(0, 1 - (i - nd) / R) : 1);
    b[i] = (Math.sin(ph) + 0.16 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph) + br * 0.25 * Math.exp(-t * 18)) * env * vel;
  }
  return b;
});
const padChord = memo(function (freqs, dur, vel, fc = 900) { // detuned saws, heavily filtered, slow swell
  const n = Math.floor((dur + 0.9) * SR), b = new Float32Array(n), nd = dur * SR, A = 0.7 * SR, R = 0.9 * SR, dets = [-0.006, 0, 0.0065];
  const ph = new Float64Array(freqs.length * 3), inc = new Float64Array(freqs.length * 3); freqs.forEach((f, a) => dets.forEach((d, c) => { inc[a * 3 + c] = f * (1 + d) / SR; ph[a * 3 + c] = (a * 0.37 + c * 0.21) % 1; }));
  for (let i = 0; i < n; i++) {
    let s = 0, k = 0;
    for (let q = 0; q < inc.length; q++) { let v = ph[q] + inc[q]; if (v >= 1) v -= 1; ph[q] = v; s += v; }
    b[i] = (s * 2 - inc.length) / inc.length * vel * Math.min(1, i / A) * (i > nd ? Math.max(0, 1 - (i - nd) / R) : 1);
  }
  lp(b, fc); return lp(b, fc * 1.4);
});
const drumCache = {};
function kickD() { return (drumCache.k ||= (() => { const b = buf(0.38); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (48 + 62 * Math.exp(-t * 26)) / SR; b[i] = Math.tanh(Math.sin(TAU * ph) * Math.exp(-t * 8.5) * 1.4) * Math.min(1, t / 0.002); } return lp(b, 900); })()); }
function snareD() { return (drumCache.s ||= (() => { const d = 0.26, b = buf(d), r = seeded(99); let y = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; y = y * 0.55 + (r() * 2 - 1) * 0.45; b[i] = y * Math.exp(-t * 17) * 0.75 + Math.sin(TAU * 182 * t) * Math.exp(-t * 26) * 0.55; } hp(b, 260); lp(b, 3800); const A = 0.001 * SR; for (let i = 0; i < A; i++) b[i] *= i / A; return b; })()); }
function rimD() { return (drumCache.r ||= (() => { const b = buf(0.08); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(TAU * 820 * t) * 0.6 + Math.sin(TAU * 1620 * t) * 0.3) * Math.exp(-t * 70); } return b; })()); }
function hatD(open = false) { return (drumCache['h' + open] ||= (() => { const b = buf(open ? 0.3 : 0.06), r = seeded(open ? 5 : 3); for (let i = 0; i < b.length; i++) b[i] = (r() * 2 - 1) * Math.exp(-i / SR * (open ? 11 : 75)); hp(b, 5200); lp(b, 8500); const A = 0.0015 * SR; for (let i = 0; i < A; i++) b[i] *= i / A; return b; })()); }
function shakerD() { return (drumCache.sh ||= (() => { const b = buf(0.09), r = seeded(17); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.09)); } hp(b, 3000); return lp(b, 7000); })()); }
// pan a mono stem into the stereo bus (equal power)
function* panAddG(L, R, src, pan, g = 1) { const a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * g, gr = Math.sin(a) * g; for (let i = 0; i < src.length; i++) { L[i] += src[i] * gl; R[i] += src[i] * gr; if ((i & 32767) === 32767) yield; } }
const panAdd = (...a) => run(panAddG(...a));
function* vinylG(n, seed, level = 1) {
  const r = seeded(seed), v = new Float32Array(n);
  for (let i = 0; i < n; i++) { v[i] = (r() * 2 - 1) * 0.0045 * level; if ((i & 32767) === 32767) yield; } // hiss
  for (let k = 0; k < n / SR * 6; k++) { const i = Math.floor(r() * n), a = (0.02 + r() * 0.06) * (r() < 0.5 ? -1 : 1) * level; v[i] += a; v[(i + 1) % n] -= a * 0.5; } // crackle
  yield* lpCg(v, 3200); return yield* hpCg(v, 180);
}
function* mixDownG(L, R, peak = 0.8) {
  // presence shelf (+~6 dB above ~1.8 kHz): keeps the keys and hats readable on laptop / phone speakers
  for (const x of [L, R]) { yield* hpCg(x, 34); const h = yield* hpCg(x.slice(), 1800); yield* hpCg(h, 1800); for (let i = 0; i < x.length; i++) { x[i] += h[i] * 1.1; if ((i & 32767) === 32767) yield; } yield* lpCg(x, 13000); }
  let m = 0; for (let i = 0; i < L.length; i++) { m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); if ((i & 32767) === 32767) yield; }
  const k = 1.15 / (m || 1); // gentle tape saturation, then level
  let m2 = 0; for (const x of [L, R]) for (let i = 0; i < x.length; i++) { x[i] = softclip(x[i] * k); m2 = Math.max(m2, Math.abs(x[i])); if ((i & 32767) === 32767) yield; }
  const g = peak / (m2 || 1); for (const x of [L, R]) for (let i = 0; i < x.length; i++) { x[i] *= g; if ((i & 32767) === 32767) yield; }
  return [L, R];
}
// ---- the tune: 8 bars of changes in D. [bass midi, keys voicing]; bar 8 splits sus → b9
const CH = [
  [40, [55, 59, 62, 66]], // Em9
  [33, [55, 59, 61, 66]], // A13
  [38, [54, 57, 61, 64]], // Dmaj9
  [35, [57, 62, 64, 66]], // Bm11
  [31, [54, 57, 59, 62]], // Gmaj9
  [30, [52, 57, 61, 64]], // F#m7
  [40, [55, 59, 62, 66]], // Em9
  [33, [55, 62, 64], [55, 58, 61, 64]], // A7sus4 → A7b9
];
// the whistled hook: [bar, beat, midi, beats]
const HOOK = [
  [0, 0.5, 71, 0.5], [0, 1, 74, 0.5], [0, 1.5, 76, 1.25], [0, 3, 74, 0.5], [0, 3.5, 71, 0.5],
  [1, 0, 73, 1.5], [1, 2, 69, 1.25],
  [2, 0.5, 73, 0.5], [2, 1, 74, 0.5], [2, 1.5, 78, 1], [2, 2.75, 76, 0.75], [2, 3.5, 74, 0.5],
  [3, 0, 74, 1.75], [3, 2, 71, 1.5],
  [4, 0.5, 74, 0.5], [4, 1, 78, 0.75], [4, 2, 78, 0.5], [4, 2.5, 76, 0.5], [4, 3, 74, 0.75],
  [5, 0, 73, 1.5], [5, 2, 69, 0.5], [5, 2.5, 73, 0.5], [5, 3, 76, 1],
  [6, 0, 74, 0.5], [6, 0.5, 71, 0.5], [6, 1, 67, 1], [6, 2.5, 69, 0.5], [6, 3, 71, 0.5], [6, 3.5, 73, 0.5],
  [7, 0, 76, 2.25],
];
const epCache = new Map();
function ep(m, dur, vel) { const vb = vel > 0.8 ? 0.95 : vel > 0.55 ? 0.7 : 0.45, k = m + ':' + dur.toFixed(2) + ':' + vb; let b = epCache.get(k); if (!b) epCache.set(k, (b = epNote(note(m), dur, vb))); return [b, vel / vb]; }
function* keysHit(dst, t, notes, dur, vel, r) { for (let k = 0; k < notes.length; k++) { const [b, g] = ep(notes[k], dur + (notes.length - k) * 0.01, vel * (0.85 + r() * 0.15)); addW(dst, t + k * 0.009 + r() * 0.004, b, 0.22 * g); yield; } }
// renders are generators: the game steps them a few ms at a time so the first tap / title screen never hitches
function* renderMusicG(kind) {
  const r = seeded(kind === 'full' ? 11 : kind === 'chill' ? 23 : 37);
  const bars = kind === 'full' ? 16 : 8, n = Math.round(bars * BAR * SR);
  // six stems, allocated a slice at a time (the full loop is ~7.7 MB per stem): pads ride the keys stem, bass + drums
  // share the centre stem, and the hats stem is reused as the reverb send once it's mixed
  const L = new Float32Array(n); yield; const R = new Float32Array(n); yield; const keys = new Float32Array(n); yield;
  const center = new Float32Array(n); yield; const hats = new Float32Array(n); yield; const lead = new Float32Array(n); yield;
  const bass = center, drums = center, pad = keys;
  if (kind === 'tense') {
    // hallway / Kyle's door: dark, sparse, a heartbeat pulse under a low pad — tension with a smirk
    const TC = [[40, [52, 55, 59, 66]], [36, [52, 55, 59, 66]], [33, [55, 60, 64, 71]], [35, [51, 57, 60, 63]]];
    for (let b = 0; b < bars; b++) {
      const [bn, vo] = TC[b % 4];
      addW(pad, at(b, 0), padChord(vo.map((m) => note(m - 12)), BAR - 0.2, 0.9, 650), 0.9);
      yield;
      addW(drums, at(b, 0), kickD(), 0.55); addW(drums, at(b, 0.75), kickD(), 0.32);
      for (let e = 0; e < 8; e++) addW(bass, at(b, e / 2), bassNote(note(bn), 0.16, e % 4 === 0 ? 0.75 : 0.45), 0.45);
      if (b % 2 === 1) yield* keysHit(keys, at(b, 2.5), vo.slice(1), 1.4, 0.45, r);
      if (b % 4 === 3) addW(lead, at(b, 3), leadNote(note(vo[3] + 12), 0.9, 0.35), 0.25);
      yield;
    }
    lpC(bass, 420);
  } else {
    for (let b = 0; b < bars; b++) {
      const c = CH[b % 8], [bn, vo] = c, B = kind === 'full' && b >= 8;
      // keys comp: alternate a pushed two-hit bar with a held bar; the last bar splits sus → b9
      if (kind === 'chill') {
        yield* keysHit(keys, at(b, 0), vo, c[2] ? BEAT * 1.9 : BAR * 0.92, 0.8, r);
        if (c[2]) yield* keysHit(keys, at(b, 2), c[2], BEAT * 1.9, 0.62, r);
        if (b % 2 === 1 && !c[2]) { const [eb, eg] = ep(vo[3] + 12, BEAT * 0.9, 0.4); addW(keys, at(b, 3), eb, 0.16 * eg); }
        yield;
        addW(pad, at(b, 0), padChord(vo.map((m) => note(m)), BAR, 0.55, 1100), 0.6);
        yield;
        addW(bass, at(b, 0), bassNote(note(bn), BAR * 0.85, 0.65), 0.38);
        for (let e = 0; e < 8; e++) addW(hats, at(b, e / 2 + 0.25), shakerD(), (e % 2 ? 0.07 : 0.11) * (0.8 + r() * 0.4));
      } else {
        if (b % 2 === 0) { yield* keysHit(keys, at(b, 0), vo, BEAT * 1.4, 0.95, r); yield* keysHit(keys, at(b, 1.75), vo, BEAT * 0.45, 0.55, r); yield* keysHit(keys, at(b, 2.5), c[2] || vo, BEAT * 1.3, 0.75, r); }
        else if (c[2]) { yield* keysHit(keys, at(b, 0), vo, BEAT * 1.8, 0.9, r); yield* keysHit(keys, at(b, 2), c[2], BEAT * 1.6, 0.85, r); yield* keysHit(keys, at(b, 3.75), c[2], BEAT * 0.3, 0.5, r); }
        else { yield* keysHit(keys, at(b, 0), vo, BEAT * 2.6, 0.9, r); yield* keysHit(keys, at(b, 3.5), vo, BEAT * 0.4, 0.5, r); }
        // section B: the keys answer with a soft broken-chord figure an octave up instead of the whistle
        yield;
        if (B && b < 12) for (let e = 0; e < 8; e++) if (e % 3 !== 2) { const [eb, eg] = ep(vo[e % 4] + 12, BEAT * 0.4, 0.42); addW(keys, at(b, e / 2 + 0.25), eb, 0.12 * eg); }
        yield;
        // bass: root, a pickup, the root again, a chromatic approach into the next bar
        const nx = CH[(b + 1) % 8][0];
        addW(bass, at(b, 0), bassNote(note(bn), BEAT * 1.3, 0.95), 0.45);
        addW(bass, at(b, 1.75), bassNote(note(bn + 12), BEAT * 0.2, 0.5), 0.45);
        addW(bass, at(b, 2.5), bassNote(note(bn + 7), BEAT * 0.4, 0.7), 0.45);
        addW(bass, at(b, 3), bassNote(note(bn), BEAT * 0.6, 0.8), 0.45);
        addW(bass, at(b, 3.75), bassNote(note(nx + (nx > bn ? -1 : 1)), BEAT * 0.22, 0.6), 0.45);
        yield;
        // drums: lazy boom-bap; bar 9 drops to rim + shaker (a breath), the last bar has a soft snare roll
        const drop = b === 8;
        for (const [s16, v] of [[0, 1], [7, 0.55], [10, 0.85]]) if (!drop || s16 === 0) addW(drums, at(b, s16 / 4), kickD(), v * 0.8);
        for (const s16 of [4, 12]) addW(drums, at(b, s16 / 4), drop ? rimD() : snareD(), drop ? 0.25 : 0.62);
        if (!drop && r() < 0.5) addW(drums, at(b, 3.75), snareD(), 0.12); // ghost
        if (b === bars - 1) for (const s16 of [13, 14, 15]) addW(drums, at(b, s16 / 4), snareD(), 0.14 + (s16 - 13) * 0.06);
        for (let s16 = 0; s16 < 16; s16++) {
          if (s16 % 2 === 0) addW(hats, at(b, s16 / 4), hatD(), (s16 % 4 === 0 ? 0.22 : 0.32) * (0.8 + r() * 0.35));
          else if (r() < 0.35) addW(hats, at(b, s16 / 4), hatD(), 0.12);
        }
        if (b % 2 === 1 && !drop) addW(hats, at(b, 3.5), hatD(true), 0.11);
      }
      yield;
    }
    if (kind === 'full') for (const [bb, beat, m, d] of HOOK) {
      // section A: the hook; section B (bars 13-16): the hook's second half again, resolving softer
      addW(lead, at(bb, beat), leadNote(note(m), d * BEAT, 0.5), 0.3);
      if (bb >= 4) addW(lead, at(bb + 8, beat), leadNote(note(bb === 7 ? 74 : m), d * BEAT, 0.42), 0.3);
      yield;
    }
    if (kind === 'chill') for (const [bb, beat, m, d] of HOOK.filter((h) => h[0] < 2)) addW(lead, at(bb + 2, beat), leadNote(note(m), d * BEAT, 0.3), 0.22);
  }
  // mix: keys with a slow stereo tremolo, bass + kick centred, hats off to the side, lead through a dotted-8th echo
  yield* lpCg(keys, 7500);
  const cyc = Math.round(n / SR * 4.2), trw = TAU * cyc / n; // integer cycles per loop → seamless tremolo
  for (let i = 0; i < n; i++) { const m = Math.sin(trw * i) * 0.18; L[i] += keys[i] * (0.92 + m); R[i] += keys[i] * (0.92 - m); if ((i & 32767) === 32767) yield; }
  yield* panAddG(L, R, center, 0, 1); yield* panAddG(L, R, hats, 0.35, 1); const send = hats;
  const echo = yield* delayCg(lead, BEAT * 0.75, 0.32); yield* panAddG(L, R, lead, 0.05, 1);
  for (let i = 0; i < n; i++) { L[i] += (echo[i] - lead[i]) * 0.3; R[i] += (echo[i] - lead[i]) * 0.42; send[i] = keys[i] * 0.35 + lead[i] * 0.5; if ((i & 32767) === 32767) yield; }
  yield; const [vl, vr] = yield* verbG(send, kind === 'tense' ? 1.25 : 1, kind === 'tense' ? 0.84 : 0.8);
  for (let i = 0; i < n; i++) { L[i] += vl[i] * 0.16; R[i] += vr[i] * 0.16; if ((i & 32767) === 32767) yield; }
  const vin = yield* vinylG(n, 5, kind === 'tense' ? 0.7 : 1); yield* panAddG(L, R, vin, 0, 1);
  yield; return yield* mixDownG(L, R, 0.8);
}
const renderMusic = (kind) => run(renderMusicG(kind));

// ---------------------------------------------------------------- the original riding track (150 BPM phonk: cowbell riff,
// 808 glides, trap hats). Brought back by request; the lo-fi set above stays for reference.
const oRnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 * 2 - 1; }; })();
const oNote = (n) => 440 * Math.pow(2, (n - 69) / 12);
const oBuf = (len) => new Float32Array(Math.floor(len * SR));
function oAdd(dst, t0, src, g = 1) { const i0 = Math.floor(t0 * SR); for (let i = 0; i < src.length && i0 + i < dst.length; i++) if (i0 + i >= 0) dst[i0 + i] += src[i] * g; }
function oLp(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function oHp(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
const oNoise = (d) => { const b = oBuf(d); for (let i = 0; i < b.length; i++) b[i] = oRnd(); return b; };
function oEnv(b, a, k) { for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.min(1, t / a) * Math.exp(-k * t); } return b; }
const oKick = () => { const d = 0.42, b = oBuf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (45 + 110 * Math.exp(-t * 30)) / SR; b[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7) * 1.8); } return b; };
const oClap = () => { const b = oHp(oLp(oNoise(0.25), 6000), 900); for (let i = 0; i < b.length; i++) { const t = i / SR; let e = Math.exp(-t * 25); for (const o of [0, 0.011, 0.022]) if (t >= o) e += Math.exp(-(t - o) * 160) * 0.6; b[i] *= e * 0.55; } return b; };
const oHat = (open = false) => oEnv(oHp(oNoise(open ? 0.22 : 0.045), 7000), 0.001, open ? 14 : 90).map((v) => v * 0.35);
function oCowbell(f) { const d = 0.3, b = oBuf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6 + Math.sign(Math.sin(2 * Math.PI * f * 1.48 * t)) * 0.4) * Math.exp(-t * 9) * 0.45; } return oLp(oHp(b, f * 0.8), f * 4); }
function o808(f, d, glide) { const b = oBuf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; const ff = glide ? f + (glide - f) * Math.min(1, Math.max(0, (t - d * 0.6) / (d * 0.3))) : f; ph += ff / SR; b[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 2.2) * Math.min(1, t / 0.005) * Math.min(1, Math.max(0, (d - t) / 0.03)) * 0.5; } return b; }
const OB = 60 / 150, OSTEP = OB / 4;
const ORIFF = [78, null, 78, 81, null, 78, null, 76, 78, null, 73, null, 76, null, 74, null, 78, null, 78, 81, null, 83, null, 81, 78, null, 76, null, 73, null, 71, null];
const OBASS = [[0, 42, 1.5], [1.5, 42, 0.5], [2, 45, 1], [3, 40, 1, 42], [4, 42, 1.5], [5.5, 42, 0.5], [6, 47, 1], [7, 45, 1, 40]];
function* classicG(kind) {
  const len = 32 * OSTEP * 2, L = oBuf(len), cache = new Map(), memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
  for (let k = 0; k < 64; k++) {
    const t = k * OSTEP, i16 = k % 32, b16 = i16 % 16;
    if (kind !== 'tense' && ORIFF[i16] != null) oAdd(L, t, memo('c' + ORIFF[i16], () => oCowbell(oNote(ORIFF[i16]))), kind === 'chill' ? 0.5 : 0.8);
    if (b16 % 2 === 0) oAdd(L, t, memo('h', () => oHat()), kind === 'tense' ? 0.35 : 0.55);
    if (kind === 'full' && [13, 14, 15].includes(b16) && Math.floor(k / 16) % 2) for (let r = 0; r < 3; r++) oAdd(L, t + r * OSTEP / 3, memo('h', () => oHat()), 0.4);
    if (kind === 'full' && b16 === 10) oAdd(L, t, memo('ho', () => oHat(true)), 0.4);
    if (kind === 'full') { if ([0, 7, 10].includes(b16) || (b16 === 3 && Math.floor(k / 16) % 2)) oAdd(L, t, memo('k', oKick), 0.95); if (b16 === 4 || b16 === 12) oAdd(L, t, memo('cl', oClap), 0.8); }
    if (kind === 'chill' && b16 === 0) oAdd(L, t, memo('k', oKick), 0.7);
    const bt = (i16 * OSTEP) / OB;
    for (const [at0, n, dur, gl] of OBASS) if (Math.abs(bt - at0) < 1e-6 && kind !== 'chill') oAdd(L, t, o808(oNote(n), dur * OB * 0.95, gl ? oNote(gl) : null), kind === 'tense' ? 0.5 : 0.85);
    if (k % 4 === 3) yield;
  }
  for (let i = 0; i < L.length; i++) L[i] = Math.tanh(L[i] * 1.1) * 0.8;
  yield; return [L, L.slice()];
}
const MUSIC_STYLE = 'classic'; // 'classic' (phonk) | 'lofi'
const musicGen = (kind) => (MUSIC_STYLE === 'classic' ? classicG(kind) : renderMusicG(kind));

// ---------------------------------------------------------------- ambience: the city behind the music
// Continuous beds are rendered long and their overhang crossfaded into the head (seamless); events (cars passing,
// voices, birds) are added circularly. Distant horns / sirens / pigeons are separate one-shots scheduled at random
// at runtime so the bed never sounds like a loop.
function loopify(x, n) { const F = x.length - n, o = x.slice(0, n); for (let i = 0; i < F; i++) { const a = (i / F) * Math.PI / 2; o[i] = x[i] * Math.sin(a) + x[n + i] * Math.cos(a); } return o; }
function* passBy(r, dur, fc, gain) { // a car going by: filtered tyre noise that brightens then darkens, with a low engine hum
  const n = Math.floor(dur * SR), l = new Float32Array(n), rr = new Float32Array(n), dir = r() < 0.5 ? -1 : 1, f0 = 55 + r() * 40;
  let y1 = 0, y2 = 0, br = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, g = Math.exp(-Math.pow((u - 0.5) / 0.2, 2)), fcx = 250 + fc * g, a = Math.min(0.95, TAU * fcx / SR);
    const w = r() * 2 - 1; y1 += a * (w - y1); y2 += a * (y1 - y2); br = br * 0.985 + w * 0.015;
    ph += TAU * f0 * (1 + 0.04 * (0.5 - u) * dir) / SR;
    const s = (y2 * 1.4 + br * 2 + Math.sin(ph) * 0.12 * g) * Math.pow(g, 1.4) * gain;
    const p = Math.max(-1, Math.min(1, dir * (u * 2 - 1) * 0.9)), an = (p + 1) * Math.PI / 4;
    l[i] = s * Math.cos(an); rr[i] = s * Math.sin(an);
    if ((i & 16383) === 16383) yield;
  }
  return [l, rr];
}
function* voicePhrase(r, sec, f0, lpf) { // muffled speech-like babble: a jittery glottal buzz through a mouth-ish band, chopped into syllables
  const n = Math.floor(sec * SR), b = new Float32Array(n), rate = 3.6 + r() * 2.2, phs = r() * TAU;
  let ph = 0, pitch = f0, y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; if (i % 2205 === 0) pitch = f0 * (0.85 + r() * 0.35);
    ph = (ph + pitch / SR) % 1; const src = (ph * 2 - 1) * 0.6 + (r() * 2 - 1) * 0.4;
    y += 0.25 * (src - y);
    const syl = Math.pow(Math.max(0, Math.sin(TAU * rate * t + phs)), 1.6), fade = Math.min(1, t / 0.12, (sec - t) / 0.2);
    b[i] = y * syl * fade;
    if ((i & 16383) === 16383) yield;
  }
  hp(b, 260); return lp(lp(b, lpf), lpf * 1.3);
}
function chirp(r) { const d = 0.06 + r() * 0.08, n = Math.floor(d * SR), b = new Float32Array(n), f0 = 2600 + r() * 1600, f1 = f0 + (r() - 0.3) * 1800; let ph = 0; for (let i = 0; i < n; i++) { const u = i / n; ph += TAU * (f0 + (f1 - f0) * u) / SR; b[i] = Math.sin(ph) * Math.sin(Math.PI * u); } return b; }
function coo(r) { const d = 1.4, n = Math.floor(d * SR), b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, seg = t < 0.35 ? t / 0.35 : t < 0.55 ? 0 : (t - 0.55) / 0.85, on = (t < 0.35 || t > 0.55) ? Math.sin(Math.PI * Math.min(1, seg)) : 0; ph += TAU * (360 + 40 * Math.sin(TAU * 7 * t) - 30 * seg) / SR; b[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * on; } return lp(b, 900); }
function addStereoW(L, R, t0, src, pan, g) { const a = (pan + 1) * Math.PI / 4; addW(L, t0, src, Math.cos(a) * g); addW(R, t0, src, Math.sin(a) * g); }
function* hum(n, f, harm, g) { const b = new Float32Array(n), c = Math.round(f * n / SR), w = TAU * c / n; for (let i = 0; i < n; i++) { let v = 0; for (let h = 1; h <= harm; h++) v += Math.sin(w * i * h) / (h * h); b[i] = v * g; if ((i & 32767) === 32767) yield; } return b; }
// one continuous bed layer, rendered in stages so no single step blocks a frame
function* layerG(sec, r, { src = 'brown', leak = 0.995, lpf = 0, hpf = 0, cyc = 0, depth = 0, ph = 0 } = {}) {
  const n = Math.round(sec * SR), F = Math.round(SR), m = n + F, x = new Float32Array(m);
  if (src === 'brown') { let y = 0; for (let i = 0; i < m; i++) { y = (y + (r() * 2 - 1) * 0.05) * leak; x[i] = y * 2.2; if ((i & 32767) === 32767) yield; } }
  else for (let i = 0; i < m; i++) { x[i] = r() * 2 - 1; if ((i & 32767) === 32767) yield; }
  let o = loopify(x, n); yield;
  if (lpf) yield* lpCg(o, lpf);
  if (hpf) yield* hpCg(o, hpf);
  if (depth) { const w = TAU * cyc / n; for (let i = 0; i < n; i++) { o[i] *= 1 - depth + depth * (0.5 + 0.5 * Math.sin(w * i + ph)); if ((i & 32767) === 32767) yield; } }
  return o;
}
function* normAmbG(L, R, rms) {
  let s = 0; for (let i = 0; i < L.length; i++) { s += L[i] * L[i] + R[i] * R[i]; if ((i & 32767) === 32767) yield; }
  const k = rms / Math.sqrt(s / (2 * L.length) || 1);
  for (let i = 0; i < L.length; i++) { L[i] = softclip(L[i] * k * 1.2) / 1.2; R[i] = softclip(R[i] * k * 1.2) / 1.2; if ((i & 32767) === 32767) yield; }
  return [L, R];
}
function* mixG(n, f) { for (let i = 0; i < n; i++) { f(i); if ((i & 32767) === 32767) yield; } }
function* renderAmbG(kind) {
  const r = seeded({ city: 101, cityTraffic: 202, lobby: 303, stair: 404, hall: 505 }[kind] || 9);
  if (kind === 'city') { // a weekday downtown block: far traffic wash, people talking, pigeons, wind between the towers
    const sec = 24;
    const L = yield* layerG(sec, r, { lpf: 260, hpf: 55, cyc: 3, depth: 0.35 }), R = yield* layerG(sec, r, { lpf: 260, hpf: 55, cyc: 4, depth: 0.35, ph: 1.3 });
    const wind = yield* layerG(sec, r, { leak: 0.998, lpf: 520, hpf: 70, cyc: 2, depth: 0.6, ph: 0.4 }), air = yield* layerG(sec, r, { src: 'white', lpf: 2200, hpf: 450, cyc: 5, depth: 0.5 });
    const n = L.length;
    yield* mixG(n, (i) => { L[i] = L[i] * 0.8 + wind[i] * 0.4 + air[i] * 0.1; R[i] = R[i] * 0.8 + wind[(i + 9000) % n] * 0.4 + air[(i + 4410) % n] * 0.1; });
    for (let k = 0; k < 5; k++, yield) { const [pl, pr] = yield* passBy(r, 4 + r() * 3, 700 + r() * 700, 0.32), t = r() * sec; addW(L, t, pl); addW(R, t, pr); }
    for (let k = 0; k < 9; k++, yield) { const t = r() * sec, v = yield* voicePhrase(r, 1.2 + r() * 2.5, 110 + r() * 120, 900 + r() * 400); addStereoW(L, R, t, v, r() * 1.6 - 0.8, 0.2 + r() * 0.14); }
    for (let k = 0; k < 7; k++) { const t = r() * sec, p = r() * 1.6 - 0.8; for (let j = 0; j < 2 + Math.floor(r() * 3); j++) addStereoW(L, R, t + j * (0.12 + r() * 0.1), chirp(r), p, 0.03); }
    for (let k = 0; k < 2; k++, yield) addStereoW(L, R, r() * sec, coo(r), r() * 1.4 - 0.7, 0.05);
    return yield* normAmbG(L, R, 0.09);
  }
  if (kind === 'cityTraffic') { // the street you're riding: closer cars, tyre hiss — rides up with your speed
    const sec = 20;
    const L = yield* layerG(sec, r, { lpf: 320, hpf: 50, cyc: 5, depth: 0.4 }), R = yield* layerG(sec, r, { lpf: 320, hpf: 50, cyc: 6, depth: 0.4, ph: 2 });
    const hiss = yield* layerG(sec, r, { src: 'white', lpf: 2600, hpf: 700, cyc: 7, depth: 0.6 }), n = L.length;
    yield* mixG(n, (i) => { L[i] = L[i] * 0.8 + hiss[i] * 0.08; R[i] = R[i] * 0.8 + hiss[(i + 22050) % n] * 0.08; });
    for (let k = 0; k < 10; k++, yield) { const [pl, pr] = yield* passBy(r, 2.2 + r() * 2.5, 1400 + r() * 1200, 0.35), t = r() * sec; addW(L, t, pl); addW(R, t, pr); }
    return yield* normAmbG(L, R, 0.11);
  }
  if (kind === 'lobby') { // marble lobby: air handling, the street muffled through glass
    const sec = 14, L = yield* layerG(sec, r, { lpf: 260, hpf: 45 }), R = yield* layerG(sec, r, { lpf: 260, hpf: 45 }), h = yield* hum(L.length, 120, 3, 0.025);
    yield* mixG(L.length, (i) => { L[i] += h[i]; R[i] += h[i]; });
    for (let k = 0; k < 4; k++, yield) { const [pl, pr] = yield* passBy(r, 4 + r() * 2, 300, 0.18), t = r() * sec; addW(L, t, lp(pl, 380)); addW(R, t, lp(pr, 380)); }
    return yield* normAmbG(L, R, 0.05);
  }
  if (kind === 'stair') { // concrete stairwell: hollow room tone ringing in the shaft
    const sec = 14, src = yield* layerG(sec, r, { lpf: 380, hpf: 45 }), n = src.length, L = new Float32Array(n), R = new Float32Array(n);
    yield* combCg(src, Math.floor(0.0231 * SR), 0.72, 0.3, L); yield* combCg(src, Math.floor(0.0347 * SR), 0.7, 0.3, L);
    yield* combCg(src, Math.floor(0.0291 * SR), 0.72, 0.3, R); yield* combCg(src, Math.floor(0.0413 * SR), 0.7, 0.3, R);
    const h = yield* hum(n, 60, 4, 0.01); yield* mixG(n, (i) => { L[i] += h[i]; R[i] += h[i]; });
    yield* lpCg(L, 900); yield* lpCg(R, 900);
    return yield* normAmbG(L, R, 0.045);
  }
  if (kind === 'hall') { // carpeted hallway: HVAC, somebody's TV behind a door, a neighbour's music through the wall
    const sec = 16, L = yield* layerG(sec, r, { lpf: 240, hpf: 45 }), R = yield* layerG(sec, r, { lpf: 240, hpf: 45 }), h = yield* hum(L.length, 120, 2, 0.015);
    yield* mixG(L.length, (i) => { L[i] = L[i] * 0.8 + h[i]; R[i] = R[i] * 0.8 + h[i]; });
    for (let k = 0; k < 6; k++, yield) { const t = r() * sec, v = yield* voicePhrase(r, 1 + r() * 2, 120 + r() * 90, 520); addStereoW(L, R, t, v, -0.6, 0.1); }
    const beat = 60 / 105, thump = lp(kickD().slice(), 150); for (let t = 0; t < sec - 0.01; t += beat) addStereoW(L, R, t, thump, 0.5, 0.06);
    return yield* normAmbG(L, R, 0.04);
  }
  return null;
}
const renderAmb = (kind) => run(renderAmbG(kind));
// runtime one-shots: things that happen now and then far away
function renderShot(name) {
  const r = seeded(name.length * 77 + name.charCodeAt(0));
  if (name === 'hornFar') { const d = 0.5, b = buf(d), f = 330 + r() * 80; for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.tanh((((f * t) % 1) + ((f * 1.19 * t) % 1) - 1) * 1.5) * Math.min(1, t / 0.03, (d - t) / 0.08); } return lp(lp(b, 1100), 1400); }
  if (name === 'hornFar2') { const b = buf(0.75); for (const [a, d] of [[0, 0.16], [0.24, 0.42]]) { const s = buf(d), f = 395; for (let i = 0; i < s.length; i++) { const t = i / SR; s[i] = Math.tanh((((f * t) % 1) + ((f * 1.26 * t) % 1) - 1) * 1.4) * Math.min(1, t / 0.02, (d - t) / 0.05); } add(b, a, s); } return lp(lp(b, 1000), 1300); }
  if (name === 'sirenFar') { const d = 8, b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += TAU * (720 + 230 * Math.sin(TAU * 0.33 * t)) / SR; b[i] = (Math.sin(ph) + 0.25 * Math.sin(3 * ph)) * Math.pow(Math.sin(Math.PI * t / d), 2); } return lp(lp(b, 1500), 1800); }
  if (name === 'flap') { const b = buf(0.7); for (let k = 0; k < 7; k++) { const s = buf(0.05); for (let i = 0; i < s.length; i++) s[i] = (r() * 2 - 1) * Math.sin(Math.PI * i / s.length); add(b, k * 0.07 + r() * 0.02, lp(s, 2500), 1 - k * 0.1); } return b; }
  if (name === 'doorFar') { const b = buf(1.4); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += TAU * (70 + 40 * Math.exp(-t * 20)) / SR; b[i] = Math.sin(ph) * Math.exp(-t * 6) + Math.sin(TAU * 410 * t) * Math.exp(-t * 3) * 0.12; } return lp(b, 700); }
  if (name === 'stepsFar') { const b = buf(2.2); for (let k = 0; k < 6; k++) { const s = buf(0.08); for (let i = 0; i < s.length; i++) s[i] = (r() * 2 - 1) * Math.exp(-i / SR * 50); add(b, k * 0.33, lp(s, 700)); } return b; }
  if (name === 'elevFar') { const b = buf(0.6); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.sin(TAU * 1046 * t) * Math.exp(-t * 6) * 0.5; } return lp(b, 1500); }
  return buf(0.1);
}
const SHOTS = {
  city: { every: [5, 13], pick: [['hornFar', 4, 0.07], ['hornFar2', 3, 0.06], ['flap', 2, 0.05], ['sirenFar', 1, 0.045]] },
  lobby: { every: [9, 20], pick: [['hornFar', 1, 0.015], ['stepsFar', 2, 0.04]] },
  stair: { every: [7, 16], pick: [['doorFar', 2, 0.09], ['stepsFar', 3, 0.05]] },
  hall: { every: [10, 22], pick: [['doorFar', 1, 0.05], ['elevFar', 1, 0.012]] },
};
const AMB_LAYERS = { city: ['city', 'cityTraffic'], lobby: ['lobby'], stair: ['stair'], hall: ['hall'] };

// QA hook: pure renders (no AudioContext needed)
export const __renderForTest = { music: renderMusic, amb: renderAmb, shot: renderShot, musicG: renderMusicG, ambG: renderAmbG, SR };

// ---------------------------------------------------------------- SFX
const SFX = {
  ding() { const d = 0.6, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1318.5 * t) + 0.3 * Math.sin(4 * Math.PI * 1318.5 * t)) * Math.exp(-t * 9) + (t > 0.09 ? (Math.sin(2 * Math.PI * 1760 * (t - 0.09)) + 0.3 * Math.sin(4 * Math.PI * 1760 * (t - 0.09))) * Math.exp(-(t - 0.09) * 7) : 0); b[i] *= 0.3; } return b; },
  pop() { const d = 0.08, b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (350 + 900 * t / d) / SR; b[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 40) * 0.5; } return b; },
  whoosh() { const d = 0.45, b = hp(lp(noise(d), 5000), 400); for (let i = 0; i < b.length; i++) b[i] *= Math.pow(Math.sin(Math.PI * i / b.length), 2) * 0.4; return b; },
  boom() { const d = 1.1, b = buf(d); let ph = 0; const n = lp(noise(d), 1500); for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (32 + 60 * Math.exp(-t * 8)) / SR; b[i] = Math.tanh((Math.sin(2 * Math.PI * ph) * Math.exp(-t * 3) + n[i] * Math.exp(-t * 10) * 0.5) * 1.5) * 0.75; } return b; },
  crash() { const d = 0.6, n = hp(lp(noise(d), 7000), 300), b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (40 + 80 * Math.exp(-t * 12)) / SR; b[i] = n[i] * Math.exp(-t * 12) * 0.8 + (Math.sin(2 * Math.PI * 1870 * t) * Math.exp(-t * 9) + Math.sin(2 * Math.PI * 2630 * t) * Math.exp(-t * 12)) * 0.2 + Math.sin(2 * Math.PI * ph) * Math.exp(-t * 6) * 0.8; } return b; },
  skid() { const d = 0.4, b = hp(lp(noise(d), 4500), 1800); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= (1 + 0.5 * Math.sin(2 * Math.PI * 38 * t)) * Math.min(1, t / 0.02) * Math.exp(-t * 4) * 0.35; } return b; },
  horn() { const d = 0.6, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.tanh((((311 * t) % 1) * 2 - 1 + ((370 * t) % 1) * 2 - 1) * 1.2) * Math.min(1, t / 0.02) * Math.min(1, (d - t) / 0.06) * 0.3; } return lp(b, 2500); },
  trainhorn() { const d = 1.2, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.tanh((((311 * t) % 1) + ((392 * t) % 1) + ((466 * t) % 1) - 1.5) * 1.4) * Math.min(1, t / 0.05) * Math.min(1, (d - t) / 0.2) * 0.32; } return lp(b, 2200); },
  bell() { const d = 0.7, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; const s = (tt) => tt < 0 ? 0 : (Math.sin(2 * Math.PI * 2093 * tt) + 0.6 * Math.sin(2 * Math.PI * 2860 * tt)) * Math.exp(-tt * 6); b[i] = (s(t) + s(t - 0.16)) * 0.15; } return b; },
  ice() { const d = 0.14, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 2400 * t) + Math.sin(2 * Math.PI * 3600 * t) * 0.5) * Math.exp(-t * 30) * 0.22; } return b; },
  scratch() { const d = 0.32, b = buf(d); const n = hp(noise(d), 1500); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (300 + 1700 * Math.abs(Math.sin(Math.PI * t / d * 1.5))) / SR; b[i] = ((ph % 1) * 0.8 - 0.4 + n[i] * 0.4) * Math.min(1, t / 0.01) * Math.exp(-t * 5) * 0.5; } return b; },
  jingle() { const b = buf(1.1); [72, 76, 79, 84, 79, 84].forEach((n, k) => { const s = buf(0.22); for (let i = 0; i < s.length; i++) { const t = i / SR; s[i] = (Math.sin(2 * Math.PI * note(n) * t) + 0.4 * Math.sin(4 * Math.PI * note(n) * t)) * Math.exp(-t * 10) * 0.3; } add(b, k * 0.16, s); }); return b; },
  trombone() { const b = buf(2.3); [[0, 0.32, 233.1], [0.36, 0.32, 220], [0.72, 0.32, 207.7], [1.08, 1.1, 196]].forEach(([a, d, f]) => { const s = buf(d); let ph = 0; for (let i = 0; i < s.length; i++) { const t = i / SR; const vib = d > 0.5 ? 1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, Math.max(0, (t - 0.2) / 0.3)) : 1; ph += f * vib / SR; s[i] = (((ph % 1) * 2 - 1) * 0.6 + (((ph * 2) % 1) * 2 - 1) * 0.2) * Math.min(1, t / 0.06) * Math.min(1, (d - t) / 0.08); } lp(s, 1400); add(b, a, s); }); for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * 1.4) * 0.5; return b; },
  step() { const d = 0.08, b = lp(noise(d), 900); for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-i / SR * 60) * 0.7; return b; },
  creak() { const d = 0.5, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; const f = 180 + 60 * Math.sin(2 * Math.PI * 3 * t); b[i] = (((f * t) % 1) * 2 - 1) * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 23 * t), 4) * Math.sin(Math.PI * t / d) * 0.25; } return lp(hp(b, 300), 2500); },
  slurp() { const d = 0.5, b = hp(lp(noise(d), 2500), 500); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 16 * t), 2) * Math.sin(Math.PI * t / d) * 0.5; } return b; },
  splash() { const d = 0.35, b = lp(hp(noise(d), 600), 3000); for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-i / SR * 9) * 0.45; return b; },
  thunder() { const d = 2.2, b = buf(d); let y = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; y = y * 0.995 + rnd() * 0.05; b[i] = y * 6 * Math.min(1, t / 0.05) * Math.exp(-t * 1.5); } return lp(b, 400); },
  knock() { const d = 0.12, b = buf(d); const n = lp(noise(d), 1400); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (190 - 60 * t / d) / SR; b[i] = (Math.sin(2 * Math.PI * ph) * 0.8 + n[i] * 0.5) * Math.exp(-t * 45) * 0.9; } return b; },
  rattle() { const d = 0.45, b = buf(d); const n = hp(lp(noise(d), 5000), 900); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = n[i] * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 19 * t), 6) * Math.exp(-t * 4) * 0.7; } return b; },
  buzz() { const d = 0.9, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.tanh(((120 * t) % 1 - 0.5) * 3 + Math.sin(2 * Math.PI * 240 * t) * 0.4) * Math.min(1, t / 0.02) * Math.min(1, (d - t) / 0.05) * 0.22; } return lp(b, 3000); },
  // a bark: rough pulse source with a fast pitch drop through two formant bands, plus breath noise
  bark() { const d = 0.26, b = buf(d), n = noise(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; const f = 330 + 260 * Math.exp(-t * 18) - 60 * t; ph += f / SR; const saw = (ph % 1) * 2 - 1, pul = (ph % 1) < 0.3 ? 1 : -0.4; b[i] = (saw * 0.55 + pul * 0.45 + n[i] * 0.35) * Math.min(1, t / 0.006) * Math.exp(-t * 13) * (1 + 0.3 * Math.sin(2 * Math.PI * 70 * t)); }
    const lo = lp(hp(b.slice(), 380), 1100), hi = lp(hp(b.slice(), 1500), 2800); for (let i = 0; i < b.length; i++) b[i] = Math.tanh((lo[i] * 1.6 + hi[i] * 0.9) * 1.8) * 0.55; return b; },
  growl() { const d = 0.9, b = buf(d), n = lp(noise(d), 900); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (92 + 10 * Math.sin(2 * Math.PI * 3 * t)) / SR; const g = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 28 * t + Math.sin(t * 40)), 2); b[i] = (((ph % 1) * 2 - 1) * 0.6 + n[i] * 0.9) * g * Math.min(1, t / 0.08) * Math.min(1, (d - t) / 0.2) * 0.5; } return lp(hp(b, 70), 1400); },
  snap() { const d = 0.16, b = buf(d), n = hp(noise(d), 1200); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (n[i] * Math.exp(-t * 90) + Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 60) * 0.7 + Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 35) * 0.5) * 0.8; } return b; },
  bwomp() { const d = 1.0, b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += 220 * Math.exp(-t * 0.9) / SR; b[i] = Math.tanh(2 * Math.sin(2 * Math.PI * ph)) * Math.exp(-t * 2.2) * 0.3; } return b; },
};

function toBuffer(f32) { const b = ctx.createBuffer(1, f32.length, SR); b.copyToChannel(f32, 0); return b; }
function toBuffer2([L, R]) { const b = ctx.createBuffer(2, L.length, SR); b.copyToChannel(L, 0); b.copyToChannel(R, 1); return b; }
const MUSIC_LVL = 0.55, AMB_LVL = 0.34;
let ambGain = null, amb = null, ambTimer = 0;
// background render queue: steps one generator ~8 ms at a time between frames; urgent keys jump the queue
const queue = []; let pumping = false;
function enqueue(key, make, urgent = false) {
  if (buffers[key] || queue.some((q) => q.key === key)) { if (urgent) { const i = queue.findIndex((q) => q.key === key); if (i > 0) queue.unshift(...queue.splice(i, 1)); } return; }
  const job = { key, make, gen: null }; urgent ? queue.unshift(job) : queue.push(job);
  if (!pumping) { pumping = true; setTimeout(pump, 0); }
}
function pump() {
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < 8) {
    const j = queue[0], ts = performance.now(); j.steps = (j.steps || 0) + 1; let done = false;
    if (!j.out) { j.gen ||= j.make(); const r = j.gen.next(); if (r.done) { j.out = r.value; j.at = 0; } }
    else { // copy into the AudioBuffer a slice at a time (one 15 MB copy would stall a frame)
      const [L, R] = j.out, n = L.length; j.buf ||= ctx.createBuffer(2, n, SR);
      const e = Math.min(n, j.at + 262144); j.buf.copyToChannel(L.subarray(j.at, e), 0, j.at); j.buf.copyToChannel(R.subarray(j.at, e), 1, j.at); j.at = e;
      if (e === n) { queue.shift(); buffers[j.key] = j.buf; done = true; Audio._ready(j.key); }
    }
    const dt = performance.now() - ts; if (dt > 30) Audio._slow.push([j.key, j.steps, done, Math.round(dt)]); // QA: renders that blocked a frame
  }
  if (queue.length) setTimeout(pump, 4); else pumping = false;
}
export const Audio = {
  unlocked: false,
  _lvl: 0.4,
  _slow: [],
  _rendered: () => Object.keys(buffers).filter((k) => !k.startsWith('s_')), // QA
  unlock() {
    if (this.unlocked) { ctx?.resume?.(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR }); } catch { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = MUSIC_LVL; musicGain.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(comp);
    ambGain = ctx.createGain(); ambGain.gain.value = AMB_LVL; ambGain.connect(master); // ambience skips the compressor so SFX never pump it
    this.unlocked = true;
    // render lazily, one piece per idle slice so taps stay responsive: menu music first, then the ride, then the rest
    const w = this._want; if (w) enqueue(w, () => musicGen(w)); // whatever is wanted right now goes first
    for (const k of ['chill', 'full']) enqueue(k, () => musicGen(k));
    for (const k of ['city', 'cityTraffic']) enqueue('a_' + k, () => renderAmbG(k));
    enqueue('tense', () => musicGen('tense'));
    for (const k of ['lobby', 'stair', 'hall']) enqueue('a_' + k, () => renderAmbG(k));
  },
  _ready(key) {
    if (this._want && key === this._want && !current) this.music(this._want);
    if (this._amb && amb?.kind !== this._amb[0] && AMB_LAYERS[this._amb[0]]?.every((k) => buffers['a_' + k])) this.ambience(...this._amb);
  },
  music(kind) {
    this._want = kind;
    if (!ctx) return;
    if (current?.kind === kind) return;
    const now = ctx.currentTime;
    if (current) { current.g.gain.cancelScheduledValues(now); current.g.gain.setTargetAtTime(0, now, 0.3); const c = current; setTimeout(() => { try { c.src.stop(); } catch {} }, 2200); current = null; }
    if (!kind) return;
    if (!buffers[kind]) { enqueue(kind, () => musicGen(kind), true); return; }
    const src = ctx.createBufferSource(); src.buffer = buffers[kind]; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, now, 0.25);
    src.connect(g); g.connect(musicGain); src.start();
    current = { kind, src, g };
  },
  duck(amount = 0.25, t = 0.6) { if (!ctx) return; const g = musicGain.gain, now = ctx.currentTime; g.cancelScheduledValues(now); g.setTargetAtTime(MUSIC_LVL * amount, now, 0.03); g.setTargetAtTime(MUSIC_LVL, now + t, 0.2); },
  rate(r) { if (current) current.src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.1); },
  sfx(name, gain = 1, rate = 1) {
    if (!ctx || !SFX[name]) return;
    if (!buffers['s_' + name]) buffers['s_' + name] = toBuffer(SFX[name]());
    const s = ctx.createBufferSource(); s.buffer = buffers['s_' + name]; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(sfxGain); s.start();
  },
  // background ambience: 'city' | 'lobby' | 'stair' | 'hall' | null. Crossfades; level scales this bed (0..1+).
  ambience(kind, level = 1) {
    this._amb = [kind, level];
    if (!ctx) return;
    const now = ctx.currentTime;
    if (amb?.kind === kind) { amb.g.gain.setTargetAtTime(level, now, 0.4); return; }
    if (amb) { const a = amb; a.g.gain.cancelScheduledValues(now); a.g.gain.setTargetAtTime(0, now, 0.6); setTimeout(() => { for (const s of a.srcs) try { s.stop(); } catch {} a.g.disconnect(); }, 3500); amb = null; }
    clearTimeout(ambTimer);
    if (!kind || !AMB_LAYERS[kind]) return;
    if (!AMB_LAYERS[kind].every((k) => buffers['a_' + k])) { // not rendered yet: render now (off this call) and start when ready
      for (const k of [...AMB_LAYERS[kind]].reverse()) enqueue('a_' + k, () => renderAmbG(k), true);
      return;
    }
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(level, now, 0.5); g.connect(ambGain);
    const srcs = [], A = { kind, g, srcs, traffic: null };
    for (const k of AMB_LAYERS[kind]) {
      const s = ctx.createBufferSource(); s.buffer = buffers['a_' + k]; s.loop = true;
      if (k === 'cityTraffic') { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.5; const tg = ctx.createGain(); s.connect(f); f.connect(tg); tg.connect(g); A.traffic = { f, g: tg }; }
      else s.connect(g);
      s.start(0, Math.random() * s.buffer.duration); srcs.push(s); // random start: never the same entrance twice
    }
    amb = A; this.ambienceLevel(this._lvl, true);
    this._shots();
  },
  // 0..1: how much close traffic / wind rush to mix in (drive it from riding speed)
  ambienceLevel(x, now = false) {
    this._lvl = Math.min(1, Math.max(0, x));
    const t = amb?.traffic; if (!t) return;
    const k = this._lvl, tc = now ? 0.01 : 0.35, at = ctx.currentTime;
    t.g.gain.setTargetAtTime(0.15 + 0.6 * k, at, tc); t.f.frequency.setTargetAtTime(500 + 3800 * k * k, at, tc);
  },
  _shots() {
    clearTimeout(ambTimer);
    const kind = amb?.kind, spec = SHOTS[kind]; if (!spec) return;
    ambTimer = setTimeout(() => {
      if (!ctx || amb?.kind !== kind) return;
      const tot = spec.pick.reduce((s, p) => s + p[1], 0); let u = Math.random() * tot, p = spec.pick[0];
      for (const q of spec.pick) { if ((u -= q[1]) < 0) { p = q; break; } }
      const key = 'o_' + p[0]; if (!buffers[key]) buffers[key] = toBuffer(renderShot(p[0]));
      const s = ctx.createBufferSource(); s.buffer = buffers[key]; s.playbackRate.value = 0.9 + Math.random() * 0.2;
      const g = ctx.createGain(); g.gain.value = p[2] * (0.6 + Math.random() * 0.6);
      let node = s; if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = Math.random() * 1.6 - 0.8; s.connect(pn); node = pn; }
      node.connect(g); g.connect(amb.g); s.start();
      this._shots();
    }, (spec.every[0] + Math.random() * (spec.every[1] - spec.every[0])) * 1000);
  },
  setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); },
  get muted() { return muted; },
};
