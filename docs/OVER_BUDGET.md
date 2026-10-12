# OVER BUDGET: Game Design Doc (v0.1)

> 📋 the client wants a dream home. you have a $40k budget and 4 idiots. cover the hole in the floor with a rug. hide the raccoon in the wall. tape the pipe. walk-through is in 10 minutes. smile.

**One-line pitch:** a 1–4 player co-op game where you're a dodgy contractor crew. You renovate houses fast and cheap, then bluff your way through the client's walkthrough before anything falls apart.

**The core tension:** every task can be done **right** (slow, costs money) or **fast** (cheap, saves time, but it's a lie you'll have to hide). Profit lives in the gap between the two.

---

## 1. Vibe and aesthetic

### Tone
90s home-improvement TV meets a suburban dollhouse. The crew aren't villains, just lovable, overconfident dads who think duct tape is a building material. The clients are cartoonishly picky. Nobody gets hurt badly. Things just collapse at BBQs.

### Visual style
- **Chunky, toy-like low-poly** with soft flat shading and bright colours. Think *Untitled Goose Game* suburbs mixed with *Animal Crossing* furniture.
- **Pastel suburbs:** mint siding, salmon doors, perfect lawns, a garden gnome on every lawn.
- **Flaws look bigger than they are,** so a viewer can read them in a clip. A hole is a pitch-black void. A leak sprays a cartoon arc. Mold is a fuzzy green blob with eyes.
- **The crew:**
  - Stubby bodies, matching company coveralls, hard hats with names on them.
  - Each player picks a mustache: walrus, handlebar, pencil, "none, but should."
- **Clients:** big heads, oversized sunglasses, clutching coffee. They speak Animal Crossing-style gibberish with subtitles.

### UI
Everything is diegetic office junk:
- The task list is a **clipboard**.
- The budget is a **running receipt** that prints out of the van.
- Client profiles are **sticky notes** on the van dashboard.
- End-of-job results are a **Polaroid wall**.
- The game logo is a red **"OVER BUDGET"** stamp slammed onto an invoice.

### Audio
- **Work phase:** smooth jazz / home-improvement-show theme with a boombox on site.
- **Walkthrough:** the music shifts to tense elevator muzak that gets faster as client suspicion rises.
- **Big sounds:** the creak of a bad floorboard, a toilet flush, a long drip.
- **Your company's jingle:** generated from the company name. Players name the company at the start, e.g. *"Dale & Sons Contracting (No Sons)."*

---

## 2. Session structure

```
WEEK (5 jobs, ~75 min)  ── payday + rep review every Friday
 └─ JOB (~15 min)
     1. Pick the job      (1 min)   choose a job card
     2. Plan & buy        (1 min)   order materials from the van catalog
     3. Work phase        (8 min)   renovate, choose right vs. fast per task
     4. Walkthrough       (3 min)   client tours the house, crew covers up
     5. Payout + Fallout  (2 min)   get paid, "3 MONTHS LATER…" reel
```

### Step 1: Pick the job
Three **job cards** are on the van's fridge door:
- **Client:** name, portrait and 2–3 **quirks**.
- **Scope:** "Bathroom reno" / "Deck + patio" / "Full kitchen" / "Make the basement not haunted."
- **Budget and deadline:** a bigger budget means a pickier client.

Example card:
> **Mrs. Henderson**: Kitchen Reno, $22,000
> - 🧐 *Retired home inspector* (checks behind appliances)
> - 🐩 *Brings her poodle, Biscuit*
> - ☕ *Easily distracted by compliments about her coffee mug*

**Reading the card is a real skill.** Quirks tell you exactly what she'll check and how to distract her. A careful crew plans their lies around the client.

### Step 2: Plan and buy
- Order from the van's catalog tablet. Every material comes in three tiers:
  - **Premium** ($$$): no risk.
  - **Standard** ($$): fine.
  - **Bargain Bin** ($): looks the same but fails in Fallout.
- **Dumpster diving:** the neighbour's trash is free material, and the neighbour might catch you.
- Whatever you don't spend is **profit**.

### Step 3: Work phase (the meat)
- An 8-minute timer. The house has a **task list**.
- Every task has a **Proper** way and a **Hack** way. Doing it properly is a small, satisfying skill test. Hacking it is instant but adds a **Flaw** to the house.
- You can see your own flaws: they get a red "🤫" sticker that only the crew can see, so you always know what you're hiding.
- Mid-job **Surprises** interrupt (see §5).

