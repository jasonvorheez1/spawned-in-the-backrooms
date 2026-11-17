# Level 325 street + site kit: raw Tripo GLBs -> game GLBs.
# blender -b --factory-startup --python-exit-code 1 --python art/l325-street/build.py -- [keys...]
# Blender frame: +Z up, front faces -Y (glTF +Z), origin bottom centre, metres.
import bpy, bmesh, sys, os, json, math
from mathutils import Vector, Matrix
RAW = "/workspace/l325-street/raw"; OUT = "/workspace/l325-street/out"; PROOF = "/tmp/l325proof"
os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
DUST = (0.72, 0.69, 0.63, 1)

# rot: degrees about Z turning the raw file to face -Y. fit: {"axis": metres} uniform, or size (x,y,z) exact.
CFG = {
 "streetlight": dict(rot=90, fit={"z": 8.0}, slot="steel", tris=6000, dust=0.45),
 "roadsign": dict(rot=-90, fit={"z": 3.0}, slot="paint", tris=6000, dust=0.45),
 "sedan": dict(rot=-90, fit={"y": 4.6}, slot="paint", tris=12000, dust=0.75),
 "hatch": dict(rot=0, fit={"y": 3.9}, slot="paint", tris=12000, dust=0.75),
 "icecream_van": dict(rot=90, fit={"y": 5.2}, slot="paint", tris=12000, dust=0.6),
 "barrier": dict(rot=90, fit={"x": 2.0}, slot="paint", tris=6000, dust=0.6),
 "hoarding": dict(rot=90, size=(2.4, 0.7, 2.4), slot="steel", tris=6000, dust=0.5),
 "container": dict(rot=0, size=(6.0, 2.4, 2.6), slot="steel", tris=6000, dust=0.6),
 "gangbox": dict(rot=-90, fit={"x": 1.2}, slot="steel", tris=6000, dust=0.6),
 "skip": dict(rot=0, size=(3.6, 1.9, 1.5), slot="steel", tris=6000, dust=0.7),
 "polestack": dict(rot=90, size=(6.0, 1.1, 0.75), slot="bamboo", tris=6000, dust=0.55),
 "cementpallet": dict(rot=0, fit={"x": 1.2}, slot="plank", tris=6000, dust=0.6),
 "ladder": dict(rot=-90, size=(0.9, 1.7, 2.4), slot="steel", tris=6000, dust=0.5),
 "busstop": dict(rot=-90, fit={"x": 3.6}, slot="steel", tris=5900, dust=0.5),
 "cone": dict(rot=0, fit={"z": 0.7}, slot="rubber", tris=6000, dust=0.7),
 "sitelamp": dict(rot=0, fit={"z": 1.8}, slot="steel", tris=6000, dust=0.5),
 "theodolite": dict(rot=0, fit={"z": 1.5}, slot="plank", tris=6000, dust=0.4),
 "helmet": dict(rot=-90, fit={"y": 0.28}, slot="paint", tris=6000, dust=0.7),
 "dustmask": dict(rot=-90, fit={"z": 0.2}, slot="rubber", tris=6000, dust=0.5),
 "workboots": dict(rot=-90, fit={"y": 0.3}, slot="rubber", tris=6000, dust=0.7),
}
ov = "/workspace/l325-street/overrides.json"   # per-key tweaks found at the proof (kept beside the raws)
if os.path.exists(ov):
    for k, v in json.load(open(ov)).items(): CFG[k].update(v)

