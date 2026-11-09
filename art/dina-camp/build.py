# Dina A.'s camp (Level 1). Blender (x, y, z) -> world (x, -y... i.e. world z = -by), camp origin = CAMP.
# open side = +Y (north), wall at y = -1.48. Run: blender -b --factory-startup --python-exit-code 1 --python art/dina-camp/build.py
import bpy, bmesh, math, random, json
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
random.seed(52)
OUT = "/workspace/dina/"; PROOF = "/tmp/dina/"
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene; COL = S.collection
pi = math.pi

M = {}
def mat(name, rgb, rough=0.7, metal=0.0, emit=None, es=1.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.blend_method = "BLEND"
        except Exception: pass
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    M[name] = m; return m
def tmat(name, path, alpha=False, rough=0.85):
    m = mat(name, (1, 1, 1), rough); nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if alpha:
        nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
        try: m.blend_method = "BLEND"
        except Exception: pass
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    return m
mat("tarp", (0.20, 0.22, 0.14), 0.62); mat("nylon", (0.30, 0.32, 0.35), 0.5); mat("nylon_dark", (0.10, 0.11, 0.13), 0.6)
mat("foam", (0.13, 0.20, 0.27), 0.9); mat("concrete", (0.42, 0.41, 0.39), 0.95); mat("steel", (0.42, 0.42, 0.40), 0.5, 0.85)
mat("cord", (0.50, 0.22, 0.07), 0.8); mat("boot", (0.16, 0.10, 0.06), 0.65); mat("rubber", (0.03, 0.03, 0.03), 0.8)
mat("dark", (0.01, 0.01, 0.01), 0.9); mat("canister", (0.33, 0.10, 0.08), 0.5, 0.4); mat("pot", (0.30, 0.30, 0.30), 0.45, 0.8)
mat("bottle", (0.78, 0.84, 0.86), 0.12, 0, alpha=0.45); mat("cap", (0.80, 0.80, 0.76), 0.5); mat("label", (0.72, 0.62, 0.42), 0.7)
mat("blanket", (0.30, 0.10, 0.09), 0.95); mat("canvas", (0.36, 0.32, 0.22), 0.9); mat("leather", (0.22, 0.11, 0.05), 0.6)
mat("brass", (0.62, 0.45, 0.16), 0.35, 0.9); mat("board", (0.24, 0.15, 0.08), 0.75); mat("chrome", (0.6, 0.6, 0.6), 0.3, 0.9)
mat("wood", (0.30, 0.25, 0.19), 0.9); mat("radio", (0.16, 0.20, 0.12), 0.5); mat("radio_face", (0.55, 0.52, 0.44), 0.6)
mat("dial", (0.5, 0.3, 0.08), 0.3, 0, emit=(1.0, 0.55, 0.12), es=2.5); mat("tin", (0.33, 0.31, 0.28), 0.55, 0.8)
mat("glass", (0.10, 0.07, 0.04), 0.25, 0, emit=(1.0, 0.5, 0.12), es=0.5, alpha=0.6); mat("flame", (1, 0.6, 0.2), 0.5, 0, emit=(1.0, 0.55, 0.15), es=6)
mat("diary", (0.27, 0.12, 0.05), 0.6); mat("pages", (0.80, 0.76, 0.62), 0.9); mat("elastic", (0.45, 0.04, 0.04), 0.7); mat("pen", (0.05, 0.08, 0.25), 0.3)
tmat("tally", OUT + "tally.png", alpha=True); tmat("waybill", OUT + "waybill.png")

def act(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
def apply(o):
    act(o)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def smooth(o):
    o.data.polygons.foreach_set("use_smooth", [True] * len(o.data.polygons)); return o
def setm(o, m):
    o.data.materials.clear(); o.data.materials.append(M[m]); return o
def new(name, verts, faces):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); COL.objects.link(o); return o
def join(objs, name):
    root = new(name, [], [])
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    root.select_set(True); bpy.context.view_layer.objects.active = root; bpy.ops.object.join(); return root
def tf(o, loc=(0, 0, 0), rot=(0, 0, 0)):
    o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X") @ o.matrix_world; return o
def sphere(loc, scale, m="nylon", rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1, location=loc, scale=scale, rotation=rot)
    return smooth(setm(bpy.context.object, m))
def rbox(size, loc, m, bevel=0.01, rot=(0, 0, 0), seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, scale=size); o = bpy.context.object
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = seg
    o.modifiers.new("w", "WEIGHTED_NORMAL"); apply(o); smooth(setm(o, m)); return tf(o, loc, rot)
def lathe(prof, m, seg=28, sub=1, loc=(0, 0, 0), rot=(0, 0, 0)):
    vs, fs, rings = [], [], []
    for r, z in prof:
        if r < 1e-6: vs.append((0, 0, z)); rings.append([len(vs) - 1])
        else:
            i0 = len(vs)
            for k in range(seg): a = 2 * pi * k / seg; vs.append((r * math.cos(a), r * math.sin(a), z))
            rings.append(list(range(i0, i0 + seg)))
    for A, B in zip(rings, rings[1:]):
        for k in range(seg):
            k2 = (k + 1) % seg
            if len(A) == 1 and len(B) > 1: fs.append((A[0], B[k2], B[k]))
            elif len(B) == 1 and len(A) > 1: fs.append((A[k], A[k2], B[0]))
            elif len(A) > 1: fs.append((A[k], A[k2], B[k2], B[k]))
    o = new("lathe", vs, fs)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
    if sub: o.modifiers.new("s", "SUBSURF").levels = sub; apply(o)
    smooth(setm(o, m)); return tf(o, loc, rot)
def tube(pts, r, m, ext=0.0, tilt=0.0, res=2):
    cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = "AUTO"; bp.tilt = tilt
    cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = True; cu.resolution_u = 8; cu.extrude = ext
    o = bpy.data.objects.new("tube", cu); COL.objects.link(o); act(o); bpy.ops.object.convert(target="MESH"); o = bpy.context.object
    return smooth(setm(o, m))
def sheet(f, nu, nv, m, thick=0.0, bevel=0.0):
    vs = [tuple(f(i / nu, j / nv)) for j in range(nv + 1) for i in range(nu + 1)]
    fs = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    o = new("sheet", vs, fs)
    if o.data.polygons[0].normal.z < 0: o.data.flip_normals()
    if thick:
        s = o.modifiers.new("s", "SOLIDIFY"); s.thickness = thick; s.offset = -1
        if bevel: b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 2; b.limit_method = "ANGLE"
        apply(o)
    return smooth(setm(o, m))
def plate(w, h, r, th, m, loc=(0, 0, 0), rot=(0, 0, 0), bevel=None):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, pi / 2), (-w / 2 + r, -h / 2 + r, pi), (w / 2 - r, -h / 2 + r, 1.5 * pi)):
        for k in range(6): a = a0 + pi / 2 * k / 5; pts.append((cx + r * math.cos(a), cy + r * math.sin(a), 0))
    o = new("plate", pts, [list(range(len(pts)))])
    s = o.modifiers.new("s", "SOLIDIFY"); s.thickness = th; s.offset = 1
    b = o.modifiers.new("b", "BEVEL"); b.width = bevel if bevel else th * 0.3; b.segments = 2; b.limit_method = "ANGLE"
    o.modifiers.new("w", "WEIGHTED_NORMAL"); apply(o); smooth(setm(o, m)); return tf(o, loc, rot)
