# Phoebe's outfit layer: hair, long mustard coat, collar+bow+chain, boots. One skinned mesh on the critter armature.
# blender -b --factory-startup --python-exit-code 1 --python art/phoebe-outfit/build.py
import bpy, math, os, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
W = "/workspace/phoebe"; OUT = W + "/phoebe-outfit.glb"; PROOF = "/tmp/phoebe"
os.makedirs(PROOF, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=W + "/body_f.glb")
bpy.ops.import_scene.gltf(filepath=W + "/head_f.glb")
sc = bpy.context.scene
ARM = bpy.data.objects["Armature"]; ARM2 = bpy.data.objects["Armature.001"]
for a in (ARM, ARM2):
    if a.animation_data: a.animation_data.action = None
    for pb in a.pose.bones: pb.matrix_basis.identity()
HEAD = bpy.data.objects["Head_cat"]
HEAD.parent = ARM; HEAD.modifiers[0].object = ARM   # proof: head rides the body rig
for o in list(sc.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
def bvh(n): return BVHTree.FromObject(bpy.data.objects[n], dg)
HB = bvh("Head_cat"); CLOTH = [bvh(n) for n in ("Body", "Top_jacket", "Bot_longskirt")]

def ss(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t

# ---------- head surface ----------
C = Vector((0, 0, 1.3))
def hdir(az, el):
    a, e = math.radians(az), math.radians(el)
    return Vector((math.cos(e) * math.sin(a), math.cos(e) * math.cos(a), math.sin(e)))
def R1(az, el):
    d = hdir(az, el)
    ri = HB.ray_cast(C, d, 1.0); rin = (ri[0] - C).length if ri[0] else 0.27
    ro = HB.ray_cast(C + d * 1.0, -d, 1.0); rout = (ro[0] - C).length if ro[0] else rin
    return rout if rout - rin < 0.04 else rin      # ears are skipped, eyes/face kept
_rc = {}
def R(az, el):
    k = (round(az, 1), round(el, 1))
    if k not in _rc:
        _rc[k] = sum(R1(az + da, el + de) for da, de in ((0, 0), (4, 0), (-4, 0), (0, 4), (0, -4))) / 5
    return _rc[k]
def H(az, el, off): return C + hdir(az, el) * (R(az, el) + off)

# ---------- mesh builder ----------
class MB:
    def __init__(s): s.v = []; s.f = []
    def add(s, p): s.v.append(Vector(p)); return len(s.v) - 1
def crom(pts, n):
    P = [pts[0]] + list(pts) + [pts[-1]]; out = []
    segs = len(pts) - 1
    for i in range(n):
        t = i / (n - 1) * segs; k = min(int(t), segs - 1); u = t - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u))
    return out
def sweep(mb, pts, wa, wb, nfn, ring=10, closed=False, cap=True):
    """tube along pts; wa/wb radii lists (width along binormal, thickness along normal); nfn(p)->up hint"""
    n = len(pts); rows = []
    for i, p in enumerate(pts):
        if closed: t = (pts[(i + 1) % n] - pts[i - 1])
        else: t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t.normalize(); N = nfn(p); N = (N - t * N.dot(t)).normalized(); B = t.cross(N)
        rows.append([mb.add(p + B * wa[i] * math.cos(2 * math.pi * k / ring) + N * wb[i] * math.sin(2 * math.pi * k / ring)) for k in range(ring)])
    for i in range(n if closed else n - 1):
        a, b = rows[i], rows[(i + 1) % n]
        for k in range(ring): mb.f.append((a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]))
    if cap and not closed:
        for rw, p, flip in ((rows[0], pts[0], True), (rows[-1], pts[-1], False)):
            c = mb.add(p)
            for k in range(ring):
                f = (rw[k], rw[(k + 1) % ring], c); mb.f.append(f[::-1] if flip else f)
