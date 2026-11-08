# Warrior walk/run (Shelly #95877: the cycles, never its rig) onto Mixamo names: one armature, one action,
# rest = the warrior's own bind pose, so the engine fits the motion onto our humans' rest.
import bpy, sys, mathutils
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
def S(n): return next(o for o in bpy.data.objects if o.name.startswith(n + "_0") and not o.name[len(n)+1:].count("_"))
MAP = [("Hips", None, "BND_C_Pelvis1"), ("Spine", "Hips", "BND_C_Spine2"), ("Spine1", "Spine", "BND_C_Spine3"), ("Spine2", "Spine1", "BND_C_Spine4"),
       ("Neck", "Spine2", "BND_C_Neck1"), ("Head", "Neck", "BND_C_Head")]
for side, L in (("Left", "L"), ("Right", "R")):
    MAP += [(side+"Shoulder", "Spine2", f"BND_{L}_Clav1"), (side+"Arm", side+"Shoulder", f"BND_{L}_Arm1"), (side+"ForeArm", side+"Arm", f"BND_{L}_Arm2"), (side+"Hand", side+"ForeArm", f"BND_{L}_Arm3"),
            (side+"UpLeg", "Hips", f"BND_{L}_Leg1"), (side+"Leg", side+"UpLeg", f"BND_{L}_Leg2"), (side+"Foot", side+"Leg", f"BND_{L}_Leg3")]
srcs = {m: S(s) for m, _, s in MAP}
sc = bpy.context.scene
def unscaled(M):
    l, r, s = M.decompose(); return mathutils.Matrix.LocRotScale(l, r, (1, 1, 1))
acts = {o: o.animation_data.action for o in bpy.data.objects if o.animation_data and o.animation_data.action}
f0, f1 = map(int, next(iter(acts.values())).frame_range)
for o in acts: o.animation_data.action = None
bpy.context.view_layer.update()
rest = {m: unscaled(o.matrix_world.copy()) for m, o in srcs.items()}
for o, a in acts.items(): o.animation_data.action = a
rec = {}
for f in range(f0, f1 + 1):
    sc.frame_set(f); rec[f] = {m: unscaled(o.matrix_world.copy()) for m, o in srcs.items()}
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
arm = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", arm); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
for m, p, _ in MAP:
    b = arm.edit_bones.new(m); b.head = (0, 0, 0); b.tail = (0, 0.08, 0); b.matrix = rest[m]
for m, p, _ in MAP:
    if p: arm.edit_bones[m].parent = arm.edit_bones[p]
bpy.ops.object.mode_set(mode="POSE")
rig.animation_data_create(); rig.animation_data.action = bpy.data.actions.new("Gait")
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    for m, p, _ in MAP:
        pb = rig.pose.bones[m]; pb.rotation_mode = "QUATERNION"; pb.matrix = rec[f][m]
        bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
        if m == "Hips": pb.keyframe_insert("location", frame=f)
bpy.ops.object.mode_set(mode="OBJECT")
sc.frame_start, sc.frame_end = f0, f1
bpy.ops.export_scene.gltf(filepath=out, export_animations=True, export_force_sampling=True, export_animation_mode="ACTIONS")
print("BAKED", len(MAP), "bones", f0, f1)