def blob(parts, name, m, voxel=0.012, it=10, floor=None, dec=None):
    o = join(parts, name)
    r = o.modifiers.new("r", "REMESH"); r.mode = "VOXEL"; r.voxel_size = voxel
    s = o.modifiers.new("s", "SMOOTH"); s.factor = 0.5; s.iterations = it; apply(o)
    if floor is not None:
        for v in o.data.vertices:
            if v.co.z < floor + 0.012: v.co.z = floor
    if dec: o.modifiers.new("d", "DECIMATE").ratio = dec; apply(o)
    return smooth(setm(o, m))
def chunk(loc, size, seed):
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1); o = bpy.context.object
    planes = []
    for _ in range(6):
        n = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized(); planes.append((n, rnd.uniform(0.5, 0.8)))
    for v in o.data.vertices:
        c = v.co * (1 + 0.14 * noise.noise(v.co * 1.7 + Vector((seed, 0, 0))))
        for n, d in planes:
            e = c.dot(n) - d
            if e > 0: c -= n * e * 0.92
        c.z = max(c.z, -0.55)
        v.co = Vector((c.x * size[0], c.y * size[1], (c.z + 0.55) * size[2]))
    s = o.modifiers.new("s", "SMOOTH"); s.factor = 0.5; s.iterations = 2; apply(o)
    smooth(setm(o, "concrete")); return tf(o, loc, (0, 0, rnd.uniform(0, 6.28)))
