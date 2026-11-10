# one body alone, framed to its own height (ortho), front and side: montage the outputs to compare proportions
# usage: blender -b --python compare.py -- <out-prefix> <file.glb> [ours]
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--')+1:]; out, f = a[0], a[1]; ours = len(a) > 2
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12
sc.render.resolution_x, sc.render.resolution_y = 400, 720
w = bpy.data.worlds.new('w'); w.color = (0.75, 0.75, 0.75); sc.world = w
bpy.ops.import_scene.gltf(filepath=f)
for o in sc.objects:
    if ours and o.type == 'MESH' and o.name not in ('Body', 'Head'): o.hide_render = True
    if o.type == 'MESH' and any(k in o.name.lower() for k in ('weapon', 'wp_', 'bow', 'halo', 'bottle')): o.hide_render = True
bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
P = []
for o in sc.objects:
    if o.type == 'MESH' and not o.hide_render:
        e = o.evaluated_get(dg); M = e.matrix_world
        P += [M @ v.co for v in e.data.vertices]
lo = Vector((min(p.x for p in P), min(p.y for p in P), min(p.z for p in P))); hi = Vector((max(p.x for p in P), max(p.y for p in P), max(p.z for p in P)))
c = (lo+hi)/2; h = hi.z-lo.z; print('HEIGHT', h, 'WIDTH', hi.x-lo.x)
sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = h*1.05; cam.sensor_fit = 'VERTICAL'
co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
for n, d, rot, srot in (('front', Vector((0, -1, 0)), (1.5708, 0, 0), (0.9, 0.2, -0.4)), ('side', Vector((1, 0, 0)), (1.5708, 0, 1.5708), (0.9, 0.2, 1.2))):
    co.location = c + d*10; co.rotation_euler = rot; sun.rotation_euler = srot
    sc.render.filepath = f'{out}_{n}.png'; bpy.ops.render.render(write_still=True)
