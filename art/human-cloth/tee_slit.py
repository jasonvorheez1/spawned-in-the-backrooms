"""Men's tee, Nov 11: the sleeve's underside seam was an open slit from armpit to hem (skin showed through as the
arm swung back). Its edge vertices are welded shut, weights and shape keys kept. Usage: tee_slit.py tee.glb out.glb [mm]"""
import bpy, sys, bmesh
a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[:2]; dist = float(a[2]) / 1000 if len(a) > 2 else 0.012
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
T = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
M = T.matrix_world
bm = bmesh.new(); bm.from_mesh(T.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)   # exact UV splits first
def slitverts():
    s = set()
    for e in bm.edges:
        if not e.is_boundary: continue
        for v in e.verts:
            p = M @ v.co
            if 0.15 < abs(p.x) < 0.285 and 1.15 < p.z < 1.36: s.add(v)
    return list(s)
sv = slitverts(); print("slit verts before", len(sv))
bmesh.ops.remove_doubles(bm, verts=sv, dist=dist)
print("slit verts after", len(slitverts()), "boundary", sum(1 for e in bm.edges if e.is_boundary))
bm.to_mesh(T.data); bm.free()
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
