# Warrior walk/run (Shelly #95877: the cycles, never its rig) -> our human rig, by joint POSITIONS only:
# the warrior's bind is unreliable, so each of our bones is aimed where the warrior's limb points this frame,
# carrying its parent's turn (minimal twist); hips/chest take a frame built from up + left->right.
# The source holds a still pose for most of its length; only the moving tail is the cycle, so it's trimmed.
# args: <warrior clip glb> <human glb> <out glb>
import bpy, sys
from mathutils import Matrix, Vector
src, hum, out = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == "MESH": bpy.data.objects.remove(o, do_unlink=True)
W = list(bpy.data.objects)
def S(n): return next(o for o in W if o.name.startswith(n + "_0") and not o.name[len(n)+1:].count("_"))
J = {"Hips": "BND_C_Pelvis1", "Spine": "BND_C_Spine2", "Spine1": "BND_C_Spine3", "Spine2": "BND_C_Spine4", "Neck": "BND_C_Neck1", "Head": "BND_C_Head"}
for side, L in (("Left", "L"), ("Right", "R")):
    J.update({side+"Shoulder": f"BND_{L}_Clav1", side+"Arm": f"BND_{L}_Arm1", side+"ForeArm": f"BND_{L}_Arm2", side+"Hand": f"BND_{L}_Arm3",
              side+"UpLeg": f"BND_{L}_Leg1", side+"Leg": f"BND_{L}_Leg2", side+"Foot": f"BND_{L}_Leg3"})
src_o = {m: S(s) for m, s in J.items()}
CHAIN = [("Hips", None, None), ("Spine", "Hips", "Spine1"), ("Spine1", "Spine", "Spine2"), ("Spine2", "Spine1", "Neck"), ("Neck", "Spine2", "Head"), ("Head", "Neck", None)]
for s in ("Left", "Right"):
    CHAIN += [(s+"Shoulder", "Spine2", s+"Arm"), (s+"Arm", s+"Shoulder", s+"ForeArm"), (s+"ForeArm", s+"Arm", s+"Hand"), (s+"Hand", s+"ForeArm", None),
              (s+"UpLeg", "Hips", s+"Leg"), (s+"Leg", s+"UpLeg", s+"Foot"), (s+"Foot", s+"Leg", None)]
sc = bpy.context.scene
act0 = bpy.data.actions[0]; f0, f1 = map(int, act0.frame_range)
rec = {}
for f in range(f0, f1 + 1):
    sc.frame_set(f); rec[f] = {m: o.matrix_world.to_translation().copy() for m, o in src_o.items()}
moving = [f for f in range(f0 + 1, f1 + 1) if max((rec[f][m] - rec[f0][m]).length for m in J) > 0.01]
a = max(f0, (moving[0] - 1) if moving else f0)
print("CYCLE", a, f1)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
bpy.ops.import_scene.gltf(filepath=hum)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in list(bpy.data.objects):
    if o is not rig: bpy.data.objects.remove(o, do_unlink=True)
if rig.animation_data: rig.animation_data.action = None
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()
RW = rig.matrix_world
hp = {m: RW @ rig.pose.bones[m].head for m in J}
hq = {m: (RW @ rig.pose.bones[m].matrix).to_quaternion().normalized() for m in J}
def basis(up, side):
    z = up.normalized(); x = (side - side.project(z)).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed().to_quaternion()
hipB = basis(hp["Spine"] - hp["Hips"], hp["RightUpLeg"] - hp["LeftUpLeg"])
k = (hp["LeftUpLeg"] - hp["LeftFoot"]).length / (rec[a]["LeftUpLeg"] - rec[a]["LeftFoot"]).length
ground_src = min(min(r["LeftFoot"].z, r["RightFoot"].z) for r in rec.values())
act = bpy.data.actions.new("Gait"); rig.animation_data_create(); rig.animation_data.action = act
base_xy = rec[a]["Hips"].copy()
for f in range(a, f1 + 1):
    r = rec[f]; delta = {}
    for m, par, child in CHAIN:
        if m == "Hips":
            d = basis(r["Spine"] - r["Hips"], r["RightUpLeg"] - r["LeftUpLeg"]) @ hipB.inverted()
        else:
            d = delta[par].copy()
            if child:
                h0 = d @ (hp[child] - hp[m]).normalized(); d1 = (r[child] - r[m]).normalized()
                d = h0.rotation_difference(d1) @ d
        delta[m] = d
        M = (d @ hq[m]).to_matrix().to_4x4()
        if m == "Hips":
            off = (r["Hips"] - base_xy) * k; off.z = (r["Hips"].z - ground_src) * k - (hp["Hips"].z - min(hp["LeftFoot"].z, hp["RightFoot"].z))
            M.translation = hp["Hips"] + Vector((0, 0, off.z))  # in place: no root travel
        else:
            M.translation = rig.pose.bones[m].head if False else (RW @ rig.pose.bones[m].head)
        pb = rig.pose.bones[m]; pb.matrix = RW.inverted() @ M
        bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f - a)
        if m == "Hips": pb.keyframe_insert("location", frame=f - a)
bpy.ops.object.mode_set(mode="OBJECT")
sc.frame_start, sc.frame_end = 0, f1 - a
bpy.ops.export_scene.gltf(filepath=out, export_animations=True, export_force_sampling=True, export_animation_mode="ACTIONS")
print("BAKED", f1 - a + 1, "frames k", round(k, 3))
