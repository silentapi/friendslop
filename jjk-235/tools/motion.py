"""Motion QA for a rendered frame folder.
- motion energy per frame (mean abs diff vs previous frame, 0..255)
- flags stretches >= 0.5s where the picture is effectively still
- per-shot contact sheets (6 frames) into <dir>/sheets/
Usage: python3 -I tools/motion.py <framesDir>
"""
import sys, os, json, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; info = json.load(open(f'{d}/shots.json')); fps = info['fps']
files = sorted(glob.glob(f'{d}/f*.jpg'))
small = lambda p: np.asarray(Image.open(p).convert('L').resize((160, 90)), np.float32)
E = [0.0]; prev = small(files[0])
for p in files[1:]:
    cur = small(p); E.append(float(np.abs(cur - prev).mean())); prev = cur
E = np.array(E)
os.makedirs(f'{d}/sheets', exist_ok=True)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
print(f'{"shot":10s} {"dur":>5s} {"meanE":>6s} {"minE":>5s}  still-stretches')
bad = 0
for s in info['shots']:
    a, b = round(s['start'] * fps), min(len(files), round((s['start'] + s['dur']) * fps))
    e = E[a + 1:b] if b > a + 1 else np.array([0])
    still = e < 0.25; runs = []; run = 0
    for i, v in enumerate(still):
        run = run + 1 if v else 0
        if run == int(0.5 * fps): runs.append((a + 1 + i - run + 1) / fps)
    if runs: bad += 1
    print(f'{s["name"]:10s} {s["dur"]:5.1f} {e.mean():6.2f} {e.min():5.2f}  {" ".join(f"{r:.1f}s" for r in runs)}')
    idx = np.linspace(a, b - 1, 6).astype(int)
    ims = [Image.open(files[i]) for i in idx]; w, h = ims[0].size
    S = Image.new('RGB', (w * 6, h + 20), (20, 20, 26)); dr = ImageDraw.Draw(S)
    for k, (i, im) in enumerate(zip(idx, ims)): S.paste(im, (k * w, 20)); dr.text((k * w + 4, 2), f'{s["name"]} {i / fps:.2f}s E={E[i]:.1f}', fill=(255, 220, 80), font=f)
    S.save(f'{d}/sheets/{s["start"]:07.2f}_{s["name"]}.jpg', quality=80)
print(f'\n{bad} shots with still stretches >= 0.5s; total {len(files) / fps:.1f}s')
