# Level 1 Level-2-entrance prop textures: hazard paint on steel, kraft cardboard with tape, oxblood drum enamel.
import random, math, os
from PIL import Image, ImageDraw, ImageFilter
OUT = "/workspace/l1/tex/"; os.makedirs(OUT, exist_ok=True)
R = random.Random(21)
def grain(im, amp):
    px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            n = R.uniform(-amp, amp); px[x, y] = tuple(max(0, min(255, int(c + n))) for c in px[x, y])
    return im
S = 512
# hazard: 45 degree yellow/black, chipped to bare steel at edges, grime fading up from the bottom
im = Image.new("RGB", (S, S)); px = im.load()
for y in range(S):
    for x in range(S):
        px[x, y] = (205, 160, 34) if ((x + y) // 64) % 2 == 0 else (24, 22, 20)
d = ImageDraw.Draw(im, "RGBA")
for i in range(140):
    x, y, r = R.randint(0, S), R.randint(0, S), R.randint(2, 9); d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(92, 94, 96, R.randint(140, 230)))
for i in range(30):
    x = R.randint(0, S); L = R.randint(40, 200)
    for k in range(L): d.point((x + int(math.sin(k * .05) * 2), k), fill=(96, 52, 26, int(90 * (1 - k / L))))
grain(im, 12).filter(ImageFilter.GaussianBlur(0.7)).save(OUT + "hazard.png")
# cardboard: kraft with flute ribs, a tape band across the middle, water tide line low down
im = Image.new("RGB", (S, S), (150, 112, 70)); d = ImageDraw.Draw(im, "RGBA")
for x in range(0, S, 6): d.line([(x, 0), (x, S)], fill=(130, 96, 58, 40), width=2)
d.rectangle([0, S // 2 - 34, S, S // 2 + 34], fill=(176, 140, 92, 210))
for i in range(6): d.line([(0, S // 2 - 34 + i * 13), (S, S // 2 - 30 + i * 13)], fill=(200, 170, 120, 60))
for y in range(int(S * .78), S): d.line([(0, y), (S, y)], fill=(70, 50, 32, int(150 * (y - S * .78) / (S * .22))))
d.line([(0, int(S * .78)), (S, int(S * .76))], fill=(80, 56, 34, 120), width=3)
for i in range(18):
    x, y, r = R.randint(0, S), R.randint(0, S), R.randint(6, 30); d.ellipse([x - r, y - r, x + r, y + r], fill=(110, 80, 48, R.randint(20, 60)))
grain(im, 10).filter(ImageFilter.GaussianBlur(0.8)).save(OUT + "cardboard.png")
# drum: oxblood enamel, rust weeping from the chime, bare dents
im = Image.new("RGB", (S, S), (104, 28, 24)); d = ImageDraw.Draw(im, "RGBA")
for i in range(60):
    x = R.randint(0, S); L = R.randint(30, 260); w = R.randint(2, 8); top = R.choice([True, False])
    for k in range(L):
        y = k if top else S - k; a = int(130 * (1 - k / L) ** 1.4); d.line([(x, y), (x + w, y)], fill=(120, 64, 30, a))
for i in range(80):
    x, y, r = R.randint(0, S), R.randint(0, S), R.randint(2, 10); d.ellipse([x - r, y - r, x + r, y + r], fill=(84, 60, 48, R.randint(80, 200)))
grain(im, 9).filter(ImageFilter.GaussianBlur(0.7)).save(OUT + "drum.png")
print("ok")
