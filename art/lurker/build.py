# The Lurker: 2.4 m emaciated wallpaper-yellow humanoid. Skin-modifier body -> subsurf -> sculpted ribs/vertebrae,
# torn-slit mouth on a Jaw bone, baked mottled skin, Mixamo-named rig, NLA clips. Blender front -Y (place forward "+z").
import bpy, bmesh, math, random, os
from mathutils import Vector, Quaternion, Matrix
OUT = "/workspace/lurker"; os.makedirs(OUT, exist_ok=True)
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
S = 1.0
V = lambda x, y, z: Vector((x * S, y * S, z * S))

# ---------- skeleton points for the skin modifier ----------
verts, radii, edges = [], [], []
def pt(p, r):
    verts.append(Vector(p)); radii.append(r); return len(verts) - 1
def chain(start_idx, pts, step=0.04):
    """pts: [(pos, r)]; start_idx: existing vertex or None. interpolates every `step` m."""
    prev = start_idx
    if prev is None:
        prev = pt(*pts[0]); pts = pts[1:]
    out = [prev]
    for (p, r) in pts:
        a, ra = verts[prev], radii[prev]
        b = Vector(p); n = max(1, int((b - a).length / step))
        for i in range(1, n + 1):
            t = i / n
            k = pt(a.lerp(b, t), ra + (r - ra) * t)
            edges.append((prev, k)); prev = k
        out.append(prev)
    return out

torso = chain(None, [((0, 0, 1.15), 0.10), ((0, 0.0, 1.22), 0.105), ((0, 0.0, 1.36), 0.075), ((0, 0.0, 1.5), 0.115),
                     ((0, 0.0, 1.68), 0.135), ((0, 0.01, 1.86), 0.13), ((0, 0.01, 1.96), 0.09), ((0, 0.0, 2.03), 0.05),
                     ((0, -0.01, 2.1), 0.043)], 0.022)
pelvis, chest_top = torso[1], torso[6]  # indices of the listed anchor points
neck_top = torso[-1]
head = chain(neck_top, [((0, -0.02, 2.16), 0.07), ((0, -0.025, 2.24), 0.104), ((0, -0.025, 2.33), 0.112),
                        ((0, -0.02, 2.42), 0.095), ((0, -0.015, 2.49), 0.05)], 0.02)

def side(sx):
    sh = chain(chest_top, [((0.19 * sx, 0.015, 1.955), 0.05)], 0.04)[-1]
    a = math.radians(18)
    elbow = (0.19 * sx + sx * 0.52 * math.sin(a), 0.015, 1.955 - 0.52 * math.cos(a))
    wrist = (elbow[0] + sx * 0.52 * math.sin(a), 0.015, elbow[2] - 0.52 * math.cos(a))
    palm = (wrist[0] + sx * 0.12 * math.sin(a), 0.015, wrist[2] - 0.12 * math.cos(a))
    arm = chain(sh, [((0.19 * sx + sx * 0.25 * math.sin(a), 0.015, 1.955 - 0.25 * math.cos(a)), 0.04),
                     (elbow, 0.036), (((elbow[0] + wrist[0]) / 2, 0.015, (elbow[2] + wrist[2]) / 2), 0.03),
                     (wrist, 0.022), (palm, 0.026)], 0.05)
    d = Vector((sx * math.sin(a), 0, -math.cos(a)))
    fingers = {}
    for name, dy, L in (("Index", -0.03, 0.25), ("Middle", -0.01, 0.28), ("Ring", 0.01, 0.26), ("Pinky", 0.03, 0.21)):
        base = Vector(palm) + Vector((0, dy, 0)) + d * 0.01
        k = pt(base, 0.011); edges.append((arm[-1], k))
        dd = (d + Vector((0, dy * 1.2, 0))).normalized()
        j1 = base + dd * L * 0.42; j2 = j1 + dd * L * 0.33; tip = j2 + dd * L * 0.25
        fingers[name] = [tuple(base), tuple(j1), tuple(j2), tuple(tip)]
        chain(k, [(j1, 0.0095), (j2, 0.008), (tip, 0.0045)], 0.03)
    tb = Vector(wrist) + d * 0.05 + Vector((0, -0.025, 0))
    k = pt(tb, 0.012); edges.append((arm[-3] if False else arm[-1], k))
    tdir = (d + Vector((0, -0.6, 0))).normalized()
    t1 = tb + tdir * 0.07; t2 = t1 + tdir * 0.06; t3 = t2 + tdir * 0.05
    fingers["Thumb"] = [tuple(tb), tuple(t1), tuple(t2), tuple(t3)]
    chain(k, [(t1, 0.01), (t2, 0.008), (t3, 0.005)], 0.03)
    hip = chain(pelvis, [((0.1 * sx, 0.0, 1.13), 0.075)], 0.04)[-1]
    knee = (0.125 * sx, -0.01, 0.62); ankle = (0.14 * sx, 0.02, 0.085); ball = (0.15 * sx, -0.13, 0.03); toe = (0.155 * sx, -0.24, 0.02)
    chain(hip, [((0.115 * sx, 0.0, 0.88), 0.058), (knee, 0.052), ((0.13 * sx, 0.0, 0.5), 0.046), (ankle, 0.03), ((0.145 * sx, 0.04, 0.05), 0.03),
                (ball, 0.027), (toe, 0.017)], 0.05)
    return dict(sh=(0.19 * sx, 0.015, 1.955), elbow=elbow, wrist=wrist, palm=palm, fingers=fingers, hip=(0.1 * sx, 0, 1.13),
                knee=knee, ankle=ankle, ball=ball, toe=toe)
