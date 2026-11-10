# Shelly's female base (/cdn/model-humanoid-genshin-anime-female-base-yfbdzh16.glb), rigged by hand:
# a mixamo skeleton measured onto the mesh (Tripo's auto-rig put both shoulder joints in the middle of the chest).
import bpy, math, mathutils, sys, os
SRC = "/workspace/rb/base_one.glb"; OUT = "/workspace/rb/female_rig.glb"; PROOF = "/workspace/rb/proof"
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
# elbows: heat weights hand off arm to forearm in a hard step, which pinches a bent elbow; blend the hand-off wider
bpy.context.view_layer.objects.active = body
for side_ in ("Left", "Right"):
    for g in (side_ + "Arm", side_ + "ForeArm"):
        body.vertex_groups.active_index = body.vertex_groups[g].index
        bpy.ops.object.vertex_group_smooth(group_select_mode='ACTIVE', factor=0.6, repeat=6, expand=0.15)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
# smooth (Shelly: "still seeing jagginess"): one Catmull-Clark level applied after weighting, so every new vertex inherits blended weights
nb = len(body.data.polygons)
sub = body.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 1; sub.quality = 3
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_move_to_index(modifier="sub", index=0); bpy.ops.object.modifier_apply(modifier="sub")
for poly in body.data.polygons: poly.use_smooth = True
print("faces", nb, "->", len(body.data.polygons), "unweighted after", sum(1 for v in body.data.vertices if not v.groups))
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
