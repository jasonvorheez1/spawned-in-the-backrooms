# head proof: each snout key at full, 3/4 + side + front: blender -b -P snout-proof.py -- <in.glb> <outdir> [keys...]
import bpy, sys, math
from mathutils import Vector
A = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = A[0], A[1]; KEYS = A[2:] or ["Basis", "Snout_Flat", "Snout_Puff"]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 520
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.35, 0.35, 0.38)
head = bpy.data.objects["Head"]; C = Vector((0, -0.02, 0.88))
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 85
L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(L); L.data.energy = 3.5
for k in KEYS:
    for kb in head.data.shape_keys.key_blocks: kb.value = 0
    if k != "Basis":
        for o in bpy.data.objects:
            if o.type == "MESH" and o.data.shape_keys and k in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks[k].value = 1
    for nm, az in (("q", -40), ("s", -90), ("f", 0)):
        a = math.radians(az); d = Vector((math.sin(a), -math.cos(a), 0.12)).normalized()
        cam.location = C + d * 1.6; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        L.rotation_euler = (-(d + Vector((0.3, 0, 0.6)))).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{OUT}/{k}_{nm}.png"; bpy.ops.render.render(write_still=True)
