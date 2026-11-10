# swap a garment mesh inside the body file for its Tripo remesh: pushed off the skin, weights copied from the skin (Shelly #177592/#178061)
# blender -b --factory-startup --python-exit-code 1 --python fit.py -- <body.glb> <aligned garment.glb> <slot name> <out.glb> <proof.png>
import bpy, sys, math, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; BODY, GAR, SLOT, OUT, PROOF = a
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=BODY)
old = bpy.data.objects[SLOT]; rig = old.find_armature() or next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mats = list(old.data.materials); par = old.parent
skins = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name == 'Body' or o.name.startswith('Skin_'))]
# one evaluated skin copy for the surface and the weights
dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new()
for o in skins:
    m = o.evaluated_get(dg).to_mesh(); m.transform(o.matrix_world); bm.from_mesh(m); o.evaluated_get(dg).to_mesh_clear()
bm.normal_update(); tree = BVHTree.FromBMesh(bm)
before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=GAR)
g = next(o for o in set(bpy.data.objects) - before if o.type == 'MESH'); g.parent = None
bpy.ops.object.select_all(action='DESELECT'); g.select_set(True); bpy.context.view_layer.objects.active = g
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in set(bpy.data.objects) - before:
    if o != g: bpy.data.objects.remove(o)
# weld first: tripo splits verts at uv seams, and a move that differs across a seam tears holes
bm2 = bmesh.new(); bm2.from_mesh(g.data); bmesh.ops.remove_doubles(bm2, verts=bm2.verts, dist=0.0005); bm2.to_mesh(g.data); bm2.free()
# the push is a displacement field eased over the cloth's own edges: the knit keeps its folds, nothing creases flat on the skin
V = g.data.vertices; D = []
for v in V:
    loc, nrm, _, _ = tree.find_nearest(v.co)
    side = (v.co - loc).dot(nrm) if loc is not None else 1
    D.append(nrm * (0.014 - side) if side < 0.014 else Vector())
nb = [[] for _ in V]
for e in g.data.edges:
    i, j = e.vertices; nb[i].append(j); nb[j].append(i)
for _ in range(8):
    D = [max(d, sum((D[j] for j in nb[i]), Vector()) / len(nb[i]), key=lambda x: x.length) * 0.5 + (sum((D[j] for j in nb[i]), Vector()) / len(nb[i])) * 0.5 if nb[i] else d for i, d in enumerate(D)]
for v, d in zip(V, D): v.co += d
# last guard: nothing left under 8 mm
low = 0
for v in V:
    loc, nrm, _, _ = tree.find_nearest(v.co)
    if loc is not None and (v.co - loc).dot(nrm) < 0.008: v.co = loc + nrm * 0.008; low += 1
print('welded verts', len(V), 'guarded', low)
# weights: nearest skin face's groups, from a joined skin copy
src = bpy.data.objects.new('wsrc', bpy.data.meshes.new('wsrc')); bpy.context.scene.collection.objects.link(src)
bpy.ops.object.select_all(action='DESELECT')
cps = []
for o in skins:
    c = o.copy(); c.data = o.data.copy(); c.modifiers.clear(); bpy.context.scene.collection.objects.link(c); c.parent = None; c.matrix_world = o.matrix_world; cps.append(c)
for c in cps: c.select_set(True)
bpy.context.view_layer.objects.active = cps[0]; bpy.ops.object.join(); src = cps[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
dt = g.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = src; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.select_all(action='DESELECT'); g.select_set(True); bpy.context.view_layer.objects.active = g
bpy.ops.object.datalayout_transfer(modifier='dt'); bpy.ops.object.modifier_apply(modifier='dt')
bpy.data.objects.remove(src)
for p in g.data.polygons: p.use_smooth = True
# take the old slot's place: name, material, rig
# tripo's own material (its UVs match it), renamed to the slot name the game tints; the old texture smeared on the new UVs
tm = g.data.materials[0]; oldm = mats[0]; nm = oldm.name; oldm.name = nm + '_old'; tm.name = nm
tm.use_backface_culling = False
print('material', nm)
oldname = old.name; bpy.data.objects.remove(old); g.name = oldname
g.parent = rig; am = g.modifiers.new('Armature', 'ARMATURE'); am.object = rig
print('groups', len(g.vertex_groups), 'tris', sum(len(p.vertices) - 2 for p in g.data.polygons))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=False, export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_format='GLB')
# proof: skin + this garment, front and side
for o in bpy.data.objects:
    if o.type == 'MESH': o.hide_render = not (o == g or o in skins or o.name.split('.')[0] in ('Head', 'Body'))
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.render.resolution_x = 1200; sc.render.resolution_y = 900
w = bpy.data.worlds.new('w'); w.color = (0.22, 0.22, 0.22); sc.world = w
for loc, e in (((2, -3, 2.5), 400), ((-2, -2, 2), 250), ((0, 3, 2), 200)):
    l = bpy.data.lights.new('l', 'AREA'); l.energy = e; l.size = 3; lo = bpy.data.objects.new('l', l); sc.collection.objects.link(lo); lo.location = loc
    lo.rotation_euler = (lo.location - Vector((0, 0, 1.1))).to_track_quat('Z', 'Y').to_euler()
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.3; co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
outs = []
for i, ang in enumerate((0, 50, 180)):
    r = math.radians(ang); co.location = (3 * math.sin(r), -3 * math.cos(r), 1.0); co.rotation_euler = (math.radians(90), 0, r)
    sc.render.filepath = f'/tmp/fit_{i}.png'; bpy.ops.render.render(write_still=True); outs.append(sc.render.filepath)
print('PROOF', outs)
