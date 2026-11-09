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
_SEATZ = (B["Spine"].z + B["Spine1"].z) * 0.5 + 0.14; _SEATY = B["Spine1"].y
def _nf(co, n): return n
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
bmesh.ops.remove_doubles(sb, verts=sb.verts[:], dist=0.0015); bmesh.ops.holes_fill(sb, edges=sb.edges[:], sides=24); bmesh.ops.recalc_face_normals(sb, faces=sb.faces[:])
bmesh.ops.triangulate(sb, faces=sb.faces[:]); sb.verts.ensure_lookup_table(); sb.faces.ensure_lookup_table()
dl = sb.verts.layers.deform.active; KB = sb.verts.layers.shape.get("Bust")
bvh = BVHTree.FromBMesh(sb)
MW = body.matrix_world.copy(); MI = MW.inverted()
sw = sb.copy(); sw.transform(MW)
# cloth shell: the skin closed over creases narrower than ~4 cm (armpit, groin): out, smoothed, back in. Cloth never follows a crease it can't reach into
sh = sw.copy(); sh.normal_update(); CL = 0.02
for v in sh.verts: v.co += v.normal * CL
sadj = {v: [e.other_vert(v) for e in v.link_edges] for v in sh.verts}
for _ in range(10):
    new = {v: v.co.lerp(sum((w.co for w in nb), Vector()) / len(nb), 0.5) for v, nb in sadj.items() if nb}
    for v, c in new.items(): v.co = c
sh.normal_update()
for v in sh.verts: v.co -= v.normal * CL
bvhS = BVHTree.FromBMesh(sh)
for v, v0 in zip(sh.verts, sw.verts):                       # never inside the real skin either
    co, n, fi, d = bvhS.find_nearest(v0.co)
sh.verts.ensure_lookup_table(); sw.verts.ensure_lookup_table()
bvhSkin = BVHTree.FromBMesh(sw)
for v in sh.verts:
    co, n, fi, d = bvhSkin.find_nearest(v.co); out = (v.co - co).dot(n)
    if out < 0: v.co = co
