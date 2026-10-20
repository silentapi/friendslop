// Overlay HTML as a pure function of time: TikTok captions, real-place tags, in-game HUD, order card, title.
import { THREE, W, H, seg, easeOut, easeBack, sstep, clamp } from './core.js';

const _p = new THREE.Vector3();
export function project(camera, pos) {
  _p.copy(pos).project(camera);
  return { x: (_p.x * 0.5 + 0.5) * W, y: (-_p.y * 0.5 + 0.5) * H, behind: _p.z > 1 };
}
const win = (lt, t0, t1, fin = 0.08, fout = 0.1) => (lt < t0 || lt > t1 ? 0 : Math.min(seg(lt, t0, t0 + fin), 1 - seg(lt, t1 - fout, t1)));

// Caption: words pop in one at a time (spacing `per` s). Mark words: *gold*  _green_  ~red~
export function caption(lt, t0, t1, text, { y = 330, size = 64, per = 0.07, out = 0.1 } = {}) {
  if (lt < t0 || lt > t1) return '';
  const words = text.split(' ');
  const fo = 1 - seg(lt, t1 - out, t1);
  const html = words.map((w, i) => {
    if (w === '/') return '<br>';
    const k = seg(lt, t0 + i * per, t0 + i * per + 0.16);
    if (k <= 0) return `<span class="w" style="opacity:0">${clean(w)}</span>`;
    const sc = 0.55 + 0.45 * easeBack(k);
    const cls = w.startsWith('*') ? 'hi' : w.startsWith('_') ? 'gr' : w.startsWith('~') ? 'rd' : '';
    return `<span class="w ${cls}" style="transform:scale(${sc}) translateY(${(1 - easeOut(k)) * 18}px)">${clean(w)}</span>`;
  }).join(' ');
  return `<div class="cap" style="top:${y}px;font-size:${size}px;opacity:${fo}">${html}</div>`;
}
const clean = (w) => w.replace(/^[*_~]|[*_~]$/g, '').replace(/[*_~](?=[^\w]*$)/g, '');

// Real-place tag: green bar grows, name types on, sub-line fades.
export function place(lt, t0, t1, name, sub = 'Downtown Orlando, FL', { top = 170 } = {}) {
  const a = win(lt, t0, t1, 0.05, 0.12);
  if (!a) return '';
  const k = easeOut(seg(lt, t0, t0 + 0.3));
  const n = Math.round(seg(lt, t0 + 0.05, t0 + 0.05 + name.length * 0.025) * name.length);
  const s = seg(lt, t0 + 0.25, t0 + 0.5);
  return `<div class="loc" style="top:${top}px;opacity:${a};transform:translateX(${(1 - k) * -30}px)"><div class="bar" style="transform:scaleY(${k})"></div><div><div class="t1">${name.slice(0, n)}<span style="opacity:0">${name.slice(n)}</span></div><div class="t2" style="opacity:${s}"><b>●</b> REAL LOCATION · ${sub}</div></div></div>`;
}

