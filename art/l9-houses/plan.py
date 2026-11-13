# Measures each fitted house's real inside: slices the outer shell 1.2 m above its threshold, rasterises the plan,
# and finds the largest rectangle (eroded 0.18 m) that holds the doorway. Prints model-frame x/z (z toward the front door).
import bpy, bmesh, sys, json
from mathutils import Vector
args = sys.argv[sys.argv.index("--") + 1:]
glb, dx, dz, dy = args[0], *map(float, args[1:4])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
segs = []
for o in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    if any(m and m.name in ("interior", "ceiling") for m in o.data.materials) and len(o.data.materials) <= 2 and o.data.materials[0].name == "interior": continue
    me = o.data; M = o.matrix_world; h = dy + 1.2
    for p in me.polygons:
        if me.materials and me.materials[p.material_index] and me.materials[p.material_index].name in ("interior", "ceiling"): continue
        vs = [M @ me.vertices[i].co for i in p.vertices]
        pts = []
        for i in range(len(vs)):
            a, b = vs[i], vs[(i + 1) % len(vs)]
            if (a.z - h) * (b.z - h) < 0:
                t = (h - a.z) / (b.z - a.z); q = a + (b - a) * t; pts.append((q.x, -q.y))
        if len(pts) == 2: segs.append(pts)
S = 0.1
xs = [p[0] for s in segs for p in s]; zs = [p[1] for s in segs for p in s]
x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
nx, nz = int((x1 - x0) / S) + 1, int((z1 - z0) / S) + 1
inside = [[False] * nx for _ in range(nz)]
for j in range(nz):
    z = z0 + (j + 0.5) * S; cross = []
    for (a, b) in segs:
        if (a[1] - z) * (b[1] - z) < 0: cross.append(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]))
    cross.sort()
    for k in range(0, len(cross) - 1, 2):
        for i in range(nx):
            x = x0 + (i + 0.5) * S
            if cross[k] <= x <= cross[k + 1]: inside[j][i] = True
E = 2  # erode 0.2 m
ok = [[all(0 <= j + a < nz and 0 <= i + b < nx and inside[j + a][i + b] for a in range(-E, E + 1) for b in range(-E, E + 1)) for i in range(nx)] for j in range(nz)]
best = None
H = [0] * nx
for j in range(nz):
    for i in range(nx): H[i] = H[i] + 1 if ok[j][i] else 0
    for i in range(nx):
        h = 10**9
        for k in range(i, nx):
            h = min(h, H[k]);
            if h == 0: break
            r = (x0 + i * S, x0 + (k + 1) * S, z0 + (j - h + 1) * S, z0 + (j + 1) * S)
            a = (r[1] - r[0]) * (r[3] - r[2])
            if r[0] < dx < r[1] and r[3] > dz - 1.0 and (best is None or a > best[0]): best = (a, r)
print("PLAN", json.dumps({k: round(v, 2) for k, v in zip(("x0", "x1", "z0", "z1"), best[1])}), "segs", len(segs), "bounds", round(x0,2), round(x1,2), round(z0,2), round(z1,2))
