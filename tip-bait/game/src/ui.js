// DOM overlay: every screen is a .layer inside #ui; the HUD updates in place each frame.
const root = () => document.getElementById('ui');
const TOUCH = matchMedia('(pointer: coarse)').matches;
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const money = (v) => `$${v.toFixed(2)}`;

export function clear() { root().replaceChildren(); }
export function layer(id, html) { const el = h(`<div class="layer" id="${id}">${html}</div>`); root().appendChild(el); return el; }
export function remove(id) { document.getElementById(id)?.remove(); }

export function loading() {
  const el = layer('load', `<div class="logo">Tip<b>Bait</b></div><div class="tagline">Loading Downtown Orlando…</div><div class="bar"><i></i></div><div class="small">Map data © OpenStreetMap contributors</div>`);
  return { set(p) { el.querySelector('.bar i').style.width = `${Math.round(p * 100)}%`; } };
}

export function title({ best, orders, muted, onPlay, onMute }) {
  const el = layer('title', `
    <div class="top">
      <div class="logo">Tip<b>Bait</b></div>
      <div class="tagline">Deliver on time in real Downtown Orlando. Kyle takes the tip anyway.</div>
      <div class="chips"><span class="chip">📍 S Orange Ave</span><span class="chip">🚆 Church Street Station</span><span class="chip">🏢 <b>Citi Tower</b></span></div>
    </div>
    <div class="bottom">
      <div class="stats">${orders ? `Orders delivered: <b>${orders}</b> · Tips received: <b>$0.00</b>` : TOUCH ? 'Swipe to dodge · Swipe up to jump · Tap BOOST' : '← → dodge · ↑ / Space jump · Shift boost · M mute'}</div>
      <button class="btn" id="play">${orders ? 'NEXT ORDER' : 'START SHIFT'}${TOUCH ? '' : ' <small style="opacity:.6;font-size:14px">⏎</small>'}</button>
      <div class="small">Best time: ${best ? best : '—'} · gobbl courier #4412</div>
    </div>
    <button class="mute" id="mute" aria-label="Sound">${muted ? '🔇' : '🔊'}</button>`);
  el.querySelector('#play').onclick = onPlay;
  el.querySelector('#mute').onclick = (e) => { e.stopPropagation(); const m = onMute(); e.currentTarget.textContent = m ? '🔇' : '🔊'; };
  return el;
}

export function orderCard({ tip, note, pickup, dropoff, eta, n, onAccept }) {
  const el = layer('order', `
    <div class="card">
      <div class="hd">gobbl <span>ORDER #${n}</span></div>
      <div class="bd">
        <div class="who"><div class="av">K</div><div class="nm">Kyle S<small>Citi Tower · floor 20 · 101 Lake Ave</small></div></div>
        <div class="tip">${money(tip)}<small>TIP 🤑</small></div>
        <div class="note">“${note}”</div>
        <div class="route"><i style="background:#00704a"></i><span>Pickup · ${pickup}</span><i style="background:#ffc83d"></i><span>Dropoff · ${dropoff}</span></div>
        <div class="small" style="color:#5b6470">Deliver in ${fmtTime(eta)} · 1 iced caramel macchiato</div>
        <button class="btn" id="accept">ACCEPT ORDER${TOUCH ? '' : ' <small style="opacity:.6;font-size:14px">⏎</small>'}</button>
      </div>
    </div>`);
  const b = el.querySelector('#accept');
  let done = false;
  const accept = () => { if (done) return; done = true; b.textContent = 'ACCEPTED ✓'; cleanup(); setTimeout(onAccept, 220); };
  const kd = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); accept(); } };
  const cleanup = () => window.removeEventListener('keydown', kd);
  b.addEventListener('click', accept); window.addEventListener('keydown', kd);
  setTimeout(() => b.focus({ preventScroll: true }), 50);
  return el;
}

