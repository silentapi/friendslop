// Two scripted set pieces on the ride, planned into every level:
//  • RIVAL: a DashDash courier on an e-scooter pulls alongside and tries to shoulder-check you off the road. He winds
//    up three real shoves (plus fakes). Shove TOWARD him late in the window to counter (perfect = last third),
//    or press AWAY to sidestep. Twitch on a fake and you flinch. Beat him twice and he eats the curb.
//  • CRANE: a tower crane's load snaps over a construction site. Slow-mo, high camera: every piece's landing spot
//    is marked on the road (the ring closes as it falls). Thread the lanes, then hop the I-beam that lands across all
//    three. Close calls pay; getting clonked costs speed, ice and coins (never a wipeout).
import { THREE, V, clamp, lerp, seg, smooth, easeOut, easeInOut, damp, mulberry, mat, box, cyl, canvasTex, tex, mesh } from './core.js';
import { character, ik2, helmet } from './chars.js';

const LANES = [-2.4, 0, 2.4];
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export const DUEL_SPEED = 0.88;
const tiled = (p, rx, ry) => { const t = tex(p).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };

// ---------------------------------------------------------------- planning (inside buildLevel)
export function planEvents({ r, start, end, vb, d, free, reserve, obs, ground, arc, PHYS }) {
  const events = [];
  // search outward from a preferred spot (both ways) for a free stretch inside [lo, hi]
  const find = (pref, a, b, lo, hi) => { for (let k = 0; k < 40; k++) { const s = pref + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 9; if (s - a >= lo && s + b <= hi && free(s - a, s + b)) return s; } return null; };
  const span = end - start;
  // the rival: early, once you've got the hang of it (you both ease off to ~65% while you're shoulder to shoulder)
  const rlen = vb * DUEL_SPEED * 8.6 + 18;
  const s = find(start + span * (0.16 + r() * 0.06), 14, rlen, start, start + span * 0.45);
  if (s != null) {
    const feints = d > 0.45 ? 2 : 1, beats = ['real'];
    const rest = ['real', 'real', ...Array(feints).fill('feint')].sort(() => r() - 0.5);
    for (const b of rest) beats.push(b);
    if (beats.at(-1) === 'feint') beats.push(beats.splice(beats.lastIndexOf('real'), 1)[0]); // always end on a real one
    events.push({ kind: 'rival', s, len: rlen, beats, seed: r() });
    reserve(s - 14, s + rlen, 'rival', 1); ground(s - 12, 1, 5);
  }
  // the crane: late, the hardest read of the ride
  const sq = 1 - d * 0.18, C = { d1: 20, d2: 30 * sq + 2, d3: 42 * sq, beam: 55 * sq, end: 82 };
  const c = find(start + span * (0.74 + r() * 0.05), 20, C.end, start + span * 0.5, end);
  if (c != null) {
    const e = Math.floor(r() * 3);                                     // the lane the coins lead you in on
    const a = [0, 1, 2].filter((l) => l !== e)[Math.floor(r() * 2)];    // second drop: one of the lanes you dodged to
    const f = e;                                                         // the double drop leaves only the lane you started in: e (drop 1), a (drop 2) and the third lane (drop 3) all get hit
    const blk = [0, 1, 2].filter((l) => l !== f);
    const drops = [
      { piece: 'crate', s: c + C.d1, li: e, len: 1.5, w: 1.9, h: 1.25, land: 3.2 },
      { piece: 'potty', s: c + C.d2, li: a, len: 1.3, w: 1.4, h: 2.3, land: 2.6 },
      { piece: 'beams', s: c + C.d3, li: blk[0], len: 1.4, w: 2.0, h: 1.1, land: 2.2 },
      { piece: 'crate', s: c + C.d3 + 0.8, li: blk[1], len: 1.5, w: 1.9, h: 1.25, land: 3.0 },
      { piece: 'beam', s: c + C.beam, li: 1, len: 0.6, w: 8.6, h: 0.62, land: 7.5 },
    ];
    for (const q of drops) obs.push({ kind: 'debris', drop: true, piece: q.piece, s: q.s, lat: q.piece === 'beam' ? 0 : LANES[q.li], len: q.len, w: q.w, h: q.h, v: 0, land: q.land, wall: q.piece === 'beam' });
    const side = r() < 0.5 ? -1 : 1;
    events.push({ kind: 'crane', s: c, side, hook: c + 14, drops: obs.slice(-drops.length), entry: e, open: f });
    reserve(c - 20, c + C.end, 'crane', f);
    ground(c - 16, e, 6);
    ground(c + C.d3 - 7, f, 3); ground(c + C.d3 + 3, f, 4);
    arc(c + C.beam - 3.6, f, PHYS.JUMP, 0, vb, 8, 0.075);
    ground(c + C.beam + 8, 1, 6);
  }
  return events;
}

// ---------------------------------------------------------------- props
const ORANGE = 0xff5a1f;
function dashBag() {
  const t = canvasTex('dashbag', 512, 512, (x, w, h) => { x.fillStyle = '#ff5a1f'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 112px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('Dash', w / 2, 236); x.fillText('Dash', w / 2, 346); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, h - 40, w, 40); x.font = '800 30px system-ui'; x.fillStyle = '#fff'; x.fillText('» FASTER THAN YOU »', w / 2, 420); });
  const side = mat(0xd9481a, { roughness: 0.6 }), front = mat(0xffffff, { roughness: 0.55, map: t });
  const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.42, 0.44, 0.3), [side, side, side, side, front, side])); return g;
}
function scooter() {
  const g = new THREE.Group(), blk = mat(0x15171a, { roughness: 0.5, metalness: 0.3 }), al = mat(0xb8bec6, { metalness: 0.9, roughness: 0.3 }), or = mat(ORANGE, { roughness: 0.4 });
  box(0.17, 0.05, 0.86, blk, 0, 0.12, 0, g); box(0.14, 0.006, 0.7, mat(0x2a2c30, { roughness: 1 }), 0, 0.148, -0.02, g); // deck + grip tape
  box(0.18, 0.03, 0.12, or, 0, 0.13, -0.47, g);
  for (const z of [-0.4, 0.42]) { const w = cyl(0.11, 0.11, 0.06, blk, 18, 0, 0.11, z, g); w.rotation.z = Math.PI / 2; const h = cyl(0.05, 0.05, 0.065, al, 12, 0, 0.11, z, g); h.rotation.z = Math.PI / 2; }
  const stem = cyl(0.025, 0.03, 0.95, al, 10, 0, 0.6, 0.42, g); stem.rotation.x = -0.12;
  const bar = cyl(0.018, 0.018, 0.52, blk, 8, 0, 1.06, 0.48, g); bar.rotation.z = Math.PI / 2;
  box(0.08, 0.06, 0.04, or, 0, 1.02, 0.5, g); // headlight housing
  const lamp = cyl(0.025, 0.025, 0.01, new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), 12, 0, 1.02, 0.523, g); lamp.rotation.x = Math.PI / 2;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const ibeam = (L, m) => { const g = new THREE.Group(); box(L, 0.04, 0.3, m, 0, 0.02, 0, g); box(L, 0.04, 0.3, m, 0, 0.36, 0, g); box(L, 0.32, 0.035, m, 0, 0.19, 0, g); return g; };
