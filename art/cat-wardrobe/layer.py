# Nov 15 Kyoto: lay one fitted garment over another as one piece (a haori over its yukata). Both come from fit.py on the same body;
# the outer's verts that sit inside or within CLEAR of the inner's surface slide out along the inner's normal, the move smoothed so nothing tears.
# run: blender -b --factory-startup --python layer.py -- inner.glb outer.glb out.glb
import bpy, sys
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index("--") + 1:]; INNER, OUTER, OUT = A[:3]; CLEAR = 0.009
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=INNER); inn = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]; arm = inn.find_armature()
bpy.ops.import_scene.gltf(filepath=OUTER); out = [o for o in bpy.context.scene.objects if o.type == "MESH" and o != inn][0]; oarm = out.find_armature()
dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(inn, dg)
mw = out.matrix_world; iw = inn.matrix_world.inverted(); d = {}
for v in out.data.vertices:
    p = iw @ (mw @ v.co); loc, n, _, dist = bvh.find_nearest(p)
    if loc is None: continue
    s = (p - loc).dot(n)
    if s < CLEAR: d[v.index] = n * (CLEAR - s)
nb = {i: [] for i in range(len(out.data.vertices))}
for e in out.data.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
for _ in range(2):
    d2 = dict(d)
    for i in list(nb):
        ms = [d[j] for j in nb[i] if j in d] + ([d[i]] if i in d else [])
        if ms and (i in d or len(ms) >= 2): s = ms[0].copy(); [s.__iadd__(m) for m in ms[1:]]; v = s / len(ms); d2[i] = v if i not in d or v.length > d[i].length else d[i]
    d = d2
inv = mw.inverted().to_3x3() @ inn.matrix_world.to_3x3()
for i, m in d.items(): out.data.vertices[i].co += inv @ m
print("LAYER moved", len(d), "of", len(out.data.vertices))
out.modifiers.clear(); out.parent = arm; out.matrix_parent_inverse = arm.matrix_world.inverted() @ oarm.matrix_world @ oarm.matrix_world.inverted() if False else out.matrix_parent_inverse
m = out.modifiers.new("Armature", "ARMATURE"); m.object = arm
bpy.data.objects.remove(oarm)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animations=False, export_image_format="JPEG", export_jpeg_quality=80)
