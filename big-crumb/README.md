# BIG CRUMB

A co-op "friendslop" game concept: you and up to 3 friends play ants carrying giant snacks home to a hungry Queen. The world is a Pokopia-inspired "Block Backyard" and a giant house.

- `docs/GAME.md`: the game: loop, controls, world, setbacks, the giant Mom, and the UX polish rounds.
- `docs/ART.md`: art direction: the Pokopia-based look, palette, and rules.
- `docs/TRAILER.md`: trailer research and the shot-by-shot intent sheet.
- `CLAUDE.md`: working rules for this folder.
- `engine/`: Three.js render core, the ant rig, the giant human, block terrain, kitchen, sets and the sticker UI.
- `trailer/`: `cues.json` (the single source of timing), the shot code, and `audio.py` (procedural soundtrack).
- `lookdev/`: look-development stills (v1 cartoon frames are kept for reference).

## Render the trailer

Run these from the repo root:

```
npx http-server -p 8124 -s -c-1 &
node big-crumb/tools/shot.mjs out/stills trailer donut:0.5 freeze:0.5   # preview stills
node big-crumb/tools/render.mjs out/frames 4                           # all frames
python3 big-crumb/trailer/audio.py out/audio.wav
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1 -c:a aac -b:a 192k -ar 48000 -shortest big-crumb/trailer/big_crumb_trailer.mp4
```

`node_modules` is a symlink to `../mockups/node_modules` (three.js and playwright).
