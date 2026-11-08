# Shelly's anime base (female, as uploaded) + a male built off the same mesh. Both rigged on Mixamo names.
import bpy, math, sys
from mathutils import Vector
OUT = "/workspace/human"
def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def bump(a, b, c, d, x): return smooth(a, b, x) * (1 - smooth(c, d, x))

def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{OUT}/female_raw.glb")
    keep = [bpy.data.objects["Object_4"], bpy.data.objects["Object_5"]]
    for o in keep:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action="DESELECT")
    for o in list(bpy.data.objects):
        if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
    for o in keep:
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    head, body = keep
    head.name, body.name = "Head", "Body"
    return head, body

def arm_leg_weights(head, body):
    # rig the untouched base once to learn which verts are arm and leg, then throw that rig away
    r = rig(head, body, 0.0)
    gi = {g.index: g.name for g in body.vertex_groups}
    ARM = ("Arm", "ForeArm", "Hand"); LEG = ("UpLeg", "Leg", "Foot", "ToeBase")
    aw, lw = [], []
    for v in body.data.vertices:
        a = l = 0.0
        for g in v.groups:
            n = gi[g.group]
            for side in ("Left", "Right"):
                if n in [side + x for x in ARM]: a += g.weight
                if n in [side + x for x in LEG]: l += g.weight
        aw.append(min(1.0, a)); lw.append(min(1.0, l))
    for o in (head, body):
        for m in list(o.modifiers): o.modifiers.remove(m)
        o.vertex_groups.clear(); o.parent = None
    bpy.data.objects.remove(r, do_unlink=True)
    return aw, lw

def male(head, body):
    aw, lw = arm_leg_weights(head, body)
    SH = 0.04  # arms ride out this far with the broader shoulders
    old = [v.co.copy() for v in body.data.vertices]
    # pass 1, the big frame: shoulders out, waist and hips in, arms carried. smoothed after, so no lumps at the joins
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; sg = 1 if x >= 0 else -1
        A = aw[i]; T = 1 - A
        sh = bump(1.12, 1.34, 1.5, 1.58, z)
        x = x * (1 + 0.26 * sh * T) + sg * SH * A
        x *= 1 + 0.1 * bump(1.06, 1.14, 1.24, 1.32, z) * T
        x *= 1 - 0.3 * bump(0.55, 0.8, 1.02, 1.14, z) * T
        if y > 0.1: y = 0.1 + (y - 0.1) * (1 - 0.55 * bump(0.68, 0.82, 1.0, 1.12, z) * T)
        v.co = Vector((x, y, z))
    key = lambda c: (round(c.x, 4), round(c.y, 4), round(c.z, 4))
    grp = {}; gid = []
    for c in old: gid.append(grp.setdefault(key(c), len(grp)))
    n = len(grp); nb = [set() for _ in range(n)]
    for e in body.data.edges:
        p0, p1 = gid[e.vertices[0]], gid[e.vertices[1]]
        if p0 != p1: nb[p0].add(p1); nb[p1].add(p0)
    def relax(iters):
        D = [Vector() for _ in range(n)]; cnt = [0] * n
        for i, v in enumerate(body.data.vertices):
            D[gid[i]] += v.co - old[i]; cnt[gid[i]] += 1
        D = [d / c for d, c in zip(D, cnt)]
        for _ in range(iters):
            D = [(D[g] + sum((D[k] for k in nb[g]), Vector())) / (1 + len(nb[g])) if nb[g] else D[g] for g in range(n)]
        for i, v in enumerate(body.data.vertices): v.co = old[i] + D[gid[i]]
    relax(25)
    # the silhouette by measurement: the female hourglass read per 2 cm slice, then remapped to a male line
    P = [v.co.copy() for v in body.data.vertices]
    def prof(f, lo, hi, pick):
        bins = {}
        for i, c in enumerate(P):
            if aw[i] < 0.2 and lo <= c.z <= hi and f(i, c):
                k = int(c.z / 0.02); bins[k] = pick(bins.get(k), c)
        return bins
    zs = sorted(c.z for c in P); print("zrange", round(zs[0], 3), round(zs[-1], 3), "verts", len(P), "armless", sum(1 for a in aw if a < 0.2))
    half = prof(lambda i, c: True, 0.7, 1.5, lambda m, c: max(m or 0, abs(c.x)))
    def at(bins, z):
        k = int(z / 0.02); ks = [j for j in (k - 1, k, k + 1) if j in bins]
        return sum(bins[j] for j in ks) / len(ks) if ks else 0
    wz = min((z / 100 for z in range(98, 120)), key=lambda z: at(half, z))
    ww = at(half, wz); sw = at(half, 1.42)
    print("waist", round(wz, 3), "half", round(ww, 3), "chest half", round(sw, 3), "hip half", round(max(at(half, z / 100) for z in range(80, 96)), 3))
    def target(z):
        if z >= wz: return ww + (max(sw, ww) - ww) * smooth(wz, 1.42, z) * 1.04
        return ww * (1 + 0.06 * smooth(wz, 0.78, z))
    pass1 = [v.co.copy() for v in body.data.vertices]
    for i, v in enumerate(body.data.vertices):
        z = v.co.z
        if not 0.72 <= z <= 1.42: continue
        src = at(half, z)
        if src <= 0: continue
        f = target(z) / src
        f = 1 + (min(f, 1.0) - 1) * bump(0.62, 0.76, 1.38, 1.46, z)  # only ever pulls in
        v.co.x *= 1 + (f - 1) * (1 - aw[i])
    # flat chest: the front of the ribcage on a straight line from collarbone to belly
    front = prof(lambda i, c: abs(c.x) < 0.12, 1.1, 1.5, lambda m, c: min(m if m is not None else 9, c.y))
    y0, y1 = at(front, 1.46), at(front, 1.14)
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; ax = abs(x); T = 1 - aw[i]
        band = bump(1.14, 1.2, 1.42, 1.48, z) * (1 - smooth(0.12, 0.2, ax)) * T
        if band <= 0: continue
        line = y1 + (y0 - y1) * (z - 1.14) / 0.32 - 0.006 * bump(1.3, 1.35, 1.4, 1.45, z) * bump(0.02, 0.05, 0.1, 0.13, ax)
        if y < line: v.co.y = y + (line - y) * band
    # thick neck, arm and calf mass
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; sg = 1 if x >= 0 else -1; A = aw[i]; L = lw[i]; T = 1 - A
        nk = bump(1.48, 1.53, 1.6, 1.66, z) * T
        x *= 1 + 0.25 * nk; y = 0.075 + (y - 0.075) * (1 + 0.14 * nk)
        if A > 0.5: y = 0.075 + (y - 0.075) * (1 + 0.12 * A)
        if L > 0.5 and z < 0.45:
            c = bump(0.12, 0.22, 0.34, 0.42, z); cx = sg * 0.08
            x = cx + (x - cx) * (1 + 0.1 * c); y = 0.12 + (y - 0.12) * (1 + 0.08 * c)
        v.co = Vector((x, y, z))
    old = pass1
    relax(3)
    for v in head.data.vertices:
        x, y, z = v.co
        x *= 1 + 0.08 * bump(1.56, 1.62, 1.74, 1.8, z)  # squarer, wider jaw
        v.co = Vector((x, y, z))
    body.data.update(); head.data.update()

