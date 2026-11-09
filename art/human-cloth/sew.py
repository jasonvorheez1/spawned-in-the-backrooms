# Garments cut fresh from the body (Shelly Nov 9, #116696/#116742: real cloth, realistic-anime, no painted-on or torn shells).
# Each garment: the body's own surface in its region, welded, eased out by a per-garment ease map (tight ribbed bands,
# blousing above them), ironed smooth so skin detail never prints through, pushed back outside the skin, cut with straight
# planes for clean hems, cuffs and necklines, given real thickness with a rolled edge, then skinned and Bust-keyed from the body.
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/sew.py -- in.glb out.glb
import bpy, bmesh, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
body0 = bpy.data.objects["Body"]; arm = body0.find_armature()
# the skin a top covers runs from the Body mesh up through the Head mesh's neck and yoke: one joined surface to cut from
body = body0.copy(); body.data = body0.data.copy(); bpy.context.collection.objects.link(body)
hd = bpy.data.objects["Head"].copy(); hd.data = bpy.data.objects["Head"].data.copy(); bpy.context.collection.objects.link(hd)
hd.shape_key_clear()
hb = bmesh.new(); hb.from_mesh(hd.data); bmesh.ops.delete(hb, geom=[v for v in hb.verts if v.co.z > 1.32], context="VERTS"); hb.to_mesh(hd.data); hb.free()
bpy.ops.object.select_all(action="DESELECT"); hd.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.join(); body.data.materials.clear()
B = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
NECK, WAIST, HIP = B["Neck"].z, B["Spine"].z + 0.01, B["Hips"].z
WRIST = B["LeftHand"].x - 0.03; ELBOW = B["LeftForeArm"].x; KNEE = B["LeftLeg"].z
ANKLE = 0.075 * (NECK / 1.276)
def smooth(x, a, b): t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def band(x, edge, w): return 1 - smooth(abs(x - edge), w * 0.6, w)  # 1 inside a band of width w at edge
# garment plans: ease(p) in metres; cuts: (point, normal) keeps the side the normal points away from. Savi's picks
def top(hem, cuff, loose, rib, drape=0.985):
    def ease(p):
        ax = abs(p.x); e = loose
        if ax > 0.16: e = loose * 1.15 + 0.004 * smooth(ax, ELBOW, cuff)           # sleeves a little fuller toward the cuff
        if rib:
            e *= 1 + 0.6 * band(ax, cuff - 0.05, 0.05) * (ax > 0.16)                # blouse over the cuff band
            e *= 1 + 0.5 * band(p.z, hem + 0.06, 0.05)                              # blouse over the hem band
            if ax > cuff - 0.035: e = 0.004                                         # ribbed cuff hugs the wrist
            if p.z < hem + 0.035 and ax < 0.2: e = 0.006                            # ribbed hem hugs the hips
        return e * (1 - 0.6 * smooth(p.z, NECK - 0.07, NECK - 0.01))                # collar sits close
    cuts = [(Vector((0, 0, hem)), Vector((0, 0, -1)))]
    cuts += [(Vector((s * cuff, 0, 0)), Vector((s, 0, 0))) for s in (1, -1)]
    ease.drape = drape; ease.collar = (0.068, 0.062, -0.012)   # neck hole: half-width x, half-depth y, centre shift toward the front
    return ease, cuts
def bottom(hem, waist, loose, cuffrib):
    def ease(p):
        e = loose * (1 + 0.5 * smooth(-p.z, -KNEE, -(hem + 0.1)))                   # legs widen toward the hem
        if p.z > waist - 0.04: e = 0.005                                            # waistband
        if cuffrib and p.z < hem + 0.03: e = 0.006
        if abs(p.x) < 0.035 and abs(p.z - HIP + 0.04) < 0.08: e *= 0.6             # crotch stays close
        return e
    return ease, [(Vector((0, 0, hem)), Vector((0, 0, -1))), (Vector((0, 0, waist)), Vector((0, 0.18, 1)).normalized())]
