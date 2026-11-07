# Deathmoth: one skinned mesh on a small rig, clips Flutter/Dive/Bite/Death. Front -Y (exports +Z), Z up.
import bpy, bmesh, math, random, os
import numpy as np
from mathutils import Vector, Quaternion, Matrix
OUT = "/workspace/out"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/moth", exist_ok=True)
random.seed(7); np.random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
CZ = 0.16  # body centre height above origin

def link(o): sc.collection.objects.link(o); return o
def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return link(bpy.data.objects.new(name, me))

# ---------- body: skin-modifier graph (head, thorax, abdomen, 6 legs) ----------
verts, edges, radii = [], [], []
def V(p, r): verts.append(p); radii.append(r); return len(verts) - 1
spine = [((0, -0.17, CZ+0.005), 0.030), ((0, -0.14, CZ+0.01), 0.042), ((0, -0.10, CZ+0.015), 0.050), ((0, -0.05, CZ+0.02), 0.062),
         ((0, 0.0, CZ+0.02), 0.064), ((0, 0.05, CZ+0.015), 0.058), ((0, 0.10, CZ+0.0), 0.054), ((0, 0.16, CZ-0.015), 0.050),
         ((0, 0.22, CZ-0.03), 0.042), ((0, 0.28, CZ-0.045), 0.030), ((0, 0.32, CZ-0.055), 0.016)]
ids = [V(p, r) for p, r in spine]
edges += [(ids[i], ids[i+1]) for i in range(len(ids)-1)]
for side in (-1, 1):
    for k, y in enumerate((-0.06, -0.01, 0.04)):
        a = ids[3] if k == 0 else ids[4] if k == 1 else ids[5]
        spread = (-0.05, 0.0, 0.05)[k]
        p1 = V((side*0.05, y, CZ-0.03), 0.010); p2 = V((side*0.12, y+spread, CZ-0.06), 0.008)
        p3 = V((side*0.16, y+spread*1.6, CZ-0.13), 0.006); p4 = V((side*0.17, y+spread*1.9, CZ-0.155), 0.003)
        edges += [(a, p1), (p1, p2), (p2, p3), (p3, p4)]
me = bpy.data.meshes.new("body"); me.from_pydata(verts, edges, []); body = link(bpy.data.objects.new("body", me))
sk = body.modifiers.new("skin", "SKIN")
for i, r in enumerate(radii): body.data.skin_vertices[0].data[i].radius = (r, r*0.92)
body.data.skin_vertices[0].data[ids[4]].use_root = True
body.modifiers.new("sub", "SUBSURF").levels = 1
bpy.context.view_layer.objects.active = body
for m in list(body.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
# lumpy fur on the body
tex = bpy.data.textures.new("lump", "CLOUDS"); tex.noise_scale = 0.012
d = body.modifiers.new("disp", "DISPLACE"); d.texture = tex; d.strength = 0.006; d.mid_level = 0.5
bpy.ops.object.modifier_apply(modifier="disp")

# ---------- fur tufts on thorax and head: little cones along normals ----------
bm = bmesh.new()
for v in body.data.vertices:
    p = v.co
    if -0.15 < p.y < 0.08 and abs(p.x) < 0.075 and p.z > CZ-0.04 and random.random() < 0.8:
        n = (v.normal + Vector((random.uniform(-.5,.5), random.uniform(0,.6), random.uniform(-.3,.3)))).normalized()
        L = random.uniform(0.016, 0.034); w = 0.0035
        t = n.orthogonal().normalized(); b = n.cross(t)
        base = [bm.verts.new(p + (t*math.cos(a) + b*math.sin(a))*w) for a in (0, 2.09, 4.19)]
        tip = bm.verts.new(p + n*L)
        for i in range(3): bm.faces.new((base[i], base[(i+1)%3], tip))
fur = mesh_obj("fur", bm)

# ---------- eyes: glossy black domes ----------
eyes = []
for side in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=18, v_segments=12, radius=0.034)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(side*0.034, -0.15, CZ+0.012)); eyes.append(mesh_obj("eye", bm))

# ---------- feathered antennae, a too-long coiled proboscis ----------
def tube(points, r0, r1, seg=6):
    bm = bmesh.new(); rings = []
    for i, p in enumerate(points):
        p = Vector(p); q = Vector(points[min(i+1, len(points)-1)]) - Vector(points[max(i-1, 0)]); q.normalize()
        t = q.orthogonal().normalized(); b = q.cross(t); r = r0 + (r1-r0)*i/(len(points)-1)
        rings.append([bm.verts.new(p + (t*math.cos(a)+b*math.sin(a))*r) for a in np.linspace(0, 2*math.pi, seg, endpoint=False)])
    for a, b2 in zip(rings, rings[1:]):
        for j in range(seg): bm.faces.new((a[j], a[(j+1)%seg], b2[(j+1)%seg], b2[j]))
    return bm
