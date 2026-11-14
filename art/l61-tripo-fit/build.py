# Studio pass for Level 6.1 Tripo props (tray, blue plate, mug, longneck, water machine):
# join, keep the main loose part where asked, decimate to budget, lay flat things flat, real scale, feet origin, Blender -Y front (glTF +z)
import bpy, mathutils, math
SPEC = {  # name: (longest-side metres or ("z", h), tri budget, keep largest part, flat)
  "tray":   (0.46, 6000, False, True),
  "plate":  (0.26, 8000, False, True),
  "mug":    (("z", 0.10), 4000, False, False),
  "beer":   (("z", 0.23), 4000, True, False),
  "waterv": (("z", 1.83), 24000, False, False),
}
def bbox(o):
  vs = [v.co for v in o.data.vertices]
  return mathutils.Vector([min(v[i] for v in vs) for i in range(3)]), mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
for name, (size, budget, largest, flat) in SPEC.items():
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=f"/tmp/tr/{name}.glb")
  ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
  bpy.ops.object.select_all(action="DESELECT")
  for o in ms: o.select_set(True)
  bpy.context.view_layer.objects.active = ms[0]
  if len(ms) > 1: bpy.ops.object.join()
  o = bpy.context.view_layer.objects.active
  bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
  bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
  for e in [x for x in bpy.context.scene.objects if x.type != "MESH"]: bpy.data.objects.remove(e)
  if largest:
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    parts = [p for p in bpy.context.scene.objects if p.type == "MESH"]
    def vol(p): a, b = bbox(p); d = b - a; return d.x * d.y * d.z
    big = max(parts, key=lambda p: (bbox(p)[1] - bbox(p)[0]).z)  # the bottle is the tallest piece
    ba, bb = bbox(big); pad = (bb - ba).x * 0.6
    keep = []
    for p in parts:  # every piece standing over the bottle's footprint stays (glass, label, cap); the cup beside it goes
      a, b = bbox(p); cx, cy = (a.x + b.x) / 2, (a.y + b.y) / 2
      if ba.x - pad <= cx <= bb.x + pad and ba.y - pad <= cy <= bb.y + pad: keep.append(p)
      else: bpy.data.objects.remove(p)
    bpy.ops.object.select_all(action="DESELECT")
    for p in keep: p.select_set(True)
    bpy.context.view_layer.objects.active = big
    if len(keep) > 1: bpy.ops.object.join()
    o = big
  a, b = bbox(o); d = b - a; print("RAW", name, [round(x, 3) for x in d])
  if flat:  # thinnest axis becomes up
    t = min(range(3), key=lambda i: d[i])
    R = mathutils.Matrix.Identity(3) if t == 2 else mathutils.Matrix.Rotation(math.pi / 2, 3, "X" if t == 1 else "Y")
    for v in o.data.vertices: v.co = R @ v.co
    a, b = bbox(o); d = b - a
    if d.y > d.x:  # long side along x
      R = mathutils.Matrix.Rotation(math.pi / 2, 3, "Z")
      for v in o.data.vertices: v.co = R @ v.co
  tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
  if tris > budget:
    m = o.modifiers.new("d", "DECIMATE"); m.ratio = budget / tris; bpy.ops.object.modifier_apply(modifier="d")
  a, b = bbox(o); d = b - a
  s = size[1] / d.z if isinstance(size, tuple) else size / max(d)
  c = mathutils.Vector(((a.x + b.x) / 2, (a.y + b.y) / 2, a.z))
  for v in o.data.vertices: v.co = (v.co - c) * s
  o.data.update()
  a, b = bbox(o); d = b - a
  print("FIT", name, [round(x, 3) for x in d], "tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 400
  w = bpy.data.worlds.new("w"); w.color = (0.55, 0.55, 0.55); sc.world = w
  L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(L); L.rotation_euler = (0.7, 0, -0.5); L.data.energy = 4
  cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
  r = max(d) * 1.9; tgt = mathutils.Vector((0, 0, d.z / 2))
  cam.location = tgt + mathutils.Vector((r * 0.5, -r, r * 0.55))   # from Blender front (-Y) = glTF +z
  cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
  sc.render.filepath = f"/tmp/tr/proof/{name}.png"; bpy.ops.render.render(write_still=True)
  bpy.data.objects.remove(cam); bpy.data.objects.remove(L)
  bpy.ops.export_scene.gltf(filepath=f"/workspace/l61-fit-{name}.glb", export_apply=True)
