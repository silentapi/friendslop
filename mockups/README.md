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
