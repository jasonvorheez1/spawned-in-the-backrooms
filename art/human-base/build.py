# Shelly's anime base (female, as uploaded) + a male built off the same mesh. Both rigged on Mixamo names.
import bpy, math, sys
from mathutils import Matrix, Vector, noise
import heapq
OUT = "/workspace/human"
def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def bump(a, b, c, d, x): return smooth(a, b, x) * (1 - smooth(c, d, x))

def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{OUT}/female_raw.glb")
    keep = [bpy.data.objects["Object_4"], bpy.data.objects["Object_5"]]
    for o in keep:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action="DESELECT")
    for o in list(bpy.data.objects):
        if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
    for o in keep:
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    head, body = keep
    head.name, body.name = "Head", "Body"
    return head, body

def arm_leg_weights(head, body):
    # rig the untouched base once to learn which verts are arm and leg, then throw that rig away
    r = rig(head, body, 0.0)
    gi = {g.index: g.name for g in body.vertex_groups}
    ARM = ("Arm", "ForeArm", "Hand"); LEG = ("UpLeg", "Leg", "Foot", "ToeBase")
    aw, lw = [], []
    for v in body.data.vertices:
        a = l = 0.0
        for g in v.groups:
            n = gi[g.group]
            for side in ("Left", "Right"):
                if n in [side + x for x in ARM]: a += g.weight
                if n in [side + x for x in LEG]: l += g.weight
        aw.append(min(1.0, a)); lw.append(min(1.0, l))
    for o in (head, body):
        for m in list(o.modifiers): o.modifiers.remove(m)
        o.vertex_groups.clear(); o.parent = None
    bpy.data.objects.remove(r, do_unlink=True)
    return aw, lw

def male(head, body):
    aw, lw = arm_leg_weights(head, body)
    SH = 0.065  # arms ride out this far with the broader shoulders
    old = [v.co.copy() for v in body.data.vertices]
    # pass 1, the big frame: shoulders out, waist and hips in, arms carried. smoothed after, so no lumps at the joins
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; sg = 1 if x >= 0 else -1
        A = aw[i]; T = 1 - A
        sh = bump(1.34, 1.44, 1.54, 1.6, z)
        x = x * (1 + 0.32 * sh * T) + sg * SH * A
        if y > 0.1: y = 0.1 + (y - 0.1) * (1 - 0.5 * bump(0.9, 1.0, 1.14, 1.24, z) * T)
        v.co = Vector((x, y, z))
    key = lambda c: (round(c.x, 4), round(c.y, 4), round(c.z, 4))
    grp = {}; gid = []
    for c in old: gid.append(grp.setdefault(key(c), len(grp)))
    n = len(grp); nb = [set() for _ in range(n)]
    for e in body.data.edges:
        p0, p1 = gid[e.vertices[0]], gid[e.vertices[1]]
        if p0 != p1: nb[p0].add(p1); nb[p1].add(p0)
    def relax(iters):
        D = [Vector() for _ in range(n)]; cnt = [0] * n
        for i, v in enumerate(body.data.vertices):
            D[gid[i]] += v.co - old[i]; cnt[gid[i]] += 1
        D = [d / c for d, c in zip(D, cnt)]
        for _ in range(iters):
            D = [(D[g] + sum((D[k] for k in nb[g]), Vector())) / (1 + len(nb[g])) if nb[g] else D[g] for g in range(n)]
        for i, v in enumerate(body.data.vertices): v.co = old[i] + D[gid[i]]
    relax(25)
    # the silhouette by measurement: the female hourglass read per 2 cm slice, then remapped to a male line
    P = [v.co.copy() for v in body.data.vertices]
    def prof(f, lo, hi, pick):
        bins = {}
        for i, c in enumerate(P):
            if aw[i] < 0.2 and lo <= c.z <= hi and f(i, c):
                k = int(c.z / 0.02); bins[k] = pick(bins.get(k), c)
        return bins
    zs = sorted(c.z for c in P); print("zrange", round(zs[0], 3), round(zs[-1], 3), "verts", len(P), "armless", sum(1 for a in aw if a < 0.2))
    half = prof(lambda i, c: True, 0.7, 1.5, lambda m, c: max(m or 0, abs(c.x)))
    def at(bins, z):
        k = int(z / 0.02); ks = [j for j in (k - 1, k, k + 1) if j in bins]
        return sum(bins[j] for j in ks) / len(ks) if ks else 0
    C = at(half, 1.46)
    G = [(0.9, 0.84), (1.0, 0.8), (1.12, 0.8), (1.22, 0.84), (1.32, 0.92), (1.4, 1.0)]
    def target(z):
        if z <= G[0][0]: return C * G[0][1]
        for (z0, g0), (z1, g1) in zip(G, G[1:]):
            if z <= z1: return C * (g0 + (g1 - g0) * (z - z0) / (z1 - z0))
        return C
    print("chest half", round(C, 3), "hip src", round(at(half, 1.08), 3), "->", round(target(1.08), 3), "waist src", round(at(half, 1.32), 3), "->", round(target(1.32), 3))
    pass1 = [v.co.copy() for v in body.data.vertices]
    for i, v in enumerate(body.data.vertices):
        z = v.co.z
        if not 0.8 <= z <= 1.44: continue
        src = sum(at(half, z + d) for d in (-0.04, -0.02, 0, 0.02, 0.04)) / 5
        if src <= 0: continue
        f = max(0.75, min(1.3, target(z) / src))
        f = 1 + (f - 1) * bump(0.82, 0.95, 1.38, 1.44, z)
        v.co.x *= 1 + (f - 1) * (1 - aw[i])
    # flat chest: the front of the ribcage on a straight line from collarbone to belly
    front = prof(lambda i, c: abs(c.x) < 0.12, 1.2, 1.56, lambda m, c: min(m if m is not None else 9, c.y))
    y0, y1 = at(front, 1.52), at(front, 1.26)
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; ax = abs(x); T = 1 - aw[i]
        band = bump(1.24, 1.3, 1.48, 1.53, z) * (1 - smooth(0.12, 0.2, ax)) * T
        if band <= 0: continue
        line = y1 + (y0 - y1) * (z - 1.26) / 0.26 - 0.006 * bump(1.38, 1.42, 1.46, 1.5, z) * bump(0.02, 0.05, 0.1, 0.13, ax)
        if y < line: v.co.y = y + (line - y) * band
    # thick neck, arm and calf mass
    for i, v in enumerate(body.data.vertices):
        x, y, z = v.co; sg = 1 if x >= 0 else -1; A = aw[i]; L = lw[i]; T = 1 - A
        nk = bump(1.48, 1.53, 1.6, 1.66, z) * T
        x *= 1 + 0.36 * nk; y = 0.075 + (y - 0.075) * (1 + 0.2 * nk)
        if A > 0.5: y = 0.075 + (y - 0.075) * (1 + 0.2 * A)
        if L > 0.5 and z < 0.45:
            c = bump(0.12, 0.22, 0.34, 0.42, z); cx = sg * 0.08
            x = cx + (x - cx) * (1 + 0.1 * c); y = 0.12 + (y - 0.12) * (1 + 0.08 * c)
        v.co = Vector((x, y, z))
    old = pass1
    relax(3)
    for v in head.data.vertices:
        x, y, z = v.co
        x *= 1 + 0.13 * bump(1.56, 1.62, 1.72, 1.78, z)  # squarer, wider jaw
        if y < 0.02: y -= 0.006 * bump(1.775, 1.79, 1.81, 1.83, z) * (1 - smooth(0.03, 0.08, abs(x)))  # brow ridge
        if y < 0.0: y -= 0.005 * bump(1.62, 1.645, 1.67, 1.69, z) * (1 - smooth(0.02, 0.05, abs(x)))  # squarer chin
        v.co = Vector((x, y, z))
    body.data.update(); head.data.update()

ANAT = dict(hipZ=0.90, legX=0.078, legY=0.12, kneeZ=0.48, ankleZ=0.085, toeY=-0.01, spineY=0.09,
            shoulder=(0.075, 1.42), arm=(0.17, 1.40), neckZ=1.55, headZ=1.64, topZ=1.94)

def proxy_weights(body, r):
    # Nov 8, Shelly: "feels like you weight painted them oddly". bone heat on the raw body stops at every seam (arms,
    # neck and legs are open islands), so each island skinned on its own. now: a copy welded at every seam takes the
    # bone heat as one surface, the real body copies its weights from the nearest point of that copy, then a light smooth.
    px = body.copy(); px.data = body.data.copy(); px.name = "WeightProxy"; bpy.context.collection.objects.link(px)
    px.vertex_groups.clear()
    for m in list(px.modifiers): px.modifiers.remove(m)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(px.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0015)
    bm.to_mesh(px.data); bm.free(); px.data.update()
    bpy.ops.object.select_all(action="DESELECT"); px.select_set(True); r.select_set(True)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    print("proxy verts", len(px.data.vertices), "proxy unweighted", sum(1 for v in px.data.vertices if not v.groups))
    assert sum(1 for v in px.data.vertices if not v.groups) < len(px.data.vertices) * 0.02, "bone heat failed on the proxy"
    body.vertex_groups.clear()
    for b in r.data.bones: body.vertex_groups.new(name=b.name)
    dt = body.modifiers.new("dt", "DATA_TRANSFER"); dt.object = px
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_move_to_index(modifier="dt", index=0); bpy.ops.object.modifier_apply(modifier="dt")
    bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
    bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.5, repeat=2)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if not any(m.type == "ARMATURE" for m in body.modifiers): body.modifiers.new("skin", "ARMATURE").object = r
    body.parent = r
    bpy.data.objects.remove(px, do_unlink=True)

