# Level 9 "The Suburbs": the five walk-in house shells, built whole by this one script.
# run: blender -b --factory-startup --python-exit-code 1 --python art/level9/houses.py -- [ids...] [noproof]
# Plan coords everywhere: (x, z, h) with +z = the FRONT (glTF +Z); Blender y = -z. Exports /workspace/l9/houses/<id>.glb + <id>.json.
import bpy, bmesh, math, json, os, sys
from mathutils import Vector
OUT, PROOF = "/workspace/l9/houses", "/tmp/l9houses"
SLOTS = ["siding", "trim", "roof", "foundation", "glass", "floor", "wall_in", "ceiling", "stair"]
COL = dict(siding=(.62, .60, .52), trim=(.86, .85, .80), roof=(.09, .085, .08), foundation=(.42, .42, .40), glass=(.35, .45, .5),
           floor=(.36, .24, .14), wall_in=(.78, .74, .64), ceiling=(.88, .87, .83), stair=(.30, .19, .11))
MI = {n: i for i, n in enumerate(SLOTS)}
FY, F1, EXP, T, PT = 0.30, 3.00, 2.05 / 15, 0.20, 0.12
ZUP = Vector((0, 0, 1))
def B(x, z, h): return Vector((x, -z, h))

# ---------- raw geometry (into any bmesh) ----------
def g_prism(bm, r0, r1):
    a = [bm.verts.new(p) for p in r0]; b = [bm.verts.new(p) for p in r1]; n = len(a)
    fs = [bm.faces.new(a), bm.faces.new(b)] + [bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])) for i in range(n)]
    bmesh.ops.recalc_face_normals(bm, faces=fs); return fs
def g_box(bm, p, q):
    x0, x1 = sorted((p.x, q.x)); y0, y1 = sorted((p.y, q.y)); z0, z1 = sorted((p.z, q.z))
    ring = lambda z: [Vector((x0, y0, z)), Vector((x1, y0, z)), Vector((x1, y1, z)), Vector((x0, y1, z))]
    return g_prism(bm, ring(z0), ring(z1))
def g_tube(bm, p, q, r, n=8):
    d = (q - p).normalized(); u = d.cross(ZUP if abs(d.z) < .9 else Vector((1, 0, 0))).normalized(); v = d.cross(u)
    ring = lambda c: [c + (u * math.cos(6.2832 * i / n) + v * math.sin(6.2832 * i / n)) * r for i in range(n)]
    return g_prism(bm, ring(p), ring(q))
def g_quad(bm, pts, want):
    f = bm.faces.new([bm.verts.new(p) for p in pts]); f.normal_update()
    if f.normal.dot(want) < 0: f.normal_flip()
    return f
def free(lo, hi, blocks):
    out = [(lo, hi)]
    for b0, b1 in blocks:
        nxt = []
        for a, b in out:
            if b1 <= a or b0 >= b: nxt.append((a, b)); continue
            if b0 > a: nxt.append((a, b0))
            if b1 < b: nxt.append((b1, b))
        out = nxt
    return [(a, b) for a, b in out if b - a > 0.03]
def boolean(tb, cuts):
    cb = bmesh.new()
    for p, q in cuts: g_box(cb, p, q)
    ma, mb = bpy.data.meshes.new("a"), bpy.data.meshes.new("b"); tb.to_mesh(ma); cb.to_mesh(mb); tb.free(); cb.free()
    oa, ob = bpy.data.objects.new("a", ma), bpy.data.objects.new("b", mb)
    for o in (oa, ob): bpy.context.scene.collection.objects.link(o)
    m = oa.modifiers.new("b", "BOOLEAN"); m.operation, m.object, m.solver = "DIFFERENCE", ob, "EXACT"
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    res = bpy.data.meshes.new_from_object(oa.evaluated_get(dg))
    for o in (oa, ob): bpy.data.objects.remove(o)
    return res
def zmat(top, bot, side="trim"):
    return lambda n: top if n.z > .3 else bot if n.z < -.3 else side

