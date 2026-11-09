# art/weapon-split/fitgun.py: a long gun's first-person composite offline, built exactly as player.js builds it:
# outer node (Q_GUN, at 0,0.01,0.02) > inner (GUN_FIX q, at) > the mesh stood on its box bottom-centre (+ offset y),
# the right fist at FP_SEAT, the left fist at (-0.01, two[0], two[1]). Prints the grip/pump probes; renders side, top, fp.
# args after --: gun.glb offy  qx qy qz qw  ax ay az  twoY twoZ  out.png [rest x y depth pitch yaw roll]
import bpy, sys, math, mathutils as mu
a = sys.argv[sys.argv.index("--") + 1:]
GLB, OFFY = a[0], float(a[1]); Q = [float(v) for v in a[2:6]]; AT = [float(v) for v in a[6:9]]; TWO = [float(v) for v in a[9:11]]; OUT = a[11]
POSE = [float(v) for v in a[12:18]] if len(a) >= 18 else [0.19, -0.17, 0.44, 0, 0, 0]
G = lambda x, y, z: mu.Vector((x, -z, y))
GQ = lambda x, y, z, w: mu.Quaternion((w, x, -z, y))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def imp(path):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in set(bpy.data.objects) - before]
def empty(name, parent=None):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.parent = parent; e.rotation_mode = "QUATERNION"; return e
root = empty("vm"); outer = empty("outer", root); outer.location = G(0, 0.01, 0.02); outer.rotation_quaternion = GQ(0, 1, 0, 0)
inner = empty("inner", outer); inner.location = G(*AT); inner.rotation_quaternion = GQ(*Q)
gun = imp(GLB); bpy.context.view_layer.update()
pts = [o.matrix_world @ mu.Vector(c) for o in gun if o.type == "MESH" for c in o.bound_box]
mn = mu.Vector([min(p[i] for p in pts) for i in range(3)]); mx = mu.Vector([max(p[i] for p in pts) for i in range(3)])
bc = mu.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
for o in gun:
    if o.parent is None: o.location -= bc; o.location.z += OFFY; o.parent = inner
for path, at in (("/workspace/wpn/armR_m.glb", G(0, 0.039, 0.096)), ("/workspace/wpn/armL_m.glb", G(-0.01, TWO[0], TWO[1]))):
    for o in imp(path):
        if o.parent is None: o.location = at; o.parent = root
skin = bpy.data.materials.new("skin"); skin.diffuse_color = (0.9, 0.75, 0.65, 1)
for o in bpy.data.objects:
    if o.type == "MESH" and "tripo" not in (o.active_material.name if o.active_material else ""): o.data.materials.clear(); o.data.materials.append(skin)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
V = []
for o in gun:
    if o.type == "MESH":
        m = o.evaluated_get(dg).to_mesh(); V += [o.matrix_world @ v.co for v in m.vertices]
import statistics
def probe(zlo, zhi):
    s = [v for v in V if zlo <= -v.y <= zhi]
    if not s: return None
    return (round(min(v.x for v in s), 3), round(max(v.x for v in s), 3), round(min(v.z for v in s), 3), round(max(v.z for v in s), 3), len(s))
for z in [i / 100 for i in range(-80, 42, 3)]: print("PROBE z", z, "x,x,y,y,n", probe(z, z + 0.03))
sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x, sc.render.resolution_y = 1100, 520
l = bpy.data.lights.new("l", "SUN"); l.energy = 3.5; lo = bpy.data.objects.new("l", l); sc.collection.objects.link(lo); lo.rotation_euler = (0.6, 0.3, 0.4)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.5, 0.5, 0.5)
def ortho(name, loc, rot):
    cam = bpy.data.cameras.new(name); cam.type = "ORTHO"; cam.ortho_scale = 1.3
    co = bpy.data.objects.new(name, cam); sc.collection.objects.link(co); co.location = loc; co.rotation_euler = rot; sc.camera = co
    sc.render.filepath = OUT.replace(".png", f"_{name}.png"); bpy.ops.render.render(write_still=True)
ortho("side", (2, 0.17, -0.05), (math.radians(90), 0, math.radians(90)))
ortho("top", (0, 0.17, 2), (0, 0, 0))
px, py, pd, pp, pyw, pr = POSE
root.rotation_mode = "YXZ"; root.rotation_euler = (math.radians(pp), math.radians(pr), math.radians(pyw)); root.location = G(px, py, -pd)
cam = bpy.data.cameras.new("fp"); cam.sensor_fit = "VERTICAL"; cam.angle = math.radians(55)
co = bpy.data.objects.new("fp", cam); sc.collection.objects.link(co); co.rotation_euler = (math.radians(90), 0, 0); sc.camera = co
sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.render.filepath = OUT.replace(".png", "_fp.png"); bpy.ops.render.render(write_still=True)
