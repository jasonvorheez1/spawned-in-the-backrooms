# Level 11 citizen apartment (places/level11/sim.js section 21): shell, floor, stoop, rails and every furnishing, each its own .glb.
# Built in game world coords; each model is recentred on its bbox bottom-centre and its world feet go to place.json (sim reads them).
# Run: blender -b --factory-startup --python-exit-code 1 --python art/l11-apartment/build.py   (out: /workspace/l11apt)
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from mathutils import Matrix, Vector
OUT = "/workspace/l11apt"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
R = random.Random(11)
FY, CY = 0.32, 3.7
X0, X1, Z0, Z1, BT = -49.6, -39.4, 53.9, 62.1, 0.12
xi0, xi1, zi0, zi1 = -49.35, -39.65, 54.15, 61.85
PY = 4.42; DZ0, DZ1, DY1 = 57.2, 58.8, FY + 2.4
WY0, WY1 = FY + 1.05, FY + 2.45; WN, WS = -46.2, -44.5  # window centres (x) on north / south walls
CEN = (-44.5, 58.0)

MATS = {
    "brick": ((0.36, 0.2, 0.15), 0.9), "plaster": ((0.86, 0.8, 0.66), 0.85), "wainscot": ((0.3, 0.17, 0.09), 0.6), "trim": ((0.3, 0.18, 0.1), 0.55),
    "paint": ((0.86, 0.84, 0.78), 0.6), "ceiling": ((0.84, 0.83, 0.78), 0.9), "stone": ((0.55, 0.53, 0.5), 0.85),
    "glass": ((0.55, 0.65, 0.7), 0.05, 0.0, None, 0.3), "brass": ((0.7, 0.5, 0.25), 0.35, 1.0), "floor": ((0.42, 0.27, 0.15), 0.6),
    "concrete": ((0.55, 0.54, 0.5), 0.9), "iron": ((0.04, 0.04, 0.04), 0.5, 0.8), "velvet": ((0.07, 0.2, 0.09), 0.9), "wood": ((0.28, 0.15, 0.07), 0.45),
    "cloth": ((0.62, 0.5, 0.3), 0.9), "bakelite": ((0.1, 0.05, 0.02), 0.35), "dial": ((1.0, 0.7, 0.3), 0.4, 0.0, ((1.0, 0.6, 0.15), 4.0)),
    "radpaint": ((0.7, 0.7, 0.66), 0.5, 0.5), "pipe": ((0.33, 0.28, 0.24), 0.7, 0.6), "cabinet": ((0.62, 0.74, 0.6), 0.5), "counter": ((0.78, 0.75, 0.68), 0.35),
    "steel": ((0.75, 0.75, 0.75), 0.25, 1.0), "blanket": ((0.38, 0.07, 0.07), 0.95), "linen": ((0.88, 0.86, 0.8), 0.9),
    "book_a": ((0.4, 0.08, 0.06), 0.7), "book_b": ((0.1, 0.25, 0.12), 0.7), "book_c": ((0.08, 0.1, 0.25), 0.7), "pages": ((0.85, 0.8, 0.66), 0.9),
    "shade": ((0.92, 0.82, 0.6), 0.9, 0.0, ((1.0, 0.75, 0.4), 0.6)), "bulb": ((1, 0.9, 0.7), 0.3, 0.0, ((1.0, 0.85, 0.6), 8.0)),
    "rug": ((0.5, 0.14, 0.12), 0.95), "fringe": ((0.85, 0.8, 0.68), 0.95), "canvas": ((0.5, 0.42, 0.3), 0.8),
    "ceramic": ((0.9, 0.88, 0.82), 0.3), "coffee": ((0.06, 0.03, 0.01), 0.15), "rubber": ((0.03, 0.03, 0.03), 0.8),
}
TILE = {"brick": 1.6, "plaster": 2.0, "wainscot": 1.0, "trim": 0.8, "paint": 1.0, "ceiling": 3.0, "stone": 1.5, "floor": 2.0, "concrete": 1.2,
        "iron": 0.5, "velvet": 0.5, "wood": 0.6, "cloth": 0.3, "radpaint": 0.6, "pipe": 0.5, "cabinet": 1.0, "counter": 1.0, "steel": 0.6,
        "blanket": 0.8, "linen": 0.8, "book_a": 0.3, "book_b": 0.3, "book_c": 0.3, "pages": 0.2, "shade": 0.5, "brass": 0.3, "ceramic": 0.3, "fringe": 0.2}
FIT = ("rug", "canvas", "dial")
MODELS = []
def done(md): ob = finish(md, MATS, TILE, FIT); MODELS.append(ob); return ob

def cells(a0, a1, y0, y1, ops):
    xs = sorted({a0, a1, *[v for o in ops for v in (o[0], o[1]) if a0 < v < a1]}); ys = sorted({y0, y1, *[v for o in ops for v in (o[2], o[3]) if y0 < v < y1]})
    cols = {}
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            mx, my = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if any(o[0] < mx < o[1] and o[2] < my < o[3] for o in ops): continue
            c = cols.setdefault((xs[i], xs[i + 1]), [])
            if c and abs(c[-1][1] - ys[j]) < 1e-9: c[-1][1] = ys[j + 1]
            else: c.append([ys[j], ys[j + 1]])
    return [(a, b, y[0], y[1]) for (a, b), ys_ in cols.items() for y in ys_]
def wall(md, m, along, a0, a1, f0, f1, y0, y1, ops):
    for a, b, c, d in cells(a0, a1, y0, y1, ops):
        if along == "x": md.bx(m, a, b, c, d, f0, f1)
        else: md.bx(m, f0, f1, c, d, a, b)

