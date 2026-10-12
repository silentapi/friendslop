// Trailer v3, shots 10–22: the giant arrives → FREEZE → chaos → the way home → one bite → again → title → button.
import { THREE, PAL, clay, mesh, keep, dotTex, setup } from '../engine/render.js';
import { mom, momFace, momRecoil, momWalk, momNeutral, momStomp, momSwat, M2U } from '../engine/human.js';
import { anthill } from '../engine/sets.js';
import { An, A, Wd, UI, Q, DUR, CREW, TOP, cardHtml, chatHtml, makeCrew, antAt, gait, lawnShot, kitchenShot, patioShot, Burst, Puff, donutRig, DONUT_R, DONUT_S, shadowBlob, RoundedBoxGeometry, frame } from './kit.js';
import { carryRing } from './scenesA.js';

const { aim, handheld, shake, shakeAmt, seg, easeOut, easeIn, easeInOut, lerp, arc, spring, impact, stretch } = An;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DX = 30, DZ = -60; // the donut's spot on the counter

// Rolled-up magazine cover: bright print stripes + a headline band.
let _mag = null;
function magTex() {
  if (_mag) return _mag;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ff7a4a'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#ffe070'; g.fillRect(0, 30, 512, 50);
  g.fillStyle = '#3aa0ff'; g.fillRect(0, 170, 512, 26);
  g.fillStyle = '#2a1730'; g.font = 'bold 40px Fredoka, sans-serif';
  for (let x = 0; x < 512; x += 256) g.fillText('HOME & GARDEN', x + 6, 70);
  g.fillStyle = '#fff'; g.font = 'bold 22px Fredoka, sans-serif';
  for (let x = 0; x < 512; x += 170) g.fillText('10 TIDY TIPS', x + 10, 130);
  _mag = new THREE.CanvasTexture(c);
  _mag.colorSpace = THREE.SRGBColorSpace;
  return _mag;
}