def finish(objs, name, freq=6.0, amp=0.22):
    o = join(objs, name); me = o.data
    uv = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap"); me.uv_layers.active = uv
    keep = {i for i, ms in enumerate(me.materials) if ms and ms.name in ("tally", "waybill")}
    for p in me.polygons:
        if p.material_index in keep: continue
        n = p.normal; a = max(range(3), key=lambda i: abs(n[i]))
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (c.y, c.z) if a == 0 else (c.x, c.z) if a == 1 else (c.x, c.y)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i, v in enumerate(me.vertices):
        n1 = noise.noise(v.co * freq) * 0.5 + 0.5; n2 = noise.noise(v.co * freq * 4.3 + Vector((7, 3, 1))) * 0.5 + 0.5
        c = 1 - amp * (0.65 * n1 + 0.35 * n2)
        if v.co.z < 0.04: c *= 0.8 + 0.2 * max(v.co.z, 0) / 0.04
        ca.data[i].color = (c, c, c, 1)
    me.color_attributes.active_color = ca
    return o
def export(o, fn):
    act(o); kw = dict(filepath=OUT + fn, use_selection=True, export_apply=True)
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE")
    except TypeError: bpy.ops.export_scene.gltf(**kw)

INFO = {}
# ================= CAMP =================
def build_camp():
    P = []
    WALL = -1.47
    # foam mat
    def fmat(u, v):
        x = -0.85 + 1.85 * u; y = -0.40 + 0.66 * v
        return Vector((x, y, 0.03 + 0.035 * max(0, (x - 0.82) / 0.18) ** 2 * (0.4 + v)))
    P.append(sheet(fmat, 30, 10, "foam", 0.03, 0.008))
    # the sleeper, zipped in: on her side, knees drawn north
    E = [((-0.70, -0.10, 0.15), (0.17, 0.15, 0.13)), ((-0.80, -0.11, 0.11), (0.10, 0.12, 0.09)), ((-0.56, -0.11, 0.12), (0.12, 0.13, 0.10)),
         ((-0.40, -0.13, 0.19), (0.17, 0.17, 0.18)), ((-0.30, -0.02, 0.19), (0.16, 0.09, 0.10)), ((-0.22, -0.13, 0.16), (0.20, 0.17, 0.15)),
         ((-0.02, -0.12, 0.13), (0.18, 0.15, 0.115)), ((0.17, -0.14, 0.18), (0.19, 0.18, 0.175)), ((0.28, -0.04, 0.15), (0.17, 0.13, 0.13)),
         ((0.37, 0.05, 0.14), (0.14, 0.13, 0.125)), ((0.45, 0.13, 0.135), (0.12, 0.12, 0.12)), ((0.56, 0.07, 0.11), (0.13, 0.11, 0.10)),
         ((0.68, 0.00, 0.10), (0.13, 0.10, 0.09)), ((0.82, -0.06, 0.12), (0.11, 0.12, 0.115)), ((0.90, -0.06, 0.10), (0.07, 0.11, 0.09)),
         ((0.05, -0.07, 0.07), (0.90, 0.24, 0.07))]
    bag = blob([sphere(l, s) for l, s in E], "bag", "nylon", 0.012, 22, floor=0.03)
    for v in bag.data.vertices:  # baffle seams + cloth rumple
        if v.co.z > 0.04:
            g = (v.co.x + 0.5) / 0.135; dgr = abs(g - round(g)) * 0.135
            v.co += v.normal * (-0.009 * math.exp(-(dgr / 0.016) ** 2) + 0.007 * noise.noise(v.co * 14))
    bag.modifiers.new("d", "DECIMATE").ratio = 0.5; apply(bag); smooth(bag)
    bvh = BVHTree.FromObject(bag, bpy.context.evaluated_depsgraph_get())
    best = None
    for i in range(24):
        for j in range(16):
            x = -0.12 + 0.36 * i / 23; y = -0.22 + 0.2 * j / 15
            h = bvh.ray_cast(Vector((x, y, 1)), Vector((0, 0, -1)))
            if h[0] and (best is None or h[1].z + 0.3 * h[0].z > best[2]): best = (h[0], h[1], h[1].z + 0.3 * h[0].z)
    INFO["diary"] = {"pos": list(best[0]), "normal": list(best[1])}
    P.append(bag)
    b = bpy.ops.mesh.primitive_torus_add(major_radius=0.04, minor_radius=0.013, location=(-0.70, 0.035, 0.15), rotation=(pi / 2, 0, 0)); P.append(smooth(setm(bpy.context.object, "nylon_dark")))
    P.append(sphere((-0.70, 0.025, 0.15), (0.034, 0.02, 0.034), "nylon"))
    P.append(tube([(-0.70, 0.045, 0.115), (-0.69, 0.10, 0.07), (-0.66, 0.16, 0.036), (-0.60, 0.20, 0.034)], 0.003, "cord"))
    # boots, neatly side by side north of the mat, toes west
    def boot(loc, yaw):
        E = [((0, 0.02, 0.05), (0.05, 0.13, 0.045)), ((0, 0.10, 0.05), (0.052, 0.06, 0.048)), ((0, -0.08, 0.06), (0.045, 0.05, 0.055)),
             ((0, -0.07, 0.12), (0.047, 0.055, 0.07)), ((0, -0.075, 0.19), (0.05, 0.058, 0.07)), ((0, -0.02, 0.15), (0.035, 0.03, 0.07))]
        up = blob([sphere(l, s) for l, s in E], "boot", "boot", 0.006, 6)
        for v in up.data.vertices:
            if v.co.z > 0.235: v.co.z = 0.235 + (v.co.z - 0.235) * 0.1
            v.co += v.normal * 0.003 * noise.noise(v.co * 40)
        sole = blob([sphere((0, 0.012, 0.012), (0.056, 0.152, 0.018)), sphere((0, -0.085, 0.012), (0.05, 0.06, 0.02))], "sole", "rubber", 0.006, 3, floor=0.0)
        parts = [up, sole, sphere((0, -0.075, 0.237), (0.04, 0.047, 0.008), "dark")]
        for k in range(4):
            y = 0.045 - k * 0.028; z = 0.085 + k * 0.022
            parts.append(tube([(-0.03, y, z - 0.012), (0, y + 0.004, z + 0.01), (0.03, y, z - 0.012)], 0.0022, "cord"))
        o = join(parts, "bootj"); return tf(o, loc, (0, 0, yaw))
    P.append(boot((0.58, 0.42, 0), pi / 2 + 0.08)); P.append(boot((0.59, 0.545, 0), pi / 2 - 0.05))
    # stove and dented pot
    sx, sy = 1.0, 0.44
    P.append(lathe([(0, 0), (0.05, 0), (0.055, 0.008), (0.055, 0.075), (0.045, 0.092), (0.018, 0.1), (0.018, 0.112), (0, 0.112)], "canister", loc=(sx, sy, 0)))
    P.append(lathe([(0, 0.11), (0.012, 0.11), (0.012, 0.14), (0.03, 0.15), (0.032, 0.16), (0, 0.16)], "tin", loc=(sx, sy, 0)))
    for k in range(3):
        a = k * 2 * pi / 3 + 0.4; c, s = math.cos(a), math.sin(a)
        P.append(tube([(sx + 0.015 * c, sy + 0.015 * s, 0.145), (sx + 0.06 * c, sy + 0.06 * s, 0.158), (sx + 0.078 * c, sy + 0.078 * s, 0.168)], 0.004, "tin"))
    P.append(tube([(sx, sy, 0.125), (sx + 0.03, sy + 0.03, 0.125), (sx + 0.045, sy + 0.045, 0.125)], 0.005, "dark"))
    pot = lathe([(0, 0), (0.07, 0), (0.078, 0.008), (0.08, 0.09), (0.082, 0.094), (0.077, 0.094), (0.075, 0.012), (0.068, 0.005), (0, 0.005)], "pot", seg=32)
    for cen, rad, dep in ((Vector((0.08, 0.01, 0.045)), 0.05, 0.016), (Vector((-0.05, 0.062, 0.07)), 0.04, 0.012), (Vector((-0.03, -0.074, 0.03)), 0.035, 0.01)):
        dirn = Vector((-cen.x, -cen.y, 0)).normalized()
        for v in pot.data.vertices:
            d = (v.co - cen).length
            if d < rad: v.co += dirn * dep * (1 - (d / rad) ** 2) ** 2
    tf(pot, (sx + 0.004, sy - 0.003, 0.169), (0.05, 0.03, 0.7)); P.append(pot)
    P.append(tube([(sx + 0.08, sy + 0.02, 0.25), (sx + 0.13, sy + 0.05, 0.262), (sx + 0.19, sy + 0.08, 0.255)], 0.004, "tin"))
    # three empty almond-water bottles in a row
    for k in range(3):
        bx = 0.0 + 0.115 * k; by = 0.47 + 0.004 * k
        P.append(lathe([(0, 0), (0.028, 0), (0.032, 0.006), (0.032, 0.06), (0.029, 0.07), (0.032, 0.08), (0.032, 0.13), (0.026, 0.155), (0.013, 0.175), (0.013, 0.19), (0, 0.19)], "bottle", seg=20, loc=(bx, by, 0)))
        P.append(lathe([(0, 0.186), (0.0155, 0.186), (0.0155, 0.203), (0, 0.203)], "cap", seg=16, loc=(bx, by, 0)))
        P.append(lathe([(0.0328, 0.084), (0.0332, 0.105), (0.0328, 0.126)], "label", seg=20, sub=0, loc=(bx, by, 0)))
    # rolled spare blanket
    roll = lathe([(0, -0.24), (0.05, -0.245), (0.082, -0.225), (0.09, -0.08), (0.088, 0.08), (0.082, 0.225), (0.05, 0.245), (0, 0.24)], "blanket", seg=32, sub=2)
    for v in roll.data.vertices: v.co += v.normal * 0.008 * noise.noise(v.co * 11)
    tf(roll, (0, 0, 0), (0, pi / 2, 0)); roll.scale = (1, 1, 0.86); tf(roll, (-0.38, 0.47, 0.077), (0, 0, 0.12)); P.append(roll)
    for dx in (-0.13, 0.13):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.089, minor_radius=0.005, rotation=(0, pi / 2, 0)); t = smooth(setm(bpy.context.object, "cord"))
        t.scale = (1, 1, 0.86); tf(t, (-0.38 + dx, 0.47 + dx * 0.12, 0.077), (0, 0, 0.12)); P.append(t)
    # tarp lean-to
    ridge = lambda u: 1.5 - 0.13 * (1 - (2 * u - 1) ** 2)
    def tarp(u, v):
        x = (-1.36 + 2.72 * u)
        if v < 0.07:
            s = (0.07 - v) / 0.07; return Vector((x, 0.72 + 0.03 * s + 0.02 * s * math.sin(u * 23), ridge(u) - 0.15 * s))
        t = (v - 0.07) / 0.93; x *= 1 - 0.03 * math.sin(pi * t)
        y = 0.72 - 2.15 * t
        z = ridge(u) * (1 - t) + 0.03 * t - 0.15 * math.sin(pi * t) * (0.5 + 0.5 * math.sin(pi * u))
        z += 0.03 * noise.noise(Vector((x * 2.3, t * 6, 3.1))) * min(1, t * 4) + 0.012 * math.sin(u * 40 + t * 3) * min(1, t * 5) * (1 - t)
        return Vector((x, y, max(z, 0.012 + 0.01 * (noise.noise(Vector((x * 5, y * 5, 0))) + 1))))
    P.append(sheet(tarp, 56, 44, "tarp"))
    for sx_ in (-1, 1):
        P.append(tube([(sx_ * 1.33, 0.76, 0), (sx_ * 1.338, 0.755, 0.5), (sx_ * 1.295, 0.735, 1.0), (sx_ * 1.33, 0.75, 1.58)], 0.024, "steel", res=4))
        P.append(lathe([(0.027, -0.03), (0.034, -0.025), (0.034, 0.025), (0.027, 0.03)], "steel", seg=16, loc=(sx_ * 1.318, 0.745, 1.3)))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.007, location=(sx_ * 1.328, 0.75, 1.5)); P.append(smooth(setm(bpy.context.object, "cord")))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.007, location=(sx_ * 1.327, 0.75, 1.485)); P.append(smooth(setm(bpy.context.object, "cord")))
        P.append(tube([(sx_ * 1.33, 0.76, 1.5), (sx_ * 1.30, 1.15, 0.74), (sx_ * 1.26, 1.52, 0.09)], 0.004, "cord"))
        P.append(chunk((sx_ * 1.24, 1.55, 0), (0.12, 0.10, 0.085), 3 + sx_))
        P.append(chunk((sx_ * 1.26, 0.86, 0), (0.10, 0.09, 0.08), 7 + sx_)); P.append(chunk((sx_ * 1.22, 0.66, 0), (0.09, 0.11, 0.07), 11 + sx_))
    P.append(tube([(-1.33 + 2.66 * k / 8, 0.722, ridge(k / 8) - 0.004) for k in range(9)], 0.004, "cord"))
    for k, (x, s) in enumerate(((-1.05, 0.11), (-0.35, 0.09), (0.3, 0.12), (1.0, 0.10))):
        P.append(chunk((x, -1.27 + 0.03 * (k % 2), 0.012), (s, s * 0.85, s * 0.75), 20 + k))
    # 41 chalk tallies on the wall above the tarp's foot
    x0, x1, z0, z1 = 1.05, -0.15, 1.42, 1.92
    t = new("tally", [(x0, WALL, z0), (x1, WALL, z0), (x1, WALL, z1), (x0, WALL, z1)], [(0, 1, 2, 3)])
    uv = t.data.uv_layers.new(name="UVMap")
    for li, c in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = c
    P.append(setm(t, "tally"))
    return finish(P, "dina-camp")

