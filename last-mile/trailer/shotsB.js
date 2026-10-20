// Shots 8–15: real towers montage → CitiTower → elevator out → 20 floors of stairs → the slip → delivered → title → stinger.
import { THREE, V, aim, seg, lerp, lerpV, easeIn, easeOut, easeInOut, easeBack, sstep, spring, handheld, shake, clamp, glowSprite, mat, glow, box, mesh, setup, addQuad, dotTex, rr, reseed } from '../engine/core.js';
import * as HUD from '../engine/hud.js';
import * as I from '../engine/interiors.js';
import { downtown, trafficEW, courier, DUR, Q, C, Lm, Rd } from './kit.js';

const PH = (x, z) => V(x, 0, z);
const HEAD = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 };
const DOOR = 2006;

// ---------------------------------------------------------------- 8. TOWERS: four real towers, one beat each
const TOWER_CUTS = [
  { name: 'The VUE', sub: '36 floors · Lake Eola', cam: [262, 1.6, -246], look: [215, 95, -300], drift: [-6, 2, 0] },
  { name: 'Aspire', sub: 'Across from the lake', cam: [168, 1.4, -18], look: [120, 70, -60], drift: [0, 1, -6] },
  { name: 'Society Orlando', sub: '410 N Orange Ave', cam: [12, 1.5, -497], look: [40, 75, -540], drift: [5, 1, 0] },
  { name: 'Kia Center', sub: 'Church St · Downtown', cam: [-392, 2.2, 572], look: [-462, 22, 482], drift: [-8, 0.5, 0] },
];
const S_TOWERS = {
  name: 'towers', dur: DUR('towers'),
  build() {
    const q = Q('towers');
    const { ctx } = downtown({ focus: [-60, 0], radius: 720, fogNear: 300, fogFar: 2600, shadow: false, landmarks: ['vue', 'aspire', 'society', 'kia', 'lake', 'truist', 'citi'], lake: { oaks: false, boats: false } });
    C.cityLights(ctx, { focus: [-60, 0], radius: 720 });
    trafficEW(ctx, C.EW.church, -600, 300, { n: 10 });
    const cut = (lt) => Math.min(3, Math.floor(lt / 0.4));
    return {
      ctx, env: V(60, 30, -100), fx: { bloom: 0.65 },
      update(lt) {
        const i = cut(lt), u = (lt - q.cuts[i]) / 0.4;
        const c = TOWER_CUTS[i];
        const cp = V(...c.cam).add(V(...c.drift).multiplyScalar(easeOut(u))).add(handheld(lt * 2, 0.08));
        aim(ctx.camera, cp, V(...c.look).add(V(0, -u * 6, 0)), (i % 2 ? 1 : -1) * (0.06 - u * 0.04));
        ctx.camera.fov = 62 - u * 6;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        const u = (lt % 0.4) / 0.4;
        cp.grade.uniforms.zoom.value = Math.max(0, 1 - u * 5) * 0.12;
        cp.grade.uniforms.flash.value = Math.max(0, 1 - u * 8) * 0.25;
      },
      hud(lt) {
        const i = cut(lt), t0 = q.cuts[i];
        const c = TOWER_CUTS[i];
        return HUD.place(lt, t0 - 0.3, t0 + 0.4, c.name, c.sub, { top: 170 })
          + HUD.caption(lt, 0.05, DUR('towers'), 'EVERY TOWER. / EVERY LOBBY. / *ENTERABLE.*', { y: 800, size: 58, per: 0.18 });
      },
    };
  },
};

