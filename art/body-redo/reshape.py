# body redo (Shelly Nov 10 #177511): your smooth base, thickened around its own bones: no bone moves, no new geometry
import bpy, sys, json, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--')+1:]; src, dst, sex = args[0], args[1], args[2]
# k = cross-section scale along each bone, [at head, at tail]; picked against the refs (Anime Girl / Miyu, Zhongli)
K = {
 'f': {'LeftShoulder': (1.03, 1.07), 'LeftUpLeg': (1.14, 1.13), 'LeftLeg': (1.11, 1.0), 'Hips': (1.06, 1.06), 'Spine': (1.04, 1.0), 'LeftArm': (1.12, 1.06), 'LeftForeArm': (1.05, 1.0)},
 'm': {'LeftUpLeg': (1.18, 1.12), 'LeftLeg': (1.14, 1.04), 'Hips': (1.06, 1.08), 'Spine': (1.02, 1.06), 'Spine1': (1.08, 1.16), 'Spine2': (1.2, 1.2), 'LeftShoulder': (1.12, 1.18), 'LeftArm': (1.3, 1.16), 'LeftForeArm': (1.16, 1.06), 'Neck': (1.12, 1.05)},
}[sex]
# Shelly #178124 + "still look off": no deltoid and a tall trapezius ramp read as a coat hanger. a cap on the arm, the ramp lowered
DELT, TRAP = {'f': 0.22, 'm': 0.4}[sex], {'f': 0.006, 'm': 0.016}[sex]
for n in list(K):
    if n.startswith('Left'): K['Right' + n[4:]] = K[n]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bones = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in arm.data.bones}
def disp(p, b):
    h, t = bones[b]; ax = t - h; L = ax.length
    if L < 1e-6: return Vector()
    u = ax / L; s = max(0.0, min(1.0, (p - h).dot(u) / L))
    k0, k1 = K[b]; k = k0 + (k1 - k0) * s
    if b.endswith('Arm') and not b.endswith('ForeArm'): k += DELT * math.exp(-((s - 0.16) / 0.14) ** 2)  # the deltoid: a round cap just under the joint, not a tube
    foot = h + u * (s * L); r = p - foot
    if b in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'): r.z = 0; r.y *= 0.35  # trunk: widen across, barely deeper (no belly), never up
    return r * (k - 1)
# shoulders: the whole arm slides outward (bones and skin together), the shoulder bone stretches to meet it
SHIFT = {'f': 0.0, 'm': 0.0}[sex]  # the 4 cm arm slide stretched the trap into a coat-hanger ramp (Shelly 'do you know what a shoulder is'); breadth comes from the deltoid now
ARMB = lambda nm: nm and any(nm.startswith(sd + k) for sd in ('Left', 'Right') for k in ('Arm', 'ForeArm', 'Hand'))
def arm_w(nm, w): return w if ARMB(nm) else (0.5 * w if nm in ('LeftShoulder', 'RightShoulder') else 0)
# one move field over the welded surface: split verts (uv seams, part borders) share one key, so nothing tears (Nov 10)
ALL = [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups]
SKIN = lambda o: o.name == 'Body' or o.name.startswith('Skin_')
objs = [o for o in ALL if SKIN(o)]   # the field lives on the skin alone; head and garments take it from the nearest skin point
key = lambda p: (round(p.x, 3), round(p.y, 3), round(p.z, 3))  # 1 mm weld
KD, KN, KADJ, per, KP, KS = {}, {}, {}, [], {}, {}
for o in objs:
    gi = {g.index: g.name for g in o.vertex_groups}; mw = o.matrix_world; ks = []
    for v in o.data.vertices:
        p = mw @ v.co; d = Vector()
        for g in v.groups:
            nm = gi.get(g.group)
            if g.weight <= 0: continue
            if nm in K: d += disp(p, nm) * g.weight
            if SHIFT: d.x += (1 if p.x > 0 else -1) * SHIFT * arm_w(nm, g.weight)
            if nm in ('LeftShoulder', 'RightShoulder'):
                h, t = bones[nm]
                if p.z > h.z: d.z -= TRAP * g.weight * min(1, (p.z - h.z) / 0.04)  # the top of the shoulder sits lower, the neck reads longer
        sw = sum(g.weight for g in v.groups if (gi.get(g.group) or '').endswith(('Shoulder', 'Arm', 'ForeArm')))
        k = key(p); KP[k] = p; KS[k] = max(KS.get(k, 0), sw); ks.append(k); KD[k] = KD.get(k, Vector()) + d; KN[k] = KN.get(k, 0) + 1; KADJ.setdefault(k, set())
    for e in o.data.edges:
        i, j = e.vertices; KADJ[ks[i]].add(ks[j]); KADJ[ks[j]].add(ks[i])
    per.append((o, ks))
