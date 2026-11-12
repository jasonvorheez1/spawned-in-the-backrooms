# Cinch a skirt's waistband onto the body (Nov 12, Shelly 'fix': the band stood off the hips as an open ring, arms through it).
# blender -b --factory-startup --python cinch.py -- body.glb skirt.glb out.glb [gap] [band]
import bpy, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; BODY, GAR, OUT = a[:3]; GAP = float(a[3]) if len(a) > 3 else 0.006; BAND = float(a[4]) if len(a) > 4 else 0.45
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY)
body = max((o for o in bpy.context.scene.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices) if "ody" in o.name else 0)
if body.data.shape_keys:
    for k in body.data.shape_keys.key_blocks: k.value = 0
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get()); MWb = body.matrix_world.copy(); MBi = MWb.inverted()
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=GAR)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
for o in bpy.context.scene.objects:
    if o.type != "MESH" or not o.vertex_groups: continue
    me = o.data; MW = o.matrix_world; MI = MW.inverted().to_3x3()
    blocks = me.shape_keys.key_blocks if me.shape_keys else None
    W = [MW @ v.co for v in me.vertices]; z0 = min(w.z for w in W); z1 = max(w.z for w in W); h = z1 - z0
    top = [w for w in W if w.z > z1 - h * 0.15]; cx = sum(w.x for w in top) / len(top); cy = sum(w.y for w in top) / len(top)   # the band's own centre: inside the torso
    mx = 0; gap0 = 0
    for i, w in enumerate(W):
        t = sm((w.z - (z1 - h * BAND)) / (h * BAND))       # 1 at the band's top edge, 0 where the flare begins
        if t <= 0: continue
        # the body's surface along the horizontal ray from the spine axis out through this vert
        d = Vector((w.x - cx, w.y - cy, 0)); r = d.length
        if r < 1e-5: continue
        d /= r; org = Vector((cx, cy, w.z))                 # cast from inside outward: the torso's own skin, never an arm or the tail
        hit = bvh.ray_cast(MBi @ org, (MBi.to_3x3() @ d).normalized())
        if not hit or hit[0] is None: continue
        p = MWb @ hit[0]; rb = Vector((p.x - cx, p.y - cy, 0)).length
        if rb > r: continue
        gap0 = max(gap0, r - rb)
        nr = rb + GAP + max(0, r - rb - GAP) * (1 - t)
        dl = MI @ (d * (nr - r)); mx = max(mx, dl.length)
        if blocks:
            for k in blocks: k.data[i].co = k.data[i].co + dl
        else: me.vertices[i].co = me.vertices[i].co + dl
    print("CINCH", o.name, "top gap was", round(gap0, 4), "max move", round(mx, 4), "z", round(z0, 3), round(z1, 3))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
