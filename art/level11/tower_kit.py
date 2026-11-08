# Level 11 tower kit v2 (Shelly: never blocky): walk-ups with real recessed windows cut through the wall, a storefront band,
# set-backs, dentil cornices, parapets with coping, rooftop water tank and AC; the hero house with lap siding, trim, shingled gable roof and porch.
# exec'd by build.py after street_kit.py; overrides brick_a, brick_b, house.
MATS.update({
    "siding": ((0.62, 0.7, 0.6), 0.75, 0, 0), "shingle": ((0.22, 0.2, 0.2), 0.95, 0, 0), "door": ((0.32, 0.08, 0.07), 0.5, 0, 0),
    "sign": ((0.08, 0.18, 0.12), 0.5, 0.2, 0), "frame": ((0.1, 0.16, 0.12), 0.45, 0.4, 0),
})
def FF(face, W, D):
    if face == "+y": return (lambda u, n, z: (u, D / 2 + n, z)), (lambda su, sn, sz: (su, sn, sz))
    if face == "-y": return (lambda u, n, z: (u, -D / 2 - n, z)), (lambda su, sn, sz: (su, sn, sz))
    if face == "+x": return (lambda u, n, z: (W / 2 + n, u, z)), (lambda su, sn, sz: (sn, su, sz))
    return (lambda u, n, z: (-W / 2 - n, u, z)), (lambda su, sn, sz: (sn, su, sz))
def fb(M, m, face, W, D, u, n, z, su, sn, sz):
    P, S = FF(face, W, D); M.box(m, P(u, n, z), S(su, sn, sz))
def holed(M, m, face, W, D, T, z0, z1, holes):
    if face == "+y": wall(M, m, "x", D / 2 - T, D / 2, -W / 2, W / 2, z0, z1, holes)
    elif face == "-y": wall(M, m, "x", -D / 2, -D / 2 + T, -W / 2, W / 2, z0, z1, holes)
    elif face == "+x": wall(M, m, "y", W / 2 - T, W / 2, -D / 2 + T, D / 2 - T, z0, z1, holes)
    else: wall(M, m, "y", -W / 2, -W / 2 + T, -D / 2 + T, D / 2 - T, z0, z1, holes)
def rwin(M, rnd, face, W, D, u, z0, z1, w, T, lit=0.15, rich=True, sill="trim", lint="trim"):
    """a set-in window: the hole is cut by holed(); frame, glass, meeting rail at depth, a stone sill proud of the wall, a lintel"""
    h = z1 - z0; d = -T * 0.62
    fb(M, "frame", face, W, D, u, d - 0.04, (z0 + z1) / 2, w, 0.06, h)                       # the frame behind the glass reads as a border
    fb(M, "glassLit" if rnd.random() < lit else "glass", face, W, D, u, d, (z0 + z1) / 2, w - 0.14, 0.03, h - 0.14)
    if rich: fb(M, "frame", face, W, D, u, d + 0.03, (z0 + z1) / 2 + h * 0.04, w - 0.1, 0.05, 0.06)
    fb(M, sill, face, W, D, u, 0.02, z0 - 0.06, w + 0.22, 0.18 + T * 0.6, 0.12)
    fb(M, lint, face, W, D, u, 0.03, z1 + 0.14, w + 0.34, 0.08, 0.28)
