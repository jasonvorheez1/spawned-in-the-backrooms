# Nov 16: proof of the Tripo head (art/critter-head-tripo/head-v1.glb) seated on the cute critter body in place of its head:
# scaled to the old skull's width, its muzzle tip at the old one's height, rendered beside the current head for Shelly's verdict.
# usage: blender -b --factory-startup --python-exit-code 1 --python tripo-swap-proof.py -- <body.glb> <tripo.glb> <out.png> <out.glb>
import bpy, sys
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]; SRC, TRI, OUT, GLB = a
bpy.ops.wm.read_factory_settings(use_empty=True)
def load(f):
    pre = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f)
    new = list(set(bpy.data.objects) - pre)
    for o in [o for o in new if o.name.startswith("Icosphere")]: bpy.data.objects.remove(o)
    return [o for o in bpy.data.objects if o not in pre]
A = load(SRC)
B = load(SRC)
for o in B:
    if o.parent is None: o.location.x += 0.75
headB = next(o for o in B if o.type == "MESH" and o.name.startswith("Head"))
bpy.context.view_layer.update()
HW = [headB.matrix_world @ v.co for v in headB.data.vertices]
skull = [p for p in HW if p.z < 0.975 or abs(p.x - 0.75) < 0.1]
wid = max(p.x for p in skull) - min(p.x for p in skull)
cx = (max(p.x for p in skull) + min(p.x for p in skull)) / 2
zc = (max(p.z for p in skull) + min(p.z for p in skull)) / 2
yb = min(p.y for p in skull)
headB.hide_render = True
T = load(TRI); tri = next(o for o in T if o.type == "MESH")
M = tri.matrix_world.copy(); tri.parent = None; tri.matrix_world = M
tri.data.transform(Matrix.Rotation(-1.5708, 4, "Z") @ M); tri.matrix_world = Matrix()   # Tripo's face looks +X here; turned to Blender's front (-Y)
TW = [v.co.copy() for v in tri.data.vertices]
tw = max(p.x for p in TW) - min(p.x for p in TW)
s = wid * 0.98 / tw
tcx = (max(p.x for p in TW) + min(p.x for p in TW)) / 2; tz = (max(p.z for p in TW) + min(p.z for p in TW)) / 2; tyb = min(p.y for p in TW)
for v in tri.data.vertices:
    p = v.co; v.co = Vector((cx + (p.x - tcx) * s, yb - 0.01 + (p.y - tyb) * s, zc + 0.03 + (p.z - tz) * s))
tri.data.update()
print("scale", round(s, 3))
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 1200; sc.render.resolution_y = 700
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.58, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
c = Vector((0.375, 0, 0.82))
cd = bpy.data.cameras.new("c"); cd.lens = 55; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam)
cam.location = c + Vector((-0.35, -1, 0.1)).normalized() * 2.6; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
ld = bpy.data.lights.new("k", "SUN"); ld.energy = 2.5; L = bpy.data.objects.new("k", ld); sc.collection.objects.link(L); L.rotation_euler = cam.rotation_euler
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
