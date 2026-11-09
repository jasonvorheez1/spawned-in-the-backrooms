# Zenith Station furniture III: galley counter (3 x 0.66 x 0.92), hydroponic grow bed (3.6 x 1 x 0.78 + light rig),
# treadmill (0.84 x 2.0), cargo case (1.2 x 0.8 x 0.8, scaled per placement). Front = Blender -Y.
import bpy, math, random
from mathutils import Vector
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, metal=0.0, rough=0.5, emit=None, es=2.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    return m
WHITE = mat("composite", (0.82, 0.81, 0.77), 0.05, 0.45); STEEL = mat("steel", (0.55, 0.57, 0.6), 0.85, 0.3)
DARK = mat("dark_trim", (0.03, 0.033, 0.038), 0.4, 0.45); TEAL = mat("teal", (0.12, 0.38, 0.42), 0.2, 0.4)
BRUSH = mat("brushed_top", (0.62, 0.64, 0.66), 0.9, 0.22); HOB = mat("hob_glass", (0.01, 0.01, 0.012), 0.1, 0.08)
RUB = mat("rubber", (0.02, 0.02, 0.022), 0, 0.85); SOIL = mat("substrate", (0.09, 0.06, 0.04), 0, 0.95)
LEAF = mat("leaf", (0.16, 0.42, 0.12), 0, 0.6); DEAD = mat("dead_leaf", (0.35, 0.28, 0.12), 0, 0.8)
GROW = mat("grow_light", (1, 0.4, 0.9), 0, 0.3, emit=(1, 0.35, 0.85), es=5); YEL = mat("hazard", (0.75, 0.55, 0.05), 0.1, 0.5)
ORNG = mat("case_shell", (0.3, 0.33, 0.35), 0.3, 0.55); RED = mat("ring_red", (0.9, 0.1, 0.05), 0, 0.4, emit=(1, 0.1, 0.05), es=3)
def box(size, loc, m, bev=0.006, seg=2, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size
    if rot: o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(r, d, loc, m, rot=(0, 0, 0), v=16, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=v)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=d, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object; o.data.materials.append(m); return o
def join(objs, name):
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.shade_smooth_by_angle(angle=0.55)
    bpy.context.scene.cursor.location = (0, 0, 0); bpy.ops.object.origin_set(type="ORIGIN_CURSOR"); return o
def export(o, path):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)

def counter():
    P = []; W, D, H = 3.0, 0.66, 0.92
    P.append(box((W, D, 0.04), (0, 0, H - 0.02), BRUSH, 0.006, 3))
    P.append(box((W - 0.04, D - 0.06, H - 0.14), (0, 0.02, (H - 0.14) / 2 + 0.1), WHITE, 0.006))
    P.append(box((W - 0.04, D - 0.1, 0.1), (0, 0.04, 0.05), DARK, 0.004))
    for i in range(5):
        x = -W / 2 + 0.3 + i * 0.6
        if i == 2:   # oven/dish unit
            P.append(box((0.56, 0.02, 0.55), (x, -D / 2 + 0.035, 0.45), DARK, 0.01, 3))
            P.append(box((0.4, 0.01, 0.22), (x, -D / 2 + 0.025, 0.44), HOB, 0.004))
            P.append(box((0.4, 0.03, 0.02), (x, -D / 2 + 0.01, 0.68), STEEL, 0.006))
        else:
            P.append(box((0.56, 0.02, 0.18), (x, -D / 2 + 0.035, 0.72), WHITE, 0.004))
            P.append(box((0.56, 0.02, 0.48), (x, -D / 2 + 0.035, 0.37), WHITE, 0.004))
            P.append(box((0.2, 0.02, 0.016), (x, -D / 2 + 0.02, 0.76), STEEL, 0.004))
            P.append(box((0.016, 0.02, 0.2), (x + 0.22, -D / 2 + 0.02, 0.5), STEEL, 0.004))
    # sink basin (sunk into top), tap, hob, kettle, mugs, a tray
    P.append(box((0.5, 0.38, 0.012), (-0.95, -0.02, H + 0.001), STEEL, 0.02, 3))
    P.append(box((0.44, 0.32, 0.01), (-0.95, -0.02, H + 0.004), DARK, 0.01))
    P.append(cyl(0.015, 0.28, (-0.95, 0.2, H + 0.14), STEEL)); P.append(cyl(0.013, 0.18, (-0.95, 0.12, H + 0.28), STEEL, rot=(1.57, 0, 0)))
    P.append(box((0.6, 0.45, 0.008), (0.75, -0.02, H + 0.004), HOB, 0.004))
    for cx, cy in ((0.6, -0.12), (0.9, 0.08)): P.append(cyl(0.09, 0.002, (cx, cy, H + 0.01), RED, v=24))
    P.append(cyl(0.08, 0.2, (0.6, -0.12, H + 0.11), STEEL, v=20, r2=0.06)); P.append(box((0.03, 0.12, 0.12), (0.6, 0.0, H + 0.13), DARK, 0.01))
    for k in range(3): P.append(cyl(0.04, 0.09, (-0.2 + k * 0.12, 0.1 + (k % 2) * 0.06, H + 0.045), (TEAL, WHITE, DARK)[k], v=14))
    P.append(box((0.4, 0.28, 0.02), (0.1, -0.05, H + 0.01), DARK, 0.008))
    P.append(box((W, 0.03, 0.03), (0, D / 2 - 0.02, H + 0.015), TEAL, 0.004))  # splash strip at the wall
    return join(P, "counter")

