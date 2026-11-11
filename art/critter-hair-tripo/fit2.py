# Lane 2 of the Tripo cat hair: hair faces by texel colour, fitted onto the universal cat head by its hairline.
# blender -b --factory-startup --python-exit-code 1 --python art/critter-hair-tripo/fit2.py -- <id> [k=1.0 hs=0.14 hv=0.33 off=0.005]
import bpy, bmesh, sys, json, math, os
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
ID = argv[0]
OPT = dict(a.split("=") for a in argv[1:])
W = "/workspace/hair/tripo2"
BODIES = {"f": f"{W}/value.fd42aa9c3d62dd1e836d8825fb196fb364c05a6c8c143a159d42705235e421fa.glb",
          "m": f"{W}/value.389310dd2c44bde2f302548e56ae6dc7d1d7174dd44a4bb29332fc672e5cfce7.glb"}
RAW, OUT, PD = f"{W}/{ID}-raw.glb", f"{W}/{ID}.glb", f"{W}/proof"
os.makedirs(PD, exist_ok=True)
TRIS = 6000
HAIR_S = float(OPT.get("hs", 0.14)); HAIR_V = float(OPT.get("hv", 0.33)); SCALE_K = float(OPT.get("k", 1.0))
LOG = {}
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def imp(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        o.data.transform(o.matrix_world); o.parent = None; o.matrix_world = Matrix()
    if len(meshes) > 1:
        bpy.ops.object.select_all(action="DESELECT")
        for o in meshes: o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join()
    ob = meshes[0]
    for o in new:
        if o.name in bpy.data.objects and o is not ob and o.type != "MESH": bpy.data.objects.remove(o)
    ob.name = name
    return ob

def upstream_image(sock):
    seen = set(); stack = [l.from_node for l in sock.links]
    while stack:
        n = stack.pop()
        if n in seen: continue
        seen.add(n)
        if n.type == "TEX_IMAGE" and n.image: return n.image
        for i in n.inputs: stack += [l.from_node for l in i.links]

def maps(ob):
    mat = ob.material_slots[0].material
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    return upstream_image(bsdf.inputs["Base Color"]), upstream_image(bsdf.inputs["Normal"])

def analysis_bm(ob, img):
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)[:, :, :3]
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active
    rgb = np.zeros((len(bm.faces), 3), np.float32)
    for f in bm.faces:
        uvs = [l[uvl].uv for l in f.loops]; c = sum(uvs, Vector((0, 0))) / len(uvs)
        acc = np.zeros(3, np.float32)
        for u in uvs + [c, c]: acc += px[min(h - 1, int((u.y % 1) * h)), min(w - 1, int((u.x % 1) * w))]
        rgb[f.index] = acc / (len(uvs) + 2)
    mx = rgb.max(1); mn = rgb.min(1)
    return bm, (mx - mn) / np.maximum(mx, 1e-4), mx

def neighbors(bm):
    bm.faces.ensure_lookup_table(); nb = [[] for _ in bm.faces]
    for e in bm.edges:
        fs = [f.index for f in e.link_faces]
        for a in fs:
            nb[a] += [b for b in fs if b != a]
    return nb

def islands(mask, nb):
    seen = np.zeros(len(mask), bool); out = []
    for i in np.nonzero(mask)[0]:
        if seen[i]: continue
        st = [i]; seen[i] = True; isl = []
        while st:
            f = st.pop(); isl.append(f)
            for g in nb[f]:
                if mask[g] and not seen[g]: seen[g] = True; st.append(g)
        out.append(isl)
    return sorted(out, key=len, reverse=True)

def eyes(bm, black, nb, zlo=-1e9):
    isl = [I for I in islands(black, nb) if bm.faces[I[0]].calc_center_median().z > zlo]
    area = lambda I: sum(bm.faces[i].calc_area() for i in I)
    isl = sorted(isl, key=area, reverse=True)[:2]
    cs = []
    for I in isl:
        a = sum(bm.faces[i].calc_area() for i in I)
        cs.append(sum((bm.faces[i].calc_center_median() * bm.faces[i].calc_area() for i in I), Vector()) / a)
    top = max(v.co.z for I in isl for i in I for v in bm.faces[i].verts)
    return cs, top

