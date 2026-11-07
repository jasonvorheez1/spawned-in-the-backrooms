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
  neck0=V(0, 0.40, 0.80), neck1=V(0, 0.58, 0.80), skull=V(0, 0.64, 0.75), jawHinge=V(0, 0.68, 0.68), chin=V(0, 0.93, 0.595),
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
    ell(mb, V(0, 0.12, 0.80), 0.16, 0.22, 0.145)
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
                a_ = 0.15 - 0.02*abs(i-3.5)/3.5; b_ = 0.135
                p = V(s * a_ * math.cos(ang) * (0.35 + 0.65 * min(1, t * 3)), y - 0.06 * t, 0.80 + b_ * math.sin(ang))
                if prev is not None: cap(mb, prev, p, 0.0105, st=2.2)
                prev = p
    # knobby spine
    for i in range(16):
        t = i / 15; y = -0.52 + t * 1.0
        z = 0.97 if y < -0.3 else 0.925 + 0.03 * math.cos((y + 0.3) * 3) if y < 0.35 else 0.93
        ball(mb, V(0, y, z - 0.035), 0.028 + 0.006 * math.sin(t * 9), st=3.0)
    H = lambda x, y, z: V(x, y, z - 0.07)
    # neck: thin, sinewy, with tendons
    cap(mb, A["neck0"], V(0, 0.58, 0.74), 0.06)
    for s in (1, -1): cap(mb, V(0.04*s, 0.44, 0.77), V(0.03*s, 0.64, 0.68), 0.018, st=3)
    # skull: human cranium, brow, cheekbones, small nose; maxilla stretched long
    ell(mb, H(0, 0.64, 0.83), 0.095, 0.125, 0.10)
    ell(mb, H(0, 0.75, 0.80), 0.075, 0.06, 0.07)
    cap(mb, H(-0.055, 0.80, 0.835), H(0.055, 0.80, 0.835), 0.018)      # brow ridge
    for s in (1, -1): ball(mb, H(0.06*s, 0.79, 0.775), 0.022)         # cheekbones
    cap(mb, H(0, 0.80, 0.81), H(0, 0.835, 0.785), 0.014)               # nose bridge
    ball(mb, H(0, 0.84, 0.775), 0.016)                                  # nose tip
    cap(mb, H(0, 0.78, 0.755), H(0, 0.89, 0.71), 0.036)                  # long upper muzzle (maxilla)
    for s in (1, -1): cap(mb, H(0.045*s, 0.77, 0.745), H(0.03*s, 0.88, 0.705), 0.02)
    for s in (1, -1): ball(mb, H(0.042*s, 0.812, 0.80), 0.03, neg=True, st=3)  # eye sockets
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
        ell(mb, S["hip"].lerp(S["knee"], 0.4), 0.085, 0.09, 0.15, rot=Euler((0.4, 0, 0)).to_quaternion())   # gaunt thigh
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
    H = lambda x, y, z: V(x, y, z - 0.07)
    for s in (1, -1): cap(mb, H(0.06*s, 0.69, 0.75), H(0.022*s, 0.93, 0.665), 0.019)
    cap(mb, H(-0.025, 0.925, 0.665), H(0.025, 0.925, 0.665), 0.02)
    ell(mb, H(0, 0.84, 0.68), 0.035, 0.07, 0.02)
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
    shot("a", (1.9, 2.0, 1.2), (0, 0.1, 0.55)); shot("b", (2.6, 0.1, 0.7), (0, 0.1, 0.55)); shot("c", (0.3, 1.5, 0.8), (0, 0.75, 0.7), 60)
    sys.exit(0)

# ======================= full pass: low poly, bake, details, rig, clips, export =======================
import numpy as np
from mathutils.kdtree import KDTree
def sel(*objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]
def dup(o, name):
    c = o.copy(); c.data = o.data.copy(); c.name = name; scene.collection.objects.link(c); return c
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

# high copy for the normal bake
high = dup(body, "high"); hj = dup(jaw, "highjaw"); sel(high, hj, active=high); bpy.ops.object.join()
# low skin
def decimate(o, target):
    r = target / max(1, tris(o)); d = o.modifiers.new("dec", "DECIMATE"); d.ratio = r; sel(o); bpy.ops.object.modifier_apply(modifier="dec")
