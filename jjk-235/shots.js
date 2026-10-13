// Storyboard for JJK ch.235, built from the real pages (right-to-left reading order).
// cam keys: [t, u, v, zoom, roll] — u,v = point of interest inside the panel (0..1), zoom relative to the shot's base framing.
// tx: when each caption/bubble pops in (index order = cuts.json texts order). fx coords are page pixels unless layer:'screen'.
(function (J) {
  const S = (s) => J.mshot(s);
  const W = J.W, H = J.H;
  const PURPLE = '170,90,255', BLUE = '90,180,255', RED = '255,40,60', WHITE = '255,255,255';
  const hit = (t, a = 26, extra = []) => [{ k: 'shake', t, a, dec: 6 }, { k: 'impact', t, n: 2 }, { k: 'flash', t: t + 2 / 24, a: 0.55, dec: 9, layer: 'screen' }, { k: 'chroma', t, a: 1 }, ...extra];
  const wipe = (ang = -0.4, d = 0.35, dir = 1) => ({ k: 'wipe', ang, d, dir });

  // ===== PAGE 1 — cold open on the cover page =====
  S({ name: 'title', page: 1, d: 4.2, cam: [[0, 0.5, 0.42, 1.0], [4.2, 0.48, 0.45, 1.1]],
    fx: [{ k: 'fade', t0: 0, t1: 1.2, c: '0,0,0', layer: 'screen' }, { k: 'flicker', t0: 0.6, t1: 4.2, c: '170,120,255', a: 0.18, p: 0.8 }] });
  S({ p: 'p01a', d: 3.6, tx: [null], trans: { k: 'fade', d: 0.5 }, cam: [[0, 0.36, 0.25, 1.0], [3.6, 0.35, 0.24, 1.18]], orb: [{ spin: 0.5, pulse: 0.03 }],
    fx: [{ k: 'glow', x: 265, y: 165, r: 260, c: PURPLE, a: 0.55, pulse: 0.2, flick: 0.4 }, { k: 'flicker', c: '190,150,255', a: 0.3, p: 0.72, seed: 3 }, { k: 'suck', x: 265, y: 165, r: 110, c: '200,170,255', n: 50 }] });
  S({ p: 'p01b', d: 3.4, trans: wipe(1.14, 0.4), cam: [[0, 0.8, 0.45, 1.25], [1.4, 0.62, 0.6, 1.15], [3.4, 0.38, 0.72, 1.05]], tx: [0.4],
    fg: { par: 0.08, drift: [-6, 10] },
    fx: [{ k: 'speed', ang: 2.5, a: 0.35, t0: 0, t1: 2.6, layer: 'screen' }, { k: 'glow', x: 420, y: 820, r: 160, c: BLUE, a: 0.5, pulse: 0.3, flick: 0.5 }, { k: 'shake', t: 1.2, a: 8, dec: 3 }] });

  // ===== PAGE 2 — voltage ramps up / Sukuna uneasy =====
  S({ p: 'p02a', d: 4.4, trans: { k: 'flash', d: 0.25, c: '150,220,255' }, cam: [[0, 0.62, 0.4, 1.0], [4.4, 0.66, 0.55, 1.14, -0.02]], tx: [0.5, 2.0],
    fg: { par: 0.06, breathe: 0.01, period: 1.6 },
    fx: [{ k: 'glow', x: 480, y: 170, r: 230, c: '120,230,255', a: 0.7, pulse: 0.25, hz: 9, flick: 0.3 }, { k: 'sparks', t: 0.1, x: 480, y: 180, n: 40, c: '#bff', v: 300, life: 0.9 }, { k: 'sparks', t: 1.6, x: 500, y: 140, n: 30, c: '#bff', v: 260, life: 0.9, seed: 9 }, { k: 'shake', t: 0, a: 3, dec: 0.4, f: 18 }] });
  S({ p: 'p02b', d: 4.6, trans: wipe(1.57, 0.35), cam: [[0, 0.5, 0.42, 1.0], [4.6, 0.46, 0.4, 1.2]], tx: [0.5, 2.3],
    fg: { par: 0.06, breathe: 0.008, dof: 2.5 }, fx: [{ k: 'shake', t: 0, a: 1.6, dec: 0, f: 22 }, { k: 'tint', c: '40,30,80', a: 0.18, op: 'multiply', t0: 1.5, in: 2 }] });

  // ===== PAGE 3 — POW: Black Flash into Mahoraga =====
  S({ p: 'p03a', d: 2.6, cam: [[0, 0.25, 0.45, 1.25], [0.45, 0.32, 0.42, 1.2, J.eo], [0.6, 0.62, 0.3, 1.3], [2.6, 0.62, 0.32, 1.12]], holds: [[0.55, 0.12]],
    fg: { par: 0.1 }, fx: [...hit(0.55, 34), { k: 'speed', ang: -0.35, a: 0.5, t0: 0, t1: 0.55, layer: 'screen' }, { k: 'glow', x: 420, y: 200, r: 260, c: RED, a: 0.6, t0: 0.55, t1: 2.0, pulse: 0.3 }, { k: 'debris', t: 0.55, x: 430, y: 220, n: 40, v: 700, ang: -0.3, sp: 2.2 }] });
  S({ p: 'p03c', d: 1.4, trans: { k: 'cut' }, cam: [[0, 0.5, 0.5, 1.0], [1.4, 0.5, 0.48, 1.12]], fx: [{ k: 'shake', t: 0, a: 14, dec: 4 }, { k: 'impact', t: 0.04, n: 1, mode: 2 }] });
  S({ p: 'p03d', d: 1.6, cam: [[0, 0.55, 0.5, 1.0], [1.6, 0.55, 0.45, 1.12]], fg: { par: 0.05 }, fx: [{ k: 'glow', x: 590, y: 790, r: 40, c: RED, a: 0.6, pulse: 0.4 }] });
  S({ p: 'p03b', d: 2.4, trans: wipe(1.97, 0.3), cam: [[0, 0.62, 0.15, 1.15], [2.4, 0.4, 0.75, 1.05]], fg: { par: 0.09 },
    fx: [{ k: 'speed', ang: 2.0, a: 0.4, t0: 0, t1: 1.6, layer: 'screen' }, { k: 'flash', t: 0.5, a: 0.4, dec: 8, layer: 'screen' }, { k: 'shake', t: 0.5, a: 10 }] });

  // ===== PAGE 4 — WHMP / FWSH / WHUP: the exchange, throw into Mahoraga =====
  S({ p: 'p04a', d: 2.3, trans: wipe(1.37, 0.3), cam: [[0, 0.3, 0.45, 1.15], [0.5, 0.48, 0.45, 1.25, J.eo], [2.3, 0.52, 0.42, 1.12]], holds: [[0.5, 0.1]], fg: { par: 0.1 },
    fx: [...hit(0.5, 24), { k: 'speed', ang: 0, a: 0.4, t0: 0, t1: 0.5, layer: 'screen' }] });
  S({ p: 'p04b', d: 2.4, trans: wipe(1.37, 0.3), cam: [[0, 0.28, 0.6, 1.15], [2.4, 0.72, 0.4, 1.1]], fg: { par: 0.12, drift: [20, -6] },
    fx: [{ k: 'speed', ang: -0.2, a: 0.45, t0: 0.2, t1: 2.2, layer: 'screen' }, { k: 'glow', x: 600, y: 440, r: 80, c: '255,220,120', a: 0.5, pulse: 0.3 }] });
  S({ p: 'p04c', d: 2.4, trans: wipe(1.37, 0.3), cam: [[0, 0.62, 0.45, 1.25], [0.35, 0.55, 0.5, 1.12, J.eo], [2.4, 0.55, 0.5, 1.02]], holds: [[0.35, 0.1]], fg: { par: 0.08 },
    fx: [...hit(0.35, 30), { k: 'debris', t: 0.35, x: 380, y: 980, n: 36, v: 600 }] });

  // ===== PAGE 5 — BAM / KRASH: through the wall =====
  S({ p: 'p05a', d: 2.6, trans: { k: 'flash', d: 0.15 }, cam: [[0, 0.2, 0.55, 1.2], [0.4, 0.45, 0.25, 1.3, J.eo], [2.6, 0.48, 0.3, 1.1]], holds: [[0.4, 0.14]], fg: { par: 0.06 },
    fx: [...hit(0.4, 40), { k: 'glow', x: 380, y: 160, r: 200, c: RED, a: 0.55, t0: 0.4, t1: 2.2 }, { k: 'debris', t: 0.4, x: 380, y: 170, n: 50, v: 800, sp: 6 }] });
  S({ p: 'p05b', d: 3.0, trans: wipe(1.15, 0.35), cam: [[0, 0.42, 0.42, 1.35], [3.0, 0.5, 0.55, 1.0]], fg: { par: 0.1, drift: [10, 0] },
    fx: [{ k: 'shake', t: 0, a: 20, dec: 3 }, { k: 'debris', t: 0, x: 340, y: 720, n: 60, v: 500, ang: -1.9, sp: 2.4, s: [3, 12] }, { k: 'motes', x: 300, y: 800, w: 600, h: 500, n: 40, c: '200,180,160', a: 0.5, op: 'source-over', spd: 0.15 }] });

  // ===== PAGE 6 — "Phase." "Paramita." "Pillar of light." =====
  S({ p: 'p06a', d: 6.4, trans: { k: 'fade', d: 0.4 }, cam: [[0, 0.4, 0.14, 1.35], [2.4, 0.42, 0.25, 1.25], [4.2, 0.45, 0.6, 1.0], [6.4, 0.4, 0.78, 1.05]], tx: [0.6, 2.3, 4.0],
    fg: { par: 0.12, breathe: 0.008, rim: 'rgba(90,190,255,0.9)', warp: { amp: 1.2, freq: 0.08, speed: 7 } },
    fx: [{ k: 'glow', x: 330, y: 240, r: 330, c: BLUE, a: 0.45, pulse: 0.2, flick: 0.4, layer: 'mid' }, { k: 'flicker', c: '120,200,255', a: 0.12, p: 0.75, seed: 5 }, { k: 'glow', x: 320, y: 140, r: 60, c: '150,240,255', a: 0.8, pulse: 0.4, t0: 0.4 }] });
  S({ p: 'p06b', d: 4.0, trans: { k: 'fade', d: 0.3 }, fit: 'cover', cam: [[0, 0.5, 0.5, 1.0], [4, 0.5, 0.5, 1.06]], tx: [1.9, 0.4] });

  // ===== PAGE 7 — Sukuna reads the chant as Reversal Red =====
  S({ p: 'p07a', d: 4.6, cam: [[0, 0.75, 0.5, 1.0], [4.6, 0.3, 0.5, 1.0]], tx: [3.4, 2.4, 1.4, 0.4] });
  S({ p: 'p07b', d: 4.2, trans: wipe(1.57, 0.3), cam: [[0, 0.5, 0.5, 1.0], [4.2, 0.48, 0.45, 1.15]], tx: [2.2, 0.4], fg: { par: 0.06 },
    fx: [{ k: 'glow', x: 340, y: 365, r: 40, c: RED, a: 0.7, pulse: 0.5, hz: 4 }] });
  S({ p: 'p07c', d: 4.0, trans: wipe(1.57, 0.3), cam: [[0, 0.45, 0.5, 1.0], [4.0, 0.5, 0.5, 1.2]], tx: [2.6, 0.5],
    fx: [{ k: 'glow', x: 318, y: 660, r: 70, c: RED, a: 0.65, pulse: 0.4, hz: 3 }, { k: 'glow', x: 445, y: 650, r: 70, c: RED, a: 0.65, pulse: 0.4, hz: 3 }] });
  S({ p: 'p07d', d: 2.6, trans: { k: 'fade', d: 0.3 }, cam: [[0, 0.5, 0.5, 1.0], [2.6, 0.5, 0.5, 1.12]], tx: [0.4], fx: [{ k: 'shake', t: 0.4, a: 6, dec: 4 }] });

  // ===== PAGE 8 — FWOM: Red fired into the sky / "MAHORAGA!!" =====
  S({ p: 'p08d', d: 3.8, trans: { k: 'flash', d: 0.2, c: '200,150,255' }, cam: [[0, 0.6, 0.6, 1.0], [1.4, 0.6, 0.55, 1.05], [3.8, 0.55, 0.12, 1.1]], fg: { par: 0.06, breathe: 0.01, warp: { amp: 0.9, freq: 0.1, speed: 9, y0: 0, y1: 0.7 } },
    fx: [{ k: 'glow', x: 650, y: 760, r: 150, c: PURPLE, a: 0.8, pulse: 0.3, flick: 0.4 }, { k: 'glow', x: 640, y: 160, r: 220, c: '255,120,200', a: 0.7, t0: 1.5, pulse: 0.3, flick: 0.5 }, { k: 'speed', ang: -Math.PI / 2, a: 0.35, t0: 1.6, t1: 3.8, layer: 'screen', c: 'rgba(230,200,255,0.9)' }, { k: 'shake', t: 1.6, a: 16, dec: 5 }, { k: 'flash', t: 1.6, c: '220,170,255', a: 0.7, dec: 5, layer: 'screen' }] });
  S({ p: 'p08a', d: 2.0, trans: wipe(1.57, 0.3), cam: [[0, 0.45, 0.45, 1.0], [2.0, 0.42, 0.42, 1.12]], fg: { par: 0.08 } });
  S({ p: 'p08b', d: 1.3, cam: [[0, 0.5, 0.5, 1.0], [1.3, 0.55, 0.5, 1.25]], fx: [{ k: 'glow', x: 310, y: 480, r: 40, c: RED, a: 0.6, pulse: 0.5 }] });
  S({ p: 'p08c', d: 2.6, cam: [[0, 0.55, 0.3, 1.15], [0.2, 0.5, 0.4, 1.0, J.eoBack], [2.6, 0.5, 0.42, 1.05]], tx: [0.15, 0.7], fg: { par: 0.05, grow: 0.04 },
    fx: [{ k: 'shake', t: 0.15, a: 22, dec: 3 }, { k: 'focus', a: 0.35, r: 260, t0: 0.15, layer: 'screen' }] });

  // ===== PAGE 9 — Azure was waiting =====
  S({ p: 'p09a', d: 6.0, trans: { k: 'fade', d: 0.4 }, cam: [[0, 0.6, 0.3, 1.25], [2.2, 0.55, 0.42, 1.15], [6.0, 0.55, 0.78, 1.15]], tx: [0.5, 3.0], orb: [{ spin: -0.6, pulse: 0.03 }],
    fg: { par: 0.1, drift: [10, 22] },
    fx: [{ k: 'glow', x: 570, y: 735, r: 240, c: PURPLE, a: 0.55, pulse: 0.15, layer: 'mid' }, { k: 'suck', x: 570, y: 735, r: 130, c: '200,140,255', n: 70, dir: -1, layer: 'mid' }, { k: 'motes', x: 570, y: 735, w: 500, h: 300, n: 30, c: '220,200,180', a: 0.6, op: 'source-over' }] });
  S({ p: 'p09b', d: 6.2, trans: { k: 'fade', d: 0.3 }, cam: [[0, 0.5, 0.5, 1.0], [6.2, 0.5, 0.5, 1.05]], tx: [4.7, 3.3, 1.9, 0.4] });

  // ===== PAGE 10 — slingshot between Mahoraga and Azure; adaptation backfired =====
  S({ p: 'p10a', d: 4.2, trans: { k: 'flash', d: 0.18, c: '170,120,255' }, cam: [[0, 0.25, 0.1, 1.25], [4.2, 0.55, 0.4, 1.05]], tx: [2.0, 0.4], fg: { par: 0.12, drift: [30, 16] },
    fx: [{ k: 'speed', ang: 0.6, a: 0.4, t0: 0, t1: 3.0, layer: 'screen', c: 'rgba(200,170,255,0.9)' }, { k: 'glow', x: 550, y: 265, r: 50, c: RED, a: 0.8, pulse: 0.6, hz: 8 }, { k: 'glow', x: 230, y: 30, r: 160, c: PURPLE, a: 0.5 }] });
  S({ p: 'p10b', d: 1.6, trans: wipe(1.9, 0.25), cam: [[0, 0.2, 0.5, 1.15], [1.6, 0.75, 0.6, 1.05]], fx: [{ k: 'speed', ang: 0.3, a: 0.5, t0: 0, t1: 1.4, layer: 'screen' }, { k: 'flash', t: 0.3, a: 0.4, layer: 'screen' }] });
  S({ p: 'p10d', d: 3.2, trans: { k: 'fade', d: 0.25 }, cam: [[0, 0.5, 0.3, 1.0], [3.2, 0.5, 0.35, 1.04]], tx: [0.3, null] });
  S({ p: 'p10c', d: 2.2, cam: [[0, 0.4, 0.4, 1.0], [2.2, 0.42, 0.4, 1.15]], fg: { par: 0.08, breathe: 0.01 }, fx: [{ k: 'shake', t: 1.7, a: 6, dec: 5 }] });
  S({ p: 'p10d', name: 'p10d-2', d: 2.8, trans: { k: 'fade', d: 0.25 }, cam: [[0, 0.5, 0.75, 1.0], [2.8, 0.5, 0.72, 1.06]], tx: [0, 0.3] });

  // ===== PAGE 11 — KRAK / Piercing Blood =====
  S({ p: 'p11a', d: 2.8, trans: { k: 'flash', d: 0.12 }, cam: [[0, 0.32, 0.38, 1.3], [0.3, 0.3, 0.32, 1.38, J.eo], [2.8, 0.45, 0.4, 1.05]], holds: [[0.3, 0.12]], fg: { par: 0.08 },
    fx: [...hit(0.3, 34), { k: 'glow', x: 200, y: 150, r: 150, c: RED, a: 0.6, t0: 0.3, t1: 2.2 }, { k: 'debris', t: 0.3, x: 210, y: 160, n: 40, v: 650, sp: 5 }] });
  S({ p: 'p11c', d: 4.0, trans: wipe(1.37, 0.3), cam: [[0, 0.5, 0.35, 1.1], [4.0, 0.45, 0.6, 1.08]], tx: [0.3, 1.9], fg: { par: 0.08, dof: 2 },
    fx: [{ k: 'glow', x: 580, y: 880, r: 70, c: '255,80,90', a: 0.6, pulse: 0.6, t0: 1.4 }] });
  S({ p: 'p11b', d: 2.6, trans: wipe(1.9, 0.3), cam: [[0, 0.3, 0.55, 1.2], [2.6, 0.75, 0.25, 1.05]], fg: { par: 0.08 },
    fx: [{ k: 'speed', ang: -0.75, a: 0.45, t0: 0.1, t1: 2.2, layer: 'screen' }, { k: 'glow', x: 300, y: 760, r: 90, c: '255,90,110', a: 0.7, pulse: 0.5, hz: 10 }, { k: 'shake', t: 0.2, a: 10, dec: 4 }] });

  // ===== PAGE 12 — the kick, Red, "Too late." / Azure chant =====
  S({ p: 'p12a', d: 2.1, trans: { k: 'flash', d: 0.12 }, cam: [[0, 0.2, 0.5, 1.2], [0.35, 0.42, 0.5, 1.25, J.eo], [2.1, 0.45, 0.5, 1.08]], holds: [[0.35, 0.1]], fg: { par: 0.1 },
    fx: [...hit(0.35, 28), { k: 'speed', ang: 0, a: 0.5, t0: 0, t1: 2, layer: 'screen' }] });
  S({ p: 'p12b', d: 2.0, cam: [[0, 0.3, 0.6, 1.1], [2.0, 0.62, 0.35, 1.18]], orb: [{ spin: 1.2, pulse: 0.06 }],
    fx: [{ k: 'glow', x: 470, y: 410, r: 200, c: '200,120,255', a: 0.8, pulse: 0.3, flick: 0.4 }, { k: 'speed', ang: -0.3, a: 0.35, t0: 0, t1: 2, layer: 'screen' }] });
  S({ p: 'p12c', d: 2.2, trans: wipe(1.47, 0.25), cam: [[0, 0.5, 0.5, 1.0], [2.2, 0.48, 0.55, 1.15]], tx: [0.5], fg: { par: 0.06 } });
  S({ p: 'p12d', d: 5.0, trans: { k: 'fade', d: 0.3 }, cam: [[0, 0.3, 0.3, 1.1], [1.5, 0.65, 0.3, 1.1], [3.0, 0.4, 0.8, 1.15], [5.0, 0.38, 0.75, 1.25]], tx: [0.3, 1.5, 3.2, 2.4], fg: { par: 0.07 },
    fx: [{ k: 'glow', x: 180, y: 935, r: 50, c: RED, a: 0.7, pulse: 0.5, t0: 3.0 }] });
  S({ p: 'p12e', d: 1.6, cam: [[0, 0.5, 0.5, 1.0], [1.6, 0.55, 0.55, 1.2]], fx: [{ k: 'glow', x: 650, y: 1010, r: 60, c: '120,220,255', a: 0.85, pulse: 0.5, t0: 0.3 }, { k: 'sparks', t: 0.35, x: 655, y: 1005, n: 14, c: '#dff', v: 120, life: 0.5 }] });

  // ===== PAGE 13 — Azure swallows the blood; the Purple chant =====
  S({ p: 'p13a', d: 2.6, tx: [null], trans: { k: 'flash', d: 0.15, c: '120,200,255' }, cam: [[0, 0.75, 0.15, 1.15], [2.6, 0.2, 0.7, 1.15]], orb: [{ spin: 0.6, pulse: 0.03 }, { spin: 0.4 }],
    fx: [{ k: 'glow', x: 175, y: 295, r: 180, c: BLUE, a: 0.5, layer: 'mid' }, { k: 'suck', x: 175, y: 295, r: 100, c: '160,220,255', n: 50, layer: 'mid' }, { k: 'speed', ang: 2.7, a: 0.3, t0: 0, t1: 2.4, layer: 'screen' }] });
  S({ p: 'p13b', d: 2.2, trans: wipe(1.4, 0.25), cam: [[0, 0.5, 0.35, 1.05], [2.2, 0.6, 0.45, 1.2]], orb: [{ spin: 1.0, pulse: 0.05 }],
    fx: [{ k: 'glow', x: 695, y: 450, r: 150, c: BLUE, a: 0.6, pulse: 0.3 }, { k: 'suck', x: 695, y: 450, r: 75, c: '255,90,110', n: 40, spd: 1.4 }, { k: 'shake', t: 0.1, a: 12, dec: 4 }] });
  S({ p: 'p13c', d: 4.0, trans: wipe(1.37, 0.3), cam: [[0, 0.6, 0.4, 1.1], [4.0, 0.5, 0.6, 1.05]], tx: [2.1, 0.4], fg: { par: 0.08 } });
  S({ p: 'p13d', d: 5.6, trans: wipe(1.4, 0.35), fit: 'cover', cam: [[0, 0.75, 0.3, 1.15], [5.6, 0.3, 0.6, 1.1]], tx: [0.5, 1.7, 2.9, 4.1],
    fx: [{ k: 'tint', c: '120,60,200', a: 0.25, op: 'multiply', t0: 3.0, in: 2.5 }, { k: 'flicker', c: '200,150,255', a: 0.12, p: 0.85, t0: 3.5 }] });

  // ===== PAGE 14 — "You were right." / HOLLOW PURPLE / "Purple." =====
  S({ p: 'p14b', d: 3.0, trans: { k: 'fade', d: 0.4 }, cam: [[0, 0.5, 0.5, 1.0], [3.0, 0.6, 0.55, 1.1]], tx: [1.4, 0.3] });
  S({ p: 'p14a', d: 3.4, trans: wipe(0, 0.3, -1), cam: [[0, 0.4, 0.5, 1.0], [3.4, 0.35, 0.55, 1.15]], tx: [0.4], fg: { par: 0.05 } });
  S({ p: 'p14c', d: 2.2, trans: { k: 'flash', d: 0.25, c: '190,120,255' }, fit: 'cover', cam: [[0, 0.5, 0.5, 1.0], [2.2, 0.5, 0.5, 1.12]],
    fx: [{ k: 'flicker', c: '200,120,255', a: 0.4, p: 0.6 }, { k: 'glow', x: 380, y: 500, r: 300, c: PURPLE, a: 0.5, pulse: 0.3, flick: 0.6 }, { k: 'shake', t: 0, a: 6, dec: 2 }] });
  // triptych: Mahoraga, Sukuna, then Gojo's "Purple."
  S({ p: 'p14f', d: 1.6, cam: [[0, 0.5, 0.35, 1.0], [1.6, 0.5, 0.4, 1.15]], fx: [{ k: 'glow', x: 690, y: 800, r: 60, c: '255,160,40', a: 0.8, pulse: 0.5 }] });
  S({ p: 'p14d', d: 1.6, trans: wipe(0, 0.25, -1), cam: [[0, 0.5, 0.4, 1.0], [1.6, 0.5, 0.42, 1.15]], fg: { par: 0.05 } });
  S({ p: 'p14e', d: 3.4, trans: wipe(0, 0.25, -1), cam: [[0, 0.5, 0.55, 1.0], [3.4, 0.5, 0.5, 1.25]], tx: [0.9], fg: { par: 0.06, breathe: 0.01, rim: 'rgba(190,130,255,0.9)' },
    fx: [{ k: 'glow', x: 362, y: 880, r: 120, c: '150,220,255', a: 0.45, pulse: 0.3, t0: 1.2 }, { k: 'tint', c: '160,90,255', a: 0.35, op: 'screen', t0: 2.2, in: 1.2 }, { k: 'flash', t: 3.2, c: '210,160,255', a: 1, dec: 2, layer: 'screen' }] });

  // ===== PAGE 15 — KTOOM: Hollow Purple tears through =====
  S({ p: 'p15b', d: 3.0, trans: { k: 'flash', d: 0.3, c: '230,190,255' }, cam: [[0, 0.5, 0.15, 1.15], [3.0, 0.42, 0.75, 1.05]], holds: [[0.15, 0.12]],
    fx: [...hit(0.15, 46), { k: 'impact', t: 0.6, n: 1, mode: 2 }, { k: 'glow', x: 480, y: 280, r: 380, c: PURPLE, a: 0.7, pulse: 0.2, flick: 0.5 }, { k: 'debris', t: 0.2, x: 490, y: 500, n: 60, v: 900, sp: 2.6, s: [3, 14] }, { k: 'flicker', c: '210,150,255', a: 0.3, p: 0.6 }] });
  S({ p: 'p15a', d: 2.2, trans: wipe(1.66, 0.25, -1), cam: [[0, 0.5, 0.15, 1.1], [2.2, 0.5, 0.8, 1.05]],
    fx: [{ k: 'shake', t: 0.2, a: 20, dec: 5 }, { k: 'shake', t: 0.8, a: 20, dec: 5 }, { k: 'shake', t: 1.4, a: 20, dec: 5 }, { k: 'debris', t: 0.2, x: 170, y: 450, n: 30, v: 500 }, { k: 'tint', c: '150,90,255', a: 0.25, op: 'screen' }] });
  S({ p: 'p15c', d: 4.0, trans: wipe(1.45, 0.3), fit: 'cover', cam: [[0, 0.6, 0.5, 1.0], [4.0, 0.4, 0.5, 1.06]], tx: [1.9, 0.4], fx: [{ k: 'shake', t: 0, a: 4, dec: 0.5 }, { k: 'tint', c: '140,90,255', a: 0.2, op: 'screen' }] });
  S({ p: 'p15d', d: 2.6, trans: wipe(1.43, 0.3), cam: [[0, 0.6, 0.35, 1.25], [2.6, 0.45, 0.5, 1.05]], tx: [0.3],
    fx: [{ k: 'shake', t: 0.1, a: 16, dec: 4 }, { k: 'debris', t: 0.1, x: 470, y: 960, n: 40, v: 500, ang: -2.6, sp: 1.5, c: '#bcd' }, { k: 'speed', ang: Math.PI, a: 0.3, t0: 0, t1: 1.6, layer: 'screen' }] });

  // ===== PAGES 16–17 — the blast wave; the wheel is erased =====
  S({ p: 'p16a', d: 3.6, trans: { k: 'flash', d: 0.5 }, cam: [[0, 0.2, 0.5, 1.3], [3.6, 0.55, 0.5, 1.0]],
    fx: [{ k: 'shake', t: 0, a: 30, dec: 1.2 }, { k: 'flash', t: 0, a: 0.9, dec: 2, layer: 'screen' }, { k: 'glow', x: 80, y: 450, r: 520, c: '200,240,255', a: 0.8, pulse: 0.2, flick: 0.4 }, { k: 'ring', t: 0.2, x: 80, y: 450, r: 1100, d: 1.6, w: 40, c: '210,240,255' }, { k: 'debris', t: 0, x: 120, y: 450, n: 80, v: 1000, ang: 0, sp: 1.6, g: 200, s: [2, 10] }] });
  S({ p: 'p16b', d: 2.6, trans: wipe(1.57, 0.3), cam: [[0, 0.4, 0.45, 1.15], [2.6, 0.5, 0.5, 1.0]], orb: [{ spin: 2.4, pulse: 0.04 }],
    fx: [{ k: 'glow', x: 362, y: 1000, r: 140, c: '140,210,255', a: 0.6, pulse: 0.4, flick: 0.6, layer: 'mid' }, { k: 'shake', t: 0, a: 10, dec: 1 }, { k: 'sparks', t: 0.2, x: 362, y: 1000, n: 30, c: '#9df', v: 300 }, { k: 'flash', t: 2.1, c: '230,200,255', a: 1, dec: 1.5, layer: 'screen' }] });
  S({ p: 'p17a', d: 3.4, trans: { k: 'flash', d: 0.35, c: '230,200,255' }, cam: [[0, 0.7, 0.45, 1.2], [3.4, 0.5, 0.55, 1.0]],
    fx: [{ k: 'shake', t: 0, a: 24, dec: 1.4 }, { k: 'glow', x: 650, y: 430, r: 420, c: '200,170,255', a: 0.6, pulse: 0.25, flick: 0.3 }, { k: 'ring', t: 0.1, x: 650, y: 430, r: 900, d: 1.5, w: 30, c: '220,190,255' }, { k: 'debris', t: 0, x: 600, y: 450, n: 60, v: 800, ang: Math.PI, sp: 1.8, g: 200 }] });
  S({ p: 'p17b', d: 2.8, trans: wipe(1.57, 0.3), cam: [[0, 0.75, 0.5, 1.1], [2.8, 0.2, 0.5, 1.1]], orb: [],
    fx: [{ k: 'speed', ang: Math.PI, a: 0.4, t0: 0, t1: 2.8, layer: 'screen', c: 'rgba(230,210,190,0.8)' }, { k: 'shake', t: 0, a: 8, dec: 0.6 }, { k: 'fade', t0: 2.2, t1: 2.8, c: '0,0,0', out: true, layer: 'screen' }] });

  // ===== PAGE 18 — silence: the flattened district, Sukuna broken =====
  S({ p: 'p18a', d: 4.2, bgWarp: { amp: 1.0, freq: 0.12, speed: 3, strip: 3 }, trans: { k: 'fade', d: 0.6 }, cam: [[0, 0.2, 0.5, 1.1], [4.2, 0.8, 0.5, 1.1]],
    fx: [{ k: 'motes', x: 360, y: 160, w: 650, h: 320, n: 60, c: '255,160,70', s: 1.8 }, { k: 'glow', x: 560, y: 90, r: 120, c: '255,120,40', a: 0.35, pulse: 0.3, flick: 0.4 }] });
  S({ p: 'p18b', d: 2.4, trans: { k: 'fade', d: 0.3 }, cam: [[0, 0.35, 0.5, 1.1], [2.4, 0.45, 0.5, 1.15]], fx: [{ k: 'shake', t: 0.5, a: 6, dec: 5 }, { k: 'debris', t: 0.5, x: 330, y: 470, n: 14, v: 160, g: 500, c: '#5a4a40' }] });
  S({ p: 'p18c', d: 4.6, trans: { k: 'fade', d: 0.4 }, cam: [[0, 0.5, 0.2, 1.2], [4.6, 0.45, 0.6, 1.0]], fg: { par: 0.05, breathe: 0.012, period: 2.4, dof: 1.5 },
    fx: [{ k: 'motes', x: 420, y: 860, w: 760, h: 640, n: 40, c: '255,170,90', s: 1.4, a: 0.6 }] });

  // ===== PAGE 19 — "Gojo won." =====
  S({ p: 'p19c', d: 4.2, trans: { k: 'fade', d: 0.35 }, cam: [[0, 0.5, 0.3, 1.0], [4.2, 0.5, 0.7, 1.0]], tx: [0.4, null], fg: { par: 0.06 } });
  S({ p: 'p19a', d: 3.4, trans: wipe(0, 0.3, -1), cam: [[0, 0.65, 0.5, 1.0], [3.4, 0.4, 0.5, 1.08]], tx: [1.7, 0.3] });
  S({ p: 'p19b', d: 3.8, trans: wipe(1.57, 0.3), cam: [[0, 0.45, 0.4, 1.0], [3.8, 0.42, 0.42, 1.15]], tx: [1.9, 0.3], fg: { par: 0.06, breathe: 0.008, dof: 2 } });
  S({ p: 'p19d', d: 5.0, trans: wipe(1.57, 0.3), cam: [[0, 0.8, 0.5, 1.0], [5.0, 0.25, 0.5, 1.0]], tx: [2.2, 3.7, 0.3], fg: { par: 0.06 } });
  S({ p: 'p19e', d: 2.8, trans: wipe(1.57, 0.3), cam: [[0, 0.8, 0.5, 1.0], [2.8, 0.25, 0.5, 1.0]], tx: [1.5, 0.3] });
  S({ p: 'p19f', d: 6.0, trans: { k: 'fade', d: 0.5 }, cam: [[0, 0.35, 0.4, 1.0], [6.0, 0.32, 0.38, 1.25]], tx: [1.6], fg: { par: 0.07, breathe: 0.008, dof: 2.5 },
    fx: [{ k: 'glow', x: 230, y: 975, r: 50, c: '120,220,255', a: 0.8, pulse: 0.5, t0: 0.8 }, { k: 'tint', c: '255,255,255', a: 0.0 }] });
  S({ name: 'end', page: 19, d: 4.0, trans: { k: 'fade', d: 0.3 }, cam: [[0, 0.475, 0.855, 2.05], [2.6, 0.5, 0.5, 1.0, J.eio], [4.0, 0.5, 0.5, 0.98]], fx: [{ k: 'fade', t0: 3.0, t1: 4.0, c: '0,0,0', out: true }] });
})(window.J);
