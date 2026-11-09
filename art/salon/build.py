# Glow Up Salon: the Bonus Room's makeover shop (east ground floor, x 10..24, z -6..4). One glb, origin = room floor centre (world 17, 0, -1).
# Blender X = world x - 17, Blender Y = -(world z + 1). Also opens the shell's shutter on that storefront.
import bpy, bmesh, math, sys
from mathutils import Vector
OUT = "/workspace/salon"; import os; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, metal=0.0, rough=0.5, emit=None, es=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    return m
M = dict(chrome=mat("chrome", (0.85, 0.85, 0.9), 1, 0.12), vinyl=mat("vinyl", (0.95, 0.32, 0.6), 0, 0.32), lacquer=mat("lacquer", (0.96, 0.94, 0.97), 0, 0.18),
         mirror=mat("mirror", (0.9, 0.93, 0.97), 1, 0.02), bulb=mat("bulb", (1, 0.95, 0.85), 0, 0.3, (1, 0.9, 0.75), 6), teal=mat("teal", (0.15, 0.75, 0.78), 0, 0.3),
         neon=mat("neon", (1, 0.3, 0.75), 0, 0.3, (1, 0.25, 0.75), 8), marble=mat("marble", (0.97, 0.9, 0.93), 0, 0.12), plant=mat("plant", (0.12, 0.42, 0.2), 0, 0.6), soil=mat("soil", (0.2, 0.13, 0.08), 0, 0.9))
def W(x, z): return (x - 17, -(z + 1))
def fin(o, m, bev=0.0, seg=3, sub=0):
    o.data.materials.append(M[m])
    if bev: md = o.modifiers.new("b", "BEVEL"); md.width = bev; md.segments = seg; md.limit_method = "ANGLE"
    if sub: s = o.modifiers.new("s", "SUBSURF"); s.levels = sub; s.render_levels = sub
    for p in o.data.polygons: p.use_smooth = True
    return o
def box(x, z, y, sx, sz, sy, m, bev=0.02, rot=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(*W(x, z), y + sy / 2), rotation=(0, 0, rot)); o = bpy.context.object; o.scale = (sx, sz, sy)
    bpy.ops.object.transform_apply(scale=True); return fin(o, m, bev)
def cyl(x, z, y, r, h, m, bev=0.01, v=40):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=v, location=(*W(x, z), y + h / 2)); return fin(bpy.context.object, m, bev)
def sph(x, z, y, r, m, sc=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=32, ring_count=16, location=(*W(x, z), y)); o = bpy.context.object; o.scale = sc; bpy.ops.object.transform_apply(scale=True); return fin(o, m)
def tor(x, z, y, R, r, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=12, location=(*W(x, z), y), rotation=rot); return fin(bpy.context.object, m)
def arch(cx, cz, y0, w, h, th, m, yaw=0.0, bulbs=False):
    # an arched panel standing on y0, facing along yaw (radians, Blender Z), w wide, h tall
    bm = bmesh.new(); r = w / 2; pts = [(-r, 0), (r, 0)]
    for i in range(0, 25): a = i / 24 * math.pi; pts.append((r * math.cos(a), h - r + r * math.sin(a)))
    pts = [pts[0]] + [pts[1]] + pts[2:]
    vs = [bm.verts.new((px, 0, pz)) for px, pz in pts]; f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, th, 0), verts=[e for e in ex["geom"] if isinstance(e, bmesh.types.BMVert)])
    me = bpy.data.meshes.new("arch"); bm.to_mesh(me); o = bpy.data.objects.new("arch", me); bpy.context.collection.objects.link(o)
    o.location = (*W(cx, cz), y0); o.rotation_euler = (0, 0, yaw); fin(o, m, 0.006, 2)
    if bulbs:
        for i in range(0, 13):
            a = i / 12 * math.pi; lx, lz = (r + 0.06) * math.cos(a), h - r + (r + 0.06) * math.sin(a)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=(0, 0, 0)); b = bpy.context.object; fin(b, "bulb")
            b.parent = o; b.location = (lx, -0.03, lz)
        for s in (-1, 1):
            for k in range(3): bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035); b = bpy.context.object; fin(b, "bulb"); b.parent = o; b.location = (s * (r + 0.06), -0.03, 0.2 + k * (h - r - 0.2) / 3)
    return o
