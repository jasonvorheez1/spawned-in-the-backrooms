"""Men's tee, Nov 11: the shoulder band takes the body's own skin weights so a lowered arm doesn't tent the
shoulder into a lump. Measures the gap with arms down before/after. Usage: tee_weights.py tee.glb body.glb out.glb"""
import bpy, sys, math, bmesh
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
tee, body, out = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
barm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
skins = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('Skin_') or o.name == 'Body')]
bpy.ops.object.select_all(action='DESELECT')
cp = []
for o in skins:
    c = o.copy(); c.data = o.data.copy(); bpy.context.collection.objects.link(c); cp.append(c)
    for m in list(c.modifiers): c.modifiers.remove(m)
    c.parent = None; c.matrix_world = o.matrix_world
for c in cp: c.select_set(True)
bpy.context.view_layer.objects.active = cp[0]; bpy.ops.object.join(); S = cp[0]; S.hide_render = True
n0 = set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=tee)
new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in n0]
T = next(o for o in new if o.type == 'MESH' and o.name.startswith('Ward_'))
tarm = next(o for o in new if o.type == 'ARMATURE')
shx = abs((barm.matrix_world @ barm.data.bones['LeftArm'].head_local).x)
def pose(ang):
    for arm in (barm, tarm):
        for s in ('Left', 'Right'):
            pb = arm.pose.bones[s + 'Arm']; pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
            # arms down: find the axis by trial (bone-local); Z rolls them in this rig
            pb.rotation_euler[2] = math.radians(ang if s == 'Left' else -ang)
    bpy.context.view_layer.update()
def gap(tag, ang):
    pose(ang); dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new()
    for o in skins:
        t = bmesh.new(); t.from_object(o, dg); t.transform(o.matrix_world); me = bpy.data.meshes.new('t'); t.to_mesh(me); bm.from_mesh(me)
    tr = BVHTree.FromBMesh(bm); me = T.evaluated_get(dg).to_mesh(); band = []
    rest = [T.matrix_world @ v.co for v in T.data.vertices]
    for i, v in enumerate(me.vertices):
        if not (shx - 0.06 < abs(rest[i].x) < shx + 0.08 and rest[i].z > 1.25): continue
        p = T.matrix_world @ v.co; loc, nr, _, d = tr.find_nearest(p); s = (p - loc).dot(nr); band.append(d if s > 0 else -d)
    band.sort(); print(tag, ang, "shoulder band n", len(band), "min %.3f med %.3f p95 %.3f max %.3f" % (band[0], band[len(band)//2], band[int(len(band)*.95)], band[-1]))
for ang in (60, -60): gap('BEFORE', ang)
pose(0)
rest = [T.matrix_world @ v.co for v in T.data.vertices]
sel = [i for i, p in enumerate(rest) if shx - 0.08 < abs(p.x) < shx + 0.10 and p.z > 1.2]
# body weights at each band vertex (nearest face, interpolated), blended over the band edges
dt = T.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = S; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
for g in S.vertex_groups:
    if g.name not in T.vertex_groups: T.vertex_groups.new(name=g.name)
mask = T.vertex_groups.new(name='_band')
for i in sel:
    p = rest[i]; t = min(1, min(abs(p.x) - (shx - 0.08), (shx + 0.10) - abs(p.x), p.z - 1.2) / 0.03)
    mask.add([i], max(0, t), 'REPLACE')
dt.vertex_group = '_band'; dt.mix_mode = 'REPLACE'; dt.mix_factor = 1.0
bpy.context.view_layer.objects.active = T
bpy.ops.object.modifier_move_to_index(modifier='dt', index=0); bpy.ops.object.modifier_apply(modifier='dt')
T.vertex_groups.remove(mask)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.01)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
for g in list(T.vertex_groups):
    if g.name not in tarm.data.bones: T.vertex_groups.remove(g)
for ang in (60, -60): gap('AFTER', ang)
pose(0)
for o in bpy.data.objects: o.select_set(o in new)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
print("WROTE", out, "band", len(sel))
