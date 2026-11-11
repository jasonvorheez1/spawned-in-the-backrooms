# Glasses and shades follow the head they sit on (Nov 11). The eyewear files carried only FaceLong/HeadRound, so on the six head
# types (HT_*) and the cheek/jaw keys the frame stayed put while the skull changed under it: temples buried in a broad head and
# hung in the air beside a narrow one. Every head key the eyewear lacks is copied from the body's Head (each eyewear vertex moves
# as its nearest head vertex does), and the temple arms are held 4 mm off the skin at rest.
# usage: blender -b --python eyewear_keys.py -- eyewear.glb body.glb out.glb
import bpy, sys
from mathutils.kdtree import KDTree
from mathutils import Vector
src, bod, out = sys.argv[sys.argv.index('--') + 1:][:3]
CLEAR = 0.004
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
E = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
keep = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=bod)
H = next(o for o in bpy.data.objects if o not in keep and o.type == 'MESH' and o.name == 'Head')
hm, em = H.matrix_world, E.matrix_world; emi = em.inverted()
hb = H.data.shape_keys.key_blocks
base = [hm @ v.co for v in H.data.vertices]
kd = KDTree(len(base))
for i, p in enumerate(base): kd.insert(p, i)
kd.balance()
H.data.calc_loop_triangles() if hasattr(H.data, 'calc_loop_triangles') else None
nrm = [hm.to_3x3() @ v.normal for v in H.data.vertices]
ep = [em @ v.co for v in E.data.vertices]
near = []
for p in ep:
    hits = kd.find_n(p, 4); ws = [(i, 1 / max(d, 1e-4)) for _, i, d in hits]; s = sum(w for _, w in ws)
    near.append([(i, w / s) for i, w in ws])
# 1) temples off the skin: any eyewear vertex closer than CLEAR to the skin (or inside it) goes out along the skin normal
pushed = 0
for k, p in enumerate(ep):
    i = near[k][0][0]; n = nrm[i].normalized(); d = (p - base[i]).dot(n)
    if d < CLEAR and (p - base[i]).length < 0.03:
        ep[k] = p + n * (CLEAR - d); pushed += 1
if not E.data.shape_keys: E.shape_key_add(name='Basis')
eb = E.data.shape_keys.key_blocks
for k, v in enumerate(E.data.vertices):
    v.co = emi @ ep[k]; eb['Basis'].data[k].co = v.co
# 2) every non-expression head key the eyewear lacks
added = []
for kb in hb:
    if kb.name == 'Basis' or kb.name.startswith('X_') or kb.name in eb: continue
    kk = E.shape_key_add(name=kb.name, from_mix=False)
    for k in range(len(ep)):
        dlt = Vector()
        for i, w in near[k]: dlt += ((hm @ kb.data[i].co) - base[i]) * w
        kk.data[k].co = emi @ (ep[k] + dlt)
    added.append(kb.name)
print("PUSHED", pushed, "ADDED", added)
for o in list(bpy.data.objects):
    if o not in keep: bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
