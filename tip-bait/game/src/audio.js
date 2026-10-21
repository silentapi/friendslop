// Procedural audio: a 150 BPM phonk loop (cowbell riff, 808 glides, trap hats) rendered once into buffers,
// plus synthesized SFX. Nothing is downloaded. Starts on the first tap (browser autoplay rules).
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

const kick = () => { const d = 0.42, b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (45 + 110 * Math.exp(-t * 30)) / SR; b[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7) * 1.8); } return b; };
const clap = () => { const b = hp(lp(noise(0.25), 6000), 900); for (let i = 0; i < b.length; i++) { const t = i / SR; let e = Math.exp(-t * 25); for (const o of [0, 0.011, 0.022]) if (t >= o) e += Math.exp(-(t - o) * 160) * 0.6; b[i] *= e * 0.55; } return b; };
const hat = (open = false) => env(hp(noise(open ? 0.22 : 0.045), 7000), 0.001, open ? 14 : 90).map((v) => v * 0.35);
function cowbell(f) { const d = 0.3, b = buf(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6 + Math.sign(Math.sin(2 * Math.PI * f * 1.48 * t)) * 0.4) * Math.exp(-t * 9) * 0.45; } return lp(hp(b, f * 0.8), f * 4); }
function b808(f, d, glide) { const b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; const ff = glide ? f + (glide - f) * Math.min(1, Math.max(0, (t - d * 0.6) / (d * 0.3))) : f; ph += ff / SR; b[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 2.2) * Math.min(1, t / 0.005) * Math.min(1, Math.max(0, (d - t) / 0.03)) * 0.5; } return b; }

const B = 60 / 150, STEP = B / 4;
const RIFF = [78, null, 78, 81, null, 78, null, 76, 78, null, 73, null, 76, null, 74, null, 78, null, 78, 81, null, 83, null, 81, 78, null, 76, null, 73, null, 71, null];
const BASS = [[0, 42, 1.5], [1.5, 42, 0.5], [2, 45, 1], [3, 40, 1, 42], [4, 42, 1.5], [5.5, 42, 0.5], [6, 47, 1], [7, 45, 1, 40]];
function loop(kind) {
  const len = 32 * STEP * 2, L = buf(len);
  for (let k = 0; k < 64; k++) {
    const t = k * STEP, i16 = k % 32, b16 = i16 % 16;
    if (kind !== 'tense' && RIFF[i16] != null) add(L, t, cowbell(note(RIFF[i16])), kind === 'chill' ? 0.5 : 0.8);
    if (b16 % 2 === 0) add(L, t, hat(), kind === 'tense' ? 0.35 : 0.55);
    if (kind === 'full' && [13, 14, 15].includes(b16) && Math.floor(k / 16) % 2) for (let r = 0; r < 3; r++) add(L, t + r * STEP / 3, hat(), 0.4);
    if (kind === 'full' && b16 === 10) add(L, t, hat(true), 0.4);
    if (kind === 'full') { if ([0, 7, 10].includes(b16) || (b16 === 3 && Math.floor(k / 16) % 2)) add(L, t, kick(), 0.95); if (b16 === 4 || b16 === 12) add(L, t, clap(), 0.8); }
    if (kind === 'chill' && b16 === 0) add(L, t, kick(), 0.7);
    const bt = (i16 * STEP) / B;
    for (const [at, n, dur, gl] of BASS) if (Math.abs(bt - at) < 1e-6 && kind !== 'chill') add(L, t, b808(note(n), dur * B * 0.95, gl ? note(gl) : null), kind === 'tense' ? 0.5 : 0.85);
  }
  for (let i = 0; i < L.length; i++) L[i] = Math.tanh(L[i] * 1.1) * 0.8;
  return L;
}

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
  bwomp() { const d = 1.0, b = buf(d); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += 220 * Math.exp(-t * 0.9) / SR; b[i] = Math.tanh(2 * Math.sin(2 * Math.PI * ph)) * Math.exp(-t * 2.2) * 0.3; } return b; },
};

function toBuffer(f32) { const b = ctx.createBuffer(1, f32.length, SR); b.copyToChannel(f32, 0); return b; }
export const Audio = {
  unlocked: false,
  unlock() {
    if (this.unlocked) { ctx?.resume?.(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR }); } catch { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(comp);
    this.unlocked = true;
    // render loops lazily, one per idle slice so the first tap stays responsive
    setTimeout(() => { buffers.full = toBuffer(loop('full')); if (this._want) this.music(this._want); }, 30);
    setTimeout(() => { buffers.tense = toBuffer(loop('tense')); buffers.chill = toBuffer(loop('chill')); if (this._want && !current) this.music(this._want); }, 400);
  },
  music(kind) {
    this._want = kind;
    if (!ctx) return;
    if (current?.kind === kind) return;
    const now = ctx.currentTime;
    if (current) { current.g.gain.setTargetAtTime(0, now, 0.08); const c = current; setTimeout(() => { try { c.src.stop(); } catch {} }, 600); current = null; }
    if (!kind || !buffers[kind]) return;
    const src = ctx.createBufferSource(); src.buffer = buffers[kind]; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, now, 0.05);
    src.connect(g); g.connect(musicGain); src.start();
    current = { kind, src, g };
  },
  duck(amount = 0.25, t = 0.6) { if (!ctx) return; const g = musicGain.gain, now = ctx.currentTime; g.cancelScheduledValues(now); g.setTargetAtTime(0.55 * amount, now, 0.03); g.setTargetAtTime(0.55, now + t, 0.2); },
  rate(r) { if (current) current.src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.1); },
  sfx(name, gain = 1, rate = 1) {
    if (!ctx || !SFX[name]) return;
    if (!buffers['s_' + name]) buffers['s_' + name] = toBuffer(SFX[name]());
    const s = ctx.createBufferSource(); s.buffer = buffers['s_' + name]; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(sfxGain); s.start();
  },
  setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); },
  get muted() { return muted; },
};
