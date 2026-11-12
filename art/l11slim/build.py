# Level 11 street props slimmed for phones: decimate to a face budget, textures to 512 px. Run: blender -b --factory-startup --python-exit-code 1 --python art/l11slim/build.py
import bpy, os
SRC = "/tmp/slim"; OUT = "/workspace/l11slim"; os.makedirs(OUT, exist_ok=True)
BUDGET = {"meter": 2500, "payphone": 4000, "trashcan": 2500}
for name, faces in BUDGET.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    for o in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
        n = len(o.data.polygons)
        if n > faces:
            m = o.modifiers.new("dec", "DECIMATE"); m.ratio = faces / n
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="dec")
        print(name, o.name, n, "->", len(o.data.polygons))
    for img in bpy.data.images:
        if img.size[0] > 512: img.scale(512, 512 * img.size[1] // max(1, img.size[0]))
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}-slim.glb", export_format="GLB", export_image_format="JPEG", export_jpeg_quality=82)
