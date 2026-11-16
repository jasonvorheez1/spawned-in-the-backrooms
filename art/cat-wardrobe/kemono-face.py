# Nov 16 (Shelly "rework the eyes nose and mouth to better fit + be more in guide to the kemono cuteness", then "yes" to every mood,
# "make sure it applies to everyone"): every resting and mood face drawn by hand in code on the old pictures' layout (275x247 cell,
# same eye/nose/mouth spots, so the head's projection still lands them), at 4x. Iris = pure blue shading (mat-catskin tints it by look.eyes).
# usage: python3 kemono-face.py f|m <mood> out.png   moods: neutral smile joy sad angry shock blink blep hit ko
import sys, math
from PIL import Image, ImageDraw, ImageFilter
SEX, MOOD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
W, H, S = 275, 247, 8
male = SEX == "m"
INK, LINE, NOSE = (28, 20, 24, 255), (60, 34, 40, 255), (70, 36, 44, 255)
im = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
def P(x, y): return (x * S, y * S)
def soft(cx, cy, rx, ry, col, a, blur):
    mask = Image.new("L", im.size, 0); ImageDraw.Draw(mask).ellipse([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], fill=a)
    lay = Image.new("RGBA", im.size, col); lay.putalpha(mask.filter(ImageFilter.GaussianBlur(blur * S))); im.alpha_composite(lay)
soft(138, 186, 92, 40, (252, 240, 226), 235, 5)                       # cream muzzle out into the cheeks
if MOOD in ("joy", "blep", "hit", "smile"):                            # blush under the eyes
    for sx in (-1, 1): soft(138 + sx * 78, 160, 17, 9, (255, 140, 150), 120 if MOOD != "smile" else 70, 3)
d = ImageDraw.Draw(im)
def ell(cx, cy, rx, ry, **k): d.ellipse([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], **k)
def arc(cx, cy, rx, ry, a0, a1, col, w): d.arc([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], a0, a1, fill=col, width=int(w * S))
def line(pts, col=INK, w=3): d.line([P(*p) for p in pts], fill=col, width=int(w * S), joint="curve")
def lash(b0, tip):
    nx, ny = -(tip[1] - b0[1]), tip[0] - b0[0]; L = math.hypot(nx, ny); nx, ny = nx / L * 2.6, ny / L * 2.6
    d.polygon([P(b0[0] - nx, b0[1] - ny), P(b0[0] + nx, b0[1] + ny), P(*tip)], fill=INK)
def open_eye(cx, cy, sx, rx, ry, small=False):
    ell(cx, cy, rx, ry, fill=(255, 255, 255, 255))
    k = 0.72 if small else 1.0
    ix, iy, irx, iry = cx - sx * 2, cy + 3 * k, (rx - 6) * k, (ry - 5) * k
    for i in range(int(iry * 2 * S)):
        t = i / (iry * 2 * S); y = (iy - iry) * S + i
        h = math.sqrt(max(0, 1 - (t * 2 - 1) ** 2)) * irx * S
        d.line([(ix * S - h, y), (ix * S + h, y)], fill=(0, 0, int(110 + 145 * t ** 1.3), 255))
    ell(ix, iy + 1, irx * 0.62, iry * 0.62, outline=(0, 0, 90, 255), width=int(1.6 * S))
    ell(ix, iy - 1, irx * (0.3 if small else 0.42), iry * (0.36 if small else 0.5), fill=(8, 8, 12, 255))
    ell(ix - sx * irx * 0.38, iy - iry * 0.42, 8.5 * k, 9.5 * k, fill=(255, 255, 255, 255))
    ell(ix + sx * irx * 0.36, iy + iry * 0.48, 4 * k, 4 * k, fill=(255, 255, 255, 235))
    arc(cx, cy, rx + 2, ry + 1, 200, 340, INK, 3.4 if male else 4.2)
    arc(cx, cy, rx, ry, *((20, 60) if sx > 0 else (120, 160)), (40, 28, 32, 200), 1.4)
    if not male:
        for bx, by, tx, ty in ((0.55, -0.82, 12, -9), (0.85, -0.5, 14, -2)):
            b0 = (cx + sx * bx * rx, cy + by * ry); lash(b0, (b0[0] + sx * tx, b0[1] + ty))
def lid_lashes(cx, cy, sx, rx, y):
    if not male: lash((cx + sx * rx * 0.95, y), (cx + sx * (rx + 12), y - 6))
