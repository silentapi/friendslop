"""CHAINED web server: the daily game, its API, and the admin/QA tool.

Standard library only (Python 3.10+). Run from brand-guesser/:

    python3 -m app.server --port 7090

or just ./start.sh, which runs this inside a `screen` session.
"""
import argparse
import base64
import datetime as dt
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import struct
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from . import db, scheduler

STATIC = Path(__file__).resolve().parent / "static"
MAX_UPLOAD = 20 * 1024 * 1024
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_RE = re.compile(r"^[0-9a-f]{32}$")
DEVICE_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
ADMIN_PASSWORD = ""
TRUST_PROXY = False


class HTTPError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


# --------------------------------------------------------------------------- helpers

def parse_date(s):
    if not s or not DATE_RE.match(s):
        raise HTTPError(400, "date must be YYYY-MM-DD")
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        raise HTTPError(400, "bad date")


def playable(date):
    """A date can be played if it's already 'today' somewhere on Earth (<= UTC+1 day)."""
    return date <= db.utc_today() + dt.timedelta(days=1)


def is_live(date):
    """Live = it's currently that date somewhere, so answers count toward the day's stats."""
    t = db.utc_today()
    return t - dt.timedelta(days=1) <= date <= t + dt.timedelta(days=1)


def photo_url(pid, ext):
    return f"/i/{pid}.{ext}"


class RateLimit:
    def __init__(self, per_minute):
        self.per_minute, self.hits, self.lock = per_minute, {}, threading.Lock()

    def ok(self, key):
        now = time.monotonic()
        with self.lock:
            stamps = [t for t in self.hits.get(key, []) if now - t < 60]
            if len(stamps) >= self.per_minute:
                self.hits[key] = stamps
                return False
            stamps.append(now)
            self.hits[key] = stamps
            if len(self.hits) > 50000:
                self.hits.clear()
            return True


ANSWER_LIMIT = RateLimit(120)


# --------------------------------------------------------------------------- image hygiene

def strip_metadata(data):
    """Return (clean bytes, ext). Drops EXIF/XMP/comments (GPS would say 'taken at a Domino's')."""
    if data[:3] == b"\xff\xd8\xff":
        return strip_jpeg(data), "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return strip_png(data), "png"
    raise HTTPError(415, "only JPEG or PNG (the uploader converts other formats for you)")


def strip_jpeg(data):
    out, i = bytearray(b"\xff\xd8"), 2
    while i < len(data):
        if data[i] != 0xFF:
            raise HTTPError(400, "corrupt JPEG")
        marker = data[i + 1]
        if marker == 0xD9:                                  # EOI
            out += data[i:i + 2]
            break
        if marker == 0xDA:                                  # SOS: rest is image data
            out += data[i:]
            break
        if 0xD0 <= marker <= 0xD7 or marker == 0x01:
            out += data[i:i + 2]
            i += 2
            continue
        (length,) = struct.unpack(">H", data[i + 2:i + 4])
        seg = data[i:i + 2 + length]
        keep = not (0xE1 <= marker <= 0xEF and marker != 0xE2) and marker != 0xFE  # keep APP0 + ICC (APP2)
        if keep:
            out += seg
        i += 2 + length
    return bytes(out)


def strip_png(data):
    out, i = bytearray(data[:8]), 8
    while i < len(data):
        (length,) = struct.unpack(">I", data[i:i + 4])
        ctype = data[i + 4:i + 8]
        chunk = data[i:i + 12 + length]
        if ctype not in (b"eXIf", b"tEXt", b"iTXt", b"zTXt", b"tIME"):
            out += chunk
        i += 12 + length
        if ctype == b"IEND":
            break
    return bytes(out)


