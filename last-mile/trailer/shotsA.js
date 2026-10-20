// Shots 1–7: the order → Starbucks → the ride through real downtown (Orange Ave, Church Street Station, Lake Eola).
import { THREE, V, W, H, aim, seg, lerp, lerpV, easeIn, easeOut, easeInOut, expo, sstep, spring, handheld, shake, clamp, hash, glowSprite, mat, glow, box, mesh, addQuad, dotTex, rr, reseed } from '../engine/core.js';
import * as HUD from '../engine/hud.js';
import { downtown, trafficNS, trafficEW, courier, phoneScreen, DUR, Q, BEAT, C, Lm, Rd } from './kit.js';

const PH = (x, z) => V(x, 0, z);
const HEAD = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 };

// Ride a courier along a straight line; returns world position. dist drives wheel spin + pedalling.
function ride(K, p, heading, dist, opts = {}) {
  K.root.position.copy(p);
  K.root.rotation.set(0, heading, opts.bank || 0);
  Rd.rollBike(K.B, dist, opts.crank ?? dist / 2.3);
  Rd.poseRide(K.R, K.B, opts);
}
function cupOnBike(K) { const c = Lm.cup({ scale: 0.9 }); c.position.set(0, 0.035, 0); K.B.userData.holder.add(c); return c; }
// Phone UI: dark map, green route, pulsing pin, NEW ORDER banner.
function drawPhone(g, w, h, t, { accepted = false } = {}) {
  g.fillStyle = '#0f1218'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2a2f3a'; g.lineWidth = 10;
  for (let x = 20; x < w; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, h); g.stroke(); }
  for (let y = 40; y < h; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - 20); g.stroke(); }
  g.fillStyle = '#16324a'; g.beginPath(); g.ellipse(250, 260, 70, 60, 0, 0, Math.PI * 2); g.fill(); // Lake Eola
  g.strokeStyle = '#06C167'; g.lineWidth = 12; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(90, 560); g.lineTo(100, 400); g.lineTo(180, 380); g.lineTo(240, 330); g.lineTo(300, 420); g.lineTo(300, 470); g.stroke();
  const pr = 14 + Math.sin(t * 8) * 4;
  g.fillStyle = '#06C167'; g.beginPath(); g.arc(300, 470, pr, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(90, 560, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.fillRect(0, h - 210, w, 210);
  g.fillStyle = '#0b0d14'; g.font = '800 40px Inter'; g.fillText(accepted ? 'ACCEPTED' : '$47.80', 24, h - 150);
  g.font = '600 20px Inter'; g.fillStyle = '#5a5e68'; g.fillText('Starbucks → CitiTower Fl 20', 24, h - 112);
  g.fillStyle = accepted ? '#06C167' : '#0b0d14'; g.fillRect(24, h - 86, w - 48, 58);
  g.fillStyle = '#fff'; g.font = '800 24px Inter'; g.fillText(accepted ? '✓  NAVIGATING' : 'ACCEPT', 40, h - 48);
  g.fillStyle = '#0b0d14'; g.fillRect(0, 0, w, 56);
  g.fillStyle = '#fff'; g.font = '600 22px Inter'; g.fillText('Uber', 20, 36); g.fillStyle = '#06C167'; g.font = '800 22px Inter'; g.fillText('Eats', 74, 36);
  if (!accepted && Math.floor(t * 4) % 2 === 0) { g.fillStyle = '#06C167'; g.fillRect(w - 150, 12, 130, 32); g.fillStyle = '#0b0d14'; g.font = '800 16px Inter'; g.fillText('NEW ORDER', w - 140, 34); }
}

// ---------------------------------------------------------------- 1. PING: POV on the bars, the order lands
const S_PING = {
  name: 'ping', dur: DUR('ping'),
  build() {
    const q = Q('ping');
    const { ctx } = downtown({ focus: [0, 40], radius: 380, dress: [{ ns: 0, from: -300, to: 300 }], landmarks: ['sb', 'truist', 'society'] });
    trafficNS(ctx, 0, -300, 300, { n: 14 });
    const K = courier(ctx);
    cupOnBike(K).visible = false;
    for (const k of ['torso', 'head', 'neck', 'pelvis']) K.R.userData.parts[k].visible = false;
    K.root.position.set(-9.6, 0, 66);
    K.root.rotation.y = HEAD.N;
    K.B.userData.spot.intensity = 4;
    let accepted = false;
    const scr = phoneScreen(K.B, (g, w, h, t) => drawPhone(g, w, h, t, { accepted }));
    const phone = () => Rd.rigToWorld(K.B.userData.phone, V(0, 0, 0));
    return {
      ctx, env: V(-9, 2, 60), fx: { dof: { focus: 0.5, aperture: 0.012, maxblur: 0.014 }, bloom: 0.55 },
      update(lt) {
        accepted = lt > q.accept;
        Rd.rollBike(K.B, 0, 0.6);
        const tap = sstep(q.accept - 0.45, q.accept - 0.1, lt) * (1 - sstep(q.accept + 0.1, q.accept + 0.35, lt));
        const ph = K.B.userData.phone; ph.updateMatrixWorld(true);
        const tgt = K.root.worldToLocal(ph.localToWorld(V(0.01, -0.03, 0.02)));
        const grip = Rd.BIKE.bars.clone().add(V(-Rd.BIKE.gripW, 0.01, -0.02));
        Rd.poseRide(K.R, K.B, { lean: 0.45, reachR: grip.lerp(tgt, tap) });
        scr(lt);
        const push = easeInOut(seg(lt, 0, q.slam));
        const camL = lerpV([0.0, 1.62, 0.05], [0.0, 1.5, 0.22], push).add(handheld(lt, 0.012));
        const k = shake(lt, q.slam, 0.04, 0.3);
        const cp = K.root.localToWorld(camL.add(k));
        aim(ctx.camera, cp, phone().add(V(0, 0.02 - push * 0.02, 0)), Math.sin(lt * 0.8) * 0.01);
        ctx.camera.fov = 50 - push * 8 - seg(lt, q.slam, q.slam + 0.1) * 6;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(phone());
        const g = cp.grade.uniforms;
        g.fade.value = 1 - seg(lt, 0, 0.2);
        g.flash.value = Math.max(0, 1 - (lt - q.slam) / 0.12) * (lt >= q.slam ? 0.85 : 0);
        g.zoom.value = lt > q.slam ? 0.08 * (1 - seg(lt, q.slam, q.slam + 0.4)) : 0;
      },
      hud(lt) {
        return HUD.caption(lt, q.buzz, q.slam + 0.4, '*$40* TIP. ONE COFFEE. / _20_ FLOORS UP.', { y: 230, size: 58, per: 0.11 })
          + HUD.orderCard(lt, q.card, { accept: q.accept, y: 640 });
      },
    };
  },
};

// ---------------------------------------------------------------- 2. PICKUP: over-the-shoulder grab at the mobile order shelf
const S_PICKUP = {
  name: 'pickup', dur: DUR('pickup'),
  build() {
    const q = Q('pickup');
    const { ctx, L } = downtown({ focus: [-14, 80], radius: 300, landmarks: ['sb'], dress: [{ ns: 0, from: -150, to: 300 }], shadow: true, shadowBox: 8 });
    trafficNS(ctx, 0, -150, 300, { n: 10 });
    const sb = L.sb;
    const shelf = sb.userData.shelf.clone(); // world
    const R = Rd.rider();
    const root = new THREE.Group(); root.add(R); ctx.scene.add(root);
    root.position.copy(shelf).add(V(1.15, -shelf.y, 0.25)); // east of the shelf (shelf faces east)
    root.rotation.y = HEAD.W;
    // the order on the shelf: bag + cup with sticker
    const cup = Lm.cup({ scale: 1.0 });
    ctx.scene.add(cup);
    const cupHome = shelf.clone().add(V(0.25, 0.0, 0.35));
    const lk = new THREE.PointLight(0xffd8a8, 6, 4, 2); lk.position.copy(shelf).add(V(0.8, 1.1, 0.4)); ctx.scene.add(lk);
    return {
      ctx, env: shelf.clone().add(V(2, 0.4, 0)), fx: { dof: { focus: 1.2, aperture: 0.012, maxblur: 0.012 }, bloom: 0.55 },
      update(lt) {
        const reach = sstep(0.3, q.grab, lt);
        const lift = sstep(q.grab, q.grab + 0.35, lt);
        const turn = easeInOut(seg(lt, q.turn, q.turn + 0.5));
        const handT = root.worldToLocal(cupHome.clone().add(V(0.02, 0.1, 0)));
        const rest = V(-0.25, 1.0, 0.25);
        const hold = V(-0.22, 1.12 + lift * 0.1, 0.32);
        const hand = rest.clone().lerp(handT, reach * (1 - lift)).lerp(hold, lift);
        root.rotation.y = HEAD.W + turn * Math.PI * 0.9;
        Rd.poseStand(R, { t: lt, handR: hand, lean: 0.06 + reach * 0.12, look: V(-0.15, -0.25, 1), twist: -turn * 0.3 });
        R.updateMatrixWorld(true);
        if (lt > q.grab) { const hw = Rd.handWorld(R, 'R'); cup.position.copy(hw).add(V(0, -0.1, 0)); cup.rotation.set(0, root.rotation.y, 0); }
        else { cup.position.copy(cupHome); cup.rotation.set(0, 0, 0); }
        // over the right shoulder, pushing in on the hand → whip-pan on the turn
        const base = root.localToWorld(V(-0.75, 1.85, -1.35));
        const look = cupHome.clone().add(V(0, 0.15, 0)).lerp(root.localToWorld(V(-0.2, 1.2, 0.3)), lift * 0.6);
        const push = easeOut(seg(lt, 0, q.grab)) * 0.18;
        const cp = base.lerp(look, push).add(handheld(lt, 0.03));
        const whip = easeIn(seg(lt, q.turn, q.turn + 0.45));
        aim(ctx.camera, cp, look.clone().add(V(0, 0, whip * 4)), -whip * 0.25);
        ctx.camera.fov = 44;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.grab ? cupHome : Rd.handWorld(R, 'R'));
        const g = cp.grade.uniforms;
        g.zoom.value = seg(lt, q.turn + 0.1, q.turn + 0.55) * 0.12;
      },
      hud(lt) {
        return HUD.place(lt, 0.15, q.turn + 0.3, 'Starbucks', 'Orange Ave')
          + HUD.caption(lt, q.grab, DUR('pickup'), 'VENTI ICED CARAMEL / *MACCHIATO*.', { y: 860, size: 50, per: 0.06 });
      },
    };
  },
};