// ---------------------------------------------------------------- 11. FREEZE (thump, thump, FREEZE. she sees movement. bean needs to sneeze)
const MOM_AT = [DX + 22, 0, 185];
const S_FREEZE = {
  name: 'freeze', dur: DUR('freeze'),
  build() {
    const q = Q('freeze');
    const { ctx } = kitchenShot({ focus: [DX, TOP, DZ] });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const ring = carryRing(C, dn, DX, DZ, TOP);
    const m = mom({ prop: 'mug' });
    m.rotation.y = Math.PI;
    ctx.scene.add(m);
    const face = V(MOM_AT[0], 545, MOM_AT[2] - 10);
    return {
      ctx, fx: { dof: { focus: 14, aperture: 0.0016, maxblur: 0.012 }, bloom: 0.3, ao: 0.6 },
      update(lt) {
        const at = lt;
        const walking = at < q.freeze;
        const wz = Math.min(at, q.freeze) * 2.2;
        ring(at, { lift: 0.55 + (at < 0.8 ? q.thumps.reduce((acc, t) => acc + (at > t ? Math.max(0, Math.sin(seg(at, t, t + 0.16) * Math.PI)) * 0.4 : 0), 0) : 0), strain: 0.35 });
        dn.position.z += wz;
        CREW.forEach((w, i) => {
          const a = C[w];
          a.position.z += wz;
          A.walk(a, gait(wz) * 1.6 + i * 1.7, 1); // stops dead mid-step on FREEZE
          if (!walking) a.position.y += Math.sin(at * 38 + i) * 0.01;
          A.antennae(a, walking ? at : q.freeze, walking ? q.thumps.map((t) => [t, 0.35]) : [], { tap: walking ? 0.4 : 0.03, perk: 0.6 });
          if (at > q.thumps[1]) A.headLook(a, face, 0.6 * seg(at, q.thumps[1], q.thumps[1] + 0.2));
        });
        const b = C.bean; // the sneeze builds
        const wind = easeIn(seg(at, 3.0, q.sneeze));
        b.userData.neck.rotation.x -= wind * 0.55;
        A.jaws(b, wind * 0.8);
        A.antennae(b, at, [[q.sneeze, 1.2]], { tap: 0.05 + wind * 0.5, perk: wind });
        if (at > q.sneeze) { b.userData.neck.rotation.x += 0.9 * (1 - seg(at, q.sneeze, q.sneeze + 0.25)); A.squash(b, impact(at, q.sneeze, 0.3)); }
        // she walks in (thump, thump), stops at the table, sips; glances down... looks away
        momNeutral(m);
        const arrive = seg(at, 0, q.freeze);
        m.position.set(MOM_AT[0] + (1 - easeOut(arrive)) * 260, 0, MOM_AT[2]);
        if (arrive < 1) momWalk(m, at * 9, 0.7 * (1 - arrive));
        const glance = easeInOut(seg(at, q.glance, q.glance + 0.3)) * (1 - easeInOut(seg(at, q.away, q.away + 0.35)));
        const away = easeInOut(seg(at, q.away, q.away + 0.35));
        m.userData.torso.rotation.x = 0.18;
        m.userData.neck.rotation.x = 0.12 + glance * 0.35;
        m.userData.head.rotation.y = glance * 0.12 - away * 0.7 + Math.sin(at * 2.4) * 0.03;
        m.userData.head.rotation.z = Math.sin(at * 3.2) * 0.05 * (1 - glance);
        const sip = Math.max(0, Math.sin((at - 0.8) * 1.8)) * (1 - glance) * (at > 0.8 ? 1 : 0);
        m.userData.armR.sh.rotation.x = -0.15 - sip * 0.45;
        m.userData.armR.el.rotation.x = -1.3 - sip * 0.3;
        momFace(m, glance > 0.5 ? 'alarmed' : 'hum', glance > 0.5 ? 0.6 : 1);
        if (at > q.sneeze) { m.userData.head.rotation.y = lerp(-0.7, 0.05, easeOut(seg(at, q.sneeze, q.sneeze + 0.15))); momFace(m, 'alarmed', 1); }
        aim(ctx.camera, [DX - 7, TOP + 3.4, DZ - 15], [DX + 8, TOP + 92, 120], 70);
        handheld(ctx.camera, lt, 0.35, 33);
        shake(ctx.camera, lt, shakeAmt(lt, q.thumps, 0.25, 0.3) + shakeAmt(lt, [q.sneeze], 0.15, 0.25));
      },
      post(lt, c) {
        const toMom = easeInOut(seg(lt, q.glance - 0.15, q.glance + 0.25)) * (1 - easeInOut(seg(lt, q.away + 0.2, q.away + 0.5)));
        c.bokeh.uniforms.focus.value = lerp(15, 290, toMom);
      },
      pins: (lt) => q.thumps.map((t, k) => UI.word(ctx.camera, V(DX + 40, TOP + 30 + k * 6, DZ + 120), lt, t, 'THUMP', { size: 48 + k * 12, rot: -6 + k * 8, dur: 0.35 })).join('')
        + UI.word(ctx.camera, C.bean.position.clone().add(V(0, 2.5, 0)), lt, q.sneeze, 'ACHOO!', { size: 58, rot: 8, dur: 0.35 }),
      hud: (lt) => cardHtml('freeze', lt, { hold: 2.6, pos: 'tl' }) + chatHtml('freeze', lt),
    };
  },
};

// ---------------------------------------------------------------- 12. SPOTTED (the scream)
const S_SPOTTED = {
  name: 'spotted', dur: DUR('spotted'),
  build() {
    const q = Q('spotted');
    const { ctx } = kitchenShot({ focus: [MOM_AT[0], 500, MOM_AT[2]] });
    const m = mom({ prop: 'mug' });
    m.position.set(...MOM_AT);
    m.rotation.y = Math.PI;
    ctx.scene.add(m);
    const face = V(MOM_AT[0], 548, MOM_AT[2] - 20);
    return {
      ctx, fx: { dof: { focus: 150, aperture: 0.001, maxblur: 0.01 }, bloom: 0.3, ao: 0.6 },
      update(lt) {
        const at = lt;
        momNeutral(m);
        const k = easeOut(seg(at, q.scream - 0.1, q.scream + 0.15));
        momRecoil(m, 0.15 + 0.55 * k);
        m.userData.head.rotation.y = lerp(-0.7, 0, easeOut(seg(at, q.whip, q.whip + 0.18)));
        m.userData.neck.rotation.x = 0.25 - 0.2 * k;
        momFace(m, at < q.scream ? 'alarmed' : 'scream', 1);
        const pushIn = easeOut(seg(lt, q.scream, DUR('spotted')));
        aim(ctx.camera, [face.x - 18 + pushIn * 4, face.y - 30 + pushIn * 6, face.z - 170 + pushIn * 40], [face.x, face.y + 6, face.z], 38);
        shake(ctx.camera, lt, shakeAmt(lt, [q.scream], 3.2, 1.2));
        handheld(ctx.camera, lt, 1, 35);
      },
      post(lt, c) { c.focusOn(face); },
      pins: (lt) => UI.word(ctx.camera, face.clone().add(V(-30, 30, 0)), lt, q.scream, 'EEEEEEEK!', { size: 96, rot: -7, dur: 1.3 }),
    };
  },
};

