"""Builds each day's 5 rounds from the photo bank (rules: docs/DATA.md §6).

Puzzles are generated lazily, in date order, the first time a date is
requested, then frozen in the `puzzle` table. Rule state (cooldowns, photo
reuse, regional quota) is rebuilt from earlier puzzles, so generation is
deterministic for a given photo bank.

When the bank is too thin to satisfy the full rules (early days, demo mode)
the scheduler loosens them one level at a time instead of failing, and marks
the puzzle `relaxed`.
"""
import datetime as dt
import hashlib
import json
import random
from collections import Counter

from . import db

RAMP = [1, 2, 3, 4, 5]
GIVEAWAY_BONUS = 2
NEVER = -10**9

# level: (category cooldown, item cooldown, photo reuse days, purchase gap,
#         regional rules on, food groups unique, answer brands unique)
LEVELS = [
    (4, 28, 365, 60, True, True, True),
    (1, 7, 60, 14, True, True, True),
    (0, 0, 0, 0, False, True, True),
    (0, 0, 0, 0, False, False, False),
]
REGIONAL_ANSWER_EVERY = 7
REGIONAL_MIN_ROUND = 3
MEASURED_MIN_PLAYS = 30


def measured_difficulty(pct):
    for d, floor in ((1, .85), (2, .70), (3, .50), (4, .30)):
        if pct >= floor:
            return d
    return 5


class Bank:
    """Everything the scheduler needs, loaded once per generation run."""

    def __init__(self, con):
        st = db.settings(con)
        self.demo = st["demo_photos"] == "1"
        self.brands = {k: b for k, b in db.brands(con).items() if b["active"]}
        self.items = {k: it for k, it in db.items(con).items()
                      if it["status"] == "current" and k[1] in self.brands}
        self.cats = []
        for c in db.categories(con, enabled_only=True):
            c["brands"] = [b for (cid, b) in self.items if cid == c["id"]]
            if len(c["brands"]) >= 4:
                self.cats.append(c)
        self.cat_by_id = {c["id"]: c for c in self.cats}
        stats = {r["photo_id"]: (r["plays"], r["n_right"]) for r in con.execute(
            "SELECT photo_id, COUNT(*) plays, SUM(correct) n_right FROM answer WHERE live = 1 GROUP BY photo_id")}
        self.photos = {}                       # (cat, brand) -> [photo dict]
        real = set()
        for p in con.execute("SELECT * FROM photo WHERE status = 'approved' ORDER BY created_at, id"):
            p = dict(p)
            key = (p["category_id"], p["brand_id"])
            it = self.items.get(key)
            if not it:
                continue
            if p["source"] != "demo":
                if it["recipe_changed_at"] and p["taken_at"] and p["taken_at"] < it["recipe_changed_at"]:
                    continue
                real.add(key)
            p["difficulty"] = self.photo_difficulty(p, it, stats.get(p["id"]))
            self.photos.setdefault(key, []).append(p)
        for key in list(self.photos):
            if key in real:
                self.photos[key] = [p for p in self.photos[key] if p["source"] != "demo"]
            elif not self.demo:
                del self.photos[key]

    def photo_difficulty(self, p, it, stat):
        if stat and stat[0] >= MEASURED_MIN_PLAYS:
            return measured_difficulty(stat[1] / stat[0])
        if p["est_difficulty"]:
            return p["est_difficulty"]
        cat = self.cat_by_id.get(p["category_id"])
        base = cat["difficulty"] if cat else 3
        return max(1, min(5, base - (GIVEAWAY_BONUS if it["giveaway"] else 0)))

    def regional(self, b):
        return self.brands[b]["scope"] == "regional"


class State:
    def __init__(self):
        self.last_cat, self.photo_last, self.purchase_last = {}, {}, {}
        self.last_answer, self.answers = {}, Counter()
        self.last_regional = NEVER

    def replay(self, day, rounds, bank):
        for r in rounds:
            self.mark(day, r["category"], r["answer"], r["photo"], r.get("purchase", ""), bank)

    def mark(self, day, cid, b, photo_id, purchase, bank):
        self.last_cat[cid] = day
        self.photo_last[photo_id] = day
        if purchase:
            self.purchase_last[purchase] = day
        self.last_answer[(cid, b)] = day
        self.answers[(cid, b)] += 1
        if b in bank.brands and bank.regional(b):
            self.last_regional = day


def build_day(bank, state, day, seed):
    rng = random.Random(seed)
    rounds, worst = [], 0
    for slot, target in enumerate(RAMP, start=1):
        for level, rules in enumerate(LEVELS):
            pick = best_round(bank, state, day, slot, target, rounds, rules, rng)
            if pick:
                worst = max(worst, level)
                break
        else:
            break                               # nothing at all fits: shorter day
        c, b, photo, eligible = pick
        options = choose_options(c, b, eligible, slot, rng)
        state.mark(day, c["id"], b, photo["id"], photo["purchase_id"], bank)
        rounds.append({"category": c["id"], "answer": b, "photo": photo["id"],
                       "purchase": photo["purchase_id"], "options": options,
                       "difficulty": photo["difficulty"]})
    return rounds, worst


