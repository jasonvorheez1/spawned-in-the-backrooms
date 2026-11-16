# Nov 16 (Shelly "mochi and flat look stupid as hell"): the old Flat/Puff keys were deltas for the long snout,
# on the short one they dented and bulged. Rebuilt from the current base:
#  Snout_Flat  = the muzzle eased back toward the face, a soft button left (guide: "a little bump"), no dent
#  Snout_Puff  = mochi: two round whisker pads under the nose (an ω mouth) + soft round cheeks, along the skin normal
# usage: blender -b --factory-startup --python snout-types2.py -- <in.glb> <out.glb>
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
SC = Vector((0, -0.165, 0.796))
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.to_3x3().inverted(); nm = mw.to_3x3()
kb = me.shape_keys.key_blocks; B = [k.co.copy() for k in kb["Basis"].data]
W = [mw @ c for c in B]
def front(x, z, tol=0.008):
    c = [p for p in W if abs(p.x - x) < tol and abs(p.z - z) < tol]
    return min(c, key=lambda p: p.y)
tip = front(0, SC.z, 0.02); print("TIP", tuple(round(v, 4) for v in tip))
# normals of the basis
me.vertices.foreach_get  # noqa
N = [(nm @ v.normal).normalized() for v in me.vertices]
def press(i, k, wide):
    # the whole muzzle scaled back toward its root by k (uniform, so it stays convex: no crater), fading out past its rim into the cheeks
    v = W[i] - SC
    if v.y > 0.004: return Vector()
    side = math.hypot(v.x / 0.085, v.z / 0.075)
    if side >= 1.5: return Vector()
    w = sm((-v.y + 0.004) / 0.012) * (1 - sm((side - 0.95) / 0.5))
    return Vector((v.x * wide * w, -v.y * k * w, 0))
flat = lambda i: press(i, 0.58, 0.06)
pads = [Vector((s * 0.021, tip.y + 0.008, tip.z - 0.013)) for s in (-1, 1)]   # spatial points just under the nose (the mouth has no skin verts to probe)
cheeks = [front(s * 0.058, tip.z + 0.004, 0.012) for s in (-1, 1)]
print("PADS", [tuple(round(v, 3) for v in p) for p in pads], "CHEEKS", [tuple(round(v, 3) for v in p) for p in cheeks])
g = lambda d, r: math.exp(-(d / r) ** 2)
def puff(i):
    p = W[i]; amt = 0
    for c in pads: amt += 0.015 * g((p - c).length, 0.02)
    for c in cheeks: amt += 0.008 * g((p - c).length, 0.036)
    for sx in (-1, 1): amt += 0.005 * g((p - Vector((sx * 0.04, tip.y + 0.012, tip.z - 0.006))).length, 0.03)   # bridge pad→cheek, no crease
    base = press(i, 0.28, 0.14)   # mochi: a shorter, wider dumpling muzzle...
    if amt < 1e-5 or N[i].y > 0.2: return base   # front-facing skin only
    return base + N[i] * amt   # ...with puffed whisker pads and round cheeks
for name, fn in (("Snout_Flat", flat), ("Snout_Puff", puff)):
    k = kb[name]; mx = 0
    for i in range(len(B)):
        d = fn(i); mx = max(mx, d.length); k.data[i].co = B[i] + inv @ d
    print("KEY", name, round(mx, 4))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
