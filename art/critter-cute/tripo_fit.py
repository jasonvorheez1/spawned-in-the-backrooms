# ---- tripo fit (included by heads4.py, runs in build.py's namespace) ----
from mathutils.bvhtree import BVHTree
TRIPO_PATH = os.environ.get("TRIPO", "/workspace/tripo-cat/cat-head.glb")
_TRI = {}
def _tripo_load():
    if _TRI: return _TRI
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=TRIPO_PATH)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in new:
        if o.type != "MESH": o.select_set(False)
    sel(*meshes, active=meshes[0])
    if len(meshes) > 1: bpy.ops.object.join()
    t = bpy.context.view_layer.objects.active
    import mathutils
    R = mathutils.Matrix.Rotation(math.radians(float(os.environ.get("TRIPO_YAW", "90"))), 4, "Z")
    W = R @ t.matrix_world                                    # its import transform (Tripo ships at 0.213 scale) baked into the points by hand
    for v in t.data.vertices: v.co = W @ v.co
    t.parent = None; t.matrix_world = mathutils.Matrix.Identity(4)
    for o in new:
        if o is not t and o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
    vs = [v.co.copy() for v in t.data.vertices]
    zmin = min(v.z for v in vs); zmax = max(v.z for v in vs)
    band = [v for v in vs if v.z < zmin + .55 * (zmax - zmin)]          # below the ears: the skull and cheeks
    w = max(v.x for v in band) - min(v.x for v in band)
    cx = (max(v.x for v in band) + min(v.x for v in band)) / 2; cy = (max(v.y for v in band) + min(v.y for v in band)) / 2
    # the procedural head's own width and chin, so the face lands where it was designed
    pts = [head_pt(head_dir(u * math.pi / 18, v * math.pi / 18), 0) for u in range(-18, 19) for v in range(-8, 9)]
    pw = max(p.x for p in pts) - min(p.x for p in pts); pz = min(p.z for p in pts)
    k = pw / w * float(os.environ.get("TRIPO_K", "1.0"))
    for v in t.data.vertices:
        c = v.co; v.co = Vector(((c.x - cx) * k, (c.y - cy) * k + float(os.environ.get("TRIPO_DY", "0")), (c.z - zmin) * k + pz))
    t.data.update(); bpy.context.view_layer.update()
    # Tripo modelled a raised paw over the right cheek: every island but the head goes, and what still bulges low-front-right over our mouth goes too
    if os.environ.get("TRIPO_PAWCUT", "0") != "1": bm = None
    else: bm = bmesh.new()
    if bm: bm.from_mesh(t.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.faces.ensure_lookup_table()
    if bm:
        seen = set(); isl = []
        for f0 in bm.faces:
            if f0.index in seen: continue
            st = [f0]; grp = []; seen.add(f0.index)
            while st:
                f = st.pop(); grp.append(f)
                for e in f.edges:
                    for g in e.link_faces:
                        if g.index not in seen: seen.add(g.index); st.append(g)
            isl.append(grp)
        isl.sort(key=len, reverse=True)
        for g in isl[:6]:
            cs = [f.calc_center_median() for f in g]
            log("tripo island", len(g), "x", round(min(c.x for c in cs), 3), round(max(c.x for c in cs), 3), "y", round(min(c.y for c in cs), 3), round(max(c.y for c in cs), 3), "z", round(min(c.z for c in cs), 3), round(max(c.z for c in cs), 3))
        kill = [f for g in isl[1:] for f in g if len(g) < .2 * len(isl[0])]
        if os.environ.get("TRIPO_PAWCUT", "1") == "1":
            zc = min(v.co.z for v in bm.verts); zt = max(v.co.z for v in bm.verts); hz = zt - zc
            kill += [f for f in isl[0] if (lambda c: c.x > .035 and c.z < zc + .26 * hz and c.y < -.12)(f.calc_center_median())]
        log("tripo cut faces", len(kill), "islands", len(isl))
        bmesh.ops.delete(bm, geom=list(set(kill)), context="FACES"); bm.to_mesh(t.data); bm.free(); t.data.update()
    t.name = "TripoHead"
    # Tripo baked its own nose and muzzle into the texture: below the ears the head wears one flat fur colour so only our face shows
    try:
        import numpy as np
        m = t.data.materials[0]; nt = m.node_tree; N = nt.nodes
        bsdf = next(n for n in N if n.type == "BSDF_PRINCIPLED")
        img_n = next(n for n in N if n.type == "TEX_IMAGE")
        px = np.empty(len(img_n.image.pixels), np.float32); img_n.image.pixels.foreach_get(px); px = px.reshape(-1, 4)[:, :3]
        sat = px.max(1) - px.min(1); fur = np.median(px[sat > .25], axis=0)
        lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in fur]
        tc = N.new("ShaderNodeTexCoord"); sx = N.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sx.inputs[0])
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"; thr = float(os.environ.get("TRIPO_EARZ", "1.45"))
        mr.inputs["From Min"].default_value = thr - .03; mr.inputs["From Max"].default_value = thr + .03
        mr.inputs["To Min"].default_value = 1; mr.inputs["To Max"].default_value = 0
        nt.links.new(sx.outputs["Z"], mr.inputs["Value"])
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
        nt.links.new(mr.outputs["Result"], mx.inputs["Factor"])
        nt.links.new(img_n.outputs["Color"], mx.inputs["A"] if "A" in mx.inputs else mx.inputs[6])
        mx.inputs[7].default_value = (*lin, 1)
        nt.links.new(mx.outputs[2], bsdf.inputs["Base Color"])
        fm = bpy.data.materials.new("tripo_fur"); fm.use_nodes = True
        fb = next(n for n in fm.node_tree.nodes if n.type == "BSDF_PRINCIPLED"); fb.inputs["Base Color"].default_value = (*lin, 1); fb.inputs["Roughness"].default_value = .8
        t.data.materials.append(fm); fi = len(t.data.materials) - 1; nfur = 0
        for pg in t.data.polygons:
            c = pg.center
            if c.z < thr and not (abs(c.x) > .2 and c.z > thr - .08): pg.material_index = fi; nfur += 1
        log("tripo fur", [round(float(c), 3) for c in fur], "faces", nfur, "of", len(t.data.polygons), "slots", len(t.data.materials))
    except Exception as e: log("tripo fur err", repr(e))
    bm = bmesh.new(); bm.from_mesh(t.data); bm.transform(t.matrix_world)
    _TRI["bvh"] = BVHTree.FromBMesh(bm); bm.free(); _TRI["obj"] = t
    log("tripo head fitted: scale", round(k, 3), "height", round((zmax - zmin) * k, 3))
    return _TRI
