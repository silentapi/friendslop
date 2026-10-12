// OVER BUDGET announce trailer: shot-by-shot choreography (v2).
// Each shot: { name, dur, build(renderer) -> { scene, camera, update(lt), hud(lt), pins(lt), css(lt), post(lt, composer), fx } }
// v2 changes:
//   • every beat time comes from cues.json (shared with audio.py), so picture and sound can't drift
//   • animation principles: anticipation, squash & stretch, overlapping limbs, follow-through springs, arcs
//   • lighting: low fill + warm key 28° front-right + cool rim back-left per shot
//   • camera: one lens per location, punch-ins on beats, shake only for explosions
import { THREE, mat, mesh, box, cyl, sphere, addOutlines, pin } from '../lib.js';
import { setup, skyDome, glow, T, tmat, surf, keyRim } from '../fx.js';
import {
  bean, granny, face, neutral, mouth, eyes, walk, arm, leg, flail, ragdollPose, Burst, GEO, MAT, coinBurst, Geyser, Puff, marker,
  shake, aim, card, voice, money, comic, houseBar, wallets, flash, timerStr, COL, clamp01, lerp, sstep, seg, easeOut, easeIn,
  easeInOut, easeBack, v3, pathAt, spring, anticipate, squash, impactSquash, takeoffStretch, overlap, hatWobble, glance, arcPoint, punch, LENS,
  alive, headLook, laugh, handheld, stroll, chatStack,
} from './core.js';
import { buildStreet, buildBathroom, buildStairs, buildLiving, buildDoorway, companyVan, car, podium } from './sets.js';
import CUES from './cues.json' with { type: 'json' };

export const Q = Object.fromEntries(CUES.scenes.map((s) => [s.name, s.cues]));
const DUR = Object.fromEntries(CUES.scenes.map((s) => [s.name, s.dur]));
const str = (k, d = 0.5) => CUES.strength[k] ?? d;
const CHAT = (name) => CUES.chat.filter((c) => c.scene === name);
const said = (name, who) => (CHAT(name).find((c) => c.who === who) || { t0: Infinity, t1: Infinity });
const talking = (name, who, lt) => { const c = said(name, who); return lt >= c.t0 && lt <= c.t1; };

// Lower fill than v1 so lit faces hold their colour and light changes read.
const STREET = { bg: 0xffc79a, fog: [0xffc8a0, 45, 170], sunPos: [-60, 16, -25], sunInt: 3.4, sunColor: 0xffb070, hemiSky: 0x9cc2ff, hemiGround: 0x6a4a32, hemiInt: 0.45, env: 0.22, shadowBox: 40, shadowMap: 2048 };
const BATH = { bg: 0xffcf9e, fog: null, sunPos: [5, 14, -25], sunInt: 1.8, sunColor: 0xffc890, hemiInt: 0.28, env: 0.25, shadowBox: 10, shadowMap: 2048 };
const INDOOR = { bg: 0xf1dfc4, fog: null, sunPos: [10, 20, 10], sunInt: 0.0, hemiSky: 0xfff0dc, hemiGround: 0x6a4a32, hemiInt: 0.38, env: 0.28, shadowBox: 12, shadowMap: 1024 };
const GRADE = { vig: 0.3, warm: 0.03, sat: 1.2, lift: 0.01 };
const FX_IN = { ao: 0.9, aoSamples: 8, bloom: 0.25, bloomThreshold: 0.9, grade: GRADE };
const FX_OUT = { ao: 0.8, aoSamples: 8, aoRadius: 1.0, bloom: 0.35, bloomThreshold: 0.85, grade: { ...GRADE, warm: 0.04 } };

function street(R, frame) {
  const ctx = setup({ renderer: R, ...STREET });
  ctx.sun.target.position.set(0, 0, 3);
  const refs = buildStreet(ctx.scene);
  if (frame) keyRim(ctx.scene, frame[0], frame[1], { keyInt: 1.0, rimInt: 0.7, dist: 30 });
  return { ...ctx, refs };
}
function bathroom(R, opts, frame) {
  const ctx = setup({ renderer: R, ...BATH });
  ctx.sun.target.position.set(0, 0, -3);
  skyDome(ctx.scene, { top: 0x6aa7e8, horizon: 0xffc690, sunDir: [-0.15, 0.45, 0.85] });
  const refs = buildBathroom(ctx.scene, opts);
  if (frame) keyRim(ctx.scene, frame[0], frame[1], { keyInt: 0.85, rimInt: 1.0, dist: 8 });
  return { ...ctx, refs };
}
function indoor(R, frame) {
  const ctx = setup({ renderer: R, ...INDOOR });
  if (frame) keyRim(ctx.scene, frame[0], frame[1], { keyInt: 2.0, rimInt: 2.2, dist: 8 });
  return ctx;
}

const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const P = (o) => o.userData.parts;
const lastBefore = (t, list) => list.filter((x) => x <= t).pop();

// ---------------------------------------------------------------- first-person arm + tools
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
const ringHtml = (pct, color, label) => `<div class="g-ring"><svg width="58" height="58"><circle cx="29" cy="29" r="24" fill="rgba(10,6,14,.55)" stroke="rgba(255,255,255,.22)" stroke-width="5"/><circle cx="29" cy="29" r="24" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 24 * pct).toFixed(1)} 999" transform="rotate(-90 29 29)"/></svg><span class="ts">${label}</span></div>`;

// ---------------------------------------------------------------- shared bathroom panic tableau (cold open + payoff)
function panicShot(R, { payoff }) {
  const name = payoff ? 'payoff' : 'cold-open';
  const q = Q[name];
  const CAM = payoff ? [-0.3, 1.75, 3.6] : [-0.5, 1.7, 3.3];
  const TGT = [0.2, 1.05, -3.0];
  const ctx = bathroom(R, {}, [CAM, TGT]);
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
  const home = Object.fromEntries(Object.entries(crew).map(([k, w]) => [k, w.position.clone()]));
  const blast = q.blast;
  const freeze = q.freeze ?? Infinity;
  const geyserTop = v3(-0.25, 1.9, -4.05);
  const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: blast, height: 2.4, dur: 4, scale: 1.5 });
  const drops = new Burst(scene, { count: 160, geo: GEO.drop, material: MAT.water, origin: [0.4, 3.4, -2.2], originJitter: 2.2, dir: [0, -1, 0], spread: 0.3, speed: [0.5, 1.5], emit: [blast + 0.4, blast + 4], life: [0.7, 1.1], size: [0.6, 1.2], floor: 0.02, spin: 0 });
  return {
    scene, camera, fx: FX_IN,
    update(lt) {
      const t = Math.min(lt, freeze);
      // Grandma: walks in (payoff), leans in, presses (anticipation → action)
      neutral(gm);
      if (payoff) {
        const u = seg(t, q.enter, q.flushReach - 0.1);
        const p = pathAt([[3.6, -0.4], [1.8, -2.4], [0.62, -3.75]], easeInOut(u));
        gm.position.set(p[0], 0, p[1]);
        if (u < 1) { gm.position.y = walk(gm, t * 9, 0.4) * 0.5; gm.rotation.y = Math.atan2(-1.2, -1.3); } else face(gm, -0.25, -4.15);
      } else face(gm, -0.25, -4.15);
      const press = anticipate(t, q.flush, q.flush - (q.flushReach ?? 0) + 0.05);
      gm.userData.parts.armR.rotation.x = -1.15 * press;
      gm.userData.parts.head.rotation.x = 0.15 * press;
      // Crew: idle → glance at the toilet one beat early → react (overlapping limbs, squash, hat follow-through)
      for (const [nm, w] of Object.entries(crew)) {
        const pose = (tt) => {
          neutral(w);
          w.position.copy(home[nm]);
          face(w, -0.25, -4.0);
          if (tt < blast) {
            if (payoff) {
              eyes(w, 0.6); mouth(w, 0.2); arm(w, 'L', 0.6, 0.6); arm(w, 'R', 0.6, 0.6);
              if (nm === 'gus') { face(w, 2.6, 2.4); P(w).head.rotation.y = 0.6; }
              headLook(w, gm.position.clone().setY(1.6), 0.6);
            }
            alive(w, tt, payoff ? 0.6 : 1);
          } else if (payoff && tt >= q.turnToGus) {
            // the comedic pause: everyone stops, slowly turns to Gus; Gus shrugs
            const u = easeInOut(seg(tt, q.turnToGus, q.turnToGus + 0.5));
            const g = home.gus;
            if (nm === 'gus') {
              face(w, -0.3, 3.6);
              arm(w, 'L', 0.55 * u, 0.25 + 0.75 * u); arm(w, 'R', 0.55 * u, 0.25 + 0.75 * u);
              P(w).head.rotation.x = 0.2 * u;
              mouth(w, 0.12); eyes(w, 0.25);
              alive(w, tt, 0.4);
            } else {
              const rA = Math.atan2(home[nm].x * 0.5 - home[nm].x, 3.0 - home[nm].z);
              const rB = Math.atan2(g.x - home[nm].x, g.z - home[nm].z);
              w.rotation.y = lerp(rA, rB, u);
              eyes(w, -0.45 * u);
              if (tt > q.chorus) {
                const sh = seg(tt, q.chorus, q.chorus + 0.15);
                P(w).torso.rotation.x = 0.3 * sh;
                arm(w, 'L', 1.2 * sh, 0.9); arm(w, 'R', 1.2 * sh, 0.9);
                mouth(w, 0.85 + Math.sin(tt * 9 + nm.length) * 0.15);
                eyes(w, 0.4);
              } else alive(w, tt, 0.3);
            }
          } else {
            const k = clamp01((tt - blast) / 0.2);
            face(w, home[nm].x * 0.5, 3.0);
            eyes(w, k); mouth(w, k);
            flail(w, tt + nm.length, k);
            P(w).torso.rotation.x = -0.25 * k;
            w.position.y = Math.abs(Math.sin((tt - blast) * 14 + nm.length)) * 0.12 * k;
          }
        };
        overlap(w, t, pose);
        if (t >= blast - 0.18 && t < blast + 0.1) glance(w, geyserTop, 1);
        squash(w, impactSquash(t, blast + 0.04, 0.22));
        hatWobble(w, t, blast + 0.04, 0.45);
      }
      gy.update(t);
      drops.update(t);
      // during the pause the camera creeps toward Gus
      const creep = payoff ? easeInOut(seg(t, q.turnToGus, q.chorus)) : 0;
      aim(camera, [lerp(CAM[0], 0.6, creep * 0.5), CAM[1], lerp(CAM[2], 3.0, creep * 0.5)], [lerp(TGT[0], home.gus.x, creep * 0.55), lerp(TGT[1], 1.3, creep * 0.55), lerp(TGT[2], home.gus.z, creep * 0.55)], LENS.bath);
      handheld(camera, lt, 1, 67);
      if (t > blast && !(payoff && t > q.turnToGus)) shake(camera, 0.018 * (1 - seg(t, blast, blast + 1.2)) + 0.003, t);
      punch(camera, LENS.bath, t, [blast, q.stampLand].filter((x) => x !== undefined), 0.05);
    },
    pins(lt) {
      const t = Math.min(lt, freeze);
      comic(camera, v3(0.4, 1.6, -4.2), t, q.flush, '*flush*', { dur: 0.6, color: '#fff', size: 34, rot: -4 });
      comic(camera, v3(-0.3, 2.9, -4.0), t, blast, 'KABLOOSH!', { dur: payoff ? 1.0 : 0.95, color: '#7fd0ff', size: 86, rot: -7 });
    },
    hud(lt) {
      let h = flash(lt > blast && lt < blast + 0.25 ? 0.55 * (1 - seg(lt, blast, blast + 0.25)) : 0);
      if (!payoff && lt > q.freeze) {
        h += `<div class="tr-vhs"></div>`;
        for (let i = 0; i < 3; i++) h += `<div class="tr-bar" style="top:${((lt * 900 + i * 260) % 760) - 20}px"></div>`;
        if (lt > q.rewind) h += `<div class="tr-vhs-corner">◀◀ REW</div><div class="tr-vhs-txt" style="opacity:${Math.min(1, seg(lt, q.rewind, q.rewind + 0.25))}">8 MINUTES EARLIER</div>`;
      }
      if (payoff) {
        if (lt > q.stamp) {
          const u = seg(lt, q.stamp, q.stampLand);
          h += `<div class="tr-stamp" style="transform:translate(-50%,-50%) rotate(-9deg) scale(${lerp(2.4, 1, easeIn(u)) * (1 + Math.max(0, spring(lt, q.stampLand, { amp: 0.06, freq: 4, damp: 0.4 })))});opacity:${Math.min(1, u * 3)}">NOBODY GETS PAID.</div>`;
        }
        h += flash(lt > q.stampLand && lt < q.stampLand + 0.2 ? 0.35 * (1 - seg(lt, q.stampLand, q.stampLand + 0.2)) : 0, '#e8253f');
        h += chatStack(lt, CHAT('payoff'));
      }
      return h;
    },
    css(lt) {
      if (!payoff && lt > q.freeze) {
        const r = lt > q.rewind;
        return `saturate(${r ? 0.25 : 0.5}) contrast(1.15) brightness(${r ? 0.75 : 0.95}) hue-rotate(${r ? Math.sin(lt * 40) * 8 : 0}deg)`;
      }
      return 'none';
    },
  };
}

