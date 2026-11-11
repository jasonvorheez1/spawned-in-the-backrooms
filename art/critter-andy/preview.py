# Before/after of the critter male body (Dandy vs Dandy+Andy) in a long sleeve, pants and sneakers with the cat head.
import bpy, os, sys
from mathutils import Vector
W = "/workspace/cr"; OUT = "/tmp/cra"; os.makedirs(OUT, exist_ok=True)
POSE = os.environ.get("POSE", "")
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=p); return [o for o in bpy.data.objects if o not in before]
SHOW = ("Body", "Ward_longsleeve", "Ward_pants", "Ward_sneakers", "Skin_hands", "Skin_neck")
def body(path, dx, andy):
    objs = imp(path) + imp(f"{W}/head_cat_m.glb")
    for o in objs:
        if o.parent is None: o.location.x += dx
        if o.type == "MESH" and o.data.shape_keys:
            kb = o.data.shape_keys.key_blocks
            if "Dandy" in kb: kb["Dandy"].value = 1
            if "Andy" in kb: kb["Andy"].value = 1 if andy else 0
        if o.type == "MESH" and any(k in o.data.shape_keys.key_blocks for k in ("Dandy",)) if (o.type == "MESH" and o.data.shape_keys) else False:
            o.hide_render = not o.name.split(".")[0] in SHOW
    if POSE:
        for a in objs:
            if a.type == "ARMATURE":
                for side, sg in (("Left", 1), ("Right", -1)):
                    b = a.pose.bones.get(side + "Arm")
                    if b: b.rotation_mode = "XYZ"; b.rotation_euler = (0, 0, sg * -1.1)
                    b = a.pose.bones.get(side + "UpLeg")
                    if b and side == "Left": b.rotation_mode = "XYZ"; b.rotation_euler = (0.6, 0, 0)
    return objs
body(f"{W}/body_m.glb", -0.7, False)
body(f"{W}/body_m_andy.glb", 0.7, True)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 760; sc.render.resolution_y = 760
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.3, 0.3, 0.33, 1)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(l); l.data.energy = 3.5
for name, pos in (("a_front", (0, -4.6, 1.0)), ("b_side", (4.6, -1.4, 1.0)), ("c_back", (0, 4.6, 1.0))):
    cam.location = Vector(pos); d = Vector((0, 0, 0.8)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); l.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{OUT}/{POSE}{name}.png"; bpy.ops.render.render(write_still=True)
