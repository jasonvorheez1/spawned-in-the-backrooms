# shared mesh helpers for the Level 11 apartment kit. Geometry is written in GAME world coords (x, y up, z) and converted to
# Blender (x, -z, y) on the way in, so glTF export (+Y up) lands it back in game axes: placed with forward "-z" (no turn).
import bpy, bmesh, math
from mathutils import Matrix, Vector
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))); Ci = C.inverted()
def B(p): return Vector((p[0], -p[2], p[1]))
def Tw(c=(0, 0, 0), rot=None, s=(1, 1, 1)):
    M = Matrix.Translation(Vector(c))
    for ax, ang in (rot or []): M = M @ Matrix.Rotation(math.radians(ang), 4, ax)
    return M @ Matrix.Diagonal((s[0], s[1], s[2], 1))
def xf(M, p): return M @ Vector(p)

class Mdl:
    def __init__(s, name): s.name = name; s.bm = bmesh.new(); s.mats = []
    def mi(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def _tag(s, n0, m, smooth=False, capn=0):
        s.bm.faces.ensure_lookup_table(); i = s.mi(m)
        for f in s.bm.faces[n0:]:
            f.material_index = i; f.smooth = smooth and not (capn and len(f.verts) == capn)
    def box(s, m, c, size, bevel=0, seg=1, rot=None, smooth=False):
        n0 = len(s.bm.faces)
        r = bmesh.ops.create_cube(s.bm, size=1.0, matrix=C @ Tw(c, rot, size) @ Ci)
        if bevel:
            vs = r["verts"]; es = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(s.bm, geom=vs + es, offset=bevel, segments=seg, affect="EDGES", profile=0.5, clamp_overlap=True)
        s._tag(n0, m, smooth)
    def bx(s, m, x0, x1, y0, y1, z0, z1, **k):  # by extents
        s.box(m, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), **k)
    def cyl(s, m, c, r1, r2, h, seg=16, rot=None, smooth=True, caps=True):
        n0 = len(s.bm.faces)
        bmesh.ops.create_cone(s.bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h, matrix=C @ Tw(c, rot) @ Ci)
        s._tag(n0, m, smooth, seg)
    def grid(s, m, P, closed=False, smooth=True, weld=True):
        n0 = len(s.bm.faces)
        V = [[s.bm.verts.new(B(p)) for p in row] for row in P]; nj = len(P[0])
        for i in range(len(P) - 1):
            for j in range(nj if closed else nj - 1):
                j2 = (j + 1) % nj
                try: s.bm.faces.new((V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]))
                except ValueError: pass
        if weld: bmesh.ops.remove_doubles(s.bm, verts=[v for row in V for v in row if v.is_valid], dist=1e-6)
        s._tag(n0, m, smooth)
    def cap(s, m, pts):
        n0 = len(s.bm.faces); vs = [s.bm.verts.new(B(p)) for p in pts]
        s.bm.faces.new(vs); s._tag(n0, m, False)
    def lathe(s, m, prof, M=None, seg=20, smooth=True):  # prof [(r, y)], M a world matrix (axis = its local y)
        M = M or Matrix(); P = []
        for r, y in prof: P.append([xf(M, (r * math.cos(a), y, r * math.sin(a))) for a in [2 * math.pi * k / seg for k in range(seg)]])
        s.grid(m, P, closed=True, smooth=smooth)
    def superq(s, m, M, half, e1=0.3, e2=0.3, nu=24, nv=12, deform=None, smooth=True):
        f = lambda w, e: math.copysign(abs(w) ** e, w)
        P = []
        for i in range(nv + 1):
            v = -math.pi / 2 + math.pi * i / nv; row = []
            for j in range(nu):
                u = -math.pi + 2 * math.pi * j / nu
                p = [half[0] * f(math.cos(v), e1) * f(math.cos(u), e2), half[1] * f(math.sin(v), e1), half[2] * f(math.cos(v), e1) * f(math.sin(u), e2)]
                if deform: p = deform(p)
                row.append(xf(M, p))
            P.append(row)
        s.grid(m, P, closed=True, smooth=smooth)
    def tube(s, m, pts, r, seg=10, smooth=True, caps=True):
        pts = [Vector(p) for p in pts]; rings = []; ref = Vector((0, 1, 0))
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            if abs(t.dot(ref)) > 0.95: ref = Vector((1, 0, 0))
            n = t.cross(ref).normalized(); b = t.cross(n).normalized(); ref = b
            rr = r(i) if callable(r) else r
            rings.append([p + (n * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * rr for k in range(seg)])
        s.grid(m, rings, closed=True, smooth=smooth, weld=False)
        if caps: s.cap(m, rings[0]); s.cap(m, rings[-1][::-1])
    def sweep(s, m, path, prof, closed=False, center=None, smooth=False):  # path [(x,z)] on a wall face, prof [(d inward, y)]
        cx, cz = center; n = len(path); segN = []
        for i in range(n if closed else n - 1):
            a, b = Vector(path[i]), Vector(path[(i + 1) % n]); d = (b - a).normalized(); nn = Vector((-d.y, d.x))
            mid = (a + b) / 2
            if nn.dot(Vector((cx, cz)) - mid) < 0: nn = -nn
            segN.append(nn)
        offs = []
        for i in range(n):
            if closed: n1, n2 = segN[i - 1], segN[i % len(segN)]
            else: n1 = segN[max(i - 1, 0)]; n2 = segN[min(i, len(segN) - 1)]
            mm = (n1 + n2).normalized(); offs.append(mm / max(mm.dot(n1), 0.3))
        P = []
        for d, y in prof:
            P.append([(path[i][0] + offs[i].x * d, y, path[i][1] + offs[i].y * d) for i in range(n)] + ([] if not closed else []))
        # rows = profile points, cols = path points
        n0 = len(s.bm.faces)
        V = [[s.bm.verts.new(B(p)) for p in row] for row in P]
        for i in range(len(P) - 1):
            for j in range(n if closed else n - 1):
                j2 = (j + 1) % n
                s.bm.faces.new((V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]))
        s._tag(n0, m, smooth)
    def prism(s, m, pts2, o, u, v, d, depth):  # outline in (u, v) plane at origin o, extruded along d
        o, u, v, d = Vector(o), Vector(u), Vector(v), Vector(d)
        F = [o + u * a + v * b for a, b in pts2]; Bk = [p + d * depth for p in F]
        n0 = len(s.bm.faces); fv = [s.bm.verts.new(B(p)) for p in F]; bv = [s.bm.verts.new(B(p)) for p in Bk]
        s.bm.faces.new(fv); s.bm.faces.new(bv[::-1]); k = len(F)
        for i in range(k): s.bm.faces.new((fv[i], fv[(i + 1) % k], bv[(i + 1) % k], bv[i]))
        s._tag(n0, m, False)

