import sys, math; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
PI = math.pi
def gumball():
    start(1); iron = mat("iron", "#1c1c20", 0.45, 0.8); red = mat("red_enamel", "#c8141a", 0.25, 0.1); chrome = mat("chrome", "#d8d8dc", 0.15, 1); glass = mat("glass", "#dff4ff", 0.05, 0, 0.22)
    cyl(0.21, 0.03, (0, 0, 0.015), iron); cyl(0.13, 0.09, (0, 0, 0.075), iron, r2=0.04); cyl(0.024, 0.62, (0, 0, 0.42), chrome)
    cyl(0.1, 0.05, (0, 0, 0.745), red, r2=0.14); cyl(0.14, 0.2, (0, 0, 0.87), red, r2=0.175); cyl(0.185, 0.025, (0, 0, 0.98), chrome)
    box((0.1, 0.03, 0.12), (0, -0.165, 0.87), chrome, 0.008); cyl(0.032, 0.035, (0, -0.195, 0.885), chrome, (PI / 2, 0, 0)); box((0.012, 0.03, 0.07), (0, -0.215, 0.885), chrome, 0.004)
    box((0.085, 0.05, 0.05), (0, -0.15, 0.775), chrome, 0.01, (0.5, 0, 0))
    text("25¢", 0.035, (0, -0.181, 0.94), mat("white", "#ffffff", 0.6), rot=(PI / 2, 0, 0))
    sph(0.2, (0, 0, 1.14), glass, seg=28)
    n = 0
    while n < 170:
        p = Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 0.35)))
        if p.length < 1: sph(0.016, (p.x * 0.17, p.y * 0.17, 1.14 + p.z * 0.17), mat("gb" + str(n % 6), BRIGHT[n % 6], 0.2), seg=8); n += 1
    cyl(0.1, 0.035, (0, 0, 1.33), red, r2=0.07); sph(0.022, (0, 0, 1.36), chrome)
    finish("gumball")
def stickers():
    start(2); body = mat("cab_blue", "#1f4fb8", 0.4, 0.2); dark = mat("dark", "#18181c", 0.6, 0.5); chrome = mat("chrome", "#d8d8dc", 0.2, 1); yel = mat("header", "#ffd23a", 0.5, 0, 1, 0.6); white = mat("white", "#f4f0e6", 0.6)
    for sx in (-1, 1):
        for sy in (-1, 1): box((0.04, 0.04, 0.5), (sx * 0.34, sy * 0.11, 0.25), dark, 0.004)
    box((0.74, 0.28, 0.03), (0, 0, 0.12), dark); box((0.8, 0.3, 1.0), (0, 0, 1.0), body, 0.015)
    box((0.8, 0.03, 0.18), (0, -0.155, 1.41), yel, 0.01); text("STICKERS", 0.085, (0, -0.172, 1.425), mat("ink", "#c8141a", 0.5)); text("2 quarters", 0.04, (0, -0.172, 1.355), mat("ink2", "#1c1c20", 0.5))
    for i in range(5):
        x = -0.3 + i * 0.15
        box((0.125, 0.012, 0.5), (x, -0.152, 1.03), white, 0.003)
        c = BRIGHT[(i * 3 + 1) % 7]
        for j in range(3): box((0.095, 0.006, 0.12), (x, -0.16, 0.88 + j * 0.15), mat("st" + str((i + j) % 7), BRIGHT[(i + j * 2) % 7], 0.3, 0, 1, 0.25), 0.002, (0, R.uniform(-0.12, 0.12), 0))
        for j in range(3): cyl(0.03, 0.004, (x, -0.164, 0.88 + j * 0.15), mat("st" + str((i + j + 3) % 7), BRIGHT[(i + j + 3) % 7], 0.3, 0, 1, 0.25), (PI / 2, 0, 0), seg=5 + j)
        box((0.1, 0.05, 0.07), (x, -0.17, 0.69), chrome, 0.006); box((0.07, 0.07, 0.012), (x, -0.215, 0.69), chrome, 0.003); cyl(0.012, 0.03, (x, -0.25, 0.69), dark, (PI / 2, 0, 0), seg=12)
    box((0.72, 0.06, 0.08), (0, -0.16, 0.57), dark, 0.01); box((0.66, 0.04, 0.012), (0, -0.19, 0.545), chrome, 0.003)
    finish("stickers")
