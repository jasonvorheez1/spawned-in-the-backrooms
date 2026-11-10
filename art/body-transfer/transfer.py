# Shelly's refined bodies (art/body-rebuild) put into the game: the rebuilt surface is retargeted onto the game rig's joints,
# then the game body (Body + Skin_* regions) is drawn onto it; head, hands, morph keys, bones and weights stay the game's own.
# The per-vertex move is saved as a field the garments (Ward_*) take, so every fitted outfit follows the new shape.
# blender -b --factory-startup --python-exit-code 1 --python transfer.py -- <sex m|f> <rebuilt.glb> <game_human.glb> <out.glb> <field.json>
import bpy, sys, json, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index('--') + 1:]; SEX, REB, GAME, OUT, FIELD = a[:5]
def ss(e0, e1, x): t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GAME); game = set(bpy.data.objects)
G = next(o for o in game if o.type == 'ARMATURE')
J = {b.name: (G.matrix_world @ b.head_local, G.matrix_world @ b.tail_local) for b in G.data.bones}
bpy.ops.import_scene.gltf(filepath=REB)
R = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o not in game)
RB = next(o for o in bpy.data.objects if o.type == 'MESH' and o not in game and o.find_armature() == R)
for o in bpy.data.objects:
    if o not in game and o.type == 'MESH' and o != RB: o.hide_render = True
# 1. scale the rebuilt body so its hips sit at the game's hip height
hr = (R.matrix_world @ R.data.bones['Hips'].head_local); hg = J['Hips'][0]
s = hg.z / hr.z; R.scale = (R.scale.x * s,) * 3; bpy.context.view_layer.update()
hr = R.matrix_world @ R.data.bones['Hips'].head_local; R.location += Vector((hg.x - hr.x, hg.y - hr.y, 0)); bpy.context.view_layer.update()
# 2. every shared bone: its head to the game's head, its tail stretched to the game's tail (lengths only, no bulge)
bpy.context.view_layer.objects.active = R; bpy.ops.object.mode_set(mode='POSE')
LEAF = ('Hand', 'HeadTop', 'Toe', 'End')
for pb in R.pose.bones:
    if pb.name not in J: continue
    h, t = J[pb.name]
    e = bpy.data.objects.new('h_' + pb.name, None); bpy.context.scene.collection.objects.link(e); e.location = h
    c = pb.constraints.new('COPY_LOCATION'); c.target = e
    if any(k in pb.name for k in ('Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky')) and pb.name not in ('LeftHand', 'RightHand'): continue
    f = bpy.data.objects.new('t_' + pb.name, None); bpy.context.scene.collection.objects.link(f); f.location = t
    c = pb.constraints.new('STRETCH_TO'); c.target = f; c.volume = 'NO_VOLUME'; c.rest_length = pb.bone.length
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); ev = RB.evaluated_get(dg); me = ev.to_mesh()
TV = [RB.matrix_world @ v.co for v in me.vertices]; TP = [tuple(p.vertices) for p in me.polygons]; ev.to_mesh_clear()
bvh = BVHTree.FromPolygons(TV, TP)
# 3. the game body drawn onto it: full below the collar, nothing at the head seam; hands keep the game's fingers
NECK0, NECK1 = J['Neck'][0].z - .07, J['Neck'][0].z - .01
WR = abs(J['LeftHand'][0].x)
def weight(p):
    w = 1 - ss(NECK0, NECK1, p.z)
    if p.z > J['LeftArm'][0].z - .25: w *= 1 - ss(WR - .07, WR - .015, abs(p.x))
    return w
body = [o for o in game if o.type == 'MESH' and (o.name == 'Body' or o.name.startswith('Skin_'))]
pts, dl, own = [], [], []
for o in body:
    mw = o.matrix_world
    for v in o.data.vertices:
        p = mw @ v.co; w = weight(p); d = Vector()
        if w > 0:
            hit = bvh.find_nearest(p)
            if hit[0] is not None and hit[3] < .08: d = (hit[0] - p) * w
        pts.append(p); dl.append(d); own.append((o, v.index))
# smooth the field so concave spots (armpit, crotch) do not tear, and seams between regions move as one
kd = KDTree(len(pts))
for i, p in enumerate(pts): kd.insert(p, i)
kd.balance()
for it in range(4):
    nd = []
    for i, p in enumerate(pts):
        nb = kd.find_range(p, .018); acc = Vector(); ws = 0
        for _, j, dd in nb: ww = 1 / (dd + .004); acc += dl[j] * ww; ws += ww
        nd.append(acc / ws if ws else dl[i])
    dl = [nd[i] * (1 if weight(pts[i]) > .001 else 0) for i in range(len(pts))]
# coincident seam vertices: exactly the same move
for i, p in enumerate(pts):
    nb = kd.find_range(p, 1e-5)
    if len(nb) > 1: dl[i] = sum((dl[j] for _, j, _ in nb), Vector()) / len(nb)
for (o, vi), d in zip(own, dl):
    inv = o.matrix_world.inverted().to_3x3(); ld = inv @ d
    o.data.vertices[vi].co += ld
    if o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks: kb.data[vi].co += ld
for o in body: o.data.update()
mx = max(d.length for d in dl); print('MOVED', len(pts), 'max', round(mx, 4), 'mean', round(sum(d.length for d in dl) / len(dl), 4))
json.dump([[list(p), list(d)] for p, d in zip(pts, dl) if d.length > 1e-5 or True], open(FIELD, 'w'))
# 4. out: only the game's own file, rebuilt pieces dropped
for o in list(bpy.data.objects):
    if o not in game: bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.context.scene.objects: o.select_set(o.type in ('ARMATURE', 'MESH'))
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_morph_normal=True, export_skins=True, export_format='GLB')
print('OUT', OUT)
