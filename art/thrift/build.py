# Thrift Mode, the Level 11 clothing shop: shell, rack, counter. Blender -Y = shop front (exports glTF +Z).
import bpy, bmesh, math, os
from mathutils import Vector
OUT = "/workspace/thrift"; os.makedirs(OUT, exist_ok=True)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
def mat(name, rgb, rough=0.7, metal=0.0, emit=None, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 4
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m
def box(name, c, s, m, bev=0.01, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=c); o = bpy.context.object; o.name = name
    o.scale = (s[0]/2, s[1]/2, s[2]/2); bpy.ops.object.transform_apply(scale=True)
    if bev > 0:
        md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = 2; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(name, c, r, h, m, axis="Z", v=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=c); o = bpy.context.object; o.name = name
    if axis == "X": o.rotation_euler = (0, math.pi/2, 0)
    if axis == "Y": o.rotation_euler = (math.pi/2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True); o.data.materials.append(m); return o
def tube(name, pts, r, m):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o); o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target="MESH"); return o
def finish(path, origin_center=True):
    bpy.ops.object.select_all(action="SELECT")
    for o in bpy.context.selected_objects:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]; bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.export_scene.gltf(filepath=path, export_apply=True)
    dg = bpy.context.evaluated_depsgraph_get(); print("TRIS", path, len(o.evaluated_get(dg).data.loop_triangles), [round(v,2) for v in o.dimensions])
def proof(path, loc, tgt, light_from):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 900; sc.render.resolution_y = 600
    cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); sc.collection.objects.link(co); co.location = loc
    d = Vector(tgt) - Vector(loc); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); sc.camera = co
    for p in light_from:
        l = bpy.data.lights.new("l", "AREA"); l.energy = 900; l.size = 4; lo = bpy.data.objects.new("l", l); sc.collection.objects.link(lo); lo.location = p
        lo.rotation_euler = (Vector(tgt) - Vector(p)).to_track_quat("-Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.4
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

# ---------- shell: 8 x 5.6 m, origin floor centre; front y=-2.8 ----------
reset()
W, D, H = 8.0, 5.6, 3.3
brick = mat("brick", (0.45, 0.22, 0.15), 0.9); plaster = mat("plaster", (0.85, 0.82, 0.74), 0.9)
floor = mat("floor", (0.55, 0.38, 0.22), 0.6); ceil = mat("ceiling", (0.9, 0.9, 0.86), 0.95)
frame = mat("frame", (0.6, 0.62, 0.62), 0.35, 0.8); glass = mat("glass", (0.6, 0.7, 0.7), 0.05)
sign = mat("sign", (0.08, 0.2, 0.13), 0.6); awn = mat("awning", (0.45, 0.08, 0.07), 0.85); lamp = mat("lamp", (1, 1, 0.95), 0.5, emit=(1, 0.97, 0.88))
t = 0.22
box("floor", (0, 0, -0.06), (W, D, 0.12), floor, 0.005)
box("skirt", (0, 0, -0.2), (W + 0.04, D + 0.04, 0.2), brick, 0.01)
for s in (-1, 1): # side walls: brick outside skin + plaster inside skin
    box("side_o", (s * (W/2 - t/4), 0, H/2 + 0.4), (t/2, D, H + 0.8), brick, 0.02)
    box("side_i", (s * (W/2 - t*0.75), 0, H/2), (t/2, D - t, H), plaster, 0.005)
box("back_o", (0, D/2 - t/4, H/2 + 0.4), (W, t/2, H + 0.8), brick, 0.02)
box("back_i", (0, D/2 - t*0.75, H/2), (W - t, t/2, H), plaster, 0.005)
box("ceil", (0, 0, H + 0.05), (W - t, D - t, 0.1), ceil, 0.0)
box("roof", (0, 0, H + 0.6), (W, D, 0.12), brick, 0.01)
# storefront: piers, bulkheads, mullions, glass, transom, sign band
fy = -D/2 + 0.12; door = 1.6
for s in (-1, 1):
    box("pier", (s * (W/2 - 0.25), fy, (H + 0.8)/2), (0.5, 0.3, H + 0.8), brick, 0.02)
    xa, xb = door/2 + 0.08, W/2 - 0.5; cx = s * (xa + xb)/2; w = xb - xa
    box("bulk", (cx, fy, 0.22), (w, 0.26, 0.44), sign, 0.015)
    box("sill", (cx, fy - 0.04, 0.46), (w + 0.04, 0.32, 0.05), frame, 0.008)
    box("glass", (cx, fy, 1.42), (w, 0.02, 1.86), glass, 0)
    for xx in (xa, xb, (xa + xb)/2): box("mull", (s * xx, fy, 1.42), (0.06, 0.12, 1.9), frame, 0.006)
    box("head", (cx, fy, 2.38), (w, 0.12, 0.08), frame, 0.006)
    box("jamb", (s * (door/2 + 0.04), fy, 1.2), (0.08, 0.3, 2.4), frame, 0.008)
box("doorhead", (0, fy, 2.44), (door + 0.16, 0.3, 0.1), frame, 0.008)
box("transom", (0, fy, 2.62), (W - 1.0, 0.02, 0.28), glass, 0)
box("transomframe", (0, fy, 2.8), (W - 1.0, 0.14, 0.06), frame, 0.006)
box("signband", (0, fy - 0.02, 3.35), (W - 0.9, 0.18, 1.0), sign, 0.03)
box("signtrim_t", (0, fy - 0.1, 3.86), (W - 0.8, 0.06, 0.06), frame, 0.01)
box("signtrim_b", (0, fy - 0.1, 2.86), (W - 0.8, 0.06, 0.06), frame, 0.01)
box("cornice", (0, -D/2 + 0.02, H + 0.75), (W + 0.2, 0.4, 0.14), plaster, 0.03)
# awnings over each window: sloped canvas with a scalloped valance
for s in (-1, 1):
    bpy.ops.mesh.primitive_plane_add(size=1); a = bpy.context.object
    a.scale = (2.6/2, 0.9/2, 1); a.location = (s * 2.1, -D/2 - 0.35, 2.66); a.rotation_euler = (math.radians(-28), 0, 0)
    sl = a.modifiers.new("s", "SOLIDIFY"); sl.thickness = 0.02; a.data.materials.append(awn)
    for i in range(10):
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.13, depth=0.02, location=(s * 2.1 - 1.17 + i * 0.26, -D/2 - 0.76, 2.38))
        c = bpy.context.object; c.rotation_euler = (math.pi/2, 0, 0); c.data.materials.append(awn)
    box("valance", (s * 2.1, -D/2 - 0.76, 2.46), (2.6, 0.02, 0.16), awn, 0)
