"""Hem smoothing: every open edge of a garment (armhole, sleeve end, collar, hem) was cut stair-stepped from the packed body.
Taubin-smooth each boundary loop along itself (no shrink), ease the next ring in, and carry the same move onto every
shape key, so skin weights and bust morphs stay. Usage: blender -b -P hem_smooth.py -- in.glb out.glb [iters]"""
import bpy, sys, bmesh, mathutils
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[:2]; it = int(a[2]) if len(a) > 2 else 40
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
moved = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    # weld by position so a UV seam never reads as a boundary
    key = lambda v: tuple(round(c, 5) for c in v.co)
    groups = {}
    for v in bm.verts: groups.setdefault(key(v), []).append(v.index)
    rep = {i: g[0] for g in groups.values() for i in g}
    ecount = {}
    for f in bm.faces:
        for e in f.edges:
            a1, b1 = rep[e.verts[0].index], rep[e.verts[1].index]
            if a1 != b1: k = (min(a1, b1), max(a1, b1)); ecount[k] = ecount.get(k, 0) + 1
    bnb = {}
    for (a1, b1), c in ecount.items():
        if c == 1: bnb.setdefault(a1, set()).add(b1); bnb.setdefault(b1, set()).add(a1)
    # the garments are solid shells: an armhole or sleeve end is a rim wall, its outline a sharp crease on each face of the cloth.
    # those crease chains are cut stair-stepped, so they're smoothed like boundaries
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.75:
            a1, b1 = rep[e.verts[0].index], rep[e.verts[1].index]
            if a1 != b1: bnb.setdefault(a1, set()).add(b1); bnb.setdefault(b1, set()).add(a1)
    if not bnb: bm.free(); continue
    nbr = {}
    for (a1, b1) in ecount: nbr.setdefault(a1, set()).add(b1); nbr.setdefault(b1, set()).add(a1)
    P = {r: bm.verts[r].co.copy() for r in set(rep.values())}
    orig = {r: p.copy() for r, p in P.items()}
    B = [r for r in bnb if len(bnb[r]) == 2]
    for _ in range(it):
        for lam in (0.5, -0.53):
            nw = {r: P[r] + (sum((P[n] for n in bnb[r]), mathutils.Vector()) / 2 - P[r]) * lam for r in B}
            P.update(nw)
    # ease the ring just inside each boundary so the smoothed edge doesn't fold the cloth behind it
    ring = {n for r in B for n in nbr[r] if n not in bnb}
    for r in ring:
        d = sum(((P[n] - orig[n]) for n in nbr[r] if n in bnb), mathutils.Vector()); k = sum(1 for n in nbr[r] if n in bnb)
        if k: P[r] = orig[r] + d / k * 0.5
    delta = {i: P[rep[i]] - orig[rep[i]] for i in range(len(bm.verts))}
    bm.free()
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, p in enumerate(kb.data): p.co += delta[i]
    else:
        for i, v in enumerate(me.vertices): v.co += delta[i]
    moved += sum(1 for d in delta.values() if d.length > 1e-5)
print('HEM', src, 'moved', moved)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
