"""Upscale page scans 4x with Real-ESRGAN animevideov3 (BSD-3, xinntao), then resize to 2x.
Writes pages/hd/pNN.png. Usage: python3 -I tools/upscale.py [pageNums...]"""
import os, sys, time
import numpy as np, onnxruntime as ort
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(ROOT)
os.makedirs('pages/hd', exist_ok=True)
s = ort.InferenceSession('/root/models/animev3.onnx', providers=['CPUExecutionProvider'])
nums = [int(a) for a in sys.argv[1:]] or range(1, 20)
T, P = 256, 12  # tile + padding
for n in nums:
    t0 = time.time()
    im = np.asarray(Image.open(f'pages/p{n:02d}.png').convert('RGB')).astype(np.float32) / 255
    H, W = im.shape[:2]; out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, T):
        for x in range(0, W, T):
            y0, x0, y1, x1 = max(0, y - P), max(0, x - P), min(H, y + T + P), min(W, x + T + P)
            tile = im[y0:y1, x0:x1].transpose(2, 0, 1)[None]
            r = s.run(None, {'input': tile})[0][0].transpose(1, 2, 0)
            ty, tx = (y - y0) * 4, (x - x0) * 4; hh, ww = min(T, H - y) * 4, min(T, W - x) * 4
            out[y * 4:y * 4 + hh, x * 4:x * 4 + ww] = r[ty:ty + hh, tx:tx + ww]
    o = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.LANCZOS)
    o.save(f'pages/hd/p{n:02d}.png'); print(n, f'{time.time() - t0:.1f}s', flush=True)
