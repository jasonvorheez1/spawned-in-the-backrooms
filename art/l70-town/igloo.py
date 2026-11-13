# Level 70 igloo (SPOT.igloo): a domed snow-block igloo 4.4 m across with an arched entry passage on +x (2.2 m apex, 1.9 m capsule fits), packed floor, fur pelts.
# World-local metres: x east, y up, z south. Out: /workspace/l70/igloo.glb (slots snow pack fur). blender -b --factory-startup --python-exit-code 1 --python art/l70-town/igloo.py
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "l7kit"))
from l7lib import Kit
from mathutils import Vector, noise
OUT = "/workspace/l70"; os.makedirs(OUT, exist_ok=True)
k = Kit(7071)
m = {"snow": k.mat("snow", (.9, .93, .97), .9, 0), "pack": k.mat("pack", (.8, .84, .9), .95, 0), "fur": k.mat("fur", (.36, .26, .17), 1, 0),
     "tarp": k.mat("tarp", (.82, .78, .66), .85, 0), "wood": k.mat("wood", (.45, .32, .2), .75, 0), "blade": k.mat("blade", (.08, .08, .09), .45, 0), "cord": k.mat("cord", (.62, .06, .05), .5, 0)}
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
door = lambda x, y, z: x > 0 and abs(z) < 0.78 and y < arch(z, 0.78, 2.26)
NU, NV = 160, 64
def seam(t, w):  # 0 on a joint line, 1 away from it; t in block units
    d = abs(t - round(t)); return min(1.0, d / w) ** 0.6
def dome(R, H, blocks):
    def P(u, v):
        a = u * math.tau; e = v * math.pi / 2 * 0.999; s = 1.0
        if blocks:
            y = math.sin(e) * H; row = y / 0.42 + u * 0.0  # a course every 0.42 m
            ri = math.floor(row); per = max(4, round(math.cos(e) * R * math.tau / 0.62))  # blocks per course ~0.62 m long
            col = u * per + (0.5 if ri % 2 else 0) + 0.15 * ri
            g = min(seam(row, 0.09), seam(col, 0.07 * per / 22 + 0.04)) if v < 0.93 else 1.0
            s = 1 - 0.022 * (1 - g) + 0.008 * noise.noise(Vector((math.cos(a) * 3, v * 4, math.sin(a) * 3))) + 0.004 * noise.noise(Vector((math.cos(a) * 14, v * 18, math.sin(a) * 14)))
            s += 0.006 * (((ri * 7 + math.floor(col) * 3) % 5) / 5 - 0.5)  # each block a hair proud or shy of its neighbours
        return (math.cos(a) * math.cos(e) * R * s, math.sin(e) * H * (1 if not blocks else s) - (0.05 if v == 0 else 0), math.sin(a) * math.cos(e) * R * s)
    return P
grid(dome(2.2, 2.8, True), NU, NV, "snow", skip=door, wrap=True, flip=True)
grid(dome(1.85, 2.5, False), NU, NV, "snow", skip=door, wrap=True)
def tunnel(w, h, blocks):  # an arch profile swept along x from 1.05 to 3.0
    def P(u, v):
        x = 0.85 + u * 2.15; t = v * (2 * (h - w) + math.pi * w); s = h - w
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
grid(tunnel(1.08, 2.55, True), 12, 24, "snow", skip=lambda x, y, z: (x / 2.0) ** 2 + (y / 2.55) ** 2 + (z / 2.0) ** 2 < 1)
grid(tunnel(0.76, 2.22, False), 12, 24, "snow", flip=True)
def rim(x, flip):  # the ring of snow between the inner and outer arch at one end
    def P(u, v):
        a = tunnel(0.76, 2.22, False)(0, v); b = tunnel(1.08, 2.55, False)(0, v); n = 0.05 * noise.noise(Vector((v * 9, u * 3, x)))
        return (x + (0.08 * math.sin(u * math.pi) + n if x > 2 else 0), a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
    grid(P, 2, 24, "snow", flip=flip)
rim(3.0, False)
grid(lambda u, v: (math.cos(u * math.tau) * 1.9 * v, 0.03 + 0.012 * noise.noise(Vector((u * 9, v * 6, 2))) * v, math.sin(u * math.tau) * 1.9 * v) if v > 0 else (0, 0.03, 0), 32, 6, "pack", wrap=True, flip=True)
grid(lambda u, v: (1.0 + u * 2.3, 0.03 + 0.01 * noise.noise(Vector((u * 5, v * 5, 3))), -0.78 + v * 1.56), 6, 3, "pack")
def pelt(cx, cz, L, W, yaw, y0=0.045, seed=0.0):
    def P(u, v):
        a = u * math.tau; r = v * (1 + 0.28 * math.cos(4 * a) * (abs(math.cos(4 * a)) ** 0.5) + 0.1 * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, seed))))
        x, z = math.cos(a) * L * r, math.sin(a) * W * r; c, s = math.cos(yaw), math.sin(yaw)
        return (cx + x * c - z * s, y0 + 0.035 * (1 - v * v) + 0.012 * noise.noise(Vector((x * 6, z * 6, seed))), cz + x * s + z * c)
    grid(P, 40, 5, "fur", wrap=True, flip=True)
