# Proof sheet for fitted cat hats: head + hat from FRONT (-Y), SIDE (+X), BACK (+Y) and 3/4, each lit from its own camera, Cycles 12 samples, 500 px,
# camera 1.6 m away, lens 50, aimed 5 cm below the crown. Hats that close over the ears (COVERS) are shown with Ear_Hide on, as the game does.
# run: cd /workspace && blender -b --factory-startup --python-exit-code 1 --python world/art/cat-wardrobe/hat-proof.py -- [--sex f|m] <kinds...|none>
#      then: montage /workspace/hats/proof/<kind>-{f,m}-{front,side,back,q}.png -tile 4x2 -geometry +2+2 sheet.png && spawn see sheet.png
import bpy, sys, os
from mathutils import Vector
OUT = "/workspace/hats/out"; P = "/workspace/hats/proof"; os.makedirs(P, exist_ok=True)
COVERS = ("divehelm", "chitinhelm", "beanie", "souwester", "pilgrimhat")
args = sys.argv[sys.argv.index("--")+1:]
sexes = ("f", "m")
if "--sex" in args: i = args.index("--sex"); sexes = (args[i+1],); del args[i:i+2]
for sex in sexes:
  for k in args:
    f = f"{OUT}/{k}-{sex}.glb"
    if k != "none" and not os.path.exists(f): print("MISSING", f); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o.name not in ("Head", "Body"): bpy.data.objects.remove(o)
        elif o.type == "ARMATURE": o.data.pose_position = "REST"
    hd = bpy.data.objects["Head"]
    if k in COVERS: hd.data.shape_keys.key_blocks["Ear_Hide"].value = 1
    top = max((hd.matrix_world @ v.co).z for v in hd.data.vertices if abs(v.co.x) < 0.02)
    if k != "none":
        bpy.ops.import_scene.gltf(filepath=f)
        tint = bpy.data.materials.new("tint"); tint.use_nodes = True
        tint.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.2, 0.15, 1)
        for h in bpy.context.selected_objects:
            if h.type == "MESH": h.data.materials.clear(); h.data.materials.append(tint)
            elif h.type == "ARMATURE": h.data.pose_position = "REST"
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 500
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.32, 0.36, 1)
    tgt = Vector((0, 0, top - 0.05))
    cd = bpy.data.cameras.new("c"); cd.lens = 50; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.data.energy = 3.5
    for n, d in (("front", (0, -1, 0)), ("side", (1, 0, 0)), ("back", (0, 1, 0)), ("q", (0.62, -0.7, 0.35))):
        d = Vector(d).normalized(); cam.location = tgt + d * 1.6
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler(); L.rotation_euler = cam.rotation_euler
        sc.render.filepath = f"{P}/{k}-{sex}-{n}.png"; bpy.ops.render.render(write_still=True)
