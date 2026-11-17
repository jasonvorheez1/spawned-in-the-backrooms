# Level 325 tower kit: Tripo P2 bases (col, pilecap; stair/slabedge feed the textures) -> metres, slots, UVs, modular pieces
# run: blender -b --factory-startup --python-exit-code 1 --python art/l325-tower/build.py
import bpy, bmesh, os, subprocess, json, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
SRC = "/workspace/l325-tower"; OUT = SRC + "/out"; TMP = "/tmp/l325"; HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
SLOTS = ["concrete", "rebar", "plywood", "steel", "paint", "rubber"]
TILE = {"concrete": 2.4, "rebar": 0.5, "plywood": 1.2, "steel": 2.0, "rubber": 0.5, "paint": 1.0}
P = [-11.68, -6.0, 0.0, 6.0, 11.68]; ST = 3.2; H = 11.98

def load_tripo(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    o = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
    img = [i for i in bpy.data.images if i.name.startswith("Color")][0]
    w, h = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    img.filepath_raw = f"{TMP}/atlas_{name}.png"; img.file_format = "PNG"; img.save()
    me = o.data; uv = me.uv_layers.active.data; faces = []
    for p in me.polygons:
        co = [o.matrix_world @ me.vertices[v].co for v in p.vertices]
        us = [Vector(uv[l].uv) for l in p.loop_indices]; c = sum(us, Vector((0, 0))) / len(us)
        smp = [c] + [(c + u) / 2 for u in us]
        col = np.mean([px[int((s.y % 1) * (h - 1)), int((s.x % 1) * (w - 1)), :3] for s in smp], axis=0)
        faces.append((co, col))
    return faces
T = {n: load_tripo(n) for n in ("col", "pilecap", "stair", "slabedge")}
bpy.ops.wm.read_factory_settings(use_empty=True)
subprocess.run(["python3", HERE + "/tex.py", TMP], check=True)

def template(faces, is_rebar, wx, wz, y0, y1, body_top):
    allv = [v for co, c in faces for v in co]
    cls = [("rebar" if is_rebar(c, co) else "concrete") for co, c in faces]
    cv = [v for (co, c), s in zip(faces, cls) if s == "concrete" for v in co]
    zmin = min(v.z for v in cv); ztop = max(v.z for v in cv) if body_top else max(v.z for co, c in faces for v in co)
    mid = ([v for v in cv if v.z > zmin + 0.08 * (ztop - zmin)] or cv) if body_top else allv
    if not body_top: zmin = min(v.z for v in allv)
    ax, bx = min(v.x for v in mid), max(v.x for v in mid); ay, by = min(v.y for v in mid), max(v.y for v in mid)
    out = []
    for (co, c), s in zip(faces, cls):
        out.append((s, [((v.x - (ax + bx) / 2) * wx / (bx - ax), y0 + (v.z - zmin) * (y1 - y0) / (ztop - zmin), -(v.y - (ay + by) / 2) * wz / (by - ay)) for v in co]))
    print("TEMPLATE", len(out), "rebar", cls.count("rebar"), "concrete", cls.count("concrete"))
    return out
COL = template(T["col"], lambda c, co: float(c.mean()) < 0.42, 0.6, 0.6, 0.25, ST, True)
CAP = template(T["pilecap"], lambda c, co: float(c[0] - c[2]) > 0.10, 1.2, 1.2, -0.2, 0.4, False)

class K:
    def __init__(s):
        s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new("UVMap"); s.man = s.bm.faces.layers.int.new("man"); s.oy = 0.0
    def face(s, slot, pts, hint=None, uvs=None):
        vs = [s.bm.verts.new((p[0], -p[2], p[1] + s.oy)) for p in pts]
        f = s.bm.faces.new(vs); f.material_index = SLOTS.index(slot)
        if hint is not None:
            f.normal_update()
            if f.normal.dot(Vector((hint[0], -hint[2], hint[1]))) < 0: f.normal_flip()
        if uvs:
            m = dict(zip(vs, uvs)); f[s.man] = 1
            for l in f.loops: l[s.uv].uv = m[l.vert]
    def box(s, slot, x0, x1, y0, y1, z0, z1, skip=()):
        F = {"x-": ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0)), "x+": ([(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], (1, 0, 0)),
             "y-": ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0)), "y+": ([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0)),
             "z-": ([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1)), "z+": ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1))}
        for k, (pts, h) in F.items():
            if k not in skip: s.face(slot, pts, h)
    def bar(s, slot, p0, p1, r, n=3, cap=True):
        p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
        a = d.cross(Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))).normalized(); b = d.cross(a)
        ring = [a * math.cos(2 * math.pi * i / n) * r + b * math.sin(2 * math.pi * i / n) * r for i in range(n)]
        for i in range(n):
            u, v = ring[i], ring[(i + 1) % n]
            s.face(slot, [p0 + u, p0 + v, p1 + v, p1 + u], u + v)
        if cap: s.face(slot, [p1 + u for u in ring], d)
    def stamp(s, tpl, x, z, only=None):
        for slot, pts in tpl:
            if only is None or slot == only: s.face(slot, [(p[0] + x, p[1], p[2] + z) for p in pts])
    def wall(s, x0, x1, y0, y1, z0, z1, doors=(), skip=("y-",)):
        along_x = (x1 - x0) > (z1 - z0); a0, a1 = (x0, x1) if along_x else (z0, z1); cur = a0
        def seg(a, b, ya, yb, sk):
            if b - a < 1e-6: return
            if along_x: s.box("concrete", a, b, ya, yb, z0, z1, sk)
            else: s.box("concrete", x0, x1, ya, yb, a, b, sk)
        for da, db, dh in sorted(doors):
            seg(cur, da, y0, y1, skip); seg(da, db, y0 + dh, y1, ()); cur = db
        seg(cur, a1, y0, y1, skip)