pelt(-0.75, 0.55, 1.05, 0.62, 0.5, seed=1); pelt(-0.6, -0.8, 0.95, 0.58, -0.7, 0.05, seed=4); pelt(-1.1, -0.05, 0.8, 0.5, 1.5, 0.085, seed=8)
def drift(cx, cz, rx, rz, h, yaw, i):
    c, sn = math.cos(yaw), math.sin(yaw)
    def P(u, v):
        a = u * math.tau; r = v * (1 + 0.12 * noise.noise(Vector((math.cos(a) * 1.5, math.sin(a) * 1.5, i * 3.1))))
        x, z = math.cos(a) * rx * r, math.sin(a) * rz * r
        x += 0.25 * rx * (1 - v) * (1 - v)  # crest pushed downwind
        y = -0.06 + h * (math.cos(min(1, v) * math.pi / 2) ** 1.6) * (1 + 0.08 * noise.noise(Vector((x * 1.3, z * 1.3, i))))
        return (cx + x * c - z * sn, y, cz + x * sn + z * c)
    grid(P, 40, 14, "snow", wrap=True, flip=True)
for i, (cx, cz, rx, rz, h, yaw) in enumerate([(2.3, 1.9, 1.6, 0.9, 0.42, 0.4), (2.2, -2.0, 1.7, 1.0, 0.5, -0.5), (-0.2, 2.6, 2.0, 0.9, 0.38, 0.1), (-2.5, 1.0, 1.1, 1.8, 0.5, 0.2), (-2.4, -1.5, 1.2, 1.9, 0.55, -0.3), (0.0, -2.6, 2.0, 0.9, 0.35, 0)]):
    drift(cx, cz, rx, rz, h, yaw, i)
def tube(pts, r, mat, sides=8):
    import mathutils
    def at(u):
        f = u * (len(pts) - 1); i = min(int(f), len(pts) - 2); t = f - i
        return Vector(pts[i]).lerp(Vector(pts[i + 1]), t), (Vector(pts[i + 1]) - Vector(pts[i])).normalized()
    def P(u, v):
        p, T = at(u); N = T.cross(Vector((0, 1, 0))); N = N.normalized() if N.length > 1e-4 else Vector((1, 0, 0)); B = N.cross(T)
        a = v * math.tau; q = p + (N * math.cos(a) + B * math.sin(a)) * r; return (q.x, q.y, q.z)
    grid(P, max(2, len(pts) * 3), sides, mat, flip=True)
# the tarp: a cream canvas thrown over the passage roof, hanging down its south side, wrinkled, weighed at the hem
def tarp(u, v):
    x = 1.35 + u * 1.75; t = 0.5 + v * 0.5; p = tunnel(1.08, 2.55, False)(0, t)
    w = 1 + 0.06 + 0.035 * noise.noise(Vector((x * 2.2, v * 3, 5))) + 0.02 * math.sin(x * 9 + v * 4)
    return (x + 0.08 * v * v * math.sin(u * 6), max(0.02, p[1] * (1.04 + 0.03 * noise.noise(Vector((x * 2, v * 2, 9))))), p[2] * w + (0.18 * v ** 3))
grid(tarp, 22, 18, "tarp"); grid(tarp, 22, 18, "tarp", flip=True)
# two shovels stood in the snow by the door, a red extension cord snaking out of the passage across the yard
def shovel(bx, bz, lean, yaw):
    c, sn = math.cos(yaw), math.sin(yaw)
    top = (bx + math.sin(lean) * 1.25 * c, 1.25 * math.cos(lean) + 0.3, bz + math.sin(lean) * 1.25 * sn)
    tube([(bx, 0.3, bz), top], 0.017, "wood", 8)
    gx, gz = top[0] + 0.1 * sn, top[2] - 0.1 * c; tube([(top[0] - 0.1 * sn, top[1], top[2] + 0.1 * c), (gx, top[1] + 0.02, gz)], 0.014, "blade", 6)
    def blade(u, v, d):
        x = (u - 0.5) * 0.4; y = 0.32 - v * 0.46; z = 0.05 * (2 * u - 1) ** 2 + d
        return (bx + x * sn + z * c, y, bz - x * c + z * sn)
    grid(lambda u, v: blade(u, v, 0), 8, 6, "blade"); grid(lambda u, v: blade(u, v, 0.012), 8, 6, "blade", flip=True)
shovel(3.5, 1.45, 0.16, 0.3); shovel(3.75, -1.3, 0.22, -0.4)
tube([(1.4, 0.05, 0.55), (2.3, 0.05, 0.6), (3.2, 0.06, 0.4), (3.9, 0.08, -0.2), (4.6, 0.06, -0.4), (5.3, 0.09, 0.3), (6.2, 0.07, 0.9), (7.2, 0.06, 0.6), (8.3, 0.05, 1.3)], 0.012, "cord", 6)
ob = k.finish("l70_igloo")
for p in ob.data.polygons: p.use_smooth = True
k.export(os.path.join(OUT, "igloo.glb"))
k.proof(OUT, {"igloo_a": ((7, -4, 2.2), (0, 0, 1.2)), "igloo_b": ((2.6, 0, 1.6), (-1, 0, 1.0)), "igloo_c": ((-5, 6, 3), (0, 0, 1.2))})
