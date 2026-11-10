# Shelly Nov 10: tops sagged below the new body's shoulders (skin under a sleeved top is hidden in game, so the sag showed as broken shoulders).
# Each garment vertex near the upper body is laid onto the skin: signed gap clamped to [MIN, MAX], deltas smoothed over the garment's own edges.
# Penetration is pushed out everywhere; verts already looser than PULL_LIMIT (capes, robes, skirts) keep their drape.
# blender -b --factory-startup --python-exit-code 1 --python fit.py -- <body.glb> <out dir> <garment.glb>...
import bpy, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; BODY, OUT, FILES = a[0], a[1], a[2:]
MIN, MAX_UP, MAX_LO, PULL_LIMIT, HIPS_Z = float(os.environ.get("FIT_MIN", 0.005)), 0.016, 0.03, 0.06, 0.92
def body_bvh():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=BODY)
    dg = bpy.context.evaluated_depsgraph_get(); verts, polys = [], []
    for o in bpy.data.objects:
        if o.type != 'MESH' or not (o.name.startswith('Skin_') or o.name == 'Head'): continue
        e = o.evaluated_get(dg); m = e.to_mesh(); base = len(verts)
        verts += [o.matrix_world @ v.co for v in m.vertices]; polys += [[base + i for i in p.vertices] for p in m.polygons]
        e.to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys)
for f in FILES:
    bvh = body_bvh()
    pre = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f); new = set(bpy.data.objects) - pre
    for o in new:
        if o.type != 'MESH' or len(o.data.vertices) < 60: continue
        mw = o.matrix_world; inv = mw.inverted().to_3x3(); n = len(o.data.vertices); D = [Vector() for _ in range(n)]; moved = 0
        for v in o.data.vertices:
            p = mw @ v.co; hit = bvh.find_nearest(p)
            if not hit or hit[0] is None: continue
            loc, nrm, _, dist = hit; s = (p - loc).dot(nrm); gap = s
            mx = MAX_UP if loc.z > HIPS_Z + 0.25 else MAX_LO
            if s < MIN: gap = MIN
            elif s > mx and s < PULL_LIMIT and loc.z > HIPS_Z: gap = mx
            if gap != s: D[v.index] = nrm * (gap - s); moved += 1
        nb = [[] for _ in range(n)]
        for e in o.data.edges: i, j = e.vertices; nb[i].append(j); nb[j].append(i)
        for _ in range(6):
            D = [ (D[i] * .5 + sum((D[j] for j in nb[i]), Vector()) * (.5 / len(nb[i]))) if nb[i] else D[i] for i in range(n)]
        local = [inv @ d for d in D]
        sets = [k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
        for pts in sets:
            for v, d in zip(pts, local): v.co += d
        if o.data.shape_keys is None: pass
        o.data.update(); print('F', os.path.basename(f), o.name, moved, '/', n, flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in new: o.select_set(o.type in ('ARMATURE', 'MESH'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, os.path.basename(f)), use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_morph_normal=True, export_skins=True)