def grid(mb, P, closeU=False):
    rows = [[mb.add(p) for p in r] for r in P]
    for j in range(len(rows) - 1):
        U = len(rows[j])
        for i in range(U if closeU else U - 1):
            i2 = (i + 1) % U; mb.f.append((rows[j][i], rows[j][i2], rows[j + 1][i2], rows[j + 1][i]))
    return rows

MATS = {"hair": ("#e08a62", 0.0, 0.55), "coat": ("#d29a2c", 0.0, 0.8), "cuff": ("#f2efe8", 0.0, 0.7), "bow": ("#b8202a", 0.0, 0.5),
        "chain": ("#d8dadf", 1.0, 0.25), "boot": ("#141216", 0.0, 0.38), "band": ("#a8562a", 0.0, 0.55)}
def hexc(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5)) + (1,)
def mat(name):
    if name in bpy.data.materials and bpy.data.materials[name].get("ph"): return bpy.data.materials[name]
    col, met, rough = MATS[name]; m = bpy.data.materials.new(name); m["ph"] = 1; m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hexc(col)
    b.inputs["Metallic"].default_value = met; b.inputs["Roughness"].default_value = rough
    return m
PARTS = []
def make(name, mb, matname, wfn, solid=0.0, subd=0):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in mb.v], [], mb.f); me.validate()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.data.materials.append(mat(matname))
    for p in me.polygons: p.use_smooth = True
    if solid:
        s = o.modifiers.new("solid", "SOLIDIFY"); s.thickness = solid; s.offset = 1.0; s.use_even_offset = True
    if subd:
        s = o.modifiers.new("subd", "SUBSURF"); s.levels = subd; s.render_levels = subd
    bake_mods(o)
    weights(o, wfn); PARTS.append(o); return o
def bake_mods(o):
    if not o.modifiers: return
    d = bpy.context.evaluated_depsgraph_get(); m = bpy.data.meshes.new_from_object(o.evaluated_get(d))
    old = o.data; o.modifiers.clear(); o.data = m; bpy.data.meshes.remove(old)
    for p in o.data.polygons: p.use_smooth = True
def weights(o, wfn):
    groups = {}
    for v in o.data.vertices:
        for bone, w in wfn(o.matrix_world @ v.co).items():
            if w <= 1e-4: continue
            if bone not in groups: groups[bone] = o.vertex_groups.new(name=bone)
            groups[bone].add([v.index], w, "REPLACE")

# ---------- weights ----------
def w_head(p): return {"Head": 1.0}
def spine_w(z):
    w = {}
    keys = [(0.66, "Hips"), (0.77, "Spine"), (0.87, "Spine01"), (0.95, "Spine02")]
    if z <= keys[0][0]: return {"Hips": 1.0}
    if z >= keys[-1][0]: return {"Spine02": 1.0}
    for (z0, a), (z1, b) in zip(keys, keys[1:]):
        if z0 <= z <= z1: t = ss(z0, z1, z); return {a: 1 - t, b: t}
def w_coat(p):
    if abs(p.x) > 0.13 and p.z > 0.8:                     # sleeve: along the arm
        x = abs(p.x); s = "Left" if p.x < 0 else "Right"
        if x < 0.17: t = ss(0.13, 0.17, x); return {"Spine02": 1 - t, s + "Shoulder": t * 0.5, s + "Arm": t * 0.5}
        if x < 0.30: t = ss(0.17, 0.24, x); return {s + "Shoulder": 0.5 * (1 - t), s + "Arm": 0.5 + 0.5 * t}
        t = ss(0.30, 0.40, x); return {s + "Arm": 1 - t, s + "ForeArm": t}
    w = spine_w(p.z)
    if abs(p.x) > 0.09 and p.z > 0.9:                      # shoulder slope leans on the shoulder bones
        s = "Left" if p.x < 0 else "Right"; t = 0.5 * ss(0.09, 0.16, abs(p.x)) * ss(0.9, 0.96, p.z)
        w = {k: v * (1 - t) for k, v in w.items()}; w[s + "Shoulder"] = w.get(s + "Shoulder", 0) + t
    leg = 0.55 * ss(0.62, 0.3, p.z)
    if leg > 0:
        sR = ss(-0.10, 0.10, p.x); w = {k: v * (1 - leg) for k, v in w.items()}
        w["RightUpLeg"] = leg * sR; w["LeftUpLeg"] = leg * (1 - sR)
    return w
