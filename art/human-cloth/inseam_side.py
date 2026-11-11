"""Inseam side (Nov 11): 16 inner-leg vertices of the men's jeans carried weight on the OTHER leg's bones (Left on the right leg and back),
so mid-stride they were dragged toward the far leg and folded the inseam into pale flashes on the inner calf. Each leg vertex below the
crotch drops the far leg's bones and renormalizes; nothing else moves. Left is +X here. Usage: inseam_side.py in.glb out.glb"""
import bpy, sys
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]; mw = J.matrix_world
nm = {g.index: g.name for g in J.vertex_groups}; cut = 0
for v in J.data.vertices:
    p = mw @ v.co
    if p.z > 0.78 or abs(p.x) < 0.01: continue
    far = 'Right' if p.x > 0 else 'Left'
    for g in list(v.groups):
        n = nm[g.group]
        if n.startswith(far) and ('Leg' in n or 'Foot' in n or 'Toe' in n): J.vertex_groups[n].remove([v.index]); cut += 1
bpy.ops.object.select_all(action='DESELECT'); J.select_set(True); bpy.context.view_layer.objects.active = J
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
print("CUT", cut)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
