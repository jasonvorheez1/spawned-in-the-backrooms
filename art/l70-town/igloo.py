# Level 70 igloo (SPOT.igloo): a domed snow-block igloo 4.4 m across with an arched entry passage on +x (1.95 m clear), packed floor, fur pelts.
# World-local metres: x east, y up, z south. Out: /workspace/l70/igloo.glb (slots snow pack fur). blender -b --factory-startup --python-exit-code 1 --python art/l70-town/igloo.py
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "l7kit"))
from l7lib import Kit
from mathutils import Vector, noise
OUT = "/workspace/l70"; os.makedirs(OUT, exist_ok=True)
k = Kit(7071)
m = {"snow": k.mat("snow", (.9, .93, .97), .9, 0), "pack": k.mat("pack", (.8, .84, .9), .95, 0), "fur": k.mat("fur", (.36, .26, .17), 1, 0)}
V = lambda x, y, z: k.bm.verts.new((x, -z, y))
def grid(P, nu, nv, mat, skip=None, flip=False, wrap=False):
    g = [[P(i / nu, j / nv) for i in range(nu + (0 if wrap else 1))] for j in range(nv + 1)]
    gv = [[V(*p) for p in row] for row in g]; W = len(g[0])
    for j in range(nv):
        for i in range(nu):
            a, b = i, (i + 1) % W; c = [(g[j][a][q] + g[j][b][q] + g[j + 1][a][q] + g[j + 1][b][q]) / 4 for q in range(3)]
            if skip and skip(*c): continue
            f = [gv[j][a], gv[j][b], gv[j + 1][b], gv[j + 1][a]]
            try: k.bm.faces.new(f[::-1] if flip else f).material_index = m[mat]
            except ValueError: pass
