# Cat-body hair from a Tripo head sculpt: separate the grey hair by texel colour, fit onto the target cat head, export + proof.
# blender -b --factory-startup --python-exit-code 1 --python art/critter-hair-tripo/fit.py -- <id>
import bpy, bmesh, sys, os, math, random
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ID = sys.argv[sys.argv.index("--") + 1]
ROOT = os.environ.get("HAIR_ROOT", "/workspace/hair/tripo8")  # a second lane points this at its own folder
BODY = f"{ROOT}/{'female' if ID.startswith('f_') else 'male'}.glb"
RAW, OUT, PROOF = f"{ROOT}/{ID}-raw.glb", f"{ROOT}/{ID}.glb", f"{ROOT}/proof_{ID}"
TRIS = 5900
import json as _j
_tp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tune.json")
TUNE = (_j.load(open(_tp)) if os.path.exists(_tp) else {}).get(ID, {})
Z = Vector((0, 0, 1))
os.makedirs(PROOF, exist_ok=True)

def imp(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    o = [x for x in bpy.data.objects if x not in before and x.type == "MESH"][0]
    # bake transform into the mesh so data coords = world (body file space)
    o.data.transform(o.matrix_world); o.parent = None; o.matrix_world = Matrix()
    return o

def tex_of(o):
    for n in o.material_slots[0].material.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Color"): return n.image
def nrm_of(o):
    for n in o.material_slots[0].material.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Normal"): return n.image

def face_rgb(o):
    img = tex_of(o); w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)[:, :, :3]
    me = o.data; uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    ls = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("loop_start", ls)
    lt = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("loop_total", lt)
    def samp(u):
        x = np.clip((u[:, 0] % 1) * w, 0, w - 1).astype(int); y = np.clip((u[:, 1] % 1) * h, 0, h - 1).astype(int)
        return px[y, x]
    acc = np.zeros((len(ls), 3)); cu = np.zeros((len(ls), 2))
    for k in range(3):
        u = uv[ls + k]; acc += samp(u); cu += u
    acc += samp(cu / 3) * 2
    return acc / 5

def classify(rgb):
    mx, mn = rgb.max(1), rgb.min(1); sat = (mx - mn) / np.maximum(mx, 1e-4)
    lab = np.zeros(len(rgb), np.int8)
    lab[:] = 1                                 # hair = whatever is not skin: grey incl. its shaded grooves
    lab[(sat > 0.5) & (mx > 0.45)] = 0         # orange fur
    lab[(sat >= 0.12) & (sat <= 0.5) & (mx > 0.72)] = 0  # cream muzzle, pink inner ear
    lab[mx < 0.12] = 2                         # black (eyes, nose, lashes)
    return lab

def smooth_labels(o, lab, it=2):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    nb = [[g.index for e in f.edges for g in e.link_faces if g is not f] for f in bm.faces]; bm.free()
    for _ in range(it):
        hair = lab == 1; new = lab.copy()
        for i, n in enumerate(nb):
            if not n or lab[i] == 2: continue
            s = hair[n].sum() + hair[i]
            if s * 2 > len(n) + 1: new[i] = 1
            elif lab[i] == 1: new[i] = 0
        lab = new
    # non-hair specks fully enclosed by hair (shaded grooves) become hair: no cracks in the shell
    seen = np.zeros(len(lab), bool); N = len(lab)
    for i0 in range(N):
        if seen[i0] or lab[i0] == 1: continue
        st, comp, edge_ok = [i0], [], True; seen[i0] = True
        while st:
            i = st.pop(); comp.append(i)
            for j in nb[i]:
                if lab[j] == 1: continue
                if not seen[j]: seen[j] = True; st.append(j)
        touches_hair = any(lab[j] == 1 for i in comp for j in nb[i])
        if len(comp) < 0.015 * N and touches_hair: c_ = np.array(comp); lab[c_] = np.where(lab[c_] == 2, 2, 1)  # a loose eyeball island stays an eye
    return lab

