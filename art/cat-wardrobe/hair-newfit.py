# A prefit Tripo wig (hair-prefit.py output, in the cat head's space) -> a game hairstyle, WITHOUT remeshing:
# every vertex the cat skull pokes through is lifted out along the skull normal (6 mm clear), the lift spread smoothly over
# the strand so locks rise whole instead of tearing; a hair-coloured scalp cap under the strands hides any skin between them;
# a Hatted shape key presses the crown flat for hats; skinned to mixamorig:Head with the cat's armature, slot "hair".
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/hair-newfit.py -- <prefit.glb> <out.glb> <f|m>
import bpy, bmesh, sys, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src, out, sex = sys.argv[sys.argv.index("--")+1:][:3]
MARGIN = 0.006
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
if arm.animation_data: arm.animation_data.action = None
head = bpy.data.objects["Head"]
for k in head.data.shape_keys.key_blocks: k.value = 0
head.data.shape_keys.key_blocks["Ear_Hide"].value = 1
dg = bpy.context.evaluated_depsgraph_get()
bh = bmesh.new(); bh.from_object(head, dg); bh.transform(head.matrix_world); bh.normal_update(); bvh = BVHTree.FromBMesh(bh)
HP = np.array([v.co[:] for v in bh.verts]); top = HP[np.abs(HP[:, 0]) < 0.02][:, 2].max(); bot = HP[:, 2].min(); hh = top - bot
ctr = Vector((0, float(np.median(HP[HP[:, 2] > top - 0.45 * hh][:, 1])), top - 0.42 * hh))
for o in list(bpy.data.objects):
    if o.type == "MESH": bpy.data.objects.remove(o, do_unlink=True)
before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=src)
hair = [o for o in bpy.data.objects if o not in before and o.type == "MESH"][0]
for o in [o for o in bpy.data.objects if o not in before and o is not hair]: bpy.data.objects.remove(o, do_unlink=True)
M = hair.matrix_world.copy(); hair.parent = None; hair.data.transform(M); hair.matrix_world.identity()
bm = bmesh.new(); bm.from_mesh(hair.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004); bm.verts.ensure_lookup_table()
n = len(bm.verts); P = np.array([v.co[:] for v in bm.verts])
def deficit(P):
    D = np.zeros((n, 3)); bad = 0
    for i, p in enumerate(P):
        q, nr, _, _ = bvh.find_nearest(Vector(p))
        if q is None: continue
        d = (Vector(p) - q).dot(nr)
        inside = d < 0 or (bvh.ray_cast(Vector(p), (Vector(p) - ctr).normalized(), 0.3)[0] is not None and d < 0.02 and (Vector(p) - ctr).dot(nr) > 0 and False)
        if d < MARGIN: D[i] = np.array(nr[:]) * (MARGIN - d); bad += 1
    return D, bad
nb = [[e.other_vert(v).index for e in v.link_edges] for v in bm.verts]
for it in range(4):
    D, bad = deficit(P)
    print("PASS", it, "verts under the skin", bad)
    if bad == 0: break
    mag = np.linalg.norm(D, axis=1)
    for _ in range(12):   # spread: a vertex lifts at least most of what its neighbours lift, so locks rise whole
        nm = mag.copy(); nd = D.copy()
        for i in range(n):
            if not nb[i]: continue
            j = max(nb[i], key=lambda k: mag[k])
            if mag[j] * 0.85 > nm[i]: nm[i] = mag[j] * 0.85; nd[i] = D[j] * 0.85
        mag, D = nm, nd
    P = P + D
for v, p in zip(bm.verts, P): v.co = Vector(p)
bm.to_mesh(hair.data); bm.free()
for f in hair.data.polygons: f.use_smooth = True
# scalp cap: the skull's faces the hair covers from outside, 3 mm off the skin, hair material
hb = bmesh.new(); hb.from_mesh(hair.data); hbvh = BVHTree.FromBMesh(hb)
cap = bh.copy(); cap.normal_update()
drop = []
for f in cap.faces:
    c = f.calc_center_median(); nr = f.normal
    if c.z < top - 0.62 * hh or nr.length < 0.5: drop.append(f); continue
    hit = hbvh.ray_cast(c + nr * 0.001, nr, 0.08)
    if hit[0] is None: drop.append(f)
bmesh.ops.delete(cap, geom=drop, context="FACES")
for v in cap.verts: v.co += v.normal * 0.003
cm = bpy.data.meshes.new("cap"); cap.to_mesh(cm); ncap = len(cm.polygons)
co = bpy.data.objects.new("cap", cm); bpy.context.collection.objects.link(co)
co.data.materials.append(hair.data.materials[0])
for p_ in cm.polygons: p_.use_smooth = True
if hair.data.uv_layers:   # the cap samples the strand colour right above it: one uv for all, the hair texture's darkest root
    cm.uv_layers.new(name=hair.data.uv_layers[0].name)
    uv0 = hair.data.uv_layers[0].data; best = uv0[0].uv.copy()
    for l in cm.uv_layers[0].data: l.uv = best
bpy.ops.object.select_all(action="DESELECT"); co.select_set(True); hair.select_set(True); bpy.context.view_layer.objects.active = hair; bpy.ops.object.join()
print("CAP faces", ncap, "TRIS", sum(len(p.vertices) - 2 for p in hair.data.polygons))
# Hatted: crown pressed onto the skull (8 mm off) above the brow, as hair-hatted.py
def ss(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
brow = top - hh * .38
hair.shape_key_add(name="Basis"); k = hair.shape_key_add(name="Hatted", from_mix=False)
for i, v in enumerate(hair.data.vertices):
    p = v.co.copy(); w = ss(brow - .015, brow + .03, p.z)
    if w <= 0: continue
    d = p - ctr; L = d.length
    if L < 1e-5: continue
    nn = d / L; hit = bvh.ray_cast(ctr, nn)
    if hit[0] is None: continue
    s = (hit[0] - ctr).length; allowed = s + .008 + max(0, L - s - .008) * .1
    if L > allowed: k.data[i].co = ctr + nn * (L + (allowed - L) * w)
hair.name = "hair"; hair.vertex_groups.clear()
g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")
hair.parent = arm; hair.modifiers.new("skin", "ARMATURE").object = arm
for m in hair.data.materials: m.name = "hair"
bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_skins=True, export_morph=True, export_animations=False, export_apply=False, export_image_format="JPEG")
print("DONE", out)
