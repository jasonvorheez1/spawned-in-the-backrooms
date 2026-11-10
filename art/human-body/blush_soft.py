"""Soft blush (Nov 10, Shelly: Rhea's blush read as a hard pink bar). Blush_soft was two thin strips on one uniform-alpha
material. Each cheek patch gets its own 0..1 UV square (front projection) and its own slot BlushSoft, which the game
draws with a radial fade picture, so the flush melts into the cheek. Usage: ... -- in.glb out.glb"""
import bpy, sys, bmesh
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
o = bpy.data.objects['Blush_soft']; me = o.data; mw = o.matrix_world
mat = bpy.data.materials.new('BlushSoft'); me.materials.clear(); me.materials.append(mat)
bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.active
for side in (-1, 1):
    fs = [f for f in bm.faces if (mw @ f.calc_center_median()).x * side > 0]
    ps = [mw @ v.co for f in fs for v in f.verts]
    x0, x1 = min(p.x for p in ps), max(p.x for p in ps); z0, z1 = min(p.z for p in ps), max(p.z for p in ps)
    cx, cz, s = (x0 + x1) / 2, (z0 + z1) / 2, max(x1 - x0, z1 - z0) * 0.5
    for f in fs:
        f.material_index = 0
        for l in f.loops:
            p = mw @ l.vert.co; l[uv].uv = (0.5 + (p.x - cx) / (2 * s), 0.5 + (p.z - cz) / (2 * s))
    print('PATCH', side, round(x1 - x0, 3), round(z1 - z0, 3))
bm.to_mesh(me); bm.free()
bpy.ops.export_scene.gltf(filepath=a[1], export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
