# Remakes a cat hairstyle from its Tripo shape so it FITS the cat head (Shelly: "redo ALL the hairstyles to fit the head + just make it good").
# Per style: junk hugging the skull, hair in the eye zone and hair through the ears is cut away; a hair cap 4 mm off the skull is laid wherever
# hair covers the scalp; hair + cap are fused into one clean solid (voxel), the part inside the skull dropped, smoothed (Taubin), decimated to ~6k,
# then Hatted + Snout_* keys are rebuilt and it is skinned weight 1 to mixamorig:Head on the cat's own armature. One slot: "hair".
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/hair-rebuild.py -- <srcdir> <outdir> name:sex ...
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT, jobs = a[0], a[1], a[2:]
EARS = "/workspace/hairfit2/ears/upright-%s.glb"
TUNE = {"twintails": dict(mirror=1, ear=0.03), "hime": dict(mirror=1), "bob": dict(mirror=1), "lob": dict(eyeok=1)}   # lob: the creator's ref has the long bang over one eye
TRIS = 6000
def ss(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def act(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
def mkobj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o
def mod(o, kind, **kw):
    m = o.modifiers.new(kind, kind)
    for k, v in kw.items(): setattr(m, k, v)
    act(o); bpy.ops.object.modifier_apply(modifier=m.name)
def sd(bvh, p):
    loc, n, i, d = bvh.find_nearest(p)
    return (p - loc).dot(n), loc, n
for job in jobs:
    name, sex = job.split(":"); T = TUNE.get(name, {})
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
    for o in list(bpy.context.scene.objects):
        if o.name.startswith("Icosphere"): bpy.data.objects.remove(o, do_unlink=True)
    head = bpy.data.objects["Head"]; arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    HM = head.matrix_world; kb = head.data.shape_keys.key_blocks
    hp = [HM @ v.co for v in head.data.vertices]
    snout = {k.name: [HM.to_3x3() @ (k.data[i].co - kb[0].data[i].co) for i in range(len(hp))] for k in kb if k.name.startswith("Snout_")}
    kdh = KDTree(len(hp))
    for i, p in enumerate(hp): kdh.insert(p, i)
    kdh.balance()
    bot = min(p.z for p in hp); top = max(p.z for p in hp if abs(p.x) < 0.02); H = top - bot
    bmE = bmesh.new(); bmE.from_mesh(head.data); bmE.transform(HM); bvhE = BVHTree.FromBMesh(bmE)          # head with its own ears
    for k in kb: k.value = 0
    kb["Ear_Hide"].value = 1
    bmH = bmesh.new(); bmH.from_object(head, bpy.context.evaluated_depsgraph_get()); bmH.transform(HM); bmH.normal_update(); bvh = BVHTree.FromBMesh(bmH)   # ears sunk: the skull the game shows
    brow = top - 0.19
    # sculpted ears
    before = set(bpy.context.scene.objects); bpy.ops.import_scene.gltf(filepath=EARS % sex)
    bmS = bmesh.new()
    for o in [o for o in bpy.context.scene.objects if o not in before]:
        if o.type == "MESH" and not o.name.startswith("Icosphere"):
            t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new("t"); t.to_mesh(me); bmS.from_mesh(me)
    bvhS = BVHTree.FromBMesh(bmS)
    for o in [o for o in bpy.context.scene.objects if o not in before]: bpy.data.objects.remove(o, do_unlink=True)
    # source hair
    before = set(bpy.context.scene.objects); bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    new = [o for o in bpy.context.scene.objects if o not in before]
    bm = bmesh.new()
    for o in new:
        if o.type == "MESH" and not o.name.startswith("Icosphere"):
            t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new("t"); t.to_mesh(me); bm.from_mesh(me)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    n0 = len(bm.faces); flag = {}
    for v in bm.verts:
        p = v.co; s, loc, n = sd(bvh, p)
        near = s < 0.003
        eye = p.z < brow + 0.004 and p.y < -0.10 and abs(p.x) < 0.14 and not (T.get("eyeok") and p.x > 0)
        ear = bvhS.find_nearest(p)[3] < T.get("ear", 0.035)   # a clean ring round each sculpted ear: the cap shows there, the ear comes through it
        e2 = bvhE.find_nearest(p)
        ear = ear or (e2[3] < 0.007 and sd(bvh, e2[0])[0] > 0.012)     # wrapped round the head's own (now sunk) ear
        if T.get("sheath") and p.z > top - 0.02 and 0.07 < abs(p.x) < 0.27: ear = True   # the Tripo hair's own cat-ear cones
        flag[v] = (near, eye or ear)
    kill = [f for f in bm.faces if all(flag[v][0] for v in f.verts) or any(flag[v][1] for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    if T.get("mirror"):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
        d = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])
        vs = [g for g in d["geom"] if isinstance(g, bmesh.types.BMVert)]
        for v in vs: v.co.x = -v.co.x
        bmesh.ops.reverse_faces(bm, faces=[g for g in d["geom"] if isinstance(g, bmesh.types.BMFace)])
    bm.normal_update(); bvhHair = BVHTree.FromBMesh(bm)
    hair = mkobj("hairsrc", bm); mod(hair, "SOLIDIFY", thickness=0.006, offset=0)
    # scalp cap where hair covers the skull
    cap = bmH.copy(); bmesh.ops.subdivide_edges(cap, edges=cap.edges[:], cuts=1, use_grid_fill=True); cap.normal_update()
    keep = set()
    for v in cap.verts:
        p = v.co; t = ss(-0.10, 0.08, p.y)
        zl = (top - 0.15) * (1 - t) + (top - 0.36) * t
        if abs(p.x) > 0.17 and p.y < 0.0: zl = max(zl, top - 0.17)
        tg = ss(-0.10, 0.08, p.y); zg = (top - 0.13) * (1 - tg) + (top - 0.30) * tg   # the whole scalp above a generic hairline wears the cap: no bald patch shows through a parting
        if abs(p.x) > 0.17 and p.y < 0.0: zg = max(zg, top - 0.17)
        ok = p.z > zg
        if not ok and p.z > zl:
            h = bvhHair.ray_cast(p + v.normal * 0.001, v.normal, 0.04)
            ok = h[0] is not None
        if ok: keep.add(v)
    bmesh.ops.delete(cap, geom=[f for f in cap.faces if not all(v in keep for v in f.verts)], context="FACES")
    for v in cap.verts: v.co += v.normal * 0.004
    capo = mkobj("cap", cap); mod(capo, "SOLIDIFY", thickness=0.03, offset=-1)
    act(hair); capo.select_set(True); bpy.ops.object.join()
    hair.data.remesh_voxel_size = 0.0035; bpy.ops.object.voxel_remesh()
    # drop what is inside the skull, crumbs, and anything left in the eye zone
    bm = bmesh.new(); bm.from_mesh(hair.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if sd(bvh, v.co)[0] < -0.0015], context="VERTS")
    seen = set(); small = []
    for v in bm.verts:
        if v in seen: continue
        isl = [v]; seen.add(v); i = 0
        while i < len(isl):
            for e in isl[i].link_edges:
                w = e.other_vert(isl[i])
                if w not in seen: seen.add(w); isl.append(w)
            i += 1
        if len(isl) < 400: small += isl
    bmesh.ops.delete(bm, geom=small, context="VERTS")
    for v in bm.verts:
        p = v.co
        if p.z < brow and p.y < -0.10 and abs(p.x) < 0.14 and not (T.get("eyeok") and p.x > 0): p.z = brow + (p.z - brow) * 0.15
    bm.to_mesh(hair.data); bm.free()
    for i in range(6):
        mod(hair, "SMOOTH", factor=0.5, iterations=1); mod(hair, "SMOOTH", factor=-0.53, iterations=1)
    nt = sum(len(p.vertices) - 2 for p in hair.data.polygons)
    mod(hair, "DECIMATE", ratio=min(1, TRIS / nt))
    mod(hair, "SMOOTH", factor=0.3, iterations=1)
    # nothing under the skin after smoothing/decimation
    for v in hair.data.vertices:
        s, loc, n = sd(bvh, v.co)
        if -0.02 < s < 0.0005: v.co = loc + n * 0.0005
    for p in hair.data.polygons: p.use_smooth = True
    hair.name = "hair"; hair.data.name = "hair"; hair.data.materials.clear()
    m = bpy.data.materials.new("hair"); m.use_nodes = True; m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.42, 0.29, 0.21, 1); m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.64
    hair.data.materials.append(m)
    # keys
    hair.shape_key_add(name="Basis")
    band = [p for p in hp if p.z > top - H * .45 and abs(p.x) < .05]
    c = Vector((0, sum(p.y for p in band) / len(band), top - H * .42)); hb = top - H * .38
    k = hair.shape_key_add(name="Hatted", from_mix=False); moved = 0
    for i, v in enumerate(hair.data.vertices):
        p = v.co; w = ss(hb - .015, hb + .03, p.z)
        if w <= 0: continue
        d = p - c; L = d.length; n = d / L; hit = bvh.ray_cast(c, n)
        if not hit[0]: continue
        s = (hit[0] - c).length; allowed = s + .008 + max(0, L - s - .008) * .1
        if L > allowed: k.data[i].co = c + n * (L + (allowed - L) * w); moved += 1
    for kn, dl in snout.items():
        k = hair.shape_key_add(name=kn, from_mix=False)
        for i, v in enumerate(hair.data.vertices):
            hits = kdh.find_n(v.co, 6); ws = 0; d = Vector()
            for _, j, dist in hits:
                w = 1 / max(dist, 1e-4) ** 2; ws += w; d += dl[j] * w
            fall = max(0.0, 1 - max(0.0, hits[0][2] - 0.03) / 0.05)
            k.data[i].co = v.co + d / ws * fall
    # skin
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o is not hair: bpy.data.objects.remove(o, do_unlink=True)
    g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(range(len(hair.data.vertices)), 1.0, "REPLACE")
    hair.parent = arm; hair.matrix_parent_inverse = arm.matrix_world.inverted()
    hair.modifiers.new("skin", "ARMATURE").object = arm
    bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_morph=True, export_skins=True, export_apply=False, export_animations=False)
    xs = [v.co.x for v in hair.data.vertices]
    print("REBUILT", name, sex, "cut", len(kill), "/", n0, "tris", sum(len(p.vertices) - 2 for p in hair.data.polygons), "hatted", moved, f"xmean={sum(xs)/len(xs):.3f} x[{min(xs):.3f},{max(xs):.3f}]", "keys", [k.name for k in hair.data.shape_keys.key_blocks])
