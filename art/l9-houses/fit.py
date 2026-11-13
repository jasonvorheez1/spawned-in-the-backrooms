# Level 9 house fit: front (Tripo's +X) turned to the kit's +Z, ground at 0, centred, uniform scale into the lot footprint, decimated.
import bpy, sys, math, json, mathutils
a = sys.argv[sys.argv.index("--")+1:]
src, dst, W, D, faces = a[0], a[1], float(a[2]), float(a[3]), int(a[4])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(o in ms)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
o.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
o.data.transform(mathutils.Matrix.Rotation(-math.pi/2, 4, 'Z'))  # Tripo's front (-X in Blender here) turned to Blender -Y, glTF +Z: the kit's front; glTF import is quaternion-mode, so the mesh turns, not the object
vs = [o.matrix_world @ v.co for v in o.data.vertices]
mn = mathutils.Vector([min(v[i] for v in vs) for i in range(3)]); mx = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
sx, sy, sz = mx - mn
s = min(W / sx, D / sy)
for v in o.data.vertices: v.co = (v.co - mathutils.Vector(((mn.x+mx.x)/2, (mn.y+mx.y)/2, mn.z))) * s
n = len(o.data.polygons)
if n > faces:
    m = o.modifiers.new("dec", 'DECIMATE'); m.ratio = faces / n
    bpy.ops.object.modifier_apply(modifier="dec")
o.name = "house"
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=False, export_image_format='JPEG')
print("FIT", json.dumps({"w": sx*s, "d": sy*s, "h": sz*s, "faces": len(o.data.polygons)}))
