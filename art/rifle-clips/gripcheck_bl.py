# Blender cross-check of gripcheck.py: body + clip, hand frames in glTF (Y-up) coords at a time
import bpy, sys
from mathutils import Quaternion, Vector, Matrix
a = sys.argv[sys.argv.index("--")+1:]; body, clip, t = a[0], a[1], float(a[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body, bone_heuristic="BLENDER")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
n0 = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=clip, bone_heuristic="BLENDER")
act = [x for x in bpy.data.actions][-1]
rig.animation_data_create(); rig.animation_data.action = act
bpy.context.scene.render.fps = 30; bpy.context.scene.frame_set(int(t*30)); bpy.context.view_layer.update()
C = Matrix(((1,0,0),(0,0,1),(0,-1,0)))  # blender -> gltf
for b in ("RightHand","LeftHand","RightArm","Head"):
    M = rig.matrix_world @ rig.pose.bones[b].matrix
    p = C @ M.translation; q = (C @ M.to_3x3() @ C.inverted()).to_quaternion()
    print(b, "pos", tuple(round(x,3) for x in p), "q xyzw", tuple(round(x,3) for x in (q.x,q.y,q.z,q.w)))
