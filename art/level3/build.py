# Level 3 "Electrical Station" models, built procedurally in Blender (headless) and exported as glb.
#   blender -b -P art/level3/build.py -- [statue generator line wallbox bottles camera]
# Conventions: metres, origin at the middle of the base, the front faces Blender +Y (glTF -Z), up is +Z (glTF +Y).
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

D = os.path.dirname(os.path.abspath(__file__))
OUT = D
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["statue", "generator", "line", "wallbox", "bottles", "camera"]
rnd = random.Random(33)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

MATS = {}
def mat(name, rgb, rough=0.7, metal=0.0, emit=None):
    key = (name, rgb, rough, metal, emit)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.5
    MATS[key] = m
    return m

def finish(ob, m, smooth=True):
    ob.data.materials.clear(); ob.data.materials.append(m)
    if smooth:
        for p in ob.data.polygons: p.use_smooth = True
    return ob

def box(name, loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = ob.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2
        bpy.ops.object.modifier_apply(modifier="b")
    return finish(ob, m, smooth=False)

def cyl(name, loc, r, depth, m, axis="Z", verts=24, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc)
    ob = bpy.context.active_object; ob.name = name
    if axis == "X": ob.rotation_euler = (0, math.radians(90), 0)
    if axis == "Y": ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    return finish(ob, m)

def sphere(name, loc, scale, m, seg=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(ob, m)

def tube(name, pts, r, m, res=6):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = res; cu.resolution_u = 12
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts):
        p.co = c; p.handle_left_type = p.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return finish(bpy.context.active_object, m)

def noise_displace(ob, strength, scale=0.2, seed=1):
    t = bpy.data.textures.new("n%d" % seed, "CLOUDS"); t.noise_scale = scale
    md = ob.modifiers.new("d", "DISPLACE"); md.texture = t; md.strength = strength
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="d")

def join_all(name):
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name
    return ob

def export(name, turn=False):
    ob = join_all(name)
    if turn:  # built facing -Y; the game wants +Y
        ob.rotation_euler.z = math.pi; bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions))
    # a quick turntable-less preview from the front-left, for checking the shape
    render(name, ob)

def render(name, ob):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = 640; sc.render.resolution_y = 640
    dims = ob.dimensions; big = max(dims)
    cam_d = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cam_d); bpy.context.collection.objects.link(cam)
    mid = Vector((0, 0, dims.z / 2))
    cam.location = mid + Vector((big * 1.1, big * 1.6, big * 0.5));
    d = mid - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = 40; sc.camera = cam
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.55, 0.55, 0.6)
    sc.render.filepath = os.path.join(OUT, "preview_" + name + ".png")
    bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------------ the statue
