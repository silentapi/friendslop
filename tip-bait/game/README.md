# TIP BAIT — the game

Desktop-first 3D web game (works on touch too). Deliver an iced caramel macchiato through real Downtown Orlando
(OpenStreetMap streets and buildings) to Kyle S at Citi Tower, 101 Lake Ave, floor 20. He takes the tip anyway.

- **Play:** https://claude.ai/artifact/Gkp4oi7z7tQGeQAw57bFDX (private until shared)
- **Controls:** ← → / A D lanes · ↑ W Space jump · Shift boost · hold Space to accept an order · Enter = watch ad
  to continue after a crash · R restart · M mute · stairs: alternate ← →
- **Routes (real streets):** Order 1 S Orange Ave → E Church St → Lake Ave. Order 2 W Church St (brick) across the
  SunRail at Church Street Station → E Church St → Lake Ave. Orders 3–4 add a Florida storm; tips keep "going up".
- **Build:** `node tip-bait/game/build.mjs` → `tip-bait/game/dist/` (one inlined page + assets; three.js from jsDelivr).
- **QA:** `node tip-bait/game/tools/qa2.mjs <outDir> play|crash|finale|ramp <order>` — deterministic stepping
  (`?qa=1`), autopilot, screenshots. Data tools: `tools/route.py`, `tools/city.py`, `tools/glb2json.py`.

## How it plays

1. **The order.** Kyle S orders his iced caramel macchiato again. The order card shows his promised tip and your own reaction to him ordering again.
2. **The ride.** It runs through real Downtown Orlando streets, with a fresh obstacle layout every run.
   - **Dodge and jump:** ← → switches lanes, ↑ or Space jumps, Shift boosts.
   - **Coins and combo:** collect tip coins to build a combo multiplier from x1 to x5.
   - **Power-ups:**
     - 🧲 magnet
     - 🪖 helmet shield (blocks one crash)
     - ❄️ cooler bag (stops the ice melting)
     - ✖2 double coins
   - **Skill checks:** blinking cars that cut into your lane, barrier chicanes, road-closed walls, a mega ramp over a LYNX bus, and the SunRail jump. On the big jumps a quick-time trick prompt appears in slow motion.
   - **Kyle's texts:** they arrive as notifications in the top-right corner. If you run late or crash, he docks the tip.
3. **Citi Tower.**
   - **The front door:** it's locked. Wave (← →) and knock (Space) until the receptionist looks up from her phone. It works best while she's looking.
   - **The elevator:** out of order.
   - **The stairs:** a rhythm climb. Press ↑ on the beat, and get past a dog, a wet floor and a mop bucket on the landings.
4. **The door.** Kyle takes the coffee, then the tip. The results screen shows your score, a grade from S to D, and your best score.

See `PLAN.md` for the full design checklist.

## Deploy to your own server (VPS)

`node tip-bait/game/build.mjs` also writes `dist-site/`: a self-contained static folder with three.js bundled in, so no CDN is needed. It runs from any path, for example `yoursite.com/tip-bait/`.

- **From your machine:** `./tip-bait/game/deploy/deploy.sh user@yoursite.com /var/www/html/tip-bait` builds the folder and rsyncs it over SSH.
- **From GitHub:** add the secrets listed at the top of `.github/workflows/deploy-tip-bait.yml`, then run **Actions → Deploy Tip Bait**. Every build also uploads the folder as a downloadable `tip-bait-site` artifact.
- **Web server config:**
  - nginx: paste `deploy/nginx-tipbait.conf` into your server block.
  - Caddy: see `deploy/Caddyfile.example`.
  - Apache: no config needed when the folder is under the document root.
