# Skin-Stealer: one mixamo rig, three meshes. "disguise" (a slouched office worker) shows until the reveal;
# then "creature" (wet red long-limbed thing, split jaw) and "shed" (the human skin split down the chest) show.
import bpy, bmesh, numpy as np, math, os
from mathutils import Vector, Matrix, noise
from math import radians
OUT = "/workspace/out"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/stealer", exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.blender_org.mpfb")
from bl_ext.blender_org.mpfb.services import HumanService, TargetService
D = "/home/workshop/.config/blender/5.1/extensions/.user/blender_org/mpfb/data"
sc = bpy.context.scene
m = TargetService.get_default_macro_info_dict()
m.update({"gender": 1.0, "age": 0.62, "weight": 0.32, "muscle": 0.25, "height": 0.62, "proportions": 0.35})
body = HumanService.create_human(macro_detail_dict=m); HumanService.add_builtin_rig(body, "mixamo")
HumanService.set_character_skin(D+"/skins/middleage_caucasian_male/middleage_caucasian_male.mhmat", body, skin_type="GAMEENGINE")
for a, t in (("clothes/male_elegantsuit01/male_elegantsuit01.mhclo", "Clothes"), ("clothes/shoes02/shoes02.mhclo", "Clothes"),
             ("eyes/low-poly/low-poly.mhclo", "Eyes"), ("hair/short02/short02.mhclo", "Hair")):
    HumanService.add_mhclo_asset(D+"/"+a, body, asset_type=t, subdiv_levels=0)