PLAN = {
    "Top_hoodie":     top(HIP + 0.045 + 0.03, WRIST, 0.022, True, 0.997),
    "Top_sweater":    top(HIP + 0.06 + 0.03, WRIST, 0.016, True, 0.993),
    "Top_longsleeve": top(HIP + 0.07 + 0.03, WRIST + 0.005, 0.009, False, 0.975),
    "Top_pajamas":    top(HIP + 0.055 + 0.03, WRIST - 0.01, 0.018, False, 0.996),
    "Top_tee":        top(HIP + 0.07 + 0.035, B["LeftArm"].x + 0.11, 0.010, False, 0.982),
    "Bot_pants":      bottom(ANKLE + 0.01, WAIST + 0.02, 0.012, False),
    "Bot_pjpants":    bottom(ANKLE + 0.02, WAIST + 0.02, 0.02, True),
    "Bot_shorts":     bottom(KNEE + 0.1, WAIST + 0.02, 0.014, False),
}
THICK = 0.0035
# body: welded copy for sampling and the base surface
dg = bpy.context.evaluated_depsgraph_get()
sb = bmesh.new(); sb.from_mesh(body.data)
bmesh.ops.remove_doubles(sb, verts=sb.verts[:], dist=0.0015); bmesh.ops.recalc_face_normals(sb, faces=sb.faces[:])
bmesh.ops.triangulate(sb, faces=sb.faces[:]); sb.verts.ensure_lookup_table(); sb.faces.ensure_lookup_table()
dl = sb.verts.layers.deform.active; KB = sb.verts.layers.shape.get("Bust")
bvh = BVHTree.FromBMesh(sb)
MW = body.matrix_world.copy(); MI = MW.inverted()
sw = sb.copy(); sw.transform(MW); bvhW = BVHTree.FromBMesh(sw)
print("MW", [list(map(lambda x: round(x, 3), r)) for r in MW])
gnames = {g.index: g.name for g in body.vertex_groups}
done = {}
for name, (ease, cuts) in PLAN.items():
    old = bpy.data.objects.get(name)
    if not old: continue
    mat = old.data.materials[0]
    bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0015); bm.transform(MW); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # region: generous box around the cuts, then the cuts make it exact after easing
    zs = [c[0].z for c in cuts if abs(c[1].z) > 0.5]; lo, hi = min(zs) - 0.04, (max(zs) + 0.06 if len(zs) > 1 else 9)
    kill = [v for v in bm.verts if not (lo < v.co.z < hi)]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.verts.ensure_lookup_table(); bm.normal_update()
    base = {v: v.co.copy() for v in bm.verts}; nrm = {v: v.normal.copy() for v in bm.verts}
    E = {v: ease(base[v]) for v in bm.verts}
    for v in bm.verts: v.co = base[v] + nrm[v] * E[v]
    adj = {v: [e.other_vert(v) for e in v.link_edges] for v in bm.verts}
    for it in range(14):                                     # iron: skin detail out, cloth bridges hollows
        for f in (0.5, -0.52):
            new = {v: v.co + (sum((w.co for w in nb), Vector()) / len(nb) - v.co) * f for v, nb in adj.items() if len(nb) > 2}
            for v, c in new.items(): v.co = c
        for v in bm.verts:                                   # never inside the skin, never looser than planned x1.6
            co, n, fi, d = bvhW.find_nearest(v.co)
            out = (v.co - co).dot(n)
            need = max(0.004, E[v] * 0.7)
            if out < need: v.co = v.co + n * (need - out)
            elif out > E[v] * 1.6 + 0.004: v.co = v.co - n * (out - E[v] * 1.6 - 0.004)
        bm.normal_update()
        for v in bm.verts:                                   # under a second skin layer (the head's yoke over the body)? come out past it
            h = bvhW.ray_cast(v.co + v.normal * 0.0005, v.normal, 0.04)
            if h[0] is not None and h[1].dot(v.normal) > 0: v.co = h[0] + v.normal * max(0.004, E[v] * 0.7)
    if hasattr(ease, "drape"):                               # cloth falls from the chest: each slice no narrower than the one above x drape
        cy = B["Spine1"].y; BINS = 72; cells = {}
        for v in bm.verts:
            if abs(v.co.x) > 0.15 or v.co.z > B["Spine2"].z + 0.04: continue
            ang = math.atan2(v.co.y - cy, v.co.x); r = math.hypot(v.co.x, v.co.y - cy)
            cells.setdefault((int((ang + math.pi) / (2 * math.pi) * BINS) % BINS, int(v.co.z / 0.008)), []).append((v, ang, r))
        zis = sorted({k[1] for k in cells}, reverse=True); prev = {}
        for zi in zis:
            for b in range(BINS):
                c = cells.get((b, zi))
                if not c: continue
                tgt = max(max(r for _, _, r in c), prev.get(b, 0) * ease.drape); prev[b] = tgt
                for v, ang, r in c:
                    if r < tgt: v.co.x, v.co.y = math.cos(ang) * tgt, cy + math.sin(ang) * tgt
        for it in range(3):
            for f in (0.5, -0.52):
                new = {v: v.co + (sum((w.co for w in nb), Vector()) / len(nb) - v.co) * f for v, nb in adj.items() if len(nb) > 2}
                for v, c in new.items(): v.co = c
            for v in bm.verts:
                co, n, fi, d = bvhW.find_nearest(v.co); out = (v.co - co).dot(n)
                if out < 0.004: v.co = v.co + n * (0.004 - out)
    for co, no in cuts:                                      # straight hems
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
    if hasattr(ease, "collar"):                              # round neckline: everything inside the collar ellipse above the yoke goes, the rim snaps to it
        rx, ry, dy = ease.collar; cy = B["Neck"].y + dy
        def rr(co): return math.hypot(co.x / rx, (co.y - cy) / ry)
        gone = [f for f in bm.faces if f.calc_center_median().z > NECK - 0.07 and rr(f.calc_center_median()) < 1.0]
        bmesh.ops.delete(bm, geom=gone, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        for v in bm.verts:
            if v.is_boundary and v.co.z > NECK - 0.09:
                k = rr(v.co); a = math.atan2((v.co.y - cy) / ry, v.co.x / rx)
                v.co.x, v.co.y = math.cos(a) * rx, cy + math.sin(a) * ry
    bmesh.ops.dissolve_degenerate(bm, dist=0.002, edges=bm.edges[:])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0025)
    # drop slivers left by cuts
    bm.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bm.verts:
        if v in seen: continue
        c, st = [], [v]; seen.add(v)
        while st:
            x = st.pop(); c.append(x)
            for e in x.link_edges:
                w = e.other_vert(x)
                if w not in seen: seen.add(w); st.append(w)
        comps.append(c)
    big = max(len(c) for c in comps)
    for c in comps:
        if len(c) < big * 0.03: bmesh.ops.delete(bm, geom=c, context="VERTS")
    # rolled edge: boundary loops nudged outward and slightly in, so hems read as turned cloth
    bm.normal_update()
    for v in [v for v in bm.verts if v.is_boundary]: v.co += v.normal * 0.0015
    bm.transform(MI); bm.normal_update()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(name + "_n", me); bpy.context.collection.objects.link(n); n.matrix_world = body.matrix_world
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT"); n.select_set(True); bpy.context.view_layer.objects.active = n
    sd = n.modifiers.new("t", "SOLIDIFY"); sd.thickness = THICK; sd.offset = 1; sd.use_even_offset = False; sd.use_rim = True
    bpy.ops.object.modifier_apply(modifier="t")
    ss = n.modifiers.new("s", "SUBSURF"); ss.levels = 1; bpy.ops.object.modifier_apply(modifier="s")
    # skin + Bust key from the body at the nearest point
    n.shape_key_add(name="Basis", from_mix=False); kb = n.shape_key_add(name="Bust", from_mix=False) if KB else None
    groups = {}
    for v in n.data.vertices:
        co, nor, fi, d = bvh.find_nearest(v.co); tv = sb.faces[fi].verts
        bc = barycentric_transform(co, tv[0].co, tv[1].co, tv[2].co, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
        bc = [max(0.0, bc[i]) for i in range(3)]; s = sum(bc) or 1; bc = [x / s for x in bc]
        acc = {}
        for t, x in zip(tv, bc):
            for g, w in t[dl].items(): acc[g] = acc.get(g, 0) + w * x
        tot = sum(acc.values()) or 1
        for g, w in acc.items():
            if w / tot < 0.01: continue
            nm = gnames[g]; vg = groups.get(nm) or n.vertex_groups.new(name=nm); groups[nm] = vg; vg.add([v.index], w / tot, "REPLACE")
        if kb: kb.data[v.index].co = v.co + sum(((t[KB] - t.co) * x for t, x in zip(tv, bc)), Vector())
    am = n.modifiers.new("skin", "ARMATURE"); am.object = arm
    n.parent = old.parent; n.matrix_parent_inverse = old.matrix_parent_inverse.copy()
    bpy.data.objects.remove(old); n.name = name; me.name = name
    done[name] = sum(len(p.vertices) - 2 for p in me.polygons)
bpy.data.objects.remove(body); print("SEWN", done)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
