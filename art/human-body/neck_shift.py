"""Neck shift (Nov 10, Shelly "the neck is off"): measured, the head's neck sat ~4.5 cm in front of the body's neck ring
(male centre y 0.07 vs 0.115; female 0.066 vs 0.113), so in game the body's own neck stub showed behind it as a second,
offset neck. Head_Skin below `full` moves back by `dy`, easing to nothing at `jaw`; shape keys follow.
Usage: blender -b --python-exit-code 1 -P neck_shift.py -- in.glb out.glb full jaw dy"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; full, jaw, dy = float(a[2]), float(a[3]), float(a[4])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
H = bpy.data.objects['Head']; me = H.data; mw = H.matrix_world; inv = mw.inverted()
kb = me.shape_keys.key_blocks if me.shape_keys else []
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
n = 0
for i, v in enumerate(me.vertices):
    p = mw @ v.co
    if p.z >= jaw: continue
    s = dy * (1 - ss(full, jaw, p.z))
    p.y += s; v.co = inv @ p; n += 1
    for k in kb:
        w = mw @ k.data[i].co; w.y += s; k.data[i].co = inv @ w
print('SHIFT verts', n)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
