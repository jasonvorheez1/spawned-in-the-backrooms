# Ferry's house (Level 169), the visible shell: walls, floors, basement, stair, porch, roof, trim, windows, shutters, gutters, chimney.
# Mirrors scripts/l169-house-geo.js plan() (the collider stays scripted). Engine local (x, y, z) -> Blender (x, -z, y).
import bpy, bmesh, math, random
from mathutils import Vector
random.seed(169)
bpy.ops.wm.read_factory_settings(use_empty=True)
C = (18, -500); F, WALLH, T, DH = 0.25, 2.8, 0.2, 2.1; TOP = F + WALLH; BF = F - 3
X0, X1, Z0, Z1, ZH0, ZH1, XM = -10, 10, -7, 7, -1.5, 0, 0
PX0, PX1, PZ1 = -6, 6, 9.5
R_RIDGE, R_EAVE, R_SIDE, R_PORCH = 1.3, 1.0, 0.8, 0.4
RIDGE = TOP + R_RIDGE + 0.09; SL = R_RIDGE / Z1
roofY = lambda z: RIDGE - SL * abs(z)
DOORS = {"front": (-0.6, 0.6), "living": (-3.5, -2.5), "kitchen": (2.5, 3.5), "bed1": (-7, -6), "bed2": (-2, -1), "bed3": (3, 4), "den": (5.15, 6.15)}
WINS = [("s", -4, 1.6), ("s", 4, 1.6), ("n", -7.5, 1.4), ("n", -2.5, 1.4), ("n", 2.5, 1.4), ("n", 7.5, 1.4), ("w", 3.5, 1.6), ("w", -4.2, 1.2), ("e", 3.5, 1.4)]
WY = (F + 0.95, F + 2.15)
MID_TO = 3.4; ST = dict(x0=6.2, rise=0.2, upN=9, upRun=0.3, turn=-0.3, lowN=4, lowRun=0.4); POSTS = [-5.8, -2, 2, 5.8]

MATS = {}
def mat(name, rgb, rough=0.85, metal=0.0, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    if alpha < 1: p.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    MATS[name] = m; return m
mat("stucco", (0.86, 0.74, 0.58)); mat("floor", (0.45, 0.3, 0.18), 0.7); mat("plaster", (0.9, 0.86, 0.76)); mat("concrete", (0.6, 0.58, 0.55))
mat("timber", (0.42, 0.32, 0.22)); mat("trim", (0.82, 0.72, 0.55), 0.6); mat("glass", (0.55, 0.65, 0.7), 0.05, 0, 0.35); mat("shutter", (0.35, 0.5, 0.42), 0.7)
mat("roof", (0.62, 0.6, 0.57), 0.5, 0.7); mat("rust", (0.45, 0.25, 0.12), 0.8, 0.3); mat("brick", (0.55, 0.32, 0.22))

PARTS = {}  # material name -> bmesh
def bm_for(m):
    if m not in PARTS: PARTS[m] = bmesh.new()
    return PARTS[m]
def B(x, y, z): return Vector((x, -z, y))  # engine -> blender

def box(m, x0, y0, z0, x1, y1, z1, bev=0.012, jitter=0.0):
    x0, x1 = min(x0, x1), max(x0, x1); y0, y1 = min(y0, y1), max(y0, y1); z0, z1 = min(z0, z1), max(z0, z1)
    if x1 - x0 < 1e-3 or y1 - y0 < 1e-3 or z1 - z0 < 1e-3: return
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        ex, ey, ez = v.co.x + 0.5, v.co.y + 0.5, v.co.z + 0.5
        j = (random.random() - 0.5) * jitter
        v.co = B(x0 + ex * (x1 - x0) + j, y0 + ez * (y1 - y0), z0 + ey * (z1 - z0) + j)
    b = min(bev, (x1 - x0) / 3, (y1 - y0) / 3, (z1 - z0) / 3)
    if b > 0.002: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=b, segments=2, affect="EDGES", profile=0.5)
    merge(bm, m)
def merge(src, m):
    me = bpy.data.meshes.new("t"); src.to_mesh(me); src.free(); bm_for(m).from_mesh(me); bpy.data.meshes.remove(me)
def quad(m, pts):
    bm = bmesh.new(); vs = [bm.verts.new(B(*p)) for p in pts]; bm.faces.new(vs); merge(bm, m)