def landmarks(o, lab, top_frac=None):
    me = o.data
    V = np.array([v.co[:] for v in me.vertices])
    vlab = np.zeros(len(V), np.int8); vhair = np.zeros(len(V), bool)
    for p in me.polygons:
        for vi in p.vertices:
            if lab[p.index] == 2: vlab[vi] = 2
            if lab[p.index] == 1: vhair[vi] = True
    sel = np.ones(len(V), bool)
    if top_frac:
        z0, z1 = V[:, 2].min(), V[:, 2].max(); sel = V[:, 2] > z1 - top_frac * (z1 - z0)
    HV = V[sel]; c = HV.mean(0)
    blk = sel & (vlab == 2)
    if top_frac:  # eyes can sit below the top band on a short head: look further down, near the middle
        band = V[:, 2] > z1 - 0.42 * (z1 - z0)
        blk = band & (vlab == 2) & (np.abs(V[:, 1] - c[1]) < 0.06) & (np.abs(V[:, 0] - c[0]) < 0.08)
    ec = V[blk].mean(0); f = Vector((ec[0] - c[0], ec[1] - c[1], 0)).normalized(); 
    if True:  # body and Tripo sculpt are both authored square: front is the nearest axis
        f = Vector((round(f.x), 0, 0)) if abs(f.x) > abs(f.y) else Vector((0, round(f.y), 0))
    l = Z.cross(f)
    F, L = V @ np.array(f[:]), V @ np.array(l[:]); cF, cL = c @ np.array(f[:]), c @ np.array(l[:])
    W = L[sel].max() - L[sel].min()
    eyes = blk & (F > cF) & (np.abs(L - cL) > 0.1 * W) & (np.abs(L - cL) < 0.45 * W)
    _l, _r = eyes & (L > cL), eyes & (L < cL)
    if not _l.any() and not _r.any(): _l = _r = blk  # eyes hidden: one blob for both
    eL = V[_l].mean(0) if _l.any() else None; eR = V[_r].mean(0) if _r.any() else None
    _lv = np.array(l[:])
    if eL is None: eL = eR - 2 * ((eR @ _lv) - cL) * _lv  # one eye hidden under hair: mirror the other
    if eR is None: eR = eL - 2 * ((eL @ _lv) - cL) * _lv
    skin = sel & ~vhair & (vlab != 2)
    def tip(m):
        i = np.where(m)[0]; return V[i[np.argmax(V[i, 2])]] if len(i) else None
    aL, aR = tip(skin & (L > cL + 0.1 * W)), tip(skin & (L < cL - 0.1 * W))
    lv = np.array(l[:])
    mirror = lambda a: a - 2 * ((a @ lv) - cL) * lv
    if aL is None and aR is not None: aL = mirror(aR)
    if aR is None and aL is not None: aR = mirror(aL)
    if aL is None: aL, aR = tip(sel & (L > cL + 0.1 * W)), tip(sel & (L < cL - 0.1 * W))  # hair hides both ears
    return dict(V=V, sel=sel, c=c, f=f, l=l, W=W, eyes=eyes, eL=eL, eR=eR, aL=aL, aR=aR, F=F, L=L, cF=cF, cL=cL)

def delete_faces(bm, faces):
    bmesh.ops.delete(bm, geom=list(set(faces)), context="FACES")

def drop_islands(bm, frac=0.02):
    bm.faces.ensure_lookup_table(); seen = set(); isl = []
    for f in bm.faces:
        if f in seen: continue
        st, comp = [f], []; seen.add(f)
        while st:
            g = st.pop(); comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen: seen.add(h); st.append(h)
        isl.append(comp)
    n = len(bm.faces); bad = [g for c in isl if len(c) < frac * n for g in c]
    delete_faces(bm, bad); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    return len(isl)

# ---------- target body ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
body = imp(BODY); body.name = "body"
blab = classify(face_rgb(body))
T = landmarks(body, blab, top_frac=0.22)
BV = T["V"]; Hb = BV[:, 2].max() - BV[:, 2].min(); headH = 0.22 * Hb
bvh = BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices], [p.vertices[:] for p in body.data.polygons])
print("TARGET front", tuple(round(x, 3) for x in T["f"]), "ears", T["aL"].round(4), T["aR"].round(4), "eyes", T["eL"].round(4), T["eR"].round(4))

# ---------- raw sculpt ----------
raw = imp(RAW); raw.name = "hair"
_b = bmesh.new(); _b.from_mesh(raw.data); bmesh.ops.remove_doubles(_b, verts=_b.verts, dist=1e-6); _b.to_mesh(raw.data); _b.free()  # glTF splits at UV seams: weld so islands are real
rlab = smooth_labels(raw, classify(face_rgb(raw)))
R = landmarks(raw, rlab)
print("RAW hair faces", int((rlab == 1).sum()), "/", len(rlab), "front", tuple(round(x, 3) for x in R["f"]))
nimg = nrm_of(raw)

