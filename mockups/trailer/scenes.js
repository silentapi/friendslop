// OVER BUDGET announce trailer: shot-by-shot choreography.
// Each shot: { name, dur, build(renderer) -> { scene, camera, update(lt), hud(lt), pins(lt), css(lt), fx } }
import { THREE, mat, mesh, box, cyl, sphere, capsule, addOutlines, pin } from '../lib.js';
import { setup, skyDome, glow, rr, T, tmat, surf, shaft } from '../fx.js';
import {
  bean, granny, face, neutral, mouth, eyes, walk, arm, leg, flail, ragdollPose, Burst, GEO, MAT, coinBurst, Geyser, Puff, marker,
  shake, aim, card, voice, money, comic, tag, houseBar, wallets, flash, timerStr, COL, clamp01, lerp, sstep, seg, easeOut, easeIn,
  easeInOut, easeBack, v3, pathAt,
} from './core.js';
import { buildStreet, buildBathroom, buildStairs, buildLiving, buildDoorway, companyVan, car, podium, texWall } from './sets.js';

const STREET = { bg: 0xffc79a, fog: [0xffc8a0, 45, 170], sunPos: [-60, 16, -25], sunInt: 3.6, sunColor: 0xffb070, hemiSky: 0x9cc2ff, hemiGround: 0x7a5a3a, hemiInt: 0.75, env: 0.35, shadowBox: 40, shadowMap: 2048 };
const BATH = { bg: 0xffcf9e, fog: null, sunPos: [5, 14, -25], sunInt: 2.4, sunColor: 0xffc890, hemiInt: 0.55, env: 0.45, shadowBox: 10, shadowMap: 2048 };
const INDOOR = { bg: 0xf1dfc4, fog: null, sunPos: [10, 20, 10], sunInt: 0.0, hemiSky: 0xfff0dc, hemiGround: 0x8a6a4a, hemiInt: 0.85, env: 0.5, shadowBox: 12, shadowMap: 1024 };
const FX_IN = { ao: 0.9, aoSamples: 8, bloom: 0.25, bloomThreshold: 0.9, grade: { vig: 0.32, warm: 0.035, sat: 1.12 } };
const FX_OUT = { ao: 0.8, aoSamples: 8, aoRadius: 1.0, bloom: 0.35, bloomThreshold: 0.85, grade: { vig: 0.28, warm: 0.045, sat: 1.12 } };

function street(R) {
  const ctx = setup({ renderer: R, ...STREET });
  ctx.sun.target.position.set(0, 0, 3);
  const refs = buildStreet(ctx.scene);
  return { ...ctx, refs };
}
function bathroom(R, opts) {
  const ctx = setup({ renderer: R, ...BATH });
  ctx.sun.target.position.set(0, 0, -3);
  skyDome(ctx.scene, { top: 0x6aa7e8, horizon: 0xffc690, sunDir: [-0.15, 0.45, 0.85] });
  const refs = buildBathroom(ctx.scene, opts);
  return { ...ctx, refs };
}
function indoor(R) {
  const ctx = setup({ renderer: R, ...INDOOR });
  return ctx;
}

const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const P = (o) => o.userData.parts;

// first-person arm + tools
function fpArm(who, { pos, rot }) {
  const color = { kev: 0x4f8dff, gus: 0xa65cff, mo: 0x3ccf7a, you: 0xff8a3d }[who];
  const g = new THREE.Group();
  const sleeve = mesh(new THREE.CapsuleGeometry(0.085, 0.42, 6, 14), tmat(T.fabric(color), 2, 2, { rough: 0.9, bump: 0.3 }));
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.24;
  g.add(sleeve);
  const cuff = cyl(0.1, 0.1, 0.07, 0xd8ff3a, 18);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 0.02;
  cuff.userData.noOutline = true;
  g.add(cuff);
  const glove = sphere(0.105, 0xd9a441);
  glove.scale.set(1, 0.85, 1.2);
  glove.position.z = -0.07;
  g.add(glove);
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.scale.setScalar(0.82);
  return addOutlines(g, 0.01);
}
function wrench() {
  const g = new THREE.Group();
  const cm = mat(0xc4ccd4, { metalness: 0.9, roughness: 0.2 });
  const h = mesh(new THREE.BoxGeometry(0.05, 0.028, 0.42), cm);
  h.position.z = -0.2;
  g.add(h);
  const grip = box(0.056, 0.034, 0.16, 0xe8352f, { roughness: 0.6 });
  grip.position.z = -0.04;
  g.add(grip);
  const head = mesh(new THREE.TorusGeometry(0.06, 0.024, 8, 18, Math.PI * 1.5), cm);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.44;
  g.add(head);
  return addOutlines(g, 0.006);
}
function hammer() {
  const g = new THREE.Group();
  const h = box(0.06, 0.6, 0.06, 0xd9a066);
  h.position.y = -0.2;
  g.add(h);
  const hd = box(0.28, 0.1, 0.1, 0x6d737a, { metalness: 0.8, roughness: 0.3 });
  hd.position.y = -0.5;
  g.add(hd);
  return addOutlines(g, 0.01);
}
function leafBlower() {
  const g = new THREE.Group();
  const body = box(0.35, 0.3, 0.45, 0xffd23f, { roughness: 0.5 });
  g.add(body);
  const tube = cyl(0.07, 0.09, 1.0, 0xff8a1f);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, -0.05, 0.65);
  g.add(tube);
  return addOutlines(g, 0.01);
}
function attachToHand(w, side, obj) {
  const a = P(w)[side === 'L' ? 'armL' : 'armR'];
  obj.position.set(0, -0.62, 0);
  a.add(obj);
  return obj;
}

