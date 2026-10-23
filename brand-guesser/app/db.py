"""SQLite storage for CHAINED: schema, first-run seeding from data/catalog.json, helpers.

Schema follows docs/DATA.md §2. One connection per request (sqlite3 objects
aren't shared across threads); writes that must not interleave (puzzle
generation) take WRITE_LOCK.
"""
import datetime as dt
import json
import sqlite3
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # brand-guesser/
VAR = ROOT / "var"
PHOTOS = VAR / "photos"
DB_PATH = VAR / "chained.db"
CATALOG = ROOT / "data" / "catalog.json"
WRITE_LOCK = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS brand (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'national',
  region TEXT, us_units INTEGER, active INTEGER NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT NOT NULL, grp TEXT NOT NULL,
  difficulty INTEGER NOT NULL, launch INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1, tells TEXT NOT NULL DEFAULT '',
  lookalikes TEXT NOT NULL DEFAULT '[]', sort INTEGER NOT NULL DEFAULT 0);

-- an item = one brand's version of one category ("Domino's pepperoni pizza")
CREATE TABLE IF NOT EXISTS item (
  category_id TEXT NOT NULL REFERENCES category(id), brand_id TEXT NOT NULL REFERENCES brand(id),
  menu_name TEXT NOT NULL DEFAULT '', tell TEXT NOT NULL DEFAULT '',
  giveaway INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'current',            -- current | retired
  recipe_changed_at TEXT,                            -- photos taken before this are invalid
  PRIMARY KEY (category_id, brand_id));

CREATE TABLE IF NOT EXISTS photo (
  id TEXT PRIMARY KEY,                               -- sha256 of the stored file (hex, 32 chars)
  ext TEXT NOT NULL, category_id TEXT NOT NULL, brand_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'own',                -- own | contributor | player | cc | demo
  credit TEXT NOT NULL DEFAULT '', license TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '',
  purchase_id TEXT NOT NULL DEFAULT '', angle TEXT NOT NULL DEFAULT 'hero',
  taken_at TEXT, city TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',            -- pending | approved | rejected
  est_difficulty INTEGER, bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS photo_item ON photo(category_id, brand_id, status);

CREATE TABLE IF NOT EXISTS puzzle (
  date TEXT PRIMARY KEY, n INTEGER NOT NULL,
  rounds TEXT NOT NULL,                              -- JSON [{category, photo, answer, options[], difficulty}]
  relaxed INTEGER NOT NULL DEFAULT 0,                -- 1 if scheduling rules had to be loosened
  created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS answer (
  date TEXT NOT NULL, round INTEGER NOT NULL, device TEXT NOT NULL,
  photo_id TEXT NOT NULL, choice TEXT NOT NULL, correct INTEGER NOT NULL,
  live INTEGER NOT NULL,                             -- 1 = played on the day, 0 = archive replay
  created_at TEXT NOT NULL,
  PRIMARY KEY (date, round, device, live));
CREATE INDEX IF NOT EXISTS answer_photo ON answer(photo_id, live);
"""

DEFAULT_SETTINGS = {
    "site_name": "CHAINED",
    "demo_photos": "1",          # 1 = fill items that have no real photos with labelled placeholders
    "launch_date": "",           # set to today on first run
}


def now():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def utc_today():
    return dt.datetime.now(dt.timezone.utc).date()


def connect():
    con = sqlite3.connect(DB_PATH, timeout=30)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init():
    PHOTOS.mkdir(parents=True, exist_ok=True)
    with WRITE_LOCK:
        con = connect()
        con.execute("PRAGMA journal_mode = WAL")
        con.executescript(SCHEMA)
        for k, v in DEFAULT_SETTINGS.items():
            con.execute("INSERT OR IGNORE INTO settings VALUES (?, ?)", (k, v))
        if not get_setting(con, "launch_date"):
            set_setting(con, "launch_date", utc_today().isoformat())
        if not con.execute("SELECT 1 FROM category LIMIT 1").fetchone():
            seed(con)
        con.commit()
        con.close()


def seed(con):
    cat = json.loads(CATALOG.read_text())
    for bid, b in cat["brands"].items():
        con.execute("INSERT INTO brand (id, name, scope, region, us_units) VALUES (?,?,?,?,?)",
                    (bid, b["name"], b.get("scope", "national"), b.get("region"), b.get("us_units")))
    for i, c in enumerate(cat["categories"]):
        con.execute("INSERT INTO category VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (c["id"], c["name"], c["emoji"], c["group"], c["difficulty"],
                     int(c["launch"]), int(c["launch"]), c.get("tells", ""),
                     json.dumps(c.get("lookalikes", [])), i))
        for b in c["brands"]:
            con.execute("INSERT INTO item (category_id, brand_id, menu_name, tell, giveaway) VALUES (?,?,?,?,?)",
                        (c["id"], b, "", "", int(b in c.get("giveaways", []))))


def get_setting(con, key):
    row = con.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else DEFAULT_SETTINGS.get(key, "")


def set_setting(con, key, value):
    con.execute("INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value)))


def settings(con):
    out = dict(DEFAULT_SETTINGS)
    out.update({r["key"]: r["value"] for r in con.execute("SELECT key, value FROM settings")})
    return out


def brands(con):
    return {r["id"]: dict(r) for r in con.execute("SELECT * FROM brand")}


def categories(con, enabled_only=False):
    q = "SELECT * FROM category" + (" WHERE enabled = 1" if enabled_only else "") + " ORDER BY sort"
    cats = []
    for r in con.execute(q):
        c = dict(r)
        c["lookalikes"] = json.loads(c["lookalikes"])
        cats.append(c)
    return cats


def items(con):
    return {(r["category_id"], r["brand_id"]): dict(r) for r in con.execute("SELECT * FROM item")}


def item_label(cat, brand, item):
    """What the reveal card calls the item when no menu name has been entered."""
    return item.get("menu_name") or cat["name"]