# similarity: yaw (front onto front) + uniform scale + translation from ears+eyes
yaw = math.atan2(T["f"].y, T["f"].x) - math.atan2(R["f"].y, R["f"].x)
Rm = Matrix.Rotation(yaw, 3, "Z")
src = [Rm @ Vector(R[k]) for k in ("aL", "aR", "eL", "eR")]; dst = [Vector(T[k]) for k in ("aL", "aR", "eL", "eR")]
cs, cd = sum(src, Vector()) / 4, sum(dst, Vector()) / 4
s = math.sqrt(sum(((d - cd).length ** 2 for d in dst)) / sum(((p - cs).length ** 2 for p in src)))
M = Matrix.Translation(cd - s * cs) @ Matrix.Scale(s, 4) @ Rm.to_4x4()
print("fit scale", round(s, 4), "yaw", round(math.degrees(yaw), 1))

bm = bmesh.new(); bm.from_mesh(raw.data); bm.faces.ensure_lookup_table()
delete_faces(bm, [f for f in bm.faces if rlab[f.index] != 1])
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
n_isl = drop_islands(bm)

# target frame helpers
f, l = T["f"], T["l"]; c = Vector(T["c"])
def FLZ(p): d = p - c; return d.dot(f), d.dot(l), p.z
eyeV = T["V"][T["eyes"]]
eye_top = eyeV[:, 2].max(); eye_lat = np.abs((eyeV - T["c"]) @ np.array(l[:])).max() + 0.04 * T["W"]
headF = (T["F"][T["sel"]] - T["cF"]).max()
# ears: skin above the crown level at the sides
Lr = T["L"] - T["cL"]; HVs = T["sel"]
crown = T["V"][HVs & (np.abs(Lr) < 0.12 * T["W"]), 2].max()
tipz = min(T["aL"][2], T["aR"][2])
earmask = HVs & (np.abs(Lr) > 0.12 * T["W"]) & (T["V"][:, 2] > crown - 0.2 * (tipz - crown))
kd = KDTree(int(earmask.sum()))
for i, p in enumerate(T["V"][earmask]): kd.insert(Vector(p), i)
kd.balance()
EAR_R = 0.09 * headH; EAR_R2 = 0.2 * headH
earz0 = crown + 0.15 * (tipz - crown)
cut = []
for fa in bm.faces:
    m = fa.calc_center_median(); F_, L_, Z_ = FLZ(m)
    if F_ > 0.1 * headF and Z_ < eye_top + 0.06 * headH and abs(L_) < eye_lat: cut.append(fa); continue
    if any(kd.find(v.co)[2] < EAR_R for v in fa.verts): cut.append(fa); continue
    if Z_ > earz0 and kd.find(m)[2] < EAR_R2: cut.append(fa)  # hair sculpted as ear sleeves
delete_faces(bm, cut); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
drop_islands(bm)
bmesh.ops.holes_fill(bm, edges=bm.edges[:], sides=40)
# crown slits: close every leftover hole whose rim is short and sits away from the ears and face (those openings stay)
def _loops(bm):
    bnd = {e for e in bm.edges if e.is_boundary}; out = []
    while bnd:
        e0 = bnd.pop(); loop = [e0]; v = e0.verts[1]; start = e0.verts[0]
        while v is not start:
            nxt = [e for e in v.link_edges if e in bnd]
            if not nxt: break
            e = nxt[0]; bnd.discard(e); loop.append(e); v = e.other_vert(v)
        out.append(loop)
    return out
closed = 0
for loop in _loops(bm):
    per = sum(e.calc_length() for e in loop)
    vs = {v for e in loop for v in e.verts}; cen = sum((v.co for v in vs), Vector()) / len(vs)
    F_, L_, Z_ = FLZ(cen)
    if per < 0.6 * headH and Z_ > eye_top + 0.1 * headH and kd.find(cen)[2] > 0.8 * EAR_R2:
        try: bmesh.ops.holes_fill(bm, edges=loop, sides=0); closed += 1
        except Exception: pass
