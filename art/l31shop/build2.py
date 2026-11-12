import sys, math, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import lib; _obj = lib._obj
PI = math.pi
def poly(pts, thick, loc, m):
    bm = bmesh.new(); vs = [bm.verts.new((x, 0, z)) for x, z in pts]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, thick, 0), verts=[v for v in r["geom"] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.triangulate(bm, faces=bm.faces[:]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return _obj(bm, m, loc, (0, 0, 0))
def plush(x, y, z0, col, kind, k=1.0):
    fur = mat("fur" + col, col, 0.95); pale = mat("pale", "#f6ead8", 0.95); blk = mat("eye", "#111111", 0.2)
    P = lambda dx, dy, dz: (x + dx * k, y + dy * k, z0 + dz * k)
    sph(0.1 * k, P(0, 0, 0.1), fur, (1, 0.9, 1.05), 14); sph(0.08 * k, P(0, -0.01, 0.25), fur, (1, 0.95, 0.95), 14)
    sph(0.04 * k, P(0, -0.075, 0.235), pale, (1, 0.7, 0.8), 10); sph(0.012 * k, P(0, -0.105, 0.245), blk, seg=8)
    for s in (-1, 1):
        sph(0.011 * k, P(s * 0.032, -0.078, 0.275), blk, seg=8)
        sph(0.04 * k, P(s * 0.105, -0.03, 0.14), fur, (0.8, 0.9, 1.4), 10); sph(0.045 * k, P(s * 0.06, -0.1, 0.04), fur, (0.9, 1.5, 0.85), 10)
        if kind == "bear": sph(0.032 * k, P(s * 0.06, 0, 0.32), fur, (1, 0.6, 1), 10)
        else: sph(0.028 * k, P(s * 0.035, 0.005, 0.39), fur, (0.8, 0.5, 2.6), 10)
def plushshelf():
    start(5); wood = mat("shelf_wood", "#b98a52", 0.6); W, D = 1.6, 0.42
    for s in (-1, 1): box((0.03, D, 1.65), (s * (W / 2 - 0.015), 0, 0.825), wood)
    box((W, 0.015, 1.65), (0, D / 2 - 0.0075, 0.825), wood, 0)
    cols = ["#c98a4a", "#f2a6c8", "#8fd0f2", "#f4e7c8", "#b48ae0", "#7dcf8a", "#e8643a"]
    for t, z in enumerate((0.1, 0.62, 1.14)):
        box((W - 0.04, D, 0.03), (0, 0, z - 0.015), wood)
        for i in range(4): plush(-0.57 + i * 0.38 + R.uniform(-0.03, 0.03), 0.02, z, cols[(i + t * 3) % 7], "bear" if (i + t) % 2 else "bunny", R.uniform(0.92, 1.1))
    box((W - 0.04, D, 0.03), (0, 0, 1.635), wood); box((W, D, 0.08), (0, 0, 0.04), wood)
    finish("plushshelf")
def teewall():
    start(6); chrome = mat("chrome", "#d8d8dc", 0.2, 1); white = mat("print", "#ffffff", 0.7)
    T = [(0.09, 0.70), (0.24, 0.66), (0.40, 0.50), (0.33, 0.41), (0.245, 0.47), (0.25, 0.0)]
    out = [(-x, z) for x, z in T] + [(x, z) for x, z in reversed(T)] ; out = [(0, 0.655)] + [(x, z) for x, z in T] + [(-x, z) for x, z in reversed(T)]
    cols = ["#e8232e", "#1c1c20", "#19a6a0", "#f4d22e", "#7b3fc4", "#f06aa8", "#2a52c8", "#f2f0e8"]; words = ["SKATE", "RINK 31", "ROLL", "ALL SKATE"]
    for r in range(2):
        z0 = 0.02 + r * 0.9
        box((3.3, 0.02, 0.05), (0, -0.01, z0 + 0.8), chrome, 0.004)
        for i in range(4):
            x = -1.23 + i * 0.82; c = cols[r * 4 + i]; dark = c in ("#f4d22e", "#f2f0e8")
            tube([(x, 0, z0 + 0.8), (x, -0.07, z0 + 0.8), (x, -0.075, z0 + 0.815)], 0.005, chrome)
            tube([(x, -0.07, z0 + 0.8), (x, -0.07, z0 + 0.74), (x - 0.2, -0.07, z0 + 0.665)], 0.005, chrome); tube([(x, -0.07, z0 + 0.74), (x + 0.2, -0.07, z0 + 0.665)], 0.005, chrome)
            poly(out, 0.035, (x, -0.088, z0), mat("tee" + c, c, 0.9))
            ink = mat("printd", "#1c1c20", 0.7) if dark else white
            text(words[(i + r) % 4], 0.07, (x, -0.0895, z0 + 0.42), ink, extrude=0.001); torus(0.11, 0.008, (x, -0.089, z0 + 0.27), ink, (PI / 2, 0, 0), 20)
            for k in range(2): cyl(0.02, 0.004, (x - 0.07 + k * 0.14, -0.09, z0 + 0.19), ink, (PI / 2, 0, 0), seg=10)
    finish("teewall")
def cdrack():
    start(7); blk = mat("rack_black", "#1a1a1e", 0.45, 0.6); clear = mat("jewel", "#e6f0f4", 0.1, 0, 0.5)
    box((0.36, 0.26, 0.04), (0, 0, 0.02), blk)
    for s in (-1, 1): box((0.015, 0.2, 1.36), (s * 0.165, 0, 0.72), blk, 0.003)
    box((0.345, 0.015, 1.36), (0, 0.1, 0.72), blk, 0.003); box((0.36, 0.22, 0.02), (0, 0, 1.41), blk)
    for i in range(40):
        z = 0.06 + i * 0.033
        if R.random() < 0.12: continue
        c = R.choice(BRIGHT + ["#222222", "#884422", "#224488"]); dy = R.uniform(-0.012, 0.01)
        box((0.3, 0.14, 0.011), (0, -0.02 + dy, z), clear, 0, (0, 0, R.uniform(-0.03, 0.03))); box((0.29, 0.004, 0.009), (0, -0.092 + dy, z), mat("sp" + c, c, 0.5), 0)
    finish("cdrack")
def register():
    start(8); beige = mat("till_beige", "#cfc6b0", 0.5); dark = mat("till_dark", "#2a2a2e", 0.5); grn = mat("till_lcd", "#7dff9a", 0.3, 0, 1, 2.5); key = mat("till_key", "#eeeae0", 0.5)
    box((0.42, 0.44, 0.11), (0, 0, 0.055), beige, 0.012); box((0.38, 0.02, 0.07), (0, -0.215, 0.05), dark, 0.004)
    box((0.42, 0.3, 0.12), (0, 0.05, 0.15), beige, 0.015, (0.28, 0, 0))
    for i in range(5):
        for j in range(4): box((0.03, 0.03, 0.012), (-0.14 + i * 0.045, -0.06 + j * 0.045, 0.2 + j * 0.0125), key if i < 3 else dark, 0.003, (0.28, 0, 0))
    box((0.1, 0.1, 0.012), (0.13, 0.0, 0.215), mat("till_red", "#d8452e", 0.5), 0.003, (0.28, 0, 0))
    cyl(0.018, 0.14, (0.12, 0.17, 0.27), dark); box((0.2, 0.05, 0.07), (0.12, 0.17, 0.36), dark, 0.008); box((0.17, 0.004, 0.045), (0.12, 0.144, 0.36), grn, 0)
    box((0.09, 0.06, 0.05), (-0.12, 0.15, 0.24), dark, 0.006); box((0.07, 0.004, 0.09), (-0.12, 0.15, 0.3), mat("receipt", "#ffffff", 0.8), 0, (0.15, 0, 0))
    finish("register")
def goods():
    start(9); glass = mat("glass", "#e8f8ff", 0.05, 0, 0.25); card = mat("cardboard", "#f4d22e", 0.8); blk = mat("blackp", "#18181c", 0.5); chrome = mat("chrome", "#d8d8dc", 0.2, 1)
    # jar of glow necklaces
    cyl(0.1, 0.24, (-0.6, 0, 0.12), glass, seg=28); cyl(0.104, 0.012, (-0.6, 0, 0.006), glass, seg=28)
    glow = [mat("glow" + str(i), c, 0.3, 0, 1, 3) for i, c in enumerate(["#7dff5a", "#ff3fa4", "#3fd0ff", "#ffd23a", "#ff7a1e"])]
    for i in range(14): torus(0.075 + R.uniform(-0.01, 0.008), 0.004, (-0.6 + R.uniform(-0.008, 0.008), R.uniform(-0.008, 0.008), 0.02 + i * 0.012), glow[i % 5], (R.uniform(-0.12, 0.12), R.uniform(-0.12, 0.12), 0), 24)
    for i in range(3): tube([(-0.6 + 0.05 * math.cos(i * 2.1), 0.05 * math.sin(i * 2.1), 0.19), (-0.6 + 0.08 * math.cos(i * 2.1), 0.08 * math.sin(i * 2.1), 0.3), (-0.6 + 0.13 * math.cos(i * 2.1), 0.13 * math.sin(i * 2.1), 0.2)], 0.004, glow[i])
    # disposable cameras in a tray
    box((0.36, 0.2, 0.03), (-0.2, 0, 0.015), card, 0.004); box((0.36, 0.012, 0.17), (-0.2, 0.094, 0.085), card, 0.003); text("CAMERAS", 0.03, (-0.2, 0.087, 0.14), blk, extrude=0.001)
    for i in range(3):
        for j in range(2):
            x, y = -0.32 + i * 0.12, -0.05 + j * 0.07
            box((0.105, 0.035, 0.058), (x, y, 0.059), mat("cam_yel" if (i + j) % 2 else "cam_grn", "#f2b90f" if (i + j) % 2 else "#2e8a4a", 0.5), 0.005); box((0.045, 0.036, 0.058), (x - 0.02, y, 0.059), blk, 0.004)
            cyl(0.016, 0.01, (x - 0.02, y - 0.02, 0.06), chrome, (PI / 2, 0, 0), seg=12); box((0.022, 0.004, 0.012), (x + 0.03, y - 0.018, 0.075), mat("flash", "#f4f4ff", 0.2), 0)
    # lip balm tiered tub
    wt = mat("tub_white", "#f2f0ea", 0.5)
    for t in range(3):
        box((0.22, 0.05, 0.03 + t * 0.03), (0.2, -0.05 + t * 0.05, (0.03 + t * 0.03) / 2), wt, 0.003)
        for i in range(8): cyl(0.008, 0.066, (0.11 + i * 0.026, -0.05 + t * 0.05, 0.03 + t * 0.03 + 0.033), mat("balm" + str((i + t) % 4), ["#e8232e", "#f06aa8", "#7b3fc4", "#19a6a0"][(i + t) % 4], 0.4), seg=10)
    # slap bracelets on a post
    cyl(0.07, 0.015, (0.6, 0, 0.0075), blk); cyl(0.036, 0.34, (0.6, 0, 0.185), blk)
    for i in range(11): cyl(0.041, 0.024, (0.6, 0, 0.04 + i * 0.028), mat("slap" + str(i % 7), BRIGHT[i % 7], 0.35, 0.3), seg=20)
    for i in range(3): box((0.22, 0.025, 0.003), (0.6 + R.uniform(-0.03, 0.03), -0.11 - i * 0.035, 0.0015), mat("slap" + str((i * 2 + 1) % 7), BRIGHT[(i * 2 + 1) % 7], 0.35, 0.3), 0, (0, 0, R.uniform(-0.5, 0.5)))
    finish("goods")
def slat(name, seed):
    start(seed); panel = mat("slat_white", "#e9e4d8", 0.55); groove = mat("slat_groove", "#6a665c", 0.7); chrome = mat("chrome", "#d8d8dc", 0.2, 1); W = 3.0
    box((W, 0.012, 2.4), (0, -0.006, 1.2), groove, 0)
    for i in range(24): box((W, 0.012, 0.088), (0, -0.018, 0.05 + i * 0.1), panel, 0.003)
    rows = [(2.05, "wheel"), (1.6, "lace"), (1.15, "key"), (0.7, "bag")]
    for z, kind in rows:
        n = 7 if kind != "bag" else 5
        for i in range(n):
            x = -W / 2 + W / (n + 1) * (i + 1)
            tube([(x, -0.02, z), (x, -0.17, z), (x, -0.185, z + 0.02)], 0.004, chrome); box((0.03, 0.006, 0.05), (x, -0.027, z), chrome, 0)
            c = BRIGHT[(i + int(z * 10)) % 7]
            for k in range(R.randint(1, 3)):
                y = -0.06 - k * 0.035
                if kind == "bag":
                    box((0.3, 0.02, 0.36), (x, y, z - 0.17), mat("bag" + c, c, 0.6), 0.008); box((0.3, 0.021, 0.05), (x, y, z - 0.01), mat("bagtop", "#ffffff", 0.6), 0.003)
                    continue
                box((0.12, 0.003, 0.19), (x, y, z - 0.08), mat("card" + c, c, 0.7), 0)
                if kind == "wheel":
                    for a in (-1, 1):
                        for b in (-1, 1): cyl(0.024, 0.02, (x + a * 0.028, y - 0.011, z - 0.1 + b * 0.03), mat("wh" + str((i + k) % 5), ["#ff3fa4", "#ffffff", "#3fd0ff", "#ffb020", "#7dff5a"][(i + k) % 5], 0.3), (PI / 2, 0, 0), seg=14)
                elif kind == "lace":
                    for a in range(4): box((0.018, 0.012, 0.13), (x - 0.036 + a * 0.024, y - 0.007, z - 0.095), mat("lc" + str((i + a) % 6), BRIGHT[(i + a + 2) % 7], 0.9), 0.004)
                else:
                    torus(0.016, 0.003, (x, y - 0.004, z - 0.05), chrome, (PI / 2, 0, 0), 14); sph(0.03, (x, y - 0.014, z - 0.115), mat("kc" + str((i + k) % 6), BRIGHT[(i + k + 3) % 7], 0.3), (1, 0.45, 1.15), 12)
    finish(name)
def neon():
    start(11); pink = mat("neon_pink", "#ff3fa4", 0.3, 0, 1, 6); cyan = mat("neon_cyan", "#3fe0ff", 0.3, 0, 1, 6); yel = mat("neon_yellow", "#ffd23a", 0.3, 0, 1, 6); back = mat("neon_back", "#121216", 0.6); chrome = mat("chrome", "#d8d8dc", 0.2, 1)
    box((3.6, 0.02, 1.5), (0, -0.01, 0.75), back, 0.004)
    for sx in (-1.7, 1.7):
        for z in (0.1, 1.4): cyl(0.02, 0.03, (sx, -0.03, z), chrome, (PI / 2, 0, 0), seg=12)
    t = text("Dottie's", 0.72, (0, -0.05, 0.92), pink, font=SERIF, tube_r=0.013); t.data.resolution_u = 4; t.data.bevel_resolution = 1
    tube([(-1.45, -0.05, 0.56), (-0.6, -0.05, 0.47), (0.4, -0.05, 0.55), (1.2, -0.05, 0.5), (1.5, -0.05, 0.6)], 0.013, cyan)
    g = text("G I F T S  &  S K A T E", 0.17, (0, -0.05, 0.25), yel, tube_r=0.008); g.data.resolution_u = 3; g.data.bevel_resolution = 1
    # a little tube star
    pts = [(1.45 + 0.13 * (1 if i % 2 == 0 else 0.45) * math.sin(i * PI / 5), -0.05, 1.22 + 0.13 * (1 if i % 2 == 0 else 0.45) * math.cos(i * PI / 5)) for i in range(10)]
    cu = tube(pts, 0.009, yel, True)
    for p in cu.data.splines[0].bezier_points: p.handle_left_type = p.handle_right_type = "VECTOR"
    finish("neon", views=((0, -1.6, 0.1),))
for f in (plushshelf, teewall, cdrack, register, goods, lambda: slat("slatA", 21), lambda: slat("slatB", 22), neon): f()