def growbed():
    P = []; W, D, H = 3.6, 1.0, 0.78
    P.append(box((W, D, 0.3), (0, 0, H - 0.15), WHITE, 0.02, 3))           # trough
    P.append(box((W - 0.1, D - 0.1, 0.02), (0, 0, H - 0.04), SOIL, 0.004))
    for sx in (-1, 1):
        for sy in (-1, 1): P.append(box((0.06, 0.06, H - 0.3), (sx * (W / 2 - 0.1), sy * (D / 2 - 0.1), (H - 0.3) / 2), STEEL, 0.006))
    P.append(box((W - 0.2, 0.04, 0.04), (0, D / 2 - 0.1, 0.2), STEEL, 0.006)); P.append(box((W - 0.2, 0.04, 0.04), (0, -D / 2 + 0.1, 0.2), STEEL, 0.006))
    P.append(cyl(0.025, W - 0.1, (0, D / 2 - 0.12, H + 0.01), TEAL, rot=(0, 1.57, 0)))   # irrigation line
    for x in (-1.2, 0, 1.2): P.append(cyl(0.02, 0.45, (x, -D / 2 + 0.6, H - 0.2), STEEL, rot=(0, 0, 0)))
    # light rig on two posts
    for sx in (-1, 1): P.append(box((0.05, 0.05, 1.2), (sx * (W / 2 - 0.1), 0, H + 0.6), STEEL, 0.006))
    P.append(box((W - 0.1, 0.12, 0.05), (0, 0, H + 1.2), DARK, 0.008)); P.append(box((W - 0.3, 0.08, 0.01), (0, 0, H + 1.17), GROW, 0.002))
    # plants: rows of leafy rosettes, some dead
    for r in range(3):
        for c in range(9):
            x = -W / 2 + 0.3 + c * 0.38 + random.uniform(-0.04, 0.04); y = -0.3 + r * 0.3
            dead = random.random() < 0.22; m = DEAD if dead else LEAF; h = random.uniform(0.08, 0.22) * (0.5 if dead else 1)
            for k in range(5):
                a = k * 1.2566 + random.random() * 0.4
                P.append(box((0.03, 0.13, 0.008), (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, H - 0.02 + h * 0.6), m, 0, rot=(0.6 + random.random() * 0.4, 0, a + 1.57)))
            P.append(cyl(0.008, h, (x, y, H - 0.02 + h / 2), m, v=6))
    return join(P, "growbed")

def treadmill():
    P = []
    P.append(box((0.84, 1.9, 0.16), (0, 0.05, 0.1), DARK, 0.02, 3))
    P.append(box((0.56, 1.7, 0.02), (0, 0.05, 0.19), RUB, 0.004))
    for sx in (-1, 1):
        P.append(box((0.1, 1.75, 0.04), (sx * 0.36, 0.05, 0.2), WHITE, 0.01))
        P.append(box((0.06, 0.08, 1.1), (sx * 0.36, -0.82, 0.7), WHITE, 0.012, 2, rot=(-0.18, 0, 0)))
        P.append(box((0.05, 0.45, 0.05), (sx * 0.36, -0.68, 1.12), DARK, 0.015))
    P.append(box((0.8, 0.22, 0.32), (0, -0.98, 1.3), WHITE, 0.03, 3, rot=(0.5, 0, 0)))
    P.append(box((0.4, 0.01, 0.16), (0, -0.92, 1.36), TEAL, 0.004, 2, rot=(0.5, 0, 0)))
    P.append(box((0.84, 0.06, 0.04), (0, 0.96, 0.05), YEL, 0.006))
    return join(P, "treadmill")

def case():
    P = []; W, D, H = 1.2, 0.8, 0.8
    P.append(box((W, D, H - 0.06), (0, 0, (H - 0.06) / 2 + 0.06), ORNG, 0.04, 3))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((0.14, 0.14, H), (sx * (W / 2 - 0.05), sy * (D / 2 - 0.05), H / 2), DARK, 0.03, 3))
    P.append(box((W + 0.02, D + 0.02, 0.04), (0, 0, H * 0.62), DARK, 0.01))           # lid seam band
    for sx in (-1, 1): P.append(box((0.16, 0.05, 0.05), (sx * 0.3, -D / 2 - 0.01, H * 0.62), STEEL, 0.01))   # latches
    P.append(box((0.36, 0.01, 0.12), (0, -D / 2 - 0.005, H * 0.35), YEL, 0.003))
    P.append(box((0.3, 0.012, 0.03), (0, -D / 2 - 0.006, H * 0.35), DARK, 0.002))
    P.append(box((0.3, 0.05, 0.04), (0, 0, H + 0.01), DARK, 0.015))                   # top handle
    return join(P, "case")

out = {"counter": counter(), "growbed": growbed(), "treadmill": treadmill(), "case": case()}
for k, o in out.items(): export(o, f"/tmp/zfurn/{k}.glb")
xs = {"counter": -4.5, "growbed": -0.3, "treadmill": 3.0, "case": 4.8}
for k, o in out.items(): o.location = (xs[k], 0, 0)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 1400; sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
bpy.ops.object.light_add(type="AREA", location=(0, -5, 4)); L = bpy.context.object; L.data.energy = 1500; L.data.size = 5; L.rotation_euler = (0.8, 0, 0)
bpy.ops.object.camera_add(location=(0.3, -8, 3.6)); cam = bpy.context.object; sc.camera = cam
d = Vector((0.2, 0, 0.7)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 30
sc.render.filepath = "/tmp/zfurn/proof3.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get()
for k, o in out.items(): print(k, "tris", len(o.evaluated_get(dg).data.loop_triangles), [round(v, 2) for v in o.dimensions])
