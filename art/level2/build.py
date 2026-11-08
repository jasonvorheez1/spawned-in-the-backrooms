# Level 2 kit: cast-concrete tunnel modules, pipe runs, trays, ducts, lamp fixtures.
# Built in ENGINE coords (x, y up, z) and mapped to Blender (x, -z, y). Per-vertex AO (BVH rays against the
# module plus its neighbouring floor/ceiling/walls) and procedural grime are baked into vertex colour.
# Output: scripts/lib/l2kit-data/<part>.js {hi, lo} groups for scripts/l2-kit-geo.js, a GLB per part, proof.png
import bpy, bmesh, math, json, os, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
OUT = os.environ.get("OUT", "/workspace/world.wisp-519729fd-1/scripts/lib/l2kit-data")
GLB = "/workspace/l2kit/glb"; os.makedirs(OUT, exist_ok=True); os.makedirs(GLB, exist_ok=True)
random.seed(2202)
def E(x, y, z): return Vector((x, -z, y))
def lin(c): return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)
MATS = {  # name: (srgb tint, uv tile metres)
 "concrete": ((0.80, 0.78, 0.73), 1.5), "floor": ((0.66, 0.64, 0.60), 1.5), "ceil": ((0.56, 0.55, 0.53), 1.5),
 "paint": ((0.88, 0.68, 0.14), 1.5), "dark": ((0.07, 0.065, 0.06), 1), "steel": ((0.58, 0.58, 0.57), 1),
 "green": ((0.36, 0.46, 0.37), 1), "lag": ((0.88, 0.84, 0.74), 0.8), "band": ((0.2, 0.19, 0.17), 1),
 "red": ((0.62, 0.09, 0.05), 1), "galv": ((0.78, 0.79, 0.8), 1.2), "rubber": ((0.06, 0.06, 0.06), 1),
 "orange": ((0.75, 0.32, 0.06), 1), "housing": ((0.48, 0.52, 0.47), 1), "stain": ((0.16, 0.11, 0.07), 1),
 "brass": ((0.7, 0.55, 0.25), 1)}
for k in MATS:
    m = bpy.data.materials.get(k) or bpy.data.materials.new(k)
    m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1
    mix.inputs[6].default_value = (*lin(MATS[k][0]), 1); nt.links.new(a.outputs[0], mix.inputs[7]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85

parts = {}; cur = []
def add(o, mat, smooth=False):
    o.data.materials.clear(); o.data.materials.append(bpy.data.materials[mat])
    for p in o.data.polygons: p.use_smooth = smooth
    cur.append(o); return o
def mkobj(bm, name="p"):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o
def extrude(poly, axis, a0, a1, mat, smooth=False):
    """poly: 2D points; axis x -> (z,y); z -> (x,y); y -> (x,z)"""
    bm = bmesh.new(); caps = []
    for a in (a0, a1):
        vs = []
        for (u, v) in poly:
            p = {"x": (a, v, u), "z": (u, v, a), "y": (u, a, v)}[axis]
            vs.append(bm.verts.new(E(*p)))
        caps.append(vs)
    n = len(poly)
    bm.faces.new(caps[0]); bm.faces.new(list(reversed(caps[1])))
    for i in range(n): bm.faces.new([caps[0][i], caps[0][(i + 1) % n], caps[1][(i + 1) % n], caps[1][i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return add(mkobj(bm), mat, smooth)
def cham(w0, w1, h0, h1, c):  # chamfered rectangle profile
    return [(w0 + c, h0), (w1 - c, h0), (w1, h0 + c), (w1, h1 - c), (w1 - c, h1), (w0 + c, h1), (w0, h1 - c), (w0, h0 + c)]
def box(x0, x1, y0, y1, z0, z1, mat, c=0.0):
    if c > 0: return extrude(cham(z0, z1, y0, y1, c), "x", x0, x1, mat)
    return extrude([(z0, y0), (z1, y0), (z1, y1), (z0, y1)], "x", x0, x1, mat)
def cyl(p0, p1, r, mat, n=12, caps=True):
    p0, p1 = E(*p0), E(*p1); d = p1 - p0; L = d.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=L, end_fill_type="NGON" if caps else "NOTHING")
    o = bpy.context.active_object; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    o.location = (p0 + p1) / 2; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    add(o, mat, True)
    for p in o.data.polygons:
        if p.normal.dot(d.normalized()) ** 2 > 0.8: p.use_smooth = False
    return o
def torus(c, axis, R, r, mat, maj=16, mn=6):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mn)
    o = bpy.context.active_object; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(E(*axis))
    o.location = E(*c); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); return add(o, mat, True)
def sphere(c, r, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=r, location=E(*c)); o = bpy.context.active_object
    bpy.ops.object.transform_apply(location=True); return add(o, mat, True)
def slabgrid(axis, a, u0, u1, v0, v1, nu, nv, mat, face):
    """a flat dense sheet (for grime) on plane axis=a, facing +axis if face>0"""
    bm = bmesh.new(); g = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            u = u0 + (u1 - u0) * i / nu; v = v0 + (v1 - v0) * j / nv
            p = {"x": (a, v, u), "z": (u, v, a), "y": (u, a, v)}[axis]; row.append(bm.verts.new(E(*p)))
        g.append(row)
    for j in range(nv):
        for i in range(nu):
            q = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]]
            f = bm.faces.new(q)
    bm.normal_update(); want = {"x": E(face, 0, 0), "z": E(0, 0, face), "y": E(0, face, 0)}[axis]
    for f in bm.faces:
        if f.normal.dot(want) < 0: f.normal_flip()
    return add(mkobj(bm), mat)
