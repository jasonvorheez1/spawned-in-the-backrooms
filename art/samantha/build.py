# Samantha (Level 5, entity 26): Tripo tuxedo kitten (task e0232869), aligned, rigged here by auto weights, clips keyed.
# blender -b --factory-startup --python-exit-code 1 --python art/samantha/build.py [-- proof]
import bpy, mathutils, numpy as np, math, sys
SRC = "/workspace/sam/sam.glb"; OUT = "/workspace/sam/samantha.glb"
PROOF = "proof" in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
o = [o for o in bpy.data.objects if o.type == 'MESH'][0]
for x in bpy.data.objects:
    if x.type != 'MESH': bpy.data.objects.remove(x)
o.parent = None
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
vs = np.array([v.co[:] for v in o.data.vertices])
low = vs[vs[:, 2] < np.percentile(vs[:, 2], 60)]
xy = low[:, :2] - low[:, :2].mean(0); w, v = np.linalg.eigh(np.cov(xy.T)); ax = v[:, np.argmax(w)]
proj = vs[:, :2] @ ax
if vs[proj > np.percentile(proj, 85)][:, 2].max() > vs[proj < np.percentile(proj, 15)][:, 2].max(): ax = -ax
o.data.transform(mathutils.Matrix.Rotation(math.pi / 2 - math.atan2(ax[1], ax[0]), 4, 'Z'))
vs = np.array([v.co[:] for v in o.data.vertices]); s = 0.62 / np.ptp(vs[:, 1])
c = np.array([(vs[:, 0].min() + vs[:, 0].max()) / 2, (vs[:, 1].min() + vs[:, 1].max()) / 2, vs[:, 2].min()])
o.data.transform(mathutils.Matrix.Translation(mathutils.Vector(-c))); o.data.transform(mathutils.Matrix.Scale(s, 4)); o.data.update()
vs = np.array([v.co[:] for v in o.data.vertices])
def foot(y0, y1, side):
    f = vs[(vs[:, 2] < 0.04) & (vs[:, 1] > y0) & (vs[:, 1] < y1)]; mid = np.median(f[:, 0])
    f = f[f[:, 0] > mid] if side > 0 else f[f[:, 0] < mid]
    return f.mean(0)
FH = {1: foot(-0.3, -0.1, 1), -1: foot(-0.3, -0.1, -1)}; FF = {1: foot(0.08, 0.26, 1), -1: foot(0.08, 0.26, -1)}
print("feet", FH, FF)
# ---- skeleton
arm = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("Samantha", arm); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
B = {}
def bone(n, h, t, p=None):
    b = arm.edit_bones.new(n); b.head = h; b.tail = t; b.roll = 0
    if p: b.parent = B[p]; b.use_connect = (B[p].tail - b.head).length < 1e-4
    B[n] = b; return b
V = mathutils.Vector
bone("hips", V((0, -0.17, 0.27)), V((0, -0.03, 0.29)))
bone("spine", V((0, -0.03, 0.29)), V((0, 0.12, 0.29)), "hips")
bone("neck", V((0, 0.12, 0.29)), V((0, 0.2, 0.34)), "spine")
bone("head", V((0, 0.2, 0.34)), V((0, 0.31, 0.36)), "neck")
bone("tail1", V((0, -0.19, 0.30)), V((0, -0.24, 0.38)), "hips")
bone("tail2", V((0, -0.24, 0.38)), V((0, -0.27, 0.45)), "tail1")
bone("tail3", V((0, -0.27, 0.45)), V((0, -0.30, 0.53)), "tail2")
for sd, nm in ((1, "L"), (-1, "R")):
    h = FH[sd]; x = h[0]
    bone("thigh." + nm, V((x * 0.9, -0.15, 0.25)), V((x, -0.14, 0.14)), "hips")
    bone("shin." + nm, V((x, -0.14, 0.14)), V((x, h[1] - 0.03, 0.06)), "thigh." + nm)
    bone("hfoot." + nm, V((x, h[1] - 0.03, 0.06)), V((x, h[1] + 0.03, 0.01)), "shin." + nm)
    f = FF[sd]; x = 0.055 * sd
    bone("arm." + nm, V((x * 0.9, 0.13, 0.24)), V((x, 0.14, 0.12)), "spine")
    bone("fore." + nm, V((x, 0.14, 0.12)), V((x, f[1] - 0.01, 0.035)), "arm." + nm)
    bone("paw." + nm, V((x, f[1] - 0.01, 0.035)), V((x, f[1] + 0.03, 0.01)), "fore." + nm)
