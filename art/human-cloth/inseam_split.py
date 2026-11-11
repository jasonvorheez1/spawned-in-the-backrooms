"""Inseam split (Nov 11): the cause of the men's jeans folding through themselves mid-stride. Below the crotch 59 faces still bridged
the LEFT leg to the RIGHT (knee strips at 0.31-0.58 m, hem at 0.1 m): when the legs part they stretch into sheets that cut through
both inner legs, the pale marks and the dark knee seam. Every leg face is cut at x = 0 and the cut edges split, so each leg owns its
half and nothing joins them; then each leg's inner panel is rebuilt from the body's own leg surface (nearest skin point + normal x a
thin denim gap, blended to the jeans' own shape toward the outer leg) with that skin face's weights, own leg only.
Usage: inseam_split.py jeans.glb body.glb out.glb [gap]"""
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; src, bod, out = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.007
CROTCH, LEGX = 0.78, 0.095
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
mw = J.matrix_world; inv = mw.inverted()
# 1) cut and split the legs apart at the body's midline, below the crotch
bm = bmesh.new(); bm.from_mesh(J.data)
dl = bm.verts.layers.deform.verify()
leg = [f for f in bm.faces if (mw @ f.calc_center_median()).z < CROTCH]
geom = list({v for f in leg for v in f.verts}) + list({e for f in leg for e in f.edges}) + leg
pn = (inv.to_3x3() @ Vector((1, 0, 0))).normalized(); pc = inv @ Vector((0, 0, 0))
bmesh.ops.bisect_plane(bm, geom=geom, plane_co=pc, plane_no=pn, dist=1e-5)
on = lambda v: abs((mw @ v.co).x) < 2e-5 and (mw @ v.co).z < CROTCH - 0.01
cut = [e for e in bm.edges if on(e.verts[0]) and on(e.verts[1])]
bmesh.ops.split_edges(bm, edges=cut)
# a vertex still shared by faces on both sides (a lone corner on the line) is torn the same way
torn = 0
for v in list(bm.verts):
    if not on(v): continue
    sides = {1 if (mw @ f.calc_center_median()).x > 0 else -1 for f in v.link_faces}
    if len(sides) > 1:
        bmesh.ops.split_edges(bm, edges=[e for e in v.link_edges], verts=[v]); torn += 1
bm.verts.ensure_lookup_table()
side_of = {}
for v in bm.verts:
    p = mw @ v.co
    if v.link_faces: side_of[v.index] = 1 if sum((mw @ f.calc_center_median()).x for f in v.link_faces) > 0 else -1
    else: side_of[v.index] = 1 if p.x > 0 else -1
bm.to_mesh(J.data); bm.free(); J.data.update()
print("CUT_EDGES", len(cut), "TORN", torn)
# 2) inner panels onto each leg's own skin
keep = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=bod)
new = [o for o in bpy.data.objects if o not in keep]
B = next(o for o in new if o.type == 'MESH' and o.name == 'Body')
verts = [B.matrix_world @ v.co for v in B.data.vertices]; polys = [tuple(p.vertices) for p in B.data.polygons]
# one tree per leg's skin so a vertex can never land on the far leg
def legtree(s):
    ids = [i for i, f in enumerate(polys) if sum(verts[k].x for k in f) * s > 0]
    return BVHTree.FromPolygons(verts, [polys[i] for i in ids]), ids
trees = {1: legtree(1), -1: legtree(-1)}
bn = {g.index: g.name for g in B.vertex_groups}; jn = {g.name: g for g in J.vertex_groups}
legs = ('UpLeg', 'Leg', 'Foot', 'ToeBase'); moved = 0
for v in J.data.vertices:
    p = mw @ v.co
    if p.z > CROTCH + 0.04: continue
    s = side_of[v.index]
    w = max(0.0, min(1.0, (LEGX - abs(p.x)) / LEGX * 2.0)) * max(0.0, min(1.0, (CROTCH + 0.04 - p.z) / 0.06))
    if w <= 0: continue
    tree, ids = trees[s]; hit, n, fi, d = tree.find_nearest(p)
    if hit is None: continue
    v.co = inv @ p.lerp(hit + n.normalized() * GAP, w); moved += 1
    ws = {}
    for ci in polys[ids[fi]]:
        k = 1.0 / max(1e-4, (verts[ci] - hit).length)
        for ge in B.data.vertices[ci].groups:
            nme = bn[ge.group]
            if nme.startswith('Right' if s > 0 else 'Left') and nme.endswith(legs): continue
            ws[nme] = ws.get(nme, 0) + ge.weight * k
    tot = sum(ws.values()) or 1
    nw = {k_: x / tot for k_, x in ws.items() if x / tot > 0.01}
    old = {J.vertex_groups[g.group].name: g.weight for g in v.groups}
    # the old weights too lose the far leg
    old = {k_: x for k_, x in old.items() if not (k_.startswith('Right' if s > 0 else 'Left') and k_.endswith(legs))}
    for nme in set(old) | set(nw):
        val = old.get(nme, 0) * (1 - w) + nw.get(nme, 0) * w
        g = jn.get(nme) or J.vertex_groups.new(name=nme); jn[nme] = g
        if val > 0.001: g.add([v.index], val, 'REPLACE')
        else:
            try: g.remove([v.index])
            except RuntimeError: pass
# any leg vertex outside the band also drops far-leg bones
for v in J.data.vertices:
    p = mw @ v.co
    if p.z > CROTCH: continue
    far = 'Right' if side_of[v.index] > 0 else 'Left'
    for ge in list(v.groups):
        nme = J.vertex_groups[ge.group].name
        if nme.startswith(far) and nme.endswith(legs): J.vertex_groups[nme].remove([v.index])
bpy.ops.object.select_all(action='DESELECT'); J.select_set(True); bpy.context.view_layer.objects.active = J
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
print("MOVED", moved)
# 3) slivers from the cut collapse; the imported custom normals (still the OLD surface's) are dropped so the moved panels shade by
# their own shape: stale normals were the shiny streaks on the inner leg in game
bm = bmesh.new(); bm.from_mesh(J.data)
lf = [f for f in bm.faces if (mw @ f.calc_center_median()).z < CROTCH + 0.04]
bmesh.ops.dissolve_degenerate(bm, edges=list({e for f in lf for e in f.edges}), dist=0.0015)
# the glTF import arrives split at every UV/normal seam: smooth shading over split vertices is flat facets (the pale patches of v2).
# weld every duplicate except the new midline cut, which must stay open
keepcut = lambda v: abs((mw @ v.co).x) < 5e-4 and (mw @ v.co).z < CROTCH - 0.005
bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if not keepcut(v)], dist=1e-5)
bm.to_mesh(J.data); bm.free()
with bpy.context.temp_override(object=J, active_object=J, selected_objects=[J], selected_editable_objects=[J]):
    try: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception as e: print("NOCLEAR", e)
for poly in J.data.polygons: poly.use_smooth = True
J.data.update()
for o in new: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
