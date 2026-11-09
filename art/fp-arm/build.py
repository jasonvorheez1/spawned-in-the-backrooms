# First-person arms cut from Shelly's human bodies (art/human-base exports): right arm (shoulder off) with the
# fingers curled into a grip and the thumb folded over, laid in the viewmodel's frame (glTF: x right, y up, -z forward),
# its fist centred on the grip at the origin. A mirrored left arm for two-handed weapons. Static meshes: no skin, no IK.
import bpy, sys, math, mathutils as mu, os
import numpy as np
V = mu.Vector
SRC = {"f": "/workspace/arm/f.glb", "m": "/workspace/arm/m.glb"}
OUT = "/workspace/arm/out"; os.makedirs(OUT, exist_ok=True)
R_CURL = 0.014   # finger curl radius: a tight fist around the grip
def g2b(x, y, z): return V((x, -z, y))  # glTF frame -> Blender frame
def build(sex, side):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC[sex])
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = bpy.data.objects["Body"]
    B = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in list(bpy.data.objects):
        if o is not body: bpy.data.objects.remove(o)
    if body.data.shape_keys: body.shape_key_clear()   # the bust morph keys would override every vertex edit on export
    gi = {g.name: g.index for g in body.vertex_groups}
    keep = {gi["RightArm"], gi["RightForeArm"], gi["RightHand"]}
    body = bpy.data.objects["Body"]; me = body.data
    body.modifiers.clear()
    mw = body.matrix_world.copy()
    W, T = B["RightHand"]; a = (T - W).normalized()
    import numpy as np   # the hand's own axes from its mesh: fingers along the longest spread, palm normal the thinnest
    hp = [mw @ v.co for v in me.vertices if any(g.group == gi["RightHand"] and g.weight > 0.5 for g in v.groups)]
    tips = sorted(hp, key=lambda p: -(p - W).dot(a))[:40]
    a = ((sum(tips, V()) / len(tips)) - W).normalized()
    X = np.array([tuple(p) for p in hp]); X = X - X.mean(0); ev, evec = np.linalg.eigh(X.T @ X)
    n = V(evec[:, 0]); n = (n - a * n.dot(a)).normalized()
    if n.z < 0: n = -n   # back of the hand up (rest pose palm down)
    s = a.cross(n).normalized()
    if s.y > 0: s = -s   # s points to the thumb side (front, -Y)
    dele = []; P = {}
    for v in me.vertices:
        ws = {g.group: g.weight for g in v.groups}
        if sum(w for k, w in ws.items() if k in keep) < 0.5: dele.append(v.index); continue
        p = mw @ v.co; d = p - W
        P[v.index] = (p, d.dot(a), d.dot(n), d.dot(s), ws.get(gi["RightHand"], 0))
    # each finger is its own island past the webbing: find them, then bend each at three hinges (knuckle, middle, tip)
    H = {i for i, q in P.items() if q[4] > 0.1}
    adj = {i: set() for i in P}
    for e in me.edges:
        i, j = e.vertices
        if i in P and j in P: adj[i].add(j); adj[j].add(i)
    byp = {}
    for i in P: byp.setdefault(tuple(round(c, 4) for c in P[i][0]), []).append(i)
    for L in byp.values():
        for i in L: adj[i].update(L)
    def comps(sel):
        seen, out = set(), []
        for i in sel:
            if i in seen: continue
            st, c = [i], []; seen.add(i)
            while st:
                k = st.pop(); c.append(k)
                for j in adj[k]:
                    if j in sel and j not in seen: seen.add(j); st.append(j)
            out.append(c)
        return out
    TK = 0.32 * max(P[i][1] for i in H)
    fingers = [c for c in comps({i for i in H if P[i][1] > TK}) if len(c) > 30]
    thumbs = [c for c in comps({i for i in P if P[i][3] > 0.03 and P[i][1] > -0.03 and P[i][3] > 0.03}) if len(c) > 10]
    print(sex, "fingers", len(fingers), "thumb", [len(c) for c in thumbs])
    ANG = (72, 95, 55)   # knuckle, middle, tip flexion: a cylinder grasp around the grip, not a crushed fist
    def rot(pt, piv, ax, deg): return mu.Quaternion(ax, math.radians(deg)) @ (pt - piv) + piv
    newp = {i: P[i][0].copy() for i in P}
    hinge = V(); rings1 = []
    for c in fingers:
        pts = [P[i][0] for i in c]; cen = sum(pts, V()) / len(pts)
        X = np.array([tuple(q - cen) for q in pts]); f = V(np.linalg.eigh(X.T @ X)[1][:, 2])
        if f.dot(a) < 0: f = -f
        u = {i: (P[i][0] - cen).dot(f) for i in c}
        us = sorted(set(round(x, 3) for x in u.values())); rings = [[us[0]]]
        for x in us[1:]:
            if x - rings[-1][-1] > 0.004: rings.append([x])
            else: rings[-1].append(x)
        rc = [sum(r) / len(r) for r in rings]
        while len(rc) < 4: rc.append(rc[-1] + 0.01)
        L0 = min(u.values()); L1 = max(u.values()); FL = L1 - L0 + 0.007
        J = (L0 - 0.007, L0 - 0.007 + FL * 0.46, L0 - 0.007 + FL * 0.72)   # knuckle, middle, tip joints by real phalanx proportions (the ring scan merged on a dense mesh)
        ax = f.cross(n).normalized(); hinge += ax
        def axpt(x):   # the finger's centre line at u=x, nudged to the palm side
            near = [P[i][0] for i in c if abs(u[i] - x) < 0.006] or pts
            return sum(near, V()) / len(near) - n * 0.003
        pivs = [axpt(max(j, L0 + 0.001)) - f * max(0, L0 + 0.001 - j) for j in J]
        for k in (2, 1, 0):
            for i in c:
                if u[i] > J[k]: newp[i] = rot(newp[i], pivs[k], ax, -ANG[k])
            for k2 in range(k + 1, 3): pass
        r1 = [newp[i] for i in c if J[1] < u[i] < J[2]]; rings1.append((sum(r1, V()) / max(1, len(r1)), cen.dot(s)))
    hinge.normalize()
    # thumb: swing its tip onto the outside of the index finger's middle segment, wrapping the grip
    idx = max(rings1, key=lambda r: r[1])[0]
    for c in thumbs:
        base = [P[i][0] for i in c if P[i][3] < 0.036] or [min((P[i][0] for i in c), key=lambda q: (q - W).dot(s))]
        piv = sum(base, V()) / len(base)
        tip = max((P[i][0] for i in c), key=lambda q: (q - piv).length)
        goal = idx + s * 0.004 - n * 0.006
        Q = (tip - piv).normalized().rotation_difference((goal - piv).normalized())
        L = (tip - piv).length
        for i in c:
            wgt = min(1, max(0, (P[i][0] - piv).dot((tip - piv).normalized()) / (0.25 * L) + 0.3))
            q = mu.Quaternion().slerp(Q, wgt)
            newp[i] = q @ (newp[i] - piv) + piv
    import json
    fs = set(i for c in fingers for i in c); ts = set(i for c in thumbs for i in c)
    json.dump([[(newp[i]-W).dot(a), (newp[i]-W).dot(s), (newp[i]-W).dot(n), 1 if i in fs else 2 if i in ts else 0] for i in P if P[i][1] > -0.03], open(f"/tmp/curl-{sex}.json", "w"))
    for i in P: P[i] = (newp[i],) + P[i][1:]
    for i, q in P.items(): me.vertices[i].co = mw.inverted() @ q[0]
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in dele], context="VERTS")
    bm.to_mesh(me); bm.free()
    body.vertex_groups.clear()
    bpy.context.view_layer.objects.active = body; body.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # fist centre: the curled finger mass
    pts2 = [((q[0] - W).dot(a), (q[0] - W).dot(n)) for i, q in P.items() if q[4] > 0.3 and abs((q[0] - W).dot(s) - idx.dot(s) + W.dot(s)) < 0.03]
    best = (-1, 0, 0)
    for ti in range(-10, 50):
        for hi in range(0, 40):
            t0, h0 = ti * 0.001, -hi * 0.001
            if not (any(y > h0 and abs(x - t0) < 0.012 for x, y in pts2) and any(y < h0 and abs(x - t0) < 0.012 for x, y in pts2) and any(x > t0 and abs(y - h0) < 0.012 for x, y in pts2)): continue   # walled above, below and in front
            dmin = min(math.hypot(t0 - x, h0 - y) for x, y in pts2)
            if dmin > best[0]: best = (dmin, t0, h0)
    print(sex, "grip hole r", round(best[0], 4), "at", best[1:], "fit", round(best[0], 4))
    fist = W + a * best[1] + n * best[2] + s * (idx - W).dot(s) * 0.4   # the grip runs through the hollow of the fist
    # target frame in the viewmodel: forearm runs from the fist back toward the camera, down and out to its side
    sx = 1 if side == "R" else -1
    fore = V((0.22 * sx, -0.30, 0.93)).normalized()        # glTF, wrist -> elbow
    A = -fore                                            # hand axis: forward
    S = V((0, 1, 0)); S = (S - A * S.dot(A)).normalized()  # thumb side: up
    N = A.cross(S) * (-1 if side == "R" else 1)            # back of hand: outward (right for the right hand)
    gA, gS, gN = [g2b(*x) for x in (A, S, N)]
    src = mu.Matrix((a, s, n)).transposed(); dst = mu.Matrix((gA, gS, gN)).transposed()
    R = dst @ src.inverted()
    M = mu.Matrix.Translation(V((0, 0, 0))) @ R.to_4x4() @ mu.Matrix.Translation(-fist)
    if side == "L":   # mirror the right arm's mesh first, then lay it
        Mi = mu.Matrix.Scale(-1, 4, V((1, 0, 0)))
        fistM = Mi @ fist
        aM, sM, nM = [V((-x.x, x.y, x.z)) for x in (a, s, n)]
        src = mu.Matrix((aM, sM, nM)).transposed(); R = dst @ src.inverted()
        M = R.to_4x4() @ mu.Matrix.Translation(-fistM) @ Mi
    me.transform(M)
    if side == "L": me.flip_normals()
    for p in me.polygons: p.use_smooth = True
    body.name = f"FPArm_{side}"
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/fparm-{sex}-{side}.glb", export_apply=True, export_skins=False, export_animations=False, use_selection=False)
    print("tris", sum(len(p.vertices) - 2 for p in me.polygons))
    return body
