# Men's long sleeve: a sewn-in collar band. The scoop's raw edge stood off the neck and the skin parts
# under it (Skin_collar, Skin_torso_upper_front, the head's neck rim) showed as jagged pale teeth (Nov 11).
# The neckline's open edge is extruded in two rows down onto the neck, held 3 mm off the skin, so the
# shirt meets the neck all the way round and nothing under it can show. Weights and shape keys follow.
# blender -b --python-exit-code 1 -P collar_band.py -- body.glb in.glb out.glb
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body_p, in_p, out_p = sys.argv[sys.argv.index('--')+1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body_p)
SKIN = ('Skin_neck', 'Skin_collar', 'Skin_torso_upper_front', 'Head', 'Body')
vs = []; fs = []
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name in SKIN]:
  off = len(vs); vs += [o.matrix_world @ v.co for v in o.data.vertices]; fs += [[off+i for i in p.vertices] for p in o.data.polygons]
T = BVHTree.FromPolygons(vs, fs)
cs = [v for v in vs if abs(v.z-1.42) < 0.01 and abs(v.x) < 0.09]
C = sum(cs, Vector()) / len(cs)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.materials): m.name = m.name + '_body'
bpy.ops.import_scene.gltf(filepath=in_p)
G = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
for m in G.data.materials:
  if m and '.' in m.name: m.name = m.name.split('.')[0]
mw = G.matrix_world; inv = mw.inverted()
bm = bmesh.new(); bm.from_mesh(G.data)
keys = list(bm.verts.layers.shape.values())
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)  # the glb split verts at every uv seam: weld so only the real neckline is open
edges = [e for e in bm.edges if e.is_boundary and all((mw @ v.co).z > 1.28 and abs((mw @ v.co).x) < 0.2 for v in e.verts)]
print('NECK EDGES', len(edges), 'neck centre', tuple(round(x, 3) for x in C))
ZC = 1.425  # the band's top: a crew neck just under the head's neck rim (scoop sat at 1.30 in front)
def neck_at(p):  # the neck's outer skin at the band's height, straight out from the neck's centre toward p
  d = Vector((p.x-C.x, p.y-C.y, 0)).normalized(); o = Vector((C.x, C.y, ZC))
  hit = T.ray_cast(o + d*0.25, -d, 0.3)
  return (hit[0] if hit[0] is not None else o + d*0.06) + d*0.004
def off_skin(q, gap=0.004):
  loc, n, _, _ = T.find_nearest(q)
  return loc + n*gap if loc is not None and (q-loc).dot(n) < gap else q
rows = [0.5, 1.0]  # how far up to the neck rim
ring = edges; made = 0; new_faces = []
for f in rows:
  r = bmesh.ops.extrude_edge_only(bm, edges=ring)
  nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
  new_faces += [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
  for v in nv:
    p = mw @ v.co; w = off_skin(p.lerp(neck_at(p), f))
    delta = inv @ w - v.co
    for k in keys: v[k] = v[k] + delta  # each key keeps its own offset
    v.co = v.co + delta; made += 1
  ring = [g for g in r['geom'] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
# the band's faces turned outward, away from the neck; the shirt's own faces untouched
bm.normal_update(); flip = []
for f in new_faces:
  c = mw @ f.calc_center_median()
  if (mw.to_3x3() @ f.normal).dot(Vector((c.x-C.x, c.y-C.y, 0))) < 0: flip.append(f)
bmesh.ops.reverse_faces(bm, faces=flip)
print('BAND verts', made, 'faces turned out', len(flip))
bm.to_mesh(G.data); bm.free(); G.data.update()
for o in bpy.data.objects: o.select_set(o == G or o.type == 'ARMATURE')
bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True, use_selection=True)
print('SLOTS', [m.name for m in G.data.materials])
