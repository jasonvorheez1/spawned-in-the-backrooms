# Cute critters (Dandy's World OC bases x Sanrio): a big round head with huge oval eyes and matte black pupils, a little bean body,
# noodle arms with mitten hands, round bean feet; girls get a soft waist, hips and a modest bust. Clean simple shapes, no snouts.
# Same contract as art/critter/build.py so scripts/lib/critter-model.js wears it unchanged:
#   critter-<m|f>.glb   rig + Body + every garment as its own skinned mesh (Top_*, Bot_*, Shoes_*, Hat_*, Eyew_*, Neck_*)
#   critter-sp-<sp>.glb rig + one head mesh (head, face, ears, tail, extras) with shape keys
#                       Blink Happy Sad Angry Wide Half Smile Open Frown O Blep Blush
# Materials are named slots the game tints: fur limb belly tip mark inner nose antler pad | eyewhite eyeink pupil mouth tongue blush |
# cloth_top cloth_bottom cloth_shoes cloth_hat cloth_neck button metal lens gold sole
# Blender: Z up, front +Y (glTF -Z), T-pose, the character's left is -X.
# Run: blender -b --factory-startup --python art/critter-cute/build.py   (env STAGE=all|proof|export, ONLY=cat,dog, SEX=f|m|both)
import bpy, bmesh, math, os, random, time
from mathutils import Vector, Euler, Quaternion
T0 = time.time()
def log(*a): print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, "out"); PROOF = os.path.join(D, "proof"); os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
STAGE = os.environ.get("STAGE", "all"); ONLY = os.environ.get("ONLY", ""); SEXES = {"f": ["f"], "m": ["m"]}.get(os.environ.get("SEX", "both"), ["f", "m"])
V = lambda *a: Vector(a)
K = 0.572

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------- helpers ----------------
def scene(): return bpy.context.scene
def sel(*objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]
def mball(name, res):
    mb = bpy.data.metaballs.new(name); o = bpy.data.objects.new(name, mb); scene().collection.objects.link(o)
    mb.resolution = mb.render_resolution = res; mb.threshold = 0.6
    return mb, o
def ball(mb, c, r, st=2.0):
    e = mb.elements.new(type='BALL'); e.co = Vector(c); e.radius = r / K; e.stiffness = st; return e
def ell(mb, c, ax, ay, az, rot=None, st=2.0):
    e = mb.elements.new(type='ELLIPSOID'); e.co = Vector(c); e.radius = 1.0; e.size_x, e.size_y, e.size_z = ax / K, ay / K, az / K
    if rot is not None: e.rotation = Euler(rot).to_quaternion()
    e.stiffness = st; return e
def cap(mb, a, b, r, st=2.0):
    a, b = Vector(a), Vector(b); d = b - a
    e = mb.elements.new(type='CAPSULE'); e.co = (a + b) / 2; e.radius = r / K; e.size_x = max(1e-4, d.length / 2)
    e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized()); e.stiffness = st; return e
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def mb_mesh(obj, voxel, smooth=2, target=None, name=None):
    sel(obj); bpy.ops.object.convert(target='MESH'); m = bpy.context.active_object
    r = m.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = voxel; bpy.ops.object.modifier_apply(modifier="vox")
    if smooth:
        sm = m.modifiers.new("sm", "SMOOTH"); sm.iterations = smooth; sm.factor = 0.5; bpy.ops.object.modifier_apply(modifier="sm")
    if target and tris(m) > target:
        d = m.modifiers.new("dec", "DECIMATE"); d.ratio = target / tris(m); bpy.ops.object.modifier_apply(modifier="dec")
    for p in m.data.polygons: p.use_smooth = True
    if name: m.name = m.data.name = name
    return m
def recalc(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def hexc(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
MATS = {}
def mat(name, col="#ffffff", rough=0.9, metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hexc(col), 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.15 if rough > 0.7 else 0.5
    m.diffuse_color = (*hexc(col), 1); MATS[name] = m; return m
def set_mat(o, name, col="#ffffff", rough=0.9, metal=0.0):
    o.data.materials.clear(); o.data.materials.append(mat(name, col, rough, metal)); return o
def join(objs, name):
    objs = [o for o in objs if o]
    sel(*objs); bpy.ops.object.join(); o = bpy.context.active_object; o.name = o.data.name = name; return o
def rigid(o, bone):
    o.vertex_groups.clear(); g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
def prim_sphere(c, r, scale=(1, 1, 1), seg=24, ring=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=c); o = bpy.context.active_object
    o.scale = scale; bpy.ops.object.transform_apply(scale=True); smooth(o); return o
def prim_cyl(c, r, depth, rot=(0, 0, 0), verts=24, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=c, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=c, rotation=rot)
    o = bpy.context.active_object; return o
def prim_torus(c, R, r, rot=(0, 0, 0), seg=32, mseg=10):
    bpy.ops.mesh.primitive_torus_add(location=c, rotation=rot, major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg); o = bpy.context.active_object; smooth(o); return o
def tube(name, pts, rads, sides=10, cap_ends=True):
    # a tube through points with a radius per point (Catmull-Rom smoothed), closed with rounded caps
    P = [Vector(p) for p in pts]; n = len(P); S = []; R = []
    for i in range(n - 1):
        p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(n - 1, i + 2)]
        for k in range(6):
            t = k / 6; t2 = t * t; t3 = t2 * t
            S.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
            R.append(rads[i] + (rads[i + 1] - rads[i]) * (3 * t2 - 2 * t3))
    S.append(P[-1]); R.append(rads[-1])
    bm = bmesh.new(); rings = []
    ref = Vector((0, 0, 1))
    for i, p in enumerate(S):
        d = (S[min(len(S) - 1, i + 1)] - S[max(0, i - 1)]).normalized()
        if abs(d.dot(ref)) > 0.9: ref = Vector((1, 0, 0))
        u = d.cross(ref).normalized(); v = d.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(a) + v * math.sin(a)) * R[i]) for a in [j / sides * 2 * math.pi for j in range(sides)]])
    for i in range(len(rings) - 1):
        for j in range(sides): bm.faces.new((rings[i][j], rings[i][(j + 1) % sides], rings[i + 1][(j + 1) % sides], rings[i + 1][j]))
    if cap_ends:
        for ring, end, dirn in ((rings[0], S[0], -1), (rings[-1], S[-1], 1)):
            d = (S[1] - S[0]).normalized() if dirn < 0 else (S[-1] - S[-2]).normalized()
            tip = bm.verts.new(end + d * R[0 if dirn < 0 else -1] * 0.6)
            for j in range(sides):
                f = (ring[j], ring[(j + 1) % sides], tip) if dirn > 0 else (ring[(j + 1) % sides], ring[j], tip)
                bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene().collection.objects.link(o); smooth(o)
    return o, S

# ================= anatomy (same joints as art/critter/build.py) =================
J = {"Hips": V(0, 0, .64), "Spine": V(0, 0, .72), "Spine01": V(0, 0, .83), "Spine02": V(0, 0, .92), "neck": V(0, 0, 1.0), "Head": V(0, 0, 1.06), "HeadEnd": V(0, 0, 1.55)}
SH, AR, EL, WR = .06, .15, .345, .525
for s, L in ((-1, "Left"), (1, "Right")):
    J[L + "Shoulder"] = V(SH * s, 0, .955); J[L + "Arm"] = V(AR * s, 0, .955); J[L + "ForeArm"] = V(EL * s, 0, .955); J[L + "Hand"] = V(WR * s, 0, .955)
    J[L + "UpLeg"] = V(.09 * s, 0, .6); J[L + "Leg"] = V(.09 * s, .005, .33); J[L + "Foot"] = V(.09 * s, -.01, .075); J[L + "ToeBase"] = V(.09 * s, .085, .028); J[L + "ToeEnd"] = V(.09 * s, .15, .028)
HC = V(0, 0, 1.265); HR = (.298, .275, .272)   # the head: a soft ball, a touch wider, with chubby cheeks
EAR_UV = (.6, .78)
def head_dir(u, v): return Vector((math.sin(u) * math.cos(v), math.cos(u) * math.cos(v), math.sin(v)))
def head_r(d):
    r = 1 / math.sqrt((d.x / HR[0]) ** 2 + (d.y / HR[1]) ** 2 + (d.z / HR[2]) ** 2)
    side = abs(d.x) / (abs(d.x) + abs(d.y) * .8 + 1e-6)
    return r * (1 + .06 * math.exp(-((d.z + .3) / .3) ** 2) * side)
def head_pt(d, out=0.0): d = d.normalized(); return HC + d * (head_r(d) + out)

def build_rig():
    arm = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", arm); scene().collection.objects.link(rig)
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
        B(L + "UpLeg", J[L + "UpLeg"], J[L + "Leg"], "Hips"); B(L + "Leg", J[L + "Leg"], J[L + "Foot"], L + "UpLeg")
        B(L + "Foot", J[L + "Foot"], J[L + "ToeBase"], L + "Leg"); B(L + "ToeBase", J[L + "ToeBase"], J[L + "ToeEnd"], L + "Foot")
    B("Tail", V(0, -.09, .62), V(0, -.2, .6), "Hips"); B("Tail1", V(0, -.2, .6), V(0, -.3, .7), "Tail")
    for s, nm in ((-1, "EarL"), (1, "EarR")):
        root = head_pt(head_dir(s * EAR_UV[0], EAR_UV[1]), -.02); B(nm, root, root + (root - HC).normalized() * .12, "Head")
    bpy.ops.object.mode_set(mode='OBJECT'); return rig

