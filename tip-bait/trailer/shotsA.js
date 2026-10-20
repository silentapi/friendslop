// Shots 1–7: the bait → closed Starbucks → pickup on S Orange Ave → LYNX dodge → tourists → storm → SunRail.
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
      post(lt, P) { const g = P.grade.uniforms; g.flash.value = lt > q.slam ? Math.max(0, 1 - (lt - q.slam) * 9) * 0.7 : 0; g.zoom.value = lt > q.slam ? (1 - seg(lt, q.slam, q.slam + 0.4)) * 0.08 : 0; },
      hud(lt) {
        return HUD.caption(lt, 0.02, DUR('hook'), 'POV: Kyle promised you / a *$50* tip', { y: 290, size: 70, per: 0 })
          + HUD.orderCard(lt, q.card, q.accept, { y: 470 });
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
    const path = [[SUMMERLIN.x - 4.4, SUMMERLIN.z + 24], [SUMMERLIN.x - 4.9, SUMMERLIN.z + 1.6]];
    ctx.focusSun(V(SUMMERLIN.x, 0, SUMMERLIN.z), 300);
    return {
      ctx,
      update(lt) {
        const k = easeOut(seg(lt, 0, q.brake + 0.2));
        const s = k * 22.4;
        const { p, yaw } = along(path, s);
        R.root.position.copy(p); R.root.rotation.y = yaw;
        const stopped = lt > q.brake + 0.15;
        R.ride(s, { lean: 0.3, footDown: smooth(seg(lt, q.brake, q.brake + 0.3)), look: stopped ? 0 : -0.1 });
        if (stopped) { const hd = R.C.bone('Head'); hd.rotateY(-0.7 * smooth(seg(lt, q.sign - 0.1, q.sign + 0.2))); hd.updateMatrixWorld(true); }
        const push = easeInOut(seg(lt, 0, DUR('closed')));
        const cp = lerpV([SUMMERLIN.x - 4.4, 1.5, SUMMERLIN.z - 5.6], [SUMMERLIN.x - 4.6, 1.5, SUMMERLIN.z - 4.9], push).add(handheld(lt, 0.025));
        aim(ctx.camera, cp, V(SUMMERLIN.x - 7.2, 1.45, SUMMERLIN.z - 0.6), -0.02);
        ctx.camera.fov = 62; ctx.camera.updateProjectionMatrix();
      },
      hud(lt) {
        return HUD.place(lt, 0.05, DUR('closed'), 'Starbucks', '20 N Summerlin Ave')
          + HUD.caption(lt, q.sign, DUR('closed'), 'nearest Starbucks: / ~closed~ 💀', { y: 880, size: 66 })
          + HUD.notif(lt, q.reroute, DUR('closed'), 'Rerouting… 🔁', 'Starbucks · 325 S Orange Ave · +1.1 mi', { y: 1180 });
      },
    };
  },
};

