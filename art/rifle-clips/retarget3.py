# Commando rifle pack (Shelly's NV .kf, decoded by kf2body.py) -> the human rig, third person, upper body + fingers.
# NV faces +Y with +X right, Z up; ours (Blender) faces -Y with -X right: a 180 turn about Z.
# Each bone is turned so its rest direction meets the NV limb's direction; hands, chest and clavicles also match a second
# axis (thumb / shoulder line) so the grip's roll survives. Legs and hips are left to the locomotion layer.
# usage: blender -b --factory-startup --python retarget3.py -- <body.glb> <out dir> <json> [json …]   (PROOF=dir renders)
import bpy, sys, json, os, math
from mathutils import Vector, Quaternion, Matrix
argv = sys.argv[sys.argv.index("--") + 1:]
hum, outdir, files = argv[0], argv[1], argv[2:]
G = Matrix.Rotation(math.radians(180), 3, "Z")
B = lambda s: f"Bip01 {s}"
SRC, SIDE = {}, {}
SRC.update({"Spine": (B("Spine"), B("Spine1")), "Spine1": (B("Spine1"), B("Spine2")), "Spine2": (B("Spine2"), B("Neck")),
            "Neck": (B("Neck"), B("Head")), "Head": None})
SIDE["Spine2"] = (B("L Clavicle"), B("R Clavicle"))
FING = {"Thumb": "Thumb1", "Index": "Finger1", "Middle": "Finger2", "Ring": "Finger3", "Pinky": "Finger4"}
for s, L in (("Left", "L"), ("Right", "R")):
    SRC.update({s+"Shoulder": (B(f"{L} Clavicle"), B(f"{L} UpperArm")), s+"Arm": (B(f"{L} UpperArm"), B(f"{L} Forearm")),
                s+"ForeArm": (B(f"{L} Forearm"), B(f"{L} Hand")), s+"Hand": (B(f"{L} Hand"), B(f"{L} Finger2"))})
    SIDE[s+"Hand"] = (B(f"{L} Finger4"), B(f"{L} Finger1"))   # across the knuckles, pinky -> index
    for ours, nv in FING.items():
        base = nv if ours == "Thumb" else nv  # Finger1, Finger11, Finger12
        seg = [B(f"{L} {base}"), B(f"{L} {base}1"), B(f"{L} {base}2")]
        SRC[f"{s}Hand{ours}1"] = (seg[0], seg[1]); SRC[f"{s}Hand{ours}2"] = (seg[1], seg[2]); SRC[f"{s}Hand{ours}3"] = None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=hum)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
if rig.animation_data: rig.animation_data.action = None
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()
RW = rig.matrix_world; PB = rig.pose.bones
hp = {b.name: RW @ b.head for b in PB}; ht = {b.name: RW @ b.tail for b in PB}
hq = {b.name: (RW @ b.matrix).to_quaternion().normalized() for b in PB}
ORDER = [n for n in ["Spine", "Spine1", "Spine2", "Neck", "Head"] if n in PB]
for s in ("Left", "Right"):
    ORDER += [s+b for b in ("Shoulder", "Arm", "ForeArm", "Hand")]
    for f in FING: ORDER += [f"{s}Hand{f}{k}" for k in (1, 2, 3) if f"{s}Hand{f}{k}" in PB]
def par(n): return PB[n].parent.name if PB[n].parent else None
# our rest "side" axes for the two-axis bones
def rest_side(m):
    if m == "Spine2": return (hp["RightShoulder"] - hp["LeftShoulder"]).normalized() if False else (hp["RightArm"] - hp["LeftArm"]).normalized()
    s = m[:-4]; return (hp[f"{s}HandIndex1"] - hp[f"{s}HandPinky1"]).normalized()
# the gun rides RightHand at body3.js heldRot: with the hand at RH_ROT (world) the barrel points -Y. Turn the hand so the barrel
# runs from the right hand to the left (the foregrip), as in the pack.
import struct
def gltf_rest(path, name):
    d = open(path, "rb").read(); n = struct.unpack("<I", d[12:16])[0]; J = json.loads(d[20:20+n])
    nodes = J["nodes"]; pr = {}
    for i, nd in enumerate(nodes):
        for c in nd.get("children", []): pr[c] = i
    i = next(k for k, nd in enumerate(nodes) if nd.get("name") == name); q = Quaternion()
    while i is not None:
        r = nodes[i].get("rotation", [0, 0, 0, 1]); q = Quaternion((r[3], r[0], r[1], r[2])) @ q; i = pr.get(i)
    return q
