# Critter characters: cute kemono kawaii animal folk (rubberhose x Unikitty x Steven Universe), real meshes.
# One GLB per sex: Body (shared, skinned), Species_<sp> (head+eyes+mouth+ears+tail+extras, morph keys for faces),
# and every garment as its own skinned mesh (Top_*, Bot_*, Shoes_*, Hat_*, Eyew_*, Neck_*). Materials are named
# slots the game tints from the look (fur belly mark nose inner tip pad limb iris cloth_* ...).
# Built facing Blender +Y (= glTF -Z, the engine's front), T-pose, engine humanoid bone names.
# Run: SEX=f blender -b --factory-startup --python-exit-code 1 --python art/critter/build.py
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion
from mathutils.bvhtree import BVHTree
SEX = os.environ.get("SEX", "f"); STAGE = os.environ.get("STAGE", "all"); ONLY = os.environ.get("ONLY", "")
OUT = "/workspace/critter"; PROOF = f"/tmp/critter/{SEX}"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
V = lambda *a: Vector(a)
K = 0.572
FEM = SEX == "f"

# ---------------- helpers ----------------
def mball(name, res=0.008):
    mb = bpy.data.metaballs.new(name); o = bpy.data.objects.new(name, mb); scene.collection.objects.link(o)
    mb.resolution = mb.render_resolution = res; mb.threshold = 0.6
    return mb
def ball(mb, c, r, neg=False, st=2.0):
    e = mb.elements.new(type='BALL'); e.co = Vector(c); e.radius = r / K; e.use_negative = neg; e.stiffness = st; return e
def ell(mb, c, ax, ay, az, rot=None, neg=False, st=2.0):
    e = mb.elements.new(type='ELLIPSOID'); e.co = Vector(c); e.radius = 1.0; e.size_x, e.size_y, e.size_z = ax / K, ay / K, az / K
    if rot is not None: e.rotation = rot if isinstance(rot, Quaternion) else Euler(rot).to_quaternion()
    e.use_negative = neg; e.stiffness = st; return e
def cap(mb, a, b, r, neg=False, st=2.0):
    a, b = Vector(a), Vector(b); d = b - a
    e = mb.elements.new(type='CAPSULE'); e.co = (a + b) / 2; e.radius = r / K; e.size_x = max(1e-4, d.length / 2)
    e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized()); e.use_negative = neg; e.stiffness = st; return e
def chain(mb, pts, rs, st=2.0):
    for i in range(len(pts) - 1): cap(mb, pts[i], pts[i + 1], (rs[i] + rs[i + 1]) / 2, st=st)
def sel(*objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def to_mesh(mbobj, voxel, smooth=3):
    sel(mbobj); bpy.ops.object.convert(target='MESH'); m = bpy.context.active_object
    r = m.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = voxel; bpy.ops.object.modifier_apply(modifier="vox")
    if smooth:
        sm = m.modifiers.new("sm", "SMOOTH"); sm.iterations = smooth; sm.factor = 0.5; bpy.ops.object.modifier_apply(modifier="sm")
    return m
def decimate(o, target):
    r = min(1.0, target / max(1, tris(o)))
    if r < 1:
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = r; sel(o); bpy.ops.object.modifier_apply(modifier="dec")
def smooth_shade(o):
    for p in o.data.polygons: p.use_smooth = True
def uv_unwrap(o, scale=1.0):
    sel(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003); bpy.ops.object.mode_set(mode='OBJECT')
    if scale != 1:
        uv = o.data.uv_layers.active.data
        for d in uv: d.uv = d.uv * scale
def mesh_from(name, verts, faces):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); return o
def join(objs, name):
    objs = [o for o in objs if o]; sel(*objs, active=objs[0]); bpy.ops.object.join(); o = bpy.context.active_object; o.name = name; o.data.name = name; return o
def rigid(o, bone):
    o.vertex_groups.clear(); g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')