def done(name, env=(), grime=None):
    global cur; parts[name] = (cur, env, grime); cur = []

H = 3.0; T = 0.4
TIES = [(x, y) for x in (-1.8, -0.6, 0.6, 1.8) for y in (0.55, 1.45, 2.35)]
def nz(x, y, s=1.0, k=0): return noise.noise(Vector((x * s + k * 13.1, y * s, k * 7.7)))
def wallgrime(p, nrm, ties=TIES, along="x"):
    x, y, z = p; a = x if along == "x" else z
    g = 1.0
    g -= 0.32 * max(0.0, 1 - y / (0.55 + 0.25 * nz(a, 0, 1.3))) ** 1.5           # rising damp at the foot
    g -= 0.22 * max(0.0, (y - 2.2) / 0.8) * (0.5 + 0.5 * nz(a, 3, 2.0))            # soot under the ceiling
    for (tx, ty) in ties:                                                           # rust runoff under the tie holes
        if y < ty: g -= 0.20 * math.exp(-((a - tx) / (0.05 + 0.03 * (ty - y))) ** 2) * math.exp(-(ty - y) / 1.1)
    s = nz(a * 3.0, 0, 1.0, 5); g -= 0.16 * max(0, s) * max(0, (y - 0.4) / 2.6) ** 0.5  # long top-down streaks
    g += 0.08 * nz(a, y, 0.9, 2)
    return max(0.35, min(1.08, g))

# ---- WALL: a 5 m cast panel, both faces worked (form seams, tie holes, chamfered kick, ceiling haunch)
L = 2.5
for f in (1, -1):
    slabgrid("z", f * T, -L, L, 0.22, H - 0.12, 18, 11, "concrete", f)
extrude([(-T, 0.22), (T, 0.22), (T, H - 0.12), (-T, H - 0.12)], "x", -L, L, "concrete")  # core (caps hidden in piers)
for f in (1, -1):
    extrude([(f * T, 0), (f * (T + 0.05), 0), (f * (T + 0.05), 0.18), (f * T, 0.24)], "x", -L, L, "concrete")  # kick, 45deg top
    extrude([(f * T, H - 0.14), (f * T, H), (f * (T + 0.13), H)], "x", -L, L, "concrete")                    # haunch
    for sx in (-1.2, 0.0, 1.2): extrude([(f * T, 0.24), (f * (T + 0.006), 0.24), (f * (T + 0.006), H - 0.14), (f * T, H - 0.14)], "x", sx - 0.012, sx + 0.012, "concrete")  # form fins
    extrude([(f * T, 1.0), (f * (T + 0.005), 1.0), (f * (T + 0.005), 1.025), (f * T, 1.025)], "x", -L, L, "concrete")  # lift line
for (tx, ty) in TIES: cyl((tx, ty, -T - 0.006), (tx, ty, T + 0.006), 0.022, "dark", 8)
done("wall", env=["floor", "ceil"], grime=wallgrime)

