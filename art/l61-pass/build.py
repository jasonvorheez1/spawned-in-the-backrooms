# Studio pass for the Level 6.1 Tripo props (payphones, vent grille, coffee urn, planter, tray-return cabinet):
# join, decimate to budget, real height, bottom-centre origin, textures to 1024, proof renders front (-Y = glTF +z) and side.
import bpy, mathutils, math, os
SRC, OUT = "/workspace/l61pass", "/workspace/l61pass/out"
os.makedirs(OUT, exist_ok=True)
SPEC = {  # name: (height m, tri budget)
  "phone":   (0.95, 30000),
  "vent":    (0.96, 20000),
  "urn":     (0.55, 16000),
  "planter": (2.60, 40000),
  "cabinet": (1.20, 20000),
}
def bbox(o):
  vs = [o.matrix_world @ v.co for v in o.data.vertices]
  return mathutils.Vector([min(v[i] for v in vs) for i in range(3)]), mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
for name, (h, budget) in SPEC.items():
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
  ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
  bpy.ops.object.select_all(action="DESELECT")
  for o in ms: o.select_set(True)
  bpy.context.view_layer.objects.active = ms[0]
  if len(ms) > 1: bpy.ops.object.join()
  o = bpy.context.view_layer.objects.active
  bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
  for e in [x for x in bpy.context.scene.objects if x.type != "MESH"]: bpy.data.objects.remove(e)
  bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
  tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
  if tris > budget:
    m = o.modifiers.new("dec", "DECIMATE"); m.ratio = budget / tris
    bpy.ops.object.modifier_apply(modifier="dec")
  a, b = bbox(o); s = h / (b.z - a.z)
  o.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True)
  a, b = bbox(o); c = (a + b) / 2
  o.data.transform(mathutils.Matrix.Translation((-c.x, -c.y, -a.z))); o.data.update()
  for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
  a, b = bbox(o); d = b - a
  print(f"FIT {name}: w(x)={d.x:.3f} d(y)={d.y:.3f} h={d.z:.3f} tris={sum(len(p.vertices)-2 for p in o.data.polygons)}")
  bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
  # proofs: front from -Y (glTF +z), side from +X
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
  sc.render.resolution_x = sc.render.resolution_y = 512
  w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
  cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
  R = max(d) * 2.2
  for tag, pos in (("front", (0, -R, h * 0.55)), ("side", (R, 0, h * 0.55))):
    cam.location = pos
    cam.rotation_euler = (mathutils.Vector((0, 0, h * 0.5)) - mathutils.Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{OUT}/{name}-{tag}.png"; bpy.ops.render.render(write_still=True)