def seg_d(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (p - (a + ab * t)).length
BODY_BONES = ["Hips", "Spine", "Spine01", "Spine02", "neck", "Head"] + [L + n for L in ("Left", "Right") for n in ("Shoulder", "Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot", "ToeBase")]
def auto_weights(o, rig, power=5, top=3):
    segs = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones if b.name in BODY_BONES}
    o.vertex_groups.clear(); groups = {n: o.vertex_groups.new(name=n) for n in segs}
    for v in o.data.vertices:
        p = o.matrix_world @ v.co; ws = []
        for n in segs:
            if p.x < -.03 and n.startswith("Right"): continue
            if p.x > .03 and n.startswith("Left"): continue
            if p.z > 1.02 and ("Arm" in n or "Leg" in n or "Hand" in n): continue
            if abs(p.x) < .12 and ("Arm" in n or "Hand" in n): continue          # the torso never follows an arm
            if p.z > .7 and ("Leg" in n or "Foot" in n or "Toe" in n): continue
            if abs(p.x) > .17 and p.z > .85 and n in ("Hips", "Spine", "Spine01", "UpLeg"): continue
            d = seg_d(p, *segs[n]); ws.append((1 / (d + .006) ** power, n))
        ws.sort(reverse=True); ws = ws[:top]; tot = sum(w for w, _ in ws)
        for w, n in ws: groups[n].add([v.index], w / tot, 'REPLACE')
def copy_weights(dst, src):
    from mathutils.kdtree import KDTree
    kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices: kd.insert(src.matrix_world @ v.co, v.index)
    kd.balance(); sg = {g.index: g.name for g in src.vertex_groups}
    dst.vertex_groups.clear(); dg = {}
    for v in dst.data.vertices:
        acc = {}; tw = 0
        for co, i, d in kd.find_n(dst.matrix_world @ v.co, 4):
            w0 = 1 / (d + .004); tw += w0
            for g in src.data.vertices[i].groups: acc[sg[g.group]] = acc.get(sg[g.group], 0) + g.weight * w0
        for k, x in acc.items():
            x /= tw
            if x < .01: continue
            if k not in dg: dg[k] = dst.vertex_groups.new(name=k)
            dg[k].add([v.index], x, 'REPLACE')
def parent_to(o, rig):
    o.parent = rig; md = o.modifiers.new("Armature", "ARMATURE"); md.object = rig

# ================= body =================
def torso_shapes(mb, F, inflate=0.0, lo=0.0, hi=9.0, sleeves=None, legs=None, bust=True):
    i = inflate
    if lo <= .66 <= hi: ell(mb, (0, -.01, .655), (.162 if F else .12) + i, (.108 if F else .095) + i, (.1 if F else .09) + i)          # pelvis
    if F and lo <= .64 <= hi: ell(mb, (0, -.05, .63), .125 + i, .075 + i, .085 + i)                                                     # a rounder seat
    if lo <= .78 <= hi: ell(mb, (0, 0, .772), (.078 if F else .105) + i, (.07 if F else .078) + i, .085 + i)             # waist
    if lo <= .88 <= hi: ell(mb, (0, 0, .878), (.1 if F else .122) + i, (.078 if F else .084) + i, .08 + i)              # chest
    if F and bust and lo <= .87 <= hi:
        for s in (-1, 1): ell(mb, (.048 * s, .055, .866), .053 + i, .05 + i, .048 + i)                   # a soft round bust
    if lo <= .94 <= hi:
        for s in (-1, 1): ball(mb, ((.098 if F else .105) * s, 0, .935), (.042 if F else .048) + i)          # round shoulders
    if sleeves:
        for s in (-1, 1): cap(mb, (.11 * s, 0, .94), (sleeves * s, 0, .953), (.04 if F else .043) + i)
    if legs:
        for s in (-1, 1):
            cap(mb, (.085 * s, 0, .63), (.088 * s, 0, max(legs, .1)), (.047 if F else .045) + i)
            if F: ell(mb, (.086 * s, -.004, .55), .06 + i, .058 + i, .1 + i)                              # soft thighs

def build_body(F):
    mb, o = mball("CBody", 0.006)
    torso_shapes(mb, F)
    cap(mb, (0, 0, .93), (0, 0, 1.12), .046)                                                               # neck, buried in the head
    for s in (-1, 1):
        cap(mb, (.1 * s, 0, .94), (.505 * s, 0, .955), .029 if F else .034)                              # noodle arms
        ell(mb, (.56 * s, 0, .955), .062, .046, .054)                                                    # mitten
        ball(mb, (.528 * s, .044, .962), .022)                                                           # thumb nub
        cap(mb, (.085 * s, 0, .63), (.088 * s, 0, .1), .04 if F else .042)                                # legs
        if F: ell(mb, (.086 * s, -.004, .55), .057, .055, .1)
        ell(mb, (.088 * s, .035, .052), .056, .092, .052)                                                # round bean feet
    body = mb_mesh(o, .0055, 2, 9000, "Body")
    # materials: fur (torso), limb (arms, legs, hands, feet), belly (a soft oval tummy patch)
    body.data.materials.clear()
    for n in ("fur", "limb", "belly"): body.data.materials.append(mat(n, "#f2a65a" if n != "belly" else "#fff1dc"))
    for p in body.data.polygons:
        c = p.center
        limb = abs(c.x) > .15 or c.z < .56
        tummy = False
        p.material_index = 2 if tummy else 1 if limb else 0
    return body

# ---- garments: soft shells a little bigger than the body part they cover ----
def mb_part(name, fn, voxel=.006, target=5000):
    mb, o = mball("G" + name.replace("_", ""), voxel); fn(mb); return mb_mesh(o, voxel, 2, target, name)
