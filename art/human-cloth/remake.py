# Rebuild garments as clean cloth shells (Shelly Nov 9: "redoing all the clothes in blender to make it much better, more realistic-animeish").
# The old garments were the body's own faces picked and pushed out: torn hems, shredded waist bands, lumps of skin under the fabric.
# Each garment here is re-made from that shape as one watertight shell:
#  1. thickened inward (the fabric sits where it did; the extra depth hides inside the body), voxel-remeshed: holes, flaps and tears fuse
#  2. Taubin-smoothed: skin bumps iron into fabric; hems come out as rounded, sewn-looking rims
#  3. decimated to a game budget, then skin weights and every shape key are carried over from the old garment at the nearest point
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/remake.py -- in.glb out.glb [names,comma]
import bpy, bmesh, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]
ONLY = a[2].split(",") if len(a) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
# garment family -> (inward depth m, voxel m, smooth passes, target tris). Savi's picks
PLAN = {"Top_": (0.014, 0.0045, 6, 9000), "Bot_pants": (0.012, 0.0045, 5, 7000), "Bot_shorts": (0.012, 0.0045, 5, 5000),
        "Bot_pjpants": (0.012, 0.0045, 6, 7000), "Bot_overalls": (0.012, 0.0045, 5, 8000)}
def plan(n): return next((v for k, v in PLAN.items() if n.startswith(k)), None)
def taubin(bm, passes):
    adj = {v: [e.other_vert(v) for e in v.link_edges] for v in bm.verts}
    for _ in range(passes):
        for f in (0.5, -0.53):
            new = {v: v.co + (sum((w.co for w in nb), Vector()) / len(nb) - v.co) * f for v, nb in adj.items() if nb}
            for v, c in new.items(): v.co = c
done = {}
for old in [o for o in bpy.data.objects if o.type == "MESH"]:
    P = plan(old.name)
    if not P or (ONLY and old.name not in ONLY): continue
    keys = [k.name for k in old.data.shape_keys.key_blocks] if old.data.shape_keys else []
    # source copy for sampling: basis positions, weights, key deltas
    sb = bmesh.new(); sb.from_mesh(old.data); sb.verts.ensure_lookup_table(); sb.faces.ensure_lookup_table()
    bmesh.ops.triangulate(sb, faces=sb.faces[:]); sb.faces.ensure_lookup_table()
    dl = sb.verts.layers.deform.active; KL = {k: sb.verts.layers.shape.get(k) for k in keys}
    bvh = BVHTree.FromBMesh(sb)
    gnames = {g.index: g.name for g in old.vertex_groups}
    # new shell
    n = old.copy(); n.data = old.data.copy(); n.name = old.name + "_new"; bpy.context.collection.objects.link(n)
    n.shape_key_clear() if n.data.shape_keys else None
    n.modifiers.clear(); n.vertex_groups.clear()
    bpy.ops.object.select_all(action="DESELECT"); n.select_set(True); bpy.context.view_layer.objects.active = n
    sd = n.modifiers.new("t", "SOLIDIFY"); sd.thickness = P[0]; sd.offset = -1; sd.use_even_offset = True
    bpy.ops.object.modifier_apply(modifier="t")
    rm = n.modifiers.new("r", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = P[1]; rm.adaptivity = 0
    bpy.ops.object.modifier_apply(modifier="r")
    bm = bmesh.new(); bm.from_mesh(n.data)
    # keep only the biggest piece: specks from crossing seams
    bm.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bm.verts:
        if v in seen: continue
        c = []; st = [v]; seen.add(v)
        while st:
            x = st.pop(); c.append(x)
            for e in x.link_edges:
                w = e.other_vert(x)
                if w not in seen: seen.add(w); st.append(w)
        comps.append(c)
    comps.sort(key=len, reverse=True)
    for c in comps[1:]:
        if len(c) < len(comps[0]) * 0.05: bmesh.ops.delete(bm, geom=c, context="VERTS")
    taubin(bm, P[2]); bm.to_mesh(n.data); bm.free()
    tris = sum(len(p.vertices) - 2 for p in n.data.polygons)
    if tris > P[3]:
        dc = n.modifiers.new("d", "DECIMATE"); dc.ratio = P[3] / tris; bpy.ops.object.modifier_apply(modifier="d")
    # carry weights and keys
    for k in keys: n.shape_key_add(name=k, from_mix=False)
    W = {}
    for v in n.data.vertices:
        co, nor, fi, d = bvh.find_nearest(v.co)
        f = sb.faces[fi]; tv = f.verts
        bc = [barycentric_transform(co, tv[0].co, tv[1].co, tv[2].co, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))[i] for i in range(3)]
        bc = [max(0.0, x) for x in bc]; s = sum(bc) or 1; bc = [x / s for x in bc]
        acc = {}
        for t, x in zip(tv, bc):
            for g, w in t[dl].items(): acc[g] = acc.get(g, 0) + w * x
        W[v.index] = acc
        for k in keys:
            if k == "Basis": continue
            delta = sum(((t[KL[k]] - t.co) * x for t, x in zip(tv, bc)), Vector())
            n.data.shape_keys.key_blocks[k].data[v.index].co = v.co + delta
    groups = {}
    for i, acc in W.items():
        tot = sum(acc.values()) or 1
        for g, w in acc.items():
            if w / tot < 0.01: continue
            nm = gnames[g]; vg = groups.get(nm) or n.vertex_groups.new(name=nm); groups[nm] = vg; vg.add([i], w / tot, "REPLACE")
    arm = next(m for m in old.modifiers if m.type == "ARMATURE")
    am = n.modifiers.new("skin", "ARMATURE"); am.object = arm.object
    for p in n.data.polygons: p.use_smooth = True
    nm = old.name; sb.free(); bpy.data.objects.remove(old); n.name = nm
    done[nm] = sum(len(p.vertices) - 2 for p in n.data.polygons)
print("REMADE", done)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
