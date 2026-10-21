// The delivery finale: pull up at the CITITOWER 101 canopy (real-life vs in-game panel) → elevator OUT OF ORDER
// → climb 20 floors (alternate LEFT/RIGHT taps) → Kyle S opens 2004, takes it, sips, complains → takes the tip.
import { THREE, V, clamp, lerp, seg, smooth, easeIn, easeOut, easeInOut, damp, box, cyl, mat } from './core.js';
import { character, ik2, coldCup } from './chars.js';
import * as Sets from './sets.js';
import * as KY from './kyle.js';
import { pitbull, prefetchDog } from './dog.js';
import { buildEncounter, prefetchHallFolks, hallWindows, HALL_KINDS } from './hallqte.js';

// floor-20 hallway blocking (corridor runs along -z, x ∈ ±1.24): courier walks in from the stairs, she walks the dog toward him
const HALL = { c0: 3.0, c: -1.5, cx: 0.25, d0: -6.4, d: -2.95, dx: -0.3, w0: -7.2, w: -3.75, wx: -0.64 };
const STEP_FLIGHTS = 0.78; // flights per clean step: ~49 alternating taps to the 20th floor (~7 s of mashing)
const LUNGE = 0.17, DODGE_X = { arrowleft: -0.52, arrowright: 0.52, arrowup: 0 };

const KYLE_LOOK = { maps: { casualsuit06: 'tex/kyle_fit.jpg', shoes05: 'tex/kyle_shoes.jpg' } };
let kyleP = null;
export function prefetchKyle() { return (kyleP ||= character('m/kyle.glb', KYLE_LOOK).then(async (K) => { await K.load('idle', 'shrug'); for (const f of ['LeftFoot', 'RightFoot']) K.bone(f).scale.setScalar(1.18); K.captureRest(); return K; })); }

