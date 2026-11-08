# Props for the halls (Level 2, Level 2.1): real modelled objects instead of boxes. Front is +Y in Blender (glTF -Z), the model stands on z = 0, centred on x/y.
# Run: blender -b --factory-startup --python art/props/build.py -- locker fridge   (out: art/props/out/<name>.glb; previews render next to them)
import bpy, bmesh, math, os, sys
from mathutils import Vector
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out"); os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["locker", "fridge"]

def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*col, 1); return m
def box(name, size, loc, m, bevel=0.012, segs=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = segs; md.limit_method = "ANGLE"; bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o
def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o
def join_export(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    path = os.path.join(OUT, name + ".glb"); bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions)); return ob
def preview(name, ob, az=35):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 520; sc.render.resolution_y = 640
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.5, 0.52, 0.55)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 55
    h = ob.dimensions.z; t = Vector((0, 0, h / 2)); a = math.radians(az); cam.location = t + Vector((math.sin(a) * h * 2.1, math.cos(a) * h * 2.1, h * 0.25))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.render.filepath = os.path.join(OUT, "preview_%s.png" % name); bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------ a maintenance locker: 0.5 wide, 0.5 deep, 1.9 tall. Paint is the "fur"-style tinted slot (material "paint"): the game recolours it.
def locker():
    paint = mat("paint", (0.58, 0.58, 0.54), 0.55, 0.15); metal = mat("metal", (0.7, 0.7, 0.72), 0.35, 0.9); dark = mat("dark", (0.03, 0.03, 0.035), 0.9); grime = mat("grime", (0.12, 0.1, 0.07), 0.95)
    W, Dp, Hh = 0.5, 0.5, 1.9; parts = []
    parts.append(box("body", (W, Dp, Hh - 0.1), (0, 0, 0.1 + (Hh - 0.1) / 2), paint, 0.014, 3))
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(cyl("foot", 0.022, 0.1, (sx * (W / 2 - 0.05), sy * (Dp / 2 - 0.05), 0.05), metal, verts=10))
    fy = Dp / 2 + 0.004
    parts.append(box("door", (W - 0.04, 0.02, Hh - 0.2), (0, fy, 0.15 + (Hh - 0.2) / 2), paint, 0.008, 2))            # the door, proud of the body
    parts.append(box("pan1", (W - 0.14, 0.008, 0.8), (0, fy + 0.012, 1.34), paint, 0.006, 2))                       # raised panel above
    parts.append(box("pan2", (W - 0.14, 0.008, 0.62), (0, fy + 0.012, 0.52), paint, 0.006, 2))                      # raised panel below
    for k in range(6): parts.append(box("vent", (W - 0.2, 0.012, 0.018), (0, fy + 0.014, 1.72 - k * 0.04), dark, 0.002, 1))  # louvre slots
    for k in range(3): parts.append(box("vent2", (W - 0.2, 0.012, 0.018), (0, fy + 0.014, 0.28 + k * 0.04), dark, 0.002, 1))
    parts.append(box("latch", (0.06, 0.03, 0.16), (W / 2 - 0.1, fy + 0.026, 1.0), metal, 0.008, 2))                  # the handle
    parts.append(box("hasp", (0.05, 0.012, 0.09), (W / 2 - 0.1, fy + 0.016, 0.9), metal, 0.004, 1))
    parts.append(box("tag", (0.1, 0.006, 0.05), (-0.04, fy + 0.014, 1.48), grime, 0.002, 1))                        # a faded name card
    for z in (0.32, 0.9, 1.64): parts.append(cyl("hinge", 0.012, 0.1, (-W / 2 + 0.02, fy + 0.006, z), metal, verts=8))
    parts.append(box("grimeband", (W - 0.01, Dp - 0.01, 0.06), (0, 0, 0.13), grime, 0.0, 1))                         # a scuffed band at the base
    ob = join_export("locker", parts); preview("locker", ob); return ob

# ------------------------------------------------------------ a break-room fridge: 0.7 wide, 0.7 deep, 1.7 tall, rounded, two doors, chrome handles
def fridge():
    paint = mat("paint", (0.86, 0.87, 0.85), 0.35, 0.1); metal = mat("metal", (0.75, 0.76, 0.78), 0.25, 1.0); dark = mat("dark", (0.04, 0.04, 0.045), 0.85); rub = mat("rubber", (0.08, 0.08, 0.08), 0.9)
    W, Dp, Hh = 0.7, 0.7, 1.7; parts = []; fy = Dp / 2
    parts.append(box("body", (W, Dp - 0.03, Hh - 0.06), (0, -0.015, 0.06 + (Hh - 0.06) / 2), paint, 0.05, 4))
    parts.append(box("plinth", (W - 0.08, Dp - 0.1, 0.06), (0, 0, 0.03), dark, 0.01, 1))
    split = 0.5   # freezer above, fridge below (top-freezer)
    parts.append(box("doorTop", (W - 0.03, 0.04, Hh - split - 0.1), (0, fy - 0.005, split + 0.04 + (Hh - split - 0.1) / 2), paint, 0.03, 4))
    parts.append(box("doorLow", (W - 0.03, 0.04, split - 0.03), (0, fy - 0.005, 0.1 + (split - 0.03) / 2), paint, 0.03, 4))
    parts.append(box("seam", (W - 0.01, 0.03, 0.012), (0, fy, split + 0.02), dark, 0.002, 1))
    for z0, z1 in ((0.7, 1.55), (0.15, 0.4)): parts.append(box("grip", (0.018, 0.034, z1 - z0), (W / 2 - 0.07, fy + 0.03, (z0 + z1) / 2), metal, 0.008, 2))
    for z0, z1 in ((0.7, 1.55), (0.15, 0.4)):
        for z in (z0 + 0.04, z1 - 0.04): parts.append(box("mount", (0.018, 0.03, 0.02), (W / 2 - 0.07, fy + 0.012, z), metal, 0.004, 1))
    parts.append(box("badge", (0.08, 0.004, 0.025), (-0.12, fy + 0.016, 1.62), metal, 0.002, 1))
    parts.append(box("magnet", (0.05, 0.006, 0.06), (-0.18, fy + 0.016, 1.2), mat("m1", (0.75, 0.2, 0.15), 0.6), 0.002, 1))
    parts.append(box("note", (0.08, 0.004, 0.1), (-0.04, fy + 0.016, 1.12), mat("paper", (0.92, 0.88, 0.7), 0.9), 0.0, 1))
    ob = join_export("fridge", parts); preview("fridge", ob); return ob

for name in only:
    reset()
    {"locker": locker, "fridge": fridge}[name]()
