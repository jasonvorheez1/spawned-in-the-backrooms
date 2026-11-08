# Level 6.1 counters and benches: paneled wood bars (Clippers, Liquorette), chrome diner counter (Burger Bop), pizza counter with a warm glass case (Slice Palace), slatted mall bench.
# Built front at Blender -Y (glTF +Z), length on X, origin bottom centre. One pass: build, proof, export.
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
OUT = "/workspace/snackrooms"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/snk", exist_ok=True)
def clear(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, color, metal=0.0, rough=0.5, alpha=1.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    if emit: b.inputs["Emission Color"].default_value = (*color, 1); b.inputs["Emission Strength"].default_value = emit
    return m
def put(o, m): o.data.materials.clear(); o.data.materials.append(m); return o
def bevel(o, w, seg=2):
    md = o.modifiers.new("b", "BEVEL"); md.width = w; md.segments = seg; md.limit_method = "ANGLE"; o.modifiers.new("n", "WEIGHTED_NORMAL"); return o
def box(sx, sy, sz, x, y, z):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z + sz / 2)); o = bpy.context.object; o.scale = (sx / 2, sy / 2, sz / 2); bpy.ops.object.transform_apply(scale=True); return o
def rod(r, length, x, y, z, axis="X", v=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=length, location=(x, y, z)); o = bpy.context.object
    if axis == "X": o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Y": o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True); return o
def finish(name, dist, h, L):
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            for p in o.data.polygons: p.use_smooth = True
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); bpy.context.object.name = name
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    bpy.ops.object.light_add(type="AREA", location=(L * 0.3, -dist, dist)); Lt = bpy.context.object; Lt.data.energy = 900 * dist; Lt.data.size = L
    Lt.rotation_euler = (math.radians(55), 0, 0)
    bpy.ops.object.light_add(type="AREA", location=(0, dist, dist)); Lb = bpy.context.object; Lb.data.energy = 400 * dist; Lb.data.size = L; Lb.rotation_euler = (math.radians(-55), 0, 0)
    for k, (ax, ay, az) in enumerate([(0.55, -1, 0.55), (-0.3, 1, 0.6), (0, -0.4, 1.6)]):
        bpy.ops.object.camera_add(location=(ax * dist, ay * dist, h * 0.6 + az * dist * 0.6)); c = bpy.context.object
        c.rotation_euler = (c.location * -1 + bpy.mathutils.Vector((0, 0, h * 0.5)) if False else None) or c.rotation_euler
        import mathutils; d = mathutils.Vector((0, 0, h * 0.5)) - c.location; c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.camera = c; sc.render.filepath = f"/tmp/snk/{name}_{k}.png"; bpy.ops.render.render(write_still=True)
    for o in list(sc.objects):
        if o.type != "MESH": bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True)
    dg = bpy.context.evaluated_depsgraph_get(); print(name, "tris", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in sc.objects if o.type == "MESH"))

def bar(name, L, D, H):  # dark wood saloon bar: kick base, raised front panels, bullnose top with overhang, brass foot rail on posts
    clear()
    W = mat("wood", (0.13, 0.05, 0.025), 0, 0.45); T = mat("top", (0.09, 0.035, 0.018), 0, 0.25); B = mat("brass", (0.85, 0.6, 0.25), 1, 0.25)
    put(bevel(box(L - 0.06, D - 0.12, 0.12, 0, 0.02, 0), 0.01), W)                       # kick
    put(bevel(box(L, D - 0.06, H - 0.2, 0, 0, 0.1), 0.012), W)                            # body
    n = max(2, round(L / 0.9)); pw = (L - 0.1) / n
    for i in range(n):                                                                     # raised panels + frame rails
        x = -L / 2 + 0.05 + pw * (i + 0.5)
        put(bevel(box(pw - 0.14, 0.03, H - 0.52, x, -(D - 0.06) / 2 - 0.01, 0.26), 0.015, 3), W)
        put(bevel(box(pw - 0.24, 0.02, H - 0.64, x, -(D - 0.06) / 2 - 0.035, 0.32), 0.01, 3), W)
    put(bevel(box(L + 0.08, D + 0.12, 0.06, 0, -0.03, H - 0.1), 0.025, 4), T)            # top slab with bullnose
    put(bevel(box(L + 0.04, D + 0.08, 0.04, 0, -0.03, H - 0.14), 0.012), W)              # apron under top
    put(rod(0.025, L - 0.1, 0, -D / 2 - 0.22, 0.2, "X"), B)                                # foot rail
    for i in range(int(L / 1.4) + 1):
        x = -L / 2 + 0.1 + i * (L - 0.2) / int(L / 1.4)
        put(rod(0.012, 0.2, x, -D / 2 - 0.12, 0.2, "Y", 10), B)
    put(rod(0.018, L, 0, -D / 2 - 0.05, H - 0.02, "X"), B)                                # brass drink rail on the lip
    finish(name, max(3.0, L * 0.7), H, L)

