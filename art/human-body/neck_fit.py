"""Neck fit (Nov 10, Shelly "the neck is off"): the head's neck was a pencil next to the body's neck ring (male +-4.3 cm
against +-6.4 cm, female +-3.8 against +-4.8), so it stood as a thin post with a step where it met the collar.
Head_Skin vertices below the jaw are widened side to side, full under `top`, easing to nothing at `jaw`; every shape key
gets the same scale so face and head-type keys keep their deltas. Nothing above the jaw moves.
Usage: blender -b --python-exit-code 1 -P neck_fit.py -- in.glb out.glb <top_z> <jaw_z> <factor>"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; top, jaw, k = float(a[2]), float(a[3]), float(a[4])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
n = 0
for o in bpy.data.objects:
    if o.type != 'MESH' or o.name != 'Head': continue
    me = o.data; mw = o.matrix_world
    kb = me.shape_keys.key_blocks if me.shape_keys else []
    for v in me.vertices:
        z = (mw @ v.co).z
        if z >= jaw: continue
        f = 1 + (k - 1) * ss(jaw, top, z)
        v.co.x *= f
        for key in kb: key.data[v.index].co.x *= f
        n += 1
print('NECK widened verts', n)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