print("CLOSED", ID, closed)
bm.to_mesh(raw.data); bm.free()

# decimate
bpy.context.view_layer.objects.active = raw; raw.select_set(True)
tri = sum(len(p.vertices) - 2 for p in raw.data.polygons)
if tri > TRIS:
    md = raw.modifiers.new("dec", "DECIMATE"); md.ratio = TRIS / tri; md.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")

# seat on the skull: push inside verts out to 0.3-0.6 cm (game scale ~1.6 m body), snap near hairline edges onto the skull
bm = bmesh.new(); bm.from_mesh(raw.data)
random.seed(7); pushed = snapped = floating = 0
OFF = (0.0019 * Hb, 0.0036 * Hb)
for v in bm.verts:
    loc, n, _, d = bvh.find_nearest(v.co)
    if loc is None: continue
    off = random.uniform(*OFF); side = (v.co - loc).dot(n)
    edge = v.is_boundary
    if side < off: v.co = loc + n * off; pushed += 1
    elif TUNE.get("thin"): v.co = loc + n * off + (v.co - loc - n * off) * TUNE["thin"]   # hug the skull: volume pulled in, shape kept
    elif edge and (d < 0.07 * headH or kd.find(v.co)[2] < 2.6 * EAR_R): v.co = loc + n * off; snapped += 1  # ear openings skirt down to the skull: no gap into the shell
    elif edge: floating += 1
for _ in range(2):  # relax the snapped hairline ring a touch
    for v in bm.verts:
        if v.is_boundary:
            nb = [e.other_vert(v).co for e in v.link_edges]; v.co = v.co * 0.6 + sum(nb, Vector()) / len(nb) * 0.4
            loc, n, _, d = bvh.find_nearest(v.co)
            if (v.co - loc).dot(n) < OFF[0]: v.co = loc + n * OFF[0]
bm.to_mesh(raw.data); bm.free()
# scalp underlayer (Shelly wants no skull through the hair): the head's own scalp, 1.5 mm out, in the hair slot, under the sculpt.
# covers crown slits and ear-base notches; stops at the sculpt's own front hairline and clears each ear by 1.3x the ear cut.
if not TUNE.get("noscalp"):
    hv_ = np.array([v.co[:] for v in raw.data.vertices])
    Fh = (hv_ - np.array(c[:])) @ np.array(f[:])
    front_band = Fh > 0.45 * headF
    hairline = hv_[front_band, 2].min() if front_band.any() else eye_top + 0.25 * headH
    side_floor = hv_[:, 2].min()
    bb = bmesh.new(); bb.from_mesh(body.data); bb.faces.ensure_lookup_table()
    keep = []
    for fa in bb.faces:
        m = fa.calc_center_median(); F_, L_, Z_ = FLZ(m)
        _band = 0.75 * headH * 0.5
        if TUNE.get("fullscalp") and F_ < -0.1 * headF: _band = (1.25 if TUNE.get("nape") else 0.95) * headH   # fullscalp: the back of the skull down to the nape
        if Z_ < crown - _band: continue          # below the skull band
        _rear = TUNE.get("fullscalp") and F_ < -0.1 * headF
        if Z_ < eye_top + 0.08 * headH and not _rear: continue              # never on the eyes
        if F_ > 0.25 * headF and Z_ < hairline + 0.01 * headH: continue   # forehead below the sculpt's hairline stays fur
        if F_ <= 0.25 * headF and Z_ < max(side_floor, eye_top) and not (TUNE.get("fullscalp") and F_ < -0.1 * headF): continue
        if kd.find(m)[2] < 0.75 * EAR_R: continue              # ears and a collar round each base stay clear
        if any(kd.find(v.co)[2] < 0.6 * EAR_R for v in fa.verts): continue
        if fa.normal.z < (-0.85 if _rear and TUNE.get("nape") else -0.35): continue   # underside of the jaw/neck; nape: the rear cap runs under the skull into the neck
        keep.append(fa.index)
    keepset = set(keep)
    bb2 = bmesh.new(); vmap = {}
    for i in keep:
        fa = bb.faces[i]; vs = []
        for v in fa.verts:
            if v.index not in vmap: vmap[v.index] = bb2.verts.new(v.co + v.normal * (0.0012 * Hb))
            vs.append(vmap[v.index])
        try: bb2.faces.new(vs)
        except ValueError: pass
    # trim any scalp the sculpt does not hang over (a scalp poking past the hair's own silhouette)
    hbvh = BVHTree.FromPolygons([v.co.copy() for v in raw.data.vertices], [p.vertices[:] for p in raw.data.polygons])
    bb2.faces.ensure_lookup_table(); bare = []
    hc = Vector(T["c"]); hc.z = crown - 0.35 * headH          # a point deep inside the skull
    def _hits(d): return hbvh.ray_cast(hc, d, 3 * headH)[0] is not None
    for fa in bb2.faces:
        m = fa.calc_center_median(); d0 = (m - hc).normalized()
        if _hits(d0): continue                                 # hair right over it
        t1 = d0.orthogonal().normalized(); t2 = d0.cross(t1)
        ring = 0; opp = [False] * 4
        for k, t in enumerate((t1, t2, -t1, -t2)):
            for a_ in (0.12, 0.24, 0.36):
                if _hits((d0 + t * a_).normalized()): opp[k] = True; break
        # a gap is hair on opposite sides (crown slit, ear-base notch); a bare forehead has hair on one side only
        if not ((opp[0] and opp[2]) or (opp[1] and opp[3])): bare.append(fa)
    if not TUNE.get("fullscalp"): bmesh.ops.delete(bb2, geom=bare, context="FACES")  # fullscalp: a sculpt bald behind (twintails, ponytail) keeps the whole cap
    for _ in range(4):
        for v in [v for v in bb2.verts if v.is_boundary]:
            nb = [e.other_vert(v).co for e in v.link_edges if e.is_boundary]
            if len(nb) == 2: v.co = v.co * 0.5 + (nb[0] + nb[1]) * 0.25
    me2 = bpy.data.meshes.new("scalp"); bb2.to_mesh(me2); bb2.free(); bb.free()
    sc_o = bpy.data.objects.new("scalp", me2); bpy.context.collection.objects.link(sc_o)
    bpy.ops.object.select_all(action="DESELECT"); sc_o.select_set(True); raw.select_set(True)
    bpy.context.view_layer.objects.active = raw; bpy.ops.object.join()
    print(f"SCALP {ID} faces {len(keep)} kept {len(keep)-len(bare)}")