def diner(name, L, D, H):  # 50s diner: white formica front with red band and chrome strips, chrome-edged top, toe recess
    clear()
    F = mat("formica", (0.85, 0.83, 0.78), 0, 0.3); R = mat("band", (0.6, 0.03, 0.03), 0, 0.3); C = mat("chrome", (0.8, 0.8, 0.82), 1, 0.15); T = mat("top", (0.5, 0.75, 0.75), 0, 0.2)
    put(box(L - 0.1, D - 0.2, 0.12, 0, 0.05, 0), mat("toe", (0.05, 0.05, 0.05), 0.5, 0.5))
    put(bevel(box(L, D - 0.1, H - 0.17, 0, 0, 0.12), 0.02, 3), F)
    put(bevel(box(L + 0.004, D - 0.096, 0.16, 0, 0, 0.5), 0.01), R)
    for z in (0.48, 0.67): put(box(L + 0.01, D - 0.09, 0.015, 0, 0, z), C)
    for i in range(int(L / 1.2) + 1): put(box(0.012, 0.01, H - 0.3, -L / 2 + i * L / int(L / 1.2), -(D - 0.1) / 2 - 0.004, 0.14), C)
    put(bevel(box(L + 0.06, D + 0.06, 0.045, 0, -0.02, H - 0.05), 0.015, 3), T)
    put(box(L + 0.07, D + 0.07, 0.02, 0, -0.02, H - 0.065), C)
    finish(name, max(3.0, L * 0.7), H, L)

def pizza(name, L, D, H):  # red-tiled counter, steel top, a curved warm glass case on the left half with pizzas inside
    clear()
    Rt = mat("tile", (0.55, 0.05, 0.03), 0, 0.35); S = mat("steel", (0.7, 0.7, 0.72), 1, 0.3); G = mat("glass", (0.9, 0.95, 0.95), 0, 0.05, 0.25)
    P = mat("pizza", (0.85, 0.45, 0.12), 0, 0.6); Lm = mat("lamp", (1.0, 0.7, 0.35), 0, 0.5, 1, 4)
    put(box(L - 0.1, D - 0.2, 0.1, 0, 0.05, 0), mat("toe", (0.05, 0.05, 0.05), 0.5, 0.5))
    put(bevel(box(L, D, H - 0.14, 0, 0, 0.1), 0.01), Rt)
    for i in range(int(L / 0.15)): put(box(0.006, 0.006, H - 0.2, -L / 2 + 0.075 + i * 0.15, -D / 2 - 0.001, 0.12), mat("grout", (0.8, 0.78, 0.72), 0, 0.8))
    put(bevel(box(L + 0.05, D + 0.05, 0.04, 0, 0, H - 0.04), 0.01), S)
    cw = L * 0.45; cx = -L / 2 + cw / 2 + 0.2
    put(box(cw, D - 0.1, 0.02, cx, 0, H), S)
    for k in range(3): bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.2, depth=0.03, location=(cx - cw / 3 + k * cw / 3, 0.05, H + 0.04)); put(bpy.context.object, P)
    ch = 0.42; gd = D - 0.12
    put(box(cw, 0.008, ch, cx, -gd / 2, H + 0.02), G); put(box(cw, 0.008, ch, cx, gd / 2, H + 0.02), G)
    for x in (cx - cw / 2, cx + cw / 2): put(box(0.008, gd, ch, x, 0, H + 0.02), G)
    put(box(cw, gd, 0.008, cx, 0, H + 0.02 + ch), G)
    for x in (cx - cw / 2, cx + cw / 2):
        for y in (-gd / 2, gd / 2): put(box(0.025, 0.025, ch + 0.02, x, y, H + 0.02), S)
    put(bevel(box(cw + 0.04, gd + 0.04, 0.03, cx, 0, H + 0.03 + ch), 0.008), S)
    put(box(cw - 0.1, 0.04, 0.02, cx, 0, H + ch - 0.01), Lm)
    put(bevel(box(0.4, 0.35, 0.3, L / 2 - 0.6, 0.05, H), 0.01), S)   # register
    finish(name, max(3.0, L * 0.7), H + 0.4, L)

def bench(name):  # mall bench: six oak slats on two cast-steel ends
    clear()
    Wd = mat("wood", (0.45, 0.25, 0.1), 0, 0.5); St = mat("steel", (0.15, 0.15, 0.16), 0.8, 0.4)
    for i in range(6): put(bevel(box(2.6, 0.085, 0.04, 0, -0.27 + i * 0.105, 0.41), 0.012, 3), Wd)
    for x in (-1.05, 1.05):
        put(bevel(box(0.06, 0.6, 0.05, x, 0, 0.36), 0.01), St)
        for y in (-0.24, 0.24): put(bevel(box(0.06, 0.06, 0.36, x, y, 0), 0.01), St)
        put(bevel(box(0.06, 0.6, 0.03, x, 0, 0.0), 0.01), St)
    finish(name, 2.6, 0.45, 2.6)

which = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "all"
jobs = {"bar10": lambda: bar("l61-bar10", 10, 0.7, 1.05), "bar7": lambda: bar("l61-bar7", 7, 0.8, 1.1),
        "diner": lambda: diner("l61-diner10", 10, 0.8, 1.05), "pizza": lambda: pizza("l61-pizza9", 9, 0.9, 1.0), "bench": lambda: bench("l61-bench")}
for k, f in jobs.items():
    if which in ("all", k): f()