class H:
    def __init__(s, id): s.id = id; s.bm = bmesh.new(); s.rooms = []; s.windows = []; s.door = None; s.back = None
    def add(s, build, mat, cut=None):
        s.bm.faces.ensure_lookup_table(); n = len(s.bm.faces)
        if cut:
            tb = bmesh.new(); build(tb); me = boolean(tb, cut); s.bm.from_mesh(me); bpy.data.meshes.remove(me)
        else: build(s.bm)
        s.bm.faces.ensure_lookup_table()
        for f in s.bm.faces[n:]:
            f.normal_update(); f.material_index = MI[mat(f.normal) if callable(mat) else mat]
    def box(s, x0, x1, z0, z1, h0, h1, mat, cut=None): s.add(lambda bm: g_box(bm, B(x0, z0, h0), B(x1, z1, h1)), mat, cut)
    def tube(s, p, q, r, mat, n=8): s.add(lambda bm: g_tube(bm, p, q, r, n), mat)
    def room(s, id, kind, floor, y, x0, x1, z0, z1): s.rooms.append(dict(id=id, kind=kind, floor=floor, y=y, min=[x0, z0], max=[x1, z1]))

    # ---------- a wall: a = b along its reference (outer) face, increasing x or z; thickness goes to -out ----------
    def wall(s, a, b, out, h0, h1, t=T, ops=(), gable=None, ext=True, cb=(True, True), floors=(), sid=True, wt=True):
        ax, az = a; bx, bz = b; L = math.hypot(bx - ax, bz - az); dx, dz = (bx - ax) / L, (bz - az) / L; nx, nz = out
        W = lambda u, off, h: B(ax + dx * u + nx * off, az + dz * u + nz * off, h)
        nB = Vector((nx, -nz, 0)); U = lambda c: (c - ax) if abs(dx) > .5 else (c - az)
        O = [(k, U(c0), U(c1), p, q) for (k, c0, c1, p, q) in ops]; CO = [o for o in O if o[0] != "x"]
        poly = [(0, h0), (L, h0), (L, gable[0]), (L / 2, gable[1]), (0, gable[0])] if gable else [(0, h0), (L, h0), (L, h1), (0, h1)]
        def mat(n):
            d = n.dot(nB)
            return ("siding" if ext else "wall_in") if d > .5 else "wall_in" if d < -.5 else "trim"
        cuts = [(W(u0, -t - .3, p - .3 if p <= h0 + 1e-4 else p), W(u1, .3, q)) for k, u0, u1, p, q in CO]
        s.add(lambda bm: g_prism(bm, [W(u, -t, h) for u, h in poly], [W(u, 0, h) for u, h in poly]), mat, cuts or None)
        wb = lambda u0, u1, o0, o1, p, q, m="trim": s.add(lambda bm: g_box(bm, W(u0, o0, p), W(u1, o1, q)), m)
        top = gable[1] if gable else h1; eave = gable[0] if gable else h1
        def span(h):
            if gable and h > gable[0]:
                i = min(1, (h - gable[0]) / (gable[1] - gable[0])) * L / 2; return i, L - i
            return 0, L
        if ext and sid:                                   # lap siding: one tilted board + its drip edge per course
            k = int(math.floor((h0 - FY) / EXP + 1e-6))
            while True:
                c0 = max(h0, FY + k * EXP); c1 = min(FY + (k + 1) * EXP, top); k += 1
                if c0 >= top - .01: break
                lb, hb_ = span(c0); lt, ht = span(c1)
                if hb_ - lb < .05: break
                blocks = [(u0, u1) for kk, u0, u1, p, q in CO if p < c1 - .01 and q > c0 + .01]
                for ua, ub in free(lb, hb_, blocks):
                    ta = lt if abs(ua - lb) < 1e-6 else ua; tb = ht if abs(ub - hb_) < 1e-6 else ub
                    f1 = g_quad(s.bm, [W(ua, .028, c0), W(ub, .028, c0), W(tb, .006, c1), W(ta, .006, c1)], nB)
                    f2 = g_quad(s.bm, [W(ua, .006, c0), W(ub, .006, c0), W(ub, .028, c0), W(ua, .028, c0)], -ZUP)
                    f1.material_index = f2.material_index = MI["siding"]
        if ext:
            if cb[0]: wb(-.035, .11, -.02, .035, h0, eave)
            if cb[1]: wb(L - .11, L + .035, -.02, .035, h0, eave)
            if wt:
                for ua, ub in free(-.04, L + .04, [(u0, u1) for kk, u0, u1, p, q in CO if p < h0 + .11]): wb(ua, ub, -.02, .045, h0 - .02, h0 + .09)
        for fl in floors:
            for ua, ub in free(0, L, [(u0, u1) for kk, u0, u1, p, q in O if p < fl + .09 and q > fl]):
                wb(ua, ub, -t - .012, -t + .004, fl, fl + .09)
                if not ext: wb(ua, ub, -.004, .012, fl, fl + .09)
        for k, u0, u1, p, q in CO:
            if k in ("win", "wins"):
                wb(u0 - .09, u0, -.03, .04, p, q); wb(u1, u1 + .09, -.03, .04, p, q)
                wb(u0 - .11, u1 + .11, -.03, .05, q, q + .11); wb(u0 - .13, u1 + .13, -.03, .07, p - .05, p)
                wb(u0, u0 + .045, -.10, -.055, p, q); wb(u1 - .045, u1, -.10, -.055, p, q)
                wb(u0 + .045, u1 - .045, -.10, -.055, q - .045, q); wb(u0 + .045, u1 - .045, -.10, -.055, p, p + .055)
                um = (u0 + u1) / 2; hm = (p + q) / 2
                for uv in ([um] if u1 - u0 < 1.3 else [u0 + (u1 - u0) / 3, u1 - (u1 - u0) / 3]): wb(uv - .011, uv + .011, -.088, -.066, p + .05, q - .04)
                wb(u0 + .04, u1 - .04, -.092, -.062, hm - .02, hm + .02)
                for hh in ((p + hm) / 2, (hm + q) / 2): wb(u0 + .04, u1 - .04, -.088, -.066, hh - .011, hh + .011)
                wb(u0 + .04, u1 - .04, -.080, -.074, p + .05, q - .04, "glass")
                wb(u0 - .07, u0, -t - .014, -t + .004, p, q); wb(u1, u1 + .07, -t - .014, -t + .004, p, q)
                wb(u0 - .07, u1 + .07, -t - .014, -t + .004, q, q + .07); wb(u0 - .09, u1 + .09, -t - .035, -t + .004, p - .03, p)
                if k == "wins":
                    for e0, e1 in ((u0 - .50, u0 - .10), (u1 + .10, u1 + .50)):
                        wb(e0, e1, .02, .05, p, q, "roof")
                        for g0, g1 in ((p + .07, hm - .04), (hm + .04, q - .07)): wb(e0 + .06, e1 - .06, .05, .062, g0, g1, "roof")
                c = W(um, -.077, hm); s.windows.append(dict(x=round(c.x, 2), y=round(hm, 2), z=round(-c.y, 2), face={(0, 1): "s", (0, -1): "n", (1, 0): "e", (-1, 0): "w"}[(round(nx), round(nz))]))
            elif k in ("door", "gdoor"):
                if ext:
                    wb(u0 - .09, u0, -.03, .04, p, q); wb(u1, u1 + .09, -.03, .04, p, q); wb(u0 - .11, u1 + .11, -.03, .05, q, q + .11)
                    if k == "door": wb(u0, u1, -t, .02, p - .01, p + .015)
                else:
                    wb(u0 - .07, u0, -.004, .014, p, q); wb(u1, u1 + .07, -.004, .014, p, q); wb(u0 - .07, u1 + .07, -.004, .014, q, q + .07)
                wb(u0 - .07, u0, -t - .014, -t + .004, p, q); wb(u1, u1 + .07, -t - .014, -t + .004, p, q); wb(u0 - .07, u1 + .07, -t - .014, -t + .004, q, q + .07)
                if k == "gdoor":                           # the closed sectional door: 4 sections x 4 raised panels
                    wb(u0, u1, -.11, -.06, p, q); sh = (q - p) / 4; pw = (u1 - u0) / 4
                    for i in range(4):
                        wb(u0, u1, -.06, -.052, p + i * sh + .012, p + (i + 1) * sh - .012)
                        for j in range(4): wb(u0 + j * pw + .09, u0 + (j + 1) * pw - .09, -.052, -.036, p + i * sh + .1, p + (i + 1) * sh - .1)
        return W
    def part(s, axis, c, lo, hi, h0, h1, ops=(), floors=None):   # a 0.12 partition occupying [c, c+PT] across `axis`
        fl = [h0] if floors is None else floors
        if axis == "x": s.wall((lo, c + PT), (hi, c + PT), (0, 1), h0, h1, PT, ops, ext=False, floors=fl)
        else: s.wall((c + PT, lo), (c + PT, hi), (1, 0), h0, h1, PT, ops, ext=False, floors=fl)

    # ---------- a gable roof over the outer-wall rectangle; axis = the ridge's ----------
    def roof(s, x0, x1, z0, z1, axis, he, tan, over=.4, rakes=(.3, .3), boards=(True, True), t=.16, cut=None, fascia=None, gutters=None, pipes=()):
        if axis == "x": a0, a1, W = x0, x1, z1 - z0; M = lambda a, sc, h: B(a, z0 + sc, h)
        else: a0, a1, W = z0, z1, x1 - x0; M = lambda a, sc, h: B(x0 + sc, a, h)
        hb, hr = he - over * tan, he + W / 2 * tan; A0, A1 = a0 - rakes[0], a1 + rakes[1]
        pr = lambda poly, c0, c1, mat, cut=None: s.add(lambda bm: g_prism(bm, [M(c0, a, b) for a, b in poly], [M(c1, a, b) for a, b in poly]), mat, cut)
        full = [(A0, A1)]
        for side, ms in (("lo", lambda sc: sc), ("hi", lambda sc: W - sc)):
            pr([(ms(-over), hb), (ms(W / 2), hr), (ms(W / 2), hr + t), (ms(-over), hb + t)], A0, A1, zmat("roof", "trim"), cut)
            d = .16; pr([(ms(W / 2 - d), hr + t - d * tan), (ms(W / 2), hr + t), (ms(W / 2), hr + t + .03), (ms(W / 2 - d), hr + t - d * tan + .03)], A0 - .01, A1 + .01, "roof")
            for i, (c, sg) in enumerate(((A0, -1), (A1, 1))):
                if boards[i]: pr([(ms(-over - .025), hb - .04), (ms(W / 2), hr - .04), (ms(W / 2), hr + t + .012), (ms(-over - .025), hb + t + .012)], c, c + sg * .025, "trim")
            for c0, c1 in (full if fascia is None else fascia.get(side, [])):
                pr([(ms(-over - .025), hb - .04), (ms(-over), hb - .04), (ms(-over), hb + t + .005), (ms(-over - .025), hb + t + .005)], c0, c1, "trim")
            sg_, hg = -over - .085, hb + t - .02
            for c0, c1 in (full if gutters is None else gutters.get(side, [])):
                pr([(ms(sg_ + .06 * math.cos(th)), hg + .06 * math.sin(th)) for th in [math.pi * (1 + i / 6) for i in range(7)]], c0, c1, "trim")
            for sd, a in pipes:
                if sd != side: continue
                s.tube(M(a, ms(sg_), hg - .03), M(a, ms(-.06), hg - .5), .035, "trim"); s.tube(M(a, ms(-.06), hg - .5), M(a, ms(-.06), .12), .035, "trim")
        return hr
    def stair(s, x0, x1, zs, dz, n=16, g=.26):
        r = (F1 - FY) / n; ze = zs + dz * g * (n - 1)
        for i in range(1, n): s.box(x0, x1, zs + dz * g * (i - 1), ze, FY + (i - 1) * r, FY + i * r, "stair")
        return ze, r
    def rail(s, p0, p1, hb0, hb1, Hh=.9, mat="stair", newel=(True, True), sink=0.0):
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]); n = max(1, math.ceil(L / .13))
        P = lambda f, h: B(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, hb0 + (hb1 - hb0) * f + h)
        s.tube(P(0, Hh), P(1, Hh), .032, mat, 6)
        for i in range(1, n):
            f = i / n; c = P(f, 0); s.add(lambda bm: g_box(bm, c + Vector((-.014, -.014, -sink)), c + Vector((.014, .014, Hh))), mat)
        for i, f in enumerate((0, 1)):
            if newel[i]: c = P(f, 0); s.add(lambda bm: g_box(bm, c + Vector((-.045, -.045, -sink)), c + Vector((.045, .045, Hh + .08))), mat)
    def chimney(s, x, z, h0, h1, w=.9, d=.6):
        s.box(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h0, h1, "foundation"); s.box(x - w / 2 - .05, x + w / 2 + .05, z - d / 2 - .05, z + d / 2 + .05, h1, h1 + .08, "foundation")
        for xx in (x - .2, x + .2): s.tube(B(xx, z, h1 + .08), B(xx, z, h1 + .38), .11, "foundation", 10)
    def stoop(s, W, uc, w=1.6, deep=.9):                  # two steps of 0.15 down from the threshold
        s.add(lambda bm: g_box(bm, W(uc - w / 2, 0, 0), W(uc + w / 2, deep, FY)), "foundation")
        s.add(lambda bm: g_box(bm, W(uc - w / 2, deep, 0), W(uc + w / 2, deep + .3, FY / 2)), "foundation")
    def base(s, x0, x1, z0, z1):                           # foundation block + the floor on it
        s.box(x0, x1, z0, z1, 0, FY - .01, "foundation"); s.box(x0 + .01, x1 - .01, z0 + .01, z1 - .01, FY - .03, FY, zmat("floor", "foundation", "foundation"))
