"""Seams that crack when the arm moves (Nov 10, Shelly: "fix the shoulder and rig"): the body is split into pieces (Body, Skin_torso,
Skin_upperarms...) whose edge vertices sit on top of each other at rest but carry different skin weights, so a raised or swung arm
pulls the two sides apart into a black crack across the shoulder. This averages the weights of every coincident vertex (within 0.1 mm,
across every skinned mesh in the file), keeping the 4 strongest bones, so both sides of each seam ride the same bones.
Usage: blender -b --python-exit-code 1 -P weld_weights.py -- in.glb out.glb [in2 out2 ...]"""
import bpy, sys, os
from mathutils.kdtree import KDTree
def run(src, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    ms = [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups and o.find_armature()]
    P = []
    for oi, o in enumerate(ms):
        for v in o.data.vertices: P.append((oi, v.index, o.matrix_world @ v.co))
    kd = KDTree(len(P))
    for i, (_, _, p) in enumerate(P): kd.insert(p, i)
    kd.balance()
    seen, fixed = set(), 0
    for i, (oi, vi, p) in enumerate(P):
        if i in seen: continue
        cl = [j for (_, j, _) in kd.find_range(p, 1e-4)]
        if len(cl) < 2: continue
        seen.update(cl)
        acc = {}
        for j in cl:
            o = ms[P[j][0]]; names = {g.index: g.name for g in o.vertex_groups}
            for ge in o.data.vertices[P[j][1]].groups:
                if ge.weight > 0: acc[names[ge.group]] = acc.get(names[ge.group], 0) + ge.weight / len(cl)
        top = sorted(acc.items(), key=lambda kv: -kv[1])[:4]; s = sum(w for _, w in top) or 1
        want = {n: w / s for n, w in top}
        same = True
        for j in cl:
            o = ms[P[j][0]]; names = {g.index: g.name for g in o.vertex_groups}
            have = {names[ge.group]: ge.weight for ge in o.data.vertices[P[j][1]].groups if ge.weight > 0}
            if set(have) != set(want) or any(abs(have[n] - want[n]) > 1e-3 for n in want): same = False
        if same: continue
        for j in cl:
            o = ms[P[j][0]]; vi2 = P[j][1]
            for g in o.vertex_groups: g.remove([vi2])
            for n, w in want.items():
                g = o.vertex_groups.get(n) or o.vertex_groups.new(name=n); g.add([vi2], w, 'REPLACE')
        fixed += 1
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_animations=False)
    print('WELD', os.path.basename(src), 'clusters fixed', fixed)
a = sys.argv[sys.argv.index('--') + 1:]
for i in range(0, len(a), 2): run(a[i], a[i + 1])
