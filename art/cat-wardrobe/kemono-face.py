# Nov 16 (Shelly "rework the eyes nose and mouth to better fit + be more in guide to the kemono cuteness"):
# the resting faces redrawn by hand in code on the old pictures' exact layout (275x247 cell, same eye/nose/mouth spots, so the head's
# projection still lands them), at 4x the old size so edges stay clean up close. Iris = pure blue shading (mat-catskin tints it by look.eyes).
# usage: python3 kemono-face.py f|m out.png
import sys
from PIL import Image, ImageDraw, ImageFilter
SEX, OUT = sys.argv[1], sys.argv[2]
W, H, S = 275, 247, 8          # drawn at 8x, saved at 4x
im = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
def P(x, y): return (x * S, y * S)
def ell(d, cx, cy, rx, ry, **k): d.ellipse([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], **k)
# soft cream muzzle oval: wraps wide toward the cheeks
mask = Image.new("L", im.size, 0); ell(ImageDraw.Draw(mask), 138, 186, 92, 40, fill=235)
mz = Image.new("RGBA", im.size, (252, 240, 226, 0)); mz.putalpha(mask.filter(ImageFilter.GaussianBlur(5 * S)))
im.alpha_composite(mz)
d = ImageDraw.Draw(im)
male = SEX == "m"
for sx in (-1, 1):
    cx, cy = 138 + sx * 64, 116
    rx, ry = (36, 42) if not male else (33, 38)
    # sclera: a slim white rim, the iris fills most of the eye (kemono)
    ell(d, cx, cy, rx, ry, fill=(255, 255, 255, 255))
    # iris: vertical blue gradient, dark at the lid, bright toward the cheek
    ix, iy, irx, iry = cx - sx * 2, cy + 3, rx - 6, ry - 5
    for i in range(iry * 2 * S):
        t = i / (iry * 2 * S); y = (iy - iry) * S + i
        import math
        h = math.sqrt(max(0, 1 - ((t * 2 - 1) ** 2))) * irx * S
        b = int(110 + 145 * t ** 1.3)
        d.line([(ix * S - h, y), (ix * S + h, y)], fill=(0, 0, b, 255))
    # inner ring + pupil
    ell(d, ix, iy + 1, irx * 0.62, iry * 0.62, outline=(0, 0, 90, 255), width=int(1.6 * S))
    ell(d, ix, iy - 1, irx * 0.42, iry * 0.5, fill=(8, 8, 12, 255))
    # highlights: a big one at the upper outer, a small one low inside
    ell(d, ix - sx * irx * 0.38, iy - iry * 0.42, 8.5, 9.5, fill=(255, 255, 255, 255))
    ell(d, ix + sx * irx * 0.36, iy + iry * 0.48, 4, 4, fill=(255, 255, 255, 235))
    # upper lid: a thick soft arc; lower lid: a thin hint at the outer corner
    d.arc([P(cx - rx - 2, cy - ry - 1), P(cx + rx + 2, cy + ry + 1)], 200, 340, fill=(28, 20, 24, 255), width=int((4.2 if not male else 3.4) * S))
    a0, a1 = (20, 60) if sx > 0 else (120, 160)
    d.arc([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], a0, a1, fill=(40, 28, 32, 200), width=int(1.4 * S))
    if not male:   # two lashes flicking out at the outer corner
        for k, (bx, by, tx, ty) in enumerate(((0.55, -0.82, 12, -9), (0.85, -0.5, 14, -2))):
            # a tapered lash: wide where it leaves the lid, a point at its tip, curling outward
            b0 = (cx + sx * bx * rx, cy + by * ry); tip = (b0[0] + sx * tx, b0[1] + ty)
            nxv, nyv = -(tip[1] - b0[1]), (tip[0] - b0[0]); L = (nxv * nxv + nyv * nyv) ** 0.5; nxv, nyv = nxv / L * 2.6, nyv / L * 2.6
            d.polygon([P(b0[0] - nxv, b0[1] - nyv), P(b0[0] + nxv, b0[1] + nyv), P(*tip)], fill=(28, 20, 24, 255))
# nose: a small rounded heart-triangle, rosy dark
nx, ny = 138, 156
d.polygon([P(nx - 9, ny - 4), P(nx + 9, ny - 4), P(nx, ny + 6)], fill=(70, 36, 44, 255))
ell(d, nx - 4.5, ny - 4, 4.6, 3.6, fill=(70, 36, 44, 255)); ell(d, nx + 4.5, ny - 4, 4.6, 3.6, fill=(70, 36, 44, 255))
ell(d, nx - 3, ny - 5, 2, 1.3, fill=(200, 150, 160, 220))
# mouth: a little ω tucked under the nose
d.line([P(nx, ny + 6), P(nx, ny + 12)], fill=(60, 34, 40, 255), width=int(2.2 * S))
for sx in (-1, 1):
    d.arc([P(nx + (sx - 1) * 7 + (0 if sx < 0 else 0), ny + 6), P(nx + (sx + 1) * 7, ny + 18)], 20, 160, fill=(60, 34, 40, 255), width=int(2.2 * S))
im = im.resize((W * 4, H * 4), Image.LANCZOS)
im.save(OUT)