function piece(kind) {
  const g = new THREE.Group();
  const ply = new THREE.MeshLambertMaterial({ map: tiled('tex/plywood.jpg', 1, 1) }), strap = mat(0x2a2c30, { metalness: 0.6, roughness: 0.4 });
  const primer = new THREE.MeshLambertMaterial({ map: tiled('tex/steel.jpg', 2, 0.3), color: 0xb5452e });
  if (kind === 'crate') { box(1.5, 1.05, 1.3, ply, 0, 0.6, 0, g); box(1.6, 0.14, 1.36, mat(0x8a6a44), 0, 0.07, 0, g); for (const x of [-0.45, 0.45]) box(0.05, 1.08, 1.33, strap, x, 0.6, 0, g); }
  if (kind === 'beams') { for (let k = 0; k < 3; k++) { const b = ibeam(1.9, primer); b.position.set(0, k * 0.37, (k - 1) * 0.34); g.add(b); } box(0.06, 1.15, 1.2, strap, 0.6, 0.55, 0, g); box(0.06, 1.15, 1.2, strap, -0.6, 0.55, 0, g); }
  if (kind === 'beam') { const b = ibeam(8.6, primer); b.scale.set(1, 1.6, 1.6); g.add(b); }
  if (kind === 'potty') {
    const blue = mat(0x2b6fd6, { roughness: 0.45 }), lite = mat(0xdde6f0, { roughness: 0.5 });
    box(1.2, 2.1, 1.2, blue, 0, 1.05, 0, g); box(1.28, 0.16, 1.28, lite, 0, 2.18, 0, g);
    const lbl = canvasTex('potty', 256, 384, (x, w, h) => { x.fillStyle = '#2b6fd6'; x.fillRect(0, 0, w, h); x.fillStyle = '#1f58b0'; x.fillRect(16, 16, w - 32, h - 32); x.fillStyle = '#fff'; x.font = '900 44px system-ui'; x.textAlign = 'center'; x.fillText('POTTY', w / 2, 120); x.fillText('PROS', w / 2, 168); x.fillStyle = '#e33'; x.fillRect(150, 230, 70, 26); x.fillStyle = '#fff'; x.font = '800 18px system-ui'; x.fillText('OCCUPIED', 185, 249); for (let k = 0; k < 6; k++) { x.fillStyle = '#163f80'; x.fillRect(40 + k * 30, 40, 18, 6); } });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), new THREE.MeshLambertMaterial({ map: lbl })); door.position.set(0, 1.03, 0.605); g.add(door);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// lattice faces for the tower crane: one transparent canvas, alpha-tested
function latticeMat(rx, ry) {
  const t = canvasTex('lattice', 128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#f2c018'; x.lineWidth = 12; x.strokeRect(6, -10, w - 12, h + 20); x.lineWidth = 7; x.beginPath(); x.moveTo(8, 4); x.lineTo(w - 8, h - 4); x.moveTo(w - 8, 4); x.lineTo(8, h - 4); x.stroke(); x.lineWidth = 8; x.beginPath(); x.moveTo(0, 4); x.lineTo(w, 4); x.stroke(); }).clone();
  t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide });
}
function markerTex() {
  return canvasTex('dropmark', 256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.translate(w / 2, h / 2);
    const g = x.createRadialGradient(0, 0, 10, 0, 0, 120); g.addColorStop(0, 'rgba(255,40,20,.75)'); g.addColorStop(0.7, 'rgba(255,40,20,.35)'); g.addColorStop(1, 'rgba(255,40,20,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 120, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 10; x.beginPath(); x.arc(0, 0, 100, 0, 7); x.stroke();
    for (let k = 0; k < 8; k++) { x.rotate(Math.PI / 4); x.fillStyle = k % 2 ? '#ffd21a' : '#111'; x.fillRect(-12, -96, 24, 30); }
    x.fillStyle = '#fff'; x.font = '900 110px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 0, 6);
  });
}
const ringTex = () => canvasTex('dropring', 256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 12; x.beginPath(); x.arc(w / 2, h / 2, 116, 0, 7); x.stroke(); });