# ---- PIER: a 0.9 m chamfered column where walls meet or end
P = 0.45
extrude(cham(-P, P, -P, P, 0.07), "y", 0.2, H - 0.12, "concrete")
extrude(cham(-P - 0.05, P + 0.05, -P - 0.05, P + 0.05, 0.05), "y", 0, 0.2, "concrete")
extrude(cham(-P - 0.04, P + 0.04, -P - 0.04, P + 0.04, 0.12), "y", H - 0.12, H, "concrete")
for s in (-1, 1):
    for t in (-1, 1): extrude([(0, 0.2), (0.05, 0.2), (0.0, 0.25)], "x", -P - 0.05, P + 0.05, "concrete") if False else None
done("pier", env=["floor", "ceil"], grime=lambda p, n: wallgrime(p, n, ties=[(0, 2.0)], along="x" if abs(n[0]) < 0.5 else "z"))

# ---- CORNER: the 45 degree fillet between two walls, legs 1 m along +x and +z from the inner corner
C = 1.0
extrude([(0, 0), (C, 0), (0, C)], "y", 0.0, H, "concrete")
extrude([(C - 0.02, -0.0), (C + 0.05, 0), (0.0, C + 0.05), (0, C - 0.02)], "y", 0, 0.2, "concrete")
done("corner", env=["floor", "ceil", "wallx", "wallz"], grime=lambda p, n: wallgrime(p, n, ties=[(0, 1.9)], along="x"))

# ---- CEILING: a 5x5 bay, dense soffit for water stains, one cast beam across the bay with chamfers
slabgrid("y", 0, -2.5, 2.5, -2.5, 2.5, 12, 12, "ceil", -1)
extrude(cham(1.85, 2.15, -0.3, 0.02, 0.03), "x", -2.5, 2.5, "ceil")
for f in (1.85, 2.15): extrude([(f, 0), (f + (0.09 if f > 2 else -0.09), 0), (f, -0.09)], "x", -2.5, 2.5, "ceil")
def ceilgrime(p, n):
    x, y, z = p; g = 1 - 0.3 * max(0, nz(x, z, 0.5, 9)) - 0.15 * max(0, nz(x, z, 2.3, 4)); return max(0.4, g)
done("ceil", env=[], grime=ceilgrime)

# ---- FLOOR: a 5x5 bay, wet patches, worn safety lines along both sides; FLOORDRAIN adds a cast-iron grate
def floorbase(drain):
    slabgrid("y", 0, -2.5, 2.5, -2.5, 2.5, 14, 14, "floor", 1)
    for s in (-1, 1):
        x = s * 1.72; zz = -2.5
        while zz < 2.5:
            l = random.uniform(0.6, 1.8); z1 = min(2.5, zz + l)
            extrude([(x - 0.05, zz), (x + 0.05, zz), (x + 0.05, z1), (x - 0.05, z1)], "y", 0.002, 0.003, "paint")
            zz = z1 + random.uniform(0.04, 0.4)
    if drain:
        dx, dz = 1.0, 0.9
        box(dx - 0.3, dx + 0.3, 0.0005, 0.0015, dz - 0.3, dz + 0.3, "dark")
        for k in range(4): box(dx - 0.3, dx + 0.3, 0.0015, 0.012, dz - 0.3 + k * 0.193, dz - 0.3 + k * 0.193 + 0.025, "steel")
        for i in range(9): box(dx - 0.27 + i * 0.065, dx - 0.27 + i * 0.065 + 0.018, 0.0015, 0.009, dz - 0.28, dz + 0.28, "steel")
        extrude([(dx - 0.6, dz - 0.2), (dx + 0.7, dz - 0.4), (dx + 0.9, dz + 0.5), (dx - 0.3, dz + 0.7)], "y", 0.0008, 0.001, "stain")
def floorgrime(p, n):
    x, y, z = p; g = 1 - 0.28 * max(0, nz(x, z, 0.6, 3)) - 0.12 * max(0, nz(x, z, 3, 8)) + 0.05 * nz(x, z, 7, 1); return max(0.45, g)
floorbase(False); done("floor", grime=floorgrime)
floorbase(True); done("floordrain", grime=floorgrime)

