# pre-align a Tripo weapon so its long (principal) axis lies on Blender Y before art/weapons/build.py fits it
import bpy, sys, numpy as np
from mathutils import Matrix
src, dst = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects: o.select_set(o in ms)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM"); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
P = np.array([v.co[:] for v in ob.data.vertices]); c = P.mean(0)
w, V = np.linalg.eigh(np.cov((P - c).T)); V = V[:, ::-1]  # major, mid, minor
R = np.stack([V[:, 1], V[:, 0], np.cross(V[:, 1], V[:, 0])])  # rows: new X = mid, new Y = major, new Z
M = Matrix([list(r) + [0] for r in R] + [[0, 0, 0, 1]])
ob.data.transform(Matrix.Translation(-__import__("mathutils").Vector(c)))
ob.data.transform(M)
P2 = np.array([v.co[:] for v in ob.data.vertices]); print("EXT", P2.max(0) - P2.min(0))
for o in list(bpy.context.scene.objects):
    if o != ob: bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=dst, export_apply=True)