for b in arm.edit_bones:  # local X = world X on every bone
    b.align_roll(V((1, 0, 0)).cross(b.vector.normalized()))
bpy.ops.object.mode_set(mode='OBJECT')
for b in arm.bones: print("bone", b.name, [round(a, 2) for a in b.matrix_local.col[0][:3]])
# heat weights on a closed proxy (voxel remesh: the glb's seams split it), transferred to the real skin
px = o.copy(); px.data = o.data.copy(); bpy.context.scene.collection.objects.link(px)
rm = px.modifiers.new("rm", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.006
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = px; px.select_set(True); bpy.ops.object.modifier_apply(modifier="rm")
rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for g in px.vertex_groups: o.vertex_groups.new(name=g.name)
dt = o.modifiers.new("dt", 'DATA_TRANSFER'); dt.object = px; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier="dt")
bpy.data.objects.remove(px)
o.parent = rig; am = o.modifiers.new("Armature", 'ARMATURE'); am.object = rig
cnt = {g.index: 0 for g in o.vertex_groups}
for vv in o.data.vertices:
    for e in vv.groups:
        if e.weight > 0.2: cnt[e.group] += 1
empty = [(g.name, cnt[g.index]) for g in o.vertex_groups]
print("emptygroups", empty)
# ---- clips: degrees about each bone's local X (pitch: + lifts a forward bone / swings a down bone forward), Z (side)
SIT = {"hips": dict(x=38, loc=(0, 0, -0.13)), "spine": dict(x=-6), "neck": dict(x=-18), "head": dict(x=-14),
       "thigh.L": dict(x=62), "thigh.R": dict(x=62), "shin.L": dict(x=-120), "shin.R": dict(x=-120), "hfoot.L": dict(x=18), "hfoot.R": dict(x=18),
       "arm.L": dict(x=-30), "arm.R": dict(x=-30), "fore.L": dict(x=-4), "fore.R": dict(x=-4), "tail1": dict(x=-70), "tail2": dict(x=-35), "tail3": dict(x=-20)}
def merge(*ps):
    r = {}
    for p in ps:
        for k, v in p.items():
            a = dict(r.get(k, {}))
            for kk, vv in v.items(): a[kk] = tuple(x + y for x, y in zip(a[kk], vv)) if kk == "loc" and kk in a else (a.get(kk, 0) + vv if kk != "loc" else vv)
            r[k] = a
    return r
FPS = 30
def clip(name, dur, keys):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    rig.animation_data_create(); rig.animation_data.action = act
    for t, pose in keys:
        for pb in rig.pose.bones:
            pb.rotation_mode = 'XYZ'; p = pose.get(pb.name, {})
            pb.rotation_euler = (math.radians(p.get("x", 0)), math.radians(p.get("y", 0)), math.radians(p.get("z", 0)))
            pb.location = p.get("loc", (0, 0, 0))
            f = 1 + round(t * dur * FPS)
            pb.keyframe_insert("rotation_euler", frame=f); pb.keyframe_insert("location", frame=f)
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act)
    rig.animation_data.action = None
def cyc(n, f):  # n samples over a loop, f(phase 0..1) -> pose
    return [(i / n, f(i / n)) for i in range(n + 1)]
S = lambda p: math.sin(p * 2 * math.pi)
C = lambda p: math.cos(p * 2 * math.pi)
# Idle: sat, breathing, a lazy tail flick and a look round
clip("Idle", 4.0, cyc(16, lambda p: merge(SIT, {"spine": dict(x=1.5 * S(p * 2)), "head": dict(y=14 * S(p), x=4 * S(p * 2)),
     "tail2": dict(z=10 * S(p)), "tail3": dict(z=35 * S(p * 2) * max(0, S(p)), x=8 * S(p * 2))})))
