# The Smiler: a gaunt near-black crawler, mostly unseen; an enormous ivory needle grin and two pale eyes.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix, Quaternion
random.seed(7)
OUT = "/workspace/smiler"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
V = Vector

# ---------- skeleton points (Blender: Z up, front -Y) ----------
P = {
 "root": V((0, 0, 0)), "pelvis": V((0, 0.50, 0.74)), "spine": V((0, 0.12, 0.82)), "chest": V((0, -0.26, 0.92)),
 "neck": V((0, -0.50, 1.00)), "head": V((0, -0.64, 1.04)), "headEnd": V((0, -0.92, 1.10)),
}
def limb(side, front):
    s = 1 if side == "L" else -1
    if front:
        pts = [(0.17, -0.30, 0.90), (0.50, -0.52, 1.28), (0.66, -0.80, 0.74), (0.56, -1.00, 0.07), (0.56, -1.12, 0.02)]
    else:
        pts = [(0.14, 0.56, 0.72), (0.50, 0.42, 1.18), (0.68, 0.78, 0.58), (0.60, 0.98, 0.07), (0.60, 1.10, 0.02)]
    return [V((x * s, y, z)) for x, y, z in pts]
LIMBS = {}
for side in "LR":
    LIMBS["arm" + side] = limb(side, True)
    LIMBS["leg" + side] = limb(side, False)

# ---------- armature ----------
arm_data = bpy.data.armatures.new("SmilerRig"); rig = bpy.data.objects.new("SmilerRig", arm_data)
scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
eb = arm_data.edit_bones
def bone(name, h, t, parent=None, conn=False):
    b = eb.new(name); b.head, b.tail = h, t
    if parent: b.parent = eb[parent]; b.use_connect = conn
    return b
bone("root", V((0, 0, 0)), V((0, -0.3, 0)))
bone("pelvis", P["pelvis"], P["spine"], "root")
bone("spine", P["spine"], P["chest"], "pelvis", True)
bone("chest", P["chest"], P["neck"], "spine", True)
bone("neck", P["neck"], P["head"], "chest", True)
bone("head", P["head"], P["headEnd"], "neck", True)
bone("jaw", P["head"] + V((0, 0.02, -0.05)), P["head"] + V((0, -0.26, -0.13)), "head")
for nm, pts in LIMBS.items():
    par = "chest" if nm.startswith("arm") else "pelvis"
    for i in range(4):
        n = f"{nm}{i+1}"
        bone(n, pts[i], pts[i + 1], par if i == 0 else f"{nm}{i}", i > 0)
bpy.ops.object.mode_set(mode="OBJECT")

# ---------- body: skin-modifier graph, subdivided ----------
verts, edges, radii = [], [], []
def addv(p, r):
    verts.append(tuple(p)); radii.append(r); return len(verts) - 1
spineIdx = [addv(P["pelvis"] + V((0, 0.12, -0.03)), 0.07), addv(P["pelvis"], 0.10), addv(P["spine"], 0.085),
            addv((P["spine"] + P["chest"]) / 2, 0.12), addv(P["chest"], 0.135), addv(P["neck"] + V((0, 0.08, -0.02)), 0.07),
            addv(P["neck"], 0.045), addv(P["head"] + V((0, 0.03, 0)), 0.05)]
for a, b in zip(spineIdx, spineIdx[1:]): edges.append((a, b))
for nm, pts in LIMBS.items():
    front = nm.startswith("arm")
    start = spineIdx[4] if front else spineIdx[1]
    prev = start
    rs = [0.05, 0.034, 0.03, 0.022]
    for i, p in enumerate(pts):
        if i == 0:
            idx = addv(p, 0.055)
        else:
            mid = addv(pts[i - 1].lerp(p, 0.5), rs[min(i, 3)] * 0.8)  # thin shank between knobby joints
            edges.append((prev, mid)); prev = mid
            idx = addv(p, rs[min(i, 3)] * (1.2 if i < 4 else 0.6))
        edges.append((prev, idx)); prev = idx
    # long splayed claw-fingers off the wrist
    w = pts[3]; fwd = (pts[4] - pts[3]).normalized()
    side = V((1 if nm.endswith("L") else -1, 0, 0))
    for k, sp in enumerate((-0.6, 0.0, 0.6)):
        d = (fwd + side * sp).normalized()
        k1 = addv(w + d * 0.09 + V((0, 0, 0.025)), 0.012); edges.append((idx if False else prev, k1))
        k2 = addv(w + d * 0.19 + V((0, 0, -0.03)), 0.005); edges.append((k1, k2))