let walkP = null;
export function prefetchWalker() { return (walkP ||= character('m/tourist_f.glb', { tint: { casualsuit02: 0x8e2f45 } }).then(async (C) => { await C.load('walk', 'idle', 'shrug'); return C; })); }
let recP = null;
export function prefetchReceptionist() { return (recP ||= character('m/tourist_f.glb', { tint: { casualsuit02: 0x3a4a6a } }).then(async (C) => { await C.load('sitidle', 'idle', 'point'); return C; })); }
function phone() { const g = new THREE.Group(); box(0.075, 0.15, 0.012, mat(0x111214, { roughness: 0.3 }), 0, 0, 0, g); box(0.065, 0.13, 0.002, new THREE.MeshBasicMaterial({ color: 0x8fd8ff }), 0, 0, 0.007, g); return g; }
let puffTex = null;
function canvasTexOnce() { if (puffTex) return puffTex; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(235,235,235,1)'); g.addColorStop(1, 'rgba(235,235,235,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); puffTex = new THREE.CanvasTexture(c); return puffTex; }
// the iced coffee sits in a character's right palm: offset along the hand bone, upright in world space
function palmCup(cup, C) { const h = C.bone('RightHand'); h.updateWorldMatrix(true, false); cup.position.copy(h.localToWorld(V(0, 0.075, 0.035))).add(V(0, -0.07, 0)); cup.rotation.set(0, 0, 0); }
function hazardProp(kind) {
  const g = new THREE.Group();
  if (kind === 'dog') { const fur = mat(0x9a6a3a, { roughness: 0.9 }); box(0.5, 0.26, 0.24, fur, 0, 0.32, 0, g); box(0.2, 0.2, 0.2, fur, 0.32, 0.48, 0, g); box(0.1, 0.08, 0.12, mat(0x2a1a10), 0.45, 0.44, 0, g); for (const [x, z] of [[-0.18, -0.08], [-0.18, 0.08], [0.18, -0.08], [0.18, 0.08]]) box(0.07, 0.22, 0.07, fur, x, 0.11, z, g); box(0.22, 0.05, 0.05, fur, -0.33, 0.42, 0, g).rotation.z = 0.6; }
  if (kind === 'wet') { const y = mat(0xffd21a, { roughness: 0.6 }); for (const sx of [-1, 1]) { const p = box(0.4, 0.62, 0.02, y, 0, 0.3, sx * 0.1, g); p.rotation.x = sx * 0.3; } box(1.0, 0.005, 0.8, mat(0x8ab8d8, { roughness: 0.02, metalness: 0.4 }), 0, 0.005, 0, g); }
  if (kind === 'bucket') { cyl(0.2, 0.17, 0.32, mat(0xffd21a, { roughness: 0.6 }), 16, 0, 0.16, 0, g); const st = cyl(0.015, 0.015, 1.2, mat(0x8a6a4a), 6, 0.05, 0.6, 0, g); st.rotation.z = 0.35; }
  g.rotation.y = Math.PI / 2; g.scale.setScalar(1.35); // read clearly from the stairwell camera
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
    prefetchKyle(); prefetchReceptionist(); prefetchWalker(); prefetchDog(); prefetchHallFolks(); G.R.root.visible = true;
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
    this.G.R.bike.rotation.set(0, 0, 0); this.UI.remove('akira');
    const { UI, Audio, G } = this;
    UI.remove('scene'); UI.skipChip(false); document.querySelectorAll('.place').forEach((e) => e.remove());
    this.phase = 'loadingLocked';
    const s = interiorScene(this.world.environment);
    const out = new THREE.DirectionalLight(0xfff0dc, 1.2); out.position.set(4, 9, 14); s.add(out);
    const lob = Sets.lobby({ glass: true }); s.add(lob); this.lob = lob;
    const rec = await prefetchReceptionist(); this.rec = rec; s.add(rec.root);
    rec.root.position.set(-1.6, 0.16, 1.72); rec.root.rotation.set(0, 0, 0);
    if (!rec.phone) rec.phone = rec.attach('RightHand', phone(), [0, 0.09, 0.03], [0.3, 0, 0], 1);
    this.stool = cyl(0.22, 0.22, 0.78, mat(0x1b1d22), 14, -1.6, 0.39, 1.57, s);
    // a big readable tell over her head: 📱 = on her phone, ❗ = looking at you
    const tell = (txt, bg) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.font = '72px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(txt, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    this.tells = { phone: tell('📱', '#2b2f36'), looking: tell('❗', '#18a957'), eyeroll: tell('🙄', '#d23a2f') };
    this.tell = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tells.phone, depthTest: false })); this.tell.scale.set(0.42, 0.42, 1); this.tell.renderOrder = 9; s.add(this.tell);
    const R = G.R; s.add(R.root); R.bike.visible = false; R.helm.visible = false; R.cup.visible = false;
    R.root.rotation.set(0, Math.PI, 0); R.root.position.set(1.8, 0, 5.0);
    this.cup = coldCup(); s.add(this.cup);
    this.scene = s; this.phase = 'locked'; this.t = 0; this.camera.fov = 42; this.camera.updateProjectionMatrix(); // cut straight to the shot's lens
    Object.assign(this, { notice: 0, look: 0, dphase: 'phone', phaseT: 0, penalty: 0, lastSide: -1, knockCd: 0, waveT: 0, knockT: 0, wavePh: 0, buzzed: null, inputOn: false, rattle: 0, window: G.delivered > 0 ? 0.55 : 0.8, glanceIn: null });
    this.bui = UI.deskUI(); this.bui.el.style.opacity = 0; this.bui.bind(() => this.wave(this.lastSide === 0 ? 1 : 0), () => this.knock());
    this.keyH = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (this.phase === 'locked') { if (k === 'arrowleft' || k === 'a') this.wave(0); else if (k === 'arrowright' || k === 'd') this.wave(1); else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') { e.preventDefault(); this.knock(); } } else if (this.phase === 'stairs') this.stairKey(k, e); };
    window.addEventListener('keydown', this.keyH);
    Audio.music('tense');
  }
  wave(side) {
    if (!this.inputOn || this.buzzed != null || side === this.lastSide) return;
    this.lastSide = side; this.waveT = 0.3; this.wavePh = side; this.Audio.sfx('whoosh', 0.2, 1.8);
    if (this.dphase === 'phone') { this.notice = Math.min(1, this.notice + 0.065); if (this.notice >= 1 && this.glanceIn == null) this.glanceIn = 0.25 + Math.random() * 1.6; } // full: she'll glance up at some point — keep waving
  }
  knock() {
    if (!this.inputOn || this.buzzed != null || this.knockCd > 0) return;
    this.knockCd = 0.3; this.knockT = 0.22; this.Audio.sfx('knock', 1, 0.9 + Math.random() * 0.2);
    if (this.dphase === 'looking') this.buzz(this.t - this.t0 + this.penalty);
    else if (this.dphase === 'phone') { this.setDesk('eyeroll'); this.notice = Math.max(0, this.notice - 0.4); this.penalty += 1; this.UI.pop('TOO EARLY', 'she’s ignoring you now · +1s'); this.Audio.sfx('bwomp', 0.5, 1.4); }
  }
  setDesk(ph) { this.dphase = ph; this.phaseT = 0; this.tell.material.map = this.tells[ph]; this.tell.material.needsUpdate = true; if (ph === 'looking') this.Audio.sfx('pop', 0.9, 1.7); }
  updateLocked(dt) {
    const t = (this.t += dt), R = this.G.R, rec = this.rec, cam = this.camera, UI = this.UI, A = this.Audio, lob = this.lob;
    // beat 1: he pushes the door. it rattles. locked.
    if (t > 0.35 && !this.rat) { this.rat = true; A.sfx('rattle', 1); this.rattle = 0.45; UI.sceneCap('locked.'); }
    if (t > 1.3 && !this.inputOn) { this.inputOn = true; this.t0 = t; UI.remove('scene'); this.bui.el.style.opacity = 1; UI.dm(KY.pickLine(KY.LOBBY_TEXTS.slice(0, 2))); }
    this.rattle = Math.max(0, this.rattle - dt);
    lob.userData.doors.forEach((d, i) => { d.position.x = (i ? 0.75 : -0.75) + Math.sin(t * 70) * this.rattle * 0.02 + (this.buzzed != null ? (i ? 1 : -1) * 1.4 * smooth(seg(t - this.buzzed, 0.3, 1.1)) : 0); });
    this.knockCd = Math.max(0, this.knockCd - dt); this.waveT = Math.max(0, this.waveT - dt); this.knockT = Math.max(0, this.knockT - dt);
    if (this.inputOn && this.buzzed == null) {
      const el = t - this.t0; this.phaseT += dt;
      if (this.dphase === 'phone') this.notice = Math.max(0, this.notice - dt * 0.16);
      if (this.glanceIn != null && this.dphase === 'phone') { if (this.notice < 0.85) this.glanceIn = null; else if ((this.glanceIn -= dt) <= 0) { this.glanceIn = null; this.setDesk('looking'); } }
      if (this.dphase === 'looking' && this.phaseT > this.window) { this.setDesk('phone'); this.notice = 0.5; this.penalty += 0.5; UI.pop('MISSED HER', 'back to her phone'); A.sfx('bwomp', 0.4, 1.2); }
      if (this.dphase === 'eyeroll' && this.phaseT > 0.9) this.setDesk('phone');
      if (el > 3.2 && !this.tx2) { this.tx2 = true; UI.dm(KY.pickLine(KY.LOBBY_TEXTS.slice(2))); }
      if (el > 20) this.buzz(el + this.penalty);
    }
    this.look = damp(this.look, this.dphase === 'looking' || this.buzzed != null ? 1 : this.dphase === 'eyeroll' ? 0.6 : 0, 12, dt);
    this.bui.set({ notice: this.notice, phase: this.buzzed != null ? 'looking' : this.dphase, u: this.dphase === 'looking' ? 1 - this.phaseT / this.window : 0 });
    this.tell.position.copy(rec.boneWorld('Head')).add(V(0, 0.42, 0)); const pulse = this.dphase === 'looking' ? 1 + 0.12 * Math.sin(t * 18) : 1; this.tell.scale.set(0.55 * pulse, 0.55 * pulse, 1); this.tell.visible = this.inputOn && this.buzzed == null;
    // receptionist: seated, eyes on the phone; glances up at the door
    rec.pose(this.buzzed != null && t - this.buzzed > 0.2 && t - this.buzzed < 1.6 ? [['sitidle', 1 + t * 0.6, 0.6], ['point', 0.6 + (t - this.buzzed) * 0.5, 0.4]] : [['sitidle', 1 + t * 0.6]]);
    const hd = rec.bone('Head'), nk = rec.bone('Neck');
    nk.rotateX(0.45 * (1 - this.look)); hd.rotateX(0.4 * (1 - this.look) - 0.08 * this.look); hd.rotateY(0.35 * this.look); if (this.dphase === 'eyeroll') hd.rotateZ(0.25 * Math.sin(Math.min(1, this.phaseT / 0.9) * Math.PI)); hd.updateMatrixWorld(true);
    const ph = rec.root.localToWorld(V(-0.08 + 0.06 * this.look, 1.05 - 0.2 * this.look, 0.38 - 0.1 * this.look));
    ik2(rec.bone('RightArm'), rec.bone('RightForeArm'), rec.bone('RightHand'), ph, rec.root.localToWorld(V(-0.5, 0.7, -0.2)));
    // courier: waves both arms over his head, knocks on the glass
    if (this.buzzed != null && t - this.buzzed > 0.9) {
      const k = smooth(seg(t - this.buzzed, 0.9, 1.8));
      R.root.position.set(1.8 - k * 1.2, 0, 5.0 - k * 3.4); R.walk('jog', t * 1.4, { offset: V(0, 0, 0), yaw: 0 });
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
    // camera: a two-shot through the glass — him waving on the left, her large on the right; push in when she looks up
    const zoom = smooth(this.look);
    cam.position.copy(V(0.25, 1.75, 8.4).lerp(V(-1.3, 1.6, 7.0), zoom)); cam.lookAt(V(0.1, 1.35, 2.9).lerp(V(-1.4, 1.45, 2.2), zoom)); // zoom lines up between the door mullions
    cam.fov = damp(cam.fov, 42 - zoom * 10, 6, dt); cam.updateProjectionMatrix();
  }
  buzz(el) {
    const { UI, A = this.Audio, G } = this;
    this.buzzed = this.t; UI.remove('buzzui');
    const g = el < 4.5 ? ['PERFECT', 600, 'she buzzed you in instantly'] : el < 8 ? ['GOOD', 300, 'she sighed and buzzed you in'] : ['SLOW', 100, '“ugh. fine.”'];
    G.score += g[1]; G.fin = { ...(G.fin || {}), door: g[0], doorT: el };
    UI.pop(g[0], `${g[2]} · +${g[1]}`); A.sfx('buzz', 0.9); setTimeout(() => A.sfx('ding', 0.5), 400);
    UI.sceneCap(el > 20 ? '“ugh. fine.”' : 'bzzzt.');
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
    const top = new THREE.DirectionalLight(0xeef4ff, 0.9); top.position.set(6, 80, 4); s.add(top); s.add(new THREE.AmbientLight(0xfff6ea, 0.9)); const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(10, 40, 3); s.add(key);
    this.scene = s;
    const R = G.R; s.add(R.root);
    this.cup.removeFromParent(); s.add(this.cup);
    // hazards on three landings (random floors + kinds): a dog, a wet floor, a mop bucket
    const kinds = ['dog', 'wet', 'bucket'].sort(() => Math.random() - 0.5), floors = [5 + Math.floor(Math.random() * 3), 10 + Math.floor(Math.random() * 3), 15 + Math.floor(Math.random() * 3)];
    this.hazards = []; void floors; void kinds; // no landing QTEs: the stairs are pure rhythm — never the same foot twice, as fast as you can
    Object.assign(this, { flights: 0, sCur: 0, beat: 0, stumble: 0, perfects: 0, misses: 0, haz: null, hazT: 0, dodge: 0 });
    UI.skipChip(false);
    Audio.music('full');
    this.nextSide = null;
    this.ui = UI.stairsUI({ onTap: (side) => this.stairKey(side ? 'arrowright' : 'arrowleft') });
    if (!this.keyH) { this.keyH = (e) => { if (!e.repeat && this.phase === 'stairs') this.stairKey(e.key.toLowerCase(), e); }; window.addEventListener('keydown', this.keyH); }
    UI.dm(KY.pickLine(KY.STAIRS_TEXTS[0][1]), { ttl: 2600 });
  }
  stairKey(k, e) {
    const map = { a: 'arrowleft', d: 'arrowright', w: 'arrowup', ' ': 'arrowup', s: 'arrowdown' }; k = map[k] || k;
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) return;
    e?.preventDefault();
    if (this.haz) { this.hazPress(k); return; }
    if (k === 'arrowleft' || k === 'arrowright') this.step(k === 'arrowright' ? 1 : 0);
  }
  // mash ← → alternately; the same foot twice (or a wrong key on a landing) and you go down a floor
  step(side) {
    if (this.phase !== 'stairs' || this.climbed || this.tripT > 0 || this.haz) return;
    const A = this.Audio, G = this.G;
    if (this.nextSide != null && side !== this.nextSide) { this.misstep('same foot twice'); return; }
    this.nextSide = 1 - side; this.flights = Math.min(38, this.flights + STEP_FLIGHTS); G.score += 8;
    this.combo = (this.combo || 0) + 1; if (this.combo % 20 === 0) { A.sfx('ice', 0.4, 1.4); this.UI.pop(`${this.combo} CLEAN`, 'keep the rhythm', { top: 20 }); G.score += 50; }
    A.sfx('step', 0.9, 0.85 + side * 0.15 + Math.random() * 0.08); this.ui.flash?.('hit');
  }
  misstep(why) {
    const G = this.G; this.misses++; this.combo = 0;
    const floorBefore = Math.floor(this.flights / 2);
    this.flights = Math.max(0, Math.min(this.flights, floorBefore * 2) - 2); // back to the start of the floor below
    this.nextSide = null; this.trip(1.1); G.ice = Math.max(0, G.ice - 3);
    this.UI.pop('TRIPPED', `${why} · down a floor`, { top: 20 });
  }
  // fall over on the steps where you are, lie there a beat, get back up — costs time, keeps your progress
  trip(dur = 1.4) { if (this.tripT > 0) return; this.tripT = dur; this.tripDur = dur; this.stumble = dur; this.Audio.sfx('crash', 0.45, 1.5); this.Audio.sfx('step', 1.2, 0.5); navigator.vibrate?.(40); }
  hazPress(k) {
    const h = this.haz; if (!h) return;
    if (this.hazT < 0.09) return; // a mash already in flight when the prompt pops doesn't count
    const ok = k === h.key;
    this.endHaz(ok, ok ? '' : 'wrong way');
  }
  endHaz(ok, why = '') {
    const h = this.haz, G = this.G, A = this.Audio; this.haz = null; h.done = true;
    const NAMES = { dog: ['STEPPED AROUND THE DOG', 'the dog got you'], wet: ['HOPPED THE WET FLOOR', 'slipped on the wet floor'], bucket: ['DODGED THE MOP BUCKET', 'kicked the mop bucket'] };
    if (ok) { this.hq.result('NICE', NAMES[h.kind][0]); G.score += 200; A.sfx('ding', 0.6, 1.4); this.dodge = 1; this.dodgeDir = h.key === 'arrowleft' ? -1 : h.key === 'arrowright' ? 1 : 0; }
    else { this.hq.result('MISS', why || NAMES[h.kind][1]); this.misstep(NAMES[h.kind][1]); this.tripT = this.tripDur = 1.6; G.ice = Math.max(0, G.ice - 4); if (h.kind === 'dog') A.sfx('bark', 0.8); }
    this.nextSide = null;
  }
  updateStairs(dt) {
    const R = this.G.R, cam = this.camera, UI = this.UI;
    this.t += dt;
    this.stumble = Math.max(0, this.stumble - dt); this.dodge = Math.max(0, this.dodge - dt * 1.5); this.tripT = Math.max(0, (this.tripT || 0) - dt);
    const target = this.flights;
    this.sCur = damp(this.sCur, target, this.sCur > target ? 5 : 9, dt);
    const { p, dir } = Sets.stairPath(Math.min(37.999, this.sCur));
    const side = this.dodge > 0 ? Math.sin(Math.PI * this.dodge) * 0.45 * (this.dodgeDir || 0) : 0;
    R.root.position.copy(p).add(V(side, 0.04 + (this.dodge > 0 && !this.dodgeDir ? Math.sin(Math.PI * this.dodge) * 0.4 : 0), 0)); R.root.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    const moving = target - this.sCur > 0.05;
    R.walk(moving ? 'jog' : 'idle', this.t * 1.6, { offset: V(0, 0, 0), yaw: 0 });
    if (this.tripT > 0) { // down onto the steps and back up
      const u = 1 - this.tripT / this.tripDur, fall = smooth(seg(u, 0, 0.22)), rise = smooth(seg(u, 0.62, 0.95)), k = fall * (1 - rise);
      R.walk(u < 0.62 ? 'idle' : 'defeated', u < 0.62 ? 1 : (u - 0.62) * 2.5, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.62 });
      R.root.rotateX(1.15 * k); R.root.position.y += 0.15 * k;
      const sp = R.C.bone('Spine'); sp.rotateX(0.4 * k); sp.updateMatrixWorld(true);
      if (u > 0.2 && u < 0.6 && !this.tripTxt) { this.tripTxt = true; }
    } else this.tripTxt = false;
    R.C.root.updateMatrixWorld(true);
    palmCup(this.cup, R.C);
    const look = R.root.position.clone().add(V(0, 0.9, 0));
    const want = V(this.haz ? 4.6 : 9.5, R.root.position.y + (this.haz ? 1.0 : 1.6), this.haz ? R.root.position.z * 0.6 : 0.2);
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
    const hw = 0.78 - Math.min(1, this.flights / 38) * 0.16;
    if (this.haz) { this.hazT += dt; this.hq.set(1 - this.hazT / hw); if (this.hazT > hw) this.endHaz(false, 'too slow'); }
    for (const h of this.hazards) if (h.kind === 'dog') h.m.rotation.y = Math.sin(this.t * 6) * 0.15;
    this.ui.set({ floor, next: this.haz ? -1 : this.nextSide ?? -1, time: 1 - Math.min(1, this.t / 14) });
    for (const [fl, arr] of KY.STAIRS_TEXTS.slice(1)) if (floor >= fl && !this['st' + fl]) { this['st' + fl] = true; UI.dm(KY.pickLine(arr)); this.Audio.sfx('pop', 0.7); }
    if (this.sCur >= 37.9 && !this.climbed) {
      this.climbed = true; this.G.stairTime = this.t; this.Audio.sfx('ding', 1);
      const g = this.misses === 0 && this.t < 9.5 ? 'PERFECT' : this.misses <= 2 && this.t < 13 ? 'GOOD' : 'GASSED';
      const pts = { PERFECT: 800, GOOD: 400, GASSED: 100 }[g];
      this.G.score += pts; this.G.fin = { ...(this.G.fin || {}), stairs: g, stairT: this.t };
      UI.pop('FLOOR 20', `${g === 'GASSED' ? 'gassed 😮‍💨' : g + ' climb 💪'} · +${pts}`); setTimeout(() => this.toDoor(), 900);
    }
  }
  // ---------------------------------------------------------------- floor 20: the neighbour's pitbull, then Kyle's door
  async toDoor() {
    if (this.phase !== 'stairs') return;
    const { UI, G } = this;
    window.removeEventListener('keydown', this.keyH);
    UI.remove('climbui'); UI.remove('stairsui'); UI.remove('qte');
    this.phase = 'loadingDoor';
    const s = interiorScene(this.world.environment); s.environmentIntensity = 0.5;
    const hall = Sets.hallway(); s.add(hall);
    this.hall = hall; this.d = hall.userData.doors[2004];
    // one of three floor-20 encounters each run: the pitbull, the ladder guy, or the freshly mopped floor
    const kind = this.hallKind = globalThis.__hallKind || HALL_KINDS[Math.floor(Math.random() * HALL_KINDS.length)];
    this.enc = null;
    const K = await prefetchKyle();
    s.add(K.root); K.root.visible = false; this.K = K;
    if (kind === 'dog') {
      const [W, dog] = await Promise.all([prefetchWalker(), pitbull()]);
      s.add(W.root); W.root.visible = true; this.W = W;
      this.dog = dog; s.add(dog.root);
      this.leash = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.6 })); s.add(this.leash);
    } else this.enc = await buildEncounter(kind, this, s);
    // the red "it's coming here" floor marker + a ❗ over the dog while he winds up
    this.zoneM = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
    this.zoneM.rotation.x = -Math.PI / 2; this.zoneM.renderOrder = 3; s.add(this.zoneM);
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ff2a1a'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.font = '900 84px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('!', 64, 70);
    const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace;
    this.bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, depthTest: false })); this.bang.renderOrder = 9; this.bang.visible = false; s.add(this.bang);
    const R = G.R; s.add(R.root);
    this.cup.removeFromParent(); s.add(this.cup);
    this.scene = s;
    this.startHall();
  }
  startHall() {
    const { UI, Audio } = this;
    this.phase = 'hall'; this.t = 0; this.camK = null; this.palmCup = palmCup;
    if (this.enc) {
      this.keyH = (e) => { if (!e.repeat && this.phase === 'hall') this.enc.key(e.key.toLowerCase(), e); };
      window.addEventListener('keydown', this.keyH);
      UI.skipChip(false); this.enc.start(); return;
    }
    this.W.wave = 0;
    // three attacks, never the same side twice in a row, each faster than the last
    const sides = []; for (let i = 0; i < 3; i++) { const opts = [-1, 0, 1].filter((v) => v !== sides[i - 1]); sides.push(opts[Math.floor(Math.random() * opts.length)]); }
    this.h = { st: 'intro', t: 0, i: 0, sides, res: [], pen: 0, slow: 1, cx: HALL.cx, cz: HALL.c0, dx: HALL.dx, dz: HALL.d0, wz: HALL.w0, gait: 0, barkT: 9, nextBark: 0, shake: 0, jawK: 0, dodge: null, atk: null, look: 0, bit: 0 };
    this.keyH = (e) => { if (!e.repeat && this.phase === 'hall') this.hallKey(e.key.toLowerCase(), e); };
    window.addEventListener('keydown', this.keyH);
    Audio.music('tense'); Audio.sfx('creak', 0.6, 1.3);
    UI.skipChip(false);
  }
  hallKey(k, e) {
    if (this.enc) return this.enc.key(k, e);
    const h = this.h, map = { a: 'arrowleft', d: 'arrowright', w: 'arrowup', ' ': 'arrowup' }; k = map[k] || k;
    if (!['arrowleft', 'arrowright', 'arrowup'].includes(k)) return;
    e?.preventDefault();
    if ((h.st !== 'tele' && h.st !== 'lunge') || h.dodge) return; // one committed move per attack
    h.dodge = { k, t: 0, ok: k === h.atk.key };
    this.Audio.sfx('whoosh', 0.6, k === 'arrowup' ? 1.3 : 1.6);
  }
  bark(g = 0.9) { const h = this.h; h.barkT = 0; this.Audio.sfx('bark', g, 0.92 + Math.random() * 0.16); h.shake = Math.max(h.shake, 0.25); }
  resolveBite() {
    const h = this.h, a = h.atk, G = this.G, UI = this.UI, A = this.Audio, ok = h.dodge?.ok;
    h.res.push(ok); this.dui.set(h.res);
    A.sfx('snap', 1, ok ? 1 : 0.9);
    if (ok) {
      const pts = 150 * (h.i + 1); G.score += pts; h.slow = 0.22; // a beat of slow-mo on the empty snap
      this.hq.result(h.i === 2 && h.res.every(Boolean) ? 'PERFECT' : 'NICE', a.side === 0 ? 'hopped it' : 'sidestepped');
      UI.pop('DODGED', `+${pts}`, { top: 24 });
    } else {
      h.bit = 1; h.pen += 1.6; G.ice = Math.max(0, G.ice - 7); G.combo = 0; G.mult = 1;
      this.hq.result('MISS', h.dodge ? (h.dodge.k === 'arrowup' || Math.sign(DODGE_X[h.dodge.k]) === a.side ? 'dodged into it' : 'wrong way') : 'too slow');
      UI.pop(a.side === 0 ? 'ANKLE BITER' : 'GOT YOUR SLEEVE', '+1.6s · ice −7', { top: 24 }); A.sfx('crash', 0.35, 1.6); A.sfx('growl', 0.9, 1.1); navigator.vibrate?.(60);
      h.shake = 0.9;
    }
  }
  hallLine(text, ttl = 1700) { const UI = this.UI; UI.sceneCap(`<span style="color:#ffb3c1">neighbour:</span> “${text}”`); clearTimeout(this.capT); this.capT = setTimeout(() => this.phase === 'hall' && UI.remove('scene'), ttl); }
  updateHall(rdt) {
    if (this.enc) return this.enc.update(rdt);
    const h = this.h, R = this.G.R, D = this.dog, W = this.W, cam = this.camera, UI = this.UI, A = this.Audio;
    h.slow = damp(h.slow, 1, 2.2, rdt); const dt = rdt * h.slow;
    this.t += dt; h.t += dt; h.barkT += dt; h.shake = Math.max(0, h.shake - rdt * 2.5);
    const jawBark = Math.exp(-h.barkT * 11) * Math.min(1, h.barkT / 0.03);
    // defaults; each state overrides what it needs
    let dp = { gait: h.gait, stride: 0, crouch: 0.25, angry: 1, tail: 0.5, wag: 0, jaw: 0.08 + jawBark * 0.9, headYaw: 0, headPitch: -jawBark * 0.25, t: this.t };
    let dogYaw = 0, dogFwd = 0, wWalk = false, wPull = 0, cWalk = 0, cYaw = Math.PI, cDx = 0, cDy = 0, cTilt = 0, camK = 'game';
    const home = V(HALL.dx, 0, HALL.d), toC = Math.atan2(h.cx - h.dx, h.cz - h.dz);
    if (h.st === 'intro') {
      // he walks in; she walks him toward you; the dog clocks you, plants, and loses it
      const t = h.t, walk = 1 - smooth(seg(t, 1.5, 2.0));
      h.cz = lerp(HALL.c0, HALL.c, easeOut(seg(t, 0, 2.0)) ); cWalk = walk;
      const stop = smooth(seg(t, 1.15, 1.45));
      h.dz = lerp(HALL.d0, HALL.d, Math.min(1, seg(t, 0, 1.45) * 1.0)); h.wz = lerp(HALL.w0, HALL.w, easeOut(seg(t, 0, 1.95)));
      h.gait += dt * 13 * (1 - stop); dp.stride = 1 - stop; dp.angry = stop; dp.tail = 0.1 + stop * 0.5; dp.wag = 1 - stop; dp.crouch = stop * 0.3; dp.jaw = stop * (0.08 + jawBark * 0.9);
      wWalk = t < 1.95; wPull = stop * 0.6;
      if (t > 1.5 && !h.g1) { h.g1 = true; A.sfx('growl', 0.9); }
      if (t > 1.95 && !h.th) { h.th = true; UI.thought('…is that a pitbull'); }
      if (t > 2.05 && h.nextBark < 4 && h.barkT > 0.28) { h.nextBark++; this.bark(); }
      if (t > 2.4 && !h.l1) { h.l1 = true; this.hallLine('BRUNO. he’s never like this i swear', 2100); }
      camK = t < 2.0 ? 'follow' : t < 3.6 ? 'dogcu' : 'game';
      if (t > 3.6) { h.st = 'standoff'; h.t = 0; h.wait = 1.0 + Math.random() * 0.5; this.dui = UI.dogUI(); this.dui.bind((k) => this.hallKey(k)); }
    } else if (h.st === 'standoff') {
      // pacing at the end of the leash, barking
      dp.crouch = 0.3; h.dx = HALL.dx + Math.sin(this.t * 3.1) * 0.13; dp.stride = 0.35; h.gait += dt * 7; dp.headYaw = Math.sin(this.t * 2.3) * 0.12;
      if (h.barkT > 0.32 + Math.random() * 0.25) this.bark(0.8);
      wPull = 0.5;
      if (h.t > h.wait) {
        const side = h.sides[h.i], key = side === 0 ? 'arrowup' : side < 0 ? 'arrowright' : 'arrowleft';
        const target = V(h.cx + side * 0.24, side === 0 ? 0.25 : 0.95, h.cz);
        h.atk = { side, key, target, tele: hallWindows(this.G)[h.i], from: V(h.dx, 0, h.dz) };
        h.st = 'tele'; h.t = 0; h.dodge = null;
        const LBL = { '-1': 'he’s going for your <b>LEFT</b> — dodge right', 0: 'going <b>LOW</b> for your ankles — jump', 1: 'he’s going for your <b>RIGHT</b> — dodge left' };
        this.hq = UI.qte({ key, label: LBL[side] }); A.sfx('growl', 1, 1.15); A.sfx('pop', 0.7, 0.6);
      }
    } else if (h.st === 'tele' || h.st === 'lunge') {
      const a = h.atk, side = a.side;
      if (h.st === 'tele') {
        // the wind-up: drops low, weight onto the back legs, head snaps to where he's going, lip curls
        const k = smooth(clamp(h.t / (a.tele * 0.55)));
        dp.crouch = 0.3 + 0.7 * k; dp.pitch = side === 0 ? 0.12 * k : -0.05 * k; dp.roll = -side * 0.12 * k; dp.fwd = -0.08 * k;
        dp.headYaw = side * 0.42 * k; dp.headPitch = side === 0 ? 0.35 * k : -0.15 * k; dp.jaw = 0.25 + Math.sin(this.t * 60) * 0.04; dp.tail = 0.7;
        dogYaw = Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z) * k;
        h.dx = a.from.x - Math.sin(dogYaw) * 0.04 * k;
        this.hq.set(1 - h.t / (a.tele + LUNGE));
        if (h.t >= a.tele) { h.st = 'lunge'; h.t = 0; this.bark(1.1); }
      } else {
        // the lunge: launches at the target, jaws wide, snaps shut at contact
        const u = clamp(h.t / LUNGE), e = 1 - (1 - u) * (1 - u), dir = Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z);
        const dist = Math.hypot(a.target.x - a.from.x, a.target.z - a.from.z) - 0.52;
        h.dx = a.from.x + Math.sin(dir) * dist * e; h.dz = a.from.z + Math.cos(dir) * dist * e; dogYaw = dir;
        const high = side !== 0;
        dp.crouch = 1 - u; dp.rise = high ? Math.sin(u * Math.PI * 0.6) * 0.36 : 0.02; dp.pitch = high ? -0.55 * u : 0.15; dp.reach = u; dp.stride = 0;
        dp.headPitch = high ? -0.15 : 0.45; dp.jaw = u < 0.85 ? 1 : 0.2; dp.angry = 1; dp.tail = 0.9;
        this.hq.set(1 - (a.tele + h.t) / (a.tele + LUNGE));
        wPull = 1;
        if (h.t >= LUNGE) { h.st = 'res'; h.t = 0; h.lungeEnd = V(h.dx, 0, h.dz); h.lungeYaw = dir; this.resolveBite(); }
      }
    } else if (h.st === 'res') {
      // either chomping air (and yanked back) or hanging off your sleeve shaking his head
      const a = h.atk, high = a.side !== 0, hold = h.bit ? 0.75 : 0.12, back = smooth(seg(h.t, hold, hold + 0.5));
      h.dx = lerp(h.lungeEnd.x, home.x, back); h.dz = lerp(h.lungeEnd.z, home.z, back); dogYaw = h.lungeYaw * (1 - back);
      dp.rise = high ? (h.bit ? 0.3 : 0.3 * (1 - smooth(seg(h.t, 0, 0.18)))) * (1 - back) : 0; dp.pitch = high ? -0.5 * (1 - back) : 0.1;
      dp.reach = 1 - smooth(seg(h.t, hold * 0.5, hold + 0.3)); dp.crouch = 0.3 * back; dp.jaw = h.bit ? 0.3 * (1 - back) : jawBark * 0.6;
      if (h.bit && h.t < hold) { dp.headYaw = Math.sin(this.t * 34) * 0.55; dp.roll = Math.sin(this.t * 34) * 0.12; }
      wPull = 1 - back * 0.5;
      if (h.t > hold + 0.05 && !h.yank) { h.yank = true; A.sfx('step', 1, 0.6); if (h.bit) this.hallLine(['BRUNO drop it!!', 'oh my god BRUNO', 'he’s playing!! he’s playing'][h.i], 1500); else if (h.i === 1) this.hallLine('he just wants to say hi!', 1400); }
      if (h.t > hold + 0.75) {
        h.i++; h.bit = 0; h.dodge = null; h.yank = false; h.t = 0;
        if (h.i >= 3) { h.st = 'bored'; this.finishDog(); } else { h.st = 'standoff'; h.wait = [1.1, 0.8, 0.6][h.i] * 0.7 + Math.random() * 0.55; }
      }
    } else if (h.st === 'bored') {
      // gets bored: sits, yawns, scratches nothing in particular, tail starts going
      const t = h.t, sit = smooth(seg(t, 0.2, 0.7)), yawn = Math.sin(Math.PI * seg(t, 0.9, 1.9));
      dp = { gait: h.gait, sit, angry: 1 - sit, tail: 0.25, wag: sit, jaw: yawn * 1.0, headPitch: -yawn * 0.4, headYaw: Math.sin(t * 1.3) * 0.2 * sit, crouch: 0, t: this.t };
      camK = t < 2.6 ? 'two' : 'game';
      if (t > 0.9 && !h.yw) { h.yw = true; A.sfx('growl', 0.35, 0.7); }
      if (t > 1.0 && !h.fr) { h.fr = true; this.hallLine('see? he’s friendly 🙂', 1800); W.wave = 1; }
      if (t > 2.5 && !h.th2) { h.th2 = true; UI.thought('friendly.', 1600); }
      if (t > 2.9) { h.st = 'pass'; h.t = 0; UI.remove('qte'); UI.skipChip(true).addEventListener('click', () => this.skip()); }
    } else if (h.st === 'pass') {
      // she walks him on past you; you squeeze by and make for 2004
      const t = h.t, T = 3.0;
      h.wz = HALL.w + t * 1.35; h.dz = h.wz + 0.75; h.dx = -0.3 + Math.sin(t * 2) * 0.03; h.gait += dt * 12; dp = { gait: h.gait, stride: 0.9, angry: 0, tail: 0.3, wag: 1, crouch: 0, jaw: jawBark * 0.6, headYaw: clamp(0.9 * smooth(seg(t, 0.3, 1.2)) * (1 - smooth(seg(t, 1.6, 2.4))), -1, 1), t: this.t };
      wWalk = true;
      if (t > 1.0 && !h.boof) { h.boof = true; this.bark(0.6); }
      const u = easeInOut(seg(t, 0, T));
      h.cz = lerp(HALL.c, Sets.DOOR_Z - 0.15, u); h.cx = lerp(HALL.cx, 0.62, smooth(seg(t, 0, 0.7))) * (1 - smooth(seg(t, 1.7, 2.6))) + 0.15 * smooth(seg(t, 1.7, 2.6));
      cWalk = 1 - smooth(seg(t, T - 0.35, T)); cYaw = lerp(Math.PI, Math.PI / 2, smooth(seg(t, T - 0.5, T)));
      camK = 'pass';
      if (t > T + 0.15) return this.enterDoor();
    }
    // ---- the courier
    const d = h.dodge;
    if (d) {
      d.t += dt;
      const dx = DODGE_X[d.k] ?? 0, k = smooth(seg(d.t, 0, 0.16)) * (1 - smooth(seg(d.t, 0.75, 1.15)));
      if (d.k === 'arrowup') { const u = seg(d.t, 0, 0.5); cDy = Math.sin(Math.PI * u) * 0.55; } else { cDx = dx * k; cTilt = -dx * 0.35 * Math.sin(Math.PI * seg(d.t, 0, 0.3)); }
    }
    const bitK = h.st === 'res' && h.bit ? 1 - smooth(seg(h.t, 0.6, 1.1)) : 0;
    const pos = V(h.cx + cDx, cDy, h.cz + bitK * 0.18 * Math.sin(this.t * 34) * 0.15);
    R.root.position.copy(pos); R.root.rotation.set(0, cYaw, 0);
    if (cWalk > 0.05) R.walk(h.st === 'pass' ? 'jog' : 'walk', this.t * (h.st === 'pass' ? 1.05 : 1.0), { offset: V(0, 0, 0), yaw: 0 });
    else if (bitK > 0) { R.C.root.position.set(0, 0, 0); R.C.root.rotation.set(0, 0, 0); R.C.pose([['idle', this.t, 1], ['reaction', 0.25 + h.t * 1.4, 0.45 * bitK, false]]); }
    else R.walk('idle', this.t, { offset: V(0, 0, 0), yaw: 0 });
    R.root.rotateZ(cTilt);
    if (bitK > 0) { R.root.rotateX(-0.12 * bitK); }
    if (cDy > 0.02) { // tuck the feet up for the hop
      R.C.root.updateMatrixWorld(true);
      for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) ik2(R.C.bone(side + 'UpLeg'), R.C.bone(side + 'Leg'), R.C.bone(side + 'Foot'), R.root.localToWorld(V(s * 0.12, 0.2 + cDy * 0.2, 0.12)), R.root.localToWorld(V(s * 0.12, 0.6, 1.2)));
    }
    R.C.root.updateMatrixWorld(true);
    palmCup(this.cup, R.C);
    // ---- the dog
    D.root.position.set(h.dx, 0, h.dz); D.root.rotation.y = h.st === 'pass' ? 0 : (h.st === 'tele' || h.st === 'lunge' || h.st === 'res') ? dogYaw : toC * 0.6;
    dp.fwd = (dp.fwd || 0) + dogFwd; D.pose(dp);
    // ---- the neighbour, leash in her left hand
    W.root.position.set(HALL.wx, 0, h.wz); W.root.rotation.set(0, 0, 0);
    if (wWalk) W.pose([['walk', this.t * 1.1]]);
    else if (W.wave) W.pose([['shrug', 0.3 + seg(h.t, 1.0, 2.2) * 1.2, 1, false]]);
    else W.pose([['idle', this.t]]);
    const clip = D.clip(), hand0 = W.root.localToWorld(V(0.2, 0.92, 0.34)), hand = hand0.clone().lerp(clip.clone().add(V(0, 0.35, 0)), 0.18 * wPull);
    ik2(W.bone('LeftArm'), W.bone('LeftForeArm'), W.bone('LeftHand'), hand, W.root.localToWorld(V(0.7, 0.6, -0.5)));
    if (wPull > 0.6) { const sp = W.bone('Spine'); sp.rotateX(0.12 * (wPull - 0.6)); sp.updateMatrixWorld(true); }
    const grip = W.boneWorld('LeftHand'), len = grip.distanceTo(clip), sag = Math.max(0, 1.9 - len) * 0.45 + 0.03;
    const mid = grip.clone().lerp(clip, 0.5); mid.y -= sag;
    this.leash.geometry.dispose(); this.leash.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(grip, mid, clip), 18, 0.007, 5);
    // ---- danger marker + ❗
    const tele = h.st === 'tele' || h.st === 'lunge';
    if (tele) { const a = h.atk; this.zoneM.position.set(a.side === 0 ? h.cx : a.target.x + a.side * 0.05, 0.012, a.side === 0 ? h.cz - 0.32 : h.cz); this.zoneM.scale.setScalar(a.side === 0 ? 1.15 : 0.8); }
    this.zoneM.material.opacity = tele ? 0.38 + 0.22 * Math.sin(this.t * 40) : damp(this.zoneM.material.opacity, 0, 10, rdt);
    this.bang.visible = h.st === 'tele'; if (this.bang.visible) { this.bang.position.copy(D.head.getWorldPosition(V())).add(V(0, 0.42, 0)); const p = 0.32 * (1 + 0.15 * Math.sin(this.t * 30)); this.bang.scale.set(p, p, 1); }
    // ---- camera
    const sh = h.shake * h.shake * 0.05, jit = V(Math.sin(this.t * 71) * sh, Math.sin(this.t * 53) * sh, 0);
    let cp, cl, fov;
    if (camK === 'follow') { cp = pos.clone().add(V(-0.55, 1.68, 2.0)); cl = pos.clone().add(V(0.15, 1.05, -3)); fov = 56; }
    else if (camK === 'dogcu') { const hd = D.head.getWorldPosition(V()); cp = V(h.dx + 0.42, 0.52, h.dz + 1.3); cl = hd.add(V(0, -0.1, -0.12)); fov = 44; }
    else if (camK === 'two') { cp = V(0.95, 1.3, (h.dz + h.cz) / 2 + 0.5); cl = V(-0.45, 0.7, h.dz - 0.3); fov = 52; }
    else if (camK === 'pass') { const u = seg(h.t, 0, 3.0); cp = V(-0.95, 1.7, Sets.DOOR_Z - 1.6); cl = V(lerp(0.2, 0.5, u), 1.1, lerp(-2.2, Sets.DOOR_Z + 0.3, easeInOut(u))); fov = 54; }
    else { const push = h.st === 'lunge' || (h.st === 'res' && h.t < 0.4) ? 1 : 0; this.camPush = damp(this.camPush || 0, push, 10, rdt); cp = V(-0.95, 1.78 - this.camPush * 0.1, HALL.c + 2.35 - this.camPush * 0.35); cl = V(-0.1, 0.62, HALL.c - 1.35); fov = 54 - this.camPush * 4; }
    if (camK !== this.camK) { this.camK = camK; cam.position.copy(cp); } // hard cuts between shots, smooth within
    cam.position.lerp(cp, 1 - Math.exp(-8 * rdt)); cam.position.add(jit);
    cam.lookAt(cl); cam.fov = fov; cam.updateProjectionMatrix();
  }
  finishDog() {
    const h = this.h, G = this.G, UI = this.UI, n = h.res.filter(Boolean).length;
    const g = ['CHEW TOY', 'CHEWED', 'NICKED', 'UNTOUCHABLE'][n], pts = [0, 100, 250, 700][n];
    G.score += pts; G.fin = { ...(G.fin || {}), dog: g, dogT: h.pen, hall: g, hallT: h.pen, hallKind: 'dog', hallPerfect: n === 3 };
    this.dui?.done(g); setTimeout(() => UI.remove('dogui'), 1600);
    UI.pop(g, n === 3 ? `didn’t lay a tooth on you · +${pts}` : n ? `${3 - n} bite${3 - n > 1 ? 's' : ''} · +${pts}` : 'he had a great time', { top: 24 });
    this.Audio.sfx(n === 3 ? 'jingle' : 'pop', 0.7);
  }
  enterDoor() {
    const { UI, Audio, G } = this, R = G.R;
    UI.remove('scene'); UI.remove('dogui'); UI.remove('qte'); clearTimeout(this.capT);
    UI.remove('evui');
    if (this.enc) { this.enc.finish(); this.enc.hide(); }
    else if (this.h && !G.fin?.dog) { this.h.res.length = 3; this.finishDog(); }
    if (this.W) this.W.root.visible = false; if (this.dog) this.dog.root.visible = false; if (this.leash) this.leash.visible = false; this.zoneM.visible = false; this.bang.visible = false;
    R.root.position.set(0.15, 0, Sets.DOOR_Z - 0.15); R.root.rotation.set(0, Math.PI / 2, 0);
    this.phase = 'door'; this.t = 0;
    UI.skipChip(true).addEventListener('click', () => this.skip());
    const late = G.time + (G.stairTime || 10) + (G.fin?.hallT || 0) > G.etaTotal + 11;
    const extra = G.fin?.dog === 'CHEW TOY' ? ['why is ur sleeve wet'] : G.fin?.hall === 'MOPPED UP' ? ['why r u wet. it’s not raining'] : G.fin?.hall === 'LADDER’D' ? ['why is there a bump on ur head'] : null;
    this.line = KY.doorLine({ ice: G.ice, late, crashes: G.crashes, fast: !late && G.time < G.etaTotal * 0.8, extra });
    Audio.sfx('creak', 0.9);
  }
  // the perfect run: every section nailed, on time, never crashed → Kyle, for once, keeps the tip
  isPerfect() {
    const G = this.G, f = G.fin || {};
    return !G.crashes && !G.qteMisses && G.time + (f.doorT || 0) + (f.stairT || 0) * 0.5 + (f.akiraT || 0) + (f.hallT ?? f.dogT ?? 0) <= G.etaTotal
      && f.akira === 'NAILED' && f.door === 'PERFECT' && f.stairs === 'PERFECT' && (f.hallPerfect || f.dog === 'UNTOUCHABLE')
      && (f.rival == null || f.rival === 'SENT HIM' || f.rival === 'RIVAL DOWN') && (f.crane == null || f.crane === 'UNTOUCHED' || f.crane === 'CLEAN');
  }
  // the tip scales with how well you did: every section at least 50% → a tip, from a token amount at 50% up to the
  // full promised tip on a perfect run
  tipShare() {
    const G = this.G, f = G.fin || {}, timeLeft = Math.max(0, G.etaTotal - G.time - (f.doorT || 0) - (f.stairT || 0) * 0.5 - (f.akiraT || 0) - (f.hallT ?? f.dogT ?? 0));
    const rows = this.UI.rateAll({ ...f, time: G.time, eta: G.etaTotal, timeLeft, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, coins: G.coins, coinsTotal: G.lv?.coins?.length ?? 0, tricks: G.tricks }).rows.filter((x) => x.r);
    if (!rows.length || rows.some((x) => x.r.pct < 0.5)) return 0;
    const mean = rows.reduce((a, x) => a + x.r.pct, 0) / rows.length;
    return Math.max(0.1, Math.min(0.85, (mean - 0.5) / 0.5 * 0.85)); // the full tip is reserved for a perfect run
  }
  // literally everything PERFECT: every row the results screen will show (ride, set pieces, desk, stairs, hall, time, ice)
  allRowsPerfect() {
    const G = this.G, f = G.fin || {}, timeLeft = Math.max(0, G.etaTotal - G.time - (f.doorT || 0) - (f.stairT || 0) * 0.5 - (f.akiraT || 0) - (f.hallT ?? f.dogT ?? 0));
    const rows = this.UI.rateAll({ ...f, time: G.time, eta: G.etaTotal, timeLeft, ice: G.ice, crashes: G.crashes, nearMiss: G.nearMiss, coins: G.coins, coinsTotal: G.lv?.coins?.length ?? 0, tricks: G.tricks }).rows.filter((x) => x.r);
    return rows.length >= 6 && rows.every((x) => x.r.badge === 'PERFECT');
  }
  updateDoor(dt) {
    if (this.perfect == null) {
      this.perfect = this.isPerfect() && this.allRowsPerfect(); const share = this.perfect ? 1 : this.tipShare(), paid = Math.round(this.G.tip * share * 4) / 4;
      this.paid = paid; this.G.fin = { ...(this.G.fin || {}), perfect: this.perfect, tipShare: share, tipPaid: paid };
      if (this.perfect) this.line = 'ok… that was actually insane. respect 🫡';
      else if (paid > 0) this.line = ['fine. it was… acceptable', 'ok it’s mostly cold. mostly', 'decent. don’t let it go to ur head'][Math.floor(Math.random() * 3)];
    }
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
      palmCup(this.cup, t < take ? R.C : K); // in the palm, in the hand's own frame, so it never floats off an open hand
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
      if (this.perfect || this.paid > 0) R.walk(u < 0.9 ? 'idle' : 'reaction', u < 0.9 ? 1 + u : (u - 0.9) * 1.1 + 0.2, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.9 });
      else R.walk(u < 0.9 ? 'idle' : 'facepalm', u < 0.9 ? 1 + u : (u - 0.9) * 1.3 + 0.3, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.9 });
      const base = R.root.position;
      cam.position.copy(base.clone().add(V(0.55, 1.5, -1.9).lerp(V(0.4, 1.55, -1.35), easeInOut(clamp(u / 3))))); cam.lookAt(base.clone().add(V(0, 1.4, 0))); cam.fov = 56; cam.updateProjectionMatrix();
      K.root.visible = false; this.cup.visible = false; this.d.leaf.rotation.y = 0;
      if (this.perfect) {
        if (!this.tp) { this.tp = true; R.bag.visible = false; A.sfx('ding', 1); UI.sceneCap('', { extra: UI.notif('Kyle S changed your tip', 'ok fine. you earned it 🫡') }); }
        if (u > 0.7 && !this.zr) { this.zr = true; A.music(null); A.sfx('jingle', 1); A.sfx('ding', 0.8, 1.5); UI.sceneCap('wait. <em class="kept">he actually tipped.</em>', { extra: UI.notif('Kyle S changed your tip', 'ok fine. you earned it 🫡') + `<div class="tipchg kept"><b>${UI.money(this.G.tip)}</b></div>` }); }
      } else if (this.paid > 0) { // a good run: he docks it, but you get something
        const msg = ['here’s… some of it 🙄', 'tip adjusted for melting', 'ok here. don’t get used to it'][Math.floor(this.G.order % 3)];
        if (!this.tp) { this.tp = true; R.bag.visible = false; A.sfx('ding', 1); UI.sceneCap('', { extra: UI.notif('Kyle S changed your tip', msg) }); }
        if (u > 0.7 && !this.zr) { this.zr = true; A.music(null); A.sfx('ding', 0.9, 1.3); UI.sceneCap(`he tipped. <em class="kept">${Math.round(this.G.fin.tipShare * 100)}% of it.</em>`, { extra: UI.notif('Kyle S changed your tip', msg) + `<div class="tipchg kept"><s>${UI.money(this.G.tip)}</s><b>${UI.money(this.paid)}</b></div>` }); }
      } else {
      if (!this.tp) { this.tp = true; R.bag.visible = false; /* set the bag down at the cut so the facepalm can't swing it through his head */ A.sfx('ding', 1); UI.sceneCap('', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') }); }
      if (u > 0.7 && !this.zr) { this.zr = true; A.music(null); A.sfx('trombone', 1); UI.sceneCap('every. single. <em>time.</em>', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') + `<div class="tipchg"><s>${UI.money(this.G.tip)}</s><b>$0.00</b></div>` }); }
      }
      if (u > 3.3 && !this.fin) { this.fin = true; UI.remove('scene'); UI.skipChip(false); this.phase = 'post'; this.onDone(this.line); }
    }
  }
  updatePost(dt) { const R = this.G.R; this.t += dt; R.walk('facepalm', 2.2, { offset: V(0, 0, 0), yaw: 0, loop: false }); }
  // ---------------------------------------------------------------- arrive (in the city scene)
  // ---------------------------------------------------------------- the parking slide (or the wipeout)
  slideFx() {
    const g = new THREE.Group(); this.world.add(g);
    const add = (color, additive, extra = {}) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: true, ...(additive ? { blending: THREE.AdditiveBlending } : {}), ...extra })); m.frustumCulled = false; g.add(m); return m; };
    const tail = add(0xff1a28, true), head = add(0xfff2c0, true, { opacity: 0.55 });
    const ground = { opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -20 };
    const skids = [add(0x0c0c0c, false, ground), add(0x0c0c0c, false, ground), add(0x241a14, false, ground)]; // front tyre, rear tyre, boot
    const puffT = canvasTexOnce();
    const puffs = Array.from({ length: 36 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0 })); g.add(sp); return { sp, age: 9 }; });
    // sparks: short additive line streaks with gravity
    const N = 220, sp = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 6), 3)); sp.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 6), 3)); sp.frustumCulled = false; g.add(sp);
    const sparks = Array.from({ length: N }, () => ({ p: V(), v: V(), life: 0, max: 1 }));
    return { g, tail, head, skids, puffs, sparks, sp, trails: { tail: [], head: [] }, gnd: [[], [], []], nextPuff: 0, nextSpark: 0 };
  }
  ribbon(mesh, pts, half, vertical) {
    if (pts.length < 2) return;
    const pos = [], col = [], idx = [];
    pts.forEach((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], dx = q.x - o.x, dz = q.z - o.z, L = Math.hypot(dx, dz) || 1, a = i / (pts.length - 1);
      if (vertical) pos.push(p.x, p.y - half, p.z, p.x, p.y + half, p.z); else pos.push(p.x - dz / L * half, p.y, p.z + dx / L * half, p.x + dz / L * half, p.y, p.z - dx / L * half);
      col.push(a, a, a, a, a, a); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const g = mesh.geometry; g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeBoundingSphere();
  }
  // the rider during the slide: hips hang off the low side, torso counter-leans, the left leg reaches out and the boot
  // drags on the road, hands stay on the bars, and he looks at the lens as it comes to a stop
  slidePose(R, k, look, bootW) {
    const C = R.C, root = R.root;
    C.root.position.x += 0.2 * k; C.root.position.y -= 0.1 * k; C.root.updateMatrixWorld(true);
    const sp = C.bone('Spine'); sp.rotateZ(0.5 * k); sp.rotateX(0.15 * k); sp.updateMatrixWorld(true);
    const hd = C.bone('Head'); hd.rotateY(0.7 * look); hd.rotateZ(0.25 * k); hd.updateMatrixWorld(true);
    for (const [s, side] of [[1, 'Left'], [-1, 'Right']]) ik2(C.bone(side + 'Arm'), C.bone(side + 'ForeArm'), C.bone(side + 'Hand'), root.localToWorld(V(s * 0.215, 1.0, 0.25)), root.localToWorld(V(s * 0.7, 0.75, -0.3)));
    ik2(C.bone('RightUpLeg'), C.bone('RightLeg'), C.bone('RightFoot'), root.localToWorld(V(-0.13, 0.42, -0.02)), root.localToWorld(V(-0.15, 0.9, 1.2)));
    if (k > 0.01) ik2(C.bone('LeftUpLeg'), C.bone('LeftLeg'), C.bone('LeftFoot'), C.boneWorld('LeftFoot').lerp(bootW, k), root.localToWorld(V(0.6, 0.8, 0.9)));
  }
  updateSlide(dt, ok) {
    const G = this.G, R = G.R, route = G.route, cam = this.camera, A = this.Audio, UI = this.UI;
    if (!this.sl) {
      const D = Math.max(12, Math.min(26, route.length - 4 - G.s));
      this.sl = { s0: G.s, lat0: G.lat, D, t: 0, hold: 0, held: false, fx: this.slideFx() };
      A.sfx('skid', 1.2, 0.7); A.sfx('skid', 0.9, 0.5);
    }
    const S = this.sl, FX = S.fx;
    if (S.hold > 0) { // freeze on the shot (sparks hang in the air), a slow push in
      S.hold -= dt; cam.fov = damp(cam.fov, 36, 1.5, dt); cam.updateProjectionMatrix();
      if (S.hold <= 0) UI.remove('akira');
      return;
    }
    const slow = ok && S.t > 0.3 && S.t < 1.55 ? 0.33 : 1, sdt = dt * slow; // slow-mo through the heart of the slide
    S.t += sdt;
    const t = S.t, u = clamp(t / (ok ? 2.0 : 1.3));
    const sNow = S.s0 + S.D * (1 - Math.pow(1 - u, 2.4)), f = route.at(sNow), lat = S.lat0 * (1 - u) + (ok ? 0.8 : 0.4) * u;
    let yaw, roll, bikeRoll = 0, k = 0, look = 0;
    if (ok) {
      const whip = smooth(seg(t, 0.03, 0.4)), settle = smooth(seg(t, 1.8, 2.35));
      yaw = 1.48 * whip * (1 - 0.3 * settle);
      roll = -(1.0 * whip + 0.035 * Math.sin(t * 47) * (1 - settle)) * (1 - settle); // laid low, shuddering on the tyres
      k = smooth(seg(t, 0.08, 0.4)) * (1 - 0.6 * settle); look = smooth(seg(t, 1.2, 1.9));
    } else { yaw = 0.8 * smooth(seg(t, 0.05, 0.5)) + 0.3 * Math.sin(t * 17) * seg(t, 0.25, 0.8) * (1 - seg(t, 0.8, 0.9)); roll = t < 0.8 ? -0.45 * smooth(seg(t, 0.05, 0.4)) + 0.22 * Math.sin(t * 21) * seg(t, 0.3, 0.8) : 0; bikeRoll = t < 0.8 ? 0 : -1.45 * easeOut(seg(t, 0.8, 1.15)); }
    route.world(sNow, lat, 0, R.root.position); R.root.rotation.set(0, f.yaw + yaw, 0);
    R.bike.rotation.set(0, 0, bikeRoll);
    const by = f.yaw + yaw, bf = V(Math.sin(by), 0, Math.cos(by)), lean = V(Math.cos(by), 0, -Math.sin(by)), tf = V(f.fx, 0, f.fz);
    const bootW = R.root.position.clone().addScaledVector(lean, 0.95).addScaledVector(bf, 0.35).setY(0.06);
    if (ok || t < 0.8) { R.ride(G.dist + S.D * u, { lean: ok ? 0.35 : 0.4, bank: roll, look: 0 }); if (ok) this.slidePose(R, k, look, bootW); }
    else { // thrown off: tumble along the road, lie there a beat, up to a knee, back on his feet
      const tu = seg(t, 0.8, 1.5), land = V(-0.5, 0, 1.6);
      const off = V(0, 0, 0).lerp(land, easeOut(tu)); off.y = Math.sin(Math.PI * tu) * 0.5;
      if (t < 1.5) { R.walk('falling', 0.3 + (t - 0.8) * 1.4, { offset: off, yaw: 0.6, loop: false }); R.C.root.rotation.x = easeOut(tu) * Math.PI * 1.5; }
      else if (t < 2.4) { R.walk('idle', 1, { offset: land.clone().add(V(0, 0.12, 0)), yaw: 0.6 }); R.C.root.rotation.x = -Math.PI / 2 + Math.sin(t * 3) * 0.03; }
      else if (t < 3.2) { R.walk('defeated', 0.4 + (t - 2.4) * 0.8, { offset: land, yaw: 0.6, loop: false }); R.C.root.rotation.x = -Math.PI / 2 * (1 - smooth(seg(t, 2.4, 2.75))); }
      else { R.walk('idle', t, { offset: land, yaw: 0.6 }); R.C.root.rotation.x = 0; }
      R.C.root.updateMatrixWorld(true);
    }
    R.root.updateMatrixWorld(true);
    // fx: light streaks (long-exposure look), three skid lines with smoke — front tyre, rear tyre, boot — and sparks
    const sliding = u < 0.97;
    if (sliding) {
      const contacts = [R.root.localToWorld(V(0, 0.02, 0.555)), R.root.localToWorld(V(0, 0.02, -0.555)), ok && k > 0.3 ? R.C.boneWorld('LeftFoot') : null];
      contacts.forEach((c, i) => { if (c) { FX.gnd[i].push(c.clone().setY(0.055 + i * 0.002)); this.ribbon(FX.skids[i], FX.gnd[i], i === 2 ? 0.06 : 0.07, false); } });
      if (ok) {
        for (const [key, mesh, local] of [['tail', FX.tail, V(0, 0.8, -0.95)], ['head', FX.head, V(0, 0.95, 0.72)]]) { const tr = FX.trails[key]; tr.push(R.root.localToWorld(local)); if (tr.length > (key === 'head' ? 40 : 80)) tr.shift(); this.ribbon(mesh, tr, key === 'head' ? 0.022 : 0.06, true); }
      }
      if ((FX.nextPuff -= sdt) <= 0) { FX.nextPuff = 0.035; contacts.forEach((c) => { if (!c) return; const p = FX.puffs.find((q) => q.age > 1.2); if (p) { p.age = 0; p.sp.position.copy(c).setY(0.25); } }); }
      if (ok && k > 0.5 && u < 0.9) { // sparks off the low side as it scrapes the road
        FX.nextSpark -= sdt; const src = R.root.localToWorld(V(0.34, 0.2, 0.1)); src.y = Math.max(0.05, src.y);
        while (FX.nextSpark <= 0) { FX.nextSpark += 0.004; const sk = FX.sparks.find((q) => q.life <= 0); if (!sk) break;
          sk.p.copy(src).add(V((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)); sk.max = sk.life = 0.25 + Math.random() * 0.35;
          sk.v.copy(tf).multiplyScalar(-2 - Math.random() * 5).addScaledVector(lean, 1 + Math.random() * 3).add(V((Math.random() - 0.5) * 3, 1.5 + Math.random() * 3.5, (Math.random() - 0.5) * 3)); }
      }
    }
    const P = FX.sp.geometry.attributes.position.array, Cc = FX.sp.geometry.attributes.color.array;
    FX.sparks.forEach((q, i) => {
      if (q.life > 0) { q.life -= sdt; q.v.y -= 9.8 * sdt; q.p.addScaledVector(q.v, sdt); if (q.p.y < 0.02) { q.p.y = 0.02; q.v.y *= -0.35; q.v.multiplyScalar(0.7); } }
      const a = Math.max(0, q.life / q.max), tailP = q.p.clone().addScaledVector(q.v, -0.03);
      P.set([q.p.x, q.p.y, q.p.z, tailP.x, tailP.y, tailP.z], i * 6); Cc.set([1 * a, 0.85 * a, 0.4 * a, 1 * a, 0.35 * a, 0.05 * a], i * 6);
    });
    FX.sp.geometry.attributes.position.needsUpdate = FX.sp.geometry.attributes.color.needsUpdate = true;
    for (const p of FX.puffs) { p.age += sdt; const a = clamp(p.age / 1.2); p.sp.material.opacity = a < 1 ? 0.5 * (1 - a) : 0; p.sp.scale.setScalar(0.4 + a * 2.4); p.sp.position.y += sdt * 0.45; }
    // camera: low, close to the bike's front axis — the lean reads in frame while it slides toward the lens
    const toCentre = route.world(sNow, 0, 0).sub(R.root.position);
    const side = bf.clone(); if (side.dot(toCentre) < -0.5) side.negate();
    const dir = side.multiplyScalar(0.8).addScaledVector(tf, 0.65).normalize();
    const camP = R.root.position.clone().addScaledVector(dir, ok ? 3.6 : 6.8).setY(ok ? 0.5 : 1.3), lookP = R.root.position.clone().add(V(0, 0.6, 0));
    if (!S.camInit) { S.camInit = true; S.cp = cam.position.clone(); S.lk = lookP.clone(); }
    S.cp.lerp(camP, 1 - Math.exp(-4 * dt)); S.lk.lerp(lookP, 1 - Math.exp(-8 * dt)); cam.position.copy(S.cp); cam.lookAt(S.lk);
    S.dutch = damp(S.dutch || 0, ok && t > 0.4 ? 0.12 : 0, 4, dt); cam.rotateZ(S.dutch);
    if (ok && slow < 1) { cam.position.y += Math.sin(t * 61) * 0.01; } // tyre chatter
    cam.fov = damp(cam.fov, ok ? 48 : 56, 3, dt); cam.updateProjectionMatrix();
    this.sun.target.position.copy(R.root.position); this.sun.position.copy(R.root.position).add(V(-80, 60, 90));
    if (ok && t > 1.15 && !S.held) { S.held = true; S.hold = 1.4; A.sfx('boom', 0.8, 0.8); UI.holdFrame(); }
    if (!ok && t > 0.85 && !S.wiped) { S.wiped = true; A.sfx('crash', 1); UI.pop('WIPEOUT', 'fumbled the slide · +6s'); setTimeout(() => UI.dm('did u just eat it in front of my building 💀', { tone: 'angry' }), 900); }
    const tEnd = ok ? 2.5 : 3.7;
    if (t > tEnd) { // hop off and jog to the doors
      R.bike.rotation.set(0, 0, bikeRoll); R.root.rotation.set(0, R.root.rotation.y, 0);
      if (!S.walk0) { S.walk0 = true; R.ride(0, { footDown: 1 }); R.bike.rotation.z = bikeRoll; S.doorL = R.root.worldToLocal(this.door.clone().add(V(-0.8, 0, 0))); S.startL = ok ? V(0.6, 0, 0.2) : V(-0.5, 0, 1.6); }
      const wt = t - tEnd, run = seg(wt, 0.2, 2.6);
      R.C.root.rotation.x = 0;
      const head = this.corner.clone().add(V(-17.8, 1.7, -8.7)), tgt = V(this.sign.x, 3.0, this.sign.z - 1.6), k2 = easeInOut(seg(wt, 0, 1.4));
      cam.position.copy(S.cp.clone().lerp(head, k2)); cam.lookAt(S.lk.clone().lerp(tgt, k2)); cam.fov = damp(cam.fov, 70, 2, dt); cam.updateProjectionMatrix();
      R.walk('jog', wt * 1.3, { offset: S.startL.clone().lerp(S.doorL, easeOut(run) * 0.92), yaw: Math.atan2(S.doorL.x - S.startL.x, S.doorL.z - S.startL.z) });
      if (wt > 0.6 && !this.placed) { this.placed = true; UI.place('Citi Tower', '101 Lake Ave · Church St', 3000); }
      if (wt > 2.0) { FX.g.removeFromParent(); this.toLocked(); }
    }
  }
  updateArrive(dt) {
    if (this.G.akira?.res) return this.updateSlide(dt, this.G.akira.res === 'ok');
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
    if (this.phase === 'arrive' && !this.G.akira?.res) this.toLocked();
    else if (this.phase === 'arrive' && this.sl?.hold > 0) this.sl.hold = 0.01;
    else if (this.phase === 'elevator') this.toStairs();
    else if (this.phase === 'hall' && (this.enc ? this.enc.skippable() : (this.h.st === 'bored' || this.h.st === 'pass'))) this.enterDoor();
    else if (this.phase === 'door' && this.t < 3.6) { this.t = 3.6; this.UI.remove('scene'); this.cup.visible = false; this.Audio.sfx('boom', 0.4); }
    else if (this.phase === 'door' && this.t < 6.8) { this.t = 6.85; }
  }
  update(dt, T) {
    if (this.phase === 'arrive') this.updateArrive(dt);
    else if (this.phase === 'locked') this.updateLocked(dt);
    else if (this.phase === 'elevator') this.updateElevator(dt);
    else if (this.phase === 'stairs') this.updateStairs(dt);
    else if (this.phase === 'hall') this.updateHall(dt);
    else if (this.phase === 'door') this.updateDoor(dt);
    else if (this.phase === 'post') this.updatePost(dt);
  }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() {
    window.removeEventListener('keydown', this.keyH);
    this.enc?.dispose(); this.UI.remove('evui');
    const R = this.G.R; R.bike.visible = true; R.helm.visible = true; R.cup.visible = true; R.root.visible = true; R.bike.rotation.set(0, 0, 0); R.bag.visible = true; this.sl?.fx.g.removeFromParent();
    if (this.K) this.K.root.removeFromParent();
    this.W?.root.removeFromParent(); this.UI.remove('dogui'); clearTimeout(this.capT);
    this.cup?.removeFromParent();
    this.active = false;
  }
}