def shoulder_blend(body, r):
    # bone heat stops at the arm's seam (a separate mesh island), so the shoulder split. around each shoulder joint,
    # weld the seam by position and smooth the weights over the welded surface, so the arm eases out of the torso
    key = lambda c: (round(c.x, 4), round(c.y, 4), round(c.z, 4))
    W = body.matrix_world; P = [W @ v.co for v in body.data.vertices]
    weld = {}; gid = [weld.setdefault(key(p), len(weld)) for p in P]
    nb = [set() for _ in range(len(weld))]
    for e in body.data.edges:
        a, b = gid[e.vertices[0]], gid[e.vertices[1]]
        if a != b: nb[a].add(b); nb[b].add(a)
    joints = [r.matrix_world @ r.data.bones[s + "Arm"].head_local for s in ("Left", "Right")]
    zone = {}
    for i, p in enumerate(P):
        d = min((p - j).length for j in joints)
        if d < 0.13: zone.setdefault(gid[i], []).append(i)
    names = [g.name for g in body.vertex_groups]
    wt = {}
    for g, idx in zone.items():
        acc = {}
        for i in idx:
            for gg in body.data.vertices[i].groups: acc[gg.group] = acc.get(gg.group, 0) + gg.weight / len(idx)
        wt[g] = acc
    for _ in range(14):
        nxt = {}
        for g in wt:
            acc = dict(wt[g]); n = 1
            for h in nb[g]:
                if h in wt:
                    for k, w in wt[h].items(): acc[k] = acc.get(k, 0) + w
                    n += 1
            nxt[g] = {k: w / n for k, w in acc.items()}
        wt = nxt
    for g, idx in zone.items():
        top = sorted(wt[g].items(), key=lambda kv: -kv[1])[:4]; tot = sum(w for _, w in top) or 1
        for i in idx:
            for gg in list(body.data.vertices[i].groups): body.vertex_groups[gg.group].remove([i])
            for k, w in top: body.vertex_groups[k].add([i], w / tot, "REPLACE")
    print("shoulder blend verts", sum(len(v) for v in zone.values()))

def shoulder_weights(body, r):
    # Nov 8 rerig: bone heat leaves the deltoid on the torso, so a lowered arm slid out from under a shoulder "pad".
    # around each arm root, weights are set by geometry: along the arm axis (t) the Arm bone takes over across an
    # 11 cm band, and only within the arm's own radius (r), so the chest and back beside it stay on the torso.
    W = body.matrix_world; gi = {g.name: g for g in body.vertex_groups}
    names = {g.index: g.name for g in body.vertex_groups}
    n = 0
    for s in ("Left", "Right"):
        b = r.data.bones[s + "Arm"]
        h = r.matrix_world @ b.head_local; u = ((r.matrix_world @ b.tail_local) - h).normalized()
        P = [(i, W @ v.co) for i, v in enumerate(body.data.vertices)]
        def tr(p):
            d = p - h; t = d.dot(u); return t, (d - u * t).length
        rad = sorted(tr(p)[1] for _, p in P if 0.05 < tr(p)[0] < 0.08 and tr(p)[1] < 0.12)
        R = rad[int(len(rad) * 0.8)] if rad else 0.05
        print(s, "arm radius", round(R, 3))
        for i, p in P:
            t, rr = tr(p)
            if t < -0.11 or t > 0.07 or rr > R + 0.10: continue
            if (p.x > 0) != (s == "Left"): continue
            w = smooth(-0.10, 0.0, t) * (1 - smooth(R + 0.03, R + 0.10, rr))
            v = body.data.vertices[i]
            old = {names[g.group]: g.weight for g in v.groups}
            arm_chain = sum(wt for k, wt in old.items() if k.startswith(s) and k.endswith(("Arm", "ForeArm", "Hand")))
            w = max(w, min(1.0, arm_chain)) if t > 0.0 else w
            rest = {k: wt for k, wt in old.items() if not (k.startswith(s) and k.endswith(("Arm", "ForeArm", "Hand")))}
            tot = sum(rest.values())
            if tot < 1e-4: rest = {s + "Shoulder": 0.6, "Spine2": 0.4}; tot = 1.0
            for g in list(v.groups): body.vertex_groups[g.group].remove([i])
            gi[s + "Arm"].add([i], w, "REPLACE")
            for k, wt in rest.items():
                if wt / tot * (1 - w) > 1e-3: gi[k].add([i], wt / tot * (1 - w), "REPLACE")
            n += 1
    print("shoulder weights set", n)

def rig(head, body, wide):
    vs = [body.matrix_world @ v.co for v in body.data.vertices]
    tip = max(vs, key=lambda v: v.x)
    A = ANAT
    arm0 = Vector((A["arm"][0] * (1 + wide), 0.075, A["arm"][1]))
    d = tip - arm0
    wrist = arm0 + d * 0.80; elbow = arm0 + (wrist - arm0) * 0.5 + Vector((0, 0.012, 0))
    # each arm joint sits at the centre of the arm's own cross-section there (bone heat skins a centred bone cleanly)
    def centre(g):
        u = (tip - arm0).normalized()
        near = [v for v in vs if abs((v - g).dot(u)) < 0.012 and ((v - g) - u * (v - g).dot(u)).length < 0.07]
        if len(near) < 6: return g
        c = sum(near, Vector()) / len(near); return Vector((g.x, c.y, c.z))
    arm0, elbow, wrist = centre(arm0), centre(elbow), centre(wrist)
    print("arm joints", [tuple(round(x, 3) for x in p) for p in (arm0, elbow, wrist)])
    bpy.ops.object.armature_add(location=(0, 0, 0)); r = bpy.context.object; r.name = "Armature"
    bpy.ops.object.mode_set(mode="EDIT"); eb = r.data.edit_bones; eb.remove(eb[0])
    def B(n, h, t, p=None):
        b = eb.new(n); b.head, b.tail = Vector(h), Vector(t)
        if p: b.parent = eb[p]; b.use_connect = False
        return b
    sy = A["spineY"]
    B("Hips", (0, sy, A["hipZ"]), (0, sy, A["hipZ"] + 0.1))
    B("Spine", (0, sy, A["hipZ"] + 0.1), (0, sy, 1.12), "Hips")
    B("Spine1", (0, sy, 1.12), (0, sy, 1.27), "Spine")
    B("Spine2", (0, sy, 1.27), (0, sy, A["neckZ"] - 0.05), "Spine1")
    B("Neck", (0, sy, A["neckZ"] - 0.05), (0, sy, A["headZ"]), "Spine2")
    B("Head", (0, sy, A["headZ"]), (0, sy, A["topZ"] - 0.05), "Neck")
    B("HeadTop_End", (0, sy, A["topZ"] - 0.05), (0, sy, A["topZ"]), "Head")
    for s, sg in (("Left", 1), ("Right", -1)):
        # Mixamo: the character's left is +X in Blender when it faces -Y
        m = lambda v: (v[0] * sg, v[1], v[2])
        B(f"{s}Shoulder", m((A["shoulder"][0], 0.08, A["shoulder"][1])), m((arm0.x, arm0.y, arm0.z)), "Spine2")
        B(f"{s}Arm", m(arm0), m(elbow), f"{s}Shoulder")
        B(f"{s}ForeArm", m(elbow), m(wrist), f"{s}Arm")
        B(f"{s}Hand", m(wrist), m(tip), f"{s}ForeArm")
        B(f"{s}UpLeg", m((A["legX"], A["legY"], A["hipZ"] - 0.02)), m((A["legX"], A["legY"] - 0.005, A["kneeZ"])), "Hips")
        B(f"{s}Leg", m((A["legX"], A["legY"] - 0.005, A["kneeZ"])), m((A["legX"], 0.15, A["ankleZ"])), f"{s}UpLeg")
        B(f"{s}Foot", m((A["legX"], 0.15, A["ankleZ"])), m((A["legX"], 0.03, 0.02)), f"{s}Leg")
        B(f"{s}ToeBase", m((A["legX"], 0.03, 0.02)), m((A["legX"], A["toeY"] - 0.02, 0.02)), f"{s}Foot")
    bpy.ops.object.mode_set(mode="OBJECT")
    # body: bone heat; head: all Head, the neck ring blended
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); r.select_set(True)
    bpy.context.view_layer.objects.active = r
    proxy_weights(body, r)
    unweighted = sum(1 for v in body.data.vertices if not v.groups)
    print("body unweighted verts", unweighted)
    hg = head.vertex_groups.new(name="Head")
    hg.add([v.index for v in head.data.vertices], 1.0, "REPLACE")
    mod = head.modifiers.new("skin", "ARMATURE"); mod.object = r; head.parent = r
    return r

