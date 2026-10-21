// Building facades. Every style is a pair of textures drawn at load time on top of a CC0 photo material
// (Poly Haven): an upper-floor tile (2 window bays × 2 floors) and a ground-floor tile (2 bays × the shopfront
// storey). Walls are UV-mapped in whole bays and whole floors, so windows land square on every wall and never
// get sliced at corners. One merged mesh, one draw call per material.
import { THREE, mulberry, loadImage, tex } from './core.js';

export const GF = 4.5; // ground-floor (shopfront) storey height, metres
const T = 512;          // texture size per tile
// bw: bay width (m), fh: floor height (m), photo: metres covered by one copy of the wall photo
export const STYLES = {
  brickOld: { wall: 'wall/brick_wall_02.jpg', photo: 1.7, bw: 3.2, fh: 3.6, frame: '#2f3b2f', sill: '#cfc6b4', lintel: true, shop: 'awning' },
  brickRed: { wall: 'wall/large_red_bricks.jpg', photo: 1.9, bw: 3.0, fh: 3.5, frame: '#f2efe8', sill: '#d8d2c6', lintel: true, shop: 'sign' },
  stucco: { wall: 'wall/white_stucco.jpg', photo: 2.4, bw: 3.2, fh: 3.4, frame: '#3a332c', sill: '#efe9df', shutters: true, shop: 'arcade' },
  office: { wall: 'wall/concrete_slab_wall.jpg', photo: 3.0, bw: 3.0, fh: 3.8, ribbon: true, frame: '#2a2f35', shop: 'lobby' },
  tower: { wall: null, bw: 1.6, fh: 3.9, curtain: true, frame: '#4a5560', shop: 'lobby' },
  parking: { wall: 'wall/concrete_wall_007.jpg', photo: 3.2, bw: 6.0, fh: 3.1, garage: true, shop: 'garage' },
};
export const STYLE_KEYS = Object.keys(STYLES);
export const GROUND_VARIANTS = 3; // different shops per style so a block isn't one sign repeated
// material index layout: per style [upper, ground0, ground1, ground2], then the roof
export const matIndex = (si, part, variant = 0) => si * (1 + GROUND_VARIANTS) + (part === 'upper' ? 0 : 1 + variant);

const SHOPS = ['CAFÉ', 'DELI', 'PIZZA', 'BAR', 'SALON', 'TATTOO', 'TACOS', 'BOOKS', 'VAPE', 'SUSHI', 'GYM', 'BANK', 'CUBAN', 'BBQ', 'DONUTS', 'THAI'];
const AWN = [['#1f6b4f', '#f3efe2'], ['#a3262a', '#f3efe2'], ['#1e3f78', '#f3efe2'], ['#2b2b2b', '#e9c46a'], ['#7a3d6b', '#f3efe2']];