def statue():
    reset()
    marble = mat("marble", (0.82, 0.8, 0.74), 0.55)
    stone = mat("stone", (0.28, 0.33, 0.32), 0.8)
    dark = mat("dark", (0.04, 0.035, 0.03), 0.9)
    # plinth
    box("plinth", (0, 0, 0.3), (1.5, 1.5, 0.6), stone, 0.03)
    box("plinth2", (0, 0, 0.68), (1.25, 1.25, 0.16), stone, 0.02)
    # the robed body: a lathe of rings with drapery folds, weight on one leg
    H0, H1, N = 0.76, 2.05, 72
    rings = 48
    def prof(t):  # radius along the body, 0 = hem, 1 = neck
        pts = [(0, 0.36), (0.12, 0.3), (0.35, 0.22), (0.5, 0.2), (0.62, 0.17), (0.74, 0.21), (0.82, 0.245), (0.9, 0.2), (0.96, 0.1), (1, 0.075)]
        for (a, ra), (b, rb) in zip(pts, pts[1:]):
            if a <= t <= b: u = (t - a) / (b - a); return ra + (rb - ra) * (u * u * (3 - 2 * u))
        return 0.075
    bm = bmesh.new(); grid = []
    for i in range(rings + 1):
        t = i / rings; z = H0 + (H1 - H0) * t; row = []
        for k in range(N):
            a = 2 * math.pi * k / N
            fold = 1 + (0.09 * math.sin(7 * a + 3 * t) + 0.05 * math.sin(13 * a - 5 * t) + 0.03 * math.sin(23 * a)) * (1 - t) ** 0.7
            r = prof(t) * fold * 1.3
            sx = 0.05 * math.sin(t * math.pi) * 1.0  # a lean for the contrapposto
            x = math.cos(a) * r * 1.0 + sx; y = math.sin(a) * r * 0.82
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(rings):
        for k in range(N):
            bm.faces.new((grid[i][k], grid[i][(k + 1) % N], grid[i + 1][(k + 1) % N], grid[i + 1][k]))
    bm.faces.new(grid[0][::-1]); bm.faces.new(grid[-1])
    me = bpy.data.meshes.new("body"); bm.to_mesh(me); bm.free()
    body = bpy.data.objects.new("body", me); bpy.context.collection.objects.link(body)
    finish(body, marble)
    # shoulders and a sash across the chest: a flattened torus-ish band
    sph = sphere("sh_l", (0.3, 0, 1.86), (0.09, 0.08, 0.08), marble)
    sphere("sh_r", (-0.3, 0, 1.86), (0.09, 0.08, 0.08), marble)
    # head with a nose, brow, chin; hair parted with a bun
    sphere("head", (0.04, -0.01, 2.2), (0.105, 0.115, 0.14), marble)
    sphere("nose", (0.04, -0.12, 2.18), (0.02, 0.04, 0.05), marble, 12, 8)
    sphere("brow", (0.04, -0.09, 2.25), (0.085, 0.045, 0.02), marble, 12, 8)
    sphere("chin", (0.04, -0.07, 2.1), (0.05, 0.05, 0.04), marble, 12, 8)
    sphere("hair", (0.04, 0.03, 2.25), (0.115, 0.115, 0.13), marble)
    sphere("bun", (0.04, 0.12, 2.28), (0.08, 0.07, 0.07), marble)
    cyl("neck", (0.04, 0, 2.04), 0.055, 0.14, marble, verts=16)
    # eye sockets and mouth shadows, worn
    sphere("eye_l", (0.0, -0.105, 2.215), (0.022, 0.012, 0.014), dark, 10, 6)
    sphere("eye_r", (0.08, -0.105, 2.215), (0.022, 0.012, 0.014), dark, 10, 6)
    # left arm broken off at the shoulder, right arm bent holding the mask down at the thigh
    cyl("stump", (0.31, 0, 1.78), 0.065, 0.16, marble, axis="X", verts=14)
    tube("arm_r", [(-0.28, 0, 1.84), (-0.36, -0.06, 1.55), (-0.38, -0.12, 1.25)], 0.055, marble)
    sphere("hand_r", (-0.38, -0.13, 1.19), (0.05, 0.06, 0.07), marble)
    # the theatre mask hanging at her thigh: a face with open eyes and mouth, curls round it
    sphere("mask", (-0.4, -0.16, 1.0), (0.13, 0.05, 0.17), marble)
    sphere("m_eye1", (-0.44, -0.2, 1.06), (0.03, 0.012, 0.035), dark, 10, 6); sphere("m_eye2", (-0.36, -0.2, 1.06), (0.03, 0.012, 0.035), dark, 10, 6)
    sphere("m_mouth", (-0.4, -0.205, 0.93), (0.04, 0.012, 0.055), dark, 10, 6)
    sphere("m_nose", (-0.4, -0.205, 1.0), (0.02, 0.025, 0.04), marble, 10, 6)
    for k in range(7):
        a = -0.8 + k * 0.27
        sphere("curl%d" % k, (-0.4 + math.sin(a) * 0.17, -0.12, 1.0 + math.cos(a) * 0.2 - 0.05), (0.045, 0.04, 0.05), marble, 10, 6)
    # a fold of cloth over the mask-side thigh and a piece of the hem broken away
    tube("cloth", [(0.12, -0.1, 1.9), (0.2, -0.2, 1.4), (0.18, -0.24, 0.85)], 0.05, marble)
    for ob in [o for o in bpy.context.scene.objects if o.type == "MESH" and o.data.materials and o.data.materials[0] == marble]:
        noise_displace(ob, 0.006, 0.12, hash(ob.name) % 97)  # weathering
    # slight lean for the whole figure
    export("statue", turn=True)

