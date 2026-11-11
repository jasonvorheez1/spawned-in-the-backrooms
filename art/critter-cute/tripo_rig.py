# Tripo cat: the ONE universal body set (female + male on one Mixamo rig).
# run: blender -b --factory-startup --python-exit-code 1 --python art/critter-cute/tripo_rig.py -- female|male
# source -> scale (1.2 m, feet z=0, front -Y) -> split Body/Head -> rig + weights -> fur/fur2 slots (white fur, tintable)
# -> face decal (picture faces, critter-faces.yml crop) -> outfit (cloth_top / cloth_bottom) -> Idle/Walk -> export -> audit -> proofs
import bpy, bmesh, math, os, sys, json, struct, numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
WHO = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "female"
OUT = "/workspace/tripo-cat"; PR = f"{OUT}/proof-{WHO}"; os.makedirs(PR, exist_ok=True)
GLB = f"{OUT}/cat-{WHO}-rigged.glb"
P = "mixamorig:"; H = 1.2
FACEPNG = (275, 247, (60, 112), (215, 112))   # picture size, left/right eye centre px (critter-faces.yml crop)

def legs(J, hip, knee, ankle, toe, ly, fy):
    for sd, k in (("Left", 1), ("Right", -1)):
        J[sd + "UpLeg"] = ((hip[0] * k, ly, hip[1]), (knee[0] * k, ly, knee[1]))
        J[sd + "Leg"] = ((knee[0] * k, ly, knee[1]), (ankle[0] * k, ly + 0.005, ankle[1]))
        J[sd + "Foot"] = ((ankle[0] * k, ly + 0.005, ankle[1]), (toe[0] * k, fy, toe[1]))
        J[sd + "ToeBase"] = ((toe[0] * k, fy, toe[1]), (toe[0] * k, fy - 0.05, toe[1] - 0.005))
def build_J(c):
    sy, hz = c["spine_y"], c["hip_z"]; zs = c["spine_z"]
    J = {"Hips": ((0, sy, hz), (0, sy - 0.003, zs[0]))}
    names = ["Spine", "Spine1", "Spine2", "Neck"]; pts = [hz] + list(zs)

    J["Spine"] = ((0, sy, zs[0]), (0, sy, zs[1])); J["Spine1"] = ((0, sy, zs[1]), (0, sy, zs[2]))
    J["Spine2"] = ((0, sy, zs[2]), (0, sy + 0.004, zs[3])); J["Neck"] = ((0, sy + 0.004, zs[3]), (0, sy + 0.006, zs[4]))
    J["Head"] = ((0, sy + 0.006, zs[4]), (0, sy + 0.006, zs[4] + 0.42))
    for i, n in enumerate(("Tail1", "Tail2", "Tail3")): J[n] = (c["tail"][i], c["tail"][i + 1])
    legs(J, *c["legs"])
    return J
CFG = {
 "female": dict(src="value.fd42aa9c3d62dd1e836d8825fb196fb364c05a6c8c143a159d42705235e421fa.glb", zc=0.628,
    spine_y=-0.045, hip_z=0.36, spine_z=(0.42, 0.48, 0.54, 0.595, 0.632), arm=(0.095, 0.245, 0.36, 0.43, 0.598, -0.025), sh_x=0.025,
    legs=((0.06, 0.36), (0.092, 0.19), (0.098, 0.065), (0.10, 0.025), -0.035, -0.10),
    tail=((0.05, 0.14, 0.34), (0.16, 0.125, 0.30), (0.21, 0.115, 0.39), (0.285, 0.105, 0.53)), tail_y=0.115, neck_r=0.075,
    top=dict(lo=0.47, hi=0.626, sleeve=0.158, nf=(0.575, 0.062), nb=(0.592, 0.058), off=0.005, drape=True,
             rows=[(0.22, "#d98a9a"), (1.0, "#f3ead8")]),
    bot=dict(lo=0.245, hi=0.435, off=0.006, rows=[(0.2, "#4a6c9c"), (0.24, "#3f5f8c"), (1.0, "#5b7fb0")]),
    faces=["f_neutral", "f_ko"]),
 "male": dict(src="value.389310dd2c44bde2f302548e56ae6dc7d1d7174dd44a4bb29332fc672e5cfce7.glb", zc=0.742,
    spine_y=-0.082, hip_z=0.40, spine_z=(0.47, 0.54, 0.61, 0.695, 0.745), arm=(0.11, 0.27, 0.405, 0.482, 0.668, -0.08), sh_x=0.03,
    legs=((0.075, 0.40), (0.10, 0.21), (0.105, 0.075), (0.11, 0.03), -0.075, -0.15),
    tail=((0.05, 0.06, 0.38), (0.11, 0.16, 0.37), (0.18, 0.23, 0.45), (0.25, 0.28, 0.56)), tail_y=0.08, neck_r=0.11,
    top=dict(lo=0.435, hi=0.705, sleeve=0.215, nf=(0.672, 0.07), nb=(0.69, 0.065), off=0.011, drape=True,
             rows=[(0.12, "#86888c"), (1.0, "#9b9da1")]),
    bot=dict(lo=0.255, hi=0.47, off=0.006, rows=[(0.2, "#252f47"), (0.24, "#202940"), (1.0, "#2f3d5c")]),
    faces=["m_neutral"]),
}
C = CFG[WHO]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- source + scale ----------
bpy.ops.import_scene.gltf(filepath=f"{OUT}/{C['src']}")
src = [o for o in bpy.data.objects if o.type == "MESH"][0]
for o in list(bpy.data.objects):
    if o != src: bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = src.data
zs = [v.co.z for v in me.vertices]; s = H / (max(zs) - min(zs))
me.transform(Matrix.Rotation(math.radians(-90), 4, "Z") @ Matrix.Scale(s, 4))
me.transform(Matrix.Translation((0, 0, -min(v.co.z for v in me.vertices))))
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
# arm line refined from the mesh
A = np.array([v.co[:] for v in me.vertices if v.co.x > 0.3 and abs(v.co.z - C["arm"][4]) < 0.07])
AZ, AY = float(np.median(A[:, 2])), float(np.median(A[:, 1]))
print("height", round(max(v.co.z for v in me.vertices), 4), "arm line z", round(AZ, 3), "y", round(AY, 3))
mat = me.materials[0]
bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
n = bsdf.inputs["Base Color"].links[0].from_node
while n.type != "TEX_IMAGE": n = n.inputs[0].links[0].from_node
IMG = n.image; TW, TH = IMG.size

