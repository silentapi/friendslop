// The delivery finale: pull up at the CITITOWER 101 canopy (real-life vs in-game panel) → elevator OUT OF ORDER
// → climb 20 floors (alternate LEFT/RIGHT taps) → Kyle S opens 2004, takes it, sips, complains → takes the tip.
import { THREE, V, clamp, lerp, seg, smooth, easeOut, easeInOut, damp, box, cyl, mat } from './core.js';
import { character, ik2, coldCup } from './chars.js';
import * as Sets from './sets.js';

const KYLE_LOOK = { maps: { casualsuit06: 'tex/kyle_fit.jpg', shoes05: 'tex/kyle_shoes.jpg' } };
let kyleP = null;
export function prefetchKyle() { return (kyleP ||= character('m/kyle.glb', KYLE_LOOK).then(async (K) => { await K.load('idle', 'shrug'); for (const f of ['LeftFoot', 'RightFoot']) K.bone(f).scale.setScalar(1.18); K.captureRest(); return K; })); }

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
    prefetchKyle();
    Audio.music('chill'); Audio.sfx('skid', 0.9);
    this.c0 = this.camera.position.clone(); this.l0 = new THREE.Vector3(); this.camera.getWorldDirection(this.l0); this.l0.multiplyScalar(10).add(this.c0);
    const ud = G.citi.userData;
    this.door = ud.door.clone(); this.sign = ud.signMid.clone(); this.corner = ud.corner.clone();
    this.stop = G.R.root.position.clone(); this.stop.y = 0;
    this.yaw0 = G.R.root.rotation.y;

  }
  // ---------------------------------------------------------------- elevator
  toElevator() {
    if (this.phase !== 'arrive') return;
    const { UI, Audio, G } = this;
    UI.remove('scene');
    this.phase = 'elevator'; this.t = 0;
    const s = interiorScene(this.world.environment);
    const lob = Sets.lobby(); s.add(lob);
    box(0.12, 0.3, 0.04, mat(0xb8bcc4, { metalness: 1, roughness: 0.25 }), 1.25, 1.2, -2.8, lob);
    this.btn = cyl(0.025, 0.025, 0.02, new THREE.MeshBasicMaterial({ color: 0x331a08 }), 16, 1.25, 1.22, -2.78, lob); this.btn.rotation.x = Math.PI / 2;
    this.fill = new THREE.PointLight(0xffe6cc, 0, 5, 2); this.fill.position.set(0.85, 1.9, -2.3); s.add(this.fill);
    this.scene = s;
    const R = G.R; s.add(R.root); R.bike.visible = false; R.helm.visible = false; R.cup.visible = false;
    R.root.rotation.set(0, Math.PI, 0); R.root.position.set(3.4, 0, -0.6);
    this.cup = coldCup(); s.add(this.cup);
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
  // ---------------------------------------------------------------- stairs mini-game
  toStairs() {
    if (this.phase !== 'elevator') return;
    const { UI, Audio, G } = this;
    UI.remove('scene');
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
    this.taps = 0; this.next = 0; this.sCur = 0; this.timeLeft = 11; this.stumble = 0;
    UI.skipChip(false);
    Audio.music('full');
    this.ui = UI.stairsUI({ onTap: (side) => this.tap(side) });
    this.keyH = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') this.tap(0); if (k === 'arrowright' || k === 'd') this.tap(1); };
    window.addEventListener('keydown', this.keyH);
    UI.dm('the stairs are by the gym btw', { ttl: 2200 });
  }
  tap(side) {
    if (this.phase !== 'stairs' || this.climbed) return;
    if (side === this.next) { this.taps++; this.next = 1 - this.next; this.Audio.sfx('step', 1, 0.9 + Math.random() * 0.2); }
    else { this.stumble = 0.35; this.Audio.sfx('pop', 0.5, 0.5); navigator.vibrate?.(20); }
  }
  updateStairs(dt) {
    const R = this.G.R, cam = this.camera, NEED = 40;
    this.t += dt; if (this.timeLeft > 0) this.timeLeft -= dt;
    if (this.timeLeft <= 0 && !this.climbed) { this.taps = Math.min(NEED, this.taps + dt * 2.2); } // out of time: he trudges the rest
    this.stumble = Math.max(0, this.stumble - dt);
    const target = (this.taps / NEED) * 38;
    this.sCur = damp(this.sCur, Math.min(38, target), this.stumble > 0 ? 1 : 7, dt);
    const { p, dir } = Sets.stairPath(Math.min(37.999, this.sCur));
    R.root.position.copy(p).add(V(0, 0.04, 0)); R.root.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    const moving = target - this.sCur > 0.05;
    R.walk(moving ? 'jog' : 'idle', this.t * 1.6, { offset: V(0, 0, 0), yaw: 0 });
    if (!moving && this.timeLeft <= 2 && !this.climbed) { const sp = R.C.bone('Spine'); sp.rotateX(0.45); sp.updateMatrixWorld(true); }
    R.C.root.updateMatrixWorld(true);
    this.cup.position.copy(R.C.boneWorld('RightHand')).add(V(0, -0.1, 0));
    const look = R.root.position.clone().add(V(0, 0.9, 0));
    const want = V(9.5, R.root.position.y + 1.6, 0.2);
    if (!this.camInit) { this.camInit = true; cam.position.copy(want); }
    cam.position.lerp(want, 1 - Math.exp(-5 * dt)); cam.lookAt(0.4, cam.position.y - 0.7, 0); cam.fov = 52; cam.updateProjectionMatrix();
    const floor = Math.min(20, 1 + Math.floor(this.sCur / 2 + 0.001));
    this.ui.set({ floor, next: this.next, time: this.timeLeft / 11 });
    if (floor >= 10 && !this.dm1) { this.dm1 = true; this.UI.dm('hello??'); this.Audio.sfx('pop', 0.7); }
    if (floor >= 16 && !this.dm2) { this.dm2 = true; this.UI.dm('u coming or what'); this.Audio.sfx('pop', 0.7); }
    if (this.sCur >= 37.9 && !this.climbed) { this.climbed = true; this.G.stairTime = this.t; this.Audio.sfx('ding', 1); this.UI.pop('FLOOR 20', this.t < 11 ? 'new PR 💪' : 'gassed 😮‍💨'); setTimeout(() => this.toDoor(), 900); }
  }
  // ---------------------------------------------------------------- Kyle's door
  async toDoor() {
    if (this.phase !== 'stairs') return;
    const { UI, Audio, G } = this;
    window.removeEventListener('keydown', this.keyH);
    UI.remove('stairsui');
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
    if (t > 0.9 && !this.placed) { this.placed = true; this.UI.place('Citi Tower', '101 Lake Ave · Church St', 4200); this.UI.dm('fl 20. hurry 🙄'); this.Audio.sfx('pop', 0.7); }
    if (t > 2.6) this.toElevator();
  }
  skip() {
    if (this.phase === 'arrive') this.toElevator();
    else if (this.phase === 'elevator') this.toStairs();
    else if (this.phase === 'door' && this.t < 3.6) { this.t = 3.6; this.UI.remove('scene'); this.cup.visible = false; this.Audio.sfx('boom', 0.4); }
    else if (this.phase === 'door' && this.t < 6.8) { this.t = 6.85; }
  }
  update(dt, T) {
    if (this.phase === 'arrive') this.updateArrive(dt);
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