# ---------------- textures (procedural, tileable, painted in numpy) ----------------
def tile_noise(n, cells, rng):
    g = rng.random((cells, cells)); g = np.kron(g, np.ones((n // cells, n // cells)))
    for _ in range(2): g = (g + np.roll(g, n // cells // 2, 0) + np.roll(g, n // cells // 2, 1) + np.roll(np.roll(g, n // cells // 2, 0), n // cells // 2, 1)) / 4
    return g
def make_img(name, arr, data=False):
    h, w = arr.shape[:2]; im = bpy.data.images.new(name, w, h, alpha=False)
    if data: im.colorspace_settings.name = "Non-Color"
    rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = arr; im.pixels[:] = rgba.ravel()
    im.filepath_raw = f"{OUT}/{name}.png"; im.file_format = 'PNG'; im.save(); im.pack(); return im
def fur_maps():
    n = 512; rng = np.random.default_rng(3)
    h = rng.random((n, n))
    for k in range(10): h = (h + np.roll(h, 1, 0)) / 2 if k % 3 else (h + np.roll(h, 1, 1)) / 2  # soft strands running along v
    for k in range(6): h = 0.6 * h + 0.4 * np.roll(h, 2, 0)
    h = (h - h.min()) / (h.max() - h.min())
    clump = tile_noise(n, 16, rng); clump = (clump - clump.min()) / (clump.max() - clump.min())
    hh = 0.65 * h + 0.35 * clump
    alb = 0.80 + 0.20 * hh
    gy, gx = np.gradient(hh * 6.0); nrm = np.stack([0.5 - gx * 0.5, 0.5 - gy * 0.5, np.ones_like(gx)], -1)
    nrm[..., :2] = np.clip(nrm[..., :2], 0, 1)
    return make_img("fur_col", np.repeat(alb[..., None], 3, -1)), make_img("fur_nrm", nrm, True)
def cloth_maps():
    n = 256; y, x = np.mgrid[0:n, 0:n]
    weave = 0.5 + 0.25 * np.sin(x * math.pi / 2) * np.sign(np.sin(y * math.pi / 8)) + 0.25 * np.sin(y * math.pi / 2) * np.sign(np.cos(x * math.pi / 8))
    rng = np.random.default_rng(5); weave = weave * 0.8 + 0.2 * rng.random((n, n))
    alb = 0.86 + 0.14 * weave
    gy, gx = np.gradient(weave * 2.0); nrm = np.stack([np.clip(0.5 - gx * 0.5, 0, 1), np.clip(0.5 - gy * 0.5, 0, 1), np.ones_like(gx)], -1)
    return make_img("cloth_col", np.repeat(alb[..., None], 3, -1)), make_img("cloth_nrm", nrm, True)
FUR_C, FUR_N = fur_maps(); CL_C, CL_N = cloth_maps()

def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)
MATS = {}
def mat(name, col, rough=0.85, metal=0.0, tex=None, alpha=1.0, emis=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; P = nt.nodes["Principled BSDF"]
    P.inputs["Base Color"].default_value = (*hexc(col), 1); P.inputs["Roughness"].default_value = rough; P.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in P.inputs and rough >= 0.99: P.inputs["Specular IOR Level"].default_value = 0.0
    if tex:
        c, nrm = tex
        t1 = nt.nodes.new("ShaderNodeTexImage"); t1.image = c
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        mul.inputs[6].default_value = (*hexc(col), 1); nt.links.new(t1.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], P.inputs["Base Color"])
        t2 = nt.nodes.new("ShaderNodeTexImage"); t2.image = nrm; nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.6
        nt.links.new(t2.outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], P.inputs["Normal"])
    if alpha < 1:
        P.inputs["Alpha"].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m, "blend_method") else None
    MATS[name] = m; return m
FURT = (FUR_C, FUR_N); CLT = (CL_C, CL_N)
for nm_, col, tx in (("fur", "#f2a65a", FURT), ("limb", "#f2a65a", FURT), ("belly", "#fff1dc", FURT), ("mark", "#2c2a32", FURT), ("tip", "#fff1dc", FURT), ("inner", "#ffc2d1", FURT)):
    mat(nm_, col, 0.92, tex=tx)
mat("nose", "#ff8fa3", 0.45); mat("pad", "#ff9fb4", 0.6); mat("eyeink", "#1d1420", 1.0); mat("eyewhite", "#fffdf8", 0.5)
mat("iris", "#2b2233", 1.0); mat("pupil", "#000000", 1.0); mat("mouth", "#4a1a26", 0.8); mat("tongue", "#ff7a93", 0.55)
mat("blush", "#ff8fb0", 0.8); mat("antler", "#d9c4a0", 0.7); mat("teeth", "#ffffff", 0.4)
for nm_, col in (("cloth_top", "#e85d75"), ("cloth_bottom", "#3d5a98"), ("cloth_shoes", "#f4f1ea"), ("cloth_hat", "#e85d75"), ("cloth_neck", "#f3c64a")):
    mat(nm_, col, 0.88, tex=CLT)
mat("sole", "#f4f1ea", 0.7); mat("metal", "#3a3640", 0.35, metal=0.8); mat("lens", "#1a1a22", 0.15); mat("button", "#f4f1ea", 0.4); mat("gold", "#e8b840", 0.3, metal=1.0)

def set_mats(o, names):
    o.data.materials.clear()
    for n in names: o.data.materials.append(MATS[n])
def assign(o, fn, names):
    """fn(face_center, face_normal) -> material name"""
    set_mats(o, names); idx = {n: i for i, n in enumerate(names)}
    for p in o.data.polygons:
        p.material_index = idx[fn(o.matrix_world @ p.center, p.normal)]

# ================= anatomy (Blender: Z up, front +Y, character's left is -X) =================
J = {"Hips": V(0, 0, .64), "Spine": V(0, 0, .72), "Spine01": V(0, 0, .83), "Spine02": V(0, 0, .92), "neck": V(0, 0, 1.0), "Head": V(0, 0, 1.06), "HeadEnd": V(0, 0, 1.55)}
SH, AR, EL, WR = .06, .15, .345, .525
for s, L in ((-1, "Left"), (1, "Right")):
    J[L + "Shoulder"] = V(SH * s, 0, .955); J[L + "Arm"] = V(AR * s, 0, .955); J[L + "ForeArm"] = V(EL * s, 0, .955); J[L + "Hand"] = V(WR * s, 0, .955)
    J[L + "UpLeg"] = V(.095 * s, 0, .6); J[L + "Leg"] = V(.1 * s, .005, .33); J[L + "Foot"] = V(.1 * s, -.01, .075); J[L + "ToeBase"] = V(.1 * s, .085, .028); J[L + "ToeEnd"] = V(.1 * s, .15, .028)
# fingers: (name, base y, base x past wrist, direction, seg length, radius)
FING = [("Index", .027, .085, V(1, .06, 0), .023, .0125), ("Middle", .002, .088, V(1, 0, 0), .025, .013), ("Ring", -.022, .085, V(1, -.06, 0), .022, .0125), ("Pinky", -.043, .077, V(1, -.14, 0), .018, .011),
        ("Thumb", .042, .03, V(.55, .8, -.1), .02, .0135)]
def finger_pts(s, f):
    name, y, x0, d, ln, r = f; d = Vector((d.x * s, d.y, d.z)).normalized()
    b = V((WR + x0) * s, y, .953 - (.004 if name == "Thumb" else 0)); return [b + d * ln * i for i in range(4)], r
BUST = FEM

def build_body():
    mb = mball("Body", 0.007)
    hw = .165 if FEM else .15
    ell(mb, (0, -.005, .655), hw, .115, .105)                      # pelvis
    ell(mb, (0, .005, .78), .125 if FEM else .14, .105, .1)        # waist/belly
    ell(mb, (0, 0, .895), .15 if FEM else .17, .105, .1)           # chest
    if FEM:
        for s in (-1, 1): ell(mb, (.063 * s, .07, .885), .062, .055, .056)   # modest bust
        for s in (-1, 1): ball(mb, (.115 * s, -.01, .63), .085)              # hips
    for s in (-1, 1): ball(mb, (.062 * s, -.06, .615), .075 if FEM else .068)  # seat
    cap(mb, (0, 0, .93), (0, 0, 1.1), .062)
    cap(mb, (-.15, 0, .955), (.15, 0, .955), .056)
    for s in (-1, 1):
        cap(mb, (AR * s, 0, .955), (EL * s, 0, .957), .046)
        cap(mb, (EL * s, 0, .957), (WR * s, 0, .955), .041)
        ell(mb, ((WR + .045) * s, 0, .953), .05, .043, .024)              # palm
        uthick = .078 if FEM else .07
        cap(mb, (.095 * s, 0, .62), (.1 * s, .005, .34), uthick)
        cap(mb, (.1 * s, .005, .34), (.1 * s, -.005, .1), .054)
        ell(mb, (.1 * s, .045, .05), .057, .1, .047)                       # paw foot
        ell(mb, (.1 * s, -.025, .2), .05, .055, .07)                       # calf pad
    fm = mball("Fing", 0.004)
    for s in (-1, 1):
        for f in FING:
            pts, r = finger_pts(s, f)
            for i in range(3): cap(fm, pts[i], pts[i + 1], r * (1 - .08 * i), st=2.2)
            ball(fm, pts[3] - (pts[3] - pts[2]) * .25, r * .95, st=2.2)
    b = to_mesh(bpy.data.objects["Body"], 0.0045, 2)
    f = to_mesh(bpy.data.objects["Fing"], 0.003, 1)
    o = join([b, f], "BodyRaw")
    r = o.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = 0.0045; sel(o); bpy.ops.object.modifier_apply(modifier="vox")
    sm = o.modifiers.new("sm", "SMOOTH"); sm.iterations = 2; sm.factor = 0.5; bpy.ops.object.modifier_apply(modifier="sm")
    return o

# chest fluff: a zigzag tuft at the collar, poking out over any top
def chest_fluff():
    bm = bmesh.new(); pts = []
    n = 7
    for i in range(n + 1):
        t = i / n; x = (t - .5) * .17; tip = (i % 2 == 0)
        pts.append((x, .118 - abs(x) * .35, .93 - (.075 if tip else .03) * (1 - abs(t - .5) * 1.1)))
    top = [bm.verts.new((x, .1 - abs(x) * .5, 1.0)) for x in (-.09, -.045, 0, .045, .09)]
    low = [bm.verts.new(p) for p in pts]
    back = [bm.verts.new((p[0] * .9, p[1] - .02, p[2] + .01)) for p in pts]
    # fan the front face from the top arc to the zigzag
    for i in range(n):
        a = top[min(4, int(i * 5 / n))]; b_ = top[min(4, int((i + 1) * 5 / n))]
        bm.faces.new((a, low[i], low[i + 1])) if a == b_ else bm.faces.new((a, low[i], low[i + 1], b_))
        bm.faces.new((back[i + 1], back[i], low[i], low[i + 1]))
    o = bpy.data.meshes.new("ChestFluff"); bm.to_mesh(o); bm.free(); ob = bpy.data.objects.new("ChestFluff", o); scene.collection.objects.link(ob)
    s = ob.modifiers.new("sub", "SUBSURF"); s.levels = 2; so = ob.modifiers.new("so", "SOLIDIFY"); so.thickness = .01
    sel(ob); bpy.ops.object.modifier_apply(modifier="sub"); bpy.ops.object.modifier_apply(modifier="so")
    smooth_shade(ob); return ob

# ================= rig =================
def build_rig():
    arm = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", arm); scene.collection.objects.link(rig)
    sel(rig); bpy.ops.object.mode_set(mode='EDIT'); eb = arm.edit_bones
    def B(name, h, t, parent=None):
        b = eb.new(name); b.head = h; b.tail = t if (t - h).length > 1e-4 else h + V(0, 0, .03); b.roll = 0
        if parent: b.parent = eb[parent]; b.use_connect = False
        return b
    B("Hips", J["Hips"], J["Spine"]); B("Spine", J["Spine"], J["Spine01"], "Hips"); B("Spine01", J["Spine01"], J["Spine02"], "Spine")
    B("Spine02", J["Spine02"], J["neck"], "Spine01"); B("neck", J["neck"], J["Head"], "Spine02"); B("Head", J["Head"], J["HeadEnd"], "neck")
    for s, L in ((-1, "Left"), (1, "Right")):
        B(L + "Shoulder", J[L + "Shoulder"], J[L + "Arm"], "Spine02"); B(L + "Arm", J[L + "Arm"], J[L + "ForeArm"], L + "Shoulder")
        B(L + "ForeArm", J[L + "ForeArm"], J[L + "Hand"], L + "Arm"); B(L + "Hand", J[L + "Hand"], J[L + "Hand"] + V(.075 * s, 0, 0), L + "ForeArm")
        for f in FING:
            pts, r = finger_pts(s, f); par = L + "Hand"
            for i in range(3): nm = f"{L}Hand{f[0]}{i + 1}"; B(nm, pts[i], pts[i + 1], par); par = nm
        B(L + "UpLeg", J[L + "UpLeg"], J[L + "Leg"], "Hips"); B(L + "Leg", J[L + "Leg"], J[L + "Foot"], L + "UpLeg")
        B(L + "Foot", J[L + "Foot"], J[L + "ToeBase"], L + "Leg"); B(L + "ToeBase", J[L + "ToeBase"], J[L + "ToeEnd"], L + "Foot")
    B("Tail", V(0, -.1, .6), V(0, -.22, .56), "Hips"); B("Tail1", V(0, -.22, .56), V(0, -.33, .64), "Tail")
    B("EarL", V(-.19, -.02, 1.5), V(-.25, -.02, 1.68), "Head"); B("EarR", V(.19, -.02, 1.5), V(.25, -.02, 1.68), "Head")
    bpy.ops.object.mode_set(mode='OBJECT'); return rig

def seg_d(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (p - (a + ab * t)).length
def auto_weights(o, rig, allow=None, power=5, top=3, fingers=True):
    segs = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones}
    o.vertex_groups.clear(); groups = {n: o.vertex_groups.new(name=n) for n in segs}
    names = [n for n in segs if (allow is None or n in allow) and not n.startswith(("Tail", "Ear"))] if allow is None else list(allow)
    for v in o.data.vertices:
        p = o.matrix_world @ v.co; ws = []
        for n in names:
            if p.x < -.03 and n.startswith("Right"): continue
            if p.x > .03 and n.startswith("Left"): continue
            isf = "Hand" in n and n[-1].isdigit()
            if isf and (abs(p.x) < WR + .055 or not fingers): continue
            if not isf and "Hand" in n and abs(p.x) > WR + .075 and fingers: continue
            if p.z > 1.0 and ("Arm" in n or "Leg" in n): continue
            d = seg_d(p, *segs[n]); ws.append((1 / (d + .004) ** power, n))
        ws.sort(reverse=True); ws = ws[:top]; tot = sum(w for w, _ in ws)
        for w, n in ws: groups[n].add([v.index], w / tot, 'REPLACE')
def copy_weights(dst, src, blend_hips=0.0):
    from mathutils.kdtree import KDTree
    kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices: kd.insert(src.matrix_world @ v.co, v.index)
    kd.balance(); sg = {g.index: g.name for g in src.vertex_groups}
    dst.vertex_groups.clear(); dg = {}
    for v in dst.data.vertices:
        acc = {}; hits = kd.find_n(dst.matrix_world @ v.co, 3); tw = 0
        for co, i, d in hits:
            w0 = 1 / (d + .003); tw += w0
            for g in src.data.vertices[i].groups: acc[sg[g.group]] = acc.get(sg[g.group], 0) + g.weight * w0
        acc = {k: x / tw * (1 - blend_hips) for k, x in acc.items()}
        if blend_hips: acc["Hips"] = acc.get("Hips", 0) + blend_hips
        for k, x in acc.items():
            if x < .01: continue
            if k not in dg: dg[k] = dst.vertex_groups.new(name=k)
            dg[k].add([v.index], x, 'REPLACE')

# ================= species =================
# head: snout length, pig, cheek, wide | ears: type, scale | tail type | extras | zones on the head
SP = {
 "cat":      dict(sn=.06, ears=("point", 1.0), tail="cat", ex=[], z=["muzzle"]),
 "dog":      dict(sn=.11, ears=("flop", 1.0), tail="bushy", ex=[], z=["muzzle"]),
 "fox":      dict(sn=.12, ears=("point", 1.3), tail="bushy", ex=[], z=["muzzle", "cheeks"]),
 "bunny":    dict(sn=.05, ears=("long", 1.0), tail="puff", ex=[], z=["muzzle"]),
 "bear":     dict(sn=.09, ears=("round", 1.0), tail="stub", ex=[], z=["muzzle"], wide=1.06),
 "deer":     dict(sn=.09, ears=("leaf", 1.0), tail="flag", ex=["antlers"], z=["muzzle"]),
 "reindeer": dict(sn=.1, ears=("leaf", .9), tail="flag", ex=["bigantlers"], z=["muzzle", "cheeks"]),
 "mouse":    dict(sn=.07, ears=("round", 1.5), tail="thin", ex=[], z=["muzzle"]),
 "wolf":     dict(sn=.12, ears=("point", 1.35), tail="bushy", ex=[], z=["muzzle", "cheeks"]),
 "raccoon":  dict(sn=.1, ears=("point", .8), tail="ringed", ex=[], z=["muzzle", "mask"]),
 "panda":    dict(sn=.07, ears=("round", 1.0), tail="stub", ex=[], z=["patches"], wide=1.06),
 "pig":      dict(sn=.04, ears=("pig", 1.0), tail="curly", ex=[], z=[], pig=True),
 "sheep":    dict(sn=.07, ears=("flop", .7), tail="puff", ex=["wool"], z=["face"]),
 "lion":     dict(sn=.09, ears=("round", .85), tail="lion", ex=["mane"], z=["muzzle"]),
 "tiger":    dict(sn=.08, ears=("round", .95), tail="ringed", ex=[], z=["muzzle", "cheeks", "stripes"]),
 "redpanda": dict(sn=.08, ears=("point", .85), tail="ringed", ex=[], z=["muzzle", "cheeks", "brows"]),
 "skunk":    dict(sn=.09, ears=("round", .9), tail="bushy", ex=[], z=["stripe"]),
 "hamster":  dict(sn=.04, ears=("round", .95), tail="stub", ex=[], z=["muzzle"], cheek=1.6, wide=1.05),
 "otter":    dict(sn=.07, ears=("round", .6), tail="otter", ex=[], z=["muzzle"]),
 "koala":    dict(sn=.04, ears=("round", 1.45), tail="stub", ex=[], z=[], bignose=True, wide=1.04),
}
if ONLY: SP = {k: v for k, v in SP.items() if k in ONLY.split(",")}
EYE_C, EYE_R, EYE_Z = .13, .068, 1.37

def build_head(name, p):
    mb = mball(name, .007); wd = p.get("wide", 1.0)
    ell(mb, (0, .01, 1.32), .31 * wd, .25, .25)
    ell(mb, (0, .07, 1.17), .19 * wd, .16, .09)                                         # jaw/chin
    for s in (-1, 1):                                                                   # cheek tufts flaring out
        ck = p.get("cheek", 1.0)
        ball(mb, (.2 * s * wd, .1, 1.21), .1 * ck)
        cap(mb, (.24 * s * wd, .03, 1.24), (.37 * s * wd, .0, 1.2), .045)
        cap(mb, (.24 * s * wd, .03, 1.2), (.33 * s * wd, .0, 1.1), .036)
        cap(mb, (.25 * s * wd, .0, 1.3), (.36 * s * wd, -.03, 1.3), .036)
    for x, z in ((0, 1.53), (-.06, 1.52), (.06, 1.52)):                                 # forehead tuft
        cap(mb, (x * .7, .06, 1.46), (x, .14, z + .03), .03)
    sn = p["sn"]
    if p.get("pig"):
        cap(mb, (0, .22, 1.24), (0, .3, 1.24), .062, st=3)
    else:
        ell(mb, (0, .19 + sn * .5, 1.235), .1 + sn * .15, .06 + sn * .55, .068)
    o = to_mesh(bpy.data.objects[name], .007, 2); o.name = name
    decimate(o, 4200)
    # nose
    bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    hit = bvh.ray_cast(V(0, 1, 1.275 if not p.get("pig") else 1.24), V(0, -1, 0))[0]
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=1)
    if p.get("pig"): sc = (.04, .012, .03)
    elif p.get("bignose"): sc = (.05, .03, .045)
    else: sc = (.03, .02, .021)
    for v in bm.verts:
        v.co = V(v.co.x * sc[0] * (1 - .35 * max(0, -v.co.z)), v.co.y * sc[1], v.co.z * sc[2])
    bmesh.ops.translate(bm, vec=hit + V(0, -.004, 0), verts=bm.verts)
    nm = bpy.data.meshes.new(name + "n"); bm.to_mesh(nm); bm.free(); no = bpy.data.objects.new(name + "n", nm); scene.collection.objects.link(no)
    for pl in nm.polygons: pl.material_index = 1
    set_mats(o, ["fur"]); set_mats(no, ["fur", "nose"])
    for pl in nm.polygons: pl.material_index = 1
    o = join([o, no], name)
    zones = p["z"]
    def zone(c, n):
        x, y, z = c; ax = abs(x)
        if ax < .02 and y > .2 and abs(z - 1.24) < .045 and False: return "nose"
        if "patches" in zones:
            for s in (-1, 1):
                if ((x - EYE_C * s) / .095) ** 2 + ((z - EYE_Z + .015) / .085) ** 2 < 1 and y > .05: return "mark"
        if "mask" in zones and .03 < ax < .3 and 1.3 < z < 1.43 and y > .06: return "mark"
        if "brows" in zones and any(((x - .12 * s) / .04) ** 2 + ((z - 1.47) / .025) ** 2 < 1 for s in (-1, 1)) and y > 0: return "belly"
        if "stripe" in zones and ax < .035 and z > 1.3 and y > -.15: return "belly"
        if "face" in zones and y > .05 and z < 1.47: return "mark"
        if "muzzle" in zones and y > .14 and z < 1.285 and ax < .14 + p["sn"] * .3: return "belly"
        if "cheeks" in zones and ax > .2 and z < 1.27 and y > -.05: return "belly"
        if "stripes" in zones and (y < .2 or z > 1.45) and ((z * 16 + ax * 4) % 1) < .22 and (ax > .22 or z > 1.45): return "mark"
        return "fur"
    names = ["fur", "nose", "belly", "mark"]
    idx = {n: i for i, n in enumerate(names)}
    keep = [m.name for m in o.data.materials]
    set_mats(o, names)
    for pl in o.data.polygons:
        if keep[pl.material_index] == "nose": pl.material_index = 1
        else: pl.material_index = idx[zone(pl.center, pl.normal)]
    smooth_shade(o); return o

# ---- ears: a cupped leaf with an inner face and base tufts, built for the LEFT side then mirrored ----
EAR = {
 "point": dict(h=.24, w=lambda t: .105 * (1 - t) ** .85, cup=.03, base=V(-.19, -.03, 1.47), tilt=(-6, 22), tuft=True),
 "long":  dict(h=.4, w=lambda t: .068 * math.sin(math.pi * (.08 + .9 * t)) ** .55, cup=.03, base=V(-.13, -.04, 1.5), tilt=(-10, 12), tuft=True),
 "round": dict(h=.13, w=lambda t: .095 * max(0, 1 - t * t) ** .5, cup=.02, base=V(-.21, -.03, 1.5), tilt=(-4, 30), tuft=True),
 "leaf":  dict(h=.21, w=lambda t: .07 * math.sin(math.pi * min(1, t * 1.05)) ** .7, cup=.025, base=V(-.25, -.02, 1.44), tilt=(-10, 62), tuft=True),
 "flop":  dict(h=.24, w=lambda t: .075 * math.sin(math.pi * (.12 + .86 * t)) ** .5, cup=.015, base=V(-.25, 0, 1.47), tilt=(10, 150), tuft=False),
 "pig":   dict(h=.14, w=lambda t: .08 * (1 - t) ** .75, cup=.02, base=V(-.2, .02, 1.48), tilt=(35, 25), tuft=False),
}
def build_ear(kind, side):
    e = EAR[kind]; R, C = 14, 9; bm = bmesh.new(); front, back = [], []
    for i in range(R + 1):
        t = i / R; w = max(.004, e["w"](t)); row_f, row_b = [], []
        for j in range(C + 1):
            u = j / C * 2 - 1; x = u * w; cupd = -e["cup"] * (1 - u * u) * min(1, t * 3)
            th = .012 * (1 - .6 * t) * (1 - u * u) + .002
            row_f.append(bm.verts.new((x, cupd + th * .5, t * e["h"] - .04))); row_b.append(bm.verts.new((x, cupd - th * .5 - .004, t * e["h"] - .04)))
        front.append(row_f); back.append(row_b)
    inner_faces = []
    for i in range(R):
        for j in range(C):
            f = bm.faces.new((front[i][j], front[i][j + 1], front[i + 1][j + 1], front[i + 1][j]))
            if .15 < j / C < .85 and i / R < .82: inner_faces.append(f)
            bm.faces.new((back[i][j + 1], back[i][j], back[i + 1][j], back[i + 1][j + 1]))
    for i in range(R):
        bm.faces.new((front[i][0], front[i + 1][0], back[i + 1][0], back[i][0])); bm.faces.new((front[i + 1][C], front[i][C], back[i][C], back[i + 1][C]))
    for j in range(C): bm.faces.new((front[R][j], front[R][j + 1], back[R][j + 1], back[R][j]))
    for f in inner_faces: f.material_index = 1
    if e["tuft"]:                                                                          # fluffy tufts out of the inner base
        for k, (x, ang) in enumerate(((-.025, -14), (.0, 0), (.025, 14))):
            base = V(x, .012, .0); tip = base + V(math.sin(math.radians(ang)) * .06, .03, .075 + .01 * (k == 1))
            ring = [bm.verts.new(base + V(math.cos(a) * .012, math.sin(a) * .008, 0)) for a in [i * math.tau / 5 for i in range(5)]]
            tv = bm.verts.new(tip)
            for i in range(5): f = bm.faces.new((ring[i], ring[(i + 1) % 5], tv)); f.material_index = 2
    me = bpy.data.meshes.new("ear"); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new("ear", me); scene.collection.objects.link(o)
    set_mats(o, ["fur", "inner", "belly"])
    for pl in me.polygons: pl.material_index = min(pl.material_index, 2)
    s = o.modifiers.new("sub", "SUBSURF"); s.levels = 1; sel(o); bpy.ops.object.modifier_apply(modifier="sub")
    pitch, roll = e["tilt"]
    M = Matrix.Translation(e["base"]) @ Euler((math.radians(pitch), math.radians(-roll), 0), 'XYZ').to_matrix().to_4x4()
    if side > 0: M = Matrix.Scale(-1, 4, V(1, 0, 0)) @ M
    o.data.transform(M)
    if side > 0: o.data.flip_normals()
    smooth_shade(o); rigid(o, "EarL" if side < 0 else "EarR"); return o

# ---- tails: a fluffy sweep along a path ----
def sweep(name, pts, radius, sides=10, segs=24, fluff=.18, mats=None, flat=1.0):
    from mathutils import geometry
    P = [V(*p) for p in pts]
    path = [geometry.interpolate_bezier(P[0], P[0], P[1], P[1], 2)[0]]
    # catmull-rom
    def cr(t):
        n = len(P) - 1; f = min(n - 1e-6, t * n); i = int(f); u = f - i
        p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(n, i + 2)]
        return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
    bm = bmesh.new(); rings = []; prevn = None
    for k in range(segs + 1):
        t = k / segs; c = cr(t); tg = (cr(min(1, t + .01)) - cr(max(0, t - .01))).normalized()
        n = (prevn if prevn else V(1, 0, 0)); n = (n - tg * n.dot(tg)).normalized(); prevn = n; b = tg.cross(n)
        r = radius(t); ring = []
        for j in range(sides):
            a = j / sides * math.tau; fl = 1 + fluff * (math.sin(a * 3 + k * 1.3) * .5 + .5) * (1 if .05 < t < .97 else 0)
            ring.append(bm.verts.new(c + (n * math.cos(a) * flat + b * math.sin(a)) * r * fl))
        rings.append((ring, t))
    for k in range(segs):
        for j in range(sides):
            f = bm.faces.new((rings[k][0][j], rings[k][0][(j + 1) % sides], rings[k + 1][0][(j + 1) % sides], rings[k + 1][0][j]))
            if mats: f.material_index = mats(rings[k][1])
    for ring, t in (rings[0], rings[-1]):
        cv = bm.verts.new(sum((v.co for v in ring), V(0, 0, 0)) / len(ring))
        for j in range(sides):
            f = bm.faces.new((ring[j], ring[(j + 1) % sides], cv) if t > 0 else (ring[(j + 1) % sides], ring[j], cv))
            if mats: f.material_index = mats(t)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    s = o.modifiers.new("sub", "SUBSURF"); s.levels = 1; sel(o); bpy.ops.object.modifier_apply(modifier="sub"); smooth_shade(o)
    return o
