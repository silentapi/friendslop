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

export function title({ bestScore, best, orders, muted, wallet = 0, onPlay, onMute, onShop, onBP, bpTier = 0, bpReady = 0 }) {
  const el = layer('title', `
    <div class="top">
      <div class="logo">Tip<b>Bait</b></div>
      <div class="tagline">Deliver on time in real Downtown Orlando. Kyle takes the tip anyway.</div>
      <div class="chips"><span class="chip">S Orange Ave</span><span class="chip">Church Street Station</span><span class="chip"><b>Citi Tower</b></span></div>
    </div>
    <div class="bottom">
      <div class="menu-stats">
        <div><small>WALLET</small><b>🪙 ${wallet.toLocaleString('en-US')}</b></div>
        <div><small>BEST SCORE</small><b>${bestScore ? bestScore.toLocaleString('en-US') : '—'}</b></div>
        <div><small>DELIVERED</small><b>${orders || 0}</b></div>
      </div>
      <button class="btn" id="play">${orders ? 'NEXT ORDER' : 'START SHIFT'}${TOUCH ? '' : ' <small style="opacity:.6;font-size:14px">⏎</small>'}</button>
      <div class="menu-row"><button class="btn ghost menu-shop" id="shop">STORE${TOUCH ? '' : ' <small style="opacity:.6;font-size:13px">S</small>'}</button><button class="btn ghost menu-shop menu-bp" id="bpbtn"><span class="bpb">${bpTier}</span>BATTLE PASS${bpReady ? `<em>${bpReady}</em>` : ''}${TOUCH ? '' : ' <small style="opacity:.6;font-size:13px">B</small>'}</button></div>
      <div class="small">${TOUCH ? 'Swipe to dodge · swipe up to jump · tap BOOST' : '← → dodge · ↑ / Space jump · Shift boost · M mute'} · best time ${best || '—'}</div>
    </div>
    <button class="mute" id="mute" aria-label="Sound">${muted ? '🔇' : '🔊'}</button>`);
  el.querySelector('#play').onclick = onPlay;
  el.querySelector('#shop').onclick = (e) => { e.stopPropagation(); onShop?.(); };
  el.querySelector('#bpbtn').onclick = (e) => { e.stopPropagation(); onBP?.(); };
  el.querySelector('#mute').onclick = (e) => { e.stopPropagation(); const m = onMute(); e.currentTarget.textContent = m ? '🔇' : '🔊'; };
  return el;
}

