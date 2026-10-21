// Deterministic QA: ?qa=1 freezes the game clock; we step it with __tick and drive input with key events.
// node tip-bait/game/tools/qa2.mjs <outDir> [play|crash|finale] [order]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [out = '/tmp/qa2', mode = 'play', order = '1'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { try { localStorage.setItem('tipbait:order', String(o)); } catch {} }, Number(order));
if (process.env.AKIRA_FAIL) await ctx.addInitScript(() => { globalThis.__akiraFail = true; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); });
page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('[error]', m.text().slice(0, 300)); } });
await page.goto(process.env.QA_URL || 'http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const tick = (n, draw = false) => page.evaluate(([n, d]) => window.__tick(n, 1 / 30, d), [n, draw]);
const shot = async (name) => { await tick(1, true); await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 }); };
const key = (k) => page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), k);
const G = () => page.evaluate(() => { const g = window.__G; return { st: g.state, s: +g.s.toFixed(1), L: Math.round(g.route.length), lane: g.lane, y: +g.y.toFixed(2), v: +g.v.toFixed(1), ice: Math.round(g.ice), boost: +g.boostCharge.toFixed(2), crashes: g.crashes, nm: g.nearMiss, eta: Math.round(g.eta), time: Math.round(g.time) }; });
await shot('00_title');
await page.click('#play');
await page.waitForSelector('#accept', { timeout: 180000 });
await tick(3); await shot('01_order');
await page.click('#accept');