def demo_svg(con, pid):
    row = con.execute("""SELECT c.emoji FROM photo p JOIN category c ON c.id = p.category_id
                         WHERE p.id = ? AND p.source = 'demo'""", (pid,)).fetchone()
    if not row:
        return None
    emoji = row["emoji"]
    # vary the plate a little per photo so demo rounds don't all look identical
    h = int(pid[:6], 16)
    rot, dx = h % 360, (h >> 9) % 40 - 20
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
<defs><radialGradient id="pl" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fbfaf6"/>
<stop offset=".78" stop-color="#ece8df"/><stop offset=".8" stop-color="#ddd8cc"/><stop offset="1" stop-color="#f4f1ea"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="-18" dy="22" stdDeviation="22" flood-color="#000" flood-opacity=".28"/></filter></defs>
<rect width="1080" height="1080" fill="#7d7f80"/>
<circle cx="{540 + dx}" cy="560" r="430" fill="url(#pl)" filter="url(#sh)"/>
<text x="{540 + dx}" y="640" font-size="330" text-anchor="middle" transform="rotate({rot % 30 - 15} {540 + dx} 560)">{emoji}</text>
<g transform="rotate(-8 300 150)"><rect x="110" y="96" width="390" height="104" rx="10" fill="none" stroke="#d2372b" stroke-width="8"/>
<text x="305" y="168" font-family="monospace" font-weight="700" font-size="54" fill="#d2372b" text-anchor="middle">DEMO PHOTO</text></g>
</svg>"""


# --------------------------------------------------------------------------- public API

def api_puzzle(con, q, _body, _h):
    date = parse_date(q.get("date"))
    if not playable(date):
        raise HTTPError(403, "no peeking at future puzzles")
    row = scheduler.ensure_puzzle(con, date)
    if not row:
        raise HTTPError(404, "no puzzle for that date")
    st = db.settings(con)
    brands, cats = db.brands(con), {c["id"]: c for c in db.categories(con)}
    exts = {}
    rounds = json.loads(row["rounds"])
    for r in rounds:
        p = con.execute("SELECT ext, source FROM photo WHERE id = ?", (r["photo"],)).fetchone()
        exts[r["photo"]] = (p["ext"], p["source"]) if p else ("jpg", "own")
    return {
        "date": row["date"], "n": row["n"], "site": st["site_name"],
        "demo": any(exts[r["photo"]][1] == "demo" for r in rounds),
        "live": is_live(date),
        "rounds": [{
            "category": cats[r["category"]]["name"], "emoji": cats[r["category"]]["emoji"],
            "img": photo_url(r["photo"], exts[r["photo"]][0]),
            "alt": f"{cats[r['category']]['name']}, photographed on a plain plate",
            "options": [{"id": b, "name": brands[b]["name"]} for b in r["options"]],
        } for r in rounds],
    }


def reveal(con, date, rnd, r, choice):
    brands, items = db.brands(con), db.items(con)
    cat = next(c for c in db.categories(con) if c["id"] == r["category"])
    it = items.get((r["category"], r["answer"]), {})
    counts = {b: 0 for b in r["options"]}
    for row in con.execute("SELECT choice, COUNT(*) n FROM answer WHERE date = ? AND round = ? AND live = 1 GROUP BY choice",
                           (date.isoformat(), rnd)):
        if row["choice"] in counts:
            counts[row["choice"]] = row["n"]
    total = sum(counts.values())
    return {
        "round": rnd, "choice": choice, "correct": r["answer"], "right": choice == r["answer"],
        "brand": brands[r["answer"]]["name"],
        "item": db.item_label(cat, brands[r["answer"]], it),
        "tell": it.get("tell") or "",
        "category_tells": cat["tells"],
        "total": total,
        "pct": {b: (n / total if total else 0) for b, n in counts.items()},
    }


def api_answer(con, _q, body, handler):
    if not ANSWER_LIMIT.ok(handler.client_ip()):
        raise HTTPError(429, "slow down")
    date = parse_date(body.get("date"))
    device, choice = str(body.get("device", "")), str(body.get("choice", ""))
    try:
        rnd = int(body.get("round"))
    except (TypeError, ValueError):
        raise HTTPError(400, "round must be a number")
    if not DEVICE_RE.match(device):
        raise HTTPError(400, "bad device id")
    if not playable(date):
        raise HTTPError(403, "no peeking at future puzzles")
    row = con.execute("SELECT rounds FROM puzzle WHERE date = ?", (date.isoformat(),)).fetchone()
    if not row:
        raise HTTPError(404, "no puzzle for that date")
    rounds = json.loads(row["rounds"])
    if not 0 <= rnd < len(rounds):
        raise HTTPError(400, "no such round")
    r = rounds[rnd]
    if choice not in r["options"]:
        raise HTTPError(400, "choice isn't one of the options")
    live = int(is_live(date))
    with db.WRITE_LOCK:
        prev = con.execute("SELECT choice FROM answer WHERE date = ? AND round = ? AND device = ? AND live = ?",
                           (date.isoformat(), rnd, device, live)).fetchone()
        if prev:
            choice = prev["choice"]               # one tap per round, no take-backs
        else:
            con.execute("INSERT INTO answer VALUES (?,?,?,?,?,?,?,?)",
                        (date.isoformat(), rnd, device, r["photo"], choice, int(choice == r["answer"]), live, db.now()))
            con.commit()
    return reveal(con, date, rnd, r, choice)


def api_daystats(con, q, _body, _h):
    date = parse_date(q.get("date"))
    device = q.get("device", "")
    row = con.execute("SELECT rounds FROM puzzle WHERE date = ?", (date.isoformat(),)).fetchone()
    if not row or not playable(date):
        raise HTTPError(404, "no puzzle for that date")
    nrounds = len(json.loads(row["rounds"]))
    scores = {r["device"]: r["s"] for r in con.execute(
        """SELECT device, SUM(correct) s, COUNT(*) n FROM answer WHERE date = ? AND live = 1
           GROUP BY device HAVING n = ?""", (date.isoformat(), nrounds))}
    dist = [0] * (nrounds + 1)
    for s in scores.values():
        dist[s] += 1
    players = len(scores)
    out = {"players": players, "rounds": nrounds, "dist": dist,
           "avg": (sum(scores.values()) / players) if players else None}
    if device in scores and players > 1:
        mine = scores[device]
        others = [s for d, s in scores.items() if d != device]
        out["beat"] = (sum(s < mine for s in others) + 0.5 * sum(s == mine for s in others)) / len(others)
    return out


def api_archive(con, q, _body, _h):
    before = parse_date(q.get("before"))
    last = min(before, db.utc_today() + dt.timedelta(days=2)) - dt.timedelta(days=1)
    scheduler.ensure_puzzle(con, last)
    rows = con.execute("SELECT date, n FROM puzzle WHERE date <= ? ORDER BY date DESC LIMIT 400",
                       (last.isoformat(),)).fetchall()
    return {"days": [dict(r) for r in rows]}


def api_credits(con, _q, _body, _h):
    rows = con.execute("""SELECT DISTINCT credit, license, source_url FROM photo
                          WHERE status = 'approved' AND source IN ('cc', 'player', 'contributor') AND credit != ''
                          ORDER BY credit""").fetchall()
    return {"credits": [dict(r) for r in rows]}


# --------------------------------------------------------------------------- admin API

def regen(con):
    return {"regenerated": scheduler.regenerate_unplayed(con)}


def admin_overview(con, _q, _body, _h):
    st = db.settings(con)
    st.pop("secret", None)
    photos = {f"{r['source']}:{r['status']}": r["n"] for r in con.execute(
        "SELECT source, status, COUNT(*) n FROM photo GROUP BY source, status")}
    bank = scheduler.Bank(con)
    real_items = sum(1 for ps in bank.photos.values() if any(p["source"] != "demo" for p in ps))
    today = db.utc_today()
    week = con.execute("""SELECT date, COUNT(DISTINCT device) players FROM answer WHERE live = 1 AND date >= ?
                          GROUP BY date ORDER BY date""", ((today - dt.timedelta(days=13)).isoformat(),)).fetchall()
    return {"settings": st, "photos": photos, "categories_playable": len(bank.cats),
            "items_playable": sum(len(c["brands"]) for c in bank.cats), "items_with_real_photos": real_items,
            "players": [dict(r) for r in week], "utc_today": today.isoformat()}


def admin_catalog(con, _q, _body, _h):
    counts = {}
    for r in con.execute("""SELECT category_id, brand_id, status, COUNT(*) n FROM photo
                            WHERE source != 'demo' GROUP BY category_id, brand_id, status"""):
        counts.setdefault((r["category_id"], r["brand_id"]), {})[r["status"]] = r["n"]
    brands, items = db.brands(con), db.items(con)
    cats = []
    for c in db.categories(con):
        c["items"] = [{**it, "brand": brands[b]["name"], "scope": brands[b]["scope"],
                       "photos": counts.get((cid, b), {})}
                      for (cid, b), it in items.items() if cid == c["id"]]
        cats.append(c)
    return {"categories": cats, "brands": list(brands.values())}


def admin_item(con, _q, body, _h):
    key = (body.get("category_id"), body.get("brand_id"))
    if key not in db.items(con):
        raise HTTPError(404, "no such item")
    fields = {k: body[k] for k in ("menu_name", "tell", "status", "recipe_changed_at", "giveaway") if k in body}
    if "status" in fields and fields["status"] not in ("current", "retired"):
        raise HTTPError(400, "status is current or retired")
    if fields.get("recipe_changed_at"):
        parse_date(fields["recipe_changed_at"])
    if "recipe_changed_at" in fields and not fields["recipe_changed_at"]:
        fields["recipe_changed_at"] = None
    if "giveaway" in fields:
        fields["giveaway"] = int(bool(fields["giveaway"]))
    with db.WRITE_LOCK:
        for k, v in fields.items():
            con.execute(f"UPDATE item SET {k} = ? WHERE category_id = ? AND brand_id = ?", (v, *key))
        con.commit()
    return {"ok": True, **(regen(con) if set(fields) & {"status", "recipe_changed_at", "giveaway"} else {})}


def admin_add_item(con, _q, body, _h):
    cid, b = body.get("category_id"), body.get("brand_id")
    if not con.execute("SELECT 1 FROM category WHERE id = ?", (cid,)).fetchone():
        raise HTTPError(404, "no such category")
    if not con.execute("SELECT 1 FROM brand WHERE id = ?", (b,)).fetchone():
        raise HTTPError(404, "no such brand")
    with db.WRITE_LOCK:
        con.execute("INSERT OR IGNORE INTO item (category_id, brand_id) VALUES (?, ?)", (cid, b))
        con.commit()
    scheduler.ensure_demo_photos(con)
    return {"ok": True, **regen(con)}


def admin_category(con, _q, body, _h):
    cid = body.get("id")
    if not con.execute("SELECT 1 FROM category WHERE id = ?", (cid,)).fetchone():
        raise HTTPError(404, "no such category")
    with db.WRITE_LOCK:
        if "enabled" in body:
            con.execute("UPDATE category SET enabled = ? WHERE id = ?", (int(bool(body["enabled"])), cid))
        if "difficulty" in body:
            d = int(body["difficulty"])
            if not 1 <= d <= 5:
                raise HTTPError(400, "difficulty is 1-5")
            con.execute("UPDATE category SET difficulty = ? WHERE id = ?", (d, cid))
        if "tells" in body:
            con.execute("UPDATE category SET tells = ? WHERE id = ?", (str(body["tells"]), cid))
        con.commit()
    return {"ok": True, **regen(con)}


def admin_brand(con, _q, body, _h):
    bid = body.get("id")
    with db.WRITE_LOCK:
        if body.get("create"):
            if not re.match(r"^[a-z0-9-]{2,32}$", bid or ""):
                raise HTTPError(400, "brand id: 2-32 chars of a-z 0-9 -")
            con.execute("INSERT INTO brand (id, name, scope, region) VALUES (?,?,?,?)",
                        (bid, body.get("name") or bid, body.get("scope", "national"), body.get("region")))
        elif not con.execute("SELECT 1 FROM brand WHERE id = ?", (bid,)).fetchone():
            raise HTTPError(404, "no such brand")
        for k in ("name", "region"):
            if k in body:
                con.execute(f"UPDATE brand SET {k} = ? WHERE id = ?", (body[k], bid))
        if "scope" in body:
            if body["scope"] not in ("national", "regional"):
                raise HTTPError(400, "scope is national or regional")
            con.execute("UPDATE brand SET scope = ? WHERE id = ?", (body["scope"], bid))
        if "active" in body:
            con.execute("UPDATE brand SET active = ? WHERE id = ?", (int(bool(body["active"])), bid))
        con.commit()
    return {"ok": True, **regen(con)}


def admin_settings(con, _q, body, _h):
    changed = False
    with db.WRITE_LOCK:
        if "site_name" in body:
            db.set_setting(con, "site_name", str(body["site_name"])[:40] or "CHAINED")
        if "demo_photos" in body:
            db.set_setting(con, "demo_photos", "1" if body["demo_photos"] else "0")
            changed = True
        if "launch_date" in body:
            new = parse_date(body["launch_date"])
            if con.execute("SELECT 1 FROM answer LIMIT 1").fetchone():
                raise HTTPError(409, "launch date can't change once people have played (puzzle numbers would shift)")
            db.set_setting(con, "launch_date", new.isoformat())
            con.execute("DELETE FROM puzzle")
        con.commit()
    return {"ok": True, **(regen(con) if changed else {})}


def admin_upload(con, q, body_bytes, _h):
    cid, b = q.get("category"), q.get("brand")
    if (cid, b) not in db.items(con):
        raise HTTPError(400, "pick a category and a brand that sells it")
    clean, ext = strip_metadata(body_bytes)
    pid = hashlib.sha256(clean).hexdigest()[:32]
    if con.execute("SELECT 1 FROM photo WHERE id = ?", (pid,)).fetchone():
        return {"id": pid, "duplicate": True}
    source = q.get("source", "own")
    if source not in ("own", "contributor", "player", "cc"):
        raise HTTPError(400, "bad source")
    if source == "cc" and not (q.get("credit") and q.get("license")):
        raise HTTPError(400, "CC photos need a credit and a license")
    taken = q.get("taken") or None
    if taken:
        parse_date(taken)
    angle = q.get("angle", "hero")
    if angle not in ("hero", "top", "detail"):
        raise HTTPError(400, "angle is hero, top or detail")
    (db.PHOTOS / f"{pid}.{ext}").write_bytes(clean)
    with db.WRITE_LOCK:
        con.execute("""INSERT INTO photo (id, ext, category_id, brand_id, source, credit, license, source_url,
                       purchase_id, angle, taken_at, city, state, notes, status, bytes, created_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending', ?, ?)""",
                    (pid, ext, cid, b, source, q.get("credit", ""), q.get("license", ""), q.get("url", ""),
                     q.get("purchase", ""), angle, taken, q.get("city", ""), q.get("state", ""),
                     q.get("notes", ""), len(clean), db.now()))
        con.commit()
    return {"id": pid, "duplicate": False, "url": photo_url(pid, ext)}