# ================= SATCHEL + CLIPBOARD =================
def build_satchel():
    P = []
    body = rbox((0.38, 0.28, 0.10), (0, 0, 0.05), "canvas", 0.03)
    bag = blob([body, sphere((-0.08, -0.03, 0.06), (0.09, 0.08, 0.05), "canvas"), sphere((0.1, 0.02, 0.05), (0.07, 0.09, 0.05), "canvas")], "sat", "canvas", 0.008, 8, floor=0.0)
    for v in bag.data.vertices:
        r2 = (v.co.x / 0.15) ** 2 + ((v.co.y + 0.02) / 0.1) ** 2
        if v.co.z > 0.02: v.co.z = 0.02 + (v.co.z - 0.02) * (1 - 0.45 * math.exp(-r2)); v.co += v.normal * 0.004 * noise.noise(v.co * 25)
    P.append(bag)
    P.append(sphere((0, 0.132, 0.045), (0.155, 0.03, 0.03), "dark"))  # gaping empty mouth
    P.append(tube([(-0.175, 0.135, 0.05), (-0.09, 0.15, 0.082), (0.02, 0.155, 0.09), (0.11, 0.15, 0.08), (0.175, 0.135, 0.05)], 0.007, "canvas"))
    def flap(u, v):
        x = (-0.18 + 0.36 * u) * (1 - 0.12 * v ** 4); y = 0.13 + 0.29 * v
        return Vector((x, y, 0.012 + 0.03 * (1 - v) ** 2 + 0.012 * math.sin(pi * v) * math.sin(u * 7 + 1) + 0.004 * noise.noise(Vector((x * 20, y * 20, 0)))))
    P.append(sheet(flap, 14, 14, "canvas", 0.006, 0.002))
    P.append(tube([(0, 0.27, 0.021), (0.005, 0.36, 0.017), (0.0, 0.47, 0.009)], 0.0025, "leather", ext=0.014, tilt=pi / 2))  # buckle tab
    bpy.ops.mesh.primitive_torus_add(major_radius=0.02, minor_radius=0.0035, location=(0, 0.04, 0.062), rotation=(0.15, 0, 0)); o = smooth(setm(bpy.context.object, "brass")); o.scale = (1.25, 0.9, 1); P.append(o)
    P.append(tube([(0, 0.022, 0.064), (0, 0.06, 0.066)], 0.0025, "brass"))
    P.append(tube([(0, -0.02, 0.07), (0, 0.022, 0.064)], 0.0025, "leather", ext=0.012, tilt=pi / 2))
    strap = [(-0.185, -0.02, 0.05), (-0.25, 0.08, 0.012), (-0.28, 0.28, 0.008), (-0.17, 0.47, 0.008), (0.07, 0.50, 0.008), (0.25, 0.38, 0.008), (0.29, 0.2, 0.008)]
    P.append(tube(strap, 0.003, "leather", ext=0.018, tilt=pi / 2))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.018, minor_radius=0.0035, location=(0.293, 0.18, 0.006)); o = smooth(setm(bpy.context.object, "brass")); o.scale = (1.2, 1, 1); P.append(o)
    # clipboard with the waybill, north of the satchel
    C = []
    C.append(plate(0.235, 0.33, 0.012, 0.005, "board"))
    paper = plate(0.21, 0.297, 0.002, 0.0012, "waybill", loc=(0.0, 0.004, 0.0052), rot=(0, 0, 0.03))
    uv = paper.data.uv_layers.new(name="UVMap"); mw = paper.matrix_world
    for l in paper.data.loops:
        c = paper.data.vertices[l.vertex_index].co; uv.data[l.index].uv = ((0.105 - c.x) / 0.21, (0.1485 - c.y) / 0.297)
    C.append(paper)
    C.append(rbox((0.10, 0.032, 0.012), (0, -0.142, 0.012), "chrome", 0.005))
    C.append(tube([(-0.04, -0.158, 0.014), (0.04, -0.158, 0.014)], 0.006, "chrome"))
    cb = join(C, "clip"); tf(cb, (-0.03, 0.74, 0.0), (0, 0, 0.2)); P.append(cb)
    return finish(P, "dina-satchel", 14, 0.25)

