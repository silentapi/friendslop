// Overlays as pure functions of time → HTML. TikTok captions, place tags, Gobbl app UI, mobile game HUD.
import { THREE, OUT_W, OUT_H, seg, easeOut, easeBack, clamp } from './core.js';

const _p = new THREE.Vector3();
export function project(camera, pos) { _p.copy(pos).project(camera); return { x: (_p.x * 0.5 + 0.5) * OUT_W, y: (-_p.y * 0.5 + 0.5) * OUT_H, behind: _p.z > 1 }; }
const inOut = (lt, t0, t1, fi = 0.1, fo = 0.12) => (lt < t0 || lt > t1 ? 0 : Math.min(seg(lt, t0, t0 + fi), 1 - seg(lt, t1 - fo, t1)));

// Caption: words pop one by one (TikTok auto-caption feel). Markup: *yellow* ~red~ _green_ ; "/" = line break.
export function caption(lt, t0, t1, text, { y = 300, size = 64, per = 0.06 } = {}) {
  const a = inOut(lt, t0, t1, 0.01, 0.1);
  if (!a) return '';
  const words = text.split(' ');
  const html = words.map((w, i) => {
    if (w === '/') return '<br>';
    const k = seg(lt, t0 + i * per, t0 + i * per + 0.12);
    const cls = /^\*/.test(w) ? 'y' : /^~/.test(w) ? 'r' : /^_/.test(w) ? 'g' : '';
    const t = w.replace(/^[*~_]|[*~_](?=[^\w]*$)/g, '');
    return `<span class="l ${cls}" style="opacity:${k > 0 ? 1 : 0};display:inline-block;transform:scale(${0.7 + 0.3 * easeBack(k)})">${t}</span>`;
  }).join(' ');
  return `<div class="cap" style="top:${y}px;font-size:${size}px;opacity:${a}">${html}</div>`;
}
export function capbox(lt, t0, t1, text, { y = 300, size = 46 } = {}) {
  const a = inOut(lt, t0, t1, 0.06, 0.1); if (!a) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.2));
  return `<div class="capbox" style="top:${y}px;font-size:${size}px;opacity:${a};transform:translateX(-50%) scale(${0.85 + 0.15 * k})">${text}</div>`;
}
export function place(lt, t0, t1, name, sub, { top = 270 } = {}) {
  const a = inOut(lt, t0, t1, 0.12, 0.12); if (!a) return '';
  const k = easeOut(seg(lt, t0, t0 + 0.3));
  return `<div class="loc" style="top:${top}px;opacity:${a};transform:translateX(${(1 - k) * -40}px)"><div class="pin">📍</div><div><div class="t1">${name}</div><div class="t2">${sub}</div></div></div>`;
}
// ---- Gobbl app
export function orderCard(lt, t0, accept, { y = 760, hide = 1e9 } = {}) {
  if (lt < t0 || lt > hide) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.28));
  const f = clamp((lt - (accept - 0.45)) / 0.45);
  const done = lt > accept;
  return `<div class="order" style="top:${y + (1 - k) * 160}px;opacity:${Math.min(1, k * 1.6)};transform:scale(${0.88 + 0.12 * k})">
    <div class="hd"><div class="brand">gobbl</div><div class="new">NEW ORDER</div></div>
    <div class="bd"><div class="who"><div class="av">K</div><div class="nm">Kyle S<small>Citi Tower · floor 20 · 101 Lake Ave</small></div></div>
    <div class="tip"><b>$50.00</b><span>TIP 🤑</span></div>
    <div class="note">“1 iced caramel macchiato. if ur fast 🙏”</div>
    <div class="btn"><div class="fill" style="width:${f * 100}%"></div><span>${done ? 'ACCEPTED ✓' : 'HOLD TO ACCEPT'}</span></div></div></div>`;
}
export function chat(lt, t0, t1, text, { y = 1180, who = 'Kyle S' } = {}) {
  const a = inOut(lt, t0, t1, 0.05, 0.12); if (!a) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.25));
  return `<div class="chat" style="top:${y}px;opacity:${a};transform:scale(${0.6 + 0.4 * k})"><div class="av">K</div><div class="bub"><small>${who.toUpperCase()} · GOBBL</small>${text}</div></div>`;
}
export function notif(lt, t0, t1, title, body, { y = 260 } = {}) {
  const a = inOut(lt, t0, t1, 0.05, 0.15); if (!a) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.3));
  return `<div class="notif" style="top:${y - (1 - k) * 180}px;opacity:${a}"><div class="ic">g</div><div style="flex:1"><div class="h"><b>gobbl</b><span>now</span></div><div class="t">${title}</div><div class="b">${body}</div></div></div>`;
}
export function tipChange(lt, t0, { y = 620 } = {}) {
  if (lt < t0 - 0.4) return '';
  const strike = seg(lt, t0 - 0.35, t0 - 0.08), z = easeBack(seg(lt, t0, t0 + 0.25));
  return `<div class="tipchange" style="top:${y}px"><div class="old">$50.00<i style="width:${strike * 104}%"></i></div>${lt > t0 ? `<div class="new" style="transform:scale(${z})">$0.00</div>` : ''}</div>`;
}
// ---- mobile game HUD
export function gameHud({ secs = 600, tip = 50, a = 1, swipe = null, boost = 0, btn = false, map = null, pop = null } = {}) {
  if (a <= 0) return '';
  const m = Math.floor(Math.max(0, secs) / 60), s = Math.floor(Math.max(0, secs) % 60);
  const red = secs < 60;
  return `<div class="ghud" style="opacity:${a}">
    <div class="gtop"><div class="pillg ${red ? 'red' : ''}"><span class="k">ETA</span>${m}:${String(s).padStart(2, '0')}</div><div class="pillg"><span class="k">TIP</span><span class="tipv">$${tip.toFixed(2)}</span></div></div>
    ${map ? `<div class="mini">${map}</div>` : ''}
    ${btn ? `<div class="boost" style="transform:scale(${1 - boost * 0.12})">BOOST</div>` : ''}
    ${swipe !== null ? `<div class="swipe" style="opacity:${swipe.a}"><div class="a">‹</div><div class="thumb" style="position:relative;transform:translateX(${swipe.x}px)"></div><div class="a">›</div></div>` : ''}
    ${pop || ''}
  </div>`;
}
export function pop(lt, t0, x, y, text, sub = '') {
  const u = (lt - t0) / 1.0; if (u < 0 || u > 1) return '';
  const k = easeBack(seg(u, 0, 0.25)), o = 1 - seg(u, 0.75, 1);
  return `<div class="pop" style="left:${x}px;top:${y - u * 60}px;opacity:${o};transform:translate(-50%,-50%) scale(${0.5 + 0.5 * k}) rotate(-5deg)">${text}${sub ? `<small>${sub}</small>` : ''}</div>`;
}
// minimap svg: route polyline (already in map space -1..1) + you-are-here
export function minimap(route, prog, heading = 0) {
  const pts = route.map(([x, y]) => `${(x * 0.5 + 0.5) * 100},${(y * 0.5 + 0.5) * 100}`).join(' ');
  return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1b2026"/>
    ${[15, 35, 55, 75, 95].map((v) => `<line x1="${v}" y1="0" x2="${v - 8}" y2="100" stroke="#2c333b" stroke-width="5"/><line x1="0" y1="${v}" x2="100" y2="${v + 4}" stroke="#2c333b" stroke-width="5"/>`).join('')}
    <polyline points="${pts}" fill="none" stroke="#1fd65f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="7" fill="#fff" stroke="#1fd65f" stroke-width="3"/></svg>`;
}
export const fade = (k) => (k > 0 ? `<div class="fade" style="opacity:${k}"></div>` : '');
