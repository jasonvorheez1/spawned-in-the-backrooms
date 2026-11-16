# Nov 16 (Shelly, dark arcs beside the nose): under the button snout the head had a deep pocket (an old mouth hollow the 2D face
# never uses); its rim read as two dark arcs beside the nose. Laplacian-fills the pocket and blends the snout bulb into the cheeks,
# every shape key smoothed on its own coords with the same falloff; the nose tip is held.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/muzzle-fill.py -- IN.glb OUT.glb PROOF_PREFIX
import bpy, sys, math
from mathutils import Vector
IN, OUT, PRE = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.inverted()
P = [mw @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
nb = [[] for _ in me.vertices]
for e in me.edges: i, j = e.vertices; nb[i].append(j); nb[j].append(i)
C = Vector((0, nose.y + 0.045, nose.z - 0.055))          # the pocket's middle, under and behind the nose
def wgt(p):
  if (p - nose).length < 0.022: return 0.0                # the nose tip keeps its shape
  d = (Vector((p.x * 0.85, p.y, p.z)) - C).length
  hold = min(1.0, ((p - nose).length - 0.022) / 0.02)
  return max(0.0, 1 - d / 0.11) ** 0.8 * hold
W = [wgt(p) for p in P]
def smooth(co):                                           # co: world-space list
  cur = list(co)
  for _ in range(45):
    nxt = list(cur)
    for i, w in enumerate(W):
      if w > 0 and nb[i]:
        a = sum((cur[j] for j in nb[i]), Vector()) / len(nb[i]); nxt[i] = cur[i] + (a - cur[i]) * 0.6 * w
    cur = nxt
  return cur
def proof(tag):
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 20; sc.render.resolution_x = sc.render.resolution_y = 500
  if not sc.camera:
    m = bpy.data.materials.new("proof"); m.use_nodes = True; m.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (0.85, 0.65, 0.45, 1)
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.rotation_euler = (math.radians(60), 0, 0); L.data.energy = 3
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 85
  saved = {o.name: list(o.data.materials) for o in bpy.data.objects if o.type == "MESH"}
  pm = bpy.data.materials["proof"]
  for o in bpy.data.objects:
    if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(pm)
  cam = sc.camera; t = Vector((0, nose.y + 0.05, nose.z - 0.01))
  for n, (dx, dz) in {"front": (0, 0.05), "low": (0.25, -0.25)}.items():
    cam.location = t + Vector((dx, -0.9, dz)); cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{PRE}_{tag}_{n}.png"; bpy.ops.render.render(write_still=True)
  for o in bpy.data.objects:
    if o.type == "MESH":
      o.data.materials.clear()
      for m in saved[o.name]: o.data.materials.append(m)
proof("before")
kb = me.shape_keys.key_blocks if me.shape_keys else []
for k in kb:
  new = smooth([mw @ d.co for d in k.data])
  for i, w in enumerate(W):
    if w > 0: k.data[i].co = inv @ new[i]
basis = smooth(P)
moved = 0
for i, w in enumerate(W):
  if w > 0: me.vertices[i].co = inv @ basis[i]; moved += 1
print("filled", moved, "max", round(max((basis[i] - P[i]).length for i in range(len(P))), 4), "nose", tuple(round(c, 3) for c in nose))
me.update(); proof("after")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
