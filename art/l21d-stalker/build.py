# Level 21 stalker: Tripo quadruped rig (stalker2-rig) + hand-keyed clips: Idle, Walk, Run, Crouch, Leap, Swipe, Hit, Die.
import bpy, math, os
from mathutils import Quaternion, Vector
SRC = "/workspace/l21d/rig2/stalker2-rig.glb"; OUT = "/workspace/l21d/rig2/stalker-anim.glb"; PROOF = "/tmp/stalker"
os.makedirs(PROOF, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
P = arm.pose.bones
def B(n):
    for k in P.keys():
        if k == n or k.endswith(n): return P[k]
    raise KeyError(n)
LAT = Vector((0, 1, 0)); LONG = Vector((1, 0, 0)); UP = Vector((0, 0, 1))
def lq(pb, axis, deg):
    m = (arm.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3()).normalized()
    return Quaternion(m.inverted() @ axis, math.radians(deg))
def lv(pb, v):
    m = arm.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3()
    return m.inverted() @ v
SPINE0, SPINE1 = "0_Right_Limb_0", "0_Right_Limb_1"
HEAD = ["Head_0", "Head_1"]
LEGS = {  # name: (chain, front?)
  "FR": (["0_Right_Limb_2", "0_Right_Limb_3", "0_Right_Limb_4", "0_Right_Limb_5"], True),
  "FL": (["Spine_0", "bone_11", "bone_12"], True),
  "HR": (["0_Left_Limb_0", "0_Left_Limb_1", "0_Left_Limb_2"], False),
  "HL": (["bone_1", "bone_2", "bone_3"], False),
}
ALL = [SPINE0, SPINE1, "Root"] + HEAD + [b for c, _ in LEGS.values() for b in c]
FPS = 30
bpy.context.scene.render.fps = FPS
def pose_reset():
    for pb in P: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = Quaternion(); pb.location = Vector()
def key_all(f):
    for n in ALL:
        pb = B(n); pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
def apply(pose):
    # pose: {bone: [(axis, deg), ...] or ("loc", vec)}
    pose_reset()
    for n, ops in pose.items():
        pb = B(n); q = Quaternion()
        for op in ops:
            if op[0] == "loc": pb.location = lv(pb, op[1])
            else: q = lq(pb, op[0], op[1]) @ q
        pb.rotation_quaternion = q
def leg(pose, name, swing, lift, sgn=1.0):
    chain, front = LEGS[name]
    pose.setdefault(chain[0], []).append((LAT, swing))
    # bend the middle joint as the foot lifts; hind and front fold opposite ways
    pose.setdefault(chain[1], []).append((LAT, (-1 if front else 1) * lift * 38))
    pose.setdefault(chain[2], []).append((LAT, (1 if front else -1) * lift * 22))
def make(name, frames, fn, loop=True):
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    for i in range(frames + (1 if loop else 0)):
        t = (i % frames) / frames if loop else i / max(1, frames - 1)
        apply(fn(t)); key_all(i + 1)
    tr = arm.animation_data.nla_tracks.new(); tr.name = name; s = tr.strips.new(name, 1, act); s.name = name
    arm.animation_data.action = None
    return act
S2 = lambda x: math.sin(2 * math.pi * x)
def gait(t, amp, lift, phases, bob, spineflex, headn):
    p = {}
    for n, ph in phases.items():
        s = S2(t + ph); l = max(0.0, math.sin(2 * math.pi * (t + ph) + math.pi / 2))
        leg(p, n, amp * s, lift * l)
    p.setdefault("Root", []).append(("loc", UP * (bob * abs(S2(t * 2)))))
    p.setdefault(SPINE0, []).append((LAT, spineflex * S2(t)))
    p.setdefault(SPINE0, []).append((LONG, 3 * S2(t)))
    p.setdefault(HEAD[0], []).append((LAT, headn * S2(t * 2 + .2)))
    return p
WALK = {"HR": 0.0, "FR": 0.25, "HL": 0.5, "FL": 0.75}
RUN = {"FL": 0.0, "FR": 0.08, "HL": 0.5, "HR": 0.58}
make("Walk", 30, lambda t: gait(t, 20, 1.0, WALK, 0.025, 3, 4))
make("Run", 14, lambda t: gait(t, 34, 1.2, RUN, 0.06, 11, 6))
def idle(t):
    p = {}
    for n in LEGS: leg(p, n, 0, 0)
    p["Root"] = [("loc", UP * (0.012 * S2(t)))]
    p[SPINE0] = [(LAT, 2.5 * S2(t))]
    p[HEAD[0]] = [(UP, 18 * S2(t * 1 + 0.1)), (LONG, 14 * math.sin(2 * math.pi * t * 2) * (1 if t < .5 else .3))]
    return p
make("Idle", 120, idle)
def crouch(t):  # pounce wind: sink low, hind legs coil, head down
    k = min(1, t * 1.6); p = {}
    leg(p, "FR", -10 * k, 0.8 * k); leg(p, "FL", -10 * k, 0.8 * k); leg(p, "HR", 18 * k, 1.3 * k); leg(p, "HL", 18 * k, 1.3 * k)
    p["Root"] = [("loc", UP * (-0.12 * k))]; p[SPINE0] = [(LAT, -8 * k)]
    p.setdefault(HEAD[0], []).append((LAT, 14 * k + 3 * S2(t * 6)))
    return p
make("Crouch", 18, crouch, loop=False)
def leap(t):  # stretched out: fore reach, hind kick back
    k = math.sin(math.pi * min(1, t * 1.3)); p = {}
    leg(p, "FR", -55 * k, 0.1); leg(p, "FL", -50 * k, 0.15); leg(p, "HR", 50 * k, 0.1); leg(p, "HL", 46 * k, 0.15)
    p[SPINE0] = [(LAT, -10 * k)]; p[HEAD[0]] = [(LAT, -18 * k)]
    return p
make("Leap", 18, leap, loop=False)
def swipe(t):  # rear on hinds, rake the front right limb down
    up = math.sin(math.pi * min(1, t / 0.55)) if t < .55 else 0; rake = max(0, math.sin(math.pi * (t - .35) / .4)) if .35 < t < .75 else 0
    p = {}
    leg(p, "HR", 10 * up, 0.5 * up); leg(p, "HL", 10 * up, 0.5 * up)
    leg(p, "FL", -25 * up, 0.6 * up)
    leg(p, "FR", -70 * up + 95 * rake, 0.3)
    p[SPINE0] = [(LAT, -16 * up + 10 * rake)]; p[HEAD[0]] = [(LAT, -20 * up + 15 * rake), (UP, 10 * rake)]
    p["Root"] = [("loc", UP * 0.08 * up)]
    return p
make("Swipe", 21, swipe, loop=False)
def hit(t):
    k = math.sin(math.pi * t) * (1 - t * .4); p = {}
    for n in LEGS: leg(p, n, 8 * k if LEGS[n][1] else -6 * k, .4 * k)
    p[SPINE0] = [(LONG, 14 * k), (LAT, 8 * k)]; p[HEAD[0]] = [(UP, -25 * k), (LAT, 20 * k)]
    return p
make("Hit", 12, hit, loop=False)
def die(t):
    k = min(1, t * 1.25); e = 1 - (1 - k) ** 3; p = {}
    leg(p, "FR", -30 * e, 1.0 * e); leg(p, "FL", -40 * e, 1.1 * e); leg(p, "HR", 30 * e, 1.2 * e); leg(p, "HL", 45 * e, 1.0 * e)
    p["Root"] = [(LONG, 80 * e), ("loc", UP * (0.06 * e))]
    p[SPINE0] = [(LAT, 15 * e)]; p[HEAD[0]] = [(LAT, 35 * e), (LONG, 20 * e)]
    return p
make("Die", 30, die, loop=False)
pose_reset()
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS", export_apply=False)
# proof: one frame from each clip, side view, lit from the camera
scn = bpy.context.scene; scn.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scn.render.resolution_x = 400; scn.render.resolution_y = 300
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
cam.location = (0, -2.6, 0.6); cam.rotation_euler = (math.radians(85), 0, 0)
L = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); L.data.energy = 4; L.rotation_euler = (math.radians(60), 0, 0); scn.collection.objects.link(L)
w = bpy.data.worlds.new("w"); scn.world = w; w.color = (0.3, 0.3, 0.3)
for a in bpy.data.actions:
    arm.animation_data.action = a
    for tr in arm.animation_data.nla_tracks: tr.mute = True
    for fr in (1, int(a.frame_range[1] * .3) + 1, int(a.frame_range[1] * .65) + 1):
        scn.frame_set(fr); scn.render.filepath = f"{PROOF}/{a.name}_{fr:02d}.png"; bpy.ops.render.render(write_still=True)
