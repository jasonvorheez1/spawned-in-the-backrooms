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
def flat(i):
    v = W[i] - SC
    if v.y > 0.004: return Vector()
    side = math.hypot(v.x / 0.085, v.z / 0.075)
    if side >= 1.3: return Vector()
    w = sm((-v.y) / 0.03) * (1 - sm((side - 0.75) / 0.55))
    return Vector((v.x * 0.08 * w, -v.y * 0.62 * w, -v.z * 0.04 * w))
pads = [front(s * 0.02, tip.z - 0.016) for s in (-1, 1)]
cheeks = [front(s * 0.058, tip.z + 0.004, 0.012) for s in (-1, 1)]
print("PADS", [tuple(round(v, 3) for v in p) for p in pads], "CHEEKS", [tuple(round(v, 3) for v in p) for p in cheeks])
g = lambda d, r: math.exp(-(d / r) ** 2)
def puff(i):
    p = W[i]; amt = 0
    for c in pads: amt += 0.011 * g((p - c).length, 0.017)
    for c in cheeks: amt += 0.009 * g((p - c).length, 0.032)
    if amt < 1e-5 or N[i].y > 0.2: return Vector()   # front-facing skin only
    return N[i] * amt
for name, fn in (("Snout_Flat", flat), ("Snout_Puff", puff)):
    k = kb[name]; mx = 0
    for i in range(len(B)):
        d = fn(i); mx = max(mx, d.length); k.data[i].co = B[i] + inv @ d
    print("KEY", name, round(mx, 4))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
