# Reshape a live critter head .glb: sculpted skull (radial warp applied to basis AND every shape key,
# so eyes/nose/mouth ride the new surface) + rebuilt cupped, thick ears (old ear islands replaced,
# weights to EarL/EarR, shape-key deltas carried from the nearest old ear vertex). Rig, slots, names kept.
# usage: blender -b --factory-startup --python-exit-code 1 --python reshape.py -- <in.glb> <species> <out.glb> <proof.png>
import bpy, bmesh, sys, math, os
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index("--") + 1:]
SRC, SPN, OUT, PROOF = a[0], a[1], a[2], a[3]

# warp bumps: (dir x,y,z (y = front, z = up), amplitude, sigma) in head-radius units; top = crown flatten
G = dict(brow=[((0.36, 0.80, 0.34), 0.06, 0.20)], back=[((0, -0.9, 0.2), 0.05, 0.6)])
SP = {
 "cat":     dict(top=0.10, cheek=0.11, cheekD=(0.70, 0.45, -0.35), cheekS=0.30, muz=0.07, muzS=0.26, chin=0.05, wide=1.05,
                 ear=dict(h=0.92, w=0.92, a=1.3, b=1.0, T=0.26, D=0.40, bend=0.0, flare=0.30, tipr=0.14)),
 "dog":     dict(top=0.12, cheek=0.07, cheekD=(0.70, 0.45, -0.40), cheekS=0.32, muz=0.30, muzS=0.23, chin=0.08, wide=1.08,
                 ear=dict(h=1.0, w=0.62, a=2.0, b=1.6, T=0.20, D=0.30, bend=0.10, flare=0.25)),
 "fox":     dict(top=0.10, cheek=0.06, cheekD=(0.78, 0.30, -0.40), cheekS=0.30, muz=0.34, muzS=0.21, chin=0.04, wide=1.0,
                 ear=dict(h=1.1, w=0.44, a=1.0, b=1.0, T=0.19, D=0.36, bend=0.0, flare=0.30)),
 "wolf":    dict(top=0.12, cheek=0.07, cheekD=(0.78, 0.30, -0.40), cheekS=0.30, muz=0.34, muzS=0.22, chin=0.06, wide=1.04,
                 ear=dict(h=1.05, w=0.48, a=1.0, b=1.1, T=0.24, D=0.32, bend=0.0, flare=0.32)),
 "bunny":   dict(top=0.08, cheek=0.13, cheekD=(0.66, 0.45, -0.40), cheekS=0.30, muz=0.06, muzS=0.22, chin=0.04, wide=1.02,
                 ear=dict(h=1.0, w=0.40, a=2.0, b=2.0, T=0.20, D=0.34, bend=0.12, flare=0.25)),
 "mouse":   dict(top=0.08, cheek=0.13, cheekD=(0.66, 0.45, -0.40), cheekS=0.30, muz=0.09, muzS=0.22, chin=0.04, wide=1.02,
                 ear=dict(h=1.0, w=0.95, a=2.0, b=2.0, T=0.16, D=0.30, bend=0.0, flare=0.22)),
 "bear":    dict(top=0.16, cheek=0.09, cheekD=(0.72, 0.40, -0.40), cheekS=0.34, muz=0.12, muzS=0.26, chin=0.09, wide=1.10,
                 ear=dict(h=1.0, w=0.95, a=2.0, b=2.0, T=0.20, D=0.30, bend=0.0, flare=0.25)),
 "raccoon": dict(top=0.10, cheek=0.10, cheekD=(0.80, 0.25, -0.35), cheekS=0.26, muz=0.30, muzS=0.21, chin=0.04, wide=1.04,
                 ear=dict(h=1.0, w=0.62, a=1.4, b=1.5, T=0.20, D=0.32, bend=0.0, flare=0.28)),
}[SPN]
K = float(os.environ.get("K", "1.8"))
for _k in ("top", "cheek", "muz", "chin"): SP[_k] *= K
SP["wide"] = 1 + (SP["wide"] - 1) * K

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
head = next(o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys)
me = head.data
MI = {m.name: i for i, m in enumerate(me.materials)}
gidx = {g.name: g.index for g in head.vertex_groups}
def wt(v, name):
    gi = gidx.get(name)
    for g in v.groups:
        if g.group == gi: return g.weight
    return 0.0
