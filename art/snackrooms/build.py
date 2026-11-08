# Level 6.1 Snackrooms furniture: mall food-court table set, vending machine, chrome diner stool. One pass: build, proof, export.
import bpy, bmesh, math, os
OUT = "/workspace/snackrooms"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/snk", exist_ok=True)
def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, color, metal=0.0, rough=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    return m
def put(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o
def bevel(o, w, seg=3):
    md = o.modifiers.new("b", "BEVEL"); md.width = w; md.segments = seg; md.limit_method = "ANGLE"
    o.modifiers.new("n", "WEIGHTED_NORMAL"); return o
def cyl(r1, r2, h, z, v=32, name="c"):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=h, location=(0, 0, z + h / 2)); o = bpy.context.object; o.name = name; return o
def box(sx, sy, sz, x, y, z, name="b"):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z + sz / 2)); o = bpy.context.object; o.scale = (sx / 2, sy / 2, sz / 2); bpy.ops.object.transform_apply(scale=True); o.name = name; return o
def smooth_all():
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            for p in o.data.polygons: p.use_smooth = True
def join(name):
    bpy.ops.object.select_all(action="SELECT"); objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        for md in list(o.modifiers): bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR"); return o
def proof(name, dist, h):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    bpy.ops.object.light_add(type="AREA", location=(dist, -dist, dist * 1.4)); L = bpy.context.object; L.data.energy = 600 * dist; L.data.size = 3
    L.rotation_euler = (math.radians(50), 0, math.radians(45))
    for k, (ax, ay) in enumerate([(1, -1), (-1, 1), (0.3, -1)]):
        bpy.ops.object.camera_add(location=(ax * dist, ay * dist, h * 1.3 + dist * 0.4)); c = bpy.context.object
        d = c.location.copy(); d.z -= h * 0.5; c.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); c.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.camera = c; sc.render.filepath = f"/tmp/snk/{name}_{k}.png"; bpy.ops.render.render(write_still=True)
def export(name):
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH": bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True)
    dg = bpy.context.evaluated_depsgraph_get(); print(name, "tris", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in bpy.context.scene.objects if o.type == "MESH"))

# ---------- table set: navy laminate top with chrome edge band, cast pedestal, four molded fibreglass chairs on chrome legs
clear()
NAVY = mat("navy_laminate", (0.03, 0.05, 0.2), 0.0, 0.35); CHROME = mat("chrome", (0.8, 0.8, 0.82), 1.0, 0.18); SEAT = mat("navy_plastic", (0.04, 0.07, 0.25), 0.0, 0.4)
put(cyl(0.62, 0.62, 0.035, 0.705, 48, "top"), NAVY)
put(bevel(cyl(0.625, 0.625, 0.025, 0.7, 48, "edge"), 0.008), CHROME)
put(cyl(0.05, 0.05, 0.62, 0.08, 24, "post"), CHROME)
put(bevel(cyl(0.3, 0.12, 0.08, 0.0, 32, "foot"), 0.02), CHROME)
for a in range(4):
    r = math.radians(a * 90 + 45); cx, cy = math.cos(r) * 0.92, math.sin(r) * 0.92
    parts = []
    s = box(0.44, 0.42, 0.04, 0, 0, 0.44, "seat"); bevel(s, 0.03, 4); put(s, SEAT); parts.append(s)
    bk = box(0.42, 0.035, 0.36, 0, 0.21, 0.52, "back"); bk.rotation_euler.x = math.radians(-10); bevel(bk, 0.03, 4); put(bk, SEAT); parts.append(bk)
    for lx in (-0.18, 0.18):
        for ly in (-0.17, 0.17):
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=0.46, location=(lx, ly, 0.22)); l = bpy.context.object; put(l, CHROME); parts.append(l)
    for lx in (-0.18, 0.18):
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=0.36, location=(lx, 0.2, 0.62)); l = bpy.context.object; l.rotation_euler.x = math.radians(-10); put(l, CHROME); parts.append(l)
    for p in parts:
        p.location.x, p.location.y = p.location.x, p.location.y
        M = __import__("mathutils").Matrix.Rotation(r + math.pi / 2, 4, "Z")
        p.matrix_world = __import__("mathutils").Matrix.Translation((cx, cy, 0)) @ M @ p.matrix_world
