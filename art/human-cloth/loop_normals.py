"""Loop normals (Nov 11): the men's jeans carried 28 custom corner normals turned against their own face (inner calf ~0.6 m,
crotch ~0.9 m). Mid-stride those corners shade as if lit from inside: pale specks on dark denim.
Each corner whose normal points >~78 deg off its face takes the face's normal; every other corner keeps its smoothing.
Usage: loop_normals.py in.glb out.glb"""
import bpy, sys, mathutils
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]; me = J.data
cn = [mathutils.Vector(c.vector) for c in me.corner_normals]
fixed = 0
for p in me.polygons:
    for li in p.loop_indices:
        if cn[li].dot(p.normal) < 0.2: cn[li] = p.normal.copy(); fixed += 1
me.normals_split_custom_set(cn)
bad = sum(1 for p in me.polygons for li in p.loop_indices if mathutils.Vector(me.corner_normals[li].vector).dot(p.normal) < 0.2)
print("FIXED", fixed, "LEFT", bad)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
