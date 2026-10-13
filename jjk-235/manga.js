// Motion-manga renderer: animates the real chapter pages, cut into layers by tools/cut.py.
// A shot frames one panel (or a whole page) with a camera, then layers parallax, lettering pop-ins and FX on top.
(function (J) {
  J.BAR = 36; // cinematic letterbox
  J.A = {}; J.PAGES = {};
  const img = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  J.loadAssets = async () => {
    const man = await (await fetch('assets/manifest.json')).json();
    J.MAN = man;
    const jobs = [];
    for (const [id, e] of Object.entries(man)) {
      const a = { ...e, texts: e.texts.map((t) => ({ ...t })), orbs: e.orbs.map((o) => ({ ...o })) };
      J.A[id] = a;
      jobs.push(img(`assets/${id}/bg.png`).then((i) => (a.bg = i)), img(`assets/${id}/full.png`).then((i) => (a.full = i)));
      if (e.fg) jobs.push(img(`assets/${id}/fg.png`).then((i) => (a.fgImg = i)));
      a.texts.forEach((t) => jobs.push(img(`assets/${id}/${t.f}`).then((i) => (t.img = i))));
      a.orbs.forEach((o) => jobs.push(img(`assets/${id}/${o.f}`).then((i) => (o.img = i))));
    }
    for (let p = 1; p <= 19; p++) jobs.push(img(`pages/hd/p${String(p).padStart(2, '0')}.png`).then((i) => i || img(`pages/p${String(p).padStart(2, '0')}.png`)).then((i) => (J.PAGES[p] = { img: i, w: i.naturalWidth > 1000 ? i.naturalWidth / 2 : i.naturalWidth, h: i.naturalWidth > 1000 ? i.naturalHeight / 2 : i.naturalHeight })));
    await Promise.all(jobs);
    // blurred backdrops for panels shown smaller than the frame
    for (const a of Object.values(J.A)) {
      const c = document.createElement('canvas'); c.width = 320; c.height = Math.max(1, Math.round(320 * a.h / a.w));
      const g = c.getContext('2d'); g.filter = 'blur(10px) saturate(1.3) brightness(0.45)'; g.drawImage(a.full, -20, -20, c.width + 40, c.height + 40); a.blur = c;
    }
  };

  // ---------- time helpers ----------
  // hit-stops freeze shot time (camera, layers) for d seconds at t
  const remap = (t, holds = []) => { let o = t; for (const [ht, hd] of holds) if (t > ht) o -= Math.min(t - ht, hd); return o; };
  const keyAt = (keys, t, ease = J.eio) => {
    if (!keys || !keys.length) return null;
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b[0]) { const u = (b[6] || ease)(J.clamp((t - a[0]) / (b[0] - a[0]))); return a.slice(1).map((v, k) => (typeof v === 'number' ? J.lerp(v, b[k + 1] ?? v, u) : v)); }
    }
    return keys[keys.length - 1].slice(1);
  };
  J.keyAt = keyAt;

  // ---------- panel shot ----------
  // s: {p, d, cam:[[t,u,v,z,rot]], fit:'cover'|'contain', maxZ, fg:{par,drift:[dx,dy],breathe,lift}, tx:[times], fx:[...], holds:[[t,d]]}
  J.panelView = (s, t) => {
    const a = J.A[s.p]; const W = J.W, Hv = J.H - J.BAR * 2;
    const cover = Math.max(W / a.w, Hv / a.h), contain = Math.min(W / a.w, Hv / a.h);
    let base = s.fit === 'contain' ? contain * 0.94 : Math.min(cover, s.maxZ ?? 2.4);
    const k = keyAt(s.cam, t) || [0.5, 0.5, 1 + 0.06 * (t / s.d), 0];
    const [u, v, zm, rot = 0] = k; const z = base * zm;
    let cx = a.x + u * a.w, cy = a.y + v * a.h;
    const hw = W / 2 / z, hh = Hv / 2 / z;
    // keep the frame inside the panel where the panel is big enough; otherwise centre it
    cx = a.w > hw * 2 ? J.clamp(cx, a.x + hw, a.x + a.w - hw) : J.lerp(a.x + a.w / 2, cx, 0.15);
    cy = a.h > hh * 2 ? J.clamp(cy, a.y + hh, a.y + a.h - hh) : J.lerp(a.y + a.h / 2, cy, 0.15);
    return { a, z, cx, cy, rot, cover, base, zm, filled: z >= cover * 0.999 };
  };

  // draw an image layer as horizontal strips displaced by a travelling sine: energy shimmer / heat haze / hair sway
  const warpDraw = (ctx, im, a, t, w) => {
    const n = Math.ceil(a.h / (w.strip ?? 4)); const sh = a.h / n; const sc = im.naturalHeight / a.h;
    for (let i = 0; i < n; i++) {
      const y = i * sh; const v = y / a.h; const m = w.y0 !== undefined ? J.smooth(J.clamp((v - w.y0) / 0.15)) * (w.y1 !== undefined ? J.smooth(J.clamp((w.y1 - v) / 0.15)) : 1) : 1;
      const off = (w.amp ?? 1.5) * m * Math.sin(y * (w.freq ?? 0.06) + t * (w.speed ?? 5));
      ctx.drawImage(im, 0, y * sc, im.naturalWidth, sh * sc + 1, a.x + off, a.y + y, a.w, sh + 0.5);
    }
  };
  J.drawPanel = (ctx, s, tRaw, fx) => {
    const t = remap(tRaw, s.holds);
    const V = J.panelView(s, t); const a = V.a; const W = J.W, H = J.H; const fgs = s.fg || {};
    // shake (in screen px) accumulates from fx list
    const hh = s.handheld ?? 1.6;
    let sx = J.noise(tRaw * 0.7, 11) * hh * 2, sy = J.noise(tRaw * 0.6, 23) * hh * 1.4;
    for (const f of s.fx || []) if (f.k === 'shake') { const q = J.shake(tRaw, f.t, f.a, f.dec ?? 7, f.f ?? 32, f.t * 10 | 0); sx += q.sx; sy += q.sy; }
    // backdrop when the panel doesn't fill the frame
    if (!V.filled) {
      ctx.drawImage(a.blur, 0, 0, W, H);
      ctx.fillStyle = 'rgba(8,6,14,0.35)'; ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(V.rot); ctx.scale(V.z, V.z); ctx.translate(-V.cx, -V.cy);
    ctx.imageSmoothingQuality = 'high';
    // panel shadow/border when floating
    if (!V.filled) { ctx.save(); J.poly(ctx, a.poly); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30 / V.z; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); }
    const useLayers = !!a.fgImg;
    if (fgs.dof) ctx.filter = `blur(${fgs.dof}px)`;
    if (s.bgWarp) warpDraw(ctx, a.bg, a, t, s.bgWarp); else ctx.drawImage(a.bg, a.x, a.y, a.w, a.h);
    ctx.filter = 'none';
    // orbs: spin + breathe
    for (const [i, o] of a.orbs.entries()) {
      const sp = (s.orb && s.orb[i]) || {}; if (sp.off) continue;
      ctx.save(); ctx.translate(o.cx, o.cy); ctx.rotate((sp.spin ?? 0.35) * t); const pz = 1 + (sp.pulse ?? 0.025) * Math.sin(t * 7) + (sp.grow ? sp.grow * J.eo(J.clamp(t / s.d)) : 0); ctx.scale(pz, pz);
      ctx.drawImage(o.img, o.x - o.cx, o.y - o.cy, o.w, o.h); ctx.restore();
    }
    // FX that live between background and characters
    for (const f of s.fx || []) if (f.layer === 'mid') J.panelFx(ctx, f, tRaw, t, s, V, fx);
    if (useLayers) {
      // parallax: the character layer travels further than the plate, and breathes
      const k0 = J.panelView(s, 0);
      const par = fgs.par ?? 0.05;
      const dx = -(V.cx - k0.cx) * par + (fgs.drift ? fgs.drift[0] * J.eio(J.clamp(t / s.d)) : 0);
      const dy = -(V.cy - k0.cy) * par + (fgs.drift ? fgs.drift[1] * J.eio(J.clamp(t / s.d)) : 0);
      const br = 1 + (fgs.breathe ?? 0.006) * Math.sin(t * J.TAU / (fgs.period ?? 3.2)) + (V.zm / k0.zm - 1) * (fgs.lift ?? 0.25) + (fgs.grow ?? 0) * J.eio(J.clamp(t / s.d));
      const ax = a.x + a.w * (fgs.ax ?? 0.5), ay = a.y + a.h * (fgs.ay ?? 0.6);
      ctx.save(); J.poly(ctx, a.poly); ctx.clip();
      ctx.translate(ax + dx, ay + dy); ctx.scale(br, br); ctx.translate(-ax, -ay);
      if (fgs.rim) { ctx.save(); ctx.shadowColor = fgs.rim; ctx.shadowBlur = 18; ctx.drawImage(a.fgImg, a.x, a.y, a.w, a.h); ctx.restore(); }
      if (fgs.warp) warpDraw(ctx, a.fgImg, a, t, fgs.warp); else ctx.drawImage(a.fgImg, a.x, a.y, a.w, a.h);
      ctx.restore();
    }
    for (const f of s.fx || []) if (!f.layer || f.layer === 'top') J.panelFx(ctx, f, tRaw, t, s, V, fx);
    ctx.restore();
    // screen-space FX (speedlines, flashes) then lettering
    for (const f of s.fx || []) if (f.layer === 'screen' && f.k !== 'fade') J.panelFx(ctx, f, tRaw, t, s, V, fx);
    J.drawTexts(ctx, s, tRaw, V, sx, sy);
    for (const f of s.fx || []) if (f.layer === 'screen' && f.k === 'fade') J.panelFx(ctx, f, tRaw, t, s, V, fx);
    for (const f of s.fx || []) if (f.k === 'impact' && tRaw >= f.t && tRaw < f.t + (f.n ?? 2) / J.FPS) { fx.impact = f.mode ?? 1; fx.impactTint = f.tint; }
    for (const f of s.fx || []) if (f.k === 'chroma') fx.chroma = Math.max(fx.chroma, (f.a ?? 1) * Math.exp(-Math.max(0, tRaw - f.t) * 6) * (tRaw >= f.t ? 1 : 0));
  };

  // lettering: each caption/bubble pops in at its time, in page position, clamped on screen
  J.drawTexts = (ctx, s, t, V, sx, sy) => {
    const a = V.a; const times = s.tx || a.texts.map((_, i) => 0.35 + i * 0.7);
    const W = J.W, H = J.H, B = J.BAR;
    a.texts.forEach((tx, i) => {
      const t0 = times[i]; if (t0 === null || t0 === undefined || t < t0) return;
      const lt = t - t0; const pop = J.eoBack(J.clamp(lt / 0.24), 2.2); const al = J.clamp(lt / 0.08);
      const out = s.txOut && s.txOut[i] !== undefined ? J.clamp(1 - (t - s.txOut[i]) / 0.15) : 1;
      if (out <= 0) return;
      const ts = J.clamp(V.z, s.txMin ?? 0.85, s.txMax ?? 1.5);
      // screen centre of the text in camera space
      const cxp = tx.x + tx.w / 2, cyp = tx.y + tx.h / 2;
      let X = W / 2 + (cxp - V.cx) * V.z * Math.cos(V.rot) - (cyp - V.cy) * V.z * Math.sin(V.rot) + sx;
      let Y = H / 2 + (cxp - V.cx) * V.z * Math.sin(V.rot) + (cyp - V.cy) * V.z * Math.cos(V.rot) + sy;
      const w = tx.w * ts, h = tx.h * ts, m = 14;
      X = J.clamp(X, w / 2 + m, W - w / 2 - m); Y = J.clamp(Y, B + h / 2 + m, H - B - h / 2 - m);
      ctx.save(); ctx.globalAlpha = al * out; ctx.translate(X, Y); ctx.rotate((1 - pop) * 0.06 * (i % 2 ? 1 : -1)); ctx.scale(ts * (0.7 + 0.3 * pop), ts * (0.7 + 0.3 * pop));
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.drawImage(tx.img, -tx.w / 2, -tx.h / 2, tx.w, tx.h); ctx.restore();
    });
  };

  // ---------- FX vocabulary (coords in page px unless layer 'screen') ----------
  J.panelFx = (ctx, f, t, tl, s, V, fx) => {
    const on = (t0 = 0, t1 = 1e9) => t >= t0 && t <= t1;
    switch (f.k) {
      case 'glow': {
        if (!on(f.t0, f.t1)) return;
        const env = J.clamp((t - (f.t0 || 0)) / (f.in ?? 0.3)) * (f.t1 ? J.clamp((f.t1 - t) / 0.3) : 1);
        const p = 1 + (f.pulse ?? 0.15) * Math.sin(t * (f.hz ?? 6) * J.TAU / 4) + (f.flick ? (J.hash((t * 24 | 0) + 7) - 0.5) * f.flick : 0);
        ctx.save(); ctx.globalCompositeOperation = f.op || 'lighter';
        J.glow(ctx, f.x, f.y, f.r * p, [[0, `rgba(${f.c},${(f.a ?? 0.8) * env})`], [0.35, `rgba(${f.c},${(f.a ?? 0.8) * 0.4 * env})`], [1, `rgba(${f.c},0)`]]);
        ctx.restore(); break;
      }
      case 'suck': { // particles streaking into a point (Azure attraction)
        if (!on(f.t0, f.t1)) return;
        const R = J.rng(f.seed || 3); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < (f.n || 60); i++) {
          const a0 = R() * J.TAU, sp = 0.5 + R(), ph = (R() + t * sp * (f.spd ?? 0.8)) % 1, d = J.lerp(f.r * 2.4, f.r * 0.9, ph), a = a0 + ph * (f.twist ?? 1.4) * (f.dir ?? 1);
          ctx.strokeStyle = `rgba(${f.c},${Math.sin(ph * Math.PI) * 0.8})`; ctx.lineWidth = (1 + R() * 2.5) / Math.max(0.6, V.z * 0.6);
          ctx.beginPath(); ctx.arc(f.x, f.y, d, a, a + 0.25 * (f.dir ?? 1)); ctx.stroke();
        }
        ctx.restore(); break;
      }
      case 'speed': { // screen-space parallel motion lines
        if (!on(f.t0, f.t1)) return;
        const env = J.clamp((t - (f.t0 || 0)) / 0.12) * (f.t1 ? J.clamp((f.t1 - t) / 0.2) : 1);
        J.speedLines(ctx, f.ang, { n: f.n ?? 60, seed: (f.seed || 1) + Math.floor(t * 12), color: f.c || 'rgba(255,255,255,0.9)', alpha: (f.a ?? 0.6) * env, len: [300, 1100], w: [1, f.w ?? 5], area: 1700, scroll: t * 3000 });
        break;
      }
      case 'focus': { // screen-space focus lines toward a point
        if (!on(f.t0, f.t1)) return;
        const env = J.clamp((t - (f.t0 || 0)) / 0.1) * (f.t1 ? J.clamp((f.t1 - t) / 0.2) : 1);
        J.focusLines(ctx, f.x ?? J.W / 2, f.y ?? J.H / 2, { rIn: f.r ?? 300, rOut: 1600, n: f.n ?? 120, seed: Math.floor(t * 12) + 3, color: f.c || J.INK, alpha: (f.a ?? 0.6) * env, width: f.w ?? 7 });
        break;
      }
      case 'flash': { // full-screen colour flash with decay
        if (t < f.t) return; const k = Math.exp(-(t - f.t) * (f.dec ?? 7)) * (f.a ?? 1); if (k < 0.01) return;
        ctx.save(); ctx.globalCompositeOperation = f.op || 'lighter'; ctx.fillStyle = `rgba(${f.c || '255,255,255'},${k})`; ctx.fillRect(0, 0, J.W, J.H); ctx.restore(); break;
      }
      case 'tint': { // multiply/screen colour grade over the panel
        if (!on(f.t0, f.t1)) return; const env = J.clamp((t - (f.t0 || 0)) / (f.in ?? 0.4));
        ctx.save(); ctx.globalCompositeOperation = f.op || 'multiply'; ctx.fillStyle = `rgba(${f.c},${(f.a ?? 0.4) * env})`; ctx.fillRect(-5000, -5000, 10000, 10000); ctx.restore(); break;
      }
      case 'flicker': { // lightning flicker: random additive pulses
        if (!on(f.t0, f.t1)) return; const fr = Math.floor(t * 24); const v = J.hash(fr * 13 + (f.seed || 0)); if (v < (f.p ?? 0.7)) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${f.c},${(v - (f.p ?? 0.7)) / (1 - (f.p ?? 0.7)) * (f.a ?? 0.35)})`; ctx.fillRect(-5000, -5000, 10000, 10000); ctx.restore(); break;
      }
      case 'debris': J.debris(ctx, f.x, f.y, t - f.t, { n: f.n ?? 30, seed: f.seed || 5, speed: f.v ?? 500, spread: f.sp ?? Math.PI, ang: f.ang ?? -Math.PI / 2, grav: f.g ?? 900, size: f.s || [2, 9], color: f.c || '#3a3238' }); break;
      case 'sparks': J.sparks(ctx, f.x, f.y, t - f.t, { n: f.n ?? 30, seed: f.seed || 4, speed: f.v ?? 400, color: f.c || '#fff', life: f.life ?? 0.5, size: f.s ?? 3 }); break;
      case 'ring': { // expanding shockwave ring
        if (t < f.t) return; const u = (t - f.t) / (f.d ?? 0.8); if (u > 1) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${f.c || '255,255,255'},${(1 - u) * (f.a ?? 0.9)})`; ctx.lineWidth = (f.w ?? 20) * (1 - u) + 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, J.eo(u) * f.r, J.eo(u) * f.r * (f.sq ?? 1), 0, 0, J.TAU); ctx.stroke(); ctx.restore(); break;
      }
      case 'motes': { // drifting embers/dust
        const R = J.rng(f.seed || 8); ctx.save(); ctx.globalCompositeOperation = f.op || 'lighter';
        for (let i = 0; i < (f.n || 40); i++) {
          const ph = (R() + t * (f.spd ?? 0.08) * (0.5 + R())) % 1; const x = f.x + (R() - 0.5) * f.w + Math.sin(t * 1.3 + i) * 6, y = f.y + f.h / 2 - ph * f.h;
          ctx.fillStyle = `rgba(${f.c || '255,170,80'},${Math.sin(ph * Math.PI) * (f.a ?? 0.9)})`; ctx.beginPath(); ctx.arc(x, y, (f.s ?? 1.6) * (0.5 + R()), 0, J.TAU); ctx.fill();
        }
        ctx.restore(); break;
      }
      case 'fade': { // fade the whole frame from/to a colour over [t0,t1]
        const u = J.clamp((t - f.t0) / (f.t1 - f.t0)); const k = f.out ? u : 1 - u; if (k <= 0) return;
        ctx.save(); ctx.fillStyle = `rgba(${f.c || '0,0,0'},${k})`; ctx.fillRect(0, 0, J.W, J.H); ctx.restore(); break;
      }
      case 'draw': f.fn(ctx, t, tl, V, fx); break;
    }
  };

  // ---------- page shot: the whole printed page, panels highlighted in reading order ----------
  J.drawPage = (ctx, s, t, fx) => {
    const PG = J.PAGES[s.page]; const P = PG.img; const PW = PG.w, PH = PG.h; const W = J.W, H = J.H, Hv = H - 2 * J.BAR;
    const base = Math.min(W / PW, Hv / PH) * 0.96;
    const k = keyAt(s.cam, t) || [0.5, 0.5, 1 + 0.05 * t / s.d, 0];
    const z = base * k[2];
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'blur(16px)'; ctx.drawImage(P, -100, -400, W + 200, (W + 200) * PH / PW); ctx.restore();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(k[3] || 0); ctx.scale(z, z); ctx.translate(-k[0] * PW, -k[1] * PH);
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 40; ctx.drawImage(P, 0, 0, PW, PH); ctx.shadowBlur = 0;
    const scr = (f) => f.layer === 'screen' || f.k === 'fade' || f.k === 'flash';
    const V = { z, a: { x: 0, y: 0, w: PW, h: PH } };
    for (const f of s.fx || []) if (!scr(f)) J.panelFx(ctx, f, t, t, s, V, fx);
    ctx.restore();
    for (const f of s.fx || []) if (scr(f)) J.panelFx(ctx, f, t, t, s, V, fx);
  };

  // ---------- shot registry + transitions ----------
  // trans: {k:'cut'|'flash'|'wipe'|'fade'|'slide', d, ang, c}
  J.mshot = (s) => J.shot(s.name || s.p || `page${s.page}`, s.d, (ctx, t, d, fx) => {
    if (s.page) J.drawPage(ctx, s, t, fx); else J.drawPanel(ctx, s, t, fx);
    if (s.over) s.over(ctx, t, fx);
  }, { spec: s, trans: s.trans });

  // composite the outgoing shot over the incoming one during a transition
  J.transition = (ctx, prevCanvas, tr, t) => {
    const u = J.clamp(t / tr.d); const W = J.W, H = J.H;
    if (tr.k === 'wipe' || tr.k === 'slide') {
      // diagonal gutter wipe: outgoing frame is cut away along a slanted line, with a white gutter stripe
      const ang = tr.ang ?? -0.35, e = J.eio(u); const dir = tr.dir ?? 1;
      const span = W + H; const off = J.lerp(-span / 2 - 60, span / 2 + 60, e) * dir;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang);
      ctx.beginPath(); if (dir > 0) ctx.rect(off, -span, span * 2, span * 2); else ctx.rect(off - span * 2, -span, span * 2, span * 2); ctx.restore();
      ctx.save(); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const push = tr.k === 'slide' ? e * 80 * dir : 0; ctx.drawImage(prevCanvas, push * Math.cos(ang), push * Math.sin(ang)); ctx.restore();
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.fillStyle = tr.c || '#f4f1ea'; ctx.fillRect(off - 9, -span, 18, span * 2); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(off - 9, -span, 18, span * 2); ctx.restore();
    } else if (tr.k === 'fade') { ctx.save(); ctx.globalAlpha = 1 - J.smooth(u); ctx.drawImage(prevCanvas, 0, 0); ctx.restore(); }
    else if (tr.k === 'flash') { if (u < 0.5) { ctx.save(); ctx.globalAlpha = 1 - u * 2; ctx.drawImage(prevCanvas, 0, 0); ctx.restore(); } ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${tr.c || '255,255,255'},${Math.sin(u * Math.PI)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    else if (tr.k === 'zoom') { ctx.save(); ctx.globalAlpha = 1 - u; ctx.translate(W / 2, H / 2); const z = 1 + J.ei(u) * 1.5; ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); ctx.drawImage(prevCanvas, 0, 0); ctx.restore(); }
  };
})(window.J);