// =================================================================== shots

const S_COLD = { name: 'cold-open', dur: DUR['cold-open'], build: (R) => panicShot(R, { payoff: false }) };

const S_ARRIVE = {
  name: 'arrival', dur: DUR.arrival,
  build(R) {
    const q = Q.arrival;
    const CAM0 = [8.5, 2.3, 31];
    const ctx = street(R, [CAM0, [-1, 1.6, 16]]);
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
    const HOP = 0.45;
    const exits = { mo: { t0: q.exitMo, to: [-1.6, 20.1] }, kev: { t0: q.exitKev, to: [0.1, 20.4] }, you: { t0: q.exitYou, to: [-3.0, 20.5] } };
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const u = easeOut(seg(lt, 0, q.stop));
        const vx = lerp(-34, 1.5, u);
        vanM.position.set(vx, 0, 17.2);
        // nose-dive on the brakes, then a sprung rock-back (follow-through on the van body)
        vanM.rotation.z = (lt < q.stop ? -0.03 * seg(lt, q.skid, q.stop) : 0) + spring(lt, q.stop, { amp: -0.05, freq: 2.6, damp: 0.3 });
        for (const s of skid) {
          const len = 6 * seg(lt, q.skid, q.stop);
          s.scale.x = Math.max(0.01, len);
          s.position.x = vx - 2.4 - len / 2;
        }
        vanM.userData.door.rotation.y = -1.9 * easeOut(seg(lt, q.door, q.door + 0.3)) + spring(lt, q.door + 0.3, { amp: 0.15, freq: 3, damp: 0.3 });
        const doorX = vx - 1.1;
        const door = [doorX, 0.5, 18.2];
        for (const [k, e] of Object.entries(exits)) {
          const w = crew[k];
          neutral(w);
          if (lt < e.t0 - 0.15) { w.visible = false; continue; }
          w.visible = true;
          const tgt = [doorX + e.to[0], 0, e.to[1]];
          const land = e.t0 + HOP;
          if (lt < e.t0) {
            // anticipation: crouch in the doorway
            w.position.set(...door);
            squash(w, 0.25 * anticipate(lt, e.t0, 0.15));
            arm(w, 'L', 0.6, 0.5); arm(w, 'R', 0.6, 0.5);
          } else if (lt < land) {
            const a = seg(lt, e.t0, land);
            w.position.set(...arcPoint(door, tgt, a, 0.6));
            w.rotation.y = 0;
            arm(w, 'L', 2.4, 0.7); arm(w, 'R', 2.4, 0.7); leg(w, 'L', 0.6);
            squash(w, takeoffStretch(lt, e.t0, 0.25, 0.2));
          } else {
            const wt = lt - land;
            const pose = (tt) => {
              neutral(w);
              const ww = Math.max(0, tt - land);
              const b = stroll(w, ww, 10);
              w.position.set(tgt[0] + ww * 0.9, b, tgt[2] + ww * 0.2);
              w.rotation.y = Math.PI / 2 - 0.3;
            };
            overlap(w, lt, pose);
            alive(w, lt, 0.6);
            if (k === 'mo' && lt > said('arrival', 'mo').t0 + 0.2) { face(w, doorX, 21.5); arm(w, 'R', 1.4, 0.2); mouth(w, 0.5 + Math.sin(lt * 20) * 0.3); w.position.x = tgt[0] + 0.3; w.position.y = 0; }
            squash(w, impactSquash(lt, land, 0.25));
            hatWobble(w, lt, land, 0.3);
          }
        }
        // Gus: crouch, launch on an arc, faceplant (squash + big hat follow-through)
        const g = crew.gus;
        neutral(g);
        if (lt < q.gusCrouch) g.visible = false;
        else {
          g.visible = true;
          const plant = [doorX - 0.9, 0.18, 21.9];
          if (lt < q.launch) {
            g.position.set(door[0], 0.5, door[2]);
            squash(g, 0.32 * anticipate(lt, q.launch, q.launch - q.gusCrouch));
            arm(g, 'L', 0.8, 0.6); arm(g, 'R', 0.8, 0.6);
          } else if (lt < q.faceplant) {
            const a = seg(lt, q.launch, q.faceplant);
            g.position.set(...arcPoint([door[0], 0.6, door[2]], plant, a, 1.3));
            g.rotation.set(a * Math.PI / 2, 0, Math.sin(a * 6) * 0.3);
            flail(g, lt, 1);
            squash(g, -0.25 * Math.sin(Math.PI * a));
          } else {
            g.position.set(...plant);
            g.rotation.set(Math.PI / 2, 0, 0);
            arm(g, 'L', 3.0, 0.4); arm(g, 'R', 3.0, 0.4);
            const tw = talking('arrival', 'gus', lt) ? Math.sin(lt * 18) * 0.4 : 0;
            if (talking('arrival', 'gus', lt)) arm(g, 'R', 3.0 - Math.abs(Math.sin(lt * 4)) * 0.6, 0.9);
            leg(g, 'L', tw); leg(g, 'R', -tw);
            squash(g, impactSquash(lt, q.faceplant, 0.4 * str('arrival.faceplant')));
            hatWobble(g, lt, q.faceplant, 0.7, 2.2, 0.22);
          }
        }
        const push = easeInOut(seg(lt, 0, DUR.arrival));
        aim(camera, [lerp(8.5, 7.0, push), lerp(2.3, 1.9, push), lerp(31, 28.5, push)], [lerp(-1, -0.5, push), 1.6, 16], LENS.street);
        handheld(camera, lt, 1, 70);
        punch(camera, LENS.street, lt, [q.stop, q.faceplant], 0.035);
      },
      pins(lt) {
        comic(camera, v3(-1.0, 2.2, 15.8), lt, q.skid + 0.35, 'SKRRRT!', { dur: 0.7, size: 64, rot: -6 });
        comic(camera, v3(crew.gus.position.x, 1.1, 21.9), lt, q.faceplant, 'THUD', { dur: 0.6, size: 46, rot: 8, color: '#fff' });
      },
      hud(lt) {
        return chatStack(lt, CHAT('arrival'));
      },
    };
  },
};

const MARKERS = [[1.6, 6.2, 0.7], [-6.9, 6.2, 0.7], [-2.2, 3.6, 2.4], [4.6, 3.5, 0.8], [3.2, 9.6, -1.0], [-4.4, 1.5, 0.9], [-2.2, 6.2, 0.7], [6.0, 6.2, 0.7], [13.8, 3.6, -2.2], [-6.3, 5.0, 1.4]];