export function hud(marks = []) {
  const el = layer('hud', `
    <div class="hudtop">
      <div class="pill" id="eta"><small>ETA</small><span>0:00</span></div>
      <div class="prog"><i id="progf"></i><em style="left:0">☕</em>${marks.map(([p, name]) => `<span class="mk" style="left:${(p * 100).toFixed(1)}%"><b></b>${name}</span>`).join('')}<em style="left:100%">🏢</em><span class="me" id="me">🚲</span></div>
      <div class="pill tipv"><small>TIP</small><b id="tipv">$50.00</b></div>
    </div>
    <div class="icem" id="icem"><div class="tube"><i id="icef"></i></div><span>ICE</span></div>
    <div class="dms" id="dms"></div>
    <div class="speed" id="speed"></div>
    <div class="hint" id="hint">${TOUCH ? 'Swipe <b>⟵ ⟶</b> to switch lanes · <b>↑</b> to jump' : '<b>← →</b> or <b>A D</b> switch lanes · <b>↑ W Space</b> jump · <b>Shift</b> boost'}</div>
    <button class="boostb" id="boost" aria-label="Boost"><span>BOOST${TOUCH ? '' : '<br><small>SHIFT</small>'}</span></button>`);
  const q = (s) => el.querySelector(s);
  const me = q('#me'), etaEl = q('#eta'), etaS = q('#eta span'), prog = q('#progf'), ice = q('#icef'), icem = q('#icem'), boost = q('#boost'), tipv = q('#tipv'), speed = q('#speed');
  let last = {};
  return {
    el,
    update({ eta, prog: p, ice: ic, boost: bo, tip, speed: sp }) {
      const e = fmtTime(eta); if (e !== last.e) { etaS.textContent = e; etaEl.classList.toggle('late', eta <= 10); last.e = e; }
      prog.style.width = `${(p * 100).toFixed(1)}%`; me.style.left = `${(p * 100).toFixed(1)}%`;
      ice.style.height = `${Math.max(0, ic)}%`; icem.classList.toggle('low', ic < 25);
      boost.style.setProperty('--p', `${Math.min(100, bo * 100)}%`); boost.classList.toggle('ready', bo >= 1);
      if (tip !== last.tip) { tipv.textContent = money(tip); last.tip = tip; }
      speed.style.opacity = sp;
    },
    hint(show) { q('#hint').style.opacity = show ? 1 : 0; },
    onBoost(fn) { boost.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); }); },
  };
}
export function dm(text, { who = 'Kyle S', ttl = 3200 } = {}) {
  const box = document.getElementById('dms'); if (!box) return;
  const el = h(`<div class="dm"><div class="av">K</div><div class="bub"><small>${who.toUpperCase()} · GOBBL</small>${text}</div></div>`);
  box.appendChild(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ttl);
}
export function pop(text, sub = '', { top = 34 } = {}) {
  root().querySelectorAll('.pop').forEach((p) => p.remove());
  const el = h(`<div class="pop" style="top:${top}%">${text}${sub ? `<small>${sub}</small>` : ''}</div>`);
  root().appendChild(el); setTimeout(() => el.remove(), 950);
}
export function place(name, sub, ttl = 2600) {
  const el = h(`<div class="place"><i>📍</i><div><b>${name}</b><small>${sub}</small></div></div>`);
  root().appendChild(el); setTimeout(() => el.remove(), ttl);
}
export function coach(html) {
  root().querySelectorAll('.coach').forEach((c) => c.remove());
  if (!html) return;
  const el = h(`<div class="coach">${html}</div>`); root().appendChild(el); setTimeout(() => el.remove(), 2600);
}
export function pauseMenu({ onResume, onRestart, onQuit }) {
  const el = layer('pause', `<div class="pausebox"><div class="ptitle">Paused</div>
    <button class="btn" id="presume">RESUME${TOUCH ? '' : ' <small style="opacity:.6;font-size:14px">Esc</small>'}</button>
    <button class="btn dark" id="prestart">Restart order${TOUCH ? '' : ' (R)'}</button>
    <button class="btn ghost" id="pquit">Quit to title</button>
    <div class="small">${TOUCH ? '' : '← → lanes · ↑ jump · Shift boost · M mute'}</div></div>`);
  el.querySelector('#presume').onclick = onResume; el.querySelector('#prestart').onclick = onRestart; el.querySelector('#pquit').onclick = onQuit;
  return el;
}
export function skipChip(show) {
  let el = document.getElementById('skipchip');
  if (!show) { el?.remove(); return; }
  if (!el) { el = h(`<button class="skipchip" id="skipchip">Skip ▶${TOUCH ? '' : ' <small>Space</small>'}</button>`); root().appendChild(el); }
  return el;
}
export function countdown(n) { remove('count'); const el = layer('count', `<div class="count">${n}</div>`); el.style.padding = 0; setTimeout(() => el.remove(), 700); }
export function toast(text, ttl = 1800) { const el = h(`<div class="toast">${text}</div>`); root().appendChild(el); setTimeout(() => el.remove(), ttl); }

