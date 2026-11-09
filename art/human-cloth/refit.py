# Clothes and hands on the human bodies (johnadams2, Nov 9: "improve the clothings", "improve the rig to be more natural like a real person").
# A post-process on an exported human GLB (art/human-base output, after art/human-head/hats.py): in.glb -> out.glb
#  1. fingers: 15 Mixamo-named finger bones per hand (LeftHandThumb1..3, Index, Middle, Ring, Pinky), the finger skin weighted along
#     each chain, so a clip's grip, point and relaxed curl reach the hand instead of a rigid paddle
#  2. garments that hug the body (tops, pants, shoes, scarf) take the body's own skin weights at the nearest skin point: cloth bends at the
#     elbow, knee and shoulder exactly where the arm does, no skin poking through at a bend
#  3. each garment sits between a floor and a ceiling off the skin (the numbers below, Savi's picks): the sweater's pouch over the stomach
#     and crotch and the ballooning sleeves are pulled in, thin spots pushed out; the move eased over the neighbours and carried into the Bust key
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/refit.py -- in.glb out.glb [proofTag]
import bpy, bmesh, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src, dst = sys.argv[sys.argv.index("--") + 1: sys.argv.index("--") + 3]
tag = sys.argv[sys.argv.index("--") + 3] if len(sys.argv) > sys.argv.index("--") + 3 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
R = bpy.data.objects["Armature"]; BODY = bpy.data.objects["Body"]
# garment -> (min, max) metres off the skin. Savi's picks
FIT = {"Top_tee": (0.006, 0.018), "Top_tank": (0.005, 0.014), "Top_longsleeve": (0.006, 0.018), "Top_pajamas": (0.007, 0.026),
       "Top_sweater": (0.008, 0.026), "Top_hoodie": (0.009, 0.032), "Top_jacket": (0.011, 0.036), "Top_plate": (0.012, 0.04),
       "Bot_pants": (0.005, 0.02), "Bot_pjpants": (0.006, 0.028), "Bot_shorts": (0.005, 0.02), "Bot_overalls": (0.006, 0.024),
       "Under_top": (0.002, 0.008), "Under_bottom": (0.002, 0.008), "Neck_scarf": None,
       "Shoes_sneakers": None, "Shoes_boots": None, "Shoes_slippers": None}
# cloth that hangs free (skirts, dress hem, cape, apron) keeps its own weights: body weights would split it between the legs
WEIGHTS = set(k for k in FIT)

dg = bpy.context.evaluated_depsgraph_get()
bm0 = bmesh.new(); bm0.from_mesh(BODY.data); bm0.verts.ensure_lookup_table(); bm0.faces.ensure_lookup_table()
bvh = BVHTree.FromBMesh(bm0)
bgi = {g.index: g.name for g in BODY.vertex_groups}
def vw(v):  # body vertex -> {group name: weight}
    return {bgi[g.group]: g.weight for g in BODY.data.vertices[v].groups if g.weight > 0}
def skin_at(p):
    co, n, fi, d = bvh.find_nearest(p)
    f = bm0.faces[fi]; acc = {}; tot = 0
    for v in f.verts:
        k = 1.0 / max(1e-5, (v.co - co).length); tot += k
        for g, w in vw(v.index).items(): acc[g] = acc.get(g, 0) + w * k
    return co, n, d, {g: w / tot for g, w in acc.items()}