# ---- PIPERUN: against a wall (face at z=0, +z into the tunnel), running 3.9 m and elbowing back into the concrete
def lagged(y, zc, r, x0, x1):
    cyl((x0, y, zc), (x1, y, zc), r, "lag", 14)
    for xe in (x0, x1):
        sphere((xe, y, zc), r, "lag"); cyl((xe, y, zc), (xe, y, -0.05), r, "lag", 14, False)
        cyl((xe, y, 0.0), (xe, y, 0.035), r + 0.045, "steel", 14)          # wall collar
    xb = x0 + 0.45
    while xb < x1 - 0.2: cyl((xb, y, zc), (xb + 0.06, y, zc), r + 0.008, "band", 14); xb += 0.9
for (x, nzv) in ((-1.2, 1), (1.25, 1)):  # unistrut stanchions with arms out to the pipes
    box(x - 0.022, x + 0.022, 0.25, 2.75, 0.0, 0.042, "steel", 0.006)
    for (y, zz) in ((2.36, 0.5), (1.94, 0.38), (0.4, 0.22)): box(x - 0.02, x + 0.02, y - 0.05, y - 0.01, 0.0, zz, "steel", 0.005)
lagged(2.52, 0.27, 0.19, -1.85, 1.85)
lagged(2.08, 0.22, 0.13, -1.95, 1.7)
y0, zc = 0.5, 0.17
cyl((-2.0, y0, zc), (2.0, y0, zc), 0.065, "green", 12)
for xe in (-2.0, 2.0): sphere((xe, y0, zc), 0.065, "green"); cyl((xe, y0, zc), (xe, y0, -0.05), 0.065, "green", 12, False)
for xf in (-1.05, 0.95):
    cyl((xf - 0.02, y0, zc), (xf + 0.02, y0, zc), 0.115, "green", 14)
    for k in range(6):
        a = k / 6 * 6.283; cyl((xf - 0.03, y0 + 0.09 * math.cos(a), zc + 0.09 * math.sin(a)), (xf + 0.03, y0 + 0.09 * math.cos(a), zc + 0.09 * math.sin(a)), 0.011, "steel", 6)
xv = 0.2
sphere((xv, y0, zc), 0.11, "green"); cyl((xv - 0.15, y0, zc), (xv + 0.15, y0, zc), 0.09, "green", 12)
cyl((xv, y0, zc), (xv, y0 + 0.3, zc), 0.045, "green", 10); cyl((xv, y0 + 0.3, zc), (xv, y0 + 0.4, zc), 0.012, "brass", 8)
torus((xv, y0 + 0.4, zc), (0, 1, 0), 0.14, 0.014, "red", 18, 6)
for k in range(4):
    a = k / 4 * 6.283 + 0.4; cyl((xv, y0 + 0.4, zc), (xv + 0.13 * math.cos(a), y0 + 0.4, zc + 0.13 * math.sin(a)), 0.009, "red", 6)
# a drip from the top pipe's band, staining the wall and pooling on the floor
extrude([(-0.62, 2.3), (-0.5, 2.3), (-0.47, 0.25), (-0.66, 0.08), (-0.7, 0.4)], "z", 0.003, 0.004, "stain")
extrude([(-0.95, 0.02), (-0.2, 0.05), (-0.1, 0.55), (-0.7, 0.75), (-1.1, 0.4)], "y", 0.003, 0.004, "stain")
done("piperun", env=["floor", "wallback"])

# ---- TRAY: a ladder cable tray hung 0.3 m below the ceiling on threaded rods (origin at the ceiling, x along)
for s in (-1, 1): extrude([(s * 0.2, -0.36), (s * 0.22, -0.36), (s * 0.22, -0.26), (s * 0.2, -0.26)], "x", -2.5, 2.5, "steel")
x = -2.35
while x < 2.5: box(x, x + 0.03, -0.37, -0.355, -0.2, 0.2, "steel"); x += 0.3
for i, (zc, r, m) in enumerate(((-0.14, 0.024, "rubber"), (-0.08, 0.03, "rubber"), (-0.02, 0.02, "orange"), (0.04, 0.028, "rubber"), (0.1, 0.022, "rubber"), (0.15, 0.018, "orange"))):
    pts = [(-2.5 + k * 0.5, -0.355 + r + 0.01 * math.sin(k * 1.3 + i), zc + 0.008 * math.sin(k + i)) for k in range(11)]
    for a, b in zip(pts, pts[1:]): cyl(a, b, r, m, 8, False)
