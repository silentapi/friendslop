// Season 1: Rush Hour — the battle pass. 30 tiers on two tracks: FREE for everyone, and gobbl+ (premium; a demo
// toggle for now, no payments). Every run earns XP scaled by how well it went; tiers unlock rewards to claim:
// coins, crate keys, pass-exclusive bags/outfits/headgear and — premium only — bikes, ending in a mythic chopper.
// Storage: 'bp' = { xp, premium, claimed: { free: [tier…], prem: [tier…] } } · coins → 'wallet' · keys → 'keys' · items → 'owned'
import { byId, RARITY, CATS } from './cosmetics.js';

export const SEASON = { id: 's1', name: 'RUSH HOUR', label: 'SEASON 1', tiers: 30 };
// XP to go from tier n-1 to n: early tiers come fast (a decent run ≈ 1–1.5 tiers), later ones slower
export const xpFor = (n) => 800 + 60 * (n - 1);
export const XP_TOTAL = Array.from({ length: SEASON.tiers }, (_, i) => xpFor(i + 1)).reduce((a, b) => a + b, 0);
export function levelOf(xp) {
  let t = 0, left = xp;
  while (t < SEASON.tiers && left >= xpFor(t + 1)) { left -= xpFor(t + 1); t++; }
  return { tier: t, into: t >= SEASON.tiers ? 0 : left, need: t >= SEASON.tiers ? 1 : xpFor(t + 1), max: t >= SEASON.tiers };
}
const C = (n) => ({ type: 'coins', n }), K = (crate, n = 1) => ({ type: 'key', crate, n }), IT = (id) => ({ type: 'item', id });
// [free, premium] per tier
export const TRACK = [
  [C(100), IT('bike_fixie')], [C(150), C(250)], [K('standard'), K('standard')], [C(150), C(300)], [C(200), IT('bike_bmx')],
  [IT('bag_meter'), K('premium')], [C(200), IT('head_visor')], [K('standard'), C(400)], [C(250), IT('bike_cargo')], [C(300), K('premium')],
  [K('standard'), C(500)], [IT('head_hardhat'), K('standard', 2)], [C(300), IT('bike_patrol')], [K('standard'), C(600)], [C(350), IT('bag_signal')],
  [C(350), K('premium')], [K('standard'), IT('bike_tandem')], [IT('fit_reflect'), C(800)], [C(400), K('premium')], [K('premium'), C(1000)],
  [C(400), IT('bike_ebike')], [K('standard'), K('premium')], [C(500), C(1200)], [K('standard'), K('premium', 2)], [C(600), IT('bike_synth')],
  [K('premium'), C(1500)], [C(700), IT('fit_racer')], [K('standard', 2), K('premium', 2)], [C(800), C(2500)], [C(1500), IT('bike_chopper')],
];
const KEYNAME = { standard: 'Standard Crate key', premium: 'Premium Crate key' };
export const rewardName = (r) => (r.type === 'coins' ? `${r.n.toLocaleString('en-US')} coins` : r.type === 'key' ? `${r.n > 1 ? r.n + '× ' : ''}${KEYNAME[r.crate]}` : byId(r.id).name);
const rarityOf = (r) => (r.type === 'item' ? byId(r.id).r : r.type === 'key' ? (r.crate === 'premium' ? 'epic' : 'rare') : r.n >= 1000 ? 'epic' : r.n >= 400 ? 'rare' : 'common');

export function state(store) {
  const s = store.get('bp', null) || { xp: 0, premium: false, claimed: { free: [], prem: [] } };
  s.claimed ||= { free: [], prem: [] }; return s;
}
const save = (store, s) => store.set('bp', s);