// ---------------------------------------------------------------- 9. ARRIVE: tilt down CitiTower, then pull up to the front door
// Cut A (0 → cutB): across Church St, tilt from the rooftop pool down to the entrance.
// Cut B: on the sidewalk, 3/4 on the glass lobby + CITITOWER letters; he pulls up, hops off, runs in.
const S_ARRIVE = {
  name: 'arrive', dur: DUR('arrive'),
  build() {
    const q = Q('arrive');
    const { ctx, L } = downtown({ focus: [320, 360], radius: 400, landmarks: ['citi', 'lake', 'truist'], lake: { oaks: false, boats: false }, dress: [{ ew: 380, from: 120, to: 250, step: 26 }, { ew: 380, from: 360, to: 520, step: 26 }], shadowBox: 12, keyDir: [0.5, 0.45, 0.7] });
    trafficEW(ctx, C.EW.church, 100, 560, { n: 8, lanes: [-4] });
    const K = courier(ctx);
    const cup = Lm.cup({ scale: 0.9 }); cup.position.y = 0.035; K.B.userData.holder.add(cup);
    const top = L.citi.userData.top.clone();
    const corner = L.citi.userData.corner.clone(); // chamfered entrance, faces SW onto the intersection
    const out = L.citi.userData.cornerDir.clone();
    const side = V(out.z, 0, -out.x); // along the chamfer (toward Church St side → east-ish)
    const door = corner.clone();
    const sign = L.citi.userData.sign.clone();
    const signMid = L.citi.userData.signMid.clone();
    // pull-up: north on brick Lake Ave, easing to the curb opposite the doors, then hop the curb to the entrance
    const stopP = V(door.x - 7.2, 0, door.z + 0.6);
    const P0 = V(stopP.x - 3.6, 0, stopP.z + 30), P1 = V(stopP.x - 3.2, 0, stopP.z + 9), P2 = stopP;
    const pathAt = (u) => { const a = P0.clone().lerp(P1, u), b = P1.clone().lerp(P2, u); return a.lerp(b, u); };
    const uAt = (lt) => 1 - Math.pow(1 - seg(lt, q.enter - 0.1, q.stop), 1.7);
    return {
      ctx, env: corner.clone().add(out.clone().multiplyScalar(8)).add(V(0, 2, 0)), fx: { dof: { focus: 18, aperture: 0.0006, maxblur: 0.004 }, bloom: 0.5 },
      update(lt) {
        const u = uAt(lt);
        const p = pathAt(u), pn = pathAt(Math.min(1, u + 0.02));
        const heading = u < 0.98 ? Math.atan2(pn.x - p.x, pn.z - p.z) : Math.atan2(P2.x - pathAt(0.96).x, P2.z - pathAt(0.96).z);
        const brk = sstep(q.brake, q.stop, lt);
        const off = lt > q.dismount;
        K.root.position.copy(p);
        K.root.rotation.set(0, heading, -Math.sin(u * Math.PI) * 0.18 * (1 - brk));
        K.root.rotation.x = spring(lt, q.stop, { amp: -0.06, freq: 2, damp: 0.2 });
        Rd.rollBike(K.B, u * 16, lt < q.brake ? u * 16 / 2.3 : undefined);
        if (!off) {
          K.R.position.set(0, 0, 0); K.R.rotation.set(0, 0, 0);
          const footDown = sstep(q.stop - 0.15, q.stop + 0.1, lt);
          Rd.poseRide(K.R, K.B, { lean: 0.4 - footDown * 0.2, stand: 0.25 * (1 - brk), look: V(-0.2 * footDown, 0.1, 1) });
          cup.visible = true;
        } else {
          // hop off to the left, grab the cup, run for the doors
          const run = seg(lt, q.run, DUR('arrive'));
          const lp = K.root.worldToLocal(door.clone().add(V(-0.6, 0, 0)));
          K.R.position.set(0.55, 0, 0.1).lerp(lp, easeIn(run) * 0.85);
          const toDoor = Math.atan2(lp.x - 0.55, lp.z - 0.1);
          K.R.rotation.set(0, lerp(0, toDoor, sstep(q.dismount, q.run, lt)), 0);
          if (lt < q.run) Rd.poseStand(K.R, { t: lt, handR: V(-0.2, 1.15, 0.35), lean: 0.15, look: V(0, 0.2, 1) });
          else Rd.poseRun(K.R, (lt - q.run) * 3.4, { speed: 1, lean: 0.35, carry: { R: V(-0.18, 1.15, 0.35) } });
          K.R.updateMatrixWorld(true);
          K.B.userData.holder.remove(cup); ctx.scene.add(cup);
          cup.position.copy(Rd.handWorld(K.R, 'R')).add(V(0, -0.1, 0));
          cup.scale.setScalar(1);
        }
        let cp, tgt, fov;
        if (lt < q.cutB) {
          // across the intersection (the photo's angle): tilt from the balcony stack down to the CITI TOWER sign
          const tilt = easeInOut(seg(lt, 0, q.tiltEnd));
          cp = corner.clone().add(out.clone().multiplyScalar(30)).add(side.clone().multiplyScalar(-2)).add(V(0, 1.4, 0)).add(handheld(lt, 0.05));
          tgt = top.clone().add(V(0, -38, 0)).lerp(corner.clone().add(V(0, 4.5, 0)), tilt);
          fov = 58;
        } else {
          // on the corner: 3/4 on the chamfer, sign + glass + brick apron in frame; he pulls up into it
          const k = easeOut(seg(lt, q.cutB, DUR('arrive')));
          // the street-view angle: from the Church St corner, looking north along the Lake Ave facade
          cp = lerpV([corner.x - 12.5, 1.35, corner.z + 7.5], [corner.x - 12.0, 1.5, corner.z + 5.5], k).add(handheld(lt, 0.03)).add(shake(lt, q.stop, 0.03, 0.3));
          tgt = lerpV([signMid.x - 1.5, 2.9, signMid.z - 6], [signMid.x - 2.6, 2.4, door.z - 2], k);
          fov = 54;
        }
        aim(ctx.camera, cp, tgt, 0.015);
        ctx.camera.fov = fov;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.cutB ? sign : K.root.position.clone().add(V(0, 1, 0)));
        const g = cp.grade.uniforms;
        g.flash.value = lt > q.cutB ? Math.max(0, 1 - (lt - q.cutB) * 8) * 0.25 : 0;
      },
      hud(lt) {
        return HUD.place(lt, 0.1, DUR('arrive') - 0.05, 'Citi Tower', '101 Lake Ave · Church St & Lake')
          + HUD.caption(lt, 0.15, q.cutB, 'THE DROP-OFF.', { y: 880, size: 60, per: 0.1 })
          + HUD.caption(lt, q.stop - 0.05, DUR('arrive'), 'FLOOR *20.*', { y: 880, size: 72, per: 0.1 });
      },
    };
  },
};
function ride(K, p, heading, dist, opts = {}) {
  K.root.position.copy(p);
  K.root.rotation.set(0, heading, opts.bank || 0);
  Rd.rollBike(K.B, dist, opts.crank ?? dist / 2.3);
  Rd.poseRide(K.R, K.B, opts);
}

