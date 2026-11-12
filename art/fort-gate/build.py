# Fort Surrender: open the gate. The fort GLB baked a closed rail gate across its only doorway (world ~(-64.6,-86.4), the fort at (-70,10.95,-93), yaw 0);
# its mesh collider sealed the fort. This deletes the faces lying wholly inside the gate's box and keeps the floor, posts' bases and pillars.
import bpy, bmesh, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/fortgate/fort.glb")
o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
C = Vector((-64.6 + 70, -(-86.4 + 93)))            # gate centre in Blender x/y (glTF z flips to -y)
along = Vector((1.65, 1.35)).normalized()           # the gate line (perpendicular to the ramp's walk), in Blender x/y
across = Vector((-along.y, along.x))
HALF, DEPTH, ZLO, ZHI = 1.25, 0.45, 0.74, 2.05      # metres
bm = bmesh.new(); bm.from_mesh(o.data)
M = o.matrix_world
def inside(v):
    w = M @ v.co; d = Vector((w.x, w.y)) - C
    return abs(d.dot(along)) < HALF and abs(d.dot(across)) < DEPTH and ZLO < w.z < ZHI
kill = [f for f in bm.faces if all(inside(v) for v in f.verts)]
print("KILL", len(kill), "of", len(bm.faces))
bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (C.x + across.x * -3.2 + 0.3, C.y + across.y * -3.2, 2.2)
look = Vector((C.x, C.y, 1.2)) - cam.location; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 4; sun.location = cam.location; sun.rotation_euler = cam.rotation_euler; sc.collection.objects.link(sun)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.4, 0.4, 0.45)
sc.render.filepath = "/tmp/fortgate/proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/fortgate/fort-open.glb", export_apply=True)
