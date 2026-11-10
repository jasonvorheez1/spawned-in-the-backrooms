# each fitted garment (Ward_*) takes the same per-vertex move its body took (field_<sex>.json from transfer.py), as art/body-rig/build.py does
# blender -b --factory-startup --python-exit-code 1 --python garment.py -- <field.json> <out dir> <in.glb>...
import bpy, sys, json, os
from mathutils import Vector
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index('--') + 1:]; FIELD, OUT, FILES = a[0], a[1], a[2:]
data = json.load(open(FIELD)); kd = KDTree(len(data))
for i, (p, _) in enumerate(data): kd.insert(Vector(p), i)
kd.balance()
for f in FILES:
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        mw = o.matrix_world; inv = mw.inverted().to_3x3(); deltas = []
        for v in o.data.vertices:
            near = kd.find_n(mw @ v.co, 4); wsum = sum(1 / max(.002, d) ** 2 for _, _, d in near)
            d = sum((Vector(data[i][1]) * (1 / max(.002, dd) ** 2) for _, i, dd in near), Vector()) / wsum if near and near[0][2] < .08 else Vector()
            deltas.append(inv @ d)
        sets = [k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []
        sets.append(o.data.vertices)
        seen = set()
        for pts in sets:
            if id(pts) in seen: continue
            seen.add(id(pts))
            for v, d in zip(pts, deltas): v.co += d
        o.data.update()
    for o in bpy.context.scene.objects: o.select_set(o.type in ('ARMATURE', 'MESH'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, os.path.basename(f)), use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_morph_normal=True, export_skins=True, export_format='GLB')
    print('G', os.path.basename(f), flush=True)