def lathe(name, prof, segs=40, ruffle=0.0, flare_front=0.0):
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        ring = []
        for j in range(segs):
            a = j / segs * 2 * math.pi; rr = r * (1 + ruffle * math.sin(a * 8) * (1 if z < prof[0][1] - .05 else 0))
            ring.append(bm.verts.new((math.cos(a) * rr * 1.02, math.sin(a) * rr * (0.86 + flare_front), z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(segs): bm.faces.new((rings[i][j], rings[i][(j + 1) % segs], rings[i + 1][(j + 1) % segs], rings[i + 1][j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene().collection.objects.link(o)
    so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = .008; so.offset = 1; sel(o); bpy.ops.object.modifier_apply(modifier="so"); recalc(o); smooth(o)
    return o

def build_garments(F, body, rig):
    G = {}
    def top(kind):
        def fn(mb):
            sl = {"tee": .25, "tank": None, "longsleeve": .49, "hoodie": .49, "sweater": .48, "jacket": .49, "pajamas": .49, "dress": .2, "apron": None}[kind]
            torso_shapes(mb, F, .014, .6 if kind == "dress" else .7, 9, sleeves=sl)
            if kind == "sweater":
                for s in (-1, 1): ball(mb, (.48 * s, 0, .953), .052)
            if kind == "hoodie": ell(mb, (0, -.09, 1.02), .13, .075, .07)
        return fn
    for kind in ("tee", "tank", "longsleeve", "hoodie", "sweater", "jacket", "pajamas"):
        g = mb_part("Top_" + kind, top(kind)); set_mat(g, "cloth_top", "#e85d75")
        extra = []
        if kind == "jacket":
            c = prim_torus((0, 0, 1.0), .066, .02, (0, 0, 0), 24, 8); set_mat(c, "cloth_top"); extra.append(c)
            z = prim_cyl((0, .1, .78), .006, .26, (0, 0, 0), 8); set_mat(z, "metal", "#c8c8d0", .4, .8); extra.append(z)
        if kind in ("pajamas", "jacket"):
            for zz in (.9, .82, .74):
                b = prim_sphere((0, .104 if kind == "pajamas" else .108, zz), .012, (1, .6, 1), 10, 6); set_mat(b, "button", "#f4f1ea", .5); extra.append(b)
        if kind == "hoodie":
            for s in (-1, 1):
                d = prim_cyl((.03 * s, .1, .8), .005, .12, (0, 0, 0), 6); set_mat(d, "button", "#f4f1ea"); extra.append(d)
        G["Top_" + kind] = join([g] + extra, "Top_" + kind) if extra else g
    # dress: a fitted bodice and a bell skirt
    bod = mb_part("Top_dress", top("dress")); set_mat(bod, "cloth_top")
    sk = lathe("DressSkirt", [(.12 if F else .13, .76), (.17, .64), (.25, .5), (.31, .37)], ruffle=.03); set_mat(sk, "cloth_top")
    G["Top_dress"] = join([bod, sk], "Top_dress")
    # apron: a soft bib and a front skirt panel with a pocket
    def apron(mb):
        ell(mb, (0, .085, .83), .085, .022, .09); ell(mb, (0, .1, .62), .14, .03, .12)
        for s in (-1, 1): cap(mb, (.06 * s, .07, .9), (.09 * s, -.02, 1.0), .012)
    ap = mb_part("Top_apron", apron); set_mat(ap, "cloth_top")
    pk = prim_sphere((0, .132, .6), .05, (1.2, .25, .7), 16, 8); set_mat(pk, "button", "#f4f1ea")
    G["Top_apron"] = join([ap, pk], "Top_apron")
    # bottoms
    def pants(knee):
        def fn(mb):
            torso_shapes(mb, F, .016, .6, .7, legs=knee, bust=False)
        return fn
    for kind, knee in (("pants", .13), ("pjpants", .12), ("shorts", .44)):
        g = mb_part("Bot_" + kind, pants(knee)); set_mat(g, "cloth_bottom", "#3d5a98"); G["Bot_" + kind] = g
    def overalls(mb):
        torso_shapes(mb, F, .018, .6, .7, legs=.14, bust=False)
        ell(mb, (0, .07, .8), .095, .03, .09)
        for s in (-1, 1): cap(mb, (.06 * s, .085, .87), (.08 * s, -.05, .97), .014)
    ov = mb_part("Bot_overalls", overalls); set_mat(ov, "cloth_bottom")
    bt = [prim_sphere((.06 * s, .1, .86), .012, (1, .6, 1), 10, 6) for s in (-1, 1)]
    for b in bt: set_mat(b, "gold", "#e8c35a", .35, .9)
    G["Bot_overalls"] = join([ov] + bt, "Bot_overalls")
    for kind, prof in (("skirt", [(.135, .74), (.17, .64), (.22, .5)]), ("longskirt", [(.135, .74), (.17, .6), (.22, .4), (.26, .16)])):
        g = lathe("Bot_" + kind, prof, ruffle=.02 if kind == "skirt" else 0); set_mat(g, "cloth_bottom"); g.name = g.data.name = "Bot_" + kind; G["Bot_" + kind] = g
    # shoes
    def shoe(kind):
        def fn(mb):
            for s in (-1, 1):
                ell(mb, (.088 * s, .04, .055), .066, .104, .06 if kind != "slippers" else .068)
                if kind == "boots": cap(mb, (.088 * s, 0, .06), (.088 * s, 0, .25), .056)
        return fn
    for kind in ("sneakers", "boots", "slippers"):
        g = mb_part("Shoes_" + kind, shoe(kind)); set_mat(g, "cloth_shoes", "#f4f1ea")
        ex = []
        if kind != "slippers":
            for s in (-1, 1):
                so = prim_sphere((.088 * s, .04, .012), .07, (1, 1.55, .22), 20, 8); set_mat(so, "sole", "#3a3440"); ex.append(so)
        else:
            for s in (-1, 1):
                for e in (-1, 1):
                    ea = prim_sphere((.088 * s + .03 * e, .12, .11), .025, (1, .5, 1.3), 12, 8); set_mat(ea, "cloth_shoes"); ex.append(ea)
        G["Shoes_" + kind] = join([g] + ex, "Shoes_" + kind)
    for nm, g in G.items():
        copy_weights(g, body); parent_to(g, rig)
    # hats, glasses and neckwear ride one bone
    R = HR[2]
    def dome(cut, rr=.296):
        o = prim_sphere(tuple(HC), rr, (HR[0] / HR[2], HR[1] / HR[2], 1), 40, 20)
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cut], context='VERTS'); bm.to_mesh(o.data); bm.free()
        so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = .01; sel(o); bpy.ops.object.modifier_apply(modifier="so"); recalc(o); return o
    H = {}
    b = dome(HC.z + .1); set_mat(b, "cloth_hat", "#e85d75"); cf = prim_torus((0, 0, HC.z + .105), .27, .028); cf.scale = (1.04, 1, 1); set_mat(cf, "cloth_hat")
    pom = prim_sphere((0, 0, HC.z + .31), .05, seg=16, ring=10); set_mat(pom, "cloth_hat"); H["Hat_beanie"] = join([b, cf, pom], "Hat_beanie")
    c = dome(HC.z + .09, .294); set_mat(c, "cloth_hat"); br = prim_sphere((0, .25, HC.z + .1), .17, (1, .82, .07), 24, 10); br.rotation_euler = (math.radians(-12), 0, 0); set_mat(br, "cloth_hat")
    H["Hat_cap"] = join([c, br], "Hat_cap")
    cr = prim_cyl((0, 0, HC.z + .29), .12, .08, verts=32); set_mat(cr, "gold", "#e8c35a", .3, .9)
    sp = [prim_cyl((math.cos(a) * .115, math.sin(a) * .115, HC.z + .35), .03, .07, verts=8, r2=0.0) for a in [i / 5 * 2 * math.pi for i in range(5)]]
    for s_ in sp: set_mat(s_, "gold")
    gem = prim_sphere((0, .12, HC.z + .29), .02, (1, .5, 1), 10, 6); set_mat(gem, "cloth_hat")
    H["Hat_crown"] = join([cr] + sp + [gem], "Hat_crown")
    bc = head_pt(head_dir(.55, .62), .01)
    lobes = [prim_sphere(tuple(bc + V(dx, 0, dz)), .06, (1, .55, .75), 16, 10) for dx, dz in ((-.06, .03), (.06, -.03))]
    knot = prim_sphere(tuple(bc), .028, seg=12, ring=8)
    for o_ in lobes + [knot]: set_mat(o_, "cloth_hat")
    H["Hat_bow"] = join(lobes + [knot], "Hat_bow")
    fc = head_pt(head_dir(-.5, .6), .01)
    pet = [prim_sphere(tuple(fc + V(math.cos(a) * .045, .01, math.sin(a) * .045)), .035, (1, .5, 1), 12, 8) for a in [i / 5 * 2 * math.pi for i in range(5)]]
    for o_ in pet: set_mat(o_, "cloth_hat")
    mid = prim_sphere(tuple(fc + V(0, .02, 0)), .025, (1, .6, 1), 12, 8); set_mat(mid, "gold")
    H["Hat_flower"] = join(pet + [mid], "Hat_flower")
    band = prim_torus((0, 0, HC.z + .02), .305, .016, (math.pi / 2, 0, math.pi / 2), 32, 8); set_mat(band, "metal", "#3a3440", .5, .5)
    bm = bmesh.new(); bm.from_mesh(band.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < HC.z + .02], context='VERTS'); bm.to_mesh(band.data); bm.free()
    cups = [prim_cyl((.3 * s, 0, HC.z), .085, .06, (0, math.pi / 2, 0), 24) for s in (-1, 1)]
    for o_ in cups: set_mat(o_, "cloth_hat")
    H["Hat_headphones"] = join([band] + cups, "Hat_headphones")
    ph = prim_cyl((.05, 0, HC.z + .38), .1, .26, (0, math.radians(12), 0), 24, 0.0); set_mat(ph, "cloth_hat")
    pp = prim_sphere((.08, 0, HC.z + .52), .03, seg=12, ring=8); set_mat(pp, "gold")
    H["Hat_partyhat"] = join([ph, pp], "Hat_partyhat")
    th = prim_cyl((0, 0, HC.z + .36), .13, .2, verts=32); tb = prim_cyl((0, 0, HC.z + .26), .21, .015, verts=32); rb = prim_cyl((0, 0, HC.z + .29), .132, .04, verts=32)
    set_mat(th, "cloth_hat"); set_mat(tb, "cloth_hat"); set_mat(rb, "gold"); H["Hat_tophat"] = join([th, tb, rb], "Hat_tophat")
    # eyewear: round frames over the big eyes
    for kind in ("glasses", "shades"):
        parts = []
        for s in (-1, 1):
            d = head_dir(s * EYE_U, EYE_V); c_ = head_pt(d, .03)
            rg = prim_torus(tuple(c_), .085, .009, (0, 0, 0), 32, 8); rg.rotation_mode = 'QUATERNION'; rg.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); set_mat(rg, "metal", "#3a3440", .4, .6); parts.append(rg)
            if kind == "shades":
                ln = prim_cyl(tuple(c_), .08, .006, (0, 0, 0), 32); ln.rotation_mode = 'QUATERNION'; ln.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); set_mat(ln, "lens", "#1a1820", .2, .3); parts.append(ln)
        a_, b_ = head_pt(head_dir(-.17, EYE_V + .05), .035), head_pt(head_dir(.17, EYE_V + .05), .035)
        br_, _ = tube("bridge", [a_, (a_ + b_) / 2 + V(0, .012, .01), b_], [.007, .007, .007], 6); set_mat(br_, "metal"); parts.append(br_)
        H["Eyew_" + kind] = join(parts, "Eyew_" + kind)
    for nm, o_ in H.items(): rigid(o_, "Head"); parent_to(o_, rig); G[nm] = o_
    # neckwear on the chest bone
    N_ = {}
    sc = prim_torus((0, 0, 1.0), .062, .03, (0, 0, 0), 32, 12); tl, _ = tube("st", [(.03, .07, .99), (.05, .1, .9), (.045, .11, .82)], [.025, .024, .02], 10)
    set_mat(sc, "cloth_neck", "#f3c64a"); set_mat(tl, "cloth_neck"); N_["Neck_scarf"] = join([sc, tl], "Neck_scarf")
    wings = [prim_sphere((.04 * s, .07, .985), .035, (1, .4, .65), 12, 8) for s in (-1, 1)]; kn = prim_sphere((0, .075, .985), .016, seg=10, ring=6)
    for o_ in wings + [kn]: set_mat(o_, "cloth_neck")
    N_["Neck_bowtie"] = join(wings + [kn], "Neck_bowtie")
    co = prim_torus((0, 0, 1.0), .052, .011, (0, 0, 0), 32, 8); set_mat(co, "cloth_neck"); bl = prim_sphere((0, .07, .965), .026, seg=16, ring=10); set_mat(bl, "gold")
    N_["Neck_bell"] = join([co, bl], "Neck_bell")
    def cape(mb): ell(mb, (0, -.105, .74), .19, .02, .26); ell(mb, (0, -.02, .99), .1, .085, .03)
    cp = mb_part("Neck_cape", cape); set_mat(cp, "cloth_neck"); N_["Neck_cape"] = cp
    for nm, o_ in N_.items(): rigid(o_, "Spine01" if nm == "Neck_cape" else "Spine02"); parent_to(o_, rig); G[nm] = o_
    return G

# ================= heads =================
EYE_U, EYE_V = .37, .03
SP = {  # ears, tail, extras, muzzle(belly patch), nose dot, whiskers
 "cat":      dict(fur="#f2a65a", belly="#fff1dc", tip="#fff1dc", nose="#ff8fa3", ears=("point", 1.0), tail="cat", ex=[], muzzle=False, whisk=True, catnose=True, fluff=True, mark="#d9843a", marks=["tabby"]),
 "dog":      dict(fur="#c98b55", belly="#fbe8cf", tip="#fbe8cf", nose="#2a1c18", mark="#8a5a36", ears=("flop", 1.0), tail="dog", ex=["earmark"], muzzle=True, marks=["eyespot"]),
 "fox":      dict(fur="#f07a2e", belly="#ffffff", tip="#ffffff", nose="#231816", mark="#2c1c18", ears=("point", 1.25), tail="bushy", ex=[], muzzle=True, catnose=True, fluff=True),
 "bunny":    dict(fur="#f4efe9", belly="#ffffff", tip="#ffffff", nose="#ff9fb4", inner="#ffc2d1", ears=("long", 1.0), tail="pom", ex=[], muzzle=False, marks=["pinkcheeks"]),
 "bear":     dict(fur="#9a6440", belly="#e8c79e", tip="#e8c79e", nose="#2a1c18", ears=("round", 1.0), tail="stub", ex=[], muzzle=True),
 "deer":     dict(fur="#a8703f", belly="#f1d4ae", tip="#ffffff", nose="#2a1612", antler="#e9d8b4", ears=("leaf", 1.0), tail="stub", ex=["antlers", "spots"], muzzle=True),
 "reindeer": dict(fur="#8a5a3a", belly="#f1e0c8", tip="#f6efe4", nose="#e0404c", antler="#efe0bd", ears=("leaf", .9), tail="stub", ex=["bigantlers"], muzzle=True, bignose=True),
 "mouse":    dict(fur="#b9b3c2", belly="#f6eef4", tip="#f6eef4", nose="#ff8fa3", inner="#ffc2d1", ears=("round", 1.55), tail="thin", ex=[], muzzle=False, whisk=True, marks=["pinkcheeks"]),
 "wolf":     dict(fur="#4f6f9f", belly="#a9bfdc", tip="#a9bfdc", nose="#16141c", mark="#26406c", ears=("point", 1.3), tail="bushy", ex=[], muzzle=True, catnose=True, fluff=True),
 "raccoon":  dict(fur="#8b8a92", belly="#e9e6ea", tip="#2a2830", nose="#1c1a20", mark="#2c2a32", ears=("point", .85), tail="ringed", ex=["mask"], muzzle=True, whisk=True, catnose=True, fluff=True),
 "panda":    dict(fur="#f7f3ee", belly="#ffffff", tip="#2b2530", nose="#1c1a20", mark="#2b2530", ears=("round", 1.0), tail="stub", ex=["patches"], muzzle=False, earmark=True),
 "pig":      dict(fur="#ffb3c1", belly="#ffd9e0", tip="#ffd9e0", nose="#ff8ca2", ears=("pig", 1.0), tail="curly", ex=["snout"], muzzle=False, nonose=True, marks=["pinkcheeks"]),
 "sheep":    dict(fur="#f6f1e7", belly="#ffffff", tip="#ffffff", nose="#2a1c18", mark="#5d5560", inner="#8a7f8c", ears=("flop", .75), tail="pom", ex=["wool"], muzzle=False, earmark=True),
 "lion":     dict(fur="#ebb04e", belly="#fbe3b0", tip="#a3592a", nose="#8a4a2a", mark="#a3592a", ears=("round", .85), tail="lion", ex=["mane"], muzzle=True, catnose=True, fluff=True),
 "tiger":    dict(fur="#f08a24", belly="#fff6ea", tip="#2a1c18", nose="#ff8fa3", mark="#2a1c18", ears=("round", .95), tail="ringed", ex=["stripes"], muzzle=True, whisk=True, catnose=True, fluff=True),
 "redpanda": dict(fur="#c4532a", belly="#f4ece2", tip="#7a2e16", nose="#1c1a20", mark="#2b1a14", ears=("point", .9), tail="ringed", ex=["cheeks"], muzzle=True, catnose=True, fluff=True),
 "skunk":    dict(fur="#2e2c36", belly="#f4f1ea", tip="#f4f1ea", nose="#16141c", mark="#f4f1ea", ears=("round", .9), tail="skunk", ex=["stripe"], muzzle=False),
 "hamster":  dict(fur="#e8b77a", belly="#fff4e0", tip="#fff4e0", nose="#ff8fa3", inner="#ffc2d1", ears=("round", .9), tail="stub", ex=["puffs"], muzzle=True, whisk=True, marks=["pinkcheeks"]),
 "otter":    dict(fur="#7a5236", belly="#e8d2b4", tip="#e8d2b4", nose="#2a1c18", mark="#5a3a24", ears=("round", .6), tail="otter", ex=[], muzzle=True, whisk=True),
 "koala":    dict(fur="#9a9aa4", belly="#ececf0", tip="#ececf0", nose="#2a2830", inner="#f4f4f6", ears=("fluffy", 1.0), tail="none", ex=[], muzzle=False, bignose=True),
}
if ONLY: SP = {k: v for k, v in SP.items() if k in ONLY.split(",")}
F_HEAD = False
FACE_KEYS = ["Blink", "Happy", "Sad", "Angry", "Wide", "Half", "Smile", "Open", "Frown", "O", "Blep", "Blush", "EyeTall", "EyeWide"]
# eye types: the round eye is the Basis; EyeTall / EyeWide reshape the whole eye (sclera, ink ring, pupil) about its centre, the game sets one from look.eyes
EYE_TYPES = {"EyeTall": (.84, 1.17), "EyeWide": (1.18, .82)}
def eye_types(st):
    for k, (sx, sy) in EYE_TYPES.items(): st[k] = [(x * sx, y * sy) for x, y in st["Basis"]]
    return st

class HeadMesh:
    """One mesh built vertex by vertex, with a position per shape key and a bone per vertex."""
    def __init__(s): s.v = []; s.keys = {k: {} for k in FACE_KEYS}; s.f = []; s.mats = []; s.bone = []; s.matid = {}
    def m(s, name):
        if name not in s.matid: s.matid[name] = len(s.mats); s.mats.append(name)
        return s.matid[name]
    def add_v(s, p, bone="Head"): s.v.append(Vector(p)); s.bone.append(bone); return len(s.v) - 1
    def face(s, idx, matname): s.f.append((tuple(idx), s.m(matname)))
    def add_obj(s, o, matname=None, bone="Head", bone_fn=None):
        base = len(s.v); me = o.data
        for v in me.vertices:
            p = o.matrix_world @ v.co; s.v.append(p); s.bone.append(bone_fn(p) if bone_fn else bone)
        names = [ms.name if ms else "fur" for ms in me.materials]
        for p in me.polygons: s.f.append((tuple(base + i for i in p.vertices), s.m(matname or (names[p.material_index] if names else "fur"))))
        bpy.data.objects.remove(o)

def tangent_basis(u, v):
    f = head_dir(u, v); e = Vector((math.cos(u), -math.sin(u), 0)); n = e.cross(f).normalized(); return f, e, n
def decal_pt(u, v, a, b, out):
    f, e, n = tangent_basis(u, v); R = .28
    return head_pt(f + e * (a / R) + n * (b / R), out)

def ellipse(w, h, N, cx=0, cy=0): return [(cx + w * math.cos(2 * math.pi * i / N), cy + h * math.sin(2 * math.pi * i / N)) for i in range(N)]

def add_decal(H, u, v, out, states, faces, matname, bone="Head"):
    """states: {"Basis": [(a,b)...], key: [...]} 2D points in the decal plane, the same count each; faces index those points"""
    base = [H.add_v(decal_pt(u, v, a, b, out), bone) for (a, b) in states["Basis"]]
    for k, pts in states.items():
        if k == "Basis": continue
        for i, (a, b) in zip(base, pts): H.keys[k][i] = decal_pt(u, v, a, b, out)
    def area(f, pts): return sum(pts[f[i]][0] * pts[f[(i + 1) % len(f)]][1] - pts[f[(i + 1) % len(f)]][0] * pts[f[i]][1] for i in range(len(f)))
    order = [states["Basis"]] + [v for k, v in states.items() if k != "Basis"]
    for f in faces:
        a = 0.0
        for pts in order:
            a = area(f, pts)
            if abs(a) > 1e-10: break
        H.face([base[i] for i in (tuple(reversed(f)) if a > 0 else f)], matname)

def disc(w, h, N, R=5, cx=0, cy=0):
    pts = [(cx, cy)]
    for r in range(1, R + 1):
        k = r / R; pts += [(cx + w * k * math.cos(2 * math.pi * i / N), cy + h * k * math.sin(2 * math.pi * i / N)) for i in range(N)]
    faces = [(0, 1 + i, 1 + (i + 1) % N) for i in range(N)]
    for r in range(1, R):
        a, b = 1 + (r - 1) * N, 1 + r * N
        faces += [(a + i, a + (i + 1) % N, b + (i + 1) % N, b + i) for i in range(N)]
    return pts, faces
def quadgrid(c, nu=4, nv=8):
    (a0, a1, a2, a3) = c; pts = []
    for j in range(nv + 1):
        v = j / nv
        for i in range(nu + 1):
            u = i / nu
            x = (1 - v) * ((1 - u) * a0[0] + u * a1[0]) + v * ((1 - u) * a3[0] + u * a2[0])
            y = (1 - v) * ((1 - u) * a0[1] + u * a1[1]) + v * ((1 - u) * a3[1] + u * a2[1])
            pts.append((x, y))
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    return pts, faces
def fan(n): return [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
def strip(n): return [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
def ring_faces(n): return [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]

def build_face(H, sp):
    N = 32; ew, eh = .076, .092          # big tall oval eyes
    cut = eh * .18                        # the half-lid line
    for s in (-1, 1):
        u = s * EYE_U
        xo = lambda x: max(0.0, min(1.0, s * x / ew))      # 0 at the middle, 1 at the outer edge
        xi = lambda x: max(0.0, min(1.0, -s * x / ew))     # 1 at the inner edge
        arcB = lambda x: -.03 + .026 * (x / ew) ** 2        # a closed eye: a soft smile line
        arcH = lambda x: .012 - .034 * (x / ew) ** 2        # a happy ^ eye
        def eyeT(pts, key, center=(0, 0)):
            out = []
            for (x, y) in pts:
                if key == "Wide": out.append((center[0] + (x - center[0]) * 1.12, center[1] + (y - center[1]) * 1.12))
                elif key == "Half": out.append((x, min(y, cut)))
                elif key == "Sad": out.append((x, y * (1 - .38 * xo(x)) if y > 0 else y))
                elif key == "Angry": out.append((x, y * (1 - .55 * xi(x)) if y > 0 else y))
                elif key in ("Blink", "Happy"):
                    xx = max(-ew, min(ew, x)) * .96; out.append((xx, (arcB if key == "Blink" else arcH)(xx)))
                else: out.append((x, y))
            return out
        # sclera
        pts, ff = disc(ew, eh, N, 4)
        st = {"Basis": pts}
        for k in ("Wide", "Half", "Sad", "Angry", "Blink", "Happy"): st[k] = eyeT(pts, k)
        add_decal(H, u, EYE_V, .004, eye_types(st), ff, "eyewhite")
        # ink outline ring (becomes the closed/happy line)
        inner = ellipse(ew, eh, N); outer = ellipse(ew + .011, eh + .011, N)
        st = {"Basis": inner + outer}
        for k in ("Wide", "Sad", "Angry"): st[k] = eyeT(inner, k) + eyeT(outer, k)
        st["Half"] = [(x, min(y, cut)) for (x, y) in inner] + [(x, min(y, cut + .016) if y > cut else y) for (x, y) in outer]
        for k, arc in (("Blink", arcB), ("Happy", arcH)):
            a_in, a_out = [], []
            for i, ((x, y), (xo_, yo)) in enumerate(zip(inner, outer)):
                xx = max(-ew, min(ew, x)) * .98; sgn = 1 if math.sin(2 * math.pi * i / N) >= 0 else -1
                a_in.append((xx, arc(xx))); a_out.append((xx, arc(xx) + sgn * .0075 * (1 - (xx / ew) ** 6)))
            st[k] = a_in + a_out
        add_decal(H, u, EYE_V, .0045, eye_types(st), ring_faces(N), "eyeink")
        # the big matte black pupil, a little toward the nose and down
        pw, ph = .047, .061; pc = (-s * .016, -.017)
        pts, ff = disc(pw, ph, N, 4, *pc)
        st = {"Basis": pts, "Wide": [(pc[0] + (x - pc[0]) * .78, pc[1] + (y - pc[1]) * .78) for x, y in pts],
              "Half": [(x, min(y, cut - .004)) for x, y in pts], "Sad": [(x, y + .012) for x, y in pts], "Angry": [(x - s * .004, y - .006) for x, y in pts]}
        for k in ("Blink", "Happy"): st[k] = eyeT(pts, k)
        add_decal(H, u, EYE_V, .0052, eye_types(st), ff, "pupil")
        if F_HEAD:
            lp, lf = [], []
            for j, ang in enumerate((18, 40, 62)):
                a = math.radians(ang if s > 0 else 180 - ang); r0 = (ew + .009, eh + .009)
                bx, by = r0[0] * math.cos(a), r0[1] * math.sin(a); nx_, ny_ = math.cos(a), math.sin(a)
                tx, ty = -ny_, nx_; ln_ = .024 + .004 * (j == 1)
                base = [(bx + tx * .0045, by + ty * .0045), (bx - tx * .0045, by - ty * .0045)]
                tip = (bx + nx_ * ln_ + s * .004, by + ny_ * ln_ + .006)
                lp += base + [tip]; lf.append((3 * j, 3 * j + 1, 3 * j + 2))
            st = {"Basis": lp}
            for k in ("Wide", "Half", "Sad", "Angry", "Blink", "Happy"):
                out_ = []
                for j in range(3):
                    b0, b1, tp_ = lp[3 * j], lp[3 * j + 1], lp[3 * j + 2]
                    if k == "Half": nb = [(b0[0], min(b0[1], cut + .012)), (b1[0], min(b1[1], cut + .012))]
                    else: nb = eyeT([b0, b1], k)
                    if k in ("Blink", "Happy"): nb = [(nb[0][0] + s * .004, nb[0][1] + .003), (nb[1][0], nb[1][1] - .003)]
                    mx, my = (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2; nmx, nmy = (nb[0][0] + nb[1][0]) / 2, (nb[0][1] + nb[1][1]) / 2
                    out_ += nb + [(tp_[0] - mx + nmx, tp_[1] - my + nmy)]
                st[k] = out_
            add_decal(H, u, EYE_V, .0046, st, lf, "eyeink")
        # brows: hidden until Sad or Angry
        M_ = 10; xs = [-.055 + .11 * i / (M_ - 1) for i in range(M_)]
        def brow(fy):
            top, bot = [], []
            for x in xs:
                t = (1 - (2 * (x + .055) / .11 - 1) ** 2) ** .5 * .007 + .002; y = fy(x)
                top.append((x, y + t)); bot.append((x, y - t))
            return top + bot
        hid = [(0, eh + .02)] * (2 * M_)
        st = {"Basis": hid, "Sad": brow(lambda x: eh + .035 + .03 * (0.5 - s * x / .11)), "Angry": brow(lambda x: eh + .03 - .035 * (0.5 - s * x / .11))}
        add_decal(H, u, EYE_V, .0045, st, strip(M_), "eyeink")
        # blush: hidden until Blush
        bp, bf = disc(.05, .028, 20, 3)
        add_decal(H, s * .62, -.2, .0025, {"Basis": [(0, 0)] * len(bp), "Blush": bp}, bf, "blush")
        if sp.get("whisk"):
            for k_, dy in enumerate((.012, -.006, -.024)):
                pts = [(s * (.06 + .06 * i / 9), dy - .004 * (i / 9 * 5) * (k_ - 1)) for i in range(10)]
                add_decal(H, s * .55, -.24, .0035, {"Basis": [(x, y + .0028) for x, y in pts] + [(x, y - .0028) for x, y in pts]}, strip(10), "eyeink")
    # mouth: a small smile line by default
    M_ = 14; ts = [-1 + 2 * i / (M_ - 1) for i in range(M_)]
    w0, w1 = .036, .056
    lineB = lambda t: (t * w0, -.009 * (1 - t * t))
    lineS = lambda t: (t * w1, -.024 * (1 - t * t) + .006 * t * t)
    lineF = lambda t: (t * .04, .014 * (1 - t * t) - .004)
    def band(fn, th=.0045):
        top, bot = [], []
        for t in ts:
            x, y = fn(t); w = th * (1 - .6 * t ** 6); top.append((x, y + w)); bot.append((x, y - w))
        return top + bot
    Oc, Or = (0, -.024), .025
    def oring():
        top, bot = [], []
        for t in ts:
            a = math.pi * (1 + t)  # a full circle
            top.append((Oc[0] + math.cos(a) * (Or + .006), Oc[1] + math.sin(a) * (Or + .006))); bot.append((Oc[0] + math.cos(a) * (Or - .003), Oc[1] + math.sin(a) * (Or - .003)))
        return top + bot
    MV = -.33
    add_decal(H, 0, MV, .0055, {"Basis": band(lineB), "Smile": band(lineS), "Frown": band(lineF), "O": oring()}, strip(M_), "eyeink")
    # the open mouth: a D under the lip line, teeth along the top, a tongue at the bottom
    def fill(fn, depth=0.0, Ofill=False):
        top, bot = [], []
        for t in ts:
            x, y = fn(t)
            if Ofill:
                a = math.pi * (1 - (t + 1) / 2); x = Oc[0] + math.cos(a) * Or; top.append((x, Oc[1] + math.sin(a) * Or)); bot.append((x, Oc[1] - math.sin(a) * Or))
            else: top.append((x, y)); bot.append((x, y - depth * (1 - t * t) ** .5))
        return top + bot
    add_decal(H, 0, MV, .0042, {"Basis": fill(lineB), "Smile": fill(lineS), "Frown": fill(lineF), "Open": [(x, y) for x, y in fill(lineB)[:M_]] + [(x, y - .05 * (1 - t * t) ** .5) for (x, y), t in zip(fill(lineB)[M_:], ts)], "O": fill(lineB, Ofill=True)}, strip(M_), "mouth")
    def teeth(fn, h=0.0):
        top, bot = [], []
        for t in ts:
            x, y = fn(t * .82); top.append((x, y - .003)); bot.append((x, y - .003 - h * (1 - t ** 8)))
        return top + bot
    add_decal(H, 0, MV, .0048, {"Basis": teeth(lineB), "Smile": teeth(lineS), "Frown": teeth(lineF), "Open": [(x, y) for x, y in teeth(lineB)[:M_]] + [(x, y - .013 * (1 - t ** 8)) for (x, y), t in zip(teeth(lineB)[M_:], ts)]}, strip(M_), "eyewhite")
    tp = ellipse(.022, .013, 18); tc_open = (0, -.044); tc_blep = (0, -.02)
    add_decal(H, 0, MV, .0047, {"Basis": [(0, -.012)] * 19, "Open": [tc_open] + [(tc_open[0] + x, tc_open[1] + y) for x, y in tp],
                                "Smile": [(0, -.027)] * 19, "Blep": [tc_blep] + [(tc_blep[0] + x * .75, tc_blep[1] + y * 1.1 - .004) for x, y in tp]}, fan(18), "tongue")
    # nose: a soft rounded triangle on the cat family, a round button on the rest
    if not sp.get("nonose"):
        nw, nh = (.036, .027) if sp.get("bignose") else (.022, .015)
        np_, nf = disc(nw, nh, 20, 3)
        if sp.get("catnose"): np_ = [(x * (1 + .45 * y / nh), y - .3 * abs(x) * (y < 0)) for x, y in np_]
        add_decal(H, 0, -.2, .0058, {"Basis": np_}, nf, "nose")
        if sp.get("catnose"):  # the little line from the nose down to the mouth
            lq, lf_ = quadgrid([(-.0028, -.012), (.0028, -.012), (.0028, -.036), (-.0028, -.036)], 1, 4)
            add_decal(H, 0, -.2, .0062, {"Basis": lq}, lf_, "eyeink")
    if F_HEAD:  # girls: rosy cheeks always
        for s in (-1, 1):
            rp, rf = disc(.038, .02, 18, 3); add_decal(H, s * .62, -.2, .0022, {"Basis": rp}, rf, "blush")

# ---- ears ----
def chaikin(pts, it=3):
    for _ in range(it):
        q = []
        for i in range(len(pts)):
            a, b = Vector(pts[i]), Vector(pts[(i + 1) % len(pts)]); q += [a * .75 + b * .25, a * .25 + b * .75]
        pts = q
    return [tuple(p) for p in pts]
def ear_outline(kind, sc):
    if kind == "point": w, h = .17 * sc, .19 * sc; return chaikin([(-w / 2, 0), (-w * .3, h * .6), (0, h), (w * .3, h * .6), (w / 2, 0), (0, -.03)])
    if kind == "round": r = .085 * sc; return [(math.cos(a) * r, r * .75 + math.sin(a) * r) for a in [i / 28 * 2 * math.pi for i in range(28)]]
    if kind == "fluffy": r = .1 * sc; return chaikin([(math.cos(a) * r * (1 + .12 * math.sin(a * 7)), r * .7 + math.sin(a) * r) for a in [i / 21 * 2 * math.pi for i in range(21)]], 2)
    if kind == "long": return [(math.cos(a) * .06 * sc, .17 * sc + math.sin(a) * .2 * sc) for a in [i / 32 * 2 * math.pi for i in range(32)]]
    if kind == "flop": return chaikin([(-.06 * sc, 0), (-.075 * sc, .14 * sc), (0, .25 * sc), (.075 * sc, .14 * sc), (.06 * sc, 0), (0, -.02)])
    if kind == "leaf": return chaikin([(-.055 * sc, 0), (-.06 * sc, .1 * sc), (0, .2 * sc), (.06 * sc, .1 * sc), (.055 * sc, 0), (0, -.02)])
    if kind == "pig": return chaikin([(-.06, 0), (-.04, .1), (0, .14), (.05, .08), (.06, 0), (0, -.02)])
    return ear_outline("round", sc)
def build_ear(H, kind, sc, side, inner_mat):
    u, v = side * EAR_UV[0], EAR_UV[1]
    root = head_pt(head_dir(u, v), -.025); nrm = (root - HC).normalized(); right = Vector((side, 0, 0))
    if kind == "flop": root = head_pt(head_dir(side * .85, .72), -.01); up = (V(0, 0, -1) * .8 + right * .45).normalized()
    elif kind == "leaf": up = (nrm * .5 + right * .7).normalized(); root = head_pt(head_dir(side * .9, .35), -.02)
    elif kind == "pig": up = (nrm * .7 + V(0, .5, 0)).normalized()
    else: up = (nrm * .55 + V(0, 0, 1) * .45).normalized()
    fwd = (V(0, 1, 0) - up * up.y).normalized()
    if kind == "flop": w_ = V(side * .55, .85, .05); fwd = (w_ - up * w_.dot(up)).normalized(); root = root + V(side, 0, 0) * .02
    side_v = up.cross(fwd).normalized()
    out = ear_outline(kind, sc); th = .022 if kind != "long" else .026
    bone = "EarL" if side < 0 else "EarR"
    def plate(pts, t0, t1, scale=1.0, lift=0.0, mname="fur"):
        P = [root + side_v * x * scale + up * (y * scale + lift) for x, y in pts]
        n = len(P); c = sum(P, Vector()) / n
        bm = bmesh.new()
        f_ = [bm.verts.new(p + fwd * t1) for p in P]; b_ = [bm.verts.new(p + fwd * t0) for p in P]
        cf = bm.verts.new(c + fwd * (t1 + .004)); cb = bm.verts.new(c + fwd * (t0 - .004))
        for i in range(n):
            j = (i + 1) % n; bm.faces.new((f_[i], f_[j], cf)); bm.faces.new((b_[j], b_[i], cb)); bm.faces.new((f_[j], f_[i], b_[i], b_[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new("ear"); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new("ear", me); scene().collection.objects.link(ob)
        H.add_obj(ob, mname, bone)
    plate(out, -th / 2, th / 2)
    if kind != "flop": plate(out, th / 2, th / 2 + .006, .62, .015, inner_mat)
    if kind == "point":   # a tuft of fur in the ear
        for dx in (-.02, .02):
            b = root + up * .03 + fwd * (th / 2 + .006) + side_v * dx
            o, _ = tube("tuft", [b, b + up * .04 + fwd * .012 - side_v * dx * .4, b + up * .07 + fwd * .028 - side_v * dx], [.014, .008, .002], 6); H.add_obj(o, "tip", bone)
    return root

# ---- tails ----
def build_tail(H, kind, sp):
    if kind == "none": return
    base = V(0, -.085, .63)
    shapes = {
        "cat":    ([base, (0, -.18, .6), (0, -.28, .68), (0, -.31, .82), (0, -.27, .92)], [.026, .026, .025, .024, .028]),
        "dog":    ([base, (0, -.15, .66), (0, -.2, .76), (0, -.17, .84)], [.03, .034, .03, .026]),
        "bushy":  ([base, (0, -.16, .58), (0, -.27, .62), (0, -.33, .74), (0, -.32, .86)], [.03, .06, .08, .075, .03]),
        "skunk":  ([base, (0, -.15, .6), (0, -.25, .72), (0, -.27, .9), (0, -.2, 1.02)], [.035, .08, .1, .09, .04]),
        "ringed": ([base, (0, -.16, .58), (0, -.28, .62), (0, -.33, .74), (0, -.33, .86)], [.03, .05, .06, .055, .03]),
        "thin":   ([base, (0, -.18, .58), (0, -.3, .6), (0, -.38, .7), (0, -.4, .8)], [.014, .012, .01, .009, .007]),
        "lion":   ([base, (0, -.18, .57), (0, -.3, .62), (0, -.36, .74)], [.016, .015, .014, .012]),
        "otter":  ([base, (0, -.16, .55), (0, -.28, .5), (0, -.36, .5)], [.05, .045, .032, .015]),
        "stub":   ([base, (0, -.13, .63)], [.04, .03]),
    }
    if kind in ("pom",):
        o = prim_sphere(tuple(base + V(0, -.04, 0)), .06, seg=16, ring=10); H.add_obj(o, "tip", "Tail"); return
    if kind == "curly":
        pts = [base + V(.035 * math.sin(a), -.03 - .012 * a, .035 * math.cos(a)) for a in [i * .5 for i in range(14)]]
        o, _ = tube("tail", pts, [.012] * len(pts), 8); H.add_obj(o, "fur", "Tail"); return
    pts, rads = shapes.get(kind, shapes["stub"])
    o, S = tube("tail", pts, rads, 12)
    total = len(S)
    def tbone(p):
        d = (p - base).length; return "Tail" if d < .14 else "Tail1"
    me = o.data; mats_ = []
    ringed = kind == "ringed"
    tipfrac = .78 if kind in ("bushy", "skunk", "cat", "lion") else (.7 if ringed else 2)
    o.data.materials.clear()
    for n_ in ("fur", "tip", "mark"): o.data.materials.append(mat(n_))
    plen = sum((S[i + 1] - S[i]).length for i in range(len(S) - 1))
    acc = [0.0]
    for i in range(len(S) - 1): acc.append(acc[-1] + (S[i + 1] - S[i]).length)
    for p in me.polygons:
        c = p.center; j = min(range(len(S)), key=lambda i: (S[i] - c).length); t = acc[j] / plen
        p.material_index = 1 if t > tipfrac else (2 if ringed and int(t * 7) % 2 == 1 else 0)
    if kind == "lion":
        tf = prim_sphere(tuple(S[-1]), .04, seg=12, ring=8); bpy.context.view_layer.objects.active = tf
        H.add_obj(tf, "tip", "Tail1")
    H.add_obj(o, None, bone_fn=tbone)

def build_extras(H, sp, name):
    ex = sp["ex"]
    if "antlers" in ex or "bigantlers" in ex:
        big = "bigantlers" in ex
        for s in (-1, 1):
            r0 = head_pt(head_dir(s * .3, 1.0), -.02)
            main = [r0, r0 + V(s * .04, 0, .1), r0 + V(s * .1, -.01, .18 if big else .14), r0 + V(s * .14, -.02, .26 if big else .19)]
            o, _ = tube("ant", main, [.018, .016, .013, .01], 8); H.add_obj(o, "antler")
            for k in range(2 if big else 1):
                b0 = main[1 + k] if k < 2 else main[2]; o, _ = tube("tine", [b0, b0 + V(-s * .01, .03, .07)], [.011, .008], 8); H.add_obj(o, "antler")
    if "mane" in ex:
        for i in range(16):
            a = i / 16 * 2 * math.pi; d = (head_dir(0, 0) * .15 + Vector((math.cos(a), -0.35, math.sin(a))) * .95).normalized()
            o = prim_sphere(tuple(head_pt(d, .02)), .085, seg=14, ring=10); H.add_obj(o, "mark")
    if "wool" in ex:
        for i in range(11):
            a = i / 11 * math.pi; d = Vector((math.cos(a) * .85, -.25 + .2 * math.sin(a * 3), math.sin(a) * .9 + .25)).normalized()
            o = prim_sphere(tuple(head_pt(d, .015)), .075, seg=14, ring=10); H.add_obj(o, "tip")
    if "snout" in ex:
        c = head_pt(head_dir(0, -.2), -.01)
        o = prim_cyl(tuple(c), .055, .07, (math.pi / 2, 0, 0), 24); o.scale = (1, 1, 1); H.add_obj(o, "nose")
        for s in (-1, 1): o = prim_sphere(tuple(c + V(s * .02, .036, 0)), .011, (1, .4, 1.4), 10, 6); H.add_obj(o, "eyeink")
    if "puffs" in ex:
        for s in (-1, 1): o = prim_sphere(tuple(head_pt(head_dir(s * .55, -.3), -.03)), .08, seg=16, ring=10); H.add_obj(o, "belly")
    if "patches" in ex:   # panda eye patches under the eyes
        for s in (-1, 1):
            pp, pf = disc(.1, .12, 28, 5); add_decal(H, s * EYE_U, EYE_V - .01, .0018, {"Basis": pp}, pf, "mark")
    if "mask" in ex:      # raccoon mask band across both eyes
        pts, pf = disc(.27, .1, 40, 6); pts = [(x * (1 + .1 * math.cos(2 * math.atan2(y / .1, x / .27 if x else 1e-9))), y) for x, y in pts]
        add_decal(H, 0, EYE_V - .01, .0018, {"Basis": pts}, pf, "mark")
    if "stripes" in ex:
        for i, du in enumerate((-.12, 0, .12)):
            q, qf = quadgrid([(-.012, 0), (.012, 0), (.006, .09), (-.006, .09)], 2, 8)
            add_decal(H, du, .62, .002, {"Basis": q}, qf, "mark")
        for s in (-1, 1):
            for k in range(2):
                q, qf = quadgrid([(0, -.01), (s * .07, -.004), (s * .07, .004), (0, .01)], 6, 2)
                add_decal(H, s * (1.15 + .12 * k), .05 - .1 * k, .002, {"Basis": q}, qf, "mark")
    if "stripe" in ex:
        q, qf = quadgrid([(-.03, -.25), (.03, -.25), (.035, .25), (-.035, .25)], 3, 24)
        add_decal(H, 0, .95, .002, {"Basis": q}, qf, "mark")
    if "cheeks" in ex:
        for s in (-1, 1):
            cp, cf = disc(.07, .055, 24, 4); add_decal(H, s * .58, -.12, .0018, {"Basis": cp}, cf, "belly")
    if "spots" in ex:
        for (du, dv) in ((-.15, .7), (.12, .78), (.02, .9), (-.05, .62)):
            add_decal(H, du, dv, .002, {"Basis": [(0, 0)] + ellipse(.018, .014, 12)}, fan(12), "tip")

def spike(H, base, d1, d2, r, matname, bone="Head"):
    o, _ = tube("spike", [base, base + d1, base + d1 + d2], [r, r * .55, r * .12], 8); H.add_obj(o, matname, bone)
def build_tufts(H, sp):
    if "mane" not in sp["ex"] and "wool" not in sp["ex"]:
        for k, (u, h) in enumerate(((-.16, .06), (0, .085), (.16, .055))):   # a little fur tuft on top, leaning forward
            b = head_pt(head_dir(u, 1.12), -.02); n = (b - HC).normalized(); f = V(0, 1, 0)
            spike(H, b, n * h * .6 + f * .02 + V(u * .15, 0, 0), n * h * .4 + f * .045 + V(u * .2, 0, 0), .032, "fur")
    if sp.get("fluff"):   # cheek fluff on the cat and dog families
        for s in (-1, 1):
            for v_, ln in ((-.12, .07), (-.3, .06)):
                b = head_pt(head_dir(s * 1.42, v_), -.025); n = (b - HC).normalized()
                spike(H, b, n * ln * .55 + V(0, 0, -.01), n * ln * .45 + V(s * .01, 0, -.03), .03, "fur")
def build_marks(H, sp):
    for m in sp.get("marks", []):
        if m == "tabby":   # three soft forehead stripes
            for du, h in ((-.1, .07), (0, .09), (.1, .07)):
                q, qf = quadgrid([(-.011, 0), (.011, 0), (.005, h), (-.005, h)], 2, 8)
                add_decal(H, du, .5, .002, {"Basis": q}, qf, "mark")
        if m == "eyespot":  # a round patch round one eye
            pp, pf = disc(.1, .115, 28, 5); add_decal(H, EYE_U, EYE_V - .01, .0018, {"Basis": pp}, pf, "mark")
        if m == "pinkcheeks":
            for s in (-1, 1):
                rp, rf = disc(.04, .022, 18, 3); add_decal(H, s * .64, -.2, .0021, {"Basis": rp}, rf, "blush")

def build_head(name, sp, rig, F):
    global F_HEAD; F_HEAD = F
    H = HeadMesh()
    # the ball: fur, with an optional soft muzzle patch in the belly colour
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1.0)
    vmap = {}
    for v in bm.verts:
        d = v.co.normalized(); vmap[v] = H.add_v(head_pt(d, 0))
    for f in bm.faces:
        c = sum((v.co for v in f.verts), Vector()) / len(f.verts); d = c.normalized()
        H.face([vmap[v] for v in f.verts], "fur")
    bm.free()
    if sp["muzzle"]:
        mp, mf = disc(.12, .075, 40, 6); add_decal(H, 0, -.4, .0016, {"Basis": mp}, mf, "belly")
    build_face(H, sp)
    kind, sc = sp["ears"]
    inner = "mark" if sp.get("earmark") else "inner" if sp.get("inner") else "belly"
    for s in (-1, 1):
        if sp.get("earmark") or "earmark" in sp["ex"]:
            pass
        build_ear(H, kind, sc, s, inner)
    build_tail(H, sp["tail"], sp)
    build_extras(H, sp, name)
    build_tufts(H, sp); build_marks(H, sp)
    # ear colour: some species wear their mark on the ears
    me = bpy.data.meshes.new("Head_" + name)
    me.from_pydata([tuple(p) for p in H.v], [], [f for f, _ in H.f])
    me.update()
    for mname in H.mats:
        col = {"eyewhite": "#ffffff", "eyeink": "#241c2a", "pupil": "#050505", "mouth": "#4a1622", "tongue": "#ff7f93", "blush": "#ff7fa6"}.get(mname) or sp.get(mname) or sp["fur"]
        rough = 1.0 if mname in ("pupil", "eyeink") else 0.6 if mname in ("eyewhite",) else 0.85
        me.materials.append(mat(name + "_" + mname, col, rough))
    for i, (_, mi) in enumerate(H.f): me.polygons[i].material_index = mi
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new("Head_" + name, me); scene().collection.objects.link(o)
    # ear verts on a mark-eared species take the mark colour
    if sp.get("earmark") or "earmark" in sp["ex"]:
        mm = me.materials.find(name + "_mark")
        if mm < 0: me.materials.append(mat(name + "_mark", sp.get("mark", "#333333"))); mm = len(me.materials) - 1
        for p in me.polygons:
            if all(H.bone[i] in ("EarL", "EarR") for i in p.vertices) and me.materials[p.material_index].name.endswith("_fur"): p.material_index = mm
    groups = {}
    for i, b in enumerate(H.bone):
        if b not in groups: groups[b] = o.vertex_groups.new(name=b)
        groups[b].add([i], 1.0, 'REPLACE')
    o.shape_key_add(name="Basis")
    for k in FACE_KEYS:
        sk = o.shape_key_add(name=k, from_mix=False)
        for i, p in H.keys[k].items(): sk.data[i].co = p
    parent_to(o, rig)
    return o

# ================= proof renders =================
def proof(tag, objs_sets):
    sc = scene()
    sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    sc.render.resolution_x = 900; sc.render.resolution_y = 900
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.82, .78, .72, 1); bg.inputs[1].default_value = .9
    sc.view_settings.view_transform = "Standard"
    try:
        sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 2.2
        ls = sc.view_layers[0].freestyle_settings.linesets.new("ink"); ls.linestyle = bpy.data.linestyles.new("inkstyle"); ls.select_by_visibility = True; ls.select_by_edge_types = True
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
        ls.linestyle.color = (.11, .08, .13); ls.linestyle.thickness = 2.4
    except Exception as e: log("freestyle off", e)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 55
    for nm_, loc, en in (("k", (1.5, 3, 3), 400), ("f", (-2, 2.5, 1.5), 220), ("b", (0, -3, 2.5), 250)):
        L = bpy.data.objects.new(nm_, bpy.data.lights.new(nm_, "AREA")); L.data.energy = en; L.data.size = 3; L.location = loc; sc.collection.objects.link(L)
        L.rotation_euler = (V(0, 0, .9) - V(*loc)).to_track_quat('-Z', 'Y').to_euler()
    allo = [o for o in sc.objects if o.type == "MESH"]
    for i, objs in enumerate(objs_sets):
        for o in allo: o.hide_render = o not in objs
        for vi, (ang, dist, z, look) in enumerate(((0, 3.0, 1.0, .82), (32, 3.0, 1.0, .82), (0, 1.3, 1.32, 1.27))):
            a = math.radians(ang); cam.location = (math.sin(a) * dist, math.cos(a) * dist, z)
            cam.rotation_euler = (V(0, 0, look) - cam.location).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(PROOF, f"{tag}_{i}_{vi}.png"); bpy.ops.render.render(write_still=True)
    log("proofs", tag)

FACESETS = [("smile", {"Smile": .8}), ("grin", {"Smile": 1, "Open": .4}), ("joy", {"Happy": 1, "Smile": 1, "Open": .7}), ("sad", {"Sad": 1, "Frown": .8}),
            ("angry", {"Angry": 1, "Frown": 1, "Open": .2}), ("shock", {"Wide": 1, "O": 1}), ("blink", {"Smile": .8, "Blink": 1}), ("smug", {"Half": .5, "Smile": .7}),
            ("blep", {"Smile": .4, "Blep": 1}), ("love", {"Happy": 1, "Smile": 1, "Blush": 1}), ("pout", {"Frown": .8, "Blush": .4}), ("neutral", {}),
            ("eyetall", {"EyeTall": 1, "Smile": .8}), ("eyewide", {"EyeWide": 1, "Smile": .8}), ("tall_sad", {"EyeTall": 1, "Sad": 1, "Frown": .8}), ("wide_angry", {"EyeWide": 1, "Angry": 1, "Frown": 1})]
def faces_sheet(head, body):
    sc = scene(); cam = sc.camera
    for o in sc.objects:
        if o.type == "MESH": o.hide_render = o not in (head, body)
    cam.location = (0, 1.25, 1.3); cam.rotation_euler = (V(0, 0, 1.265) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = sc.render.resolution_y = 420
    for nm_, ks in FACESETS:
        for kb in head.data.shape_keys.key_blocks[1:]: kb.value = ks.get(kb.name, 0)
        sc.render.filepath = os.path.join(PROOF, f"face_{nm_}.png"); bpy.ops.render.render(write_still=True)
    for kb in head.data.shape_keys.key_blocks[1:]: kb.value = 0
    sc.render.resolution_x = sc.render.resolution_y = 900

def species_sheet(heads, body, SEX):
    sc = scene(); cam = sc.camera
    cam.location = (.55, 1.35, 1.38); cam.rotation_euler = (V(0, 0, 1.25) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = sc.render.resolution_y = 360
    for name, head in heads.items():
        for o in sc.objects:
            if o.type == "MESH": o.hide_render = o not in (head, body)
        for kb in head.data.shape_keys.key_blocks[1:]: kb.value = .8 if kb.name == "Smile" else 0
        sc.render.filepath = os.path.join(PROOF, f"sp_{SEX}_{name}.png"); bpy.ops.render.render(write_still=True)
    sc.render.resolution_x = sc.render.resolution_y = 900

def export(path, rig, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig] + objs: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, export_apply=False, use_selection=True, export_morph=True, export_skins=True, export_animations=False, export_yup=True)
    log("export", os.path.basename(path), os.path.getsize(path) // 1024, "KB")

def export_head(path, rig, head, name):
    # the head's materials go out under their slot names (fur, pupil, ...) so the game can tint them
    renamed = []
    for m in head.data.materials:
        slot = m.name[len(name) + 1:] if m.name.startswith(name + "_") else None
        if not slot: continue
        clash = bpy.data.materials.get(slot)
        if clash and clash != m: clash.name = slot + "__keep"; renamed.append((clash, slot))
        renamed.append((m, m.name)); m.name = slot
    export(path, rig, [head])
    for m, old in reversed(renamed): m.name = old

# ================= animation: bouncy cartoon clips named the way the game's movement reads them =================
# Idle, Walk, Run, Sprint, Sit live in the body GLB (scripts/humanoid-locomotion.js plays clips by these names; NPCs too).
# Every pose is written as rotations in the WORLD rest frame and turned into each bone's own frame (L = R^-1 W R).
from mathutils import Matrix
FPS = 30
def Rx(a): return Matrix.Rotation(math.radians(a), 3, 'X')
def Ry(a): return Matrix.Rotation(math.radians(a), 3, 'Y')
def Rz(a): return Matrix.Rotation(math.radians(a), 3, 'Z')
def pose_frame(rig, f, P):
    """P: {bone: Matrix3 world-frame rotation} and optional 'lift' (hips up, metres)"""
    for pb in rig.pose.bones:
        R = pb.bone.matrix_local.to_3x3(); W = P.get(pb.name)
        q = (R.inverted() @ W @ R).to_quaternion() if W is not None else Quaternion()
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=f)
    hp = rig.pose.bones["Hips"]; R = hp.bone.matrix_local.to_3x3()
    hp.location = R.inverted() @ Vector((P.get("sway", 0.0), 0, P.get("lift", 0.0))); hp.keyframe_insert("location", frame=f)
def arms(P, lower, swingR, swingL, elbowR, elbowL, out=0.0):
    for s, L, sw, el in ((1, "Right", swingR, elbowR), (-1, "Left", swingL, elbowL)):
        P[L + "Arm"] = Rx(sw) @ Ry(s * (lower - out))
        P[L + "ForeArm"] = Rz(s * el)
        P[L + "Hand"] = Rz(s * el * .25)
def legs(P, thR, thL, knR, knL, ftR=0.0, ftL=0.0):
    for L, th, kn, ft in (("Right", thR, knR, ftR), ("Left", thL, knL, ftL)):
        P[L + "UpLeg"] = Rx(th); P[L + "Leg"] = Rx(-kn); P[L + "Foot"] = Rx(ft)
def gait(n, thigh, knee, swing, elbow, lean, bob, roll, yaw, headbob=1.0, skip=0.0):
    frames = []
    for f in range(n + 1):
        ph = 2 * math.pi * f / n; sn, cs = math.sin(ph), math.cos(ph)
        P = {}
        swR = max(0.0, cs) ** 1.5; swL = max(0.0, -cs) ** 1.5           # each leg's swing (when it travels forward)
        legs(P, thigh * sn, -thigh * sn, 6 + knee * swR, 6 + knee * swL, -12 * sn + 10 * swR, 12 * sn + 10 * swL)
        arms(P, 72, -swing * sn, swing * sn, elbow + 8 * max(0, -sn), elbow + 8 * max(0, sn))
        P["Hips"] = Rz(yaw * sn) @ Ry(roll * sn) @ Rx(-lean * .3)
        P["Spine"] = Rx(-lean * .4)
        P["Spine01"] = Rz(-yaw * 1.2 * sn) @ Rx(-lean * .3)
        P["Spine02"] = Ry(-roll * .5 * sn)
        P["Head"] = Rx(lean * .9 + 4 * headbob * math.cos(2 * ph)) @ Ry(3 * headbob * sn)   # the head stays level and bobs
        P["lift"] = bob * (math.cos(2 * ph) * .5 + .5) + skip * max(0, math.sin(2 * ph)) ** 2 - bob * .5
        P["Tail"] = Rz(14 * sn); P["Tail1"] = Rz(18 * math.sin(ph - .8))
        P["EarL"] = Ry(-6 * max(0, math.cos(2 * ph))); P["EarR"] = Ry(6 * max(0, math.cos(2 * ph)))
        frames.append(P)
    return frames
def idle(n):
    frames = []
    for f in range(n + 1):
        ph = 2 * math.pi * f / n; br = math.sin(2 * ph)
        P = {}
        arms(P, 74 - 2 * br, 4 + 2 * math.sin(ph), 4 + 2 * math.sin(ph + .5), 14 + 3 * br, 14 + 3 * br)
        legs(P, 0, 0, 3 + 2 * max(0, br), 3 + 2 * max(0, -br))
        P["Hips"] = Ry(3 * math.sin(ph))
        P["Spine01"] = Rx(-1.5 * br) @ Ry(-1.5 * math.sin(ph))
        P["Head"] = Ry(-7 * math.sin(ph + .6)) @ Rx(2 * br)                                         # a slow curious head tilt
        P["lift"] = .006 * br
        P["Tail"] = Rz(12 * math.sin(ph)); P["Tail1"] = Rz(16 * math.sin(ph - .9))
        frames.append(P)
    return frames
def sit(n):
    frames = []
    for f in range(n + 1):
        ph = 2 * math.pi * f / n
        P = {}
        legs(P, 88, 88, 86 + 4 * math.sin(ph), 86 - 4 * math.sin(ph), -6, -6)                         # knees up, little feet swinging
        arms(P, 62, 38, 38, 42, 42)
        P["Spine01"] = Rx(-4); P["Head"] = Ry(6 * math.sin(ph)) @ Rx(3)
        P["lift"] = -.22
        P["Tail"] = Rz(10 * math.sin(ph))
        frames.append(P)
    return frames
CLIPS = {
    "Idle":   (lambda: idle(72), 2),
    "Walk":   (lambda: gait(30, 30, 46, 26, 16, 5, .03, 4, 6, 1.0, .012), 1),
    "Run":    (lambda: gait(20, 44, 80, 42, 70, 12, .045, 3, 8, .8, .02), 1),
    "Sprint": (lambda: gait(16, 54, 100, 56, 88, 18, .05, 2, 9, .6, .025), 1),
    "Sit":    (lambda: sit(48), 3),
}
def build_anims(rig):
    rig.animation_data_create()
    for name, (fn, step) in CLIPS.items():
        act = bpy.data.actions.new(name); rig.animation_data.action = act
        frames = fn()
        for i, P in enumerate(frames):
            if i % step and i != len(frames) - 1: continue
            pose_frame(rig, i, P)
        tr = rig.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 0, act); st.name = name
        rig.animation_data.action = None
    for pb in rig.pose.bones: pb.rotation_quaternion = Quaternion(); pb.location = Vector()
    log("anims", list(CLIPS))
def anim_proof(rig, objs, tag):
    sc = scene(); cam = sc.camera
    for o in sc.objects:
        if o.type == "MESH": o.hide_render = o not in objs
    sc.render.resolution_x = sc.render.resolution_y = 360
    cam.location = (2.6, 1.6, 1.0); cam.rotation_euler = (V(0, 0, .8) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for clip, frames in (("Idle", (0, 18)), ("Walk", (0, 8, 15)), ("Run", (5,)), ("Sit", (0,))):
        act = bpy.data.actions[clip]; rig.animation_data.action = act
        for fr in frames:
            sc.frame_set(fr); sc.render.filepath = os.path.join(PROOF, f"anim_{tag}_{clip}_{fr}.png"); bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None; sc.frame_set(0)
    sc.render.resolution_x = sc.render.resolution_y = 900

def export_body(path, rig, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig] + objs: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, export_apply=False, use_selection=True, export_morph=True, export_skins=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_yup=True)
    log("export", os.path.basename(path), os.path.getsize(path) // 1024, "KB")

# ================= main =================
def run_sex(SEX):
    reset(); MATS.clear()
    F = SEX == "f"
    rig = build_rig()
    body = build_body(F); auto_weights(body, rig); parent_to(body, rig)
    G = build_garments(F, body, rig); log("body + garments", SEX, tris(body), len(G))
    heads = {}
    for name, sp in SP.items(): heads[name] = build_head(name, sp, rig, F)
    log("heads", len(heads))
    if STAGE in ("all", "proof"):
        names = list(SP)
        looks = [[body, heads[names[0]], G["Top_dress" if F else "Top_tee"], G["Shoes_sneakers"]] + ([G["Hat_bow"]] if F else [G["Bot_shorts"]]),
                 [body, heads[names[min(1, len(names) - 1)]], G["Top_hoodie"], G["Bot_pants" if not F else "Bot_skirt"], G["Shoes_boots"]],
                 [body, heads[names[min(3, len(names) - 1)]]]]
        for o in heads.values():
            if o.data.shape_keys: o.data.shape_keys.key_blocks["Smile"].value = .8
        proof(SEX, looks)
        if SEX == SEXES[0]: faces_sheet(heads[names[0]], body)
        species_sheet(heads, body, SEX)
    build_anims(rig)
    if STAGE in ("all", "proof", "anim"):
        anim_proof(rig, [body, heads[list(SP)[0]], G["Top_tee"], G["Bot_shorts"] if SEX == "m" else G["Bot_skirt"], G["Shoes_sneakers"]], SEX)
    for o in heads.values():
        if o.data.shape_keys: o.data.shape_keys.key_blocks["Smile"].value = 0
    if STAGE in ("all", "export"):
        export_body(os.path.join(OUT, f"critter-{SEX}.glb"), rig, [body] + list(G.values()))
        for name, o in heads.items(): export_head(os.path.join(OUT, f"critter-sp-{name}-{SEX}.glb"), rig, o, name)

for SEX in SEXES: run_sex(SEX)
log("done")
