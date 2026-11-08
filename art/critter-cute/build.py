# Cute critters (Dandy's World OC bases x Sanrio): a big round head with huge oval eyes and matte black pupils, a little bean body,
# noodle arms with mitten hands, round bean feet; girls get a soft waist, hips and a modest bust. Clean simple shapes, no snouts.
# Same contract as art/critter/build.py so scripts/lib/critter-model.js wears it unchanged:
#   critter-<m|f>.glb   rig + Body + every garment as its own skinned mesh (Top_*, Bot_*, Shoes_*, Hat_*, Eyew_*, Neck_*)
#   critter-sp-<sp>.glb rig + one head mesh (head, face, ears, tail, extras) with shape keys
#                       Blink Happy Sad Angry Wide Half Smile Open Frown O Blep Blush EyeTall EyeWide | FT_Round FT_Long FT_Broad FT_Narrow FT_Heart FT_Square FT_Snub FT_Snout FT_Chubby (face types)
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
    sel(*objs); bpy.ops.object.join(); o = bpy.context.active_object; o.name = o.data.name = name
    recalc(o); smooth(o)
    return o
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
HC = V(0, 0, 1.265); HR = (.304, .276, .272)   # the head: a soft kemono ball with plush cheeks and a gentle 3D muzzle cushion
EAR_UV = (.6, .78)
CUR_SP = None
def head_dir(u, v): return Vector((math.sin(u) * math.cos(v), math.cos(u) * math.cos(v), math.sin(v)))
def head_r(d):
    sp = CUR_SP or {}
    wd = sp.get("wide", 1.0)
    r = 1 / math.sqrt((d.x / (HR[0] * wd)) ** 2 + (d.y / HR[1]) ** 2 + (d.z / HR[2]) ** 2)
    # plush lower-cheek pouches (wider & softer around the lower sides and front-cheeks)
    ck = sp.get("cheek", 1.18 if sp.get("fluff") else 1.05)
    side = (abs(d.x) / (abs(d.x) + abs(d.y) * .65 + 1e-6)) ** .85
    front_bias = max(0.0, 0.55 + 0.45 * d.y)
    cheek_swell = .095 * ck * math.exp(-((d.z + .24) / .28) ** 2) * side * front_bias
    # gentle chin tuck underneath so the jaw meets the neck cleanly (only underside, not front jaw)
    chin_tuck = -.035 * max(0.0, -d.z - .52) * (1.0 - abs(d.x) * .7) * max(0.0, 1.0 - max(0.0, d.y - 0.05) * 2.5)
    # 3D sculpted animal muzzle / snout loaf
    L = sp.get("snout", .026 if sp.get("muzzle") else .016) * sp.get("snoutK", 2.1)
    sw = sp.get("snoutW", .26) * wd
    br = sp.get("bridge", 0.0)
    muz = 0.0
    if d.y > 0.05:
        # Kemono animal muzzle: forward projection centered around the nose and mouth (z ~ -0.22)
        z_ctr = -0.22
        z_top = -0.08 + (0.10 * br if br else 0.0)
        z_bot = -0.38
        if z_bot < d.z < z_top:
            v_t = (d.z - z_ctr) / (z_top - z_ctr if d.z > z_ctr else z_ctr - z_bot)
            w_taper = (1.0 - (0.50 if br else 0.35) * max(0.0, v_t)) if d.z > z_ctr else (1.0 - 0.20 * max(0.0, v_t))
            u_t = d.x / max(0.01, sw * w_taper)
            q = u_t * u_t + v_t * v_t
            if q < 1.0:
                fwd = math.sin(max(0.0, min(1.0, (d.y - 0.05) / 0.50)) * (math.pi / 2))
                profile = (1.0 - q) ** 1.6
                muz = L * profile * fwd
        # Mandibular chin shelf supporting the lower jaw and mouth cavity
        z_chin_ctr = -0.38
        z_chin_top = -0.26
        z_chin_bot = -0.56
        if z_chin_bot < d.z < z_chin_top:
            v_c = (d.z - z_chin_ctr) / (z_chin_top - z_chin_ctr if d.z > z_chin_ctr else z_chin_ctr - z_chin_bot)
            u_c = d.x / max(0.01, sw * 0.65)
            qc = u_c * u_c + v_c * v_c
            if qc < 1.0:
                fwd_c = math.sin(max(0.0, min(1.0, (d.y - 0.05) / 0.45)) * (math.pi / 2))
                chin_shelf = L * 0.58 * ((1.0 - qc) ** 1.4) * fwd_c
                muz = max(muz, chin_shelf)
        # Twin plush whisker cushions / pads (kemono :3 muzzle lobes for cats, foxes, dogs, rodents)
        if sp.get("catnose") or sp.get("whisk"):
            pad_x = 0.065 * wd
            for s in (-1, 1):
                pmu = (d.x - s * pad_x) / (sw * 0.40)
                pmv = (d.z - (-0.23)) / 0.080
                pq = pmu * pmu + pmv * pmv
                if pq < 1.0:
                    pw = L * 0.35 * ((1.0 - pq) ** 1.6) * max(0.0, min(1.0, (d.y - 0.05) * 2.8))
                    muz = max(muz, pw)
    return r * (1.0 + cheek_swell + chin_tuck) + muz
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
def torso_shapes(mb, F, inflate=0.0, lo=0.0, hi=9.0, sleeves=None, legs=None, bust=True, crotch=True):
    i = inflate
    if lo <= .65 <= hi:
        if crotch:
            if F:
                ell(mb, (0, -.006, .668), .140 + i, .095 + i, .084 + i)                                           # smooth high-hip flare from waist
                ell(mb, (0, -.008, .622), .156 + i, .106 + i, .094 + i)                                           # wide curvy female hips & pelvis
                ell(mb, (0, .016, .662), .094 + i, .078 + i, .074 + i)                                            # soft lower tummy curve
                for s in (-1, 1): ell(mb, (.054 * s, -.058, .606), .076 + i, .076 + i, .082 + i)                  # twin sculpted rounded glutes/seat
            else:
                ell(mb, (0, -.006, .645), .114 + i, .090 + i, .088 + i)                                           # sturdy male pelvis
                for s in (-1, 1): ell(mb, (.046 * s, -.044, .612), .058 + i, .056 + i, .068 + i)                  # male seat
        else:
            # Tops: horizontal tubular hem around hips without dipping into the crotch
            if F:
                ell(mb, (0, -.006, .682), .138 + i, .094 + i, .040 + i)
            else:
                ell(mb, (0, -.006, .678), .116 + i, .090 + i, .038 + i)
    if lo <= .77 <= hi:
        if F: ell(mb, (0, -.005, .768), .096 + i, .074 + i, .080 + i)                                         # smooth curvy hourglass female waist
        else: ell(mb, (0, 0, .768), .104 + i, .082 + i, .088 + i)                                             # tapered male waist
    if lo <= .88 <= hi:
        if F:
            ell(mb, (0, -.008, .868), .095 + i, .068 + i, .076 + i)                                           # feminine ribcage
            ell(mb, (0, -.004, .912), .094 + i, .066 + i, .058 + i)                                           # upper chest / collarbone bridge
        else:
            ell(mb, (0, .004, .878), .126 + i, .090 + i, .088 + i)                                            # broad male chest
            for s in (-1, 1): ell(mb, (.052 * s, .032, .882), .062 + i, .052 + i, .056 + i)                   # subtle masculine pec contour
    if F and bust and lo <= .88 <= hi:
        ell(mb, (0, .038 + i * .22, .850), .046 + i, .038 + i, .048 + i)                                   # smooth sternum valley bridge
        for s in (-1, 1):
            # natural rounded breasts: soft lower-pole fullness, gentle hemispherical dome, no conical forward point
            ell(mb, (.056 * s, .066 + i * .30, .846), .070 + i, .063 + i, .065 + i, rot=(math.radians(-4), 0, math.radians(-6 * s)))
            # gentle upper teardrop slope from collarbone
            ell(mb, (.052 * s, .052 + i * .24, .882), .060 + i, .048 + i, .054 + i)
            # smooth underbust support cradle blending into ribcage
            ell(mb, (.054 * s, .048 + i * .25, .820), .064 + i, .048 + i, .046 + i)
            # lateral pectoral curve wrapping into axilla
            ell(mb, (.078 * s, .040 + i * .20, .854), .054 + i, .042 + i, .054 + i)
    if lo <= .94 <= hi:
        for s in (-1, 1):
            ell(mb, ((.098 if F else .114) * s, -.004, .942), (.044 if F else .052) + i, (.040 if F else .048) + i, (.042 if F else .048) + i)
            if F: ell(mb, (.082 * s, .014, .916), .044 + i, .042 + i, .044 + i)                               # smooth shoulder-to-bust bridge (no armpit crease)
    if sleeves:
        for s in (-1, 1):
            cap(mb, (.105 * s, -.002, .945), (min(sleeves, .33) * s, -.004, .952), (.034 if F else .039) + i)
            if sleeves > .33:
                cap(mb, (.33 * s, -.004, .952), (sleeves * s, 0, .955), (.028 if F else .032) + i)
                if sleeves >= .42: ell(mb, (.385 * s, .002, .953), .062 + i, (.035 if F else .040) + i, (.035 if F else .040) + i)
    if legs:
        for s in (-1, 1):
            cap(mb, (.090 * s, 0, .61), (.090 * s, .004, max(legs, .34)), (.050 if F else .048) + i)
            if F: ell(mb, (.092 * s, -.004, .525), .068 + i, .066 + i, .115 + i, rot=(0, math.radians(5 * s), 0)) # lush curvy thighs
            else: ell(mb, (.090 * s, 0, .515), .056 + i, .056 + i, .105 + i)
            if legs < .34:
                cap(mb, (.090 * s, .004, .34), (.090 * s, -.005, max(legs, .1)), (.041 if F else .043) + i)
                ell(mb, (.090 * s, -.010, .235), (.048 if F else .049) + i, .052 + i, .082 + i)

def add_bust_key(o):
    if not o.data.shape_keys: o.shape_key_add(name="Basis")
    sk = o.shape_key_add(name="Bust")
    for i, v in enumerate(o.data.vertices):
        p = v.co
        if p.y <= 0.005 or p.z < 0.76 or p.z > 0.95 or abs(p.x) > 0.17:
            sk.data[i].co = p.copy(); continue
        s = 1 if p.x >= 0 else -1
        dx = (abs(p.x) - 0.056) / 0.092
        dz = (p.z - 0.848) / 0.078
        dy = max(0.0, min(1.0, (p.y - 0.005) / 0.065))
        r2 = dx * dx + dz * dz
        if r2 < 1.0:
            # smooth cosine bell curve produces a soft rounded dome at the apex (no pointy peak)
            r = math.sqrt(r2)
            w = 0.5 * (1.0 + math.cos(math.pi * r)) * dy
        else:
            w = 0.0
        # keep cleavage valley moving smoothly when garments stretch across the chest
        dz_b = min(1.0, abs(dz))
        wb = 0.5 * (1.0 + math.cos(math.pi * dz_b)) * dy * max(0.0, 1.0 - (p.x / 0.065) ** 2) * 0.55
        w = max(w, wb)
        if w > 1e-4:
            out_x = s * 0.014 * w * min(1.0, abs(p.x) / 0.056)
            sk.data[i].co = p + Vector((out_x, 0.034 * w, (-0.008 + 0.008 * dz) * w))
        else:
            sk.data[i].co = p.copy()

def build_body(F):
    mb, o = mball("CBody", 0.0045)
    torso_shapes(mb, F, sleeves=.498, legs=.10)
    cap(mb, (0, 0, .93), (0, 0, 1.12), .046)                                                               # neck, buried in the head
    digits = []
    for s in (-1, 1):
        # sculpted plush paw-palm cushion at the wrist
        ell(mb, (.544 * s, .004, .955), .050, .048, .040)
        ell(mb, (.536 * s, .024, .952), .030, .026, .026)                                                   # smooth thumb-web transition
        # 4 plump, sculpted paw-hand digits (opposable Thumb + 3 rounded finger digits with natural 3D curve)
        th_pts = [(.526 * s, .024, .952), (.550 * s, .050, .946), (.570 * s, .064, .938)]
        th, _ = tube(f"Thumb_{s}", th_pts, [.020, .018, .016], 12); digits.append(th)
        for fnm, y0, y1, y2, z0, z1, z2, x1, x2, r0 in (
            ("Idx",  .024,  .028,  .032, .954, .948, .942, .588, .612, .0185),
            ("Mid",  .000,  .000,  .000, .955, .950, .944, .594, .620, .0192),
            ("Rng", -.024, -.028, -.032, .954, .948, .942, .586, .608, .0180),
        ):
            fpts = [(.558 * s, y0, z0), (x1 * s, y1, z1), (x2 * s, y2, z2)]
            fg, _ = tube(f"Fing_{fnm}_{s}", fpts, [r0, r0 * .96, r0 * .90], 12); digits.append(fg)
        # sculpted paw-feet with 3 distinct rounded toes
        ell(mb, (.090 * s, .028, .048), .056, .084, .048)
        for ti in (-1, 0, 1):
            tx = (.090 + .027 * ti * s) * s
            ty0, ty1 = .072 - .005 * abs(ti), .106 - .006 * abs(ti)
            tpts = [(tx, ty0, .042), (tx, (ty0 + ty1) * .5, .040), (tx, ty1, .036)]
            to, _ = tube(f"Toe_{ti}_{s}", tpts, [.021, .020, .018], 12); digits.append(to)
    sel(o); bpy.ops.object.convert(target='MESH'); base = bpy.context.active_object
    raw = join([base] + digits, "BodyRaw")
    r = raw.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = 0.0038; sel(raw); bpy.ops.object.modifier_apply(modifier="vox")
    sm = raw.modifiers.new("sm", "SMOOTH"); sm.iterations = 3; sm.factor = 0.48; bpy.ops.object.modifier_apply(modifier="sm")
    if tris(raw) > 12000:
        d = raw.modifiers.new("dec", "DECIMATE"); d.ratio = 12000 / tris(raw); bpy.ops.object.modifier_apply(modifier="dec")
    smooth(raw); raw.name = raw.data.name = "Body"; body = raw
    if F: add_bust_key(body)
    # materials: fur (torso), limb (arms, legs, hands, feet), pad (pink paw pads & toe beans), belly
    body.data.materials.clear()
    body.data.materials.append(mat("fur", "#f2a65a"))
    body.data.materials.append(mat("limb", "#f2a65a"))
    body.data.materials.append(mat("pad", "#ff9fb4", 0.6))
    body.data.materials.append(mat("belly", "#fff1dc"))
    for p in body.data.polygons:
        c = p.center; n = p.normal; ax = abs(c.x)
        palm_pad = (.518 < ax < .570 and abs(c.y - .004) < .030 and c.z < .952 and n.z < -.32)
        ftip_pad = (ax > .548 and c.z < .954 and n.z < -.28 and (
            ((ax - .604) / .016) ** 2 + ((c.y - .030) / .014) ** 2 < 1.0 or
            ((ax - .612) / .016) ** 2 + (c.y / .014) ** 2 < 1.0 or
            ((ax - .600) / .016) ** 2 + ((c.y + .030) / .014) ** 2 < 1.0 or
            ((ax - .564) / .015) ** 2 + ((c.y - .058) / .015) ** 2 < 1.0
        ))
        sole_pad = (c.z < .018 and ax > .036 and -.012 < c.y < .085 and n.z < -.38)
        if palm_pad or ftip_pad or sole_pad:
            p.material_index = 2; continue
        limb = ax > .15 or c.z < .555
        p.material_index = 1 if limb else 0
    return body

