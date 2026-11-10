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
gh = (G.matrix_world @ G.data.bones['Hips'].head_local); rh = (R.matrix_world @ R.data.bones['Hips'].head_local)
s = gh.z / rh.z; R.scale = tuple(x * s for x in R.scale); bpy.context.view_layer.update()
rh = R.matrix_world @ R.data.bones['Hips'].head_local; R.location += Vector((gh.x - rh.x, gh.y - rh.y, 0)); bpy.context.view_layer.update()
RJ = {b.name: (R.matrix_world @ b.head_local, R.matrix_world @ b.tail_local) for b in R.data.bones}
OLD = {b.name: (G.matrix_world @ b.matrix_local) for b in G.data.bones}
FING = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
STRETCH = ('Spine', 'Neck', 'Shoulder', 'Arm', 'ForeArm', 'UpLeg', 'Leg', 'Foot')
meshes = [o for o in game if o.type == 'MESH']
for o in meshes:
    if o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks: k.value = 0
bpy.context.view_layer.objects.active = G; bpy.ops.object.mode_set(mode='POSE')
emp = []
for pb in G.pose.bones:
    if pb.name not in RJ or any(f in pb.name for f in FING): continue
    h, t = RJ[pb.name]
    e = bpy.data.objects.new('h', None); bpy.context.scene.collection.objects.link(e); e.location = h; emp.append(e)
    c = pb.constraints.new('COPY_LOCATION'); c.target = e
    if pb.name.endswith(STRETCH) or pb.name in ('Hips',):
        f = bpy.data.objects.new('t', None); bpy.context.scene.collection.objects.link(f); f.location = t; emp.append(f)
        c = pb.constraints.new('STRETCH_TO'); c.target = f; c.volume = 'NO_VOLUME'; c.rest_length = pb.bone.length
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
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
bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.visual_transform_apply()
for pb in G.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for e in emp: bpy.data.objects.remove(e)
bpy.context.view_layer.update()
J = {b.name: (G.matrix_world @ b.head_local) for b in G.data.bones}
# draw the skin onto the approved surface
R.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
ev = RB.evaluated_get(dg); me = ev.to_mesh(); bvh = BVHTree.FromPolygons([RB.matrix_world @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons]); ev.to_mesh_clear()
NECK0, NECK1 = J['Neck'].z - .06, J['Neck'].z
WR = abs(J['LeftHand'].x)
def weight(p):
    w = 1 - ss(NECK0, NECK1, p.z)
    if p.z > J['LeftArm'].z - .3: w *= 1 - ss(WR - .06, WR - .01, abs(p.x))
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
