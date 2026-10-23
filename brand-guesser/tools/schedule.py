#!/usr/bin/env python3
"""Daily-puzzle scheduler and capacity simulator for CHAINED.

Reads data/catalog.json (brands + categories) and builds daily puzzles
following the rules in docs/GAME.md §3 and docs/DATA.md §6, assuming every
(category, brand) item has N photos. Reports how many days that photo bank
lasts before the rules can't be met, and how much of the bank got used.

    python3 brand-guesser/tools/schedule.py                   # sweep N = 1..8
    python3 brand-guesser/tools/schedule.py --launch          # launch set only
    python3 brand-guesser/tools/schedule.py --launch --photos 4 --show 7

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
ITEM_COOLDOWN = 28              # days before the same (category, brand) can be the answer again
REGIONAL_ANSWER_EVERY = 7       # at most one regional correct answer per this many days
REGIONAL_MIN_ROUND = 3          # regional brands only appear (as answer or option) from this round on
PHOTO_REUSE_DAYS = 365          # a photo can't come back for a year
GIVEAWAY_BONUS = 2              # a giveaway item is this much easier than its category
NEVER = -10**9


def load(path, launch_only=False):
    cat = json.loads(Path(path).read_text())
    brands = cat["brands"]
    cats = [c for c in cat["categories"]
            if len(c["brands"]) >= 4 and (c["launch"] or not launch_only)]
    for c in cats:
        missing = [b for b in c["brands"] if b not in brands]
        if missing:
            raise SystemExit(f"{c['id']}: unknown brands {missing}")
    return brands, cats


def item_difficulty(c, brand):
    d = c["difficulty"] - (GIVEAWAY_BONUS if brand in c.get("giveaways", []) else 0)
    return max(1, min(5, d))


class Scheduler:
    def __init__(self, brands, cats, photos, seed=1):
        self.brands, self.cats, self.photos = brands, cats, photos
        self.rng = random.Random(seed)
        self.last_cat = {}              # category id -> last day used
        self.photo_last = {}            # (cat, brand, k) -> last day used
        self.answers = Counter()        # (cat, brand) -> times it was the answer
        self.last_answer = {}           # (cat, brand) -> last day it was the answer
        self.last_regional = NEVER

    def regional(self, b):
        return self.brands[b].get("scope") == "regional"

    def day(self, day):
        rounds, groups = [], set()
        for slot, target in enumerate(RAMP, start=1):
            best = None
            for c in self.cats:
                if c["group"] in groups or day - self.last_cat.get(c["id"], NEVER) <= CATEGORY_COOLDOWN:
                    continue
                eligible = [b for b in c["brands"]
                            if slot >= REGIONAL_MIN_ROUND or not self.regional(b)]
                if len(eligible) < 4:
                    continue
                for b in eligible:
                    if self.regional(b) and day - self.last_regional < REGIONAL_ANSWER_EVERY:
                        continue
                    if day - self.last_answer.get((c["id"], b), NEVER) <= ITEM_COOLDOWN:
                        continue
                    if b in {r["answer"] for r in rounds}:
                        continue
                    k = self.free_photo(c["id"], b, day)
                    if k is None:
                        continue
                    score = (abs(item_difficulty(c, b) - target),
                             self.answers[(c["id"], b)],
                             self.last_cat.get(c["id"], NEVER),
                             self.rng.random())
                    if best is None or score < best[0]:
                        best = (score, c, b, k, eligible)
            if best is None:
                return None, f"day {day + 1} round {slot}"
            _, c, b, k, eligible = best
            rounds.append(self.commit(day, slot, c, b, k, eligible))
            groups.add(c["group"])
        return rounds, None

    def free_photo(self, cid, b, day):
        for k in range(self.photos):
            if day - self.photo_last.get((cid, b, k), NEVER) >= PHOTO_REUSE_DAYS:
                return k
        return None

    def commit(self, day, slot, c, b, k, eligible):
        self.last_cat[c["id"]] = day
        self.photo_last[(c["id"], b, k)] = day
        self.answers[(c["id"], b)] += 1
        self.last_answer[(c["id"], b)] = day
        if self.regional(b):
            self.last_regional = day
        # distractors: look-alikes first on hard rounds, otherwise random
        others = [x for x in eligible if x != b]
        self.rng.shuffle(others)
        if slot >= 4:
            alike = set().union(*[set(g) for g in c.get("lookalikes", []) if b in g])
            others.sort(key=lambda x: x not in alike)
        options = others[:3] + [b]
        self.rng.shuffle(options)
        return {"category": c["id"], "answer": b, "photo": k, "options": options,
                "difficulty": item_difficulty(c, b)}


def simulate(brands, cats, photos, max_days, seed=1):
    s = Scheduler(brands, cats, photos, seed)
    days = []
    for d in range(max_days):
        rounds, why = s.day(d)
        if rounds is None:
            return days, s, why
        days.append(rounds)
    return days, s, None


def plan(brands, cats, ndays):
    """Shot list: how many distinct photos each item needs for ndays with no repeats."""
    days, s, why = simulate(brands, cats, ndays, ndays)
    if why:
        raise SystemExit(f"rules can't be met even with unlimited photos: {why}")
    need = s.answers
    total = sum(need.values())
    print(f"{ndays} days -> {total} photos across {len(need)} items "
          f"(of {sum(len(c['brands']) for c in cats)} in the catalog)")
    hist = Counter(need.values())
    print("  photos per item: " + ", ".join(f"{k}x{v}" for k, v in sorted(hist.items())))
    by_cat = Counter()
    for (cid, _), n in need.items():
        by_cat[cid] += n
    print("  by category:")
    for c in sorted(cats, key=lambda c: -by_cat[c["id"]]):
        items = sorted(((n, b) for (cid, b), n in need.items() if cid == c["id"]), reverse=True)
        print(f"    {c['id']:<24}{by_cat[c['id']]:4d}  "
              + ", ".join(f"{brands[b]['name']} {n}" for n, b in items))
    unused = [(c["id"], b) for c in cats for b in c["brands"] if (c["id"], b) not in need]
    print(f"  {len(unused)} items are only ever distractors (no photo needed yet)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default=ROOT / "data" / "catalog.json")
    ap.add_argument("--photos", type=int, help="photos per (category, brand) item")
    ap.add_argument("--days", type=int, default=1095)
    ap.add_argument("--launch", action="store_true", help="only launch=true categories")
    ap.add_argument("--plan", type=int, metavar="DAYS",
                    help="unlimited photos: print the shot list needed for DAYS days with no repeats")
    ap.add_argument("--show", type=int, default=0, help="print the first N days")
    args = ap.parse_args()

    brands, cats = load(args.catalog, args.launch)
    items = sum(len(c["brands"]) for c in cats)
    print(f"{len(brands)} brands, {len(cats)} playable categories, {items} items")

    if args.plan:
        return plan(brands, cats, args.plan)

    for n in [args.photos] if args.photos else range(1, 9):
        days, s, why = simulate(brands, cats, n, args.days)
        used = len(s.photo_last)
        print(f"  {n} photo(s)/item = {items * n:5d} photos -> {len(days):4d} days, "
              f"{used / (items * n):4.0%} of photos used"
              + (f"  (stuck at {why})" if why else "  (no limit hit)"))

    if not args.photos:
        return
    days, s, _ = simulate(brands, cats, args.photos, max(args.show, 365))
    name = lambda b: brands[b]["name"]
    for d, rounds in enumerate(days[:args.show], start=1):
        print(f"\nDay {d}")
        for i, r in enumerate(rounds, start=1):
            opts = " | ".join(f"*{name(b)}*" if b == r["answer"] else name(b)
                              for b in r["options"])
            print(f"  {i}. [{r['difficulty']}] {r['category']:<24} {opts}")

    year = days[:365]
    per_cat = Counter(r["category"] for rs in year for r in rs)
    diff = defaultdict(Counter)
    for rs in year:
        for i, r in enumerate(rs):
            diff[i][r["difficulty"]] += 1
    print(f"\nYear 1 ({len(year)} days): rounds per category, most / least used")
    ranked = per_cat.most_common()
    print("  " + ", ".join(f"{c} {n}" for c, n in ranked[:6]))
    print("  " + ", ".join(f"{c} {n}" for c, n in ranked[-6:]))
    print("Year 1: actual difficulty per round slot (target 1..5)")
    for i in range(len(RAMP)):
        avg = sum(k * v for k, v in diff[i].items()) / max(1, sum(diff[i].values()))
        print(f"  round {i + 1}: avg {avg:.2f}  {dict(sorted(diff[i].items()))}")
    regional = sum(brands[r["answer"]].get("scope") == "regional" for rs in year for r in rs)
    print(f"Year 1: regional answers {regional} ({regional / max(1, 5 * len(year)):.0%})")


if __name__ == "__main__":
    main()
