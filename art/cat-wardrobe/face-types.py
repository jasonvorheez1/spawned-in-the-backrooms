# Eye types and mouth types for the new cat (Shelly #219897 "model/texture new eye types and mouth types too").
# Source art: GPT-painted variants in /workspace/faces9 (<sex>-eye-<type>.png, <sex>-mouth-<type>.png, drawn over the old neutral on green).
# Each is laid over the CURRENT neutral face (critter-faces.yml), so later fixes to the neutral (centred boy irises) carry through:
#   eye type  -> a whole face picture: the neutral with its eyes swapped (old eye ink cleared with a dilated mask so no ghost outlines stay)
#   mouth type -> a layer: transparent everywhere but the mouth box, which the face shader lays over whichever face picture is showing.
import sys, subprocess, numpy as np, yaml
from PIL import Image
from scipy import ndimage as nd
SRC = "/workspace/faces9"; OUT = "/workspace/facetypes"; W, H = 1100, 988
Y = yaml.safe_load(open("scripts/lib/data/critter-faces.yml"))
def rgba(p): return np.asarray(Image.open(p).convert("RGBA").resize((W, H), Image.LANCZOS)).astype(np.int32)
def cls(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 170) & (r < 120) & (b < 120)
    art = (a[..., :3].max(-1) < 110) | (a[..., :3].min(-1) > 225) | ((b > 110) & (r < 90) & (g < 100))
    pink = (r > 200) & (g < 170) & (b > 120) & (r - g > 50)
    return green, art & ~green, pink
yy, xx = np.mgrid[0:H, 0:W]
nose = ((xx - 555) / 85.0) ** 2 + ((yy - 625) / 62.0) ** 2 < 1
eyeZone = (yy >= 200) & (yy <= 660) & ~nose
mouthBox = (yy >= 630) & (yy <= 835) & (xx >= 340) & (xx <= 760) & ~nose
out = {"eyes": {}, "mouths": {}}
for sex, key in (("f", "female"), ("m", "male")):
    src = f"{OUT}/{sex}-neutral.png"
    subprocess.run(["spawn", "fetch", Y["faces"][key]["neutral"], src], capture_output=True)
    base = rgba(src); ba = base[..., 3] > 128
    bart = ba & ((base[..., :3].max(-1) < 110) | (base[..., :3].min(-1) > 225) | ((base[..., 2] - np.maximum(base[..., 0], base[..., 1])) > 40))
    cream = ba & ~bart & (base[..., 0] > 180)
    cc = np.median(base[cream][:, :3], 0).astype(np.int32)
    muzzle = nd.binary_fill_holes(nd.binary_closing(cream | (ba & (yy > 600)), np.ones((9, 9))))
    for kind in ("eye", "mouth"):
        for t in ("sparkle", "sleepy", "slit", "sharp", "bean") if kind == "eye" else ("fang", "grin", "smirk", "open", "line"):
            v = rgba(f"{SRC}/{sex}-{kind}-{t}.png"); vg, vart, vpink = cls(v)
            res = base.copy()
            vv = v.copy(); vv[..., 1] = np.minimum(vv[..., 1], np.maximum(vv[..., 0], vv[..., 2]))   # despill the green the art was painted on
            if kind == "eye":
                take = eyeZone & vart & ~nose & ~(muzzle & ~nd.binary_dilation(bart, iterations=2) & (yy > 640))
                # above the muzzle the old face is only eye ink on clear fur: clear it all; on the muzzle, old ink becomes cream
                res[eyeZone & ~muzzle, 3] = 0
                old = eyeZone & muzzle & nd.binary_dilation(bart, iterations=4) & ~nose
                res[old, :3] = cc
                res[take, :3] = vv[take, :3]; res[take, 3] = 255
            else:
                noseInk = nd.binary_dilation(bart & (yy > 520) & (yy < 720) & (xx > 430) & (xx < 680) & nd.binary_opening(bart, np.ones((15, 15))), iterations=5)
                take = mouthBox & (vart | vpink) & ~noseInk
                res[mouthBox & ~noseInk, :3] = cc
                res[take, :3] = vv[take, :3]
                edge = nd.gaussian_filter(mouthBox.astype(float), 8)
                res[..., 3] = np.where(mouthBox & ~noseInk, np.clip(edge * 2 - 0.5, 0, 1) * 255, 0)
                res[take, 3] = 255
            img = Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), "RGBA").resize((550, 494), Image.LANCZOS)
            p = f"{OUT}/{sex}-{kind}-{t}.png"; img.save(p)
            url = subprocess.run(["spawn", "upload", p, "--name", f"cat-{kind}-{t}-{sex}"], capture_output=True, text=True).stdout
            u = next((w for w in url.split() if w.startswith("/cdn/value.")), None)
            out["eyes" if kind == "eye" else "mouths"].setdefault(key, {})[t] = u
            print(sex, kind, t, u, flush=True)
yaml.safe_dump(out, open(f"{OUT}/types.yml", "w"), sort_keys=False)