# ---------- split Head / Body ----------
ZC = C["zc"]
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
seed = max(bm.faces, key=lambda f: f.calc_center_median().z)
head = {seed.index}; stack = [seed]
while stack:
    f = stack.pop()
    for e in f.edges:
        for g in e.link_faces:
            if g.index not in head and g.calc_center_median().z > ZC:
                head.add(g.index); stack.append(g)
head |= {f.index for f in bm.faces if f.calc_center_median().z > ZC + 0.06}   # loose ears (male source)
print("head faces", len(head), "of", len(bm.faces)); bm.free()
def subset(name, keep):
    o = src.copy(); o.data = src.data.copy(); o.name = o.data.name = name; sc.collection.objects.link(o)
    b = bmesh.new(); b.from_mesh(o.data); b.faces.ensure_lookup_table()
    bmesh.ops.delete(b, geom=[f for f in b.faces if not keep(f.index)], context="FACES")
    b.to_mesh(o.data); b.free(); return o
HEAD = subset("Head", lambda i: i in head)
BODY = subset("Body", lambda i: i not in head)
bpy.data.objects.remove(src)
b = bmesh.new(); b.from_mesh(BODY.data)
ring = [e for e in b.edges if e.is_boundary and min(v.co.z for v in e.verts) > ZC - 0.03]
ext = bmesh.ops.extrude_edge_only(b, edges=ring)
rv = [v for e in ring for v in e.verts]; cx = sum(v.co.x for v in rv) / len(rv); cy = sum(v.co.y for v in rv) / len(rv)
for v in [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]:
    v.co.x = cx + (v.co.x - cx) * 0.88; v.co.y = cy + (v.co.y - cy) * 0.88; v.co.z += 0.018
b.normal_update(); b.to_mesh(BODY.data); b.free()
print("neck collar ring edges", len(ring))

r0, el, wr, tip = C["arm"][:4]
# ---------- tail: measured (geodesic walk from the tip, stops where the section widens into the rump) ----------
import heapq
bmv = BODY.data.vertices; hp = Vector((0, C["spine_y"], C["hip_z"]))
cand = [v for v in bmv if v.co.y > AY + 0.06 and C["hip_z"] - 0.05 < v.co.z < AZ + 0.02
        and not (abs(v.co.x) > r0 - 0.03 and math.hypot(v.co.y - AY, v.co.z - AZ) < 0.07)]   # not an arm
tipv = min(bmv, key=lambda v: (v.co - Vector(C["tail"][3])).length).index   # seeded at the measured tail tip (a far-point pick found the arm)
adj = [[] for _ in bmv]
for e in BODY.data.edges:
    a_, b_ = e.vertices; L_ = (bmv[a_].co - bmv[b_].co).length; adj[a_].append((b_, L_)); adj[b_].append((a_, L_))
gd = {tipv: 0.0}; hq = [(0.0, tipv)]
while hq:
    d_, i_ = heapq.heappop(hq)
    if d_ > gd.get(i_, 9) or d_ > 0.7: continue
    for j_, L_ in adj[i_]:
        if d_ + L_ < gd.get(j_, 9): gd[j_] = d_ + L_; heapq.heappush(hq, (d_ + L_, j_))
bins = {}
for i_, d_ in gd.items(): bins.setdefault(int(d_ / 0.01), []).append(i_)
cents, rads = [], []
for bi in range(max(bins) + 1):
    vs = bins.get(bi, [])
    if not vs: break
    cc = sum((bmv[i].co for i in vs), Vector()) / len(vs); cents.append(cc); rads.append(sum((bmv[i].co - cc).length for i in vs) / len(vs))
