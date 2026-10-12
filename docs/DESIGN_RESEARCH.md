# Construction Friendslop: Research and Pitches

## Part 1: What "friendslop" is and why it sells

"Friendslop" is a jokey label for cheap co-op games, usually 1–4+ players, that are mostly fun because of who you play with. It caught on after a viral tweet about *Lethal Company* in 2025. The main examples are *Among Us*, *Phasmophobia*, *Lethal Company*, *Content Warning*, *R.E.P.O.*, *PEAK*, *Schedule I*, *Chained Together* and *RV There Yet?*. In 2025, 4 of Steam's 10 best-selling games by copies were friendslop. Estimates put R.E.P.O. at about 18.5M copies and PEAK at about 15.4M. These numbers come from trackers, so treat them as rough.

### The patterns that keep showing up

| # | Principle | What it looks like | Why it works |
|---|-----------|-------------------|--------------|
| 1 | **Your friends are the challenge** | Lethal Company's quota, R.E.P.O.'s fragile loot, RV's "one drives, the rest keep it alive" | The game sets up the situation and your friends' mistakes do the rest. Blame, rescues and panic are the content. |
| 2 | **Physics makes the variety** | R.E.P.O. loot breaks when it hits a wall; PEAK has ragdoll falls; RV has wobbly winches | Small teams can't hand-build lots of content. Physics plus player behaviour makes a different story every run. |
| 3 | **Talking is a resource** | Proximity voice, walkie-talkies, muffled rooms | Splitting the group up creates tension. "Where are you?" is gameplay. |
| 4 | **Easy to learn, hard to coordinate** | You learn the controls in 30 seconds and still fail because 4 people need to sync | New players join instantly. Skill means teamwork, not reflexes. |
| 5 | **Clunky controls on purpose** | Floppy grabs, ragdolls, imprecise carrying | Clunky controls cause failures that are funny, not frustrating. |
| 6 | **A short, repeatable session loop** | Quota → expedition → extract → shop → harder quota | Runs of 15–40 min fit a Discord night. Rising stakes keep people saying "one more." |
| 7 | **Easy to clip** | Clear silhouettes, big reactions, a scoreboard that shows who messed up | Streamers and TikTok clips are the marketing budget. A good clip is readable in 3 seconds. |
| 8 | **Cheap and ugly is fine** | $5–10, low-poly, lo-fi shaders | Low price makes it easy for a whole group to buy. Low-fi art hides jank and is quick to make. |
| 9 | **Silly characters** | R.E.P.O.'s googly-eyed robots, cosmetics, emotes | Self-expression and screenshots. Cosmetics are a cheap reward. |
| 10 | **Room for mods and growth** | Bigger lobbies, new monsters | Community content keeps the game alive for longer. |

The trap is that people dismiss the genre as low effort, but the winners all have **one sharp, original mechanic** that everything else supports: R.E.P.O.'s fragile loot, PEAK's stamina-climbing, RV's group-driven vehicle. Pick one hook and get it right.

### Construction-themed competition (as of Oct 2026)

- **Dumb Ways to Build** (Sept 2026, $7.99, 1–4 online): grab and throw junk, nail-gun it together into bridges and ramps. **This is the closest competitor.** Don't make "nail stuff together to cross a gap."
- **Salvation Denied** (autumn 2026): co-op physics building with robot construction crews.
- **Clash of Builders** (Feb 2026): competitive block stacking with wind.

So "co-op physics building" is already taken. The open space is **construction as a job**: quotas, inspections, demolition, cranes, cutting corners, and the culture of the job site.

---

## Part 2: Why construction fits the formula

The job already has the ingredients:

- **Built-in roles:** crane operator, spotter, welder, foreman, the guy who leans on the shovel.
- **Built-in comms problem:** crane operators literally can't see the load and rely on a spotter on the radio. That's proximity voice as a real mechanic.
- **Built-in quota:** deadlines, budgets, inspections. It's Lethal Company's quota with a hard hat on.
- **Built-in physics comedy:** I-beams swinging, scaffolds collapsing, porta-potties tipping, cement trucks.
- **Built-in blame:** "Who cut that beam?" The structure you build is evidence of every mistake.
- **Iconic images:** *Lunch atop a Skyscraper*, hard hats, hi-vis, orange cones. Easy to read in clips.

