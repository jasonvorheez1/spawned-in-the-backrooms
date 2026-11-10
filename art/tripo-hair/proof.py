# proof: body head + a fitted hair, front / 3-4 / back, tinted. blender -b -P proof.py -- <sex> <hair.glb> <out.png> [r g b]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SEX, HAIR, OUT = a[:3]; col = tuple(float(x) for x in a[3:6]) if len(a) >= 6 else (0.05, 0.04, 0.035)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/human/ht/{SEX}.glb")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
hz = (rig.matrix_world @ rig.data.bones["Head"].head_local)
before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=HAIR)
m = bpy.data.materials.new("h"); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = 0.45
for o in set(bpy.data.objects) - before:
    if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(m)
for o in bpy.data.objects:
    if o.type == "MESH" and o.name not in ("Body", "Head", "Icosphere") and o.name.split("_")[0] in ("Hat", "Eyew", "Top", "Bot", "Neck", "Shoes", "Under"): o.hide_render = True
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
c = Vector((0, 0, hz.z + 0.08)); cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); cam.data.lens = 85; sc.camera = cam
L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(L); L.data.energy = 3
import os; parts = []
for i, ang in enumerate((0, 40, 100, 180)):
    r = math.radians(ang); p = c + Vector((math.sin(r) * 0.9, -math.cos(r) * 0.9, 0.08)); cam.location = p
    cam.rotation_euler = (c - p).to_track_quat("-Z", "Y").to_euler(); L.rotation_euler = cam.rotation_euler
    f = f"/tmp/pf_{i}.png"; sc.render.filepath = f; bpy.ops.render.render(write_still=True); parts.append(f)
os.system(f"montage {' '.join(parts)} -tile 4x1 -geometry +2+2 {OUT}")