ANAT = dict(hipZ=0.90, legX=0.078, legY=0.12, kneeZ=0.48, ankleZ=0.085, toeY=-0.01, spineY=0.09,
            shoulder=(0.075, 1.42), arm=(0.17, 1.40), neckZ=1.55, headZ=1.64, topZ=1.94)

def rig(head, body, wide):
    vs = [body.matrix_world @ v.co for v in body.data.vertices]
    tip = max(vs, key=lambda v: v.x)
    A = ANAT
    arm0 = Vector((A["arm"][0] * (1 + wide), 0.075, A["arm"][1]))
    d = tip - arm0
    wrist = arm0 + d * 0.80; elbow = arm0 + (wrist - arm0) * 0.5 + Vector((0, 0.012, 0))
    bpy.ops.object.armature_add(location=(0, 0, 0)); r = bpy.context.object; r.name = "Armature"
    bpy.ops.object.mode_set(mode="EDIT"); eb = r.data.edit_bones; eb.remove(eb[0])
    def B(n, h, t, p=None):
        b = eb.new(n); b.head, b.tail = Vector(h), Vector(t)
        if p: b.parent = eb[p]; b.use_connect = False
        return b
    sy = A["spineY"]
    B("Hips", (0, sy, A["hipZ"]), (0, sy, A["hipZ"] + 0.1))
    B("Spine", (0, sy, A["hipZ"] + 0.1), (0, sy, 1.12), "Hips")
    B("Spine1", (0, sy, 1.12), (0, sy, 1.27), "Spine")
    B("Spine2", (0, sy, 1.27), (0, sy, A["neckZ"] - 0.05), "Spine1")
    B("Neck", (0, sy, A["neckZ"] - 0.05), (0, sy, A["headZ"]), "Spine2")
    B("Head", (0, sy, A["headZ"]), (0, sy, A["topZ"] - 0.05), "Neck")
    B("HeadTop_End", (0, sy, A["topZ"] - 0.05), (0, sy, A["topZ"]), "Head")
    for s, sg in (("Left", 1), ("Right", -1)):
        # Mixamo: the character's left is +X in Blender when it faces -Y
        m = lambda v: (v[0] * sg, v[1], v[2])
        B(f"{s}Shoulder", m((A["shoulder"][0], 0.08, A["shoulder"][1])), m((arm0.x, arm0.y, arm0.z)), "Spine2")
        B(f"{s}Arm", m(arm0), m(elbow), f"{s}Shoulder")
        B(f"{s}ForeArm", m(elbow), m(wrist), f"{s}Arm")
        B(f"{s}Hand", m(wrist), m(tip), f"{s}ForeArm")
        B(f"{s}UpLeg", m((A["legX"], A["legY"], A["hipZ"] - 0.02)), m((A["legX"], A["legY"] - 0.005, A["kneeZ"])), "Hips")
        B(f"{s}Leg", m((A["legX"], A["legY"] - 0.005, A["kneeZ"])), m((A["legX"], 0.15, A["ankleZ"])), f"{s}UpLeg")
        B(f"{s}Foot", m((A["legX"], 0.15, A["ankleZ"])), m((A["legX"], 0.03, 0.02)), f"{s}Leg")
        B(f"{s}ToeBase", m((A["legX"], 0.03, 0.02)), m((A["legX"], A["toeY"] - 0.02, 0.02)), f"{s}Foot")
    bpy.ops.object.mode_set(mode="OBJECT")
    # body: bone heat; head: all Head, the neck ring blended
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); r.select_set(True)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    unweighted = sum(1 for v in body.data.vertices if not v.groups)
    print("body unweighted verts", unweighted)
    hg = head.vertex_groups.new(name="Head")
    hg.add([v.index for v in head.data.vertices], 1.0, "REPLACE")
    mod = head.modifiers.new("skin", "ARMATURE"); mod.object = r; head.parent = r
    return r