// ---------------------------------------------------------------- 13. SWAT (WHAM; the donut tips off the edge)
const S_SWAT = {
  name: 'swat', dur: DUR('swat'),
  build() {
    const q = Q('swat');
    const SZ = 0;
    const { ctx } = kitchenShot({ focus: [DX, TOP, SZ] });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const ring = carryRing(C, dn, DX, SZ, TOP);
    const m = mom({ prop: 'none' });
    m.position.set(DX + 70, 0, 190);
    m.rotation.y = Math.PI + 0.25;
    ctx.scene.add(m);
    const L = 110;
    const piv = new THREE.Group();
    piv.position.set(DX + 11, TOP + 95, SZ + 52);
    const mag = mesh(new THREE.CylinderGeometry(9, 9, L, 32), new THREE.MeshStandardMaterial({ map: magTex(), roughness: 0.5 }));
    mag.position.y = -L / 2;
    const band = mesh(new THREE.CylinderGeometry(9.3, 9.3, 8, 24), clay(0x3aa0ff, { rough: 0.6 }));
    band.position.y = -L * 0.75;
    piv.add(mag, band);
    ctx.scene.add(piv);
    const hitPt = [DX + 11, TOP, SZ];
    const puff = new Puff(ctx, { origin: hitPt, r: 10, n: 12, t0: q.hit, color: 0xffffff, opacity: 0.5 });
    const sh = shadowBlob(ctx, 40, 30);
    sh.position.set(DX + 11, TOP + 0.3, SZ);
    return {
      ctx, fx: { dof: { focus: 30, aperture: 0.0016, maxblur: 0.01 }, bloom: 0.3, ao: 0.6 },
      update(lt) {
        const at = lt;
        const up = easeOut(seg(at, q.raise, q.raise + 0.4));
        const hitK = easeIn(seg(at, q.hit - 0.12, q.hit));
        const th = at < q.hit - 0.12 ? lerp(-0.4, -2.0, up) : lerp(-2.0, 0.53, hitK);
        piv.rotation.x = th + (at > q.hit ? spring(at, q.hit, { amp: -0.12, freq: 4, damp: 0.3 }) : 0);
        sh.material.opacity = 0.5 * seg(at, q.hit - 0.4, q.hit) * (1 - seg(at, q.hit + 0.3, q.hit + 0.8));
        momNeutral(m);
        momSwat(m, up, hitK);
        momFace(m, 'scream', 1);
        const bump = at > q.hit ? Math.max(0, Math.sin(seg(at, q.hit, q.hit + 0.35) * Math.PI)) : 0;
        const slide = easeIn(seg(at, q.hit + 0.05, q.tip)) * 12 + Math.max(0, at - q.tip) * 30;
        const tip = seg(at, q.tip - 0.1, q.tip + 0.4);
        ring(at, { lift: 0.55 * (1 - seg(at, q.hit, q.hit + 0.2)) });
        dn.position.y += bump * 3 - tip * tip * 20;
        dn.position.z += slide;
        dn.rotation.x = tip * 1.6;
        CREW.forEach((w, i) => {
          const a = C[w];
          if (at > q.hit) {
            a.position.y += bump * (2 + i * 0.7);
            a.position.z += slide * (0.6 + i * 0.1);
            a.rotation.z = bump * (i % 2 ? 1 : -1) * 0.8;
            A.flail(a, at, bump + 0.3);
          }
          A.antennae(a, at + i, [[q.hit, 0.8]], { perk: at < q.hit ? 1 : 0 });
          if (at < q.hit) A.headLook(a, piv.position, 0.6);
        });
        aim(ctx.camera, [DX - 6, TOP + 4.5, SZ - 16], [DX + 3, TOP + 8, SZ + 2], 58);
        shake(ctx.camera, lt, shakeAmt(lt, [q.hit], 2.0, 0.6));
        handheld(ctx.camera, lt, 0.8, 17);
      },
      post(lt, c) { c.focusOn([DX, TOP + 2, SZ]); },
      pins: (lt) => UI.word(ctx.camera, V(hitPt[0] - 6, TOP + 22, hitPt[2]), lt, q.hit, 'WHAM!', { size: 100, rot: -9, dur: 0.7 }),
    };
  },
};

