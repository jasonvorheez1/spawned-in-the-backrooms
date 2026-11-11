"""Collar follow (Nov 11): with arms down the trapezius skin rises on its own weights while collars and scarves rode theirs,
so skin cut through them as jagged teeth. Every garment vert in the collar band takes the body's weights at its nearest skin point
(barycentric), faded out over the band's lower 4 cm; top 4 influences, normalized. Usage: -- body.glb zlo zhi outdir g1.glb ..."""
import bpy, sys, os
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform, intersect_point_tri
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; bodyf, zlo, zhi, od = a[0], float(a[1]), float(a[2]), a[3]; FADE = 0.04
def load(f):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
    return [o for o in bpy.data.objects if o.type == 'MESH']
V, T, W = [], [], []
for bo in load(bodyf):
    if not (bo.name.startswith('Skin_') or 'Head' in bo.name): continue
    mw = bo.matrix_world; k = len(V); names = {g.index: g.name for g in bo.vertex_groups}
    for v in bo.data.vertices: V.append(mw @ v.co); W.append({names[g.group]: g.weight for g in v.groups if g.weight > 0})
    bo.data.calc_loop_triangles(); T += [[k + i for i in t.vertices] for t in bo.data.loop_triangles]
tree = BVHTree.FromPolygons(V, T)
def bw(p):
    loc, nor, ti, d = tree.find_nearest(p, 0.06)
    if loc is None: return None
    i, j, k = T[ti]; A, B, C = V[i], V[j], V[k]
    u = barycentric_transform(loc, A, B, C, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    out = {}
    for wt, vi in zip(u, (i, j, k)):
        for n, w in W[vi].items(): out[n] = out.get(n, 0) + max(0.0, wt) * w
    return out
for g in a[4:]:
    n = 0
    for o in load(g):
        if not o.vertex_groups: continue
        gw = o.matrix_world
        for i, v in enumerate(o.data.vertices):
            p = gw @ v.co
            if not (zlo <= p.z <= zhi) or abs(p.x) > 0.2: continue
            t = min(1.0, (p.z - zlo) / FADE); t = t * t * (3 - 2 * t)
            b = bw(p)
            if not b: continue
            own = {o.vertex_groups[x.group].name: x.weight for x in v.groups}
            mix = {k: t * b.get(k, 0) + (1 - t) * own.get(k, 0) for k in set(b) | set(own)}
            top = dict(sorted(mix.items(), key=lambda kv: -kv[1])[:4]); s = sum(top.values()) or 1
            for name in own: o.vertex_groups[name].remove([i])
            for name, w in top.items():
                vg = o.vertex_groups.get(name) or o.vertex_groups.new(name=name); vg.add([i], w / s, 'REPLACE')
            n += 1
    if n:
        bpy.ops.export_scene.gltf(filepath=os.path.join(od, os.path.basename(g)), export_apply=False, export_morph=True, export_skins=True)
    print('FIXED' if n else 'SAME', os.path.basename(g), n)