def proof(name, r):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
    sc.render.resolution_x, sc.render.resolution_y = 520, 760
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.76, 0.78, 1)
    for loc in ((2, -3, 3), (-3, 2, 2)):
        bpy.ops.object.light_add(type="SUN", location=loc); bpy.context.object.data.energy = 3
        bpy.context.object.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 45
    H = 1.0
    def shot(tag, pos):
        cam.location = pos; cam.rotation_euler = (Vector((0, 0.08, H)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/hb/{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
    shot("front", (0, -3.4, 1.0)); shot("side", (3.4, 0.08, 1.0))
    # stress pose: arm up, elbow and knee bent
    pb = r.pose.bones
    pb["LeftArm"].rotation_mode = pb["LeftForeArm"].rotation_mode = pb["RightUpLeg"].rotation_mode = pb["RightLeg"].rotation_mode = pb["RightArm"].rotation_mode = "XYZ"
    pb["LeftArm"].rotation_euler = (0, 0, math.radians(-50)); pb["LeftForeArm"].rotation_euler = (math.radians(60), 0, 0)
    pb["RightArm"].rotation_euler = (0, 0, math.radians(-55))
    pb["RightUpLeg"].rotation_euler = (math.radians(-50), 0, 0); pb["RightLeg"].rotation_euler = (math.radians(70), 0, 0)
    bpy.context.view_layer.update(); shot("pose", (2.8, -3.6, 1.1))
    for b in pb: b.rotation_euler = (0, 0, 0)

def garment(body, r, name, keep, color, cuts=(), push=0.005):
    import bmesh
    o = body.copy(); o.data = body.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    gi = {g.index: g.name for g in o.vertex_groups}
    dl = bm.verts.layers.deform.active
    for zc in cuts:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, zc), plane_no=(0, 0, 1))
    def armw(v):
        return sum(w for g, w in v[dl].items() if any(gi[g].endswith(k) for k in ("Arm", "ForeArm", "Hand"))) if dl else 0
    gone = [f for f in bm.faces if not keep(f.calc_center_median(), max(armw(v) for v in f.verts))]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    for v in bm.verts: v.co += v.normal * push
    bm.to_mesh(o.data); bm.free()
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]; bsdf.inputs["Base Color"].default_value = color; bsdf.inputs["Roughness"].default_value = 0.75
    o.data.materials.clear(); o.data.materials.append(m)
    o.parent = r
    return o

def build(name, is_male, height):
    head, body = load()
    if is_male: male(head, body)
    r = rig(head, body, 0.26 if is_male else 0.0)
    extra = []
    if not is_male:
        extra.append(garment(body, r, "Bra", lambda c, a: 1.25 < c.z < 1.42 and a < 0.3, (0.07, 0.07, 0.08, 1), cuts=(1.25, 1.42)))
        extra.append(garment(body, r, "Shorts", lambda c, a: 0.82 < c.z < 1.07 and a < 0.3, (0.08, 0.1, 0.16, 1), cuts=(0.82, 1.07)))
    s = height / 1.94
    r.scale = (s, s, s); bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body, *extra): o.select_set(True)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials[0].name = "Head_Skin"; body.data.materials[0].name = "Body_Skin"
    proof(name, r)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body, *extra): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=False, export_animations=False)
    print("exported", name)

which = sys.argv[sys.argv.index("--") + 1]
if which == "female": build("human_female", False, 1.65)
else: build("human_male", True, 1.78)
