// Trailer v3, shots 1–9: the hungry Queen → the long trip → the snack.
import { THREE, PAL, clay, mesh, keep, dotTex, setup } from '../engine/render.js';
import { twig, dryLeaf, hoseOverPuddle, backDoor, anthill } from '../engine/sets.js';
import { An, A, Wd, UI, Q, DUR, CREW, TOP, cardHtml, chatHtml, makeCrew, antAt, gait, lawnShot, kitchenShot, Burst, Puff, ripple, shadowBlob, nestChamber, scentTrail, Bk, DONUT_S, frame } from './kit.js';

const { aim, handheld, shake, shakeAmt, seg, easeOut, easeIn, easeInOut, lerp, arc, spring, impact, stretch } = An;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Flat carry: ants grip the rim from outside, donut at mandible height.
export function carryRing(C, dn, cx, cz, y, R = 4.25) {
  return (at, { lift = 0.55, strain = 0.5, spin = 0 } = {}) => {
    dn.position.set(cx, y + lift, cz);
    dn.rotation.y = spin;
    CREW.forEach((w, i) => {
      const a = C[w];
      const ang = Math.PI / 4 + i * Math.PI / 2 - spin;
      antAt(a, cx + Math.cos(ang) * R, y, cz + Math.sin(ang) * R, Math.atan2(-Math.cos(ang), -Math.sin(ang)) + Math.PI);
      A.carry(a, at + i, strain);
    });
  };
}
function nestCtx() {
  const ctx = setup({ light: 'nest', fogNear: 30, fogFar: 140, sky: false, shadowBox: 40, sunDist: 60 });
  ctx.scene.background = new THREE.Color(0x2a1520);
  return ctx;
}

// ---------------------------------------------------------------- 1. HUNGRY (the Queen's belly growls)
const S_HUNGRY = {
  name: 'hungry', dur: DUR('hungry'),
  build() {
    const q = Q('hungry');
    const ctx = nestCtx();
    nestChamber(ctx);
    const Qn = A.queen();
    Qn.position.set(0, 0, -6.5);
    Qn.rotation.y = 0.3;
    ctx.scene.add(Qn);
    const C = makeCrew(ctx);
    const spots = { pip: [-4.2, 2.2], dot: [-2.4, 4.4], bean: [2.6, 4.0], moss: [4.6, 2.0] };
    const dust = new Burst(ctx, { n: 40, origin: [0, 14, -2], dir: [0, -1, 0], spread: 1.8, speed: [2, 8], g: -40, size: [0.12, 0.32], color: 0x9a6040, t0: q.growl + 0.05, life: 1.3, floor: 0, geo: new THREE.BoxGeometry(1, 1, 1) });
    return {
      ctx, fx: { dof: { focus: 12, aperture: 0.004, maxblur: 0.01 }, bloom: 0.6, grade: { warm: 0.04 } },
      update(lt) {
        const at = lt;
        A.neutral(Qn);
        A.belly(Qn, 0.35, at > q.growl ? spring(at, q.growl, { amp: 1.6, freq: 5, damp: 0.25 }) : 0);
        A.alive(Qn, at, 0.6);
        A.antennae(Qn, at, [[q.growl, 0.5]], { tap: 0.3, back: at > q.growl ? 0.4 : 0 });
        A.jaws(Qn, 0.2 + Math.sin(at * 2) * 0.1);
        CREW.forEach((w, i) => {
          const a = C[w];
          const [x, z] = spots[w];
          antAt(a, x, 0, z, Math.PI + x * 0.05);
          const hop = at > q.growl ? Math.max(0, Math.sin(seg(at, q.growl + i * 0.03, q.growl + 0.3 + i * 0.03) * Math.PI)) * 1.2 : 0;
          a.position.y += hop;
          A.alive(a, at + i);
          A.antennae(a, at + i, [[q.growl + 0.05, 0.7]], { perk: 0.3 });
          const nb = C[CREW[(i + (i % 2 ? -1 : 1) + 4) % 4]];
          if (at > q.growl + 0.5) A.headLook(a, nb.position.clone().add(V(0, 0.6, 0)), easeInOut(seg(at, q.growl + 0.5, q.growl + 0.8)) * 0.8);
          else A.headLook(a, V(0, 3, -5), 0.5);
        });
        dust.update(lt);
        aim(ctx.camera, [1.2, 1.6, 9.6 - lt * 0.5], [0, 3.2, -6], 56);
        shake(ctx.camera, lt, shakeAmt(lt, [q.growl], 0.5, 1.0));
        handheld(ctx.camera, lt, 0.6, 1);
      },
      post(lt, c) { c.focusOn([0, 2, -3]); },
      pins: (lt) => UI.word(ctx.camera, V(-4.5, 3.0, -9), lt, q.growl, 'GRRRUMBLE', { size: 70, rot: -5, dur: 0.9 }),
      hud: (lt) => chatHtml('hungry', lt),
    };
  },
};

