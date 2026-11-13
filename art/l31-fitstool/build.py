# Level 31 skate-rental fitting stool + foot sizer (Shelly Nov 13: "make it a 3d model instead of blocky")
# Blender Z-up, front = -Y (exports +Z). Seat top 0.43 m; slanted foot rest low end at the front.
import bpy, math, os
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
OUT = "/tmp/l31-fitstool"; os.makedirs(OUT, exist_ok=True)

def mat(name, color, metal=0.0, rough=0.5, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if coat: b.inputs["Coat Weight"].default_value = coat
    return m
VINYL = mat("vinyl", (0.32, 0.03, 0.035), 0, 0.33, 0.4)
VINYL_DK = mat("vinyl_piping", (0.12, 0.01, 0.012), 0, 0.4)
CHROME = mat("chrome", (0.86, 0.87, 0.88), 1, 0.12)
RUBBER = mat("rubber", (0.025, 0.025, 0.025), 0, 0.85)
STEEL = mat("steel_paint", (0.05, 0.055, 0.06), 0.5, 0.4)
ALU = mat("sizer_alu", (0.75, 0.76, 0.78), 1, 0.3)
ENAMEL = mat("sizer_enamel", (0.02, 0.02, 0.022), 0.2, 0.25)
MARK = mat("sizer_marks", (0.9, 0.88, 0.8), 0, 0.5)

def finish(o, m, bevel=None, seg=3, sub=0):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new("bev", "BEVEL"); b.width = bevel; b.segments = seg; b.limit_method = "ANGLE"
    if sub:
        s = o.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    for p in o.data.polygons: p.use_smooth = True
    o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    return o

def box(name, size, loc, m, bevel=0.004, seg=3, sub=0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, bevel, seg, sub)

def tube(name, a, b, r, m, verts=20):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.name = name
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return finish(o, m, r * 0.35, 2)

parts = []
# ---- seat: pillowed vinyl cushion with piping, on a dark board, four tuft buttons
SY, ST = 0.12, 0.43
parts.append(box("seat_board", (0.40, 0.34, 0.022), (0, SY, ST - 0.058), STEEL, 0.006))
c = box("seat_cushion", (0.41, 0.35, 0.05), (0, SY, ST - 0.025), VINYL, 0.018, 4, 1)
# pillow: lift the top centre
for v in c.data.vertices:
    if v.co.z > 0.01:
        k = max(0, 1 - (abs(v.co.x) / 0.205) ** 2) * max(0, 1 - (abs(v.co.y) / 0.175) ** 2)
        v.co.z += 0.012 * k
parts.append(c)
bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.03, major_segments=48, minor_segments=8, location=(0, SY, ST - 0.05))
p = bpy.context.object; p.name = "seat_piping"; p.scale = (0.205, 0.175, 0.2)
bpy.ops.object.transform_apply(scale=True); parts.append(finish(p, VINYL_DK))
for bx, by in ((-0.08, -0.05), (0.08, -0.05), (-0.08, 0.05), (0.08, 0.05)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.011, segments=12, ring_count=8, location=(bx, SY + by, ST + 0.004))
    t = bpy.context.object; t.scale = (1, 1, 0.45); bpy.ops.object.transform_apply(scale=True); t.name = "tuft"; parts.append(finish(t, VINYL_DK))

# ---- legs under the seat, splayed, with a crossbar ring
for sx in (-1, 1):
    for sy, yy in ((-1, SY - 0.12), (1, SY + 0.12)):
        top = (sx * 0.155, yy, ST - 0.07); foot = (sx * 0.175, yy + sy * 0.02, 0.025)
        parts.append(tube("leg", foot, top, 0.012, CHROME))
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.019, depth=0.026, location=(foot[0], foot[1], 0.013))
        parts.append(finish(bpy.context.object, RUBBER, 0.005, 2))
for y in (SY - 0.125, SY + 0.125): parts.append(tube("rail", (-0.165, y, 0.14), (0.165, y, 0.14), 0.0075, CHROME))
for x in (-0.165, 0.165): parts.append(tube("rail", (x, SY - 0.125, 0.14), (x, SY + 0.125, 0.14), 0.0075, CHROME))

# ---- slanted foot rest: built flat around an empty, then tilted 21.8 deg (front low)
TY, TZ, TILT = -0.27, 0.30, math.radians(21.8)
bpy.ops.object.empty_add(location=(0, TY, TZ)); pivot = bpy.context.object; pivot.rotation_euler = (TILT, 0, 0)
def onrest(o):
    o.parent = pivot; o.matrix_parent_inverse = pivot.matrix_world.inverted(); return o
tray = box("rest_tray", (0.30, 0.36, 0.018), (0, TY, TZ), STEEL, 0.008, 3)
onrest(tray); parts.append(tray)
lip = box("rest_lip", (0.312, 0.372, 0.008), (0, TY, TZ - 0.006), CHROME, 0.003, 2); onrest(lip); parts.append(lip)
for i in range(13):
    y = TY - 0.156 + i * 0.026
    r = box("tread", (0.262, 0.011, 0.007), (0, y, TZ + 0.012), RUBBER, 0.0035, 3); onrest(r); parts.append(r)