### Step 4: Walkthrough (the payoff)
- The client arrives, sometimes early, and tours the house along a route based on their wishlist and quirks.
- The client has a **view cone** and a **Suspicion meter**. Any flaw inside their view cone raises suspicion.
- The crew uses **cover-up verbs** (see §4) to keep flaws out of sight.
- **Suspicion thresholds:**
  - 🙂 Happy (full pay + tip)
  - 🤨 "Hmm…" (pay docked)
  - 😠 "I'm calling my lawyer" (big docking, and the job becomes a **Callback**)

### Step 5: Payout + Fallout
- The **receipt** prints: budget, minus materials, plus tip, minus penalties, equals profit.
- **"3 MONTHS LATER…":** a cheesy local-news style reel. Each hidden flaw rolls a failure chance (Bargain Bin materials roll worse) and plays its disaster:
  - The deck collapses at a 4th of July BBQ.
  - The chandelier you hung with zip ties drops into the soup.
  - The raccoon you drywalled in has had babies.
- Every failure costs **reputation stars**, and bad ones spawn **Callback jobs**.

---

## 3. Work-phase tasks (proper vs. hack)

Each task is a tiny, readable skill test that takes about 5–20 seconds for one player, or faster with two. They're never twitchy or precise for the sake of it.

| Task | Proper (skill test) | Hack (instant, adds Flaw) | Co-op twist |
|------|--------------------|---------------------------|-------------|
| **Drywall** | Hold the panel up and drive 4 screws. Panels are heavy, so it's easier with 2 people. | Hang a painting / poster / calendar over the hole | One holds, one screws. "Are you holding it?" "Yeah." (He's not.) |
| **Tiling** | Snap tiles onto a grid. Crooked tiles cost satisfaction. | Lay a rug over it | Two people can tile from opposite corners and meet in the middle (mostly) |
| **Painting** | Roll paint over the wall until coverage hits 100% | Paint over the mold / the stain / the raccoon | Paint is a shared resource. Someone always stands in the wet paint. |
| **Plumbing** | A pipe-connect puzzle. Water flows when you're done, and leaks show where you messed up. | Duct tape + a bucket under the sink | One player reads the blueprint and one connects the pipes |
| **Electrical** | Match wires by colour, then flip the breaker. Wrong match gives sparks and a frizzy-hair ragdoll. | Run everything off one extension cord | The breaker box is in the basement, so you need a callout: "FLIP IT!" |
| **Decking** | Hammer a nail into each board with a timing ring. Skipped nails make the deck bouncy. | Skip half the nails | Rhythm sections with 2+ players get a speed combo |
| **Demolition** | Swing the sledge to smash marked walls. Fast and fun. | n/a: the risk is **load-bearing walls**, which only show on the blueprint | Someone has to actually read the blueprint first |
| **Appliances** | Carry and install the fridge / tub / oven (HOLD THIS style) | Leave it unplugged and push it against the wall | Classic 4-person couch carry through a narrow door |
| **Cleanup** | Toss debris into the dumpster (trash basketball) | Shove it all into a closet | Throwing trash at each other is mandatory |

**The skill ceiling is planning, not reflexes.** Good crews split up efficiently, read the client card to decide what's worth doing properly, and save hacks for places the client won't look.

---

## 4. Walkthrough: cover-up verbs

Everyone can use every verb. Each one has a cost or cooldown, so you have to choose instead of spamming one.

| Verb | Effect | Cost / limit |
|------|--------|--------------|
| **Small Talk** | Hold to make the client face you and pause | Repeating the same topic loses effect ("you said that already"). Quirks give bonus topics. |
| **Body Block** | Stand in front of a flaw | Client asks you to move after ~4 sec. Awkward shuffle dance. |
| **Hold It Up** | Physically hold up a falling cabinet / shelf / ceiling panel | You can't do anything else, and your arms shake over time |
| **Noise Cover** | Run the blender / saw / shop-vac to hide creaks and drips | Too loud for too long annoys the client (+suspicion) |
| **Door Shut** | "That room's not ready yet!" | Each room you lock off raises baseline suspicion a bit |
| **Mood Lighting** | Kill the lights in a room ("it's a vibe") | The client might turn them back on. Flawed lights may not come back on. |
| **Pet Distraction** | Throw a ball for the client's dog to pull the client's gaze | Only works on clients with pets, and the dog may run into a flaw |
| **Fake Injury** | Dramatically fall down. Huge distraction, the client rushes over. | Once per walkthrough, and it lowers your pay ("liability") |
| **Air Freshener** | Masks smell-based flaws (mold, gas, the raccoon) | Overdoing it makes the client cough (+suspicion) |

