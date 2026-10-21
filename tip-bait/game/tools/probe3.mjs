import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs'; import { join } from 'node:path';
const [order='1', from='200', to='270'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); }, Number(order));
const page = await ctx.newPage();
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.click('#play'); await page.waitForSelector('#accept'); await page.click('#accept');
for (let i = 0; i < 400 && (await page.evaluate(() => window.__G.state)) !== 'run'; i++) await page.evaluate(() => window.__tick(3, 1 / 30, false)); // countdown runs on the game clock
console.log(JSON.stringify(await page.evaluate(([a,b]) => window.__G.lv.obs.filter(o => o.s > a && o.s < b).map(o => ({k:o.kind, s:+o.s.toFixed(1), lat:o.lat, h:o.h, m:!!o.merge, to:o.to, v:o.v})), [Number(from), Number(to)])));
await browser.close();
// optional: node probe3.mjs <order> <from> <to> shots <outDir> — teleport ahead of each new skill check and screenshot it
if (process.argv[5] === 'shots') {
  const out = process.argv[6];
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const c2 = await b2.newContext({ viewport: { width: 1280, height: 720 } });
  await c2.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
  await c2.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await c2.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); localStorage.setItem('tipbait:tut', JSON.stringify({ dodge: 1, jump: 1 })); }, Number(order));
  const pg = await c2.newPage();
  await pg.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await pg.click('#play'); await pg.waitForSelector('#accept'); await pg.click('#accept');
  for (let i = 0; i < 400 && (await pg.evaluate(() => window.__G.state)) !== 'run'; i++) await pg.evaluate(() => window.__tick(3, 1 / 30, false)); // countdown runs on the game clock
  for (const kind of ['merge', 'jersey', 'wall']) {
    const ok = await pg.evaluate((k) => { const g = window.__G; const o = g.lv.obs.find((o) => k === 'merge' ? o.merge : k === 'wall' ? o.wall : o.kind === k); if (!o) return false; g.s = o.s - 46; g.invT = 999; g.runT = 5; g.v = g.base; g.lane = 1; return true; }, kind);
    if (!ok) { console.log('no', kind); continue; }
    for (let k = 0; k < 4; k++) { await pg.evaluate(() => window.__tick(6, 1 / 30, false)); await pg.evaluate(() => window.__tick(1, 1 / 30, true)); await pg.screenshot({ path: `${out}/${kind}_${k}.jpg`, type: 'jpeg', quality: 80 }); }
  }
  await b2.close();
}