def admin_photos(con, q, _body, _h):
    where, args = ["source != 'demo'"], []
    for k, col in (("status", "status"), ("category", "category_id"), ("brand", "brand_id")):
        if q.get(k):
            where.append(f"{col} = ?")
            args.append(q[k])
    limit = min(int(q.get("limit", 200)), 1000)
    stats = {r["photo_id"]: dict(r) for r in con.execute(
        "SELECT photo_id, COUNT(*) plays, AVG(correct) pct FROM answer WHERE live = 1 GROUP BY photo_id")}
    used = {}
    for r in con.execute("SELECT date, rounds FROM puzzle"):
        for x in json.loads(r["rounds"]):
            used.setdefault(x["photo"], []).append(r["date"])
    brands, cats = db.brands(con), {c["id"]: c for c in db.categories(con)}
    rows = con.execute(f"SELECT * FROM photo WHERE {' AND '.join(where)} ORDER BY created_at DESC LIMIT ?",
                       (*args, limit)).fetchall()
    out = []
    for p in rows:
        p = dict(p)
        p.update(url=photo_url(p["id"], p["ext"]), brand=brands[p["brand_id"]]["name"],
                 category=cats[p["category_id"]]["name"], emoji=cats[p["category_id"]]["emoji"],
                 plays=stats.get(p["id"], {}).get("plays", 0), pct=stats.get(p["id"], {}).get("pct"),
                 used=sorted(used.get(p["id"], [])))
        out.append(p)
    return {"photos": out}