export async function buildEvents(scene, route, lv) {
  const out = [];
  const halfAt = (s) => Math.max(10.4, route.street(clamp(s, 0, route.length)).w) / 2;
  const frameAt = (s, lat = 0, y = 0) => { const g = new THREE.Group(); route.world(s, lat, y, g.position); g.rotation.y = route.at(s).yaw; return g; };
  for (const ev of lv.events || []) {
    if (ev.kind === 'rival') {
      const C = await character('m/tourist_m.glb', { tint: { casualsuit04: 0xff7a3a } });
      await C.load('idle', 'falling', 'reaction');
      C.attach('Head', helmet(0xff5a1f), [0, 0.095, 0], [-0.12, 0, 0], 0.88);
      C.attach('Spine2', dashBag(), [0, 0.02, -0.25], [0, Math.PI, 0], 0.82);
      const root = new THREE.Group(), sc = scooter(); root.add(sc, C.root); root.visible = false; scene.add(root);
      root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      const fx = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); fx.scale.set(0.7, 0.7, 1); fx.renderOrder = 9; fx.visible = false; scene.add(fx);
      out.push({ ev, root, C, sc, bubble: fx });
    } else if (ev.kind === 'crane') {
      const side = ev.side, h0 = halfAt(ev.hook), site = frameAt(ev.hook); scene.add(site);
      // local frame at the hook: +z along the road, lat → local x = -lat (local +x is the rider's left)
      const L = (lat) => -lat;
      const ply = new THREE.MeshLambertMaterial({ map: tiled('tex/plywood.jpg', 10, 1) });
      // hoarding along the curb with printed banners, a gate, signs, a site shed
      const banner = canvasTex('hoard', 1024, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#0e3b5c'); g.addColorStop(1, '#13618f'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 92px system-ui'; x.fillText('ORANGE AVE LOFTS', 40, 120); x.font = '700 46px system-ui'; x.fillStyle = '#9fd8ff'; x.fillText('LUXURY LIVING · COMING 2027', 44, 190); x.fillStyle = '#ffd21a'; x.fillRect(w - 200, 40, 160, 160); x.fillStyle = '#0e3b5c'; x.font = '900 34px system-ui'; x.fillText('HARD HAT', w - 194, 112); x.fillText('AREA', w - 160, 156); });
      const hx = L(side * (h0 + 1.6));
      box(0.12, 2.5, 36, ply, hx, 1.25, -6, site);
      for (const z of [-18, -6, 6]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshLambertMaterial({ map: banner })); b.position.set(hx - Math.sign(hx) * 0.07, 1.3, z); b.rotation.y = hx > 0 ? -Math.PI / 2 : Math.PI / 2; site.add(b); }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 40), new THREE.MeshLambertMaterial({ map: tiled('tex/cement.jpg', 4, 10) })); ground.rotation.x = -Math.PI / 2; ground.position.set(L(side * (h0 + 9.6)), 0.03, -6); site.add(ground);
      const shed = new THREE.MeshLambertMaterial({ map: tiled('tex/corrugated.jpg', 3, 1), color: 0xdfe6ea }); box(5, 2.8, 2.6, shed, L(side * (h0 + 6)), 1.4, -16, site);
      // the tower crane: lattice mast on the site, jib reaching across the street, counter-jib with ballast, cab
      const mx = L(side * (h0 + 6.5)), H = 30, jibL = h0 * 2 + 12;
      const mast = mesh(new THREE.BoxGeometry(2, H, 2), latticeMat(1, H / 2)); mast.position.set(mx, H / 2, 6); site.add(mast);
      const jib = mesh(new THREE.BoxGeometry(jibL, 1.4, 1.4), latticeMat(jibL / 2, 1)); jib.position.set(mx - Math.sign(mx) * jibL / 2, H + 0.7, 6); site.add(jib);
      const cj = mesh(new THREE.BoxGeometry(10, 1.2, 1.4), latticeMat(5, 1)); cj.position.set(mx + Math.sign(mx) * 5, H + 0.6, 6); site.add(cj);
      const conc = new THREE.MeshLambertMaterial({ map: tiled('tex/cement.jpg', 1, 1), color: 0xbdb8ae }); box(2.4, 2.4, 1.8, conc, mx + Math.sign(mx) * 8.6, H - 0.6, 6, site);
      box(2.2, 1.8, 2.0, mat(0xf2c018, { roughness: 0.5 }), mx - Math.sign(mx) * 0.4, H - 1.0, 6, site); box(0.05, 1.0, 1.6, mat(0x2a3a44, { roughness: 0.1, metalness: 0.4 }), mx - Math.sign(mx) * 1.52, H - 0.9, 6, site);
      const apex = cyl(0.2, 0.5, 6, mat(0xf2c018), 4, mx, H + 3.6, 6, site); void apex;
      // trolley + cable + hook over the road, the load hanging off it: the thing that's about to come down
      const trolley = box(1.6, 0.5, 1.6, mat(0x3a3a3a, { metalness: 0.5 }), 0, H - 0.2, 6, site);
      const cable = cyl(0.03, 0.03, 1, mat(0x111111), 6, 0, 0, 6, site);
      const hook = new THREE.Group(); site.add(hook);
      box(0.5, 0.7, 0.3, mat(0xf2c018), 0, 0, 0, hook); box(0.08, 0.5, 0.08, mat(0x222222, { metalness: 0.8 }), 0, -0.55, 0, hook);
      const load = new THREE.Group(); hook.add(load); load.position.y = -1.0;
      const pieces = ev.drops.map((o) => { const m = piece(o.piece); scene.add(m); m.visible = false; return { o, m }; });
      // the bundled load: small copies of the real pieces strapped together under the hook
      for (const [k, p] of pieces.entries()) { if (p.o.piece === 'beam') continue; const m = piece(p.o.piece); m.scale.setScalar(0.62); m.position.set((k % 2 ? 0.55 : -0.55), -1.6 - Math.floor(k / 2) * 0.9, (k - 1.5) * 0.3); load.add(m); }
      const bm = piece('beam'); bm.scale.set(0.42, 1, 1); bm.position.y = -0.55; load.add(bm);
      for (const sx of [-1, 1]) { const sl = cyl(0.02, 0.02, 1.4, mat(0x222222), 4, sx * 0.5, -0.3, 0, load); sl.rotation.z = sx * 0.6; }
      // landing markers on the road (decal + closing ring)
      const mk = markerTex(), rk = ringTex();
      for (const p of pieces) {
        const w = p.o.piece === 'beam' ? 1 : 1;
        const d = new THREE.Mesh(p.o.piece === 'beam' ? new THREE.PlaneGeometry(8.2, 1.4) : new THREE.CircleGeometry(1.15, 32), new THREE.MeshBasicMaterial({ map: p.o.piece === 'beam' ? null : mk, color: p.o.piece === 'beam' ? 0xff2a14 : 0xffffff, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 }));
        d.rotation.x = -Math.PI / 2; route.world(p.o.s, p.o.lat, 0.1, d.position); d.rotation.z = route.at(p.o.s).yaw; d.renderOrder = 4; scene.add(d); void w;
        const ring = new THREE.Mesh(p.o.piece === 'beam' ? new THREE.PlaneGeometry(8.6, 0.2) : new THREE.RingGeometry(1.0, 1.12, 40), new THREE.MeshBasicMaterial({ map: p.o.piece === 'beam' ? null : null, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.copy(d.position).setY(0.12); ring.rotation.z = d.rotation.z; ring.renderOrder = 5; scene.add(ring); void rk;
        p.mark = d; p.ring = ring;
      }
      out.push({ ev, site, hook, load, cable, trolley, pieces, H, hookLat: 0 });
    }
  }
  return out;
}

