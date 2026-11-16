# Nov 16 (Shelly #443717+: "breasts look droopy too. im aiming for cuter mesh shaping, including base snout shape").
# One rest-space field, run on the bases AND every garment/hair/fluff/ear piece so they keep fitting:
#  snout: the muzzle's front 8 cm pulled back ~35% and rounded, wider at the cheeks (both sexes)
#  bust (female Chest key): rebuilt perkier: peak 8 mm higher, rounder fuller underside, lifted instead of dropped, a little smaller
# usage: blender -b --factory-startup --python cute.py -- <in.glb> <out.glb> <f|m> [cloth]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT, SEX = a[0], a[1], a[2]; CLOTH = len(a) > 3
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
TIP, BACK, MZ = -0.2485, -0.165, 0.795      # snout tip y, where the muzzle meets the face, muzzle centre height
def snout(p):
    if p.y > BACK or p.z < 0.70 or p.z > 0.90: return Vector()
    t = (BACK - p.y) / (BACK - TIP)                        # 0 at the face, 1 at the tip
    r = math.hypot(p.x / 0.12, (p.z - MZ) / 0.075)         # the muzzle's footprint
    w = 1 - sm((r - 0.75) / 0.6)
    if w <= 0: return Vector()
    d = Vector((0, 0, 0))
    d.y += (BACK - p.y) * 0.48 * w                         # shorter
    d.x += p.x * 0.10 * w * sm(1 - t)                      # cheeks a touch rounder
    d.z += (MZ - p.z) * 0.18 * w * t                       # tip rounder, less pointy
    return d
CX, CZ, AMP, SXW, SUP, SDN = 0.045, 0.528, 0.046, 0.034, 0.044, 0.034
if CLOTH: AMP = 0.049
def lobe(p, s):
    dx = (p.x - s * CX) / SXW; dz = p.z - CZ; dz = dz / (SUP if dz > 0 else SDN)
    if CLOTH and dz < 0: dz *= 0.35
    return math.exp(-0.5 * (dx * dx + dz * dz))
def bust(p, n):
    if p.y > -0.045 or n.y > 0.25: return Vector()
    l, r = lobe(p, -1), lobe(p, 1); w = (l ** 3 + r ** 3) ** (1 / 3)
    if CLOTH and abs(p.x) < CX: w = max(w, math.exp(-0.5 * (((p.z - CZ) / (SUP if p.z > CZ else SDN * 2.6)) ** 2)) * 0.9)
    s = 1 if p.x > 0 else -1; under = max(0.0, min(1.0, (CZ - p.z) / 0.03))
    off = Vector((s * 0.07 * AMP * w, -AMP * w, 0.14 * AMP * w * (0.4 + 0.6 * under)))   # lifted: the underside carried up, no sag
    return off * min(1, max(0, (-n.y + 0.1) / 0.45))
n = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    me = o.data; kb = me.shape_keys.key_blocks if me.shape_keys else None
    mw = o.matrix_world; inv = mw.to_3x3().inverted()
    base = [v.co.copy() for v in me.vertices]
    disp = [inv @ snout(mw @ c) for c in base]
    if kb:
        old = {k.name: [d.co.copy() for d in k.data] for k in kb}
        for k in kb:
            for i in range(len(base)): k.data[i].co = old[k.name][i] + disp[i]
        if SEX == "f" and "Chest" in kb:
            for i, v in enumerate(me.vertices): kb["Chest"].data[i].co = kb[0].data[i].co + inv @ bust(mw @ kb[0].data[i].co, v.normal)
    for i, v in enumerate(me.vertices): v.co = base[i] + disp[i]
    n += 1; print("CUTE", o.name, len(base), "snout max", round(max(d.length for d in disp), 4))
assert n
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
