# Level 132 land kit: Tripo source -> metres, bottom-centre origin, engine front -Z, warm emissive windows, 1024 px maps.
# blender -b --factory-startup --python-exit-code 1 --python art/l132-land/build.py -- [names...]
import bpy, sys, math, numpy as np
from mathutils import Vector, Matrix
SRC = "/workspace/art132/"; OUT = "/workspace/art132/out/"
# name: (measure, metres, extra yaw deg after the +X->front turn, emissive windows, smooth)
KIT = {
 "c1": ("h", 8.6, 0, 1, 0), "c2": ("h", 7.0, 0, 1, 0), "c3": ("h", 8.4, 0, 1, 0), "c4": ("h", 6.2, 0, 1, 0), "c5": ("h", 6.0, 0, 1, 0),
 "mill2": ("h", 15.0, 0, 0, 0), "sails": ("w", 13.0, 0, 0, 0), "gate": ("h", 5.4, 0, 1, 0), "wall": ("h", 0.95, 0, 0, 0),
 "fpw": ("h", 2.7, 0, 0, 0), "fpe": ("h", 2.7, 0, 0, 0), "fpn": ("h", 2.7, 0, 0, 0), "fpk": ("h", 3.0, 0, 0, 0), "fps": ("h", 2.7, 0, 0, 0),
 "warn": ("h", 2.1, 0, 0, 0), "oak": ("h", 13.0, 0, 0, 1), "apple": ("h", 5.2, 0, 0, 1), "pear": ("h", 5.8, 0, 0, 1),
 "bale": ("h", 1.5, 0, 0, 0), "g1": ("w", 3.4, 0, 0, 0), "g2": ("w", 3.2, 0, 0, 0),
}
YAW = {}
import json, os
if os.path.exists(SRC + "yaw.json"): YAW = json.load(open(SRC + "yaw.json"))
names = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(KIT)
os.makedirs(OUT, exist_ok=True)
report = {}
for n in names:
    how, size, yaw, emis, smooth = KIT[n]; yaw = YAW.get(n, yaw)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC + n + ".glb")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    # Tripo's pictured side is +X; engine front (-Z) is Blender +Y
    me.transform(Matrix.Rotation(math.radians(90 + yaw), 4, "Z"))
    co = np.array([v.co[:] for v in me.vertices])
    if n == "sails":   # cut the display stand under the hub, centre on the hub
        W = co[:, 0].max() - co[:, 0].min(); xc = (co[:, 0].max() + co[:, 0].min()) / 2
        far = np.abs(co[:, 0] - xc) > 0.25 * W; hz = np.median(co[far, 2])
        kill = (np.abs(co[:, 0] - xc) < 0.04 * W) & (co[:, 2] < hz - 0.075 * W)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero(kill)[0]], context="VERTS"); bm.to_mesh(me); bm.free()
        co = np.array([v.co[:] for v in me.vertices])
    mn, mx = co.min(0), co.max(0)
    ext = mx - mn
    k = size / (ext[2] if how == "h" else max(ext[0], ext[1]))
    cz = (mn[2] + mx[2]) / 2 if n == "sails" else mn[2]
    me.transform(Matrix.Scale(k, 4) @ Matrix.Translation(Vector((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -cz))))
    if smooth:
        for p in me.polygons: p.use_smooth = True
    for mat in me.materials:
        nt = mat.node_tree; bsdf = next(x for x in nt.nodes if x.type == "BSDF_PRINCIPLED")
        base = None
        for node in nt.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                im = node.image
                if max(im.size) > 1024: im.scale(1024, 1024)
                if any(l.to_socket.name == "Base Color" for l in node.outputs[0].links): base = node
        if emis and base:
            im = base.image; w, h = im.size
            px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
            r, g, b = px[..., 0], px[..., 1], px[..., 2]
            m = ((r > 0.72) & (g > 0.5) & (b < 0.55 * r) & (g > 0.6 * r) & (g < 0.97 * r)).astype(np.float32)
            e = np.zeros_like(px); e[..., 0] = r * m; e[..., 1] = g * m * 0.85; e[..., 2] = b * m * 0.5; e[..., 3] = 1
            ei = bpy.data.images.new(n + "_emit", w, h); ei.pixels = e.ravel(); ei.pack()
            en = nt.nodes.new("ShaderNodeTexImage"); en.image = ei
            nt.links.new(en.outputs[0], bsdf.inputs["Emission Color"]); bsdf.inputs["Emission Strength"].default_value = 2.2
            report[n + "_emitfrac"] = float(m.mean())
    co = np.array([v.co[:] for v in me.vertices]); report[n] = [round(float(v), 2) for v in (co.max(0) - co.min(0))] + [len(me.polygons)]
    bpy.ops.export_scene.gltf(filepath=OUT + n + ".glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
    # proofs: engine front (camera on +Y looking -Y) and from above-right
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 384
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.78, 0.82, 1)
    S = max(report[n][:3]); mid = Vector((0, 0, 0 if n == "sails" else report[n][2] / 2))
    for tag, d in (("f", Vector((0, 1, 0.25))), ("s", Vector((1, 0.35, 0.3)))):
        cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam)
        cam.location = mid + d.normalized() * S * 2.1; cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
        sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sun.data.energy = 3; sc.collection.objects.link(sun); sun.rotation_euler = cam.rotation_euler
        sc.render.filepath = OUT + n + "_" + tag + ".png"; bpy.ops.render.render(write_still=True)
json.dump(report, open(OUT + "report_" + names[0] + ".json", "w"))
print("REPORT", json.dumps(report))
