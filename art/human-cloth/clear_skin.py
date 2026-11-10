"""Skin poking through a garment (Nov 10: white flecks along the orange tank's straps after the arms were filled out).
Every garment vertex closer than GAP to the body's skin, or under it, moves out along the skin's normal to GAP, shape keys moved the same.
Usage: blender -b --python-exit-code 1 -P clear_skin.py -- body.glb [gap_mm] in.glb out.glb [in2 out2 ...]"""
import bpy, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
BODY, GAP, pairs = a[0], float(a[1]) / 1000, a[2:]
def body_tree():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=BODY)
    V, F = [], []
    for o in bpy.data.objects:
        if o.type == 'MESH' and (o.name == 'Body' or o.name.startswith('Skin_')):
            b = len(V); V += [o.matrix_world @ v.co for v in o.data.vertices]; F += [[b + i for i in p.vertices] for p in o.data.polygons]
    return V, F
V, F = body_tree()
for i in range(0, len(pairs), 2):
    src, out = pairs[i], pairs[i + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    t = BVHTree.FromPolygons(V, F); moved = 0
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.vertex_groups: continue
        mw = o.matrix_world; mi = mw.inverted().to_3x3()
        for v in o.data.vertices:
            p = mw @ v.co; hit = t.find_nearest(p, 0.03)
            if not hit[0]: continue
            q, n = hit[0], hit[1].normalized(); d = (p - q).dot(n)
            if d >= GAP: continue
            dl = mi @ (n * (GAP - d)); v.co += dl; moved += 1
            if o.data.shape_keys:
                for k in o.data.shape_keys.key_blocks: k.data[v.index].co += dl
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_animations=False)
    print('CLEAR', os.path.basename(src), 'moved', moved)
