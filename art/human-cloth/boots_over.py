"""Boots over trousers (Nov 11): the jeans hem poked out through the boot shaft mid-stride. Each shaft vertex is pushed out
from its leg's line to clear the widest trouser cloth at that angle and height by CLEAR, faded in above the ankle.
Usage: boots_over.py boots.glb trousers.glb out.glb [clear]"""
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
src, trou, out = a[:3]; CLEAR = float(a[3]) if len(a) > 3 else 0.007
def load(p, keep):
    if not keep: bpy.ops.wm.read_factory_settings(use_empty=True)
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=p)
    return [o for o in bpy.data.objects if o not in before]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
_b = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
_bm = [m.name for m in _b.data.materials]; _pts = {}
for f in _b.data.polygons:
    if _bm and _bm[f.material_index] == 'button': continue
    for vi in f.vertices:
        q = _b.matrix_world @ _b.data.vertices[vi].co
        if q.z > 0.12: _pts.setdefault((1 if q.x >= 0 else -1, int(q.z / 0.02)), []).append(q)
_AX0 = {k: mathutils.Vector(((min(q.x for q in v) + max(q.x for q in v)) / 2, (min(q.y for q in v) + max(q.y for q in v)) / 2, k[1] * 0.02)) for k, v in _pts.items() if len(v) > 20}
tro = load(trou, False); T = [o for o in tro if o.type == 'MESH' and o.name.startswith('Ward_')][0]
tp = [T.matrix_world @ v.co for v in T.data.vertices]
# sample the trouser surface densely along its edges (rings are sparse in height)
samp = list(tp)
for e in T.data.edges:
    p0, p1 = tp[e.vertices[0]], tp[e.vertices[1]]; n = int((p1 - p0).length / 0.01)
    for i in range(1, n): samp.append(p0.lerp(p1, i / n))
for o in tro: bpy.data.objects.remove(o)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
B = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
arm = B.find_armature()
ctr = {}
for s, nm in ((1, 'Left'), (-1, 'Right')):
    b = arm.data.bones[nm + 'Leg']; f = arm.data.bones[nm + 'Foot']
    ctr[s] = (arm.matrix_world @ b.head_local, arm.matrix_world @ f.head_local)
AX = {}  # each leg's line through the boot's own centre per 2 cm band (the bones run along its back wall)
def axis(s, z):
    zi = int(z / 0.02)
    for d in (0, -1, 1, -2, 2, -3, 3):
        if (s, zi + d) in AX: return AX[(s, zi + d)]
    top = max((k for k in AX if k[0] == s), default=None, key=lambda k: k[1])
    if top: return AX[top]
    h, f = ctr[s]; t = (z - f.z) / (h.z - f.z); return f.lerp(h, t)
AX.update(_AX0); print('AX', {k: (round(v.x,3), round(v.y,3)) for k, v in sorted(_AX0.items())})
bins = {}
for p in samp:
    if p.z > 0.4: continue
    s = 1 if p.x >= 0 else -1; c = axis(s, p.z); ang = math.atan2(p.y - c.y, p.x - c.x)
    k = (s, int(p.z / 0.02), int((ang + math.pi) / (math.pi / 12)) % 24)
    r = math.hypot(p.x - c.x, p.y - c.y); bins[k] = max(bins.get(k, 0), r)
mw = B.matrix_world; inv = mw.inverted(); top = max((mw @ v.co).z for v in B.data.vertices)
def key(p):
    s = 1 if p.x >= 0 else -1; c = axis(s, p.z); dx, dy = p.x - c.x, p.y - c.y
    return s, c, dx, dy, math.hypot(dx, dy), int(p.z / 0.02), int((math.atan2(dy, dx) + math.pi) / (math.pi / 12)) % 24
base = [mw @ v.co for v in B.data.vertices]
# the shaft opens as one ring per height: one factor per side and 2 cm band, from the boot's narrowest wall against the
# widest trouser cloth there, smoothed up the leg; the whole ring scales so cuff folds, buttons and trim keep their shape
# the boot wall sampled along its edges (its sides are long faces with few vertices), buttons left out
bmat = [m.name for m in B.data.materials]
shell_v = set()
for f in B.data.polygons:
    if bmat and bmat[f.material_index] == 'button': continue
    shell_v.update(f.vertices)
wall = {}
for e in B.data.edges:
    if e.vertices[0] not in shell_v or e.vertices[1] not in shell_v: continue
    p0, p1 = base[e.vertices[0]], base[e.vertices[1]]; n = max(1, int((p1 - p0).length / 0.008))
    for i in range(n + 1):
        q = p0.lerp(p1, i / n)
        if q.z < 0.12: continue
        s_, c, dx, dy, r, zi, ai = key(q)
        wall[(s_, zi, ai)] = max(wall.get((s_, zi, ai), 0), r)
need = {}; DBG = {}
for (s_, zi, ai), br in wall.items():
    if br < 0.03: continue
    if (s_, zi) not in DBG: DBG[(s_, zi)] = []
    jr = max((bins.get((s_, zi + dz, (ai + da) % 24), 0) for dz in (-1, 0, 1) for da in (-1, 0, 1)), default=0)
    DBG[(s_, zi)].append((round(br, 3), round(jr, 3)))
    if jr > 0: need[(s_, zi)] = max(need.get((s_, zi), 1.0), min(1.25, (jr + CLEAR) / br))
fac = {}
for (s, zi), v in need.items():
    vs = [need.get((s, zi + d), 1.0) for d in (-2, -1, 0, 1, 2)]
    fac[(s, zi)] = max(v, sum(vs) / len(vs))
top_f = {}
moved = 0; delta = {}
for i, p in enumerate(base):
    if p.z < 0.12: continue
    s, c, dx, dy, r, zi, ai = key(p)
    k = fac.get((s, zi)) or max([fac.get((s, z2), 1.0) for z2 in range(zi - 3, zi)] + [1.0])
    if k <= 1.0001: continue
    w = min(1, (p.z - 0.12) / 0.04); w = w * w * (3 - 2 * w); k = 1 + (k - 1) * w
    delta[i] = (dx * (k - 1), dy * (k - 1)); moved += 1
print("DBG", {k: (min(v), max(v)) for k, v in sorted(DBG.items()) if v and k[0] == 1}); print("FAC", {k: round(v, 3) for k, v in sorted(fac.items())})
def apply(co_list):
    for i, (dx, dy) in delta.items():
        w = mw @ co_list[i].co; w.x += dx; w.y += dy; co_list[i].co = inv @ w
if B.data.shape_keys:
    for kb in B.data.shape_keys.key_blocks: apply(kb.data)
else: apply(B.data.vertices)
print("MOVED", moved, "of", len(base), "top", round(top, 3))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
