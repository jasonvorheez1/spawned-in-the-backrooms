# Two-handed rifle clips for the human rig (Shelly Nov 9: third-person long guns looked procedural).
# usage: blender -b --factory-startup --python build.py -- <body.glb> <clip> <out.glb> [proofdir]
# clips: aim (loop), ready (loop), fire (once), up, down (held poses the aim-pitch lerps toward)
# The right hand ends in the same world turn the pistol aim clip gives it, so scripts/lib/body3.js heldRot still seats the gun.
import bpy, sys, math, json, struct
from mathutils import Vector, Quaternion, Matrix, Euler
a = sys.argv[sys.argv.index("--")+1:]
SRC, CLIP, OUT = a[:3]; PROOF = a[3] if len(a) > 3 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
R = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
P = R.pose.bones
sc = bpy.context.scene; sc.render.fps = 30

# --- the right hand's target turn, from heldRot (engine bone frame) -------------------------
def gltf_rest(path, name):
    d = open(path, "rb").read(); n = struct.unpack("<I", d[12:16])[0]; J = json.loads(d[20:20+n])
    nodes = J["nodes"]; par = {}
    for i, nd in enumerate(nodes):
        for c in nd.get("children", []): par[c] = i
    i = next(k for k, nd in enumerate(nodes) if nd.get("name") == name); q = Quaternion()
    while i is not None:
        r = nodes[i].get("rotation", [0, 0, 0, 1]); q = Quaternion((r[3], r[0], r[1], r[2])) @ q; i = par.get(i)
    return q
M = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))           # glTF -> Blender axes
HELD = Quaternion((0.756, -0.352, 0.433, 0.342))          # body3.js heldRot (w, x, y, z)
restG = gltf_rest(SRC, "RightHand")
Dg = (HELD.conjugated() @ restG.conjugated()).to_matrix()
Db = M @ Dg @ M.inverted()
restB = (R.matrix_world @ R.data.bones["RightHand"].matrix_local).to_3x3()
RH_ROT = (Db @ restB).to_quaternion()

def hand_rot(bone, fingers, palm):
    # world turn that sends the rest bone axis to `fingers` and the rest palm (-Z, T-pose palms down) to `palm`
    rest = (R.matrix_world @ R.data.bones[bone].matrix_local).to_3x3()
    y0 = (rest @ Vector((0, 1, 0))).normalized(); p0 = Vector((0, 0, -1))
    p0 = (p0 - y0 * p0.dot(y0)).normalized()
    y1 = Vector(fingers).normalized(); p1 = Vector(palm); p1 = (p1 - y1 * p1.dot(y1)).normalized()
    A = Matrix((y0, p0, y0.cross(p0))).transposed(); B = Matrix((y1, p1, y1.cross(p1))).transposed()
    return (B @ A.inverted() @ rest).to_quaternion()
LH_ROT = hand_rot("LeftHand", (-0.25, -0.95, 0.15), (-0.35, 0, 0.94))

# --- rig: IK on each forearm, hand turn copied from an empty -------------------------------
def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.location = loc; e.rotation_mode = "QUATERNION"; return e
tR, tL, pR, pL = empty("tR"), empty("tL"), empty("pR", (-0.45, 0.05, 0.95)), empty("pL", (0.25, -0.3, 0.85))
for side, t, p in (("Right", tR, pR), ("Left", tL, pL)):
    c = P[side + "ForeArm"].constraints.new("IK"); c.target = t; c.pole_target = p; c.chain_count = 2; c.pole_angle = math.radians(0 if side == "Right" else 120)  # right elbow out and down, left tucked under the foregrip
    r = P[side + "Hand"].constraints.new("COPY_ROTATION"); r.target = t
    t.rotation_quaternion = (R.matrix_world.inverted().to_quaternion() @ (RH_ROT if side == "Right" else LH_ROT))

def rot_world(pb, axis, deg):
    Mb = R.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3()
    pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = Quaternion(Mb.inverted() @ Vector(axis), math.radians(deg)) @ pb.rotation_quaternion

