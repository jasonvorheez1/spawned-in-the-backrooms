# Adds a "Hatted" shape key to every cat hairstyle: hair above the brow is pressed down onto the skull (~8 mm off it),
# so a fitted Tripo hat (hats.py) sits on the head, not perched on the hair. Shelly's ruling: hair close, flat under hats.
# catMorph sets Hatted = 1 while a hat model is worn. Run: blender -b --python this -- <key> <sex> <in.glb> <out.glb>
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
key, sex, src, dst = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/tmp/hf/body{sex}.glb")
head = bpy.data.objects["Head"]; dg = bpy.context.evaluated_depsgraph_get(); me = head.evaluated_get(dg).to_mesh()
g = head.vertex_groups.get("mixamorig:Head")
pts = [head.matrix_world @ v.co for v in head.data.vertices if any(e.group == g.index and e.weight > .5 for e in v.groups)]
bm = bmesh.new(); bm.from_mesh(me); bm.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm)
top = max(p.z for p in pts if abs(p.x) < .02); bot = min(p.z for p in pts); h = top - bot
band = [p for p in pts if p.z > top - h * .45 and abs(p.x) < .05]
c = Vector((0, sum(p.y for p in band) / len(band), top - h * .42))
brow = top - h * .38
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=src)
hair = [o for o in bpy.context.scene.objects if o.type == "MESH"]
def ss(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
moved = 0
for o in hair:
    if not o.data.shape_keys: o.shape_key_add(name="Basis")
    if "Hatted" in o.data.shape_keys.key_blocks: o.shape_key_remove(o.data.shape_keys.key_blocks["Hatted"])
    k = o.shape_key_add(name="Hatted", from_mix=False)
    M = o.matrix_world; Mi = M.inverted()
    base = o.data.shape_keys.key_blocks[0].data
    for i, bv in enumerate(base):
        p = M @ bv.co
        w = ss(brow - .015, brow + .03, p.z)
        if w <= 0: continue
        d = p - c; L = d.length
        if L < 1e-5: continue
        n = d / L; hit = bvh.ray_cast(c, n)
        if not hit[0]: continue
        s = (hit[0] - c).length
        allowed = s + .008 + max(0, L - s - .008) * .1
        if L <= allowed: continue
        q = c + n * (L + (allowed - L) * w)
        k.data[i].co = Mi @ q; moved += 1
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=dst, export_morph=True, export_skins=True, export_apply=False)
print("HATTED", key, sex, "moved", moved)