# ---------------- target body ----------------
body = imp(BODIES[ID[0]], "body")
balb, _ = maps(body)
bbm, bs, bv = analysis_bm(body, balb)
bnb = neighbors(bbm)
bco = np.array([v.co[:] for v in bbm.verts])
zmin, zmax = bco[:, 2].min(), bco[:, 2].max(); H = zmax - zmin
OFF = float(OPT.get("off", 0.005)) * H / 1.6       # 0.5 cm at a 1.6 m body
# neck: narrowest slice under the head's widest, above the arms
zs = np.linspace(zmin + 0.3 * H, zmax - 0.1 * H, 90)
wid = np.array([np.ptp(bco[np.abs(bco[:, 2] - z) < H * 0.006][:, 1]) if (np.abs(bco[:, 2] - z) < H * 0.006).any() else 0 for z in zs])
upper = zs > zmin + 0.6 * H
zw = zs[upper][np.argmax(wid[upper])]; hw = wid[upper].max()
neck = zmin + 0.6 * H
for i in range(len(zs) - 1, -1, -1):
    if zs[i] >= zw: continue
    if wid[i] > 1.3 * hw: break
    if wid[i] < wid[np.searchsorted(zs, neck)] if zs[0] <= neck else True: neck = zs[i]
head = bco[bco[:, 2] > neck]
hc = Vector(head.mean(0))
beye, beye_top = eyes(bbm, bv < 0.16, bnb, zlo=neck)
beye = sorted(beye, key=lambda c: c.y)
bmid = (beye[0] + beye[1]) / 2
fwd = bmid - hc; fwd.z = 0; fwd.normalize()
side = Vector((-fwd.y, fwd.x, 0))
esep = (beye[1] - beye[0]).length
eye_outer = esep / 2 + esep * 0.42
centre = head[np.abs((head - np.array(hc[:])) @ np.array(side[:])) < 0.12 * hw]
zskull = centre[:, 2].max()
ears = []
for sgn in (1, -1):
    lat = (head - np.array(hc[:])) @ np.array(side[:]) * sgn
    sd = head[lat > 0.08 * hw]
    tip = Vector(sd[np.argmax(sd[:, 2])])
    ev = sd[sd[:, 2] > zskull]; L0 = tip.z - zskull
    band = ev[ev[:, 2] < zskull + 0.12 * L0]
    base = Vector(band.mean(0)) if len(band) else Vector((tip.x, tip.y, zskull))
    ax = tip - base; L = ax.length; ax.normalize()
    rel = ev - np.array(base[:]); t = rel @ np.array(ax[:])
    rad = np.linalg.norm(rel - np.outer(t, ax[:]), axis=1)
    rb = []
    for i in range(12):
        m = (t >= L * i / 12) & (t < L * (i + 1) / 12)
        rb.append(float(rad[m].max()) if m.any() else (rb[-1] if rb else 0.2 * L))
    ears.append(dict(base=base, ax=ax, L=L, rb=rb, tip=tip))
front = (head - np.array(hc[:])) @ np.array(fwd[:]) > 0.2 * hw
chin = head[front][:, 2].min()
bvh = BVHTree.FromBMesh(bbm)
LOG["body"] = dict(H=H, neck=neck, hw=hw, eye_sep=esep, fwd=list(fwd), eye_top=beye_top, zskull=zskull, chin=chin,
                   ears=[dict(base=list(e["base"]), tip=list(e["tip"]), r0=e["rb"][0]) for e in ears])

# ---------------- tripo head+hair ----------------
raw = imp(RAW, "raw")
ralb, rnorm = maps(raw)
rbm, rs, rv = analysis_bm(raw, ralb)
rnb = neighbors(rbm)
hair = (rs < HAIR_S) & (rv > HAIR_V)
for _ in range(3):
    new = hair.copy()
    for i, n in enumerate(rnb):
        if n:
            k = sum(hair[j] for j in n)
            if k * 2 > len(n) + 1: new[i] = True
            elif k * 2 < len(n) - 1: new[i] = False
    hair = new