// ---------------------------------------------------------------- 3. PICKUP: 325 S Orange Ave, the barista slides it, he grabs and spins
const SB2 = { x: -604, z: 226 };
const S_PICKUP = {
  name: 'pickup', dur: DUR('pickup'),
  async build() {
    const q = Q('pickup');
    const ctx = await exterior({ center: [SB2.x, SB2.z], radius: 400, shadowBox: 12, dressR: 80, dressNames: ['Orange'], water: false });
    // store box around the counter (walls, ceiling), front glass looking out on Orange Ave behind the camera
    const room = new THREE.Group(); room.position.set(SB2.x, 0, SB2.z); room.rotation.y = -Math.PI / 2; ctx.scene.add(room);
    const counter = Sets.pickupCounter(ctx); room.add(counter);
    box(10, 0.05, 8, mat(0x6a4a34, { roughness: 0.45 }), 0, 0.01, 1.5, room, { cast: false });
    box(10, 0.2, 8, mat(0x2a221c), 0, 4.1, 1.5, room);
    for (const sx of [-1, 1]) box(0.2, 4.2, 8, mat(0xd6d1c8, { roughness: 0.8 }), sx * 5, 2.1, 1.5, room);
    const R = await rider({ cup: false }); room.add(R.root); R.bike.visible = false;
    const B = await mixCharacter('cast/barista.glb', { maps: { casualsuit01: 'cast/tex/barista_shirt.jpg' } }); await B.load('av-idle-male', 'idle');
    room.add(B.root); B.root.position.set(0.9, 0, -0.85);
    const apron = box(0.42, 0.62, 0.04, mat(0x0e5a3a, { roughness: 0.8 })); B.attach('Spine', apron, [0, 0.05, 0.13]);
    const cup = coldCup(1); room.add(cup);
    const shelf = V(0.9, 1.12, -0.35), slideTo = V(0.75, 1.12, 0.12);
    return {
      ctx, fx: { ao: 0.5 },
      update(lt) {
        // barista: idle + right hand pushes the cup across
        B.pose([['av-idle-male', 3 + lt]]);
        const sl = easeInOut(seg(lt, q.slide, q.grab - 0.15));
        const cupP = shelf.clone().lerp(slideTo, sl);
        if (lt < q.grab + 0.05) { const w = room.localToWorld(cupP.clone().add(V(0, 0.1, -0.05))); ik2(B.bone('RightArm'), B.bone('RightForeArm'), B.bone('RightHand'), w, room.localToWorld(V(1.6, 0.6, -1.4))); }
        // courier: walks in, reaches, grabs, spins away
        const spin = easeIn(seg(lt, q.spin, DUR('pickup')));
        R.walk(lt > q.spin ? 'jog' : 'idle', lt * (lt > q.spin ? 1.2 : 1), { offset: V(0.55 + spin * 2.6, 0, 0.75 + spin * 0.4), yaw: Math.PI - smooth(seg(lt, q.spin, q.spin + 0.25)) * Math.PI / 2 });
        const reach = smooth(seg(lt, q.grab - 0.35, q.grab));
        if (lt < q.spin) { const hand = room.localToWorld(slideTo.clone().add(V(0.02, 0.12, 0.02))); const rest = R.C.boneWorld('RightHand'); ik2(R.C.bone('RightArm'), R.C.bone('RightForeArm'), R.C.bone('RightHand'), rest.lerp(hand, reach), room.localToWorld(V(1.4, 0.8, 1.6))); }
        if (lt > q.grab) { const h = R.C.boneWorld('RightHand'); cup.position.copy(room.worldToLocal(h)).add(V(0, -0.1, 0)); cup.rotation.set(0, 0, 0); }
        else cup.position.copy(cupP);
        // camera: low over the counter, customer side; whip pan on the spin
        const cpL = lerpV([-1.9, 1.6, 2.1], [-1.6, 1.55, 1.8], easeInOut(seg(lt, 0, q.spin))).add(handheld(lt, 0.02));
        const tgL = lerpV([0.7, 1.25, 0.0], [1.7, 1.3, 0.7], easeInOut(seg(lt, q.spin, DUR('pickup'))));
        aim(ctx.camera, room.localToWorld(cpL), room.localToWorld(tgL), -0.03 - spin * 0.25);
        ctx.camera.fov = 50; ctx.camera.updateProjectionMatrix();
      },
      post(lt, P) { P.grade.uniforms.zoom.value = seg(lt, q.spin + 0.15, DUR('pickup')) * 0.08; },
      hud(lt) {
        return HUD.place(lt, 0.05, q.spin, 'Starbucks', '325 S Orange Ave')
          + HUD.chat(lt, q.chat, DUR('pickup'), 'where r u', { y: 1150 });
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

// ---------------------------------------------------------------- 5. TOURISTS: Orange & Church crosswalk, mouse ears, slowly
const S_TOURISTS = {
  name: 'tourists', dur: DUR('tourists'),
  async build() {
    const q = Q('tourists');
    const ctx = await exterior({ center: [ORANGE_X, 70], radius: 600, shadowBox: 18, dressR: 120, dressNames: ['Orange', 'Church'], skipDress: [[ORANGE_X, 63, 7]] });
    const R = await rider(); ctx.scene.add(R.root);
    const crowd = [];
    const kinds = ['tourist_m', 'tourist_f', 'local_m', 'tourist_f', 'tourist_m', 'local_f', 'tourist_m'];
    for (let i = 0; i < kinds.length; i++) {
      const c = await mixCharacter(`cast/${kinds[i]}.glb`, { maps: { casualsuit04: 'cast/tex/tourist_m_shirt.jpg', casualsuit02: 'cast/tex/tourist_f_shirt.jpg', casualsuit01: 'cast/tex/local_f_shirt.jpg' } });
      await c.load('walk');
      if (kinds[i].startsWith('tourist')) c.attach('Head', Sets.mouseEars(), [0, 0.1, 0], [0, 0, 0], 1.5);
      ctx.scene.add(c.root);
      crowd.push({ c, x0: ORANGE_X + 0.9 + i * 0.6 - (i % 2) * 0.3, z: 68.6 + (i % 3) * 0.7, sp: 0.55 + (i % 3) * 0.08, ph: i * 0.37 });
    }
    return {
      ctx,
      update(lt) {
        const k = easeOut(seg(lt, 0, q.brake + 0.25));
        const z = 82 - k * 6.5;
        R.root.position.set(ORANGE_X + 1.2, 0, z); R.root.rotation.y = Math.PI;
        R.ride(k * 6.5, { lean: 0.35 - seg(lt, q.brake, q.brake + 0.3) * 0.1, footDown: smooth(seg(lt, q.brake + 0.1, q.brake + 0.4)) });
        for (const p of crowd) { p.c.root.position.set(p.x0 - p.sp * (lt + 1), 0, p.z); p.c.root.rotation.y = -Math.PI / 2; p.c.pose([['walk', p.ph + lt * 0.75]]); }
        ctx.focusSun(V(ORANGE_X, 0, 70), 300);
        const cp = V(ORANGE_X + 0.3, 0.75, 61.5).add(handheld(lt, 0.03));
        aim(ctx.camera, cp, V(ORANGE_X + 1.4, 1.35, 76), 0.01);
        ctx.camera.fov = 46; ctx.camera.updateProjectionMatrix();
      },
      hud(lt) {
        return HUD.caption(lt, 0.1, DUR('tourists'), "it's Orlando. / there are *always* tourists 🐭", { y: 300, size: 62, per: 0 })
          + HUD.chat(lt, q.chat, DUR('tourists'), '??', { y: 1180 })
          + HUD.place(lt, 0.0, 1.0, 'Orange Ave & Church St', 'Downtown Orlando', { top: 1000 });
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
      post(lt, P) { const g = P.grade.uniforms; g.sat.value = 0.8; g.contrast.value = 1.08; g.flash.value = Math.max(0, 1 - Math.abs(lt - q.flash) * 10) * 0.55; g.vig.value = 0.5; },
      hud(lt) {
        return HUD.caption(lt, 0.05, DUR('storm'), 'Florida weather: / 0% → *100%* 🙃', { y: 300, size: 66 })
          + HUD.gameHud({ secs: eta(START.storm + lt), tip: 50, a: 0.85 });
      },
    };
  },
};

// ---------------------------------------------------------------- 7. SUNRAIL: Church Street Station, gates down, hop the tracks
const S_SUNRAIL = {
  name: 'sunrail', dur: DUR('sunrail'),
  async build() {
    const q = Q('sunrail');
    const map = await Wd.loadMap();
    // rail line near the station: nearest rail vertex to the depot, local direction
    let best = null;
    for (const r of map.rail) for (let i = 0; i < r.pts.length - 1; i++) { const [x, z] = r.pts[i]; const d = Math.hypot(x + 790, z - 63); if (!best || d < best.d) best = { d, a: r.pts[i], b: r.pts[i + 1] }; }
    const dir = V(best.b[0] - best.a[0], 0, best.b[1] - best.a[1]).normalize();
    // crossing point on Church St (z≈63): intersect the rail line with z = 63
    const tc = (63 - best.a[1]) / (dir.z || 1e-6);
    const X = V(best.a[0] + dir.x * tc, 0, 63);
    const ctx = await exterior({ center: [X.x, X.z], radius: 520, shadowBox: 30, dressR: 90, dressNames: ['Church'], skipDress: [[X.x, X.z, 14]] });
    const yaw = Math.atan2(dir.x, dir.z);
    const tr = Sets.tracks(500); tr.position.copy(X); tr.rotation.y = yaw; ctx.scene.add(tr);
    const dep = Sets.depot(ctx); dep.position.set(-784, 0, 121); ctx.scene.add(dep);
    const gates = [Sets.crossingGate(), Sets.crossingGate()];
    gates[0].position.set(X.x + 5, 0, X.z - 6); gates[0].rotation.y = Math.PI; gates[1].position.set(X.x - 5, 0, X.z + 6);
    for (const gt of gates) ctx.scene.add(gt);
    const train = Sets.sunrail(3); ctx.scene.add(train);
    const R = await rider(); ctx.scene.add(R.root);
    return {
      ctx, shutter: 0.7,
      update(lt) {
        // courier eastbound along Church St crossing the rails at q.pass
        const x = X.x + (lt - q.pass) * 10;
        const hop = Math.max(0, Math.sin(seg(lt, q.pass - 0.18, q.pass + 0.16) * Math.PI)) * 0.28;
        R.root.position.set(x, hop, X.z + 1.8); R.root.rotation.y = Math.PI / 2;
        R.ride(lt * 10, { lean: 0.55, stand: 0.6 });
        // train heading south (+dir) reaches the crossing at q.train
        const s = (lt - q.train) * 26;
        // southbound toward the camera: cab (local +z) reaches the crossing at q.train
        train.position.copy(X).addScaledVector(dir, 12.7 - s).add(V(0, 0.35, 0)); train.rotation.y = yaw + Math.PI;
        for (const gt of gates) gt.userData.set(lt, smooth(seg(lt, 0, 0.6)));
        const cp = V(X.x + 13, 3.2, X.z + 13).add(handheld(lt, 0.05)).add(shake(lt, q.train - 0.05, 0.15, 1.0));
        aim(ctx.camera, cp, V(X.x - 1, 1.6, X.z - 1), 0.02);
        ctx.camera.fov = 56; ctx.camera.updateProjectionMatrix();
        ctx.focusSun(X, 300);
      },
      post(lt, P) { P.grade.uniforms.zoom.value = seg(lt, q.train - 0.1, q.train + 0.15) * (1 - seg(lt, q.train + 0.5, DUR('sunrail'))) * 0.05; },
      hud(lt) {
        return HUD.place(lt, 0.0, DUR('sunrail'), 'Church Street Station', 'SunRail · since 1889')
          + HUD.caption(lt, 0.15, DUR('sunrail'), 'SunRail said: / *not today* 🚆', { y: 420, size: 66, per: 0 })
          + HUD.chat(lt, q.chat, DUR('sunrail'), 'my ice is melting 😤', { y: 1150 })
          + HUD.gameHud({ secs: eta(START.sunrail + lt), tip: 50, a: 0.85 });
      },
    };
  },
};

export const SHOTS_A = [S_HOOK, S_CLOSED, S_PICKUP, S_DODGE, S_TOURISTS, S_STORM, S_SUNRAIL];