export function crash({ tip, onAd, onRestart }) {
  const el = layer('crash', `
    <div class="wo">WIPED<br>OUT 💥</div>
    <div class="wsub">your <b>${money(tip)}</b> tip is in danger 😬</div>
    <button class="btn" id="watchad">📺 WATCH AD TO CONTINUE<small>keep your spot · keep the tip (lol)${TOUCH ? '' : ' · ⏎'}</small></button>
    <button class="btn ghost" id="rs">Restart order${TOUCH ? '' : ' (R)'}</button>`);
  el.querySelector('#watchad').onclick = onAd; el.querySelector('#rs').onclick = onRestart;
  return el;
}
const ADS = [
  { big: '🛡️', logo: 'gobbl<b>+</b>', h: 'TIP INSURANCE™', q: 'for when your Kyle happens.', p: '$9.99<small>/week</small>', fine: '*does not cover Kyle. not available in Florida.' },
  { big: '🦢', logo: 'Lake Eola', h: 'SWAN BOATS', q: 'now 100% swan-free. you’re welcome.', p: '$15<small>/half hour</small>', fine: '*boats are shaped like swans. the swans have moved on.' },
  { big: '🚆', logo: 'Sun<b>Rail</b>', h: 'WE’LL GET YOU THERE', q: 'eventually. probably. on weekdays.', p: '$2<small>/ride</small>', fine: '*train may cross your delivery route at the worst moment.' },
  { big: '🎤', logo: 'KYLE S', h: 'MIXTAPE OUT NOW', q: '“Tip Culture Is A Scam” — 14 tracks.', p: 'FREE<small> (unlike my tips)</small>', fine: '*streaming royalties will not be shared with couriers.' },
];
let adIdx = 0;
export function ad({ seconds = 4, onDone }) {
  const a = ADS[adIdx++ % ADS.length];
  const el = layer('ad', `
    <div class="adtop"><span>Ad</span><span class="rw" id="rw">Reward in ${seconds}s</span></div>
    <div class="adbody">
      <div class="adbig">${a.big}</div><div class="adlogo">${a.logo}</div><div class="adh">${a.h}</div>
      <div class="adq">${a.q}</div><div class="adp">${a.p}</div><div class="adfine">${a.fine}</div>
    </div>`);
  let n = seconds;
  const iv = setInterval(() => {
    n--; const rw = el.querySelector('#rw');
    if (n > 0) rw.textContent = `Reward in ${n}s`;
    else { clearInterval(iv); rw.textContent = '✓ Reward granted'; setTimeout(() => { el.remove(); onDone(); }, 450); }
  }, 1000);
  return el;
}

// finale overlays
export function sceneCap(html, { tap = null, extra = '' } = {}) {
  remove('scene');
  const el = layer('scene', `${extra}<div class="cap">${html}</div>${tap ? `<div class="tapc">${tap}</div>` : ''}`);
  return el;
}
export function stairsUI({ onTap }) {
  const el = layer('stairsui', `
    <div class="tbar"><i id="tb" style="width:100%"></i></div>
    <div class="floor" id="floor"><small>FLOOR</small><span>1</span></div>
    <div class="stairs"><button id="sl" class="next">${TOUCH ? 'LEFT' : '← LEFT'}</button><button id="sr">${TOUCH ? 'RIGHT' : 'RIGHT →'}</button></div>
    <div class="stairhint">${TOUCH ? 'Alternate LEFT / RIGHT as fast as you can' : 'Alternate <b>←</b> <b>→</b> (or A D) as fast as you can'}</div>`);
  const l = el.querySelector('#sl'), r = el.querySelector('#sr');
  l.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(0); });
  r.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(1); });
  return {
    el,
    set({ floor, next, time }) {
      el.querySelector('#floor span').textContent = floor; el.querySelector('#floor').classList.toggle('done', floor >= 20);
      l.classList.toggle('next', next === 0); r.classList.toggle('next', next === 1);
      el.querySelector('#tb').style.width = `${Math.max(0, time) * 100}%`;
    },
  };
}
export function notif(title, body) { return `<div class="notif"><div class="ic">g</div><div><b>${title}</b><small>${body}</small></div></div>`; }
export function results({ next, nextN, tip, pay, time, eta, ice, crashes, nearMiss, order, line, onNext, onShare }) {
  const onTime = time <= eta;
  const el = layer('results', `
    <div class="res">
      <h2>Delivered${onTime ? ' on time' : ''}.<br><em>Tip: $0.00</em></h2>
      <div class="ledger">
        <div><span>Base pay</span><span>${money(pay)}</span></div>
        <div><span>Tip promised</span><s>${money(tip)}</s></div>
        <div><span>Tip received</span><span class="z">$0.00</span></div>
        <div><span>You earned</span><span>${money(pay)}</span></div>
      </div>
      <div class="kv">
        <div>TIME<b>${fmtTime(time)}</b></div><div>ETA<b>${fmtTime(eta)}${onTime ? ' ✓' : ''}</b></div>
        <div>ICE LEFT<b>${Math.round(ice)}%</b></div><div>NEAR MISSES<b>${nearMiss}</b></div>
        <div>ADS WATCHED<b>${crashes}</b></div><div>KYLE'S RATING<b>⭐ 4.1</b></div>
      </div>
      <div class="small" style="color:#cfd6dc">Kyle S: “${line}”</div>
      <div class="nextup">Next · Order #${nextN} · Kyle promises <b>${money(next.tip)}</b> · “${next.note}”${next.storm ? ' · 🌧 storm' : ''}${next.route === 'sunrail' ? ' · 🚆 SunRail crossing' : ''}</div>
      <div class="row"><button class="btn" id="next">NEXT ORDER${TOUCH ? '' : ' ⏎'}</button></div>
      <div class="row"><button class="btn ghost" id="share">Copy “tag your Kyle”</button></div>
    </div>`);
  el.querySelector('#next').onclick = onNext;
  el.querySelector('#share').onclick = onShare;
  return el;
}