def slab(k, holes, x0=-12, x1=12, z0=-12, z1=12, lip=True):
    ex = lambda v: max(-H, min(H, v))
    xs = sorted({ex(x0), ex(x1)} | {v for h in holes for v in h[:2] if x0 < v < x1})
    zs = sorted({ex(z0), ex(z1)} | {v for h in holes for v in h[2:] if z0 < v < z1})
    inh = lambda x, z: any(h[0] < x < h[1] and h[2] < z < h[3] for h in holes) or not (xs[0] < x < xs[-1] and zs[0] < z < zs[-1])
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            a, b, c, d = xs[i], xs[i + 1], zs[j], zs[j + 1]; cx, cz = (a + b) / 2, (c + d) / 2
            if inh(cx, cz): continue
            k.face("concrete", [(a, 0.25, c), (b, 0.25, c), (b, 0.25, d), (a, 0.25, d)], (0, 1, 0))
            k.face("concrete", [(a, 0, c), (b, 0, c), (b, 0, d), (a, 0, d)], (0, -1, 0))
            for nx, nz, q in ((a - .01, cz, [(a, c), (a, d)]), (b + .01, cz, [(b, c), (b, d)]), (cx, c - .01, [(a, c), (b, c)]), (cx, d + .01, [(a, d), (b, d)])):
                if inh(nx, nz): k.face("concrete", [(q[0][0], 0, q[0][1]), (q[1][0], 0, q[1][1]), (q[1][0], 0.25, q[1][1]), (q[0][0], 0.25, q[0][1])], (nx - cx, 0, nz - cz))
    if lip:  # plywood edge formwork left on, standing 8 cm proud of the slab top
        if z0 == -12: k.box("plywood", max(x0, -12), min(x1, 12), 0, 0.33, -12, -H)
        if z1 == 12: k.box("plywood", max(x0, -12), min(x1, 12), 0, 0.33, H, 12)
        if x0 == -12: k.box("plywood", -12, -H, 0, 0.33, max(z0, -H), min(z1, H))
        if x1 == 12: k.box("plywood", H, 12, 0, 0.33, max(z0, -H), min(z1, H))

def stubs(k, x0=-12, x1=12, z0=-12, z1=12):
    for a, b in zip(P[:-1], P[1:]):
        for f in (0.25, 0.5, 0.75):
            t = a + (b - a) * f
            for x, z in ((t, -11.8), (t, 11.8), (-11.8, t), (11.8, t)):
                if x0 <= x <= x1 and z0 <= z <= z1: k.bar("rebar", (x, 0.2, z), (x + 0.02, 0.62, z), 0.014)
def sleeves(k, x0=-12, x1=12, z0=-12, z1=12):
    for x, z in ((4.5, 1.5), (4.5, -1.5), (-4.6, 4.0), (1.5, 4.6)):
        if x0 <= x <= x1 and z0 <= z <= z1: k.bar("rubber", (x, 0.2, z), (x, 0.5, z), 0.055, 6)
