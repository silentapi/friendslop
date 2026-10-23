# CHAINED: the photo database

This is the actual product. The site is a thin shell around **a few thousand honest, uniform, logo-free photos of chain food, each tagged with exactly what it is.** This doc covers what we store, how photos get made, and how many we need.

---

## 1. What we need, in numbers

From `tools/schedule.py` against `data/catalog.json`: 116 chains, 68 categories, 523 (category, brand) items, of which 46 categories and 403 items are in the launch set.

| Goal | Photos | Distinct items photographed | How we know |
|---|---|---|---|
| Paper test | 25 | ~25 | — |
| Prototype (30 days) | 150 | ~150 | `--plan 30` |
| **Launch bank (120 days)** | **600** | ~290 | `--plan 120` |
| **Year 1, no photo repeats** | **1,825** | **~324** | `--plan 365` |
| Archive / Endless / Brand Battle modes | +1,000–2,000 | all 523 | modes eat photos faster than the Daily |

```
$ python3 brand-guesser/tools/schedule.py --launch --plan 365
365 days -> 1825 photos across 324 items (of 403 in the catalog)
  photos per item: 1x53, 3x8, 4x130, 5x1, 6x5, 7x33, 8x30, 9x8, 10x6, 11x24, 12x25, 13x2
```

**The key finding: demand is very uneven, so don't shoot "N photos of everything".** A flat N photos per item wastes about 35–40% of the shoot, because the scheduler can't use them all (the `--photos N` sweep shows only about 62% get used before the rules break). The two slots that run dry first are:

