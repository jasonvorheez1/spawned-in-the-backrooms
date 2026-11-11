# Nov 11: maid apron's lower front rides 1.5 cm clear of the long skirt so the skirt stops showing through as torn strips.
import bpy, sys, bmesh
from mathutils import kdtree
args = sys.argv[sys.argv.index("--")+1:]
apron_p, skirt_p, out_p = args
bpy.ops.wm.read_factory_settings(use_empty=True)
import math
bpy.ops.import_scene.gltf(filepath=skirt_p)
sk = next(o for o in bpy.context.scene.objects if o.type=="MESH" and o.name.startswith("Ward_"))
sv = [sk.matrix_world @ v.co for v in sk.data.vertices]
# the skirt's front surface: most forward (lowest y; Blender front is -Y) per (height, side) cell
BZ, BX = 0.02, 0.015
front = {}
for p in sv:
    k = (int(math.floor(p.z/BZ)), int(math.floor(p.x/BX))); front[k] = min(front.get(k, 9), p.y)
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
    if p.z > 1.02 or p.y > 0.02: continue          # only the front panel below the waist
    zb, xb = int(math.floor(p.z/BZ)), int(math.floor(p.x/BX))
    ys = [front[k] for k in ((zb+dz, xb+dx) for dz in (-1,0,1) for dx in (-1,0,1)) if k in front]
    if not ys: continue
    want = min(ys) - CLEAR
    if p.y <= want: continue
    delta = mi.to_3x3() @ (bpy.types.Object.__mro__ and __import__("mathutils").Vector((0, want - p.y, 0)))
    moved += 1
    v.co = v.co + delta
    if keys:
        for kb in keys: kb.data[v.index].co = kb.data[v.index].co + delta
print("moved", moved, "of", len(ap.data.vertices))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_p, export_apply=False, export_morph=True, export_skins=True)
