// Look-dev v2 (clay, real scale). Each entry is a 1 s still rendered at its midpoint.
import { THREE, PAL, setup, aimSun, clay, mesh } from '../engine/render.js';
import { aim } from '../engine/anim.js';
import * as A from '../engine/ant.js';
import * as Wd from '../engine/world.js';
import * as UI from '../engine/ui.js';
import { lawn, anthill, twig, dryLeaf, hoseOverPuddle, backDoor } from '../engine/sets.js';
import { kitchen, kitchenLight } from '../engine/kitchen.js';
import { mom, momFace, momRecoil, momWalk, M2U } from '../engine/human.js';

const CREW = ['pip', 'dot', 'bean', 'moss'];
const crew = (ctx) => Object.fromEntries(CREW.map((w) => { const a = A.ant(w); ctx.scene.add(a); return [w, a]; }));

export const SHOTS = [
  {
    name: 'trek', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [0.25, 0.22, -1], shadowBox: 50 });
      lawn(ctx, { center: [0, -40], cam: [0, 7, 0, -60], clear: [{ x: 0, z: -12, r: 10 }], pollenAt: [0, 8, -20] });
      const tw = twig(70, 2.4);
      tw.position.set(4, tw.position.y, -22);
      tw.rotation.y = 0.25;
      ctx.scene.add(tw);
      const lf = dryLeaf(34);
      lf.position.set(-14, 0.6, -18);
      lf.rotation.z = 0.8;
      ctx.scene.add(lf);
      const C = crew(ctx);
      aimSun(ctx, [0, 0, -15]);
      const place = { pip: [0, 0, 0, 0], dot: [-3, 0, -6, 0.2], bean: [3.5, 0, -9.5, -0.3], moss: [0.5, 0, -15, 0.1] };
      return {
        ctx, fx: { dof: { focus: 7, aperture: 0.004, maxblur: 0.009 }, bloom: 0.5 },
        update(lt) {
          for (const [w, a] of Object.entries(C)) {
            const [x, y, z, r] = place[w];
            A.neutral(a);
            a.position.set(x, y, z);
            a.rotation.y = Math.PI + r;
            A.walk(a, lt * 8 + a.userData.seed * 1.7, 1);
            A.antennae(a, lt + a.userData.seed);
            A.scarf(a, lt, 1.5);
          }
          aim(ctx.camera, [2.0, 2.6, 4.4], [-0.6, 0.5, -6], 50);
        },
        post(lt, c) { c.focusOn([0, 0.4, 0]); },
        hud: () => UI.chat(0.5, [{ t0: 0, t1: 1, who: 'bean', text: 'how far is the house' }, { t0: 0.1, t1: 1, who: 'moss', text: 'far.' }]) + '<div class="label">LOOKDEV · THIRD-PERSON TREK</div>',
      };
    },
  },
  {
    name: 'counter', dur: 1,
    build() {
      const ctx = setup({ light: 'kitchen', fogNear: 400, fogFar: 3000, sky: false, shadowBox: 140, sunDist: 900 });
      ctx.scene.background = new THREE.Color(0xe0d8cc);
      kitchen(ctx);
      const top = 0.9 * M2U;
      kitchenLight(ctx, [0, top, -60]);
      const dn = Wd.donut(2.6);
      ctx.scene.add(dn);
      const C = crew(ctx);
      const m = mom({ prop: 'mug' });
      m.position.set(30, 0, 120);
      m.rotation.y = Math.PI - 0.15;
      ctx.scene.add(m);
      return {
        ctx, fx: { dof: { focus: 40, aperture: 0.0016, maxblur: 0.012 }, bloom: 0.35, ao: 0.6 },
        update(lt) {
          dn.position.set(0, top + 1.25, -80);
          const R = 4.6;
          CREW.forEach((w, i) => {
            const a = C[w];
            const ang = Math.PI / 4 + i * Math.PI / 2;
            A.neutral(a);
            a.position.set(Math.cos(ang) * R, top, -80 + Math.sin(ang) * R);
            a.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang)) + Math.PI;
            A.carry(a, lt, 0.5);
            A.antennae(a, lt + i, [], { back: 0.2, perk: 0.8 });
            A.headLook(a, new THREE.Vector3(30, 520, 120), 0.6);
          });
          momFace(m, 'alarmed', 1);
          m.userData.neck.rotation.x = 0.4;
          m.userData.head.rotation.y = 0.1;
          m.userData.torso.rotation.x = 0.3;
          aim(ctx.camera, [10, top + 4, -100], [18, top + 85, 60], 72);
        },
        post(lt, c) { c.focusOn([0, top + 1, -82]); },
        hud: () => UI.chat(0.5, [{ t0: 0, t1: 1, who: 'dot', text: "don't. move." }, { t0: 0.1, t1: 1, who: 'pip', text: "she's looking" }]) + '<div class="label">LOOKDEV · COUNTER + MOM</div>',
      };
    },
  },
  {
    name: 'floor', dur: 1,
    build() {
      const ctx = setup({ light: 'kitchen', fogNear: 600, fogFar: 4000, sky: false, shadowBox: 260, sunDist: 1200 });
      ctx.scene.background = new THREE.Color(0xe0d8cc);
      kitchen(ctx);
      kitchenLight(ctx, [0, 0, 160]);
      const m = mom({ prop: 'magazine' });
      m.position.set(0, 0, 120);
      m.rotation.y = 0.35;
      ctx.scene.add(m);
      const pip = A.ant('pip');
      pip.position.set(52, 0, 392);
      ctx.scene.add(pip);
      return {
        ctx, fx: { dof: { focus: 20, aperture: 0.0012, maxblur: 0.01 }, bloom: 0.35, ao: 0.6 },
        update(lt) {
          momFace(m, 'scream', 1);
          momRecoil(m, 0.55);
          A.neutral(pip);
          pip.rotation.y = Math.PI - 0.2;
          A.rear(pip, 0.7);
          A.antennae(pip, lt, [], { perk: 1 });
          A.headLook(pip, new THREE.Vector3(0, 500, 120), 0.8);
          aim(ctx.camera, [70, 6, 420], [0, 230, 120], 56);
        },
        post(lt, c) { c.focusOn([52, 0.5, 392]); },
        hud: () => UI.word(ctx.camera, new THREE.Vector3(-130, 470, 120), 0.3, 0, 'EEEEEK!', { size: 84, rot: -6, dur: 1 }) + '<div class="label">LOOKDEV · THE MOM (FLOOR)</div>',
      };
    },
  },
  {
    name: 'hose', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [-0.7, 0.55, 0.3], shadowBox: 80 });
      lawn(ctx, { center: [0, -30], clear: [{ x: 0, z: 0, r: 70 }], cam: [40, 70, 0, 0], count: 6000 });
      const { curve } = hoseOverPuddle(ctx, { at: [0, 0, 0] });
      const C = crew(ctx);
      aimSun(ctx, [0, 0, 0]);
      return {
        ctx, fx: { dof: { focus: 40, aperture: 0.002, maxblur: 0.008 }, bloom: 0.45 },
        update(lt) {
          CREW.forEach((w, i) => {
            const a = C[w];
            const u = 0.38 + i * 0.045;
            const p = curve.getPointAt(u);
            const tng = curve.getTangentAt(u);
            A.neutral(a);
            a.position.set(p.x, p.y + 4.1, p.z);
            a.rotation.y = Math.atan2(tng.x, tng.z);
            A.walk(a, lt * 7 + i * 1.3, 0.7);
            A.antennae(a, lt + i);
            A.scarf(a, lt, 1);
          });
          A.flail(C.bean, lt, 0.6);
          C.bean.rotation.z = 0.5;
          aim(ctx.camera, [0, 15.5, 16], [-10, 11, 5], 45);
        },
        post(lt, c) { c.focusOn([-9, 12, 6]); },
        hud: () => UI.chat(0.5, [{ t0: 0, t1: 1, who: 'bean', text: 'it is SO slippery' }]) + '<div class="label">LOOKDEV · HOSE BRIDGE</div>',
      };
    },
  },
];