# ======================================================== SHELL: brick outside, plaster + wainscot inside, ceiling, roof, door, windows
def shell():
    md = Mdl("shell")
    wn = [(WN - 0.5, WN + 0.5, WY0, WY1)]; ws = [(WS - 0.5, WS + 0.5, WY0, WY1)]; dr = [(DZ0, DZ1, FY, DY1)]
    wall(md, "brick", "x", X0, X1, Z1 - BT, Z1, 0, PY, wn); wall(md, "plaster", "x", xi0, xi1, zi1, Z1 - BT, FY, CY, wn)
    wall(md, "brick", "x", X0, X1, Z0, Z0 + BT, 0, PY, ws); wall(md, "plaster", "x", xi0, xi1, Z0 + BT, zi0, FY, CY, ws)
    wall(md, "brick", "z", Z0 + BT, Z1 - BT, X1 - BT, X1, 0, PY, dr); wall(md, "plaster", "z", zi0, zi1, xi1, X1 - BT, FY, CY, dr)
    wall(md, "brick", "z", Z0 + BT, Z1 - BT, X0, X0 + BT, 0, PY, []); wall(md, "plaster", "z", zi0, zi1, X0 + BT, xi0, FY, CY, [])
    md.bx("ceiling", xi0, xi1, CY, CY + 0.12, zi0, zi1)
    md.bx("concrete", X0 + BT, X1 - BT, CY + 0.12, CY + 0.42, Z0 + BT, Z1 - BT)
    # coping on the parapet
    md.bx("stone", X0 - 0.05, X1 + 0.05, PY, PY + 0.07, Z1 - BT - 0.04, Z1 + 0.05, bevel=0.012)
    md.bx("stone", X0 - 0.05, X1 + 0.05, PY, PY + 0.07, Z0 - 0.05, Z0 + BT + 0.04, bevel=0.012)
    md.bx("stone", X1 - BT - 0.04, X1 + 0.05, PY, PY + 0.07, Z0 + BT + 0.05, Z1 - BT - 0.05, bevel=0.012)
    md.bx("stone", X0 - 0.05, X0 + BT + 0.04, PY, PY + 0.07, Z0 + BT + 0.05, Z1 - BT - 0.05, bevel=0.012)
    outer = [(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)]
    md.sweep("stone", outer, [(0, 3.78), (-0.05, 3.8), (-0.05, 3.86), (-0.09, 3.9), (-0.13, 3.96), (-0.17, 4.04), (-0.17, 4.1), (-0.2, 4.12), (-0.2, 4.17), (0, 4.17)], closed=True, center=CEN)
    md.sweep("stone", outer, [(0, -0.05), (-0.035, -0.05), (-0.035, 0.26), (-0.015, 0.29), (0, 0.29)], closed=True, center=CEN)
    belt = [(X1, DZ1 + 0.06), (X1, Z1), (X0, Z1), (X0, Z0), (X1, Z0), (X1, DZ0 - 0.06)]  # open across the doorway
    md.sweep("stone", belt, [(0, 1.2), (-0.025, 1.2), (-0.025, 1.28), (0, 1.28)], center=CEN)  # belt course
    # interior trim: baseboard, chair rail, crown; wainscot panels with stiles
    room = [(xi1, DZ0 - 0.1), (xi1, zi0), (xi0, zi0), (xi0, zi1), (xi1, zi1), (xi1, DZ1 + 0.1)]
    md.sweep("trim", room, [(0, FY), (0.022, FY), (0.022, FY + 0.14), (0.014, FY + 0.155), (0.014, FY + 0.175), (0, FY + 0.185)], center=CEN)
    md.sweep("trim", room, [(0, FY + 0.95), (0.02, FY + 0.95), (0.032, FY + 0.97), (0.032, FY + 0.99), (0.016, FY + 1.012), (0, FY + 1.012)], center=CEN)
    md.sweep("paint", [(xi0, zi0), (xi1, zi0), (xi1, zi1), (xi0, zi1)], [(0, CY - 0.16), (0.012, CY - 0.155), (0.02, CY - 0.13), (0.035, CY - 0.1), (0.07, CY - 0.06), (0.1, CY - 0.035), (0.11, CY - 0.02), (0.13, CY - 0.012), (0.13, CY)], closed=True, center=CEN)
    for (a, b) in zip(room[:-1], room[1:]):
        L = math.dist(a, b); d = ((b[0] - a[0]) / L, (b[1] - a[1]) / L); nrm = (-d[1], d[0])
        if (CEN[0] - a[0]) * nrm[0] + (CEN[1] - a[1]) * nrm[1] < 0: nrm = (-nrm[0], -nrm[1])
        def at(t, off): return (a[0] + d[0] * t + nrm[0] * off, a[1] + d[1] * t + nrm[1] * off)
        p0, p1 = at(0, 0.006), at(L, 0.006)
        md.bx("wainscot", min(p0[0], p1[0]) - (0.006 if nrm[0] == 0 else 0), max(p0[0], p1[0]) + (0.006 if nrm[0] == 0 else 0), FY + 0.18, FY + 0.95,
              min(p0[1], p1[1]) - (0.006 if nrm[1] == 0 else 0), max(p0[1], p1[1]) + (0.006 if nrm[1] == 0 else 0))
        n = max(1, round(L / 0.75))
        for k in range(n + 1):
            c = at(L * k / n, 0.014); w = 0.07
            sx = w if nrm[0] == 0 else 0.016; sz = w if nrm[1] == 0 else 0.016
            md.box("wainscot", (c[0], FY + 0.565, c[1]), (sx, 0.77, sz), bevel=0.004)
        c = at(L / 2, 0.014)  # top and bottom rails of the panelling
        for yy in (FY + 0.215, FY + 0.915):
            md.box("wainscot", (c[0], yy, c[1]), (L if nrm[0] == 0 else 0.016, 0.06, L if nrm[1] == 0 else 0.016), bevel=0.004)
    # doorway: threshold, jamb linings, casings, exterior brickmould and lintel
    md.bx("stone", xi1 - 0.03, X1 + 0.04, FY - 0.1, FY + 0.006, DZ0 - 0.02, DZ1 + 0.02, bevel=0.006)
    md.bx("trim", xi1 - 0.002, X1 - 0.002, FY, DY1 + 0.02, DZ0, DZ0 + 0.022); md.bx("trim", xi1 - 0.002, X1 - 0.002, FY, DY1 + 0.02, DZ1 - 0.022, DZ1)
    md.bx("trim", xi1 - 0.002, X1 - 0.002, DY1 - 0.022, DY1, DZ0, DZ1)
    for zc in (DZ0 - 0.05, DZ1 + 0.05):
        md.bx("trim", xi1 - 0.022, xi1 + 0.002, FY, DY1 + 0.1, zc - 0.055, zc + 0.055, bevel=0.005, seg=2)
        md.bx("trim", xi1 - 0.03, xi1, FY, FY + 0.2, zc - 0.062, zc + 0.062, bevel=0.004)  # plinth block
    md.bx("trim", xi1 - 0.024, xi1 + 0.002, DY1, DY1 + 0.14, DZ0 - 0.13, DZ1 + 0.13, bevel=0.005, seg=2)
    md.bx("trim", xi1 - 0.045, xi1, DY1 + 0.14, DY1 + 0.17, DZ0 - 0.16, DZ1 + 0.16, bevel=0.008, seg=2)
    for zc in (DZ0 - 0.03, DZ1 + 0.03): md.bx("trim", X1 - 0.004, X1 + 0.03, FY, DY1 + 0.06, zc - 0.035, zc + 0.035, bevel=0.006, seg=2)
    md.bx("trim", X1 - 0.004, X1 + 0.03, DY1, DY1 + 0.06, DZ0 - 0.065, DZ1 + 0.065, bevel=0.006, seg=2)
    md.bx("stone", X1 - 0.01, X1 + 0.05, DY1 + 0.06, DY1 + 0.32, DZ0 - 0.3, DZ1 + 0.3, bevel=0.012, seg=2)
    md.bx("stone", X1 - 0.01, X1 + 0.06, DY1 + 0.15, DY1 + 0.36, 57.88, 58.12, bevel=0.01)  # keystone
    # the door: panelled leaf swung back flat against the inside wall, north of the opening
    xL, z0, z1, y0, y1 = xi1 - 0.085, DZ1 + 0.1, DZ1 + 1.62, FY + 0.012, FY + 2.385
    md.bx("trim", xL - 0.022, xL + 0.022, y0, y1, z0, z1, bevel=0.004)
    for s in (-1, 1):
        xf_ = xL + s * 0.022
        for (pz0, pz1) in ((z0 + 0.13, (z0 + z1) / 2 - 0.05), ((z0 + z1) / 2 + 0.05, z1 - 0.13)):
            for (py0, py1) in ((y0 + 0.15, y0 + 0.85), (y0 + 1.0, y0 + 1.6), (y0 + 1.75, y1 - 0.15)):
                md.bx("trim", xf_ - 0.008, xf_ + 0.008, py0, py1, pz0, pz1, bevel=0.007, seg=2)
        md.lathe("brass", [(0, 0), (0.028, 0.0), (0.028, 0.008), (0.012, 0.015), (0.01, 0.045), (0.03, 0.06), (0.032, 0.075), (0.025, 0.09), (0, 0.093)],
                 Tw((xf_, y0 + 0.95, z1 - 0.075), [("Z", -90 * s)]), seg=14)
    for yy in (y0 + 0.25, y0 + 1.2, y1 - 0.25): md.cyl("brass", (xL - 0.03, yy, z0 - 0.005), 0.011, 0.011, 0.1, seg=10)
    # sash windows (north +z, south -z)
    for (xc, inner, sg) in ((WN, zi1, 1), (WS, zi0, -1)):
        zz = lambda d: inner + sg * d
        def B3(xa, xb, ya, yb, da, db, m, **k): md.bx(m, xa, xb, ya, yb, min(zz(da), zz(db)), max(zz(da), zz(db)), **k)
        xa, xb = xc - 0.5, xc + 0.5
        B3(xa, xa + 0.022, WY0, WY1, -0.002, 0.25, "paint"); B3(xb - 0.022, xb, WY0, WY1, -0.002, 0.25, "paint"); B3(xa, xb, WY1 - 0.022, WY1, -0.002, 0.25, "paint")
        B3(xa - 0.04, xb + 0.04, WY0 - 0.035, WY0, -0.07, 0.17, "paint", bevel=0.006, seg=2)  # stool
        B3(xa - 0.02, xb + 0.02, WY0 - 0.15, WY0 - 0.035, -0.02, 0.0, "paint", bevel=0.004)  # apron
        B3(xa, xb, WY0 - 0.07, WY0, 0.17, 0.33, "stone", bevel=0.01)  # outside sill
        B3(xa - 0.12, xb + 0.12, WY1, WY1 + 0.24, 0.24, 0.29, "stone", bevel=0.012, seg=2)  # lintel
        for xx in (xa - 0.045, xb + 0.045): B3(xx - 0.045, xx + 0.045, WY0, WY1 + 0.09, -0.022, 0.0, "paint", bevel=0.004, seg=2)
        B3(xa - 0.1, xb + 0.1, WY1, WY1 + 0.11, -0.024, 0.0, "paint", bevel=0.004, seg=2)
        mid = (WY0 + WY1) / 2
        for (ya, yb, da, db) in ((WY0 + 0.005, mid + 0.02, 0.07, 0.11), (mid - 0.02, WY1 - 0.025, 0.12, 0.16)):
            ix0, ix1 = xa + 0.025, xb - 0.025
            B3(ix0, ix0 + 0.05, ya, yb, da, db, "paint"); B3(ix1 - 0.05, ix1, ya, yb, da, db, "paint")
            B3(ix0, ix1, ya, ya + (0.07 if ya < mid - 0.1 else 0.035), da, db, "paint"); B3(ix0, ix1, yb - (0.035 if ya < mid - 0.1 else 0.05), yb, da, db, "paint")
            B3(xc - 0.012, xc + 0.012, ya, yb, da + 0.005, db - 0.005, "paint")
            B3(ix0 + 0.02, ix1 - 0.02, ya + 0.03, yb - 0.03, (da + db) / 2 - 0.003, (da + db) / 2 + 0.003, "glass")
        B3(xc - 0.05, xc + 0.05, mid + 0.02, mid + 0.035, 0.05, 0.07, "brass")  # sash lock
    # outside: a brass lantern by the door, a number plate and a downspout
    lx, ly, lz = X1 + 0.02, 2.3, DZ1 + 0.45
    md.bx("iron", lx, lx + 0.02, ly - 0.12, ly + 0.12, lz - 0.05, lz + 0.05, bevel=0.005)
    md.tube("iron", [(lx + 0.01, ly, lz), (lx + 0.12, ly + 0.02, lz), (lx + 0.16, ly - 0.02, lz)], 0.008, seg=8)
    md.lathe("brass", [(0, 0), (0.06, 0), (0.07, 0.02), (0.07, 0.03), (0.05, 0.03)], Tw((lx + 0.16, ly - 0.32, lz)), seg=12)
    md.lathe("glass", [(0.05, 0.03), (0.075, 0.2), (0.07, 0.24)], Tw((lx + 0.16, ly - 0.32, lz)), seg=12)
    md.lathe("bulb", [(0, 0.04), (0.025, 0.08), (0.03, 0.12), (0, 0.17)], Tw((lx + 0.16, ly - 0.32, lz)), seg=10)
    md.lathe("brass", [(0.075, 0.24), (0.09, 0.25), (0.05, 0.31), (0.012, 0.33), (0, 0.35)], Tw((lx + 0.16, ly - 0.32, lz)), seg=12)
    md.bx("brass", X1, X1 + 0.012, 2.05, 2.2, DZ0 - 0.42, DZ0 - 0.22, bevel=0.004)
    sx, sz = X1 + 0.07, Z1 - 0.35
    md.tube("pipe", [(sx - 0.07, 4.0, sz), (sx, 3.95, sz), (sx, 3.85, sz), (sx, 0.25, sz), (sx + 0.08, 0.08, sz), (sx + 0.22, 0.05, sz)], 0.045, seg=12)
    md.lathe("pipe", [(0.05, 0), (0.1, 0.1), (0.1, 0.22), (0.05, 0.22)], Tw((sx, 3.95, sz)), seg=12)
    for yy in (0.9, 2.2, 3.4): md.tube("pipe", [(X1 - 0.01, yy, sz), (sx, yy, sz)], 0.012, seg=6)
    return done(md)

