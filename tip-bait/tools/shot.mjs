// Render stills. node tip-bait/tools/shot.mjs <outDir> <lab|trailer> <spec...>  [--sub N] [--scale S]
// spec: a time in seconds | name (shot middle) | name:f1,f2 (fractions of that shot)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const sub = opt('--sub', '1'), scale = opt('--scale', '0.8');
const [outDir, mode, ...specs] = argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--max-gum-fps=1'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/404|GPU stall/.test(m.text())) console.log(`[${m.type()}] ${m.text().slice(0, 300)}`); });
await page.goto(`http://localhost:8124/tip-bait/stage.html?mode=${mode}&sub=${sub}&scale=${scale}`);
await page.waitForFunction(() => window.__booted === true, null, { timeout: 300000 });
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
  await page.locator('#frame').screenshot({ path: `${outDir}/${label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`${label} t=${t} ${info.shot} lt=${info.lt.toFixed(2)} ${Date.now() - t0}ms`);
}
await browser.close();