// ---------------------------------------------------------------- 2. OUT (pop out; the house on the horizon)
const S_OUT = {
  name: 'out', dur: DUR('out'),
  build() {
    const q = Q('out');
    const ctx = lawnShot({ light: 'gold', sunDir: [-0.4, 0.45, -0.8], focus: [0, 6, 0], cam: [0, 30, 0, -300], clear: [{ x: 0, z: 0, r: 36 }], laneR: 16, center: [0, -60], size: [200, 200] });
    const hY = anthill(ctx);
    const C = makeCrew(ctx);
    const order = ['pip', 'dot', 'moss', 'bean'];
    const land = { pip: [Math.PI + 0.2, 5.2], dot: [Math.PI - 0.5, 5.6], moss: [Math.PI + 0.75, 6.0], bean: [Math.PI - 0.05, 6.8] };
    return {
      ctx, fx: { dof: { focus: 12, aperture: 0.003, maxblur: 0.01 }, bloom: 0.5 },
      update(lt) {
        const at = lt;
        order.forEach((w, i) => {
          const a = C[w];
          const t0 = q.pops[i];
          const [th, r] = land[w];
          const end = [Math.sin(th) * r, hY(r), Math.cos(th) * r];
          const u = seg(at, t0, t0 + 0.32);
          const p = at < t0 ? [0, -3, 0] : arc([0, -1, 0], end, u, 4 + i * 0.3);
          antAt(a, p[0], p[1], p[2], th);
          a.rotation.order = 'YXZ';
          if (u > 0 && u < 1) { a.rotation.x = -0.7 * (1 - u); A.squash(a, stretch(at, t0, 0.3, 0.32)); A.flail(a, at, 0.4); }
          else if (u >= 1) {
            A.squash(a, impact(at, t0 + 0.32, 0.28));
            A.alive(a, at + i);
            if (w === 'pip') { A.rear(a, 0.75 * seg(at, q.point, q.point + 0.2)); }
          }
          A.antennae(a, at, [[t0 + 0.32, 0.6], [q.point, w === 'pip' ? 0.5 : 0]], { perk: w === 'pip' && at > q.point ? 1 : 0.3 });
          A.scarf(a, at, 0, [[t0 + 0.32, 0.6]]);
        });
        const k = easeInOut(seg(lt, 0.9, 2.9));
        aim(ctx.camera, [lerp(3, 4, k), lerp(9.5, 46, k), lerp(-9, 18, k)], [lerp(0, 120, k), lerp(8, 140, k), lerp(0, -1600, k)], lerp(46, 40, k));
        handheld(ctx.camera, lt, 0.6, 2);
      },
      post(lt, c) { c.bokeh.uniforms.focus.value = lerp(9, 22, easeInOut(seg(lt, 0.9, 2.6))); },
      hud: (lt) => cardHtml('out', lt, { hold: 1.8, pos: 'bl' }) + chatHtml('out', lt),
    };
  },
};