decimate(body, 7600); decimate(jaw, 900)
g = jaw.vertex_groups.new(name="jaw"); g.add(list(range(len(jaw.data.vertices))), 1.0, 'REPLACE')
sel(body, jaw, active=body); bpy.ops.object.join(); low = body; low.name = "hound_skin"
bpy.ops.object.shade_smooth()
sel(low); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')

# ---- procedural skin painted into textures ----
RES = 1024
def img(name, data=False):
    i = bpy.data.images.new(name, RES, RES, alpha=False, float_buffer=False)
    if data: i.colorspace_settings.name = "Non-Color"
    return i
img_col, img_ao, img_nrm = img("h_col"), img("h_ao", True), img("h_nrm", True)
bm_ = bpy.data.materials.new("bakeproc"); bm_.use_nodes = True; nt = bm_.node_tree; N = nt.nodes; Lk = nt.links
for n in list(N): N.remove(n)
out = N.new("ShaderNodeOutputMaterial"); em = N.new("ShaderNodeEmission"); Lk.new(em.outputs[0], out.inputs[0])
tc = N.new("ShaderNodeTexCoord"); co = tc.outputs["Object"]
def noise(scale, detail=4, rough=0.6):
    n = N.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough; Lk.new(co, n.inputs["Vector"]); return n
def ramp(src, stops):
    r = N.new("ShaderNodeValToRGB"); e = r.color_ramp.elements
    e[0].position, e[0].color = stops[0][0], (*stops[0][1], 1); e[1].position, e[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]: x = e.new(p); x.color = (*c, 1)
    Lk.new(src, r.inputs[0]); return r
def mix(fac, a, b):
    m = N.new("ShaderNodeMix"); m.data_type = 'RGBA'
    if isinstance(fac, float): m.inputs[0].default_value = fac
    else: Lk.new(fac, m.inputs[0])
    Lk.new(a, m.inputs[6]); Lk.new(b, m.inputs[7]); return m.outputs[2]
mott = ramp(noise(5, 8, 0.7).outputs[0], [(0.2, (0.55, 0.535, 0.51)), (0.8, (0.64, 0.62, 0.585))])
vor = N.new("ShaderNodeTexVoronoi"); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs["Scale"].default_value = 7
dn = noise(4, 2); vm = N.new("ShaderNodeMix"); vm.data_type = 'VECTOR'; vm.inputs[0].default_value = 0.25; Lk.new(co, vm.inputs[4]); Lk.new(dn.outputs["Color"], vm.inputs[5]); Lk.new(vm.outputs[1], vor.inputs["Vector"])
veins = ramp(vor.outputs["Distance"], [(0.0, (0.3, 0.3, 0.3)), (0.01, (0, 0, 0))])
vc = N.new("ShaderNodeRGB"); vc.outputs[0].default_value = (0.36, 0.38, 0.46, 1)
c1 = mix(veins.outputs[0], mott.outputs[0], vc.outputs[0])
bruise = ramp(noise(2.5, 3).outputs[0], [(0.58, (0, 0, 0)), (0.7, (0.55, 0.55, 0.55))])
br = N.new("ShaderNodeRGB"); br.outputs[0].default_value = (0.46, 0.33, 0.33, 1)
c2 = mix(bruise.outputs[0], c1, br.outputs[0])
sep = N.new("ShaderNodeSeparateXYZ"); Lk.new(co, sep.inputs[0])
grime = ramp(sep.outputs["Z"], [(0.05, (0.9, 0.9, 0.9)), (0.32, (0, 0, 0))])
gr = N.new("ShaderNodeRGB"); gr.outputs[0].default_value = (0.24, 0.2, 0.15, 1)
c3 = mix(grime.outputs[0], c2, gr.outputs[0])
Lk.new(c3, em.inputs[0])
ti = N.new("ShaderNodeTexImage"); ti.image = img_col; N.active = ti
low.data.materials.clear(); low.data.materials.append(bm_)
scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.cycles.device = 'CPU'
sel(low); bpy.ops.object.bake(type='EMIT', margin=8)
ti.image = img_ao; bpy.ops.object.bake(type='AO', margin=8)
ti.image = img_nrm; sel(high, low, active=low)
bpy.ops.object.bake(type='NORMAL', use_selected_to_active=True, cage_extrusion=0.015, max_ray_distance=0.04, margin=8)
col = np.array(img_col.pixels[:]).reshape(-1, 4); ao = np.array(img_ao.pixels[:]).reshape(-1, 4)
col[:, :3] *= (0.5 + 0.5 * ao[:, :1]); img_col.pixels[:] = col.ravel()
for i in (img_col, img_nrm):
    i.filepath_raw = f"{OUT}/{i.name}.png"; i.file_format = 'PNG'; i.save()