L_ = side(1); R_ = side(-1)

me = bpy.data.meshes.new("lurker"); me.from_pydata([tuple(v) for v in verts], edges, []); me.update()
body = bpy.data.objects.new("Lurker", me); scene.collection.objects.link(body)
sk = body.modifiers.new("skin", "SKIN"); sk.use_smooth_shade = True
for i, sv in enumerate(me.skin_vertices[0].data):
    sv.radius = (radii[i], radii[i]); sv.use_root = (i == 0)
body.modifiers.new("sub", "SUBSURF").levels = 1
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.modifier_apply(modifier="skin"); bpy.ops.object.modifier_apply(modifier="sub")

# ---------- sculpt: flat chest, ribs, vertebrae, sunken belly ----------
bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
def sstep(e0, e1, x): t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
for v in bm.verts:
    co, n = v.co, v.normal
    if 1.2 < co.z < 2.0 and abs(co.x) < 0.17:
        co.y *= 0.74
    if 1.48 < co.z < 1.9 and abs(co.x) < 0.17 and co.y < 0.06:
        front = sstep(0.0, -0.08, co.y)
        ph = (co.z + 0.05 * front) / 0.052
        rib = max(0.0, math.sin(ph * 2 * math.pi)) ** 1.5
        fade = sstep(1.48, 1.56, co.z) * (1 - sstep(1.84, 1.9, co.z)) * (1 - 0.8 * sstep(0.03, 0.0, abs(co.x)))
        co += n * 0.0075 * rib * fade
    if 1.32 < co.z < 1.46 and co.y < -0.02:
        co.y += 0.012 * sstep(1.32, 1.39, co.z) * (1 - sstep(1.42, 1.46, co.z))
    if 1.18 < co.z < 2.04 and co.y > 0.02 and abs(co.x) < 0.035:
        ph = co.z / 0.046
        k = max(0.0, math.sin(ph * 2 * math.pi)) ** 0.6
        co.y += (0.006 + 0.014 * k) * (1 - abs(co.x) / 0.035)
    # shoulder blades jut
    if 1.72 < co.z < 1.92 and co.y > 0.02 and 0.04 < abs(co.x) < 0.13:
        co.y += 0.012 * math.sin((co.z - 1.72) / 0.2 * math.pi)
# mouth slit: faces crossing the line on the front of the head
MZ = 2.205
dels = []
for f in bm.faces:
    zs = [v.co.z for v in f.verts]; c = f.calc_center_median()
    if min(zs) < MZ < max(zs) and c.y < -0.07 and abs(c.x) < 0.048 and c.z > 2.15:
        dels.append(f)
