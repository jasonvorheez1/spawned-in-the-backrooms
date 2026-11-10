"""Loose strips on a garment (Nov 10: grey-white stripes along the orange tank's straps). The women's tank carried four thin loose
strips, one on each strap edge front and back, peeling off the strap; skin showed between strip and strap. Every face island under
5% of the garment's biggest island is deleted (weights, UVs and shape keys of what stays are untouched).
Usage: blender -b --python-exit-code 1 -P fill_slits.py -- in.glb out.glb [in2 out2 ...]"""
import bpy, bmesh, sys, os
def islands(bm):
    seen, out = set(), []
    for f in bm.faces:
        if f in seen: continue
        st, c = [f], []
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x); c.append(x)
            for e in x.edges:
                for g in e.link_faces:
                    if g not in seen: st.append(g)
        out.append(c)
    return sorted(out, key=len, reverse=True)
def run(src, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); n = 0
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.name.startswith('Ward_'): continue
        bm = bmesh.new(); bm.from_mesh(o.data); isl = islands(bm)
        drop = [f for c in isl[1:] if len(c) < 0.05 * len(isl[0]) for f in c]; n += sum(1 for c in isl[1:] if len(c) < 0.05 * len(isl[0]))
        if drop:
            bmesh.ops.delete(bm, geom=drop, context='FACES')
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(o.data); bm.free()
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_animations=False)
    print('STRIP', os.path.basename(src), 'islands', n)
a = sys.argv[sys.argv.index('--') + 1:]
for i in range(0, len(a), 2): run(a[i], a[i + 1])
