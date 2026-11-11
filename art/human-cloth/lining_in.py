"""Lining pulled in (Nov 11): the jeans legs carry an inner layer ~4 mm under the denim; at a bent knee it crossed the outer
and flashed as pale shards on the shin and calf. Vertices used only by inward-facing faces move DEPTH further toward the leg's line.
Usage: lining_in.py in.glb out.glb [depth] [zmax]"""
import bpy, sys, math, bmesh
a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[:2]; DEPTH = float(a[2]) if len(a) > 2 else 0.008; ZMAX = float(a[3]) if len(a) > 3 else 0.62
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
mw = J.matrix_world; inv = mw.inverted()
W = [mw @ v.co for v in J.data.vertices]
# each leg's line: the outer cloth's centre per 5 cm band
bands = {}
for p in W:
    if p.z < ZMAX + 0.05: bands.setdefault((1 if p.x >= 0 else -1, int(p.z / 0.05)), []).append(p)
AX = {k: ((min(q.x for q in v) + max(q.x for q in v)) / 2, (min(q.y for q in v) + max(q.y for q in v)) / 2) for k, v in bands.items()}
def axis(p): s = 1 if p.x >= 0 else -1; return AX.get((s, int(p.z / 0.05))) or (0.075 * s, 0.16)
inward, outward = set(), set()
for f in J.data.polygons:
    c = mw @ f.center; ax = axis(c); dx, dy = c.x - ax[0], c.y - ax[1]; r = math.hypot(dx, dy)
    n = (mw.to_3x3() @ f.normal)
    (inward if r > 1e-4 and (dx * n.x + dy * n.y) < -0.3 * r else outward).update(f.vertices)
only = [i for i in inward - outward if W[i].z < ZMAX]
for i in only:
    p = W[i]; ax = axis(p); dx, dy = p.x - ax[0], p.y - ax[1]; r = math.hypot(dx, dy)
    if r < 0.03: continue
    t = min(1, (ZMAX - p.z) / 0.06); k = max(0.6, (r - DEPTH * t) / r)
    p.x = ax[0] + dx * k; p.y = ax[1] + dy * k
    J.data.vertices[i].co = inv @ p
print("LINING moved", len(only), "verts by up to", DEPTH)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
