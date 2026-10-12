// BIG CRUMB trailer: shot list (order and lengths must match cues.json).
import { CUES } from './kit.js';
import { SHOTS_A } from './scenesA.js';
import { SHOTS_B } from './scenesB.js';

export const SHOTS = [...SHOTS_A, ...SHOTS_B];
const names = SHOTS.map((s) => s.name).join(',');
const cueNames = CUES.shots.map((s) => s.name).join(',');
if (names !== cueNames) throw new Error(`shot order mismatch:\n${names}\n${cueNames}`);