TIP = lambda f: (lambda t: 1 if t > f else 0)
TAIL = {
 "cat":    lambda: sweep("t", [(0, -.06, .6), (0, -.22, .56), (0, -.36, .66), (0, -.4, .84), (0, -.33, .96)], lambda t: .034 * (1 - .2 * t) * min(1, (1 - t) * 8 + .3), mats=TIP(.86)),
 "bushy":  lambda: sweep("t", [(0, -.06, .6), (0, -.2, .54), (0, -.35, .58), (0, -.44, .72), (0, -.43, .86)], lambda t: .03 + .085 * math.sin(math.pi * min(1, t * 1.05)) ** .8, fluff=.3, mats=TIP(.76)),
 "thin":   lambda: sweep("t", [(0, -.06, .6), (0, -.25, .5), (0, -.45, .55), (0, -.55, .7), (0, -.5, .8)], lambda t: .016 * (1 - .7 * t), sides=8, fluff=0),
 "stub":   lambda: sweep("t", [(0, -.06, .61), (0, -.12, .63), (0, -.17, .66)], lambda t: .06 * math.sin(math.pi * (.15 + .85 * t)) ** .5, fluff=.25),
 "puff":   lambda: sweep("t", [(0, -.06, .62), (0, -.13, .64), (0, -.2, .66)], lambda t: .08 * math.sin(math.pi * (.1 + .9 * t)) ** .45, fluff=.35, mats=TIP(-1)),
 "flag":   lambda: sweep("t", [(0, -.06, .64), (0, -.15, .7), (0, -.19, .8)], lambda t: .05 * math.sin(math.pi * (.1 + .9 * t)) ** .5, fluff=.2, flat=1.5, mats=TIP(.55)),
 "ringed": lambda: sweep("t", [(0, -.06, .6), (0, -.22, .54), (0, -.37, .6), (0, -.45, .74), (0, -.44, .87)], lambda t: .03 + .06 * math.sin(math.pi * min(1, t * 1.03)) ** .7, fluff=.22, segs=28, mats=lambda t: 2 if (t * 7) % 1 > .55 or t > .9 else 0),
 "curly":  lambda: sweep("t", [(0, -.06, .62), (0, -.13, .6), (.03, -.18, .64), (0, -.2, .69), (-.03, -.16, .7), (0, -.14, .66)], lambda t: .013, sides=8, fluff=0),
 "lion":   lambda: join([sweep("t", [(0, -.06, .6), (0, -.25, .52), (0, -.42, .55), (0, -.5, .68)], lambda t: .02, sides=8, fluff=0),
                         sweep("tt", [(0, -.47, .63), (0, -.5, .69), (0, -.52, .76)], lambda t: .045 * math.sin(math.pi * (.1 + .9 * t)) ** .5, fluff=.35, mats=TIP(-1))], "t"),
 "otter":  lambda: sweep("t", [(0, -.05, .6), (0, -.22, .5), (0, -.38, .42), (0, -.5, .4)], lambda t: .075 * (1 - .8 * t) + .008, fluff=.06, flat=1.3),
}
def build_tail(kind):
    o = TAIL[kind](); o.name = "Tail_" + kind; o.data.name = o.name
    names = ["fur", "tip", "mark"]; cur = [m.name for m in o.data.materials]
    idx = [p.material_index for p in o.data.polygons]; set_mats(o, names)
    for p, i in zip(o.data.polygons, idx): p.material_index = i
    return o

