# Nov 16 (Shelly 'improve head and body with 3d model studio'): the body's hard crease where the arm meets the shoulder and armpit is relaxed.
# Taubin smoothing (no shrink) over the welded mesh inside a sphere round each upper-arm joint, feathered to zero at its edge, capped at 6 mm.
# Basis and every shape key take the same offset; bones, weights, UVs and slots untouched. Exported before the proof render (render swaps slots for clay).
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/body-relax.py -- IN.glb OUT.glb TAG
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; IN, OUT, TAG = a[:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
body = bpy.data.objects["Body"]; me = body.data; mw = body.matrix_world
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
names = [b.name for b in arm.data.bones]
joints = [arm.matrix_world @ arm.data.bones[n].head_local for n in names if n.lower().endswith(("leftarm", "rightarm")) or n.lower() in ("leftarm", "rightarm")]
print("joints", [n for n in names if "arm" in n.lower()][:8], joints)
W = [mw @ v.co for v in me.vertices]
key = {}; grp = []
for p in W: grp.append(key.setdefault((round(p.x, 5), round(p.y, 5), round(p.z, 5)), len(key)))
nb = [set() for _ in key]
for e in me.edges:
  i, j = grp[e.vertices[0]], grp[e.vertices[1]]
  if i != j: nb[i].add(j); nb[j].add(i)
members = [[] for _ in key]
for i, g in enumerate(grp): members[g].append(i)
P = [W[m[0]].copy() for m in members]; base = [p.copy() for p in P]
R0 = 0.075
def wt(p):
  d = min((p - j).length for j in joints) if joints else 9
  t = max(0.0, min(1.0, (R0 - d) / (R0 * 0.5))); return t * t * (3 - 2 * t)
wgt = [wt(p) for p in P]; act = [i for i in range(len(P)) if wgt[i] > 0 and nb[i]]
print("active", len(act))
for it in range(20):
  for lam in (0.5, -0.53):
    nw = list(P)
    for i in act: nw[i] = P[i] + (sum((P[j] for j in nb[i]), Vector()) / len(nb[i]) - P[i]) * lam * wgt[i]
    P = nw
CAP = 0.006
for i in range(len(P)):
  d = P[i] - base[i]
  if d.length > CAP: P[i] = base[i] + d.normalized() * CAP
print("max move m", max((P[i] - base[i]).length for i in range(len(P))))
inv = mw.inverted().to_3x3(); kb = me.shape_keys.key_blocks if me.shape_keys else []
for g, m in enumerate(members):
  dl = inv @ (P[g] - base[g])
  if dl.length == 0: continue
  for i in m:
    me.vertices[i].co += dl
    for k in kb: k.data[i].co += dl
me.update()
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