print("mouth faces", len(dels))
bmesh.ops.delete(bm, geom=dels, context="FACES")
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True

tris = sum(len(p.vertices) - 2 for p in me.polygons)
print("body tris pre", tris)
if tris > 13500:
    dm = body.modifiers.new("dec", "DECIMATE"); dm.ratio = 13000 / tris
    bpy.ops.object.modifier_apply(modifier="dec")

# ---------- skin material, baked ----------
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")
mat = bpy.data.materials.new("skin"); mat.use_nodes = True
nt = mat.node_tree; N_ = nt.nodes; Lk = nt.links.new
bsdf = N_["Principled BSDF"]
tc = N_.new("ShaderNodeTexCoord")
n1 = N_.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 9; n1.inputs["Detail"].default_value = 10
n2 = N_.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 3.2; n2.inputs["Detail"].default_value = 6; n2.inputs["Roughness"].default_value = 0.65
vor = N_.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 26; vor.feature = "DISTANCE_TO_EDGE"
for n in (n1, n2, vor): Lk(tc.outputs["Object"], n.inputs["Vector"])
r1 = N_.new("ShaderNodeValToRGB"); r1.color_ramp.elements[0].color = (0.42, 0.33, 0.07, 1); r1.color_ramp.elements[1].color = (0.74, 0.62, 0.20, 1)
Lk(n1.outputs["Fac"], r1.inputs["Fac"])
r2 = N_.new("ShaderNodeValToRGB"); r2.color_ramp.elements[0].position = 0.5; r2.color_ramp.elements[1].position = 0.62
r2.color_ramp.elements[0].color = (0, 0, 0, 1); r2.color_ramp.elements[1].color = (1, 1, 1, 1)
Lk(n2.outputs["Fac"], r2.inputs["Fac"])
damp = N_.new("ShaderNodeMix"); damp.data_type = "RGBA"; damp.blend_type = "MULTIPLY"
Lk(r2.outputs["Color"], damp.inputs["Factor"]); Lk(r1.outputs["Color"], damp.inputs[6])
damp.inputs[7].default_value = (0.42, 0.40, 0.22, 1)
r3 = N_.new("ShaderNodeValToRGB"); r3.color_ramp.elements[0].position = 0.0; r3.color_ramp.elements[1].position = 0.06
r3.color_ramp.elements[0].color = (0.55, 0.38, 0.30, 1); r3.color_ramp.elements[1].color = (1, 1, 1, 1)
Lk(vor.outputs["Distance"], r3.inputs["Fac"])
veins = N_.new("ShaderNodeMix"); veins.data_type = "RGBA"; veins.blend_type = "MULTIPLY"; veins.inputs["Factor"].default_value = 0.35
Lk(damp.outputs[2], veins.inputs[6]); Lk(r3.outputs["Color"], veins.inputs[7])
geo = N_.new("ShaderNodeNewGeometry")
r4 = N_.new("ShaderNodeValToRGB"); r4.color_ramp.elements[0].position = 0.42; r4.color_ramp.elements[1].position = 0.55
r4.color_ramp.elements[0].color = (0.35, 0.27, 0.15, 1); r4.color_ramp.elements[1].color = (1, 1, 1, 1)
Lk(geo.outputs["Pointiness"], r4.inputs["Fac"])
crev = N_.new("ShaderNodeMix"); crev.data_type = "RGBA"; crev.blend_type = "MULTIPLY"; crev.inputs["Factor"].default_value = 0.8
Lk(veins.outputs[2], crev.inputs[6]); Lk(r4.outputs["Color"], crev.inputs[7])
sep = N_.new("ShaderNodeSeparateXYZ"); Lk(tc.outputs["Object"], sep.inputs["Vector"])
r5 = N_.new("ShaderNodeValToRGB"); r5.color_ramp.elements[0].position = 0.0; r5.color_ramp.elements[1].position = 0.55
r5.color_ramp.elements[0].color = (0.30, 0.25, 0.15, 1); r5.color_ramp.elements[1].color = (1, 1, 1, 1)
mr = N_.new("ShaderNodeMath"); mr.operation = "DIVIDE"; mr.inputs[1].default_value = 2.5; Lk(sep.outputs["Z"], mr.inputs[0]); Lk(mr.outputs[0], r5.inputs["Fac"])
dirt = N_.new("ShaderNodeMix"); dirt.data_type = "RGBA"; dirt.blend_type = "MULTIPLY"; dirt.inputs["Factor"].default_value = 1.0
Lk(crev.outputs[2], dirt.inputs[6]); Lk(r5.outputs["Color"], dirt.inputs[7])
Lk(dirt.outputs[2], bsdf.inputs["Base Color"])
img = bpy.data.images.new("lurker_skin", 1024, 1024)
it = N_.new("ShaderNodeTexImage"); it.image = img; N_.active = it
body.data.materials.append(mat)
scene.render.engine = "CYCLES"; scene.cycles.samples = 4; scene.cycles.device = "CPU"
bk = scene.render.bake; bk.use_pass_direct = False; bk.use_pass_indirect = False; bk.margin = 6
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})
img.filepath_raw = f"{OUT}/skin.png"; img.file_format = "PNG"; img.save()
# rough map: damp patches glossier
for n in list(N_):
    if n not in (bsdf, N_["Material Output"], it): N_.remove(n)