tri0 = sum(len(p.vertices) - 2 for p in me.polygons)

# ---- islands
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
seen = set(); islands = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; isl = []; seen.add(v.index)
    while st:
        x = st.pop(); isl.append(x.index)
        for e in x.link_edges:
            o = e.other_vert(x)
            if o.index not in seen: seen.add(o.index); st.append(o)
    islands.append(isl)
bm.free()
V = me.vertices
ear_isl = {"EarL": [], "EarR": []}
for isl in islands:
    for side in ear_isl:
        if len(isl) < 3000 and sum(wt(V[i], side) for i in isl) / len(isl) > 0.5: ear_isl[side].append(isl)
skull = max(islands, key=len)
xs = [V[i].co for i in skull]
lo = Vector([min(c[k] for c in xs) for k in range(3)]); hi = Vector([max(c[k] for c in xs) for k in range(3)])
# the biggest island may include the neck; take head-dominant verts of it
hv = [V[i].co for i in skull if wt(V[i], "Head") > 0.5] or xs
lo = Vector([min(c[k] for c in hv) for k in range(3)]); hi = Vector([max(c[k] for c in hv) for k in range(3)])
R = (hi.x - lo.x) / 2
C = Vector((0, hi.y - R, hi.z - R))
print("C", C, "R", R, "tri0", tri0, "earIslands", {k: len(v) for k, v in ear_isl.items()})

def g(d, c, s):
    c = Vector(c).normalized(); return math.exp(-(d - c).length_squared / (2 * s * s))
def mult(d):
    s = 1.0
    for side in (1, -1):
        cd = SP["cheekD"]; s += SP["cheek"] * g(d, (side * cd[0], cd[1], cd[2]), SP["cheekS"])
        for c, amp, sg in G["brow"]: s += amp * g(d, (side * c[0], c[1], c[2]), sg)
    for c, amp, sg in G["back"]: s += amp * g(d, c, sg)
    s += SP["muz"] * g(d, (0, 0.93, -0.36), SP["muzS"])
    s += SP["chin"] * g(d, (0, 0.55, -0.83), 0.25)
    s -= 0.06 * g(d, (0, -0.2, -0.98), 0.35)          # tuck under the skull back toward the neck
    if d.z > 0.45: s -= SP["top"] * ((d.z - 0.45) / 0.55) ** 2
    return s
def warp(p):
    q = (p - C) / R
    L = q.length
    if L < 1e-5: return p.copy()
    d = q / L
    m = mult(d)
    fall = min(1.0, max(0.0, (L - 0.15) / 0.5))       # interior (eye domes' backs) eases to rigid
    m = 1 + (m - 1) * fall
    q2 = q * m
    q2.x *= 1 + (SP["wide"] - 1) * max(0.0, 1 - abs(d.y))  # broaden the sides, not the face
    return C + q2 * R
def headw(i):
    v = V[i]; return wt(v, "Head")
skip = set(i for side in ear_isl for isl in ear_isl[side] for i in isl)
KB = me.shape_keys.key_blocks
basis = [V[i].co.copy() for i in range(len(V))]
for kb in KB:
    for i, pt in enumerate(kb.data):
        if i in skip: continue
        w = headw(i)
        if w <= 0.001: continue
        pt.co = pt.co.lerp(warp(pt.co), w)
for i, v in enumerate(V): v.co = KB[0].data[i].co

