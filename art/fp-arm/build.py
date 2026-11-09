# First-person arms cut from Shelly's human bodies (art/human-base exports): right arm (shoulder off) with the
# fingers curled into a grip and the thumb folded over, laid in the viewmodel's frame (glTF: x right, y up, -z forward),
# its fist centred on the grip at the origin. A mirrored left arm for two-handed weapons. Static meshes: no skin, no IK.
import bpy, sys, math, mathutils as mu, os
V = mu.Vector
SRC = {"f": "/workspace/arm/f.glb", "m": "/workspace/arm/m.glb"}
OUT = "/workspace/arm/out"; os.makedirs(OUT, exist_ok=True)
R_CURL = 0.019   # finger curl radius: a fist around a ~3 cm grip
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
    gi = {g.name: g.index for g in body.vertex_groups}
    keep = {gi["RightArm"], gi["RightForeArm"], gi["RightHand"]}
    body = bpy.data.objects["Body"]; me = body.data
    body.modifiers.clear()
    mw = body.matrix_world.copy()
    W, T = B["RightHand"]; a = (T - W).normalized()
    n = (V((0, 0, 1)) - a * a.z).normalized(); s = a.cross(n).normalized()
    if s.y > 0: s = -s   # s points to the thumb side (front, -Y)
    dele = []; P = {}
    for v in me.vertices:
        ws = {g.group: g.weight for g in v.groups}
        if sum(w for k, w in ws.items() if k in keep) < 0.5: dele.append(v.index); continue
        p = mw @ v.co; d = p - W
        P[v.index] = (p, d.dot(a), d.dot(n), d.dot(s), ws.get(gi["RightHand"], 0))
    hand = [q for q in P.values() if q[4] > 0.3 and q[1] > -0.01]
    Tmax = max(q[1] for q in hand)
    wrist_half = max(abs(q[3]) for q in hand if 0.0 < q[1] < 0.15 * Tmax)
    k = 0.5 * Tmax
    print(sex, "hand len", round(Tmax, 3), "wrist half", round(wrist_half, 3))
    for i, (p, t, h, l, hw) in P.items():
        thumb = l > wrist_half * 1.15 and 0.12 * Tmax < t < k + 0.03 and hw > 0.3
        if thumb:   # fold the thumb down over the fingers: about the hand axis, then toward the knuckles
            piv = W + s * wrist_half
            q = mu.Quaternion(a, math.radians(-70)) @ (p - piv) + piv
            q = mu.Quaternion(n, math.radians(-25)) @ (q - piv) + piv
            P[i] = (q,) + P[i][1:]
        elif t > k and hw > 0.3:   # bend the fingers around a cylinder under the palm
            u = t - k; th = min(u / R_CURL, math.radians(235)); rho = R_CURL + h
            nt = k + rho * math.sin(th); nh = -R_CURL + rho * math.cos(th)
            P[i] = (W + a * nt + n * nh + s * l,) + P[i][1:]
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
    fist = W + a * (k + 0.004) - n * R_CURL
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
for sex in ("f", "m"):
    for sd in ("R", "L"): build(sex, sd)
    proof(sex)
