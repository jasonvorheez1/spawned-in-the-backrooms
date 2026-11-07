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
