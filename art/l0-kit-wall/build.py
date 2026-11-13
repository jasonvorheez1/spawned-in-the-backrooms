# Level 0 wall & door kit: raw Tripo .glb -> oriented, sized, origin-set .glb + proof render.
# blender -b --factory-startup --python-exit-code 1 --python art/l0-kit-wall/build.py -- [kind ...]
import bpy, sys, json, math, os
from mathutils import Vector, Matrix
SRC = "/workspace/l0kit-wall"; OUT = SRC + "/out"; os.makedirs(OUT, exist_ok=True)
# size = [w, h, d] metres; fit: "xyz" exact per axis, "h" uniform by height, "wh" w,h exact and depth uniform w/ mean
KIT = {
 "outlet":       dict(size=[0.07, 0.115, 0.012], fit="xyz", origin="wall"),
 "switch":       dict(size=[0.07, 0.115, 0.018], fit="xyz", origin="wall"),
 "thermostat":   dict(size=[0.12, 0.08, 0.035], fit="xyz", origin="wall"),
 "exitsign":     dict(size=[0.33, 0.2, 0.05], fit="xyz", origin="wall"),
 "extinguisher": dict(size=[0.15, 0.5, 0.15], fit="h", origin="wall"),
 "firepull":     dict(size=[0.11, 0.14, 0.05], fit="xyz", origin="wall"),
 "wallvent":     dict(size=[0.6, 0.3, 0.03], fit="xyz", origin="wall"),
 "door-office":  dict(size=[1.02, 2.13, 0.2], fit="door", origin="floor"),
 "door-stair":   dict(size=[1.02, 2.13, 0.2], fit="door", origin="floor"),
}
OVR = json.load(open(SRC + "/overrides.json")) if os.path.exists(SRC + "/overrides.json") else {}
kinds = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(KIT)
report = {}
def bbox(o):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
for kind in kinds:
    K = dict(KIT[kind]); K.update(OVR.get(kind, {}))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{K.get('src', kind)}.glb")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # turn: Tripo fronts face Blender -Y; the kit fronts face glTF -Z = Blender +Y
    ob.rotation_euler = (0, 0, math.radians(K.get("turn", 180)))
    bpy.ops.object.transform_apply(rotation=True)
    # junk islands: small loose parts whose centre lies outside the largest part's box
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    parts.sort(key=lambda o: -len(o.data.vertices)); main = parts[0]; lo, hi = bbox(main); pad = (hi - lo) * 0.02
    total = sum(len(o.data.vertices) for o in parts); dropped = 0
    for o in parts[1:]:
        a, b = bbox(o); c = (a + b) / 2
        outside = any(c[i] < lo[i] - pad[i] or c[i] > hi[i] + pad[i] for i in range(3))
        if (outside and len(o.data.vertices) < total * 0.01) or len(o.data.vertices) < 8:
            bpy.data.objects.remove(o); dropped += 1
    parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = main
    if len(parts) > 1: bpy.ops.object.join()
    ob = main
    lo, hi = bbox(ob); raw = hi - lo
    # baked ground plane: a thin slab of verts at the very bottom much wider than the rest is cut by 'cutBottom'
    if K.get("cutBottom"):
        zc = lo.z + raw.z * K["cutBottom"]
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.bisect(plane_co=(0, 0, zc), plane_no=(0, 0, 1), clear_inner=True, use_fill=True); bpy.ops.object.mode_set(mode="OBJECT")
        lo, hi = bbox(ob); raw = hi - lo
    W, H, D = K["size"]
    if K["fit"] == "xyz": s = Vector((W / raw.x, D / raw.y, H / raw.z))
    elif K["fit"] == "h": s = Vector((H / raw.z,) * 3)
    else:  # door: w,h exact; depth so the FRAME (the head, top 2%) is D deep
        ys = [v.co.y for v in ob.data.vertices if v.co.z > hi.z - raw.z * 0.02]
        s = Vector((W / raw.x, D / (max(ys) - min(ys)), H / raw.z))
    ob.data.transform(Matrix.Diagonal((s.x, s.y, s.z, 1)))
    lo, hi = bbox(ob)
    if K["origin"] == "wall": off = Vector(((lo.x + hi.x) / 2, lo.y, lo.z))
    else:
        ys = [v.co.y for v in ob.data.vertices if v.co.z > hi.z - (hi.z - lo.z) * 0.02]
        off = Vector(((lo.x + hi.x) / 2, (min(ys) + max(ys)) / 2, lo.z))
    ob.data.transform(Matrix.Translation(-off)); ob.location = (0, 0, 0)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris > 12000:
        m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = 11800 / tris; bpy.ops.object.modifier_apply(modifier="dec")
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(K.get("smooth", 40)))
    ob.name = kind
    for i, m in enumerate(ob.data.materials):
        if m: m.name = kind if i == 0 else f"{kind}-{i}"
    lo, hi = bbox(ob); size = hi - lo
    report[kind] = dict(size=[round(size.x, 4), round(size.z, 4), round(size.y, 4)], tris=tris, dropped=dropped,
                        stretch=[round(s.x / s.z, 3), round(s.y / s.z, 3)], lo=[round(v, 4) for v in lo], hi=[round(v, 4) for v in hi])
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
    # proof: front 3/4 from the +Y side (the kit's front), lit from the camera
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
    sc.render.resolution_x = sc.render.resolution_y = 640
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    c = Vector((0, size.y / 2 if K["origin"] == "wall" else 0, size.z / 2)); r = max(size.x, size.z) * 1.9
    for tag, ang in (("f", 25), ("s", 80)):
        cam = bpy.data.objects.new("cam" + tag, bpy.data.cameras.new("c")); sc.collection.objects.link(cam)
        a = math.radians(ang); cam.location = c + Vector((math.sin(a) * r, math.cos(a) * r, r * 0.15))
        cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.clip_start = 0.005
        sun = bpy.data.objects.new("sun" + tag, bpy.data.lights.new("s" + tag, "SUN")); sc.collection.objects.link(sun)
        sun.rotation_euler = cam.rotation_euler; sun.data.energy = 2.5
        sc.camera = cam; sc.render.filepath = f"{OUT}/{kind}_{tag}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(sun)
print("REPORT " + json.dumps(report))
json.dump({**(json.load(open(OUT + "/report.json")) if os.path.exists(OUT + "/report.json") else {}), **report}, open(OUT + "/report.json", "w"), indent=1)