def w_chest(p): return spine_w(min(p.z, 0.99)) if p.z < 0.95 else {"Spine02": 0.8, "neck": 0.2}
def w_boot(p):
    s = "Left" if p.x < 0 else "Right"
    if p.z > 0.12: return {s + "Leg": 1.0}
    t = ss(0.12, 0.07, p.z) * ss(-0.02, 0.04, p.y)       # foot front follows the foot
    toe = ss(0.08, 0.14, p.y) * t
    return {s + "Leg": 1 - t, s + "Foot": t - toe, s + "ToeBase": toe}

# ================= HAIR =================
hair = MB()
def hairline(az):
    a = abs(((az + 180) % 360) - 180)
    return lerp(lerp(44, 18, ss(0, 70, a)), lerp(-12, -38, ss(110, 180, a)), ss(70, 110, a))
U, V = 48, 14
cap = []
for j in range(V + 1):
    row = []
    for i in range(U):
        az = 360 * i / U; el = lerp(hairline(az), 89.0, j / V)
        row.append(H(az, el, 0.004))
    cap.append(row)
rows = grid(hair, cap, closeU=True)
cap_obj_mb = hair
hairO = make("HairCap", hair, "hair", w_head, solid=0.012)
def clump(pts3, w0, thick=0.42, n=14, ring=8, root=0.65):
    mb = MB(); P = crom([Vector(p) for p in pts3], n)
    wa = []; 
    for i in range(n):
        t = i / (n - 1); w = w0 * (root + (1 - root) * ss(0, 0.3, t)) * (1 - ss(0.45, 1.0, t)) ** 0.9 + 0.0015
        wa.append(w)
    sweep(mb, P, wa, [w * thick for w in wa], lambda p: (p - C).normalized(), ring=ring)
    return mb
def hc(path, w0, **k):  # path of (az, el, off) or raw Vector
    return clump([H(*q) if len(q) == 3 else Vector(q[1:]) for q in path], w0, **k)
H_CLUMPS = []
# back: from the crown down to the nape, tips flicking out
for i, az in enumerate(range(115, 250, 15)):
    sway = 6 * math.sin(i * 1.7)
    H_CLUMPS.append(hc([(180 + (az - 180) * 0.3, 74, 0.01), (az, 45, 0.03), (az + sway, 5, 0.035), (az + sway * 1.5, -28, 0.03), (az + sway * 2, -44, 0.055)], 0.075 + 0.012 * math.sin(i * 2.3)))
# sides, both sides, down to the cheek line
for side in (1, -1):
    for i, az in enumerate((62, 78, 95)):
        H_CLUMPS.append(hc([(180 - side * 30, 72, 0.01), (side * (az + 15), 50, 0.03), (side * az, 15, 0.03), (side * (az - 4), -10, 0.032), (side * (az - 6), -22, 0.045)], 0.08))
# crown between and behind the ears: sweeping forward to the left part
for az, w in ((-60, 0.07), (-10, 0.07), (10, 0.07), (60, 0.07), (150, 0.08), (210, 0.08)):
    H_CLUMPS.append(hc([(180, 80, 0.01), (az * 0.5 + (0 if abs(az) < 90 else 90), 70, 0.03), (az, 52, 0.032), (az, 40, 0.035)], w, root=0.8))