me = bpy.data.meshes.new("body"); me.from_pydata(verts, edges, []); me.update()
body = bpy.data.objects.new("Body", me); scene.collection.objects.link(body)
sk = body.modifiers.new("skin", "SKIN"); sk.use_smooth_shade = True
for v, r in zip(me.skin_vertices[0].data, radii): v.radius = (r, r * 0.9)
me.skin_vertices[0].data[spineIdx[1]].use_root = True
# flatten the ribcage a bit (deeper than wide): gaunt
for i in (3, 4): me.skin_vertices[0].data[spineIdx[i]].radius = (radii[spineIdx[i]] * 0.85, radii[spineIdx[i]] * 1.05)
sub = body.modifiers.new("sub", "SUBSURF"); sub.levels = sub.render_levels = 2
bpy.context.view_layer.objects.active = body
for m in list(body.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
# lumpy, emaciated surface: a noise displace
tex = bpy.data.textures.new("lump", "CLOUDS"); tex.noise_scale = 0.06
dm = body.modifiers.new("disp", "DISPLACE"); dm.texture = tex; dm.strength = 0.012; dm.mid_level = 0.5
bpy.ops.object.modifier_apply(modifier="disp")
# decimate to budget
dec = body.modifiers.new("dec", "DECIMATE"); dec.ratio = 0.55
bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.object.shade_smooth()

# ---------- ribs: thin arcs embedded in the chest ----------
ribs = []
for i in range(7):
    y = -0.36 + i * 0.065; t = (y - P["spine"].y) / (P["chest"].y - P["spine"].y)
    c = P["spine"].lerp(P["chest"], t)
    r = 0.115 * (1 - 0.25 * abs(i - 2) / 4)
    cu = bpy.data.curves.new(f"rib{i}", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.011; cu.bevel_resolution = 1
    sp = cu.splines.new("POLY"); n = 11; sp.points.add(n - 1)
    for k in range(n):
        a = math.radians(-150 + 300 * k / (n - 1))
        sp.points[k].co = (c.x + math.sin(a) * r * 0.92, c.y + 0.03 * abs(math.sin(a)), c.z + math.cos(a) * r * 1.02 - 0.01, 1)
    ob = bpy.data.objects.new(f"Rib{i}", cu); scene.collection.objects.link(ob); ribs.append(ob)
bpy.ops.object.select_all(action="DESELECT")
for ob in ribs: ob.select_set(True)
bpy.context.view_layer.objects.active = ribs[0]; bpy.ops.object.convert(target="MESH"); bpy.ops.object.join()
ribsObj = bpy.context.view_layer.objects.active; ribsObj.name = "Ribs"; bpy.ops.object.shade_smooth()

# ---------- head: a wide smooth skull, a hinged jaw, a throat, needle teeth, eyes ----------
H = P["head"] + V((0, -0.14, 0.01))
def ellipsoid(name, c, s, segs=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, location=c)
    o = bpy.context.active_object; o.name = name; o.scale = s; bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth(); return o
skull = ellipsoid("Skull", H + V((0, 0.03, 0.03)), (0.19, 0.17, 0.12))
# cut the skull's lower front away so the grin sits in a wide gash
bm = bmesh.new(); bm.from_mesh(skull.data)
for v in bm.verts:
    if v.co.z < H.z - 0.01 and v.co.y < H.y + 0.06:
        v.co.z = H.z - 0.01 + (v.co.z - (H.z - 0.01)) * 0.2
    # brow ridge pushes forward over the eyes; cranium elongated back
    if v.co.z > H.z + 0.05: v.co.y += 0.03
bm.to_mesh(skull.data); bm.free()
jaw = ellipsoid("Jaw", H + V((0, 0.01, -0.035)), (0.18, 0.16, 0.06))
bm = bmesh.new(); bm.from_mesh(jaw.data)
for v in bm.verts:
    if v.co.z > H.z - 0.035: v.co.z = H.z - 0.035 + (v.co.z - (H.z - 0.035)) * 0.25
    v.co.z -= max(0, -(v.co.y - H.y)) * 0.15  # chin hangs
bm.to_mesh(jaw.data); bm.free()
throat = ellipsoid("Throat", H + V((0, 0.02, -0.02)), (0.15, 0.12, 0.06), 16, 8)
eyes = [ellipsoid("Eye" + s, H + V((sx * 0.085, -0.135, 0.06)), (0.034, 0.02, 0.026), 14, 8) for s, sx in (("L", 1), ("R", -1))]

def needle(bmx, base, tip, r):
    up = (tip - base).normalized(); a = up.orthogonal().normalized(); b = up.cross(a)
    ring = [bmx.verts.new(base + (a * math.cos(k * 2.094) + b * math.sin(k * 2.094)) * r) for k in range(3)]
    t = bmx.verts.new(tip)
    for k in range(3): bmx.faces.new((ring[k], ring[(k + 1) % 3], t))
    bmx.faces.new(ring[::-1])
def grin(upper):
    bmx = bmesh.new()
    for row in range(2):
        n = 30 if row == 0 else 24
        for i in range(n):
            u = -1 + 2 * (i + 0.5 * row) / n
            ang = u * 1.25
            rx, ry = 0.175 - row * 0.02, 0.16 - row * 0.025
            x = math.sin(ang) * rx; y = -math.cos(ang) * ry
            zc = H.z - 0.012 + 0.05 * u * u  # the smile curls up to the cheeks
            L = (0.045 - 0.02 * abs(u) + random.uniform(-0.008, 0.012)) * (0.85 if row else 1)
            base = H + V((x, y, 0)); base.z = zc + (0.012 if upper else -0.012)
            tip = base + V((x * 0.06 * random.uniform(-1, 1), -0.004, -L if upper else L))
            needle(bmx, base, tip, 0.0065 if row == 0 else 0.005)
    m = bpy.data.meshes.new("teeth"); bmx.to_mesh(m); bmx.free()
    o = bpy.data.objects.new("TeethU" if upper else "TeethL", m); scene.collection.objects.link(o); return o
teethU, teethL = grin(True), grin(False)
# the grin's ivory gum line: a thin pale lip band that frames every tooth from a distance
def gumband(upper):
    cu = bpy.data.curves.new("gum", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.008
    sp = cu.splines.new("POLY"); n = 25; sp.points.add(n - 1)
    for k in range(n):
        u = -1 + 2 * k / (n - 1); ang = u * 1.25
        sp.points[k].co = (math.sin(ang) * 0.177, H.y - math.cos(ang) * 0.162, H.z - 0.012 + 0.05 * u * u + (0.014 if upper else -0.014), 1)
    o = bpy.data.objects.new("Gum", cu); scene.collection.objects.link(o)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH"); return bpy.context.active_object
gumU, gumL = gumband(True), gumband(False)

# ---------- materials ----------
def principled(name, base, rough, metal=0.0, emit=None, es=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    return m
skinMat = bpy.data.materials.new("shadow_skin"); skinMat.use_nodes = True
toothMat = principled("ivory_teeth", (0.86, 0.80, 0.64), 0.35, emit=(0.95, 0.9, 0.75), es=1.2)
eyeMat = principled("glow_eyes", (0.9, 0.95, 1.0), 0.2, emit=(0.85, 0.93, 1.0), es=12.0)
throatMat = principled("throat", (0.06, 0.005, 0.008), 0.3)

# ---------- bake a procedural skin texture (veined, mottled near-black) ----------
for o in (body, ribsObj, skull, jaw):
    o.data.materials.clear(); o.data.materials.append(skinMat)
bpy.ops.object.select_all(action="DESELECT")
for o in (body, ribsObj, skull, jaw): o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join(); body = bpy.context.active_object
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01); bpy.ops.object.mode_set(mode="OBJECT")
img = bpy.data.images.new("smiler_skin", 1024, 1024)
nt = skinMat.node_tree; N = nt.nodes; Lk = nt.links
bsdf = N["Principled BSDF"]
texc = N.new("ShaderNodeTexCoord"); noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 18; noise.inputs["Detail"].default_value = 8
vor = N.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 14
ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.012, 0.008, 0.012, 1); ramp.color_ramp.elements[1].color = (0.07, 0.045, 0.05, 1)
vr = N.new("ShaderNodeValToRGB"); vr.color_ramp.elements[0].position = 0.0; vr.color_ramp.elements[0].color = (0.11, 0.03, 0.04, 1); vr.color_ramp.elements[1].position = 0.06; vr.color_ramp.elements[1].color = (1, 1, 1, 1)
mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 0.6
Lk.new(texc.outputs["Object"], noise.inputs["Vector"]); Lk.new(texc.outputs["Object"], vor.inputs["Vector"])
Lk.new(noise.outputs["Fac"], ramp.inputs["Fac"]); Lk.new(vor.outputs["Distance"], vr.inputs["Fac"])
Lk.new(ramp.outputs["Color"], mix.inputs[6]); Lk.new(vr.outputs["Color"], mix.inputs[7])
emitN = N.new("ShaderNodeEmission"); Lk.new(mix.outputs[2], emitN.inputs["Color"])
outN = N["Material Output"]; Lk.new(emitN.outputs["Emission"], outN.inputs["Surface"])
imgN = N.new("ShaderNodeTexImage"); imgN.image = img; N.active = imgN
scene.render.engine = "CYCLES"; scene.cycles.samples = 4; scene.cycles.device = "CPU"
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="EMIT", margin=4)
img.filepath_raw = OUT + "/skin.png"; img.file_format = "PNG"; img.save()
# final skin: baked albedo, a damp sheen
for n in (texc, noise, vor, ramp, vr, mix, emitN): N.remove(n)
Lk.new(imgN.outputs["Color"], bsdf.inputs["Base Color"]); Lk.new(bsdf.outputs["BSDF"], outN.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.42; bsdf.inputs["Specular IOR Level"].default_value = 0.6

for o, m in ((teethU, toothMat), (teethL, toothMat), (gumU, toothMat), (gumL, toothMat), (eyes[0], eyeMat), (eyes[1], eyeMat), (throat, throatMat)):
    o.data.materials.clear(); o.data.materials.append(m)

# ---------- skinning ----------
headBits = [teethU, gumU, eyes[0], eyes[1], throat]; jawBits = [teethL, gumL]
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
# the skull and jaw on their bones whole: reassign skull/jaw verts by position
vg = {g.name: g for g in body.vertex_groups}
for g in ("head", "jaw"):
    if g not in vg: vg[g] = body.vertex_groups.new(name=g)
headC = H
for v in body.data.vertices:
    d = (v.co - headC)
    if d.length < 0.23 and v.co.y < P["head"].y + 0.06:
        for g in body.vertex_groups: g.remove([v.index])
        isJaw = v.co.z < H.z - 0.025
        vg["jaw" if isJaw else "head"].add([v.index], 1.0, "REPLACE")
for o in headBits + jawBits:
    g = o.vertex_groups.new(name="head" if o in headBits else "jaw"); g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    o.shade_smooth() if False else None
bpy.ops.object.select_all(action="DESELECT")
for o in headBits + jawBits: o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.join(); body = bpy.context.active_object
body.name = "Smiler"
for m in list(body.modifiers):
    if m.type == "ARMATURE": m.object = rig
if not any(m.type == "ARMATURE" for m in body.modifiers): body.modifiers.new("arm", "ARMATURE").object = rig
body.parent = rig

# ---------- clips ----------
rig.rotation_mode = "XYZ"
for pb in rig.pose.bones: pb.rotation_mode = "QUATERNION"
REST = {b.name: b.matrix_local.to_3x3() for b in arm_data.bones}
AX = {"x": V((1, 0, 0)), "y": V((0, 1, 0)), "z": V((0, 0, 1))}
def q(name, *rots):  # rotations about WORLD axes (rest frame), degrees -> local quaternion
    out = Quaternion()
    for ax, deg in rots:
        a = AX[ax] if isinstance(ax, str) else ax
        if name.endswith("R") and ax in ("y", "z"): deg = -deg  # mirror sides
        loc = (REST[name].inverted() @ a).normalized()
        out = out @ Quaternion(loc, math.radians(deg))
    return out
FPS = 30; scene.render.fps = FPS
def clip(name, dur, keys):
    """keys: {time: {bone: [(axis,deg)...] | ('loc', vec) | ('scale', vec)}}"""
    act = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = act
    times = sorted(keys)
    bones = set(b for t in times for b in keys[t])
    for t in times:
        f = 1 + round(t * FPS)
        for pb in rig.pose.bones:
            pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
        for bn, val in keys[t].items():
            pb = rig.pose.bones[bn.split(":")[0]]
            if isinstance(val, tuple) and val[0] == "loc":
                pb.location = REST[pb.name].inverted() @ V(val[1])
            elif isinstance(val, tuple) and val[0] == "scale": pb.scale = val[1]
            else: pb.rotation_quaternion = q(pb.name, *val)
        for pb in rig.pose.bones:
            if pb.name in bones or any(k.split(":")[0] == pb.name for k in bones):
                pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f); pb.keyframe_insert("scale", frame=f)
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act)
    rig.animation_data.action = None