# ---- ears
def build_ear(side, isls):
    idx = [i for isl in isls for i in isl]
    bone = arm.data.bones[side]
    bh = arm.matrix_world @ bone.head_local
    pts = [basis[i] for i in idx]
    tipP = max(pts, key=lambda p: (p - bh).length)
    hgt = (tipP - bh).length
    axis = (tipP - bh).normalized()
    near = [p for p in pts if (p - bh).dot(axis) < 0.18 * hgt]
    base = sum(near, Vector()) / max(1, len(near))
    hgt = (tipP - base).length * SP["ear"]["h"]
    axis = (tipP - base).normalized()
    # facing from the inner-material faces of this ear
    fn = Vector()
    sidx = set(idx)
    for p in me.polygons:
        if p.material_index == MI.get("inner", -1) and p.vertices[0] in sidx: fn += p.normal
    if fn.length < 1e-6: fn = Vector((0, 1, 0))
    fwd = (fn - axis * fn.dot(axis)).normalized()
    if fwd.y < -0.2: fwd = -fwd
    lat = axis.cross(fwd).normalized()
    had_mark = any(p.material_index == MI.get("mark", -1) and p.vertices[0] in sidx for p in me.polygons)
    E = SP["ear"]; w0 = hgt * E["w"] * 0.5
    base = warp(base)  # follow the reshaped skull
    # old ear vertices & key deltas for transfer
    kd = KDTree(len(idx))
    for n, i in enumerate(idx): kd.insert(basis[i], n)
    kd.balance()
    NU, NB = 20, 13
    verts = []; mats = []; faces = []
    rings = []
    for iu in range(NU):
        u = iu / (NU - 1) * 0.985
        prof = (1 - u ** E["a"]) ** (1 / E["b"])
        if E["a"] < 1.5: prof *= 1 + 0.18 * math.sin(math.pi * u)
        w = w0 * max(prof, E.get("tipr", 0.04))
        if u < 0.22: w *= 1 + E["flare"] * (1 - u / 0.22) ** 2
        T = hgt * E["T"] * 0.5 * (1 - 0.55 * u) * (w / w0) ** 0.3
        Df = w * E["D"] * 1.25
        Db = Df * 0.80
        ctr = base + axis * (hgt * u - 0.09 * hgt) - fwd * (E["bend"] * hgt * u * u)
        loop = []
        for k in range(NB):  # back arc (x from +w to -w)
            ph = math.pi * k / (NB - 1)
            loop.append((w * math.cos(ph), -T - Db * math.sin(ph), "b"))
        for k in range(1, 4):  # rounded rim cap at -x
            t = math.pi * k / 4
            loop.append((-w - T * 0.5 * math.sin(t), -T * 0.5 - T * 0.5 * math.cos(t), "r"))
        for k in range(NB):  # front arc / bowl (x from -w to +w)
            ph = math.pi - math.pi * k / (NB - 1)
            dip = Df * math.sin(ph) ** 1.6   # soft lip: flat near rims, deep bowl middle
            loop.append((w * math.cos(ph), -dip, "f" if abs(math.cos(ph)) < 0.80 else "l"))
        for k in range(1, 4):
            t = math.pi * k / 4
            loop.append((w + T * 0.5 * math.sin(t), -T * 0.5 + T * 0.5 * math.cos(t), "r"))
        ring = []
        for x, y, tag in loop:
            p = ctr + lat * x + fwd * (y + T * 0.5 + Db * 0.4)
            ring.append(len(verts)); verts.append((p, u, tag))
        rings.append(ring)
    tip = base + axis * (hgt * 0.985 + 0.01 * hgt - 0.09 * hgt) - fwd * (E["bend"] * hgt)
    tipi = len(verts); verts.append((tip, 1.0, "t"))
    M = len(rings[0])
    def mat_for(u, tag):
        if had_mark and u > 0.74: return "mark"
        if tag == "f" and u < 0.88 and u > 0.03: return "inner"
        return "fur"
    for a_ in range(NU - 1):
        for k in range(M):
            k2 = (k + 1) % M
            q = (rings[a_][k], rings[a_][k2], rings[a_ + 1][k2], rings[a_ + 1][k])
            tag = verts[rings[a_][k]][2] if verts[rings[a_][k]][2] == verts[rings[a_][k2]][2] else "r"
            faces.append(q); mats.append(mat_for((a_ + 0.5) / (NU - 1), tag))
    for k in range(M):
        faces.append((rings[-1][k], rings[-1][(k + 1) % M], tipi)); mats.append(mat_for(1.0, "b"))
    # base cap (buried in the skull)
    faces.append(tuple(reversed(rings[0]))); mats.append("fur")
    m2 = bpy.data.meshes.new("ear"); m2.from_pydata([v[0] for v in verts], [], faces)
    for m in me.materials: m2.materials.append(m)
    for p, mn in zip(m2.polygons, mats): p.material_index = MI.get(mn, 0)
    for p in m2.polygons: p.use_smooth = True
    ob = bpy.data.objects.new("ear_" + side, m2); bpy.context.scene.collection.objects.link(ob)
    bm2 = bmesh.new(); bm2.from_mesh(m2); bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces); bm2.to_mesh(m2); bm2.free()
    vg = ob.vertex_groups.new(name=side); vh = ob.vertex_groups.new(name="Head")
    for n, (p, u, tag) in enumerate(verts):
        we = min(1.0, max(0.0, (u - 0.0) / 0.12)) if u < 0.12 else 1.0
        vg.add([n], max(we, 0.35), "REPLACE"); vh.add([n], 1 - max(we, 0.35), "REPLACE")
    # nearest old ear vertex -> per-key deltas
    near_old = [idx[kd.find(p)[1]] for p, u, t in verts]
    return ob, near_old