// shared bathroom panic tableau (cold open + payoff)
function panicShot(R, { payoff }) {
  const ctx = bathroom(R);
  const { scene, camera } = ctx;
  const gm = at(granny(), payoff ? 3.6 : 0.62, 0, payoff ? -0.4 : -3.75);
  scene.add(gm);
  const crew = {
    kev: at(bean('kev'), 2.05, 0, -3.55),
    mo: at(bean('mo'), 1.05, 0, -1.0),
    you: at(bean('you'), -1.35, 0, -3.0),
    gus: at(bean('gus'), 2.45, 0, 0.8),
  };
  for (const w of Object.values(crew)) scene.add(w);
  const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: payoff ? 1.6 : 0.55, height: 2.4, dur: 4, scale: 1.5 });
  const blast = payoff ? 1.6 : 0.55;
  const drops = new Burst(scene, { count: 160, geo: GEO.drop, material: MAT.water, origin: [0.4, 3.4, -2.2], originJitter: 2.2, dir: [0, -1, 0], spread: 0.3, speed: [0.5, 1.5], emit: [blast + 0.4, blast + 4], life: [0.7, 1.1], size: [0.6, 1.2], floor: 0.02, spin: 0 });
  return {
    scene, camera, fx: FX_IN,
    update(lt) {
      const t = payoff ? lt : Math.min(lt, 1.55);
      // grandma
      neutral(gm);
      if (payoff) {
        const u = seg(t, 0, 1.1);
        const p = pathAt([[3.6, -0.4], [1.8, -2.4], [0.62, -3.75]], easeInOut(u));
        gm.position.set(p[0], 0, p[1]);
        if (u < 1) { const b = walk(gm, t * 9, 0.4); gm.position.y = b * 0.5; gm.rotation.y = Math.atan2(-1.2, -1.3); } else face(gm, -0.25, -4.15);
      } else face(gm, -0.25, -4.15);
      const flushT = payoff ? 1.35 : 0.25;
      const reach = sstep(flushT - 0.25, flushT, t) * (1 - sstep(flushT + 0.25, flushT + 0.5, t));
      gm.userData.parts.armR.rotation.x = -1.1 * reach;
      // crew reactions
      const hit = t > blast;
      const k = clamp01((t - blast) / 0.25);
      for (const [name, w] of Object.entries(crew)) {
        neutral(w);
        face(w, -0.25, -4.0);
        if (hit) face(w, w.position.x * 0.5, 3.0);
        if (!hit) {
          if (payoff) { eyes(w, 0.6); mouth(w, 0.2); arm(w, 'L', 0.6, 0.6); arm(w, 'R', 0.6, 0.6); w.position.y = 0; }
          else { const b = Math.sin(t * 3 + name.length) * 0.02; w.position.y = Math.abs(b); }
          if (payoff && name === 'gus') { face(w, 2.6, 2.4); P(w).head.rotation.y = 0.6; }
        } else {
          eyes(w, k);
          mouth(w, k);
          flail(w, t + name.length, k);
          P(w).torso.rotation.x = -0.25 * k;
          w.position.y = Math.abs(Math.sin((t - blast) * 14 + name.length)) * 0.12 * k;
        }
      }
      gy.update(t);
      drops.update(t);
      aim(camera, payoff ? [-0.3, 1.75, 3.6] : [-0.5, 1.7, 3.3], [0.2, 1.05, -3.0], 58);
      if (hit) shake(camera, 0.035 * (1 - seg(t, blast, blast + 1.5)) + 0.006, t);
    },
    pins(lt) {
      const t = payoff ? lt : Math.min(lt, 1.55);
      const flushT = payoff ? 1.35 : 0.25;
      comic(camera, v3(0.4, 1.6, -4.2), t, flushT, '*flush*', { dur: 0.6, color: '#fff', size: 34, rot: -4 });
      comic(camera, v3(-0.3, 2.9, -4.0), t, blast, 'KABLOOSH!', { dur: payoff ? 1.0 : 0.95, color: '#7fd0ff', size: 86, rot: -7 });
    },
    hud(lt) {
      let h = flash(lt > blast && lt < blast + 0.25 ? 0.55 * (1 - seg(lt, blast, blast + 0.25)) : 0);
      if (!payoff && lt > 1.55) {
        const r = seg(lt, 1.75, 3.0);
        h += `<div class="tr-vhs"></div>`;
        for (let i = 0; i < 3; i++) h += `<div class="tr-bar" style="top:${((lt * 900 + i * 260) % 760) - 20}px"></div>`;
        if (lt > 1.75) h += `<div class="tr-vhs-corner">◀◀ REW</div><div class="tr-vhs-txt" style="opacity:${Math.min(1, r * 4)}">8 MINUTES EARLIER</div>`;
      }
      if (payoff) {
        if (lt > 2.35) {
          const u = seg(lt, 2.35, 2.6);
          const sc = lerp(2.4, 1, easeOut(u));
          h += `<div class="tr-stamp" style="transform:translate(-50%,-50%) rotate(-9deg) scale(${sc});opacity:${Math.min(1, u * 3)}">NOBODY GETS PAID.</div>`;
        }
        h += flash(lt > 2.6 && lt < 2.8 ? 0.35 * (1 - seg(lt, 2.6, 2.8)) : 0, '#e8253f');
        h += voice(lt, 3.0, 4.95, 'EVERYONE', 'GUUUUUUUUS', COL.red);
      }
      return h;
    },
    css(lt) {
      if (!payoff && lt > 1.55) return `saturate(${lt > 1.75 ? 0.25 : 0.5}) contrast(1.15) brightness(${lt > 1.75 ? 0.75 : 0.95}) hue-rotate(${lt > 1.75 ? Math.sin(lt * 40) * 8 : 0}deg)`;
      return 'none';
    },
  };
}

// =================================================================== shots

const S_COLD = { name: 'cold-open', dur: 3.0, build: (R) => panicShot(R, { payoff: false }) };

const S_ARRIVE = {
  name: 'arrival', dur: 4.0,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const vanM = companyVan();
    scene.add(vanM);
    const crew = { mo: bean('mo'), kev: bean('kev'), you: bean('you'), gus: bean('gus') };
    for (const w of Object.values(crew)) scene.add(w);
    const skid = [];
    for (const z of [16.2, 18.2]) {
      const s = box(1, 0.012, 0.28, 0x2a2a2a);
      s.userData.noOutline = true;
      s.position.set(0, 0.07, z);
      scene.add(s);
      skid.push(s);
    }
    const exits = {
      mo: { t0: 1.75, to: [-1.6, 20.1] },
      kev: { t0: 1.95, to: [0.1, 20.4] },
      you: { t0: 2.15, to: [-3.0, 20.5] },
    };
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const u = easeOut(seg(lt, 0, 1.35));
        const vx = lerp(-34, 1.5, u);
        vanM.position.set(vx, 0, 17.2);
        const rock = lt > 1.35 ? Math.sin((lt - 1.35) * 18) * 0.05 * Math.exp(-(lt - 1.35) * 4) : -0.02 * (1 - u);
        vanM.rotation.z = rock;
        for (const s of skid) {
          const len = 6 * seg(lt, 0.7, 1.35);
          s.scale.x = Math.max(0.01, len);
          s.position.x = vx - 2.4 - len / 2;
        }
        vanM.userData.door.rotation.y = -1.9 * easeOut(seg(lt, 1.45, 1.75));
        const doorX = vx - 1.1;
        for (const [k, e] of Object.entries(exits)) {
          const w = crew[k];
          neutral(w);
          const a = seg(lt, e.t0, e.t0 + 0.45);
          if (lt < e.t0) { w.visible = false; continue; }
          w.visible = true;
          const tx = doorX + e.to[0];
          const tz = e.to[1];
          if (a < 1) {
            w.position.set(lerp(doorX, tx, a), 0.5 * (1 - a) + Math.sin(a * Math.PI) * 0.6, lerp(18.2, tz, a));
            arm(w, 'L', 2.4, 0.7); arm(w, 'R', 2.4, 0.7); leg(w, 'L', 0.6);
            w.rotation.y = 0;
          } else {
            const wt = lt - e.t0 - 0.45;
            const b = walk(w, wt * 10, 0.5);
            w.position.set(tx + wt * 0.9, b, tz + wt * 0.2);
            w.rotation.y = Math.PI / 2 - 0.3;
            if (k === 'mo' && lt > 2.5) { face(w, doorX, 21.5); arm(w, 'R', 1.4, 0.2); mouth(w, 0.5 + Math.sin(lt * 20) * 0.3); w.position.x = tx + 0.3; w.position.y = 0; }
          }
        }
        // Gus launched out, faceplants
        const g = crew.gus;
        neutral(g);
        if (lt < 2.45) g.visible = false;
        else {
          g.visible = true;
          const a = seg(lt, 2.45, 2.95);
          if (a < 1) {
            g.position.set(lerp(doorX, doorX - 0.9, a), 0.6 + Math.sin(a * Math.PI) * 1.4 - a * 0.3, lerp(18.2, 21.6, a));
            g.rotation.set(a * 1.9, 0, Math.sin(a * 6) * 0.3);
            flail(g, lt, 1);
          } else {
            g.position.set(doorX - 0.9, 0.18, 21.9);
            g.rotation.set(Math.PI / 2, 0, 0);
            arm(g, 'L', 3.0, 0.4); arm(g, 'R', 3.0, 0.4);
            const tw = lt > 3.4 ? Math.sin(lt * 18) * 0.4 : 0;
            leg(g, 'L', tw); leg(g, 'R', -tw);
          }
        }
        const push = easeInOut(seg(lt, 0, 4));
        aim(camera, [lerp(8.5, 7.0, push), lerp(2.3, 1.9, push), lerp(31, 28.5, push)], [lerp(-1, -0.5, push), 1.6, 16], 46);
        if (lt > 1.3 && lt < 1.7) shake(camera, 0.03 * (1 - seg(lt, 1.3, 1.7)), lt);
      },
      pins(lt) {
        comic(camera, v3(-1.0, 2.2, 15.8), lt, 1.05, 'SKRRRT!', { dur: 0.7, size: 64, rot: -6 });
        comic(camera, v3(crew.gus.position.x, 1.1, 21.9), lt, 2.95, 'THUD', { dur: 0.6, size: 46, rot: 8, color: '#fff' });
      },
      hud(lt) {
        return voice(lt, 2.45, 3.25, 'MO', 'who drove??', COL.mo) + voice(lt, 3.25, 4.0, 'GUS', 'me 😎', COL.gus);
      },
    };
  },
};

