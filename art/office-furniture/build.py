# Level 0 office furniture: desk, office chair, steel shelf, copier. Fronts face Blender +Y (= engine -Z), feet at origin.
import bpy, bmesh, math, random, sys
from mathutils import Vector
OUT = "/workspace/office-furniture"
import os; os.makedirs(OUT, exist_ok=True)
random.seed(7)

def mat(name, rgb, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
M = {
 "wood": mat("wood", (0.42, 0.30, 0.18), 0.55),
 "laminate": mat("laminate", (0.62, 0.55, 0.42), 0.45),
 "metal": mat("metal", (0.38, 0.39, 0.37), 0.45, 0.8),
 "paint": mat("paint", (0.50, 0.50, 0.44), 0.55, 0.2),
 "fabric": mat("fabric", (0.12, 0.14, 0.20), 0.95),
 "plastic": mat("plastic", (0.70, 0.66, 0.55), 0.5),
 "rubber": mat("rubber", (0.04, 0.04, 0.04), 0.8),
 "glass": mat("glass", (0.08, 0.10, 0.10), 0.1),
}

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for k, v in list(M.items()): pass

def box(name, size, loc, m, bev=0.008, segs=2, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bev > 0:
        md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = segs; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o

def cyl(name, r, h, loc, m, rot=(0, 0, 0), v=12, bev=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = 2; md.limit_method = "ANGLE"
    return o

def finish(name, props):
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in objs:
        for md in list(o.modifiers): bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    bpy.ops.object.shade_auto_smooth(angle=math.radians(35)) if hasattr(bpy.ops.object, "shade_auto_smooth") else bpy.ops.object.shade_smooth()
    # proof
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 520
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.33, 0.28, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    bpy.ops.object.light_add(type="SUN", location=(3, 4, 6)); bpy.context.object.data.energy = 3; bpy.context.object.rotation_euler = (0.7, 0.2, 2.6)
    h = props["h"]
    for tag, pos in (("a", (2.2 * props["s"], 2.6 * props["s"], h * 1.3)), ("b", (-2.2 * props["s"], -2.4 * props["s"], h * 1.1))):
        bpy.ops.object.camera_add(location=pos); cam = bpy.context.object
        d = Vector((0, 0, h * 0.45)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
        sc.render.filepath = f"/tmp/of/{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, use_selection=True)
    print("TRIS", name, sum(len(p.vertices) - 2 for p in o.data.polygons))

# ---------- desk: 1.4 x 0.7, top at 0.76, pedestal of drawers left, steel legs right, back modesty panel
def desk():
    clear()
    box("top", (1.4, 0.7, 0.035), (0, 0, 0.742), M["laminate"], 0.006)
    box("edge", (1.41, 0.71, 0.012), (0, 0, 0.72), M["wood"], 0.004)
    box("ped", (0.42, 0.64, 0.70), (-0.47, 0, 0.36), M["paint"], 0.006)
    for i in range(3):
        z = 0.14 + i * 0.215
        box(f"dr{i}", (0.38, 0.012, 0.19), (-0.47, -0.326, z), M["paint"], 0.004)
        box(f"pull{i}", (0.12, 0.018, 0.018), (-0.47, -0.336, z + 0.06), M["metal"], 0.004)
    for x in (0.64,):
        for y in (-0.29, 0.29): box(f"leg{y}", (0.045, 0.045, 0.72), (x, y, 0.36), M["paint"], 0.01)
        box("foot", (0.06, 0.64, 0.03), (x, 0, 0.015), M["paint"], 0.008)
    box("modesty", (0.92, 0.015, 0.42), (0.18, 0.31, 0.47), M["paint"], 0.004)
    box("crossbar", (0.92, 0.025, 0.025), (0.18, 0.28, 0.69), M["paint"], 0.006)
    # clutter: a folder and a mug ring of papers
    box("folder", (0.32, 0.24, 0.02), (0.3, -0.05, 0.77), M["plastic"], 0.003, rot=(0, 0, 0.3))
    box("paper", (0.22, 0.3, 0.004), (-0.1, 0.08, 0.761), mat("paperm", (0.85, 0.83, 0.74), 0.9), 0.0, rot=(0, 0, -0.2))
    cyl("mug", 0.04, 0.09, (-0.5, 0.15, 0.805), mat("mugm", (0.75, 0.72, 0.62), 0.4), v=16)
    finish("desk", {"h": 0.8, "s": 0.8})

# ---------- office chair: five-star base, gas lift, padded seat, curved back, arms; faces +Y (engine -Z)
def chair():
    clear()
    for i in range(5):
        a = i * 2 * math.pi / 5
        box(f"arm{i}", (0.30, 0.045, 0.03), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.075), M["plastic" if False else "metal"], 0.01, rot=(0, 0, a))
        cyl(f"cast{i}", 0.028, 0.03, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.03), M["rubber"], rot=(math.pi / 2, 0, a + math.pi / 2), v=10)
    cyl("hub", 0.04, 0.05, (0, 0, 0.09), M["metal"], v=12)
    cyl("lift", 0.022, 0.30, (0, 0, 0.25), M["metal"], v=12)
    cyl("liftcover", 0.03, 0.12, (0, 0, 0.17), M["rubber"], v=12)
    box("plate", (0.24, 0.24, 0.02), (0, 0, 0.405), M["metal"], 0.005)
    box("seat", (0.48, 0.47, 0.08), (0, 0.01, 0.455), M["fabric"], 0.035, 4)
    box("spine", (0.06, 0.03, 0.36), (0, -0.25, 0.53), M["metal"], 0.01, rot=(0.15, 0, 0))
    bk = box("back", (0.44, 0.07, 0.48), (0, -0.27, 0.78), M["fabric"], 0.035, 4, rot=(-0.12, 0, 0))
    sb = bk.modifiers.new("bend", "SIMPLE_DEFORM"); sb.deform_method = "BEND"; sb.angle = math.radians(-25); sb.deform_axis = "Z"
    for s in (-1, 1):
        box(f"armp{s}", (0.03, 0.04, 0.2), (s * 0.25, -0.05, 0.56), M["metal"], 0.008)
        box(f"armr{s}", (0.06, 0.26, 0.03), (s * 0.25, 0.0, 0.675), M["rubber"], 0.012, 3)
    finish("chair", {"h": 1.0, "s": 0.6})

# ---------- steel shelving: 4 angle posts, 5 shelves with lips, a few boxes and binders
def shelf():
    clear()
    for x in (-0.5, 0.5):
        for y in (-0.19, 0.19):
            box(f"post{x}{y}", (0.035, 0.035, 1.92), (x, y, 0.96), M["paint"], 0.004)
            box(f"foot{x}{y}", (0.05, 0.05, 0.02), (x, y, 0.01), M["rubber"], 0.004)
    for i in range(5):
        z = 0.08 + i * 0.44
        box(f"sh{i}", (1.0, 0.38, 0.012), (0, 0, z), M["paint"], 0.003)
        for y in (-0.19, 0.19): box(f"lip{i}{y}", (1.0, 0.012, 0.03), (0, y, z + 0.01), M["paint"], 0.003)
    for y in (-0.19, 0.19): box(f"brace{y}", (0.012, 0.012, 1.25), (0, y, 1.0), M["paint"], 0, rot=(0, 0.64, 0))
    card = mat("cardboard", (0.48, 0.36, 0.22), 0.9); binder = mat("binder", (0.2, 0.25, 0.32), 0.6)
    for i in range(4):
        z = 0.09 + i * 0.44
        if i % 2 == 0: box(f"box{i}", (0.34, 0.3, 0.24), (-0.22 + i * 0.05, 0, z + 0.12), card, 0.01, rot=(0, 0, 0.05 * (i - 1)))
        else:
            for k in range(5): box(f"bind{i}{k}", (0.045, 0.27, 0.30), (0.12 + k * 0.05, 0, z + 0.15), binder, 0.004, rot=(0, (0.25 if k == 4 else 0), 0))
    finish("shelf", {"h": 1.95, "s": 1.0})

# ---------- copier: rounded beige body, dark lid, paper trays, control panel, output tray
def copier():
    clear()
    box("body", (0.9, 0.64, 0.82), (0, 0, 0.47), M["plastic"], 0.03, 3)
    box("base", (0.88, 0.62, 0.06), (0, 0, 0.03), M["rubber"], 0.01)
    for i in range(3): box(f"tray{i}", (0.82, 0.012, 0.16), (0, 0.322, 0.16 + i * 0.19), mat("trayf", (0.62, 0.59, 0.50), 0.5), 0.004)
    for i in range(3): box(f"grip{i}", (0.18, 0.02, 0.025), (0, 0.33, 0.21 + i * 0.19), M["rubber"], 0.006)
    box("lid", (0.92, 0.66, 0.07), (0, 0, 0.915), mat("lidm", (0.15, 0.15, 0.16), 0.5), 0.02, 3)
    box("panel", (0.34, 0.18, 0.04), (0.24, 0.27, 0.9), mat("panelm", (0.25, 0.25, 0.26), 0.5), 0.01, rot=(0.35, 0, 0))
    box("screen", (0.14, 0.08, 0.005), (0.2, 0.30, 0.925), M["glass"], 0, rot=(0.35, 0, 0))
    box("led", (0.015, 0.015, 0.006), (0.36, 0.31, 0.915), mat("ledm", (0.1, 0.8, 0.25), 0.3), 0, rot=(0.35, 0, 0))
    box("out", (0.24, 0.44, 0.015), (-0.56, 0, 0.62), M["plastic"], 0.004, rot=(0, 0.12, 0))
    box("outpaper", (0.2, 0.28, 0.01), (-0.55, 0, 0.635), mat("paperm", (0.85, 0.83, 0.74), 0.9), 0, rot=(0, 0.12, 0))
    finish("copier", {"h": 1.0, "s": 0.8})

for f in (desk, chair, shelf, copier): f()
