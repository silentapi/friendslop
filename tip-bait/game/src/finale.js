// The delivery finale: pull up at the CITITOWER 101 canopy (real-life vs in-game panel) → elevator OUT OF ORDER
// → climb 20 floors (alternate LEFT/RIGHT taps) → Kyle S opens 2004, takes it, sips, complains → takes the tip.
import { THREE, V, clamp, lerp, seg, smooth, easeOut, easeInOut, damp, box, cyl, mat } from './core.js';
import { character, ik2, coldCup } from './chars.js';
import * as Sets from './sets.js';
import * as KY from './kyle.js';

const KYLE_LOOK = { maps: { casualsuit06: 'tex/kyle_fit.jpg', shoes05: 'tex/kyle_shoes.jpg' } };
let kyleP = null;
export function prefetchKyle() { return (kyleP ||= character('m/kyle.glb', KYLE_LOOK).then(async (K) => { await K.load('idle', 'shrug'); for (const f of ['LeftFoot', 'RightFoot']) K.bone(f).scale.setScalar(1.18); K.captureRest(); return K; })); }

let recP = null;
export function prefetchReceptionist() { return (recP ||= character('m/tourist_f.glb', { tint: { casualsuit02: 0x3a4a6a } }).then(async (C) => { await C.load('sitidle', 'idle', 'point'); return C; })); }
function phone() { const g = new THREE.Group(); box(0.075, 0.15, 0.012, mat(0x111214, { roughness: 0.3 }), 0, 0, 0, g); box(0.065, 0.13, 0.002, new THREE.MeshBasicMaterial({ color: 0x8fd8ff }), 0, 0, 0.007, g); return g; }
function hazardProp(kind) {
  const g = new THREE.Group();
  if (kind === 'dog') { const fur = mat(0x9a6a3a, { roughness: 0.9 }); box(0.5, 0.26, 0.24, fur, 0, 0.32, 0, g); box(0.2, 0.2, 0.2, fur, 0.32, 0.48, 0, g); box(0.1, 0.08, 0.12, mat(0x2a1a10), 0.45, 0.44, 0, g); for (const [x, z] of [[-0.18, -0.08], [-0.18, 0.08], [0.18, -0.08], [0.18, 0.08]]) box(0.07, 0.22, 0.07, fur, x, 0.11, z, g); box(0.22, 0.05, 0.05, fur, -0.33, 0.42, 0, g).rotation.z = 0.6; }
  if (kind === 'wet') { const y = mat(0xffd21a, { roughness: 0.6 }); for (const sx of [-1, 1]) { const p = box(0.4, 0.62, 0.02, y, 0, 0.3, sx * 0.1, g); p.rotation.x = sx * 0.3; } box(1.0, 0.005, 0.8, mat(0x8ab8d8, { roughness: 0.02, metalness: 0.4 }), 0, 0.005, 0, g); }
  if (kind === 'bucket') { cyl(0.2, 0.17, 0.32, mat(0xffd21a, { roughness: 0.6 }), 16, 0, 0.16, 0, g); const st = cyl(0.015, 0.015, 1.2, mat(0x8a6a4a), 6, 0.05, 0.6, 0, g); st.rotation.z = 0.35; }
  g.rotation.y = Math.PI / 2;
  return g;
}
function interiorScene(env) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x0b0b0c);
  s.environment = env; s.environmentIntensity = 0.45;
  s.add(new THREE.HemisphereLight(0xfff2e0, 0x3a3430, 1.1));
  const d = new THREE.DirectionalLight(0xfff0dc, 0.8); d.position.set(3, 8, 5); s.add(d);
  return s;
}

