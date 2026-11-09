# Level 0 props: safe-room folding table, camp cot, floor lamp, cardboard box, stairs to nowhere.
# Blender -Y front = glTF +Z. Origin at bottom centre. Run: blender -b --factory-startup --python-exit-code 1 --python art/level0/build.py
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
OUT = "/workspace/level0"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/level0", exist_ok=True)
random.seed(7)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
def obj(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m); return o
def cube(name, m, sx, sy, sz, loc, bev=0.0, seg=2):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x*sx, v.co.y*sy, v.co.z*sz)) + Vector(loc)
    o = obj(name, bm, m)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    return o
def tube(name, m, pts, r, res=10):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o); o.data.materials.append(m)
    return o
def cyl(name, m, r1, r2, h, loc, verts=24, bev=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co += Vector(loc) + Vector((0, 0, h/2))
    o = obj(name, bm, m)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = 2; md.limit_method = "ANGLE"
    return o
def finish(name, uvscale=1.0, smooth=True):
    bpy.ops.object.select_all(action="DESELECT")
    for o in list(bpy.context.scene.objects):
        if o.type == "CURVE":
            bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target="MESH"); o.select_set(False)
    for o in bpy.context.scene.objects:
        if o.type != "MESH": continue
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
        # box-project UVs in metres
        bm = bmesh.new(); bm.from_mesh(o.data); uv = bm.loops.layers.uv.verify(); mw = o.matrix_world
        for f in bm.faces:
            n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
            for l in f.loops:
                p = mw @ l.vert.co; a, b = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][ax]
                l[uv].uv = (a / uvscale, b / uvscale)
        bm.to_mesh(o.data); bm.free()
        if smooth:
            o.data.shade_smooth_by_angle(angle=math.radians(35)) if hasattr(o.data, "shade_smooth_by_angle") else None
    bpy.ops.object.select_all(action="SELECT")
    dg = bpy.context.evaluated_depsgraph_get()
    tris = sum(len(o.evaluated_get(dg).data.loop_triangles) for o in bpy.context.scene.objects if o.type == "MESH")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, use_selection=True)
    print("EXPORT", name, "tris", tris)
def proof(name, dist, h, look=(0, 0, 0.5)):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 500
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.48, 0.4, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    sun = bpy.data.lights.new("s", "SUN"); sun.energy = 3; so = bpy.data.objects.new("s", sun); sc.collection.objects.link(so); so.rotation_euler = (0.7, 0.2, 0.8)
    for i, ang in enumerate((-0.6, 2.4)):
        cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); sc.collection.objects.link(co)
        co.location = (math.sin(ang)*-dist, -math.cos(ang)*dist, h); d = Vector(look) - co.location
        co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); sc.camera = co
        sc.render.filepath = f"/tmp/level0/{name}_{i}.png"; bpy.ops.render.render(write_still=True)

# ---------- folding banquet table 1.8 x 0.75, top at 0.74 ----------
reset()
lam = mat("laminate", (0.78, 0.74, 0.64), 0.45); edge = mat("tmolding", (0.08, 0.07, 0.06), 0.5); steel = mat("steel", (0.12, 0.12, 0.13), 0.45, 0.8)
cube("top", lam, 1.8, 0.75, 0.03, (0, 0, 0.725), bev=0.004)
cube("band", edge, 1.806, 0.756, 0.022, (0, 0, 0.722), bev=0.006, seg=3)
for y in (-0.33, 0.33): cube("apron", steel, 1.6, 0.025, 0.04, (0, y, 0.69), bev=0.004)
for x in (-0.72, 0.72):
    tube("leg", steel, [(x, -0.3, 0.012), (x, -0.3, 0.69), (x, 0.3, 0.69), (x, 0.3, 0.012)], 0.013)
    tube("brace", steel, [(x, -0.3, 0.18), (x, 0.3, 0.18)], 0.008)
    tube("fold", steel, [(x, 0.0, 0.18), (x*0.55, 0.0, 0.68)], 0.008)
    for y in (-0.3, 0.3): cyl("foot", mat("rubber", (0.03, 0.03, 0.03), 0.9), 0.016, 0.014, 0.014, (x, y, 0))
proof("table", 3.2, 2.0); finish("table")