ref = float(np.median(rads[2:max(4, len(rads) // 2)]))
stop = next((bi for bi in range(4, len(rads)) if rads[bi] > 1.7 * ref), len(rads))
TLEN = stop * 0.01; TAILV = {i for i, d_ in gd.items() if d_ < TLEN}
chain = list(reversed(cents[:stop]))           # base -> tip
acc_ = [0.0]
for a_, b_ in zip(chain, chain[1:]): acc_.append(acc_[-1] + (b_ - a_).length)
def at(f):
    t = f * acc_[-1]; k_ = max(i for i in range(len(acc_)) if acc_[i] <= t + 1e-9); k_ = min(k_, len(chain) - 2)
    u_ = (t - acc_[k_]) / max(1e-6, acc_[k_ + 1] - acc_[k_]); return tuple(chain[k_].lerp(chain[k_ + 1], u_))
C["tail"] = (at(0), at(1 / 3), at(2 / 3), at(1))
print("tail verts", len(TAILV), "length", round(TLEN, 3), "ref radius", round(ref, 4), "chain", [tuple(round(x, 3) for x in q) for q in C["tail"]])
tkd = KDTree(len(bmv))
for v in bmv: tkd.insert(v.co, v.index)
tkd.balance()
# ---------- armature ----------
J = build_J(C)
for sd, k in (("Left", 1), ("Right", -1)):
    J[sd + "Shoulder"] = ((C["sh_x"] * k, C["spine_y"] + 0.01, AZ - 0.012), (r0 * k, AY, AZ))
    J[sd + "Arm"] = ((r0 * k, AY, AZ), (el * k, AY, AZ)); J[sd + "ForeArm"] = ((el * k, AY, AZ), (wr * k, AY, AZ))
    J[sd + "Hand"] = ((wr * k, AY, AZ), (tip * k, AY - 0.005, AZ))
PAR = {"Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck", "Tail1": "Hips", "Tail2": "Tail1", "Tail3": "Tail2"}
for sd in ("Left", "Right"):
    PAR.update({sd + "Shoulder": "Spine2", sd + "Arm": sd + "Shoulder", sd + "ForeArm": sd + "Arm", sd + "Hand": sd + "ForeArm",
                sd + "UpLeg": "Hips", sd + "Leg": sd + "UpLeg", sd + "Foot": sd + "Leg", sd + "ToeBase": sd + "Foot"})
CONN = {"Spine", "Spine1", "Spine2", "Neck", "Head", "Tail2", "Tail3"} | {sd + n for sd in ("Left", "Right") for n in ("Arm", "ForeArm", "Hand", "Leg", "Foot", "ToeBase")}
ORDER = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"] + [sd + n for sd in ("Left", "Right") for n in ("Shoulder", "Arm", "ForeArm", "Hand")] \
      + [sd + n for sd in ("Left", "Right") for n in ("UpLeg", "Leg", "Foot", "ToeBase")] + ["Tail1", "Tail2", "Tail3"]
arm_data = bpy.data.armatures.new("Armature"); ARM = bpy.data.objects.new("Armature", arm_data); sc.collection.objects.link(ARM)
bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = ARM; ARM.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for nm in ORDER:
    eb = arm_data.edit_bones.new(P + nm); eb.head, eb.tail = J[nm]
for nm, p in PAR.items():
    eb = arm_data.edit_bones[P + nm]; eb.parent = arm_data.edit_bones[P + p]; eb.use_connect = nm in CONN
for sd in ("Left", "Right"):
    for nm in ("Shoulder", "Arm", "ForeArm", "Hand"): arm_data.edit_bones[P + sd + nm].align_roll(Vector((0, 0, 1)))
    for nm in ("UpLeg", "Leg", "Foot", "ToeBase"): arm_data.edit_bones[P + sd + nm].align_roll(Vector((0, -1, 0)))
for nm in ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "Tail1", "Tail2", "Tail3"): arm_data.edit_bones[P + nm].align_roll(Vector((0, -1, 0)))
bpy.ops.object.mode_set(mode="OBJECT")
BONES = [P + nm for nm in ORDER]

# ---------- weights ----------
bpy.ops.object.select_all(action="DESELECT"); BODY.select_set(True); ARM.select_set(True); bpy.context.view_layer.objects.active = ARM
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
def segd(p, a, b):
    a, b = Vector(a), Vector(b); ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length, t
TAIL = ["Tail1", "Tail2", "Tail3"]
LEGS = {P + sd + nm for sd in ("Left", "Right") for nm in ("UpLeg", "Leg", "Foot", "ToeBase")}
ARMS = {P + sd + nm for sd in ("Left", "Right") for nm in ("Arm", "ForeArm", "Hand")}
def tailinfo(p):
    best = (9, 0, 0)
    for i, nm in enumerate(TAIL):
        d, t = segd(p, *J[nm]); best = min(best, (d, i, t))
    return best
def is_tail(p):
    return tkd.find(p)[1] in TAILV
G = {g.name: g for g in BODY.vertex_groups}
for nm in BONES:
    if nm not in G: G[nm] = BODY.vertex_groups.new(name=nm)
gidx = {g.index: g.name for g in BODY.vertex_groups}
hipz = J["LeftUpLeg"][0][2]; neckh = J["Head"][0][2]; armroot = r0
fallback = 0
for v in BODY.data.vertices:
    p = v.co; w = {gidx[g.group]: g.weight for g in v.groups if g.weight > 1e-4}
    if is_tail(p):
        d, i, t = tailinfo(p); w = {}
        if i == 0 and t < 0.3: w[P + "Hips"] = 1 - t / 0.3; w[P + "Tail1"] = t / 0.3
        elif t > 0.75 and i < 2: w[P + TAIL[i]] = 1 - (t - 0.75) / 0.5; w[P + TAIL[i + 1]] = (t - 0.75) / 0.5
        elif t < 0.25 and i > 0: w[P + TAIL[i]] = 0.5 + t / 0.5; w[P + TAIL[i - 1]] = 0.5 - t / 0.5
        else: w[P + TAIL[i]] = 1
    else:
        for nm in TAIL: w.pop(P + nm, None)
        if p.z > hipz + 0.07: [w.pop(nm, None) for nm in LEGS]
        if abs(p.x) < armroot - 0.01 or (p.z < AZ - 0.08 and abs(p.x) < armroot + 0.025): [w.pop(nm, None) for nm in ARMS]
        if p.z > neckh - 0.03 and abs(p.x) < C["neck_r"]:
            hw = min(1, max(0, (p.z - (neckh - 0.027)) / 0.023)); w = {P + "Neck": 1 - hw, P + "Head": hw}
        if p.z < hipz - 0.03 and abs(p.x) > 0.02: [w.pop(nm, None) for nm in (P + "Spine", P + "Spine1", P + "Spine2")]
    w = {k: x for k, x in w.items() if x > 1e-4}
    if not w:
        fallback += 1
        cand = [nm for nm in ORDER if not nm.startswith("Tail")]
        w = {P + min(cand, key=lambda nm: segd(p, *J[nm])[0]): 1.0}
    tot = sum(w.values())
    for g in list(v.groups): BODY.vertex_groups[g.group].remove([v.index])
    for k, x in w.items(): G[k].add([v.index], x / tot, "REPLACE")
print("body verts on nearest-bone fallback", fallback)
def skin_to_head(o):
    o.parent = ARM; m = o.modifiers.new("Armature", "ARMATURE"); m.object = ARM
    g = o.vertex_groups.new(name=P + "Head"); g.add([v.index for v in o.data.vertices], 1.0, "REPLACE")
skin_to_head(HEAD)

# ---------- eyes: found on a front render of the source face ----------
def save_img(name, arr, path, fmt):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel()); im.filepath_raw = path; im.file_format = fmt; im.save()
    bpy.data.images.remove(im); return bpy.data.images.load(path)
px = np.empty(TW * TH * 4, np.float32); IMG.pixels.foreach_get(px); px = px.reshape(TH, TW, 4).copy()
hb = [HEAD.matrix_world @ Vector(c) for c in HEAD.bound_box]
HZ0, HZ1 = min(c.z for c in hb), max(c.z for c in hb); HS = 0.7; HZC = (HZ0 + HZ1) / 2; R = 1024
mh = bpy.data.materials.new("tmp_head"); mh.use_nodes = True
ti = mh.node_tree.nodes.new("ShaderNodeTexImage"); ti.image = IMG; mh.node_tree.nodes.active = ti
HEAD.data.materials[0] = mh
camd = bpy.data.cameras.new("dc"); camd.type = "ORTHO"; camd.ortho_scale = HS; camo = bpy.data.objects.new("dc", camd); sc.collection.objects.link(camo)
camo.location = (0, -5, HZC); camo.rotation_euler = (math.radians(90), 0, 0); sc.camera = camo
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x = sc.render.resolution_y = R; sc.view_settings.view_transform = "Standard"; sc.render.film_transparent = True
BODY.hide_render = True; sc.render.filepath = f"/tmp/eyes-{WHO}.png"; bpy.ops.render.render(write_still=True); BODY.hide_render = False
im = bpy.data.images.load(f"/tmp/eyes-{WHO}.png"); a = np.empty(R * R * 4, np.float32); im.pixels.foreach_get(a); a = a.reshape(R, R, 4); bpy.data.images.remove(im)
dark = (a[..., :3].max(-1) < 0.13) & (a[..., 3] > 0.5)
for _ in range(6):
    d2 = dark.copy(); d2[1:] &= dark[:-1]; d2[:-1] &= dark[1:]; d2[:, 1:] &= dark[:, :-1]; d2[:, :-1] &= dark[:, 1:]; dark = d2
rows, cols = np.nonzero(dark); X = (cols + 0.5 - R / 2) / R * HS; Z = HZC + (rows + 0.5 - R / 2) / R * HS
EYE = []
for sg in (-1, 1):
    m = (X * sg > 0.045); EYE.append((float(np.median(X[m])), float(np.median(Z[m]))))
EZ = (EYE[0][1] + EYE[1][1]) / 2; ECX = (EYE[0][0] + EYE[1][0]) / 2; D = EYE[1][0] - EYE[0][0]
FW, FH, (lx, ly), (rx_, ry) = FACEPNG; k = D / (rx_ - lx)
BOX = (ECX - (lx + rx_) / 2 * k, ECX + (FW - (lx + rx_) / 2) * k, EZ - (FH - ly) * k, EZ + ly * k)   # x0 x1 z0 z1
print("eyes", [tuple(round(c, 4) for c in e) for e in EYE], "spacing", round(D, 4))
print("FACE UV BOX head-space x[%.4f, %.4f] z[%.4f, %.4f] (front view, u=0 at x0 (character's right), v=0 at z0)" % BOX)
bpy.data.objects.remove(camo)
_bv = BVHTree.FromObject(HEAD, bpy.context.evaluated_depsgraph_get())
_yc = sum(c.y for c in hb) / 8
CROWN = _bv.ray_cast(Vector((0, _yc, 3)), Vector((0, 0, -1)))[0].z
CHIN = EZ - 0.1   # start under the nose, walk down the jaw to where it turns under
for zz in np.arange(EZ - 0.1, HZ0, -0.002):
    h_ = _bv.ray_cast(Vector((0, -1, zz)), Vector((0, 1, 0)))
    if h_[0] is None or h_[1].z < -0.6: break
    CHIN = zz
FRAC0 = (EZ - CHIN) / (CROWN - CHIN)
EZD = CHIN + 0.50 * (CROWN - CHIN); kD = k * 1.12          # eyes at mid-skull, face 12% larger
BOXD = (ECX - (lx + rx_) / 2 * kD, ECX + (FW - (lx + rx_) / 2) * kD, EZD - (FH - ly) * kD, EZD + ly * kD)
print("SKULL chin %.4f crown %.4f eye-centre fraction before %.3f after %.3f" % (CHIN, CROWN, FRAC0, (EZD - CHIN) / (CROWN - CHIN)))
print("DECAL UV BOX head-space x[%.4f, %.4f] z[%.4f, %.4f] (front view, u=0 at x0 (character's right), v=0 at z0)" % BOXD)

# ---------- paint out eyes / nose / mouth under the decal ----------
def classes(c):
    mx = c[..., :3].max(-1); mn = c[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
    lum_ = 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
    cream = (mx > 0.55) & (sat < 0.38)
    pink = (c[..., 0] - c[..., 1] > 0.1) & (c[..., 1] - c[..., 2] < 0.08)
    fur = ~cream & ~pink & (lum_ > 0.25)
    return fur, cream
hm = HEAD.data; hm.calc_loop_triangles(); uvl = hm.uv_layers.active.data
SX, SIJ = [], []
for t in hm.loop_triangles:
    c = t.center
    if not (BOX[0] - 0.02 < c.x < BOX[1] + 0.02 and BOX[2] - 0.02 < c.z < BOX[3] + 0.02 and c.y < 0 and t.normal.y < 0.3): continue
    UV = np.array([uvl[l].uv[:] for l in t.loops]) * [TW, TH]; Xt = np.array([hm.vertices[i].co[:] for i in t.vertices])
    x0, y0 = np.floor(UV.min(0)).astype(int); x1, y1 = np.ceil(UV.max(0)).astype(int)
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx_, cy_) = UV; den = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
    if abs(den) < 1e-9: continue
    l1 = ((by - cy_) * (gx - cx_) + (cx_ - bx) * (gy - cy_)) / den; l2 = ((cy_ - ay) * (gx - cx_) + (ax - cx_) * (gy - cy_)) / den; l3 = 1 - l1 - l2
    ins = (l1 > -0.03) & (l2 > -0.03) & (l3 > -0.03)
    if not ins.any(): continue
    SX.append(np.stack([l1[ins], l2[ins], l3[ins]], 1) @ Xt)
    SIJ.append(np.stack([np.floor(gy[ins]).astype(int) % TH, np.floor(gx[ins]).astype(int) % TW], 1))
SX = np.concatenate(SX); SIJ = np.concatenate(SIJ); col = px[SIJ[:, 0], SIJ[:, 1]]
fur, cream = classes(col)
ine = np.zeros(len(SX), bool)
for ex, ez in EYE: ine |= ((SX[:, 0] - ex) / (0.6 * D)) ** 2 + ((SX[:, 2] - ez - 0.05 * D) / (0.6 * D)) ** 2 < 1
bad = (~fur & ~cream) | (ine & ~fur)
good = ~bad & ~ine
kd = KDTree(int(good.sum())); gi = np.nonzero(good)[0]
for j, i in enumerate(gi): kd.insert(SX[i], j)
kd.balance()
for i in np.nonzero(bad)[0]:
    _, j, _ = kd.find(SX[i]); src_ij = SIJ[gi[j]]; px[SIJ[i, 0], SIJ[i, 1], :3] = px[src_ij[0], src_ij[1], :3]
print("paint-out texels", int(bad.sum()))

# ---------- tintable fur: fur texels -> near-white luminance, cream/pads/nose untouched ----------
fur_all, _ = classes(px)
lum = 0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]
fl_med = float(np.median(lum[fur_all])); FURC = np.median(px[fur_all][:, :3], 0)
TINT = tuple(float(x) for x in np.clip(FURC / 0.92, 0, 1))
white = px.copy(); gv = np.clip(lum / fl_med * 0.92, 0, 1)
for ch in range(3): white[..., ch] = np.where(fur_all, gv, px[..., ch])
WHITE = save_img("fur_white", white, f"{OUT}/cat-{WHO}-fur-white.png", "PNG")
WHITE.scale(2048, 2048); WHITE.filepath_raw = f"{OUT}/cat-{WHO}-fur-white.jpg"; WHITE.file_format = "JPEG"; WHITE.save()
print("fur median rgb", np.round(FURC, 3), "default tint", np.round(TINT, 3))
def fur_mat(name, tint):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    bs = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); t = nt.nodes.new("ShaderNodeTexImage"); t.image = WHITE
    bs.inputs["Roughness"].default_value = 0.6
    if tint:
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs[0].default_value = 1
        mx.inputs[7].default_value = (*tint, 1); nt.links.new(t.outputs["Color"], mx.inputs[6]); nt.links.new(mx.outputs[2], bs.inputs["Base Color"])
    else: nt.links.new(t.outputs["Color"], bs.inputs["Base Color"])
    return m
