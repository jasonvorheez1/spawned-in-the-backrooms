# Nov 11: maid apron's lower front rides 1.5 cm clear of the long skirt so the skirt stops showing through as torn strips.
import bpy, sys, bmesh
from mathutils import kdtree
args = sys.argv[sys.argv.index("--")+1:]
apron_p, skirt_p, out_p = args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=skirt_p)
sk = next(o for o in bpy.context.scene.objects if o.type=="MESH" and o.name.startswith("Ward_"))
sv = [sk.matrix_world @ v.co for v in sk.data.vertices]
tree = kdtree.KDTree(len(sv))
for i, p in enumerate(sv): tree.insert(p, i)
tree.balance()
skn = [ (sk.matrix_world.to_3x3() @ v.normal).normalized() for v in sk.data.vertices]
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=apron_p)
ap = next(o for o in bpy.context.scene.objects if o.type=="MESH" and o.name.startswith("Ward_"))
mw, mi = ap.matrix_world, ap.matrix_world.inverted()
keys = ap.data.shape_keys.key_blocks if ap.data.shape_keys else None
moved = 0
CLEAR = 0.015
for v in ap.data.vertices:
    base = keys[0].data[v.index].co if keys else v.co
    p = mw @ base
    if p.z > 1.02: continue                      # bib and waist stay as fitted
    q = p.copy()
    for co, i, d in tree.find_n(q, 6):
        n = skn[i]
        off = (q - co).dot(n)                    # how far the apron sits outside the skirt here
        if off < CLEAR and d < 0.06: q = q + n * (CLEAR - off)
    delta = (mi.to_3x3() @ (q - p))
    if delta.length < 1e-5: continue
    moved += 1
    v.co = v.co + delta
    if keys:
        for kb in keys: kb.data[v.index].co = kb.data[v.index].co + delta
print("moved", moved, "of", len(ap.data.vertices))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_p, export_apply=False, export_morph=True, export_skins=True)