// ---------------------------------------------------------------- 4. TREK (third-person through the blocky grass)
const S_TREK = {
  name: 'trek', dur: DUR('trek'),
  build() {
    const q = Q('trek');
    const SPEED = 7.5;
    const TWZ = -SPEED * 1.25;
    const ctx = lawnShot({ light: 'gold', sunDir: [0.35, 0.3, -0.9], focus: [0, 0, -12], cam: [0, 8, 0, -50], clear: [{ x: 0, z: -12, r: 12 }, { x: 0, z: -30, r: 10 }], center: [0, -30] });
    const tw = twig(80, 2.0);
    tw.position.set(-6, tw.position.y, TWZ);
    tw.rotation.y = 0.12;
    ctx.scene.add(tw);
    const lf = dryLeaf(30, 0xe0a050);
    lf.position.set(13, 0.4, -6);
    lf.rotation.y = 0.9;
    ctx.scene.add(lf);
    const C = makeCrew(ctx);
    const off = { pip: [0, 0], dot: [-3.2, -5], bean: [3.0, -2.5], moss: [0.8, -9] };
    const hopZ = (z) => { const d = z - TWZ; return Math.abs(d) < 2.6 ? Math.cos((d / 2.6) * Math.PI / 2) * 5.2 : 0; };
    return {
      ctx, fx: { dof: { focus: 6, aperture: 0.004, maxblur: 0.009 }, bloom: 0.5 },
      update(lt) {
        const at = lt;
        for (const w of CREW) {
          const a = C[w];
          const [ox, oz] = off[w];
          const sp = SPEED * (w === 'moss' ? 0.95 : w === 'bean' ? 1.05 : 1);
          const z = oz - sp * at;
          const x = ox + Math.sin(at * 1.3 + ox) * 0.5;
          antAt(a, x, hopZ(z), z, Math.PI + Math.cos(at * 1.3 + ox) * 0.08);
          if (hopZ(z) > 0.2) { A.flail(a, at, 0.25); a.rotation.order = 'YXZ'; a.rotation.x = (z > TWZ ? -0.35 : 0.35); }
          else A.walk(a, gait(sp * at), 1);
          A.antennae(a, at + a.userData.seed, [], { tap: 0.5 });
          A.scarf(a, at, 2);
        }
        const tl = Math.max(0, lt - 0.12);
        const pz = -SPEED * tl;
        const hy = hopZ(pz);
        aim(ctx.camera, [1.8, 2.6 + hy * 0.8, pz + 4.8], [-0.4, 0.8 + hy * 0.6, pz - 6], 52);
        handheld(ctx.camera, lt, 1.2, 3);
        shake(ctx.camera, lt, shakeAmt(lt, [q.land], 0.06, 0.3));
      },
      post(lt, c) { c.focusOn(C.pip.position); },
      hud: (lt) => chatHtml('trek', lt),
    };
  },
};

