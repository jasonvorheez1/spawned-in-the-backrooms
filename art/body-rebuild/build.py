# Shelly's female base (/cdn/model-humanoid-genshin-anime-female-base-yfbdzh16.glb), rigged by hand:
# a mixamo skeleton measured onto the mesh (Tripo's auto-rig put both shoulder joints in the middle of the chest).
import bpy, math, mathutils, sys, os
MALE = os.environ.get("MALE") == "1"   # MALE=1: the male built off Shelly's female base (she asked for one: "they never made a male version")
SRC = "/workspace/rb/base_one.glb"; OUT = "/workspace/rb/male_rig.glb" if MALE else "/workspace/rb/female_rig.glb"; PROOF = "/workspace/rb/proof_m" if MALE else "/workspace/rb/proof"
os.makedirs(PROOF, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in bpy.data.objects:
    if o.type != 'MESH': o.select_set(False)
V = mathutils.Vector
# landmarks (m, Blender Z-up, face toward +Y), measured from slices of the mesh
J = {
 "Hips": (0, .08, .95), "Spine": (0, .08, 1.06), "Spine1": (0, .08, 1.18), "Spine2": (0, .08, 1.31),
 "Neck": (0, .08, 1.53), "Head": (0, .09, 1.64), "HeadTop_End": (0, .09, 1.94),
}
for s, x in (("Left", 1), ("Right", -1)):
    J[s+"Shoulder"] = (x*.03, .08, 1.45); J[s+"Arm"] = (x*.155, .09, 1.43); J[s+"ForeArm"] = (x*.38, .13, 1.285)
    J[s+"Hand"] = (x*.555, .13, 1.175); J[s+"HandEnd"] = (x*.665, .14, 1.105)
    J[s+"UpLeg"] = (x*.085, .09, .93); J[s+"Leg"] = (x*.085, .095, .5); J[s+"Foot"] = (x*.085, .1, .085)
    J[s+"ToeBase"] = (x*.085, .16, .02); J[s+"Toe_End"] = (x*.085, .2, .02)
# fingers: measured along the hand axis (t from the wrist, y across the knuckles, s toward the palm)
HA = V((.555, .13, 1.175)); HD = (V((.665, .14, 1.105)) - HA).normalized(); HS = HD.cross(V((0, 1, 0))).normalized()
def hp(t, y, s=-.012): return HA + HD * t + V((0, 1, 0)) * y + HS * s
FING = {"Index": (-.02, .128), "Middle": (.005, .135), "Ring": (.03, .128), "Pinky": (.05, .105)}
HANDCH = []
for side_, xs in (("Left", 1), ("Right", -1)):
    def m(p): return (p.x * xs, p.y, p.z)
    for f, (y, tip) in FING.items():
        ts = [.05, .05 + (tip - .05) * .45, .05 + (tip - .05) * .75, tip]
        for i in range(4): J[f"{side_}Hand{f}{i+1}"] = m(hp(ts[i], y))
        J[f"{side_}Hand{f}End"] = m(hp(tip + .01, y))
    thumb = [hp(-.02, -.035, -.02), hp(.01, -.055, -.03), hp(.03, -.062, -.032), hp(.048, -.068, -.03)]
    for i in range(4): J[f"{side_}HandThumb{i+1}"] = m(thumb[i])
    J[f"{side_}HandThumbEnd"] = m(hp(.058, -.07, -.03))
    for f in list(FING) + ["Thumb"]:
        HANDCH.append((f"{side_}Hand{f}1", side_ + "Hand", f"{side_}Hand{f}2"))
        HANDCH.append((f"{side_}Hand{f}2", f"{side_}Hand{f}1", f"{side_}Hand{f}3"))
        HANDCH.append((f"{side_}Hand{f}3", f"{side_}Hand{f}2", f"{side_}Hand{f}4"))
        HANDCH.append((f"{side_}Hand{f}4", f"{side_}Hand{f}3", f"{side_}Hand{f}End"))
SH, GROW = .055, 1.06   # male: arms ride out with the broader shoulders; 6% taller
if MALE:
    for k, (x, y, z) in list(J.items()):
        if "Arm" in k or "Hand" in k: x += SH * (1 if x > 0 else -1)
        J[k] = (x * GROW, y * GROW, z * GROW)
CHAIN = [("Hips",None,"Spine"),("Spine","Hips","Spine1"),("Spine1","Spine","Spine2"),("Spine2","Spine1","Neck"),("Neck","Spine2","Head"),("Head","Neck","HeadTop_End")]
for s in ("Left","Right"):
    CHAIN += [(s+"Shoulder","Spine2",s+"Arm"),(s+"Arm",s+"Shoulder",s+"ForeArm"),(s+"ForeArm",s+"Arm",s+"Hand"),(s+"Hand",s+"ForeArm",s+"HandEnd"),
              (s+"UpLeg","Hips",s+"Leg"),(s+"Leg",s+"UpLeg",s+"Foot"),(s+"Foot",s+"Leg",s+"ToeBase"),(s+"ToeBase",s+"Foot",s+"Toe_End")]
CHAIN += HANDCH
ad = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", ad); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
for name, par, tail in CHAIN:
    b = ad.edit_bones.new(name); b.head = V(J[name]); b.tail = V(J[tail])
    if par: b.parent = ad.edit_bones[par]; b.use_connect = (V(J[name]) - ad.edit_bones[par].tail).length < 1e-4
    b.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')
# weights: join, auto weights from bone heat
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.data.objects if o.type == 'EMPTY']: bpy.data.objects.remove(o)
bpy.ops.object.join(); body = bpy.context.view_layer.objects.active
body.name = "Body"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0001); bpy.ops.object.mode_set(mode='OBJECT')
def sm(a, b_, x):
    t = max(0.0, min(1.0, (x - a) / (b_ - a))); return t * t * (3 - 2 * t)
