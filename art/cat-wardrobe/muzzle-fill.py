# Nov 16 (dark arcs beside the nose): the midline under the nose is convex, but beside it the snout bulb overhangs a
# shelf, and that undercut shadows as two dark arcs. Each thin vertical slice of the lower face is pushed forward to its
# own convex front envelope (a slice can't hide a hollow under an overhang), the push field is smoothed (the field, never
# the positions: smoothing positions folded faces into a torn triangle on try one), and faded out toward cheeks and chin.
# Never pulls a vertex in. The same delta rides every shape key.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/muzzle-fill.py -- IN.glb OUT.glb
import bpy, sys
from mathutils import Vector
IN, OUT = sys.argv[sys.argv.index("--")+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.inverted()
P = [mw @ v.co for v in me.vertices]
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
s = (max(p.z for p in P) - min(p.z for p in P)) / 0.62          # head size vs the cute head the numbers were set on
XW, ZT, ZB, YD = 0.13 * s, nose.z + 0.015 * s, nose.z - 0.13 * s, 0.11 * s
reg = [i for i, p in enumerate(P) if abs(p.x) < XW and ZB < p.z < ZT and p.y < nose.y + YD]
def envelope(pts, z):                                            # forward (min y) convex envelope of (z, y) points, read at z
  pts = sorted(pts); hull = []
  for q in pts:
    while len(hull) >= 2:
      (z1, y1), (z2, y2) = hull[-2], hull[-1]
      if (z2 - z1) * (q[1] - y1) - (y2 - y1) * (q[0] - z1) <= 0: hull.pop()   # keep the lower (more forward) chain
      else: break
    hull.append(q)
  for (z1, y1), (z2, y2) in zip(hull, hull[1:]):
    if z1 <= z <= z2: return y1 + (y2 - y1) * (z - z1) / max(z2 - z1, 1e-9)
  return None
dy = {}
for i in reg:
  p = P[i]; sl = [(P[j].z, P[j].y) for j in reg if abs(P[j].x - p.x) < 0.009 * s]
  e = envelope(sl, p.z)
  if e is None or e >= p.y: continue
  fx = max(0.0, 1 - abs(p.x) / XW) ** 0.7
  fz = min(1.0, (p.z - ZB) / (0.04 * s), (ZT - p.z) / (0.01 * s))
  dy[i] = (e - p.y) * fx * max(0.0, fz)
nb = [[] for _ in P]
for e in me.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
field = [dy.get(i, 0.0) for i in range(len(P))]
for _ in range(6):                                               # smooth the push, keep it a push
  field = [min(f, sum(field[j] for j in nb[i]) / len(nb[i])) if (i in dy or f) and nb[i] else f for i, f in enumerate(field)] if False else \
          [ (0.5 * f + 0.5 * sum(field[j] for j in nb[i]) / len(nb[i])) if nb[i] and abs(P[i].x) < XW * 1.2 and ZB - 0.02 < P[i].z < ZT + 0.01 else f for i, f in enumerate(field)]
field = [min(0.0, f) for f in field]
moved = 0
for i, f in enumerate(field):
  if f < -1e-5:
    moved += 1; d = Vector((0, f, 0))
    me.vertices[i].co = inv @ (P[i] + d)
    if me.shape_keys:
      for k in me.shape_keys.key_blocks: k.data[i].co = inv @ ((mw @ k.data[i].co) + d)
me.update()
print("filled", moved, "of", len(reg), "max", round(-min(field), 4), "nose", tuple(round(c, 3) for c in nose))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
