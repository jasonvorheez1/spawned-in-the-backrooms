"""Men's tee, Nov 11: sleeve hems smoothed into a clean ring and held 8 mm off the arm near the edge so no skin
pokes through as ragged bits. Usage: tee_hem.py tee.glb body.glb out.glb"""
import bpy, sys, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
tee, body, out = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
skins = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('Skin_') or o.name == 'Body')]
dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new()
for o in skins:
    t = bmesh.new(); t.from_object(o, dg); t.transform(o.matrix_world); me = bpy.data.meshes.new('t'); t.to_mesh(me); bm.from_mesh(me)
tree = BVHTree.FromBMesh(bm)
shx = abs((arm.matrix_world @ arm.data.bones['LeftArm'].head_local).x)
n0 = set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=tee)
new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in n0]
T = next(o for o in new if o.type == 'MESH' and o.name.startswith('Ward_'))
me = T.data; M = T.matrix_world; Mi = M.inverted()
P = [M @ v.co for v in me.vertices]
key = lambda p: (round(p.x, 5), round(p.y, 5), round(p.z, 5))
grp = {}
for i, p in enumerate(P): grp.setdefault(key(p), []).append(i)
rep = {i: key(p) for i, p in enumerate(P)}
# welded topology
W = {k: set() for k in grp}; ecount = {}
for e in me.edges:
    a1, b1 = rep[e.vertices[0]], rep[e.vertices[1]]
    if a1 == b1: continue
    W[a1].add(b1); W[b1].add(a1); ek = tuple(sorted((a1, b1))); ecount[ek] = 0
for f in me.polygons:
    vs = [rep[v] for v in f.vertices]
    for j in range(len(vs)):
        ek = tuple(sorted((vs[j], vs[j - 1])))
        if ek in ecount: ecount[ek] += 1
bnd = {k: set() for k in grp}
for (u, v), c in ecount.items():
    if c == 1: bnd[u].add(v); bnd[v].add(u)
pos = {k: Vector(k) for k in grp}
hem = [k for k in grp if bnd[k] and abs(k[0]) > shx + 0.05]
print("hem verts", len(hem))
# smooth along the hem ring
for _ in range(8):
    np_ = {k: pos[k].lerp(sum((pos[j] for j in bnd[k]), Vector()) / len(bnd[k]), 0.5) for k in hem}
    pos.update(np_)
# near-hem band (within 3 cm of the ring, along the sleeve) held >= 8 mm off the arm
hemset = set(hem); ring = {k: 0 for k in hem}; frontier = list(hem)
for d in range(1, 4):
    nxt = []
    for k in frontier:
        for j in W[k]:
            if j not in ring and abs(j[0]) > shx + 0.02: ring[j] = d; nxt.append(j)
    frontier = nxt
pushed = 0
for k, d in ring.items():
    loc, nr, _, dd = tree.find_nearest(pos[k]); g = (pos[k] - loc).dot(nr)
    want = 0.008 - 0.001 * d
    if g < want: pos[k] = loc + nr * want; pushed += 1
D = {}
for k, ids in grp.items():
    for i in ids: D[i] = Mi.to_3x3() @ (pos[k] - P[i])
if me.shape_keys:
    for kb in me.shape_keys.key_blocks:
        for i, pt in enumerate(kb.data): pt.co += D[i]
else:
    for i, v in enumerate(me.vertices): v.co += D[i]
print("pushed", pushed, "band", len(ring))
for o in bpy.data.objects: o.select_set(o in new)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
print("WROTE", out)
