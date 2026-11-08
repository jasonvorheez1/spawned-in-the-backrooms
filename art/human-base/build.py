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

def male(head, body):
    for o in (head, body):
        for v in o.data.vertices:
            x, y, z = v.co
            ax = abs(x); sg = 1 if x >= 0 else -1
            if o is body:
                # flat chest, then a firm pec plane with a low edge
                w = bump(1.18, 1.26, 1.44, 1.5, z) * (1 - smooth(0.12, 0.17, ax))
                if y < 0.01: y = y + (0.01 - y) * 0.97 * w
                pec = bump(1.27, 1.33, 1.40, 1.45, z) * bump(0.015, 0.05, 0.11, 0.15, ax)
                if y < 0.05: y -= 0.016 * pec
                # broad shoulders, traps and upper back
                k = 0.34 * smooth(1.18, 1.42, z) * (1 - smooth(1.52, 1.6, z))
                x = x * (1 + k) if ax <= 0.18 else x + sg * 0.18 * k
                tr = bump(1.44, 1.5, 1.56, 1.62, z) * bump(0.04, 0.08, 0.16, 0.2, ax)
                z += 0.012 * tr
                # hips and thighs taken in hard, waist filled straight: a V, not an hourglass
                if ax < 0.24:
                    x *= 1 - 0.27 * bump(0.66, 0.82, 1.04, 1.14, z)
                    x *= 1 + 0.22 * bump(1.04, 1.14, 1.26, 1.36, z)
                # outer thigh flare off
                if 0.45 < z < 0.86 and ax > 0.03:
                    x = sg * (0.03 + (ax - 0.03) * (1 - 0.18 * bump(0.45, 0.6, 0.78, 0.86, z)))
                # flatter seat
                if y > 0.1: y = 0.1 + (y - 0.1) * (1 - 0.6 * bump(0.68, 0.8, 1.0, 1.08, z))
                # thick neck
                nk = bump(1.48, 1.54, 1.62, 1.68, z)
                x *= 1 + 0.32 * nk; y = 0.075 + (y - 0.075) * (1 + 0.2 * nk)
                # arm and calf mass
                if ax > 0.2 and z > 1.0: y = 0.075 + (y - 0.075) * 1.22
                if z < 0.45 and ax > 0.02:
                    c = bump(0.12, 0.22, 0.34, 0.42, z)
                    cx = sg * 0.078; x = cx + (x - cx) * (1 + 0.14 * c); y = 0.12 + (y - 0.12) * (1 + 0.12 * c)
            else:
                # square jaw and chin, heavier brow, wider lower face
                j = bump(1.56, 1.62, 1.74, 1.8, z)
                x *= 1 + 0.13 * j
                ch = bump(1.55, 1.59, 1.64, 1.68, z) * (1 - smooth(0.02, 0.05, ax))
                z -= 0.012 * ch; y -= 0.006 * ch
                br = bump(1.79, 1.82, 1.85, 1.88, z) * (1 if y < 0.0 else 0)
                y -= 0.006 * br
            v.co = Vector((x, y, z))
        o.data.update()

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

def build(name, is_male, height):
    head, body = load()
    if is_male: male(head, body)
    r = rig(head, body, 0.30 if is_male else 0.0)
    s = height / 1.94
    r.scale = (s, s, s); bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body): o.select_set(True)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials[0].name = "Head_Skin"; body.data.materials[0].name = "Body_Skin"
    proof(name, r)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=False, export_animations=False)
    print("exported", name)

which = sys.argv[sys.argv.index("--") + 1]
if which == "female": build("human_female", False, 1.65)
else: build("human_male", True, 1.78)
