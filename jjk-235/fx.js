// Cursed-technique effects: Blue, Red, Purple, Black Flash, water jet, shockwaves, debris, smoke.
(function (J) {
  const glow = (ctx, x, y, r, stops) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, J.TAU); ctx.fill();
  };
  J.glow = glow;

  // A technique orb. kind: 'blue' (pulls in), 'red' (pushes out), 'purple'
  J.orb = (ctx, x, y, r, kind, t, opt = {}) => {
    const { power = 1, seed = 5, rings = true } = opt;
    const col = { blue: ['159,225,255', '47,140,255', '10,30,120'], red: ['255,214,200', '255,34,64', '120,0,20'], purple: ['250,235,255', '162,60,255', '40,0,80'] }[kind];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // big halo
    glow(ctx, x, y, r * 4.5 * power, [[0, `rgba(${col[1]},0.35)`], [0.4, `rgba(${col[1]},0.12)`], [1, `rgba(${col[1]},0)`]]);
    glow(ctx, x, y, r * 1.8, [[0, `rgba(${col[0]},1)`], [0.35, `rgba(${col[1]},0.9)`], [1, `rgba(${col[1]},0)`]]);
    ctx.restore();
    // swirling streaks
    const R = J.rng(seed); const dir = kind === 'blue' ? -1 : 1;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const a0 = R() * J.TAU, sp = 0.6 + R() * 1.4, ph = (R() + t * sp * 0.9) % 1;
      // blue: streaks fall inward; red: burst outward
      const d = kind === 'blue' ? J.lerp(r * 3.2, r * 0.9, ph) : J.lerp(r * 0.9, r * 3.4, ph);
      const a = a0 + dir * t * sp * 1.2 + (kind === 'blue' ? ph * 1.5 : 0);
      const len = 0.25 + R() * 0.5;
      ctx.strokeStyle = `rgba(${R() < 0.4 ? col[0] : col[1]},${Math.sin(ph * Math.PI) * 0.9})`;
      ctx.lineWidth = 1 + R() * 3;
      ctx.beginPath(); ctx.arc(x, y, d, a, a + len * dir, dir < 0); ctx.stroke();
    }
    ctx.restore();
    // ink ring + core
    if (rings) {
      ctx.save();
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3) % 1; const rr = kind === 'blue' ? J.lerp(r * 2.6, r * 1.05, ph) : J.lerp(r * 1.05, r * 2.8, ph);
        ctx.strokeStyle = `rgba(${col[1]},${Math.sin(ph * Math.PI) * 0.7})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.96, t, 0, J.TAU); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, J.TAU);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.45, `rgb(${col[0]})`); g.addColorStop(1, `rgb(${col[1]})`);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.06); ctx.strokeStyle = `rgb(${col[2]})`; ctx.stroke();
  };

  // Black Flash: jagged black bolts with red fringe radiating from a point
  J.blackFlash = (ctx, x, y, size, t, seed = 1) => {
    const R = J.rng(seed + Math.floor(t * 24));
    const life = J.clamp(1 - t / 0.6);
    if (life <= 0) return;
    // spatial distortion ring (dark)
    ctx.save();
    ctx.globalAlpha = life;
    for (let b = 0; b < 11; b++) {
      const a = R() * J.TAU; const L = size * (0.5 + R() * 0.9) * (0.6 + 0.4 * J.eo(J.clamp(t / 0.12)));
      const pts = [[x, y]]; let px = x, py = y; const segs = 6 + Math.floor(R() * 4);
      for (let s = 1; s <= segs; s++) { const d = L * s / segs; const aa = a + (R() - 0.5) * 0.9; px = x + Math.cos(aa) * d; py = y + Math.sin(aa) * d; pts.push([px, py]); }
      J.brush(ctx, pts, 22 * (0.6 + R()), J.C.red, 0, 1);
      J.brush(ctx, pts, 12 * (0.6 + R()), '#000', 0, 1);
      // forks
      if (R() < 0.6) { const k = 2 + Math.floor(R() * 3); const st = pts[k]; const fa = a + (R() - 0.5) * 2; const f2 = [st, [st[0] + Math.cos(fa) * L * 0.3, st[1] + Math.sin(fa) * L * 0.3], [st[0] + Math.cos(fa + 0.4) * L * 0.5, st[1] + Math.sin(fa + 0.4) * L * 0.5]]; J.brush(ctx, f2, 12, J.C.red, 0, 1); J.brush(ctx, f2, 6, '#000', 0, 1); }
    }
    // core
    glow(ctx, x, y, size * 0.35, [[0, 'rgba(0,0,0,1)'], [0.5, 'rgba(40,0,10,0.9)'], [1, 'rgba(255,30,60,0)']]);
    ctx.restore();
  };

  // turbulent high-pressure water jet from a to b, progress p (head position)
  J.waterJet = (ctx, ax, ay, bx, by, p, t, opt = {}) => {
    const { width = 10, bend = null } = opt; // bend: {x,y,k} pull toward point
    const n = 40; const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * p; let x = J.lerp(ax, bx, u), y = J.lerp(ay, by, u);
      if (bend) { const w = Math.pow(u, 1.6) * bend.k; x = J.lerp(x, bend.x, w); y = J.lerp(y, bend.y, w); }
      pts.push([x, y]);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    J.brush(ctx, pts, width * 3.5, 'rgba(80,170,255,0.25)', 0, 0);
    J.brush(ctx, pts, width * 1.6, 'rgba(160,220,255,0.7)', 0, 0);
    ctx.restore();
    J.brush(ctx, pts, width * 0.6, '#ffffff', 0, 0);
    // spray droplets
    const R = J.rng(77 + Math.floor(t * 24));
    ctx.fillStyle = 'rgba(200,235,255,0.9)';
    for (let i = 0; i < 60; i++) { const q = pts[Math.floor(R() * pts.length)]; ctx.beginPath(); ctx.arc(q[0] + (R() - 0.5) * width * 4, q[1] + (R() - 0.5) * width * 4, R() * 2.2, 0, J.TAU); ctx.fill(); }
  };

  // expanding ink shockwave ring
  J.shockRing = (ctx, x, y, r, w, color = '#fff', alpha = 1, squash = 0.35) => {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * squash, 0, 0, J.TAU); ctx.stroke(); ctx.restore();
  };

  // flying debris chunks: launched from (x,y) at t0, deterministic ballistic paths
  J.debris = (ctx, x, y, t, opt = {}) => {
    const { n = 40, seed = 3, speed = 900, spread = Math.PI, ang = -Math.PI / 2, grav = 1400, size = [4, 22], color = '#2a2730', ink = J.INK } = opt;
    if (t < 0) return;
    const R = J.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = ang + (R() - 0.5) * spread, v = speed * (0.3 + R() * 0.9), s = J.lerp(size[0], size[1], R() * R());
      const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + 0.5 * grav * t * t;
      const rot = R() * 6 + t * (R() - 0.5) * 14;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
      const k = 5 + Math.floor(R() * 3); const pts = [];
      for (let j = 0; j < k; j++) { const aa = (j / k) * J.TAU; pts.push([Math.cos(aa) * s * (0.6 + R() * 0.5), Math.sin(aa) * s * (0.6 + R() * 0.5)]); }
      J.poly(ctx, pts); J.fillInk(ctx, color, 2, ink);
      ctx.restore();
    }
  };

  // soft billowing smoke made of toned puffs
  J.smoke = (ctx, x, y, w, h, t, opt = {}) => {
    const { seed = 9, n = 18, color = '#8f8796', shade = '#4a4352', alpha = 0.9, drift = 20, ink = true } = opt;
    const R = J.rng(seed);
    ctx.save(); ctx.globalAlpha *= alpha;
    const puffs = [];
    for (let i = 0; i < n; i++) puffs.push({ x: x + (R() - 0.5) * w + Math.sin(t * 0.5 + i) * drift * R(), y: y + (R() - 0.5) * h - t * drift * R(), r: (0.25 + R() * 0.5) * Math.min(w, h) * 0.6 * (1 + t * 0.03) });
    puffs.sort((a, b) => a.y - b.y);
    for (const p of puffs) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, J.TAU);
      ctx.fillStyle = color; ctx.fill();
      if (ink) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(11,11,18,0.55)'; ctx.stroke(); }
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(p.x + p.r * 0.35, p.y + p.r * 0.4, p.r * 0.95, 0, J.TAU); ctx.fillStyle = shade; ctx.globalAlpha *= 0.6; ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };

  // little bright sparks / embers
  J.sparks = (ctx, x, y, t, opt = {}) => {
    const { n = 30, seed = 4, speed = 600, color = '#fff', life = 0.6, size = 3 } = opt;
    if (t < 0 || t > life * 1.5) return;
    const R = J.rng(seed);
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = R() * J.TAU, v = speed * (0.4 + R()); const tt = t * (0.7 + R() * 0.6); const k = J.clamp(1 - tt / life);
      if (k <= 0) continue;
      const px = x + Math.cos(a) * v * tt, py = y + Math.sin(a) * v * tt;
      ctx.globalAlpha = k; ctx.lineWidth = size * k;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * v * 0.04, py - Math.sin(a) * v * 0.04); ctx.stroke();
    }
    ctx.restore();
  };

  // cursed-energy aura flames around a silhouette point set (simple wisps)
  J.aura = (ctx, x, y, w, h, t, color = '47,140,255', seed = 2, amt = 1) => {
    const R = J.rng(seed);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const bx = x + (R() - 0.5) * w, ph = (t * (0.8 + R()) + R()) % 1;
      const by = y + h / 2 - ph * h * 1.3; const s = (1 - ph) * 30 * amt * (0.5 + R());
      ctx.fillStyle = `rgba(${color},${0.35 * Math.sin(ph * Math.PI) * amt})`;
      ctx.beginPath(); ctx.moveTo(bx - s * 0.5, by); ctx.quadraticCurveTo(bx, by - s * 2.6, bx + s * 0.5, by); ctx.quadraticCurveTo(bx, by + s * 0.6, bx - s * 0.5, by); ctx.fill();
    }
    ctx.restore();
  };
})(window.J);