def chair(x, z, yaw):  # a hydraulic styling chair: chrome disc foot, post, pink tufted seat and rounded back, chrome arms, foot ring
    g = []
    g.append(cyl(x, z, 0, 0.32, 0.05, "chrome", 0.02)); g.append(cyl(x, z, 0.05, 0.05, 0.38, "chrome"))
    seat = box(x, z, 0.42, 0.56, 0.52, 0.14, "vinyl", 0.06); g.append(seat)
    back = box(x, z + 0.24, 0.52, 0.54, 0.12, 0.62, "vinyl", 0.06); g.append(back)
    g.append(sph(x, z + 0.24, 1.2, 0.13, "vinyl", (1.6, 0.6, 0.7)))
    for s in (-1, 1):
        g.append(box(x + s * 0.31, z - 0.02, 0.62, 0.08, 0.5, 0.06, "chrome", 0.03)); g.append(cyl(x + s * 0.31, z - 0.2, 0.5, 0.018, 0.13, "chrome"))
    g.append(tor(x, z - 0.4, 0.22, 0.2, 0.015, "chrome"))
    bpy.ops.object.select_all(action="DESELECT")
    for o in g: o.select_set(True)
    piv = Vector((*W(x, z), 0)); bpy.context.scene.cursor.location = piv
    bpy.ops.transform.rotate(value=yaw, orient_axis="Z", center_override=piv)
TRIPO = True  # furniture comes as fitted Tripo meshes placed beside this room (bonus-salon-*), the room keeps walls, rugs, wainscot, dais
stations = [12.8, 15.6, 18.4]
for sx in ([] if TRIPO else stations):  # north wall: vanity, arched bulb mirror, styling chair facing it
    box(sx, 3.62, 0, 1.6, 0.55, 0.82, "lacquer", 0.03); box(sx, 3.6, 0.82, 1.7, 0.6, 0.05, "marble", 0.02)
    arch(sx, 3.85, 0.9, 1.1, 1.75, 0.04, "lacquer", 0, True)
    m = arch(sx, 3.815, 0.95, 0.98, 1.65, 0.02, "mirror"); 
    cyl(sx - 0.55, 3.55, 0.87, 0.06, 0.18, "teal"); cyl(sx + 0.5, 3.6, 0.87, 0.04, 0.24, "vinyl"); sph(sx + 0.3, 3.55, 0.92, 0.05, "chrome")
    chair(sx, 2.2, math.pi)
# south wall: two hood dryers
for dx in (() if TRIPO else (13.5, 16.3)):
    chair(dx, -4.6, 0)
    cyl(dx, -5.25, 0, 0.04, 1.35, "chrome"); h = sph(dx, -4.85, 1.45, 0.3, "lacquer", (1, 1.15, 0.95)); tor(dx, -4.7, 1.32, 0.27, 0.03, "teal", (math.radians(-25), 0, 0))
# reception: a curved desk by the door
if not TRIPO:
  bm = bmesh.new(); seg = 24; R0, R1 = 1.25, 1.65
  for i in range(seg + 1):
      a = math.pi * 0.5 + i / seg * math.pi * 0.75
      for r in (R0, R1):
          for hz in (0, 1.05): bm.verts.new((r * math.cos(a), r * math.sin(a), hz))
  bm.verts.ensure_lookup_table(); V = bm.verts
  for i in range(seg):
      b = i * 4; n = b + 4
      for q in ((b, n, n + 1, b + 1), (b + 2, b + 3, n + 3, n + 2), (b + 1, n + 1, n + 3, b + 3), (b, b + 2, n + 2, n)): bm.faces.new([V[k] for k in q])
  bm.faces.new([V[k] for k in (0, 1, 3, 2)]); e = seg * 4; bm.faces.new([V[k] for k in (e, e + 2, e + 3, e + 1)])
  bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
  me = bpy.data.meshes.new("desk"); bm.to_mesh(me); d = bpy.data.objects.new("desk", me); bpy.context.collection.objects.link(d); d.location = (*W(12.0, -2.4), 0); fin(d, "lacquer", 0.03)
  tor(12.0, -2.4, 1.07, 1.45, 0.22, "marble", (0, 0, 0)); bpy.context.object.scale = (1, 1, 0.12)
  tor(12.0, -2.4, 0.15, 1.66, 0.02, "neon")
# the makeover dais and tri-fold mirror at the back wall
cyl(21.8, -1.0, 0, 1.15, 0.18, "marble", 0.05, 64); tor(21.8, -1.0, 0.09, 1.16, 0.03, "neon")
for i, a in enumerate((-0.55, 0, 0.55)):
    cx = 23.55 - (0.35 if a else 0); cz = -1.0 + math.sin(a) * 1.25 * (1 if a else 0) * 1.6
    arch(cx, cz, 0.18, 1.1, 2.6, 0.06, "lacquer", math.pi / 2 + a, i == 1)
    arch(cx - 0.035, cz, 0.24, 0.98, 2.5, 0.02, "mirror", math.pi / 2 + a)