def admin_photo(con, _q, body, _h):
    pid = body.get("id", "")
    p = con.execute("SELECT * FROM photo WHERE id = ? AND source != 'demo'", (pid,)).fetchone()
    if not p:
        raise HTTPError(404, "no such photo")
    if body.get("delete"):
        used = any(pid in r["rounds"] for r in con.execute("SELECT rounds FROM puzzle"))
        if used:
            raise HTTPError(409, "this photo has already been in a puzzle; reject it instead")
        with db.WRITE_LOCK:
            con.execute("DELETE FROM photo WHERE id = ?", (pid,))
            con.commit()
        (db.PHOTOS / f"{pid}.{p['ext']}").unlink(missing_ok=True)
        return {"ok": True, **regen(con)}
    fields = {}
    if "status" in body:
        if body["status"] not in ("pending", "approved", "rejected"):
            raise HTTPError(400, "bad status")
        fields["status"] = body["status"]
    if "est_difficulty" in body:
        d = body["est_difficulty"]
        fields["est_difficulty"] = int(d) if d not in (None, "", 0) else None
        if fields["est_difficulty"] is not None and not 1 <= fields["est_difficulty"] <= 5:
            raise HTTPError(400, "difficulty is 1-5")
    for k in ("notes", "credit", "license", "source_url", "purchase_id", "city", "state"):
        if k in body:
            fields[k] = str(body[k])
    if "angle" in body:
        if body["angle"] not in ("hero", "top", "detail"):
            raise HTTPError(400, "bad angle")
        fields["angle"] = body["angle"]
    if "taken_at" in body:
        fields["taken_at"] = parse_date(body["taken_at"]).isoformat() if body["taken_at"] else None
    if "category_id" in body or "brand_id" in body:
        key = (body.get("category_id", p["category_id"]), body.get("brand_id", p["brand_id"]))
        if key not in db.items(con):
            raise HTTPError(400, "that brand doesn't sell that category")
        fields["category_id"], fields["brand_id"] = key
    with db.WRITE_LOCK:
        for k, v in fields.items():
            con.execute(f"UPDATE photo SET {k} = ? WHERE id = ?", (v, pid))
        con.commit()
    return {"ok": True, **regen(con)}


