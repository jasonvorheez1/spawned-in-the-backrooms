# Zenith Station furniture, modeled: control workstation (2.4 x 0.8 x 0.76, monitors on a riser) and a task chair.
# Glb front = +Z (Blender -Y): the side a person sits on. Desk screens are material "screen" (tinted dark when off).
import bpy, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, metal=0.0, rough=0.5, emit=None, es=2.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    return m
WHITE = mat("composite", (0.82, 0.81, 0.77), 0.05, 0.45); STEEL = mat("steel", (0.55, 0.57, 0.6), 0.85, 0.3)
DARK = mat("dark_trim", (0.03, 0.033, 0.038), 0.4, 0.45); TOP = mat("desktop", (0.62, 0.63, 0.62), 0.1, 0.35)
SCREEN = mat("screen", (0.05, 0.12, 0.14), 0, 0.15, emit=(0.55, 0.9, 1.0), es=2.2); KEYS = mat("keys", (0.04, 0.042, 0.046), 0.1, 0.7)
TEAL = mat("teal", (0.12, 0.38, 0.42), 0.2, 0.4); FABRIC = mat("fabric", (0.035, 0.037, 0.042), 0, 0.92)
RUB = mat("rubber", (0.02, 0.02, 0.022), 0, 0.85)
def box(size, loc, m, bev=0.008, seg=3, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size
    if rot: o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(r, d, loc, m, rot=(0, 0, 0), v=20, r2=None):
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

# ---- workstation: front (user) at -Y
W, D, H = 2.4, 0.8, 0.76
P = []
P.append(box((W, D, 0.04), (0, 0, H - 0.02), TOP, 0.012, 4))                        # worktop, rounded edge
P.append(box((W - 0.02, 0.02, 0.016), (0, -D / 2 + 0.005, H - 0.046), DARK, 0.004))  # dark edge band under the lip
for sx in (-1, 1):                                                                   # pedestal: a drawer unit one end, a panel leg the other
    x = sx * (W / 2 - 0.25)
    if sx < 0:
        P.append(box((0.46, D - 0.08, H - 0.06), (x, 0.02, (H - 0.06) / 2 + 0.01), WHITE, 0.01))
        for i, hz in enumerate((0.58, 0.36, 0.14)):
            P.append(box((0.42, 0.012, 0.19), (x, -D / 2 + 0.035, hz), WHITE, 0.004))
            P.append(box((0.16, 0.02, 0.018), (x, -D / 2 + 0.025, hz + 0.06), STEEL, 0.004))
        P.append(box((0.47, D - 0.07, 0.03), (x, 0.02, 0.015), DARK, 0.004))
    else:
        P.append(box((0.05, D - 0.1, H - 0.05), (sx * (W / 2 - 0.05), 0.0, (H - 0.05) / 2), WHITE, 0.012))
        P.append(box((0.07, D - 0.06, 0.03), (sx * (W / 2 - 0.05), 0.0, 0.015), DARK, 0.004))
P.append(box((W - 0.6, 0.025, 0.4), (0.1, D / 2 - 0.06, 0.42), WHITE, 0.006))          # modesty panel
P.append(box((W - 0.6, 0.03, 0.03), (0.1, D / 2 - 0.06, 0.2), STEEL, 0.006))          # cable tray bar
# monitor riser: a shelf along the back on two feet
P.append(box((W - 0.2, 0.26, 0.025), (0, D / 2 - 0.16, H + 0.12), TOP, 0.008))
for sx in (-1, 1): P.append(box((0.05, 0.22, 0.12), (sx * (W / 2 - 0.2), D / 2 - 0.16, H + 0.06), STEEL, 0.006))
P.append(box((W - 0.25, 0.01, 0.012), (0, D / 2 - 0.292, H + 0.128), TEAL, 0.002))    # teal status strip on the riser lip
screens = []
for i, x in enumerate((-0.72, 0, 0.72)):
    ang = (0.0, 0.0, (-0.22, 0, 0.22)[i])
    stand = [cyl(0.012, 0.16, (x, D / 2 - 0.12, H + 0.21), STEEL, v=12), box((0.18, 0.12, 0.012), (x, D / 2 - 0.12, H + 0.138), STEEL, 0.004)]
    bez = box((0.66, 0.035, 0.40), (x, D / 2 - 0.15, H + 0.48), DARK, 0.012, 3, rot=ang)
    back = box((0.3, 0.05, 0.18), (x, D / 2 - 0.11, H + 0.46), DARK, 0.02, 3, rot=ang)
    P += stand + [bez, back]
    s = box((0.62, 0.004, 0.36), (0, 0, 0), SCREEN, 0)
    s.rotation_euler = ang; s.location = Vector((x, D / 2 - 0.15, H + 0.48)) + (bpy.context.object.matrix_world.to_3x3() @ Vector((0, -0.018, 0)))
    bpy.context.view_layer.objects.active = s; bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); P.append(s)
