// Shots 8–13: REAL vs IN-GAME Citi Tower → pull up at the CITITOWER 101 canopy → out of order / 20 floors →
// Kyle → the tip → end card over Lake Eola.
import { THREE, V, W, H, aim, seg, lerp, lerpV, easeIn, easeOut, easeInOut, easeBack, smooth, handheld, shake, spring, mat, mesh, box, cyl, pbr, setup, ASSETS } from '../engine/core.js';
import * as HUD from '../engine/hud.js';
import { rider, coldCup, ik2 } from '../engine/rider.js';
import { mixCharacter } from '../engine/chars.js';
import { citiTower, CITI } from '../engine/citi.js';
import * as Sets from '../engine/sets.js';
import { exterior, along, eta, DUR, Q, START, Wd } from './kit.js';

const CORNER = V(CITI.x0, 0, CITI.z1); // Church St & Lake Ave
// Kyle S: black tee, grey sweats, white sneakers
const KYLE_LOOK = { maps: { casualsuit06: 'cast/tex/kyle_fit.jpg', shoes05: 'cast/tex/kyle_shoes.jpg' } };
async function citiSet({ parked = 4, ...opts } = {}) {
  const ctx = await exterior({ center: [-20, 25], radius: 650, shadowBox: 45, dressR: 0, ...opts });
  const T = await citiTower(ctx);
  const lake = mesh(new THREE.PlaneGeometry(11, 140), pbr('red_brick_pavers', { world: 2.2, rough: 0.9, normal: 1.2, color: 0xd8c8c0 }), { cast: false });
  lake.rotation.x = -Math.PI / 2; lake.position.set(-31, 0.012, 20); ctx.scene.add(lake);
  if (parked) await Wd.traffic(ctx, { names: ['Lake Avenue'], center: [-29, 30], radius: 120, n: 0, parked, seed: 4 });
  return { ctx, T };
}

// ---------------------------------------------------------------- 8. REAL vs IN-GAME
const S_REAL = {
  name: 'real', dur: DUR('real'),
  async build() {
    const q = Q('real');
    const { ctx } = await citiSet();
    return {
      ctx,
      update(lt) {
        // match the reference photo: across the intersection, low, looking up the corner; optical centre = bottom half
        const k = easeInOut(seg(lt, 0, DUR('real')));
        const cp = CORNER.clone().add(lerpV([-22, 1.5, 24], [-20.5, 1.6, 22.5], k)).add(handheld(lt, 0.03));
        aim(ctx.camera, cp, CORNER.clone().add(V(5, 19, -6)));
        ctx.camera.fov = 100; ctx.camera.updateProjectionMatrix();
        ctx.camera.setViewOffset(W, H, 0, -H / 4, W, H);
        ctx.focusSun(CORNER, 300);
      },
      hud(lt) {
        const slide = easeOut(seg(lt, 0, 0.35)), wipe = easeInOut(seg(lt, q.wipe, q.wipeEnd));
        return `<div class="split">
          <div style="position:absolute;left:0;right:0;top:960px;bottom:${(1 - wipe) * 960}px;"></div>
          <div class="ph" style="background-image:url(${ASSETS}ref/citi_photo.jpg);transform:translateY(${(1 - slide) * -960}px)"></div>
          <div style="position:absolute;left:0;right:0;top:${960 + wipe * 960}px;height:${(1 - wipe) * 960}px;background:#0b0d10"></div>
          <div class="bar" style="top:955px"></div>
          <div class="lab r" style="top:${300 - (1 - slide) * 400}px">📷 REAL LIFE</div>
          <div class="lab gm" style="top:1000px;opacity:${seg(lt, q.wipe + 0.2, q.wipe + 0.5)}">🎮 IN GAME</div>
        </div>`
          + HUD.caption(lt, q.wipeEnd - 0.1, DUR('real'), 'real Downtown Orlando. / real buildings.', { y: 820, size: 58 })
          + HUD.place(lt, 0.3, DUR('real'), 'Citi Tower', '101 Lake Ave · Orlando', { top: 1340 });
      },
    };
  },
};