const S_JOB = {
  name: 'the-job', dur: DUR['the-job'],
  build(R) {
    const q = Q['the-job'];
    const ctx = street(R, [[-12, 9, 18], [-0.5, 3.4, -2.5]]);
    const { scene, camera } = ctx;
    const ms = MARKERS.map((p) => { const m = marker(); m.position.set(...p); scene.add(m); return m; });
    const crew = ['kev', 'mo', 'you', 'gus'].map((k, i) => { const w = bean(k); scene.add(w); w.userData.lane = [-3.2 + i * 1.6, 15 + (i % 2) * 0.8]; return w; });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const d = DUR['the-job'];
        const a = lerp(-0.55, 0.32, easeInOut(lt / d));
        const r = lerp(25, 21, easeInOut(lt / d));
        aim(camera, [-0.5 + Math.sin(a) * r, lerp(8.5, 11, lt / d), -3 + Math.cos(a) * r], [-0.5, 3.4, -2.5], 50);
        handheld(camera, lt, 1, 54);
        ms.forEach((m, i) => {
          const t0 = q.markers + i * q.markerStep;
          // pop with squash: stretch up on appear, then settle on a spring
          const s = lt < t0 ? 0 : easeBack(seg(lt, t0, t0 + 0.3)) * 2.6;
          m.scale.set(Math.max(1e-4, s), Math.max(1e-4, s * (1 + spring(lt, t0 + 0.12, { amp: 0.25, freq: 3, damp: 0.4 }))), Math.max(1e-4, s));
          m.position.y = MARKERS[i][1] + Math.sin(lt * 4 + i) * 0.12;
          m.quaternion.copy(camera.quaternion);
          m.userData.halo.scale.setScalar(1 + ((lt * 1.5 + i * 0.3) % 1) * 0.6);
        });
        crew.forEach((w, i) => {
          overlap(w, lt, (tt) => {
            neutral(w);
            const b = stroll(w, tt + i * 0.1, 13);
            P(w).torso.rotation.x = 0.25;
            w.position.set(w.userData.lane[0] + i * 0.1, b, w.userData.lane[1] - tt * 3.2);
            w.rotation.y = Math.PI;
          });
        });
      },
      hud(lt) {
        return houseBar(0, '8:00') + card(lt, q.card, DUR['the-job'] - 0.05, 'FIX THE HOUSE.', { pos: 'bl', size: 96, accent: '#ff8a3d' });
      },
    };
  },
};

const S_FPFIX = {
  name: 'fp-fix', dur: DUR['fp-fix'],
  build(R) {
    const q = Q['fp-fix'];
    const ctx = bathroom(R, { ceiling: true }, [[0.15, 1.5, -1.25], [-0.2, 0.45, -4.0]]);
    const { scene, camera } = ctx;
    const armR = fpArm('kev', { pos: [0.3, -0.36, -0.62], rot: [-0.35, 0.35, 0] });
    const wr = wrench();
    const armL = fpArm('kev', { pos: [-0.42, -0.38, -0.66], rot: [-0.3, -0.4, 0] });
    camera.add(armR, wr, armL);
    const coins = coinBurst(scene, [-0.25, 0.6, -3.9], { emit: [q.fixed, q.fixed + 0.15], speed: [2, 4], dir: [0.15, 1, 0.5] });
    const sparks = new Burst(scene, { count: 40, geo: GEO.spark, material: MAT.spark, origin: [-0.25, 0.4, -3.95], spread: 1.4, speed: [2, 4], emit: [q.fixed, q.fixed + 0.1], life: [0.3, 0.6], size: [1, 1.6], floor: -5 });
    const shine = glow(0xffffff, 0.12);
    scene.add(shine);
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        const sway = Math.sin(lt * 1.3) * 0.02;
        aim(camera, [0.15 + sway, 1.5 + Math.sin(lt * 2.1) * 0.01, -1.25], [-0.2 + sway * 2, 0.45, -4.0], LENS.fp);
        handheld(camera, lt, 1, 72);
        punch(camera, LENS.fp, lt, [q.fixed], 0.03);
        const holding = lt > q.hold && lt < q.fixed;
        // anticipation: hands push in before the first ratchet
        const lean = anticipate(lt, q.hold, 0.25) * 0.04;
        const rat = holding ? Math.abs(Math.sin((lt - q.hold) * 9)) : 0;
        // follow-through: the wrench keeps swinging after the last turn, then settles
        const ft = spring(lt, q.fixed, { amp: 0.6, freq: 2.2, damp: 0.22 });
        wr.position.set(0.27, -0.33 + rat * 0.02, -0.72 - lean);
        wr.rotation.set(-0.6, 0.5, 0.7 + rat * 0.5 + ft);
        armR.rotation.z = rat * 0.3 + ft * 0.4;
        armR.position.z = -0.62 - lean;
        coins.update(lt);
        sparks.update(lt);
        const s = lt > q.fixed ? easeOut(seg(lt, q.fixed, q.fixed + 0.15)) * (1 - seg(lt, q.fixed + 0.15, q.fixed + 0.5)) : 0;
        shine.position.set(-0.25, 0.5, -3.9);
        shine.scale.setScalar(s * 3 + 0.0001);
      },
      pins(lt) {
        const pct = clamp01((lt - q.hold) / (q.fixed - q.hold));
        if (lt < q.fixed + 0.05) pin(camera, v3(0.06, 0.08, -3.98), `${ringHtml(pct, COL.kev, `${Math.round(pct * 100)}%`)}<div class="tr-prompt"><span class="k">E</span>HOLD · FIX TOILET <span style="color:#8dffa4">+$100</span></div>`, { cls: 'tr-ring' });
        money(camera, v3(-0.25, 1.3, -3.9), lt, q.fixed + 0.05, '+$100', '#8dffa4', { big: true, dur: 1.6 });
      },
      hud(lt) {
        const done = lt > q.fixed + 0.1;
        return `<div class="tr-x"></div>` + houseBar(done ? 16 : 8, timerStr(7 * 60 + 41 - lt)) +
          wallets({ kev: done ? lerp(1740, 1840, seg(lt, q.fixed + 0.1, q.fixed + 0.6)) : 1740, you: 1610, mo: 1320, gus: 990 }, done ? 'kev' : null) +
          card(lt, q.card, DUR['fp-fix'] - 0.05, 'GET PAID.', { pos: 'bl', size: 104, accent: '#3ccf7a' }) + chatStack(lt, CHAT('fp-fix'));
      },
    };
  },
};

const S_DRYWALL = {
  name: 'drywall', dur: DUR.drywall,
  build(R) {
    const q = Q.drywall;
    const CAM = [0.5, 1.65, 3.6];
    const ctx = indoor(R, [CAM, [-2.7, 1.15, 0.3]]);
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
    const puff = new Puff(scene, [-2.6, 1.0, 0.35], { t0: q.slam, count: 12, size: 0.18, spread: 1.2, life: 0.8 });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        overlap(mo, lt, (tt) => {
          neutral(mo);
          const u = seg(tt, 0, q.arrive);
          const b = u < 1 ? walk(mo, tt * 12, 0.5) : 0;
          mo.position.set(-2.6, b, lerp(2.4, 1.25, u));
          mo.rotation.y = Math.PI;
          const wind = anticipate(tt, q.slam, q.slam - q.windup);
          arm(mo, 'L', 1.5 + wind * 0.5, 0.4); arm(mo, 'R', 1.5 + wind * 0.5, 0.4);
          if (tt > q.slam) { arm(mo, 'L', 1.6, 0.2); arm(mo, 'R', 1.6, 0.2); }
        });
        // anticipation: pull the sheet back and crouch, then slam
        const wind = anticipate(lt, q.slam, q.slam - q.windup);
        const slam = easeIn(seg(lt, q.slam - 0.07, q.slam));
        panel.position.set(-2.6, lerp(1.15, 1.25, slam) + wind * 0.08, lerp(mo.position.z - 0.55 + wind * 0.25, 0.13, slam));
        panel.rotation.x = lerp(-0.2, 0, slam) + spring(lt, q.slam, { amp: 0.04, freq: 6, damp: 0.4 });
        if (lt > q.slam + 0.25) alive(mo, lt, 0.6);
        squash(mo, 0.12 * wind + impactSquash(lt, q.slam, 0.15));
        hatWobble(mo, lt, q.slam, 0.35);
        puff.update(lt);
        aim(camera, CAM, [-2.7, 1.15, 0.3], LENS.interior);
        handheld(camera, lt, 1, 41);
        punch(camera, LENS.interior, lt, [q.slam], 0.04);
      },
      pins(lt) {
        comic(camera, v3(-1.6, 2.1, 0.4), lt, q.slam, 'THWACK', { dur: 0.6, size: 54 });
        money(camera, v3(-2.6, 2.3, 0.6), lt, q.slam + 0.08, '+$50 MO', COL.mo);
      },
      hud(lt) { return houseBar(lerp(31, 44, seg(lt, q.slam + 0.05, q.slam + 0.3)), timerStr(5 * 60 + 12 - lt)); },
    };
  },
};

const S_HAMMER = {
  name: 'hammer', dur: DUR.hammer,
  build(R) {
    const q = Q.hammer;
    const CAM = [-2.3, 1.9, 3.4];
    const ctx = indoor(R, [CAM, [-4.2, 0.7, 0.0]]);
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
    const chips = new Burst(scene, { count: 30, geo: GEO.chip, material: mat(0xd9a066), origin: [-4.3, 0.1, 0.55], spread: 1.0, speed: [1, 2.5], emit: [q.hits[0], q.hits[q.hits.length - 1] + 0.05], life: [0.4, 0.8], floor: 0.02 });
    // Each swing is keyed so the head lands exactly on a cue: raise (anticipation) → strike → recoil.
    const swingAt = (t) => {
      const h = q.hits.find((x) => x >= t - 0.12) ?? q.hits[q.hits.length - 1];
      if (t > h + 0.12) return 0.9;
      if (t <= h - 0.08) return lerp(0.9, 2.8, easeOut(seg(t, h - 0.34, h - 0.08)));
      if (t <= h) return lerp(2.8, 0.75, easeIn(seg(t, h - 0.08, h)));
      return 0.75 + spring(t, h, { amp: 0.25, freq: 5, damp: 0.5 });
    };
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        overlap(you, lt, (tt) => {
          neutral(you);
          you.position.set(-4.3, -0.32, -0.25);
          leg(you, 'L', 1.4); leg(you, 'R', 1.4);
          P(you).torso.rotation.x = 0.45;
          arm(you, 'R', swingAt(tt), 0.15);
          arm(you, 'L', 0.9, 0.3);
          mouth(you, 0.3);
        }, { arms: 0, legs: 0.05 });
        alive(you, lt, 0.35);
        const lastHit = lastBefore(lt, q.hits);
        squash(you, lastHit !== undefined ? impactSquash(lt, lastHit, 0.06) : 0);
        if (lastHit !== undefined) hatWobble(you, lt, lastHit, 0.15, 3, 0.35);
        board.position.y = 0.06 + (lastHit !== undefined ? Math.max(0, spring(lt, lastHit, { amp: 0.03, freq: 8, damp: 0.5 })) : 0);
        chips.update(lt);
        aim(camera, CAM, [-4.2, 0.7, 0.0], LENS.interior);
        handheld(camera, lt, 1, 57);
      },
      pins(lt) {
        q.hits.forEach((t0, i) => comic(camera, v3(-3.6 - i * 0.2, 0.9, 0.7), lt, t0, 'BANG', { dur: 0.3, size: 40, rot: [-10, 8, -4][i % 3] }));
        money(camera, v3(-4.3, 2.0, 0.2), lt, q.paid, '+$75 YOU', COL.you);
      },
      hud(lt) { return houseBar(lerp(44, 58, seg(lt, q.paid, q.paid + 0.25)), timerStr(4 * 60 + 47 - lt)); },
    };
  },
};

