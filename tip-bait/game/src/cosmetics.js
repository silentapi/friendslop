// Courier cosmetics: gobbl bags, outfits and head gear, from plain colourways to deeply unwell. Everything is built
// procedurally (canvas textures + primitives) and hangs off the rider's existing rig: the bag group on Spine2, the
// suit/shoe/hair materials of the courier model, and attachments on the Head / Spine / Hips bones.
import { THREE, V, canvasTex, mat } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createBikeSkin } from './bikes.js';

// ---------------------------------------------------------------- catalogue
// every item has a rarity; the defaults are free and always owned, everything else comes out of crates
export const CATS = [['bag', 'BAGS', '🎒'], ['outfit', 'OUTFITS', '👕'], ['head', 'HEAD', '🧢'], ['bike', 'BIKES', '🚲']];
export const RARITY = {
  common: { name: 'COMMON', color: '#9aa3ad', rank: 0 },
  rare: { name: 'RARE', color: '#3b8bff', rank: 1 },
  epic: { name: 'EPIC', color: '#a23bff', rank: 2 },
  legendary: { name: 'LEGENDARY', color: '#ffb627', rank: 3 },
  mythic: { name: 'KYLE-TIER', color: '#ff2a4d', rank: 4 },
};
const I = (id, cat, r, name, desc, sw, icon = '') => ({ id, cat, r, name, desc, sw, icon, def: false });
export const ITEMS = [
  // bags
  { ...I('bag_classic', 'bag', 'common', 'gobbl Classic', 'the one they gave you. smells like fries.', 'linear-gradient(135deg,#1a1c20,#22c55e)'), def: true },
  I('bag_midnight', 'bag', 'common', 'Midnight', 'stealth delivery. purple trim.', 'linear-gradient(135deg,#0d0b1a,#7c4dff)'),
  I('bag_sunset', 'bag', 'common', 'Sunset', 'orange → pink. very instagrammable.', 'linear-gradient(135deg,#ff7a18,#ff3d8b)'),
  I('bag_camo', 'bag', 'rare', 'Urban Camo', 'blend into the LYNX stop.', 'linear-gradient(135deg,#4b5320,#8a8f6a)'),
  I('bag_pizza', 'bag', 'rare', 'Pizza Tower', 'a leaning stack of glowing pizza boxes. steam included.', 'linear-gradient(135deg,#ffb347,#d2371f)', '🍕'),
  I('bag_coffee', 'bag', 'epic', 'Venti Supreme', 'a giant iced coffee. the ice rattles. Kyle would be proud. (he would not.)', 'linear-gradient(180deg,#f3e3c8,#8a5a2b)', '🧋'),
  I('bag_fridge', 'bag', 'epic', 'Literal Fridge', 'a whole fridge. door ajar. the light is on.', 'linear-gradient(135deg,#e8eef2,#9fb3c4)', '🧊'),
  I('bag_tank', 'bag', 'epic', 'Goldfish Tank', 'his name is Kyle Jr. he swims.', 'linear-gradient(135deg,#4fc3f7,#ff9800)', '🐠'),
  I('bag_hotdog', 'bag', 'epic', 'Hot Dog Cart', 'a whole cart with an umbrella. the dog spins.', 'linear-gradient(135deg,#ffd23b,#e8452c)', '🌭'),
  I('bag_disco', 'bag', 'legendary', 'Disco Inferno', 'a spinning mirror ball. deliveries are a party now.', 'conic-gradient(#fff,#9ad,#fff,#d9f,#fff)', '🪩'),
  I('bag_citi', 'bag', 'legendary', 'Mini Citi Tower', 'floor 20 included. elevator still broken.', 'linear-gradient(180deg,#9fd0ff,#2a4a6a)', '🏢'),
  I('bag_ufo', 'bag', 'legendary', 'UFO Escort', 'a tiny saucer guards your order. tractor beam on.', 'radial-gradient(#b6ff8a,#1d3b2a)', '🛸'),
  I('bag_reactor', 'bag', 'mythic', 'Pocket Reactor', 'keeps the coffee cold via nuclear science. do not lick.', 'radial-gradient(#9dff00,#1a2a06)', '☢️'),
  I('bag_kyle', 'bag', 'mythic', 'Kyle Balloon', 'a giant Kyle-face balloon on a string. he watches. always.', 'radial-gradient(#ffd7b0,#c0392b)', '🎈'),
  // outfits
  { ...I('fit_classic', 'outfit', 'common', 'gobbl Green', 'company issue. 100% polyester.', 'linear-gradient(135deg,#2b3a2f,#3d5444)'), def: true },
  I('fit_hoodie', 'outfit', 'common', 'Grey Hoodie', 'the universal courier uniform.', 'linear-gradient(135deg,#6b6f76,#9aa0a8)'),
  I('fit_hivis', 'outfit', 'common', 'Hi-Vis', 'cars still won’t see you.', 'linear-gradient(135deg,#d8ff2a,#ff8a00)'),
  I('fit_denim', 'outfit', 'common', 'Double Denim', 'canadian tuxedo. bold.', 'linear-gradient(135deg,#2c4a7a,#5b7fb8)'),
  I('fit_track', 'outfit', 'rare', 'Track Suit', 'three stripes. zero affiliation.', 'repeating-linear-gradient(90deg,#c0162c 0 18px,#fff 18px 22px)'),
  I('fit_banana', 'outfit', 'rare', 'Banana', 'potassium-forward fashion.', 'linear-gradient(135deg,#ffe135,#c9a400)', '🍌'),
  I('fit_disney', 'outfit', 'rare', 'Disney Adult', 'mouse ears, fanny pack, a lanyard of pins. it’s their 40th visit this year.', 'linear-gradient(135deg,#1d2f6b,#e8352c)', '🐭'),
  I('fit_hotdog', 'outfit', 'epic', 'Hot Dog', 'you are the meal now.', 'linear-gradient(135deg,#e8a04a,#c0392b)', '🌭'),
  I('fit_ceo', 'outfit', 'epic', 'CEO of Delivery', 'black suit. red cape. flaps dramatically.', 'linear-gradient(135deg,#0c0c0f,#b3121f)', '🦸'),
  I('fit_dino', 'outfit', 'epic', 'Inflatable T-Rex', 'spikes. tail. tiny arms (emotionally).', 'linear-gradient(135deg,#3fbf3f,#1a6b1a)', '🦖'),
  I('fit_astro', 'outfit', 'legendary', 'Astronaut', 'NASA-grade delivery. one small step for Kyle.', 'linear-gradient(135deg,#f4f6f8,#9aa6b2)', '🧑‍🚀'),
  I('fit_knight', 'outfit', 'legendary', 'Knight Armour', 'full plate. clanks on every pedal stroke.', 'linear-gradient(135deg,#d8dde3,#59606a)', '🛡️'),
  I('fit_galaxy', 'outfit', 'legendary', 'Galaxy Brain', 'a moving starfield. you are the universe delivering coffee.', 'radial-gradient(#7c4dff,#0a0420)', '🌌'),
  I('fit_chrome', 'outfit', 'legendary', 'Liquid Chrome', 'reflects the city. and Kyle’s disappointment.', 'linear-gradient(135deg,#f4f6f8,#7d8794,#f4f6f8)', '🪞'),
  I('fit_mascot', 'outfit', 'mythic', 'Gobbl Gator', 'the full mascot suit. huge foam head. you cannot see. you deliver anyway.', 'linear-gradient(135deg,#2ee66f,#0c5a2c)', '🐊'),
  I('fit_gold', 'outfit', 'mythic', 'Solid Gold', 'head-to-toe 24k. gold bike. still no tip.', 'linear-gradient(135deg,#fff3a0,#c8961e,#fff3a0)', '👑'),
  // head
  { ...I('head_helmet', 'head', 'common', 'gobbl Helmet', 'safety first. style… eventually.', 'linear-gradient(135deg,#16181d,#2ee66f)'), def: true },
  I('head_cap', 'head', 'common', 'Backwards Cap', 'skater energy.', 'linear-gradient(135deg,#d23a2f,#7a1a14)'),
  I('head_beanie', 'head', 'common', 'Beanie', 'it’s 88°F in Orlando. don’t care.', 'linear-gradient(135deg,#ff9f1a,#b35c00)'),
  I('head_bucket', 'head', 'common', 'Bucket Hat', 'festival courier.', 'linear-gradient(135deg,#e9dcc0,#a88f62)'),
  I('head_blond', 'head', 'rare', 'Bleached', 'no helmet. new you. platinum.', 'linear-gradient(135deg,#fff6c8,#e0c56a)'),
  I('head_cone', 'head', 'rare', 'Traffic Cone', 'found it on Orange Ave. it’s yours now.', 'repeating-linear-gradient(0deg,#ff6a00 0 14px,#fff 14px 20px)', '🚧'),
  I('head_cup', 'head', 'rare', 'Iced Coffee Hat', 'a venti on your head. straw included.', 'linear-gradient(180deg,#f3e3c8,#8a5a2b)', '🧋'),
  I('head_prop', 'head', 'epic', 'Propeller Beanie', 'spins faster the faster you ride.', 'conic-gradient(#e33,#fd0,#3c3,#39f,#e33)', '🧢'),
  I('head_afro', 'head', 'epic', 'Rainbow Afro', 'volume. so much volume.', 'conic-gradient(#ff3b3b,#ffb23b,#fff23b,#3bff6a,#3bb4ff,#a33bff,#ff3b3b)', '🌈'),
  I('head_coins', 'head', 'epic', 'Coin Orbit', 'a ring of tip-coins circling your head. a reminder of what could’ve been.', 'radial-gradient(#ffe066,#b8860b)', '🪙'),
  I('head_fish', 'head', 'legendary', 'Fishbowl', 'a glass dome. a goldfish. breathing optional.', 'radial-gradient(#bdf0ff,#2a8fb8)', '🐟'),
  I('head_angel', 'head', 'legendary', 'Angel / Devil', 'halo on top, horns underneath. depends on the tip.', 'linear-gradient(135deg,#fff7c2,#c0122a)', '😇'),
  I('head_fire', 'head', 'legendary', 'Hair on Fire', 'Kyle is late? no. YOU are late. permanently on fire.', 'linear-gradient(0deg,#ff2a00,#ffd000)', '🔥'),
  I('head_kyle', 'head', 'mythic', 'Kyle Mask', 'wear his face. become the problem.', 'radial-gradient(#ffd7b0,#7a4a2a)', '🎭'),
  I('head_crown', 'head', 'mythic', 'Delivery King', 'jewelled crown + floating halo. bow, Kyle.', 'linear-gradient(135deg,#ffe066,#b8860b)', '👑'),
  // ---- Season 1 battle pass exclusives (bp: never in crates)
  { ...I('bag_meter', 'bag', 'rare', 'Expired Meter', 'a parking meter on your back. it is always expired.', 'linear-gradient(135deg,#9aa3ad,#ff3b30)', '🅿️'), bp: true },
  { ...I('bag_signal', 'bag', 'epic', 'Rush Hour Signal', 'a working traffic light. red means Kyle is waiting.', 'linear-gradient(180deg,#ff3b30,#ffd23b,#2ee66f)', '🚦'), bp: true },
  { ...I('fit_reflect', 'outfit', 'rare', 'Night Shift', 'navy kit with stripes that glow in the headlights.', 'repeating-linear-gradient(0deg,#1d2433 0 16px,#e8f6ff 16px 20px)', '🌙'), bp: true },
  { ...I('fit_racer', 'outfit', 'legendary', 'Rush Hour Racer', 'season racing leathers. sponsored by nobody.', 'linear-gradient(135deg,#ffffff,#ff6a00 55%,#111 56%)', '🏁'), bp: true },
  { ...I('head_hardhat', 'head', 'rare', 'Site Boss', 'hard hat with a spinning amber beacon. works on cranes, too.', 'linear-gradient(135deg,#ffd23b,#e8a400)', '👷'), bp: true },
  { ...I('head_visor', 'head', 'epic', 'LED Visor', 'your helmet now scrolls LATE ▸ LATE ▸ LATE.', 'linear-gradient(135deg,#16181d,#ff2a4d)', '📟'), bp: true },
  // ---- bikes (battle pass premium only)
  { ...I('bike_classic', 'bike', 'common', 'gobbl Cruiser', 'the company bike. squeaks.', 'linear-gradient(135deg,#8a1418,#e8e8e8)', '🚲'), def: true },
  { ...I('bike_fixie', 'bike', 'rare', 'Matte Fixie', 'murdered-out single speed. no brakes (emotionally).', 'linear-gradient(135deg,#0c0c0e,#3a3d44)', '🚲'), bp: true },
  { ...I('bike_bmx', 'bike', 'rare', 'Neon BMX', 'pegs, glow rims, zero chill.', 'linear-gradient(135deg,#39ff6a,#ff3bd4)', '🛹'), bp: true },
  { ...I('bike_cargo', 'bike', 'epic', 'Cargo Hauler', 'a front crate for the big orders. and drinks.', 'linear-gradient(135deg,#2e6b4a,#b98a52)', '📦'), bp: true },
  { ...I('bike_patrol', 'bike', 'epic', 'Night Patrol', 'light bar on the back. it does nothing. people move anyway.', 'linear-gradient(90deg,#ff1a2a 0 50%,#1a5cff 50%)', '🚨'), bp: true },
  { ...I('bike_tandem', 'bike', 'epic', 'Tandem for Two', 'a cardboard Kyle rides on the back. he still won’t pedal.', 'linear-gradient(135deg,#ff9f1a,#c8a070)', '👥'), bp: true },
  { ...I('bike_ebike', 'bike', 'legendary', 'Volt Courier', 'hub motors, a headlight beam and a battery that never quite fills.', 'linear-gradient(135deg,#26313c,#46ff8f)', '⚡'), bp: true },
  { ...I('bike_synth', 'bike', 'legendary', 'Synthwave', 'chrome, neon tubes and light trails. it’s 1986 on Orange Ave.', 'linear-gradient(135deg,#ff2bd6,#3bf6ff)', '🌆'), bp: true },
  { ...I('bike_chopper', 'bike', 'mythic', 'The Tip Collector', 'gold-chrome chopper. flame tank. exhaust flames. light trails. Season 1’s final reward.', 'linear-gradient(135deg,#fff3a0,#c8961e 45%,#ff6a00)', '🔥'), bp: true },
];
export const DEFAULTS = { bag: 'bag_classic', outfit: 'fit_classic', head: 'head_helmet', bike: 'bike_classic' };
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

