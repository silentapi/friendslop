// Look-dev style frames: each is a 1 s "shot" rendered at its midpoint.
import { THREE, PAL, CSS, setup, aimSun } from '../engine/render.js';
import { aim, handheld } from '../engine/anim.js';
import * as A from '../engine/ant.js';
import * as Wd from '../engine/world.js';
import * as UI from '../engine/ui.js';
import { lawn, chamber } from '../engine/sets.js';

const CREW = ['pip', 'dot', 'bean', 'moss'];

function crewRow(ctx, xs, z = 0) {
  return CREW.map((w, i) => { const a = A.ant(w); a.position.set(xs[i], 0, z); ctx.scene.add(a); return a; });
}

export const SHOTS = [
  {
    name: 'lineup', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [-0.5, 0.28, -0.8] });
      lawn(ctx, { clear: [{ x: 0, z: 0, r: 4.5 }], cam: [0, 6.6, 0, 0] });
      const crew = crewRow(ctx, [-1.8, -0.6, 0.6, 1.8], 0);
      aimSun(ctx, [0, 0, 0]);
      Wd.bokehOrbs(ctx, [0, 4, -22], [30, 8, 4]);
      const poses = [
        (a, t) => { A.arm(a, 'R', 2.6, 0.5, 0.3); A.mouth(a, 0.4, 0.8); a.rotation.y = 0.15; }, // pip waves, confident
        (a, t) => { A.arm(a, 'L', 1.2, 0.2, 1.6); A.arm(a, 'R', 0.6, 0.3, 1.4); a.rotation.y = 0.05; A.look(a, 0.6, 0.2); }, // dot thinking
        (a, t) => { A.arm(a, 'L', 2.9, 0.9, 0.1); A.arm(a, 'R', 2.9, 0.9, 0.1); A.mouth(a, 0.9, 0.6); A.eyesWide(a, 0.6); a.position.y = 0.25; }, // bean jumping
        (a, t) => { A.arm(a, 'L', 0.9, 0.1, 1.9); A.arm(a, 'R', 0.9, 0.1, 1.9); A.mouth(a, 0.15, -0.3); A.look(a, -0.7, 0); a.rotation.y = -0.2; }, // moss nervous
      ];
      return {
        ctx, fx: { dof: { focus: 7, aperture: 0.01, maxblur: 0.01 } },
        update(lt) {
          crew.forEach((a, i) => { A.neutral(a); A.alive(a, lt + i, 1); poses[i](a, lt); A.antennae(a, lt + i * 0.7, [[0, 0.3]]); });
          aim(ctx.camera, [0, 1.05, 6.6], [0, 0.75, 0], 32);
        },
        post(lt, c) { c.focusOn([0, 0.7, 0]); },
        hud: (lt) => crew.map((a) => UI.nameTag(ctx.camera, a, 0.5, 0, 1, 1.75)).join('') + '<div class="label">LOOKDEV · CREW</div>',
      };
    },
  },
  {
    name: 'lawn', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [-0.2, 0.2, -0.95] });
      lawn(ctx, { clear: [{ x: 0, z: 0, r: 6 }, { x: 2, z: -12, r: 5 }], near: { center: [-4, 7], size: [3, 2], count: 18 }, cam: [1.2, 7.5, 1, -4] });
      const hill = Wd.anthill();
      hill.position.set(-1.2, 0, -1.5);
      ctx.scene.add(hill);
      const dn = Wd.donut(1.4);
      dn.position.set(3, 0, -13);
      ctx.scene.add(dn);
      const d1 = Wd.dandelion({ height: 11 });
      d1.position.set(5.5, 0, -5);
      const d2 = Wd.dandelion({ height: 8, puff: false });
      d2.position.set(-7, 0, -7);
      const cl = Wd.clover(0.9);
      cl.position.set(-5, 0, -2);
      ctx.scene.add(d1, d2, cl);
      const crew = crewRow(ctx, [0.6, 1.5, -0.2, 2.3], 2.2);
      crew.forEach((a, i) => { a.rotation.y = Math.PI + 0.3 - i * 0.2; });
      aimSun(ctx, [0, 0, -3]);
      Wd.bokehOrbs(ctx, [0, 5, -40], [50, 12, 6]);
      return {
        ctx, fx: { dof: { focus: 9, aperture: 0.006, maxblur: 0.01 } },
        update(lt) {
          crew.forEach((a, i) => { A.neutral(a); A.alive(a, lt + i); A.antennae(a, lt + i); if (i === 2) { A.arm(a, 'R', 2.2, 0.2, 0); } });
          aim(ctx.camera, [1.2, 1.5, 7.5], [1.0, 1.7, -4], 38);
        },
        post(lt, c) { c.focusOn([1, 0.6, 2.2]); },
        hud: () => '<div class="label">LOOKDEV · THE LAWN</div>',
      };
    },
  },
  {
    name: 'carry', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [0.5, 0.25, -0.8] });
      lawn(ctx, { clear: [{ x: 0, z: 0, r: 5 }], cam: [1.4, 5.4, 0, 0] });
      const sb = Wd.strawberry(0.75);
      ctx.scene.add(sb);
      const pip = A.ant('pip');
      const moss = A.ant('moss');
      const bean = A.ant('bean');
      ctx.scene.add(pip, moss, bean);
      const pg = Wd.ping(PAL.bean);
      pg.position.set(-3.5, 0, -4);
      ctx.scene.add(pg);
      aimSun(ctx, [0, 0, 0]);
      Wd.bokehOrbs(ctx, [0, 4, -25], [30, 8, 4]);
      return {
        ctx, fx: { dof: { focus: 6, aperture: 0.009, maxblur: 0.01 } },
        update(lt) {
          sb.position.set(0, 1.25, 0);
          sb.rotation.set(0.1, 0.4, 0.06);
          for (const [a, x, ph] of [[pip, -0.62, 0], [moss, 0.62, 2.2]]) {
            A.neutral(a);
            a.position.set(x, 0, 0.1);
            a.rotation.y = 0.35;
            A.walk(a, lt * 9 + ph, 0.9, { arms: false });
            A.carry(a, lt, 0.4);
            A.antennae(a, lt, [[0, 0.4]]);
          }
          A.mouth(pip, 0.5, 0.7);
          A.mouth(moss, 0.2, -0.2);
          A.look(moss, 0.5, 0.6);
          A.neutral(bean);
          bean.position.set(2.4, 0, -1.6);
          bean.rotation.y = -0.6;
          A.alive(bean, lt);
          A.arm(bean, 'R', 2.4, 0.6, 0.2);
          A.mouth(bean, 0.7, 0.8);
          A.antennae(bean, lt, [[0, 0.5]]);
          pg.userData.update(0.6);
          aim(ctx.camera, [1.4, 1.3, 5.4], [0, 1.25, 0], 36);
        },
        post(lt, c) { c.focusOn([0, 1, 0]); },
        hud: (lt) => UI.grabDots(ctx.camera, sb, [{ who: 'pip', t: -1 }, { who: 'moss', t: -1 }], 0.5)
          + UI.chat(0.5, [{ t0: 0, t1: 1, who: 'moss', text: 'okay okay you go backwards' }, { t0: 0.1, t1: 1, who: 'pip', text: 'I AM going backwards' }, { t0: 0.2, t1: 1, who: 'bean', text: 'guys i found a ping', muffled: true }])
          + UI.sunDial(0.35) + '<div class="label">LOOKDEV · CARRY + UI</div>',
      };
    },
  },
  {
    name: 'food', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [-0.4, 0.35, -0.8] });
      lawn(ctx, { clear: [{ x: 0, z: -1, r: 10 }], count: 3000, cam: [0, 11.5, 0, -1] });
      const items = [
        [Wd.crumb(0.4), -6.6, 1.8], [Wd.grape(0.8), -4.8, 0.8], [Wd.strawberry(0.8), -2.4, 0.3], [Wd.cheesePuff(0.7), 0.4, 1.4],
        [Wd.cookie(0.75), 3.0, 0.2], [Wd.chip(0.9), 6.0, 0.6], [Wd.donut(1.0), -3.0, -4.5], [Wd.hotdog(0.9), 3.4, -4.5],
      ];
      for (const [m, x, z] of items) { m.position.set(x, 0, z); m.rotation.y = 0.3; ctx.scene.add(m); }
      const pip = A.ant('pip');
      pip.position.set(-5.6, 0, 2.2);
      pip.rotation.y = -0.3;
      ctx.scene.add(pip);
      aimSun(ctx, [0, 0, -1]);
      return {
        ctx, fx: { dof: { focus: 13, aperture: 0.002, maxblur: 0.006 } },
        update(lt) { A.neutral(pip); A.alive(pip, lt); A.antennae(pip, lt); A.look(pip, 0.8, 0.3); A.arm(pip, 'R', 1.4, 0.2, 0.5); aim(ctx.camera, [0, 5.5, 11.5], [0, 0.6, -1.2], 44); },
        post(lt, c) { c.focusOn([0, 0.5, -0.5]); },
        hud: () => '<div class="label">LOOKDEV · SNACKS (1–4 ANTS)</div>',
      };
    },
  },
  {
    name: 'queen', dur: 1,
    build() {
      const ctx = setup({ light: 'nest', fogNear: 8, fogFar: 40, sky: false });
      chamber(ctx);
      const q = A.queen();
      q.position.set(0, 0, -2.2);
      ctx.scene.add(q);
      const dot = A.ant('dot');
      dot.position.set(2.2, 0, 0.2);
      dot.rotation.y = -1.2;
      const c = Wd.crumb(0.35);
      ctx.scene.add(dot, c);
      return {
        ctx, fx: { dof: { focus: 6, aperture: 0.006, maxblur: 0.008 }, bloom: 0.6, grade: { warm: 0.06 } },
        update(lt) {
          A.neutral(q);
          A.belly(q, 0.55, 0.3);
          A.alive(q, lt, 0.6);
          A.mouth(q, 0.85, 0.3);
          A.antennae(q, lt, [[0, 0.2]], { perk: 0.4 });
          q.userData.torso.rotation.x = -0.25;
          A.arm(q, 'L', 0.8, 0.5, 1.2);
          A.arm(q, 'R', 0.8, 0.5, 1.2);
          A.neutral(dot);
          A.alive(dot, lt);
          A.arm(dot, 'R', 2.0, 0.2, 0.2);
          A.mouth(dot, 0.5, 0.8);
          A.antennae(dot, lt);
          c.position.set(1.55, 1.25, 0.15);
          A.headLook(q, dot.position.clone().setY(1), 0.5);
          aim(ctx.camera, [1.6, 1.8, 6.4], [0.4, 1.7, -1.2], 40);
        },
        post(lt, c2) { c2.focusOn([0, 1.6, -1.4]); },
        hud: () => UI.bellyMeter(0.55) + '<div class="label">LOOKDEV · THE QUEEN</div>',
      };
    },
  },
  {
    name: 'sunset', dur: 1,
    build() {
      const ctx = setup({ light: 'sunset', sunDir: [0.1, 0.1, -1] });
      lawn(ctx, { clear: [{ x: 0, z: 0, r: 5 }, { x: 0, z: -8, r: 4 }], cam: [3.2, 5.5, 0, 0] });
      const hd = Wd.hotdog(0.8);
      ctx.scene.add(hd);
      const crew = CREW.map((w) => { const a = A.ant(w); ctx.scene.add(a); return a; });
      aimSun(ctx, [0, 0, 0]);
      Wd.bokehOrbs(ctx, [0, 3, -30], [40, 8, 4], 26, [0xffc48a, 0xff9a6a, 0xffe0b0]);
      return {
        ctx, fx: { dof: { focus: 6, aperture: 0.008, maxblur: 0.01 }, bloom: 0.6 },
        update(lt) {
          hd.position.set(0, 1.25, 0);
          hd.rotation.set(0, 0.25, 0.04);
          const xs = [-1.9, -0.65, 0.65, 1.9];
          crew.forEach((a, i) => {
            A.neutral(a);
            a.position.set(xs[i] * Math.cos(0.25), 0, -xs[i] * Math.sin(0.25) + 0.45);
            a.rotation.y = -0.45;
            A.walk(a, lt * 12 + i * 1.7, 1, { arms: false });
            A.carry(a, lt + i, 0.7);
            A.mouth(a, 0.4 + (i % 2) * 0.4, 0.3);
            A.antennae(a, lt + i, [[0, 0.5]]);
          });
          aim(ctx.camera, [3.2, 0.9, 5.5], [0, 1.2, 0], 38);
          handheld(ctx.camera, lt);
        },
        post(lt, c) { c.focusOn([0, 1, 0]); },
        hud: () => UI.sunDial(0.92) + UI.chat(0.5, [{ t0: 0, t1: 1, who: 'dot', text: 'LEFT' }, { t0: 0.1, t1: 1, who: 'pip', text: 'my left or your left' }]) + '<div class="label">LOOKDEV · SUNSET</div>',
      };
    },
  },
  {
    name: 'title', dur: 1,
    build() {
      const ctx = setup({ light: 'gold', sunDir: [0, 0.18, -1] });
      lawn(ctx, { clear: [{ x: 0, z: 0, r: 4 }], cam: [0, 6, 0, 0] });
      const c = Wd.crumb(0.5);
      ctx.scene.add(c);
      const bean = A.ant('bean');
      bean.position.set(0, 0, 0.8);
      ctx.scene.add(bean);
      Wd.bokehOrbs(ctx, [0, 4, -20], [30, 8, 4]);
      return {
        ctx, fx: { dof: { focus: 6, aperture: 0.012, maxblur: 0.012 } },
        update(lt) {
          A.neutral(bean); A.alive(bean, lt); A.carry(bean, lt, 0.1); A.mouth(bean, 0.5, 1); A.antennae(bean, lt);
          c.position.set(0, 1.3, 0.85);
          aim(ctx.camera, [0, 0.7, 6], [0, 2.2, 0], 40);
        },
        post(lt, c2) { c2.focusOn([0, 1, 0.8]); },
        hud: () => UI.logo(1, 0) + '<div class="tagline">six legs each. still not enough.</div><div class="badges"><span class="b">1–4 PLAYERS</span><span class="b">PROXIMITY VOICE</span><span class="b steam">WISHLIST ON STEAM</span></div>',
      };
    },
  },
];