arch = lambda z, w, h: h - w + math.sqrt(max(0, w * w - z * z)) if abs(z) < w else -1  # arch top height at z for half-width w, apex h
door = lambda x, y, z: x > 0 and abs(z) < 0.72 and y < arch(z, 0.72, 2.12)
NU, NV = 96, 30
def dome(R, H, blocks):
    def P(u, v):
        a = u * math.tau; e = v * math.pi / 2 * 0.999; s = 1.0
        if blocks:
            i, j = round(u * NU), round(v * NV); n = noise.noise(Vector((math.cos(a) * 2.2, v * 5, math.sin(a) * 2.2)))
            s = 1 + 0.035 * n + 0.012 * noise.noise(Vector((math.cos(a) * 9, v * 20, math.sin(a) * 9)))
            if j % 3 == 0 or (i + (j // 3 % 2) * 4) % 8 == 0 and j < NV - 3: s -= 0.03
            s += 0.02 * ((j // 3 * 7 + (i + (j // 3 % 2) * 4) // 8 * 3) % 5) / 5
        return (math.cos(a) * math.cos(e) * R * s, math.sin(e) * H * s - (0.05 if v == 0 else 0), math.sin(a) * math.cos(e) * R * s)
    return P
grid(dome(2.2, 2.8, True), NU, NV, "snow", skip=door, wrap=True, flip=True)
grid(dome(1.85, 2.5, False), NU, NV, "snow", skip=door, wrap=True)
def tunnel(w, h, blocks):  # an arch profile swept along x from 1.05 to 3.0
    def P(u, v):
        x = 1.05 + u * 1.95; t = v * (2 * (h - w) + math.pi * w); s = h - w
        if t < s: z, y = -w, t
        elif t < s + math.pi * w: a = (t - s) / w; z, y = -w * math.cos(a), s + w * math.sin(a)
        else: z, y = w, s - (t - s - math.pi * w)
        if blocks:
            i, j = round(u * 12), round(v * 24); b = 1 + 0.03 * noise.noise(Vector((x * 2, y * 2, z * 2 + 7)))
            if j % 3 == 0 or (i + (j // 3 % 2) * 2) % 4 == 0: b -= 0.03
            z *= b; y = y * b if y > 0.05 else -0.05
        return (x, y, z)
    return P
inside = lambda x, y, z: (x / 2.05) ** 2 + (y / 2.6) ** 2 + (z / 2.05) ** 2 < 1 and x < 1.6
grid(tunnel(0.9, 2.3, True), 12, 24, "snow", skip=lambda x, y, z: (x / 2.0) ** 2 + (y / 2.55) ** 2 + (z / 2.0) ** 2 < 1)
grid(tunnel(0.55, 1.95, False), 12, 24, "snow", flip=True)
def rim(x, flip):  # the ring of snow between the inner and outer arch at one end
    def P(u, v):
        a = tunnel(0.55, 1.95, False)(0, v); b = tunnel(0.9, 2.3, False)(0, v); n = 0.05 * noise.noise(Vector((v * 9, u * 3, x)))
        return (x + (0.08 * math.sin(u * math.pi) + n if x > 2 else 0), a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
    grid(P, 2, 24, "snow", flip=flip)
rim(3.0, False); rim(1.05, True)
grid(lambda u, v: (math.cos(u * math.tau) * 1.9 * v, 0.03 + 0.012 * noise.noise(Vector((u * 9, v * 6, 2))) * v, math.sin(u * math.tau) * 1.9 * v) if v > 0 else (0, 0.03, 0), 32, 6, "pack", wrap=True, flip=True)
grid(lambda u, v: (1.0 + u * 2.3, 0.03 + 0.01 * noise.noise(Vector((u * 5, v * 5, 3))), -0.58 + v * 1.16), 6, 3, "pack")
def pelt(cx, cz, L, W, yaw, y0=0.045, seed=0.0):
    def P(u, v):
        a = u * math.tau; r = v * (1 + 0.28 * math.cos(4 * a) * (abs(math.cos(4 * a)) ** 0.5) + 0.1 * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, seed))))
        x, z = math.cos(a) * L * r, math.sin(a) * W * r; c, s = math.cos(yaw), math.sin(yaw)
        return (cx + x * c - z * s, y0 + 0.035 * (1 - v * v) + 0.012 * noise.noise(Vector((x * 6, z * 6, seed))), cz + x * s + z * c)
    grid(P, 40, 5, "fur", wrap=True, flip=True)
pelt(-0.75, 0.55, 1.05, 0.62, 0.5, seed=1); pelt(-0.6, -0.8, 0.95, 0.58, -0.7, 0.05, seed=4); pelt(-1.1, -0.05, 0.8, 0.5, 1.5, 0.085, seed=8)
for i, (cx, cz, r, h) in enumerate([(2.9, 1.5, 1.1, 0.55), (2.7, -1.6, 1.2, 0.65), (0.2, 2.5, 1.3, 0.5), (-2.3, 1.2, 1.2, 0.6), (-2.2, -1.4, 1.3, 0.7), (0.3, -2.5, 1.2, 0.45)]):  # drift banked on the dome's foot
    grid(lambda u, v, cx=cx, cz=cz, r=r, h=h, i=i: (cx + math.cos(u * math.tau) * r * v * (1 + .2 * noise.noise(Vector((u * 5, i, 1)))), -0.06 + h * (1 - v * v) ** 1.5 * (1 + .2 * noise.noise(Vector((u * 4, v * 3, i)))), cz + math.sin(u * math.tau) * r * v), 20, 6, "snow", wrap=True, flip=True)
ob = k.finish("l70_igloo")
for p in ob.data.polygons: p.use_smooth = True
k.export(os.path.join(OUT, "igloo.glb"))
k.proof(OUT, {"igloo_a": ((7, -4, 2.2), (0, 0, 1.2)), "igloo_b": ((2.6, 0, 1.6), (-1, 0, 1.0)), "igloo_c": ((-5, 6, 3), (0, 0, 1.2))})
