// Bikes: a cosmetic slot that re-skins the courier's city bike (frame paint, wheels, parts) and bolts on procedural
// extras. Bike-local frame of the city_bike model: +x forward, +y up, z across; wheels on pivots (spin with the
// ride), axles at x ±0.555, y 0.32, r 0.32; seat ≈ (-0.21, 0.86); grips ≈ (0.25, 1.0, ±0.215); crank (-0.05, 0.25).
// Battle-pass exclusive (premium track) — never in crates.
import { THREE, V, canvasTex } from './core.js';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
const glow = (c, k = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
const M = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent?.add(o); return o; };
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const tube = (a, b, r, m, parent) => { const d = b.clone().sub(a), o = M(new THREE.CylinderGeometry(r, r, d.length(), 10), m, 0, 0, 0, parent); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o; };
let env = null;
const chrome = () => (env ||= (() => { const t = canvasTex('bike_env', 256, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#9fb4c8'); g.addColorStop(0.55, '#2a2f36'); g.addColorStop(1, '#c8b896'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); t.mapping = THREE.EquirectangularReflectionMapping; return t; })());
// glowing rim ring + optional whitewall, on a wheel pivot (so it spins)
const rim = (piv, col, k = 2, r = 0.29, w = 0.012) => { const m = M(new THREE.TorusGeometry(r, w, 8, 48), glow(col, k), 0, 0, 0, piv); m.castShadow = false; return m; };

// paint: frame (painted tubes), bright (fenders/cover), dark (grips/tires); any other key = extra material props
export const BIKES = {
  bike_classic: { paint: null },
  bike_fixie: { paint: { frame: { color: 0x17181b, roughness: 0.95, metalness: 0.1 }, bright: { color: 0x26282c, roughness: 0.9 } }, build(b, pv) { for (const p of [pv.front, pv.back]) M(new THREE.TorusGeometry(0.28, 0.035, 10, 40), std(0x0c0c0e, { roughness: 0.3, metalness: 0.6 }), 0, 0, 0, p); } },
  bike_bmx: {
    paint: { frame: { color: 0x39ff6a, emissive: 0x0c4a1a, roughness: 0.3, metalness: 0.2 }, bright: { color: 0xff3bd4, emissive: 0x3a0a30 } },
    build(b, pv, A) { const r1 = rim(pv.front, 0x3bd4ff, 2.2), r2 = rim(pv.back, 0x3bd4ff, 2.2); for (const s of [-1, 1]) for (const x of [0.555, -0.555]) { const p = M(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10), std(0xdddddd, { metalness: 0.9, roughness: 0.2, envMap: chrome() }), x, 0.32, s * 0.09, b); p.rotation.x = Math.PI / 2; } A.push((t) => { const k = 1.6 + Math.sin(t * 6) * 0.6; r1.material.emissiveIntensity = k; r2.material.emissiveIntensity = k; }); },
  },
  bike_cargo: {
    paint: { frame: { color: 0x2e6b4a, roughness: 0.55 }, bright: { color: 0xe8dcc0 } },
    build(b) {
      const wood = new THREE.MeshStandardMaterial({ map: canvasTex('bike_crate', 256, 128, (x, w, h) => { x.fillStyle = '#b98a52'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(80,50,20,.5)'; x.lineWidth = 3; for (let y = 0; y < h; y += 32) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.fillStyle = '#1d5a33'; x.font = '900 52px system-ui'; x.textAlign = 'center'; x.fillText('gobbl', w / 2, 82); }), roughness: 0.85 });
      const box = M(B(0.5, 0.32, 0.46), wood, 0.72, 0.72, 0, b); void box;
      const steel = std(0x2a2c30, { metalness: 0.6, roughness: 0.4 });
      for (const s of [-1, 1]) { tube(V(0.5, 0.55, s * 0.2), V(0.95, 0.55, s * 0.2), 0.012, steel, b); tube(V(0.95, 0.55, s * 0.2), V(0.6, 0.34, s * 0.04), 0.012, steel, b); }
      M(B(0.3, 0.02, 0.26), steel, -0.62, 0.72, 0, b); for (const s of [-1, 1]) tube(V(-0.48, 0.72, s * 0.12), V(-0.6, 0.34, s * 0.06), 0.01, steel, b); // rear rack
      const bottles = [0x46d8ff, 0xffd23b, 0xff6b4a]; bottles.forEach((c, k) => M(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), std(c, { roughness: 0.25 }), 0.62 + k * 0.1, 0.96, -0.1 + k * 0.08, b));
    },
  },
  bike_patrol: {
    paint: { frame: { color: 0xf2f4f6, roughness: 0.35 }, bright: { color: 0x15171c } },
    build(b, pv, A) {
      const steel = std(0x2a2c30, { metalness: 0.6, roughness: 0.4 });
      M(B(0.3, 0.02, 0.24), steel, -0.62, 0.74, 0, b); for (const s of [-1, 1]) tube(V(-0.48, 0.74, s * 0.11), V(-0.6, 0.34, s * 0.06), 0.01, steel, b);
      M(B(0.3, 0.06, 0.1), std(0x111111), -0.62, 0.79, 0, b);
      const red = M(B(0.12, 0.07, 0.09), glow(0xff1a2a, 2), -0.69, 0.83, 0, b), blue = M(B(0.12, 0.07, 0.09), glow(0x1a5cff, 2), -0.55, 0.83, 0, b);
      const plate = canvasTex('bike_patrol', 256, 64, (x, w, h) => { x.fillStyle = '#0d1a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 40px system-ui'; x.textAlign = 'center'; x.fillText('PATROL', w / 2, 46); });
      for (const s of [-1, 1]) { const p = M(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 }), -0.62, 0.68, s * 0.125, b); p.rotation.y = s > 0 ? 0 : Math.PI; }
      const lamp = M(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 14), glow(0xfff6d8, 2.5), 0.5, 0.92, 0, b); lamp.rotation.z = Math.PI / 2;
      A.push((t) => { const ph = Math.floor(t * 8) % 4; red.material.emissiveIntensity = ph < 2 ? 3 : 0.15; blue.material.emissiveIntensity = ph < 2 ? 0.15 : 3; });
    },
  },
  bike_tandem: {
    paint: { frame: { color: 0xff9f1a, roughness: 0.4 }, bright: { color: 0xf2f2f2 } },
    hide: /cover_back/, back: -1.2,
    build(b, pv) {
      const fr = std(0xff9f1a, { roughness: 0.4 }), dark = std(0x1a1b1e, { roughness: 0.6 });
      tube(V(-0.36, 0.86, 0), V(-1.0, 0.86, 0), 0.022, fr, b); tube(V(-0.12, 0.3, 0), V(-1.0, 0.36, 0), 0.022, fr, b);
      for (const s of [-1, 1]) { tube(V(-1.0, 0.86, s * 0.02), V(-1.2, 0.32, s * 0.05), 0.016, fr, b); tube(V(-1.0, 0.36, s * 0.02), V(-1.2, 0.32, s * 0.05), 0.016, fr, b); }
      tube(V(-0.92, 0.36, 0), V(-0.92, 0.92, 0), 0.018, fr, b); M(B(0.22, 0.05, 0.14), dark, -0.92, 0.95, 0, b); // second seat
      tube(V(-0.62, 0.86, 0), V(-0.6, 1.02, 0), 0.016, fr, b); tube(V(-0.6, 1.02, -0.18), V(-0.6, 1.02, 0.18), 0.014, dark, b); // stoker bars
      // the stoker: a cardboard Kyle, along for the ride (still won't pedal)
      const cut = canvasTex('bike_kylecard', 256, 384, (x, w, h) => { x.fillStyle = '#c8a070'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a4a2e'; x.beginPath(); x.ellipse(w / 2, 110, 78, 92, 0, 0, 7); x.fill(); x.fillStyle = '#1a0f0a'; for (let i = 0; i < 8; i++) x.fillRect(66 + i * 16, 18, 8, 40); x.fillStyle = '#fff'; x.fillRect(90, 100, 26, 10); x.fillRect(140, 100, 26, 10); x.fillStyle = '#1a0f0a'; x.fillRect(98, 100, 10, 10); x.fillRect(148, 100, 10, 10); x.fillRect(84, 88, 34, 6); x.fillRect(138, 84, 34, 6); x.strokeStyle = '#3a1f12'; x.lineWidth = 6; x.beginPath(); x.moveTo(102, 150); x.quadraticCurveTo(128, 160, 152, 144); x.stroke(); x.fillStyle = '#111'; x.fillRect(40, 200, 176, 184); x.fillStyle = '#fff'; x.font = '900 30px system-ui'; x.textAlign = 'center'; x.fillText('KYLE S', w / 2, 270); x.font = '700 18px system-ui'; x.fillText('(cardboard)', w / 2, 300); });
      const k = M(new THREE.PlaneGeometry(0.36, 0.54), new THREE.MeshStandardMaterial({ map: cut, roughness: 0.9, side: THREE.DoubleSide }), -0.95, 1.22, 0, b); k.rotation.y = 0.25; /* side-on standee: reads in profile, edge-on to the chase cam */
    },
  },
  bike_ebike: {
    paint: { frame: { color: 0x26313c, metalness: 0.6, roughness: 0.35 }, bright: { color: 0x0f1216 } },
    build(b, pv, A) {
      const bat = M(B(0.3, 0.1, 0.09), std(0x111418, { roughness: 0.4 }), 0.12, 0.5, 0, b); bat.rotation.z = -0.62;
      const bar = M(B(0.2, 0.02, 0.092), glow(0x46ff8f, 1.8), 0.12, 0.5, 0, b); bar.rotation.z = -0.62;
      const lcd = M(B(0.08, 0.05, 0.03), glow(0x9fe6ff, 1.2), 0.3, 1.05, 0, b); void lcd;
      const lamp = M(new THREE.CylinderGeometry(0.035, 0.045, 0.06, 14), glow(0xfff6d8, 2.6), 0.5, 0.9, 0, b); lamp.rotation.z = Math.PI / 2;
      const beam = M(new THREE.ConeGeometry(0.22, 0.9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0.98, 0.78, 0, b); beam.rotation.z = Math.PI / 2 + 0.12; beam.castShadow = false;
      for (const p of [pv.front, pv.back]) M(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 20), std(0x2a2f36, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, p).rotation.x = Math.PI / 2;
      const hubs = [rim(pv.front, 0x46ff8f, 1.6, 0.08, 0.008), rim(pv.back, 0x46ff8f, 1.6, 0.08, 0.008)];
      A.push((t) => { bar.scale.x = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.7)); hubs.forEach((h) => { h.material.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.5; }); });
    },
  },
  bike_synth: {
    paint: { frame: { color: 0xe8ecf2, metalness: 1, roughness: 0.12, emissive: 0x3a0a3a, envMap: true }, bright: { color: 0x1a0a2a, emissive: 0x2a0a40 } },
    build(b, pv, A) {
      const cyan = glow(0x3bf6ff, 2.4), pink = glow(0xff2bd6, 2.4);
      tube(V(-0.2, 0.84, 0.03), V(0.42, 0.86, 0.03), 0.012, cyan, b); tube(V(-0.08, 0.3, 0.03), V(0.4, 0.82, 0.03), 0.012, pink, b);
      tube(V(-0.2, 0.84, -0.03), V(0.42, 0.86, -0.03), 0.012, cyan, b); tube(V(-0.08, 0.3, -0.03), V(0.4, 0.82, -0.03), 0.012, pink, b);
      const r = [rim(pv.front, 0xff2bd6, 2.6), rim(pv.back, 0x3bf6ff, 2.6)];
      const grid = canvasTex('bike_trail', 256, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,43,214,0)'); g.addColorStop(1, 'rgba(255,43,214,.9)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      const grid2 = canvasTex('bike_trail2', 256, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(59,246,255,0)'); g.addColorStop(1, 'rgba(59,246,255,.9)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      const trails = [[grid, 0.42], [grid2, 0.22]].map(([tx, y]) => M(new THREE.PlaneGeometry(1.6, 0.05), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), -1.35, y, 0, b));
      trails.forEach((t) => { t.castShadow = false; });
      A.push((t, ctx) => { const sp = Math.min(1, (ctx?.speed ?? 6) / 16); trails.forEach((tr, k) => { tr.scale.x = 0.4 + sp * 1.0 + Math.sin(t * 9 + k) * 0.05; tr.position.x = -0.6 - 0.8 * tr.scale.x; tr.material.opacity = 0.35 + sp * 0.6; }); r.forEach((m, k) => { m.material.emissiveIntensity = 2 + Math.sin(t * 4 + k * 2) * 0.8; }); });
    },
  },
  bike_chopper: { // the season's final reward: gold-chrome chopper, flame tank, whitewalls, exhaust flames, light trails
    paint: { frame: { color: 0xffc83a, metalness: 1, roughness: 0.16, envMap: true }, bright: { color: 0xffd86a, metalness: 1, roughness: 0.2, envMap: true }, dark: { color: 0x111111, roughness: 0.4 } },
    build(b, pv, A) {
      const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: 0.15, envMap: chrome() }), chromeM = new THREE.MeshStandardMaterial({ color: 0xeef2f6, metalness: 1, roughness: 0.1, envMap: chrome() });
      const flames = canvasTex('bike_flames', 256, 128, (x, w, h) => { x.fillStyle = '#16120c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ffe066'); g.addColorStop(0.5, '#ff8a1a'); g.addColorStop(1, 'rgba(220,30,0,0)'); x.fillStyle = g; x.beginPath(); const y = 18 + i * 15; x.moveTo(0, y - 8); x.bezierCurveTo(90, y - 18, 150, y + 10, 230 - i * 10, y - 4); x.bezierCurveTo(150, y + 18, 80, y + 6, 0, y + 8); x.fill(); } });
      const tank = M(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshStandardMaterial({ map: flames, metalness: 0.6, roughness: 0.25, envMap: chrome() }), 0.15, 0.82, 0, b); tank.scale.set(1.5, 0.75, 0.7);
      for (const p of [pv.front, pv.back]) { M(new THREE.TorusGeometry(0.29, 0.045, 12, 48), std(0x111111, { roughness: 0.7 }), 0, 0, 0, p); const ww = M(new THREE.TorusGeometry(0.29, 0.02, 8, 48), std(0xf4f0e6, { roughness: 0.6 }), 0, 0, 0, p); ww.scale.z = 1.6; }
      const rims = [rim(pv.front, 0xffc83a, 2.2, 0.25, 0.012), rim(pv.back, 0xffc83a, 2.2, 0.25, 0.012)];
      tube(V(-0.3, 0.86, 0), V(-0.42, 1.25, 0), 0.016, chromeM, b); tube(V(-0.42, 1.25, -0.08), V(-0.42, 1.25, 0.08), 0.016, chromeM, b); // sissy bar
      for (const s of [-1, 1]) { tube(V(0.36, 1.0, s * 0.1), V(0.3, 1.22, s * 0.18), 0.014, chromeM, b); } // ape-hanger risers
      const pipes = [-1, 1].map((s) => { const p = tube(V(-0.05, 0.3, s * 0.13), V(-0.85, 0.42, s * 0.16), 0.03, chromeM, b); return V(-0.88, 0.43, s * 0.16); });
      const fl = canvasTex('bike_exfl', 64, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h * 0.8, 3, w / 2, h * 0.6, h * 0.6); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.35, 'rgba(255,170,0,.95)'); g.addColorStop(1, 'rgba(255,40,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, 0); x.quadraticCurveTo(w, h * 0.6, w / 2, h); x.quadraticCurveTo(0, h * 0.6, w / 2, 0); x.fill(); });
      const sprites = pipes.map((at) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.copy(at).add(V(-0.08, 0, 0)); b.add(s); return s; });
      const tr = canvasTex('bike_goldtrail', 256, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,200,58,0)'); g.addColorStop(1, 'rgba(255,220,120,.95)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      const trails = [-1, 1].map((s) => M(new THREE.PlaneGeometry(1.6, 0.045), new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), -1.4, 0.32, s * 0.06, b));
      void gold;
      A.push((t, ctx) => { const sp = Math.min(1, (ctx?.speed ?? 6) / 16); sprites.forEach((s, k) => { const u = 0.7 + Math.sin(t * 23 + k) * 0.2 + sp * 0.5; s.scale.set(0.12 * u, 0.3 * u, 1); s.material.rotation = Math.PI / 2; s.position.x = -0.96 - 0.1 * u; }); trails.forEach((m, k) => { m.scale.x = 0.4 + sp * 1.1 + Math.sin(t * 8 + k) * 0.05; m.position.x = -0.6 - 0.8 * m.scale.x; m.material.opacity = 0.3 + sp * 0.65; m.castShadow = false; }); rims.forEach((r) => { r.material.emissiveIntensity = 1.8 + Math.sin(t * 5) * 0.6; }); });
    },
  },
};

