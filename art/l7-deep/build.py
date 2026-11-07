# The Deep (Level 7): the thing under Thalassophobia's water. A 16 m eel-bodied leviathan, slick black-green hide,
# a blunt drowned-whale head that splits into a wide jaw ringed with needle teeth, pale blind eye pits. Spine rig, swim/lunge clips.
# Built along Blender +Y (= the engine's front). Run: blender -b --factory-startup --python-exit-code 1 --python art/l7-deep/build.py
import bpy, bmesh, math, random, os
from mathutils import Vector, Quaternion
OUT = "/workspace/l7-deep"; PROOF = "/tmp/l7-deep"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
random.seed(3); bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene; scene.render.fps = 30
K = 0.572; V = lambda *a: Vector(a); TAU = math.tau; FPS = 30
def mball(name, res):
    mb = bpy.data.metaballs.new(name); o = bpy.data.objects.new(name, mb); scene.collection.objects.link(o)
    mb.resolution = mb.render_resolution = res; mb.threshold = 0.6; return mb, o
def ball(mb, c, r, neg=False): e = mb.elements.new(type='BALL'); e.co = c; e.radius = r / K; e.use_negative = neg; return e
def ell(mb, c, ax, ay, az, neg=False):
    e = mb.elements.new(type='ELLIPSOID'); e.co = c; e.radius = 1.0; e.size_x, e.size_y, e.size_z = ax / K, ay / K, az / K; e.use_negative = neg; return e
def cap(mb, a, b, r):
    a, b = Vector(a), Vector(b); d = b - a; e = mb.elements.new(type='CAPSULE'); e.co = (a + b) / 2; e.radius = r / K; e.size_x = d.length / 2
    e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized()); return e
def sel(*objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]
def to_mesh(o, voxel, target):
    sel(o); bpy.ops.object.convert(target='MESH'); m = bpy.context.active_object
    r = m.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = voxel; bpy.ops.object.modifier_apply(modifier="vox")
    s = m.modifiers.new("sm", "SMOOTH"); s.iterations = 3; s.factor = 0.5; bpy.ops.object.modifier_apply(modifier="sm")
    n = len(m.data.polygons) * 2
    if n > target: d = m.modifiers.new("dec", "DECIMATE"); d.ratio = target / n; bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.shade_smooth(); return m
def mat(name, color, rough, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.0
    return m
HIDE = mat("hide", (0.035, 0.05, 0.045), 0.25); MAW = mat("maw", (0.25, 0.06, 0.07), 0.5); TOOTH = mat("tooth", (0.8, 0.77, 0.68), 0.4)
EYE = mat("eye", (0.6, 0.75, 0.7), 0.3, emit=(0.5, 0.9, 0.8))
L = 16.0; NS = 10  # length, spine bones; head at +Y
SP = [V(0, L / 2 - i * L / NS, 0) for i in range(NS + 1)]
def rad(t): return 0.15 + 1.05 * math.sin(min(1, t * 1.3) * math.pi) ** 0.7 if t > 0.12 else 0.9 + t * 1.5  # t=0 head .. 1 tail
parts = []
mb, o = mball("body", 0.08)
for i in range(60):
    t = i / 59; y = L / 2 - t * L; r = max(0.12, 1.15 * (1 - t) ** 0.8 * (0.75 + 0.25 * math.sin(min(1, t * 4) * math.pi / 2)))
    ell(mb, V(0, y, 0), r, 0.4, r * 0.85)
    if i % 4 == 2 and t < 0.85: ell(mb, V(0, y, r * 0.85), 0.07, 0.25, 0.22 * (1 - t))  # dorsal ridge knobs
for s in (1, -1):                                            # pectoral fins
    ell(mb, V(1.1 * s, L / 2 - 3.2, -0.3), 0.7, 0.45, 0.06)
ell(mb, V(0, -L / 2 + 0.3, 0), 0.08, 0.9, 0.7)               # tail fin
ell(mb, V(0, L / 2 + 0.2, 0.15), 1.0, 1.0, 0.75)             # head dome (upper jaw)
for s in (1, -1): ell(mb, V(0.55 * s, L / 2 + 0.7, 0.35), 0.18, 0.18, 0.16, neg=True)   # eye pits
parts.append((to_mesh(o, 0.07, 9000), "head", HIDE, True))
mb, o = mball("eyes", 0.03)
for s in (1, -1): ball(mb, V(0.56 * s, L / 2 + 0.68, 0.33), 0.11)
parts.append((to_mesh(o, 0.03, 400), "head", EYE, False))
mb, o = mball("jaw", 0.05)
ell(mb, V(0, L / 2 + 0.6, -0.55), 0.85, 1.05, 0.3); ell(mb, V(0, L / 2 + 0.75, -0.38), 0.65, 0.85, 0.2, neg=True)
parts.append((to_mesh(o, 0.05, 2200), "jaw", HIDE, False))
mb, o = mball("mouth", 0.05)
ell(mb, V(0, L / 2 + 0.6, -0.15), 0.72, 0.85, 0.22)
parts.append((to_mesh(o, 0.05, 1200), "head", MAW, False))
teeth = bpy.data.meshes.new("teeth"); bm = bmesh.new()
def tooth(base, down, ln):
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.05, radius2=0.004, depth=ln)
    q = V(0, 0, 1).rotation_difference(V(*down).normalized())
    for v in r["verts"]: v.co = q @ v.co + V(*base) + V(*down).normalized() * ln / 2