bvhW = BVHTree.FromBMesh(sh); bvhSkinL = bvhSkin   # same space the old final pass used
_sl = bmesh.new(); _sl.from_mesh(body0.data); _sl.transform(body0.matrix_world); bmesh.ops.remove_doubles(_sl, verts=_sl.verts[:], dist=0.0015)
_f = bmesh.ops.holes_fill(_sl, edges=_sl.edges[:], sides=64); bmesh.ops.triangulate(_sl, faces=_f["faces"]); bmesh.ops.recalc_face_normals(_sl, faces=_sl.faces[:])
_sl.normal_update(); bvhSeal = BVHTree.FromBMesh(_sl)   # the whole body sealed (shoulder slits, neck): its nearest face never points sideways, so skin can't print through the yoke
print("MW", [list(map(lambda x: round(x, 3), r)) for r in MW])
gnames = {g.index: g.name for g in body.vertex_groups}
done = {}
for name, (ease, cuts) in PLAN.items():
    old = bpy.data.objects.get(name)
    if not old: continue
    mat = old.data.materials[0]
    bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0015); bm.transform(MW); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    _fill = bmesh.ops.holes_fill(bm, edges=bm.edges[:], sides=24)          # the source body has small holes at the back of the shoulders; cloth cut from it inherited them as tears
    bmesh.ops.triangulate(bm, faces=_fill['faces']); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
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
                    if r < tgt:                              # faded toward the arm and the yoke: a hard edge here tore the male back
                        wgt = (1 - smooth(abs(v.co.x), 0.08, 0.15)) * (1 - smooth(v.co.z, B["Spine2"].z - 0.03, B["Spine2"].z + 0.04))
                        r2 = r + (tgt - r) * wgt; v.co.x, v.co.y = math.cos(ang) * r2, cy + math.sin(ang) * r2
        for it in range(3):
            for f in (0.5, -0.52):
                new = {v: v.co + (sum((w.co for w in nb), Vector()) / len(nb) - v.co) * f for v, nb in adj.items() if len(nb) > 2}
                for v, c in new.items(): v.co = c
            for v in bm.verts:
                co, n, fi, d = bvhW.find_nearest(v.co); n = _nf(v.co, n); out = (v.co - co).dot(n)
                if out < 0.004: v.co = v.co + n * (0.004 - out)
    if hasattr(ease, "drape"):                               # below the waist a top is a hanging tube: cut the skin-shaped part away, loft rings to the hem
        Z0 = B["Spine1"].z + 0.05;   # the hanging tube starts on the flat of the lower back, above where the seat's cleft begins
        hem = cuts[0][0].z; cy = B["Spine1"].y; NB = 96
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z < Z0], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        def hull(z0, z1):                                    # body's widest radius per angle in a slab
            m = [0.0] * NB
            for v in sw.verts:
                if z0 <= v.co.z <= z1 and abs(v.co.x) < 0.3:
                    a_ = math.atan2(v.co.y - cy, v.co.x); r = math.hypot(v.co.x, v.co.y - cy); b_ = int((a_ + math.pi) / (2 * math.pi) * NB) % NB
                    m[b_] = max(m[b_], r)
            for _ in range(2): m = [max(m[i], (m[i - 1] + m[(i + 1) % NB]) * 0.5) for i in range(NB)]
            return m
        ring = [e for e in bm.edges if e.is_boundary and all(v.co.z < Z0 + 0.03 for v in e.verts)]
        z = min(v.co.z for e in ring for v in e.verts); steps = max(2, int((z - hem) / 0.012))
        rv = {v for e in ring for v in e.verts}
        for v in rv: v.co.z = z                              # one level ring: every column starts at the same height
        _n0 = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=list(rv), dist=0.006)   # the mirror seam left two ring ends overlapping at the back: weld them or the loft splits there
        ring = [e for e in bm.edges if e.is_valid and e.is_boundary and all(abs(v.co.z - z) < 1e-5 for v in e.verts)]
        rv = {v for e in ring for v in e.verts}; print("RINGWELD", name, _n0 - len(bm.verts), len(rv), len(ring))
        rad = {v: math.hypot(v.co.x, v.co.y - cy) for v in rv}
        for _ in range(4):                                   # and an even radius round it
            rad = {v: (rad[v] * 2 + sum(rad[e.other_vert(v)] for e in v.link_edges if e.is_boundary and e.other_vert(v) in rad)) / (2 + sum(1 for e in v.link_edges if e.is_boundary and e.other_vert(v) in rad)) for v in rv}
        for v in rv:
            a_ = math.atan2(v.co.y - cy, v.co.x); r = max(rad[v], math.hypot(v.co.x, v.co.y - cy) * 0.98)
            v.co.x, v.co.y = math.cos(a_) * r, cy + math.sin(a_) * r
        def bin_of(co): return ((math.atan2(co.y - cy, co.x) + math.pi) / (2 * math.pi) * NB) % NB
        T = [0.0] * NB
        for v in rv:                                         # the start ring's radius per angle, gaps filled from neighbours
            b_ = int(bin_of(v.co)); T[b_] = max(T[b_], math.hypot(v.co.x, v.co.y - cy))
        for _ in range(NB):
            if all(T): break
            T = [t if t else max(T[i - 1], T[(i + 1) % NB]) for i, t in enumerate(T)]
        def at(T, co):
            f = bin_of(co); i = int(f) % NB; w = f - int(f); return T[i] * (1 - w) + T[(i + 1) % NB] * w
        RT = {v: T for v in rv}
        for k in range(1, steps + 1):
            zz = z + (hem - z) * k / steps
            ex = bmesh.ops.extrude_edge_only(bm, edges=ring)
            nv = [g for g in ex["geom"] if isinstance(g, bmesh.types.BMVert)]
            ring = [g for g in ex["geom"] if isinstance(g, bmesh.types.BMEdge) and all(v in nv for v in g.verts)]
            H = hull(zz - 0.008, zz + 0.008); e_ = max(0.006, ease(Vector((0, 0, zz))))
            T = [max(T[i] * ease.drape, H[i] + e_) for i in range(NB)]
            for _ in range(6):                               # cloth bridges the dip between the thighs: a hull, then a blur
                for k_ in (2, 4, 7):                         # wide spans too: cloth spans the seat's cleft, it never follows it in
                    T = [max(T[i], (T[i - k_] + T[(i + k_) % NB]) * 0.5) for i in range(NB)]
                T = [(T[i - 1] + 2 * T[i] + T[(i + 1) % NB]) * 0.25 for i in range(NB)]
            for v in nv:
                a_ = math.atan2(v.co.y - cy, v.co.x); r2 = at(T, v.co)
                v.co = Vector((math.cos(a_) * r2, cy + math.sin(a_) * r2, zz)); RT[v] = T
        for _ in range(12):                                  # untangle: each ring vertex slides to the mean angle of its ring neighbours
            na = {}
            for v in RT:
                nb = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in RT and abs(e.other_vert(v).co.z - v.co.z) < 1e-4]
                if len(nb) != 2: continue
                c = sum((complex(w.co.x, w.co.y - cy) / max(1e-6, abs(complex(w.co.x, w.co.y - cy))) for w in nb), 0j) + 2 * complex(v.co.x, v.co.y - cy) / max(1e-6, abs(complex(v.co.x, v.co.y - cy)))
                na[v] = math.atan2(c.imag, c.real)
            for v, a_ in na.items():
                fake = Vector((math.cos(a_), cy + math.sin(a_), 0)); r2 = at(RT[v], fake)
                v.co.x, v.co.y = math.cos(a_) * r2, cy + math.sin(a_) * r2
        _seat = [w for w in bm.verts if w.co.z < Z0 + 0.13 and 0.07 <= abs(w.co.x) < 0.1 and w.co.y > cy]
        for v in bm.verts:                                   # the back over the seat: cloth bridges the cleft straight across, never dips into it
            if v.co.z < Z0 + 0.12 and abs(v.co.x) < 0.07 and v.co.y > cy:
                _band = [w for w in _seat if abs(w.co.z - v.co.z) < 0.008]
                _lv = [w for w in _band if w.co.x < 0]; _rv = [w for w in _band if w.co.x > 0]
                if _lv and _rv:
                    yl = max(w.co.y for w in _lv); yr = max(w.co.y for w in _rv)
                    t = (v.co.x + 0.085) / 0.17; v.co.y = max(v.co.y, yl + (yr - yl) * t + 0.002)
        bm.normal_update()
    for co, no in cuts:                                      # straight hems
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
    if hasattr(ease, "collar"):                              # round neckline: everything inside the collar ellipse above the yoke goes, the rim snaps to it
        rx, ry, dy = ease.collar; cy = B["Neck"].y + dy
        def rr(co): return math.hypot(co.x / rx, (co.y - cy) / ry)
        gone = [f for f in bm.faces if f.calc_center_median().z > NECK - 0.07 and rr(f.calc_center_median()) < 1.0]
        bmesh.ops.delete(bm, geom=gone, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        for v in bm.verts:
            if v.is_boundary and v.co.z > NECK - 0.09 and rr(v.co) < 1.45:   # the neckline's own rim only: a seam elsewhere on the shoulder was yanked to the collar and tore the back
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
    adj2 = {v: [e.other_vert(v) for e in v.link_edges] for v in bm.verts}   # clear of the real skin's bumps (shoulder caps, collarbone), smoothed so the push leaves no dents
    for it in range(5):
        for v in bm.verts:
            co, nn, fi, d = bvhSkinL.find_nearest(v.co); nn = _nf(v.co, nn); out = (v.co - co).dot(nn)
            if out < 0.008: v.co = v.co + nn * (0.008 - out)
        if it < 4:
            new = {v: v.co.lerp(sum((w.co for w in nb), Vector()) / len(nb), 0.4) for v, nb in adj2.items() if len(nb) > 2 and not v.is_boundary}
            for v, c in new.items(): v.co = c
    if name.startswith("Top_"):                              # the small of the back hangs as a curtain across the seat's cleft: each height takes its y from the cloth either side
        _cy = B["Spine1"].y; _top = B["Spine1"].z; _bins = {}
        for v in bm.verts:
            if v.co.y > _cy and v.co.z < _top and 0.05 < abs(v.co.x) < 0.075: _bins.setdefault(round(v.co.z * 100), []).append(v.co.y)
        _moved = 0
        for v in bm.verts:
            if v.co.y > _cy and v.co.z < _top and abs(v.co.x) <= 0.05:
                ys = _bins.get(round(v.co.z * 100)) or _bins.get(round(v.co.z * 100) - 1) or _bins.get(round(v.co.z * 100) + 1)
                if ys:
                    t = sum(ys) / len(ys) + 0.006 * (1 - (abs(v.co.x) / 0.05) ** 2); w = smooth(_top - v.co.z, 0.0, 0.04)
                    v.co.y = v.co.y + (t - v.co.y) * w; _moved += 1
        print("CURTAIN", name, _moved)
    bm.transform(MI); bm.normal_update()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(name + "_n", me); bpy.context.collection.objects.link(n); n.matrix_world = body.matrix_world
    me.materials.append(mat)
    sb2 = bmesh.new(); sb2.from_mesh(me)                     # the centre seam tears where decimate meets the mirror: weld and patch small holes
    bmesh.ops.remove_doubles(sb2, verts=sb2.verts[:], dist=0.0025)
    _z = [v.co.z for v in sb2.verts]; _hz, _mz = min(_z), (min(_z) + max(_z)) * 0.5
    for _ in range(3):                                       # the centre slit runs into the hem, so no closed hole is there to fill: stitch its two lips together
        _sv = [v for v in sb2.verts if v.is_boundary and abs(v.co.x) < 0.012 and _hz + 0.004 < v.co.z < _mz]
        if len(_sv) < 2: break
        bmesh.ops.remove_doubles(sb2, verts=_sv, dist=0.014)
    print("SLIT", name, len([v for v in sb2.verts if v.is_boundary and abs(v.co.x) < 0.012 and _hz + 0.004 < v.co.z < _mz]))
    bmesh.ops.holes_fill(sb2, edges=[e for e in sb2.edges if e.is_boundary], sides=40)
    bmesh.ops.recalc_face_normals(sb2, faces=sb2.faces[:]); sb2.to_mesh(me); sb2.free()
    for p in me.polygons: p.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT"); n.select_set(True); bpy.context.view_layer.objects.active = n
    sd = n.modifiers.new("t", "SOLIDIFY"); sd.thickness = THICK; sd.offset = 1; sd.use_even_offset = False; sd.use_rim = True
    bpy.ops.object.modifier_apply(modifier="t")
    ss = n.modifiers.new("s", "SUBSURF"); ss.levels = 1; bpy.ops.object.modifier_apply(modifier="s")
    for v in me.vertices:                                    # subdivision shrinks over the shoulder: keep every point outside the skin
        co, nn, fi, d = bvhW.find_nearest(v.co); nn = _nf(v.co, nn)
        _w = MW @ v.co
        if name.startswith("Top_") and abs(_w.x) < 0.07 and _w.y > B["Spine1"].y and _w.z < B["Spine1"].z:   # over the seat's cleft the skin's normal points sideways: both sides pushed across folded the back. straight back there
            nn = (MI.to_3x3() @ Vector((0, 1, 0))).normalized()
        out = (v.co - co).dot(nn)
        if out < 0.0035: v.co = v.co + nn * (0.0035 - out)
    tri = sum(len(p.vertices) - 2 for p in me.polygons); BUDGET = 9000 if name.startswith("Top_") else 6000   # Savi's pick: a crowd of NPCs wears these
    if tri > BUDGET:
        dc = n.modifiers.new("d", "DECIMATE"); dc.ratio = BUDGET / tri; bpy.ops.object.modifier_apply(modifier="d")
    sb2 = bmesh.new(); sb2.from_mesh(me)                     # after decimate: patch true holes only. a weld here merged the cloth's inner and outer skins and folded the back over
    bmesh.ops.holes_fill(sb2, edges=[e for e in sb2.edges if e.is_boundary], sides=40)
    bmesh.ops.recalc_face_normals(sb2, faces=sb2.faces[:]); sb2.to_mesh(me); sb2.free()
    for p in me.polygons: p.use_smooth = True
    fb = bmesh.new(); fb.from_mesh(me); fb.verts.ensure_lookup_table()   # final clearance: what decimate pulled under the skin rises, as a smooth swell, not per-vertex dents
    D = {}
    for v in fb.verts:
        co, nn, fi, d = bvhSkinL.find_nearest(v.co); nn = _nf(v.co, nn); out = (v.co - co).dot(nn)
        D[v] = nn * max(0.0, 0.006 - out)
        co, nn, fi, d = bvhSeal.find_nearest(MW @ v.co); out = (MW @ v.co - co).dot(nn)
        if d < 0.05 and 0.006 - out > D[v].length: D[v] = _nf(v.co, (MI.to_3x3() @ nn).normalized()) * (0.006 - out)
    for _ in range(4):
        N = {}
        for v in fb.verts:
            nb = [e.other_vert(v) for e in v.link_edges]
            avg = sum((D[w] for w in nb), Vector()) / max(1, len(nb)); c = D[v].lerp(avg, 0.5)
            N[v] = c if c.length >= D[v].length else D[v]
        D = N
    for v in fb.verts: v.co += D[v]
    for _pass in range(5):                                   # sealed-body clearance, repeated: a push out of one crease can land in the next face's
        D = {}
        for v in fb.verts:
            co, nn, fi, d = bvhSeal.find_nearest(MW @ v.co); out = (MW @ v.co - co).dot(nn)
            D[v] = _nf(v.co, (MI.to_3x3() @ nn).normalized()) * max(0.0, 0.007 - out) if d is not None and d < 0.06 else Vector()
        if not any(x.length > 0 for x in D.values()): break
        for _ in range(3):
            N = {}
            for v in fb.verts:
                nb = [e.other_vert(v) for e in v.link_edges]
                c = D[v].lerp(sum((D[w] for w in nb), Vector()) / max(1, len(nb)), 0.5)
                N[v] = c if c.length >= D[v].length else D[v]
            D = N
        for v in fb.verts: v.co += D[v]
    for _pass in range(8):                                   # from the skin's side: a body point the cloth fails to cover by 7 mm lifts the cloth over it (folds the nearest-point test misreads)
        fb.verts.ensure_lookup_table(); fb.faces.ensure_lookup_table(); gb = BVHTree.FromBMesh(fb); D = {v: Vector() for v in fb.verts}; hit = 0
        for bv in _sl.verts:
            nb = MI.to_3x3() @ bv.normal; p0 = MI @ bv.co
            if nb.length < 1e-6 or bv.co.z < NECK - 0.16 or abs(bv.co.x) > 0.3: continue   # the shoulder yoke only: cuffs and hems stay as cut
            nb.normalize(); h = gb.ray_cast(p0 + nb * 0.04, -nb, 0.08)
            if h[0] is None: continue
            off = 0.04 - h[3]                                # where the cloth's outer face sits along this skin normal
            if -0.03 < off < 0.007:
                hit += 1
                for v in fb.faces[h[2]].verts:
                    want = nb * (0.007 - off)
                    if want.length > D[v].length: D[v] = want
        if not hit: break
        for _ in range(3):                                   # grow the push a ring out, then relax it: a swell, never a ruffle
            N = {}
            for v in fb.verts:
                nbv = [e.other_vert(v) for e in v.link_edges]
                c = D[v].lerp(sum((D[w] for w in nbv), Vector()) / max(1, len(nbv)), 0.5)
                N[v] = c if c.length >= D[v].length else D[v]
            D = N
        for _ in range(8):
            D = {v: D[v].lerp(sum((D[e.other_vert(v)] for e in v.link_edges), Vector()) / max(1, len(v.link_edges)), 0.6) for v in fb.verts}
        for v in fb.verts: v.co += D[v]
        print("SKINLIFT", name, _pass, hit)
    fb.to_mesh(me); fb.free()
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
    for vg in list(n.vertex_groups): n.vertex_groups.remove(vg)  # weights: the real skin's own, by Blender's transfer, smoothed
    for vg in body0.vertex_groups: n.vertex_groups.new(name=vg.name)
    bpy.ops.object.select_all(action="DESELECT"); n.select_set(True); bpy.context.view_layer.objects.active = n
    dtm = n.modifiers.new("dt", "DATA_TRANSFER"); dtm.object = body0; dtm.use_vert_data = True
    dtm.data_types_verts = {"VGROUP_WEIGHTS"}; dtm.vert_mapping = "POLYINTERP_NEAREST"; dtm.layers_vgroup_select_src = "ALL"; dtm.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.modifier_apply(modifier="dt")
    bpy.ops.object.mode_set(mode="WEIGHT_PAINT"); bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.15, repeat=1)   # light: smoothed weights let the armpit skin slide out past the cloth when the arm rises
    bpy.ops.object.vertex_group_normalize_all(lock_active=False); bpy.ops.object.vertex_group_clean(group_select_mode="ALL", limit=0.01)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    am = n.modifiers.new("skin", "ARMATURE"); am.object = arm
    n.parent = old.parent; n.matrix_parent_inverse = old.matrix_parent_inverse.copy()
    bpy.data.objects.remove(old); n.name = name; me.name = name
    done[name] = sum(len(p.vertices) - 2 for p in me.polygons)
