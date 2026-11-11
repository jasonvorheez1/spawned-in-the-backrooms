"""Male body, Nov 11: armpit skin folded inward (showed through tee sleeves as a notch) when the arm swung back.
The armpit region's weights are smoothed across Arm/Shoulder/Spine2 on welded neighbours. Usage: armpit_weights.py in.glb out.glb proofdir"""
import bpy, sys, math, bmesh
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
src, out, proof = a
ITERS, K = 30, 0.6
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
shx = abs((arm.matrix_world @ arm.data.bones['LeftArm'].head_local).x)
shz = (arm.matrix_world @ arm.data.bones['LeftArm'].head_local).z
print("shoulder x", round(shx, 3), "z", round(shz, 3))
skins = [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups and o.name.startswith('Skin_')]
def region(p): return shx - 0.07 < abs(p.x) < shx + 0.20 and shz - 0.17 < p.z < shz + 0.03
GROUPS = lambda side: [side + n for n in ('Arm', 'Shoulder')] + ['Spine2', 'Spine1']
tot = 0
for o in skins:
    me = o.data; M = o.matrix_world
    P = [M @ v.co for v in me.vertices]
    sel = [i for i, p in enumerate(P) if region(p)]
    if not sel: continue
    key = lambda p: (round(p.x, 5), round(p.y, 5), round(p.z, 5))
    grp = {}
    for i, p in enumerate(P): grp.setdefault(key(p), []).append(i)
    nb = {i: set() for i in range(len(P))}
    for e in me.edges:
        i, j = e.vertices; nb[i].add(j); nb[j].add(i)
    for ids in grp.values():
        u = set().union(*(nb[i] for i in ids))
        for i in ids: nb[i] = u
    names = {g.name: g.index for g in o.vertex_groups}
    def W(i): return {o.vertex_groups[g.group].name: g.weight for g in me.vertices[i].groups}
    cur = {i: W(i) for i in range(len(P))}
    for _ in range(ITERS):
        nxt = {}
        for i in sel:
            side = 'Left' if P[i].x > 0 else 'Right'; gs = GROUPS(side)
            # falloff: full in the core, eased at the edge
            edge = min(abs(P[i].x) - (shx - 0.07), (shx + 0.20) - abs(P[i].x), P[i].z - (shz - 0.17), (shz + 0.03) - P[i].z)
            f = K * max(0, min(1, edge / 0.025))
            w = dict(cur[i]); lock = sum(v for k, v in w.items() if k not in gs)
            avg = {}
            for j in nb[i]:
                for k in gs: avg[k] = avg.get(k, 0) + cur[j].get(k, 0) / len(nb[i])
            mine = sum(w.get(k, 0) for k in gs); s = sum(avg.values()) or 1
            for k in gs: w[k] = w.get(k, 0) * (1 - f) + (avg[k] / s * mine) * f
            nxt[i] = w
        cur.update(nxt)
    for i in sel:
        for k, x in cur[i].items():
            if k not in names:
                if x < 0.005: continue
                names[k] = o.vertex_groups.new(name=k).index
            o.vertex_groups[names[k]].add([i], x, 'REPLACE')
    tot += len(sel); print(o.name, "armpit verts", len(sel))
print("total", tot)
for o in skins:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT'); bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
# proof: arm swung back, front-left
for sd, s in (('Left', 1), ('Right', -1)):
    pb = arm.pose.bones[sd + 'Arm']; pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(-35), 0, math.radians(70 * s))
for o in bpy.data.objects:
    if o.type == 'MESH' and not (o.name.startswith('Skin_') or o.name in ('Body', 'Head')): o.hide_render = True
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 600
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.5
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 60
cam.location = (-0.7, -0.9, 1.3); d = Vector((-0.22, 0, 1.2)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = proof + "/armpit.png"; bpy.ops.render.render(write_still=True)