rig = next(o for o in sc.objects if o.type == "ARMATURE")
objs = {o.name: o for o in sc.objects if o.type == "MESH"}
print("MESHES", list(objs))
def by(sub): return next(o for n, o in objs.items() if sub in n)
clothes, shoes, eyes, hair = by("elegantsuit"), by("shoes02"), by("low-poly"), by("short02")
def act(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
def apply_mod(o, name):
    act(o); bpy.ops.object.modifier_move_to_index(modifier=name, index=0); bpy.ops.object.modifier_apply(modifier=name)
def decimate(o, tris):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n <= tris: return
    d = o.modifiers.new("dec", "DECIMATE"); d.ratio = tris / n; apply_mod(o, "dec")
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True

for o in list(objs.values()):
    if o.data.shape_keys: act(o); bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
# ---- the creature: a full (unmasked) copy of the body, reshaped gaunt and long, before masks go ----
act(body); bpy.ops.object.duplicate(); crea = bpy.context.active_object; crea.name = "creature"
for md in list(crea.modifiers):
    if md.type == "MASK":
        print("MASK", md.name, md.vertex_group, md.invert_vertex_group)
        if any(k in (md.name + md.vertex_group).lower() for k in ("elegant", "shoes", "short", "low-poly", "delete")): crea.modifiers.remove(md)
        else: apply_mod(crea, md.name)
for md in list(body.modifiers):
    if md.type == "MASK": apply_mod(body, md.name)
for md in list(body.modifiers):
    if md.type == "SUBSURF": body.modifiers.remove(md)
for o in (body, crea):
    for k in list(o.data.shape_keys.key_blocks) if o.data.shape_keys else []: pass
    if o.data.shape_keys:
        act(o); bpy.ops.object.shape_key_remove(all=True, apply_mix=True)

RW = rig.matrix_world
bones = {b.name: (RW @ b.head_local, RW @ b.tail_local) for b in rig.data.bones}
def closest(p, h, t):
    d = t - h; L = d.length_squared
    s = 0 if L == 0 else max(0.0, min(1.0, (p - h).dot(d) / L)); return h + d * s, s
def shrink_of(n):
    if "Hand" in n and ("Index" in n or "Middle" in n or "Ring" in n or "Pinky" in n or "Thumb" in n): return 0.55
    if "Hand" in n: return 0.6
    if "Arm" in n: return 0.58
    if "Leg" in n: return 0.66
    if "Foot" in n or "Toe" in n: return 0.8
    if "Spine" in n or "Hips" in n: return 0.74
    if "Shoulder" in n: return 0.7
    if "Neck" in n: return 0.62
    return 0.98
def arm_ext(n, s, side):
    # extra reach: forearms stretch, hands and fingers ride out further, fingers become long claws
    fa_h, fa_t = bones[f"mixamorig:{side}ForeArm"]; dfa = (fa_t - fa_h).normalized()
    if n.endswith(f"{side}ForeArm"): return dfa * (0.22 * s)
    if n.startswith(f"mixamorig:{side}Hand"): return dfa * 0.22
    return Vector()
gnames = {g.index: g.name for g in crea.vertex_groups}
hz = bones["mixamorig:Head"][0].z
MW = crea.matrix_world; MI = MW.inverted()
for v in crea.data.vertices:
    p = MW @ v.co; acc = Vector(); wsum = 0
    for g in v.groups:
        n = gnames[g.group]
        if n not in bones or g.weight <= 0: continue
        h, t = bones[n]; c, s = closest(p, h, t); q = c + (p - c) * shrink_of(n)
        for side in ("Left", "Right"):
            if side in n: q = q + arm_ext(n, s, side)
        if "Hand" in n and any(k in n for k in ("Index", "Middle", "Ring", "Pinky")):
            hh = bones[n.split("Hand")[0] + "Hand"][0]; q = hh + (q - hh) * 1.9   # long fingers
        acc += q * g.weight; wsum += g.weight
    if wsum > 0: v.co = MI @ (acc / wsum)
# split jaw: front lower head stretched down and widened, given its own bone
hv = [v for v in crea.data.vertices if any(gnames[g.group] == "mixamorig:Head" and g.weight > 0.5 for g in v.groups)]
zs = [(MW @ v.co).z for v in hv]; zmin, zmax = min(zs), max(zs); hh = zmax - zmin
cy = sum((MW @ v.co).y for v in hv) / len(hv)
jawtop = zmin + 0.27 * hh
jaw_ids = []
for v in hv:
    p = MW @ v.co
    if p.z < jawtop and p.y < cy + 0.01:
        k = (jawtop - p.z) / (jawtop - zmin + 1e-6)
        p.z -= 0.02 + k * 0.09; p.x *= 1.0 + 0.35 * k; p.y -= 0.02 * k
        v.co = MI @ p; jaw_ids.append(v.index)
print("HEAD z", zmin, zmax, "jaw verts", len(jaw_ids))

# rig: a jaw bone under the head
act(rig); bpy.ops.object.mode_set(mode="EDIT")
eb = rig.data.edit_bones; jb = eb.new("mixamorig:Jaw"); jb.parent = eb["mixamorig:Head"]
RI = RW.inverted()
jb.head = RI @ Vector((0, cy + 0.02, jawtop + 0.01)); jb.tail = RI @ Vector((0, cy - 0.09, zmin - 0.04)); jb.roll = 0
bpy.ops.object.mode_set(mode="OBJECT")
jg = crea.vertex_groups.new(name="mixamorig:Jaw")
for i in jaw_ids:
    for g in crea.data.vertices[i].groups: g.weight = 0.0
jg.add(jaw_ids, 1.0, "REPLACE")
# teeth: cones along the lip line, lower on the jaw, upper on the head
tb = bmesh.new()
def tooth(base, tip, r):
    d = (tip - base); n = 5; ring = []
    ax = d.normalized(); a1 = ax.orthogonal().normalized(); a2 = ax.cross(a1)
    for i in range(n):
        an = 2 * math.pi * i / n; ring.append(tb.verts.new(base + (a1 * math.cos(an) + a2 * math.sin(an)) * r))
    t = tb.verts.new(tip)
    for i in range(n): tb.faces.new((ring[i], ring[(i+1) % n], t))
    tb.faces.new(list(reversed(ring)))
front = sorted(hv, key=lambda v: (MW @ v.co).y)[:1][0]; fy = (MW @ front.co).y
upper_ids, lower_ids = [], []
for i in range(7):
    a = -1.1 + 2.2 * i / 6; x = math.sin(a) * 0.05; y = fy + 0.025 + (1 - math.cos(a)) * 0.05
    nU = len(tb.verts); tooth(Vector((x, y, jawtop + 0.006)), Vector((x * 1.05, y - 0.004, jawtop - 0.03)), 0.006); upper_ids += list(range(nU, len(tb.verts)))
    nL = len(tb.verts); xl = x * 1.3; tooth(Vector((xl, y - 0.01, jawtop - 0.035)), Vector((xl * 1.05, y - 0.014, jawtop - 0.002)), 0.006); lower_ids += list(range(nL, len(tb.verts)))
tm = bpy.data.meshes.new("teeth"); tb.to_mesh(tm); teeth = bpy.data.objects.new("teeth", tm); sc.collection.objects.link(teeth)
teeth.vertex_groups.new(name="mixamorig:Head").add(upper_ids, 1.0, "REPLACE")
teeth.vertex_groups.new(name="mixamorig:Jaw").add(lower_ids, 1.0, "REPLACE")

# ---- the shed skin: body + suit copy, opened down the chest, headless, peeled apart ----
bpy.ops.object.select_all(action="DESELECT")
for o in (body, clothes): o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.duplicate()
dups = [o for o in bpy.context.selected_objects]
bpy.context.view_layer.objects.active = dups[0]; bpy.ops.object.join(); shed = bpy.context.active_object; shed.name = "shed"
neck = bones["mixamorig:Neck"][0].z
bm = bmesh.new(); bm.from_mesh(shed.data); SM = shed.matrix_world
cyb = bones["mixamorig:Spine2"][0].y
kill = []
P0 = 'mixamorig:'
for f in bm.faces:
    c = SM @ f.calc_center_median()
    if c.z > neck + 0.02: kill.append(f); continue
    if any((c - closest(c, bones[P0 + sd + "Hand"][0], bones[P0 + sd + "Hand"][0] + (bones[P0 + sd + "Hand"][1] - bones[P0 + sd + "Hand"][0]).normalized() * 0.22)[0]).length < 0.1 for sd in ("Left", "Right")): kill.append(f); continue
    if 0.9 < c.z < neck + 0.02 and c.y < cyb and abs(c.x) < 0.035 + (c.z - 0.9) * 0.12: kill.append(f)
bmesh.ops.delete(bm, geom=kill, context="FACES")
for v in bm.verts:
    p = SM @ v.co
    if 0.85 < p.z < neck + 0.05 and p.y < cyb:
        k = max(0.0, 1 - abs(p.x) / 0.2) * min(1.0, (p.z - 0.85) / 0.3)
        p.x += math.copysign(0.07 * k, p.x if p.x != 0 else 1); p.y -= 0.03 * k
    p = Vector((p.x * 1.03, p.y * 1.03 + 0.005, p.z))
    v.co = SM.inverted() @ p
bm.to_mesh(shed.data); bm.free()

# ---- the disguise: body + suit + shoes + eyes + hair; the face a little long, the eyes a little big ----
for v in body.data.vertices:
    p = body.matrix_world @ v.co
    if p.z > neck + 0.03 and p.z < zmin + 0.45 * hh and p.y < cy:
        p.z -= (zmin + 0.45 * hh - p.z) * 0.12; v.co = body.matrix_world.inverted() @ p
for side in (1, -1):
    vs = [v for v in eyes.data.vertices if (eyes.matrix_world @ v.co).x * side > 0]
    c = sum((v.co for v in vs), Vector()) / len(vs)
    for v in vs: v.co = c + (v.co - c) * 1.18

# ---- textures ----
def fbm(h, w, seed, oct=6, base=4):
    rng = np.random.default_rng(seed); out = np.zeros((h, w)); amp = 1; tot = 0
    from PIL import Image
    for o in range(oct):
        g = base * 2 ** o; a = rng.random((g, g)).astype(np.float32)
        out += amp * np.asarray(Image.fromarray(a).resize((w, h), Image.BICUBIC)); tot += amp; amp *= 0.5
    return out / tot
def img_of(o):
    for ms in o.material_slots:
        for n in ms.material.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and "normal" not in n.image.name.lower() and "ao" not in n.image.name.lower().split("_")[-1]: return n.image
# torn, stained suit: grime, dried blood, dark rips
ci = img_of(clothes); W, H = ci.size; px = np.array(ci.pixels[:]).reshape(H, W, 4)
g = fbm(H, W, 3); bl = fbm(H, W, 7, base=3); rip = np.abs(fbm(H, W, 11, base=6) - 0.5)
px[..., :3] *= (0.55 + 0.5 * g)[..., None]
blood = np.clip((bl - 0.62) * 6, 0, 1)[..., None]; px[..., :3] = px[..., :3] * (1 - blood) + np.array([0.12, 0.012, 0.008]) * blood
tear = np.clip((0.012 - rip) * 120, 0, 1)[..., None]; px[..., :3] = px[..., :3] * (1 - tear) + np.array([0.02, 0.015, 0.012]) * tear
ni = bpy.data.images.new("suit_torn", W, H); ni.pixels = px.ravel(); ni.filepath_raw = "/tmp/stealer/suit.png"; ni.file_format = "PNG"; ni.save()
for n in clothes.material_slots[0].material.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image == ci: n.image = ni
# wet flesh for the creature: red meat, dark vein web, pale sinew streaks
FS = 1024; fv = fbm(FS, FS, 21); vein = np.abs(fbm(FS, FS, 23, base=8) - 0.5); sin_ = fbm(FS, FS, 29, base=2)
col = np.zeros((FS, FS, 4)); col[..., 3] = 1
base = np.array([0.30, 0.025, 0.02]); dark = np.array([0.06, 0.005, 0.006]); pale = np.array([0.55, 0.22, 0.18])
k = (0.6 + 0.8 * fv)[..., None]; c = base * k
vm = np.clip((0.03 - vein) * 40, 0, 1)[..., None]; c = c * (1 - vm) + dark * vm
sm = np.clip((sin_ - 0.66) * 5, 0, 0.6)[..., None]; c = c * (1 - sm) + pale * sm
col[..., :3] = c; fi = bpy.data.images.new("flesh", FS, FS); fi.pixels = col.ravel(); fi.filepath_raw = "/tmp/stealer/flesh.png"; fi.file_format = "PNG"; fi.save()
def mat(name, image=None, color=None, rough=0.5, double=False):
    mt = bpy.data.materials.new(name); mt.use_nodes = True; b = mt.node_tree.nodes["Principled BSDF"]
    if image:
        t = mt.node_tree.nodes.new("ShaderNodeTexImage"); t.image = image; mt.node_tree.links.new(t.outputs[0], b.inputs["Base Color"])
    else: b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough; mt.use_backface_culling = not double; return mt
FLESH = mat("flesh", fi, rough=0.16, double=True); TEETH = mat("teeth", color=(0.55, 0.5, 0.36), rough=0.35)
crea.data.materials.clear(); crea.data.materials.append(FLESH); teeth.data.materials.append(TEETH)
teeth.modifiers.new("arm", "ARMATURE").object = rig; teeth.parent = rig
# slot names: skin, suit, shoes, eyes, hair
for o, nm in ((body, "skin"), (clothes, "suit"), (shoes, "shoes"), (eyes, "eyes"), (hair, "hair")):
    for ms in o.material_slots: ms.material.name = nm
for ms in shed.material_slots:
    ms.material.use_backface_culling = False

# ---- budget: decimate then join ----
for o in (body, crea, clothes, shoes, shed, hair):
    for md in list(o.modifiers):
        if md.type == "SUBSURF": o.modifiers.remove(md)
decimate(body, 3600); decimate(clothes, 2200); decimate(shoes, 500); decimate(hair, 900); decimate(crea, 6400); decimate(shed, 2400)
bpy.ops.object.select_all(action="DESELECT")
for o in (body, clothes, shoes, eyes, hair): o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join(); disg = body; disg.name = "disguise"
act(crea); teeth.select_set(True); bpy.ops.object.join(); crea.name = "creature"
for o in (disg, crea, shed): smooth(o)
for o in (disg, crea, shed):
    for md in list(o.modifiers):
        if md.type not in ("ARMATURE",): o.modifiers.remove(md)

# ---- clips ----
sc.render.fps = 30
pbs = rig.pose.bones
for pb in pbs: pb.rotation_mode = "QUATERNION"
P = "mixamorig:"
def rot(pose, n, ax, deg):
    pose.setdefault(P + n, []).append((ax, deg))
def apply(pose, hips=(0, 0, 0)):
    for pb in pbs: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    for n, turns in pose.items():
        pb = pbs[n]; M = pb.bone.matrix_local.to_3x3(); R = Matrix.Identity(3)
        for ax, d in turns: R = Matrix.Rotation(radians(d), 3, ax) @ R
        pb.rotation_quaternion = (M.inverted() @ R @ M).to_quaternion()
    hp = pbs[P + "Hips"]; hp.location = hp.bone.matrix_local.to_3x3().inverted() @ Vector(hips)
def key(f):
    for pb in pbs:
        pb.keyframe_insert("rotation_quaternion", frame=f)
    pbs[P + "Hips"].keyframe_insert("location", frame=f)
def Pz(**kw):  # a pose from short keys: name=[(ax,deg),...]
    d = {}
    for k, v in kw.items(): d[P + k] = v
    return d
def merge(*ps):
    out = {}
    for p in ps:
        for k, v in p.items(): out.setdefault(k, []).extend(v)
    return out
SLOUCH = Pz(Spine=[("X", 6)], Spine1=[("X", 7)], Spine2=[("X", 5)], Neck=[("X", 16)], Head=[("X", -6), ("Y", 11), ("Z", 5)],
            LeftShoulder=[("Y", 7)], RightShoulder=[("Y", -5)], LeftArm=[("Y", 44)], RightArm=[("Y", -47)],
            LeftForeArm=[("X", -6)], RightForeArm=[("X", -3)], LeftHand=[("X", 8)], RightHand=[("X", 10)])
def legs(lu, ll, ru, rl, lf=0, rf=0):
    return Pz(LeftUpLeg=[("X", lu)], LeftLeg=[("X", ll)], RightUpLeg=[("X", ru)], RightLeg=[("X", rl)], LeftFoot=[("X", lf)], RightFoot=[("X", rf)])
CROUCH = merge(Pz(Spine=[("X", 24)], Spine1=[("X", 14)], Spine2=[("X", 10)], Neck=[("X", -22)], Head=[("X", -16), ("Z", 8)],
                  LeftArm=[("Y", 12), ("X", -34)], RightArm=[("Y", -12), ("X", -30)], LeftForeArm=[("X", -22)], RightForeArm=[("X", -26)],
                  LeftHand=[("X", 20)], RightHand=[("X", 20)], Jaw=[("X", 22)]), legs(-48, 72, -42, 66, -24, -24))
HUNT_H = (0, 0.04, -0.2)
CLIPS = {}
def clip(name, keys, loop=False):
    a = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = a
    for f, pose, hips in keys: apply(pose, hips); key(f)
    CLIPS[name] = a
Z = (0, 0, 0)
clip("Idle", [(0, SLOUCH, Z), (30, merge(SLOUCH, Pz(Spine1=[("X", 3)], Head=[("Y", 4)])), (0, 0, -0.006)),
              (43, merge(SLOUCH, Pz(Spine1=[("X", 3)], Head=[("Y", 4)])), (0, 0, -0.006)), (45, merge(SLOUCH, Pz(Head=[("Z", -22), ("Y", 8)])), Z),
              (48, merge(SLOUCH, Pz(Head=[("Z", -20)])), Z), (60, SLOUCH, Z)], True)
def walkpose(ph):
    s = math.sin(ph * 2 * math.pi); c = math.cos(ph * 2 * math.pi)
    lu = -20 * s; ru = 20 * s
    ll = 8 + max(0, 34 * c) if True else 0; rl = 8 + max(0, -34 * c)
    p = merge(SLOUCH, legs(lu, ll, ru, rl, -6 * s, 6 * s), Pz(LeftArm=[("X", 5 * s)], Hips=[("Z", 4 * s)], Spine=[("Z", -3 * s)]))
    return p, (0, 0, -0.025 * abs(s) - 0.005)
clip("Walk", [(int(i * 4.5), *walkpose(i / 8)) for i in range(9)], True)
RV1 = merge(SLOUCH, Pz(Spine=[("X", 14)], Neck=[("X", 30)], Head=[("X", 25)], LeftArm=[("Y", 8)], RightArm=[("Y", -8)]))
RV2 = Pz(Spine=[("X", -8)], Spine1=[("X", -12)], Spine2=[("X", -18)], Neck=[("X", -14)], Head=[("X", -38)], Jaw=[("X", 72)],
         LeftArm=[("Y", -36), ("X", 18)], RightArm=[("Y", 36), ("X", 18)], LeftForeArm=[("Y", -20)], RightForeArm=[("Y", 20)],
         LeftHand=[("X", -30)], RightHand=[("X", -30)])
RV3 = merge(RV2, Pz(Head=[("Z", 14)], Jaw=[("X", 8)], LeftArm=[("Y", -10)], RightArm=[("Y", 10)]))
clip("Reveal", [(0, SLOUCH, Z), (5, RV1, (0, 0, -0.03)), (8, merge(RV1, Pz(Spine=[("Z", 8)])), (0, 0, -0.04)), (11, RV1, (0, 0, -0.03)),
                (20, RV2, (0, 0, 0.03)), (32, RV3, (0, 0, 0.05)), (40, RV2, (0, 0, 0.04)), (52, CROUCH, HUNT_H)])
clip("Hunt", [(0, CROUCH, HUNT_H), (20, merge(CROUCH, Pz(Spine2=[("X", -5)], Jaw=[("X", 14)], Head=[("Z", -12)])), (0, 0.04, -0.18)),
              (24, merge(CROUCH, Pz(Head=[("Z", 14)])), HUNT_H), (40, CROUCH, HUNT_H)], True)
def runpose(ph):
    s = math.sin(ph * 2 * math.pi); c = math.cos(ph * 2 * math.pi)
    p = merge(CROUCH, legs(-40 * s + 10, 40 + max(0, 50 * c) - 66 + 66, 40 * s + 10, 40 + max(0, -50 * c), 0, 0),
              Pz(LeftArm=[("X", 30 * s)], RightArm=[("X", -30 * s)], Spine=[("Z", 6 * s)]))
    for n in ("LeftUpLeg", "LeftLeg", "RightUpLeg", "RightLeg"):  # replace crouch legs with run legs
        p[P + n] = p[P + n][-1:]
    return p, (0, 0.04, -0.14 - 0.04 * abs(c))
clip("Run", [(int(i * 2.5), *runpose(i / 8)) for i in range(9)], True)
LG0 = merge(CROUCH, Pz(Spine=[("X", 10)], LeftArm=[("X", 40)], RightArm=[("X", 40)]), legs(-20, 30, -20, 30))
LG1 = merge(Pz(Spine=[("X", 30)], Spine1=[("X", 10)], Neck=[("X", -30)], Head=[("X", -25)], Jaw=[("X", 78)],
               LeftArm=[("X", -95), ("Y", -8)], RightArm=[("X", -95), ("Y", 8)], LeftForeArm=[("X", -10)], RightForeArm=[("X", -10)],
               LeftHand=[("X", -20)], RightHand=[("X", -20)]), legs(-55, 20, 25, 10, 0, 30))
clip("Lunge", [(0, CROUCH, HUNT_H), (6, LG0, (0, 0.08, -0.3)), (12, LG1, (0, -0.25, -0.12)), (20, LG1, (0, -0.28, -0.14))])
S_R0 = merge(CROUCH, Pz(RightArm=[("Y", 45), ("X", 25)], RightForeArm=[("X", 35)], Spine=[("Z", -18)], Jaw=[("X", 40)]))
S_R1 = merge(CROUCH, Pz(RightArm=[("X", -75), ("Z", -55)], RightForeArm=[("X", -10)], Spine=[("Z", 28)], Jaw=[("X", 60)]))
S_L0 = merge(CROUCH, Pz(LeftArm=[("Y", -45), ("X", 25)], LeftForeArm=[("X", 35)], RightArm=[("X", -40), ("Z", -30)], Spine=[("Z", 18)], Jaw=[("X", 40)]))
S_L1 = merge(CROUCH, Pz(LeftArm=[("X", -75), ("Z", 55)], LeftForeArm=[("X", -10)], Spine=[("Z", -28)], Jaw=[("X", 65)]))
clip("Slash", [(0, CROUCH, HUNT_H), (5, S_R0, HUNT_H), (9, S_R1, (0, -0.05, -0.2)), (13, S_L0, HUNT_H), (17, S_L1, (0, -0.05, -0.2)), (26, CROUCH, HUNT_H)])
DH1 = merge(Pz(Spine=[("X", -25)], Spine2=[("X", -15)], Head=[("X", -40)], Jaw=[("X", 85)], LeftArm=[("Y", -50)], RightArm=[("Y", 50)]), legs(-10, 20, -10, 20))
DH2 = merge(Pz(Spine=[("X", 20)], Head=[("X", 30), ("Y", 20)], Jaw=[("X", 50)], LeftArm=[("Y", 30)], RightArm=[("Y", -30)]), legs(-80, 115, -75, 110))
DH3 = merge(Pz(Hips=[("X", -84)], Spine=[("X", -4)], Head=[("Y", 35), ("X", -10)], Jaw=[("X", 70)], LeftArm=[("Y", 10)], RightArm=[("Y", -20), ("X", -30)],
               LeftForeArm=[("X", -40)], RightForeArm=[("X", -20)]), legs(-10, 25, -30, 50))
clip("Death", [(0, CROUCH, HUNT_H), (8, DH1, (0, 0, 0)), (20, DH2, (0, 0.05, -0.48)), (30, DH3, (0, 0, -0.84)), (33, merge(DH3, Pz(Spine=[("X", -10)])), (0, 0, -0.86)), (45, DH3, (0, 0, -0.85))])

# ---- proof ----
sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes["Background"].inputs[1].default_value = 0.6
def lamp(loc, e):
    l = bpy.data.objects.new("L", bpy.data.lights.new("L", "AREA")); l.data.energy = e; l.data.size = 2; l.location = loc
    l.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); sc.collection.objects.link(l)