def bays(span, bay):
    n = max(1, int(span // bay)); st = span / n; return [-span / 2 + st * (i + 0.5) for i in range(n)]
def ac(M, rnd, P, s=1.0):
    x, y, z = P; cbox(M, "metal", (x, y, z + 0.45 * s), (1.6 * s, 1.1 * s, 0.9 * s), 0.04); M.cyl("dark", (x + 0.3 * s, y, z + 0.92 * s), 0.38 * s, 0.06, seg=12)
    for k in range(5): M.box("dark", (x - 0.78 * s, y - 0.4 * s + k * 0.2 * s, z + 0.45 * s), (0.03, 0.08, 0.6 * s))
def tank(M, x, y, z):
    M.cyl("wood", (x, y, z + 3.2), 1.25, 2.6, seg=18)
    for k in range(4): M.cyl("metal", (x, y, z + 2.1 + k * 0.7), 1.27, 0.06, seg=18)
    M.cyl("shingle", (x, y, z + 4.75), 1.4, 0.55, r2=0.08, seg=18)
    for sx in (-0.85, 0.85):
        for sy in (-0.85, 0.85): M.box("metal", (x + sx, y + sy, z + 0.95), (0.14, 0.14, 1.9))
    M.box("metal", (x, y, z + 1.9), (2.0, 2.0, 0.1)); tube(M, "metal", [(x + 1.2, y, z + 2.0), (x + 1.3, y, z), ], 0.06, 6)
def crown(M, rnd, W, D, z, dent=True, mat="trim"):
    """a cornice: frieze, bed moulding, dentils, corona, cymatium"""
    M.box(mat, (0, 0, z + 0.2), (W + 0.12, D + 0.12, 0.4)); M.box(mat, (0, 0, z + 0.48), (W + 0.4, D + 0.4, 0.16))
    if dent:
        for face, span in (("+y", W), ("-y", W), ("+x", D), ("-x", D)):
            P, S = FF(face, W, D); k = int(span / 0.42)
            for i in range(k): M.box(mat, P(-span / 2 + 0.21 + i * 0.42, 0.24, z + 0.66), S(0.18, 0.22, 0.2))
    M.box(mat, (0, 0, z + 0.86), (W + 0.95, D + 0.95, 0.22)); M.box(mat, (0, 0, z + 1.02), (W + 0.7, D + 0.7, 0.1))
def para(M, W, D, z, h, mat="brick"):
    t = 0.3; parapet(M, W, D, z, h, t, mat)
    for face, span in (("+y", W), ("-y", W)): M.box("trim", FF(face, W, D)[0](0, -t / 2, z + h + 0.06), (span + 0.12, t + 0.12, 0.12))
    for face, span in (("+x", D), ("-x", D)): M.box("trim", FF(face, W, D)[0](0, -t / 2, z + h + 0.06), (t + 0.12, span + 0.12, 0.12))
def storefront(M, rnd, W, D, T, h, awn):
    """the ground floor's +y face: pilasters, three shop windows on bulkheads, a recessed door, a sign band, an awning"""
    xs = bays(W, W / 3); sw = W / 3 - 1.1; holes = []
    for i, x in enumerate(xs):
        holes.append((x - sw / 2, x + sw / 2, 0.55, h - 1.2))
    holed(M, "brick", "+y", W, D, T, 0.0, h, holes)
    for i, x in enumerate(xs):
        door = i == 1
        # bulkhead, shop glass with transom and mullions, a recessed door in the middle bay
        if door:
            M.box("trim", (x, D / 2 - T - 0.6, 0.05), (sw, 1.2, 0.1)); M.box("door", (x, D / 2 - T - 1.1, (h - 1.2) / 2 + 0.3), (1.2, 0.08, h - 1.8))
            M.box("glass", (x, D / 2 - T - 1.08, (h - 1.2) / 2 + 0.6), (0.8, 0.06, 1.1))
            for s in (-1, 1): M.box("glass", (x + s * (sw / 2 - 0.05), D / 2 - T - 0.5, (h - 1.2) / 2 + 0.3), (0.06, 1.1, h - 1.6)); M.box("frame", (x + s * (sw / 2 - 0.05), D / 2 - T - 0.5, 0.3), (0.12, 1.2, 0.5))
            M.box("frame", (x, D / 2 - T - 1.1, h - 1.4), (sw, 0.1, 0.12)); M.box("glassLit", (x, D / 2 - T - 0.5, h - 1.3), (sw - 0.2, 1.0, 0.04))
        else:
            M.box("wood", (x, D / 2 - T * 0.5, 0.45), (sw, T * 0.9, 0.9)); M.box("frame", (x, D / 2 - T * 0.55, 0.95), (sw, T * 0.8, 0.1))
            M.box("frame", (x, D / 2 - T * 0.7, (h - 0.2) / 2 + 0.3), (sw, 0.06, h - 1.6))
            M.box("glassLit" if rnd.random() < 0.55 else "glass", (x, D / 2 - T * 0.6, (h - 0.2) / 2 + 0.3), (sw - 0.16, 0.04, h - 1.9))
            M.box("frame", (x, D / 2 - T * 0.55, h - 1.75), (sw, 0.1, 0.08))
            for k in (-1, 1): M.box("frame", (x + k * sw / 6, D / 2 - T * 0.55, (h - 0.2) / 2 + 0.3), (0.06, 0.08, h - 1.9))
    # pilasters with bases and caps, a sign band with a cornice
    for x in [-W / 2 + 0.25] + [(a + b) / 2 for a, b in zip(xs, xs[1:])] + [W / 2 - 0.25]:
        M.box("trim", (x, D / 2 + 0.08, h / 2), (0.62, 0.18, h - 0.2)); M.box("trim", (x, D / 2 + 0.13, 0.25), (0.76, 0.26, 0.5)); M.box("trim", (x, D / 2 + 0.14, h - 0.95), (0.76, 0.28, 0.18))
    M.box("sign", (0, D / 2 + 0.1, h - 0.55), (W - 0.6, 0.12, 0.62)); M.box("trim", (0, D / 2 + 0.2, h - 0.15), (W + 0.3, 0.38, 0.22))
    for x in xs:
        if x != xs[1]: cbox(M, awn, (x, D / 2 + 0.85, h - 1.45), (sw + 0.3, 1.6, 0.06), 0.01, rot=(-0.38, 0, 0)); cbox(M, awn, (x, D / 2 + 1.6, h - 1.86), (sw + 0.3, 0.06, 0.3), 0.01)
        for k in range(int(sw / 0.5)):
            if x != xs[1]: M.box("white", (x - sw / 2 + 0.25 + k * 0.5, D / 2 + 0.86, h - 1.43), (0.22, 1.62, 0.07), rot=(-0.38, 0, 0))
def walkup(name, seed, W, D, floors, fh, top, bayF, bayS, awn, tank_at, escape=True):
    """W x D walk-up: storefront ground floor (h 4.4), brick upper floors with set-in windows, a string course every other floor,
    a dentil cornice, an optional set-back penthouse block (top = (W2, D2, floors2, yoff)), parapets with coping, rooftop kit"""
    M = Mesh(); rnd = random.Random(seed); T = 0.38; G = 4.4; ww, wh, sill = 1.1, 1.75, 0.85
    M.box("concrete", (0, 0, -0.15), (W + 0.3, D + 0.3, 0.5)); M.box("dark", (0, 0, G / 2 + floors * fh / 2), (W - 2 * T - 0.05, D - 2 * T - 0.05, G + floors * fh - 0.1))
    storefront(M, rnd, W, D, T, G, awn)
    for face in ("-y", "+x", "-x"): holed(M, "brick", face, W, D, T, 0.0, G, [(u - 0.6, u + 0.6, 1.0, 3.0) for u in bays(W if face == "-y" else D - 2 * T, 4.5)[::2]])
    for face in ("-y", "+x", "-x"):
        for u in bays(W if face == "-y" else D - 2 * T, 4.5)[::2]: rwin(M, rnd, face, W, D, u, 1.0, 3.0, 1.2, T, 0.1, False)
    zt = G + floors * fh
    for face in ("+y", "-y", "+x", "-x"):
        span = W if face in ("+y", "-y") else D - 2 * T; us = bays(span, bayF if face == "+y" else bayS)
        holes = [(u - ww / 2, u + ww / 2, G + f * fh + sill, G + f * fh + sill + wh) for f in range(floors) for u in us]
        holed(M, "brick", face, W, D, T, G, zt, holes)
        for f in range(floors):
            for u in us: rwin(M, rnd, face, W, D, u, G + f * fh + sill, G + f * fh + sill + wh, ww, T, 0.2, face == "+y")
    for f in range(0, floors, 2): M.box("trim", (0, 0, G + f * fh + 0.05), (W + 0.16, D + 0.16, 0.24))
    crown(M, rnd, W, D, zt); M.box("roof", (0, 0, zt + 1.0), (W - 0.2, D - 0.2, 0.2)); para(M, W, D, zt + 1.1, 0.7)
    roofz = zt + 1.1
    if top:
        W2, D2, f2, yo = top; z2 = zt + 1.1; z3 = z2 + f2 * fh
        M.box("dark", (0, yo, (z2 + z3) / 2), (W2 - 0.8, D2 - 0.8, z3 - z2))
        for face in ("+y", "-y", "+x", "-x"):
            span = W2 if face in ("+y", "-y") else D2 - 2 * T; us = bays(span, bayS); P = FF(face, W2, D2)
            holes = [(u - ww / 2, u + ww / 2, z2 + f * fh + sill, z2 + f * fh + sill + wh) for f in range(f2) for u in us]
            tmp = Mesh(); holed(tmp, "brick", face, W2, D2, T, z2, z3, holes)
            for f in range(f2):
                for u in us: rwin(tmp, rnd, face, W2, D2, u, z2 + f * fh + sill, z2 + f * fh + sill + wh, ww, T, 0.25, False)
            for m, bm in tmp.b.items():
                bmesh.ops.translate(bm, vec=(0, yo, 0), verts=bm.verts[:]); tmp2 = bm; _merge(M, m, tmp2, Matrix.Identity(4))
        crownM = Mesh(); crown(crownM, rnd, W2, D2, z3, False); para(crownM, W2, D2, z3 + 1.1, 0.6)
        for m, bm in crownM.b.items(): _merge(M, m, bm, Matrix.Translation((0, yo, 0)))
        M.box("roof", (0, yo, z3 + 1.0), (W2 - 0.2, D2 - 0.2, 0.2)); tank(M, W2 * 0.22, yo - D2 * 0.15, z3 + 1.1)
        ac(M, rnd, (-W * 0.3, D * 0.36, roofz)); ac(M, rnd, (W * 0.32, D * 0.38, roofz), 0.8)
        M.box("metal", (-W2 * 0.3, yo, z3 + 1.6), (1.2, 1.4, 1.0))
    else:
        if tank_at: tank(M, W * 0.2, -D * 0.15, roofz)
        ac(M, rnd, (-W * 0.25, D * 0.2, roofz)); ac(M, rnd, (W * 0.05, -D * 0.25, roofz), 0.8); M.box("brick", (-W * 0.35, -D * 0.3, roofz + 1.2), (1.6, 0.8, 2.4)); M.box("trim", (-W * 0.35, -D * 0.3, roofz + 2.45), (1.8, 1.0, 0.12))
    if escape:   # a fire escape down the -x side: landings, rails, ladders, drop ladder
        x = -W / 2 - 0.65
        for f in range(1, floors + 1):
            z = G + (f - 1) * fh + 0.02; M.box("metal", (x, 0, z), (1.1, 3.4, 0.06)); M.box("metal", (x - 0.53, 0, z + 0.5), (0.04, 3.4, 0.04))
            for e in (-1.7, 1.7): M.box("metal", (x, e, z + 0.5), (1.1, 0.04, 0.04))
            for k in range(9): M.box("metal", (x - 0.53, -1.6 + k * 0.4, z + 0.25), (0.025, 0.025, 0.5))
            for s in (-0.25, 0.25): tube(M, "metal", [(x + s, -1.4 if f % 2 else 1.4, z), (x + s, 1.2 if f % 2 else -1.2, z + fh)], 0.025, 4) if f < floors else None
            for b in (-1.5, 1.5): tube(M, "metal", [(x - 0.5, b, z), (-W / 2, b, z - 0.6)], 0.025, 4)
    return M
def brick_a():
    M = walkup("brick_a", 41, 18, 14, 6, 3.2, (12, 9, 2, -1.5), 2.6, 3.0, "awnA", True)
    ob = M.finish("l11_brick_a"); turnaround("brick_a", ob, (30, 160, 280), 0.3, 1.25); return ob
def brick_b():
    M = walkup("brick_b", 53, 12, 11, 3, 3.1, None, 2.4, 2.8, "awnC", True, escape=True)
    ob = M.finish("l11_brick_b"); turnaround("brick_b", ob, (30, 160, 280), 0.3, 1.3); return ob

# ---- the hero house: a 2000s two-storey, lap siding, white trim, shingled front gable, a full porch, chimney
def house():
    M = Mesh(); rnd = random.Random(7); W, D = 8.0, 9.0; T = 0.2; F = 0.7; fh = 2.8; z1 = F + 2 * fh; pitch = math.radians(38); rh = (W / 2) * math.tan(pitch)
    M.box("concrete", (0, 0, F / 2 - 0.1), (W + 0.12, D + 0.12, F + 0.2))
    # walls with openings: front door + windows, side and back windows (two floors)
    WIN = {"+y": [(-2.2, 0), (2.0, 0), (-2.0, 1), (2.0, 1)], "-y": [(-2.0, 0), (1.6, 0), (-1.8, 1), (1.8, 1)],
           "+x": [(-2.6, 0), (2.4, 0), (-2.4, 1), (0.6, 1), (2.6, 1)], "-x": [(-2.6, 0), (0.0, 0), (2.4, 0), (-2.4, 1), (2.4, 1)]}
    ww, wh = 0.95, 1.45
    for face, ws in WIN.items():
        holes = [(u - ww / 2, u + ww / 2, F + f * fh + 0.85, F + f * fh + 0.85 + wh) for u, f in ws]
        if face == "+y": holes.append((-0.1 - 0.5, -0.1 + 0.5, F, F + 2.15))
        holed(M, "siding", face, W, D, T, F, z1, holes)
        for u, f in ws:
            z0 = F + f * fh + 0.85
            rwin(M, rnd, face, W, D, u, z0, z0 + wh, ww, T, 0.22, True, "trim", "trim")
            for s in (-1, 1): fb(M, "trim", face, W, D, u + s * (ww / 2 + 0.07), 0.025, z0 + wh / 2, 0.12, 0.05, wh + 0.1)   # casing
            if face in ("+y", "+x"):
                for s in (-1, 1):   # louvred shutters
                    fb(M, "door", face, W, D, u + s * (ww / 2 + 0.45), 0.04, z0 + wh / 2, 0.5, 0.04, wh + 0.05)
                    for k in range(8): fb(M, "door", face, W, D, u + s * (ww / 2 + 0.45), 0.065, z0 + 0.15 + k * wh / 8, 0.42, 0.02, 0.05)
    # the front door: panelled, with a sidelight transom and casing
    P, S = FF("+y", W, D); M.box("door", P(-0.1, -0.12, F + 1.03), S(0.92, 0.06, 2.06))
    for zz in (F + 0.5, F + 1.45): M.box("door", P(-0.1, -0.08, zz), S(0.6, 0.04, 0.6 if zz < 1.5 else 0.7))
    M.box("glass", P(-0.1, -0.07, F + 1.75), S(0.5, 0.03, 0.4)); M.cyl("chrome", P(0.25, -0.05, F + 1.0), 0.04, 0.06, seg=8, rot=(math.pi / 2, 0, 0))
    for s in (-1, 1): M.box("trim", P(-0.1 + s * 0.57, 0.03, F + 1.1), S(0.14, 0.06, 2.25))
    M.box("trim", P(-0.1, 0.04, F + 2.27), S(1.3, 0.08, 0.18))
    # corner boards, a frieze under the eaves, a belly band between floors, water table
    for sx in (-1, 1):
        for sy in (-1, 1): M.box("trim", (sx * (W / 2 + 0.02), sy * (D / 2 + 0.02), (F + z1) / 2), (0.16, 0.16, z1 - F))
    M.box("trim", (0, 0, F + 0.06), (W + 0.08, D + 0.08, 0.14)); M.box("trim", (0, 0, F + fh + 0.02), (W + 0.06, D + 0.06, 0.1)); M.box("trim", (0, 0, z1 - 0.12), (W + 0.08, D + 0.08, 0.24))
    # front and back gables: pentagons with siding, a gable vent and a raking trim
    for sy in (1, -1):
        y0, y1 = sorted((sy * (D / 2 - T), sy * D / 2))
        bm = M.bm("siding"); pts = [(-W / 2, z1), (W / 2, z1), (0, z1 + rh)]
        lo = [bm.verts.new((x, y0, z)) for x, z in pts]; hi = [bm.verts.new((x, y1, z)) for x, z in pts]
        bm.faces.new(lo); bm.faces.new(hi[::-1])
        for i in range(3): j = (i + 1) % 3; bm.faces.new((lo[i], hi[i], hi[j], lo[j]))
        M.box("trim", (0, sy * (D / 2 + 0.03), z1 + rh * 0.5), (0.7, 0.06, 0.7), rot=(0, math.radians(45), 0)); M.box("dark", (0, sy * (D / 2 + 0.05), z1 + rh * 0.5), (0.5, 0.05, 0.5), rot=(0, math.radians(45), 0))
        for k in range(4): M.box("trim", (0, sy * (D / 2 + 0.07), z1 + rh * 0.5 - 0.15 + k * 0.1), (0.42, 0.03, 0.035))
    # the roof: two slabs with an overhang, shingle courses stepped on top, a ridge cap, fascia, gutters and downspouts
    L = (W / 2 + 0.55) / math.cos(pitch); Dr = D + 0.9
    for sx in (-1, 1):
        cx = sx * (W / 2 + 0.55) / 2; cz = z1 + rh - ((W / 2 + 0.55) / 2) * math.tan(pitch) + 0.1
        M.box("shingle", (cx, 0, cz), (L, Dr, 0.12), rot=(0, sx * pitch, 0))
        n = int(L / 0.32)
        for k in range(n):
            t = (k + 0.5) / n; px = sx * (W / 2 + 0.55) * (1 - t); pz = z1 + rh - (W / 2 + 0.55) * (1 - t) * math.tan(pitch) + 0.1 + 0.08 + (W / 2 + 0.55) * math.tan(pitch) * 0 
            px = sx * (W / 2 + 0.55) * t; pz = z1 + rh - (W / 2 + 0.55) * t * math.tan(pitch) + 0.19
            M.box("shingle", (px, 0, pz), (0.34, Dr - 0.02, 0.035), rot=(0, sx * pitch, 0))
        ex = sx * (W / 2 + 0.55); ez = z1 + rh - (W / 2 + 0.55) * math.tan(pitch) + 0.05
        M.box("trim", (ex, 0, ez), (0.05, Dr, 0.22)); M.cyl("white", (ex + sx * 0.08, 0, ez - 0.02), 0.07, Dr, seg=6, rot=(math.pi / 2, 0, 0))
        for sy in (-1, 1): M.cyl("white", (ex + sx * 0.08, sy * (Dr / 2 - 0.15), (ez + F) / 2 - 0.2), 0.045, ez - F, seg=6)
    M.box("shingle", (0, 0, z1 + rh + 0.2), (0.36, Dr + 0.04, 0.12))
    for sy in (1, -1):
        for sx in (-1, 1):   # raking boards along the gable edges
            M.box("trim", (sx * (W / 2 + 0.55) / 2, sy * (Dr / 2 + 0.02), z1 + rh - ((W / 2 + 0.55) / 2) * math.tan(pitch) + 0.02), (L, 0.06, 0.26), rot=(0, sx * pitch, 0))
    # chimney on the -x side, brick with a cap
    M.box("brick", (-W / 2 - 0.35, -1.6, (z1 + rh + 1.0) / 2), (0.7, 1.1, z1 + rh + 1.0)); M.box("concrete", (-W / 2 - 0.35, -1.6, z1 + rh + 1.05), (0.85, 1.25, 0.12))
    M.cyl("metal", (-W / 2 - 0.35, -1.6, z1 + rh + 1.3), 0.12, 0.4, seg=8)
    # the porch: deck with boards, steps, turned posts, a railing with balusters, a hipped shingle roof with a beam and ceiling
    PD = 2.4; py = D / 2 + PD / 2
    M.box("concrete", (0, py, F / 2 - 0.15), (W + 0.2, PD, F - 0.1)); M.box("trim", (0, D / 2 + PD - 0.05, F / 2 - 0.1), (W + 0.2, 0.1, F - 0.2))
    for k in range(int((W + 0.2) / 0.14)): M.box("wood", (-W / 2 - 0.1 + 0.07 + k * 0.14, py, F - 0.02), (0.12, PD - 0.02, 0.05))
    for i in range(3): M.box("wood", (-0.1, D / 2 + PD + 0.15 + i * 0.3, F - 0.2 - i * 0.2 - 0.04), (1.6, 0.32, 0.08)); M.box("trim", (-0.1, D / 2 + PD + 0.15 + i * 0.3, (F - 0.2 - i * 0.2) / 2 - 0.1), (1.6, 0.3, F - 0.2 - i * 0.2 - 0.1))
    ph = 2.55; posts = [-W / 2 + 0.15, -1.1, 0.9, W / 2 - 0.15]
    for x in posts:
        M.box("trim", (x, D / 2 + PD - 0.18, F + ph / 2), (0.16, 0.16, ph)); M.box("trim", (x, D / 2 + PD - 0.18, F + 0.12), (0.24, 0.24, 0.24)); M.box("trim", (x, D / 2 + PD - 0.18, F + ph - 0.1), (0.24, 0.24, 0.12))
    for a, b in ((posts[0], posts[1]), (posts[2], posts[3])):
        M.box("trim", ((a + b) / 2, D / 2 + PD - 0.18, F + 0.95), (b - a, 0.08, 0.06)); M.box("trim", ((a + b) / 2, D / 2 + PD - 0.18, F + 0.12), (b - a, 0.08, 0.05))
        for k in range(int((b - a) / 0.13)): M.box("trim", (a + 0.13 * (k + 0.6), D / 2 + PD - 0.18, F + 0.52), (0.035, 0.035, 0.8))
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.15)
        M.box("trim", (x, D / 2 + PD / 2 - 0.1, F + 0.95), (0.08, PD - 0.3, 0.06))
        for k in range(int((PD - 0.3) / 0.13)): M.box("trim", (x, D / 2 + 0.1 + 0.13 * (k + 0.5), F + 0.52), (0.035, 0.035, 0.8))
    M.box("trim", (0, D / 2 + PD - 0.18, F + ph + 0.12), (W + 0.3, 0.2, 0.25)); M.box("white", (0, py, F + ph + 0.02), (W + 0.2, PD, 0.04))
    pr = math.radians(18)
    M.box("shingle", (0, D / 2 + (PD + 0.45) / 2, F + ph + 0.4), (W + 0.6, (PD + 0.45) / math.cos(pr), 0.1), rot=(-pr, 0, 0))
    for k in range(int(PD / 0.3)): M.box("shingle", (0, D / 2 + 0.15 + k * 0.3, F + ph + 0.62 - k * 0.3 * math.tan(pr)), (W + 0.6, 0.32, 0.03), rot=(-pr, 0, 0))
    M.box("trim", (0, D / 2 + PD + 0.24, F + ph + 0.26), (W + 0.62, 0.05, 0.2))
    # a porch light and the house number
    M.box("metal", (0.75, D / 2 + 0.06, F + 1.85), (0.12, 0.08, 0.22)); M.sph("lamp", (0.75, D / 2 + 0.14, F + 1.82), 0.07, seg=8)
    M.box("metal", (-0.85, D / 2 + 0.03, F + 1.6), (0.28, 0.02, 0.12))
    ob = M.finish("l11_house"); turnaround("house", ob, (25, 150, 290), 0.25, 1.5); return ob
FUNCS_TK = {"brick_a": brick_a, "brick_b": brick_b, "house": house}