bpy.data.objects.remove(high)
# final skin material
skinm = bpy.data.materials.new("skin"); skinm.use_nodes = True; nt = skinm.node_tree; P = nt.nodes["Principled BSDF"]
t1 = nt.nodes.new("ShaderNodeTexImage"); t1.image = img_col; nt.links.new(t1.outputs[0], P.inputs["Base Color"])
t2 = nt.nodes.new("ShaderNodeTexImage"); t2.image = img_nrm; nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(t2.outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], P.inputs["Normal"])
P.inputs["Roughness"].default_value = 0.48
low.data.materials.clear(); low.data.materials.append(skinm)

# ---- details: eyes, teeth, claws, hair ----
hairm = mat("hair", (0.018, 0.016, 0.014), 0.72); eyem = mat("eyes", (0.004, 0.004, 0.004), 0.3); clawm = mat("claws", (0.16, 0.13, 0.09), 0.45); toothm = mat("teeth", (0.5, 0.45, 0.33), 0.4)
parts = []   # (object, rigid bone)
def mesh_obj(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return o
for s in (1, -1):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=0.025)
    bmesh.ops.scale(bm, vec=(1, 0.8, 0.9), verts=bm.verts); bmesh.ops.translate(bm, vec=(0.043*s, 0.806, 0.73), verts=bm.verts)
    parts.append((mesh_obj("eye", bm, eyem), "head"))
# teeth from the skin's real underside
hv = [(v.co.copy()) for v in low.data.vertices]; jg = low.vertex_groups["jaw"].index
isjaw = [any(g.group == jg for g in v.groups) for v in low.data.vertices]
def column(x, y, wantjaw, top):
    best = None
    for p, j in zip(hv, isjaw):
        if j != wantjaw or abs(p.x - x) > 0.009 or abs(p.y - y) > 0.009 or not (0.55 < p.z < 0.74): continue
        if best is None or (p.z > best if top else p.z < best): best = p.z
    return best
def cone(bm, base, tip, r):
    d = tip - base; L = d.length
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=r, radius2=0.0004, depth=L)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    for v in res["verts"]: v.co = base + q @ (v.co + Vector((0, 0, L / 2)))
for wantjaw, bone in ((False, "head"), (True, "jaw")):
    bm = bmesh.new()
    for k in range(7):
        y = 0.80 + k * 0.017
        for s in (1, -1):
            x = s * (0.034 - k * 0.0025) if not wantjaw else s * (0.04 - k * 0.0035)
            z = column(x, y, wantjaw, top=wantjaw)
            if z is None: continue
            TL = 0.03 if k in (1, 2) else 0.018
            base = Vector((x, y, z + (0.004 if not wantjaw else -0.004)))
            cone(bm, base, base + Vector((0, 0.004, TL if wantjaw else -TL)), 0.0045)
    parts.append((mesh_obj("teeth", bm, toothm), bone))
bm = bmesh.new()
for S, s, nm_ in ((L, 1, "L"), (R, -1, "R")):
    for f in range(4):
        fx = (f - 1.5) * 0.022 * s
        k0 = S["knuck"] + V(fx, 0, 0.005); k1 = k0 + V(fx * 0.6, 0.05, 0.012); k2 = k1 + V(fx * 0.3, 0.035, -0.02)
        cone(bm, k2 - V(0, 0.006, -0.002), k2 + V(fx * 0.2, 0.032, -0.018), 0.0055)
        fx2 = (f - 1.5) * 0.017 * s; tp = S["toe"] + V(fx2 * 1.3, 0.045, 0.006)
        cone(bm, tp - V(0, 0.005, 0), tp + V(fx2 * 0.2, 0.025, -0.006), 0.0045)
claws = mesh_obj("claws", bm, clawm); parts.append((claws, None))
# hair: matted clumps of stringy strands from the crown, a fringe dragged over the face
C0 = V(0, 0.655, 0.765); RAD = V(0.112, 0.15, 0.115)
def push_out(p):
    d = p - C0; e = math.sqrt((d.x / RAD.x) ** 2 + (d.y / RAD.y) ** 2 + (d.z / RAD.z) ** 2)
    return C0 + d * (1.0 / e) if e < 1.0 else p
