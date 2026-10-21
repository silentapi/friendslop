# TIP BAIT: "make it a game" plan

The goal: one focused loop. Kyle S on floor 20 of Citi Tower wants Starbucks again. You get it there through real Downtown Orlando with skill, score and spectacle, and Kyle takes the tip anyway. Every run should play differently, give you a score to beat, and be funny.

## 1. Kyle is the story (personality and pacing)
- [x] **Order intro "ugh, it's Kyle again"**
  - Each order opens on a phone notification ("New order from **Kyle S** 🙄"), then a courier thought bubble.
  - The thought comes from a pool that depends on how many times you've delivered to him: "oh god. it's kyle again." / "he's never tipped. not once." / "maybe this time…"
  - Kyle's order note is also drawn from a pool and changes every run.
- [x] **Readable texts.** No more "fl 20".
  - Still lowercase text-speak, but full thoughts: "im on the 20th floor btw 🙄 elevators been broken since march", "hello?? my ice is literally melting".
- [x] **Texts as toast notifications.** They slide in from the top-right corner with a phone-notification look (avatar, "Kyle S · now", message) and stack (max 2), never in the middle of the screen.
- [x] **Kyle reacts to how you're doing:**
  - Falling behind the ETA: angry texts, and the tip ticks down live on the HUD ("-$5 😤 tip lowered").
  - Crashes: "bro did u just fall off ur bike??" and the tip drops.
  - A great run: "ok ur actually fast" (the tip still goes to $0 at the door).
- [x] Courier inner-monologue toasts at key moments: train gates down, LYNX bus, storm.

## 2. Score and replayability
- [x] **Live score:** distance, coins (+10), near misses (+50), smashes (+25), trick/QTE grades, clean-section bonus.
  - A **combo multiplier** (x1 to x5) builds from coins, near misses and tricks, and resets on a crash or a missed QTE.
  - The HUD shows score, multiplier and coin count.
- [x] **Delivery bonus:** time left × 20, ice left × 5, door QTE and stairs grades. The results screen shows a score breakdown, a letter grade (S/A/B/C/D), the **best score** (localStorage) and **NEW BEST!**
- [x] **Every run is different:** the obstacle and coin layout uses a fresh seed each run; the route alternates S Orange Ave and the SunRail route; weather and time-of-day vary. Same real streets, different run.
- [x] **Iconic Orlando:** Church Street Station / SunRail, LYNX buses, Mickey-ear tourists, swan-boat ad, Citi Tower canopy, palm-lined streets, place tags for each real street.

## 3. Coins and power-ups (Jetpack Joyride feel)
- [x] **Gold "tip coins"** in lines, sine waves, arcs over ramps and jumps, and zig-zags.
  - Collected coins fly up into the HUD coin counter with a chime whose pitch rises with the combo.
- [x] **Power-ups** on the road, each a floating, glowing pickup:
  - 🧲 **Magnet** (8 s): pulls coins and ice toward you.
  - 🛡️ **Helmet shield**: absorbs one crash.
  - ❄️ **Cooler bag** (10 s): the ice stops melting.
  - ✖2 **Double tip-coins** (10 s).
  - The active power-up shows on the HUD with a timer ring.
- [x] **Boost with skill:**
  - Boost still charges from near misses and pads.
  - During boost, cones and barriers smash for points, and **each near miss or smash during boost extends it** (chain it).
  - **Perfect-pad bonus:** hitting a pad dead-centre gives a longer boost and "PERFECT".

## 4. Quick-time events (cinematic, camera zoom, slow-mo)
- [x] **SunRail crossing jump:**
  - At the ramp lip: slow-mo, the camera swings to the side and zooms, and a key prompt appears (random arrow).
  - Hit it in the window: trick (tail-whip or no-hander), PERFECT/GOOD score and boost.
  - Miss it: sketchy landing, combo lost, no crash.
- [x] **Mega ramp over a LYNX bus:** a new set piece with a big jump, overhead camera, a QTE trick and a coin arc in the air.
- [x] **More jump types:**
  - Kicker ramps (small air over cones).
  - Mega ramps (QTE).
  - The rail jump.
  - Road-closed walls (bunny hop).
  - Planter-box gaps.
- [x] **The QTE prompt:** a big key icon with a shrinking ring. Grades: PERFECT (inner), GOOD, MISS. Desktop keys are arrows or WASD.

## 5. Citi Tower arrival: locked doors and the receptionist
- [x] Ride up, hop off, jog to the glass doors: **LOCKED** (rattle sfx, camera behind you looking through the glass).
- [x] Inside, a receptionist at the front desk scrolling their phone, ignoring you.
- [x] **"Get their attention" minigame:**
  - **Wave:** mash ← → alternately to wave. The wave meter fills and decays.
  - **Knock:** press Space when the "knock" ring lines up; a good knock adds a big chunk.
  - The receptionist glances up, then back down (meter drop) while Kyle texts "why r u just standing there".
  - Fill the meter: they finally look, sigh and buzz you in. The time taken counts against the ETA and score.

## 6. Elevator out of order, then a stairs QTE climb
- [x] The OUT OF ORDER sign gag (kept short).
- [x] **Stairs as a skill game (rhythm climb):**
  - A beat marker sweeps a bar; press ↑ on the beat to take a flight. PERFECT gives 2 steps at a time; mistiming makes you stumble.
  - **Landing events:** a neighbour's dog in the way (dodge ← or →), a "WET FLOOR" sign (jump ↑), a mop bucket (dodge).
  - Each is a prompt with a timer; missing one costs time and ice.
  - The floor counter runs up to 20 and the score adds up as you climb.
- [x] The door scene with Kyle: hand-off, then the tip reveal (unchanged; it works).

## 7. Readability and rendering fixes
- [x] **Lane stripes vanishing at distance:** caused by z-fighting with the road ribbon and mip-mapping. Fixed by lifting the stripes, polygonOffset and depthWrite off.
- [x] **The HUD tells you how you're doing:**
  - ETA pill turns orange, then red, and pulses under 15 s.
  - Tip value with its live changes.
  - Progress bar with landmarks.
  - Score and combo.
  - Ice meter.

## 8. QA (each phase)
- [x] Deterministic `?qa=1` autopilot runs over both routes and several seeds: 0 errors, the finish is reachable, the results screen fits 720p.
- [x] Screenshots of every new system (toasts, coins fly-out, power-ups, each QTE, receptionist, stairs climb).
- [x] Build, self-host build test, artifact republish, commit and push.