rco = np.array([v.co[:] for v in rbm.verts]); rc = Vector(rco.mean(0))
reye, reye_top = eyes(rbm, (rv < 0.16) & ~hair, rnb, zlo=float(np.percentile(rco[:, 2], 25)))
rmid = (reye[0] + reye[1]) / 2
fr = rmid - rc; fr.z = 0; fr.normalize()
ang = math.atan2(fwd.y, fwd.x) - math.atan2(fr.y, fr.x)
Rm = np.array(Matrix.Rotation(ang, 3, "Z"))
LOG["tripo"] = dict(hair_frac=float(hair.mean()), rot_deg=math.degrees(ang), eye_sep=(reye[1] - reye[0]).length)

bmesh.ops.delete(rbm, geom=[rbm.faces[i] for i in np.nonzero(~hair)[0]], context="FACES")
nb2 = neighbors(rbm); nf = len(rbm.faces)
drop = [rbm.faces[i] for I in islands(np.ones(nf, bool), nb2) if len(I) < 0.02 * nf for i in I]
bmesh.ops.delete(rbm, geom=drop, context="FACES")
bmesh.ops.delete(rbm, geom=[v for v in rbm.verts if not v.link_faces], context="VERTS")
bmesh.ops.holes_fill(rbm, edges=[e for e in rbm.edges if e.is_boundary], sides=48)
LOG["fragments_dropped"] = len(drop)
me = bpy.data.meshes.new("hair"); rbm.to_mesh(me); rbm.free()
hairob = bpy.data.objects.new("hair", me); sc.collection.objects.link(hairob)
bpy.data.objects.remove(raw)
bpy.ops.object.select_all(action="DESELECT"); hairob.select_set(True); bpy.context.view_layer.objects.active = hairob
ntri = sum(len(p.vertices) - 2 for p in me.polygons)
if ntri > TRIS:
    md = hairob.modifiers.new("dec", "DECIMATE"); md.ratio = TRIS / ntri * 0.97; md.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")
me = hairob.data

# ---------------- fit: yaw onto front, scale on eyes, then hairline onto the skin ----------------
co = (np.array([v.co[:] for v in me.vertices]) - np.array(rc[:])) @ Rm.T
rmid_r = Rm @ np.array((rmid - rc)[:])
s0 = esep / (reye[1] - reye[0]).length
b2 = bmesh.new(); b2.from_mesh(me); bidx = np.array([v.index for v in b2.verts if v.is_boundary], int); b2.free()
F = np.array(fwd[:])
def place(p, s, tx, tz):
    q = (p - rmid_r) * s + np.array(bmid[:]); q += F * tx; q[:, 2] += tz
    return q
def cost(s, tx, tz):
    d = np.array([(Vector(p) - bvh.find_nearest(Vector(p))[0]).length for p in place(co[bidx], s, tx, tz)])
    d.sort(); return d[: max(1, int(len(d) * 0.7))].mean()
best = (cost(s0, 0, 0) if len(bidx) else 0, s0, 0.0, 0.0)
if len(bidx) > 10:
    span = 0.1 * hw
    for sr, tr, n in ((0.25, span, 7), (0.08, span * 0.3, 7), (0.03, span * 0.1, 5)):
        _, s_, x_, z_ = best
        for s in np.linspace(s_ * (1 - sr), s_ * (1 + sr), n):
            for tx in np.linspace(x_ - tr, x_ + tr, n):
                for tz in np.linspace(z_ - tr, z_ + tr, n):
                    c = cost(s, tx, tz)
                    if c < best[0]: best = (c, s, tx, tz)
_, S, TX, TZ = best
LOG["fit"] = dict(s_eyes=s0, s=S, k=SCALE_K, tx=TX, tz=TZ, resid_rel=best[0] / hw, bverts=len(bidx))
co = place(co, S * SCALE_K, TX, TZ)

brow = beye_top + 0.06 * esep
lifted = 0
for i, p in enumerate(co):
    rel = p - np.array(hc[:])
    if rel @ F > 0.15 * hw and abs(rel @ np.array(side[:])) < eye_outer and chin < p[2] < brow:
        co[i, 2] = brow; lifted += 1
LOG["fringe_lifted"] = lifted

