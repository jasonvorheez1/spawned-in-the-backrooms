# Nov 16 (Shelly "why is my snout pushed back" / "mochi and flat look stupid" / her 3/4 guide "the muzzle CONNECTS and contours"):
# proofs showed the default (button) muzzle barely left the face in profile. One sculpt pass from the current head:
#  Basis (button) = a rounded muzzle pushed forward out of the lower face, its top running up into the nose bridge,
#                   its sides fading into the cheeks (no rim); every other key rides the new rest shape
#  Snout_Flat     = a low plateau muzzle: wider, a third as deep, flat-fronted
#  Snout_Puff     = mochi: the button's depth, rounder and wider, two whisker pads under the nose
# usage: blender -b --factory-startup --python snout-v3.py -- <in.glb> <out.glb>
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.to_3x3().inverted()
kb = me.shape_keys.key_blocks; B = [k.co.copy() for k in kb["Basis"].data]; W = [mw @ c for c in B]
ZC = 0.80   # muzzle centre height (the drawn nose sits at 0.797)
FY = min(p.y for p in W if abs(p.x) < 0.01 and abs(p.z - ZC) < 0.01); print("FACE FRONT y", round(FY, 4))
def dome(p, A, rx, rup, rdn, power=2, zc=ZC):
    dz = p.z - zc; r = math.hypot(p.x / rx, dz / (rup if dz > 0 else rdn))
    if r >= 1: return 0.0
    return A * (1 - r ** power) ** 2
def facing(p):   # front of the face only: fades to nothing 6 cm behind the muzzle front
    return 1 - sm((p.y - FY) / 0.06)
g = lambda d, r: math.exp(-(d / r) ** 2)
def button(p): return dome(p, 0.042, 0.105, 0.11, 0.075) * facing(p)
def flat(p): return dome(p, 0.016, 0.12, 0.10, 0.08, power=4) * facing(p)
def puff(p):
    a = dome(p, 0.036, 0.12, 0.10, 0.08, power=3)
    for s in (-1, 1): a += 0.012 * g(math.hypot(p.x - s * 0.022, (p.z - (ZC - 0.022)) * 0.7), 0.026)
    return a * facing(p)
D = {n: [Vector((0, -f(p), 0)) for p in W] for n, f in (("b", button), ("f", flat), ("p", puff))}
for n in D: print("MAX", n, round(max(d.length for d in D[n]), 4))
for k in kb:
    if k.name == "Snout_Flat": dd = D["f"]
    elif k.name == "Snout_Puff": dd = D["p"]
    else: dd = D["b"]
    if k.name in ("Snout_Flat", "Snout_Puff"):
        for i in range(len(B)): k.data[i].co = B[i] + inv @ dd[i]
    else:
        for i in range(len(B)): k.data[i].co = k.data[i].co + inv @ dd[i]
for i, v in enumerate(me.vertices): v.co = kb["Basis"].data[i].co
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
