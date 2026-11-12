# Seat a thick top (jacket, hoodie) on the torso and give it the body's own chest (Nov 12, Shelly: 'the breasts go down to the stomach' on non-tee fits:
# the Tripo shell ballooned at the hem and its Chest key was weaker than the body's, so the bulge read at the belly, not the bust).
# blender -b --factory-startup --python drape.py -- body.glb garment.glb out.glb [gap] [maxgap]
import bpy, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; BODY, GAR, OUT = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.008; MAXG = float(a[4]) if len(a) > 4 else 0.018
LIMB = ("Arm", "ForeArm", "Hand", "Tail", "Leg", "Foot", "Toe", "Head")
limb = lambda o: [g.index for g in o.vertex_groups if any(g.name.endswith(k) or k in g.name.split(":")[-1] for k in LIMB) and "UpLeg" not in g.name]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY)
body = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.name.startswith("Body"))
MWb = body.matrix_world.copy(); me = body.data; kb = me.shape_keys.key_blocks
basis = [MWb @ k.co for k in kb[0].data]; chest = [MWb.to_3x3() @ (kb["Chest"].data[i].co - kb[0].data[i].co) for i in range(len(me.vertices))]
lg = set(limb(body)); lw = [sum(g.weight for g in v.groups if g.group in lg) for v in me.vertices]
polys = [tuple(p.vertices) for p in me.polygons if sum(lw[i] for i in p.vertices) / len(p.vertices) < 0.5]     # the torso alone: never snap to an arm or the tail
bvh = BVHTree.FromPolygons(basis, polys)
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=GAR)
for o in bpy.context.scene.objects:
    if o.type != "MESH" or not o.vertex_groups or not o.data.shape_keys or "Chest" not in o.data.shape_keys.key_blocks: continue
    gm = o.data; MW = o.matrix_world; MI = MW.inverted().to_3x3(); blocks = gm.shape_keys.key_blocks
    lgi = set(g for g in limb(o)); sh = set(g.index for g in o.vertex_groups if "Shoulder" in g.name)
    wt = [max(0.0, 1 - sum(g.weight for g in v.groups if g.group in lgi) * 1.6 - sum(g.weight for g in v.groups if g.group in sh) * 0.6) for v in gm.vertices]
    base = [v.co.copy() for v in blocks[0].data]
    key = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5)); cl = {}; cid = [cl.setdefault(key(c), len(cl)) for c in base]
    nbr = {}
    for e in gm.edges:
        u, v = cid[e.vertices[0]], cid[e.vertices[1]]
        if u != v: nbr.setdefault(u, set()).add(v); nbr.setdefault(v, set()).add(u)
    D = {}; CH = {}
    for i, c in enumerate(base):
        if cid[i] in D: continue
        w = MW @ c; D[cid[i]] = Vector(); CH[cid[i]] = Vector()
        loc, n, fi, d = bvh.find_nearest(w)
        if loc is None or wt[i] <= 0: continue
        nd = min(max(d, GAP), MAXG)
        if (w - loc).dot(n) < 0: nd = GAP; dirv = n                       # inside the body: out to the gap
        else: dirv = (w - loc).normalized() if d > 1e-6 else n
        D[cid[i]] = MI @ ((loc + dirv * nd - w) * wt[i])
        CH[cid[i]] = MI @ (sum((chest[j] for j in polys[fi]), Vector()) / len(polys[fi]) * wt[i] * 1.06)
    for _ in range(12): D = {c: (D[c] * 0.5 + sum((D[j] for j in nbr[c]), Vector()) / len(nbr[c]) * 0.5) if nbr.get(c) else D[c] for c in D}
    for _ in range(4): CH = {c: (CH[c] * 0.5 + sum((CH[j] for j in nbr[c]), Vector()) / len(nbr[c]) * 0.5) if nbr.get(c) else CH[c] for c in CH}
    for i, c in enumerate(base):
        nb = c + D[cid[i]]
        for k in blocks:
            k.data[i].co = nb + CH[cid[i]] if k.name == "Chest" else (nb if k.name == blocks[0].name else k.data[i].co + D[cid[i]])
    print("DRAPE", o.name, "max move", round(max(v.length for v in D.values()), 4), "max chest", round(max(v.length for v in CH.values()), 4))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
