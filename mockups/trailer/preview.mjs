// Render keyframe stills for review: node trailer/preview.mjs out_dir t1 t2 ...  (or "scene:name:fracs")
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console] ${m.text()}`); });
await page.goto('http://localhost:8123/trailer.html');
await page.waitForFunction(() => window.__booted === true, null, { timeout: 120000 });
const scenes = await page.evaluate(() => window.TRAILER.scenes);
const times = [];
for (const s of specs) {
  if (s.startsWith('scene:')) {
    const [, name, fr] = s.split(':');
    const sc = scenes.find((x) => x.name === name);
    for (const f of (fr || '0.1,0.5,0.9').split(',')) times.push(+(sc.start + sc.dur * Number(f)).toFixed(3));
  } else times.push(Number(s));
}
for (const t of times) {
  const t0 = Date.now();
  const info = await page.evaluate((tt) => window.TRAILER.renderTime(tt), t);
  await page.locator('#frame').screenshot({ path: `${outDir}/t${t.toFixed(2).padStart(6, '0')}.png` });
  console.log(`t=${t} ${info.scene} lt=${info.lt.toFixed(2)} ${Date.now() - t0}ms`);
}
await browser.close();