---

## Part 3: The pitches

### Pitch 1: LOAD BEARING

> 🏗️ you and 3 friends have one shift to build a 6-story building. one of you is in the crane and CAN'T SEE. the rest are yelling into radios. the inspector shows up at 5pm and kicks every wall. if it falls, you're fired. if it stands, the next one's taller. **LOAD BEARING** — wishlist now

**Core hook:** asymmetric crane-and-spotter co-op with a real structural-integrity simulation.

**Loop (one shift, about 20 min):**
1. **Morning:** the foreman's clipboard shows the blueprint (outline, floors, required features: "needs a balcony," "client wants a pool on the roof").
2. **Build:** materials arrive by truck. Beams, slabs, wall panels and bolts are all physics objects. One player runs the crane from a cab with limited view. Spotters guide over radio and hand-signal emotes. Others bolt, weld and carry.
3. **Stress system:** every joint has a load value. Overloaded joints creak, then glow, then snap. Glowing is optional; audio cues are funnier.
4. **5pm inspection:** an NPC inspector walks through, jumps on floors, and kicks walls. A wind gust or earthquake tests the building. You get a grade and a payout.
5. **Between shifts:** spend pay on better tools (impact driver, laser level, a second crane) or cosmetics. Quotas go up and sites get harder: hillside, swamp, between two existing towers.

**Why it works:** the crane is RV's driver role in a new form (one person with power, everyone else with information). The collapse at the end is a free highlight clip every round.

**Vibe-code difficulty:** medium. The hard part is a believable but cheap stress model. Use a graph of joints with a load budget that propagates down, not real FEM.

---

### Pitch 2: CONDEMNED

> 🔦 night-shift demolition crew. strip a condemned building for copper and scrap before the quota's due. every wall you knock out makes the building weaker. and something in the basement does NOT want it torn down. **CONDEMNED** 🏚️

**Core hook:** Lethal Company/R.E.P.O.'s extraction loop, but **the level falls apart because of what you do**. It's Jenga with a horror monster.

**Loop (one night, about 25 min):**
1. Drive the crew truck to a procedurally generated condemned building (apartments, mall, hospital, school).
2. **Salvage:** rip out copper pipe, wiring, fixtures and antiques. High-value loot is often *behind or inside load-bearing walls*. Fragile loot (chandeliers, stained glass) loses value if it's damaged, like R.E.P.O.
3. **Integrity meter:** every swing of the sledgehammer weakens the building. Floors sag, dust falls, beams groan. Push too far and floors collapse; push really far and the whole building comes down.
4. **The threat:** squatters' traps, rats, a feral security guard, and the Foreman Who Never Clocked Out (a ghost that resets the structure or drags you into the walls). Noise from demolition attracts it.
5. **Extract:** load the truck before dawn or before the collapse. The quota rises nightly. Fail and you're "laid off" (run over).

**Why it works:** it's the most proven loop in the genre, plus a mechanic only construction has: *destroying the map is how you score, and it also kills you.* Building collapses make great clips.

**Vibe-code difficulty:** medium-high. Pre-fractured, chunked walls work; real-time voxel destruction doesn't. Use a simple integrity graph per floor.

---

### Pitch 3: OVER BUDGET

> 📋 the client wants a dream home. you have a $40k budget and 4 idiots. cover the hole in the floor with a rug. hide the raccoon in the wall. tape the pipe. walk-through is in 10 minutes. smile. **OVER BUDGET** — the contractor game where cutting corners IS the game

**Core hook:** a social bluffing and repair game. You're the shady contractor crew. Build fast and cheap, then *disguise* the shoddy work before the client walkthrough.

**Loop (one job, about 15 min):**
1. **Bid:** pick from 3 job cards (kitchen reno, bathroom, deck, full house). Higher bids pay more but come with a fussier client.
2. **Build:** House Flipper-lite tasks: tile, paint, plumbing, drywall. Every task has a fast, sloppy way (duct tape, wrong screws, skip the beam) and a slow, correct way.
3. **Skim the budget:** money you don't spend on materials is profit, so you're always tempted.
4. **Walkthrough:** the client NPC tours the house with a sightline cone. The crew distracts them, blocks doors, flushes toilets to cover a creaking floor, and stands in front of the stain. It's a cooperative heist.
5. **Fallout:** problems show up after the walkthrough ("3 months later…" cutscene of the deck collapsing at a BBQ). Your Yelp rating goes up or down. Bad ratings get you worse clients and building inspectors.

