# CHAINED: tech, ops and roadmap

The site itself is the easy part. Most of the work and cost goes into the photo database (`DATA.md`). Keep the site boring and cheap.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Vite + Preact (or vanilla TS)**, a single page, about 50 KB of JS | Daily games live or die on load time from a group-chat link. |
| Hosting | **Cloudflare Pages** | Free, global, and works with the Worker below. |
| Images | **Cloudflare R2** + Image Resizing (or pre-rendered AVIF/WebP at 3 widths) | Photos are the only heavy asset. Egress is free on R2. |
| API | **One Cloudflare Worker** with 3 routes | Today's puzzle, an answer counter, and stats. |
| Stats store | **Workers KV / Durable Object counter**, or D1 (SQLite) | It only needs `(date, round, choice) → count`. |
| Content DB | **SQLite file in the repo** (`catalog.db`) plus JSON exports | The catalog is curated by hand and small (thousands of rows). Git history is the audit log. |
| Admin / QA tool | Local web page served from the repo (like `mockups/`), reading and writing `catalog.db` | Only we use it. No auth needed because it never ships. |
| Analytics | Plausible or Cloudflare Web Analytics | Cookie-free, so no consent banner on day 1. |

**Not needed:** user accounts, a database server, SSR or a CMS.

---

## 2. API (the Worker)

```
GET  /api/puzzle?date=2026-11-03
     → { n: 142, date, rounds: [{ category, emoji, img, options: [brandId×4] }] }
     Only serves dates in [UTC today − 1, UTC today + 1], so every time zone works but nobody can fetch next week.
     No answers in the payload.

POST /api/answer   { date, round, choice }
     → { correct: brandId, item: "Hand Tossed Pepperoni", tell: "...", pct: { brandId: 0.41, ... } }
     Increments the counter and returns the reveal. One answer per round per device, enforced client-side and loosely by IP+UA rate limit server-side.

GET  /api/archive/:date   (dates < today) → the full puzzle with answers and final stats
```

**Leak-proofing** (because people *will* open dev tools and reverse-image-search):

- Image URLs are content hashes (`/i/9f3a…c1.avif`). The filename never contains the brand or item.
- Strip all EXIF on ingest. GPS would literally say "taken at a Domino's".
- Answers live only on the server until the round is answered.
- Our own photos are **not on the public web** before they appear in a puzzle, so Google Lens has nothing to match. This is a big reason to shoot our own photos rather than reuse brand photos, which reverse-search identifies instantly. See `RESEARCH.md`.

Day rollover is at **local midnight** (as Wordle does). Puzzle `#n` = days since launch.

---

## 3. Client

- `localStorage`: `{ history: { [date]: { picks:[...], score } }, streak, best }`.
- Offline-tolerant: if `/api/answer` fails, reveal from a cached copy and queue the counter ping.
- Preload all 5 images as soon as round 1 shows (each ~80–150 KB AVIF at 1080 px).
- Share via `navigator.share` with a clipboard fallback.
- Accessibility:
  - big tap targets;
  - alt text that describes the photo *without* the brand ("pepperoni pizza slice, thick crust edge, top-down");
  - colourblind-safe result markers (✅/❌ shapes, not just green/red).

---

## 4. Costs (monthly, rough)

| Item | At 10k DAU | At 500k DAU |
|---|---|---|
| Cloudflare Pages + Workers | $0–5 | ~$5–50 (Workers paid plan, ~2–3 requests per round) |
| R2 storage (5k photos × 3 sizes ≈ 2 GB) | <$1 | <$1 (egress is free) |
| Domain | ~$1 | ~$1 |
| **Photo production** (`DATA.md` §4.3) | the real cost: ~$1.5–2k for the launch bank, ~$5–6k DIY (or $15–25k outsourced) for year 1, then a trickle | same |

---

## 5. Roadmap

| Phase | What ships | Content needed | Exit criteria |
|---|---|---|---|
| **0. Paper test** (week 1) | 25 photos in a Google Slides deck played with friends | 25 photos (shoot one evening) | People argue about the answers and want to play tomorrow. |
| **1. Prototype** (weeks 2–3) | The playable site on a test domain: daily + reveal + share; stats are fake | ~150 photos (30 days) | 20 friends play for 2 weeks; we measure % correct per photo. |
| **2. Catalog tooling** (in parallel) | `catalog.db`, the ingest script, the QA page, the scheduler | — | The scheduler can fill 90 days with no rule violations. |
| **3. Launch** | Real stats, archive, Field Guide pages | ≥ 120 days of puzzles in the bank (~600 photos) plus a pipeline producing ≥ 5/day | Launch with no fear of running out. |
| **4. Grow** | Brand Battle, Regional packs, Party mode | ~2,000+ photos | DAU and retention numbers that justify ads or sponsorship. |

**Rule: never launch with less than 90 days in the bank.** A daily game that skips a day is a dead daily game.

---

## 6. Monetization (later; don't build for it now)

- One small, non-intrusive ad slot on the result screen only (never during rounds).
- "Supporter" tip jar: removes the ad and gives a gold receipt in the share.
- **Brand sponsorship is the interesting one.** "This week's Brand Battle presented by…" — but only once we're big, and the sponsored brand gets *no* say in difficulty or which photos are used. Otherwise the game is dead.
- An archive paywall is possible later, but the competitor research (`RESEARCH.md` §1) suggests free archives drive growth.