FUR = fur_mat("fur", TINT); FUR2 = fur_mat("fur2", None)
for o in (BODY, HEAD):
    o.data.materials.clear(); o.data.materials.append(FUR); o.data.materials.append(FUR2)
    uv = o.data.uv_layers.active.data; nf = 0
    for poly in o.data.polygons:
        pts = [uv[li].uv for li in poly.loop_indices]; pts.append(sum(pts, Vector((0, 0))) / len(pts))
        anyfur = sum(bool(fur_all[int(p.y * TH) % TH, int(p.x * TW) % TW]) for p in pts) * 2 > len(pts)
        poly.material_index = 0 if anyfur else 1; nf += anyfur
    print(o.name, "faces fur", nf, "fur2", len(o.data.polygons) - nf)

# ---------- face decal mesh ----------
bvh = BVHTree.FromObject(HEAD, bpy.context.evaluated_depsgraph_get())
NX, NZ = 88, 80; grid = {}
for j in range(NZ + 1):
    for i in range(NX + 1):
        u, v = i / NX, j / NZ; Xp = BOX[0] + u * (BOX[1] - BOX[0]); Zp = BOX[2] + v * (BOX[3] - BOX[2])
        hit = bvh.ray_cast(Vector((Xp, -1, Zp)), Vector((0, 1, 0)))
        if hit[0] is not None and hit[1].y < -0.15: grid[i, j] = (hit[0] + hit[1].normalized() * 0.0005, (u, v))