def proof(name, r):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
    sc.render.resolution_x, sc.render.resolution_y = 520, 760
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.76, 0.78, 1)
    for loc in ((2, -3, 3), (-3, 2, 2)):
        bpy.ops.object.light_add(type="SUN", location=loc); bpy.context.object.data.energy = 3
        bpy.context.object.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 45
    H = 1.0
    def shot(tag, pos):
        cam.location = pos; cam.rotation_euler = (Vector((0, 0.08, H)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/hb/{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
    shot("front", (0, -3.4, 1.0)); shot("side", (3.4, 0.08, 1.0))
    # stress pose: arm up, elbow and knee bent
    pb = r.pose.bones
    pb["LeftArm"].rotation_mode = pb["LeftForeArm"].rotation_mode = pb["RightUpLeg"].rotation_mode = pb["RightLeg"].rotation_mode = pb["RightArm"].rotation_mode = "XYZ"
    pb["LeftArm"].rotation_euler = (0, 0, math.radians(-50)); pb["LeftForeArm"].rotation_euler = (math.radians(60), 0, 0)
    pb["RightArm"].rotation_euler = (0, 0, math.radians(-55))
    pb["RightUpLeg"].rotation_euler = (math.radians(-50), 0, 0); pb["RightLeg"].rotation_euler = (math.radians(70), 0, 0)
    bpy.context.view_layer.update(); shot("pose", (2.8, -3.6, 1.1)); shot("poseback", (-2.8, 3.6, 1.4))
    for b in pb: b.rotation_mode = "XYZ"; b.rotation_euler = (0, 0, 0)
    pb["LeftArm"].rotation_euler = (math.radians(45), 0, math.radians(-10)); pb["RightArm"].rotation_euler = (math.radians(-45), 0, math.radians(10))
    pb["LeftForeArm"].rotation_euler = (math.radians(70), 0, 0); pb["RightForeArm"].rotation_euler = (math.radians(70), 0, 0)
    pb["LeftUpLeg"].rotation_euler = (math.radians(-40), 0, 0); pb["RightUpLeg"].rotation_euler = (math.radians(25), 0, 0); pb["RightLeg"].rotation_euler = (math.radians(60), 0, 0)
    pb["Spine1"].rotation_euler = (0, math.radians(15), 0)
    bpy.context.view_layer.update(); shot("run", (2.8, -3.6, 1.1))
    for b in pb: b.rotation_euler = (0, 0, 0)

def garment(body, r, name, keep, color, cuts=(), push=0.005):
    import bmesh
    o = body.copy(); o.data = body.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    gi = {g.index: g.name for g in o.vertex_groups}
    dl = bm.verts.layers.deform.active
    for zc in cuts:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, zc), plane_no=(0, 0, 1))
    def armw(v):
        return sum(w for g, w in v[dl].items() if any(gi[g].endswith(k) for k in ("Arm", "ForeArm", "Hand"))) if dl else 0
    gone = [f for f in bm.faces if not keep(f.calc_center_median(), max(armw(v) for v in f.verts))]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    for v in bm.verts: v.co += v.normal * push
    tailor(bm, name)
    bm.to_mesh(o.data); bm.free()
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]; bsdf.inputs["Base Color"].default_value = color; bsdf.inputs["Roughness"].default_value = 0.75
    o.data.materials.clear(); o.data.materials.append(m)
    o.parent = r
    return o

def tpose(r, meshes):
    # the library clips (cdn/clip-*.glb) are authored on a T-pose rig whose every joint is world-aligned: their arm turns
    # assume an arm lying flat along X. Our A-pose bind (arms ~30 deg down) took those turns from the wrong start, so the
    # idle bowed the elbows out and swung the hands behind the hips (Shelly: "THE ARMS are a huge problem").
    # Raise each arm flat, bake that pose into the meshes, make it the rest. identity.py then aligns the joint frames.
    bpy.ops.object.select_all(action="DESELECT"); r.select_set(True); bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode="POSE")
    for s, sg in (("Left", 1), ("Right", -1)):
        for n in (f"{s}Arm", f"{s}ForeArm", f"{s}Hand"):
            pb = r.pose.bones[n]; bpy.context.view_layer.update()
            M = r.matrix_world @ pb.matrix
            d = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
            q = d.rotation_difference(Vector((sg, 0, 0)))
            head = M.translation.copy()
            R = q.to_matrix().to_4x4()
            M2 = Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ M
            pb.matrix = r.matrix_world.inverted() @ M2
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    for o in meshes:
        mod = next((m for m in o.modifiers if m.type == "ARMATURE"), None)
        if not mod: continue
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        nm = mod.name; bpy.ops.object.modifier_apply(modifier=nm)
        o.modifiers.new(nm, "ARMATURE").object = r
    bpy.ops.object.select_all(action="DESELECT"); r.select_set(True); bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode="POSE"); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode="OBJECT")
    print("tpose applied")

# ---------------- Nov 9 pass: real skin, a face that reads, clothes fitted per body ----------------
import bmesh, numpy as np
MATS = {}
def mat(name, color, rough=0.75, metal=0.0, image=None):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if image is not None:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = image
        m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    MATS[name] = m; return m

def skin_mat(name, image):
    # Cycles proof only: the game's skin is the glTF base colour + the tint skinOf(l) and a warm emissive lift
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = image
    mix = m.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
    m.node_tree.links.new(t.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (0.86, 0.66, 0.52, 1)
    m.node_tree.links.new(mix.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.6
    b.inputs["Subsurface Weight"].default_value = 0.25; b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.01
    return m

def img_np(im):
    a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4); return a
def np_img(name, a):
    h, w = a.shape[:2]; im = bpy.data.images.new(name, w, h, alpha=True)
    im.pixels.foreach_set(a.ravel()); im.pack(); return im
def shrink(a, n=1024):
    f = a.shape[0] // n
    return a.reshape(n, f, n, f, 4).mean(axis=(1, 3))

def textures(is_male):
    hi = img_np(bpy.data.images["Image_0"]); bo = img_np(bpy.data.images["Image_1"])
    H = hi.shape[0]
    def box(a, u0, u1, v0, v1):
        n = a.shape[0]; return slice(int(v0 * n), int(v1 * n)), slice(int(u0 * n), int(u1 * n))
    # skin: divided by its own cream so the tint skinOf(l) lands true; blush, knuckles, creases keep their darkening
    def norm(a):
        c = np.median(a[..., :3].reshape(-1, 3), axis=0); out = a.copy(); out[..., :3] = np.clip(a[..., :3] / c * 0.97, 0, 1); return out
    hs = norm(hi); bs = norm(bo)
    # lips: a soft rose over the mouth line (face is upside down in the atlas: mouth at v .553, nose below it at v .48)
    n = hs.shape[0]; vv, uu = np.mgrid[0:n, 0:n] / n
    for (cu, cv, rx, ry, k) in ((0.5, 0.556, 0.03, 0.0075, 1.0), (0.5, 0.548, 0.026, 0.006, 0.8)):
        d = ((uu - cu) / rx) ** 2 + ((vv - cv) / ry) ** 2; w = np.clip(1 - d, 0, 1) ** 1.5 * k
        lip = (0.9, 0.62, 0.62) if not is_male else (0.93, 0.76, 0.74)
        for ch in range(3): hs[..., ch] *= 1 - w * (1 - lip[ch])
    # features: iris and brows to grey so the game tints them (eye colour, hair colour)
    ft = hi.copy()
    lum = lambda a: a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
    s = box(ft, 0.0, 0.17, 0.81, 1.0); L = lum(ft[s]); g = np.clip(L / np.percentile(L, 97), 0, 1) ** 0.9
    for ch in range(3): ft[s][..., ch] = g
    s = box(ft, 0.2, 0.56, 0.0, 0.07); L = lum(ft[s]); g = np.clip(L / 0.62, 0, 1)
    for ch in range(3): ft[s][..., ch] = g
    return np_img("SkinHead", shrink(hs)), np_img("SkinBody", shrink(bs)), np_img("Features", shrink(ft))

def face_features(head, body, is_male):
    sh, sb, ft = textures(is_male)
    head.data.materials.clear(); body.data.materials.clear()
    for m in list(bpy.data.materials):
        if m.name.startswith(("Head_Skin", "Body_Skin")): m.name = "old_" + m.name
    head.data.materials.append(skin_mat("Head_Skin", sh)); body.data.materials.append(skin_mat("Body_Skin", sb))
    slots = {"Eye": mat("Eye", (1, 1, 1, 1), 0.3, image=ft), "Iris": mat("Iris", (1, 1, 1, 1), 0.28, image=ft),
             "Lash": mat("Lash", (1, 1, 1, 1), 0.8, image=ft), "Brow": mat("Brow", (1, 1, 1, 1), 0.9, image=ft),
             "Mouth": mat("Mouth", (1, 1, 1, 1), 0.5, image=ft), "Teeth": mat("Teeth", (1, 1, 1, 1), 0.35, image=ft)}
    idx = {}
    for k, m in slots.items(): head.data.materials.append(m); idx[k] = len(head.data.materials) - 1
    bm = bmesh.new(); bm.from_mesh(head.data); bm.faces.ensure_lookup_table(); uv = bm.loops.layers.uv.active
    seen = set(); kill = []; cnt = {}
    for f in bm.faces:
        if f.index in seen: continue
        st = [f]; seen.add(f.index); fs = []
        while st:
            g = st.pop(); fs.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); st.append(h)
        us = [l[uv].uv for g in fs for l in g.loops]
        uc = sum(u.x for u in us) / len(us); vc = sum(u.y for u in us) / len(us)
        k = None
        if uc < 0.06 and 0.76 < vc < 0.81: k = "kill"
        elif 0.14 < uc < 0.2 and 0.82 < vc < 0.88 and len(fs) < 40: k = "kill"
        elif uc < 0.16 and vc > 0.82: k = "Iris"
        elif uc < 0.23 and vc < 0.21: k = "Lash"
        elif 0.2 < uc < 0.55 and vc < 0.06: k = "Brow"
        elif uc > 0.84 and vc > 0.5 and len(fs) < 400: k = "Mouth"
        elif 0.3 < uc < 0.7 and 0.35 < vc < 0.46 and len(fs) < 200: k = "Eye"
        elif 0.15 < uc < 0.55 and vc > 0.9: k = "Teeth"
        cnt[k] = cnt.get(k, 0) + len(fs)
        if k == "kill": kill += fs
        elif k: 
            for g in fs: g.material_index = idx[k]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    # male: heavier brows, lighter lashes; both: irises a touch smaller than the doll base
    def scale_isl(key, sx, sz, dz=0.0):
        vs = {v for f in bm.faces if f.material_index == idx[key] for v in f.verts}
        for side in (1, -1):
            ss = [v for v in vs if (v.co.x > 0) == (side > 0)]
            if not ss: continue
            c = sum((v.co for v in ss), Vector()) / len(ss)
            for v in ss: v.co = Vector((c.x + (v.co.x - c.x) * sx, v.co.y, c.z + (v.co.z - c.z) * sz + dz))
    scale_isl("Iris", 0.9, 0.9)
    if is_male: scale_isl("Brow", 1.08, 1.7, -0.002); scale_isl("Lash", 1.0, 0.75)
    bm.to_mesh(head.data); bm.free(); head.data.update()
    print("face islands", cnt)

