# Face expressions + lip-sync keys for the human bodies (Shelly Nov 9: "make the faces have expressions + dynamic lip syncing").
# Adds X_* shape keys to the head mesh (the one carrying the Iris slot) of a shipped human body glb:
#   X_Blink X_Squint (eyelids: new skin-slot lid faces that drop over the eye socket; lashes follow)
#   X_Open (jaw drop)  X_Wide (E/I)  X_Round (O/U pucker)  X_Smile  X_Frown
#   X_BrowUp X_BrowAngry X_BrowSad
# blender -b --factory-startup --python-exit-code 1 --python art/human-face/expressions.py -- in.glb out.glb [proof.png]
import bpy, bmesh, sys, math
from mathutils import Vector, kdtree
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]; proof = a[2] if len(a) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
H = next(o for o in bpy.data.objects if o.type == "MESH" and any(m and m.name == "Iris" for m in o.data.materials))
MW = H.matrix_world; MI = MW.inverted().to_3x3()
mats = [m.name for m in H.data.materials]
SK = mats.index("Head_Skin")
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

bm = bmesh.new(); bm.from_mesh(H.data); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
XK = ["X_Blink", "X_Squint", "X_Open", "X_Wide", "X_Round", "X_Smile", "X_Frown", "X_BrowUp", "X_BrowAngry", "X_BrowSad"]
bm.free()
for n in XK: H.shape_key_add(name=n, from_mix=False)
bm = bmesh.new(); bm.from_mesh(H.data); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
uvl = bm.loops.layers.uv.active; dl = bm.verts.layers.deform.active
keyl0 = {k.name: bm.verts.layers.shape.get(k.name) for k in H.data.shape_keys.key_blocks}
keyl = {**keyl0, **{n: bm.verts.layers.shape.get(n) for n in XK}}
basisL = keyl["Basis"]
W = lambda v: MW @ v[basisL]
def vset(name):
    i = mats.index(name); return {v for f in bm.faces if f.material_index == i for v in f.verts}
EYE, IRIS, LASH, BROW, MOUTH, TEETH = (vset(n) for n in ("Eye", "Iris", "Lash", "Brow", "Mouth", "Teeth"))

# --- eye opening contour per side: top/bottom z as a function of x
def contour(vs):
    ps = [W(v) for v in vs]; x0 = min(p.x for p in ps); x1 = max(p.x for p in ps); n = 14
    top = [-1e9] * n; bot = [1e9] * n
    for p in ps:
        i = min(n - 1, int((p.x - x0) / (x1 - x0) * n)); top[i] = max(top[i], p.z); bot[i] = min(bot[i], p.z)
    for arr, bad in ((top, -1e9), (bot, 1e9)):
        for i in range(n):
            if arr[i] == bad: arr[i] = next((arr[j] for d in range(1, n) for j in (i - d, i + d) if 0 <= j < n and arr[j] != bad), 0)
    xs = [x0 + (i + 0.5) * (x1 - x0) / n for i in range(n)]
    def f(arr, x):
        if x <= xs[0]: return arr[0]
        if x >= xs[-1]: return arr[-1]
        i = int((x - xs[0]) / (xs[1] - xs[0])); i = min(i, n - 2); t = (x - xs[i]) / (xs[i + 1] - xs[i]); return arr[i] * (1 - t) + arr[i + 1] * t
    return (lambda x: f(top, x)), (lambda x: f(bot, x)), x0, x1
sides = {}
for s in (1, -1):
    sides[s] = contour([v for v in EYE if (W(v).x > 0) == (s > 0)])
EH = {s: max(sides[s][0](x) - sides[s][1](x) for x in [sides[s][2] + (sides[s][3] - sides[s][2]) * i / 20 for i in range(21)]) for s in (1, -1)}
print("eye heights", EH)
iris_kd = kdtree.KDTree(len(IRIS)); ilist = list(IRIS)
for i, v in enumerate(ilist): iris_kd.insert(Vector((W(v).x, 0, W(v).z)), i)
iris_kd.balance()

# --- lids: a clean skin-slot grid patch per eye, folded flat behind the upper lash at rest, drawn down over the eye on X_Blink/X_Squint
skin_uv = None; ec = sum((W(v) for v in EYE), Vector()) / len(EYE); best = 1e9
for f in bm.faces:
    if f.material_index != SK: continue
    for l in f.loops:
        p = W(l.vert); d = abs(p.x - (ec.x + 0.05)) + abs(p.z - (ec.z + 0.04)) + abs(p.y + 0.0)
        if d < best: best, skin_uv = d, l[uvl].uv.copy()
front = list(EYE | IRIS); fkd = kdtree.KDTree(len(front))
for i, v in enumerate(front): fkd.insert(Vector((W(v).x, 0, W(v).z)), i)
fkd.balance()
def front_y(x, z):
    hits = fkd.find_range(Vector((x, 0, z)), 0.006) or [fkd.find(Vector((x, 0, z)))]
    return min(W(front[h[1]]).y for h in hits)
