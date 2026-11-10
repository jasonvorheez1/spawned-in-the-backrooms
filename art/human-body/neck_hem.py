"""Neck hem (Nov 10, Shelly "the neck is off"): the head's neck ends in an open rim resting on the body's collar, which
reads as a dark seam at the back when they move. The open rim (boundary verts below `zmax`) drops by `d` so it sinks
into the body (back and sides only: the chin's rim stays), the loop above it by d/2; shape keys follow. Usage: ... -- in.glb out.glb zmax d"""
import bpy, sys, bmesh
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; zmax, d = float(a[2]), float(a[3])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
H = bpy.data.objects['Head']; me = H.data; mw = H.matrix_world; inv = mw.inverted()
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
low = [mw @ v.co for v in bm.verts if (mw @ v.co).z < zmax]
cy = (min(p.y for p in low) + max(p.y for p in low)) / 2      # neck centre; front of it (-Y) is the chin/throat, left alone
rim = {v.index for e in bm.edges if e.is_boundary for v in e.verts if (mw @ v.co).z < zmax and (mw @ v.co).y > cy - 0.015}
ring2 = {o.index for i in rim for e in bm.verts[i].link_edges for o in [e.other_vert(bm.verts[i])] if o.index not in rim}
bm.free()
kb = me.shape_keys.key_blocks if me.shape_keys else []
def drop(i, s):
    p = mw @ me.vertices[i].co; p.z -= s; me.vertices[i].co = inv @ p
    for k in kb:
        w = mw @ k.data[i].co; w.z -= s; k.data[i].co = inv @ w
for i in rim: drop(i, d)
for i in ring2: drop(i, d / 2)
print('HEM rim', len(rim), 'ring2', len(ring2))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