// ---------------------------------------------------------------- 3. LAUNCH: curb launch onto Orange Ave, low and wet
const S_LAUNCH = {
  name: 'launch', dur: DUR('launch'),
  build() {
    const q = Q('launch');
    const { ctx } = downtown({ focus: [0, 120], radius: 380, dress: [{ ns: 0, from: -200, to: 420 }], landmarks: ['sb', 'truist'] });
    trafficNS(ctx, 0, -200, 420, { n: 12 });
    const K = courier(ctx);
    cupOnBike(K);
    // bike leaves the curb in front of Starbucks heading south, accelerates past a low camera
    const x0 = -8.8, z0 = 84;
    const zAt = (t) => { const a = Math.max(0, t - q.kick); return z0 + (t < q.kick ? 0 : 3.2 * a * a + 7 * a * a * a); };
    return {
      ctx, env: V(-5, 1.5, 96), fx: { dof: { focus: 4, aperture: 0.004, maxblur: 0.01 }, bloom: 0.6 },
      update(lt) {
        const z = zAt(lt), d = z - z0;
        const k = sstep(q.kick - 0.15, q.kick + 0.2, lt);
        const wheelie = Math.max(0, Math.sin(seg(lt, q.kick, q.kick + 0.6) * Math.PI)) * 0.16;
        ride(K, PH(x0 + d * 0.06, z), HEAD.S - d * 0.004, d, { stand: k * 0.9, lean: 0.35 + k * 0.25, crank: lt < q.kick ? 0.5 : 0.5 + d / 1.4 });
        K.root.rotation.x = -wheelie;
        // camera: on the asphalt, 1 m ahead; tracks the rider past and whips around (whoosh)
        const cp = V(-5.6, 0.28, 95.5).add(handheld(lt, 0.02));
        const tgt = K.root.position.clone().add(V(0, 0.9, 0));
        aim(ctx.camera, cp, tgt, 0.05 + seg(lt, q.whoosh - 0.2, q.whoosh + 0.3) * 0.15);
        ctx.camera.fov = 58;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(K.root.position.clone().add(V(0, 0.9, 0)));
        const g = cp.grade.uniforms;
        g.zoom.value = Math.max(0, 1 - Math.abs(lt - q.whoosh) / 0.35) * 0.1;
        g.ca.value = 0.0015 + Math.max(0, 1 - Math.abs(lt - q.whoosh) / 0.35) * 0.006;
      },
      hud(lt) { return HUD.place(lt, 0.1, DUR('launch') - 0.05, 'Orange Ave', 'Downtown Orlando'); },
    };
  },
};