cd = bpy.data.curves.new("hair", "CURVE"); cd.dimensions = '3D'; cd.bevel_depth = 0.0055; cd.bevel_resolution = 0; cd.resolution_u = 2
rng = random.Random(11)
clumps = []
for c in range(30):
    a = rng.uniform(-1.9, 1.9); yr = rng.uniform(0.54, 0.79)
    clumps.append((a, yr, rng.uniform(0.26, 0.44), V(rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.03), 0)))
for i in range(92):
    a0, y0, Lh, off = clumps[i % len(clumps)]
    a = a0 + rng.uniform(-0.18, 0.18); yr = y0 + rng.uniform(-0.025, 0.025)
    d_ = V(math.sin(a) * 0.2, yr - C0.y, math.cos(a) * 0.2); e_ = math.sqrt((d_.x / RAD.x) ** 2 + (d_.y / RAD.y) ** 2 + (d_.z / RAD.z) ** 2); root = C0 + d_ * (0.93 / e_)
    front = yr > 0.72 and abs(a) < 0.7
    pts = []
    for k in range(8):
        u = k / 7
        if front:   # over the brow, forward and down in front of the face
            p = root.lerp(V(root.x * 0.8, 0.90, 0.79), min(1, u * 2.2)) if u < 0.45 else V(root.x * (0.8 + 0.6 * (u - 0.45)), 0.90 + 0.17 * (u - 0.45), 0.79 - (u - 0.45) * 0.5)
        else:
            side_ = math.sin(a); out = 1 + 0.35 * u
            p = V(root.x * out + side_ * 0.04 * u, root.y + 0.04 * u, root.z - Lh * u ** 1.3)
        p = p + off * u + V(math.sin(u * 9 + i), math.cos(u * 7 + i * 1.3), 0) * 0.008 * u
        pts.append(push_out(p) if k < 6 else p)
    sp = cd.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for k, p in enumerate(pts): sp.points[k].co = (*p, 1); sp.points[k].radius = (1.25 - 0.95 * k / 7) * rng.uniform(0.7, 1.3)
ho = bpy.data.objects.new("hair", cd); scene.collection.objects.link(ho); sel(ho); bpy.ops.object.convert(target='MESH'); ho = bpy.context.active_object
ho.data.materials.clear(); ho.data.materials.append(hairm); bpy.ops.object.shade_smooth(); parts.append((ho, "head"))

# ---- rig ----
J = V(0, 0.68, 0.68)
BONES = [("root", V(0, -0.1, 0), V(0, 0.1, 0), None), ("hips", A["pelvis"], A["lumbar"], "root"), ("spine", A["lumbar"], A["chest"], "hips"),
         ("chest", A["chest"], A["upper"], "spine"), ("neck", A["neck0"], V(0, 0.58, 0.74), "chest"), ("head", V(0, 0.58, 0.74), V(0, 0.82, 0.70), "neck"),
         ("jaw", J, V(0, 0.93, 0.595), "head")]
for S, n in ((L, "L"), (R, "R")):
    BONES += [(f"scap.{n}", S["scap"], S["shoulder"], "chest"), (f"upperarm.{n}", S["shoulder"], S["elbow"], f"scap.{n}"), (f"forearm.{n}", S["elbow"], S["wrist"], f"upperarm.{n}"),
              (f"hand.{n}", S["wrist"], S["knuck"] + V(0, 0.06, 0), f"forearm.{n}"), (f"thigh.{n}", S["hip"], S["knee"], "hips"), (f"shin.{n}", S["knee"], S["ankle"], f"thigh.{n}"),
              (f"foot.{n}", S["ankle"], S["toe"] + V(0, 0.04, 0), f"shin.{n}")]
ad = bpy.data.armatures.new("hound_rig"); rig = bpy.data.objects.new("hound_rig", ad); scene.collection.objects.link(rig)
sel(rig); bpy.ops.object.mode_set(mode='EDIT')
for nm_, h, t, p in BONES:
    eb = ad.edit_bones.new(nm_); eb.head, eb.tail = h, t; d = (t - h).normalized()
    eb.align_roll(Vector((1, 0, 0)).cross(d)); eb.use_deform = nm_ != "root"
    if p: eb.parent = ad.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