def columns(k, cage=True, skip=()):
    for x in P:
        for z in P:
            if (x, z) not in skip: k.stamp(COL, x, z, None if cage else "concrete")

def stair(k, y0, rise, nA, nB, spine_end, sofA):
    r = rise / (nA + nB); t = 0.27; zL = -1.45; yL = y0 + nA * r; xa0, xa1, xb0, xb1 = -2.75, -1.55, -1.325, -0.125
    zs = zL + (nA - 1) * t
    for i in range(nA):
        z = zs - i * t; a, b = y0 + i * r, y0 + (i + 1) * r
        k.face("concrete", [(xa0, a, z), (xa1, a, z), (xa1, b, z), (xa0, b, z)], (0, 0, 1))
        if i < nA - 1: k.face("concrete", [(xa0, b, z), (xa1, b, z), (xa1, b, z - t), (xa0, b, z - t)], (0, 1, 0))
        if z > spine_end + 1e-6: k.face("concrete", [(xa1, y0, z), (xa1, y0, z - t), (xa1, b, z - t), (xa1, b, z)], (1, 0, 0))
    k.face("concrete", [(xa0, sofA[1], sofA[0]), (xa1, sofA[1], sofA[0]), (xa1, yL - 0.2, zL), (xa0, yL - 0.2, zL)], (0, -1, 0))
    k.box("concrete", xa0, xb1, yL - 0.2, yL, -2.75, zL, ("z-", "x-", "x+"))
    for j in range(nB):
        z = zL + j * t; a, b = yL + j * r, yL + (j + 1) * r
        k.face("concrete", [(xb0, a, z), (xb1, a, z), (xb1, b, z), (xb0, b, z)], (0, 0, -1))
        if j < nB - 1: k.face("concrete", [(xb0, b, z), (xb1, b, z), (xb1, b, z + t), (xb0, b, z + t)], (0, 1, 0))
    zt = zL + (nB - 1) * t
    k.face("concrete", [(xb0, yL - 0.2, zL), (xb1, yL - 0.2, zL), (xb1, y0 + rise - 0.25, zt), (xb0, y0 + rise - 0.25, zt)], (0, -1, 0))

STAIR_HOLE = (-2.75, -0.125, -2.75, 0.71); SHAFTS = [(0.125, 2.75, -2.75, -0.125), (0.125, 2.75, 0.125, 2.75)]
def tape(k, za, zb):
    for y in (0.75, 1.2):
        k.face("paint", [(2.88, y, za), (2.88, y, zb), (2.88, y + 0.12, zb), (2.88, y + 0.12, za)], (1, 0, 0), [(0, 0.8), (1, 0.8), (1, 0.97), (0, 0.97)])
def core(k, spine_y0=0.0):
    y0, y1 = 0.25, ST
    k.wall(-3, 3, y0, y1, -3, -2.75); k.wall(-3, 3, y0, y1, 2.75, 3, [(-2.2, -0.8, 2.3)])
    k.wall(-3, -2.75, y0, y1, -2.75, 2.75); k.wall(2.75, 3, y0, y1, -2.75, 2.75, [(-2.0, -0.9, 2.2), (0.9, 2.0, 2.2)])
    k.wall(-0.125, 0.125, y0, y1, -2.75, 2.75); k.wall(0.125, 2.75, y0, y1, -0.125, 0.125)
    k.box("concrete", -1.55, -1.325, spine_y0, y1, -1.45, 0.71, ("y-",))
    stair(k, 0.25, ST, 10, 9, 0.71, (0.71, 0.0)); tape(k, -2.0, -0.9); tape(k, 0.9, 2.0)

def floor(k, cage=True):
    slab(k, [STAIR_HOLE] + SHAFTS); columns(k, cage); core(k); stubs(k); sleeves(k)
