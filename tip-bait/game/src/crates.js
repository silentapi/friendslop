// gobbl crates: what's in them, the odds, pity, duplicates → coins. Pure logic (no DOM); src/shop.js does the show.
import { ITEMS, RARITY } from './cosmetics.js';

export const TIERS = ['common', 'rare', 'epic', 'legendary', 'mythic'];
export const REFUND = { common: 20, rare: 60, epic: 200, legendary: 700, mythic: 2000 };
export const PITY = 40, SOFT = 30; // Legendary+ guaranteed by roll 40; odds climb from roll 30
export const CRATES = [
  { id: 'standard', name: 'Standard Crate', price: 150, rolls: 1, look: 'std', rates: { common: 0.6, rare: 0.27, epic: 0.1, legendary: 0.026, mythic: 0.004 }, blurb: 'cheap thrills. mostly hoodies.' },
  { id: 'premium', name: 'Premium Crate', price: 600, rolls: 1, look: 'prem', rates: { common: 0, rare: 0.55, epic: 0.32, legendary: 0.11, mythic: 0.02 }, blurb: 'no commons. real chance at Kyle-tier.' },
  { id: 'premium5', name: 'Premium ×5', price: 2700, rolls: 5, look: 'multi', rates: { common: 0, rare: 0.55, epic: 0.32, legendary: 0.11, mythic: 0.02 }, guarantee: 'epic', blurb: '5 premium rolls · 10% off · Epic+ guaranteed.' },
];
const pool = (r) => ITEMS.filter((i) => !i.def && i.r === r);
const rank = (r) => RARITY[r].rank;

function pickRarity(rates, pity, rnd) {
  // soft pity: every roll past SOFT shifts 6% from the bottom tiers into Legendary; hard pity forces it
  if (pity + 1 >= PITY) return rnd() < rates.mythic / (rates.legendary + rates.mythic) ? 'mythic' : 'legendary';
  const r = { ...rates }, boost = Math.max(0, pity + 1 - SOFT) * 0.06;
  if (boost) { r.legendary += boost; let take = boost; for (const t of ['common', 'rare', 'epic']) { const d = Math.min(r[t], take); r[t] -= d; take -= d; } }
  let x = rnd(); for (const t of [...TIERS].reverse()) { if ((x -= r[t]) < 0) return t; }
  return 'rare';
}

// roll a crate: spends the coins, updates owned/pity, returns the pulls ({ item, r, dupe, refund })
export function openCrate(crate, store, rnd = Math.random) {
  const wallet = store.get('wallet', 0); if (wallet < crate.price) return null;
  const owned = new Set(store.get('owned', [])); let pity = store.get('pity', 0);
  const out = [];
  for (let k = 0; k < crate.rolls; k++) {
    const f = globalThis.__forceRarity; // QA can force a tier (or one per roll)
    let r = (Array.isArray(f) ? f[k] : f) || pickRarity(crate.rates, pity, rnd);
    if (crate.guarantee && k === crate.rolls - 1 && !out.some((p) => rank(p.r) >= rank(crate.guarantee)) && rank(r) < rank(crate.guarantee)) r = crate.guarantee;
    pity = rank(r) >= rank('legendary') ? 0 : pity + 1;
    const list = pool(r), item = list[Math.floor(rnd() * list.length)];
    const dupe = owned.has(item.id) || out.some((p) => p.item.id === item.id);
    out.push({ item, r, dupe, refund: dupe ? REFUND[r] : 0 });
    owned.add(item.id);
  }
  const refunds = out.reduce((a, p) => a + p.refund, 0);
  store.set('wallet', wallet - crate.price + refunds); store.set('owned', [...owned]); store.set('pity', pity);
  // multi-rolls reveal best-last, like every gacha you've ever lost money to
  if (crate.rolls > 1) out.sort((a, b) => rank(a.r) - rank(b.r));
  return out;
}
