// LAST MILE trailer: shot order + the global game HUD (countdown + tip) that runs across gameplay shots.
import { SHOTS_A } from './shotsA.js';
import { SHOTS_B } from './shotsB.js';
import * as HUD from '../engine/hud.js';
import { seg, lerp } from '../engine/core.js';
import { Q } from './kit.js';

export const SHOTS = [...SHOTS_A, ...SHOTS_B];

const SHOW = new Set(['launch', 'traffic', 'train', 'eola', 'arrive', 'stairs', 'slip', 'deliver']);
// game seconds left, keyed to (shot, local time): the clock runs faster than real time and goes red in the stairwell
const KEYS = [['launch', 0, 480], ['arrive', 0, 62], ['elevator', 0, 40], ['stairs', 0, 30], ['slip', 0, 9], ['deliver', 0, 0], ['deliver', Q('deliver').hand, -4]];
export function globalHud(t, starts, i) {
  const name = SHOTS[i].name;
  if (!SHOW.has(name)) return '';
  const abs = KEYS.map(([n, lt, v]) => [starts[SHOTS.findIndex((s) => s.name === n)] + lt, v]);
  let secs = abs[abs.length - 1][1];
  for (let k = 0; k < abs.length - 1; k++) if (t >= abs[k][0] && t < abs[k + 1][0]) secs = lerp(abs[k][1], abs[k + 1][1], seg(t, abs[k][0], abs[k + 1][0]));
  const lt = t - starts[i];
  const a = name === 'launch' ? seg(lt, 0.3, 0.5) : 1;
  const tipT = starts[SHOTS.findIndex((s) => s.name === 'traffic')] + Q('traffic').miss;
  const zeroT = starts[SHOTS.findIndex((s) => s.name === 'deliver')] + Q('deliver').zero;
  const lost = seg(t, zeroT - 0.05, zeroT + 0.25);
  const tip = (t > tipT + 0.4 ? 42 : 40) - 40 * lost;
  const pulse = secs < 20 && secs > 0 ? Math.max(0, 1 - (secs % 1) * 4) : 0;
  return HUD.hudTop(secs, tip, { a, pulse, tipLost: t > zeroT ? Math.max(0, 1 - (t - zeroT) * 3) + 0.001 : 0 });
}
