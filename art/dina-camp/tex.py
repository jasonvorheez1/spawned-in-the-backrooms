# paints the camp's two small textures: chalk tally (41 marks) and the courier waybill
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, math
random.seed(41)
OUT = "/workspace/dina/"
# --- tally: 8 gates of five + 1 = 41
W, H = 768, 320
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
def stroke(x0, y0, x1, y1, w=6):
    n = 14; pts = []
    for i in range(n + 1):
        t = i / n; pts.append((x0 + (x1 - x0) * t + random.uniform(-1.6, 1.6), y0 + (y1 - y0) * t + random.uniform(-1.6, 1.6)))
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=(236, 232, 220, random.randint(150, 235)), width=w + random.randint(-2, 1))
count = 0
for g in range(9):
    row, col = divmod(g, 5)
    gx = 40 + col * 145 + random.uniform(-8, 8); gy = 28 + row * 150 + random.uniform(-6, 6)
    n = 5 if g < 8 else 1
    for k in range(min(n, 4)):
        x = gx + k * 22 + random.uniform(-3, 3); stroke(x, gy + random.uniform(-5, 5), x + random.uniform(-5, 5), gy + 105 + random.uniform(-8, 8)); count += 1
    if n == 5: stroke(gx - 14, gy + 80 + random.uniform(-10, 10), gx + 82, gy + 22 + random.uniform(-10, 10)); count += 1
assert count == 41, count
im = im.filter(ImageFilter.GaussianBlur(0.8))
px = im.load()
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if a: px[x, y] = (r, g, b, int(a * random.uniform(0.55, 1.0)))
im.save(OUT + "tally.png")
# --- waybill
W, H = 512, 724
im = Image.new("RGB", (W, H), (214, 205, 182)); d = ImageDraw.Draw(im)
for _ in range(900):
    x, y = random.randrange(W), random.randrange(H); r = random.randint(2, 26); c = random.randint(-9, 6)
    d.ellipse([x - r, y - r, x + r, y + r], fill=(205 + c, 196 + c, 172 + c))
im = im.filter(ImageFilter.GaussianBlur(6)); d = ImageDraw.Draw(im)
F = "/usr/share/fonts/truetype/dejavu/"
fb = lambda s: ImageFont.truetype(F + "DejaVuSans-Bold.ttf", s); fr = lambda s: ImageFont.truetype(F + "DejaVuSans.ttf", s)
ink = (38, 36, 40)
d.rectangle([28, 28, W - 28, H - 28], outline=ink, width=3)
d.text((44, 40), "COURIER WAYBILL", font=fb(34), fill=ink)
d.text((44, 84), "carry this copy with the consignment", font=fr(13), fill=ink)
d.rectangle([360, 40, W - 44, 96], outline=ink, width=2); d.text((366, 44), "No.", font=fr(12), fill=ink)
boxes = [("SENDER", 112, 90), ("CONSIGNEE", 206, 90), ("CONTENTS / DECLARED", 300, 110), ("ROUTE", 414, 86), ("RECEIVED BY (SIGN)", 504, 80), ("COURIER", 588, 92)]
blue = (30, 44, 110)
def scribble(x0, y, x1, amp=7):
    x = x0; pts = [(x, y)]
    while x < x1:
        x += random.uniform(3, 9); pts.append((x, y + random.uniform(-amp, amp) * (0.3 if random.random() < 0.25 else 1)))
        if random.random() < 0.12: d.line(pts, fill=blue, width=2); x += random.uniform(8, 18); pts = [(x, y)]
    if len(pts) > 1: d.line(pts, fill=blue, width=2)
for name, y, h in boxes:
    d.rectangle([44, y, W - 44, y + h], outline=ink, width=2); d.text((50, y + 4), name, font=fb(12), fill=ink)
    for k in range(1, max(2, h // 28)):
        ly = y + 14 + k * 24
        if ly < y + h - 6:
            d.line([50, ly + 9, W - 50, ly + 9], fill=(120, 116, 110), width=1)
            if name != "RECEIVED BY (SIGN)": scribble(60, ly, random.uniform(250, 440))
scribble(376, 74, 450, 6)
d.text((44, H - 46), "white: consignee   yellow: courier   pink: office", font=fr(11), fill=ink)
# ring stain
st = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
sd.ellipse([300, 520, 470, 690], outline=(96, 70, 40, 70), width=7)
im.paste(st, (0, 0), st)
# stamp
txt = "UNDELIVERED"; f = fb(54)
s = Image.new("RGBA", (460, 110), (0, 0, 0, 0)); sd = ImageDraw.Draw(s)
sd.rounded_rectangle([4, 4, 455, 105], radius=10, outline=(176, 24, 28, 235), width=7)
tw = sd.textlength(txt, font=f); sd.text(((460 - tw) / 2, 20), txt, font=f, fill=(176, 24, 28, 235))
sp = s.load()
for y in range(110):
    for x in range(460):
        r, g, b, a = sp[x, y]
        if a and random.random() < 0.22: sp[x, y] = (r, g, b, int(a * random.uniform(0, 0.5)))
s = s.rotate(17, expand=True, resample=Image.BICUBIC)
im.paste(s, (30, 250), s)
im.save(OUT + "waybill.png")
print("tex ok")
