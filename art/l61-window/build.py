# Level 6.1 east-wall window: casing, two sashes of three lites, muntins, deep sill, glass. Front (room side) = -Y -> glTF +Z.
import bpy, bmesh, math
bpy.ops.wm.read_factory_settings(use_empty=True)
W, H, D = 3.5, 2.3, 0.16          # outer casing size (x width, z height), wall depth it fills
def mat(name, col, rough, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.0
    return m
FRAME = mat("Frame", (0.80, 0.78, 0.72), 0.45, 0.2); SILL = mat("Sill", (0.74, 0.71, 0.64), 0.5)
GLASS = mat("Glass", (1.0, 0.86, 0.66), 0.08, 0.0, (1.0, 0.82, 0.58)); GASKET = mat("Gasket", (0.08, 0.08, 0.08), 0.8)
parts = []
def box(name, cx, cy, cz, sx, sy, sz, m, bev=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz)); o = bpy.context.object; o.name = name
    o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    if bev:
        md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = 2; md.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(m); parts.append(o); return o
t = 0.11  # casing stile width
# casing: a stepped two-layer profile (outer trim proud of the wall, inner jamb deeper)
for layer, (ins, dy, dep) in enumerate([(0, -0.03, 0.05), (0.04, 0.0, D)]):
    w, h = W - 2 * ins, H - 2 * ins
    box(f"top{layer}", 0, dy, H / 2 - ins - t / 2 + H / 2 - H / 2, w, dep, t, FRAME)
    parts[-1].location.z = H - ins - t / 2
    box(f"bot{layer}", 0, dy, ins + t / 2, w, dep, t, FRAME)
    box(f"l{layer}", -w / 2 + t / 2, dy, H / 2, t, dep, h, FRAME)
    box(f"r{layer}", w / 2 - t / 2, dy, H / 2, t, dep, h, FRAME)
# deep sill and its apron under it
box("sill", 0, -0.11, 0.05, W + 0.16, 0.22, 0.06, SILL, 0.012)
box("apron", 0, -0.04, -0.06, W - 0.1, 0.03, 0.12, SILL)
# two sashes: lower slides in front of the upper; each a frame with two muntins (three lites)
iw, ih = W - 2 * (0.04 + t), H - 2 * (0.04 + t)
z0 = 0.04 + t
for k, (dy, zc) in enumerate([(0.03, z0 + ih * 0.75), (-0.02, z0 + ih * 0.25)]):
    sh = ih / 2 + 0.03; st = 0.06
    box(f"s{k}t", 0, dy, zc + sh / 2 - st / 2, iw, 0.05, st, FRAME, 0.005)
    box(f"s{k}b", 0, dy, zc - sh / 2 + st / 2, iw, 0.05, st * (1.6 if k == 1 else 1), FRAME, 0.005)
    box(f"s{k}l", -iw / 2 + st / 2, dy, zc, st, 0.05, sh, FRAME, 0.005)
    box(f"s{k}r", iw / 2 - st / 2, dy, zc, st, 0.05, sh, FRAME, 0.005)
    for j in (-1, 1): box(f"s{k}m{j}", j * iw / 6, dy, zc, 0.035, 0.035, sh - 2 * st, FRAME, 0.004)
    box(f"g{k}", 0, dy + 0.005, zc, iw - 2 * st + 0.01, 0.008, sh - 2 * st + 0.01, GLASS, 0)
    box(f"k{k}", 0, dy + 0.012, zc, iw - 2 * st + 0.02, 0.004, sh - 2 * st + 0.02, GASKET, 0)
# meeting-rail latch and two lift handles on the lower sash
box("latch", 0, -0.06, z0 + ih / 2 + 0.01, 0.12, 0.03, 0.025, mat("Brass", (0.75, 0.6, 0.3), 0.3, 0.9), 0.004)
for j in (-1, 1): box(f"lift{j}", j * iw / 3, -0.06, z0 + 0.12, 0.08, 0.025, 0.02, parts[-1].data.materials[0], 0.004)
# a little grime line in the sill corner: a thin dark strip
box("grime", 0, -0.02, 0.083, W - 0.3, 0.06, 0.004, mat("Grime", (0.35, 0.31, 0.24), 0.9), 0)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
o = bpy.context.object; o.name = "Window"
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 656; sc.render.resolution_y = 500
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.48, 0.44, 1); sc.world = w
sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
for n, loc, rot in (("a", (2.2, -4.2, 1.6), (85, 0, 28)), ("b", (0, -4.5, 1.15), (90, 0, 0)), ("c", (3.0, -0.9, 0.6), (88, 0, 72))):
    cam.location = loc; cam.rotation_euler = [math.radians(v) for v in rot]; sun.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"/tmp/win/{n}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(sun)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", len(o.evaluated_get(dg).data.loop_triangles))
bpy.ops.export_scene.gltf(filepath="/workspace/l61-window.glb", export_apply=True)
