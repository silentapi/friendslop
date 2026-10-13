"""Split every panel in cuts.json into animation layers.

For each panel it writes assets/<id>/:
  full.png  the panel exactly as printed (alpha = panel shape)
  bg.png    the background plate: characters and lettering removed and inpainted
  fg.png    the character cutout (anime segmentation model), if fg is set
  t<i>.png  each caption/bubble as its own layer (flood-filled bubble shape)
  o<i>.png  each technique orb as its own circular layer
It also writes assets/manifest.json and debug overlays to out/debug/.

Usage: python3 -I tools/cut.py [panelId ...]
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)
cuts = json.load(open('cuts.json'))
only = set(sys.argv[1:])
os.makedirs('assets', exist_ok=True); os.makedirs('out/debug', exist_ok=True)
man_path = 'assets/manifest.json'
manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}

_sess = None
def seg(rgb):
    global _sess
    from rembg import remove, new_session
    if _sess is None: _sess = new_session('isnet-anime')
    m = remove(Image.fromarray(rgb), session=_sess, only_mask=True)
    return np.asarray(m).astype(np.float32) / 255.0

pages = {}
# work on the 2x AI-upscaled scans when present; all cut-sheet coordinates are in 1x page pixels
S = 2 if os.path.isdir('pages/hd') and len(os.listdir('pages/hd')) >= 19 else 1
def page(n):
    if n not in pages: pages[n] = np.asarray(Image.open(f'pages/hd/p{n:02d}.png' if S == 2 else f'pages/p{n:02d}.png').convert('RGB'))
    return pages[n]
sc = lambda v: [int(round(q * S)) for q in v]

def bubble_mask(img, r):
    """Mask of the caption/bubble inside rect r: flood the dominant light colour, fill holes, add the ink border."""
    x0, y0, x1, y1 = r; H, W = img.shape[:2]
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    sub = img[y0:y1, x0:x1].astype(np.int16)
    lum = sub.mean(axis=2)
    light = lum > 150
    # paper colour = median of light pixels
    col = np.median(sub[light], axis=0) if light.sum() > 50 else np.array([255, 255, 255])
    close = (np.abs(sub - col).sum(axis=2) < 70).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(close, 8)
    if n <= 1: return None
    k = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    m = (lab == k).astype(np.uint8)
    # fill holes (the lettering) by flood-filling the outside
    pad = np.pad(m, 1); inv = (1 - pad).copy(); ff = inv.copy()
    cv2.floodFill(ff, None, (0, 0), 0)
    filled = pad | ff
    m = filled[1:-1, 1:-1]
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))  # include the ink outline
    full = np.zeros((H, W), np.uint8); full[y0:y1, x0:x1] = m
    return full

for pid, c in cuts.items():
    if only and pid not in only: continue
    img = page(c['page']); H, W = img.shape[:2]
    poly = np.array([sc(q) for q in c['poly']], np.int32)
    pm = np.zeros((H, W), np.uint8); cv2.fillPoly(pm, [poly], 1)
    x, y, w, h = cv2.boundingRect(poly)
    x, y = max(0, x), max(0, y); w, h = min(W - x, w), min(H - y, h)
    crop = img[y:y + h, x:x + w].copy(); pmc = pm[y:y + h, x:x + w]
    out = f'assets/{pid}'; os.makedirs(out, exist_ok=True)
    def save(rgb, a, name):
        Image.fromarray(np.dstack([rgb, (np.clip(a, 0, 1) * 255).astype(np.uint8)])).save(f'{out}/{name}')
    save(crop, pmc, 'full.png')
    entry = dict(page=c['page'], x=x / S, y=y / S, w=w / S, h=h / S, poly=c['poly'], texts=[], orbs=[], fg=False, s=S)

    # lettering layers
    tmask = np.zeros((H, W), np.uint8)
    for i, r in enumerate(c.get('texts', [])):
        m = bubble_mask(img, sc(r))
        if m is None: continue
        ys, xs = np.nonzero(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        save(img[by0:by1, bx0:bx1], m[by0:by1, bx0:bx1].astype(np.float32), f't{i}.png')
        entry['texts'].append(dict(x=bx0 / S, y=by0 / S, w=(bx1 - bx0) / S, h=(by1 - by0) / S, f=f't{i}.png'))
        tmask |= m
    tmc = tmask[y:y + h, x:x + w]

    # character cutout
    hole = cv2.dilate(tmc, np.ones((11 * S, 11 * S), np.uint8))
    if c.get('fg'):
        src = crop.copy(); src[pmc == 0] = 255
        a = seg(src)
        a = np.clip((a - 0.3) / 0.4, 0, 1) * pmc * (1 - cv2.dilate(tmc, np.ones((3, 3), np.uint8)))
        # drop specks: keep components bigger than 0.4% of the panel
        hard = (a > 0.5).astype(np.uint8)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
        keep = np.zeros_like(hard)
        for k in range(1, n):
            if stats[k, cv2.CC_STAT_AREA] > 0.004 * w * h: keep[lab == k] = 1
        keep = cv2.dilate(keep, np.ones((5, 5), np.uint8))
        a = a * keep
        a = cv2.GaussianBlur(a, (3, 3), 0)
        save(crop, a, 'fg.png'); entry['fg'] = True
        hole = hole | cv2.dilate((a > 0.25).astype(np.uint8), np.ones((9 * S, 9 * S), np.uint8))

    # orb layers (cut as soft-edged discs so they can spin/pulse)
    for i, (ox1, oy1, orr1) in enumerate(c.get('orbs', [])):
        ox, oy, orr = ox1 * S, oy1 * S, orr1 * S
        R = int(orr * 1.08)
        bx0, by0 = max(0, ox - R), max(0, oy - R); bx1, by1 = min(W, ox + R), min(H, oy + R)
        yy, xx = np.mgrid[by0:by1, bx0:bx1]
        d = np.sqrt((xx - ox) ** 2 + (yy - oy) ** 2)
        a = np.clip((orr * 1.04 - d) / (orr * 0.08), 0, 1)
        save(img[by0:by1, bx0:bx1], a, f'o{i}.png')
        entry['orbs'].append(dict(cx=ox1, cy=oy1, r=orr1, x=bx0 / S, y=by0 / S, w=(bx1 - bx0) / S, h=(by1 - by0) / S, f=f'o{i}.png'))

    # background plate: inpaint where characters / lettering were
    hole = (hole & pmc).astype(np.uint8)
    bgc = cv2.inpaint(cv2.cvtColor(crop, cv2.COLOR_RGB2BGR), hole * 255, 6 * S, cv2.INPAINT_TELEA)
    bgc = cv2.cvtColor(bgc, cv2.COLOR_BGR2RGB)
    # soften the inpainted area so smears read as out-of-focus background
    blur = cv2.GaussianBlur(bgc, (0, 0), 4 * S)
    hm = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 3 * S)[..., None]
    bgc = (bgc * (1 - hm) + blur * hm).astype(np.uint8)
    save(bgc, pmc, 'bg.png')
    manifest[pid] = entry

    # debug overlay
    dbg = crop.copy().astype(np.float32)
    if entry['fg']:
        fa = np.asarray(Image.open(f'{out}/fg.png'))[..., 3:4] / 255.0
        dbg = dbg * (1 - fa * 0.45) + np.array([255, 40, 60]) * fa * 0.45
    dbg = dbg * (1 - tmc[..., None] * 0.5) + np.array([40, 120, 255]) * tmc[..., None] * 0.5
    dbg[pmc == 0] *= 0.25
    Image.fromarray(dbg.astype(np.uint8)).save(f'out/debug/{pid}.jpg', quality=85)
    print(pid, 'fg' if entry['fg'] else '  ', len(entry['texts']), 'texts', len(entry['orbs']), 'orbs', flush=True)

json.dump(manifest, open(man_path, 'w'), indent=0)