// ---------------------------------------------------------------- runtime
export function createEvents(ctx) {
  const { G, UI, Audio, FX, baseFov, halfAt } = ctx;
  const E = { locked: false, slow: null, shot: null, w: 0, speedK: 1 };
  let props = [];
  E.bind = (p) => { props = p || []; E.reset(); };
  E.reset = (atS = 0) => {
    E.locked = false; E.slow = null; E.shot = null; E.cur = null; UI.remove('evui');
    for (const p of props) {
      const ev = p.ev;
      if (atS > 0 && ev.s < atS - 10) { ev.st = 'done'; continue; } // a continue past it: it's over
      ev.st = 'idle'; ev.t = 0;
      if (p.root) { p.root.visible = false; p.bubble.visible = false; }
      if (p.pieces) {
        p.load.visible = true; p.hook.visible = true;
        for (const q of p.pieces) { q.m.visible = false; q.o.landed = false; q.o.fall = null; q.o.dead = false; q.mark.material.opacity = 0; q.ring.material.opacity = 0; }
      }
    }
  };
  const P = (ev) => props.find((p) => p.ev === ev);
  const sayBubble = (p, emoji) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = emoji === '❗' ? '#ff3b1f' : '#1b1e24'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.font = '70px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(emoji, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; p.bubble.material.map?.dispose(); p.bubble.material.map = t; p.bubble.material.needsUpdate = true; p.bubble.visible = true; };
  const clearTraffic = (a, b) => { for (const o of G.lv.obs) if ((o.v > 0 || o.merge) && o.kind === 'car' && o.s > a && o.s < b) o.dead = true; };
  const loseCoins = (n, at) => { n = Math.min(G.coins, n); if (!n) return 0; G.coins -= n; FX.burst(at, { color: 0xffcf3a, n: 10 + n * 2, speed: 5, up: 4, life: 0.9, size: 0.3, grav: 12 }); return n; };

  // ================================================================ RIVAL
  function rivalStart(ev) {
    const p = P(ev), r = mulberry(Math.floor(ev.seed * 1e6) + G.order * 31);
    ev.side = G.lane === 0 ? 1 : G.lane === 2 ? -1 : (r() < 0.5 ? -1 : 1);
    ev.rl = G.lane + ev.side; ev.ds = -15; ev.st = 'approach'; ev.t = 0; ev.bi = -1; ev.res = []; ev.flinch = 0; ev.push = 0; ev.roll = 0; ev.off = 0; ev.arm = 0;
    ev.flinchCd = 0; ev.hitStop = 0; ev.base = G.lat + ev.side * 3.8; ev.said = false; ev.boom = false; ev.fk = false;
    ev.toward = ev.side > 0 ? 'arrowright' : 'arrowleft'; ev.away = ev.side > 0 ? 'arrowleft' : 'arrowright';
    ev.first = !G.tut?.rival;
    E.locked = true; E.cur = ev; p.root.visible = true;
    clearTraffic(G.s - 6, ev.s + ev.len + 30); // nothing drives into a duel you can't steer out of
    const reals = ev.beats.filter((b) => b === 'real').length;
    E.ui = UI.evUI({ title: '🛴 RIVAL COURIER', pips: reals, hint: TOUCH ? `he throws COMBOS: <b>SHOVE</b> → swipe <b>${ev.side > 0 ? '→' : '←'}</b> · <b>GRAB</b> → swipe <b>↓</b> · <b>KICK</b> → swipe <b>↑</b>` : `he throws COMBOS: <b>SHOVE</b> → <b>${ev.side > 0 ? '→' : '←'}</b> · <b>GRAB</b> → <b>↓</b> · <b>KICK</b> → <b>↑</b> · late = PERFECT · don’t bite on fakes`, keys: null });
    E.ui.bind((k) => E.key(k));
    Audio.sfx('scratch', 0.5, 1.6); Audio.sfx('whoosh', 0.8, 0.7);
  }
  function rivalBeat(ev) {
    ev.bi++;
    if (ev.bi >= ev.beats.length) { rivalFinish(ev); return; }
    const d = clamp(0.12 + (G.order - 1) / 5), k = ev.res.length;
    ev.st = 'gap'; ev.t = 0; ev.gap = (0.3 + Math.random() * 0.35) * (ev.bi === 0 ? 1.4 : 1);
    ev.W = (ev.first && k === 0 ? 0.9 : [0.75, 0.68, 0.6][Math.min(2, k)]) * (1 - d * 0.1);
    ev.pressed = null;
  }
  // his moves: a shove (counter TOWARD him), a grab at your bag (↓ yank it back), a kick at your front wheel (↑ hop)
  const HITS = { shove: { label: 'SHOVE', ok: 'countered' }, grab: { label: 'GRAB', ok: 'bag saved' }, kick: { label: 'KICK', ok: 'hopped it' } };
  function startCombo(ev) {
    const d = clamp(0.12 + (G.order - 1) / 5), k = ev.res.length, n = Math.min(4, 2 + k + (d > 0.6 && k >= 2 ? 1 : 0));
    ev.combo = [{ type: 'shove' }]; for (let i = 1; i < n; i++) { const opts = ['shove', 'grab', 'kick'].filter((t) => t !== ev.combo[i - 1].type); ev.combo.push({ type: opts[Math.floor(Math.random() * opts.length)] }); }
    for (const h of ev.combo) h.key = h.type === 'shove' ? ev.toward : h.type === 'grab' ? 'arrowdown' : 'arrowup';
    ev.hit = 0; ev.late = 0; ev.W0 = ev.W; nextHit(ev, true);
  }
  function nextHit(ev, first = false) {
    const h = ev.combo[ev.hit]; ev.t = 0; ev.W = ev.W0 * Math.pow(0.94, ev.hit);
    const tip = { shove: `${ev.side > 0 ? '→' : '←'} shove back`, grab: '↓ yank your bag back', kick: '↑ hop his kick' }[h.type];
    ev.q?.remove?.(); ev.q = UI.qte({ key: h.key, label: `<b>${HITS[h.type].label}</b> ${ev.hit + 1}/${ev.combo.length}${first && ev.first ? ' — ' + tip : ''}` });
    if (!first) Audio.sfx('whoosh', 0.6, 0.8 + ev.hit * 0.15);
  }
  function rivalFinish(ev) {
    const p = P(ev), n = ev.res.filter((x) => x === 'PERFECT' || x === 'COUNTER').length, perf = ev.res.filter((x) => x === 'PERFECT').length, shoved = ev.res.filter((x) => x === 'SHOVED').length;
    ev.st = 'finish'; ev.t = 0; ev.won = n >= 2;
    const g = perf === 3 && !ev.flinch ? 'SENT HIM' : n >= 2 ? 'RIVAL DOWN' : shoved >= 2 ? 'BULLIED' : 'HELD ON';
    const pts = { 'SENT HIM': 1500, 'RIVAL DOWN': 800, 'HELD ON': 250, BULLIED: 0 }[g];
    G.score += pts * G.mult; G.fin = { ...(G.fin || {}), rival: g };
    E.ui?.done(g); setTimeout(() => UI.remove('evui'), 1400);
    if (ev.won) { UI.pop(g === 'SENT HIM' ? 'SENT HIM 🚀' : 'RIVAL DOWN!', `+${pts * G.mult}`, { top: 30 }); sayBubble(p, '😵'); Audio.sfx('crash', 0.9, 0.9); }
    else { UI.pop(g, shoved >= 2 ? 'he took your lunch money' : `+${pts * G.mult}`, { top: 30 }); sayBubble(p, '😂'); UI.say('DashDash guy', 'later, loser 😂'); }
    if (G.tut) { G.tut.rival = 1; ctx.saveTut?.(); }
  }
  function rivalPress(ev, k) {
    const p = P(ev);
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) return true; // swallow other keys during the duel
    if (ev.st === 'strike' && !ev.pressed) {
      const h = ev.combo[ev.hit], u = ev.t / ev.W;
      if (k === h.key) { // answered this hit: chain straight into the next one
        ev.late += u >= 0.5 ? 1 : 0; ev.q?.result(u >= 0.5 ? 'PERFECT' : 'GOOD', HITS[h.type].ok); ev.q = null;
        const at = G.R.root.position.clone().setY(h.type === 'kick' ? 0.5 : 1.2).lerp(p.root.position.clone().setY(1.1), 0.5);
        FX.burst(at, { color: 0xffffff, n: 12, speed: 4, up: 1.5, life: 0.35, size: 0.28 }); Audio.sfx(h.type === 'kick' ? 'pop' : 'crash', 0.45, 1.5 + ev.hit * 0.12); G.score += 60 * G.mult; G.shake = Math.max(G.shake || 0, 0.12);
        if (++ev.hit >= ev.combo.length) { ev.pressed = k; resolveStrike(ev, ev.late >= Math.ceil(ev.combo.length / 2) ? 'PERFECT' : 'COUNTER'); }
        else nextHit(ev);
      } else if (k === ev.away && h.type === 'shove' && ev.hit === 0) { ev.pressed = k; ev.q?.remove?.(); resolveStrike(ev, 'DODGE'); } // bail out of the whole combo: safe, cheap
      else { ev.pressed = k; ev.q?.result('MISS', 'wrong move'); ev.q = null; resolveStrike(ev, 'SHOVED'); }
      return true;
    }
    if ((ev.st === 'tell' || ev.st === 'feint') && ev.flinchCd <= 0) { // only biting on a wind-up counts; idle presses are ignored
      // jumped the gun: you swerve at nothing, he laughs
      ev.flinch++; ev.flinchCd = 0.6; G.lat += (k === ev.toward ? 0.5 : -0.5) * ev.side; G.score = Math.max(0, G.score - 50); ctx.breakCombo();
      UI.pop('FLINCHED', ev.st === 'feint' ? 'he faked you out' : 'wait for the swing', { top: 30 }); Audio.sfx('bwomp', 0.5, 1.4); sayBubble(p, '😏'); ev.laughT = 0.8;
    }
    return true;
  }
  function resolveStrike(ev, grade) {
    const p = P(ev), at = G.R.root.position.clone().setY(1.2).lerp(p.root.position.clone().setY(1.2), 0.5);
    ev.res.push(grade); E.ui.set(ev.res.map((x) => x === 'PERFECT' || x === 'COUNTER' || x === 'DODGE' ? (x === 'DODGE' ? 'mid' : true) : false));
    ev.st = 'after'; ev.t = 0; ev.grade = grade;
    if (grade === 'PERFECT' || grade === 'COUNTER') {
      const pts = grade === 'PERFECT' ? 400 : 250; G.score += pts * G.mult; ctx.addCombo(grade === 'PERFECT' ? 6 : 4);
      ev.push = 1.25; ev.arm = 1; G.shake = Math.max(G.shake || 0, 0.3); ev.hitStop = 0.08;
      FX.burst(at, { color: 0xffffff, n: 26, speed: 6, up: 2, life: 0.5, size: 0.35 }); FX.shock(at, { color: grade === 'PERFECT' ? 0x46ff8f : 0xffffff, radius: 3, dur: 0.35 });
      Audio.sfx('crash', 0.55, 1.5); Audio.sfx('boom', 0.5, 1.6); if (grade === 'PERFECT') Audio.sfx('ding', 0.8, 1.6);
      UI.pop(grade === 'PERFECT' ? 'PERFECT COUNTER' : 'COUNTER', `+${pts * G.mult}`, { top: 30 }); sayBubble(p, '😤');
      if (grade === 'PERFECT') G.boostCharge = Math.min(1, G.boostCharge + 0.34);
    } else if (grade === 'DODGE') {
      G.score += 100 * G.mult; ev.dodge = 1; Audio.sfx('whoosh', 0.9, 1.3); UI.pop('SIDESTEP', `+${100 * G.mult} · he whiffed`, { top: 30 }); sayBubble(p, '😠');
    } else {
      const lost = loseCoins(6 + Math.floor(G.coins * 0.1), G.R.root.position.clone().setY(1));
      G.lat -= ev.side * 0.6; ctx.tumble?.(1.15); G.ice = Math.max(0, G.ice - 6); ctx.breakCombo(); G.shake = 0.5;
      Audio.sfx('crash', 0.7, 1.1); UI.pop('SHOVED', `${lost ? `−${lost} coins · ` : ''}ice −6`, { top: 30 }); sayBubble(p, '😂'); navigator.vibrate?.(50);
    }
  }
  function rivalUpdate(ev, dt, sdt) {
    const p = P(ev), route = G.route;
    if (!(G.tumbleT > 0) || ev.st === 'finish') ev.t += sdt; ev.flinchCd = Math.max(0, (ev.flinchCd || 0) - sdt); ev.laughT = Math.max(0, (ev.laughT || 0) - sdt);
    ev.push = damp(ev.push, 0, 2.2, sdt); ev.arm = damp(ev.arm, 0, 5, sdt); ev.dodge = damp(ev.dodge || 0, 0, 3, sdt);
    let lean = 0, reach = 0, tell = 0;
    ev.hitStop = Math.max(0, ev.hitStop - dt);
    switch (ev.st) {
      case 'approach': ev.ds = lerp(-15, 0.35, easeOut(seg(ev.t, 0, 1.3))); E.slow = null;
        if (ev.t > 0.7 && !ev.said) { ev.said = true; UI.say('DashDash guy', ['that’s MY order, pal 😤', 'move, gobbl boy', 'nice bag. shame if it… fell 😏'][Math.floor(Math.random() * 3)]); Audio.sfx('horn', 0.35, 2.2); }
        if (ev.t > 1.45) rivalBeat(ev); break;
      case 'gap': E.slow = null; lean = Math.sin(ev.t * 3) * 0.05;
        if (ev.t > ev.gap) { ev.st = 'tell'; ev.t = 0; ev.real = ev.beats[ev.bi] === 'real'; Audio.sfx('skid', 0.4, 1.8); } break;
      case 'tell': // the wind-up looks the same for real and fake: lean away, eyes on you
        tell = smooth(clamp(ev.t / 0.28)); lean = -0.22 * tell; E.slow = 0.85;
        if (ev.t > 0.28) {
          if (ev.real) { ev.st = 'strike'; ev.t = 0; E.slow = 0.75; startCombo(ev); Audio.sfx('whoosh', 0.8, 0.6); sayBubble(p, '❗'); }
          else { ev.st = 'feint'; ev.t = 0; }
        } break;
      case 'feint': lean = lerp(-0.22, 0.18, smooth(seg(ev.t, 0, 0.18))) * (1 - smooth(seg(ev.t, 0.25, 0.55))); E.slow = 0.85;
        if (ev.t > 0.12 && !ev.fk) { ev.fk = true; sayBubble(p, '😏'); }
        if (ev.t > 0.7) { ev.fk = false; rivalBeat(ev); } break;
      case 'strike': { // a combo: each hit swings in on its own short timer
        const u = clamp(ev.t / ev.W), ty = ev.combo[ev.hit].type; lean = lerp(-0.22, ty === 'kick' ? 0.15 : 0.35, easeOut(u)); reach = u; E.slow = 0.75; ev.hitType = ty;
        ev.q?.set(1 - u);
        if (ev.t >= ev.W) { ev.q?.result('MISS', 'too slow'); ev.q = null; resolveStrike(ev, 'SHOVED'); }
        break; }
      case 'after': {
        const g = ev.grade; E.slow = null;
        if (g === 'PERFECT' || g === 'COUNTER') { lean = -0.5 * Math.exp(-ev.t * 3) * Math.cos(ev.t * 14); }
        else if (g === 'DODGE') { lean = 0.4 * Math.exp(-ev.t * 3) * Math.cos(ev.t * 10); reach = Math.max(0, 1 - ev.t * 3); }
        else { lean = 0.3 * (1 - smooth(seg(ev.t, 0, 0.5))); reach = 1 - smooth(seg(ev.t, 0, 0.35)); }
        if (ev.q && ev.t > 0.02 && g !== 'SHOVED') { ev.q.result(g === 'DODGE' ? 'GOOD' : 'PERFECT', g === 'DODGE' ? 'sidestepped' : g.toLowerCase()); ev.q = null; }
        if (ev.t > 0.6) { p.bubble.visible = false; rivalBeat(ev); }
        break; }
      case 'finish':
        if (ev.won) { // he loses it: wobbles, clips the curb, goes over the bars
          ev.off = lerp(ev.off, ev.side * Math.max(0, halfAt(G.s + ev.ds) - Math.abs(ev.base) - 0.8), 1 - Math.exp(-3 * sdt)); ev.ds -= sdt * (3 + ev.t * 10); lean = -Math.min(1.5, ev.t * 1.8);
          if (ev.t > 0.55 && !ev.boom) { ev.boom = true; const at = route.world(G.s + ev.ds, LANES[ev.rl] + ev.off, 0.6); FX.burst(at, { color: 0xd8d2c6, n: 30, speed: 5, up: 3, life: 0.9, size: 0.6, grav: 4 }); Audio.sfx('crash', 0.8, 0.8); }
        } else { ev.ds += sdt * (4 + ev.t * 12); lean = -0.1; }
        E.slow = null;
        if (ev.t > 0.25 && E.locked) { E.locked = false; }
        if (ev.t > 2.2) { ev.st = 'done'; p.root.visible = false; p.bubble.visible = false; E.cur = null; }
        break;
    }
    if (ev.hitStop > 0) E.slow = 0.35;
    if (ev.st === 'done') return;
    if (!p.root.visible) p.root.visible = true; // never ride against an invisible rival
    if (E.locked) { // you can't steer while you're locked in the duel, so the road ahead is kept clear for as long as it lasts
      for (const o of G.lv.obs) if (!o.dead && o.s > G.s - 2 && o.s < G.s + 70 && o.kind !== 'gate' && !o.drop) o.dead = true;
      for (const w of G.pop.walkers) if (!w.gone && w.s > G.s - 2 && w.s < G.s + 70) w.gone = true;
    }
    // place him: his lane, pushed out when you shove him, in toward you when he swings
    // shoulder to shoulder (≈1.5 m off your line), swinging wide while he catches up so he never brushes the lens
    const wide = ev.st === 'approach' ? 1 - smooth(seg(ev.ds, -6, -1)) : 0;
    ev.base = ev.base ?? LANES[ev.rl]; ev.base = damp(ev.base, G.lat + ev.side * (1.55 + wide * 2.2), 6, sdt);
    const lat = ev.base + ev.side * (ev.push * 1.2) - ev.side * reach * 0.75 + (ev.st === 'finish' ? ev.off : 0);
    const f = route.at(G.s + ev.ds);
    route.world(G.s + ev.ds, lat, 0, p.root.position); p.root.rotation.set(0, f.yaw, 0);
    ev.roll = damp(ev.roll, lean, 14, dt);
    p.root.rotateZ(-ev.side * ev.roll); // positive lean = toward you
    const C = p.C;
    C.root.position.set(0, 0.15, -0.12); C.root.rotation.set(0, 0, 0);
    if (ev.st === 'finish' && ev.won && ev.t > 0.4) { C.pose([['falling', 0.3 + (ev.t - 0.4) * 1.2, 1, false]]); C.root.position.y = 0.15 + Math.sin(Math.min(1, (ev.t - 0.4) * 2) * Math.PI) * 0.6; C.root.rotation.x = Math.min(1.4, (ev.t - 0.4) * 2.5); }
    else {
      C.pose([['idle', G.time * 0.6]]);
      // hands on the bar, the near one reaching for your shoulder when he swings
      const near = ev.side > 0 ? 'Left' : 'Right', far = near === 'Left' ? 'Right' : 'Left';
      const bar = (s) => p.root.localToWorld(V(s * 0.24, 1.06, 0.46));
      const target = ev.hitType === 'kick' ? G.R.root.localToWorld(V(0, 0.45, 0.55)) : ev.hitType === 'grab' ? G.R.C.boneWorld('Spine2').add(G.R.root.localToWorld(V(0, 0.1, -0.35)).sub(G.R.root.position)) : G.R.C.boneWorld('Spine2').add(V(0, 0.15, 0));
      ik2(C.bone(far + 'Arm'), C.bone(far + 'ForeArm'), C.bone(far + 'Hand'), bar(far === 'Left' ? 1 : -1), p.root.localToWorld(V(far === 'Left' ? 0.6 : -0.6, 0.8, -0.4)));
      ik2(C.bone(near + 'Arm'), C.bone(near + 'ForeArm'), C.bone(near + 'Hand'), bar(near === 'Left' ? 1 : -1).lerp(target, clamp(reach * 1.2)), p.root.localToWorld(V(near === 'Left' ? 0.6 : -0.6, 0.6, -0.5)));
      const hd = C.bone('Head'); hd.rotateY(ev.side * 0.6 * (ev.st === 'gap' || ev.st === 'tell' || ev.st === 'strike' ? 1 : 0.4)); if (ev.laughT > 0) hd.rotateX(-0.3 * Math.sin(ev.laughT * 20)); hd.updateMatrixWorld(true);
    }
    p.bubble.position.copy(p.root.position).add(V(0, 2.35, 0));
    // you: shoved sideways on a miss, a quick sidestep on a dodge
    if (ev.dodge > 0.01) G.lat = damp(G.lat, LANES[G.lane] - ev.side * 0.9 * ev.dodge, 20, sdt);
  }

  // ================================================================ CRANE
  function craneStart(ev) {
    const p = P(ev); clearTraffic(G.s - 6, ev.drops.at(-1).s + 20);
    ev.st = 'snap'; ev.t = 0; ev.hits = 0; ev.close = 0; ev.hop = false; E.cur = ev;
    E.ui = UI.evUI({ title: '🏗️ LOAD DROP!', pips: 0, hint: 'watch the <b>red markers</b> — the ring closes as it falls · <b>←/→</b> thread the gaps · <b>↑</b> hop the beam' });
    Audio.sfx('trainhorn', 0.55, 0.62); Audio.sfx('snap', 1, 0.55); Audio.sfx('creak', 0.9, 0.6); G.shake = Math.max(G.shake || 0, 0.3);
    UI.thought('oh no. oh no no no');
    // every piece breaks off the hook toward its own spot on the road
    const hookW = p.hook.getWorldPosition(V());
    for (const q of p.pieces) { q.from = hookW.clone().add(V((Math.random() - 0.5) * 1.5, -1.5 - Math.random(), (Math.random() - 0.5) * 1.5)); q.m.position.copy(q.from); q.spin = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); q.m.visible = true; }
    p.load.visible = false;
  }
  function craneUpdate(ev, dt, sdt) {
    const p = P(ev), route = G.route;
    ev.t += sdt;
    // hook + cable: the load sways from the moment it's in view, then the cable whips up after the snap
    const sway = Math.sin(G.time * 1.3) * 0.25, cableLen = ev.st === 'idle' ? 14 : 14 - Math.min(10, ev.t * 18);
    p.hook.position.set(Math.sin(G.time * 1.3) * 0.6, p.H - 0.6 - cableLen, 6); p.hook.rotation.z = sway * 0.3;
    p.cable.scale.y = cableLen; p.cable.position.set(p.hook.position.x / 2, p.H - 0.4 - cableLen / 2, 6); p.cable.rotation.z = Math.atan2(p.hook.position.x, cableLen);
    if (ev.st === 'idle') return;
    const v = Math.max(G.v, 4);
    E.slow = ev.st === 'clear' ? null : 0.72;
    let pending = 0;
    for (const q of p.pieces) {
      const o = q.o;
      if (o.dead) { q.m.visible = false; continue; }
      // every marker shows from the snap; it gets hotter as its piece comes down
      const T = 0.9, eta = (o.s - o.land - G.s) / v;
      if (!o.fall && eta <= T) o.fall = 0;
      if (o.fall != null && !o.landed) {
        o.fall += sdt; const u = clamp(o.fall / T);
        const to = route.world(o.s, o.lat, 0); const yaw = route.at(o.s).yaw;
        q.m.position.set(lerp(q.from.x, to.x, easeOut(u)), lerp(q.from.y, 0, u * u), lerp(q.from.z, to.z, easeOut(u)));
        q.m.quaternion.setFromAxisAngle(q.spin, (1 - u) * 5).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw));
        q.ring.scale.setScalar(o.piece === 'beam' ? 1 : lerp(2.4, 1, u)); q.ring.material.opacity = 0.9;
        q.mark.material.opacity = 0.55 + 0.35 * Math.sin(G.time * 30);
        if (u >= 1) {
          o.landed = true; q.ring.material.opacity = 0; q.mark.material.opacity = 0.0; o.landT = G.time;
          q.m.position.copy(to); q.m.rotation.set(0, yaw, 0);
          FX.burst(to.clone().setY(0.4), { color: 0xcfc6b6, n: 34, speed: 6, up: 2.2, life: 1.0, size: 0.8, grav: 3 }); FX.shock(to, { color: 0xffe2b0, radius: o.piece === 'beam' ? 7 : 4, dur: 0.45 });
          Audio.sfx(o.piece === 'potty' ? 'splash' : 'crash', 0.9, o.piece === 'beam' ? 0.6 : 0.85); Audio.sfx('boom', 0.6, 0.9);
          const near = Math.abs(o.s - G.s) < 12; G.shake = Math.max(G.shake || 0, near ? 0.45 : 0.2);
          // close call: it came down right next to you
          if (o.piece !== 'beam' && Math.abs(o.s - G.s) < 5.5 && Math.abs(o.lat - G.lat) > o.w / 2 + 0.32 && Math.abs(o.lat - G.lat) < 3.0) { ev.close++; G.score += 150 * G.mult; ctx.addCombo(4); UI.pop('CLOSE CALL', `+${150 * G.mult}`, { top: 30 }); Audio.sfx('whoosh', 0.9, 1.4); }
        }
      } else if (!o.landed) { q.mark.material.opacity = Math.max(q.mark.material.opacity, 0.32 + 0.1 * Math.sin(G.time * 8)); pending++; }
      if (!o.landed && o.fall == null) pending++;
    }
    // the beam: hop it, close for style
    const beam = p.pieces.at(-1).o;
    if (!ev.hop && G.y > 0.3 && G.vy > 0 && Math.abs(beam.s - G.s) < 9 && beam.s > G.s) { ev.hop = true; ev.hopD = beam.s - G.s; }
    if (ev.st === 'snap' && G.s > beam.s + 2) {
      ev.st = 'clear'; ev.t = 0; E.slow = null;
      const g = ev.hits ? (ev.hits === 1 ? 'CLONKED' : 'FLATTENED') : ev.close >= 2 ? 'UNTOUCHED' : 'CLEAN';
      const style = ev.hop && !ev.hits && ev.hopD < 4.5 ? 300 : 0, pts = { UNTOUCHED: 900, CLEAN: 500, CLONKED: 100, FLATTENED: 0 }[g] + style;
      G.score += pts * G.mult; G.fin = { ...(G.fin || {}), crane: g };
      E.ui?.done(g); setTimeout(() => UI.remove('evui'), 1300);
      UI.pop(g === 'UNTOUCHED' ? 'UNTOUCHED 🏗️' : g, `${style ? 'late hop! · ' : ''}+${pts * G.mult}`, { top: 30 });
      if (!ev.hits) Audio.sfx('jingle', 0.6, 1.2);
    }
    if (ev.st === 'clear' && ev.t > 1.2) { ev.st = 'done'; E.cur = null; }
    void pending; void dt;
  }
  E.clonk = (o) => { // a dropped piece hit you: costly, never a wipeout
    const ev = E.cur?.kind === 'crane' ? E.cur : (G.lv.events || []).find((e) => e.kind === 'crane');
    o.dead = true; ctx.tumble?.(1.2); G.ice = Math.max(0, G.ice - 10); ctx.breakCombo(); G.shake = 0.6;
    const lost = loseCoins(10, G.R.root.position.clone().setY(1)); if (ev) ev.hits = (ev.hits || 0) + 1;
    FX.burst(G.R.root.position.clone().setY(1), { color: 0xffffff, n: 30, speed: 6, up: 3, life: 0.6, size: 0.4 });
    UI.pop('CLONK!', `${lost ? `−${lost} coins · ` : ''}ice −10`, { top: 30 }); Audio.sfx('crash', 0.9, 0.8); navigator.vibrate?.(70);
  };

  // ================================================================ hooks for the game loop
  E.update = (dt, sdt) => {
    E.speedK = E.cur?.kind === 'rival' && E.locked ? DUEL_SPEED : 1;
    for (const p of props) {
      const ev = p.ev;
      if (ev.st === 'idle' && G.s > (ev.kind === 'rival' ? ev.s + 25 : ev.drops[0].s - 4)) { ev.st = 'done'; continue; } // came in past it (continue / debug skip): don't start late
      if (ev.kind === 'rival') { if (ev.st === 'idle' && G.s >= ev.s && !E.cur) rivalStart(ev); if (ev.st !== 'idle' && ev.st !== 'done') rivalUpdate(ev, dt, sdt); }
      if (ev.kind === 'crane') { if (ev.st === 'idle' && G.s >= ev.s - 2 && !E.cur) craneStart(ev); if (ev.st !== 'done') craneUpdate(ev, dt, sdt); }
    }
  };
  E.key = (k) => { const ev = E.cur; if (ev?.kind === 'rival' && ev.st !== 'finish' && E.locked) return rivalPress(ev, k); return false; };
  // the camera: a tight over-the-shoulder two-shot for the duel; high and wide for the drop so you can read the road
  E.camera = () => {
    const ev = E.cur; if (!ev) return { w: 0 };
    if (ev.kind === 'rival' && ev.st !== 'finish') { const rl = ev.base ?? LANES[ev.rl], mid = (G.lat + rl) / 2, tall = innerWidth < innerHeight; return { w: 1, scale: 1.2, shot: tall ? { ds: -7.4, lat: mid, y: 3.3, lds: 8, llat: mid, ly: 0.9, fov: baseFov() + 4 } : { ds: -4.9, lat: mid - ev.side * 0.3, y: 2.55, lds: 7, llat: mid, ly: 1.05, fov: baseFov() - 2 } }; }
    if (ev.kind === 'crane' && ev.st === 'snap') return { w: 1, scale: 1.4, shot: { ds: -8.2, lat: G.lat * 0.45, y: 7.0 + G.y * 0.4, lds: 15, llat: G.lat * 0.25, ly: 0.2, fov: baseFov() + 4 } };
    return { w: 0 };
  };
  // your near arm shoves him when you counter
  E.pose = (R) => {
    const ev = E.cur; if (!ev || ev.kind !== 'rival' || !(ev.arm > 0.05)) return;
    const p = P(ev), near = ev.side > 0 ? 'Right' : 'Left', tgt = p.C.boneWorld('Spine2').add(V(0, 0.1, 0));
    const hand = R.C.boneWorld(near + 'Hand');
    ik2(R.C.bone(near + 'Arm'), R.C.bone(near + 'ForeArm'), R.C.bone(near + 'Hand'), hand.lerp(tgt, clamp(ev.arm * 1.1)), R.root.localToWorld(V(near === 'Left' ? 0.6 : -0.6, 0.6, -0.5)));
  };
  E.bank = () => { const ev = E.cur; if (!ev || ev.kind !== 'rival') return 0; return ev.arm * 0.28 * -ev.side; };
  return E;
}