// ---------------------------------------------------------------- 9. ARRIVE: up brick Lake Ave to the CITITOWER 101 canopy
const S_ARRIVE = {
  name: 'arrive', dur: DUR('arrive'),
  async build() {
    const q = Q('arrive');
    const { ctx, T } = await citiSet({ shadowBox: 30, parked: 0 });
    const R = await rider(); ctx.scene.add(R.root);
    const door = T.userData.door, sign = T.userData.signMid;
    const stop = V(-27.4, 0, door.z + 0.8);
    const path = [[-28.6, 78], [-28.2, 46], [stop.x, stop.z]];
    const L = 78 - stop.z;
    return {
      ctx,
      update(lt) {
        const k = 1 - Math.pow(1 - seg(lt, 0, q.stop), 2);
        const s = k * L, { p, yaw } = along(path, s);
        if (lt < q.off) {
          R.root.position.copy(p); R.root.rotation.y = yaw;
          R.ride(s, { lean: 0.4 - seg(lt, q.brake, q.stop) * 0.15, footDown: smooth(seg(lt, q.stop - 0.1, q.stop + 0.2)), look: lt > q.stop ? -0.05 : 0 });
        } else {
          // hop off and run for the door
          R.root.position.copy(stop); R.root.rotation.y = Math.PI;
          R.ride(L, { footDown: 1 }); // keep the bike posed
          const run = seg(lt, q.run, DUR('arrive'));
          const startL = V(0.6, 0, 0.2), doorL = R.root.worldToLocal(door.clone().add(V(-0.8, 0, 0)));
          R.walk(lt < q.run ? 'idle' : 'jog', (lt - q.off) * 1.2, { offset: startL.clone().lerp(doorL, easeIn(run) * 0.9), yaw: Math.atan2(doorL.x - startL.x, doorL.z - startL.z) * smooth(seg(lt, q.off, q.run)) });
        }
        const pan = easeInOut(seg(lt, 0.2, q.stop + 0.2));
        const cp = CORNER.clone().add(lerpV([-17.5, 1.3, 12], [-17.8, 1.7, -8.7], pan)).add(handheld(lt, 0.03)).add(shake(lt, q.stop, 0.04, 0.3));
        const tg = lerpV([p.x, 1.4, p.z], [sign.x, 3.0, sign.z - 1.6], pan);
        aim(ctx.camera, cp, tg, 0.01);
        ctx.camera.fov = 52 + pan * 18; ctx.camera.updateProjectionMatrix();
        ctx.focusSun(CORNER, 300);
      },
      hud(lt) {
        return HUD.place(lt, 0.15, DUR('arrive'), 'Citi Tower', '101 Lake Ave · Church St')
          + HUD.chat(lt, q.chat, DUR('arrive'), 'fl 20. hurry 🙄', { y: 930 })
          + HUD.gameHud({ secs: eta(START.arrive + lt), tip: 50, a: 0.9 });
      },
    };
  },
};

