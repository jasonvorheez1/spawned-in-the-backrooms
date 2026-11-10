# Female default underwear rebuilt (Nov 10, Shelly: "it goes down to their uh"): the old Under_bottom was a crumpled mesh with skin poking
# through the seat. Grown fresh from the body's skin by art/human-cloth/bottom_shell.py (WARD=Under_bottom CUFF=-0.5 WAIST=-0.01 STANDOFF=0.005 BIB=0),
# then swapped into the body file under the same name, material 'under', armature and shape keys.
# blender -b --factory-startup --python-exit-code 1 -P art/human-body/under_rebuild.py -- body.glb shell.glb out.glb proofdir
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
old = bpy.data.objects['Under_bottom']; arm = old.find_armature() or next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mat = next((m for m in old.data.materials if m), None); par, pb = old.parent, old.parent_type
bpy.data.objects.remove(old, do_unlink=True)
have = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=a[1])
new = [o for o in bpy.data.objects if o not in have]
U = next(o for o in new if o.type == 'MESH')
mw = U.matrix_world.copy(); U.parent = None; U.matrix_world = mw
for o in new:
    if o != U: bpy.data.objects.remove(o, do_unlink=True)
U.name = U.data.name = 'Under_bottom'
U.parent = arm; U.matrix_parent_inverse = arm.matrix_world.inverted()
for m in list(U.modifiers): U.modifiers.remove(m)
U.modifiers.new('skin', 'ARMATURE').object = arm
U.data.materials.clear(); U.data.materials.append(mat)
for p in U.data.polygons: p.use_smooth = True
print('UNDER', len(U.data.vertices), 'verts', len(U.data.shape_keys.key_blocks) if U.data.shape_keys else 0, 'keys')
bpy.ops.export_scene.gltf(filepath=a[2], export_apply=False, export_morph=True, export_skins=True)
for o in bpy.data.objects:
    if o.type == 'MESH' and not (o.name in ('Body', 'Under_bottom', 'Head') or o.name.startswith('Skin_')): o.hide_render = True
if mat and mat.node_tree:
    b = mat.node_tree.nodes.get('Principled BSDF')
    if b: b.inputs['Base Color'].default_value = (0.03, 0.03, 0.035, 1)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 600
for i, pos in enumerate(((0, 1.3, 0.85), (0.9, 0.9, 0.85), (0, -1.3, 0.85))):
    c = bpy.data.cameras.new('c'); c.lens = 85; co = bpy.data.objects.new('c', c); sc.collection.objects.link(co); co.location = pos
    co.rotation_euler = (Vector((0, 0, 0.82)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    L = bpy.data.lights.new('l', 'SUN'); L.energy = 3; lo = bpy.data.objects.new('l', L); sc.collection.objects.link(lo); lo.rotation_euler = co.rotation_euler
    sc.camera = co; sc.render.filepath = f'{a[3]}/p{i}.png'; bpy.ops.render.render(write_still=True); lo.hide_render = True
