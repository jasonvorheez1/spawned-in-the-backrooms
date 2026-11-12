# Pull a ballooning garment back toward the body at the back and sides (Nov 12: the jacket stood off the spine like a bell).
# blender -b --factory-startup --python tuck.py -- body.glb garment.glb out.glb [gap] [keep]
import bpy, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; BODY, GAR, OUT = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.022; KEEP = float(a[4]) if len(a) > 4 else 0.3
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY)
body = max((o for o in bpy.context.scene.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices) if "ody" in o.name else 0)
if body.data.shape_keys:
    for k in body.data.shape_keys.key_blocks: k.value = 0
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(body, dg)
MWb = body.matrix_world.copy()
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=GAR)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
for o in bpy.context.scene.objects:
    if o.type != "MESH": continue
    me = o.data; MW = o.matrix_world; MI = MW.inverted(); n = 0; mx = 0
    blocks = me.shape_keys.key_blocks if me.shape_keys else None
    base = [v.co.copy() for v in me.vertices]
    for i, c in enumerate(base):
        w = MW @ c
        hit = bvh.find_nearest(MWb.inverted() @ w)
        if not hit or hit[0] is None: continue
        p = MWb @ hit[0]; d = (w - p).length
        if d <= GAP: continue
        back = sm((w.y + 0.05) / 0.05)                       # back and sides only: the front keeps its drape and the bust
        torso = 1 - sm((abs(w.x) - 0.13) / 0.04)             # sleeves stay
        wt = back * torso
        if wt <= 0: continue
        nd = GAP + (d - GAP) * KEEP
        t = w + (p - w) * ((d - nd) / d) * wt
        dl = MI @ t - c; mx = max(mx, dl.length); n += 1
        if blocks:
            for k in blocks: k.data[i].co = k.data[i].co + dl
        else: me.vertices[i].co = c + dl
    print("TUCK", o.name, n, "max", round(mx, 4))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