// Game HUD: countdown + earnings. secs < 20 → urgent.
export function hudTop(secs, tip, { a = 1, pulse = 0, tipLost = 0 } = {}) {
  if (a <= 0) return '';
  const late = secs < 0;
  const v = Math.abs(secs);
  const m = Math.floor(v / 60), s = Math.floor(v % 60);
  const urgent = secs < 20;
  const sc = 1 + pulse * 0.12;
  const tc = tipLost > 0 ? '#ff4a4a' : '#06C167';
  return `<div class="hudtop" style="opacity:${a}">
    <div class="pill ${urgent ? 'urgent' : ''}" style="transform:scale(${sc})"><span class="ic">◷</span>${late ? '<span class="lbl" style="color:#fff">LATE</span>+' : ''}${m}:${String(s).padStart(2, '0')}</div>
    <div class="pill" style="transform:scale(${1 + tipLost * 0.15})"><span class="lbl">TIP</span><span style="color:${tc}">$${tip.toFixed(2)}</span></div>
  </div>`;
}
// iOS-style push notification sliding down from the top
export function notify(lt, t0, title, body, { y = 250 } = {}) {
  if (lt < t0) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.3));
  return `<div class="notif" style="top:${y - (1 - k) * 160}px;opacity:${Math.min(1, k * 2)}"><div class="ic"></div><div><div class="hd"><b>Uber Eats</b><span>now</span></div><div class="tt">${title}</div><div class="bd">${body}</div></div></div>`;
}
// $40.00 struck through, then $0.00 slams in
export function tipZero(lt, t0, { y = 760 } = {}) {
  if (lt < t0 - 0.35) return '';
  const strike = seg(lt, t0 - 0.35, t0 - 0.1);
  const z = easeBack(seg(lt, t0, t0 + 0.25));
  return `<div class="tipz" style="top:${y}px"><div class="old">$40.00<i style="width:${strike * 100}%"></i></div>${lt > t0 ? `<div class="new" style="transform:scale(${z})">$0.00</div>` : ''}</div>`;
}
export function stamp(lt, t0, text, { y = 650 } = {}) {
  if (lt < t0) return '';
  const k = seg(lt, t0, t0 + 0.12);
  return `<div class="stamp" style="top:${y}px;opacity:${k};transform:translateX(-50%) rotate(-8deg) scale(${1.8 - 0.8 * k})">${text}</div>`;
}
// Score pop-up at a screen point.
export function toast(lt, t0, x, y, text, small = '', { dur = 0.9, color = '#fff' } = {}) {
  const u = (lt - t0) / dur;
  if (u < 0 || u > 1) return '';
  const sc = 0.4 + easeBack(seg(u, 0, 0.25)) * 0.6;
  const op = 1 - sstep(0.7, 1, u);
  return `<div class="toast" style="left:${x}px;top:${y - u * 50}px;opacity:${op};color:${color};transform:translate(-50%,-50%) scale(${sc}) rotate(-4deg)">${text}${small ? `<small>${small}</small>` : ''}</div>`;
}
export function orderCard(lt, t0, { accept = 1e9, y = 700 } = {}) {
  if (lt < t0) return '';
  const k = easeBack(seg(lt, t0, t0 + 0.3));
  const f = clamp((lt - (accept - 0.35)) / 0.35);
  const done = lt > accept;
  const out = seg(lt, accept + 0.12, accept + 0.3);
  return `<div class="order" style="top:${y + (1 - k) * 200 + out * 40}px;opacity:${Math.min(1, k * 1.5) * (1 - out)};transform:scale(${(0.85 + 0.15 * k) * (1 + (done ? 0.04 * (1 - out) : 0))})">
    <div class="hd"><div class="app">Uber <b>Eats</b></div><div class="new">NEW ORDER</div></div>
    <div class="bd">
      <div class="pay">$47.80<span>INCL. $40 TIP</span></div>
      <div class="route"><i></i><div>Starbucks · Orange Ave</div><i class="sq"></i><div>CitiTower · Floor 20</div><div class="sub">101 Lake Ave · 0.9 mi · 8 min</div></div>
      <div class="note"><b>Kyle:</b> “1 venti iced caramel macchiato. pls hurry 🙏”</div>
      <div class="btn"><div class="fill" style="width:${f * 100}%"></div><span>${done ? 'ACCEPTED ✓' : 'HOLD TO ACCEPT'}</span></div>
    </div></div>`;
}
export function stars(lt, t0, n = 5, { y = 600, size = 64, off = 0 } = {}) {
  if (lt < t0) return '';
  const s = Array.from({ length: 5 }, (_, i) => {
    const k = easeBack(seg(lt, t0 + i * 0.07, t0 + i * 0.07 + 0.25));
    const isOff = i >= n;
    return `<i class="${isOff ? 'off' : ''}" style="transform:scale(${k}) rotate(${(1 - k) * -40}deg)">★</i>`;
  }).join('');
  return `<div class="rate" style="top:${y}px;font-size:${size}px;opacity:${1 - off}">${s}</div>`;
}
export function bars(k, h = 120) { return k > 0 ? `<div class="bars" style="top:0;height:${h * k}px"></div><div class="bars" style="bottom:0;height:${h * k}px"></div>` : ''; }
