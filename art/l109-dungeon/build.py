# The B3 armory's M.E.G. launcher (Tripo, Nov 14): turned so the muzzle faces glTF -Z like every weapon mesh,
# scaled to 1.0 m, the grip's middle at the origin (scripts/lib/weapon-look.js "handle at the origin").
import bpy, math, mathutils
SRC = "/workspace/art/l109-dungeon/launcher.glb"; OUT = "/workspace/art/l109-dungeon/launcher-fit.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
S = 0.75
M = mathutils.Matrix.Translation((0, 0.33 * S, 0.1 * S)) @ mathutils.Matrix.Rotation(math.pi, 4, 'Z') @ mathutils.Matrix.Scale(S, 4)
for o in ms:
    o.data.transform(M @ o.matrix_world); o.matrix_world = mathutils.Matrix.Identity(4)
for o in [o for o in bpy.context.scene.objects if o.type != 'MESH']: bpy.data.objects.remove(o)
pts = [v.co for o in ms for v in o.data.vertices]
print("FIT", [round(min(p[i] for p in pts), 3) for i in range(3)], [round(max(p[i] for p in pts), 3) for i in range(3)])
print("SLOTS", [m.name for o in ms for m in o.data.materials])
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=True)