// ---------------------------------------------------------------- 4. SKYLINE: drone over downtown at blue hour, CitiTower waypoint
const S_SKYLINE = {
  name: 'skyline', dur: DUR('skyline'),
  build() {
    const { ctx, L } = downtown({ focus: [150, 80], radius: 850, fogNear: 400, fogFar: 3400, shadow: false });
    C.cityLights(ctx, { focus: [150, 80], radius: 850 });
    trafficNS(ctx, 0, -500, 700, { n: 40, speed: 14 });
    trafficEW(ctx, EWc(), -500, 700, { n: 20 });
    const citiTop = L.citi.userData.top.clone().add(V(0, 8, 0));
    // the GPS route on the street: a glowing green ribbon from Starbucks to CitiTower
    const pts = [[-8, 80], [-8, 120], [170, 120], [205, 112], [300, 120], [290, 160], [290, 330], [305, 340]];
    const route = routeRibbon(ctx, pts);
    return {
      ctx, env: V(150, 80, 80), fx: { bloom: 0.7, bloomThreshold: 0.85 },
      update(lt) {
        const u = easeInOut(seg(lt, 0, DUR('skyline')));
        const cp = lerpV([90, 150, 780], [150, 250, 690], u).add(handheld(lt, 1.5));
        const tgt = lerpV([300, 10, 280], [330, 20, 190], u);
        aim(ctx.camera, cp, tgt, -0.04 + u * 0.03);
        ctx.camera.fov = 52;
        ctx.camera.updateProjectionMatrix();
        route.material.opacity = 0.9 * seg(lt, 0.2, 0.8);
        route.userData.prog(seg(lt, 0.2, 1.4));
      },
      hud(lt) {
        const p = HUD.project(ctx.camera, citiTop);
        const a = seg(lt, 0.5, 0.8);
        const pin = p.behind ? '' : `<div style="position:absolute;left:${p.x}px;top:${p.y}px;transform:translate(-50%,-100%) scale(${0.6 + 0.4 * easeOut(a)});opacity:${a};text-align:center">
          <div style="font:900 22px 'Inter Display';background:#06C167;color:#0b0d14;padding:8px 14px;border-radius:12px;white-space:nowrap;box-shadow:0 0 30px rgba(6,193,103,.8)">CITITOWER · FL 20</div>
          <div style="width:3px;height:60px;margin:0 auto;background:linear-gradient(#06C167,rgba(6,193,103,0))"></div></div>`;
        return pin + HUD.caption(lt, 0.15, DUR('skyline'), 'REAL DOWNTOWN / *ORLANDO.* / BLOCK FOR BLOCK.', { y: 820, size: 56, per: 0.1 });
      },
    };
  },
};
function EWc() { return C.EW.central; }
function routeRibbon(ctx, pts) {
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(V(pts[i][0], 0.3, pts[i][1]), V(pts[i + 1][0], 0.3, pts[i + 1][1])));
  const N = 300, P = path.getSpacedPoints(N);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
    const d = b.clone().sub(a).normalize(), n = V(-d.z, 0, d.x).multiplyScalar(3.5);
    pos.push(P[i].x + n.x, 0.35, P[i].z + n.z, P[i].x - n.x, 0.35, P[i].z - n.z);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x06c167).multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
  const r = new THREE.Mesh(g, m); r.renderOrder = 3; r.userData.noDepth = true;
  r.userData.prog = (k) => g.setDrawRange(0, Math.floor(idx.length * k / 3) * 3);
  ctx.scene.add(r);
  return r;
}