def merge(*ds):
    o = {}
    for d in ds:
        for k, v in d.items(): o[k] = v
    return o

ALL = [b.name for b in arm_data.bones]
def neutral(): return {b: [("x", 0)] for b in ALL if b != "root"}
# idle: slow head-tilt sway, breathing, a finger flex
idle = {}
for i, t in enumerate((0, 1.0, 2.0, 3.0, 4.0)):
    s = [0, 1, 0, -1, 0][i]
    idle[t] = merge(neutral(), {"head": [("y", 22 * s), ("x", -4 * abs(s))], "neck": [("y", 6 * s), ("z", 5 * s)],
                                "chest": [("x", 2 + 2 * (i % 2))], "jaw": [("x", -3 * abs(s))],
                                "armL4": [("x", -8 * (i % 2))], "armR4": [("x", -8 * ((i + 1) % 2))]})
clip("idle", 4.0, idle)
# skitter: diagonal pairs, fast; reach/sweep at the shoulder, lift through the elbow, spine snaking
sk = {}
for i in range(5):
    t = i * 0.125; ph = i % 4
    s = [1, 0, -1, 0, 1][i]; l = [0, 1, 0, -1, 0][i]
    A, B = s, -s
    sk[t] = merge(neutral(), {
        "armL1": [("z", -26 * A), ("y", 10 * max(0, l))], "legR1": [("z", -24 * A), ("y", 10 * max(0, l))],
        "armR1": [("z", -26 * B), ("y", 10 * max(0, -l))], "legL1": [("z", -24 * B), ("y", 10 * max(0, -l))],
        "armL2": [("x", -18 * max(0, l))], "legR2": [("x", 18 * max(0, l))],
        "armR2": [("x", -18 * max(0, -l))], "legL2": [("x", 18 * max(0, -l))],
        "spine": [("z", 7 * s)], "chest": [("z", -6 * s), ("y", 4 * l)], "head": [("z", 8 * s), ("y", -10 * l)],
        "root": ("loc", (0, 0, 0.03 * abs(l)))})
