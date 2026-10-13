// Render all frames (or a range) to JPEG with parallel headless browsers, then encode with ffmpeg.
// Usage: node tools/render.mjs <outDir> [workers=4] [from] [to] [--mp4 out.mp4] [--scale 0.5]
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = createServer((q, r) => { try { const p = join(root, decodeURIComponent(q.url.split('?')[0])); const b = readFileSync(p); r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const port = srv.address().port;
const args = process.argv.slice(2); const flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const mp4 = flag('--mp4'); const scale = Number(flag('--scale') || 1);
const [outDir, workersArg = '4', fromArg, toArg] = args;
mkdirSync(outDir, { recursive: true });
async function open() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/index.html?capture`);
  await page.waitForFunction(() => window.__booted === true, null, { timeout: 120000 });
  return { browser, page };
}
const probe = await open();
const info = await probe.page.evaluate(() => ({ frames: J.frames, fps: J.FPS, shots: J.shots.map((s) => ({ name: s.name, start: s.start, dur: s.dur })) }));
writeFileSync(`${outDir}/shots.json`, JSON.stringify(info));
await probe.browser.close();
const from = fromArg ? Number(fromArg) : 0, to = toArg ? Number(toArg) : info.frames;
const Wk = Number(workersArg); const per = Math.ceil((to - from) / Wk);
const t0 = Date.now();
await Promise.all([...Array(Wk)].map(async (_, w) => {
  const s = from + w * per, e = Math.min(to, s + per); if (s >= e) return;
  const { browser, page } = await open();
  for (let f = s; f < e; f++) {
    const path = `${outDir}/f${String(f).padStart(5, '0')}.jpg`;
    if (existsSync(path)) continue;
    const url = await page.evaluate(([f, sc]) => { J.renderFrame(f); if (sc === 1) return J.canvas.toDataURL('image/jpeg', 0.92); const c = document.createElement('canvas'); c.width = J.W * sc; c.height = J.H * sc; c.getContext('2d').drawImage(J.canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.9); }, [f, scale]);
    writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
    if ((f - s) % 120 === 0) console.log(`w${w} ${f}/${e} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}));
srv.close();
console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (mp4) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(info.fps), '-start_number', String(from), '-i', `${outDir}/f%05d.jpg`, '-frames:v', String(to - from), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  console.log('wrote', mp4);
}