const S_SABOTAGE = {
  name: 'sabotage', dur: DUR.sabotage,
  build(R) {
    const q = Q.sabotage;
    const CAM0 = [2.6, 1.4, 1.9];
    const ctx = bathroom(R, {}, [CAM0, [0.0, 0.85, -3.3]]);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    const mo = bean('mo');
    scene.add(gus, mo);
    const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: q.wreck, height: 2.6, dur: 3 });
    const coins = coinBurst(scene, [-0.25, 0.8, -3.9], { count: 30, emit: [q.wreck, q.wreck + 0.15], speed: [3, 5.5], dir: [0.3, 1, 0.6], spread: 0.8 });
    const glint = glow(0xffffff, 0.06);
    scene.add(glint);
    const spot = [0.75, 0, -3.45];
    const back = [1.6, 0, -2.6];
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        if (lt < q.arrive) {
          overlap(gus, lt, (tt) => {
            neutral(gus);
            const u = seg(tt, 0, q.arrive);
            const p = pathAt([[3.7, -0.4], [2.4, -1.4], [1.3, -2.8], [spot[0], spot[2]]], u);
            gus.position.set(p[0], 0, p[1]);
            const ph = tt * 7;
            leg(gus, 'L', Math.max(0, Math.sin(ph)) * 1.1);
            leg(gus, 'R', Math.max(0, -Math.sin(ph)) * 1.1);
            arm(gus, 'L', 1.6, 0.1); arm(gus, 'R', 1.6, 0.1);
            P(gus).torso.rotation.x = 0.3;
            gus.position.y = Math.abs(Math.sin(ph)) * 0.08;
            face(gus, -0.25, -4.2);
            P(gus).head.rotation.y = Math.sin(tt * 4) * 0.7;
            eyes(gus, 0.3);
          });
          squash(gus, -0.04 * Math.abs(Math.sin(lt * 7)));
        } else if (lt < q.wreck) {
          neutral(gus);
          gus.position.set(...spot);
          face(gus, -0.25, -4.2);
          // anticipation that reads to other players: crouch deepens, hands rub, sneaky look at camera
          const crouch = 0.08 * seg(lt, q.arrive, q.hold + 0.2) + 0.18 * anticipate(lt, q.wreck, q.wreck - q.windup);
          P(gus).torso.rotation.x = 0.35 + crouch;
          const rub = Math.sin(lt * 26) * 0.15;
          arm(gus, 'L', 1.4 + rub, -0.2); arm(gus, 'R', 1.4 - rub, -0.2);
          mouth(gus, 0.35);
          if (lt > q.windup) { P(gus).head.rotation.y = 0.9; glance(gus, camera.position, 1); }
          squash(gus, crouch);
        } else if (lt < q.land) {
          neutral(gus);
          const a = seg(lt, q.jumpBack, q.land);
          gus.position.set(...arcPoint(spot, back, a, 0.45));
          face(gus, 2.6, 2.0);
          arm(gus, 'L', 2.9, 0.6); arm(gus, 'R', 2.9, 0.6);
          mouth(gus, 0.8);
          eyes(gus, 0.5);
          squash(gus, takeoffStretch(lt, q.jumpBack, 0.25, q.land - q.jumpBack));
        } else {
          overlap(gus, lt, (tt) => {
            neutral(gus);
            gus.position.set(...back);
            face(gus, 2.6, 2.0);
            arm(gus, 'L', 2.9, 0.6); arm(gus, 'R', 2.9, 0.6);
            mouth(gus, 0.8 + Math.sin(tt * 22) * 0.2);
            eyes(gus, 0.4);
            P(gus).torso.rotation.z = Math.sin(tt * 16) * 0.12;
            gus.position.y = Math.abs(Math.sin(tt * 16)) * 0.1;
          });
          squash(gus, impactSquash(lt, q.land, 0.3 * str('sabotage.land') / 0.45));
          hatWobble(gus, lt, q.land, 0.4);
        }
        // bystander: Mo leans into the doorway, watches, then laughs at Gus
        neutral(mo);
        mo.visible = lt >= q.moPeek;
        if (mo.visible) {
          const lean = easeOut(seg(lt, q.moPeek, q.moPeek + 0.3));
          mo.position.set(lerp(3.6, 2.75, lean), 0, -0.45);
          face(mo, gus.position.x, gus.position.z);
          if (lt < q.wreck + 0.12) {
            mo.rotation.z = 0.22 * lean;
            headLook(mo, gus.position.clone().setY(1.2), 0.7);
            if (talking('sabotage', 'mo', lt)) mouth(mo, 0.3 + Math.abs(Math.sin(lt * 18)) * 0.4);
            alive(mo, lt, 0.5);
            if (lt > q.wreck) { eyes(mo, 1); mouth(mo, 0.8); }
          } else laugh(mo, lt, gus.position, 1);
        }
        gy.update(lt);
        coins.update(lt);
        glint.position.set(-0.05, 1.05 + Math.sin(lt * 3) * 0.1, -4.25);
        glint.scale.setScalar(lt < q.wreck ? 1 + Math.sin(lt * 9) * 0.6 : 0.0001);
        const push = easeInOut(lt / DUR.sabotage);
        aim(camera, [lerp(2.6, 2.1, push), 1.4, lerp(1.9, 1.2, push)], [0.0, 0.85, -3.3], LENS.bath);
        handheld(camera, lt, 1, 56);
        if (lt > q.wreck) shake(camera, 0.016 * (1 - seg(lt, q.wreck, q.wreck + 1)) + 0.003, lt);
        punch(camera, LENS.bath, lt, [q.wreck], 0.05);
      },
      pins(lt) {
        if (lt < q.wreck) {
          const el = pin(camera, v3(-0.25, 1.75, -4.1), '✓ KEV · +$100', { cls: 'tr-tag' });
          el.style.setProperty('--c', COL.kev);
          el.style.color = '#cfe0ff';
        }
        if (lt > q.hold && lt < q.wreck) {
          const pct = seg(lt, q.hold, q.wreck - 0.05);
          pin(camera, v3(0.3, 0.75, -3.9), `${ringHtml(pct, COL.gus, 'F')}<div class="tr-prompt"><span class="k">F</span>HOLD · WRECK IT 😈</div>`, { cls: 'tr-ring' });
        }
        comic(camera, v3(-0.4, 2.9, -4.0), lt, q.wreck, 'KABLOOSH!', { dur: 1.0, color: '#7fd0ff', size: 80 });
        money(camera, v3(-0.25, 2.0, -3.6), lt, q.wreck + 0.15, '−$100 KEV', COL.kev, { big: true, dur: 1.8 });
      },
      hud(lt) {
        const wrecked = lt > q.wreck + 0.15;
        let h = houseBar(wrecked ? 51 : 58, timerStr(3 * 60 + 30 - lt)) + wallets({ kev: wrecked ? lerp(1840, 1740, seg(lt, q.wreck + 0.15, q.wreck + 0.6)) : 1840, you: 1685, mo: 1370, gus: 990 }, wrecked ? 'kev' : null);
        h += card(lt, q.cardOr, q.arrive - 0.1, '…OR', { pos: 'tl', size: 96, accent: '#a65cff' });
        h += card(lt, q.cardWreck, DUR.sabotage - 0.05, 'WRECK YOUR<br>FRIENDS\' STUFF.', { pos: 'bl', size: 80, accent: '#a65cff' });
        if (wrecked) h += `<div class="tr-banner" style="opacity:${seg(lt, q.wreck + 0.15, q.wreck + 0.3)}">💥 WRECKED BY GUS</div>`;
        h += chatStack(lt, CHAT('sabotage'));
        h += flash(lt > q.wreck && lt < q.wreck + 0.2 ? 0.45 * (1 - seg(lt, q.wreck, q.wreck + 0.2)) : 0);
        return h;
      },
    };
  },
};

