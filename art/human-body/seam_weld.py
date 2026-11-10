"""Seam weld (Nov 10): the female body is split into skin parts whose shared edges (the centre line up the back and neck, the
part borders) open into white cracks once the rig bends them: matching vertices carry different weights and Bust deltas.
Every group of vertices sharing a position, across all skin parts, gets one averaged weight set, one Bust delta and one
normal. Nothing moves at rest. Usage: blender -b --python-exit-code 1 -P seam_weld.py -- in.glb out.glb"""
import bpy, sys, collections
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
parts = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name == 'Body' or o.name.startswith('Skin_'))]
Q = lambda p: (round(p.x / 2e-4), round(p.y / 2e-4), round(p.z / 2e-4))
groups = collections.defaultdict(list)
for o in parts:
    for v in o.data.vertices: groups[Q(o.matrix_world @ v.co)].append((o, v.index))
shared = {k: g for k, g in groups.items() if len(g) > 1}
nw = 0
for g in shared.values():
    acc = collections.defaultdict(float); bust = Vector(); nrm = Vector()
    for o, i in g:
        v = o.data.vertices[i]
        for ge in v.groups: acc[o.vertex_groups[ge.group].name] += ge.weight / len(g)
        kb = o.data.shape_keys.key_blocks if o.data.shape_keys else None
        if kb and 'Bust' in kb: bust += (kb['Bust'].data[i].co - kb['Basis'].data[i].co) / len(g)
    tot = sum(acc.values()) or 1
    for o, i in g:
        v = o.data.vertices[i]
        for ge in list(v.groups): o.vertex_groups[ge.group].remove([i])
        for name, w in acc.items():
            if w / tot < 1e-3: continue
            vg = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
            vg.add([i], w / tot, 'REPLACE')
        kb = o.data.shape_keys.key_blocks if o.data.shape_keys else None
        if kb and 'Bust' in kb: kb['Bust'].data[i].co = kb['Basis'].data[i].co + bust
        nw += 1
# one normal per shared spot: average the smooth normals so the line shades as one surface
for o in parts:
    o.data.shade_smooth()
norm = collections.defaultdict(Vector)
for o in parts:
    for v in o.data.vertices: norm[Q(o.matrix_world @ v.co)] += o.matrix_world.to_3x3() @ v.normal
for o in parts:
    me = o.data; inv = o.matrix_world.to_3x3().inverted()
    if Q(Vector()) is None: pass
    cn = []
    for l in me.loops:
        v = me.vertices[l.vertex_index]; k = Q(o.matrix_world @ v.co)
        cn.append(((inv @ norm[k]).normalized()) if k in shared else v.normal.copy())
    me.normals_split_custom_set(cn)
print('SEAM shared spots', len(shared), 'verts rewritten', nw)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