// ---------------------------------------------------------------- 10. ELEVATOR: button, ding... OUT OF ORDER
const S_ELEVATOR = {
  name: 'elevator', dur: DUR('elevator'),
  build() {
    const q = Q('elevator');
    const ctx = setup({ light: 'inside', fogFar: 0, shadow: true, shadowBox: 6, keyDir: [0.3, 1, 0.6] });
    ctx.scene.background = new THREE.Color(0x0a0a0c);
    const Lb = I.lobby(ctx);
    const R = Rd.rider();
    const root = new THREE.Group(); root.add(R); ctx.scene.add(root);
    root.position.set(0.75, 0, -2.25);
    root.rotation.y = HEAD.N;
    const cup = Lm.cup(); ctx.scene.add(cup);
    return {
      ctx, env: V(0, 1.6, 0), fx: { dof: { focus: 2.5, aperture: 0.008, maxblur: 0.01 }, bloom: 0.5 },
      update(lt) {
        const press = sstep(0, 0.08, lt) * (1 - sstep(0.25, 0.45, lt));
        const lookSign = sstep(q.sign - 0.15, q.sign + 0.05, lt);
        const btn = root.worldToLocal(V(1.25, 1.25, -2.85));
        const rest = V(-0.32, 0.95, 0.25);
        Rd.poseStand(R, { t: lt, handR: rest.clone().lerp(btn, press), handL: V(0.28, 1.1, 0.3), look: V(lookSign * 0.75, 0.05, 1), twist: lookSign * -0.15 });
        R.updateMatrixWorld(true);
        cup.position.copy(Rd.handWorld(R, 'L')).add(V(0, -0.1, 0));
        Lb.userData.btn.material = glow(0xffffff, press > 0.5 || lt > 0.25 ? 4 : 0.3);
        // camera: wide two-shot, then a crash zoom onto the sign
        const z = easeIn(seg(lt, q.sign, q.sign + 0.12));
        const cp = lerpV([1.6, 1.6, 1.4], [0.15, 1.55, -1.9], z).add(handheld(lt, 0.02)).add(shake(lt, q.sign + 0.12, 0.03, 0.3));
        aim(ctx.camera, cp, lerpV([0.6, 1.4, -2.8], [0, 1.55, -2.8], z), z * 0.08);
        ctx.camera.fov = 56 - z * 10;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.sign ? root.position.clone().add(V(0, 1.4, 0)) : V(0, 1.55, -2.8));
        const g = cp.grade.uniforms;
        g.zoom.value = seg(lt, q.sign, q.sign + 0.12) * (1 - seg(lt, q.sign + 0.12, q.sign + 0.3)) * 0.15;
        g.sat.value = 1.12 - seg(lt, q.sign + 0.1, q.sign + 0.2) * 0.5;
      },
      hud(lt) {
        return HUD.caption(lt, 0.0, 0.45, '*DING.*', { y: 300, size: 70 })
          + HUD.caption(lt, q.sign + 0.12, DUR('elevator'), 'NOPE.', { y: 300, size: 92 });
      },
    };
  },
};