def lobby(k, basement=False):
    holes = [STAIR_HOLE, (-1.325, -0.125, 0.71, 0.98)] if basement else []
    slab(k, holes); columns(k, True, ((0.0, P[0]), (0.0, P[4]))); core(k, 0.0 if basement else 0.25); sleeves(k)
    for s in (-1, 1):
        zc = s * 11.9
        k.box("concrete", -6, 6, 2.65, ST, min(s * 11.38, s * H), max(s * 11.38, s * H))            # transfer beam over the entrance
        k.box("steel", -H, -1.5, 0.25, 2.65, zc - 0.03, zc + 0.03); k.box("steel", 1.5, H, 0.25, 2.65, zc - 0.03, zc + 0.03)
        k.box("steel", s * 11.9 - 0.03, s * 11.9 + 0.03, 0.25, 2.65, -11.87, 11.87)                  # east and west hoarding
        k.box("steel", -1.5, -1.3, 0.25, 2.65, zc - 0.1, zc + 0.1); k.box("steel", 1.3, 1.5, 0.25, 2.65, zc - 0.1, zc + 0.1)
        k.box("steel", -1.6, 1.6, 2.45, 2.65, zc - 0.12, zc + 0.12, ())
        zb = zc + s * 0.045; xa, xb = (1.9, 3.1) if s > 0 else (-1.9, -3.1)
        k.face("paint", [(xa, 1.2, zb), (xb, 1.2, zb), (xb, 2.3, zb), (xa, 2.3, zb)], (0, 0, s), [(0.01, 0.01), (0.49, 0.01), (0.49, 0.49), (0.01, 0.49)])
    if basement:
        b0, b1 = -ST, 0.0
        k.face("concrete", [(-6, b0, -6), (6, b0, -6), (6, b0, 6), (-6, b0, 6)], (0, 1, 0))
        sk = ("y-", "y+")
        k.wall(-6, 6, b0, b1, -6, -5.75, [(-0.7, 0.7, 2.3)], sk); k.wall(-6, 6, b0, b1, 5.75, 6, (), sk)
        k.wall(-6, -5.75, b0, b1, -5.75, 5.75, (), sk); k.wall(5.75, 6, b0, b1, -5.75, 5.75, (), sk)
        k.wall(-3, 3, b0, b1, -3, -2.75, (), sk); k.wall(-3, 3, b0, b1, 2.75, 3, [(-2.2, -0.8, 2.3)], sk)
        k.wall(-3, -2.75, b0, b1, -2.75, 2.75, (), sk); k.wall(2.75, 3, b0, b1, -2.75, 2.75, (), sk); k.wall(-0.125, 0.125, b0, b1, -2.75, 2.75, (), sk)
        k.box("concrete", -1.55, -1.325, b0, b1, -1.45, 0.98, sk)
        stair(k, b0, ST + 0.25, 11, 10, 0.98, (1.25, b0))
def far(k):
    for i in range(10):
        k.oy = i * ST; k.box("concrete", -12, 12, 0, 0.3, -12, 12)
        for x in P:
            for z in P: k.box("concrete", x - 0.3, x + 0.3, 0.3, ST, z - 0.3, z + 0.3, ("y-",) if i == 9 else ("y-", "y+"))
        k.box("concrete", -3, 3, 0.3, ST, -3, 3, ("y-", "y+"))
    k.oy = 0
def foundation(k):
    k.box("concrete", -12, 12, -0.3, -0.2, -12, 12)
    for p in P:
        k.box("concrete", -H, H, -0.2, 0.13, p - 0.25, p + 0.25, ("y-",)); k.box("concrete", p - 0.25, p + 0.25, -0.2, 0.16, -H, H, ("y-",))
    for i in range(16):
        t = -11.2 + i * 22.4 / 15 + 0.37
        k.bar("rebar", (-11.9, -0.14, t), (11.9, -0.14, t), 0.02, 3, False); k.bar("rebar", (t, -0.11, -11.9), (t, -0.11, 11.9), 0.02, 3, False)
    k.box("concrete", -3.4, 3.4, -0.2, 0.2, -3.4, 3.4, ("y-",))
    for i in range(7):
        t = -2.85 + i * 0.95
        for x, z in ((t, -2.87), (t, 2.87), (-2.87, t), (2.87, t)): k.bar("rebar", (x, 0.1, z), (x, 0.4, z), 0.014)
    for x in P:
        for z in P:
            if (x, z) != (0.0, 0.0): k.stamp(CAP, max(-11.4, min(11.4, x)), max(-11.4, min(11.4, z)))

MATS = []
for sl in SLOTS:
    m = bpy.data.materials.new(sl); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(f"{TMP}/t_{sl}.jpg"); m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.6 if sl in ("steel", "paint") else 0.9; m.use_backface_culling = sl != "paint"; MATS.append(m)