# ------------------------------------------------------------------ the generator: dull green housing, fins, stack, panel
def generator():
    reset()
    green = mat("gen_green", (0.15, 0.24, 0.17), 0.55, 0.45)
    dgrey = mat("gen_dark", (0.07, 0.07, 0.08), 0.5, 0.6)
    steel = mat("gen_steel", (0.45, 0.46, 0.48), 0.4, 0.8)
    yellow = mat("hazard_y", (0.8, 0.6, 0.05), 0.6, 0.1)
    black = mat("hazard_k", (0.03, 0.03, 0.03), 0.8)
    red = mat("red", (0.5, 0.05, 0.04), 0.5)
    glass = mat("dial", (0.6, 0.7, 0.55), 0.2, 0.0, emit=(0.25, 0.5, 0.2))
    cable = mat("cable", (0.025, 0.025, 0.03), 0.85)
    box("plinth", (0, 0, 0.15), (4.8, 2.6, 0.3), dgrey, 0.04)
    box("housing", (0, 0, 1.3), (4.3, 2.1, 2.0), green, 0.08)
    for i in range(10): box("fin%d" % i, (-1.8 + i * 0.4, 1.12, 1.25), (0.14, 0.22, 1.6), green, 0.02)           # cooling fins, front
    for i in range(10): box("finb%d" % i, (-1.8 + i * 0.4, -1.12, 1.25), (0.14, 0.22, 1.6), green, 0.02)
    # hazard band: alternating yellow/black blocks round the top of the housing
    for i in range(18):
        box("hz%d" % i, (-2.0 + i * 0.235, 1.065, 2.18), (0.2, 0.02, 0.14), yellow if i % 2 else black)
    # end caps with bolt rings, a big round bearing housing on each end
    for sx in (-1, 1):
        cyl("cap%d" % sx, (sx * 2.2, 0, 1.3), 0.85, 0.35, steel, axis="X", verts=32)
        cyl("hub%d" % sx, (sx * 2.45, 0, 1.3), 0.35, 0.25, dgrey, axis="X", verts=24)
        for k in range(10):
            a = k / 10 * 2 * math.pi; cyl("bolt%d_%d" % (sx, k), (sx * 2.4, math.cos(a) * 0.72, 1.3 + math.sin(a) * 0.72), 0.04, 0.07, steel, axis="X", verts=6)
    # top: a terminal box, an exhaust stack up to the ceiling, a lifting eye
    box("terminal", (-1.2, 0, 2.5), (0.9, 0.7, 0.5), dgrey, 0.04)
    cyl("stack", (1.5, 0, 2.7), 0.2, 1.0, steel, verts=20); cyl("stack_collar", (1.5, 0, 2.3), 0.26, 0.12, dgrey, verts=20)
    cyl("stack_top", (1.5, 0, 3.0), 0.16, 0.2, steel, verts=20)
    tube("eye", [(0, 0, 2.3), (0, 0, 2.55), (0.12, 0, 2.7), (0, 0, 2.8), (-0.12, 0, 2.7), (0, 0, 2.55)], 0.03, steel)
    # control panel on the front: gauges, a red lever, a breaker row
    box("panel", (0.4, 1.17, 1.7), (1.5, 0.08, 0.9), dgrey, 0.03)
    for i in range(3):
        cyl("gauge%d" % i, (-0.15 + i * 0.5, 1.23, 1.95), 0.13, 0.05, glass, axis="Y", verts=20)
    for i in range(6): box("brk%d" % i, (0.0 + i * 0.16, 1.23, 1.55), (0.1, 0.05, 0.14), black)
    cyl("lever_base", (1.0, 1.23, 1.6), 0.07, 0.05, steel, axis="Y", verts=12); tube("lever", [(1.0, 1.25, 1.6), (1.0, 1.3, 1.82)], 0.025, red); sphere("knob", (1.0, 1.3, 1.85), (0.05, 0.05, 0.05), red, 12, 8)
    # fat black cables out of the terminal box and across the plinth, a warning plate
    tube("cab1", [(-1.2, 0.2, 2.5), (-1.6, 0.9, 2.2), (-2.6, 1.5, 1.0), (-2.9, 1.7, 0.06), (-3.6, 1.3, 0.05)], 0.08, cable)
    tube("cab2", [(-1.0, -0.2, 2.5), (-1.4, -0.9, 2.0), (-2.4, -1.5, 0.9), (-2.8, -1.5, 0.06), (-3.4, -1.0, 0.05)], 0.07, cable)
    tube("cab3", [(1.9, 0.4, 0.3), (2.4, 1.2, 0.07), (2.9, 1.5, 0.05)], 0.06, cable)
    box("plate", (1.6, 1.17, 0.85), (0.5, 0.03, 0.25), yellow); box("plate_k", (1.6, 1.185, 0.85), (0.4, 0.01, 0.06), black)
    export("generator")

