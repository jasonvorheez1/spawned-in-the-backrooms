# Female default underwear, made new (Nov 10, Shelly #183296): the old Under_bottom was loose crumpled triangles that let skin show through the seat.
# The old piece (already lifted at the back by under_back.py) is the mould: thickened, voxel-remeshed into ONE closed surface, relaxed, slimmed;
# weights and every shape key are carried over from the old piece by nearest-triangle interpolation, so it bends and morphs like before.
# blender -b --factory-startup --python-exit-code 1 -P art/human-body/under_new.py -- body_in.glb body_out.glb proofdir
import bpy, bmesh, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
a = sys.argv[sys.argv.index('--') + 1:]
VOX = float(os.environ.get('VOX', '0.008')); THICK = float(os.environ.get('THICK', '0.006')); TRIS = int(os.environ.get('TRIS', '9000'))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
old = bpy.data.objects['Under_bottom']; arm = old.find_armature() or next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mat = next((m for m in old.data.materials if m), None)
# the mould, in world space, basis shape
om = old.data; M = old.matrix_world
ov = [M @ v.co for v in om.vertices]; otris = [tuple(t.vertices) for t in om.loop_triangles] if om.loop_triangles else None
om.calc_loop_triangles(); otris = [tuple(t.vertices) for t in om.loop_triangles]
tree = BVHTree.FromPolygons(ov, otris)
keys = om.shape_keys.key_blocks[1:] if om.shape_keys else []
koff = {k.name: [M.to_3x3() @ (k.data[i].co - om.vertices[i].co) for i in range(len(om.vertices))] for k in keys}
koff = {n: d for n, d in koff.items() if any(x.length > 1e-6 for x in d)}
print('MOULD', len(ov), 'verts', len(keys), 'keys,', len(koff), 'touch it')
# new surface
me = bpy.data.meshes.new('Under_bottom'); bm = bmesh.new()
vs = [bm.verts.new(p) for p in ov]
for t in otris:
    try: bm.faces.new([vs[i] for i in t])
    except ValueError: pass
bm.to_mesh(me); bm.free()
N = bpy.data.objects.new('UB_new', me); bpy.context.scene.collection.objects.link(N)
bpy.context.view_layer.objects.active = N; N.select_set(True)
s = N.modifiers.new('thick', 'SOLIDIFY'); s.thickness = THICK; s.offset = 0
r = N.modifiers.new('vox', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = VOX
c = N.modifiers.new('relax', 'SMOOTH'); c.factor = 0.8; c.iterations = 6
d = N.modifiers.new('dec', 'DECIMATE')
dg = bpy.context.evaluated_depsgraph_get(); n0 = len(N.evaluated_get(dg).data.polygons) * 2
d.ratio = min(1.0, TRIS / max(1, n0))
for m in list(N.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
# keep the outer skin of the slab: drop faces whose normal faces back into the mould's inner side (the side nearest the body)
B = bpy.data.objects['Body']; be = B.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
btree = BVHTree.FromPolygons([B.matrix_world @ v.co for v in be.vertices], [p.vertices[:] for p in be.polygons])
bm = bmesh.from_edit_mesh(me) if False else bmesh.new(); bm.from_mesh(me); bm.normal_update()
drop = []
for f in bm.faces:
    cen = f.calc_center_median()
    h = btree.find_nearest(cen)
    if h[0] is not None and (cen - h[0]).dot(f.normal) < 0 and (cen - h[0]).length < 0.05: drop.append(f)
if os.environ.get('DROP') == '1': bmesh.ops.delete(bm, geom=drop, context='FACES')  # off: where the mould dips under the skin the test flips and eats the outer face (the holes in the Nov 10 render); the closed slab's inner face hides under the skin
bm.to_mesh(me); bm.free()
print('NEW', len(me.vertices), 'verts', len(me.polygons), 'faces, dropped inner', len(drop))
for p in me.polygons: p.use_smooth = True
# carry weights and keys from the mould
groups = {g.index: g.name for g in old.vertex_groups}
N.vertex_groups.clear()
ng = {nm: N.vertex_groups.new(name=nm) for nm in groups.values()}
basis = N.shape_key_add(name='Basis', from_mix=False) if koff else None
kb = {n: N.shape_key_add(name=n, from_mix=False) for n in [k.name for k in keys]} if keys else {}
for v in me.vertices:
    p = N.matrix_world @ v.co
    loc, nrm, fi, dist = tree.find_nearest(p)
    t = otris[fi]; A, Bv, C = (ov[i] for i in t)
    # barycentric weights of loc in the triangle
    w = [0, 0, 0]
    for j in range(3):
        e = [Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))][j]
        q = barycentric_transform(loc, A, Bv, C, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
        w = [max(0.0, q.x), max(0.0, q.y), max(0.0, q.z)]
    sw = sum(w) or 1.0; w = [x / sw for x in w]
    acc = {}
    for wi, i in zip(w, t):
        for g in om.vertices[i].groups:
            acc[g.group] = acc.get(g.group, 0) + wi * g.weight
    for gi, wt in acc.items():
        if wt > 1e-4: ng[groups[gi]].add([v.index], wt, 'REPLACE')
    for n, off in koff.items():
        o = sum((off[i] * wi for wi, i in zip(w, t)), Vector())
        kb[n].data[v.index].co = v.co + N.matrix_world.to_3x3().inverted() @ o
# swap it in under the old name
bpy.data.objects.remove(old, do_unlink=True)
N.name = 'Under_bottom'; me.name = 'Under_bottom'
mw = N.matrix_world.copy(); N.parent = arm; N.matrix_world = mw
N.modifiers.new('skin', 'ARMATURE').object = arm
me.materials.clear(); me.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=a[1], export_apply=False, export_morph=True, export_skins=True)
# proof
for o in bpy.data.objects:
    if o.type == 'MESH' and not (o.name in ('Body', 'Under_bottom', 'Head') or o.name.startswith('Skin_')): o.hide_render = True
if mat and mat.node_tree:
    b = mat.node_tree.nodes.get('Principled BSDF')
    if b: b.inputs['Base Color'].default_value = (0.03, 0.03, 0.035, 1)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 600
for i, pos in enumerate(((0, 1.3, 0.85), (0.9, 0.9, 0.85), (0, -1.3, 0.85))):
    cam = bpy.data.cameras.new('c'); cam.lens = 85; co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); co.location = pos
    co.rotation_euler = (Vector((0, 0, 0.82)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    L = bpy.data.lights.new('l', 'SUN'); L.energy = 3; lo = bpy.data.objects.new('l', L); sc.collection.objects.link(lo); lo.rotation_euler = co.rotation_euler
    sc.camera = co; sc.render.filepath = f'{a[2]}/n{i}.png'; bpy.ops.render.render(write_still=True); lo.hide_render = True