# ---------- 1. fingers ----------
def fingers(side):
    hand = R.data.bones[f"{side}Hand"]; h0 = hand.head_local.copy(); ax = (hand.tail_local - hand.head_local).normalized()
    gi = BODY.vertex_groups[f"{side}Hand"].index
    hv = {v.index for v in BODY.data.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)}
    t = {i: (BODY.data.vertices[i].co - h0).dot(ax) for i in hv}
    tmax = max(t.values()); adj = {i: set() for i in hv}
    for e in BODY.data.edges:
        a, b = e.vertices
        if a in hv and b in hv: adj[a].add(b); adj[b].add(a)
    def comps(t0):
        left = {i for i in hv if t[i] > t0}; out = []
        while left:
            s = left.pop(); c = {s}; st = [s]
            while st:
                for w in adj[st.pop()]:
                    if w in left: left.remove(w); c.add(w); st.append(w)
            if len(c) >= 8: out.append(c)
        return out
    best = None
    for k in range(60):
        t0 = tmax - (k + 1) * tmax / 60
        cs = comps(t0)
        if len(cs) == 5: best = (t0, cs)
        if best and len(cs) < 5: break
    if not best: print("fingers: no 5-way split on", side); return []
    t0, cs = best
    info = []
    for c in cs:
        # walk this finger down into the palm: its base is where it joins the rest
        pts = [BODY.data.vertices[i].co for i in c]
        tip_i = max(c, key=lambda i: t[i]); base_t = min(t[i] for i in c)
        cen = sum(pts, Vector()) / len(pts)
        info.append(dict(c=c, tip=BODY.data.vertices[tip_i].co.copy(), cen=cen, base=base_t, len=t[tip_i] - base_t))
    thumb = min(info, key=lambda f: f["base"] + (0 if f["len"] > 0 else 0))  # the thumb splits off first, nearest the wrist
    rest = [f for f in info if f is not thumb]
    # order index..pinky by distance from the thumb across the hand
    rest.sort(key=lambda f: (f["cen"] - thumb["cen"]).length)
    names = ["Thumb"] + ["Index", "Middle", "Ring", "Pinky"]
    out = []
    for nm, f in zip(names, [thumb] + rest):
        # chain axis: from the finger's root centre to its tip
        c = f["c"]; tip = f["tip"]
        root_pts = [BODY.data.vertices[i].co for i in c if t[i] < f["base"] + 0.15 * f["len"] + 1e-4]
        root = sum(root_pts, Vector()) / len(root_pts)
        d = (tip - root).normalized(); L = (tip - root).length
        root = root - d * (0.18 * L if nm != "Thumb" else 0.25 * L)  # the knuckle sits inside the palm
        L = (tip - root).length
        out.append((nm, root, d, L, c))
    return out

bpy.context.view_layer.objects.active = R; R.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
eb = R.data.edit_bones
plan = {}
for side in ("Left", "Right"):
    bpy.ops.object.mode_set(mode="OBJECT"); F = fingers(side); bpy.ops.object.mode_set(mode="EDIT")
    hand = eb[f"{side}Hand"]; zax = hand.z_axis.copy()
    for nm, root, d, L, c in F:
        segs = (0.4, 0.33, 0.27) if nm != "Thumb" else (0.38, 0.34, 0.28)
        p = root.copy(); parent = hand; chain = []
        for k, s in enumerate(segs):
            b = eb.new(f"{side}Hand{nm}{k + 1}"); b.head = p; p = p + d * L * s; b.tail = p
            b.align_roll(zax); b.parent = parent; b.use_connect = k > 0; parent = b; chain.append((b.name, (p - d * L * s).copy(), p.copy()))
        plan[(side, nm)] = (root, d, L, c, segs)
bpy.ops.object.mode_set(mode="OBJECT")
# finger skin: weight along the chain, blended over 25% of a segment either side of each joint, the root blended from the hand
for (side, nm), (root, d, L, c, segs) in plan.items():
    hand_g = BODY.vertex_groups[f"{side}Hand"]
    gs = [BODY.vertex_groups.get(f"{side}Hand{nm}{k + 1}") or BODY.vertex_groups.new(name=f"{side}Hand{nm}{k + 1}") for k in range(3)]
    cuts = [0, segs[0], segs[0] + segs[1], 1.0]
    # include palm verts just behind the finger's gap so the knuckle bends softly
    ids = set(c)
    for v in BODY.data.vertices:
        if v.index in ids: continue
        q = v.co - root; s = q.dot(d) / L
        if 0.0 < s < 0.25 and (q - d * q.dot(d)).length < 0.009: ids.add(v.index)
    for i in ids:
        s = max(0.0, min(1.0, (BODY.data.vertices[i].co - root).dot(d) / L))
        w = [0.0, 0.0, 0.0, 0.0]  # hand, seg1, seg2, seg3
        bl = 0.05
        for k in range(3):
            lo, hi = cuts[k], cuts[k + 1]
            a = max(0.0, min(1.0, (s - (lo - bl)) / (2 * bl))) if k > 0 or True else 1.0
            b = 1.0 - max(0.0, min(1.0, (s - (hi - bl)) / (2 * bl))) if k < 2 else 1.0
            w[k + 1] = a * b
        if s < cuts[1]: w[0] = 1.0 - w[1]
        tot = sum(w) or 1
        hand_g.add([i], w[0] / tot, "REPLACE")
        for k in range(3):
            if w[k + 1] > 1e-3: gs[k].add([i], w[k + 1] / tot, "REPLACE")
            else: gs[k].remove([i])