# weights: skin by distance to bone segments, side-locked limbs; details rigid
segs = [(n, h, t) for n, h, t, p in BONES if n != "root"]
def segd(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
for n, *_ in segs: low.vertex_groups.new(name=n) if n not in low.vertex_groups else None
VG = {g.name: g for g in low.vertex_groups}
for v in low.data.vertices:
    p = v.co
    if isjaw[v.index]: continue
    ws = []
    for n, a, b in segs:
        if n == "jaw": continue
        if n.endswith(".L") and p.x < -0.05: continue
        if n.endswith(".R") and p.x > 0.05: continue
        d = segd(p, a, b)
        if n in ("chest", "spine", "hips") and abs(p.x) < 0.17 and p.z > 0.6: d *= 0.6
        if n == "head" and p.y > 0.6: d *= 0.5
        if n.startswith("scap") : d *= 1.3
        ws.append(((d + 0.01) ** -4, n))
    ws.sort(reverse=True); ws = ws[:3]; tot = sum(w for w, _ in ws)
    for w, n in ws: VG[n].add([v.index], w / tot, 'REPLACE')
for o, bone in parts:
    if bone:
        g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    else:   # claws: nearest hand/foot
        for v in o.data.vertices:
            n = min((n for n, *_ in segs if n.split(".")[0] in ("hand", "foot")), key=lambda n: segd(v.co, *[(h, t) for nn, h, t in segs if nn == n][0]))
            g = o.vertex_groups.get(n) or o.vertex_groups.new(name=n); g.add([v.index], 1.0, 'REPLACE')
sel(low, *[o for o, _ in parts], active=low); bpy.ops.object.join(); hound = low; hound.name = "hound"
md = hound.modifiers.new("rig", "ARMATURE"); md.object = rig; hound.parent = rig
print("FINAL tris", tris(hound))

# ---- clips ----
FPS = 30; scene.render.fps = FPS
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
SIDES = ("L", "R")
def sm(x): x = max(0, min(1, x)); return x * x * (3 - 2 * x)
def leg(P, side, front, ph, swing, lift, base=(0, 0, 0)):
    c = max(0, math.cos(ph))
    if front:
        P[f"upperarm.{side}"] = (base[0] + swing * math.sin(ph), 0, 0); P[f"forearm.{side}"] = (base[1] - lift * c, 0, 0); P[f"hand.{side}"] = (base[2] + lift * 0.7 * c, 0, 0)
    else:
        P[f"thigh.{side}"] = (base[0] + swing * math.sin(ph), 0, 0); P[f"shin.{side}"] = (base[1] - lift * c, 0, 0); P[f"foot.{side}"] = (base[2] + lift * 0.6 * c, 0, 0)
TAU = math.tau
def prowl(t):
    ph = t * TAU; P = {}
    for s, o in (("L", 0.25), ("R", 0.75)): leg(P, s, True, ph + o * TAU, 16, 32, (10, -18, 6))
    for s, o in (("L", 0.0), ("R", 0.5)): leg(P, s, False, ph + o * TAU, 15, 28, (8, -12, 3))
    P["chest"] = (-6, 0, 4 * math.sin(ph)); P["spine"] = (2, 0, -4 * math.sin(ph)); P["neck"] = (-22, 0, 0)
    P["head"] = (10 + 4 * math.sin(2 * ph), 6 * math.sin(ph), 7 * math.sin(ph)); P["jaw"] = (-6, 0, 0)
    P["root"] = (0, 3 * math.sin(ph), 0); P["@loc"] = (0, 0, -0.035 + 0.012 * math.sin(2 * ph)); return P
def sprint(t):
    ph = t * TAU; P = {}
    for s, o in (("L", 0.0), ("R", 0.08)): leg(P, s, True, ph + o * TAU, 42, 60, (8, -10, 4))
    for s, o in (("L", 0.5), ("R", 0.58)): leg(P, s, False, ph + o * TAU, 40, 55, (2, -6, 0))
    P["hips"] = (9 * math.sin(ph), 0, 0); P["spine"] = (10 * math.sin(ph + 0.6), 0, 0); P["chest"] = (-8 * math.sin(ph), 0, 0)
    P["neck"] = (-12 - 6 * math.sin(ph), 0, 0); P["head"] = (8, 0, 0); P["jaw"] = (-14 - 10 * max(0, math.sin(ph)), 0, 0)
    P["@loc"] = (0, 0, 0.02 + 0.05 * math.sin(2 * ph)); return P
def howl(t):
    e = sm(t / 0.22) * (1 - sm((t - 0.8) / 0.2)); P = {}
    vib = math.sin(t * 90) * e
    P["chest"] = (14 * e, 0, 0); P["spine"] = (6 * e, 0, 0); P["hips"] = (-8 * e, 0, 0)
    P["neck"] = (50 * e, 0, 0); P["head"] = (38 * e + 2 * vib, 5 * math.sin(t * 23) * e, 0); P["jaw"] = (-48 * e + 5 * vib, 0, 0)
    for s in SIDES: P[f"upperarm.{s}"] = (-12 * e, 0, 0); P[f"forearm.{s}"] = (6 * e, 0, 0); P[f"hand.{s}"] = (6 * e, 0, 0); P[f"thigh.{s}"] = (14 * e, 0, 0); P[f"shin.{s}"] = (-18 * e, 0, 0)
    P["@loc"] = (0, 0, 0.04 * e); return P
def pounce(t):
    c = sm(t / 0.3) * (1 - sm((t - 0.3) / 0.12)); l = sm((t - 0.3) / 0.15) * (1 - sm((t - 0.68) / 0.22)); P = {}
    for s in SIDES:
        P[f"upperarm.{s}"] = (30 * c + 88 * l, 0, 0); P[f"forearm.{s}"] = (-60 * c - 5 * l, 0, 0); P[f"hand.{s}"] = (30 * c - 35 * l, 0, 0)
        P[f"thigh.{s}"] = (35 * c - 55 * l, 0, 0); P[f"shin.{s}"] = (-45 * c + 25 * l, 0, 0); P[f"foot.{s}"] = (12 * c - 20 * l, 0, 0)
    P["neck"] = (-18 * c + 14 * l, 0, 0); P["head"] = (10 * c + 4 * l, 0, 0); P["jaw"] = (-8 * c - 55 * l, 0, 0)
    P["chest"] = (-6 * c + 10 * l, 0, 0); P["hips"] = (6 * c - 10 * l, 0, 0)
    P["@loc"] = (0, 0, -0.14 * c + 0.16 * l); return P
def maul(t):
    ph = t * TAU; P = {}
    P["neck"] = (-22 + 6 * math.sin(2 * ph), 0, 26 * math.sin(ph)); P["head"] = (-8, 22 * math.sin(2 * ph + 0.5), 32 * math.sin(ph + 0.7))
    P["chest"] = (0, 0, 10 * math.sin(ph)); P["jaw"] = (-38 * (0.5 + 0.5 * math.sin(4 * ph)), 0, 0); P["root"] = (0, 0, 8 * math.sin(ph))
    for s, k in (("L", 1), ("R", -1)):
        P[f"upperarm.{s}"] = (18 + 8 * k * math.sin(ph), 0, 0); P[f"forearm.{s}"] = (-34, 0, 0); P[f"hand.{s}"] = (16, 0, 0)
        P[f"thigh.{s}"] = (16, 0, 0); P[f"shin.{s}"] = (-22, 0, 0)
    P["@loc"] = (0, 0, -0.07); return P
def stagger(t):
    ph = t * TAU; P = {}
    P["root"] = (0, 12 * math.sin(ph), 0); P["@loc"] = (0.04 * math.sin(ph), 0, -0.05)
    P["neck"] = (-28 + 8 * math.sin(2 * ph), 0, 10 * math.sin(7 * ph)); P["head"] = (-10, -26 * math.sin(ph + 1), 6 * math.sin(11 * ph)); P["jaw"] = (-18 - 6 * math.sin(9 * ph), 0, 0)
    for s, k in (("L", 1), ("R", -1)):
        b = 0.5 + 0.5 * math.sin(ph) * k
        P[f"upperarm.{s}"] = (14 + 14 * b, 0, 0); P[f"forearm.{s}"] = (-38 * b, 0, 0); P[f"thigh.{s}"] = (10 * b, 0, 0); P[f"shin.{s}"] = (-24 * b, 0, 0)
    return P
def death(t):
    j = sm(t / 0.18) * (1 - sm((t - 0.18) / 0.12)); e = sm((t - 0.15) / 0.55); P = {}
    P["root"] = (0, 82 * e, 0); P["@loc"] = (0, 0, -0.06 * e)
    P["neck"] = (30 * j - 25 * e, 0, 0); P["head"] = (25 * j - 30 * e, 0, 0); P["jaw"] = (-30 * j - 42 * e, 0, 0)
    for s, k in (("L", 1), ("R", -1)):
        P[f"upperarm.{s}"] = (30 * e * k + 10, 0, 0); P[f"forearm.{s}"] = (-25 * e, 0, 0); P[f"hand.{s}"] = (-20 * e, 0, 0)
        P[f"thigh.{s}"] = (-15 * e * k, 0, 0); P[f"shin.{s}"] = (-30 * e, 0, 0); P[f"foot.{s}"] = (-20 * e, 0, 0)
    P["spine"] = (-10 * e, 0, 0); return P
def idle(t):
    ph = t * TAU; tw = max(0, math.sin(3 * ph)) ** 12; P = {}
    P["chest"] = (2.5 * math.sin(ph), 0, 0); P["neck"] = (-16 + 3 * math.sin(ph), 0, 0)
    P["head"] = (6 + 14 * tw, 18 * tw, 9 * math.sin(ph)); P["jaw"] = (-5 - 3 * math.sin(ph), 0, 0)
    for s in SIDES: P[f"upperarm.{s}"] = (6, 0, 0); P[f"forearm.{s}"] = (-10, 0, 0); P[f"hand.{s}"] = (4, 0, 0)
    P["@loc"] = (0, 0, -0.015 + 0.006 * math.sin(ph)); return P
CLIPS = {"idle": (idle, 2.4), "prowl": (prowl, 1.3), "sprint": (sprint, 0.48), "howl": (howl, 1.8), "pounce": (pounce, 0.8),
         "maul": (maul, 0.7), "stagger": (stagger, 1.0), "death": (death, 1.4)}
rig.animation_data_create(); ACTS = {}
for name, (fn, dur) in CLIPS.items():
    act = bpy.data.actions.new(name); act.use_fake_user = True; rig.animation_data.action = act; ACTS[name] = act
    nf = round(dur * FPS)
    for f in range(0, nf + 1, 2 if nf > 20 else 1):
        P = fn(f / nf)
        for pb in rig.pose.bones:
            r = P.get(pb.name, (0, 0, 0)); pb.rotation_euler = tuple(math.radians(x) for x in r); pb.keyframe_insert("rotation_euler", frame=f + 1)
        lc = P.get("@loc", (0, 0, 0)); rp = rig.pose.bones["root"]
        rp.location = (lc[0], lc[1], -lc[2]) if False else (lc[0], lc[2], -lc[1]) if False else rp.location
        # root bone: Y along world +Y, Z up -> local (x, y, z) = world (x, y, z)
        rp.location = (lc[0], lc[1], lc[2]); rp.keyframe_insert("location", frame=f + 1)
        rp.rotation_euler = tuple(math.radians(x) for x in P.get("root", (0, 0, 0))); rp.keyframe_insert("rotation_euler", frame=f + 1)

def pose_at(name, t):
    rig.animation_data.action = ACTS[name]; scene.frame_set(1 + round(t * CLIPS[name][1] * FPS))
if STAGE in ("all", "proof"):
    lights_and_cam(); scene.cycles.samples = 24
    for o in scene.objects:
        if o.name == "floor": o.scale = (1, 1, 1)
    pose_at("idle", 0); shot("p1", (1.7, 1.9, 1.0), (0, 0.1, 0.5))
    shot("p2", (0.35, 1.45, 0.62), (0, 0.8, 0.66), 55)
    pose_at("howl", 0.5); shot("p3", (2.2, 1.2, 0.8), (0, 0.2, 0.6))
    pose_at("pounce", 0.47); shot("p4", (2.4, 0.5, 0.8), (0, 0.2, 0.6))
    pose_at("maul", 0.25); shot("p5", (1.3, 1.6, 0.7), (0, 0.4, 0.6))
    pose_at("death", 1.0); shot("p6", (1.8, 1.6, 1.3), (0.4, 0.1, 0.2))
    floor = bpy.data.objects["floor"]; bpy.data.objects.remove(floor)
    for l in [o for o in scene.objects if o.type == 'LIGHT' or o.type == 'CAMERA']: bpy.data.objects.remove(l)
rig.animation_data.action = None
for name, act in ACTS.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
for pb in rig.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
sel(rig, hound, active=rig)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/hound.glb", use_selection=True, export_apply=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_image_format='JPEG', export_jpeg_quality=88)
print("EXPORTED", os.path.getsize(f"{OUT}/hound.glb"))
