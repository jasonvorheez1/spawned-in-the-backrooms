"""Weight match: a garment's skin weights taken from the body under it (nearest face, interpolated), so cloth bends with the
skin it covers. Arms-down crumpled the tank's cups and straps: its upper chest carried more arm weight than the body.
Usage: blender -b -P weight_match.py -- body.glb garment.glb out.glb"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; body, garm, out = a[:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
src = bpy.data.objects.get('Body') or next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Skin_torso'))
keep = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=garm)
new = [o for o in bpy.data.objects if o not in keep]
for g in [o for o in new if o.type == 'MESH']:
    for vg in list(g.vertex_groups): g.vertex_groups.remove(vg)
    for vg in src.vertex_groups: g.vertex_groups.new(name=vg.name)
    sk = g.data.shape_keys; g.active_shape_key_index = 0
    m = g.modifiers.new('wt', 'DATA_TRANSFER'); m.object = src; m.use_vert_data = True; m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'; m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = g
    mods = [x for x in g.modifiers if x.type == 'ARMATURE']
    bpy.ops.object.modifier_move_to_index(modifier='wt', index=0)
    bpy.ops.object.modifier_apply(modifier='wt')  # works with shape keys: data transfer writes weights only
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.vertex_group_limit_total(limit=4)
    used = {gg.group for v in g.data.vertices for gg in v.groups if gg.weight > 0}
    for vg in list(g.vertex_groups):
        if vg.index not in used: g.vertex_groups.remove(vg)
    print('WT', g.name, 'groups', len(g.vertex_groups))
for o in list(bpy.data.objects):
    if o not in new: bpy.data.objects.remove(o)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