# ================= RADIO ON CRATE =================
def build_radio():
    P = []; rnd = random.Random(9); j = lambda a: rnd.uniform(-a, a)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1): P.append(rbox((0.032, 0.032, 0.238), (sx_ * 0.17, sy_ * 0.12, 0.119), "wood", 0.009, (j(0.02), j(0.02), j(0.1))))
        for z in (0.065, 0.165):
            P.append(rbox((0.39, 0.013, 0.062), (j(0.004), sx_ * 0.138, z), "wood", 0.005, (j(0.03), 0, j(0.012))))
            P.append(rbox((0.013, 0.262, 0.062), (sx_ * 0.19, j(0.004), z), "wood", 0.005, (0, j(0.03), j(0.012))))
    for k, y in enumerate((-0.108, -0.036, 0.036, 0.108)):
        L = 0.40 if k != 1 else 0.27
        P.append(rbox((L, 0.064, 0.013), ((0.40 - L) / 2 * -1 + j(0.004), y, 0.244 + j(0.002)), "wood", 0.005, (j(0.02), 0, j(0.025))))
    z0 = 0.2515; R = []
    R.append(rbox((0.15, 0.056, 0.086), (0, 0, 0.043), "radio", 0.02, seg=5))
    R.append(plate(0.128, 0.064, 0.012, 0.004, "radio_face", loc=(0, 0.027, 0.043), rot=(pi / 2, 0, pi)))
    R.append(lathe([(0, 0.0), (0.024, 0.0), (0.027, 0.004), (0.02, 0.007), (0, 0.008)], "dark", seg=20, loc=(-0.03, 0.03, 0.045), rot=(-pi / 2, 0, 0)))
    R.append(plate(0.046, 0.022, 0.005, 0.003, "dial", loc=(0.035, 0.0305, 0.057), rot=(pi / 2, 0, pi)))
    R.append(lathe([(0, 0), (0.009, 0), (0.009, 0.008), (0.006, 0.01), (0, 0.01)], "dark", seg=14, loc=(0.035, 0.031, 0.027), rot=(-pi / 2, 0, 0)))
    R.append(tube([(0.07, 0, 0.045), (0.092, 0, 0.045), (0.094, 0.02, 0.03), (0.094, 0.04, 0.018)], 0.004, "tin"))
    R.append(sphere((0.102, 0.042, 0.017), (0.011, 0.009, 0.009), "dark"))
    R.append(tube([(-0.055, -0.012, 0.08), (-0.055, -0.012, 0.16)], 0.0035, "chrome"))
    R.append(tube([(-0.055, -0.012, 0.155), (-0.056, -0.012, 0.225), (-0.035, -0.008, 0.275), (0.005, 0.0, 0.33)], 0.002, "chrome"))
    R.append(sphere((0.005, 0.0, 0.332), (0.004, 0.004, 0.004), "chrome"))
    R.append(tube([(-0.02, 0, 0.083), (-0.01, 0, 0.105), (0.04, 0, 0.105), (0.05, 0, 0.083)], 0.004, "dark"))
    r = join(R, "rad"); tf(r, (0.02, 0.01, z0), (0, 0, -0.3)); P.append(r)
    return finish(P, "dina-radio", 12, 0.25)

