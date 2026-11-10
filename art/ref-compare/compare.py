# side-by-side: our human body vs Shelly's reference models, each scaled to 1.72 m, front + side, flat grey light
import bpy, sys, mathutils
a = sys.argv[sys.argv.index('--')+1:]; out = a[0]; files = a[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12
sc.render.resolution_x = 360*len(files); sc.render.resolution_y = 640
w = bpy.data.worlds.new('w'); w.color = (0.8, 0.8, 0.8); sc.world = w
for i, f in enumerate(files):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.context.scene.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    if i == 0:  # ours: the bare body and head, no wardrobe parts
        for o in new:
            if o.type == 'MESH' and o.name not in ('Body', 'Head'): o.hide_render = True; o.hide_set(True)
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    zs = []; xs = []; ys = []
    for o in new:
        if o.type == 'MESH' and not o.hide_render:
            e = o.evaluated_get(dg)
            for v in e.data.vertices:
                p = e.matrix_world @ v.co; zs.append(p.z); xs.append(p.x); ys.append(p.y)
    h = max(zs)-min(zs); s = 1.72/h
    em = bpy.data.objects.new(f'g{i}', None); sc.collection.objects.link(em)
    for r in roots: r.parent = em
    em.scale = (s, s, s); em.location = (i*1.1 - (sum(xs)/len(xs))*s, -(sum(ys)/len(ys))*s, -min(zs)*s)
sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3; sun.rotation_euler = (0.9, 0.2, -0.4)
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = max(2.0, 1.1*len(files)) ; co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
cx = (len(files)-1)*1.1/2
for name, loc in (('front', (cx, -6, 0.88)), ('side', (cx+6, 0, 0.88))):
    if name == 'side':
        cam.ortho_scale = 2.0; sc.render.resolution_x = 360
        for j in range(len(files)):
            co.location = (j*1.1 + 6, 0, 0.88); co.rotation_euler = (1.5708, 0, 1.5708)
            for k, g in enumerate([o for o in sc.objects if o.name.startswith('g')]): g.hide_render = (k != j)
            for o in sc.objects:
                if o.parent and o.parent.name.startswith('g'): pass
            sc.render.filepath = f'{out}_side{j}.png'; bpy.ops.render.render(write_still=True)
    else:
        co.location = loc; co.rotation_euler = (1.5708, 0, 0)
        sc.render.filepath = f'{out}_front.png'; bpy.ops.render.render(write_still=True)
