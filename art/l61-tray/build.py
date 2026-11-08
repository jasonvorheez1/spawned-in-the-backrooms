# Level 6.1 food-court tray: moulded plastic cafeteria tray with a Burger Bop meal on it (burger in wax paper, fries carton, Coca-Cola cup)
import bpy, bmesh, math
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
M = dict(plastic=mat("plastic", (0.55, 0.08, 0.035), 0.35), paper=mat("paper", (0.86, 0.82, 0.7), 0.8), bun=mat("bun", (0.62, 0.32, 0.09), 0.6),
         patty=mat("patty", (0.16, 0.07, 0.03), 0.8), cheese=mat("cheese", (0.95, 0.6, 0.05), 0.4), lettuce=mat("lettuce", (0.25, 0.6, 0.1), 0.6),
         fries=mat("fries", (0.95, 0.72, 0.25), 0.6), carton=mat("carton", (0.7, 0.04, 0.03), 0.5), cup=mat("cup", (0.75, 0.02, 0.03), 0.4),
         ribbon=mat("ribbon", (0.95, 0.95, 0.95), 0.4), lid=mat("lid", (0.92, 0.92, 0.9), 0.3), straw=mat("straw", (0.95, 0.85, 0.2), 0.4), sesame=mat("sesame", (0.95, 0.88, 0.7), 0.5))
objs = []
def add(o, m):
    o.data.materials.append(M[m]); objs.append(o); bpy.ops.object.shade_smooth(); return o
# tray: rounded rectangle slab, inset well, bevelled rim (Blender Z up, front -Y)
W, D, H = 0.46, 0.34, 0.03
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, H / 2)); t = bpy.context.object; t.scale = (W, D, H); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(t.data); top = [f for f in bm.faces if f.normal.z > 0.9][0]
r = bmesh.ops.inset_region(bm, faces=[top], thickness=0.022, depth=0); bmesh.ops.translate(bm, vec=(0, 0, -0.02), verts=list({v for f in r["faces"] for v in f.verts} & set(top.verts)))
bm.to_mesh(t.data); bm.free()
bv = t.modifiers.new("b", "BEVEL"); bv.width = 0.006; bv.segments = 3; bv.limit_method = "ANGLE"
sd = t.modifiers.new("s", "SUBSURF"); sd.levels = 1
add(t, "plastic")
FL = 0.012  # well floor height
# wax paper liner
bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.06, 0.0, FL + 0.002)); p = bpy.context.object; p.scale = (0.26, 0.24, 1); p.rotation_euler.z = 0.12
sb = p.modifiers.new("s", "SOLIDIFY"); sb.thickness = 0.001; add(p, "paper")
# burger stack
bx, by = -0.08, 0.02
def disk(r, h, z, m, seg=24, bevel=0.3):
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=h, location=(bx, by, z + h / 2)); o = bpy.context.object
    b = o.modifiers.new("b", "BEVEL"); b.width = h * bevel; b.segments = 3; return add(o, m)
z = FL + 0.004
disk(0.058, 0.018, z, "bun"); z += 0.016
disk(0.062, 0.016, z, "patty", bevel=0.4); z += 0.014
bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, z + 0.002)); c = bpy.context.object; c.scale = (0.11, 0.11, 0.004); c.rotation_euler.z = 0.6; add(c, "cheese"); z += 0.004
disk(0.066, 0.006, z, "lettuce", seg=12, bevel=0.2); z += 0.005
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.06, location=(bx, by, z)); top_bun = bpy.context.object; top_bun.scale = (1, 1, 0.55)
bm = bmesh.new(); bm.from_mesh(top_bun.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context="VERTS"); bm.to_mesh(top_bun.data); bm.free()
add(top_bun, "bun")
import random; random.seed(3)
for i in range(9):
    a = random.uniform(0, 6.28); rr = random.uniform(0.01, 0.045); zz = z + 0.033 * math.sqrt(max(0, 1 - (rr / 0.06) ** 2))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.004, location=(bx + math.cos(a) * rr, by + math.sin(a) * rr, zz)); s = bpy.context.object; s.scale = (1.6, 0.8, 0.6); s.rotation_euler.z = a; add(s, "sesame")
# fries carton (tapered, scalloped front) + fries
fx, fy = 0.1, 0.07
bpy.ops.mesh.primitive_cube_add(size=1, location=(fx, fy, FL + 0.05)); ct = bpy.context.object; ct.scale = (0.075, 0.035, 0.1)
bm = bmesh.new(); bm.from_mesh(ct.data)
for v in bm.verts:
    if v.co.z > 0: v.co.x *= 1.25; v.co.y *= 1.5
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.9], context="FACES"); bm.to_mesh(ct.data); bm.free()
ct.modifiers.new("s", "SOLIDIFY").thickness = 0.002; add(ct, "carton")
for i in range(16):
    x = fx + random.uniform(-0.035, 0.035); y = fy + random.uniform(-0.02, 0.02); hgt = random.uniform(0.09, 0.13)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, FL + 0.02 + hgt / 2)); f = bpy.context.object; f.scale = (0.008, 0.008, hgt)
    f.rotation_euler = (random.uniform(-0.25, 0.25), random.uniform(-0.25, 0.25), random.uniform(0, 3)); add(f, "fries")
# Coca-Cola cup: tapered red paper cup, white ribbon band, domed lid, straw
cx, cy = 0.12, -0.08
bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.036, radius2=0.047, depth=0.15, location=(cx, cy, FL + 0.075)); cu = bpy.context.object; add(cu, "cup")
bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.0425, radius2=0.0445, depth=0.022, location=(cx, cy, FL + 0.095)); rb = bpy.context.object; add(rb, "ribbon")
bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=8, radius=0.049, location=(cx, cy, FL + 0.15)); ld = bpy.context.object; ld.scale = (1, 1, 0.25)
bm = bmesh.new(); bm.from_mesh(ld.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context="VERTS"); bm.to_mesh(ld.data); bm.free(); add(ld, "lid")
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0035, depth=0.09, location=(cx + 0.008, cy, FL + 0.19)); st = bpy.context.object; st.rotation_euler.y = 0.18; add(st, "straw")
# ketchup cup
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.016, radius2=0.021, depth=0.022, location=(0.0, -0.11, FL + 0.011)); kc = bpy.context.object; add(kc, "paper")
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.019, depth=0.004, location=(0.0, -0.11, FL + 0.018)); kt = bpy.context.object; add(kt, "carton")
# join to one object, origin at bottom centre
for o in bpy.context.scene.objects: o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = t
for o in objs:
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
bpy.context.view_layer.objects.active = t; bpy.ops.object.join(); t.name = "tray"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
wd = bpy.data.worlds.new("w"); wd.color = (0.5, 0.5, 0.5); sc.world = wd
l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(l); l.rotation_euler = (0.6, 0.2, 0.8); l.data.energy = 4
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
for n, loc in (("a", (0.55, -0.55, 0.5)), ("b", (-0.5, 0.5, 0.35)), ("c", (0, -0.001, 0.9))):
    cam.location = loc; d = -cam.location.normalized() if False else None
    import mathutils; dirv = mathutils.Vector((0, 0, 0.05)) - mathutils.Vector(loc); cam.rotation_euler = dirv.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/tmp/tray/{n}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", len(t.evaluated_get(dg).data.loop_triangles))
bpy.ops.export_scene.gltf(filepath="/workspace/l61-tray.glb", export_apply=True)
