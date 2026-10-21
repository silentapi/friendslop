// Gameplay props with real detail (still cartoon-clean): minted tip coins, built steel ramps, raised glowing boost
// pads and holographic power-up orbs. Ramp/pad parts are merged per material so they instance cheaply.
import { THREE, BGU, canvasTex } from './core.js';

// ---------------------------------------------------------------- coin: raised rim + embossed $ faces
export function coinParts() {
  const face = canvasTex('coinface', 256, 256, (c, w) => {
    const g = c.createRadialGradient(w * 0.38, w * 0.32, 10, w / 2, w / 2, w / 2); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#ffc93a'); g.addColorStop(1, '#c98a00');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(120,70,0,.55)'; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, w / 2, w * 0.4, 0, 7); c.stroke();
    for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; c.fillStyle = 'rgba(255,240,180,.5)'; c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.44, w / 2 + Math.sin(a) * w * 0.44, 3, 0, 7); c.fill(); } // milled dots
    c.font = '900 150px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(110,60,0,.75)'; c.fillText('$', w / 2 + 5, w / 2 + 9); c.fillStyle = '#fff6c8'; c.fillText('$', w / 2 - 3, w / 2 + 2); c.fillStyle = '#f2b81e'; c.fillText('$', w / 2, w / 2 + 5); // embossed
  });
  const R = 0.34, T = 0.075;
  const rim = new THREE.LatheGeometry([[R * 0.82, -T / 2], [R, -T / 2], [R + 0.012, 0], [R, T / 2], [R * 0.82, T / 2], [R * 0.8, T * 0.32]].map(([x, y]) => new THREE.Vector2(x, y)), 28).rotateX(Math.PI / 2);
  const f1 = new THREE.CircleGeometry(R * 0.82, 28).translate(0, 0, T * 0.32), f2 = new THREE.CircleGeometry(R * 0.82, 28).rotateY(Math.PI).translate(0, 0, -T * 0.32);
  const faces = BGU.mergeGeometries([f1, f2]);
  rim.deleteAttribute('uv'); rim.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(rim.attributes.position.count * 2), 2));
  const geo = BGU.mergeGeometries([rim, faces], true);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.9, roughness: 0.22, emissive: 0x6a3c00, emissiveIntensity: 0.55 });
  const faceM = new THREE.MeshStandardMaterial({ map: face, metalness: 0.75, roughness: 0.3, emissive: 0x5a3400, emissiveIntensity: 0.4 });
  return { geo, mats: [gold, faceM] };
}

// ---------------------------------------------------------------- ramp: diamond-plate deck, hazard lip, painted sides, rails, struts
function diamondPlate() {
  return canvasTex('diamondplate', 256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#9aa1a8'); g.addColorStop(1, '#6f767d'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) { c.save(); c.translate(x, y); c.rotate(((x + y) / 22) % 2 ? 0.7 : -0.7); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-7, -2, 14, 3); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-7, 1, 14, 2); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 3; k++) { const y = 140 + k * 110; c.beginPath(); c.moveTo(w / 2, y); c.lineTo(w / 2 + 60, y + 50); c.lineTo(w / 2 + 34, y + 50); c.lineTo(w / 2, y + 22); c.lineTo(w / 2 - 34, y + 50); c.lineTo(w / 2 - 60, y + 50); c.fill(); } // painted arrows (up = toward the lip)
    for (let k = 0; k < 10; k++) { c.fillStyle = k % 2 ? '#111' : '#ffcc00'; c.beginPath(); c.moveTo(k * 32 - 10, 0); c.lineTo(k * 32 + 22, 0); c.lineTo(k * 32 + 2, 46); c.lineTo(k * 32 - 30, 46); c.fill(); } // hazard lip (top of texture)
  });
}
function rampSide() {
  return canvasTex('rampside', 512, 128, (c, w, h) => {
    c.fillStyle = '#ff6a00'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 3, h); // panel seams
    for (let k = 0; k < 20; k++) { c.fillStyle = k % 2 ? '#111' : '#ffcc00'; c.fillRect(k * 26, h - 18, 26, 18); }
    c.fillStyle = '#fff'; c.font = 'italic 900 54px system-ui, sans-serif'; c.fillText('gobbl', 60, 74);
  });
}
export function rampParts() {
  const L = 3.4, H = 1.1, W = 2.2, half = W / 2;
  // deck: the sloped top, UV v runs from the ground edge (0) to the lip (1)
  const deck = new THREE.BufferGeometry(), dn = new THREE.Vector3(0, L, -H).normalize();
  deck.setAttribute('position', new THREE.Float32BufferAttribute([-half, 0.02, -L / 2, half, H + 0.02, L / 2, half, 0.02, -L / 2, -half, 0.02, -L / 2, -half, H + 0.02, L / 2, half, H + 0.02, L / 2], 3)); // wound to face up
  deck.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([dn.x, dn.y, dn.z]).flat(), 3));
  deck.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1], 2));
  // sides: right triangles, plus the vertical back face under the lip
  const side = (x, flip) => { const g = new THREE.BufferGeometry(); const p = [x, 0, -L / 2, x, 0, L / 2, x, H, L / 2]; g.setAttribute('position', new THREE.Float32BufferAttribute(flip ? [p[0], p[1], p[2], p[6], p[7], p[8], p[3], p[4], p[5]] : p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(3).fill([Math.sign(x), 0, 0]).flat(), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(flip ? [0, 0, 1, 1, 1, 0] : [0, 0, 1, 0, 1, 1], 2)); return g; };
  const back = new THREE.PlaneGeometry(W, H).translate(0, H / 2, L / 2);
  const sides = BGU.mergeGeometries([side(half, true), side(-half, false), back.toNonIndexed()]);
  // steel: tube rails along both deck edges, struts under the lip, a kick plate at the toe
  const steelParts = [];
  for (const x of [-half + 0.05, half - 0.05]) { const r = new THREE.CylinderGeometry(0.045, 0.045, Math.hypot(L, H), 8); r.rotateX(Math.atan2(L, H)); r.translate(x, H / 2 + 0.08, 0); steelParts.push(r); }
  for (const x of [-half + 0.25, 0, half - 0.25]) steelParts.push(new THREE.BoxGeometry(0.1, H - 0.05, 0.1).translate(x, (H - 0.05) / 2, L / 2 - 0.12));
  steelParts.push(new THREE.BoxGeometry(W, 0.06, 0.25).translate(0, 0.03, -L / 2 + 0.1));
  const steel = BGU.mergeGeometries(steelParts.map((g) => g.index ? g.toNonIndexed() : g));
  return {
    geos: [deck, sides.index ? sides.toNonIndexed() : sides, steel],
    mats: [new THREE.MeshStandardMaterial({ map: diamondPlate(), metalness: 0.6, roughness: 0.45 }), new THREE.MeshLambertMaterial({ map: rampSide(), side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.8, roughness: 0.35 })],
  };
}

