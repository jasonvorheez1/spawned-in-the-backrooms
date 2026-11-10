# Female default underwear: the back rose too low and showed the seat (Shelly, Nov 10 screenshot). Lifts the back's waistband
# to the front's height and keeps it on the skin. blender -b --factory-startup --python-exit-code 1 --python art/human-body/under_back.py -- in.glb out.glb proofdir
import bpy, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
U = bpy.data.objects['Under_bottom']; B = bpy.data.objects['Body']
dg = bpy.context.evaluated_depsgraph_get(); be = B.evaluated_get(dg); bm = be.to_mesh()
tree = BVHTree.FromPolygons([B.matrix_world @ v.co for v in bm.vertices], [p.vertices[:] for p in bm.polygons])
Mi = U.matrix_world.inverted(); M = U.matrix_world
co = [M @ v.co for v in U.data.vertices]
zs = [c.z for c in co]; zlo, zhi = min(zs), max(zs)
ys = [c.y for c in co]; ymid = (min(ys) + max(ys)) / 2
LIFT = 0.075   # 7.5 cm more at the very top of the back, fading to 0 at the crotch and at the sides. Savi's pick
delta = []
for c in co:
    back = max(0.0, min(1.0, (c.y - ymid) / 0.06))       # Blender front is -Y: +Y is the seat
    up = max(0.0, (c.z - (zlo + 0.08)) / (zhi - zlo - 0.08)) ** 1.5
    n = c + Vector((0, 0, LIFT * back * up))
    hit = tree.find_nearest(n)
    if hit[0] is not None and back > 0.01:
        p, nrm = hit[0], hit[1].normalized()
        gap = (n - p).dot(nrm)                          # only pushed straight out where it sank under 7 mm, never slid along the skin (sliding tore it)
        if gap < 0.007: n = n + nrm * (0.007 - gap)     # 7 mm: at 4 mm the seat's skin poked through as white flecks in game (Nov 10)
    delta.append(Mi.to_3x3() @ (n - c))
for i, v in enumerate(U.data.vertices): v.co += delta[i]
if U.data.shape_keys:
    for kb in U.data.shape_keys.key_blocks:
        for i, d in enumerate(kb.data): d.co += delta[i]
import bmesh
# RELAX off: the seat is loose triangles, not one sheet, so relaxing tore it open (Nov 10 render). Kept for a welded remake. Was: relax it in place, edges held, and carry the same move onto every shape key
import os
WELD = float(os.environ.get('WELD', '0.0006')); RELAX = int(os.environ.get('RELAX', '8'))
_b = bmesh.new(); _b.from_mesh(U.data)
_nb0 = sum(1 for x in _b.edges if x.is_boundary)
bmesh.ops.remove_doubles(_b, verts=_b.verts[:], dist=WELD)          # one sheet: the loose triangles share their corners again (shape keys and weights ride along in bmesh)
_sl = list(_b.verts.layers.shape.values())
_free = [v for v in _b.verts if not v.is_boundary]
_c0 = {v: v.co.copy() for v in _b.verts}
for _ in range(RELAX):
    bmesh.ops.smooth_vert(_b, verts=_free, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
for v in _b.verts:                                                  # every shape key moves with its basis
    d = v.co - _c0[v]
    for L in _sl: v[L] = v[L] + d
bmesh.ops.recalc_face_normals(_b, faces=_b.faces[:])
print('UB weld', _nb0, '->', sum(1 for x in _b.edges if x.is_boundary), 'boundary edges;', len(_b.verts), 'verts')
_b.to_mesh(U.data); _b.free(); U.data.update()
import bmesh                                            # flipped faces drew see-through in game (white skin flecks on the seat): face them all outward
_b = bmesh.new(); _b.from_mesh(U.data); bmesh.ops.recalc_face_normals(_b, faces=_b.faces[:]); _b.to_mesh(U.data); _b.free(); U.data.update()
print('UB lifted', sum(1 for d in delta if d.length > 1e-4), 'of', len(delta))
bpy.ops.export_scene.gltf(filepath=a[1], export_apply=False, export_morph=True, export_skins=True)
# proof: the back and a 3/4 back
for o in bpy.data.objects:
    if o.type == 'MESH' and not (o.name in ('Body', 'Under_bottom', 'Head') or o.name.startswith('Skin_')): o.hide_render = True
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 500
for nm, pos in (('back', (0, 2.0, 0.9)), ('q', (1.4, 1.4, 0.95))):
    c = bpy.data.cameras.new(nm); c.lens = 85; co_ = bpy.data.objects.new(nm, c); sc.collection.objects.link(co_); co_.location = pos
    co_.rotation_euler = (Vector((0, 0, 0.85)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    L = bpy.data.lights.new(nm, 'SUN'); L.energy = 3; lo = bpy.data.objects.new(nm + 'L', L); sc.collection.objects.link(lo); lo.rotation_euler = co_.rotation_euler
    sc.camera = co_; sc.render.filepath = f'{a[2]}/{nm}.png'; bpy.ops.render.render(write_still=True); lo.hide_render = True