Lk(it.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.5
bsdf.inputs["Specular IOR Level"].default_value = 0.45

# ---------- mouth cavity + needle teeth ----------
def solid(name, color, rough=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = rough
    return m
mouth_m = solid("mouth", (0.09, 0.012, 0.01, 1), 0.25); teeth_m = solid("teeth", (0.62, 0.56, 0.4, 1), 0.35)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1, location=(0, -0.035, MZ - 0.005))
cav = bpy.context.object; cav.scale = (0.055, 0.06, 0.05); cav.data.materials.append(mouth_m)
bpy.ops.object.transform_apply(scale=True)
for p in cav.data.polygons: p.use_smooth = True
teeth = []
for row, z0, dirz in (("Head", MZ + 0.016, -1), ("Jaw", MZ - 0.016, 1)):
    for i in range(11):
        u = (i - 5) / 5.0
        x = u * 0.042; y = -0.1 + 0.035 * u * u
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.0035, radius2=0.0, depth=0.02 + 0.006 * (1 - abs(u)),
                                        location=(x, y, z0 + dirz * 0.008))
        t = bpy.context.object
        if dirz < 0: t.rotation_euler = (math.pi, 0, 0)
        bpy.ops.object.transform_apply(rotation=True); t.data.materials.append(teeth_m)
        t["bone"] = row; teeth.append(t)

# ---------- armature (Mixamo names) ----------
arm_d = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("Armature", arm_d); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
EB = arm_d.edit_bones
def B(name, h, t, parent=None, conn=False):
    b = EB.new(name); b.head = Vector(h); b.tail = Vector(t)
    if parent: b.parent = EB[parent]; b.use_connect = conn
    return b
B("Hips", (0, 0, 1.15), (0, 0, 1.3)); B("Spine", (0, 0, 1.3), (0, 0, 1.48), "Hips", True)
B("Spine1", (0, 0, 1.48), (0, 0, 1.68), "Spine", True); B("Spine2", (0, 0, 1.68), (0, 0.005, 1.95), "Spine1", True)
B("Neck", (0, 0.005, 1.95), (0, -0.01, 2.12), "Spine2", True); B("Head", (0, -0.01, 2.12), (0, -0.02, 2.5), "Neck", True)
B("Jaw", (0, -0.02, MZ - 0.005), (0, -0.11, MZ - 0.005), "Head")
for sname, D in (("Left", L_), ("Right", R_)):
    sx = 1 if sname == "Left" else -1
    B(sname + "Shoulder", (0.03 * sx, 0.01, 1.92), D["sh"], "Spine2")
    B(sname + "Arm", D["sh"], D["elbow"], sname + "Shoulder", True); B(sname + "ForeArm", D["elbow"], D["wrist"], sname + "Arm", True)
    B(sname + "Hand", D["wrist"], D["palm"], sname + "ForeArm", True)
    for f, P in D["fingers"].items():
        B(f"{sname}Hand{f}1", P[0], P[1], sname + "Hand"); B(f"{sname}Hand{f}2", P[1], P[2], f"{sname}Hand{f}1", True)
        B(f"{sname}Hand{f}3", P[2], P[3], f"{sname}Hand{f}2", True)
    B(sname + "UpLeg", D["hip"], D["knee"], "Hips"); B(sname + "Leg", D["knee"], D["ankle"], sname + "UpLeg", True)
    B(sname + "Foot", D["ankle"], D["ball"], sname + "Leg", True); B(sname + "ToeBase", D["ball"], D["toe"], sname + "Foot", True)
