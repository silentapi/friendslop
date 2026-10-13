// Core: timeline, maths, seeded randomness, camera and post FX.
// Everything is deterministic: any frame renders on its own from (frame number) alone.
window.J = window.J || {};
(function (J) {
  J.W = 1280; J.H = 720; J.FPS = 24;

  // ---------- maths ----------
  J.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  J.lerp = (a, b, t) => a + (b - a) * t;
  J.range = (t, a, b) => J.clamp((t - a) / (b - a));
  J.smooth = (t) => t * t * (3 - 2 * t);
  J.eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  J.eo = (t) => 1 - Math.pow(1 - t, 3);
  J.ei = (t) => t * t * t;
  J.eoExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  J.eoBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  J.eoElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
  // hold the value on "twos" (12fps acting) or "threes"
  J.twos = (t, n = 2) => Math.floor(t * J.FPS / n) * n / J.FPS;
  J.TAU = Math.PI * 2;

  // ---------- randomness ----------
  J.hash = (n) => { n = (n << 13) ^ n; return (1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824) * 0.5 + 0.5; };
  J.rng = (seed) => { let a = (seed * 2654435761) >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // smooth 1D value noise
  J.noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i; const a = J.hash(i * 157 + seed * 911), b = J.hash((i + 1) * 157 + seed * 911); return J.lerp(a, b, J.smooth(f)) * 2 - 1; };

  // ---------- shots ----------
  J.shots = [];
  J.shot = (name, dur, draw, opts = {}) => J.shots.push({ name, dur, draw, ...opts });
  J.layout = () => { let s = 0; for (const sh of J.shots) { sh.start = s; s += sh.dur; } J.total = s; J.frames = Math.round(s * J.FPS); };

  // ---------- canvas ----------
  J.init = (canvas) => {
    J.canvas = canvas; canvas.width = J.W; canvas.height = J.H;
    J.ctx = canvas.getContext('2d');
    J.buf = document.createElement('canvas'); J.buf.width = J.W; J.buf.height = J.H;
    J.bctx = J.buf.getContext('2d');
    J.makeGrain();
    J.makeTones();
    J.layout();
  };

  J.makeGrain = () => {
    J.grain = [];
    for (let k = 0; k < 6; k++) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      const g = c.getContext('2d'); const d = g.createImageData(320, 180); const r = J.rng(99 + k);
      for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); J.grain.push(c);
    }
  };

  // Screentone dot patterns, screen-locked like printed manga.
  J.makeTones = () => {
    J.tones = {};
    for (const [name, sp, rad] of [['fine', 5, 1.3], ['mid', 7, 2.2], ['big', 10, 3.6], ['heavy', 7, 3.0]]) {
      const c = document.createElement('canvas'); c.width = sp * 2; c.height = sp * 2; const g = c.getContext('2d');
      g.fillStyle = '#000';
      for (const [x, y] of [[0, 0], [sp, sp], [sp * 2, 0], [0, sp * 2], [sp * 2, sp * 2]]) { g.beginPath(); g.arc(x, y, rad, 0, J.TAU); g.fill(); }
      J.tones[name] = c;
    }
  };
  J.tone = (ctx, name = 'mid', alpha = 0.5, color) => {
    const p = ctx.createPattern(J.tones[name], 'repeat');
    // lock to screen: undo the current transform on the pattern
    const m = ctx.getTransform().inverse(); p.setTransform(m);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = p; ctx.fill(); ctx.restore();
    if (color) { /* tinted tone handled by caller */ }
  };

  // ---------- camera ----------
  // c = {x, y, z, r, sx, sy}: look at (x,y) in a 1280x720 world, zoom z, roll r.
  J.camera = (ctx, c) => {
    ctx.translate(J.W / 2 + (c.sx || 0), J.H / 2 + (c.sy || 0));
    ctx.rotate(c.r || 0);
    ctx.scale(c.z || 1, c.z || 1);
    ctx.translate(-(c.x ?? J.W / 2), -(c.y ?? J.H / 2));
  };
  // decaying handheld shake: amp in px, starts at t0
  J.shake = (t, t0, amp, decay = 6, freq = 30, seed = 1) => {
    if (t < t0) return { sx: 0, sy: 0 };
    const k = amp * Math.exp(-(t - t0) * decay);
    return { sx: J.noise((t - t0) * freq, seed) * k, sy: J.noise((t - t0) * freq, seed + 7) * k };
  };

  // ---------- post ----------
  J.post = (ctx, fx) => {
    const { W, H } = J;
    // chromatic split during impacts
    if (fx.chroma > 0.01) {
      const b = J.bctx; b.clearRect(0, 0, W, H); b.drawImage(J.canvas, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35 * fx.chroma;
      ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'; ctx.drawImage(J.buf, -6 * fx.chroma, 0);
      ctx.filter = 'sepia(1) saturate(8) hue-rotate(160deg)'; ctx.drawImage(J.buf, 6 * fx.chroma, 0);
      ctx.restore();
    }
    // impact frame: posterised inverted black/white with red kept
    if (fx.impact) {
      const b = J.bctx; b.clearRect(0, 0, W, H); b.drawImage(J.canvas, 0, 0);
      ctx.save();
      ctx.filter = fx.impact === 2 ? 'grayscale(1) contrast(6) brightness(1.1)' : 'grayscale(1) contrast(6) invert(1)';
      ctx.drawImage(J.buf, 0, 0); ctx.filter = 'none';
      if (fx.impactTint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = fx.impactTint; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,6,20,${fx.vignette ?? 0.45})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // paper grain
    ctx.save(); ctx.globalAlpha = fx.grain ?? 0.07; ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(J.grain[fx.frame % J.grain.length], 0, 0, W, H); ctx.restore();
    // fade
    if (fx.fade > 0) { ctx.fillStyle = `rgba(${fx.fadeColor || '0,0,0'},${fx.fade})`; ctx.fillRect(0, 0, W, H); }
  };

  J.renderFrame = (f) => {
    const T = f / J.FPS;
    let sh = J.shots[J.shots.length - 1];
    for (const s of J.shots) if (T >= s.start && T < s.start + s.dur) { sh = s; break; }
    const t = T - sh.start;
    const ctx = J.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, J.W, J.H);
    const fx = { frame: f, chroma: 0, impact: 0, fade: 0 };
    ctx.save(); sh.draw(ctx, t, sh.dur, fx, f); ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    J.post(ctx, fx);
    if (fx.over) { ctx.save(); fx.over(ctx); ctx.restore(); }
    J.cur = { shot: sh.name, t, T };
  };
})(window.J);
