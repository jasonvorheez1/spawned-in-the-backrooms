# Bakes an iris into each painted cat face (Shelly: "now eye color"). Inside each big dark eye disc: a black pupil stays black,
# the ring around it is written as pure blue whose value is the iris shading (dark under the lid, bright at the bottom, a dark limbal rim).
# mat-catskin.js reads blue above max(r,g) as "iris amount" and paints look.eyes there, so every expression takes any eye colour.
import sys, yaml, subprocess, numpy as np
from PIL import Image
from scipy import ndimage as nd
Y = yaml.safe_load(open("scripts/lib/data/critter-faces.yml"))
out = {}
for sex, faces in Y["faces"].items():
    for ex, url in faces.items():
        src = f"/workspace/catface-iris/{sex}-{ex}-src.png"
        subprocess.run(["spawn", "fetch", url, src], capture_output=True)
        im = np.asarray(Image.open(src).convert("RGBA")).astype(float) / 255
        H, W = im.shape[:2]; rgb, a = im[..., :3], im[..., 3]
        lum = rgb.mean(-1); dark = (lum < 0.22) & (a > 0.5)
        filled = nd.binary_fill_holes(dark)
        k = max(2, int(W * 0.03)); disc = nd.binary_opening(filled, structure=np.ones((k, k)))
        lab, n = nd.label(disc); res = im.copy(); count = 0
        for i in range(1, n + 1):
            m = lab == i; ys, xs = np.nonzero(m)
            if m.sum() < W * H * 0.012 or ys.mean() > H * 0.62: continue
            cy, cx = ys.mean(), xs.mean(); ry, rx = (ys.max() - ys.min()) / 2, (xs.max() - xs.min()) / 2
            yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2)
            iris = m & dark & (d > 0.42)            # pupil (d < 0.42) stays solid black; highlight stays white
            t = np.clip((yy - (cy - ry)) / (2 * ry), 0, 1)
            shade = 0.38 + 0.62 * t ** 1.3          # dark under the lid, glowing at the bottom
            shade = shade * np.where(d > 0.86, 0.45, 1.0)   # limbal rim
            soft = np.clip((d - 0.42) / 0.06, 0, 1)
            v = shade * soft
            res[..., 0] = np.where(iris, 0, res[..., 0]); res[..., 1] = np.where(iris, 0, res[..., 1])
            res[..., 2] = np.where(iris, v, res[..., 2]); count += 1
        dst = f"/workspace/catface-iris/{sex}-{ex}.png"
        Image.fromarray((res * 255).astype(np.uint8), "RGBA").save(dst)
        print("IRIS", sex, ex, count)
