# Snout and ear types for the new cat (Shelly: "different snout types", "different ear types too", as a Japanese cartoonist would draw them).
# Shape keys on the Head mesh, chosen by look.snout / look.ears (scripts/lib/cat-wardrobe.js morphOf). Default (no key) = the button snout, upright ears.
# Snout keys move ONLY along the face axis (Blender -Y = glTF +z) so the painted face stays registered; ear keys move only the ears, outside the face paint.
# run: blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/head-keys.py -- f|m [--proof]
import bpy, sys, math, numpy as np
from mathutils import Vector, Matrix
W = [a for a in sys.argv if a in ("f", "m")][-1]; PROOF = "--proof" in sys.argv
SRC = f"/workspace/cathead/{W}-anime.glb"; OUT = f"/workspace/cathead/{W}-keys.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
H = bpy.data.objects["Head"]; M = H.matrix_world; Mi = M.inverted()
V = np.array([M @ v.co for v in H.data.vertices]); x, y, z = V[:, 0], V[:, 1], V[:, 2]
mid = V[np.abs(x) < 0.015]
low = mid[mid[:, 2] < z.min() + 0.5 * (z.max() - z.min())]
zp = low[np.argmin(low[:, 1]), 2]; z0 = z.min(); S = (zp - z0) / 0.17
crown = mid[:, 2].max()
g = lambda d, s: np.exp(-(d / s) ** 2)
front = np.clip((-y - 0.04) / 0.06, 0, 1)
# ears: what rises past the crown line out at the sides; the base is where an ear leaves the skull
ear = np.clip((z - (crown - 0.07 * S)) / (0.06 * S), 0, 1) * np.clip((np.abs(x) - 0.11 * S) / (0.05 * S), 0, 1)
E = ear > 0
base_z = np.percentile(z[E], 8); print("EARS", W, int(E.sum()), "base", round(base_z, 3), "crown", round(crown, 3), "S", round(S, 3))
def centre(sx):
    m = E & (np.sign(x) == sx); return Vector((x[m].mean(), y[m].mean(), base_z))
C = {1: centre(1), -1: centre(-1)}
H.shape_key_add(name="Basis", from_mix=False)
def key(name, fn):
    k = H.shape_key_add(name=name, from_mix=False)
    D = fn()
    for i, d in enumerate(D):
        if d is not None and (abs(d[0]) + abs(d[1]) + abs(d[2])) > 1e-6:
            k.data[i].co = Mi @ (Vector(V[i]) + Vector(d))
    print("KEY", name, int(sum(1 for d in D if d is not None and (abs(d[0]) + abs(d[1]) + abs(d[2])) > 1e-6)))
def snout(amount, sz, sx_, zoff=0.0):
    w = front * g(z - (zp + zoff * S), sz * S) * g(x, sx_ * S)
    return [(0, -amount * S * w[i], 0) if w[i] > 1e-4 else None for i in range(len(V))]
key("Snout_Long", lambda: snout(0.045, 0.05, 0.075))          # a fox-girl muzzle: the whole snout reaches forward
key("Snout_Pointy", lambda: snout(0.04, 0.026, 0.04, 0.004))  # a sharp little point at the nose, sly
key("Snout_Flat", lambda: snout(-0.04, 0.06, 0.1))          # a chibi flat face, the nose sits in the cheeks
key("Snout_Puff", lambda: snout(0.03, 0.06, 0.16, -0.025))     # round mochi cheeks puffed out under the eyes
def ears(fn):
    out = [None] * len(V)
    for i in np.nonzero(E)[0]:
        sx = 1 if x[i] > 0 else -1; c = C[sx]; p = Vector(V[i]) - c
        out[i] = tuple((fn(p, sx) - p) * float(ear[i]))
    return out
key("Ear_Tall", lambda: ears(lambda p, sx: Vector((p.x * 0.8, p.y * 0.85, p.z * 1.45))))                 # tall lynx-anime ears
key("Ear_Small", lambda: ears(lambda p, sx: Vector((p.x * 0.85, p.y, p.z * 0.6))))                       # little round kitten ears
key("Ear_Fold", lambda: ears(lambda p, sx: Matrix.Rotation(math.radians(80) * min(1, max(0, p.z / (0.1 * S))), 3, "X") @ p))   # scottish fold: tips bent down to the front
key("Ear_Wide", lambda: ears(lambda p, sx: Matrix.Rotation(math.radians(-58 * sx), 3, "Y") @ p))        # airplane ears, tipped out to the sides
H.data.update()
CURL = 150

# --- tail types (Shelly: "new tail types too", kemono artist's eye): shape keys on the Body's tail, the root stays seated in the body
B = bpy.data.objects["Body"]; MB = B.matrix_world; MBi = MB.inverted()
Arm = B.find_armature(); TB = [b for b in Arm.data.bones if "Tail" in b.name]
TB.sort(key=lambda b: b.name)
P = [Arm.matrix_world @ TB[0].head_local] + [Arm.matrix_world @ b.tail_local for b in TB]
segL = [(P[i + 1] - P[i]).length for i in range(len(P) - 1)]; TL = sum(segL)
gi = {g.index for g in B.vertex_groups if "Tail" in g.name}
def onchain(q):
    best = None; acc = 0
    for i in range(len(P) - 1):
        a, b = P[i], P[i + 1]; ab = b - a; h = max(0, min(1, (q - a).dot(ab) / ab.dot(ab))); c = a + ab * h; d = (q - c).length
        if best is None or d < best[0]: best = (d, c, (acc + h * segL[i]) / TL)
        acc += segL[i]
    return best[1], best[2]
