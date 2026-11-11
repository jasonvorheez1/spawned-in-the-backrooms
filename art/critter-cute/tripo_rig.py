# Tripo cat: ONE universal body set. source -> scale -> split Body/Head -> mixamo rig -> weights -> face decal ->
# outfit (cloth_top, cloth_bottom) -> Idle/Walk -> export -> audit -> proofs.  Front -Y in Blender (exports +z).
import bpy, bmesh, math, os, numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import interpolate_poly_3d_calc
SRC = "/workspace/tripo-cat/value.fd42aa9c3d62dd1e836d8825fb196fb364c05a6c8c143a159d42705235e421fa.glb"
OUT = "/workspace/tripo-cat"; PR = OUT + "/proof"; os.makedirs(PR, exist_ok=True)
GLB = OUT + "/cat-rigged.glb"
H = 1.2; ZC = 0.628                        # height; neck cut
BOX = (-0.21, 0.21, 0.655, 0.935)          # face decal: x0 x1 z0 z1 (Blender, front view) -> u,v 0..1
DW, DH = 1536, 1024
P = "mixamorig:"
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- source + scale ----------
bpy.ops.import_scene.gltf(filepath=SRC)
src = [o for o in bpy.data.objects if o.type == "MESH"][0]
for o in list(bpy.data.objects):
    if o != src: bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = src.data
zs = [v.co.z for v in me.vertices]; s = H / (max(zs) - min(zs))
me.transform(Matrix.Rotation(math.radians(-90), 4, "Z") @ Matrix.Scale(s, 4))
me.transform(Matrix.Translation((0, 0, -min(v.co.z for v in me.vertices))))
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
print("height", max(v.co.z for v in me.vertices))

mat = me.materials[0]
bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
def upstream_image(sock):
    n = sock.links[0].from_node
    while n.type != "TEX_IMAGE": n = n.inputs[0].links[0].from_node
    return n
base_node = upstream_image(bsdf.inputs["Base Color"]); IMG = base_node.image
TW, TH = IMG.size

# ---------- split Head / Body (flood fill above the neck cut) ----------
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
seed = max(bm.faces, key=lambda f: f.calc_center_median().z)
head = {seed.index}; stack = [seed]
while stack:
    f = stack.pop()
    for e in f.edges:
        for g in e.link_faces:
            if g.index not in head and g.calc_center_median().z > ZC:
                head.add(g.index); stack.append(g)
low = [bm.faces[i].calc_center_median() for i in head if bm.faces[i].calc_center_median().z < 0.66]
print("head faces", len(head), "of", len(bm.faces), "low max|x|", round(max(abs(c.x) for c in low), 3))
bm.free()
def subset(name, keep):
    o = src.copy(); o.data = src.data.copy(); o.name = o.data.name = name; sc.collection.objects.link(o)
    b = bmesh.new(); b.from_mesh(o.data); b.faces.ensure_lookup_table()
    bmesh.ops.delete(b, geom=[f for f in b.faces if not keep(f.index)], context="FACES")
    b.to_mesh(o.data); b.free(); return o
HEAD = subset("Head", lambda i: i in head)
BODY = subset("Body", lambda i: i not in head)
bpy.data.objects.remove(src)
# materials: one per object (same painted texture), slot names the game addresses
mb = mat.copy(); mb.name = "body"; BODY.data.materials[0] = mb
mh = mat.copy(); mh.name = "head"; HEAD.data.materials[0] = mh
# overlapping neck seam: the body's top ring extruded 1.8 cm up and 12% in, hidden inside the head
b = bmesh.new(); b.from_mesh(BODY.data)
ring = [e for e in b.edges if e.is_boundary and min(v.co.z for v in e.verts) > ZC - 0.03]
ext = bmesh.ops.extrude_edge_only(b, edges=ring)
cx = sum(v.co.x for e in ring for v in e.verts) / (2 * len(ring)); cy = sum(v.co.y for e in ring for v in e.verts) / (2 * len(ring))
for v in [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]:
    v.co.x = cx + (v.co.x - cx) * 0.88; v.co.y = cy + (v.co.y - cy) * 0.88; v.co.z += 0.018
b.normal_update(); b.to_mesh(BODY.data); b.free()
print("collar ring edges", len(ring))

