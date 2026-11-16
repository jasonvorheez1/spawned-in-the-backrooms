# Nov 16 (dark arcs beside the nose): the snout bulb overhung a shelf under it; the undercut shadowed as two dark arcs.
# Fills it by a soft union with a muzzle ellipsoid under the nose: any vertex inside the blob is pushed out to its skin
# along the ray from the blob's centre (smooth-max, so the edge melts into the cheeks), never pulled in. The same per-vertex
# delta rides every shape key, so morphs keep their shape. A plain Laplacian (the first try) folded faces into a torn triangle.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/muzzle-fill.py -- IN.glb OUT.glb
import bpy, sys, math
from mathutils import Vector
IN, OUT = sys.argv[sys.argv.index("--")+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.inverted()
P = [mw @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
R = Vector((0.115, 0.09, 0.072))                       # the muzzle blob: cheek to cheek, nose-deep, nose to chin
C = Vector((0, nose.y + 0.105, nose.z - 0.032))
K = 0.18                                                # smooth-max softness, in blob radii
def smax(a, b, k): h = max(0.0, min(1.0, 0.5 + 0.5 * (a - b) / k)); return a * h + b * (1 - h) + k * h * (1 - h)
D = []
for p in P:
  q = p - C; u = Vector((q.x / R.x, q.y / R.y, q.z / R.z)); r = u.length
  if r < 1e-6 or r > 1 + K or q.y > 0.02 or p.y > nose.y + 0.16: D.append(Vector()); continue
  if (p - nose).length < 0.02: D.append(Vector()); continue        # the button nose itself stays
  nr = smax(r, 1.0, K)
  D.append(q * (nr / r) - q)
moved = sum(1 for d in D if d.length > 1e-5)
for i, d in enumerate(D):
  if d.length > 1e-5: me.vertices[i].co = inv @ (P[i] + d)
if me.shape_keys:
  for k in me.shape_keys.key_blocks:
    for i, d in enumerate(D):
      if d.length > 1e-5: k.data[i].co = inv @ ((mw @ k.data[i].co) + d)
me.update()
print("filled", moved, "max", round(max(d.length for d in D), 4), "nose", tuple(round(c, 3) for c in nose))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