bpy.ops.object.mode_set(mode="OBJECT")

# ---------- weights: surface distance to bone segments ----------
RAD = {"Hips": .1, "Spine": .08, "Spine1": .12, "Spine2": .12, "Neck": .045, "Head": .1, "Shoulder": .04, "Arm": .04, "ForeArm": .03,
       "Hand": .024, "UpLeg": .065, "Leg": .048, "Foot": .028, "ToeBase": .02}
def brad(n):
    for k in ("ForeArm", "Shoulder", "UpLeg", "ToeBase", "Hand", "Arm", "Leg", "Foot"):
        if n.endswith(k) and (n.startswith("Left") or n.startswith("Right")) and "Hand" + "" not in n.replace(k, "", 1)[4:]: return RAD[k]
    if "Hand" in n and n[-1].isdigit(): return 0.008
    return RAD.get(n, 0.05)
bones = [(b.name, b.head_local.copy(), b.tail_local.copy(), brad(b.name)) for b in arm_d.bones if b.name != "Jaw"]
def segd(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
groups = {b.name: body.vertex_groups.new(name=b.name) for b in arm_d.bones}
for v in me.vertices:
    p = v.co
    ds = sorted(((max(segd(p, a, b) - r * 0.9, 0.002), n) for (n, a, b, r) in bones))
    dmin = ds[0][0]; sel = [(d, n) for d, n in ds[:3] if d < dmin * 1.8 + 0.01]
    ws = [(1 / d ** 4, n) for d, n in sel]; tot = sum(w for w, _ in ws)
    jaw = 0.0
    if p.z > 2.12 and p.z < MZ and p.y < -0.03:
        jaw = sstep(MZ, MZ - 0.012, p.z) * sstep(-0.03, -0.07, p.y)
    for w, n in ws: groups[n].add([v.index], (w / tot) * (1 - jaw), "REPLACE")
    if jaw > 0: groups["Jaw"].add([v.index], jaw, "REPLACE")
for o, bn in [(cav, "Head")] + [(t, t["bone"]) for t in teeth]:
    g = o.vertex_groups.new(name=bn); g.add([v.index for v in o.data.vertices], 1.0, "REPLACE")
bpy.ops.object.select_all(action="DESELECT")
for o in [cav] + teeth: o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
body.parent = rig; body.modifiers.new("skin", "ARMATURE").object = rig

# ---------- posing ----------
PB = rig.pose.bones
for pb in PB: pb.rotation_mode = "QUATERNION"
AX = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}
def M(d):  # mirror a Left-convention pose dict onto Right
    out = {}
    for k, rots in d.items():
        if k.startswith("Left"):
            out["Right" + k[4:]] = [(a, -g if a in "YZ" else g) for a, g in rots]
    return out
def S_(d):
    o = dict(d); o.update({k: v for k, v in M(d).items() if k not in d}); return o
FING = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
def curl(deg, spread=0, side="Left", only=None):
    d = {}
    for f in FING:
        if only and f not in only: continue
        sp = {"Index": -spread, "Middle": -spread * 0.3, "Ring": spread * 0.4, "Pinky": spread, "Thumb": -spread * 1.5}[f]
        d[f"{side}Hand{f}1"] = [("X", sp), ("Y", deg * 0.6)]; d[f"{side}Hand{f}2"] = [("Y", deg)]; d[f"{side}Hand{f}3"] = [("Y", deg * 0.8)]
    return d
