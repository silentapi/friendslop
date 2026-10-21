// Build: bundle src/ into one ES module (three stays external via the page's import map), inline it into
// dist/index.html, copy assets. node tip-bait/game/build.mjs
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
rmSync(dist, { recursive: true, force: true }); mkdirSync(dist, { recursive: true });
execSync(`npx -y esbuild@0.24.0 ${join(here, 'src/game.js')} --bundle --format=esm --target=es2020 --minify --external:three --external:'three/addons/*' --outfile=${join(dist, 'game.js')}`, { stdio: 'inherit' });
const js = readFileSync(join(dist, 'game.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(here, 'index.html'), 'utf8').replace('<script type="module" src="./game.js"></script>', () => `<script type="module">\n${js}\n</script>`);
writeFileSync(join(dist, 'index.html'), html);
rmSync(join(dist, 'game.js'));
cpSync(join(here, 'assets'), join(dist, 'assets'), { recursive: true, filter: (f) => !f.endsWith('.glb') });
console.log('built', (html.length / 1024).toFixed(0), 'KB page');

// Self-hosted build for a plain web server (VPS): three.js is bundled in (no CDN), the page gets a real document
// shell, and the bundle stays a separate cacheable file. Output: dist-site/
const site = join(here, 'dist-site');
rmSync(site, { recursive: true, force: true }); mkdirSync(site, { recursive: true });
execSync(`npx -y esbuild@0.24.0 ${join(here, 'src/game.js')} --bundle --format=esm --target=es2020 --minify --outfile=${join(site, 'game.js')}`, { stdio: 'inherit' });
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Deliver Kyle S's Starbucks order across Downtown Orlando to Citi Tower, floor 20. Will he tip?">
<meta property="og:title" content="TIP BAIT">
<meta property="og:description" content="Deliver the order. Dodge the LYNX. Jump the SunRail. Kyle S promised a tip.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚲</text></svg>">
`;
const page = head + readFileSync(join(here, 'index.html'), 'utf8')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace(/<meta name="claude:[^>]*>\n?/, '')
  .replace('<script type="module" src="./game.js"></script>', '<script type="module" src="./game.js?v=' + Date.now().toString(36) + '"></script>') + '\n</html>\n';
writeFileSync(join(site, 'index.html'), page);
cpSync(join(here, 'assets'), join(site, 'assets'), { recursive: true, filter: (f) => !f.endsWith('.glb') });
console.log('built dist-site/ for self-hosting');