def bump(a, b_, c_, d, x): return sm(a, b_, x) * (1 - sm(c_, d, x))
if MALE:
    vs = body.data.vertices
    arm = [sm(.15, .2, abs(v.co.x)) * sm(1.08, 1.18, v.co.z) * (1 - sm(1.56, 1.6, v.co.z)) for v in vs]
    # the base faces -Y (measured: the bust and nose are the min-y side). front line read under the bust
    def front(z): return min((v.co.y for v in vs if abs(v.co.z - z) < .015 and abs(v.co.x) < .1), default=-.03)
    yb = front(1.22); print("chest front", round(yb, 3))
    # the silhouette by measurement: female half-widths per z (hips .183 at 1.04, waist .094 at 1.34) remapped to a male line
    W = [(.8, 1), (.9, .88), (1.04, .84), (1.12, .88), (1.2, 1.0), (1.28, 1.25), (1.34, 1.42), (1.4, 1.38), (1.46, 1.22), (1.52, 1.16), (1.58, 1.0)]
    def wf(z):
        if z <= W[0][0] or z >= W[-1][0]: return 1.0
        for (z0, f0), (z1, f1) in zip(W, W[1:]):
            if z <= z1: return f0 + (f1 - f0) * (z - z0) / (z1 - z0)
    for i, v in enumerate(vs):
        x, y, z = v.co; sg = 1 if x >= 0 else -1; A = arm[i]; T = 1 - A
        f = wf(z); x = x * (1 + (f - 1) * T) + sg * SH * A
        y = .08 + (y - .08) * (1 + (f - 1) * .35 * T * bump(1.2, 1.26, 1.4, 1.46, z))   # ribcage gets depth too
        if y > .1: y = .1 + (y - .1) * (1 - .45 * bump(.9, .98, 1.1, 1.18, z) * T)        # smaller seat
        band = bump(1.24, 1.3, 1.48, 1.53, z) * (1 - sm(.1, .16, abs(x))) * T         # flat chest: the bust pushed back to the line
        line = yb - .008 * bump(1.36, 1.4, 1.46, 1.5, z) * bump(.01, .04, .09, .12, abs(x))
        if y < line: y = y + (line - y) * band
        nk = bump(1.48, 1.52, 1.6, 1.66, z) * T                                    # thicker neck
        x *= 1 + .3 * nk; y = .08 + (y - .08) * (1 + .18 * nk)
        jaw = bump(1.6, 1.64, 1.72, 1.77, z) * T                                   # squarer, wider jaw
        x *= 1 + .1 * jaw
        if A > .5: y = .11 + (y - .11) * (1 + .15 * A)                             # fuller arms
        v.co = mathutils.Vector((x * GROW, y * GROW, z * GROW))
    # his face (measured on the base, pre-grow): eyes are small islands at z 1.715-1.782, |x| .02-.095; a lash line at 1.787-1.794; chin at 1.641
    par = list(range(len(vs)))
    def fnd(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for e in body.data.edges:
        a_, b_ = fnd(e.vertices[0]), fnd(e.vertices[1])
        if a_ != b_: par[a_] = b_
    isl = {}
    for i in range(len(vs)): isl.setdefault(fnd(i), []).append(i)
    G_ = GROW
    for ids in isl.values():
        if len(ids) > 200: continue
        c = sum((vs[i].co for i in ids), mathutils.Vector()) / len(ids); z0 = c.z / G_
        if 1.765 < z0 < 1.8 and len(ids) < 120 and max(abs(vs[i].co.x / G_) for i in ids) > .07:   # upper lash line: the outer wing folded down along the lid, no flick
            mid = [i for i in ids if .04 < abs(vs[i].co.x / G_) < .062]
            if mid:
                zl = sum(vs[i].co.z for i in mid) / len(mid); yl = sum(vs[i].co.y for i in mid) / len(mid)
                for i in ids:
                    t = sm(.058, .085, abs(vs[i].co.x / G_))
                    if vs[i].co.z > zl: vs[i].co.z -= t * (vs[i].co.z - zl) * .95
                    vs[i].co.y -= t * (vs[i].co.y - yl) * .8   # tips pulled back to the lid, nothing pokes out side-on
                    vs[i].co.x *= 1 - .06 * t
                for i in ids:   # the far ends: clipped at |x| .08 and laid onto the lid, so no tip shows past the corner side-on
                    ax_ = abs(vs[i].co.x / G_)
                    if ax_ > .08: vs[i].co.x = math.copysign(.08 * G_, vs[i].co.x)
                    if vs[i].co.z > zl:   # the fringe above the lid line: pressed into a band on the lid, strands no longer stand off the face
                        vs[i].co.z = zl + (vs[i].co.z - zl) * .35; vs[i].co.y = yl + (vs[i].co.y - yl) * .2
        mx_ = max(abs(vs[i].co.x / G_) for i in ids)
        if 1.72 < z0 < 1.8 and mx_ > .07 and len(ids) > 20: print("CAND", len(ids), round(z0, 4), round(mx_, 3), round(c.x / G_, 3), round(c.y / G_, 3))
        if 1.748 < z0 < 1.778 and mx_ > .085 and abs(c.x / G_) > .03 and len(ids) >= 100:   # the real upper lash strip (measured on the export: z 1.854-1.883 grown, |x| to .099): outer third laid onto the lid
            mid = [i for i in ids if .045 < abs(vs[i].co.x / G_) < .065]
            zl = sorted(vs[i].co.z for i in mid)[len(mid) // 2]; yl = sorted(vs[i].co.y for i in mid)[len(mid) // 2]
            print("LASH island", len(ids), round(z0, 3), round(mx_, 3))
            for i in ids:
                t = sm(.065, .088, abs(vs[i].co.x / G_))
                if vs[i].co.z > zl: vs[i].co.z -= t * (vs[i].co.z - zl) * .85
                vs[i].co.y += t * (yl - vs[i].co.y) * .85
                vs[i].co.x *= 1 - .05 * t
            continue
        if 1.71 < z0 < 1.785 and .02 < abs(c.x / G_) < .1 and c.y / G_ < .05:          # eyes: narrower, less tall, a touch lower
            for i in ids: d = vs[i].co - c; vs[i].co = c + mathutils.Vector((d.x * .88, d.y, d.z * .78)) + mathutils.Vector((0, 0, -.003))
        elif 1.784 < z0 < 1.8 and abs(c.x / G_) > .02:                                    # brow/lash line: heavier, flatter
            for i in ids: d = vs[i].co - c; vs[i].co = c + mathutils.Vector((d.x * 1.06, d.y, d.z * 1.9)) + mathutils.Vector((0, 0, -.003))   # brows: thicker, lower
        elif 1.66 < z0 < 1.7 and abs(c.x / G_) < .03:                                     # mouth: a bit wider, thinner
            for i in ids: d = vs[i].co - c; vs[i].co = c + mathutils.Vector((d.x * 1.08, d.y, d.z * .85))
    for v in vs:
        z0 = v.co.z / G_
        if v.co.y / G_ < .02:
            v.co.y -= .004 * G_ * bump(1.775, 1.79, 1.81, 1.83, z0) * (1 - sm(.03, .08, abs(v.co.x / G_)))   # brow ridge
            v.co.y -= .004 * G_ * bump(1.635, 1.645, 1.66, 1.675, z0) * (1 - sm(.02, .045, abs(v.co.x / G_)))  # squarer chin
    body.data.update()
body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); zs=[(body.matrix_world@v.co) for v in ev.data.vertices]; print("restbox",[round(min(p[i] for p in zs),3) for i in range(3)],[round(max(p[i] for p in zs),3) for i in range(3)], "parent", body.parent, tuple(body.matrix_world.to_scale()))
# heat weighting misses some islands (eyes, lashes, inner mouth): each takes the weights of its nearest weighted vertex
from mathutils import kdtree
wv = [v for v in body.data.vertices if v.groups and sum(g.weight for g in v.groups) > 0.01]
kd = kdtree.KDTree(len(wv))
for i, v in enumerate(wv): kd.insert(v.co, i)
kd.balance()
miss = [v for v in body.data.vertices if not v.groups or sum(g.weight for g in v.groups) <= 0.01]
print("unweighted at z", sorted(set(round(v.co.z, 1) for v in miss)))
for v in miss:
    _, i, _ = kd.find(v.co); src = wv[i]
    for g in src.groups: body.vertex_groups[g.group].add([v.index], g.weight, 'REPLACE')
print("groups", len(body.vertex_groups), "unweighted", sum(1 for v in body.data.vertices if not v.groups))
# elbows: heat weights hand off arm to forearm in a hard step, which pinches a bent elbow; blend the hand-off wider (Laplacian on those two groups)
nbr = [[] for _ in body.data.vertices]
for e in body.data.edges: i, j = e.vertices; nbr[i].append(j); nbr[j].append(i)
def gw(v, gi):
    for g in v.groups:
        if g.group == gi: return g.weight
    return 0.0
for side_ in ("Left", "Right"):
    ga, gf = body.vertex_groups[side_ + "Arm"], body.vertex_groups[side_ + "ForeArm"]
    vs = body.data.vertices
    A = [gw(v, ga.index) for v in vs]; F = [gw(v, gf.index) for v in vs]
    zone = [i for i in range(len(vs)) if A[i] + F[i] > 0.5 and min(A[i], F[i]) > 0.0 or (A[i] > 0.05 and any(F[k] > 0.05 for k in nbr[i]))]
    zs = set(zone)
    for k in list(zs):
        for n in nbr[k]: zs.add(n)
    zone = [i for i in zs if A[i] + F[i] > 0.9]
    tot = {i: A[i] + F[i] for i in zone}
    for _ in range(8):
        nA = dict()
        for i in zone:
            ns = [k for k in nbr[i] if A[k] + F[k] > 0.9]
            if not ns: continue
            fa = sum(A[k] / (A[k] + F[k]) for k in ns) / len(ns)
            nA[i] = 0.5 * (A[i] / tot[i]) + 0.5 * fa
        for i, fa in nA.items(): A[i] = fa * tot[i]; F[i] = (1 - fa) * tot[i]
    for i in zone:
        ga.add([i], A[i], 'REPLACE'); gf.add([i], F[i], 'REPLACE')
    print(side_, "elbow verts blended", len(zone))
# smooth (Shelly: "still seeing jagginess"): one Catmull-Clark level applied after weighting, so every new vertex inherits blended weights
nb = len(body.data.polygons)
sub = body.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 1; sub.quality = 3
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_move_to_index(modifier="sub", index=0); bpy.ops.object.modifier_apply(modifier="sub")
for poly in body.data.polygons: poly.use_smooth = True
print("faces", nb, "->", len(body.data.polygons), "unweighted after", sum(1 for v in body.data.vertices if not v.groups))
if MALE:   # his face picture: the lash strip repainted with the wings and spikes smoothed off
    new = bpy.data.images.load("/workspace/art/body-rebuild/male_face_tex.png"); new.pack()
    for m in bpy.data.materials:
        if m.node_tree and m.name == "Head_Skin":
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE": n.image = new
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_animations=False)
# proof: arms down + elbow bent, knee bent
P_ = rig.pose.bones
def aim(n, d):
    b = P_[n]; bpy.context.view_layer.update()
    q = (b.tail - b.head).normalized().rotation_difference(V(d).normalized())
    m = b.matrix.copy(); t = m.to_translation(); nm = (q.to_matrix() @ m.to_3x3()).to_4x4(); nm.translation = t
    b.matrix = nm; bpy.context.view_layer.update()
