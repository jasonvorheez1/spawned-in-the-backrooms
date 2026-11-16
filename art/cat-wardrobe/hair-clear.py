# Hair cleared off the current (rounder, sw225) cat heads: every hair vertex closer than MARGIN to the skull, or inside it,
# lifts out along the skull normal; the lift spreads over a 2 cm falloff so locks rise whole. Moves every shape key by the
# same delta (Hatted, snout/ear keys stay relative), keeps skin and slots. Shelly #459857 "their hair is also weird up front now".
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/hair-clear.py -- <body.glb> <hair.glb> <out.glb>
import bpy, bmesh, sys, numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree
body, src, out = sys.argv[sys.argv.index("--")+1:][:3]
MARGIN, R = 0.007, 0.02
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
head = bpy.data.objects["Head"]
if head.data.shape_keys:
    for k in head.data.shape_keys.key_blocks: k.value = 0
    kb = head.data.shape_keys.key_blocks
    if "Ear_Hide" in kb: kb["Ear_Hide"].value = 1
bh = bmesh.new(); bh.from_mesh(head.data); bh.transform(head.matrix_world); bh.normal_update()
bvh = BVHTree.FromBMesh(bh)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
hairs = [o for o in bpy.data.objects if o.type == "MESH"]
tot = 0; mx = 0
for h in hairs:
    me = h.data; W = h.matrix_world; Wi = W.inverted()
    P = [W @ v.co for v in me.vertices]
    lift = [Vector() for _ in P]; hit = []
    for i, p in enumerate(P):
        loc, nrm, _, d = bvh.find_nearest(p, 0.06)
        if loc is None: continue
        s = (p - loc).dot(nrm)
        if s < MARGIN and s > -0.03:
            lift[i] = nrm * (MARGIN - s); hit.append(i)
    kd = kdtree.KDTree(len(hit))
    for j, i in enumerate(hit): kd.insert(P[i], j)
    kd.balance()
    fin = []
    for i, p in enumerate(P):
        if lift[i].length > 0: fin.append(lift[i]); continue
        acc = Vector(); wsum = 0
        for (co, j, d) in kd.find_range(p, R):
            w = (1 - d / R) ** 2; acc += lift[hit[j]] * w; wsum += w
        fin.append(acc / max(wsum, 1e-9) * min(1, wsum) if wsum else Vector())
    D = [Wi.to_3x3() @ f for f in fin]
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, dv in enumerate(D): kb.data[i].co += dv
    for i, dv in enumerate(D): me.vertices[i].co += dv
    n = sum(1 for f in fin if f.length > 1e-5); tot += n; mx = max([mx] + [f.length for f in fin])
print(f"cleared {tot} verts, max {mx*1000:.1f} mm, direct {len(hit)}")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=False, export_morph=True, export_skins=True, export_animations=False)