def admin_schedule(con, q, _body, _h):
    days = max(1, min(int(q.get("days", 14)), 60))
    today = db.utc_today()
    scheduler.ensure_puzzle(con, today + dt.timedelta(days=days))
    brands, cats, items = db.brands(con), {c["id"]: c for c in db.categories(con)}, db.items(con)
    photos = {r["id"]: dict(r) for r in con.execute("SELECT id, ext, source FROM photo")}
    out = []
    for row in con.execute("SELECT * FROM puzzle WHERE date >= ? ORDER BY date LIMIT ?",
                           ((today - dt.timedelta(days=3)).isoformat(), days + 4)):
        rounds = []
        for i, r in enumerate(json.loads(row["rounds"])):
            stat = con.execute("SELECT COUNT(*) n, AVG(correct) pct FROM answer WHERE date = ? AND round = ? AND live = 1",
                               (row["date"], i)).fetchone()
            ph = photos.get(r["photo"], {"ext": "jpg", "source": "?"})
            cat = cats[r["category"]]
            rounds.append({"category": cat["name"], "emoji": cat["emoji"], "difficulty": r["difficulty"],
                           "answer": brands[r["answer"]]["name"],
                           "item": db.item_label(cat, brands[r["answer"]], items.get((r["category"], r["answer"]), {})),
                           "options": [brands[b]["name"] for b in r["options"]],
                           "img": photo_url(r["photo"], ph["ext"]), "demo": ph["source"] == "demo",
                           "plays": stat["n"], "pct": stat["pct"]})
        out.append({"date": row["date"], "n": row["n"], "relaxed": row["relaxed"], "rounds": rounds})
    return {"days": out, "utc_today": today.isoformat()}