def nearest_eye(x, z):
    return front[fkd.find(Vector((x, 0, z)))[1]]
# lash islands: an island whose centre sits above the eye's middle is an upper lash
UPLASH = set(); seen = set()
for v0 in LASH:
    if v0 in seen: continue
    isl = []; st = [v0]; seen.add(v0)
    while st:
        v = st.pop(); isl.append(v)
        for e in v.link_edges:
            o = e.other_vert(v)
            if o in LASH and o not in seen: seen.add(o); st.append(o)
    cz = sum(W(v).z for v in isl) / len(isl); cx = sum(W(v).x for v in isl) / len(isl); sd = 1 if cx > 0 else -1
    xc = min(max(cx, sides[sd][2]), sides[sd][3])
    if cz > (sides[sd][0](xc) + sides[sd][1](xc)) / 2: UPLASH.update(isl)
print("lash", len(LASH), "upper", len(UPLASH))
C, R = 14, 7
lids = []  # (vert, side, x, row)
for s in (1, -1):
    top, bot, x0, x1 = sides[s]; m = 0.0012
    grid = []
    for j in range(R):
        row = []
        for i in range(C):
            x = (x0 - m) + (x1 - x0 + 2 * m) * i / (C - 1)
            nv = bm.verts.new((0, 0, 0)); e = nearest_eye(x, top(x))
            if dl: nv[dl] = e[dl]
            row.append(nv); lids.append((nv, s, x, j, e))
        grid.append(row)
    for j in range(R - 1):
        for i in range(C - 1):
            q = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
            if s < 0: q.reverse()
            f = bm.faces.new(q); f.material_index = SK; f.smooth = True
            for l in f.loops: l[uvl].uv = skin_uv
def lid_pos(s, x, j, frac):
    top, bot, x0, x1 = sides[s]; xc = min(max(x, x0), x1)
    t, b = top(xc) + 0.0006, bot(xc)
    if frac <= 0: return Vector((x, front_y(xc, t) + 0.006, t - 0.0004 * j))
    z = t - (t - b + 0.0012) * frac * j / (R - 1)
    return Vector((x, front_y(xc, z) - 0.0016 - 0.0008 * math.sin(math.pi * j / (R - 1)), z))
for nv, s, x, j, e in lids:
    rest = lid_pos(s, x, j, 0); nv.co = MW.inverted() @ rest
    for k, L in keyl.items():
        nv[L] = (MW.inverted() @ rest) + (e[L] - e[basisL])
bm.normal_update()
def addkey(name):
    return keyl[name]
def put(L, v, dw):  # dw: world-space offset from basis
    v[L] = v[basisL] + MI @ dw
for name, frac in (("X_Blink", 1.0), ("X_Squint", 0.45)):
    L = addkey(name)
    for nv, s, x, j, e in lids:
        put(L, nv, lid_pos(s, x, j, frac) - lid_pos(s, x, j, 0))
    for v in LASH:
        p = W(v); s = 1 if p.x > 0 else -1; top, bot, x0, x1 = sides[s]; xc = min(max(p.x, x0), x1)
        if v not in UPLASH: continue  # lower lash islands stay
        put(L, v, Vector((0, -0.0018 * frac, -(top(xc) - bot(xc) + 0.0012) * frac * 0.97)))
    if frac < 1:
        for v in bm.verts:
            if v in EYE or v in LASH or v in IRIS: continue
            p = W(v); s = 1 if p.x > 0 else -1; top, bot, x0, x1 = sides[s]
            if x0 - 0.01 < p.x < x1 + 0.01 and p.y < 0.03:
                bz = bot(min(max(p.x, x0), x1))
                if bz - 0.025 < p.z < bz + 0.002: put(L, v, Vector((0, -0.0006, 0.003 * ss(bz - 0.025, bz - 0.004, p.z))))
# --- mouth
mp = [W(v) for v in MOUTH]
xc = max(abs(p.x) for p in mp); zc = sum(p.z for p in mp) / len(mp)
front = [W(v) for v in bm.verts if abs(W(v).x) < 0.004 and abs(W(v).z - zc) < 0.012 and W(v).y < 0]
zline = zc
if front:
    fr = sorted(front, key=lambda p: p.y)[:6]; zline = sum(p.z for p in fr) / len(fr)
print("mouth xc", round(xc, 4), "zc", round(zc, 4), "zline", round(zline, 4))
FACE = [v for v in bm.verts if v not in EYE and v not in IRIS and v not in LASH and v not in BROW]
def mouthw(p, rx, rz):
    return math.exp(-((p.x / rx) ** 2 + ((p.z - zline) / rz) ** 2))
