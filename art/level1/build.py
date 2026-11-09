# Level 1 kit: the steel fire door to Level 2, the flickering wall home (a breach of Level 0 wallpaper), the M.E.G. map board.
# blender -b --factory-startup --python-exit-code 1 --python art/level1/build.py
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, noise
TEX = "/workspace/l1/tex/"; T0 = "/tmp/l1tex/"; OUT = "/workspace/l1/"; PROOF = "/tmp/l1proof/"
os.makedirs(PROOF, exist_ok=True)
R = random.Random(11)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, color=(0.5, 0.5, 0.5), rough=0.7, metal=0.0, img=None, emit=None, estr=0.0, alpha=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if img:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(img); m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = estr
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
    return m
def boxuv(obj, size=1.0):
    bm = bmesh.new(); bm.from_mesh(obj.data); uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = obj.matrix_world @ l.vert.co
            u, v = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            l[uv].uv = (u / size, v / size)
    bm.to_mesh(obj.data); bm.free()
def cube(name, c, d, m, bevel=0.006, seg=2):
    bpy.ops.mesh.primitive_cube_add(location=c); o = bpy.context.object; o.name = name
    o.scale = (d[0] / 2, d[1] / 2, d[2] / 2); bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new("b", "BEVEL"); mod.width = bevel; mod.segments = seg; mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(m); return o
def cyl(name, c, r, depth, m, axis="Z", verts=16):
    rot = {"Z": (0, 0, 0), "X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=c, rotation=rot); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(rotation=True); bpy.ops.object.shade_smooth(); o.data.materials.append(m); return o
def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o
def ground_origin(o):
    zs = [(o.matrix_world @ v.co) for v in o.data.vertices]
    mn = Vector((min(p.x for p in zs), min(p.y for p in zs), min(p.z for p in zs))); mx = Vector((max(p.x for p in zs), max(p.y for p in zs), max(p.z for p in zs)))
    c = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    o.data.transform(__import__("mathutils").Matrix.Translation(-c)); o.location = (0, 0, 0)
    print("BOUNDS", o.name, tuple(round(v, 3) for v in mn), tuple(round(v, 3) for v in mx), "origin_shift", tuple(round(v, 3) for v in c))
def scene_setup(cams):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 656
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.08, 0.08, 0.085, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=20); fl = bpy.context.object; fl.name = "_floor"; fl.data.materials.append(mat("_fl", (0.25, 0.25, 0.25), 0.9))
    return sc
def proof(sc, name, cams):
    for i, (loc, tgt) in enumerate(cams):
        cd = bpy.data.cameras.new("c"); co = bpy.data.objects.new("cam", cd); sc.collection.objects.link(co); co.location = loc
        d = Vector(tgt) - Vector(loc); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cd.lens = 32
        ld = bpy.data.lights.new("l", "AREA"); ld.energy = 900; ld.size = 3; lo = bpy.data.objects.new("l", ld); sc.collection.objects.link(lo); lo.location = Vector(loc) + Vector((0, 0, 1.5)); lo.rotation_euler = co.rotation_euler
        sc.camera = co; sc.render.filepath = f"{PROOF}{name}_{i}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(lo); bpy.data.objects.remove(co)
def export(o, name):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", use_selection=True, export_apply=True, export_image_format="JPEG")
    dg = bpy.context.evaluated_depsgraph_get(); print("TRIS", name, len(o.evaluated_get(dg).data.loop_triangles))

# ---------- 1. the fire door to Level 2: front faces -X (world -X, the side players walk up to) ----------
reset()
paint = mat("door_paint", (1, 1, 1), 0.55, 0.35, img=TEX + "door.png")
frame = mat("frame_steel", (0.16, 0.17, 0.17), 0.45, 0.8)
chrome = mat("push_bar", (0.7, 0.7, 0.68), 0.28, 1.0)
glass = mat("wire_glass", (0.35, 0.42, 0.4), 0.12, 0.0, emit=(0.1, 0.16, 0.13), estr=0.6)
stencil = mat("stencil", (0.82, 0.68, 0.14), 0.8)
rubber = mat("rubber", (0.04, 0.04, 0.04), 0.9)
P = []
W, Hh, T = 1.25, 2.25, 0.12
P.append(cube("jamb_l", (0, -W / 2 + 0.05, Hh / 2), (T, 0.1, Hh), frame, 0.008))
P.append(cube("jamb_r", (0, W / 2 - 0.05, Hh / 2), (T, 0.1, Hh), frame, 0.008))
P.append(cube("head", (0, 0, Hh - 0.06), (T, W - 0.1, 0.12), frame, 0.008))
P.append(cube("stop_l", (0.02, -W / 2 + 0.115, 1.09), (0.05, 0.03, 2.18), frame, 0.004))
P.append(cube("stop_r", (0.02, W / 2 - 0.115, 1.09), (0.05, 0.03, 2.18), frame, 0.004))
P.append(cube("stop_h", (0.02, 0, 2.175), (0.05, W - 0.26, 0.03), frame, 0.004))
lw, lh = W - 0.215, 2.16
leaf = cube("leaf", (-0.025, 0, 0.012 + lh / 2), (0.05, lw, lh), paint, 0.006); boxuv(leaf, 2.2)
P.append(leaf)
# vision panel: a steel bead round wired glass
for (dy, dz, sy, sz) in [(0, 1.92, 0.36, 0.035), (0, 1.38, 0.36, 0.035), (-0.165, 1.65, 0.035, 0.58), (0.165, 1.65, 0.035, 0.58)]:
    P.append(cube("bead", (-0.056, dy - 0.15, dz), (0.016, sy, sz), frame, 0.004))