# keyboard, mouse, a pen
P.append(box((0.44, 0.15, 0.022), (-0.05, -0.12, H + 0.011), KEYS, 0.006))
for r in range(4):
    for c in range(14): P.append(box((0.024, 0.024, 0.008), (-0.24 + c * 0.029, -0.17 + r * 0.03, H + 0.024), KEYS, 0.002, 2))
P.append(box((0.06, 0.1, 0.03), (0.3, -0.12, H + 0.015), KEYS, 0.02, 4))
P.append(box((0.5, 0.06, 0.004), (0.55, 0.0, H + 0.002), TEAL, 0.001))                # a teal desk label strip
desk = join(P, "zenith_desk")

# ---- task chair: seat faces +Y (knees toward the desk), back at -Y
C = []
for i in range(5):
    a = i * 2 * math.pi / 5
    C.append(box((0.3, 0.045, 0.035), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.08), DARK, 0.01, 3, rot=(0, 0.12, a)))
    C.append(cyl(0.028, 0.04, (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.03), RUB, rot=(math.pi / 2, 0, a + math.pi / 2), v=14))
C.append(cyl(0.045, 0.08, (0, 0, 0.1), DARK, v=16))
C.append(cyl(0.025, 0.28, (0, 0, 0.27), STEEL, v=16))
C.append(cyl(0.04, 0.12, (0, 0, 0.2), DARK, v=16, r2=0.03))
C.append(box((0.26, 0.24, 0.04), (0, 0, 0.42), DARK, 0.01))                            # mechanism plate
C.append(box((0.5, 0.48, 0.08), (0, 0.02, 0.48), FABRIC, 0.035, 4))                   # seat cushion
C.append(box((0.04, 0.06, 0.32), (0, -0.25, 0.6), DARK, 0.012))                       # spine
C.append(box((0.46, 0.07, 0.5), (0, -0.28, 0.9), FABRIC, 0.035, 4, rot=(-0.14, 0, 0)))  # backrest
C.append(box((0.4, 0.02, 0.06), (0, -0.325, 0.82), STEEL, 0.006, 2, rot=(-0.14, 0, 0)))
for sx in (-1, 1):
    C.append(box((0.03, 0.04, 0.2), (sx * 0.26, -0.02, 0.6), DARK, 0.01))
    C.append(box((0.07, 0.26, 0.03), (sx * 0.26, 0.0, 0.71), RUB, 0.012))
chair = join(C, "zenith_chair")
export(desk, "/tmp/zfurn/desk.glb"); export(chair, "/tmp/zfurn/chair.glb")
# proof render
chair.location = (0.0, -0.75, 0); chair.rotation_euler = (0, 0, math.pi + 0.3)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 900; sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
bpy.ops.object.light_add(type="AREA", location=(0.5, -2.0, 2.5)); L = bpy.context.object; L.data.energy = 400; L.data.size = 2; L.rotation_euler = (0.6, 0, 0.2)
bpy.ops.object.camera_add(location=(1.8, -2.6, 1.7)); cam = bpy.context.object; sc.camera = cam
d = Vector((0, 0, 0.6)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 32
sc.render.filepath = "/tmp/zfurn/proof.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get()
for o in (desk, chair): print(o.name, "tris", len(o.evaluated_get(dg).data.loop_triangles), [round(v, 2) for v in o.dimensions])