def admin_regenerate(con, _q, _body, _h):
    return regen(con)


def admin_shotlist(con, q, _body, _h):
    ndays = max(7, min(int(q.get("days", 365)), 730))
    sys.path.insert(0, str(db.ROOT / "tools"))
    import schedule as sim                           # tools/schedule.py, the capacity simulator
    bank = scheduler.Bank(con)
    sim_brands = {k: {"name": b["name"], "scope": b["scope"]} for k, b in bank.brands.items()}
    sim_cats = [{"id": c["id"], "group": c["grp"], "difficulty": c["difficulty"], "brands": c["brands"],
                 "lookalikes": c["lookalikes"],
                 "giveaways": [b for b in c["brands"] if bank.items[(c["id"], b)]["giveaway"]]}
                for c in bank.cats]
    try:
        need = sim.shot_list(sim_brands, sim_cats, ndays)
    except ValueError as e:
        raise HTTPError(409, str(e))
    have = {}
    for r in con.execute("""SELECT category_id, brand_id, status, COUNT(*) n FROM photo
                            WHERE source != 'demo' AND status IN ('approved', 'pending')
                            GROUP BY category_id, brand_id, status"""):
        have.setdefault((r["category_id"], r["brand_id"]), {})[r["status"]] = r["n"]
    rows = []
    for c in bank.cats:
        for b in c["brands"]:
            n = need.get((c["id"], b), 0)
            h = have.get((c["id"], b), {})
            rows.append({"category": c["name"], "emoji": c["emoji"], "category_id": c["id"], "brand_id": b,
                         "brand": bank.brands[b]["name"], "scope": bank.brands[b]["scope"],
                         "need": n, "approved": h.get("approved", 0), "pending": h.get("pending", 0),
                         "gap": max(0, n - h.get("approved", 0) - h.get("pending", 0))})
    rows.sort(key=lambda r: (-r["gap"], r["category"], r["brand"]))
    return {"days": ndays, "need": sum(need.values()),
            "have": sum(min(r["need"], r["approved"]) for r in rows),
            "gap": sum(r["gap"] for r in rows), "items": rows}


