// Courier cosmetics: gobbl bags, outfits and head gear, from plain colourways to deeply unwell. Everything is built
// procedurally (canvas textures + primitives) and hangs off the rider's existing rig: the bag group on Spine2, the
// suit/shoe/hair materials of the courier model, and attachments on the Head / Spine / Hips bones.
import { THREE, V, canvasTex, mat } from './core.js';

// ---------------------------------------------------------------- catalogue
// tier 'basic' = honest colourways; tier 'wacky' = loud, animated, expensive
export const CATS = [['bag', 'BAGS', '🎒'], ['outfit', 'OUTFITS', '👕'], ['head', 'HEAD', '🧢']];
export const ITEMS = [
  // bags
  { id: 'bag_classic', cat: 'bag', name: 'gobbl Classic', price: 0, tier: 'basic', desc: 'the one they gave you. smells like fries.', sw: 'linear-gradient(135deg,#1a1c20,#22c55e)' },
  { id: 'bag_midnight', cat: 'bag', name: 'Midnight', price: 60, tier: 'basic', desc: 'stealth delivery. purple trim.', sw: 'linear-gradient(135deg,#0d0b1a,#7c4dff)' },
  { id: 'bag_sunset', cat: 'bag', name: 'Sunset', price: 120, tier: 'basic', desc: 'orange → pink. very instagrammable.', sw: 'linear-gradient(135deg,#ff7a18,#ff3d8b)' },
  { id: 'bag_camo', cat: 'bag', name: 'Urban Camo', price: 220, tier: 'basic', desc: 'blend into the LYNX stop.', sw: 'linear-gradient(135deg,#4b5320,#8a8f6a)' },
  { id: 'bag_pizza', cat: 'bag', name: 'Pizza Tower', price: 1500, tier: 'wacky', desc: 'a leaning stack of glowing pizza boxes. steam included.', sw: 'linear-gradient(135deg,#ffb347,#d2371f)', icon: '🍕' },
  { id: 'bag_fridge', cat: 'bag', name: 'Literal Fridge', price: 3000, tier: 'wacky', desc: 'a whole fridge. door ajar. the light is on.', sw: 'linear-gradient(135deg,#e8eef2,#9fb3c4)', icon: '🧊' },
  { id: 'bag_tank', cat: 'bag', name: 'Goldfish Tank', price: 4500, tier: 'wacky', desc: 'his name is Kyle Jr. he swims.', sw: 'linear-gradient(135deg,#4fc3f7,#ff9800)', icon: '🐠' },
  { id: 'bag_disco', cat: 'bag', name: 'Disco Inferno', price: 7000, tier: 'wacky', desc: 'a spinning mirror ball. deliveries are a party now.', sw: 'conic-gradient(#fff,#9ad,#fff,#d9f,#fff)', icon: '🪩' },
  { id: 'bag_ufo', cat: 'bag', name: 'UFO Escort', price: 10000, tier: 'wacky', desc: 'a tiny saucer guards your order. tractor beam on.', sw: 'radial-gradient(#b6ff8a,#1d3b2a)', icon: '🛸' },
  { id: 'bag_reactor', cat: 'bag', name: 'Pocket Reactor', price: 15000, tier: 'wacky', desc: 'keeps the coffee cold via nuclear science. do not lick.', sw: 'radial-gradient(#9dff00,#1a2a06)', icon: '☢️' },
  // outfits
  { id: 'fit_classic', cat: 'outfit', name: 'gobbl Green', price: 0, tier: 'basic', desc: 'company issue. 100% polyester.', sw: 'linear-gradient(135deg,#2b3a2f,#3d5444)' },
  { id: 'fit_hoodie', cat: 'outfit', name: 'Grey Hoodie', price: 50, tier: 'basic', desc: 'the universal courier uniform.', sw: 'linear-gradient(135deg,#6b6f76,#9aa0a8)' },
  { id: 'fit_hivis', cat: 'outfit', name: 'Hi-Vis', price: 140, tier: 'basic', desc: 'cars still won’t see you.', sw: 'linear-gradient(135deg,#d8ff2a,#ff8a00)' },
  { id: 'fit_denim', cat: 'outfit', name: 'Double Denim', price: 200, tier: 'basic', desc: 'canadian tuxedo. bold.', sw: 'linear-gradient(135deg,#2c4a7a,#5b7fb8)' },
  { id: 'fit_track', cat: 'outfit', name: 'Track Suit', price: 280, tier: 'basic', desc: 'three stripes. zero affiliation.', sw: 'repeating-linear-gradient(90deg,#c0162c 0 18px,#fff 18px 22px)' },
  { id: 'fit_banana', cat: 'outfit', name: 'Banana', price: 1200, tier: 'wacky', desc: 'potassium-forward fashion.', sw: 'linear-gradient(135deg,#ffe135,#c9a400)', icon: '🍌' },
  { id: 'fit_ceo', cat: 'outfit', name: 'CEO of Delivery', price: 2500, tier: 'wacky', desc: 'black suit. red cape. flaps dramatically.', sw: 'linear-gradient(135deg,#0c0c0f,#b3121f)', icon: '🦸' },
  { id: 'fit_dino', cat: 'outfit', name: 'Inflatable T-Rex', price: 5000, tier: 'wacky', desc: 'spikes. tail. tiny arms (emotionally).', sw: 'linear-gradient(135deg,#3fbf3f,#1a6b1a)', icon: '🦖' },
  { id: 'fit_galaxy', cat: 'outfit', name: 'Galaxy Brain', price: 8000, tier: 'wacky', desc: 'a moving starfield. you are the universe delivering coffee.', sw: 'radial-gradient(#7c4dff,#0a0420)', icon: '🌌' },
  { id: 'fit_chrome', cat: 'outfit', name: 'Liquid Chrome', price: 11000, tier: 'wacky', desc: 'reflects the city. and Kyle’s disappointment.', sw: 'linear-gradient(135deg,#f4f6f8,#7d8794,#f4f6f8)', icon: '🪞' },
  { id: 'fit_gold', cat: 'outfit', name: 'Solid Gold', price: 15000, tier: 'wacky', desc: 'head-to-toe 24k. still no tip.', sw: 'linear-gradient(135deg,#fff3a0,#c8961e,#fff3a0)', icon: '👑' },
  // head
  { id: 'head_helmet', cat: 'head', name: 'gobbl Helmet', price: 0, tier: 'basic', desc: 'safety first. style… eventually.', sw: 'linear-gradient(135deg,#16181d,#2ee66f)' },
  { id: 'head_cap', cat: 'head', name: 'Backwards Cap', price: 50, tier: 'basic', desc: 'skater energy.', sw: 'linear-gradient(135deg,#d23a2f,#7a1a14)' },
  { id: 'head_beanie', cat: 'head', name: 'Beanie', price: 90, tier: 'basic', desc: 'it’s 88°F in Orlando. don’t care.', sw: 'linear-gradient(135deg,#ff9f1a,#b35c00)' },
  { id: 'head_bucket', cat: 'head', name: 'Bucket Hat', price: 160, tier: 'basic', desc: 'festival courier.', sw: 'linear-gradient(135deg,#e9dcc0,#a88f62)' },
  { id: 'head_blond', cat: 'head', name: 'Bleached', price: 250, tier: 'basic', desc: 'no helmet. new you. platinum.', sw: 'linear-gradient(135deg,#fff6c8,#e0c56a)' },
  { id: 'head_cone', cat: 'head', name: 'Traffic Cone', price: 1000, tier: 'wacky', desc: 'found it on Orange Ave. it’s yours now.', sw: 'repeating-linear-gradient(0deg,#ff6a00 0 14px,#fff 14px 20px)', icon: '🚧' },
  { id: 'head_prop', cat: 'head', name: 'Propeller Beanie', price: 1400, tier: 'wacky', desc: 'spins faster the faster you ride.', sw: 'conic-gradient(#e33,#fd0,#3c3,#39f,#e33)', icon: '🧢' },
  { id: 'head_afro', cat: 'head', name: 'Rainbow Afro', price: 2500, tier: 'wacky', desc: 'volume. so much volume.', sw: 'conic-gradient(#ff3b3b,#ffb23b,#fff23b,#3bff6a,#3bb4ff,#a33bff,#ff3b3b)', icon: '🌈' },
  { id: 'head_fish', cat: 'head', name: 'Fishbowl', price: 4000, tier: 'wacky', desc: 'a glass dome. a goldfish. breathing optional.', sw: 'radial-gradient(#bdf0ff,#2a8fb8)', icon: '🐟' },
  { id: 'head_fire', cat: 'head', name: 'Hair on Fire', price: 7500, tier: 'wacky', desc: 'Kyle is late? no. YOU are late. permanently on fire.', sw: 'linear-gradient(0deg,#ff2a00,#ffd000)', icon: '🔥' },
  { id: 'head_crown', cat: 'head', name: 'Delivery King', price: 12000, tier: 'wacky', desc: 'jewelled crown + floating halo. bow, Kyle.', sw: 'linear-gradient(135deg,#ffe066,#b8860b)', icon: '👑' },
];
export const DEFAULTS = { bag: 'bag_classic', outfit: 'fit_classic', head: 'head_helmet' };
export const byId = (id) => ITEMS.find((i) => i.id === id);