// ---------------------------------------------------------------- 10. ELEVATOR: press the button … OUT OF ORDER … the stare
const S_ELEVATOR = {
  name: 'elevator', dur: DUR('elevator'),
  async build() {
    const q = Q('elevator');
    const ctx = await setup({ sky: 'golden', sunEl: 30, shadowBox: 8, fov: 50 });
    ctx.scene.background = new THREE.Color(0x0b0b0c); ctx.sun.intensity = 0.2;
    const lob = Sets.lobby(ctx); ctx.scene.add(lob);
    // call button panel right of the middle car
    box(0.12, 0.3, 0.04, new THREE.MeshPhysicalMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.25 }), 1.25, 1.2, -2.8, lob);
    const btn = cyl(0.025, 0.025, 0.02, mat(0x222222, { emissive: 0xff9a3a, emissiveIntensity: 0 }), 16, 1.25, 1.22, -2.78, lob); btn.rotation.x = Math.PI / 2;
    const R = await rider({ cup: false }); R.bike.visible = false; R.helm.visible = false; ctx.scene.add(R.root);
    const cup = coldCup(1); ctx.scene.add(cup);
    const stand = V(0.55, 0, -1.25);
    const fill = new THREE.PointLight(0xffe6cc, 0, 5, 2); fill.position.set(0.55, 1.9, -2.3); ctx.scene.add(fill);
    return {
      ctx, fx: { ao: 0.5, bloom: 0.2 },
      update(lt) {
        // jog in, stop, press, wait … then the slow turn to camera
        const k = smooth(seg(lt, 0, q.press - 0.1));
        R.root.position.copy(V(3.4, 0, -0.6).lerp(stand, k)); R.root.rotation.y = Math.PI;
        R.walk(lt < q.press - 0.15 ? 'jog' : 'idle', lt * 1.3, { offset: V(0, 0, 0), yaw: lt < q.press - 0.15 ? -0.5 : 0 });
        const press = smooth(seg(lt, q.press - 0.2, q.press)) * (1 - smooth(seg(lt, q.press + 0.15, q.press + 0.45)));
        if (press > 0) { const h = R.C.boneWorld('RightHand'); ik2(R.C.bone('RightArm'), R.C.bone('RightForeArm'), R.C.bone('RightHand'), h.lerp(V(1.25, 1.22, -2.74), press), R.root.localToWorld(V(-0.5, 0.6, -0.6))); }
        btn.material.emissiveIntensity = lt > q.press ? 2.5 : 0;
        fill.intensity = lt > q.stare ? 4 : 0;
        if (lt > q.stare) { const hd = R.C.bone('Head'); hd.rotateX(0.1); hd.updateMatrixWorld(true); }
        R.C.root.updateMatrixWorld(true);
        cup.position.copy(R.C.boneWorld('LeftHand')).add(V(0, -0.1, 0));
        if (lt < q.sign) {          // A: wide, behind him, the three cars
          const cp = V(2.9, 1.65, 2.6).add(handheld(lt, 0.012));
          aim(ctx.camera, cp, V(0.4, 1.35, -2.6), 0); ctx.camera.fov = 50;
        } else if (lt < q.stare) {  // B: slow push on the sign
          const z = easeInOut(seg(lt, q.sign, q.stare));
          aim(ctx.camera, lerpV([0.15, 1.6, -1.25], [0.05, 1.57, -1.75], z).add(handheld(lt, 0.004)), V(0, 1.55, -2.78), 0.04); ctx.camera.fov = 42;
        } else {                    // C: from the doors, he turns to us. silence.
          const z = easeInOut(seg(lt, q.stare, DUR('elevator')));
          aim(ctx.camera, lerpV([0.55, 1.62, -2.72], [0.55, 1.63, -2.62], z).add(handheld(lt, 0.003)), V(0.55, 1.5, -1.25), 0); ctx.camera.fov = 56 - z * 8;
        }
        ctx.camera.updateProjectionMatrix();
      },
      hud(lt) {
        return HUD.caption(lt, q.sign + 0.25, q.stare, 'elevator: *out of order.*', { y: 360, size: 66, per: 0 })
          + HUD.caption(lt, q.line, DUR('elevator'), '…20 floors.', { y: 360, size: 74, per: 0 })
          + HUD.gameHud({ secs: eta(START.elevator + lt), tip: 50, a: lt < q.sign ? 0.85 : 0 });
      },
    };
  },
};

