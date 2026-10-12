// Renders each mockup shot to screenshots/shot-N.png using headless Chromium.
// Usage: npx http-server -p 8123 -s &  then  node render.mjs [shots...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const shots = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '3', '4', '5'];
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => console.log(`[console] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

for (const s of shots) {
  await page.goto(`http://localhost:8123/index.html?shot=${s}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.locator('#frame').screenshot({ path: `screenshots/shot-${s}.png` });
  console.log(`rendered shot ${s}`);
}
await browser.close();
