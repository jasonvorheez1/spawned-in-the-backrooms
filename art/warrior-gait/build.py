# Warrior walk/run (Shelly #95877: the cycles, never its rig), baked ONTO our human rig so its keys are our bones'
# own local turns: each limb points where the warrior's limb points each frame; hands/feet/head copy the warrior's
# turn away from its own bind. args: <warrior clip glb> <human glb> <out glb>
import bpy, sys
src, hum, out = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == "MESH": bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
W = list(bpy.data.objects)
def S(n): return next(o for o in W if o.name.startswith(n + "_0") and not o.name[len(n)+1:].count("_"))
MAP = [("Hips", "BND_C_Pelvis1", "Spine"), ("Spine", "BND_C_Spine2", "Spine1"), ("Spine1", "BND_C_Spine3", "Spine2"), ("Spine2", "BND_C_Spine4", "Neck"),
       ("Neck", "BND_C_Neck1", "Head"), ("Head", "BND_C_Head", None)]
for side, L in (("Left", "L"), ("Right", "R")):
    MAP += [(side+"Shoulder", f"BND_{L}_Clav1", side+"Arm"), (side+"Arm", f"BND_{L}_Arm1", side+"ForeArm"), (side+"ForeArm", f"BND_{L}_Arm2", side+"Hand"), (side+"Hand", f"BND_{L}_Arm3", None),
            (side+"UpLeg", f"BND_{L}_Leg1", side+"Leg"), (side+"Leg", f"BND_{L}_Leg2", side+"Foot"), (side+"Foot", f"BND_{L}_Leg3", None)]
srcs = {m: S(s) for m, s, _ in MAP}
sc = bpy.context.scene
acts = {o: o.animation_data.action for o in W if o.animation_data and o.animation_data.action}
f0, f1 = map(int, next(iter(acts.values())).frame_range)
def grab(): return {m: (o.matrix_world.to_translation(), o.matrix_world.to_quaternion().normalized()) for m, o in srcs.items()}
slots = {o: o.animation_data.action_slot for o in acts}  # layered actions: one action, a slot per joint; reassigning drops it
for o in acts: o.animation_data.action = None
bpy.context.view_layer.update(); wrest = grab()
for o, a in acts.items(): o.animation_data.action = a; o.animation_data.action_slot = slots[o]
rec = {}
for f in range(f0, f1 + 1): sc.frame_set(f); rec[f] = grab()
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=hum)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in list(bpy.data.objects):
    if o is not rig: bpy.data.objects.remove(o, do_unlink=True)
if rig.animation_data: rig.animation_data.action = None
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()
RW = rig.matrix_world
hrest = {m: (RW @ rig.pose.bones[m].head, (RW @ rig.pose.bones[m].matrix).to_quaternion().normalized()) for m, _, _ in MAP}
k = (hrest["LeftUpLeg"][0] - hrest["LeftFoot"][0]).length / (wrest["LeftUpLeg"][0] - wrest["LeftFoot"][0]).length
act = bpy.data.actions.new("Gait"); rig.animation_data_create(); rig.animation_data.action = act
for f in range(f0, f1 + 1):
    r = rec[f]
    for m, _, child in MAP:  # parents first
        q = (r[m][1] @ wrest[m][1].inverted()) @ hrest[m][1]
        if child:  # exact aim: our limb points where the warrior's points
            hd0 = (hrest[child][0] - hrest[m][0]).normalized(); d1 = (r[child][0] - r[m][0]).normalized()
            aim = q @ (hrest[m][1].inverted() @ hd0); q = aim.rotation_difference(d1) @ q
        M = q.to_matrix().to_4x4(); M.translation = hrest[m][0]
        if m == "Hips": M.translation = hrest[m][0] + (r[m][0] - wrest[m][0]) * k
        pb = rig.pose.bones[m]; pb.matrix = RW.inverted() @ M
        bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
        if m == "Hips": pb.keyframe_insert("location", frame=f)
bpy.ops.object.mode_set(mode="OBJECT")
sc.frame_start, sc.frame_end = f0, f1
bpy.ops.export_scene.gltf(filepath=out, export_animations=True, export_force_sampling=True, export_animation_mode="ACTIONS")
print("BAKED", f0, f1, "k", round(k, 3))
