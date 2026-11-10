"""Nov 10 pants redo: the body skin has an open seam between the legs (underwear covers it), so a bottom grown from it
inherits the gap. Close every open loop whose centre sits in the crotch box, keeping waist and cuffs open.
Usage: blender -b -P crotch_fill.py -- in.glb out.glb"""
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
J = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
hz = J['Hips'].z; kz = (J['LeftLeg'].z + J['RightLeg'].z) / 2
o = next(x for x in bpy.data.objects if x.type == 'MESH' and x.name.startswith('Ward_'))
M = o.matrix_world
bm = bmesh.new(); bm.from_mesh(o.data)
bnd = set(e for e in bm.edges if e.is_boundary); loops = []
while bnd:
    e = bnd.pop(); loop = {e}; st = [e]
    while st:
        c = st.pop()
        for v in c.verts:
            for f in v.link_edges:
                if f in bnd: bnd.discard(f); loop.add(f); st.append(f)
    loops.append(loop)
filled = 0
# the slit: the body has a cleft between the legs and the shell follows it in, so skin shows through.
# Lift the cloth off the cleft along its normals (more at the centre line), every shape key too: it bridges instead of tucking.
bm.normal_update()
hx = J['Hips'].x; R = 0.07; top = hz + 0.09; bot = hz - 0.14; PUSH = float(__import__('os').environ.get('PUSH', '0.018'))
N3 = M.to_3x3(); Mi3 = N3.inverted(); keys = [bm.verts.layers.shape[k] for k in bm.verts.layers.shape.keys()]
moved = 0
for v in bm.verts:
    p = M @ v.co; dx = p.x - hx
    if abs(dx) < R and bot < p.z < top:
        zw = max(0.0, min(1.0, (top - p.z) / 0.04, (p.z - bot) / 0.04))
        w = (1 - abs(dx) / R) ** 1.5 * zw
        n = (N3 @ v.normal).normalized()
        d = Mi3 @ (n * PUSH * w)
        v.co += d
        for L in keys: v[L] += d
        moved += 1
print('GUSSET', moved)
for L in loops:
    vs = {v for e in L for v in e.verts}; c = sum((M @ v.co for v in vs), Vector()) / len(vs)
    span = max((M @ v.co).z for v in vs) - min((M @ v.co).z for v in vs)
    if abs(c.x - J['Hips'].x) < 0.07 and kz + 0.12 < c.z < hz + 0.06 and len(vs) < 400:
        r = bmesh.ops.triangle_fill(bm, edges=list(L), use_beauty=True); filled += 1
        # also bridge thin slits the fill can't (non-planar): grid nothing more
print('LOOPS', len(loops), 'FILLED', filled)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.to_mesh(o.data); bm.free()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=a[1], export_skins=True, export_morph=True, export_animations=False, export_apply=False)