BASE = S_({"Hips": [("X", 6)], "Spine": [("X", 10)], "Spine1": [("X", 14)], "Spine2": [("X", 14)], "Neck": [("X", 28)], "Head": [("X", 22)],
           "LeftShoulder": [("X", -8)], "LeftArm": [("X", -42), ("Y", 12)], "LeftForeArm": [("X", -8)], "LeftHand": [("X", -6)],
           "LeftUpLeg": [("X", -14)], "LeftLeg": [("X", 22)], "LeftFoot": [("X", -6)], **curl(12, 6)})
def merge(*ds):
    out = {}
    for d in ds:
        for k, v in d.items(): out[k] = v if k.endswith("@loc") else out.get(k, []) + v
    return out
def apply(pose, frame):
    for pb in PB:
        R = pb.bone.matrix_local.to_quaternion()
        Q = Quaternion()
        for a, g in pose.get(pb.name, []):
            Q = Quaternion(AX[a], math.radians(g)) @ Q
        pb.rotation_quaternion = R.inverted() @ Q @ R
        loc = pose.get(pb.name + "@loc")
        pb.location = (R.inverted() @ Vector(loc)) if loc else Vector()
        pb.keyframe_insert("rotation_quaternion", frame=frame); pb.keyframe_insert("location", frame=frame)
def setloc(d, v): d["Hips@loc"] = v; return d
ACTIONS = {}
def action(name, keys, step=False):
    rig.animation_data_create(); act = bpy.data.actions.new(name); rig.animation_data.action = act
    for f, pose in keys: apply(pose, f)
    if step:
        for fc in (act.fcurves if hasattr(act, "fcurves") else []):
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
        try:
            for layer in act.layers:
                for strip in layer.strips:
                    for cb in strip.channelbags:
                        for fc in cb.fcurves:
                            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
        except Exception as e: print("step", e)
    ACTIONS[name] = (act, keys[-1][0]); return act
def jit(p, amt, bones_):
    return merge(p, {b: [("X", random.uniform(-amt, amt)), ("Z", random.uniform(-amt, amt))] for b in bones_})

# Idle: breathing, a finger twitch, the head ticking
action("Idle", [(0, BASE), (40, merge(BASE, {"Spine1": [("X", -2)], "Head": [("Z", 4)]})), (70, merge(BASE, curl(25, 0, "Left", ["Index", "Middle"]), {"Head": [("Z", 4)]})),
                (74, merge(BASE, {"Head": [("Y", 14)]})), (100, merge(BASE, {"Head": [("Y", 12)], "Spine1": [("X", -2)]})), (120, BASE)])
# frozen poses (a tremble in the fingers, nothing else)
REACH = merge(BASE, {"Spine": [("X", 6)], "LeftArm": [("X", -78), ("Y", -14)], "LeftForeArm": [("X", -6)], "LeftHand": [("X", 10)],
                     "Head": [("Z", -18)], "RightArm": [("X", 10), ("Y", -6)], "LeftUpLeg": [("X", -12)], "LeftLeg": [("X", 14)]}, curl(-10, 14))
COCK = merge(BASE, {"Neck": [("Y", 26), ("X", -10)], "Head": [("Y", 78), ("X", -12)], "Spine2": [("Y", -10)], "LeftArm": [("Y", 18), ("X", 8)],
                    "RightArm": [("X", -60), ("Y", 4)], "RightForeArm": [("X", -70)], "Jaw": [("X", 6)]}, curl(30, 0, "Right"))
CROUCH = setloc(merge(BASE, {"Hips": [("X", 30)], "Spine": [("X", 14)], "Spine1": [("X", 10)], "Neck": [("X", -58)], "Head": [("X", -48)],
                             "LeftUpLeg": [("X", -112), ("Y", 22)], "LeftLeg": [("X", 150)], "LeftFoot": [("X", -40)],
                             "LeftArm": [("X", -42), ("Y", -10)], "LeftForeArm": [("X", -24)], "LeftHand": [("X", 60)]},
                     M({"LeftUpLeg": [("X", -112), ("Y", 22)], "LeftLeg": [("X", 150)], "LeftFoot": [("X", -40)], "LeftArm": [("X", -50), ("Y", -10)], "LeftForeArm": [("X", -18)], "LeftHand": [("X", 60)]}),
                     curl(-20, 18), curl(-20, 18, "Right")), (0, -0.05, -0.74))
