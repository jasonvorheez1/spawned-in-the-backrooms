# The Carolynne cut into moving parts: body, hopper (ornament funnel) and pump (ribbed forend), all sharing the source origin
import bpy, bmesh, os
from mathutils import Vector
OUT = "/workspace/carol"; os.makedirs(OUT, exist_ok=True)
def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath="/workspace/caro.glb")
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    return ms
ms = load()
for o in ms:
    print("MESH", o.name, len(o.data.polygons), [round(v,3) for v in o.matrix_world.translation], o.parent.name if o.parent else None)
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    print(" bounds", [round(min(w[i] for w in ws),3) for i in range(3)], [round(max(w[i] for w in ws),3) for i in range(3)])