# fringe over the left brow (part on the character's left), short so the left eye stays clear
H_CLUMPS.append(hc([(-50, 62, 0.012), (-38, 40, 0.03), (-28, 24, 0.035), (-20, 17, 0.04)], 0.075))
H_CLUMPS.append(hc([(-62, 55, 0.012), (-55, 35, 0.03), (-52, 18, 0.035), (-50, 8, 0.04)], 0.06))
# the big side-swept bang: from the part across the forehead, falling over the RIGHT eye (+X)
for (a0, e0, a1, a2, w) in ((-45, 64, 12, 22, 0.10), (-30, 68, 20, 30, 0.09), (-15, 70, 6, 12, 0.08), (-55, 60, 28, 38, 0.075)):
    H_CLUMPS.append(hc([(a0, e0, 0.015), (lerp(a0, a1, 0.45), 52, 0.04), (a1, 32, 0.05), (lerp(a1, a2, 0.6), 8, 0.05), (a2, -14, 0.05), (a2 + 3, -32, 0.045)], w, thick=0.4, n=18, ring=10, root=0.8))
# long side locks: in front of the cheeks, down to the shoulders, in front of the shoulder line
for side in (1, -1):
    for dz, w, dy in ((0, 0.085, 0.0), (0.03, 0.06, -0.035)):
        top = H(side * 72, 30, 0.02); mid = H(side * 78, -2, 0.035)
        H_CLUMPS.append(clump([top, mid, Vector((side * 0.285, 0.13 + dy, 1.15 + dz)), Vector((side * 0.27, 0.15 + dy, 1.06 + dz)), Vector((side * 0.235, 0.17 + dy, 0.975 + dz))], w, thick=0.4, n=16, ring=10, root=0.85))
for k, mb in enumerate(H_CLUMPS): make("Hair%02d" % k, mb, "hair", w_head)
# the bun: a twisted lobed knot on the crown
bun = MB(); bc = H(180, 70, 0.045); up = (bc - C).normalized()
ax = up.cross(Vector((1, 0, 0))).normalized(); ay = up.cross(ax)
BR = []
for j in range(13):
    v = j / 12; h = math.cos(math.pi * v); rr = math.sin(math.pi * v)
    row = []
    for i in range(28):
        th = 2 * math.pi * i / 28
        lobe = 1 + 0.10 * math.cos(5 * th + 4.0 * v) * rr
        r = 0.072 * rr * lobe
        row.append(bc + up * (0.062 * h) + ax * (r * math.cos(th)) + ay * (r * math.sin(th)))
    BR.append(row)
grid(bun, BR, closeU=True)
make("Bun", bun, "hair", w_head)
loop = MB(); pts = [bc - up * 0.035 + ax * (0.07 * math.cos(2 * math.pi * k / 24)) + ay * (0.07 * math.sin(2 * math.pi * k / 24)) for k in range(24)]
sweep(loop, pts, [0.022] * 24, [0.016] * 24, lambda p: up, ring=8, closed=True)
make("BunWrap", loop, "hair", w_head)

# ================= COAT =================
def prof(z, a):
    d = Vector((math.sin(math.radians(a)), math.cos(math.radians(a)), 0)); best = 0.0
    for dz in (-0.025, 0.0, 0.025):
        o = Vector((0, 0, z + dz))
        for T in CLOTH:
            r = T.ray_cast(o + d * 0.7, -d, 0.7)
            if r[0]: best = max(best, (r[0] - o).length)
    return best
ZS = [0.17 + (1.03 - 0.17) * j / 30 for j in range(31)]           # hem to neck
NU = 49
def openA(z): return lerp(lerp(27, 21, ss(0.17, 0.62, z)), 34, ss(0.86, 1.02, z))
RAW = []
for z in ZS:
    row = []
    oa = openA(z)
    for i in range(NU):
        a = oa + (360 - 2 * oa) * i / (NU - 1); s = abs(math.sin(math.radians(a)))
        r = prof(z, a)
        if z > 0.86 and s > 0.6: r = min(r, lerp(0.19, 0.15, ss(0.86, 1.0, z)))
        row.append(r)
    RAW.append(row)
for _ in range(2):   # smooth around and up
    RAW = [[(r[max(i - 1, 0)] + 2 * r[i] + r[min(i + 1, NU - 1)]) / 4 for i in range(NU)] for r in RAW]
    RAW = [[(RAW[max(j - 1, 0)][i] + 2 * RAW[j][i] + RAW[min(j + 1, len(RAW) - 1)][i]) / 4 for i in range(NU)] for j in range(len(RAW))]
