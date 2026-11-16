# The dark arcs beside the nose are the toon light band catching the crease where muzzle meets cheek (a real fold in the sculpt).
# Instead of moving more vertices, the shading normals in a ring around the snout are blended toward a heavily smoothed copy of the head,
# so the light rolls over the fold. Geometry and shape keys stay; custom normals export with the glb.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/cheek-normals.py -- <in.glb> <out.glb>
import bpy, sys, bmesh
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--")+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
h = bpy.data.objects["Head"]; me = h.data; W = h.matrix_world
P = [W @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
zs = [p.z for p in P]; H = max(zs) - min(zs)
R0, R1 = 0.10 * H, 0.30 * H          # full blend inside R0 of the nose, fading out by R1
# smoothed normals: a duplicate, smoothed hard, normals read per vertex
sm = bpy.data.meshes.new("sm"); bm = bmesh.new(); bm.from_mesh(me)
for _ in range(25): bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.normal_update(); SN = [v.normal.copy() for v in bm.verts]; bm.free()
me.calc_loop_triangles() if hasattr(me, "calc_loop_triangles") else None
cur = [v.normal.copy() for v in me.vertices]
def ss(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
N = []; touched = 0
for i, p in enumerate(P):
    d = (p - nose); d.y *= 0.6; r = d.length
    w = 1 - ss(R0, R1, r)
    if p.y > nose.y + 0.35 * H: w = 0
    if w > 0: touched += 1
    n = cur[i].lerp(SN[i], w); n.normalize(); N.append(n)
me.normals_split_custom_set_from_vertices(N)
print(f"cheek-normals H={H:.3f} touched={touched}")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=False, export_morph=True, export_skins=True, export_animations=True, export_normals=True, export_morph_normal=False)