def ear_push(co):
    n = 0
    for e in ears:
        b = np.array(e["base"][:]); a = np.array(e["ax"][:])
        rel = co - b; t = rel @ a; rv_ = rel - np.outer(t, a); rad = np.linalg.norm(rv_, axis=1)
        for i in np.nonzero((t > -0.3 * e["L"]) & (t < 1.05 * e["L"]))[0]:
            r = e["rb"][min(11, max(0, int(t[i] / e["L"] * 12)))] * 1.1 + 3 * OFF
            if rad[i] < r:
                d = rv_[i] / rad[i] if rad[i] > 1e-9 else np.array(side[:])
                co[i] = b + a * t[i] + d * r; n += 1
    return n
bset = set(bidx.tolist())
def skin_push(co, snap):
    n = 0
    for i, p in enumerate(co):
        q, nrm, _, d = bvh.find_nearest(Vector(p))
        if q is None: continue
        edge = i in bset
        if (Vector(p) - q).dot(nrm) < OFF or (snap and edge and d < 0.12 * hw):
            co[i] = np.array((q + nrm * OFF * (1.3 if edge else 1.0))[:]); n += 1
    return n
edges = np.array([e.vertices[:] for e in me.edges])
def relax(co, idx):
    acc = np.zeros_like(co); cnt = np.zeros(len(co))
    np.add.at(acc, edges[:, 0], co[edges[:, 1]]); np.add.at(cnt, edges[:, 0], 1)
    np.add.at(acc, edges[:, 1], co[edges[:, 0]]); np.add.at(cnt, edges[:, 1], 1)
    co[idx] = co[idx] * 0.5 + (acc / np.maximum(cnt, 1)[:, None])[idx] * 0.5
    return co
pushes = []
for r in range(4):
    before = co.copy(); ne = ear_push(co); ns = skin_push(co, r < 3); pushes.append((ne, ns))
    moved = np.linalg.norm(co - before, axis=1) > 1e-9
    if r < 3 and moved.any():
        ring = moved.copy(); ring[edges[moved[edges[:, 0]] | moved[edges[:, 1]]].ravel()] = True
        co = relax(co, np.nonzero(ring)[0])
LOG["pushes"] = pushes
for i, v in enumerate(me.vertices): v.co = Vector(co[i])
me.update()
for p in me.polygons: p.use_smooth = True

me.materials.clear()
mat = bpy.data.materials.new("hair"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.888, 0.888, 0.888, 1)  # #f2f2f2
bsdf.inputs["Roughness"].default_value = 0.6
if rnorm:
    if rnorm.size[0] > 1024: rnorm.scale(1024, 1024)
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = rnorm; rnorm.colorspace_settings.name = "Non-Color"
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
me.materials.append(mat)
LOG["normal_map"] = bool(rnorm); LOG["tris"] = sum(len(p.vertices) - 2 for p in me.polygons)
bpy.ops.object.select_all(action="DESELECT"); hairob.select_set(True); bpy.context.view_layer.objects.active = hairob
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=True, export_image_format="JPEG")

# ---------------- proof: 3 tints x (front, 3/4 back), lit from the camera side ----------------
sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = 400
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.45, 0.52, 1)
wd.node_tree.nodes["Background"].inputs[1].default_value = 0.5
lo = min(co[:, 2].min(), chin - 0.1 * hw); hi = max(e["tip"].z for e in ears)
tgt = Vector((hc.x, hc.y, (lo + hi) / 2))
size = max(hi - lo, np.ptp(co @ np.array(side[:])), hw) * 1.1
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = size; sc.camera = cam
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3.0; sc.collection.objects.link(sun)
views = {"front": fwd + Vector((0, 0, 0.12)), "back34": -fwd * 0.75 + side * 0.65 + Vector((0, 0, 0.3))}
tiles = []
for tn, hx in (("brown", "6b4a2b"), ("pink", "f29ac0"), ("black", "222222")):
    c = [int(hx[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = [x / 12.92 if x < 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
    for vn, d in views.items():
        d = d.normalized(); cam.location = tgt + d * size * 4
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (-(d + side * 0.3 + Vector((0, 0, 0.35))).normalized()).to_track_quat("-Z", "Y").to_euler()
        f = f"{PD}/{ID}_{tn}_{vn}.png"; sc.render.filepath = f; bpy.ops.render.render(write_still=True); tiles.append(f)
json.dump(LOG, open(f"{PD}/{ID}.json", "w"), indent=1, default=float)
print("LOG", json.dumps(LOG, default=float))