def floor():
    md = Mdl("floor"); md.bx("floor", xi0 - 0.01, xi1 + 0.01, 0.0, FY, zi0 - 0.01, zi1 + 0.01); return done(md)

def stoop():
    md = Mdl("stoop"); za, zb = 56.95, 59.05
    md.bx("concrete", X1 - 0.02, -38.1, -0.05, FY - 0.03, za, zb, bevel=0.01)
    md.bx("concrete", X1 - 0.02, -38.08, FY - 0.035, FY, za - 0.02, zb + 0.02, bevel=0.012, seg=2)
    for (x0, x1, top) in ((-38.1, -37.82, 0.213), (-37.82, -37.54, 0.107)):
        md.bx("concrete", x0 - 0.02, x1, -0.05, top - 0.03, za, zb, bevel=0.01)
        md.bx("concrete", x0 - 0.02, x1 + 0.02, top - 0.035, top, za - 0.015, zb + 0.015, bevel=0.012, seg=2)
    return done(md)

def rail(z):
    md = Mdl("rail"); top = lambda x: FY + 0.9 if x <= -38.12 else FY + 0.9 - (x + 38.12) / 0.55 * 0.213
    base = lambda x: FY if x <= -38.12 else (0.213 if x <= -37.82 else 0.107)
    for px in (-39.3, -38.12, -37.6):
        b = base(px); md.bx("iron", px - 0.035, px + 0.035, b, b + 0.012, z - 0.035, z + 0.035, bevel=0.003)
        md.box("iron", (px, (b + top(px)) / 2, z), (0.034, top(px) - b, 0.034), bevel=0.004)
        md.lathe("iron", [(0, 0), (0.026, 0.004), (0.03, 0.03), (0.012, 0.06), (0.022, 0.08), (0, 0.11)], Tw((px, top(px), z)), seg=10)
    pts = [(-39.32, FY + 0.88, z), (-38.12, FY + 0.88, z), (-37.6, top(-37.6) - 0.02, z), (-37.5, top(-37.6) - 0.08, z), (-37.5, top(-37.6) - 0.16, z), (-37.56, top(-37.6) - 0.2, z)]
    md.tube("iron", pts, 0.02, seg=10)
    md.tube("iron", [(-39.3, FY + 0.1, z), (-38.12, FY + 0.1, z), (-37.6, 0.107 + 0.1, z)], 0.012, seg=8)
    x = -39.2
    while x < -37.66:
        b = (FY if x <= -38.12 else FY - (x + 38.12) / 0.52 * 0.213) + 0.1
        md.box("iron", (x, (b + top(x) - 0.02) / 2, z), (0.014, top(x) - 0.02 - b, 0.014))
        if R.random() < 1.0 and x < -38.2: md.tube("iron", [(x, b + 0.25 + k * 0.0, z) for k in range(1)] + [(x + 0.04, b + 0.31, z), (x, b + 0.37, z), (x - 0.04, b + 0.31, z), (x, b + 0.25, z)], 0.005, seg=6, caps=False)
        x += 0.12
    return done(md)

