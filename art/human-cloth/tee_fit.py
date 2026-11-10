"""Tee refit: push every short-sleeve tee outward along its normals so the body's shoulder, neck and
upper-arm skin never pokes through it; proofs the tee on its body. Usage: tee_fit.py tee.glb body.glb out.glb proof.png [mm]"""
import bpy, sys, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
tee, body, out, proof = a[:4]; d = float(a[4]) / 1000 if len(a) > 4 else 0.006
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=tee)
garm = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')]
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
for o in garm:
    me = o.data; me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    n = [v.normal.copy() for v in me.vertices]
    # weld-aware normals: verts sharing a position share one push so seams never open
    acc = {}
    for i, v in enumerate(me.vertices):
        k = tuple(round(c, 5) for c in v.co); acc.setdefault(k, mathutils.Vector()); acc[k] += n[i]
    push = [acc[tuple(round(c, 5) for c in v.co)].normalized() * d for v in me.vertices]
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, p in enumerate(kb.data): p.co += push[i]
    else:
        for i, v in enumerate(me.vertices): v.co += push[i]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
# proof: tee over its body
bpy.ops.import_scene.gltf(filepath=body)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.render.resolution_x = 900; sc.render.resolution_y = 900
for o in bpy.data.objects:
    if o.type == 'MESH':
        m = bpy.data.materials.new('p'); m.diffuse_color = (0.15, 0.2, 0.5, 1) if o in garm else (0.95, 0.75, 0.62, 1)
        m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs[0].default_value = m.diffuse_color
        o.data.materials.clear(); o.data.materials.append(m)
        if o.name.startswith('Icosphere'): o.hide_render = True
dg = bpy.context.evaluated_depsgraph_get()
pts = [o.matrix_world @ v.co for o in garm for v in o.evaluated_get(dg).data.vertices]
c = sum(pts, mathutils.Vector()) / len(pts); top = max(p.z for p in pts)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.5, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
import os
for nm, off in (('front', (0.35, -1.0, 0.15)), ('side', (1.1, 0.1, 0.1)), ('back', (-0.4, 1.0, 0.2))):
    cam = bpy.data.objects.new(nm, bpy.data.cameras.new(nm)); sc.collection.objects.link(cam)
    tgt = mathutils.Vector((c.x, c.y, top - 0.12)); cam.location = tgt + mathutils.Vector(off) * 0.75
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 40
    sc.camera = cam; sc.render.filepath = proof.replace('.png', f'_{nm}.png'); bpy.ops.render.render(write_still=True)