// ---------------------------------------------------------------- 5. TRAFFIC: weaving south on Orange, LYNX bus near-miss (slow-mo)
const S_TRAFFIC = {
  name: 'traffic', dur: DUR('traffic'),
  build() {
    const q = Q('traffic');
    const { ctx } = downtown({ focus: [0, 230], radius: 380, dress: [{ ns: 0, from: 0, to: 480, step: 26 }], landmarks: ['truist', 'sb'] });
    // same-direction (southbound) traffic, slower than the bike; oncoming in the far lanes
    trafficNS(ctx, 0, 100, 480, { n: 10, lanes: [7.5, 2.5], speed: 9, seed: 12 });
    const K = courier(ctx);
    cupOnBike(K);
    const bus = C.lynxBus(); bus.rotation.y = Math.PI; ctx.scene.add(bus);
    const carA = C.car(0xd8d8dc, { brake: true }); carA.rotation.y = Math.PI; ctx.scene.add(carA);
    // time remap: slow-mo through the gap
    const T = (lt) => { const a = q.miss - 0.3, b = q.miss + 0.3; if (lt < a) return lt; if (lt < b) return a + (lt - a) * 0.3; return a + 0.18 + (lt - b); };
    const zR = (t) => 150 + t * 14;
    return {
      ctx, env: V(-3, 2, 180), fx: { dof: { focus: 6, aperture: 0.002, maxblur: 0.008 }, bloom: 0.6 },
      update(lt) {
        const t = T(lt);
        const z = zR(t);
        // weave: lane change right (towards the gap) then back
        const xw = -6.5 + Math.sin(t * 2.4) * 0.8 + sstep(q.bus - 0.2, q.miss, lt) * 3.2;
        const bank = -Math.cos(t * 2.4) * 0.12 - spring(lt, q.miss, { amp: 0.15, freq: 2, damp: 0.3 });
        ride(K, PH(xw, z), HEAD.S - Math.cos(t * 2.4) * 0.08, z, { lean: 0.55, tuck: 0.4, bank });
        // bus pulls out of the right-side stop as the rider arrives; white car on the left
        const bp = sstep(q.bus - 0.4, q.miss + 0.2, lt);
        bus.position.set(-9.6 + bp * 3.4, 0, zR(T(q.miss)) + (t - T(q.miss)) * 6);
        bus.rotation.y = Math.PI - (1 - bp) * 0.2 * bp * 4;
        carA.position.set(-1.0, 0, zR(T(q.miss)) + 1.0 + (t - T(q.miss)) * 8.5);
        // chase cam: low, behind-left, swinging to the side through the slow-mo
        const sw = sstep(q.miss - 0.35, q.miss + 0.1, lt) * (1 - sstep(q.miss + 0.4, q.miss + 0.9, lt));
        const off = lerpV([1.5, 1.3, -4.4], [0.9, 0.7, 3.6], easeInOut(sw));
        const cp = K.root.position.clone().add(off).add(handheld(lt * 1.5, 0.08));
        const tgt = K.root.position.clone().add(lerpV([0, 1.0, 3], [0, 1.05, 0], easeInOut(sw)));
        aim(ctx.camera, cp.add(shake(lt, q.horn, 0.12, 0.4)), tgt, -bank * 0.6);
        ctx.camera.fov = 56 + sw * 8;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(K.root.position.clone().add(V(0, 1, 0)));
        const g = cp.grade.uniforms;
        const slow = sstep(q.miss - 0.3, q.miss - 0.15, lt) * (1 - sstep(q.miss + 0.25, q.miss + 0.35, lt));
        g.sat.value = 1.12 - slow * 0.35;
        g.zoom.value = (1 - slow) * 0.035;
        g.vig.value = 0.32 + slow * 0.25;
      },
      hud(lt) {
        const p = HUD.project(ctx.camera, K.root.position.clone().add(V(0, 2.3, 0)));
        return HUD.toast(lt, q.miss, p.x, p.y - 40, 'NEAR MISS', '+$2 BONUS', { dur: 1.2 })
          + HUD.caption(lt, 0.1, q.miss - 0.15, 'DODGE THE / *LYNX.*', { y: 330, size: 66, per: 0.12 });
      },
    };
  },
};