// ---------------------------------------------------------------- shared helpers
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const glow = (c, k = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
const M = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent?.add(o); return o; };
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
let envChrome = null;
function chromeEnv() { // a tiny gradient "studio" so chrome/gold read even before the scene env exists
  if (envChrome) return envChrome;
  envChrome = canvasTex('cos_env', 256, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#9fb4c8'); g.addColorStop(0.55, '#3a3f46'); g.addColorStop(1, '#c8b896'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  envChrome.mapping = THREE.EquirectangularReflectionMapping; return envChrome;
}
const bagFace = (key, draw) => canvasTex('cosbag_' + key, 512, 512, draw);
function gobblBox(key, side, face) { // the standard box, re-skinned
  const g = new THREE.Group(), s = std(side, { roughness: 0.7 }), f = new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 });
  M(B(0.42, 0.44, 0.3), [s, s, s, s, f, s], 0, 0, 0, g); void key;
  return g;
}
const logoFace = (bg, fg, sub, extra) => (x, w, h) => { if (typeof bg === 'function') bg(x, w, h); else { x.fillStyle = bg; x.fillRect(0, 0, w, h); } extra?.(x, w, h); x.fillStyle = fg; x.font = '900 128px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('gobbl', w / 2, 290); x.globalAlpha = 0.85; x.font = '700 34px system-ui'; x.fillText(sub, w / 2, 352); x.globalAlpha = 1; };

// ---------------------------------------------------------------- builders: bags (in the bag group's frame: 0.42 × 0.44 × 0.3 box, +z = away from his back)
const BAGS = {
  bag_midnight: () => gobblBox('mid', 0x0d0b1a, bagFace('mid', logoFace('#120f22', '#a98bff', 'NIGHT SHIFT', (x, w) => { x.fillStyle = '#7c4dff'; x.fillRect(0, 390, w, 14); }))),
  bag_sunset: () => gobblBox('sun', 0xff5a3d, bagFace('sun', logoFace((x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff7a18'); g.addColorStop(1, '#ff3d8b'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, '#fff', 'GOLDEN HOUR'))),
  bag_camo: () => gobblBox('camo', 0x4b5320, bagFace('camo', logoFace((x, w, h) => { x.fillStyle = '#5a6136'; x.fillRect(0, 0, w, h); const c = ['#3b4022', '#7c8456', '#2a2d18', '#8f8a62']; for (let i = 0; i < 70; i++) { x.fillStyle = c[i % 4]; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 12 + Math.random() * 30, Math.random() * 3, 0, 7); x.fill(); } }, '#f2f0e0', 'TACTICAL SNACKS'))),
  bag_pizza: (A) => {
    const g = new THREE.Group(), box = std(0xd9b27a, { roughness: 0.9 }), lid = new THREE.MeshStandardMaterial({ map: canvasTex('cos_pizzalid', 256, 256, (x, w, h) => { x.fillStyle = '#e6c08a'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0392b'; x.font = '900 46px system-ui'; x.textAlign = 'center'; x.fillText('HOT', w / 2, 110); x.fillText('PIZZA', w / 2, 160); x.strokeStyle = '#c0392b'; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, h / 2, 100, 0, 7); x.stroke(); }), roughness: 0.85 });
    for (let k = 0; k < 6; k++) { const b = M(B(0.6, 0.075, 0.6), [box, box, lid, box, box, box], (Math.sin(k * 1.7) * 0.05), -0.2 + k * 0.08, 0.12, g); b.rotation.y = Math.sin(k * 2.3) * 0.25; b.rotation.z = k * 0.035; }
    const glowP = M(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24), glow(0xff8a2a, 1.6), 0.08, 0.3, 0.12, g); glowP.rotation.z = 0.2;
    const steam = []; for (let k = 0; k < 4; k++) { const s = M(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.4, 0.12, g); s.castShadow = false; steam.push(s); }
    A.push((t) => steam.forEach((s, k) => { const u = (t * 0.5 + k / 4) % 1; s.position.set(Math.sin(u * 6 + k) * 0.06, 0.38 + u * 0.45, 0.12); s.scale.setScalar(0.6 + u * 1.4); s.material.opacity = 0.35 * (1 - u); }));
    return g;
  },
  bag_fridge: (A) => {
    const g = new THREE.Group(), white = std(0xf2f4f6, { roughness: 0.3, metalness: 0.15 }), steel = std(0xb8c0c8, { metalness: 0.9, roughness: 0.25 });
    M(B(0.62, 1.1, 0.5), white, 0, 0.28, 0.12, g);
    const inside = M(B(0.56, 1.0, 0.02), glow(0xe8f6ff, 1.2), 0, 0.28, 0.375, g); void inside;
    const door = new THREE.Group(); door.position.set(0.31, 0, 0.37); g.add(door);
    M(B(0.62, 1.1, 0.05), white, -0.31, 0.28, 0.0, door); M(B(0.03, 0.4, 0.04), steel, -0.56, 0.4, 0.04, door);
    for (const [y, c] of [[0.05, 0xff3b30], [0.32, 0x2ecc71], [0.58, 0xffd60a]]) M(B(0.1, 0.16, 0.1), std(c), (Math.random() - 0.5) * 0.25, y, 0.3, g); // snacks on the shelves
    M(B(0.56, 0.015, 0.4), glow(0xffffff, 0.3), 0, 0.2, 0.18, g); M(B(0.56, 0.015, 0.4), glow(0xffffff, 0.3), 0, 0.47, 0.18, g);
    const magnet = M(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ map: canvasTex('cos_mag', 64, 64, (x) => { x.fillStyle = '#22c55e'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 30px system-ui'; x.textAlign = 'center'; x.fillText('g', 32, 42); }) }), -0.45, 0.6, 0.03, door); void magnet;
    A.push((t) => { door.rotation.y = -0.55 - Math.sin(t * 2.2) * 0.25; });
    return g;
  },
  bag_tank: (A) => {
    const g = new THREE.Group();
    M(B(0.6, 0.06, 0.42), std(0x2a2c30), 0, -0.22, 0.1, g); M(B(0.6, 0.04, 0.42), std(0x2a2c30), 0, 0.3, 0.1, g);
    const water = M(B(0.56, 0.44, 0.38), new THREE.MeshPhysicalMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0, depthWrite: false }), 0, 0.03, 0.1, g); water.castShadow = false;
    M(B(0.56, 0.06, 0.38), std(0xe6c98a, { roughness: 1 }), 0, -0.17, 0.1, g); // gravel
    for (let k = 0; k < 3; k++) M(new THREE.ConeGeometry(0.025, 0.2 + k * 0.05, 5), std(0x2ecc71), -0.18 + k * 0.05, -0.06, 0.02 + k * 0.05, g);
    const fish = new THREE.Group(); g.add(fish); M(new THREE.SphereGeometry(0.05, 12, 10), glow(0xff8c1a, 0.5), 0, 0, 0, fish).scale.set(1.5, 1, 0.7); M(new THREE.ConeGeometry(0.04, 0.07, 4), glow(0xff8c1a, 0.5), -0.09, 0, 0, fish).rotation.z = Math.PI / 2;
    const bub = []; for (let k = 0; k < 5; k++) bub.push(M(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), 0, 0, 0.1, g));
    A.push((t) => { fish.position.set(Math.sin(t * 1.3) * 0.17, 0.02 + Math.sin(t * 2.1) * 0.06, 0.1 + Math.cos(t * 1.3) * 0.08); fish.rotation.y = Math.atan2(Math.cos(t * 1.3) * 0.17, -Math.sin(t * 1.3) * 0.08) - Math.PI / 2; fish.children[1].rotation.y = Math.sin(t * 14) * 0.5; bub.forEach((b, k) => { const u = (t * 0.6 + k / 5) % 1; b.position.set(0.15 - k * 0.04, -0.12 + u * 0.4, 0.1); }); });
    return g;
  },
  bag_disco: (A) => {
    const g = new THREE.Group(), tex = canvasTex('cos_disco', 256, 128, (x, w, h) => { for (let i = 0; i < w; i += 8) for (let j = 0; j < h; j += 8) { const v = 140 + Math.random() * 115; x.fillStyle = `rgb(${v},${v},${v + Math.random() * 20})`; x.fillRect(i, j, 7, 7); } });
    const ball = M(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ map: tex, metalness: 1, roughness: 0.12, envMap: chromeEnv(), emissive: 0x333344, flatShading: true }), 0, 0.12, 0.2, g);
    M(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6), std(0x222222), 0, 0.5, 0.2, g);
    const sparks = []; for (let k = 0; k < 10; k++) { const s = M(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: [0xff3bd4, 0x3bd4ff, 0xfff23b][k % 3] }), 0, 0, 0, g); s.castShadow = false; sparks.push(s); }
    A.push((t) => { ball.rotation.y = t * 2.4; sparks.forEach((s, k) => { const a = t * 1.7 + k * 0.63, r = 0.42 + Math.sin(t * 3 + k) * 0.06; s.position.set(Math.cos(a) * r, 0.12 + Math.sin(a * 1.3 + k) * 0.25, 0.2 + Math.sin(a) * r); s.visible = (Math.floor(t * 8 + k) % 3) !== 0; }); });
    return g;
  },
  bag_ufo: (A) => {
    const g = gobblBox('ufo', 0x1a1c20, bagFace('ufo', logoFace('#101418', '#b6ff8a', 'ABDUCTED SNACKS')));
    const ufo = new THREE.Group(); g.add(ufo);
    M(new THREE.SphereGeometry(0.22, 24, 10), new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 0.9, roughness: 0.25, envMap: chromeEnv() }), 0, 0, 0, ufo).scale.set(1, 0.28, 1);
    M(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9dffb0, transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 0.03, 0, ufo);
    const lights = []; for (let k = 0; k < 8; k++) { const l = M(new THREE.SphereGeometry(0.02, 6, 6), glow(0xffd23b, 2), Math.cos(k / 8 * Math.PI * 2) * 0.2, -0.01, Math.sin(k / 8 * Math.PI * 2) * 0.2, ufo); lights.push(l); }
    const beam = M(new THREE.ConeGeometry(0.2, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xb6ff8a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), 0, -0.27, 0, ufo); beam.castShadow = false;
    A.push((t) => { ufo.position.set(Math.sin(t * 0.9) * 0.08, 0.68 + Math.sin(t * 2.2) * 0.06, 0.05); ufo.rotation.y = t * 3; ufo.rotation.z = Math.sin(t * 1.4) * 0.12; lights.forEach((l, k) => { l.material.emissiveIntensity = (Math.floor(t * 10) + k) % 4 ? 0.3 : 3; }); beam.material.opacity = 0.16 + Math.sin(t * 6) * 0.06; });
    return g;
  },
  bag_reactor: (A) => {
    const g = new THREE.Group(), steel = std(0x5d656e, { metalness: 0.8, roughness: 0.35 });
    const haz = canvasTex('cos_haz', 256, 64, (x, w, h) => { for (let i = -2; i < 12; i++) { x.fillStyle = i % 2 ? '#111' : '#ffd21a'; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32, h); x.lineTo(i * 32 - 32, h); x.fill(); } });
    for (const y of [-0.22, 0.42]) M(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24), [steel, new THREE.MeshStandardMaterial({ map: haz }), steel], 0, y, 0.15, g);
    const core = M(new THREE.CylinderGeometry(0.15, 0.15, 0.58, 24), new THREE.MeshPhysicalMaterial({ color: 0x9dff00, emissive: 0x7aff00, emissiveIntensity: 2, transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 0.1, 0.15, g);
    for (let k = 0; k < 4; k++) M(new THREE.CylinderGeometry(0.018, 0.018, 0.64, 8), steel, Math.cos(k * Math.PI / 2) * 0.2, 0.1, 0.15 + Math.sin(k * Math.PI / 2) * 0.2, g);
    const rods = []; for (let k = 0; k < 3; k++) rods.push(M(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), glow(0xd9ff6a, 3), Math.cos(k * 2.1) * 0.07, 0.1, 0.15 + Math.sin(k * 2.1) * 0.07, g));
    const sign = M(new THREE.CircleGeometry(0.09, 3), new THREE.MeshBasicMaterial({ color: 0xffd21a }), 0, 0.6, 0.15, g); void sign;
    A.push((t) => { const p = 1.5 + Math.sin(t * 5) * 0.8 + (Math.sin(t * 23) > 0.92 ? 2 : 0); core.material.emissiveIntensity = p; rods.forEach((r, k) => { r.position.y = 0.1 + Math.sin(t * 3 + k * 2) * 0.12; }); });
    return g;
  },
};

