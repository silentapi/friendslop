# CHAINED: research (Oct 2026)

Three research passes: competitors, photo sourcing and law, and the chain × menu matrix. Links point to the sources the research used. Figures from secondary sources are marked as such. **Nothing here is legal advice.** Have an IP lawyer review the setup before launch.

---

## 1. Competitors and the daily-game market

### 1.1 Nobody does this exact game

There's no daily "photo of a chain food item → which chain?" game that we could find. The nearest ones:

| Game | What it is | Lesson for us |
|---|---|---|
| **[FoodGuessr](https://www.foodguessr.com/)** | GeoGuessr for dishes: a photo plus a description → pick the country. 3 daily dishes, plus Quick Play. Ads (Freestar), a Stripe premium tier, the Playlight cross-promo SDK, Discord. No image credits. | It proves "food photo daily". Its weak spot is a long, slow country picker. **Our 4 fixed buttons are faster.** |
| **[Guess the Chain](https://guessthechain.com/)** | Daily: a map of every US location of one chain → guess the chain. Location data from OSM / All the Places / Overture. Ads, plus a "not affiliated, names used only to identify" disclaimer. | The closest *chain* daily game. **Its name collides with our working title** (§4). Copy its disclaimer pattern. |
| **[Scrandle](https://scrandle.com/)** | Daily "which stadium-food photo was rated higher", 10 pairs. Photos come from the @FootyScran fan community. Covered by MetaFilter and Boing Boing in 2025–26, with lots of clones. | **Food photo + quick choice + daily spreads.** It got its photos by partnering with a community. |
| **[Costcodle](https://costcodle.com)** | Guess a Costco item's price. Open source, no ads, a tip jar. No sign of any pushback from Costco, and no disclaimer either. | Brand-named fan dailies seem to be tolerated. |
| **BuzzFeed / Sporcle one-offs** | "Guess the chain from its fries" ([BuzzFeed](https://www.buzzfeed.com/natashajokic1/fast-food-fries-quiz)), burger-to-chain matching, logo quizzes | **People clearly want the format, but nobody has made it a daily ritual.** |
| **Food Network "Name the Chain: Pizza"** | A blind taste test TV segment | "Which pizza chain is this?" is already an entertainment format. |

### 1.2 What makes daily web games work

- **Growth needs the share grid.** Wordle went from 90 players to 300k in about two months. The emoji share button in Dec 2021 started its explosion, and the NYT bought it for "low seven figures" at around 2.7M players ([Nieman Lab](https://www.niemanlab.org/2022/01/the-new-york-times-buys-wordle-for-a-price-in-the-low-seven-figures/)).
- **Realistic indie ceiling: 100k–500k DAU.** Waffle (one dev) has ~475k DAU on ads; Bandle has ~100k daily on ads + paid packs; Worldle hit 500k in one day after 3 weeks. Most clones get far less. **Plan for a hobby that might pay; don't plan for Wordle.**
- **Patterns that work:**
  - one shared puzzle a day;
  - a spoiler-free share;
  - a streak and a stats screen;
  - under 2 minutes, no sign-up;
  - archive / unlimited modes for heavy players, so the Daily stays special.
- **How these games make money:**
  - light display ads;
  - optional premium (ad-free, archive, extra modes);
  - a tip jar;
  - themed packs;
  - cross-promotion networks. The Playlight SDK claims a 4.5M-player network; this is self-reported.
- **Framed** has run daily on copyrighted movie stills for years with no takedown found. That's survivorship, not a legal argument (§2.1).

### 1.3 Fast-food culture is unusually game-friendly

- **Chains fight in public.** Pizza Hut vs Domino's stuffed crust in 2025, Domino's blind-taste-test ads, Good Mythical Morning's chain taste-offs. **Brand Battle mode is built for this.**
- **Chains join in on fan content more than they police it.** Wendy's ran a promo off McBroken.com, the fan-made tracker of broken McDonald's ice-cream machines. Wendy's and KFC have made their own games.
- **Trademark letters we found target other restaurants and merch** (In-N-Out vs a bar's "Animal Fries"), not fan quizzes. The NYT's Wordle takedowns targeted the *name* and copied code, not the genre.

---

## 2. Photos: copyright, trademark and sourcing

### 2.1 Official brand photos: no (high risk)

- **Fair use is weak on all four factors:**
  - **Purpose:** after *Warhol v. Goldsmith* (2023), courts ask whether a use has a different purpose. Showing a food photo so people recognise the food is the photo's original purpose.
  - **Commercial use:** the site is ad-supported.
  - **Amount:** we'd use the whole image.
  - **Market harm:** a licensing market for these photos exists.
- **The closest precedent is bad for us.** *Castle Rock v. Carol Publishing* (2d Cir. 1998): a Seinfeld trivia book was **not** fair use. There's no photo-quiz case either way.
- **Exposure:** statutory damages run up to $150k per work if the infringement is willful.
- **The food's appearance itself isn't the problem.** A burger's look is a useful article; the risk is in the *photograph*.
- **Game reasons to skip brand photos too:**
  - they're styled, so they don't show what the food really looks like;
  - they often include packaging;
  - **Google Lens identifies them instantly**, so players can cheat.

### 2.2 Brand names as answers: fine as plain text (low risk)

- **Nominative fair use** (*New Kids on the Block*, 9th Cir. 1992) allows naming a brand when:
  1. you need the name to identify it;
  2. you use only as much as necessary;
  3. you imply no endorsement.
- **Plain-text names in our own font pass.** Logos, brand fonts, brand colours and mascots don't, and logos are also separately copyrighted.
- **Also avoid:**
  - brand names in our game name, domain or app title;
  - disparaging copy;
  - ads placed so they look like co-branding (use ad-category blocking).

### 2.3 Where photos can legally come from

| Source | Verdict | Realistic yield |
|---|---|---|
| **Self-shoot** | ✅ We own it, it looks real, and we control logos | Unlimited |
| **Contract shooters** (regional chains) | ✅ Under a written work-for-hire / copyright assignment, paid per approved photo + receipt | As needed |
| **Wikimedia Commons** | ✅ CC0 / BY / BY-SA with attribution. BY-SA crops stay BY-SA | **~150–400 usable.** Category:Big Mac has 52 files (21 are the Big Mac Index), Whopper 7, Popeyes 4, In-N-Out 5. Commons bans packaging and logos, so many photos show naked food. |
| **Flickr CC** | ✅ API license IDs 4, 5, 7–12 only; **exclude NC** (we're ad-supported) | ~500–1,500 after curation (an estimate). Skews 2007–2015, so many items are outdated. Watch for re-uploaded "laundered" photos. |
| **Openverse** | Search front-end over the above (`license_type=commercial,modification`) | Mostly duplicates of the above |
| **Unsplash / Pexels** | Copyright licence is OK, but brands are unlabelled and Unsplash excludes trademark rights | Tens |
| **Open Food Facts** | Packaged grocery products, not restaurant items | ~0 |
| **Yelp Fusion / Google Places** | ❌ Their terms forbid caching or storing (Google: "must not pre-fetch, cache, or store") | 0 |
| **Reddit** | ❌ No scraping. ✅ DM individual posters and ask for a written licence | 100–300 with effort, at a ~5–20% response rate |
| **Getty / Shutterstock editorial** | ❌ Editorial licences exclude commercial and game use | — |
| **AI-generated** | ❌ It fabricates "ground truth", isn't copyrightable (*Thaler v. Perlmutter*), and can reproduce trade dress | UI art only |

**CC photos break our uniform look and are reverse-searchable,** so they're for Archive / Throwback and the paper test, not the Daily (`DATA.md` §3).

### 2.4 Cost estimates for sourcing

- **Food:** ~$6 average per item in 2026; combos run $7–10.
- **Throughput:** 20–40 items/day for one shooter, giving 60–120 usable photos/day. Driving is the bottleneck.
- **Outsourced labour:** freelance food shooters run ~$400–1,000/day (estimate).
- **All-in cost per photo:** **~$2–3 DIY, ~$5–12 outsourced.**
- **For 3,000 photos:** ~$15–30k in about 3 months with one local team + 3–6 remote contract shooters, plus a CC sweep and Reddit outreach. **Our year-1 plan needs ~1,825** (`DATA.md` §1), so roughly half that.

### 2.5 Legal guardrails

- **No logos or packaging in frame** (QA checklist: cups, wrappers, sauce packets, box lids).
- **Plain-text brand names only.** No logos, colours or mascots.
- **Footer + About page disclaimer:** "Not affiliated with, endorsed or sponsored by any restaurant named. All trademarks belong to their owners. Names are used only to identify."
- **Attribution page** for every CC photo: creator, link, licence, "cropped".
- **Licence ledger per image:** source URL, licence, fetch date, and a screenshot of the licence at fetch time.
- **DMCA:** register a designated agent with the US Copyright Office (~$6, renew every 3 years). Publish a takedown policy and honour notices within 24–48h. Register before player uploads go live.
- **Player-upload terms** need:
  - the submitter warrants they took the photo;
  - a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, sublicensable licence (or a CC BY 4.0 / CC0 dedication);
  - permission for us to edit and crop logos;
  - no faces;
  - 13+ only;
  - optional receipt proof, because a mislabelled photo ruins a round.
- **C&D playbook:** swap the image or rename fast; don't fight.

**Open questions:**
- There's no photo-quiz case law.
- Parts of the Yelp, Reddit and Unsplash terms came from secondary summaries.
- The Flickr pool size and shooter day rates are estimates.

---

## 3. Chains and menu matrix

The full matrix lives in **`data/catalog.json`**: 116 chains, 68 categories, 523 (category, brand) items, with difficulty, look-alike groups, giveaways and visual tells for each category.

**Sources:**
- [QSR 50 2026](https://www.qsrmagazine.com/story/qsr-50-2026-top-50-fast-food-chains-ranked-by-sales/)
- [Technomic Top 500 2026](https://www.restaurantbusinessonline.com/financing/5-notable-facts-2026-technomic-top-500)
- [CSP Top 202 c-stores 2026](https://www.cspdailynews.com/top-202-convenience-stores-2026)
- 2025–26 menu-change coverage

**Individual menu cells are mostly unverified. Check each chain's live menu before shooting.**

### 3.1 Best categories (many chains, clear but learnable tells)

Chicken sandwich · tenders · nuggets · cheeseburger · big burger · straight fries · **hash browns** (the standout: every chain's is a different shape) · pepperoni pizza · crunchy taco · burrito · Italian sub · glazed donut · chocolate shake · soft-serve · Blizzard-style · biscuit · bone-in fried chicken · hot dog · breakfast sandwich.

### 3.2 Giveaways (they make good round-1 items)

- **Burgers and sides:** Wendy's square patty and Frosty · the Big Mac's middle bun · BK's uniform minced-onion rings · Arby's curly fries vs JitB's (harder than it sounds).
- **Chicken:** McDonald's four nugget shapes (boot, ball, bell, bone) · Cane's pale smooth tenders.
- **Breakfast and bakery:** Egg McMuffin's round egg · Krispy Kreme's translucent glaze · Red Lobster's Cheddar Bay flecks.
- **Mexican:** Taco Bell's hexagon Breakfast Crunchwrap · Jack in the Box's deep-fried taco.
- **Dessert:** DQ's soft-serve curl.

### 3.3 Things that will bite us

- **Recipe changes make old photos wrong:**
  - the 2026 Whopper (new bun and mayo);
  - Wendy's 2026 spicy chicken sandwich;
  - McCrispy Strips breading (changed after their 2025 launch);
  - KFC's 2026 boneless push.

  `item.recipe_changed_at` in the DB exists for this.
- **Discontinued:**
  - Domino's Brooklyn Style (2024);
  - Taco Bell Double Stacked Taco;
  - Arby's Smokehouse Brisket.
- **Returned:**
  - McDonald's Snack Wrap (Jul 2025);
  - Wendy's Tendys (Sep 2025);
  - Popeyes wraps (permanent May 2026).
- **Limited-time and seasonal items:**
  - Taco Bell Nacho Fries;
  - Wendy's and Arby's fish (Lent);
  - Chick-fil-A seasonal shakes;
  - BK mozzarella sticks.
- **Shrinking or shaky chains:** Del Taco (sold, closing units), Jack in the Box, Subway and Denny's are shrinking; TGI Fridays and Hooters went through bankruptcy. **Prefer stable chains as answers.**
- **Regional chains:** they're tagged `scope: regional` in the catalog (Whataburger, In-N-Out, Culver's, Wawa, Sheetz, Bojangles, Zaxby's, Cook Out, Waffle House, Del Taco, Portillo's, Dutch Bros…). The scheduler keeps them out of rounds 1–2.
- **Indistinguishable categories:** sweet tea and dipping sauces. Skip them, or save them for a "name the sauce" party round.
- **Drinks and sit-down plates** are excluded from the launch set. Drinks are mostly cups, and plates give away the restaurant.

---

## 4. Name check

**"CHAINED" is too close to [Guess the Chain](https://guessthechain.com/),** an existing daily chain-restaurant game. Pick a different name before buying a domain (see `GAME.md` §9 for the shortlist). Also check every candidate against:

- the USPTO trademark search;
- the App Store;
- existing "-dle" games.
