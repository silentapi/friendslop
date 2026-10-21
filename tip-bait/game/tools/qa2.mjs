// Deterministic QA: ?qa=1 freezes the game clock; we step it with __tick and drive input with key events.
// node tip-bait/game/tools/qa2.mjs <outDir> [play|crash|finale] [order]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [out = '/tmp/qa2', mode = 'play', order = '1'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VIEW = process.env.VIEW?.split('x').map(Number); // e.g. VIEW=390x844: a touch phone
const ctx = await browser.newContext(VIEW ? { viewport: { width: VIEW[0], height: VIEW[1] }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 720 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { try { localStorage.setItem('tipbait:order', String(o)); } catch {} }, Number(order));
if (VIEW) await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.prepend(m); })); // the artifact host adds this tag; dist/ has none
if (process.env.AKIRA_FAIL) await ctx.addInitScript(() => { globalThis.__akiraFail = true; });
if (process.env.EQUIP) await ctx.addInitScript((eq) => { try { localStorage.setItem('tipbait:equipped', eq); } catch {} }, process.env.EQUIP); // e.g. EQUIP='{"bag":"bag_ufo","outfit":"fit_ceo","head":"head_fire"}'
if (process.env.BP) await ctx.addInitScript((bp) => { try { localStorage.setItem('tipbait:bp', bp); } catch {} }, process.env.BP); // e.g. BP='{"xp":700,"premium":true,"claimed":{"free":[],"prem":[]}}'
if (process.env.HALL_KIND) await ctx.addInitScript((k) => { globalThis.__hallKind = k; }, process.env.HALL_KIND);
await ctx.addInitScript((c) => { globalThis.__crane = c; }, !!process.env.CRANE);
await ctx.addInitScript((f) => { globalThis.__fail = f; }, { rail: !!process.env.FAIL_RAIL, mega: !!process.env.FAIL_MEGA, tech: !!process.env.FAIL_TECH }); // force QTE failures to review their consequences
if (process.env.RIVAL) await ctx.addInitScript((m) => { globalThis.__rivalMode = m; }, process.env.RIVAL);
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
  await page.evaluate((mega) => { const g = window.__G; g.refS = globalThis.__crane ? (g.lv.events || []).find((e) => e.kind === 'crane').s + 30 : mega ? g.lv.ramps.find((r) => r.mega).s + 8 : g.rail.s; g.s = g.refS - 48; g.lane = 1; g.lat = 0; g.runT = 5; g.v = g.base; for (const o of g.lv.obs) if (o.s > g.s && o.s < g.refS - 10 && o.kind !== 'bus') o.dead = true; }, !!process.env.MEGA);
  if (process.env.TECH) { await tick(30); await page.evaluate(() => { const g = window.__G; const o = g.lv.obs.find((o) => o.kind === 'car' && !o.parked && !o.dead && o.s > g.s + 20); g.lane = g.LANES.indexOf(g.LANES.reduce((a, b) => Math.abs(b - o.lat) < Math.abs(a - o.lat) ? b : a)); g.lat = o.lat; g.s = o.s - 1.2; g.y = o.h + 0.5; g.vy = -1; g.rampT = g.time; g.refS = o.s + 40; }); }
  for (let k = 0; k < 120; k++) {
    await tick(2);
    const r = await page.evaluate(() => { const g = window.__G; return { st: g.state, tum: +(g.tumbleT || 0).toFixed(2), ds: +(g.s - g.refS).toFixed(1), y: +g.y.toFixed(2), v: +g.v.toFixed(1), cab: g.trainCab == null ? null : +g.trainCab.toFixed(1), slow: +g.slowmo.toFixed(2), kind: g.crashKind }; });
    if (k % 3 === 0 || r.st !== 'run') console.log(JSON.stringify(r));
    if (process.env.CRANE) await page.evaluate(() => { const g = window.__G, o = g.lv.obs.find((o) => o.drop && !o.dead && o.piece !== 'beam' && o.s > g.s && o.s - g.s < 16); if (o) g.lane = g.LANES.indexOf(g.LANES.reduce((a, b) => Math.abs(b - o.lat) < Math.abs(a - o.lat) ? b : a)); }); // steer into a falling piece
    if (process.env.FAIL_RAIL || process.env.FAIL_MEGA) { const q = await page.evaluate(() => window.__G.qte); if (q && q.idx === 1 && q.t > 0.2) await key(q.seq[1] === 'arrowup' ? 'ArrowDown' : 'ArrowUp'); else if (q && q.idx === 0 && q.t > 0.12) await key('Arrow' + q.seq[0].slice(5, 6).toUpperCase() + q.seq[0].slice(6)); }
    else { const q = await page.evaluate(() => window.__G.qte); if (q && q.t > 0.12 + q.idx * 0.1) await key('Arrow' + q.seq[q.idx].slice(5, 6).toUpperCase() + q.seq[q.idx].slice(6)); }
    if (process.env.FRAMES ? k % 1 === 0 && k >= 8 : [12, 18, 22, 26, 30].includes(k)) await shot(`ramp_${String(k).padStart(3, '0')}`);
    if (r.st === 'crashing') { for (let f = 0; f < 40; f++) { await tick(2); await shot(`clip_${String(f).padStart(3, '0')}`); if ((await page.evaluate(() => window.__G.state)) !== 'crashing') break; } await tick(4); await shot('clip_ui'); const t0 = await page.evaluate(() => window.__G.time); await page.click('#watchad'); for (let w = 0; w < 80 && (await page.evaluate(() => window.__G.state)) !== 'run'; w++) await page.waitForTimeout(150); for (let w = 0; w < 6; w++) { await page.waitForTimeout(150); console.log('chips', await page.evaluate(() => [...document.querySelectorAll('.tcost')].map((e) => e.textContent + ' ' + JSON.stringify(e.getBoundingClientRect())).join('|'))); } await shot('clip_continue'); await page.waitForTimeout(700); await shot('clip_continue2'); console.log('time cost', (await page.evaluate(() => window.__G.time)) - t0); break; }
    if (r.st !== 'run' || r.ds > (process.env.MEGA ? 45 : 30)) break;
  }
  await browser.close(); process.exit(0);
}
// autopilot: pick the lane with the farthest clear road; jump low obstacles; take ramps when lined up
const pilot = () => page.evaluate((crashMode) => {
  const g = window.__G, LANES = g.LANES;
  if (g.state !== 'run' || crashMode) return null;
  const cap = (k) => 'Arrow' + k.slice(5, 6).toUpperCase() + k.slice(6);
  if (g.tech) return globalThis.__fail.tech ? null : cap(g.tech.key);
  { const E = window.__EV, ev = E?.cur; if (E?.locked && ev?.kind === 'rival') { if (ev.st === 'strike' && !ev.pressed && ev.combo) { const u = ev.t / ev.W; if (globalThis.__rivalMode === 'miss' && ev.res.length === 1) return null; return u > 0.55 ? cap(ev.combo[ev.hit].key) : null; } if (globalThis.__rivalMode === 'flinch' && ev.st === 'feint' && ev.t > 0.1 && !ev.flinchCd) return cap(ev.toward); return null; } }
  if (g.akira && !g.akira.res) return globalThis.__akiraFail && g.akira.idx === 1 ? 'ArrowUp' === cap(g.akira.seq[1]) ? 'ArrowLeft' : 'ArrowUp' : cap(g.akira.seq[g.akira.idx]);
  if (g.qte && globalThis.__fail[g.qte.kind]) return g.qte.t > 0.2 && g.qte.idx === 1 ? (g.qte.seq[1] === 'arrowup' ? 'ArrowDown' : 'ArrowUp') : g.qte.idx === 0 && g.qte.t > 0.12 ? cap(g.qte.seq[0]) : null;
  if (g.qte) return g.qte.t > 0.12 + g.qte.idx * 0.1 ? cap(g.qte.seq[g.qte.idx]) : null;
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
  if (process.env.FRAMES && (await page.evaluate(() => window.__G.tumbleT > 0 || window.__G.state === 'crashing'))) await shot(`tum_${String(i).padStart(4, '0')}`); // frame-by-frame through every fall
  { const q = await page.evaluate(() => { const g = window.__G; return g.qte ? 'QTE ' + g.qte.kind + ' ' + g.qte.key : null; }); if (q && q !== globalThis.lastQ) { console.log(q); await shot('qte_' + i); } globalThis.lastQ = q; }
  if (i % 150 === 0) await shot(`run_${String(i).padStart(4, '0')}`);
  { const es = await page.evaluate(() => { const c = window.__EV?.cur; return c ? c.kind + '_' + c.st : ''; }); if (es && (i % 6 === 0 || es !== globalThis.lastEs)) { await shot(`ev_${String(i).padStart(4, '0')}_${es}`); } if (es !== globalThis.lastEs) console.log('EV', es, '@', i); globalThis.lastEs = es; }
  if (mode === 'coach') { const c = await page.evaluate(() => document.querySelector('.coach')?.textContent || ''); if (c && !seen.has(c)) { seen.add(c); console.log('COACH', c); await shot(`coach_${seen.size}`); } if (i > 900) break; }
  if (g.st === 'crashing') { console.log('CRASH', await page.evaluate(() => window.__G.crashKind + ' @' + window.__G.s.toFixed(0))); if (process.env.FRAMES) for (let f = 0; f < 22 && (await page.evaluate(() => window.__G.state)) === 'crashing'; f++) { await tick(2); await shot(`crash_${i}_${String(f).padStart(2, '0')}`); } else await tick(12); await shot(`crash_${i}`); }
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
  if (process.env.HALL_ONLY) { await page.evaluate(() => { const f = window.__F; f.phase = 'stairs'; f.toDoor(); }); for (let w = 0; w < 100 && (await F()).ph !== 'hall'; w++) await page.waitForTimeout(100); }
  while ((f = await F()).ph === 'locked' && k < 400) {
    if (f.on) { if (f.look) await key(' '); else await key(k % 2 ? 'ArrowRight' : 'ArrowLeft'); } // wave until she looks up, then knock
    await tick(4); k++; // ~7.5 waves/s: a human mash rate
    if (k % 8 === 4) await shot(`fin_locked_${String(k).padStart(3, '0')}`);
  }
  console.log('door minigame took', k * 2, 'ticks', JSON.stringify(await page.evaluate(() => window.__G.fin)));
  if (!process.env.HALL_ONLY) { for (let k = 0; k < 6; k++) { await tick(18); await shot(`fin_elev_${k}`); }
  for (let w = 0; w < 60 && (await F()).ph !== 'stairs'; w++) await tick(10); }
  k = 0;
  while ((f = await F()).ph === 'stairs' && k < 1500) {
    if (f.haz) { if (f.haz[1] > 0.3) await key(f.haz[0].replace('arrow', 'Arrow').replace(/Arrow(.)/, (m, c) => 'Arrow' + c.toUpperCase())); }
    else if (k % 4 === 0) { globalThis.side = (globalThis.side ?? 0) ^ 1; if (process.env.STAIR_MISS && k % 92 === 40) globalThis.side ^= 1; await key(globalThis.side ? 'ArrowRight' : 'ArrowLeft'); } // ~7.5 taps/s, alternating
    await tick(1); k++;
    if (k % 60 === 20 || (f.haz && f.haz[1] < 0.05)) await shot(`fin_stairs_${String(k).padStart(4, '0')}`);
  }
  console.log('stairs took', k, 'ticks', JSON.stringify(await page.evaluate(() => window.__G.fin)));
  // hallway pitbull: react a human-ish 0.2 s after the wind-up starts (DOG_MISS: whiff the second one)
  for (let w = 0; w < 100 && (await F()).ph !== 'hall'; w++) { await page.waitForTimeout(60); await tick(1); }
  k = 0; let lastSt = '', n = 0;
  const H = () => page.evaluate(() => { const F = window.__F; if (F.enc) return { ph: F.phase, ...F.enc.state(), i: F.enc.state().i ?? 0 }; const h = F.h; return h ? { ph: window.__F.phase, st: h.st, t: h.t, i: h.i, key: h.atk?.key, side: h.atk?.side, dodged: !!h.dodge } : { ph: window.__F.phase }; });
  let hs;
  if (process.env.KNOCK_ONLY) await page.evaluate(() => window.__F.enterDoor()); // straight to Kyle's door
  while ((hs = await H()).ph === 'hall' && k < 900) {
    const cap = (kk) => kk.replace(/arrow(.)/, (m, c) => 'Arrow' + c.toUpperCase());
    if (hs.kind === 'ladder') { if (hs.st === 'tele' && !hs.done && hs.t > 0.2) { const nm = Number(process.env.DOG_MISS || 0), c = (globalThis.__lc = (globalThis.__lc || 0) + 1), miss = nm >= 2 ? c <= nm : nm && c === 2; await key(cap(miss ? (hs.key === 'arrowup' ? 'arrowdown' : 'arrowup') : hs.key)); } }
    else if (hs.kind === 'mop' || hs.kind === 'beam') { if (hs.st === 'slide') { if (hs.slip) { if (hs.slipT > 0.14) { globalThis.__sl = (globalThis.__sl || 0) + (hs.slipT < 0.2 ? 1 : 0); if (!(process.env.DOG_MISS && globalThis.__sl === 2)) await key(cap(hs.key)); } } else if (Math.abs(hs.b) > 0.33 && k % 3 === 0) await key(hs.b > 0 ? 'ArrowLeft' : 'ArrowRight'); } }
    else if (hs.st === 'tele' && !hs.dodged && hs.t > 0.2) { const nm = Number(process.env.DOG_MISS || 0), miss = nm >= 2 ? hs.i < nm : nm && hs.i === 1; const kk = miss ? (hs.key === 'arrowup' ? 'ArrowLeft' : 'ArrowUp') : hs.key; await key(kk.replace(/arrow(.)/, (m, c) => 'Arrow' + c.toUpperCase())); }
    if (hs.st !== lastSt) { lastSt = hs.st; n = 0; }
    if (n % (process.env.FRAMES ? 2 : 6) === 0 || hs.st === 'lunge' || hs.st === 'swing') await shot(`fin_hall_${String(k).padStart(4, '0')}_${hs.st}`);
    await tick(1); k++; n++;
  }
  console.log('hall took', k, 'ticks', JSON.stringify(await page.evaluate(() => window.__G.fin)));
  // Kyle's secret knock (osu): hit each note on the tick nearest its time, alternating Z/X and a click/tap on the circle,
  // holding sliders to their end (the pointer follows the ball); mash Z/X or circle the pointer on the spinner.
  // KNOCK_MISS=1 never presses: HP drains → WRONG KNOCK restarts → he opens anyway.
  {
    const KN = () => page.evaluate(() => { const F = window.__F; return F.knock ? { ph: F.phase, ...F.knock.qa() } : { ph: F.phase }; });
    const ptr = (type, x, y) => page.evaluate(([type, x, y, touch]) => document.getElementById('knock')?.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType: touch ? 'touch' : 'mouse', pointerId: 1, bubbles: true })), [type, x, y, !!VIEW]);
    const kev = (type, k) => page.evaluate(([type, k]) => window.dispatchEvent(new KeyboardEvent(type, { key: k })), [type, k]);
    const MISS = !!process.env.KNOCK_MISS, done = new Set();
    let kk = 0, ks, n = 0, hold = null, last = '', sn = 0, upNext = null, spinA = 0;
    if (!VIEW) await ptr('pointermove', 640, 400);
    while ((ks = await KN()).ph === 'knock' && kk < 3000) {
      if (upNext) { await upNext(); upNext = null; }
      if (ks.st === 'play' && !MISS) {
        const o = ks.objs.find((o) => o.hit == null && !done.has(o.i));
        if (o && o.t - ks.t < 1 / 60 + 1e-6) {
          done.add(o.i); const viaKey = n++ % 3 === 1, k = n % 2 ? 'z' : 'x';
          if (viaKey) { await kev('keydown', k); if (o.kind === 'slider') hold = { end: o.tEnd, key: k, i: o.i }; else upNext = () => kev('keyup', k); }
          else { await ptr('pointermove', o.x, o.y); await ptr('pointerdown', o.x, o.y); if (o.kind === 'slider') hold = { end: o.tEnd, i: o.i }; else upNext = () => ptr('pointerup', o.x, o.y); }
        }
        if (hold && !hold.key) { const b = ks.objs.find((q) => q.i === hold.i); if (b?.bx != null) await ptr('pointermove', b.bx, b.by); }
        if (hold && ks.t > hold.end + 0.02) { if (hold.key) await kev('keyup', hold.key); else await ptr('pointerup', 0, 0); hold = null; }
        const [s0, s1] = ks.spin;
        if (ks.t > s0 && ks.t < s1) { // spin: circle the pointer on desktop/touch (held), Z/X mash every other frame as well
          spinA += 1.5; const R = 110, x = ks.cx + Math.cos(spinA) * R, y = ks.cy + Math.sin(spinA) * R;
          if (!globalThis.__spun) { globalThis.__spun = 1; await ptr('pointermove', x, y); await ptr('pointerdown', x, y); } else await ptr('pointermove', x, y);
        } else if (globalThis.__spun === 1 && ks.t >= s1) { globalThis.__spun = 2; await ptr('pointerup', 0, 0); }
      }
      const st = ks.st + (ks.fails || 0); if (st !== last) { console.log('KNOCK', ks.st, 'fails', ks.fails, 't', ks.t, 'hp', ks.hp, 'combo', ks.combo, ks.res ? JSON.stringify(ks.res) : ''); last = st; sn = 0; }
      const every = ks.st === 'intro' ? 5 : ks.st === 'out' ? 2 : ks.st === 'fail' ? 3 : ks.st === 'rank' ? 8 : (ks.t < 7 ? 3 : 6);
      if (sn % every === 0) await shot(`kn_${String(kk).padStart(4, '0')}_${ks.st}`);
      await tick(1); kk++; sn++;
    }
    console.log('knock took', kk, 'ticks', JSON.stringify(await page.evaluate(() => { const f = window.__G.fin; return { knock: f.knock, knockT: f.knockT, label: f.knockLabel }; })));
    for (let k = 0; k < 8; k++) { await shot(`kn_door_${k}`); await tick(1); } // the hand-off into the door-open shot, frame by frame
  }
  for (let k = 0; k < 90; k++) { await tick(6); if (await page.evaluate(() => !!document.querySelector('#results'))) break; if (k % 3 === 0) await shot(`fin_door_${String(k).padStart(2, '0')}`); }
  await tick(10); await shot('fin_results');
  if (process.env.BP) for (let k = 0; k < 8; k++) { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/fin_xp_${k}.jpg`, type: 'jpeg', quality: 82 }); } // battle pass XP count-up + tier pops (DOM timers, real time)
  await page.waitForTimeout(2600); await shot('fin_results_pouch');
  await page.click('#share').catch(() => {}); await page.waitForTimeout(400); await shot('fin_results_share');
}
console.log('errors', errors.length, errors.slice(0, 5));
await browser.close();