Mg = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
HELD = Quaternion((0.756, -0.352, 0.433, 0.342))
Dg = (HELD.conjugated() @ gltf_rest(hum, "RightHand").conjugated()).to_matrix()
RH_ROT = (Mg @ Dg @ Mg.inverted() @ (RW @ rig.data.bones["RightHand"].matrix_local).to_3x3()).to_quaternion()
def gun_hand(fr):
    D = (G @ (Vector(fr[B("L Hand")]) - Vector(fr[B("R Hand")]))).normalized()
    # keep the gun upright: turn -Y onto D about a level axis first, then pitch
    yaw = Vector((0, -1, 0)).rotation_difference(Vector((D.x, D.y, 0)).normalized())
    pit = Vector((D.x, D.y, 0)).normalized().rotation_difference(D)
    return pit @ yaw @ RH_ROT
sc = bpy.context.scene; sc.render.fps = 30
for f in files:
    J = json.load(open(f)); F = J["frames"]; stem = os.path.splitext(os.path.basename(f))[0]
    loop = os.environ.get("ONCE") is None and J.get("cycle", 0) != 0 or stem.endswith("loop") is False
    act = bpy.data.actions.new(stem); rig.animation_data_create(); rig.animation_data.action = act
    V = lambda fr, a, b: (G @ (Vector(fr[b]) - Vector(fr[a]))).normalized()
    for fi, fr in enumerate(F):
        delta = {}
        for m in ORDER:
            p = par(m); d = delta.get(p, Quaternion()).copy()
            src = SRC.get(m)
            if src and src[0] in fr and src[1] in fr:
                d1 = V(fr, *src); h0 = d @ (ht[m] - hp[m]).normalized()
                d = h0.rotation_difference(d1) @ d
                sd = SIDE.get(m)
                if sd and sd[0] in fr and sd[1] in fr:   # roll about the bone so the side axis matches too
                    s1 = V(fr, *sd); s0 = d @ rest_side(m)
                    a0 = (s0 - s0.project(d1)); a1 = (s1 - s1.project(d1))
                    if a0.length > 1e-4 and a1.length > 1e-4: d = a0.normalized().rotation_difference(a1.normalized()) @ d
            if m == "RightHand" and B("L Hand") in fr: d = gun_hand(fr) @ hq[m].inverted()
            delta[m] = d
            M = (d @ hq[m]).to_matrix().to_4x4(); M.translation = RW @ PB[m].head
            PB[m].matrix = RW.inverted() @ M
            bpy.context.view_layer.update()
            PB[m].keyframe_insert("rotation_quaternion", frame=fi)
    sc.frame_start, sc.frame_end = 0, len(F) - 1
    PR = os.environ.get("PROOF")
    if PR:
        bpy.ops.object.mode_set(mode="OBJECT")
        sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x, sc.render.resolution_y = 360, 480
        if not sc.camera:
            cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
        cam = sc.camera
        for k, (loc, rot) in enumerate([((1.2, -2.6, 1.3), (82, 0, 25)), ((2.6, 0.4, 1.3), (82, 0, 98))]):
            cam.location = loc; cam.rotation_euler = tuple(math.radians(v) for v in rot)
            sc.frame_set(len(F) // 2)
            if not bpy.data.objects.get("gunbar"):
                bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.8); g = bpy.context.object; g.name = "gunbar"
            g = bpy.data.objects["gunbar"]; hw = (RW @ PB["RightHand"].matrix).to_quaternion(); bar = (hw @ RH_ROT.inverted()) @ Vector((0, -1, 0))
            g.location = (RW @ PB["RightHand"].head) + bar * 0.3; g.rotation_euler = bar.to_track_quat("Z", "Y").to_euler()
            sc.render.filepath = f"{PR}/{stem}_{k}.png"; bpy.ops.render.render(write_still=True)
        bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, stem + ".glb"), use_selection=True, export_animations=True, export_force_sampling=True, export_animation_mode="ACTIVE_ACTIONS")
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    for pb in PB: pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.data.actions.remove(act)
    print("CLIP", stem, len(F))