# ---------- armature ----------
J = {  # head, tail (Blender coords, measured off the mesh)
 "Hips": ((0, -0.04, 0.36), (0, -0.045, 0.42)), "Spine": ((0, -0.045, 0.42), (0, -0.048, 0.48)),
 "Spine1": ((0, -0.048, 0.48), (0, -0.05, 0.54)), "Spine2": ((0, -0.05, 0.54), (0, -0.045, 0.595)),
 "Neck": ((0, -0.045, 0.595), (0, -0.04, 0.632)), "Head": ((0, -0.04, 0.632), (0, -0.04, 1.05)),
 "Tail1": ((0.05, 0.14, 0.34), (0.16, 0.125, 0.30)), "Tail2": ((0.16, 0.125, 0.30), (0.21, 0.115, 0.39)),
 "Tail3": ((0.21, 0.115, 0.39), (0.285, 0.105, 0.53))}
for sd, k in (("Left", 1), ("Right", -1)):
    J[sd + "Shoulder"] = ((0.025 * k, -0.035, 0.585), (0.095 * k, -0.025, 0.598))
    J[sd + "Arm"] = ((0.095 * k, -0.025, 0.598), (0.245 * k, -0.025, 0.598))
    J[sd + "ForeArm"] = ((0.245 * k, -0.025, 0.598), (0.36 * k, -0.025, 0.598))
    J[sd + "Hand"] = ((0.36 * k, -0.025, 0.598), (0.43 * k, -0.03, 0.598))
    J[sd + "UpLeg"] = ((0.06 * k, -0.035, 0.36), (0.092 * k, -0.035, 0.19))
    J[sd + "Leg"] = ((0.092 * k, -0.035, 0.19), (0.098 * k, -0.03, 0.065))
    J[sd + "Foot"] = ((0.098 * k, -0.03, 0.065), (0.10 * k, -0.10, 0.025))
    J[sd + "ToeBase"] = ((0.10 * k, -0.10, 0.025), (0.10 * k, -0.15, 0.02))
PAR = {"Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck", "Tail1": "Hips", "Tail2": "Tail1", "Tail3": "Tail2"}
for sd in ("Left", "Right"):
    PAR.update({sd + "Shoulder": "Spine2", sd + "Arm": sd + "Shoulder", sd + "ForeArm": sd + "Arm", sd + "Hand": sd + "ForeArm",
                sd + "UpLeg": "Hips", sd + "Leg": sd + "UpLeg", sd + "Foot": sd + "Leg", sd + "ToeBase": sd + "Foot"})
CONN = {"Spine", "Spine1", "Spine2", "Neck", "Head", "Tail2", "Tail3"} | {sd + n for sd in ("Left", "Right") for n in ("Arm", "ForeArm", "Hand", "Leg", "Foot", "ToeBase")}
arm_data = bpy.data.armatures.new("Armature"); ARM = bpy.data.objects.new("Armature", arm_data); sc.collection.objects.link(ARM)
bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = ARM; ARM.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for n, (h, t) in J.items():
    eb = arm_data.edit_bones.new(P + n); eb.head, eb.tail = h, t
    eb.roll = 0
for n, p in PAR.items():
    eb = arm_data.edit_bones[P + n]; eb.parent = arm_data.edit_bones[P + p]; eb.use_connect = n in CONN
for sd, k in (("Left", 1), ("Right", -1)):   # arms: Z axis up-ish, legs: forward, like Mixamo
    for n in ("Shoulder", "Arm", "ForeArm", "Hand"): arm_data.edit_bones[P + sd + n].align_roll(Vector((0, 0, 1)))
    for n in ("UpLeg", "Leg", "Foot", "ToeBase"): arm_data.edit_bones[P + sd + n].align_roll(Vector((0, -1, 0)))
for n in ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"): arm_data.edit_bones[P + n].align_roll(Vector((0, -1, 0)))
bpy.ops.object.mode_set(mode="OBJECT")
BONES = [P + n for n in J]

# ---------- weights ----------
bpy.ops.object.select_all(action="DESELECT"); BODY.select_set(True); ARM.select_set(True); bpy.context.view_layer.objects.active = ARM
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
def segd(p, a, b):
    a, b = Vector(a), Vector(b); ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length, t
