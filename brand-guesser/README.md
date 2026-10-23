# CHAINED (working title): the daily fast-food brand guesser

Every day you get 5 photos of chain food: a pizza slice, wings, fries, a shake, a taco. Each is shown on the same plain plate with no packaging. For each one, pick which of 4 chains made it. Everyone gets the same 5. You can share your score as an emoji receipt.

- `docs/GAME.md`: the game: rules, difficulty ramp, the reveal, share format, look, modes, and name shortlist.
- `docs/DATA.md`: **the photo database, which is the real product**: how many photos we need, the schema, the shoot protocol and kit, the QA pipeline, and the scheduling rules.
- `docs/BUILD.md`: stack (Cloudflare Pages + one Worker + R2), API, anti-cheat, costs, roadmap.
- `docs/RESEARCH.md`: competitors, the daily-game market, copyright/trademark, image sources, and the chain × menu matrix notes.
- `data/catalog.json`: seed catalog with 116 chains and 68 categories (523 brand items). Each category has difficulty, look-alikes, giveaways and visual tells.
- `tools/schedule.py`: the puzzle scheduler and photo-capacity simulator.

## Run the simulator

Run from the repo root:

```
python3 brand-guesser/tools/schedule.py --launch                       # how many days N photos/item lasts
python3 brand-guesser/tools/schedule.py --launch --plan 365            # shot list: photos needed per item for a year
python3 brand-guesser/tools/schedule.py --launch --photos 5 --show 7   # print a sample week of puzzles
```

## Headline numbers

- **Year 1 needs 1,825 photos** across ~325 items (`--plan 365`).
- **Launch needs 600** (120 days in the bank).
- **Shooting it ourselves** costs ~$1.5–2k for launch and ~$5–6k DIY for year 1, or ~$15–25k outsourced.
- **Never use brand marketing photos** (`docs/RESEARCH.md` §2).
