"""Leg weights (Nov 11): the men's jeans legs carried their own weights; mid-stride the inseam panels bent apart from the skin and
crossed each other, a crease that flashed lighter on the inner calf. Below the crotch every jeans vertex takes the body's weights
from the nearest skin face, so the leg bends exactly as the leg under it. Waist and seat keep their own.
Usage: leg_weights.py jeans.glb body.glb out.glb"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, bod, out = a[:3]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
keep = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=bod)
new = [o for o in bpy.data.objects if o not in keep]
B = next(o for o in new if o.type == 'MESH' and o.name == 'Body')  # the bare skin, not the head or a garment
mw = J.matrix_world
vg = J.vertex_groups.get('LEGSEL') or J.vertex_groups.new(name='LEGSEL')
sel = [v.index for v in J.data.vertices if (mw @ v.co).z < 0.78]
vg.add(sel, 1.0, 'REPLACE')
m = J.modifiers.new('wt', 'DATA_TRANSFER'); m.object = B; m.use_vert_data = True
m.data_types_verts = {'VGROUP_WEIGHTS'}; m.vert_mapping = 'POLYINTERP_NEAREST'
m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'; m.vertex_group = 'LEGSEL'
bpy.context.view_layer.objects.active = J
bpy.ops.object.datalayout_transfer(modifier='wt')
while J.modifiers[0].name != 'wt': bpy.ops.object.modifier_move_up(modifier='wt')
bpy.ops.object.modifier_apply(modifier='wt')
J.vertex_groups.remove(J.vertex_groups['LEGSEL'])
bpy.ops.object.select_all(action='DESELECT'); J.select_set(True); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
print("TRANSFERRED", len(sel), "from", B.name, "groups", len(J.vertex_groups), "mods", [x.type for x in J.modifiers])
for o in new: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