await page.waitForTimeout(600); await shot('02_count');
for (let i = 0; i < 400 && (await page.evaluate(() => window.__G.state)) !== 'run'; i++) await page.evaluate(() => window.__tick(3, 1 / 30, false)); // countdown runs on the game clock
if (mode === 'ramp') {
  await page.evaluate(() => { const g = window.__G; g.s = g.rail.s - 48; g.lane = 1; g.lat = 0; g.runT = 5; g.v = g.base; });
  for (let k = 0; k < 70; k++) {
    await tick(2);
    const r = await page.evaluate(() => { const g = window.__G; return { st: g.state, ds: +(g.s - g.rail.s).toFixed(1), y: +g.y.toFixed(2), v: +g.v.toFixed(1), cab: g.trainCab == null ? null : +g.trainCab.toFixed(1), slow: +g.slowmo.toFixed(2), kind: g.crashKind }; });
    if (k % 3 === 0 || r.st !== 'run') console.log(JSON.stringify(r));
    if ([12, 18, 22, 26, 30].includes(k)) await shot(`ramp_${k}`);
    if (r.st !== 'run' || r.ds > 30) break;
  }
  await browser.close(); process.exit(0);
}
// autopilot: pick the lane with the farthest clear road; jump low obstacles; take ramps when lined up
const pilot = () => page.evaluate((crashMode) => {
  const g = window.__G, LANES = g.LANES;
  if (g.state !== 'run' || crashMode) return null;
  const cap = (k) => 'Arrow' + k.slice(5, 6).toUpperCase() + k.slice(6);
  if (g.akira && !g.akira.res) return globalThis.__akiraFail && g.akira.idx === 1 ? 'ArrowUp' === cap(g.akira.seq[1]) ? 'ArrowLeft' : 'ArrowUp' : cap(g.akira.seq[g.akira.idx]);
  if (g.qte) return (1 - g.qte.t / g.qte.dur) < 0.22 ? g.qte.key.replace('arrow', 'Arrow').replace('Arrowup', 'ArrowUp').replace('Arrowdown', 'ArrowDown').replace('Arrowleft', 'ArrowLeft').replace('Arrowright', 'ArrowRight') : null;
  { const m = g.lv.ramps.find((r) => r.mega && r.s - g.s > 0 && r.s - g.s < 45); if (m && g.lane !== 1) return g.lane < 1 ? 'ArrowRight' : 'ArrowLeft'; if (m) return null; }
  const ahead = (li) => {
    let d = 999;
    for (const o of g.lv.obs) if (!o.dead && !o.parked && o.s > g.s - o.len / 2 - 1 && o.h > 1.0 && (Math.abs(o.lat - LANES[li]) < o.w / 2 + 0.5 || (o.merge && (o.mt == null || o.mt < 1) && Math.abs(o.to - LANES[li]) < 1.5))) d = Math.min(d, o.s - g.s);
    for (const w of g.pop.walkers) if (Math.abs(w.lat - LANES[li]) < 1.1 && w.s > g.s - 1 && w.s - g.s < 30) d = Math.min(d, w.s - g.s);
    return d;
  };
  const cur = ahead(g.lane);
  let act = null;
  if (cur < 26) { const best = [0, 1, 2].sort((a, b) => ahead(b) - ahead(a) || Math.abs(a - g.lane) - Math.abs(b - g.lane))[0]; const step = g.lane + Math.sign(best - g.lane); if (ahead(best) > cur && (ahead(step) > 3 || step === best)) act = best < g.lane ? 'ArrowLeft' : 'ArrowRight'; }
  if (!act) for (const o of g.lv.obs) if (!o.dead && o.h <= 1.0 && o.s - g.s > 2.9 && o.s - g.s < 4.7 && Math.abs(o.lat - LANES[g.lane]) < 1.2 && g.y < 0.05) act = 'ArrowUp';
  if (!act && g.rail) { const r = g.lv.ramps.find((r) => r.rail); if (r && r.s - g.s < 30 && r.s - g.s > 0 && g.lane !== 1) act = g.lane < 1 ? 'ArrowRight' : 'ArrowLeft'; }
  if (!act && cur > 30) { const coinsIn = (li) => g.lv.coins.filter((c) => !c.got && c.s - g.s > 2 && c.s - g.s < 16 && Math.abs(c.lat - LANES[li]) < 0.8 && c.y < 2).length; const nb = [g.lane - 1, g.lane + 1].filter((l) => l >= 0 && l <= 2 && ahead(l) > 30).sort((a, b) => coinsIn(b) - coinsIn(a))[0]; if (nb != null && coinsIn(nb) > coinsIn(g.lane) + 1) act = nb < g.lane ? 'ArrowLeft' : 'ArrowRight'; }
  if (!act && g.boostCharge >= 1) act = 'Shift';
  return act;
}, mode === 'crash' || mode === 'coach');
if (mode === 'finale') await page.evaluate(() => { const g = window.__G; g.s = g.route.length - 30; g.invT = 999; g.runT = 5; g.v = g.base; });
let i = 0, crashedOnce = false; const seen = new Set();
const t0 = Date.now();
while (i < 4000) {
  const act = await pilot(); if (act) await key(act);
  await tick(3);
  i += 3;
  const g = await G();
  if (i % 90 === 0) { console.log(i, JSON.stringify(g)); }
  { const q = await page.evaluate(() => { const g = window.__G; return g.qte ? 'QTE ' + g.qte.kind + ' ' + g.qte.key : null; }); if (q && q !== globalThis.lastQ) { console.log(q); await shot('qte_' + i); } globalThis.lastQ = q; }
  if (i % 150 === 0) await shot(`run_${String(i).padStart(4, '0')}`);
  if (mode === 'coach') { const c = await page.evaluate(() => document.querySelector('.coach')?.textContent || ''); if (c && !seen.has(c)) { seen.add(c); console.log('COACH', c); await shot(`coach_${seen.size}`); } if (i > 900) break; }
  if (g.st === 'crashing') { console.log('CRASH', await page.evaluate(() => window.__G.crashKind + ' @' + window.__G.s.toFixed(0))); await tick(12); await shot(`crash_${i}`); }
  if (g.st === 'crashed') {
    await shot(`crashui_${i}`);
    await page.click('#watchad'); await page.waitForTimeout(500); await shot(`ad_${i}`);
    for (let i = 0; i < 400 && (await page.evaluate(() => window.__G.state)) !== 'run'; i++) await page.evaluate(() => window.__tick(3, 1 / 30, false)); // countdown runs on the game clock
    await tick(2); await shot(`continue_${i}`);
    if (mode === 'crash' && crashedOnce) break;
    crashedOnce = true;
  }
  if (g.st === 'finale') break;
}
console.log('run took', ((Date.now() - t0) / 1000).toFixed(0), 's', JSON.stringify(await G()), 'score', await page.evaluate(() => Math.round(window.__G.score) + ' coins ' + window.__G.coins + ' tricks ' + window.__G.tricks));
if ((await G()).st === 'finale') {
  const F = () => page.evaluate(() => { const f = window.__F; return f ? { ph: f.phase, t: +f.t.toFixed(2), meter: f.notice, look: f.dphase === 'looking' && f.phaseT > 0.25, on: f.inputOn, haz: f.haz ? [f.haz.key, f.hazT] : null, u: f.u, fl: f.flights } : null; });
  for (let k = 0; k < 40 && (await F()).ph === 'arrive'; k++) { await tick(4); await shot(`fin_arrive_${String(k).padStart(2, '0')}`); }
  for (let w = 0; w < 60 && (await F()).ph !== 'locked'; w++) await tick(5);
  let k = 0, f;
  while ((f = await F()).ph === 'locked' && k < 400) {
    if (f.on) { if (f.look) await key(' '); else await key(k % 2 ? 'ArrowRight' : 'ArrowLeft'); } // wave until she looks up, then knock
    await tick(4); k++; // ~7.5 waves/s: a human mash rate
    if (k % 8 === 4) await shot(`fin_locked_${String(k).padStart(3, '0')}`);
  }
  console.log('door minigame took', k * 2, 'ticks', JSON.stringify(await page.evaluate(() => window.__G.fin)));
  for (let k = 0; k < 6; k++) { await tick(18); await shot(`fin_elev_${k}`); }
  for (let w = 0; w < 60 && (await F()).ph !== 'stairs'; w++) await tick(10);
  k = 0;
  while ((f = await F()).ph === 'stairs' && k < 1500) {
    if (f.haz) { if (f.haz[1] > 0.3) await key(f.haz[0].replace('arrow', 'Arrow').replace(/Arrow(.)/, (m, c) => 'Arrow' + c.toUpperCase())); }
    else if (Math.abs(f.u - 0.5) < 0.035) await key('ArrowUp');
    await tick(1); k++;
    if (k % 60 === 20 || (f.haz && f.haz[1] < 0.05)) await shot(`fin_stairs_${String(k).padStart(4, '0')}`);
  }
  console.log('stairs took', k, 'ticks', JSON.stringify(await page.evaluate(() => window.__G.fin)));
  for (let k = 0; k < 90; k++) { await tick(6); if (await page.evaluate(() => !!document.querySelector('#results'))) break; if (k % 3 === 0) await shot(`fin_door_${String(k).padStart(2, '0')}`); }
  await tick(10); await shot('fin_results');
}
console.log('errors', errors.length, errors.slice(0, 5));
await browser.close();
