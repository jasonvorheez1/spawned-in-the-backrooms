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
    SH = 0.045  # arms ride out this far with the broader shoulders
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; ax = abs(x); sg = 1 if x >= 0 else -1
        A = aw[i]; L = lw[i]; T = 1 - A
        # flat chest, a firm pec plane
        w = bump(1.18, 1.26, 1.44, 1.5, z) * (1 - smooth(0.12, 0.17, ax)) * T
        if y < 0.01: y = y + (0.01 - y) * 0.95 * w
        pec = bump(1.28, 1.33, 1.40, 1.45, z) * bump(0.015, 0.05, 0.11, 0.15, ax) * T
        if y < 0.03: y -= 0.012 * pec
        # broad shoulders and lats: the torso scaled out, the arms carried rigidly
        sh = bump(1.12, 1.34, 1.5, 1.58, z)
        x = x * (1 + 0.3 * sh * T) + sg * SH * A
        # waist straight, hips and thighs in: a V, not an hourglass
        x *= 1 + 0.12 * bump(1.06, 1.14, 1.24, 1.32, z) * T
        x *= 1 - 0.25 * bump(0.74, 0.88, 1.04, 1.14, z) * T
        if L > 0.3 and 0.4 < z < 0.95:
            cx = sg * 0.078; x = cx + (x - cx) * (1 - 0.14 * bump(0.4, 0.55, 0.8, 0.95, z))
        # flatter seat
        if y > 0.1: y = 0.1 + (y - 0.1) * (1 - 0.5 * bump(0.7, 0.82, 1.0, 1.1, z) * T)
        # thick neck
        nk = bump(1.48, 1.53, 1.6, 1.66, z)
        x *= 1 + 0.28 * nk; y = 0.075 + (y - 0.075) * (1 + 0.16 * nk)
        # arm and calf mass
        if A > 0.5: y = 0.075 + (y - 0.075) * (1 + 0.16 * A)
        if L > 0.5 and z < 0.45:
            c = bump(0.12, 0.22, 0.34, 0.42, z); cx = sg * 0.078
            x = cx + (x - cx) * (1 + 0.12 * c); y = 0.12 + (y - 0.12) * (1 + 0.1 * c)
        v.co = Vector((x, y, z))
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

def garment(body, r, name, keep, color, push=0.005):
    import bmesh
    o = body.copy(); o.data = body.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    gi = {g.index: g.name for g in o.vertex_groups}
    dl = bm.verts.layers.deform.active
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
        extra.append(garment(body, r, "Bra", lambda c, a: 1.24 < c.z < 1.43 and a < 0.15, (0.07, 0.07, 0.08, 1)))
        extra.append(garment(body, r, "Shorts", lambda c, a: 0.74 < c.z < 1.08 and a < 0.15, (0.08, 0.1, 0.16, 1)))
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