# ------------------------------------------------------------------ the assembly line: 13.6 m of belt, hopper, press, bin
def line():
    reset()
    dgrey = mat("l_dark", (0.12, 0.12, 0.13), 0.5, 0.6)
    steel = mat("l_steel", (0.4, 0.41, 0.43), 0.45, 0.8)
    belt = mat("belt", (0.03, 0.03, 0.035), 0.9)
    yellow = mat("l_yel", (0.75, 0.55, 0.04), 0.6, 0.1)
    rust = mat("l_rust", (0.36, 0.18, 0.1), 0.8, 0.3)
    blue = mat("l_blue", (0.15, 0.22, 0.38), 0.5, 0.5)
    green = mat("l_green", (0.18, 0.3, 0.2), 0.6, 0.3)
    L = 13.6; x0 = -L / 2
    box("bed", (0, 0, 0.86), (L, 1.0, 0.08), steel, 0.01)
    box("belt", (0, 0, 0.92), (L - 0.1, 0.84, 0.04), belt)
    box("rail_f", (0, 0.54, 0.95), (L, 0.06, 0.16), yellow); box("rail_b", (0, -0.54, 0.95), (L, 0.06, 0.16), yellow)
    n = int(L / 1.6)
    for i in range(n + 1):
        x = x0 + 0.4 + i * (L - 0.8) / n
        for s in (-0.45, 0.45): box("leg", (x, s, 0.42), (0.1, 0.1, 0.84), dgrey)
        box("cross", (x, 0, 0.3), (0.06, 0.9, 0.06), dgrey)
    for i in range(int(L / 0.45)):  # rollers under the belt lip
        cyl("roll", (x0 + 0.2 + i * 0.45, 0, 0.9), 0.045, 0.98, steel, axis="Y", verts=10)
    # hopper at the start: a funnel on four legs, a chute onto the belt
    for sx in (-1, 1):
        for sy in (-1, 1): box("hleg", (x0 + 0.9 + sx * 0.55, sy * 0.55, 1.5), (0.08, 0.08, 1.2), dgrey)
    cyl("hopper", (x0 + 0.9, 0, 2.55), 0.9, 1.3, rust, verts=24, r2=0.3)
    box("chute", (x0 + 1.3, 0, 1.45), (0.5, 0.45, 0.6), rust, 0.02)
    # the press halfway: two columns, a crosshead, a piston, a die on the belt, hazard stripes
    xm = 0.0
    for s in (-0.8, 0.8): box("pcol", (xm, s, 1.6), (0.3, 0.3, 1.5), blue, 0.03)
    box("phead", (xm, 0, 2.5), (0.5, 1.9, 0.5), blue, 0.04)
    cyl("piston", (xm, 0, 2.0), 0.14, 0.9, steel, verts=16)
    box("die", (xm, 0, 1.12), (0.7, 0.6, 0.18), dgrey, 0.03)
    for i in range(8): box("pstr%d" % i, (xm - 0.255, -0.9 + i * 0.26, 3.0), (0.02, 0.2, 0.1), yellow if i % 2 else dgrey)
    box("ctl", (xm + 1.4, 0.9, 1.3), (0.5, 0.35, 1.0), green, 0.03)
    for i in range(4): cyl("lamp%d" % i, (xm + 1.4, 1.08, 1.6 + i * 0.1), 0.03, 0.03, yellow if i % 2 else rust, axis="Y", verts=8)
    # the bin at the end and goods riding the belt
    box("bin", (L / 2 - 0.5, 0, 0.45), (1.0, 1.3, 0.9), green, 0.04); box("bin_in", (L / 2 - 0.5, 0, 0.82), (0.82, 1.12, 0.1), belt)
    for i in range(9):
        x = x0 + 2.5 + i * 1.0
        if abs(x - xm) < 0.8: continue
        box("good%d" % i, (x, rnd.uniform(-0.15, 0.15), 1.1), (0.32, 0.28, 0.24), rust if i % 2 else blue, 0.02)
    export("line")

