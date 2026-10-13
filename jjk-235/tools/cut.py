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
_lama = None
def lama(rgb, mask):
    """LaMa inpainting (Carve/LaMa-ONNX). rgb uint8 HxWx3, mask 0/1 HxW. Pads to square, runs at 512, returns uint8."""
    global _lama
    import onnxruntime as ort
    if _lama is None: _lama = ort.InferenceSession('/root/models/lama.onnx', providers=['CPUExecutionProvider'])
    h, w = mask.shape; n = max(h, w)
    pr = np.pad(rgb, ((0, n - h), (0, n - w), (0, 0)), mode='edge'); pm = np.pad(mask, ((0, n - h), (0, n - w)))
    ri = cv2.resize(pr, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    mi = (cv2.resize(pm.astype(np.float32), (512, 512), interpolation=cv2.INTER_AREA) > 0.01).astype(np.float32)
    o = _lama.run(None, {'image': ri.transpose(2, 0, 1)[None], 'mask': mi[None, None]})[0][0].transpose(1, 2, 0)
    o = cv2.resize(np.clip(o, 0, 255).astype(np.uint8), (n, n), interpolation=cv2.INTER_CUBIC)[:h, :w]
    return o

def fill(base, hole, feather):
    """Inpaint `hole` in `base` with LaMa: per connected region at local resolution, feathered paste."""
    out = base.copy(); H, W = hole.shape
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hole.astype(np.uint8), 8)
    for k in range(1, n):
        x, y, w, h, area = stats[k]
        if area < 20: continue
        m = max(64, int(0.7 * max(w, h)))
        x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + m)
        reg = (lab[y0:y1, x0:x1] == k).astype(np.uint8)
        res = lama(out[y0:y1, x0:x1], reg)
        a = cv2.GaussianBlur(cv2.dilate(reg, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), feather)[..., None]
        a = np.maximum(a, reg[..., None])
        out[y0:y1, x0:x1] = (out[y0:y1, x0:x1] * (1 - a) + res * a).astype(np.uint8)
    return out
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

def bubble_mask(img, r, grow=0.5, clip=None):
    """Mask of the caption/bubble around rect r: flood the bubble's paper colour from its centre (searching a
    slightly larger area, since traced rects can be tight), fill holes, add the ink border."""
    if grow:
        gx, gy = int((r[2] - r[0]) * grow), int((r[3] - r[1]) * grow)
        src = img if clip is None else np.where(clip[..., None] > 0, img, 0).astype(img.dtype)
        m = bubble_mask(src, [r[0] - gx, r[1] - gy, r[2] + gx, r[3] + gy], grow=0)
        if m is not None:
            # reject a flood that leaked into a big light area (e.g. white sky): area must stay near the traced rect
            if m.sum() < 2.2 * (r[2] - r[0]) * (r[3] - r[1]): return m
        r = list(r)
    x0, y0, x1, y1 = r; H, W = img.shape[:2]
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    sub = img[y0:y1, x0:x1].astype(np.int16)
    h, w = sub.shape[:2]
    lum = sub.mean(axis=2)
    # bubble paper colour = median of light pixels in the central part of the rect (text is dark, paper is light)
    cy0, cy1, cx0, cx1 = int(h * 0.3), int(h * 0.7), int(w * 0.3), int(w * 0.7)
    cen = sub[cy0:cy1, cx0:cx1]; cl = lum[cy0:cy1, cx0:cx1] > 170
    col = np.median(cen[cl], axis=0) if cl.sum() > 20 else np.array([255, 255, 255])
    close = (np.abs(sub - col).sum(axis=2) < 45).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(close, 8)
    if n <= 1: return None
    # keep components that touch the central seed area
    cy0, cy1, cx0, cx1 = int(h * 0.38), int(h * 0.62), int(w * 0.38), int(w * 0.62)
    seeds = set(np.unique(lab[cy0:cy1, cx0:cx1][close[cy0:cy1, cx0:cx1] > 0]).tolist()) - {0}
    if not seeds: return None
    m = np.isin(lab, list(seeds)).astype(np.uint8)
    # fill holes (the lettering) by flood-filling the outside
    pad = np.pad(m, 1); inv = (1 - pad).copy(); ff = inv.copy()
    cv2.floodFill(ff, None, (0, 0), 0)
    filled = pad | ff
    m = filled[1:-1, 1:-1]
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5 * S, 5 * S), np.uint8))
    m = cv2.dilate(m, np.ones((4 * S + 1, 4 * S + 1), np.uint8))  # include the ink outline
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
        m = bubble_mask(img, sc(r), clip=cv2.erode(pm, np.ones((5 * S, 5 * S), np.uint8)))
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

    # background plate: LaMa-inpaint where characters / lettering were
    bgc = crop.copy()
    fh = (hole & pmc).astype(np.uint8) if c.get('fg') else np.zeros_like(pmc)
    if c.get('fg'):
        fgh = (fh & (1 - cv2.dilate(tmc, np.ones((11 * S, 11 * S), np.uint8)))).astype(np.uint8)
        if fgh.sum() > 0:
            res = lama(bgc, fgh)  # whole panel at once: soft, only glimpsed behind the character
            a = cv2.GaussianBlur(fgh.astype(np.float32), (0, 0), 2 * S)[..., None]; a = np.maximum(a, fgh[..., None])
            bgc = (bgc * (1 - a) + res * a).astype(np.uint8)
    th = (cv2.dilate(tmc, np.ones((5 * S, 5 * S), np.uint8)) & pmc).astype(np.uint8)
    if th.sum() > 0: bgc = fill(bgc, th, 1.5 * S)
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