def proof(sex):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for sd in "RL": bpy.ops.import_scene.gltf(filepath=f"{OUT}/fparm-{sex}-{sd}.glb")
    for o in bpy.data.objects:
        if o.name.startswith("FPArm_L"): o.location = g2b(-0.06, 0.0, -0.20)  # where a rifle's fore-end puts it
    bpy.ops.mesh.primitive_cube_add(size=1, location=g2b(0, 0.0, 0.0)); g = bpy.context.object; g.scale = (0.025, 0.035, 0.11)
    bpy.ops.mesh.primitive_cube_add(size=1, location=g2b(0, 0.06, -0.08)); s2 = bpy.context.object; s2.scale = (0.03, 0.16, 0.035)
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 960; sc.render.resolution_y = 540
    w = bpy.data.worlds.new("w"); w.color = (0.45, 0.42, 0.3); sc.world = w
    L = bpy.data.lights.new("l", "SUN"); L.energy = 3; lo = bpy.data.objects.new("l", L); sc.collection.objects.link(lo); lo.rotation_euler = (0.6, 0, 0.4)
    cd = bpy.data.cameras.new("c"); cd.sensor_fit = "VERTICAL"; cd.angle = math.radians(55); cd.clip_start = 0.01
    cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    for nm, eye, look in (("fp", g2b(-0.2, 0.2, 0.42), g2b(-0.2, 0.2, -1)), ("side", g2b(0.6, 0.05, -0.05), g2b(0, -0.1, 0.1))):
        cam.location = eye; cam.rotation_euler = (look - eye).to_track_quat("-Z", "Z").to_euler()
        sc.render.filepath = f"/tmp/arm/{sex}-{nm}.png"; bpy.ops.render.render(write_still=True)
for sex in ((sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []) or ["f", "m"]):
    for sd in ("R", "L"): build(sex, sd)
    proof(sex)