# the stance in the body's frame: facing -Y, left +X. Blade 24 deg, stock in the right pocket, cheek down on the gun.
PIV = Vector((-0.12, 0.02, 1.40))
RW, LW = Vector((-0.14, -0.20, 1.36)), Vector((0.0, -0.38, 1.35))  # wrists: grip, foregrip
READY_R, READY_L = Vector((-0.16, -0.16, 1.14)), Vector((0.02, -0.30, 1.04))
def pose(frame, pitch=0.0, kick=0.0, breath=0.0, ready=False, curl=True):
    for pb in P:
        pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0)
    # IK cannot bend a dead-straight T-pose arm: start each elbow bent the way it should fold
    rot_world(P["RightForeArm"], (0, 0, 1), 40); rot_world(P["LeftForeArm"], (0, 0, 1), -40)
    blade = -15 if not ready else -10
    rot_world(P["Spine1"], (0, 0, 1), blade); rot_world(P["Spine2"], (0, 0, 1), blade)
    sp = -pitch * 0.3 - kick * 4 + breath * 0.8  # +X turns lean forward / look down in Blender          # the chest follows the barrel part way
    rot_world(P["Spine1"], (1, 0, 0), sp * 0.5); rot_world(P["Spine2"], (1, 0, 0), sp * 0.5)
    rot_world(P["Neck"], (0, 0, 1), 10); rot_world(P["Head"], (0, 0, 1), 12)  # face back to the sights
    rot_world(P["Head"], (1, 0, 0), (8 if not ready else 4) - pitch * 0.45)  # cheek down onto the sights
    rot_world(P["RightShoulder"], (0, 0, 1), 6); rot_world(P["LeftShoulder"], (0, 0, 1), -4)
    rp, lp = (READY_R, READY_L) if ready else (RW, LW)
    Rx = Matrix.Rotation(math.radians(-pitch), 3, "X")
    back = Vector((0, kick * 0.045, kick * 0.02)); up = Vector((0, 0, breath * 0.004))
    tR.location = PIV + Rx @ (rp - PIV) + back + up; tL.location = PIV + Rx @ (lp - PIV) + back * 0.8 + up
    tilt = Quaternion(Vector((1, 0, 0)), math.radians(-pitch if not ready else 32))
    base = R.matrix_world.inverted().to_quaternion()
    tR.rotation_quaternion = base @ tilt @ RH_ROT; tL.rotation_quaternion = base @ tilt @ LH_ROT
    # fingers close: right round the grip (index on the trigger guard), left cradles the foregrip
    for side, k in (("Right", 1.0), ("Left", 0.6)):
        for f in ("Index", "Middle", "Ring", "Pinky"):
            for s in (1, 2, 3):
                ang = (28 if s == 1 else 40) * k * (0.5 if (side == "Right" and f == "Index") else 1)
                pb = P[f"{side}Hand{f}{s}"]; pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), math.radians(ang))
        for s in (1, 2, 3):
            P[f"{side}HandThumb{s}"].rotation_quaternion = Quaternion(Vector((0, 0, 1)), math.radians((14 if s == 1 else 18) * (1 if side == "Left" else -1)))
    for o in (tR, tL): o.keyframe_insert("location", frame=frame); o.keyframe_insert("rotation_quaternion", frame=frame)
    for pb in P: pb.keyframe_insert("rotation_quaternion", frame=frame)

act = bpy.data.actions.new(CLIP); R.animation_data_create(); R.animation_data.action = act
if CLIP == "aim":
    for f, b in ((0, 0), (30, 1), (60, 0)): pose(f, breath=b)
    end = 60
elif CLIP == "ready":
    for f, b in ((0, 0), (30, 1), (60, 0)): pose(f, breath=b, ready=True)
    end = 60
elif CLIP == "fire":
    for f, k in ((0, 0), (2, 1), (5, 0.55), (9, 0.12), (14, 0)): pose(f, kick=k)
    end = 14
else:
    pt = 70 if CLIP == "up" else -70
    pose(0, pitch=pt); pose(3, pitch=pt); end = 3
sc.frame_start, sc.frame_end = 0, end
bpy.context.view_layer.objects.active = R; bpy.ops.object.mode_set(mode="POSE"); bpy.ops.pose.select_all(action="SELECT")
bpy.ops.nla.bake(frame_start=0, frame_end=end, only_selected=False, visual_keying=True, clear_constraints=True, use_current_action=True, bake_types={"POSE"})
bpy.ops.object.mode_set(mode="OBJECT")
baked = R.animation_data.action; baked.name = CLIP
for o in (tR, tL, pR, pL): bpy.data.objects.remove(o)

if PROOF:
    sc.frame_set({"fire": 2}.get(CLIP, 0))
    # a stand-in barrel from the stock pocket forward, to judge the hands against
    gl = 0.9; Rx = Matrix.Rotation(math.radians(-(70 if CLIP == "up" else -70 if CLIP == "down" else 0)), 3, "X")
    if CLIP == "ready": Rx = Matrix.Rotation(math.radians(32), 3, "X")  # ready: muzzle down
    d = Rx @ Vector((0, -1, 0)); s = PIV + Rx @ (Vector((-0.10, 0.06, 1.37)) - PIV)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=gl, location=s + d * gl * 0.42)
    cyl = bpy.context.object; cyl.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 500, 640
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.62, 0.66, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.5
    bpy.ops.object.light_add(type="SUN", location=(2, -3, 4)); bpy.context.object.data.energy = 3; bpy.context.object.rotation_euler = (0.7, 0.2, 0.4)
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 45
    for t, pos in (("front", (0.3, -2.6, 1.45)), ("side", (-2.6, -0.2, 1.4)), ("q", (-1.7, -1.9, 1.7))):
        cam.location = pos; cam.rotation_euler = (Vector((0, -0.15, 1.2)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{CLIP}_{t}.png"; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cyl)

for o in list(bpy.data.objects):
    if o.type != "ARMATURE": bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=OUT, export_animations=True, export_animation_mode="ACTIVE_ACTIONS", export_skins=True)
print("CLIP", CLIP, "frames", end, "->", OUT)
