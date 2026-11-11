# Men's body: the skin at the base of the neck (z 1.30-1.47) was left as sawtooth flaps by older
# under-cloth shrink passes; under a scoop neck they read as jagged spikes (Nov 11).
# Welds every skin piece by position, Laplacian-smooths that band, writes the positions back.
# blender -b --python-exit-code 1 -P neck_smooth.py -- in.glb out.glb
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--')+1:]; src, dst = a[0], a[1]
ZLO, ZHI, IT = 1.30, 1.47, 24
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
skins = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('Skin_') or o.name in ('Body',))]
key = lambda p: (round(p.x, 4), round(p.y, 4), round(p.z, 4))
pos, nb = {}, {}
for o in skins:
    mw = o.matrix_world; me = o.data
    W = [mw @ v.co for v in me.vertices]
    for w in W: pos.setdefault(key(w), w.copy())
    for e in me.edges:
        k1, k2 = key(W[e.vertices[0]]), key(W[e.vertices[1]])
        nb.setdefault(k1, set()).add(k2); nb.setdefault(k2, set()).add(k1)
band = [k for k, p in pos.items() if ZLO < p.z < ZHI and abs(p.x) < 0.24]
cur = {k: pos[k].copy() for k in pos}
for _ in range(IT):
    nxt = {}
    for k in band:
        ns = [cur[n] for n in nb.get(k, ()) if n in cur]
        if not ns: continue
        avg = sum(ns, Vector()) / len(ns)
        t = min(1, (pos[k].z - ZLO) / 0.03, (ZHI - pos[k].z) / 0.03)  # fade at the band's ends
        nxt[k] = cur[k].lerp(avg, 0.5 * max(0, t))
    cur.update(nxt)
moved = 0
for o in skins:
    mw = o.matrix_world; inv = mw.inverted()
    for v in o.data.vertices:
        k = key(mw @ v.co)
        if k in band and (cur[k] - pos[k]).length > 1e-5:
            v.co = inv @ cur[k]; moved += 1
    o.data.update()
print('NECK band', len(band), 'moved', moved)
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False)
