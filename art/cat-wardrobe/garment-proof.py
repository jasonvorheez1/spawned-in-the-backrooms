# Proof a fitted garment on its cat body: front and side, Cycles. blender -b -P garment-proof.py -- <garment.glb> <f|m> <out-prefix>
import bpy, sys, math
A = sys.argv[sys.argv.index("--") + 1:]; G, SEX, OUT = A
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/tripo-cat/cat-{'female' if SEX=='f' else 'male'}-rigged.glb")
bpy.ops.import_scene.gltf(filepath=G)
for o in bpy.data.objects:
    if o.type == "MESH" and o.name != "Body" and not o.name.startswith("Garment"):
        pass
gm = bpy.data.materials.new("cl"); gm.diffuse_color = (0.25, 0.45, 0.8, 1)
gm.use_nodes = True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.4, 0.85, 1)
body = bpy.data.objects.get("Body")
rig = body.find_armature()   # the garment rides the body's own rig as posed, the way the game skins it
for o in bpy.data.objects:
    if o.type == "MESH" and o is not body:
        for m in o.modifiers:
            if m.type == "ARMATURE": m.object = rig
for o in [o for o in bpy.data.objects if o.type == "ARMATURE" and o is not rig]: o.hide_render = True
for o in bpy.data.objects:
    if o.type == "MESH" and o is not body:
        for s in o.material_slots:
            if s.material and s.material.name.startswith("cloth"): s.material = gm
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
sc.render.resolution_x, sc.render.resolution_y = 500, 640
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 1.35
for name, (x, y, rz) in {"front": (0, -3, 0), "side": (3, 0, 90)}.items():
    cam.location = (x, y, 0.62); cam.rotation_euler = (math.radians(90), 0, math.radians(rz))
    sc.render.filepath = f"{OUT}_{name}.png"; bpy.ops.render.render(write_still=True)
