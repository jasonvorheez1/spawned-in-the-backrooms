# Nov 11: women's glasses frame read too wide for the face (endpieces ~3.5 cm past the cheek).
# Lenses (|x| < KEEP) stay put; the rim beyond is compressed toward them by K; temples shift by the hinge's move,
# never closer than GAP to the head surface (raycast from outside). Shape keys take the same x move.
# usage: blender -b --factory-startup -P eyewear_narrow.py -- <body.glb> <eyewear.glb> <out.glb>
import bpy, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body_p, eye_p, out_p = sys.argv[-3:]
KEEP, K, GAP, FRONT = 0.045, float(os.environ.get('K', '0.6')), 0.003, 0.045
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body_p)
head = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('Head'))
dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(head, dg); hm = head.matrix_world; hi = hm.inverted()
def head_x(s, y, z):
    r = bvh.ray_cast(hi @ Vector((s * 0.4, y, z)), (hi.to_3x3() @ Vector((-s, 0, 0))).normalized(), 1.0)
    return None if r[0] is None else (hm @ r[0]).x
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=eye_p)
new = [o for o in bpy.context.scene.objects if o not in before]
g = next(o for o in new if o.type == 'MESH' and o.name.startswith('Ward_'))
gm = g.matrix_world; gi = gm.inverted()
ws = [gm @ v.co for v in g.data.vertices]
ymin = min(w.y for w in ws)
comp = lambda ax: ax if ax < KEEP else KEEP + (ax - KEEP) * K
hinge = max(abs(w.x) for w in ws if w.y - ymin < FRONT)
dh = comp(hinge) - hinge
moved = 0
for v, w in zip(g.data.vertices, ws):
    ax, s = abs(w.x), (1 if w.x > 0 else -1)
    if w.y - ymin < FRONT: nx = s * comp(ax)
    else:
        nx = s * max(ax + dh, 0)
        hx = head_x(s, w.y, w.z)
        if hx is not None and s * nx < s * hx + GAP: nx = hx + s * GAP
        if s * nx > ax: nx = w.x
    if abs(nx - w.x) < 1e-6: continue
    dx = (gi.to_3x3() @ Vector((nx - w.x, 0, 0))).x
    v.co.x += dx
    if g.data.shape_keys:
        for kb in g.data.shape_keys.key_blocks[1:]: kb.data[v.index].co.x += dx
    moved += 1
print('NARROW', g.name, moved, 'hinge', round(hinge, 3), '->', round(comp(hinge), 3))
for o in list(bpy.context.scene.objects):
    if o not in new: bpy.data.objects.remove(o, do_unlink=True)
for o in new:
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out_p, export_morph=True, export_skins=True)
