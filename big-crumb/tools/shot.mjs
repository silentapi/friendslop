// Render stills. node big-crumb/tools/shot.mjs <outDir> <lookdev|trailer> <spec...>
// spec: a time in seconds | name (shot middle) | name:f1,f2 (fractions of that shot)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [outDir, mode, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.log(`[console] ${m.text()}`); });
await page.goto(`http://localhost:8124/big-crumb/stage.html?mode=${mode}`);
await page.waitForFunction(() => window.__booted === true, null, { timeout: 120000 });
const shots = await page.evaluate(() => window.STAGE.shots);
const jobs = [];
for (const s of specs.length ? specs : shots.map((x) => x.name)) {
  if (!isNaN(Number(s))) { jobs.push([Number(s), `t${Number(s).toFixed(2).padStart(6, '0')}`]); continue; }
  const [name, fr] = s.split(':');
  const sc = shots.find((x) => x.name === name);
  if (!sc) { console.log('no shot', name); continue; }
  for (const f of (fr || '0.5').split(',')) jobs.push([+(sc.start + sc.dur * Number(f)).toFixed(3), `${String(shots.indexOf(sc)).padStart(2, '0')}_${name}_${f}`]);
}
for (const [t, label] of jobs) {
  const t0 = Date.now();
  const info = await page.evaluate((tt) => window.STAGE.renderTime(tt), t);
  await page.locator('#frame').screenshot({ path: `${outDir}/${label}.png` });
  console.log(`${label} t=${t} ${info.shot} lt=${info.lt.toFixed(2)} ${Date.now() - t0}ms`);
}
await browser.close();
