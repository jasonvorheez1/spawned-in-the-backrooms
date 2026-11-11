"""Inseam shell (Nov 11): the men's jeans inner legs stood up to 3 cm off the skin with their own fold, so mid-stride the two inner
panels crossed each other and folded through (pale flashes at the inner thigh and calf). Below the crotch, every inner-facing jeans
vertex is rebuilt from the body's own leg surface: nearest skin point + skin normal x a thin denim gap, blended back to the jeans'
own shape toward the outer leg; weights come from that skin face (own leg only). Usage: inseam_shell.py jeans.glb body.glb out.glb [gap]"""
import bpy, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; src, bod, out = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.007
CROTCH, LEGX = 0.80, 0.095            # z below which a vertex is leg; |x| of each leg's centre line near the thigh
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
keep = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=bod)
new = [o for o in bpy.data.objects if o not in keep]
B = next(o for o in new if o.type == 'MESH' and o.name == 'Body')
bm_w = B.matrix_world; Bd = B.data
verts = [bm_w @ v.co for v in Bd.vertices]; polys = [tuple(p.vertices) for p in Bd.polygons]
tree = BVHTree.FromPolygons(verts, polys)
bnames = {g.index: g.name for g in B.vertex_groups}
mw = J.matrix_world; inv = mw.inverted()
jn = {g.name: g for g in J.vertex_groups}
legs = ('UpLeg', 'Leg', 'Foot', 'ToeBase')
moved = 0; maxd = 0
for v in J.data.vertices:
    p = mw @ v.co
    if p.z > CROTCH + 0.04 or abs(p.x) < 0.004: continue
    side = 1 if p.x > 0 else -1
    # inner-ness: 1 on the inseam, 0 at the leg's centre line and outward; fades in over the last 4 cm below the crotch
    inner = max(0.0, min(1.0, (LEGX - abs(p.x)) / LEGX * 2.0))
    fade = max(0.0, min(1.0, (CROTCH + 0.04 - p.z) / 0.06))
    w = inner * fade
    if w <= 0: continue
    hit, n, fi, dist = tree.find_nearest(p)
    if hit is None: continue
    # stay on this leg's skin: a hit on the far leg is rejected by searching from a point nudged outward
    if hit.x * side < 0:
        hit, n, fi, dist = tree.find_nearest(p + Vector((side * 0.03, 0, 0)))
        if hit is None or hit.x * side < 0: continue
    target = hit + n.normalized() * GAP
    np_ = p.lerp(target, w)
    maxd = max(maxd, (np_ - p).length)
    v.co = inv @ np_; moved += 1
    # weights from that skin face, interpolated by distance to its corners, own leg's bones only
    corners = polys[fi]; ws = {}
    tot = 0
    for ci in corners:
        d = 1.0 / max(1e-4, (verts[ci] - hit).length); tot += d
        for ge in Bd.vertices[ci].groups:
            nme = bnames[ge.group]
            if nme.startswith('Right' if side > 0 else 'Left') and nme.endswith(legs): continue
            ws[nme] = ws.get(nme, 0) + ge.weight * d
    if not ws: continue
    s = sum(ws.values())
    new_w = {k: x / s for k, x in ws.items() if x / s > 0.01}
    old = {J.vertex_groups[g.group].name: g.weight for g in v.groups}
    for nme in set(old) | set(new_w):
        val = old.get(nme, 0) * (1 - w) + new_w.get(nme, 0) * w
        g = jn.get(nme) or J.vertex_groups.new(name=nme); jn[nme] = g
        if val > 0.001: g.add([v.index], val, 'REPLACE')
        elif nme in old: g.remove([v.index])
bpy.ops.object.select_all(action='DESELECT'); J.select_set(True); bpy.context.view_layer.objects.active = J
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
# smooth the seam where the rebuilt band meets the untouched jeans: one light pass on leg vertices, normals recomputed
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
print("MOVED", moved, "MAXSHIFT %.3f" % maxd)
for o in new: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