def build_extra(kind):
    if kind in ("antlers", "bigantlers"):
        big = kind == "bigantlers"; parts = []
        for s in (-1, 1):
            k = 1.5 if big else 1.0
            main = [(.1 * s, -.03, 1.52), (.15 * s, -.05, 1.62), (.2 * s * k, -.04, 1.72 + .05 * k), (.24 * s * k, .0, 1.8 + .1 * k)]
            parts.append(sweep("a", main, lambda t: .022 * (1 - .55 * t), sides=7, fluff=0))
            for t0, d in ((.35, (.0, .09, .07)), (.65, (.07 * s, .05, .09))) + (((.5, (-.03 * s, .1, .12)), (.85, (.0, .07, .11))) if big else ()):
                a = V(*main[1]).lerp(V(*main[2]), t0) if t0 < .66 else V(*main[2]).lerp(V(*main[3]), (t0 - .66) * 3)
                parts.append(sweep("b", [tuple(a), tuple(a + V(*d) * .5 + V(0, 0, .02)), tuple(a + V(*d))], lambda t: .014 * (1 - .6 * t), sides=6, fluff=0))
        o = join(parts, "Extra_" + kind); set_mats(o, ["antler"])
    elif kind == "mane":
        mb = mball("Mane", .01)
        for i in range(18):
            a = i / 18 * math.tau; x, z = math.cos(a) * .36, 1.3 + math.sin(a) * .33
            cap(mb, (x * .8, -.08, 1.3 + (z - 1.3) * .8), (x * 1.15, -.04, 1.3 + (z - 1.3) * 1.15), .07)
        ell(mb, (0, -.12, 1.28), .3, .12, .3)
        o = to_mesh(bpy.data.objects["Mane"], .01, 2); decimate(o, 1600); o.name = "Extra_mane"; set_mats(o, ["tip"])
    elif kind == "wool":
        mb = mball("Wool", .008)
        for i in range(9):
            a = i / 9 * math.tau; ball(mb, (math.cos(a) * .12, .02 + math.sin(a) * .08, 1.56 + .02 * math.sin(a * 2)), .065)
        ball(mb, (0, .03, 1.6), .07)
        o = to_mesh(bpy.data.objects["Wool"], .008, 2); decimate(o, 1200); o.name = "Extra_wool"; set_mats(o, ["belly"])
    smooth_shade(o); rigid(o, "Head"); return o