for sx in (-1, 1):
    cx, cy = 138 + sx * 64, 116
    rx, ry = (33, 38) if male else (36, 42)
    if MOOD == "blink":            # closed: a soft downward curve, lashes at the outer end
        arc(cx, cy - 14, rx, 26, 25, 155, INK, 4.2); lid_lashes(cx, cy + 6, sx, rx - 4, cy + 6)
    elif MOOD == "joy":            # ^ ^ happy arches
        arc(cx, cy + 22, rx - 2, 30, 205, 335, INK, 4.6); lid_lashes(cx, cy, sx, rx - 6, cy + 2)
    elif MOOD == "hit":            # > <  scrunched
        tip = cx - sx * 14
        line([(cx + sx * 20, cy - 18), (tip, cy), (cx + sx * 20, cy + 18)], INK, 6)
    elif MOOD == "ko":             # dizzy spirals
        pts = [(cx + math.cos(a) * r, cy + math.sin(a) * r) for i in range(120) for a, r in [(i * 0.16 * sx, 2 + i * 0.24)]]
        line(pts, INK, 4)
    else:
        open_eye(cx, cy, sx, rx, ry, small=(MOOD == "shock"))
    # brows tell the mood
    if MOOD == "angry":  line([(cx + sx * 30, cy - 62), (cx - sx * 18, cy - 48)], INK, 5)
    elif MOOD == "sad":  line([(cx + sx * 28, cy - 50), (cx - sx * 16, cy - 63)], INK, 4.5)
    elif MOOD in ("shock", "ko"): arc(cx, cy - 52, 22, 10, 200, 340, INK, 4)
    elif MOOD == "hit":  line([(cx + sx * 24, cy - 44), (cx - sx * 10, cy - 34)], INK, 4)
# nose: small rounded heart
nx, ny = 138, 156
d.polygon([P(nx - 9, ny - 4), P(nx + 9, ny - 4), P(nx, ny + 6)], fill=NOSE)
ell(nx - 4.5, ny - 4, 4.6, 3.6, fill=NOSE); ell(nx + 4.5, ny - 4, 4.6, 3.6, fill=NOSE); ell(nx - 3, ny - 5, 2, 1.3, fill=(200, 150, 160, 220))
def omega(w=7):
    line([(nx, ny + 6), (nx, ny + 12)], LINE, 2.2)
    for sx in (-1, 1): arc(nx + sx * w, ny + 12, w, 6, 20, 160, LINE, 2.2)
def tongue(cx, cy, rx, ry):
    ell(cx, cy, rx, ry, fill=(240, 120, 130, 255), outline=(170, 60, 70, 255), width=int(1.6 * S)); line([(cx, cy - ry * 0.5), (cx, cy + ry * 0.3)], (190, 80, 90, 255), 1.4)
def open_mouth(cx, cy, rx, ry, top_flat=True, tongue_on=True):
    box = [P(cx - rx, cy - ry), P(cx + rx, cy + ry)]
    if top_flat: d.chord(box, 0, 180, fill=(110, 30, 45, 255), outline=LINE, width=int(2.2 * S))
    else: d.ellipse(box, fill=(110, 30, 45, 255), outline=LINE, width=int(2.2 * S))
    if tongue_on: tongue(cx, cy + ry * 0.55, rx * 0.55, ry * 0.4)
if MOOD in ("neutral", "blink"): omega()
elif MOOD == "smile":
    line([(nx, ny + 6), (nx, ny + 11)], LINE, 2.2); arc(nx, ny + 4, 16, 12, 25, 155, LINE, 2.4)
elif MOOD == "joy":   line([(nx, ny + 6), (nx, ny + 10)], LINE, 2.2); open_mouth(nx, ny + 12, 15, 13)
elif MOOD == "blep":  omega(); tongue(nx + 3, ny + 21, 5, 6)
elif MOOD == "sad":   arc(nx, ny + 24, 10, 8, 205, 335, LINE, 2.4)
elif MOOD == "shock": open_mouth(nx, ny + 19, 6, 8, top_flat=False, tongue_on=False)
elif MOOD == "angry":
    line([(nx - 12, ny + 20), (nx - 6, ny + 16), (nx, ny + 19), (nx + 6, ny + 16), (nx + 12, ny + 20)], LINE, 2.4)
    d.polygon([P(nx + 5, ny + 17), P(nx + 9, ny + 17), P(nx + 7, ny + 22)], fill=(255, 255, 255, 255), outline=LINE)
elif MOOD in ("hit", "ko"):
    pts = [(nx - 14 + i * 3.5, ny + 15 + (3 if i % 2 else -1)) for i in range(9)]
    d.polygon([P(*p) for p in pts] + [P(nx + 12, ny + 24), P(nx, ny + 27), P(nx - 12, ny + 24)], fill=(110, 30, 45, 255), outline=LINE)
    line(pts, LINE, 2.4)
    if MOOD == "ko": tongue(nx + 4, ny + 28, 6, 7)
im = im.resize((W * 4, H * 4), Image.LANCZOS); im.save(OUT)
