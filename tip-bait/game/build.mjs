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
const html = readFileSync(join(here, 'index.html'), 'utf8').replace('<script type="module" src="./game.js"></script>', `<script type="module">\n${js}\n</script>`);
writeFileSync(join(dist, 'index.html'), html);
rmSync(join(dist, 'game.js'));
cpSync(join(here, 'assets'), join(dist, 'assets'), { recursive: true });
console.log('built', (html.length / 1024).toFixed(0), 'KB page');