clip("skitter", 0.5, sk)
# freeze: rigid, splayed tall, head snapped up, a fine tremor
fz = {}
base = {"armL1": [("y", 18)], "armR1": [("y", 18)], "legL1": [("y", 14)], "legR1": [("y", 14)], "head": [("x", -22)], "neck": [("x", -12)], "jaw": [("x", -6)], "root": ("loc", (0, 0, 0.06))}
for i, t in enumerate((0, 0.1, 0.2, 0.3, 0.4)):
    tr = [0, 1, -1, 1, 0][i]
    fz[t] = merge(neutral(), base, {"head": [("x", -22), ("y", 2.5 * tr)], "armL3": [("x", 1.5 * tr)], "armR3": [("x", -1.5 * tr)]})
clip("freeze", 0.4, fz)
# lunge-bite: coil back, launch, jaw unhinges wide, snap shut
lb = {
 0.0: neutral(),
 0.18: merge(neutral(), {"root": ("loc", (0, 0.12, -0.12)), "pelvis": [("x", 8)], "head": [("x", -18)], "armL2": [("x", 25)], "armR2": [("x", 25)], "legL2": [("x", -20)], "legR2": [("x", -20)], "jaw": [("x", 20)]}),
 0.32: merge(neutral(), {"root": ("loc", (0, -0.28, 0.14)), "pelvis": [("x", -10)], "spine": [("x", -8)], "neck": [("x", 14)], "head": [("x", -30)], "jaw": [("x", 78)],
                          "armL1": [("z", -35), ("y", 25)], "armR1": [("z", -35), ("y", 25)], "armL2": [("x", -30)], "armR2": [("x", -30)], "legL1": [("z", -20)], "legR1": [("z", -20)]}),
 0.46: merge(neutral(), {"root": ("loc", (0, -0.25, 0.04)), "neck": [("x", 18)], "head": [("x", 10)], "jaw": [("x", 0)], "armL1": [("z", -15)], "armR1": [("z", -15)]}),
 0.7: neutral(),
}
clip("lunge-bite", 0.7, lb)
# recoil: flinch back, head wrenched aside, a forearm thrown up against the light
rc = {
 0.0: neutral(),
 0.12: merge(neutral(), {"root": ("loc", (0, 0.2, -0.05)), "head": [("y", 35), ("z", -40), ("x", -10)], "neck": [("z", -20)], "armL1": [("x", 40), ("y", 30)], "armL2": [("x", -40)], "jaw": [("x", 25)], "chest": [("x", -8)]}),
 0.35: merge(neutral(), {"root": ("loc", (0, 0.16, -0.03)), "head": [("y", 28), ("z", -30)], "neck": [("z", -14)], "armL1": [("x", 30), ("y", 24)], "armL2": [("x", -30)], "jaw": [("x", 12)]}),
 0.6: neutral(),
}
clip("recoil", 0.6, rc)
# death: buckles, limbs fold under, the body sinks and spreads flat into the carpet
dt = {
 0.0: neutral(),
 0.35: merge(neutral(), {"head": [("x", -40), ("y", 20)], "jaw": [("x", 60)], "armL1": [("y", 30)], "armR1": [("y", 30)], "chest": [("x", -10)], "root": ("loc", (0, 0, 0.05))}),
 0.9: merge(neutral(), {"root": ("loc", (0, 0, -0.35)), "head": [("x", 30), ("y", 40)], "jaw": [("x", 35)], "neck": [("x", 25)],
                         "armL2": [("x", 60)], "armR2": [("x", 60)], "legL2": [("x", -60)], "legR2": [("x", -60)], "armL3": [("x", -40)], "armR3": [("x", -40)], "legL3": [("x", 40)], "legR3": [("x", 40)]}),
 1.6: merge(neutral(), {"root:s": ("scale", (1.35, 1.35, 0.12)), "head": [("x", 40), ("y", 40)], "jaw": [("x", 30)], "neck": [("x", 30)],
                         "armL2": [("x", 70)], "armR2": [("x", 70)], "legL2": [("x", -70)], "legR2": [("x", -70)]}),
}
# root carries both the sink and the melt
dt[1.6]["root"] = ("loc", (0, 0, -0.4)); del dt[1.6]["root:s"]
clip("death", 1.6, dt)
# melt: scale the pelvis/chest flat on the last key (rest frame scale is per bone; root scale squashes all)
act = bpy.data.actions["death"]; rig.animation_data.action = act
pr = rig.pose.bones["root"]; pr.scale = (1, 1, 1); pr.keyframe_insert("scale", frame=1 + round(0.9 * FPS))
pr.scale = (1.4, 0.12, 1.4); pr.keyframe_insert("scale", frame=1 + round(1.6 * FPS))  # root bone points -Y: local Y = world -Y... flatten via world Z below
rig.animation_data.action = None

