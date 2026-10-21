// The gobbl store: crates you open with tip-coins (rarity-tiered pulls, pity, duplicates → coins), a collection to
// equip from, and a "buy coins" sheet for later. Openings borrow the genre's grammar: the crate wobbles and hums,
// light leaking from its seams climbs the rarity ladder (blue → purple → gold → red) before anything is shown, the
// lid blows, a CS:GO-style reel decelerates past a near-miss, and the prize lands on the courier's turntable.
import { ITEMS, CATS, DEFAULTS, RARITY, byId } from './cosmetics.js';
import { CRATES, PITY, REFUND, TIERS, openCrate } from './crates.js';

const TOUCH = matchMedia('(pointer: coarse)').matches;
const coin = (n) => `<span class="coin">🪙</span>${Math.round(n).toLocaleString('en-US')}`;
const RC = (r) => RARITY[r].color;
const rank = (r) => RARITY[r].rank;
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const crateArt = (c, big = false) => `<div class="crateart look-${c.look}${big ? ' big' : ''}"><div class="clid"></div><div class="cbody"><b>gobbl</b><i>${c.rolls > 1 ? '×' + c.rolls : c.look === 'prem' ? 'PREMIUM' : 'CRATE'}</i></div><div class="cseam"></div></div>`;
const cardHTML = (it, extra = '') => `<div class="lcard r-${it.r}" style="--rc:${RC(it.r)}">${extra}<span class="sw" style="background:${it.sw}">${it.icon || ''}</span><span class="nm">${it.name}</span><i>${RARITY[it.r].name}</i></div>`;