# ---------- camp cot 0.75 x 1.95, bed at 0.4 ----------
reset()
alu = mat("aluminum", (0.55, 0.56, 0.55), 0.35, 0.9); canvas = mat("canvas", (0.24, 0.27, 0.16), 0.95); cotton = mat("pillow", (0.82, 0.8, 0.74), 0.9); wool = mat("blanket", (0.32, 0.12, 0.09), 1.0)
for x in (-0.36, 0.36): tube("rail", alu, [(x, -0.98, 0.4), (x, 0.98, 0.4)], 0.016)
for y in (-0.98, 0.98): tube("end", alu, [(-0.36, y, 0.4), (0.36, y, 0.4)], 0.012)
for y in (-0.8, 0.0, 0.8):  # X legs seen from the end
    tube("xa", alu, [(-0.36, y, 0.4), (0.3, y, 0.0)], 0.011); tube("xb", alu, [(0.36, y, 0.4), (-0.3, y, 0.0)], 0.011)
    tube("foot", alu, [(-0.36, y - 0.04, 0.012), (-0.28, y + 0.04, 0.012)], 0.012); tube("foot", alu, [(0.28, y - 0.04, 0.012), (0.36, y + 0.04, 0.012)], 0.012)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=12, y_segments=30, size=1)
for v in bm.verts:
    x, y = v.co.x * 0.36, v.co.y * 0.97; s = (1 - (x / 0.36) ** 2) * 0.05 + (1 - (y / 0.97) ** 2) * 0.02
    v.co = Vector((x, y, 0.405 - s + random.uniform(-0.003, 0.003)))
c = obj("canvas", bm, canvas); md = c.modifiers.new("t", "SOLIDIFY"); md.thickness = 0.006
p = cube("pillow", cotton, 0.5, 0.32, 0.11, (0, 0.78, 0.43)); p.modifiers.new("s", "SUBSURF").levels = 2
bl = cube("blanket", wool, 0.68, 0.5, 0.06, (0.02, -0.55, 0.39)); bl.rotation_euler = (0, 0.02, 0.06); bl.modifiers.new("s", "SUBSURF").levels = 2
proof("cot", 3.0, 1.8, (0, 0, 0.3)); finish("cot")

# ---------- floor lamp 1.65 m, drum shade ----------
reset()
brass = mat("brass", (0.5, 0.37, 0.17), 0.35, 0.9); shade = mat("shade", (0.92, 0.82, 0.6), 0.9); black = mat("iron", (0.05, 0.05, 0.05), 0.5, 0.6)
cyl("base", black, 0.17, 0.15, 0.03, (0, 0, 0), verts=40, bev=0.008)
cyl("boss", brass, 0.05, 0.03, 0.04, (0, 0, 0.03), verts=24, bev=0.004)
cyl("pole", brass, 0.012, 0.012, 1.35, (0, 0, 0.07), verts=16)
cyl("collar", brass, 0.018, 0.018, 0.03, (0, 0, 0.7), verts=16, bev=0.003)
cyl("socket", brass, 0.022, 0.02, 0.07, (0, 0, 1.4), verts=16, bev=0.003)
for a in range(3):
    t = a * 2.094; tube("harp", brass, [(0, 0, 1.42), (math.cos(t)*0.13, math.sin(t)*0.13, 1.6)], 0.004)
bulb = bpy.data.objects.new("bulb", bpy.data.meshes.new("bulb")); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.035)
for v in bm.verts: v.co += Vector((0, 0, 1.5))
bulb = obj("bulb", bm, mat("bulb", (1, 0.95, 0.8), 0.2)); bulb.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 3
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=40, radius1=0.24, radius2=0.15, depth=0.3)
for v in bm.verts: v.co += Vector((0, 0, 1.57))
s = obj("shade", bm, shade); md = s.modifiers.new("t", "SOLIDIFY"); md.thickness = 0.004
for z, r in ((1.42, 0.24), (1.72, 0.15)): tube("ring", brass, [(math.cos(i/24*6.283)*r, math.sin(i/24*6.283)*r, z) for i in range(25)], 0.003)
proof("lamp", 3.0, 1.6, (0, 0, 0.9)); finish("lamp")