_head_r_proc = head_r
def head_r(d):
    if not _TRI: return _head_r_proc(d)
    d = d.normalized()
    # the sculpt's skin, averaged over a small cone so the face lies smooth over its bumps and fluff
    t1 = d.orthogonal().normalized(); t2 = d.cross(t1); acc = []; R = float(os.environ.get("TRIPO_BLUR", ".09"))
    for (a, b) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (.7, .7), (-.7, .7), (.7, -.7), (-.7, -.7)):
        dd = (d + t1 * a * R + t2 * b * R).normalized()
        hit = _TRI["bvh"].ray_cast(HC + dd * 1.5, -dd, 3.0)
        if hit[0] is not None: acc.append((hit[0] - HC).length)
    return sum(acc) / len(acc) if acc else _head_r_proc(d)
_build_head_proc = build_head
def build_head(name, sp, rig, F):
    global CUR_SP
    CUR_SP = sp
    _tripo_load()
    o = _build_head_proc(name, sp, rig, F)
    for m in o.data.materials:                                     # the procedural skin goes; the Tripo skin is the head
        if m and m.name.endswith(("_fur",)):
            m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
            out = nt.nodes.new("ShaderNodeOutputMaterial"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); nt.links.new(tr.outputs[0], out.inputs[0])
            m.blend_method = "HASHED" if hasattr(m, "blend_method") else None
    import mathutils
    t = _TRI["obj"]; t.parent = o; t.matrix_parent_inverse = mathutils.Matrix.Identity(4); t.location = (0, 0, 0); t.rotation_euler = (0, 0, 0); t.scale = (1, 1, 1)
    try:
        bb = [t.matrix_world @ Vector(c) for c in t.bound_box]
        log("TRIPO DBG in scene", t.name in bpy.context.scene.objects, "hide", t.hide_render, "faces", len(t.data.polygons), "z", round(min(p.z for p in bb), 3), round(max(p.z for p in bb), 3), "y", round(min(p.y for p in bb), 3), round(max(p.y for p in bb), 3), "mats", [m.name for m in t.data.materials if m], "HC", tuple(round(x, 3) for x in HC))
    except Exception as e: log("TRIPO DBG err", repr(e))
    log("tripo parented to", o.name, "head at", tuple(round(x, 3) for x in o.matrix_world.translation))
    return o
build_ear = lambda *a, **k: None                                   # Tripo's ears stand in
build_tufts = lambda *a, **k: None

def _tripo_show(scene, *a):
    t = _TRI.get("obj")
    if t and t.name in bpy.data.objects: t.hide_render = False
bpy.app.handlers.render_pre.append(_tripo_show)