# ================= face: projected layers + shape keys =================
def disc2d(rx, rz, S=22, R=3):
    pts = [(0.0, 0.0)]; faces = []
    for r in range(1, R + 1):
        for j in range(S): a = j / S * math.tau; pts.append((math.cos(a) * rx * r / R, math.sin(a) * rz * r / R))
    for j in range(S): faces.append((0, 1 + j, 1 + (j + 1) % S))
    for r in range(1, R):
        b0, b1 = 1 + (r - 1) * S, 1 + r * S
        for j in range(S): faces.append((b0 + j, b1 + j, b1 + (j + 1) % S, b0 + (j + 1) % S))
    return pts, faces
def strip2d(path, w):
    pts, faces = [], []
    for i, (x, z) in enumerate(path):
        a = path[max(0, i - 1)]; b = path[min(len(path) - 1, i + 1)]; tx, tz = b[0] - a[0], b[1] - a[1]; L = math.hypot(tx, tz) or 1
        nx, nz = -tz / L, tx / L; ww = w * (0.55 + 0.45 * math.sin(math.pi * i / (len(path) - 1)))
        pts += [(x + nx * ww / 2, z + nz * ww / 2), (x - nx * ww / 2, z - nz * ww / 2)]
    for i in range(len(path) - 1): faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    return pts, faces
def eye_mod(key, x, z, xo, rx):
    if key == "Blink": return x, -.014 + z * .05
    if key == "Happy": u = max(-1, min(1, x / rx)); return x, .022 * (1 - u * u) - .008 + z * .1
    if key == "Wide": return x * 1.16, z * 1.16
    if key == "Angry": return x, z - max(0, z) * .55 * (.5 - .5 * xo / rx)
    if key == "Sad": return x, z - max(0, z) * .55 * (.5 + .5 * xo / rx)
    if key == "Half": return x, z - max(0, z) * .55
    if key == "Tall": return x * .9, z * 1.14
    if key == "Broad": return x * 1.14, z * .9
    return x, z