ROUTES = {
    ("GET", "/api/puzzle"): (api_puzzle, False),
    ("POST", "/api/answer"): (api_answer, False),
    ("GET", "/api/daystats"): (api_daystats, False),
    ("GET", "/api/archive"): (api_archive, False),
    ("GET", "/api/credits"): (api_credits, False),
    ("GET", "/api/admin/overview"): (admin_overview, True),
    ("GET", "/api/admin/catalog"): (admin_catalog, True),
    ("POST", "/api/admin/item"): (admin_item, True),
    ("POST", "/api/admin/item/add"): (admin_add_item, True),
    ("POST", "/api/admin/category"): (admin_category, True),
    ("POST", "/api/admin/brand"): (admin_brand, True),
    ("POST", "/api/admin/settings"): (admin_settings, True),
    ("POST", "/api/admin/upload"): (admin_upload, True),
    ("GET", "/api/admin/photos"): (admin_photos, True),
    ("POST", "/api/admin/photo"): (admin_photo, True),
    ("GET", "/api/admin/schedule"): (admin_schedule, True),
    ("POST", "/api/admin/regenerate"): (admin_regenerate, True),
    ("GET", "/api/admin/shotlist"): (admin_shotlist, True),
}


# --------------------------------------------------------------------------- HTTP plumbing

