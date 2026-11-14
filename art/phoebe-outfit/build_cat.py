# Phoebe's outfit on the live cat body (cat-wardrobe f = /cdn/value.851a1a9d…glb, fetched as /workspace/phoebe/body_cat.glb).
# Supersedes build.py (that one fit the older body_f). Coat hugs body+hips at 2.2 cm, hangs straight past the knees,
# skirt weights from hips + both thighs; black dress; sleeves to white cuffs; red bow + chain; banded boots;
# hair shell whose fringe leaves eyes and muzzle open. blender -b --factory-startup --python-exit-code 1 --python art/phoebe-outfit/build_cat.py [-- longEl shortEl]
import bpy, math, sys, os
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree
W = "/workspace/phoebe"; OUT = W + "/phoebe-outfit-cat.glb"; PROOF = "/tmp/phoebe"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=W + "/body_cat.glb")
ARM = bpy.data.objects["Armature"]; BODY = bpy.data.objects["Body"]; HEAD = bpy.data.objects["Head"]
ARM.data.pose_position = "REST"
for k in BODY.data.shape_keys.key_blocks:
    if k.name == "Chest": k.value = 0.575          # cat-wardrobe chestOf default
dg = bpy.context.evaluated_depsgraph_get()
def wverts(o):
    e = o.evaluated_get(dg); m = e.to_mesh(); r = [o.matrix_world @ v.co for v in m.vertices]; e.to_mesh_clear(); return r
BV = wverts(BODY)
GN = {g.index: g.name.replace("mixamorig:", "") for g in BODY.vertex_groups}
BW = [{GN[g.group]: g.weight for g in v.groups if g.weight > 0.01} for v in BODY.data.vertices]
def wsum(w, keys): return sum(v for k, v in w.items() if any(k.startswith(p) for p in keys))
TAIL = [wsum(w, ["Tail"]) > 0.3 for w in BW]
ARMV = [wsum(w, ["LeftArm", "LeftFore", "LeftHand", "RightArm", "RightFore", "RightHand"]) > 0.5 for w in BW]
HIPZ = 0.36
def ss(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def hull(P):
    P = sorted(set((round(p[0], 5), round(p[1], 5)) for p in P))
    if len(P) < 3: return P
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
def ray_poly(c, d, poly):
    best = 0.0
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        ex, ey = q[0] - p[0], q[1] - p[1]; den = d[0] * ey - d[1] * ex
        if abs(den) < 1e-9: continue
        wx, wy = p[0] - c[0], p[1] - c[1]
        t = (wx * ey - wy * ex) / den; s = (wx * d[1] - wy * d[0]) / den
        if t > 0 and -1e-6 <= s <= 1 + 1e-6: best = max(best, t)
    return best
def torso_pts(z, straight):
    if straight and z < HIPZ:   # below the hip it hangs straight from the widest of hips and thighs
        return [(v.x, v.y) for i, v in enumerate(BV) if not TAIL[i] and not ARMV[i] and z - 0.01 <= v.z <= HIPZ + 0.01]
    lim = 0.16 if z > 0.5 else 0.5
    return [(v.x, v.y) for i, v in enumerate(BV) if not TAIL[i] and not ARMV[i] and abs(v.z - z) < 0.014 and abs(v.x) < lim]
def adir(a): a = math.radians(a); return (math.sin(a), -math.cos(a))     # az 0 = front (-Y)
MATS = {"hair": ("#e9a07e", 0.0, 0.6), "coat": ("#b8975c", 0.0, 0.8), "dress": ("#17141a", 0.0, 0.7), "cuff": ("#f2efe8", 0.0, 0.7),
        "bow": ("#b8202a", 0.0, 0.5), "chain": ("#c9c4b8", 1.0, 0.3), "boot": ("#141216", 0.0, 0.6), "band": ("#a8562a", 0.0, 0.6)}
def hexc(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5)) + (1,)
def mat(n):
    if n in bpy.data.materials: return bpy.data.materials[n]
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    c, me, ro = MATS[n]; b.inputs["Base Color"].default_value = hexc(c); b.inputs["Metallic"].default_value = me; b.inputs["Roughness"].default_value = ro
    return m
def grid_faces(R, U, closeU):
    F = []
    for j in range(R - 1):
        for i in range(U if closeU else U - 1):
            a = j * U + i; b = j * U + (i + 1) % U
            F.append((a, b, b + U, a + U))
    return F
PARTS = []
def norm(d):
    d = {g: w for g, w in d.items() if w > 0.02}; s = sum(d.values()) or 1
    return {(g if g.startswith("mixamorig:") else "mixamorig:" + g): w / s for g, w in d.items()}