jw = ZS.index(min(ZS, key=lambda z: abs(z - 0.66)))
for j in range(jw - 1, -1, -1):                     # A-line from the hips down
    RAW[j] = [max(RAW[j][i], RAW[j + 1][i] + 0.004) for i in range(NU)]
CP = []
for j, z in enumerate(ZS):
    row = []; oa = openA(z)
    for i in range(NU):
        a = oa + (360 - 2 * oa) * i / (NU - 1)
        r = RAW[j][i] + lerp(0.035, 0.022, ss(0.55, 0.75, z)) + 0.07 * ss(0.5, 0.17, z) ** 1.4
        r += 0.012 * math.sin(math.radians(a) * 7) * ss(0.55, 0.2, z)          # folds in the skirt
        if z > 0.98: r = lerp(r, 0.12, ss(0.98, 1.03, z))
        edge = min(i, NU - 1 - i)
        if edge == 0: r += 0.006
        A = math.radians(a)
        row.append(Vector((r * math.sin(A), r * math.cos(A), z - 0.012 * ss(0.4, 0.17, z) * (1 + math.cos(A)))))
    CP.append(row)
coat = MB(); crow = grid(coat, CP)
mid = NU // 2; cut = {mid - 2, mid - 1, mid, mid + 1}        # back vent for the tail
idx_rows = {v: (j, i) for j, r in enumerate(crow) for i, v in enumerate(r)}
coat.f = [f for f in coat.f if not (all(idx_rows[v][1] in cut | {mid + 2} for v in f) and min(idx_rows[v][1] for v in f) in cut and max(ZS[idx_rows[v][0]] for v in f) < 0.74)]
make("Coat", coat, "coat", w_coat, solid=0.009)
# sleeves: wide, hanging, wrist-length
for side in (1, -1):
    sl = MB(); SP = []; X0, X1, NS, RS = 0.10, 0.50, 16, 28
    for j in range(NS + 1):
        t = j / NS; x = lerp(X0, X1, t)
        rt = lerp(0.075, 0.085, t); drop = lerp(0.08, 0.155, ss(0.0, 1.0, t)); wy = lerp(0.075, 0.098, t)
        row = []
        for k in range(RS):
            th = 2 * math.pi * k / RS; c, s = math.cos(th), math.sin(th)
            zz = rt * s if s >= 0 else -drop * (-s) ** 0.75
            yy = wy * c * (1 + 0.15 * max(0.0, -s))
            row.append(Vector((side * x, yy, 0.955 + zz)))
        SP.append(row)
    if side < 0: SP = [r[::-1] for r in SP]
    grid(sl, SP, closeU=True); make("Sleeve%d" % side, sl, "coat", w_coat, solid=0.008)
    cf = MB(); CPc = []
    for j in range(5):
        t = j / 4; x = lerp(0.435, 0.512, t); bulge = 0.008 * math.sin(math.pi * t) + 0.004
        row = []
        for k in range(RS):
            th = 2 * math.pi * k / RS; c, s = math.cos(th), math.sin(th)
            zz = (0.085 + bulge) * s if s >= 0 else -(0.155 + bulge) * (-s) ** 0.75
            yy = (0.098 + bulge) * c * (1 + 0.15 * max(0.0, -s))
            row.append(Vector((side * x, yy, 0.955 + zz)))
        CPc.append(row)
    if side < 0: CPc = [r[::-1] for r in CPc]
    grid(cf, CPc, closeU=True); make("Cuff%d" % side, cf, "cuff", w_coat, solid=0.008)

# ================= COLLAR, BOW, CHAIN =================
def front(z): return prof(z, 0)
col = MB(); CR = []
for j in range(4):
    t = j / 3; z = lerp(1.035, 0.985, t)
    row = []
    for i in range(33):
        a = math.radians(-160 + 320 * i / 32); r = lerp(0.085, 0.118, t)
        tip = math.exp(-((abs(math.degrees(a)) - 22) / 18) ** 2) * t   # two pointed flaps either side of the bow
        row.append(Vector(((r + 0.03 * tip) * math.sin(a), (r + 0.03 * tip) * math.cos(a), z - 0.035 * tip)))
    CR.append(row)