export function openShop({ store, cos, onClose, sfx = () => {} }) {
  // storage: 'wallet' coins · 'owned' item ids (pre-crate purchases carry over as-is) · 'equipped' per slot · 'pity'
  const owned = () => new Set([...store.get('owned', []), ...Object.values(DEFAULTS)]);
  const equipped = { ...DEFAULTS, ...store.get('equipped', {}) };
  const wallet = () => store.get('wallet', 0);
  let tab = 'crates', cat = 'bag', sel = equipped.bag, crateSel = 0, opening = null, modal = null;
  const el = h('<div class="layer" id="shop"></div>'); document.getElementById('ui').appendChild(el);
  el.innerHTML = `
    <div class="shp">
      <div class="shp-hd">
        <button class="shp-back" id="shpback">← ${TOUCH ? '' : '<small>Esc</small>'}</button>
        <div class="shp-title">gobbl <b>STORE</b></div>
        <div class="wallet" id="shpw"></div>
        <button class="buycoins" id="buycoins" title="buy coins">＋ COINS</button>
      </div>
      <div class="shp-tabs top"><button data-tab="crates">🎁 CRATES</button><button data-tab="coll">📦 COLLECTION</button></div>
      <div class="shp-body" id="shpbody"></div>
    </div>`;
  const body = el.querySelector('#shpbody');
  const preview = (id) => { const it = byId(id); cos.apply(it.cat, id); };
  const resetPreview = () => { for (const k of Object.keys(DEFAULTS)) cos.apply(k, equipped[k]); };
  const renderHead = () => { el.querySelector('#shpw').innerHTML = coin(wallet()); el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab)); };

  // ---------------- crates tab
  function renderCrates() {
    const pity = store.get('pity', 0);
    body.innerHTML = `
      <div class="crates">${CRATES.map((c, i) => `
        <div class="crate${i === crateSel ? ' sel' : ''}" data-i="${i}">
          <div class="cart">${crateArt(c)}</div>
          <div class="cinfo">
            <b>${c.name}</b><small>${c.blurb}</small>
            <div class="odds">${TIERS.filter((t) => c.rates[t] > 0).map((t) => `<span style="--rc:${RC(t)}"><em>${RARITY[t].name}</em>${(c.rates[t] * 100).toFixed(c.rates[t] < 0.01 ? 1 : 0)}%</span>`).join('')}</div>
          </div>
          <button class="btn copen${wallet() < c.price ? ' poor' : ''}" data-open="${i}">${wallet() < c.price ? `NEED ${coin(c.price - wallet())}` : `OPEN ${coin(c.price)}`}${TOUCH ? '' : ` <small>${i + 1}</small>`}</button>
        </div>`).join('')}
      </div>
      <div class="pity"><div><b>LEGENDARY+ GUARANTEED</b> within ${PITY - pity} rolls</div><span><i style="width:${(pity / PITY) * 100}%"></i></span><small>duplicates refund ${TIERS.map((t) => `<em style="color:${RC(t)}">${REFUND[t]}</em>`).join(' · ')} coins</small></div>`;
    body.querySelectorAll('.crate').forEach((c) => c.onclick = () => { crateSel = +c.dataset.i; sfx('pop', 0.5, 1.2); render(); });
    body.querySelectorAll('[data-open]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); tryOpen(+b.dataset.open); });
  }
  // ---------------- collection tab
  function renderColl() {
    const own = owned(), items = ITEMS.filter((i) => i.cat === cat);
    const pct = (c) => { const all = ITEMS.filter((i) => i.cat === c); return Math.round(all.filter((i) => own.has(i.id)).length / all.length * 100); };
    if (!items.some((i) => i.id === sel)) sel = equipped[cat];
    const it = byId(sel), isOwn = own.has(sel), eq = equipped[cat] === sel;
    body.innerHTML = `
      <div class="shp-tabs">${CATS.map(([id, label, ic]) => `<button data-cat="${id}" class="${id === cat ? 'on' : ''}">${ic} ${label}<small>${pct(id)}%</small></button>`).join('')}</div>
      <div class="shp-grid coll">${items.map((i) => {
        const o = own.has(i.id), e = equipped[cat] === i.id;
        return `<button class="card2 r-${i.r}${i.id === sel ? ' sel' : ''}${o ? '' : ' locked'}" data-id="${i.id}" style="--rc:${RC(i.r)}"><span class="sw" style="${o ? `background:${i.sw}` : ''}">${o ? i.icon || '' : '?'}</span><span class="nm">${o ? i.name : '???'}</span><i class="st">${e ? 'EQUIPPED' : RARITY[i.r].name}</i></button>`;
      }).join('')}</div>
      <div class="shp-ft">
        <div class="shp-info"><b style="color:${isOwn ? '#fff' : RC(it.r)}">${isOwn ? it.name : RARITY[it.r].name + ' · locked'}</b><small>${isOwn ? it.desc : 'found in crates. keep delivering.'}</small></div>
        <button class="btn shp-act${eq ? ' done' : isOwn ? '' : ' poor'}" id="shpact">${eq ? 'EQUIPPED ✓' : isOwn ? `EQUIP${TOUCH ? '' : ' <small>⏎</small>'}` : '🔒 LOCKED'}</button>
      </div>`;
    body.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { cat = b.dataset.cat; sel = equipped[cat]; resetPreview(); sfx('pop', 0.5, 1); render(); });
    body.querySelectorAll('[data-id]').forEach((c) => c.onclick = () => { sel = c.dataset.id; resetPreview(); if (own.has(sel)) preview(sel); sfx('pop', 0.5, 1.3); render(); });
    body.querySelector('#shpact').onclick = equip;
  }
  function equip() { if (!owned().has(sel) || equipped[cat] === sel) return; equipped[cat] = sel; store.set('equipped', equipped); cos.apply(cat, sel); sfx('pop', 0.8, 1.6); sfx('ding', 0.5, 1.5); render(); }
  function render() { renderHead(); if (tab === 'crates') renderCrates(); else renderColl(); }
  el.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; resetPreview(); sfx('pop', 0.5, 1); render(); });

  // ---------------- buy coins (later)
  el.querySelector('#buycoins').onclick = () => {
    if (modal) return;
    modal = h(`<div class="layer" id="coinsheet"><div class="sheet">
      <b>Coin packs</b><small>coming soon — for now, coins come from deliveries (and Kyle’s broken promises).</small>
      <div class="packs">${[['Pocket change', 1000, '$0.99'], ['Tip jar', 6000, '$4.99'], ['Kyle’s promised tip', 15000, '$9.99']].map(([n, c, p]) => `<div class="pack"><span>🪙</span><b>${c.toLocaleString('en-US')}</b><small>${n}</small><button disabled>${p}</button></div>`).join('')}</div>
      <button class="btn ghost" id="sheetok">OK</button></div></div>`);
    document.getElementById('ui').appendChild(modal); sfx('pop', 0.6, 0.9);
    const shut = () => { modal?.remove(); modal = null; };
    modal.querySelector('#sheetok').onclick = shut; modal.onclick = (e) => { if (e.target === modal) shut(); };
  };

  // ---------------- opening
  function tryOpen(i) {
    const c = CRATES[i]; crateSel = i;
    if (wallet() < c.price) { sfx('bwomp', 0.5, 1.4); const b = body.querySelector(`[data-open="${i}"]`); b?.classList.remove('shake'); void b?.offsetWidth; b?.classList.add('shake'); return; }
    const pulls = openCrate(c, store); if (!pulls) return;
    renderHead();
    el.classList.add('busy');
    opening = runOpening(c, pulls, { sfx, preview, resetPreview, equipped, store, onEquip: (it) => { equipped[it.cat] = it.id; store.set('equipped', equipped); cos.apply(it.cat, it.id); }, onDone: (again) => { opening = null; el.classList.remove('busy'); resetPreview(); render(); if (again) tryOpen(i); } });
  }
  const close = () => { if (opening || modal) return; resetPreview(); window.removeEventListener('keydown', key, true); el.remove(); onClose?.(); };
  el.querySelector('#shpback').onclick = close;
  const key = (e) => {
    const k = e.key.toLowerCase(), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (modal) { if (k === 'escape' || k === 'enter') { stop(); modal.remove(); modal = null; } return; }
    if (opening) { stop(); opening.key(k); return; }
    if (k === 'escape' || k === 'backspace') { stop(); close(); return; }
    if (k === 'tab') { stop(); tab = tab === 'crates' ? 'coll' : 'crates'; resetPreview(); render(); return; }
    if (tab === 'crates') {
      if (['1', '2', '3'].includes(k)) { stop(); tryOpen(+k - 1); return; }
      if (k === 'enter' || k === ' ') { stop(); tryOpen(crateSel); return; }
      const d = { arrowup: -1, w: -1, arrowdown: 1, s: 1, arrowleft: -1, a: -1, arrowright: 1, d: 1 }[k]; if (d) { stop(); crateSel = (crateSel + d + CRATES.length) % CRATES.length; render(); }
      return;
    }
    if (k === 'q' || k === 'e') { stop(); const ids = CATS.map((c) => c[0]); cat = ids[(ids.indexOf(cat) + (k === 'q' ? 2 : 1)) % 3]; sel = equipped[cat]; resetPreview(); render(); return; }
    if (k === 'enter' || k === ' ') { stop(); equip(); return; }
    const o = ITEMS.filter((i) => i.cat === cat).map((i) => i.id), i = o.indexOf(sel), grid = body.querySelector('.shp-grid'), cols = Math.max(1, Math.round((grid?.clientWidth || 300) / 130));
    const d = { arrowleft: -1, a: -1, arrowright: 1, d: 1, arrowup: -cols, w: -cols, arrowdown: cols, s: cols }[k];
    if (d != null) { stop(); sel = o[Math.max(0, Math.min(o.length - 1, i + d))]; resetPreview(); if (owned().has(sel)) preview(sel); render(); body.querySelector('.card2.sel')?.scrollIntoView({ block: 'nearest' }); }
  };
  window.addEventListener('keydown', key, true);
  render();
  return {
    close, el,
    select(id) { const it = byId(id); tab = 'coll'; cat = it.cat; sel = id; resetPreview(); preview(id); render(); },
    tab(t) { tab = t; render(); },
    open: (i) => tryOpen(i), opening: () => opening,
  };
}