class Handler(BaseHTTPRequestHandler):
    server_version = "chained/1"
    protocol_version = "HTTP/1.1"

    def client_ip(self):
        if TRUST_PROXY and self.headers.get("X-Forwarded-For"):
            return self.headers["X-Forwarded-For"].split(",")[0].strip()
        return self.client_address[0]

    def log_message(self, fmt, *args):
        sys.stderr.write(f"{self.log_date_time_string()} {self.client_ip()} {fmt % args}\n")

    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")

    def dispatch(self, method):
        url = urlparse(self.path)
        path = url.path
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        con = None
        try:
            route = ROUTES.get((method, path))
            if route:
                fn, admin = route
                if admin and not self.authorized():
                    return self.ask_auth()
                raw = self.read_body() if method == "POST" else b""
                body = raw if path == "/api/admin/upload" else (json.loads(raw or b"{}") if raw else {})
                if path != "/api/admin/upload" and not isinstance(body, dict):
                    raise HTTPError(400, "send a JSON object")
                con = db.connect()
                return self.send_json(200, fn(con, q, body, self))
            if method != "GET":
                raise HTTPError(405, "method not allowed")
            if path in ("/", "/index.html"):
                return self.send_file(STATIC / "index.html", cache=False)
            if path in ("/admin", "/admin/"):
                if not self.authorized():
                    return self.ask_auth()
                return self.send_file(STATIC / "admin.html", cache=False)
            if path == "/healthz":
                return self.send_bytes(200, b"ok\n", "text/plain")
            if path.startswith("/static/"):
                return self.send_static(path[len("/static/"):])
            m = re.match(r"^/i/([0-9a-f]{32})\.(jpg|png|svg)$", path)
            if m:
                return self.send_photo(m.group(1), m.group(2))
            raise HTTPError(404, "not found")
        except HTTPError as e:
            self.send_json(e.status, {"error": e.message})
        except json.JSONDecodeError:
            self.send_json(400, {"error": "bad JSON"})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            traceback.print_exc()
            self.send_json(500, {"error": "server error"})
        finally:
            if con:
                con.close()

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD:
            raise HTTPError(413, "too big (20 MB max)")
        return self.rfile.read(n) if n else b""

    def authorized(self):
        h = self.headers.get("Authorization", "")
        if not h.startswith("Basic "):
            return False
        try:
            _, _, pw = base64.b64decode(h[6:]).decode().partition(":")
        except Exception:
            return False
        return hmac.compare_digest(pw.encode(), ADMIN_PASSWORD.encode())

    def ask_auth(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="chained admin", charset="UTF-8"')
        self.send_header("Content-Length", "0")
        self.end_headers()

    def send_static(self, rel):
        p = (STATIC / rel).resolve()
        if STATIC not in p.parents or not p.is_file() or p.name == "admin.html":
            raise HTTPError(404, "not found")
        self.send_file(p, cache=False)

    def send_photo(self, pid, ext):
        if ext == "svg":
            con = db.connect()
            try:
                svg = demo_svg(con, pid)
            finally:
                con.close()
            if svg is None:
                raise HTTPError(404, "not found")
            return self.send_bytes(200, svg.encode(), "image/svg+xml", cache=True)
        p = db.PHOTOS / f"{pid}.{ext}"
        if not p.is_file():
            raise HTTPError(404, "not found")
        self.send_file(p, cache=True)

    def send_file(self, p, cache):
        ctype = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript",):
            ctype += "; charset=utf-8"
        self.send_bytes(200, p.read_bytes(), ctype, cache)

    def send_json(self, status, obj):
        self.send_bytes(status, json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8")

    def send_bytes(self, status, data, ctype, cache=False):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if cache else "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; "
                         "frame-ancestors 'none'")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)


def load_password():
    pw = os.environ.get("CHAINED_ADMIN_PASSWORD", "")
    f = db.VAR / "admin_password"
    if pw:
        return pw, False
    if f.exists():
        return f.read_text().strip(), False
    pw = secrets.token_urlsafe(12)
    f.write_text(pw + "\n")
    f.chmod(0o600)
    return pw, True


def main():
    global ADMIN_PASSWORD, TRUST_PROXY
    ap = argparse.ArgumentParser(description="CHAINED daily fast-food brand guesser")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 7090)))
    ap.add_argument("--host", default=os.environ.get("HOST", "0.0.0.0"))
    ap.add_argument("--trust-proxy", action="store_true", help="use X-Forwarded-For (behind nginx/caddy)")
    args = ap.parse_args()
    TRUST_PROXY = args.trust_proxy

    db.init()
    con = db.connect()
    scheduler.ensure_demo_photos(con)
    scheduler.ensure_puzzle(con, db.utc_today() + dt.timedelta(days=1))
    st = db.settings(con)
    con.close()
    ADMIN_PASSWORD, new = load_password()

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    httpd.daemon_threads = True
    print(f"{st['site_name']} is up on http://{args.host}:{args.port}  (launch date {st['launch_date']})", flush=True)
    print(f"admin: http://<this-server>:{args.port}/admin  user: admin  password: "
          + (ADMIN_PASSWORD if new else f"see {db.VAR / 'admin_password'}"), flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