grid(col, CR); make("Collar", col, "cuff", w_chest, solid=0.006)
bowc = Vector((0, front(0.97) + 0.03, 0.975))
bow = MB()
for side in (1, -1):   # loops
    pts = [bowc + Vector((side * (0.005 + 0.035 * (1 - math.cos(th)) * 0.9), 0.006 * math.sin(th), 0.018 * math.sin(th) * (1 + 0.4 * math.cos(th)))) for th in [2 * math.pi * k / 20 for k in range(20)]]
    sweep(bow, pts, [0.009] * 20, [0.004] * 20, lambda p: Vector((0, 1, 0)), ring=8, closed=True)
    tail = [bowc + Vector((side * 0.006, 0.004, -0.005)), bowc + Vector((side * 0.016, 0.006, -0.03)), bowc + Vector((side * 0.024, 0.004, -0.055))]
    sweep(bow, crom(tail, 8), [0.008, 0.009, 0.01, 0.011, 0.012, 0.012, 0.011, 0.003], [0.003] * 8, lambda p: Vector((0, 1, 0)), ring=8)
sweep(bow, crom([bowc + Vector((0, 0.006, 0.01)), bowc + Vector((0, 0.009, 0)), bowc + Vector((0, 0.006, -0.01))], 5), [0.009] * 5, [0.007] * 5, lambda p: Vector((0, 1, 0)), ring=8)
make("Bow", bow, "bow", w_chest)
ch = MB(); zs = [0.955 - 0.022 * k for k in range(11)]
for k, z in enumerate(zs):   # links, alternating planes
    c = Vector((0, front(z) + 0.012 + 0.004 * math.sin(k), z))
    u = Vector((1, 0, 0)) if k % 2 else Vector((0, 1, 0))
    pts = [c + u * (0.006 * math.cos(2 * math.pi * q / 10)) + Vector((0, 0, 0.012 * math.sin(2 * math.pi * q / 10))) for q in range(10)]
    sweep(ch, pts, [0.0022] * 10, [0.0022] * 10, lambda p, u=u: u.cross(Vector((0, 0, 1))) if u.y == 0 else Vector((1, 0, 0)), ring=6, closed=True)
pend = Vector((0, front(zs[-1] - 0.02) + 0.016, zs[-1] - 0.024))
sweep(ch, crom([pend + Vector((0, 0, 0.012)), pend, pend - Vector((0, 0, 0.014))], 6), [0.004, 0.009, 0.011, 0.01, 0.006, 0.001], [0.004, 0.006, 0.007, 0.006, 0.004, 0.001], lambda p: Vector((0, 1, 0)), ring=8)
make("Chain", ch, "chain", w_chest)

