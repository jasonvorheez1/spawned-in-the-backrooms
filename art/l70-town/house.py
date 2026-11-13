# Level 70 Burns Crescent house (SPOT.house): a 2000s Canadian suburban house under snow, walkable ground floor raised three steps
# (hall, living room with a cold brick fireplace, kitchen) and a windowless concrete storm cellar bermed in snow against its north wall,
# three steps down from the kitchen, floor on the ground. Authored in world-local metres: x east (front door faces +x), y up, z south.
# Out: /workspace/l70/house.glb (slots siding trim shingle glass concrete brick wall ceiling floor lino door steel snow ice soot bulb)
#      /workspace/l70/house-col.glb (the shell a body touches).   blender -b --factory-startup --python-exit-code 1 --python art/l70-town/house.py
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "l7kit"))
from l7lib import Kit
from mathutils import Vector, noise
OUT = "/workspace/l70"; os.makedirs(OUT, exist_ok=True)
FL, CE, HT, T = 0.54, 3.14, 3.3, 0.2
PITCH = math.atan(0.667); EAVE = 0.45; HY = 3.5 + EAVE; RIDGE = HT + 3.5 * 0.667 + 0.05; LEN = 10.7; SLOPE = HY / math.cos(PITCH)
EXT = [  # (axis the wall runs along, fixed coord of its centre, outward sign, a0, a1, gaps (a, b, lo, hi))
    ("z", 4.9, 1, -3.5, 3.5, [(-0.55, 0.55, FL, FL + 2.3), (1.6, 2.8, FL + 0.9, FL + 2.1), (-2.8, -1.6, FL + 0.9, FL + 2.1)]),
    ("z", -4.9, -1, -3.5, 3.5, [(-2.6, -1.5, FL + 1.05, FL + 2.1)]),
    ("x", 3.4, 1, -5, 5, [(-3.6, -2.2, FL + 0.8, FL + 2.1), (-0.9, 0.5, FL + 0.8, FL + 2.1), (2.9, 4.0, FL + 0.9, FL + 2.1)]),
    ("x", -3.4, -1, -5, 5, [(-3.5, -2.5, FL, FL + 2.3), (0.6, 1.7, FL + 1.05, FL + 2.1)]),
]
INT = [("x", -0.5, -4.8, 2.0, [(-1.6, -0.5, FL, FL + 2.3)]), ("z", 2.0, -3.3, 3.3, [(1.0, 2.1, FL, FL + 2.3), (-2.4, -1.3, FL, FL + 2.3)])]
def build(col):
    k = Kit(7070)
    names = "siding trim shingle glass concrete brick wall ceiling floor lino door steel snow ice soot bulb".split()
    rgb = {"siding": (.62, .64, .6), "trim": (.86, .86, .84), "shingle": (.15, .15, .16), "glass": (.03, .05, .07), "concrete": (.42, .42, .41), "brick": (.42, .2, .15), "wall": (.74, .72, .64),
           "ceiling": (.82, .81, .77), "floor": (.42, .3, .18), "lino": (.6, .58, .5), "door": (.3, .1, .09), "steel": (.5, .52, .54), "snow": (.9, .93, .97), "ice": (.75, .86, .95), "soot": (.03, .03, .03), "bulb": (1, .85, .6)}
    m = {n: k.mat(n, rgb[n], 0.25 if n in ("glass", "ice") else 0.85, 0.9 if n == "steel" else 0, emit=(1, .8, .5) if n == "bulb" else None) for n in names}
    def bx(x0, x1, y0, y1, z0, z1, mat, rot=(0, 0, 0)):
        if x1 - x0 < 0.004 or y1 - y0 < 0.004 or z1 - z0 < 0.004: return
        k.box(((x0 + x1) / 2, -(z0 + z1) / 2, (y0 + y1) / 2), (x1 - x0, z1 - z0, y1 - y0), m[mat], rot=rot)
    def run(ax, c, t, a0, a1, y0, y1, mat):  # a slab along axis ax at fixed coord c
        if ax == "x": bx(a0, a1, y0, y1, c - t / 2, c + t / 2, mat)
        else: bx(c - t / 2, c + t / 2, y0, y1, a0, a1, mat)
    def wall(ax, c, t, a0, a1, y0, y1, gaps, mat, base=None):
        cuts = sorted({a0, a1, *[g[0] for g in gaps], *[g[1] for g in gaps]})
        for u0, u1 in zip(cuts, cuts[1:]):
            mid = (u0 + u1) / 2; g = next((g for g in gaps if g[0] < mid < g[1]), None)
            if not g: run(ax, c, t, u0, u1, y0, y1, mat)
            else: run(ax, c, t, u0, u1, y0, g[2], mat); run(ax, c, t, u0, u1, g[3], y1, mat)
            if base and (not g or g[2] > FL + 0.2):
                for s in base: run(ax, c + s * (t / 2 + 0.008), 0.016, u0, u1, FL, FL + 0.1, "trim")
    def pb(ax, c, s, u, o, y, su, so, sy, mat):  # a box on a wall: u along, o out from the wall's centre, y up
        if ax == "x": bx(u - su / 2, u + su / 2, y - sy / 2, y + sy / 2, c + s * o - so / 2, c + s * o + so / 2, mat)
        else: bx(c + s * o - so / 2, c + s * o + so / 2, y - sy / 2, y + sy / 2, u - su / 2, u + su / 2, mat)
    def mound(cx, cz, rx, rz, h, y0=0.0, mat="snow", seg=24, rings=10, seed=0.0):
        if col: return
        top = k.bm.verts.new((cx, -cz, y0 + h * (1 + 0.15 * noise.noise(Vector((cx, cz, seed)))))); prev = None
        for j in range(1, rings + 1):
            f = j / rings; ring = []
            for i in range(seg):
                a = i / seg * math.tau; n = noise.noise(Vector((cx + math.cos(a) * f * 2.1, cz + math.sin(a) * f * 2.1, seed + 3.3)))
                r = f * (1 + 0.22 * n); ring.append(k.bm.verts.new((cx + math.cos(a) * rx * r, -(cz + math.sin(a) * rz * r), y0 - 0.06 * (f > 0.99) + h * (math.cos(f * math.pi / 2) ** 0.55) * (1 + 0.25 * n))))
            for i in range(seg):
                a, b = ring[i], ring[(i + 1) % seg]
                fc = k.bm.faces.new([top, a, b]) if prev is None else k.bm.faces.new([prev[i], a, b, prev[(i + 1) % seg]])
                fc.material_index = m[mat]
            prev = ring
    def sheet(P, nu, nv, mat="snow"):  # a smooth grid; P(u, v) -> world-local (x, y, z); faces up for u along +x, v along +z order
        if col: return
        g = [[k.bm.verts.new((p[0], -p[2], p[1])) for p in (P(i / nu, j / nv) for i in range(nu + 1))] for j in range(nv + 1)]
        for j in range(nv):
            for i in range(nu): k.bm.faces.new([g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]]).material_index = m[mat]
    # ---------- shell: exterior walls, partitions, floors, ceiling, foundation
    for ax, c, s, a0, a1, gaps in EXT:
        cg = [g for g in gaps if g[2] <= FL + 0.01] if col else gaps
        wall(ax, c, T, a0, a1, FL - 0.02, HT, cg, "wall", base=[-s])
        run(ax, c, T + 0.04, a0, a1, -0.3, FL - 0.02, "concrete")
        if col: continue
        y = FL - 0.04; d = (-s if ax == "x" else s)
        while y < HT - 0.05:  # lap siding, each board's foot kicked out
            yc = y + 0.1; cuts = sorted([(g[0] - 0.09, g[1] + 0.09) for g in gaps if g[2] - 0.09 < yc < g[3] + 0.09]); u = a0 - 0.02
            for a, b in cuts + [(a1 + 0.02, a1 + 0.02)]:
                if a - u > 0.05:
                    if ax == "x": k.box(((u + a) / 2, -(c + s * 0.115), yc), (a - u, 0.022, 0.2), m["siding"], rot=(0.09 * d, 0, 0))
                    else: k.box((c + s * 0.115, -(u + a) / 2, yc), (0.022, a - u, 0.2), m["siding"], rot=(0, -0.09 * d, 0))
                u = max(u, b)
            y += 0.19
        for u in (a0 + 0.05, a1 - 0.05): pb(ax, c, s, u, 0.13, (HT + FL) / 2, 0.14, 0.05, HT - FL + 0.1, "trim")
        pb(ax, c, s, (a0 + a1) / 2, 0.125, HT - 0.09, a1 - a0, 0.04, 0.18, "trim")
        for a, b, lo, hi in gaps:
            w, h, cu, door = b - a, hi - lo, (a + b) / 2, lo <= FL + 0.01
            for o in (0.13, -0.11):  # casing outside and in
                pb(ax, c, s, cu, o, hi + 0.06, w + 0.26, 0.05, 0.12, "trim")
                for du in (-w / 2 - 0.055, w / 2 + 0.055): pb(ax, c, s, cu + du, o, lo + h / 2, 0.11, 0.05, h, "trim")
                if not door: pb(ax, c, s, cu, o + (0.03 if o > 0 else -0.03), lo - 0.04, w + 0.3, 0.1, 0.07, "trim")
            if not door:
                pb(ax, c, s, cu, 0.0, lo + h / 2, w, 0.02, h, "glass"); pb(ax, c, s, cu, 0.03, lo + h / 2, w, 0.04, 0.05, "trim")
                for du in (-w / 4, 0, w / 4): pb(ax, c, s, cu + du, 0.03, lo + h / 2, 0.022, 0.03, h, "trim")
                pb(ax, c, s, cu, 0.03, lo + h * 0.75, w, 0.03, 0.022, "trim")
                sheet(lambda u, v, a=a, w=w, lo=lo: (lambda q: (q[0], lo + 0.02 + 0.09 * math.sin(u * math.pi) * (1 - v) * (1.2 + noise.noise(Vector((u * 3, a, 1)))), q[1]))(((a + u * w), c + s * (0.1 + v * 0.12)) if ax == "x" else (c + s * (0.1 + v * 0.12), a + u * w)), 8, 2)  # snow on the sill
    for ax, c, a0, a1, gaps in INT: wall(ax, c, 0.12, a0, a1, FL, CE, gaps, "wall", base=[-1, 1])
    if not col:
        for ax, c, a0, a1, gaps in INT:
            for a, b, lo, hi in gaps:
                for o in (0.07, -0.07):
                    pb(ax, c, 1, (a + b) / 2, o, hi + 0.05, b - a + 0.2, 0.02, 0.1, "trim")
                    for u in (a - 0.05, b + 0.05): pb(ax, c, 1, u, o, (lo + hi) / 2, 0.1, 0.02, hi - lo, "trim")
    bx(-4.8, 4.8, FL - 0.1, FL, -3.3, 3.3, "floor"); bx(-4.8, 1.94, FL, FL + 0.006, -3.3, -0.56, "lino")
    bx(-4.9, 4.9, CE, CE + 0.1, -3.4, 3.4, "ceiling")
    # ---------- roof: decks, fascia, gables, then the snow load
    for g in (1, -1):  # g = Blender y sign (g = 1 is the north slope)
        k.box((0, g * HY / 2, RIDGE - HY / 2 * 0.667), (LEN, SLOPE, 0.09), m["shingle"], rot=(-g * PITCH, 0, 0))
        if col: continue
        ye = RIDGE - HY * 0.667
        bx(-LEN / 2, LEN / 2, ye - 0.2, ye + 0.02, -g * HY - 0.04 if g > 0 else g * -HY + 0.0, (-g * HY) + 0.0 if g > 0 else HY + 0.04, "trim")
        bx(-LEN / 2, LEN / 2, ye - 0.16, ye - 0.03, min(-g * (HY + 0.04), -g * (HY + 0.17)), max(-g * (HY + 0.04), -g * (HY + 0.17)), "steel")
        bx(-5, 5, HT - 0.02, HT, min(-g * 3.5, -g * HY), max(-g * 3.5, -g * HY), "trim")
        for xs in (-1, 1): k.box((xs * (LEN / 2 - 0.02), g * HY / 2, RIDGE - HY / 2 * 0.667 - 0.07), (0.05, SLOPE + 0.05, 0.22), m["trim"], rot=(-g * PITCH, 0, 0))
        def snow(u, v, g=g):
            x = (u - 0.5) * (LEN + 0.16); d = v * (SLOPE + 0.16); e = min(u, 1 - u) * (LEN + 0.16); e = min(e, (1 - v) * (SLOPE + 0.16))
            f = min(1, e / 0.3) ** 0.5; n = noise.noise(Vector((x * 0.7, g * d * 0.7, 5.0)))
            h = 0.06 + (0.36 + 0.14 * n + 0.1 * v) * f - (0.22 * (1 - f) if v > 0.97 else 0)
            return (x, RIDGE - d * math.sin(PITCH) + 0.03 + h, -g * d * math.cos(PITCH))
        if g > 0: sheet(lambda u, v: snow(1 - u, v), 40, 16)
        else: sheet(snow, 40, 16)
        x = -LEN / 2 + 0.2
        while x < LEN / 2 - 0.2:  # icicles off the gutter
            L = k.R.uniform(0.12, 0.75) * (1.5 if abs(x - 1.5) < 1 else 1)
            k.cyl((x, g * (HY + 0.13), ye - 0.16 - L / 2), 0.004, L, m["ice"], verts=6, r2=k.R.uniform(0.018, 0.04)); x += k.R.uniform(0.07, 0.4)
    for xs in (1, -1):
        y = HT
        while y < RIDGE - 0.15:
            half = (RIDGE - y - 0.16) / 0.667
            if col: break
            if half > 0.05: k.box((xs * 5.015, 0, y + 0.1), (0.022, 2 * half, 0.2), m["siding"], rot=(0, xs * -0.09, 0))
            y += 0.19
        if col: k.poly([(-3.5, HT), (3.5, HT), (0, RIDGE)], m["wall"], 0.2, M=k.M((xs * 4.9, 0, 0), rot=(0, 0, math.pi / 2)))
        else: k.poly([(-3.5, HT), (3.5, HT), (0, RIDGE - 0.1)], m["wall"], 0.16, M=k.M((xs * 4.9, 0, 0), rot=(0, 0, math.pi / 2)))
        pb("z", xs * 4.9, xs, 0, 0.14, HT + 1.1, 0.5, 0.05, 0.6, "trim")
        for j in range(5): k.box((xs * 5.07, 0, HT + 0.9 + j * 0.1), (0.02, 0.4, 0.035), m["steel"], rot=(0, xs * 0.5, 0))
    # ---------- front porch (east): slab, three steps, posts, a shed roof under snow, the six-panel door swung in
    bx(5.0, 6.4, -0.3, FL, -1.3, 1.3, "concrete"); bx(6.4, 6.7, -0.3, 0.36, -1.3, 1.3, "concrete"); bx(6.7, 7.0, -0.3, 0.18, -1.3, 1.3, "concrete")
    for zs in (-1.18, 1.18): bx(6.2, 6.32, FL, 2.95, zs - 0.06, zs + 0.06, "trim")
    k.box((5.9, 0, 3.05), (1.9, 2.8, 0.1), m["shingle"], rot=(0, 0.14, 0))
    if not col:
        k.box((6.83, 0, 2.87), (0.04, 2.8, 0.2), m["trim"])
        sheet(lambda u, v: (5.0 + u * 1.95, 3.16 - u * 0.27 + 0.3 * (min(1, min(1 - u, v, 1 - v) / 0.18) ** 0.5) * (1 + 0.3 * noise.noise(Vector((u * 2, v * 3, 9)))) - (0.1 if u > 0.98 else 0), -1.45 + v * 2.9), 10, 14)
        sheet(lambda u, v: (5.05 + u * 1.3, FL + 0.01 + 0.12 * (math.sin(v * math.pi) ** 0.3) * (0.4 + abs(v - 0.5) * 2.4) * (1 + noise.noise(Vector((u * 4, v * 4, 2)))) * (1 - u * 0.6), -1.28 + v * 2.56), 8, 12)
        for (x0, x1, y0, y1) in ((0.08, 0.5, 0.25, 0.9), (0.6, 1.02, 0.25, 0.9), (0.08, 0.5, 1.02, 1.5), (0.6, 1.02, 1.02, 1.5), (0.08, 0.5, 1.62, 1.95), (0.6, 1.02, 1.62, 1.95)):
            bx(4.78 - x1, 4.78 - x0, FL + y0, FL + y1, -0.645, -0.59, "door")
        bx(4.76, 4.8, FL + 1.0, FL + 1.06, -0.6, -0.52, "steel")
    bx(3.68, 4.78, FL + 0.01, FL + 2.28, -0.64, -0.6, "door")
    # ---------- chimney on the west wall and the cold brick fireplace inside (living room, z = 1.4)
    bx(-5.55, -5.0, -0.3, RIDGE + 0.5, 0.8, 2.0, "brick"); bx(-4.8, -4.45, FL, CE, 0.5, 2.3, "brick")
    if not col:
        bx(-5.6, -4.95, RIDGE + 0.5, RIDGE + 0.6, 0.74, 2.06, "concrete"); mound(-5.27, 1.4, 0.36, 0.7, 0.28, RIDGE + 0.6)
        bx(-4.46, -4.43, FL + 0.12, FL + 0.82, 0.98, 1.82, "soot"); bx(-4.45, -4.0, FL, FL + 0.12, 0.4, 2.4, "brick")
        bx(-4.47, -4.3, FL + 1.22, FL + 1.3, 0.42, 2.38, "trim"); bx(-4.46, -4.36, FL + 1.12, FL + 1.22, 0.5, 2.3, "trim")
        for zz in (0.94, 1.86): bx(-4.46, -4.41, FL + 0.12, FL + 0.86, zz - 0.04, zz + 0.04, "steel")
        bx(-4.46, -4.41, FL + 0.82, FL + 0.9, 0.9, 1.9, "steel"); mound(-4.3, 1.4, 0.12, 0.3, 0.06, FL + 0.12, "soot", 10, 3)
        for cx, cz in ((-1.4, 1.4), (-1.4, -1.9), (3.4, 0)):  # ceiling fixtures
            k.cyl((cx, -cz, CE - 0.02), 0.17, 0.04, m["steel"], verts=20); k.sph((cx, -cz, CE - 0.06), (0.15, 0.15, 0.07), m["bulb"], seg=16, rings=6)
    # ---------- the storm cellar: concrete shell on the ground against the north wall, three steps down from the kitchen
    wall("z", -4.875, 0.25, -7.6, -3.5, -0.3, 2.6, [], "concrete"); wall("z", -0.125, 0.25, -7.6, -3.5, -0.3, 2.6, [], "concrete")
    wall("x", -7.475, 0.25, -5, 0, -0.3, 2.6, [], "concrete"); wall("x", -3.56, 0.12, -4.75, -0.25, 0, 2.6, [(-3.5, -2.5, FL, FL + 2.3)], "concrete")
    bx(-4.75, -0.25, -0.12, 0.02, -7.35, -3.5, "concrete"); bx(-5.1, 0.1, 2.6, 2.84, -7.7, -3.5, "concrete")
    bx(-3.5, -2.5, 0, FL, -3.62, -3.3, "concrete"); bx(-3.5, -2.5, 0, 0.36, -3.92, -3.62, "concrete"); bx(-3.5, -2.5, 0, 0.18, -4.22, -3.92, "concrete")
    bx(-2.5, -1.46, FL + 0.01, FL + 1.98, -3.28, -3.24, "steel")  # the cellar's steel door, open against the kitchen wall
    if not col:
        for u in (-3.55, -2.45): bx(u - 0.04, u + 0.04, FL, FL + 2.34, -3.66, -3.28, "steel")
        bx(-3.59, -2.41, FL + 2.3, FL + 2.38, -3.66, -3.28, "steel"); bx(-3.52, -3.48, 0.2, 1.3, -4.2, -3.64, "steel", rot=(0, 0, 0))
        sheet(lambda u, v: (-5.25 + u * 5.5, 2.86 + 0.42 * (min(1, min(u, 1 - u, v) / 0.12) ** 0.5) * (1 + 0.3 * noise.noise(Vector((u * 4, v * 3, 4)))), -7.85 + v * 4.4), 22, 16)
        i = 0
        for (cx, cz, rx, rz, h) in [(-5.6, -4.4, 1.5, 1.6, 1.5), (-5.7, -6.3, 1.6, 1.7, 1.75), (-4.3, -8.0, 1.8, 1.4, 1.6), (-2.3, -8.2, 1.7, 1.5, 1.85), (-0.5, -7.9, 1.6, 1.5, 1.55), (0.6, -6.0, 1.4, 1.7, 1.7), (0.6, -4.3, 1.3, 1.3, 1.3),
                                    (2.5, -3.9, 1.6, 0.9, 0.7), (4.4, -3.8, 1.2, 0.9, 0.55), (-5.4, -1.8, 0.9, 1.7, 0.75), (-5.9, 1.4, 0.9, 1.3, 0.6), (-5.2, 3.2, 1.0, 1.2, 0.8), (-2.6, 3.95, 1.9, 0.9, 0.7), (1.0, 3.9, 2.0, 0.8, 0.55), (4.2, 3.8, 1.3, 0.9, 0.8),
                                    (5.5, 2.4, 0.9, 1.1, 0.7), (5.5, -2.4, 0.9, 1.1, 0.75), (7.1, 1.6, 0.6, 0.5, 0.3), (7.1, -1.6, 0.6, 0.5, 0.32)]:
            mound(cx, cz, rx, rz, h, seed=i * 1.7); i += 1
    if not col: k.cyl((-2.5, 5.4, 2.25), 0.008, 0.7, m["steel"], verts=6); k.sph((-2.5, 5.4, 1.86), (0.04, 0.04, 0.055), m["bulb"], seg=12, rings=6)  # the cellar's hanging bulb
    ob = k.finish("l70_house_col" if col else "l70_house")
    if not col:
        import bmesh, bpy
        smooth = {m["snow"], m["ice"], m["bulb"]}
        for p in ob.data.polygons: p.use_smooth = p.material_index in smooth
        bm = bmesh.new(); bm.from_mesh(ob.data); sn = [f for f in bm.faces if f.material_index == m["snow"]]
        for f in sn:  # snow faces look up or out, never down
            if f.normal.z < -0.2: f.normal_flip()
        bm.to_mesh(ob.data); bm.free()
    k.export(os.path.join(OUT, "house-col.glb" if col else "house.glb"))
    if not col: k.proof(OUT, {"house_a": ((15, -9, 4.5), (0, 1, 2.2)), "house_b": ((-12, 14, 5), (-2, 3, 2)), "house_c": ((4.2, -2.6, 2.1), (-4.6, -1.4, 1.5))})
build(False); build(True)