// apply one bike to the rider: paint the frame, hide/move parts, build extras (returned so they can be cleared)
export function createBikeSkin(R) {
  const bike = R.bike.children[0], pv = R.pivots, parts = [];
  bike.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); parts.push({ o, m: o.material, snap: { color: o.material.color.clone(), emissive: o.material.emissive?.clone(), roughness: o.material.roughness, metalness: o.material.metalness, envMap: o.material.envMap }, n: (o.name + ' ' + o.material.name).toLowerCase() }); } });
  const backX = pv.back.position.x;
  let extras = [], anim = [];
  const group = (k) => (k === 'frame' ? /painted/ : k === 'bright' ? /bright|cover/ : k === 'dark' ? /handle|seat/ : null);
  return {
    apply(id, { gold = false } = {}) {
      for (const e of extras) e.removeFromParent(); extras = []; anim = [];
      for (const p of parts) { p.o.visible = true; p.m.color.copy(p.snap.color); if (p.snap.emissive) p.m.emissive.copy(p.snap.emissive); p.m.emissiveIntensity = 1; p.m.roughness = p.snap.roughness; p.m.metalness = p.snap.metalness; p.m.envMap = p.snap.envMap; p.m.needsUpdate = true; }
      pv.back.position.x = backX;
      const def = BIKES[id] || BIKES.bike_classic;
      if (gold && (!def.paint)) for (const p of parts) if (!/handle|seat|wheel|needles/.test(p.n)) { p.m.color.set(0xffc83a); p.m.metalness = 1; p.m.roughness = 0.2; p.m.envMap = chrome(); p.m.needsUpdate = true; }
      if (def.paint) for (const [k, props] of Object.entries(def.paint)) { const re = group(k); if (!re) continue; for (const p of parts) if (re.test(p.n)) { for (const [pk, v] of Object.entries(props)) { if (pk === 'envMap') p.m.envMap = v ? chrome() : null; else if (pk === 'color' || pk === 'emissive') p.m[pk].set(v); else p.m[pk] = v; } p.m.needsUpdate = true; } }
      if (def.hide) for (const p of parts) if (def.hide.test(p.n)) p.o.visible = false;
      if (def.back) pv.back.position.x = def.back;
      if (def.build) { const before = new Set([...bike.children, ...pv.front.children, ...pv.back.children]); def.build(bike, pv, anim); for (const c of [...bike.children, ...pv.front.children, ...pv.back.children]) if (!before.has(c)) extras.push(c); }
    },
    tick(t, ctx) { for (const f of anim) f(t, ctx); },
  };
}
