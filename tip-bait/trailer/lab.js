// Look-dev lab: characters + materials under the real sky before any shot work.
import { THREE, V, setup, aim, pbr, mesh } from '../engine/core.js';
import { character, clips, helmet, deliveryBag, mixCharacter } from '../engine/chars.js';
import * as Wd from '../engine/world.js';
import { citiTower } from '../engine/citi.js';
import { rider } from '../engine/rider.js';

const still = (name, build) => ({ name, dur: 1, build });
export const SHOTS = [
  still('chars', async () => {
    const ctx = await setup({ sky: 'golden', sunAz: 255, sunEl: 16, shadowBox: 6, fov: 35 });
    const ground = mesh(new THREE.PlaneGeometry(60, 60), pbr('concrete_pavement', { world: 2.5 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ctx.scene.add(ground);
    const road = mesh(new THREE.PlaneGeometry(60, 10), pbr('red_brick_pavers', { world: 1.6 }), { cast: false });
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -6); ctx.scene.add(road);
    const a = await character({ body: 'male', suit: 0xffffff });
    for (const part of ['Body', 'Arms', 'Legs', 'Feet']) await a.wear(`chars/parts/Male_Peasant_${part}.gltf`);
    await a.wear('chars/hair/Hair_Buzzed.gltf');
    a.root.position.set(-0.9, 0, 0); ctx.scene.add(a.root);
    const b = await character({ body: 'male', suit: 0xffffff });
    for (const part of ['Body', 'Arms', 'Legs', 'Feet_Boots']) await b.wear(`chars/parts/Male_Ranger_${part}.gltf`);
    await b.wear('chars/hair/Hair_SimpleParted.gltf'); await b.wear('chars/hair/Hair_Beard.gltf');
    b.root.position.set(0.0, 0, 0); ctx.scene.add(b.root);
    const c = await character({ body: 'female', suit: 0xffffff });
    for (const part of ['Body', 'Arms', 'Legs', 'Feet']) await c.wear(`chars/parts/Female_Peasant_${part}.gltf`);
    await c.wear('chars/hair/Hair_Long.gltf');
    c.root.position.set(0.9, 0, 0); ctx.scene.add(c.root);
    ctx.focusSun(V(0, 1, 0), 60);
    return {
      ctx, fx: { ao: 1 },
      update(t) {
        a.pose([['Sprint_Loop', t * 0.3]]);
        b.pose([['Idle_TalkingPhone_Loop', t]]);
        c.pose([['Idle_FoldArms_Loop', t]]);
        aim(ctx.camera, V(0.4, 1.3, 5.2), V(0, 1.0, 0));
      },
    };
  }),
];

SHOTS.push(still('mix', async () => {
  const ctx = await setup({ sky: 'golden', sunAz: 255, sunEl: 16, shadowBox: 6, fov: 35 });
  const ground = mesh(new THREE.PlaneGeometry(60, 60), pbr('concrete_pavement', { world: 2.5 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; ctx.scene.add(ground);
  const a = await mixCharacter('mixamo/readyplayer.me.glb'); await a.load('jog'); a.root.position.set(-0.9, 0, 0); ctx.scene.add(a.root);
  const b = await mixCharacter('mixamo/Soldier.glb'); await b.load('av-call-me'); b.root.position.set(0, 0, 0); ctx.scene.add(b.root);
  const c = await mixCharacter('mixamo/Michelle.glb'); await c.load('taunt'); c.root.position.set(0.9, 0, 0); ctx.scene.add(c.root);
  ctx.focusSun(V(0, 1, 0), 60);
  return { ctx, update(t) { a.pose([['jog', t]]); b.pose([['av-call-me', 2 + t]]); c.pose([['taunt', 1 + t]]); aim(ctx.camera, V(0.2, 1.2, 7.5), V(0, 0.95, 0)); } };
}));

SHOTS.push(still('kyle', async () => {
  const ctx = await setup({ sky: 'golden', sunAz: 255, sunEl: 16, shadowBox: 6, fov: 30 });
  const ground = mesh(new THREE.PlaneGeometry(60, 60), pbr('concrete_pavement', { world: 2.5 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; ctx.scene.add(ground);
  const LOOK = { maps: { casualsuit06: 'cast/tex/kyle_fit.jpg', shoes05: 'cast/tex/kyle_shoes.jpg' } };
  const k = await mixCharacter('cast/kyle.glb', LOOK); await k.load('taunt', 'av-leaning-wall'); k.root.position.set(-0.45, 0, 0); ctx.scene.add(k.root);
  const k2 = await mixCharacter('cast/courier.glb'); k2.root.position.set(0.55, 0, 0); ctx.scene.add(k2.root); await k2.load('av-call-me');
  const bb = new THREE.Box3().setFromObject(k.root); console.warn('kyle height', (bb.max.y - bb.min.y).toFixed(3));
  ctx.focusSun(V(0, 1, 0), 60);
  return { ctx, update(t) { k.pose([['taunt', 1.2 + t]]); k2.pose([['av-call-me', 3 + t]]); aim(ctx.camera, V(0.1, 1.3, 5.6), V(0.05, 1.0, 0)); } };
}));

SHOTS.push(still('cast', async () => {
  const ctx = await setup({ sky: 'golden', sunAz: 235, sunEl: 18, shadowBox: 8, fov: 34 });
  const ground = mesh(new THREE.PlaneGeometry(60, 60), pbr('concrete_pavement', { world: 2.5 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; ctx.scene.add(ground);
  const cast = [['courier', 'jog', 0], ['kyle', 'av-leaning-wall', 0], ['tourist_m', 'walk', 0.3], ['tourist_f', 'walk', 0.7], ['local_f', 'av-call-me', 2], ['local_m', 'idle', 1], ['barista', 'av-idle-male', 0]];
  const C = [];
  for (let i = 0; i < cast.length; i++) {
    const [n, clip, off] = cast[i];
    const c = await mixCharacter(`cast/${n}.glb`); await c.load(clip); c.root.position.set((i - 3) * 0.85, 0, (i % 2) * -0.6); ctx.scene.add(c.root); C.push([c, clip, off]);
  }
  const helm = helmet(); C[0][0].attach('Head', helm, [0, 0.11, 0.01], [0, 0, 0], 1);
  const bag = deliveryBag(); C[0][0].attach('Spine2', bag, [0, 0.05, -0.27], [0, Math.PI, 0], 1);
  ctx.focusSun(V(0, 1, 0), 60);
  return { ctx, update(t) { for (const [c, clip, off] of C) c.pose([[clip, off + t]]); aim(ctx.camera, V(0.2, 1.35, 8.4), V(0, 0.95, -0.2)); } };
}));

async function city(center, radius = 700, sky = 'golden') {
  const ctx = await setup({ sky, sunAz: 218, sunEl: 20, shadowBox: 60, fov: 50 });
  await Wd.ground(ctx, { center });
  await Wd.buildings(ctx, { center, radius });
  await Wd.streets(ctx, { center, radius });
  await Wd.water(ctx);
  return ctx;
}
SHOTS.push(still('aerial', async () => {
  const ctx = await city([-200, -100], 1100);
  ctx.focusSun(V(-200, 0, -100), 900);
  return { ctx, fx: { ao: 0 }, update() { aim(ctx.camera, V(-180, 260, 420), V(-260, 40, -150)); } };
}));
SHOTS.push(still('street', async () => {
  const ctx = await city([-30, 40], 450);
  ctx.focusSun(V(-30, 0, 40), 400);
  return { ctx, update() { aim(ctx.camera, V(-40, 1.6, 75), V(-25, 6, 10)); } };
}));

SHOTS.push(still('citiA', async () => {
  const ctx = await city([-20, 20], 500);
  const T = await citiTower(ctx);
  ctx.focusSun(V(-10, 0, 10), 300);
  const c = T.userData.corner;
  return { ctx, update() { aim(ctx.camera, c.clone().add(V(-24, 1.4, 26)), c.clone().add(V(6, 26, -8))); } };
}));
SHOTS.push(still('citiB', async () => {
  const ctx = await city([-20, 20], 500);
  const T = await citiTower(ctx);
  ctx.focusSun(V(-10, 0, 10), 300);
  const c = T.userData.corner, s = T.userData.signMid;
  return { ctx, update() { aim(ctx.camera, c.clone().add(V(-13.5, 1.6, 8)), V(s.x - 2.0, 3.2, s.z - 3)); } };
}));

SHOTS.push(still('citiDbg', async () => {
  const ctx = await city([-20, 20], 300);
  const T = await citiTower(ctx);
  ctx.focusSun(V(-10, 0, 10), 300);
  T.traverse((o) => { if (o.isInstancedMesh) o.visible = false; });
  const c = T.userData.corner;
  return { ctx, update() { aim(ctx.camera, c.clone().add(V(-24, 30, 26)), c.clone().add(V(6, 40, -8))); } };
}));

for (const [nm, cp] of [['riderSide', [3.2, 1.2, 0.2]], ['rider34', [2.0, 1.5, 2.6]]]) SHOTS.push(still(nm, async () => {
  const ctx = await setup({ sky: 'golden', sunAz: 218, sunEl: 20, shadowBox: 5, fov: 35 });
  const ground = mesh(new THREE.PlaneGeometry(60, 60), pbr('red_brick_pavers', { world: 2.2, color: 0xd8c8c0 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; ctx.scene.add(ground);
  const R = await rider(); ctx.scene.add(R.root);
  ctx.focusSun(V(0, 0.5, 0), 60);
  return { ctx, update(t) { R.ride(3 + t * 6, { lean: 0.35 }); aim(ctx.camera, V(...cp), V(0, 0.95, 0.1)); } };
}));