# ======================================================== FURNITURE
def armchair():
    md = Mdl("armchair"); cx, cz = -46.9, 58.3
    for (u, w) in ((0.33, 0.35), (0.33, -0.35), (-0.33, 0.35), (-0.33, -0.35)):
        md.lathe("wood", [(0, 0), (0.017, 0), (0.02, 0.02), (0.026, 0.07), (0.03, 0.12), (0, 0.125)], Tw((cx + u, FY, cz + w)), seg=12)
    md.superq("velvet", Tw((cx, FY + 0.26, cz)), (0.4, 0.14, 0.42), 0.25, 0.25, 24, 10)
    md.superq("velvet", Tw((cx + 0.05, FY + 0.45, cz)), (0.33, 0.075, 0.3), 0.35, 0.3, 24, 10)
    md.superq("velvet", Tw((cx + 0.31, FY + 0.47, cz)), (0.06, 0.05, 0.3), 0.6, 0.4, 16, 8)  # cushion front roll
    tufts = [(y, z) for y in (-0.16, 0.02, 0.2) for z in (-0.18, 0.0, 0.18)] + [(y, z) for y in (-0.07, 0.11) for z in (-0.09, 0.09)]
    def tuft(p):
        if p[0] > 0:
            for (ty, tz) in tufts: p[0] -= 0.03 * math.exp(-((p[1] - ty) ** 2 + (p[2] - tz) ** 2) / 0.0012)
            p[0] += 0.015 * math.cos(p[2] * 4) * math.cos(p[1] * 3)
        return p
    Mb = Tw((cx - 0.3, FY + 0.76, cz), [("Z", 8)])
    md.superq("velvet", Mb, (0.11, 0.36, 0.38), 0.28, 0.25, 40, 28, deform=tuft)
    for (ty, tz) in tufts: md.superq("velvet", Mb @ Matrix.Translation((0.08, ty, tz)), (0.012, 0.014, 0.014), 0.8, 0.8, 8, 4)
    for s in (-1, 1):
        md.superq("velvet", Tw((cx - 0.02, FY + 0.42, cz + s * 0.37)), (0.39, 0.2, 0.065), 0.3, 0.3, 20, 10)
        md.superq("velvet", Tw((cx + 0.0, FY + 0.64, cz + s * 0.39)), (0.41, 0.065, 0.085), 0.7, 0.45, 24, 10)
        md.superq("velvet", Tw((cx + 0.405, FY + 0.6, cz + s * 0.39)), (0.02, 0.09, 0.08), 0.8, 0.8, 12, 6)
    for k in range(9): md.superq("brass", Tw((cx + 0.41, FY + 0.15 + 0.0, cz - 0.32 + k * 0.08)), (0.006, 0.006, 0.006), 0.8, 0.8, 6, 3)
    return done(md)