TAIL = ["Tail1", "Tail2", "Tail3"]
LEGS = {P + sd + n for sd in ("Left", "Right") for n in ("UpLeg", "Leg", "Foot", "ToeBase")}
ARMS = {P + sd + n for sd in ("Left", "Right") for n in ("Arm", "ForeArm", "Hand")}
def tailinfo(p):
    best = (9, 0, 0)
    for i, n in enumerate(TAIL):
        d, t = segd(p, *J[n]); best = min(best, (d, i, t))
    return best
def is_tail(p):
    d, i, t = tailinfo(p)
    return d < 0.04 and not (i == 0 and t < 0.12) and (p.y > 0.115 or p.x > 0.13)
G = {g.name: g for g in BODY.vertex_groups}
for n in BONES:
    if n not in G: G[n] = BODY.vertex_groups.new(name=n)
gidx = {g.index: g.name for g in BODY.vertex_groups}
unweighted = 0
for v in BODY.data.vertices:
    p = v.co; w = {gidx[g.group]: g.weight for g in v.groups if g.weight > 1e-4}
    if is_tail(p):
        d, i, t = tailinfo(p); w = {}
        if i == 0 and t < 0.3: w[P + "Hips"] = 1 - t / 0.3; w[P + "Tail1"] = t / 0.3
        elif t > 0.75 and i < 2: w[P + TAIL[i]] = 1 - (t - 0.75) / 0.5; w[P + TAIL[i + 1]] = (t - 0.75) / 0.5
        elif t < 0.25 and i > 0: w[P + TAIL[i]] = 0.5 + t / 0.5; w[P + TAIL[i - 1]] = 0.5 - t / 0.5
        else: w[P + TAIL[i]] = 1
    else:
        for n in TAIL: w.pop(P + n, None)
        if p.z > 0.43: [w.pop(n, None) for n in LEGS]
        if abs(p.x) < 0.085 or (p.z < 0.52 and abs(p.x) < 0.12): [w.pop(n, None) for n in ARMS]
        if p.z > 0.6 and abs(p.x) < 0.075:
            hw = min(1, max(0, (p.z - 0.605) / 0.023)); w = {P + "Neck": 1 - hw, P + "Head": hw}
        if p.z < 0.33 and abs(p.x) > 0.02: [w.pop(n, None) for n in (P + "Spine", P + "Spine1", P + "Spine2")]
    w = {k: x for k, x in w.items() if x > 1e-4}
    if not w:
        unweighted += 1
        cand = [n for n in BONES if not any(t in n for t in TAIL)]
        w = {min(cand, key=lambda n: segd(p, *J[n[len(P):]])[0]): 1.0}
    tot = sum(w.values())
    for g in list(v.groups): BODY.vertex_groups[g.group].remove([v.index])
    for k, x in w.items(): G[k].add([v.index], x / tot, "REPLACE")
print("body verts fixed by nearest-bone fallback", unweighted)
def skin_to_head(o):
    o.parent = ARM; m = o.modifiers.new("Armature", "ARMATURE"); m.object = ARM
    g = o.vertex_groups.new(name=P + "Head"); g.add([v.index for v in o.data.vertices], 1.0, "REPLACE")
skin_to_head(HEAD)

# ---------- texture: paint out eyes, nose, mouth under the decal ----------
px = np.empty(TW * TH * 4, np.float32); IMG.pixels.foreach_get(px); px = px.reshape(TH, TW, 4)
orig_px = px.copy()
def rgb_stats(a):
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); return mx, mn
def furlike(a):
    mx, mn = rgb_stats(a); return (a[..., 0] >= a[..., 1]) & (a[..., 1] >= a[..., 2] - 0.02) & (a[..., 0] - a[..., 2] > 0.25) & ((mx - mn) / np.maximum(mx, 1e-3) > 0.38)
def creamlike(a):
    mx, mn = rgb_stats(a); return (mn > 0.66) & (mx - mn < 0.2)