for i in range(22):
    a = math.pi * (i / 21); x, y = 0.68 * math.cos(a), L / 2 + 0.55 + 0.75 * math.sin(a)
    tooth((x, y, -0.05), (0, 0.15, -1), random.uniform(0.18, 0.3))
bm.to_mesh(teeth); to = bpy.data.objects.new("teeth", teeth); scene.collection.objects.link(to)
parts.append((to, "head", TOOTH, False)); bm = bmesh.new()
tj = bpy.data.meshes.new("teethj")
for i in range(18):
    a = math.pi * (0.05 + 0.9 * i / 17); x, y = 0.62 * math.cos(a), L / 2 + 0.5 + 0.72 * math.sin(a)
    tooth((x, y, -0.45), (0, 0.1, 1), random.uniform(0.14, 0.24))
bm.to_mesh(tj); tjo = bpy.data.objects.new("teethj", tj); scene.collection.objects.link(tjo); parts.append((tjo, "jaw", TOOTH, False))

arm = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", arm); scene.collection.objects.link(rig)
sel(rig); bpy.ops.object.mode_set(mode='EDIT'); E = arm.edit_bones
r0 = E.new("root"); r0.head = V(0, 0, 0); r0.tail = V(0, 1, 0)
prev = "root"
head = E.new("head"); head.head = V(0, L / 2 - 1.2, 0); head.tail = V(0, L / 2 + 1.2, 0); head.parent = r0
spine = []
for i in range(NS):  # spine bones from head backwards; each parented to the one in front
    b = E.new(f"s{i}"); b.head = SP[i] - V(0, 0.0, 0); b.tail = SP[i + 1]; b.parent = E[prev] if i else head; prev = b.name; spine.append(b.name)
jw = E.new("jaw"); jw.head = V(0, L / 2 - 0.1, -0.35); jw.tail = V(0, L / 2 + 1.4, -0.45); jw.parent = head
bpy.ops.object.mode_set(mode='OBJECT')
objs = []
for m, bn, mt, skin in parts:
    m.data.materials.clear(); m.data.materials.append(mt)
    if skin:  # smooth weights along the spine
        gs = {n: m.vertex_groups.new(name=n) for n in ["head"] + spine}
        for v in m.data.vertices:
            y = v.co.y
            if y > L / 2 - 1.2: gs["head"].add([v.index], 1.0, 'REPLACE'); continue
            f = (L / 2 - y) / (L / NS); i = min(NS - 1, int(f)); w = f - i
            gs[spine[i]].add([v.index], 1 - abs(w - 0.5), 'REPLACE')
            j = i + 1 if w > 0.5 else i - 1
            if 0 <= j < NS: gs[spine[j]].add([v.index], abs(w - 0.5), 'REPLACE')
            elif j < 0: gs["head"].add([v.index], abs(w - 0.5), 'REPLACE')
    else:
        g = m.vertex_groups.new(name=bn); g.add(list(range(len(m.data.vertices))), 1.0, 'REPLACE')
    objs.append(m)