// ---------------------------------------------------------------- 11. STAIRS: 20 floors in three cuts, the floor counter rolls
const S_STAIRS = {
  name: 'stairs', dur: DUR('stairs'),
  build() {
    const ctx = setup({ light: 'inside', fogNear: 10, fogFar: 70, shadow: false });
    ctx.scene.background = new THREE.Color(0x0c0d10);
    ctx.scene.fog.color = new THREE.Color(0x14161c);
    I.stairwell(ctx, { floors: 20 });
    const R = Rd.rider();
    const root = new THREE.Group(); root.add(R); ctx.scene.add(root);
    const cup = Lm.cup(); ctx.scene.add(cup);
    // progress in half-flights for each cut
    const cuts = [[0, 0.8, 0.0, 1.6], [0.8, 1.6, 18.2, 19.9], [1.6, 2.4, 36.0, 37.4]];
    const sAt = (lt) => { const c = cuts.find(([a, b]) => lt < b) || cuts[2]; return lerp(c[2], c[3], seg(lt, c[0], c[1])); };
    return {
      ctx, fx: { bloom: 0.55 }, env: V(0, 30, 0),
      update(lt) {
        const s = sAt(lt);
        const { p, dir } = I.stairPath(Math.min(s, 37.99));
        const landed = lt > 2.0;
        root.position.copy(landed ? I.stairPath(37.99).p.clone().lerp(V(0, 19 * I.FH, 2.1), sstep(2.0, 2.2, lt)) : p);
        root.position.y += 0.05;
        root.rotation.y = landed ? HEAD.S : Math.atan2(dir.x, dir.z);
        const ph = lt * 3.6;
        const held = V(-0.18, 1.18, 0.3);
        if (landed) Rd.poseStand(R, { t: lt, handR: V(-0.22, 1.5, 0.2), lean: 0.25, crouch: 0.2, look: V(0, 0.3, 1) });
        else Rd.poseRun(R, ph, { speed: 1, lean: 0.4, stairs: 1, carry: { R: held } });
        R.updateMatrixWorld(true);
        cup.position.copy(Rd.handWorld(R, 'R')).add(V(0, -0.1, 0));
        cup.rotation.y = root.rotation.y;
        const i = lt < 0.8 ? 0 : lt < 1.6 ? 1 : 2;
        const rp = root.position;
        if (i === 0) aim(ctx.camera, V(0.05, 0.3, 0.2).add(handheld(lt, 0.04)), V(0.0, 40, -0.1), lt * 0.6); // straight up the well
        else if (i === 1) aim(ctx.camera, rp.clone().add(V(1.6, 1.0, 1.4)).add(handheld(lt, 0.05)), rp.clone().add(V(0, 0.9, -0.6)), -0.1);
        else aim(ctx.camera, V(-2.2, 19 * I.FH + 0.4, 0.8).add(shake(lt, 2.0, 0.05, 0.35)), V(0.6, 19 * I.FH + 1.3, 2.1), 0.04);
        ctx.camera.fov = i === 0 ? 75 : 60;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        const g = cp.grade.uniforms;
        const u = lt % 0.8;
        g.zoom.value = Math.max(0, 1 - u * 4) * 0.12 + (lt > 0.8 && lt < 1.6 ? 0.03 : 0);
        g.flash.value = lt > 2.0 ? Math.max(0, 1 - (lt - 2.0) * 6) * 0.35 : 0;
      },
      hud(lt) {
        const f = lt < 2.0 ? Math.max(1, Math.round(1 + 18 * easeIn(seg(lt, 0, 2.0)))) : 20;
        const pop = lt > 2.0 ? 1 + Math.max(0, 1 - (lt - 2.0) * 5) * 0.3 : 1;
        const color = f === 20 ? '#06C167' : '#fff';
        return `<div class="floor" style="top:360px;transform:scale(${pop});transform-origin:100% 50%;color:${color}"><small>FLOOR</small>${f}</div>`
          + HUD.caption(lt, 0.1, 1.95, 'TAKE THE *STAIRS.*', { y: 900, size: 58, per: 0.1 });
      },
    };
  },
};

