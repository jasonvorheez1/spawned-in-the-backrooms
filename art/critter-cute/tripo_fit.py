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
    t.parent = None
    t.rotation_mode = "XYZ"
    # Tripo faces +X (the picture's front); this build's face looks down +Y
    import mathutils
    M = mathutils.Matrix.Rotation(math.radians(float(os.environ.get("TRIPO_YAW", "90"))), 4, "Z") @ t.matrix_world
    t.matrix_world = M
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
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
    t.data.update()
    t.name = "TripoHead"
    bm = bmesh.new(); bm.from_mesh(t.data); bm.transform(t.matrix_world)
    _TRI["bvh"] = BVHTree.FromBMesh(bm); bm.free(); _TRI["obj"] = t
    log("tripo head fitted: scale", round(k, 3), "height", round((zmax - zmin) * k, 3))
    return _TRI
_head_r_proc = head_r
def head_r(d):
    if not _TRI: return _head_r_proc(d)
    d = d.normalized()
    hit = _TRI["bvh"].ray_cast(HC + d * 1.5, -d, 3.0)              # from outside in: the outermost skin along d
    return (hit[0] - HC).length if hit[0] is not None else _head_r_proc(d)
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
    t = _TRI["obj"]; t.parent = o.parent; t.matrix_parent_inverse = o.matrix_world.inverted() if o.parent else t.matrix_parent_inverse
    return o
build_ear = lambda *a, **k: None                                   # Tripo's ears stand in
build_tufts = lambda *a, **k: None