def finfo(o, r):
    # per-face: bone weights averaged, arm param along the arm (0 shoulder joint .. 1 wrist)
    gi = {g.index: g.name for g in o.vertex_groups}
    arms = {}
    for s in ("Left", "Right"):
        h = r.data.bones[s + "Arm"].head_local.copy(); w = r.data.bones[s + "Hand"].head_local.copy(); arms[s] = (h, w - h)
    def info(f, dl):
        W = {}
        for v in f.verts:
            for g, x in v[dl].items(): n = gi[g]; W[n] = W.get(n, 0) + x / len(f.verts)
        c = f.calc_center_median()
        arm = sum(x for n, x in W.items() if n.endswith(("Arm", "ForeArm", "Hand")) and "Up" not in n)
        hand = sum(x for n, x in W.items() if n.endswith("Hand"))
        leg = sum(x for n, x in W.items() if n.endswith(("UpLeg", "Leg", "Foot", "ToeBase")))
        h, d = arms["Left" if c.x > 0 else "Right"]
        t = (c - h).dot(d) / d.length_squared
        return dict(c=c, z=c.z, x=c.x, ax=abs(c.x), y=c.y, arm=arm, hand=hand, leg=leg, t=t)
    return info, arms

def garment(body, r, name, keep, mname, push, thick=0.004, cuts=(), armcuts=(), xcuts=()):
    push = push + 0.004 + (0.003 if name.startswith("Top_") else 0.0)  # a top rides 3 mm over the bottom it meets at the waist: one plane z-fought
    o = body.copy(); o.data = body.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    for m in list(o.modifiers):
        if m.type != "ARMATURE": o.modifiers.remove(m)
    bm = bmesh.new(); bm.from_mesh(o.data); dl = bm.verts.layers.deform.active
    info, arms = finfo(o, r)
    for zc in cuts:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, zc), plane_no=(0, 0, 1))
    for xc in xcuts:  # clean vertical edges (a vest's side, a strap): face picks alone leave a sawtooth
        for sg in (1, -1):
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(xc * sg, 0, 0), plane_no=(1, 0, 0))
    for t in armcuts:
        for s, (h, d) in arms.items():
            g = [e for e in bm.edges if ((e.verts[0].co.x > 0) == (s == "Left"))]
            if not g: continue
            bmesh.ops.bisect_plane(bm, geom=list({v for e in g for v in e.verts}) + g + list({f for e in g for f in e.link_faces}), plane_co=h + d * t, plane_no=d.normalized())
    gone = [f for f in bm.faces if not keep(info(f, dl))]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0004)
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_boundary], dist=0.004)  # the raw body's arm/torso islands drift apart after the T-pose bake: an open slit along the sleeve
    bm.normal_update()
    gi = {g.index: g.name for g in o.vertex_groups}
    for v in bm.verts:  # the shoulder's blend band: linear skinning shrinks an offset where arm and torso rotations mix, so the skin poked through a lowered sleeve; give that band more room
        wa = sum(x for g, x in v[dl].items() if gi[g] in ("LeftArm", "RightArm"))
        v.co += v.normal * (push + 0.012 * max(0.0, 1 - abs(2 * wa - 1)) + 0.014 * min(1.0, wa))  # the upper arm's back showed skin through the sleeve
    bm.to_mesh(o.data); bm.free()
    o.data.materials.clear(); o.data.materials.append(MATS[mname])
    if thick:
        sd = o.modifiers.new("solid", "SOLIDIFY"); sd.thickness = thick; sd.offset = 1; sd.use_rim = True
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_move_to_index(modifier="solid", index=0); bpy.ops.object.modifier_apply(modifier="solid")
    for p in o.data.polygons: p.use_smooth = True
    o.parent = r
    return o

def weighted(o, r, wfun):
    # a generated piece: weights by position, wfun(co) -> {bone: w}
    o.vertex_groups.clear()
    for v in o.data.vertices:
        ws = wfun(v.co); tot = sum(ws.values()) or 1
        for n, w in ws.items():
            if w <= 1e-3: continue
            g = o.vertex_groups.get(n) or o.vertex_groups.new(name=n); g.add([v.index], w / tot, "REPLACE")
    o.modifiers.new("skin", "ARMATURE").object = r; o.parent = r
    for p in o.data.polygons: p.use_smooth = True

def mesh_obj(name, bm, mname):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o); me.materials.append(MATS[mname]); return o

def solidify(o, t):
    sd = o.modifiers.new("solid", "SOLIDIFY"); sd.thickness = t; sd.offset = 1; sd.use_rim = True
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="solid")

def body_radii(body, aw, z, cy, nb=36):
    # star radius of the body (arms out) around (0, cy) at height z, per angle bin
    R = [0.0] * nb
    for i, v in enumerate(body.data.vertices):
        if aw[i] > 0.3 or abs(v.co.z - z) > 0.035: continue  # wide band: a sparse vertex row never leaves skin poking through the cloth
        a = math.atan2(v.co.y - cy, v.co.x); k = int((a + math.pi) / (2 * math.pi) * nb) % nb
        R[k] = max(R[k], math.hypot(v.co.x, v.co.y - cy))
    m = max(R) or 0.1
    # an empty bin (sparse rows at the waist) takes its nearest filled neighbours, never the max: max made tabs stick out of skirts
    full = [k for k in range(nb) if R[k] > 0]
    if full:
        R0 = list(R)
        for k in range(nb):
            if R0[k] > 0: continue
            lo = next(d for d in range(1, nb) if R0[(k - d) % nb] > 0); hi = next(d for d in range(1, nb) if R0[(k + d) % nb] > 0)
            R[k] = (R0[(k - lo) % nb] * hi + R0[(k + hi) % nb] * lo) / (lo + hi)
    R = [x if x > 0 else m for x in R]
    for _ in range(3): R = [(R[k - 1] + 2 * R[k] + R[(k + 1) % nb]) / 4 for k in range(nb)]
    return R

def ring_piece(name, body, aw, mname, z0, z1, flare, slack, cy, arc=None, rows=14, seg=40, thick=0.004):
    # a hanging cloth (skirt, dress skirt, cape, apron) as rings following the widest body below its top + flare
    fa, fn_ = FOLDS.get(name, (0.014, 14)) if name in FOLDS or name in ("dsk", "ask") else (0.0, 0)
    if fa: seg = max(seg, fn_ * 6 if arc else fn_ * 5); rows = max(rows, 26)
    nb = 36; prof = []; acc = None
    for j in range(rows + 1):
        z = z0 + (z1 - z0) * j / rows
        Rz = body_radii(body, aw, z, cy, nb)
        acc = Rz if acc is None else [max(a, b) for a, b in zip(acc, Rz)]
        prof.append((z, list(acc), j / rows))
    bm = bmesh.new(); grid = []
    a0, a1 = arc if arc else (-math.pi, math.pi)
    closed = arc is None; ns = seg if closed else seg + 1
    for z, R, t in prof:
        row = []
        for i in range(ns):
            a = a0 + (a1 - a0) * i / seg
            k = (a + math.pi) / (2 * math.pi) * nb; k0 = int(k) % nb; f = k - int(k)
            rr = R[k0] * (1 - f) + R[(k0 + 1) % nb] * f + (slack(z) if callable(slack) else slack) + flare * t ** 1.3
            if fa:  # drape: soft folds that open toward the hem, each a little different
                u = (a - a0) / (a1 - a0) if arc else (a + math.pi) / (2 * math.pi)
                ph = fn_ * u * 2 * math.pi + 0.9 * math.sin(u * 17.0 + t * 2.0)
                rr += fa * (t ** 1.15) * (0.5 + 0.5 * math.sin(ph)) ** 1.6
            row.append(bm.verts.new((math.cos(a) * rr, cy + math.sin(a) * rr, z)))
        grid.append(row)
    for j in range(rows):
        for i in range(seg):
            a, b = grid[j][i], grid[j][(i + 1) % ns]; c, d = grid[j + 1][(i + 1) % ns], grid[j + 1][i]
            bm.faces.new((a, b, c, d))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update(); tailor(bm, name)
    o = mesh_obj(name, bm, mname)
    if thick: solidify(o, thick)
    return o

def skirt_w(z0, z1, top="Hips"):
    def w(co):
        t = max(0.0, min(1.0, (z0 - co.z) / max(1e-3, z0 - z1)))
        lt = 0.65 * t; sl = max(0.0, min(1.0, 0.5 + co.x / 0.16))
        return {top: 1 - lt, "LeftUpLeg": lt * sl, "RightUpLeg": lt * (1 - sl)}
    return w