# ================= STORM LANTERN =================
def build_lantern():
    P = []
    P.append(lathe([(0, 0), (0.07, 0), (0.078, 0.008), (0.078, 0.035), (0.06, 0.055), (0.035, 0.06), (0, 0.06)], "tin"))
    P.append(lathe([(0.03, 0.056), (0.04, 0.068), (0.04, 0.085), (0.047, 0.09), (0.04, 0.094)], "tin", sub=1))
    P.append(lathe([(0.04, 0.09), (0.058, 0.12), (0.062, 0.15), (0.05, 0.19), (0.038, 0.206)], "glass", sub=2))
    P.append(sphere((0, 0, 0.102), (0.007, 0.007, 0.012), "flame"))
    P.append(lathe([(0.012, 0.085), (0.012, 0.096), (0, 0.097)], "tin", seg=12))
    P.append(lathe([(0.037, 0.204), (0.046, 0.21), (0.046, 0.225), (0.03, 0.24), (0.03, 0.265), (0.037, 0.27), (0.02, 0.285), (0, 0.287)], "tin"))
    for s in (-1, 1):
        P.append(tube([(s * 0.068, 0, 0.045), (s * 0.086, 0, 0.1), (s * 0.086, 0, 0.2), (s * 0.062, 0, 0.25), (s * 0.03, 0, 0.262)], 0.006, "tin", res=3))
    P.append(tube([(0.088, 0, 0.215), (0.07, 0.07, 0.25), (0, 0.115, 0.265), (-0.07, 0.07, 0.25), (-0.088, 0, 0.215)], 0.0025, "tin"))
    P.append(tube([(0.035, 0.03, 0.075), (0.06, 0.05, 0.075)], 0.0025, "tin")); P.append(sphere((0.064, 0.053, 0.075), (0.008, 0.008, 0.008), "tin"))
    return finish(P, "dina-lantern", 25, 0.35)