def muzzle_top(x): return 0.75 + 0.028 * np.maximum(0, 1 - (np.abs(x) / 0.085) ** 2)
hm = HEAD.data; hm.calc_loop_triangles(); uvl = hm.uv_layers.active.data
samples_xyz = []; samples_ij = []
for t in hm.loop_triangles:
    c = t.center
    if not (-0.235 < c.x < 0.235 and 0.64 < c.z < 0.95 and c.y < 0 and t.normal.y < 0.25): continue
    UV = np.array([uvl[l].uv[:] for l in t.loops]) * [TW, TH]; X = np.array([hm.vertices[i].co[:] for i in t.vertices])
    x0, y0 = np.floor(UV.min(0)).astype(int); x1, y1 = np.ceil(UV.max(0)).astype(int)
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx_, cy_) = UV; den = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
    if abs(den) < 1e-9: continue
    l1 = ((by - cy_) * (gx - cx_) + (cx_ - bx) * (gy - cy_)) / den; l2 = ((cy_ - ay) * (gx - cx_) + (ax - cx_) * (gy - cy_)) / den; l3 = 1 - l1 - l2
    ins = (l1 > -0.02) & (l2 > -0.02) & (l3 > -0.02)
    if not ins.any(): continue
    L = np.stack([l1[ins], l2[ins], l3[ins]], 1)
    samples_xyz.append(L @ X); samples_ij.append(np.stack([np.floor(gy[ins]).astype(int) % TH, np.floor(gx[ins]).astype(int) % TW], 1))
XYZ = np.concatenate(samples_xyz); IJ = np.concatenate(samples_ij)
x, z = XYZ[:, 0], XYZ[:, 2]; col = px[IJ[:, 0], IJ[:, 1]]
eye = np.zeros(len(x), bool)
for k in (-1, 1): eye |= ((x - 0.116 * k) / 0.094) ** 2 + ((z - 0.818) / 0.094) ** 2 < 1
eye |= (np.abs(x) > 0.06) & (np.abs(x) < 0.215) & (z > 0.83) & (z < 0.918)
mouth = (np.abs(x) < 0.078) & (z > 0.68) & (z < 0.772)
fl = furlike(col[None])[0]; cl = creamlike(col[None])[0]
fur_c = np.median(col[eye & fl], 0); cream_c = np.median(col[mouth & cl], 0)
under = z < muzzle_top(x)
rep_eye = eye & ~fl; rep_m = mouth & ~cl & ~eye
newc = np.where((under & rep_eye)[:, None] | rep_m[:, None], cream_c, fur_c)
rep = rep_eye | rep_m
px[IJ[rep, 0], IJ[rep, 1], :3] = newc[rep, :3]
print("paint-out texels", int(rep.sum()), "fur", np.round(fur_c[:3], 3), "cream", np.round(cream_c[:3], 3))
def save_img(name, arr, path, fmt):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=arr.shape[2] == 4)
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw = path; im.file_format = fmt; im.save()
    bpy.data.images.remove(im); return bpy.data.images.load(path)
PAINT = save_img("cat_base", px, OUT + "/cat-base.jpg", "JPEG")
for m in (mb, mh):
    next(n for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image == IMG).image = PAINT
# fur-greyscale version (cream / eyes / nose stay): fur becomes its luminance, lifted so the game's tint multiplies cleanly
g = px.copy(); flm = furlike(g)
lum = 0.2126 * g[..., 0] + 0.7152 * g[..., 1] + 0.0722 * g[..., 2]
fl_mean = lum[flm].mean(); gv = np.clip(lum / fl_mean * 0.86, 0, 1)
for ch in range(3): g[..., ch] = np.where(flm, gv, g[..., ch])
save_img("cat_base_grey", g, OUT + "/cat-body-fur-grey.png", "PNG")

# ---------- face decal mesh ----------
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(HEAD, dg)
NX, NZ = 90, 60
grid = {}
for j in range(NZ + 1):
    for i in range(NX + 1):
        u, v = i / NX, j / NZ; X = BOX[0] + u * (BOX[1] - BOX[0]); Z = BOX[2] + v * (BOX[3] - BOX[2])
        hit = bvh.ray_cast(Vector((X, -1, Z)), Vector((0, 1, 0)))
        if hit[0] is not None and hit[0].y < 0.05: grid[i, j] = (hit[0] + hit[1].normalized() * 0.0006, (u, v))
verts, uvs, faces, vid = [], [], [], {}
for (i, j), (co, uv) in grid.items(): vid[i, j] = len(verts); verts.append(co); uvs.append(uv)
for j in range(NZ):
    for i in range(NX):
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if all(k in vid for k in q):
            ys = [grid[k][0].y for k in q]
            if max(ys) - min(ys) < 0.02: faces.append([vid[k] for k in q])
