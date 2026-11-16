# Nov 16 (dark arcs beside the nose): in game the arcs are the steep sides of the snout bulb where it meets the cheeks
# (seen on the salon stylist, Bonus). The bulb is melted into the face with Blender's Laplacian Smooth (volume-preserving),
# weighted by a soft sphere around the bulb, so its sides slope instead of cliff. The painted nose and mouth carry the muzzle.
# The basis delta rides every shape key. Plain hand-rolled smoothing (try one) folded faces; this keeps the surface whole.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/muzzle-fill.py -- IN.glb OUT.glb [strength]
import bpy, sys
from mathutils import Vector
args = sys.argv[sys.argv.index("--")+1:]; IN, OUT = args[:2]; ST = float(args[2]) if len(args) > 2 else 0.45; CH = float(args[3]) if len(args) > 3 else 0.7   # snout melt, chin-front melt (Nov 16: "their head is weird up front": the lowered jaw made a shelf)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.inverted()
P = [mw @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
s = (max(p.z for p in P) - min(p.z for p in P)) / 0.62
C = Vector((0, nose.y + 0.03 * s, nose.z - 0.005 * s)); RAD = 0.11 * s
vg = head.vertex_groups.new(name="muzzle_melt")
for i, p in enumerate(P):
  if p.y > nose.y + 0.12 * s: continue
  d = (p - C).length
  w = max(0.0, 1 - d / RAD)
  C2 = Vector((0, nose.y + 0.05 * s, nose.z - 0.13 * s)); w2 = max(0.0, 1 - (p - C2).length / (0.15 * s)) if p.y < nose.y + 0.16 * s else 0.0
  ww = max((w ** 0.6) * ST, (w2 ** 0.6) * CH)
  if ww > 0: vg.add([i], min(1.0, ww), "REPLACE")
keys = me.shape_keys
if keys: head.shape_key_add  # keep keys; evaluate basis alone
for o in bpy.data.objects: o.select_set(False)
m = head.modifiers.new("melt", "LAPLACIANSMOOTH"); m.vertex_group = vg.name
m.iterations = 25; m.lambda_factor = 0.6; m.lambda_border = 0.0; m.use_volume_preserve = True; m.use_normalized = True
for mod in head.modifiers:
  if mod.type == "ARMATURE": mod.show_viewport = False
KV = {k.name: k.value for k in keys.key_blocks} if keys else {}
if keys:
  for k in keys.key_blocks: k.value = 0.0   # the basis alone is smoothed; values come back before export
dg = bpy.context.evaluated_depsgraph_get(); ev = head.evaluated_get(dg).data
assert len(ev.vertices) == len(P)
D = [(mw @ ev.vertices[i].co) - P[i] for i in range(len(P))]
head.modifiers.remove(m)
for mod in head.modifiers:
  if mod.type == "ARMATURE": mod.show_viewport = True
moved = 0
WT = set()
for i in range(len(P)):
  try: vg.weight(i); WT.add(i)
  except RuntimeError: pass
for i, d in enumerate(D):
  if i in WT and d.length > 1e-6:
    moved += 1; me.vertices[i].co = inv @ (P[i] + d)
    if keys:
      for k in keys.key_blocks: k.data[i].co = inv @ ((mw @ k.data[i].co) + d)
if keys:
  for k in keys.key_blocks: k.value = KV[k.name]
head.vertex_groups.remove(vg)
me.update()
print("melted", moved, "max", round(max(d.length for d in D), 4), "nose", tuple(round(c, 3) for c in nose))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