for p in raw.data.polygons: p.use_smooth = True
tri = sum(len(p.vertices) - 2 for p in raw.data.polygons)
print(f"STATS {ID} tris {tri} islands {n_isl} pushed {pushed} snapped {snapped} floating_edge {floating}")

# material: one slot "hair", near-white, Tripo normal detail kept
raw.data.materials.clear()
mat = bpy.data.materials.new("hair"); mat.use_nodes = True; mat.use_backface_culling = False
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.888, 0.888, 0.888, 1)  # #f2f2f2 in linear
bsdf.inputs["Roughness"].default_value = 0.62
if nimg:
    nimg.scale(1024, 1024)
    ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = nimg; nimg.colorspace_settings.name = "Non-Color"
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(ti.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
raw.data.materials.append(mat); raw.data.name = "hair"
bpy.ops.object.select_all(action="DESELECT"); raw.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=True, export_image_format="JPEG")

# ---------- proof ----------
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = 520
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.33, 0.36, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6; sc.world = w
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3.2; sc.collection.objects.link(sun)
hv = [v.co for v in raw.data.vertices]
zlo = min(min(p.z for p in hv), c.z - 0.5 * headH); zhi = max(T["V"][:, 2].max(), max(p.z for p in hv))
lat = max(abs((p - c).dot(l)) for p in hv) * 2
cam.data.ortho_scale = max(zhi - zlo, lat) * 1.12
ctr = Vector((c.x, c.y, (zlo + zhi) / 2))
views = {"front": f, "back34": (-f * 0.75 + l * 0.65).normalized()}
for tn, hexc in (("brown", "6b4a2b"), ("pink", "f29ac0"), ("black", "222222")):
    lin = [((int(hexc[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    for vn, d in views.items():
        dd = (d + Z * 0.15).normalized()
        cam.location = ctr + dd * 1.0; cam.rotation_euler = (-dd).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (-(dd + l * 0.25 + Z * 0.3)).normalized().to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{vn}_{tn}.png"; bpy.ops.render.render(write_still=True)
print("DONE", OUT)