// ---------------------------------------------------------------- 11. STAIRS: the climb, the collapse at 14, Kyle texts, the last flight to 20
const S_STAIRS = {
  name: 'stairs', dur: DUR('stairs'),
  async build() {
    const q = Q('stairs');
    const ctx = await setup({ sky: 'golden', sunEl: 30, shadowBox: 8, fov: 50 });
    ctx.scene.background = new THREE.Color(0x0b0b0c); ctx.sun.intensity = 0.2;
    const well = Sets.stairwell(ctx, 21); ctx.scene.add(well);
    const R = await rider({ cup: false }); R.bike.visible = false; R.helm.visible = false; ctx.scene.add(R.root);
    const cup = coldCup(1); ctx.scene.add(cup);
    const FH = Sets.FH;
    return {
      ctx, fx: { ao: 0.5, bloom: 0.25 },
      update(lt) {
        if (lt < q.tired) {         // A: looking down the flight, he charges up at us
          const u = seg(lt, 0, q.tired), s = 10 + u * 1.0;
          const { p, dir } = Sets.stairPath(s);
          R.root.position.copy(p).add(V(0, 0.04, 0)); R.root.rotation.y = Math.atan2(dir.x, dir.z);
          R.walk('jog', lt * 1.6, { offset: V(0, 0, 0), yaw: 0 });
          const top = Sets.stairPath(11).p.y;
          aim(ctx.camera, V(-1.0, top + 1.75, -2.6).add(handheld(lt * 2, 0.03)), R.root.position.clone().add(V(0, 1.0, 0)), 0.02); ctx.camera.fov = 64;
        } else if (lt < q.top) {    // B: floor 14 landing, doubled over
          const y0 = 13 * FH;
          R.root.position.set(0.9, y0, 2.15); R.root.rotation.y = -Math.PI / 2 + 0.45;
          R.walk('idle', 1 + lt * 0.5, { offset: V(0, -0.06, 0), yaw: 0 });
          const heave = 0.05 * Math.sin(lt * 10);
          for (const [n, a] of [['Spine', 0.55 + heave], ['Spine1', 0.4], ['Spine2', 0.25]]) { const b = R.C.bone(n); b.rotateX(a); b.updateMatrixWorld(true); }
          const hd = R.C.bone('Head'); hd.rotateX(-0.55); hd.updateMatrixWorld(true);
          for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
            const knee = R.root.localToWorld(V(sx * 0.13, 0.55, 0.2));
            ik2(R.C.bone(side + 'Arm'), R.C.bone(side + 'ForeArm'), R.C.bone(side + 'Hand'), knee, R.root.localToWorld(V(sx * 0.7, 0.9, -0.2)));
          }
          aim(ctx.camera, V(-1.3, y0 + 1.0, 2.75).add(handheld(lt, 0.01)), V(1.5, y0 + 1.15, 2.1), 0.02); ctx.camera.fov = 56;
        } else {                    // C: the last flight up to 20
          const u = seg(lt, q.top, q.twenty), s = 37 + Math.min(0.999, u * 1.15);
          const { p, dir } = Sets.stairPath(s);
          const y0 = 19 * FH;
          if (u * 1.15 >= 0.999) p.set(1.5, y0, 1.4 + Math.min(0.12, (u * 1.15 - 0.999) * 1.5));
          R.root.position.copy(p).add(V(0, 0.04, 0)); R.root.rotation.y = Math.atan2(dir.x, dir.z);
          R.walk(lt < q.twenty ? 'jog' : 'idle', lt * 1.5, { offset: V(0, 0, 0), yaw: 0 });
          aim(ctx.camera, V(1.0, y0 + 1.65, 3.5).add(handheld(lt, 0.012)), V(1.45, y0 + 0.5, -0.4), 0.02); ctx.camera.fov = 62;
        }
        ctx.camera.updateProjectionMatrix();
        R.C.root.updateMatrixWorld(true);
        cup.position.copy(R.C.boneWorld('RightHand')).add(V(0, -0.1, 0));
      },
      post(lt, P) { P.grade.uniforms.flash.value = Math.max(0, 1 - Math.abs(lt - q.twenty) * 8) * 0.25; },
      hud(lt) {
        const f = lt < q.tired ? Math.round(1 + 10 * seg(lt, 0, q.tired)) : lt < q.top ? 14 : Math.min(20, 15 + Math.floor(seg(lt, q.top, q.twenty) * 6));
        const pop = 1 + Math.max(0, 1 - Math.abs(lt - q.twenty) * 5) * 0.3 * (f === 20 ? 1 : 0);
        const shakeX = lt > q.tired && lt < q.top ? Math.sin(lt * 50) * 4 : 0;
        return `<div class="floorn" style="top:420px;transform:translateX(${shakeX}px) scale(${pop});transform-origin:100% 50%;color:${f === 20 ? '#30d158' : '#fff'}"><small>FLOOR</small>${f}</div>`
          + HUD.chat(lt, q.text, q.top + 0.3, 'hello??', { y: 1150 })
          + HUD.chat(lt, q.text + 0.35, q.top + 0.3, 'u coming or what', { y: 1300 })
          + HUD.gameHud({ secs: eta(START.stairs + lt), tip: 50, a: 0.85 });
      },
    };
  },
};

