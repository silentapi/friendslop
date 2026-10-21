// Mobile QA driver: iPhone-sized touch viewport, CDN three → local copy, console errors, scripted play.
// node tip-bait/game/tools/qa.mjs <outDir> [script]   scripts: smoke | run | finale | crash
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [out = '/tmp/qa', script = 'smoke'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const THREE_DIR = '/home/user/friendslop/tip-bait/node_modules/three';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const MOBILE = process.env.MOBILE === '1';
const ctx = await browser.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => {
  const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', '');
  const f = join(THREE_DIR, p);
  if (existsSync(f)) route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }); else route.fulfill({ status: 404, body: '' });
});
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GPU stall|THREE.WebGLRenderer: Context Lost|ReadPixels/.test(t)) { console.log(`[${m.type()}]`, t.slice(0, 240)); if (m.type() === 'error') errors.push(t); } } });
const t0 = Date.now();
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's');
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 }); console.log('shot', name); };
const wait = (ms) => page.waitForTimeout(ms);
const swipe = async (dx, dy) => { if (!MOBILE) { await page.keyboard.press(dx < 0 ? 'ArrowLeft' : dx > 0 ? 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'Shift'); return; } const x = 195, y = 520; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx * 0.5, y + dy * 0.5, { steps: 2 }); await page.mouse.move(x + dx, y + dy, { steps: 2 }); await page.mouse.up(); };
const state = () => page.evaluate(() => ({ st: window.__G.state, s: +window.__G.s.toFixed(1), L: +window.__G.route.length.toFixed(0), lane: window.__G.lane, y: +window.__G.y.toFixed(2), v: +window.__G.v.toFixed(1), ice: +window.__G.ice.toFixed(0), boost: +window.__G.boostCharge.toFixed(2), crashes: window.__G.crashes }));
await wait(1500); await shot('01_title');
await page.click('#play'); await wait(400);
await page.waitForSelector('#hold', { timeout: 240000 }); await wait(800); await shot('02_order');
const hb = await page.locator('#hold').boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await wait(1200); await page.mouse.up();
await wait(700); await shot('03_count');
await page.waitForFunction(() => window.__G.state === 'run', null, { timeout: 20000 });
console.log('run', JSON.stringify(await state()), 'frameMs', await page.evaluate(() => window.__frameMs?.()));
if (script === 'smoke') { await wait(1500); await shot('04_run'); }
if (script === 'run' || script === 'crash') {
  const moves = [[-90, 0], [0, -90], [90, 0], [90, 0], [0, -90], [-90, 0], [0, 90]];
  for (let i = 0; i < 14; i++) {
    await wait(script === 'crash' ? 700 : 900);
    const st = await state(); console.log(i, JSON.stringify(st));
    if (st.st === 'crashed') { await shot(`crash_${i}`); await page.click('#ad'); await wait(800); await shot(`ad_${i}`); await page.waitForFunction(() => window.__G.state === 'run', null, { timeout: 15000 }); await wait(300); await shot(`cont_${i}`); continue; }
    if (script === 'run') { const [dx, dy] = moves[i % moves.length]; await swipe(dx, dy); }
    if (i % 3 === 1) await shot(`run_${i}`);
  }
}
if (script === 'finale') {
  await page.evaluate(() => { const G = window.__G; G.invT = 999; G.s = G.route.length - 30; });
  await page.waitForFunction(() => window.__G.state === 'finale', null, { timeout: 30000 });
  for (let i = 0; i < 4; i++) { await wait(900); await shot(`arrive_${i}`); }
  await page.mouse.click(MOBILE ? 195 : 640, 300); // tap to go up
  for (let i = 0; i < 4; i++) { await wait(1000); await shot(`elev_${i}`); }
  await page.waitForSelector('#sl', { timeout: 20000 });
  for (let k = 0; k < 44; k++) { await page.locator(k % 2 ? '#sr' : '#sl').dispatchEvent('pointerdown'); await wait(120); if (k % 11 === 5) await shot(`stairs_${k}`); }
  for (let i = 0; i < 9; i++) { await wait(700); await shot(`door_${i}`); }
  await page.waitForSelector('#results', { timeout: 30000 }); await wait(600); await shot('results');
}
console.log('errors:', errors.length);
await browser.close();