CLOSE = merge(BASE, {"Spine": [("X", -6)], "Spine1": [("X", -8)], "Neck": [("X", 18)], "Head": [("X", 24), ("Z", 10)],
                     "LeftArm": [("X", -40), ("Y", -20)], "LeftForeArm": [("X", -50)]},
              M({"LeftArm": [("X", -34), ("Y", -16)], "LeftForeArm": [("X", -60)]}), curl(40, 6), curl(40, 6, "Right"))
for nm, P in (("PoseReach", REACH), ("PoseCock", COCK), ("PoseCrouch", CROUCH), ("PoseClose", CLOSE)):
    fb = [b for b in [f"LeftHand{f}2" for f in FING] + [f"RightHand{f}2" for f in FING]]
    action(nm, [(0, P), (20, jit(P, 3, fb)), (40, jit(P, 3, fb)), (60, P)])
# Creep: stop-motion stalk, 7.5 poses a second
ck = []
for i in range(10):
    t = i / 9 * 2 * math.pi; s = math.sin(t); c = math.cos(t)
    lift = lambda ph: max(0.0, math.sin(t + ph))
    P = merge(BASE, {"LeftUpLeg": [("X", -30 * s - 6)], "LeftLeg": [("X", 16 + 55 * lift(math.pi / 2))],
                     "RightUpLeg": [("X", 30 * s - 6)], "RightLeg": [("X", 16 + 55 * lift(-math.pi / 2))],
                     "LeftArm": [("X", 22 * s)], "RightArm": [("X", -22 * s)], "Spine1": [("Y", 8 * s)],
                     "Head": [("Z", random.choice([-14, 10, 22, -6])), ("Y", random.uniform(-14, 14))]})
    setloc(P, (0, 0, -0.06 + 0.04 * abs(c)))
    if i == 9: P = ck[0][1]
    ck.append((i * 4, P))
action("Creep", ck, step=True)
# Grab: both arms shoot out, fingers splay then clench
OUT_ = merge(BASE, S_({"LeftArm": [("X", -86), ("Y", -16)], "LeftForeArm": [("X", 4)], "LeftHand": [("X", 6)]}), {"Neck": [("X", -16)], "Head": [("X", -10)], "Spine2": [("X", -8)]})
action("Grab", [(0, BASE), (3, merge(OUT_, curl(-25, 20), curl(-25, 20, "Right"))), (6, merge(OUT_, S_({"LeftArm": [("X", -6)]}), curl(-30, 22), curl(-30, 22, "Right"))),
                (12, merge(OUT_, curl(65, 4), curl(65, 4, "Right"))), (34, merge(OUT_, curl(70, 4), curl(70, 4, "Right"), {"Head": [("Z", 8)]})),
                (40, merge(OUT_, curl(70, 4), curl(70, 4, "Right")))])
# Scream: head snaps back, the slit tears open, everything shakes
HELD = merge(OUT_, curl(70, 4), curl(70, 4, "Right"))
sk_ = [(0, HELD)]
for i, f in enumerate(range(5, 44, 2)):
    sk_.append((f, merge(HELD, {"Neck": [("X", -22)], "Head": [("X", -36), ("Y", (-5 if i % 2 else 5)), ("Z", (-4 if i % 2 else 4))],
                                "Jaw": [("X", min(1, f / 10) * 62 + (3 if i % 2 else -3))], "Spine2": [("X", -10)], "Spine1": [("X", -4)]})))
