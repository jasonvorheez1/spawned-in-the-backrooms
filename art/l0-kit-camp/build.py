# Level 0 wanderer's leavings kit: raw Tripo glb -> true-size, floor-origin, -Z facing glb. Run: blender -b --factory-startup --python-exit-code 1 --python art/l0-kit-camp/build.py -- [kind ...]
import bpy, sys, json, math, bmesh
from mathutils import Matrix, Vector
SRC, OUT = "/workspace/l0camp", "/workspace/l0camp/out"
# kind: src file, target glTF size [w(x), h(y), d(z)], fit: axis the uniform scale is taken from ("max" = longest), yaw deg about up, squash = allow non-uniform height
K = json.load(open(SRC + "/kit.json"))
want = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(K)
rep = {}
for kind in want:
    k = K[kind]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{k['src']}")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    # junk islands: drop loose pieces under 1.5% of the verts unless told to keep
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    seen, isl = set(), []
    for v in bm.verts:
        if v in seen: continue
        st, comp = [v], []
        seen.add(v)
        while st:
            a = st.pop(); comp.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b not in seen: seen.add(b); st.append(b)
        isl.append(comp)
    n = len(bm.verts); dead = [v for c in isl if len(c) < n * k.get("junk", 0.004) for v in c]
    bmesh.ops.delete(bm, geom=dead, context="VERTS")
    bm.to_mesh(me); bm.free()
    # orient: Tripo stands a prop at whatever tilt its concept picture had. Fit the tightest box (hull-face search), then name its
    # axes: up = the box's "min" | "mid" | "max" side (k["up"]), signed by upHint; depth signed by frontHint (raw Blender axes).
    if k.get("up"):
        import numpy as np
        from mathutils.geometry import box_fit_2d
        bm = bmesh.new(); bm.from_mesh(me)
        hull = bmesh.ops.convex_hull(bm, input=bm.verts)["geom"]
        hv = [g for g in hull if isinstance(g, bmesh.types.BMVert)]; hf = [g for g in hull if isinstance(g, bmesh.types.BMFace)]
        P = np.array([v.co[:] for v in hv]); best = None; done = set()
        for f in sorted(hf, key=lambda f: -f.calc_area())[:400]:
            nrm = f.normal.normalized(); key = tuple(round(c, 2) for c in nrm)
            if key in done or nrm.length < .5: continue
            done.add(key)
            u = nrm.orthogonal().normalized(); v = nrm.cross(u)
            q = P @ np.array([u[:], v[:], nrm[:]]).T
            ang = box_fit_2d([tuple(r) for r in q[:, :2]]); c, s_ = math.cos(ang), math.sin(ang)
            a1 = u * c - v * s_; a2 = u * s_ + v * c       # box_fit_2d: rotating by ang aligns the box
            A = np.array([a1[:], a2[:], nrm[:]]); e = (P @ A.T).max(0) - (P @ A.T).min(0)
            if best is None or e.prod() < best[0]: best = (e.prod(), A, e)
        bm.free()
        _, A, e = best; order = sorted(range(3), key=lambda j: e[j])
        iu = order[{"min": 0, "mid": 1, "max": 2}[k["up"]]]; rest = [j for j in range(3) if j != iu]
        W, H, D = k["size"]; big = max(rest, key=lambda j: e[j]); small = min(rest, key=lambda j: e[j])
        idp, iw = (big, small) if D >= W else (small, big)
        up = Vector(A[iu]); dp = Vector(A[idp])
        if up.dot(Vector(k.get("upHint", [0, 0, 1]))) < 0: up = -up
        if dp.dot(Vector(k.get("frontHint", [0, -1, 0]))) < 0: dp = -dp
        dp = -dp                                   # raw front -> Blender -Y... engine front is glTF -Z = Blender +Y; flipped below
        dp = -dp
        x = dp.cross(up) * -1                      # x = up cross? keep right-handed: X = Y x Z
        x = dp.cross(up)
        R = Matrix((x, dp, up)).to_4x4()           # rows: new X, Y, Z in raw coords
        me.transform(R)
    for ax, deg in zip("XYZ", k.get("rot", [0, 0, 0])):
        if deg: me.transform(Matrix.Rotation(math.radians(deg), 4, ax))
    def bb():
        xs = [v.co for v in me.vertices]
        lo = Vector((min(c.x for c in xs), min(c.y for c in xs), min(c.z for c in xs)))
        hi = Vector((max(c.x for c in xs), max(c.y for c in xs), max(c.z for c in xs)))
        return lo, hi
    lo, hi = bb(); sz = hi - lo
    W, H, D = k["size"]                       # glTF x, y(up), z  == Blender x, z, y
    tgt = Vector((W, D, H))
    i = {"w": 0, "d": 1, "h": 2}[k.get("fit", "h")]; s = tgt[i] / sz[i]
    sc = Vector((s, s, s))
    if k.get("squash"): sc.z = tgt.z / sz.z   # cloth only: settle the height
    me.transform(Matrix.Diagonal((sc.x, sc.y, sc.z, 1)))
    lo, hi = bb()
    me.transform(Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
    for p in me.polygons: p.use_smooth = True
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(k.get("smooth", 40)))
    except Exception as e: print("autosmooth", e)
    me.calc_loop_triangles(); tris = len(me.loop_triangles)
    if tris > 12000:
        m = ob.modifiers.new("d", "DECIMATE"); m.ratio = 11800 / tris
    lo, hi = bb(); sz = hi - lo
    ob.name = kind
    # proof
    sc_ = bpy.context.scene; sc_.render.engine = "CYCLES"; sc_.cycles.samples = 12
    sc_.render.resolution_x = sc_.render.resolution_y = 640
    w = bpy.data.worlds.new("w"); sc_.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.8, 0.78, 1)
    r = max(sz) * 1.9
    for nm, pos in (("a", (r * .7, -r * .8, r * .6)), ("b", (-r * .7, r * .8, r * .6))):
        cam = bpy.data.cameras.new(nm); co = bpy.data.objects.new(nm, cam); sc_.collection.objects.link(co)
        co.location = pos; ctr = Vector((0, 0, sz.z / 2))
        co.rotation_euler = (ctr - Vector(pos)).to_track_quat("-Z", "Y").to_euler(); cam.clip_start = 0.01
        sc_.camera = co; sc_.render.filepath = f"{OUT}/proof/{kind}_{nm}.png"; bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}.glb", export_apply=True, use_selection=True, export_image_format="JPEG", export_jpeg_quality=85)
    rep[kind] = {"size": [round(sz.x, 3), round(sz.z, 3), round(sz.y, 3)], "tris": min(tris, 11800), "islands": len(isl), "dropped": len(dead)}
    print("REPORT", kind, json.dumps(rep[kind]))
