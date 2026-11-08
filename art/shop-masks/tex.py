# textures for the two shop masks: left half = the face side (print over the cloth), right half = plain cloth for sides/back
import numpy as np, random
from PIL import Image, ImageFilter
S = "/workspace/shop/"
OUT = "/workspace/shop/"
rng = np.random.default_rng(7)
def noise(h, w, scale, amp):
    small = rng.normal(0, 1, (max(2, h // scale), max(2, w // scale)))
    im = Image.fromarray(((small - small.min()) / (np.ptp(small) + 1e-6) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return (np.asarray(im, np.float32) / 255 - 0.5) * amp
def cloth(h, w, base):
    n = noise(h, w, 64, 0.16) + noise(h, w, 16, 0.08) + noise(h, w, 3, 0.07)
    weave = (np.sin(np.arange(w)[None, :] * 1.9) * np.sin(np.arange(h)[:, None] * 1.9)) * 0.025
    a = np.ones((h, w, 3), np.float32) * np.array(base, np.float32)[None, None] / 255
    return np.clip(a * (1 + n[..., None] + weave[..., None]), 0, 1)
def over(dst, src, x0, y0, w, h):
    s = src.convert("RGBA").resize((w, h), Image.LANCZOS)
    s = np.asarray(s, np.float32) / 255
    a = s[..., 3:4]
    dst[y0:y0 + h, x0:x0 + w] = dst[y0:y0 + h, x0:x0 + w] * (1 - a) + s[..., :3] * a
# bag: tan paper-cloth, the red dripping smiley on the front
H = 1024
bag = np.concatenate([cloth(H, 1024, (196, 164, 104)), cloth(H, 1024, (190, 158, 100))], 1)
smile = Image.open(S + "value.b7652a767b44728f013f67d62067f01ff29e190eebcbb6d97a0245474eecf35d.png")
over(bag, smile, 150, 170, 724, 724)
dirt = noise(H, 2048, 128, 0.25)[..., None]
bag = np.clip(bag * (1 - np.clip(dirt, 0, 1) * 0.5), 0, 1)
Image.fromarray((bag * 255).astype(np.uint8)).save(OUT + "mask-bag.png")
# pooper: two navy tones split by a thin dull-red line, the face (eyes with a glint, small frown; the purple x's left off)
pp = np.zeros((H, 2048, 3), np.float32)
top, bot, line = np.array((58, 56, 120)) / 255, np.array((76, 88, 160)) / 255, np.array((120, 72, 96)) / 255
split = int(H * 0.50)
pp[:split] = top; pp[split:] = bot; pp[split - 5:split + 5] = line
pp = np.clip(pp * (1 + noise(H, 2048, 96, 0.08)[..., None] + noise(H, 2048, 4, 0.03)[..., None]), 0, 1)
face = np.asarray(Image.open(S + "value.f3ad0803396844a6d0d054965edeaadb21929d53b47a09dcd74d9592e476b3c1.png").convert("RGBA")).copy()
r, g, b, a = [face[..., i].astype(int) for i in range(4)]
purple = (b > 90) & (b - g > 35) & (r > 45) & (r < 190)
face[..., 3][purple] = 0
fim = Image.fromarray(face).filter(ImageFilter.MinFilter(1))
fim = fim.crop((180, 200, 880, 820))
over(pp, fim, 170, 230, 700, 620)
Image.fromarray((pp * 255).astype(np.uint8)).save(OUT + "mask-pooper.png")
print("ok")
