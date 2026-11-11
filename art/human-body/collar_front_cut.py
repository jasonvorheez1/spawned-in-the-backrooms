# Men's body: Skin_collar's front half stood up as pale triangles at the scoop neckline's corners (Nov 11).
# The chest skin already covers the front, so its front faces go; the back half stays to close the nape.
# blender -b --python-exit-code 1 -P collar_front_cut.py -- in.glb out.glb
import bpy, bmesh, sys
a = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
o = bpy.data.objects['Skin_collar']; mw = o.matrix_world
bm = bmesh.new(); bm.from_mesh(o.data)
cut = [f for f in bm.faces if (mw @ f.calc_center_median()).y < 0.03]   # Blender -Y is the face side
print('COLLAR faces', len(bm.faces), 'cut', len(cut))
bmesh.ops.delete(bm, geom=cut, context='FACES'); bm.to_mesh(o.data); bm.free()
bpy.ops.export_scene.gltf(filepath=a[1], export_apply=False)