def make(name, V, F, mname, wfn, thick=0.0):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in V], [], F); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); me.materials.append(mat(mname))
    for p in me.polygons: p.use_smooth = True
    bpy.context.view_layer.objects.active = o
    if thick:
        m = o.modifiers.new("t", "SOLIDIFY"); m.thickness = thick; m.offset = 0
        bpy.ops.object.modifier_apply(modifier=m.name)
    for v in o.data.vertices:
        for g, w in norm(wfn(o.matrix_world @ v.co)).items():
            vg = o.vertex_groups.get(g) or o.vertex_groups.new(name=g); vg.add([v.index], w, "REPLACE")
    o.parent = ARM; o.modifiers.new("skin", "ARMATURE").object = ARM
    PARTS.append(o); return o
def kd_of(mask):
    idx = [i for i in range(len(BV)) if mask(i)]; t = kdtree.KDTree(len(idx))
    for n, i in enumerate(idx): t.insert(BV[i], n)
    t.balance(); return t, idx
def near_w(kd, p, k=6):
    t, idx = kd; acc = {}; tot = 0
    for co, n, d in t.find_n(p, k):
        f = 1.0 / (d + 0.005); tot += f
        for g, w in BW[idx[n]].items():
            if g.startswith("Tail"): g = "Hips"
            acc[g] = acc.get(g, 0) + w * f
    return {g: w / tot for g, w in acc.items()}
KT = kd_of(lambda i: not TAIL[i] and not ARMV[i])
def hang_w(p):   # torso by the skin; below the hip the hips carry it and both thighs swing it, the near one more
    base = near_w(KT, p); t = ss(HIPZ - 0.02, 0.2, p.z)
    if t <= 0: return base
    s = max(-1, min(1, p.x / 0.17))
    leg = {"Hips": 0.4, "LeftUpLeg": 0.3 + 0.22 * s, "RightUpLeg": 0.3 - 0.22 * s}
    out = {}
    for d, f in ((base, 1 - t), (leg, t)):
        for g, w in d.items(): out[g] = out.get(g, 0) + w * f
    return out
# ---------- coat + dress ----------
def shell(z0, z1, NZ, gap, open_fn, NU, collar=None):
    rows = []
    for j in range(NZ):
        z = z0 + (z1 - z0) * j / (NZ - 1); H = hull(torso_pts(z, True))
        cy = (min(p[1] for p in H) + max(p[1] for p in H)) / 2; op = open_fn(z); row = []
        for i in range(NU):
            a = op + (360 - 2 * op) * i / (NU - 1) if op > 0 else 360 * i / NU
            d = adir(a); row.append([cy, z, d, ray_poly((0, cy), d, H) + gap + (collar(z) if collar else 0)])
        rows.append(row)
    for _ in range(3):
        R = [[sum(rows[jj][i][3] for jj in (j - 1, j, j + 1) if 0 <= jj < NZ) / len([jj for jj in (j - 1, j, j + 1) if 0 <= jj < NZ]) for i in range(NU)] for j in range(NZ)]
        for j in range(NZ):
            for i in range(NU): rows[j][i][3] = R[j][i]
    V = [Vector((d[0] * r, cy + d[1] * r, z)) for row in rows for cy, z, d, r in row]
    return V, grid_faces(NZ, NU, open_fn(0.3) <= 0)
HEM, NECK = 0.10, 0.625
coat_open = lambda z: lerp(lerp(26, 13, ss(HEM, 0.45, z)), 30, ss(0.52, NECK, z))
V, F = shell(HEM, NECK, 34, 0.022, coat_open, 44, collar=lambda z: 0.012 * ss(0.58, NECK, z))
make("coat", V, F, "coat", hang_w, thick=0.007)
V, F = shell(0.17, 0.605, 26, 0.009, lambda z: 0, 40)
make("dress", V, F, "dress", hang_w, thick=0.004)
# ---------- sleeves + cuffs ----------
def arm_ring(side, x):
    P = [BV[i] for i in range(len(BV)) if ARMV[i] and BV[i].x * side > 0 and abs(abs(BV[i].x) - x) < 0.012]
    if len(P) < 4: return None
    cy = (min(p.y for p in P) + max(p.y for p in P)) / 2; cz = (min(p.z for p in P) + max(p.z for p in P)) / 2
    return cy, cz, max(math.hypot(p.y - cy, p.z - cz) for p in P)
