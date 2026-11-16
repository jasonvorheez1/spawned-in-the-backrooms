# turn the Tripo slim kemono so she faces Blender -Y (glTF +Z), rig and body together, then export for BodyWorks
import bpy, math, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/kemono/kemono-slim-rig.glb")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH")
dg = bpy.context.evaluated_depsgraph_get()
def bounds():
    vs = [body.matrix_world @ v.co for v in body.evaluated_get(dg).data.vertices]
    return [min(v[i] for v in vs) for i in range(3)], [max(v[i] for v in vs) for i in range(3)]
lo, hi = bounds(); print("before", lo, hi)
hb = rig.pose.bones["mixamorig:LeftUpLeg"].head; lw = rig.matrix_world @ hb
print("left leg world", lw)
root = rig.parent or rig
while root.parent: root = root.parent
# left must sit at +X when facing -Y. find angle that puts left leg at +X
import math
ang = math.atan2(lw.y, lw.x)  # current angle of left side
rot = -ang  # bring to +X
root.rotation_mode = "XYZ"; root.rotation_euler.z += rot
bpy.context.view_layer.update()
lw2 = rig.matrix_world @ rig.pose.bones["mixamorig:LeftUpLeg"].head
print("rot deg", math.degrees(rot), "left leg after", lw2)
bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = root
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
dg = bpy.context.evaluated_depsgraph_get(); lo, hi = bounds(); print("after", lo, hi)
bpy.ops.export_scene.gltf(filepath="/workspace/kemono/kemono-slim-front.glb", export_apply=False)
