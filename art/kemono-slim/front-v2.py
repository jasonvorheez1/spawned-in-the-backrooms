# Slim kemono v2 (Shelly Nov 16: "make her slimmer, more anime", "breasts look droopy", "cuter mesh shaping, including base snout shape",
# "thighs are supposed to be rounded"): front.py's alignment, then soft shape edits on the same topology and weights, proof renders, export.
# Blender space here: x = her left, -y = her front, z up; metres; 1.0 m bind height.
import bpy, math, json, os, sys
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree
OUT = "/workspace/kemono/v2"; os.makedirs(OUT, exist_ok=True)
DEFORM = "--raw" not in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/kemono/kemono-slim-rig.glb")
for o in [o for o in bpy.data.objects if o.name.startswith("Icosphere")]: bpy.data.objects.remove(o)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.vertex_groups)
B = lambda n: rig.matrix_world @ rig.data.bones["mixamorig:" + n].head_local
T = lambda n: rig.matrix_world @ rig.data.bones["mixamorig:" + n].tail_local
t = B("LeftToeBase") - B("LeftFoot")
R = Matrix.Rotation(math.atan2(-1, 0) - math.atan2(t.y, t.x), 4, "Z")
rig.matrix_world = R @ rig.matrix_world
bpy.context.view_layer.update()
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
h = B("Hips")
rig.matrix_world = Matrix.Translation((-h.x, -h.y, -min(zs))) @ rig.matrix_world
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()
mat = body.data.materials[0]; mat.name = "fur"

me = body.data; N = len(me.vertices)
P = [v.co.copy() for v in me.vertices]
gname = {g.index: g.name.replace("mixamorig:", "") for g in body.vertex_groups}
W = [{gname[g.group]: g.weight for g in v.groups if g.weight > 0} for v in me.vertices]
def wsum(i, names): return sum(W[i].get(n, 0) for n in names)
def ss(e0, e1, x):  # smoothstep
    if e0 == e1: return 1.0 if x >= e1 else 0.0
    u = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u)
def blob(p, c, r):  # soft ellipsoid falloff, r = (rx, ry, rz)
    d = math.sqrt(((p.x - c[0]) / r[0]) ** 2 + ((p.y - c[1]) / r[1]) ** 2 + ((p.z - c[2]) / r[2]) ** 2)
    return 0.0 if d >= 1 else (1 - d * d) ** 2

if DEFORM:
    HEAD = ["Head"]
    # 1. limbs slimmer: shrink each limb vertex toward its bone axis, blended by its weights (feet and hands untouched)
    LIMB = {"LeftArm": .9, "RightArm": .9, "LeftForeArm": .9, "RightForeArm": .9, "LeftUpLeg": .93, "RightUpLeg": .93, "LeftLeg": .9, "RightLeg": .9}
    seg = {n: (B(n), T(n)) for n in LIMB}
    for i in range(N):
        p = P[i]; d = Vector()
        for n, s in LIMB.items():
            w = W[i].get(n, 0)
            if w <= 0: continue
            a, b = seg[n]; ab = b - a; u = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); q = a + ab * u
            d += (q + (p - q) * s - p) * w
        P[i] = p + d
    # 2. waist a touch narrower (anime slim), ribcage held
    for i in range(N):
        p = P[i]; k = blob(p, (0, 0, 0.555), (0.2, 0.2, 0.08)) * (1 - wsum(i, ["LeftUpLeg", "RightUpLeg", "LeftArm", "RightArm"]))
        p.x *= 1 - 0.08 * k
    # 3. outer hips: round the corner — pull the widest hip ring in a bit, carry it down the thigh so the curve is one arc
    for i in range(N):
        p = P[i]; ax = abs(p.x)
        if ax < 0.05: continue
        k = blob(p, (math.copysign(0.105, p.x), 0.0, 0.43), (0.06, 0.12, 0.07))
        p.x -= math.copysign(0.012 * k, p.x)
    # 4. bust: lift and round — move breast tissue up and slightly forward at the top, tuck the underside
    for i in range(N):
        p = P[i]
        for sx in (-1, 1):
            c = (sx * 0.033, -0.045, 0.615)
            k = blob(p, c, (0.045, 0.05, 0.055))
            if k <= 0: continue
            under = ss(0.63, 0.585, p.z)   # 1 at the lower half
            p.z += 0.018 * k
            p.y += 0.006 * k * under    # tuck the sag back
    # 5. head: bigger and rounder skull (anime proportions); scaled about the head centre by the Head weight
    hc = Vector((0.0, 0.01, 0.865))
    for i in range(N):
        w = W[i].get("Head", 0)
        if w <= 0: continue
        p = P[i]; P[i] = hc + (p - hc) * (1 + 0.1 * w)
    # 6. snout: shorter, softer; pull the tip back, round it into the cheeks
    sc = Vector((0.0, -0.1, 0.8)) ; 
    for i in range(N):
        p = P[i]
        k = blob(p, (0, -0.105, 0.795), (0.06, 0.07, 0.05))
        if k <= 0: continue
        p.y += 0.024 * k
    for i in range(N):  # cheeks fuller so the muzzle contours into them
        p = P[i]
        for sx in (-1, 1):
            k = blob(p, (sx * 0.06, -0.065, 0.8), (0.04, 0.05, 0.045))
            p.x += sx * 0.006 * k; p.y -= 0.006 * k
    # 7. relax: a few weighted Laplacian passes over the edited regions so nothing reads as a dent
    nb = [[] for _ in range(N)]
    for e in me.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
    def relax(mask, it, f=0.5):
        for _ in range(it):
            Q = [p.copy() for p in P]
            for i in range(N):
                m = mask[i]
                if m <= 0 or not nb[i]: continue
                avg = sum((Q[j] for j in nb[i]), Vector()) / len(nb[i])
                P[i] = Q[i] + (avg - Q[i]) * f * m
    mask = [max(blob(p, (0, -0.1, 0.8), (0.08, 0.08, 0.06)), blob(p, (0.105, 0, 0.43), (0.07, 0.12, 0.08)), blob(p, (-0.105, 0, 0.43), (0.07, 0.12, 0.08)),
                blob(p, (0.033, -0.045, 0.61), (0.06, 0.06, 0.07)), blob(p, (-0.033, -0.045, 0.61), (0.06, 0.06, 0.07))) for p in P]
    relax(mask, 6, 0.45)
    # 8. feet back on y 0
    mz = min(p.z for p in P)
    for i in range(N): me.vertices[i].co = P[i] - Vector((0, 0, mz))
    me.update()

