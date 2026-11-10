# Atomic Ray-Gun R-55 (Tripo), re-baked into the ZL-2 laser pistol's frame so it shares that proven grip:
# muzzle toward glTF -Z, grip centroid on the ZL-2's (0, -0.176, -0.079) blender, about 30 cm long
import bpy, mathutils, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/rg2/rg.glb")
S = 0.63
M = mathutils.Matrix.Translation((0, -0.085, 0.0155)) @ mathutils.Matrix.Rotation(math.pi, 4, 'Z') @ mathutils.Matrix.Scale(S, 4)
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and o.parent is None: o.matrix_world = M @ o.matrix_world
vs = [o.matrix_world @ v.co for o in bpy.context.scene.objects if o.type == 'MESH' for v in o.data.vertices]
print("box", [round(min(v[i] for v in vs), 3) for i in range(3)], [round(max(v[i] for v in vs), 3) for i in range(3)])
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.samples = 12; scene.render.resolution_x = 640; scene.render.resolution_y = 400
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.location = (0.6, -0.05, 0.08); cam.rotation_euler = (math.radians(85), 0, math.radians(90))
l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); l.data.energy = 4; l.rotation_euler = (0.6, 0.3, 1.2); scene.collection.objects.link(l)
w = bpy.data.worlds.new("w"); w.color = (0.4, 0.4, 0.42); scene.world = w
scene.render.filepath = "/tmp/rg2/proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/r55/r55-fp.glb", export_apply=True)