const MARKERS = [[1.6, 6.2, 0.7], [-6.9, 6.2, 0.7], [-2.2, 3.6, 2.4], [4.6, 3.5, 0.8], [3.2, 9.6, -1.0], [-4.4, 1.5, 0.9], [-2.2, 6.2, 0.7], [6.0, 6.2, 0.7], [13.8, 3.6, -2.2], [-6.3, 5.0, 1.4]];

const S_JOB = {
  name: 'the-job', dur: 3.5,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const ms = MARKERS.map((p) => { const m = marker(); m.position.set(...p); scene.add(m); return m; });
    const crew = ['kev', 'mo', 'you', 'gus'].map((k, i) => { const w = bean(k); scene.add(w); w.userData.lane = [-3.2 + i * 1.6, 15 + (i % 2) * 0.8]; return w; });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const a = lerp(-0.55, 0.32, easeInOut(lt / 3.5));
        const r = lerp(25, 21, easeInOut(lt / 3.5));
        aim(camera, [-0.5 + Math.sin(a) * r, lerp(8.5, 11, lt / 3.5), -3 + Math.cos(a) * r], [-0.5, 3.4, -2.5], 50);
        ms.forEach((m, i) => {
          const t0 = 0.35 + i * 0.17;
          const s = lt < t0 ? 0 : easeBack(seg(lt, t0, t0 + 0.3)) * 2.6;
          m.scale.setScalar(Math.max(0.0001, s));
          m.position.y = MARKERS[i][1] + Math.sin(lt * 4 + i) * 0.12;
          m.quaternion.copy(camera.quaternion);
          m.userData.halo.scale.setScalar(1 + ((lt * 1.5 + i * 0.3) % 1) * 0.6);
        });
        crew.forEach((w, i) => {
          neutral(w);
          const b = walk(w, lt * 13 + i, 0.9);
          P(w).torso.rotation.x = 0.25;
          w.position.set(w.userData.lane[0] + i * 0.1, b, w.userData.lane[1] - lt * 3.2);
          w.rotation.y = Math.PI;
        });
      },
      hud(lt) {
        return houseBar(0, '8:00') + card(lt, 0.75, 3.45, 'FIX THE HOUSE.', { pos: 'bl', size: 96, accent: '#ff8a3d' });
      },
    };
  },
};

const S_FPFIX = {
  name: 'fp-fix', dur: 4.5,
  build(R) {
    const ctx = bathroom(R, { ceiling: true });
    const { scene, camera } = ctx;
    const armR = fpArm('kev', { pos: [0.3, -0.36, -0.62], rot: [-0.35, 0.35, 0] });
    const wr = wrench();
    const armL = fpArm('kev', { pos: [-0.42, -0.38, -0.66], rot: [-0.3, -0.4, 0] });
    camera.add(armR, wr, armL);
    const coins = coinBurst(scene, [-0.25, 0.6, -3.9], { emit: [2.6, 2.75], speed: [2, 4], dir: [0.15, 1, 0.5] });
    const sparks = new Burst(scene, { count: 40, geo: GEO.spark, material: MAT.spark, origin: [-0.25, 0.4, -3.95], spread: 1.4, speed: [2, 4], emit: [2.6, 2.7], life: [0.3, 0.6], size: [1, 1.6], floor: -5 });
    const shine = glow(0xffffff, 0.12);
    scene.add(shine);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        const sway = Math.sin(lt * 1.3) * 0.02;
        aim(camera, [0.15 + sway, 1.5 + Math.sin(lt * 2.1) * 0.01, -1.25], [-0.2 + sway * 2, 0.45, -4.0], 70);
        const holding = lt > 0.3 && lt < 2.6;
        const rat = holding ? Math.abs(Math.sin(lt * 9)) : 0;
        wr.position.set(0.27, -0.33 + rat * 0.02, -0.72);
        wr.rotation.set(-0.6, 0.5, 0.7 + rat * 0.5);
        armR.rotation.z = rat * 0.3;
        coins.update(lt);
        sparks.update(lt);
        const s = lt > 2.6 ? easeOut(seg(lt, 2.6, 2.75)) * (1 - seg(lt, 2.75, 3.1)) : 0;
        shine.position.set(-0.25, 0.5, -3.9);
        shine.scale.setScalar(s * 3 + 0.0001);
      },
      pins(lt) {
        const pct = clamp01((lt - 0.3) / 2.3);
        if (lt < 2.65) {
          const el = pin(camera, v3(0.06, 0.08, -3.98), `<div class="g-ring"><svg width="58" height="58"><circle cx="29" cy="29" r="24" fill="rgba(10,6,14,.55)" stroke="rgba(255,255,255,.22)" stroke-width="5"/><circle cx="29" cy="29" r="24" fill="none" stroke="${COL.kev}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 24 * pct).toFixed(1)} 999" transform="rotate(-90 29 29)"/></svg><span class="ts">${Math.round(pct * 100)}%</span></div><div class="tr-prompt"><span class="k">E</span>HOLD · FIX TOILET <span style="color:#8dffa4">+$100</span></div>`, { cls: 'tr-ring' });
        }
        money(camera, v3(-0.25, 1.3, -3.9), lt, 2.65, '+$100', '#8dffa4', { big: true, dur: 1.6 });
      },
      hud(lt) {
        const done = lt > 2.7;
        return `<div class="tr-x"></div>` + houseBar(done ? 16 : 8, timerStr(7 * 60 + 41 - lt)) +
          wallets({ kev: done ? lerp(1740, 1840, seg(lt, 2.7, 3.2)) : 1740, you: 1610, mo: 1320, gus: 990 }, done ? 'kev' : null) +
          card(lt, 2.85, 4.45, 'GET PAID.', { pos: 'bl', size: 104, accent: '#3ccf7a' });
      },
    };
  },
};