**Clients interact with things:** they sit on chairs, flush toilets, open cabinets, turn on taps and bounce on the deck. Each type has a predictable checking style:

| Client type | Checks | Weak to |
|-------------|--------|---------|
| **Retired Inspector** | Behind things, under sinks | Compliments about their old career |
| **Influencer** | Only what's in the "photo spots," but films everything | Good lighting, and Mood Lighting backfires |
| **Grandma** | Sits on every chair, uses every bathroom | Small talk about grandkids (works extremely well) |
| **Tech Bro** | Tests every outlet and the wifi | Buzzwords |
| **Couple Who Is Fighting** | Split up and check different rooms at the same time | Getting them to argue again (they forget the house) |
| **HOA President** | Exterior only: paint colour, lawn, gnome placement | Nothing. Pure skill. |

---

## 5. Surprises (mid-job events)

Every surprise is a **choice, not just a penalty**: handle it properly (costs time or money) or hide it (adds a Flaw).

- 🦝 **Raccoon in the wall:** relocate it (minigame: chase it with a box) or drywall over it (it makes noises during the walkthrough).
- 🧱 **Previous Contractor's work:** you open a wall and find *Big Gary's* hacks inside, like a load-bearing stack of pizza boxes. Big Gary is your recurring rival with even worse ethics.
- 💧 **Burst pipe:** water level rises in the room. Everyone drops what they're doing.
- 👵 **Client's mom shows up early:** a mini-walkthrough mid-build.
- 📦 **Wrong delivery:** you ordered 40 tiles and got 40 toilets. Use them anyway?
- 🏆 **Time capsule / treasure:** found in the wall. Return it for reputation, or sell it for cash.
- 🐝 **Wasp nest:** the room is now off-limits unless someone takes one for the team.
- 🚓 **City Inspector:** a rarer, tougher walkthrough who can't be distracted by small talk. Only donuts work, and you have one box.

---

## 6. Progression and meta

- **Cash** buys:
  - Tool upgrades: a faster drill, a paint sprayer, a laser level.
  - Van upgrades: more catalog space, a mini-fridge (instant snacks restore Small Talk stamina).
  - Cosmetics: mustaches, hard hats, company logo and van paint jobs.
