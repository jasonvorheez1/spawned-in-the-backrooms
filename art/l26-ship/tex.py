# Level 26 ship textures: hull paint (sheer-relative), name decal, teak deck, cabin steel, smashed glass, spray tags, pizza box
import numpy as np, random, math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
OUT = "/workspace/l26ship/tex"; os.makedirs(OUT, exist_ok=True)
R = random.Random(26); rng = np.random.default_rng(26)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
FS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def noise(h, w, scale, oct=4, wrapx=True):
    acc = np.zeros((h, w)); amp = 1; tot = 0
    for o in range(oct):
        gh, gw = max(2, int(h / scale * 2**o)), max(2, int(w / scale * 2**o))
        g = rng.random((gh + 1, gw + 1))
        if wrapx: g[:, -1] = g[:, 0]
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += np.asarray(img, float) / 255 * amp; tot += amp; amp *= 0.5
    return acc / tot

# ---------- hull paint: 1024x1024 = 16 m along the hull x 16 m down from the deck edge (64 px/m), tiles in u
W = H = 1024; PX = 64
base = np.ones((H, W, 3)) * np.array([236, 236, 230])
n = noise(H, W, 180); base *= (0.93 + 0.09 * n)[..., None]
img = Image.fromarray(base.clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(img, "RGBA")
# cap band at the top edge and a navy sheer line
d.rectangle([0, 0, W, int(0.18 * PX)], fill=(205, 205, 200, 255))
d.rectangle([0, int(0.75 * PX), W, int(0.92 * PX)], fill=(28, 38, 70, 255))
# plating seams: strakes every 2.2 m, butts every 4 m (staggered)
for i, y in enumerate(np.arange(1.6, 16, 2.2)):
    yy = int(y * PX); d.line([0, yy, W, yy], fill=(150, 150, 145, 110), width=2); d.line([0, yy + 2, W, yy + 2], fill=(255, 255, 255, 60), width=1)
    off = (i % 2) * 2.0
    for x in np.arange(off, 16, 4.0):
        xx = int(x * PX); d.line([xx, yy, xx, int((y + 2.2) * PX)], fill=(150, 150, 145, 90), width=2)
# rust streaks layer
rust = Image.new("RGBA", (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(rust)
def streak(x, y0, length, wdt, a):
    for k in range(int(length)):
        t = k / length; aa = int(a * (1 - t) ** 1.4 * (0.6 + 0.4 * R.random()))
        xx = x + math.sin(k * 0.05 + x) * 1.5
        for dx in (-W, 0, W):
            rd.line([xx + dx - wdt / 2, y0 + k, xx + dx + wdt / 2, y0 + k], fill=(120, 62, 28, aa))
# portholes: two rows at 2.2 m and 4.6 m below the edge, every 1.6 m
holes = []
for row, y in ((0, 2.2), (1, 4.6)):
    for x in np.arange(0.8 + row * 0.8, 16, 1.6):
        holes.append((x * PX, y * PX))
for (x, y) in holes:
    if R.random() < 0.75: streak(x + R.uniform(-6, 6), y + 14, R.uniform(40, 180), R.uniform(3, 9), R.uniform(70, 160))
for _ in range(40):
    streak(R.uniform(0, W), R.uniform(0, H * 0.8), R.uniform(30, 260), R.uniform(2, 12), R.uniform(40, 120))
rust = rust.filter(ImageFilter.GaussianBlur(2.2)); img.alpha_composite if False else None
img = Image.alpha_composite(img.convert("RGBA"), rust); d = ImageDraw.Draw(img, "RGBA")
r = int(0.23 * PX)
for (x, y) in holes:
    for dx in (-W, 0, W):
        cx = x + dx
        d.ellipse([cx - r - 4, y - r - 4, cx + r + 4, y + r + 4], fill=(175, 172, 165, 255))
        d.ellipse([cx - r - 1, y - r - 1, cx + r + 1, y + r + 1], fill=(110, 105, 98, 255))
        lit = R.random() < 0.35
        d.ellipse([cx - r + 2, y - r + 2, cx + r - 2, y + r - 2], fill=(235, 190, 110, 255) if lit else (22, 30, 34, 255))
        d.ellipse([cx - r + 5, y - r + 4, cx - 2, y - 3], fill=(255, 255, 255, 50))
# grime gradient toward the waterline
g = np.asarray(img, float); yy = np.linspace(0, 1, H)[:, None]
g[..., :3] *= (1 - 0.18 * yy**2)[..., None] * (0.96 + 0.06 * noise(H, W, 60))[..., None]
Image.fromarray(g[..., :3].clip(0, 255).astype(np.uint8)).save(f"{OUT}/hull_paint.jpg", quality=86)

# ---------- name decal: 2048x512 = 24 m x 6 m; ADVENTURE black liner letters, red spray cross-out, SS Fun =) sprayed beside
DW, DH = 2048, 512; PM = DW / 24
dec = Image.new("RGBA", (DW, DH), (0, 0, 0, 0)); dd = ImageDraw.Draw(dec)
f = ImageFont.truetype(FB, 170)
txt = "ADVENTURE"; x = int(0.6 * PM)
for ch in txt:
    dd.text((x, 40), ch, font=f, fill=(14, 14, 16, 255)); x += int(dd.textlength(ch, font=f) + 0.06 * PM)
adv_end = x
def spray(img, pts, w, col=(196, 18, 16), drips=True):
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    sm = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        for k in range(12): t = k / 12; sm.append((x0 + (x1 - x0) * t + R.uniform(-2, 2), y0 + (y1 - y0) * t + R.uniform(-2, 2)))
    sm.append(pts[-1])
    ld.line(sm, fill=col + (255,), width=int(w), joint="curve")
    for (px, py) in sm:
        ld.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=col + (255,))
    if drips:
        for (px, py) in sm[::7]:
            if R.random() < 0.45:
                L = R.uniform(15, 90); ww = R.uniform(2, 5)
                ld.line([px, py, px + R.uniform(-1, 1), py + L], fill=col + (235,), width=int(ww)); ld.ellipse([px - ww, py + L - ww, px + ww, py + L + ww], fill=col + (235,))
    over = lay.filter(ImageFilter.GaussianBlur(w * 0.6)); oa = np.asarray(over).copy(); oa[..., 3] = (oa[..., 3] * 0.45).astype(np.uint8)
    sp = np.asarray(lay).copy(); spk = rng.random(sp.shape[:2]) < 0.012
    res = Image.alpha_composite(Image.fromarray(oa), lay.filter(ImageFilter.GaussianBlur(1.2)))
    img.alpha_composite(res)
# two crude cross-out strokes and a zig-zag through ADVENTURE
spray(dec, [(10, 160), (adv_end * 0.3, 125), (adv_end * 0.62, 150), (adv_end, 100)], 26)
spray(dec, [(30, 70), (adv_end * 0.45, 115), (adv_end * 0.8, 75), (adv_end - 10, 125)], 22)
zz = [(40 + i * (adv_end - 80) / 14, 60 + (i % 2) * 140 + R.uniform(-15, 15)) for i in range(15)]
spray(dec, zz, 14, drips=False)
# "SS Fun =)" sprayed beside it, hand-drawn strokes (bigger, wobbly)
sx = 5.2 * PM; lay = Image.new("RGBA", (DW, DH), (0, 0, 0, 0))
fs = ImageFont.truetype(FS, 175)
cur = sx
for ch in "SS Fun =)":
    if ch == " ": cur += 60; continue
    m = Image.new("L", (260, 300), 0); ImageDraw.Draw(m).text((20, 10), ch, font=fs, fill=255)
    m = m.rotate(R.uniform(-9, 9), resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(2.5))
    ma = (np.asarray(m, float) > 120).astype(np.uint8) * 255
    col = Image.new("RGBA", (260, 300), (205, 20, 18, 255)); col.putalpha(Image.fromarray(ma))
    yoff = int(R.uniform(270, 295)); lay.alpha_composite(col, (int(cur), yoff))
    # drips under each glyph
    ld = ImageDraw.Draw(lay)
    for k in range(R.randint(1, 3)):
        px = cur + R.uniform(40, 140); py = yoff + 200 + R.uniform(-30, 0); L = R.uniform(20, 110)
        ld.line([px, py, px, py + L], fill=(205, 20, 18, 240), width=4); ld.ellipse([px - 4, py + L - 4, px + 4, py + L + 4], fill=(205, 20, 18, 240))
    cur += ImageDraw.Draw(m).textlength(ch, font=fs) + 12
over = lay.filter(ImageFilter.GaussianBlur(7)); oa = np.asarray(over).copy(); oa[..., 3] = (oa[..., 3] * 0.5).astype(np.uint8)
dec.alpha_composite(Image.fromarray(oa)); dec.alpha_composite(lay)
print("decal text ends at m", cur / PM, "adv ends", adv_end / PM)
dec.save(f"{OUT}/hull_name.png")

# ---------- teak deck 1024 = 4 m x 4 m, planks along v (fore-aft), 0.16 m wide, caulked black seams, butt joints
T = 1024; P = T / 4
teak = np.zeros((T, T, 3))
pw = int(0.16 * P)
for i in range(0, T, pw):
    tone = np.array([150, 104, 66]) * R.uniform(0.78, 1.08)
    grain = noise(T, pw, 40, 3, wrapx=False)
    strip = tone[None, None, :] * (0.85 + 0.25 * grain[..., None])
    stretch = np.asarray(Image.fromarray((noise(T // 8, pw, 4, 2, False) * 255).astype(np.uint8)).resize((pw, T)), float) / 255
    strip *= (0.9 + 0.15 * stretch[..., None])
    teak[:, i:i + pw] = strip[:, : min(pw, T - i)]
teak *= (0.75 + 0.3 * noise(T, T, 300))[..., None]   # weathering / spills
ti = Image.fromarray(teak.clip(0, 255).astype(np.uint8)); td = ImageDraw.Draw(ti, "RGBA")
for i in range(0, T, pw):
    td.line([i, 0, i, T], fill=(18, 14, 10, 255), width=3)
    off = R.uniform(0, T)
    for k in range(2):
        yy = int((off + k * T / 2) % T); td.line([i, yy, i + pw, yy], fill=(25, 18, 12, 230), width=3)
        td.ellipse([i + 4, yy - 10, i + 9, yy - 5], fill=(40, 30, 20, 200)); td.ellipse([i + pw - 9, yy - 10, i + pw - 4, yy - 5], fill=(40, 30, 20, 200))
for _ in range(10):   # dark beer/wine stains
    cx, cy, rr = R.uniform(0, T), R.uniform(0, T), R.uniform(30, 120)
    td.ellipse([cx - rr, cy - rr * 0.7, cx + rr, cy + rr * 0.7], fill=(40, 20, 10, 45))
ti.filter(ImageFilter.GaussianBlur(0.6)).save(f"{OUT}/teak.jpg", quality=86)

# ---------- cabin steel 2048x512 = 16 m x 4 m: white panels, seams every 1.6 m, rust runs, grime under the eave, a few tags
CW, CH = 2048, 512; CP = CW / 16
st = np.ones((CH, CW, 3)) * np.array([232, 232, 226]) * (0.92 + 0.1 * noise(CH, CW, 120))[..., None]
yy = np.linspace(0, 1, CH)[:, None]
st *= (1 - 0.12 * (1 - yy) ** 6)[..., None]; st *= (1 - 0.1 * yy ** 3)[..., None]
ci = Image.fromarray(st.clip(0, 255).astype(np.uint8)).convert("RGBA"); cd = ImageDraw.Draw(ci, "RGBA")
for x in np.arange(0, 16, 1.6):
    xx = int(x * CP); cd.line([xx, 0, xx, CH], fill=(160, 160, 155, 120), width=2); cd.line([xx + 2, 0, xx + 2, CH], fill=(255, 255, 255, 70), width=1)
cd.line([0, int(0.35 * CP), CW, int(0.35 * CP)], fill=(165, 165, 160, 110), width=2)
rust = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); rd = ImageDraw.Draw(rust)
W, H = CW, CH
for _ in range(30): streak(R.uniform(0, CW), R.uniform(0, CH * 0.5), R.uniform(30, 250), R.uniform(2, 10), R.uniform(40, 130))
ci = Image.alpha_composite(ci, rust.filter(ImageFilter.GaussianBlur(2)))
tags = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); tg = ImageDraw.Draw(tags)
ft = ImageFont.truetype(FS, 120)
for (txt, x, y, col, rot) in (("=)", 2.3, 1.3, (205, 20, 18), 8), ("FUN", 9.4, 1.6, (40, 120, 200), -6), ("PARTY", 13.2, 1.9, (230, 60, 160), 5)):
    m = Image.new("L", (700, 260), 0); ImageDraw.Draw(m).text((20, 20), txt, font=ft, fill=255)
    m = m.rotate(rot, resample=Image.BICUBIC, expand=False).filter(ImageFilter.GaussianBlur(2))
    a = (np.asarray(m) > 110).astype(np.uint8) * 230
    c = Image.new("RGBA", m.size, col + (255,)); c.putalpha(Image.fromarray(a))
    tags.alpha_composite(c, (int(x * CP), int(y * CP)))
o = np.asarray(tags.filter(ImageFilter.GaussianBlur(6))).copy(); o[..., 3] = (o[..., 3] * 0.4).astype(np.uint8)
ci.alpha_composite(Image.fromarray(o)); ci.alpha_composite(tags)
ci.convert("RGB").save(f"{OUT}/cabin_steel.jpg", quality=85)

# ---------- smashed glass 512 RGBA: dark tinted pane with a hole and radial cracks
G = 512; gl = Image.new("RGBA", (G, G), (30, 42, 48, 235)); gd = ImageDraw.Draw(gl)
cx, cy = G * 0.45, G * 0.55
hole = [(cx + math.cos(a) * (60 + R.uniform(0, 70)), cy + math.sin(a) * (60 + R.uniform(0, 70))) for a in np.linspace(0, 6.28, 14)]
gd.polygon(hole, fill=(0, 0, 0, 0))
for a in np.linspace(0, 6.28, 17):
    pts = [(cx, cy)]; rr = 0
    while rr < G:
        rr += R.uniform(30, 70); aa = a + R.uniform(-0.15, 0.15); pts.append((cx + math.cos(aa) * rr, cy + math.sin(aa) * rr))
    gd.line(pts, fill=(200, 215, 220, 200), width=2)
for k in (90, 170, 260):
    ring = [(cx + math.cos(a) * k * R.uniform(0.9, 1.1), cy + math.sin(a) * k * R.uniform(0.9, 1.1)) for a in np.linspace(0, 6.28, 19)]
    gd.line(ring, fill=(190, 205, 210, 150), width=1)
gd.polygon(hole, fill=(0, 0, 0, 0))
gl.save(f"{OUT}/glass_smashed.png")

# ---------- interior spray wall 1024x512 RGBA (tags over a room wall)
sw = Image.new("RGBA", (1024, 512), (0, 0, 0, 0))
for (txt, x, y, col, rot, sz) in (("PARTY", 60, 60, (220, 30, 30), 6, 150), ("4EVER", 420, 240, (40, 200, 90), -8, 120), (":)", 780, 40, (250, 200, 30), 0, 200), ("FUN", 120, 300, (60, 120, 230), -3, 140)):
    m = Image.new("L", (900, 300), 0); ImageDraw.Draw(m).text((10, 10), txt, font=ImageFont.truetype(FS, sz), fill=255)
    m = m.rotate(rot, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(2)); a = (np.asarray(m) > 110).astype(np.uint8) * 240
    c = Image.new("RGBA", m.size, col + (255,)); c.putalpha(Image.fromarray(a)); sw.alpha_composite(c, (x, y))
o = np.asarray(sw.filter(ImageFilter.GaussianBlur(7))).copy(); o[..., 3] = (o[..., 3] * 0.45).astype(np.uint8)
sw2 = Image.new("RGBA", sw.size, (0, 0, 0, 0)); sw2.alpha_composite(Image.fromarray(o)); sw2.alpha_composite(sw)
spray(sw2, [(500, 470), (620, 380), (760, 460), (900, 360)], 18)
sw2.save(f"{OUT}/room_spray.png")

# ---------- pizza box lid 256
pz = Image.new("RGB", (256, 256), (196, 160, 112)); pd = ImageDraw.Draw(pz)
pd.ellipse([48, 48, 208, 208], outline=(180, 30, 25), width=10); pd.text((70, 110), "PIZZA", font=ImageFont.truetype(FS, 34), fill=(180, 30, 25))
pd.ellipse([150, 160, 230, 230], fill=(150, 110, 60))
pz.save(f"{OUT}/pizza.jpg", quality=85)
print("ok")
