"""Nov 10 tops redo (Shelly #183883 "get the rest of the clothes done"): the torn jacket/coat/shirt family rebuilt.
Joins a clean tee_shell top (+ an optional skirt_shell tail for coats) into one skinned garment, and carries over the
original garment's collar/hood pieces (faces wholly above the shoulder line, near the neck) so each keeps its identity.
Usage: WARD=Ward_blazer blender -b -P top_join.py -- body.glb out.glb shell.glb [tail.glb|-] [orig.glb|-]"""
import bpy, bmesh, sys, os
a = sys.argv[sys.argv.index('--') + 1:]; body, out, shell, tail, orig = a[0], a[1], a[2], a[3], a[4]
NAME = os.environ['WARD']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=shell)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
J = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
main = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
def bring(path, keep=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    ms = [o for o in new if o.type == 'MESH' and o.name.startswith('Ward_')]
    for o in ms:
        if keep:
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            dead = [f for f in bm.faces if not keep([M @ v.co for v in f.verts])]
            bmesh.ops.delete(bm, geom=dead, context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
            bm.to_mesh(o.data); bm.free()
        for m in o.modifiers:
            if m.type == 'ARMATURE': m.object = arm
        o.parent = arm
    for o in new:
        if o not in ms: bpy.data.objects.remove(o, do_unlink=True)
    return [o for o in ms if len(o.data.vertices)]
parts = []
if tail != '-': parts += bring(tail)
if orig != '-':
    shz = J['LeftArm'].z + 0.03
    hood = lambda P: min(p.z for p in P) > shz and max(abs(p.x - J['Neck'].x) for p in P) < 0.13
    parts += bring(orig, hood)
for o in parts:
    for i, m in enumerate(o.data.materials):
        if m and m.name.startswith('cloth_') and m.name != 'cloth_top': o.data.materials[i] = main.data.materials[0]
        elif m and m.name.startswith('cloth_top'): o.data.materials[i] = main.data.materials[0]
if parts:
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    main.select_set(True); bpy.context.view_layer.objects.active = main
    bpy.ops.object.join()
main.name = main.data.name = NAME
print('JOINED', NAME, len(main.data.vertices), [m.name for m in main.data.materials])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_skins=True, export_morph=True, export_animations=False, export_apply=False)
