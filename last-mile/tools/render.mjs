// Render all trailer frames in parallel browsers. node last-mile/tools/render.mjs <outDir> [workers=4] [from] [to]
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const [outDir, workersArg = '4', fromArg, toArg] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
async function open() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGS });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto('http://localhost:8124/last-mile/stage.html?mode=trailer');
  await page.waitForFunction(() => window.__booted === true, null, { timeout: 300000 });
  return { browser, page };
}
const probe = await open();
const info = await probe.page.evaluate(() => ({ frames: window.STAGE.frames, shots: window.STAGE.shots, fps: window.STAGE.fps }));
await probe.browser.close();
const from = fromArg ? Number(fromArg) : 0;
const to = toArg ? Number(toArg) : info.frames;
const N = Number(workersArg);
// split on shot cuts so each worker builds as few sets as possible
const cuts = info.shots.map((s) => Math.round(s.start * info.fps));
const chunks = [];
let a = from;
for (let k = 0; k < N; k++) {
  if (k === N - 1) { chunks.push([a, to]); break; }
  const ideal = a + (to - a) / (N - k);
  const b = cuts.filter((f) => f > a && f < to).reduce((best, f) => (Math.abs(f - ideal) < Math.abs(best - ideal) ? f : best), Math.round(ideal));
  chunks.push([a, b]);
  a = b;
}
console.log('chunks', JSON.stringify(chunks));
const t0 = Date.now();
await Promise.all(chunks.map(async ([s, e], wi) => {
  const { browser, page } = await open();
  for (let f = s; f < e; f++) {
    const path = `${outDir}/f${String(f).padStart(5, '0')}.jpg`;
    if (existsSync(path)) continue;
    for (let attempt = 0; ; attempt++) {
      try {
        await page.evaluate((ff) => window.STAGE.renderFrame(ff), f);
        await page.locator('#frame').screenshot({ path, type: 'jpeg', quality: 94, timeout: 180000 });
        break;
      } catch (err) {
        console.log(`w${wi} frame ${f} retry ${attempt}: ${err.message.split('\n')[0]}`);
        if (attempt >= 3) throw err;
      }
    }
    if ((f - s) % 30 === 0) console.log(`w${wi} ${f}/${e} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}));
console.log(`done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
