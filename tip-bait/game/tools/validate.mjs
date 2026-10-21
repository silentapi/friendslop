// Generate many seeded layouts and check the rules: no overlapping solids, a free lane at every metre that is
// reachable from the previous metre's free lanes, and every coin either on the ground in a clear lane or on a
// trajectory. node tools/validate.mjs <order> <seeds>
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs'; import { join } from 'node:path';
const [order = '1', N = '40'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => { const p = route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.169.0/', ''); const f = join('/home/user/friendslop/tip-bait/node_modules/three', p); existsSync(f) ? route.fulfill({ body: readFileSync(f), contentType: 'application/javascript' }) : route.fulfill({ status: 404 }); });
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.addInitScript((o) => { localStorage.setItem('tipbait:order', String(o)); window.__qaLevel = true; }, Number(order));
const page = await ctx.newPage();
const warns = []; page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.text()); });
await page.goto('http://localhost:8124/tip-bait/game/dist/index.html?qa=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const res = await page.evaluate(async ([N, order]) => {
  const LANES = [-2.4, 0, 2.4], out = [];
  for (let seed = 1; seed <= N; seed++) {
    const lv = await window.__regen(seed * 101, order), L = window.__G.route.length;
    const probs = [];
    // where each tall thing is when you meet it: movers at their meet point, merges in both lanes, buses pulled in
    const solid = [];
    for (const o of lv.obs) {
      if (o.kind === 'gate') continue;
      if (o.h <= 1.0) continue; // jumpable
      if (o.merge) { solid.push({ s: o.meet, len: o.len + 4, lats: [o.to] }); continue; } // it has left its own lane by the time you reach it
      if (o.kind === 'bus' && !o.parked) { solid.push({ s: o.s, len: o.len + 6, lats: [o.pull] }); continue; }
      if (o.parked) continue; // jumped by the mega ramp
      const drift = o.v ? o.v * 40 / Math.max(4, window.__G.base - o.v) : 0;
      solid.push({ s: o.s + drift, len: o.len + (o.v ? 6 : 0), lats: [o.lat] });
    }
    let reach = new Set([0, 1, 2]), lastFree = 0;
    for (let s = 30; s < L - 30; s += 1) {
      const blocked = new Set();
      for (const q of solid) if (Math.abs(q.s - s) < q.len / 2 + 0.7) for (const lat of q.lats) LANES.forEach((x, i) => { if (Math.abs(x - lat) < 1.6) blocked.add(i); });
      const freeL = [0, 1, 2].filter((i) => !blocked.has(i));
      if (!freeL.length) { probs.push(`all lanes blocked @${s} in ${lv.slots.find((q) => s >= q.s0 && s <= q.s1)?.kind}`); reach = new Set([0, 1, 2]); continue; }
      // lane changes: one lane per ~4 m of travel
      const next = new Set(freeL.filter((i) => [...reach].some((j) => Math.abs(i - j) <= 1 || s - lastFree > 8)));
      if (!next.size) probs.push(`no reachable lane @${s} free=${freeL} from=${[...reach]}`);
      if (blocked.size) lastFree = s;
      reach = next.size ? new Set([...next, ...[...next].flatMap((i) => [i - 1, i + 1]).filter((i) => i >= 0 && i <= 2 && !blocked.has(i))]) : new Set(freeL);
    }
    // coins: none inside solids
    for (const c of lv.coins) for (const o of lv.obs) if (!o.v && Math.abs(o.s - c.s) < o.len / 2 + 0.3 && Math.abs(o.lat - c.lat) < o.w / 2 && c.y < o.h + 0.3) probs.push(`coin in ${o.kind} @${c.s.toFixed(0)}`);
    const kinds = lv.slots.map((q) => q.kind).join(',');
    out.push({ seed, probs: probs.slice(0, 4), n: probs.length, coins: lv.coins.length, obs: lv.obs.length, kinds: kinds.slice(0, 160) });
  }
  return out;
}, [Number(N), Number(order)]);
let bad = 0; for (const r of res) { if (r.n) { bad++; console.log('seed', r.seed, r.n, r.probs.join(' | ')); } }
console.log(`order ${order}: ${res.length - bad}/${res.length} layouts clean · avg coins ${Math.round(res.reduce((a, r) => a + r.coins, 0) / res.length)} · avg obstacles ${Math.round(res.reduce((a, r) => a + r.obs, 0) / res.length)}`);
console.log('sample:', res[0].kinds);
const ov = warns.filter((w) => w.includes('[level]')); console.log('overlap warnings', ov.length, ov.slice(0, 6));
await browser.close();
