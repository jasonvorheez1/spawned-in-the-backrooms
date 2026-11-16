# Nov 16 (Shelly #443717+: "breasts look droopy too. im aiming for cuter mesh shaping, including base snout shape").
# One rest-space field, run on the bases AND every garment/hair/fluff/ear piece so they keep fitting:
#  snout: to Shelly's guide: shorter (55%), thinner (86%), a little taller (110%), the nose tip kept (both sexes)
#  hips: soft flare over the hip bones · paws: four chunky round toes per foot (Shelly's leg guide)
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
SC, SR = Vector((0, -0.150, 0.795)), 0.16    # the muzzle's root inside the face, and how far the shaping reaches
# Shelly's guide (#444xxx, /cdn/image-u9vdp1gha.webp, u96gn3d2w): a SMALL snout is short and thin with a little height, the nose tip kept
SX, SY, SZ = 0.86, 0.74, 1.04                 # width, length, height of the muzzle about its root
def snout(p):
    v = p - SC
    if v.y > 0.005: return Vector()
    side = math.hypot(v.x / 0.10, (v.z) / 0.085)
    if side >= 1.25: return Vector()
    w = sm((-v.y) / 0.05) * (1 - sm((side - 0.7) / 0.55))   # the muzzle only: full past 5 cm forward, fading into cheeks and brow
    return Vector((v.x * (SX - 1), v.y * (SY - 1), v.z * (SZ - 1))) * w
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
# hips (#444068 follow-up): a soft round flare over the hip bones, front and sides only (the tail behind stays put)
HZ, HW = 0.31, 0.085   # Nov 16 #thighs: wider and gentler, the narrow 2 cm ridge read as a pointy thigh corner
def hips(p):
    if p.y > 0.03 or abs(p.x) < 0.07: return Vector()
    w = math.exp(-0.5 * ((p.z - HZ) / HW) ** 2) * sm((abs(p.x) - 0.07) / 0.06)
    return Vector((math.copysign(0.011 * w, p.x), -0.004 * w, 0))
# paws, to Shelly's leg guide (/cdn/image-u7rr5gfc4.webp): an oval foot front split in four chunky round toes that pop out
FX, FY, FZ = 0.106, -0.132, 0.036
TOES = [(-0.036, 0.004), (-0.012, 0.0), (0.012, 0.0), (0.036, 0.004)]   # x offset, how far back each toe sits
def paws(p, nrm):
    return Vector()   # off: the base foot already has the guide's four round toes; this sculpt faceted and tore the right foot (cmp11)
    if p.z > 0.085 or p.y > -0.06: return Vector()
    fx = FX if p.x > 0 else -FX; lx = p.x - fx; d = Vector()
    for ox, oy in TOES:
        r2 = ((lx - math.copysign(ox, fx)) / 0.010) ** 2 + ((p.y - FY - oy) / 0.028) ** 2 + ((p.z - FZ) / 0.030) ** 2
        d += (nrm * 0.011 + Vector((0, -0.004, 0))) * math.exp(-0.5 * r2)
    for gx in (-0.024, 0.0, 0.024):
        r2 = ((lx - gx) / 0.0035) ** 2 + ((p.y - FY) / 0.03) ** 2 + ((p.z - FZ - 0.004) / 0.028) ** 2
        d -= nrm * 0.006 * math.exp(-0.5 * r2)
    return d * sm((-0.06 - p.y) / 0.03)
n = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    me = o.data; kb = me.shape_keys.key_blocks if me.shape_keys else None
    mw = o.matrix_world; inv = mw.to_3x3().inverted()
    base = [v.co.copy() for v in me.vertices]
    nw = mw.to_3x3()
    disp = [inv @ (snout(mw @ c) + hips(mw @ c) + paws(mw @ c, (nw @ me.vertices[i].normal).normalized())) for i, c in enumerate(base)]
    if o.name != "Head" and not CLOTH:   # thighs: relax the outer hip/thigh corner so it reads as one round curve, no point
        key = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5)); cl = {}; cid = [cl.setdefault(key(c), len(cl)) for c in base]
        nbr = {}
        for e in me.edges:
            u, v2 = cid[e.vertices[0]], cid[e.vertices[1]]
            if u != v2: nbr.setdefault(u, set()).add(v2); nbr.setdefault(v2, set()).add(u)
        pos = {}; wt = {}
        for i, c in enumerate(base):
            q = mw @ c; t = math.exp(-0.5 * ((q.z - 0.30) / 0.075) ** 2) * sm((abs(q.x) - 0.05) / 0.05)
            pos[cid[i]] = c + disp[i]; wt[cid[i]] = max(wt.get(cid[i], 0), t)
        sel = [c for c in pos if wt[c] > 0.02 and nbr.get(c)]
        for _ in range(8):
            avg = {c: sum((pos[j] for j in nbr[c]), Vector()) / len(nbr[c]) for c in sel}
            pos.update({c: pos[c].lerp(avg[c], 0.5 * wt[c]) for c in sel})
            avg = {c: sum((pos[j] for j in nbr[c]), Vector()) / len(nbr[c]) for c in sel}
            pos.update({c: pos[c].lerp(avg[c], -0.53 * wt[c]) for c in sel})   # Taubin: rounds without shrinking the thigh
        for i in range(len(base)): disp[i] = pos[cid[i]] - base[i]
    if o.name == "Head":
        key = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5)); cl = {}; cid = [cl.setdefault(key(c), len(cl)) for c in base]
        nbr = {}
        for e in me.edges:
            u, v2 = cid[e.vertices[0]], cid[e.vertices[1]]
            if u != v2: nbr.setdefault(u, set()).add(v2); nbr.setdefault(v2, set()).add(u)
        pos = {}; wt = {}
        for i, c in enumerate(base):
            pos[cid[i]] = c + disp[i]; q = ((mw @ c) - SC).length / (SR * 1.2); wt[cid[i]] = max(wt.get(cid[i], 0), 1 - sm(q))
        sel = [c for c in pos if wt[c] > 0 and nbr.get(c)]
        for _ in range(5):
            pos.update({c: pos[c].lerp(sum((pos[j] for j in nbr[c]), Vector()) / len(nbr[c]), 0.35 * wt[c]) for c in sel})
        for i in range(len(base)): disp[i] = pos[cid[i]] - base[i]
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