P.append(cube("glass", (-0.051, -0.15, 1.65), (0.006, 0.3, 0.52), glass, 0))
# push bar: two end housings and a bar at 1.0 m
for dy in (-0.38, 0.32): P.append(cube("bar_end", (-0.075, dy, 1.0), (0.055, 0.1, 0.09), chrome, 0.012, 3))
P.append(cyl("bar", (-0.09, -0.03, 1.0), 0.019, 0.66, chrome, "Y"))
P.append(cube("bar_plate", (-0.07, 0.0, 1.0), (0.03, 0.62, 0.05), frame, 0.006, 2))
# kick plate, closer arm, hinges, threshold, a rubber seal line
P.append(cube("kick", (-0.053, 0, 0.17), (0.004, lw - 0.06, 0.26), chrome, 0.002, 1))
P.append(cube("closer", (-0.08, 0.28, 2.06), (0.07, 0.3, 0.07), frame, 0.012, 3))
P.append(cube("closer_arm", (-0.1, 0.05, 2.1), (0.02, 0.32, 0.025), frame, 0.004))
for z in (0.25, 1.1, 1.95): P.append(cyl("hinge", (0.0, W / 2 - 0.105, z), 0.012, 0.11, chrome, "Z", 10))
P.append(cube("sill", (0, 0, 0.006), (0.2, W, 0.012), frame, 0.003, 1))
P.append(cube("seal", (-0.052, -lw / 2 + 0.006, 0.012 + lh / 2), (0.004, 0.008, lh), rubber, 0))
# a stencilled 2 and LEVEL above it: painted text
bpy.ops.object.text_add(location=(-0.0515, -0.05, 0.62)); tx = bpy.context.object; tx.data.body = "2"; tx.data.size = 0.5; tx.data.align_x = "CENTER"; tx.data.extrude = 0.0008
tx.rotation_euler = (math.pi / 2, 0, -math.pi / 2); bpy.ops.object.convert(target="MESH"); tx.data.materials.clear(); tx.data.materials.append(stencil); P.append(tx)
bpy.ops.object.text_add(location=(-0.0515, -0.05, 1.22)); t2 = bpy.context.object; t2.data.body = "PUSH"; t2.data.size = 0.07; t2.data.align_x = "CENTER"; t2.data.extrude = 0.0006
t2.rotation_euler = (math.pi / 2, 0, -math.pi / 2); bpy.ops.object.convert(target="MESH"); t2.data.materials.clear(); t2.data.materials.append(stencil); P.append(t2)
door = join(P, "l1_firedoor"); bpy.ops.object.shade_auto_smooth(angle=0.6) if hasattr(bpy.ops.object, "shade_auto_smooth") else None
ground_origin(door)
sc = scene_setup(None); proof(sc, "door", [((-2.4, -1.2, 1.6), (0, 0, 1.1)), ((-0.9, 0.5, 1.2), (-0.05, -0.1, 1.2))])
export(door, "l1_firedoor")

# ---------- 2. the flickering wall home: a freestanding cinder wall breached by a warped panel of Level 0 ----------
reset()
cinder = mat("cinder", (0.85, 0.85, 0.83), 0.92, 0, img=T0 + "painted-cinder-block-wall-clean.png")
paper = mat("wallpaper", (1, 1, 1), 0.8, 0, img=T0 + "yellow-chevron-damask-wallpaper-aged.png", emit=(0.9, 0.78, 0.35), estr=0.35)
carpet = mat("carpet", (1, 1, 1), 0.98, 0, img=T0 + "damp-beige-berber-office-carpet.png")
rubble = mat("rubble", (0.62, 0.62, 0.6), 0.95)
plaster = mat("plaster", (0.86, 0.8, 0.62), 0.9)
WL, WH = 4.8, 4.2
wall = cube("wall", (-0.05, 0, WH / 2), (0.2, WL, WH), cinder, 0.01, 2)
# the breach outline: jagged, wider at the floor, 2.6 m tall
pts = []
for i in range(28):
    t = i / 27; y = -1.25 + 2.5 * t; z = 2.55 + 0.18 * math.sin(t * 9.1) + R.uniform(-0.08, 0.08) - 0.25 * (2 * t - 1) ** 4
    pts.append((y, z))