// ---------------------------------------------------------------- 14. FALL ("EVERY FALL COSTS YOU.")
const S_FALL = {
  name: 'fall', dur: DUR('fall'),
  build() {
    const q = Q('fall');
    const X = 40, Z = 26;
    const { ctx } = kitchenShot({ focus: [X, 150, Z], shadowBox: 200 });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const puff = new Puff(ctx, { origin: [X, 0.5, Z], r: 14, n: 12, t0: q.land, color: 0xf0e4d0, opacity: 0.55 });
    const crumbs = new Burst(ctx, { n: 24, origin: [X, 2, Z], speed: [8, 20], spread: 0.9, size: [0.3, 0.9], color: PAL.dough, t0: q.land, life: 0.9, g: -60 });
    const yAt = (t, d = 0) => { const u = seg(t, 0.05 + d, q.land); return TOP * (1 - u * u) + 2; };
    return {
      ctx, fx: { dof: { focus: 18, aperture: 0.002, maxblur: 0.008 }, bloom: 0.3, ao: 0.5 },
      update(lt) {
        const at = lt;
        const y = yAt(at);
        const landed = at >= q.land;
        const b = landed ? Math.abs(spring(at, q.land, { amp: 5, freq: 2.2, damp: 0.35 })) : 0;
        dn.position.set(X + 1, landed ? b : y, Z);
        dn.rotation.set(landed ? 0 : 0.9 + Math.sin(at * 3) * 0.3, at * 0.7, landed ? 0 : Math.sin(at * 2) * 0.3);
        CREW.forEach((w, i) => {
          const a = C[w];
          const ox = [-4.5, 4, -2.5, 5][i], oz = [2, -3, -4, 3][i], d = i * 0.05;
          const yy = landed ? Math.abs(spring(at, q.land + d, { amp: 3 + i, freq: 2.6, damp: 0.3 })) : yAt(at, d) + [3, 2, -1.5, 4][i];
          antAt(a, X + ox, yy, Z + oz, at * (i % 2 ? 3 : -3));
          a.rotation.order = 'YXZ';
          a.rotation.x = landed ? 0 : at * (2 + i);
          A.flail(a, at, landed ? 0.3 : 1);
          if (landed) A.squash(a, impact(at, q.land + d, 0.35));
          A.antennae(a, at, [], { tap: 1.2, perk: 1 });
        });
        puff.update(lt);
        crumbs.update(lt);
        const cy = landed ? 10 : y + 4;
        aim(ctx.camera, [X + 6, cy + 4, Z + 13], [X, cy - 1.5, Z - 1], 52);
        shake(ctx.camera, lt, shakeAmt(lt, [q.land], 2.2, 0.5) + (landed ? 0 : 0.15));
      },
      post(lt, c) { c.focusOn(dn.position); },
      pins: (lt) => UI.word(ctx.camera, V(X, 12, Z), lt, q.land, 'THUD', { size: 84, rot: 5, dur: 0.6 }),
      hud: (lt) => cardHtml('fall', lt, { hold: 1.8 }) + chatHtml('fall', lt),
    };
  },
};

// ---------------------------------------------------------------- 15. NOPE (she flees)
const S_NOPE = {
  name: 'nope', dur: DUR('nope'),
  build() {
    const { ctx } = kitchenShot({ focus: [-140, 0, 600], shadowBox: 700, fogFar: 7000 });
    const m = mom({ prop: 'none' });
    m.rotation.y = -Math.PI / 2;
    ctx.scene.add(m);
    const C = makeCrew(ctx);
    const dn = Wd.donut(DONUT_S);
    dn.position.set(-133.5, 0, 893);
    dn.rotation.set(0.3, 0, 0.2);
    ctx.scene.add(dn);
    return {
      ctx, fx: { dof: { focus: 26, aperture: 0.0012, maxblur: 0.008 }, bloom: 0.3, ao: 0.5 },
      update(lt) {
        const at = lt;
        const x = 160 - at * 600;
        m.position.set(x, 0, 300);
        momNeutral(m);
        momWalk(m, at * 16, 1.6);
        m.userData.armL.sh.rotation.set(-2.6 + Math.sin(at * 20) * 0.4, 0, -0.5);
        m.userData.armR.sh.rotation.set(-2.6 + Math.sin(at * 20 + 1) * 0.4, 0, 0.5);
        m.userData.torso.rotation.x = 0.2;
        momFace(m, 'scream', 1);
        CREW.forEach((w, i) => {
          const a = C[w];
          antAt(a, -138 + [-2.6, -0.9, 0.9, 2.7][i], 0, [896, 897.5, 895.5, 897][i], Math.PI + [0.1, -0.1, 0.2, -0.2][i]);
          A.alive(a, at + i);
          A.headLook(a, V(x, 200, 300), 0.9);
          A.antennae(a, at + i, [], { perk: 0.5 });
          if (i === 1 && at > 0.8) A.rear(a, 0.5);
        });
        aim(ctx.camera, [-137, 2.6, 902], [-150, 210, 300], 70);
        handheld(ctx.camera, lt, 0.6, 19);
      },
      post(lt, c) { c.focusOn([-138, 1, 894]); },
      hud: (lt) => chatHtml('nope', lt),
    };
  },
};