for side, nm in ((1, "L"), (-1, "R")):
    XS = [0.115 + (0.335 - 0.115) * j / 13 for j in range(14)]; RG = []
    for x in XS:
        a = arm_ring(side, x); RG.append(a if a else RG[-1])
    U = 18; V = []
    for j, (x, (cy, cz, r)) in enumerate(zip(XS, RG)):
        rr = r + 0.02 + 0.012 * (j / 13) ** 1.5 + (0.012 if j == 0 else 0)
        for i in range(U):
            t = 2 * math.pi * i / U; V.append(Vector((x * side, cy + math.cos(t) * rr, cz + math.sin(t) * rr)))
    sh = "LeftShoulder" if side > 0 else "RightShoulder"
    kd = kd_of(lambda i: (ARMV[i] or wsum(BW[i], [sh]) > 0.3) and BV[i].x * side > 0)
    make("sleeve" + nm, V, grid_faces(14, U, True), "coat", lambda p, kd=kd: near_w(kd, p), thick=0.006)
    cy, cz, r = RG[-1]; V = []
    for j, x in enumerate((0.318, 0.33, 0.348, 0.362)):
        rr = r + 0.036 - (0.006 if j in (0, 3) else 0)
        for i in range(U):
            t = 2 * math.pi * i / U; V.append(Vector((x * side, cy + math.cos(t) * rr, cz + math.sin(t) * rr)))
    make("cuff" + nm, V, grid_faces(4, U, True), "cuff", lambda p, kd=kd: near_w(kd, p), thick=0.005)
# ---------- bow + chain ----------
def front_y(z, x=0.0):
    H = hull(torso_pts(z, False)); cy = (min(p[1] for p in H) + max(p[1] for p in H)) / 2
    return cy - ray_poly((x, cy), (0, -1), H)
def blob(c, sx, sy, sz, n=10):
    V = []
    for j in range(n + 1):
        el = -math.pi / 2 + math.pi * j / n
        for i in range(n * 2):
            az = 2 * math.pi * i / (2 * n); V.append(Vector((c.x + math.cos(el) * math.cos(az) * sx, c.y + math.cos(el) * math.sin(az) * sy, c.z + math.sin(el) * sz)))
    return V, grid_faces(n + 1, 2 * n, True)
BZ = 0.592; by = front_y(BZ) - 0.032
neck_w = lambda p: near_w(KT, p)
for nm, c, s in (("bowL", Vector((0.03, by, BZ)), (0.03, 0.012, 0.018)), ("bowR", Vector((-0.03, by, BZ)), (0.03, 0.012, 0.018)),
                 ("bowK", Vector((0, by - 0.006, BZ)), (0.012, 0.012, 0.013)), ("tailL", Vector((0.012, by + 0.002, BZ - 0.035)), (0.009, 0.006, 0.03)),
                 ("tailR", Vector((-0.014, by + 0.002, BZ - 0.032)), (0.009, 0.006, 0.028))):
    V, F = blob(c, *s); make(nm, V, F, "bow", neck_w)
for k in range(9):
    z = BZ - 0.03 - k * 0.022; x = -0.012 - 0.03 * math.sin(k / 8 * math.pi * 0.5)
    V, F = blob(Vector((x, front_y(z, x) - 0.017, z)), 0.006, 0.004, 0.009, 6); make("chain%d" % k, V, F, "chain", neck_w)
# ---------- boots ----------
for side, nm in ((1, "L"), (-1, "R")):
    pref = "Left" if side > 0 else "Right"
    msk = lambda i: wsum(BW[i], [pref + "Leg", pref + "Foot", pref + "Toe"]) > 0.5
    ZS = [0.0, 0.012, 0.03, 0.05, 0.075, 0.1, 0.125, 0.15, 0.172, 0.18]; U = 24; V = []; CEN = []
    for z in ZS:
        H = hull([(BV[i].x, BV[i].y) for i in range(len(BV)) if msk(i) and abs(BV[i].z - max(z, 0.008)) < 0.012])
        cx = sum(p[0] for p in H) / len(H); cy = sum(p[1] for p in H) / len(H); CEN.append((cx, cy))
        for i in range(U):
            d = adir(360 * i / U); r = ray_poly((cx, cy), d, H) + (0.012 if z < 0.17 else 0.02)
            V.append(Vector((cx + d[0] * r, cy + d[1] * r, z)))
    F = grid_faces(len(ZS), U, True); c0 = len(V); V.append(sum(V[:U], Vector()) / U)
    F += [(c0, (i + 1) % U, i) for i in range(U)]
    kd = kd_of(lambda i: msk(i) or wsum(BW[i], [pref + "UpLeg"]) > 0.5)
    wf = lambda p, kd=kd: near_w(kd, p)
    make("boot" + nm, V, F, "boot", wf)
    for bz in (0.06, 0.125):
        jz = min(range(len(ZS)), key=lambda j: abs(ZS[j] - bz)); row = V[jz * U:(jz + 1) * U]; cx, cy = CEN[jz]; BVr = []
        for j, dz in enumerate((-0.011, -0.009, 0.009, 0.011)):
            g = 0.004 if j in (1, 2) else 0.0
            for v in row:
                o = Vector((v.x - cx, v.y - cy, 0)); o2 = o + o.normalized() * g
                BVr.append(Vector((cx + o2.x, cy + o2.y, bz + dz)))
        make("band%s%d" % (nm, int(bz * 1000)), BVr, grid_faces(4, U, True), "band", wf)
