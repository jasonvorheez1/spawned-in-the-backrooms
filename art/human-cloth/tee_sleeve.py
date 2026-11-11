"""Guys' tee, Nov 11: the sleeves hugged in to 6 mm off the arm (the cuffs had flared out like bells) and the
chest smoothed so the pecs don't print through. Usage: tee_sleeve.py tee.glb body.glb out.glb proofdir"""
import bpy, sys, bmesh, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
tee, body, out, proof = a
SLEEVE_GAP = (0.004, 0.008)   # sleeve skin gap clamp (min, max)
CHEST_ITERS, CHEST_MIN = 12, 0.006
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
skins = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('Skin_') or o.name == 'Body')]
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for o in skins:
    t = bmesh.new(); t.from_object(o, dg); t.transform(o.matrix_world); me = bpy.data.meshes.new('t'); t.to_mesh(me); bm.from_mesh(me)
tree = BVHTree.FromBMesh(bm)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
shx = abs((arm.matrix_world @ arm.data.bones['LeftArm'].head_local).x)
chz = (arm.matrix_world @ arm.data.bones['Spine2'].head_local).z
n0 = set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=tee)
new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in n0]
T = next(o for o in new if o.type == 'MESH' and o.name.startswith('Ward_'))
me = T.data; M = T.matrix_world; Mi = M.inverted()
P = [M @ v.co for v in me.vertices]
Q = [p.copy() for p in P]
# weld map so split seams move together
key = lambda p: (round(p.x, 5), round(p.y, 5), round(p.z, 5))
grp = {}
for i, p in enumerate(P): grp.setdefault(key(p), []).append(i)
nb = {i: set() for i in range(len(P))}
for e in me.edges:
    i, j = e.vertices; nb[i].add(j); nb[j].add(i)
for ids in grp.values():
    for i in ids:
        for j in ids:
            nb[i] |= nb[j]
sleeve = [abs(p.x) > shx + 0.02 for p in P]
chest = [(not sleeve[i]) and p.y < 0 and chz - 0.08 < p.z < chz + 0.22 for i, p in enumerate(P)]
# 1) sleeves: clamp the gap to the arm
ns = 0
for i, p in enumerate(P):
    if not sleeve[i]: continue
    loc, nr, _, d = tree.find_nearest(p)
    g = (p - loc).dot(nr); g2 = min(max(g, SLEEVE_GAP[0]), SLEEVE_GAP[1])
    if abs(g2 - g) > 1e-5: Q[i] = loc + nr * g2; ns += 1
# blend: 2 cm band at the shoulder seam eases between
for i, p in enumerate(P):
    if not sleeve[i] and abs(p.x) > shx - 0.01:
        t = (abs(p.x) - (shx - 0.01)) / 0.03
        loc, nr, _, d = tree.find_nearest(p); g = (p - loc).dot(nr)
        if g > SLEEVE_GAP[1]: Q[i] = p.lerp(loc + nr * SLEEVE_GAP[1], max(0, min(1, t)))
# 2) chest: laplacian smooth, then hold a min gap
for _ in range(CHEST_ITERS):
    R = [q.copy() for q in Q]
    for i in range(len(P)):
        if not chest[i] or not nb[i]: continue
        avg = sum((Q[j] for j in nb[i]), Vector()) / len(nb[i]); R[i] = Q[i].lerp(avg, 0.5)
    Q = R
    for i in range(len(P)):
        if not chest[i]: continue
        loc, nr, _, d = tree.find_nearest(Q[i]); g = (Q[i] - loc).dot(nr)
        if g < CHEST_MIN: Q[i] = loc + nr * CHEST_MIN
# weld again
for ids in grp.values():
    c = sum((Q[i] for i in ids), Vector()) / len(ids)
    for i in ids: Q[i] = c
D = [Mi.to_3x3() @ (Q[i] - P[i]) for i in range(len(P))]
if me.shape_keys:
    for kb in me.shape_keys.key_blocks:
        for i, pt in enumerate(kb.data): pt.co += D[i]
else:
    for i, v in enumerate(me.vertices): v.co += D[i]
print("SLEEVE moved", ns, "of", sum(sleeve), "chest", sum(chest), "shx", round(shx, 3))
for o in bpy.data.objects: o.select_set(o in new)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
# proof: front + 3/4 with the body
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 700
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
for o in bpy.data.objects:
    if o.type == 'MESH' and not (o in skins or o == T or o.name == 'Head'): o.hide_render = True
mat = bpy.data.materials.new('c'); mat.diffuse_color = (0.35, 0.45, 0.7, 1); T.data.materials.clear(); T.data.materials.append(mat)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
for n, (pos) in (('front', (0, -2.2, 1.3)), ('q', (1.6, -1.6, 1.4))):
    cam.location = pos; d = Vector((0, 0, 1.25)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f"{proof}/tee_{n}.png"; bpy.ops.render.render(write_still=True)
