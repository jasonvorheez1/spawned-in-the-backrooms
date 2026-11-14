# Studio-style cleanup of the six raw Tripo Christmas Area props: weld, decimate, smooth normals,
# true facing (-Z), feet at y 0 and centred, textures to 1024. Inputs /workspace/xm/<sha>.glb -> /workspace/xm/out/<key>.glb
import bpy, math, os, sys
from mathutils import Vector
SRC = "/workspace/xm"; OUT = SRC + "/out"; os.makedirs(OUT, exist_ok=True)
ITEMS = {  # key: sha, target tris, yaw (deg, about up) to turn the front onto -Z
  "tree": ("b8e231e346d844025a98e483441f85845923431c33f4eb75bcc4064ca44666a0", 24000, 0),
  "clock": ("5302c36736340dff22093ccb727df8c3248c71019ccf0b1f395779d29a35ef69", 12000, -90),
  "cone": ("8f82a876c6f9b73fd0ec71337005ec8f5870e6c3ac2d69c5de76ce128238151c", 4000, 0),
  "sign": ("8a4b0105783b2d65717abedd0d0d187426a6e1e890db57cdfead97042b3a8ac0", 8000, 0),
  "table": ("e81e38b2fefa490111e61cd78b98309ece7e01aea4f2afedfd98283a72870610", 8000, 0),
  "house": ("cc08f89a04117dc5b8660b77ac2702671b1c250e3832b44bf10d0b529be96025", 12000, 0),
}
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(ITEMS)
for key in only:
    sha, tris, yaw = ITEMS[key]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{sha}.glb")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o != ob: bpy.data.objects.remove(o)
    before = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    cur = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if cur > tris:
        m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = tris / cur; m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.shade_smooth()
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(40))
    except Exception: pass
    ob.rotation_euler = (0, 0, math.radians(yaw)); bpy.ops.object.transform_apply(rotation=True)
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    ob.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)); bpy.ops.object.transform_apply(location=True)
    for img in bpy.data.images:
        if img.size[0] > 1024: img.scale(1024, 1024 * img.size[1] // img.size[0])
    after = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    d = mx - mn
    print(f"XM {key} tris {before}->{after} dims w{d.x:.3f} d{d.y:.3f} h{d.z:.3f}")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{key}.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
    # proof render: front (-Y in Blender = glTF +Z? front is glTF -Z = Blender +Y), lit from camera side
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 360; sc.render.resolution_y = 360
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    h = d.z; r = max(d.x, d.y, d.z) * 1.6
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (r * 0.5, r, h * 0.6); cam.rotation_euler = (Vector((0, 0, h / 2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); L.data.energy = 4; sc.collection.objects.link(L); L.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{OUT}/{key}.png"; bpy.ops.render.render(write_still=True)
