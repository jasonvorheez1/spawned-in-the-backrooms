"""Cup smooth: the tank's upper chest and straps came out of tank_shell lumpy (crumples read as cracks in game).
Laplacian-smooth the basis above the underbust with a soft falloff, then push any vertex back out to >= GAP off the
visible skin so nothing pokes through. Shape keys get the same delta. Usage: -- body.glb garment.glb out.glb [z0] [iters]"""
import bpy, sys, bmesh
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; body, garm, out = a[:3]
Z0 = float(a[3]) if len(a) > 3 else 1.06; IT = int(a[4]) if len(a) > 4 else 25; GAP = float(__import__("os").environ.get("GAP", "0.0045"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith(('Skin_torso', 'Skin_upperarms', 'Skin_neck')):
        t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new('t'); t.to_mesh(me); bm.from_mesh(me)
bm.normal_update(); tree = BVHTree.FromBMesh(bm)
keep = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=garm)
new = [o for o in bpy.data.objects if o not in keep]
for g in [o for o in new if o.type == 'MESH' and o.vertex_groups]:
    me = g.data; M = g.matrix_world; Mi = M.inverted()
    co = [M @ v.co for v in me.vertices]; orig = [c.copy() for c in co]
    w = [max(0.0, min(1.0, (c.z - Z0) / 0.05)) for c in co]
    b = bmesh.new(); b.from_mesh(me); b.verts.ensure_lookup_table()
    nb = [[e.other_vert(v).index for e in v.link_edges] for v in b.verts]
    edge = [any(len(e.link_faces) < 2 for e in v.link_edges) for v in b.verts]
    for _ in range(IT):
        nxt = []
        for i, c in enumerate(co):
            if w[i] == 0 or not nb[i]: nxt.append(c); continue
            avg = sum((co[j] for j in nb[i]), co[i] * 0) / len(nb[i])
            f = 0.5 * w[i] * (0.5 if edge[i] else 1.0)
            nxt.append(c.lerp(avg, f))
        co = nxt
        for i, c in enumerate(co):  # stay off the skin
            if w[i] == 0: continue
            hit = tree.find_nearest(c)
            if hit[0] is None: continue
            p, n, _, d = hit
            s = (c - p).dot(n)
            if s < GAP: co[i] = p + n * GAP
    for i, c in enumerate(co):  # a last stand-off pass (IT=0 runs this alone: push out, no smoothing)
        if w[i] == 0: continue
        hit = tree.find_nearest(c)
        if hit[0] is None: continue
        p, n, _, d = hit
        if (c - p).dot(n) < GAP: co[i] = p + n * GAP
    moved = 0
    delta = [Mi @ c - Mi @ o for c, o in zip(co, orig)]
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, d in enumerate(delta): kb.data[i].co += d
    for i, d in enumerate(delta):
        if not me.shape_keys: me.vertices[i].co += d
        if d.length > 1e-5: moved += 1
    print('SMOOTH', g.name, 'moved', moved)
for o in list(bpy.data.objects):
    if o not in new: bpy.data.objects.remove(o)
for o in new:
    if o.type == 'ARMATURE': o.name = 'Armature'  # the body's rig took the name on import; the engine reads the garment's own
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
