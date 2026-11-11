# Mouth types for the new cat, drawn as clean ink over each sex's current neutral mouth spot (Shelly #219897).
# The painted mouth variants lost their lines on the green; these are drawn in code at the neutral ":3"'s own place and stroke weight.
# Each output is a layer: transparent but for a feathered cream patch that covers the old ":3" and the new mouth on it.
import subprocess, yaml, numpy as np
from PIL import Image, ImageDraw, ImageFilter
OUT = "/workspace/facetypes"; W, H = 1100, 988; S = 2  # draw at 2x
SPOT = {"f": dict(cx=555, cy=729, w=203, sw=11), "m": dict(cx=550, cy=710, w=217, sw=14)}
def layer(sx, kind):
    base = np.asarray(Image.open(f"{OUT}/{sx}-neutral.png").convert("RGBA").resize((W, H)))
    p = SPOT[sx]; cx, cy, w, sw = p["cx"] * S, p["cy"] * S, p["w"] * S, p["sw"] * S
    patch = base[p["cy"] - 70:p["cy"] + 70, p["cx"] - 160:p["cx"] + 160]
    m = (patch[..., 3] > 200) & (patch[..., :3].min(-1) > 150)
    cream = tuple(int(v) for v in np.median(patch[m][:, :3], 0)) + (255,)
    img = Image.new("RGBA", (W * S, H * S), cream[:3] + (0,)); d = ImageDraw.Draw(img)  # cream under alpha 0: no dark fringe at the feather
    # the cover: an ellipse of the muzzle's cream over the old mouth, feathered later
    cov = Image.new("L", img.size, 0); ImageDraw.Draw(cov).ellipse([cx - w * .62, cy - 46 * S, cx + w * .62, cy + 58 * S], fill=255)
    cov = cov.filter(ImageFilter.GaussianBlur(9 * S))
    img.putalpha(cov)
    ink = (22, 16, 14, 255); pink = (226, 112, 128, 255); dark = (92, 30, 36, 255); white = (252, 250, 246, 255)
    hw = w / 2
    def arc(x0, x1, y, depth, width=sw):
        pts = [(x0 + (x1 - x0) * t, y + depth * 4 * t * (1 - t)) for t in np.linspace(0, 1, 40)]
        d.line(pts, fill=ink, width=int(width), joint="curve")
        for q in (pts[0], pts[-1]): d.ellipse([q[0] - width / 2, q[1] - width / 2, q[0] + width / 2, q[1] + width / 2], fill=ink)
    if kind == "fang":      # the :3 with one little fang under its right lobe
        arc(cx - hw * .7, cx, cy - 6 * S, 26 * S); arc(cx, cx + hw * .7, cy - 6 * S, 26 * S)
        fx = cx + hw * .33; fy = cy + 12 * S
        d.polygon([(fx - 11 * S, fy), (fx + 11 * S, fy), (fx + 1 * S, fy + 24 * S)], fill=white, outline=ink, width=int(sw * .55))
    elif kind == "grin":    # wide toothy grin: a D of teeth with a dark lip line
        top = cy - 12 * S; pts = [(cx + hw * .8 * np.cos(t), top + 46 * S * np.sin(t)) for t in np.linspace(0, np.pi, 40)]
        d.polygon(pts, fill=white, outline=ink, width=int(sw))
        for k in range(-3, 4):
            x = cx + k * hw * .19; d.line([(x, top + 2 * S), (x, top + 18 * S)], fill=ink, width=int(sw * .45))
        d.line([(cx - hw * .8, top), (cx + hw * .8, top)], fill=ink, width=int(sw))
    elif kind == "smirk":   # a one-sided curl up to the cat's left
        pts = [(cx - hw * .55 + hw * 1.2 * t, cy + 6 * S - 30 * S * t * t + 10 * S * np.sin(t * np.pi)) for t in np.linspace(0, 1, 40)]
        d.line(pts, fill=ink, width=int(sw), joint="curve")
        for q in (pts[0], pts[-1]): d.ellipse([q[0] - sw / 2, q[1] - sw / 2, q[0] + sw / 2, q[1] + sw / 2], fill=ink)
    elif kind == "open":    # open happy mouth, dark inside, pink tongue
        top = cy - 14 * S; pts = [(cx + hw * .5 * np.cos(t), top + 52 * S * np.sin(t)) for t in np.linspace(0, np.pi, 40)]
        d.polygon(pts, fill=dark)
        d.ellipse([cx - hw * .3, top + 22 * S, cx + hw * .3, top + 62 * S], fill=pink)
        msk = Image.new("L", img.size, 0); ImageDraw.Draw(msk).polygon(pts, fill=255)
        clip = Image.new("RGBA", img.size, (0, 0, 0, 0)); clip.paste(img, (0, 0), msk)
        cut = Image.new("L", img.size, 0); ImageDraw.Draw(cut).rectangle([cx - hw, top + 52 * S, cx + hw, top + 120 * S], fill=255)
        img.paste(Image.new("RGBA", img.size, cream), (0, 0), Image.fromarray(np.minimum(np.asarray(cut), np.asarray(cov))))
        img.alpha_composite(clip); d = ImageDraw.Draw(img)
        d.line(pts + [pts[0]], fill=ink, width=int(sw), joint="curve")
    elif kind == "line":    # flat, unimpressed
        arc(cx - hw * .45, cx + hw * .45, cy, 3 * S)
    return img.resize((550, 494), Image.LANCZOS)
out = yaml.safe_load(open(f"{OUT}/types.yml")) or {}
out["mouths"] = {}
for sx, key in (("f", "female"), ("m", "male")):
    for t in ("fang", "grin", "smirk", "open", "line"):
        pth = f"{OUT}/{sx}-mouth-{t}.png"; layer(sx, t).save(pth)
        r = subprocess.run(["spawn", "upload", pth, "--name", f"cat-mouth-{t}-{sx}"], capture_output=True, text=True).stdout
        out["mouths"].setdefault(key, {})[t] = next((w for w in r.split() if w.startswith("/cdn/value.")), None)
        print(sx, t, out["mouths"][key][t], flush=True)
yaml.safe_dump(out, open(f"{OUT}/types.yml", "w"), sort_keys=False)
