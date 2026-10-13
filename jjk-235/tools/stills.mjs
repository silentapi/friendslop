// Render stills at given times (seconds) or shot:name:frac. Usage: node tools/stills.mjs <outDir> <spec...>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json', '.jpg': 'image/jpeg' };
const srv = createServer((q, r) => { try { const p = join(root, decodeURIComponent(q.url.split('?')[0])); const b = readFileSync(p); r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const port = srv.address().port;
const [outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto(`http://localhost:${port}/index.html?capture`);
await page.waitForFunction(() => window.__booted === true, null, { timeout: 60000 });
for (const s of specs) {
  const f = await page.evaluate((s) => {
    if (s.startsWith('shot:')) { const [, name, frac] = s.split(':'); const sh = J.shots.find((x) => x.name === name); return Math.round((sh.start + sh.dur * +frac) * J.FPS); }
    return Math.round(+s * J.FPS);
  }, s);
  const url = await page.evaluate((f) => { J.renderFrame(f); return J.canvas.toDataURL('image/jpeg', 0.9); }, f);
  const name = s.replace(/[^a-z0-9.]+/gi, '_');
  writeFileSync(`${outDir}/${name}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', name, 'frame', f);
}
await browser.close(); srv.close();