export class Finale {
  constructor({ renderer, scene, camera, G, Audio, UI, sun, onDone }) {
    Object.assign(this, { renderer, world: scene, camera, G, Audio, UI, sun, onDone });
    this.active = true; this.phase = 'arrive'; this.t = 0; this.scene = scene;
    this.tapHandler = null;
  }
  start() {
    const { G, UI, Audio } = this;
    UI.skipChip(true).addEventListener('click', () => this.skip());
    prefetchKyle(); prefetchReceptionist(); G.R.root.visible = true;
    Audio.music('chill'); Audio.sfx('skid', 0.9);
    this.c0 = this.camera.position.clone(); this.l0 = new THREE.Vector3(); this.camera.getWorldDirection(this.l0); this.l0.multiplyScalar(10).add(this.c0);
    const ud = G.citi.userData;
    this.door = ud.door.clone(); this.sign = ud.signMid.clone(); this.corner = ud.corner.clone();
    this.stop = G.R.root.position.clone(); this.stop.y = 0;
    this.yaw0 = G.R.root.rotation.y;

  }
  // ---------------------------------------------------------------- locked front doors + the receptionist on her phone
  async toLocked() {
    if (this.phase !== 'arrive') return;
    const { UI, Audio, G } = this;
    UI.remove('scene'); UI.skipChip(false); document.querySelectorAll('.place').forEach((e) => e.remove());
    this.phase = 'loadingLocked';
    const s = interiorScene(this.world.environment);
    const out = new THREE.DirectionalLight(0xfff0dc, 1.2); out.position.set(4, 9, 14); s.add(out);
    const lob = Sets.lobby({ glass: true }); s.add(lob); this.lob = lob;
    const rec = await prefetchReceptionist(); this.rec = rec; s.add(rec.root);
    rec.root.position.set(-2.1, 0, 0.1); rec.root.rotation.set(0, 0, 0);
    if (!rec.phone) rec.phone = rec.attach('RightHand', phone(), [0, 0.09, 0.03], [0.3, 0, 0], 1);
    this.stool = cyl(0.22, 0.22, 0.62, mat(0x1b1d22), 14, -2.1, 0.31, -0.05, s);
    const R = G.R; s.add(R.root); R.bike.visible = false; R.helm.visible = false; R.cup.visible = false;
    R.root.rotation.set(0, Math.PI, 0); R.root.position.set(1.05, 0, 5.0);
    this.cup = coldCup(); s.add(this.cup);
    this.scene = s; this.phase = 'locked'; this.t = 0;
    Object.assign(this, { meter: 0, look: 0, glanceT: 0, nextGlance: 1.4 + Math.random(), lastSide: -1, knockCd: 0, waveT: 0, knockT: 0, wavePh: 0, buzzed: null, inputOn: false, rattle: 0 });
    this.bui = UI.buzzUI(); this.bui.el.style.opacity = 0; this.bui.bind(() => this.wave(this.lastSide === 0 ? 1 : 0), () => this.knock());
    this.keyH = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (this.phase === 'locked') { if (k === 'arrowleft' || k === 'a') this.wave(0); else if (k === 'arrowright' || k === 'd') this.wave(1); else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') { e.preventDefault(); this.knock(); } } else if (this.phase === 'stairs') this.stairKey(k, e); };
    window.addEventListener('keydown', this.keyH);
    Audio.music('tense');
  }
  wave(side) {
    if (!this.inputOn || this.buzzed != null) return;
    if (side === this.lastSide) return;
    this.lastSide = side; this.waveT = 0.3; this.wavePh = side;
    this.gain(0.04); this.Audio.sfx('whoosh', 0.2, 1.8);
  }
  knock() {
    if (!this.inputOn || this.buzzed != null || this.knockCd > 0) return;
    this.knockCd = 0.32; this.knockT = 0.22; this.gain(0.1); this.Audio.sfx('knock', 1, 0.9 + Math.random() * 0.2);
  }
  gain(g) { const looking = this.glanceT > 0; this.meter = Math.min(looking ? 1 : 0.5, this.meter + g * (looking ? 2.5 : 1)); }
  updateLocked(dt) {
    const t = (this.t += dt), R = this.G.R, rec = this.rec, cam = this.camera, UI = this.UI, A = this.Audio, lob = this.lob;
    // beat 1: he pushes the door. it rattles. locked.
    if (t > 0.35 && !this.rat) { this.rat = true; A.sfx('rattle', 1); this.rattle = 0.45; UI.sceneCap('locked.'); }
    if (t > 1.3 && !this.inputOn) { this.inputOn = true; this.t0 = t; UI.remove('scene'); this.bui.el.style.opacity = 1; UI.dm(KY.pickLine(KY.LOBBY_TEXTS.slice(0, 2))); }
    this.rattle = Math.max(0, this.rattle - dt);
    lob.userData.doors.forEach((d, i) => { d.position.x = (i ? 0.75 : -0.75) + Math.sin(t * 70) * this.rattle * 0.02 + (this.buzzed != null ? (i ? 1 : -1) * 1.4 * smooth(seg(t - this.buzzed, 0.3, 1.1)) : 0); });
    this.knockCd = Math.max(0, this.knockCd - dt); this.waveT = Math.max(0, this.waveT - dt); this.knockT = Math.max(0, this.knockT - dt);
    if (this.inputOn && this.buzzed == null) {
      const el = t - this.t0;
      if (this.glanceT > 0) { this.glanceT -= dt; if (this.glanceT <= 0) this.nextGlance = el + 1.2 + Math.random() * 1.3; }
      else if (el >= this.nextGlance) { this.glanceT = 0.95; A.sfx('pop', 0.6, 1.6); }
      else this.meter = Math.max(0, this.meter - dt * 0.12);
      if (el > 3.2 && !this.tx2) { this.tx2 = true; UI.dm(KY.pickLine(KY.LOBBY_TEXTS.slice(2))); }
      if (this.meter >= 1 || el > 11) this.buzz(el);
    }
    this.look = damp(this.look, this.glanceT > 0 || this.buzzed != null ? 1 : 0, 12, dt);
    this.bui.set({ meter: this.meter, looking: this.glanceT > 0, cap: 0.5 });
    // receptionist: seated, eyes on the phone; glances up at the door
    rec.pose(this.buzzed != null && t - this.buzzed > 0.2 && t - this.buzzed < 1.6 ? [['sitidle', 1 + t * 0.6, 0.6], ['point', 0.6 + (t - this.buzzed) * 0.5, 0.4]] : [['sitidle', 1 + t * 0.6]]);
    const hd = rec.bone('Head'), nk = rec.bone('Neck');
    nk.rotateX(0.35 * (1 - this.look)); hd.rotateX(0.35 * (1 - this.look) - 0.05 * this.look); hd.rotateY(-0.25 * this.look); hd.updateMatrixWorld(true);
    const ph = rec.root.localToWorld(V(-0.08 + 0.06 * this.look, 1.05 - 0.2 * this.look, 0.38 - 0.1 * this.look));
    ik2(rec.bone('RightArm'), rec.bone('RightForeArm'), rec.bone('RightHand'), ph, rec.root.localToWorld(V(-0.5, 0.7, -0.2)));
    // courier: waves both arms over his head, knocks on the glass
    if (this.buzzed != null && t - this.buzzed > 0.9) {
      const k = smooth(seg(t - this.buzzed, 0.9, 1.8));
      R.root.position.set(1.05 - k * 0.8, 0, 5.0 - k * 3.4); R.walk('jog', t * 1.4, { offset: V(0, 0, 0), yaw: 0 });
      if (t - this.buzzed > 1.9) this.toElevator();
    } else {
      R.walk('idle', t, { offset: V(0, 0, 0), yaw: 0 });
      const w = this.waveT / 0.3, kn = this.knockT / 0.22;
      if (this.inputOn && this.buzzed == null) {
        const sway = Math.sin(t * 22) * 0.12;
        for (const [side, sx] of [['Right', -1], ['Left', 1]]) {
          const up = side === 'Right' ? Math.max(w * (this.wavePh === 1 ? 1 : 0.55), 0.35) : Math.max(w * (this.wavePh === 0 ? 1 : 0.55), 0.35);
          let tgt = R.root.localToWorld(V(sx * (0.42 + sway * sx), 1.3 + up * 0.8, 0.18));
          if (side === 'Right' && kn > 0) tgt = R.root.localToWorld(V(-0.12, 1.5, 0.66 - (1 - kn) * 0.06));
          ik2(R.C.bone(side + 'Arm'), R.C.bone(side + 'ForeArm'), R.C.bone(side + 'Hand'), tgt, R.root.localToWorld(V(sx * 0.9, 1.1, -0.2)));
        }
      }
    }
    R.C.root.updateMatrixWorld(true);
    this.cup.visible = this.buzzed != null && t - this.buzzed > 0.9; this.cup.position.copy(R.C.boneWorld('LeftHand')).add(V(0, -0.1, 0));
    // camera: over his shoulder through the glass; punch in on her when she looks up
    const zoom = smooth(this.look);
    cam.position.copy(V(2.0, 1.8, 7.4).lerp(V(-0.1, 1.6, 6.4), zoom)); cam.lookAt(V(-0.5, 1.3, 1.6).lerp(V(-2.1, 1.22, 0.3), zoom));
    cam.fov = damp(cam.fov, 48 - zoom * 20, 6, dt); cam.updateProjectionMatrix();
  }
  buzz(el) {
    const { UI, A = this.Audio, G } = this;
    this.buzzed = this.t; this.glanceT = 0; UI.remove('buzzui');
    const g = el < 3.0 ? ['PERFECT', 600, 'she buzzed you in instantly'] : el < 6.5 ? ['GOOD', 300, 'she sighed and buzzed you in'] : ['SLOW', 100, '“ugh. fine.”'];
    G.score += g[1]; G.fin = { ...(G.fin || {}), door: g[0], doorT: el };
    UI.pop(g[0], `${g[2]} · +${g[1]}`); A.sfx('buzz', 0.9); setTimeout(() => A.sfx('ding', 0.5), 400);
    UI.sceneCap(el > 11 ? '“ugh. fine.”' : 'bzzzt.');
  }
  // ---------------------------------------------------------------- elevator
  toElevator() {
    if (this.phase !== 'arrive' && this.phase !== 'locked') return;
    const { UI, Audio, G } = this;
    UI.remove('scene');
    this.phase = 'elevator'; this.t = 0;
    const s = this.lob ? this.scene : interiorScene(this.world.environment);
    const lob = this.lob || Sets.lobby(); if (!this.lob) s.add(lob);
    box(0.12, 0.3, 0.04, mat(0xb8bcc4, { metalness: 1, roughness: 0.25 }), 1.25, 1.2, -2.8, lob);
    this.btn = cyl(0.025, 0.025, 0.02, new THREE.MeshBasicMaterial({ color: 0x331a08 }), 16, 1.25, 1.22, -2.78, lob); this.btn.rotation.x = Math.PI / 2;
    this.fill = new THREE.PointLight(0xffe6cc, 0, 5, 2); this.fill.position.set(0.85, 1.9, -2.3); s.add(this.fill);
    this.scene = s;
    const R = G.R; s.add(R.root); R.bike.visible = false; R.helm.visible = false; R.cup.visible = false;
    R.root.rotation.set(0, Math.PI, 0); R.root.position.set(3.4, 0, -0.6);
    this.cup?.removeFromParent(); this.cup = coldCup(); s.add(this.cup);
    Audio.sfx('ding', 0.4);
    this.done = false;
  }
  updateElevator(dt) {
    const t = (this.t += dt), R = this.G.R, cam = this.camera, UI = this.UI, A = this.Audio;
    const stand = V(0.85, 0, -1.25), press = 0.55, sign = 0.9, signed = 1.75, stare = 2.0, line = 2.6;
    const k = smooth(seg(t, 0, press - 0.1));
    R.root.position.copy(V(3.4, 0, -0.6).lerp(stand, k));
    R.walk(t < press - 0.15 ? 'jog' : 'idle', t * 1.3, { offset: V(0, 0, 0), yaw: t < press - 0.15 ? -0.5 : 0 });
    const pr = smooth(seg(t, press - 0.2, press)) * (1 - smooth(seg(t, press + 0.15, press + 0.45)));
    if (pr > 0) { const h = R.C.boneWorld('RightHand'); ik2(R.C.bone('RightArm'), R.C.bone('RightForeArm'), R.C.bone('RightHand'), h.lerp(V(1.25, 1.22, -2.74), pr), R.root.localToWorld(V(-0.5, 0.6, -0.6))); }
    if (t > press && !this.pressed) { this.pressed = true; this.btn.material.color.set(0xff9a3a); A.sfx('pop', 0.6, 1.4); }
    if (t > sign && !this.scratched) { this.scratched = true; A.music(null); A.sfx('scratch', 0.9); A.sfx('bwomp', 0.8); }
    if (t > stare) { const hd = R.C.bone('Head'); hd.rotateX(0.1); hd.updateMatrixWorld(true); this.fill.intensity = 4; }
    R.C.root.updateMatrixWorld(true);
    this.cup.position.copy(R.C.boneWorld('LeftHand')).add(V(0, -0.1, 0));
    if (t < stare) {
      const z = easeInOut(seg(t, sign, signed));
      cam.position.copy(V(2.9, 1.65, 2.6).lerp(V(0.05, 1.57, -1.7), z)); cam.lookAt(V(0.4, 1.35, -2.6).lerp(V(0, 1.55, -2.78), z)); cam.fov = 58 - z * 10;
    } else {
      const z = easeInOut(seg(t, stare, 3.8));
      cam.position.copy(V(0.85, 1.62, -2.72 + z * 0.1)); cam.lookAt(0.85, 1.5, -1.25); cam.fov = 62 - z * 8;
    }
    cam.updateProjectionMatrix();
    if (t > sign + 0.2 && !this.c1) { this.c1 = true; UI.sceneCap('elevator: <em>out of order.</em>'); }
    if (t > line && !this.c2) { this.c2 = true; UI.sceneCap('…20 floors.'); }
    if (t > (this.G.delivered > 0 ? 4.0 : 5.0)) this.toStairs();
  }
  // ---------------------------------------------------------------- stairs: rhythm climb with landing hazards
  toStairs() {
    if (this.phase !== 'elevator') return;
    const { UI, Audio, G } = this;
    UI.remove('scene'); this.rec?.root.removeFromParent();
    this.phase = 'stairs'; this.t = 0;
    const s = interiorScene(this.world.environment);
    const well = Sets.stairwell(null, 21); s.add(well);
    // keep only a few of the stairwell's lights (mobile GPUs pay per light)
    let n = 0; well.traverse((o) => { if (o.isPointLight && n++ % 3) o.visible = false; });
    // dollhouse cutaway: drop the +x wall so the camera can watch him zig-zag up the flights in profile
    for (const o of well.children) if (o.isMesh && Math.abs(o.position.x - 3.15) < 0.01) o.visible = false;
    for (const o of well.children) if (o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.position.x > 2.9) o.visible = false;
    const top = new THREE.DirectionalLight(0xeef4ff, 0.6); top.position.set(0, 80, 0); s.add(top);
    this.scene = s;
    const R = G.R; s.add(R.root);
    this.cup.removeFromParent(); s.add(this.cup);
    // hazards on three landings (random floors + kinds): a dog, a wet floor, a mop bucket
    const kinds = ['dog', 'wet', 'bucket'].sort(() => Math.random() - 0.5), floors = [5 + Math.floor(Math.random() * 3), 10 + Math.floor(Math.random() * 3), 15 + Math.floor(Math.random() * 3)];
    this.hazards = floors.map((f, i) => { const kind = kinds[i], key = kind === 'wet' ? 'arrowup' : Math.random() < 0.5 ? 'arrowleft' : 'arrowright'; const m = hazardProp(kind); const { p } = Sets.stairPath(2 * (f - 1) + 0.02); m.position.copy(p).add(V(0, 0, f % 2 ? 0.6 : -0.6)); s.add(m); return { f, kind, key, m, done: false }; });
    Object.assign(this, { flights: 0, sCur: 0, beat: 0, stumble: 0, perfects: 0, misses: 0, haz: null, hazT: 0, dodge: 0 });
    UI.skipChip(false);
    Audio.music('full');
    this.ui = UI.climbUI(); this.ui.bind(() => this.step());
    if (!this.keyH) { this.keyH = (e) => { if (!e.repeat && this.phase === 'stairs') this.stairKey(e.key.toLowerCase(), e); }; window.addEventListener('keydown', this.keyH); }
    UI.dm(KY.pickLine(KY.STAIRS_TEXTS[0][1]), { ttl: 2600 });
  }
  stairKey(k, e) {
    if (this.haz) { const map = { a: 'arrowleft', d: 'arrowright', w: 'arrowup', ' ': 'arrowup', s: 'arrowdown' }; k = map[k] || k; if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) { e?.preventDefault(); this.hazPress(k); } return; }
    if (k === 'arrowup' || k === 'w' || k === ' ' || k === 'enter') { e?.preventDefault(); this.step(); }
  }
  // the beat marker ping-pongs across the bar; hit it in the green
  zone() { const f = Math.min(1, this.flights / 38); return { zone: 0.15 - f * 0.05, perfect: 0.045 - f * 0.012 }; }
  step() {
    if (this.phase !== 'stairs' || this.climbed || this.stumble > 0) return;
    if (this.haz) return;
    const u = this.u ?? 0.5, d = Math.abs(u - 0.5), { zone, perfect } = this.zone(), A = this.Audio, G = this.G;
    if (d <= perfect) { this.flights = Math.min(38, this.flights + 3); this.perfects++; this.ui.flash('perf'); A.sfx('step', 1, 1.2); A.sfx('ice', 0.4, 1.4); G.score += 60; this.UI.pop('PERFECT', 'two at a time', { top: 72 }); }
    else if (d <= zone) { this.flights = Math.min(38, this.flights + 2); this.ui.flash('hit'); A.sfx('step', 1, 0.9 + Math.random() * 0.2); G.score += 25; }
    else { this.misses++; this.stumble = 0.55; this.ui.flash('miss'); A.sfx('pop', 0.6, 0.5); G.ice = Math.max(0, G.ice - 3); this.UI.pop('STUMBLE', 'off the beat', { top: 72 }); navigator.vibrate?.(30); }
  }
  hazPress(k) {
    const h = this.haz, q = this.hq; if (!h) return;
    const ok = k === h.key && this.hazT > 0.12;
    this.endHaz(ok, ok ? '' : k === h.key ? 'too early' : 'wrong way');
  }
  endHaz(ok, why = '') {
    const h = this.haz, G = this.G, A = this.Audio; this.haz = null; h.done = true;
    const NAMES = { dog: ['STEPPED AROUND THE DOG', 'the dog got you'], wet: ['HOPPED THE WET FLOOR', 'slipped on the wet floor'], bucket: ['DODGED THE MOP BUCKET', 'kicked the mop bucket'] };
    if (ok) { this.hq.result('NICE', NAMES[h.kind][0]); G.score += 200; A.sfx('ding', 0.6, 1.4); this.dodge = 1; this.dodgeDir = h.key === 'arrowleft' ? -1 : h.key === 'arrowright' ? 1 : 0; }
    else { this.hq.result('MISS', why || NAMES[h.kind][1]); this.flights = Math.max(0, this.flights - 2); this.stumble = 1.0; this.misses++; G.ice = Math.max(0, G.ice - 6); A.sfx('crash', 0.5, 1.4); if (h.kind === 'dog') A.sfx('horn', 0.2, 2.4); }
  }
  updateStairs(dt) {
    const R = this.G.R, cam = this.camera, UI = this.UI;
    this.t += dt;
    this.stumble = Math.max(0, this.stumble - dt); this.dodge = Math.max(0, this.dodge - dt * 1.5);
    // marker speed rises as you climb
    const f = Math.min(1, this.flights / 38);
    if (!this.haz) this.beat += dt * (1.7 + f * 0.9);
    this.u = Math.abs((this.beat % 2) - 1);
    const target = this.flights;
    this.sCur = damp(this.sCur, target, this.stumble > 0 ? 2 : 6, dt);
    const { p, dir } = Sets.stairPath(Math.min(37.999, this.sCur));
    const side = this.dodge > 0 ? Math.sin(Math.PI * this.dodge) * 0.45 * (this.dodgeDir || 0) : 0;
    R.root.position.copy(p).add(V(side, 0.04 + (this.dodge > 0 && !this.dodgeDir ? Math.sin(Math.PI * this.dodge) * 0.4 : 0), 0)); R.root.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    const moving = target - this.sCur > 0.05;
    R.walk(moving ? 'jog' : 'idle', this.t * 1.6, { offset: V(0, 0, 0), yaw: 0 });
    if (this.stumble > 0) { const sp = R.C.bone('Spine'); sp.rotateX(0.5 * Math.sin(Math.PI * Math.min(1, this.stumble))); sp.updateMatrixWorld(true); }
    R.C.root.updateMatrixWorld(true);
    this.cup.position.copy(R.C.boneWorld('RightHand')).add(V(0, -0.1, 0));
    const look = R.root.position.clone().add(V(0, 0.9, 0));
    const want = V(this.haz ? 6.5 : 9.5, R.root.position.y + (this.haz ? 1.2 : 1.6), this.haz ? R.root.position.z * 0.5 : 0.2);
    if (!this.camInit) { this.camInit = true; cam.position.copy(want); }
    cam.position.lerp(want, 1 - Math.exp(-5 * dt)); cam.lookAt(this.haz ? look : V(0.4, cam.position.y - 0.7, 0)); cam.fov = damp(cam.fov, this.haz ? 44 : 52, 6, dt); cam.updateProjectionMatrix();
    const floor = Math.min(20, 1 + Math.floor(this.sCur / 2 + 0.001));
    // landing hazards: trigger a prompt as you reach the floor
    const hz = this.hazards.find((h) => !h.done && this.sCur >= 2 * (h.f - 1) - 0.6);
    if (hz && !this.haz && !this.climbed) {
      this.haz = hz; this.hazT = 0; this.flights = Math.min(this.flights, 2 * (hz.f - 1)); this.Audio.sfx('whoosh', 0.7, 0.7);
      const LBL = { dog: '🐕 a neighbour’s dog on the landing — step around it', wet: '⚠️ WET FLOOR — hop it', bucket: '🪣 mop bucket — sidestep it' };
      this.hq = UI.qte({ key: hz.key, label: LBL[hz.kind] });
      if (hz.kind === 'dog') this.Audio.sfx('pop', 0.8, 0.6);
    }
    if (this.haz) { this.hazT += dt; this.hq.set(1 - this.hazT / 1.5); if (this.hazT > 1.5) this.endHaz(false, 'too slow'); }
    for (const h of this.hazards) if (h.kind === 'dog') h.m.rotation.y = Math.sin(this.t * 6) * 0.15;
    const { zone, perfect } = this.zone();
    this.ui.set({ floor, u: this.u, zone, perfect, hide: !!this.haz });
    for (const [fl, arr] of KY.STAIRS_TEXTS.slice(1)) if (floor >= fl && !this['st' + fl]) { this['st' + fl] = true; UI.dm(KY.pickLine(arr)); this.Audio.sfx('pop', 0.7); }
    if (this.sCur >= 37.9 && !this.climbed) {
      this.climbed = true; this.G.stairTime = this.t; this.Audio.sfx('ding', 1);
      const g = this.misses === 0 && this.t < 9 ? 'PERFECT' : this.misses <= 2 && this.t < 13 ? 'GOOD' : 'GASSED';
      const pts = { PERFECT: 800, GOOD: 400, GASSED: 100 }[g];
      this.G.score += pts; this.G.fin = { ...(this.G.fin || {}), stairs: g, stairT: this.t };
      UI.pop('FLOOR 20', `${g === 'GASSED' ? 'gassed 😮‍💨' : g + ' climb 💪'} · +${pts}`); setTimeout(() => this.toDoor(), 900);
    }
  }
  // ---------------------------------------------------------------- Kyle's door
  async toDoor() {
    if (this.phase !== 'stairs') return;
    const { UI, Audio, G } = this;
    window.removeEventListener('keydown', this.keyH);
    UI.remove('climbui'); UI.remove('qte');
    this.phase = 'loadingDoor';
    const s = interiorScene(this.world.environment); s.environmentIntensity = 0.5;
    const hall = Sets.hallway(); s.add(hall);
    this.hall = hall; this.d = hall.userData.doors[2004];
    const K = await prefetchKyle(); s.add(K.root); this.K = K;
    const R = G.R; s.add(R.root);
    R.root.position.set(0.15, 0, Sets.DOOR_Z - 0.15); R.root.rotation.set(0, Math.PI / 2, 0);
    this.cup.removeFromParent(); s.add(this.cup);
    this.scene = s; this.phase = 'door'; this.t = 0;
    UI.skipChip(true).addEventListener('click', () => this.skip());
    const late = G.time + (G.stairTime || 10) > G.etaTotal + 11;
    this.line = G.ice < 20 ? 'it’s literally soup' : late ? 'took u long enough' : G.crashes >= 2 ? 'why does it look like u fell' : 'kinda melted ngl';
    Audio.music('tense'); Audio.sfx('creak', 0.9);
  }
  updateDoor(dt) {
    const t = (this.t += dt), R = this.G.R, K = this.K, cam = this.camera, A = this.Audio, UI = this.UI;
    const open = 0.05, take = 0.6, sip = 1.95, line = 2.35, close = 3.2, tipT = 3.6;
    if (t < tipT) {
      const o = easeOut(seg(t, open, open + 0.35)) * (1 - easeOut(seg(t, close - 0.15, close)));
      this.d.leaf.rotation.y = o * 1.5; this.hall.userData.aptLight.intensity = o * 12;
      K.root.position.set(2.4 - o * 0.85, 0, Sets.DOOR_Z + 0.05); K.root.rotation.y = -Math.PI / 2; K.root.visible = o > 0.02;
      K.pose(t < line ? [['idle', 1 + t]] : [['shrug', 0.25 + (t - line), 1, false]]);
      R.walk('idle', 2 + t, { offset: V(0, 0, 0), yaw: 0 });
      const mid = V(0.88, 1.22, Sets.DOOR_Z + 0.02);
      const give = smooth(seg(t, open + 0.1, take - 0.05)) * (1 - smooth(seg(t, take + 0.1, take + 0.45)));
      ik2(R.C.bone('RightArm'), R.C.bone('RightForeArm'), R.C.bone('RightHand'), R.C.boneWorld('RightHand').lerp(mid.clone().add(V(-0.03, 0, 0.05)), give), R.root.localToWorld(V(-0.6, 0.8, -0.4)));
      if (t < line && t >= take - 0.25) {
        const reach = smooth(seg(t, take - 0.25, take)) * (1 - smooth(seg(t, take + 0.05, take + 0.35)));
        const sp = smooth(seg(t, sip - 0.2, sip)) * (1 - smooth(seg(t, sip + 0.25, line - 0.05)));
        const chest = K.root.localToWorld(V(-0.12, 1.32, 0.32)), mouth = K.boneWorld('Head').add(V(-0.14, -0.1, 0));
        ik2(K.bone('RightArm'), K.bone('RightForeArm'), K.bone('RightHand'), chest.lerp(mid.clone().add(V(0.04, 0.02, -0.04)), reach).lerp(mouth, sp), K.boneWorld('RightArm').add(V(0.3, -0.6, -0.4)));
        const hd = K.bone('Head'); hd.rotateX(0.22 * smooth(seg(t, take, take + 0.3)) * (1 - sp) - 0.2 * sp); hd.updateMatrixWorld(true);
      }
      this.cup.position.copy(t < take ? R.C.boneWorld('RightHand') : K.boneWorld('RightHand')).add(V(0, -0.11, 0));
      this.cup.visible = t < close - 0.1;
      const push = easeInOut(seg(t, 0, line)), pin = smooth(seg(t, line - 0.1, line + 0.25));
      cam.position.copy(V(-1.05, 1.12, Sets.DOOR_Z + 0.75).lerp(V(-0.7, 1.2, Sets.DOOR_Z + 0.6), push));
      cam.lookAt(V(1.2, 1.55, Sets.DOOR_Z - 0.05).lerp(K.boneWorld('Head').add(V(0, -0.05, 0)), pin));
      cam.fov = 64 - push * 4 - pin * 22; cam.updateProjectionMatrix();
      if (t > open + 0.15 && !this.ot) { this.ot = true; UI.sceneCap('', { extra: '<div class="notif"><div class="ic">✓</div><div><b>Delivered · on time</b><small>Kyle S · Citi Tower fl 20</small></div></div>' }); A.sfx('ding', 0.6); }
      if (t > sip - 0.15 && !this.sl) { this.sl = true; A.sfx('slurp', 1); }
      if (t > line && !this.ln) { this.ln = true; UI.sceneCap(`Kyle S: “${this.line}”`); }
      if (t > close && !this.cl) { this.cl = true; A.sfx('boom', 0.5); UI.remove('scene'); }
    } else {
      // the courier in the hall, looking at his phone … the tip changes
      const u = t - tipT;
      R.root.rotation.set(0, Math.PI - 0.35, 0);
      R.walk(u < 0.9 ? 'idle' : 'facepalm', u < 0.9 ? 1 + u : (u - 0.9) * 1.3 + 0.3, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.9 });
      const base = R.root.position;
      cam.position.copy(base.clone().add(V(0.55, 1.5, -1.9).lerp(V(0.4, 1.55, -1.35), easeInOut(clamp(u / 3))))); cam.lookAt(base.clone().add(V(0, 1.4, 0))); cam.fov = 56; cam.updateProjectionMatrix();
      K.root.visible = false; this.cup.visible = false; this.d.leaf.rotation.y = 0;
      if (!this.tp) { this.tp = true; A.sfx('ding', 1); UI.sceneCap('', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') }); }
      if (u > 0.7 && !this.zr) { this.zr = true; A.music(null); A.sfx('trombone', 1); UI.sceneCap('every. single. <em>time.</em>', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') + `<div class="tipchg"><s>${UI.money(this.G.tip)}</s><b>$0.00</b></div>` }); }
      if (u > 3.3 && !this.fin) { this.fin = true; UI.remove('scene'); UI.skipChip(false); this.phase = 'post'; this.onDone(this.line); }
    }
  }
  updatePost(dt) { const R = this.G.R; this.t += dt; R.walk('facepalm', 2.2, { offset: V(0, 0, 0), yaw: 0, loop: false }); }
  // ---------------------------------------------------------------- arrive (in the city scene)
  updateArrive(dt) {
    const t = (this.t += dt), R = this.G.R, cam = this.camera;
    const door = this.door, sign = this.sign, stop = this.stop;
    if (t < 1.0) { R.ride(this.G.dist + easeOut(t) * 3, { lean: 0.3, footDown: smooth(seg(t, 0.4, 0.9)) }); }
    else {
      R.root.position.copy(stop); R.root.rotation.set(0, Math.PI, 0);
      R.ride(0, { footDown: 1 });
      const run = seg(t, 1.6, 4.2), startL = V(0.6, 0, 0.2), doorL = R.root.worldToLocal(door.clone().add(V(-0.8, 0, 0)));
      R.walk(t < 1.6 ? 'idle' : 'jog', (t - 1) * 1.2, { offset: startL.clone().lerp(doorL, easeOut(run) * 0.92), yaw: Math.atan2(doorL.x - startL.x, doorL.z - startL.z) * smooth(seg(t, 1.0, 1.6)) });
    }
    const k = easeInOut(seg(t, 0, 1.4));
    const head = this.corner.clone().add(V(-17.8, 1.7, -8.7)), tgt = V(sign.x, 3.0, sign.z - 1.6);
    cam.position.copy(this.c0.clone().lerp(head, k)); cam.lookAt(this.l0.clone().lerp(tgt, k));
    cam.fov = damp(cam.fov, 70, 3, dt); cam.updateProjectionMatrix();
    this.sun.target.position.copy(this.corner); this.sun.position.copy(this.corner).add(V(-80, 60, 90));
    if (t > 0.9 && !this.placed) { this.placed = true; this.UI.place('Citi Tower', '101 Lake Ave · Church St', 4200); this.UI.thought(KY.pickLine(KY.THOUGHTS.tower)); this.Audio.sfx('pop', 0.7); }
    if (t > 2.6) this.toLocked();
  }
  skip() {
    if (this.phase === 'arrive') this.toLocked();
    else if (this.phase === 'elevator') this.toStairs();
    else if (this.phase === 'door' && this.t < 3.6) { this.t = 3.6; this.UI.remove('scene'); this.cup.visible = false; this.Audio.sfx('boom', 0.4); }
    else if (this.phase === 'door' && this.t < 6.8) { this.t = 6.85; }
  }
  update(dt, T) {
    if (this.phase === 'arrive') this.updateArrive(dt);
    else if (this.phase === 'locked') this.updateLocked(dt);
    else if (this.phase === 'elevator') this.updateElevator(dt);
    else if (this.phase === 'stairs') this.updateStairs(dt);
    else if (this.phase === 'door') this.updateDoor(dt);
    else if (this.phase === 'post') this.updatePost(dt);
  }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() {
    window.removeEventListener('keydown', this.keyH);
    const R = this.G.R; R.bike.visible = true; R.helm.visible = true; R.cup.visible = true; R.root.visible = true;
    if (this.K) this.K.root.removeFromParent();
    this.cup?.removeFromParent();
    this.active = false;
  }
}
