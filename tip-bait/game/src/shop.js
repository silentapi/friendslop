// The gobbl store: crates you open with tip-coins (rarity-tiered pulls, pity, duplicates → coins), a collection to
// equip from, and a "buy coins" sheet for later. Openings borrow the genre's grammar, in 3D: the crate flies to
// centre, hums and shakes with light leaking from its seams (white for everyone; only Kyle-tier climbs the rarity
// ladder), the lid blows off in a column of light, and a curved CS:GO-style wheel of cards decelerates under the
// needle: it lands at a random spot on the winner, often creeps to the edge next to something better, sometimes
// spills over and rolls back. The result is rolled before any of it plays; the show never changes it.
import * as THREE from 'three';
import { ITEMS, CATS, DEFAULTS, RARITY, byId } from './cosmetics.js';
import { CRATES, PITY, REFUND, TIERS, openCrate, keysFor } from './crates.js';

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

  // ---------------- crates tab: art, name, price. Odds, pity and refunds live behind each crate's ⓘ
  function renderCrates() {
    body.innerHTML = `
      <div class="crates2">${CRATES.map((c, i) => `
        <div class="crate2${i === crateSel ? ' sel' : ''}" data-i="${i}" style="--d:${i * 0.6}s">
          <button class="cinf" data-info="${i}" aria-label="odds and contents">i</button>
          <div class="cart">${crateArt(c)}</div>
          <b>${c.name.replace(' Crate', '')}</b>
          ${keysFor(store, c) ? `<button class="btn copen key" data-open="${i}">🔑 FREE${keysFor(store, c) > 1 ? ` ×${keysFor(store, c)}` : ''}</button>` : `<button class="btn copen${wallet() < c.price ? ' poor' : ''}" data-open="${i}">${coin(c.price)}</button>`}
        </div>`).join('')}
      </div>`;
    body.querySelectorAll('.crate2').forEach((c) => c.onclick = () => { crateSel = +c.dataset.i; sfx('pop', 0.5, 1.2); render(); });
    body.querySelectorAll('[data-open]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); tryOpen(+b.dataset.open); });
    body.querySelectorAll('[data-info]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); crateInfo(+b.dataset.info); });
  }
  function crateInfo(i) {
    if (modal) return;
    const c = CRATES[i], pity = store.get('pity', 0);
    modal = h(`<div class="layer" id="coinsheet"><div class="sheet cinfo2">
      <b>${c.name}</b><small>${c.blurb}</small>
      <div class="codds">${TIERS.filter((t) => c.rates[t] > 0).map((t) => `<div style="--rc:${RC(t)}"><em>${RARITY[t].name}</em><span><i style="width:${Math.max(2, c.rates[t] * 100)}%"></i></span><b>${(c.rates[t] * 100).toFixed(c.rates[t] < 0.01 ? 1 : 0)}%</b></div>`).join('')}</div>
      ${c.guarantee ? `<small>${c.rolls} rolls · ${RARITY[c.guarantee].name} or better guaranteed</small>` : ''}
      <small><b style="color:#ffb627">Legendary+ guaranteed</b> within ${PITY - pity} rolls · duplicates refund ${TIERS.map((t) => `<em style="color:${RC(t)};font-style:normal">${REFUND[t]}</em>`).join(' / ')} 🪙</small>
      <button class="btn ghost" id="sheetok">OK</button></div></div>`);
    document.getElementById('ui').appendChild(modal); sfx('pop', 0.6, 0.9);
    const shut = () => { modal?.remove(); modal = null; };
    modal.querySelector('#sheetok').onclick = shut; modal.onclick = (e) => { if (e.target === modal) shut(); };
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
        <div class="shp-info"><b style="color:${isOwn ? '#fff' : RC(it.r)}">${isOwn ? it.name : RARITY[it.r].name + ' · locked'}</b><small>${isOwn ? it.desc : it.bp ? 'Battle Pass exclusive · Season 1' + (it.cat === 'bike' ? ' (gobbl+ track)' : '') : 'found in crates. keep delivering.'}</small></div>
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
    const c = CRATES[i]; crateSel = i; const key = keysFor(store, c) > 0;
    if (!key && wallet() < c.price) { sfx('bwomp', 0.5, 1.4); const b = body.querySelector(`[data-open="${i}"]`); b?.classList.remove('shake'); void b?.offsetWidth; b?.classList.add('shake'); return; }
    const pulls = openCrate(c, store, Math.random, { key }); if (!pulls) return;
    const from = body.querySelector(`.crate2[data-i="${i}"] .crateart`)?.getBoundingClientRect();
    renderHead();
    el.classList.add('busy');
    opening = runOpening(c, pulls, { from, sfx, preview, resetPreview, equipped, store, onEquip: (it) => { equipped[it.cat] = it.id; store.set('equipped', equipped); cos.apply(it.cat, it.id); }, onDone: (again) => { opening = null; el.classList.remove('busy'); resetPreview(); render(); if (again) tryOpen(i); } });
    opening.keyUsed = key;
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
    if (k === 'q' || k === 'e') { stop(); const ids = CATS.map((c) => c[0]); cat = ids[(ids.indexOf(cat) + (k === 'q' ? ids.length - 1 : 1)) % ids.length]; sel = equipped[cat]; resetPreview(); render(); return; }
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


// ================================================================ the opening show (its own small three.js stage)
const LOOK = { std: ['#1d2228', '#2ee66f', 'CRATE'], prem: ['#17131c', '#ffb627', 'PREMIUM'], multi: ['#1a1030', '#c77dff', '×5'] };
function ctex(w, hh, draw) { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const rrect = (g, x, y, w, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); };
function swatchFill(g, sw, x, y, w, hh) { // the items' CSS gradients, redrawn on canvas
  const cols = sw.match(/#[0-9a-f]{3,8}/gi) || ['#555'];
  let gr;
  if (/^conic/.test(sw) && g.createConicGradient) gr = g.createConicGradient(0, x + w / 2, y + hh / 2);
  else { const m = /(\d+)deg/.exec(sw), a = ((m ? +m[1] : 180) - 90) * Math.PI / 180, cx = x + w / 2, cy = y + hh / 2, L = Math.max(w, hh) / 2; gr = g.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L); }
  cols.forEach((c, i) => gr.addColorStop(cols.length > 1 ? i / (cols.length - 1) : 0, c)); g.fillStyle = gr; g.fill();
}
const RAINBOW = ['#ff3b3b', '#ffd23b', '#3bff6a', '#3bb4ff', '#a33bff'];
function cardCanvas(it, blur) {
  return ctex(256, 320, (g, w, hh) => {
    const rc = RC(it.r), myth = it.r === 'mythic';
    if (blur) g.filter = 'blur(6px)';
    rrect(g, 6, 6, w - 12, hh - 12, 22); const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#2b3139'); bg.addColorStop(1, myth ? '#4a0f20' : rc + '66'); g.fillStyle = bg; g.fill();
    g.save(); rrect(g, 6, 6, w - 12, hh - 12, 22); g.clip();
    if (myth) { const rb = g.createLinearGradient(0, 0, w, 0); RAINBOW.forEach((c, i) => rb.addColorStop(i / 4, c)); g.fillStyle = rb; } else g.fillStyle = rc;
    g.fillRect(0, hh - 22, w, 22); g.restore();
    rrect(g, 22, 22, w - 44, 168, 16); swatchFill(g, it.sw, 22, 22, w - 44, 168);
    if (it.icon) { g.font = '88px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.icon, w / 2, 108); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = '800 25px Figtree, system-ui, sans-serif';
    const words = it.name.split(' '), lines = ['']; for (const wd of words) { const t = (lines[lines.length - 1] + ' ' + wd).trim(); if (g.measureText(t).width > w - 44 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = t; }
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 22, 222 + i * 28));
    g.fillStyle = myth ? '#ffd23b' : rc; g.font = '900 17px Figtree, system-ui, sans-serif'; g.fillText(RARITY[it.r].name, 22, hh - 34);
  });
}
const backCanvas = (col) => ctex(256, 320, (g, w, hh) => {
  rrect(g, 6, 6, w - 12, hh - 12, 22); const bg = g.createRadialGradient(w / 2, hh * 0.42, 10, w / 2, hh / 2, hh * 0.7); bg.addColorStop(0, col); bg.addColorStop(1, '#0d0f12'); g.fillStyle = bg; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 4; rrect(g, 18, 18, w - 36, hh - 36, 16); g.stroke();
  g.fillStyle = '#2ee66f'; g.font = '900 54px Archivo, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('gobbl', w / 2, hh / 2);
});
const glowTex = () => ctex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
const raysTex = () => ctex(512, 512, (g, w) => {
  g.translate(w / 2, w / 2);
  for (let i = 0; i < 18; i++) { g.rotate(Math.PI * 2 / 18); const gr = g.createLinearGradient(0, 0, w / 2, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -w * 0.045); g.lineTo(w / 2, w * 0.045); g.fill(); }
});
const beamTex = () => ctex(64, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, hh, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); const sx = g.createLinearGradient(0, 0, w, 0); sx.addColorStop(0, 'rgba(0,0,0,1)'); sx.addColorStop(0.5, 'rgba(0,0,0,0)'); sx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = sx; g.fillRect(0, 0, w, hh); });
function crateFace(look, side) {
  const [c1, c2, label] = LOOK[look] || LOOK.std;
  return ctex(512, 360, (g, w, hh) => {
    const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#3a424d'); bg.addColorStop(0.12, c1); bg.addColorStop(1, '#07080a'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3; for (let y = 40; y < hh; y += 52) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = c2; g.fillRect(0, 0, 26, hh); g.fillRect(w - 26, 0, 26, hh);
    if (side === 'front') { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 150px Archivo, system-ui, sans-serif'; g.fillStyle = c2; g.shadowColor = c2; g.shadowBlur = 24; g.fillText('gobbl', w / 2, hh * 0.46); g.shadowBlur = 0; g.font = '900 38px Figtree, system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(label.split('').join(' '), w / 2, hh * 0.78); }
    else if (side === 'top') { g.fillStyle = c2; g.fillRect(w / 2 - 22, 0, 44, hh); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(w / 2 - 4, 0, 8, hh); }
  });
}

function runOpening(crate, pulls, ctx) {
  const { sfx } = ctx, best = pulls.reduce((a, p) => (rank(p.r) > rank(a.r) ? p : a), pulls[0]), top = rank(best.r), multi = pulls.length > 1;
  const KT = top === 4; // only Kyle-tier is allowed to announce itself before it lands
  const glowCol = (r) => (r === 'mythic' ? '#ff2a4d' : RC(r));
  const root = document.getElementById('ui');
  const el = h(`<div class="layer" id="crateopen">
    <canvas class="c3d"></canvas><canvas class="cfx"></canvas><div class="cvig"></div><div class="cflash"></div>
    <div class="creveal"></div>
    <div class="cskip">${TOUCH ? 'tap' : 'click / Space'} to skip</div>
  </div>`);
  el.classList.add('cv2'); if (multi) el.classList.add('multi'); root.appendChild(el);
  const cvs = el.querySelector('.c3d'), fxc = el.querySelector('.cfx'), g2 = fxc.getContext('2d');
  const DPR = Math.min(2, devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(DPR); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x20242a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 0, 12); rim.position.set(0, 0.2, -2.5); scene.add(rim);
  let camZ = 10, halfW = 4, halfH = 3;
  const fit = () => {
    const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); fxc.width = W * DPR; fxc.height = H * DPR;
    cam.aspect = W / H; const tf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    camZ = Math.max(10, 2.6 / (tf * cam.aspect)); // phones: back off so ~3 cards of the wheel fit
    halfH = tf * camZ; halfW = halfH * cam.aspect; cam.position.set(0, 0.35, camZ); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', fit);
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const add = (geo, matl, parent = scene) => { const m = new THREE.Mesh(keep(geo), keep(matl)); parent.add(m); return m; };
  const additive = (map, col = 0xffffff, op = 1) => new THREE.MeshBasicMaterial({ map: keep(map), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

  // ---- the crate
  const [, accent] = LOOK[crate.look] || LOOK.std;
  const crateG = new THREE.Group(); scene.add(crateG);
  const BW = 2.3, BH = 1.45, BD = 1.6, LH = 0.34;
  const sideM = new THREE.MeshStandardMaterial({ map: keep(crateFace(crate.look, 'side')), roughness: 0.55, metalness: 0.25 });
  const frontM = new THREE.MeshStandardMaterial({ map: keep(crateFace(crate.look, 'front')), roughness: 0.5, metalness: 0.25, emissive: 0xffffff, emissiveIntensity: 0 });
  frontM.emissiveMap = frontM.map;
  const topM = new THREE.MeshStandardMaterial({ map: keep(crateFace(crate.look, 'top')), roughness: 0.55, metalness: 0.25 });
  keep(sideM); keep(frontM); keep(topM);
  const bodyM = add(new THREE.BoxGeometry(BW, BH, BD), null, crateG); bodyM.material = [sideM, sideM, sideM, sideM, frontM, sideM];
  const trimM = keep(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.6 }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = add(new THREE.BoxGeometry(0.1, BH + 0.02, 0.1), trimM, crateG); t.position.set(x * BW / 2, 0, z * BD / 2); }
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, BH / 2, -BD / 2); crateG.add(lidPivot);
  const lid = add(new THREE.BoxGeometry(BW + 0.12, LH, BD + 0.12), null, lidPivot); lid.material = [sideM, sideM, topM, sideM, sideM, sideM]; lid.position.set(0, LH / 2, BD / 2);
  const seamM = additive(glowTex(), 0xffffff, 0); const seam = add(new THREE.BoxGeometry(BW + 0.02, 0.05, BD + 0.02), seamM, crateG); seam.position.y = BH / 2 + 0.01;
  const leaks = [0, 1, 2, 3].map((i) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTex()), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))); s.position.set((i - 1.5) * 0.65, BH / 2 + 0.02, BD / 2 + 0.05); s.scale.set(1.4, 0.35, 1); crateG.add(s); return s; });
  const inner = new THREE.PointLight(0xffffff, 0, 6); inner.position.set(0, BH / 2 + 0.3, 0.2); crateG.add(inner);
  const beam = add(new THREE.CylinderGeometry(0.95, 1.15, 9, 32, 1, true), additive(beamTex(), 0xffffff, 0), crateG); beam.position.y = BH / 2 + 4.5;
  // rays behind everything (the reveal backdrop + the burst)
  const rays = add(new THREE.PlaneGeometry(1, 1), additive(raysTex(), 0xffffff, 0)); rays.position.z = -3; rays.scale.setScalar(16);
  const halo = add(new THREE.PlaneGeometry(1, 1), additive(glowTex(), 0xffffff, 0)); halo.position.z = -2.5; halo.scale.setScalar(7);

  // ---- particles (one capped pool)
  const PMAX = 700, pgeo = keep(new THREE.BufferGeometry()), ppos = new Float32Array(PMAX * 3), pcol = new Float32Array(PMAX * 3);
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const pts = new THREE.Points(pgeo, keep(new THREE.PointsMaterial({ size: 0.16, map: keep(glowTex()), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); pts.frustumCulled = false; scene.add(pts);
  const P = []; const tmpC = new THREE.Color();
  const emit = (n, at, col, speed = 6, life = 1.2, up = 2, spread = 1) => { for (let i = 0; i < n && P.length < PMAX; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), v = (0.35 + Math.random()) * speed; P.push({ x: at.x + (Math.random() - 0.5) * spread, y: at.y, z: at.z, vx: Math.sin(b) * Math.cos(a) * v, vy: Math.abs(Math.cos(b)) * v * 0.8 + up, vz: Math.sin(b) * Math.sin(a) * v * 0.6, life, max: life, c: col === 'rainbow' ? new THREE.Color().setHSL(Math.random(), 1, 0.6) : new THREE.Color(col) }); } };
  function stepParticles(dt) {
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; } p.vy -= 7 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 0.8; p.vz *= 1 - dt * 0.8; }
    for (let i = 0; i < PMAX; i++) { const p = P[i]; if (p) { ppos.set([p.x, p.y, p.z], i * 3); tmpC.copy(p.c).multiplyScalar(Math.min(1, (p.life / p.max) * 1.6)); pcol.set([tmpC.r, tmpC.g, tmpC.b], i * 3); } else { ppos.set([0, -99, 0], i * 3); } }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true; pgeo.setDrawRange(0, Math.max(1, P.length));
  }
  // 2D confetti on top for the big ones
  const conf = [];
  const confetti = (n, cols) => { for (let i = 0; i < n; i++) conf.push({ x: Math.random() * fxc.width, y: -20 - Math.random() * fxc.height * 0.4, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 260, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, w: 6 + Math.random() * 8, hh: 10 + Math.random() * 10, c: cols[i % cols.length], life: 3 + Math.random() }); };
  function stepConfetti(dt) {
    g2.clearRect(0, 0, fxc.width, fxc.height);
    for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.life -= dt; if (c.life <= 0 || c.y > fxc.height + 30) { conf.splice(i, 1); continue; } c.vy += 140 * dt; c.x += (c.vx + Math.sin(c.life * 4) * 40) * dt * DPR; c.y += c.vy * dt * DPR; c.r += c.vr * dt; g2.save(); g2.translate(c.x, c.y); g2.rotate(c.r); g2.scale(Math.cos(c.life * 7), 1); g2.fillStyle = c.c; g2.fillRect(-c.w / 2 * DPR, -c.hh / 2 * DPR, c.w * DPR, c.hh * DPR); g2.restore(); }
  }

  // ---- screen ↔ world on the z = 0 plane
  const toWorld = (sx, sy, z = 0) => { const d = camZ - z, hh2 = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * d; return new THREE.Vector3((sx / innerWidth * 2 - 1) * hh2 * cam.aspect, 0.35 + (1 - sy / innerHeight * 2) * hh2, z); };
  const start = ctx.from ? toWorld(ctx.from.left + ctx.from.width / 2, ctx.from.top + ctx.from.height / 2, 2) : new THREE.Vector3(halfW * 0.6, -halfH * 0.6, 2);
  const startS = ctx.from ? Math.max(0.12, (ctx.from.width / innerWidth) * 2 * halfW / BW * ((camZ - 2) / camZ)) : 0.3;
  crateG.position.copy(start); crateG.scale.setScalar(startS);
  const crateScale = Math.min(1, halfW / 1.9);

  // ---- the wheel (single pulls): cards on a cylinder; the needle sits at the front
  const CWID = 1.3, CHGT = 1.6, GAP = 0.14, R = 7.5, STEP = (CWID + GAP) / R;
  const wheel = new THREE.Group(); wheel.position.set(0, 0.25, -R); wheel.visible = false; scene.add(wheel);
  const cardGeo = keep(new THREE.PlaneGeometry(CWID, CHGT)); const cards = [];
  let W = 0, plan = null;
  const makeCard = (it, parent) => {
    const g = new THREE.Group(); parent.add(g);
    const sharp = new THREE.Mesh(cardGeo, keep(new THREE.MeshBasicMaterial({ map: keep(cardCanvas(it, false)), transparent: true, depthWrite: false }))); g.add(sharp);
    const blur = new THREE.Mesh(cardGeo, keep(new THREE.MeshBasicMaterial({ map: keep(cardCanvas(it, true)), transparent: true, opacity: 0, depthWrite: false }))); blur.scale.x = 1.12; blur.position.z = 0.002; g.add(blur);
    return { g, sharp, blur, it };
  };
  if (!multi) {
    const rates = crate.rates, randR = () => { let x = Math.random(); for (const t of TIERS) { if ((x -= rates[t]) < 0) return t; } return 'rare'; };
    const pick = (r) => { const l = ITEMS.filter((i) => !i.def && !i.bp && i.r === r); return l[Math.floor(Math.random() * l.length)]; };
    const juicy = () => pick(top < 3 ? (Math.random() < 0.7 ? 'legendary' : 'mythic') : top === 3 ? 'mythic' : 'legendary');
    W = 26 + Math.floor(Math.random() * 10); // where on the strip the winner sits varies run to run
    const N = W + 9, mode = Math.random() < 0.38 ? 'edge' : Math.random() < 0.45 ? 'over' : 'plain', side = Math.random() < 0.5 ? -1 : 1;
    // landing spot on the winning card (in card widths from its centre; the card edge is ±0.45)
    const off = mode === 'edge' ? side * (0.37 + Math.random() * 0.06) : mode === 'over' ? side * (0.18 + Math.random() * 0.22) : (Math.random() - 0.5) * 0.74;
    const peak = mode === 'edge' ? side * (0.445 + Math.random() * 0.03) : mode === 'over' ? side * (0.56 + Math.random() * 0.14) : off;
    const items = Array.from({ length: N }, (_, i) => (i === W ? best.item : pick(randR())));
    if (mode !== 'plain' || Math.random() < 0.6) items[W + side] = juicy(); // the near miss sits on the side the needle leans to
    if (Math.random() < 0.5) items[W - side] = pick(Math.random() < 0.5 ? 'epic' : 'legendary');
    items.forEach((it, i) => { const c = makeCard(it, wheel); const a = i * STEP; c.g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); c.g.rotation.y = a; c.a = a; cards.push(c); });
    const from = (2 + Math.random() * 2) * STEP;
    plan = { mode, from, peak: (W + peak) * STEP, to: (W + off) * STEP, dur: mode === 'edge' ? 5.4 : 4.6 + Math.random() * 0.5, pw: mode === 'edge' ? 5.2 : 4 };
  }
  // needle: a glowing line + two pips, just in front of the front card
  const needle = new THREE.Group(); needle.position.set(0, 0.25, 0.06); needle.visible = false; scene.add(needle);
  const nM = keep(new THREE.MeshBasicMaterial({ color: 0xffd23b, transparent: true, depthWrite: false }));
  const nl = add(new THREE.PlaneGeometry(0.05, CHGT + 0.5), nM, needle);
  for (const s of [1, -1]) { const tri = add(new THREE.ConeGeometry(0.14, 0.24, 3), nM, needle); tri.position.y = s * (CHGT / 2 + 0.32); tri.rotation.z = s > 0 ? Math.PI : 0; }
  const nGlow = add(new THREE.PlaneGeometry(0.5, CHGT + 0.8), additive(glowTex(), 0xffd23b, 0.5), needle); nGlow.position.z = -0.01; void nl;

  // ---- multi (×5): face-down cards fly out of the crate, flip best-last
  const mcards = [];
  if (multi) pulls.forEach((p, i) => {
    const c = makeCard(p.item, scene); c.blur.visible = false;
    const back = new THREE.Mesh(cardGeo, keep(new THREE.MeshBasicMaterial({ map: keep(backCanvas(KT ? glowCol(p.r) : '#3a4048')), transparent: true }))); back.rotation.y = Math.PI; back.position.z = -0.003; c.g.add(back);
    c.sharp.material.side = THREE.FrontSide; c.g.visible = false; c.p = p; c.flip = 0; c.flipT = null; mcards.push(c);
  });
  const rowSpot = (i, n, y = 0.25) => { const span = Math.min(halfW * 1.8, n * (CWID + 0.25)), x = -span / 2 + (i + 0.5) * span / n, s = Math.min(1, span / n / (CWID + 0.25)); return { x, y, s }; };

  // ---- timeline
  const FLY = 0.6, steps = KT ? [0, 1, 2, 3, 4] : [0, 0, 0];
  const tStep = (i) => FLY + 0.35 + i * 0.34, tBurst = tStep(steps.length - 1) + (KT ? 0.85 : 0.4);
  let t = 0, last = performance.now(), phase = 'fly', stepDone = 0, raf = 0, skipOK = false, burstAt = 0, spinT = 0, lastIdx = null, kick = 0, revealT = 0, flipped = 0, flipClock = 0, selI = pulls.indexOf(best), glow = '#ffffff', shake = 0;
  sfx('whoosh', 0.7, 0.8);
  const easeOutBack = (u) => 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
  function setGlow(c) { glow = c; seamM.color.set(c); leaks.forEach((s) => s.material.color.set(c)); inner.color.set(c); rim.color.set(c); beam.material.color.set(c); el.style.setProperty('--glow', c); }
  function pop() {
    phase = multi ? 'deal' : 'spin'; burstAt = t; el.classList.add('popped'); el.classList.remove('cpause');
    const at = crateG.position.clone().add(new THREE.Vector3(0, BH / 2 * crateG.scale.y, 0));
    emit(KT ? 320 : 180, at, KT ? 'rainbow' : '#ffffff', KT ? 9 : 7, 1.4, 3); emit(60, at, glow, 4, 1.8, 5, 1.6);
    sfx('boom', 0.75, KT ? 0.7 : 0.85); sfx(KT ? 'stinger' : 'rise', KT ? 0.9 : 0.7, KT ? 0.9 : 1); shake = 0.5;
    rays.material.color.set(KT ? '#ff2a4d' : '#ffffff'); halo.material.color.set(glow);
    if (!multi) { wheel.visible = true; needle.visible = true; }
  }
  const lerp = (a, b, k) => a + (b - a) * k, clamp01 = (x) => Math.max(0, Math.min(1, x));
  function wheelAngle(st) { // the authored spin: fast start, long ease, an edge crawl or a spill-and-roll-back at the end
    const { from, peak, to, dur, pw } = plan;
    if (st < dur) return lerp(from, peak, 1 - Math.pow(1 - st / dur, pw));
    const k = st - dur; if (plan.mode === 'plain') return to;
    const back = plan.mode === 'over' ? 0.75 : 0.5; if (k >= back) return to;
    const u = k / back; return lerp(peak, to, plan.mode === 'over' ? (1 - Math.cos(u * Math.PI)) / 2 : u * u * (3 - 2 * u));
  }
  const spinEnd = () => plan.dur + (plan.mode === 'plain' ? 0 : plan.mode === 'over' ? 0.75 : 0.5);
  // under ?qa=1 the show only advances through api.advance() (software GL is far too slow for real time)
  const QAMODE = new URLSearchParams(location.search).has('qa');
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!QAMODE) update(dt);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    t += dt;
    if (t > 0.8 && !skipOK) { skipOK = true; el.classList.add('canskip'); }
    const cs = crateScale;
    if (phase === 'fly' || phase === 'build') {
      // fly to centre on an arc, spinning into a 3/4 view
      const u = clamp01(t / FLY), e = easeOutBack(u);
      crateG.position.set(lerp(start.x, 0, e), lerp(start.y, -0.2, e) + Math.sin(u * Math.PI) * 0.8, lerp(start.z, 0, e));
      crateG.scale.setScalar(lerp(startS, cs, Math.min(1, e)));
      crateG.rotation.set(lerp(0.5, 0.32, e), lerp(-2.4, -0.42, e), 0);
      if (u >= 1 && phase === 'fly') { phase = 'build'; sfx('hum', 0.5, KT ? 0.8 : 1); }
      if (phase === 'build') {
        while (stepDone < steps.length && t >= tStep(stepDone)) { const r = TIERS[steps[stepDone]]; setGlow(KT ? glowCol(r) : '#ffffff'); sfx('chime', 0.55 + stepDone * 0.1, 0.8 + stepDone * 0.17); if (stepDone >= 3) { el.classList.add('edge'); sfx('boom', 0.35, 1.6); } if (r === 'mythic') el.classList.add('mythic'); stepDone++; }
        const k = clamp01((t - FLY) / (tBurst - FLY)), hold = KT && t > tStep(steps.length - 1) + 0.15;
        const a = hold ? 0.004 : k * k * (KT ? 0.11 : 0.075);
        crateG.rotation.z = Math.sin(t * 41) * a * 1.2; crateG.rotation.y += Math.sin(t * 29) * a; crateG.position.x += Math.sin(t * 37) * a * 1.5; crateG.position.y += Math.abs(Math.sin(t * 23)) * a * 2;
        lidPivot.rotation.x = -Math.abs(Math.sin(t * 31)) * k * k * 0.12; // the lid rattles open a crack
        seamM.opacity = 0.15 + k * 0.85; leaks.forEach((s, i) => { s.material.opacity = k * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.7)); s.scale.set(1.3 + k * 1.6, 0.3 + k * 0.5, 1); });
        inner.intensity = k * 6; rim.intensity = k * 14; frontM.emissiveIntensity = k * 0.12; halo.material.opacity = k * 0.35; halo.material.color.set(glow);
        if (Math.random() < k * 0.9) emit(1, crateG.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * BW * cs, BH / 2 * cs, BD / 2 * cs)), glow, 1.5, 0.8, 1.5, 0.2);
        el.classList.toggle('cpause', hold);
        if (t >= tBurst) pop();
      }
    } else {
      const k = t - burstAt;
      // lid flies, crate sinks away under the light column
      lidPivot.rotation.x = -Math.min(2.6, k * 9); lid.position.y = LH / 2 + k * k * 6; lid.rotation.z = k * 2;
      beam.material.opacity = k < 0.25 ? k * 4 : Math.max(0, 1 - (k - 0.25) * 1.4); beam.scale.set(1, Math.min(1, k * 5), 1);
      inner.intensity = Math.max(0, 10 - k * 12); seamM.opacity = Math.max(0, 1 - k * 2); leaks.forEach((s) => s.material.opacity = Math.max(0, 1 - k * 3));
      crateG.position.y = -0.2 - Math.max(0, k - 0.15) * Math.max(0, k - 0.15) * 14; crateG.visible = k < 0.9;
      if (phase !== 'reveal') { rays.material.opacity = Math.max(0, 0.6 - k * 0.5) * (KT ? 1.2 : 1); rays.rotation.z += dt * 0.3; halo.material.opacity = Math.max(0.12, 0.6 - k * 0.6); }
      if (phase === 'spin') {
        const intro = clamp01(k / 0.45); wheel.scale.setScalar(lerp(0.3, 1, 1 - Math.pow(1 - intro, 3))); wheel.position.y = lerp(-1.6, 0.25, 1 - Math.pow(1 - intro, 3));
        spinT += dt; const ang = wheelAngle(spinT), prev = wheel.userData.ang ?? ang, vel = Math.abs(ang - prev) / Math.max(dt, 1e-3); wheel.userData.ang = ang;
        wheel.rotation.y = -ang;
        const idx = Math.round(ang / STEP); if (lastIdx !== null && idx !== lastIdx) { sfx('tick', 0.35 + Math.min(0.4, vel * 0.08), 0.85 + Math.min(0.5, vel * 0.06)); kick = Math.sign(ang - prev) * 0.35; } lastIdx = idx;
        kick *= Math.exp(-dt * 14); needle.rotation.z = kick;
        const blurK = clamp01((vel - 1.2) / 2.5);
        for (const c of cards) { const rel = c.a - ang, front = Math.cos(rel); c.g.visible = front > 0.35; const near = Math.max(0, 1 - Math.abs(rel) / STEP); c.sharp.material.opacity = (1 - blurK * 0.9) * (0.35 + 0.65 * front); c.blur.material.opacity = blurK * 0.9 * front; c.g.scale.setScalar(1 + near * 0.06 * (1 - blurK)); }
        if (spinT >= spinEnd() + 0.35) reveal();
      } else if (phase === 'deal') {
        mcards.forEach((c, i) => { const d = clamp01((k - 0.1 - i * 0.09) / 0.55), sp = rowSpot(i, mcards.length), e = easeOutBack(d); c.g.visible = d > 0; c.g.position.set(lerp(0, sp.x, e), lerp(-0.6, sp.y, e) + Math.sin(d * Math.PI) * 1.2, lerp(0, 0.4, e)); c.g.scale.setScalar(sp.s * lerp(0.2, 1, Math.min(1, e))); c.g.rotation.set(0, Math.PI + (1 - d) * 3, (1 - d) * 0.6 * (i - 2)); if (d > 0 && !c.dealt) { c.dealt = 1; sfx('pop', 0.4, 1.4 + i * 0.05); } });
        if (k > 1.1) { flipClock += dt; const gap = 0.55;
          while (flipped < mcards.length && flipClock > 0.25 + flipped * gap + (flipped === mcards.length - 1 ? 0.6 : 0)) flipCard(flipped++);
          if (flipped >= mcards.length && flipClock > 0.25 + mcards.length * gap + 1.0) reveal(); }
        const lastC = mcards[mcards.length - 1]; if (flipped === mcards.length - 1 && k > 1.1) lastC.g.position.x += Math.sin(t * 50) * 0.015; // the last one trembles
      }
      if (phase === 'reveal') stepReveal(dt);
    }
    for (const c of mcards) if (c.flipT !== null) { const u = clamp01((t - c.flipT) / 0.45); c.g.rotation.y = Math.PI * (1 - (1 - Math.pow(1 - u, 3))); }
    if (shake > 0) { shake = Math.max(0, shake - dt * 1.4); cam.position.x = (Math.random() - 0.5) * shake * 0.3; cam.position.y = 0.35 + (Math.random() - 0.5) * shake * 0.3; } else { cam.position.x = 0; cam.position.y = 0.35; }
    if (phase === 'reveal' && top >= 3 && Math.random() < 0.35) emit(1, new THREE.Vector3((Math.random() - 0.5) * halfW * 2, -halfH, 0), KT ? 'rainbow' : glowCol(best.r), 2, 2.4, 3, 0);
    stepParticles(dt); stepConfetti(dt);
  }
  function flipCard(i) {
    const c = mcards[i]; c.flipT = t; const p = c.p, r = rank(p.r);
    sfx('chime', 0.5 + r * 0.12, 0.8 + r * 0.2); sfx('whoosh', 0.4, 1.6);
    if (r >= 2) { emit(40 + r * 30, c.g.position.clone(), p.r === 'mythic' ? 'rainbow' : glowCol(p.r), 5, 1.2, 2); if (r >= 3) { sfx('stinger', 0.7, 1.1); shake = 0.3; } }
  }
  // reveal pose: the winner flies forward and flips, then parks where it doesn't cover the courier
  const isPortrait = () => innerWidth < innerHeight * 0.9;
  const parkAt = () => (isPortrait() ? toWorld(innerWidth / 2, innerHeight * 0.2, 1) : toWorld(innerWidth * 0.2, innerHeight * 0.42, 1));
  let hero = null;
  function reveal(wasSkip = false) {
    if (phase === 'reveal') return;
    phase = 'reveal'; revealT = 0; el.classList.add('revealed'); el.classList.remove('cpause');
    setGlow(glowCol(best.r)); if (top >= 3) el.classList.add('edge'); if (KT) el.classList.add('mythic');
    rays.material.color.set(KT ? '#ff2a4d' : glowCol(best.r)); halo.material.color.set(glowCol(best.r));
    if (!multi) {
      if (wasSkip) { spinT = spinEnd(); wheel.rotation.y = -plan.to; wheel.scale.setScalar(1); wheel.position.y = 0.25; }
      const w = cards[W]; hero = makeCard(best.item, scene); hero.blur.visible = false;
      const wp = new THREE.Vector3(); w.g.getWorldPosition(wp); hero.g.position.copy(wp); hero.from = wp.clone();
      w.g.visible = false; needle.visible = false;
    } else {
      mcards.forEach((c, i) => { if (c.flipT === null) c.flipT = t - (wasSkip ? 1 : 0); const sp = rowSpot(i, mcards.length); c.g.visible = true; c.g.position.set(sp.x, sp.y, 0.4); c.g.scale.setScalar(sp.s); c.g.rotation.set(0, 0, 0); });
    }
    const col = KT ? 'rainbow' : glowCol(best.r);
    emit(50 + top * 60, new THREE.Vector3(0, 0.3, 0.5), col, 5 + top * 1.5, 1.4, 2.5);
    if (top >= 2) confetti(40 + top * 40, KT ? RAINBOW : [glowCol(best.r), '#ffffff', glowCol(best.r)]);
    sfx(top >= 3 ? 'stinger' : 'chime', top >= 3 ? 0.9 : 0.6, 0.8 + top * 0.17); if (top >= 2) sfx('jingle', 0.5, 1.1); shake = 0.2 + top * 0.12;
    showCard(selI);
  }
  function stepReveal(dt) {
    revealT += dt;
    rays.rotation.z += dt * (0.2 + top * 0.1); const ro = [0.18, 0.3, 0.5, 0.75, 0.9][top];
    rays.material.opacity = lerp(rays.material.opacity, ro, Math.min(1, dt * 4)); halo.material.opacity = lerp(halo.material.opacity, 0.35 + top * 0.12, Math.min(1, dt * 4));
    if (hero) {
      const u = clamp01(revealT / 0.7), e = 1 - Math.pow(1 - u, 3), park = parkAt(), v = clamp01((revealT - 1.0) / 0.6), pe = v * v * (3 - 2 * v);
      const mid = new THREE.Vector3(0, 0.4, 3.2);
      hero.g.position.copy(hero.from).lerp(mid, e).lerp(park, pe);
      hero.g.rotation.y = Math.PI * 2 * e + Math.sin(revealT * 1.6) * 0.18 * pe; hero.g.scale.setScalar(lerp(1, 1.25, e) * lerp(1, isPortrait() ? 0.85 : 1.05, pe));
      rays.position.set(hero.g.position.x, hero.g.position.y, -3); halo.position.set(hero.g.position.x, hero.g.position.y, -2.5);
      wheel.position.y = lerp(0.25, -halfH * 1.4, clamp01(revealT / 0.8)); for (const c of cards) { c.sharp.material.opacity *= 1 - Math.min(1, dt * 3); c.blur.material.opacity = 0; }
    } else {
      // ×5: the row slides to the bottom; the selected card rises and glows
      mcards.forEach((c, i) => { const sp = rowSpot(i, mcards.length, isPortrait() ? -halfH * 0.62 : -halfH * 0.55), sel = i === selI; c.g.position.x = lerp(c.g.position.x, sp.x, Math.min(1, dt * 6)); c.g.position.y = lerp(c.g.position.y, sp.y + (sel ? 0.35 : 0), Math.min(1, dt * 6)); c.g.scale.setScalar(lerp(c.g.scale.x, sp.s * (sel ? 1.08 : 0.92), Math.min(1, dt * 6))); });
      const s = mcards[selI]; rays.position.set(s.g.position.x, s.g.position.y, -3); halo.position.set(s.g.position.x, s.g.position.y, -2.5); rays.scale.setScalar(9);
    }
  }
  function showCard(i) {
    selI = i; const p = pulls[i], it = p.item;
    ctx.preview(it.id);
    if (multi) { halo.material.color.set(glowCol(p.r)); rays.material.color.set(p.r === 'mythic' ? '#ff2a4d' : glowCol(p.r)); }
    const eq = ctx.equipped[it.cat] === it.id, rv = el.querySelector('.creveal');
    rv.style.setProperty('--rc', glowCol(p.r)); rv.className = `creveal on r-${p.r}`;
    rv.innerHTML = `<div class="rban">${RARITY[p.r].name}</div><b>${it.name}</b><small>${CATS.find((c) => c[0] === it.cat)[1]} · ${it.desc}</small>
      ${p.dupe ? `<div class="rdupe">DUPLICATE · +${p.refund} 🪙 refunded</div>` : '<div class="rnew">NEW! added to your collection</div>'}
      <div class="rbtns"><button class="btn${eq ? ' done' : ''}" id="req">${eq ? 'EQUIPPED ✓' : 'EQUIP'}</button><button class="btn ghost" id="ragain">AGAIN ${coin(crate.price)}</button><button class="btn ghost" id="rdone">DONE${TOUCH ? '' : ' <small>Esc</small>'}</button></div>`;
    rv.querySelector('#req').onclick = () => { ctx.onEquip(it); showCard(i); sfx('ding', 0.6, 1.5); };
    rv.querySelector('#rdone').onclick = () => done(false);
    rv.querySelector('#ragain').onclick = () => done(true);
  }
  // clicks: skip while it plays; pick a card of the ×5 row after
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  el.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.creveal')) return;
    if (phase !== 'reveal') { if (skipOK) skip(); return; }
    if (!multi) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(mcards.map((c) => c.g), true)[0]; if (!hit) return;
    const i = mcards.findIndex((c) => c.g === hit.object.parent); if (i >= 0 && i !== selI) { showCard(i); sfx('pop', 0.5, 1.3); }
  });
  function skip() { if (phase === 'reveal') return; if (phase === 'fly' || phase === 'build') pop(); reveal(true); }
  function done(again) {
    cancelAnimationFrame(raf); removeEventListener('resize', fit);
    for (const d of disposables) d?.dispose?.(); for (const c of [...cards, ...mcards, hero].filter(Boolean)) { c.sharp.material.map?.dispose(); c.blur.material.map?.dispose(); c.sharp.material.dispose(); c.blur.material.dispose(); }
    renderer.dispose(); renderer.forceContextLoss?.(); el.remove();
    ctx.onDone(again && ctx.store.get('wallet', 0) >= crate.price);
  }
  raf = requestAnimationFrame(frame);
  return {
    key(k) {
      if (phase !== 'reveal') { if ((k === ' ' || k === 'enter' || k === 'escape') && skipOK) skip(); return; }
      if (k === 'escape') done(false);
      else if (k === 'enter' || k === ' ') el.querySelector('#req')?.click();
      else if (k === 'r') done(true);
      else if (multi && (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd')) showCard((selI + (k === 'arrowleft' || k === 'a' ? pulls.length - 1 : 1)) % pulls.length);
    },
    skip, state: () => phase, advance(sec) { for (let i = 0; i < Math.round(sec * 30); i++) update(1 / 30); renderer.render(scene, cam); }, plan: () => plan && { ...plan, W, STEP, offset: plan.to / STEP - W },
  };
}