**Why it works:** improv and lying are the comedy (Among Us energy, but cooperative). Clips are naturally funny ("I'm standing on the hole, keep walking"). It's also clearly different from Dumb Ways to Build.

**Variant:** one secret **"Snitch"** per crew who works for the inspector. That adds Among Us-style social deduction.

**Vibe-code difficulty:** low-medium. Mostly interaction systems and NPC sightline AI; physics only matters for the fallout scenes.

---

### Pitch 4: HIGH STEEL

> 🌆 the building isn't finished. you are. 4 ironworkers, one skyscraper, no top floor. bolt the next beam in before you run out of grip. eat lunch on the girder for the photo. don't look down. **HIGH STEEL** 🥪

**Core hook:** PEAK's vertical climbing-and-stamina co-op, but **you build the route you climb**.

**Loop (one ascent, 30–45 min):**
1. Start on a half-built steel frame. Each "floor" is a set of beams that a crane drops to you, one at a time.
2. **Grip and stamina:** climb, balance on beams, and clip your harness. The harness is a rope to a teammate, *Chained Together* style. Falling yanks your buddy.
3. **Place beams:** two players hold a beam in position while a third bolts it. Bad placement makes the frame lean.
4. **Weather and events:** wind gusts, pigeons, a dropped wrench (from above, it kills someone below), the lunch whistle.
5. **Lunch break:** a scripted moment where everyone sits on a girder for a photo, recreating *Lunch atop a Skyscraper*. The photo saves to an in-game album. It's free marketing.
6. Each run reaches a new height record and each biome is a new city (NYC 1930s, Dubai, a space elevator).

**Why it works:** heights plus ragdolls plus ropes is proven (PEAK, Chained Together). The "you build your own path" twist is new, and the lunch photo is a shareable ritual.

**Vibe-code difficulty:** medium. Climbing controllers are fiddly. Beam snapping is easy.

---

### Pitch 5 (wildcard): WRONG ADDRESS

> 💥 demolition crew. one clipboard. the address is smudged. three houses on the street look the same. the homeowner might be home. you have a wrecking ball. **WRONG ADDRESS** 🏠🏠🏠

**Core hook:** a short party-game mode built on investigation plus a demolition payoff. The crew reads clues (mail, house numbers, neighbour gossip) to work out which house to knock down, under time pressure. Knocking down the wrong one is a hilarious disaster that still earns *some* points. Best as a **mode inside Condemned or Load Bearing**, not a standalone game.

---

## Part 4: Recommendation

**Lead with LOAD BEARING, and plan CONDEMNED's night shift as the expansion.**

- It's the clearest one-sentence pitch ("one person drives the crane blind, everyone else yells"), and it's distinct from Dumb Ways to Build (theirs is scrappy junk-gluing; this is structural engineering with a blind operator).
- It produces a **clip every round** (the inspection collapse).
- The crane-and-spotter split gives proximity radio a *real* job.
- It works as a vertical slice: one site, one crane, three beam types, one inspector. That's buildable in weeks.
- It extends naturally. Pitch 3's walkthrough-bluffing can become the inspector phase ("hide the cracked weld"), and Pitch 2's demolition can become night shifts.

A hybrid to consider is **Load Bearing + Over Budget's cheating**: let players skip bolts or use cheap steel to save money and buy upgrades, then sweat through the inspection. That adds risk and reward on top of the building and gives the group something to blame each other for.

### Minimum fun prototype (test this first)

1. Flat lot, 2–4 players, first-person, a floppy grab-and-carry.
2. A crane with a cab camera at a bad angle, a hook and a swinging cable.
3. Three pieces: beam, column, floor slab. Bolt them with a hold-E-to-bolt minigame.
4. A joint-load graph that creaks and snaps.
5. A 5-minute timer, then an "earthquake" shake. Score = height still standing.
6. Proximity voice plus a crane-cab radio channel.

