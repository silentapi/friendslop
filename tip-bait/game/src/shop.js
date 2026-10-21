// The gobbl store: spend tip-coins on bags, outfits and head gear. Selecting a card previews it live on the courier
// (the game keeps rendering him on a turntable behind the panel); BUY / EQUIP persist through the store helper.
import { ITEMS, CATS, DEFAULTS, byId } from './cosmetics.js';

const TOUCH = matchMedia('(pointer: coarse)').matches;
const coin = (n) => `<span class="coin">🪙</span>${n.toLocaleString('en-US')}`;

export function openShop({ store, cos, onClose, sfx }) {
  const wallet = () => store.get('wallet', 0);
  const owned = new Set(store.get('owned', Object.values(DEFAULTS)));
  for (const d of Object.values(DEFAULTS)) owned.add(d);
  const equipped = { ...DEFAULTS, ...store.get('equipped', {}) };
  let cat = 'bag', sel = equipped.bag;
  const root = document.getElementById('ui');
  const el = document.createElement('div'); el.className = 'layer'; el.id = 'shop'; root.appendChild(el);
  el.innerHTML = `
    <div class="shp">
      <div class="shp-hd">
        <button class="shp-back" id="shpback">← ${TOUCH ? '' : '<small>Esc</small>'}</button>
        <div class="shp-title">gobbl <b>STORE</b></div>
        <div class="wallet" id="shpw"></div>
      </div>
      <div class="shp-tabs">${CATS.map(([id, label, ic]) => `<button data-cat="${id}">${ic} ${label}</button>`).join('')}</div>
      <div class="shp-grid" id="shpgrid"></div>
      <div class="shp-ft">
        <div class="shp-info"><b id="shpname"></b><small id="shpdesc"></small></div>
        <button class="btn shp-act" id="shpact"></button>
      </div>
    </div>`;
  const grid = el.querySelector('#shpgrid'), act = el.querySelector('#shpact');
  const render = () => {
    el.querySelector('#shpw').innerHTML = coin(wallet());
    el.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat));
    const items = ITEMS.filter((i) => i.cat === cat);
    grid.innerHTML = items.map((i) => {
      const own = owned.has(i.id), eq = equipped[cat] === i.id;
      const tag = eq ? '<i class="st eq">EQUIPPED</i>' : own ? '<i class="st own">OWNED</i>' : `<i class="st price${wallet() < i.price ? ' poor' : ''}">${coin(i.price)}</i>`;
      return `<button class="card2 ${i.tier}${i.id === sel ? ' sel' : ''}" data-id="${i.id}"><span class="sw" style="background:${i.sw}">${i.icon || ''}</span>${i.tier === 'wacky' ? '<em class="wk">WACKY</em>' : ''}<span class="nm">${i.name}</span>${tag}</button>`;
    }).join('');
    const it = byId(sel), own = owned.has(sel), eq = equipped[cat] === sel, short = it.price - wallet();
    el.querySelector('#shpname').textContent = it.name; el.querySelector('#shpdesc').textContent = it.desc;
    act.className = 'btn shp-act' + (eq ? ' done' : !own && short > 0 ? ' poor' : '');
    act.innerHTML = eq ? 'EQUIPPED ✓' : own ? `EQUIP${TOUCH ? '' : ' <small>⏎</small>'}` : short > 0 ? `NEED ${coin(short)} MORE` : `BUY ${coin(it.price)}${TOUCH ? '' : ' <small>⏎</small>'}`;
    grid.querySelectorAll('.card2').forEach((c) => c.onclick = () => { sel = c.dataset.id; cos.apply(cat, sel); sfx?.('pop', 0.6, 1.3); render(); });
  };
  const choose = (c) => { cat = c; sel = equipped[cat]; for (const k of Object.keys(DEFAULTS)) cos.apply(k, equipped[k]); render(); };
  el.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { choose(b.dataset.cat); sfx?.('pop', 0.5, 1); });
  act.onclick = () => {
    const it = byId(sel), own = owned.has(sel);
    if (equipped[cat] === sel) return;
    if (!own) {
      if (wallet() < it.price) { sfx?.('bwomp', 0.5, 1.4); act.classList.remove('shake'); void act.offsetWidth; act.classList.add('shake'); return; }
      store.set('wallet', wallet() - it.price); owned.add(sel); store.set('owned', [...owned]);
      sfx?.('jingle', 0.8, it.tier === 'wacky' ? 1 : 1.3); sfx?.('ding', 0.7, 1.4);
      const burst = document.createElement('div'); burst.className = 'shp-burst'; burst.textContent = it.tier === 'wacky' ? 'NO WAY. YOU BOUGHT IT.' : 'PURCHASED'; el.appendChild(burst); setTimeout(() => burst.remove(), 1200);
    }
    equipped[cat] = sel; store.set('equipped', equipped); cos.apply(cat, sel); sfx?.('pop', 0.8, 1.6);
    render();
  };
  const close = () => { for (const k of Object.keys(DEFAULTS)) cos.apply(k, equipped[k]); window.removeEventListener('keydown', key, true); el.remove(); onClose?.(); };
  el.querySelector('#shpback').onclick = close;
  const order = () => ITEMS.filter((i) => i.cat === cat).map((i) => i.id);
  const key = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'backspace') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (k === 'enter' || k === ' ') { e.preventDefault(); e.stopImmediatePropagation(); act.click(); return; }
    if (k === 'tab' || k === 'q' || k === 'e') { e.preventDefault(); e.stopImmediatePropagation(); const ids = CATS.map((c) => c[0]); choose(ids[(ids.indexOf(cat) + (k === 'q' || e.shiftKey ? 2 : 1)) % 3]); return; }
    const o = order(), i = o.indexOf(sel), cols = Math.max(1, Math.round(grid.clientWidth / 150));
    const d = { arrowleft: -1, a: -1, arrowright: 1, d: 1, arrowup: -cols, w: -cols, arrowdown: cols, s: cols }[k];
    if (d != null) { e.preventDefault(); e.stopImmediatePropagation(); sel = o[Math.max(0, Math.min(o.length - 1, i + d))]; cos.apply(cat, sel); sfx?.('pop', 0.5, 1.3); render(); grid.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }); }
  };
  window.addEventListener('keydown', key, true);
  render();
  return { close, el, select(id) { const it = byId(id); cat = it.cat; sel = id; cos.apply(cat, sel); render(); } };
}