def head_fit(head):
    P = [v.co for v in head.data.vertices]
    sk = [p for p in P if p.z > 1.76 and abs(p.x) < 0.105]
    top = max(p.z for p in P)
    xs = [abs(p.x) for p in P if 1.76 < p.z < 1.86]; ys = [p.y for p in P if p.z > 1.74]
    rx = max(xs); y0, y1 = min(ys), max(ys); cy = (y0 + y1) / 2; ry = (y1 - y0) / 2
    cz = 1.775; rz = top - cz
    brow = max((p.z for p in P if p.y < y0 + 0.03 and abs(p.x) < 0.03 and p.z < 1.86), default=1.8)
    print("head fit rx", round(rx, 3), "ry", round(ry, 3), "cy", round(cy, 3), "rz", round(rz, 3), "top", round(top, 3), "front y", round(y0, 3))
    return dict(rx=rx, ry=ry, cy=cy, cz=cz, rz=rz, top=top, y0=y0, y1=y1)

def dome(name, H, off, cut_front, cut_back, mname, thick=0.005, extra_z=0.0):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * (H["rx"] + off), H["cy"] + v.co.y * (H["ry"] + off), H["cz"] + v.co.z * (H["rz"] + off + extra_z)))
    def cut(y):
        t = (y - H["y0"]) / (H["y1"] - H["y0"]); return cut_front + (cut_back - cut_front) * max(0, min(1, t))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z < cut(v.co.y) for v in f.verts)], context="FACES")
    for v in bm.verts:
        c = cut(v.co.y)
        if v.co.z < c: v.co.z = c
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    o = mesh_obj(name, bm, mname)
    if thick: solidify(o, thick)
    return o, cut

def add(objs, o, r, wfun):
    weighted(o, r, wfun); objs.append(o); return o

