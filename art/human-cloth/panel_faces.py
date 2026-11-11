"""Panel faces (Nov 11): the jeans are sewn panels with a lining twin. A few faces in each outer panel faced inward (and a few lining
faces outward), so backface culling dropped them and the leg showed pale holes on the inner calf mid-stride.
Each panel island takes its majority facing: an outer panel faces out from its leg's line, a lining panel faces in.
Usage: panel_faces.py in.glb out.glb"""
import bpy, sys, bmesh
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]; mw = J.matrix_world; R = mw.to_3x3()
bm = bmesh.new(); bm.from_mesh(J.data); bm.faces.ensure_lookup_table()
# each leg's line per 5 cm band from the cloth itself
bands = {}
for v in bm.verts:
    p = mw @ v.co; bands.setdefault((1 if p.x >= 0 else -1, int(p.z / 0.05)), []).append(p)
AX = {k: ((min(q.x for q in v) + max(q.x for q in v)) / 2, (min(q.y for q in v) + max(q.y for q in v)) / 2) for k, v in bands.items()}
def out_of(f):
    c = mw @ f.calc_center_median(); s = 1 if c.x >= 0 else -1
    ax = AX.get((s, int(c.z / 0.05)), (0.075 * s, 0.16)) if c.z < 0.8 else (0.0, AX.get((s, int(c.z / 0.05)), (0, 0.16))[1])
    n = R @ f.normal; return (c.x - ax[0]) * n.x + (c.y - ax[1]) * n.y
seen = set(); flips = 0
for f in bm.faces:
    if f.index in seen: continue
    st = [f]; isl = []; seen.add(f.index)
    while st:
        g = st.pop(); isl.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.index not in seen: seen.add(h.index); st.append(h)
    sc = [out_of(g) for g in isl]; outer = sum(1 for x in sc if x > 0) >= len(isl) / 2
    bad = [g for g, x in zip(isl, sc) if (x < -1e-4 if outer else x > 1e-4)]
    if bad and len(bad) < len(isl) * 0.4:
        bmesh.ops.reverse_faces(bm, faces=bad); flips += len(bad)
bm.to_mesh(J.data); bm.free()
print("FLIPPED", flips)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
