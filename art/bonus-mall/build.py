# The Bonus Room mall shell. Game coords (x, y up, z); every number from scripts/lib/data/bonus.yml.
# blender -b --factory-startup --python-exit-code 1 --python art/bonus-mall/build.py
# -> /workspace/bonus-mall/{shell,glass,deco}.glb + offsets.json (each glb's bottom-centre = its feetPosition)
import bpy, bmesh, math, json
TEX = "/workspace/bonus-mall/tex/"; OUT = "/workspace/bonus-mall/"

def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
MAT = {
 "checker": dict(tex="checker.png", S=4.8, rough=0.16),
 "diner": dict(tex="diner.png", S=1.2, rough=0.2),
 "plaster": dict(tex="plaster.png", S=2.0, rough=0.85),
 "ceiling": dict(tex="plaster.png", S=2.0, rough=0.9),
 "fascia": dict(tex="plaster.png", S=2.0, rough=0.5, color="ecc9ec"),
 "mosaic": dict(tex="mosaic.png", S=0.8, rough=0.22),
 "metro": dict(tex="metro.png", S=1.2, rough=0.18),
 "platform": dict(tex="platform.png", S=2.0, rough=0.45),
 "gravel": dict(tex="gravel.png", S=1.0, rough=1.0),
 "shutter": dict(tex="shutter.png", S=2.0, rough=0.45, metal=0.6),
 "escstep": dict(tex="steps.png", S=0.4, rough=0.4, metal=0.8),
 "terrazzo": dict(tex="terrazzo.png", S=2.0, rough=0.22),
 "chrome": dict(color="eceef4", metal=1.0, rough=0.1),
 "steel": dict(color="b9bdc6", metal=0.85, rough=0.32),
 "steel_dark": dict(color="3a3d46", metal=0.5, rough=0.5),
 "white_steel": dict(color="f6f6f8", metal=0.1, rough=0.35),
 "rubber": dict(color="0b0b0d", rough=0.45),
 "sign_band": dict(color="2e1a4d", rough=0.35),
 "door": dict(color="6fbfc9", rough=0.35),
 "plaque": dict(color="f4f4f6", rough=0.3),
 "void": dict(color="050507", rough=1.0),
 "buffer": dict(color="c42a36", rough=0.5),
 "tactile": dict(color="f0cf1e", rough=0.6),
 "rail": dict(color="8a8784", metal=1.0, rough=0.35),
 "sleeper": dict(color="3a2e28", rough=0.9),
 "glass": dict(color="d6f1f7", rough=0.04, alpha=0.2),
 "sky_glass": dict(color="cfe6ff", rough=0.04, alpha=0.3),
 "neon_pink": dict(color="ff4fc8", emit=8.0),
 "neon_cyan": dict(color="45f0ff", emit=8.0),
 "neon_dead": dict(color="5e5866", rough=0.3),
 "downlight": dict(color="fff0d2", emit=5.0),
}

class Mesh:
    def __init__(s): s.v = []; s.f = []; s.m = []; s.uv = []; s.sm = []
M = {"shell": Mesh(), "glass": Mesh(), "deco": Mesh()}
S, G, D = M["shell"], M["glass"], M["deco"]

def newell(p):
    n = [0, 0, 0]
    for i in range(len(p)):
        a, b = p[i], p[(i + 1) % len(p)]
        n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1])
    l = math.sqrt(sum(x * x for x in n)) or 1; return [x / l for x in n]
def auto_uv(p, n, s):
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ay >= ax and ay >= az: return [(q[0] / s, q[2] / s) for q in p]
    if ax >= az: return [(q[2] / s, q[1] / s) for q in p]
    return [(q[0] / s, q[1] / s) for q in p]
def face(m, p, mat, want=None, uv=None, smooth=False):
    p = [tuple(q) for q in p]
    n = newell(p)
    if want is not None and sum(a * b for a, b in zip(n, want)) < 0:
        p = p[::-1]; n = [-x for x in n]; uv = uv[::-1] if uv else None
    if uv is None: uv = auto_uv(p, n, MAT[mat].get("S", 1.0))
    b = len(m.v); m.v += p; m.f.append(list(range(b, b + len(p)))); m.m.append(mat); m.uv.append(uv); m.sm.append(smooth)