const S_DRYWALL = {
  name: 'drywall', dur: 1.5,
  build(R) {
    const ctx = indoor(R);
    const { scene, camera } = ctx;
    buildDoorway(scene);
    const hole = mesh(new THREE.CircleGeometry(0.42, 9), mat(0x120a10));
    hole.position.set(-2.6, 1.25, 0.1);
    hole.userData.noOutline = true;
    scene.add(hole);
    const mo = bean('mo');
    scene.add(mo);
    const panel = box(1.3, 1.1, 0.06, 0xeceff3, { roughness: 0.9 });
    scene.add(addOutlines(panel, 0.01));
    const puff = new Puff(scene, [-2.6, 1.0, 0.35], { t0: 0.62, count: 12, size: 0.18, spread: 1.2, life: 0.8 });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(mo);
        const u = seg(lt, 0, 0.55);
        const b = u < 1 ? walk(mo, lt * 12, 0.5) : 0;
        mo.position.set(-2.6, b, lerp(2.4, 1.25, u));
        mo.rotation.y = Math.PI;
        arm(mo, 'L', 1.5, 0.4); arm(mo, 'R', 1.5, 0.4);
        const slam = easeIn(seg(lt, 0.45, 0.62));
        panel.position.set(-2.6, lerp(1.15, 1.25, slam), lerp(mo.position.z - 0.55, 0.13, slam));
        panel.rotation.x = lerp(-0.2, 0, slam);
        if (lt > 0.62) { arm(mo, 'L', 1.6, 0.2); arm(mo, 'R', 1.6, 0.2); }
        puff.update(lt);
        aim(camera, [0.5, 1.65, 3.6], [-2.7, 1.15, 0.3], 54);
        if (lt > 0.62 && lt < 0.9) shake(camera, 0.02, lt);
      },
      pins(lt) {
        comic(camera, v3(-1.6, 2.1, 0.4), lt, 0.62, 'THWACK', { dur: 0.6, size: 54 });
        money(camera, v3(-2.6, 2.3, 0.6), lt, 0.7, '+$50 MO', COL.mo);
      },
      hud(lt) { return houseBar(lerp(31, 44, seg(lt, 0.65, 0.9)), timerStr(5 * 60 + 12 - lt)); },
    };
  },
};

const S_HAMMER = {
  name: 'hammer', dur: 1.5,
  build(R) {
    const ctx = indoor(R);
    const { scene, camera } = ctx;
    buildStairs(scene);
    const you = bean('you');
    scene.add(you);
    const hm = attachToHand(you, 'R', hammer());
    hm.rotation.x = -Math.PI / 2;
    const board = surf(1.4, 0.06, 0.28, T.wood(0xe0b47a, 1), 1);
    board.position.set(-4.3, 0.06, 0.55);
    board.rotation.y = 0.08;
    scene.add(board);
    const chips = new Burst(scene, { count: 30, geo: GEO.chip, material: mat(0xd9a066), origin: [-4.3, 0.1, 0.55], spread: 1.0, speed: [1, 2.5], emit: [0.2, 1.1], life: [0.4, 0.8], floor: 0.02 });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(you);
        you.position.set(-4.3, -0.32, -0.25);
        you.rotation.y = 0;
        leg(you, 'L', 1.4); leg(you, 'R', 1.4);
        P(you).torso.rotation.x = 0.45;
        const ph = (lt * 2.7) % 1;
        const swing = ph < 0.6 ? lerp(1.0, 2.8, easeOut(ph / 0.6)) : lerp(2.8, 0.75, easeIn((ph - 0.6) / 0.4));
        arm(you, 'R', swing, 0.15);
        arm(you, 'L', 0.9, 0.3);
        mouth(you, 0.3);
        board.position.y = 0.06 + (ph > 0.95 || ph < 0.05 ? 0.03 : 0);
        chips.update(lt);
        aim(camera, [-2.3, 1.9, 3.4], [-4.2, 0.7, 0.0], 50);
      },
      pins(lt) {
        [0.36, 0.73, 1.1].forEach((t0, i) => comic(camera, v3(-3.6 - i * 0.2, 0.9, 0.7), lt, t0, 'BANG', { dur: 0.3, size: 40, rot: [-10, 8, -4][i] }));
        money(camera, v3(-4.3, 2.0, 0.2), lt, 1.0, '+$75 YOU', COL.you);
      },
      hud(lt) { return houseBar(lerp(44, 58, seg(lt, 1.0, 1.25)), timerStr(4 * 60 + 47 - lt)); },
    };
  },
};

const S_SABOTAGE = {
  name: 'sabotage', dur: 5.0,
  build(R) {
    const ctx = bathroom(R);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    scene.add(gus);
    const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: 2.8, height: 2.6, dur: 3 });
    const coins = coinBurst(scene, [-0.25, 0.8, -3.9], { count: 30, emit: [2.8, 2.95], speed: [3, 5.5], dir: [0.3, 1, 0.6], spread: 0.8 });
    const glint = glow(0xffffff, 0.06);
    scene.add(glint);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus);
        if (lt < 1.6) {
          const u = seg(lt, 0, 1.6);
          const p = pathAt([[3.7, -0.4], [2.4, -1.4], [1.3, -2.8], [0.75, -3.45]], u);
          gus.position.set(p[0], 0, p[1]);
          const ph = lt * 7;
          leg(gus, 'L', Math.max(0, Math.sin(ph)) * 1.1);
          leg(gus, 'R', Math.max(0, -Math.sin(ph)) * 1.1);
          arm(gus, 'L', 1.6, 0.1); arm(gus, 'R', 1.6, 0.1);
          P(gus).torso.rotation.x = 0.3;
          gus.position.y = Math.abs(Math.sin(ph)) * 0.08;
          face(gus, -0.25, -4.2);
          P(gus).head.rotation.y = Math.sin(lt * 4) * 0.7;
          eyes(gus, 0.3);
        } else if (lt < 2.8) {
          gus.position.set(0.75, 0, -3.45);
          face(gus, -0.25, -4.2);
          P(gus).torso.rotation.x = 0.35;
          const rub = Math.sin(lt * 26) * 0.15;
          arm(gus, 'L', 1.4 + rub, -0.2); arm(gus, 'R', 1.4 - rub, -0.2);
          mouth(gus, 0.35);
          P(gus).head.rotation.y = lt > 2.2 ? 0.9 : 0;
        } else {
          const u = seg(lt, 2.8, 3.2);
          gus.position.set(lerp(0.75, 1.6, easeOut(u)), Math.sin(u * Math.PI) * 0.4, lerp(-3.45, -2.6, easeOut(u)));
          face(gus, 2.6, 2.0);
          arm(gus, 'L', 2.9, 0.6); arm(gus, 'R', 2.9, 0.6);
          mouth(gus, 0.8 + Math.sin(lt * 22) * 0.2);
          eyes(gus, 0.4);
          P(gus).torso.rotation.z = Math.sin(lt * 16) * 0.12;
          gus.position.y += Math.abs(Math.sin(lt * 16)) * 0.1;
        }
        gy.update(lt);
        coins.update(lt);
        glint.position.set(-0.05, 1.05 + Math.sin(lt * 3) * 0.1, -4.25);
        glint.scale.setScalar(lt < 2.8 ? 1 + Math.sin(lt * 9) * 0.6 : 0.0001);
        const push = easeInOut(lt / 5);
        aim(camera, [lerp(2.6, 2.1, push), 1.4, lerp(1.9, 1.2, push)], [0.0, 0.85, -3.3], 54);
        if (lt > 2.8) shake(camera, 0.03 * (1 - seg(lt, 2.8, 4)) + 0.004, lt);
      },
      pins(lt) {
        if (lt < 2.8) {
          const el = pin(camera, v3(-0.25, 1.75, -4.1), '✓ KEV · +$100', { cls: 'tr-tag' });
          el.style.setProperty('--c', COL.kev);
          el.style.color = '#cfe0ff';
        }
        if (lt > 1.65 && lt < 2.8) {
          const pct = seg(lt, 1.65, 2.75);
          pin(camera, v3(0.3, 0.75, -3.9), `<div class="g-ring"><svg width="58" height="58"><circle cx="29" cy="29" r="24" fill="rgba(10,6,14,.55)" stroke="rgba(255,255,255,.22)" stroke-width="5"/><circle cx="29" cy="29" r="24" fill="none" stroke="${COL.gus}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 24 * pct).toFixed(1)} 999" transform="rotate(-90 29 29)"/></svg><span class="ts">F</span></div><div class="tr-prompt"><span class="k">F</span>HOLD · WRECK IT 😈</div>`, { cls: 'tr-ring' });
        }
        comic(camera, v3(-0.4, 2.9, -4.0), lt, 2.8, 'KABLOOSH!', { dur: 1.0, color: '#7fd0ff', size: 80 });
        money(camera, v3(-0.25, 2.0, -3.6), lt, 2.95, '−$100 KEV', COL.kev, { big: true, dur: 1.8 });
      },
      hud(lt) {
        const wrecked = lt > 2.95;
        let h = houseBar(wrecked ? 51 : 58, timerStr(3 * 60 + 30 - lt)) + wallets({ kev: wrecked ? lerp(1840, 1740, seg(lt, 2.95, 3.4)) : 1840, you: 1685, mo: 1370, gus: 990 }, wrecked ? 'kev' : null);
        h += card(lt, 0.15, 1.5, '…OR', { pos: 'tl', size: 96, accent: '#a65cff' });
        h += card(lt, 3.05, 4.95, 'WRECK YOUR<br>FRIENDS\' STUFF.', { pos: 'bl', size: 80, accent: '#a65cff' });
        if (wrecked) h += `<div class="tr-banner" style="opacity:${seg(lt, 2.95, 3.1)}">💥 WRECKED BY GUS</div>`;
        h += voice(lt, 3.9, 4.95, 'KEV', 'GUS!!!!!', COL.kev).replace('style="', 'style="left:72%;');
        h += flash(lt > 2.8 && lt < 3.0 ? 0.45 * (1 - seg(lt, 2.8, 3.0)) : 0);
        return h;
      },
    };
  },
};

