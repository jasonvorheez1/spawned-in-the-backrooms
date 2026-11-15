# Level 178 kit textures, painted with numpy (tileable). python3 art/kyoto/tex.py -> /workspace/kyoto/tex/*.jpg
import numpy as np, os
from PIL import Image
N = 512; OUT = "/workspace/kyoto/tex"; rng = np.random.default_rng(178)
def tn(fx, fy, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    g = r.random((fy, fx))
    y = np.arange(N) * fy / N; x = np.arange(N) * fx / N
    y0 = y.astype(int); x0 = x.astype(int); ty = y - y0; tx = x - x0
    ty = ty * ty * (3 - 2 * ty); tx = tx * tx * (3 - 2 * tx)
    a = g[y0 % fy][:, x0 % fx]; b = g[y0 % fy][:, (x0 + 1) % fx]; c = g[(y0 + 1) % fy][:, x0 % fx]; d = g[(y0 + 1) % fy][:, (x0 + 1) % fx]
    return (a * (1 - tx) + b * tx) * (1 - ty[:, None]) + (c * (1 - tx) + d * tx) * ty[:, None]
def fbm(fx, fy, o=4):
    return sum(tn(fx * 2 ** i, fy * 2 ** i) / 2 ** i for i in range(o)) / (2 - 2 ** (1 - o))
def save(name, rgb):
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/{name}.jpg", quality=88)
def col(v, a, b):
    a = np.array(a); b = np.array(b); return a + (b - a) * v[..., None]
U, V = np.meshgrid(np.arange(N) / N, np.arange(N) / N)
def wood(name, dark, light, rings=14, contrast=1.0):   # grain runs along U
    w = fbm(2, 10, 4); f = fbm(3, 96, 3)
    r = 0.5 + 0.5 * np.sin((V * rings + w * 5.0) * 2 * np.pi)
    v = 0.55 * r ** 1.6 + 0.3 * f + 0.15 * fbm(2, 3, 2)
    save(name, col(np.clip((v - 0.5) * contrast + 0.5, 0, 1), dark, light))
wood("wood_dark", (0.10, 0.055, 0.035), (0.27, 0.15, 0.09), 12)
wood("wood_mid", (0.33, 0.19, 0.10), (0.58, 0.37, 0.20), 16)
wood("wood_light", (0.62, 0.46, 0.28), (0.84, 0.69, 0.47), 18, 0.8)
wood("wood_wet", (0.20, 0.11, 0.06), (0.42, 0.26, 0.14), 14)
# tatami: fine woven rush, rows along U
wv = 0.5 + 0.5 * np.sin(V * 2 * np.pi * 128); wu = 0.5 + 0.5 * np.sin(U * 2 * np.pi * 16 + np.floor(V * 128) * np.pi)
t = 0.55 * wv + 0.15 * wu + 0.3 * fbm(4, 40, 3)
save("tatami", col(t, (0.52, 0.50, 0.27), (0.80, 0.76, 0.47)))
f = fbm(6, 6, 5); fib = tn(8, 120, 5) * tn(90, 6, 6)
save("washi", col(np.clip(f * 0.5 + fib * 0.8, 0, 1), (0.86, 0.83, 0.74), (0.99, 0.97, 0.90)))
save("plaster", col(fbm(8, 8, 5), (0.80, 0.75, 0.62), (0.93, 0.89, 0.78)))
save("plaster_ochre", col(fbm(8, 8, 5), (0.62, 0.50, 0.30), (0.76, 0.63, 0.40)))
def tiles(name, nx, ny, a, b, grout, gw=0.02, offset=False, var=0.5):
    vv = V * ny; row = np.floor(vv); uu = U * nx + (0.5 * (row % 2) if offset else 0)
    fu = uu % 1; fv = vv % 1; idx = (np.floor(uu) % nx + row * 7).astype(int)
    tv = np.random.default_rng(3).random(nx * ny * 8)[idx % (nx * ny * 8)]
    c = col(np.clip(tv * var + fbm(8, 8, 4) * (1 - var), 0, 1), a, b)
    g = (fu < gw * nx / 4) | (fu > 1 - gw * nx / 4) | (fv < gw * ny / 4) | (fv > 1 - gw * ny / 4)
    c[g] = grout; save(name, c)
tiles("slate", 4, 4, (0.13, 0.14, 0.15), (0.26, 0.27, 0.28), (0.07, 0.07, 0.07), 0.012)
tiles("subway", 4, 8, (0.86, 0.86, 0.83), (0.95, 0.95, 0.92), (0.45, 0.44, 0.42), 0.012, True, 0.3)
# kawara: rows of scale shading (geometry carries the ribs)
k = 0.5 + 0.5 * np.cos(V * 2 * np.pi * 4); save("kawara", col(np.clip(0.5 * k + 0.5 * fbm(6, 6, 4), 0, 1), (0.09, 0.10, 0.11), (0.30, 0.31, 0.33)))
# flagstone: wrapped voronoi, pale blue-green stones, dark grout
P = np.random.default_rng(9).random((26, 2)); d1 = np.full((N, N), 9.0); d2 = np.full((N, N), 9.0); idm = np.zeros((N, N), int)
for i, (px, py) in enumerate(P):
    dx = np.abs(U - px); dx = np.minimum(dx, 1 - dx); dy = np.abs(V - py); dy = np.minimum(dy, 1 - dy); d = np.hypot(dx, dy)
    m = d < d1; d2 = np.where(m, d1, np.minimum(d2, d)); idm = np.where(m, i, idm); d1 = np.where(m, d, d1)
edge = np.clip((d2 - d1) / 0.03, 0, 1); sv = np.random.default_rng(4).random(26)[idm]
c = col(np.clip(sv * 0.6 + fbm(10, 10, 4) * 0.5, 0, 1), (0.50, 0.66, 0.62), (0.78, 0.90, 0.84)); c = c * edge[..., None] + np.array((0.16, 0.20, 0.19)) * (1 - edge[..., None]); save("flagstone", c)
save("stone", col(fbm(10, 10, 6), (0.30, 0.31, 0.30), (0.66, 0.66, 0.62)))
save("mossrock", col(np.clip(fbm(6, 6, 5) * 1.3 - 0.15, 0, 1), (0.36, 0.38, 0.33), (0.30, 0.47, 0.16)))
save("steel", col(0.6 * tn(4, 256, 8) + 0.4 * fbm(3, 60, 3), (0.50, 0.52, 0.54), (0.80, 0.82, 0.84)))
bn = (np.abs((U * 3) % 1 - 0.5) < 0.03); b = col(fbm(40, 3, 3), (0.45, 0.55, 0.22), (0.72, 0.76, 0.36)); b[bn] = (0.30, 0.34, 0.14); save("bamboo", b)
save("bark", col(fbm(4, 30, 5), (0.16, 0.12, 0.09), (0.40, 0.32, 0.25)))
save("leaf_green", col(fbm(24, 24, 4), (0.10, 0.26, 0.08), (0.38, 0.60, 0.20)))
save("leaf_maple", col(fbm(24, 24, 4), (0.55, 0.10, 0.05), (0.95, 0.45, 0.12)))
az = col(fbm(24, 24, 4), (0.10, 0.28, 0.10), (0.30, 0.50, 0.18)); fl = tn(40, 40, 11) > 0.72; az[fl] = (0.93, 0.25, 0.50); save("azalea", az)
# fabrics
weave = 0.9 + 0.1 * np.sin(U * 2 * np.pi * 180) * np.sin(V * 2 * np.pi * 180)
a = np.abs(((U + V) * 8) % 1 - 0.5) < 0.04; b2 = np.abs(((U - V) * 8) % 1 - 0.5) < 0.04; c2 = np.abs((U * 8) % 1 - 0.5) < 0.03
ind = np.tile(np.array((0.10, 0.16, 0.36)), (N, N, 1)); ind[a | b2 | c2] = (0.85, 0.86, 0.90); save("fabric_indigo", ind * weave[..., None])
st = np.tile(np.array((0.88, 0.84, 0.76)), (N, N, 1)); st[(U * 12) % 1 < 0.25] = (0.62, 0.14, 0.12); save("fabric_stripe", st * weave[..., None])
ck = np.tile(np.array((0.90, 0.88, 0.80)), (N, N, 1)); ck[((U * 10) % 1 < 0.5) ^ ((V * 10) % 1 < 0.5)] = (0.46, 0.60, 0.50); save("fabric_check", ck * weave[..., None])
save("fabric_white", np.tile(np.array((0.95, 0.94, 0.90)), (N, N, 1)) * weave[..., None])
km = col(fbm(3, 3, 3), (0.50, 0.10, 0.16), (0.72, 0.18, 0.22)); blossom = (tn(14, 14, 21) > 0.8); km[blossom] = (0.96, 0.84, 0.80); save("fabric_kimono", km * weave[..., None])
pc = np.tile(np.array((0.95, 0.96, 0.97)), (N, N, 1)); band = (V < 0.12) | (V > 0.88) | (((U * 12) % 1 < 0.5) & (np.abs(V - 0.5) < 0.2) & (((V * 10) % 1) < 0.5)); pc[band] = (0.12, 0.22, 0.55); save("porcelain", pc)
sc = np.tile(np.array((0.90, 0.86, 0.74)), (N, N, 1)); ink = (fbm(5, 9, 4) > 0.62) & (np.abs(U - 0.5) < 0.3) & (np.abs(V - 0.45) < 0.3); sc[ink] = (0.10, 0.10, 0.10); sc[(V < 0.06) | (V > 0.94)] = (0.35, 0.22, 0.12); save("scroll", sc)
print(sorted(os.listdir(OUT)))