def torus(name, R, rr, mname, loc, rot=(0, 0, 0), scale=(1, 1, 1), seg=32, mseg=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=rr, major_segments=seg, minor_segments=mseg, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = scale; bpy.ops.object.transform_apply(scale=True, rotation=True, location=True)
    o.data.materials.append(MATS[mname]); return o

def prim(name, kind, mname, loc, rot=(0, 0, 0), scale=(1, 1, 1), **kw):
    getattr(bpy.ops.mesh, "primitive_" + kind + "_add")(location=loc, rotation=rot, **kw)
    o = bpy.context.object; o.name = name; o.scale = scale; bpy.ops.object.transform_apply(scale=True, rotation=True, location=True)
    o.data.materials.append(MATS[mname]); return o

def join(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o

FOLDS = {"Neck_cape": (0.032, 9), "Bot_skirt": (0.011, 16), "Bot_longskirt": (0.02, 13)}
TAILOR = {  # per garment: fold depth (m), hem band width, ribbed band, seams, extra details
    "Top_tee": dict(fold=0.0035, hem=0.014, seam=1), "Top_tank": dict(fold=0.003, hem=0.01, seam=1),
    "Top_longsleeve": dict(fold=0.004, hem=0.014, seam=1), "Top_pajamas": dict(fold=0.005, hem=0.016, seam=1),
    "Top_sweater": dict(fold=0.004, hem=0.03, rib=1, seam=1), "Top_hoodie": dict(fold=0.0045, hem=0.032, rib=1, seam=1),
    "Top_jacket": dict(fold=0.005, hem=0.02, seam=1, placket=1), "Top_dress": dict(fold=0.003, hem=0.012, seam=1),
    "Top_apron": dict(fold=0.0025, hem=0.012), "Top_plate": dict(hem=0.012, lames=(1.15, 1.22, 1.29), keel=1),
    "Bot_pants": dict(fold=0.0045, hem=0.018, seam=1), "Bot_shorts": dict(fold=0.0035, hem=0.016, seam=1),
    "Bot_pjpants": dict(fold=0.0055, hem=0.016), "Bot_overalls": dict(fold=0.004, hem=0.016, seam=1),
    "Bot_skirt": dict(hem=0.014), "Bot_longskirt": dict(hem=0.016), "Neck_cape": dict(hem=0.016), "dsk": dict(hem=0.012), "ask": dict(hem=0.012),
    "Shoes_sneakers": dict(hem=0.008, sole=0.026), "Shoes_boots": dict(fold=0.002, hem=0.022, sole=0.03), "Shoes_slippers": dict(hem=0.01, sole=0.02),
    "Strap_a": dict(hem=0.004), "Strap_b": dict(hem=0.004),
    "Under_top": dict(hem=0.006), "Under_bottom": dict(hem=0.008)}
def tailor(bm, name):
    T = next((v for k, v in TAILOR.items() if name.startswith(k)), None)
    if not T: return
    E = [e.calc_length() for e in bm.edges]
    if T.get("fold") and E and sum(E) / len(E) > 0.011 and len(bm.faces) < 26000:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    bm.verts.ensure_lookup_table(); bm.normal_update()
    hem = T.get("hem", 0); cap = hem * 1.8 + 0.006
    dist = {}; pq = []
    for v in bm.verts:
        if v.is_boundary: dist[v] = 0.0; pq.append((0.0, v.index))
    heapq.heapify(pq)
    while pq:
        d, i = heapq.heappop(pq); v = bm.verts[i]
        if d > dist.get(v, 9) or d > cap: continue
        for e in v.link_edges:
            w = e.other_vert(v); nd = d + e.calc_length()
            if nd < dist.get(w, 9): dist[w] = nd; heapq.heappush(pq, (nd, w.index))
    fold = T.get("fold", 0)
    for v in bm.verts:
        c = v.co; x, y, z = c.x, c.y, c.z; d = 0.0
        arm = abs(x) > 0.2 and z > 1.0
        if fold:
            if arm: n = noise.noise(Vector((x * 34, y * 11 + 3.1, z * 13 + 1.7)))
            elif z < 0.95: n = noise.noise(Vector((x * 9 + 5.2, y * 9, z * 36)))
            else: n = noise.noise(Vector((x * 24 + 2.3, y * 24, z * 5.5 + 0.4)))
            ridge = 1.0 - abs(n) * 2.2  # crests where the field crosses zero
            k = 1.0
            if z < 0.95: k = 0.55 + 0.9 * math.exp(-((z - 0.47) / 0.07) ** 2) + 0.9 * math.exp(-((z - 0.14) / 0.06) ** 2) + 0.6 * math.exp(-((z - 0.9) / 0.05) ** 2)
            elif arm: k = 0.6 + 0.8 * math.exp(-((abs(x) - 0.44) / 0.06) ** 2)
            d += fold * k * max(-0.3, min(1.0, ridge))
        bd = dist.get(v, 9)
        if hem and bd < hem: d += 0.0024 + (0.0018 * (0.5 + 0.5 * math.sin(250 * ((y + z) if arm else (x + y))))) * T.get("rib", 0)
        elif hem and bd < hem + 0.005: d -= 0.0011  # stitch line
        if T.get("seam"):
            if abs(x) > 0.09 and not arm and abs(y - 0.1) < 0.0035 and z > 0.2: d -= 0.0013
            if abs(abs(x) - 0.185) < 0.0035 and z > 1.28: d -= 0.0012
        if T.get("placket") and y < 0.07 and abs(x) < 0.0035: d -= 0.0016
        if T.get("placket") and y < 0.07 and 0.0035 <= abs(x) < 0.014: d += 0.0008
        if T.get("sole"):
            if z < T["sole"]: d += 0.003
            elif z < T["sole"] + 0.004: d -= 0.0012
        for L in T.get("lames", ()):
            if y < 0.1 and abs(z - L) < 0.0035: d -= 0.0028
        if T.get("keel") and y < 0.06 and abs(x) < 0.012 and z > 1.12: d += 0.0025 * (1 - abs(x) / 0.012)
        if d: v.co += v.normal * d

def bevel_rim(o, w=0.0028):
    bv = o.modifiers.new("bev", "BEVEL"); bv.width = w; bv.segments = 2; bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(50)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_move_to_index(modifier="bev", index=0); bpy.ops.object.modifier_apply(modifier="bev")
    for p in o.data.polygons: p.use_smooth = True

def dress(head, body, r, is_male, aw):
    C = lambda h: (*[int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], 1)
    for n, c in (("cloth_top", "#c9c2b4"), ("cloth_bottom", "#3b4a63"), ("cloth_shoes", "#e8e4dc"), ("cloth_hat", "#8a2f2f"), ("cloth_neck", "#7d5a8c"), ("under", "#2b2a30")):
        mat(n, C(c), 0.8)
    mat("metal", C("#2a2a30"), 0.35, 0.8); mat("strap", C("#3b2a1f"), 0.62); mat("button", C("#d9d2c2"), 0.4); mat("lens", C("#1a1824"), 0.1, 0.5); mat("gold", C("#e8c35a"), 0.3, 0.9)
    out = []
    G = lambda *a, **k: out.append(garment(body, r, *a, **k)) or out[-1]
    TORSO = lambda f, lo, hi: f["arm"] < 0.5 and (f["leg"] < 0.6 or f["z"] > 0.9) and lo < f["z"] < hi  # Nov 9: hip faces carry leg weight; the hem is the z cut, not a ragged weight edge
    NECK = lambda f, d=0.0: f["z"] < (1.495 - d if f["y"] < 0.06 else 1.525 - d) + max(0.0, math.hypot(f["x"], f["y"] - 0.08) - 0.075) * 1.4  # Nov 9: a ring round the neck, the shoulder tops stay clothed
    SLV = lambda f, s: f["arm"] >= 0.5 and f["t"] < s and f["hand"] < 0.4
    hemt = 1.0
    # underwear: nobody is naked by default
    if not is_male: G("Under_top", lambda f: TORSO(f, 1.27, 1.43), "under", 0.003, 0.002, cuts=(1.27, 1.43))
    G("Under_bottom", lambda f: f["arm"] < 0.3 and 0.8 < f["z"] < 1.04, "under", 0.003, 0.002, cuts=(0.8, 1.04))
    # tops
    G("Top_tee", lambda f: (TORSO(f, hemt, 1.6) and NECK(f)) or SLV(f, 0.4), "cloth_top", 0.009, cuts=(hemt, 1.495, 1.525), armcuts=(0.4,))
    G("Top_tank", lambda f: TORSO(f, hemt, 1.6) and NECK(f, 0.04) and (f["ax"] < 0.105 or f["z"] < 1.39), "cloth_top", 0.009, cuts=(hemt, 1.39, 1.455, 1.485))
    G("Top_longsleeve", lambda f: (TORSO(f, hemt, 1.6) and NECK(f)) or SLV(f, 0.97), "cloth_top", 0.009, cuts=(hemt, 1.495, 1.525), armcuts=(0.97,))
    G("Top_pajamas", lambda f: (TORSO(f, 0.95, 1.6) and NECK(f, 0.01)) or SLV(f, 0.95), "cloth_top", 0.011, cuts=(0.95, 1.485, 1.515), armcuts=(0.95,))
    sw = G("Top_sweater", lambda f: (TORSO(f, 0.95, 1.6) and f["z"] < 1.56) or SLV(f, 0.97), "cloth_top", 0.013, 0.006, cuts=(0.95, 1.56), armcuts=(0.97,))
    hd = G("Top_hoodie", lambda f: (TORSO(f, 0.95, 1.6) and NECK(f, -0.01)) or SLV(f, 0.98), "cloth_top", 0.015, 0.006, cuts=(0.95, 1.505, 1.535), armcuts=(0.98,))
    jk = G("Top_jacket", lambda f: (TORSO(f, 0.95, 1.6) and NECK(f, -0.01)) or SLV(f, 0.96), "cloth_top", 0.02, 0.006, cuts=(0.95, 1.505, 1.535), armcuts=(0.96,))
    dr = G("Top_dress", lambda f: (TORSO(f, 0.92, 1.6) and NECK(f, 0.02) and (f["ax"] < 0.11 or f["z"] < 1.41)), "cloth_top", 0.009, cuts=(0.92, 1.41, 1.475, 1.505))
    pl = G("Top_plate", lambda f: TORSO(f, 0.98, 1.6) and f["z"] < 1.47 and f["ax"] < 0.14, "cloth_top", 0.024, 0.009, cuts=(0.98, 1.47), xcuts=(0.14,))
    sa = garment(body, r, "Strap_a", lambda f: TORSO(f, 0.98, 1.6) and f["z"] < 1.56 and abs(f["ax"] - 0.105) < 0.017 and f["z"] > 1.33, "strap", 0.035, 0.005, cuts=(1.33, 1.56), xcuts=(0.088, 0.122))
    sb = garment(body, r, "Strap_b", lambda f: TORSO(f, 0.98, 1.6) and 1.07 < f["z"] < 1.115, "strap", 0.035, 0.005, cuts=(1.07, 1.115))
    for o in (pl, sa, sb): bevel_rim(o)
    fy = lambda z: min(v.co.y for v in body.data.vertices if abs(v.co.x) < 0.015 and abs(v.co.z - z) < 0.012)
    bk = prim("buckle", "cube", "metal", (0, fy(1.092) - 0.043, 1.092), scale=(0.022, 0.006, 0.018)); bevel_rim(bk, 0.003)
    weighted(bk, r, lambda co: {"Spine": 1.0})
    out[out.index(pl)] = join("Top_plate", [pl, sa, sb, bk])
    ap = G("Top_apron", lambda f: TORSO(f, 0.92, 1.42) and f["y"] < 0.075 and f["ax"] < 0.12, "cloth_top", 0.017, cuts=(0.92, 1.42))
    # bottoms
    PANT = lambda f, lo, hi=1.0: f["arm"] < 0.3 and lo < f["z"] < hi and (f["leg"] > 0.2 or f["z"] > 0.7)
    G("Bot_pants", lambda f: PANT(f, 0.1), "cloth_bottom", 0.009, cuts=(0.1, 1.0))
    G("Bot_shorts", lambda f: PANT(f, 0.64), "cloth_bottom", 0.009, cuts=(0.64, 1.0))
    G("Bot_pjpants", lambda f: PANT(f, 0.09, 1.01), "cloth_bottom", 0.008, cuts=(0.09, 1.01))
    G("Bot_overalls", lambda f: PANT(f, 0.11) or (TORSO(f, 0.95, 1.36) and f["y"] < 0.07 and f["ax"] < 0.1) or (TORSO(f, 0.95, 1.52) and 0.05 < f["ax"] < 0.08),
      "cloth_bottom", 0.012, cuts=(0.11, 1.36, 1.52))
    # shoes
    FOOT = lambda f, hi: f["leg"] > 0.5 and f["z"] < hi
    G("Shoes_sneakers", lambda f: FOOT(f, 0.12), "cloth_shoes", 0.011, 0.008, cuts=(0.12,))
    G("Shoes_boots", lambda f: FOOT(f, 0.36), "cloth_shoes", 0.014, 0.008, cuts=(0.36,))
    G("Shoes_slippers", lambda f: FOOT(f, 0.075), "cloth_shoes", 0.01, 0.01, cuts=(0.075,))
    # hanging cloth: skirts, the dress's skirt, apron bib's skirt, cape
    cy = 0.1
    TUCK = lambda z: 0.002 + 0.022 * smooth(1.0, 0.9, z)  # tucked under every top (hems 0.95-1.0), full ease below
    add(out, ring_piece("Bot_skirt", body, aw, "cloth_bottom", 0.995, 0.62, 0.08, TUCK, cy), r, skirt_w(0.995, 0.62))
    add(out, ring_piece("Bot_longskirt", body, aw, "cloth_bottom", 0.995, 0.16, 0.13, TUCK, cy, rows=20), r, skirt_w(0.995, 0.16))
    dsk = ring_piece("dsk", body, aw, "cloth_top", 0.94, 0.52, 0.1, 0.017, cy)
    weighted(dsk, r, skirt_w(0.94, 0.52)); dr = join("Top_dress", [dr, dsk]); out[out.index(next(o for o in out if o.name.startswith("Top_dress")))] = dr
    ask = ring_piece("ask", body, aw, "cloth_top", 0.95, 0.5, 0.05, 0.022, cy, arc=(-math.pi * 0.86, -math.pi * 0.14), rows=12, seg=20)
    weighted(ask, r, skirt_w(0.95, 0.5, "Hips")); ap2 = join("Top_apron", [ap, ask]); out[out.index(next(o for o in out if o.name.startswith("Top_apron")))] = ap2
    def capew(co):
        t = max(0.0, min(1.0, (1.5 - co.z) / 0.95))
        return {"Spine2": max(0, 1 - 2 * t), "Spine": max(0, 1 - abs(t - 0.5) * 2), "Hips": max(0, 2 * t - 1)}
    NW = lambda co: {"Neck": 0.5, "Spine2": 0.5}
    nk = body_radii(body, aw, 1.52, 0.075)
    nr = min(sorted(nk)[len(nk) // 2], 0.062)
    cp = ring_piece("Neck_cape", body, aw, "cloth_neck", 1.5, 0.55, 0.12, 0.03, cy, arc=(math.pi * 0.02, math.pi * 0.98), rows=16, seg=22)
    cc = torus("capecol", nr + 0.03, 0.013, "cloth_neck", (0, 0.08, 1.5), scale=(1.1, 1.15, 0.9))
    fyc = (0.08 - (nr + 0.03) * 1.15)
    k1 = prim("clasp", "cylinder", "gold", (0.03, fyc - 0.004, 1.49), rot=(math.pi / 2, 0, 0), vertices=16, radius=0.011, depth=0.006)
    k2 = prim("clasp", "cylinder", "gold", (-0.03, fyc - 0.004, 1.49), rot=(math.pi / 2, 0, 0), vertices=16, radius=0.011, depth=0.006)
    capew2 = lambda co: {"Neck": 0.4, "Spine2": 0.6} if co.z > 1.47 else capew(co)
    add(out, join("Neck_cape", [cp, cc, k1, k2]), r, capew2)
    # hood collapsed at the nape, on the hoodie
    hood = torus("hood", nr + 0.035, 0.03, "cloth_top", (0, 0.085, 1.52), scale=(1.0, 1.15, 0.9))
    bm = bmesh.new(); bm.from_mesh(hood.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < 0.05], context="VERTS"); bm.to_mesh(hood.data); bm.free()
    weighted(hood, r, NW); i = out.index(hd); out[i] = join("Top_hoodie", [hd, hood])
    fy2 = lambda z: min(v.co.y for v in body.data.vertices if abs(v.co.x) < 0.015 and abs(v.co.z - z) < 0.012)
    bts = []
    for z in ((1.0, 1.1, 1.2, 1.3) if is_male else (1.0, 1.1, 1.2)):
        b = prim("btn", "uv_sphere", "button", (0.014, fy2(z) - 0.027, z), scale=(0.0075, 0.003, 0.0075), segments=12, ring_count=6)
        weighted(b, r, (lambda zz: (lambda co: {"Spine": 1.0} if zz < 1.12 else {"Spine1": 1.0}))(z)); bts.append(b)
    i = out.index(jk); jk = join("Top_jacket", [jk, *bts]); out[i] = jk
    col = torus("col", nr + 0.03, 0.012, "cloth_top", (0, 0.08, 1.525), scale=(1.05, 1.1, 1.0)); weighted(col, r, NW); i = out.index(jk); out[i] = join("Top_jacket", [jk, col])
    # neck pieces
    sc = torus("Neck_scarf", nr + 0.022, 0.022, "cloth_neck", (0, 0.075, 1.52), scale=(1.0, 1.1, 1.0))
    tail = prim("tail", "cube", "cloth_neck", (0.035, -0.0 + 0.0, 1.38), scale=(0.035, 0.01, 0.13))
    tail.location.y = min(v.co.y for v in body.data.vertices if abs(v.co.z - 1.4) < 0.02 and abs(v.co.x - 0.035) < 0.02 and aw[v.index] < 0.3) - 0.025
    bpy.ops.object.select_all(action="DESELECT"); tail.select_set(True); bpy.context.view_layer.objects.active = tail; bpy.ops.object.transform_apply(location=True)
    bv = tail.modifiers.new("bv", "BEVEL"); bv.width = 0.006; bv.segments = 2; bpy.ops.object.modifier_apply(modifier="bv")
    add(out, join("Neck_scarf", [sc, tail]), r, lambda co: {"Neck": 0.5, "Spine2": 0.5} if co.z > 1.47 else {"Spine2": 1})
    fy = min(v.co.y for v in body.data.vertices if abs(v.co.z - 1.5) < 0.015 and abs(v.co.x) < 0.02) - 0.012
    b1 = prim("bt", "cone", "cloth_neck", (0.022, fy, 1.5), rot=(0, -math.pi / 2, 0), vertices=12, radius1=0.016, depth=0.04)
    b2 = prim("bt2", "cone", "cloth_neck", (-0.022, fy, 1.5), rot=(0, math.pi / 2, 0), vertices=12, radius1=0.016, depth=0.04)
    b3 = prim("knot", "uv_sphere", "cloth_neck", (0, fy - 0.004, 1.5), radius=0.009, segments=12, ring_count=8)
    add(out, join("Neck_bowtie", [b1, b2, b3]), r, NW)
    cl = torus("Neck_bell", nr + 0.006, 0.006, "cloth_neck", (0, 0.075, 1.53), scale=(1.0, 1.1, 1.0))
    bl = prim("bell", "uv_sphere", "gold", (0, fy - 0.012, 1.495), radius=0.016, segments=16, ring_count=10)
    add(out, join("Neck_bell", [cl, bl]), r, NW)
    # head pieces: fitted to this head's own ellipsoid, 2.8 cm off the scalp to leave room for hair
    H = head_fit(head); HW = lambda co: {"Head": 1.0}; O = 0.028
    brow = 1.8
    cap, cut = dome("Hat_cap", H, O, brow + 0.012, H["cz"] - 0.02, "cloth_hat", 0.005)
    # brim: a curved half-disc forward of the front cut
    bm = bmesh.new(); rows = []
    for j in range(5):
        row = []
        for i in range(17):
            a = math.pi * (0.12 + 0.76 * i / 16); t = j / 4
            rx, ry = H["rx"] + O + 0.004, H["ry"] + O + 0.004 + 0.075 * t * math.sin(a) ** 1.5
            y = H["cy"] - math.sin(a) * ry; x = math.cos(a) * rx * (1 - 0.15 * t)
            row.append(bm.verts.new((x, y, cut(y) - 0.002 - 0.012 * t * t)))
        rows.append(row)
    for j in range(4):
        for i in range(16): bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    brim = mesh_obj("brim", bm, "cloth_hat"); solidify(brim, 0.006)
    bt = prim("button", "uv_sphere", "cloth_hat", (0, H["cy"], H["cz"] + H["rz"] + O + 0.003), radius=0.009, segments=12, ring_count=6)
    add(out, join("Hat_cap", [cap, brim, bt]), r, HW)
    bn, cut = dome("Hat_beanie", H, O + 0.004, brow + 0.006, H["cz"] - 0.075, "cloth_hat", 0.006, extra_z=0.02)
    cuff, _ = dome("cuff", H, O + 0.016, brow + 0.006, H["cz"] - 0.075, "cloth_hat", 0.006)
    bm = bmesh.new(); bm.from_mesh(cuff.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > cut(f.calc_center_median().y) + 0.045], context="FACES"); bm.to_mesh(cuff.data); bm.free()
    pom = prim("pom", "uv_sphere", "cloth_hat", (0, H["cy"], H["cz"] + H["rz"] + O + 0.03), radius=0.03, segments=16, ring_count=10)
    add(out, join("Hat_beanie", [bn, cuff, pom]), r, HW)
    ztop = H["cz"] + H["rz"] + O
    th = prim("Hat_tophat", "cylinder", "cloth_hat", (0, H["cy"], ztop + 0.06), vertices=32, radius=1, depth=0.16, scale=(H["rx"] + O - 0.005, H["ry"] + O - 0.01, 1))
    tb = prim("tbrim", "cylinder", "cloth_hat", (0, H["cy"], ztop - 0.02), vertices=32, radius=1, depth=0.008, scale=(H["rx"] + O + 0.05, H["ry"] + O + 0.05, 1))
    add(out, join("Hat_tophat", [th, tb]), r, HW)
    ph = prim("Hat_partyhat", "cone", "cloth_hat", (0, H["cy"] - 0.01, ztop + 0.075), rot=(-0.2, 0, 0), vertices=24, radius1=0.065, radius2=0.004, depth=0.17)
    pp = prim("pp", "uv_sphere", "gold", (0, H["cy"] - 0.027, ztop + 0.16), radius=0.014, segments=10, ring_count=6)
    add(out, join("Hat_partyhat", [ph, pp]), r, HW)
    cr = prim("Hat_crown", "cylinder", "gold", (0, H["cy"], ztop - 0.005), vertices=40, radius=1, depth=0.035, end_fill_type="NOTHING", scale=(H["rx"] * 0.75, H["ry"] * 0.75, 1))
    spikes = [prim(f"sp{i}", "cone", "gold", (math.cos(a) * H["rx"] * 0.75, H["cy"] + math.sin(a) * H["ry"] * 0.75, ztop + 0.03), vertices=8, radius1=0.012, depth=0.04)
              for i, a in enumerate([k * math.pi / 4 for k in range(8)])]
    add(out, join("Hat_crown", [cr, *spikes]), r, HW)
    bx, by, bz = H["rx"] * 0.55, H["cy"] - 0.01, ztop - 0.02
    l1 = prim("bw1", "cone", "cloth_hat", (bx + 0.025, by, bz), rot=(0, -math.pi / 2, 0), vertices=12, radius1=0.024, depth=0.05)
    l2 = prim("bw2", "cone", "cloth_hat", (bx - 0.025, by, bz), rot=(0, math.pi / 2, 0), vertices=12, radius1=0.024, depth=0.05)
    kn = prim("bwk", "uv_sphere", "cloth_hat", (bx, by, bz), radius=0.012, segments=10, ring_count=6)
    add(out, join("Hat_bow", [l1, l2, kn]), r, HW)
    fx, fz = -H["rx"] * 0.75, H["cz"] + 0.06
    pet = [prim(f"pt{i}", "uv_sphere", "cloth_hat", (fx - 0.02 * abs(math.cos(a)) * 0.2, H["cy"] - 0.02 + math.cos(a) * 0.016, fz + math.sin(a) * 0.016), radius=0.012, segments=10, ring_count=6, scale=(0.6, 1, 1)) for i, a in enumerate([k * 1.2566 for k in range(5)])]
    ctr = prim("fc", "uv_sphere", "gold", (fx - 0.006, H["cy"] - 0.02, fz), radius=0.008, segments=10, ring_count=6)
    add(out, join("Hat_flower", [*pet, ctr]), r, HW)
    band = torus("Hat_headphones", 1.0, 0.012, "metal", (0, H["cy"], H["cz"]), rot=(math.pi / 2, 0, 0), scale=(H["rx"] + O, H["rz"] + O, 1))  # ring in the XZ plane, ear to ear; the old Y-turn stood a 1 m hoop front-to-back
    bm = bmesh.new(); bm.from_mesh(band.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < H["cz"] - 0.01], context="VERTS"); bm.to_mesh(band.data); bm.free()
    cups = [prim(f"cup{s}", "cylinder", "cloth_hat", (s * (H["rx"] + 0.02), H["cy"] + 0.015, H["cz"] - 0.035), rot=(0, math.pi / 2, 0), vertices=24, radius=0.04, depth=0.035) for s in (1, -1)]
    add(out, join("Hat_headphones", [band, *cups]), r, HW)
    # eyewear: frames ring each eye, temples back over the ears
    ev = [head.matrix_world @ v.co for v in head.data.vertices]
    eyes = [v for f in head.data.polygons if head.data.materials[f.material_index].name == "Eye" for v in [sum((head.data.vertices[k].co for k in f.vertices), Vector()) / len(f.vertices)]]
    ez = sum(v.z for v in eyes) / len(eyes); ex = sum(abs(v.x) for v in eyes) / len(eyes); ey = min(v.y for v in eyes) - 0.022
    for nm, mm, lens in (("Eyew_glasses", "metal", False), ("Eyew_shades", "metal", True)):
        parts = []
        for s in (1, -1):
            parts.append(torus(f"{nm}r{s}", 0.026, 0.0028, mm, (s * ex, ey, ez), rot=(math.pi / 2, 0, 0), scale=(1.15, 1, 0.82), mseg=6))
            if lens: parts.append(prim(f"{nm}l{s}", "cylinder", "lens", (s * ex, ey + 0.001, ez), rot=(math.pi / 2, 0, 0), vertices=24, radius=0.026, depth=0.002, scale=(1.15, 0.82, 1)))
            tl = prim(f"{nm}t{s}", "cube", mm, (s * (H["rx"] + 0.004), ey + 0.05, ez + 0.006), scale=(0.002, 0.05, 0.0025)); parts.append(tl)
        parts.append(prim(f"{nm}b", "cylinder", mm, (0, ey, ez + 0.006), rot=(0, math.pi / 2, 0), vertices=8, radius=0.0025, depth=ex * 2 - 0.055))
        add(out, join(nm, parts), r, HW)
    print("garments", sorted(o.name for o in out))
    return out, H

# ---- shape keys: Bust on her body and every piece over it; identity keys on every head piece ----
def field_keys(objs, name, fn):
    for o in objs:
        D = [fn(v.co) for v in o.data.vertices]
        if max((d.length for d in D), default=0) < 1e-4: continue
        if not o.data.shape_keys: o.shape_key_add(name="Basis", from_mix=False)
        k = o.shape_key_add(name=name, from_mix=False)
        for i, d in enumerate(D): k.data[i].co = o.data.vertices[i].co + d

def bust_field(body):
    P = [v.co for v in body.data.vertices]
    out = []
    for s in (1, -1):
        c = min((p for p in P if 1.22 < p.z < 1.45 and 0.03 < p.x * s < 0.15), key=lambda p: p.y)
        out.append(c.copy())
    print("bust centres", [tuple(round(x, 3) for x in c) for c in out])
    def fn(p):
        d = Vector()
        for c in out:
            q = p - c; r = Vector((q.x, q.y * 0.7, q.z)).length / 0.095
            if r < 1 and p.y < c.y + 0.07:
                w = (1 - r * r) ** 2
                d += Vector((q.x * 0.25, -0.03 - q.y * 0.1, q.z * 0.18 - 0.012)) * w
        return d
    return fn

def head_fields(H):
    cz, cy = H["cz"], H["cy"]; y0 = H["y0"]
    def mask(p): return smooth(1.655, 1.69, p.z)  # the neck seam never moves
    front = lambda p: 1 - smooth(y0 + 0.02, y0 + 0.07, p.y)
    return {
        "JawWide": lambda p: Vector((p.x * 0.12 * bump(1.64, 1.67, 1.72, 1.76, p.z) * mask(p), 0, 0)),
        "JawNarrow": lambda p: Vector((-p.x * 0.1 * bump(1.64, 1.67, 1.72, 1.76, p.z) * mask(p), 0, 0)),
        "ChinLong": lambda p: Vector((0, -0.004 * front(p), -0.016 * (1 - smooth(1.66, 1.73, p.z)) * front(p) * mask(p))),
        "NoseBig": lambda p: Vector((p.x * 0.25, -0.008, 0)) * bump(1.69, 1.705, 1.735, 1.75, p.z) * (1 - smooth(0.0, 0.025, abs(p.x))) * front(p),
        "CheekFull": lambda p: Vector((p.x * 0.07, -0.002, 0)) * bump(1.68, 1.71, 1.74, 1.77, p.z) * smooth(0.02, 0.05, abs(p.x)) * mask(p),
        "BrowHeavy": lambda p: Vector((0, -0.006, -0.002)) * bump(1.77, 1.785, 1.805, 1.82, p.z) * front(p),
        "FaceLong": lambda p: Vector((0, 0, 0.022 * (smooth(1.66, 1.94, p.z)) * (1 - 0.0))) if p.z > 1.69 else Vector((0, 0, 0)),
        "HeadRound": lambda p: Vector((p.x * 0.06, (p.y - cy) * 0.04, 0)) * smooth(1.76, 1.82, p.z),
        "EyeSmall": None,
    }

def lighten(objs, cap=3200):
    """garments over cap triangles collapse to it before keys and rest pose: shape holds, the body file stays a body a crowd can carry"""
    for o in objs:
        if o.type != "MESH" or o.data.shape_keys: continue
        n = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if n <= cap: continue
        dm = o.modifiers.new("lite", "DECIMATE"); dm.ratio = cap / n; dm.use_collapse_triangulate = False
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_move_to_index(modifier="lite", index=0); bpy.ops.object.modifier_apply(modifier="lite")
        for p in o.data.polygons: p.use_smooth = True

def build(name, is_male, height):
    MATS.clear()
    head, body = load()
    face_features(head, body, is_male)
    if is_male: male(head, body)
    aw, _ = arm_leg_weights(head, body)
    r = rig(head, body, 0.26 if is_male else 0.0)
    extra, H = dress(head, body, r, is_male, aw)
    lighten(extra)
    s = height / 1.94
    r.scale = (s, s, s); bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body, *extra): o.select_set(True)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.transform_apply(scale=True)
    tpose(r, (head, body, *extra))
    # keys in the final rest frame (metres): fields scaled from the source frame
    sv = lambda fn: (lambda p: fn(p / s) * s)
    torso = [o for o in (body, *extra) if not o.name.startswith(("Hat_", "Eyew_", "Shoes_"))]
    if not is_male: field_keys(torso, "Bust", sv(bust_field_scaled(body, s)))
    HS = {k: v for k, v in H.items()}
    heads = [head] + [o for o in extra if o.name.startswith(("Hat_", "Eyew_"))]
    for k, fn in head_fields(HS).items():
        if fn is None: continue
        field_keys(heads if k in ("HeadRound", "FaceLong") else [head], k, sv(fn))
    print("head top m", round(max(v.co.z for v in head.data.vertices), 4), "head bone", "Head",
          "head bone z", round((r.matrix_world @ r.data.bones["Head"].head_local).z, 4))
    proof(name, r, extra)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (r, head, body, *extra): o.select_set(True)
    for o in list(bpy.data.objects):
        if o.type == "MESH" and (o.name.startswith("Icosphere") or o.data.name.startswith("Icosphere")) or (o.type == "MESH" and o not in (head, body, *extra)): bpy.data.objects.remove(o, do_unlink=True)
    for o in extra: o.hide_render = False; o.hide_set(False); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_image_format="JPEG", export_jpeg_quality=88)
    print("exported", name)