ants = []
for side in (-1, 1):
    pts = [(side*(0.02+0.11*t), -0.16-0.13*t+0.04*t*t, CZ+0.04+0.16*t-0.05*t*t) for t in np.linspace(0, 1, 14)]
    bm = tube(pts, 0.004, 0.0015, 5)
    for i, p in enumerate(pts[1:-1], 1):  # barbs: the feathering, both sides, longest mid-shaft
        p = Vector(p); fw = (Vector(pts[i+1]) - Vector(pts[i-1])).normalized(); L = 0.035*math.sin(math.pi*i/len(pts)) + 0.008
        for s2 in (-1, 1):
            out = fw.cross(Vector((0, 0, 1))).normalized()*s2 + fw*0.6 + Vector((0, 0, -0.2))
            a1 = bm.verts.new(p); a2 = bm.verts.new(p + fw*0.012); tip = bm.verts.new(p + out.normalized()*L)
            bm.faces.new((a1, a2, tip))
    ants.append(mesh_obj("ant", bm))
ppts = [(0, -0.17-0.30*t, CZ-0.02-0.05*t) for t in np.linspace(0, 1, 16)]
ppts += [(0.02*math.sin(a), -0.47-0.02*math.sin(a)+0.02*(1-math.cos(a))*0, CZ-0.07-0.025*(1-math.cos(a))) for a in np.linspace(0.4, 4.5, 9)]
prob = mesh_obj("prob", tube(ppts, 0.005, 0.0015, 6))

# ---------- wings: shaped grids with camber, UV into one painted atlas ----------
def wing(side, fore):
    NU, NV = 22, 12; bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
    span = 0.56 if fore else 0.40; root = Vector((side*0.045, -0.06 if fore else 0.0, CZ+0.03))
    grid = []
    for i in range(NU+1):
        u = i/NU; row = []
        for j in range(NV+1):
            v = j/NV
            if fore:  # leading edge swept forward, broad falcate tip
                lead = -0.02 - 0.10*u*u; chord = 0.10 + 0.20*math.sin(min(u*1.15, 1)*math.pi*0.5) - 0.14*max(0, u-0.85)/0.15
                sweep = 0.10*u
            else:
                lead = 0.02 + 0.05*u; chord = 0.12 + 0.16*math.sin(u*math.pi*0.75) - 0.12*max(0, u-0.8)/0.2; sweep = 0.10*u
            scallop = 0.008*math.sin(v*math.pi*7) * (u > 0.9)
            x = root.x + side*(span*u + scallop)
            y = root.y + lead + sweep*v + chord*v
            z = root.z + 0.03*u + 0.012*math.sin(v*math.pi) - 0.02*u*u + (0 if fore else -0.006)
            row.append((bm.verts.new((x, y, z)), (u, v)))
        grid.append(row)
    for i in range(NU):
        for j in range(NV):
            q = [grid[i][j], grid[i+1][j], grid[i+1][j+1], grid[i][j+1]]
            f = bm.faces.new([a[0] for a in (q if side > 0 else q[::-1])])
            for lp in f.loops:
                u, v = next(c for vv, c in (a for a in q) if vv == lp.vert)
                lp[uv].uv = ((0.0 if fore else 0.5) + u*0.5, v)
    return mesh_obj(("fw" if fore else "hw") + ("L" if side < 0 else "R"), bm)
wings = {k: wing(s, f) for k, s, f in (("fwL", -1, 1), ("fwR", 1, 1), ("hwL", -1, 0), ("hwR", 1, 0))}

# ---------- paint the wing atlas (2048x1024: fore | hind) ----------
H, W = 1024, 1024
def fbm(h, w, oct=6):
    acc = np.zeros((h, w)); amp = 1
    for o in range(oct):
        s = 2**(o+2); g = np.random.rand(s+1, s+1)
        yi = np.linspace(0, s, h); xi = np.linspace(0, s, w)
        y0 = np.floor(yi).astype(int).clip(0, s-1); x0 = np.floor(xi).astype(int).clip(0, s-1)
        fy = (yi-y0)[:, None]; fx = (xi-x0)[None, :]; fy = fy*fy*(3-2*fy); fx = fx*fx*(3-2*fx)
        a = g[y0][:, x0]; b = g[y0][:, x0+1]; c = g[y0+1][:, x0]; d2 = g[y0+1][:, x0+1]
        acc += amp*((a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d2*fx)*fy); amp *= 0.5
    return acc/acc.max()