# armpit tuck: under any top the body's armpit skin sinks 14 mm, so a raised arm never pokes it out through the cloth. the game sets C_Pit = 1 while a top is worn
_bm = bmesh.new(); _bm.from_mesh(body0.data); _bm.verts.ensure_lookup_table(); _bm.normal_update()
_W = body0.matrix_world; _N = _W.to_3x3().inverted().transposed()
if not body0.data.shape_keys: body0.shape_key_add(name="Basis", from_mix=False)
_k = body0.shape_key_add(name="C_Pit", from_mix=False); _basis = body0.data.shape_keys.reference_key
_pits = [Vector((sx * (abs(B["LeftArm"].x) - 0.035), B["LeftArm"].y + 0.005, B["LeftArm"].z - 0.07)) for sx in (1, -1)]
_moved = 0
for v in _bm.verts:
    w = _W @ v.co
    f = max(1 - smooth((w - c).length, 0.045, 0.10) for c in _pits)
    if f <= 0: continue
    nw = (_N @ v.normal).normalized()
    _k.data[v.index].co = _basis.data[v.index].co + _W.inverted().to_3x3() @ (-nw * 0.014 * f); _moved += 1
_bm.free(); print("C_Pit verts", _moved)
bpy.data.objects.remove(body); print("SEWN", done)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
