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