# ---- garments: soft shells a little bigger than the body part they cover ----
def mb_part(name, fn, voxel=.0055, target=5200):
    mb, o = mball("G" + name.replace("_", ""), voxel); fn(mb); return mb_mesh(o, voxel, 2, target, name)
def lathe(name, prof, segs=48, ruffle=0.0, flare_front=0.0, flare_x=1.12, cy=-0.006):
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        ring = []
        for j in range(segs):
            a = j / segs * 2 * math.pi; rr = r * (1 + ruffle * math.sin(a * 8) * (1 if z < prof[0][1] - .04 else 0))
            ring.append(bm.verts.new((math.cos(a) * rr * flare_x, cy + math.sin(a) * rr * (0.93 + flare_front), z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(segs): bm.faces.new((rings[i][j], rings[i][(j + 1) % segs], rings[i + 1][(j + 1) % segs], rings[i + 1][j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene().collection.objects.link(o)
    so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = .008; so.offset = 1; sel(o); bpy.ops.object.modifier_apply(modifier="so"); recalc(o); smooth(o)
    return o

def build_garments(F, body, rig):
    G = {}
    TOP_INFLATE = {"tee": .020, "tank": .018, "longsleeve": .020, "pajamas": .021, "sweater": .024, "hoodie": .024, "jacket": .027, "dress": .018, "apron": None}
    TOP_LO = {"tee": .64, "tank": .65, "longsleeve": .64, "pajamas": .64, "sweater": .64, "hoodie": .64, "jacket": .64, "dress": .72, "apron": None}
    def top(kind):
        def fn(mb):
            sl = {"tee": .25, "tank": None, "longsleeve": .49, "hoodie": .49, "sweater": .48, "jacket": .49, "pajamas": .49, "dress": .22, "apron": None}[kind]
            inf = TOP_INFLATE[kind]
            lo_z = TOP_LO[kind]
            torso_shapes(mb, F, inf, lo_z, 9, sleeves=sl, crotch=False)
            if kind == "sweater":
                for s in (-1, 1): ball(mb, (.48 * s, 0, .953), .048 + inf)
            if kind == "hoodie":
                ell(mb, (0, -.095, 1.02), .135 + inf, .080 + inf, .075 + inf)
                ell(mb, (0, -.030, 1.00), .110 + inf, .060 + inf, .050 + inf)
        return fn
    for kind in ("tee", "tank", "longsleeve", "hoodie", "sweater", "jacket", "pajamas"):
        g = mb_part("Top_" + kind, top(kind)); set_mat(g, "cloth_top", "#e85d75")
        extra = []
        if kind == "tee":
            # ribbed crewneck collar
            c = prim_torus((0, .012, .942), .066, .009, (math.radians(14), 0, 0), 28, 8); set_mat(c, "cloth_top"); extra.append(c)
            # sleeve hem cuffs
            for s in (-1, 1):
                cf = prim_cyl((.25 * s, 0, .953), .040, .018, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
            # waist hem band
            hm = prim_torus((0, -.004, .655), .114 if F else .116, .010, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
            # chest patch pocket
            pk = prim_sphere((-.052, .132 if F else .115, .845), .028, (1, .25, 1.1), 12, 6); set_mat(pk, "cloth_top"); extra.append(pk)
        elif kind == "tank":
            # scoop neck ribbed binding
            nb = prim_torus((0, .016, .932), .072, .008, (math.radians(15), 0, 0), 28, 8); set_mat(nb, "cloth_top"); extra.append(nb)
            # armhole binding rings
            for s in (-1, 1):
                ab = prim_torus((.105 * s, 0, .935), .046, .007, (0, math.pi / 2, 0), 24, 8); set_mat(ab, "cloth_top"); extra.append(ab)
            # waist hem band
            hm = prim_torus((0, -.004, .665), .110 if F else .112, .008, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
        elif kind == "longsleeve":
            # crewneck collar ribbing
            c = prim_torus((0, .012, .942), .066, .009, (math.radians(14), 0, 0), 28, 8); set_mat(c, "cloth_top"); extra.append(c)
            # ribbed wrist cuffs
            for s in (-1, 1):
                cf = prim_cyl((.485 * s, 0, .955), .035, .026, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
            # waist hem band
            hm = prim_torus((0, -.004, .655), .114 if F else .116, .010, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
        elif kind == "hoodie":
            # hood cowl opening rim wrapping collar
            hrim = prim_torus((0, -.015, .985), .078, .016, (math.radians(-8), 0, 0), 28, 8); set_mat(hrim, "cloth_top"); extra.append(hrim)
            # sleek 3D kangaroo front pouch pocket
            kp = prim_sphere((0, .136 if F else .120, .715), .052, (1.45, .22, .72), 18, 10); set_mat(kp, "cloth_top"); extra.append(kp)
            # pocket side entry welts
            for s in (-1, 1):
                w = prim_cyl((.066 * s, .130 if F else .116, .715), .006, .038, (0, math.radians(24 * s), 0), 10); set_mat(w, "cloth_top"); extra.append(w)
            # ribbed waist hem band
            hm = prim_torus((0, -.004, .655), .114 if F else .116, .012, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
            # ribbed wrist cuffs
            for s in (-1, 1):
                cf = prim_cyl((.485 * s, 0, .955), .038, .032, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
            # dangling cords with silver metallic aglets
            for s in (-1, 1):
                str_, _ = tube(f"hstr_{s}", [(.030 * s, .135 if F else .116, .915), (.036 * s, .140 if F else .122, .860), (.038 * s, .138 if F else .120, .800)], [.0045, .0045, .004], 8)
                set_mat(str_, "button", "#f4f1ea"); extra.append(str_)
                ag = prim_cyl((.038 * s, .138 if F else .120, .795), .005, .018, (0, 0, 0), 8); set_mat(ag, "metal", "#c8c8d0", .3, .85); extra.append(ag)
        elif kind == "sweater":
            # chunky rolled turtleneck collar
            sc = prim_torus((0, .01, .950), .068, .015, (math.radians(10), 0, 0), 28, 10); set_mat(sc, "cloth_top"); extra.append(sc)
            # chunky ribbed waist hem
            hm = prim_torus((0, -.004, .655), .114 if F else .116, .013, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
            # chunky ribbed wrist cuffs
            for s in (-1, 1):
                cf = prim_cyl((.480 * s, 0, .954), .040, .034, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
        elif kind == "jacket":
            # folded collar and lapels
            c = prim_torus((0, 0, .995), .072, .016, (0, 0, 0), 28, 8); set_mat(c, "cloth_top"); extra.append(c)
            for s in (-1, 1):
                lap = prim_sphere((.045 * s, .142 if F else .122, .925), .034, (.9, .3, 1.2), 12, 8)
                lap.rotation_euler = (math.radians(-14), 0, math.radians(-18 * s)); set_mat(lap, "cloth_top"); extra.append(lap)
            # center metallic zipper placket
            z = prim_cyl((0, .148 if F else .118, .825), .0065, .23, (math.radians(8 if F else 0), 0, 0), 8); set_mat(z, "metal", "#c8c8d0", .35, .85); extra.append(z)
            z_slide = prim_sphere((0, .155 if F else .124, .850), .012, (.8, 1.4, 1.2), 10, 6); set_mat(z_slide, "metal", "#c8c8d0", .3, .9); extra.append(z_slide)
            z_pull = prim_cyl((0, .160 if F else .128, .832), .004, .024, (math.radians(12), 0, 0), 8); set_mat(z_pull, "metal", "#c8c8d0", .3, .9); extra.append(z_pull)
            # twin flap chest pockets with snap rivets
            for s in (-1, 1):
                fl = prim_sphere((.070 * s, .140 if F else .120, .855), .030, (1.3, .3, .5), 12, 6); set_mat(fl, "cloth_top"); extra.append(fl)
                sn = prim_sphere((.070 * s, .148 if F else .128, .850), .007, seg=8, ring=6); set_mat(sn, "metal", "#c8c8d0", .3, .9); extra.append(sn)
                wp = prim_cyl((.075 * s, .126 if F else .114, .730), .0065, .042, (0, math.radians(28 * s), 0), 8); set_mat(wp, "cloth_top"); extra.append(wp)
            # bottom hem band & wrist cuffs
            hm = prim_torus((0, -.004, .650), .116 if F else .120, .011, (0, 0, 0), 32, 8)
            hm.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(hm, "cloth_top"); extra.append(hm)
            for s in (-1, 1):
                cf = prim_cyl((.485 * s, 0, .955), .038, .026, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
        elif kind == "pajamas":
            # classic notched pajama collar & lapels
            c = prim_torus((0, 0, .985), .066, .013, (math.radians(6), 0, 0), 24, 8); set_mat(c, "cloth_top"); extra.append(c)
            for s in (-1, 1):
                lap = prim_sphere((.042 * s, .138 if F else .116, .915), .030, (.9, .25, 1.1), 12, 6)
                lap.rotation_euler = (math.radians(-12), 0, math.radians(-16 * s)); set_mat(lap, "cloth_top"); extra.append(lap)
            # front buttons
            for zz in (.90, .84, .78, .72):
                by = (.150 if zz > .80 else .108) if F else .116
                b = prim_sphere((0, by, zz), .011, (1, .55, 1), 10, 6); set_mat(b, "button", "#f4f1ea", .4); extra.append(b)
            # breast pocket
            pk = prim_sphere((-.056, .136 if F else .116, .835), .026, (1.1, .25, 1.1), 12, 6); set_mat(pk, "cloth_top"); extra.append(pk)
            # relaxed sleeve cuffs
            for s in (-1, 1):
                cf = prim_cyl((.485 * s, 0, .955), .036, .024, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); extra.append(cf)
        G["Top_" + kind] = join([g] + extra, "Top_" + kind) if extra else g

    # dress: fitted curvy bodice with scoop neckline trim, puff sleeve cuffs, cinched waist sash/belt, and flared tiered ruffle skirt
    bod = mb_part("Top_dress", top("dress")); set_mat(bod, "cloth_top")
    nt = prim_torus((0, .014, .928), .066, .007, (math.radians(12), 0, 0), 28, 8); set_mat(nt, "cloth_top")
    sl_cuffs = []
    for s in (-1, 1):
        cf = prim_cyl((.22 * s, 0, .953), .038, .016, (0, math.pi / 2, 0), 16); set_mat(cf, "cloth_top"); sl_cuffs.append(cf)
    belt = prim_torus((0, -.004, .745), .104 if F else .110, .010, (0, 0, 0), 32, 8)
    belt.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(belt, "cloth_top")
    bow_lobes = [prim_sphere((.028 * s, .118 if F else .105, .745), .022, (1, .4, .6), 10, 6) for s in (-1, 1)]
    bow_knot = prim_sphere((0, .122 if F else .108, .745), .012, seg=8, ring=6)
    for o_ in bow_lobes + [bow_knot]: set_mat(o_, "cloth_top")
    sk = lathe("DressSkirt", [(.112 if F else .122, .760), (.155 if F else .145, .700), (.210 if F else .185, .610), (.275, .480), (.335, .340)], segs=48, ruffle=.032, flare_front=.04 if F else .0, flare_x=1.18 if F else 1.06); set_mat(sk, "cloth_top")
    rim = prim_torus((0, -.006, .340), .335, .008, (0, 0, 0), 48, 8); rim.scale = (1.18 if F else 1.06, .93 + (.04 if F else 0), 1.0); set_mat(rim, "cloth_top")
    G["Top_dress"] = join([bod, nt] + sl_cuffs + [belt] + bow_lobes + [bow_knot, sk, rim], "Top_dress")

    # apron: a fitted bib over the bust, cross-back straps, divided kangaroo utility pocket, and waist tie bow
    def apron(mb):
        ell(mb, (0, .092, .84), .085, .026, .09); ell(mb, (0, .112 if F else .102, .62), .145, .034, .125)
        if F:
            for s in (-1, 1):
                ell(mb, (.056 * s, .078, .848), .068, .060, .062, rot=(math.radians(-4), 0, math.radians(-6 * s)))
                ell(mb, (.052 * s, .064, .882), .060, .048, .052)
        for s in (-1, 1):
            cap(mb, (.06 * s, .092 if F else .075, .9), (.09 * s, -.02, 1.0), .013)
            cap(mb, (.09 * s, -.02, 1.0), (-.06 * s, -.09, .74), .012)
    ap = mb_part("Top_apron", apron); set_mat(ap, "cloth_top")
    pk = prim_sphere((0, .144 if F else .134, .60), .052, (1.25, .25, .72), 16, 8); set_mat(pk, "cloth_top")
    pk_div = prim_cyl((0, .152 if F else .142, .60), .003, .07, (0, 0, 0), 6); set_mat(pk_div, "button", "#f4f1ea")
    sash = prim_torus((0, -.005, .73), .102 if F else .110, .009, (0, 0, 0), 32, 8); set_mat(sash, "cloth_top")
    rear_bow = [prim_sphere((.030 * s, -.105 if F else -.095, .73), .024, (1, .4, .65), 10, 6) for s in (-1, 1)]
    rear_tails = [prim_cyl((.024 * s, -.108 if F else -.098, .67), .007, .11, (math.radians(10), math.radians(12 * s), 0), 8) for s in (-1, 1)]
    for o_ in rear_bow + rear_tails: set_mat(o_, "cloth_top")
    G["Top_apron"] = join([ap, pk, pk_div, sash] + rear_bow + rear_tails, "Top_apron")

    # bottoms: pants, shorts, pjpants, overalls, skirt, longskirt
    def pants(knee):
        def fn(mb):
            torso_shapes(mb, F, .012, .6, .78, legs=knee, bust=False)
        return fn
    for kind, knee in (("pants", .13), ("pjpants", .12), ("shorts", .44)):
        g = mb_part("Bot_" + kind, pants(knee)); set_mat(g, "cloth_bottom", "#3d5a98")
        extra = []
        if kind == "pants":
            # sculpted waistband
            wb = prim_torus((0, -.005, .748), .100 if F else .105, .009, (0, 0, 0), 32, 8)
            wb.scale = (1.05 if F else 1.0, .86 if F else .90, 1.0); set_mat(wb, "cloth_bottom"); extra.append(wb)
            # front fly placket and waist button
            fly = prim_cyl((0, .102 if F else .094, .705), .004, .065, (math.radians(8), 0, 0), 8); set_mat(fly, "cloth_bottom"); extra.append(fly)
            wb_btn = prim_sphere((0, .108 if F else .100, .748), .008, (1, .6, 1), 8, 6); set_mat(wb_btn, "metal", "#c8c8d0", .35, .85); extra.append(wb_btn)
            # belt loops
            for bx, by, rot in ((-.058, .096, 10), (.058, .096, -10), (-.108, 0, 0), (.108, 0, 0), (0, -.096, 0)):
                bl = prim_cyl((bx, by, .748), .0035, .022, (0, math.radians(rot), 0), 6); set_mat(bl, "cloth_bottom"); extra.append(bl)
            # twin back patch pockets
            for s in (-1, 1):
                bk = prim_sphere((.052 * s, -.090 if F else -.076, .615), .038, (1.1, .25, 1.2), 12, 6); set_mat(bk, "cloth_bottom"); extra.append(bk)
            # rolled ankle cuffs
            for s in (-1, 1):
                cuff = prim_torus((.090 * s, -.004, .145), .046, .012, (0, 0, 0), 20, 8); set_mat(cuff, "cloth_bottom"); extra.append(cuff)
        elif kind == "shorts":
            # waistband with button and belt loops
            wb = prim_torus((0, -.005, .748), .100 if F else .105, .009, (0, 0, 0), 32, 8)
            wb.scale = (1.05 if F else 1.0, .86 if F else .90, 1.0); set_mat(wb, "cloth_bottom"); extra.append(wb)
            wb_btn = prim_sphere((0, .108 if F else .100, .748), .008, (1, .6, 1), 8, 6); set_mat(wb_btn, "metal", "#c8c8d0", .35, .85); extra.append(wb_btn)
            for bx, by, rot in ((-.058, .096, 10), (.058, .096, -10), (0, -.096, 0)):
                bl = prim_cyl((bx, by, .748), .0035, .022, (0, math.radians(rot), 0), 6); set_mat(bl, "cloth_bottom"); extra.append(bl)
            # rolled thigh hem cuffs
            for s in (-1, 1):
                cuff = prim_torus((.090 * s, 0, .450), .058 if F else .056, .012, (0, 0, 0), 24, 8); set_mat(cuff, "cloth_bottom"); extra.append(cuff)
                bk = prim_sphere((.052 * s, -.090 if F else -.076, .615), .036, (1.1, .25, 1.2), 12, 6); set_mat(bk, "cloth_bottom"); extra.append(bk)
        elif kind == "pjpants":
            # gathered elastic waistband + front drawstring
            wb = prim_torus((0, -.005, .748), .100 if F else .104, .008, (0, 0, 0), 32, 8)
            wb.scale = (1.05 if F else 1.0, .86 if F else .90, 1.0); set_mat(wb, "cloth_bottom"); extra.append(wb)
            ds = prim_sphere((0, .106 if F else .098, .748), .009, seg=8, ring=6); set_mat(ds, "button", "#f4f1ea"); extra.append(ds)
            for s in (-1, 1):
                cf = prim_torus((.090 * s, -.004, .140), .046, .011, (0, 0, 0), 20, 8); set_mat(cf, "cloth_bottom"); extra.append(cf)
        G["Bot_" + kind] = join([g] + extra, "Bot_" + kind) if extra else g

    def overalls(mb):
        torso_shapes(mb, F, .026, .6, .78, legs=.14, bust=False)
        ell(mb, (0, .092 if F else .088, .81), .096, .036, .09)
        if F:
            for s in (-1, 1):
                ell(mb, (.056 * s, .086, .848), .074, .066, .066, rot=(math.radians(-4), 0, math.radians(-6 * s)))
                ell(mb, (.052 * s, .070, .882), .064, .052, .056)
        for s in (-1, 1):
            cap(mb, (.06 * s, .114 if F else .096, .88), (.08 * s, -.05, .97), .016)
            cap(mb, (.08 * s, -.05, .97), (.04 * s, -.09, .74), .015)
    ov = mb_part("Bot_overalls", overalls); set_mat(ov, "cloth_bottom")
    ov_extra = []
    # front bib patch pocket
    pk = prim_sphere((0, .130 if F else .116, .800), .046, (1.2, .25, .85), 12, 6); set_mat(pk, "cloth_bottom"); ov_extra.append(pk)
    # brass suspender buckles and button rivets
    for s in (-1, 1):
        bk = prim_torus((.06 * s, .140 if F else .112, .885), .016, .004, (math.radians(12), 0, 0), 16, 6); set_mat(bk, "gold", "#e8c35a", .35, .9); ov_extra.append(bk)
        bt = prim_sphere((.06 * s, .143 if F else .113, .880), .010, (1, .6, 1), 10, 6); set_mat(bt, "gold", "#e8c35a", .35, .9); ov_extra.append(bt)
        rv = prim_sphere((.128 * s, 0, .720), .008, seg=8, ring=6); set_mat(rv, "gold", "#e8c35a", .35, .9); ov_extra.append(rv)
        cuff = prim_torus((.090 * s, -.004, .155), .048, .013, (0, 0, 0), 20, 8); set_mat(cuff, "cloth_bottom"); ov_extra.append(cuff)
    G["Bot_overalls"] = join([ov] + ov_extra, "Bot_overalls")

    # skirts: flared pleated skirt and flowing tiered long skirt
    # skirt:
    wb_sk = prim_torus((0, -.005, .750), .102 if F else .108, .010, (0, 0, 0), 32, 8)
    wb_sk.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(wb_sk, "cloth_bottom")
    sk = lathe("Bot_skirt_body", [(.106 if F else .114, .750), (.155 if F else .145, .700), (.212 if F else .185, .610), (.265, .475)], segs=48, ruffle=.032, flare_front=.03 if F else 0, flare_x=1.18 if F else 1.06); set_mat(sk, "cloth_bottom")
    rim_sk = prim_torus((0, -.006, .475), .265, .007, (0, 0, 0), 48, 8); rim_sk.scale = (1.18 if F else 1.06, .93 + (.03 if F else 0), 1.0); set_mat(rim_sk, "cloth_bottom")
    G["Bot_skirt"] = join([wb_sk, sk, rim_sk], "Bot_skirt")

    # longskirt:
    wb_lsk = prim_torus((0, -.005, .750), .102 if F else .108, .010, (0, 0, 0), 32, 8)
    wb_lsk.scale = (1.14 if F else 1.02, .88 if F else .92, 1.0); set_mat(wb_lsk, "cloth_bottom")
    lsk = lathe("Bot_longskirt_body", [(.106 if F else .114, .750), (.155 if F else .145, .700), (.205 if F else .180, .610), (.245, .450), (.275, .280), (.300, .140)], segs=48, ruffle=.022, flare_front=.025 if F else 0, flare_x=1.18 if F else 1.06); set_mat(lsk, "cloth_bottom")
    rim_lsk = prim_torus((0, -.006, .140), .300, .007, (0, 0, 0), 48, 8); rim_lsk.scale = (1.18 if F else 1.06, .93 + (.025 if F else 0), 1.0); set_mat(rim_lsk, "cloth_bottom")
    G["Bot_longskirt"] = join([wb_lsk, lsk, rim_lsk], "Bot_longskirt")

    # shoes: sneakers with rubber toe cap, sidewall stripe, padded tongue & laces; boots with thick lugged treads & eyelets; slippers with fluffy collar, 3D animal ears & inner pads
    def shoe(kind):
        def fn(mb):
            for s in (-1, 1):
                ell(mb, (.090 * s, .042, .055), .066, .108, .06 if kind != "slippers" else .068)
                if kind == "boots": cap(mb, (.090 * s, 0, .06), (.090 * s, -.004, .25), .056)
        return fn
    for kind in ("sneakers", "boots", "slippers"):
        g = mb_part("Shoes_" + kind, shoe(kind)); set_mat(g, "cloth_shoes", "#f4f1ea")
        ex = []
        if kind == "sneakers":
            for s in (-1, 1):
                # rubber toe cap
                tc = prim_sphere((.090 * s, .112, .036), .042, (1.0, .85, .75), 14, 8); set_mat(tc, "button", "#f4f1ea", .5); ex.append(tc)
                # rubber sole
                so = prim_sphere((.090 * s, .042, .012), .071, (1.02, 1.62, .24), 22, 10); set_mat(so, "sole", "#2a2430", .85); ex.append(so)
                stripe = prim_torus((.090 * s, .042, .022), .072, .004, (0, 0, 0), 24, 6); stripe.scale = (1.02, 1.62, 1.0); set_mat(stripe, "button", "#f4f1ea"); ex.append(stripe)
                # padded tongue & collar rim
                tongue = prim_sphere((.090 * s, .056, .072), .034, (.85, .8, .6), 10, 6); set_mat(tongue, "cloth_shoes"); ex.append(tongue)
                collar = prim_torus((.090 * s, .005, .080), .042, .007, (math.radians(-10), 0, 0), 16, 6); set_mat(collar, "button", "#f4f1ea"); ex.append(collar)
                # laces
                for lz, ly in ((.045, .082), (.058, .068), (.070, .054)):
                    lace = prim_cyl((.090 * s, ly, lz), .004, .040, (0, math.pi / 2, 0), 8); set_mat(lace, "button", "#f4f1ea"); ex.append(lace)
                for e in (-1, 1):
                    loop = prim_sphere((.090 * s + .014 * e, .050, .078), .012, (.8, .4, .4), 8, 6); set_mat(loop, "button", "#f4f1ea"); ex.append(loop)
        elif kind == "boots":
            for s in (-1, 1):
                # chunky lugged sole
                so = prim_sphere((.090 * s, .042, .012), .072, (1.04, 1.64, .28), 22, 10); set_mat(so, "sole", "#221c20", .85); ex.append(so)
                ht = prim_cyl((.090 * s, -.025, .004), .048, .012, (0, 0, 0), 10); set_mat(ht, "sole"); ex.append(ht)
                tt = prim_cyl((.090 * s, .075, .004), .048, .012, (0, 0, 0), 10); set_mat(tt, "sole"); ex.append(tt)
                # reinforced toe cap and heel cup
                tc = prim_sphere((.090 * s, .108, .036), .044, (1.02, .85, .80), 14, 8); set_mat(tc, "cloth_shoes"); ex.append(tc)
                hc = prim_sphere((.090 * s, -.028, .045), .048, (.95, .8, .95), 14, 8); set_mat(hc, "cloth_shoes"); ex.append(hc)
                collar = prim_torus((.090 * s, -.004, .248), .052, .012, (0, 0, 0), 20, 8); set_mat(collar, "sole"); ex.append(collar)
                # speed hooks and heavy duty laces
                for lz in (.11, .15, .19):
                    for e in (-1, 1):
                        hk = prim_sphere((.090 * s + .022 * e, .036, lz), .005, seg=6, ring=4); set_mat(hk, "metal", "#c8c8d0", .35, .85); ex.append(hk)
                    lace = prim_cyl((.090 * s, .036, lz), .0035, .042, (0, math.pi / 2, 0), 6); set_mat(lace, "sole"); ex.append(lace)
        else: # slippers
            for s in (-1, 1):
                collar = prim_torus((.090 * s, .018, .072), .046, .011, (math.radians(-12), 0, 0), 20, 8); set_mat(collar, "cloth_shoes"); ex.append(collar)
                for e in (-1, 1):
                    ea = prim_sphere((.090 * s + .030 * e, .118, .112), .026, (1, .45, 1.3), 12, 8); set_mat(ea, "cloth_shoes"); ex.append(ea)
                    in_ea = prim_sphere((.090 * s + .030 * e, .124, .112), .018, (.7, .25, 1.0), 10, 6); set_mat(in_ea, "pad", "#ff9fb4", .6); ex.append(in_ea)
                nz = prim_sphere((.090 * s, .138, .054), .012, (1, .8, .8), 8, 6); set_mat(nz, "pad", "#ff9fb4", .6); ex.append(nz)
                so = prim_sphere((.090 * s, .042, .010), .068, (1, 1.55, .16), 18, 8); set_mat(so, "sole", "#3a3440"); ex.append(so)
        G["Shoes_" + kind] = join([g] + ex, "Shoes_" + kind)

    for nm, g in G.items():
        if F and (nm.startswith("Top_") or nm == "Bot_overalls"): add_bust_key(g)
        copy_weights(g, body); parent_to(g, rig)

    # hats, glasses and neckwear ride one bone
    R = HR[2]
    def dome(cut, rr=.296):
        o = prim_sphere(tuple(HC), rr, (HR[0] / HR[2], HR[1] / HR[2], 1), 40, 20)
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cut], context='VERTS'); bm.to_mesh(o.data); bm.free()
        so = o.modifiers.new("so", "SOLIDIFY"); so.thickness = .01; sel(o); bpy.ops.object.modifier_apply(modifier="so"); recalc(o); return o
    H = {}
    # beanie: chunky fold-up ribbed brim, slouchy crown, fluffy pom-pom
    b = dome(HC.z + .1); set_mat(b, "cloth_hat", "#e85d75")
    cf = prim_torus((0, 0, HC.z + .105), .272, .032, (0, 0, 0), 32, 10); cf.scale = (1.04, 1, 1); set_mat(cf, "cloth_hat")
    pom = prim_sphere((0, 0, HC.z + .315), .055, seg=18, ring=12); set_mat(pom, "cloth_hat")
    H["Hat_beanie"] = join([b, cf, pom], "Hat_beanie")

    # cap: curved visor, crown button, back opening
    c = dome(HC.z + .09, .294); set_mat(c, "cloth_hat")
    br = prim_sphere((0, .26, HC.z + .105), .175, (1.02, .85, .08), 28, 12); br.rotation_euler = (math.radians(-14), 0, 0); set_mat(br, "cloth_hat")
    btn = prim_sphere((0, 0, HC.z + .292), .016, (1, 1, .6), 10, 6); set_mat(btn, "cloth_hat")
    H["Hat_cap"] = join([c, br, btn], "Hat_cap")

    # crown: gold base band with top and bottom filigree rims, 5 scalloped peak cones with finial orbs, and inset gem jewels
    cr = prim_cyl((0, 0, HC.z + .285), .122, .065, verts=32); set_mat(cr, "gold", "#e8c35a", .25, .95)
    rim_b = prim_torus((0, 0, HC.z + .255), .124, .008, seg=32, mseg=6); set_mat(rim_b, "gold")
    rim_t = prim_torus((0, 0, HC.z + .315), .124, .008, seg=32, mseg=6); set_mat(rim_t, "gold")
    sp = [prim_cyl((math.cos(a) * .118, math.sin(a) * .118, HC.z + .355), .028, .075, verts=10, r2=0.0) for a in [i / 5 * 2 * math.pi for i in range(5)]]
    for s_ in sp: set_mat(s_, "gold")
    orbs = [prim_sphere((math.cos(a) * .118, math.sin(a) * .118, HC.z + .395), .011, seg=8, ring=6) for a in [i / 5 * 2 * math.pi for i in range(5)]]
    for ob in orbs: set_mat(ob, "gold")
    gems = [prim_sphere((math.cos(a) * .126, math.sin(a) * .126, HC.z + .285), .016, (1, .6, 1), 10, 6) for a in [i / 5 * 2 * math.pi + math.pi / 5 for i in range(5)]]
    for gm in gems: set_mat(gm, "cloth_hat")
    H["Hat_crown"] = join([cr, rim_b, rim_t] + sp + orbs + gems, "Hat_crown")

    # bow: volumetric ribbon lobes with natural center pinch, knot, and draped notched tails
    bc = head_pt(head_dir(.55, .62), .01)
    lobes = [prim_sphere(tuple(bc + V(dx, 0, dz)), .062, (1.05, .55, .78), 18, 12) for dx, dz in ((-.062, .03), (.062, -.03))]
    knot = prim_sphere(tuple(bc), .030, (1, .8, 1), 14, 10)
    tail_l = prim_cyl(tuple(bc + V(-.035, .01, -.075)), .016, .11, (math.radians(14), math.radians(-22), 0), 10)
    tail_r = prim_cyl(tuple(bc + V(.035, .01, -.075)), .016, .11, (math.radians(14), math.radians(22), 0), 10)
    for o_ in lobes + [knot, tail_l, tail_r]: set_mat(o_, "cloth_hat")
    H["Hat_bow"] = join(lobes + [knot, tail_l, tail_r], "Hat_bow")

    # flower: 5 layered blooming petals, gold stamen center, green leaf accent
    fc = head_pt(head_dir(-.5, .6), .01)
    pet = [prim_sphere(tuple(fc + V(math.cos(a) * .048, .01, math.sin(a) * .048)), .038, (1, .45, 1.05), 14, 10) for a in [i / 5 * 2 * math.pi for i in range(5)]]
    for o_ in pet: set_mat(o_, "cloth_hat")
    mid = prim_sphere(tuple(fc + V(0, .022, 0)), .028, (1, .6, 1), 14, 10); set_mat(mid, "gold")
    leaf = prim_sphere(tuple(fc + V(-.042, .005, -.035)), .032, (1.4, .25, .6), 10, 6); set_mat(leaf, "cloth_hat")
    H["Hat_flower"] = join(pet + [mid, leaf], "Hat_flower")

    # headphones: leatherette headband, metallic slider brackets, earcup shells with plush ear cushion rings
    band = prim_torus((0, 0, HC.z + .02), .308, .015, (math.pi / 2, 0, math.pi / 2), 32, 8); set_mat(band, "metal", "#c8c8d0", .35, .85)
    bm = bmesh.new(); bm.from_mesh(band.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < HC.z + .02], context='VERTS'); bm.to_mesh(band.data); bm.free()
    hparts = [band]
    for s in (-1, 1):
        brk = prim_cyl((.305 * s, 0, HC.z + .06), .012, .05, (0, 0, 0), 8); set_mat(brk, "metal", "#c8c8d0", .35, .85); hparts.append(brk)
        cup = prim_cyl((.305 * s, 0, HC.z), .088, .042, (0, math.pi / 2, 0), 24); set_mat(cup, "cloth_hat"); hparts.append(cup)
        cush = prim_torus((.290 * s, 0, HC.z), .074, .018, (0, math.pi / 2, 0), 24, 8); set_mat(cush, "button", "#2a2430", .8); hparts.append(cush)
    H["Hat_headphones"] = join(hparts, "Hat_headphones")

    # party hat: cone with zigzag gold bottom trim and fluffy pom topper
    ph = prim_cyl((.05, 0, HC.z + .38), .105, .26, (0, math.radians(12), 0), 24, 0.0); set_mat(ph, "cloth_hat")
    pp = prim_sphere((.08, 0, HC.z + .52), .034, seg=14, ring=10); set_mat(pp, "gold")
    rim_ph = prim_torus((.05, 0, HC.z + .255), .108, .012, (0, math.radians(12), 0), 24, 6); set_mat(rim_ph, "gold")
    H["Hat_partyhat"] = join([ph, pp, rim_ph], "Hat_partyhat")

    # tophat: flared stovepipe crown, curved satin brim, rich hatband ribbon with gold buckle
    th = prim_cyl((0, 0, HC.z + .36), .142, .20, verts=32, r2=.125); set_mat(th, "cloth_hat")
    tb = prim_cyl((0, 0, HC.z + .26), .220, .016, verts=32); set_mat(tb, "cloth_hat")
    rb = prim_cyl((0, 0, HC.z + .288), .130, .042, verts=32); set_mat(rb, "cloth_top")
    bkl = prim_torus((0, .132, HC.z + .288), .018, .004, (math.pi / 2, 0, 0), 14, 6); set_mat(bkl, "gold")
    H["Hat_tophat"] = join([th, tb, rb, bkl], "Hat_tophat")

    # eyewear: round stylish frames over eyes with nose pads, bridge, and temple arms reaching back to ears
    for kind in ("glasses", "shades"):
        parts = []
        for s in (-1, 1):
            d = head_dir(s * EYE_U, EYE_V); c_ = head_pt(d, .03)
            rg = prim_torus(tuple(c_), .085, .009, (0, 0, 0), 32, 8); rg.rotation_mode = 'QUATERNION'; rg.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); set_mat(rg, "metal", "#3a3440", .4, .6); parts.append(rg)
            if kind == "shades":
                ln = prim_cyl(tuple(c_), .08, .006, (0, 0, 0), 32); ln.rotation_mode = 'QUATERNION'; ln.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); set_mat(ln, "lens", "#1a1820", .2, .3); parts.append(ln)
            # temple arms reaching toward the ears
            arm_start = c_ + V(s * .085, -.02, 0)
            arm, _ = tube(f"temple_{kind}_{s}", [arm_start, arm_start + V(s * .02, -.16, .01), arm_start + V(s * .03, -.28, -.01)], [.005, .005, .004], 6)
            set_mat(arm, "metal", "#3a3440", .4, .6); parts.append(arm)
        a_, b_ = head_pt(head_dir(-.17, EYE_V + .05), .035), head_pt(head_dir(.17, EYE_V + .05), .035)
        br_, _ = tube("bridge", [a_, (a_ + b_) / 2 + V(0, .012, .01), b_], [.007, .007, .007], 6); set_mat(br_, "metal"); parts.append(br_)
        H["Eyew_" + kind] = join(parts, "Eyew_" + kind)
    for nm, o_ in H.items(): rigid(o_, "Head"); parent_to(o_, rig); G[nm] = o_

    # neckwear on the chest bone
    N_ = {}
    # scarf: double-wrap neck volume + layered drape tail with fringed tassels
    sc1 = prim_torus((0, 0, 1.002), .066, .026, (0, 0, 0), 32, 12); set_mat(sc1, "cloth_neck", "#f3c64a")
    sc2 = prim_torus((0, .01, .985), .070, .020, (math.radians(8), 0, 0), 28, 10); set_mat(sc2, "cloth_neck")
    tl, _ = tube("st", [(.03, .07, .99), (.052, .115, .90), (.048, .125, .81)], [.028, .026, .022], 12); set_mat(tl, "cloth_neck")
    tassels = []
    for ti in (-2, -1, 0, 1, 2):
        tas = prim_cyl((.048 + ti * .007, .125, .785), .003, .035, (0, 0, 0), 6); set_mat(tas, "cloth_neck"); tassels.append(tas)
    N_["Neck_scarf"] = join([sc1, sc2, tl] + tassels, "Neck_scarf")

    # bowtie: pleated wings with folded fabric center knot and full ribbon collar
    wings = [prim_sphere((.042 * s, .076, .985), .038, (1, .42, .68), 14, 10) for s in (-1, 1)]
    kn = prim_sphere((0, .080, .985), .018, (1, .9, 1.1), 12, 8)
    band = prim_torus((0, 0, .990), .054, .008, (0, 0, 0), 32, 8)
    for o_ in wings + [kn, band]: set_mat(o_, "cloth_neck")
    N_["Neck_bowtie"] = join(wings + [kn, band], "Neck_bowtie")

    # bell: stitched collar strap, metal belt buckle, shiny gold jingle bell with sound slit
    co = prim_torus((0, 0, 1.0), .054, .012, (0, 0, 0), 32, 8); set_mat(co, "cloth_neck")
    bkl = prim_torus((.048, -.025, 1.0), .014, .003, (0, math.pi / 2, 0), 12, 6); set_mat(bkl, "metal")
    bl = prim_sphere((0, .072, .962), .028, seg=18, ring=12); set_mat(bl, "gold")
    bl_rim = prim_torus((0, .072, .962), .029, .004, seg=18, mseg=6); set_mat(bl_rim, "gold")
    bl_ring = prim_torus((0, .065, .984), .008, .0025, (0, math.pi / 2, 0), 10, 6); set_mat(bl_ring, "gold")
    bl_slit = prim_sphere((0, .082, .950), .007, (1, 1, .4), 8, 6); set_mat(bl_slit, "sole")
    N_["Neck_bell"] = join([co, bkl, bl, bl_rim, bl_ring, bl_slit], "Neck_bell")

    # cape: elegant mantle around shoulders, flowing folds down back, gold brooch clasp at throat
    def cape(mb):
        ell(mb, (0, -.105, .74), .195, .026, .26)
        ell(mb, (0, -.020, .99), .105, .085, .035)
    cp = mb_part("Neck_cape", cape); set_mat(cp, "cloth_neck")
    med = prim_sphere((0, .085, .975), .018, (1, .4, 1), 12, 8); set_mat(med, "gold")
    chains = [prim_cyl((.030 * s, .078, .980), .004, .045, (0, math.radians(25 * s), 0), 8) for s in (-1, 1)]
    for ch in chains: set_mat(ch, "gold")
    N_["Neck_cape"] = join([cp, med] + chains, "Neck_cape")

    for nm, o_ in N_.items(): rigid(o_, "Spine01" if nm == "Neck_cape" else "Spine02"); parent_to(o_, rig); G[nm] = o_
    return G

# ================= heads =================
EYE_U, EYE_V = .365, .048
SP = {  # ears, tail, extras, muzzle(belly patch), nose dot, whiskers
 "cat":      dict(snoutK=2.1, snoutW=.25, whiskdots=True, fur="#f2a65a", belly="#fff1dc", tip="#fff1dc", nose="#ff8fa3", inner="#ffb8c6", ears=("point", 1.05), tail="cat", ex=["eartip"], muzzle=True, snout=.024, whisk=True, catnose=True, fang=True, fluff=True, mark="#d9843a", marks=["tabby"]),
 "dog":      dict(snoutK=2.3, snoutW=.25, bridge=.55, blaze=True, nosetip=True, chin=True, fur="#c98b55", belly="#fbe8cf", tip="#fbe8cf", nose="#2a1c18", inner="#f6d4be", mark="#8a5a36", ears=("flop", 1.05), tail="dog", ex=["earmark", "brows"], muzzle=True, snout=.034, marks=["eyespot"]),
 "fox":      dict(snoutK=2.4, snoutW=.23, bridge=.60, fur="#f07a2e", belly="#ffffff", tip="#ffffff", nose="#231816", inner="#f8d2bd", mark="#2c1c18", ears=("point", 1.28), tail="bushy", ex=["eartip", "cheekbelly"], muzzle=True, snout=.034, whisk=True, catnose=True, fang=True, fluff=True),
 "bunny":    dict(snoutK=2.0, snoutW=.22, fur="#f4efe9", belly="#ffffff", tip="#ffffff", nose="#ff9fb4", inner="#ffc2d1", ears=("long", 1.05), tail="pom", ex=["buck"], muzzle=True, snout=.022, catnose=True, cheek=1.2, marks=["pinkcheeks"]),
 "bear":     dict(snoutK=2.3, snoutW=.28, bridge=.35, chin=True, fur="#9a6440", belly="#e8c79e", tip="#e8c79e", nose="#2a1c18", inner="#d8a682", mark="#6e4329", ears=("round", 1.05), tail="stub", ex=[], muzzle=True, snout=.032, wide=1.05, cheek=1.18),
 "deer":     dict(snoutK=2.3, snoutW=.23, bridge=.55, nosetip=True, chin=True, fur="#a8703f", belly="#f1d4ae", tip="#ffffff", nose="#2a1612", inner="#f8ded2", mark="#4a2a1c", antler="#e9d8b4", ears=("leaf", 1.05), tail="stub", ex=["antlers", "spots"], muzzle=True, snout=.032),
 "reindeer": dict(snoutK=2.3, snoutW=.24, bridge=.52, chin=True, fur="#8a5a3a", belly="#f1e0c8", tip="#f6efe4", nose="#e0404c", inner="#edd2c0", mark="#4a2e20", antler="#efe0bd", ears=("leaf", .95), tail="stub", ex=["bigantlers", "cheekbelly"], muzzle=True, snout=.034, bignose=True),
 "mouse":    dict(snoutK=2.0, snoutW=.20, fur="#b9b3c2", belly="#f6eef4", tip="#f6eef4", nose="#ff8fa3", inner="#ffc2d1", ears=("round", 1.55), tail="thin", ex=["buck"], muzzle=True, snout=.022, whisk=True, catnose=True, marks=["pinkcheeks"]),
 "wolf":     dict(snoutK=2.4, snoutW=.24, bridge=.62, saddle=True, fur="#4f6f9f", belly="#a9bfdc", tip="#a9bfdc", nose="#16141c", inner="#b8cce6", mark="#26406c", ears=("point", 1.3), tail="bushy", ex=["eartip", "cheekbelly", "brows"], muzzle=True, snout=.036, catnose=True, fang=True, fluff=True),
 "raccoon":  dict(snoutK=2.2, snoutW=.22, bridge=.38, fur="#8b8a92", belly="#e9e6ea", tip="#2a2830", nose="#1c1a20", inner="#ded8e2", mark="#2c2a32", ears=("point", .9), tail="ringed", ex=["mask", "cheekbelly", "eartip"], muzzle=True, snout=.030, whisk=True, catnose=True, fang=True, fluff=True),
 "panda":    dict(snoutK=2.0, snoutW=.26, fur="#f7f3ee", belly="#ffffff", tip="#2b2530", nose="#1c1a20", inner="#eee8e2", mark="#2b2530", ears=("round", 1.05), tail="stub", ex=["patches"], muzzle=False, snout=.026, earmark=True, wide=1.05, cheek=1.18),
 "pig":      dict(snoutK=2.1, snoutW=.25, fur="#ffb3c1", belly="#ffd9e0", tip="#ffd9e0", nose="#ff8ca2", inner="#ffd4dc", ears=("pig", 1.05), tail="curly", ex=["snout"], muzzle=False, snout=.028, nonose=True, cheek=1.16, marks=["pinkcheeks"]),
 "sheep":    dict(snoutK=2.4, snoutW=.24, bridge=.35, fur="#f6f1e7", belly="#ffffff", tip="#ffffff", nose="#2a1c18", inner="#8a7f8c", mark="#5d5560", ears=("flop", .8), tail="pom", ex=["wool"], muzzle=False, snout=.024, catnose=True, earmark=True),
 "lion":     dict(snoutK=2.6, snoutW=.30, bridge=.35, whiskdots=True, chin=True, fur="#ebb04e", belly="#fbe3b0", tip="#a3592a", nose="#8a4a2a", inner="#f0d4a8", mark="#a3592a", ears=("round", .9), tail="lion", ex=["mane"], muzzle=True, snout=.036, catnose=True, fang=True, fluff=True),
 "tiger":    dict(snoutK=2.5, snoutW=.29, bridge=.30, whiskdots=True, fur="#f08a24", belly="#fff6ea", tip="#2a1c18", nose="#ff8fa3", inner="#fff0dc", mark="#2a1c18", ears=("round", .98), tail="ringed", ex=["stripes", "cheekbelly", "eartip"], muzzle=True, snout=.034, whisk=True, catnose=True, fang=True, fluff=True),
 "redpanda": dict(snoutK=2.3, snoutW=.24, fur="#c4532a", belly="#f4ece2", tip="#7a2e16", nose="#1c1a20", inner="#fff0e4", mark="#2b1a14", ears=("point", .95), tail="ringed", ex=["cheeks", "brows", "tears"], muzzle=True, snout=.028, catnose=True, fang=True, fluff=True),
 "skunk":    dict(snoutK=2.4, snoutW=.22, bridge=.35, fur="#2e2c36", belly="#f4f1ea", tip="#f4f1ea", nose="#16141c", inner="#eeeaf4", mark="#f4f1ea", ears=("round", .95), tail="skunk", ex=["stripe"], muzzle=True, snout=.030, catnose=True),
 "hamster":  dict(snoutK=2.0, snoutW=.22, fur="#e8b77a", belly="#fff4e0", tip="#fff4e0", nose="#ff8fa3", inner="#ffc2d1", ears=("round", .95), tail="stub", ex=["cheekbelly", "buck"], muzzle=True, snout=.022, whisk=True, catnose=True, cheek=1.42, wide=1.05, marks=["pinkcheeks"]),
 "otter":    dict(snoutK=2.4, snoutW=.30, whiskdots=True, chin=True, fur="#7a5236", belly="#e8d2b4", tip="#e8d2b4", nose="#2a1c18", inner="#dec4ac", mark="#5a3a24", ears=("round", .68), tail="otter", ex=["cheekbelly"], muzzle=True, snout=.032, whisk=True, catnose=True, cheek=1.14),
 "koala":    dict(snoutK=1.8, snoutW=.24, fur="#9a9aa4", belly="#ececf0", tip="#ececf0", nose="#2a2830", inner="#f4f4f6", ears=("fluffy", 1.15), tail="none", ex=["cheekbelly"], muzzle=False, snout=.026, bignose=True, wide=1.04, cheek=1.2),
 # ---- Nov 8 variety pass (Shelly: improve critter variety): ten more species, each composed from the parts the head builder already has
 "rat":      dict(snoutK=2.1, snoutW=.21, fur="#8a8078", belly="#d8cfc4", tip="#c9a99a", nose="#e8929e", inner="#f0b8b8", mark="#5a5048", ears=("round", 1.4), tail="thin", ex=["buck"], muzzle=True, snout=.024, whisk=True, catnose=True, marks=["pinkcheeks"]),
 "squirrel": dict(snoutK=2.0, snoutW=.22, fur="#b8683a", belly="#f4e4cf", tip="#f4e4cf", nose="#2a1c18", inner="#f1d2bd", mark="#7a3f22", ears=("point", .8), tail="bushy", ex=["buck", "eartip"], muzzle=True, snout=.024, whisk=True, catnose=True, cheek=1.15),
 "leopard":  dict(snoutK=2.4, snoutW=.27, bridge=.32, whiskdots=True, fur="#e8b24a", belly="#fff1d4", tip="#2a1c18", nose="#ff8fa3", inner="#fff0dc", mark="#2a1c18", ears=("round", .95), tail="cat", ex=["spots", "cheekbelly"], muzzle=True, snout=.034, whisk=True, catnose=True, fang=True, fluff=True),
 "jackal":   dict(snoutK=2.5, snoutW=.22, bridge=.64, fur="#c89a5a", belly="#f1dcb8", tip="#2a1c18", nose="#16141c", inner="#f1d4bc", mark="#5a3a22", ears=("point", 1.42), tail="bushy", ex=["eartip", "cheekbelly", "brows"], muzzle=True, snout=.034, catnose=True, fang=True, fluff=True),
 "badger":   dict(snoutK=2.3, snoutW=.26, bridge=.40, chin=True, fur="#5c5864", belly="#2e2c36", tip="#e8e4dc", nose="#16141c", inner="#d8d4dc", mark="#f1ece4", ears=("round", .85), tail="stub", ex=["stripe", "cheekbelly"], muzzle=True, snout=.030, catnose=True, wide=1.06, cheek=1.12),
 "ferret":   dict(snoutK=2.0, snoutW=.20, fur="#c9a47c", belly="#efe0c8", tip="#5a4030", nose="#e8929e", inner="#f0c8c0", mark="#4a3426", ears=("round", .85), tail="otter", ex=["mask", "cheekbelly"], muzzle=True, snout=.024, whisk=True, catnose=True),
 "beaver":   dict(snoutK=2.0, snoutW=.24, fur="#7a4a2c", belly="#d8b88c", tip="#3a2a20", nose="#2a1c18", inner="#d8a888", mark="#4a2e1c", ears=("round", .7), tail="otter", ex=["buck", "cheekbelly"], muzzle=True, snout=.028, whisk=True, cheek=1.22, wide=1.04),
 "capybara": dict(snoutK=2.5, snoutW=.30, bridge=.30, fur="#a07848", belly="#d8b88a", tip="#a07848", nose="#2a1c18", inner="#d8a888", mark="#6e4c2a", ears=("round", .6), tail="none", ex=[], muzzle=False, snout=.034, bignose=True, wide=1.08, cheek=1.15),
 "lop":      dict(snoutK=2.0, snoutW=.22, fur="#d8c4a8", belly="#ffffff", tip="#ffffff", nose="#ff9fb4", inner="#ffc2d1", mark="#a89070", ears=("flop", 1.25), tail="pom", ex=["buck"], muzzle=True, snout=.022, catnose=True, cheek=1.2, marks=["pinkcheeks"]),
 "fennec":   dict(snoutK=1.9, snoutW=.20, fur="#e8c898", belly="#ffffff", tip="#fff4e0", nose="#2a1c18", inner="#f8d4c0", mark="#7a5a38", ears=("point", 1.95), tail="bushy", ex=["eartip"], muzzle=True, snout=.026, whisk=True, catnose=True, fang=True, fluff=True),
}
if ONLY: SP = {k: v for k, v in SP.items() if k in ONLY.split(",")}
F_HEAD = False
FACE_KEYS = ["Blink", "Happy", "Sad", "Angry", "Wide", "Half", "Smile", "Open", "Frown", "O", "Blep", "Blush", "EyeTall", "EyeWide"]
# eye types: the round eye is the Basis; EyeTall / EyeWide reshape the whole eye (sclera, ink ring, pupil) about its centre, the game sets one from look.eyes
EYE_TYPES = {"EyeTall": (.84, 1.17), "EyeWide": (1.18, .82)}
def eye_types(st):
    for k, (sx, sy) in EYE_TYPES.items(): st[k] = [(x * sx, y * sy) for x, y in st["Basis"]]
    return st

# face types (the game blends these in game: scripts/lib/data/faces.yml "types"). Head space: x across, y forward, z up, centre HC; the chin is about z -.27, the eyes near z 0
FT_KEYS = ["FT_Round", "FT_Long", "FT_Broad", "FT_Narrow", "FT_Heart", "FT_Square", "FT_Snub", "FT_Snout", "FT_Chubby"]
def _sm(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def ft_delta(key, p, bone):
    if bone not in ("Head", "EarL", "EarR"): return Vector()
    d = p - HC
    if d.length > 0.6: return Vector()
    x, y, z = d.x, d.y, d.z
    lo = _sm(0.02, -0.2, z)            # the lower face: 0 at the eyes and above, 1 from the cheek down
    jaw = _sm(-0.1, -0.22, z) * (1 - _sm(-0.27, -0.33, z))
    chin = _sm(-0.15, -0.27, z)
    front = _sm(0.04, 0.2, y)          # the front of the face (the muzzle side)
    if key == "FT_Round":   return Vector((x * (0.07 + 0.05 * lo), -0.008 * front * lo, -0.05 * z))
    if key == "FT_Long":    return Vector((-0.07 * x, 0.012 * front * lo, 0.09 * z - 0.012 * lo))
    if key == "FT_Broad":   return Vector((x * (0.11 + 0.04 * lo), 0, -0.03 * z))
    if key == "FT_Narrow":  return Vector((-0.11 * x, 0.03 * y, 0))
    if key == "FT_Heart":   return Vector((x * (0.045 * (1 - lo) - 0.17 * chin), 0, -0.012 * chin))
    if key == "FT_Square":  return Vector((x * 0.14 * jaw, 0.006 * front * lo, 0.014 * _sm(-0.21, -0.28, z)))
    if key == "FT_Snub":    return Vector((0, -0.040 * front * lo, 0.006 * front * lo))
    if key == "FT_Snout":   return Vector((0, 0.054 * front * lo, -0.006 * front * lo))
    if key == "FT_Chubby":  return Vector((x * (0.03 + 0.10 * lo), 0.004 * lo, -0.03 * z))
    return Vector()

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

def add_decal(H, u, v, out, states, faces, matname, bone="Head", outs=None):
    """states: {"Basis": [(a,b)...], key: [...]} 2D points in the decal plane, the same count each; faces index those points.
       outs: optional dict {key: out_offset} so hidden states can tuck inside the head (out < 0) without collapsing to 0 area."""
    b_out = outs.get("Basis", out) if outs else out
    base = [H.add_v(decal_pt(u, v, a, b, b_out), bone) for (a, b) in states["Basis"]]
    all_keys = set(states.keys()) | (set(outs.keys()) if outs else set())
    for k in all_keys:
        if k == "Basis": continue
        pts = states.get(k, states["Basis"])
        k_out = outs.get(k, out) if outs else out
        for i, (a, b) in zip(base, pts):
            b_boost = max(0.0, -b) * 0.12 if (k in ("Open", "O") and k_out > 0) else 0.0
            H.keys[k][i] = decal_pt(u, v, a, b, k_out + b_boost)
    def area(f, pts): return sum(pts[f[i]][0] * pts[f[(i + 1) % len(f)]][1] - pts[f[(i + 1) % len(f)]][0] * pts[f[i]][1] for i in range(len(f)))
    order = [states["Basis"]] + [v_ for k, v_ in states.items() if k != "Basis"]
    for f in faces:
        a = 0.0
        for pts in order:
            a = area(f, pts)
            if abs(a) > 1e-10: break
        H.face([base[i] for i in (tuple(reversed(f)) if a > 0 else f)], matname)

def add_dome(H, u, v, nw, nh, h_max, matname, N=24, R=5, shape_fn=None, base_out=-.002, bone="Head"):
    """Builds a smooth 3D sculpted cushion/dome (for noses and snouts) on the tangent plane at (u, v)."""
    rings = []
    center_p = shape_fn(0.0, 0.0) if shape_fn else (0.0, 0.0)
    c_idx = H.add_v(decal_pt(u, v, center_p[0], center_p[1], h_max), bone)
    for r in range(1, R + 1):
        t = r / R
        # smooth dome profile from h_max at center down to base_out at the tucked rim
        z_out = base_out + (h_max - base_out) * ((1.0 - t * t) ** 1.15)
        ring = []
        for i in range(N):
            a = 2 * math.pi * i / N
            x, y = nw * t * math.cos(a), nh * t * math.sin(a)
            if shape_fn: x, y = shape_fn(x, y)
            ring.append(H.add_v(decal_pt(u, v, x, y, z_out), bone))
        rings.append(ring)
    for i in range(N):
        j = (i + 1) % N
        H.face((c_idx, rings[0][j], rings[0][i]), matname)
    for r in range(R - 1):
        r0, r1 = rings[r], rings[r + 1]
        for i in range(N):
            j = (i + 1) % N
            H.face((r0[i], r0[j], r1[j], r1[i]), matname)

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
    N = 32; ew, eh = .074, .090          # signature big tall oval eyes (Dandy's World / rubberhose style, no shines!)
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
        # sclera (6 radial rings so surface curvature is ultra-smooth)
        pts, ff = disc(ew, eh, N, 6)
        st = {"Basis": pts}
        for k in ("Wide", "Half", "Sad", "Angry", "Blink", "Happy"): st[k] = eyeT(pts, k)
        add_decal(H, u, EYE_V, .0075, eye_types(st), ff, "eyewhite")
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
        add_decal(H, u, EYE_V, .0088, eye_types(st), ring_faces(N), "eyeink")
        # the big matte black pupil, a little toward the nose and down (no specular shines!)
        pw, ph = .046, .060; pc = (-s * .015, -.016)
        pts, ff = disc(pw, ph, N, 6, *pc)
        st = {"Basis": pts, "Wide": [(pc[0] + (x - pc[0]) * .78, pc[1] + (y - pc[1]) * .78) for x, y in pts],
              "Half": [(x, min(y, cut - .004)) for x, y in pts], "Sad": [(x, y + .012) for x, y in pts], "Angry": [(x - s * .004, y - .006) for x, y in pts]}
        for k in ("Blink", "Happy"): st[k] = eyeT(pts, k)
        add_decal(H, u, EYE_V, .0105, eye_types(st), ff, "pupil")
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
            add_decal(H, u, EYE_V, .0092, eye_types(st), lf, "eyeink")
        # expressive eyebrows: soft resting arch that morphs across expressions
        M_ = 10; xs = [-.048 + .096 * i / (M_ - 1) for i in range(M_)]
        def brow(fy, th=.0048):
            top, bot = [], []
            for x in xs:
                u_ = x / .048
                t = max(.0012, (1.0 - u_ * u_) ** .55 * th)
                y = fy(x)
                top.append((x, y + t)); bot.append((x, y - t))
            return top + bot
        st_b = {
            "Basis": brow(lambda x: eh + .026 - .009 * (x / .048) ** 2, .0042),
            "Smile": brow(lambda x: eh + .031 - .010 * (x / .048) ** 2, .0044),
            "Happy": brow(lambda x: eh + .035 - .011 * (x / .048) ** 2, .0045),
            "Wide":  brow(lambda x: eh + .042 - .012 * (x / .048) ** 2, .0048),
            "Half":  brow(lambda x: eh + .018 - .004 * (x / .048) ** 2, .0042),
            "Sad":   brow(lambda x: eh + .030 + .028 * (0.35 - s * x / .096) - .005 * (x / .048) ** 2, .0052),
            "Angry": brow(lambda x: eh + .022 - .034 * (0.40 - s * x / .096) - .004 * (x / .048) ** 2, .0055),
        }
        add_decal(H, u, EYE_V, .0090, eye_types(st_b), strip(M_), "eyeink")
        # blush: positioned on the plush outer-lower cheek (cleanly clear of the eye ring)
        bp, bf = disc(.044, .023, 20, 3)
        bp_small = [(.35 * x, .35 * y) for x, y in bp]
        if F_HEAD or "pinkcheeks" in sp.get("marks", []):
            bp_big = [(1.18 * x, 1.18 * y) for x, y in bp]
            add_decal(H, s * .68, -.23, .0050, {"Basis": bp, "Blush": bp_big}, bf, "blush")
        else:
            add_decal(H, s * .68, -.23, .0050, {"Basis": bp_small, "Blush": bp}, bf, "blush", outs={"Basis": -.008, "Blush": .0050})
        # sleek tapered whiskers outside the cheek blush
        if sp.get("whisk"):
            for k_, (vy, ang) in enumerate(((-.18, .08), (-.24, -.02), (-.30, -.12))):
                wpts = [(s * (x * .065), x * ang * .05 - .004 * (x ** 2)) for x in [i / 7 for i in range(8)]]
                top, bot = [], []
                for idx_, (wx, wy) in enumerate(wpts):
                    t_ = 1.0 - idx_ / 7.0
                    th_ = .0024 * (0.25 + 0.75 * (t_ ** .7))
                    top.append((wx, wy + th_)); bot.append((wx, wy - th_))
                add_decal(H, s * .82, vy, .0055, {"Basis": top + bot}, strip(8), "eyeink")

    # 3D sculpted nose / snout cushion
    NV = -.168
    if "snout" in sp["ex"]:
        # 3D oval pig snout disk with recessed dark nostrils
        add_dome(H, 0, -.185, .056, .042, .026, "nose", N=28, R=5, base_out=-.003)
        for s in (-1, 1):
            np_, nf = disc(.011, .016, 14, 2, s * .020, -.002)
            add_decal(H, 0, -.185, .0268, {"Basis": np_}, nf, "eyeink")
    elif not sp.get("nonose"):
        if sp.get("bignose") and "bigantlers" not in sp["ex"]:
            # Koala's signature tall rounded dark leathery nose
            def koala_n(x, y): return (x * (1.0 - .18 * (y / .042)), y)
            add_dome(H, 0, -.175, .036, .046, .026, "nose", N=24, R=5, shape_fn=koala_n, base_out=-.003)
        elif sp.get("bignose"):
            # Reindeer's plump round glowing bulb nose
            add_dome(H, 0, -.164, .035, .029, .026, "nose", N=24, R=5, base_out=-.003)
        elif sp.get("catnose"):
            # Cute 3D kemono rounded-triangle button nose
            nh = .019; nw = .026
            def tri_n(x, y):
                u_ = y / nh
                return (x * (1.0 + .35 * u_), y - .20 * abs(x) * (1.0 if y < 0 else 0.2))
            add_dome(H, 0, NV, nw, nh, .0175, "nose", N=24, R=5, shape_fn=tri_n, base_out=-.002)
        else:
            # Plump 3D dog/bear/deer rounded button nose
            nh = .022; nw = .030
            def btn_n(x, y): return (x * (1.0 + .20 * (y / nh)), y)
            add_dome(H, 0, NV, nw, nh, .0205, "nose", N=24, R=5, shape_fn=btn_n, base_out=-.002)
            # Subtle nostril creases on the underside of canine/bear noses
            if not sp.get("nonose") and not sp.get("bignose"):
                for s in (-1, 1):
                    np_, nf = disc(.0045, .007, 10, 2, s * .011, -.007)
                    add_decal(H, 0, NV, .0208, {"Basis": np_}, nf, "eyeink")

    # mouth: charming :3 kemono double-arch on catnose species, warm curve on others
    M_ = 19; ts = [-1 + 2 * i / (M_ - 1) for i in range(M_)]
    MV = -.295 if "snout" not in sp["ex"] and not (sp.get("bignose") and "bigantlers" not in sp["ex"]) else -.34
    is_kemono = bool(sp.get("catnose"))
    w0, w1 = (.042, .060) if is_kemono else (.040, .058)
    def lineB(t):
        if is_kemono:
            a = abs(t)
            return (t * w0, .0055 * math.exp(-((t / .24) ** 2)) - .0095 * math.sin(math.pi * a) + .004 * (t ** 2))
        return (t * w0, -.009 * (1 - t * t))
    def lineS(t):
        if is_kemono:
            a = abs(t)
            return (t * w1, .0065 * math.exp(-((t / .24) ** 2)) - .015 * math.sin(math.pi * a) + .010 * (t ** 2))
        return (t * w1, -.020 * (1 - t * t) + .006 * t * t)
    def lineF(t):
        return (t * .040, .014 * (1 - t * t) - .005)
    def band(fn, th=.0048):
        top, bot = [], []
        for t in ts:
            x, y = fn(t); w = th * (1 - .52 * abs(t) ** 4); top.append((x, y + w)); bot.append((x, y - w))
        return top + bot
    Oc, Or = (0, -.020), .024
    def oring():
        top, bot = [], []
        for t in ts:
            a = math.pi * (1 + t)
            top.append((Oc[0] + math.cos(a) * (Or + .0055), Oc[1] + math.sin(a) * (Or + .0055)))
            bot.append((Oc[0] + math.cos(a) * (Or - .003), Oc[1] + math.sin(a) * (Or - .003)))
        return top + bot
    add_decal(H, 0, MV, .0088, {
        "Basis": band(lineB), "Smile": band(lineS), "Frown": band(lineF), "Open": band(lineB), "O": oring()
    }, strip(M_), "eyeink", outs={"Basis": .0088, "Smile": .0088, "Frown": .0088, "Open": .0175, "O": .0175})

    # philtrum connecting nose tip to upper lip peak
    if "snout" not in sp["ex"] and not (sp.get("bignose") and "bigantlers" not in sp["ex"]):
        ph_top = .036 if is_kemono else .033
        ph_bot = lineB(0)[1] + .001
        lq, lf_ = quadgrid([(-.0026, ph_bot), (.0026, ph_bot), (.0024, ph_top), (-.0024, ph_top)], 1, 4)
        lq_o = [(x * .4, y * .4 + .02) for x, y in lq]
        add_decal(H, 0, MV, .0086, {"Basis": lq, "O": lq_o}, lf_, "eyeink", outs={"Basis": .0086, "Open": .0170, "O": -.006})

    # open mouth interior, teeth/fangs, and tongue:
    # Tucked 2.8mm inside the head when closed (Basis/Smile/Frown) with non-zero area, and projected forward in Open/O
    # so any Open >= 0.2 is cleanly in front of the muzzle and any Open == 0 is 100% hidden inside the head!
    def fill(fn, open_mode=False, Ofill=False):
        top, bot = [], []
        for t in ts:
            x, y = fn(t)
            if Ofill:
                a = math.pi * (1 - (t + 1) / 2); x = Oc[0] + math.cos(a) * Or
                top.append((x, Oc[1] + math.sin(a) * Or)); bot.append((x, Oc[1] - math.sin(a) * Or))
            elif not open_mode:
                top.append((x * .88, y)); bot.append((x * .88, y - .006 * (1 - .5 * t * t)))
            else:
                # Smooth U-shaped lower lip curve (compensating for kemono :3 center peak on the bottom edge)
                kem_comp = (-.012 * math.exp(-((t / .26) ** 2)) + .008 * math.sin(math.pi * abs(t))) if is_kemono else 0.0
                top.append((x * .88, y)); bot.append((x * .88, y + kem_comp - .042 * ((1 - t * t) ** .65)))
        return top + bot
    add_decal(H, 0, MV, -.0028, {
        "Basis": fill(lineB, False), "Smile": fill(lineS, False), "Frown": fill(lineF, False),
        "Open": fill(lineB, True), "O": fill(lineB, Ofill=True)
    }, strip(M_), "mouth", outs={"Basis": -.0028, "Smile": -.0028, "Frown": -.0028, "Open": .0145, "O": .0145})

    def teeth(fn, open_mode=False):
        top, bot = [], []
        for t in ts:
            x, y = fn(t * .80)
            if not open_mode:
                top.append((x, y)); bot.append((x, y - .004))
            else:
                if sp.get("fang"):
                    fang_pk = math.exp(-(((abs(t) - .56) / .14) ** 2))
                    h = .004 * (1 - t ** 6) + .013 * fang_pk
                elif "buck" in sp["ex"]:
                    buck_pk = 1.0 if abs(t) < .26 else 0.0
                    notch = .25 if abs(t) < .03 else 1.0
                    h = .015 * buck_pk * notch + .003 * (1 - t ** 4)
                else:
                    h = .010 * (1 - t ** 8)
                top.append((x, y - .001)); bot.append((x, y - .002 - h))
        return top + bot
    add_decal(H, 0, MV, -.0024, {
        "Basis": teeth(lineB, False), "Smile": teeth(lineS, False), "Frown": teeth(lineF, False),
        "Open": teeth(lineB, True)
    }, strip(M_), "eyewhite", outs={"Basis": -.0024, "Smile": -.0024, "Frown": -.0024, "Open": .0162})

    tp = ellipse(.019, .011, 18); tc_open = (0, -.032); tc_blep = (0, -.018)
    def t_tucked(fn):
        cy = fn(0)[1] - .005
        return [(0, cy)] + [(.45 * x, cy + .35 * y) for x, y in tp]
    t_open = [tc_open] + [(tc_open[0] + x, tc_open[1] + y) for x, y in tp]
    t_blep = [tc_blep] + [(tc_blep[0] + x * .78, tc_blep[1] + y * 1.15 - .004) for x, y in tp]
    add_decal(H, 0, MV, -.0026, {
        "Basis": t_tucked(lineB), "Smile": t_tucked(lineS), "Frown": t_tucked(lineF),
        "Open": t_open, "Blep": t_blep
    }, fan(18), "tongue", outs={"Basis": -.0026, "Smile": -.0026, "Frown": -.0026, "Open": .0154, "Blep": .0160})

# ---- Smooth vector-clean fur markings via layered decals (zero stair-stepping, zero Z-fighting) ----
def rot2d(pts, ang, cx=0.0, cy=0.0):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for x, y in pts]

def furdisc(w, h, N=44, R=5, tufts=11, amp=.13, seed=0, cx=0, cy=0, ang=0.0):
    """a fur-edged patch: the outer rim breaks into soft pointed tufts, so a marking reads as fur, not a sticker"""
    rnd = random.Random(seed * 7919 + int(w * 1e4) + int(h * 1e3))
    jit = [rnd.random() - .5 for _ in range(N)]
    rr = []
    for i in range(N):
        t = 2 * math.pi * i / N
        spike = (1.0 - abs(math.sin(tufts * t / 2 + seed))) ** 3.5
        rr.append(1.0 - amp * .55 + amp * 1.25 * spike + amp * .35 * jit[i])
    pts = [(cx, cy)]
    for r in range(1, R + 1):
        k = r / R; kk = k ** 2.2
        for i in range(N):
            t = 2 * math.pi * i / N
            m = k * (1.0 + (rr[i] - 1.0) * kk)
            x, y = w * m * math.cos(t), h * m * math.sin(t)
            ca, sa = math.cos(ang), math.sin(ang)
            pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    faces = [(0, 1 + i, 1 + (i + 1) % N) for i in range(N)]
    for r in range(1, R):
        a, b = 1 + (r - 1) * N, 1 + r * N
        faces += [(a + i, a + (i + 1) % N, b + (i + 1) % N, b + i) for i in range(N)]
    return pts, faces

def muzzle_disc(w, h, N=44, R=5, seed=0, cx=0, cy=0):
    """A sculpted kemono muzzle patch: smooth curved upper boundary nestled cleanly below the eyes,
    and soft plush fur tufts around the lower cheeks and chin."""
    rnd = random.Random(seed * 7919 + int(w * 1e4) + int(h * 1e3))
    rr = []
    for i in range(N):
        t = 2 * math.pi * i / N
        y_dir = math.sin(t)
        if y_dir > 0.10:
            # Upper contour facing eyes: smooth gentle curve dipping slightly in the center, staying strictly below eyes
            rr.append(0.64 - 0.12 * (1.0 - math.cos(2 * t)))
        else:
            # Lower rim and cheeks: soft plush fur ruff
            spike = (1.0 - abs(math.sin(9 * t / 2 + seed))) ** 3.0
            rr.append(1.0 - 0.08 + 0.16 * spike + 0.04 * (rnd.random() - 0.5))
    pts = [(cx, cy)]
    for r in range(1, R + 1):
        k = r / R; kk = k ** 2.2
        for i in range(N):
            t = 2 * math.pi * i / N
            m = k * (1.0 + (rr[i] - 1.0) * kk)
            x, y = w * m * math.cos(t), h * m * math.sin(t)
            pts.append((cx + x, cy + y))
    faces = [(0, 1 + i, 1 + (i + 1) % N) for i in range(N)]
    for r in range(1, R):
        a, b = 1 + (r - 1) * N, 1 + r * N
        faces += [(a + i, a + (i + 1) % N, b + (i + 1) % N, b + i) for i in range(N)]
    return pts, faces

def stroke(path, w, n=14, root=False):
    """a tapered brush stroke along a polyline (local metres): pointed at both ends, or wide at the root"""
    seg = [0.0]
    for i in range(1, len(path)): seg.append(seg[-1] + math.dist(path[i], path[i - 1]))
    tot = seg[-1] or 1.0
    def at(d):
        for i in range(1, len(path)):
            if seg[i] >= d:
                f = (d - seg[i - 1]) / max(1e-9, seg[i] - seg[i - 1])
                return (path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f)
        return path[-1]
    P = [at(tot * i / (n - 1)) for i in range(n)]
    top, bot = [], []
    for i, (x, y) in enumerate(P):
        a, b = P[max(0, i - 1)], P[min(n - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; L_ = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / L_, tx / L_
        t = i / (n - 1)
        ww = w * ((1 - t) ** .7 if root else math.sin(math.pi * t) ** .65) + w * .04
        top.append((x + nx * ww, y + ny * ww)); bot.append((x - nx * ww, y - ny * ww))
    return top + bot, strip(n)

def build_markings(H, sp):
    """face patterns, Shelly: 'make the critters' face patterns actually decent'. Every patch is fur-edged and layered
    (a soft outer tone, a crisp inner one), stripes are tapered brush strokes, each species gets its own read."""
    ex = sp["ex"]; marks = sp.get("marks", [])
    def patch(u, v, out, w, h, mat, seed=0, ang=0.0, tufts=11, amp=.13, N=44):
        pts, f = furdisc(w, h, N, 5, tufts, amp, seed, ang=ang); add_decal(H, u, v, out, {"Basis": pts}, f, mat)
    def line(u, v, out, path, w, mat, root=False):
        pts, f = stroke(path, w, 14, root); add_decal(H, u, v, out, {"Basis": pts}, f, mat)

    # Layer 1 (.0030): pale cheek ruffs and brow fur
    if "cheekbelly" in ex:
        for s in (-1, 1):
            patch(s * .55, -.25, .0030, .118, .074, "belly", seed=3 + s, ang=-s * .2, tufts=9, amp=.2)
    if "cheeks" in ex:
        for s in (-1, 1):
            patch(s * .72, -.20, .0030, .078, .056, "belly", seed=5 + s, ang=-s * .15, tufts=8, amp=.18)
    if "mask" in ex:
        for s in (-1, 1):
            patch(s * .36, .27, .0032, .092, .040, "belly", seed=9 + s, ang=-s * .18, tufts=10, amp=.22)
    if sp.get("blaze"):   # dog / skunk: a pale blaze climbing the nose bridge to the brow
        line(0, -.02, .0032, [(0, -.03), (0, .06), (0, .16)], .022, "belly", root=True)

    # Layer 2 (.0040): darker eye and forehead marks
    if "mask" in ex:
        patch(0, .02, .0038, .05, .046, "mark", seed=11, tufts=7, amp=.12)
        for s in (-1, 1):
            patch(s * .39, .02, .0040, .118, .09, "mark", seed=12 + s, ang=-s * .2, tufts=12, amp=.16)
    if "patches" in ex:
        for s in (-1, 1):
            patch(s * (EYE_U + .02), EYE_V - .03, .0042, .112, .136, "mark", seed=14 + s, ang=s * .3, tufts=10, amp=.1)
    if "eyespot" in marks:
        patch(EYE_U + .03, EYE_V + .02, .0042, .112, .126, "mark", seed=17, ang=.14, tufts=9, amp=.17)
        patch(-.62, .62, .0042, .07, .05, "mark", seed=18, ang=.5, tufts=8, amp=.2)   # a second splash high on the other side
    if sp.get("saddle"):   # wolf: a dark widow's peak cap over the forehead
        pts, f = furdisc(.16, .1, 44, 5, 13, .18, 21)
        pts = [(x, y + .06 * max(0.0, 1 - abs(x) / .05) * (1 if y < 0 else 0)) for x, y in pts]
        add_decal(H, 0, .78, .0042, {"Basis": pts}, f, "mark")
    if "tabby" in marks:
        # the tabby M on the forehead, three strokes, and swept cheek stripes
        line(0, .66, .0045, [(-.05, -.02), (-.035, .04), (-.012, -.005), (0, .05), (.012, -.005), (.035, .04), (.05, -.02)], .009, "mark")
        line(0, .80, .0045, [(0, -.04), (0, .05)], .011, "mark")
        for du in (-.13, .13):
            line(du, .82, .0045, [(0, -.035), (du * .1, .04)], .009, "mark")
        for s in (-1, 1):
            for vc, ln_, bend in ((.02, .07, .012), (-.1, .06, .008)):
                line(s * .9, vc, .0045, [(s * ln_ * .5, 0), (0, bend), (-s * ln_ * .5, .002)], .011, "mark", root=False)
    if "stripes" in ex:
        # tiger: bold tapered forehead bars, curling cheek strokes, two pale brow spots
        for du, h_, lean in ((-.24, .07, .2), (-.12, .085, .08), (0, .1, 0), (.12, .085, -.08), (.24, .07, -.2)):
            line(du, .72, .0045, [(-lean * .1, -h_ * .5), (0, 0), (lean * .15, h_ * .5)], .013, "mark")
        for s in (-1, 1):
            for vc, ln_, k_ in ((.06, .085, .02), (-.06, .095, .025), (-.18, .07, .015)):
                line(s * .86, vc, .0045, [(s * ln_ * .55, -k_), (s * ln_ * .1, k_ * .4), (-s * ln_ * .45, 0)], .014, "mark", root=True)
            patch(s * .26, .40, .0045, .03, .022, "belly", seed=30 + s, tufts=6, amp=.15)
    if "stripe" in ex:
        line(0, .5, .0045, [(0, -.16), (0, 0), (0, .2)], .045, "tip", root=False)
    if "spots" in ex:
        rnd = random.Random(7)
        for su, sv, sr in ((-.25, .68, .019), (.23, .71, .018), (-.10, .86, .016), (.12, .9, .016), (-.34, .87, .014), (.32, .89, .015), (-.42, .62, .012), (.43, .64, .012)):
            patch(su, sv, .0045, sr, sr * (.75 + .2 * rnd.random()), "tip", seed=int(sr * 1e4), ang=rnd.random(), tufts=5, amp=.12, N=20)

    # Layer 3 (.0050): the muzzle's pale fur, covering the whole snout and running up under the cheeks
    if sp.get("muzzle"):
        pts, f = muzzle_disc(.110, .076, 44, 5, seed=40)
        add_decal(H, 0, -.24, .0050, {"Basis": pts}, f, "belly")
    if sp.get("chin"):   # deer / bear / otter: a pale chin under the mouth
        patch(0, -.40, .0052, .06, .04, "belly", seed=41, tufts=8, amp=.15)

    # Layer 4 (.0060): small top details
    if sp.get("nosetip"):   # deer, reindeer, dog: the dark leather around the nose spreads onto the snout tip
        patch(0, -.17, .0058, .05, .034, "mark", seed=50, tufts=9, amp=.16)
    if sp.get("whiskdots"):
        for s in (-1, 1):
            for a_, b_ in ((.035, .0), (.055, -.012), (.04, -.026), (.065, .012)):
                pts, f = disc(.0055, .0055, 10, 2); add_decal(H, s * .2, -.22, .0060, {"Basis": [(x + s * a_, y + b_) for x, y in pts]}, f, "mark")
    if "tears" in ex:
        for s in (-1, 1):
            line(s * .33, -.14, .0060, [(0, .07), (s * .008, 0), (s * .02, -.07)], .022, "mark", root=True)
    if "brows" in ex:
        for s in (-1, 1):
            patch(s * .29, .46, .0060, .036, .021, "belly", seed=60 + s, ang=-s * .2, tufts=6, amp=.18, N=24)
            patch(s * .29, .46, .0032, .036, .021, "belly", seed=60 + s, ang=-s * .2, tufts=6, amp=.18, N=24)

# ---- 3D sculpted cupped ears with clean rounded tips and optional two-tone tips ----
def build_ear(H, kind, sc, side, inner_mat, sp):
    u, v = side * EAR_UV[0], EAR_UV[1]
    root = head_pt(head_dir(u, v), -.020); nrm = (root - HC).normalized(); right = Vector((side, 0, 0))
    if kind == "flop":
        # Start high on the temple and flare outward + downward so the floppy ear drapes cleanly outside the cheek
        root = head_pt(head_dir(side * .84, .68), .004)
        up = Vector((side * .56, .10, -.82)).normalized()
        fwd = Vector((side * .80, .28, .53)).normalized()
        fwd = (fwd - up * fwd.dot(up)).normalized()
    elif kind == "leaf":
        root = head_pt(head_dir(side * .86, .42), -.018)
        up = (nrm * .52 + right * .68 + V(0, 0, .18)).normalized()
        fwd = (V(0, 1, 0) - up * up.y).normalized()
    elif kind == "pig":
        root = head_pt(head_dir(side * .64, .74), -.018)
        up = (nrm * .65 + V(0, .48, .25)).normalized()
        fwd = (V(0, 1, -.35) - up * up.dot(V(0, 1, -.35))).normalized()
    elif kind == "long":
        root = head_pt(head_dir(side * .42, .92), -.022)
        up = (nrm * .32 + V(0, -.04, .94)).normalized()
        fwd = (V(0, 1, 0) - up * up.y).normalized()
    elif kind == "fluffy" or sc > 1.35:
        # Wide-set big round/fluffy ears (mouse, koala) angled outward so they frame the head without colliding
        root = head_pt(head_dir(side * .78, .66), -.018); nrm = (root - HC).normalized()
        up = (nrm * .62 + right * .46 + V(0, 0, .44)).normalized()
        fwd = (V(0, 1, 0) - up * up.y).normalized()
    else:
        up = (nrm * .52 + V(0, 0, .54)).normalized()
        fwd = (V(0, 1, 0) - up * up.y).normalized()
    side_v = up.cross(fwd).normalized()
    bone = "EarL" if side < 0 else "EarR"
    outer_mat = "mark" if (sp.get("earmark") or "earmark" in sp["ex"]) else "fur"
    has_tip = "eartip" in sp["ex"]
    tip_mat = "mark" if sp.get("mark") else "tip"

    # Build a 3D cupped grid ear with soft rim, concave inner dish, and arched rounded tip
    R, C = 14, 10
    if kind == "point":
        H_len = .205 * sc
        w_fn = lambda t: .092 * sc * (math.sin(math.pi * (.12 + .84 * (1.0 - t))) ** .68) * ((1.0 - t * .86) ** .52)
        cup_d = .022 * sc; th_base = .020
    elif kind == "long":
        H_len = .36 * sc
        w_fn = lambda t: .064 * sc * (math.sin(math.pi * (.08 + .88 * t)) ** .58)
        cup_d = .022 * sc; th_base = .022
    elif kind == "flop":
        H_len = .23 * sc
        w_fn = lambda t: .072 * sc * (math.sin(math.pi * (.10 + .86 * t)) ** .55)
        cup_d = -.016 * sc; th_base = .018
    elif kind == "leaf":
        H_len = .20 * sc
        w_fn = lambda t: .066 * sc * (math.sin(math.pi * (.10 + .86 * t)) ** .65)
        cup_d = .020 * sc; th_base = .018
    elif kind == "pig":
        H_len = .145 * sc
        w_fn = lambda t: .068 * sc * (math.sin(math.pi * (.14 + .82 * (1.0 - t))) ** .65) * ((1.0 - t * .82) ** .5)
        cup_d = .018 * sc; th_base = .018
    elif kind == "fluffy":
        H_len = .175 * sc
        w_fn = lambda t: .102 * sc * (math.sin(math.pi * (.12 + .82 * t)) ** .52)
        cup_d = .022 * sc; th_base = .022
    else:  # round
        H_len = .145 * sc
        w_fn = lambda t: .088 * sc * (math.sin(math.pi * (.12 + .82 * t)) ** .52)
        cup_d = .020 * sc; th_base = .020

    f_grid, b_grid = [], []
    for i in range(R + 1):
        t = i / R
        w = max(.004, w_fn(t))
        bend = (.026 * math.sin(math.pi * t) if kind == "flop" else .012 * math.sin(math.pi * t))
        rf, rb = [], []
        for j in range(C + 1):
            u_ = j / C * 2.0 - 1.0
            rim = 1.0 - u_ * u_
            x = u_ * w
            # Round off the top contour so the tip is a smooth dome arch rather than a flat horizontal cut
            tip_arch = 1.0 - .14 * (t ** 2) * (u_ * u_)
            y = (t * H_len * tip_arch - .016)
            taper = (1.0 - .55 * (t ** 2)) * (.35 + .65 * rim)
            zf = bend - cup_d * rim * math.sin(math.pi * min(1.0, t * 1.12)) + th_base * .35 * (1.0 - .55 * rim) * taper
            zb = bend - cup_d * .35 * rim * math.sin(math.pi * min(1.0, t * 1.12)) - th_base * (.65 + .35 * rim) * taper
            p_f = root + side_v * x + up * y + fwd * zf
            p_b = root + side_v * x + up * y + fwd * zb
            rf.append(H.add_v(p_f, bone))
            rb.append(H.add_v(p_b, bone))
        f_grid.append(rf); b_grid.append(rb)

    for i in range(R):
        t_mid = (i + .5) / R
        for j in range(C):
            u_mid = abs((j + .5) / C * 2.0 - 1.0)
            is_inner = (kind != "flop") and (u_mid < .64) and (.08 < t_mid < .78)
            f_mat = inner_mat if is_inner else (tip_mat if (has_tip and t_mid > .72) else outer_mat)
            b_mat = tip_mat if (has_tip and t_mid > .72) else outer_mat
            f_quad = (f_grid[i][j], f_grid[i][j + 1], f_grid[i + 1][j + 1], f_grid[i + 1][j])
            b_quad = (b_grid[i][j + 1], b_grid[i][j], b_grid[i + 1][j], b_grid[i + 1][j + 1])
            H.face(f_quad, f_mat)
            H.face(b_quad, b_mat)
        rim_mat = tip_mat if (has_tip and t_mid > .72) else outer_mat
        H.face((f_grid[i][0], f_grid[i + 1][0], b_grid[i + 1][0], b_grid[i][0]), rim_mat)
        H.face((f_grid[i + 1][C], f_grid[i][C], b_grid[i][C], b_grid[i + 1][C]), rim_mat)
    cap_top_mat = tip_mat if has_tip else outer_mat
    for j in range(C):
        H.face((f_grid[R][j], f_grid[R][j + 1], b_grid[R][j + 1], b_grid[R][j]), cap_top_mat)
        H.face((b_grid[0][j], b_grid[0][j + 1], f_grid[0][j + 1], f_grid[0][j]), outer_mat)
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
    def tbone(p):
        d = (p - base).length; return "Tail" if d < .14 else "Tail1"
    me = o.data
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
            r0 = head_pt(head_dir(s * .32, 1.02), -.02)
            main = [r0, r0 + V(s * .045, -.01, .10), r0 + V(s * .105, -.02, .19 if big else .145), r0 + V(s * .15, -.02, .27 if big else .20)]
            o, _ = tube("ant", main, [.019, .016, .013, .009], 8); H.add_obj(o, "antler")
            for k in range(2 if big else 1):
                b0 = main[1 + k] if k < 2 else main[2]
                o, _ = tube("tine", [b0, b0 + V(-s * .012, .035, .04), b0 + V(-s * .018, .055, .078)], [.012, .009, .006], 8); H.add_obj(o, "antler")
    if "mane" in ex:
        for i in range(18):
            a = i / 18 * 2 * math.pi; d = (head_dir(0, 0) * .12 + Vector((math.cos(a), -0.36, math.sin(a))) * .96).normalized()
            o = prim_sphere(tuple(head_pt(d, .022)), .088, seg=14, ring=10); H.add_obj(o, "mark")
    if "wool" in ex:
        for i in range(11):
            a = i / 11 * math.pi; d = Vector((math.cos(a) * .82, -.22 + .18 * math.sin(a * 3), math.sin(a) * .9 + .32)).normalized()
            o = prim_sphere(tuple(head_pt(d, .016)), .076, seg=14, ring=10); H.add_obj(o, "tip")

def spike(H, base, d1, d2, r, matname, bone="Head"):
    o, _ = tube("spike", [base, base + d1, base + d1 + d2], [r, r * .58, r * .10], 8); H.add_obj(o, matname, bone)

def build_tufts(H, sp):
    if "mane" not in sp["ex"] and "wool" not in sp["ex"]:
        # Soft kemono crown fluff: gentle curved tuft on the crown
        b = head_pt(head_dir(0, 1.30), -.014)
        n = (b - HC).normalized(); f = V(0, .28, .96).normalized()
        spike(H, b, n * .052 + f * .022, n * .040 + f * .035, .030, "fur")
        for s in (-1, 1):
            b2 = head_pt(head_dir(s * .14, 1.28), -.014)
            n2 = (b2 - HC).normalized()
            spike(H, b2, n2 * .038 + f * .016 + V(s * .012, 0, 0), n2 * .028 + f * .024 + V(s * .018, 0, 0), .022, "fur")
    if sp.get("fluff"):
        # Sculpted 3D layered cheek ruff tufts flaring out naturally from the plush lower cheeks
        c_mat = "belly" if ("cheekbelly" in sp["ex"] or "cheeks" in sp["ex"]) else "fur"
        for s in (-1, 1):
            for v_, ln, r0, dz in ((-.09, .064, .028, -.008), (-.21, .078, .032, -.018), (-.33, .060, .026, -.026)):
                b = head_pt(head_dir(s * 1.30, v_), -.020)
                d_out = Vector((s * .92, -.18, -.20)).normalized()
                spike(H, b, d_out * (ln * .55) + V(0, 0, dz * .5), d_out * (ln * .48) + V(s * .01, -.01, dz), r0, c_mat)

def build_head(name, sp, rig, F):
    global F_HEAD, CUR_SP; F_HEAD = F; CUR_SP = sp
    H = HeadMesh()
    # Sculpted 3D kemono head mesh
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=64, radius=1.0)
    vmap = {v: H.add_v(head_pt(v.co, 0)) for v in bm.verts}
    is_sheep = "wool" in sp["ex"]
    for f in bm.faces:
        fmat = "fur"
        if is_sheep:
            c = sum((H.v[vmap[v]] - HC for v in f.verts), Vector()) / len(f.verts)
            if c.y > -.05 and c.z < .18:
                fmat = "mark"
        H.face([vmap[v] for v in f.verts], fmat)
    bm.free()

    build_markings(H, sp)
    build_face(H, sp)
    kind, sc = sp["ears"]
    inner = "inner" if sp.get("inner") else "belly"
    for s in (-1, 1):
        build_ear(H, kind, sc, s, inner, sp)
    build_tail(H, sp["tail"], sp)
    build_extras(H, sp, name)
    build_tufts(H, sp)

    me = bpy.data.meshes.new("Head_" + name)
    me.from_pydata([tuple(p) for p in H.v], [], [f for f, _ in H.f])
    me.update()
    for mname in H.mats:
        col = {"eyewhite": "#ffffff", "eyeink": "#241c2a", "pupil": "#050505", "mouth": "#4a1622", "tongue": "#ff7f93", "blush": "#ff7fa6"}.get(mname) or sp.get(mname) or sp["fur"]
        rough = 1.0 if mname in ("pupil", "eyeink") else 0.9 if mname in ("eyewhite",) else 0.85
        me.materials.append(mat(name + "_" + mname, col, rough))
    for i, (_, mi) in enumerate(H.f): me.polygons[i].material_index = mi
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new("Head_" + name, me); scene().collection.objects.link(o)
    groups = {}
    for i, b in enumerate(H.bone):
        if b not in groups: groups[b] = o.vertex_groups.new(name=b)
        groups[b].add([i], 1.0, 'REPLACE')
    o.shape_key_add(name="Basis")
    for k in FACE_KEYS:
        sk = o.shape_key_add(name=k, from_mix=False)
        for i, p in H.keys[k].items(): sk.data[i].co = p
        # For Open and O, add subtle lower jaw displacement to the base head mesh so the skull drops with the mouth
        if k in ("Open", "O"):
            scale = 1.0 if k == "Open" else 0.65
            for i, p in enumerate(H.v):
                if H.bone[i] == "Head" and i not in H.keys[k]:
                    d = p - HC
                    if d.y > 0.06 and -0.48 < d.z < -0.22 and abs(d.x) < 0.16:
                        jaw_w = math.cos((d.x / 0.16) * (math.pi / 2))
                        jaw_z = math.sin(max(0.0, min(1.0, (d.z - (-0.48)) / 0.26)) * math.pi)
                        drop = jaw_w * jaw_z * scale
                        if drop > 0.01:
                            sk.data[i].co = p + Vector((0, 0.006 * drop, -0.012 * drop))
    # face types: whole-head STRUCTURE (width, length, jaw, cheeks, muzzle), not expressions; each key is a smooth field over the head, ears included, so they move with it
    for k in FT_KEYS:
        sk = o.shape_key_add(name=k, from_mix=False)
        for i, p in enumerate(H.v):
            dv = ft_delta(k, p, H.bone[i])
            if dv.length > 0: sk.data[i].co = p + dv
    parent_to(o, rig)
    CUR_SP = None
    return o

# ================= proof renders =================
def proof(tag, objs_sets):
    sc = scene()
    sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    sc.render.resolution_x = 900; sc.render.resolution_y = 900
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.82, .78, .72, 1); bg.inputs[1].default_value = .9
    sc.view_settings.view_transform = "Standard"
    sc.render.use_freestyle = False
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

def head_turn(heads, SEX):
    # close head turnaround (front, 3/4, side, back-top), each lit from its camera's side: the head-shape pass checks ears and face seating here
    sc = scene(); sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 520
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.8, .78, .74, 1); bg.inputs[1].default_value = 1.0
    sc.view_settings.view_transform = "Standard"
    cam = bpy.data.objects.new("hcam", bpy.data.cameras.new("hcam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 60
    key = bpy.data.objects.new("hkey", bpy.data.lights.new("hkey", "AREA")); key.data.energy = 120; key.data.size = 2; sc.collection.objects.link(key)
    tgt = V(0, 0, 1.30)
    for name, head in heads.items():
        for o in sc.objects:
            if o.type == "MESH": o.hide_render = o is not head
        for kb in head.data.shape_keys.key_blocks[1:]: kb.value = .8 if kb.name == "Smile" else 0
        for vi, (ang, el) in enumerate(((0, 4), (35, 8), (90, 2), (160, 30))):
            a, e = math.radians(ang), math.radians(el); dist = 1.45
            cam.location = tgt + V(math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)) * dist
            cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
            key.location = tgt + V(math.sin(a + .5) * 1.6, math.cos(a + .5) * 1.6, 1.2); key.rotation_euler = (tgt - key.location).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(PROOF, f"ht_{SEX}_{name}_{vi}.png"); bpy.ops.render.render(write_still=True)
        for kb in head.data.shape_keys.key_blocks[1:]: kb.value = 0

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
    if STAGE == "heads":
        heads = {name: build_head(name, sp, rig, F) for name, sp in SP.items()}
        log("heads", len(heads))
        if os.environ.get("HPROOF"): head_turn(heads, SEX)
        if not os.environ.get("NOEXPORT"):
            for name, o in heads.items(): export_head(os.path.join(OUT, f"critter-sp-{name}-{SEX}.glb"), rig, o, name)
        return
    body = build_body(F); auto_weights(body, rig); parent_to(body, rig)
    G = build_garments(F, body, rig); log("body + garments", SEX, tris(body), len(G))
    if STAGE == "body":
        build_anims(rig)
        export_body(os.path.join(OUT, f"critter-{SEX}.glb"), rig, [body] + list(G.values()))
        return
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