def bbox(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx
def tris_of(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def only(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o

def load(key):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{RAW}/{key}.glb", merge_vertices=True)
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    only(ms[0]); [m.select_set(True) for m in ms]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.parent = None if o.parent is None else o.parent
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for x in list(bpy.context.scene.objects):
        if x != o: bpy.data.objects.remove(x)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.name = key; o.data.name = key
    return o

def normalise(o, c):
    o.data.transform(Matrix.Rotation(math.radians(c["rot"]), 4, "Z"))
    mn, mx = bbox([o]); s = mx - mn
    if "size" in c: sc = Vector([c["size"][i] / s[i] for i in range(3)])
    else:
        ax, val = next(iter(c["fit"].items())); f = val / s["xyz".index(ax)]; sc = Vector((f, f, f))
    o.data.transform(Matrix.Diagonal((*sc, 1)))
    mn, mx = bbox([o])
    o.data.transform(Matrix.Translation((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)))
    o.data.update()

def lighten(o, limit):
    n = tris_of(o)
    if n > limit:
        only(o); m = o.modifiers.new("d", "DECIMATE"); m.ratio = limit / n * 0.985
        bpy.ops.object.modifier_apply(modifier="d")
    for p in o.data.polygons: p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(42))

def bake_dust(o, key, c):
    """One pass on the piece's own UVs: the Tripo colour under pale site dust that lies on what faces the sky."""
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 1; sc.cycles.device = "CPU"
    mat = o.data.materials[0]; nt = mat.node_tree
    tex = {}
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for sock in ("Base Color", "Normal", "Roughness", "Metallic"):
        l = bsdf.inputs[sock].links
        if l: tex[sock] = l[0].from_node
    col = next(n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Color"))
    others = [n.image for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and n != col]
    N = nt.nodes; L = nt.links
    geo = N.new("ShaderNodeNewGeometry"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Normal"], sep.inputs[0])
    up = N.new("ShaderNodeMapRange"); up.inputs[1].default_value = -0.1; up.inputs[2].default_value = 0.85; L.new(sep.outputs["Z"], up.inputs[0])
    mn, mx = bbox([o]); span = max(mx - mn)
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 9 / span; nz.inputs["Detail"].default_value = 6; L.new(tc.outputs["Object"], nz.inputs["Vector"])
    nz2 = N.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 60 / span; nz2.inputs["Detail"].default_value = 3; L.new(tc.outputs["Object"], nz2.inputs["Vector"])
    def math_(op, a, b):
        m = N.new("ShaderNodeMath"); m.operation = op; m.use_clamp = True
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: L.new(v, m.inputs[i])
        return m.outputs[0]
    d = c["dust"]
    lay = math_("MULTIPLY", up.outputs[0], math_("ADD", math_("MULTIPLY", nz.outputs["Fac"], 0.9), 0.25))   # settled on top
    film = math_("ADD", math_("MULTIPLY", nz.outputs["Fac"], 0.22), math_("MULTIPLY", nz2.outputs["Fac"], 0.12))  # film everywhere
    fac = math_("MULTIPLY", math_("ADD", lay, film), d * 1.25)
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; L.new(fac, mix.inputs[0]); L.new(col.outputs[0], mix.inputs[6]); mix.inputs[7].default_value = DUST
    em = N.new("ShaderNodeEmission"); L.new(mix.outputs[2], em.inputs[0])
    out = next(n for n in N if n.type == "OUTPUT_MATERIAL"); L.new(em.outputs[0], out.inputs[0])
    img = bpy.data.images.new(f"dust_{key}", 1024, 1024); tgt = N.new("ShaderNodeTexImage"); tgt.image = img
    for n in N: n.select = False
    tgt.select = True; N.active = tgt
    only(o); sc.render.bake.margin = 8
    bpy.ops.object.bake(type="EMIT")
    img.filepath_raw = f"/tmp/l325proof/dust_{key}.png"; img.file_format = "PNG"; img.save(); img.pack()
    for im in others: im.scale(1024, 1024)
    # final material: baked colour, Tripo normal + ORM kept, rougher under the dust
    L.new(bsdf.outputs[0], out.inputs[0])
    for l in list(bsdf.inputs["Base Color"].links): L.remove(l)
    L.new(tgt.outputs[0], bsdf.inputs["Base Color"])
    col.image = img
    mat.name = c["slot"]
    return mat

def slot(o, base, name, pred, emission=None, alpha=None):
    """Faces the predicate picks (centre, normal) move to their own named slot on the same baked picture."""
    m = base.copy(); m.name = name; o.data.materials.append(m); idx = len(o.data.materials) - 1
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    if emission: b.inputs["Emission Color"].default_value = (*emission, 1); b.inputs["Emission Strength"].default_value = 1.0
    if alpha is not None: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND"
    n = 0
    for p in o.data.polygons:
        if pred(p.center, p.normal): p.material_index = idx; n += 1
    print("SLOT", o.name, name, n)
    return m

def cut_part(o, name, lo, hi, hinge, pred=None):
    """Cut the faces inside the box [lo, hi] free along clean plane lines and hang them as their own node at the hinge."""
    lo, hi = Vector(lo), Vector(hi); pred = pred or (lambda c, n: True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    def near(f, m=0.25):
        c = f.calc_center_median()
        return all(lo[i] - m <= c[i] <= hi[i] + m for i in range(3)) and pred(c, f.normal)
    for i in range(3):
        for v in (lo[i], hi[i]):
            if abs(v) > 50: continue
            fs = [f for f in bm.faces if near(f)]
            geom = list({e for f in fs for e in f.edges}) + list({v2 for f in fs for v2 in f.verts}) + fs
            no = Vector((0, 0, 0)); no[i] = 1; co = Vector((0, 0, 0)); co[i] = v
            bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=co, plane_no=no)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    sel = [f for f in bm.faces if near(f, -1e-4)]
    for f in bm.faces: f.select = f in set(sel)
    bm.to_mesh(o.data); bm.free(); o.data.update()
    only(o); bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
    part = next(x for x in bpy.context.selected_objects if x != o)
    part.name = name; part.data.name = name
    part.data.transform(Matrix.Translation(-Vector(hinge))); part.location = Vector(hinge)
    part.parent = o
    print("PART", o.name, name, "tris", tris_of(part), "hinge", [round(v, 3) for v in hinge])
    return part

def pane(o, base, name, corners):
    """A flat sheet of glass set into a frame the generator left open."""
    me = bpy.data.meshes.new(name); me.from_pydata([Vector(c) for c in corners], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(); w = (Vector(corners[1]) - Vector(corners[0])).length; h = (Vector(corners[2]) - Vector(corners[1])).length
    for l, c in zip(uv.data, ((0, 0), (w, 0), (w, h), (0, h))): l.uv = c
    return me

def extras(key, o, mat):
    parts = []
    mn, mx = bbox([o]); W, D, H = mx - mn; hw, hd = W / 2, D / 2
    X = CFG[key].get("x", {})
    if key == "streetlight":
        slot(o, mat, "lamp", lambda c, n: c.z > X.get("z", 0.8) * H and abs(c.x) > X.get("ax", 0.55) * hw and n.z < -0.4, emission=(1.0, 0.86, 0.6))
    if key == "sitelamp":
        slot(o, mat, "lamp", lambda c, n: c.z > X.get("z", 0.62) * H and n.y < -0.75, emission=(1.0, 0.9, 0.7))
    if key in ("sedan", "hatch"):
        y0, y1, z0 = X["y0"] * D, X["y1"] * D, X["z0"] * H
        parts.append(cut_part(o, "door_fl", (0.45 * hw, y0, z0), (99, y1, 99), (X.get("hx", 0.97) * hw, y0, z0),
                              lambda c, n: n.x > 0.12 or c.x > 0.93 * hw))
    if key == "icecream_van" and "door" in X:
        d = X["door"]; parts.append(cut_part(o, "door_rear", d["lo"], d["hi"], d["hinge"]))
        if d.get("close"): parts[-1].data.transform(Matrix.Rotation(math.radians(d["close"]), 4, "Z"))
    if key == "container" and "door" in X:
        d = X["door"]; parts.append(cut_part(o, "door", d["lo"], d["hi"], d["hinge"], lambda c, n: n.y < -0.3))
    if key == "gangbox":
        zs = X.get("seam", 0.78) * H
        parts.append(cut_part(o, "lid", (-99, -99, zs), (99, 99, 99), (0, hd * X.get("hy", 0.95), zs)))
    if key == "busstop" and "panes" in X:
        import numpy as np
        g = base_glass(mat)
        me = bpy.data.meshes.new("glass"); vs = []; fs = []; uvs = []
        for q in X["panes"]:
            i = len(vs); vs += [Vector(p) for p in q]; fs.append((i, i + 1, i + 2, i + 3))
        me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
        for p in me.polygons:
            a, b, c2, d2 = [me.vertices[i].co for i in p.vertices]; w = (b - a).length; h = (c2 - b).length
            for li, c in zip(p.loop_indices, ((0, 0), (w, 0), (w, h), (0, h))): uv.data[li].uv = (c[0] * 0.5, c[1] * 0.5)
        me.materials.append(g)
        go = bpy.data.objects.new("glass", me); bpy.context.scene.collection.objects.link(go)
        only(o); go.select_set(True); bpy.ops.object.join()
    return parts

def base_glass(mat):
    """Dusty pane: its own small picture (pale film, wiped streaks), see-through."""
    import numpy as np
    n = 256; rng = np.random.default_rng(325)
    a = np.zeros((n, n, 4), np.float32); a[..., 0] = 0.70; a[..., 1] = 0.74; a[..., 2] = 0.72
    yy, xx = np.mgrid[0:n, 0:n] / n
    film = 0.30 + 0.25 * (1 - yy) + 0.08 * rng.random((n, n)) + 0.10 * np.sin(xx * 40 + np.sin(yy * 9) * 3) * (yy < 0.5)
    a[..., 3] = np.clip(film, 0.15, 0.8)
    img = bpy.data.images.new("glass_dust", n, n, alpha=True); img.pixels.foreach_set(a.ravel()); img.pack()
    g = bpy.data.materials.new("glass"); g.use_nodes = True; nt = g.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    nt.links.new(t.outputs[0], b.inputs["Base Color"]); nt.links.new(t.outputs[1], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.25; g.blend_method = "BLEND"
    return g

def proof(key, o, parts):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 480
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.82, 0.85, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    mn, mx = bbox([o] + parts); c = (mn + mx) / 2; r = (mx - mn).length
    # the 1.2 m player stands beside it (never exported)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=1.2, location=(mx.x + 0.45, mn.y, 0.6)); ref = bpy.context.object; ref.name = "ref12"
    rm = bpy.data.materials.new("ref"); rm.diffuse_color = (0.9, 0.2, 0.5, 1); rm.use_nodes = True; rm.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (0.9, 0.2, 0.5, 1); ref.data.materials.append(rm)
    opened = []
    views = [("a", (0.75, -1, 0.5)), ("b", (-0.6, 1, 0.45)), ("c", (0, -0.02, 1))]
    if parts: views.append(("d", (1, -0.35, 0.3)))
    for nm, d in views:
        if nm == "d":   # the swing, seen
            for p in parts:
                ax = "X" if p.name == "lid" else "Z"; ang = CFG[key].get("x", {}).get("open", {"lid": 55, "door_fl": -55, "door": -70, "door_rear": 70}[p.name])
                p.rotation_euler = (math.radians(ang), 0, 0) if ax == "X" else (0, 0, math.radians(ang))
        d = Vector(d).normalized()
        cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam)
        cam.location = c + d * r * 1.35; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
        sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sun.data.energy = 2.5; sc.collection.objects.link(sun)
        sun.rotation_euler = (-(d + Vector((0.2, 0, 0.5)))).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{key}_{nm}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
    for p in parts: p.rotation_euler = (0, 0, 0)
    bpy.data.objects.remove(ref)

def audit(key, parts):
    path = f"{OUT}/{key}.glb"
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=path)
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    mn, mx = bbox(ms); s = mx - mn
    row = {"tris": sum(tris_of(o) for o in ms), "size": [round(s.x, 2), round(s.z, 2), round(s.y, 2)],   # glTF x, y(up), z
           "min_y": round(mn.z, 3), "centre": [round((mn.x + mx.x) / 2, 3), round((mn.y + mx.y) / 2, 3)],
           "nodes": sorted(o.name for o in ms), "slots": sorted({m.name for o in ms for m in o.data.materials}),
           "images": sorted(i.name for i in bpy.data.images if i.size[0]), "bytes": os.path.getsize(path)}
    if parts: row["parts"] = parts; row["hinges"] = {o.name: [round(v, 3) for v in (o.matrix_world.translation.x, o.matrix_world.translation.z, -o.matrix_world.translation.y)] for o in ms if o.name in parts}
    return row

keys = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
keys = keys or list(CFG)
stats_path = f"{OUT}/stats.json"; stats = json.load(open(stats_path)) if os.path.exists(stats_path) else {}
for key in keys:
    c = CFG[key]; o = load(key); normalise(o, c); lighten(o, c["tris"] - c.get("reserve", 0))
    mat = bake_dust(o, key, c); parts = extras(key, o, mat)
    proof(key, o, parts)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); [p.select_set(True) for p in parts]
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{key}.glb", use_selection=True, export_apply=True, export_yup=True, export_image_format="JPEG", export_jpeg_quality=88)
    stats[key] = audit(key, [p.name for p in parts]); print("AUDIT", key, json.dumps(stats[key]))
    json.dump(stats, open(stats_path, "w"), indent=1)