const S_SLAP = {
  name: 'slap', dur: 2.0,
  build(R) {
    const ctx = bathroom(R);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    const kev = bean('kev');
    scene.add(gus, kev);
    const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: -2, height: 2.3, dur: 6 });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus); neutral(kev);
        // Kev sprints in
        const u = seg(lt, 0, 0.55);
        const kp = pathAt([[3.8, -0.4], [2.6, -1.6], [1.75, -2.55]], u);
        kev.position.set(kp[0], 0, kp[1]);
        if (u < 1) {
          const b = walk(kev, lt * 18, 1.1);
          kev.position.y = b;
          P(kev).torso.rotation.x = 0.35;
          face(kev, 0.9, -3.1);
          mouth(kev, 0.9);
          eyes(kev, 0.5);
        } else {
          face(kev, 0.9, -3.1);
          const sw = easeOut(seg(lt, 0.55, 0.7));
          arm(kev, 'R', 1.5, lerp(1.4, -0.6, sw));
          P(kev).torso.rotation.y = lerp(0.6, -0.5, sw);
          mouth(kev, 0.6);
          eyes(kev, 0.2);
          if (lt > 1.0) { arm(kev, 'R', 0.4, 0.3); arm(kev, 'L', 0.4, 0.3); P(kev).torso.rotation.y = 0; mouth(kev, 0.4 + Math.sin(lt * 20) * 0.3); face(kev, 2.6, 2.0); }
        }
        // Gus laughing, then launched
        if (lt < 0.62) {
          gus.position.set(0.9, Math.abs(Math.sin(lt * 16)) * 0.08, -3.1);
          face(gus, 2.6, 1.0);
          arm(gus, 'L', 2.8, 0.6); arm(gus, 'R', 2.8, 0.6);
          mouth(gus, 0.8);
        } else {
          const a = seg(lt, 0.62, 1.35);
          gus.position.set(lerp(0.9, -2.0, a), 0.3 + Math.sin(a * Math.PI) * 1.3, lerp(-3.1, -0.4, a));
          gus.rotation.set(a * 7, gus.rotation.y, a * 4);
          ragdollPose(gus);
          eyes(gus, 1);
          mouth(gus, 1);
          if (a >= 1) { gus.position.set(-2.0, 0.85, -0.6); gus.rotation.set(1.3, 0.4, 0.2); }
        }
        gy.update(lt);
        aim(camera, [0.3, 1.5, 2.3], [1.0, 0.95, -2.2], 56);
        if (lt > 0.62 && lt < 0.95) shake(camera, 0.05 * (1 - seg(lt, 0.62, 0.95)), lt);
      },
      pins(lt) {
        comic(camera, v3(1.3, 2.2, -2.8), lt, 0.62, 'SLAP!', { dur: 0.9, size: 110, rot: -10, color: '#ff4d5e' });
      },
      hud(lt) {
        return flash(lt > 0.62 && lt < 0.78 ? 0.6 * (1 - seg(lt, 0.62, 0.78)) : 0) + voice(lt, 1.05, 2.0, 'KEV', 'that was MY toilet', COL.kev);
      },
    };
  },
};

const S_TUMBLE = {
  name: 'tumble', dur: 2.0,
  build(R) {
    const ctx = indoor(R);
    const { scene, camera } = ctx;
    buildStairs(scene);
    const gus = bean('gus');
    scene.add(gus);
    const stairY = (x) => (x > 3.2 ? 3.0 : x < -2.0 ? 0 : 3.0 * (x + 2.0) / 5.2);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus);
        const u = clamp01(lt / 1.35);
        const x = lerp(5.0, -3.4, u);
        const bounce = Math.abs(Math.sin(u * Math.PI * 4.5)) * 0.55 * (1 - u * 0.6);
        if (u < 1) {
          gus.position.set(x, stairY(x) + 0.75 + bounce, -0.45);
          gus.rotation.set(0, Math.PI / 2, -u * 14);
          ragdollPose(gus);
          flail(gus, lt, 0.6);
          eyes(gus, 1); mouth(gus, 1);
        } else {
          const s = easeOut(seg(lt, 1.35, 1.6));
          gus.position.set(-3.4 - s * 0.5, 0.2, -0.45);
          gus.rotation.set(Math.PI / 2, 0, -0.3);
          arm(gus, 'L', 3.0, 0.5); arm(gus, 'R', 3.0, 0.5);
          leg(gus, 'L', lt > 1.7 ? Math.sin(lt * 25) * 0.3 : 0);
        }
        const cx = Math.max(-2.6, x) + 0.4;
        aim(camera, [cx + 0.3, stairY(cx) + 2.4, 4.6], [cx - 0.3, stairY(cx) + 0.7, -0.4], 52);
      },
      pins(lt) {
        [0.15, 0.45, 0.75, 1.05].forEach((t0, i) => comic(camera, v3(lerp(5, -3.4, t0 / 1.35), stairY(lerp(5, -3.4, t0 / 1.35)) + 1.2, -0.2), lt, t0, ['BONK', 'OOF', 'BONK', 'OW'][i], { dur: 0.35, size: 44, rot: (i % 2 ? 10 : -10), color: '#fff' }));
        money(camera, v3(-3.8, 1.4, -0.4), lt, 1.4, '+$100 MO', COL.mo);
      },
      hud(lt) { return voice(lt, 1.15, 2.0, 'MO', '*re-fixes toilet* thanks gus :)', COL.mo); },
    };
  },
};