// ---------------------------------------------------------------- 11. KYLE: door 2004, the hand-off, the sip, the line
async function hallSet() {
  const ctx = await setup({ sky: 'dusk', sunEl: 30, shadowBox: 6, fov: 50 });
  ctx.scene.background = new THREE.Color(0x0b0b0c); ctx.sun.intensity = 0.0; ctx.scene.environmentIntensity = 0.5;
  const hall = Sets.hallway(ctx); ctx.scene.add(hall);
  const d = hall.userData.doors[2004];
  const R = await rider({ cup: false }); R.bike.visible = false; R.helm.visible = false; ctx.scene.add(R.root);
  R.root.position.set(0.15, 0, Sets.DOOR_Z - 0.15); R.root.rotation.y = Math.PI / 2;
  const K = await mixCharacter('cast/kyle.glb', KYLE_LOOK); await K.load('idle', 'shrug'); ctx.scene.add(K.root);
  for (const f of ['LeftFoot', 'RightFoot']) K.bone(f).scale.setScalar(1.18); // big white Jordans
  K.captureRest();
  const cup = coldCup(1); ctx.scene.add(cup);
  return { ctx, hall, d, R, K, cup };
}
const S_KYLE = {
  name: 'kyle', dur: DUR('kyle'),
  async build() {
    const q = Q('kyle');
    const { ctx, hall, d, R, K, cup } = await hallSet();
    return {
      ctx, fx: { ao: 0.5, bloom: 0.12, bloomThreshold: 1.2 },
      update(lt) {
        const open = easeOut(seg(lt, q.open, q.open + 0.35)) * (1 - easeIn(seg(lt, q.close - 0.15, q.close)));
        d.leaf.rotation.y = open * 1.5;
        hall.userData.aptLight.intensity = open * 12;
        // Kyle already has it (snatched on the cut): holds it at his chest, sips, shrugs the line
        K.root.position.set(2.4 - open * 0.85, 0, Sets.DOOR_Z + 0.1); K.root.rotation.y = -Math.PI / 2;
        K.pose(lt < q.line ? [['idle', 1 + lt]] : [['shrug', 0.25 + (lt - q.line) * 1.1, 1, false]]);
        R.walk('idle', 2 + lt, { offset: V(0, 0, 0), yaw: 0 });
        if (lt < q.line) {
          const sip = smooth(seg(lt, q.sip - 0.2, q.sip)) * (1 - smooth(seg(lt, q.sip + 0.3, q.line - 0.05)));
          const chest = K.root.localToWorld(V(-0.12, 1.32, 0.32));
          const mouth = K.boneWorld('Head').add(V(-0.14, -0.1, 0));
          ik2(K.bone('RightArm'), K.bone('RightForeArm'), K.bone('RightHand'), chest.lerp(mouth, sip), K.boneWorld('RightArm').add(V(0.3, -0.6, -0.4)));
          if (sip > 0) { const hd = K.bone('Head'); hd.rotateX(-0.22 * sip); hd.updateMatrixWorld(true); }
        }
        cup.position.copy(K.boneWorld('RightHand')).add(V(0, -0.11, 0));
        cup.visible = lt < q.close - 0.1;
        // over the courier's right shoulder (helmet + Gobbl bag in frame)
        const push = easeInOut(seg(lt, 0, q.line));
        const cp = lerpV([-0.75, 1.5, Sets.DOOR_Z + 1.25], [-0.4, 1.48, Sets.DOOR_Z + 0.7], push).add(handheld(lt, 0.012)).add(shake(lt, q.close, 0.04, 0.4));
        const pin = smooth(seg(lt, q.line - 0.1, q.line + 0.25));
        aim(ctx.camera, cp, V(1.5, 1.78, Sets.DOOR_Z - 0.05).lerp(K.boneWorld('Head').add(V(0, -0.05, 0)), pin), 0.01);
        ctx.camera.fov = 48 - push * 6 - smooth(seg(lt, q.line - 0.1, q.line + 0.2)) * 12; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { P.grade.uniforms.flash.value = lt > q.close ? Math.max(0, 1 - (lt - q.close) * 8) * 0.25 : 0; },
      hud(lt) {
        const kp = HUD.project(ctx.camera, K.boneWorld('Head').add(V(0, 0.35, 0)));
        const tag = lt > q.open + 0.2 && lt < q.close - 0.1 ? `<div class="loc" style="left:${kp.x - 110}px;top:${kp.y - 60}px;padding:8px 18px 8px 10px"><div class="pin" style="width:36px;height:36px;background:#f2c94c;font-size:20px">K</div><div><div class="t1" style="font-size:28px">Kyle S</div><div class="t2" style="font-size:15px">⭐ 4.1 · customer</div></div></div>` : '';
        return tag + HUD.capbox(lt, q.line, DUR('kyle'), 'Kyle S: “kinda melted ngl” 🥤', { y: 1330, size: 70 })
          + HUD.gameHud({ secs: eta(START.kyle + lt), tip: 50, a: 0.85 });
      },
    };
  },
};

// ---------------------------------------------------------------- 12. TIP: $50 → $0
const S_TIP = {
  name: 'tip', dur: DUR('tip'),
  async build() {
    const q = Q('tip');
    const { ctx, R, K } = await hallSet();
    K.root.visible = false;
    await R.C.load('facepalm', 'lookdown');
    const phone = box(0.075, 0.155, 0.009, mat(0x0a0a0c, { metalness: 0.5 })); ctx.scene.add(phone);
    const scr = box(0.068, 0.145, 0.002, mat(0x000000, { emissive: 0x30d158, emissiveIntensity: 1.2 })); phone.add(scr); scr.position.z = 0.0034;
    return {
      ctx, fx: { ao: 0.5 },
      update(lt) {
        R.root.rotation.y = Math.PI - 0.35;
        if (lt < q.zero + 0.2) {
          R.walk('lookdown', 1 + lt, { offset: V(0, 0, 0), yaw: 0 });
          const hand = R.root.localToWorld(V(-0.05, 1.05, 0.36));
          ik2(R.C.bone('RightArm'), R.C.bone('RightForeArm'), R.C.bone('RightHand'), hand, R.root.localToWorld(V(-0.6, 0.8, -0.3)));
          phone.visible = true; phone.position.copy(R.C.boneWorld('RightHand')).add(V(0, 0.06, 0)); phone.lookAt(R.C.boneWorld('Head'));
        } else {
          R.walk('facepalm', (lt - q.zero - 0.2) * 1.4 + 0.3, { offset: V(0, 0, 0), yaw: 0, loop: false });
          phone.visible = false;
        }
        const k = easeInOut(seg(lt, 0, DUR('tip')));
        const base = R.root.position.clone();
        aim(ctx.camera, base.clone().add(lerpV([0.55, 1.5, -1.9], [0.4, 1.55, -1.35], k)).add(handheld(lt, 0.012)), base.clone().add(V(0, 1.4, 0)), 0);
        ctx.camera.fov = 46; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { P.grade.uniforms.sat.value = 1.06 - seg(lt, q.zero, q.zero + 0.3) * 0.45; },
      hud(lt) {
        return HUD.notif(lt, q.notif, DUR('tip'), 'Kyle S changed your tip', 'thanks for the delivery! 🙂', { y: 260 })
          + HUD.tipChange(lt, q.zero, { y: 1120 })
          + HUD.caption(lt, q.caption, DUR('tip'), 'every. single. *time.*', { y: 1470, size: 76, per: 0.25 })
          + HUD.gameHud({ secs: 4, tip: lt > q.zero ? 0 : 50, a: 0.85 });
      },
    };
  },
};

// ---------------------------------------------------------------- 13. END: TIP BAIT over Lake Eola
const S_END = {
  name: 'end', dur: DUR('end'),
  async build() {
    const q = Q('end');
    // Citi Tower at dusk from the Church & Lake corner, lights coming on
    const ctx = await exterior({ center: [-20, 25], radius: 650, sky: 'dusk', sunAz: 250, sunEl: 6, shadowBox: 45, dressR: 0, night: 0.7 });
    await citiTower(ctx, { night: 0.7 });
    ctx.renderer.toneMappingExposure *= 0.42; ctx.scene.backgroundIntensity *= 0.7; ctx.scene.environmentIntensity *= 0.7;
    await Wd.traffic(ctx, { names: ['Lake Avenue'], center: [-29, 30], radius: 120, n: 0, parked: 4, seed: 4 });
    return {
      ctx, fx: { bloom: 0.5, bloomThreshold: 0.8 },
      update(lt) {
        const k = easeOut(seg(lt, 0, DUR('end')));
        aim(ctx.camera, CORNER.clone().add(lerpV([-26, 1.5, 27], [-23, 1.7, 24], k)).add(handheld(lt, 0.03)), CORNER.clone().add(V(6, 24 - k * 3, -8)), -0.02);
        ctx.camera.fov = 66; ctx.camera.updateProjectionMatrix();
        ctx.focusSun(CORNER, 300);
      },
      post(lt, P) { const g = P.grade.uniforms; g.vig.value = 0.42; g.sat.value = 1.15; g.contrast.value = 1.1; g.flash.value = Math.max(0, 1 - lt * 6) * 0.6; },
      hud(lt) {
        const a = seg(lt, q.logo, q.logo + 0.25), s = 1.2 - 0.2 * easeOut(seg(lt, q.logo, q.logo + 0.4));
        const cta = easeBack(seg(lt, q.cta, q.cta + 0.3));
        return `<div class="end" style="top:330px;opacity:${a};transform:scale(${s})">
          <div class="logo">TIP<br><b>BAIT</b></div>
          <div class="tag">the customers are the villains.<br>Downtown Orlando.</div>
          <div class="stores" style="transform:scale(${cta});opacity:${Math.min(1, cta)}"><div class="store"><small>COMING SOON ON</small>iPhone</div><div class="store"><small>COMING SOON ON</small>Android</div></div>
        </div>`
          + HUD.caption(lt, q.tag, DUR('end'), 'tag your *Kyle* 👇', { y: 1240, size: 60 })
          + HUD.notif(lt, DUR('end') - 1.4, DUR('end'), 'New order from Kyle S 🙏', '$50 tip if ur fast 😉', { y: 160 });
      },
    };
  },
};

export const SHOTS_B = [S_REAL, S_ARRIVE, S_ELEVATOR, S_STAIRS, S_KYLE, S_TIP, S_END];
