# Shelly "ehhhh try again, do better" (Nov 11 10:02): the thick Body read lumpy and faceted.
# Taubin-smooths the Dandy (worn) shape of the Body shell, then subdivides it once with every shape key kept.
# Usage: blender -b --python smooth_body.py -- <in.glb> <out.glb> [iters=12]
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT = a[0], a[1]; IT = int(a[2]) if len(a) > 2 else 12
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.split('.')[0] == 'Body')
me = body.data; kb = me.shape_keys.key_blocks; kd = kb['Dandy']
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
# weld by position: the glTF splits verts at UV seams; smooth over the welded surface so seams never open
key = lambda co: (round(co.x, 5), round(co.y, 5), round(co.z, 5))
grp = {}
for v in bm.verts: grp.setdefault(key(v.co), []).append(v.index)
rep = {}; 
for g in grp.values():
  for i in g: rep[i] = g[0]
nb = {}
for e in bm.edges:
  i, j = rep[e.verts[0].index], rep[e.verts[1].index]
  if i != j: nb.setdefault(i, set()).add(j); nb.setdefault(j, set()).add(i)
border = set()
for e in bm.edges:
  if e.is_boundary:
    # a seam boundary has a twin by position; a true border (the neck hole, cuffs) does not move
    pass
edgecount = {}
for e in bm.edges:
  k2 = tuple(sorted((rep[e.verts[0].index], rep[e.verts[1].index])))
  edgecount[k2] = edgecount.get(k2, 0) + 1
for (i, j), c in edgecount.items():
  if c == 1 and i != j: border.add(i); border.add(j)
reps = sorted(set(rep.values()))
P = {r: Vector(kd.data[r].co) for r in reps}
for it in range(IT * 2):
  lam = 0.5 if it % 2 == 0 else -0.53
  Q = {}
  for r in reps:
    if r in border or r not in nb: Q[r] = P[r]; continue
    c = Vector((0, 0, 0))
    for n in nb[r]: c += P[n]
    c /= len(nb[r]); Q[r] = P[r] + lam * (c - P[r])
  P = Q
for i in range(len(kd.data)): kd.data[i].co = P[rep[i]]
bm.free()
print("SMOOTHED", len(reps), "border", len(border))
# subdivide once, every key kept: bake each key's shape through a subsurf on a copy
names = [k.name for k in kb]
def subdiv_coords(keyname):
  d = body.copy(); d.data = body.data.copy(); bpy.context.collection.objects.link(d)
  for k in d.data.shape_keys.key_blocks: k.value = 0
  if keyname != 'Basis': d.data.shape_keys.key_blocks[keyname].value = 1
  bpy.context.view_layer.objects.active = d; d.select_set(True)
  d.shape_key_add(name='mix', from_mix=True)
  m = d.data.shape_keys.key_blocks['mix']; co = [Vector(p.co) for p in m.data]
  d.shape_key_clear()
  for i, v in enumerate(d.data.vertices): v.co = co[i]
  for md in list(d.modifiers): d.modifiers.remove(md)
  s = d.modifiers.new('s', 'SUBSURF'); s.levels = 1; s.render_levels = 1; s.uv_smooth = 'PRESERVE_CORNERS'; s.boundary_smooth = 'PRESERVE_CORNERS'
  bpy.ops.object.modifier_apply(modifier='s')
  out = [Vector(v.co) for v in d.data.vertices]; return d, out
base, cb = subdiv_coords('Basis')
shapes = {n: subdiv_coords(n) for n in names if n != 'Basis'}
for n, (d, co) in shapes.items(): bpy.data.objects.remove(d)
# base keeps the subdivided topology, its vertex groups, UVs, materials; re-hang it like the original
base.parent = body.parent; base.matrix_parent_inverse = body.matrix_parent_inverse.copy(); base.matrix_world = body.matrix_world.copy()
arm = next((m for m in body.modifiers if m.type == 'ARMATURE'), None)
if arm: am = base.modifiers.new('Armature', 'ARMATURE'); am.object = arm.object
base.shape_key_add(name='Basis')
for n in names:
  if n == 'Basis': continue
  k = base.shape_key_add(name=n); co = shapes[n][1]
  for i, p in enumerate(k.data): p.co = co[i]
for f in base.data.polygons: f.use_smooth = True
nm = body.name; bpy.data.objects.remove(body); base.name = nm; base.data.name = nm
print("SUBDIV verts", len(base.data.vertices), "keys", [k.name for k in base.data.shape_keys.key_blocks])
bpy.ops.export_scene.gltf(filepath=OUT, export_morph=True, export_skins=True, export_animations=False)
