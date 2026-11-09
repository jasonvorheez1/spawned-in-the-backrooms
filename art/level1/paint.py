# Level 1 kit textures: door enamel with rust and scuffs, the M.E.G. hand-drawn map sheet, a stain mask for the wall.
import random, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
OUT = "/workspace/l1/tex/"; import os; os.makedirs(OUT, exist_ok=True)
R = random.Random(7)
def noise(w, h, base, amp, blur):
    im = Image.new("RGB", (w, h), base); px = im.load()
    for y in range(h):
        for x in range(w):
            n = R.uniform(-amp, amp); px[x, y] = tuple(max(0, min(255, int(c + n))) for c in base)
    return im.filter(ImageFilter.GaussianBlur(blur))
# door enamel: institutional grey-green, rust streaks from the top edge and hinge line, scuffs at hand and kick height
W = H = 1024
d = noise(W, H, (92, 104, 96), 10, 1.2); dr = ImageDraw.Draw(d, "RGBA")
for i in range(40):
    x = R.randint(0, W); y0 = R.choice([0, R.randint(0, 200)]); L = R.randint(80, 520); w = R.randint(2, 9)
    for k in range(L):
        a = int(110 * (1 - k / L) ** 1.5); dr.line([(x + math.sin(k * 0.03) * 2, y0 + k), (x + w + math.sin(k * 0.03) * 2, y0 + k)], fill=(112, 58, 28, a))
for i in range(260):
    x, y = R.randint(0, W), R.randint(int(H * 0.45), int(H * 0.62)); dr.line([(x, y), (x + R.randint(-30, 30), y + R.randint(-4, 4))], fill=(150, 150, 140, R.randint(30, 90)), width=R.randint(1, 3))
for y in range(int(H * 0.85), H):
    a = int(140 * (y - H * 0.85) / (H * 0.15)); dr.line([(0, y), (W, y)], fill=(48, 42, 34, a))
for i in range(30):
    x, y, r = R.randint(0, W), R.randint(0, H), R.randint(3, 14); dr.ellipse([x - r, y - r, x + r, y + r], fill=(120, 66, 34, R.randint(60, 150)))
d.filter(ImageFilter.GaussianBlur(0.6)).save(OUT + "door.png")
# the map: three taped sheets of squared paper, a 30 x 30 grid with zone blocks, the camp, the route east in red marker
M = Image.new("RGB", (1024, 512), (60, 52, 40)); dm = ImageDraw.Draw(M, "RGBA")
f = ImageFont.truetype("DejaVuSans-Bold.ttf", 22); fs = ImageFont.truetype("DejaVuSans.ttf", 15)
sheets = [(20, 22, 360, 492, -1.0), (340, 14, 690, 500, 0.6), (670, 26, 1004, 488, -0.4)]
for x0, y0, x1, y1, rot in sheets:
    sh = Image.new("RGBA", (x1 - x0, y1 - y0), (232, 226, 204, 255)); ds = ImageDraw.Draw(sh, "RGBA")
    for gx in range(0, x1 - x0, 14): ds.line([(gx, 0), (gx, y1 - y0)], fill=(140, 170, 200, 70))
    for gy in range(0, y1 - y0, 14): ds.line([(0, gy), (x1 - x0, gy)], fill=(140, 170, 200, 70))
    for i in range(6): ds.ellipse([R.randint(0, x1 - x0), R.randint(0, y1 - y0)] * 2, outline=(150, 120, 70, 40), width=R.randint(20, 50))
    sh = sh.rotate(rot, expand=False, fillcolor=(60, 52, 40, 0)); M.paste(sh, (x0, y0), sh)
gx0, gy0, cs = 60, 40, 14.5
cols = [(200, 160, 40), (60, 110, 170), (170, 60, 50), (70, 140, 80)]
for bx in range(6):
    for by in range(6):
        h = (bx * 7 + by * 13) % 5
        if h in (0, 3): dm.rectangle([gx0 + bx * 5 * cs * 2.2, gy0 + by * 5 * cs, gx0 + (bx + 1) * 5 * cs * 2.2 - 3, gy0 + (by + 1) * 5 * cs - 3], outline=(40, 40, 50, 160), width=2)
        if h == 1:
            for k in range(5): dm.line([(gx0 + bx * 5 * cs * 2.2 + 6, gy0 + by * 5 * cs + 8 + k * 13), (gx0 + (bx + 1) * 5 * cs * 2.2 - 8, gy0 + by * 5 * cs + 8 + k * 13)], fill=(60, 60, 70, 150), width=2)
        if h == 4: dm.text((gx0 + bx * 5 * cs * 2.2 + 20, gy0 + by * 5 * cs + 22), "X", font=f, fill=(160, 40, 30, 200))
cx, cy = gx0 + 2.5 * 5 * cs * 2.2, gy0 + 2.5 * 5 * cs
dm.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], outline=(170, 30, 30, 230), width=4); dm.text((cx - 30, cy + 20), "CAMP", font=f, fill=(30, 30, 40, 230))
pts = [(cx + 16, cy), (cx + 120, cy + 6), (cx + 180, cy - 30), (cx + 320, cy - 34), (cx + 400, cy - 80), (960, cy - 84)]
dm.line(pts, fill=(190, 30, 30, 220), width=5, joint="curve"); dm.text((900, cy - 120), "LV 2 ->", font=f, fill=(170, 30, 30, 230))
dm.text((40, 450), "HABITABLE ZONE  -  M.E.G. WAYPOINT", font=f, fill=(30, 30, 40, 220)); dm.text((560, 455), "hounds seen near racks. stay in corridors when the lights go", font=fs, fill=(40, 40, 60, 210))
dm.text((cx - 70, cy - 64), "BACK TO LV0", font=fs, fill=(40, 40, 60, 200))
for x, y in [(30, 30), (350, 24), (680, 34), (995, 30), (30, 480), (995, 478), (520, 26)]:
    dm.ellipse([x - 7, y - 7, x + 7, y + 7], fill=R.choice([(200, 30, 30, 255), (30, 90, 200, 255), (230, 200, 40, 255)]))
M.save(OUT + "map.png")
# cork
c = noise(512, 512, (150, 110, 70), 40, 0.8); c.save(OUT + "cork.png")
print("ok")