// ================================================================ the opening show
function runOpening(crate, pulls, ctx) {
  const { sfx } = ctx, best = pulls.reduce((a, p) => (rank(p.r) > rank(a.r) ? p : a), pulls[0]), top = rank(best.r), multi = pulls.length > 1;
  const root = document.getElementById('ui');
  const el = h(`<div class="layer" id="crateopen" style="--glow:#ffffff">
    <canvas class="cfx"></canvas><div class="crays"></div><div class="cvig"></div><div class="cflash"></div>
    <div class="cstage">${crateArt(crate, true)}</div>
    <div class="creel"><div class="cstrip"></div><div class="cmark"></div></div>
    <div class="ccards"></div>
    <div class="creveal"></div>
    <div class="cskip">${TOUCH ? 'tap' : 'click / Space'} to skip</div>
  </div>`);
  root.appendChild(el);
  const cv = el.querySelector('.cfx'), g = cv.getContext('2d'), stage = el.querySelector('.cstage'), art = stage.querySelector('.crateart');
  const fit = () => { cv.width = innerWidth * Math.min(2, devicePixelRatio || 1); cv.height = innerHeight * Math.min(2, devicePixelRatio || 1); }; fit();
  const parts = [];
  const burst = (n, col, speed = 9, life = 1.2, cx = 0.5, cy = 0.48) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * speed; parts.push({ x: cx * cv.width, y: cy * cv.height, vx: Math.cos(a) * v * 60, vy: Math.sin(a) * v * 60 - 200, life, max: life, col: col === 'rainbow' ? `hsl(${Math.random() * 360},100%,60%)` : col, s: 2 + Math.random() * 5 }); } };
  // the rarity ladder: each step lights the seams one tier hotter, with a chime a little higher
  const steps = [0]; for (let r = 1; r <= top; r++) steps.push(r);
  const tStep = (i) => 0.7 + i * 0.32, tBurst = tStep(steps.length - 1) + (top >= 3 ? 0.8 : 0.32);
  let t0 = performance.now(), last = t0, phase = 'build', stepDone = 0, burstDone = false, skipOK = false, raf = 0;
  const glowCol = (r) => (r === 'mythic' ? '#ff2a4d' : RC(r));
  // ---- the reel (single pulls): ~40 cards, winner near the end, a juicier card parked right after it
  const reel = el.querySelector('.creel'), strip = el.querySelector('.cstrip');
  const W = 31, CW = 140;
  let reelT = 0, reelDur = top >= 3 ? 3.4 : 2.8, reelFrom = 0, reelTo = 0, lastIdx = -1;
  if (!multi) {
    const rates = crate.rates, randR = () => { let x = Math.random(); for (const t of TIERS) { if ((x -= rates[t]) < 0) return t; } return 'rare'; };
    const pick = (r) => { const l = ITEMS.filter((i) => !i.def && i.r === r); return l[Math.floor(Math.random() * l.length)]; };
    const cards = Array.from({ length: 40 }, (_, i) => (i === W ? best.item : i === W + 1 ? pick(top < 3 ? (Math.random() < 0.5 ? 'legendary' : 'mythic') : 'epic') : pick(randR())));
    strip.innerHTML = cards.map((it) => cardHTML(it)).join('');
    const frac = 0.58 + Math.random() * 0.34; // where on the winning card the marker stops: sometimes a hair from the next one
    reelTo = W * CW + frac * (CW - 8);
  }
  const ease = (u) => 1 - Math.pow(1 - u, 4);
  // ---- multi: cards come out face-down, coloured by rarity (the tell), flip one by one, best last
  const cardsEl = el.querySelector('.ccards');
  if (multi) cardsEl.innerHTML = pulls.map((p, i) => `<div class="mcard r-${p.r}" style="--rc:${glowCol(p.r)};--i:${i}" data-i="${i}"><div class="mback"></div><div class="mface">${cardHTML(p.item, p.dupe ? `<em class="dupe">+${p.refund}🪙</em>` : '<em class="new">NEW</em>')}</div></div>`).join('');
  let flipT = 0, flipped = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    if (t > 1) { skipOK = true; el.classList.add('canskip'); }
    if (phase === 'build') {
      // wobble grows; the seams step up the rarity ladder
      while (stepDone < steps.length && t >= tStep(stepDone)) { const r = TIERS[steps[stepDone]]; el.style.setProperty('--glow', glowCol(r)); art.dataset.r = r; sfx('chime', 0.55 + stepDone * 0.1, 0.8 + stepDone * 0.17); if (stepDone >= 3) { el.classList.add('edge'); sfx('boom', 0.35, 1.6); } if (r === 'mythic') el.classList.add('mythic'); stepDone++; }
      const k = Math.min(1, t / tBurst), shake = (Math.sin(t * 38) * 4 + Math.sin(t * 23) * 3) * k * k * (1 + top * 0.35);
      const pause = top >= 3 && t > tStep(steps.length - 1) + 0.15; // the held breath before a Legendary pops
      art.style.transform = pause ? `scale(${1.04 + Math.sin(t * 40) * 0.006})` : `rotate(${shake * 0.6}deg) translate(${shake}px, ${-Math.abs(shake) * 0.4}px) scale(${1 + k * 0.06})`;
      el.classList.toggle('cpause', pause);
      if (t >= tBurst && !burstDone) {
        burstDone = true; phase = multi ? 'cards' : 'reel'; el.classList.add('popped'); el.classList.remove('cpause'); stage.classList.add('punch');
        const col = top === 4 ? 'rainbow' : glowCol(best.r);
        burst(60 + top * 50, col, 8 + top * 2); if (top >= 3) burst(80, '#ffffff', 12, 0.8);
        sfx('boom', 0.7, top >= 3 ? 0.7 : 1); sfx(top >= 3 ? 'stinger' : 'rise', top >= 3 ? 0.9 : 0.6, top === 4 ? 0.9 : 1);
        if (!multi) { reel.classList.add('on'); reelT = 0; }
        else cardsEl.classList.add('on');
      }
    } else if (phase === 'reel') {
      reelT += dt; const u = Math.min(1, reelT / reelDur), x = reelFrom + (reelTo - reelFrom) * ease(u);
      strip.style.transform = `translateX(${-x}px)`;
      const idx = Math.floor((x + CW / 2) / CW); if (idx !== lastIdx) { lastIdx = idx; sfx('tick', 0.5 + (1 - u) * 0.3, 0.9 + Math.random() * 0.2); }
      if (u >= 1) reveal();
    } else if (phase === 'cards') {
      flipT += dt; const gap = 0.5;
      while (flipped < pulls.length && flipT > 0.5 + flipped * gap + (flipped === pulls.length - 1 && top >= 3 ? 0.5 : 0)) { flip(flipped); flipped++; }
      if (flipped >= pulls.length && flipT > 0.5 + pulls.length * gap + 0.9) reveal();
    }
    // particles + ambient sparkle for the big ones
    g.clearRect(0, 0, cv.width, cv.height);
    if (phase !== 'build' && top >= 3 && Math.random() < 0.5) burst(1, top === 4 ? 'rainbow' : glowCol(best.r), 2, 1.6, Math.random(), 0.7 + Math.random() * 0.3);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.2; g.globalAlpha = Math.min(1, p.life / p.max * 1.5); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function flip(i) {
    const c = cardsEl.querySelector(`[data-i="${i}"]`), p = pulls[i]; c.classList.add('flip');
    sfx('chime', 0.5 + rank(p.r) * 0.12, 0.8 + rank(p.r) * 0.2); if (rank(p.r) >= 3) { sfx('stinger', 0.7, 1.1); const b = c.getBoundingClientRect(); burst(70, p.r === 'mythic' ? 'rainbow' : glowCol(p.r), 9, 1.2, (b.left + b.width / 2) / innerWidth, (b.top + b.height / 2) / innerHeight); }
  }
  let selI = pulls.indexOf(best);
  function reveal() {
    if (phase === 'reveal') return;
    phase = 'reveal'; el.classList.add('revealed'); el.classList.remove('cpause');
    if (!multi) strip.style.transform = `translateX(${-reelTo}px)`;
    else { cardsEl.querySelectorAll('.mcard').forEach((c) => c.classList.add('flip')); cardsEl.classList.add('on', 'pick'); }
    showCard(selI);
  }
  function showCard(i) {
    selI = i; const p = pulls[i], it = p.item;
    ctx.preview(it.id);
    cardsEl.querySelectorAll('.mcard').forEach((c) => c.classList.toggle('sel', +c.dataset.i === i));
    const eq = ctx.equipped[it.cat] === it.id;
    const rv = el.querySelector('.creveal');
    rv.style.setProperty('--rc', glowCol(p.r)); rv.className = `creveal on r-${p.r}`;
    rv.innerHTML = `<div class="rban">${RARITY[p.r].name}</div><b>${it.name}</b><small>${CATS.find((c) => c[0] === it.cat)[1]} · ${it.desc}</small>
      ${p.dupe ? `<div class="rdupe">DUPLICATE · +${p.refund} 🪙 refunded</div>` : '<div class="rnew">NEW! added to your collection</div>'}
      <div class="rbtns"><button class="btn${eq ? ' done' : ''}" id="req">${eq ? 'EQUIPPED ✓' : 'EQUIP'}</button><button class="btn ghost" id="ragain">OPEN ANOTHER ${coin(crate.price)}</button><button class="btn ghost" id="rdone">DONE${TOUCH ? '' : ' <small>Esc</small>'}</button></div>`;
    rv.querySelector('#req').onclick = () => { ctx.onEquip(it); showCard(i); sfx('ding', 0.6, 1.5); };
    rv.querySelector('#rdone').onclick = () => done(false);
    rv.querySelector('#ragain').onclick = () => done(true);
  }
  cardsEl.addEventListener('click', (e) => { const c = e.target.closest('.mcard'); if (c && phase === 'reveal') { showCard(+c.dataset.i); sfx('pop', 0.5, 1.3); } });
  el.addEventListener('click', (e) => { if (phase !== 'reveal' && skipOK && !e.target.closest('button')) skip(); });
  function skip() {
    if (phase === 'reveal') return;
    if (!burstDone) { el.style.setProperty('--glow', glowCol(best.r)); art.dataset.r = best.r; el.classList.add('popped'); if (top >= 3) el.classList.add('edge'); if (top === 4) el.classList.add('mythic'); burst(80, top === 4 ? 'rainbow' : glowCol(best.r), 9); sfx(top >= 3 ? 'stinger' : 'rise', 0.7); burstDone = true; reel.classList.add('on'); }
    reveal();
  }
  function done(again) { cancelAnimationFrame(raf); el.remove(); ctx.onDone(again && ctx.store.get('wallet', 0) >= crate.price); }
  raf = requestAnimationFrame(frame);
  return {
    key(k) {
      if (phase !== 'reveal') { if ((k === ' ' || k === 'enter' || k === 'escape') && skipOK) skip(); return; }
      if (k === 'escape') done(false);
      else if (k === 'enter' || k === ' ') el.querySelector('#req')?.click();
      else if (k === 'r') done(true);
      else if (multi && (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd')) showCard((selI + (k === 'arrowleft' || k === 'a' ? pulls.length - 1 : 1)) % pulls.length);
    },
    skip, state: () => phase,
  };
}
