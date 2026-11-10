# Shelly Nov 10 ("if im on the new body then you did a horrid job"): transfer.py bent HER body onto the old game skeleton, so the old proportions won.
# This does it the other way: the game rig takes the approved body's joints (rest pose rebuilt, bone names, weights, morph keys and head kept),
# then the game skin is drawn onto the approved surface. Writes bones.json (old rest -> new rest per bone) + field.json for the garments.
# blender -b --factory-startup --python-exit-code 1 --python reshape.py -- <m|f> <approved rig.glb> <game human.glb> <out.glb> <bones.json> <field.json>
import bpy, sys, json
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index('--') + 1:]; SEX, REB, GAME, OUT, BONES, FIELD = a[:6]
def ss(e0, e1, x): t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GAME); game = set(bpy.data.objects)
G = next(o for o in game if o.type == 'ARMATURE')
bpy.ops.import_scene.gltf(filepath=REB)
R = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o not in game)
RB = next(o for o in bpy.data.objects if o.type == 'MESH' and o not in game and o.find_armature() == R)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o not in game: o.select_set(True)
bpy.context.view_layer.objects.active = R; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
GW = G.matrix_world.copy(); GWi = GW.inverted()
gh = GW @ G.data.bones['Hips'].head_local; rh = R.data.bones['Hips'].head_local.copy()
s = gh.z / rh.z; R.scale = (s, s, s); R.location = Vector((gh.x - rh.x * s, gh.y - rh.y * s, 0)); bpy.context.view_layer.update()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
FING = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
STRETCH = ('Spine', 'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg')
def order(arm):
    out = []
    def walk(b): out.append(b.name); [walk(c) for c in b.children]
    for b in arm.data.bones:
        if b.parent is None: walk(b)
    return out
OLD = {b.name: (GW @ b.matrix_local) for b in G.data.bones}
GD = {n: ((GW @ G.data.bones[n].tail_local) - (GW @ G.data.bones[n].head_local)).normalized() for n in OLD}
# 1. her rig turned into the game's T-pose, her own bone lengths kept
bpy.context.view_layer.objects.active = R; bpy.ops.object.mode_set(mode='POSE')
for n in order(R):
    if n not in GD or any(f in n for f in FING): continue
    pb = R.pose.bones[n]; bpy.context.view_layer.update()
    h = pb.head.copy(); rr = pb.bone.matrix_local.to_3x3()
    q = rr.col[1].normalized().rotation_difference(GD[n])
    pb.matrix = Matrix.Translation(h) @ (q.to_matrix() @ rr).to_4x4()
bpy.context.view_layer.update()
RJ = {pb.name: pb.head.copy() for pb in R.pose.bones}
RL = {b.name: b.length for b in R.data.bones}
bpy.ops.object.mode_set(mode='OBJECT')
meshes = [o for o in game if o.type == 'MESH']
SEAM = []
_body0 = [o for o in meshes if o.name == 'Body' or o.name.startswith('Skin_')]
_p0 = [(o, v.index, o.matrix_world @ v.co) for o in _body0 for v in o.data.vertices]
_kd0 = KDTree(len(_p0))
for i, (_, _, q) in enumerate(_p0): _kd0.insert(q, i)
_kd0.balance(); _seen = set()
_B0o = next(o for o in _body0 if o.name == 'Body'); _B0o.data.calc_loop_triangles()
_TRI = [tuple(t.vertices) for t in _B0o.data.loop_triangles]
_B0 = [_B0o.matrix_world @ (_B0o.data.shape_keys.key_blocks[0].data[i].co if _B0o.data.shape_keys else v.co) for i, v in enumerate(_B0o.data.vertices)]
_BVH0 = BVHTree.FromPolygons(_B0, _TRI)
_W0 = {(o.name, j): q for o, j, q in _p0}
for i, (_, _, q) in enumerate(_p0):
    if i in _seen: continue
    g = [j for _, j, _ in _kd0.find_range(q, 2e-4)]
    if len(g) > 1: SEAM.append([(_p0[j][0], _p0[j][1]) for j in g]); _seen.update(g)
for o in meshes:
    if o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks: k.value = 0
# 2. the game rig takes her joints: each bone's head to hers, its length to hers, its direction its own
bpy.context.view_layer.objects.active = G; bpy.ops.object.mode_set(mode='POSE')
for n in order(G):
    if n not in RJ or any(f in n for f in FING) or n.endswith(('Toe_End', 'HeadTop_End')): continue
    pb = G.pose.bones[n]; bpy.context.view_layer.update()
    rot = OLD[n].to_3x3().normalized()
    sc = RL[n] / ((GW @ pb.bone.tail_local) - (GW @ pb.bone.head_local)).length if n in STRETCH else 1
    pb.matrix = GWi @ (Matrix.Translation(RJ[n]) @ rot.to_4x4() @ Matrix.Diagonal((1, sc, 1, 1)))
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
emp = []
dg = bpy.context.evaluated_depsgraph_get()
posed = {}
for o in meshes:
    ev = o.evaluated_get(dg); me = ev.to_mesh(); posed[o.name] = [v.co.copy() for v in me.vertices]; ev.to_mesh_clear()
