# Nov 16 (Shelly 'improve head and body'): relax the dent across the middle of the face and the hard ear rims on the base Head.
# Basis verts in the dent/rim zones are Taubin-smoothed (no shrink); every shape key keeps its own offset from the basis. Bones, weights, UVs untouched.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/face-relax.py -- IN.glb OUT.glb TAG [probe]
import bpy, sys, bmesh
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; IN, OUT, TAG = a[:3]; PROBE = len(a) > 3
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
for o in bpy.data.objects:
  if o.type == "MESH": print("MESH", o.name, len(o.data.vertices), [k.name for k in (o.data.shape_keys.key_blocks if o.data.shape_keys else [])][:40])
head = bpy.data.objects["Head"]; me = head.data
mw = head.matrix_world
W = [mw @ v.co for v in me.vertices]
xs = [p.x for p in W]; ys = [p.y for p in W]; zs = [p.z for p in W]
print("bounds", min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))
# weld by position for neighbourhoods (glb splits at seams)
key = {}; grp = []
for i, p in enumerate(W):
  k = (round(p.x, 5), round(p.y, 5), round(p.z, 5)); grp.append(key.setdefault(k, len(key)))
nb = [set() for _ in range(len(key))]
for e in me.edges:
  i, j = grp[e.vertices[0]], grp[e.vertices[1]]
  if i != j: nb[i].add(j); nb[j].add(i)
members = [[] for _ in range(len(key))]
for i, g in enumerate(grp): members[g].append(i)
P = [W[m[0]].copy() for m in members]
def render(tag, keys=None):
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 600
  if "C" not in bpy.data.objects:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 120
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.rotation_euler = (0.9, 0.0, 0.5); L.data.energy = 3
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.4
    m = bpy.data.materials.new("c"); m.use_nodes = True; m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.35
    for o in bpy.data.objects:
      if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(m)
  if me.shape_keys:
    for k in me.shape_keys.key_blocks: k.value = 0
  cam = bpy.data.objects["C"]; c = Vector(((min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (min(zs)*0.45+max(zs)*0.55)))
  for n, d in (("front", Vector((0, -1, 0.05))), ("side", Vector((-1, -0.35, 0.1))), ("ear", Vector((-0.5, -0.4, 0.75)))):
    cam.location = c + d.normalized() * 2.2; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/workspace/cw/out/{TAG}_{tag}_{n}.png"; bpy.ops.render.render(write_still=True)
if PROBE: render("before"); sys.exit(0)
H = max(zs) - min(zs); z0 = min(zs)
kbs = me.shape_keys.key_blocks
sl = kbs["Snout_Long"]; dS = [(mw.to_3x3() @ (sl.data[m[0]].co - kbs["Basis"].data[m[0]].co)) for m in members]
tip = max(range(len(P)), key=lambda i: dS[i].length); FRONT = dS[tip].normalized(); NOSE = P[tip]
print("front", FRONT, "nose", NOSE)
ctr = Vector((sum(xs)/len(xs), sum(ys)/len(ys), 0))
def zone(p):
  t = (p.z - z0) / H
  if (p - NOSE).length < 0.075: return 0.0                             # the approved snout stays as it is
  band = 0.18 < t < 0.62                                               # the dented band round the face and cheeks
  ear = t > 0.80
  return 1.0 if band else (0.7 if ear else 0.0)
wgt = [zone(p) for p in P]
for _ in range(3):  # feather the edge of the zone
  wgt = [max(w, 0.6*max((wgt[j] for j in nb[i]), default=0)) for i, w in enumerate(wgt)]
base = [p.copy() for p in P]
for it in range(12):
  for lam in (0.5, -0.53):
    nw = list(P)
    for i in range(len(P)):
      if wgt[i] > 0 and nb[i]:
        avg = sum((P[j] for j in nb[i]), Vector()) / len(nb[i]); nw[i] = P[i] + (avg - P[i]) * lam * wgt[i]
    P = nw
mx = max((P[i]-base[i]).length for i in range(len(P))); print("max move m", mx)
inv = mw.inverted()
kb = me.shape_keys.key_blocks if me.shape_keys else None
for g, m in enumerate(members):
  dl = inv.to_3x3() @ (P[g] - base[g])
  for i in m:
    me.vertices[i].co += dl
    if kb:
      for k in kb: k.data[i].co += dl
me.update()
render("after")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
