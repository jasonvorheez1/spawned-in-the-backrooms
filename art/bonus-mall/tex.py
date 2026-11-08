# The Bonus Room mall shell textures (seamless, painted in code). python3 art/bonus-mall/tex.py
import numpy as np, random
from PIL import Image, ImageDraw, ImageFilter
OUT = "/workspace/bonus-mall/tex/"
rng = np.random.default_rng(7); random.seed(7)
def hexc(h): h = h.lstrip("#"); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float)
def noise(n, amp, blur=1.5):
    a = Image.fromarray((rng.random((n, n)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    return (np.asarray(a, float) / 255 - 0.5) * 2 * amp
def save(a, name): Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(OUT + name)

def tiles(n, cells, colors_fn, grout, gw, jitter=6, wear=0.0, aspect=1):
    a = np.zeros((n, n, 3)); cw = n // cells; ch = cw // aspect
    for j in range(n // ch):
        for i in range(cells):
            c = colors_fn(i, j) + rng.normal(0, jitter, 3)
            a[j*ch:(j+1)*ch, i*cw:(i+1)*cw] = c
    a += noise(n, 4, 0.8)[..., None]
    g = np.zeros((n, n), bool)
    for k in range(0, n, cw): g[:, k:k+gw] = True; g[:, (k - gw) % n:(k - gw) % n + 1] = True
    for k in range(0, n, ch): g[k:k+gw, :] = True
    a[g] = grout
    if wear:
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(im, "RGBA")
        for _ in range(int(40 * wear)):   # scuffs: thin grey drags, heel marks
            x, y = random.randrange(n), random.randrange(n); L = random.randrange(20, 90); ang = random.random() * 6.28
            d.line([x, y, x + L * np.cos(ang), y + L * np.sin(ang)], fill=(70, 60, 70, random.randrange(18, 45)), width=random.choice([1, 2, 3]))
        for _ in range(int(25 * wear)):
            x, y = random.randrange(n), random.randrange(n); r = random.randrange(2, 6)
            d.ellipse([x-r, y-r, x+r, y+r], fill=(60, 50, 60, 40))
        a = np.asarray(im, float)
    return a

# 1. mall checker: white and pink, a purple or periwinkle tile among the pinks; 8 x 8 tiles of 0.6 m = 4.8 m
W, P, PU, BL = hexc("f7eef4"), hexc("f2a3cd"), hexc("a77be0"), hexc("8d98dd")
pick = {}
def mall(i, j):
    if (i + j) % 2 == 0: return W
    r = random.random(); return PU if r < 0.2 else BL if r < 0.3 else P
save(tiles(1024, 8, mall, hexc("6c5d6b"), 3, 5, wear=1.0), "checker.png")
# 2. diner black and white, 4 x 4 tiles of 0.3 m
save(tiles(512, 4, lambda i, j: hexc("f4f1ec") if (i + j) % 2 == 0 else hexc("1d1b20"), hexc("55525a"), 2, 4, wear=0.8), "diner.png")
# 3. plaster: off white, soft trowel noise
a = np.ones((512, 512, 3)) * hexc("f5f1f3") + (noise(512, 6, 3) + noise(512, 3, 0.7))[..., None]; save(a, "plaster.png")
# 4. blue mosaic: 16 x 16 chips of 5 cm = 0.8 m, dark grout
blues = [hexc(h) for h in ("5f6fd6", "7d8ae0", "4b58c4", "9aa4ea", "6a62cf", "3f4fb8")]
save(tiles(512, 16, lambda i, j: hexc("e9ecf8") if random.random() < 0.1 else random.choice(blues), hexc("2a2a40"), 2, 9), "mosaic.png")
# 5. metro subway tile: 2:1 white bricks, 8 across 1.2 m
def metro():
    n = 512; cw = 64; ch = 32; a = np.zeros((n, n, 3))
    for j in range(n // ch):
        off = (cw // 2) * (j % 2)
        for i in range(-1, n // cw + 1):
            x0 = i * cw + off; c = hexc("eef0ec") + rng.normal(0, 5, 3)
            xs = np.clip([x0, x0 + cw], 0, n); a[j*ch:(j+1)*ch, xs[0]:xs[1]] = c
            # bevel: lighter top, darker bottom
            a[j*ch:j*ch+3, xs[0]:xs[1]] += 10; a[(j+1)*ch-4:(j+1)*ch, xs[0]:xs[1]] -= 18
        a[j*ch:j*ch+2, :] = hexc("8b8d8a")
        for i in range(-1, n // cw + 1):
            x = i * cw + off
            if 0 <= x < n: a[j*ch:(j+1)*ch, x:x+2] = hexc("8b8d8a")
    a += noise(n, 5, 2)[..., None]; return a
save(metro(), "metro.png")
# 6. platform: warm beige quarry tile, 4 x 4 of 0.5 m = 2 m
save(tiles(512, 4, lambda i, j: hexc("c9b38f") + rng.normal(0, 8, 3), hexc("5d5143"), 3, 6, wear=1.2), "platform.png")
# 7. shutter: rolled steel slats, 16 per 2 m
def shutter():
    n = 512; a = np.zeros((n, n, 3)); y = np.arange(n) % 32
    prof = 150 + 55 * np.sin(y / 32 * np.pi) - 40 * (y < 3)
    a[:] = prof[:, None, None] * np.array([1.0, 1.0, 1.04])
    a += noise(n, 8, 1)[..., None]
    for _ in range(30):   # grime streaks running down
        x = random.randrange(n); w = random.randrange(2, 8); a[:, x:x+w] -= random.randrange(6, 18)
    return a
save(shutter(), "shutter.png")
# 8. escalator step: aluminium cleats running along travel
def steps():
    n = 256; a = np.zeros((n, n, 3)); x = np.arange(n) % 16
    a[:] = (np.where(x < 9, 185, 95))[None, :, None]; a += noise(n, 6, 1)[..., None]; return a
save(steps(), "steps.png")
# 9. ballast gravel
def gravel():
    n = 256; im = Image.new("RGB", (n, n), (52, 48, 46)); d = ImageDraw.Draw(im)
    for _ in range(2200):
        x, y = random.randrange(n), random.randrange(n); r = random.randrange(2, 6); g = random.randrange(55, 125)
        for dx in (-n, 0, n):
            for dy in (-n, 0, n): d.ellipse([x+dx-r, y+dy-r, x+dx+r, y+dy+r], fill=(g, g - 4, g - 8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(0.6)), float)
save(gravel(), "gravel.png")
# 10. terrazzo for the art gallery floor
def terrazzo():
    n = 512; base = np.ones((n, n, 3)) * hexc("ebe6ea") + noise(n, 4, 2)[..., None]
    im = Image.fromarray(base.astype(np.uint8)); d = ImageDraw.Draw(im)
    cols = [(230, 150, 190), (150, 160, 220), (90, 90, 100), (250, 250, 250), (180, 140, 210)]
    for _ in range(1400):
        x, y = random.randrange(n), random.randrange(n); r = random.randrange(1, 5); c = random.choice(cols)
        for dx in (-n, 0, n):
            for dy in (-n, 0, n): d.polygon([(x+dx+r*np.cos(t), y+dy+r*np.sin(t)) for t in np.linspace(0, 6.28, 5)[:-1] + random.random()], fill=c)
    return np.asarray(im, float)
save(terrazzo(), "terrazzo.png")
print("ok")
