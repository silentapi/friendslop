// Records the camera path (title → countdown → run start → big jumps) and reports jerks: per-frame camera
// acceleration and look-direction snaps. node camtest.mjs <order> <outDir>
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs'; import { join } from 'node:path';
const [order = '2', out = '/tmp/cam'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); localStorage.setItem('tipbait:tut', '{"dodge":1,"jump":1,"mega":1,"qte":1}'); }, Number(order));
const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const cam = (draw = false) => page.evaluate((draw) => { window.__tick(1, 1 / 30, draw); const c = window.__camera; const d = c.getWorldDirection(new c.position.constructor()); const r = window.__G.R.root.position; return [c.position.x - r.x, c.position.y - r.y, c.position.z - r.z, d.x, d.y, d.z, window.__G.state]; }, draw); // camera relative to the rider
const track = []; let n = 0;
const rec = async (label, ticks, shotEvery = 0) => { for (let i = 0; i < ticks; i++) { const sh = shotEvery && i % shotEvery === 0; const c = await cam(sh); track.push([label, ...c]); if (process.env.CAMDBG && label === process.env.CAMDBG) console.log(i, c.slice(0, 3).map((v) => v.toFixed(2)).join(' '), await page.evaluate(() => { const g = window.__G; return [g.s.toFixed(1), g.y.toFixed(2), g.v.toFixed(1), (g.camK || 0).toFixed(2), g.slowmo.toFixed(2)].join(' '); })); if (sh) { await page.screenshot({ path: `${out}/${String(n++).padStart(3, '0')}_${label}.jpg`, type: 'jpeg', quality: 75 }); } } };
await rec('title', 30, 15);
await page.click('#play'); await page.waitForSelector('#accept'); await rec('order', 10); await page.click('#accept');
for (let i = 0; i < 200 && (await page.evaluate(() => window.__G.state)) !== 'run'; i++) { const c = await cam(i % 8 === 0); track.push(['count', ...c]); if (i % 8 === 0) { await page.screenshot({ path: `${out}/${String(n++).padStart(3, '0')}_count.jpg`, type: 'jpeg', quality: 75 }); } await page.waitForTimeout(25); }
await page.evaluate(() => { window.__G.invT = 999; });
await rec('run', 90, 15);
for (const kind of ['mega', 'rail']) {
  const ok = await page.evaluate((k) => { const g = window.__G, r = g.lv.ramps.find((r) => r[k]); if (!r) return false; g.s = r.s - 40; g.lane = 1; g.lat = 0; g.invT = 999; return true; }, kind);
  if (!ok) continue;
  await rec('pre' + kind, 20);
  track.push(['cut']);
  await rec(kind, 110, 10);
}
// jerk report: camera acceleration (m/s²) and look-direction angular speed (deg/s), per segment
const rep = {}; let prev = null, pv = null;
for (const t of track) {
  if (t[0] === 'cut') { prev = null; pv = null; continue; }
  const [label, x, y, z, dx, dy, dz] = t;
  if (prev) { const v = [(x - prev[1]) * 30, (y - prev[2]) * 30, (z - prev[3]) * 30]; if (pv) { const a = Math.hypot(v[0] - pv[0], v[1] - pv[1], v[2] - pv[2]) * 30; const ang = Math.acos(Math.min(1, dx * prev[4] + dy * prev[5] + dz * prev[6])) * 180 / Math.PI * 30; const r = (rep[label] ||= { maxAcc: 0, maxTurn: 0, frames: 0 }); if (a > r.maxAcc) { r.maxAcc = a; r.at = r.frames; }  r.maxTurn = Math.max(r.maxTurn, ang); r.frames++; } pv = v; }
  prev = t;
}
for (const [k, r] of Object.entries(rep)) console.log(k.padEnd(9), 'max accel', r.maxAcc.toFixed(0).padStart(5), 'm/s²  max turn', r.maxTurn.toFixed(0).padStart(4), '°/s  frames', r.frames, 'peak@', r.at);
await browser.close();