def paint(fore):
    v, u = np.mgrid[0:H, 0:W]; u = u/W; v = v/H
    n = fbm(H, W); n2 = fbm(H, W, 4)
    base = np.array([0.36, 0.31, 0.25]); dark = np.array([0.13, 0.11, 0.09]); light = np.array([0.62, 0.57, 0.48])
    col = base[None, None]*(0.7+0.6*n[..., None])
    mott = (n2 > 0.62)[..., None]; col = np.where(mott, col*0.55 + dark*0.2, col)
    # zigzag cross bands
    for b0 in ((0.32, 0.68) if fore else (0.45,)):
        band = np.abs(u - b0 - 0.04*np.sin(v*30) - 0.03*v) < 0.015
        col = np.where(band[..., None], dark[None, None]*1.1, col)
        hl = np.abs(u - b0 - 0.025 - 0.04*np.sin(v*30) - 0.03*v) < 0.008
        col = np.where(hl[..., None], light[None, None], col)
    # veins radiating from root
    for k in range(8):
        vv = 0.08 + k*0.115; vein = np.abs(v - (vv + (0.5-vv)*0.15*(1-u))) < 0.004 + 0.002*(1-u)
        col = np.where(vein[..., None], col*0.6, col)
    # dark scalloped margin with pale crescents
    edge = u > 0.88; col = np.where(edge[..., None], col*0.5, col)
    cres = edge & (np.abs(((v*9) % 1) - 0.5) < 0.18) & (np.abs(u-0.93) < 0.02)
    col = np.where(cres[..., None], light[None, None]*0.9, col)
    # the eye-spot
    cx, cy, R = (0.58, 0.55, 0.13) if fore else (0.52, 0.5, 0.2)
    r = np.sqrt(((u-cx)*1.0)**2 + ((v-cy)*0.55)**2) / R
    ring = [(1.0, [0.08, 0.06, 0.05]), (0.82, [0.52, 0.40, 0.24]), (0.62, [0.06, 0.04, 0.04]), (0.30, [0.05, 0.04, 0.04])]
    for rr, c in ring: col = np.where((r < rr)[..., None], np.array(c)[None, None], col)
    glint = np.sqrt((u-cx+0.02)**2 + ((v-cy+0.03)*0.55)**2)/R < 0.13
    col = np.where(glint[..., None], np.array([0.85, 0.82, 0.74])[None, None], col)
    # dust speckle
    col *= (0.88 + 0.24*np.random.rand(H, W))[..., None]
    return np.clip(col, 0, 1)
atlas = np.concatenate([paint(True), paint(False)], axis=1)
img = bpy.data.images.new("moth_wing", 2*W, H, alpha=False)
px = np.ones((H, 2*W, 4)); px[..., :3] = atlas ** 2.2 * 1.0; img.pixels = px.ravel()
img.filepath_raw = "/tmp/moth/wing.png"; img.file_format = "PNG"; img.save()

