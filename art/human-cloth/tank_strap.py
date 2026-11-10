"""Tank straps: the skin poked through the strap over the shoulder. Push the cloth above the armhole tops out along its
normals (6 mm, feathered over 6 cm), on every shape key too. Usage: blender -b -P tank_strap.py -- in.glb out.glb ztop"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, out, z0 = a[0], a[1], float(a[2])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')]:
    me = o.data; me.calc_normals_split() if hasattr(me, 'calc_normals_split') else None
    d = []
    for v in me.vertices:
        w = max(0.0, min(1.0, (v.co.z - z0) / 0.06)); d.append(v.normal * 0.006 * w)
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, p in enumerate(kb.data): p.co += d[i]
    else:
        for i, v in enumerate(me.vertices): v.co += d[i]
    print('STRAP', o.name, sum(1 for x in d if x.length > 0))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