def spinner():
    start(3); dark = mat("dark", "#18181c", 0.5, 0.6); wire = mat("wire", "#e8e8e8", 0.35, 0.6); yel = mat("topper", "#ffd23a", 0.5)
    cyl(0.3, 0.035, (0, 0, 0.0175), dark); cyl(0.07, 0.1, (0, 0, 0.085), dark, r2=0.03); cyl(0.018, 1.62, (0, 0, 0.84), wire)
    for t in range(4):
        z = 0.42 + t * 0.32; torus(0.15, 0.006, (0, 0, z), wire); torus(0.15, 0.006, (0, 0, z + 0.2), wire)
        for k in range(4):
            a = k * PI / 2 + PI / 4; c, s = math.cos(a), math.sin(a)
            tube([(0, 0, z), (c * 0.15, s * 0.15, z)], 0.005, wire); tube([(0, 0, z + 0.2), (c * 0.15, s * 0.15, z + 0.2)], 0.005, wire)
        for k in range(4):
            a = k * PI / 2; c, s = math.sin(a), -math.cos(a)
            for u in (-0.085, 0.085):
                px, py = c * 0.17 - s * u, s * 0.17 + c * u
                box((0.15, 0.03, 0.02), (px, py, z + 0.005), wire, 0.004, (0, 0, a))
                col = BRIGHT[R.randrange(7)]
                for q in range(3): box((0.14, 0.004, 0.2), (c * (0.165 + q * 0.008) - s * u, s * (0.165 + q * 0.008) + c * u, z + 0.115), mat("card" + col + str(q % 2), col if q == 0 else "#f4f0e6", 0.4), 0.002, (0.1, 0, a))
                box((0.1, 0.002, 0.07), (c * 0.16 - s * u, s * 0.16 + c * u, z + 0.15), mat("pic" + str(R.randrange(4)), ["#2a6fd8", "#ff8a1e", "#1c1c20", "#7dff5a"][R.randrange(4)], 0.4), 0, (0.1, 0, a))
    box((0.36, 0.012, 0.13), (0, 0, 1.72), yel, 0.004); text("POSTCARDS", 0.05, (0, -0.008, 1.735), mat("ink", "#c8141a", 0.5)); text("3 for $1", 0.035, (0, -0.008, 1.685), mat("ink2", "#1c1c20", 0.5))
    text("POSTCARDS", 0.05, (0, 0.008, 1.735), mat("ink", "#c8141a", 0.5), rot=(PI / 2, 0, PI)); 
    finish("spinner")
def case():
    start(4); lam = mat("laminate", "#7a4a2a", 0.5); dark = mat("dark", "#18181c", 0.6); alu = mat("aluminium", "#c8c8cc", 0.3, 0.9); glass = mat("glass", "#cfeaff", 0.05, 0, 0.16); white = mat("deck", "#ece8dc", 0.7); led = mat("led", "#fff2d0", 0.5, 0, 1, 5)
    W, D = 1.8, 0.6
    box((W - 0.04, D - 0.06, 0.08), (0, 0.01, 0.04), dark, 0.004); box((W, D, 0.26), (0, 0, 0.21), lam, 0.008); box((W - 0.04, D - 0.04, 0.012), (0, 0, 0.346), white, 0.002)
    for sx in (-1, 1):
        for sy in (-1, 1): box((0.03, 0.03, 0.66), (sx * (W / 2 - 0.015), sy * (D / 2 - 0.015), 0.67), alu, 0.004)
        box((0.008, D - 0.06, 0.62), (sx * (W / 2 - 0.012), 0, 0.67), glass, 0)
    for sy in (-1, 1): box((W, 0.03, 0.03), (0, sy * (D / 2 - 0.015), 0.985), alu, 0.004)
    for sx in (-1, 1): box((0.03, D, 0.03), (sx * (W / 2 - 0.015), 0, 0.985), alu, 0.004)
    box((W - 0.06, 0.008, 0.62), (0, -D / 2 + 0.012, 0.67), glass, 0); box((W - 0.06, D - 0.06, 0.008), (0, 0, 0.992), glass, 0)
    box((W - 0.06, 0.012, 0.62), (0, D / 2 - 0.012, 0.67), lam, 0.002); box((W - 0.1, 0.012, 0.012), (0, -D / 2 + 0.035, 0.965), led, 0)
    for z in (0.56, 0.77): box((W - 0.07, 0.36, 0.008), (0, 0.07, z), glass, 0); [box((0.02, 0.02, 0.012), (sx * (W / 2 - 0.04), 0.07 + sy * 0.15, z - 0.01), alu, 0) for sx in (-1, 1) for sy in (-1, 1)]
    rub = [mat("wheel" + str(i), BRIGHT[i], 0.35) for i in range(6)]; hub = mat("hub", "#f4f0e6", 0.4); card = [mat("pk" + str(i), c, 0.5) for i, c in enumerate(["#1f4fb8", "#c8141a", "#18181c", "#ffd23a"])]
    for z0, y0 in ((0.352, -0.05), (0.564, 0.07), (0.774, 0.07)):
        x = -W / 2 + 0.16
        while x < W / 2 - 0.12:
            k = R.randrange(5)
            if k == 0:  # a set of four skate wheels standing in a row
                m = R.choice(rub)
                for i in range(4): cyl(0.031, 0.032, (x - 0.06 + i * 0.04, y0, z0 + 0.031), m, (0, PI / 2, 0), seg=20); cyl(0.014, 0.034, (x - 0.06 + i * 0.04, y0, z0 + 0.031), hub, (0, PI / 2, 0), seg=10)
            elif k == 1: box((0.16, 0.11, 0.06), (x, y0, z0 + 0.03), R.choice(card), 0.004, (0, 0, R.uniform(-0.2, 0.2))); box((0.1, 0.07, 0.003), (x, y0, z0 + 0.061), hub, 0)
            elif k == 2:  # toe stops, a pair
                m = R.choice(rub)
                for s in (-1, 1): cyl(0.028, 0.03, (x + s * 0.04, y0, z0 + 0.015), m, r2=0.022, seg=16); cyl(0.006, 0.03, (x + s * 0.04, y0, z0 + 0.045), mat("chrome", "#d8d8dc", 0.2, 1), seg=8)
            elif k == 3: cyl(0.05, 0.022, (x, y0, z0 + 0.011), mat("chrome", "#d8d8dc", 0.2, 1)); cyl(0.035, 0.002, (x, y0, z0 + 0.023), R.choice(card))
            else:  # coiled laces
                m = R.choice(rub); [torus(0.04, 0.007, (x, y0, z0 + 0.008 + i * 0.012), m, seg=16) for i in range(3)]
            x += 0.24
    finish("case")
