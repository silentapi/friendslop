// node evalq.mjs <order> "<js expression using g = window.__G>" — boots the game in QA mode, starts the run, prints the expression
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs'; import { join } from 'node:path';
const [order = '1', expr = 'g.state'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); }, Number(order));
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.click('#play'); await page.waitForSelector('#accept'); await page.click('#accept');
await page.waitForFunction(() => window.__G.state === 'run', null, { timeout: 15000 });
console.log(JSON.stringify(await page.evaluate((e) => { const g = window.__G; return eval(e); }, expr)));
await browser.close();
