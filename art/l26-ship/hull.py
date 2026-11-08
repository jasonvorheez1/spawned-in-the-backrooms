# the hull: lofted liner, sheer rising to a raked flared bow, cruiser stern, boot-top, name decals, hawse and anchors, teak deck
import math
from lib import *
def h_edge(z):
    if z > -24: return 0.15
    t = min(1.0, (-24 - z) / 28); ss = min(1, t / 0.25); ss = ss * ss * (3 - 2 * ss)
    return 0.15 + ss * 1.0 + t * 0.6
def zrange(y):
    d = -y / 12.0; return -52 + 6 * d, 58 - 4 * d
def half(z, y):
    d = -y / 12.0; Wy = 10 - 0.5 * d * d
    if z < -30: Lb = 22 - 6 * d; return max(0.0, Wy * (1 - ((z + 30) / Lb) ** 2))
    if z > 40: Ls = 18 - 4 * d; return Wy * math.sqrt(max(0.0, 1 - ((z - 40) / Ls) ** 2))
    return Wy
N = 90
S = [0.5 - 0.5 * math.cos(math.pi * k / N) for k in range(N + 1)]
def zat(s, y): zb, zs = zrange(y); return zb + (zs - zb) * s
def ring(yfun, inset=0.0):
    pts = []
    for s in S:
        y = yfun(zat(s, 0)); z = zat(s, y); pts.append((max(0.0, half(z, y) - inset), y, z))
    star = pts; port = [(-p[0], p[1], p[2]) for p in reversed(pts[:-1])]
    return star + port + [star[0]]
def uv_ring(r):
    u = 0.0; out = []
    for i, p in enumerate(r):
        if i: u += math.dist(p, r[i - 1])
        out.append((u / 16.0, 1 - (h_edge(p[2]) - p[1]) / 16.0))
    return out
def build_hull():
    hp = mat("hull_paint", tex="hull_paint.jpg", rough=0.55)
    boot = mat("boot_navy", (0.02, 0.03, 0.08), rough=0.5)
    anti = mat("antifouling", (0.25, 0.05, 0.04), rough=0.7)
    cap = mat("gunwale_cap", (0.75, 0.75, 0.72), rough=0.5)
    teak = mat("teak", tex="teak.jpg", rough=0.8)
    M = Mesh()
    levels = [None, -0.6, -2.0, -4.0, -6.0, -8.0, -10.0, -11.4, -12.6, -13.3, -14.0]
    rings = [ring((lambda z: h_edge(z)) if y is None else (lambda z, y=y: y)) for y in levels]
    uvs = [uv_ring(r) for r in rings]
    ids = [[M.v(p) for p in r] for r in rings]
    for j in range(len(rings) - 1):
        y0 = levels[j + 1]
        m = boot if y0 == -12.6 else (anti if y0 is not None and y0 < -12.6 else hp)
        for i in range(len(rings[0]) - 1):
            M.f([ids[j][i], ids[j + 1][i], ids[j + 1][i + 1], ids[j][i + 1]], m, [uvs[j][i], uvs[j + 1][i], uvs[j + 1][i + 1], uvs[j][i + 1]])
    bot = ids[-1][:-1]; M.f(list(reversed(bot)), anti)
    # bulwark: inner face from the edge down to the deck, capped
    inner_top = ring(lambda z: h_edge(z), 0.14); inner_bot = ring(lambda z: 0.0, 0.14)
    it = [M.v(p) for p in inner_top]; ib = [M.v(p) for p in inner_bot]
    for i in range(len(it) - 1):
        M.f([ids[0][i], ids[0][i + 1], it[i + 1], it[i]], cap)
        u0, u1 = i * 0.5, (i + 1) * 0.5
        M.f([it[i], it[i + 1], ib[i + 1], ib[i]], hp, [(0.2, 0.995), (0.2, 0.995), (0.2, 0.99), (0.2, 0.99)])
    # teak deck at y=0
    dk = [M.v(p) for p in inner_bot[:-1]]
    M.f(dk, teak, [(p[0] / 4, -p[2] / 4) for p in inner_bot[:-1]])
    hull = M.build("hull", angle=1.0)
    parts = [hull]
    # name decals on both bow flanks: ADVENTURE crossed out, SS Fun =) sprayed under it
    dm = mat("hull_name", tex="hull_name_c.png", rough=0.5, alpha=True)
    for side in (1, -1):
        D = Mesh(); rows = []; uvr = []
        for jy in range(9):
            row = []; ur = []
            for iz in range(25):
                z = -30 - 18 * iz / 24
                top = h_edge(z) - 0.45; y = top - 6 * jy / 8
                x = half(z, y); dx = (half(z + 0.05, y) - half(z - 0.05, y)) / 0.1
                n = (1, dx); ln = math.hypot(*n); off = 0.035
                row.append((side * (x + off / ln), y, z - off * (-dx) / ln * 0 + off * dx / ln * 0))
                u = (iz / 24) if side == 1 else (1 - iz / 24)
                ur.append((u, 1 - jy / 8))
            rows.append(row); uvr.append(ur)
        D.loft(rows, dm, uvr); parts.append(D.build(f"name{side}", angle=1.2))
    # hawse pipes and stowed anchors
    rust = mat("anchor_iron", (0.08, 0.06, 0.05), rough=0.8, metal=0.6)
    dark = mat("hawse_dark", (0.01, 0.01, 0.01), rough=0.9)
    for side in (1, -1):
        z = -45.5; y = -1.6; x = half(z, y) + 0.03
        o = sphere(f"hawse{side}", (side * x, y, z), 0.55, dark, (0.12, 0.8, 1.1)); parts.append(o)
        o = sphere(f"hawsering{side}", (side * (x - 0.02), y, z), 0.62, rust, (0.1, 0.9, 1.2)); parts.append(o)
        xs = side * (half(z, y - 1.4) + 0.12)
        parts.append(rbox(f"shank{side}", (xs, y - 1.3, z), (0.22, 1.9, 0.26), rust, 0.06))
        parts.append(rbox(f"crown{side}", (xs, y - 2.25, z), (0.3, 0.35, 1.4), rust, 0.1))
        for dz in (-0.6, 0.6):
            parts.append(rbox(f"fluke{side}{dz}", (xs + side * 0.05, y - 1.95, z + dz), (0.2, 0.75, 0.42), rust, 0.08, pitch=0, roll=0))
    # bow fittings: windlass and bollards
    gm = mat("deck_machinery", (0.22, 0.28, 0.24), rough=0.6, metal=0.3)
    for side in (1, -1):
        parts.append(cyl(f"windlass{side}", (side * 1.6, 0, -40), 0.55, 0.7, gm, 20))
        parts.append(cyl(f"windlasscap{side}", (side * 1.6, 0.7, -40), 0.35, 0.18, gm, 20, 0.3))
        for z in (-36, -20, 0, 20, 38):
            x = side * (half(z, 0) - 0.7)
            for dz in (-0.25, 0.25):
                parts.append(cyl(f"bol{side}{z}{dz}", (x, 0, z + dz), 0.13, 0.45, gm, 14))
                parts.append(cyl(f"bolcap{side}{z}{dz}", (x, 0.45, z + dz), 0.17, 0.05, gm, 14))
    return parts