// ---------------------------------------------------------------- 16. ROLL (patio, sunset)
const S_ROLL = {
  name: 'roll', dur: DUR('roll'),
  build() {
    const ctx = patioShot({ focus: [0, 0, 0] });
    const rig = donutRig(ctx);
    const C = makeCrew(ctx);
    const SPD = 9;
    return {
      ctx, fx: { dof: { focus: 24, aperture: 0.002, maxblur: 0.009 }, bloom: 0.6 },
      update(lt) {
        const at = lt;
        const x = -30 + SPD * at;
        rig.roller.position.set(x, 3 + DONUT_R, 0);
        rig.roller.rotation.set(Math.sin(at * 5) * 0.06, 0, -(SPD * at) / DONUT_R);
        const place = { pip: [-5, 2.6], dot: [-6, -2.4], bean: [-1.2, 3.2], moss: [-2.5, -3.4] };
        CREW.forEach((w, i) => {
          const a = C[w];
          const [dx, dz] = place[w];
          antAt(a, x + dx + Math.sin(at * 3 + i) * 0.4, 3, dz, Math.PI / 2);
          A.walk(a, gait(SPD * at) * 0.55 + i * 1.3, 1.3);
          A.antennae(a, at + i, [], { back: 0.7 });
          A.scarf(a, at, 3);
          if (w === 'pip' || w === 'dot') A.rear(a, 0.35);
        });
        aim(ctx.camera, [x - 2, 6.5, 17], [x, 6.2, 0], 46);
        handheld(ctx.camera, lt, 1, 21);
      },
      post(lt, c) { c.focusOn([rig.roller.position.x - 4, 5, 0]); },
      hud: (lt) => chatHtml('roll', lt),
    };
  },
};

// ---------------------------------------------------------------- nest at sunset (home / gulp / again / title)
function nestSet() {
  const ctx = lawnShot({ light: 'sunset', sunDir: [-0.5, 0.18, -1], focus: [0, 6, 0], cam: [18, 30, 0, 0], clear: [{ x: 0, z: 0, r: 36 }], center: [0, -40], size: [200, 200] });
  const hY = anthill(ctx);
  return { ctx, hY };
}
const TOPT = 7.5; // anthill top tier

// ---------------------------------------------------------------- 18. HOME (plop; we did it)
const S_HOME = {
  name: 'home', dur: DUR('home'),
  build() {
    const q = Q('home');
    const { ctx, hY } = nestSet();
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const puff = new Puff(ctx, { origin: [0, TOPT + 1, 0], r: 7, n: 14, t0: q.plop, color: 0xffd8b0, opacity: 0.55 });
    return {
      ctx, fx: { dof: { focus: 24, aperture: 0.002, maxblur: 0.009 }, bloom: 0.6 },
      update(lt) {
        const at = lt;
        const u = seg(at, 0, q.plop);
        const p = arc([-24, 12, 6], [0, TOPT - 0.2, 0], u, 8);
        dn.position.set(...p);
        dn.rotation.set((1 - u) * 1.6, 0, (1 - u) * -1.2);
        const sq = at > q.plop ? impact(at, q.plop, 0.35) : 0;
        dn.scale.set(DONUT_S * (1 + sq * 0.4), DONUT_S * (1 - sq), DONUT_S * (1 + sq * 0.4));
        CREW.forEach((w, i) => {
          const a = C[w];
          const arrive = seg(at, 0.35 + i * 0.1, 0.9 + i * 0.1);
          const r = lerp(30, 7.2 + i * 0.7, easeOut(arrive));
          const th = -0.95 + i * 0.5;
          antAt(a, Math.sin(th) * r, hY(r), Math.cos(th) * r, th + Math.PI);
          if (arrive < 1) A.walk(a, gait(r), 1.2);
          else {
            const ch = seg(at, q.cheer + i * 0.06, q.cheer + 0.2 + i * 0.06);
            A.rear(a, 0.3 + ch * 0.6);
            a.position.y += ch * Math.abs(Math.sin(at * 9 + i)) * 2;
          }
          A.antennae(a, at + i, [[q.cheer + i * 0.06, 0.9]], { perk: at > q.cheer ? 1 : 0.3 });
          A.headLook(a, V(0, TOPT + 3, 0), 0.5);
        });
        puff.update(lt);
        aim(ctx.camera, [7, TOPT + 4.5, 15], [0, TOPT + 1.2, 1], 46);
        shake(ctx.camera, lt, shakeAmt(lt, [q.plop], 0.5, 0.4));
      },
      post(lt, c) { c.focusOn([0, TOPT, 6]); },
      pins: (lt) => UI.word(ctx.camera, V(0, TOPT + 5, 0), lt, q.plop, 'PLOP', { size: 90, rot: 6, dur: 0.6 }),
      hud: (lt) => chatHtml('home', lt),
    };
  },
};

