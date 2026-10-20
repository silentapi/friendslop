# Motion QA for rendered frames: per-shot strips + automatic pop / dead-frame detection.
# python3 tip-bait/tools/qa.py <framesDir> <outDir> [step]
import json, os, sys, glob
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, '..', 'trailer', 'cues.json')))
src, out = sys.argv[1], sys.argv[2]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 3
os.makedirs(out, exist_ok=True)
t = 0.0; report = []
for s in CUES['shots']:
    f0, f1 = round(t * 30), round((t + s['dur']) * 30); t += s['dur']
    fs = [f for f in range(f0, f1) if f % step == 0 and os.path.exists(f'{src}/f{f:05d}.jpg')]
    if not fs: continue
    ims = [Image.open(f'{src}/f{f:05d}.jpg').convert('RGB') for f in fs]
    g = [np.asarray(im.convert('L').resize((90, 160))).astype(np.float32) / 255 for im in ims]
    diffs = [float(np.abs(g[i] - g[i - 1]).mean()) for i in range(1, len(g))]
    med = float(np.median(diffs)) if diffs else 0
    flags = []
    for i, d in enumerate(diffs):
        if d > max(0.06, 3.0 * med): flags.append(f'pop {fs[i]}->{fs[i + 1]} ({d:.3f} vs med {med:.3f})')
    for f, a in zip(fs, g):
        m = a.mean()
        if m < 0.07: flags.append(f'dark f{f} ({m:.2f})')
        if m > 0.93: flags.append(f'white f{f} ({m:.2f})')
        if a.std() < 0.03: flags.append(f'flat f{f}')
    report.append({'shot': s['name'], 'frames': len(fs), 'flags': flags})
    cols = 8; tw, th = 180, 320; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), 'black'); d = ImageDraw.Draw(sheet)
    for i, (im, f) in enumerate(zip(ims, fs)):
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        sheet.paste(im.resize((tw, th)), (x, y)); d.text((x + 3, y + th + 2), f'{s["name"]} {(f - f0) / 30:.2f}s', fill='white')
    sheet.save(f'{out}/{s["name"]}.jpg', quality=80)
json.dump(report, open(f'{out}/report.json', 'w'), indent=1)
for r in report: print(r['shot'], r['frames'], '|', '; '.join(r['flags']) or 'ok')
