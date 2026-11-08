import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
from lib import *
import hull, super as sup
hp = hull.build_hull(); hobj = join(hp, "ship_hull")
sp = sup.build_super(); sobj = join(sp, "ship_super")
os.makedirs("/workspace/l26ship/out", exist_ok=True)
export([hobj], "/workspace/l26ship/out/hull.glb"); export([sobj], "/workspace/l26ship/out/super.glb")
for o in (hobj, sobj): print(o.name, "tris", sum(len(p.vertices) - 2 for p in o.data.polygons), "bbox", [tuple(round(c, 2) for c in v) for v in (o.bound_box[0], o.bound_box[6])])
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 900; sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.45, 0.55, 0.5, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(140)); sc.collection.objects.link(sun)
sea = bpy.data.meshes.new("sea"); sea.from_pydata([(-200, -200, -12), (200, -200, -12), (200, 200, -12), (-200, 200, -12)], [], [(0, 1, 2, 3)]); so = bpy.data.objects.new("sea", sea); sc.collection.objects.link(so); so.data.materials.append(mat("sea", (0.1, 0.16, 0.13), rough=0.2))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
from mathutils import Vector
def shot(name, eye, at, lens=28):
    cam.location = W(eye); d = W(at) - W(eye); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
    sc.render.filepath = f"/tmp/l26p/{name}.png"; bpy.ops.render.render(write_still=True)
shots = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["bow", "deck", "stern", "room"]
V = {"bow": ((38, -6, -62), (0, -2, -25)), "deck": ((0, 1.8, 30), (0, 2.5, 0)), "stern": ((-34, 4, 70), (0, 0, 20)),
     "room": ((7.9, 1.6, -9.4), (4.6, 1.0, -12.4)), "top": ((24, 22, -30), (0, 3, 2)), "side": ((-45, -9, -20), (0, -3, -20))}
for n in shots: shot(n, *V[n])