def box(m, x0, x1, y0, y1, z0, z1, mat, f=None, skip=()):
    x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1)); f = f or {}
    F = {"-y": ([(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1)], (0,-1,0)), "+y": ([(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)], (0,1,0)),
         "-x": ([(x0,y0,z0),(x0,y1,z0),(x0,y1,z1),(x0,y0,z1)], (-1,0,0)), "+x": ([(x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)], (1,0,0)),
         "-z": ([(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0)], (0,0,-1)), "+z": ([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)], (0,0,1))}
    for k, (p, w) in F.items():
        if k not in skip: face(m, p, f.get(k, mat), w)
def prism(m, poly, x0, x1, mat, capmat=None):   # poly: (z, y) points, extruded over x
    area = sum(poly[i][0] * poly[(i+1) % len(poly)][1] - poly[(i+1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    P = poly if area > 0 else poly[::-1]
    face(m, [(x0, y, z) for z, y in P], capmat or mat, (-1, 0, 0)); face(m, [(x1, y, z) for z, y in P], capmat or mat, (1, 0, 0))
    for i in range(len(P)):
        (za, ya), (zb, yb) = P[i], P[(i+1) % len(P)]
        face(m, [(x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb)], mat, (0, -(zb - za), yb - ya))
def vcyl(m, cx, cz, r, y0, y1, mat, seg=32, caps=(False, True)):
    s = MAT[mat].get("S", 1.0); C = 2 * math.pi * r
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        p = [(cx + r*math.cos(a0), y0, cz + r*math.sin(a0)), (cx + r*math.cos(a1), y0, cz + r*math.sin(a1)),
             (cx + r*math.cos(a1), y1, cz + r*math.sin(a1)), (cx + r*math.cos(a0), y1, cz + r*math.sin(a0))]
        u0, u1 = C * i / seg / s, C * (i + 1) / seg / s
        face(m, p, mat, (math.cos(a0 + math.pi/seg), 0, math.sin(a0 + math.pi/seg)), [(u0, y0/s), (u1, y0/s), (u1, y1/s), (u0, y1/s)], True)
    ring = lambda y: [(cx + r*math.cos(2*math.pi*i/seg), y, cz + r*math.sin(2*math.pi*i/seg)) for i in range(seg)]
    if caps[0]: face(m, ring(y0), mat, (0, -1, 0))
    if caps[1]: face(m, ring(y1), mat, (0, 1, 0))
def sub(a, b): return [a[i] - b[i] for i in range(3)]
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def norm(a): l = math.sqrt(sum(x*x for x in a)) or 1; return [x / l for x in a]
def tube(m, p0, p1, r, mat, seg=10):
    d = norm(sub(p1, p0)); a = [0, 1, 0] if abs(d[1]) < 0.9 else [1, 0, 0]
    u = norm(cross(d, a)); w = cross(d, u)
    pt = lambda c, t: [c[k] + r * (math.cos(t) * u[k] + math.sin(t) * w[k]) for k in range(3)]
    for i in range(seg):
        t0, t1 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg; tm = (t0 + t1) / 2
        face(m, [pt(p0, t0), pt(p0, t1), pt(p1, t1), pt(p1, t0)], mat, [math.cos(tm)*u[k] + math.sin(tm)*w[k] for k in range(3)], [(i/seg, 0), ((i+1)/seg, 0), ((i+1)/seg, 1), (i/seg, 1)], True)
def polytube(m, pts, r, mat, seg=10):
    for a, b in zip(pts, pts[1:]): tube(m, a, b, r, mat, seg)
def disc(m, cx, y, cz, r, mat, seg=12, want=(0, -1, 0)):
    face(m, [(cx + r*math.cos(2*math.pi*i/seg), y, cz + r*math.sin(2*math.pi*i/seg)) for i in range(seg)], mat, want)
def annulus(m, cx, y, cz, r0, r1, mat, seg=12):
    for i in range(seg):
        a0, a1 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        face(m, [(cx+r0*math.cos(a0), y, cz+r0*math.sin(a0)), (cx+r1*math.cos(a0), y, cz+r1*math.sin(a0)), (cx+r1*math.cos(a1), y, cz+r1*math.sin(a1)), (cx+r0*math.cos(a1), y, cz+r0*math.sin(a1))], mat, (0, -1, 0))
def segs(a, b, L=3.9, gap=0.06):
    n = max(1, round((b - a) / L)); w = (b - a) / n
    return [(a + i * w + gap / 2, a + (i + 1) * w - gap / 2) for i in range(n)]

# ---------- ground floor, outer walls, roof ----------
box(S, -24.3, 24.3, -0.4, 0, -32.3, 32.3, "plaster", {"+y": "checker"})
box(S, -24, -10, 0, 0.01, -24, -6, "diner", skip=("-y",))                 # Tom's Diner black and white
for sx in (-1, 1):
    box(S, sx * 24, sx * 24.3, 0, 11.3, -32.3, 32.3, "plaster")
    box(S, sx * 6, sx * 24, 10.5, 11.0, -32, 32, "plaster", {"-y": "ceiling"})   # gallery and upper-shop ceilings
    box(S, sx * 5.6, sx * 6.4, 10.2, 11.3, -32, 32, "white_steel")            # vault edge beam
box(S, -24, 24, 0, 11.3, -32.3, -32, "plaster")                              # north wall
box(S, -24, -8, 0, 11.3, 32, 32.3, "plaster"); box(S, 8, 24, 0, 11.3, 32, 32.3, "plaster"); box(S, -8, 8, 4.6, 11.3, 32, 32.3, "plaster")
# south entrance: glass doors onto daylight
face(G, [(-8, 0, 32.1), (8, 0, 32.1), (8, 4.6, 32.1), (-8, 4.6, 32.1)], "glass", (0, 0, -1))
for i in range(9): box(S, -8.05 + 2 * i, -7.95 + 2 * i, 0, 4.6, 32.0, 32.2, "chrome")
box(S, -8, 8, 2.5, 2.6, 32.0, 32.2, "chrome"); box(S, -8, 8, 0, 0.12, 32.0, 32.2, "chrome")
for x in (-3, -1, 1, 3): tube(D, [x - 0.6, 1.05, 31.95], [x + 0.6, 1.05, 31.95], 0.025, "chrome", 8)

# ---------- shop fronts on x = +-10 ----------
def front(xf, s, z0, z1, base, kind, door=None):
    H = 5.0
    box(S, xf - 0.2, xf + 0.2, base, base + H, z0, z0 + 0.4, "plaster"); box(S, xf - 0.2, xf + 0.2, base, base + H, z1 - 0.4, z1, "plaster")
    a, b = z0 + 0.4, z1 - 0.4
    if kind == "solid": box(S, xf - 0.15, xf + 0.15, base, base + H, a, b, "plaster"); return
    box(S, xf - 0.15, xf + 0.15, base + 3.2, base + H, a, b, "plaster")
    if kind == "shutter":
        box(S, xf - 0.04, xf + 0.04, base, base + 3.2, a, b, "shutter")
        box(S, xf, xf + s * 0.32, base + 3.15, base + 3.55, a, b, "steel")              # roller housing
        box(S, xf, xf + s * 0.07, base, base + 0.09, a, b, "steel")                     # bottom bar
        for zz in (a, b - 0.08): box(S, xf, xf + s * 0.1, base, base + 3.2, zz, zz + 0.08, "steel")
        zc = (a + b) / 2; box(S, xf + s * 0.04, xf + s * 0.1, base + 0.1, base + 0.22, zc - 0.08, zc + 0.08, "chrome")   # padlock hasp
        return
    dz, w = door; d0, d1 = dz - w / 2, dz + w / 2
    for p, q in ((a, d0 - 0.1), (d1 + 0.1, b)):
        box(S, xf - 0.06, xf + 0.06, base, base + 0.3, p, q, "chrome")
        face(G, [(xf, base + 0.3, p), (xf, base + 0.3, q), (xf, base + 3.2, q), (xf, base + 3.2, p)], "glass", (s, 0, 0))
        n = max(1, round((q - p) / 2.0))
        for i in range(1, n): zz = p + (q - p) * i / n; box(S, xf - 0.06, xf + 0.06, base, base + 3.2, zz - 0.04, zz + 0.04, "chrome")
    face(G, [(xf, base + 2.68, d0), (xf, base + 2.68, d1), (xf, base + 3.2, d1), (xf, base + 3.2, d0)], "glass", (s, 0, 0))
    box(S, xf - 0.07, xf + 0.07, base, base + 3.2, d0 - 0.1, d0, "chrome"); box(S, xf - 0.07, xf + 0.07, base, base + 3.2, d1, d1 + 0.1, "chrome")
    box(S, xf - 0.06, xf + 0.06, base + 2.6, base + 2.68, d0, d1, "chrome"); box(S, xf - 0.06, xf + 0.06, base + 3.12, base + 3.2, a, b, "chrome")
    box(S, xf + s * 0.15, xf + s * 0.2, base + 3.6, base + 4.6, dz - 2.1, dz + 2.1, "chrome")       # sign band frame
    box(S, xf + s * 0.2, xf + s * 0.24, base + 3.7, base + 4.5, dz - 2.0, dz + 2.0, "sign_band")    # the empty 4 x 0.8 m band
for xf, s in ((-10, 1), (10, -1)):
    front(xf, s, -32, -24, 0, "solid"); front(xf, s, -24, -6, 0, "shop", (-15, 4)); front(xf, s, -6, 4, 0, "shutter")
    front(xf, s, 4, 22, 0, "shop", (13, 4)); front(xf, s, 22, 32, 0, "shutter")
    front(xf, s, -32, -28, 5.5, "solid"); front(xf, s, -28, 0, 5.5, "shop", (-13, 5))
    for z in (0, 8, 16): front(xf, s, z, z + 8, 5.5, "shutter")
    front(xf, s, 24, 32, 5.5, "solid")
# party walls (ground) and upper shop end walls
for sx in (-1, 1):
    for z in (-24, -6, 4, 22):
        if sx < 0 and z in (-24, -6):
            box(S, -24, -20.5, 0, 4.2, z - 0.1, z + 0.1, "plaster"); box(S, -20.5, -10, 0, 5.0, z - 0.1, z + 0.1, "plaster")
        else: box(S, sx * 10, sx * 24, 0, 5.0, z - 0.1, z + 0.1, "plaster")
box(S, -24, -10, 4.2, 10.5, -28.2, -28.0, "plaster", {"+z": "metro"}); box(S, -24, -10, 5.5, 10.5, 0, 0.2, "plaster", {"-z": "metro"})
box(S, 10, 24, 5.5, 10.5, -28.2, -28.0, "plaster"); box(S, 10, 24, 5.5, 10.5, 0, 0.2, "plaster")

# ---------- upper slabs (top y 5.5, 0.5 thick) ----------
def slab(x0, x1, z0, z1, top, sides="fascia", f=None):
    ff = {"+y": top, "-y": "ceiling"}; ff.update(f or {}); box(S, x0, x1, 5.0, 5.5, z0, z1, sides, ff)
slab(-24, -10, -32, -28, "plaster"); slab(-24, -10, 24, 32, "plaster"); slab(10, 24, -32, -28, "plaster"); slab(10, 24, 24, 32, "plaster")
slab(-20.5, -10, -28, -6, "platform", "steel_dark", {"-x": "metro"})          # station platform
slab(-24, -10, -6, 0, "platform", "steel_dark", {"-z": "metro"})
slab(-24, -10, 0, 24, "plaster")                                             # closed upper shops
slab(-10, -6, -28, 24, "checker")                                            # west gallery
slab(10, 24, -28, 0, "terrazzo"); slab(10, 24, 0, 24, "plaster")             # art gallery, closed shops
slab(6, 10, -28, 24, "checker")                                              # east gallery
slab(3.4, 10, -32, -28, "checker")                                           # stair landing
slab(-6, 6, -16, -10, "checker")                                             # bridge

# ---------- Teleport Station: metro platform ----------
box(S, -24, -20.5, 4.2, 4.3, -28, -6, "gravel", {"-y": "ceiling"})           # track pit floor (the diner's soffit underneath)
box(S, -20.6, -20.5, 4.2, 5.0, -28, -6, "metro", {"+x": "plaster"})
box(S, -24, -20.5, 4.2, 5.0, -6.0, -5.8, "metro", {"-y": "plaster"})
box(S, -24, -23.92, 4.3, 10.5, -28, 0, "metro")                              # tiled back wall
for x0, x1, z0, z1 in ((-23.92, -23.9, -28, 0), (-24, -10, -27.99, -27.97), (-24, -10, -0.03, -0.01)):
    box(S, x0, x1, 7.3, 7.55, z0, z1, "sign_band")                            # purple tile band
box(S, -21.1, -20.5, 5.5, 5.505, -28, -6, "tactile")
for c in (-22.97, -21.53):
    box(D, c - 0.035, c + 0.035, 4.45, 4.6, -28, -6, "rail")
for i in range(36): z = -27.6 + i * 0.6; box(D, -23.45, -21.05, 4.3, 4.45, z - 0.1, z + 0.1, "sleeper")
arch = [(-23.8, 4.3, -27.96), (-20.7, 4.3, -27.96)] + [(-22.25 + 1.55 * math.cos(t), 6.0 + 1.55 * math.sin(t), -27.96) for t in [math.pi * i / 12 for i in range(13)]]
face(D, arch, "void", (0, 0, 1))
box(S, -23.1, -21.4, 4.3, 5.3, -6.7, -6.0, "buffer")
for z in (-25, -19, -13, -7.5): box(S, -19.2, -18.8, 5.5, 10.5, z - 0.2, z + 0.2, "steel_dark")

# ---------- north end: restrooms and the directory wall ----------
for x in (-8.6, -6.2):
    box(S, x - 0.5, x + 0.5, 0, 2.2, -32.0, -31.94, "door")
    box(S, x - 0.58, x - 0.5, 0, 2.28, -32, -31.9, "chrome"); box(S, x + 0.5, x + 0.58, 0, 2.28, -32, -31.9, "chrome"); box(S, x - 0.58, x + 0.58, 2.2, 2.28, -32, -31.9, "chrome")
    box(S, x - 0.15, x + 0.15, 1.5, 1.8, -31.94, -31.92, "plaque"); box(S, x + 0.32, x + 0.38, 0.9, 1.15, -31.94, -31.88, "chrome")
for a, b in segs(-4.5, 2.5, 3.5): box(D, a, b, 4.2, 4.26, -32, -31.94, "neon_pink")

# ---------- columns: blue mosaic, two storeys, on the gallery edges ----------
COLS = [-28, -22, -16, -10, -2, 6, 16, 24]
for sx in (-1, 1):
    for z in COLS:
        x = sx * 6
        vcyl(S, x, z, 0.45, 0, 10.2, "mosaic", 32, (False, False))
        vcyl(S, x, z, 0.56, 0, 0.25, "white_steel", 32); vcyl(S, x, z, 0.5, 0.25, 0.3, "chrome", 32)
        vcyl(S, x, z, 0.56, 5.5, 5.72, "white_steel", 32); vcyl(S, x, z, 0.55, 4.7, 5.0, "fascia", 32, (True, False))
        vcyl(S, x, z, 0.6, 9.95, 10.2, "white_steel", 32, (True, False))
        vcyl(D, x, z, 0.47, 3.6, 3.66, "neon_pink", 32, (False, False)); vcyl(D, x, z, 0.47, 9.1, 9.16, "neon_cyan", 32, (False, False))

# ---------- railings: chrome and glass, 1.1 m ----------
def railing(a, b, y0=5.5):
    L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, math.ceil(L / 1.5))
    P = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]
    for x, z in P: vcyl(S, x, z, 0.03, y0, y0 + 1.06, "chrome", 8, (False, False))
    for (x0, z0), (x1, z1) in zip(P, P[1:]):
        face(G, [(x0, y0 + 0.08, z0), (x1, y0 + 0.08, z1), (x1, y0 + 1.0, z1), (x0, y0 + 1.0, z0)], "glass")
    tube(S, [a[0], y0 + 1.08, a[1]], [b[0], y0 + 1.08, b[1]], 0.04, "chrome", 12)
    tube(S, [a[0], y0 + 0.06, a[1]], [b[0], y0 + 0.06, b[1]], 0.02, "chrome", 8)
E = 0.12   # rail set back from the slab edge
for sx in (-1, 1):
    railing((sx * (6 + E), -28 + E), (sx * (6 + E), -16)); railing((sx * (6 + E), -10), (sx * (6 + E), 24 - E))
    railing((sx * (6 + E), 24 - E), (sx * 10, 24 - E))
    railing((sx * 3, -10 + E), (sx * 6, -10 + E))
railing((-6, -28 + E), (-10, -28 + E))
railing((-6, -16 + E), (6, -16 + E))
railing((3.4 + E, -32), (3.4 + E, -28 + E))

# ---------- pink neon under every slab edge, cyan along the cornice (two dead tubes) ----------
def neon_x(x0, x1, za, zb, y0, y1, col, dead=()):
    for i, (a, b) in enumerate(segs(za, zb)): box(D, x0, x1, y0, y1, a, b, "neon_dead" if i in dead else col)
def neon_z(z0, z1, xa, xb, y0, y1, col, dead=()):
    for i, (a, b) in enumerate(segs(xa, xb)): box(D, xa if False else a, b, y0, y1, z0, z1, "neon_dead" if i in dead else col)
neon_x(-5.99, -5.93, -28, -16, 5.03, 5.09, "neon_pink"); neon_x(-5.99, -5.93, -10, 24, 5.03, 5.09, "neon_pink", dead=(4,))
neon_x(5.93, 5.99, -28, -16, 5.03, 5.09, "neon_pink"); neon_x(5.93, 5.99, -10, 24, 5.03, 5.09, "neon_pink")
neon_z(-16.07, -16.01, -6, 6, 5.03, 5.09, "neon_pink"); neon_z(-9.99, -9.93, -6, -3, 5.03, 5.09, "neon_pink"); neon_z(-9.99, -9.93, 3, 6, 5.03, 5.09, "neon_pink")
neon_z(24.01, 24.07, -10, -6, 5.03, 5.09, "neon_pink"); neon_z(24.01, 24.07, 6, 10, 5.03, 5.09, "neon_pink"); neon_z(-28.07, -28.01, -10, -6, 5.03, 5.09, "neon_pink")
neon_x(3.33, 3.39, -32, -28, 5.03, 5.09, "neon_pink")
neon_x(-5.6, -5.54, -32, 32, 10.22, 10.28, "neon_cyan"); neon_x(5.54, 5.6, -32, 32, 10.22, 10.28, "neon_cyan", dead=(5,))

# ---------- escalators ----------
def L(z): return min(5.5, max(0.0, -0.55 * z))
TRUSS = [(1.2, 0), (1.2, 0.2), (0, 0.2), (-10, 5.7), (-10.8, 5.7), (-10.8, 5.5), (-10, 5.5), (-10, 4.5), (-1.818, 0)]
def deck(z): return 0.2 if z >= 0 else 5.7 if z <= -10 else L(z) + 0.2
def escalator(xa, xb):
    for p0, p1 in ((xa, xa + 0.15), (xb - 0.15, xb)):
        prism(S, TRUSS, p0, p1, "steel")
        xc = (p0 + p1) / 2; zs = [1.2, 0, -10, -10.8]
        for z0, z1 in zip(zs, zs[1:]):
            face(G, [(xc, deck(z0), z0), (xc, deck(z1), z1), (xc, deck(z1) + 0.8, z1), (xc, deck(z0) + 0.8, z0)], "glass")
        arc1 = [(xc, 0.75 + 0.3 * math.sin(t), 1.2 + 0.3 * math.cos(t)) for t in [-math.pi / 2 + math.pi * i / 8 for i in range(9)]]
        arc2 = [(xc, 6.25 + 0.3 * math.sin(t), -10.8 + 0.3 * math.cos(t)) for t in [math.pi / 2 + math.pi * i / 8 for i in range(9)]]
        polytube(D, arc1 + [(xc, 1.05, 0.0), (xc, 6.55, -10.0)] + arc2, 0.045, "rubber", 10)
        for z in (1.2, -10.8): vcyl(D, xc, z, 0.09, deck(z), deck(z) + 0.75, "chrome", 12)
    x0, x1 = xa + 0.15, xb - 0.15; N = 27
    for i in range(N):
        zi, zn = -10 * i / N, -10 * (i + 1) / N; y = L(zi) + 0.04; y2 = L(zn) + 0.04
        face(D, [(x0, y, zi), (x1, y, zi), (x1, y, zn), (x0, y, zn)], "escstep", (0, 1, 0))
        face(D, [(x0, y, zn), (x1, y, zn), (x1, y2, zn), (x0, y2, zn)], "steel", (0, 0, 1))
        box(D, x0, x1, y - 0.01, y + 0.005, zi - 0.04, zi, "tactile", skip=("-y",))
    box(D, x0, x1, 0, 0.02, 0, 1.2, "escstep", skip=("-y",)); box(D, x0, x1, 5.5, 5.52, -10.8, -10, "escstep", skip=("-y",))
    face(S, [(xa, 0, -1.818), (xb, 0, -1.818), (xb, 4.5, -10), (xa, 4.5, -10)], "steel", (0, -1, 0))
escalator(-3, -0.6); escalator(0.6, 3)
for z0, z1 in ((1.2, 0), (0, -10), (-10, -10.8)):
    face(S, [(-0.6, deck(z0), z0), (0.6, deck(z0), z0), (0.6, deck(z1), z1), (-0.6, deck(z1), z1)], "steel", (0, 1, 0))
face(S, [(-0.6, 0, -1.818), (0.6, 0, -1.818), (0.6, 4.5, -10), (-0.6, 4.5, -10)], "steel", (0, -1, 0))

# ---------- the ordinary stair at the north end (east side), 30 x 0.183 rise, 0.287 tread ----------
SX0, SX1, N = 3.4, 5.4, 30; r, t = 5.5 / N, 8.6 / N
for i in range(1, N + 1):
    zf = -19.4 - (i - 1) * t; zb = zf - t
    box(S, SX0, SX1, 0, i * r, zb, zf, "plaster", {"+y": "terrazzo"}, skip=("-y",))
    box(S, SX0, SX1, i * r - 0.03, i * r + 0.004, zf - 0.04, zf + 0.004, "chrome", skip=("-y",))
STR = [(-18.9, 0), (-18.9, 0.2), (-19.113, 0.2), (-27.713, 5.7), (-28, 5.7), (-28, 0)]
for p0, p1 in ((SX0 - 0.15, SX0), (SX1, SX1 + 0.15)):
    prism(S, STR, p0, p1, "plaster", "fascia")
    xc = (p0 + p1) / 2; top = lambda z: 0.2 if z >= -19.113 else 5.7 if z <= -27.713 else 0.2 + (-19.113 - z) * 0.6395
    zs = [-18.95, -19.113, -27.713, -27.95]
    for z0, z1 in zip(zs, zs[1:]): face(G, [(xc, top(z0), z0), (xc, top(z1), z1), (xc, top(z1) + 0.85, z1), (xc, top(z0) + 0.85, z0)], "glass")
    polytube(S, [(xc, top(z) + 0.92, z) for z in zs], 0.035, "chrome", 10)
    for z in zs[::3]: vcyl(S, xc, z, 0.03, top(z), top(z) + 0.92, "chrome", 8, (False, False))

# ---------- ceilings: recessed warm downlights ----------
def dl(x, y, z):
    annulus(D, x, y - 0.003, z, 0.15, 0.22, "chrome"); disc(D, x, y - 0.006, z, 0.15, "downlight")
def grid(x0, x1, z0, z1, yf, step=3.0):
    nx, nz = int((x1 - x0) // step), int((z1 - z0) // step)
    ox, oz = x0 + (x1 - x0 - (nx - 1) * step) / 2, z0 + (z1 - z0 - (nz - 1) * step) / 2
    for i in range(nx):
        for j in range(nz): x, z = ox + i * step, oz + j * step; dl(x, yf(x, z), z)
grid(-24, -10, -24, -6, lambda x, z: 4.2 if x < -20.5 else 5.0)
for x0, x1, z0, z1 in ((-24, -10, 4, 22), (10, 24, 4, 22), (10, 24, -24, -6)): grid(x0, x1, z0, z1, lambda x, z: 5.0)
grid(-24, -10, -28, 0, lambda x, z: 10.5); grid(10, 24, -28, 0, lambda x, z: 10.5)
for sx in (-1, 1):
    for i in range(18): z = -26.5 + i * 2.9; dl(sx * 8, 5.0, z)
    for i in range(21): z = -30.5 + i * 3.05; dl(sx * 8, 10.5, z)
dl(6.7, 5.0, -30); dl(8.5, 5.0, -30)

# ---------- glass barrel vault with white steel ribs ----------
R, CY = 8.98, 4.52; PH = math.asin(6 / R); K = 18
ang = [-PH + 2 * PH * i / K for i in range(K + 1)]
at = lambda a, rr: (rr * math.sin(a), CY + rr * math.cos(a))
for i in range(K):
    (xa, ya), (xb, yb) = at(ang[i], R + 0.01), at(ang[i + 1], R + 0.01)
    face(D, [(xa, ya, -32), (xb, yb, -32), (xb, yb, 32), (xa, ya, 32)], "sky_glass", (0, -1, 0), [(i / K, 0), ((i + 1) / K, 0), ((i + 1) / K, 1), (i / K, 1)])
for k in range(33):
    z = -32 + 2 * k; z0, z1 = z - 0.06, z + 0.06
    for i in range(K):
        a0, a1 = ang[i], ang[i + 1]
        (xo0, yo0), (xo1, yo1) = at(a0, R), at(a1, R); (xi0, yi0), (xi1, yi1) = at(a0, R - 0.28), at(a1, R - 0.28)
        face(D, [(xi0, yi0, z0), (xi1, yi1, z0), (xi1, yi1, z1), (xi0, yi0, z1)], "white_steel", (-math.sin((a0+a1)/2), -math.cos((a0+a1)/2), 0))
        face(D, [(xi0, yi0, z0), (xi1, yi1, z0), (xo1, yo1, z0), (xo0, yo0, z0)], "white_steel", (0, 0, -1))
        face(D, [(xi0, yi0, z1), (xi1, yi1, z1), (xo1, yo1, z1), (xo0, yo0, z1)], "white_steel", (0, 0, 1))
for a in ang[3:-3:3]:
    (xo, yo), (xi, yi) = at(a, R), at(a, R - 0.14); tx, ty = math.cos(a) * 0.05, -math.sin(a) * 0.05
    q = [(xo - tx, yo - ty), (xo + tx, yo + ty), (xi + tx, yi + ty), (xi - tx, yi - ty)]
    for j in range(4):
        (pa, qa), (pb, qb) = q[j], q[(j + 1) % 4]
        face(D, [(pa, qa, -32), (pb, qb, -32), (pb, qb, 32), (pa, qa, 32)], "white_steel")
for zz, w in ((-32, 1), (32, -1)):
    face(S, [(x, y, zz) for x, y in [at(a, R + 0.02) for a in ang]], "plaster", (0, 0, w))

# ---------- export ----------
off = {}
for name, m in M.items():
    xs = [p[0] for p in m.v]; ys = [p[1] for p in m.v]; zs_ = [p[2] for p in m.v]
    o = ((min(xs) + max(xs)) / 2, min(ys), (min(zs_) + max(zs_)) / 2); off[name] = {"x": round(o[0], 4), "y": round(o[1], 4), "z": round(o[2], 4)}
    verts = [(p[0] - o[0], -(p[2] - o[2]), p[1] - o[1]) for p in m.v]       # game (x,y,z) -> blender (x,-z,y)
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], m.f); me.update()
    names = sorted(set(m.m)); mats = {}
    for nm in names:
        spec = MAT[nm]; mt = bpy.data.materials.get(nm)
        if mt is None:
            mt = bpy.data.materials.new(nm); mt.use_nodes = True; mt.use_backface_culling = False
            bs = mt.node_tree.nodes["Principled BSDF"]
            bs.inputs["Base Color"].default_value = (*lin(spec.get("color", "ffffff")), 1)
            bs.inputs["Roughness"].default_value = spec.get("rough", 0.5); bs.inputs["Metallic"].default_value = spec.get("metal", 0.0)
            if "tex" in spec:
                im = mt.node_tree.nodes.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(TEX + spec["tex"])
                if "color" in spec:
                    mix = mt.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1
                    mt.node_tree.links.new(im.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (*lin(spec["color"]), 1)
                    mt.node_tree.links.new(mix.outputs[2], bs.inputs["Base Color"])
                else: mt.node_tree.links.new(im.outputs["Color"], bs.inputs["Base Color"])
            if "emit" in spec:
                bs.inputs["Emission Color"].default_value = (*lin(spec["color"]), 1); bs.inputs["Emission Strength"].default_value = spec["emit"]
            if "alpha" in spec:
                bs.inputs["Alpha"].default_value = spec["alpha"]
                try: mt.surface_render_method = "BLENDED"
                except Exception: mt.blend_method = "BLEND"
        me.materials.append(mt); mats[nm] = len(me.materials) - 1
    me.polygons.foreach_set("material_index", [mats[x] for x in m.m])
    me.polygons.foreach_set("use_smooth", m.sm)
    uvl = me.uv_layers.new(name="UVMap"); flat = []
    for poly, uv in zip(me.polygons, m.uv):
        for k, li in enumerate(poly.loop_indices): pass
        flat += [c for p in uv for c in p]
    uvl.data.foreach_set("uv", flat)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", use_selection=True, export_apply=True, export_image_format="AUTO")
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    print("GLB", name, "tris", tris, "offset", off[name])
json.dump(off, open(OUT + "offsets.json", "w"))