sel(*objs, active=objs[0]); bpy.ops.object.join(); deep = bpy.context.active_object; deep.name = "deep"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.003); bpy.ops.object.mode_set(mode='OBJECT')
deep.parent = rig; deep.modifiers.new("skin", "ARMATURE").object = rig
print("TRIS", sum(len(p.vertices) - 2 for p in deep.data.polygons))
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
def wq(pb, ax, deg):
    M = pb.bone.matrix_local.to_3x3(); q = Quaternion(V(*ax), math.radians(deg)); return (M.inverted() @ q.to_matrix() @ M).to_quaternion()
def swim(t, amp=9, jaw=4):
    P = {"jaw": [((1, 0, 0), -jaw - 2 * math.sin(t * TAU))], "head": [((0, 0, 1), amp * 0.4 * math.sin(t * TAU))]}
    for i, n in enumerate(spine): P[n] = [((0, 0, 1), amp * (0.4 + i / NS) * math.sin(t * TAU - i * 0.7))]
    return P
def lunge(t):  # head rears out, jaw gapes wide, snaps shut at the end
    up = math.sin(min(1, t / 0.5) * math.pi / 2); shut = max(0, (t - 0.7) / 0.3)
    P = {"jaw": [((1, 0, 0), -42 * up * (1 - shut) - 3)], "head": [((1, 0, 0), 30 * up)]}
    for i, n in enumerate(spine): P[n] = [((1, 0, 0), (-12 if i < 3 else 2) * up), ((0, 0, 1), 6 * math.sin(t * TAU - i * 0.7))]
    return P
CLIPS = {"swim": (swim, 3.0), "lunge": (lunge, 1.6)}
rig.animation_data_create(); ACTS = {}
for name, (fn, dur) in CLIPS.items():
    act = bpy.data.actions.new(name); act.use_fake_user = True; rig.animation_data.action = act; ACTS[name] = act
    nf = round(dur * FPS)
    for f in range(0, nf + 1, 2):
        P = fn(f / nf)
        for pb in rig.pose.bones:
            q = Quaternion()
            for ax, d in P.get(pb.name, []): q = wq(pb, ax, d) @ q
            pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=f + 1)
def pose_at(name, t): rig.animation_data.action = ACTS[name]; scene.frame_set(1 + round(t * CLIPS[name][1] * FPS))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
def shot(name, pos, tgt, lens=35):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    scene.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.4, 0.45, 0.5, 1)
tmp = [cam]
for loc, e in (((6, 8, 10), 4.0), ((-8, 2, 4), 2.0)):
    l = bpy.data.lights.new("l", "SUN"); l.energy = e; lo = bpy.data.objects.new("l", l); scene.collection.objects.link(lo); tmp.append(lo)
    lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
scene.render.engine = "CYCLES"; scene.cycles.samples = 12; scene.render.resolution_x = scene.render.resolution_y = 600
pose_at("swim", 0.25); shot("a", (14, 8, 12), (0, 0, 0))
pose_at("lunge", 0.55); shot("b", (5, 15, 2), (0, 7, 0.5))
for o in tmp: bpy.data.objects.remove(o)
rig.animation_data.action = None
for name, act in ACTS.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
sel(rig, deep, active=rig)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/deep.glb", use_selection=True, export_apply=True, export_animations=True, export_animation_mode="NLA_TRACKS")
print("EXPORTED", os.path.getsize(f"{OUT}/deep.glb"))