def table():
    md = Mdl("table"); cx, cz = -46.9, 57.25
    md.lathe("wood", [(0, FY + 0.62), (0.33, FY + 0.62), (0.355, FY + 0.628), (0.36, FY + 0.64), (0.352, FY + 0.652), (0, FY + 0.652)], Tw((cx, 0, cz)), seg=40)
    md.lathe("wood", [(0.28, FY + 0.56), (0.3, FY + 0.565), (0.3, FY + 0.62), (0.27, FY + 0.62)], Tw((cx, 0, cz)), seg=32)
    md.lathe("wood", [(0, FY + 0.1), (0.05, FY + 0.1), (0.06, FY + 0.14), (0.04, FY + 0.18), (0.05, FY + 0.28), (0.035, FY + 0.4), (0.03, FY + 0.48), (0.045, FY + 0.52), (0.04, FY + 0.56), (0.0, FY + 0.565)], Tw((cx, 0, cz)), seg=16)
    for k in range(3):
        a = math.radians(30 + 120 * k); dx, dz = math.cos(a), math.sin(a)
        pts = [(cx + dx * t, FY + 0.14 - 0.11 * (t / 0.24) ** 1.6 + 0.02 * math.sin(t / 0.24 * math.pi), cz + dz * t) for t in [i * 0.03 for i in range(9)]]
        md.tube("wood", pts, lambda i: 0.028 - i * 0.002, seg=10)
        md.superq("wood", Tw((cx + dx * 0.25, FY + 0.012, cz + dz * 0.25)), (0.03, 0.012, 0.03), 0.6, 0.6, 10, 4)
    mx, mz, my = cx + 0.2, cz - 0.17, FY + 0.652  # the mug, half full
    md.lathe("ceramic", [(0, 0), (0.035, 0), (0.04, 0.005), (0.043, 0.05), (0.045, 0.095), (0.04, 0.095), (0.038, 0.01), (0, 0.01)], Tw((mx, my, mz)), seg=20)
    md.lathe("coffee", [(0, 0.07), (0.0395, 0.07)], Tw((mx, my, mz)), seg=20)
    md.tube("ceramic", [(mx + 0.043, my + 0.078, mz), (mx + 0.068, my + 0.072, mz), (mx + 0.075, my + 0.05, mz), (mx + 0.066, my + 0.028, mz), (mx + 0.043, my + 0.022, mz)], 0.007, seg=8)
    return done(md)

def radio():
    md = Mdl("radio"); cx, cz, y0 = -47.02, 57.25, FY + 0.652; W, H, Dp = 0.36, 0.33, 0.2
    o = Vector((cx - Dp / 2, y0 + 0.025, cz)); u, v, d = Vector((0, 0, -1)), Vector((0, 1, 0)), Vector((1, 0, 0))
    md.bx("wood", cx - Dp / 2 - 0.01, cx + Dp / 2 + 0.01, y0, y0 + 0.025, cz - W / 2 - 0.012, cz + W / 2 + 0.012, bevel=0.006, seg=2)
    md.prism("wood", arch(W, H, W / 2, 14), o, u, v, d, Dp)
    md.prism("bakelite", arch(W - 0.03, H - 0.015, W / 2 - 0.015, 14), o + v * 0.0 + d * Dp, u, v, d, 0.006)
    md.prism("wood", arch(W - 0.05, H - 0.03, W / 2 - 0.025, 14), o + d * (Dp + 0.006), u, v, d, 0.004)
    md.prism("cloth", arch(0.2, 0.17, 0.1, 12), o + v * 0.12 + d * (Dp + 0.0095), u, v, d, 0.002)
    for k in (-0.05, 0.0, 0.05):  # fretwork bars over the grille
        md.bx("bakelite", cx + Dp / 2 + 0.011, cx + Dp / 2 + 0.02, y0 + 0.15, y0 + 0.3 - abs(k) * 0.6, cz + k - 0.007, cz + k + 0.007, bevel=0.002)
    md.prism("brass", arch(0.15, 0.065, 0.075, 10), o + v * 0.05 + d * (Dp + 0.0095), u, v, d, 0.004)
    md.prism("dial", arch(0.13, 0.055, 0.065, 10), o + v * 0.055 + d * (Dp + 0.0135), u, v, d, 0.002)
    md.bx("bakelite", cx + Dp / 2 + 0.015, cx + Dp / 2 + 0.017, y0 + 0.07, y0 + 0.1, cz - 0.002, cz + 0.002)  # needle
    for k in (-0.115, 0.0, 0.115):
        md.lathe("bakelite", [(0, 0), (0.019, 0), (0.019, 0.018), (0.014, 0.024), (0, 0.025)], Tw((cx + Dp / 2 + 0.01, y0 + (0.04 if k else 0.03), cz + k), [("Z", -90)]), seg=14)
    return done(md)

def radiator():
    md = Mdl("radiator"); cx, cz = -44.5, zi0 + 0.15; n, pitch = 12, 0.068
    x0 = cx - (n - 1) * pitch / 2
    for i in range(n):
        x = x0 + i * pitch
        for dz in (-0.045, 0.045):
            md.lathe("radpaint", [(0, FY + 0.1), (0.018, FY + 0.105), (0.024, FY + 0.13), (0.022, FY + 0.4), (0.024, FY + 0.66), (0.018, FY + 0.685), (0, FY + 0.69)], Tw((x, 0, cz + dz)), seg=10)
        for yy in (FY + 0.12, FY + 0.665):
            md.superq("radpaint", Tw((x, yy, cz)), (0.032, 0.026, 0.08), 0.5, 0.4, 12, 6)
    for yy in (FY + 0.12, FY + 0.665): md.cyl("radpaint", (cx, yy, cz), 0.022, 0.022, n * pitch, seg=12, rot=[("Z", 90)])
    for x in (x0 + 0.02, x0 + (n - 1) * pitch - 0.02):
        md.lathe("radpaint", [(0, FY), (0.03, FY), (0.03, FY + 0.012), (0.016, FY + 0.03), (0.016, FY + 0.1), (0, FY + 0.1)], Tw((x, 0, cz + 0.045)), seg=10)
        md.lathe("radpaint", [(0, FY), (0.03, FY), (0.03, FY + 0.012), (0.016, FY + 0.03), (0.016, FY + 0.1), (0, FY + 0.1)], Tw((x, 0, cz - 0.045)), seg=10)
    ex = x0 + n * pitch  # supply pipe with an angle valve on the right end, a bleed valve on the left
    md.tube("pipe", [(ex + 0.13, FY - 0.02, cz), (ex + 0.13, FY + 0.18, cz), (ex + 0.12, FY + 0.21, cz), (ex + 0.09, FY + 0.22, cz)], 0.016, seg=10)
    md.lathe("pipe", [(0, 0), (0.035, 0), (0.035, 0.01), (0, 0.01)], Tw((ex + 0.13, FY, cz)), seg=12)
    md.cyl("brass", (ex + 0.05, FY + 0.12, cz), 0.022, 0.022, 0.1, seg=12, rot=[("Z", 90)])
    md.cyl("brass", (ex + 0.05, FY + 0.19, cz), 0.008, 0.008, 0.07, seg=8)
    md.tube("iron", [(ex + 0.05 + 0.03 * math.cos(a), FY + 0.225, cz + 0.03 * math.sin(a)) for a in [k * math.pi / 6 for k in range(13)]], 0.006, seg=6, caps=False)
    md.cyl("brass", (x0 - 0.05, FY + 0.665, cz), 0.009, 0.009, 0.06, seg=8, rot=[("Z", 90)])
    return done(md)

