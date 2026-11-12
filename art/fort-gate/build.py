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
HALF, DEPTH, ZLO, ZHI = 1.75, 0.45, 0.70, 2.05      # metres; the posts sit 2.05 m out and stay
bm = bmesh.new(); bm.from_mesh(o.data)
M = o.matrix_world
def inside(v):
    w = M @ v.co; d = Vector((w.x, w.y)) - C
    return abs(d.dot(along)) < HALF and abs(d.dot(across)) < DEPTH and ZLO < w.z < ZHI
def zin(v):
    return (M @ v.co).z > ZLO
kill = [f for f in bm.faces if all(zin(v) for v in f.verts) and inside(type('P',(object,),{'co':f.calc_center_median()})) and max((M@v.co).z for v in f.verts) < ZHI + 0.6]
print("KILL", len(kill), "of", len(bm.faces))
bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (C.x + across.x * -4.5, C.y + across.y * -4.5, 4.5)
look = Vector((C.x, C.y, 1.0)) - cam.location; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 4; sun.location = cam.location; sun.rotation_euler = cam.rotation_euler; sc.collection.objects.link(sun)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.4, 0.4, 0.45)
sc.render.filepath = "/tmp/fortgate/proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/fortgate/fort-open.glb", export_apply=True)