fm = bpy.data.meshes.new("Face"); fm.from_pydata([v[:] for v in verts], [], faces); fm.update()
fl_uv = fm.uv_layers.new(name="UVMap")
for poly in fm.polygons:
    for li in poly.loop_indices: fl_uv.data[li].uv = uvs[fm.loops[li].vertex_index]
for poly in fm.polygons: poly.use_smooth = True
FACE = bpy.data.objects.new("Face", fm); sc.collection.objects.link(FACE)
skin_to_head(FACE)
print("face decal verts", len(verts), "quads", len(faces))

# neutral decal = front ortho render of the head with the original texture, alpha where the paint-out changed it
cam_d = bpy.data.cameras.new("decal"); cam_d.type = "ORTHO"; cam_d.ortho_scale = BOX[1] - BOX[0]
camo = bpy.data.objects.new("decalcam", cam_d); sc.collection.objects.link(camo)
camo.location = (0, -5, (BOX[2] + BOX[3]) / 2); camo.rotation_euler = (math.radians(90), 0, 0)
sc.camera = camo; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x, sc.render.resolution_y = DW, DH
sc.render.resolution_percentage = 100; sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "TEXTURE"
sc.view_settings.view_transform = "Standard"; sc.render.film_transparent = True
for o in (BODY, FACE): o.hide_render = True
hn = next(n for n in mh.node_tree.nodes if n.type == "TEX_IMAGE" and n.image == PAINT); mh.node_tree.nodes.active = hn
def rshot(path):
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path); a = np.empty(DW * DH * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(DH, DW, 4)
ORIG = save_img("cat_orig", orig_px, "/tmp/cat-orig.png", "PNG")
hn.image = ORIG; A0 = rshot("/tmp/decal_orig.png")
hn.image = PAINT; A1 = rshot("/tmp/decal_paint.png")
d = np.abs(A0[..., :3] - A1[..., :3]).max(-1)
a = np.clip((d - 0.02) / 0.05, 0, 1)
for _ in range(3):  # dilate 3 px
    b_ = a.copy(); b_[1:] = np.maximum(b_[1:], a[:-1]); b_[:-1] = np.maximum(b_[:-1], a[1:]); b_[:, 1:] = np.maximum(b_[:, 1:], b_[:, :-1].copy()); b_[:, :-1] = np.maximum(b_[:, :-1], b_[:, 1:].copy()); a = b_
k = np.ones(3) / 3
a = np.apply_along_axis(lambda r: np.convolve(r, k, "same"), 1, a); a = np.apply_along_axis(lambda c: np.convolve(c, k, "same"), 0, a)
dec = A0.copy(); dec[..., 3] = a * (A0[..., 3] > 0.5)
DECAL = save_img("face_neutral", dec, OUT + "/face-neutral.png", "PNG")
bpy.data.images.remove(ORIG)
mf = bpy.data.materials.new("face"); mf.use_nodes = True; nt = mf.node_tree
fb = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = DECAL
nt.links.new(ti.outputs["Color"], fb.inputs["Base Color"]); nt.links.new(ti.outputs["Alpha"], fb.inputs["Alpha"])
fb.inputs["Roughness"].default_value = 0.5
mf.surface_render_method = "BLENDED"; mf.use_backface_culling = True
fm.materials.append(mf)
for o in (BODY, FACE): o.hide_render = False
bpy.data.objects.remove(camo)

# ---------- outfit: crop top + shorts from the body's own faces ----------
def grad_img(name, rows):  # rows: list of (frac_end, rgb hex); vertical strip texture, v=0 bottom
    hgt = 128; arr = np.zeros((hgt, 4, 4), np.float32); arr[..., 3] = 1
    for r in range(hgt):
        f = (r + 0.5) / hgt; hx = next(c for e, c in rows if f <= e)
        rgb = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]; arr[r, :, :3] = rgb
    return save_img(name, arr, f"{OUT}/{name}.png", "PNG")
