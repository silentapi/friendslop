// Shots 1–7: the bait → closed Starbucks → boost pad → LYNX dodge → crash + watch-an-ad continue → storm → ramp over the SunRail.
import { THREE, V, aim, seg, lerp, lerpV, easeIn, easeOut, easeInOut, smooth, handheld, shake, spring, clamp, mat, mesh, box, emissive, canvasTex, mulberry } from '../engine/core.js';
import * as HUD from '../engine/hud.js';
import { rider, coldCup, ik2 } from '../engine/rider.js';
import { mixCharacter } from '../engine/chars.js';
import * as Sets from '../engine/sets.js';
import { exterior, along, yawTo, eta, DUR, Q, START, Wd } from './kit.js';

const ORANGE_X = -631, CHURCH_Z = 63;

// ---------------------------------------------------------------- 1. HOOK: red light on Orange Ave, the bait lands
const S_HOOK = {
  name: 'hook', dur: DUR('hook'),
  async build() {
    const q = Q('hook');
    const ctx = await exterior({ center: [ORANGE_X, 75], radius: 600, shadowBox: 25, dressR: 120, dressNames: ['Orange', 'Church'] });
    await Wd.traffic(ctx, { names: ['Church Street'], center: [ORANGE_X, CHURCH_Z], radius: 120, n: 6, speed: 10, seed: 3 });
    const R = await rider(); ctx.scene.add(R.root);
    R.root.position.set(ORANGE_X + 2.6, 0, 77); R.root.rotation.y = Math.PI;
    ctx.focusSun(R.root.position, 300);
    return {
      ctx, fx: { ao: 0.6 },
      update(lt) {
        R.ride(4, { lean: 0.28, footDown: 1, look: -0.35 + seg(lt, q.accept, q.slam) * 0.3 });
        const push = easeInOut(seg(lt, 0, q.slam));
        const cp = lerpV([ORANGE_X + 6.6, 0.75, 70.2], [ORANGE_X + 5.2, 0.95, 71.4], push).add(handheld(lt, 0.04)).add(shake(lt, q.slam, 0.12, 0.35));
        aim(ctx.camera, cp, V(ORANGE_X + 1.9, 1.75 + push * 0.25, 79), 0.02);
        ctx.camera.fov = 52 - push * 6; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { const g = P.grade.uniforms; g.flash.value = lt > q.slam ? Math.max(0, 1 - (lt - q.slam) * 16) * 0.35 : 0; g.zoom.value = lt > q.slam ? (1 - seg(lt, q.slam, q.slam + 0.4)) * 0.08 : 0; },
      hud(lt) {
        return HUD.caption(lt, -0.2, DUR('hook'), 'POV: Kyle promised you / a *$50* tip', { y: 290, size: 70, per: 0 })
          + HUD.orderCard(lt, q.card - 0.5, q.accept, { y: 470 });
      },
    };
  },
};

// ---------------------------------------------------------------- 2. CLOSED: the close Starbucks (Summerlin Ave) is closed
const SUMMERLIN = { x: 401, z: -235 };
const S_CLOSED = {
  name: 'closed', dur: DUR('closed'),
  async build() {
    const q = Q('closed');
    const ctx = await exterior({ center: [SUMMERLIN.x, SUMMERLIN.z], radius: 500, shadowBox: 25, dressR: 90, dressNames: ['Summerlin', 'Central'], skipDress: [[SUMMERLIN.x - 6, SUMMERLIN.z, 12]] });
    const sf = Sets.storefront(ctx, { open: false }); sf.position.set(SUMMERLIN.x - 7.6, 0, SUMMERLIN.z); sf.rotation.y = Math.PI / 2; ctx.scene.add(sf);
    const R = await rider(); ctx.scene.add(R.root);
    const path = [[SUMMERLIN.x - 5.0, SUMMERLIN.z + 24], [SUMMERLIN.x - 5.6, SUMMERLIN.z + 0.8]];
    ctx.focusSun(V(SUMMERLIN.x, 0, SUMMERLIN.z), 300);
    return {
      ctx,
      update(lt) {
        const k = easeOut(seg(lt, 0, q.brake + 0.2));
        const s = k * 23.2;
        const { p, yaw } = along(path, s);
        R.root.position.copy(p); R.root.rotation.y = yaw;
        const stopped = lt > q.brake + 0.15;
        R.ride(s, { lean: 0.3, footDown: smooth(seg(lt, q.brake, q.brake + 0.3)), look: stopped ? 0 : -0.1 });
        if (stopped) { const hd = R.C.bone('Head'); hd.rotateY(-0.7 * smooth(seg(lt, q.sign - 0.1, q.sign + 0.2))); hd.updateMatrixWorld(true); }
        const push = easeInOut(seg(lt, 0, DUR('closed')));
        const cp = lerpV([SUMMERLIN.x - 4.4, 1.5, SUMMERLIN.z - 5.6], [SUMMERLIN.x - 4.6, 1.5, SUMMERLIN.z - 4.9], push).add(handheld(lt, 0.025));
        aim(ctx.camera, cp, V(SUMMERLIN.x - 6.9, 1.4, SUMMERLIN.z - 0.5), -0.02);
        ctx.camera.fov = 62; ctx.camera.updateProjectionMatrix();
      },
      hud(lt) {
        return HUD.place(lt, 0.05, DUR('closed'), 'Starbucks', '20 N Summerlin Ave')
          + HUD.caption(lt, q.sign + 0.3, DUR('closed'), 'nearest Starbucks: / ~closed~ 💀', { y: 1380, size: 66, per: 0 })
          + HUD.notif(lt, q.reroute, DUR('closed'), 'Rerouting… 🔁', 'Starbucks · 325 S Orange Ave · +1.1 mi', { y: 250 });
      },
    };
  },
};


// ---------------------------------------------------------------- 3. BOOST: order picked up, hit the boost pad on S Orange Ave
function boostPad() {
  const t = canvasTex('boostpad', 256, 512, (c, w, h) => {
    c.fillStyle = '#0a7a35'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7dffb0'; c.lineWidth = 34; c.lineJoin = 'miter';
    for (let i = -1; i < 4; i++) { const y = i * 128 + 40; c.beginPath(); c.moveTo(24, y + 80); c.lineTo(w / 2, y); c.lineTo(w - 24, y + 80); c.stroke(); }
    c.strokeStyle = '#e8fff0'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 2.2, roughness: 0.4 });
  const pad = mesh(new THREE.PlaneGeometry(2.4, 4.8), m, { cast: false }); pad.rotation.x = -Math.PI / 2; pad.userData.noAO = true;
  pad.userData.scroll = (lt) => { t.offset.y = (lt * 1.6) % 1; };
  return pad;
}
function speedOf(lt, v0, v1, kick, ramp = 0.25) { return v0 + (v1 - v0) * smooth(seg(lt, kick, kick + ramp)); }
function distOf(lt, v0, v1, kick) { let d = 0; const n = 120, dt = lt / n; for (let i = 0; i < n; i++) d += speedOf((i + 0.5) * dt, v0, v1, kick) * dt; return d; }

const S_BOOST = {
  name: 'boost', dur: DUR('boost'),
  async build() {
    const q = Q('boost');
    const ctx = await exterior({ center: [ORANGE_X, 230], radius: 600, shadowBox: 30, dressR: 150, dressNames: ['Orange'] });
    await Wd.traffic(ctx, { names: ['Orange Avenue'], center: [ORANGE_X, 200], radius: 160, n: 4, speed: 8, seed: 21 });
    const R = await rider(); ctx.scene.add(R.root);
    const x = ORANGE_X + 2.6, z0 = 268, v0 = 8.5, v1 = 21;
    const pad = boostPad(); pad.position.set(x, 0.03, z0 - v0 * (q.kick - 0.05) - 1.2); ctx.scene.add(pad);
    const glow = new THREE.PointLight(0x40ff90, 0, 9, 2); glow.position.set(x, 1.2, pad.position.z); ctx.scene.add(glow);
    return {
      ctx, shutter: 0.75,
      update(lt) {
        const d = distOf(lt, v0, v1, q.kick), z = z0 - d;
        const kick = smooth(seg(lt, q.kick, q.kick + 0.25));
        R.root.position.set(x, 0, z); R.root.rotation.y = Math.PI;
        R.ride(d, { lean: 0.42 + kick * 0.14, stand: kick * 0.25 });
        pad.userData.scroll(lt);
        glow.intensity = 6 + Math.sin(lt * 18) * 2 + Math.max(0, 1 - Math.abs(lt - q.kick) * 4) * 30;
        ctx.focusSun(R.root.position, 300);
        // chase camera: lags behind on the kick, FOV punches out
        const lag = 5.0 + spring(lt, q.kick, { amp: 1.4, freq: 0.9, damp: 0.5 }) + kick * 0.4;
        const cp = V(x + 0.5, 2.5 - kick * 0.5, z + lag).add(handheld(lt * 1.4, 0.05)).add(shake(lt, q.kick, 0.14, 0.5));
        aim(ctx.camera, cp, V(x - 0.1, 1.0, z - 5), 0);
        ctx.camera.fov = 58 + kick * 22 - Math.max(0, spring(lt, q.kick, { amp: 6, freq: 1.2, damp: 0.4 })); ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { const g = P.grade.uniforms; const k = seg(lt, q.kick, q.kick + 0.2) * (1 - seg(lt, q.kick + 0.5, DUR('boost')) * 0.6); g.zoom.value = k * 0.07; g.flash.value = Math.max(0, 1 - Math.abs(lt - q.kick) * 8) * 0.35; g.sat.value = 1.08 + k * 0.12; },
      hud(lt) {
        const k = seg(lt, q.kick, q.kick + 0.15);
        return (k > 0 ? HUD.speedLines(lt, k * (1 - 0.4 * seg(lt, q.kick + 0.8, DUR('boost')))) : '')
          + HUD.gameHud({ secs: eta(START.boost + lt), tip: 50, btn: true, boost: Math.max(0, 1 - Math.abs(lt - q.kick) * 5), map: HUD.minimap([[-0.1, 0.9], [-0.1, 0.1], [0.4, -0.3], [0.8, -0.9]], lt / DUR('boost')), pop: HUD.pop(lt, q.kick, 540, 700, 'BOOST!', '2× speed') })
          + HUD.notif(lt, 0.0, q.pad, 'Order picked up ✅', 'Starbucks · 325 S Orange Ave', { y: 280 })
          + HUD.chat(lt, q.pad + 0.1, DUR('boost'), 'where r u', { y: 1150 });
      },
    };
  },
};

// ---------------------------------------------------------------- 4. DODGE: gameplay on Orange Ave, the LYNX pulls out
const S_DODGE = {
  name: 'dodge', dur: DUR('dodge'),
  async build() {
    const q = Q('dodge');
    const ctx = await exterior({ center: [ORANGE_X, 150], radius: 600, shadowBox: 30, dressR: 140, dressNames: ['Orange'] });
    await Wd.traffic(ctx, { names: ['Orange Avenue'], center: [ORANGE_X, 150], radius: 160, n: 6, speed: 9, seed: 11 });
    const R = await rider(); ctx.scene.add(R.root);
    const bus = Sets.lynxBus(); bus.rotation.y = Math.PI; ctx.scene.add(bus);
    const z0 = 205, v = 9.5;
    const xR = (lt) => ORANGE_X + 2.6 - smooth(seg(lt, q.swipe - 0.1, q.swipe + 0.3)) * 3.2;
    const route = [[-0.1, 0.9], [-0.1, 0.2], [0.05, -0.2], [0.5, -0.4], [0.8, -0.9]];
    return {
      ctx, shutter: 0.6,
      update(lt) {
        const z = z0 - v * lt, x = xR(lt);
        const bank = -spring(lt, q.swipe, { amp: 0.2, freq: 1.4, damp: 0.35 });
        R.root.position.set(x, 0, z); R.root.rotation.y = Math.PI;
        R.ride(v * lt, { lean: 0.42, bank });
        // bus pulls out of the kerb lane ahead, right where he is
        const bp = smooth(seg(lt, q.bus - 0.3, q.miss + 0.3));
        bus.position.set(ORANGE_X + 4.6 - bp * 1.8, 0, z0 - v * q.miss - 1.5 - bp * 2.0);
        bus.rotation.y = Math.PI + 0.12 * Math.sin(bp * Math.PI);
        ctx.focusSun(R.root.position, 300);
        // third-person gameplay camera
        const cp = V(x + 0.6, 2.7, z + 5.6).add(handheld(lt * 1.4, 0.06)).add(shake(lt, q.miss, 0.1, 0.4));
        aim(ctx.camera, cp, V(x - 0.2, 1.2, z - 6), bank * 0.4);
        ctx.camera.fov = 58 + smooth(seg(lt, q.swipe, q.miss)) * 6; ctx.camera.updateProjectionMatrix();
      },
      hud(lt, t) {
        const sw = lt < q.miss ? { a: seg(lt, 0.3, 0.5) * (1 - seg(lt, q.miss - 0.1, q.miss)), x: -Math.min(1, seg(lt, q.swipe - 0.15, q.swipe + 0.15)) * 140 } : null;
        return HUD.gameHud({ secs: eta(START.dodge + lt), tip: 50, btn: true, boost: Math.max(0, 1 - Math.abs(lt - q.swipe) * 6), swipe: sw, map: HUD.minimap(route, lt / DUR('dodge')), pop: HUD.pop(lt, q.miss, 540, 760, 'NEAR MISS', '+$0.00 (lol)') })
          + HUD.chat(lt, q.chat, DUR('dodge'), 'i can see u on the map 👀', { y: 1020 })
          + HUD.place(lt, 0.0, 1.2, 'Orange Ave', 'Downtown Orlando', { top: 270 });
      },
    };
  },
};


// ---------------------------------------------------------------- 5. CRASH: Orange & Church, tourists, over the bars → WIPED OUT → watch an ad to continue
const S_CRASH = {
  name: 'crash', dur: DUR('crash'),
  async build() {
    const q = Q('crash');
    const ctx = await exterior({ center: [ORANGE_X, 70], radius: 600, shadowBox: 18, dressR: 120, dressNames: ['Orange', 'Church'], skipDress: [[ORANGE_X, 63, 7]] });
    const R = await rider(); ctx.scene.add(R.root);
    await R.C.load('falling');
    const crowd = [];
    const kinds = ['tourist_m', 'tourist_f', 'local_m', 'tourist_f', 'tourist_m', 'local_f', 'tourist_m'];
    for (let i = 0; i < kinds.length; i++) {
      const c = await mixCharacter(`cast/${kinds[i]}.glb`, { maps: { casualsuit04: 'cast/tex/tourist_m_shirt.jpg', casualsuit02: 'cast/tex/tourist_f_shirt.jpg', casualsuit01: 'cast/tex/local_f_shirt.jpg' } });
      await c.load('walk', 'point', 'reaction');
      if (kinds[i].startsWith('tourist')) c.attach('Head', Sets.mouseEars(), [0, 0.1, 0], [0, 0, 0], 1.5);
      ctx.scene.add(c.root);
      crowd.push({ c, x0: ORANGE_X + 2.2 + i * 0.55 - (i % 2) * 0.3, z: 68.8 + (i % 3) * 0.6, sp: 0.55 + (i % 3) * 0.08, ph: i * 0.37, react: i % 3 === 0 ? 'point' : 'reaction' });
    }
    const X = ORANGE_X + 1.2, zHit = 72.2;
    const land = V(X + 0.3, 0, zHit - 5.2);
    return {
      ctx, shutter: 0.6,
      update(lt) {
        const w = Math.min(lt, q.freeze); // the world freezes on the wipe-out
        // ride in hot, brake too late
        const zRide = (t) => zHit + Math.max(0, q.hit - t) * 8.5 - Math.max(0, Math.min(q.hit, t) - q.brake) ** 2 * 2.2;
        if (w < q.hit) {
          R.root.position.set(X, 0, zRide(w)); R.root.rotation.y = Math.PI; R.bike.rotation.set(0, 0, 0);
          R.ride((zHit + 10 - zRide(w)), { lean: 0.38 + seg(w, q.brake, q.hit) * 0.25, look: 0.1 });
        } else {
          R.root.position.set(X, 0, zHit - smooth(seg(w, q.hit, q.hit + 0.5)) * 0.9); R.root.rotation.y = Math.PI;
          R.bike.rotation.set(-0.35 * Math.sin(Math.PI * seg(w, q.hit, q.hit + 0.35)), 0, smooth(seg(w, q.hit + 0.1, q.hit + 0.55)) * 1.4);
          // over the bars: ballistic arc + 1¼ forward flips, face-down on the crosswalk
          const u = seg(w, q.hit, q.land), uu = easeOut(u);
          const fwd = uu * 4.6 + smooth(seg(w, q.land, q.freeze)) * 0.5;
          const y = (0.85 + 2.2 * 4 * u * (1 - u)) * (1 - u) + 0.12 * u;
          R.walk('falling', 0.3 + (w - q.hit) * 1.4, { offset: V(0, y, 0.2 + fwd), yaw: 0, loop: true });
          R.C.root.rotation.x = uu * (Math.PI * 2.5);
          R.C.root.updateMatrixWorld(true);
        }
        // tourists: walking … then everyone stops and stares
        for (const p of crowd) {
          const tw = Math.min(w, q.hit + 0.1);
          p.c.root.position.set(p.x0 - p.sp * (tw + 1), 0, p.z);
          const r = smooth(seg(w, q.hit + 0.1, q.hit + 0.45));
          let dy = Math.atan2(land.x - p.c.root.position.x, land.z - p.c.root.position.z) + Math.PI / 2; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          p.c.root.rotation.y = -Math.PI / 2 + dy * r;
          p.c.pose(w < q.hit + 0.1 ? [['walk', p.ph + tw * 0.75]] : [[p.react, 0.2 + (w - q.hit - 0.1), 1, false]]);
        }
        ctx.focusSun(V(ORANGE_X, 0, 70), 300);
        // low camera at the crosswalk; tilts up with the flight, settles on the wipe-out
        const fl = Math.sin(Math.PI * seg(w, q.hit, q.land));
        const cp = V(ORANGE_X + 0.4, 0.8, 60.8).add(handheld(w, 0.03)).add(shake(w, q.hit, 0.1, 0.4)).add(shake(w, q.land, 0.14, 0.4));
        aim(ctx.camera, cp, V(ORANGE_X + 1.3, 1.3 + fl * 1.3 - seg(w, q.land, q.freeze) * 0.45, 72 - seg(w, q.hit, q.land) * 4.5), 0.01);
        ctx.camera.fov = 48 - seg(lt, q.freeze, q.ad) * 6; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) {
        const g = P.grade.uniforms, f = seg(lt, q.freeze, q.freeze + 0.12);
        g.sat.value = 1.05 - f * 0.9; g.contrast.value = 1 + f * 0.15; g.vig.value = 0.3 + f * 0.35;
        g.flash.value = Math.max(0, 1 - Math.abs(lt - q.hit) * 10) * 0.4 + Math.max(0, 1 - Math.abs(lt - q.freeze) * 12) * 0.5 + Math.max(0, 1 - Math.abs(lt - q.cont) * 8) * 0.6;
        g.zoom.value = Math.max(0, 1 - Math.abs(lt - q.hit) * 5) * 0.1;
      },
      hud(lt) {
        return (lt < q.freeze ? HUD.caption(lt, 0.0, q.hit + 0.2, "it's Orlando. / there are *always* tourists 🐭", { y: 300, size: 62, per: 0 })
          + HUD.gameHud({ secs: eta(START.crash + lt), tip: 50, btn: true, boost: Math.max(0, 1 - Math.abs(lt - q.brake) * 6) }) : '')
          + HUD.crashScreen(lt, q);
      },
    };
  },
};

// ---------------------------------------------------------------- 6. STORM: 0% → 100%, rain on Church St
const S_STORM = {
  name: 'storm', dur: DUR('storm'),
  async build() {
    const q = Q('storm');
    const cx = -300, cz = 61;
    const ctx = await exterior({ center: [cx, cz], sky: 'storm', radius: 550, shadowBox: 20, dressR: 110, dressNames: ['Church'], fog: { color: 0x8a9098, density: 0.0035 } });
    const R = await rider(); ctx.scene.add(R.root);
    // rain: thin streaks around the camera
    const N = 2600, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 6), seeds = [];
    const rr = mulberry(99); for (let i = 0; i < N; i++) seeds.push([rr(), rr(), rr()]);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xcfd8e2, transparent: true, opacity: 0.6 }));
    rain.frustumCulled = false; rain.userData.noAO = true; ctx.scene.add(rain);
    // the brick/asphalt gets wet: tighten roughness of every ground-ish material in the scene
    ctx.scene.traverse((o) => { if (o.isMesh && o.material && o.material.roughnessMap && o.position.y < 0.5) { o.material = o.material.clone(); o.material.roughness = 0.25; o.material.color.multiplyScalar(0.65); o.material.envMapIntensity = 1.6; } });
    ctx.scene.backgroundIntensity *= 0.45; ctx.scene.environmentIntensity *= 0.6; ctx.sun.intensity *= 0.3; ctx.renderer.toneMappingExposure *= 0.85;
    const flash = new THREE.DirectionalLight(0xdfe6ff, 0); flash.position.set(cx + 100, 300, cz - 200); ctx.scene.add(flash);
    return {
      ctx, shutter: 0.8,
      update(lt) {
        const z = cz + 1.8, x = cx - 22 + lt * 9;
        R.root.position.set(x, 0, z); R.root.rotation.y = Math.PI / 2;
        R.ride(lt * 9, { lean: 0.48, look: -0.15 });
        const cp = V(cx + 3, 0.85, cz + 4.6).add(handheld(lt, 0.05));
        aim(ctx.camera, cp, V(x, 1.2, z - 0.4), 0.03);
        ctx.camera.fov = 50; ctx.camera.updateProjectionMatrix();
        const c = ctx.camera.position;
        for (let i = 0; i < N; i++) { const [a, b, d] = seeds[i]; const px = c.x - 6 + a * 12, pz = c.z - 10 + b * 12, py = ((d * 12 - lt * 18) % 12 + 12) % 12; pos.set([px, py, pz, px + 0.03, py + 0.55, pz + 0.02], i * 6); }
        geo.attributes.position.needsUpdate = true;
        const fl = Math.max(0, 1 - Math.abs(lt - q.flash) * 9) + Math.max(0, 1 - Math.abs(lt - q.flash - 0.18) * 14) * 0.6;
        flash.intensity = fl * 10;
        ctx.focusSun(R.root.position, 200);
      },
      post(lt, P) { const g = P.grade.uniforms; g.sat.value = 0.8; g.contrast.value = 1.08; g.flash.value = Math.max(0, 1 - Math.abs(lt - q.flash) * 16) * 0.3; g.vig.value = 0.5; },
      hud(lt) {
        return HUD.caption(lt, 0.05, DUR('storm'), 'Florida weather: / 0% → *100%* 🙃', { y: 300, size: 66 })
          + HUD.gameHud({ secs: eta(START.storm + lt), tip: 50, a: 0.85 });
      },
    };
  },
};

