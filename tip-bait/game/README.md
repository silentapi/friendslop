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
