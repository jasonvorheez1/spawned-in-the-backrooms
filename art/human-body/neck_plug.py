"""Neck plug (Nov 10, Shelly "the neck is off"): in game the head's neck ended in a short taper above the collar, so the
body's neck ring showed below it as a second, offset neck once the idle moved. The head's neck below `top` is stretched
down to `bottom` (inside the collar) and flared to the ring's width, so it sleeves over the body's ring in any pose.
Shape keys follow the same map. Usage: blender -b --python-exit-code 1 -P neck_plug.py -- in.glb out.glb top bottom flare"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; top, bottom, flare = float(a[2]), float(a[3]), float(a[4])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
H = bpy.data.objects['Head']; me = H.data; mw = H.matrix_world; inv = mw.inverted()
kb = me.shape_keys.key_blocks if me.shape_keys else []
zs = [(mw @ v.co).z for v in me.vertices]; lo = min(zs)
ring = [mw @ v.co for v in me.vertices if (mw @ v.co).z < top]
cy = sum(p.y for p in ring) / max(len(ring), 1)
def remap(p):
    if p.z >= top: return p
    t = (top - p.z) / (top - lo)                     # 0 at top, 1 at the old tip
    q = p.copy(); q.z = top - t * (top - bottom)
    f = 1 + (flare - 1) * t
    q.x *= f; q.y = cy + (p.y - cy) * f
    return q
n = 0
for co_get in [lambda i: me.vertices[i]] :
    pass
base = [mw @ v.co for v in me.vertices]
for i, v in enumerate(me.vertices):
    if base[i].z >= top: continue
    v.co = inv @ remap(base[i]); n += 1
    for k in kb:
        w = mw @ k.data[i].co; k.data[i].co = inv @ remap(w)
print('PLUG verts', n, 'tip', round(lo, 3), '->', bottom, 'cy', round(cy, 3))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