def arch(w, h, r, n=10):  # tombstone outline: width w, height h, top arc radius r
    pts = [(-w / 2, 0), (w / 2, 0)]
    for k in range(n + 1):
        a = math.pi * k / n; pts.append((math.cos(a) * w / 2, h - r + math.sin(a) * r))
    return pts[:2] + pts[2:]

def mat(name, col, rough=0.6, metal=0.0, emit=None, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit[0], 1); b.inputs["Emission Strength"].default_value = emit[1]
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    m.use_backface_culling = False; m.diffuse_color = (*col, alpha); return m

def finish(md, MATS, TILE, FIT=()):
    bm = md.bm; uv = bm.loops.layers.uv.new("UVMap")
    fitbox = {}
    for f in bm.faces:
        nm = md.mats[f.material_index]
        if nm in FIT:
            ax = max(range(3), key=lambda k: abs(f.normal[k])); a, b = [k for k in range(3) if k != ax]
            bb = fitbox.setdefault(nm, [1e9, -1e9, 1e9, -1e9, a, b])
            for v in f.verts:
                bb[0] = min(bb[0], v.co[bb[4]]); bb[1] = max(bb[1], v.co[bb[4]]); bb[2] = min(bb[2], v.co[bb[5]]); bb[3] = max(bb[3], v.co[bb[5]])
    for f in bm.faces:
        nm = md.mats[f.material_index]; ax = max(range(3), key=lambda k: abs(f.normal[k])); a, b = [k for k in range(3) if k != ax]
        for l in f.loops:
            co = l.vert.co
            if nm in fitbox:
                bb = fitbox[nm]; l[uv].uv = ((co[bb[4]] - bb[0]) / max(bb[1] - bb[0], 1e-6), (co[bb[5]] - bb[2]) / max(bb[3] - bb[2], 1e-6))
            else:
                t = TILE.get(nm, 1.0); l[uv].uv = (co[a] / t, co[b] / t)
    me = bpy.data.meshes.new(md.name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(md.name, me); bpy.context.scene.collection.objects.link(ob)
    for nm in md.mats: me.materials.append(mat(nm, *MATS[nm]))
    return ob
