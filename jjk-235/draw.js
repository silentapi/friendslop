// Drawing helpers: ink, brush strokes, speedlines, lettering, bubbles, manga panels.
(function (J) {
  J.INK = '#0b0b12';
  J.PAPER = '#f3eee2';
  J.C = {
    blue: '#2f8cff', blueHi: '#9fe1ff', red: '#ff2240', redHi: '#ffb3a0', purple: '#a23cff', purpleHi: '#e8c8ff',
    skin: '#f7e2d3', skinSh: '#d9a99a', gojoHair: '#f4f7fb', gojoHairSh: '#b9cde6', gojoCoat: '#1a1c2c', gojoCoatSh: '#0b0c16',
    suHair: '#1b1d2b', suHairHi: '#46506e', suRobe: '#efe9dc', suRobeSh: '#b8ad9a', suEye: '#ff2a3c', tattoo: '#120d14',
    maho: '#ece6d6', mahoSh: '#a99f8c', gold: '#d8b04a', goldSh: '#8b6a1e',
  };

  // ---------- paths ----------
  J.poly = (ctx, pts, close = true) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); };
  // smooth closed blob through points (quadratic midpoints)
  J.blob = (ctx, pts) => {
    ctx.beginPath(); const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]); ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; const mm = mid(p, q); ctx.quadraticCurveTo(p[0], p[1], mm[0], mm[1]); }
    ctx.closePath();
  };
  J.fillInk = (ctx, fill, lw = 3, ink = J.INK) => {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  };

  // Tapered brush stroke along a polyline: thick in the middle, thin ends.
  J.brush = (ctx, pts, w, color = J.INK, taperA = 1, taperB = 1) => {
    if (pts.length < 2) return;
    // resample with Catmull-Rom for smoothness
    const P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < 6; s++) {
        const t = s / 6, t2 = t * t, t3 = t2 * t;
        P.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    P.push(pts[pts.length - 1]);
    const L = [], R = [], n = P.length;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const u = i / (n - 1);
      const prof = Math.min(1, taperA ? Math.pow(Math.sin(Math.min(u, 0.5) * Math.PI), 0.7) : 1, taperB ? Math.pow(Math.sin(Math.max(u, 0.5) * Math.PI), 0.7) : 1);
      const ww = (w / 2) * Math.max(0.08, prof);
      L.push([P[i][0] - dy * ww, P[i][1] + dx * ww]); R.push([P[i][0] + dy * ww, P[i][1] - dx * ww]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const p of L) ctx.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };

  // ---------- speedlines ----------
  // focus lines converging on (cx,cy); changes pattern every `hold` frames for a boiling hand-drawn feel
  J.focusLines = (ctx, cx, cy, opt = {}) => {
    const { rIn = 260, rOut = 1400, n = 140, seed = 1, color = J.INK, alpha = 1, width = 7, jitter = 0.45, ell = 1 } = opt;
    const r = J.rng(seed);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * J.TAU + r() * 0.05;
      const ri = rIn * (1 + (r() - 0.3) * jitter * 2);
      const w = width * (0.25 + r() * r() * 1.6) / 1000;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - w) * rOut, cy + Math.sin(a - w) * rOut * ell);
      ctx.lineTo(cx + Math.cos(a + w) * rOut, cy + Math.sin(a + w) * rOut * ell);
      ctx.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri * ell);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
  // parallel motion lines along angle `ang`
  J.speedLines = (ctx, ang, opt = {}) => {
    const { n = 70, seed = 1, color = J.INK, alpha = 1, len = [200, 900], w = [1, 5], scroll = 0, area = 1600 } = opt;
    const r = J.rng(seed);
    ctx.save(); ctx.translate(J.W / 2, J.H / 2); ctx.rotate(ang); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const y = (r() - 0.5) * area; const L = J.lerp(len[0], len[1], r()); const ww = J.lerp(w[0], w[1], r() * r());
      let x = ((r() * area * 2 + scroll * (0.6 + r())) % (area * 2)) - area;
      ctx.beginPath(); ctx.moveTo(x, y - ww / 2); ctx.lineTo(x + L, y); ctx.lineTo(x, y + ww / 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  // ---------- lettering ----------
  J.FONT_JP = '"Dela Gothic One", sans-serif';
  J.FONT_EN = '"Oswald", "DejaVu Sans", sans-serif';
  J.FONT_FX = '"Bangers", "Oswald", sans-serif';

  // big hand-lettered sound effect with thick double outline
  J.sfx = (ctx, text, x, y, size, opt = {}) => {
    const { rot = 0, fill = '#fff', stroke = J.INK, outer = '#fff', pop = 1, alpha = 1, font = J.FONT_JP, skew = 0, vertical = false, spacing = 0.92 } = opt;
    if (pop <= 0 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.transform(1, 0, skew, 1, 0, 0); ctx.scale(pop, pop); ctx.globalAlpha *= alpha;
    ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const chars = vertical ? [...text] : [text];
    chars.forEach((ch, i) => {
      const yy = vertical ? (i - (chars.length - 1) / 2) * size * spacing : 0;
      if (outer) { ctx.lineWidth = size * 0.34; ctx.strokeStyle = outer; ctx.strokeText(ch, 0, yy); }
      ctx.lineWidth = size * 0.16; ctx.strokeStyle = stroke; ctx.strokeText(ch, 0, yy);
      ctx.fillStyle = fill; ctx.fillText(ch, 0, yy);
    });
    ctx.restore();
  };

  // typewriter reveal helper: returns substring by progress
  J.type = (s, p) => s.slice(0, Math.floor(s.length * J.clamp(p) + 0.001));

  // narration caption box (black with white text, slight tilt)
  J.caption = (ctx, lines, x, y, opt = {}) => {
    const { size = 26, p = 1, alpha = 1, rot = -0.015, pad = 16, bg = J.INK, fg = '#f3eee2', align = 'left', maxW } = opt;
    if (alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
    ctx.font = `500 ${size}px ${J.FONT_EN}`; ctx.textBaseline = 'top';
    const w = maxW || Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const h = lines.length * size * 1.25 + pad * 2 - size * 0.25;
    const ox = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    ctx.fillStyle = bg; ctx.fillRect(ox, 0, w, h);
    ctx.strokeStyle = fg; ctx.globalAlpha *= 0.5; ctx.lineWidth = 1.5; ctx.strokeRect(ox + 5, 5, w - 10, h - 10); ctx.globalAlpha /= 0.5;
    ctx.fillStyle = fg;
    let total = lines.join('').length, shown = Math.floor(total * J.clamp(p));
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, shown)); shown -= l.length; ctx.fillText(s, ox + pad, pad + i * size * 1.25); });
    ctx.restore();
  };

  // speech bubble; tail points toward (tx,ty). style: 'round' | 'spiky' | 'thought'
  J.bubble = (ctx, x, y, text, opt = {}) => {
    const { size = 26, tx, ty, style = 'round', p = 1, pop = 1, maxW = 300, bold = false, font = J.FONT_EN } = opt;
    if (pop <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
    ctx.font = `${bold ? 700 : 500} ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // word wrap
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const rw = tw / 2 + size * 1.0, rh = (lines.length * size * 1.2) / 2 + size * 0.75;
    ctx.lineWidth = 3.5; ctx.strokeStyle = J.INK; ctx.fillStyle = '#fff'; ctx.lineJoin = 'round';
    const tail = () => {
      if (tx === undefined) return;
      const ax = tx - x, ay = ty - y; const a = Math.atan2(ay, ax);
      const b1 = [Math.cos(a + 0.35) * rw * 0.8, Math.sin(a + 0.35) * rh * 0.8], b2 = [Math.cos(a - 0.35) * rw * 0.8, Math.sin(a - 0.35) * rh * 0.8];
      ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.quadraticCurveTo(ax * 0.5, ay * 0.5, ax / pop, ay / pop); ctx.quadraticCurveTo(ax * 0.45, ay * 0.45, b2[0], b2[1]);
    };
    if (style === 'spiky') {
      const r = J.rng(text.length * 13); const n = 22; const pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * J.TAU; const k = i % 2 ? 1.0 : 1.32 + r() * 0.25; pts.push([Math.cos(a) * rw * k, Math.sin(a) * rh * k]); }
      J.poly(ctx, pts); ctx.fill(); ctx.stroke();
    } else {
      tail(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, 0, J.TAU); ctx.fill(); ctx.stroke();
      // cover tail seam
      tail(); ctx.fill();
    }
    ctx.fillStyle = J.INK;
    let total = lines.join('').length, shown = Math.floor(total * J.clamp(p) + 0.001);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, shown)); shown -= l.length; ctx.textAlign = 'left'; ctx.fillText(s, -ctx.measureText(l).width / 2, (i - (lines.length - 1) / 2) * size * 1.2); });
    ctx.restore();
  };

  // ---------- manga page / panels ----------
  // panels: [{pts:[[x,y]..], t0, dir:[dx,dy], draw(ctx,lt,bbox)}]; t is page-local time
  J.page = (ctx, t, panels, opt = {}) => {
    const { bg = J.PAPER, border = 6 } = opt;
    ctx.fillStyle = bg; ctx.fillRect(-50, -50, J.W + 100, J.H + 100);
    for (const p of panels) {
      const lt = t - p.t0; if (lt < 0) continue;
      const k = J.eoBack(J.clamp(lt / (p.slide ?? 0.28)), 1.2);
      const [dx, dy] = p.dir || [0, 60];
      ctx.save(); ctx.translate(dx * (1 - k) * 4, dy * (1 - k) * 4);
      ctx.globalAlpha = J.clamp(lt / 0.08);
      const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
      const bb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      bb.cx = bb.x + bb.w / 2; bb.cy = bb.y + bb.h / 2;
      J.poly(ctx, p.pts); ctx.save(); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
      p.draw(ctx, lt, bb);
      ctx.restore();
      J.poly(ctx, p.pts); ctx.lineWidth = border; ctx.strokeStyle = J.INK; ctx.lineJoin = 'miter'; ctx.stroke();
      ctx.restore();
    }
  };

  // ink splatter blob (for title & wipes)
  J.splat = (ctx, x, y, r, seed, color = J.INK, k = 1) => {
    const R = J.rng(seed); const n = 26; const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * J.TAU; const rr = r * (0.75 + R() * 0.5) * (i % 3 === 0 ? 1 + R() * 0.6 * k : 1); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    J.blob(ctx, pts); ctx.fillStyle = color; ctx.fill();
    for (let i = 0; i < 14; i++) { const a = R() * J.TAU, d = r * (1.1 + R() * 0.9 * k), s = r * 0.05 * (0.4 + R()); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, J.TAU); ctx.fill(); }
  };

  // brush-stroke wipe covering the screen as p goes 0->1 (black ink sweep)
  J.inkWipe = (ctx, p, seed = 3, color = J.INK, ang = -0.25) => {
    if (p <= 0) return;
    ctx.save(); ctx.translate(J.W / 2, J.H / 2); ctx.rotate(ang);
    const R = J.rng(seed); const rows = 7;
    for (let i = 0; i < rows; i++) {
      const pp = J.clamp(p * 1.6 - i * 0.08);
      if (pp <= 0) continue;
      const y = (i - (rows - 1) / 2) * 150;
      const x0 = -1100, x1 = J.lerp(x0, 1100, J.eo(pp));
      const pts = []; for (let k = 0; k <= 8; k++) pts.push([J.lerp(x0, x1, k / 8), y + (R() - 0.5) * 30]);
      J.brush(ctx, pts, 230, color, 0, 1);
    }
    ctx.restore();
  };
})(window.J);