- **Reputation (★1–5)** unlocks richer clients (bigger budgets, pickier quirks) and bigger jobs (full house, mansion, the Mayor's pool).
- **The Neighborhood Map** persists:
  - Every house you worked on stays on the street in its current state.
  - Your botched deck has caution tape. Grandma's bathroom is still perfect.
  - Clients on the same street **talk to each other**. Lie to one and her neighbour arrives already suspicious.
  - The street is your scoreboard and your history.
- **Callbacks:** a botched job comes back as a *Callback*. The same client is already furious (suspicion starts at 50%), and you have to fix your own past hacks.
- **End-of-week events:** Friday brings payday, the **Yelp review reel** (read in a dramatic voice), and sometimes **Small Claims Court**: a voice-chat bit where the crew pleads its case to a judge NPC with a "believability" meter.
- **Late-game modifier: "Flip or Flop" TV crew.**
  - A reality show films your jobs, and the camera is a second view cone you can't distract.
  - High risk, huge payout.

---

## 7. Fun moments to design toward (clip list)

These are the moments every system should be pointed at:

1. **The Rug Shuffle:** three players nudge a rug across the floor to follow the client while hiding a hole.
2. **"Are you holding it?":** the client opens a cabinet. Inside, a crew member is holding the entire shelf up, staring back.
3. **The Flush:** the client flushes the toilet, and a guy in the basement gets soaked.
4. **The Dramatic Fall:** someone uses Fake Injury and rolls down the stairs. The client rushes over and steps right onto the bad floorboard.
5. **Raccoon Encore:** perfect walkthrough. Client says "Wonderful!" From inside the wall: *chittering*.
6. **3 Months Later:** the deck collapse at the BBQ. Every single job ends with a potential payoff.
7. **Big Gary's Pizza Box Column.**
8. **Neighbour Gossip:** you lied to Mr. Patel last week, and now Mrs. Patel arrives with a flashlight.
9. **The Perfect Job:** the rare "we actually did it right" run, where the client cries happy tears and tips huge. Make honest work feel *great* too.

---

## 8. Design principles (fun-hard, not hard-hard)

1. **Players always know their sins.** Flaws are visible to the crew. The challenge is *managing* lies, not discovering them.
2. **Clients are readable.** Quirks telegraph behaviour, routes show up as faint footprints, and a "?" icon warns before suspicion jumps. When you're caught, you know why.
3. **Every choice is a trade, not a trap.** Proper vs. hack, premium vs. bargain, honest vs. hidden. None is always right.
4. **Failure still pays.** A botched job still makes *some* money and always makes a clip. "Lawyer" outcomes create a Callback, a second chance, instead of a game over.
5. **Skill = coordination and judgment.** Task minigames stay simple. The depth comes from who does what, where to lie, and when to distract.
6. **Honesty can win too.** A full-premium honest job is a valid, satisfying playstyle. It's just harder to profit from.
7. **Short rounds, high stakes.** About 15 minutes a job, and a walkthrough that always ends in a laugh or a cheer.

---

## 9. Vertical-slice scope (the first build)

Prove the walkthrough is fun before building anything else.

**Must have:**
- 1 house: a single-storey bathroom + hallway + kitchen.
- 4 tasks: Drywall, Painting, Tiling, Plumbing, each with proper + hack.
- 1 client type: Grandma, with a waypoint route, sit/flush/open interactions and a view cone.
- 4 verbs: Small Talk, Body Block, Hold It Up, Noise Cover.
- Suspicion meter, a payout receipt, and a 3-flaw "3 Months Later" slideshow (static images are fine at first).
- 2–4 players, proximity voice or Discord.

**The fun test:** if 4 friends laugh during the walkthrough on the first try, build the rest.

**Tech notes:**
- The client is a waypoint follower with look-at targets.
- Flaws are tagged objects.
- Detection is a cone check plus a raycast for line of sight. No fancy AI.
- The hardest part is networking held objects (rugs, panels), which is solvable with host-authoritative physics.

---

## 10. Co-opetition: everyone's on the crew, everyone wants to be paid most

**Replaces the single crew score.** You win as an individual, but only if the company survives. Think *Mario Party* inside *Overcooked*: you need each other to finish the job, and you want the paycheck to say your name.

### The golden rule
> **The crew passes or fails together. The money is split by who did what, and who got blamed.**

- If the walkthrough hits **😠 Lawyer**, *nobody* gets job pay. That keeps everyone honest enough to cooperate.
- Below that line, everything is personal. Your sabotage has to be **just enough** to sink a friend without sinking the job. That tension is the whole game.

### Your paycheck (personal wallet = your rank)

| + / − | Source | How |
|-------|--------|-----|
| ➕ | **Timecard** | Every task you complete is logged under your name. Proper work pays more than hacks. |
| ➕ | **Tips** | The client tips *individuals*: whoever they liked (Small Talk), and whoever did the thing they admired. You compete to be the **Client's Favorite**. |
| ➕ | **Skim** | Secretly order Bargain Bin materials but bill them as Premium, and pocket the difference. This raises Fallout risk for *everyone*. |
| ➕ | **Side Hustle** | A secret personal objective card each job (see below) |
| ➖ | **Docked** | When the client finds a flaw, the pay is docked from **whoever's name is on it** |
| ➖ | **Fallout** | A "3 Months Later" disaster bills its owner, and the owner pays for the Callback |

Crew bonus: if the job passes 🙂, there's a flat bonus split evenly. It's a small reason to stay friends.

### Signed work: every flaw has a name
- Every task you do is **signed with your colour** (your initials on the drywall, your paint colour on the tiles).
- When the client spots a flaw they ask **"Who did this?"** and the blame goes to the signature.
- The crew can see everyone's flaws, so **you always know what to steer the client toward.**

### Sabotage verbs (cheap, quick, deniable)
- **Loosen:** undo a friend's proper work. It becomes a flaw *with their name on it*. Takes about 3 seconds.
- **Swap:** replace their Premium materials with Bargain Bin.
- **Forge:** re-sign one of your flaws with someone else's initials. Limited uses per job.
- **Tour Guide:** during the walkthrough, Small Talk the client *toward* a rival's room. "Oh, you HAVE to see the bathroom Kevin did."
- **Unhelp:** knock their painting off their hole, kick their rug, lock them in the closet while the client is in their room.

**Sabotage leaves evidence.**
- Loosened screws get your fingerprints.
- Forged initials are in your handwriting font.
- Your coloured paint leaves footprints.
- Anyone who catches you can **Report** you, which docks *you* and hands the money to them.

So sabotage is a skill: do it when nobody's looking, which you can check because everyone's position is visible in the house.

### Blame time (the voice-chat moment)
When the client finds a flaw with **forged or unclear** signatures, there's a 10-second **"WHOSE WORK IS THIS?"** freeze:
- Every player points at someone.
- Majority vote takes the blame. On a tie, the client picks whoever is closest, so get away from the flaw.
- It's a mini Among Us vote that happens mid-walkthrough. This is where friendships end.

### Side Hustles (secret per-player objectives, 1 per job)
Simple, funny, and slightly anti-crew:
- "Steal the client's garden gnome."
- "Install your cousin's used hot tub somewhere in the house."
- "Get the client to sit in a chair *you* built badly, without anyone noticing."
- "Get Dave blamed for 2 flaws."
- "Be the last one to touch the toilet before the client flushes it."
- "Take a nap in the client's bed during the walkthrough."

Side hustles pay out after the job, and they're revealed at the end of the week for maximum "YOU DID WHAT?"

### The Foreman (rotating power role)
- Each job, one player is **Foreman**:
  - Picks the job card and assigns task priorities on the clipboard.
  - Gets a **10% cut of everyone's pay.**
  - Takes the blame for any **unsigned** flaws, like hacks nobody claimed or the raccoon.
- **Last place becomes the next Foreman.** It's a built-in catch-up that also gives the loser some power, and a target on their back.

### End of job: the payslip reveal
- Each player gets a printed **payslip** that slides out of the van one by one, from lowest to highest, with drumroll and stamp sounds.
- Polaroid **awards** are worth bonus cash, Mario Party bonus-star style, so rankings can flip at the last second:
  - 🏆 **Employee of the Job:** most pay.
  - 🤥 **Smoothest Liar:** most flaws hidden successfully.
  - 🐀 **Snitch:** most Reports filed.
  - 🧹 **Actually Did Work:** most proper tasks.
  - 🎭 **Client's Favorite:** biggest tips.
  - 💀 **Liability:** most fallout disasters. Negative award, permanent cosmetic shame.

### End of week: the ranking that matters
- After 5 jobs, wallets are ranked.
- **#1 – Employee of the Week:** gold hard hat cosmetic, name on the van, picks next week's company name.
- **Last place – "You're Fired":** a short cutscene of them carrying a cardboard box to the curb. They start next week as the **Intern**: driving the van, an ugly orange vest, and +1 Forge use as a pity weapon.
- **If the company goes bankrupt** (reputation hits 0), *everyone* loses and the richest player is "arrested" in the ending cutscene. Being greedy enough to tank the company is its own punchline.

### Why this balance works
- **You need each other:** heavy tasks (drywall, appliances) are much faster with two people, and the Lawyer outcome wipes everyone. Pure backstabbing gets nobody paid.
- **You want to beat each other:** individual pay, signed work, tips and awards.
- **Sabotage is cheap but risky:** evidence plus Reports means the sneaky player has to *play well*, not just grief.
- **Catch-up keeps it close:** Foreman rotates to last place, the Intern gets a pity Forge, and bonus awards hit at the end. Nobody's out of it by job 3.
- **Every mechanic makes voice chat louder:** blame votes, Tour Guide betrayals, Reports and the Side Hustle reveal.

### Vertical-slice additions
On top of §9, the first build adds:
- **Signed work and per-player pay.** The "Who did this?" docking is the core of the competitive side.
- **One sabotage verb: Loosen.** Plus **Report** to counter it.
- **Payslip reveal** with 3 awards.

Hold Forge, Side Hustles and Foreman for the second build, once signed blame proves fun.