hgt = np.full((NX + 1, NZ + 1), np.nan)
for (i, j), (co, uv_) in grid.items(): hgt[i, j] = -co.y
Wn = 13; pad = np.where(np.isnan(hgt), -9, hgt)
def win(a, f):
    out = a.copy()
    for di in range(-Wn, Wn + 1):
        for dj in range(-Wn, Wn + 1):
            if di * di + dj * dj > Wn * Wn: continue
            out = f(out, np.roll(np.roll(a, di, 0), dj, 1))
    return out
Wn = 3; opn = win(win(np.where(np.isnan(hgt), 9, hgt), np.minimum), np.maximum)
Wn = 13; pad = np.where(np.isnan(hgt), -9, opn)
dil = win(pad, np.maximum); clo = win(np.where(np.isnan(hgt), 9, dil), np.minimum)
for _ in range(3): clo = (clo + np.roll(clo, 1, 0) + np.roll(clo, -1, 0) + np.roll(clo, 1, 1) + np.roll(clo, -1, 1)) / 5
# the head under the decal is rebuilt: front faces inside the patch box (eyes, sockets, lashes, nose, mouth) go, and a smooth
# grid skin (the face's closed hull in the middle, easing to the real surface at the rim) takes their place, textured from the head's own fur
from mathutils.interpolate import poly_3d_calc
import bmesh as _bm
H0 = hgt.copy(); VAL = ~np.isnan(hgt); hgt = np.where(np.isnan(hgt), clo, hgt); bvh0 = BVHTree.FromObject(HEAD, bpy.context.evaluated_depsgraph_get()); hm = HEAD.data; uvl = hm.uv_layers.active.data
pv, puv, pmat, pid = [], [], [], {}
for i in range(NX + 1):
    for j in range(NZ + 1):
        if not VAL[i, j]: continue
        e = min(i, NX - i, j, NZ - j); w = min(1.0, max(0.0, (e - 1) / 7.0)); w = w * w * (3 - 2 * w)
        dpt = w * clo[i, j] + (1 - w) * hgt[i, j] - 0.0003
        co = Vector((BOX[0] + i / NX * (BOX[1] - BOX[0]), -dpt, BOX[2] + j / NZ * (BOX[3] - BOX[2])))
        loc, nrm, fi, _ = bvh0.find_nearest(co); poly = hm.polygons[fi]
        ws = poly_3d_calc([hm.vertices[k].co for k in poly.vertices], loc)
        uv = sum((uvl[li].uv * wk for li, wk in zip(poly.loop_indices, ws)), Vector((0, 0)))
        tj, ti_ = int(uv.y * TH) % TH, int(uv.x * TW) % TW
        pid[i, j] = len(pv); pv.append(co); puv.append(uv); pmat.append(float(not fur_all[tj, ti_] and lum[tj, ti_] > 0.45))
# flat fills: one clean fur texel and one clean cream texel; the cream mask is smoothed over the grid so the muzzle edge is soft, not texel noise
def clean(mask):
    m = mask.copy()
    for _ in range(8): m[1:-1, 1:-1] &= m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:]
    tgt = np.median(lum[SIJ[fur, 0], SIJ[fur, 1]])   # the fur tone around the face, not the atlas median
    r, c = np.nonzero(m); kk = int(np.argmin(np.abs(lum[r, c] - tgt))); return Vector(((c[kk] + 0.5) / TW, (r[kk] + 0.5) / TH))
_, cream_all = classes(px); UVF, UVC = clean(fur_all), clean(cream_all & (lum > 0.6))
cm = np.zeros((NX + 1, NZ + 1))
for (i, j), n in pid.items(): cm[i, j] = pmat[n]
for _ in range(12): cm = (cm + np.roll(cm, 1, 0) + np.roll(cm, -1, 0) + np.roll(cm, 1, 1) + np.roll(cm, -1, 1)) / 5
for (i, j), n in pid.items(): pmat[n] = 0; puv[n] = UVF
pf = []
for i in range(NX):
    for j in range(NZ):
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]   # outward (-Y) winding
        if all(k in pid for k in q) and max(pv[pid[k]].y for k in q) - min(pv[pid[k]].y for k in q) < 0.05: pf.append(q)