// ---------------------------------------------------------------- 7. RAMP: Church Street Station, gates down, SunRail coming → hit the ramp, jump the tracks (slow-mo)
function ramp() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(3.2, 0); sh.lineTo(3.2, 1.1); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.0, bevelEnabled: false }); geo.translate(-3.2, 0, -1.0);
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.5, emissive: 0xff4a00, emissiveIntensity: 0.25 });
  g.add(mesh(geo, orange));
  // chevrons on the slope
  const a = Math.atan2(1.1, 3.2), L = Math.hypot(3.2, 1.1);
  for (let i = 0; i < 4; i++) { const s = (i + 0.5) / 4; const b = box(0.18, 0.02, 1.9, emissive(0xfff07a, 1.6), -3.2 + 3.2 * s, 1.1 * s + 0.02, 0, g); b.rotation.z = a; }
  void L;
  return g; // lip at x = 0 (top 1.1 m), ramp runs back along −x
}
const S_RAMP = {
  name: 'ramp', dur: DUR('ramp'),
  async build() {
    const q = Q('ramp');
    const map = await Wd.loadMap();
    let best = null;
    for (const r of map.rail) for (let i = 0; i < r.pts.length - 1; i++) { const [x, z] = r.pts[i]; const d = Math.hypot(x + 790, z - 63); if (!best || d < best.d) best = { d, a: r.pts[i], b: r.pts[i + 1] }; }
    const dir = V(best.b[0] - best.a[0], 0, best.b[1] - best.a[1]).normalize();
    const tc = (63 - best.a[1]) / (dir.z || 1e-6);
    const X = V(best.a[0] + dir.x * tc, 0, 63);
    const ctx = await exterior({ center: [X.x, X.z], radius: 520, shadowBox: 30, dressR: 90, dressNames: ['Church'], skipDress: [[X.x, X.z, 16]] });
    const yaw = Math.atan2(dir.x, dir.z);
    const tr = Sets.tracks(500); tr.position.copy(X); tr.rotation.y = yaw; ctx.scene.add(tr);
    const dep = Sets.depot(ctx); dep.position.set(-784, 0, 121); ctx.scene.add(dep);
    const gates = [Sets.crossingGate()]; // north side only: keeps the camera side clear
    gates[0].position.set(X.x + 5, 0, X.z - 6); gates[0].rotation.y = Math.PI;
    for (const gt of gates) ctx.scene.add(gt);
    const train = Sets.sunrail(3); ctx.scene.add(train);
    const lip = X.x - 4.2, zr = X.z + 1.8;
    const rp = ramp(); rp.position.set(lip, 0, zr); ctx.scene.add(rp);
    const carrier = new THREE.Group(); ctx.scene.add(carrier);
    const R = await rider(); carrier.add(R.root);
    // slow motion through the air: world time w(lt)
    const a = q.launch + 0.08, b = q.land - 0.08, K = 0.55;
    const W = (t) => (t < a ? t : t < b ? a + (t - a) * K : a + (b - a) * K + (t - b));
    const wL = W(q.launch), F = W(q.land) - wL, v = 13;
    const vy = (4.9 * F * F - 1.1) / F;
    const wTrain = wL + F + 0.12; // cab crosses the road right after he lands
    return {
      ctx, shutter: 0.6,
      update(lt) {
        const w = W(lt);
        let px, py, pitch = 0;
        if (w < wL) { px = lip - v * (wL - w); py = clamp((px - (lip - 3.2)) / 3.2, 0, 1) * 1.1; pitch = px > lip - 3.2 ? Math.atan2(1.1, 3.2) : 0; }
        else if (w < wL + F) { const tau = w - wL; px = lip + v * tau; py = 1.1 + vy * tau - 4.9 * tau * tau; pitch = Math.atan2(vy - 9.8 * tau, v) * 0.7; }
        else { const tau = w - wL - F; px = lip + v * F + v * 0.85 * tau; py = 0; pitch = 0; }
        carrier.position.set(px, Math.max(0, py), zr); carrier.rotation.set(0, Math.PI / 2, 0); carrier.rotateX(-pitch);
        const air = w > wL && w < wL + F;
        R.ride(px - lip + 40, { lean: air ? 0.2 : 0.5, stand: air ? 0.75 : 0.3 + 0.4 * seg(w, wL - 0.3, wL), look: air ? 0.2 : 0, bank: air ? -0.12 * Math.sin((w - wL) / F * Math.PI) : 0 });
        // southbound train (cab local +z) crosses the road at wTrain
        train.position.copy(X).addScaledVector(dir, 12.7 - (w - wTrain) * 22).add(V(0, 0.35, 0)); train.rotation.y = yaw + Math.PI;
        for (const gt of gates) gt.userData.set(lt, 1);
        ctx.focusSun(X, 300);
        // low side camera south of the crossing: he crosses left → right, the train comes at us
        const sm = seg(lt, a, b);
        // low, on the rail line south of the crossing, looking up the tracks into the oncoming train
        const cp = V(X.x + 1.8, 0.95 + sm * 0.1, X.z + 13).add(handheld(lt, 0.03)).add(shake(lt, q.land, 0.1, 0.4)).add(shake(w, wTrain + 0.35, 0.25, 0.6));
        aim(ctx.camera, cp, V(X.x + (px - X.x) * 0.6, 1.5 + py * 0.45, zr - 1), 0.02);
        ctx.camera.fov = 58 - sm * 6; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { const g = P.grade.uniforms, s = seg(lt, a, a + 0.1) * (1 - seg(lt, b, b + 0.1)); g.sat.value = 1.05 + s * 0.15; g.contrast.value = 1 + s * 0.1; g.vig.value = 0.3 + s * 0.25; g.flash.value = Math.max(0, 1 - Math.abs(lt - q.land) * 9) * 0.35; },
      hud(lt) {
        const s = seg(lt, a, a + 0.1) * (1 - seg(lt, b, b + 0.1));
        return HUD.caption(lt, 0.0, q.launch + 0.1, 'SunRail? / *jump it.* 🚆', { y: 330, size: 70, per: 0 })
          + (s > 0 ? `<div class="slowmo" style="opacity:${s}">SLOW-MO</div>` : '')
          + HUD.gameHud({ secs: eta(START.ramp + lt), tip: 50, btn: true, pop: HUD.pop(lt, q.launch + 0.35, 540, 800, 'AIR TIME!', '+$0.00') })
          + HUD.chat(lt, q.land + 0.15, DUR('ramp'), 'my ice is melting 😤', { y: 1150 });
      },
    };
  },
};

export const SHOTS_A = [S_HOOK, S_CLOSED, S_BOOST, S_DODGE, S_CRASH, S_STORM, S_RAMP];