// ---------------------------------------------------------------- 6. TRAIN: Church Street Station, beat the SunRail across the tracks
const S_TRAIN = {
  name: 'train', dur: DUR('train'),
  build() {
    const q = Q('train');
    const { ctx, L } = downtown({ focus: [-230, 390], radius: 330, landmarks: ['church', 'kia'], dress: [{ ew: 380, from: -400, to: -40, step: 26 }], shadowBox: 14 });
    const xr = C.NS.rail, zc = C.EW.church;
    const gates = [Lm.crossing(ctx, xr + 6, zc - 10, 0), Lm.crossing(ctx, xr - 6, zc + 10, Math.PI)];
    const K = courier(ctx);
    cupOnBike(K);
    const train = Lm.sunrail(ctx); ctx.scene.add(train);
    const headZ = (lt) => zc + (lt - q.train) * 34; // cab reaches the crossing at q.train, heading south
    train.rotation.y = Math.PI;
    // rider westbound on Church St: crosses the rail line at q.pass
    const xAt = (lt) => xr + (q.pass - lt) * 15;
    return {
      ctx, env: V(xr + 14, 2, zc + 3), fx: { dof: { focus: 12, aperture: 0.0015, maxblur: 0.006 }, bloom: 0.65 },
      update(lt) {
        const x = xAt(lt);
        const hop = Math.max(0, Math.sin(seg(lt, q.pass - 0.18, q.pass + 0.14) * Math.PI)) * 0.25;
        ride(K, PH(x, zc + 3.5), HEAD.W, -x, { lean: 0.6, tuck: 0.6, stand: 0.6 });
        K.root.position.y = hop;
        K.root.rotation.x = -hop * 0.4;
        train.position.set(xr, 0.35, headZ(lt) - 12.6);
        for (const g of gates) g.userData.set(lt, sstep(0, 0.9, lt));
        // camera: west of the tracks, low, looking east up Church St at the depot; holds as the train wipes frame
        const cp = V(xr - 13, 1.15, zc + 7.5).add(handheld(lt, 0.05)).add(shake(lt, q.train - 0.05, 0.25, 1.4));
        const tgt = V(xr + 10, 2.6 - seg(lt, 0, 1.0) * 0.4, zc + 1.5);
        aim(ctx.camera, cp, tgt.lerp(K.root.position.clone().add(V(0, 1, 0)), 0.35 * (1 - seg(lt, q.pass, q.pass + 0.5))), 0.03);
        ctx.camera.fov = 54;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.pass + 0.2 ? K.root.position : V(xr, 2, zc));
        const g = cp.grade.uniforms;
        g.zoom.value = seg(lt, q.train - 0.1, q.train + 0.1) * (1 - seg(lt, q.train + 0.6, DUR('train'))) * 0.06;
      },
      hud(lt) {
        return HUD.place(lt, 0.05, DUR('train') - 0.05, 'Church Street Station', 'SunRail · Est. 1889')
          + HUD.caption(lt, q.pass - 0.05, DUR('train'), 'NEVER WAIT FOR / THE *TRAIN.*', { y: 860, size: 60, per: 0.09 });
      },
    };
  },
};

