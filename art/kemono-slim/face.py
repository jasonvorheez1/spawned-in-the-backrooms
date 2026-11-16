# turn the Tripo slim kemono (toes point glTF +X) so she faces glTF +Z (Blender -Y), rig and body together, for BodyWorks and every garment
import bpy, math
from mathutils import Matrix, Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/kemono/kemono-slim-rig.glb")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
def toe():
    a = rig.matrix_world @ rig.data.bones["mixamorig:LeftFoot"].head_local; b = rig.matrix_world @ rig.data.bones["mixamorig:LeftToeBase"].head_local
    return b - a
t = toe(); print("toe before", t)
ang = math.atan2(-1, 0) - math.atan2(t.y, t.x)   # bring toe direction to -Y
R = Matrix.Rotation(ang, 4, "Z")
for o in bpy.data.objects:
    if o.parent is None: o.matrix_world = R @ o.matrix_world
bpy.context.view_layer.update()
print("rot deg", math.degrees(ang), "toe after", toe())
L = rig.matrix_world @ rig.data.bones["mixamorig:LeftUpLeg"].head_local; print("left hip x (want +)", L.x)
bpy.ops.export_scene.gltf(filepath="/workspace/kemono/kemono-slim-front.glb")