lamp((2, -3, 3), 600); lamp((-3, 2, 2.5), 300)
cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
def shoot(path, action, frame, show, loc, tgt=(0, 0, 0.95)):
    rig.animation_data.action = CLIPS[action]; sc.frame_set(frame)
    disg.hide_render = "disguise" not in show; crea.hide_render = shed.hide_render = "disguise" in show
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
shoot("/tmp/stealer/p_a.png", "Walk", 9, "disguise", (1.6, -3.4, 1.4))
shoot("/tmp/stealer/p_b.png", "Reveal", 32, "creature", (1.4, -3.2, 1.5), (0, 0, 1.1))
shoot("/tmp/stealer/p_c.png", "Slash", 9, "creature", (-1.8, -2.6, 1.3), (0, 0, 0.8))
shoot("/tmp/stealer/p_d.png", "Hunt", 0, "creature", (0.6, -1.9, 1.5), (0, -0.2, 1.2))
rig.animation_data.action = None
for n, a in CLIPS.items():
    tr = rig.animation_data.nla_tracks.new(); tr.name = n; tr.strips.new(n, int(a.frame_range[0]), a)
for pb in pbs: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
for o in sc.objects:
    if o.type == "MESH" and o not in (disg, crea, shed): bpy.data.objects.remove(o)
dg = bpy.context.evaluated_depsgraph_get()
for o in (disg, crea, shed):
    print("TRIS", o.name, len(o.evaluated_get(dg).data.loop_triangles), [m.name for m in o.data.materials])
bpy.ops.export_scene.gltf(filepath=OUT + "/stealer.glb", export_apply=False, export_animations=True, export_animation_mode="NLA_TRACKS", export_cameras=False, export_lights=False)
