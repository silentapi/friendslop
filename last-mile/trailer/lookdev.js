// Look-dev frames: one still per set, to judge light / material / scale before animating.
import { THREE, V, aim } from '../engine/core.js';
import { downtown, courier, trafficNS, C, Lm, Rd } from './kit.js';

const still = (name, build) => ({ name, dur: 1, build });

export const SHOTS = [
  still('street', () => {
    const { ctx } = downtown({ focus: [0, 80], radius: 450, dress: [{ ns: 0, from: -200, to: 400 }] });
    trafficNS(ctx, 0, -200, 400, { n: 12 });
    const K = courier(ctx);
    K.root.position.set(-6, 0, 86);
    K.root.rotation.y = Math.PI * 0.85;
    Rd.rollBike(K.B, 3);
    Rd.poseRide(K.R, K.B, {});
    return { ctx, env: V(-3, 2, 92), fx: { dof: { focus: 4, aperture: 0.0025, maxblur: 0.008 } }, update() { aim(ctx.camera, V(-2.5, 1.0, 90.5), V(-6, 1.0, 86)); } };
  }),
  still('skyline', () => {
    const { ctx } = downtown({ focus: [150, 50], radius: 900, fogFar: 3200, fogNear: 400, shadow: false });
    C.cityLights(ctx, { focus: [150, 50], radius: 900 });
    return { ctx, env: V(150, 60, 50), update() { aim(ctx.camera, V(560, 210, 640), V(120, 30, -10)); } };
  }),
  still('citi2', () => {
    const { ctx, L } = downtown({ focus: [325, 360], radius: 450, landmarks: ['citi', 'lake', 'truist'] });
    const c = L.citi.userData.corner;
    return { ctx, env: c.clone().add(V(-8, 2, 8)), update() { const sg = L.citi.userData.signMid; aim(ctx.camera, V(sg.x - 15, 1.6, sg.z + 4), V(sg.x, 3.2, sg.z - 1)); } };
  }),
  still('citi', () => {
    const { ctx, L } = downtown({ focus: [325, 360], radius: 450, landmarks: ['citi', 'lake', 'truist'] });
    const c = L.citi.userData.corner;
    return { ctx, env: c.clone().add(V(-8, 2, 8)), update() { aim(ctx.camera, c.clone().add(V(-16, 1.3, 20)), c.clone().add(V(4, 18, -4))); } };
  }),
  still('eola', () => {
    const { ctx } = downtown({ focus: [365, -70], radius: 500, shadow: false });
    return { ctx, env: V(250, 3, -60), update() { aim(ctx.camera, V(208, 2.2, -40), V(362, 14, -95)); } };
  }),
];
