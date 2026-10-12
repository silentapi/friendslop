# OVER BUDGET: mockup screenshots

These are Three.js scenes rendered to PNG with headless Chromium. They're concept art for the look and HUD, not gameplay.

```bash
cd mockups
npm install
npx http-server -p 8123 -s -c-1 &   # serve the folder
node render.mjs                      # writes screenshots/shot-1..5.png
```

To preview a shot live, open `http://localhost:8123/index.html?shot=N` (N = 1–5) in a browser.

- `lib.js`: the character builder (bean body, big head, hard hat, mustaches), grandma, props, outlines and scene setup
- `shots.js`: the five staged scenes and their HUD overlays
- `render.mjs`: the screenshot script

## Job-site set (first-person, same moment from four players)

```bash
MOD=site node render.mjs   # writes screenshots/site-1..5.png
```

To preview one live, open `index.html?mod=site&shot=N`. The scenes are in `site.js`. See `docs/JOB_SITE.md` for the design.

### Polish layer (v2)
- `fx.js`:
  - procedural canvas textures: wood grain, tile, plaster, wallpaper, concrete, cinder block, grass, asphalt, siding, shingles
  - a gradient sky dome and puffy clouds
  - volumetric-style light shafts and dust motes
  - props: tools, cones, scaffolding, power lines and more
  - post-processing: GTAO ambient occlusion, bloom, and colour grade with vignette and grain
- `hud.css`: the game HUD system (objective tracker, compass, player card, radio feed, hotbar, world-anchored prompts, sound pings)
- Rendering takes about 15s per shot under software WebGL.

## Trailer (54s, 24fps, 1280×720)
- `trailer.html` + `trailer/`:
  - `core.js`: rigs, poses, particles, overlay helpers
  - `sets.js`: environments
  - `scenes.js`: the 20 shots
  - `main.js`: frame driver
  - `audio.py`: the procedural score, SFX and voices
- To render, run these from `mockups/` with the local server on port 8123:
  1. `node trailer/preview.mjs out scene:sabotage:0.2,0.8` to preview stills.
  2. `node trailer/render.mjs frames 3` to render all frames on 3 workers (~25 min).
  3. `python3 trailer/audio.py trailer.wav` to build the soundtrack.
  4. `ffmpeg -framerate 24 -i frames/f%05d.jpg -i trailer.wav -c:v libx264 -crf 21 -pix_fmt yuv420p -c:a aac -shortest out.mp4` to encode.
- The output is `/trailer/over_budget_trailer.mp4`, and the shot plan is in `docs/TRAILER_PLAN.md`.