def cloth_mat(name, img, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    bs = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    t.extension = "EXTEND"; nt.links.new(t.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = rough
    return m
body_bvh = BVHTree.FromObject(BODY, bpy.context.evaluated_depsgraph_get())
def make_cloth(name, keep, offset, uvfun, material, drape=False):
    o = BODY.copy(); o.data = BODY.data.copy(); o.name = o.data.name = name; sc.collection.objects.link(o)
    o.vertex_groups.clear(); o.modifiers.clear(); o.parent = None
    b = bmesh.new(); b.from_mesh(o.data)
    bmesh.ops.delete(b, geom=[f for f in b.faces if not keep(f.calc_center_median())], context="FACES")
    # keep the largest connected piece(s) only above a size (drops stray islands)
    for _ in range(6): bmesh.ops.smooth_vert(b, verts=[v for v in b.verts if not v.is_boundary], factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for _ in range(2): bmesh.ops.smooth_vert(b, verts=[v for v in b.verts if v.is_boundary], factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    b.normal_update()
    if drape:  # cloth falls from the chest instead of hugging under it
        bins = {}
        for v in b.verts:
            if v.co.y < -0.02: bins.setdefault(round(v.co.x / 0.01), []).append(v)
        for vs in bins.values():
            vs.sort(key=lambda v: -v.co.z); ymin, zat = 9, 0
            for v in vs:
                if v.co.y < ymin: ymin, zat = v.co.y, v.co.z
                v.co.y = min(v.co.y, ymin + 0.3 * (zat - v.co.z))
        b.normal_update()
    for v in b.verts: v.co += v.normal * offset
    bnd = [v.co.copy() for v in b.verts if v.is_boundary]
    from mathutils.kdtree import KDTree
    kd = KDTree(len(bnd)); [kd.insert(c, i) for i, c in enumerate(bnd)]; kd.balance()
    uv = b.loops.layers.uv.verify()
    for f in b.faces:
        f.smooth = True
        for l in f.loops: l[uv].uv = uvfun(l.vert.co, kd.find(l.vert.co)[2])
    b.to_mesh(o.data); b.free()
    o.data.materials.clear(); o.data.materials.append(material)
    sol = o.modifiers.new("solid", "SOLIDIFY"); sol.thickness = 0.003; sol.offset = 1; sol.use_rim = True; sol.use_even_offset = True
    bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.modifier_apply(modifier="solid")
    sm = o.modifiers.new("sub", "SUBSURF"); sm.levels = 1; sm.render_levels = 1
    bpy.ops.object.modifier_apply(modifier="sub")
    # weights from the body: nearest body face, interpolated
    bw = {gr.name: gr for gr in o.vertex_groups}
    for n in BONES: bw.setdefault(n, o.vertex_groups.new(name=n))
    bidx = {gg.index: gg.name for gg in BODY.vertex_groups}; bd = BODY.data
    for v in o.data.vertices:
        loc, nrm, fi, dist = body_bvh.find_nearest(v.co)
        poly = bd.polygons[fi]; cos = [bd.vertices[i].co for i in poly.vertices]
        ws = interpolate_poly_3d_calc(cos, loc); acc = {}
        for vi, wt in zip(poly.vertices, ws):
            for gg in bd.vertices[vi].groups: acc[bidx[gg.group]] = acc.get(bidx[gg.group], 0) + wt * gg.weight
        tot = sum(acc.values()) or 1
        for kk, x in acc.items():
            if x / tot > 1e-3: bw[kk].add([v.index], x / tot, "REPLACE")
    o.parent = ARM; m = o.modifiers.new("Armature", "ARMATURE"); m.object = ARM
    print(name, "verts", len(o.data.vertices), "tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
    return o
top_img = grad_img("cloth_top_tex", [(0.22, "#d98a9a"), (1.0, "#f3ead8")])
bot_img = grad_img("cloth_bottom_tex", [(0.2, "#4a6c9c"), (0.24, "#3f5f8c"), (1.0, "#5b7fb0")])
def top_keep(c):
    if is_tail(c): return False
    if not (0.47 < c.z < 0.626): return False
    if abs(c.x) > 0.158: return False
    if c.z > 0.575 and abs(c.x) < 0.062 and c.y < 0.0: return False     # round front neckline
    if c.z > 0.592 and abs(c.x) < 0.058: return False                    # back of the neck
    return True
def bot_keep(c):
    if is_tail(c) or (c - Vector(J["Tail1"][0])).length < 0.03: return False   # tail hole
    return 0.245 < c.z < 0.435
TOP = make_cloth("ClothTop", top_keep, 0.005, lambda co, d: (0.5, min(1, d / 0.036)), cloth_mat("cloth_top", top_img, 0.75), drape=True)
BOT = make_cloth("ClothBottom", bot_keep, 0.006, lambda co, d: (0.5, (min(1, (0.435 - co.z) / 0.06) if co.z > 0.375 else 1.0)), cloth_mat("cloth_bottom", bot_img, 0.85))

# ---------- clips ----------
for pb in ARM.pose.bones: pb.rotation_mode = "QUATERNION"
def rest3(n): return ARM.data.bones[P + n].matrix_local.to_3x3()
def wrot(n, R):
    M = rest3(n); ARM.pose.bones[P + n].rotation_quaternion = (M.inverted() @ R @ M).to_quaternion()
def Rx(a): return Matrix.Rotation(math.radians(a), 3, "X")
def Ry(a): return Matrix.Rotation(math.radians(a), 3, "Y")
def Rz(a): return Matrix.Rotation(math.radians(a), 3, "Z")
def wloc(n, v): ARM.pose.bones[P + n].location = rest3(n).inverted() @ Vector(v)
def clear_pose():
    for pb in ARM.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def key_all(f):
    for pb in ARM.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
ARM.animation_data_create()
def pose_idle(ph):
    clear_pose(); b = math.sin(ph)
    wrot("Spine", Rx(-1.5 * b)); wrot("Spine2", Rx(-1.5 * b)); wrot("Neck", Rx(1.0 * b)); wrot("Head", Rx(1.0 * b) @ Rz(2 * math.sin(ph * 0.5)))
    wrot("LeftArm", Ry(62 + 2 * b)); wrot("RightArm", Ry(-62 - 2 * b)); wrot("LeftForeArm", Rz(-8)); wrot("RightForeArm", Rz(8))
    wloc("Hips", (0, 0, 0.002 * b))
    for i, n in enumerate(TAIL): wrot(n, Rz(10 * math.sin(ph - i * 0.7)) @ Rx(3 * math.sin(ph * 2 - i)))
def pose_walk(ph):
    clear_pose(); s = math.sin(ph); c = math.cos(ph)
    wloc("Hips", (0, 0, 0.012 * math.cos(2 * ph) - 0.006)); wrot("Hips", Rz(4 * s))
    wrot("Spine", Rz(-3 * s) @ Rx(-3)); wrot("Spine2", Rz(-3 * s)); wrot("Head", Rz(2 * s))
    for sd, sg in (("Left", 1), ("Right", -1)):
        sw = sg * s; cc = sg * c
        wrot(sd + "UpLeg", Rx(-26 * sw))                       # negative = thigh forward
        wrot(sd + "Leg", Rx(max(0, 40 * cc) + 6))              # knee bends while the leg swings through
        wrot(sd + "Foot", Rx(-10 * sw))
        wrot(sd + "Arm", Rx(22 * sw) @ Ry(62 * sg)); wrot(sd + "ForeArm", Rz(-12 * sg))
    for i, n in enumerate(TAIL): wrot(n, Rz(12 * math.sin(ph * 1 - i * 0.8)) @ Rx(4 * math.sin(2 * ph - i)))
for name, fr, fn in (("Idle", 48, pose_idle), ("Walk", 24, pose_walk)):
    act = bpy.data.actions.new(name); act.use_fake_user = True; ARM.animation_data.action = act
    for f in range(0, fr + 1, 2): fn(2 * math.pi * f / fr); key_all(f + 1)
ARM.animation_data.action = None; clear_pose()

# ---------- export + audit ----------
for o in (BODY, HEAD, FACE, TOP, BOT, ARM): o.select_set(True)
sc.frame_set(1)
bpy.ops.export_scene.gltf(filepath=GLB, export_apply=False, export_morph=True, export_skins=True, export_animation_mode="ACTIONS",
                          export_image_format="AUTO", use_selection=False)
SAVE = OUT + "/cat-rigged.blend"; bpy.ops.wm.save_as_mainfile(filepath=SAVE)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
dg = bpy.context.evaluated_depsgraph_get()
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
print("AUDIT bones", len(arm.data.bones), [b.name for b in arm.data.bones])
tris = 0; zall = []
for o in bpy.data.objects:
    if o.type != "MESH": continue
    e = o.evaluated_get(dg); m = e.to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
    zall += [(e.matrix_world @ v.co).z for v in m.vertices]
    print("AUDIT mesh", o.name, "mats", [mm.name for mm in o.data.materials], "tris", len(m.loop_triangles),
          "shapekeys", [k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [], "skinned", any(md.type == "ARMATURE" for md in o.modifiers) or bool(o.parent))
    e.to_mesh_clear()
print("AUDIT actions", [a.name for a in bpy.data.actions], "tris", tris, "height", round(max(zall) - min(zall), 4), "minz", round(min(zall), 4))
print("AUDIT size MB", round(os.path.getsize(GLB) / 1e6, 2))

# ---------- proofs ----------
bpy.ops.wm.open_mainfile(filepath=SAVE)
sc = bpy.context.scene; ARM = bpy.data.objects["Armature"]
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.use_denoising = True; sc.render.film_transparent = False
sc.render.resolution_x = sc.render.resolution_y = 656; sc.view_settings.view_transform = "Standard"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.56, 0.56, 0.56, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
camd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", camd); sc.collection.objects.link(cam); sc.camera = cam
ld = bpy.data.lights.new("key", "AREA"); ld.size = 1.2; L = bpy.data.objects.new("key", ld); sc.collection.objects.link(L)
def shoot(path, target, yaw, dist, lens, elev=0.0):
    t = Vector(target); d = Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), elev)).normalized()
    cam.location = t + d * dist; camd.lens = lens
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    L.location = t + (d + Vector((0.25, 0, 0.35))).normalized() * dist * 0.9; L.rotation_euler = (t - L.location).to_track_quat("-Z", "Y").to_euler()
    ld.energy = 120 * dist ** 2
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
for pb in ARM.pose.bones: pb.rotation_mode = "QUATERNION"
def rest3(n): return ARM.data.bones[P + n].matrix_local.to_3x3()
def wrot(n, R): M = rest3(n); ARM.pose.bones[P + n].rotation_quaternion = (M.inverted() @ R @ M).to_quaternion()
def clear_pose():
    for pb in ARM.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
ARM.animation_data.action = None; clear_pose(); bpy.context.view_layer.update()
FACEO, HEADO = bpy.data.objects["Face"], bpy.data.objects["Head"]
cloth = [bpy.data.objects["ClothTop"], bpy.data.objects["ClothBottom"]]
# face: front + 3/4 with decal, front with the decal hidden (paint-out underneath)
shoot(f"{PR}/f1.png", (0, -0.1, 0.8), 0, 1.25, 85)
shoot(f"{PR}/f2.png", (0, -0.1, 0.8), 35, 1.25, 85)
FACEO.hide_render = True; shoot(f"{PR}/f3.png", (0, -0.1, 0.8), 0, 1.25, 85); FACEO.hide_render = False
# body: front side back (clothed), extreme pose front + side (clothed), front unclothed
shoot(f"{PR}/b1.png", (0, 0, 0.62), 0, 3.4, 85); shoot(f"{PR}/b2.png", (0, 0, 0.62), 90, 3.4, 85); shoot(f"{PR}/b3.png", (0, 0, 0.62), 180, 3.4, 85)
wrot("LeftArm", Matrix.Rotation(math.radians(60), 3, "Y")); wrot("RightArm", Matrix.Rotation(math.radians(-60), 3, "Y"))
wrot("LeftUpLeg", Matrix.Rotation(math.radians(-70), 3, "X")); wrot("LeftLeg", Matrix.Rotation(math.radians(70), 3, "X"))
wrot("Head", Matrix.Rotation(math.radians(30), 3, "Z")); bpy.context.view_layer.update()
shoot(f"{PR}/b4.png", (0, 0, 0.62), 25, 3.4, 85); shoot(f"{PR}/b5.png", (0, 0, 0.62), 90, 3.4, 85)
clear_pose(); bpy.context.view_layer.update()
for o in cloth: o.hide_render = True
shoot(f"{PR}/b6.png", (0, 0, 0.62), 0, 3.4, 85)
for o in cloth: o.hide_render = False
ARM.animation_data.action = bpy.data.actions["Walk"]
for i, f in enumerate((1, 7, 13, 19)):
    sc.frame_set(f); shoot(f"{PR}/w{i}.png", (0, 0, 0.6), 90, 3.4, 85)
print("PROOFS DONE")