# two fluorescent fixtures in the ceiling
for x in (-1.6, 1.6):
    box("fixture", (x, 0.3, H - 0.03), (0.6, 1.25, 0.06), frame, 0.01)
    box("tube", (x, 0.3, H - 0.065), (0.5, 1.15, 0.02), lamp, 0.005)
# baseboard and a slatwall strip on the left wall for hooks
box("base_l", (-W/2 + t + 0.01, 0, 0.06), (0.02, D - 0.5, 0.12), floor, 0.003)
box("base_r", (W/2 - t - 0.01, 0, 0.06), (0.02, D - 0.5, 0.12), floor, 0.003)
box("base_b", (0, D/2 - t - 0.01, 0.06), (W - 0.5, 0.02, 0.12), floor, 0.003)
proof(f"{OUT}/shell.png", (3.5, -10, 2.5), (0, 0, 1.6), [(4, -9, 6), (-6, -6, 3)])
finish(f"{OUT}/shell.glb")

# ---------- garment rack: chrome rolling rack, 4 garments on hangers (slots g0..g3) ----------
reset()
chrome = mat("chrome", (0.75, 0.75, 0.75), 0.25, 1.0); rub = mat("rubber", (0.05, 0.05, 0.05), 0.8)
gm = [mat(f"g{i}", (0.6, 0.5, 0.35), 0.9) for i in range(4)]; hang = mat("hanger", (0.55, 0.36, 0.2), 0.5)
L = 1.4
for s in (-1, 1):
    x = s * L/2
    tube("upright", [(x, 0, 0.12), (x, 0, 1.58)], 0.016, chrome)
    tube("foot", [(x, -0.28, 0.1), (x, 0.28, 0.1)], 0.018, chrome)
    for y in (-0.27, 0.27):
        cyl("caster", (x, y, 0.045), 0.04, 0.03, rub, "X", 14)