toe = tube("toe_stop", (-0.15, TY - 0.183, TZ + 0.022), (0.15, TY - 0.183, TZ + 0.022), 0.012, CHROME); onrest(toe); parts.append(toe)

# ---- the foot sizer on the rest: enamel plate, aluminium rails with scale marks, heel cup, width slider
SZ = TZ + 0.016
plate = box("sizer_plate", (0.115, 0.30, 0.006), (0, TY + 0.005, SZ + 0.003), ENAMEL, 0.003); onrest(plate); parts.append(plate)
for x in (-0.06, 0.06):
    r = box("sizer_rail", (0.012, 0.30, 0.012), (x, TY + 0.005, SZ + 0.006), ALU, 0.003); onrest(r); parts.append(r)
    for k in range(22):
        mk = box("sizer_tick", (0.007 if k % 2 else 0.011, 0.0012, 0.0012), (x - math.copysign(0.0, x), TY - 0.13 + k * 0.012, SZ + 0.0125), MARK, 0); onrest(mk); parts.append(mk)
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.062, depth=0.04, location=(0, TY + 0.15, SZ + 0.02))
cup = bpy.context.object; cup.name = "sizer_heelcup"
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.054, depth=0.06, location=(0, TY + 0.15, SZ + 0.026))
cut = bpy.context.object
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, TY + 0.11, SZ + 0.02)); cut2 = bpy.context.object; cut2.scale = (0.2, 0.08, 0.1)
for cc in (cut, cut2):
    b = cup.modifiers.new("cut", "BOOLEAN"); b.operation = "DIFFERENCE"; b.object = cc
bpy.context.view_layer.objects.active = cup
for mname in [m.name for m in cup.modifiers]: bpy.ops.object.modifier_apply(modifier=mname)
bpy.data.objects.remove(cut); bpy.data.objects.remove(cut2)
finish(cup, ALU, 0.003, 2); onrest(cup); parts.append(cup)
sl = box("sizer_slider", (0.11, 0.022, 0.014), (0, TY - 0.02, SZ + 0.012), ALU, 0.004); onrest(sl); parts.append(sl)
kn = tube("sizer_knob", (0.062, TY - 0.02, SZ + 0.012), (0.08, TY - 0.02, SZ + 0.012), 0.007, ENAMEL); onrest(kn); parts.append(kn)

# front legs of the rest + braces to the seat legs
lowz = TZ - 0.18 * math.sin(TILT) - 0.02; lowy = TY - 0.17 * math.cos(TILT)
for sx in (-1, 1):
    foot = (sx * 0.14, lowy - 0.02, 0.025)
    parts.append(tube("rest_leg", foot, (sx * 0.125, lowy + 0.01, lowz), 0.011, CHROME))
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.018, depth=0.026, location=(foot[0], foot[1], 0.013)); parts.append(finish(bpy.context.object, RUBBER, 0.005, 2))
    parts.append(tube("brace", (sx * 0.135, lowy, 0.11), (sx * 0.165, SY - 0.125, 0.14), 0.0075, CHROME))
parts.append(tube("brace", (-0.135, lowy, 0.11), (0.135, lowy, 0.11), 0.0075, CHROME))

# ---- proof
bpy.ops.object.select_all(action="DESELECT")
scene.render.engine = "CYCLES"; scene.cycles.samples = 24; scene.render.resolution_x = scene.render.resolution_y = 656
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.25, 0.25, 0.27, 1)
bpy.ops.mesh.primitive_plane_add(size=6); floor = bpy.context.object; floor.data.materials.append(mat("floor", (0.18, 0.17, 0.2), 0, 0.8))
def cam(name, loc):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object; c.name = name
    d = Vector((0, -0.05, 0.25)) - Vector(loc); c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); c.data.lens = 45
    bpy.ops.object.light_add(type="AREA", location=Vector(loc) * 1.1 + Vector((0.4, 0, 0.8))); l = bpy.context.object; l.data.energy = 120; l.data.size = 1.5
    l.rotation_euler = (Vector((0, 0, 0.2)) - l.location).to_track_quat("-Z", "Y").to_euler()
    return c
cams = [cam("a", (0.9, -1.2, 0.85)), cam("b", (-1.1, 0.9, 0.7)), cam("c", (0.05, -0.35, 1.5))]
for c in cams:
    scene.camera = c; scene.render.filepath = f"{OUT}/proof_{c.name}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(floor)
for o in list(scene.objects):
    if o.type in ("CAMERA", "LIGHT"): bpy.data.objects.remove(o)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in scene.objects if o.type == "MESH"))
bpy.ops.export_scene.gltf(filepath="/workspace/l31-fitstool.glb", export_apply=True)