// XP for a run. rows = per-section ratings from UI.rateAll (pct 0..1); partial = crashed out / quit (40%, no rows)
export function runXP({ rows = [], grade = 'D', perfect = false, coins = 0, dist = 0, partial = false }) {
  const parts = [];
  parts.push(['delivery', partial ? 80 : 250]);
  const sec = Math.round(rows.reduce((a, r) => a + (r.r ? r.r.pct : 0), 0) * 70); if (sec) parts.push(['sections', sec]);
  if (!partial) parts.push([`grade ${grade}`, { S: 600, A: 400, B: 250, C: 120, D: 50 }[grade] || 0]);
  if (perfect) parts.push(['PERFECT RUN', 1000]);
  if (coins) parts.push(['coins', Math.round(coins * 2)]);
  if (dist) parts.push(['distance', Math.round(dist / 12)]);
  let total = parts.reduce((a, p) => a + p[1], 0);
  if (partial) total = Math.round(total * 0.4);
  return { total, parts };
}
export function award(store, xp) {
  const s = state(store), before = s.xp; s.xp = Math.min(XP_TOTAL, s.xp + xp); save(store, s);
  return { before, after: s.xp };
}
export const claimable = (s, t, track) => { const lv = levelOf(s.xp).tier; return t <= lv && !(s.claimed[track] || []).includes(t) && (track === 'free' || s.premium); };
export function claim(store, t, track) {
  const s = state(store); if (!claimable(s, t, track)) return null;
  const r = TRACK[t - 1][track === 'free' ? 0 : 1];
  if (r.type === 'coins') store.set('wallet', store.get('wallet', 0) + r.n);
  if (r.type === 'key') { const k = store.get('keys', {}); k[r.crate] = (k[r.crate] || 0) + r.n; store.set('keys', k); }
  if (r.type === 'item') { const o = new Set(store.get('owned', [])); o.add(r.id); store.set('owned', [...o]); }
  s.claimed[track].push(t); save(store, s);
  return r;
}

