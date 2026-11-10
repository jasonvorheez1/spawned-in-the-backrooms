# Carries the female body's Bust shape key onto a garment that lacks it (Shelly, Nov 10 #182012: a chest change must not mean remaking outfits)
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/bust_transfer.py -- body.glb garment.glb out.glb
import bpy, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body_f, gar_f, out_f = sys.argv[sys.argv.index("--") + 1:][:3]
NEAR, FAR = 0.04, 0.10   # full follow within 4 cm of the skin, none past 10 cm. Savi's picks
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body_f)
verts, deltas, tris = [], [], []
for o in bpy.data.objects:
    if o.type != "MESH" or not o.data.shape_keys or "Bust" not in o.data.shape_keys.key_blocks: continue
    if not (o.name == "Body" or o.name.startswith("Skin_")): continue
    kb = o.data.shape_keys.key_blocks; M = o.matrix_world; base = len(verts)
    for i, v in enumerate(o.data.vertices):
        b = M @ kb["Basis"].data[i].co; verts.append(b); deltas.append((M @ kb["Bust"].data[i].co) - b)
    o.data.calc_loop_triangles()
    tris += [tuple(base + j for j in t.vertices) for t in o.data.loop_triangles]
T = BVHTree.FromPolygons(verts, tris)
TB = BVHTree.FromPolygons([v + d for v, d in zip(verts, deltas)], tris)   # the full-chest skin the keyed cloth must clear
GAP = 0.007   # cloth at least 7 mm off the full-chest skin. Savi's pick
print("SRC", len(verts), "moving", sum(1 for d in deltas if d.length > 1e-4), "max", max(d.length for d in deltas))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=gar_f)
g = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Ward_"))
M = g.matrix_world; Mi = M.inverted()
D = []
for v in g.data.vertices:
    p = M @ v.co; hit, n, fi, dist = T.find_nearest(p, FAR)
    if hit is None: D.append(Vector()); continue
    t = tris[fi]; ws = [1.0 / max((verts[k] - hit).length, 1e-5) for k in t]; s = sum(ws)
    d = sum((deltas[k] * (w / s) for k, w in zip(t, ws)), Vector())
    f = 1.0 if dist <= NEAR else max(0.0, 1 - (dist - NEAR) / (FAR - NEAR))
    D.append(d * f)
nb = [[] for _ in g.data.vertices]
for e in g.data.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
for _ in range(4):   # knit lumps smoothed so the swell reads as cloth, not a decal
    D = [(D[i] * 0.5 + sum((D[j] for j in nb[i]), Vector()) * (0.5 / len(nb[i]))) if nb[i] else D[i] for i in range(len(D))]
pushed = 0
for i, v in enumerate(g.data.vertices):
    q = M @ v.co + D[i]; hit, n, fi, dist = TB.find_nearest(q, 0.05)
    if hit is None: continue
    s = (q - hit).dot(n)
    if s < GAP: D[i] += n * (GAP - s); pushed += 1
print("PUSHED", pushed)
# skin points that still slip between cloth vertices: cast from 5 cm out along the skin normal; cloth landing under the skin + GAP is lifted
def lift(skin, key):
    P = [M @ v.co + (D[i] if key else Vector()) for i, v in enumerate(g.data.vertices)]
    g.data.calc_loop_triangles(); C = BVHTree.FromPolygons(P, [tuple(t.vertices) for t in g.data.loop_triangles])
    bump = {}
    for ti in range(len(tris)):
        a, b, c = (skin[k] for k in tris[ti]); n = (b - a).cross(c - a)
        if n.length < 1e-9: continue
        n.normalize(); s = (a + b + c) / 3
        if n.dot(s - Vector((0, 0, s.z))) < 0: continue   # only outward-facing skin
        h = C.ray_cast(s + n * 0.05, -n, 0.05 + GAP)
        if h[0] is None: continue
        need = GAP - (h[0] - s).dot(n)
        if need > 0:
            cp = h[0]
            bump.setdefault(ti, (cp, n, need))
    moved = 0
    for cp, n, need in bump.values():
        for i, q in enumerate(P):
            r = (q - cp).length
            if r < 0.02:
                f = need * (1 - r / 0.02)
                if key: D[i] += n * f
                else: g.data.vertices[i].co = Mi @ (M @ g.data.vertices[i].co + n * f)
                moved += 1
    return len(bump), moved
print("LIFT0", lift(verts, False)); print("LIFT1", lift([v + d for v, d in zip(verts, deltas)], True))
g.shape_key_add(name="Basis"); k = g.shape_key_add(name="Bust", from_mix=False)
for i, v in enumerate(g.data.vertices): k.data[i].co = Mi @ ((M @ v.co) + D[i])
print("GAR", g.name, len(D), "moved", sum(1 for d in D if d.length > 1e-4), "max", max(d.length for d in D))
bpy.ops.export_scene.gltf(filepath=out_f, export_morph=True, export_skins=True, export_yup=True)