// ---------------- montage
const S_TUB = {
  name: 'tub', dur: 1.6,
  build(R) {
    const ctx = indoor(R);
    const { scene, camera } = ctx;
    buildDoorway(scene);
    const tubG = new THREE.Group();
    const tb = box(1.36, 0.68, 2.72, 0xffffff, { roughness: 0.25 });
    tb.position.y = 0.34;
    tubG.add(tb);
    const water = box(1.1, 0.04, 2.45, 0x8fd8ff, { roughness: 0.1 });
    water.position.y = 0.66;
    water.userData.noOutline = true;
    tubG.add(water);
    for (const [x, z] of [[-0.55, -1.15], [0.55, -1.15], [-0.55, 1.15], [0.55, 1.15]]) { const f = sphere(0.1, 0xc9a227); f.position.set(x, 0.02, z); tubG.add(f); }
    scene.add(addOutlines(tubG, 0.012));
    const kev = bean('kev');
    const you = bean('you');
    scene.add(kev, you);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(kev); neutral(you);
        const stop = 0.75;
        const u = Math.min(lt, stop) / stop;
        const jolt = lt > stop ? Math.sin((lt - stop) * 30) * 0.04 * Math.exp(-(lt - stop) * 6) : 0;
        const front = lerp(3.0, 0.15, u) + jolt;
        tubG.position.set(0, 0.35, front + 1.36);
        tubG.rotation.x = lt > stop ? -0.05 * Math.exp(-(lt - stop) * 4) : 0;
        // Kev leads, walking backwards through the door
        const bk = lt < stop ? walk(kev, lt * 12, 0.6) : 0;
        kev.position.set(0, bk, front - 0.55);
        kev.rotation.y = 0;
        arm(kev, 'L', 1.25, 0.35); arm(kev, 'R', 1.25, 0.35);
        if (lt > stop) { eyes(kev, 0.9); mouth(kev, 0.5); P(kev).head.rotation.x = -0.15; }
        // You push from the back, then bonk and fall over backwards
        if (lt < stop + 0.05) {
          const b1 = walk(you, lt * 12, 0.6);
          you.position.set(0, b1, front + 2.72 + 0.6);
          you.rotation.set(0, Math.PI, 0);
          arm(you, 'L', 1.3, 0.4); arm(you, 'R', 1.3, 0.4);
          P(you).torso.rotation.x = 0.3;
        } else {
          const a = easeOut(seg(lt, stop + 0.05, stop + 0.45));
          you.position.set(0, 0.15 * a, front + 2.72 + 0.6 + a * 0.6);
          you.rotation.set(-a * 1.45, Math.PI, 0);
          arm(you, 'L', 2.6, 0.9); arm(you, 'R', 2.6, 0.9);
          leg(you, 'L', 0.8 * a); leg(you, 'R', 0.5 * a);
          eyes(you, 1); mouth(you, 0.8);
        }
        aim(camera, [2.6, 2.3, 7.8], [0, 0.8, 1.4], 52);
        if (lt > stop && lt < stop + 0.3) shake(camera, 0.04, lt);
      },
      pins(lt) { comic(camera, v3(0.9, 1.9, 0.6), lt, 0.75, 'CLONK!', { dur: 0.7, size: 70 }); comic(camera, v3(0.4, 1.6, 4.4), lt, 0.85, 'OOF', { dur: 0.5, size: 44, color: '#fff', rot: 10 }); },
      hud() { return ''; },
    };
  },
};

const S_WALL = {
  name: 'wall', dur: 1.6,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const hinge = new THREE.Group();
    hinge.position.set(-15, 0, 6.2);
    scene.add(hinge);
    const sid = T.siding(0xa8e6cf);
    const add = (w, h, x, y) => { const m = surf(w, h, 0.16, sid, 2.5); m.position.set(x, y, 0); hinge.add(m); };
    add(1.15, 3.2, -1.175, 1.6);
    add(1.15, 3.2, 1.175, 1.6);
    add(1.2, 0.95, 0, 0.475);
    add(1.2, 0.85, 0, 2.775);
    const frameM = mat(0xffffff, { roughness: 0.5 });
    for (const [w, h, x, y] of [[1.3, 0.1, 0, 0.95], [1.3, 0.1, 0, 2.35], [0.1, 1.4, -0.6, 1.65], [0.1, 1.4, 0.6, 1.65]]) { const b = mesh(new THREE.BoxGeometry(w, h, 0.22), frameM); b.position.set(x, y, 0); hinge.add(b); }
    const mo = bean('mo');
    scene.add(mo);
    const puff = new Puff(scene, [-15, 0.05, 7.8], { t0: 0.95, count: 16, size: 0.28, spread: 3.0, rise: 0.25, life: 0.9 });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const f = easeIn(seg(lt, 0.45, 0.95));
        hinge.rotation.x = f * Math.PI / 2 + (lt > 0.95 ? Math.sin((lt - 0.95) * 30) * 0.015 * Math.exp(-(lt - 0.95) * 6) : 0);
        neutral(mo);
        mo.position.set(-15, 0, 6.2 + 1.65);
        face(mo, -11.5, 12);
        if (lt < 0.95) { arm(mo, 'R', 2.4, 0.3); P(mo).head.rotation.x = -0.05; }
        else { eyes(mo, lt > 1.2 && lt < 1.3 ? -0.8 : 0.7); arm(mo, 'R', 0.2, 0.2); }
        puff.update(lt);
        aim(camera, [-10.2, 2.4, 11.5], [-15, 1.0, 7.2], 50);
        if (lt > 0.95 && lt < 1.25) shake(camera, 0.05, lt);
      },
      pins(lt) {
        comic(camera, v3(-13.5, 1.6, 8.0), lt, 0.95, 'WHUMP', { dur: 0.6, size: 60, color: '#fff' });
      },
      hud() { return ''; },
    };
  },
};

const S_BLOWER = {
  name: 'blower', dur: 1.6,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    const you = bean('you');
    scene.add(gus, you);
    const lb = attachToHand(gus, 'R', leafBlower());
    lb.rotation.x = Math.PI / 2;
    const leaves = new Burst(scene, { count: 80, geo: GEO.leaf, material: MAT.leaf, origin: [-1.15, 0.95, 3.75], dir: [-0.45, 0.12, -1], spread: 0.3, speed: [6, 10], gravity: -2, emit: [0, 1.3], life: [0.5, 0.9], size: [1, 1.6], floor: 0.02, spin: 14 });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        neutral(gus); neutral(you);
        gus.position.set(-0.6, 0, 4.7);
        face(gus, -2.2, 1.7);
        arm(gus, 'R', 1.5, 0.0); arm(gus, 'L', 1.2, -0.3);
        mouth(gus, 0.6 + Math.sin(lt * 25) * 0.3);
        gus.position.x += Math.sin(lt * 50) * 0.02;
        const a = seg(lt, 0.35, 1.25);
        if (a <= 0) {
          you.position.set(-2.2, 0.3, 1.7);
          you.rotation.y = 0;
          arm(you, 'L', 0.3, 0.3); arm(you, 'R', 0.3, 0.3);
          eyes(you, seg(lt, 0, 0.3));
        } else {
          you.position.set(lerp(-2.2, -6.6, a), 0.3 + Math.sin(a * Math.PI) * 1.7 - a * 0.1, lerp(1.7, 1.2, a));
          you.rotation.set(-a * 2.5, 0, a * 3);
          flail(you, lt, 1);
          eyes(you, 1); mouth(you, 1);
          if (a >= 1) { you.position.set(-6.6, 0.9, 0.9); you.rotation.set(Math.PI, 0, 0.3); }
        }
        leaves.update(lt);
        aim(camera, [1.6, 2.2, 9.2], [-3.9, 1.3, 2.0], 56);
      },
      pins(lt) { comic(camera, v3(-1.0, 2.3, 3.4), lt, 0.1, 'FWOOOSH', { dur: 1.2, size: 54, color: '#ffd23f', rot: -4 }); comic(camera, v3(-6.6, 2.0, 1.2), lt, 1.25, 'PLOMF', { dur: 0.35, size: 44, color: '#fff' }); },
      hud() { return ''; },
    };
  },
};