# ================= DIARY =================
def build_diary():
    P = []
    P.append(plate(0.10, 0.14, 0.008, 0.0035, "diary"))
    P.append(plate(0.10, 0.14, 0.008, 0.0035, "diary", loc=(0, 0, 0.0215)))
    P.append(plate(0.093, 0.134, 0.004, 0.018, "pages", loc=(0.001, 0, 0.0035), bevel=0.001))
    P.append(rbox((0.007, 0.14, 0.025), (-0.0475, 0, 0.0125), "diary", 0.003))
    P.append(rbox((0.007, 0.1425, 0.0265), (0.028, 0, 0.0125), "elastic", 0.0012))
    P.append(tube([(0.056, -0.066, 0.02), (0.056, 0.058, 0.02)], 0.0045, "pen", res=3))
    P.append(tube([(0.056, 0.058, 0.02), (0.056, 0.07, 0.02)], 0.002, "chrome"))
    P.append(tube([(0.056, -0.06, 0.0245), (0.046, -0.06, 0.0262), (0.03, -0.06, 0.0258)], 0.0012, "chrome", ext=0.003, tilt=0))
    return finish(P, "dina-diary", 60, 0.35)

camp = build_camp(); sat = build_satchel(); rad = build_radio(); lan = build_lantern(); dia = build_diary()
dp = INFO["diary"]["pos"]
PLACE = {"dina-satchel": (-1.05, -0.2, 0), "dina-radio": (-0.75, 1.2, 0), "dina-lantern": (1.17, -0.1, 0), "dina-diary": (dp[0], dp[1], dp[2] - 0.004)}
objs = {"dina-camp": camp, "dina-satchel": sat, "dina-radio": rad, "dina-lantern": lan, "dina-diary": dia}
dg = bpy.context.evaluated_depsgraph_get()
for n, o in objs.items():
    o.location = (0, 0, 0); export(o, n + ".glb"); me = o.data; me.calc_loop_triangles()
    xs = [v.co for v in me.vertices]
    INFO[n] = {"tris": len(me.loop_triangles), "min": [round(min(c[i] for c in xs), 3) for i in range(3)], "max": [round(max(c[i] for c in xs), 3) for i in range(3)], "place_bl": PLACE.get(n, (0, 0, 0))}
