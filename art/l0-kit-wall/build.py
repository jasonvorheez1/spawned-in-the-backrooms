# Level 0 wall & door kit: raw Tripo .glb -> oriented, sized, origin-set .glb + proof render.
# blender -b --factory-startup --python-exit-code 1 --python art/l0-kit-wall/build.py -- [kind ...]
import bpy, sys, json, math, os
from mathutils import Vector, Matrix
SRC = "/workspace/l0kit-wall"; OUT = SRC + "/out"; os.makedirs(OUT, exist_ok=True)
# size = [w, h, d] metres; fit: "xyz" exact per axis, "h" uniform by height, "wh" w,h exact and depth uniform w/ mean
KIT = {
 "outlet":       dict(size=[0.07, 0.115, 0.012], fit="xyz", origin="wall"),
 "switch":       dict(size=[0.07, 0.115, 0.018], fit="xyz", origin="wall"),
 "thermostat":   dict(src="thermostat2", size=[0.12, 0.08, 0.035], fit="xyz", origin="wall"),
 "exitsign":     dict(src="exitsign2", size=[0.33, 0.2, 0.05], fit="xyz", origin="wall"),
 "extinguisher": dict(size=[0.15, 0.5, 0.15], fit="h", origin="wall"),
 "firepull":     dict(src="firepull2", size=[0.11, 0.14, 0.05], fit="xyz", origin="wall"),
 "wallvent":     dict(size=[0.6, 0.3, 0.03], fit="xyz", origin="wall"),
 "door-office":  dict(size=[1.02, 2.13, 0.2], fit="door", origin="floor", almond=0.07),
 "door-stair":   dict(size=[1.02, 2.13, 0.2], fit="door", origin="floor", almond="all"),
}
OVR = json.load(open(SRC + "/overrides.json")) if os.path.exists(SRC + "/overrides.json") else {}
kinds = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(KIT)
report = {}
import numpy as np
def almond(ob, mode):
    """Repaint the yellow frame paint almond in the base-colour picture. mode "all": every saturated yellow texel;
    a number: only texels of faces within that many metres of the frame's outer edge (the slab keeps its veneer)."""
    from PIL import Image, ImageDraw, ImageFilter
    im = next(n.image for n in ob.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Color"))
    im.scale(2048, 2048); n = 2048
    px = np.empty(n * n * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(n, n, 4)
    rgb = px[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    yellow = (sat > 0.35) & (r >= g) & (g > b) & ((g - b) / np.maximum(r - b, 1e-6) > 0.45)   # hue above ~27 deg
    if mode != "all":
        lo, hi = bbox(ob); m = Image.new("L", (n, n), 0); d = ImageDraw.Draw(m); uv = ob.data.uv_layers.active.data
        for p in ob.data.polygons:
            c = p.center
            if abs(c.x) > hi.x - mode or c.z > hi.z - mode:
                d.polygon([(uv[i].uv.x * n, uv[i].uv.y * n) for i in p.loop_indices], fill=255)
        m = m.filter(ImageFilter.MaxFilter(5)); yellow &= np.asarray(m) > 0
    lum = mx[yellow][:, None]
    rgb[yellow] = np.clip(lum * 1.22, 0, 0.95) * np.array([0.93, 0.86, 0.72], dtype=np.float32)
    im.pixels.foreach_set(px.ravel()); im.pack()
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
    # turn: Tripo fronts face Blender +X; the kit fronts face glTF -Z = Blender +Y
    ob.data.transform(Matrix.Rotation(math.radians(K.get("turn", 90)), 4, "Z"))
    # junk islands: small loose parts whose centre lies outside the largest part's box
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    parts.sort(key=lambda o: -len(o.data.vertices)); main = parts[0]
    boxes = {o.name: bbox(o) for o in parts}; lo = Vector([min(b[0][i] for b in boxes.values()) for i in range(3)]); hi = Vector([max(b[1][i] for b in boxes.values()) for i in range(3)])
    pad = (hi - lo).length * 0.01; total = sum(len(o.data.vertices) for o in parts); dropped = 0
    def touches(a, b): return all(a[0][i] - pad <= b[1][i] and b[0][i] - pad <= a[1][i] for i in range(3))
    for o in parts[1:]:   # junk: a small island whose box meets no other island's box
        if len(o.data.vertices) < total * 0.01 and not any(touches(boxes[o.name], boxes[q.name]) for q in parts if q is not o):
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
    if K.get("almond"): almond(ob, K["almond"])
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
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8
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