def win(c, w=.9, fl=0, k="win"):
    h = (FY + 6 * EXP, FY + 15 * EXP) if fl == 0 else (FY + 26 * EXP, FY + 35 * EXP); return (k, c - w / 2, c + w / 2, h[0], h[1])
def door(c, fl=FY, w=.95, k="door"): return (k, c - w / 2, c + w / 2, fl, fl + 2.05)
def pd(c0, fl=FY, w=.9): return ("door", c0, c0 + w, fl, fl + 2.05)

# ---------- the houses (one-storey first: bungalow, ranch) ----------
EAVE1 = 2.90
def ceiling(s, x0, x1, z0, z1, h=EAVE1): s.box(x0, x1, z0, z1, h - .02, h + .04, zmat("trim", "ceiling", "trim"))

def bungalow():
    s = H("bungalow"); x0, x1, z0, z1, tan = -4.5, 4.5, -5.5, 3.5, .5; ridge = EAVE1 + (x1 - x0) / 2 * tan
    s.base(x0, x1, z0, z1)
    W = s.wall((x0, z1), (x1, z1), (0, 1), FY, EAVE1, gable=(EAVE1, ridge), ops=[door(.9), win(-2.6, 1.5, k="wins"), win(3.2)])
    s.stoop(lambda u, o, h: B(x0 + u, z1 + 2 + o, h), .9 - x0, w=1.4, deep=.01)
    s.wall((x0, z0), (x1, z0), (0, -1), FY, EAVE1, gable=(EAVE1, ridge), ops=[win(-2.6), door(1.4), win(3.4, .7)])
    s.wall((x0, z0), (x0, z1), (-1, 0), FY, EAVE1, ops=[win(1.8), win(-1.6), win(-4.3, .6)])
    s.wall((x1, z0), (x1, z1), (1, 0), FY, EAVE1, ops=[win(2.0), win(-2.6)])
    s.part("x", .4, x0 + T, x1 - T, FY, EAVE1, ops=[pd(-2.95), pd(1.05)])
    s.part("z", -.06, z0 + T, .4, FY, EAVE1)
    s.part("x", -3.0, x0 + T, -.06, FY, EAVE1, ops=[pd(-2.6, w=.8)])
    ceiling(s, x0, x1, z0, z1)
    s.box(x0, x1, z1, z1 + 1.9, 0, FY, zmat("floor", "foundation", "foundation"))          # the porch deck
    for px in (x0 + .15, x1 - .15, -1.6, 2.6):
        if px in (-1.6, 2.6): continue
        s.box(px - .08, px + .08, z1 + 1.65, z1 + 1.81, FY, EAVE1 - .2 + 1.95 * 0, "trim")
    s.box(x0 + .07, x1 - .07, z1 + 1.62, z1 + 1.84, EAVE1 - .25, EAVE1 - .05, "trim")       # porch beam
    for xa, xb in ((x0 + .25, .9 - .7), (.9 + .7, x1 - .25)):                                # porch rail
        s.box(xa, xb, z1 + 1.7, z1 + 1.76, FY + .85, FY + .9, "trim"); s.box(xa, xb, z1 + 1.7, z1 + 1.76, FY + .1, FY + .15, "trim")
        k = xa + .15
        while k < xb - .05: s.box(k - .02, k + .02, z1 + 1.71, z1 + 1.75, FY + .15, FY + .85, "trim"); k += .16
    s.box(.9 - .8, .9 + .8, z1 + 1.9, z1 + 2.25, 0, FY / 2, "foundation")
    s.roof(x0, x1, z0, z1, "z", EAVE1, tan, rakes=(.35, 2.25), pipes=(("lo", z0 + .3), ("hi", z0 + .3)))
    s.chimney(-2.4, -2.0, EAVE1, ridge + .5)
    s.room("living", "living", 0, FY, x0 + T, x1 - T, .52, z1 - T)
    s.room("bed", "bedroom", 0, FY, x0 + T, -.06, -2.88, .4)
    s.room("bath", "bath", 0, FY, x0 + T, -.06, z0 + T, -3.0)
    s.room("kitchen", "kitchen", 0, FY, .06, x1 - T, z0 + T, .4)
    s.door = dict(x=.9, z=z1 + 2.3); s.back = dict(x=1.4, z=z0 - .6)
    return s

