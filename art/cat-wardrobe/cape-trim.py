# Nov 16: the Tripo cape hung its mass in front and splayed between the legs on a walk.
# Trim: drop the front panels below the chest (in front of the body, under z_cut); keep the shoulders, clasp and back drape.
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst, body, proof = argv
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ico = bpy.data.objects.get('Icosphere')
g = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name != 'Icosphere')
M = g.matrix_world; Mi = M.inverted()
bm = bmesh.new(); bm.from_mesh(g.data); bm.verts.ensure_lookup_table()
zs = [(M @ v.co).z for v in bm.verts]; top = max(zs)
z_cut = top * 0.72            # under the chest
kill = [v for v in bm.verts if (M @ v.co).z < z_cut and (M @ v.co).y < -0.06]
bmesh.ops.delete(bm, geom=kill, context='VERTS')
bm.to_mesh(g.data); bm.free(); g.data.update()
print('removed', len(kill), 'left', len(g.data.vertices))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_skins=True, export_morph=True)
# proof: body + cape, front and side
bpy.ops.import_scene.gltf(filepath=body)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 8
sc.render.resolution_x = 600; sc.render.resolution_y = 700
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
mat = bpy.data.materials.new('blue'); mat.diffuse_color = (0.2, 0.3, 0.9, 1); mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.15, 0.25, 0.85, 1)
for s in g.material_slots: s.material = mat
import mathutils, math
for name, loc in (('front', (0, -2.4, 0.6)), ('side', (2.4, 0, 0.6)), ('back', (0, 2.4, 0.6))):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(cam)
    cam.location = loc; d = mathutils.Vector((0, 0, 0.55)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 50; sc.camera = cam; sc.render.filepath = f'{proof}_{name}.png'; bpy.ops.render.render(write_still=True)
