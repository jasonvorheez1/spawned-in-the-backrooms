# Nov 16 (Shelly, dark arcs beside the nose): the Snout_* shape keys carried sharp creases where the snout meets the cheek.
# Each snout key's offset from the basis is relaxed (Laplacian over the welded mesh) so the snout blends into the cheeks; the basis is untouched.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/snout-smooth.py -- IN.glb OUT.glb TAG
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; IN, OUT, TAG = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data
kb = me.shape_keys.key_blocks; basis = kb["Basis"]
nb = [[] for _ in me.vertices]
for e in me.edges: i, j = e.vertices; nb[i].append(j); nb[j].append(i)
def render(tag):
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 500
  if "C" not in bpy.data.objects:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 110
    cam.location = (0.35, -2.4, 1.05); cam.rotation_euler = (Vector((0, 0, 0.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.rotation_euler = (0.5, 0.2, 0); L.data.energy = 3
    w = bpy.data.worlds.new("w"); sc.world = w; w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
    m = bpy.data.materials.new("c"); me.materials.clear(); me.materials.append(m)
  for k in kb: k.value = 1.0 if k.name == "Snout_Flat" else 0
  sc.render.filepath = f"/tmp/hr/{TAG}_{tag}.png"; bpy.ops.render.render(write_still=True)
if TAG.endswith("render"): render("before")
for k in kb:
  if not k.name.startswith("Snout_"): continue
  d = [k.data[i].co - basis.data[i].co for i in range(len(me.vertices))]
  moving = [x.length > 1e-6 for x in d]
  near = set(i for i, m in enumerate(moving) if m)
  for i in list(near): near.update(nb[i])          # the ring around the moved region relaxes too: that's where the crease sits
  for _ in range(10):
    nd = list(d)
    for i in near:
      if nb[i]: avg = sum((d[j] for j in nb[i]), Vector()) / len(nb[i]); nd[i] = d[i].lerp(avg, 0.5)
    d = nd
  for i in range(len(me.vertices)): k.data[i].co = basis.data[i].co + d[i]
  print("smoothed", k.name, len(near))
if TAG.endswith("render"): render("after")
else: bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
