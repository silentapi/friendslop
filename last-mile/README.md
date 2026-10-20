# LAST MILE

Concept TikTok trailer for a courier game set in real downtown Orlando (Starbucks on Orange Ave → Citi Tower, floor 20).

- `docs/TRAILER.md`: shot sheet, the Citi Tower reference notes, real-place facts.
- `engine/`: Three.js render core (`core.js`), downtown street grid + towers (`city.js`), real landmarks incl. Citi Tower
  (`landmarks.js`), the courier + e-bike rig (`rider.js`), lobby/stairwell/corridor (`interiors.js`), HUD (`hud.js`, `hud.css`).
- `trailer/`: `cues.json` (single source of timing), `shotsA.js` / `shotsB.js`, `audio.py` (procedural soundtrack).
- `tools/`: `shot.mjs` (stills), `render.mjs` (all frames).

## Render

From the repo root (`node_modules` is a symlink to `../mockups/node_modules`: run `npm install` in `mockups/` first):

```
npx http-server -p 8124 -s -c-1 &
node last-mile/tools/shot.mjs out/stills trailer arrive:0.3,0.8      # preview stills
node last-mile/tools/render.mjs out/frames 4                         # all 1176 frames (1080x1920)
python3 last-mile/trailer/audio.py out/audio.wav
ffmpeg -framerate 30 -i out/frames/f%05d.jpg -i out/audio.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart last-mile/last_mile_trailer.mp4
```
