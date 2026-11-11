"""Guys' long sleeve, Nov 11 (after the male3 body): the torso hung straight off the wider shoulders like a box.
Every cloth vertex farther than GAP_MAX from the body's skin is pulled back along its line to the skin, never under GAP_MIN;
the move is a smooth falloff and rides every shape key. Usage: ls_snug.py shirt.glb body.glb out.glb"""
import bpy, sys
from mathutils.bvhtree import BVHTree
import bmesh
a = sys.argv[sys.argv.index('--') + 1:]; shirt, body, out = a
GAP_MIN, GAP_MAX, KEEP = 0.007, 0.016, 0.35   # Savi's picks: clearance clamp, and how much of the excess stays (drape)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new()
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Skin_')]:
    m = o.evaluated_get(dg).to_mesh(); m.transform(o.matrix_world); bm.from_mesh(m)
tree = BVHTree.FromBMesh(bm)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=shirt)
tot = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    mw, mi = o.matrix_world, o.matrix_world.inverted(); kb = o.data.shape_keys.key_blocks if o.data.shape_keys else None
    moves = {}
    for v in o.data.vertices:
        p = mw @ v.co; hit = tree.find_nearest(p)
        if not hit[0]: continue
        q, d = hit[0], hit[3]
        if p.z > 1.40 or d > 0.09: continue   # collar region and far strays alone
        if d > GAP_MAX:
            nd = GAP_MAX + (d - GAP_MAX) * KEEP
            moves[v.index] = (q + (p - q) * (nd / d)) - p
        elif d < GAP_MIN:
            moves[v.index] = (p - q).normalized() * (GAP_MIN - d)
    # smooth the move field over the edge graph so no stair steps
    nb = {i: [] for i in range(len(o.data.vertices))}
    for e in o.data.edges: a_, b_ = e.vertices; nb[a_].append(b_); nb[b_].append(a_)
    from mathutils import Vector
    D = {i: moves.get(i, Vector()) for i in nb}
    for _ in range(4): D = {i: (D[i] * 2 + sum((D[j] for j in nb[i]), Vector())) / (2 + len(nb[i])) for i in nb}
    for i, d in D.items():
        if d.length < 1e-6: continue
        l = mi.to_3x3() @ d; o.data.vertices[i].co += l; tot += 1
        if kb:
            for k in kb: k.data[i].co += l
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=False, export_skins=True, export_morph=True, export_animations=False)
print('LS_SNUG moved', tot)