NEW = {pb.name: (G.matrix_world @ pb.matrix) for pb in G.pose.bones}
json.dump({n: [list(r) for r in (NEW[n] @ OLD[n].inverted())] for n in OLD}, open(BONES, 'w'))
# bake: mesh basis (and every key) takes the pose; the pose becomes the rest
for o in meshes:
    mods = [m for m in o.modifiers if m.type == 'ARMATURE']
    if not mods or len(posed[o.name]) != len(o.data.vertices): continue
    d = [p - v.co for p, v in zip(posed[o.name], o.data.vertices)]
    sets = [k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
    for pts in sets:
        for v, dd in zip(pts, d): v.co += dd
    o.data.update()
bpy.context.view_layer.objects.active = G; bpy.ops.object.mode_set(mode='POSE')
for pb in G.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for e in emp: bpy.data.objects.remove(e)
bpy.context.view_layer.update()
J = {b.name: (G.matrix_world @ b.head_local) for b in G.data.bones}
# draw the skin onto the approved surface
bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
ev = RB.evaluated_get(dg); me = ev.to_mesh(); bvh = BVHTree.FromPolygons([RB.matrix_world @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons]); ev.to_mesh_clear()
NECK0, NECK1 = J['Neck'].z - .06, J['Neck'].z
WR = abs(J['LeftHand'].x)
def weight(p):
    w = 1 - ss(NECK0, NECK1, p.z)
    w *= 1 - ss(J['LeftArm'].z - .4, J['LeftArm'].z - .25, p.z) * ss(WR - .06, WR - .01, abs(p.x))
    w *= 1 - ss(J['LeftArm'].z - .14, J['LeftArm'].z - .04, p.z) * ss(abs(J['LeftArm'].x) + .01, abs(J['LeftArm'].x) + .08, abs(p.x))  # arms keep their own shape past the shoulder; z and x both eased, no hard line
    hz = J['Hips'].z
    w *= 1 - (1 - ss(.04, .08, abs(p.x))) * (1 - ss(.05, .11, abs(p.z - (hz - .1))))
    return w
body = [o for o in meshes if o.name == 'Body' or o.name.startswith('Skin_')]
pts, dl, own = [], [], []
for o in body:
    mw = o.matrix_world
    for v in o.data.vertices:
        p = mw @ v.co; w = weight(p); d = Vector()
        if w > 0:
            hit = bvh.find_nearest(p)
            if hit[0] is not None and hit[3] < .06: d = (hit[0] - p) * w
        pts.append(p); dl.append(d); own.append((o, v.index))
kd = KDTree(len(pts))
for i, p in enumerate(pts): kd.insert(p, i)
kd.balance()
for it in range(5):
    nd = []
    for i, p in enumerate(pts):
        acc = Vector(); ws = 0
        for _, j, dd in kd.find_range(p, .02): ww = 1 / (dd + .004); acc += dl[j] * ww; ws += ww
        nd.append(acc / ws if ws else dl[i])
    dl = nd
for i, p in enumerate(pts):
    nb = kd.find_range(p, 1e-5)
    if len(nb) > 1: dl[i] = sum((dl[j] for _, j, _ in nb), Vector()) / len(nb)
for (o, vi), d in zip(own, dl):
    ld = o.matrix_world.inverted().to_3x3() @ d
    if o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks: kb.data[vi].co += ld
    else: o.data.vertices[vi].co += ld
def _co(o, i): return (o.data.shape_keys.key_blocks[0].data[i].co if o.data.shape_keys else o.data.vertices[i].co)
for g in SEAM:
    avg = sum((o.matrix_world @ _co(o, i) for o, i in g), Vector()) / len(g)
    for o, i in g:
        d = o.matrix_world.inverted() @ avg - _co(o, i)
        if o.data.shape_keys:
            for kb in o.data.shape_keys.key_blocks: kb.data[i].co += d
        else: o.data.vertices[i].co += d
# Skin_ pieces are the Body's own surface doubled (shown behind cut clothes): at rest they lay ON it, so they go back on it,
# or the two layers z-fight into patches. Snapped to the reshaped Body's nearest point; every morph key keeps its own offset.
from mathutils.geometry import barycentric_transform as _bt
_B = next(o for o in body if o.name == 'Body')
_bv = [_B.matrix_world @ _co(_B, i) for i in range(len(_B.data.vertices))]
for o in body:
    if not o.name.startswith('Skin_'): continue
    inv = o.matrix_world.inverted()
    for i in range(len(o.data.vertices)):
        w = o.matrix_world @ _co(o, i)
        hit = _BVH0.find_nearest(_W0[(o.name, i)])
        if not hit[0] or hit[3] > 0.03: continue
        t = _TRI[hit[2]]
        nw = _bt(_W0[(o.name, i)], _B0[t[0]], _B0[t[1]], _B0[t[2]], _bv[t[0]], _bv[t[1]], _bv[t[2]])
        d = inv.to_3x3() @ (nw - w)
        if any(c != c for c in d) or d.length > 0.06: continue
        if o.data.shape_keys:
            for kb in o.data.shape_keys.key_blocks: kb.data[i].co += d
        else: o.data.vertices[i].co += d
for o in body: o.data.update()
sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'body-rig'))
from arm_shape import weld_skin_normals
for o in body:
    bpy.context.view_layer.objects.active = o
    if o.data.has_custom_normals:
        o.select_set(True)
        try: bpy.ops.mesh.customdata_custom_splitnormals_clear()
        except RuntimeError: pass
        o.select_set(False)
    for f in o.data.polygons: f.use_smooth = True
weld_skin_normals()
print('MOVED', len(pts), 'max', round(max(d.length for d in dl), 4), 'mean', round(sum(d.length for d in dl) / len(dl), 4))
json.dump([[list(p), list(d)] for p, d in zip(pts, dl)], open(FIELD, 'w'))
for o in list(bpy.data.objects):
    if o not in game: bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.context.scene.objects: o.select_set(o.type in ('ARMATURE', 'MESH'))
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_morph_normal=True, export_skins=True, export_format='GLB')
print('OUT', OUT)
