// Render every trailer frame to JPEG using several headless browsers in parallel.
// Usage: node trailer/render.mjs <outDir> [workers=3] [from=0] [to=end]
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const [outDir, workersArg = '3', fromArg, toArg] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

async function openPage() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto('http://localhost:8123/trailer.html');
  await page.waitForFunction(() => window.__booted === true, null, { timeout: 120000 });
  return { browser, page };
}

const probe = await openPage();
const info = await probe.page.evaluate(() => ({ frames: window.TRAILER.frames, fps: window.TRAILER.fps, scenes: window.TRAILER.scenes }));
await probe.browser.close();
const from = fromArg ? Number(fromArg) : 0;
const to = toArg ? Number(toArg) : info.frames;
const W = Number(workersArg);

// split into contiguous chunks aligned to scene starts so each worker builds few scenes
const sceneStartFrames = info.scenes.map((s) => Math.round(s.start * info.fps));
const target = (to - from) / W;
const chunks = [];
let a = from;
for (let k = 0; k < W; k++) {
  if (k === W - 1) { chunks.push([a, to]); break; }
  const ideal = a + target;
  const b = sceneStartFrames.filter((f) => f > a && f < to).reduce((best, f) => (Math.abs(f - ideal) < Math.abs(best - ideal) ? f : best), Math.round(ideal));
  chunks.push([a, b]);
  a = b;
}
console.log('chunks', chunks);

const t0 = Date.now();
await Promise.all(chunks.map(async ([s, e], wi) => {
  const { browser, page } = await openPage();
  for (let f = s; f < e; f++) {
    const path = `${outDir}/f${String(f).padStart(5, '0')}.jpg`;
    if (existsSync(path)) continue;
    await page.evaluate((ff) => window.TRAILER.renderFrame(ff), f);
    await page.locator('#frame').screenshot({ path, type: 'jpeg', quality: 93 });
    if ((f - s) % 24 === 0) console.log(`w${wi} frame ${f}/${e} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await browser.close();
}));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