If 4 people are laughing within 10 minutes of this, the game works. If not, try Condemned's integrity-destruction prototype next.

### Tech notes for vibe coding

| Option | Pros | Cons |
|--------|------|------|
| **Unity + Netcode/Fish-Net + Steam (Facepunch.Steamworks) + Dissonance/Vivox for voice** | What Lethal Company, R.E.P.O. and Content Warning use. Lots of LLM training data. Steam lobbies. | Physics networking is still hard. Unity licensing. |
| **Godot 4 + Jolt physics + Steam multiplayer peer** | Free, lightweight, LLMs handle GDScript well. | Smaller ecosystem for voice chat. |
| **Browser (Three.js + Rapier + WebRTC/PeerJS or Colyseus)** | **Share a link, no install, no purchase.** Fastest to test with friends. Easy for an LLM to iterate on. | Voice and physics sync over WebRTC take work. Steam release would need a wrapper later. |

For quickly testing whether it's fun, **a browser prototype (Three.js + Rapier + a small authoritative Node server)** is the fastest way to get 4 friends in a lobby tonight. Move to Unity or Godot once the hook is proven.

**Physics networking tip:** make the host authoritative over all physics objects and send transforms to clients at 20–30 Hz with interpolation. Have the client predict only its own player. Friendslop players forgive jitter; it's part of the look.

---

## Sources