def mat(name, color=None, image=None, rough=0.8, metal=0.0, spec=0.5, double=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; bsdf = m.node_tree.nodes["Principled BSDF"]
    if image:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = image; m.node_tree.links.new(t.outputs[0], bsdf.inputs["Base Color"])
    else: bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough; bsdf.inputs["Metallic"].default_value = metal
    m.use_backface_culling = not double; return m
# fur/body texture: banded abdomen painted in object space onto a smart-UV map
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.smart_project(island_margin=0.02); body.data.uv_layers[0].name = "UVMap"; bpy.ops.object.mode_set(mode="OBJECT")
BH = 512; bimg = bpy.data.images.new("moth_body", BH, BH)
bn = fbm(BH, BH); bp = np.ones((BH, BH, 4)); bp[..., 0] = 0.46*(0.6+0.7*bn); bp[..., 1] = 0.40*(0.6+0.7*bn); bp[..., 2] = 0.33*(0.6+0.7*bn)
bimg.pixels = (bp ** [2.2, 2.2, 2.2, 1]).ravel()
# abdomen bands as vertex darkening baked into a second tone: split abdomen faces into the dark/light slots
M_BODY = mat("body", image=bimg, rough=0.95); M_BAND = mat("body_band", color=(0.035, 0.03, 0.025), rough=0.95)
M_EYE = mat("eye", color=(0.004, 0.004, 0.005), rough=0.04, spec=1.0); M_WING = mat("wing", image=img, rough=0.92, double=True)
body.data.materials.append(M_BODY); body.data.materials.append(M_BAND)
for f in body.data.polygons:
    c = f.center
    if c.y > 0.07 and (int((c.y-0.07)/0.035) % 2 == 1): f.material_index = 1
fur.data.materials.append(M_BODY)
for o in eyes: o.data.materials.append(M_EYE); [setattr(p, "use_smooth", True) for p in o.data.polygons]
for o in ants + [prob]: o.data.materials.append(M_BAND); [setattr(p, "use_smooth", True) for p in o.data.polygons]
for o in wings.values(): o.data.materials.append(M_WING); [setattr(p, "use_smooth", True) for p in o.data.polygons]
for p in body.data.polygons: p.use_smooth = True

# ---------- rig ----------
arm = bpy.data.armatures.new("rig"); rig = link(bpy.data.objects.new("DeathmothRig", arm))
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
def B(n, h, t, par=None):
    b = arm.edit_bones.new(n); b.head = h; b.tail = t; b.parent = arm.edit_bones[par] if par else None; return b
B("root", (0, 0, 0), (0, 0, 0.1))
B("thorax", (0, 0.02, CZ+0.02), (0, -0.08, CZ+0.02), "root")
B("head", (0, -0.12, CZ+0.01), (0, -0.17, CZ+0.01), "thorax")
B("abdomen", (0, 0.06, CZ+0.01), (0, 0.32, CZ-0.05), "thorax")
B("prob", (0, -0.17, CZ-0.02), (0, -0.40, CZ-0.06), "head")
for s, n in ((-1, "L"), (1, "R")):
    B("fw"+n, (s*0.045, -0.04, CZ+0.03), (s*0.30, -0.06, CZ+0.05), "thorax")
    B("hw"+n, (s*0.045, 0.02, CZ+0.025), (s*0.25, 0.05, CZ+0.04), "thorax")
    B("ant"+n, (s*0.02, -0.16, CZ+0.04), (s*0.13, -0.25, CZ+0.15), "head")
bpy.ops.object.mode_set(mode="OBJECT")
# vertex groups per part, the body split by Y
def assign(o, g): vg = o.vertex_groups.new(name=g); vg.add(range(len(o.data.vertices)), 1.0, "REPLACE")
for o, g in ((fur, "thorax"), (prob, "prob"), (ants[0], "antL"), (ants[1], "antR"), (eyes[0], "head"), (eyes[1], "head")): assign(o, g)
for k, o in wings.items(): assign(o, k)
gs = {g: body.vertex_groups.new(name=g) for g in ("head", "thorax", "abdomen")}
for v in body.data.vertices:
    y = v.co.y
    wa = min(1, max(0, (y-0.03)/0.06)); wh = min(1, max(0, (-0.10-y)/0.03))
    gs["abdomen"].add([v.index], wa, "REPLACE"); gs["head"].add([v.index], wh, "REPLACE"); gs["thorax"].add([v.index], max(0, 1-wa-wh), "REPLACE")
import bmesh as _bm
for _o in [body, fur, prob] + ants + eyes:
    _b = _bm.new(); _b.from_mesh(_o.data); _bm.ops.remove_doubles(_b, verts=_b.verts, dist=0.0005)
    _bm.ops.recalc_face_normals(_b, faces=_b.faces); _b.to_mesh(_o.data); _b.free()
parts = [body, fur, prob] + ants + eyes + list(wings.values())
bpy.ops.object.select_all(action="DESELECT")
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join(); moth = body; moth.name = "deathmoth"
moth.modifiers.new("arm", "ARMATURE").object = rig; moth.parent = rig

# ---------- clips ----------
sc.render.fps = 30
pbs = rig.pose.bones
for pb in pbs: pb.rotation_mode = "QUATERNION"
def R(name, *turns):  # rotations about WORLD axes, degrees, in the bone's rest frame
    pb = pbs[name]; m = pb.bone.matrix_local.to_3x3().inverted(); q = Quaternion()
    for ax, deg in turns: q = Quaternion(m @ Vector(ax), math.radians(deg)) @ q
    pb.rotation_quaternion = q
def T(name, vec): pb = pbs[name]; pb.location = pb.bone.matrix_local.to_3x3().inverted() @ Vector(vec)
def key(f):
    for pb in pbs: pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
def rest():
    for pb in pbs: pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0)
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
def wings_at(a, sweep=0.0, lag=10):
    R("fwL", (Y, a), (Z, -sweep)); R("fwR", (Y, -a), (Z, sweep))
    R("hwL", (Y, a-lag), (Z, -sweep*0.8)); R("hwR", (Y, -(a-lag)), (Z, sweep*0.8))
