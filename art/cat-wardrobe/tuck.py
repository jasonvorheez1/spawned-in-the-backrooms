# Pull a ballooning garment back toward the body at the back and sides (Nov 12: the jacket stood off the spine like a bell).
# blender -b --factory-startup --python tuck.py -- body.glb garment.glb out.glb [gap] [keep]
import bpy, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; BODY, GAR, OUT = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.022; KEEP = float(a[4]) if len(a) > 4 else 0.3; ALL = len(a) > 5 and a[5] == 'all'   # all: the front too (a jacket front that sagged to a belly, so the bust read low)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY)
body = max((o for o in bpy.context.scene.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices) if "ody" in o.name else 0)
if body.data.shape_keys:
    for k in body.data.shape_keys.key_blocks: k.value = 0
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(body, dg)
MWb = body.matrix_world.copy()
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=GAR)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
for o in bpy.context.scene.objects:
    if o.type != "MESH" or not o.vertex_groups: continue      # skinned cloth only (a stray Icosphere rides some files)
    me = o.data; MW = o.matrix_world; MI = MW.inverted()
    blocks = me.shape_keys.key_blocks if me.shape_keys else None
    base = [v.co.copy() for v in me.vertices]
    key = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5)); cl = {}; cid = [cl.setdefault(key(c), len(cl)) for c in base]
    nbr = {}
    for e in me.edges:
        u, v = cid[e.vertices[0]], cid[e.vertices[1]]
        if u != v: nbr.setdefault(u, set()).add(v); nbr.setdefault(v, set()).add(u)
    D = {}
    for i, c in enumerate(base):
        if cid[i] in D: continue
        w = MW @ c; D[cid[i]] = Vector()
        hit = bvh.find_nearest(MWb.inverted() @ w)
        if not hit or hit[0] is None: continue
        p = MWb @ hit[0]; d = (w - p).length
        if d <= GAP: continue
        wt = (1 if ALL else sm((w.y + 0.05) / 0.05)) * (1 - sm((abs(w.x) - 0.13) / 0.04))   # back and sides of the torso: front drape, bust and sleeves stay
        if wt <= 0: continue
        nd = GAP + (d - GAP) * KEEP
        D[cid[i]] = MI.to_3x3() @ ((p - w) * ((d - nd) / d) * wt)
    for _ in range(25):      # smooth the pull itself: neighbours move together, no creases
        D = {c: (D[c] * 0.4 + sum((D[j] for j in nbr[c]), Vector()) / len(nbr[c]) * 0.6) if nbr.get(c) else D[c] for c in D}
    mx = 0
    for i, c in enumerate(base):
        dl = D[cid[i]]; mx = max(mx, dl.length)
        if blocks:
            for k in blocks: k.data[i].co = k.data[i].co + dl
        else: me.vertices[i].co = c + dl
    print("TUCK", o.name, "max", round(mx, 4))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