# --- proofs ---
sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = 600; sc.render.resolution_y = 900
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
w.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.25, 0.27, 1)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(L); L.data.energy = 3.5
def shot(name, ang, mid, dist, lens=50, el=0.0):
    cam.location = (dist * math.sin(ang), -dist * math.cos(ang), mid + el); cam.data.lens = lens
    cam.rotation_euler = (math.pi / 2 - math.atan2(el, dist), 0, ang)
    L.rotation_euler = (math.radians(55), 0, ang + math.radians(25))
    sc.render.filepath = f"{OUT}/{name}.png"; bpy.ops.render.render(write_still=True)
tag = "v" if DEFORM else "r"
for nm, a in (("front", 0), ("q", math.radians(35)), ("side", math.radians(90)), ("back", math.pi)):
    shot(f"{tag}_b_{nm}", a, 0.5, 2.6)
    shot(f"{tag}_h_{nm}", a, 0.86, 0.75)
    shot(f"{tag}_t_{nm}", a, 0.55, 1.1)

if DEFORM:
    g = lambda v: [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]
    V = [g(v.co) for v in me.vertices]
    crotch = min((v[1] for v in V if abs(v[0]) < 0.006 and 0.3 < v[1] < 0.55), default=None)
    def slab(y0, y1, xmax=0.12):
        s = [v for v in V if y0 < v[1] < y1 and abs(v[0]) < xmax and v[2] > -0.08]
        return (round(min(v[2] for v in s), 4), round(max(v[2] for v in s), 4), round(max(abs(v[0]) for v in s), 4)) if s else None
    prof = {round(y, 2): slab(y - 0.01, y + 0.01) for y in [0.36 + 0.02 * i for i in range(19)]}
    back = -0.08
    tv = [v for v in V if v[2] < back and 0.3 < v[1] < 0.62]
    root = min(tv, key=lambda v: v[0] ** 2 + (v[1] - 0.45) ** 2 + (v[2] - back) ** 2)
    d = lambda v: math.dist(v, root); tv.sort(key=d); n = len(tv); segs = []
    for a, b in [(0, .08), (.3, .38), (.62, .7), (.92, 1)]:
        c = tv[int(a * n):max(int(b * n), int(a * n) + 1)]; segs.append([round(sum(p[i] for p in c) / len(c), 3) for i in range(3)])
    print("LANDMARKS", json.dumps({"H": max(v[1] for v in V), "crotch": crotch, "tail": segs}))
    print("PROFILE", json.dumps(prof))
    bpy.ops.export_scene.gltf(filepath="/workspace/kemono/kemono-slim-v2.glb", export_apply=True)