def counter():
    md = Mdl("counter"); xa, xb, zf, zb = -43.8, -41.2, zi1 - 0.6, zi1 - 0.03; top = FY + 0.88
    md.bx("rubber", xa + 0.02, xb - 0.02, FY, FY + 0.1, zf + 0.07, zb)
    md.bx("cabinet", xa, xb, FY + 0.1, top - 0.035, zf + 0.02, zb, bevel=0.004)
    dw = (xb - xa) / 4
    for k in range(4):
        dx0, dx1 = xa + k * dw + 0.012, xa + (k + 1) * dw - 0.012
        md.bx("cabinet", dx0, dx1, FY + 0.12, FY + 0.64, zf, zf + 0.02, bevel=0.006, seg=2)
        md.bx("cabinet", dx0 + 0.07, dx1 - 0.07, FY + 0.2, FY + 0.56, zf - 0.006, zf + 0.002, bevel=0.01, seg=2)
        md.bx("cabinet", dx0, dx1, FY + 0.66, top - 0.05, zf, zf + 0.02, bevel=0.006, seg=2)
        hx = dx1 - 0.05 if k % 2 == 0 else dx0 + 0.05
        md.tube("steel", [(hx, FY + 0.52, zf), (hx, FY + 0.52, zf - 0.03), (hx, FY + 0.38, zf - 0.03), (hx, FY + 0.38, zf)], 0.006, seg=8)
        mxx = (dx0 + dx1) / 2
        md.tube("steel", [(mxx - 0.06, FY + 0.745, zf), (mxx - 0.06, FY + 0.745, zf - 0.025), (mxx + 0.06, FY + 0.745, zf - 0.025), (mxx + 0.06, FY + 0.745, zf)], 0.006, seg=8)
    hx0, hx1, hz0, hz1 = -42.56, -42.04, zf + 0.12, zf + 0.48  # sink hole
    for (a, b, c, d) in ((xa - 0.02, xb + 0.02, zf - 0.03, hz0), (xa - 0.02, xb + 0.02, hz1, zi1), (xa - 0.02, hx0, hz0, hz1), (hx1, xb + 0.02, hz0, hz1)):
        md.bx("counter", a, b, top - 0.035, top, c, d)
    md.bx("steel", xa - 0.025, xb + 0.025, top - 0.04, top + 0.003, zf - 0.035, zf - 0.028)
    md.bx("counter", xa - 0.02, xb + 0.02, top, top + 0.1, zi1 - 0.025, zi1, bevel=0.005)
    # open shelf with a few jars and plates
    sy = FY + 1.55
    md.bx("wood", xa + 0.2, xb - 0.2, sy, sy + 0.025, zi1 - 0.22, zi1, bevel=0.004)
    for x in (xa + 0.35, xb - 0.35): md.tube("iron", [(x, sy - 0.0, zi1 - 0.18), (x, sy - 0.05, zi1 - 0.1), (x, sy - 0.18, zi1 - 0.005)], 0.01, seg=6)
    for i, x in enumerate((xa + 0.45, xa + 0.6, xa + 0.73)):
        h = (0.18, 0.14, 0.2)[i]; md.lathe("ceramic", [(0, 0), (0.045, 0), (0.05, 0.02), (0.05, h - 0.03), (0.04, h), (0, h)], Tw((x, sy + 0.025, zi1 - 0.1)), seg=14)
        md.lathe("wood", [(0, h), (0.042, h), (0.042, h + 0.025), (0, h + 0.03)], Tw((x, sy + 0.025, zi1 - 0.1)), seg=14)
    for k in range(3): md.lathe("ceramic", [(0, 0), (0.06, 0), (0.12, 0.012), (0.125, 0.02), (0.06, 0.008), (0, 0.008)], Tw((xb - 0.55 + k * 0.015, sy + 0.16, zi1 - 0.03 - k * 0.02), [("X", -75)]), seg=20)
    return done(md)

def sink():
    md = Mdl("sink"); zf = zi1 - 0.6; top = FY + 0.88; hx0, hx1, hz0, hz1 = -42.56, -42.04, zf + 0.12, zf + 0.48; dep = 0.18
    md.bx("steel", hx0 - 0.03, hx1 + 0.03, top, top + 0.006, hz0 - 0.03, hz0, bevel=0.002); md.bx("steel", hx0 - 0.03, hx1 + 0.03, top, top + 0.006, hz1, hz1 + 0.03, bevel=0.002)
    md.bx("steel", hx0 - 0.03, hx0, top, top + 0.006, hz0, hz1, bevel=0.002); md.bx("steel", hx1, hx1 + 0.03, top, top + 0.006, hz0, hz1, bevel=0.002)
    md.bx("steel", hx0, hx0 + 0.006, top - dep, top, hz0, hz1); md.bx("steel", hx1 - 0.006, hx1, top - dep, top, hz0, hz1)
    md.bx("steel", hx0, hx1, top - dep, top, hz0, hz0 + 0.006); md.bx("steel", hx0, hx1, top - dep, top, hz1 - 0.006, hz1)
    md.bx("steel", hx0, hx1, top - dep - 0.006, top - dep, hz0, hz1)
    md.cyl("rubber", ((hx0 + hx1) / 2, top - dep + 0.002, (hz0 + hz1) / 2), 0.035, 0.035, 0.004, seg=16)
    fx, fz = (hx0 + hx1) / 2, zi1 - 0.07
    md.lathe("steel", [(0, 0), (0.035, 0), (0.035, 0.012), (0.018, 0.03), (0.015, 0.06), (0, 0.06)], Tw((fx, top, fz)), seg=16)
    neck = [(fx, top + 0.05, fz)] + [(fx, top + 0.05 + 0.24 * t / 4, fz) for t in range(1, 5)]
    neck += [(fx, top + 0.29 + 0.1 * math.sin(a), fz - 0.1 + 0.1 * math.cos(a)) for a in [math.pi * k / 10 for k in range(11)]]
    neck += [(fx, top + 0.25, fz - 0.2)]
    md.tube("steel", neck, 0.012, seg=12)
    for s in (-1, 1):
        hx = fx + s * 0.11
        md.lathe("steel", [(0, 0), (0.025, 0), (0.025, 0.01), (0.012, 0.02), (0.012, 0.06), (0, 0.06)], Tw((hx, top, fz)), seg=12)
        for a in (0, 90): md.cyl("ceramic", (hx, top + 0.07, fz), 0.007, 0.007, 0.09, seg=8, rot=[("Y", a + 45), ("Z", 90)])
        md.superq("ceramic", Tw((hx, top + 0.075, fz)), (0.012, 0.015, 0.012), 0.6, 0.6, 8, 4)
    return done(md)

