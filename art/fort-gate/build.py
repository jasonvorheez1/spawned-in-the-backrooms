# Fort Surrender: open the gate. The fort GLB baked a closed rail gate across its only doorway (world ~(-64.6,-86.4), the fort at (-70,10.95,-93), yaw 0);
# its mesh collider sealed the fort. This deletes the faces lying wholly inside the gate's box and keeps the floor, posts' bases and pillars.
import bpy, bmesh, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/fortgate/fort.glb")
o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
C = Vector((-64.65 + 70, -(-86.3 + 93)))          # midway between the gateposts
along = Vector((4.1, 3.2)).normalized()             # gatepost to gatepost: (-66.7,-84.7) to (-62.6,-87.9) in the world, Blender y = -world z
across = Vector((-along.y, along.x))
HALF, DEPTH, ZLO, ZHI = 1.6, 0.45, 0.72, 3.3      # metres; the posts sit 2.05 m out and stay
M = o.matrix_world
bpy.ops.mesh.primitive_cube_add(size=1)
cut = bpy.context.active_object
ang = math.atan2(along.y, along.x)
cut.scale = (HALF * 2, 1.6, ZHI - ZLO); cut.rotation_euler = (0, 0, ang)
cut.location = (C.x, C.y, (ZLO + ZHI) / 2)
bpy.context.view_layer.update()
mod = o.modifiers.new("gate", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut; mod.solver = "EXACT"
bpy.context.view_layer.objects.active = o; o.select_set(True)
n0 = len(o.data.polygons); bpy.ops.object.modifier_apply(modifier="gate")
bpy.data.objects.remove(cut)
left=[(M@p.center) for p in o.data.polygons if (Vector(((M@p.center).x,(M@p.center).y))-C).length<0.6 and ZLO+0.05<(M@p.center).z<ZHI-0.05]
print("KILL", n0, "->", len(o.data.polygons), "LEFT", len(left), sorted(set((round(w.x-C.x,1),round(w.y-C.y,1),round(w.z,1)) for w in left))[:44])
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (C.x + across.x * 4.5, C.y + across.y * 4.5, 4.5)
look = Vector((C.x, C.y, 1.0)) - cam.location; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 4; sun.location = cam.location; sun.rotation_euler = cam.rotation_euler; sc.collection.objects.link(sun)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.4, 0.4, 0.45)
sc.render.filepath = "/tmp/fortgate/proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/fortgate/fort-open.glb", export_apply=True)