# Groom: sat, left forepaw up to the mouth, head dipping to lick it
clip("Groom", 2.0, cyc(12, lambda p: merge(SIT, {"arm.L": dict(x=85), "fore.L": dict(x=-95), "paw.L": dict(x=-30),
     "neck": dict(x=-8 + 6 * S(p * 3), y=-10), "head": dict(x=-28 + 8 * S(p * 3), y=-12), "tail3": dict(z=12 * S(p))})))
def gait(amp, bob, ph):
    return lambda p: {"hips": dict(loc=(0, 0, bob * abs(S(p))), x=3 * S(p * 2)), "spine": dict(x=-3 * S(p * 2)),
        "thigh.L": dict(x=amp * S(p + ph)), "shin.L": dict(x=-25 * max(0, C(p + ph)) ), "thigh.R": dict(x=amp * S(p + ph + 0.5)), "shin.R": dict(x=-25 * max(0, C(p + ph + 0.5))),
        "arm.L": dict(x=amp * S(p + 0.5)), "fore.L": dict(x=-35 * max(0, -C(p + 0.5))), "arm.R": dict(x=amp * S(p)), "fore.R": dict(x=-35 * max(0, -C(p))),
        "neck": dict(x=-3 * S(p * 2)), "head": dict(y=3 * S(p)), "tail1": dict(x=-25, z=8 * S(p)), "tail2": dict(z=10 * S(p - 0.1)), "tail3": dict(z=14 * S(p - 0.2))}
clip("Walk", 0.9, cyc(12, gait(24, 0.008, 0.25)))
clip("Run", 0.42, cyc(10, gait(38, 0.02, 0.1)))
CROUCH = {"hips": dict(loc=(0, 0, -0.07)), "thigh.L": dict(x=30), "thigh.R": dict(x=30), "shin.L": dict(x=-40), "shin.R": dict(x=-40),
          "arm.L": dict(x=-35), "arm.R": dict(x=-35), "fore.L": dict(x=55), "fore.R": dict(x=55), "neck": dict(x=-10), "tail1": dict(x=-50)}
LEAP = {"hips": dict(loc=(0, 0.12, 0.10), x=12), "thigh.L": dict(x=-50), "thigh.R": dict(x=-50), "shin.L": dict(x=20), "shin.R": dict(x=20),
        "arm.L": dict(x=75), "arm.R": dict(x=75), "fore.L": dict(x=10), "fore.R": dict(x=10), "paw.L": dict(x=-30), "paw.R": dict(x=-30), "head": dict(x=10), "tail1": dict(x=-10)}
STRIKE = merge(LEAP, {"hips": dict(loc=(0, 0.14, -0.08), x=-24), "arm.L": dict(x=-30), "arm.R": dict(x=10), "paw.L": dict(x=-50), "head": dict(x=-10)})
clip("Pounce", 0.9, [(0, {}), (0.18, CROUCH), (0.3, merge(CROUCH, {"hips": dict(z=8)})), (0.4, merge(CROUCH, {"hips": dict(z=-8)})), (0.55, LEAP), (0.72, STRIKE), (1.0, {})])
bpy.context.scene.frame_end = 200
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animation_mode='NLA_TRACKS', export_apply=False, export_yup=True)
print("exported", OUT)
if PROOF:
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 8
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 0.8; cam.location = (1.5, -0.4, 0.3); cam.rotation_euler = (math.radians(85), 0, math.radians(75))
    l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'SUN')); sc.collection.objects.link(l); l.rotation_euler = (0.6, 0.6, 1.2); l.data.energy = 4
    wd = bpy.data.worlds.new('w'); sc.world = wd; wd.color = (0.5, 0.5, 0.5)
    sc.render.resolution_x = 320; sc.render.resolution_y = 260
    shots = [("Idle", 0), ("Idle", 0.5), ("Groom", 0.25), ("Walk", 0), ("Walk", 0.25), ("Run", 0.5), ("Pounce", 0.18), ("Pounce", 0.55), ("Pounce", 0.72)]
    for i, (nm, t) in enumerate(shots):
        for tr in rig.animation_data.nla_tracks: tr.mute = tr.name != nm
        act = bpy.data.actions[nm]; sc.frame_set(int(1 + t * (act.frame_range[1] - 1)))
        sc.render.filepath = f"/tmp/sam_{i}.png"; bpy.ops.render.render(write_still=True)
