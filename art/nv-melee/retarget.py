# Decoded NV melee joint positions (kf2pos.py JSON) -> our human rig, upper body only (legs/hips hold rest).
# NV's 1st-person skeleton faces +X with -Y on its right; ours faces -Y with -X right: Rz(-90) between them.
# Each bone is aimed where NV's limb points, carrying its parent's turn (minimal twist), exactly as the warrior gait.
# args: <human glb> <out dir> <json> [json …]   -> <out dir>/<json stem>.glb, plus a proof png per clip if PROOF=1
import bpy, sys, json, os, math
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index("--") + 1:]
hum, outdir, files = argv[0], argv[1], argv[2:]
G = Matrix.Rotation(math.radians(-90), 3, "Z")
SRC = {"Spine": ("Bip01 Spine", "Bip01 Spine1"), "Spine1": ("Bip01 Spine1", "Bip01 Spine2"), "Spine2": ("Bip01 Spine2", "Bip01 Neck"),
       "Neck": ("Bip01 Neck", "Bip01 Neck1"), "Head": None}
for s, L in (("Left", "L"), ("Right", "R")):
    SRC.update({s+"Shoulder": (f"Bip01 {L} Clavicle", f"Bip01 {L} UpperArm"), s+"Arm": (f"Bip01 {L} UpperArm", f"Bip01 {L} Forearm"),
                s+"ForeArm": (f"Bip01 {L} Forearm", f"Bip01 {L} Hand"), s+"Hand": (f"Bip01 {L} Hand", f"Bip01 {L} Finger2")})
PAR = {"Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck"}
for s in ("Left", "Right"): PAR.update({s+"Shoulder": "Spine2", s+"Arm": s+"Shoulder", s+"ForeArm": s+"Arm", s+"Hand": s+"ForeArm"})
ORDER = ["Spine", "Spine1", "Spine2", "Neck", "Head"] + [s+b for s in ("Left", "Right") for b in ("Shoulder", "Arm", "ForeArm", "Hand")]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=hum)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if rig.animation_data: rig.animation_data.action = None
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()
RW = rig.matrix_world
hp = {b.name: RW @ b.head for b in rig.pose.bones}; ht = {b.name: RW @ b.tail for b in rig.pose.bones}
hq = {b.name: (RW @ b.matrix).to_quaternion().normalized() for b in rig.pose.bones}
print("human right", (hp["RightArm"] - hp["LeftArm"]).normalized())
sc = bpy.context.scene; sc.render.fps = 30
for f in files:
    J = json.load(open(f)); F = J["frames"]; stem = os.path.splitext(os.path.basename(f))[0]
    act = bpy.data.actions.new(stem); rig.animation_data_create(); rig.animation_data.action = act
    for fi, fr in enumerate(F):
        delta = {"Hips": Quaternion()}
        for m in ORDER:
            d = delta[PAR[m]].copy(); s = SRC.get(m)
            if s and s[0] in fr and s[1] in fr:
                d1 = (G @ (Vector(fr[s[1]]) - Vector(fr[s[0]]))).normalized()
                h0 = d @ (ht[m] - hp[m]).normalized()
                d = h0.rotation_difference(d1) @ d
            delta[m] = d
            M = (d @ hq[m]).to_matrix().to_4x4(); M.translation = RW @ rig.pose.bones[m].head
            pb = rig.pose.bones[m]; pb.matrix = RW.inverted() @ M
            bpy.context.view_layer.update()
            pb.keyframe_insert("rotation_quaternion", frame=fi)
        for m in ("Hips", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot"):
            rig.pose.bones[m].keyframe_insert("rotation_quaternion", frame=fi)
    sc.frame_start, sc.frame_end = 0, len(F) - 1
    if os.environ.get("PROOF"):
        bpy.ops.object.mode_set(mode="OBJECT")
        sc.render.engine = "CYCLES"; sc.cycles.samples = 4; sc.render.resolution_x, sc.render.resolution_y = 300, 400
        if not sc.camera:
            cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
            Lt = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sc.collection.objects.link(Lt); Lt.rotation_euler = (0.7, 0, 0.6); Lt.data.energy = 3
            w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1)
        cam = sc.camera; cam.location = (1.6, -2.6, 1.3); cam.rotation_euler = (math.radians(82), 0, math.radians(32))
        for k in range(4):
            sc.frame_set((len(F) - 1) * k // 3); sc.render.filepath = f"/tmp/nvp/{stem}_{k}.png"; bpy.ops.render.render(write_still=True)
        bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    # export this clip alone
    for o in meshes: o.hide_set(False)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, stem + ".glb"), export_animations=True, export_force_sampling=True, export_animation_mode="ACTIVE_ACTIONS")
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.data.actions.remove(act)
    print("CLIP", stem, len(F))
