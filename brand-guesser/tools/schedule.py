#!/usr/bin/env python3
"""Daily-puzzle scheduler and capacity simulator for CHAINED.

Reads data/catalog.json (brands + categories) and builds daily puzzles
following the rules in docs/GAME.md §3 and docs/DATA.md §6, assuming every
(category, brand) item has N photos. It reports how many days that photo
bank lasts before the rules can no longer be met, and which categories run
out first.

    python3 brand-guesser/tools/schedule.py                  # sweep N = 1..8
    python3 brand-guesser/tools/schedule.py --photos 4 --show 7
    python3 brand-guesser/tools/schedule.py --photos 6 --days 730

Deterministic: same catalog + args -> same schedule.
"""
import argparse
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAMP = [1, 2, 3, 4, 5]          # target difficulty per round (1 easy .. 5 boss)
CATEGORY_COOLDOWN = 4           # days before a category can appear again
GROUP_PER_DAY = 1               # max rounds per food group per day (pizza, burger, ...)
REGIONAL_ANSWER_EVERY = 7       # at most one regional correct answer per this many days
REGIONAL_MIN_ROUND = 3          # regional brands only appear (as answer or option) from this round on
PHOTO_REUSE_DAYS = 365          # a photo can't come back for a year


def load(path):
    cat = json.loads(Path(path).read_text())
    brands = cat["brands"]
    cats = [c for c in cat["categories"] if len(c["brands"]) >= 4]
    for c in cats:
        missing = [b for b in c["brands"] if b not in brands]
        if missing:
            raise SystemExit(f"{c['id']}: unknown brands {missing}")
    return brands, cats


def is_regional(brands, b):
    return brands[b].get("scope") == "regional"


def simulate(brands, cats, photos, max_days, seed=1):
    rng = random.Random(seed)
    last_cat = {}                               # category id -> last day used
    photo_last = {}                             # (cat, brand, k) -> last day used
    answer_count = Counter()                    # (cat, brand) -> times answer
    last_regional = -10**9
    days = []

    for day in range(max_days):
        used_groups = Counter()
        rounds = []
        for slot, target in enumerate(RAMP, start=1):
            pool = [
                c for c in cats
                if day - last_cat.get(c["id"], -10**9) > CATEGORY_COOLDOWN
                and used_groups[c["group"]] < GROUP_PER_DAY
                and c["id"] not in {r["category"] for r in rounds}
            ]
            # closest difficulty first, then least recently used, then random
            rng.shuffle(pool)
            pool.sort(key=lambda c: (abs(c["difficulty"] - target),
                                     last_cat.get(c["id"], -10**9)))
            picked = None
            for c in pool[:12]:
                picked = pick_round(c, slot, day, brands, photos, photo_last,
                                    answer_count, last_regional, rng)
                if picked:
                    break
            if not picked:
                return days, last_cat, answer_count, f"day {day + 1} round {slot}: no category could be filled"
            c, brand, k, options = picked
            last_cat[c["id"]] = day
            used_groups[c["group"]] += 1
            photo_last[(c["id"], brand, k)] = day
            answer_count[(c["id"], brand)] += 1
            if is_regional(brands, brand):
                last_regional = day
            rounds.append({"category": c["id"], "answer": brand, "photo": k,
                           "options": options, "difficulty": c["difficulty"]})
        days.append(rounds)
    return days, last_cat, answer_count, None


def pick_round(c, slot, day, brands, photos, photo_last, answer_count,
               last_regional, rng):
    eligible = list(c["brands"])
    if slot < REGIONAL_MIN_ROUND:
        eligible = [b for b in eligible if not is_regional(brands, b)]
    if len(eligible) < 4:
        return None
    answers = []
    for b in eligible:
        if is_regional(brands, b) and day - last_regional < REGIONAL_ANSWER_EVERY:
            continue
        free = [k for k in range(photos)
                if day - photo_last.get((c["id"], b, k), -10**9) >= PHOTO_REUSE_DAYS]
        if free:
            answers.append((answer_count[(c["id"], b)], rng.random(), b, free[0]))
    if not answers:
        return None
    answers.sort()
    _, _, brand, k = answers[0]
    # distractors: look-alikes first on hard rounds, otherwise random
    others = [b for b in eligible if b != brand]
    rng.shuffle(others)
    if slot >= 4:
        alike = set()
        for grp in c.get("lookalikes", []):
            if brand in grp:
                alike |= set(grp)
        others.sort(key=lambda b: b not in alike)
    options = others[:3] + [brand]
    rng.shuffle(options)
    return c, brand, k, options


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default=ROOT / "data" / "catalog.json")
    ap.add_argument("--photos", type=int, help="photos per (category, brand) item")
    ap.add_argument("--days", type=int, default=1095)
    ap.add_argument("--show", type=int, default=0, help="print the first N days")
    args = ap.parse_args()

    brands, cats = load(args.catalog)
    items = sum(len(c["brands"]) for c in cats)
    print(f"{len(brands)} brands, {len(cats)} playable categories, {items} items")

    sweep = [args.photos] if args.photos else range(1, 9)
    for n in sweep:
        days, last_cat, answers, why = simulate(brands, cats, n, args.days)
        print(f"  {n} photo(s)/item = {items * n:5d} photos -> {len(days):4d} days"
              + (f"  (stopped: {why})" if why else "  (no limit hit)"))

    if args.show and args.photos:
        days, *_ = simulate(brands, cats, args.photos, args.show)
        name = lambda b: brands[b]["name"]
        for d, rounds in enumerate(days, start=1):
            print(f"\nDay {d}")
            for i, r in enumerate(rounds, start=1):
                opts = " / ".join(("*" + name(b) + "*") if b == r["answer"] else name(b)
                                  for b in r["options"])
                print(f"  {i}. [{r['difficulty']}] {r['category']:<24} {opts}")

    if args.photos:
        _, _, answers, _ = simulate(brands, cats, args.photos, 365)
        per_cat = defaultdict(int)
        for (cid, _), n in answers.items():
            per_cat[cid] += n
        print("\nYear-1 rounds per category (top 10 / bottom 5):")
        ranked = sorted(per_cat.items(), key=lambda kv: -kv[1])
        for cid, n in ranked[:10]:
            print(f"  {cid:<28}{n}")
        print("  ...")
        for cid, n in ranked[-5:]:
            print(f"  {cid:<28}{n}")


if __name__ == "__main__":
    main()