// ================================================================ the battle pass screen
const TOUCH = matchMedia('(pointer: coarse)').matches;
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const coin = (n) => `<span class="coin">🪙</span>${Math.round(n).toLocaleString('en-US')}`;
function cardInner(r) {
  if (r.type === 'coins') return `<span class="ri">🪙</span><b>${r.n.toLocaleString('en-US')}</b>`;
  if (r.type === 'key') return `<span class="ri">🔑</span><b>${r.n > 1 ? '×' + r.n + ' ' : ''}${r.crate === 'premium' ? 'PREM' : 'STD'}</b>`;
  const it = byId(r.id); return `<span class="ri sw" style="background:${it.sw}">${it.icon || ''}</span><b>${it.name}</b>`;
}
export function openBattlePass({ store, cos, sfx = () => {}, onClose }) {
  let s = state(store), sel = { t: Math.max(1, Math.min(SEASON.tiers, levelOf(s.xp).tier + 1)), track: 'free' }, modal = null;
  const equipped = () => ({ bag: 'bag_classic', outfit: 'fit_classic', head: 'head_helmet', bike: 'bike_classic', ...store.get('equipped', {}) });
  const resetPreview = () => { const e = equipped(); for (const k of Object.keys(e)) cos.apply(k, e[k]); };
  const el = h(`<div class="layer" id="bp"><div class="bp">
    <div class="bp-hd">
      <button class="shp-back" id="bpback">← ${TOUCH ? '' : '<small>Esc</small>'}</button>
      <div class="bp-title"><small>${SEASON.label}</small><b>${SEASON.name}</b></div>
      <div class="bp-lvl"><div class="bp-badge"><small>TIER</small><b id="bptier"></b></div><div class="bp-xp"><div class="bp-xpbar"><i id="bpxpf"></i></div><small id="bpxpt"></small></div></div>
      <div class="wallet" id="bpw"></div>
      <button class="bp-prem" id="bpprem"></button>
    </div>
    <div class="bp-rows"><div class="bp-lbl"><span>FREE</span><span class="p">gobbl+</span></div><div class="bp-track" id="bptrack"></div></div>
    <div class="bp-ft"><div class="bp-info" id="bpinfo"></div><div class="bp-btns"><button class="btn" id="bpact"></button><button class="btn ghost" id="bpall">CLAIM ALL${TOUCH ? '' : ' <small>C</small>'}</button></div></div>
  </div><div class="bp-fx" id="bpfx"></div></div>`);
  document.getElementById('ui').appendChild(el);
  const track = el.querySelector('#bptrack');
  const reward = (t, tr) => TRACK[t - 1][tr === 'free' ? 0 : 1];
  function render(scroll = false) {
    s = state(store); const lv = levelOf(s.xp);
    el.querySelector('#bptier').textContent = lv.tier; el.querySelector('#bpxpf').style.width = `${lv.max ? 100 : (lv.into / lv.need) * 100}%`;
    el.querySelector('#bpxpt').textContent = lv.max ? 'SEASON COMPLETE' : `${lv.into.toLocaleString('en-US')} / ${lv.need.toLocaleString('en-US')} XP to tier ${lv.tier + 1}`;
    el.querySelector('#bpw').innerHTML = coin(store.get('wallet', 0));
    const pb = el.querySelector('#bpprem'); pb.className = 'bp-prem' + (s.premium ? ' on' : ''); pb.innerHTML = s.premium ? '★ gobbl+ <small>DEMO</small>' : '★ UNLOCK gobbl+';
    track.innerHTML = TRACK.map((_, i) => {
      const t = i + 1, reached = t <= lv.tier, cell = (tr) => { const r = reward(t, tr), cl = (s.claimed[tr] || []).includes(t), can = claimable(s, t, tr), lockP = tr === 'prem' && !s.premium; return `<button class="bpc ${tr} r-${rarityOf(r)}${cl ? ' claimed' : ''}${can ? ' ready' : ''}${!reached ? ' locked' : ''}${lockP ? ' plock' : ''}${sel.t === t && sel.track === tr ? ' sel' : ''}${r.type === 'item' && byId(r.id).cat === 'bike' ? ' bike' : ''}" data-t="${t}" data-tr="${tr}" style="--rc:${RARITY[rarityOf(r)].color}">${cardInner(r)}${cl ? '<em class="ok">✓</em>' : can ? '<em class="go">CLAIM</em>' : lockP ? '<em class="lk">🔒</em>' : ''}</button>`; };
      return `<div class="bpcol${t === lv.tier + 1 ? ' next' : ''}${reached ? ' got' : ''}${t === SEASON.tiers ? ' final' : ''}"><div class="bpn">${t}</div>${cell('free')}${cell('prem')}</div>`;
    }).join('');
    track.querySelectorAll('.bpc').forEach((b) => b.onclick = () => select(+b.dataset.t, b.dataset.tr));
    info();
    if (scroll) track.querySelector('.bpc.sel')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    const any = TRACK.some((_, i) => claimable(s, i + 1, 'free') || claimable(s, i + 1, 'prem'));
    el.querySelector('#bpall').disabled = !any;
  }
  function info() {
    const r = reward(sel.t, sel.track), rr = rarityOf(r), it = r.type === 'item' ? byId(r.id) : null, lv = levelOf(s.xp).tier;
    const cl = (s.claimed[sel.track] || []).includes(sel.t), can = claimable(s, sel.t, sel.track), lockP = sel.track === 'prem' && !s.premium;
    const owned = it && new Set(store.get('owned', [])).has(it.id), eq = it && equipped()[it.cat] === it.id;
    el.querySelector('#bpinfo').innerHTML = `<small style="color:${RARITY[rr].color}">TIER ${sel.t} · ${sel.track === 'free' ? 'FREE' : 'gobbl+'} · ${RARITY[rr].name}${it ? ' · ' + CATS.find((c) => c[0] === it.cat)[1].replace(/S$/, '') : ''}</small><b>${rewardName(r)}</b><span>${it ? it.desc : r.type === 'key' ? 'opens a crate in the store for free.' : 'straight into your wallet.'}</span>`;
    const a = el.querySelector('#bpact');
    a.className = 'btn'; a.disabled = false;
    if (can) a.innerHTML = `CLAIM${TOUCH ? '' : ' <small>⏎</small>'}`;
    else if (cl && it && !eq) a.innerHTML = `EQUIP${TOUCH ? '' : ' <small>⏎</small>'}`;
    else if (cl && it && eq) { a.innerHTML = 'EQUIPPED ✓'; a.className = 'btn done'; }
    else if (cl) { a.innerHTML = 'CLAIMED ✓'; a.className = 'btn done'; }
    else if (lockP) { a.innerHTML = '★ gobbl+ ONLY'; a.className = 'btn prem'; }
    else { a.innerHTML = `REACH TIER ${sel.t}`; a.className = 'btn done'; a.disabled = true; }
    void owned; void lv;
  }
  function select(t, tr) {
    sel = { t, track: tr }; resetPreview();
    const r = reward(t, tr); if (r.type === 'item') cos.apply(byId(r.id).cat, r.id);
    sfx('pop', 0.5, 1.25); render(true);
  }
  function fx(target, r, big) { // burst + a floating label over the claimed card
    const b = target?.getBoundingClientRect(); if (!b) return;
    const fxl = el.querySelector('#bpfx'), col = RARITY[rarityOf(r)].color;
    const n = big ? 46 : 18;
    for (let i = 0; i < n; i++) { const p = document.createElement('i'); const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * (big ? 160 : 80); p.style.cssText = `left:${b.left + b.width / 2}px;top:${b.top + b.height / 2}px;background:${i % 3 ? col : '#fff'};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;animation-delay:${Math.random() * 0.08}s`; fxl.appendChild(p); setTimeout(() => p.remove(), 900); }
    const lab = document.createElement('b'); lab.className = 'bp-float'; lab.style.cssText = `left:${b.left + b.width / 2}px;top:${b.top}px;color:${col}`; lab.textContent = r.type === 'coins' ? `+${r.n} 🪙` : r.type === 'key' ? `+${r.n} 🔑` : 'NEW!'; fxl.appendChild(lab); setTimeout(() => lab.remove(), 1200);
    if (big) { const f = document.createElement('div'); f.className = 'bp-flash'; f.style.setProperty('--rc', col); fxl.appendChild(f); setTimeout(() => f.remove(), 700); }
  }
  function doClaim(t, tr, quiet = false) {
    const card = track.querySelector(`.bpc[data-t="${t}"][data-tr="${tr}"]`);
    const r = claim(store, t, tr); if (!r) return null;
    const bike = r.type === 'item' && byId(r.id).cat === 'bike', big = bike || (r.type === 'item' && RARITY[byId(r.id).r].rank >= 3);
    fx(card, r, big);
    if (!quiet || big) { sfx(big ? 'stinger' : 'chime', big ? 0.8 : 0.6, big ? 1 : 1 + Math.random() * 0.3); sfx(r.type === 'coins' ? 'ice' : 'ding', 0.5, 1.5); }
    return r;
  }
  function act() {
    const r = reward(sel.t, sel.track), it = r.type === 'item' ? byId(r.id) : null;
    if (claimable(s, sel.t, sel.track)) { doClaim(sel.t, sel.track); render(); if (it) cos.apply(it.cat, it.id); return; }
    if (sel.track === 'prem' && !s.premium) { premSheet(); return; }
    if (it && (s.claimed[sel.track] || []).includes(sel.t)) { const e = equipped(); e[it.cat] = it.id; store.set('equipped', e); cos.apply(it.cat, it.id); sfx('ding', 0.6, 1.5); render(); }
  }
  function claimAll() {
    const todo = []; for (let t = 1; t <= SEASON.tiers; t++) for (const tr of ['free', 'prem']) if (claimable(s, t, tr)) todo.push([t, tr]);
    todo.forEach(([t, tr], k) => setTimeout(() => { doClaim(t, tr, k > 0); render(); }, k * 140));
  }
  function premSheet() {
    if (modal) return;
    modal = h(`<div class="layer" id="premsheet"><div class="sheet prem">
      <b>★ gobbl+ PASS</b><small>Season 1 · Rush Hour</small>
      <ul><li>🚲 8 exclusive bikes — ending in <b>The Tip Collector</b></li><li>🔑 extra Premium Crate keys</li><li>🎒 pass-only bag, visor & racing leathers</li><li>🪙 bigger coin drops</li></ul>
      <div class="demo">DEMO BUILD — no payments yet. Unlock it free to try the premium track.</div>
      <button class="btn" id="premgo">UNLOCK (DEMO · FREE)</button><button class="btn ghost" id="premno">NOT NOW</button></div></div>`);
    document.getElementById('ui').appendChild(modal); sfx('pop', 0.6, 0.9);
    const shut = () => { modal?.remove(); modal = null; };
    modal.querySelector('#premno').onclick = shut; modal.onclick = (e) => { if (e.target === modal) shut(); };
    modal.querySelector('#premgo').onclick = () => { const st = state(store); st.premium = true; save(store, st); shut(); sfx('stinger', 0.7, 1.1); const f = document.createElement('div'); f.className = 'bp-flash'; f.style.setProperty('--rc', '#ffb627'); el.querySelector('#bpfx').appendChild(f); setTimeout(() => f.remove(), 700); render(); };
  }
  el.querySelector('#bpprem').onclick = () => { if (!state(store).premium) premSheet(); };
  el.querySelector('#bpact').onclick = act;
  el.querySelector('#bpall').onclick = claimAll;
  const close = () => { if (modal) return; resetPreview(); window.removeEventListener('keydown', key, true); el.remove(); onClose?.(); };
  el.querySelector('#bpback').onclick = close;
  const key = (e) => {
    const k = e.key.toLowerCase(), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (modal) { if (k === 'escape') { stop(); modal.remove(); modal = null; } else if (k === 'enter') { stop(); modal.querySelector('#premgo').click(); } return; }
    if (k === 'escape' || k === 'backspace') { stop(); close(); return; }
    if (k === 'arrowleft' || k === 'a') { stop(); select(Math.max(1, sel.t - 1), sel.track); return; }
    if (k === 'arrowright' || k === 'd') { stop(); select(Math.min(SEASON.tiers, sel.t + 1), sel.track); return; }
    if (k === 'arrowup' || k === 'w' || k === 'arrowdown' || k === 's') { stop(); select(sel.t, sel.track === 'free' ? 'prem' : 'free'); return; }
    if (k === 'enter' || k === ' ') { stop(); act(); return; }
    if (k === 'c') { stop(); claimAll(); }
  };
  window.addEventListener('keydown', key, true);
  render(true);
  select(sel.t, sel.track);
  return { close, el, select, claimAll, render };
}