// ---------------------------------------------------------------- 19. GULP (sucked down in one go... she pops up chewing... GRRRUMBLE)
const S_GULP = {
  name: 'gulp', dur: DUR('gulp'),
  build() {
    const q = Q('gulp');
    const { ctx, hY } = nestSet();
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const Qn = A.queen();
    Qn.rotation.order = 'YXZ';
    ctx.scene.add(Qn);
    const C = makeCrew(ctx);
    const POP = q.gulp + 0.5;
    return {
      ctx, fx: { dof: { focus: 12, aperture: 0.003, maxblur: 0.01 }, bloom: 0.6 },
      update(lt) {
        const at = lt;
        // the donut trembles, then is slurped straight down the hole
        const trem = at > q.pop && at < q.gulp ? Math.sin(at * 60) * 0.12 : 0;
        const sl = easeIn(seg(at, q.gulp, q.gulp + 0.4));
        dn.position.set(trem, TOPT - 0.2 - sl * 5, 0);
        dn.scale.set(DONUT_S * (1 - sl * 0.6), DONUT_S * (1 + sl * 1.2), DONUT_S * (1 - sl * 0.6));
        dn.visible = sl < 0.98;
        // the Queen pops up through the empty hole, chewing, delighted
        const pop = at < POP ? 0 : 1 - spring(at, POP, { amp: 1, freq: 2, damp: 0.35 });
        A.neutral(Qn);
        Qn.rotation.set(-Math.PI / 2 + 0.6, 0, 0);
        Qn.position.set(0, lerp(-9, TOPT - 2.6, pop), 1.6);
        const chew = at > POP && at < 1.9 ? Math.abs(Math.sin((at - POP) * 13)) : 0;
        A.jaws(Qn, chew * 0.6);
        A.antennae(Qn, at, [[POP, 0.9], [q.growl, 0.6]], { perk: at > q.growl ? 0 : 0.8, back: at > q.growl ? 0.6 : 0 });
        if (at > q.growl) Qn.position.x += Math.sin(at * 50) * 0.08;
        CREW.forEach((w, i) => {
          const a = C[w];
          const r = 7.2 + i * 0.7, th = -0.95 + i * 0.5;
          antAt(a, Math.sin(th) * r, hY(r), Math.cos(th) * r, th + Math.PI);
          if (at < q.gulp) A.rear(a, 0.45);
          A.antennae(a, at + i, [[q.gulp, 0.8], [q.growl, 0.8]], { perk: at > q.gulp && at < q.growl ? 1 : 0.3, tap: at > q.silence && at < q.growl ? 0.03 : 0.5 });
          A.headLook(a, V(0, TOPT + 2, 0), 0.6);
          if (at > q.growl) a.position.y += Math.abs(Math.sin(at * 40 + i)) * 0.25;
        });
        aim(ctx.camera, [0.5, TOPT + 3.4, 10.5], [0, TOPT + 1.8, 0], 46);
        shake(ctx.camera, lt, shakeAmt(lt, [q.gulp], 0.12, 0.3) + (at > q.growl ? 0.22 * (1 - seg(at, q.growl + 0.4, 3)) : 0));
        handheld(ctx.camera, lt, 0.4, 25);
      },
      post(lt, c) { c.focusOn([0, TOPT + 1.5, 1]); },
      pins: (lt) => UI.word(ctx.camera, V(-4.5, TOPT + 3.2, 0), lt, q.gulp, 'GULP', { size: 84, rot: -6, dur: 0.6 }) + UI.word(ctx.camera, V(-6, TOPT + 5, 0), lt, q.growl, 'GRRRUMBLE', { size: 62, rot: 4, dur: 0.65 }),
    };
  },
};