tor(21.8, -1.0, 3.6, 0.7, 0.05, "bulb", (0, 0, 0))
cyl(21.8, -1.0, 3.62, 0.02, 1.38, "chrome")
# plants and a pink round rug
for px, pz in (() if TRIPO else ((10.8, 3.4), (23.2, 3.4), (23.2, -5.4))):
    cyl(px, pz, 0, 0.26, 0.55, "lacquer", 0.03); cyl(px, pz, 0.5, 0.23, 0.04, "soil")
    for k in range(9):
        a = k * 2.4; sph(px + 0.18 * math.cos(a) * (k % 3) / 2, pz + 0.18 * math.sin(a) * (k % 3) / 2, 0.75 + (k % 4) * 0.18, 0.2, "plant", (1, 0.45, 1.6))
cyl(16.0, 0.0, 0.003, 2.2, 0.012, "teal", 0.004, 64)
# finishing: rounded pink wainscot along the side walls, product shelves with bottles, towel rolls, a scalloped rug edge
for wz, sgn in ((4.05, -1), (-5.85, 1)):
    for k in range(7):
        box(10.6 + k * 2.0, wz + sgn * 0.0, 0, 1.9, 0.06, 1.0, "vinyl", 0.025)
    box(16.6, wz + sgn * 0.04, 1.0, 13.9, 0.1, 0.07, "lacquer", 0.03)
for shx in (() if TRIPO else (19.4, 21.4)):
    for lv in (1.25, 1.75):
        box(shx, -5.7, lv, 1.4, 0.26, 0.04, "lacquer", 0.015)
        for b in range(6):
            bx = shx - 0.55 + b * 0.22; mtl = ("vinyl", "teal", "chrome")[b % 3]
            cyl(bx, -5.68, lv + 0.04, 0.045 + 0.01 * (b % 2), 0.16 + 0.05 * (b % 3), mtl, 0.01, 20)
            sph(bx, -5.68, lv + 0.24 + 0.05 * (b % 3), 0.03, "chrome")
for t in range(0 if TRIPO else 5):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.36, vertices=24, location=(*W(10.9 + (t % 3) * 0.2, -0.6 + 0.0), 0.95 + (t // 3) * 0.18), rotation=(0, math.pi / 2, 0)); fin(bpy.context.object, "lacquer", 0.03)
if not TRIPO: box(11.1, -0.6, 0, 0.8, 0.5, 0.86, "vinyl", 0.04)
for k in range(28):
    a = k / 28 * math.tau; sph(16.0 + 2.25 * math.cos(a), 2.25 * math.sin(a), 0.01, 0.16, "teal", (1, 1, 0.08))
bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
bpy.ops.object.convert(target="MESH"); bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM"); bpy.ops.object.join(); salon = bpy.context.object; salon.name = "salon"
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
dg = bpy.context.evaluated_depsgraph_get(); print("tris", len(salon.evaluated_get(dg).data.loop_triangles))
# proof
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 1000; sc.render.resolution_y = 650
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.8, 0.9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="AREA", location=(0, 0, 5)); bpy.context.object.data.energy = 3000; bpy.context.object.data.size = 10
for nm, loc, tgt in (("a", (-7.5, 5, 3.2), (1, -1, 0.8)), ("b", (5, -6, 2.5), (-2, 2, 0.8))):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object; c.data.lens = 18
    c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); sc.camera = c
    sc.render.filepath = f"{OUT}/proof_{nm}.png"; bpy.ops.render.render(write_still=True)
for o in list(sc.objects):
    if o != salon: bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/salon.glb", export_apply=True)
# the shell: drop the one shutter on the salon's storefront
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/shell.glb"); sh = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
bm = bmesh.new(); bm.from_mesh(sh.data); idx = [i for i, m in enumerate(sh.data.materials) if m and m.name.startswith("shutter")]
mw = sh.matrix_world; kill = []
for f in bm.faces:
    if f.material_index in idx:
        c = mw @ f.calc_center_median()
        if 9.3 < c.x < 10.7 and -4.5 < c.y < 5.5: kill.append(f)   # gltf z = -blender y: world z -5.5..4.5
print("shutter faces removed", len(kill)); bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(sh.data)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/shell.glb", export_apply=True)
