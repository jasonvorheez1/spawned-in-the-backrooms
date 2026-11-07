# The Tidecrawler (Level 7): a dog-sized pale crab-thing that lives on the islands' wet shores.
# Waterlogged grey-green shell crusted with barnacles, six spindly legs, two heavy claws, black matte stalk eyes.
# Rigid parts on one armature; built facing Blender +Y (= the engine's front). Run: blender -b --factory-startup --python-exit-code 1 --python art/tidecrawler/build.py
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Quaternion, Matrix
OUT = "/workspace/tidecrawler"; PROOF = "/tmp/tidecrawler"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
K = 0.572; V = lambda *a: Vector(a); FPS = 30; TAU = math.tau
scene.render.fps = FPS

def mball(name, res=0.01):
    mb = bpy.data.metaballs.new(name); o = bpy.data.objects.new(name, mb); scene.collection.objects.link(o)
    mb.resolution = mb.render_resolution = res; mb.threshold = 0.6; return mb, o
def ball(mb, c, r, neg=False, st=2.0):
    e = mb.elements.new(type='BALL'); e.co = c; e.radius = r / K; e.use_negative = neg; e.stiffness = st; return e
def ell(mb, c, ax, ay, az, rot=None, neg=False, st=2.0):
    e = mb.elements.new(type='ELLIPSOID'); e.co = c; e.radius = 1.0; e.size_x, e.size_y, e.size_z = ax / K, ay / K, az / K
    if rot: e.rotation = rot
    e.use_negative = neg; e.stiffness = st; return e
def cap(mb, a, b, r, st=2.0):
    a, b = Vector(a), Vector(b); d = b - a
    e = mb.elements.new(type='CAPSULE'); e.co = (a + b) / 2; e.radius = r / K; e.size_x = d.length / 2
    e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized()); e.stiffness = st; return e
def taper(mb, a, b, r0, r1, n=5):
    a, b = Vector(a), Vector(b)
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        cap(mb, a.lerp(b, t0), a.lerp(b, t1), r0 + (r1 - r0) * (t0 + t1) / 2)
def sel(*objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]
def to_mesh(o, voxel, target):
    sel(o); bpy.ops.object.convert(target='MESH'); m = bpy.context.active_object
    r = m.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = voxel; bpy.ops.object.modifier_apply(modifier="vox")
    s = m.modifiers.new("sm", "SMOOTH"); s.iterations = 2; s.factor = 0.5; bpy.ops.object.modifier_apply(modifier="sm")
    n = len(m.data.polygons) * 2
    if n > target:
        d = m.modifiers.new("dec", "DECIMATE"); d.ratio = target / n; bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.shade_smooth(); return m
