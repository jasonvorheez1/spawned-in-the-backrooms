"""Neck tuck (Nov 10, Shelly "the neck is off"): the body's neck stub sat ~4 cm behind the head's neck, so its back edge
stuck out as a ledge/seam at the collar. Body verts between z0 and z1 ease toward the head's neck centre (measured at
z1+band) and shrink by `k`, so the stub tucks inside the head's neck. Shape keys follow the same move.
Usage: blender -b --python-exit-code 1 -P neck_tuck.py -- in.glb out.glb z0 z1 k"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; z0, z1, k = map(float, a[2:5])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
H = bpy.data.objects['Head']; B = bpy.data.objects['Body']
hp = [H.matrix_world @ v.co for v in H.data.vertices]
band = [p for p in hp if z1 + 0.01 < p.z < z1 + 0.05 and abs(p.x) < 0.09]
hy = (min(p.y for p in band) + max(p.y for p in band)) / 2
mw = B.matrix_world; inv = mw.inverted(); me = B.data
bp = [mw @ v.co for v in me.vertices]
ring = [p for p in bp if z1 - 0.02 < p.z < z1 + 0.02 and abs(p.x) < 0.1]
by = (min(p.y for p in ring) + max(p.y for p in ring)) / 2
kb = me.shape_keys.key_blocks if me.shape_keys else []
def ss(x):
    t = max(0.0, min(1.0, (x - z0) / (z1 - z0))); return t * t * (3 - 2 * t)
def move(p, t):
    q = p.copy(); f = 1 + (k - 1) * t
    q.y = (by + (hy - by) * t) + (p.y - by) * f; q.x = p.x * f; return q
n = 0
for i, v in enumerate(me.vertices):
    p = bp[i]
    if p.z <= z0 or abs(p.x) > 0.12: continue
    t = ss(p.z); v.co = inv @ move(p, t); n += 1
    for kk in kb:
        w = mw @ kk.data[i].co; kk.data[i].co = inv @ move(w, t)
print('TUCK verts', n, 'body cy', round(by, 3), '-> head cy', round(hy, 3))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
