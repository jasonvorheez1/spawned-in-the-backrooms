"""Collar/scarf clearance (Nov 11): after the thicker necks (neck_short.py) the skin poked through collars and scarves at the
nape and collarbones (jagged skin teeth). Every garment vert in the shoulder-to-jaw band that sits inside the body or closer
than M is pushed out along the body's surface normal to M. Same delta on every shape key. Usage: -- body.glb zlo zhi outdir g1.glb ..."""
import bpy, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; bodyf, zlo, zhi, od = a[0], float(a[1]), float(a[2]), a[3]; M = 0.005
def load(f):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
    return [o for o in bpy.data.objects if o.type == 'MESH']
V, P = [], []
for bo in load(bodyf):  # every skin region and the head: the whole surface a collar can meet
    if not (bo.name.startswith('Skin_') or 'Head' in bo.name): continue
    mw = bo.matrix_world; k = len(V); V += [mw @ v.co for v in bo.data.vertices]; P += [[k + i for i in p.vertices] for p in bo.data.polygons]
tree = BVHTree.FromPolygons(V, P)
for g in a[4:]:
    mx = 0.0; n = 0
    for o in load(g):
        gw = o.matrix_world; inv = gw.inverted(); me = o.data; cs = {}
        for i, v in enumerate(me.vertices):
            p = gw @ v.co
            if not (zlo <= p.z <= zhi): continue
            hit = tree.find_nearest(p, 0.03)
            if not hit[0]: continue
            loc, nor = hit[0], hit[1].normalized(); d = (p - loc).dot(nor)
            if d < M: cs[i] = nor * (M - d)
        if not cs: continue
        n += len(cs); mx = max([mx] + [c.length for c in cs.values()])
        blocks = me.shape_keys.key_blocks if me.shape_keys else None
        for kb in (blocks or [None]):
            for i, c in cs.items():
                if kb is None: me.vertices[i].co = inv @ ((gw @ me.vertices[i].co) + c)
                else: kb.data[i].co = inv @ ((gw @ kb.data[i].co) + c)
        me.update()
    if n and mx > 0.0015:
        bpy.ops.export_scene.gltf(filepath=os.path.join(od, os.path.basename(g)), export_apply=False, export_morph=True, export_skins=True)
        print('FIXED', os.path.basename(g), n, round(mx, 4))
    else: print('SAME', os.path.basename(g), n, round(mx, 4))
