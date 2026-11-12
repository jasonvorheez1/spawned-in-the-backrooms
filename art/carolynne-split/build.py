# The Carolynne cut into moving parts: body, hopper (ornament funnel) and pump (ribbed forend), all on the source origin,
# so each placed at the same transform reassembles the whole gun. Blender frame: barrel toward -Y, up +Z.
import bpy, bmesh, os, math
OUT = "/workspace/carol"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/caro.glb")
src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
PARTS = {
  "hopper": lambda c: -0.38 < c.y < -0.11 and c.z > 0.12,
  "pump":   lambda c: -0.67 < c.y < -0.42 and -0.07 < c.z < 0.045 and abs(c.x) < 0.09,
}
def cut(name, keep):
    o = src.copy(); o.data = src.data.copy(); o.name = name; bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context="FACES")
    bm.to_mesh(o.data); bm.free(); print(name, len(o.data.polygons)); return o
objs = {n: cut(n, k) for n, k in PARTS.items()}
objs["body"] = cut("body", lambda c: not any(k(c) for k in PARTS.values()))
src.hide_render = True
for n, o in objs.items():
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{n}.glb", use_selection=True, export_apply=True)
# proof: parts pulled apart (hopper up 6 cm, pump back 8 cm)
objs["hopper"].location.z += 0.06; objs["pump"].location.y += 0.08
sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 900; sc.render.resolution_y = 400
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.6, 0.6, 0.6)
l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(l); l.rotation_euler = (0.7, 0.3, 0); l.data.energy = 4
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.2; cam.location = (2, -0.45, 0.06); cam.rotation_euler = (math.pi/2, 0, math.pi/2)
sc.render.filepath = "/tmp/carol_split.png"; bpy.ops.render.render(write_still=True)