def mat(name, color, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; return m
SHELL = mat("shell", (0.42, 0.45, 0.38), 0.45); FLESH = mat("flesh", (0.62, 0.52, 0.47), 0.6); EYE = mat("eye", (0.0, 0.0, 0.0), 1.0)
BARN = mat("barnacle", (0.68, 0.66, 0.6), 0.85)

parts = []  # (mesh object, bone name, material)
# ---- carapace + underbelly ----
mb, o = mball("carapace", 0.012)
ell(mb, V(0, 0, 0.44), 0.40, 0.33, 0.12)
ell(mb, V(0, 0.05, 0.48), 0.30, 0.25, 0.09)           # domed back
ell(mb, V(0, 0.27, 0.42), 0.22, 0.08, 0.07)           # front brow
for s in (1, -1):
    ell(mb, V(0.30 * s, -0.02, 0.44), 0.12, 0.22, 0.08) # side flares
    ball(mb, V(0.36 * s, 0.18, 0.44), 0.05)            # rim spines
    ball(mb, V(0.38 * s, -0.10, 0.44), 0.045)
ell(mb, V(0, -0.30, 0.42), 0.18, 0.06, 0.07)           # tail lip
ell(mb, V(0, 0.0, 0.35), 0.28, 0.24, 0.07)             # belly
ell(mb, V(0, 0.30, 0.35), 0.09, 0.06, 0.05)            # mouthparts
for x in (0.04, -0.04): cap(mb, V(x, 0.34, 0.36), V(x * 1.4, 0.40, 0.30), 0.018)  # feelers
parts.append((to_mesh(o, 0.012, 3200), "body", SHELL))
# barnacles: little volcano cones crusted on the back
mb, o = mball("barnacles", 0.008)
for i in range(26):
    a = random.uniform(0, TAU); r = random.uniform(0.0, 0.85) ** 0.7
    x, y = math.cos(a) * r * 0.32, math.sin(a) * r * 0.27 - 0.04
    z = 0.44 + 0.12 * math.sqrt(max(0, 1 - (x / 0.4) ** 2 - (y / 0.33) ** 2)) + 0.035
    rr = random.uniform(0.018, 0.035); ball(mb, V(x, y, z), rr); ball(mb, V(x, y, z + rr * 0.9), rr * 0.45, neg=True)
parts.append((to_mesh(o, 0.007, 1600), "body", BARN))
# eyes on stalks
for s, nm in ((1, "L"), (-1, "R")):
    mb, o = mball("stalk" + nm, 0.006)
    taper(mb, V(0.08 * s, 0.28, 0.48), V(0.12 * s, 0.33, 0.62), 0.022, 0.016, 3)
    parts.append((to_mesh(o, 0.005, 300), "body", FLESH))
    mb, o = mball("eye" + nm, 0.006); ell(mb, V(0.125 * s, 0.335, 0.645), 0.032, 0.03, 0.036)
    parts.append((to_mesh(o, 0.005, 300), "body", EYE))

# ---- legs and claws ----
LEGS = []  # (name, hip, knee, tip)
for i, y in enumerate((0.14, -0.04, -0.22)):
    for s, nm in ((1, "L"), (-1, "R")):
        sp = (0.06 if i == 0 else 0 if i == 1 else -0.08)
        hip = V(0.30 * s, y, 0.40); knee = V(0.62 * s, y + sp, 0.60); tip = V(0.80 * s, y + sp * 2, 0.0)
        LEGS.append((f"leg{i}{nm}", hip, knee, tip))
for name, hip, knee, tip in LEGS:
    mb, o = mball(name + "_a", 0.008); taper(mb, hip, knee, 0.045, 0.032, 4); ball(mb, knee, 0.036)
    parts.append((to_mesh(o, 0.008, 400), name + "_a", SHELL))
    mb, o = mball(name + "_b", 0.007); taper(mb, knee, tip, 0.032, 0.008, 5)
    parts.append((to_mesh(o, 0.006, 400), name + "_b", SHELL))
CLAWS = []
for s, nm in ((1, "L"), (-1, "R")):
    sh = V(0.22 * s, 0.26, 0.40); el = V(0.42 * s, 0.50, 0.42); wr = V(0.30 * s, 0.70, 0.34)
    CLAWS.append((f"claw{nm}", sh, el, wr, s))
    mb, o = mball(f"claw{nm}_a", 0.008); taper(mb, sh, el, 0.05, 0.045, 3); ball(mb, el, 0.05)
    parts.append((to_mesh(o, 0.008, 500), f"claw{nm}_a", SHELL))
    mb, o = mball(f"claw{nm}_b", 0.008); taper(mb, el, wr, 0.05, 0.07, 3)
    ell(mb, wr + V(0.0, 0.06, 0.0), 0.08, 0.11, 0.065)                 # the palm, swollen
    cap(mb, wr + V(0.02 * s, 0.14, 0.02), wr + V(-0.01 * s, 0.30, 0.0), 0.03)   # fixed finger
    ball(mb, wr + V(-0.01 * s, 0.30, 0.0), 0.02)
    parts.append((to_mesh(o, 0.007, 800), f"claw{nm}_b", SHELL))
    mb, o = mball(f"claw{nm}_c", 0.007)                                  # the moving finger
    cap(mb, wr + V(0.05 * s, 0.12, -0.04), wr + V(0.04 * s, 0.27, -0.06), 0.024); ball(mb, wr + V(0.04 * s, 0.27, -0.06), 0.016)
    parts.append((to_mesh(o, 0.006, 300), f"claw{nm}_c", FLESH))

# ---- armature ----
arm = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", arm); scene.collection.objects.link(rig)
sel(rig); bpy.ops.object.mode_set(mode='EDIT'); E = arm.edit_bones
def bone(name, h, t, parent=None):
    b = E.new(name); b.head = h; b.tail = t; b.roll = 0
    if parent: b.parent = E[parent]
    return b
bone("root", V(0, 0, 0), V(0, 0.2, 0)); bone("body", V(0, -0.1, 0.42), V(0, 0.2, 0.42), "root")
for name, hip, knee, tip in LEGS:
    bone(name + "_a", hip, knee, "body"); b = bone(name + "_b", knee, tip, name + "_a"); b.use_connect = True
for name, sh, el, wr, s in CLAWS:
    bone(name + "_a", sh, el, "body"); b = bone(name + "_b", el, wr + V(0, 0.08, 0), name + "_a"); b.use_connect = True
    bone(name + "_c", wr + V(0.05 * s, 0.12, -0.04), wr + V(0.04 * s, 0.27, -0.06), name + "_b")
bpy.ops.object.mode_set(mode='OBJECT')

objs = []
for m, bn, mt in parts:
    m.data.materials.clear(); m.data.materials.append(mt)
    g = m.vertex_groups.new(name=bn); g.add(list(range(len(m.data.vertices))), 1.0, 'REPLACE'); objs.append(m)
sel(*objs, active=objs[0]); bpy.ops.object.join(); crab = bpy.context.active_object; crab.name = "tidecrawler"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
crab.parent = rig; mod = crab.modifiers.new("skin", "ARMATURE"); mod.object = rig
print("TRIS", sum(len(p.vertices) - 2 for p in crab.data.polygons))

# ---- clips: rotations about WORLD axes, converted into each bone's rest frame ----
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
def wq(pb, ax, deg):
    M = pb.bone.matrix_local.to_3x3(); q = Quaternion(V(*ax), math.radians(deg))
    return (M.inverted() @ q.to_matrix() @ M).to_quaternion()
LEGN = [l[0] for l in LEGS]
def legpose(P, name, swing, lift, curl=0):
    s = 1 if name.endswith("L") else -1
    P[name + "_a"] = [((0, 0, 1), swing * s), ((0, 1, 0), -lift * s)]
    P[name + "_b"] = [((0, 1, 0), curl * s)]
GROUP = {"leg0L": 0, "leg1R": 0, "leg2L": 0, "leg0R": 1, "leg1L": 1, "leg2R": 1}  # alternating tripods
def walk(t, amp=18, lift=22, bob=0.02):
    P = {}; ph = t * TAU
    for n in LEGN:
        p = ph + (math.pi if GROUP[n] else 0)
        legpose(P, n, amp * math.sin(p), lift * max(0, math.cos(p)), -6 * max(0, math.cos(p)))
    for nm in "LR":
        s = 1 if nm == "L" else -1
        P[f"claw{nm}_a"] = [((1, 0, 0), 6 + 4 * math.sin(ph + (nm == "R") * math.pi))]; P[f"claw{nm}_c"] = [((0, 0, 1), -6 * s)]
    P["@loc"] = (0, 0, bob * abs(math.sin(ph))); P["body"] = [((0, 1, 0), 3 * math.sin(ph))]; return P
def scuttle(t): return walk(t, 24, 28, 0.03)
def idle(t):
    ph = t * TAU; P = {}
    for i, n in enumerate(LEGN): legpose(P, n, 2 * math.sin(ph + i), 0)
    tw = max(0, math.sin(2 * ph)) ** 8
    for nm in "LR":
        s = 1 if nm == "L" else -1
        P[f"claw{nm}_a"] = [((1, 0, 0), 4 * math.sin(ph))]; P[f"claw{nm}_c"] = [((0, 0, 1), -18 * tw * s)]
    P["@loc"] = (0, 0, 0.01 * math.sin(ph)); return P
def attack(t):  # rear up, both claws high, slam and snap
    P = {}; up = math.sin(min(1, t / 0.45) * math.pi / 2) if t < 0.45 else max(0, 1 - (t - 0.45) / 0.15)
    slam = 0 if t < 0.45 else min(1, (t - 0.45) / 0.12) * max(0, 1 - (t - 0.75) / 0.25) if t > 0.75 else (0 if t < 0.45 else min(1, (t - 0.45) / 0.12))
    P["body"] = [((1, 0, 0), -14 * up + 6 * slam)]
    for n in LEGN: legpose(P, n, 0, -6 * up if n.startswith("leg2") else 10 * up)
    for nm in "LR":
        s = 1 if nm == "L" else -1
        P[f"claw{nm}_a"] = [((1, 0, 0), 55 * up - 25 * slam)]; P[f"claw{nm}_b"] = [((1, 0, 0), 20 * up - 30 * slam)]
        P[f"claw{nm}_c"] = [((0, 0, 1), (-30 * up + 30 * slam) * s)]
    P["@loc"] = (0, 0.06 * slam, 0.04 * up); return P
def hit(t):
    k = math.sin(t * math.pi); P = {"body": [((1, 0, 0), 10 * k), ((0, 1, 0), 6 * k)]}
    for n in LEGN: legpose(P, n, 0, 14 * k)
    P["@loc"] = (0, -0.05 * k, 0); return P
def death(t):
    e = min(1, t / 0.6); P = {"body": [((0, 1, 0), 22 * e)]}
    for i, n in enumerate(LEGN): legpose(P, n, 10 * math.sin(i * 2.1) * e, -30 * e, 70 * e + 6 * math.sin(t * 40) * max(0, 1 - t))
    for nm in "LR": P[f"claw{nm}_a"] = [((1, 0, 0), -20 * e)]
    P["@loc"] = (0, 0, -0.18 * e); return P
CLIPS = {"idle": (idle, 2.0), "walk": (walk, 0.8), "scuttle": (scuttle, 0.42), "attack": (attack, 0.8), "hit": (hit, 0.35), "death": (death, 1.2)}
rig.animation_data_create(); ACTS = {}
def apply(P):
    for pb in rig.pose.bones:
        q = Quaternion()
        for ax, d in P.get(pb.name, []): q = wq(pb, ax, d) @ q
        pb.rotation_quaternion = q
    rig.pose.bones["root"].location = P.get("@loc", (0, 0, 0))
for name, (fn, dur) in CLIPS.items():
    act = bpy.data.actions.new(name); act.use_fake_user = True; rig.animation_data.action = act; ACTS[name] = act
    nf = round(dur * FPS)
    for f in range(0, nf + 1):
        apply(fn(f / nf))
        for pb in rig.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f + 1)
        rig.pose.bones["root"].keyframe_insert("location", frame=f + 1)