const S_SLAP = {
  name: 'slap', dur: DUR.slap,
  build(R) {
    const q = Q.slap;
    const CAM = [0.3, 1.5, 2.3];
    const ctx = bathroom(R, {}, [CAM, [1.0, 0.95, -2.2]]);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    const kev = bean('kev');
    const you = bean('you');
    scene.add(gus, kev, you);
    const gy = new Geyser(scene, [-0.25, 0.6, -4.05], { t0: -2, height: 2.3, dur: 6 });
    const gusFrom = [0.9, 0.3, -3.1];
    const gusTo = [-2.0, 0.85, -0.6];
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        // Kev: sprint in (overlapping limbs) → wind-up (anticipation) → slap → follow-through settle
        overlap(kev, lt, (tt) => {
          neutral(kev);
          const u = seg(tt, 0, q.arrive);
          const kp = pathAt([[3.8, -0.4], [2.6, -1.6], [1.75, -2.55]], u);
          kev.position.set(kp[0], 0, kp[1]);
          face(kev, 0.9, -3.1);
          if (u < 1) {
            kev.position.y = walk(kev, tt * 18, 1.1);
            P(kev).torso.rotation.x = 0.35;
            mouth(kev, 0.9); eyes(kev, 0.5);
          } else if (tt < q.hit) {
            const w = anticipate(tt, q.hit, q.hit - q.windup);
            arm(kev, 'R', 1.5, lerp(0.3, 1.6, w));
            P(kev).torso.rotation.y = 0.75 * w;
            mouth(kev, 0.4); eyes(kev, 0.6);
          } else {
            const sw = easeOut(seg(tt, q.hit, q.hit + 0.06));
            const ft = spring(tt, q.hit + 0.06, { amp: 0.55, freq: 2.2, damp: 0.22 });
            arm(kev, 'R', lerp(1.5, 1.2, sw), lerp(1.6, -0.7, sw) + ft);
            P(kev).torso.rotation.y = lerp(0.75, -0.5, sw) + ft * 0.4;
            mouth(kev, 0.6); eyes(kev, 0.2);
            if (tt > said('slap', 'kev').t0) { arm(kev, 'R', 0.4, 0.3); arm(kev, 'L', 0.4, 0.3); P(kev).torso.rotation.y = 0; mouth(kev, 0.4 + Math.sin(tt * 20) * 0.3); face(kev, 2.6, 2.0); }
          }
        }, { arms: 0.06, legs: 0.09 });
        squash(kev, lt < q.hit ? 0.1 * anticipate(lt, q.hit, q.hit - q.windup) : takeoffStretch(lt, q.hit, 0.12, 0.12));
        hatWobble(kev, lt, q.hit, 0.3);
        // Gus: laughing → hit squash → stretched arc flight → land squash + hat wobble
        neutral(gus);
        if (lt < q.hit) {
          gus.position.set(0.9, Math.abs(Math.sin(lt * 16)) * 0.08, -3.1);
          face(gus, 2.6, 1.0);
          arm(gus, 'L', 2.8, 0.6); arm(gus, 'R', 2.8, 0.6);
          mouth(gus, 0.8);
          if (lt > q.hit - 0.12) glance(gus, kev.position.clone().setY(1.6), 1);
        } else if (lt < q.land) {
          const a = seg(lt, q.hit + 0.04, q.land);
          gus.position.set(...arcPoint(gusFrom, gusTo, a, 1.3));
          gus.rotation.set(a * 7, gus.rotation.y, a * 4);
          ragdollPose(gus);
          eyes(gus, 1); mouth(gus, 1);
          squash(gus, lt < q.hit + 0.05 ? 0.35 * str('slap.hit') : -0.22);
        } else {
          gus.position.set(...gusTo);
          gus.rotation.set(1.3, 0.4, 0.2);
          ragdollPose(gus);
          eyes(gus, 1); mouth(gus, 0.6);
          squash(gus, impactSquash(lt, q.land, 0.35 * str('slap.land')));
          hatWobble(gus, lt, q.land, 0.6);
        }
        neutral(you);
        you.position.set(2.7, 0, 0.35);
        if (lt < q.hit) { face(you, kev.position.x, kev.position.z); alive(you, lt, 1); }
        else if (lt < q.land + 0.1) { face(you, gus.position.x, gus.position.z); arm(you, 'L', 2.75, 0.75); arm(you, 'R', 2.75, 0.75); eyes(you, 1); mouth(you, 0.8); headLook(you, gus.position, 0.5); }
        else laugh(you, lt, gus.position, 1);
        gy.update(lt);
        aim(camera, CAM, [1.0, 0.95, -2.2], LENS.bath);
        handheld(camera, lt, 1, 56);
        punch(camera, LENS.bath, lt, [q.hit], 0.07, 0.4);
      },
      pins(lt) { comic(camera, v3(1.3, 2.2, -2.8), lt, q.hit, 'SLAP!', { dur: 0.9, size: 110, rot: -10, color: '#ff4d5e' }); },
      hud(lt) {
        return flash(lt > q.hit && lt < q.hit + 0.16 ? 0.6 * (1 - seg(lt, q.hit, q.hit + 0.16)) : 0) + chatStack(lt, CHAT('slap'));
      },
    };
  },
};

const S_TUMBLE = {
  name: 'tumble', dur: DUR.tumble,
  build(R) {
    const q = Q.tumble;
    const ctx = indoor(R, [[0, 2.6, 4.6], [-0.6, 1.0, -0.4]]);
    const { scene, camera } = ctx;
    buildStairs(scene);
    const gus = bean('gus');
    const mo = bean('mo');
    scene.add(gus, mo);
    const wr = attachToHand(mo, 'R', hammer());
    wr.rotation.x = -Math.PI / 2;
    const stairY = (x) => (x > 3.2 ? 3.0 : x < -2.0 ? 0 : 3.0 * (x + 2.0) / 5.2);
    // Hops between contact cues: each bounce lands exactly on its cue (and its sound).
    const contacts = [q.start, ...q.bounces, q.land];
    const hopH = [0.6, 0.5, 0.42, 0.32, 0.22];
    const X0 = 5.0;
    const X1 = -3.4;
    const xAt = (t) => lerp(X0, X1, clamp01(t / q.land));
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus);
        const x = xAt(lt);
        if (lt < q.land) {
          const i = Math.max(0, contacts.findIndex((c, k) => lt >= c && lt < contacts[k + 1]));
          const u = seg(lt, contacts[i], contacts[i + 1]);
          gus.position.set(x, stairY(x) + 0.55 + 4 * hopH[i] * u * (1 - u), -0.45);
          gus.rotation.set(0, Math.PI / 2, -(lt / q.land) * 14);
          ragdollPose(gus);
          flail(gus, lt, 0.6);
          eyes(gus, 1); mouth(gus, 1);
          const lastC = lastBefore(lt, q.bounces);
          squash(gus, lastC !== undefined ? impactSquash(lt, lastC, 0.25 * str('tumble.bounces') / 0.55) : 0);
          if (lastC !== undefined) hatWobble(gus, lt, lastC, 0.4);
        } else {
          const s = easeOut(seg(lt, q.land, q.land + 0.25));
          gus.position.set(X1 - s * 0.5, 0.2, -0.45);
          gus.rotation.set(Math.PI / 2, 0, -0.3);
          arm(gus, 'L', 3.0, 0.5); arm(gus, 'R', 3.0, 0.5);
          leg(gus, 'L', lt > q.land + 0.3 ? Math.sin(lt * 25) * 0.3 : 0);
          squash(gus, impactSquash(lt, q.land, 0.35 * str('tumble.land')));
          hatWobble(gus, lt, q.land, 0.6);
        }
        // Mo wanders past the heap, glances down, keeps going ("…anyway")
        mo.visible = lt >= q.moWalk;
        if (mo.visible) {
          overlap(mo, lt, (tt) => {
            neutral(mo);
            const wt = Math.max(0, tt - q.moWalk);
            mo.position.set(-6.6 + wt * 1.9, 0, 0.75);
            mo.position.y = stroll(mo, wt, 9);
            mo.rotation.y = Math.PI / 2;
            arm(mo, 'R', 0.5, 0.2);
          });
          headLook(mo, gus.position, lt > q.land && lt < q.land + 0.45 ? 0.9 : 0.15);
          if (talking('tumble', 'mo', lt)) mouth(mo, 0.25 + Math.abs(Math.sin(lt * 16)) * 0.3);
          alive(mo, lt, 0.5);
        }
        // Track Gus at ~45% of frame width with a little lag; lead room in the direction he's moving.
        const cx = Math.max(-2.6, xAt(lt - 0.08)) + 0.25;
        aim(camera, [cx + 0.3, stairY(cx) + 2.4, 4.6], [cx - 0.55, stairY(cx) + 0.7, -0.4], LENS.interior);
        handheld(camera, lt, 1, 21);
        punch(camera, LENS.interior, lt, [q.land], 0.04);
      },
      pins(lt) {
        q.bounces.forEach((t0, i) => { const xx = xAt(t0); comic(camera, v3(xx, stairY(xx) + 1.2, -0.2), lt, t0, ['BONK', 'OOF', 'BONK', 'OW'][i % 4], { dur: 0.35, size: 44, rot: (i % 2 ? 10 : -10), color: '#fff' }); });
        money(camera, v3(-3.8, 1.4, -0.4), lt, q.paid, '+$100 MO', COL.mo);
      },
      hud(lt) { return chatStack(lt, CHAT('tumble')); },
    };
  },
};

// ---------------- montage
const S_TUB = {
  name: 'tub', dur: DUR.tub,
  build(R) {
    const q = Q.tub;
    const CAM = [2.6, 2.3, 7.8];
    const ctx = indoor(R, [CAM, [0, 0.8, 1.4]]);
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
        const stop = q.bonk;
        const u = Math.min(lt, stop) / stop;
        const front = lerp(3.0, 0.15, u) + spring(lt, stop, { amp: 0.06, freq: 4.5, damp: 0.3 });
        tubG.position.set(0, 0.35, front + 1.36);
        tubG.rotation.x = spring(lt, stop, { amp: -0.05, freq: 3, damp: 0.3 });
        overlap(kev, lt, (tt) => {
          neutral(kev);
          kev.position.set(0, tt < stop ? walk(kev, tt * 12, 0.6) : 0, front - 0.55);
          arm(kev, 'L', 1.25, 0.35); arm(kev, 'R', 1.25, 0.35);
          if (tt > stop) { eyes(kev, 0.9); mouth(kev, 0.5); P(kev).head.rotation.x = -0.15; }
        });
        if (lt > stop - 0.1 && lt < stop + 0.25) glance(kev, v3(0.6, 1.0, 0.1), 1);
        hatWobble(kev, lt, stop, 0.35);
        neutral(you);
        if (lt < q.fall) {
          overlap(you, lt, (tt) => {
            neutral(you);
            you.position.set(0, tt < stop ? walk(you, tt * 12, 0.6) : 0, front + 2.72 + 0.6);
            you.rotation.set(0, Math.PI, 0);
            arm(you, 'L', 1.3, 0.4); arm(you, 'R', 1.3, 0.4);
            P(you).torso.rotation.x = 0.3;
          });
          squash(you, impactSquash(lt, stop, 0.3 * str('tub.bonk')));
          hatWobble(you, lt, stop, 0.5);
        } else {
          const a = easeIn(seg(lt, q.fall, q.floor));
          you.position.set(0, 0.15 * a, front + 2.72 + 0.6 + a * 0.6);
          you.rotation.set(-a * 1.45, Math.PI, 0);
          arm(you, 'L', 2.6, 0.9); arm(you, 'R', 2.6, 0.9);
          leg(you, 'L', 0.8 * a); leg(you, 'R', 0.5 * a);
          eyes(you, 1); mouth(you, 0.8);
          squash(you, impactSquash(lt, q.floor, 0.3 * str('tub.floor')));
          hatWobble(you, lt, q.floor, 0.5);
        }
        aim(camera, CAM, [0, 0.8, 1.4], LENS.interior);
        handheld(camera, lt, 1, 48);
        punch(camera, LENS.interior, lt, [q.bonk], 0.05);
      },
      pins(lt) { comic(camera, v3(0.9, 1.9, 0.6), lt, q.bonk, 'CLONK!', { dur: 0.7, size: 70 }); comic(camera, v3(0.4, 1.6, 4.4), lt, q.floor, 'OOF', { dur: 0.4, size: 44, color: '#fff', rot: 10 }); },
      hud(lt) { return chatStack(lt, CHAT('tub')); },
    };
  },
};

