# Mirror the overhand throw clip so a grenade leaves the LEFT hand (the gun stays in the right).
import bpy, sys
SRC = "/tmp/nl/over.glb"; OUT = "/tmp/nl/overhand-left.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
src = arm.animation_data.action
f0, f1 = [int(round(v)) for v in src.frame_range]
print("bones", [b.name for b in arm.pose.bones][:12], "frames", f0, f1)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
poses = {}
sc = bpy.context.scene
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    bpy.ops.pose.copy()
    poses[f] = True
    # paste flipped onto a fresh read of the same frame, keyed into the new action
new = bpy.data.actions.new(src.name + "_left")
keys = {}
for f in range(f0, f1 + 1):
    arm.animation_data.action = src
    sc.frame_set(f)
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.copy()
    arm.animation_data.action = new
    bpy.ops.pose.paste(flipped=True)
    for pb in arm.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
        if pb.name.lower().startswith("hips"):
            pb.keyframe_insert("location", frame=f, group=pb.name)
bpy.ops.object.mode_set(mode="OBJECT")
arm.animation_data.action = new
for a in list(bpy.data.actions):
    if a is not new: bpy.data.actions.remove(a)
new.name = "OverhandThrowLeft"
sc.frame_start, sc.frame_end = f0, f1
# quick check: which arm moves most now
import mathutils
def turn(name):
    pb = arm.pose.bones.get(name); m = 0
    for f in range(f0, f1 + 1):
        sc.frame_set(f); m = max(m, pb.rotation_quaternion.angle)
    return round(m * 57.3)
print("LeftForeArm max", turn("LeftForeArm"), "RightForeArm max", turn("RightForeArm"))
bpy.ops.export_scene.gltf(filepath=OUT, export_animations=True, export_animation_mode="ACTIONS", export_apply=False)
print("wrote", OUT)
