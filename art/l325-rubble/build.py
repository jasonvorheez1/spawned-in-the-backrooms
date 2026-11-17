# Level 325 rubble kit. Sources: Tripo P2 meshes in /workspace/l325-rubble/src (slab, column, beam, corner, stair, bamboo, heap).
# One pass: import -> weld -> size -> slot faces by painted colour -> LODs -> chunks + heaps -> proofs -> glb + manifest.
# Run: blender -b --factory-startup --python-exit-code 1 --python art/l325-rubble/build.py
import bpy, bmesh, json, math, os, random
import numpy as np
from mathutils import Matrix, Vector

SRC = "/workspace/l325-rubble/src"; OUT = "/workspace/l325-rubble/out"; PROOF = "/tmp/l325-rubble"
os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
SLOTS = ["concrete", "rebar", "steel", "bamboo", "net", "lashing", "dust"]
ROUGH = {"concrete": .92, "rebar": .7, "steel": .55, "bamboo": .6, "net": .85, "lashing": .5, "dust": 1.0}
# source -> (blender dims x,y,z in metres at chunk size, allowed slots)
SPEC = {
    "slab":   ((4.0, 3.4, 0.42), {"concrete", "rebar"}),
    "column": ((3.3, 0.95, 0.85), {"concrete", "rebar"}),
    "beam":   ((4.2, 1.45, 2.0), {"steel", "concrete"}),
    "corner": ((1.05, 2.4, 2.15), {"concrete", "rebar"}),
    "stair":  ((2.1, 2.6, 2.1), {"concrete", "rebar"}),
    "bamboo": ((1.9, 2.95, 3.6), set(SLOTS) - {"dust", "steel"}),
    "heap":   (None, set(SLOTS) - {"dust", "steel", "lashing"}),
}
CHUNKS = {"chunk_slab": "slab", "chunk_column": "column", "chunk_beam": "beam", "chunk_corner": "corner", "chunk_stair": "stair", "chunk_bamboo": "bamboo"}
TILE = {"slab": (0, .5, .5, .5), "heap": (.5, .5, .5, .5), "column": (0, 0, 1/3, .5), "bamboo": (1/3, 0, 1/3, .5), "beam": (2/3, 0, 1/3, .5)}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def active(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o

def px(img, n):
    img.scale(n, n); a = np.empty(n * n * 4, np.float32); img.pixels.foreach_get(a); return a.reshape(n, n, 4)

def mkimg(name, arr, color):
    h, w = arr.shape[:2]; im = bpy.data.images.new(name, w, h, alpha=False)
    im.colorspace_settings.name = "sRGB" if color else "Non-Color"
    im.pixels.foreach_set(arr.ravel()); im.file_format = "JPEG"; im.pack(); return im

def mkmat(name, slot, col, nrm):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = col; nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = nrm; nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = ROUGH[slot]; b.inputs["Metallic"].default_value = 0; m["slot"] = slot; return m

def bbox(o):
    c = np.array([v.co[:] for v in o.data.vertices]); return c.min(0), c.max(0)

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

def classify(name, col):
    r, g, b = col[:, 0], col[:, 1], col[:, 2]; mx = col.max(1); mn = col.min(1); sat = (mx - mn) / (mx + 1e-6)
    out = np.zeros(len(col), int); allow = SPEC[name][1]
    rust = (r > g * 1.22) & (r > b * 1.4) & (sat > .3)
    green = (g > r * 1.12) & (g > b * 1.12) & (sat > .2)
    tan = (r >= g * .98) & (r < g * 1.25) & (g > b * 1.15) & (sat > .22) & (mx > .35)
    if name == "beam":
        out[:] = SLOTS.index("steel"); out[(sat < .12) & (mx > .5)] = 0; return out
    if "bamboo" in allow: out[tan] = SLOTS.index("bamboo")
    if "lashing" in allow: out[mx < .16] = SLOTS.index("lashing")
    if "rebar" in allow: out[rust] = SLOTS.index("rebar")
    if "net" in allow: out[green] = SLOTS.index("net")
    return out

SRCS, PIX = {}, {}
def load(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    new = [o for o in bpy.data.objects if o not in before]; ms = [o for o in new if o.type == "MESH"]
    active(ms[0]); [o.select_set(True) for o in ms]; bpy.ops.object.join(); o = ms[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM"); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for x in new:
        if x != o: bpy.data.objects.remove(x)
    nt = o.data.materials[0].node_tree; bsdf = nt.nodes["Principled BSDF"]
    cimg = bsdf.inputs["Base Color"].links[0].from_node.image
    nimg = next(n.image for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and "ormal" in n.image.name)
    C = px(cimg, 2048)[:, :, :3].copy(); N = px(nimg, 2048)[:, :, :3].copy(); PIX[name] = (C, N)
    me = o.data
    if "custom_normal" in me.attributes: me.attributes.remove(me.attributes["custom_normal"])
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    if name == "heap":  # Tripo stood it on a display plate: cut the plate away
        zs = [v.co.z for v in bm.verts]; zl, zh = min(zs), max(zs); hist = {}
        for f in bm.faces:  # the plate top is the widest level sheet in the lower third
            c = f.calc_center_median().z
            if f.normal.z > .95 and c < zl + .33 * (zh - zl): k = round((c - zl) / (zh - zl) * 100); hist[k] = hist.get(k, 0) + f.calc_area()
        z0 = zl + (max(hist, key=hist.get) + 2.5) / 100 * (zh - zl) if hist else zl; print("PLATE", sorted(hist.items(), key=lambda kv: -kv[1])[:4])
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z0), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(me); bm.free()
    lo, hi = bbox(o); ctr = (lo + hi) / 2; d = hi - lo
    want = SPEC[name][0] or (d * (8.0 / d[0]))
    me.transform(Matrix.Diagonal((*[want[i] / d[i] for i in range(3)], 1)) @ Matrix.Translation(-Vector(ctr)))
    # slot each face by the colour painted on it
    uv = me.uv_layers.active.data; cols = np.zeros((len(me.polygons), 3))
    for p in me.polygons:
        us = np.array([uv[l].uv[:] for l in p.loop_indices]); c = us.mean(0); pts = np.vstack([c[None], (us + c) / 2])
        ix = np.clip((pts[:, 0] % 1 * 2048).astype(int), 0, 2047); iy = np.clip((pts[:, 1] % 1 * 2048).astype(int), 0, 2047)
        cols[p.index] = C[iy, ix].mean(0)
    cls = classify(name, cols)
    me.materials.clear()
    ci = mkimg(f"{name}_col", np.dstack([C[::2, ::2], np.ones((1024, 1024, 1), np.float32)]), True)
    ni = mkimg(f"{name}_nrm", np.dstack([N[::2, ::2], np.ones((1024, 1024, 1), np.float32)]), False)
    for s in SLOTS: me.materials.append(mkmat(f"{name}:{s}", s, ci, ni))
    for p in me.polygons: p.material_index = int(cls[p.index])
    o.name = name; SRCS[name] = o; print("SRC", name, tris(o), np.bincount(cls, minlength=len(SLOTS)).tolist())

def finish(o):
    me = o.data; me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    bm = bmesh.new(); bm.from_mesh(me)
    for e in bm.edges: e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(48))
    bm.to_mesh(me); bm.free(); me.update()

LOD = {}
def lod(name, n):
    k = (name, n)
    if k not in LOD:
        o = SRCS[name].copy(); o.data = o.data.copy(); scene.collection.objects.link(o); active(o)
        t = tris(o)
        if t > n:
            m = o.modifiers.new("d", "DECIMATE"); m.ratio = n / t; m.use_collapse_triangulate = True; bpy.ops.object.modifier_apply(modifier="d")
        scene.collection.objects.unlink(o); LOD[k] = o
    return LOD[k]

def inst(name, n, dims, M, slot=None):
    s = lod(name, n); o = s.copy(); o.data = s.data.copy(); scene.collection.objects.link(o)
    lo, hi = bbox(o); d = hi - lo
    o.data.transform(M @ Matrix.Diagonal((*[dims[i] / d[i] for i in range(3)], 1)))
    u0, v0, w, h = TILE[name]
    for l in o.data.uv_layers.active.data: l.uv = (u0 + (l.uv[0] % 1) * w, v0 + (l.uv[1] % 1) * h)
    for i, s_ in enumerate(SLOTS): o.data.materials[i] = HEAPMAT[s_]
    if slot:
        for p in o.data.polygons: p.material_index = SLOTS.index(slot)
    return o

def place(loc, yaw, tilt=0.0, tiltdir=0.0, roll=0.0):
    ax = Vector((-math.sin(tiltdir), math.cos(tiltdir), 0))  # lean toward tiltdir
    return Matrix.Translation(loc) @ Matrix.Rotation(tilt, 4, ax) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(roll, 4, "X")

def join(objs, name, size, budget):
    active(objs[0]); [o.select_set(True) for o in objs]; bpy.ops.object.join(); o = objs[0]; o.name = name; me = o.data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(me); bm.free()
    if tris(o) > budget:
        m = o.modifiers.new("d", "DECIMATE"); m.ratio = budget * .98 / tris(o); bpy.ops.object.modifier_apply(modifier="d")
    lo, hi = bbox(o); d = hi - lo
    me.transform(Matrix.Diagonal((size[0] / d[0], size[1] / d[1], size[2] / d[2], 1)) @ Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    return o

for n in SPEC: load(n)

# heap atlas: slab and rubble get the big tiles
def tile(src, w, h):
    iy = (np.arange(h) * 2048 // h); ix = (np.arange(w) * 2048 // w); return src[iy][:, ix]
AC = np.ones((2048, 2048, 4), np.float32); AN = np.ones((2048, 2048, 4), np.float32)
for nme, (u0, v0, w, h) in TILE.items():
    x0, y0 = round(u0 * 2048), round(v0 * 2048); x1, y1 = round((u0 + w) * 2048), round((v0 + h) * 2048)
    AC[y0:y1, x0:x1, :3] = tile(PIX[nme][0], x1 - x0, y1 - y0); AN[y0:y1, x0:x1, :3] = tile(PIX[nme][1], x1 - x0, y1 - y0)
ai, an = mkimg("heap_col", AC, True), mkimg("heap_nrm", AN, False)
HEAPMAT = {s: mkmat(f"heapkit:{s}", s, ai, an) for s in SLOTS}

PIECES = {}
for key, src in CHUNKS.items():
    o = lod(src, 1150).copy(); o.data = o.data.copy(); scene.collection.objects.link(o); o.name = key; me = o.data
    me.calc_loop_triangles(); A = 0; cm = Vector()
    for t in me.loop_triangles: A += t.area; cm += t.center * t.area
    me.transform(Matrix.Translation(-cm / A)); PIECES[key] = o

def mound():
    R = random.Random(325); objs = []; T = math.tau
    prof = lambda r: 6.0 * max(0.0, 1 - (r / 12.6) ** 1.6)
    objs.append(inst("heap", 2100, (17, 16, 6.6), place((0, 0, 2.9), 0.4)))
    for i in range(4):
        a = i * T / 4 + 0.6; objs.append(inst("heap", 650, (11, 10, 3.2), place((8.2 * math.cos(a), 8.2 * math.sin(a), 1.2), a + R.uniform(0, 3))))
    for s in range(4):  # pancaked floor stacks: same yaw and lean, each slab slid a little
        a = s * T / 4 + R.uniform(-.3, .3); r = R.uniform(3.5, 7.5); yaw = R.uniform(0, T); tilt = R.uniform(.25, .6); td = a + R.uniform(-.4, .4)
        nrm = (Matrix.Rotation(tilt, 4, Vector((-math.sin(td), math.cos(td), 0))) @ Vector((0, 0, 1)))
        for k in range(3):
            c = Vector((r * math.cos(a), r * math.sin(a), prof(r) + .5)) + nrm * (k * .62) + Vector((R.uniform(-.7, .7), R.uniform(-.7, .7), 0))
            objs.append(inst("slab", 330, (R.uniform(7, 9), R.uniform(5.5, 7), .46), place(c, yaw + R.uniform(-.12, .12), tilt + R.uniform(-.05, .05), td)))
    for i in range(3):  # loose slabs, one on the crown, two slid to the foot
        a = R.uniform(0, T); r = (1.5, 10, 10.5)[i]
        objs.append(inst("slab", 300, (R.uniform(5.5, 7.5), R.uniform(4.5, 6), .44), place((r * math.cos(a), r * math.sin(a), prof(r) + .9), R.uniform(0, T), R.uniform(.15, .9), a)))
    for i in range(6):  # columns poking out
        a = i * T / 6 + R.uniform(-.3, .3); r = R.uniform(2.5, 8.5)
        objs.append(inst("column", 240, (R.uniform(4.2, 5.5), .9, .85), place((r * math.cos(a), r * math.sin(a), prof(r) + 1.1), a + R.uniform(-.5, .5), -R.uniform(.5, 1.1), a + R.uniform(-.3, .3))))
    for i in range(5):  # scaffold wrap falls outermost
        a = i * T / 5 + R.uniform(-.3, .3) + .9; r = R.uniform(7, 10.5)
        objs.append(inst("bamboo", 300, (3.4, 5.4, 6.6), place((r * math.cos(a), r * math.sin(a), prof(r) + 1.3), R.uniform(0, T), R.uniform(1.1, 1.5), a + R.uniform(-.5, .5))))
    for i in range(2):
        a = R.uniform(0, T); r = R.uniform(4, 8)
        objs.append(inst("beam", 240, (5.2, 1.5, 2.0), place((r * math.cos(a), r * math.sin(a), prof(r) + 1.0), R.uniform(0, T), R.uniform(.3, .9), a)))
    return join(objs, "mound", (26, 26, 7), 13800)

def pile():
    R = random.Random(11); objs = []; T = math.tau
    objs.append(inst("heap", 1300, (8.6, 8.0, 2.7), place((0, 0, 1.2), 1.1)))
    for i in range(2): objs.append(inst("heap", 280, (4.5, 4, 1.2), place((3.2 * math.cos(i * 3 + 2), 3.2 * math.sin(i * 3 + 2), .45), i * 2.0)))
    for i in range(4):
        a = i * T / 4 + .5; r = R.uniform(1.5, 3.2)
        objs.append(inst("slab", 290, (R.uniform(3.2, 4.2), R.uniform(2.6, 3.3), .4), place((r * math.cos(a), r * math.sin(a), 2.1 - r * .45), R.uniform(0, T), R.uniform(.3, .75), a)))
    for i in range(2):
        a = i * 3.3 + 1.9; objs.append(inst("column", 200, (3.0, .8, .75), place((2.4 * math.cos(a), 2.4 * math.sin(a), 1.5), a, -R.uniform(.4, .9), a)))
    for i in range(2):
        a = i * 2.8 + 3.6; objs.append(inst("bamboo", 240, (1.9, 2.9, 3.8), place((3.1 * math.cos(a), 3.1 * math.sin(a), 1.0), R.uniform(0, T), 1.3, a)))
    objs.append(inst("beam", 200, (3.8, 1.2, 1.5), place((-1.5, 2.6, 1.3), .7, .5, 2.0)))
    return join(objs, "pile", (10, 10, 3), 3900)

def scatter():
    R = random.Random(77); objs = []; T = math.tau
    for i in range(3):  # dust and fines drifts: the rubble mesh pressed low
        a = i * T / 3 + .4; objs.append(inst("heap", 230, (R.uniform(6, 8), R.uniform(5, 7), .5), place((3.4 * math.cos(a), 3.4 * math.sin(a), .1), R.uniform(0, T)), slot="dust"))
    for i in range(26):
        x, y = R.uniform(-6.5, 6.5), R.uniform(-6.5, 6.5); s = R.uniform(.45, 1.25)
        if i % 3 == 2: objs.append(inst("column", 40, (s * 1.3, s * .45, s * .4), place((x, y, .2), R.uniform(0, T), R.uniform(0, .25), R.uniform(0, T))))
        else: objs.append(inst("slab", 40, (s * 1.2, s, min(.34, s * .3)), place((x, y, .2), R.uniform(0, T), R.uniform(0, .35), R.uniform(0, T))))
    for i, (x, y) in enumerate(((-7, -7), (7, 7), (-7, 7), (7, -7))): objs.append(inst("slab", 40, (.9, .8, .3), place((x * .96, y * .96, .15), i)))
    return join(objs, "scatter", (14, 14, .6), 1950)

PIECES["mound"] = mound(); PIECES["pile"] = pile(); PIECES["scatter"] = scatter()
for o in PIECES.values(): finish(o); o.hide_render = True
for o in SRCS.values(): o.hide_render = True

# proofs: front 3/4, back, top, each lit from its camera; a 1.2 m post stands in for the player
scene.render.engine = "CYCLES"; scene.cycles.samples = 12; scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = 656
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.75, .78, .82, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .7
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam; cam.data.clip_end = 500
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5
bpy.ops.mesh.primitive_cylinder_add(radius=.22, depth=1.2); post = bpy.context.active_object
pm = bpy.data.materials.new("post"); pm.diffuse_color = (.9, .1, .1, 1); pm.use_nodes = True; pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.9, .1, .1, 1); post.data.materials.append(pm)
MAN = {}
for key, o in PIECES.items():
    o.hide_render = False; lo, hi = bbox(o); c = Vector((lo + hi) / 2); rad = float(np.linalg.norm(hi - lo)) / 2
    post.location = (hi[0] + .5, lo[1] - .3, lo[2] + .6)
    for tag, d in (("a", Vector((1, -1, .65))), ("b", Vector((-1, 1, .5))), ("c", Vector((.02, -.02, 1)))):
        d.normalize(); cam.location = c + d * rad * 2.9; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (-(d + Vector((.3, .2, .5))).normalized()).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{PROOF}/{key}_{tag}.png"; bpy.ops.render.render(write_still=True)
    o.hide_render = True
    # export: only this piece, its slots named for their surface
    active(o); bpy.ops.object.material_slot_remove_unused()
    used = list(o.data.materials); old = [m.name for m in used]
    for m in used: m.name = "tmp-" + m["slot"]
    for m in bpy.data.materials:
        if m.name in SLOTS: m.name = "x-" + m.name
    for m in used: m.name = m["slot"]
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{key}.glb", use_selection=True, export_apply=True, export_image_format="JPEG", export_jpeg_quality=88, export_yup=True)
    slots = [m.name for m in used]
    for m, n in zip(used, old): m.name = n
    d = hi - lo; MAN[key] = {"tris": tris(o), "size": [round(float(d[0]), 2), round(float(d[2]), 2), round(float(d[1]), 2)], "slots": slots}
    print("PIECE", key, MAN[key])
json.dump(MAN, open(f"{OUT}/manifest.json", "w"), indent=1)
