# The scalp cap's root texture (Shelly: "this is ugly fix hairs", Nov 9): the pack's own strand picture (Image_8, its dense straight tile),
# mirrored into a seamless band, brightened so the slot tint carries the colour; alpha: solid on the crown, breaking into single strands
# over the last fifth (v = 1 is the hairline) so the cap's edge reads as roots, never a line. python3 art/human-hair/captex.py <Image_8.png> <out.png>
import sys, numpy as np
from PIL import Image, ImageFilter
src = Image.open(sys.argv[1]).convert("RGBA")
crop = src.crop((40, 70, 108, 300)).resize((128, 512), Image.LANCZOS)
g = np.array(crop).astype(np.float32)
lum = g[..., :3].mean(-1) / 255.0; a = g[..., 3] / 255.0
lum = np.where(a > 0.2, lum, lum.mean())                      # strand gaps take the mean, no holes
band = np.concatenate([lum, lum[:, ::-1]], 1)                   # mirrored: seamless across u
band = 0.62 + 0.38 * (band - band.min()) / (band.max() - band.min() + 1e-6)
H, W = band.shape
rng = np.random.default_rng(7)
col = rng.random(W)                                             # each column a strand that reaches its own length
col = np.convolve(np.concatenate([col[-2:], col, col[:2]]), np.ones(3) / 3, "same")[2:-2]
v = np.linspace(0, 1, H)[:, None]
reach = 0.80 + 0.20 * col[None, :] ** 0.8                       # where each strand's root stops
alpha = np.clip((reach - v) / 0.025 + 0.5, 0, 1)                # a 1 cm-ish ragged fade, strand by strand
shade = 1.0 - 0.18 * np.clip((v - 0.75) / 0.25, 0, 1)            # roots a touch darker at the edge
rgb = np.clip(band * shade * 255, 0, 255).astype(np.uint8)
out = np.dstack([rgb, rgb, rgb, (alpha * 255).astype(np.uint8)])
Image.fromarray(out, "RGBA").save(sys.argv[2])
print("captex", W, H)
