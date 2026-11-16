# Shelly Nov 16: "fix stray normals and blocky areas of the critters" + "the bottom of their heads need to be lowered,
# it looks like they are a deflating balloon". Rounds out the lower head (jaw/cheek bulb drops and fills), welds split
# vertices, drops the baked custom normals (the dark creases under the eyes) and re-smooths head + body.
# Same edit on every shape key, so snouts and ears still morph. Usage: blender -b -P head-round.py -- in.glb out.glb tag
import bpy, bmesh, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; IN, OUT, TAG = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; body = bpy.data.objects["Body"]
TOP, SPAN, DROP, FILL = 0.80, 0.17, 0.032, 0.16   # her picks: bulb from 0.80 m down, bottom lowered 3.2 cm, sides filled 16 %
def ss(e0, e1, x): t = max(0, min(1, (x-e0)/(e1-e0))); return t*t*(3-2*t)
def render(tag):
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
  sc.render.resolution_x = 700; sc.render.resolution_y = 700
  if "Cam" not in bpy.data.objects:
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 85
    L = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN")); L.data.energy = 3; sc.collection.objects.link(L); L.rotation_euler = (0.9, 0.2, -0.5)
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    m = bpy.data.materials.new("clay"); m.use_nodes = True; m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.82, 0.78, 1)
    for o in (head, body):
      o.data.materials.clear(); o.data.materials.append(m)
  cam = bpy.data.objects["Cam"]
  for v, pos in (("front", (0, -2.2, 0.85)), ("side", (2.2, 0, 0.85))):
    cam.location = pos; d = Vector((0, 0, 0.82)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/tmp/hr/{TAG}_{tag}_{v}.png"; bpy.ops.render.render(write_still=True)
mw = head.matrix_world; inv = mw.inverted().to_3x3()
P = [mw @ v.co for v in head.data.vertices]
cy = sum(p.y for p in P)/len(P)
delta = []
for p in P:
  u = ss(TOP, TOP-SPAN, p.z)                     # 0 at the cheek line, 1 at the chin
  r = math.hypot(p.x, p.y-cy); wr = ss(0.06, 0.10, r)   # the neck stub stays put
  dz = -DROP*(u**1.4)*wr
  s = FILL*math.sin(math.pi*min(u, 1)*0.85)*wr
  dx = p.x*s; dy = (p.y-cy)*s*(0.55 if p.y < cy else 1.0)   # chin forward less than the jowls and back
  delta.append(inv @ Vector((dx, dy, dz)))
keys = head.data.shape_keys.key_blocks if head.data.shape_keys else []
for i, v in enumerate(head.data.vertices): v.co += delta[i]
for k in keys:
  for i, d in enumerate(delta): k.data[i].co += d
print("moved", sum(1 for d in delta if d.length > 1e-5), "max", round(max(d.length for d in delta), 4))
for o in (head, body):
  bm = bmesh.new(); bm.from_mesh(o.data); n0 = len(bm.verts)
  bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
  for f in bm.faces: f.smooth = True
  bm.to_mesh(o.data); bm.free()
  bpy.context.view_layer.objects.active = o
  with bpy.context.temp_override(object=o, active_object=o):
    if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
  print(o.name, "welded", n0 - len(o.data.vertices), "custom", o.data.has_custom_normals)
if TAG.endswith("render"): render("after")
else: bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