# ================= BOOTS =================
def boot(side):
    cx = side * 0.09; parts = []
    def add(o): parts.append(o)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1, depth=0.25, location=(cx, -0.005, 0.185)); o = bpy.context.object; o.scale = (0.079, 0.081, 1); add(o)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(cx, 0.045, 0.06)); o = bpy.context.object; o.scale = (0.08, 0.145, 0.078); add(o)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, 0.045, 0.006)); o = bpy.context.object; o.scale = (0.17, 0.30, 0.04); add(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.15, location=(cx, -0.005, 0.305)); o = bpy.context.object; o.scale = (0.083, 0.085, 0.09); add(o)
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.transform_apply(scale=True); bpy.ops.object.join()
    o = bpy.context.object; o.name = "Boot%d" % side
    r = o.modifiers.new("r", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.006
    s = o.modifiers.new("s", "SMOOTH"); s.factor = 0.6; s.iterations = 6
    d = o.modifiers.new("d", "DECIMATE"); d.ratio = 0.22
    bake_mods(o)
    for v in o.data.vertices:            # flat chunky sole
        if v.co.z < -0.008: v.co.z = -0.012
    o.data.materials.clear(); o.data.materials.append(mat("boot")); weights(o, w_boot); PARTS.append(o)
    bd = MB()
    for zb in (0.16, 0.245):
        pts = [Vector((cx + 0.088 * math.cos(2 * math.pi * k / 32), -0.005 + 0.09 * math.sin(2 * math.pi * k / 32), zb)) for k in range(32)]
        sweep(bd, pts, [0.004] * 32, [0.016] * 32, lambda p: Vector((0, 0, 1)), ring=8, closed=True)
    make("Bands%d" % side, bd, "band", w_boot)
    bk = MB(); bx = cx + side * 0.094
    for zb in (0.16, 0.245):
        pts = [Vector((bx, 0.0, zb)) + Vector((0, 0.016 * math.cos(t), 0.018 * math.sin(t))) for t in [2 * math.pi * k / 16 for k in range(16)]]
        sweep(bk, pts, [0.0035] * 16, [0.0035] * 16, lambda p: Vector((side, 0, 0)), ring=6, closed=True)
    make("Buckle%d" % side, bk, "chain", w_boot)
for sd in (1, -1): boot(sd)

# ================= JOIN, PARENT, EXPORT =================
bpy.ops.object.select_all(action="DESELECT")
for o in PARTS: o.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0]; bpy.ops.object.join()
OUTF = bpy.context.object; OUTF.name = "PhoebeOutfit"; OUTF.data.name = "PhoebeOutfit"
for p in OUTF.data.polygons: p.use_smooth = True
OUTF.parent = ARM; m = OUTF.modifiers.new("Armature", "ARMATURE"); m.object = ARM
# normalize
for v in OUTF.data.vertices:
    t = sum(g.weight for g in v.groups)
    if t > 0:
        for g in v.groups: g.weight /= t
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); tris = sum(len(p.vertices) - 2 for p in OUTF.data.polygons)
print("TRIS", tris, "VERTS", len(OUTF.data.vertices), "MATS", [m.name for m in OUTF.data.materials])
bpy.ops.object.select_all(action="DESELECT"); ARM.select_set(True); OUTF.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_animations=False, export_skins=True, export_yup=True)

# ================= PROOF =================
SHOW = {"Armature", "Armature.001", "Body", "Head_cat", "Top_jacket", "Bot_longskirt", "PhoebeOutfit"}
for o in sc.objects:
    if o.type == "MESH": o.hide_render = o.name not in SHOW
sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.device = "CPU"
sc.render.resolution_x = sc.render.resolution_y = 656
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.33, 0.4, 1)
def light(loc, e):
    l = bpy.data.lights.new("l", "SUN"); l.energy = e; o = bpy.data.objects.new("l", l); sc.collection.objects.link(o)
    o.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
light((1.5, 3, 3), 3.0); light((-2, -2, 2), 1.2)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
def shot(name, pos, tgt, lens=50):
    cam.location = pos; cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)
mode = sys.argv[-1] if "--" in sys.argv else "all"
shot("a_front", (0, 3.6, 0.85), (0, 0, 0.85))
shot("b_34", (2.2, 2.6, 1.2), (0, 0, 0.85))
shot("c_face", (0.35, 1.5, 1.35), (0, 0, 1.3))
shot("d_back", (-1.6, -2.8, 1.2), (0, 0, 0.85))
act = bpy.data.actions.get("Walk")
for a in (ARM, ARM2):
    a.animation_data_create(); a.animation_data.action = act
fr = act.frame_range; sc.frame_set(int(fr[0] + (fr[1] - fr[0]) * 0.25))
shot("e_walk", (2.4, 2.4, 1.0), (0, 0, 0.75))
act = bpy.data.actions.get("Idle"); ARM.animation_data.action = act; sc.frame_set(int(act.frame_range[0]))
shot("f_idle", (1.2, 3.0, 1.0), (0, 0, 0.8))