def best_round(bank, state, day, slot, target, rounds, rules, rng):
    cat_cd, item_cd, reuse, purchase_gap, regional_on, groups_unique, brands_unique = rules
    used_cats = {r["category"] for r in rounds}
    used_groups = {c["grp"] for c in bank.cats if c["id"] in used_cats}
    used_brands = {r["answer"] for r in rounds}
    best = None
    for c in bank.cats:
        if c["id"] in used_cats or (groups_unique and c["grp"] in used_groups):
            continue
        if day - state.last_cat.get(c["id"], NEVER) <= cat_cd:
            continue
        eligible = [b for b in c["brands"]
                    if not regional_on or slot >= REGIONAL_MIN_ROUND or not bank.regional(b)]
        if len(eligible) < 4:
            continue
        for b in eligible:
            if brands_unique and b in used_brands:
                continue
            if regional_on and bank.regional(b) and day - state.last_regional < REGIONAL_ANSWER_EVERY:
                continue
            if day - state.last_answer.get((c["id"], b), NEVER) <= item_cd:
                continue
            for p in bank.photos.get((c["id"], b), []):
                last = state.photo_last.get(p["id"], NEVER)
                if reuse and day - last < reuse:
                    continue
                if purchase_gap and p["purchase_id"] and \
                        day - state.purchase_last.get(p["purchase_id"], NEVER) < purchase_gap:
                    continue
                score = (abs(p["difficulty"] - target), p["source"] == "demo",
                         state.answers[(c["id"], b)], last,
                         state.last_cat.get(c["id"], NEVER), rng.random())
                if best is None or score < best[0]:
                    best = (score, c, b, p, eligible)
    return best[1:] if best else None


def choose_options(c, b, eligible, slot, rng):
    others = [x for x in eligible if x != b]
    rng.shuffle(others)
    if slot >= 4:
        alike = set().union(*[set(g) for g in c["lookalikes"] if b in g])
        others.sort(key=lambda x: x not in alike)
    options = others[:3] + [b]
    rng.shuffle(options)
    return options


def ensure_puzzle(con, date):
    """Return the puzzle row for `date` (a datetime.date), generating it and
    any missing earlier days first. None if before launch or no photos at all."""
    launch = dt.date.fromisoformat(db.settings(con)["launch_date"])
    if date < launch:
        return None
    iso = date.isoformat()
    row = con.execute("SELECT * FROM puzzle WHERE date = ?", (iso,)).fetchone()
    if row:
        return row
    with db.WRITE_LOCK:
        row = con.execute("SELECT * FROM puzzle WHERE date = ?", (iso,)).fetchone()
        if row:
            return row
        bank = Bank(con)
        state = State()
        history = con.execute("SELECT date, rounds FROM puzzle WHERE date < ? ORDER BY date", (iso,)).fetchall()
        for h in history:
            state.replay(dt.date.fromisoformat(h["date"]).toordinal(), json.loads(h["rounds"]), bank)
        start = dt.date.fromisoformat(history[-1]["date"]) + dt.timedelta(days=1) if history else launch
        salt = secret(con)
        d = start
        while d <= date:
            seed = hashlib.sha256(f"{salt}:{d.isoformat()}".encode()).hexdigest()
            rounds, relaxed = build_day(bank, state, d.toordinal(), seed)
            if rounds:
                con.execute("INSERT OR IGNORE INTO puzzle VALUES (?,?,?,?,?)",
                            (d.isoformat(), (d - launch).days + 1, json.dumps(rounds), relaxed, db.now()))
            d += dt.timedelta(days=1)
        con.commit()
    return con.execute("SELECT * FROM puzzle WHERE date = ?", (iso,)).fetchone()


def regenerate_unplayed(con):
    """Drop future puzzles nobody has answered, so catalog/photo changes take effect.
    Days that are already live somewhere (UTC today) or played are kept."""
    with db.WRITE_LOCK:
        cutoff = db.utc_today().isoformat()
        # only the unplayed tail goes, so the kept history stays contiguous
        played = con.execute("SELECT MAX(date) d FROM answer WHERE date > ?", (cutoff,)).fetchone()["d"]
        keep_through = max(cutoff, played or cutoff)
        n = con.execute("DELETE FROM puzzle WHERE date > ?", (keep_through,)).rowcount
        con.commit()
        return n


def secret(con):
    s = db.get_setting(con, "secret")
    if not s:
        import secrets
        s = secrets.token_hex(16)
        db.set_setting(con, "secret", s)
    return s


def ensure_demo_photos(con):
    """One labelled placeholder per item so the game is playable before real photos exist.
    Ids are salted hashes, so they can't be mapped back to a brand."""
    salt = secret(con)
    with db.WRITE_LOCK:
        for (cid, b) in db.items(con):
            pid = hashlib.sha256(f"{salt}:demo:{cid}:{b}".encode()).hexdigest()[:32]
            con.execute("""INSERT OR IGNORE INTO photo (id, ext, category_id, brand_id, source, status, created_at)
                           VALUES (?, 'svg', ?, ?, 'demo', 'approved', ?)""", (pid, cid, b, db.now()))
        con.commit()