// Kyle, as drawn by someone who has delivered to him too many times
const kyleFace = () => canvasTex('cos_kyle', 256, 256, (x, w, h) => {
  x.fillStyle = '#7a4a2e'; x.fillRect(0, 0, w, h);
  const g = x.createRadialGradient(w / 2, h * 0.52, 20, w / 2, h * 0.52, 130); g.addColorStop(0, '#8d5a38'); g.addColorStop(1, '#5e3620'); x.fillStyle = g; x.beginPath(); x.ellipse(w / 2, h * 0.54, 92, 112, 0, 0, 7); x.fill();
  x.strokeStyle = '#1a0f0a'; x.lineWidth = 9; x.lineCap = 'round'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(52 + i * 19, 40); x.quadraticCurveTo(48 + i * 19, 18, 58 + i * 18, 2); x.stroke(); } // braids
  x.lineWidth = 7; x.beginPath(); x.moveTo(70, 108); x.lineTo(112, 116); x.moveTo(186, 104); x.lineTo(146, 114); x.stroke(); // one eyebrow up: unimpressed
  x.fillStyle = '#fff'; for (const ex of [92, 164]) { x.beginPath(); x.ellipse(ex, 134, 17, 8, 0, 0, 7); x.fill(); }
  x.fillStyle = '#1a0f0a'; for (const ex of [96, 168]) { x.beginPath(); x.arc(ex, 135, 6, 0, 7); x.fill(); } x.fillStyle = '#5e3620'; x.fillRect(70, 120, 120, 9); // half-lidded
  x.strokeStyle = '#3a1f12'; x.lineWidth = 6; x.beginPath(); x.moveTo(98, 196); x.quadraticCurveTo(140, 206, 170, 186); x.stroke(); // smirk
  x.fillStyle = '#fff'; for (const ax of [32, 224]) { x.beginPath(); x.ellipse(ax, 150, 7, 12, 0, 0, 7); x.fill(); } // airpods
});
function icedCoffee(A, scale = 1) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  M(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 24), std(0xe6d4b8, { roughness: 0.4 }), 0, 0.18, 0, g);
  M(new THREE.CylinderGeometry(0.22, 0.2, 0.2, 24), std(0xa86a38, { roughness: 0.3 }), 0, 0.46, 0, g);
  M(new THREE.CylinderGeometry(0.235, 0.22, 0.1, 24), std(0x6b3a1c, { roughness: 0.3 }), 0, 0.61, 0, g);
  const ice = []; for (let k = 0; k < 7; k++) { const c = M(B(0.09, 0.09, 0.09), new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, roughness: 0.05, transparent: true, opacity: 0.75 }), Math.cos(k * 0.9) * 0.12, 0.52 + (k % 3) * 0.05, Math.sin(k * 0.9) * 0.12, g); c.rotation.set(k, k * 2, 0); ice.push(c); }
  const cup = M(new THREE.CylinderGeometry(0.25, 0.16, 0.74, 28, 1, true), shell, 0, 0.37, 0, g); cup.castShadow = false;
  M(new THREE.SphereGeometry(0.25, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.74, 0, g).scale.y = 0.4;
  const band = M(new THREE.CylinderGeometry(0.218, 0.2, 0.16, 28, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex('cos_sleeve', 256, 64, (x, w, h) => { x.fillStyle = '#22c55e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 40px system-ui'; x.textAlign = 'center'; x.fillText('gobbl · gobbl', w / 2, 46); }), roughness: 0.6 }), 0, 0.3, 0, g); void band;
  const straw = M(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), std(0x1e7a3e), 0.05, 0.9, 0, g); straw.rotation.z = 0.18;
  A?.push((t) => ice.forEach((c, k) => { c.position.y = 0.52 + (k % 3) * 0.05 + Math.abs(Math.sin(t * 9 + k)) * 0.012; c.rotation.y += 0.01; }));
  return g;
}
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
    const g = new THREE.Group(), white = std(0xdfe5ec, { roughness: 0.28, metalness: 0.1 }), steel = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.2, envMap: chromeEnv() }), seam = std(0x9aa3ad, { roughness: 0.5 });
    g.scale.setScalar(0.62); g.position.y = -0.1; g.rotation.x = 0.55; // upright against his riding lean
    M(new RoundedBoxGeometry(0.62, 1.1, 0.5, 3, 0.04), white, 0, 0.28, 0.12, g);
    M(B(0.56, 1.0, 0.02), glow(0xe8f6ff, 1.2), 0, 0.28, 0.375, g);
    for (const [y, c] of [[0.05, 0xff3b30], [0.32, 0x2ecc71], [0.58, 0xffd60a]]) M(B(0.1, 0.16, 0.1), std(c), 0.12 - y * 0.3, y, 0.3, g); // snacks on the shelves
    M(B(0.56, 0.015, 0.4), glow(0xffffff, 0.3), 0, 0.2, 0.18, g); M(B(0.56, 0.015, 0.4), glow(0xffffff, 0.3), 0, 0.47, 0.18, g);
    for (const x of [-0.24, 0.24]) M(B(0.08, 0.05, 0.42), std(0x2a2c30), x, -0.29, 0.12, g); // little feet
    const door = new THREE.Group(); door.position.set(0.31, 0, 0.37); g.add(door);
    M(new RoundedBoxGeometry(0.62, 1.1, 0.06, 3, 0.025), white, -0.31, 0.28, 0.0, door);
    M(B(0.6, 0.012, 0.064), seam, -0.31, 0.62, 0.0, door); // freezer / fridge split
    for (const [y, hgt] of [[0.74, 0.16], [0.36, 0.34]]) { M(B(0.035, hgt, 0.035), steel, -0.55, y, 0.05, door); for (const dy of [-hgt / 2, hgt / 2]) M(B(0.035, 0.02, 0.05), steel, -0.55, y + dy, 0.025, door); }
    // the door: magnets, a gobbl sticker, a takeout menu and Kyle's grocery list
    const face = canvasTex('cos_fridgedoor', 256, 448, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#f7f9fb'); gr.addColorStop(1, '#e3e8ee'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = '#22c55e'; x.beginPath(); x.roundRect(22, 24, 212, 92, 18); x.fill(); x.fillStyle = '#fff'; x.font = '900 58px system-ui'; x.textAlign = 'center'; x.fillText('gobbl', 128, 90);
      x.save(); x.translate(70, 250); x.rotate(-0.08); x.fillStyle = '#fffbe0'; x.fillRect(-46, -70, 92, 130); x.fillStyle = '#c0392b'; x.font = '800 13px system-ui'; x.textAlign = 'left'; ['KYLE LIST', '- oat milk', '- ice (lots)', '- tip $0', '- complain'].forEach((l, k) => x.fillText(l, -40, -48 + k * 22)); x.restore();
      x.save(); x.translate(186, 230); x.rotate(0.06); x.fillStyle = '#ff6b4a'; x.fillRect(-40, -56, 80, 112); x.fillStyle = '#fff'; x.font = '900 18px system-ui'; x.textAlign = 'center'; x.fillText('PIZZA', 0, -18); x.font = '700 12px system-ui'; x.fillText('407-555', 0, 4); x.fillText('0199', 0, 20); x.restore();
      [['#ffd23b', 60, 170], ['#3b8bff', 196, 158], ['#ff3bd4', 200, 352], ['#2ecc71', 56, 362], ['#ff3b30', 128, 412]].forEach(([c, mx, my]) => { x.fillStyle = c; x.beginPath(); x.arc(mx, my, 22, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(mx - 4, my - 4, 4, 0, 7); x.fill(); });
      x.fillStyle = '#3a3f46'; x.font = '900 16px system-ui'; x.textAlign = 'center'; x.fillText('★ ICE MAKER ★', 128, 132);
    });
    M(new THREE.PlaneGeometry(0.58, 1.02), new THREE.MeshStandardMaterial({ map: face, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), -0.31, 0.28, 0.05, door); // stands proud of the door so it never z-fights at a distance
    A.push((t) => { door.rotation.y = -0.18 - Math.max(0, Math.sin(t * 1.6)) * 0.35; }); // swings ajar, the light flickers out
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
    const ufo = new THREE.Group(); ufo.scale.setScalar(1.6); g.add(ufo);
    M(new THREE.SphereGeometry(0.22, 32, 12), new THREE.MeshStandardMaterial({ color: 0xc8d2da, metalness: 0.9, roughness: 0.22, envMap: chromeEnv() }), 0, 0, 0, ufo).scale.set(1, 0.3, 1);
    const rim = M(new THREE.TorusGeometry(0.215, 0.018, 8, 40), glow(0x7dff6a, 2.2), 0, 0, 0, ufo); rim.rotation.x = Math.PI / 2;
    M(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9dffb0, emissive: 0x2a8a3a, emissiveIntensity: 0.8, transparent: true, opacity: 0.75, roughness: 0.05 }), 0, 0.035, 0, ufo);
    const alien = M(new THREE.SphereGeometry(0.035, 10, 8), glow(0x7dff6a, 0.6), 0, 0.075, 0, ufo); alien.scale.set(1, 1.3, 1);
    const lights = []; for (let k = 0; k < 10; k++) { const l = M(new THREE.SphereGeometry(0.022, 8, 6), glow(0xffd23b, 2), Math.cos(k / 10 * Math.PI * 2) * 0.2, -0.03, Math.sin(k / 10 * Math.PI * 2) * 0.2, ufo); lights.push(l); }
    const beam = M(new THREE.ConeGeometry(0.24, 0.62, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xb6ff8a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0, -0.33, 0, ufo); beam.castShadow = false;
    A.push((t) => { ufo.position.set(0.18 + Math.sin(t * 0.9) * 0.08, 0.86 + Math.sin(t * 2.2) * 0.05, 0.22); ufo.rotation.y = t * 3; ufo.rotation.z = Math.sin(t * 1.4) * 0.12; lights.forEach((l, k) => { l.material.emissiveIntensity = (Math.floor(t * 10) + k) % 4 ? 0.4 : 3.5; }); rim.material.emissiveIntensity = 1.8 + Math.sin(t * 5) * 0.6; beam.material.opacity = 0.22 + Math.sin(t * 6) * 0.08; });
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
  bag_coffee: (A) => { const g = new THREE.Group(), c = icedCoffee(A, 0.66); c.position.set(0, -0.24, 0.12); g.add(c); return g; },
  bag_hotdog: (A) => {
    const g = new THREE.Group(), stripes = new THREE.MeshStandardMaterial({ map: canvasTex('cos_cart', 256, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff' : '#e8452c'; x.fillRect(i * 32, 0, 32, h); } x.fillStyle = '#ffd23b'; x.fillRect(0, h * 0.62, w, h * 0.38); x.fillStyle = '#c0392b'; x.font = '900 34px system-ui'; x.textAlign = 'center'; x.fillText('DOGS $3', w / 2, h * 0.9); }), roughness: 0.6 });
    M(B(0.62, 0.42, 0.4), stripes, 0, -0.02, 0.14, g); M(B(0.66, 0.03, 0.44), std(0xb8bec6, { metalness: 0.8, roughness: 0.3 }), 0, 0.2, 0.14, g);
    for (const x of [-0.24, 0.24]) { const w = M(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), std(0x222222), x, -0.24, 0.34, g); w.rotation.x = Math.PI / 2; }
    M(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6), std(0xcccccc), -0.2, 0.42, 0.1, g);
    const umb = M(new THREE.ConeGeometry(0.42, 0.2, 12, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex('cos_umb', 256, 32, (x, w) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#ffd23b' : '#e8452c'; x.fillRect(i * w / 12, 0, w / 12, 32); } }), side: THREE.DoubleSide, roughness: 0.7 }), -0.2, 0.66, 0.1, g); void umb;
    const dog = new THREE.Group(); dog.position.set(0.1, 0.34, 0.14); g.add(dog);
    M(new THREE.CapsuleGeometry(0.06, 0.3, 6, 12), std(0xe8b06a, { roughness: 0.8 }), 0, 0, 0, dog).rotation.z = Math.PI / 2;
    M(new THREE.CapsuleGeometry(0.035, 0.36, 6, 12), std(0xb5442c, { roughness: 0.4 }), 0, 0.05, 0, dog).rotation.z = Math.PI / 2;
    const mus = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => V(-0.17 + k * 0.042, 0.088, (k % 2 ? 0.02 : -0.02)))); M(new THREE.TubeGeometry(mus, 24, 0.008, 5), glow(0xffd400, 0.4), 0, 0, 0, dog);
    A.push((t) => { dog.rotation.y = t * 1.6; dog.position.y = 0.36 + Math.sin(t * 3) * 0.02; });
    return g;
  },
  bag_citi: (A) => { // Citi Tower in miniature: lit window grid, setback crown with uplights, a spire and a beacon
    const g = new THREE.Group(); g.scale.setScalar(0.66); g.position.y = -0.06; g.rotation.x = 0.55; /* upright against his riding lean */
    const win = canvasTex('cos_citi', 128, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#24496f'); gr.addColorStop(1, '#122438'); x.fillStyle = gr; x.fillRect(0, 0, w, h); for (let j = 6; j < h - 6; j += 12) for (let i = 5; i < w - 5; i += 10) { const r = Math.random(); x.fillStyle = r < 0.45 ? '#ffe7a8' : r < 0.6 ? '#bfe4ff' : '#2c4866'; x.fillRect(i, j, 7, 8); } x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < w; i += 20) x.fillRect(i, 0, 2, h); });
    const tm = new THREE.MeshStandardMaterial({ map: win, color: 0x3d5c80, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.35 });
    const stone = std(0x9a948a, { roughness: 0.6 }), crownM = glow(0x6fc4ff, 1.6);
    M(new RoundedBoxGeometry(0.46, 0.18, 0.38, 2, 0.03), stone, 0, -0.13, 0.14, g);
    M(B(0.34, 1.1, 0.28), tm, 0, 0.5, 0.14, g);
    for (const sx of [-1, 1]) M(B(0.03, 1.1, 0.3), stone, sx * 0.172, 0.5, 0.14, g); // corner fins
    M(B(0.28, 0.2, 0.23), tm, 0, 1.15, 0.14, g); M(B(0.22, 0.16, 0.18), tm, 0, 1.33, 0.14, g); // setbacks
    for (const [y, w2] of [[1.06, 0.36], [1.26, 0.3], [1.42, 0.24]]) M(B(w2, 0.02, w2 * 0.85), crownM, 0, y, 0.14, g); // uplit crown bands
    M(new THREE.ConeGeometry(0.12, 0.18, 4), std(0x9fb4c8, { metalness: 0.7, roughness: 0.3 }), 0, 1.5, 0.14, g).rotation.y = Math.PI / 4;
    M(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 6), std(0xdddddd, { metalness: 0.8 }), 0, 1.72, 0.14, g);
    const tip = M(new THREE.SphereGeometry(0.03, 8, 6), glow(0xff2020, 3), 0, 1.88, 0.14, g);
    const sign = canvasTex('cos_citisign', 128, 32, (x, w, h) => { x.fillStyle = '#0a1a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#9fd0ff'; x.font = '900 24px system-ui'; x.textAlign = 'center'; x.fillText('CITI · 20', w / 2, 24); });
    for (const z of [0.285, -0.005]) { const p = M(new THREE.PlaneGeometry(0.24, 0.06), new THREE.MeshBasicMaterial({ map: sign }), 0, -0.13, z + (z > 0 ? 0.04 : -0.05), g); if (z < 0.1) p.rotation.y = Math.PI; }
    A.push((t) => { tip.visible = Math.floor(t * 1.5) % 2 === 0; crownM.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.3; });
    return g;
  },
  bag_kyle: (A) => {
    const g = BAGS.bag_midnight(); const bal = new THREE.Group(); g.add(bal);
    const head = M(new THREE.SphereGeometry(0.33, 32, 24), new THREE.MeshStandardMaterial({ map: kyleFace(), roughness: 0.35, metalness: 0.05 }), 0, 0, 0, bal); head.scale.set(0.92, 1.08, 0.86); head.rotation.y = Math.PI; // face looks back at the camera
    M(new THREE.ConeGeometry(0.04, 0.06, 8), std(0x7a4a2e), 0, -0.37, 0, bal).rotation.x = Math.PI;
    const shine = M(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), -0.13, 0.17, 0.2, bal); shine.castShadow = false;
    const str = M(new THREE.CylinderGeometry(0.008, 0.008, 1, 5), glow(0xffffff, 0.6), 0, 0, 0, g); str.castShadow = false;
    A.push((t) => { const p = V(0.5 + Math.sin(t * 0.8) * 0.06, 0.95 + Math.sin(t * 1.7) * 0.05, 0.34 + Math.cos(t * 0.6) * 0.05); /* floats off his right shoulder, out of the over-the-shoulder cameras */ bal.position.copy(p); bal.rotation.z = Math.sin(t * 0.9) * 0.15; const a = V(0, 0.22, 0.12), d = p.clone().add(V(0, -0.4, 0)).sub(a); str.position.copy(a).addScaledVector(d, 0.5); str.scale.y = d.length(); str.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); });
    return g;
  },
  bag_meter: (A) => {
    const g = gobblBox('meter', 0x2a2c30, bagFace('meter', logoFace('#1d2026', '#cfd6dc', 'PAY TO PARK')));
    const steel = std(0x9aa3ad, { metalness: 0.7, roughness: 0.35 });
    M(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10), steel, 0, 0.36, 0.05, g);
    const head = M(new RoundedBoxGeometry(0.2, 0.26, 0.16, 3, 0.04), steel, 0, 0.62, 0.05, g); void head;
    const win = M(new THREE.PlaneGeometry(0.14, 0.08), new THREE.MeshBasicMaterial({ map: canvasTex('cos_meterwin', 128, 64, (x, w, h) => { x.fillStyle = '#2a0a0a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff3b30'; x.font = '900 26px system-ui'; x.textAlign = 'center'; x.fillText('EXPIRED', w / 2, 42); }) }), 0, 0.66, 0.135, g);
    A.push((t) => { win.visible = Math.floor(t * 2.2) % 2 === 0; });
    return g;
  },
  bag_signal: (A) => {
    const g = gobblBox('signal', 0x1a1c20, bagFace('signal', logoFace('#101418', '#ffd23b', 'RUSH HOUR · S1')));
    const housing = std(0x1d2a1f, { roughness: 0.5 }); M(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), std(0x555555, { metalness: 0.7 }), 0, 0.32, 0.05, g);
    M(new RoundedBoxGeometry(0.15, 0.44, 0.14, 3, 0.03), housing, 0, 0.62, 0.05, g);
    const L = [0xff3b30, 0xffd23b, 0x2ee66f].map((c, k) => { const l = M(new THREE.CircleGeometry(0.045, 20), glow(c, 0.2), 0, 0.76 - k * 0.135, 0.122, g); M(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16, 1, true, -Math.PI / 2, Math.PI), housing, 0, 0.79 - k * 0.135, 0.13, g).rotation.x = Math.PI / 2; return l; });
    A.push((t) => { const ph = Math.floor(t / 1.2) % 3; L.forEach((l, k) => { l.material.emissiveIntensity = (2 - ph === k) ? 3 : 0.12; }); });
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
  head_prop: (A) => { const g = HEADS.head_beanie(); g.children[0].material = new THREE.MeshStandardMaterial({ map: canvasTex('cos_propcap', 128, 64, (x, w, h) => { const c = ['#e33', '#fd0', '#3c3', '#39f']; for (let i = 0; i < 4; i++) { x.fillStyle = c[i]; x.fillRect(i * w / 4, 0, w / 4, h); } }), roughness: 0.8 }); g.children[2].visible = false; const p = new THREE.Group(); p.position.y = 0.26; g.add(p); M(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), std(0x999999), 0, -0.02, 0, p); for (const s of [1, -1]) { const b = M(B(0.22, 0.008, 0.045), glow(s > 0 ? 0xff3b3b : 0x3b8bff, 0.6), s * 0.11, 0.01, 0, p); b.rotation.x = s * 0.25; } const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; p.add(disc); let lt = null;
    A.push((t, ctx) => { const dt = lt == null ? 0 : Math.min(0.1, Math.max(0, t - lt)); lt = t; const w = 5 + (ctx?.speed || 0) * 1.9; p.rotation.y += w * dt; const blur = Math.min(1, Math.max(0, (w - 14) / 18)); disc.material.opacity = blur * 0.35; for (const c of p.children) if (c !== disc && c.material?.transparent !== undefined && c.geometry?.type === 'BoxGeometry') { c.material.transparent = true; c.material.opacity = 1 - blur * 0.55; } }); return g; },
  head_afro: (A) => { const g = new THREE.Group(), tex = canvasTex('cos_afro', 256, 128, (x, w, h) => { const c = ['#ff3b3b', '#ffb23b', '#fff23b', '#3bff6a', '#3bb4ff', '#a33bff']; for (let i = 0; i < 6; i++) { x.fillStyle = c[i]; x.fillRect(0, i * h / 6, w, h / 6 + 1); } for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, 7); x.fill(); } }); const geo = new THREE.SphereGeometry(0.26, 56, 40); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = Math.sin(v.x * 60) * Math.sin(v.y * 57) * Math.sin(v.z * 63); v.multiplyScalar(1 + n * 0.05); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); const a = M(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0x222222 }), 0, 0.2, -0.04, g); A.push((t) => { a.scale.set(1 + Math.sin(t * 6) * 0.02, 1 + Math.sin(t * 6 + 1) * 0.03, 1); }); return g; },
  head_fish: (A) => { const g = new THREE.Group(); const dome = M(new THREE.SphereGeometry(0.24, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0, depthWrite: false, side: THREE.DoubleSide }), 0, 0.06, 0, g); dome.castShadow = false; const water = M(new THREE.SphereGeometry(0.235, 28, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), 0, 0.06, 0, g); water.castShadow = false; M(new THREE.TorusGeometry(0.2, 0.025, 8, 32), std(0x2a2c30, { metalness: 0.6 }), 0, -0.1, 0, g).rotation.x = Math.PI / 2; const fish = new THREE.Group(); g.add(fish); M(new THREE.SphereGeometry(0.035, 12, 10), glow(0xff8c1a, 0.6), 0, 0, 0, fish).scale.set(1.5, 1, 0.7); M(new THREE.ConeGeometry(0.028, 0.05, 4), glow(0xff8c1a, 0.6), -0.065, 0, 0, fish).rotation.z = Math.PI / 2; A.push((t) => { const a = t * 1.6; fish.position.set(Math.cos(a) * 0.18, -0.02 + Math.sin(t * 2.3) * 0.03, Math.sin(a) * 0.18); fish.rotation.y = -a - Math.PI / 2; fish.children[1].rotation.y = Math.sin(t * 16) * 0.5; }); return g; },
  head_fire: (A) => { const g = new THREE.Group(), flames = []; const ftex = canvasTex('cos_flame', 64, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.75, 4, w / 2, h * 0.6, h * 0.6); gr.addColorStop(0, 'rgba(255,255,200,1)'); gr.addColorStop(0.3, 'rgba(255,190,0,0.95)'); gr.addColorStop(0.65, 'rgba(255,60,0,0.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w / 2, 0); x.quadraticCurveTo(w, h * 0.6, w / 2, h); x.quadraticCurveTo(0, h * 0.6, w / 2, 0); x.fill(); }); for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ftex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); const a = k / 9 * Math.PI * 2; s.position.set(Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08 - 0.01); g.add(s); flames.push({ s, a, ph: Math.random() * 6 }); } const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: ftex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); core.position.y = 0.3; core.scale.set(0.3, 0.5, 1); g.add(core); const light = new THREE.PointLight(0xff7a1a, 1.2, 2.2, 2); light.position.y = 0.3; g.add(light); A.push((t) => { for (const f of flames) { const u = 0.8 + Math.sin(t * 13 + f.ph) * 0.25 + Math.sin(t * 29 + f.ph * 2) * 0.12; f.s.scale.set(0.13 * u, 0.3 * u, 1); f.s.position.y = 0.2 + 0.08 * u; } core.scale.set(0.26 + Math.sin(t * 17) * 0.04, 0.48 + Math.sin(t * 11) * 0.08, 1); light.intensity = 1 + Math.sin(t * 19) * 0.4; }); return g; },
  head_crown: (A) => { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 1, roughness: 0.2, envMap: chromeEnv(), emissive: 0x3a2800 }); const band = M(new THREE.CylinderGeometry(0.12, 0.115, 0.06, 24, 1, true), gold, 0, 0.16, 0, g); band.material.side = THREE.DoubleSide; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; M(new THREE.ConeGeometry(0.025, 0.08, 4), gold, Math.cos(a) * 0.115, 0.22, Math.sin(a) * 0.115, g); M(new THREE.OctahedronGeometry(0.015), glow([0xff2050, 0x20b0ff, 0x30ff70][k % 3], 1.5), Math.cos(a) * 0.123, 0.16, Math.sin(a) * 0.123, g); } const halo = M(new THREE.TorusGeometry(0.13, 0.012, 8, 40), glow(0xfff2a0, 2.2), 0, 0.42, 0, g); halo.rotation.x = Math.PI / 2; A.push((t) => { halo.position.y = 0.42 + Math.sin(t * 2.2) * 0.025; halo.rotation.z = t; halo.material.emissiveIntensity = 1.8 + Math.sin(t * 4) * 0.6; }); return g; },
  head_cup: (A) => { const g = new THREE.Group(), c = icedCoffee(A, 0.42); c.position.y = 0.13; g.add(c); return g; },
  head_coins: (A) => { const g = new THREE.Group(), ring = new THREE.Group(); ring.position.y = 0.26; g.add(ring); const gold = new THREE.MeshStandardMaterial({ color: 0xffcf3a, metalness: 1, roughness: 0.25, envMap: chromeEnv(), emissive: 0x4a3200 }); const coins = []; for (let k = 0; k < 10; k++) { const c = M(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 18), gold, 0, 0, 0, ring); c.rotation.x = Math.PI / 2; coins.push(c); } A.push((t) => coins.forEach((c, k) => { const a = t * 1.4 + k / 10 * Math.PI * 2; c.position.set(Math.cos(a) * 0.26, Math.sin(t * 2 + k) * 0.03, Math.sin(a) * 0.26); c.rotation.z = t * 5 + k; })); return g; },
  head_angel: (A) => { const g = new THREE.Group(); const halo = M(new THREE.TorusGeometry(0.12, 0.014, 8, 40), glow(0xfff2a0, 2.4), 0, 0.36, 0, g); halo.rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const h = M(new THREE.ConeGeometry(0.03, 0.12, 10), glow(0xc0122a, 0.5), s * 0.08, 0.2, 0.02, g); h.rotation.z = -s * 0.45; } A.push((t) => { halo.position.y = 0.36 + Math.sin(t * 2) * 0.02; halo.material.emissiveIntensity = 2 + Math.sin(t * 4) * 0.6; }); return g; },
  head_kyle: () => { // the big-head fan cutout: a printed Kyle on foam board, white border, worn over your face
    const g = new THREE.Group(), tex = canvasTex('cos_kylecut', 256, 300, (x, w, h) => { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); x.fill(); x.save(); x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 0, 0, 7); x.clip(); x.drawImage(kyleFace().image, -10, 4, w + 20, h - 8); x.restore(); });
    const mk = () => new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.6, emissive: 0x222222, emissiveMap: tex });
    M(new THREE.PlaneGeometry(0.5, 0.6), mk(), 0, 0.12, 0.19, g); const back = M(new THREE.PlaneGeometry(0.5, 0.6), mk(), 0, 0.12, 0.185, g); back.rotation.y = Math.PI; // printed both sides
    M(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), std(0xc8a070), 0.05, -0.2, 0.19, g).rotation.z = 0.15; // the stick
    return g;
  },
  head_hardhat: (A) => { const g = new THREE.Group(), y = std(0xffd23b, { roughness: 0.45 }); M(new THREE.SphereGeometry(0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), y, 0, 0.1, 0, g).scale.set(1, 0.9, 1.1); const brim = M(new THREE.CylinderGeometry(0.165, 0.17, 0.014, 28), y, 0, 0.1, 0.02, g); brim.scale.z = 1.12; M(B(0.03, 0.03, 0.2), y, 0, 0.22, 0, g); M(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 12), std(0x333333), 0, 0.235, 0, g); const bea = M(new THREE.SphereGeometry(0.035, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xffa21a, 2), 0, 0.25, 0, g); const sweep = M(new THREE.ConeGeometry(0.12, 0.3, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0, 0.26, 0, g); sweep.rotation.z = Math.PI / 2; sweep.geometry.translate(0, -0.15, 0); sweep.castShadow = false; A.push((t) => { sweep.rotation.y = t * 5; bea.material.emissiveIntensity = 1.6 + Math.sin(t * 10) * 0.6; }); return g; },
  head_visor: (A) => { const g = new THREE.Group(), tex = canvasTex('cos_visor', 512, 64, (x, w, h) => { x.fillStyle = '#100306'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2a4d'; x.font = '900 44px monospace'; x.fillText('LATE ▸ LATE ▸ LATE ▸ LATE ▸', 6, 48); }); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(0.5, 1); const v = M(new THREE.CylinderGeometry(0.128, 0.128, 0.05, 32, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.4, side: THREE.DoubleSide }), 0, 0.075, 0.0, g); v.rotation.y = Math.PI; v.scale.set(1, 1, 1.12); A.push((t) => { tex.offset.x = (t * 0.25) % 1; }); return g; },
};
const KEEP_HELMET = new Set(['head_coins', 'head_kyle', 'head_visor']); // worn with the helmet still on
const HAIR_HIDDEN = new Set(['head_afro', 'head_fire', 'head_cap', 'head_beanie', 'head_prop', 'head_bucket', 'head_cup', 'head_hardhat']); // these replace / cover the hair

// ---------------------------------------------------------------- outfits: suit + shoe materials, plus bone attachments
const OUTFITS = {
  fit_hoodie: { suit: { color: 0x7a7f87 } },
  fit_hivis: { suit: { color: 0xd8ff2a, emissive: 0x2a3300 }, map: 'stripes', mapColor: ['#d8ff2a', '#e8e8e8'] },
  fit_denim: { suit: { color: 0x3a5d94 }, map: 'denim' },
  fit_track: { suit: { color: 0xc0162c }, map: 'stripes', mapColor: ['#c0162c', '#ffffff'] },
  fit_banana: { suit: { color: 0xffe135, roughness: 0.45 }, shoes: { color: 0x5a3a12 }, extra: 'banana' },
  fit_ceo: { suit: { color: 0x15161a, roughness: 0.5 }, shoes: { color: 0x0a0a0a, roughness: 0.2 }, extra: 'cape' },
  fit_dino: { suit: { color: 0x3fbf3f, roughness: 0.35, emissive: 0x0a2a0a }, shoes: { color: 0x2a8a2a }, extra: 'dino' },
  fit_galaxy: { suit: { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.5 }, map: 'galaxy' },
  fit_chrome: { suit: { color: 0xeef2f6, metalness: 1, roughness: 0.08, envMapIntensity: 2.2 }, shoes: { color: 0xeef2f6, metalness: 1, roughness: 0.1 }, chrome: true },
  fit_gold: { suit: { color: 0xffc83a, metalness: 1, roughness: 0.18, envMapIntensity: 2 }, shoes: { color: 0xffc83a, metalness: 1, roughness: 0.2 }, chrome: true, goldBike: true },
  fit_disney: { suit: { color: 0x2a3f8a }, shoes: { color: 0xf2f2f2 }, extra: 'disney' },
  fit_hotdog: { suit: { color: 0xd8583c, roughness: 0.35 }, shoes: { color: 0xe8b06a }, extra: 'hotdog' },
  fit_astro: { suit: { color: 0xf7f8fa, roughness: 0.85, emissive: 0x202224 }, shoes: { color: 0xf0f2f4, roughness: 0.8 }, extra: 'astro' },
  fit_knight: { suit: { color: 0x8e959e, metalness: 0.9, roughness: 0.32, envMapIntensity: 1.6 }, shoes: { color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 }, chrome: true, extra: 'knight' },
  fit_reflect: { suit: { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 }, map: 'reflect' },
  fit_racer: { suit: { color: 0xffffff, roughness: 0.35 }, shoes: { color: 0x111111, roughness: 0.3 }, map: 'racer' },
  fit_mascot: { suit: { color: 0x2ee66f, roughness: 1 }, shoes: { color: 0xffd23b, roughness: 0.9 }, extra: 'mascot' },
};
const MAPS = {
  reflect: () => canvasTex('cos_reflect', 128, 128, (x, w, h) => { x.fillStyle = '#121826'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8f6ff'; x.fillRect(0, 40, w, 9); x.fillRect(0, 80, w, 9); x.fillStyle = '#ffd23b'; x.fillRect(0, 52, w, 4); }),
  racer: () => canvasTex('cos_racer', 256, 256, (x, w, h) => { x.fillStyle = '#f4f4f2'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff6a00'; x.beginPath(); x.moveTo(0, 90); x.lineTo(w, 40); x.lineTo(w, 110); x.lineTo(0, 160); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(0, 168); x.lineTo(w, 118); x.lineTo(w, 136); x.lineTo(0, 186); x.fill(); x.fillStyle = '#111'; x.font = '900 30px system-ui'; x.fillText('S1', 20, 230); x.fillStyle = '#ff6a00'; x.fillText('RUSH', 120, 230); }),
  stripes: (cols) => canvasTex('cos_str_' + cols.join(''), 128, 128, (x, w, h) => { x.fillStyle = cols[0]; x.fillRect(0, 0, w, h); x.fillStyle = cols[1]; x.fillRect(0, 50, w, 10); x.fillRect(0, 72, w, 10); }),
  denim: () => canvasTex('cos_denim', 256, 256, (x, w, h) => { x.fillStyle = '#4a6fa8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '10,20,50'},${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 1, 6); } }),
  galaxy: () => canvasTex('cos_galaxy', 512, 512, (x, w, h) => { const g = x.createRadialGradient(w * 0.4, h * 0.4, 10, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#6a2bd9'); g.addColorStop(0.4, '#2a0f6a'); g.addColorStop(1, '#05020f'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const gg = x.createRadialGradient(0, 0, 0, 0, 0, 60); const c = ['255,60,200', '60,200,255', '140,80,255'][i % 3]; gg.addColorStop(0, `rgba(${c},.35)`); gg.addColorStop(1, `rgba(${c},0)`); x.save(); x.translate(Math.random() * w, Math.random() * h); x.fillStyle = gg; x.fillRect(-60, -60, 120, 120); x.restore(); } for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; const r = Math.random() < 0.95 ? 1 : 2.5; x.fillRect(Math.random() * w, Math.random() * h, r, r); } }),
};

// ---------------------------------------------------------------- apply a loadout to the rider
export function createCosmetics(R) {
  const C = R.C, snap = new Map(), anim = { bag: [], head: [], outfit: [] }, extras = { head: [], outfit: [] }, bikeSkin = createBikeSkin(R);
  const meshes = []; C.model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) meshes.push(o); });
  const named = (re) => meshes.filter((o) => re.test((o.material.name + ' ' + o.name).toLowerCase()));
  const suit = named(/casualsuit/), shoes = named(/shoes/), hair = named(/short0|hair/);
  const KEYS = ['color', 'emissive', 'emissiveIntensity', 'metalness', 'roughness', 'envMapIntensity', 'map', 'envMap', 'emissiveMap'];
  for (const o of [...suit, ...shoes, ...hair]) snap.set(o, Object.fromEntries(KEYS.map((k) => [k, k === 'color' || k === 'emissive' ? o.material[k].clone() : o.material[k]])));
  const restore = (o) => { const s = snap.get(o); for (const k of KEYS) { if (k === 'color' || k === 'emissive') o.material[k].copy(s[k]); else o.material[k] = s[k]; } o.material.needsUpdate = true; };
  const set = (o, p) => { for (const [k, v] of Object.entries(p)) { if (k === 'color' || k === 'emissive') o.material[k].set(v); else o.material[k] = v; } o.material.needsUpdate = true; };
  const bagDefault = [...R.bag.children];
  const bike = []; R.bike.traverse((o) => { if (o.isMesh) bike.push([o, o.material]); });
  const clear = (slot) => { for (const o of extras[slot]) o.removeFromParent(); extras[slot] = []; anim[slot] = []; };
  const attach = (slot, bone, obj, pos = [0, 0, 0], rot = [0, 0, 0], s = 1) => { C.attach(bone, obj, pos, rot, s); extras[slot].push(obj); return obj; };
  const cur = { ...DEFAULTS };
  // the mascot suit comes with its own (huge) head: hide whatever the head slot has while it's on
  function mascotHides() { const m = cur.outfit === 'fit_mascot'; for (const o of extras.head) o.visible = !m; if (m) { R.helm.scale.setScalar(1e-4); for (const o of hair) o.visible = false; } }
  const api = {
    cur,
    apply(slot, id) {
      cur[slot] = id;
      if (slot === 'bike') { bikeSkin.apply(id, { gold: cur.outfit === 'fit_gold' }); return; }
      if (slot === 'bag') {
        for (const c of [...R.bag.children]) c.removeFromParent(); anim.bag = [];
        if (id === 'bag_classic' || !BAGS[id]) for (const c of bagDefault) R.bag.add(c);
        else R.bag.add(BAGS[id](anim.bag));
      }
      if (slot === 'head') {
        clear('head');
        const isHelmet = id === 'head_helmet' || !HEADS[id];
        R.helm.scale.setScalar(isHelmet || KEEP_HELMET.has(id) ? 0.88 : 1e-4); // scale, not visibility: the finale toggles helm.visible indoors
        for (const o of hair) { restore(o); o.visible = !HAIR_HIDDEN.has(id); }
        if (id === 'head_blond') for (const o of hair) set(o, { color: 0xfff1b8, emissive: 0x2a2410 });
        if (id === 'head_afro' || id === 'head_fire') for (const o of hair) o.visible = false;
        if (!isHelmet && id !== 'head_blond') attach('head', 'Head', HEADS[id](anim.head), [0, 0.0, 0.0], [-0.12, 0, 0], 1);
        mascotHides();
      }
      if (slot === 'outfit') {
        clear('outfit');
        for (const o of [...suit, ...shoes]) restore(o);
        const f = OUTFITS[id];
        if (f) {
          const env = f.chrome ? (R.root.parent?.environment || chromeEnv()) : null;
          for (const o of suit) { set(o, f.suit); if (f.map) { const m = f.map === 'stripes' ? MAPS.stripes(f.mapColor) : MAPS[f.map](); set(o, { map: m, emissiveMap: f.map === 'galaxy' || f.map === 'reflect' ? m : null }); } else set(o, { map: null }); /* the stock suit texture is near-black: drop it so the colour reads */ if (env) set(o, { envMap: env }); }
          if (f.shoes) for (const o of shoes) { set(o, f.shoes); if (env) set(o, { envMap: env }); }
          if (f.map === 'galaxy') anim.outfit.push((t) => { const m = suit[0]?.material.map; if (m) { m.offset.x = t * 0.02; m.offset.y = t * 0.013; } for (const o of suit) o.material.emissiveIntensity = 0.75 + Math.sin(t * 2) * 0.15; });
          if (f.extra === 'cape') { // four linked panels: each bends a little more than the last, more with speed, with a lagging ripple
            const red = new THREE.MeshStandardMaterial({ color: 0xb3121f, roughness: 0.55, side: THREE.DoubleSide }), lining = new THREE.MeshStandardMaterial({ color: 0xffd23b, roughness: 0.4, side: THREE.DoubleSide });
            const root = new THREE.Group(); attach('outfit', 'Spine2', root, [0, 0.2, -0.46], [0, 0, 0], 1);
            M(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 8), lining, 0, 0, 0, root).rotation.z = Math.PI / 2; // collar bar
            const segs = []; let parent = root;
            for (let k = 0; k < 4; k++) { const seg = new THREE.Group(); seg.position.y = k ? -0.2 : 0; const w = 0.46 + k * 0.05; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.21).translate(0, -0.105, 0), red); m.castShadow = true; seg.add(m); const edge = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.025).translate(0, -0.2, 0.002), lining); seg.add(edge); edge.visible = k === 3; parent.add(seg); parent = seg; segs.push(seg); }
            anim.outfit.push((t, ctx) => { const sp = Math.min(1, (ctx?.speed ?? 6) / 16); segs.forEach((s, k) => { s.rotation.x = -(0.15 + sp * 0.32) - k * sp * 0.08 + Math.sin(t * (7 + sp * 6) - k * 0.9) * (0.05 + sp * 0.08); s.rotation.z = Math.sin(t * 3.1 - k * 0.7) * 0.03; }); });
          }
          if (f.extra === 'dino') {
            const g = std(0x2f9e2f, { roughness: 0.35 }), lite = std(0x9be36b, { roughness: 0.4 });
            for (const [bone, y, n] of [['Spine', 0.05, 2], ['Spine1', 0.05, 2], ['Spine2', 0.08, 3], ['Neck', 0.04, 1]]) for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.045 - k * 0.006, 0.12, 4), lite); s.castShadow = true; attach('outfit', bone, s, [0, y + k * 0.06, -0.15 - (bone === 'Spine2' ? 0.18 : 0)], [-0.9, 0, 0], 1); }
            const tail = new THREE.Group(); const segs = []; let parent = tail;
            for (let k = 0; k < 4; k++) { const seg = new THREE.Group(); seg.position.set(0, 0, k ? -0.11 : 0); const m = new THREE.Mesh(new THREE.SphereGeometry(0.1 - k * 0.018, 12, 10), g); m.scale.set(1, 1, 1.4); m.position.z = -0.07; m.castShadow = true; seg.add(m); parent.add(seg); parent = seg; segs.push(seg); }
            attach('outfit', 'Hips', tail, [0, 0.06, -0.15], [0.25, 0, 0], 1); // out the back, held up clear of the rear wheel
            anim.outfit.push((t) => segs.forEach((s, k) => { s.rotation.y = Math.sin(t * 4 - k * 0.6) * 0.18; s.rotation.x = -0.06 + Math.sin(t * 3 - k) * 0.05; }));
          }
          if (f.extra === 'banana') { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.14, 8), std(0x5a3a12)); top.castShadow = true; attach('outfit', 'Head', top, [0, 0.3, 0], [0.3, 0, 0], 1); for (let k = 0; k < 3; k++) { const peel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 3, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe135, side: THREE.DoubleSide })); attach('outfit', 'Head', peel, [Math.cos(k * 2.1) * 0.09, 0.2, Math.sin(k * 2.1) * 0.09], [Math.PI + Math.sin(k * 2.1) * 0.5, 0, Math.cos(k * 2.1) * 0.6], 1); } }
          if (f.extra === 'disney') {
            const blk = std(0x111114, { roughness: 0.6 });
            for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), blk); e.castShadow = true; attach('outfit', 'Head', e, [sx * 0.105, 0.25, -0.01], [Math.PI / 2, 0, -sx * 0.25], 1); }
            const bow = new THREE.Group(); for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), std(0xe8352c)); b.rotation.z = sx * Math.PI / 2; b.position.x = sx * 0.035; bow.add(b); } attach('outfit', 'Head', bow, [0, 0.27, 0.02], [0, 0, 0], 1);
            const pack = new THREE.Group(); const pk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.07), std(0x2ad4c8, { roughness: 0.5 })); pk.castShadow = true; pack.add(pk); const zip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.074), std(0x222222)); zip.position.y = 0.02; pack.add(zip); attach('outfit', 'Hips', pack, [0, 0.06, 0.15], [0, 0, 0], 1);
            const strap = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.008, 6, 32), std(0x222222)); attach('outfit', 'Hips', strap, [0, 0.07, 0.0], [Math.PI / 2, 0, 0], 1);
            const lan = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 24), std(0x1d6fe8)); attach('outfit', 'Spine2', lan, [0, 0.08, 0.06], [1.25, 0, 0], 1);
            [0xffd23b, 0xe8352c, 0x46d8ff, 0xff7ad9, 0x7cff6a].forEach((c, k) => { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 12), glow(c, 0.3)); attach('outfit', 'Spine2', pin, [-0.06 + (k % 3) * 0.06, -0.02 - Math.floor(k / 3) * 0.05, 0.135], [Math.PI / 2, 0, 0], 1); });
          }
          if (f.extra === 'hotdog') {
            const bun = std(0xe8b06a, { roughness: 0.85 });
            for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 8, 16), bun); b.scale.set(1, 1, 1.5); b.castShadow = true; attach('outfit', 'Spine', b, [sx * 0.2, 0.14, 0.04], [0, 0, sx * 0.06], 1); }
            const curve = new THREE.CatmullRomCurve3(Array.from({ length: 10 }, (_, k) => V((k % 2 ? 0.05 : -0.05), 0.2 - k * 0.04, 0))); const mus = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 6), glow(0xffd400, 0.35)); attach('outfit', 'Spine1', mus, [0, 0.05, 0.135], [0, 0, 0], 1);
          }
          if (f.extra === 'astro') {
            const patch = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), new THREE.MeshStandardMaterial({ map: canvasTex('cos_patch', 128, 128, (x, w, h) => { x.fillStyle = '#0b3d91'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.stroke(); x.fillStyle = '#fff'; x.font = '900 30px system-ui'; x.textAlign = 'center'; x.fillText('gobbl', 64, 60); x.font = '800 18px system-ui'; x.fillText('SPACE', 64, 86); x.strokeStyle = '#fc3d21'; x.lineWidth = 5; x.beginPath(); x.moveTo(20, 96); x.quadraticCurveTo(64, 60, 110, 34); x.stroke(); }), roughness: 0.6 }));
            attach('outfit', 'Spine2', patch, [0.07, 0.04, 0.138], [0, 0, 0], 1);
            const box = new THREE.Group(); const bx = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.05), std(0xb8c0c8, { metalness: 0.6, roughness: 0.35 })); bx.castShadow = true; box.add(bx); [0xff3b30, 0x2ee66f, 0xffd23b].forEach((c, k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), glow(c, 1.2)); b.rotation.x = Math.PI / 2; b.position.set(-0.04 + k * 0.04, 0.01, 0.028); box.add(b); }); attach('outfit', 'Spine1', box, [0, 0.0, 0.14], [0, 0, 0], 1);
            for (const side of ['Left', 'Right']) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 20), std(0x8a96a3, { metalness: 0.8, roughness: 0.3 })); attach('outfit', side + 'ForeArm', ring, [0, 0.24, 0], [Math.PI / 2, 0, 0], 1); }
            const blink = []; anim.outfit.push((t) => { box.children.forEach((b, k) => { if (k) b.material.emissiveIntensity = (Math.floor(t * 3) + k) % 3 ? 0.2 : 1.8; }); }); void blink;
          }
          if (f.extra === 'knight') {
            const steel = new THREE.MeshStandardMaterial({ color: 0xd2d8de, metalness: 0.95, roughness: 0.22, envMap: chromeEnv() });
            for (const side of ['Left', 'Right']) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), steel); p.castShadow = true; attach('outfit', side + 'Arm', p, [0, 0.02, 0], [0, 0, 0], 1).scale.set(1.3, 1.0, 1.3); }
            const plate = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16, Math.PI / 2 - 0.9, 1.8, 0.5, 1.4), steel); plate.castShadow = true; attach('outfit', 'Spine2', plate, [0, -0.02, -0.06], [0, Math.PI, 0], 1).scale.set(0.95, 1.1, 1);
            for (let k = 0; k < 3; k++) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.17 + k * 0.012, 0.18 + k * 0.012, 0.05, 20, 1, true, -1.2, 2.4), steel); fl.material = steel; attach('outfit', 'Hips', fl, [0, 0.06 - k * 0.045, 0.0], [0, 0, 0], 1); }
            const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), new THREE.MeshBasicMaterial({ map: canvasTex('cos_cross', 64, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#c0122a'; x.fillRect(24, 4, 16, 88); x.fillRect(4, 28, 56, 16); }), transparent: true })); attach('outfit', 'Spine2', cross, [0, 0.02, 0.15], [0, 0, 0], 1);
          }
          if (f.extra === 'mascot') {
            const foam = std(0x2ee66f, { roughness: 1 }), belly = std(0xd8f2b0, { roughness: 1 }), wht = std(0xffffff, { roughness: 0.4 }), blk = std(0x111111, { roughness: 0.2 });
            const head = new THREE.Group();
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 28, 20), foam); skull.scale.set(1.05, 0.95, 1.05); skull.castShadow = true; head.add(skull);
            const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 8, 16), foam); snout.rotation.x = Math.PI / 2; snout.scale.set(1.25, 1, 0.6); snout.position.set(0, -0.05, 0.25); snout.castShadow = true; head.add(snout);
            for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 6), wht); tooth.rotation.x = Math.PI; tooth.position.set(sx * 0.12, -0.11, 0.12 + k * 0.045); head.add(tooth); }
            for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), wht); eye.position.set(sx * 0.09, 0.15, 0.08); head.add(eye); const pup = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), blk); pup.position.set(sx * 0.1, 0.16, 0.14); head.add(pup); head.userData['p' + sx] = pup; }
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x16181d)); cap.position.y = 0.17; cap.scale.set(1, 0.6, 1); head.add(cap);
            attach('outfit', 'Head', head, [0, 0.07, 0.02], [-0.1, 0, 0], 1);
            const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14, Math.PI / 2 - 0.8, 1.6, 0.6, 1.6), belly); tummy.rotation.y = Math.PI; attach('outfit', 'Spine1', tummy, [0, 0.02, -0.05], [0, Math.PI, 0], 1);
            anim.outfit.push((t) => { for (const sx of [-1, 1]) { const p = head.userData['p' + sx]; p.position.x = sx * 0.1 + Math.sin(t * 7 + sx) * 0.02; p.position.y = 0.16 + Math.cos(t * 5 + sx * 2) * 0.015; } }); // googly
          }
        }
        if (api._lastFit === 'fit_mascot' && id !== 'fit_mascot') { api._lastFit = id; api.apply('head', cur.head); } else { api._lastFit = id; mascotHides(); }
        bikeSkin.apply(cur.bike, { gold: id === 'fit_gold' }); // Solid Gold gilds the stock bike (special bikes keep their paint)
      }
    },
    mascotHides,
    applyAll(eq) { for (const slot of ['bag', 'outfit', 'head', 'bike']) api.apply(slot, eq[slot] || DEFAULTS[slot]); },
    tick(t, ctx) { for (const k of ['bag', 'head', 'outfit']) for (const f of anim[k]) f(t, ctx); bikeSkin.tick(t, ctx); },
  };
  return api;
}
if (typeof window !== 'undefined') window.__ITEMS = ITEMS; // QA: the item probe walks the catalogue