const S_WALL = {
  name: 'wall', dur: DUR.wall,
  build(R) {
    const q = Q.wall;
    const CAM = [-10.2, 2.4, 11.5];
    const ctx = street(R, [CAM, [-15, 1.0, 7.2]]);
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
    const puff = new Puff(scene, [-15, 0.05, 7.8], { t0: q.whump, count: 16, size: 0.28, spread: 3.0, rise: 0.25, life: 0.9 });
    const wallTop = v3(-15, 3.2, 6.2);
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        // creak sway (anticipation) → accelerate (easeIn) → land → sprung settle (follow-through)
        const sway = lt < q.tip ? Math.sin(lt * 18) * 0.025 * seg(lt, q.creak, q.tip) : 0;
        const f = easeIn(seg(lt, q.tip, q.whump));
        hinge.rotation.x = f * Math.PI / 2 + sway + spring(lt, q.whump, { amp: -0.02, freq: 5, damp: 0.35 });
        neutral(mo);
        mo.position.set(-15, 0, 6.2 + 1.65);
        face(mo, -11.5, 12);
        if (lt < q.whump) {
          arm(mo, 'R', 2.4, 0.3);
          if (lt > q.creak) glance(mo, wallTop, 1);
        } else {
          eyes(mo, lt > q.blink && lt < q.blink + 0.1 ? -0.8 : 0.7);
          arm(mo, 'R', 0.2 + spring(lt, q.whump, { amp: 0.6, freq: 2.2, damp: 0.22 }), 0.2);
        }
        squash(mo, impactSquash(lt, q.whump, 0.1));
        hatWobble(mo, lt, q.whump, 0.6);
        puff.update(lt);
        aim(camera, CAM, [-15, 1.0, 7.2], LENS.street);
        handheld(camera, lt, 1, 28);
        punch(camera, LENS.street, lt, [q.whump], 0.05);
      },
      pins(lt) { comic(camera, v3(-13.5, 1.6, 8.0), lt, q.whump, 'WHUMP', { dur: 0.6, size: 60, color: '#fff' }); },
      hud() { return ''; },
    };
  },
};

const S_BLOWER = {
  name: 'blower', dur: DUR.blower,
  build(R) {
    const q = Q.blower;
    const CAM = [1.6, 2.2, 9.2];
    const ctx = street(R, [CAM, [-3.9, 1.3, 2.0]]);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    const you = bean('you');
    scene.add(gus, you);
    const lb = attachToHand(gus, 'R', leafBlower());
    lb.rotation.x = Math.PI / 2;
    const leaves = new Burst(scene, { count: 80, geo: GEO.leaf, material: MAT.leaf, origin: [-1.15, 0.95, 3.75], dir: [-0.45, 0.12, -1], spread: 0.3, speed: [6, 10], gravity: -2, emit: [q.blow, DUR.blower - 0.3], life: [0.5, 0.9], size: [1, 1.6], floor: 0.02, spin: 14 });
    const porch = [-2.2, 0.3, 1.7];
    const hedge = [-6.6, 0.9, 1.2];
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        neutral(gus);
        gus.position.set(-0.6, 0, 4.7);
        face(gus, -2.2, 1.7);
        arm(gus, 'R', 1.5, 0.0); arm(gus, 'L', 1.2, -0.3);
        mouth(gus, 0.6 + Math.sin(lt * 25) * 0.3);
        P(gus).torso.rotation.x = -0.15 + spring(lt, q.blow, { amp: -0.2, freq: 2.2, damp: 0.3 });
        gus.position.x += Math.sin(lt * 50) * 0.02;
        neutral(you);
        if (lt < q.launch) {
          // anticipation: braced lean into the wind, eyes on Gus
          const brace = anticipate(lt, q.launch, q.launch - q.blow);
          you.position.set(...porch);
          you.rotation.y = 0;
          P(you).torso.rotation.x = 0.35 * brace;
          arm(you, 'L', 0.3 + brace, 0.6); arm(you, 'R', 0.3 + brace, 0.6);
          eyes(you, seg(lt, 0, 0.3));
          glance(you, gus.position.clone().setY(1.4), 1);
          squash(you, 0.15 * brace);
        } else if (lt < q.plomf) {
          const a = seg(lt, q.launch, q.plomf);
          you.position.set(...arcPoint(porch, hedge, a, 1.6));
          you.rotation.set(-a * 2.5, 0, a * 3);
          flail(you, lt, 1);
          eyes(you, 1); mouth(you, 1);
          squash(you, -0.22 * Math.sin(Math.PI * a));
        } else {
          you.position.set(...hedge);
          you.rotation.set(Math.PI, 0, 0.3);
          ragdollPose(you);
          squash(you, impactSquash(lt, q.plomf, 0.3 * str('blower.plomf')));
          hatWobble(you, lt, q.plomf, 0.6);
        }
        leaves.update(lt);
        aim(camera, CAM, [-3.9, 1.3, 2.0], LENS.street);
        handheld(camera, lt, 1, 9);
        punch(camera, LENS.street, lt, [q.launch], 0.035);
      },
      pins(lt) { comic(camera, v3(-1.0, 2.3, 3.4), lt, q.blow, 'FWOOOSH', { dur: 1.2, size: 54, color: '#ffd23f', rot: -4 }); comic(camera, v3(-6.6, 2.0, 1.2), lt, q.plomf, 'PLOMF', { dur: 0.35, size: 44, color: '#fff' }); },
      hud() { return ''; },
    };
  },
};

const S_POTTY = {
  name: 'potty', dur: DUR.potty,
  build(R) {
    const q = Q.potty;
    const CAM = [19.2, 2.0, 1.6];
    const ctx = street(R, [CAM, [13.2, 1.0, -1.2]]);
    const { scene, camera, refs } = ctx;
    const { inner, door } = refs.pp.userData;
    const puff = new Puff(scene, [13.1, 0.05, -0.1], { t0: q.crunch, count: 14, size: 0.28, spread: 2.6, rise: 0.25, life: 0.9 });
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const wob = lt < q.tip ? Math.sin(lt * 40) * 0.05 * (0.5 + seg(lt, q.wobble, q.tip)) : 0;
        const f = easeIn(seg(lt, q.tip, q.crunch));
        inner.rotation.x = f * (Math.PI / 2 - 0.02) + wob + spring(lt, q.crunch, { amp: -0.04, freq: 4, damp: 0.35 });
        door.rotation.y = -1.4 * easeOut(seg(lt, q.door, q.door + 0.2)) + spring(lt, q.door + 0.2, { amp: 0.25, freq: 2.2, damp: 0.22 });
        puff.update(lt);
        aim(camera, CAM, [13.2, 1.0, -1.2], LENS.street);
        handheld(camera, lt, 1, 25);
        punch(camera, LENS.street, lt, [q.crunch], 0.05);
      },
      pins(lt) { comic(camera, v3(13.0, 1.7, 0.4), lt, q.crunch, 'CRUNCH', { dur: 0.6, size: 60, color: '#fff' }); },
      hud(lt) { return chatStack(lt, CHAT('potty')); },
    };
  },
};

const S_GOLD = {
  name: 'gold', dur: DUR.gold,
  build(R) {
    const q = Q.gold;
    const CAM = [0.9, 2.7, 2.6];
    const ctx = indoor(R, [CAM, [1.9, 0.7, -2.9]]);
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
    const coins = coinBurst(scene, [2.0, 0.8, -3.0], { emit: [q.pow, q.pow + 0.07], count: 30, speed: [3, 5] });
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        gm.quaternion.copy(camera.quaternion);
        gm.position.y = 2.0 + Math.sin(lt * 5) * 0.08;
        Object.entries(beans).forEach(([k, w], i) => {
          const s = crew[k];
          const posAt = (tt) => {
            const u = seg(tt, q.run, q.pow);
            const e = u < 0.75 ? u / 0.75 * 0.8 : 0.8 + (u - 0.75) / 0.25 * 0.2;
            return [lerp(s[0], target[0] + (i % 2 ? 0.4 : -0.4), e), lerp(s[1], target[1] + (i < 2 ? 0.4 : -0.3), e)];
          };
          if (lt < q.dive) {
            overlap(w, lt, (tt) => {
              neutral(w);
              const [x, z] = posAt(tt);
              w.position.set(x, walk(w, tt * 15 + i, 1.0), z);
              face(w, target[0], target[1]);
              P(w).torso.rotation.x = 0.35;
              mouth(w, 0.6); eyes(w, 0.5);
            });
            squash(w, 0.18 * anticipate(lt, q.dive, 0.12));
          } else if (lt < q.pow) {
            neutral(w);
            const d = seg(lt, q.dive, q.pow);
            const [x, z] = posAt(lt);
            w.position.set(x, 0.4 + Math.sin(d * Math.PI) * 0.7, z);
            face(w, target[0], target[1]);
            w.rotation.x = d * 1.3;
            arm(w, 'L', 2.9, 0.3); arm(w, 'R', 2.9, 0.3);
            leg(w, 'L', -0.6); leg(w, 'R', -0.6);
            mouth(w, 1); eyes(w, 1);
            squash(w, -0.25);
          } else {
            neutral(w);
            w.position.set(target[0] + [-0.35, 0.35, -0.2, 0.3][i], 0.2 + i * 0.28, target[1] + [0.3, 0.1, -0.2, -0.35][i]);
            face(w, target[0], target[1]);
            w.rotation.set(Math.PI / 2 - 0.2, w.rotation.y + i, 0);
            ragdollPose(w);
            eyes(w, 1);
            squash(w, impactSquash(lt, q.pow + i * 0.02, 0.3));
            hatWobble(w, lt, q.pow + i * 0.02, 0.6);
          }
        });
        coins.update(lt);
        aim(camera, CAM, [1.9, 0.7, -2.9], LENS.wide);
        handheld(camera, lt, 1, 29);
        punch(camera, LENS.wide, lt, [q.pow], 0.06);
      },
      pins(lt) {
        if (lt < q.pow) { const el = pin(camera, v3(2.0, 3.5, -4.0), '★ GOLDEN JOB · $$$ ×3', { cls: 'tr-money' }); el.style.color = '#ffd23f'; el.style.fontSize = '34px'; el.style.transform = `translate(-50%,-50%) scale(${1 + Math.sin(lt * 10) * 0.05})`; }
        comic(camera, v3(2.0, 2.0, -2.6), lt, q.pow, 'POW!', { dur: 0.5, size: 90, color: '#ff4d5e' });
      },
      hud(lt) { return chatStack(lt, CHAT('gold')); },
    };
  },
};

