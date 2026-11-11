"""Neck shorten, garments (Nov 11): neck_short.py drops the body's Head bone by D. A split garment keeps its own bind, so its
head-weighted verts drop D * w_head on the new skeleton: a scarf's nape sank and skin showed. Each vert is pre-moved by
D*w_head - want, want = the body's own field (D*ss(z) near the neck, D*w_head off it), so it lands where the body went.
Hair, hats, glasses (all head) get 0 and drop with the head. Usage: ... -- D z0 z1 outdir in1.glb in2.glb ..."""
import bpy, sys, os
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; D, z0, z1, od = float(a[0]), float(a[1]), float(a[2]), a[3]
def ss(z): t = max(0.0, min(1.0, (z - z0) / (z1 - z0))); return t * t * (3 - 2 * t)
for src in a[4:]:
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    R = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if not R or 'Head' not in R.data.bones: print('SKIP', os.path.basename(src)); continue
    heads = {'Head'} | {b.name for b in R.data.bones['Head'].children_recursive}
    mx = 0.0
    for o in bpy.data.objects:
        if o.type != 'MESH': continue
        hi = {g.index for g in o.vertex_groups if g.name in heads}; mw = o.matrix_world; inv = mw.inverted(); me = o.data
        cs = []
        for v in me.vertices:
            tot = sum(g.weight for g in v.groups) or 1.0; wh = sum(g.weight for g in v.groups if g.group in hi) / tot
            p = mw @ v.co; want = D * ss(p.z) if abs(p.x) <= 0.16 else D * wh
            cs.append(D * wh - want)
        mx = max([mx] + [abs(c) for c in cs])
        if not any(abs(c) > 1e-5 for c in cs): continue
        blocks = me.shape_keys.key_blocks if me.shape_keys else None
        if blocks:
            for kb in blocks:
                for i, c in enumerate(cs):
                    if c: kb.data[i].co = inv @ ((mw @ kb.data[i].co) + Vector((0, 0, c)))
        else:
            for i, c in enumerate(cs):
                if c: me.vertices[i].co = inv @ ((mw @ me.vertices[i].co) + Vector((0, 0, c)))
        me.update()
    if mx > 0.001:
        out = os.path.join(od, os.path.basename(src)); bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
        print('FIXED', os.path.basename(src), round(mx, 4))
    else: print('SAME', os.path.basename(src), round(mx, 4))
