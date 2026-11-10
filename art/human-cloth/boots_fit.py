"""Boot refit: the boots read clown-sized on the anime bodies. Each foot's boot is pulled in toward its own
centre line (horizontal factor) and its shaft lowered toward the sole (vertical factor), shape keys too, then
proofed on its body. Usage: boots_fit.py boots.glb body.glb out.glb proof.png [hfac] [vfac]"""
import bpy, sys, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
src, body, out, proof = a[:4]; hf = float(a[4]) if len(a) > 4 else 0.86; vf = float(a[5]) if len(a) > 5 else 0.88
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
garm = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')]
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
for o in garm:
    me = o.data; mw = o.matrix_world; inv = mw.inverted()
    base = [mw @ v.co for v in me.vertices]
    sides = {}
    for p in base: sides.setdefault(p.x >= 0, []).append(p)
    ctr = {s: (sum((p.x for p in ps)) / len(ps), (min(p.y for p in ps) + max(p.y for p in ps)) / 2, min(p.z for p in ps)) for s, ps in sides.items()}
    def f(p):
        cx, cy, z0 = ctr[p.x >= 0]
        t = min(1, max(0, (p.z - z0 - 0.06) / 0.08)); t = t * t * (3 - 2 * t)
        h = hf + (0.985 - hf) * t  # the foot slims, the shaft keeps the shin's width so no skin breaks through
        return mathutils.Vector((cx + (p.x - cx) * h, cy + (p.y - cy) * h, z0 + (p.z - z0) * vf))
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, d in enumerate(kb.data):
                w = mw @ d.co; s = base[i]; cx, cy, z0 = ctr[s.x >= 0]
                d.co = inv @ f(w)
    else:
        for i, v in enumerate(me.vertices): v.co = inv @ f(base[i])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
bpy.ops.import_scene.gltf(filepath=body)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.render.resolution_x = 700; sc.render.resolution_y = 700
for o in bpy.data.objects:
    if o.type == 'MESH':
        m = bpy.data.materials.new('p'); m.diffuse_color = (0.08, 0.08, 0.08, 1) if o in garm else (0.95, 0.75, 0.62, 1)
        m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs[0].default_value = m.diffuse_color
        o.data.materials.clear(); o.data.materials.append(m)
        if o not in garm and (o.name in ('Skin_feet', 'Skin_shin_low') or not (o.name.startswith('Skin_') or o.name in ('Body', 'Head'))): o.hide_render = True
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
dg = bpy.context.evaluated_depsgraph_get()
pts = [o.matrix_world @ v.co for o in garm for v in o.evaluated_get(dg).data.vertices]
c = sum(pts, mathutils.Vector()) / len(pts)
for nm, off in (('front', (0.3, -1.0, 0.25)), ('side', (1.0, 0.0, 0.25))):
    cam = bpy.data.objects.new(nm, bpy.data.cameras.new(nm)); sc.collection.objects.link(cam)
    tgt = mathutils.Vector((c.x, c.y, c.z + 0.12)); cam.location = tgt + mathutils.Vector(off) * 1.1
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 40
    sc.camera = cam; sc.render.filepath = proof.replace('.png', f'_{nm}.png'); bpy.ops.render.render(write_still=True)