META = {}
def finish(k, name, proof=True):
    bm = k.bm; bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.normal_update()
    for f in bm.faces:
        if f[k.man]: continue
        n = f.normal; a = max(range(3), key=lambda i: abs(n[i])); t = TILE[SLOTS[f.material_index]]; u, v = [(1, 2), (0, 2), (0, 1)][a]
        for l in f.loops: l[k.uv].uv = (l.vert.co[u] / t, l.vert.co[v] / t)
    me = bpy.data.meshes.new(name); bm.to_mesh(me)
    for m in MATS: me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.material_slot_remove_unused()
    me.calc_loop_triangles(); cs = [v.co for v in me.vertices]
    mn = [min(c[i] for c in cs) for i in range(3)]; mx = [max(c[i] for c in cs) for i in range(3)]
    META[name] = {"tris": len(me.loop_triangles), "size": [round(mx[0] - mn[0], 2), round(mx[2] - mn[2], 2), round(mx[1] - mn[1], 2)], "minY": round(mn[2], 2), "slots": [m.name for m in me.materials]}
    print("PIECE", name, META[name])
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=True, export_yup=True, export_image_format="JPEG")
    if proof: render(o, name, mn, mx)
    if name == "floor": walk(me)
    if name == "columns":
        cam.location = (-11.68 + 2.2, 11.68 - 3.2, 2.6); cam.rotation_euler = (Vector((-11.68, 11.68, 2.2)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f"{TMP}/proof_columns_d.png"; bpy.ops.render.render(write_still=True)
    o.select_set(False); bpy.data.objects.remove(o)

sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 640
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.clip_end = 500
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3
def render(o, name, mn, mx):
    c = (Vector(mn) + Vector(mx)) / 2; R = (Vector(mx) - Vector(mn)).length / 2
    for tag, d in (("a", Vector((0.75, -0.9, 0.4))), ("b", Vector((-0.75, 0.9, 0.4))), ("c", Vector((0.15, -0.3, 1)))):
        d = d.normalized(); cam.location = c + d * R * 2.3; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (d + Vector((0.3, 0.1, 0.6))).normalized().to_track_quat("Z", "Y").to_euler()
        sc.render.filepath = f"{TMP}/proof_{name}_{tag}.png"; bpy.ops.render.render(write_still=True)

def walk(me):  # a body's feet up the dog-leg of one storey, with the storey above stacked on it
    vs = [tuple(v.co) for v in me.vertices]; n = len(vs); ps = [tuple(p.vertices) for p in me.polygons]
    bvh = BVHTree.FromPolygons(vs + [(x, y, z + ST) for x, y, z in vs], ps + [tuple(i + n for i in p) for p in ps])
    path = [(-2.15, 2.2), (-2.15, -2.1), (-0.725, -2.1), (-0.725, 2.2)]; h = 0.25; worst = 0; head = 9; d = 0
    for (ax, az), (bx, bz) in zip(path[:-1], path[1:]):
        L = math.hypot(bx - ax, bz - az)
        for i in range(int(L / 0.05) + 1):
            x, z = ax + (bx - ax) * i * 0.05 / L, az + (bz - az) * i * 0.05 / L
            hit = bvh.ray_cast(Vector((x, -z, h + 0.5)), Vector((0, 0, -1)))
            if hit[0] is None: print("WALK fell through at", x, z); return
            worst = max(worst, abs(hit[0].z - h)); h = hit[0].z
            up = bvh.ray_cast(Vector((x, -z, h + 0.05)), Vector((0, 0, 1))); head = min(head, up[3] if up[0] else 9)
    print("WALK end height", round(h, 3), "expected", 0.25 + ST, "worst step", round(worst, 3), "least headroom", round(head, 2))

def piece(name, fn, proof=True):
    k = K(); fn(k); finish(k, name, proof)
piece("floor", floor)
def sec(k):
    for i in range(10): k.oy = i * ST; floor(k, i == 9)
    k.oy = 0
piece("section10", sec); piece("section_far", far)
piece("lobby", lobby); piece("lobby_basement", lambda k: lobby(k, True))
piece("columns", columns)
piece("core", lambda k: (slab(k, [STAIR_HOLE] + SHAFTS, -3, 3, -3, 3, False), core(k)))
def sq(k):
    slab(k, SHAFTS, 0, 12, 0, 12); stubs(k, 0, 12, 0, 12); sleeves(k, 0, 12, 0, 12)
piece("slab_q", sq); piece("foundation", foundation)
json.dump(META, open(f"{OUT}/meta.json", "w"), indent=1)
