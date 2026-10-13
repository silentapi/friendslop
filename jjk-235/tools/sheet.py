"""Tile images into labelled contact sheets. Usage: python3 -I tools/sheet.py <out.jpg> <cols> <cellW> <img...>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files = sys.argv[4:]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
ims = [Image.open(p).convert('RGB') for p in files]
ch = max(int(cw * im.height / im.width) for im in ims)
ch = min(ch, int(cw * 1.6))
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * cw, rows * (ch + 22)), (30, 30, 36)); d = ImageDraw.Draw(S)
for i, (p, im) in enumerate(zip(files, ims)):
    im.thumbnail((cw, ch)); x, y = (i % cols) * cw, (i // cols) * (ch + 22)
    S.paste(im, (x + (cw - im.width) // 2, y + 22)); d.text((x + 4, y + 2), os.path.basename(p), fill=(255, 220, 80), font=f)
S.save(out, quality=85)