def tube(m, a, b, r, n=10):
    a, b = B(*a), B(*b); d = b - a; L = d.length
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r, radius2=r, depth=L)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    for v in bm.verts: v.co = q @ v.co + (a + b) / 2
    merge(bm, m)
def lathe(m, cx, cz, prof, n=14):
    bm = bmesh.new(); rings = []
    for (r, y) in prof: rings.append([bm.verts.new(B(cx + math.cos(i / n * 6.2832) * r, y, cz + math.sin(i / n * 6.2832) * r)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); merge(bm, m)

# ---- walls (the same plan as the collider)
def wall(ax, cc, a, e, ops, y0=F, y1=TOP, m="stucco"):
    def seg(p, q, ya, yb):
        if q - p > 1e-3 and yb - ya > 1e-3:
            if ax == "x": box(m, p, ya, cc - T / 2, q, yb, cc + T / 2, 0.02)
            else: box(m, cc - T / 2, ya, p, cc + T / 2, yb, q, 0.02)
    cur = a
    for o in sorted(ops):
        seg(cur, o[0], y0, y1); seg(o[0], o[1], y0, o[2]); seg(o[0], o[1], o[3], y1); cur = o[1]
    seg(cur, e, y0, y1)
dr = lambda k: (DOORS[k][0], DOORS[k][1], F, F + DH)
def wn(side): return [(c - w / 2, c + w / 2, WY[0], WY[1]) for s, c, w in WINS if s == side]
S_, N_, W_, E_ = Z1 - T / 2, Z0 + T / 2, X0 + T / 2, X1 - T / 2
wall("x", S_, X0, X1, [dr("front")] + wn("s")); wall("x", N_, X0, X1, wn("n"))
wall("z", W_, Z0 + T, Z1 - T, wn("w")); wall("z", E_, Z0 + T, Z1 - T, wn("e"))
wall("x", ZH1, X0 + T, X1 - T, [dr("living"), dr("kitchen")], m="plaster")
wall("x", ZH0, X0 + T, X1 - T, [dr(k) for k in ("bed1", "bed2", "bed3", "den")], m="plaster")
for k in (-5, 0, 5): wall("z", k, Z0 + T, ZH0 - T / 2, [], m="plaster")
wall("z", XM, ZH1 + T / 2, MID_TO, [], m="plaster")
# a stucco plinth band and a raised trim line round the outside
for (ax, cc, a, e, sgn) in (("x", Z1, X0, X1, 1), ("x", Z0, X0, X1, -1), ("z", X0, Z0, Z1, -1), ("z", X1, Z0, Z1, 1)):
    if ax == "x": box("concrete", a - 0.04, -0.15, cc - 0.04 * (sgn < 0), e + 0.04, F + 0.3, cc + 0.04 * (sgn > 0), 0.02)
    else: box("concrete", cc - 0.04 * (sgn < 0), -0.15, a - 0.04, cc + 0.04 * (sgn > 0), F + 0.3, e + 0.04, 0.02)
    if ax == "x": box("trim", a - 0.03, TOP - 0.18, cc - 0.035 * (sgn < 0), e + 0.03, TOP - 0.06, cc + 0.035 * (sgn > 0), 0.015)
    else: box("trim", cc - 0.035 * (sgn < 0), TOP - 0.18, a - 0.03, cc + 0.035 * (sgn > 0), TOP - 0.06, e + 0.03, 0.015)
# floors and ceiling
for m, *c in [("floor", X0, -0.1, Z0, X1, F, ZH0), ("floor", X0, -0.1, ZH0, XM, F, Z1), ("floor", XM, -0.1, ZH0, ST["x0"], F, ZH1), ("floor", XM, F - 0.1, ZH1, X1, F, Z1), ("plaster", X0, TOP, Z0, X1, TOP + 0.06, Z1)]:
    box(m, *c, 0.005)
# basement + stair
box("concrete", XM, BF - 0.15, ZH0 - 0.1, X1 + 0.05, BF, Z1, 0.01)
box("concrete", XM, BF, ZH1 + 0.1, XM + 0.2, F - 0.1, Z1); box("concrete", XM, BF, Z1 - 0.2, X1 + 0.05, F - 0.1, Z1); box("concrete", X1 - 0.15, BF, ZH0 - 0.1, X1 + 0.05, F, Z1)
lx = ST["x0"] + ST["upN"] * ST["upRun"]; yL = F - (ST["upN"] + 1) * ST["rise"]; tz = ST["turn"]
box("concrete", XM + 0.2, BF, ZH1 - 0.1, lx, F - 0.1, ZH1 + 0.12); box("concrete", ST["x0"], BF, ZH0 - 0.1, X1 - 0.15, F, ZH0 + 0.1)
for i in range(1, ST["upN"] + 1):
    x = ST["x0"] + (i - 1) * ST["upRun"]; box("concrete", x, BF, ZH0 + 0.1, x + ST["upRun"], F - i * ST["rise"], ZH1 - 0.1, 0.02)
    box("timber", x - 0.01, F - i * ST["rise"] - 0.005, ZH0 + 0.12, x + ST["upRun"] + 0.02, F - i * ST["rise"] + 0.03, ZH1 - 0.12, 0.01)
box("concrete", lx, BF, ZH0 + 0.1, X1 - 0.15, yL, tz)
for j in range(1, ST["lowN"] + 1):
    z = tz + (j - 1) * ST["lowRun"]; box("concrete", lx, BF, z, X1 - 0.15, yL - j * ST["rise"], z + ST["lowRun"], 0.02)
# ---- door casings
for k, (a, e) in DOORS.items():
    cc = S_ if k == "front" else (ZH1 if k in ("living", "kitchen") else ZH0)
    box("trim", a - 0.09, F, cc - 0.13, a, F + DH + 0.09, cc + 0.13, 0.015); box("trim", e, F, cc - 0.13, e + 0.09, F + DH + 0.09, cc + 0.13, 0.015)
    box("trim", a - 0.11, F + DH, cc - 0.14, e + 0.11, F + DH + 0.12, cc + 0.14, 0.015)
    if k == "front": box("concrete", a - 0.3, 0.13, cc + 0.1, e + 0.3, F + 0.02, cc + 0.6, 0.02)
# ---- windows: frame, sill, mullions, glass, louvred shutters folded open
for side, c, w in WINS:
    a, e, y0, y1 = c - w / 2, c + w / 2, WY[0], WY[1]; mid, ym = c, (y0 + y1) / 2
    cc = {"s": S_, "n": N_, "w": W_, "e": E_}[side]; out = {"s": 1, "n": -1, "w": -1, "e": 1}[side]; ax = "x" if side in "sn" else "z"
    def Q(m, u0, ya, p0, u1, yb, p1, bev=0.012):
        if ax == "x": box(m, u0, ya, cc + min(p0, p1), u1, yb, cc + max(p0, p1), bev)
        else: box(m, cc + min(p0, p1), ya, u0, cc + max(p0, p1), yb, u1, bev)
    Q("trim", a - 0.06, y0 - 0.06, -0.12, e + 0.06, y0 + 0.02, out * 0.2 if out > 0 else 0.12, 0.015)  # sill, proud outside
    Q("trim", a - 0.06, y0 - 0.06, -0.12, e + 0.06, y0 + 0.02, 0.12 if out > 0 else -0.2, 0.015)
    Q("trim", a - 0.07, y1, -0.13, e + 0.07, y1 + 0.09, 0.13); Q("trim", a - 0.07, y0, -0.13, a, y1, 0.13); Q("trim", e, y0, -0.13, e + 0.07, y1, 0.13)
    Q("trim", mid - 0.022, y0, -0.03, mid + 0.022, y1, 0.03); Q("trim", a, ym - 0.022, -0.03, e, ym + 0.022, 0.03)
    Q("glass", a, y0, -0.006, e, y1, 0.006, 0)
    hw = w / 2
    for u0 in (a - hw - 0.04, e + 0.04):
        u1 = u0 + hw; pa, pb = out * (T / 2 + 0.01), out * (T / 2 + 0.055)
        Q("shutter", u0, y0 - 0.03, pa, u0 + 0.06, y1 + 0.03, pb); Q("shutter", u1 - 0.06, y0 - 0.03, pa, u1, y1 + 0.03, pb)
        Q("shutter", u0, y0 - 0.03, pa, u1, y0 + 0.05, pb); Q("shutter", u0, y1 - 0.05, pa, u1, y1 + 0.03, pb); Q("shutter", u0, ym - 0.03, pa, u1, ym + 0.03, pb)
        n = 11
        for k2 in range(n):
            y = y0 + 0.07 + k2 * (y1 - y0 - 0.16) / n
            Q("shutter", u0 + 0.055, y, out * (T / 2 + 0.015), u1 - 0.055, y + 0.075, out * (T / 2 + 0.048), 0.008)
        for hy in (y0 + 0.15, y1 - 0.15):  # strap hinges
            hu = u0 if u0 > e else u1
            Q("rust", hu - 0.12 if u0 > e else hu - 0.02, hy - 0.015, out * (T / 2 + 0.05), hu + 0.02 if u0 > e else hu + 0.12, hy + 0.015, out * (T / 2 + 0.065), 0.004)
# ---- porch: deck boards, steps, turned posts, beam, knee braces, railing
for i in range(int((PX1 - PX0) / 0.14)):
    x = PX0 + i * 0.14; box("timber", x + 0.006, 0.0, Z1 + 0.04, x + 0.134, 0.15 + random.uniform(-0.004, 0.004), PZ1, 0.008)
box("timber", PX0, -0.2, Z1 + 0.04, PX1, 0.02, PZ1, 0.01)
for s in range(2): box("timber", -1.2, -0.25, PZ1 + s * 0.3, 1.2, 0.1 - s * 0.12, PZ1 + 0.3 + s * 0.3, 0.015)
by = roofY(PZ1 - 0.22) - 0.03
for px in POSTS:
    lathe("trim", px, PZ1 - 0.22, [(0.1, 0.15), (0.1, 0.4), (0.075, 0.45), (0.07, 0.9), (0.085, 1.0), (0.06, 1.1), (0.06, by - 0.45), (0.08, by - 0.38), (0.08, by - 0.16)], 16)
    box("trim", px - 0.12, 0.15, PZ1 - 0.34, px + 0.12, 0.2, PZ1 - 0.1, 0.01)
    for sg in (-1, 1): tube("timber", (px + sg * 0.55, by - 0.2, PZ1 - 0.22), (px, by - 0.8, PZ1 - 0.22), 0.04, 8)
box("timber", PX0, by - 0.18, PZ1 - 0.32, PX1, by, PZ1 - 0.12, 0.02)
for x0, x1 in ((PX0 + 0.2, -1.25), (1.25, PX1 - 0.2)):
    box("trim", x0, 0.95, PZ1 - 0.26, x1, 1.0, PZ1 - 0.18, 0.01); box("trim", x0, 0.22, PZ1 - 0.25, x1, 0.27, PZ1 - 0.19, 0.01)
    x = x0 + 0.1
    while x < x1 - 0.05: box("trim", x - 0.02, 0.27, PZ1 - 0.24, x + 0.02, 0.95, PZ1 - 0.2, 0.006); x += 0.13
# ---- roof: corrugated sheets with real ridges, lapped seams, ridge cap, fascia, rafter tails, gutters, downspouts
xa, xb = X0 - R_SIDE, X1 + R_SIDE; zN, zP = -(Z1 + R_EAVE), PZ1 + R_PORCH
def sheet(x0, x1, zA, zB):
    bm = bmesh.new(); step = 0.076; nx = max(2, int((x1 - x0) / step)); nz = 10; grid = []
    for j in range(nz + 1):
        z = zA + (zB - zA) * j / nz; row = []
        for i in range(nx + 1):
            x = x0 + (x1 - x0) * i / nx; amp = 0.018 * math.sin(i / nx * (x1 - x0) / 0.076 * math.pi)
            row.append(bm.verts.new(B(x, roofY(z) + 0.02 + amp, z)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.006); merge(bm, "roof")
x = xa; k = 0
while x < xb - 1e-6:
    x1 = min(xb, x + 1.0)
    sheet(x - 0.03, x1, 0, zN); zs = zP if (x >= PX0 - 0.46 and x1 <= PX1 + 0.46) else -zN
    if x < PX0 - 0.45 < x1: sheet(x - 0.03, PX0 - 0.45, 0, -zN); sheet(PX0 - 0.45, x1, 0, zP)
    elif x < PX1 + 0.45 < x1: sheet(x - 0.03, PX1 + 0.45, 0, zP); sheet(PX1 + 0.45, x1, 0, -zN)
    else: sheet(x - 0.03, x1, 0, zs)
    x = x1; k += 1
box("roof", xa - 0.03, RIDGE + 0.02, -0.18, xb + 0.03, RIDGE + 0.1, 0.18, 0.03)
for z, xr in ((zN, (xa, xb)), (zP, (PX0 - 0.45, PX1 + 0.45)), (-zN, (xa, PX0 - 0.45)), (-zN, (PX1 + 0.45, xb))):
    box("trim", xr[0], roofY(z) - 0.17, z - 0.035, xr[1], roofY(z) + 0.0, z + 0.035, 0.012)
    sgn = 1 if z > 0 else -1; gz = z + sgn * 0.09; gy = roofY(z) - 0.08
    a, b = B(xr[0], gy, gz), B(xr[1], gy, gz)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=12, radius1=0.07, radius2=0.07, depth=(b - a).length)
    q = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    for v in bm.verts: v.co = q @ v.co + (a + b) / 2
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > (a.z + 0.005)], context="VERTS"); merge(bm, "rust")
for gx, gz in ((xa + 0.15, zN - 0.09), (xb - 0.15, zN - 0.09), (xa + 0.15, -zN + 0.09), (xb - 0.15, -zN + 0.09)):
    tube("rust", (gx, roofY(abs(gz)) - 0.1, gz), (gx, 0.1, gz), 0.045, 10)