// ---------------------------------------------------------------- 5. HOSE (single file; bean slips into the puddle)
const S_HOSE = {
  name: 'hose', dur: DUR('hose'),
  build() {
    const q = Q('hose');
    const ctx = lawnShot({ light: 'gold', sunDir: [-0.7, 0.5, 0.25], focus: [0, 0, 0], cam: [10, 40, 0, 0], clear: [{ x: 0, z: 0, r: 70 }], center: [0, -40], count: 7000 });
    const { curve } = hoseOverPuddle(ctx, { at: [0, 0, 0], len: 120, r: 3.4 });
    const C = makeCrew(ctx);
    const L = curve.getLength();
    const order = ['dot', 'pip', 'bean', 'moss'];
    const u0 = 0.47, spd = 6.5 / L, gap = 3.6 / L;
    const splashAt = [0, 0, 0];
    const drops = new Burst(ctx, { n: 40, origin: splashAt, dir: [0, 1, 0], spread: 0.55, speed: [8, 18], g: -45, size: [0.25, 0.7], mat: keep(new THREE.MeshPhysicalMaterial({ color: 0xcfe6f0, roughness: 0.05, transparent: true, opacity: 0.8 })), floor: 0.1, t0: q.splash, life: 1.0 });
    const rip = ripple(ctx, [0, 0.3, 0]);
    return {
      ctx, fx: { dof: { focus: 14, aperture: 0.0035, maxblur: 0.009 }, bloom: 0.45 },
      update(lt) {
        const at = lt;
        const stop = seg(at, q.splash, q.splash + 0.3);
        order.forEach((w, i) => {
          const a = C[w];
          const tt = Math.min(at, q.splash) + Math.max(0, at - q.splash) * 0.1;
          const u = u0 + spd * tt - i * gap;
          const p = curve.getPointAt(u);
          const tg = curve.getTangentAt(u);
          if (w === 'bean' && at > q.slip) {
            const pu = curve.getPointAt(u0 + spd * q.slip - i * gap);
            const base = [pu.x, pu.y + 3.4, pu.z];
            const wob = seg(at, q.slip, q.slip + 0.3);
            const fall = seg(at, q.slip + 0.25, q.splash);
            splashAt[0] = base[0] + 1; splashAt[2] = base[2] + 7;
            drops.origin = [splashAt[0], 0.2, splashAt[2]];
            const fp = arc(base, [splashAt[0], -0.4, splashAt[2]], easeIn(fall), 2.5);
            antAt(a, fp[0], fp[1], fp[2], Math.atan2(tg.x, tg.z));
            a.rotation.order = 'YXZ';
            a.rotation.z = Math.sin(wob * 18) * 0.35 * (1 - fall) + fall * 1.8;
            A.flail(a, at, 0.7 + fall * 0.5);
            if (at > q.splash) { A.neutral(a); a.position.set(splashAt[0], -0.35 + Math.sin(at * 5) * 0.08, splashAt[2]); a.rotation.set(0, 2.4, 0); a.userData.bodyG.position.y = 0.2; A.antennae(a, at, [[q.splash + 0.3, 0.8]], { perk: 0.6 }); }
            return;
          }
          antAt(a, p.x, p.y + 3.4, p.z, Math.atan2(tg.x, tg.z));
          A.walk(a, gait(6.5 * tt), 0.8 * (1 - stop));
          A.antennae(a, at + i, [[q.splash, 0.5]]);
          A.scarf(a, at, 1 - stop);
          if (at > q.slip) A.headLook(a, V(splashAt[0], 0, splashAt[2]), 0.8 * seg(at, q.slip, q.slip + 0.3));
        });
        drops.update(lt);
        rip(lt, q.splash);
        const bp = curve.getPointAt(u0 + spd * Math.min(lt, q.slip) - 2 * gap);
        const fk = seg(lt, q.slip, q.splash);
        aim(ctx.camera, [bp.x + 2, bp.y + 5 - fk * 1.5, bp.z + 15], [bp.x + 0.5, bp.y + 2.4 - fk * 5.5, bp.z + 3 + fk * 3], 48);
        handheld(ctx.camera, lt, 0.9, 5);
        shake(ctx.camera, lt, shakeAmt(lt, [q.splash], 0.12, 0.35));
      },
      post(lt, c) { c.focusOn(C.bean.position); },
      pins: (lt) => UI.word(ctx.camera, V(splashAt[0], 5, splashAt[2]), lt, q.splash, 'SPLOOSH', { size: 64, rot: 6, dur: 0.9 }),
      hud: (lt) => chatHtml('hose', lt),
    };
  },
};

