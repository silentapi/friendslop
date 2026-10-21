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
    Object.assign(this, { notice: 0, look: 0, dphase: 'phone', phaseT: 0, penalty: 0, lastSide: -1, knockCd: 0, waveT: 0, knockT: 0, wavePh: 0, buzzed: null, inputOn: false, rattle: 0, window: G.delivered > 1 ? 1.1 : 1.5 });
    this.bui = UI.deskUI(); this.bui.el.style.opacity = 0; this.bui.bind(() => this.wave(this.lastSide === 0 ? 1 : 0), () => this.knock());
    this.keyH = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (this.phase === 'locked') { if (k === 'arrowleft' || k === 'a') this.wave(0); else if (k === 'arrowright' || k === 'd') this.wave(1); else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') { e.preventDefault(); this.knock(); } } else if (this.phase === 'stairs') this.stairKey(k, e); };
    window.addEventListener('keydown', this.keyH);
    Audio.music('tense');
  }
  wave(side) {
    if (!this.inputOn || this.buzzed != null || side === this.lastSide) return;
    this.lastSide = side; this.waveT = 0.3; this.wavePh = side; this.Audio.sfx('whoosh', 0.2, 1.8);
    if (this.dphase === 'phone') { this.notice = Math.min(1, this.notice + 0.075); if (this.notice >= 1) this.setDesk('looking'); }
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
      if (this.dphase === 'looking' && this.phaseT > this.window) { this.setDesk('phone'); this.notice = 0.3; this.penalty += 0.5; UI.pop('MISSED HER', 'back to her phone'); A.sfx('bwomp', 0.4, 1.2); }
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
    if (d <= perfect) { this.flights = Math.min(38, this.flights + 3); this.perfects++; this.ui.flash('perf'); A.sfx('step', 1, 1.2); A.sfx('ice', 0.4, 1.4); G.score += 60; this.UI.pop('PERFECT', 'two at a time', { top: 20 }); }
    else if (d <= zone) { this.flights = Math.min(38, this.flights + 2); this.ui.flash('hit'); A.sfx('step', 1, 0.9 + Math.random() * 0.2); G.score += 25; }
    else { this.misses++; this.flights = Math.max(0, this.flights - 1); this.stumble = 0.85; this.ui.flash('miss'); A.sfx('step', 1.2, 0.5); A.sfx('pop', 0.6, 0.5); G.ice = Math.max(0, G.ice - 3); this.UI.pop('TRIPPED', 'slid back down a step', { top: 20 }); navigator.vibrate?.(30); } // spamming costs you ground
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
      R.walk(u < 0.9 ? 'idle' : 'facepalm', u < 0.9 ? 1 + u : (u - 0.9) * 1.3 + 0.3, { offset: V(0, 0, 0), yaw: 0, loop: u < 0.9 });
      const base = R.root.position;
      cam.position.copy(base.clone().add(V(0.55, 1.5, -1.9).lerp(V(0.4, 1.55, -1.35), easeInOut(clamp(u / 3))))); cam.lookAt(base.clone().add(V(0, 1.4, 0))); cam.fov = 56; cam.updateProjectionMatrix();
      K.root.visible = false; this.cup.visible = false; this.d.leaf.rotation.y = 0;
      if (!this.tp) { this.tp = true; R.bag.visible = false; /* set the bag down at the cut so the facepalm can't swing it through his head */ A.sfx('ding', 1); UI.sceneCap('', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') }); }
      if (u > 0.7 && !this.zr) { this.zr = true; A.music(null); A.sfx('trombone', 1); UI.sceneCap('every. single. <em>time.</em>', { extra: UI.notif('Kyle S changed your tip', 'thanks for the delivery! 🙂') + `<div class="tipchg"><s>${UI.money(this.G.tip)}</s><b>$0.00</b></div>` }); }
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
    const R = this.G.R; R.bike.visible = true; R.helm.visible = true; R.cup.visible = true; R.root.visible = true; R.bike.rotation.set(0, 0, 0); R.bag.visible = true; this.sl?.fx.g.removeFromParent();
    if (this.K) this.K.root.removeFromParent();
    this.cup?.removeFromParent();
    this.active = false;
  }
}