L = addkey("X_Open")
for v in FACE:
    p = W(v)
    if p.y > 0.06: continue
    wx = 1 - ss(0.014, 0.055, abs(p.x))
    if p.z < zline - 0.0004 or (v in TEETH and p.z < zline + 0.002) or (v in MOUTH and p.z < zline):
        wz = 1 - ss(1.44, 1.48, zline - p.z + 1.44) * 0  # whole lower face below the slit drops
        wz = ss(-0.002, 0.004, zline - p.z) if v not in TEETH and v not in MOUTH else 1
        wfar = 1 - ss(0.05, 0.075, zline - p.z)  # the neck stays
        w = wx * wz * (0.35 + 0.65 * wfar) if p.z > 1.44 else 0
        put(L, v, Vector((0, 0.0025 * w, -0.0125 * w)))
    elif p.z < zline + 0.012 and abs(p.x) < 0.03:
        w = wx * (1 - ss(0.002, 0.012, p.z - zline))
        put(L, v, Vector((0, 0, 0.0016 * w)))
L = addkey("X_Wide")
for v in FACE:
    p = W(v); w = mouthw(p, 0.026, 0.012)
    if w < 0.02: continue
    put(L, v, Vector((math.copysign(0.0032, p.x) * w * min(1, abs(p.x) / xc), 0.0008 * w, 0)))
L = addkey("X_Round")
for v in FACE:
    p = W(v); w = mouthw(p, 0.028, 0.014)
    if w < 0.02: continue
    put(L, v, Vector((-p.x * 0.32 * w, -0.0035 * w, (zline - p.z) * 0.15 * w)))
for name, dz, dx, dy in (("X_Smile", 0.0048, 0.0024, 0.0022), ("X_Frown", -0.004, 0.0004, 0.0)):
    L = addkey(name)
    for v in FACE:
        p = W(v)
        for s in (1, -1):
            d2 = ((p.x - s * xc) / 0.014) ** 2 + ((p.z - zline) / 0.013) ** 2
            w = math.exp(-d2)
            if w > 0.02 and (p.x > 0) == (s > 0): put(L, v, Vector((s * dx * w, dy * w, dz * w)))
# --- brows
bx = max(abs(W(v).x) for v in BROW); bz = sum(W(v).z for v in BROW) / len(BROW)
for name, f in (("X_BrowUp", lambda t: 0.0055), ("X_BrowAngry", lambda t: -0.0055 * (1 - t) + 0.0012 * t), ("X_BrowSad", lambda t: 0.0052 * (1 - t) - 0.0010 * t)):
    L = addkey(name)
    for v in BROW:
        p = W(v); t = min(1, abs(p.x) / bx); put(L, v, Vector((0, 0, f(t))))
    for v in FACE:  # the skin under the brow rides along softly
        p = W(v)
        if v in MOUTH or v in TEETH or abs(p.x) > bx + 0.01 or p.y > 0.04: continue
        w = math.exp(-((p.z - bz) / 0.009) ** 2)
        if w > 0.05: t = min(1, abs(p.x) / bx); put(L, v, Vector((0, 0, f(t) * 0.55 * w)))
bm.to_mesh(H.data); bm.free(); H.data.update()
print("keys", [k.name for k in H.data.shape_keys.key_blocks][-11:], "verts", len(H.data.vertices))

if proof:
    for o in bpy.data.objects:
        if o.type == "MESH" and o != H and not o.name.startswith(("Hat_", "Eyew_")): o.hide_render = False
        if o.name.startswith(("Hat_", "Eyew_")): o.hide_render = True
    cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); bpy.context.scene.collection.objects.link(co)
    co.location = Vector((0, -0.42, ec.z - 0.03)); co.rotation_euler = (math.radians(90), 0, 0); cam.lens = 75
    sc = bpy.context.scene; sc.camera = co
    Lt = bpy.data.lights.new("l", "SUN"); lo = bpy.data.objects.new("l", Lt); sc.collection.objects.link(lo); lo.rotation_euler = (1.25, 0, 0.35); Lt.energy = 3.2
    w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.35, 0.33, 0.3)
    sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 380
    kb = H.data.shape_keys.key_blocks
    poses = [("neutral", {}), ("blink", {"X_Blink": 1}), ("talk A", {"X_Open": 1}), ("talk O", {"X_Open": .6, "X_Round": 1}), ("talk E", {"X_Open": .35, "X_Wide": 1}),
             ("happy", {"X_Smile": 1, "X_Squint": 1, "X_BrowUp": .5}), ("angry", {"X_BrowAngry": 1, "X_Frown": .7, "X_Squint": .5}), ("sad", {"X_BrowSad": 1, "X_Frown": 1}), ("shock", {"X_BrowUp": 1, "X_Open": .8, "X_Round": .5})]
    import os; os.makedirs(os.path.dirname(proof), exist_ok=True); outs = []
    for nm, vals in poses:
        for k in kb:
            if k.name.startswith("X_"): k.value = vals.get(k.name, 0)
        sc.render.filepath = proof.replace(".png", f"_{len(outs)}.png"); bpy.ops.render.render(write_still=True); outs.append(sc.render.filepath)
    for k in kb:
        if k.name.startswith("X_"): k.value = 0
for o in bpy.data.objects: o.select_set(o.type in ("MESH", "ARMATURE"))
bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_image_format="JPEG", export_jpeg_quality=88)