outline = [(-1.35, -0.1)] + [(-1.3 + R.uniform(-0.05, 0.05), z) for z in (0.6, 1.3, 2.0)] + pts + [(1.3 + R.uniform(-0.05, 0.05), z) for z in (2.0, 1.3, 0.6)] + [(1.35, -0.1)]
bm = bmesh.new(); vs_a = [bm.verts.new((-0.3, y, z)) for y, z in outline]; vs_b = [bm.verts.new((0.2, y, z)) for y, z in outline]
bm.faces.new(vs_a[::-1]); bm.faces.new(vs_b)
for i in range(len(outline)):
    j = (i + 1) % len(outline); bm.faces.new((vs_a[i], vs_a[j], vs_b[j], vs_b[i]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new("cut"); bm.to_mesh(me); bm.free(); cut = bpy.data.objects.new("cut", me); bpy.context.collection.objects.link(cut)
bpy.context.view_layer.objects.active = wall; bm_ = wall.modifiers.new("x", "BOOLEAN"); bm_.object = cut; bm_.operation = "DIFFERENCE"; bm_.solver = "EXACT"
bpy.ops.object.modifier_apply(modifier="x"); bpy.data.objects.remove(cut)
boxuv(wall, 2.4)
# a ragged plaster lip round the breach on the camp side (+X)
lip = []
for i in range(1, len(outline) - 1):
    y, z = outline[i]; n = R.uniform(0.04, 0.1)
    lip.append(cube("lip", (0.055, y * (1 + n * 0.3), z + R.uniform(-0.03, 0.03)), (0.02, R.uniform(0.08, 0.22), R.uniform(0.06, 0.16)), plaster, 0.008, 1))
# the wallpaper: a sagging, warped sheet of level 0 spilling into the breach, bulging toward the camp
bpy.ops.mesh.primitive_grid_add(x_subdivisions=36, y_subdivisions=40, size=1); pp = bpy.context.object; pp.name = "paper"
for v in pp.data.vertices:
    u, w = v.co.x + 0.5, v.co.y + 0.5; y = -1.32 + 2.64 * u; z = 2.62 * w
    bulge = math.sin(math.pi * u) * math.sin(math.pi * min(1, w * 1.05)) ; ripple = noise.noise(Vector((y * 1.7, z * 1.7, 3.1))) * 0.05
    v.co = Vector((-0.06 + 0.17 * bulge + ripple * bulge, y + 0.03 * math.sin(z * 2.3), z))
pp.data.materials.append(paper); boxuv(pp, 0.9); bpy.ops.object.shade_smooth()
sol = pp.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.006; bpy.ops.object.modifier_apply(modifier="s")
# the carpet: a tongue of damp berber pushed out over the concrete
bpy.ops.mesh.primitive_grid_add(x_subdivisions=14, y_subdivisions=18, size=1); cp = bpy.context.object; cp.name = "carpet"
for v in cp.data.vertices:
    u, w = v.co.x + 0.5, v.co.y + 0.5; x = -0.05 + 0.85 * u; y = (-1.15 + 2.3 * w) * (1 - 0.35 * u ** 2) + 0.12 * math.sin(u * 4)
    v.co = Vector((x, y, 0.012 + 0.025 * max(0, noise.noise(Vector((x * 3, y * 3, 0.5)))) * (1 - u)))
cp.data.materials.append(carpet); boxuv(cp, 0.8); sol = cp.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.012; sol.offset = -1; bpy.ops.object.modifier_apply(modifier="s")
# rubble: broken block chunks under the breach
chunks = []
for i in range(14):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=R.uniform(0.04, 0.12), location=(R.uniform(0.15, 0.8), R.uniform(-1.4, 1.4), 0)); c = bpy.context.object
    c.scale = (1, R.uniform(0.7, 1.4), R.uniform(0.45, 0.7)); c.rotation_euler = (R.random(), R.random(), R.random()); bpy.ops.object.transform_apply(scale=True, rotation=True)
    zmin = min(v.co.z for v in c.data.vertices); c.location.z = -zmin - 0.01 + 0.012
    c.data.materials.append(rubble); chunks.append(c)
back = join([wall, pp, cp] + lip + chunks, "l1_backwall")
ground_origin(back)
sc = scene_setup(None); proof(sc, "back", [((4.5, -1.5, 1.7), (0, 0, 1.4)), ((1.6, 0.9, 1.3), (0, -0.2, 1.2))])
export(back, "l1_backwall")

# ---------- 3. the M.E.G. map board: front faces world -Z (Blender +Y) ----------
reset()
alu = mat("frame_alu", (0.62, 0.63, 0.64), 0.35, 0.9)
steel = mat("stand_steel", (0.22, 0.23, 0.24), 0.5, 0.7)
cork = mat("cork", (1, 1, 1), 0.95, 0, img=TEX + "cork.png")
mapm = mat("map_paper", (1, 1, 1), 0.85, 0, img=TEX + "map.png")
note = mat("note_paper", (0.92, 0.9, 0.78), 0.9)
clip = mat("clipboard", (0.42, 0.28, 0.16), 0.7)
red = mat("marker_red", (0.6, 0.05, 0.04), 0.5)
rub = mat("rubber", (0.03, 0.03, 0.03), 0.9)
P = []
BW, BH, Z0 = 2.6, 1.3, 0.62
P.append(cube("cork", (0, 0, Z0 + BH / 2), (BW, 0.03, BH), cork, 0.004)); boxuv(P[-1], 0.6)
for (x, z, sx, sz) in [(0, Z0, BW + 0.06, 0.04), (0, Z0 + BH, BW + 0.06, 0.04), (-BW / 2, Z0 + BH / 2, 0.04, BH + 0.06), (BW / 2, Z0 + BH / 2, 0.04, BH + 0.06)]:
    P.append(cube("trim", (x, 0.01, z), (sx, 0.05, sz), alu, 0.008, 2))
# the map: one sheet, UV 0..1 on its front
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.019, Z0 + BH / 2 + 0.02), rotation=(math.pi / 2, 0, 0)); mp = bpy.context.object
mp.scale = (2.3, 1.15, 1); bpy.ops.object.transform_apply(scale=True, rotation=True); mp.data.materials.append(mapm)
uvl = mp.data.uv_layers.active.data
for l in uvl: l.uv = (1 - l.uv[0], l.uv[1])
P.append(mp)
for i in range(3):
    P.append(cube("note", (BW / 2 - 0.2 - i * 0.03, 0.02 + i * 0.001, Z0 + 0.22 + i * 0.05), (0.18, 0.002, 0.13), note, 0))
