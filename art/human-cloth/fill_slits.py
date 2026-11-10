"""Slits in a garment (Nov 10: grey-white stripes along the orange tank's straps, skin seen through two thin holes per strap).
The garment's real openings (neck, armholes, hem) are one boundary loop, its largest; every smaller boundary loop is a hole: filled
from its own vertices (weights and shape keys ride along), UVs copied from each vertex's existing face, normals turned to their neighbours.
Usage: blender -b --python-exit-code 1 -P fill_slits.py -- in.glb out.glb [in2 out2 ...]"""
import bpy, bmesh, sys, os
def loops_of(bm):
    adj = {}
    for e in bm.edges:
        if e.is_boundary:
            for v in e.verts: adj.setdefault(v, []).append(e)
    seen, out = set(), []
    for s in adj:
        if s in seen: continue
        st, comp = [s], set()
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x)
            for e in adj[x]: comp.add(e); st.append(e.other_vert(x))
        out.append(comp)
    return sorted(out, key=len, reverse=True)
def run(src, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); n = 0
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.name.startswith('Ward_'): continue
        bm = bmesh.new(); bm.from_mesh(o.data); uv = bm.loops.layers.uv.active
        loops = loops_of(bm)
        for edges in loops[1:]:
            r = bmesh.ops.holes_fill(bm, edges=list(edges), sides=0)
            for f in r['faces']:
                nb = [g for e in f.edges for g in e.link_faces if g is not f]
                if nb and sum((g.normal for g in nb), f.normal * 0).dot(f.normal) < 0: f.normal_flip()
                if uv:
                    for l in f.loops:
                        src_l = next((x for x in l.vert.link_loops if x.face is not f and x.face not in r['faces']), None)
                        if src_l: l[uv].uv = src_l[uv].uv
                if nb: f.material_index = nb[0].material_index
            n += 1
        bm.normal_update(); bm.to_mesh(o.data); bm.free()
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_animations=False)
    print('FILL', os.path.basename(src), 'holes', n)
a = sys.argv[sys.argv.index('--') + 1:]
for i in range(0, len(a), 2): run(a[i], a[i + 1])
