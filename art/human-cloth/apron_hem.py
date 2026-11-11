# Nov 11: maid apron's lower front rides 1.5 cm clear of the long skirt so the skirt stops showing through as torn strips.
import bpy, sys, bmesh
from mathutils import kdtree
args = sys.argv[sys.argv.index("--")+1:]
apron_p, skirt_p, out_p = args[:3]
ZMAX = float(args[3]) if len(args) > 3 else 1.02   # 9 = the whole apron, bib included (over a tee)
CLEAR_ARG = float(args[4]) if len(args) > 4 else 0.02
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
# the under-garment's front with its Bust key full on: the apron's own Bust key must clear it too
front_b = {}
if sk.data.shape_keys and "Bust" in sk.data.shape_keys.key_blocks:
    for d in sk.data.shape_keys.key_blocks["Bust"].data:
        p = sk.matrix_world @ d.co
        k = (int(math.floor(p.z/BZ)), int(math.floor(p.x/BX))); front_b[k] = min(front_b.get(k, 9), p.y)
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=apron_p)
ap = next(o for o in bpy.context.scene.objects if o.type=="MESH" and o.name.startswith("Ward_"))
mw, mi = ap.matrix_world, ap.matrix_world.inverted()
keys = ap.data.shape_keys.key_blocks if ap.data.shape_keys else None
moved = 0
CLEAR = CLEAR_ARG
for v in ap.data.vertices:
    base = keys[0].data[v.index].co if keys else v.co
    p = mw @ base
    if p.z > ZMAX or p.y > 0.02: continue          # only the front panel below the waist
    zb, xb = int(math.floor(p.z/BZ)), int(math.floor(p.x/BX))
    ys = [front[k] for k in ((zb+dz, xb+dx) for dz in (-2,-1,0,1,2) for dx in (-2,-1,0,1,2)) if k in front]
    if not ys: continue
    want = min(ys) - CLEAR
    if p.y <= want: continue
    delta = mi.to_3x3() @ (bpy.types.Object.__mro__ and __import__("mathutils").Vector((0, want - p.y, 0)))
    moved += 1
    v.co = v.co + delta
    if keys:
        for kb in keys: kb.data[v.index].co = kb.data[v.index].co + delta
# Bust pass: every apron vertex's Bust shape sits CLEAR in front of the under-garment's Bust shape, with the extra bust delta grown 30% so a bust above 1 stays out too
bmoved = 0
if keys and "Bust" in keys and front_b:
    kb = keys["Bust"]; basis = keys[0]
    for v in ap.data.vertices:
        p0 = mw @ basis.data[v.index].co; p = mw @ kb.data[v.index].co
        if p.z > ZMAX or p.y > 0.02: continue
        zb, xb = int(math.floor(p.z/BZ)), int(math.floor(p.x/BX))
        ys = [front_b[k] for k in ((zb+dz, xb+dx) for dz in (-2,-1,0,1,2) for dx in (-2,-1,0,1,2)) if k in front_b]
        if not ys: continue
        want = min(ys) - CLEAR
        if p.y <= want: continue
        newy = p0.y + (want - p0.y) * 1.3 if want < p0.y else want
        q = p.copy(); q.y = newy
        kb.data[v.index].co = mi @ q; bmoved += 1
print("bust moved", bmoved)
print("moved", moved, "of", len(ap.data.vertices))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_p, export_apply=False, export_morph=True, export_skins=True)
