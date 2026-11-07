# The Hound (Backrooms Levels 1-3): a pale hairless human forced onto all fours, matted black hair over
# a too-human face, wide black eyes, an elongated jaw, knobby spine, ribs pressing through, claws.
# Built facing Blender +Y (= glTF -Z, the engine's front). Run: blender -b --factory-startup --python-exit-code 1 --python art/hound/build.py
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix, Quaternion, Euler
OUT = "/workspace/hound"; PROOF = "/tmp/hound"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
STAGE = os.environ.get("STAGE", "all")
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
K = 0.572  # metaball visible radius per unit radius (threshold .6, stiffness 2)
V = lambda *a: Vector(a)

def mball(name):
    mb = bpy.data.metaballs.new(name); o = bpy.data.objects.new(name, mb); scene.collection.objects.link(o)
    mb.resolution = mb.render_resolution = 0.008; mb.threshold = 0.6
    return mb
def ball(mb, c, r, neg=False, st=2.0):
    e = mb.elements.new(type='BALL'); e.co = c; e.radius = r / K; e.use_negative = neg; e.stiffness = st; return e
def ell(mb, c, ax, ay, az, rot=None, neg=False, st=2.0):
    e = mb.elements.new(type='ELLIPSOID'); e.co = c; e.radius = 1.0; e.size_x, e.size_y, e.size_z = ax / K, ay / K, az / K
    if rot: e.rotation = rot
    e.use_negative = neg; e.stiffness = st; return e
def cap(mb, a, b, r, neg=False, st=2.0):
    a, b = Vector(a), Vector(b); d = b - a
    e = mb.elements.new(type='CAPSULE'); e.co = (a + b) / 2; e.radius = r / K; e.size_x = d.length / 2
    e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized()); e.use_negative = neg; e.stiffness = st; return e
def chain(mb, pts, rs, st=2.0):
    for i in range(len(pts) - 1): cap(mb, pts[i], pts[i + 1], (rs[i] + rs[i + 1]) / 2, st=st)

# ---------------- anatomy (metres, ground z=0, front +Y) ----------------
A = dict(
  pelvis=V(0, -0.42, 0.86), lumbar=V(0, -0.18, 0.83), chest=V(0, 0.10, 0.80), upper=V(0, 0.30, 0.79),
  neck0=V(0, 0.40, 0.80), neck1=V(0, 0.58, 0.80), skull=V(0, 0.66, 0.80), jawHinge=V(0, 0.66, 0.73), chin=V(0, 0.90, 0.64),
)
def side(s):
    return dict(hip=V(0.12*s, -0.45, 0.83), knee=V(0.17*s, -0.24, 0.42), ankle=V(0.17*s, -0.62, 0.12), toe=V(0.17*s, -0.47, 0.01),
                scap=V(0.05*s, 0.36, 0.83), shoulder=V(0.19*s, 0.36, 0.77), elbow=V(0.25*s, 0.40, 0.42), wrist=V(0.23*s, 0.56, 0.07), knuck=V(0.23*s, 0.66, 0.03))
L, R = side(1), side(-1)