def fridge():
    start(5); blk = mat("body", "#141416", 0.4, 0.3); white = mat("liner", "#f4f6fa", 0.6, 0, 1, 0.5); glass = mat("glass", "#cfeaff", 0.05, 0, 0.14); chrome = mat("chrome", "#d8d8dc", 0.2, 1); hdr = mat("header_lit", "#e01a22", 0.5, 0, 1, 2.2); led = mat("led", "#eaf6ff", 0.5, 0, 1, 6)
    W, D, Ht = 0.62, 0.6, 1.4
    box((W, D, 0.12), (0, 0, 0.06), blk, 0.008); box((W - 0.1, 0.01, 0.06), (0, -D / 2, 0.06), mat("grille", "#2a2a2e", 0.6, 0.6), 0)
    box((W, 0.03, Ht - 0.12), (0, D / 2 - 0.015, 0.12 + (Ht - 0.12) / 2), blk)
    for sx in (-1, 1): box((0.03, D, Ht - 0.12), (sx * (W / 2 - 0.015), 0, 0.12 + (Ht - 0.12) / 2), blk)
    box((W, D, 0.2), (0, 0, Ht - 0.1), blk); box((W - 0.06, 0.012, 0.15), (0, -D / 2 - 0.004, Ht - 0.1), hdr, 0.003); text("ICE COLD", 0.075, (0, -D / 2 - 0.012, Ht - 0.1), mat("white_lit", "#ffffff", 0.5, 0, 1, 2.5))
    box((W - 0.064, 0.005, Ht - 0.34), (0, D / 2 - 0.033, 0.12 + (Ht - 0.32) / 2), white, 0)
    for sx in (-1, 1): box((0.005, D - 0.07, Ht - 0.34), (sx * (W / 2 - 0.033), 0, 0.12 + (Ht - 0.32) / 2), white, 0); box((0.01, 0.01, Ht - 0.4), (sx * (W / 2 - 0.045), -D / 2 + 0.06, 0.12 + (Ht - 0.32) / 2), led, 0)
    box((W - 0.064, D - 0.07, 0.005), (0, 0, 0.124), white, 0)
    # door: frame + glass + handle
    dz0, dz1 = 0.13, Ht - 0.21; dm = (dz0 + dz1) / 2
    for sx in (-1, 1): box((0.04, 0.035, dz1 - dz0), (sx * (W / 2 - 0.02), -D / 2 - 0.0175, dm), blk, 0.006)
    for z in (dz0 + 0.02, dz1 - 0.02): box((W, 0.035, 0.04), (0, -D / 2 - 0.0175, z), blk, 0.006)
    box((W - 0.07, 0.008, dz1 - dz0 - 0.07), (0, -D / 2 - 0.018, dm), glass, 0); box((0.02, 0.03, 0.3), (W / 2 - 0.05, -D / 2 - 0.05, dm), chrome, 0.006)
    cans = [mat("can" + str(i), c, 0.25, 0.7) for i, c in enumerate(["#e01a22", "#1f4fb8", "#3ac86a", "#8a1a2a", "#ff8a1e"])]
    for t in range(5):
        z = 0.127 + t * 0.2
        if t: box((W - 0.07, D - 0.09, 0.008), (0, 0, z - 0.004), chrome, 0)
        for i in range(6):
            for j in range(4): cyl(0.032, 0.122, (-0.2 + i * 0.08, -0.2 + j * 0.075, z + 0.061), cans[(t + (i // 2)) % 5], seg=12); cyl(0.027, 0.004, (-0.2 + i * 0.08, -0.2 + j * 0.075, z + 0.123), chrome, seg=10)
    finish("fridge")
for f in (gumball, stickers, spinner, case, fridge): f()
