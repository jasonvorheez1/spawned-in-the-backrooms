# Nov 16 (Shelly, dark arcs beside the nose): the base head (button snout, every key) has a crease where the muzzle meets the cheek.
# Taubin-relaxes the head around the muzzle sides (below and beside the nose, nose tip held), the same offset carried onto every shape key.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/muzzle-relax.py -- IN.glb OUT.glb TAG   (TAG ending "render" = proof only)
import bpy, sys, math
from mathutils import Vector
IN, OUT, TAG = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.inverted().to_3x3()
kb = me.shape_keys.key_blocks if me.shape_keys else []
P = [mw @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)       # the face looks down -Y
nb = [[] for _ in me.vertices]
for e in me.edges: i, j = e.vertices; nb[i].append(j); nb[j].append(i)
def wgt(p):                                                              # the muzzle sides: below/beside the nose, front of the head
  c = Vector((0, nose.y + 0.02, nose.z - 0.015)); d = (Vector((p.x * 0.8, p.y, p.z)) - c).length
  if p.y > nose.y + 0.07 or (p - nose).length < 0.012: return 0.0
  return max(0.0, 1 - d / 0.075) ** 0.7
W = [wgt(p) for p in P]
cur = [Vector(p) for p in P]
for it in range(24):
  f = 0.55 if it % 2 == 0 else -0.57                                     # Taubin: smooth, then inflate back: no shrink
  nxt = list(cur)
  for i, w in enumerate(W):
    if w > 0 and nb[i]:
      avg = sum((cur[j] for j in nb[i]), Vector()) / len(nb[i]); nxt[i] = cur[i] + (avg - cur[i]) * f * w
  cur = nxt
delta = [inv @ (cur[i] - P[i]) for i in range(len(P))]
print("relaxed", sum(1 for w in W if w > 0), "max", round(max(d.length for d in delta), 4), "nose", tuple(round(c, 3) for c in nose))
for i, v in enumerate(me.vertices): v.co += delta[i]
for k in kb:
  for i, d in enumerate(delta): k.data[i].co += d
def render(tag):
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 500
  cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 200
  cam.location = (0.15, nose.y - 1.6, nose.z + 0.25); cam.rotation_euler = (Vector((0, nose.y, nose.z)) - cam.location).to_track_quat("-Z", "Y").to_euler()
  L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.rotation_euler = (math.radians(55), 0, math.radians(10)); L.data.energy = 3
  w = bpy.data.worlds.new("w"); sc.world = w; w.node_tree.nodes["Background"].inputs[1].default_value = 0.4
  m = bpy.data.materials.new("c"); me.materials.clear(); me.materials.append(m)
  for k in kb: k.value = 0
  sc.render.filepath = f"/tmp/hr/{TAG}.png"; bpy.ops.render.render(write_still=True)
if TAG.endswith("render"): render(TAG)
else: bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