print("finger bones", len([b for b in R.data.bones if "Hand" in b.name and b.name[-1].isdigit()]))

# ---------- 2+3. garments ----------
CROTCH = (R.matrix_world @ R.data.bones["LeftUpLeg"].head_local).z - 0.05
print("crotch z", CROTCH)
for o in bpy.data.objects:
    if o.type != "MESH" or o.name not in FIT: continue
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    shapes = [bm.verts.layers.shape[k] for k in bm.verts.layers.shape.keys()]
    lim = FIT[o.name]; delta = {}; skin = {}
    top = o.name.startswith("Top_")  # the undershirt stays skin-tight under whatever top hangs over it
    HEM = min(v.co.z for v in bm.verts) + 0.2 if top else -9  # a top's lowest 20 cm: the hem that hangs past the hips
    for v in bm.verts:
        co, n, d, w = skin_at(v.co)
        low = top and v.co.z < HEM
        if low:  # a top's hem below the crotch hangs from the hips as a tube: no leg weights, no pull into the crotch
            f = max(0.0, min(1.0, (HEM - v.co.z) / 0.05))  # leg weight hands over to the hips across 5 cm
            hw = sum(x for g, x in w.items() if "Leg" in g or "Foot" in g) * f
            w = {g: (x * (1 - f) if ("Leg" in g or "Foot" in g) else x) for g, x in w.items()}; w["Hips"] = w.get("Hips", 0) + hw
        skin[v.index] = w
        if lim and not low:
            side = (v.co - co).dot(n)
            want = max(lim[0], min(lim[1], side))
            if abs(want - side) > 1e-5: delta[v.index] = n * (want - side)
    # ease: each move averaged with its neighbours' twice so the cap leaves no ridge
    for _ in range(3):
        nd = {}
        for v in bm.verts:
            ds = [delta.get(v.index, Vector())] + [delta.get(e.other_vert(v).index, Vector()) for e in v.link_edges]
            m = sum(ds, Vector()) / len(ds)
            if m.length > 1e-6 or v.index in delta: nd[v.index] = (delta.get(v.index, Vector()) + m) * 0.5
        delta = nd
    for v in bm.verts:
        dv = delta.get(v.index)
        if dv is None: continue
        v.co += dv
        for L in shapes: v[L] += dv
    if top:  # the hem past the hips falls straight like cloth: each slice no narrower than the one over it, every dimple and inner flap pushed out
        lowv = [v for v in bm.verts if v.co.z < HEM + 0.04]
        cy = sum((v.co.y for v in lowv), 0.0) / max(1, len(lowv)); NB = 48
        zk = lambda z: int((HEM + 0.04 - z) / 0.01)
        ak = lambda x, y: int((math.atan2(y, x) + math.pi) / (2 * math.pi) * NB) % NB
        Rm = {}
        for v in lowv:
            k = (zk(v.co.z), ak(v.co.x, v.co.y - cy)); Rm[k] = max(Rm.get(k, 0), math.hypot(v.co.x, v.co.y - cy))
        ks = sorted({k for k, _ in Rm}); rows = {}; prev = None
        for k in ks:
            row = [Rm.get((k, i), 0) for i in range(NB)]
            row = [max(row[i], row[(i - 1) % NB] * 0.97, row[(i + 1) % NB] * 0.97) for i in range(NB)]
            if prev: row = [max(row[i], prev[i]) for i in range(NB)]
            rows[k] = row; prev = row
        for _ in range(3): rows = {k: [(r[(i - 1) % NB] + 2 * r[i] + r[(i + 1) % NB]) / 4 for i in range(NB)] for k, r in rows.items()}
        fixed = 0
        for v in lowv:
            x, y = v.co.x, v.co.y - cy; r = math.hypot(x, y)
            if r < 1e-5: continue
            tr = rows[min(max(zk(v.co.z), ks[0]), ks[-1])][ak(x, y)] + 0.002
            wv = max(0.0, min(1.0, (HEM + 0.04 - v.co.z) / 0.05))  # eases in from the fitted waist
            if tr > r:
                s_ = 1 + (tr / r - 1) * wv; dv = Vector((x * s_ - x, y * s_ - y, 0))
                if dv.length > 0.001: fixed += 1
                v.co += dv
                for L in shapes: v[L] += dv
        # faces the cut carried across between the legs: inside the hung tube, they read as a pouch from outside and flaps from below
        inner = []
        for f in bm.faces:
            c = f.calc_center_median()
            if c.z > HEM + 0.02: continue
            x, y = c.x, c.y - cy; r = math.hypot(x, y)
            row = rows.get(min(max(zk(c.z), ks[0]), ks[-1]))
            if row and r < 0.8 * row[ak(x, y)]: inner.append(f)
        bmesh.ops.delete(bm, geom=inner, context="FACES_ONLY")
        print("hem", o.name, "hung out", fixed, "inner faces cut", len(inner))
    moved = sum(1 for x in delta.values() if x.length > 0.002)
    bm.to_mesh(me); bm.free()
    if o.name in WEIGHTS:
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        for vi, w in skin.items():
            top = sorted(w.items(), key=lambda kv: -kv[1])[:4]; tot = sum(x for _, x in top) or 1
            for g, x in top:
                vg = o.vertex_groups.get(g) or o.vertex_groups.new(name=g); vg.add([vi], x / tot, "REPLACE")
    print("fit", o.name, "moved", moved, "of", len(me.vertices))
    me.update()

