"""A top grown from the body itself: the skin regions the garment hides (the same Skin_* pieces bodyModel hides under it),
joined, welded, pushed out along their own normals (thin at the open edges so no gap shows into the hidden body),
keeping the body's skin weights, UVs and every shape key, so it can never tear, poke or float.
Usage: blender -b -P shell.py -- body.glb out.glb Ward_<name> thick region,region,..."""
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
src, out, name, thick, regions = a[0], a[1], a[2], float(a[3]), a[4].split(',')
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
keep = [bpy.data.objects['Skin_' + r] for r in regions]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o not in keep: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in keep: o.select_set(True)
bpy.context.view_layer.objects.active = keep[0]
if len(keep) > 1: bpy.ops.object.join()
o = bpy.context.view_layer.objects.active; o.name = name; me = o.data; me.name = name
# weld the region seams (the split pieces share positions) — shape keys follow the basis
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.to_mesh(me); bm.free(); me.update()
# rings in from the open edge: 0 on the edge, 1 next, ...
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
ring = {v.index: 0 for v in bm.verts if any(e.is_boundary for e in v.link_edges)}
front = list(ring)
for r in range(1, 4):
    nxt = []
    for i in front:
        for e in bm.verts[i].link_edges:
            j = e.other_vert(bm.verts[i]).index
            if j not in ring: ring[j] = r; nxt.append(j)
    front = nxt
bm.free()
feather = {0: 0.25, 1: 0.6, 2: 0.85, 3: 1.0}
keys = me.shape_keys.key_blocks if me.shape_keys else None
def normals_of(coords):
    # area-weighted vertex normals for a set of positions on this topology
    n = [Vector() for _ in coords]
    for p in me.polygons:
        vs = p.vertices; c = [coords[i] for i in vs]
        f = Vector()
        for k in range(len(c)): f += c[k].cross(c[(k + 1) % len(c)])
        for i in vs: n[i] += f
    return [x.normalized() if x.length > 1e-12 else Vector((0, 0, 1)) for x in n]
def push(coords):
    N = normals_of(coords)
    return [coords[i] + N[i] * thick * feather.get(ring.get(i, 9), 1.0) for i in range(len(coords))]
if keys:
    base = [Vector(p.co) for p in keys[0].data]
    nb = push(base)
    for kb in keys:
        kc = [Vector(p.co) for p in kb.data]; nk = push(kc)
        for i, p in enumerate(kb.data): p.co = nk[i]
else:
    base = [Vector(v.co) for v in me.vertices]; nb = push(base)
    for i, v in enumerate(me.vertices): v.co = nb[i]
# smooth the cleavage and other deep creases a little: cloth bridges, skin dips (basis and keys alike)
for it in range(4):
    for kb in (keys or [None]):
        data = kb.data if kb else me.vertices
        co = [Vector(p.co) for p in data]
        nbrs = [[] for _ in co]
        for e in me.edges: i, j = e.vertices; nbrs[i].append(j); nbrs[j].append(i)
        N = normals_of(co)
        for i, p in enumerate(data):
            if ring.get(i, 9) < 2 or not nbrs[i]: continue
            avg = sum((co[j] for j in nbrs[i]), Vector()) / len(nbrs[i])
            d = (avg - co[i]).dot(N[i])
            if d > 0: p.co = co[i] + N[i] * d * 0.5   # only fill hollows outward, never shrink in
me.materials.clear(); mat = bpy.data.materials.new('cloth_top'); me.materials.append(mat)
for p in me.polygons: p.use_smooth = True
print('SHELL', name, len(me.vertices), 'edge verts', sum(1 for v in ring.values() if v == 0))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