def bust_field_scaled(body, s):
    # body is in metres now; the field was written in source units
    class P: pass
    tmp = [v.co / s for v in body.data.vertices]
    out = []
    for sg in (1, -1):
        c = min((p for p in tmp if 1.22 < p.z < 1.45 and 0.03 < p.x * sg < 0.15), key=lambda p: p.y); out.append(c.copy())
    def fn(p):
        d = Vector()
        for c in out:
            q = p - c; rr = Vector((q.x, q.y * 0.7, q.z)).length / 0.095
            if rr < 1 and p.y < c.y + 0.07:
                w = (1 - rr * rr) ** 2; d += Vector((q.x * 0.25, -0.03 - q.y * 0.1, q.z * 0.18 - 0.012)) * w
        return d
    return fn

SHOW = {"human_male": ("Top_plate", "Neck_cape", "Bot_pants", "Shoes_boots", "Under_bottom"),
        "human_female": ("Top_jacket", "Bot_skirt", "Shoes_sneakers", "Under_bottom", "Under_top")}
def proof(name, r, extra):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24
    sc.render.resolution_x, sc.render.resolution_y = 520, 760
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.5, 0.32, 1)
    for loc, e in (((1.5, -3, 3.5), 3.0), ((-3, 1, 2), 1.0)):
        bpy.ops.object.light_add(type="SUN", location=loc); bpy.context.object.data.energy = e; bpy.context.object.data.color = (1, 0.95, 0.75)
        bpy.context.object.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 45
    def shot(tag, pos, aim=(0, 0.05, 0.9), lens=45):
        cam.data.lens = lens; cam.location = pos; cam.rotation_euler = (Vector(aim) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/hb/{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
    def wear(names):
        for o in extra: o.hide_render = o.name not in names
    wear(("Under_bottom", "Under_top")); shot("front", (0, -3.4, 0.95)); shot("face", (0.25, -0.8, 1.5), (0, 0.02, 1.5), 85)
    wear(SHOW[name]); shot("dressed", (2.0, -2.8, 1.0))
    pb = r.pose.bones
    for b in pb: b.rotation_mode = "XYZ"
    pb["LeftArm"].rotation_euler = (0, 0, math.radians(-75)); pb["LeftForeArm"].rotation_euler = (math.radians(80), 0, 0)
    pb["RightArm"].rotation_euler = (math.radians(40), 0, math.radians(60))
    pb["RightUpLeg"].rotation_euler = (math.radians(-60), 0, 0); pb["RightLeg"].rotation_euler = (math.radians(80), 0, 0)
    pb["LeftUpLeg"].rotation_euler = (math.radians(25), 0, 0)
    bpy.context.view_layer.update(); shot("pose", (2.4, -2.8, 1.0))
    wear(("Top_hoodie", "Bot_longskirt" if "female" in name else "Bot_overalls", "Shoes_sneakers", "Eyew_glasses", "Neck_scarf", "Under_bottom", "Under_top"))
    shot("pose2", (-2.4, -2.8, 1.0))
    for b in pb: b.rotation_euler = (0, 0, 0)
    pb["LeftArm"].rotation_euler = (0, 0, math.radians(-70)); pb["RightArm"].rotation_euler = (0, 0, math.radians(70))
    wear(("Top_longsleeve", "Bot_skirt" if "female" in name else "Bot_pants", "Shoes_sneakers", "Under_bottom", "Under_top"))
    bpy.context.view_layer.update(); shot("back", (-1.6, 1.9, 1.3), (0, 0.05, 1.15), 60)
    for b in pb: b.rotation_euler = (0, 0, 0)

which = sys.argv[sys.argv.index("--") + 1]
if which == "female": build("human_female", False, 1.65)
else: build("human_male", True, 1.78)