// ---------------------------------------------------------------- 12. SLIP: robot vacuum, the cup flies, slow-mo, the catch
const S_SLIP = {
  name: 'slip', dur: DUR('slip'),
  build() {
    const q = Q('slip');
    const ctx = setup({ light: 'inside', fogFar: 0, shadow: true, shadowBox: 5, keyDir: [0.2, 1, 0.3] });
    ctx.scene.background = new THREE.Color(0x0a0a0c);
    I.corridor(ctx);
    const rb = I.roomba(); ctx.scene.add(rb);
    const R = Rd.rider();
    const pivot = new THREE.Group(); pivot.add(R); ctx.scene.add(pivot);
    const cup = Lm.cup(); ctx.scene.add(cup);
    // time remap: real time → story time; slow-mo between slowIn..slowOut sized so the catch lands on cue
    const vz = 6.2, vy = 1.4, y0 = 1.15;
    const tFall = (vy + Math.sqrt(vy * vy + 2 * 9.8 * (y0 - 0.22))) / 9.8;
    const ttCatch = q.trip + tFall;
    const r = (ttCatch - q.slowIn) / (q.catch - q.slowIn);
    const TT = (lt) => (lt < q.slowIn ? lt : lt < q.slowOut ? q.slowIn + (lt - q.slowIn) * r : q.slowIn + (q.slowOut - q.slowIn) * r + (lt - q.slowOut));
    const zRun = (tt) => 2 - 6.8 * tt;
    const zTrip = zRun(q.trip);
    const cupAt = (tt) => { const u = tt - q.trip; return V(-0.12, y0 + vy * u - 4.9 * u * u, zTrip - 0.35 - vz * 0.5 * u); };
    const catchP = cupAt(ttCatch);
    return {
      ctx, env: V(0, 1.4, -6), fx: { dof: { focus: 2, aperture: 0.01, maxblur: 0.012 }, bloom: 0.5 },
      update(lt) {
        const tt = TT(lt);
        rb.position.set(0.3 - tt * 0.15, 0, zTrip - 0.25);
        rb.rotation.y = tt * 0.8;
        if (tt < q.trip) {
          pivot.position.set(0, 0, zRun(tt));
          pivot.rotation.set(0, HEAD.N, 0);
          Rd.poseRun(R, tt * 2.6, { speed: 1, lean: 0.3, carry: { R: V(-0.16, 1.15, 0.35) } });
          R.updateMatrixWorld(true);
          cup.position.copy(Rd.handWorld(R, 'R')).add(V(0, -0.1, 0));
          cup.rotation.set(0, 0, 0);
        } else {
          const u = clamp((tt - q.trip) / tFall);
          const dive = easeOut(u);
          // body dives forward: pivot pitched over, sliding on, arms reaching to the catch point
          const pitch = dive * 1.32;
          pivot.rotation.set(0, HEAD.N, 0);
          pivot.rotateX(pitch);
          const reach = V(-0.15, 1.95, 0.25);
          Rd.poseRun(R, q.trip * 2.6 + u * 0.4, { speed: 0.6, lean: 0.2, carry: { R: reach, L: V(0.2, 1.85, 0.2) }, look: V(0, 0.4, 1) });
          // place body so the right hand meets the cup exactly at the catch
          pivot.position.set(0, 0, 0); pivot.updateMatrixWorld(true);
          const hand0 = Rd.handWorld(R, 'R');
          const target = tt < ttCatch ? lerpV([0, 0, zTrip], [catchP.x - hand0.x, 0, catchP.z - hand0.z], easeInOut(u)) : V(catchP.x - hand0.x, 0, catchP.z - hand0.z - Math.min(0.6, (tt - ttCatch) * 1.5));
          pivot.position.set(target.x, Math.max(0, 0.2 * Math.sin(u * Math.PI)), target.z);
          pivot.updateMatrixWorld(true);
          if (tt < ttCatch) { cup.position.copy(cupAt(tt)); cup.rotation.set((tt - q.trip) * 4.5, 0, (tt - q.trip) * 2); }
          else { cup.position.copy(Rd.handWorld(R, 'R')).add(V(0, -0.08, 0)); cup.rotation.set(0, 0, 0); }
        }
        // camera: side-on tracking low, then orbit around the cup during the slow-mo, ending tight on the catch
        const k = sstep(q.slowIn - 0.1, q.catch, lt);
        const c = cup.position;
        const orbitA = lerp(-0.4, 1.2, k);
        const camO = V(Math.cos(orbitA) * lerp(0.95, 0.6, k), lerp(0.9, 0.35, k), Math.sin(orbitA) * lerp(2.4, 0.8, k) + 0.3);
        const base = lt < q.slowIn ? V(0.95, 0.8, pivot.position.z + 1.6) : c.clone().add(camO);
        base.x = clamp(base.x, -1.05, 1.05);
        aim(ctx.camera, base.add(handheld(lt, 0.02)).add(shake(lt, q.catch, 0.03, 0.3)), lt < q.slowIn ? pivot.position.clone().add(V(0, 0.9, -1)) : c.clone(), 0.05 * k);
        ctx.camera.fov = lerp(60, 44, k);
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(lt < q.trip ? pivot.position.clone().add(V(0, 1, 0)) : cup.position);
        const g = cp.grade.uniforms;
        const slow = sstep(q.slowIn - 0.05, q.slowIn + 0.1, lt) * (1 - sstep(q.slowOut - 0.1, q.slowOut + 0.05, lt));
        g.sat.value = 1.12 - slow * 0.3;
        g.vig.value = 0.32 + slow * 0.3;
        g.ca.value = 0.0015 + slow * 0.004;
        g.flash.value = lt > q.catch ? Math.max(0, 1 - (lt - q.catch) * 7) * 0.3 : 0;
      },
      hud(lt) {
        return HUD.caption(lt, q.trip + 0.05, q.catch - 0.1, '~NOOO~', { y: 300, size: 72 })
          + HUD.caption(lt, q.catch, DUR('slip'), '*CLUTCH.*', { y: 300, size: 96 });
      },
    };
  },
};

