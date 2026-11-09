# Zenith Station furniture II: locker banks (3 and 4 doors, one ajar), server rack, lab bench, two-high sleep pod.
# Glb front = +Z (Blender -Y). Each exported with origin at bottom centre.
import bpy, math, random
from mathutils import Vector
random.seed(4)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, metal=0.0, rough=0.5, emit=None, es=2.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND"
    return m
WHITE = mat("composite", (0.82, 0.81, 0.77), 0.05, 0.45); STEEL = mat("steel", (0.55, 0.57, 0.6), 0.85, 0.3)
DARK = mat("dark_trim", (0.03, 0.033, 0.038), 0.4, 0.45); TEAL = mat("teal", (0.12, 0.38, 0.42), 0.2, 0.4)
EPOXY = mat("epoxy_top", (0.02, 0.022, 0.025), 0.05, 0.18); GLASS = mat("glass", (0.75, 0.88, 0.9), 0, 0.05, alpha=0.35)
LEDG = mat("led_green", (0.1, 1, 0.3), 0, 0.3, emit=(0.2, 1, 0.35), es=4); LEDA = mat("led_amber", (1, 0.6, 0.1), 0, 0.3, emit=(1, 0.55, 0.1), es=4)
VENT = mat("vent", (0.01, 0.01, 0.012), 0.3, 0.8); MATT = mat("mattress", (0.32, 0.38, 0.44), 0, 0.95)
SHEET = mat("sheet", (0.8, 0.82, 0.83), 0, 0.95); WARM = mat("reading_light", (1, 0.85, 0.6), 0, 0.3, emit=(1, 0.8, 0.55), es=3)
def box(size, loc, m, bev=0.006, seg=2, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size
    if rot: o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(r, d, loc, m, rot=(0, 0, 0), v=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=v); o = bpy.context.object; o.data.materials.append(m); return o
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

def locker(n, ajar=None):
    P = []; W = n * 0.52; D = 0.48; H = 1.95
    P.append(box((W, D, 0.08), (0, 0, 0.04), DARK, 0.004))                       # kick plinth
    P.append(box((W, D - 0.02, H - 0.1), (0, 0.01, 0.08 + (H - 0.1) / 2), WHITE, 0.006))
    P.append(box((W + 0.02, D + 0.02, 0.03), (0, 0, H - 0.005), STEEL, 0.006))    # cap
    for i in range(n):
        x = -W / 2 + 0.26 + i * 0.52
        d = box((0.5, 0.022, H - 0.14), (0, 0, 0), WHITE, 0.006)
        bits = [d, box((0.3, 0.004, 0.012), (0, -0.013, 0.55), VENT, 0)] + [box((0.3, 0.004, 0.012), (0, -0.013, 0.55 + k * 0.03), VENT, 0) for k in range(1, 5)]
        bits += [box((0.03, 0.03, 0.14), (0.19, -0.022, 0.0), STEEL, 0.006), box((0.12, 0.004, 0.035), (0, -0.013, 0.82), TEAL, 0.002)]
        g = join(bits, f"door{i}")
        g.location = (x, -D / 2 - 0.005, 0.08 + (H - 0.14) / 2)
        if ajar == i:
            g.location.x -= 0.25; bpy.context.view_layer.objects.active = g
            bpy.context.scene.cursor.location = (x - 0.25, -D / 2, 0); bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
            g.rotation_euler = (0, 0, 1.0)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            g.location = (x - 0.25 + 0.0, -D / 2 - 0.005, 0) ; bpy.context.view_layer.objects.active = g
            P.append(box((0.46, 0.4, 0.02), (x, 0.0, 1.45), STEEL, 0.004))       # inside: a shelf, a hanging coat, a mug
            P.append(box((0.3, 0.12, 0.6), (x, 0.02, 1.0), MATT, 0.04, 3))
            P.append(cyl(0.035, 0.09, (x + 0.12, 0.0, 1.505), TEAL))
        P.append(g)
        P.append(box((0.006, 0.02, H - 0.14), (x - 0.257, -D / 2 - 0.004, 0.08 + (H - 0.14) / 2), DARK, 0))
    o = join(P, f"locker{n}")
    for v in o.data.vertices: v.co.y -= 0  # (feet = front-bottom handled by offset in the game)
    return o

def rack():
    P = []; W, D, H = 0.6, 1.0, 2.0
    P.append(box((W, D, H), (0, 0, H / 2), DARK, 0.01))
    for side in (-1, 1):
        y = side * (D / 2 + 0.006)
        P.append(box((W - 0.06, 0.012, H - 0.12), (0, y, H / 2), VENT, 0.002))
        for k in range(10):
            z = 0.12 + k * 0.175
            P.append(box((W - 0.1, 0.02, 0.15), (0, y, z + 0.075), DARK, 0.004))
            for j in range(random.randint(2, 5)):
                P.append(box((0.012, 0.01, 0.012), (-0.22 + j * 0.03, y + side * 0.012, z + 0.11), LEDG if random.random() > 0.2 else LEDA, 0))
            P.append(box((0.12, 0.01, 0.02), (0.15, y + side * 0.012, z + 0.06), STEEL, 0.002))
    for sx in (-1, 1):
        for sy in (-1, 1): P.append(cyl(0.025, 0.04, (sx * 0.24, sy * 0.44, 0.02), DARK))
    P.append(box((W + 0.02, D + 0.02, 0.03), (0, 0, H), STEEL, 0.006))
    return join(P, "rack")

def labbench():
    P = []; W, D, H = 3.0, 0.8, 0.92
    P.append(box((W, D, 0.035), (0, 0, H - 0.0175), EPOXY, 0.008, 3))
    for side in (-1, 1):
        y = side * 0.2
        P.append(box((W - 0.1, 0.36, H - 0.12), (0, y, (H - 0.12) / 2 + 0.06), WHITE, 0.006))
        P.append(box((W - 0.1, 0.36, 0.06), (0, y, 0.03), DARK, 0.004))
        for i in range(5):
            x = -W / 2 + 0.35 + i * 0.575
            P.append(box((0.54, 0.012, 0.3), (x, side * 0.385, 0.6), WHITE, 0.004))
            P.append(box((0.54, 0.012, 0.36), (x, side * 0.385, 0.24), WHITE, 0.004))
            P.append(box((0.18, 0.02, 0.016), (x, side * 0.395, 0.71), STEEL, 0.004))
    # reagent shelf on the spine
    for sx in (-1.3, 0, 1.3): P.append(box((0.04, 0.04, 0.6), (sx, 0, H + 0.3), STEEL, 0.006))
    P.append(box((W - 0.2, 0.22, 0.02), (0, 0, H + 0.45), GLASS, 0.004))
    P.append(box((W - 0.2, 0.22, 0.02), (0, 0, H + 0.6), STEEL, 0.004))
    for i in range(9):
        x = -1.2 + i * 0.3 + random.uniform(-0.05, 0.05)
        P.append(cyl(0.03 + random.random() * 0.02, 0.1 + random.random() * 0.1, (x, random.uniform(-0.05, 0.05), H + 0.66), GLASS))
    # sink and a goose-neck tap, an analyser, a microscope-ish block
    P.append(box((0.4, 0.3, 0.02), (1.1, -0.2, H + 0.002), STEEL, 0.004))
    P.append(cyl(0.012, 0.3, (1.1, -0.05, H + 0.15), STEEL)); P.append(cyl(0.012, 0.12, (1.1, -0.1, H + 0.3), STEEL, rot=(1.57, 0, 0)))
    P.append(box((0.42, 0.3, 0.26), (-0.9, -0.18, H + 0.13), WHITE, 0.02, 3)); P.append(box((0.2, 0.01, 0.1), (-0.9, -0.335, H + 0.17), TEAL, 0.002))
    P.append(box((0.14, 0.18, 0.06), (0.1, -0.2, H + 0.03), DARK, 0.01)); P.append(cyl(0.03, 0.3, (0.1, -0.15, H + 0.2), DARK, rot=(0.4, 0, 0)))
    return join(P, "labbench")

def pod():
    P = []; W, D = 2.2, 1.06
    for lvl in range(2):
        z0 = lvl * 1.15
        sh = box((W, D, 1.12), (0, 0.04, z0 + 0.56), WHITE, 0.08, 4)
        cut = box((W - 0.16, D, 0.92), (0, -0.12, z0 + 0.56), WHITE, 0.07, 4)
        md = sh.modifiers.new("cut", "BOOLEAN"); md.object = cut; md.operation = "DIFFERENCE"
        bpy.context.view_layer.objects.active = sh
        for m in list(sh.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(cut); P.append(sh)
        P.append(box((W - 0.22, D - 0.2, 0.14), (0, 0.06, z0 + 0.18), MATT, 0.04, 3))
        P.append(box((W - 0.5, D - 0.24, 0.03), (0.15, 0.06, z0 + 0.265), SHEET, 0.02, 2, rot=(0, 0.01 * (lvl + 1), 0.02)))
        P.append(box((0.4, 0.5, 0.1), (-0.78, 0.1, z0 + 0.3), SHEET, 0.04, 3))
        P.append(box((0.3, 0.04, 0.03), (-0.6, 0.48, z0 + 0.95), WARM, 0.01))
        P.append(box((W, 0.03, 0.03), (0, -D / 2 + 0.02, z0 + 1.08), TEAL, 0.004))
        P.append(box((0.08, 0.02, 0.12), (W / 2 - 0.15, -D / 2 + 0.01, z0 + 0.7), DARK, 0.004))
    P.append(box((0.05, 0.05, 1.5), (W / 2 + 0.03, -D / 2 + 0.1, 0.9), STEEL, 0.006))   # ladder rail
    for k in range(4): P.append(cyl(0.015, 0.2, (W / 2 + 0.03, -D / 2 + 0.2, 0.4 + k * 0.32), STEEL, rot=(1.57, 0, 0)))
    return join(P, "pod")

L3 = locker(3); L4 = locker(4, ajar=1); R = rack(); LB = labbench(); PD = pod()
out = {"locker3": L3, "locker4": L4, "rack": R, "labbench": LB, "pod": PD}
for k, o in out.items(): export(o, f"/tmp/zfurn/{k}.glb")
# proof: all in a row, 3/4 front
xs = {"locker3": -4.2, "locker4": -1.8, "rack": 0.3, "labbench": 2.6, "pod": 5.6}
for k, o in out.items(): o.location = (xs[k], 0, 0)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 1400; sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
bpy.ops.object.light_add(type="AREA", location=(1, -5, 4)); L = bpy.context.object; L.data.energy = 1500; L.data.size = 5; L.rotation_euler = (0.8, 0, 0)
bpy.ops.object.camera_add(location=(1.5, -9, 3)); cam = bpy.context.object; sc.camera = cam
d = Vector((0.7, 0, 1.0)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 30
sc.render.filepath = "/tmp/zfurn/proof2.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get()
for k, o in out.items(): print(k, "tris", len(o.evaluated_get(dg).data.loop_triangles), [round(v, 2) for v in o.dimensions])
