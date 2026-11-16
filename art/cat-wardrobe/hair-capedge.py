# The hair's scalp cap was cut from the head's own faces (hair-register-cap.py), so its rim follows triangle edges and reads as
# stair steps on the forehead (Shelly #459857 "their hair is also weird up front now"). This walks the open rim of the cap
# (boundary verts sitting on the skull), smooths it along the rim into a curve, relaxes the ring behind it, and sets it back on the
# skull at MARGIN. Strand tips (open edges off the skull) are left alone. Every shape key moves by the same delta.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/hair-capedge.py -- <body.glb> <hair.glb> <out.glb>
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body, src, out = sys.argv[sys.argv.index("--")+1:][:3]
MARGIN, ONSKULL, IT = 0.004, 0.016, 30
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=body)
head = bpy.data.objects["Head"]
bh = bmesh.new(); bh.from_mesh(head.data); bh.transform(head.matrix_world); bh.normal_update(); bvh = BVHTree.FromBMesh(bh)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
moved = 0
for h in [o for o in bpy.data.objects if o.type == "MESH" and "hair" in [m.name for m in o.data.materials if m]]:
    me = h.data; W = h.matrix_world; Wi = W.inverted()
    key = lambda p: (round(p.x, 5), round(p.y, 5), round(p.z, 5))
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(W)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00002); bm.verts.ensure_lookup_table()
    def onsk(p):
        loc, n, _, d = bvh.find_nearest(p, 0.05)
        return loc is not None and d < ONSKULL
    rim = {v.index for v in bm.verts if any(e.is_boundary for e in v.link_edges) and onsk(v.co)}
    nb = {i: [e.other_vert(bm.verts[i]).index for e in bm.verts[i].link_edges if e.is_boundary and e.other_vert(bm.verts[i]).index in rim] for i in rim}
    P0 = {v.index: v.co.copy() for v in bm.verts}
    P = {i: P0[i].copy() for i in rim}
    for _ in range(IT):
        Q = {}
        for i in rim:
            ns = nb[i]
            Q[i] = P[i] * 0.5 + sum((P[j] for j in ns), Vector()) * (0.5 / len(ns)) if len(ns) == 2 else P[i]
        P = Q
    ring = {e.other_vert(bm.verts[i]).index for i in rim for e in bm.verts[i].link_edges} - rim
    R = {}
    for k in range(4):
        for i in ring:
            v = bm.verts[i]; ns = [e.other_vert(v).index for e in v.link_edges]
            R[i] = sum(((P.get(j) or R.get(j) or P0[j]) for j in ns), Vector()) / len(ns) * 0.5 + (R.get(i) or P0[i]) * 0.5
    new = {}
    for i, p in list(P.items()) + list(R.items()):
        loc, n, _, d = bvh.find_nearest(p, 0.05)
        if loc is not None:
            s = (p - loc).dot(n)
            if s < MARGIN: p = p + n * (MARGIN - s)
        new[key(P0[i])] = p - P0[i]
    for v in me.vertices:
        d = new.get(key(W @ v.co))
        if d is None or d.length < 1e-7: continue
        dl = Wi.to_3x3() @ d; moved += 1
        if me.shape_keys:
            for kb in me.shape_keys.key_blocks: kb.data[v.index].co += dl
        v.co += dl
    print(f"rim {len(rim)} ring {len(ring)}")
print(f"capedge moved {moved}")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=False, export_morph=True, export_skins=True, export_animations=False)
