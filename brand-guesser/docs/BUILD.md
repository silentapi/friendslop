# CHAINED: tech, ops and roadmap

The site itself is the easy part. Most of the work and cost goes into the photo database (`DATA.md`). Keep the site boring and cheap.

---

## 1. Stack (v1, built: one VPS)

The game in `app/` runs on one Ubuntu VPS: **one Python process, no dependencies, one command** (`./start.sh`, port 7090, inside `screen`). How to run it is in `README.md`.

| Layer | v1 (built) | Why |
|---|---|---|
| Server | `app/server.py`, Python 3.10+ standard library (`ThreadingHTTPServer`) | Nothing to `pip install`. Ubuntu 22.04+ already has it. |
| Frontend | `app/static/`: vanilla JS + CSS, ~25 KB, no build step | Loads instantly from a group-chat link. |
| Database | SQLite in `var/chained.db` (WAL mode), seeded from `data/catalog.json` on first run | One file to back up. Thousands of rows, not millions. |
| Photos | `var/photos/<sha256>.jpg`, served with a 1-year immutable cache | The uploader resizes to 1600 px in the browser. |
| Admin / QA | `/admin` on the same server, behind HTTP Basic auth | Shoot → upload from a phone → QA → it's in the schedule. |
| Scheduler | `app/scheduler.py`: the same rules as `tools/schedule.py`, applied to real photos | Puzzles are generated lazily, then frozen. |
| Process | `screen` session `chained`, with an auto-restart loop | It's what's already on the box. |
| HTTPS | Optional Caddy in front (README) | Needed before `navigator.share` and clipboard work everywhere. |

**When to outgrow it:** past ~50k daily players, put a CDN (Cloudflare) in front of `/i/*` and `/static/*`. Past ~500k, move to the Cloudflare Pages + Worker + R2 + D1 design (§1b). The API shape is already the same.

### 1b. Scale-up stack (not built)

| Layer | Choice |
|---|---|
| Hosting | Cloudflare Pages |
| Images | Cloudflare R2 with pre-rendered AVIF/WebP |
| API | One Cloudflare Worker with the same routes |
| Stats | D1 (SQLite), so the schema carries over unchanged |

---

## 2. API (as built in `app/server.py`)

Public:

```
GET  /api/puzzle?date=YYYY-MM-DD
     → { n, date, site, demo, live, rounds: [{ category, emoji, img, alt, options: [{id, name}×4] }] }
     Only serves dates up to UTC today + 1, so every time zone works but nobody can fetch next week (403).
     No answers in the payload.
POST /api/answer   { date, round, choice, device }
     → { correct, right, brand, item, tell, category_tells, pct: {brandId: share}, total }
     One answer per round per device: a second tap returns the first answer. Rate-limited per IP.
     "live" = the date is today somewhere; replays of older days are stored but don't count toward the % shown.
GET  /api/daystats?date=&device=   → { players, avg, dist[0..5], beat }   (players who finished the day)
GET  /api/archive?before=YYYY-MM-DD → [{ date, n }]
GET  /api/credits                   → attribution for CC / contributor / player photos
GET  /i/<sha>.jpg|png|svg           → photos (svg = labelled demo placeholders)
```

Admin (Basic auth): `overview`, `catalog`, `item`, `item/add`, `category`, `brand`, `settings`, `upload` (raw body + query metadata), `photos`, `photo`, `schedule`, `regenerate`, `shotlist`, all under `/api/admin/`.

**Leak-proofing:**

- Image URLs are content hashes. Demo placeholders use salted hashes, so they can't be mapped back to a brand.
- On upload, the browser re-encodes to JPEG, and the server strips any EXIF/XMP/comment segments again. GPS would literally say "taken at a Domino's".
- Answers live only on the server until the round is answered.
- Our own photos are **not on the public web** before they appear in a puzzle, so Google Lens has nothing to match.

Puzzle `#n` = days since the launch date + 1. The day rolls over at the **player's local midnight**.

---

## 3. Client

- `localStorage` key `chained:v1`: `{ device, seenHelp, history: { [date]: { live, done, picks: [reveal…] } } }`. Streaks are computed from `history`, counting live days only.
- If `/api/answer` fails, the buttons unlock and a toast says to retry. The answer isn't known client-side, so there's nothing to fake offline.
- All 5 images are preloaded as soon as the puzzle loads (each ~150–300 KB JPEG at 1600 px; add AVIF later).
- Tap the photo to zoom 2.4× at the tapped point, and drag to pan.
- Keys: `1`–`4` pick, `Enter`/`→` next.
- Share via `navigator.share` with a clipboard fallback.
- Accessibility:
  - big tap targets;
  - alt text that describes the photo *without* the brand ("pepperoni pizza slice, thick crust edge, top-down");
  - colourblind-safe result markers (✅/❌ shapes, not just green/red).

---

## 4. Costs (monthly, rough)

| Item | At 10k DAU | At 500k DAU |
|---|---|---|
| VPS (v1: what you already have) | $0 extra; a $5–10 box handles this comfortably | needs the CDN or scale-up stack (§1b): ~$5–50 |
| Photo storage (5k photos × ~250 KB ≈ 1.3 GB) | on the VPS disk | R2, <$1 (egress is free) |
| Domain | ~$1 | ~$1 |
| **Photo production** (`DATA.md` §4.3) | the real cost: ~$1.5–2k for the launch bank, ~$5–6k DIY (or $15–25k outsourced) for year 1, then a trickle | same |

---

## 5. Roadmap

| Phase | What ships | Content needed | Exit criteria |
|---|---|---|---|
| **0. Paper test** (week 1) | 25 photos in a Google Slides deck played with friends | 25 photos (shoot one evening) | People argue about the answers and want to play tomorrow. |
| **1. Prototype** ✅ built (`app/`) | The playable site on the VPS: daily, reveal, share, real stats, archive, streaks | ~150 photos (30 days) | 20 friends play for 2 weeks; we measure % correct per photo. |
| **2. Catalog tooling** ✅ built (`/admin`) | Upload with EXIF stripping, QA queue, library, shot list, schedule preview, catalog editor | — | The scheduler can fill 90 days with no rule relaxation (the Schedule tab flags relaxed days). |
| **3. Launch** | Real stats, archive, Field Guide pages | ≥ 120 days of puzzles in the bank (~600 photos) plus a pipeline producing ≥ 5/day | Launch with no fear of running out. |
| **4. Grow** | Brand Battle, Regional packs, Party mode | ~2,000+ photos | DAU and retention numbers that justify ads or sponsorship. |

**Rule: never launch with less than 90 days in the bank.** A daily game that skips a day is a dead daily game.

---

## 6. Monetization (later; don't build for it now)

- One small, non-intrusive ad slot on the result screen only (never during rounds).
- "Supporter" tip jar: removes the ad and gives a gold receipt in the share.
- **Brand sponsorship is the interesting one.** "This week's Brand Battle presented by…" — but only once we're big, and the sponsored brand gets *no* say in difficulty or which photos are used. Otherwise the game is dead.
- An archive paywall is possible later, but the competitor research (`RESEARCH.md` §1) suggests free archives drive growth.