// ---------------- tension + payoff
const S_CAR = {
  name: 'grandma-arrives', dur: DUR['grandma-arrives'],
  build(R) {
    const q = Q['grandma-arrives'];
    const CAM = [-1.2, 1.5, 6.5];
    const ctx = street(R, [CAM, [8, 1.2, 15]]);
    const { scene, camera } = ctx;
    const c = car(0xa070d0);
    scene.add(c);
    const gm = granny(0.5);
    scene.add(gm);
    const path = [[34, 17.2], [14, 17.2], [7.5, 16.4], [5.0, 13.5], [4.7, 10.5]];
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        const u = easeOut(seg(lt, 0, q.park));
        const p = pathAt(path, u);
        const p2 = pathAt(path, Math.min(1, u + 0.02));
        c.position.set(p[0], 0, p[1]);
        if (u < 0.99) c.rotation.y = Math.atan2(-(p2[1] - p[1]), p2[0] - p[0]);
        // suspension follow-through when she brakes
        c.rotation.z = spring(lt, q.park, { amp: -0.03, freq: 2.5, damp: 0.3 });
        c.updateMatrixWorld(true);
        gm.position.copy(v3(-0.1, 0.35, -0.4).applyMatrix4(c.matrixWorld));
        gm.rotation.y = c.rotation.y + Math.PI / 2;
        for (const w of c.userData.wheels) w.rotation.z = -lt * 12 * (1 - u);
        aim(camera, CAM, [8, 1.2, 15], LENS.street);
        handheld(camera, lt, 1, 95);
      },
      hud(lt) {
        const sec = lt < 0.7 ? 3 : lt < 1.4 ? 2 : 1;
        return houseBar(99, `0:0${sec}`, { warn: true }) + chatStack(lt, CHAT('grandma-arrives'));
      },
      css(lt) { return `saturate(1.05) brightness(${1 - Math.abs(Math.sin(lt * 6)) * 0.06})`; },
    };
  },
};

const S_OOPS = {
  name: 'oops', dur: DUR.oops,
  build(R) {
    const q = Q.oops;
    const CAM = [2.4, 1.45, -1.0];
    const ctx = bathroom(R, {}, [CAM, [0.4, 1.1, -3.6]]);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    scene.add(gus);
    const turnEnd = q.turn + 0.4;
    return {
      scene, camera, fx: FX_IN,
      update(lt) {
        neutral(gus);
        gus.position.set(0.75, 0, -3.45);
        face(gus, -0.25, -4.2);
        P(gus).torso.rotation.x = 0.35;
        arm(gus, 'L', 1.4, -0.2); arm(gus, 'R', 1.4, -0.2);
        // anticipation: tiny dip the other way, then the owl turn, then the hat keeps going and settles
        const dip = lt < q.turn ? -0.15 * anticipate(lt, q.turn, 0.15) : 0;
        const turn = easeInOut(seg(lt, q.turn, turnEnd));
        P(gus).head.rotation.y = dip + lerp(0, 2.75, turn);
        P(gus).head.rotation.x = -0.1 * turn;
        if (gus.userData.hat) gus.userData.hat.rotation.y = spring(lt, turnEnd, { amp: 0.25, freq: 2.2, damp: 0.22 });
        eyes(gus, turn * 0.8);
        if (lt > turnEnd - 0.1) glance(gus, camera.position, 1);
        mouth(gus, talking('oops', 'gus', lt) ? 0.25 : 0);
        alive(gus, lt, 0.35);
        aim(camera, CAM, [0.4, 1.1, -3.6], LENS.close);
        handheld(camera, lt, 1, 63);
      },
      hud(lt) { return houseBar(99, '0:01', { warn: true }) + chatStack(lt, CHAT('oops')); },
    };
  },
};

const S_DOORBELL = {
  name: 'doorbell', dur: DUR.doorbell,
  build(R) {
    const q = Q.doorbell;
    const CAM = [-1.4, 1.5, 5.6];
    const ctx = street(R, [CAM, [-2.2, 1.35, 0.6]]);
    const { scene, camera } = ctx;
    const gm = granny();
    scene.add(gm);
    return {
      scene, camera, fx: FX_OUT,
      update(lt) {
        neutral(gm);
        gm.position.set(-2.2, 0.3, 2.0);
        gm.rotation.y = Math.PI;
        gm.userData.parts.armR.rotation.x = -1.4 * easeOut(seg(lt, q.press, q.ding - 0.05)) + spring(lt, q.ding - 0.05, { amp: 0.1, freq: 4, damp: 0.4 });
        aim(camera, CAM, [-2.2, 1.35, 0.6], LENS.close);
        handheld(camera, lt, 1, 64);
      },
      pins(lt) {
        comic(camera, v3(-2.9, 2.2, 0.6), lt, q.ding, 'DING', { dur: 1.2, size: 70, color: '#fff', rot: -8 });
        comic(camera, v3(-1.5, 1.7, 0.6), lt, q.dong, 'DONG', { dur: 0.85, size: 70, color: '#fff', rot: 8 });
      },
      hud() { return houseBar(99, '0:00', { warn: true }); },
    };
  },
};

const S_PAYOFF = { name: 'payoff', dur: DUR.payoff, build: (R) => panicShot(R, { payoff: true }) };

const S_PAYDAY = {
  name: 'payday', dur: DUR.payday,
  build(R) {
    const q = Q.payday;
    const CAM = [-0.4, 2.6, 13.5];
    const ctx = street(R, [CAM, [-0.2, 2.0, 5]]);
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
    (kev.userData.hat || kev.userData.parts.head).add(crown);
    const dunce = mesh(new THREE.ConeGeometry(0.42, 1.3, 20), mat(0xf4f0e8, { roughness: 0.8 }));
    dunce.position.y = 1.0;
    dunce.rotation.z = 0.15;
    gus.userData.parts.head.add(addOutlines(dunce, 0.01));
    const conf = new Burst(scene, { count: 220, geo: GEO.confetti, material: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), origin: [-1, 7, 6], originJitter: 5, dir: [0, -1, 0], spread: 0.4, speed: [0.5, 1.5], gravity: -1.6, emit: [q.horn, 2.5], life: [2, 3], size: [1, 1.4], floor: 0.02, spin: 8 });
    const cols = [0xff4d5e, 0xffd23f, 0x4f8dff, 0x3ccf7a, 0xa65cff, 0xffffff];
    for (let i = 0; i < 220; i++) conf.mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    const HOP = 0.45;
    return {
      scene, camera, fx: { ...FX_OUT, dof: { focus: 7.5, aperture: 0.0018, maxblur: 0.006 } },
      update(lt) {
        for (const w of [kev, you, mo, gus]) neutral(w);
        // Kev's victory hops: stretch on the way up, squash on each landing, hat follows through.
        const ph = (lt % HOP) / HOP;
        const lastLand = Math.floor(lt / HOP) * HOP;
        kev.position.set(-1, yK + 4 * 0.18 * ph * (1 - ph), 6);
        squash(kev, ph < 0.15 ? impactSquash(lt, lastLand, 0.2) : -0.12 * Math.sin(Math.PI * ph));
        hatWobble(kev, lt, lastLand, 0.15, 3, 0.4);
        arm(kev, 'L', 2.9 - Math.sin(ph * Math.PI) * 0.3, 0.4); arm(kev, 'R', 2.9 - Math.sin(ph * Math.PI) * 0.3, 0.4); mouth(kev, 0.7);
        you.position.set(-3.2, yY, 6);
        laugh(you, lt, gus.position, 1);
        mo.position.set(1.2, yM, 6);
        if (lt < 1.2) { arm(mo, 'L', 2.6, 0.5); arm(mo, 'R', 2.6, 0.5); mouth(mo, 0.6); alive(mo, lt, 0.6); }
        else laugh(mo, lt + 0.3, gus.position, 1);
        overlap(gus, lt, (tt) => {
          neutral(gus);
          gus.position.set(1.7 + tt * 0.25, 0, 9.0);
          face(gus, 8, 12);
          P(gus).head.rotation.x = 0.35;
          gus.position.y = walk(gus, tt * 5, 0.3) * 0.4;
          if (talking('payday', 'gus', tt)) { headLook(gus, kev.position, 0.6); mouth(gus, 0.2 + Math.abs(Math.sin(tt * 14)) * 0.3); arm(gus, 'R', 0.8, 0.6); }
        });
        conf.update(lt);
        aim(camera, CAM, [-0.2, 2.0, 5], LENS.street);
        handheld(camera, lt, 1, 88);
      },
      post(lt, composer) {
        if (composer.bokeh) composer.bokeh.uniforms.focus.value = camera.position.distanceTo(kev.position);
      },
      pins(lt) {
        const el = pin(camera, v3(gus.position.x, 2.5, gus.position.z), 'last place 🙃', { cls: 'tr-tag' });
        el.style.setProperty('--c', COL.gus);
      },
      hud(lt) {
        return wallets({ kev: 5240, you: 4410, mo: 3980, gus: 610 }, 'kev') + card(lt, q.card, DUR.payday - 0.05, '3 HOUSES.<br>1 WINNER.', { pos: 'tl', size: 84, accent: '#ffd23f' }) + chatStack(lt, CHAT('payday'));
      },
    };
  },
};

