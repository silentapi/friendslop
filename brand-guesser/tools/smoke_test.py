#!/usr/bin/env python3
"""End-to-end smoke test against a running server (default http://localhost:7090).

    python3 brand-guesser/tools/smoke_test.py [base_url] [admin_password]

Plays today's puzzle as two devices, checks the no-peeking/no-take-back rules,
uploads a photo with EXIF+GPS and checks it's stripped, approves it, and pokes
every admin endpoint. Leaves test data behind, so use it on a dev database.
"""
import base64
import datetime as dt
import json
import secrets
import struct
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:7090"
PW = sys.argv[2] if len(sys.argv) > 2 else (Path(__file__).resolve().parent.parent / "var" / "admin_password").read_text().strip()
AUTH = "Basic " + base64.b64encode(f"admin:{PW}".encode()).decode()


def req(path, body=None, admin=False, raw=None, expect=200):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(BASE + path, data=data, method="POST" if data is not None else "GET")
    if body is not None:
        r.add_header("Content-Type", "application/json")
    if admin:
        r.add_header("Authorization", AUTH)
    try:
        with urllib.request.urlopen(r) as resp:
            status, out = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, out = e.code, e.read()
    assert status == expect, f"{path}: expected {expect}, got {status}: {out[:200]!r}"
    try:
        return json.loads(out)
    except ValueError:
        return out


def jpeg_with_exif():
    """A tiny valid JPEG (1x1) with an APP1 EXIF segment containing a fake GPS tag string."""
    tiny = base64.b64decode(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwS"
        "ExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=")
    payload = b"Exif\x00\x00" + b"GPSLatitude 40.7128 N  taken at a Dominos"
    app1 = b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload
    return tiny[:2] + app1 + tiny[2:]


def main():
    today = dt.datetime.now(dt.timezone.utc).date()
    iso = today.isoformat()
    p = req(f"/api/puzzle?date={iso}")
    assert len(p["rounds"]) == 5, p
    assert all(len(r["options"]) == 4 for r in p["rounds"])
    assert "answer" not in json.dumps(p), "answers must not be in the puzzle payload"
    print(f"puzzle #{p['n']} {iso}: " + " · ".join(r["category"] for r in p["rounds"]))

    req(f"/api/puzzle?date={(today + dt.timedelta(days=3)).isoformat()}", expect=403)
    req("/api/puzzle?date=1999-01-01", expect=404)
    req("/api/puzzle?date=garbage", expect=400)

    a, b = secrets.token_hex(8), secrets.token_hex(8)
    score = 0
    for i, r in enumerate(p["rounds"]):
        first = r["options"][0]["id"]
        res = req("/api/answer", {"date": iso, "round": i, "choice": first, "device": a})
        score += res["right"]
        # no take-backs: a different second answer returns the first one
        again = req("/api/answer", {"date": iso, "round": i, "choice": r["options"][1]["id"], "device": a})
        assert again["choice"] == first, again
        req("/api/answer", {"date": iso, "round": i, "choice": res["correct"], "device": b})
        req("/api/answer", {"date": iso, "round": i, "choice": "not-a-brand", "device": b}, expect=400)
    stats = req(f"/api/daystats?date={iso}&device={a}")
    assert stats["players"] >= 2 and "beat" in stats, stats
    print(f"device A scored {score}/5; day stats: {stats}")
    assert req(f"/api/archive?before={iso}")["days"] is not None
    req("/api/credits")

    req("/api/admin/overview", expect=401)
    o = req("/api/admin/overview", admin=True)
    print("overview:", {k: o[k] for k in ("categories_playable", "items_playable", "items_with_real_photos")})
    cat = req("/api/admin/catalog", admin=True)["categories"][0]
    item = cat["items"][0]
    up = req(f"/api/admin/upload?category={cat['id']}&brand={item['brand_id']}&angle=hero&source=own&purchase=P-test",
             raw=jpeg_with_exif(), admin=True)
    img = req(up["url"])
    assert b"Exif" not in img and b"GPS" not in img, "EXIF/GPS should be stripped"
    dup = req(f"/api/admin/upload?category={cat['id']}&brand={item['brand_id']}", raw=jpeg_with_exif(), admin=True)
    assert dup["duplicate"]
    req(f"/api/admin/upload?category={cat['id']}&brand={item['brand_id']}", raw=b"GIF89a....", admin=True, expect=415)
    pend = req("/api/admin/photos?status=pending", admin=True)["photos"]
    assert any(x["id"] == up["id"] for x in pend)
    req("/api/admin/photo", {"id": up["id"], "status": "approved", "est_difficulty": 2}, admin=True)
    print("upload: EXIF stripped, duplicate detected, approved", up["id"])

    sched = req("/api/admin/schedule?days=7", admin=True)
    assert len(sched["days"]) >= 7
    shots = req("/api/admin/shotlist?days=30", admin=True)
    print(f"shot list (30 days): need {shots['need']}, have {shots['have']}, gap {shots['gap']}")
    req("/api/admin/item", {"category_id": cat["id"], "brand_id": item["brand_id"], "tell": "smoke-test tell"}, admin=True)
    req("/api/admin/category", {"id": cat["id"], "difficulty": cat["difficulty"]}, admin=True)
    req("/api/admin/regenerate", {}, admin=True)
    used = next(x for x in req("/api/admin/photos?status=approved", admin=True)["photos"] if x["id"] == up["id"])["used"]
    req("/api/admin/photo", {"id": up["id"], "delete": True}, admin=True, expect=409 if used else 200)
    print("all good")


if __name__ == "__main__":
    main()