def inner(c, m):
    fi_ = (c.x - BOX[0]) / (BOX[1] - BOX[0]) * NX; fj_ = (c.z - BOX[2]) / (BOX[3] - BOX[2]) * NZ
    return min(fi_, NX - f# no faces deleted, no holes: the head's own front vertices inside the box are pressed onto the smooth closed hull
# (eye bulges, sockets, lashes, old mouth flattened), easing back to the real surface at the rim; inner faces read one fur texel
bm = _bm.new(); bm.from_mesh(hm); bm.faces.ensure_lookup_table(); uvk = bm.loops.layers.uv.active
def cell(c): return (c.x - BOX[0]) / (BOX[1] - BOX[0]) * NX, (c.z - BOX[2]) / (BOX[3] - BOX[2]) * NZ
moved = set()
for v in bm.verts:
    fi_, fj_ = cell(v.co); i, j = int(round(fi_)), int(round(fj_))
    if not (0 <= i <= NX and 0 <= j <= NZ) or v.co.y > -0.03 or np.isnan(H0[i, j]): continue
    if v.co.y > -H0[i, j] + 0.02: continue          # behind the front surface (inside / back of head): leave
    e = min(fi_, NX - fi_, fj_, NZ - fj_); w = min(1.0, max(0.0, (e - 1) / 7.0)); w = w * w * (3 - 2 * w)
    v.co.y = -(w * clo[i, j] + (1 - w) * H0[i, j]); moved.add(v.index)
nlash = 0
for f in bm.faces:
    if not all(v.index in moved for v in f.verts): continue
    fi_, fj_ = cell(f.calc_center_median())
    if min(fi_, NX - fi_, fj_, NZ - fj_) < 2: continue
    for l in f.loops: l[uvk].uv = UVF
    f.material_index = 0; nlash += 1
dead = []; pf = pf
_index = 0; nlash += 1
print("head front verts pressed", len(moved), "faces to fur", nlash)
bm.to_mesh(hm); bm.free(); lift = len(dead)
bpy.context.view_layer.objects.active = HEAD
if HEAD.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()   # old normals kept the sockets' shading
for poly in HEAD.data.polygons: poly.use_smooth = True
HEAD.data.update()
if os.environ.get("DBGFACE"): bpy.ops.wm.save_as_mainfile(filepath="/tmp/dbg.blend"); sys.exit(0)
print("head front faces replaced by smooth skin", lift, "patch quads", len(pf))
bvh = BVHTree.FromObject(HEAD, bpy.context.evaluated_depsgraph_get()); grid = {}; hn = {}
for j in range(NZ + 1):
    for i in range(NX + 1):
        u, v = i / NX, j / NZ; Xp = BOXD[0] + u * (BOXD[1] - BOXD[0]); Zp = BOXD[2] + v * (BOXD[3] - BOXD[2])
        hit = bvh.ray_cast(Vector((Xp, -1, Zp)), Vector((0, 1, 0)))
        if hit[0] is not None and hit[1].y < -0.15: grid[i, j] = (hit[0], (u, v)); hn[i, j] = hit[1].normalized()
for (i, j), (co, uv_) in list(grid.items()):   # smoothed normals: an even 3 mm stand-off, no faceted ripple
    nn = Vector((0, 0, 0))
    for di in range(-2, 3):
        for dj in range(-2, 3):
            if (i + di, j + dj) in hn: nn += hn[i + di, j + dj]
    grid[i, j] = (co + nn.normalized() * 0.003, uv_)
verts, uvs, faces, vid = [], [], [], {}
for key, (co, uv_) in grid.items(): vid[key] = len(verts); verts.append(co[:]); uvs.append(uv_)
for j in range(NZ):
    for i in range(NX):
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if all(kk in vid for kk in q) and max(grid[kk][0].y for kk in q) - min(grid[kk][0].y for kk in q) < 0.015:
            faces.append([vid[kk] for kk in q])
fm = bpy.data.meshes.new("Face"); fm.from_pydata(verts, [], faces); fm.update()
fuv = fm.uv_layers.new(name="UVMap")
for poly in fm.polygons:
    poly.use_smooth = True
    for li in poly.loop_indices: fuv.data[li].uv = uvs[fm.loops[li].vertex_index]
FACE = bpy.data.objects.new("Face", fm); sc.collection.objects.link(FACE); skin_to_head(FACE)
used = {fm.loops[li].vertex_index for p in fm.polygons for li in p.loop_indices}
print("face decal verts", len(verts), "quads", len(faces))
FACEIMG = {nm: bpy.data.images.load(f"{OUT}/faces/{nm}.png") for nm in C["faces"]}
for im_ in FACEIMG.values(): im_.use_fake_user = True
mf = bpy.data.materials.new("face"); mf.use_nodes = True; nt = mf.node_tree
fb = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); FT = nt.nodes.new("ShaderNodeTexImage"); FT.image = FACEIMG[C["faces"][0]]
FT.extension = "CLIP"; nt.links.new(FT.outputs["Color"], fb.inputs["Base Color"])
rnd = nt.nodes.new("ShaderNodeMath"); rnd.operation = "ROUND"; nt.links.new(FT.outputs["Alpha"], rnd.inputs[0]); nt.links.new(rnd.outputs[0], fb.inputs["Alpha"])   # glTF MASK, cutoff 0.5
fb.inputs["Roughness"].default_value = 0.45
mf.surface_render_method = "DITHERED"; mf.use_backface_culling = True; fm.materials.append(mf)
bpy.data.materials.remove(mh)

# ---------- outfit ----------
def grad_img(name, rows):
    hgt = 128; arr = np.ones((hgt, 4, 4), np.float32)
    for r in range(hgt):
        f = (r + 0.5) / hgt; hx = next(c for e, c in rows if f <= e)
        arr[r, :, :3] = [(int(hx[i:i + 2], 16) / 255) for i in (1, 3, 5)]
    return save_img(name, arr, f"{OUT}/{WHO}-{name}.png", "PNG")
