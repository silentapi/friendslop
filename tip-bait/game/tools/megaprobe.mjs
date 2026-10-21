// teleport in front of the mega ramp and log the jump frame by frame; node megaprobe.mjs <order> <outDir>
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs'; import { join } from 'node:path';
const [order = '1', out = '/tmp/mega'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); localStorage.setItem('tipbait:tut', '{"dodge":1,"jump":1,"mega":1}'); }, Number(order));
const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.click('#play'); await page.waitForSelector('#accept'); await page.click('#accept');
for (let i = 0; i < 400 && (await page.evaluate(() => window.__G.state)) !== 'run'; i++) await page.evaluate(() => window.__tick(3, 1 / 30, false)); // countdown runs on the game clock
const kind = process.argv[4] || 'mega';
await page.evaluate((kind) => { const g = window.__G; const r = g.lv.ramps.find((r) => r[kind]); g.s = r.s - 30; g.lane = 1; g.lat = 0; g.runT = 5; g.v = g.base; }, kind);
let pressed = false;
for (let k = 0; k < 140; k++) {
  await page.evaluate(() => window.__tick(1, 1 / 30, false));
  const r = await page.evaluate((kind) => { const g = window.__G, m = g.lv.ramps.find((r) => r[kind]); return { st: g.state, ds: +(g.s - m.s).toFixed(2), y: +g.y.toFixed(2), vy: +g.vy.toFixed(1), v: +g.v.toFixed(1), slow: +g.slowmo.toFixed(2), qte: g.qte ? [g.qte.key, +(1 - g.qte.t / g.qte.dur).toFixed(2)] : null, air: g.airKind, cam: +(g.camK || 0).toFixed(2), kind: g.crashKind }; }, kind);
  if (k % 2 === 0 || r.qte) console.log(JSON.stringify(r));
  if (r.qte && r.qte[1] < 0.2 && !pressed && process.argv[5] !== 'miss') { pressed = true; const key = r.qte[0].replace('arrow', 'Arrow').replace(/Arrow(.)/, (m, c) => 'Arrow' + c.toUpperCase()); await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key); }
  if ([20, 30, 40, 50, 60, 75, 90].includes(k)) { await page.evaluate(() => window.__tick(1, 1 / 30, true)); await page.screenshot({ path: `${out}/${kind}_${k}.jpg`, type: 'jpeg', quality: 80 }); }
  if (r.st !== 'run' || r.ds > 40) break;
}
await browser.close();