actions = {}
def clip(name, frames, fn, loop):
    act = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = act
    for f in frames: rest(); fn(f); key(f)
    actions[name] = act
# Flutter: 12 frames, wings beat hard, body heaves against them, antennae twitch
def flutter(f):
    p = (f % 12)/12*2*math.pi; a = 50*math.sin(p) + 8
    wings_at(a, 4*math.cos(p), 14*math.cos(p))
    T("root", (0, 0, 0.025*math.sin(p+math.pi))); R("thorax", (X, 4*math.sin(p+1)))
    R("abdomen", (X, 8*math.sin(p+2)), (Z, 3*math.sin(p*0.5)))
    R("antL", (X, 6*math.sin(p*2))); R("antR", (X, 6*math.sin(p*2+1))); R("prob", (X, 5*math.sin(p)))
clip("Flutter", range(0, 13, 2), flutter, True)
# Dive: wings swept back and up like a stooping hawk, nose down, proboscis out, tremor
def dive(f):
    t = min(1, f/6); j = math.sin(f*2.1)*3
    wings_at(28*t + j, 38*t); R("thorax", (X, -30*t)); R("abdomen", (X, 18*t)); R("head", (X, -10*t))
    R("prob", (X, 25*t)); R("antL", (Z, 20*t)); R("antR", (Z, -20*t))
clip("Dive", range(0, 19, 2), dive, False)
# Bite: rear up, wings flare wide, then the head and proboscis stab down and forward
def bite(f):
    t = f/15
    up = math.sin(min(1, t/0.4)*math.pi*0.5) if t < 0.4 else 1 - (t-0.4)/0.6
    stab = 0 if t < 0.4 else math.sin((t-0.4)/0.6*math.pi)
    wings_at(70*up - 20*stab, -10*up); R("thorax", (X, 25*up - 35*stab)); R("head", (X, -30*stab))
    R("prob", (X, -20*up + 45*stab)); T("root", (0, -0.15*stab, 0.06*up)); R("abdomen", (X, -15*up + 20*stab))
clip("Bite", range(0, 16, 1), bite, False)
# Death: frantic beats that stall, the body rolls and spins as it falls, wings go limp, it lands on its back
def death(f):
    t = f/48; beat = (1-t)**2
    a = 60*math.sin(f*1.7)*beat + (-35)*t
    wings_at(a, 10*math.sin(f*0.9)*beat, 8)
    R("root", (Z, 720*t*t*0+540*t), (Y, 170*min(1, t*1.4)))
    T("root", (0, 0, 0.12*math.sin(min(1, t*1.2)*math.pi)))
    R("abdomen", (X, 25*math.sin(f*1.3)*beat + 30*t)); R("head", (X, 20*t)); R("prob", (X, 35*t))
    R("antL", (X, -40*t)); R("antR", (X, -40*t))
clip("Death", range(0, 49, 2), death, False)
rig.animation_data.action = None
for n, act in actions.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = n; tr.strips.new(n, int(act.frame_range[0]), act)
# ---------- proof: pose mid-flutter, three views ----------
rig.animation_data.action = actions["Flutter"]; sc.frame_set(2)
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 656
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.23, 0.2, 1)
def cam(name, loc, tgt):
    c = link(bpy.data.objects.new(name, bpy.data.cameras.new(name))); c.location = loc
    c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); c.data.lens = 50; return c
def lamp(loc, e):
    l = link(bpy.data.objects.new("l", bpy.data.lights.new("l", "AREA"))); l.location = loc; l.data.energy = e; l.data.size = 1
    l.rotation_euler = (Vector((0, 0, CZ)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
for loc in ((1, -1.5, 1.5), (-1, 1.5, 1.6), (0, 0, 2.2)): lamp(loc, 60)
for i, (loc) in enumerate(((0.9, -1.1, 0.7), (0, 0.3, 1.6), (-0.5, -0.9, 0.15))):
    sc.camera = cam("c%d" % i, loc, (0, -0.05, CZ)); sc.render.filepath = f"/tmp/moth/p{i}.png"; bpy.ops.render.render(write_still=True)
rig.animation_data.action = None
dg = bpy.context.evaluated_depsgraph_get()
print("TRIS", len(moth.evaluated_get(dg).data.loop_triangles))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT+"/deathmoth.glb", export_apply=False, export_animations=True, export_animation_mode="NLA_TRACKS", export_cameras=False, export_lights=False, use_selection=False)