// ---------------------------------------------------------------- builders: head (Head bone frame: +y up, +z forward; crown of the head ≈ y 0.17)
const HEADS = {
  head_cap: () => { const g = new THREE.Group(), c = std(0xd23a2f, { roughness: 0.8 }); M(new THREE.SphereGeometry(0.115, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.1, -0.005, g).scale.set(1, 0.85, 1.1); const bill = M(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20, 1, false, 0, Math.PI), c, 0, 0.105, -0.11, g); bill.rotation.y = Math.PI; M(new THREE.SphereGeometry(0.015, 8, 6), c, 0, 0.2, 0, g); return g; },
  head_beanie: () => { const g = new THREE.Group(), c = std(0xff9f1a, { roughness: 1 }); M(new THREE.SphereGeometry(0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), c, 0, 0.08, 0, g).scale.set(1, 1.15, 1.1); M(new THREE.TorusGeometry(0.11, 0.022, 8, 24), c, 0, 0.085, 0, g).rotation.x = Math.PI / 2; M(new THREE.SphereGeometry(0.04, 10, 8), std(0xfff1d8, { roughness: 1 }), 0, 0.235, 0, g); return g; },
  head_bucket: () => { const g = new THREE.Group(), c = std(0xe9dcc0, { roughness: 1 }); M(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 20), c, 0, 0.17, 0, g); M(new THREE.CylinderGeometry(0.19, 0.2, 0.012, 24), c, 0, 0.12, 0, g); M(new THREE.CylinderGeometry(0.121, 0.121, 0.025, 20), std(0x6b5a3a), 0, 0.135, 0, g); return g; },
  head_blond: () => new THREE.Group(),
  head_cone: (A) => { const g = new THREE.Group(), tex = canvasTex('cos_cone', 64, 128, (x, w, h) => { x.fillStyle = '#ff6a00'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.fillRect(0, 40, w, 14); x.fillRect(0, 74, w, 12); }); const c = M(new THREE.ConeGeometry(0.15, 0.48, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.36, 0, g); M(B(0.32, 0.03, 0.32), std(0xff6a00), 0, 0.13, 0, g); A.push((t) => { c.rotation.z = Math.sin(t * 3) * 0.06; }); return g; },
  head_prop: (A) => { const g = HEADS.head_beanie(); g.children[0].material = new THREE.MeshStandardMaterial({ map: canvasTex('cos_propcap', 128, 64, (x, w, h) => { const c = ['#e33', '#fd0', '#3c3', '#39f']; for (let i = 0; i < 4; i++) { x.fillStyle = c[i]; x.fillRect(i * w / 4, 0, w / 4, h); } }), roughness: 0.8 }); g.children[2].visible = false; const p = new THREE.Group(); p.position.y = 0.26; g.add(p); M(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), std(0x999999), 0, -0.02, 0, p); for (const s of [1, -1]) { const b = M(B(0.22, 0.008, 0.045), glow(s > 0 ? 0xff3b3b : 0x3b8bff, 0.6), s * 0.11, 0.01, 0, p); b.rotation.x = s * 0.25; } A.push((t, ctx) => { p.rotation.y += (0.25 + (ctx?.speed || 0) * 0.06) * 1; }); return g; },
  head_afro: (A) => { const g = new THREE.Group(), tex = canvasTex('cos_afro', 256, 128, (x, w, h) => { const c = ['#ff3b3b', '#ffb23b', '#fff23b', '#3bff6a', '#3bb4ff', '#a33bff']; for (let i = 0; i < 6; i++) { x.fillStyle = c[i]; x.fillRect(0, i * h / 6, w, h / 6 + 1); } for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, 7); x.fill(); } }); const geo = new THREE.SphereGeometry(0.26, 56, 40); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = Math.sin(v.x * 60) * Math.sin(v.y * 57) * Math.sin(v.z * 63); v.multiplyScalar(1 + n * 0.05); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); const a = M(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0x222222 }), 0, 0.2, -0.04, g); A.push((t) => { a.scale.set(1 + Math.sin(t * 6) * 0.02, 1 + Math.sin(t * 6 + 1) * 0.03, 1); }); return g; },
  head_fish: (A) => { const g = new THREE.Group(); const dome = M(new THREE.SphereGeometry(0.24, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0, depthWrite: false, side: THREE.DoubleSide }), 0, 0.06, 0, g); dome.castShadow = false; const water = M(new THREE.SphereGeometry(0.235, 28, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), 0, 0.06, 0, g); water.castShadow = false; M(new THREE.TorusGeometry(0.2, 0.025, 8, 32), std(0x2a2c30, { metalness: 0.6 }), 0, -0.1, 0, g).rotation.x = Math.PI / 2; const fish = new THREE.Group(); g.add(fish); M(new THREE.SphereGeometry(0.035, 12, 10), glow(0xff8c1a, 0.6), 0, 0, 0, fish).scale.set(1.5, 1, 0.7); M(new THREE.ConeGeometry(0.028, 0.05, 4), glow(0xff8c1a, 0.6), -0.065, 0, 0, fish).rotation.z = Math.PI / 2; A.push((t) => { const a = t * 1.6; fish.position.set(Math.cos(a) * 0.18, -0.02 + Math.sin(t * 2.3) * 0.03, Math.sin(a) * 0.18); fish.rotation.y = -a - Math.PI / 2; fish.children[1].rotation.y = Math.sin(t * 16) * 0.5; }); return g; },
  head_fire: (A) => { const g = new THREE.Group(), flames = []; const ftex = canvasTex('cos_flame', 64, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.75, 4, w / 2, h * 0.6, h * 0.6); gr.addColorStop(0, 'rgba(255,255,200,1)'); gr.addColorStop(0.3, 'rgba(255,190,0,0.95)'); gr.addColorStop(0.65, 'rgba(255,60,0,0.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w / 2, 0); x.quadraticCurveTo(w, h * 0.6, w / 2, h); x.quadraticCurveTo(0, h * 0.6, w / 2, 0); x.fill(); }); for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ftex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); const a = k / 9 * Math.PI * 2; s.position.set(Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08 - 0.01); g.add(s); flames.push({ s, a, ph: Math.random() * 6 }); } const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: ftex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); core.position.y = 0.3; core.scale.set(0.3, 0.5, 1); g.add(core); const light = new THREE.PointLight(0xff7a1a, 1.2, 2.2, 2); light.position.y = 0.3; g.add(light); A.push((t) => { for (const f of flames) { const u = 0.8 + Math.sin(t * 13 + f.ph) * 0.25 + Math.sin(t * 29 + f.ph * 2) * 0.12; f.s.scale.set(0.13 * u, 0.3 * u, 1); f.s.position.y = 0.2 + 0.08 * u; } core.scale.set(0.26 + Math.sin(t * 17) * 0.04, 0.48 + Math.sin(t * 11) * 0.08, 1); light.intensity = 1 + Math.sin(t * 19) * 0.4; }); return g; },
  head_crown: (A) => { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 1, roughness: 0.2, envMap: chromeEnv(), emissive: 0x3a2800 }); const band = M(new THREE.CylinderGeometry(0.12, 0.115, 0.06, 24, 1, true), gold, 0, 0.16, 0, g); band.material.side = THREE.DoubleSide; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; M(new THREE.ConeGeometry(0.025, 0.08, 4), gold, Math.cos(a) * 0.115, 0.22, Math.sin(a) * 0.115, g); M(new THREE.OctahedronGeometry(0.015), glow([0xff2050, 0x20b0ff, 0x30ff70][k % 3], 1.5), Math.cos(a) * 0.123, 0.16, Math.sin(a) * 0.123, g); } const halo = M(new THREE.TorusGeometry(0.13, 0.012, 8, 40), glow(0xfff2a0, 2.2), 0, 0.42, 0, g); halo.rotation.x = Math.PI / 2; A.push((t) => { halo.position.y = 0.42 + Math.sin(t * 2.2) * 0.025; halo.rotation.z = t; halo.material.emissiveIntensity = 1.8 + Math.sin(t * 4) * 0.6; }); return g; },
};
const HAIR_HIDDEN = new Set(['head_afro', 'head_fire', 'head_cap', 'head_beanie', 'head_prop', 'head_bucket']); // these replace / cover the hair