smooth_all(); join("table_set"); proof("table", 2.4, 0.9); export("l61-table-set")

# ---------- vending machine: rounded steel cabinet, recessed glass window (slot "front" takes the painted fascia), keypad panel, push flap
clear()
BODY = mat("cabinet", (0.02, 0.02, 0.025), 0.4, 0.4); FRONT = mat("front", (0.9, 0.9, 0.9), 0.0, 0.1); TRIM = mat("chrome", (0.8, 0.8, 0.82), 1.0, 0.2); PANEL = mat("panel", (0.05, 0.05, 0.06), 0.3, 0.5)
b = box(1.0, 0.85, 1.85, 0, 0, 0, "cab"); bevel(b, 0.025, 3); put(b, BODY)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
me = bpy.data.meshes.new("win"); bm.to_mesh(me); w = bpy.data.objects.new("win", me); bpy.context.collection.objects.link(w)
w.scale = (0.72, 1.32, 1); w.rotation_euler.x = math.radians(90); w.location = (-0.1, -0.432, 0.38 + 0.66)
bpy.context.view_layer.objects.active = w; w.select_set(True); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
put(w, FRONT)
for (sx, sz, x, z) in [(0.76, 0.03, -0.1, 0.35), (0.76, 0.03, -0.1, 1.71), (0.03, 1.39, -0.48, 0.35), (0.03, 1.39, 0.28, 0.35)]:
    t = box(sx, 0.04, sz, x, -0.43, z); bevel(t, 0.006, 2); put(t, TRIM)
p = box(0.2, 0.03, 0.75, 0.38, -0.435, 0.85, "keypad"); bevel(p, 0.008, 2); put(p, PANEL)
for i in range(4):
    for j in range(3):
        k = box(0.035, 0.02, 0.03, 0.33 + j * 0.05, -0.452, 1.0 + i * 0.05); put(k, TRIM)
f = box(0.62, 0.05, 0.18, -0.1, -0.44, 0.1, "flap"); bevel(f, 0.01, 2); put(f, PANEL)
for x in (-0.42, 0.42):
    for y in (-0.35, 0.35): put(cyl(0.03, 0.03, 0.03, -0.03, 12), PANEL).location.xy = (x, y)
smooth_all(); join("vend"); proof("vend", 2.6, 1.9); export("l61-vend")

# ---------- diner stool: chrome pedestal, flared foot ring, tufted vinyl cushion (slot "vinyl")
clear()
CH = mat("chrome", (0.8, 0.8, 0.82), 1.0, 0.18); V = mat("vinyl", (0.7, 0.06, 0.05), 0.0, 0.35)
put(bevel(cyl(0.22, 0.2, 0.03, 0.0, 32), 0.01), CH)
put(cyl(0.04, 0.035, 0.62, 0.03, 20), CH)
bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.012, location=(0, 0, 0.3)); put(bpy.context.object, CH)
for a in range(3):
    r = math.radians(a * 120); bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.008, depth=0.17, location=(math.cos(r) * 0.09, math.sin(r) * 0.09, 0.3)); o = bpy.context.object; o.rotation_euler = (0, math.pi / 2, r); put(o, CH)
put(bevel(cyl(0.2, 0.2, 0.025, 0.65, 32), 0.008), CH)
c = cyl(0.21, 0.2, 0.08, 0.675, 40, "cush"); bevel(c, 0.035, 5); put(c, V)
smooth_all(); join("stool"); proof("stool", 1.4, 0.8); export("l61-stool")
