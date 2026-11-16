# Nov 16 (Shelly's face shot: the grey hachimaki floated ~3 cm off her hair): pull the band in so its inside rides 6 mm over the hat-pressed hair/skull, angle by angle; the knot keeps its shape (each angle bin moves by one smoothed delta). Skin weights kept.
# run: blender -b --factory-startup --python-exit-code 1 -P hachimaki-snug.py -- <body.glb> <hair.glb|-> <hat_in.glb> <hat_out.glb>
import bpy, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--')+1:]; BODY, HAIR, HIN, HOUT = a
CLEAR, NB = 0.006, 36
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    b = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=p); return [o for o in bpy.data.objects if o not in b]
surf = [o for o in imp(BODY) if o.type == 'MESH' and o.name == 'Head']
if HAIR != '-': surf += [o for o in imp(HAIR) if o.type == 'MESH' and not o.name.startswith('Icosphere')]
for o in surf:
    if o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks: kb.value = 1.0 if kb.name in ('Hatted', 'Ear_Hide') else 0.0
dg = bpy.context.evaluated_depsgraph_get()
V, F = [], []
for o in surf:
    e = o.evaluated_get(dg); m = e.to_mesh(); off = len(V)
    V += [o.matrix_world @ v.co for v in m.vertices]; F += [[off + i for i in p.vertices] for p in m.polygons]; e.to_mesh_clear()
bvh = BVHTree.FromPolygons(V, F)
hatobjs = imp(HIN); hat = next(o for o in hatobjs if o.type == 'MESH' and not o.name.startswith('Icosphere'))
mw = hat.matrix_world; P = [mw @ v.co for v in hat.data.vertices]
cx = sum(p.x for p in P) / len(P); cy = sum(p.y for p in P) / len(P)
def ang(p): return int(((math.atan2(p.y - cy, p.x - cx) + math.pi) / (2 * math.pi)) * NB) % NB
inner = [9.0] * NB; want = [0.0] * NB; zs = [0.0] * NB; cnt = [0] * NB
for p in P:
    b = ang(p); r = math.hypot(p.x - cx, p.y - cy)
    if r < inner[b]: inner[b] = r
    zs[b] += p.z; cnt[b] += 1
gap = [0.0] * NB
for b in range(NB):
    th = (b + 0.5) / NB * 2 * math.pi - math.pi; d = Vector((math.cos(th), math.sin(th), 0)); z = zs[b] / max(cnt[b], 1)
    best = 0.0
    for dz in (-0.02, -0.01, 0, 0.01, 0.02):   # the surface across the band's height: the outermost hit
        o = Vector((cx, cy, z + dz)); h = bvh.ray_cast(o, d, 1.0)
        far = None
        while h[0] is not None:
            far = (h[0] - o).length; o = h[0] + d * 0.0005; h = bvh.ray_cast(o, d, 1.0)
        if far: best = max(best, far)
    gap[b] = inner[b] - (best + CLEAR) if best else 0.0
sm = [sum(gap[(b + k) % NB] for k in (-2, -1, 0, 1, 2)) / 5 for b in range(NB)]
sm = [max(-0.004, g) for g in sm]   # never push in past a 4 mm sink
print('gap cm', [round(g * 100, 1) for g in sm])
inv = mw.inverted()
for v, p in zip(hat.data.vertices, P):
    b = ang(p); r = math.hypot(p.x - cx, p.y - cy)
    if r < 1e-4: continue
    k = (r - sm[b]) / r; q = Vector((cx + (p.x - cx) * k, cy + (p.y - cy) * k, p.z)); v.co = inv @ q
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=HOUT, export_apply=False, export_skins=True, export_morph=True)