// ---------------------------------------------------------------- 13. DELIVER: four seconds late. Kyle takes the coffee — and the tip.
const S_DELIVER = {
  name: 'deliver', dur: DUR('deliver'),
  build() {
    const q = Q('deliver');
    const ctx = setup({ light: 'inside', fogFar: 0, shadow: true, shadowBox: 5, keyDir: [0.2, 1, 0.3] });
    ctx.scene.background = new THREE.Color(0x0a0a0c);
    const Cd = I.corridor(ctx);
    const d = Cd.userData.doors[DOOR];
    // Kyle's apartment beyond the door: warm room, lamp, the city in the window
    const room = new THREE.Group(); ctx.scene.add(room);
    box(0.1, 2.6, 4, glow(0x3a4a7a, 0.9), 5.2, 1.3, d.z, room);
    box(0.1, 2.6, 4, mat(0xd8c8b0), 5.25, 1.3, d.z + 2.5, room);
    box(4, 0.1, 6, mat(0x6a4a32, { roughness: 0.4 }), 3.2, 0, d.z, room);
    const pl = new THREE.PointLight(0xffc080, 0, 9, 1.6); pl.position.set(3.0, 2.0, d.z + 0.8); room.add(pl);
    const R = Rd.rider();
    const root = new THREE.Group(); root.add(R); ctx.scene.add(root);
    root.position.set(0.15, 0, d.z);
    root.rotation.y = HEAD.E;
    const kyle = Rd.rider({ outfit: 'customer' });
    const kroot = new THREE.Group(); kroot.add(kyle); ctx.scene.add(kroot);
    kroot.position.set(2.5, 0, d.z); kroot.rotation.y = HEAD.W;
    const key = new THREE.SpotLight(0xffe8d0, 6, 6, 0.6, 0.5, 1.5); key.position.set(0.4, 2.6, d.z + 0.6); key.target.position.set(1.8, 1.4, d.z); ctx.scene.add(key, key.target);
    const cup = Lm.cup(); ctx.scene.add(cup);
    return {
      ctx, env: V(0, 1.5, d.z), fx: { dof: { focus: 2, aperture: 0.005, maxblur: 0.01 }, bloom: 0.6 },
      update(lt) {
        const open = easeOut(seg(lt, q.open, q.open + 0.3)) * (1 - easeIn(seg(lt, q.slam - 0.12, q.slam)));
        d.leaf.rotation.y = open * 1.55 * d.sx;
        pl.intensity = open * 35;
        const knock = lt < q.open ? Math.max(0, Math.sin(seg(lt, q.knock, q.knock + 0.33) * Math.PI * 3)) : 0;
        const give = sstep(q.hand - 0.25, q.hand, lt);
        const take = lt > q.hand + 0.05;
        const slump = sstep(q.zero, q.zero + 0.4, lt);
        Rd.poseStand(R, { t: lt, handL: V(0.15, 1.45 + knock * 0.05, 0.45 + knock * 0.12), handR: take ? V(-0.28, 0.98 - slump * 0.05, 0.15) : V(-0.1, 1.1 + give * 0.15, 0.3 + give * 0.4), look: V(0, 0.05 - slump * 0.35, 1), lean: 0.04 + slump * 0.12 });
        R.position.x = -spring(lt, q.slam, { amp: 0.04, freq: 3, damp: 0.2 });
        // Kyle steps into the doorway, takes it, checks the phone, steps back as the door slams
        kroot.position.x = 2.5 - open * 0.75;
        const cHand = kroot.worldToLocal(Rd.rigToWorld(root, V(-0.1, 1.27, 0.72)));
        const reach = sstep(q.hand - 0.15, q.hand, lt) * (1 - sstep(q.hand + 0.15, q.hand + 0.5, lt));
        const sip = sstep(q.stars - 0.1, q.stars + 0.2, lt) * (1 - sstep(q.tip - 0.2, q.tip, lt));
        const kHand = V(-0.22, 1.0, 0.25).lerp(cHand, reach).lerp(V(-0.12, 1.55, 0.22), sip);
        Rd.poseStand(kyle, { t: lt + 3, handR: kHand, handL: lt > q.tip - 0.3 ? V(0.12, 1.15, 0.35) : null, look: V(0, lt > q.tip - 0.3 ? -0.55 : 0.0, 1), lean: 0.02 });
        R.updateMatrixWorld(true); kyle.updateMatrixWorld(true);
        cup.position.copy(take ? Rd.handWorld(kyle, 'R') : Rd.handWorld(R, 'R')).add(V(0, -0.1, 0));
        cup.visible = !(lt > q.slam);
        // over the courier's shoulder; push in on Kyle; jolt on the slam
        const k = easeInOut(seg(lt, 0, q.zero));
        const cp = lerpV([-1.0, 1.75, d.z + 1.25], [-0.45, 1.68, d.z + 0.62], k).add(handheld(lt, 0.02)).add(shake(lt, q.slam, 0.05, 0.4));
        aim(ctx.camera, cp, V(1.5, 1.45, d.z - 0.1), 0.02);
        ctx.camera.fov = 50 - k * 6;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(V(1.7, 1.4, d.z));
        const g = cp.grade.uniforms;
        g.flash.value = lt > q.slam ? Math.max(0, 1 - (lt - q.slam) * 8) * 0.3 : 0;
        g.sat.value = 1.12 - sstep(q.zero, q.zero + 0.3, lt) * 0.35;
      },
      hud(lt) {
        const kp = HUD.project(ctx.camera, kroot.position.clone().add(V(0, 2.05, 0)));
        const ka = seg(lt, q.kyle, q.kyle + 0.15) * (1 - seg(lt, q.slam - 0.1, q.slam));
        const tag = ka > 0 ? `<div class="ktag" style="left:${kp.x}px;top:${kp.y}px;opacity:${ka};transform:translate(-50%,-100%) scale(${0.7 + 0.3 * easeBack(seg(lt, q.kyle, q.kyle + 0.25))})"><i></i>KYLE<span>CUSTOMER</span></div>` : '';
        return tag
          + HUD.stars(lt, q.stars, 2, { y: 560, size: 70 })
          + HUD.stamp(lt, q.stars + 0.3, 'LATE · 0:04', { y: 655 })
          + HUD.notify(lt, q.tip, 'Kyle removed your tip.', '“took 4 extra seconds. ice was melting.”')
          + HUD.tipZero(lt, q.zero, { y: 760 })
          + HUD.caption(lt, q.zero + 0.35, DUR('deliver'), 'THANKS, *KYLE.*', { y: 960, size: 70, per: 0.15 });
      },
    };
  },
};