def cloth_mat(name, img, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    bs = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    t.extension = "EXTEND"; nt.links.new(t.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = rough
    return m
body_bvh = BVHTree.FromObject(BODY, bpy.context.evaluated_depsgraph_get())
TKD = KDTree(len(BODY.data.vertices)); TAILW = set()
for v in BODY.data.vertices:
    TKD.insert(v.co, v.index)
    if sum(BODY.vertex_groups[gg.group].name.endswith(("Tail1", "Tail2", "Tail3")) * gg.weight for gg in v.groups) > 0.05: TAILW.add(v.index)
TKD.balance()
def tailish(c): return any(i in TAILW for _, i, _ in TKD.find_n(c, 4))
print("tail-weighted body verts", len(TAILW))
bidx = {gg.index: gg.name for gg in BODY.vertex_groups}
def make_cloth(name, keep, off, vfun, material, drape):
    o = BODY.copy(); o.data = BODY.data.copy(); o.name = o.data.name = name; sc.collection.objects.link(o)
    o.vertex_groups.clear(); o.modifiers.clear(); o.parent = None
    b = bmesh.new(); b.from_mesh(o.data)
    drop = [f for f in b.faces if not keep(f.calc_center_median())]
    print(name, "faces kept", len(b.faces) - len(drop), "tail faces kept", sum(tailish(f.calc_center_median()) for f in b.faces if f not in set(drop)))
    bmesh.ops.delete(b, geom=drop, context="FACES")
    isl = []; seen = set()
    for f in b.faces:
        if f.index in seen: continue
        comp = [f]; seen.add(f.index); st = [f]
        while st:
            g = st.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); comp.append(h); st.append(h)
        isl.append(comp)
    big = max(len(c) for c in isl)
    bmesh.ops.delete(b, geom=[f for c in isl if len(c) < 0.05 * big for f in c], context="FACES")
    for _ in range(6): bmesh.ops.smooth_vert(b, verts=[v for v in b.verts if not v.is_boundary], factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for _ in range(3): bmesh.ops.smooth_vert(b, verts=[v for v in b.verts if v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    b.normal_update()
    if drape:
        bins = {}
        for v in b.verts:
            if v.co.y < C["spine_y"] + 0.02: bins.setdefault(round(v.co.x / 0.01), []).append(v)
        for vs in bins.values():
            vs.sort(key=lambda v: -v.co.z); ymin, zat = 9, 0
            for v in vs:
                if v.co.y < ymin: ymin, zat = v.co.y, v.co.z
                v.co.y = min(v.co.y, ymin + 0.3 * (zat - v.co.z))
        b.normal_update()
    for v in b.verts:
        loc, nrm, fi, dist = body_bvh.find_nearest(v.co); d_ = (v.co - loc).dot(nrm)
        if d_ < off and off - d_ < 0.02: v.co += nrm * (off - d_)
    uv = b.loops.layers.uv.verify()
    for f in b.faces:
        f.smooth = True
        for l in f.loops: l[uv].uv = (0.5, vfun(l.vert.co))
    b.to_mesh(o.data); b.free()
    o.data.materials.clear(); o.data.materials.append(material)
    bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = o; o.select_set(True)
    sol = o.modifiers.new("solid", "SOLIDIFY"); sol.thickness = 0.003; sol.offset = 1; sol.use_rim = True; sol.use_even_offset = False
    bpy.ops.object.modifier_apply(modifier="solid")
    sm = o.modifiers.new("sub", "SUBSURF"); sm.levels = 1; bpy.ops.object.modifier_apply(modifier="sub")
    bw = {nm: o.vertex_groups.new(name=nm) for nm in BONES}; bd = BODY.data
    for v in o.data.vertices:   # weights: nearest body face, interpolated (inverse distance over its corners)
        loc, nrm, fi, dist = body_bvh.find_nearest(v.co); poly = bd.polygons[fi]; acc = {}
        ws = [1 / max(1e-5, (bd.vertices[i].co - loc).length) for i in poly.vertices]; sw = sum(ws)
        for vi, wt in zip(poly.vertices, ws):
            for gg in bd.vertices[vi].groups: acc[bidx[gg.group]] = acc.get(bidx[gg.group], 0) + wt / sw * gg.weight
        tot = sum(acc.values()) or 1
        for kk, x in acc.items():
            if x / tot > 1e-3: bw[kk].add([v.index], x / tot, "REPLACE")
    o.parent = ARM; m = o.modifiers.new("Armature", "ARMATURE"); m.object = ARM
    print(name, "verts", len(o.data.vertices), "tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
    return o
T, Bt = C["top"], C["bot"]
def top_keep(c):
    if is_tail(c) or tailish(c) or not (T["lo"] < c.z < T["hi"]) or abs(c.x) > T["sleeve"]: return False
    if c.z > T["nf"][0] and abs(c.x) < T["nf"][1] and c.y < C["spine_y"]: return False
    if c.z > T["nb"][0] and abs(c.x) < T["nb"][1]: return False
    return True
def bot_keep(c):
    if is_tail(c) or tailish(c) or (c - Vector(J["Tail1"][0])).length < 0.032: return False
    return Bt["lo"] < c.z < Bt["hi"]
TOP = make_cloth("ClothTop", top_keep, T["off"], lambda co: min(1, max(0, (co.z - T["lo"]) / 0.1)), cloth_mat("cloth_top", grad_img("cloth_top", T["rows"]), 0.8), T["drape"])
BOT = make_cloth("ClothBottom", bot_keep, Bt["off"], lambda co: min(1, max(0, (Bt["hi"] - co.z) / 0.1)), cloth_mat("cloth_bottom", grad_img("cloth_bottom", Bt["rows"]), 0.85), False)

# ---------- clips (rotations only: the female and male share them) ----------
for pb in ARM.pose.bones: pb.rotation_mode = "QUATERNION"
def rest3(nm): return ARM.data.bones[P + nm].matrix_local.to_3x3()
def wrot(nm, Rm): M = rest3(nm); ARM.pose.bones[P + nm].rotation_quaternion = (M.inverted() @ Rm @ M).to_quaternion()
def wloc(nm, v): ARM.pose.bones[P + nm].location = rest3(nm).inverted() @ Vector(v)
def Rx(a): return Matrix.Rotation(math.radians(a), 3, "X")
def Ry(a): return Matrix.Rotation(math.radians(a), 3, "Y")
def Rz(a): return Matrix.Rotation(math.radians(a), 3, "Z")
def clear_pose():
    for pb in ARM.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def key_all(f):
    for pb in ARM.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
ARM.animation_data_create()
def pose_idle(ph):
    clear_pose(); b_ = math.sin(ph)
    wrot("Spine", Rx(-1.5 * b_)); wrot("Spine2", Rx(-1.5 * b_)); wrot("Neck", Rx(1.0 * b_)); wrot("Head", Rx(1.0 * b_) @ Rz(2 * math.sin(ph * 0.5)))
    wrot("LeftArm", Ry(62 + 2 * b_)); wrot("RightArm", Ry(-62 - 2 * b_)); wrot("LeftForeArm", Rz(-8)); wrot("RightForeArm", Rz(8))
    wloc("Hips", (0, 0, 0.002 * b_))
    for i, nm in enumerate(TAIL): wrot(nm, Rz(10 * math.sin(ph - i * 0.7)) @ Rx(3 * math.sin(ph * 2 - i)))
def pose_walk(ph):
    clear_pose(); s_ = math.sin(ph); c_ = math.cos(ph)
    wloc("Hips", (0, 0, 0.012 * math.cos(2 * ph) - 0.006)); wrot("Hips", Rz(4 * s_))
    wrot("Spine", Rz(-3 * s_) @ Rx(-3)); wrot("Spine2", Rz(-3 * s_)); wrot("Head", Rz(2 * s_))
    for sd, sg in (("Left", 1), ("Right", -1)):
        sw = sg * s_; cc = sg * c_
        wrot(sd + "UpLeg", Rx(-26 * sw)); wrot(sd + "Leg", Rx(max(0, 40 * cc) + 6)); wrot(sd + "Foot", Rx(-10 * sw))
        wrot(sd + "Arm", Rx(22 * sw) @ Ry(62 * sg)); wrot(sd + "ForeArm", Rz(-12 * sg))
    for i, nm in enumerate(TAIL): wrot(nm, Rz(12 * math.sin(ph - i * 0.8)) @ Rx(4 * math.sin(2 * ph - i)))
for nm, fr, fn in (("Idle", 48, pose_idle), ("Walk", 24, pose_walk)):
    act = bpy.data.actions.new(nm); act.use_fake_user = True; ARM.animation_data.action = act
    for f in range(0, fr + 1, 2): fn(2 * math.pi * f / fr); key_all(f + 1)
ARM.animation_data.action = None; clear_pose()

# ---------- export + audit ----------
sc.frame_set(1)
for nm in ("ClothTop", "ClothBottom"):   # clothes are painted by the game's skin shader now: shells stay out of the glb
    if nm in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[nm])
bpy.ops.export_scene.gltf(filepath=GLB, export_apply=False, export_morph=True, export_skins=True, export_animation_mode="ACTIONS", export_image_format="AUTO")
SAVE = f"{OUT}/cat-{WHO}-rigged.blend"; bpy.ops.wm.save_as_mainfile(filepath=SAVE)
with open(GLB, "rb") as fh:
    fh.read(12); ln = struct.unpack("<I", fh.read(4))[0]; fh.read(4); gj = json.loads(fh.read(ln))
print("AUDIT gltf materials", [(m["name"], [round(x, 3) for x in m.get("pbrMetallicRoughness", {}).get("baseColorFactor", [1, 1, 1, 1])], m.get("alphaMode", "OPAQUE")) for m in gj["materials"]])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=GLB)
dg = bpy.context.evaluated_depsgraph_get(); arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
print("AUDIT bones", len(arm.data.bones), ",".join(b.name.replace(P, "") for b in arm.data.bones))
tris = 0; zall = []
for o in bpy.data.objects:
    if o.type != "MESH" or not o.vertex_groups: continue   # importer's bone-shape icosphere
    e = o.evaluated_get(dg); m = e.to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); zall += [(e.matrix_world @ v.co).z for v in m.vertices]
    print("AUDIT mesh", o.name, "slots", [mm.name for mm in o.data.materials], "tris", len(m.loop_triangles), "groups", len(o.vertex_groups),
          "shapekeys", [kb.name for kb in o.data.shape_keys.key_blocks] if o.data.shape_keys else [])
    e.to_mesh_clear()
print("AUDIT actions", [a.name for a in bpy.data.actions], "tris", tris, "height", round(max(zall) - min(zall), 4), "minz", round(min(zall), 4), "MB", round(os.path.getsize(GLB) / 1e6, 2))

# ---------- proofs ----------
bpy.ops.wm.open_mainfile(filepath=SAVE)
sc = bpy.context.scene; ARM = bpy.data.objects["Armature"]
sc.render.engine = "CYCLES"; sc.cycles.samples = 20; sc.cycles.use_denoising = True; sc.render.film_transparent = False
sc.render.resolution_x = sc.render.resolution_y = 656; sc.view_settings.view_transform = "Standard"
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.55, 1); wd.node_tree.nodes["Background"].inputs[1].default_value = 0.35
camd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", camd); sc.collection.objects.link(cam); sc.camera = cam
ld = bpy.data.lights.new("key", "AREA"); ld.size = 1.2; L = bpy.data.objects.new("key", ld); sc.collection.objects.link(L)
def shoot(path, target, yaw, dist, lens):
    t = Vector(target); d = Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), 0.06)).normalized()
    cam.location = t + d * dist; camd.lens = lens; cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    L.location = t + (d + Vector((0.25, 0, 0.35))).normalized() * dist * 0.9; L.rotation_euler = (t - L.location).to_track_quat("-Z", "Y").to_euler()
    ld.energy = 14 * dist ** 2; sc.render.filepath = path; bpy.ops.render.render(write_still=True)