// ---------------------------------------------------------------- boost pad: raised metal frame + glowing animated chevron panel + halo
export function padParts(chevronTex) {
  const W = 2.3, L = 5;
  const frame = BGU.mergeGeometries([
    new THREE.BoxGeometry(W + 0.24, 0.07, 0.16).translate(0, 0.035, L / 2 + 0.04), new THREE.BoxGeometry(W + 0.24, 0.07, 0.16).translate(0, 0.035, -L / 2 - 0.04),
    new THREE.BoxGeometry(0.16, 0.07, L).translate(W / 2 + 0.04, 0.035, 0), new THREE.BoxGeometry(0.16, 0.07, L).translate(-W / 2 - 0.04, 0.035, 0),
  ].map((g) => g.toNonIndexed()));
  const panel = new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, 0.06, 0);
  const halo = new THREE.PlaneGeometry(W + 1.6, L + 1.6).rotateX(-Math.PI / 2).translate(0, 0.05, 0);
  const haloTex = canvasTex('padhalo', 128, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h / 2); g.addColorStop(0, 'rgba(70,255,150,.65)'); g.addColorStop(0.55, 'rgba(70,255,150,.22)'); g.addColorStop(1, 'rgba(70,255,150,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  return {
    geos: [frame, panel, halo],
    mats: [new THREE.MeshStandardMaterial({ color: 0x2a2f35, metalness: 0.85, roughness: 0.3 }),
      new THREE.MeshBasicMaterial({ map: chevronTex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 }),
      new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 })],
  };
}

// ---------------------------------------------------------------- power-up: holographic orb with the icon inside, base ring and a light column
export function pickupMesh(icon, col) {
  const g = new THREE.Group(), c = new THREE.Color(col);
  const iconT = canvasTex('puicon' + icon, 128, 128, (x, w) => { x.font = '84px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(icon, w / 2, w / 2 + 6); });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.35, metalness: 0.2, roughness: 0.05, emissive: c, emissiveIntensity: 0.6, depthWrite: false }));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false }));
  const ico = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconT, depthWrite: false })); ico.scale.set(0.72, 0.72, 1);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  const beamT = canvasTex('beam', 32, 128, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 6, 20, 1, true).translate(0, 3, 0), new THREE.MeshBasicMaterial({ map: beamT, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const orbG = new THREE.Group(); orbG.add(orb, shell, ico); orbG.position.y = 1.25;
  ring.position.y = 0.07; g.add(orbG, ring, beam);
  g.userData = { orbG, ring, shell };
  return g;
}