// ---------------------------------------------------------------- 20. AGAIN (...again? / again.)
const S_AGAIN = {
  name: 'again', dur: DUR('again'),
  build() {
    const q = Q('again');
    const { ctx, hY } = nestSet();
    const C = makeCrew(ctx);
    return {
      ctx, fx: { dof: { focus: 9, aperture: 0.003, maxblur: 0.01 }, bloom: 0.6 },
      update(lt) {
        const at = lt;
        const sl = easeInOut(seg(at, q.slump, q.slump + 0.5));
        const go = Math.max(0, at - 1.3);
        CREW.forEach((w, i) => {
          const a = C[w];
          const x = [-3.4, -1.1, 1.2, 3.5][i];
          const z = -6 - go * 4 - [0, 1.2, 0.4, 1.6][i];
          const r = Math.hypot(x, z);
          antAt(a, x, hY(r), z, Math.PI * 1 + [0.15, -0.05, 0.1, -0.15][i]);
          A.squash(a, sl * 0.12);
          a.userData.neck.rotation.x += sl * 0.45;
          A.antennae(a, at + i, [], { back: sl * 1.0, tap: 0.15 });
          if (go > 0) A.walk(a, gait(go * 4) + i * 1.7, 0.6);
          if (w === 'bean' && at > 0.35 && at < 1.2) a.userData.head.rotation.y += Math.sin((at - 0.35) * 6) * 0.25;
        });
        aim(ctx.camera, [1, TOPT + 2.4, -15], [0, TOPT + 0.5, -6], 46);
        handheld(ctx.camera, lt, 0.5, 37);
      },
      post(lt, c) { c.focusOn([0, TOPT, -7]); },
      hud: (lt) => chatHtml('again', lt),
    };
  },
};

// ---------------------------------------------------------------- 21. TITLE
const S_TITLE = {
  name: 'title', dur: DUR('title'),
  build() {
    const q = Q('title');
    const { ctx, hY } = nestSet();
    const C = makeCrew(ctx);
    return {
      ctx, fx: { dof: { focus: 40, aperture: 0.0025, maxblur: 0.012 }, bloom: 0.7, grade: { vig: 0.32 } },
      update(lt) {
        CREW.forEach((w, i) => {
          const a = C[w];
          const r = 7 + i * 0.8, th = -0.5 + i * 0.45;
          antAt(a, Math.sin(th) * r, hY(r), Math.cos(th) * r, th + Math.PI);
          A.alive(a, lt + i);
          A.antennae(a, lt + i);
        });
        aim(ctx.camera, [22 - lt * 1.5, 16, 34], [0, 10, -10], 42);
      },
      hud: (lt) => {
        const tg = seg(lt, q.tagline, q.tagline + 0.25);
        const bd = seg(lt, q.badges, q.badges + 0.25);
        return UI.logo(lt, q.slam)
          + `<div class="tagline" style="opacity:${tg};transform:translateX(-50%) translateY(${(1 - tg) * 10}px)">feed the queen. don't get seen.</div>`
          + `<div class="badges" style="opacity:${bd}"><span class="b">1–4 PLAYERS</span><span class="b">PROXIMITY VOICE</span><span class="b steam" style="transform:scale(${1 + 0.06 * Math.max(0, Math.sin((lt - 2.0) * 6)) * (lt > 2 ? 1 : 0)})">WISHLIST ON STEAM</span></div>`;
      },
    };
  },
};