for x in [xa + 0.4 + i * 0.6 for i in range(int((xb - xa) / 0.6))]:  # rafter tails under the north eave
    box("timber", x - 0.04, roofY(zN) - 0.24, zN + 0.05, x + 0.04, roofY(zN) - 0.15, Z0 - 0.02, 0.01)
for sx in (X0, X1):  # gable ends, stucco, with a vent
    bm = bmesh.new(); vs = [bm.verts.new(B(sx, TOP, Z0)), bm.verts.new(B(sx, TOP, Z1)), bm.verts.new(B(sx, RIDGE - 0.02, 0))]; bm.faces.new(vs); merge(bm, "stucco")
    o = 0.06 if sx > 0 else -0.06
    box("timber", sx, TOP + 0.45, -0.35, sx + o, TOP + 1.05, 0.35, 0.02)
    for k2 in range(6): box("trim", sx + o * 0.5, TOP + 0.5 + k2 * 0.09, -0.3, sx + o * 1.3, TOP + 0.54 + k2 * 0.09, 0.3, 0.006)
# chimney (stove flue) through the north slope over the kitchen, brick with a cap
cx, cz = 6.5, -3.2
box("brick", cx - 0.35, roofY(cz) - 0.5, cz - 0.35, cx + 0.35, RIDGE + 0.9, cz + 0.35, 0.025)
box("concrete", cx - 0.42, RIDGE + 0.9, cz - 0.42, cx + 0.42, RIDGE + 1.0, cz + 0.42, 0.02)
tube("rust", (cx, RIDGE + 1.0, cz), (cx, RIDGE + 1.35, cz), 0.09, 12)
# a rooftop swamp cooler on the south slope
ax_, az_ = -4.5, 2.6
box("roof", ax_ - 0.55, roofY(az_) - 0.1, az_ - 0.45, ax_ + 0.55, roofY(az_) + 0.75, az_ + 0.45, 0.04)
for k2 in range(7): box("rust", ax_ - 0.45, roofY(az_) + 0.05 + k2 * 0.09, az_ + 0.45, ax_ + 0.45, roofY(az_) + 0.09 + k2 * 0.09, az_ + 0.47, 0.004)

# ---- assemble, UV by world box projection in metres, export
for name, bm in PARTS.items():
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal; axn = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = l.vert.co; l[uv].uv = (co.y, co.z) if axn == 0 else ((co.x, co.z) if axn == 1 else (co.x, co.y))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); me.materials.append(MATS[name])
    for p in me.polygons: p.use_smooth = False
import os; os.makedirs("/tmp/ferry-house", exist_ok=True)
scene = bpy.context.scene; scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = scene.render.resolution_y = 656
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs[1].default_value = 1.2
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 4; sun.rotation_euler = (0.9, 0.2, 0.6); scene.collection.objects.link(sun)
for nm, pos in (("a", (17, -20, 7)), ("b", (-18, 14, 8)), ("c", (4, -12, 2.2))):
    cam = bpy.data.objects.new(nm, bpy.data.cameras.new(nm)); cam.location = pos; scene.collection.objects.link(cam)
    tgt = Vector((0, -4 if nm != "c" else -9, 2)); cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 30
    scene.camera = cam; scene.render.filepath = f"/tmp/ferry-house/p_{nm}.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in scene.objects if o.type == "MESH"))
for o in list(scene.objects):
    if o.type != "MESH": bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath="/workspace/ferry/house.glb", export_apply=True)