// --- drawing helpers (canvas y grows downward; texture v=1 is the top of the canvas)
function wallUnder(ctx, img, s, w, h, mPerX, mPerY) {
  if (!img) return;
  const sx = (1 / mPerX) * s.photo / img.width, sy = (1 / mPerY) * s.photo / img.height; // px per photo px
  const pat = ctx.createPattern(img, 'repeat'); pat.setTransform(new DOMMatrix().scale(sx, sy));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
}
function glass(ctx, x, y, w, h, r, tint = 0) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  const sky = tint ? ['#a8c7cf', '#4f7480', '#2b3f47'] : ['#b9cbd6', '#6d8494', '#2e3a44'];
  g.addColorStop(0, sky[0]); g.addColorStop(0.45, sky[1]); g.addColorStop(1, sky[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const kind = r();
  if (kind < 0.22) { ctx.fillStyle = 'rgba(232,224,204,.85)'; ctx.fillRect(x, y, w, h * (0.35 + r() * 0.5)); ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = y + 3; yy < y + h; yy += 5) ctx.fillRect(x, yy, w, 1); } // blinds
  else if (kind < 0.34) { ctx.fillStyle = 'rgba(176,110,70,.55)'; ctx.fillRect(x, y, w * 0.3, h); ctx.fillRect(x + w * 0.7, y, w * 0.3, h); }                  // curtains
  else if (kind < 0.5) { ctx.fillStyle = 'rgba(20,24,28,.45)'; ctx.fillRect(x, y, w, h); }                                                                       // dark room
  // a soft diagonal reflection streak
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w * 0.42, y); ctx.lineTo(x + w * 0.05, y + h); ctx.lineTo(x - w * 0.22, y + h); ctx.fill();
  ctx.restore();
}
function windowUnit(ctx, s, x, y, w, h, r) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 7);                 // reveal shadow
  if (s.lintel) { ctx.fillStyle = s.sill; ctx.fillRect(x - 8, y - 16, w + 16, 12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 8, y - 4, w + 16, 3); }
  ctx.fillStyle = s.frame; ctx.fillRect(x, y, w, h);
  const f = Math.max(5, w * 0.06);
  glass(ctx, x + f, y + f, w - 2 * f, h - 2 * f, r);
  ctx.fillStyle = s.frame; ctx.fillRect(x + w / 2 - f / 2, y + f, f, h - 2 * f); ctx.fillRect(x + f, y + h * 0.48, w - 2 * f, f * 0.8); // mullion + transom
  if (s.sill) { ctx.fillStyle = s.sill; ctx.fillRect(x - 6, y + h, w + 12, 9); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 6, y + h + 9, w + 12, 4); }
  if (s.shutters) { ctx.fillStyle = r() < 0.5 ? '#3d6b5a' : '#5b6f8a'; for (const sx of [x - w * 0.32 - 4, x + w + 4]) { ctx.fillRect(sx, y, w * 0.32, h); ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = y + 4; yy < y + h; yy += 7) ctx.fillRect(sx, yy, w * 0.32, 2); ctx.fillStyle = r() < 0.5 ? '#3d6b5a' : '#5b6f8a'; } }
}
function upperTile(s, img, seed) {
  const c = document.createElement('canvas'); c.width = c.height = T; const ctx = c.getContext('2d'), r = mulberry(seed);
  const bay = T / 2, fl = T / 2, mx = s.bw / bay, my = s.fh / fl;
  ctx.fillStyle = '#b8b2a8'; ctx.fillRect(0, 0, T, T); wallUnder(ctx, img, s, T, T, mx, my);
  for (let fy = 0; fy < 2; fy++) {
    const y0 = fy * fl;
    if (s.curtain) { // glass curtain wall: panels with mullions, a spandrel at each slab
      for (let bx = 0; bx < 2; bx++) glass(ctx, bx * bay, y0, bay, fl, () => 0.9, 1);
      ctx.fillStyle = '#33414c'; ctx.fillRect(0, y0 + fl - 30, T, 30); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, y0 + fl - 30, T, 4);
      ctx.fillStyle = s.frame; for (let bx = 0; bx <= 2; bx++) ctx.fillRect(bx * bay - 4, y0, 8, fl); ctx.fillRect(0, y0 + fl * 0.5, T, 5);
      continue;
    }
    if (s.ribbon) { // 70s office: a continuous band of glass on every floor
      const gy = y0 + fl * 0.3, gh = fl * 0.5;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, gy - 4, T, gh + 8);
      glass(ctx, 0, gy, T, gh, r, 1);
      ctx.fillStyle = s.frame; for (let k = 0; k <= 8; k++) ctx.fillRect(k * T / 8 - 3, gy, 6, gh);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, gy + gh, T, 4);
      continue;
    }
    if (s.garage) { // open parking deck: dark slot between slabs, columns at the bays, parked cars inside
      const gy = y0 + fl * 0.32, gh = fl * 0.52;
      ctx.fillStyle = '#16181b'; ctx.fillRect(0, gy, T, gh);
      ctx.fillStyle = 'rgba(255,240,200,.5)'; for (let k = 0; k < 6; k++) ctx.fillRect(20 + k * 85, gy + 6, 26, 4);
      const CAR = ['#b8152a', '#e8e8e4', '#20242a', '#2a4f8a', '#8a8f96'];
      for (let k = 0; k < 3; k++) if (r() < 0.75) { const cx = 30 + k * 160 + r() * 30, cw = 110; ctx.fillStyle = CAR[Math.floor(r() * CAR.length)]; ctx.beginPath(); ctx.roundRect(cx, gy + gh - 46, cw, 30, 8); ctx.fill(); ctx.beginPath(); ctx.roundRect(cx + 20, gy + gh - 64, cw - 46, 22, 8); ctx.fill(); ctx.fillStyle = '#0c0d0f'; ctx.beginPath(); ctx.arc(cx + 22, gy + gh - 14, 10, 0, 7); ctx.arc(cx + cw - 22, gy + gh - 14, 10, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, gy + gh, T, 6);
      for (let bx = 0; bx <= 2; bx++) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx * bay - 14, gy, 28, gh); }
      continue;
    }
    for (let bx = 0; bx < 2; bx++) { const w = bay * 0.46, h = fl * 0.54; windowUnit(ctx, s, bx * bay + (bay - w) / 2, y0 + fl * 0.24, w, h, r); }
  }
  return c;
}
function groundTile(s, img, seed) {
  const c = document.createElement('canvas'); c.width = c.height = T; const ctx = c.getContext('2d'), r = mulberry(seed);
  const bay = T / 2, mx = s.bw / bay, my = GF / T;
  ctx.fillStyle = '#b8b2a8'; ctx.fillRect(0, 0, T, T); wallUnder(ctx, img, s, T, T, mx, my);
  const px = (m) => m / my; // metres → px vertically
  if (s.shop === 'garage') {
    ctx.fillStyle = '#121416'; ctx.fillRect(20, T - px(3.4), T - 40, px(3.4));
    ctx.fillStyle = '#e9c46a'; for (let k = 0; k < 7; k++) ctx.fillRect(20 + k * 70, T - px(3.4) - 12, 35, 12);
    ctx.fillStyle = '#1e4fa8'; ctx.beginPath(); ctx.roundRect(T - 150, 20, 110, 110, 14); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 90px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P', T - 95, 108);
    return c;
  }
  if (s.shop === 'lobby') { // full-height lobby glazing with a door
    const top = px(0.6);
    ctx.fillStyle = s.frame; ctx.fillRect(0, top, T, T - top);
    for (let bx = 0; bx < 4; bx++) glass(ctx, bx * T / 4 + 6, top + 6, T / 4 - 12, T - top - 12, () => 0.6, 1);
    ctx.fillStyle = '#14181c'; ctx.fillRect(T / 4 + 20, T - px(2.6), T / 4 - 40, px(2.6)); glass(ctx, T / 4 + 28, T - px(2.6) + 8, T / 4 - 56, px(2.6) - 8, () => 0.6, 1);
    ctx.fillStyle = '#c9ccd0'; ctx.fillRect(T / 4 + 40, T - px(1.2), T / 4 - 80, 6);
    return c;
  }
  // shopfronts: sign band, big windows, a door, a dark bulkhead; maybe an awning
  const name = SHOPS[Math.floor(r() * SHOPS.length)], [aw1, aw2] = AWN[Math.floor(r() * AWN.length)];
  const signH = px(0.9), baseH = px(0.45), doorBay = r() < 0.5 ? 0 : 1;
  ctx.fillStyle = s.shop === 'arcade' ? '#efe7da' : '#1d2125'; ctx.fillRect(0, px(0.25), T, signH);
  ctx.fillStyle = s.shop === 'arcade' ? '#5a4632' : '#f2e6c8'; ctx.font = `900 ${Math.round(signH * 0.62)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, T / 2, px(0.25) + signH / 2 + 2);
  const gTop = px(0.25) + signH + 10;
  for (let bx = 0; bx < 2; bx++) {
    const x0 = bx * bay + 10, w = bay - 20;
    ctx.fillStyle = '#23272b'; ctx.fillRect(x0, gTop, w, T - gTop);
    if (bx === doorBay) {
      const dw = w * 0.36, dx = x0 + (w - dw) / 2; glass(ctx, x0 + 8, gTop + 8, dx - x0 - 14, T - gTop - baseH - 12, r); glass(ctx, dx + dw + 6, gTop + 8, x0 + w - dx - dw - 14, T - gTop - baseH - 12, r);
      ctx.fillStyle = '#121518'; ctx.fillRect(dx, gTop + 8, dw, T - gTop - 8); glass(ctx, dx + 7, gTop + 16, dw - 14, T - gTop - px(0.5), () => 0.6);
      ctx.fillStyle = '#d8dadc'; ctx.fillRect(dx + dw - 16, T - px(1.3), 6, px(0.5));
    } else { glass(ctx, x0 + 8, gTop + 8, w - 16, T - gTop - baseH - 12, r); ctx.fillStyle = '#23272b'; ctx.fillRect(x0 + w / 2 - 3, gTop, 6, T - gTop - baseH); }
    ctx.fillStyle = '#2b2622'; ctx.fillRect(x0, T - baseH, w, baseH);
  }
  if (s.shop === 'awning') { // striped canvas awning with a scalloped edge and its shadow
    const ay = gTop - 4, ah = px(0.75);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, ay + ah, T, px(0.5));
    for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? aw2 : aw1; ctx.fillRect(k * T / 16, ay, T / 16 + 1, ah); }
    for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? aw2 : aw1; ctx.beginPath(); ctx.arc(k * T / 16 + T / 32, ay + ah, T / 32, 0, Math.PI); ctx.fill(); }
  }
  return c;
}
function canvasToTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; }

let kitP = null;
export function facadeKit() {
  return (kitP ||= (async () => {
    const mats = [];
    for (const [i, k] of STYLE_KEYS.entries()) {
      const s = STYLES[k], img = s.wall ? await loadImage('tex/' + s.wall) : null;
      mats.push(new THREE.MeshLambertMaterial({ map: canvasToTex(upperTile(s, img, 11 + i * 7)), vertexColors: true }));
      for (let v = 0; v < GROUND_VARIANTS; v++) mats.push(new THREE.MeshLambertMaterial({ map: canvasToTex(groundTile(s, img, 29 + i * 5 + v * 101)), vertexColors: true }));
    }
    const roof = tex('tex/roof.jpg'); mats.push(new THREE.MeshLambertMaterial({ map: roof, color: 0xb9b6b0, vertexColors: true }));
    return mats;
  })());
}
