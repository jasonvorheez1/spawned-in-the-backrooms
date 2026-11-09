# ZL-2 laser pistol, re-baked into the regular pistol's frame so it shares the pistol's proven grip:
# barrel toward glTF -Z, grip at the back, 0.6 of the Tripo file's size (about 26 cm long)
import bpy, mathutils, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/tripo/zl2-pistol.glb")
S = 0.6
# blender frame: glTF z = -blender y. turn 180 deg about the up axis (blender Z), scale, then move
M = mathutils.Matrix.Translation((0, -0.08, -0.012)) @ mathutils.Matrix.Rotation(math.pi, 4, 'Z') @ mathutils.Matrix.Scale(S, 4)
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and o.parent is None: o.matrix_world = M @ o.matrix_world
    elif o.type == 'MESH': pass
bpy.ops.object.select_all(action='SELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': print("mat", [m.name for m in o.data.materials])
bpy.ops.export_scene.gltf(filepath="/workspace/zl2/zl2-fp.glb", export_apply=True)