// ---------------------------------------------------------------- 14. TITLE: the drop over Lake Eola, LAST MILE
const S_TITLE = {
  name: 'title', dur: DUR('title'),
  build() {
    const q = Q('title');
    const { ctx, L } = downtown({ focus: [250, 50], radius: 800, light: 'night', fogNear: 400, fogFar: 3000, shadow: false, lake: { oaks: true, boats: true } });
    C.cityLights(ctx, { focus: [250, 50], radius: 800 });
    trafficEW(ctx, C.EW.central, -300, 700, { n: 14 });
    return {
      ctx, env: V(365, 60, -70), fx: { bloom: 0.8, bloomThreshold: 0.85 },
      update(lt) {
        const u = easeOut(seg(lt, 0, DUR('title')));
        const cp = lerpV([520, 60, 160], [640, 150, 260], u).add(handheld(lt, 0.8)).add(shake(lt, q.drop, 3, 0.5));
        aim(ctx.camera, cp, lerpV([340, 20, -100], [250, 40, -160], u), -0.03);
        ctx.camera.fov = 55;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        const g = cp.grade.uniforms;
        g.flash.value = Math.max(0, 1 - lt * 5) * 0.9;
        g.zoom.value = Math.max(0, 1 - lt * 2.5) * 0.15;
        g.vig.value = 0.45;
      },
      hud(lt) {
        const a = seg(lt, q.logo, q.logo + 0.25);
        const sc = 1.25 - 0.25 * easeOut(seg(lt, q.logo, q.logo + 0.35)) + lt * 0.015;
        const cta = easeBack(seg(lt, q.cta, q.cta + 0.3));
        const letters = 'LAST MILE'.split('').map((ch, i) => {
          const k = easeOut(seg(lt, q.logo + i * 0.03, q.logo + i * 0.03 + 0.25));
          return `<span style="display:inline-block;opacity:${k};transform:translateY(${(1 - k) * 40}px)" class="${i > 4 ? 'm' : ''}">${ch === ' ' ? '&nbsp;' : ch}</span>`;
        }).join('');
        return `<div class="title" style="top:380px;opacity:${a};transform:scale(${sc})">
          <div class="kick">DOWNTOWN ORLANDO</div>
          <div class="logo">${letters}</div>
          <div class="sub" style="opacity:${seg(lt, q.logo + 0.4, q.logo + 0.7)}">EVERY ORDER. EVERY FLOOR.</div>
          <div class="cta" style="transform:scale(${cta});opacity:${Math.min(1, cta)}">WISHLIST NOW</div>
          <div class="meta" style="opacity:${seg(lt, q.cta + 0.2, q.cta + 0.5)}">SOLO OR 4-PLAYER CO-OP · PC & CONSOLE · 2027</div>
        </div>`;
      },
    };
  },
};