def ranch():
    s = H("ranch"); X0, X1, Z0, ZM, ZW, XW, tan = -8., 8., -5., 2.5, 5., 3.3, .45
    ridge = EAVE1 + (ZM - Z0) / 2 * tan; wr = EAVE1 + (X1 - XW) / 2 * tan
    s.base(X0, X1, Z0, ZM); s.base(XW, X1, ZM - .02, ZW)
    s.wall((X0, ZM), (XW, ZM), (0, 1), FY, EAVE1, ops=[win(-6, 1.5, k="wins"), win(-3, 1.5, k="wins"), door(1.5)], cb=(True, False))
    s.stoop(lambda u, o, h: B(X0 + u, ZM + o, h), 1.5 - X0)
    s.wall((XW, ZW), (X1, ZW), (0, 1), FY, EAVE1, gable=(EAVE1, wr), ops=[win((XW + X1) / 2, 1.8, k="wins")])
    s.wall((XW, ZM), (XW, ZW), (-1, 0), FY, EAVE1, ops=[win(3.75, .7)], cb=(False, True))
    s.wall((X0, Z0), (X1, Z0), (0, -1), FY, EAVE1, ops=[win(-6), win(-2.75, .6), win(.9), win(4.5), door(6.2)])
    s.wall((X0, Z0), (X0, ZM), (-1, 0), FY, EAVE1, gable=(EAVE1, ridge), ops=[win(-3), win(.8)])
    s.wall((X1, Z0), (X1, ZM), (1, 0), FY, EAVE1, gable=(EAVE1, ridge), ops=[win(-2.5)], cb=(True, False))
    s.wall((X1, ZM), (X1, ZW), (1, 0), FY, EAVE1, ops=[win(3.75)], cb=(False, True))
    s.part("x", -1.2, X0 + T, XW, FY, EAVE1, ops=[pd(-6.35), pd(-3.15, w=.8), pd(.45)])
    s.part("z", XW, Z0 + T, ZM, FY, EAVE1, ops=[("door", .3, 1.5, FY, FY + 2.05)])
    s.part("z", -4.0, Z0 + T, -1.2, FY, EAVE1); s.part("z", -1.5, Z0 + T, -1.2, FY, EAVE1)
    ceiling(s, X0, X1, Z0, ZM); ceiling(s, XW, X1, ZM, ZW)
    s.roof(X0, X1, Z0, ZM, "x", EAVE1, tan, rakes=(.35, .35), pipes=(("lo", X0 + .3), ("lo", X1 - .3), ("hi", X0 + .3)),
           fascia={"lo": [(X0 - .35, X1 + .35)], "hi": [(X0 - .35, XW - .2)]}, gutters={"lo": [(X0 - .35, X1 + .35)], "hi": [(X0 - .35, XW - .2)]})
    s.roof(XW, X1, ZM - 2.2, ZW, "z", EAVE1, tan, rakes=(0, .35), boards=(False, True))
    s.chimney(-4.5, -3.0, EAVE1, ridge + .5)
    s.room("living", "living", 0, FY, X0 + T, XW, -1.08, ZM - T)
    s.room("bed1", "bedroom", 0, FY, X0 + T, -4.0, Z0 + T, -1.2)
    s.room("bath", "bath", 0, FY, -3.88, -1.5, Z0 + T, -1.2)
    s.room("bed2", "bedroom", 0, FY, -1.38, XW, Z0 + T, -1.2)
    s.room("kitchen", "kitchen", 0, FY, XW + PT, X1 - T, Z0 + T, ZW - T)
    s.door = dict(x=1.5, z=ZM + 1.4); s.back = dict(x=6.2, z=Z0 - .6)
    return s