// ---------------------------------------------------------------- outfits: suit + shoe materials, plus bone attachments
const OUTFITS = {
  fit_hoodie: { suit: { color: 0x7a7f87 } },
  fit_hivis: { suit: { color: 0xd8ff2a, emissive: 0x2a3300 }, map: 'stripes', mapColor: ['#d8ff2a', '#e8e8e8'] },
  fit_denim: { suit: { color: 0x3a5d94 }, map: 'denim' },
  fit_track: { suit: { color: 0xc0162c }, map: 'stripes', mapColor: ['#c0162c', '#ffffff'] },
  fit_banana: { suit: { color: 0xffe135, roughness: 0.45 }, shoes: { color: 0x5a3a12 }, extra: 'banana' },
  fit_ceo: { suit: { color: 0x15161a, roughness: 0.5 }, shoes: { color: 0x0a0a0a, roughness: 0.2 }, extra: 'cape' },
  fit_dino: { suit: { color: 0x3fbf3f, roughness: 0.35, emissive: 0x0a2a0a }, shoes: { color: 0x2a8a2a }, extra: 'dino' },
  fit_galaxy: { suit: { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }, map: 'galaxy' },
  fit_chrome: { suit: { color: 0xeef2f6, metalness: 1, roughness: 0.08, envMapIntensity: 2.2 }, shoes: { color: 0xeef2f6, metalness: 1, roughness: 0.1 }, chrome: true },
  fit_gold: { suit: { color: 0xffc83a, metalness: 1, roughness: 0.18, envMapIntensity: 2 }, shoes: { color: 0xffc83a, metalness: 1, roughness: 0.2 }, chrome: true, goldBike: true },
};
const MAPS = {
  stripes: (cols) => canvasTex('cos_str_' + cols.join(''), 128, 128, (x, w, h) => { x.fillStyle = cols[0]; x.fillRect(0, 0, w, h); x.fillStyle = cols[1]; x.fillRect(0, 50, w, 10); x.fillRect(0, 72, w, 10); }),
  denim: () => canvasTex('cos_denim', 256, 256, (x, w, h) => { x.fillStyle = '#4a6fa8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '10,20,50'},${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 1, 6); } }),
  galaxy: () => canvasTex('cos_galaxy', 512, 512, (x, w, h) => { const g = x.createRadialGradient(w * 0.4, h * 0.4, 10, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#6a2bd9'); g.addColorStop(0.4, '#2a0f6a'); g.addColorStop(1, '#05020f'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const gg = x.createRadialGradient(0, 0, 0, 0, 0, 60); const c = ['255,60,200', '60,200,255', '140,80,255'][i % 3]; gg.addColorStop(0, `rgba(${c},.35)`); gg.addColorStop(1, `rgba(${c},0)`); x.save(); x.translate(Math.random() * w, Math.random() * h); x.fillStyle = gg; x.fillRect(-60, -60, 120, 120); x.restore(); } for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; const r = Math.random() < 0.95 ? 1 : 2.5; x.fillRect(Math.random() * w, Math.random() * h, r, r); } }),
};

// ---------------------------------------------------------------- apply a loadout to the rider
export function createCosmetics(R) {
  const C = R.C, snap = new Map(), anim = { bag: [], head: [], outfit: [] }, extras = { head: [], outfit: [] };
  const meshes = []; C.model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) meshes.push(o); });
  const named = (re) => meshes.filter((o) => re.test((o.material.name + ' ' + o.name).toLowerCase()));
  const suit = named(/casualsuit/), shoes = named(/shoes/), hair = named(/short0|hair/);
  const KEYS = ['color', 'emissive', 'emissiveIntensity', 'metalness', 'roughness', 'envMapIntensity', 'map', 'envMap'];
  for (const o of [...suit, ...shoes, ...hair]) snap.set(o, Object.fromEntries(KEYS.map((k) => [k, k === 'color' || k === 'emissive' ? o.material[k].clone() : o.material[k]])));
  const restore = (o) => { const s = snap.get(o); for (const k of KEYS) { if (k === 'color' || k === 'emissive') o.material[k].copy(s[k]); else o.material[k] = s[k]; } o.material.needsUpdate = true; };
  const set = (o, p) => { for (const [k, v] of Object.entries(p)) { if (k === 'color' || k === 'emissive') o.material[k].set(v); else o.material[k] = v; } o.material.needsUpdate = true; };
  const bagDefault = [...R.bag.children];
  const bike = []; R.bike.traverse((o) => { if (o.isMesh) bike.push([o, o.material]); });
  const clear = (slot) => { for (const o of extras[slot]) o.removeFromParent(); extras[slot] = []; anim[slot] = []; };
  const attach = (slot, bone, obj, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) => { C.attach(bone, obj, pos, rot, s); extras[slot].push(obj); return obj; };
  const cur = { ...DEFAULTS };
  const api = {
    cur,
    apply(slot, id) {
      cur[slot] = id;
      if (slot === 'bag') {
        for (const c of [...R.bag.children]) c.removeFromParent(); anim.bag = [];
        if (id === 'bag_classic' || !BAGS[id]) for (const c of bagDefault) R.bag.add(c);
        else R.bag.add(BAGS[id](anim.bag));
      }
      if (slot === 'head') {
        clear('head');
        const isHelmet = id === 'head_helmet' || !HEADS[id];
        R.helm.scale.setScalar(isHelmet ? 0.88 : 1e-4); // scale, not visibility: the finale toggles helm.visible indoors
        for (const o of hair) { restore(o); o.visible = !HAIR_HIDDEN.has(id); }
        if (id === 'head_blond') for (const o of hair) set(o, { color: 0xfff1b8, emissive: 0x2a2410 });
        if (id === 'head_afro' || id === 'head_fire') for (const o of hair) o.visible = false;
        if (!isHelmet && id !== 'head_blond') attach('head', 'Head', HEADS[id](anim.head), [0, 0.0, 0.0], [-0.12, 0, 0], 1);
      }
      if (slot === 'outfit') {
        clear('outfit');
        for (const o of [...suit, ...shoes]) restore(o);
        for (const [o, m] of bike) o.material = m;
        const f = OUTFITS[id];
        if (f) {
          const env = f.chrome ? (R.root.parent?.environment || chromeEnv()) : null;
          for (const o of suit) { set(o, f.suit); if (f.map) set(o, { map: f.map === 'stripes' ? MAPS.stripes(f.mapColor) : MAPS[f.map]() }); else if (f.chrome) set(o, { map: null }); if (env) set(o, { envMap: env }); }
          if (f.shoes) for (const o of shoes) { set(o, f.shoes); if (env) set(o, { envMap: env }); }
          if (f.map === 'galaxy') anim.outfit.push((t) => { const m = suit[0]?.material.map; if (m) { m.offset.x = t * 0.02; m.offset.y = t * 0.013; } for (const o of suit) o.material.emissiveIntensity = 0.75 + Math.sin(t * 2) * 0.15; });
          if (f.goldBike) { const gm = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: 0.2, envMap: chromeEnv() }); for (const [o] of bike) o.material = gm; }
          if (f.extra === 'cape') {
            const geo = new THREE.PlaneGeometry(0.62, 0.9, 6, 8); geo.translate(0, -0.45, 0);
            const cape = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xb3121f, roughness: 0.6, side: THREE.DoubleSide })); cape.castShadow = true;
            const pivot = new THREE.Group(); pivot.add(cape); attach('outfit', 'Spine2', pivot, [0, 0.2, -0.47], [0, 0, 0], 1);
            const p0 = geo.attributes.position.array.slice();
            anim.outfit.push((t, ctx) => { const sp = Math.min(1, (ctx?.speed ?? 6) / 14); pivot.rotation.x = -0.35 - sp * 0.85 + Math.sin(t * 9) * 0.06; const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const y = -p0[i + 1]; a[i + 2] = p0[i + 2] + Math.sin(t * 10 + y * 7 + p0[i] * 4) * 0.05 * y; } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); });
          }
          if (f.extra === 'dino') {
            const g = std(0x2f9e2f, { roughness: 0.35 }), lite = std(0x9be36b, { roughness: 0.4 });
            for (const [bone, y, n] of [['Spine', 0.05, 2], ['Spine1', 0.05, 2], ['Spine2', 0.08, 3], ['Neck', 0.04, 1]]) for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.045 - k * 0.006, 0.12, 4), lite); s.castShadow = true; attach('outfit', bone, s, [0, y + k * 0.06, -0.15 - (bone === 'Spine2' ? 0.18 : 0)], [-0.9, 0, 0], 1); }
            const tail = new THREE.Group(); const segs = []; let parent = tail;
            for (let k = 0; k < 5; k++) { const seg = new THREE.Group(); seg.position.set(0, 0, k ? -0.13 : 0); const m = new THREE.Mesh(new THREE.SphereGeometry(0.11 - k * 0.018, 12, 10), g); m.scale.set(1, 1, 1.4); m.position.z = -0.07; m.castShadow = true; seg.add(m); parent.add(seg); parent = seg; segs.push(seg); }
            attach('outfit', 'Hips', tail, [0, -0.02, -0.12], [0.5, 0, 0], 1);
            anim.outfit.push((t) => segs.forEach((s, k) => { s.rotation.y = Math.sin(t * 4 - k * 0.6) * 0.18; s.rotation.x = 0.1 + Math.sin(t * 3 - k) * 0.05; }));
          }
          if (f.extra === 'banana') { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.14, 8), std(0x5a3a12)); top.castShadow = true; attach('outfit', 'Head', top, [0, 0.3, 0], [0.3, 0, 0], 1); for (let k = 0; k < 3; k++) { const peel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 3, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe135, side: THREE.DoubleSide })); attach('outfit', 'Head', peel, [Math.cos(k * 2.1) * 0.09, 0.2, Math.sin(k * 2.1) * 0.09], [Math.PI + Math.sin(k * 2.1) * 0.5, 0, Math.cos(k * 2.1) * 0.6], 1); } }
        }
      }
    },
    applyAll(eq) { for (const slot of ['bag', 'outfit', 'head']) api.apply(slot, eq[slot] || DEFAULTS[slot]); },
    tick(t, ctx) { for (const k of ['bag', 'head', 'outfit']) for (const f of anim[k]) f(t, ctx); },
  };
  return api;
}
