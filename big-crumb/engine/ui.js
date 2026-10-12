// "Picnic Sticker" overlay UI: die-cut stickers, grab dots, chat pills, comic words.
// All functions return HTML strings (or place pins) as a pure function of time.
import { THREE, W, H, CSS } from './render.js';
import { seg, easeBack, easeOut, sstep } from './anim.js';

const _p = new THREE.Vector3();
export function project(camera, pos) {
  _p.copy(pos.isVector3 ? pos : new THREE.Vector3(...pos)).project(camera);
  return { x: (_p.x * 0.5 + 0.5) * W, y: (-_p.y * 0.5 + 0.5) * H, behind: _p.z > 1 };
}
export function worldOf(obj, local = [0, 0, 0]) {
  obj.updateWorldMatrix(true, false);
  return obj.localToWorld(new THREE.Vector3(...local));
}

const fadeWin = (lt, t0, t1, fin = 0.1, fout = 0.12) => (lt < t0 || lt > t1 ? 0 : Math.min(seg(lt, t0, t0 + fin), 1 - seg(lt, t1 - fout, t1)));

// Big rules sticker (the "tell" in tell-show-repeat). pos: bl | tl | br | c
export function sticker(lt, t0, t1, text, { pos = 'bl', size = 78, color = '#2a1730', bg = '#fff7e8', rot = -4, sub = '' } = {}) {
  if (lt < t0 || lt > t1) return '';
  const pop = easeBack(seg(lt, t0, t0 + 0.3));
  const out = seg(lt, t1 - 0.14, t1);
  const sc = (0.4 + 0.6 * pop) * (1 - out * 0.4);
  const op = Math.min(1, pop * 2) * (1 - out);
  const wob = Math.sin((lt - t0) * 2.2) * 0.6;
  const tx = pos === 'c' ? 'translate(-50%,-50%) ' : '';
  return `<div class="stk stk-${pos}" style="opacity:${op};transform:${tx}scale(${sc}) rotate(${rot + wob}deg);font-size:${size}px;color:${color};--bg:${bg}">${text}${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

// Grab dots above food: ring per spot; filled = ant colour (0..1 fill progress each).
export function grabDots(camera, food, fills, lt = 0, { pulse = true } = {}) {
  const out = [];
  food.userData.grabs.forEach((g, i) => {
    const p = project(camera, worldOf(food, g.map((v, j) => v / food.scale.getComponent(j))));
    if (p.behind) return;
    const f = fills[i] || null;
    const col = f ? CSS[f.who] : '#ffffff';
    const k = f ? easeBack(seg(lt, f.t, f.t + 0.25)) : 0;
    const pul = pulse && !f ? 1 + Math.sin(lt * 6 + i) * 0.06 : 1 + (f ? Math.max(0, 1 - (lt - f.t) * 4) * 0.35 : 0);
    out.push(`<div class="gdot ${f && k > 0.5 ? 'on' : ''}" style="left:${p.x}px;top:${p.y}px;--c:${col};transform:translate(-50%,-50%) scale(${pul})"><i style="transform:scale(${k})"></i></div>`);
  });
  return out.join('');
}

// Onomatopoeia sticker pinned to a world point.
export function word(camera, pos, lt, t0, text, { dur = 0.75, color = '#fff7e8', ink = '#2a1730', rot = -8, size = 70 } = {}) {
  const u = (lt - t0) / dur;
  if (u < 0 || u > 1) return '';
  const p = project(camera, pos);
  const sc = 0.3 + easeBack(seg(u, 0, 0.22)) * 0.75 + u * 0.08;
  const op = 1 - sstep(0.75, 1, u);
  return `<div class="word" style="left:${p.x}px;top:${p.y}px;opacity:${op};color:${color};-webkit-text-stroke-color:${ink};font-size:${size}px;transform:translate(-50%,-50%) rotate(${rot}deg) scale(${sc})">${text}</div>`;
}

// Name tag over an ant (used sparingly: first introduction only).
export function nameTag(camera, ant, lt, t0, t1, dy = 1.55) {
  const a = fadeWin(lt, t0, t1);
  if (!a) return '';
  const p = project(camera, worldOf(ant, [0, dy, 0]));
  const who = ant.userData.who;
  return `<div class="ntag" style="left:${p.x}px;top:${p.y}px;opacity:${a};--c:${CSS[who]}"><i></i>${who}</div>`;
}

// Proximity voice chat: sticker pills, newest at the bottom, up to 3 live. Muffled = far/behind grass.
export function chat(lt, lines) {
  const live = lines.filter((l) => lt >= l.t0 - 0.02 && lt <= l.t1).slice(-3);
  if (!live.length) return '';
  const rows = live.map((l) => {
    const a = Math.min(seg(lt, l.t0, l.t0 + 0.08), 1 - seg(lt, l.t1 - 0.12, l.t1));
    const pop = 0.85 + 0.15 * easeBack(seg(lt, l.t0, l.t0 + 0.2));
    const talk = 0.3 + Math.abs(Math.sin(lt * 21 + l.t0 * 7)) * 0.7;
    const c = CSS[l.who] || '#fff';
    const rot = ((l.t0 * 97) % 3) - 1.5;
    return `<div class="row" style="opacity:${a};transform:scale(${pop}) rotate(${rot}deg)"><i style="--c:${c};box-shadow:0 0 0 ${2 + talk * 4}px ${c}66"></i><b style="color:${c}">${l.who}</b><span${l.muffled ? ' class="muf"' : ''}>${l.text}</span></div>`;
  }).join('');
  return `<div class="chat">${rows}</div>`;
}

// Sun dial (the only clock). day 0 = noon .. 1 = sunset.
export function sunDial(day) {
  const a = -90 + day * 90;
  const warn = day > 0.8;
  return `<div class="dial ${warn ? 'warn' : ''}"><svg viewBox="0 0 64 40"><path d="M4 36 A28 28 0 0 1 60 36" fill="none" stroke="#2a1730" stroke-width="5" stroke-linecap="round" opacity=".18"/>
    <path d="M4 36 A28 28 0 0 1 60 36" fill="none" stroke="${warn ? '#ff7a4a' : '#ffc93c'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(day * 88).toFixed(1)} 200"/>
    <g transform="translate(32 36) rotate(${a})"><circle cx="0" cy="-28" r="7" fill="${warn ? '#ff7a4a' : '#ffc93c'}" stroke="#2a1730" stroke-width="2.5"/></g></svg></div>`;
}

// Queen's belly sticker (only near the nest).
export function bellyMeter(fill, lt = 0, bump = -9) {
  const k = 1 + Math.max(0, 1 - (lt - bump) * 3) * 0.25;
  return `<div class="belly" style="transform:scale(${k})"><span class="q">👑</span><div class="bar"><i style="width:${Math.round(fill * 100)}%"></i></div></div>`;
}

export function flash(a, color = '#fff') { return a > 0 ? `<div class="flash" style="opacity:${a};background:${color}"></div>` : ''; }
export function bars(k) { // letterbox for the climax
  if (k <= 0) return '';
  const h = Math.round(k * 64);
  return `<div class="lbox" style="top:0;height:${h}px"></div><div class="lbox" style="bottom:0;height:${h}px"></div>`;
}
export function fadeBlack(a) { return a > 0 ? `<div class="flash" style="opacity:${a};background:#140a12"></div>` : ''; }

// Logo: BIG CRUMB with a bite out of the B. letters can drop in individually.
export function logo(lt, t0, { size = 150, drop = true } = {}) {
  const letters = 'BIG CRUMB'.split('');
  const html = letters.map((ch, i) => {
    if (ch === ' ') return '<span class="sp"></span>';
    const tt = t0 + i * 0.035;
    const u = seg(lt, tt, tt + 0.32);
    const y = drop ? (1 - easeBack(u)) * -120 : 0;
    const r = (i % 2 ? 3 : -3) * (1 - u);
    return `<span class="ch ${i === 0 ? 'bite' : ''}" style="opacity:${Math.min(1, u * 3)};transform:translateY(${y}px) rotate(${r}deg)">${ch}</span>`;
  }).join('');
  return `<div class="logo" style="font-size:${size}px">${html}</div>`;
}