// ---------------------------------------------------------------- 6. CLIMB (up a two-block ledge; grip ring; moss slips, dot catches)
const CLIMB_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0)));
const S_CLIMB = {
  name: 'climb', dur: DUR('climb'),
  build() {
    const q = Q('climb');
    const ctx = lawnShot({ light: 'gold', sunDir: [-0.5, 0.6, 0.6], focus: [0, 8, 0], cam: [10, 30, 0, 0], clear: [{ x: 0, z: 10, r: 20 }], center: [0, -40], count: 5000 });
    const wall = [];
    for (let x = -36; x <= 36; x += Bk.B) for (let k = 1; k <= 2; k++) wall.push([x, k * Bk.B, -Bk.B / 2]);
    Bk.blocks(ctx, wall);
    const C = makeCrew(ctx);
    const X0 = 0;
    return {
      ctx, fx: { dof: { focus: 10, aperture: 0.004, maxblur: 0.01 }, bloom: 0.45 },
      update(lt) {
        const at = lt;
        const base = 2 + at * 3.4;
        const pos = { pip: [X0 - 2, base + 6], dot: [X0 + 1.4, base + 3.4], moss: [X0 + 1.2, base + 0.8], bean: [X0 - 3, base - 1.5] };
        CREW.forEach((w, i) => {
          const a = C[w];
          let [x, y] = pos[w];
          A.neutral(a);
          a.quaternion.copy(CLIMB_Q);
          if (w === 'moss' && at > q.slip) {
            const f = seg(at, q.slip, q.catch);
            y = lerp(base + 0.8 - (at - q.slip) * 6, pos.dot[1] - 2.6, easeIn(f));
            if (at >= q.catch) { y = pos.dot[1] - 2.6; a.rotateZ(spring(at, q.catch, { amp: 0.6, freq: 1.4, damp: 0.15 })); }
            A.flail(a, at, 1 - seg(at, q.catch, q.catch + 0.6) * 0.6);
          } else if (!(w === 'dot' && at > q.catch)) A.climb(a, gait(3.4 * at) * 1.6 + i * 1.5, 1);
          else { A.climb(a, 0, 0); a.userData.legs[4].hip.rotation.y = 1.4; }
          a.position.set(x, Math.max(0.2, y), 0.25);
          A.antennae(a, at + i, [[q.slip, 0.4]]);
        });
        const cy = 2 + lt * 3.4;
        aim(ctx.camera, [X0 + 4, cy + 3, 10], [X0, cy + 4.2, 0], 52);
        handheld(ctx.camera, lt, 0.8, 11);
        shake(ctx.camera, lt, shakeAmt(lt, [q.catch], 0.12, 0.3));
      },
      post(lt, c) { c.focusOn(C.moss.position); },
      hud: (lt) => {
        const g = 1 - seg(lt, 0.2, q.slip) * 0.9;
        const col = lt > q.slip - 0.3 ? '#ff4a3a' : '#32d07a';
        const p = UI.project(ctx.camera, C.moss.position.clone().add(V(2.2, 1.2, 0.5)));
        const ring = lt < q.catch + 0.3 ? `<svg style="position:absolute;left:${p.x - 44}px;top:${p.y - 44}px;width:88px;height:88px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" viewBox="0 0 44 44"><circle cx="22" cy="22" r="17" fill="rgba(255,247,232,.9)" stroke="#fff" stroke-width="5"/><circle cx="22" cy="22" r="17" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${(g * 107).toFixed(1)} 200" transform="rotate(-90 22 22)" stroke-linecap="round"/><text x="22" y="26.5" font-family="Fredoka" font-weight="700" font-size="11" text-anchor="middle" fill="#2a1730">GRIP</text></svg>` : '';
        return ring + chatHtml('climb', lt);
      },
    };
  },
};

// ---------------------------------------------------------------- 8. KITCHEN (cresting the counter lip: the counter-top world, the donut gleaming)
const CLIMB_UP = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, 1), V(0, -1, 0)).invert());
const S_KITCHEN = {
  name: 'kitchen', dur: DUR('kitchen'),
  build() {
    const q = Q('kitchen');
    const EDGE = 9.6;
    const { ctx } = kitchenShot({ focus: [36, TOP, -20] });
    const dn = Wd.donut(DONUT_S);
    dn.position.set(36, TOP, -20);
    dn.rotation.y = 0.5;
    ctx.scene.add(dn);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glint.position.set(34.6, TOP + 2.5, -17);
    ctx.scene.add(glint);
    const C = makeCrew(ctx);
    const lane = { pip: [33.2, 0.0], dot: [35.4, 0.15], bean: [37.6, 0.3], moss: [39.6, 0.08] };
    return {
      ctx, fx: { dof: { focus: 12, aperture: 0.004, maxblur: 0.01 }, bloom: 0.45, ao: 0.6 },
      update(lt) {
        const at = lt;
        CREW.forEach((w, i) => {
          const a = C[w];
          const [x, d] = lane[w];
          const t = at - d;
          // climb the front face, tip over the lip, step onto the top, then stop and stare
          const up = seg(t, 0, q.crest);
          const over = seg(t, q.crest, q.crest + 0.25);
          A.neutral(a);
          if (over <= 0) {
            a.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI, 0, 'YXZ'));
            a.position.set(x, lerp(TOP - 4, TOP - 0.6, up), EDGE + 0.25);
            A.climb(a, gait(t * 4) * 1.6 + i, 1);
          } else {
            const z = EDGE - 0.5 - easeOut(over) * 2 - Math.max(0, Math.min(t - q.crest - 0.25, 0.6)) * 3;
            a.rotation.set(0, Math.PI, 0);
            a.rotation.x = 0;
            a.position.set(x, TOP, z);
            a.rotation.order = 'YXZ';
            a.rotation.x = -(1 - easeOut(over)) * 1.4;
            const stop = seg(t, q.crest + 0.6, q.crest + 0.9);
            A.walk(a, gait((t - q.crest) * 3) + i, 1 - stop);
            A.rear(a, stop * (0.45 + 0.08 * i));
            A.antennae(a, at + i, [[q.crest + 0.9 + i * 0.08, 0.6]], { perk: stop });
          }
        });
        const gk = Math.max(0, 1 - Math.abs(lt - q.glint - 0.15) / 0.22);
        glint.scale.setScalar(7 * gk);
        glint.material.opacity = gk;
        const r = easeInOut(seg(lt, 0.2, 1.4));
        aim(ctx.camera, [36.8, TOP + lerp(-1.5, 2.6, r), EDGE + lerp(9, 8, r)], [36, TOP + lerp(-1, 1.4, r), lerp(EDGE, -20, r)], 46);
        handheld(ctx.camera, lt, 0.5, 9);
      },
      post(lt, c) { c.bokeh.uniforms.focus.value = lerp(8, 37, easeInOut(seg(lt, 1.2, 1.6))); },
      hud: (lt) => chatHtml('kitchen', lt),
    };
  },
};