EYE_KEYS = ["Blink", "Happy", "Wide", "Angry", "Sad", "Half", "Tall", "Broad"]
MOUTH_KEYS = ["Smile", "Frown", "Open", "O", "Blep", "Blush"]
def build_face(head, p):
    bvh = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())
    def proj(x, z, off):
        h = bvh.ray_cast(V(x, 1.0, z), V(0, -1, 0))
        return (h[0] + h[1] * off) if h[0] else V(x, .2, z)
    zm = 1.2 - p["sn"] * .12
    layers = []   # (name, mat, pts2d, faces, fn(key, x, z)->(x, z, off) )
    for s in (-1, 1):
        cx, cz = EYE_C * s * p.get("wide", 1.0), EYE_Z
        for nm_, mt, rx, rz, off in (("white", "eyewhite", .062, .075, .0015), ("iris", "iris", .047, .06, .0028), ("pupil", "pupil", .039, .051, .004)):
            pts, fc = disc2d(rx, rz)
            pts = [(cx + x + (-.004 * s if mt != "eyewhite" else 0), cz + z - (.004 if mt != "eyewhite" else 0)) for x, z in pts]
            def fn(key, X, Z, cx=cx, cz=cz, off=off, s=s, rxx=.062):
                x, z = X - cx, Z - cz; x, z = eye_mod(key, x, z, x * s, rxx); return cx + x, cz + z, off
            layers.append(("eye", mt, pts, fc, fn))
        arc = [(cx + math.cos(a) * .066, cz + math.sin(a) * .079) for a in [math.radians(15 + 150 * i / 14) for i in range(15)]]
        if s < 0: arc = [(2 * cx - x, z) for x, z in arc]
        if FEM:   # lashes: flicks off the outer corner
            o = arc[0] if s > 0 else arc[0]
            arc = [(o[0] + .03 * s * (1 if s > 0 else -1) * 0 + .028 * s, o[1] + .012)] + arc
        pts, fc = strip2d(arc, .013)
        def fl(key, X, Z, cx=cx, cz=cz, s=s):
            x, z = X - cx, Z - cz; x, z = eye_mod(key, x, z, x * s, .062); return cx + x, cz + z, .005
        layers.append(("lash", "eyeink", pts, fc, fl))
    # mouth: philtrum + omega
    w = .036
    path = [(-w + 2 * w * i / 20, 0) for i in range(21)]
    path = [(x, zm - .012 * abs(math.sin(math.pi * x / w))) for x, _ in path]
    pts, fc = strip2d(path, .008)
    def fm(key, X, Z):
        u = X / w
        if key == "Smile": return X * 1.08, Z + .014 * u * u - .002, .004
        if key == "Frown": return X, Z - .018 * u * u + .006, .004
        if key == "O": return X * .5, Z + .004, .004
        return X, Z, .004
    layers.append(("mouth", "eyeink", pts, fc, fm))
    pts, fc = strip2d([(0, zm - .002), (0, zm + .018), (0, zm + .03)], .007)
    layers.append(("mouth", "eyeink", pts, fc, lambda k, X, Z: (X, Z, .004)))
    for nm_, mt, cxz, rr, open_, blep in (("in", "mouth", (0, zm - .02), (.03, .022), True, False), ("tongue", "tongue", (0, zm - .03), (.018, .012), True, True)):
        pts, fc = disc2d(*rr)
        pts = [(cxz[0] + x, cxz[1] + z) for x, z in pts]
        def fo(key, X, Z, c=cxz, nm_=nm_, rr=rr):
            x, z = X - c[0], Z - c[1]
            if key == "Open": return c[0] + x, c[1] + z, .002 if nm_ == "in" else .003
            if key == "O": return c[0] + x * .55, c[1] + .005 + z * 1.1, .002 if nm_ == "in" else -.01
            if key == "Blep" and nm_ == "tongue": return c[0] + .008 + x * .9, c[1] + .006 + z * 1.4, .0042
            return c[0] + x * .3, c[1] + z * .2, -.012
        layers.append(("mouth", mt, pts, fc, fo))
    for s in (-1, 1):
        c = (.19 * s * p.get("wide", 1.0), 1.275); pts, fc = disc2d(.042, .022)
        pts = [(c[0] + x, c[1] + z) for x, z in pts]
        def fb(key, X, Z, c=c):
            x, z = X - c[0], Z - c[1]
            if key == "Blush": return X, Z, .002
            return c[0] + x * .3, c[1] + z * .3, -.012
        layers.append(("blush", "blush", pts, fc, fb))
    # build
    names = ["eyewhite", "iris", "pupil", "eyeink", "mouth", "tongue", "blush"]
    verts, faces, fmat, base2d = [], [], [], []
    for (_, mt, pts, fc, fn) in layers:
        o0 = len(verts)
        for (x, z) in pts:
            X, Z, off = fn("Basis", x, z); verts.append(proj(X, Z, off)); base2d.append((x, z, fn))
        for f in fc: faces.append(tuple(o0 + i for i in f)); fmat.append(names.index(mt))
    o = mesh_from("Face", verts, faces); set_mats(o, names)
    for pl, mi in zip(o.data.polygons, fmat): pl.material_index = mi
    bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
    bmesh.ops.reverse_faces(bm, faces=[f for f in bm.faces if f.normal.y < 0]); bm.to_mesh(o.data); bm.free()
    o.shape_key_add(name="Basis")
    for key in EYE_KEYS + MOUTH_KEYS:
        sk = o.shape_key_add(name=key)
        for i, (x, z, fn) in enumerate(base2d):
            X, Z, off = fn(key, x, z); sk.data[i].co = proj(X, Z, off)
    smooth_shade(o)
    # outward normals
    return o

# ================= garments: shells grown off the body, plus lathed skirts and rigid accessories =================
def is_arm(p): return abs(p.x) > .17 and p.z > .86
def shell(body, name, keep, off, mat_, thick=.006, extra_mats=None, matfn=None):
    o = body.copy(); o.data = body.data.copy(); o.name = name; o.data.name = name; scene.collection.objects.link(o)
    o.shape_key_clear() if o.data.shape_keys else None
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context='VERTS')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * off(v.co) if callable(off) else v.normal * off
    bm.to_mesh(o.data); bm.free()
    so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = thick; so.offset = -1; so.use_rim = True
    sm = o.modifiers.new("cs", "CORRECTIVE_SMOOTH"); sm.iterations = 4; sm.factor = .5; sm.use_only_smooth = True
    sel(o); bpy.ops.object.modifier_apply(modifier="so"); bpy.ops.object.modifier_apply(modifier="cs")
    set_mats(o, [mat_] + (extra_mats or []))
    if matfn:
        for pl in o.data.polygons: pl.material_index = matfn(pl.center)
    smooth_shade(o); return o