if tag:
    import os; os.makedirs("/tmp/hcp", exist_ok=True)
    looks = {"a": {"Top_sweater", "Bot_pants", "Shoes_boots"}, "b": {"Top_hoodie", "Bot_skirt", "Shoes_sneakers", "Neck_scarf"}, "c": {"Top_tee", "Bot_shorts", "Shoes_sneakers"}, "d": {"Top_jacket", "Bot_overalls", "Shoes_boots"}}
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x, sc.render.resolution_y = 500, 700
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
    bpy.ops.object.light_add(type="SUN", location=(2, -3, 4)); L = bpy.context.object; L.data.energy = 3; L.rotation_euler = (math.radians(40), 0, math.radians(30))
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 45
    for m in bpy.data.materials:
        b = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
        col = {"cloth_top": (0.5, 0.08, 0.08, 1), "cloth_bottom": (0.1, 0.15, 0.35, 1), "cloth_shoes": (0.25, 0.15, 0.08, 1), "cloth_neck": (0.6, 0.5, 0.1, 1)}.get(m.name)
        if b and col: b.inputs["Base Color"].default_value = col
    pb = R.pose.bones
    def pose(stride):
        for b in pb: b.rotation_mode = "XYZ"; b.rotation_euler = (0, 0, 0)
        if not stride: return
        def Rr(n, x=0, y=0, z=0):
            if n in pb: pb[n].rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        Rr("LeftArm", 0, 0, 70); Rr("RightArm", 0, 0, -70); Rr("RightForeArm", 0, -70, 0); Rr("LeftForeArm", 0, 40, 0)
        Rr("LeftUpLeg", -45, 0, 0); Rr("RightUpLeg", 20, 0, 0); Rr("RightLeg", 60, 0, 0)
        for s in ("Left", "Right"):  # a loose fist
            for f in ("Index", "Middle", "Ring", "Pinky"):
                for k in (1, 2, 3): Rr(f"{s}Hand{f}{k}", 55, 0, 0)
            for k in (1, 2, 3): Rr(f"{s}HandThumb{k}", 20, 0, 0)
    def shot(n, pos, aim=(0, 0, 0.9), lens=45):
        cam.data.lens = lens; cam.location = pos; cam.rotation_euler = (Vector(aim) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/hcp/{tag}_{n}.png"; bpy.ops.render.render(write_still=True)
    for k, show in looks.items():
        for o in bpy.data.objects:
            if o.type == "MESH": o.hide_render = o.name not in show | {"Body", "Head", "Under_bottom", "Under_top"}
        pose(False); shot(k + "1rest", (0.6, -3.2, 1.0)); pose(True); bpy.context.view_layer.update(); shot(k + "2pose", (2.2, -2.8, 1.1)); shot(k + "3back", (-1.5, 2.6, 1.2))
    hb = R.pose.bones["LeftHand"]; hp = R.matrix_world @ hb.head
    shot("e_hand", hp + Vector((0.08, -0.4, 0.05)), hp + Vector((0.08, 0, 0)), 70)
    pose(False)

for o in bpy.data.objects: o.select_set(o.type in ("MESH", "ARMATURE"))
bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_image_format="JPEG", export_jpeg_quality=88)
print("exported", dst)