- **Round 1 needs ~365 easy items a year.** Easy items are the *giveaways* (Wendy's square patty, the Big Mac, DQ's curl, Krispy Kreme's glaze, Cane's tenders, Arby's curly fries). There are only about 45 of them, so **each needs 10–12 photos a year.**
- **Round 5 needs ~365 boss items a year:** plain fries, vanilla shakes, bagels, soft tacos, boneless wings. These also need 8–12 each.
- **Mid-difficulty items** (most chicken sandwiches, subs, pizza) need only about 4 each.
- **About 80 items are only ever distractors.** That's fine: they still need to be on the menu, but we never have to photograph them.

So the **shot list is generated, not guessed:** `--plan DAYS` prints the exact number of photos per item. Re-run it whenever the catalog changes.

The simulation also says to:
- **add more easy items:** only about 60% of round 1s actually land at difficulty 1;
- **cap one round per food group per day.** Mexican categories are underused because they share a group; fine for now.

---

## 2. The catalog (`data/catalog.json` seeds `var/chained.db`)

The seed catalog is checked in. It was built from the research in `RESEARCH.md` §3. **Menus change constantly:** verify each chain's live menu before a shoot.

```
brand     { id, name, us_units, scope: national|regional, region? }
category  { id, name, emoji, group, difficulty 1-5, launch, brands[],
            lookalikes[[...]], giveaways[], tells }
```

The running game keeps this in SQLite (`var/chained.db`), seeded from the JSON on first run and edited in `/admin` → Catalog afterwards. The exact schema is in `app/db.py`; in outline:

```sql
brand    (id PK, name, scope, region, us_units, status)          -- status: active|shrinking|gone
category (id PK, name, emoji, grp, difficulty, launch, tells)
item     (id PK, category_id, brand_id, menu_name,                -- "Hand Tossed Pepperoni"
          status,                                                -- current|lto|seasonal|retired
          first_seen, last_verified, recipe_changed_at,          -- reject photos older than a recipe change
          giveaway BOOL, tell TEXT)                              -- the line shown in the reveal
photo    (id PK = sha256 of the final image,
          item_id, source, license, credit, source_url,          -- see §3
          purchase_id, angle,                                    -- 3 photos from one purchase share a purchase_id
          taken_at, city, state,                                 -- never GPS
          phash,                                                 -- perceptual hash, for near-duplicate detection
          qa_status,                                             -- raw|cropped|approved|rejected
          qa_notes, est_difficulty, live_pct_correct, plays)
puzzle   (date PK, n, round, photo_id, options JSON, published_at)
```

**Rules the schema enforces:**
- A photo with `taken_at < item.recipe_changed_at` is invalid. Examples: the 2026 Whopper bun, Wendy's 2026 spicy recipe.
- Two photos from the same `purchase_id` can't both run within 60 days of each other. Same burger, three angles still counts as the same burger.
- An item whose `status` is `retired` drops out of the Daily automatically and moves to Throwback.

---

## 3. Where photos come from

See `RESEARCH.md` §2 for the licensing details. Summary:

| Source | Use it? | Why |
|---|---|---|
| **Our own shoots** | ✅ **Primary, 70%+** | We own the copyright, the look is uniform, there are no packaging tells, and reverse image search can't find them. |
| **Contributor shoots** (paid friends/freelancers in TX, the West, the Midwest, the Southeast) | ✅ For regional chains | They follow the same kit and protocol. Paid per approved photo under a written copyright assignment. |
| **Player submissions** (later) | ⚠️ With an explicit license grant + QA | Free volume, but inconsistent and needs heavy review. Re-shoot them on-protocol, or cut out the background (§4.4). |
| CC-licensed photos (Wikimedia Commons, Flickr CC-BY) | ⚠️ Rarely | Few exist, attribution is required, and they're findable by reverse search. Archive / Throwback only. |
| Brand marketing photos | ❌ | Copyrighted, too glossy, instantly reverse-searchable, and they make us look like an ad. |
| Yelp / Google Places photos | ❌ | Their API terms forbid this. |
| Stock (Getty/Shutterstock editorial) | ❌ | Editorial licenses exclude games and commercial use. |
| AI-generated | ❌ never | It defeats the whole point of "this is what it really looks like". |

---

## 4. The shoot protocol

### 4.1 The kit (about $150, one per shooter)

- A **12" matte off-white round plate**. The *same* model for everyone, bought in bulk.
- A **matte mid-grey board** (60×60 cm) to put it on.
- A **phone on a small tripod** with a fixed 45° arm and a top-down arm.
- **One LED panel** (5600K) at fixed power, placed camera-left, plus a white foam-board bounce on the right.
- **Nitrile gloves, tongs, and a knife** for the cut-in-half shots.
- **A printed shot card** (below) and a colour-checker card. Shoot it once at the start of each session so we can colour-correct.

**Why a fixed kit:** if every photo is on the same plate in the same light, the *only* information is the food. That's what keeps the game fair, and it's also our look.

### 4.2 Per purchase: 3 shots, 2 minutes

| Shot | Framing | Used for |
|---|---|---|
| **A: hero** | 45°, the whole item centred, with about 15% plate showing around it | Easy and medium rounds |
| **B: top-down** | 90°, the whole item | Pizza, bowls, nachos, fries |
| **C: detail** | Tight on the tell, or cut in half (burritos, subs, sandwiches) | Hard rounds |

**Plating rules:**
- Unwrap everything, and remove every wrapper, sticker, sauce cup, toothpick-with-flag and logo'd box.
- Fries are poured out in a loose pile (shape of the pile = how the chain serves it, so keep it natural).
- Drinks and shakes go into **our own clear plain cup**. A shake's real shape and colour still show, and the logo'd cup doesn't.
- **Shoot within 10 minutes of purchase.** Note "delivery" vs "dine-in" in `qa_notes`.
- Don't tidy the food. A sad burger is the real burger.

### 4.3 A shoot day

- Plan a route through a dense suburban strip. The research shows the biggest chains cluster along the same arterial roads.
- **Budget: about 8 restaurants and about 30 purchases a day**, at ~$6 average, which is about $180 of food per day.
- The car is the studio: a fold-up table and the kit in the back seat.
- Run the order list from `--plan`, prioritised by `photos needed − photos owned`.
- **Day 1 and day 2 at the same chain must use different locations.** Variation between stores is a feature: it's the real difference players have to learn.
- Food afterwards: eat it, share it with the crew, or donate where hygiene rules allow. Don't waste it on camera.

| Milestone | Purchases (≈ photos ÷ 3) | Shoot days | Food cost |
|---|---|---|---|
| Launch bank (600 photos) | ~200 | ~7 | ~$1.2k |
| Year 1 (1,825 photos) | ~610 | ~20 | ~$3.7k |
| Regional contributors | ~150 | — | ~$1k food + ~$2–3 per approved photo |

**Labour is the real cost, not food:**
- **DIY (founders shooting):** ~$2–3 per photo all-in.
- **Outsourced:** freelance shooters at ~$400–1,000 a day bring it to ~$5–12 per photo.
- **Year 1 totals:** about **$5–6k DIY** or about **$15–25k outsourced**.

These are estimates (`RESEARCH.md` §2.4).

The "÷ 3" assumes that all 3 angles of a purchase get used, and at least 60 days apart. In practice plan for ~2.5 usable photos per purchase.

### 4.4 Fixing photos that aren't on-protocol

For submissions and older shots, **cut the food out** (SAM / rembg-style segmentation) and composite it onto a render of our plate and board with matching shadows. A human reviews every composite. If it looks fake, reject it. Composites are flagged in the DB and never used in Brand Battle. That mode is head-to-head, and players compare the photos side by side.

---

## 5. The ingest → QA pipeline

```
phone/camera ──► inbox/ (raw, never committed)
   │
   ├─ 1. ingest.py   strip EXIF+GPS, sha256 name, phash, auto-rotate, colour-correct off the checker
   │                 dedupe: phash distance < 6 to an existing photo → flag as duplicate
   ├─ 2. vision pre-screen (a vision LLM call per image), which returns:
   │      { visible_text_or_logo: bool, where: bbox, category_guess, looks_like_marketing_photo: bool,
   │        on_protocol: bool, notes }
   │      anything with text/logos → auto-reject or crop suggestion
   ├─ 3. QA page (local web tool)
   │      approve / crop / reject · confirm item · write the "tell" · estimate difficulty 1-5
   │      side-by-side "same category, other brands" view to sanity-check that it's guessable
   ├─ 4. blind test: 3 people who didn't shoot it guess it cold → seeds est_difficulty
   └─ 5. export: 1080 / 720 / 400 px AVIF + WebP → R2, under the hash name only
```

**QA rejects a photo when:**
- any readable text or logo is visible;
- it isn't the claimed item;
- it was taken before a recipe change;
- it's blurry or badly exposed;
- a person's face or hand is identifiable;
- it shows the store interior;
- it's too good. A styled, glossy shot gets a re-shoot.

---

## 6. Scheduling the daily puzzle

`tools/schedule.py` is both the capacity simulator and, eventually, the real scheduler. It writes `puzzle` rows about 30 days ahead, and a human glances over each week.

**The rules it enforces now:**

| Rule | Value |
|---|---|
| Difficulty ramp per round | 1 → 2 → 3 → 4 → 5 |
| Item difficulty | the category's base, minus 2 if the brand is a giveaway (see the per-category `giveaways` in the catalog) |
| Categories per day | 5 different, from 5 different food *groups* (never pizza + breadsticks on the same day) |
| Category cooldown | 4 days |
| Same item as the answer | at most every 28 days |
| Same brand as the answer | at most once per day |
| Photo reuse | never within 365 days |
| Regional brands | only from round 3 on (as answer *or* option), and at most 1 regional answer per 7 days |
| Distractors | random from the category on rounds 1–3; on rounds 4–5, look-alikes first |

**To add once live data exists:**
- Replace `est_difficulty` with **measured % correct**, smoothed (Bayesian average over the first ~500 plays).
- **Seasonal hooks:** fish sandwiches during Lent, shakes in summer, "Pizza Week" around the Super Bowl.
- **Menu-change hooks:** when a chain changes a recipe, run the new version in a themed day ("Whopper 2.0 — can you spot it?").
- **Per-day difficulty target:** the average daily score should sit at about 3.2/5. Wordle-style games feel best when most people *almost* get everything.