for s, x in (("Left", 1), ("Right", -1)):
    aim(s+"Arm", (x*.18, 0.05, -1)); aim(s+"ForeArm", (x*.1, .9, -.5))
def curl(n, deg, axis=(0, 1, 0)):
    b = P_[n]; bpy.context.view_layer.update()
    dv = (b.tail - b.head); q = mathutils.Quaternion(V(axis), math.radians(deg))
    aim(n, q @ dv)
for side_, xs in (("Left", 1), ("Right", -1)):
    for f in FING:
        for i, a_ in ((1, 25), (2, 35), (3, 25)): curl(f"{side_}Hand{f}{i}", a_ * xs)
    for i, a_ in ((2, 20), (3, 20)): curl(f"{side_}HandThumb{i}", a_ * xs)
aim("LeftUpLeg", (0, .7, -.7)); aim("LeftLeg", (0, -.5, -1))
aim("RightArm", (-.7, .1, .1)); aim("RightForeArm", (-.2, .3, 1))
dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); zs=[(body.matrix_world@v.co) for v in ev.data.vertices]; print("posebox",[round(min(p[i] for p in zs),3) for i in range(3)],[round(max(p[i] for p in zs),3) for i in range(3)])
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 500; sc.render.resolution_y = 700
w = bpy.data.worlds.new("w"); w.color = (.55, .55, .6); sc.world = w
c = V((0, .08, 1.25))
bpy.context.view_layer.update()
hc = rig.matrix_world @ P_["RightHand"].tail
for name, d, cc, dist in (("front", (0, 1, .1), c, 1.5), ("q", (.9, .7, .25), c, 1.5), ("hand", (-.6, .8, .1), hc, .35), ("hand2", (-.9, -.3, .1), hc, .35)):
    c_ = cc
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(cam)
    cam.location = c_ + V(d).normalized() * dist; cam.data.lens = 35
    cam.rotation_euler = (c_ - cam.location).to_track_quat('-Z', 'Y').to_euler()
    L = bpy.data.objects.new(name+"L", bpy.data.lights.new(name+"L", "SUN")); sc.collection.objects.link(L); L.rotation_euler = cam.rotation_euler; L.data.energy = 3
    sc.camera = cam; sc.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True); sc.collection.objects.unlink(L)