# ---------- hair ----------
HV = wverts(HEAD); HC = Vector((0, sum(v.y for v in HV) / len(HV), 0.86))
e = HEAD.evaluated_get(dg); hm = e.to_mesh()
HB = BVHTree.FromPolygons([HEAD.matrix_world @ v.co for v in hm.vertices], [tuple(p.vertices) for p in hm.polygons]); e.to_mesh_clear()
def hdir(az, el):
    a, e = math.radians(az), math.radians(el); return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
def skull(az, el):
    h = HB.ray_cast(HC, hdir(az, el)); return h[3] if h[0] else 0.2
FR = [float(a) for a in sys.argv[sys.argv.index("--") + 1:]] if "--" in sys.argv else []
LONG_EL = FR[0] if FR else 18.0     # fringe tip on one side: half over that eye
SHORT_EL = FR[1] if len(FR) > 1 else 34.0
def low(az):
    a = ((az + 180) % 360) - 180
    if abs(a) <= 48: return lerp(SHORT_EL, LONG_EL, ss(30, -30, a)) + 7 * abs(math.sin(math.radians(a) * 7))
    if abs(a) <= 100: return lerp(lerp(SHORT_EL, LONG_EL, 0.5 if a < 0 else 0), -28, ss(48, 75, abs(a)))
    return lerp(-28, -42, ss(100, 160, abs(a)))
NA, NE = 72, 16; V = []
for j in range(NE):
    for i in range(NA):
        az = 360 * i / NA; lo = low(az); el = lerp(lo, 89.0, (j / (NE - 1)) ** 1.2)
        off = 0.022 + 0.012 * ss(lo + 25, lo, el) + 0.018 * ss(40, 80, el)
        V.append(HC + hdir(az, el) * (skull(az, el) + off))
HEADW = lambda p: {"Head": 1.0}
make("hair", V, grid_faces(NE, NA, True), "hair", HEADW, thick=0.012)
V, F = blob(HC + hdir(180, 52) * (skull(180, 52) + 0.06), 0.075, 0.07, 0.07, 10); make("bun", V, F, "hair", HEADW)
for s in (1, -1):    # side locks framing the face
    V = []; U = 10
    for j in range(9):
        el = lerp(-5, -55, j / 8); c = HC + hdir(62 * s, el) * (skull(62 * s, min(el, -20)) + 0.035); r = 0.032 * (1 - j / 9.5)
        for i in range(U):
            t = 2 * math.pi * i / U; V.append(c + Vector((math.cos(t) * r, math.sin(t) * r * 0.5, 0)))
    make("lock%d" % (s + 1), V, grid_faces(9, U, True), "hair", lambda p: {"Head": 0.7, "Neck": 0.3})
# ---------- proof ----------
os.makedirs(PROOF, exist_ok=True)
ARM.data.pose_position = "POSE"
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 520; sc.render.resolution_y = 656
sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.35, 0.38, 1)
for o in list(sc.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
L = bpy.data.objects.new("lamp", bpy.data.lights.new("lamp", "SUN")); sc.collection.objects.link(L); L.data.energy = 3
def shot(nm, pos, tgt, lens=60):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
    L.rotation_euler = cam.rotation_euler; sc.render.filepath = f"{PROOF}/p_{nm}.png"; bpy.ops.render.render(write_still=True)
if "--noproof" not in sys.argv:
    shot("a_front", (0, -3.2, 0.62), (0, 0, 0.6)); shot("b_side", (3.2, -0.3, 0.62), (0, 0, 0.6)); shot("c_back", (0, 3.2, 0.62), (0, 0, 0.6)); shot("d_face", (0, -1.6, 0.86), (0, 0, 0.84))
# ---------- export ----------
for o in (BODY, HEAD): bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in PARTS: o.select_set(True)
ARM.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_animations=False, export_skins=True, export_morph=False)
print("TRIS", sum(len(p.vertices) - 2 for o in PARTS for p in o.data.polygons))