// ---------------------------------------------------------------- 10. GRAB (four grab dots fill → lift)
const S_GRAB = {
  name: 'grab', dur: DUR('grab'),
  build() {
    const q = Q('grab');
    const DX = 30, DZ = -60;
    const { ctx } = kitchenShot({ focus: [DX, TOP, DZ] });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    dn.userData.grabs = CREW.map((w, i) => { const ang = Math.PI / 4 + i * Math.PI / 2; return [Math.cos(ang) * 4.25, 1.9, Math.sin(ang) * 4.25]; });
    const C = makeCrew(ctx);
    const ring = carryRing(C, dn, DX, DZ, TOP);
    return {
      ctx, fx: { dof: { focus: 11, aperture: 0.004, maxblur: 0.01 }, bloom: 0.4, ao: 0.6 },
      update(lt) {
        const at = lt;
        const crouch = An.anticipate(at, q.lift, 0.3);
        const up = at < q.lift ? 0 : 1 - spring(at, q.lift, { amp: 1, freq: 2.2, damp: 0.4 });
        ring(at, { lift: up * 0.55, strain: 0.4 + crouch * 0.4 });
        const step = Math.max(0, at - q.lift - 0.35) * 2.2;
        dn.position.x += step;
        CREW.forEach((w, i) => {
          const a = C[w];
          a.position.x += step;
          if (step > 0) A.walk(a, gait(step) * 1.6 + i * 1.7, 1);
          A.squash(a, crouch * 0.18 - (at > q.lift ? impact(at, q.lift, 0.15) : 0));
          A.antennae(a, at + i, [[q.grabs[i], 0.4], [q.lift, 0.6]], { back: 0.3 });
          A.scarf(a, at, 0, [[q.lift, 0.6]]);
          if (at < q.grabs[i]) { A.neutral(a); A.alive(a, at + i); A.antennae(a, at + i); }
        });
        frame(ctx.camera, [DX + 1, TOP + 0.6, DZ], { dist: 13 - lt * 0.6, yaw: 0.65, pitch: 0.32, fov: 44 });
        handheld(ctx.camera, lt, 0.6, 15);
        shake(ctx.camera, lt, shakeAmt(lt, [q.lift], 0.05, 0.3));
      },
      post(lt, c) { c.focusOn([DX, TOP + 1, DZ]); },
      hud: (lt) => UI.grabDots(ctx.camera, dn, CREW.map((w, i) => (lt >= q.grabs[i] ? { who: w, t: q.grabs[i] } : null)), lt) + chatHtml('grab', lt),
    };
  },
};