sk_.append((50, merge(HELD, {"Neck": [("X", -8)], "Jaw": [("X", 30)]})))
action("Scream", sk_)
# Death: drops like a coat off a hook
D1 = setloc(merge(BASE, S_({"LeftUpLeg": [("X", -40)], "LeftLeg": [("X", 70)], "LeftArm": [("X", 10)]}), {"Head": [("X", 20)]}), (0, 0, -0.3))
D2 = setloc(merge(BASE, S_({"LeftUpLeg": [("X", -95), ("Y", 18)], "LeftLeg": [("X", 155)], "LeftFoot": [("X", -45)], "LeftArm": [("X", 30), ("Y", 30)], "LeftForeArm": [("X", -30)]}),
                  {"Spine": [("X", 30)], "Spine1": [("X", 20)], "Neck": [("X", 30)], "Head": [("X", 20)], "Jaw": [("X", 20)]}), (0, -0.05, -0.8))
D3 = setloc(merge(BASE, S_({"LeftUpLeg": [("X", -105), ("Y", 28)], "LeftLeg": [("X", 160)], "LeftFoot": [("X", -50)], "LeftArm": [("X", 50), ("Y", 70)], "LeftForeArm": [("X", -20)]}),
                  {"Hips": [("X", 40)], "Spine": [("X", 40)], "Spine1": [("X", 30)], "Spine2": [("X", 20)], "Neck": [("X", 20), ("Z", 30)], "Head": [("X", 10), ("Z", 30)], "Jaw": [("X", 28)]},
                  curl(40, 0), curl(40, 0, "Right")), (0, -0.25, -0.95))
action("Death", [(0, BASE), (5, D1), (13, D2), (24, D3), (40, D3)])

# ---------- proof ----------
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.3, 0.16, 1); world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
bpy.ops.object.light_add(type="AREA", location=(1.5, -3, 3.5)); key = bpy.context.object; key.data.energy = 900; key.data.size = 3
key.rotation_euler = (math.radians(50), 0, math.radians(25)); key.data.color = (1, 0.92, 0.7)
bpy.ops.object.light_add(type="AREA", location=(-2, 2.5, 3)); rim = bpy.context.object; rim.data.energy = 300; rim.rotation_euler = (math.radians(-50), 0, math.radians(200))
bpy.ops.mesh.primitive_plane_add(size=12); fl = bpy.context.object; fl.data.materials.append(solid("floor", (0.3, 0.25, 0.12, 1), 0.9))
scene.cycles.samples = 24; scene.render.resolution_x = scene.render.resolution_y = 656
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
def shot(nm, act, frame, pos, tgt, lens=40):
    rig.animation_data.action = ACTIONS[act][0]; scene.frame_set(frame)
    cam.location = pos; d = Vector(tgt) - Vector(pos); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
    scene.render.filepath = f"/tmp/lurker/{nm}.png"; bpy.ops.render.render(write_still=True)
dg = bpy.context.evaluated_depsgraph_get()
rig.animation_data.action = ACTIONS["Idle"][0]; scene.frame_set(0); dg.update()
ev = body.evaluated_get(dg); zs = [(body.matrix_world @ v.co).z for v in ev.data.vertices]
print("idle height", max(zs) - min(zs), "tris", len(ev.data.loop_triangles), "bones", len(arm_d.bones))
shot("a_idle", "Idle", 0, (2.2, -3.4, 1.6), (0, 0, 1.2))
shot("b_reach", "PoseReach", 0, (0.3, -3.2, 1.7), (0, 0, 1.4))
shot("c_side", "PoseCrouch", 0, (3.2, -0.4, 1.0), (0, 0, 0.6))
shot("d_scream", "Scream", 30, (0.15, -1.2, 2.15), (0, 0, 2.0), 50)
shot("e_cock", "PoseCock", 0, (-1.2, -2.6, 1.9), (0, 0, 1.6))
shot("f_death", "Death", 40, (2.5, -2.5, 1.2), (0, 0, 0.3))
# ---------- NLA + export ----------
rig.animation_data.action = None
for nm, (act, end) in ACTIONS.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = nm; tr.strips.new(nm, 0, act)
for o in (fl, key, rim, cam): bpy.data.objects.remove(o)
scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=f"{OUT}/lurker.glb", use_selection=True, export_apply=False, export_animations=True,
                          export_animation_mode="NLA_TRACKS", export_skins=True)
print("exported", os.path.getsize(f"{OUT}/lurker.glb"))