# ---------- proof ----------
bpy.ops.object.select_all(action="DESELECT")
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.32, 0.28, 0.15, 1); world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
bpy.ops.mesh.primitive_plane_add(size=8); floor = bpy.context.active_object
fm = principled("carpet", (0.35, 0.29, 0.14), 0.9); floor.data.materials.append(fm)
bpy.ops.object.light_add(type="AREA", location=(0.5, -1.5, 3)); bpy.context.active_object.data.energy = 250; bpy.context.active_object.data.size = 2
scene.render.resolution_x = scene.render.resolution_y = 656; scene.cycles.samples = 24
def cam(name, loc, tgt):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); scene.collection.objects.link(c); c.location = loc
    d = V(tgt) - V(loc); c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); return c
cams = [cam("A", (1.8, -2.6, 1.6), (0, -0.1, 0.65)), cam("B", (0, -1.7, 1.1), (0, -0.78, 1.0)), cam("C", (2.8, 0.2, 1.0), (0, 0, 0.6))]
poses = [("idle", 20), ("lunge-bite", 10), ("skitter", 4)]
for c, (an, fr) in zip(cams, poses):
    rig.animation_data.action = bpy.data.actions[an]; scene.frame_set(fr)
    scene.camera = c; scene.render.filepath = f"{OUT}/proof_{c.name}.png"; bpy.ops.render.render(write_still=True)
rig.animation_data.action = None
bpy.data.objects.remove(floor)
dg = bpy.context.evaluated_depsgraph_get()
print("TRIS", sum(len(o.evaluated_get(dg).data.loop_triangles) for o in scene.objects if o.type == "MESH"))
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT + "/smiler.glb", use_selection=True, export_apply=False, export_animations=True,
                          export_animation_mode="NLA_TRACKS", export_yup=True)
print("EXPORTED")
