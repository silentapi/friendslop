# BIG CRUMB: rules for working in this folder

Single sources of truth. Never guess: if it isn't in one of these, add it there first.

- `docs/GAME.md`: what the game is and how it plays. The five-step loop is sacred. Cut anything that doesn't make carrying funnier.
- `docs/ART.md`: palette, shapes, light, camera, UI. Every colour comes from `PAL` in `engine/render.js`, which mirrors ART.md.
- `trailer/cues.json`: every shot length and every timed beat. Animation, overlays and audio all read it.

## Build order (one layer at a time; render and look after each)

1. Greybox: shapes and scale only, so you can check that every scale cue in the shot agrees.
2. Light + camera: golden backlight, macro DOF, ant-eye height.
3. Characters + food detail.
4. Motion: anticipation → action → follow-through. Antennae always overlap.
5. Overlays (stickers, chat), and audio last.

## Rules

- **The world has no outlines; ants and food do.** Food is the only glossy thing.
- **Shadows are plum, never grey or black.** Outline ink is `#2a1730`.
- **Camera lives at ant height** (0.5–2 ant-heights). No god-view.
- **Everything is deterministic:** use `rnd()` and `hash()`, never `Math.random()`. Any frame must render on its own.
- **Friends feel alive:**
  - nobody stands still (idle sway, blinks, antenna drift);
  - reactions happen *after* the thing (look, beat, react);
  - voice lines overlap like real chat.
- **Reviewer loop.** After each layer, render stills and send them to a reviewer subagent that only looks and either approves or lists fixes. Fix one thing at a time and re-render.
- **Feedback must give a reason**, e.g. "too dark at dusk: can't read ant colours", not just "make it better".

## Commands (run from repo root)

- Serve: `npx http-server -p 8124 -s -c-1` from the repo root (pages live at `/big-crumb/...`).
- Look-dev stills: `node big-crumb/tools/shot.mjs <outDir> lookdev <frameName...>`
- Trailer stills: `node big-crumb/tools/shot.mjs <outDir> trailer <t | scene:name:fracs ...>`
- Trailer frames: `node big-crumb/tools/render.mjs <outDir> [workers]`
- Audio: `python3 big-crumb/trailer/audio.py <out.wav>`
