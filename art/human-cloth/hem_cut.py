"""Hem cut: a garment's armholes and sleeve ends were cut stair-stepped from the packed body. Find each side opening (a crease
ring beside the arm), fit its plane, and re-cut the cloth cleanly on that plane just inside the deepest tooth, then close the
two cloth layers with a bridged hem. Shape keys and skin weights ride bmesh's interpolation.
Usage: blender -b -P hem_cut.py -- in.glb out.glb"""
import bpy, sys, bmesh, mathutils
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')]:
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    sharp = set()
    for e in bm.edges:
        if e.is_boundary or (len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.75): sharp.add(e)
    # connected crease rings
    seen, comps = set(), []
    for e in sharp:
        if e in seen: continue
        st, comp = [e], []
        seen.add(e)
        while st:
            x = st.pop(); comp.append(x)
            for v in x.verts:
                for y in v.link_edges:
                    if y in sharp and y not in seen: seen.add(y); st.append(y)
        comps.append(comp)
    allz = [v.co for v in bm.verts]; cx = sum((p.x for p in allz)) / len(allz)
    cuts = []
    for comp in comps:
        vs = list({v for e in comp for v in e.verts})
        if len(vs) < 16: continue
        c = sum((v.co for v in vs), Vector()) / len(vs)
        if abs(c.x - cx) < 0.07: continue          # the neck and the hem sit on the middle: only side openings
        # plane fit: covariance's smallest axis
        import numpy as np
        P = np.array([[*(v.co - c)] for v in vs]); w, V = np.linalg.eigh(P.T @ P); n = Vector(V[:, 0])
        if n.x * (c.x - cx) < 0: n = -n            # normal points out toward the arm
        d = min((v.co - c).dot(n) for v in vs)     # the deepest tooth toward the body
        cuts.append((c + n * (d - 0.002), n, len(vs)))
    for co, n, k in cuts:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r = bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=co, plane_no=n, clear_outer=True)
        cut = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
        if cut:
            try: bmesh.ops.bridge_loops(bm, edges=cut)
            except Exception as ex: print('bridge skipped', ex)
        print('CUT', o.name, 'ring', k, 'at', tuple(round(x, 3) for x in co), 'n', tuple(round(x, 2) for x in n))
    bm.to_mesh(me); bm.free()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