json.dump(INFO, open(OUT + "info.json", "w"), indent=1); print(json.dumps(INFO))

# ---------- proof ----------
for n, p in PLACE.items(): objs[n].location = p
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 1, 0)); setm(bpy.context.object, "concrete")
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, -1.48, 2), rotation=(pi / 2, 0, 0)); mat("wallp", (0.6, 0.56, 0.45), 0.9); setm(bpy.context.object, "wallp")
ld = bpy.data.lights.new("l", "POINT"); ld.energy = 12; ld.color = (1, 0.6, 0.25); l = bpy.data.objects.new("l", ld); l.location = (1.17, -0.1, 0.35); COL.objects.link(l)
fd = bpy.data.lights.new("f", "AREA"); fd.energy = 260; fd.size = 4; f = bpy.data.objects.new("f", fd); f.location = (0.5, 4, 3); f.rotation_euler = (math.radians(55), 0, math.radians(170)); COL.objects.link(f)
S.world = bpy.data.worlds.new("w"); S.world.use_nodes = True; S.world.node_tree.nodes["Background"].inputs[1].default_value = 0.12
S.render.engine = "CYCLES"; S.cycles.samples = 14; S.render.resolution_x = S.render.resolution_y = 656
cd = bpy.data.cameras.new("cam"); cd.lens = 28; cam = bpy.data.objects.new("cam", cd); COL.objects.link(cam); S.camera = cam
for name, loc, tgt in (("a", (0, 4.0, 1.6), (0, 0, 0.4)), ("b", (0.3, 1.5, 0.95), (0.05, -0.1, 0.15)), ("c", (-1.0, 2.3, 0.9), (-0.95, 0.6, 0.1)), ("d", (0.9, 1.4, 0.6), (0.85, 0.2, 0.1)), ("e", (dp[0] + 0.1, dp[1] + 0.35, dp[2] + 0.2), (dp[0], dp[1], dp[2])), ("f", (-2.6, 2.2, 1.3), (0, -0.2, 0.5))):
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    S.render.filepath = PROOF + name + ".png"; bpy.ops.render.render(write_still=True)
