# tile textures for the l325 tower kit, cut from the Tripo atlases; run by build.py
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = sys.argv[1]
def crop(n, x0, y0, x1, y1, s):
    im = Image.open(f"{D}/atlas_{n}.png").convert("RGB"); W, H = im.size
    return im.crop((int(x0*W), int(y0*H), int(x1*W), int(y1*H))).resize((s, s), Image.LANCZOS)
def mirror(im):
    s = im.size[0]; o = Image.new("RGB", (2*s, 2*s))
    o.paste(im, (0, 0)); o.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (s, 0))
    o.paste(im.transpose(Image.FLIP_TOP_BOTTOM), (0, s)); o.paste(im.transpose(Image.ROTATE_180), (s, s)); return o
c = mirror(crop("slabedge", 0.03, 0.42, 0.24, 0.92, 256)); d = ImageDraw.Draw(c)
for k in (0, 256):
    d.line([(k, 0), (k, 511)], fill=(96, 96, 94), width=2); d.line([(0, k), (511, k)], fill=(96, 96, 94), width=2)
    d.line([(k+2, 0), (k+2, 511)], fill=(176, 176, 172), width=1); d.line([(0, k+2), (511, k+2)], fill=(176, 176, 172), width=1)
for px in (64, 192, 320, 448):
    for py in (64, 192, 320, 448):
        d.ellipse([px-6, py-6, px+6, py+6], fill=(150, 150, 146)); d.ellipse([px-3, py-3, px+3, py+3], fill=(52, 50, 48))
        d.line([(px, py+4), (px+1, py+26)], fill=(120, 112, 100), width=1)
c.save(f"{D}/t_concrete.jpg", quality=90)
mirror(crop("pilecap", 0.05, 0.35, 0.40, 0.80, 128)).save(f"{D}/t_rebar.jpg", quality=90)
mirror(crop("slabedge", 0.045, 0.09, 0.185, 0.27, 128)).filter(ImageFilter.SMOOTH).save(f"{D}/t_plywood.jpg", quality=90)
rng = np.random.default_rng(3); x = np.arange(256)
rib = 0.72 + 0.28*np.sin(x/256*2*np.pi*8); a = np.outer(np.ones(256), rib)[..., None]*np.array([52, 118, 96.])
a *= (0.92 + 0.08*rng.random((256, 1, 1))); a[232:] *= np.linspace(1, 0.72, 24)[:, None, None]
Image.fromarray(a.clip(0, 255).astype("uint8")).save(f"{D}/t_steel.jpg", quality=90)
a = np.full((64, 64, 3), (196, 96, 40.)) * (0.9 + 0.1*rng.random((64, 64, 1)))
Image.fromarray(a.astype("uint8")).save(f"{D}/t_rubber.jpg", quality=90)
p = Image.new("RGB", (512, 512), (232, 228, 214)); d = ImageDraw.Draw(p)
d.rectangle([0, 0, 511, 127], fill=(236, 196, 28))
for k in range(-128, 640, 64): d.polygon([(k, 0), (k+32, 0), (k+32+128, 127), (k+128, 127)], fill=(26, 24, 22))
F = lambda s: ImageFont.truetype("DejaVuSans-Bold.ttf", s)
d.rectangle([0, 256, 255, 511], fill=(238, 236, 226)); d.rectangle([6, 262, 249, 322], fill=(196, 34, 30))
d.text((128, 292), "DANGER", font=F(40), fill="white", anchor="mm")
for i, (t, s) in enumerate((("CONSTRUCTION SITE", 20), ("HARD HATS", 22), ("MUST BE WORN", 22), ("NO UNAUTHORISED", 20), ("ENTRY", 22))):
    d.text((128, 346 + i*30), t, font=F(s), fill=(24, 24, 28), anchor="mm")
d.rectangle([6, 262, 249, 505], outline=(24, 24, 28), width=3)
p.save(f"{D}/t_paint.jpg", quality=92)