// ---------------------------------------------------------------- 15. STINGER: slumped in the hall. New order. Same guy.
const S_STINGER = {
  name: 'stinger', dur: DUR('stinger'),
  build() {
    const q = Q('stinger');
    const ctx = setup({ light: 'inside', fogFar: 0, shadow: true, shadowBox: 5, keyDir: [0.2, 1, 0.3] });
    ctx.scene.background = new THREE.Color(0x0a0a0c);
    const Cd = I.corridor(ctx);
    const d = Cd.userData.doors[DOOR];
    const R = Rd.rider();
    const root = new THREE.Group(); root.add(R); ctx.scene.add(root);
    // sitting against the left wall, facing across the corridor (+x)
    root.position.set(-0.95, 0, d.z - 1.4);
    root.rotation.y = HEAD.E;
    const phone = mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), mat(0x0a0a0c, { metalness: 0.5 }));
    ctx.scene.add(phone);
    const scr = mesh(new THREE.PlaneGeometry(0.068, 0.145), glow(0x06c167, 0)); phone.add(scr); scr.position.z = 0.005;
    const faceL = new THREE.PointLight(0x40ffa0, 0, 1.5, 2); ctx.scene.add(faceL);
    return {
      ctx, env: V(0, 1.2, d.z), fx: { dof: { focus: 1.6, aperture: 0.008, maxblur: 0.01 }, bloom: 0.6 },
      update(lt) {
        const look = sstep(q.look - 0.1, q.look + 0.15, lt);
        const groan = sstep(q.groan, q.groan + 0.4, lt);
        const breathe = Math.sin(lt * 3.2) * 0.012;
        const J = {};
        const pelvis = V(0, 0.16, 0.12);
        const chest = V(0, 0.62 + breathe, -0.02 - groan * 0.04);
        const head = chest.clone().add(V(0, 0.2 - groan * 0.04, 0.02 + look * 0.04 - groan * 0.06));
        Object.assign(J, { pelvis, chest, head });
        for (const [s, sx] of [['L', 1], ['R', -1]]) {
          J['hip' + s] = pelvis.clone().add(V(sx * 0.12, -0.02, 0.02));
          J['an' + s] = V(sx * 0.22, 0.09, 0.95 + (s === 'L' ? -0.25 : 0));
          J['kn' + s] = Rd.ik2(J['hip' + s], J['an' + s], Rd.DIM.thigh, Rd.DIM.shin, V(sx * 0.2, 1, 0.2));
          J['toe' + s] = J['an' + s].clone().add(V(sx * 0.08, 0.15, 0.12));
          J['sh' + s] = chest.clone().add(V(sx * 0.2, -0.06, 0));
          const ph = V(sx * 0.06, 0.48 + look * 0.1, 0.38);
          J['wr' + s] = s === 'R' ? ph.clone().add(V(-0.03, 0, 0)) : (lt < q.ping ? V(0.32, 0.12, 0.25) : ph.clone().add(V(0.05, 0, 0)));
          J['el' + s] = Rd.ik2(J['sh' + s], J['wr' + s], Rd.DIM.upper, Rd.DIM.fore, V(sx, -0.5, 0));
        }
        Rd.applyJoints(R, J, { fwd: V(0, 0, 1), headFwd: V(0, -0.6 + look * 0.3 - groan * 0.7, 1) });
        R.updateMatrixWorld(true);
        phone.position.copy(Rd.rigToWorld(root, V(0, 0.52 + look * 0.1, 0.42)));
        phone.lookAt(Rd.rigToWorld(root, V(0, 0.85, 0.05)));
        const on = lt > q.ping ? 1 : 0.15;
        scr.material = glow(0x8affc8, on * 0.9);
        faceL.position.copy(phone.position).add(V(0, 0.1, 0));
        faceL.intensity = on * 0.3;
        const k = easeInOut(seg(lt, 0, DUR('stinger')));
        const cp = lerpV([0.9, 0.9, d.z - 0.3], [0.55, 0.75, d.z - 0.9], k).add(handheld(lt, 0.015));
        aim(ctx.camera, cp, root.position.clone().add(V(0.15, 0.55, 0)), 0);
        ctx.camera.fov = 46;
        ctx.camera.updateProjectionMatrix();
      },
      post(lt, cp) {
        cp.focusOn(root.position.clone().add(V(0, 0.6, 0)));
        cp.grade.uniforms.fade.value = seg(lt, DUR('stinger') - 0.12, DUR('stinger'));
      },
      hud(lt) {
        const card = lt > q.ping ? `<div class="order" style="top:${700 + (1 - easeBack(seg(lt, q.ping, q.ping + 0.3))) * 160}px;transform:scale(.82);opacity:${seg(lt, q.ping, q.ping + 0.15)}">
          <div class="hd"><div class="app">Uber <b>Eats</b></div><div class="new">NEW ORDER</div></div>
          <div class="bd"><div class="route"><i></i><div>Starbucks · Orange Ave</div><i class="sq"></i><div>CitiTower · Floor 20</div><div class="sub">Kyle · “be faster this time”</div></div></div></div>` : '';
        return card + HUD.caption(lt, q.look, DUR('stinger'), 'IT\'S *KYLE.* / AGAIN.', { y: 330, size: 80, per: 0.16 });
      },
    };
  },
};

export const SHOTS_B = [S_TOWERS, S_ARRIVE, S_ELEVATOR, S_STAIRS, S_SLIP, S_DELIVER, S_TITLE, S_STINGER];
