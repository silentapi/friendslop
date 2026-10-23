# CHAINED: the daily game (v0.1)

> 🍕 here's a slice of pepperoni pizza. no box, no logo, no napkin. just the slice. is it Pizza Hut, Domino's, Little Caesars or Papa John's? you have one guess. then there's 4 more. everyone gets the same 5. go.

Working title **CHAINED** (alternatives in §9). It's a daily web game in the Wordle family. Each day has 5 rounds. Each round shows one photo of one fast-food item and four brand names, and you pick the brand. Everyone in the world gets the same 5 photos that day, so the score is something you can compare in the group chat.

---

## 1. The whole game on one card

| | Rule |
|---|---|
| 📸 **Round** | One photo of real food as served: no packaging, no logos, no tray. Four chain names underneath. Tap one. |
| 🔢 **Day** | 5 rounds, always in 5 **different categories** (e.g. pizza → wings → fries → shake → taco). |
| 📈 **Ramp** | Rounds get harder: 1–2 are "everyone gets it", 3–4 are real guesses, 5 is the **Boss Round** (e.g. plain fries, a glazed donut). |
| ✅ **Score** | 0–5. No timer, no lives, no hints. One tap per round, no take-backs. |
| 🧾 **Reveal** | After every tap you see the answer, the item's real menu name, a one-line "tell" ("Domino's crust has cornmeal on the bottom"), and **what % of players got it right**. |
| 📤 **Share** | An emoji receipt you paste in the group chat (§4). No spoilers in it. |
| 🔥 **Streak** | Your play streak and score history are kept on your device. No account needed. |

If a rule doesn't fit on this card, it isn't in v1.

---

## 2. One round, step by step