TV = []
for v in B.data.vertices:
    w = sum(g.weight for g in v.groups if g.group in gi)
    if w > 0.02:
        q = MB @ v.co; c, t = onchain(q); TV.append((v.index, q, c, t, min(1.0, w * 1.6)))
print("TAIL verts", len(TV), "len", round(TL, 3))
up = Vector((0, 0, 1)); dirn = (P[-1] - P[0]).normalized(); side = dirn.cross(up).normalized()
sm = lambda t: t * t * (3 - 2 * t)
def tkey(name, fn):
    k = B.shape_key_add(name=name, from_mix=False)
    for i, q, c, t, w in TV:
        n = fn(q, c, t); k.data[i].co = MBi @ (q + (n - q) * w)
    print("KEY", name)
P0 = P[0]
tkey("Tail_Fluffy", lambda q, c, t: c + (q - c) * (1.05 + 0.8 * math.sin(math.pi * min(1, t) * 0.92)))   # a brush: full through the middle, tapering to a soft point
tkey("Tail_Bob", lambda q, c, t: P0 + (c - P0) * 0.3 + (q - c) * (1.0 + 0.5 * t))                 # a short bobtail stub
PC = P0 + dirn * (0.08 * TL / 0.39); PR = 0.088 * TL / 0.39
def puff(q, c, t):
    d = q - PC; ball = PC + (d.normalized() * PR if d.length > 1e-6 else d)
    return q.lerp(ball, sm(min(1, t * 4)))
tkey("Tail_Puff", puff)                                                                              # a round pompom right at the base
tkey("Tail_Whip", lambda q, c, t: P0 + (c - P0) * 1.3 + (q - c) * (0.62 - 0.22 * t))              # long thin whip, tapering
def chainAt(u):
    acc = 0
    for i in range(len(P) - 1):
        if acc + segL[i] >= u * TL: return P[i].lerp(P[i + 1], (u * TL - acc) / segL[i])
        acc += segL[i]
    return P[-1]
PM = chainAt(0.45)
tkey("Tail_Curl", lambda q, c, t: q if t <= 0.45 else PM + Matrix.Rotation(math.radians(CURL * ((t - 0.45) / 0.55) ** 1.4), 3, side) @ (q - PM))   # the tip curls into a hook
B.data.update()
if "--tailproof" in sys.argv:
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x = sc.render.resolution_y = 300
    w_ = bpy.data.worlds.new("w"); sc.world = w_; w_.use_nodes = True; w_.node_tree.nodes["Background"].inputs[0].default_value = (.35, .35, .37, 1)
    L = bpy.data.lights.new("l", "SUN"); L.energy = 3; lo = bpy.data.objects.new("l", L); sc.collection.objects.link(lo); lo.rotation_euler = (math.radians(50), 0, math.radians(150))
    mt = bpy.data.materials.new("s"); mt.use_nodes = True; mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.9, .45, .12, 1)
    for o in bpy.data.objects:
        if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(mt)
    for a in bpy.data.objects:
        if a.type == "ARMATURE" and a.animation_data: a.animation_data.action = None
    cams = []
    for pos in [(1.8, 0.6, 0.45), (0.6, 1.8, 0.5)]:
        c = bpy.data.cameras.new("c"); c.lens = 50; co = bpy.data.objects.new("c", c); sc.collection.objects.link(co); co.location = pos
        co.rotation_euler = (Vector((0.05, 0.05, 0.45)) - co.location).to_track_quat('-Z', 'Y').to_euler(); cams.append(co)
    for kn in ["Basis", "Tail_Fluffy", "Tail_Bob", "Tail_Puff", "Tail_Whip", "Tail_Curl"]:
        for kb in B.data.shape_keys.key_blocks: kb.value = 1.0 if kb.name == kn else 0.0
        for j, co in enumerate(cams):
            sc.camera = co; sc.render.filepath = f"/tmp/tk/{W}-{kn}-{j}.png"; bpy.ops.render.render(write_still=True)
    sys.exit(0)
if PROOF:
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x = sc.render.resolution_y = 300
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.35, .35, .37, 1)
    L = bpy.data.lights.new("l", "SUN"); L.energy = 3; lo = bpy.data.objects.new("l", L); sc.collection.objects.link(lo); lo.rotation_euler = (math.radians(50), 0, math.radians(-30))
    mt = bpy.data.materials.new("s"); mt.use_nodes = True; mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.9, .45, .12, 1)
    for o in bpy.data.objects:
        if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(mt)
    for a in bpy.data.objects:
        if a.type == "ARMATURE" and a.animation_data: a.animation_data.action = None
    zc = (crown + z0) / 2
    cams = []
    for p in [(0, -1.5, zc), (1.5, 0, zc)]:
        c = bpy.data.cameras.new("c"); c.lens = 60; co = bpy.data.objects.new("c", c); sc.collection.objects.link(co); co.location = p
        co.rotation_euler = (Vector((0, 0, zc)) - co.location).to_track_quat('-Z', 'Y').to_euler(); cams.append(co)
    for kn in ["Basis", "Snout_Long", "Snout_Pointy", "Snout_Flat", "Snout_Puff", "Ear_Tall", "Ear_Small", "Ear_Fold", "Ear_Wide"]:
        for kb in H.data.shape_keys.key_blocks: kb.value = 1.0 if kb.name == kn else 0.0
        for j, co in enumerate(cams):
            sc.camera = co; sc.render.filepath = f"/tmp/hk/{W}-{kn}-{j}.png"; bpy.ops.render.render(write_still=True)
    for kb in H.data.shape_keys.key_blocks: kb.value = 0.0
    sys.exit(0)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_animation_mode="ACTIONS", export_morph=True, export_skins=True, use_selection=False)
print("OUT", OUT)