for xh in (-1.5, 1.5):
    for s in (-1, 1): cyl((xh, 0, s * 0.25), (xh, -0.39, s * 0.25), 0.007, "steel", 6)
    box(xh - 0.022, xh + 0.022, -0.405, -0.365, -0.29, 0.29, "steel", 0.005)
done("tray", env=["ceil"])

# ---- DUCT: galvanised rectangular duct with flanged joints and strap hangers (origin at the ceiling)
extrude(cham(-0.3, 0.3, -0.52, -0.12, 0.012), "x", -2.5, 2.5, "galv")
for xf in (-2.46, 0.0, 2.46): extrude(cham(-0.33, 0.33, -0.55, -0.09, 0.01), "x", xf - 0.02, xf + 0.02, "galv")
for xh in (-1.25, 1.25):
    for s in (-1, 1): box(xh - 0.02, xh + 0.02, -0.53, 0, s * 0.31 - 0.004, s * 0.31 + 0.004, "steel")
    box(xh - 0.02, xh + 0.02, -0.535, -0.525, -0.315, 0.315, "steel")
done("duct", env=["ceil"])

# ---- LAMP: a caged bulkhead fitting over the sim's tube (origin = tube bottom, tube along z, 1.25 long)
box(-0.15, 0.15, 0.07, 0.16, -0.7, 0.7, "housing", 0.02)
box(-0.13, 0.13, 0.03, 0.07, -0.68, -0.62, "housing"); box(-0.13, 0.13, 0.03, 0.07, 0.62, 0.68, "housing")
for zr in (-0.45, 0.45): cyl((0, 0.16, zr), (0, 0.33, zr), 0.012, "steel", 6)
for xr in (-0.13, -0.045, 0.045, 0.13): cyl((xr, -0.04 + 0.035 * (abs(xr) > 0.1), -0.66), (xr, -0.04 + 0.035 * (abs(xr) > 0.1), 0.66), 0.006, "steel", 6)
for zr in (-0.6, -0.3, 0.0, 0.3, 0.6): torus((0, 0.05, zr), (0, 0, 1), 0.14, 0.006, "steel", 14, 4)
done("lamp", env=[])

# ---- export
def envbvh(env):
    tris = []
    def quad(a, b, c, d): tris.extend([(a, b, c), (a, c, d)])
    for e in env:
        if e == "floor": quad(E(-9, 0, -9), E(9, 0, -9), E(9, 0, 9), E(-9, 0, 9))
        if e == "ceil": quad(E(-9, H, -9), E(9, H, -9), E(9, H, 9), E(-9, H, 9))
        if e == "wallx": quad(E(0, 0, -9), E(0, H, -9), E(0, H, 9), E(0, 0, 9))
        if e == "wallz": quad(E(-9, 0, 0), E(-9, H, 0), E(9, H, 0), E(9, 0, 0))
        if e == "wallback": quad(E(-9, 0, 0), E(-9, H, 0), E(9, H, 0), E(9, 0, 0))
    return tris