// Logo built from per-letter spans; `fallT0` makes BUDGET's letters drop one by one (button gag).
function logoHtml(lt = 0, fallT0 = Infinity) {
  const letters = (txt, base, falls) => [...txt].map((ch, i) => {
    const k = base + i;
    const d = lt - fallT0 - (falls ? (5 - i) * 0.06 : 0);
    let tr = '';
    if (falls && d > 0) {
      const dir = k % 2 ? 1 : -1;
      tr = `transform:translate(${dir * d * 70}px, ${0.5 * 2400 * d * d - Math.min(d, 0.08) * 300}px) rotate(${dir * (25 + k * 11) * d * 4}deg)`;
    } else if (!falls && lt > fallT0) {
      tr = `transform:rotate(${spring(lt, fallT0 + 0.1, { amp: (k % 2 ? 1 : -1) * 9, freq: 2.2, damp: 0.22 })}deg) translateY(${Math.min(1, (lt - fallT0) * 6) * 10}px)`;
    }
    return `<span class="ch" style="${tr}">${ch}</span>`;
  }).join('');
  return `<div class="logo">${letters('OVER', 10, false)}<br><span>${letters('BUDGET', 0, true)}</span></div>`;
}
const titleCard = (sc, op, lt, fallT0) => `<div class="tr-title" style="transform:translate(-50%,-50%) rotate(-4deg) scale(${sc});opacity:${op}">${logoHtml(lt, fallT0)}<div class="inv">INVOICE #0001 · PAST DUE</div></div>`;
const badgesHtml = (style, steamScale) => `<div class="tr-badges"><div class="b" style="${style(0)}">1–4 PLAYERS</div><div class="b" style="${style(1)}">ONLINE CO-OP</div><div class="b" style="${style(2)}">PROXIMITY CHAT</div>
  <div class="steam" style="${style(3)};transform:scale(${steamScale})">WISHLIST ON STEAM</div></div>`;
const TITLE_END = { pos: [3, 4.0, 20], look: [-0.5, 4.5, -2] };

const S_TITLE = {
  name: 'title', dur: DUR.title,
  build(R) {
    const q = Q.title;
    const ctx = street(R, [[6, 2.2, 24], [-0.5, 3.5, -2]]);
    const { scene, camera } = ctx;
    const D = DUR.title;
    return {
      scene, camera, fx: { ...FX_OUT, grade: { ...GRADE, vig: 0.55, sat: 1.1 }, dof: { focus: 6, aperture: 0.0035, maxblur: 0.01 } },
      update(lt) {
        const u = easeInOut(lt / D);
        aim(camera, [lerp(6, TITLE_END.pos[0], u), lerp(2.2, TITLE_END.pos[1], u), lerp(24, TITLE_END.pos[2], u)], [-0.5, lerp(3.5, TITLE_END.look[1], u), -2], LENS.street);
        handheld(camera, lt, 1, 62);
        punch(camera, LENS.street, lt, [q.slamLand], 0.05, 0.5);
      },
      post(lt, composer) { if (composer.bokeh) composer.bokeh.uniforms.focus.value = 6; },
      hud(lt) {
        const u = seg(lt, q.slam, q.slamLand);
        const settle = 1 + Math.max(-0.04, spring(lt, q.slamLand, { amp: 0.08, freq: 3.5, damp: 0.35 }));
        const sc = lerp(2.6, 1, easeIn(u)) * (lt > q.slamLand ? settle : 1);
        let h = `<div class="tr-dim" style="background:radial-gradient(ellipse at 50% 45%, rgba(10,6,14,.15), rgba(10,6,14,.7))"></div>`;
        if (lt > q.slam) h += titleCard(sc, Math.min(1, u * 3), lt, Infinity);
        h += flash(lt > q.slamLand && lt < q.slamLand + 0.22 ? 0.5 * (1 - seg(lt, q.slamLand, q.slamLand + 0.22)) : 0);
        if (lt > q.tagline) h += `<div class="tr-tagline" style="opacity:${seg(lt, q.tagline, q.tagline + 0.3)};transform:translateX(-50%) translateY(${(1 - easeOut(seg(lt, q.tagline, q.tagline + 0.3))) * 16}px)">fix stuff. get paid. blame gus.</div>`;
        if (lt > q.badges) {
          const b = (i) => `opacity:${seg(lt, q.badges + i * 0.12, q.badges + 0.25 + i * 0.12)};transform:translateY(${(1 - easeOut(seg(lt, q.badges + i * 0.12, q.badges + 0.25 + i * 0.12))) * 14}px)`;
          h += badgesHtml(b, 0.8 + easeBack(seg(lt, q.steam, q.steam + 0.3)) * 0.2);
        }
        return h;
      },
    };
  },
};

// The button: after the logo lands, Gus sneaks into frame and wrecks it.
const S_BUTTON = {
  name: 'button', dur: DUR.button,
  build(R) {
    const q = Q.button;
    const ctx = street(R, [TITLE_END.pos, TITLE_END.look]);
    const { scene, camera } = ctx;
    const gus = bean('gus');
    scene.add(gus);
    const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    return {
      scene, camera, fx: { ...FX_OUT, grade: { ...GRADE, vig: 0.55, sat: 1.1 }, dof: { focus: 3.3, aperture: 0.0035, maxblur: 0.01 } },
      update(lt) {
        aim(camera, TITLE_END.pos, TITLE_END.look, LENS.street);
        handheld(camera, lt, 0.6, 41);
        punch(camera, LENS.street, lt, [q.wreck], 0.04);
        camera.updateMatrixWorld(true);
        neutral(gus);
        // sneak in from the right edge (tiptoe), reach toward the logo, then turn and grin at camera
        const inU = easeOut(seg(lt, q.gusEnter, q.hold));
        const local = v3(lerp(2.6, 0.95, inU), -1.6 + Math.abs(Math.sin(lt * 7)) * 0.04 * (1 - seg(lt, q.hold - 0.1, q.hold)), -3.3);
        gus.position.copy(camera.localToWorld(local));
        gus.quaternion.copy(camera.quaternion).multiply(flip);
        gus.rotation.x = 0;
        gus.rotation.z = 0;
        if (lt < q.hold) {
          leg(gus, 'L', Math.max(0, Math.sin(lt * 7)) * 1.0);
          leg(gus, 'R', Math.max(0, -Math.sin(lt * 7)) * 1.0);
          arm(gus, 'L', 1.5, 0.1); arm(gus, 'R', 1.5, 0.1);
        } else if (lt < q.wreck) {
          const rub = Math.sin(lt * 26) * 0.15;
          arm(gus, 'L', 2.2 + rub, 0.2); arm(gus, 'R', 2.2 - rub, 0.2);
          squash(gus, 0.12 * anticipate(lt, q.wreck, q.wreck - q.hold));
          alive(gus, lt, 0.4);
        } else {
          const turn = easeInOut(seg(lt, q.wreck + 0.25, q.wreck + 0.6));
          P(gus).head.rotation.y = lerp(0, Math.PI * 0.92, turn);
          if (gus.userData.hat) gus.userData.hat.rotation.y = spring(lt, q.wreck + 0.6, { amp: 0.25, freq: 2.2, damp: 0.22 });
          arm(gus, 'L', lerp(2.2, 2.9, turn), 0.5); arm(gus, 'R', lerp(2.2, 2.9, turn), 0.5);
          mouth(gus, 0.6 * turn);
          squash(gus, takeoffStretch(lt, q.wreck, 0.15, 0.2));
          hatWobble(gus, lt, q.wreck, 0.3);
        }
      },
      post(lt, composer) { if (composer.bokeh) composer.bokeh.uniforms.focus.value = 3.3; },
      hud(lt) {
        let h = `<div class="tr-dim" style="background:radial-gradient(ellipse at 50% 45%, rgba(10,6,14,.15), rgba(10,6,14,.7))"></div>`;
        h += titleCard(1, 1, lt, q.wreck);
        h += `<div class="tr-tagline">fix stuff. get paid. blame gus.</div>`;
        h += badgesHtml(() => '', 1 + spring(lt, q.wreck + 0.2, { amp: 0.06, freq: 3, damp: 0.3 }));
        if (lt > q.hold && lt < q.wreck) {
          const pct = seg(lt, q.hold, q.wreck - 0.04);
          h += `<div class="tr-ring" style="left:640px;top:250px">${ringHtml(pct, COL.gus, 'F')}<div class="tr-prompt"><span class="k">F</span>HOLD · WRECK IT 😈</div></div>`;
        }
        h += flash(lt > q.wreck && lt < q.wreck + 0.18 ? 0.45 * (1 - seg(lt, q.wreck, q.wreck + 0.18)) : 0);
        h += chatStack(lt, CHAT('button'));
        h += flash(lt > q.fadeOut ? seg(lt, q.fadeOut, DUR.button) : 0, '#000');
        return h;
      },
    };
  },
};

export const SCENES = [
  S_COLD, S_ARRIVE, S_JOB, S_FPFIX, S_DRYWALL, S_HAMMER, S_SABOTAGE, S_SLAP, S_TUMBLE,
  S_TUB, S_WALL, S_BLOWER, S_POTTY, S_GOLD,
  S_CAR, S_OOPS, S_DOORBELL, S_PAYOFF, S_PAYDAY, S_TITLE, S_BUTTON,
];

// sanity: scene order/durations must match cues.json (audio reads the same file)
CUES.scenes.forEach((c, i) => { if (SCENES[i].name !== c.name) throw new Error(`cues.json order mismatch at ${i}: ${c.name} vs ${SCENES[i].name}`); });

// cards that span several montage cuts (absolute trailer time); times come from cues.json "cards"
export function globalHud(t, starts) {
  const m0 = starts[SCENES.indexOf(S_TUB)];
  const m1 = starts[SCENES.indexOf(S_BLOWER)];
  const lt = t - m0;
  const c1 = CUES.cards.find((c) => c.scene === 'tub').abs;
  const c2 = CUES.cards.find((c) => c.scene === 'blower').abs + (m1 - m0);
  return card(lt, c1, c2 - 0.15, '1–4 PLAYERS', { pos: 'bl', size: 88, accent: '#4f8dff' }) +
    card(lt, c2, starts[SCENES.indexOf(S_GOLD)] + DUR.gold - m0 - 0.05, 'PROXIMITY<br>VOICE CHAT', { pos: 'bl', size: 80, accent: '#3ccf7a' });
}
