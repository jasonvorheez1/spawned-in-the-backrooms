# Level 27 "The Bunker Springs": one limestone cave shell (inside faces out), M.E.G. steel stairs, stalactites.
# game coords (x, y up, z) -> blender (x, -z, y); exported y-up so the glb reads in game coords.
import bpy, bmesh, math, random
from mathutils import Vector
R = random.Random(27)
bpy.ops.wm.read_factory_settings(use_empty=True)
G = lambda x, y, z: (x, -z, y)
def mat(name, rgb, rough=0.9, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
ROCK = mat("limestone", (0.42, 0.36, 0.28), 0.85); FLOW = mat("flowstone", (0.62, 0.55, 0.42), 0.45)
STEEL = mat("steel", (0.18, 0.2, 0.2), 0.45, 0.8); YEL = mat("paint", (0.75, 0.55, 0.08), 0.6, 0.3)
def box(x0, x1, y0, y1, z0, z1):  # game extents
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object
    o.location = G((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.scale = (x1 - x0, z1 - z0, y1 - y0); return o
def ell(cx, cy, cz, rx, ry, rz):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24); o = bpy.context.active_object
    o.location = G(cx, cy, cz); o.scale = (rx, rz, ry); return o
parts = [
    box(-8, 8, 0, 3.2, -8.5, 6),            # the chamber's floor and lower walls
    ell(0, 3.0, -1.5, 9, 4.2, 8),           # the dome
    box(-8.2, -4.2, 0, 5.4, -8.5, -1.5),    # stairwell headroom
    box(-7.9, -4.4, 2.4, 5.1, -21, -6.5),   # the way out: the tunnel the stream runs down
    ell(-6.2, 3.8, -21, 2.2, 1.6, 1.6),     # its far end
    ell(-1.2, 0.0, -2.6, 4.4, 1.3, 3.8),    # the spring
    ell(4.2, 0.0, -2.6, 3.4, 0.9, 2.3),     # the east lobe under the second fall
    box(7, 13.5, 3.1, 5.0, -3.5, -1.5),     # the other tunnel: leads nowhere
    ell(13.5, 4.0, -2.5, 1.5, 1.2, 1.4),
    box(-9.5, -4.6, -0.75, -0.25, 0.05, 0.55),  # the drain, too small to crawl
]
for p in parts:
    bpy.ops.object.select_all(action="DESELECT"); p.select_set(True); bpy.context.view_layer.objects.active = p
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
base = parts[0]
for p in parts[1:]:
    m = base.modifiers.new("u", "BOOLEAN"); m.operation = "UNION"; m.object = p; m.solver = "EXACT"
bpy.context.view_layer.objects.active = base
for md in list(base.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
for p in parts[1:]: bpy.data.objects.remove(p)
rm = base.modifiers.new("r", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.14
sm = base.modifiers.new("s", "SMOOTH"); sm.iterations = 12; sm.factor = 0.8
for md in list(base.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
# rock: displace walls and ceiling, keep the walkable floor (game y in 0..0.3, away from the pool) near flat
tex = bpy.data.textures.new("n", "VORONOI"); tex.noise_scale = 1.4
tex2 = bpy.data.textures.new("c", "CLOUDS"); tex2.noise_scale = 0.6
me = base.data; me.calc_loop_triangles()
import mathutils.noise as N
for v in me.vertices:
    gx, gy, gz = v.co.x, v.co.z, -v.co.y
    nrm = v.normal
    floor = nrm.z > 0.8 and gy < 0.4
    amp = 0.04 if floor else (0.16 if gy > 1.0 else 0.12)  # deeper pushes folded the ceiling through itself: black jagged patches
    if -2 < gy < 2.4 and nrm.z > 0.8 and gx < -4.3 and gz < -1.5: amp = 0.01  # stair foot / tunnel floor stay walkable
    if gy > 2.3 and gy < 2.6 and nrm.z > 0.8: amp = 0.02
    d = N.noise(Vector((gx * 0.5, gy * 0.9, gz * 0.5))) * 0.7 + N.noise(Vector((gx * 1.7, gy * 1.7, gz * 1.7))) * 0.3
    d += 0.25 * abs(math.sin(gy * 4.0 + N.noise(Vector((gx, 0, gz))) * 2))  # limestone bedding
    v.co -= nrm * d * amp  # normals point out of the air: minus pushes into the air for bumps
sm2 = base.modifiers.new("s2", "SMOOTH"); sm2.iterations = 3; sm2.factor = 0.5; bpy.ops.object.modifier_apply(modifier="s2")
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.normals_make_consistent(inside=True); bpy.ops.object.mode_set(mode="OBJECT")
base.data.materials.append(ROCK); base.data.materials.append(FLOW)
for f in base.data.polygons:
    c = f.center; gy = c.z
    if gy < 0.2 and abs(f.normal.z) > 0.6 and ((c.x + 1.2) / 5.2) ** 2 + ((-c.y + 2.6) / 4.6) ** 2 < 1.15: f.material_index = 1  # pale travertine rim
    f.use_smooth = True
base.name = "cave"
# stalactites over the pool and walls, stalagmites at the edges
objs = [base]
def cone(x, y, z, L, w, down, m):
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=w, radius2=0.015, depth=L, location=G(x, y - L / 2 if down else y + L / 2, z), rotation=(math.pi if down else 0, 0, R.random() * 6))
    c = bpy.context.active_object; c.data.materials.append(m); objs.append(c)
for i in range(70):
    x = R.uniform(-7, 7); z = R.uniform(-7.5, 4)
    h = 3.0 + 4.2 * math.sqrt(max(0, 1 - (x / 9) ** 2 - ((z + 1.5) / 8) ** 2)) - 0.2
    if x < -4 and z < -1: continue
    L = R.uniform(0.25, 1.3); cone(x, h + 0.15, z, L, L * R.uniform(0.12, 0.2), True, FLOW if i % 3 else ROCK)
for i in range(18):
    a = R.uniform(0, 6.28); x = 7.0 * math.cos(a); z = -1.5 + 6.6 * math.sin(a)
    if x < -3.8 and z < -1: continue
    L = R.uniform(0.3, 1.1); cone(x, 0, z, L, L * 0.28, False, FLOW)
# M.E.G. stairs: 13 steps from the floor (z -2.4) up to the tunnel floor (y 2.4, z -7)
def sbox(cx, cy, cz, w, h, d, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=G(cx, cy, cz)); o = bpy.context.active_object; o.scale = (w, d, h); o.data.materials.append(m); objs.append(o)
X0, X1 = -7.15, -5.85
for k in range(13):
    y = 0.185 * (k + 1); z = -2.4 - 0.35 * k - 0.175
    sbox((X0 + X1) / 2, y - 0.02, z, X1 - X0, 0.04, 0.33, STEEL)
    sbox((X0 + X1) / 2, y - 0.0, z - 0.155, X1 - X0, 0.012, 0.03, YEL)
for xs in (X0, X1):
    L = math.hypot(4.55, 2.4); ang = math.atan2(2.4, 4.55)
    bpy.ops.mesh.primitive_cube_add(size=1, location=G(xs, 1.2 - 0.1, -2.4 - 2.275)); o = bpy.context.active_object
    o.scale = (0.06, L, 0.2); o.rotation_euler = (ang, 0, 0); o.data.materials.append(STEEL); objs.append(o)
sbox((X0 + X1) / 2, 2.38, -7.25, X1 - X0, 0.05, 0.6, STEEL)  # landing
xr = X1  # the railing on the pool side
for k in range(0, 14, 2):
    y = 0.185 * k; z = -2.4 - 0.35 * k
    sbox(xr, y + 0.5, z, 0.04, 1.0, 0.04, YEL)
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.025, depth=math.hypot(4.55, 2.4), location=G(xr, 1.2 + 1.0, -2.4 - 2.275), rotation=(math.pi / 2 + math.atan2(2.4, 4.55), 0, 0))
o = bpy.context.active_object; o.data.materials.append(YEL); objs.append(o)
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = base
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
print("tris", sum(len(p.vertices) - 2 for p in base.data.polygons))
bpy.ops.export_scene.gltf(filepath="/workspace/l27_cave.glb", export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
# proof
scene = bpy.context.scene; scene.render.engine = "CYCLES"; scene.cycles.samples = 12; scene.render.resolution_x = 900; scene.render.resolution_y = 560
for p, e in ((G(-1, 3.5, 6), 600), (G(-6.5, 1.6, 4), 300)):
    L = bpy.data.lights.new("l", "POINT"); L.energy = e; lo = bpy.data.objects.new("l", L); lo.location = p; scene.collection.objects.link(lo)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 16
for name, pos, tgt in (("a", G(-6.5, 2.9, -7.3), G(1, 0, 0)), ("b", G(2, 2.2, 5), G(-3, 1.2, -6))):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = f"/tmp/l27/{name}.png"; bpy.ops.render.render(write_still=True)