def joined(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.active_object; o.name = name
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.triangulate(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free(); return o
def bake(o, env, grime):
    me = o.data; dg = bpy.context.evaluated_depsgraph_get()
    vs = [v.co.copy() for v in me.vertices]; fs = [tuple(p.vertices) for p in me.polygons]
    et = envbvh(env); base = len(vs)
    for t in et:
        i = len(vs); vs.extend(t); fs.append((i, i + 1, i + 2))
    bvh = BVHTree.FromPolygons(vs, fs)
    rnd = random.Random(7); dirs = []
    for k in range(28):
        u, v = rnd.random(), rnd.random(); r = math.sqrt(u); a = 6.283 * v; dirs.append((r * math.cos(a), r * math.sin(a), math.sqrt(1 - u)))
    groups = {}
    cn = me.corner_normals
    for poly in me.polygons:
        mat = me.materials[poly.material_index].name; g = groups.setdefault(mat, {"key": {}, "p": [], "n": [], "u": [], "c": [], "i": []})
        fn = poly.normal
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; co = me.vertices[vi].co; nrm = Vector(cn[li].vector) if not poly.use_smooth else Vector(cn[li].vector)
            ex, ey, ez = co.x, co.z, -co.y; nx, ny, nz_ = nrm.x, nrm.z, -nrm.y
            tile = MATS[mat][1]; ax = max(range(3), key=lambda i: abs((fn.x, fn.z, -fn.y)[i]))
            uv = [(ez, ey), (ex, ez), (ex, ey)][ax]; uv = (round(uv[0] / tile, 3), round(uv[1] / tile, 3))
            k = (round(ex, 3), round(ey, 3), round(ez, 3), round(nx, 2), round(ny, 2), round(nz_, 2), uv)
            if k not in g["key"]:
                # AO: cosine rays about the normal
                n = nrm.normalized(); t = n.orthogonal().normalized(); b = n.cross(t); occ = 0
                org = co + fn * 0.004
                for (dx, dy, dz) in dirs:
                    d = t * dx + b * dy + n * dz; hit = bvh.ray_cast(org, d, 0.9)
                    if hit[0] is not None: occ += 1 - (hit[3] / 0.9) ** 0.7
                ao = 1 - 0.85 * occ / len(dirs)
                gr = grime((ex, ey, ez), (nx, ny, nz_)) if grime and mat in ("concrete", "floor", "ceil", "paint") else 1.0
                if mat == "paint": gr = gr * (0.6 + 0.5 * max(0, noise.noise(Vector((ex * 4, ez * 4, 1.3)))))
                tint = lin(MATS[mat][0]); s = ao * gr
                g["key"][k] = len(g["p"]) // 3
                g["p"] += [round(ex, 3), round(ey, 3), round(ez, 3)]; g["n"] += [round(nx, 2), round(ny, 2), round(nz_, 2)]
                g["u"] += list(uv); g["c"] += [round(min(1, tint[j] * s), 3) for j in range(3)]
            g["i"].append(g["key"][k])
    out = []
    for m, g in groups.items():
        del g["key"]; g["m"] = m; out.append(g)
    return out
data = {}
for name, (objs, env, grime) in parts.items():
    o = joined(objs, name)
    for mi, m in enumerate(o.data.materials): pass
    hi = bake(o, env, grime)
    lo_o = o.copy(); lo_o.data = o.data.copy(); bpy.context.collection.objects.link(lo_o)
    dm = lo_o.modifiers.new("d", "DECIMATE"); dm.ratio = 0.22; dm.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = lo_o; bpy.ops.object.select_all(action="DESELECT"); lo_o.select_set(True); bpy.ops.object.modifier_apply(modifier="d")
    lo = bake(lo_o, env, grime); bpy.data.objects.remove(lo_o)
    th = sum(len(g["i"]) for g in hi) // 3; tl = sum(len(g["i"]) for g in lo) // 3
    print("PART", name, "tris", th, "lo", tl)
    with open(f"{OUT}/{name}.js", "w") as f: f.write(f"// generated by art/level2/build.py ({name}: {th} tris, lo {tl})\nexport default " + json.dumps({"hi": hi, "lo": lo}, separators=(",", ":")) + "\n")
    # vertex colour for the proof and the glb
    col = o.data.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for poly in o.data.polygons:
        g = next(x for x in hi if x["m"] == o.data.materials[poly.material_index].name)
    data[name] = o
# GLBs + proof: lay the parts out in a row
xoff = {"wall": (0, 0), "pier": (3.5, 0), "corner": (5, 0), "ceil": (0, -7), "floor": (0, 6), "floordrain": (6, 6), "piperun": (8, 2), "tray": (8, -3), "duct": (8, -6), "lamp": (3, -3)}
for name, o in data.items():
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{GLB}/l2kit-{name}.glb", use_selection=True, export_apply=True)
    ox, oz = xoff[name]; o.location = E(ox, 0 if name not in ("ceil", "tray", "duct") else 3.2, oz)
    if name == "lamp": o.location = E(ox, 2.0, oz)
    for p in o.data.polygons: pass
scene = bpy.context.scene; scene.render.engine = "CYCLES"; scene.cycles.samples = 16
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for (loc, e) in (((6, -12, 9), 900), ((-6, 6, 7), 500), ((4, 4, 2.5), 200)):
    bpy.ops.object.light_add(type="POINT", location=loc); bpy.context.active_object.data.energy = e
cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("cam", cam); bpy.context.collection.objects.link(co); scene.camera = co
co.location = (4, -16, 9); co.rotation_euler = (math.radians(58), 0, 0); cam.lens = 24
scene.render.filepath = "/workspace/l2kit/proof.png"; bpy.ops.render.render(write_still=True)