def lathe(name, prof, mat_, segs=32, cx=0, cy=0, scy=1.0, ruffle=0.0):
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        ring = []
        for j in range(segs):
            a = j / segs * math.tau; rr = r * (1 + ruffle * math.sin(a * 9) * (1 if z < prof[0][1] - .03 else 0))
            ring.append(bm.verts.new((cx + math.cos(a) * rr, cy + math.sin(a) * rr * scy, z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for j in range(segs): bm.faces.new((rings[k][j], rings[k][(j + 1) % segs], rings[k + 1][(j + 1) % segs], rings[k + 1][j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    me.update(); 
    if sum(p.normal.dot(V(p.center.x - cx, p.center.y - cy, 0)) for p in me.polygons) < 0: me.flip_normals()
    so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = .006; sel(o); bpy.ops.object.modifier_apply(modifier="so")
    set_mats(o, [mat_]); smooth_shade(o); return o

def tops(body):
    out = {}
    neck_ok = lambda p: p.z < .985 - (.03 if p.y > .03 and abs(p.x) < .07 else 0)
    def top(name, sleeve, zlo, off, extra=None):
        keep = lambda p: neck_ok(p) and p.z > zlo and ((abs(p.x) < .2 and not is_arm(p)) or (is_arm(p) and abs(p.x) < sleeve))
        return shell(body, "Top_" + name, keep, off, "cloth_top", extra_mats=["button", "cloth_neck"], matfn=extra)
    out["tee"] = top("tee", .27, .6, .008)
    out["tank"] = shell(body, "Top_tank", lambda p: p.z < .97 - (.05 if p.y > .02 and abs(p.x) < .08 else 0) and p.z > .6 and abs(p.x) < (.12 if p.z > .9 else .2) and not is_arm(p), .008, "cloth_top")
    out["longsleeve"] = top("longsleeve", WR - .01, .6, .008)
    out["sweater"] = top("sweater", WR - .005, .57, .014, lambda c: 0)
    out["hoodie"] = top("hoodie", WR - .005, .56, .016, lambda c: 2 if (abs(c.x) < .05 and .7 < c.z < .8 and c.y > .05) else 0)
    hood = lathe("hood", [(.11, 1.0), (.13, 1.04), (.12, 1.08), (.08, 1.1)], "cloth_top", cy=-.035, scy=1.1)
    out["hoodie"] = join([out["hoodie"], hood], "Top_hoodie")
    out["jacket"] = top("jacket", WR - .002, .55, .022, lambda c: 1 if (abs(c.x) < .012 and c.y > .05 and c.z < .95) else (2 if c.z > .94 and abs(c.x) < .14 else 0))
    out["pajamas"] = top("pajamas", WR - .01, .58, .012, lambda c: 1 if (abs(c.x) < .01 and c.y > .05 and (c.z * 30) % 1 < .35) else 0)
    out["apron"] = shell(body, "Top_apron", lambda p: p.y > .03 and abs(p.x) < .13 and .45 < p.z < .97, .03, "cloth_top")
    hw = .175 if FEM else .16
    dtop = top("dress", .25, .62, .009)
    skirt = lathe("dskirt", [(hw * .95, .68), (hw * 1.05, .6), (.26, .45), (.3, .33)], "cloth_top", scy=.85, ruffle=.03)
    out["dress"] = join([dtop, skirt], "Top_dress")
    return out
def bottoms(body):
    out = {}
    def legs(name, zlo, off, z_hi=.7):
        return shell(body, "Bot_" + name, lambda p: zlo < p.z < z_hi and abs(p.x) < .2 and not is_arm(p), off, "cloth_bottom", extra_mats=["button"])
    out["pants"] = legs("pants", .11, .01)
    out["shorts"] = legs("shorts", .45, .012)
    out["pjpants"] = legs("pjpants", .1, .016)
    ov = shell(body, "Bot_overalls", lambda p: (.11 < p.z < .7 and abs(p.x) < .2 and not is_arm(p)) or (.68 <= p.z < .9 and p.y > .02 and abs(p.x) < .1) or (.68 <= p.z < .99 and abs(abs(p.x) - .07) < .018 and not is_arm(p)), .014, "cloth_bottom", extra_mats=["button"],
               matfn=lambda c: 1 if (abs(abs(c.x) - .07) < .015 and abs(c.z - .89) < .015 and c.y > .05) else 0)
    out["overalls"] = ov
    hw = .175 if FEM else .16
    band = shell(body, "band", lambda p: .62 < p.z < .71 and abs(p.x) < .2, .01, "cloth_bottom")
    out["skirt"] = join([band, lathe("sk", [(hw * .98, .68), (hw * 1.1, .6), (.27, .45), (.29, .42)], "cloth_bottom", scy=.85, ruffle=.04)], "Bot_skirt")
    band = shell(body, "band2", lambda p: .62 < p.z < .71 and abs(p.x) < .2, .01, "cloth_bottom")
    out["longskirt"] = join([band, lathe("lsk", [(hw * .98, .68), (hw * 1.08, .58), (.25, .35), (.29, .14), (.3, .12)], "cloth_bottom", scy=.85, ruffle=.02)], "Bot_longskirt")
    return out
def shoes(body):
    out = {}
    out["sneakers"] = shell(body, "Shoes_sneakers", lambda p: p.z < .11 and abs(p.x) > .03, lambda c: .012 if c.z > .025 else .016, "cloth_shoes", thick=.008, extra_mats=["sole"], matfn=lambda c: 1 if c.z < .03 else 0)
    out["boots"] = shell(body, "Shoes_boots", lambda p: p.z < .24 and abs(p.x) > .03, .016, "cloth_shoes", thick=.01, extra_mats=["sole"], matfn=lambda c: 1 if c.z < .03 else 0)
    out["slippers"] = shell(body, "Shoes_slippers", lambda p: p.z < .085 and abs(p.x) > .03, .022, "cloth_shoes", thick=.012)
    return out
def rigid_obj(o, bone): smooth_shade(o); rigid(o, bone); return o
def hats():
    out = {}; top = 1.55
    cap_ = lathe("c", [(.29, 1.42), (.28, 1.5), (.22, 1.6), (.1, 1.645), (.0, 1.65)], "cloth_hat")
    brim = lathe("b", [(.0, 1.43), (.16, 1.43)], "cloth_hat", segs=24); brim.data.transform(Matrix.Translation(V(0, .2, 0)) @ Matrix.Diagonal((1.2, 1, 1, 1)))
    out["cap"] = join([cap_, brim], "Hat_cap")
    out["beanie"] = lathe("Hat_beanie", [(.305, 1.4), (.31, 1.44), (.295, 1.5), (.24, 1.6), (.12, 1.66), (.0, 1.675)], "cloth_hat")
    pom = bpy.data.meshes.new("pom"); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.045); bmesh.ops.translate(bm, vec=V(0, 0, 1.7), verts=bm.verts); bm.to_mesh(pom); bm.free()
    po = bpy.data.objects.new("pom", pom); scene.collection.objects.link(po); set_mats(po, ["cloth_hat"]); smooth_shade(po)
    out["beanie"] = join([out["beanie"], po], "Hat_beanie")
    th = lathe("Hat_tophat", [(.0, 1.58), (.28, 1.58), (.29, 1.6), (.16, 1.6), (.15, 1.62), (.16, 1.86), (.0, 1.86)], "cloth_hat")
    out["tophat"] = th
    band = lathe("hb", [(.21, 1.55), (.22, 1.6), (.2, 1.68), (.12, 1.72)], "metal", segs=24, scy=.35)
    cups = []
    for s in (-1, 1):
        cu = lathe("cup", [(.0, -.03), (.07, -.03), (.075, .0), (.06, .03), (.0, .035)], "cloth_hat", segs=20)
        cu.data.transform(Matrix.Translation(V(.32 * s, 0, 1.32)) @ Matrix.Rotation(math.radians(90 * s), 4, 'Y')); cups.append(cu)
    band.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z')); band.data.transform(Matrix.Diagonal((1.45, 1, 1, 1)) @ Matrix.Translation(V(0, 0, -.25)) @ Matrix.Diagonal((1, 1, 1.2, 1)))
    out["headphones"] = join([band] + cups, "Hat_headphones")
    def bow(name, at, sz):
        bm = bmesh.new(); parts = []
        for s in (-1, 1):
            m = bpy.data.meshes.new("l"); b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=12, v_segments=8, radius=1)
            for v in b2.verts: v.co = V(v.co.x * sz * (1.1 - .5 * (v.co.x * s < 0)) + s * sz * .9, v.co.y * sz * .35, v.co.z * sz * (.75 - .25 * (v.co.x * s < 0)))
            b2.to_mesh(m); b2.free(); ob = bpy.data.objects.new("l", m); scene.collection.objects.link(ob); parts.append(ob)
        m = bpy.data.meshes.new("k"); b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=10, v_segments=6, radius=sz * .38); b2.to_mesh(m); b2.free(); ob = bpy.data.objects.new("k", m); scene.collection.objects.link(ob); parts.append(ob)
        o = join(parts, name); set_mats(o, ["cloth_hat"]); o.data.transform(at); smooth_shade(o); return o
    out["bow"] = bow("Hat_bow", Matrix.Translation(V(-.17, .05, 1.58)) @ Matrix.Rotation(math.radians(-25), 4, 'Y'), .065)
    pet = []
    for i in range(5):
        a = i / 5 * math.tau; m = bpy.data.meshes.new("p"); b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=10, v_segments=6, radius=1)
        for v in b2.verts: v.co = V(v.co.x * .03 + math.cos(a) * .03, v.co.y * .008, v.co.z * .022 + math.sin(a) * .03)
        b2.to_mesh(m); b2.free(); ob = bpy.data.objects.new("p", m); scene.collection.objects.link(ob); set_mats(ob, ["cloth_hat"]); pet.append(ob)
    m = bpy.data.meshes.new("c"); b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=10, v_segments=6, radius=.018); bmesh.ops.translate(b2, vec=V(0, .008, 0), verts=b2.verts); b2.to_mesh(m); b2.free()
    ob = bpy.data.objects.new("c", m); scene.collection.objects.link(ob); set_mats(ob, ["gold"]); pet.append(ob)
    fl = join(pet, "Hat_flower"); fl.data.transform(Matrix.Translation(V(.2, .12, 1.52)) @ Matrix.Rotation(math.radians(-30), 4, 'Z')); smooth_shade(fl); out["flower"] = fl
    out["partyhat"] = lathe("Hat_partyhat", [(.0, 1.5), (.14, 1.5), (.0, 1.82)], "cloth_hat", segs=24)
    out["partyhat"].data.transform(Matrix.Translation(V(.0, 0, 1.5)) @ Matrix.Rotation(math.radians(-12), 4, 'Y') @ Matrix.Translation(V(0, 0, -1.5)))
    cr = lathe("Hat_crown", [(.27, 1.5), (.275, 1.62)], "gold", segs=40)
    bm = bmesh.new(); bm.from_mesh(cr.data)
    for v in bm.verts:
        if v.co.z > 1.56: a = math.atan2(v.co.y, v.co.x); v.co.z = 1.56 + .07 * abs(math.cos(a * 4)) ** 3
    bm.to_mesh(cr.data); bm.free(); out["crown"] = cr
    for o in out.values(): rigid_obj(o, "Head")
    return {k: v for k, v in out.items()}
def eyewear():
    out = {}
    def frame(name, ring_mat, lens):
        parts = []
        for s in (-1, 1):
            t = lathe("r", [(.07, -.006), (.078, -.006), (.078, .006), (.07, .006)], ring_mat, segs=24)
            t.data.transform(Matrix.Translation(V(EYE_C * s, .31, EYE_Z)) @ Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Diagonal((1, 1.12, 1, 1)))
            parts.append(t)
            if lens:
                l = lathe("l", [(.0, 0), (.072, 0)], "lens", segs=24); l.data.transform(Matrix.Translation(V(EYE_C * s, .312, EYE_Z)) @ Matrix.Rotation(math.radians(-90), 4, 'X') @ Matrix.Diagonal((1, 1.12, 1, 1))); parts.append(l)
            arm_ = sweep("a", [(.205 * s, .29, EYE_Z), (.29 * s, .12, EYE_Z + .01), (.3 * s, -.05, EYE_Z)], lambda t: .007, sides=6, fluff=0); set_mats(arm_, [ring_mat]); parts.append(arm_)
        br = sweep("b", [(-.06, .31, EYE_Z + .01), (0, .33, EYE_Z + .02), (.06, .31, EYE_Z + .01)], lambda t: .007, sides=6, fluff=0); set_mats(br, [ring_mat]); parts.append(br)
        return join(parts, name)
    out["glasses"] = frame("Eyew_glasses", "metal", False); out["shades"] = frame("Eyew_shades", "metal", True)
    for o in out.values(): rigid_obj(o, "Head")
    return out
def necks():
    out = {}
    sc = lathe("Neck_scarf", [(.085, .99), (.095, 1.0), (.1, 1.04), (.09, 1.07)], "cloth_neck", segs=28, cy=.005)
    tail_ = sweep("st", [(.05, .1, 1.0), (.07, .14, .92), (.06, .15, .82)], lambda t: .025, sides=8, fluff=0, flat=1.8); set_mats(tail_, ["cloth_neck"])
    out["scarf"] = join([sc, tail_], "Neck_scarf"); rigid(out["scarf"], "Spine02")
    bt = []
    for s in (-1, 1):
        w = sweep("w", [(0, .1, 1.0), (.03 * s, .1, 1.01), (.055 * s, .095, 1.0)], lambda t: .01 + .02 * t, sides=8, fluff=0, flat=.5); set_mats(w, ["cloth_neck"]); bt.append(w)
    co = lathe("co", [(.07, .995), (.075, 1.01)], "cloth_neck", segs=24, cy=.01); bt.append(co)
    out["bowtie"] = join(bt, "Neck_bowtie"); rigid(out["bowtie"], "Spine02")
    co = lathe("co", [(.072, .99), (.078, .995), (.078, 1.02), (.072, 1.025)], "cloth_neck", segs=24, cy=.01)
    m = bpy.data.meshes.new("bell"); b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=14, v_segments=8, radius=.024); bmesh.ops.translate(b2, vec=V(0, .1, .97), verts=b2.verts); b2.to_mesh(m); b2.free()
    ob = bpy.data.objects.new("bell", m); scene.collection.objects.link(ob); set_mats(ob, ["gold"])
    out["bell"] = join([co, ob], "Neck_bell"); rigid(out["bell"], "Spine02")
    R, C = 10, 12; vs, fs = [], []
    for i in range(R + 1):
        t = i / R
        for j in range(C + 1):
            u = j / C * 2 - 1; w = .14 + .14 * t; vs.append(V(u * w, -.12 - .04 * t - .03 * (1 - u * u) * t, 1.0 - .72 * t))
    for i in range(R):
        for j in range(C): fs.append((i * (C + 1) + j, i * (C + 1) + j + 1, (i + 1) * (C + 1) + j + 1, (i + 1) * (C + 1) + j))
    cp = mesh_from("cape", vs, fs); so = cp.modifiers.new("s", "SOLIDIFY"); so.thickness = .006; sub = cp.modifiers.new("u", "SUBSURF"); sub.levels = 1
    sel(cp); bpy.ops.object.modifier_apply(modifier="s"); bpy.ops.object.modifier_apply(modifier="u"); set_mats(cp, ["cloth_neck"])
    cl = lathe("cl", [(.078, .985), (.082, 1.0)], "cloth_neck", segs=24, cy=.0)
    out["cape"] = join([cp, cl], "Neck_cape"); smooth_shade(out["cape"])
    return out