BUILD = dict(bungalow=bungalow, ranch=ranch)

def export(s):
    os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
    me = bpy.data.meshes.new(s.id); bmesh.ops.remove_doubles(s.bm, verts=s.bm.verts, dist=1e-4); s.bm.to_mesh(me); s.bm.free()
    ob = bpy.data.objects.new(s.id, me); bpy.context.scene.collection.objects.link(ob)
    for n in SLOTS:
        m = bpy.data.materials.new(n); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
        p.inputs["Base Color"].default_value = (*COL[n], 1); p.inputs["Roughness"].default_value = .15 if n == "glass" else .8
        me.materials.append(m)
    for p in me.polygons: p.use_smooth = False
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.cube_project(cube_size=2.0); bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{s.id}.glb", use_selection=True, export_apply=True)
    vs = [v.co for v in me.vertices]
    info = dict(id=s.id, tris=sum(len(p.vertices) - 2 for p in me.polygons), min=[round(min(v.x for v in vs), 2), round(min(-v.y for v in vs), 2)], max=[round(max(v.x for v in vs), 2), round(max(-v.y for v in vs), 2)],
                floorY=FY, rooms=s.rooms, door=s.door, back=s.back, windows=s.windows)
    json.dump(info, open(f"{OUT}/{s.id}.json", "w"), indent=1); print("DONE", s.id, "tris", info["tris"], info["min"], info["max"])
    return ob

def proof(ob, id):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 640; sc.render.resolution_y = 480
    w = bpy.data.worlds.new("w"); w.color = (.5, .55, .6); sc.world = w
    bpy.ops.object.light_add(type="SUN", rotation=(.8, .2, .6)); bpy.context.object.data.energy = 3
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 24
    def aim(loc, tgt, name):
        cam.location = Vector(loc); cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{id}-{name}.png"; bpy.ops.render.render(write_still=True)
    aim((9, -16, 5), (0, 0, 2), "front"); aim((-10, 15, 7), (0, 0, 2), "back")
    ob.hide_render = False
    aim((0, -2, 16), (0, -1.9, 0), "top") if False else None

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ids = [a for a in args if a in BUILD] or list(BUILD)
    for id in ids:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        ob = export(BUILD[id]())
        if "noproof" not in args: proof(ob, id)