# ---------- cardboard box 0.6 x 0.45 x 0.48, flaps folded, tape, a dent ----------
reset()
card = mat("cardboard", (0.55, 0.4, 0.24), 0.9); tape = mat("tape", (0.62, 0.48, 0.3), 0.3)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x*0.6, v.co.y*0.45, v.co.z*0.48 + 0.24))
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=4, use_grid_fill=True)
for v in bm.verts:  # soft dent and bulge: cardboard is never square
    d = (v.co - Vector((0.18, -0.225, 0.3))).length
    if d < 0.2: v.co.y += (0.2 - d) * 0.12
    if v.co.z > 0.47: v.co.z -= 0.012 * (1 - abs(v.co.x) / 0.3)
b = obj("box", bm, card); md = b.modifiers.new("b", "BEVEL"); md.width = 0.006; md.segments = 2; md.limit_method = "ANGLE"
cube("tape", tape, 0.065, 0.455, 0.002, (0, 0, 0.47)); cube("tapef", tape, 0.065, 0.002, 0.12, (0, -0.226, 0.42)); cube("tapeb", tape, 0.065, 0.002, 0.12, (0, 0.226, 0.42))
cube("seam", mat("seam", (0.32, 0.22, 0.12), 0.95), 0.003, 0.452, 0.002, (0.06, 0, 0.471))
proof("box", 1.6, 1.1, (0, 0, 0.25)); finish("box", uvscale=0.6)

# ---------- stairs to nowhere: 13 risers 0.2, treads 0.3, 1.2 wide, climbing +Y (glTF -Z) into the ceiling ----------
reset()
carpet = mat("carpet", (0.78, 0.66, 0.42), 0.95); paper = mat("wallpaper", (0.95, 0.85, 0.5), 0.85); trim = mat("trim", (0.62, 0.52, 0.34), 0.55); rail = mat("rail", (0.36, 0.22, 0.12), 0.4)
RISE, TREAD, STEPS, W = 0.2, 0.3, 13, 0.6
for i in range(STEPS):
    y0 = -1.95 + i * TREAD; top = (i + 1) * RISE
    cube(f"step{i}", carpet, 2 * W, TREAD, top, (0, y0 + TREAD / 2, top / 2), bev=0.012, seg=3)        # carpet-wrapped step
    cube(f"nose{i}", trim, 2 * W - 0.01, 0.035, 0.025, (0, y0 + 0.012, top - 0.008), bev=0.006, seg=2)  # worn vinyl nosing
back = -1.95 + STEPS * TREAD
for s in (-1, 1):
    x = s * (W + 0.06)
    # wallpapered knee wall to the ceiling, plus a stained baseboard following the stair line
    cube("wall", paper, 0.12, 3.9, 3.0, (x, 0, 1.5), bev=0.01)
    bm = bmesh.new()
    pts = []
    for i in range(STEPS):
        y0 = -1.95 + i * TREAD; pts += [(y0, i * RISE), (y0, (i + 1) * RISE)]
    pts += [(back, STEPS * RISE), (1.95, STEPS * RISE)]
    # skirt board: a strip 0.14 tall riding each step
    for (ya, za), (yb, zb) in zip(pts[:-1], pts[1:]):
        xi = x - s * 0.065
        v = [bm.verts.new((xi, ya, za)), bm.verts.new((xi, yb, zb)), bm.verts.new((xi, yb, zb + 0.14)), bm.verts.new((xi, ya, za + 0.14))]
        bm.faces.new(v if s > 0 else v[::-1])
    sk = obj("skirt", bm, trim); md = sk.modifiers.new("t", "SOLIDIFY"); md.thickness = 0.018
# handrail on brackets along the right wall
x = W - 0.02
for i in range(4):
    y = -1.6 + i * 1.0; z = 0.9 + (y + 1.95) / TREAD * RISE
    tube("bracket", mat("steel", (0.5, 0.5, 0.5), 0.4, 0.9), [(x, y, z - 0.06), (x - 0.06, y, z - 0.06), (x - 0.06, y, z - 0.01)], 0.006)
tube("handrail", rail, [(x - 0.06, -1.95, 0.9 + 0 * RISE), (x - 0.06, back, 0.9 + STEPS * RISE * (back + 1.95) / (back + 1.95))], 0.022)
proof("stairs", 5.0, 2.4, (0, 0, 1.2)); finish("stairs", uvscale=1.0)
