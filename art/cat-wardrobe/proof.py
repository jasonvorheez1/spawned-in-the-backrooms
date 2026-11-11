# Proof a fitted garment on its body: blender -b -P proof.py -- <body.glb> <garment.glb> <out.png> [walk]
import bpy, sys, math
from mathutils import Vector
A = sys.argv[sys.argv.index("--") + 1:]; BODY, GARM, OUT = A[:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY); bpy.ops.import_scene.gltf(filepath=GARM)
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
for o in bpy.data.objects:
    if o.type == "MESH" and o.name.startswith("Cloth"): o.hide_render = True
    if o.type == "MESH" and o.name.startswith("Garment"):
        m = bpy.data.materials.new("g"); m.diffuse_color = (0.75, 0.2, 0.25, 1); m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.2, 0.25, 1); o.data.materials.clear(); o.data.materials.append(m)
if len(A) > 3:   # a stride + raised arm pose on both rigs
    for a in arms:
        pb = a.pose.bones
        for n, ax, deg in (("mixamorig:LeftUpLeg", "X", -40), ("mixamorig:RightUpLeg", "X", 35), ("mixamorig:LeftArm", "Z", 55), ("mixamorig:RightArm", "X", 50), ("mixamorig:Spine1", "X", 12)):
            if n in pb: pb[n].rotation_mode = "XYZ"; setattr(pb[n].rotation_euler, ax.lower(), math.radians(deg))
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 520; sc.render.resolution_y = 640
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
for i, (ang, nm) in enumerate(((0, "f"), (120, "s"), (180, "b"))):
    r = math.radians(ang); cd = bpy.data.cameras.new(nm); cd.lens = 60; c = bpy.data.objects.new(nm, cd); sc.collection.objects.link(c)
    c.location = (2.6 * math.sin(r), -2.6 * math.cos(r), 0.75); d = Vector((0, 0, 0.5)) - c.location; c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = c; sc.render.filepath = OUT.replace(".png", f"_{nm}.png"); bpy.ops.render.render(write_still=True)