1. **Category banner** at the top: `🍕 PEPPERONI SLICE · Round 1 of 5`. Telling you the category is deliberate. The game is "which chain", not "what food".
2. **The photo** fills the screen. Pinch to zoom is allowed (zooming in on the crust is how you'd actually play).
3. **Four buttons** with brand names in **plain text in our own font**. We never use their logos, colours or fonts (see `RESEARCH.md` §2, trademark).
4. **Tap.** The buttons lock and the correct one turns green. If you were wrong, yours turns red.
5. **The reveal card** slides up:
   - `Domino's · Hand Tossed Pepperoni (Large)`
   - `🔍 The tell: cornmeal dust on the bottom, garlic-oil shine on the crust edge.`
   - `41% got this · most people said Papa John's`
6. **Next →**

The reveal is where the game is actually *learned*. Players should finish a week of rounds and genuinely be better at spotting a Popeyes biscuit. That's the retention hook: getting better is fun, and it gives people something to argue about ("the Wendy's nugget is OBVIOUSLY breaded differently").

---

## 3. What makes a round easy or hard

The difficulty dial has three knobs. The scheduler (`DATA.md` §6) uses them to build the ramp.

| Knob | Easy | Hard |
|---|---|---|
| **Item** | Signature shapes: Wendy's square patty, Arby's curly fries, a Crunchwrap | Commodity items: plain fries, a soft-serve cone, a glazed donut, sweet tea |
| **Distractors** | Same category, but brands whose versions look different from each other (e.g. Wendy's vs Five Guys vs Sonic vs Whataburger) | The three closest look-alikes (McDonald's vs Burger King vs Jack in the Box vs Carl's Jr.) |
| **Photo** | Wide shot, whole item, the signature feature visible | Tight crop, one bite taken, side angle |

Once real people are playing, **measured % correct** replaces our guesses. Every photo gets a running difficulty score from live play. When the archive is replayed, or a photo is reused a year later, we already know how hard it is.

**Rules that keep it fair:**
- **Only the 4 options in the round's category,** and every option genuinely sells that item (or did when the photo was taken).
- **No regional gotchas in the Daily.** A chain that's only in one region (Whataburger, In-N-Out, Culver's, Wawa…) can be a correct answer at most once a week, and only in rounds 3–5. In the easy rounds every option is a national chain. A *Regional* mode (§7) is where regional chains get to shine.
- **No retired items.** If an item gets discontinued it moves to the *Throwback* pool (§7) and leaves the Daily.
- **No photo repeats** in the Daily within 365 days.

---

## 4. The share receipt

Fast food's universal visual is the receipt, so that's the share format:

```
CHAINED #142 🧾 4/5
🍕✅ 🍗✅ 🍟❌ 🥤✅ 🌮✅
boss round: 🍟 plain fries (23% got it)
chained.gg
```

- Category emoji + ✅/❌ shows *which* foods you got without spoiling the answer.
- The boss line brags or excuses ("only 23% got it").
- No brand names in the share, so it isn't a spoiler and doesn't look like an ad.

---

## 5. The look

Make it look like a **receipt-and-tray-liner** world, warm and greasy, but **brand-neutral**. We must not look like any one chain.

- **Food photos** are the hero, and they all share one backdrop: the same plain off-white plate on the same matte grey table, with the same soft side light. Shooting everything the same way does three jobs:
  1. it removes background tells (trays, wrappers, restaurant tables);
  2. it makes the game look like a deliberate *lineup* rather than random internet photos;
  3. it's instantly recognisable when screenshotted, which is the brand.
- **UI chrome:** thermal-receipt paper, monospaced prices, a dotted tear line between rounds. Accent colour is ketchup red plus mustard yellow, deliberately mixed so it can't be mistaken for any one chain's palette.
- **Brand buttons:** identical, plain, our own font. No colours. Seeing a red-and-yellow button would be a giveaway *and* a trademark problem.

---

## 6. Retention and growth

| Hook | How |
|---|---|
| Same 5 for everyone | The group-chat comparison is the whole marketing plan. |
| Global % per round | "Only 23% got it." Shown in the reveal and in the share. It needs a tiny backend counter. |
| Streak | Kept on-device (localStorage). Optional sign-in later only to sync devices. |
| The tells | Every reveal teaches one thing. Collect the tells into a "Field Guide" page per chain, which also earns search traffic ("how to tell Popeyes from KFC"). |
| Brand report card | After 30 days: "You're 92% on McDonald's and 31% on Hardee's." People share it. |
| Hot takes | Weekly "most-missed photo" post for TikTok/X. A face-cam reaction format: "I thought this was Wendy's…". |

---

## 7. Modes (after launch, in order)

1. **Archive:** play any past day. It's free, and it's what keeps people around after they've done today's (see `RESEARCH.md` §1 for what competitors do).
2. **Endless / Practice:** random rounds from the archive pool, no score saved.
3. **Brand Battle:** pick two chains and get 10 rounds of only those two (Popeyes vs KFC, Pizza Hut vs Domino's). Very clippable.
4. **Regional:** Texas pack (Whataburger, Bush's, Taco Cabana…), West pack (In-N-Out, Del Taco…), Midwest pack (Culver's, Portillo's…), Gas Station pack (Wawa, Sheetz, Buc-ee's, QuikTrip).
5. **Throwback:** discontinued and old items (McDonald's Snack Wrap era, etc.).
6. **Party mode:** one person hosts on a TV and everyone answers on their phones. The friendslop crossover.

---

## 8. What we're explicitly not doing in v1

- **No timer.** It rewards reflexes, not food knowledge, and punishes people playing on the toilet (our core audience).
- **No logo-guessing.** It's a crowded genre, and we'd be using trademarks in the worst way.
- **No "guess the food" rounds.** The category is always told.
- **No AI-generated food photos, ever.** The whole premise is "this is what it actually looks like".
- **No accounts, no paywall** at launch.

---

## 9. Name shortlist

Check availability before committing (domain, App Store, trademark search, any existing daily game with the name). **Never put a brand name in our name** (`RESEARCH.md` §2.2).

| Name | Notes |
|---|---|
| **CHAINED** | "Chain" restaurants plus a daily streak. Short, punny, works as a verb ("got chained today"). ⚠️ **Too close to [guessthechain.com](https://guessthechain.com/)**, an existing daily chain game. It's the working title only. |
| **Drive-Thru Daily** | Says exactly what it is. Longer. |
| **Order Up** | Friendly, but generic. |
| **Whose Fries?** | Funny, but locks the name to one food. |
| **Menu Lineup** | Fits the "police lineup" photo framing. |
| **Fast Food Guessr** | SEO-friendly but derivative (the GeoGuessr family). |