// ---------------------------------------------------------------- 1. DONUT (the hook: a donut walks... it's four ants)
const S_DONUT = {
  name: 'donut', dur: DUR('donut'),
  build() {
    const q = Q('donut');
    const DX = 30, Z0 = -96;
    const { ctx } = kitchenShot({ focus: [DX, TOP, Z0 + 4] });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const ring = carryRing(C, dn, DX, Z0, TOP);
    return {
      ctx, fx: { dof: { focus: 6, aperture: 0.005, maxblur: 0.011 }, bloom: 0.45, ao: 0.6 },
      update(lt) {
        const at = lt;
        const z = Z0 + at * 2.6;
        ring(at, { lift: 0.55 + Math.sin(at * 9) * 0.06, strain: 0.4 });
        dn.position.z = z;
        dn.rotation.z = Math.sin(at * 4.5) * 0.04;
        CREW.forEach((w, i) => {
          const a = C[w];
          a.position.z += at * 2.6;
          A.walk(a, gait(at * 2.6) * 1.6 + i * 1.7, 1.1);
          A.antennae(a, at + i, [], { back: 0.4, tap: 0.4 });
          A.scarf(a, at, 1.2);
        });
        // open tight on the glaze, gliding toward us; then drop and pull back to reveal the legs
        const r = easeInOut(seg(lt, q.reveal, q.reveal + 1.3));
        const sub = V(DX, TOP + lerp(2.2, 0.9, r), z);
        frame(ctx.camera, sub, { dist: lerp(4.2, 10.5, r), yaw: lerp(0.12, 0.42, r), pitch: lerp(0.32, 0.14, r), fov: 42, lookOff: [0, lerp(-0.2, 0.2, r), 0] });
        handheld(ctx.camera, lt, 0.6, 41);
      },
      post(lt, c) { c.bokeh.uniforms.focus.value = lerp(4.2, 10.5, easeInOut(seg(lt, q.reveal, q.reveal + 1.3))); },
      hud: (lt) => chatHtml('donut', lt),
    };
  },
};

// ---------------------------------------------------------------- 2. SPIN (democratic steering: everyone pulls a different way)
const S_SPIN = {
  name: 'spin', dur: DUR('spin'),
  build() {
    const q = Q('spin');
    const DX = 30, DZ = -88;
    const { ctx } = kitchenShot({ focus: [DX, TOP, DZ] });
    const dn = Wd.donut(DONUT_S);
    ctx.scene.add(dn);
    const C = makeCrew(ctx);
    const ring = carryRing(C, dn, DX, DZ, TOP);
    const flungStart = V(0, 0, 0);
    return {
      ctx, fx: { dof: { focus: 14, aperture: 0.003, maxblur: 0.01 }, bloom: 0.4, ao: 0.6 },
      update(lt) {
        const at = lt;
        const sp = Math.max(0, at - q.spin);
        const spin = sp * sp * 2.2;
        ring(at, { lift: 0.55, strain: 0.6, spin });
        CREW.forEach((w, i) => {
          const a = C[w];
          const pull = seg(at, q.argue + i * 0.08, q.argue + 0.3 + i * 0.08);
          a.rotation.y += [0.9, -0.9, 0.9, -0.9][i] * pull; // each heads their own way
          A.walk(a, at * 15 + i * 1.7, 1.1);
          A.antennae(a, at + i, [[q.argue + i * 0.08, 0.5]], { back: 0.5 });
          A.scarf(a, at, 1 + sp * 2);
          if (sp > 0.3) a.position.y += Math.min(0.6, (sp - 0.3) * 0.5); // centrifugal float
        });
        const b = C.bean;
        if (at > q.fling) {
          if (!flungStart.lengthSq()) flungStart.copy(b.position);
          const u = seg(at, q.fling, q.fling + 0.55);
          const p = arc([flungStart.x, flungStart.y, flungStart.z], [DX + 11, TOP + 0.4, DZ + 7], u, 5);
          A.neutral(b);
          b.position.set(...p);
          b.rotation.set(u * 9, u * 4, u * 6);
          A.flail(b, at, 1);
        } else flungStart.set(0, 0, 0);
        frame(ctx.camera, [DX + 3, TOP + 0.6, DZ + 1], { dist: 17 - lt * 0.8, yaw: -0.5, pitch: 0.55, fov: 42 });
        handheld(ctx.camera, lt, 0.7, 43);
        shake(ctx.camera, lt, shakeAmt(lt, [q.fling], 0.12, 0.3));
      },
      post(lt, c) { c.focusOn([DX, TOP + 1, DZ]); },
      hud: (lt) => chatHtml('spin', lt),
    };
  },
};

export const SHOTS_A = [S_DONUT, S_SPIN, S_HUNGRY, S_OUT, S_TREK, S_HOSE, S_CLIMB, S_KITCHEN, S_GRAB];