for pb in ARM.pose.bones: pb.rotation_mode = "QUATERNION"
def rest3(nm): return ARM.data.bones[P + nm].matrix_local.to_3x3()
def wrot(nm, Rm): M = rest3(nm); ARM.pose.bones[P + nm].rotation_quaternion = (M.inverted() @ Rm @ M).to_quaternion()
def clear_pose():
    for pb in ARM.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
ARM.animation_data.action = None; clear_pose(); bpy.context.view_layer.update()
cloth = []
FT = next(n for n in bpy.data.materials["face"].node_tree.nodes if n.type == "TEX_IMAGE")
mix = next(n for n in bpy.data.materials["fur"].node_tree.nodes if n.type == "MIX")
EZ = (BOXD[2] + BOXD[3]) / 2
for i, nm in enumerate(C["faces"]):
    FT.image = bpy.data.images[f"{nm}.png"]
    shoot(f"{PR}/f{i}a.png", (0, -0.1, EZ), 0, 1.3, 85)
    if i == 0: shoot(f"{PR}/f{i}b.png", (0, -0.1, EZ), 35, 1.3, 85)
FT.image = bpy.data.images[f"{C['faces'][0]}.png"]
bpy.data.objects["Face"].hide_render = True; shoot(f"{PR}/f9.png", (0, -0.1, EZ), 0, 1.3, 85); bpy.data.objects["Face"].hide_render = False
shoot(f"{PR}/b1.png", (0, 0, 0.62), 0, 3.4, 85); shoot(f"{PR}/b2.png", (0, 0, 0.62), 90, 3.4, 85); shoot(f"{PR}/b3.png", (0, 0, 0.62), 180, 3.4, 85)
wrot("LeftArm", Ry(60)); wrot("RightArm", Ry(-60)); wrot("LeftUpLeg", Rx(-70)); wrot("LeftLeg", Rx(70)); wrot("Head", Rz(30)); bpy.context.view_layer.update()
shoot(f"{PR}/b4.png", (0, 0, 0.62), 25, 3.4, 85); shoot(f"{PR}/b5.png", (0, 0, 0.62), 90, 3.4, 85)
clear_pose(); bpy.context.view_layer.update()
for o in cloth: o.hide_render = True
for i, tint in enumerate((TINT, (0.25, 0.45, 0.95), (0.30, 0.18, 0.11))):
    mix.inputs[7].default_value = (*tint, 1); shoot(f"{PR}/t{i}.png", (0, 0, 0.62), 20, 3.4, 85)
mix.inputs[7].default_value = (*TINT, 1)
for o in cloth: o.hide_render = False
ARM.animation_data.action = bpy.data.actions["Walk"]
for i, f in enumerate((1, 7, 13, 19)): sc.frame_set(f); shoot(f"{PR}/w{i}.png", (0, 0, 0.6), 90, 3.4, 85)
print("PROOFS DONE")
