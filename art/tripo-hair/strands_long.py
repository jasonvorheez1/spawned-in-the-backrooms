# Nov 11 (Shelly #190194 "what happeend to the hair", then "yes"): the refit curtain cut (t_s_curtain4) drew as solid shiny shards
# (Tripo cards, no strand map) and stopped at the chest. This lengthens it to the waist and bakes it its own strand map.
# Length: every vertex below DROP_FROM is pushed down so the hem lands at HEM_Z (the crown and bangs never move).
# Strands: per card island, the UV direction of "down the card" is solved from its 3D z; the island is rasterized into the
# map with alpha = fine strands running that way, tapering into comb tips toward the card's low end; grey = per-strand shade.
# usage: blender -b --factory-startup --python-exit-code 1 -P strands_long.py -- <in.glb> <out.glb> <out.png> [hem_z]
import bpy, bmesh, sys, math
import numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
src, out, outpng = a[:3]
HEM_Z = float(a[3]) if len(a) > 3 else 0.97
DROP_FROM, RES = 1.30, 1024
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
h = next(o for o in bpy.data.objects if o.type == 'MESH')
M = h.matrix_world; Mi = M.inverted()
ws = [M @ v.co for v in h.data.vertices]
lo = min(w.z for w in ws)
k = (DROP_FROM - HEM_Z) / (DROP_FROM - lo) if lo < DROP_FROM else 1
for v, w in zip(h.data.vertices, ws):
    if w.z < DROP_FROM:
        nw = Vector((w.x, w.y, DROP_FROM - (DROP_FROM - w.z) * k)); v.co = Mi @ nw
print('LEN', round(lo, 3), '->', HEM_Z, 'k', round(k, 3))
# strand map
bm = bmesh.new(); bm.from_mesh(h.data); bm.faces.ensure_lookup_table()
uvl = bm.loops.layers.uv.active
img = np.zeros((RES, RES, 4), np.float32); img[..., :3] = 1.0
rng = np.random.default_rng(7)
seen = set(); isl = 0
for f0 in bm.faces:
    if f0.index in seen: continue
    st, faces = [f0], []
    while st:
        f = st.pop()
        if f.index in seen: continue
        seen.add(f.index); faces.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g.index not in seen: st.append(g)
    isl += 1
    # solve z ~ a*u + b*v + c over the island's loops: grad (a,b) points "up the card" in uv
    A, Z = [], []
    for f in faces:
        for l in f.loops:
            A.append((l[uvl].uv.x, l[uvl].uv.y, 1.0)); Z.append((M @ l.vert.co).z)
    A, Z = np.array(A), np.array(Z)
    sol = np.linalg.lstsq(A, Z, rcond=None)[0]; g = sol[:2]; gn = np.linalg.norm(g)
    up = g / gn if gn > 1e-9 else np.array([0.0, 1.0]); side = np.array([-up[1], up[0]])
    zmin, zmax = Z.min(), Z.max()
    freq = rng.uniform(55, 80) * (1 if gn < 1e-9 else 1); phase = rng.uniform(0, 6.28); shade = rng.uniform(0.82, 1.0)
    for f in faces:
        ls = f.loops
        for i in range(1, len(ls) - 1):
            tri = [ls[0], ls[i], ls[i + 1]]
            P = np.array([[l[uvl].uv.x, l[uvl].uv.y] for l in tri]); zz = np.array([(M @ l.vert.co).z for l in tri])
            x0, y0 = np.floor(P.min(0) * RES).astype(int) - 1; x1, y1 = np.ceil(P.max(0) * RES).astype(int) + 1
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, RES - 1), min(y1, RES - 1)
            if x1 < x0 or y1 < y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
            q = np.stack([(xs + .5) / RES, (ys + .5) / RES], -1)
            d = (P[1, 0] - P[0, 0]) * (P[2, 1] - P[0, 1]) - (P[2, 0] - P[0, 0]) * (P[1, 1] - P[0, 1])
            if abs(d) < 1e-12: continue
            w1 = ((q[..., 0] - P[0, 0]) * (P[2, 1] - P[0, 1]) - (P[2, 0] - P[0, 0]) * (q[..., 1] - P[0, 1])) / d
            w2 = ((P[1, 0] - P[0, 0]) * (q[..., 1] - P[0, 1]) - (q[..., 0] - P[0, 0]) * (P[1, 1] - P[0, 1])) / d
            w0 = 1 - w1 - w2; pad = -0.08   # bleed past each triangle so card edges never sample empty texels
            m = (w0 > pad) & (w1 > pad) & (w2 > pad)
            if not m.any(): continue
            z = w0 * zz[0] + w1 * zz[1] + w2 * zz[2]
            t = (z - zmin) / max(zmax - zmin, 1e-6)            # 0 at the card's low end, 1 at its root
            s = q @ side * freq * 6.283 + phase
            strand = 0.5 + 0.5 * np.cos(s) + 0.25 * np.cos(s * 2.7 + 1.3)
            tipcut = np.clip(t * 10, 0, 1)                     # the low tenth of each card thins into comb tips
            alpha = np.clip(strand * 1.6 - (1 - tipcut) * 1.2 + 0.15, 0, 1)
            alpha = np.where(t > 0.1, 1.0, alpha)   # Nov 11: solid above the tips; the strands read from the grey, not from holes (holes showed the scalp and back through)
            grey = (0.78 + 0.22 * (0.5 + 0.5 * np.cos(s * 0.37))) * shade
            Y, X = (RES - 1 - ys)[m], xs[m]
            img[Y, X, 3] = np.maximum(img[Y, X, 3], alpha[m]); img[Y, X, 0:3] = grey[m][:, None]
print('ISLANDS', isl, 'covered', round(float((img[..., 3] > 0).mean()), 3))
from PIL import Image
Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(outpng)
bm.free()
bpy.ops.export_scene.gltf(filepath=out, export_skins=True)