const S_POTTY = {
  name: 'potty', dur: 1.6,
  build(R) {
    const ctx = street(R);
    const { scene, camera, refs } = ctx;
    const { inner, door } = refs.pp.userData;
    const puff = new Puff(scene, [13.1, 0.05, -0.1], { t0: 0.95, count: 14, size: 0.28, spread: 2.6, rise: 0.25, life: 0.9 });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const wob = lt < 0.3 ? Math.sin(lt * 40) * 0.05 : 0;
        const f = easeIn(seg(lt, 0.3, 0.95));
        inner.rotation.x = f * (Math.PI / 2 - 0.02) + wob + (lt > 0.95 ? Math.sin((lt - 0.95) * 28) * 0.03 * Math.exp(-(lt - 0.95) * 6) : 0);
        door.rotation.y = lt > 1.0 ? -1.4 * easeOut(seg(lt, 1.0, 1.2)) : 0;
        puff.update(lt);
        aim(camera, [19.2, 2.0, 1.6], [13.2, 1.0, -1.2], 50);
        if (lt > 0.95 && lt < 1.25) shake(camera, 0.05, lt);
      },
      pins(lt) { comic(camera, v3(13.0, 1.7, 0.4), lt, 0.95, 'CRUNCH', { dur: 0.6, size: 60, color: '#fff' }); },
      hud(lt) { return voice(lt, 1.05, 1.6, 'KEV', '(muffled) …guys?', COL.kev); },
    };
  },
};

const S_GOLD = {
  name: 'gold', dur: 1.6,
  build(R) {
    const ctx = indoor(R);
    const { scene, camera } = ctx;
    const { goldPos } = buildLiving(scene);
    const gm = marker(0xffd23f);
    gm.position.set(goldPos[0], 2.0, goldPos[2] + 0.4);
    gm.scale.setScalar(2.2);
    scene.add(gm);
    const gl = new THREE.PointLight(0xffd23f, 8, 6);
    gl.position.set(goldPos[0], 1.6, goldPos[2] + 0.8);
    scene.add(gl);
    const target = [2.0, -3.0];
    const crew = { kev: [-4.5, 3.5], mo: [6.0, 2.8], you: [-5.5, -1.5], gus: [5.5, -1.5] };
    const beans = Object.fromEntries(Object.keys(crew).map((k) => { const w = bean(k); scene.add(w); return [k, w]; }));
    const coins = coinBurst(scene, [2.0, 0.8, -3.0], { emit: [1.08, 1.15], count: 30, speed: [3, 5] });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        gm.quaternion.copy(camera.quaternion);
        gm.position.y = 2.0 + Math.sin(lt * 5) * 0.08;
        Object.entries(beans).forEach(([k, w], i) => {
          neutral(w);
          const s = crew[k];
          const u = seg(lt, 0, 1.05);
          const e = u < 0.75 ? u / 0.75 * 0.8 : 0.8 + (u - 0.75) / 0.25 * 0.2;
          const x = lerp(s[0], target[0] + (i % 2 ? 0.4 : -0.4), e);
          const z = lerp(s[1], target[1] + (i < 2 ? 0.4 : -0.3), e);
          face(w, target[0], target[1]);
          if (u < 0.75) {
            const b = walk(w, lt * 15 + i, 1.0);
            w.position.set(x, b, z);
            P(w).torso.rotation.x = 0.35;
            mouth(w, 0.6); eyes(w, 0.5);
          } else if (lt < 1.08) {
            const d = seg(lt, 0.79, 1.08);
            w.position.set(x, 0.4 + Math.sin(d * Math.PI) * 0.7, z);
            w.rotation.x = d * 1.3;
            arm(w, 'L', 2.9, 0.3); arm(w, 'R', 2.9, 0.3);
            leg(w, 'L', -0.6); leg(w, 'R', -0.6);
            mouth(w, 1); eyes(w, 1);
          } else {
            w.position.set(target[0] + [-0.35, 0.35, -0.2, 0.3][i], 0.2 + i * 0.28, target[1] + [0.3, 0.1, -0.2, -0.35][i]);
            w.rotation.set(Math.PI / 2 - 0.2, w.rotation.y + i, 0);
            ragdollPose(w);
            eyes(w, 1);
          }
        });
        coins.update(lt);
        aim(camera, [0.9, 2.7, 2.6], [1.9, 0.7, -2.9], 60);
        if (lt > 1.08 && lt < 1.35) shake(camera, 0.05, lt);
      },
      pins(lt) {
        if (lt < 1.08) { const el = pin(camera, v3(2.0, 3.5, -4.0), '★ GOLDEN JOB · $$$ ×3', { cls: 'tr-money' }); el.style.color = '#ffd23f'; el.style.fontSize = '34px'; el.style.transform = `translate(-50%,-50%) scale(${1 + Math.sin(lt * 10) * 0.05})`; }
        comic(camera, v3(2.0, 2.0, -2.6), lt, 1.08, 'POW!', { dur: 0.5, size: 90, color: '#ff4d5e' });
      },
      hud() { return ''; },
    };
  },
};

// ---------------- tension + payoff
const S_CAR = {
  name: 'grandma-arrives', dur: 2.0,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const c = car(0xa070d0);
    scene.add(c);
    const gm = granny(0.5);
    scene.add(gm);
    const path = [[34, 17.2], [14, 17.2], [7.5, 16.4], [5.0, 13.5], [4.7, 10.5]];
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const u = easeOut(seg(lt, 0, 1.8));
        const p = pathAt(path, u);
        const p2 = pathAt(path, Math.min(1, u + 0.02));
        c.position.set(p[0], 0, p[1]);
        if (u < 0.99) c.rotation.y = Math.atan2(-(p2[1] - p[1]), p2[0] - p[0]);
        c.updateMatrixWorld(true);
        gm.position.copy(v3(-0.1, 0.35, -0.4).applyMatrix4(c.matrixWorld));
        gm.rotation.y = c.rotation.y + Math.PI / 2;
        for (const w of c.userData.wheels) w.rotation.z = -lt * 12 * (1 - u);
        aim(camera, [-1.2, 1.5, 6.5], [8, 1.2, 15], 50);
      },
      hud(lt) {
        const sec = lt < 0.7 ? 3 : lt < 1.4 ? 2 : 1;
        return houseBar(99, `0:0${sec}`, { warn: true }) + voice(lt, 0.8, 2.0, 'YOU', 'SHE\'S HERE!!! SHE\'S HERE!!!', COL.you);
      },
      css(lt) { return `saturate(1.05) brightness(${1 - Math.abs(Math.sin(lt * 6)) * 0.06})`; },
    };
  },
};

const S_OOPS = {
  name: 'oops', dur: 1.5,
  build(R) {
    const ctx = bathroom(R);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    scene.add(gus);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus);
        gus.position.set(0.75, 0, -3.45);
        face(gus, -0.25, -4.2);
        P(gus).torso.rotation.x = 0.35;
        arm(gus, 'L', 1.4, -0.2); arm(gus, 'R', 1.4, -0.2);
        const turn = easeInOut(seg(lt, 0.25, 0.65));
        P(gus).head.rotation.y = lerp(0, 2.75, turn);
        P(gus).head.rotation.x = -0.1 * turn;
        eyes(gus, turn * 0.8);
        mouth(gus, lt > 0.8 ? 0.25 : 0);
        aim(camera, [2.4, 1.45, -1.0], [0.4, 1.1, -3.6], 46);
      },
      hud(lt) { return houseBar(99, '0:01', { warn: true }) + voice(lt, 0.75, 1.5, 'GUS', '…oops.', COL.gus); },
    };
  },
};