def build_body():
    mb = mball("Body")
    # torso: pelvis, emaciated waist, ribcage
    ell(mb, A["pelvis"], 0.15, 0.13, 0.12)
    ell(mb, V(0, -0.20, 0.835), 0.095, 0.16, 0.085)
    ell(mb, V(0, 0.12, 0.80), 0.155, 0.22, 0.14)
    ell(mb, V(0, 0.30, 0.795), 0.15, 0.10, 0.12)
    # hip bones jutting, shoulder blades
    for s in (1, -1):
        ball(mb, V(0.12*s, -0.34, 0.93), 0.035)
        ell(mb, V(0.09*s, 0.30, 0.90), 0.05, 0.08, 0.02, rot=Euler((0.2, 0.25*s, 0)).to_quaternion())
    # ribs: arcs around the chest, sloping back at the belly
    for i in range(8):
        y = -0.04 + i * 0.045
        for s in (1, -1):
            prev = None
            for k in range(6):
                t = k / 5; ang = math.radians(80 - 150 * t)
                a_ = 0.165 - 0.02*abs(i-3.5)/3.5; b_ = 0.15
                p = V(s * a_ * math.cos(ang) * (0.35 + 0.65 * min(1, t * 3)), y - 0.06 * t, 0.80 + b_ * math.sin(ang))
                if prev is not None: cap(mb, prev, p, 0.014, st=3.0)
                prev = p
    # knobby spine
    for i in range(16):
        t = i / 15; y = -0.52 + t * 1.0
        z = 0.97 if y < -0.3 else 0.925 + 0.03 * math.cos((y + 0.3) * 3) if y < 0.35 else 0.93
        ball(mb, V(0, y, z - 0.035), 0.028 + 0.006 * math.sin(t * 9), st=3.0)
    # neck: thin, sinewy, with tendons
    cap(mb, A["neck0"], A["neck1"], 0.06)
    for s in (1, -1): cap(mb, V(0.04*s, 0.44, 0.77), V(0.03*s, 0.64, 0.74), 0.018, st=3)
    # skull: human cranium, brow, cheekbones, small nose; maxilla stretched long
    ell(mb, V(0, 0.66, 0.83), 0.095, 0.11, 0.10)
    ell(mb, V(0, 0.75, 0.80), 0.075, 0.06, 0.07)
    cap(mb, V(-0.055, 0.80, 0.835), V(0.055, 0.80, 0.835), 0.022)      # brow ridge
    for s in (1, -1): ball(mb, V(0.06*s, 0.79, 0.775), 0.026)         # cheekbones
    cap(mb, V(0, 0.80, 0.81), V(0, 0.835, 0.785), 0.016)               # nose bridge
    ball(mb, V(0, 0.84, 0.775), 0.017)                                  # nose tip
    cap(mb, V(0, 0.78, 0.755), V(0, 0.89, 0.71), 0.04)                  # long upper muzzle (maxilla)
    for s in (1, -1): cap(mb, V(0.045*s, 0.77, 0.745), V(0.03*s, 0.88, 0.705), 0.022)
    for s in (1, -1): ball(mb, V(0.042*s, 0.815, 0.80), 0.026, neg=True)  # eye sockets
    # limbs: long human arms, bent human legs
    for S, s in ((L, 1), (R, -1)):
        cap(mb, S["scap"], S["shoulder"], 0.06)
        chain(mb, [S["shoulder"], S["elbow"], S["wrist"]], [0.058, 0.04, 0.03])
        ball(mb, S["elbow"] + V(0, -0.02, 0), 0.035)
        ell(mb, S["wrist"].lerp(S["knuck"], 0.5) + V(0, 0, 0.0), 0.04, 0.055, 0.017)   # palm, flat on the floor
        for f in range(4):   # long fingers, splayed, bent to the floor
            fx = (f - 1.5) * 0.022 * s
            k0 = S["knuck"] + V(fx, 0, 0.005); k1 = k0 + V(fx * 0.6, 0.05, 0.012); k2 = k1 + V(fx * 0.3, 0.035, -0.02)
            chain(mb, [k0, k1, k2], [0.011, 0.009, 0.007], st=3)
        ball(mb, S["wrist"] + V(-0.035*s, 0.06, 0.0), 0.011)   # thumb stub
        ell(mb, S["hip"].lerp(S["knee"], 0.4), 0.075, 0.08, 0.13, rot=Euler((0.4, 0, 0)).to_quaternion())   # gaunt thigh
        chain(mb, [S["hip"], S["knee"], S["ankle"]], [0.07, 0.045, 0.03])
        ball(mb, S["knee"] + V(0, 0.015, 0), 0.04)
        ell(mb, S["knee"].lerp(S["ankle"], 0.3), 0.045, 0.05, 0.06, rot=Euler((-0.65, 0, 0)).to_quaternion())  # calf
        cap(mb, S["ankle"], S["toe"], 0.026)
        ball(mb, S["ankle"] + V(0, -0.02, 0), 0.03)   # heel bone
        for f in range(4):
            fx = (f - 1.5) * 0.017 * s
            cap(mb, S["toe"] + V(fx, -0.01, 0.006), S["toe"] + V(fx*1.3, 0.045, 0.006), 0.009, st=3)
    return bpy.data.objects["Body"]

def build_jaw():
    mb = mball("Jaw")
    for s in (1, -1): cap(mb, V(0.06*s, 0.69, 0.75), V(0.022*s, 0.93, 0.665), 0.019)
    cap(mb, V(-0.025, 0.925, 0.665), V(0.025, 0.925, 0.665), 0.02)
    ell(mb, V(0, 0.84, 0.68), 0.035, 0.07, 0.02)
    return bpy.data.objects["Jaw"]

def to_mesh(o, voxel):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH'); m = bpy.context.active_object
    r = m.modifiers.new("vox", "REMESH"); r.mode = 'VOXEL'; r.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier="vox")
    sm = m.modifiers.new("sm", "SMOOTH"); sm.iterations = 3; sm.factor = 0.5
    bpy.ops.object.modifier_apply(modifier="sm")
    return m

def mat(name, color, rough, metal=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m

body = to_mesh(build_body(), 0.006); body.name = "hound_body"
jaw = to_mesh(build_jaw(), 0.005); jaw.name = "hound_jaw"
skin = mat("skin", (0.55, 0.53, 0.5), 0.5)
for o in (body, jaw): o.data.materials.append(skin); bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.shade_smooth()
print("HIGH tris", sum(len(o.data.polygons) for o in (body, jaw)))

def lights_and_cam():
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.33, 0.28, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    for loc, e in (((2, 2.5, 3), 4.0), ((-2.5, 1, 2), 2.0), ((0, -3, 2), 2.5)):
        l = bpy.data.lights.new("l", "SUN"); l.energy = e; lo = bpy.data.objects.new("l", l); scene.collection.objects.link(lo)
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    pl = bpy.data.meshes.new("floor"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); bm.to_mesh(pl)
    f = bpy.data.objects.new("floor", pl); scene.collection.objects.link(f); f.data.materials.append(mat("floor", (0.45, 0.4, 0.3), 0.8))
    scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = scene.render.resolution_y = 656
def shot(name, pos, tgt, lens=40):
    cam = scene.camera
    if cam is None:
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    scene.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)

if STAGE == "shape":
    lights_and_cam()
    shot("a", (1.9, 2.0, 1.2), (0, 0.1, 0.55)); shot("b", (2.6, 0.1, 0.7), (0, 0.1, 0.55)); shot("c", (0.25, 1.6, 0.85), (0, 0.75, 0.75), 60)
    sys.exit(0)