// ---------------------------------------------------------------- 7. EOLA: lakeside promenade, rainbow fountain, a swan says no
const S_EOLA = {
  name: 'eola', dur: DUR('eola'),
  build() {
    const q = Q('eola');
    const { ctx, L } = downtown({ focus: [300, -40], radius: 420, landmarks: ['lake', 'vue', 'aspire', 'citi'], lake: { swans: false }, shadowBox: 12 });
    const K = courier(ctx);
    cupOnBike(K);
    const sw = Lm.swan(false); ctx.scene.add(sw);
    // promenade arc on the south-west shore, rider travelling counter-clockwise (toward the camera)
    const R0 = C.LAKE.r + 4;
    const ang = (lt) => 2.35 - lt * 0.075 - sstep(q.swerve - 0.2, q.swerve + 0.4, lt) * 0.0;
    const onRing = (a, dr = 0) => V(C.LAKE.x + Math.cos(a) * (R0 + dr), 0, C.LAKE.z + Math.sin(a) * (R0 + dr));
    const swA = 2.35 - q.swerve * 0.075 - 0.012;
    return {
      ctx, env: onRing(2.2, 0).add(V(0, 2, 0)), fx: { dof: { focus: 8, aperture: 0.0025, maxblur: 0.009 }, bloom: 0.75 },
      update(lt) {
        const a = ang(lt);
        const dodge = Math.sin(seg(lt, q.hiss, q.swerve + 0.6) * Math.PI) * 2.0;
        const p = onRing(a, dodge);
        const tan = V(Math.sin(a), 0, -Math.cos(a)); // direction of decreasing angle
        const heading = Math.atan2(tan.x, tan.z);
        ride(K, p, heading + Math.cos(seg(lt, q.hiss, q.swerve + 0.6) * Math.PI) * 0.25 * seg(lt, q.hiss, q.hiss + 0.1), lt * 12, { lean: 0.4, bank: dodge > 0 ? -dodge * 0.08 : 0 });
        // swan waddles onto the path, rears up and hisses
        const sp = onRing(swA, sstep(q.swan - 0.6, q.swan, lt) * 1.2 - 1.6);
        sw.position.copy(sp);
        sw.lookAt(p.x, 0, p.z);
        const hiss = sstep(q.hiss - 0.1, q.hiss + 0.05, lt) * (1 - sstep(q.swerve + 0.6, q.swerve + 1.0, lt));
        Lm.swanPose(sw, hiss, lt);
        // camera: low on the promenade beyond the swan, fountain across the water behind the rider
        const cA = swA - 0.075;
        const cp = onRing(cA, 8).add(V(0, 0.9, 0)).add(handheld(lt, 0.05)).add(shake(lt, q.hiss, 0.04, 0.3));
        const fnt = V(362, 9, -95);
        const subj = lerpV([p.x, 1.2, p.z], [sp.x, 0.8, sp.z], sstep(q.swan - 0.3, q.hiss, lt) * 0.6);
        aim(ctx.camera, cp, subj.lerp(fnt, 0.22), 0);
        ctx.camera.fov = 60;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.swan - 0.3 ? K.root.position : sw.position);
      },
      hud(lt) {
        return HUD.place(lt, 0.1, q.swan, 'Lake Eola Park', 'The fountain · since 1957')
          + HUD.caption(lt, q.hiss - 0.05, DUR('eola'), 'THE SWANS ARE / NOT YOUR *FRIENDS.*', { y: 330, size: 58, per: 0.09 });
      },
    };
  },
};

export const SHOTS_A = [S_PING, S_PICKUP, S_LAUNCH, S_SKYLINE, S_TRAFFIC, S_TRAIN, S_EOLA];
