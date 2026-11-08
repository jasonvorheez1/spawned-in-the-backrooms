# Spamton for the Level 11 dumpster: Shelly's upload holds three posed copies side by side, lying in Blender's XY plane.
# This keeps one figure, stands it upright facing glTF +Z, origin at its feet, 1.3 m tall, and exports it.
import bpy, sys, os
from mathutils import Vector, Matrix
pick = int(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else -1
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/spm/spam.glb")
ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM"); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
def bb(o):
    c = [o.matrix_world @ Vector(v) for v in o.bound_box]
    return [min(v[i] for v in c) for i in range(3)], [max(v[i] for v in c) for i in range(3)]
B = {o.name: bb(o) for o in parts}
par = {o.name: o.name for o in parts}
def f(a):
    while par[a] != a: par[a] = par[par[a]]; a = par[a]
    return a
names = list(B); T = 0.004
for i, a in enumerate(names):
    for b in names[i + 1:]:
        (a0, a1), (b0, b1) = B[a], B[b]
        if all(a0[k] - T <= b1[k] and b0[k] - T <= a1[k] for k in range(3)): par[f(a)] = f(b)
groups = {}
for n in names: groups.setdefault(f(n), []).append(n)
gs = sorted(groups.values(), key=lambda g: -sum(len(bpy.data.objects[n].data.polygons) for n in g))
for i, g in enumerate(gs[:8]):
    lo = [min(B[n][0][k] for n in g) for k in range(3)]; hi = [max(B[n][1][k] for n in g) for k in range(3)]
    print("GROUP", i, len(g), sum(len(bpy.data.objects[n].data.polygons) for n in g), [round(x, 2) for x in lo], [round(x, 2) for x in hi])
if pick < 0: sys.exit(0)
keep = set(gs[pick])
for o in list(parts):
    if o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active; body.name = "Spamton"
lo, hi = bb(body)
H = 1.3; s = H / (hi[2] - lo[2])
body.data.transform(Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
body.data.transform(Matrix.Scale(s, 4))
yaw = float(sys.argv[sys.argv.index("--") + 2]) if len(sys.argv) > sys.argv.index("--") + 2 else 0.0
body.data.transform(Matrix.Rotation(yaw * 3.14159265 / 180, 4, "Z"))
bpy.ops.object.shade_smooth() if False else None
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); w.color = (0.8, 0.8, 0.8); sc.world = w
import math
os.makedirs("/tmp/spm/proof", exist_ok=True)
for name, pos in (("front", (0, -3, 0.7)), ("side", (3, 0, 0.7)), ("back", (0, 3, 0.7)), ("left", (-3, 0, 0.7))):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(cam); cam.location = pos
    d = Vector((0, 0, 0.65)) - Vector(pos); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    L = bpy.data.objects.new("L" + name, bpy.data.lights.new("L" + name, "SUN")); sc.collection.objects.link(L); L.rotation_euler = cam.rotation_euler; L.data.energy = 2
    sc.camera = cam; sc.render.filepath = f"/tmp/spm/proof/{pick}_{name}.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=f"/workspace/spamton_{pick}.glb", export_apply=True, use_selection=False)
print("TRIS", sum(len(p.vertices) - 2 for p in body.data.polygons))