const S_DOORBELL = {
  name: 'doorbell', dur: 1.5,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const gm = granny();
    scene.add(gm);
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        neutral(gm);
        gm.position.set(-2.2, 0.3, 2.0);
        gm.rotation.y = Math.PI;
        gm.userData.parts.armR.rotation.x = lt < 0.4 ? -1.4 * seg(lt, 0.05, 0.25) : -1.4;
        aim(camera, [-1.4, 1.5, 5.6], [-2.2, 1.35, 0.6], 46);
      },
      pins(lt) {
        comic(camera, v3(-2.9, 2.2, 0.6), lt, 0.3, 'DING', { dur: 1.2, size: 70, color: '#fff', rot: -8 });
        comic(camera, v3(-1.5, 1.7, 0.6), lt, 0.65, 'DONG', { dur: 0.85, size: 70, color: '#fff', rot: 8 });
      },
      hud(lt) { return houseBar(99, '0:00', { warn: true }); },
    };
  },
};

const S_PAYOFF = { name: 'payoff', dur: 5.0, build: (R) => panicShot(R, { payoff: true }) };

const S_PAYDAY = {
  name: 'payday', dur: 3.5,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    const yK = podium(scene, 0, 4);
    const yY = podium(scene, -2.2, 3);
    const yM = podium(scene, 2.2, 2);
    for (const g of scene.children.slice(-9)) { g.position.z += 6; g.position.x += -1; }
    const kev = bean('kev', { hat: 0xffcc00 });
    const you = bean('you');
    const mo = bean('mo');
    const gus = bean('gus', { hat: null });
    scene.add(kev, you, mo, gus);
    const crown = mesh(new THREE.ConeGeometry(0.32, 0.45, 5), mat(0xffd700, { metalness: 0.7, roughness: 0.25 }));
    crown.position.y = 0.95;
    kev.userData.parts.head.add(crown);
    const dunce = mesh(new THREE.ConeGeometry(0.42, 1.3, 20), mat(0xf4f0e8, { roughness: 0.8 }));
    dunce.position.y = 1.0;
    dunce.rotation.z = 0.15;
    gus.userData.parts.head.add(addOutlines(dunce, 0.01));
    const conf = new Burst(scene, { count: 220, geo: GEO.confetti, material: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), origin: [-1, 7, 6], originJitter: 5, dir: [0, -1, 0], spread: 0.4, speed: [0.5, 1.5], gravity: -1.6, emit: [0, 2.5], life: [2, 3], size: [1, 1.4], floor: 0.02, spin: 8 });
    const cols = [0xff4d5e, 0xffd23f, 0x4f8dff, 0x3ccf7a, 0xa65cff, 0xffffff];
    for (let i = 0; i < 220; i++) conf.mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        for (const w of [kev, you, mo, gus]) neutral(w);
        kev.position.set(-1, yK + Math.abs(Math.sin(lt * 7)) * 0.1, 6);
        arm(kev, 'L', 2.9, 0.4); arm(kev, 'R', 2.9, 0.4); mouth(kev, 0.7);
        you.position.set(-3.2, yY, 6);
        arm(you, 'R', 2.5, 0.5);
        mo.position.set(1.2, yM, 6);
        arm(mo, 'L', 0.4, 0.6); arm(mo, 'R', 0.4, 0.6);
        gus.position.set(1.7, 0, 9.0);
        face(gus, 8, 12);
        P(gus).head.rotation.x = 0.35;
        const b = walk(gus, lt * 5, 0.3);
        gus.position.x += lt * 0.25;
        gus.position.y = b * 0.4;
        conf.update(lt);
        aim(camera, [-0.4, 2.6, 13.5], [-0.2, 2.0, 5], 46);
      },
      pins(lt) {
        const el = pin(camera, v3(gus.position.x, 2.5, gus.position.z), 'last place 🙃', { cls: 'tr-tag' });
        el.style.setProperty('--c', COL.gus);
      },
      hud(lt) {
        return wallets({ kev: 5240, you: 4410, mo: 3980, gus: 610 }, 'kev') + card(lt, 0.25, 3.45, '3 HOUSES.<br>1 WINNER.', { pos: 'tl', size: 84, accent: '#ffd23f' });
      },
    };
  },
};

const S_TITLE = {
  name: 'title', dur: 5.5,
  build(R) {
    const ctx = street(R);
    const { scene, camera } = ctx;
    return {
      scene, camera, fx: { ...FX_OUT, grade: { vig: 0.55, warm: 0.05, sat: 1.05 } },
      update(lt) {
        const u = easeInOut(lt / 5.5);
        aim(camera, [lerp(6, 3, u), lerp(2.2, 4.0, u), lerp(24, 20, u)], [-0.5, lerp(3.5, 4.5, u), -2], 50);
        const st = lt > 0.25 && lt < 0.55 ? 0.06 * (1 - seg(lt, 0.25, 0.55)) : 0;
        if (st) shake(camera, st, lt);
      },
      hud(lt) {
        const u = seg(lt, 0.25, 0.5);
        const sc = lerp(2.6, 1, easeOut(u));
        let h = `<div class="tr-dim" style="background:radial-gradient(ellipse at 50% 45%, rgba(10,6,14,.15), rgba(10,6,14,.7))"></div>`;
        if (lt > 0.25) h += `<div class="tr-title" style="transform:translate(-50%,-50%) rotate(-4deg) scale(${sc});opacity:${Math.min(1, u * 3)}"><div class="logo">OVER<br><span>BUDGET</span></div><div class="inv">INVOICE #0001 · PAST DUE</div></div>`;
        h += flash(lt > 0.48 && lt < 0.7 ? 0.5 * (1 - seg(lt, 0.48, 0.7)) : 0);
        if (lt > 1.3) h += `<div class="tr-tagline" style="opacity:${seg(lt, 1.3, 1.6)};transform:translateX(-50%) translateY(${(1 - easeOut(seg(lt, 1.3, 1.6))) * 16}px)">fix stuff. get paid. blame gus.</div>`;
        if (lt > 2.1) {
          const b = (i) => `opacity:${seg(lt, 2.1 + i * 0.12, 2.35 + i * 0.12)};transform:translateY(${(1 - easeOut(seg(lt, 2.1 + i * 0.12, 2.35 + i * 0.12))) * 14}px)`;
          h += `<div class="tr-badges"><div class="b" style="${b(0)}">1–4 PLAYERS</div><div class="b" style="${b(1)}">ONLINE CO-OP</div><div class="b" style="${b(2)}">PROXIMITY CHAT</div>
            <div class="steam" style="${b(3)};transform:scale(${0.8 + easeBack(seg(lt, 2.5, 2.8)) * 0.2})">WISHLIST ON STEAM</div></div>`;
        }
        h += flash(lt > 5.05 ? seg(lt, 5.05, 5.5) : 0, '#000');
        return h;
      },
    };
  },
};

export const SCENES = [
  S_COLD, S_ARRIVE, S_JOB, S_FPFIX, S_DRYWALL, S_HAMMER, S_SABOTAGE, S_SLAP, S_TUMBLE,
  S_TUB, S_WALL, S_BLOWER, S_POTTY, S_GOLD,
  S_CAR, S_OOPS, S_DOORBELL, S_PAYOFF, S_PAYDAY, S_TITLE,
];

// cards that span several montage cuts (absolute trailer time)
export function globalHud(t, starts) {
  const i = SCENES.indexOf(S_TUB);
  const m0 = starts[i];
  const lt = t - m0;
  return card(lt, 0.1, 3.15, '1–4 PLAYERS', { pos: 'bl', size: 88, accent: '#4f8dff' }) +
    card(lt, 3.3, 6.35, 'PROXIMITY<br>VOICE CHAT', { pos: 'bl', size: 80, accent: '#3ccf7a' });
}