# marker tray
P.append(cube("tray", (0, 0.06, Z0 - 0.03), (BW * 0.7, 0.09, 0.02), alu, 0.004, 1)); P.append(cube("tray_lip", (0, 0.1, Z0 - 0.01), (BW * 0.7, 0.008, 0.04), alu, 0.002, 1))
P.append(cyl("marker", (0.4, 0.06, Z0 - 0.005), 0.009, 0.13, red, "X", 10)); P.append(cyl("marker2", (0.62, 0.07, Z0 - 0.005), 0.009, 0.13, rub, "X", 10))
# stand: two uprights, splayed feet with casters, a cross brace behind
for sx in (-1, 1):
    x = sx * (BW / 2 + 0.05)
    P.append(cube("upright", (x, -0.02, 0.93), (0.04, 0.04, 1.86), steel, 0.006, 2))
    P.append(cube("foot", (x, -0.02, 0.06), (0.05, 0.62, 0.04), steel, 0.006, 2))
    for dy in (-0.27, 0.23): P.append(cyl("caster", (x, -0.02 + dy, 0.03), 0.03, 0.025, rub, "X", 12))
P.append(cube("brace", (0, -0.05, 0.42), (BW + 0.1, 0.03, 0.03), steel, 0.005, 1))
# a clipboard hung on the right upright
P.append(cube("clipboard", (BW / 2 + 0.05, 0.035, 1.2), (0.23, 0.01, 0.32), clip, 0.004, 1)); P.append(cube("clipsheet", (BW / 2 + 0.05, 0.042, 1.18), (0.2, 0.002, 0.27), note, 0)); P.append(cube("clipjaw", (BW / 2 + 0.05, 0.045, 1.34), (0.1, 0.012, 0.03), alu, 0.004, 1))
board = join(P, "l1_mapboard"); ground_origin(board)
sc = scene_setup(None); proof(sc, "board", [((-1.0, 3.2, 1.5), (0, 0, 1.2)), ((0.3, 1.2, 1.3), (0, 0, 1.25))])
export(board, "l1_mapboard")
