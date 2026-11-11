# Nov 11: glasses/shades temples floated out past the side of the head and read as arms sticking out.
# Each temple vertex behind the hinge is pulled in along X until it sits GAP off the head's surface (ray from outside inward).
# usage: blender -b --factory-startup -P eyewear_hug.py -- <body.glb> <eyewear.glb> <out.glb>
import bpy, sys, mathutils
from mathutils.bvhtree import BVHTree
body_p, eye_p, out_p = sys.argv[-3:]
GAP = 0.003
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body_p)
head = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('Head'))
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(head, dg)
hm = head.matrix_world; hinv = hm.inverted()
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=eye_p)
new = [o for o in bpy.context.scene.objects if o not in before]
g = next(o for o in new if o.type == 'MESH' and o.name.startswith('Ward_'))
gm = g.matrix_world; ginv = gm.inverted()
ws = [gm @ v.co for v in g.data.vertices]
hinge = min(w.y for w in ws) + 0.025
moved = 0
for v, w in zip(g.data.vertices, ws):
    if w.y < hinge or abs(w.x) < 0.04: continue
    s = 1 if w.x > 0 else -1
    o = hinv @ mathutils.Vector((s * 0.4, w.y, w.z)); d = (hinv.to_3x3() @ mathutils.Vector((-s, 0, 0))).normalized()
    hit = bvh.ray_cast(o, d, 1.0)
    if hit[0] is None: continue
    hx = (hm @ hit[0]).x
    want = hx + s * GAP
    if s * w.x > s * want:
        dx = want - w.x
        nw = mathutils.Vector((want, w.y, w.z)); v.co = ginv @ nw
        if g.data.shape_keys:
            for kb in g.data.shape_keys.key_blocks[1:]: kb.data[v.index].co.x += (ginv.to_3x3() @ mathutils.Vector((dx, 0, 0))).x
        moved += 1
print('HUG', g.name, moved, 'of', len(ws))
for o in list(bpy.context.scene.objects):
    if o not in new: bpy.data.objects.remove(o, do_unlink=True)
for o in new:
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out_p, export_morph=True, export_skins=True)