# ------------------------------------------------------------------ a long wall-mounted electrical box with wires
def wallbox():
    reset()
    grey = mat("wb_grey", (0.42, 0.44, 0.46), 0.5, 0.7)
    dark = mat("wb_dark", (0.05, 0.05, 0.06), 0.6, 0.4)
    wire = mat("wb_wire", (0.02, 0.02, 0.025), 0.85)
    yellow = mat("wb_y", (0.8, 0.6, 0.05), 0.6)
    red = mat("wb_r", (0.55, 0.06, 0.05), 0.5)
    box("body", (0, 0.1, 1.4), (1.4, 0.2, 0.36), grey, 0.02)
    box("lid", (0, 0.21, 1.4), (1.34, 0.03, 0.3), dark, 0.01)
    for i in range(3): box("lat%d" % i, (-0.5 + i * 0.5, 0.235, 1.4), (0.12, 0.02, 0.06), grey)
    for i in range(6): cyl("bolt%d" % i, (-0.62 + i * 0.25, 0.235, 1.53), 0.018, 0.02, grey, axis="Y", verts=6)
    box("tag", (0.5, 0.235, 1.28), (0.18, 0.01, 0.08), yellow); box("tag2", (-0.5, 0.235, 1.28), (0.1, 0.01, 0.08), red)
    for i in range(7):  # conduit stubs out of the top and wires running up and over
        x = -0.6 + i * 0.2
        cyl("stub%d" % i, (x, 0.1, 1.64), 0.025, 0.14, grey, verts=8)
        tube("w%d" % i, [(x, 0.1, 1.7), (x + (i - 3) * 0.1, 0.16, 2.1), (x + (i - 3) * 0.28, 0.2, 2.6)], 0.013, wire, 4)
    for i in range(3): tube("wl%d" % i, [(-0.7, 0.1, 1.3 - i * 0.04), (-0.95, 0.14, 1.0), (-1.1, 0.12, 0.5)], 0.016, wire, 4)
    export("wallbox")

# ------------------------------------------------------------------ almond water bottles scattered in a pile
def bottles():
    reset()
    cols = [(0.2, 0.45, 0.75), (0.25, 0.6, 0.3), (0.8, 0.65, 0.1), (0.75, 0.2, 0.1), (0.5, 0.3, 0.65)]
    cap = mat("cap", (0.9, 0.9, 0.92), 0.4)
    for k in range(34):
        c = cols[k % len(cols)]; m = mat("bottle%d" % (k % len(cols)), c, 0.25)
        x, y = rnd.gauss(0, 0.45), rnd.gauss(0, 0.35)
        z = 0.09 if rnd.random() < 0.6 else 0.09 + rnd.random() * 0.12
        ang = rnd.random() * math.pi * 2
        b = cyl("b%d" % k, (x, y, z), 0.045, 0.2, m, verts=10)
        nk = cyl("n%d" % k, (x, y, z + 0.12), 0.022, 0.06, m, verts=8)
        cp = cyl("c%d" % k, (x, y, z + 0.16), 0.024, 0.025, cap, verts=8)
        for o in (b, nk, cp):
            o.rotation_euler = (math.radians(90) * (0 if k % 4 else 1), 0, ang)
    export("bottles")

# ------------------------------------------------------------------ a security camera
def camera():
    reset()
    grey = mat("c_grey", (0.35, 0.36, 0.38), 0.4, 0.5)
    dark = mat("c_dark", (0.03, 0.03, 0.035), 0.3, 0.2)
    red = mat("c_red", (0.9, 0.05, 0.03), 0.4, 0.0, emit=(1, 0.1, 0.05))
    box("mount", (0, 0, 0.04), (0.18, 0.18, 0.04), grey, 0.005)
    cyl("arm", (0, 0, 0.12), 0.025, 0.14, grey, verts=10)
    box("body", (0, 0.1, 0.2), (0.14, 0.34, 0.12), grey, 0.02)
    cyl("lens", (0, 0.3, 0.2), 0.05, 0.08, dark, axis="Y", verts=16)
    cyl("glass", (0, 0.345, 0.2), 0.035, 0.01, red, axis="Y", verts=12)
    box("hood", (0, 0.12, 0.27), (0.16, 0.38, 0.015), grey)
    export("camera")

for name in only: globals()[name]()