export function orderCard({ tip, note, pickup, dropoff, eta, n, thought = '', onAccept }) {
  const el = layer('order', `
    ${thought ? `<div class="othought">💭 ${thought}</div>` : ''}
    <div class="card">
      <div class="hd">gobbl <span>NEW ORDER #${n}</span></div>
      <div class="bd">
        <div class="who"><div class="av">K</div><div class="nm">Kyle S<small>Citi Tower · floor 20 · 101 Lake Ave</small></div></div>
        <div class="tip">${money(tip)}<small>TIP</small></div>
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
    <div class="scorebox"><div class="score" id="score">0</div><div class="mult" id="mult">x1</div><div class="coins" id="coins"><i></i><span>0</span></div></div>
    <div class="pups" id="pups"></div>
    <div class="icem" id="icem"><div class="tube"><i id="icef"></i></div><span>ICE</span></div>
    <div class="speed" id="speed"></div><div class="bglow" id="bglow"></div>
    <div class="hint" id="hint">${TOUCH ? 'Swipe <b>⟵ ⟶</b> to switch lanes · <b>↑</b> to jump' : '<b>← →</b> or <b>A D</b> switch lanes · <b>↑ W Space</b> jump · <b>Shift</b> boost'}</div>
    <button class="boostb" id="boost" aria-label="Boost"><span>BOOST${TOUCH ? '' : '<br><small>SHIFT</small>'}</span></button>`);
  const q = (s) => el.querySelector(s);
  const me = q('#me'), etaEl = q('#eta'), etaS = q('#eta span'), prog = q('#progf'), ice = q('#icef'), icem = q('#icem'), boost = q('#boost'), tipv = q('#tipv'), speed = q('#speed'), bglow = q('#bglow');
  const scoreEl = q('#score'), multEl = q('#mult'), coinsEl = q('#coins span'), pups = q('#pups');
  let last = {};
  return {
    el,
    coinTarget() { return q('#coins i').getBoundingClientRect(); },
    update({ eta, etaTotal = 60, prog: p, ice: ic, boost: bo, tip, speed: sp, score = 0, mult = 1, coins = 0, powers = [] }) {
      const e = fmtTime(eta); if (e !== last.e) { etaS.textContent = e; etaEl.classList.toggle('late', eta <= 12); etaEl.classList.toggle('warn', eta > 12 && eta <= Math.max(20, etaTotal * 0.3)); last.e = e; }
      const sc = Math.floor(score); if (sc !== last.sc) { scoreEl.textContent = sc.toLocaleString('en-US'); last.sc = sc; }
      if (mult !== last.mult) { multEl.textContent = `x${mult}`; multEl.className = `mult m${mult}`; if (mult > (last.mult || 1)) { multEl.classList.add('bump'); } last.mult = mult; }
      if (coins !== last.coins) { coinsEl.textContent = coins; last.coins = coins; }
      const pk = powers.map((w) => w.id + Math.ceil(w.t)).join(); if (pk !== last.pk) { last.pk = pk; pups.innerHTML = powers.map((w) => `<div class="pu" style="--p:${Math.round(100 * w.t / w.dur)}%"><span>${w.icon}</span><small>${Math.ceil(w.t)}s</small></div>`).join(''); }
      prog.style.width = `${(p * 100).toFixed(1)}%`; me.style.left = `${(p * 100).toFixed(1)}%`;
      ice.style.height = `${Math.max(0, ic)}%`; icem.classList.toggle('low', ic < 25);
      boost.style.setProperty('--p', `${Math.min(100, bo * 100)}%`); boost.classList.toggle('ready', bo >= 1);
      if (tip !== last.tip) { if (last.tip != null && tip < last.tip) { const d = h(`<div class="tipdelta">-${money(last.tip - tip)}</div>`); tipv.parentElement.appendChild(d); setTimeout(() => d.remove(), 1400); tipv.parentElement.classList.remove('hit'); void tipv.offsetWidth; tipv.parentElement.classList.add('hit'); } tipv.textContent = money(tip); last.tip = tip; }
      speed.style.opacity = sp; bglow.style.opacity = sp;
    },
    hint(show) { q('#hint').style.opacity = show ? 1 : 0; },
    onBoost(fn) { boost.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); }); },
  };
}
// Kyle's texts: phone-style notifications that slide in at the top-right, out of the way of the road
export function dm(text, { who = 'Kyle S', ttl = 4200, tone = '' } = {}) {
  let box = document.getElementById('dms');
  if (!box) { box = h('<div class="dms" id="dms"></div>'); root().appendChild(box); }
  const el = h(`<div class="dm ${tone}"><div class="av">${who === 'Kyle S' ? 'K' : 'g'}</div><div class="bub"><small><b>${who}</b> · now</small>${text}</div></div>`);
  box.appendChild(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ttl);
}
// the courier's inner monologue
export function thought(text, ttl = 2600) {
  root().querySelectorAll('.thought').forEach((p) => p.remove());
  const el = h(`<div class="thought">💭 ${text}</div>`); root().appendChild(el); setTimeout(() => el.remove(), ttl);
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
// a collected coin flies from its screen position up into the HUD coin counter
export function coinFly(x, y, target) {
  const el = h(`<div class="cfly" style="left:${x}px;top:${y}px"></div>`); root().appendChild(el);
  const dx = target.left + target.width / 2 - x, dy = target.top + target.height / 2 - y;
  el.animate([{ transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.15 - 40}px)) scale(1.1)`, opacity: 1, offset: 0.35 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: 0.9 }], { duration: 520, easing: 'cubic-bezier(.4,0,.7,1)' }).onfinish = () => el.remove();
}
const KEYCAP = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', ' ': 'SPACE' };
// quick-time prompt: a key with a closing ring; set(u) moves the ring (1 → 0), result(grade) shows the verdict
export function qte({ key, label = '' }) {
  remove('qte');
  const el = layer('qte', `<div class="qbox"><div class="qring" id="qring"></div><div class="qkey">${KEYCAP[key] || key.toUpperCase()}</div><div class="qlab">${label}</div></div>`);
  const ring = el.querySelector('#qring');
  return {
    set(u) { ring.style.transform = `translate(-50%,-50%) scale(${0.55 + u * 1.6})`; ring.classList.toggle('hot', u < 0.2 && u > 0.02); },
    result(grade, sub = '') { el.querySelector('.qbox').classList.add('g-' + grade.toLowerCase()); el.querySelector('.qlab').innerHTML = `<b>${grade}</b>${sub ? ' · ' + sub : ''}`; setTimeout(() => el.remove(), 700); },
    remove() { el.remove(); },
  };
}
// multi-key combo prompt (the parking slide): keys in order against a draining timer
export function combo({ seq, label }) {
  remove('combo');
  const el = layer('combo', `<div class="cbox"><div class="clab">${label}</div><div class="ckeys">${seq.map((k, i) => `<div class="ck" id="ck${i}">${KEYCAP[k] || k}</div>`).join('')}</div><div class="ctime"><i id="ctf"></i></div></div>`);
  return {
    set(idx, u) { seq.forEach((_, i) => { const c = el.querySelector('#ck' + i); c.classList.toggle('done', i < idx); c.classList.toggle('now', i === idx); }); el.querySelector('#ctf').style.width = `${Math.max(0, u) * 100}%`; },
    result(ok, sub = '') { if (ok) el.querySelectorAll('.ck').forEach((c) => { c.classList.add('done'); c.classList.remove('now'); }); el.querySelector('.cbox').classList.add(ok ? 'ok' : 'bad'); el.querySelector('.clab').innerHTML = `<b>${ok ? 'NAILED IT' : 'FUMBLED'}</b>${sub ? ' · ' + sub : ''}`; setTimeout(() => el.remove(), 900); },
    remove() { el.remove(); },
  };
}
// the hold frame: just letterbox bars — the shot speaks for itself
export function holdFrame() {
  remove('akira');
  return layer('akira', `<div class="lbx t"></div><div class="lbx b"></div>`);
}
export function flash() { const el = h('<div class="flash"></div>'); root().appendChild(el); setTimeout(() => el.remove(), 420); }
export function countdown(n) { remove('count'); const el = layer('count', `<div class="count">${n}</div>`); el.style.padding = 0; setTimeout(() => el.remove(), 700); }
export function toast(text, ttl = 1800) { const el = h(`<div class="toast">${text}</div>`); root().appendChild(el); setTimeout(() => el.remove(), ttl); }

export function crash({ tip, onAd, onRestart }) {
  const el = layer('crash', `
    <div class="wo">WIPED<br>OUT</div>
    <div class="wsub">your <b>${money(tip)}</b> tip is in danger</div>
    <button class="btn" id="watchad">WATCH AD TO CONTINUE<small>keep your spot and the tip (lol)${TOUCH ? '' : ' · ⏎'}</small></button>
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
// front-door minigame: wave to get noticed, then knock while she's looking up
export function deskUI() {
  const el = layer('buzzui', `
    <div class="buzz">
      <div class="knocknow" id="knocknow"><div class="qring" id="kring"></div><b>KNOCK NOW!</b><small>${TOUCH ? 'tap KNOCK' : 'press Space'}</small></div>
      <div class="bstat" id="bstat">📱 she’s on her phone</div>
      <div class="bbar"><i id="bm"></i><em>GET NOTICED</em></div>
      <div class="bhint">${TOUCH ? '<b>WAVE</b> to fill the meter · <b>KNOCK</b> the instant she looks up' : 'Mash <b>←</b> <b>→</b> to fill the meter · <b>Space</b> the instant she looks up'}</div>
      ${TOUCH ? '<div class="stairs"><button id="bw">👋 WAVE</button><button id="bk">✊ KNOCK</button></div>' : ''}
    </div>`);
  const st = el.querySelector('#bstat'), kn = el.querySelector('#knocknow'), ring = el.querySelector('#kring');
  return {
    el,
    bind(onWave, onKnock) { el.querySelector('#bw')?.addEventListener('pointerdown', (e) => { e.preventDefault(); onWave(); }); el.querySelector('#bk')?.addEventListener('pointerdown', (e) => { e.preventDefault(); onKnock(); }); },
    set({ notice, phase, u }) {
      el.querySelector('#bm').style.width = `${Math.round(notice * 100)}%`;
      const txt = phase === 'looking' ? '❗ SHE’S LOOKING' : phase === 'eyeroll' ? '🙄 knocked too early — she’s ignoring you' : '📱 she’s on her phone';
      if (st.textContent !== txt) { st.textContent = txt; st.className = 'bstat ' + phase; }
      kn.classList.toggle('on', phase === 'looking'); ring.style.transform = `translate(-50%,-50%) scale(${0.6 + u * 1.4})`;
    },
  };
}
// stairs rhythm climb: hit ↑ when the marker crosses the green zone
// a set piece's banner on the ride: title, pips, the rule in one line (+ touch buttons)
const KEYGLYPH = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' };
export function evUI({ title, hint, pips = 0, keys = null }) {
  remove('evui');
  const el = layer('evui', `
    <div class="dogui run">
      <div class="dtitle">${title}</div>
      ${pips ? `<div class="dpips">${'<i></i>'.repeat(pips)}</div>` : ''}
      <div class="dhint">${hint}</div>
      ${TOUCH && keys ? `<div class="stairs">${keys.map((k) => `<button data-k="${k}">${KEYGLYPH[k]}</button>`).join('')}</div>` : ''}
    </div>`);
  el.style.pointerEvents = 'none'; el.style.padding = 0;
  return {
    el,
    bind(fn) { el.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(b.dataset.k); })); },
    set(res) { el.querySelectorAll('.dpips i').forEach((p, i) => { p.className = res[i] === true ? 'ok' : res[i] === false ? 'bit' : res[i] === 'mid' ? 'mid' : ''; }); },
    done(g) { const t = el.querySelector('.dtitle'); t.textContent = g; el.querySelector('.dogui').classList.add('fin', /CLONK|FLAT|BULLI/.test(g) ? 'bad' : 'good'); },
  };
}
// after a run: coins stream from the results into a wallet pouch in the top-right corner, counting up as they land
export function pouchFly({ from, before, after, n = 20 }) {
  remove('pouch');
  const p = h(`<div class="pouch" id="pouch"><i>👝</i><b>${before.toLocaleString('en-US')}</b></div>`); root().appendChild(p);
  const val = p.querySelector('b'), r0 = from?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  let landed = 0; const step = (after - before) / n;
  for (let i = 0; i < n; i++) {
    const c = h('<div class="flycoin">🪙</div>'); root().appendChild(c);
    const x0 = r0.left + r0.width * (0.2 + Math.random() * 0.6), y0 = r0.top + r0.height / 2, pr = p.getBoundingClientRect(), x1 = pr.left + 18, y1 = pr.top + pr.height / 2;
    c.style.left = x0 + 'px'; c.style.top = y0 + 'px';
    const delay = 500 + i * 55, dur = 650 + Math.random() * 200, arc = -80 - Math.random() * 120;
    c.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: `translate(calc(-50% + ${(x1 - x0) * 0.45}px), calc(-50% + ${arc + (y1 - y0) * 0.3}px)) scale(1.15)`, opacity: 1, offset: 0.45 }, { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.7)`, opacity: 1 }], { duration: dur, delay, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'both' })
      .onfinish = () => { c.remove(); landed++; val.textContent = Math.round(landed >= n ? after : before + step * landed).toLocaleString('en-US'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); try { window.__sfx?.('ice', 0.35, 1.5 + landed / n * 0.6); } catch {} };
  }
}
// copy that works inside sandboxed iframes too: async clipboard → execCommand → a sheet with the text selected
export function copyText(txt, ok = 'Copied!') {
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select();
    let done = false; try { done = document.execCommand('copy'); } catch {} ta.remove();
    if (done) { toast(ok); return; }
    remove('copysheet');
    const el = layer('copysheet', `<div class="copysheet"><b>Copy your score</b><textarea readonly>${txt.replace(/</g, '&lt;')}</textarea><button class="btn" id="cclose">DONE</button></div>`);
    const t = el.querySelector('textarea'); t.focus(); t.select(); el.querySelector('#cclose').onclick = () => el.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => toast(ok), fallback); else fallback();
}
export function say(who, text, ttl = 2200) {
  root().querySelectorAll('.say').forEach((p) => p.remove());
  const el = h(`<div class="say"><b>${who}</b>${text}</div>`); root().appendChild(el); setTimeout(() => el.remove(), ttl);
}
// the hallway pitbull: three bites, three pips
export function dogUI() {
  const el = layer('dogui', `
    <div class="dogui">
      <div class="dtitle">🐕 DODGE THE DOG</div>
      <div class="dpips"><i></i><i></i><i></i></div>
      <div class="dhint">${TOUCH ? 'bite at your <b>LEFT</b>: tap <b>→</b> · <b>RIGHT</b>: tap <b>←</b> · <b>LOW</b>: tap <b>↑</b>' : 'bite at your <b>LEFT</b>: press <b>→</b> &nbsp;·&nbsp; at your <b>RIGHT</b>: press <b>←</b> &nbsp;·&nbsp; <b>LOW</b>: press <b>↑</b> to jump'}</div>
      ${TOUCH ? '<div class="stairs"><button data-k="arrowleft">←</button><button data-k="arrowup">↑ JUMP</button><button data-k="arrowright">→</button></div>' : ''}
    </div>`);
  return {
    el,
    bind(fn) { el.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(b.dataset.k); })); },
    set(res) { el.querySelectorAll('.dpips i').forEach((p, i) => { p.className = res[i] === true ? 'ok' : res[i] === false ? 'bit' : ''; }); },
    done(g) { el.querySelector('.dtitle').textContent = g === 'UNTOUCHABLE' ? '🐕 UNTOUCHABLE' : '🐕 ' + g; el.querySelector('.dogui').classList.add('fin'); },
  };
}
export function climbUI() {
  const el = layer('climbui', `
    <div class="floor" id="floor"><small>FLOOR</small><span>1</span></div>
    <div class="climb">
      <div class="cbar"><em class="zg"></em><em class="zp"></em><i id="cm"></i></div>
      <div class="chint">${TOUCH ? 'Tap <b>STEP</b> when the marker hits <b>green</b>' : 'Press <b>↑</b> / <b>Space</b> when the marker hits <b>green</b>'}</div>
      ${TOUCH ? '<div class="stairs"><button id="cs" class="next">STEP ↑</button></div>' : ''}
    </div>`);
  return {
    el,
    bind(fn) { el.querySelector('#cs')?.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); },
    set({ floor, u, zone, perfect, hide }) {
      el.querySelector('#floor span').textContent = floor; el.querySelector('#floor').classList.toggle('done', floor >= 20);
      el.querySelector('#cm').style.left = `${(u * 100).toFixed(1)}%`;
      const zg = el.querySelector('.zg'), zp = el.querySelector('.zp');
      zg.style.left = `${(50 - zone * 100)}%`; zg.style.width = `${zone * 200}%`; zp.style.left = `${(50 - perfect * 100)}%`; zp.style.width = `${perfect * 200}%`;
      el.querySelector('.climb').style.opacity = hide ? 0.25 : 1;
    },
    flash(kind) { const b = el.querySelector('.cbar'); b.classList.remove('hit', 'miss', 'perf'); void b.offsetWidth; b.classList.add(kind); },
  };
}
export function notif(title, body) { return `<div class="notif"><div class="ic">g</div><div><b>${title}</b><small>${body}</small></div></div>`; }
// ---------------------------------------------------------------- results: one row per section, a success bar + a badge
// rate(section, d) → { pct 0..1, badge } | null (section not reached). d = G.fin merged with the run stats
// ({ time, eta, timeLeft, ice, crashes, nearMiss, coins, coinsTotal, tricks }). The parent uses the same thresholds
// to decide a perfect run (every reached section PERFECT).
export const SECTIONS = [
  ['ride', '🚲', 'Ride'], ['rival', '🛴', 'Rival courier'], ['crane', '🏗️', 'Crane drop'], ['akira', '🅿️', 'Parking slide'],
  ['door', '🛎️', 'Front desk'], ['stairs', '🪜', 'Stairs'], ['hall', '🚪', 'Hallway'], ['knock', '🎵', 'Secret knock'], ['time', '⏱️', 'Time'], ['ice', '🧊', 'Ice'],
];
const BADGES = [[0.95, 'PERFECT'], [0.75, 'GREAT'], [0.55, 'GOOD'], [0.3, 'OK'], [0, 'BAD']];
const badgeOf = (pct) => BADGES.find(([t]) => pct >= t - 1e-9)[1];
const GRADE_PCT = {
  rival: { 'SENT HIM': 1, 'RIVAL DOWN': 0.8, 'HELD ON': 0.5, BULLIED: 0.15 },
  crane: { UNTOUCHED: 1, CLEAN: 0.85, CLONKED: 0.4, FLATTENED: 0.1 },
  akira: { NAILED: 1, WIPEOUT: 0.15 },
  door: { PERFECT: 1, GOOD: 0.65, SLOW: 0.3 },
  stairs: { PERFECT: 1, GOOD: 0.65, GASSED: 0.25 },
  knock: { SS: 1, S: 1, A: 0.8, B: 0.62, C: 0.45, D: 0.25 }, // osu rank of the secret knock (knock.js)
  hall: { UNTOUCHABLE: 1, PERFECT: 1, FLAWLESS: 1, NICKED: 0.65, CHEWED: 0.35, 'CHEW TOY': 0.1 },
};
const c01 = (x) => Math.max(0, Math.min(1, x));
export function rate(section, d = {}) {
  let pct = null, label = null;
  if (section === 'ride') {
    if (d.coinsTotal == null) return null;
    const coins = c01(d.coins / Math.max(1, d.coinsTotal * 0.75)), clean = d.crashes ? 0 : 1, nm = c01(d.nearMiss / 6), tr = c01(d.tricks / 2);
    pct = (0.45 * coins + 0.25 * clean + 0.15 * nm + 0.15 * tr) * (d.crashes ? Math.max(0.35, 0.75 - 0.15 * (d.crashes - 1)) : 1);
    label = `${d.coins} coins · ${d.crashes ? `${d.crashes} crash${d.crashes > 1 ? 'es' : ''}` : 'no crashes'}`;
  } else if (section === 'time') {
    if (d.eta == null) return null;
    pct = d.time <= d.eta ? 0.6 + 0.4 * c01((d.timeLeft ?? d.eta - d.time) / (d.eta * 0.2)) : c01(0.45 - (d.time - d.eta) / d.eta);
    label = `${fmtTime(d.time)} · ${d.time <= d.eta ? 'on time' : `${fmtTime(d.time - d.eta)} late`}`;
  } else if (section === 'ice') {
    if (d.ice == null) return null;
    pct = c01(d.ice / 45); label = `${Math.round(d.ice)}% left`; // par: a clean ride keeps ~45%
  } else {
    const g = section === 'hall' ? (d.hall ?? d.dog) : d[section];
    if (!g) return null;
    pct = section === 'hall' && d.hallPerfect ? 1 : section === 'hall' && d.hallPct != null ? c01(d.hallPct) : GRADE_PCT[section]?.[g] ?? 0.5;
    label = section === 'knock' && d.knockLabel ? d.knockLabel : g;
  }
  return { pct, badge: badgeOf(pct), label };
}
export function rateAll(d) {
  const rows = SECTIONS.map(([k, icon, name]) => ({ k, icon, name, r: rate(k, d) }));
  const reached = rows.filter((x) => x.r);
  return { rows, perfect: reached.length >= 6 && reached.every((x) => x.r.badge === 'PERFECT') };
}
export function results({ next, nextN, tip, promised, pay, time, eta, ice, crashes, nearMiss, order, line, score: S, rows, onNext, onShare }) {
  const onTime = time <= eta, perfect = !!S.perfect;
  rows ||= rateAll({ ...(S.fin || {}), time, eta, ice, crashes, nearMiss, coins: S.coins, tricks: S.tricks }).rows;
  const bar = (x, i) => x.r
    ? `<div class="srow" style="--d:${(0.15 + i * 0.07).toFixed(2)}s"><span class="si">${x.icon}</span><span class="sn">${x.name}<small>${x.r.label}</small></span><span class="sb"><i style="--p:${Math.max(2, Math.round(x.r.pct * 100))}%;background-size:${Math.round(10000 / Math.max(2, x.r.pct * 100))}% 100%"></i></span><span class="bdg b-${x.r.badge.toLowerCase()}">${x.r.badge}</span></div>`
    : `<div class="srow off" style="--d:${(0.15 + i * 0.07).toFixed(2)}s"><span class="si">${x.icon}</span><span class="sn">${x.name}</span><span class="sb"></span><span class="bdg">—</span></div>`;
  const el = layer('results', `
    <div class="res${perfect ? ' perfect' : ''}">
      <h2>Delivered${onTime && !perfect ? ' on time' : ''}.<br>${perfect ? `<em class="won">Kyle actually tipped.</em>` : S.tipPaid > 0 ? `<em class="won">Tip: ${money(S.tipPaid)}</em>` : '<em>Tip: $0.00</em>'}</h2>
      <div class="shead">
        <div class="grade g${S.grade}">${S.grade}</div>
        <div class="stot"><small>SCORE${S.newBest ? ' · <b>NEW BEST!</b>' : ` · best ${S.best.toLocaleString('en-US')}`}</small><span>${S.total.toLocaleString('en-US')}</span></div>
        ${perfect ? '<div class="bdg b-gold">PERFECT RUN</div>' : ''}
      </div>
      <div class="ledger1">${perfect ? `Kyle promised ${money(promised ?? tip)} · tipped <b class="tipwon">${money(tip)}</b> 🤯` : `Kyle promised <s>${money(promised ?? tip)}</s> · tipped <b${S.tipPaid > 0 ? ' class="tipwon"' : ''}>${money(S.tipPaid || 0)}</b>${S.tipPaid > 0 ? ` (${Math.round((S.tipShare || 0) * 100)}%)` : ''}`} · you earned <b>${money(pay + (perfect ? tip : S.tipPaid || 0))}</b></div>
      <div class="srows">${rows.map(bar).join('')}</div>
      <div class="small rline">Kyle S: “${line}” · ${nearMiss} near misses · best combo x${S.bestMult}</div>
      <div class="nextup">Next · Order #${nextN} · Kyle promises <b>${money(next.tip)}</b> · “${next.note}”${next.storm ? ' · 🌧 storm' : ''}${next.route === 'sunrail' ? ' · 🚆 SunRail' : ''}</div>
      <div class="row"><button class="btn" id="next">NEXT ORDER${TOUCH ? '' : ' ⏎'}</button><button class="btn ghost" id="share" style="flex:.6">Copy score</button></div>
    </div>`);
  el.querySelector('#next').onclick = onNext;
  el.querySelector('#share').onclick = onShare;
  return el;
}
// time-penalty chip: "−2.4 s · label" pops near the action, then flies into the ETA pill (or fades top-centre)
export function timeCost(sec, label = '') {
  if (!(sec > 0.05)) return;
  const el = h(`<div class="tcost"><b>−${sec.toFixed(1)} s</b>${label ? `<span>${label}</span>` : ''}</div>`); root().appendChild(el);
  const eta = document.getElementById('eta')?.getBoundingClientRect(), r = el.getBoundingClientRect();
  const tgt = eta && eta.width ? { x: eta.left + eta.width / 2 - (r.left + r.width / 2), y: eta.top + eta.height / 2 - (r.top + r.height / 2) } : { x: 0, y: -60 };
  el.style.setProperty('--tx', `${tgt.x}px`); el.style.setProperty('--ty', `${tgt.y}px`); el.style.setProperty('--to', eta ? 0.85 : 0);
  el.addEventListener('animationend', () => { el.remove(); document.getElementById('eta')?.classList.add('hit'); setTimeout(() => document.getElementById('eta')?.classList.remove('hit'), 420); });
  setTimeout(() => el.remove(), /[?&]qa=1/.test(location.search) ? 7000 : 2200); // never strand a chip (QA steps the clock slowly: keep it long enough to screenshot)
}
