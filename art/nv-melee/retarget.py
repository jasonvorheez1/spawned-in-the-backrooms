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
       "Neck": ("Bip01 Neck", "Bip01 Neck1"), "Head": ("Bip01 Head", "Bip01 Head")}
for s, L in (("Left", "L"), ("Right", "R")):
    SRC.update({s+"Shoulder": (f"Bip01 {L} Clavicle", f"Bip01 {L} UpperArm"), s+"Arm": (f"Bip01 {L} UpperArm", f"Bip01 {L} Forearm"),
                s+"ForeArm": (f"Bip01 {L} Forearm", f"Bip01 {L} Hand"), s+"Hand": (f"Bip01 {L} Hand", f"Bip01 {L} Finger2")})
PAR = {"Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck"}
for s in ("Left", "Right"): PAR.update({s+"Shoulder": "Spine2", s+"Arm": s+"Shoulder", s+"ForeArm": s+"Arm", s+"Hand": s+"ForeArm"})
ARM = {s+b: s[0]+k for s in ("Left", "Right") for b, k in (("Shoulder", "Clavicle"), ("Arm", "UpperArm"), ("ForeArm", "Forearm"), ("Hand", "Hand"))}  # spine holds rest
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
    # neck frame -> our upright chest: up is the neck bone; forward is where the hands work (always in front in FP)
    up = Vector(J["axes"]["up"]).normalized()
    hands = sum((Vector(fr["_neck"][k]) for fr in F for k in ("LHandPos", "RHandPos")), Vector())
    fwd = (hands - hands.project(up)).normalized(); left = up.cross(fwd)
    Lm = Matrix((left, -fwd, up))  # rows: neck-local -> world X(left) , Y(back), Z(up)
    sideR = Lm @ Vector(F[0]["_neck"]["RHandPos"])
    print("map", stem, "R hand x", round(sideR.x, 2))
    # frame 0: each arm bone aimed where NV's limb points (parent's turn carried). Every later frame copies NV's own
    # rotation change since frame 0, mapped into our frame: twist, wrist roll and timing exactly as the .kf keys them.
    # No position re-derivation and no smoothing pass: those flattened the hits and lost the forearm roll.
    BODY = os.environ.get("BODY") and "_body" in F[0]
    if BODY:  # third person: the body's own frame from frame 0 (pelvis->head up, clavicles right), spine included
        B0 = F[0]["_body"]; P = lambda n: Vector(B0[n][0])
        up = (P("Bip01 Head" if "Bip01 Head" in B0 else "Bip01 Neck1") - P("Bip01 Pelvis")).normalized()  # 1st-person kfs carry no head; rt = P("Bip01 R Clavicle") - P("Bip01 L Clavicle")
        rt = (rt - rt.project(up)).normalized(); fw = up.cross(rt)
        Lm = Matrix((-rt, -fw, up))
        print("body map R clav x", round((Lm @ rt).x, 2))
    LmQ = Lm.to_quaternion()
    def mapq(v): return (LmQ @ Quaternion(v) @ LmQ.inverted()).normalized()
    D, base, q0 = [], {}, {}
    for fi, fr in enumerate(F):
        delta = {"Hips": Quaternion()}
        for m in ORDER:
            if BODY:
                src = SRC.get(m); bd = fr["_body"]
                if not src or src[0] not in bd or src[1] not in bd:
                    delta[m] = delta[PAR[m]].copy(); continue
                qk = bd[src[0]][1]
                if fi == 0:
                    d = delta[PAR[m]].copy()
                    d1 = (Lm @ (Vector(bd[src[1]][0]) - Vector(bd[src[0]][0]))).normalized()
                    h0 = d @ (ht[m] - hp[m]).normalized(); d = (h0.rotation_difference(d1) @ d).normalized()
                    base[m] = d.copy(); q0[m] = mapq(qk); delta[m] = d
                else:
                    delta[m] = ((mapq(qk) @ q0[m].inverted()) @ base[m]).normalized()
                continue
            key = ARM.get(m)
            if not key or key not in fr["_neck"]:
                delta[m] = delta[PAR[m]].copy(); continue
            qk = fr["_neck"].get(key + "Q")
            if fi == 0 or not qk:
                d = delta[PAR[m]].copy()
                d1 = (Lm @ Vector(fr["_neck"][key])).normalized()
                h0 = d @ (ht[m] - hp[m]).normalized(); d = (h0.rotation_difference(d1) @ d).normalized()
                if fi == 0: base[m] = d.copy(); q0[m] = mapq(qk) if qk else None
                delta[m] = d
            else:
                delta[m] = ((mapq(qk) @ q0[m].inverted()) @ base[m]).normalized() if q0.get(m) else delta[PAR[m]].copy()
        D.append(delta)
    for m in ORDER:  # one hemisphere per bone so the keyed curve never takes the long way round
        for i in range(1, len(D)):
            if D[i][m].dot(D[i-1][m]) < 0: D[i][m] = -D[i][m]
    for fi, delta in enumerate(D):
        for m in ORDER:
            d = delta[m]
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
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True)  # a clip is the motion alone: the armature, no mesh
    bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, stem + ".glb"), use_selection=True, export_animations=True, export_force_sampling=True, export_animation_mode="ACTIVE_ACTIONS")
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.data.actions.remove(act)
    print("CLIP", stem, len(F))
