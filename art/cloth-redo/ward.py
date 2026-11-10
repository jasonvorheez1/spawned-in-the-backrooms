# pull one fitted garment out of the body file as its own skinned Ward_ glb (the wardrobe-split shape: armature + Ward_<kind>, cloth_* material)
# blender -b --factory-startup --python-exit-code 1 --python ward.py -- <fitted body.glb> <slot obj> <Ward_name> <out.glb>
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; SRC, SLOT, WARD, OUT = a
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
g = bpy.data.objects[SLOT]; rig = g.find_armature()
for o in list(bpy.data.objects):
    if o not in (g, rig) and o.type == 'MESH': bpy.data.objects.remove(o)
g.name = WARD
bpy.ops.object.select_all(action='DESELECT'); g.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_animations=False, export_skins=True, export_format='GLB')
print('WARD', WARD, len(g.data.vertices), [m.name for m in g.data.materials])