# root bone: rest along +Y with roll 0 -> local x=X, y=Y, z=-Z? fix by converting the loc into the root's frame
Mr = rig.pose.bones["root"].bone.matrix_local.to_3x3().inverted()
for act in ACTS.values():
    pass

def pose_at(name, t): rig.animation_data.action = ACTS[name]; scene.frame_set(1 + round(t * CLIPS[name][1] * FPS))
def shot(name, pos, tgt, lens=40):
    cam = scene.camera
    if cam is None: cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    scene.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.33, 0.35, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
tmp = []
for loc, e in (((2, 2.5, 3), 4.0), ((-2.5, 1, 2), 2.0), ((0, -3, 2), 2.5)):
    l = bpy.data.lights.new("l", "SUN"); l.energy = e; lo = bpy.data.objects.new("l", l); scene.collection.objects.link(lo); tmp.append(lo)
    lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
pm = bpy.data.meshes.new("floor"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3); bm.to_mesh(pm)
fl = bpy.data.objects.new("floor", pm); scene.collection.objects.link(fl); fl.data.materials.append(mat("floor", (0.35, 0.32, 0.27), 0.8)); tmp.append(fl)
scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = scene.render.resolution_y = 656
pose_at("idle", 0); shot("a", (1.6, 2.0, 1.4), (0, 0.1, 0.35))
pose_at("walk", 0.25); shot("b", (2.2, -0.3, 0.6), (0, 0.1, 0.35))
pose_at("attack", 0.45); shot("c", (1.4, 2.0, 0.8), (0, 0.2, 0.45))
pose_at("death", 1.0); shot("d", (1.6, 1.6, 1.6), (0, 0, 0.2))
for o in tmp: bpy.data.objects.remove(o)
rig.animation_data.action = None
for name, act in ACTS.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
sel(rig, crab, active=rig)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/tidecrawler.glb", use_selection=True, export_apply=True, export_animations=True, export_animation_mode="NLA_TRACKS")
print("EXPORTED", os.path.getsize(f"{OUT}/tidecrawler.glb"))
