# Level 31 staff-only door leaf (Shelly Nov 13 "make the staff only door not blocky"). 1.0 x 2.1 x 0.06 m, origin bottom centre, details both faces.
import bpy, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def mat(n, c, metal=0, rough=0.5):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough; return m
PAINT = mat("door_paint", (0.16, 0.2, 0.19), 0.35, 0.45)
STEEL = mat("steel", (0.7, 0.7, 0.72), 1, 0.28)
GLASS = mat("wired_glass", (0.25, 0.3, 0.3), 0.2, 0.08)
WIRE = mat("wire", (0.5, 0.5, 0.5), 1, 0.4)
RUB = mat("seal", (0.02, 0.02, 0.02), 0, 0.9)
def fin(o, m, bev=None, seg=3):
    o.data.materials.append(m)
    if bev: b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = seg; b.limit_method = "ANGLE"
    for p in o.data.polygons: p.use_smooth = True
    o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True; return o
def box(size, loc, m, bev=0.003, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size; bpy.ops.object.transform_apply(scale=True); return fin(o, m, bev, seg)
def tube(a, b, r, m, v=20):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d.length, location=(a + b) / 2); o = bpy.context.object
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized()); return fin(o, m, r * 0.3, 2)
W, H, T = 0.98, 2.09, 0.05
# leaf with a window hole
leaf = box((W, T, H), (0, 0, H / 2 + 0.005), PAINT, 0.008, 4)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.55)); cut = bpy.context.object; cut.scale = (0.26, 0.2, 0.42)
b = leaf.modifiers.new("hole", "BOOLEAN"); b.operation = "DIFFERENCE"; b.object = cut
leaf.modifiers.move(leaf.modifiers.find("hole"), 0)
bpy.context.view_layer.objects.active = leaf; bpy.ops.object.modifier_apply(modifier="hole"); bpy.data.objects.remove(cut)
# pressed panel lines (raised stiles) both faces
for s in (-1, 1):
    y = s * (T / 2 + 0.002)
    for z0, z1 in ((0.32, 1.25),):
        box((0.62, 0.006, z1 - z0), (0, y, (z0 + z1) / 2), PAINT, 0.003)
    # window frame + glass + wire grid
    for (sx, sz, x, z) in ((0.32, 0.03, 0, 1.79), (0.32, 0.03, 0, 1.31), (0.03, 0.51, -0.145, 1.55), (0.03, 0.51, 0.145, 1.55)):
        box((sx, 0.012, sz), (x, y, z), STEEL, 0.004)
    box((0.85, 0.004, 0.24), (0, y, 0.13), STEEL, 0.002)                      # kick plate
    box((0.05, 0.006, 0.2), (0.38, y, 1.0), STEEL, 0.003)                       # handle rose
    tube((0.38, y, 1.04), (0.38, s * 0.07, 1.04), 0.011, STEEL)                  # lever neck
    tube((0.38, s * 0.07, 1.04), (0.24, s * 0.07, 1.04), 0.011, STEEL)           # lever
    tube((0.38, y, 0.94), (0.38, y + s * 0.006, 0.94), 0.009, STEEL)            # key cylinder
box((0.26, 0.012, 0.42), (0, 0, 1.55), GLASS, 0.001)
for i in range(1, 5): box((0.0015, 0.014, 0.42), (-0.13 + i * 0.052, 0, 1.55), WIRE, 0)
for i in range(1, 8): box((0.26, 0.014, 0.0015), (0, 0, 1.34 + i * 0.052), WIRE, 0)
# hinge knuckles on the left edge
for z in (0.25, 1.05, 1.85): tube((-W / 2 - 0.006, 0, z - 0.06), (-W / 2 - 0.006, 0, z + 0.06), 0.012, STEEL)
box((0.006, T + 0.004, H - 0.02), (W / 2 + 0.002, 0, H / 2 + 0.005), RUB, 0.001)
scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = 500; scene.render.resolution_y = 700
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.4, 0.4, 0.42, 1)
bpy.ops.object.camera_add(location=(1.6, -2.6, 1.3)); c = bpy.context.object; c.rotation_euler = (Vector((0, 0, 1.05)) - c.location).to_track_quat("-Z", "Y").to_euler(); scene.camera = c
bpy.ops.object.light_add(type="AREA", location=(1.5, -2.5, 2.6)); l = bpy.context.object; l.data.energy = 300; l.data.size = 2; l.rotation_euler = (Vector((0, 0, 1)) - l.location).to_track_quat("-Z", "Y").to_euler()
scene.render.filepath = "/tmp/staffdoor.png"; bpy.ops.render.render(write_still=True)
for o in list(scene.objects):
    if o.type in ("CAMERA", "LIGHT"): bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath="/workspace/l31-staffdoor.glb", export_apply=True)
