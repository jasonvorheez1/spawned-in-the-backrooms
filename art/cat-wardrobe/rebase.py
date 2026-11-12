# Lock-in Nov 12 (Shelly #225428: "female characters' breasts are decent and male characters look male enough"): the cat bases reshaped as ONE field
# of rest position, so the body, its Head neck and every garment skinned to the same rig take the same move and still fit. Bones stay put.
# male: belly in, hips a touch narrower, shoulders out, upper arms thicker, flat chest plate, thicker neck, a trapezius slope.
# female: the Chest key rebuilt fuller and rounder (PG, ruling: "modest PG but a bit fuller than Tripo's"); cloth drapes from the peak.
# both: the crumpled tail root smoothed (body only).
# usage: blender -b --factory-startup --python art/cat-wardrobe/rebase.py -- <in.glb> <out.glb> <f|m> [cloth]
import bpy, bmesh, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT, SEX = a[0], a[1], a[2]; CLOTH = len(a) > 3
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
band = lambda v, a0, a1, b0, b1: sm((v - a0) / (a1 - a0)) * (1 - sm((v - b0) / (b1 - b0)))
def male(p):
    x, y, z = p; ax = abs(x); sx = 1 if x >= 0 else -1; d = Vector((0, 0, 0))
    torso = (1 - sm((ax - 0.15) / 0.05)) * (1 - sm((y - 0.02) / 0.03))     # the tail (behind y 0.02) is left alone
    # belly in: the front of the torso pulled toward the spine line, most at the navel
    wb = band(z, 0.33, 0.44, 0.47, 0.60) * torso
    if y < -0.085: d.y += (-0.085 - y) * 0.30 * wb
    # hips and waist a touch narrower (a V from the shoulders)
    wh = band(z, 0.36, 0.44, 0.50, 0.60) * torso
    d.x += -sx * ax * 0.07 * wh
    # shoulders out: torso side and shoulder cap, fading down the arm
    ws = band(z, 0.56, 0.64, 0.70, 0.75)
    d.x += sx * 0.020 * ws * sm((ax - 0.02) / 0.08) * (1 - sm((ax - 0.20) / 0.12))
    # lats: the side of the ribcage fills out under the arm
    wl = band(z, 0.50, 0.58, 0.62, 0.67) * torso
    d.x += sx * 0.010 * wl * sm((ax - 0.05) / 0.06)
    # flat chest plate: a broad low forward push, no lobes
    if y < -0.10: d.y += -0.008 * band(z, 0.57, 0.62, 0.65, 0.69) * (1 - sm((ax - 0.07) / 0.06))
    # upper arm and forearm thicker round the arm line (y -0.082, z 0.672); hands kept
    wa = band(ax, 0.12, 0.17, 0.36, 0.41) * sm((z - 0.58) / 0.03) * (1 - sm((abs(y + 0.082) - 0.07) / 0.03))
    if wa > 0: d.y += (y + 0.082) * 0.20 * wa; d.z += (z - 0.672) * 0.20 * wa
    # trapezius slope neck to shoulder
    d.z += 0.009 * sm((z - 0.685) / 0.03) * band(ax, 0.025, 0.05, 0.07, 0.11) * (1 - sm((z - 0.745) / 0.02))
    # neck thicker (the neck is the Head mesh's lower stalk), fading into the skull
    wn = band(z, 0.672, 0.69, 0.722, 0.75) * (1 - sm((math.hypot(x, y + 0.078) - 0.075) / 0.03))     # the stalk only: chin and snout stay
    if wn > 0: d.x += x * 0.34 * wn; d.y += (y + 0.078) * 0.26 * wn
    return d
CX, CZ, AMP, SXW, SUP, SDN = 0.046, 0.520, 0.050, 0.035, 0.050, 0.027
if CLOTH: AMP = 0.053
def lobe(p, s):
    dx = (p.x - s * CX) / SXW; dz = p.z - CZ; dz = dz / (SUP if dz > 0 else SDN)
    if CLOTH and dz < 0: dz *= 0.35
    return math.exp(-0.5 * (dx * dx + dz * dz))
def bust(p, n):
    if p.y > -0.045 or n.y > 0.25: return Vector((0, 0, 0))
    l, r = lobe(p, -1), lobe(p, 1); w = (l ** 3 + r ** 3) ** (1 / 3)
    if CLOTH and abs(p.x) < CX: w = max(w, math.exp(-0.5 * (((p.z - CZ) / (SUP if p.z > CZ else SDN * 2.6)) ** 2)) * 0.9)
    s = 1 if p.x > 0 else -1; lower = max(0.0, min(1.0, (CZ + 0.01 - p.z) / 0.03))
    off = Vector((s * 0.10 * AMP * w, -AMP * w, -0.18 * AMP * w * (0.5 + 0.5 * lower)))
    return off * min(1, max(0, (-n.y + 0.1) / 0.45))
arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
n = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    me = o.data; kb = me.shape_keys.key_blocks if me.shape_keys else None
    base = [v.co.copy() for v in me.vertices]; disp = [Vector((0, 0, 0)) for _ in base]
    if SEX == "m":
        for i, c in enumerate(base): disp[i] = male(o.matrix_world @ c)
    if not CLOTH and o.name == "Body" and arm:          # tail root: relax the crumple where the tail meets the back
        t1 = arm.matrix_world @ arm.data.bones["mixamorig:Tail1"].head_local
        cur = [base[i] + disp[i] for i in range(len(base))]
        key = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5))     # a .glb splits verts at seams: smooth welded clusters, or the seam tears open
        cl = {}; cid = []
        for i, c in enumerate(base): cid.append(cl.setdefault(key(c), len(cl)))
        nbr = {}
        for e in me.edges:
            u, v = cid[e.vertices[0]], cid[e.vertices[1]]
            if u != v: nbr.setdefault(u, set()).add(v); nbr.setdefault(v, set()).add(u)
        pos = {}
        for i, c in enumerate(cur): pos[cid[i]] = c
        rest = {}
        for i, c in enumerate(base): rest[cid[i]] = o.matrix_world @ c
        sel = [c for c in pos if (rest[c] - t1).length < 0.085]
        wt = {c: 1 - sm(((rest[c] - t1).length - 0.05) / 0.035) for c in sel}
        for _ in range(14):
            nxt = {c: pos[c].lerp(sum((pos[j] for j in nbr[c]), Vector()) / len(nbr[c]), 0.5 * wt[c]) for c in sel if nbr.get(c)}
            pos.update(nxt)
        for i in range(len(base)): disp[i] = pos[cid[i]] - base[i]
    mw3 = o.matrix_world.to_3x3().inverted()
    for i in range(len(base)): disp[i] = mw3 @ disp[i] if o.matrix_world != o.matrix_world.Identity(4) else disp[i]
    if kb:
        old = {k.name: [d.co.copy() for d in k.data] for k in kb}
        for k in kb:
            for i in range(len(base)): k.data[i].co = old[k.name][i] + disp[i]
        if SEX == "f" and "Chest" in kb:
            for i, v in enumerate(me.vertices): kb["Chest"].data[i].co = kb[0].data[i].co + bust(kb[0].data[i].co, v.normal)
    for i, v in enumerate(me.vertices): v.co = base[i] + disp[i]
    n += 1; print("REBASE", o.name, len(base), "max", round(max(d.length for d in disp), 4))
assert n
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