tube("bar", [(-L/2 - 0.03, 0, 1.58), (L/2 + 0.03, 0, 1.58)], 0.014, chrome)
tube("brace", [(-L/2, 0, 0.18), (L/2, 0, 0.18)], 0.012, chrome)
def garment(x, m, hood=False, yaw=0):
    # T outline, solidified: body 0.5 w x 0.7 h, sleeves hanging at a slant
    bm = bmesh.new()
    outline = [(-0.25, 0.0), (-0.25, -0.68), (0.25, -0.68), (0.25, 0.0), (0.2, 0.06), (0.44, -0.42), (0.36, -0.46), (0.2, -0.14),
               (-0.2, -0.14), (-0.36, -0.46), (-0.44, -0.42), (-0.2, 0.06)]
    # build body and sleeves as separate quads strip via convex pieces
    def quad(ps):
        vs = [bm.verts.new((p[0], 0, p[1])) for p in ps]; bm.faces.new(vs)
    quad([(-0.25, -0.68), (0.25, -0.68), (0.25, 0.0), (0.12, 0.06), (-0.12, 0.06), (-0.25, 0.0)])
    quad([(0.22, -0.02), (0.25, -0.16), (0.37, -0.48), (0.46, -0.43)])
    quad([(-0.22, -0.02), (-0.46, -0.43), (-0.37, -0.48), (-0.25, -0.16)])
    me = bpy.data.meshes.new("g"); bm.to_mesh(me); o = bpy.data.objects.new("g", me); bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    sub = o.modifiers.new("sub", "SUBSURF"); sub.levels = 2
    so = o.modifiers.new("s", "SOLIDIFY"); so.thickness = 0.05; so.offset = 0
    o.location = (x, 0, 1.5); o.rotation_euler = (0, 0, math.radians(90 + yaw)); o.data.materials.append(m)
    if hood:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.15, location=(x, 0.06, 1.55)); h = bpy.context.object
        h.scale = (0.3, 1, 0.8); h.data.materials.append(m)
    tube("hook", [(x, 0, 1.58), (x, 0.02, 1.62), (x, 0, 1.64), (x, -0.02, 1.6), (x, 0, 1.56)], 0.004, chrome)
    tube("hanger", [(x, -0.21, 1.47), (x, 0, 1.555), (x, 0.21, 1.47)], 0.009, hang)
for i, x in enumerate((-0.5, -0.17, 0.16, 0.49)): garment(x, gm[i], hood=i % 2 == 0, yaw=(i * 7) % 11 - 5)
proof(f"{OUT}/rack.png", (1.5, -2.6, 1.4), (0, 0, 0.9), [(2, -3, 3), (-2, 2, 2)])
finish(f"{OUT}/rack.glb")

# ---------- counter + register (front faces -Y, the shop floor) ----------
reset()
wood = mat("wood", (0.42, 0.24, 0.12), 0.55); top = mat("top", (0.2, 0.17, 0.15), 0.35)
beige = mat("beige", (0.72, 0.68, 0.58), 0.6); dark = mat("dark", (0.05, 0.05, 0.06), 0.4); scr = mat("screen", (0.1, 0.25, 0.15), 0.2, emit=(0.2, 0.7, 0.4))
CL, CD, CH = 2.0, 0.65, 0.98
box("carcass", (0, 0, CH/2 - 0.02), (CL, CD, CH - 0.04), wood, 0.02)
box("kick", (0, -CD/2 + 0.06, 0.05), (CL - 0.04, 0.02, 0.1), dark, 0.003)
for i in range(4): box("panel", (-CL/2 + 0.25 + i * 0.5, -CD/2 - 0.005, 0.55), (0.4, 0.02, 0.62), wood, 0.012)
box("top", (0, -0.03, CH + 0.02), (CL + 0.08, CD + 0.1, 0.04), top, 0.012)
# register
rx = 0.45
box("reg_base", (rx, 0.05, CH + 0.12), (0.42, 0.4, 0.16), beige, 0.02)
box("drawer", (rx, -0.15, CH + 0.09), (0.36, 0.01, 0.08), beige, 0.004)
bpy.ops.mesh.primitive_cube_add(location=(rx, -0.02, CH + 0.24)); k = bpy.context.object; k.scale = (0.18, 0.14, 0.03); k.rotation_euler = (math.radians(18), 0, 0); k.data.materials.append(dark)
for i in range(4):
    for j in range(4): box("key", (rx - 0.12 + i * 0.08, -0.1 + j * 0.06, CH + 0.27 + j * 0.018), (0.05, 0.04, 0.02), beige, 0.005)
box("disp", (rx + 0.05, 0.18, CH + 0.4), (0.22, 0.06, 0.12), beige, 0.01)
box("dispscr", (rx + 0.05, 0.149, CH + 0.4), (0.17, 0.005, 0.06), scr, 0)
box("post", (rx + 0.05, 0.18, CH + 0.28), (0.04, 0.04, 0.14), beige, 0.005)
# a stack of folded tees and a paper bag
for i in range(3): box("fold", (-0.55, 0.0, CH + 0.06 + i * 0.05), (0.32, 0.26, 0.045), mat(f"f{i}", [(0.1, 0.12, 0.25), (0.6, 0.48, 0.3), (0.15, 0.1, 0.18)][i], 0.95), 0.015)
box("bag", (-0.1, 0.15, CH + 0.17), (0.26, 0.14, 0.3), mat("kraft", (0.55, 0.4, 0.24), 0.9), 0.006)
proof(f"{OUT}/counter.png", (1.4, -2.2, 1.7), (0, 0, 0.9), [(2, -3, 3), (-2, 2, 2)])
finish(f"{OUT}/counter.glb")
