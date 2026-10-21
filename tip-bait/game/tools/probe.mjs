import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 200)));
page.on('requestfailed', (r) => console.log('[reqfail]', r.url(), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html');
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(10000);
  const st = await page.evaluate(() => ({ st: window.__G?.state, ready: window.__ready, bar: document.querySelector('#load .bar i')?.style.width, tag: document.querySelector('#load .tagline')?.textContent }));
  console.log(i, JSON.stringify(st));
  if (st.ready) break;
}
await page.screenshot({ path: out });
await browser.close();
