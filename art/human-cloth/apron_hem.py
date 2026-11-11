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
cx = sum(p.x for p in sv)/len(sv); cy = sum(p.y for p in sv)/len(sv)
# skirt's outer radius per (height band, angle bin): the apron must sit outside it
BZ, BA = 0.02, 72
outer = {}
for p in sv:
    r = math.hypot(p.x-cx, p.y-cy); a = int((math.atan2(p.y-cy, p.x-cx)+math.pi)/(2*math.pi)*BA) % BA
    k = (int(p.z/BZ), a); outer[k] = max(outer.get(k, 0), r)
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
    if p.z > 1.02: continue
    dx, dy = p.x-cx, p.y-cy; r = math.hypot(dx, dy)
    if r < 1e-4: continue
    a = int((math.atan2(dy, dx)+math.pi)/(2*math.pi)*BA) % BA; zb = int(p.z/BZ)
    need = max(outer.get((zb+dz, (a+da) % BA), 0) for dz in (-1,0,1) for da in (-1,0,1))
    if need == 0 or r >= need + CLEAR: continue
    s_ = (need + CLEAR)/r
    q = p.copy(); q.x = cx + dx*s_; q.y = cy + dy*s_
    delta = mi.to_3x3() @ (q - p)
    moved += 1
    v.co = v.co + delta
    if keys:
        for kb in keys: kb.data[v.index].co = kb.data[v.index].co + delta
print("moved", moved, "of", len(ap.data.vertices))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_p, export_apply=False, export_morph=True, export_skins=True)