def bed():
    md = Mdl("bed"); hx, fx, cz, W = xi0 + 0.05, xi0 + 2.1, zi1 - 0.58, 1.0; zt = FY + 0.62
    for (x, h) in ((hx, 1.12), (fx, 0.62)):
        for s in (-1, 1):
            md.lathe("wood", [(0, FY), (0.032, FY), (0.03, FY + 0.12), (0.034, FY + 0.16), (0.028, FY + h - 0.08), (0.04, FY + h - 0.05), (0.03, FY + h), (0.02, FY + h + 0.02), (0.03, FY + h + 0.05), (0, FY + h + 0.07)], Tw((x, 0, cz + s * W / 2)), seg=12)
        md.bx("wood", x - 0.02, x + 0.02, FY + h - 0.12, FY + h - 0.04, cz - W / 2, cz + W / 2, bevel=0.008, seg=2)
        md.bx("wood", x - 0.015, x + 0.015, FY + 0.3, FY + 0.38, cz - W / 2, cz + W / 2, bevel=0.005)
        nslat = 7 if x == hx else 5
        for k in range(nslat):
            z = cz - W / 2 + W * (k + 1) / (nslat + 1); md.lathe("wood", [(0, 0), (0.013, 0), (0.017, 0.15 * (h - 0.4)), (0.013, h - 0.46), (0, h - 0.46)], Tw((x, FY + 0.38, z)), seg=8)
    for s in (-1, 1): md.bx("wood", hx, fx, FY + 0.2, FY + 0.38, cz + s * (W / 2 - 0.01) - 0.015, cz + s * (W / 2 - 0.01) + 0.015, bevel=0.005)
    md.superq("linen", Tw(((hx + fx) / 2, FY + 0.5, cz)), ((fx - hx) / 2 - 0.04, 0.12, W / 2 - 0.03), 0.18, 0.18, 28, 10)
    def puff(p): p[1] += 0.012 * math.sin(p[2] * 18) * (p[1] > 0); return p
    md.superq("linen", Tw((hx + 0.26, zt + 0.08, cz), [("Z", -12)]), (0.17, 0.07, 0.34), 0.5, 0.35, 20, 10, deform=puff)
    xs0, xs1 = hx + 0.5, fx + 0.03; Wt = W - 0.04; Dr = 0.32; nx, nt = 36, 40
    P = []
    for i in range(nx + 1):
        s = i / nx; x = xs0 + (xs1 - xs0) * s; row = []
        for j in range(nt + 1):
            t = -1 + 2 * j / nt; L = Wt + 2 * Dr; p = t * L / 2; ap = abs(p); sg = 1 if p >= 0 else -1
            wr = 0.012 * math.sin(x * 9 + p * 5) + 0.008 * math.sin(x * 23 - p * 13) + 0.03 * math.exp(-((x - (xs0 + 0.5)) ** 2 + (p - 0.1) ** 2) / 0.03) + 0.022 * math.exp(-((x - (xs0 + 1.0)) ** 2 + (p + 0.2) ** 2) / 0.02)
            if ap <= Wt / 2 - 0.04: y, z = zt + 0.025 + wr, p
            else:
                k = ap - (Wt / 2 - 0.04); r = 0.06
                if k < r * math.pi / 2: a = k / r; y, z = zt + 0.025 - r + r * math.cos(a) + wr * (1 - a), sg * (Wt / 2 - 0.04 + r * math.sin(a))
                else: kk = k - r * math.pi / 2; y, z = zt + 0.025 - r - kk, sg * (Wt / 2 + 0.02 + 0.06 * (kk / Dr) ** 2 + 0.012 * math.sin(x * 14))
            row.append((x, y, cz + z))
        P.append(row)
    md.grid("blanket", P)
    md.superq("blanket", Tw((xs0 + 0.02, zt + 0.045, cz)), (0.06, 0.03, Wt / 2 + 0.03), 0.6, 0.4, 20, 8)  # the turned-down fold
    return done(md)

def bookshelf():
    md = Mdl("bookshelf"); xb, xf_, z0, z1, H = xi0 + 0.025, xi0 + 0.33, 54.95, 55.85, 1.25
    md.bx("wood", xb, xf_, FY, FY + H, z0, z0 + 0.022); md.bx("wood", xb, xf_, FY, FY + H, z1 - 0.022, z1)
    md.bx("wood", xb - 0.0, xf_ + 0.02, FY + H, FY + H + 0.025, z0 - 0.02, z1 + 0.02, bevel=0.006, seg=2)
    md.bx("wood", xb, xb + 0.01, FY, FY + H, z0, z1); md.bx("wood", xf_ - 0.02, xf_, FY, FY + 0.08, z0, z1)
    shelves = [FY + 0.08, FY + 0.46, FY + 0.84]
    for y in shelves: md.bx("wood", xb, xf_, y, y + 0.022, z0 + 0.02, z1 - 0.02, bevel=0.003)
    for si, y in enumerate(shelves):
        y += 0.022; z = z0 + 0.03; top = (shelves + [FY + H])[si + 1] - y - 0.03
        while z < z1 - 0.06:
            if R.random() < 0.1 and z < z1 - 0.3:  # a lying stack
                for k in range(R.randint(2, 4)):
                    hh = 0.03 + R.random() * 0.015; ww = 0.16 + R.random() * 0.06
                    md.bx(R.choice(["book_a", "book_b", "book_c"]), xb + 0.04, xb + 0.04 + 0.2, y, y + hh, z, z + ww, bevel=0.004); y += hh
                y = (shelves[si] + 0.022); z += 0.26; continue
            t = 0.022 + R.random() * 0.028; h = min(top, 0.18 + R.random() * 0.12); dpt = 0.15 + R.random() * 0.07
            m = R.choice(["book_a", "book_b", "book_c"])
            if z > z1 - 0.12 and R.random() < 0.7:
                md.box(m, (xb + 0.02 + dpt / 2, y + h / 2 * math.cos(0.3) + 0.02, z + 0.05), (dpt, h, t), rot=[("X", 18)], bevel=0.003); break
            md.bx(m, xb + 0.02, xb + 0.02 + dpt, y, y + h, z, z + t, bevel=0.003)
            md.bx("pages", xb + 0.02 + dpt, xb + 0.022 + dpt, y + 0.006, y + h - 0.006, z + 0.003, z + t - 0.003)
            z += t + 0.002
    return done(md)

def floorlamp():
    md = Mdl("floorlamp"); cx, cz = -47.65, 59.25
    md.lathe("brass", [(0, FY), (0.16, FY), (0.165, FY + 0.01), (0.14, FY + 0.03), (0.05, FY + 0.05), (0.03, FY + 0.09), (0.012, FY + 0.1), (0.011, FY + 1.4), (0.02, FY + 1.42), (0.012, FY + 1.46), (0, FY + 1.47)], Tw((cx, 0, cz)), seg=20)
    md.lathe("bulb", [(0, FY + 1.46), (0.03, FY + 1.48), (0.035, FY + 1.52), (0, FY + 1.57)], Tw((cx, 0, cz)), seg=12)
    md.lathe("shade", [(0.23, FY + 1.36), (0.225, FY + 1.37), (0.165, FY + 1.6), (0.16, FY + 1.61)], Tw((cx, 0, cz)), seg=28)
    md.tube("brass", [(cx - 0.16, FY + 1.6, cz), (cx, FY + 1.62, cz), (cx + 0.16, FY + 1.6, cz)], 0.004, seg=6)
    md.tube("brass", [(cx + 0.04, FY + 1.45, cz), (cx + 0.04, FY + 1.3, cz)], 0.002, seg=4, caps=False)
    return done(md)

