# Bonus Room escalators: strips the frozen steps out of the mall deco and builds one detailed moving step.
# blender -b --factory-startup --python-exit-code 1 --python art/bonus-mall/escalator.py
# in: /workspace/esc/deco.glb (live deco, feet x -1.04)  out: /workspace/esc/deco2.glb, /workspace/esc/step.glb, proof
import bpy, bmesh, math
from mathutils import Vector
OUT = "/workspace/esc/"; DX = -1.04
D = 10 / 27; RISE = D * 0.55; W = 2.1          # tread depth, riser height, tread width (game m)

def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def mat(name, col, rough=0.5, metal=0.0, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(col), 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*lin(col), 1); b.inputs["Emission Strength"].default_value = emit
    return m

# ---------- 1. deco without the frozen steps ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=OUT + "deco.glb")
cut = 0
for ob in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    me = ob.data; bm = bmesh.new(); bm.from_mesh(me); kill = []
    names = [s.name if s else "" for s in me.materials]
    for f in bm.faces:
        nm = names[f.material_index] if f.material_index < len(names) else ""
        if not any(k in nm for k in ("escstep", "steel", "tactile")): continue
        c = ob.matrix_world @ f.calc_center_median(); gx, gz, gy = c.x + DX, -c.y, c.z
        if 0.74 < abs(gx) < 2.86 and -10.01 < gz < 0.01 and 0.03 < gy < 5.62: kill.append(f)
    cut += len(kill); bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(me); bm.free()
print("CUT faces", cut)
bpy.ops.export_scene.gltf(filepath=OUT + "deco2.glb", export_apply=True, export_image_format="AUTO")

# ---------- 2. one step ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
ALU = mat("step_alu", "c4c8cf", 0.32, 0.9); GROOVE = mat("step_groove", "2b2d33", 0.6, 0.6)
YEL = mat("step_yellow", "f2cc18", 0.45); FRAME = mat("step_frame", "34363d", 0.5, 0.7); TYRE = mat("step_wheel", "121214", 0.6)
parts = []
def box(x0, x1, y0, y1, z0, z1, m):      # game coords (x, up y, z); blender = (x, -z, y)
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0+x1)/2, -(z0+z1)/2, (y0+y1)/2)); o = bpy.context.object
    o.scale = (x1-x0, z1-z0, y1-y0); o.data.materials.append(m); parts.append(o); return o
T0 = RISE; T1 = RISE + 0.018; CL = 0.012       # tread plate top, cleat height
z0, z1 = -D / 2, D / 2                        # z1 = low (riser) side, toward +z
box(-W/2, W/2, T0, T1, z0, z1, GROOVE)                                   # tread plate (dark between cleats)
n = 46; pitch = (W - 0.12) / n
for i in range(n):                                                        # cleats run with travel
    x = -W/2 + 0.06 + pitch * (i + 0.5); box(x - pitch*0.3, x + pitch*0.3, T1, T1 + CL, z0 + 0.045, z1, ALU)
box(-W/2, W/2, T1, T1 + CL + 0.001, z0, z0 + 0.045, YEL)                   # yellow back line
for s in (-1, 1):                                                         # yellow side lines
    box(s*W/2 - (0.05 if s > 0 else 0), s*W/2 + (0 if s > 0 else 0.05), T1, T1 + CL + 0.001, z0 + 0.045, z1, YEL)
box(-W/2, W/2, 0.0, T0, z1 - 0.012, z1, GROOVE)                          # riser back plate
for i in range(n):                                                        # riser cleats, vertical
    x = -W/2 + 0.06 + pitch * (i + 0.5); box(x - pitch*0.28, x + pitch*0.28, 0.01, T0, z1, z1 + 0.008, ALU)
for s in (-1, 1):                                                         # side brackets and wheels
    xs = s * (W/2 - 0.03)
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.data.materials.append(FRAME); parts.append(o)
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); bm.clear()
    pts = [(z0 + 0.03, T0), (z1 - 0.015, T0), (z1 - 0.015, 0.02)]
    vs = [bm.verts.new((xs + dx, -zz, yy)) for dx in (-0.012, 0.012) for zz, yy in pts]
    bm.faces.new(vs[:3]); bm.faces.new(vs[3:][::-1])
    for a in range(3): b_ = (a + 1) % 3; bm.faces.new((vs[a], vs[b_], vs[3+b_], vs[3+a]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.035, depth=0.03, location=(s*(W/2 - 0.06), -(z1 - 0.06), 0.06), rotation=(0, math.pi/2, 0))
    o = bpy.context.object; o.data.materials.append(TYRE); parts.append(o)
bpy.ops.object.select_all(action="DESELECT")
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); step = bpy.context.object; step.name = "esc_step"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
vs = [step.matrix_world @ v.co for v in step.data.vertices]
c = Vector(((min(v.x for v in vs)+max(v.x for v in vs))/2, (min(v.y for v in vs)+max(v.y for v in vs))/2, min(v.z for v in vs)))
step.data.transform(__import__("mathutils").Matrix.Translation(-c)); print("STEP offset blender", tuple(round(x, 4) for x in c), "height", round(max(v.z for v in vs) - c.z, 4))
bpy.ops.object.shade_flat()
bpy.ops.export_scene.gltf(filepath=OUT + "step.glb", use_selection=True, export_apply=True)
print("tris", sum(len(p.vertices) - 2 for p in step.data.polygons))
# proof: three steps stacked as on the incline
for k in (1, 2):
    d = step.copy(); d.data = step.data; bpy.context.scene.collection.objects.link(d); d.location = (0, k * D, k * RISE)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.35, .3, .4, 1); sc.world = w
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 4
for name, pos in (("a", (1.6, -1.9, 1.3)), ("b", (-0.4, -0.7, 0.9)), ("c", (1.4, 1.6, 0.6))):
    cam.location = pos; d = (Vector((0, 0.35, 0.25)) - Vector(pos)); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); sun.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"/tmp/esc_{name}.png"; bpy.ops.render.render(write_still=True)