new_ears = [build_ear(s, ear_isl[s]) for s in ("EarL", "EarR") if ear_isl[s]]
olddelta = {kb.name: None for kb in KB}
# delete old ears
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in skip], context="VERTS"); 
# keep deltas before delete: capture now (key coords of old verts)
keyco = {kb.name: [kb.data[i].co.copy() for i in range(len(V))] for kb in KB}
bm.free()
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True); bpy.context.view_layer.objects.active = head
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
for i in skip: V[i].select = True
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.delete(type="VERT"); bpy.ops.object.mode_set(mode="OBJECT")
n0 = len(head.data.vertices)
for ob, near in new_ears:
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True); head.select_set(True); bpy.context.view_layer.objects.active = head
    nb = len(head.data.vertices)
    bpy.ops.object.join()
    KB = head.data.shape_keys.key_blocks
    for kb in KB[1:]:
        kc = keyco[kb.name]; bc = keyco[KB[0].name]
        for n, oi in enumerate(near):
            d = kc[oi] - bc[oi]
            if d.length_squared > 1e-12: kb.data[nb + n].co = KB[0].data[nb + n].co + d
# armature modifier still points at arm (joined into head)
tri1 = sum(len(p.vertices) - 2 for p in head.data.polygons)
print("TRIS", tri0, "->", tri1, "ratio", round(tri1 / tri0, 3))
print("KEYS", [k.name for k in head.data.shape_keys.key_blocks])
print("MATS", [m.name for m in head.data.materials])
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_skins=True, export_morph=True,
                          export_animations=False, export_yup=True)
# ---- proof
cols = dict(fur=(0.85, 0.45, 0.15), mark=(0.5, 0.25, 0.08), belly=(1, .95, .88), eyewhite=(1, 1, 1), eyeink=(0.02, 0.02, 0.02),
            pupil=(0, 0, 0), iris=(.2, .4, .8), blush=(1, .5, .6), nose=(1, .5, .6), mouth=(.3, .05, .05), tongue=(1, .4, .5),
            inner=(1, .7, .78), tip=(1, .95, .88))
for m in head.data.materials:
    m.use_nodes = True; b = m.node_tree.nodes.get("Principled BSDF")
    if b: b.inputs["Base Color"].default_value = (*cols.get(m.name, (.6, .6, .6)), 1); b.inputs["Roughness"].default_value = .6
for o in bpy.data.objects:
    if o.type == "MESH" and o != head: o.hide_render = True
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
sc.render.resolution_x = sc.render.resolution_y = 520
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.8, .8, .82, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 70
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3
tgt = C + Vector((0, 0.05, 0.08))
files = []
earT = C + Vector((0.18, 0.0, 0.32)) * (R / 0.3166)
for n, dirv in enumerate([(0, 1, 0.1), (1, 0.05, 0.1), (0.7, 0.7, 0.35), (-0.6, -0.6, 0.4), (0.35, 0.9, 0.5)]):
    dv = Vector(dirv).normalized()
    tgt = earT if n == 4 else C + Vector((0, 0.05, 0.08))
    cam.location = tgt + dv * (1.1 if n == 4 else 2.6)
    cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
    sun.rotation_euler = (-dv).to_track_quat("-Z", "Y").to_euler()
    f = PROOF.replace(".png", f"_{n}.png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True); files.append(f)
print("PROOF", files)