// ---------------------------------------------------------------- 22. BUTTON (night. a cupboard opens. ...hi.)
const S_BUTTON = {
  name: 'button', dur: DUR('button'),
  build() {
    const q = Q('button');
    const ctx = setup({ light: 'nest', fogNear: 300, fogFar: 2000, sky: false, shadowBox: 80, sunDist: 200 });
    ctx.scene.background = new THREE.Color(0x0e0a14);
    ctx.hemi.color.set(0x8090c0); ctx.hemi.groundColor.set(0x201820); ctx.hemi.intensity = 0.55;
    const fillB = new THREE.PointLight(0xb0c0ff, 30, 40, 1.5);
    fillB.position.set(4, 10, -28);
    ctx.scene.add(fillB);
    // cupboard interior: shelf box (open at +z), door hinged on the left edge
    const W = 110, Hh = 90, D = 90;
    const wood = clay(0xb07a4a, { rough: 0.7, repeat: 2 });
    const inner = new THREE.MeshStandardMaterial({ color: 0xa8784e, roughness: 0.8, side: THREE.BackSide });
    const box = mesh(new THREE.BoxGeometry(W, Hh, D), [inner, inner, inner, inner, new THREE.MeshBasicMaterial({ visible: false }), inner]);
    box.position.set(0, Hh / 2, -D / 2 + 0.5);
    ctx.scene.add(box);
    const hinge = new THREE.Group();
    hinge.position.set(-W / 2, Hh / 2, 0.5);
    const door = mesh(new RoundedBoxGeometry(W, Hh, 4, 2, 1), clay(0x7aa886, { rough: 0.6 }));
    door.position.set(W / 2, 0, 2);
    hinge.add(door);
    ctx.scene.add(hinge);
    // cereal box + a fruity ring
    const cb = mesh(new RoundedBoxGeometry(40, 70, 18, 2, 1), clay(0xffd040, { rough: 0.6 }));
    cb.position.set(-30, 35, -55);
    ctx.scene.add(cb);
    const loop = mesh(new RoundedBoxGeometry(4.2, 4.2, 4.2, 2, 0.4), clay(0xfff6ea, { rough: 0.35, repeat: 4, strength: 2.5, sheen: 0.6 }));
    ctx.scene.add(loop);
    const C = makeCrew(ctx);
    const m = mom({ prop: 'none' });
    m.rotation.y = Math.PI;
    ctx.scene.add(m);
    const faceL = new THREE.PointLight(0xffe8d0, 0, 260, 1.2);
    faceL.position.set(10, 50, 120);
    ctx.scene.add(faceL);
    const kitchenGlow = new THREE.PointLight(0xffe0b0, 0, 600, 1.2);
    kitchenGlow.position.set(40, 60, 220);
    ctx.scene.add(kitchenGlow);
    const spill = new THREE.SpotLight(0xffe8c8, 0, 400, 0.6, 0.6, 1);
    spill.position.set(30, 80, 260);
    spill.target.position.set(0, 0, -20);
    ctx.scene.add(spill, spill.target);
    return {
      ctx, fx: { dof: { focus: 14, aperture: 0.004, maxblur: 0.012 }, bloom: 0.5 },
      update(lt) {
        const at = lt;
        const open = easeOut(seg(at, q.open, q.open + 0.5));
        hinge.rotation.y = -open * 1.9;
        const lightK = seg(at, q.open + 0.05, q.light);
        kitchenGlow.intensity = lightK * 500;
        faceL.intensity = lightK * 220;
        spill.intensity = lightK * 2200;
        // ants frozen carrying the fruity ring, caught in the light
        loop.position.set(0, 2.7, -14);
        loop.rotation.set(0.1, 0.4, 0.05);
        CREW.forEach((w, i) => {
          const a = C[w];
          const ang = Math.PI / 4 + i * Math.PI / 2;
          antAt(a, Math.cos(ang) * 3.3, 0, -14 + Math.sin(ang) * 3.3, Math.atan2(-Math.cos(ang), -Math.sin(ang)) + Math.PI);
          A.carry(a, at, 0.3);
          A.walk(a, 1.5 + i, 0.7);
          A.antennae(a, at, [[q.light, 0.5]], { tap: 0.05, perk: lightK });
          A.headLook(a, V(0, 60, 200), lightK * 0.7);
        });
        // her face fills the doorway
        momNeutral(m);
        m.position.set(25, -485 + 40, 205);
        m.userData.neck.rotation.x = 0.25;
        momFace(m, at < q.scream ? 'alarmed' : 'scream', at < q.scream ? lightK : 1);
        aim(ctx.camera, [4.5, 2.3, -27], [1.5, 7, 40], 52);
        handheld(ctx.camera, lt, 0.4, 39);
        shake(ctx.camera, lt, shakeAmt(lt, [q.scream], 1.5, 0.3));
      },
      post(lt, c) {
        c.bokeh.uniforms.focus.value = lt < q.line + 0.4 ? 13 : lerp(13, 235, easeInOut(seg(lt, q.line + 0.4, q.scream)));
        c.grade.uniforms.fade.value = seg(lt, q.black, q.black + 0.02);
      },
      hud: (lt) => chatHtml('button', lt),
    };
  },
};

export const SHOTS_B = [S_FREEZE, S_SPOTTED, S_SWAT, S_FALL, S_NOPE, S_ROLL, S_HOME, S_GULP, S_AGAIN, S_TITLE, S_BUTTON];
