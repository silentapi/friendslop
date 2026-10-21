import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0, 3).join(' | ')));
page.on('console', (m) => { if (m.type() !== 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.click('#play');
await page.waitForSelector('#hold', { timeout: 120000 });
console.log('order shown', await page.evaluate(() => window.__G.state + ' orders=' + document.querySelectorAll('#order').length + ' holds=' + document.querySelectorAll('#hold').length));
const hb = await page.locator('#hold').boundingBox();
console.log('top elem', await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.tagName + '#' + e.id + '.' + e.className + ' / parent ' + e.parentElement?.id; }, [hb.x + hb.width / 2, hb.y + hb.height / 2]));
await page.evaluate(() => { document.getElementById('hold').addEventListener('pointerdown', () => console.log('PD on hold'), true); window.addEventListener('pointerdown', (e) => console.log('PD window', e.target.id || e.target.className), true); });
console.log('manual', await page.evaluate(async () => { const b = document.getElementById('hold'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); await new Promise((r) => setTimeout(r, 300)); return b.querySelector('.fill').style.width + ' raf? ' + typeof requestAnimationFrame; }));
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); console.log('fill', await page.evaluate(() => document.querySelector('#hold .fill')?.style.width), await page.evaluate(() => window.__G.state)); }
await page.mouse.up();
for (let i = 0; i < 10; i++) { await page.waitForTimeout(500); console.log('st', await page.evaluate(() => window.__G.state + ' ' + document.querySelector('#ui').innerText.slice(0, 60).replace(/\n/g, ' '))); }
await browser.close();
