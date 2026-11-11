# The face pictures at 4x with clean edges: the 275 px GPT cutouts carry ragged alpha (lash flecks over the eyes, a stair-stepped
# muzzle hem) that a 0.5 alpha cutoff turns into jagged rims in game. Alpha: bicubic up, soft blur, thin flecks opened away,
# re-thresholded to one smooth contour; colour: Lanczos up and bled outward so no fringe shows at the cut.
# run: python3 art/critter-cute/face_clean.py  (reads /workspace/tripo-cat/faces/*.png, writes faces/clean/*.png)
import os, glob
from PIL import Image, ImageFilter, ImageChops
SRC = "/workspace/tripo-cat/faces"; DST = SRC + "/clean"; os.makedirs(DST, exist_ok=True); K = 4
for p in sorted(glob.glob(SRC + "/*.png")):
    im = Image.open(p).convert("RGBA"); w, h = im.size; W, H = w * K, h * K
    a = im.getchannel("A").resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(K * 0.9))
    a = a.point(lambda v: 255 if v >= 128 else 0)
    a = a.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))      # opening: flecks under ~2 source px go
    a = a.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))      # closing: pinholes along the rim fill
    a = a.filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: 255 if v >= 128 else 0)
    # colour: premultiplied up, divided back, then bled into the cut so edge texels never pull in transparent black
    rgb = im.convert("RGB"); src_a = im.getchannel("A")
    pre = ImageChops.multiply(rgb, Image.merge("RGB", [src_a] * 3)).resize((W, H), Image.LANCZOS)
    sa = src_a.resize((W, H), Image.LANCZOS)
    px, pa = pre.load(), sa.load(); out = Image.new("RGB", (W, H)); po = out.load()
    for y in range(H):
        for x in range(W):
            av = pa[x, y]
            if av > 8: r, g, b = px[x, y]; po[x, y] = (min(255, r * 255 // av), min(255, g * 255 // av), min(255, b * 255 // av))
    for _ in range(6):   # bleed
        grow = out.filter(ImageFilter.MaxFilter(3)); mask = sa.point(lambda v: 255 if v > 8 else 0)
        out = Image.composite(out, grow, mask); sa = mask.filter(ImageFilter.MaxFilter(3))
    res = out.convert("RGBA"); res.putalpha(a); res.save(DST + "/" + os.path.basename(p)); print("clean", os.path.basename(p), res.size)
