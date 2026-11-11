# Shelly #205xxx "keep it pg ... tone down the breasts, less exaggerated, more cartoonish"
# Pulls the female chest back toward a smooth line from the waist to the upper chest, so it reads as one soft cartoon curve.
# Works on Body's Dandy shape (the one the game shows) and moves Basis, Bust and Dandy together.
# Usage: blender -b --python soft_chest.py -- <in.glb> <out.glb> [keep=0.35]
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT = a[0], a[1]; KEEP = float(a[2]) if len(a) > 2 else 0.35
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
b = bpy.data.objects['Body']; M = b.matrix_world; Mi = M.inverted().to_3x3()
ks = b.data.shape_keys.key_blocks; base = ks['Basis']; dk = ks['Dandy']
W = [M @ (dk.data[i].co) for i in range(len(dk.data))]   # the shown shape, world space (front is -Y)
Z0, Z1 = 0.44, 0.74            # waist to upper chest
def front(z0, z1):
  s = [p.y for p in W if z0 <= p.z < z1 and abs(p.x) < 0.06]; return min(s)
F0, F1 = front(Z0 - 0.02, Z0 + 0.02), front(Z1 - 0.02, Z1 + 0.02)
print("baseline", F0, F1)
def ss(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
moved = 0; worst = 0
for i, p in enumerate(W):
  if p.y >= 0 or p.z < Z0 - 0.04 or p.z > Z1 + 0.04: continue
  t = (p.z - Z0) / (Z1 - Z0); line = F0 + (F1 - F0) * max(0, min(1, t))
  ex = line - p.y                                  # how far in front of the line
  if ex <= 0: continue
  edge = ss((p.z - (Z0 - 0.04)) / 0.06) * ss(((Z1 + 0.04) - p.z) / 0.06)
  side = ss((0.19 - abs(p.x)) / 0.13)               # fade out at the flanks
  dy = ex * (1 - KEEP) * edge * side                 # pull back toward the line
  worst = max(worst, ex)
  d = Mi @ Vector((0, dy, 0))
  for k in ks: k.data[i].co += d
  b.data.vertices[i].co += d; moved += 1
# the Bust slider: halve what it can add
bb = ks['Bust']
for i in range(len(bb.data)): bb.data[i].co = base.data[i].co + (bb.data[i].co - base.data[i].co) * 0.5
print("moved", moved, "max excess was", round(worst, 3))
bpy.ops.export_scene.gltf(filepath=OUT, export_morph=True, export_skins=True, export_animations=False)
print("DONE", OUT)