def pendant():
    md = Mdl("pendant"); cx, cz = -44.5, 58.0
    md.lathe("brass", [(0, CY - 0.002), (0.07, CY - 0.002), (0.065, CY - 0.03), (0.015, CY - 0.045), (0, CY - 0.045)], Tw((cx, 0, cz)), seg=16)
    md.cyl("iron", (cx, CY - 0.33, cz), 0.006, 0.006, 0.57, seg=6)
    md.lathe("brass", [(0, CY - 0.6), (0.025, CY - 0.62), (0.025, CY - 0.7), (0, CY - 0.71)], Tw((cx, 0, cz)), seg=12)
    md.lathe("bulb", [(0, CY - 0.7), (0.035, CY - 0.73), (0.04, CY - 0.78), (0, CY - 0.84)], Tw((cx, 0, cz)), seg=12)
    md.lathe("shade", [(0.27, CY - 0.88), (0.268, CY - 0.87), (0.21, CY - 0.6), (0.205, CY - 0.59)], Tw((cx, 0, cz)), seg=32)
    for k in range(3):
        a = 2 * math.pi * k / 3; md.tube("brass", [(cx + 0.02 * math.cos(a), CY - 0.62, cz + 0.02 * math.sin(a)), (cx + 0.205 * math.cos(a), CY - 0.6, cz + 0.205 * math.sin(a))], 0.003, seg=4)
    return done(md)

def rug():
    md = Mdl("rug"); cx, cz, L, W = -45.8, 58.0, 3.0, 2.0; nx, nz = 24, 16
    def h(x, z):
        c = 0.03 * max(0, 1 - math.hypot(x - (cx + L / 2 - 0.1), z - (cz - W / 2 + 0.1)) / 0.35) ** 2
        return FY + 0.012 + c + 0.003 * math.sin(x * 3.1) * math.sin(z * 2.3)
    P = [[(cx - L / 2 + L * i / nx, h(cx - L / 2 + L * i / nx, cz - W / 2 + W * j / nz), cz - W / 2 + W * j / nz) for j in range(nz + 1)] for i in range(nx + 1)]
    md.grid("rug", P, smooth=True)
    for s in (-1, 1):
        x = cx + s * L / 2
        for k in range(60):
            z = cz - W / 2 + W * (k + 0.5) / 60; ln = 0.06 + R.random() * 0.03
            md.bx("fringe", min(x, x + s * ln), max(x, x + s * ln), FY + 0.004, FY + 0.009, z - 0.006, z + 0.006)
    return done(md)

def picture():
    md = Mdl("picture"); cx, cy, cz = -47.3, FY + 1.62, zi0 + 0.002; w, h = 0.46, 0.58; fw, fd = 0.065, 0.04
    for (a, b, c, d) in ((-w / 2 - fw, w / 2 + fw, h / 2, h / 2 + fw), (-w / 2 - fw, w / 2 + fw, -h / 2 - fw, -h / 2), (-w / 2 - fw, -w / 2, -h / 2, h / 2), (w / 2, w / 2 + fw, -h / 2, h / 2)):
        md.bx("wood", cx + a, cx + b, cy + c, cy + d, cz, cz + fd, bevel=0.012, seg=3)
    for (a, b, c, d) in ((-w / 2 - 0.012, w / 2 + 0.012, h / 2, h / 2 + 0.012), (-w / 2 - 0.012, w / 2 + 0.012, -h / 2 - 0.012, -h / 2), (-w / 2 - 0.012, -w / 2, -h / 2, h / 2), (w / 2, w / 2 + 0.012, -h / 2, h / 2)):
        md.bx("brass", cx + a, cx + b, cy + c, cy + d, cz, cz + fd - 0.01, bevel=0.003)
    md.bx("canvas", cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cz, cz + 0.012)
    return done(md)

for f in (shell, floor, stoop, lambda: rail(57.06), armchair, table, radio, radiator, counter, sink, bed, bookshelf, floorlamp, pendant, rug, picture): f()

# ---------------------------------------------------- export each, recentred on its bbox bottom-centre; place.json = world feet
place = {}
for ob in MODELS:
    vs = [v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    c = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    ob.data.transform(Matrix.Translation(-c))
    for o in bpy.context.scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{ob.name}.glb", export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
    ob.data.transform(Matrix.Translation(c))
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    place[ob.name] = {"x": round(c.x, 4), "y": round(c.z, 4), "z": round(-c.y, 4), "tris": tris, "size": [round(mx.x - mn.x, 3), round(mx.z - mn.z, 3), round(mx.y - mn.y, 3)], "slots": [m.name for m in ob.data.materials]}
    print("MODEL", ob.name, tris, place[ob.name]["size"])
json.dump(place, open(f"{OUT}/place.json", "w"), indent=1)

if "--norender" not in sys.argv:
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 20; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1000, 640
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.45, 0.5, 0.58, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(-60)); sc.collection.objects.link(sun)
    for (p, e) in (((-44.5, CY - 0.78, 58), 250), ((-47.65, FY + 1.5, 59.25), 60)):
        L = bpy.data.objects.new("pl", bpy.data.lights.new("pl", "POINT")); L.data.energy = e; L.data.color = (1, 0.85, 0.65); L.location = B(p); sc.collection.objects.link(L)
    gp = bpy.data.objects.new("ground", bpy.data.meshes.new("g")); sc.collection.objects.link(gp)
    import bmesh as _b; g = _b.new(); _b.ops.create_grid(g, x_segments=1, y_segments=1, size=30, matrix=Matrix.Translation(B((-44, -0.01, 58)))); g.to_mesh(gp.data); gp.data.materials.append(mat("concrete", (0.4, 0.4, 0.38), 0.9))
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    for (nm, p, t, lens) in (("out", (-33.5, 2.4, 49.5), (-43.5, 1.6, 58.5), 30), ("in", (-39.3, 1.6, 58.0), (-48, 1.0, 58.2), 16), ("in2", (-48.6, 1.7, 55.0), (-42, 1.0, 60.5), 18)):
        cam.location = B(p); cam.rotation_euler = (B(t) - B(p)).to_track_quat("-Z", "Y").to_euler(); cd.lens = lens
        sc.render.filepath = f"{OUT}/proof_{nm}.png"; bpy.ops.render.render(write_still=True)