D = {k: KD[k] / KN[k] for k in KD}
for _ in range(10):
    D = {k: D[k] * 0.4 + sum((D[j] for j in KADJ[k]), Vector()) * (0.6 / len(KADJ[k])) if KADJ[k] else D[k] for k in D}
# iron the shoulder/arm surface: the base's facets and the armpit pinch read blocky in T-pose (Shelly #177961, Nov 10)
P = {k: KP[k] + D[k] for k in D}
for _ in range(3):
    P = {k: (P[k] * (1 - 0.25 * min(1, KS[k])) + (sum((P[j] for j in KADJ[k]), Vector()) / len(KADJ[k])) * 0.25 * min(1, KS[k])) if KADJ[k] and KS[k] > 0.05 else P[k] for k in P}
D = {k: P[k] - KP[k] for k in P}
from mathutils.kdtree import KDTree
kl = list(D); kdt = KDTree(len(kl))
for i, k in enumerate(kl): kdt.insert(KP[k], i)
kdt.balance()
for o in ALL:
    if SKIN(o): continue
    mw = o.matrix_world; ks = []
    for v in o.data.vertices:
        p = mw @ v.co; near = kdt.find_n(p, 6)
        w = [1 / max(.003, d) ** 2 for _, _, d in near]; dd = sum((D[kl[i]] * wi for (_, i, _), wi in zip(near, w)), Vector()) / sum(w)
        if o.name == 'Head' or o.name.startswith(('Eye', 'Beard', 'Blush', 'Hair', 'Brow', 'Lash')): dd = sum((D[kl[i]] * wi for (_, i, _), wi in zip(kdt.find_n(KP[kl[kdt.find(Vector((0, p.y, 1.29)))[1]]], 1), [1])), Vector())  # rigid: the whole head rides the neck's move
        k = ('g', o.name, v.index); D[k] = dd; ks.append(k)
    per.append((o, ks))
n = 0
for o, ks in per:
    inv = o.matrix_world.inverted().to_3x3()
    ds = [inv @ D[k] for k in ks]
    sk = o.data.shape_keys
    if sk:
        for kb in sk.key_blocks:
            for i, d in enumerate(ds): kb.data[i].co += d
    for i, d in enumerate(ds): o.data.vertices[i].co += d
    o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
    n += 1
if SHIFT:
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        sg = 1 if eb.head.x > 0 else -1
        if ARMB(eb.name) or any(eb.name.startswith(sd) and ('Hand' in eb.name or 'Thumb' in eb.name or 'Index' in eb.name or 'Middle' in eb.name or 'Ring' in eb.name or 'Pinky' in eb.name) for sd in ('Left','Right')):
            eb.head.x += sg * SHIFT; eb.tail.x += sg * SHIFT
        elif eb.name in ('LeftShoulder', 'RightShoulder'): eb.tail.x += sg * SHIFT
    bpy.ops.object.mode_set(mode='OBJECT')
print('RESHAPED', n, 'meshes')
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_morph=True, export_skins=True)
