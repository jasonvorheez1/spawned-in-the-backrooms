# Spamton rig: fits an armature to the standing mesh (/cdn/value.e9d5904...glb), weights it island by island,
# keys nine puppet clips sampled per frame, renders a proof sheet and exports /workspace/spamton/spamton_rigged.glb.
import bpy, bmesh, math, heapq, os, sys
from mathutils import Vector, Quaternion, Euler, Matrix
SRC = "/workspace/spamton/src.glb"; OUT = "/workspace/spamton/spamton_rigged.glb"; PROOF = "/tmp/spm/proof"
FPS = 30
os.makedirs(PROOF, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
body = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
for o in list(bpy.context.scene.objects):
    if o is not body: bpy.data.objects.remove(o, do_unlink=True)
body.name = "Spamton"; me = body.data
V = [v.co.copy() for v in me.vertices]

# ---------- islands ----------
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
vmat = [0] * len(V)
for f in bm.faces:
    for v in f.verts: vmat[v.index] = f.material_index
seen = set(); islands = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; comp = []; seen.add(v.index)
    while st:
        a = st.pop(); comp.append(a.index)
        for e in a.link_edges:
            o = e.other_vert(a)
            if o.index not in seen: seen.add(o.index); st.append(o)
    islands.append(comp)
adj = {}
for e in bm.edges:
    a, b = e.verts[0].index, e.verts[1].index; l = e.calc_length()
    adj.setdefault(a, []).append((b, l)); adj.setdefault(b, []).append((a, l))
def info(isl):
    cs = [V[i] for i in isl]
    lo = Vector([min(p[k] for p in cs) for k in range(3)]); hi = Vector([max(p[k] for p in cs) for k in range(3)])
    return sum(cs, Vector()) / len(cs), lo, hi
TORSO_AXIS = Vector((-0.17, -0.03))
cls = {}
for n, isl in enumerate(islands):
    c, lo, hi = info(isl); hd = (c.xy - TORSO_AXIS).length
    if hi.z < 0.6 and hd > 0.3 and len(isl) < 110: k = "hand"
    elif hi.z < 0.27: k = "leg" if len(isl) > 100 else "sole"
    elif hi.z < 0.6 and hd > 0.15: k = "arm"
    elif hi.z < 0.6: k = "torso"
    else: k = "head"
    cls[n] = k
def geo(isl, start):
    d = {start: 0.0}; pq = [(0.0, start)]; S = set(isl)
    while pq:
        dd, a = heapq.heappop(pq)
        if dd > d[a]: continue
        for b, l in adj.get(a, []):
            if b in S and dd + l < d.get(b, 1e9): d[b] = dd + l; heapq.heappush(pq, (dd + l, b))
    return d
def at(isl, d, t0, t1):
    m = max(d.values()); pts = [V[i] for i in isl if t0 <= d[i] / m <= t1]
    return sum(pts, Vector()) / len(pts)
torso_pts = [V[i] for n in cls if cls[n] == "torso" and vmat[islands[n][0]] == 1 for i in islands[n]]
tc = sum(torso_pts, Vector()) / len(torso_pts); tz0 = min(p.z for p in torso_pts); tz1 = max(p.z for p in torso_pts)
LEFT = Vector((1, -1, 0)).normalized()   # his left: the torso faces (-x,-y)
chains = {}   # side -> joints
for kind in ("arm", "leg"):
    big = [n for n in cls if cls[n] == kind and vmat[islands[n][0]] == 1]
    for n in big:
        isl = islands[n]; c = info(isl)[0]; side = "L" if (c - tc).dot(LEFT) > 0 else "R"
        if kind == "arm": start = min(isl, key=lambda i: (V[i] - Vector((tc.x, tc.y, 0.48))).length)
        else: start = max(isl, key=lambda i: V[i].z)
        d = geo(isl, start)
        if kind == "arm": J = [at(isl, d, 0, .06), at(isl, d, .45, .55), at(isl, d, .93, 1)]
        else: J = [at(isl, d, 0, .05), at(isl, d, .42, .5), at(isl, d, .7, .76), at(isl, d, .96, 1)]
        chains[(kind, side)] = J; print("CHAIN", kind, side, [tuple(round(x, 3) for x in j) for j in J])
hands = {}
for n in cls:
    if cls[n] == "hand" and vmat[islands[n][0]] == 1:
        c = info(islands[n])[0]; side = "L" if (c - tc).dot(LEFT) > 0 else "R"
        w = chains[("arm", side)][2]; far = max(islands[n], key=lambda i: (V[i] - w).length)
        hands[side] = V[far]
head_pts = [V[i] for n in cls if cls[n] == "head" for i in islands[n]]
hc = sum(head_pts, Vector()) / len(head_pts)
hb = [p for p in head_pts if p.z < 0.6]; head_base = sum(hb, Vector()) / len(hb)
print("TORSO", tuple(round(x, 3) for x in tc), round(tz0, 3), round(tz1, 3), "HEADC", tuple(round(x, 3) for x in hc), "BASE", tuple(round(x, 3) for x in head_base))

# ---------- armature ----------
arm = bpy.data.armatures.new("SpamtonRig"); rig = bpy.data.objects.new("SpamtonRig", arm)
bpy.context.scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
EB = arm.edit_bones
def mk(name, h, t, parent=None, conn=False):
    b = EB.new(name); b.head = h; b.tail = t
    if parent: b.parent = EB[parent]; b.use_connect = conn
    return b
hipZ = max(chains[("leg", s)][0].z for s in "LR") - 0.01
P = lambda z: Vector((tc.x, tc.y, z))
mk("Hips", P(hipZ), P(0.32)); mk("Spine", P(0.32), P(0.42), "Hips", True); mk("Chest", P(0.42), P(tz1 - 0.04), "Spine", True)
mk("Neck", P(tz1 - 0.04), head_base, "Chest", True)
mk("Head", head_base, head_base + (hc - head_base).normalized() * 0.5, "Neck", True)
for s in "LR":
    A = chains[("arm", s)]; L = chains[("leg", s)]
    mk(f"Shoulder.{s}", P(tz1 - 0.08), A[0], "Chest")
    mk(f"UpperArm.{s}", A[0], A[1], f"Shoulder.{s}", True); mk(f"ForeArm.{s}", A[1], A[2], f"UpperArm.{s}", True)
    mk(f"Hand.{s}", A[2], hands[s], f"ForeArm.{s}", True)
    mk(f"Thigh.{s}", L[0], L[1], "Hips"); mk(f"Shin.{s}", L[1], L[2], f"Thigh.{s}", True); mk(f"Foot.{s}", L[2], L[3], f"Shin.{s}", True)
bpy.ops.object.mode_set(mode="OBJECT")
REST = {b.name: b.matrix_local.copy() for b in arm.bones}

# ---------- weights ----------
def sm(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def chain_s(p, J):
    best = (1e9, 0); acc = 0
    for k in range(len(J) - 1):
        a, b = J[k], J[k + 1]; ab = b - a; L = ab.length; t = max(0, min(1, (p - a).dot(ab) / (L * L)))
        dist = (a + ab * t - p).length
        if dist < best[0]: best = (dist, acc + t * L)
        acc += L
    return best[1]
def chain_w(s, J, names, r=0.03):
    Ls = [0]; 
    for k in range(len(J) - 1): Ls.append(Ls[-1] + (J[k + 1] - J[k]).length)
    w = {}
    for i, nm in enumerate(names):
        a = 1.0 if i == 0 else sm(Ls[i] - r, Ls[i] + r, s)
        b = 0.0 if i == len(names) - 1 else sm(Ls[i + 1] - r, Ls[i + 1] + r, s)
        w[nm] = max(0, a - b)
    return w
groups = {b.name: body.vertex_groups.new(name=b.name) for b in arm.bones}
def side_of(isl):
    c = info(isl)[0]; return "L" if (c - tc).dot(LEFT) > 0 else "R"
for n, isl in enumerate(islands):
    k = cls[n]
    for i in isl:
        p = V[i]
        if k == "head": w = {"Head": sm(head_base.z - 0.03, head_base.z + 0.05, p.z)}; w["Neck"] = 1 - w["Head"]
        elif k == "hand": w = {f"Hand.{side_of(isl)}": 1}
        elif k == "sole": s = min("LR", key=lambda s: (chains[("leg", s)][3] - info(isl)[0]).length); w = {f"Foot.{s}": 1}
        elif k == "torso":
            w = {"Hips": 1 - sm(0.29, 0.35, p.z), "Chest": sm(0.40, 0.46, p.z)}; w["Spine"] = max(0, 1 - w["Hips"] - w["Chest"])
        elif k == "arm":
            s = side_of(isl); J = chains[("arm", s)]; w = chain_w(chain_s(p, J), J, [f"UpperArm.{s}", f"ForeArm.{s}"])
        else:
            s = side_of(isl); J = chains[("leg", s)]; w = chain_w(chain_s(p, J), J, [f"Thigh.{s}", f"Shin.{s}", f"Foot.{s}"], 0.02)
        for nm, x in w.items():
            if x > 1e-3: groups[nm].add([i], x, "REPLACE")
body.parent = rig; mod = body.modifiers.new("skin", "ARMATURE"); mod.object = rig

# ---------- clips ----------
def q_from(bname, rot=(0, 0, 0), aim=None):
    q = Euler([math.radians(a) for a in rot], "XYZ").to_quaternion()
    R = REST[bname].to_quaternion()
    if aim is not None:
        rd = (REST[bname].to_3x3() @ Vector((0, 1, 0))).normalized()
        q = q @ rd.rotation_difference(Vector(aim).normalized())
    return R.inverted() @ q @ R
def ob(f, f0, a, b, d=3, s=1.9):      # snap a->b at f0 over d frames with overshoot
    if f <= f0: return a
    if f >= f0 + d: return b
    t = (f - f0) / d - 1; e = 1 + (s + 1) * t ** 3 + s * t ** 2
    return a + (b - a) * e
def tr(f, amp, per=2): return amp if (int(f) // per) % 2 == 0 else -amp
def S(f, T, k=1, ph=0): return math.sin(2 * math.pi * k * f / T + ph)
def dangle(f, T, P, amp=0.15):
    P["UpperArm.L"] = {"aim": (0.3 + amp * S(f, T), -0.1 + 0.08 * S(f, T, 1, 1.4), -1)}
    P["UpperArm.R"] = {"aim": (-0.3 + amp * S(f, T, 1, 1.1), -0.1 + 0.08 * S(f, T, 1, 2.6), -1)}
    P["ForeArm.L"] = {"rot": (10 + 8 * S(f, T, 1, 0.9), 0, 0)}; P["ForeArm.R"] = {"rot": (10 + 8 * S(f, T, 1, 2.0), 0, 0)}
    P["Hand.L"] = {"rot": (0, 12 * S(f, T, 1, 1.8), 0)}; P["Hand.R"] = {"rot": (0, -12 * S(f, T, 1, 2.9), 0)}
def legs_dangle(f, T, P, amp=6):
    for s, ph in (("L", 0), ("R", 1.7)):
        P[f"Thigh.{s}"] = {"rot": (amp * S(f, T, 1, ph), 0, 0)}; P[f"Shin.{s}"] = {"rot": (-amp * 1.3 * S(f, T, 1, ph + .8), 0, 0)}
        P[f"Foot.{s}"] = {"rot": (amp * S(f, T, 1, ph + 1.6), 0, 0)}
def idle(f, T=48):
    P = {"Hips": {"loc": (0, 0, 0.02 * S(f, T, 2)), "rot": (2 * S(f, T, 1, .5), 0, 0)}, "Chest": {"rot": (0, 0, 5 * S(f, T))}}
    P["Head"] = {"rot": (ob(f, 30, 0, 6) + ob(f, 42, 0, -6), ob(f, 10, 0, -22) + ob(f, 30, 0, 22), ob(f, 10, 0, 8) + ob(f, 30, 0, -8))}
    dangle(f, T, P); legs_dangle(f, T, P); return P
def talk(f, T=42):
    P = {"Hips": {"loc": (0, 0, 0.012 * S(f, T, 3)), "rot": (0, 0, 0)}, "Chest": {"rot": (4 * S(f, T, 3), 0, 6 * S(f, T, 1))}}
    beat = [0, 7, 14, 21, 28, 35]; nod = 0
    for i, b in enumerate(beat): nod += ob(f, b, 0, 12 if i % 2 == 0 else -12, 2)
    P["Head"] = {"rot": (nod, 10 * S(f, T, 1), 0)}; P["Neck"] = {"rot": (nod * 0.3, 0, 0)}
    dangle(f, T, P)
    pump = 0
    for i, b in enumerate([3, 10, 17, 24, 31, 38]): pump += ob(f, b, 0, 1 if i % 2 == 0 else -1, 2)
    P["UpperArm.R"] = {"aim": (-0.6, -0.8, 0.05 + 0.35 * pump)}; P["ForeArm.R"] = {"rot": (-45 - 25 * pump, 0, -20)}
    P["Hand.R"] = {"rot": (0, 25 * pump, 15 * S(f, T, 2))}; legs_dangle(f, T, P, 3); return P
def laugh(f, T=36):
    P = {"Hips": {"loc": (0, 0, 0.015 * abs(S(f, T, 3))), "rot": (-4, 0, 0)}}
    P["Spine"] = {"rot": (-8, 0, 0)}; P["Chest"] = {"rot": (-12 + tr(f, 3), tr(f, 2, 3), 0)}
    P["Head"] = {"rot": (-38 + tr(f, 5), 6 * S(f, T, 2), 0)}
    for s, sg in (("L", 1), ("R", -1)):
        P[f"Shoulder.{s}"] = {"rot": (0, tr(f, 9) * sg, 0)}
        P[f"UpperArm.{s}"] = {"aim": (sg * 0.9, -0.2, -0.2 + 0.6 * S(f, 12, 1, 0 if s == "L" else math.pi))}
        P[f"ForeArm.{s}"] = {"rot": (-30 + 25 * S(f, 12, 1, 1 if s == "L" else 4), 0, 0)}
        P[f"Hand.{s}"] = {"rot": (0, 30 * S(f, 12, 1, 2), 0)}
    legs_dangle(f, 12, P, 8); return P
def throw(f, T=18):
    tw = ob(f, 0, 0, -28, 5, 1.2); tw = ob(f, 6, tw, 32, 3, 2.2) if f > 6 else tw; tw = ob(f, 11, tw, 0, 7, 0.6) if f > 11 else tw
    lean = ob(f, 0, 0, -8, 5); lean = ob(f, 6, lean, 14, 3) if f > 6 else lean; lean = ob(f, 11, lean, 0, 7, .6) if f > 11 else lean
    P = {"Hips": {"loc": (0, 0, 0), "rot": (lean * .4, 0, tw * .3)}, "Spine": {"rot": (lean * .4, 0, tw * .35)}, "Chest": {"rot": (lean * .4, 0, tw * .4)}}
    P["Head"] = {"rot": (-lean * .6, 0, -tw * .5)}
    up = (-0.25, 0.7, 1.0); fw = (-0.15, -1.0, -0.15); rest = (-0.3, -0.1, -1)
    def lerpv(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
    if f <= 5: a = lerpv(rest, up, ob(f, 0, 0, 1, 5, 1.2)); fa = ob(f, 0, 10, -95, 5, 1.2)
    elif f <= 11: a = lerpv(up, fw, ob(f, 6, 0, 1, 3, 2.4)); fa = ob(f, 6, -95, 5, 3, 2.4)
    else: a = lerpv(fw, rest, ob(f, 11, 0, 1, 7, .6)); fa = ob(f, 11, 5, 10, 7)
    P["UpperArm.R"] = {"aim": a}; P["ForeArm.R"] = {"rot": (fa, 0, 0)}
    P["Hand.R"] = {"rot": (ob(f, 6, -30, 40, 3) if f < 12 else ob(f, 11, 40, 0, 7), 0, 0)}
    la = lerpv((0.3, -0.1, -1), (0.6, 0.6, -0.6), ob(f, 6, 0, 1, 3)) if f < 12 else lerpv((0.6, 0.6, -0.6), (0.3, -0.1, -1), ob(f, 11, 0, 1, 7))
    P["UpperArm.L"] = {"aim": la}; P["ForeArm.L"] = {"rot": (15, 0, 0)}
    legs_dangle(f, T, P, 5); return P
def vacuum(f, T=30):
    P = {"Hips": {"loc": (0, 0.02, 0.01 * tr(f, 1)), "rot": (-6, 0, 0)}, "Spine": {"rot": (-10, 0, 0)}, "Chest": {"rot": (-14 + tr(f, 1.5), 0, tr(f, 2, 1))}}
    P["Head"] = {"rot": (-28 + tr(f, 2, 1), tr(f, 3, 2), 0)}
    for s, sg in (("L", 1), ("R", -1)):
        P[f"UpperArm.{s}"] = {"aim": (sg, 0.1, 0.25 + 0.03 * tr(f, 1)), "rot": (tr(f, 2), 0, 0)}
        P[f"ForeArm.{s}"] = {"rot": (tr(f, 4, 1), 0, -sg * 10)}; P[f"Hand.{s}"] = {"rot": (0, sg * 20 + tr(f, 6), 0)}
    legs_dangle(f, T, P, 3); return P
def charge(f, T=24):
    P = {"Hips": {"loc": (0, 0, 0.008 * tr(f, 1)), "rot": (0, 0, 0)}, "Chest": {"rot": (-6 + tr(f, 1.5), tr(f, 1.5, 1), 0)}}
    P["Head"] = {"rot": (-12 + tr(f, 2), tr(f, 3, 2), 0)}
    for s, sg in (("L", 1), ("R", -1)):
        P[f"UpperArm.{s}"] = {"aim": (sg * 0.28, 0.05, 1), "rot": (tr(f, 3), tr(f, 2, 1), 0)}
        P[f"ForeArm.{s}"] = {"rot": (tr(f, 4, 1), 0, 0)}; P[f"Hand.{s}"] = {"rot": (0, tr(f, 8), 0)}
    legs_dangle(f, T, P, 2); return P
def hurt(f, T=12):
    k = ob(f, 0, 0, 1, 2, 2.5); k = ob(f, 5, k, 0, 7, 1.4) if f > 5 else k
    P = {"Hips": {"loc": (0, 0.06 * k, 0.03 * k), "rot": (-10 * k, 0, 0)}, "Spine": {"rot": (-12 * k, 0, 0)}, "Chest": {"rot": (-12 * k, 0, 0)}}
    P["Head"] = {"rot": (-35 * k, 18 * k, -10 * k)}
    dangle(0, 48, P)
    for s, sg in (("L", 1), ("R", -1)):
        b = P[f"UpperArm.{s}"]["aim"]; P[f"UpperArm.{s}"] = {"aim": (b[0] + sg * 0.5 * k, b[1] - 0.9 * k, b[2] + 0.4 * k)}
    legs_dangle(0, 48, P); P["Thigh.L"] = {"rot": (-25 * k, 0, 0)}; P["Thigh.R"] = {"rot": (-15 * k, 0, 0)}; return P
def defeated(f, T=45):
    d = ob(f, 4, 0, 1, 8, 1.0); s2 = ob(f, 18, 0, 1, 27, 0)
    P = {"Hips": {"loc": (0, -0.03 * d, -0.11 * d - 0.03 * s2), "rot": (6 * d, 0, 4 * d)}}
    P["Spine"] = {"rot": (8 * d + 4 * s2, 0, 0)}; P["Chest"] = {"rot": (8 * d + 5 * s2, 0, 4 * d)}
    P["Neck"] = {"rot": (12 * d, 0, 0)}; P["Head"] = {"rot": (22 * d + 6 * s2, 18 * d, 0)}
    for s, sg in (("L", 1), ("R", -1)):
        P[f"Shoulder.{s}"] = {"rot": (0, -sg * 8 * d, 0)}
        P[f"UpperArm.{s}"] = {"aim": (sg * (0.3 - 0.15 * d), -0.1 - 0.25 * d, -1)}
        P[f"ForeArm.{s}"] = {"rot": (10 + 15 * d, 0, 0)}; P[f"Hand.{s}"] = {"rot": (20 * d, 0, 0)}
        P[f"Thigh.{s}"] = {"rot": (-55 * d, 0, sg * 10 * d)}; P[f"Shin.{s}"] = {"rot": (85 * d, 0, 0)}; P[f"Foot.{s}"] = {"rot": (-20 * d, 0, 0)}
    return P
def spared(f, T=30):
    h = abs(math.sin(math.pi * 2 * f / T)); land = 1 - h
    P = {"Hips": {"loc": (0, 0, 0.07 * h ** 0.7), "rot": (0, 0, 0)}, "Chest": {"rot": (-4 * h, 0, 0)}}
    P["Head"] = {"rot": (-8, 12 * (1 if f < T / 2 else -1) if 2 < f % 15 < 13 else 0, 0)}
    for s, sg in (("L", 1), ("R", -1)):
        P[f"UpperArm.{s}"] = {"aim": (sg * (0.45 + 0.15 * h), -0.1, 1)}; P[f"ForeArm.{s}"] = {"rot": (-15 * h, 0, sg * 15 * S(f, T, 4))}
        P[f"Hand.{s}"] = {"rot": (0, sg * 25 * S(f, T, 4), 0)}
        P[f"Thigh.{s}"] = {"rot": (-20 * h, 0, 0)}; P[f"Shin.{s}"] = {"rot": (35 * h, 0, 0)}; P[f"Foot.{s}"] = {"rot": (-10 * land, 0, 0)}
    return P
CLIPS = [("idle", idle, 48), ("talk", talk, 42), ("laugh", laugh, 36), ("throw", throw, 18), ("vacuum", vacuum, 30),
         ("charge", charge, 24), ("hurt", hurt, 12), ("defeated", defeated, 45), ("spared", spared, 30)]
def apply(P):
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"; pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    for nm, spec in P.items():
        pb = rig.pose.bones[nm]
        pb.rotation_quaternion = q_from(nm, spec.get("rot", (0, 0, 0)), spec.get("aim"))
        if "loc" in spec: pb.location = REST[nm].to_3x3().inverted() @ Vector(spec["loc"])
bpy.context.scene.render.fps = FPS
rig.animation_data_create(); acts = {}
for name, fn, T in CLIPS:
    act = bpy.data.actions.new(name); act.use_fake_user = True; rig.animation_data.action = act; prev = {}
    for f in range(T + 1):
        apply(fn(f if f < T or name in ("throw", "hurt", "defeated") else 0))
        for pb in rig.pose.bones:
            q = pb.rotation_quaternion.copy()
            if pb.name in prev and prev[pb.name].dot(q) < 0: q.negate(); pb.rotation_quaternion = q
            prev[pb.name] = q
            pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
    acts[name] = act
    tr_ = rig.animation_data.nla_tracks.new(); tr_.name = name; st = tr_.strips.new(name, 0, act); tr_.mute = True
    rig.animation_data.action = None
apply({})

# ---------- proof ----------
sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.color_type = "TEXTURE"; sc.display.shading.light = "STUDIO"
sc.render.resolution_x = sc.render.resolution_y = 400
cams = []
for nm, pos in (("front", (0, -3.4, 0.75)), ("q34", (-2.4, -2.4, 0.9))):
    cd = bpy.data.cameras.new(nm); cd.lens = 60; cam = bpy.data.objects.new(nm, cd); sc.collection.objects.link(cam)
    cam.location = pos; cam.rotation_euler = (Vector((0, 0, 0.62)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler(); cams.append(cam)
shots = [("rest", None, 0)] + [(n, fn, T * 0.5 if n not in ("throw", "defeated", "hurt") else {"throw": 7, "defeated": 45, "hurt": 2}[n]) for n, fn, T in CLIPS]
if "--extra" in sys.argv: shots += [("throw4", throw, 4), ("idle20", idle, 20)]
for n, fn, f in shots:
    apply(fn(f) if fn else {}); bpy.context.view_layer.update()
    for cam in cams:
        sc.camera = cam; sc.render.filepath = f"{PROOF}/{n}_{cam.name}.png"; bpy.ops.render.render(write_still=True)
apply({})

# ---------- export ----------
bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
                          export_force_sampling=True, export_optimize_animation_size=False, export_apply=False, export_skins=True)
dg = bpy.context.evaluated_depsgraph_get(); print("TRIS", len(body.evaluated_get(dg).data.loop_triangles))