// ================================================================ results: animated XP gain (+ tier-up pops)
export function xpWidget(host, { before, after, gained, parts, sfx = () => {}, onOpen }) {
  const lb = levelOf(before);
  const w = h(`<div class="xpline"><div class="xptier"><small>S1 TIER</small><b>${lb.tier}</b></div>
    <div class="xpmid"><div class="xptop"><b class="xpgain">+0 XP</b><small>${parts.map(([l, v]) => `${l} ${v.toLocaleString('en-US')}`).join(' · ')}</small></div><div class="xpbar"><i></i></div></div>
    <button class="btn ghost shopbtn" id="tobp">🎟 BATTLE PASS</button></div>`);
  host.appendChild(w);
  w.querySelector('#tobp').onclick = onOpen;
  const bar = w.querySelector('.xpbar i'), tierEl = w.querySelector('.xptier b'), gain = w.querySelector('.xpgain');
  const dur = Math.min(2.6, 1.0 + (after - before) / 2500), t0 = performance.now() + 450;
  let shown = lb.tier;
  bar.style.width = `${lb.max ? 100 : (lb.into / lb.need) * 100}%`;
  const step = (now) => {
    const u = Math.max(0, Math.min(1, (now - t0) / (dur * 1000))), e = 1 - Math.pow(1 - u, 3), xp = before + (after - before) * e, lv = levelOf(xp);
    bar.style.width = `${lv.max ? 100 : (lv.into / lv.need) * 100}%`;
    gain.textContent = `+${Math.round(gained * e).toLocaleString('en-US')} XP`;
    if (lv.tier > shown) { shown = lv.tier; tierEl.textContent = shown; w.classList.remove('up'); void w.offsetWidth; w.classList.add('up'); sfx('chime', 0.7, 1 + shown * 0.02); sfx('ding', 0.5, 1.4); const pop = h(`<em class="xpop">TIER ${shown}!</em>`); w.appendChild(pop); setTimeout(() => pop.remove(), 1300); }
    if (u < 1) requestAnimationFrame(step); else if (gained) sfx('pop', 0.4, 1.5);
  };
  requestAnimationFrame(step);
  return w;
}