# ================= assemble =================
import time; T0 = time.time()
def log(*a): print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)
body = build_body(); decimate(body, 9000); body.name = body.data.name = "Body"
def body_zone(c, n):
    ax = abs(c.x)
    if c.z < .012 or (ax > WR + .06 and n.z < -.55) or (WR + .015 < ax < WR + .075 and n.z < -.7 and abs(c.y) < .03): return "pad"
    if c.y > .04 and .64 < c.z < .97 and ax < .1 - (.02 if c.z < .72 else 0) and n.y > .25: return "belly"
    return "fur"
assign(body, body_zone, ["fur", "belly", "pad"]); smooth_shade(body)
rig = build_rig(); auto_weights(body, rig); log("body", tris(body))
garments = {}
for grp, fn in (("tops", tops), ("bottoms", bottoms), ("shoes", shoes)):
    for k, g in fn(body).items():
        decimate(g, 2600); copy_weights(g, body, blend_hips=.35 if k in ("skirt", "longskirt", "dress") else 0.0)
        if k in ("skirt", "longskirt", "dress"):   # skirts hang from the hips more than they follow the knees
            pass
        garments[g.name] = g
for fn in (hats, eyewear, necks):
    for k, g in fn().items():
        decimate(g, 2400)
        if k == "cape": rigid(g, "Spine01")
        garments[g.name] = g
log("garments", {k: tris(v) for k, v in garments.items()})
fl = chest_fluff(); set_mats(fl, ["belly"]); rigid(fl, "Spine02"); fl.name = fl.data.name = "ChestFluff"
species = {}
for sp, p in SP.items():
    head = build_head("Head_" + sp, p)
    face = build_face(head, p); rigid(face, "Head")
    rigid(head, "Head")
    kind, esc = p["ears"]; ears = []
    for side, bone in ((-1, "EarL"), (1, "EarR")):
        e = build_ear(kind, side); rigid(e, bone); ears.append(e)
    tl = build_tail(p["tail"]); decimate(tl, 1200)
    # tail weights: blend Tail -> Tail1 along its length
    tl.vertex_groups.clear(); g0 = tl.vertex_groups.new(name="Tail"); g1 = tl.vertex_groups.new(name="Tail1"); g2 = tl.vertex_groups.new(name="Hips")
    for v in tl.data.vertices:
        t = max(0, min(1, (-v.co.y - .06) / .3)); g2.add([v.index], max(0, 1 - t * 4) * .5, 'REPLACE'); g0.add([v.index], 1 - t, 'REPLACE'); g1.add([v.index], t, 'REPLACE')
    exs = [build_extra(x) for x in p["ex"]]
    o = join([face, head] + ears + exs + [tl], "Species_" + sp)
    for m in ("fur", "belly", "mark", "tip", "inner", "nose", "antler", "pad"):
        pass
    species[sp] = o; log("species", sp, tris(o))
# parent everything to the rig
for o in [body, fl] + list(garments.values()) + list(species.values()):
    o.parent = rig; md = o.modifiers.new("Armature", "ARMATURE"); md.object = rig
    uv_unwrap(o, 2.0) if not o.data.uv_layers else None
log("tris body", tris(body) + tris(fl))

# ---- proof: a front/3-4/back turnaround of two dressed critters ----
def show(sp, worn):
    for o in [body, fl] + list(garments.values()) + list(species.values()):
        vis = o in (body, fl) or o.name == "Species_" + sp or o.name in worn
        o.hide_render = not vis
if STAGE in ("all", "proof"):
    scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = scene.render.resolution_y = 656
    scene.world = bpy.data.worlds.new("w"); scene.world.use_nodes = True; scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.55, .5, .42, 1); scene.world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 50
    for nm_, loc, en in (("k", (1.5, 3, 3), 600), ("f", (-2, 2, 2), 250), ("b", (0, -3, 2.5), 300)):
        L = bpy.data.objects.new(nm_, bpy.data.lights.new(nm_, "AREA")); L.data.energy = en; L.data.size = 2; L.location = loc; scene.collection.objects.link(L)
        L.rotation_euler = (V(0, 0, .9) - V(*loc)).to_track_quat('-Z', 'Y').to_euler()
    looks = [(list(SP)[0], ["Top_tee", "Bot_skirt" if FEM else "Bot_shorts", "Shoes_sneakers", "Hat_bow" if FEM else "Neck_scarf"]),
             (list(SP)[min(1, len(SP) - 1)], ["Top_hoodie", "Bot_pants", "Shoes_boots"])]
    shots = []
    for li, (sp, worn) in enumerate(looks):
        show(sp, worn)
        for vi, (ang, dist) in enumerate(((0, 3.4), (35, 3.4), (180, 3.4))):
            a = math.radians(ang); cam.location = (math.sin(a) * dist, math.cos(a) * dist, 1.0)
            cam.rotation_euler = (V(0, 0, .88) - cam.location).to_track_quat('-Z', 'Y').to_euler()
            f = f"{PROOF}/p{li}{vi}.png"; scene.render.filepath = f; bpy.ops.render.render(write_still=True); shots.append(f)
    face_cam = (V(0, 1.3, 1.33), V(0, 0, 1.3))
    cam.location = face_cam[0]; cam.rotation_euler = (face_cam[1] - face_cam[0]).to_track_quat('-Z', 'Y').to_euler()
    for li, (sp, worn) in enumerate(looks):
        show(sp, worn); f = f"{PROOF}/face{li}.png"; scene.render.filepath = f; bpy.ops.render.render(write_still=True)
    log("proofs")
if STAGE in ("all", "export"):
    for o in scene.objects: o.hide_render = False
    for o in list(scene.objects):
        if o.type not in ("MESH", "ARMATURE"): bpy.data.objects.remove(o)
    sel(*([rig] + [o for o in scene.objects if o.type == "MESH"]), active=rig)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/critter-{SEX}.glb", export_apply=False, use_selection=True, export_morph=True, export_skins=True,
                              export_animations=False, export_yup=True)
    log("export", os.path.getsize(f"{OUT}/critter-{SEX}.glb") // 1024, "KB")
