# Zenith FDR-4 flight-recorder bay: housing, flip cover, cartridge. Front = -Y (exports +Z).
import bpy, bmesh
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, metal=0.0, rough=0.5, emit=None, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.0
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND"
    return m
GUN = mat("gunmetal", (0.05, 0.055, 0.065), 0.8, 0.35); TRIM = mat("trim", (0.12, 0.13, 0.15), 0.9, 0.25)
SLOT = mat("slot", (0.004, 0.004, 0.005), 0, 0.9); PLATE = mat("plate", (0.7, 0.72, 0.74), 0.6, 0.3)
AMB = mat("amber_led", (1, 0.5, 0.1), 0, 0.3, emit=(1, 0.45, 0.08)); CART = mat("cart_body", (0.03, 0.035, 0.04), 0.5, 0.45)
LAB = mat("label_orange", (0.9, 0.42, 0.08), 0, 0.5, emit=(0.6, 0.25, 0.04)); GRIP = mat("grip", (0.015, 0.015, 0.018), 0, 0.85)
SMOKE = mat("smoked", (0.25, 0.15, 0.05), 0.1, 0.08, alpha=0.55)
def box(name, size, loc, m, bev=0.004, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = size; bpy.ops.object.transform_apply(scale=True)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(name, r, d, loc, m, rot=(1.5708, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=24); o = bpy.context.object; o.name = name; o.data.materials.append(m); return o
def boolcut(target, cutter):
    md = target.modifiers.new("cut", "BOOLEAN"); md.object = cutter; md.operation = "DIFFERENCE"
    bpy.context.view_layer.objects.active = target; bpy.ops.object.modifier_apply(modifier="cut"); bpy.data.objects.remove(cutter)
def join(objs, name):
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.shade_smooth_by_angle(angle=0.6); return o
def export(o, path):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)
# housing 0.30 x 0.26 x 0.12, slot through the front
H = box("shell", (0.30, 0.26, 0.12), (0, 0, 0.06), GUN, 0.01, 4)
boolcut(H, box("c", (0.21, 0.24, 0.064), (0, -0.03, 0.052), GUN, 0))
parts = [H,
  box("lip", (0.312, 0.272, 0.012), (0, 0, 0.118), TRIM, 0.004),
  box("foot1", (0.29, 0.02, 0.008), (0, -0.11, 0.004), TRIM, 0.002), box("foot2", (0.29, 0.02, 0.008), (0, 0.11, 0.004), TRIM, 0.002),
  box("plate", (0.1, 0.002, 0.014), (-0.08, -0.1305, 0.1), PLATE, 0.001),
  cyl("ledring", 0.011, 0.004, (0.125, -0.1305, 0.094), TRIM), cyl("led", 0.007, 0.006, (0.125, -0.132, 0.094), AMB)]
for i in range(6): parts.append(box(f"vent{i}", (0.004, 0.18, 0.002), (-0.1 + i * 0.04, 0.01, 0.1245), SLOT, 0))
for sx in (-1, 1):
    for sz in (0.02, 0.1): parts.append(cyl(f"screw{sx}{sz}", 0.005, 0.003, (sx * 0.14, -0.1305, sz), PLATE))
housing = join(parts, "fdr_housing")
for o in [housing]: pass
# cartridge 0.19 x 0.22 x 0.046
C = [box("cbody", (0.19, 0.22, 0.046), (0, 0, 0.023), CART, 0.005, 3),
     box("clabel", (0.15, 0.12, 0.002), (0, 0.02, 0.0465), LAB, 0.001),
     box("cgrip", (0.12, 0.014, 0.03), (0, -0.117, 0.02), GRIP, 0.004)]
for i in range(5): C.append(box(f"rib{i}", (0.1, 0.003, 0.004), (0, -0.124, 0.008 + i * 0.006), GRIP, 0.001))
cart = join(C, "fdr_cart")
# cover 0.25 x 0.088, 6 mm thick, tab at the bottom
V = [box("pane", (0.25, 0.006, 0.088), (0, 0, 0.044), SMOKE, 0.002), box("frame", (0.25, 0.008, 0.008), (0, 0, 0.084), TRIM, 0.002),
     box("tab", (0.04, 0.012, 0.01), (0, -0.006, 0.006), TRIM, 0.003)]
cover = join(V, "fdr_cover")
for o in (housing, cart, cover):
    bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.context.scene.cursor.location = (0, 0, 0); bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
export(housing, "/workspace/zdrive_housing.glb"); export(cart, "/workspace/zdrive_cart.glb"); export(cover, "/workspace/zdrive_cover.glb")
# proof: cart half out, cover open
cart.location = (0, -0.14, 0.03); cover.location = (0, -0.137, 0.098); cover.rotation_euler = (-1.8, 0, 0)
cover.location.z -= 0.0
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 700
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.52, 1)
bpy.ops.object.light_add(type="AREA", location=(0.3, -0.5, 0.6)); L = bpy.context.object; L.data.energy = 60; L.data.size = 0.6
L.rotation_euler = (0.8, 0, 0.5)
bpy.ops.object.camera_add(location=(0.35, -0.55, 0.35)); cam = bpy.context.object; sc.camera = cam
d = Vector((0, -0.05, 0.05)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 50
sc.render.filepath = "/tmp/zdrive/proof.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in sc.objects if o.type == "MESH"))