- [Friendslop (Wikipedia)](https://en.wikipedia.org/wiki/Friendslop)
- [AppMagic: Why Clumsy Co-Op Games Took Over Steam in 2025](https://appmagic.rocks/blog/friendslop-steam-games-2025)
- [Argentics: What Makes Friendslop Games Work as Art and Production](https://www.argentics.io/what-makes-friendslop-games-work-as-art-and-production)
- [GamesMarket: The Rise of Friendslop](https://www.gamesmarket.global/the-rise-of-friendslop-why-low-fidelity-social-chaos-is-shaking-up-the-games-industry/)
- [Creative Bloq: What is friendslop and why is it taking over gaming in 2026?](https://creativebloq.com/3d/video-game-design/what-is-friendslop-and-why-it-it-taking-over-gaming-in-2026)
- [Inverse: Friendslop, PEAK, REPO](https://nc.inverse.com/gaming/friendslop-peak-repo-fortnite-trend)
- [CoopQueue: What Is Friendslop?](https://coopqueue.com/explained/what-is-friendslop/)
- [Proximity chat (Wikipedia)](https://en.wikipedia.org/wiki/Proximity_chat)
- [GosuGamers: RV There Yet hits 100k players](https://www.gosugamers.net/entertainment/news/77522-rv-there-yet-hits-100k-players-as-steam-s-latest-co-op-success)
- [GamingOnLinux: Dumb Ways to Build](https://gamingonlinux.com/2026/08/dumb-ways-to-build-brings-some-funny-co-op-from-dumb-ways-to-die-on-september-10)
- [Cyprus Mail: Salvation Denied](https://cyprus-mail.com/2026/03/25/cyprus-publisher-grows-gaming-portfolio-with-new-title)
- [Game Developer: Clash of Builders](https://www.gamedeveloper.com/press-release/clash-of-builders-out-now-on-steam)

---

## Part 5: Round 2 — simpler, dumber, funnier

Rules for this round: **a goal you can explain in one sentence, lots of funny ways to fail, and nothing technically scary** (no structural sim, no destruction, no fluids).

### HOLD THIS
> 🪟 4 guys. 1 giant pane of glass. get it from the truck to the 3rd floor. there's a ladder. there's a dog. there's a guy on a forklift who doesn't know you exist. it's $40,000 glass. **HOLD THIS** 🫠

- **Goal:** carry the item from the truck to the X.
- **Each level is a different cursed object:**
  - 30 ft of PVC pipe through a hallway with a turn.
  - A wet-paint door.
  - An unsecured hot tub.
  - A wedding cake for the foreman's daughter.
  - A live wasp nest.
  - The boss's sleeping cat.
- **How you fail:**
  - Everyone is holding a corner, so one person walking backwards into a pole ruins it.
  - Someone sneezes, which is a button everyone has.
  - A seagull lands on it.
  - Someone lets go to scratch their nose.
- **Tech:** one rigid body with 4 grab points and a crack meter. It's Moving Out/Carry Me logic, and the easiest of these to build.

### LOOK BUSY
> 😴 your crew has done nothing all day. the boss's truck just pulled in. you have 8 seconds to look like you've been working. one guy is asleep in the excavator. one guy is in the porta-potty. one guy is ON the porta-potty. **LOOK BUSY**

- **Goal:** survive the shift without getting caught slacking.
- **The loop:**
  - Slack off to fill your "chill meter," which is your score. You can nap, play cards, eat 9 donuts or ride the cement mixer.
  - When the boss NPC wanders around, grab a tool and do a "look busy" action: hammer the air, measure a stick, point at a blueprint upside down.
  - The boss has a view cone and a suspicion meter.
- **How you fail:**
  - A friend pushes you over mid-nap.
  - The porta-potty you're hiding in gets tipped.
  - You "hammer" right next to the boss and hit him.
  - Someone panics and starts working on the wrong building.
- **Escalation:** later days add a drone and the boss's nephew (a snitch). On the final day, the client and the boss arrive at the same time.
- **Tech:** NPC with a view cone, timers and emotes. Very easy, and it makes the best streamer clips of the bunch.

### WET CEMENT
> 🧱 the concrete truck is here and the hose is alive. fill the foundation before it sets. anyone who falls in stays in. forever. our foundation has 3 coworkers in it. **WET CEMENT** 🫡

- **Goal:** fill the outlined foundation before the timer ends.
- **How it plays:** the hose is a flopping physics noodle that takes 2 people to aim. Cement is just rising flat planes plus blobs, not real fluid.
- **How you fail:**
  - The hose gets loose and coats your friend.
  - Players stuck in cement become permanent statues in that level.
  - The truck rolls downhill because nobody set the brake.
- **The best part:** every level keeps your "fossilized" friends as a monument. The scoreboard reads "Workers Lost: 3."

### WRECKING CREW
> 🏚️🏠 knock down the ugly house. NOT the nice house next to it. NOT the church. NOT the ice cream truck. one guy drives the crane, one guy swings the ball, two guys "direct traffic." **WRECKING CREW** 💥

- **Goal:** demolish the house that's tagged red. Collateral damage comes out of your pay.
- **How you fail:** the wrecking ball has momentum and nobody understands it.
- **Tech:** houses are stacks of plain physics boxes, so there's no fracture system. Lowest effort for the biggest explosion clips.

### ONE BRICK
> 🧱 the building is done. it needs one more brick. the last brick goes on the roof. the roof is 40 floors up and the elevator is broken. you are 4 men and 1 brick. **ONE BRICK**

- **Goal:** get the brick to the roof. That's it.
- **How it plays:** a vertical obstacle course with scaffolding, swinging beams and a guy on lunch who won't move.
- **Throwing:** you can toss the brick to a teammate, but you can also hit them in the head and knock them down 3 floors.
- **Why it works:** it's Getting Over It plus PEAK, with a hard hat.

### SAFETY THIRD (a layer for any of the above)
> 📼 every time you mess up, the game remembers. at the end of the shift you all watch the company safety video. it's 100% your footage. "DON'T do what Kevin did." **SAFETY THIRD**

- **How it works:** the game auto-records the 5 worst incidents. At the end of the round it plays them back as a cheesy 90s VHS safety video with narrator voice lines and a "DAYS SINCE LAST ACCIDENT: 0" sign.
- **Awards:** "Employee of the Month" goes to whoever caused the most chaos.
- **Why it matters:** this is the clip-generator feature. Bolt it onto whichever game you pick.

### Round 2 recommendation

**LOOK BUSY + SAFETY THIRD**, with HOLD THIS jobs as the "work" you're avoiding: the boss forces you to carry dumb stuff whenever he catches you.

- Simple goal, many failure modes.
- Every mechanic is easy to build: view cones, timers, grab points, emotes.
- Lots of room for dumb content: new hiding spots, new cursed objects, new boss types.
