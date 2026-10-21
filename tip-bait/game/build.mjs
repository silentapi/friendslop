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
// Link previews (Discord, iMessage, Slack, X): crawlers need an absolute og:image URL, so pass the site's public
// origin at build time (default: where it's hosted now): SITE_URL=http://host:port node tip-bait/game/build.mjs
const SITE = (process.env.SITE_URL ?? 'http://media.basedboats.com:8000').replace(/\/+$/, '');
if (!SITE) console.warn('SITE_URL not set: og:image is relative, so Discord/iMessage previews will show no image');
const ogImg = `${SITE}/assets/og.png?v=1`;
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Deliver Kyle S's iced coffee across Downtown Orlando to Citi Tower, floor 20. He promised a tip. He always promises a tip.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TIP BAIT">
<meta property="og:title" content="TIP BAIT — he promised a tip 🛵">
<meta property="og:description" content="Dodge the LYNX. Jump the SunRail. Outrun the other courier. Climb 20 floors. Kyle S still won't tip. Can you get the perfect run?">
${SITE ? `<meta property="og:url" content="${SITE}/">\n` : ''}<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TIP BAIT: a delivery courier mid-air over a LYNX bus in Downtown Orlando">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="TIP BAIT — he promised a tip 🛵">
<meta name="twitter:description" content="Dodge the LYNX. Jump the SunRail. Climb 20 floors. Kyle S still won't tip.">
<meta name="twitter:image" content="${ogImg}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚲</text></svg>">
`;
const page = head + readFileSync(join(here, 'index.html'), 'utf8')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace(/<meta name="claude:[^>]*>\n?/, '')
  .replace('<script type="module" src="./game.js"></script>', '<script type="module" src="./game.js?v=' + Date.now().toString(36) + '"></script>') + '\n</html>\n';
writeFileSync(join(site, 'index.html'), page);
cpSync(join(here, 'assets'), join(site, 'assets'), { recursive: true, filter: (f) => !f.endsWith('.glb') });
console.log('built dist-site/ for self-hosting');
