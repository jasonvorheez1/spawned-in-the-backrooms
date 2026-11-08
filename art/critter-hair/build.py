# Critter hair (Shelly, Nov 8: "at least 18 different hairs for females and 12 for males"). Each style is its own GLB skinned
# whole to the Head bone of the critter rig, so it rides the head like the head GLB does (attachment skin in game).
# Grown over the real head mesh (BVH of Head_<sp>, ears excluded) so a hairline hugs the skull and locks flow round it.
# Slots: hair (tinted by the look's hair colour), hairtie (bands, clips). Run:
#   blender -b --factory-startup --python-exit-code 1 --python art/critter-hair/build.py   (env ONLY=f_bob,m_crop  PROOF=1)
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
HEADS = {"f": "/workspace/shop/headF.glb", "m": "/workspace/shop/value.de385f3a252d2dba941dd3db0bc84d2eba7c85f616d69643cdd6db2c1d02cf35.glb"}
OUT = "/workspace/hair/out"; PROOF = "/workspace/hair/proof"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
HC = Vector((0, 0, 1.265))
EARS = [Vector((-0.104, 0.151, 1.446)), Vector((0.104, 0.151, 1.446))]
V = lambda x, y, z: Vector((x, y, z))
def hdir(u, v): return V(math.sin(u) * math.cos(v), math.cos(u) * math.cos(v), math.sin(v))

# ---------------- the head as a surface ----------------
class Head:
    def __init__(s, path):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        s.rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
        s.mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.parent == s.rig)
        for o in list(bpy.context.scene.objects):
            if o not in (s.rig, s.mesh): bpy.data.objects.remove(o)
        me = s.mesh.data; gi = {g.index: g.name for g in s.mesh.vertex_groups}
        def ear(v): return any(gi.get(g.group, "").startswith("Ear") and g.weight > .3 for g in v.groups)
        keep = set(i for i, v in enumerate(me.vertices) if not ear(v))
        vs = [s.mesh.matrix_world @ v.co for v in me.vertices]
        polys = [list(p.vertices) for p in me.polygons if all(i in keep for i in p.vertices)]
        s.bvh = BVHTree.FromPolygons(vs, polys)
        s.cache = {}
    def r(s, d):
        d = d.normalized(); k = (round(d.x, 3), round(d.y, 3), round(d.z, 3))
        if k in s.cache: return s.cache[k]
        hit = s.bvh.ray_cast(HC + d * 1.2, -d, 1.2)
        rr = (hit[0] - HC).length if hit[0] else .27
        s.cache[k] = rr; return rr
    def pt(s, d, out=0.0): d = d.normalized(); return HC + d * (s.r(d) + out)

H = None
def scalp(u, v, out): return H.pt(hdir(u, v), out)

# ---------------- mesh builder ----------------
class M:
    def __init__(s): s.v = []; s.f = []; s.m = []
    def add(s, pts): b = len(s.v); s.v += pts; return b
    def face(s, idx, mat=0): s.f.append(idx); s.m.append(mat)
    def obj(s, name, mats):
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in s.v], [], s.f); me.update()
        for p, m in zip(me.polygons, s.m): p.material_index = m; p.use_smooth = True
        o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
        for m in mats: me.materials.append(m)
        return o

def push_out(p, off):
    d = p - HC
    if d.length < 1e-4: return p
    want = H.r(d) + off
    if d.z > -.36 and d.length < want: p = HC + d.normalized() * want
    for e in EARS: # ears: a capsule up and out from each root
        a, b = e - V(0, 0, .05), e + (e - HC).normalized() * .2
        ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); c = a + ab * t; q = p - c
        if q.length < .06: p = c + (q.normalized() if q.length > 1e-4 else V(e.x, 0, 0).normalized()) * .06
    if p.z < 1.02: # neck and shoulders: keep a little out from the body
        rr = math.hypot(p.x, p.y + .01); lim = .12 if p.z > .93 else .2
        if rr < lim: k = lim / max(rr, 1e-4); p = V(p.x * k, (p.y + .01) * k - .01, p.z)
    return p

def lock(mesh, root_uv, length, width, flow=None, wave=0.0, curl=0.0, lift=0.0, seed=0, flat=.45, taper=.85, out=.012, steps=None, stiff=.25, tipcurl=0.0, sides=6):
    """a clump of hair: a flattened tapered tube from a scalp point, falling round the head"""
    rnd = random.Random(seed); u, v = root_uv
    n = hdir(u, v); p = scalp(u, v, out * .3)
    down = V(0, 0, -1)
    tang = (down - n * down.dot(n)); tang = tang.normalized() if tang.length > 1e-3 else V(0, -1, 0)
    d = (flow.normalized() if flow is not None else tang) + n * lift
    d.normalize()
    N = steps or max(6, int(length / .022)); step = length / N
    path = [p.copy()]; frames = []
    ph = rnd.random() * 6.28
    for i in range(N):
        t = (i + 1) / N
        g = (down - d * down.dot(d)) * (stiff * (.6 + t))
        d = (d + g).normalized()
        q = p + d * step
        if wave: q += hdir(u + math.pi / 2, 0) * math.sin(t * 9 + ph) * wave * step * 2.2
        if curl or (tipcurl and t > .65):
            c = curl + (tipcurl * (t - .65) / .35 if t > .65 else 0)
            ax = d.cross(V(0, 0, 1)); ax = ax.normalized() if ax.length > 1e-3 else V(1, 0, 0)
            q += (ax * math.cos(t * 14 + ph) + d.cross(ax) * math.sin(t * 14 + ph)) * c * .03
        q = push_out(q, out + .004 * (1 - t))
        d = (q - p).normalized() if (q - p).length > 1e-5 else d
        path.append(q); p = q
    rings = []
    for i, c in enumerate(path):
        t = i / N
        fw = (path[min(i + 1, N)] - path[max(i - 1, 0)]); fw = fw.normalized() if fw.length > 1e-5 else V(0, 0, -1)
        nn = (c - HC); nn = (nn - fw * nn.dot(fw)); nn = nn.normalized() if nn.length > 1e-4 else V(0, -1, 0)
        side = fw.cross(nn).normalized()
        w = width * (1 - taper * t ** 1.6) * (1 + .15 * math.sin(t * 3.14))
        rg = []
        for k in range(sides):
            a = k / sides * 6.2832
            rg.append(c + side * math.cos(a) * w + nn * math.sin(a) * w * flat)
        rings.append(mesh.add(rg))
    for i in range(N):
        a, b = rings[i], rings[i + 1]
        for k in range(sides): mesh.face([a + k, a + (k + 1) % sides, b + (k + 1) % sides, b + k])
    tip = mesh.add([path[-1] + (path[-1] - path[-2]).normalized() * .01])
    for k in range(sides): mesh.face([rings[-1] + k, rings[-1] + (k + 1) % sides, tip])
    root = mesh.add([path[0] - (path[1] - path[0]).normalized() * .006])
    for k in range(sides): mesh.face([rings[0] + (k + 1) % sides, rings[0] + k, root])
    return path

def cap(mesh, front=.45, side=-.15, back=-.55, vol=.02, part=None, swirl=0.0, rough=.004, nu=56, nv=22, top=1.0):
    """the scalp layer: a shell over the skull down to a hairline (front at the brow, sides by the cheeks, back at the nape)"""
    rows = []
    for j in range(nv + 1):
        row = []
        for i in range(nu):
            u = -math.pi + i / nu * 2 * math.pi
            fu = (math.cos(u) + 1) / 2   # 1 front, 0 back
            line = back + (front - back) * fu ** 1.4 + (side - (back + (front - back) * .5)) * math.sin(u) ** 2 * (1 - abs(fu - .5) * 2) ** .5
            v = line + (math.pi / 2 - .01 - line) * (j / nv) ** .9
            o = vol * min(1, (j / nv) * 3.5) ** .7 * top + .003 + rough * min(1, j / nv * 4) * noise.noise(Vector((u * 3, v * 3, 1.7)))
            if part is not None: o -= .008 * math.exp(-((u - part) / .07) ** 2) * (j / nv)
            row.append(scalp(u, v, o))
        rows.append(mesh.add(row))
    for j in range(nv):
        for i in range(nu): mesh.face([rows[j] + i, rows[j] + (i + 1) % nu, rows[j + 1] + (i + 1) % nu, rows[j + 1] + i])
    # a soft rolled edge under the hairline
    inner = mesh.add([HC + (mesh.v[rows[0] + i] - HC) * .97 for i in range(nu)])
    for i in range(nu): mesh.face([inner + i, inner + (i + 1) % nu, rows[0] + (i + 1) % nu, rows[0] + i])

def ball(mesh, c, r, mat=0, sq=(1, 1, 1), bumps=0.0, seg=14, seed=0):
    rows = []
    for j in range(seg + 1):
        th = j / seg * math.pi; row = []
        for i in range(seg * 2):
            ph = i / (seg * 2) * 6.2832
            d = V(math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th))
            rr = r * (1 + bumps * noise.noise(d * 3.5 + V(seed, 0, 0)) + .04 * math.sin(ph * 6 + th * 4))
            row.append(c + V(d.x * sq[0], d.y * sq[1], d.z * sq[2]) * rr)
        rows.append(mesh.add(row))
    s2 = seg * 2
    for j in range(seg):
        for i in range(s2): mesh.face([rows[j] + i, rows[j + 1] + i, rows[j + 1] + (i + 1) % s2, rows[j] + (i + 1) % s2], mat)

def band(mesh, c, axis, r, w=.012):
    axis = axis.normalized(); a = axis.cross(V(0, 0, 1)); a = a.normalized() if a.length > .01 else V(1, 0, 0); b = axis.cross(a)
    rings = []
    for s in (-1, 1):
        rings.append(mesh.add([c + axis * s * w + (a * math.cos(k / 12 * 6.2832) + b * math.sin(k / 12 * 6.2832)) * r for k in range(12)]))
    for k in range(12): mesh.face([rings[0] + k, rings[0] + (k + 1) % 12, rings[1] + (k + 1) % 12, rings[1] + k], 1)

def braid(mesh, path, w, mat=0):
    """a three-strand braid: slanted plump links stepping down a path"""
    L = sum((path[i + 1] - path[i]).length for i in range(len(path) - 1)); n = max(4, int(L / (w * 1.3)))
    def at(t):
        s = t * L
        for i in range(len(path) - 1):
            seg = (path[i + 1] - path[i]).length
            if s <= seg or i == len(path) - 2: return path[i].lerp(path[i + 1], min(1, s / max(seg, 1e-5))), (path[i + 1] - path[i]).normalized()
            s -= seg
    for k in range(n):
        t = (k + .5) / n; c, fw = at(t); side = fw.cross(c - HC).normalized() if fw.cross(c - HC).length > 1e-4 else V(1, 0, 0)
        ww = w * (1 - .45 * t)
        ball(mesh, c + side * ww * .35 * (1 if k % 2 else -1), ww * .62, mat, (1, 1, 1.25), seg=6)

# ---------------- the styles ----------------
def spread(n, u0, u1, v): return [(u0 + (u1 - u0) * (i + .5) / n, v) for i in range(n)]
def bangs(m, kind, seed, length=.17):
    if kind == "blunt":
        for i, (u, v) in enumerate(spread(11, -.62, .62, 1.0)): lock(m, (u, v), length + .02, .042, flow=V(math.sin(u) * .2, 1, -1.1), seed=seed + i, stiff=.5, flat=.35, taper=.3)
    elif kind == "side":
        for i, (u, v) in enumerate(spread(8, -.5, .55, 1.05)): lock(m, (u, v), length + .04 * (u + .5), .045, flow=V(1.1, .6, -.6), seed=seed + i, stiff=.35, flat=.35)
    elif kind == "curtain":
        for i, (u, v) in enumerate(spread(8, -.6, .6, 1.08)): s = 1 if u > 0 else -1; lock(m, (u, v), length + .06, .045, flow=V(s * 1.2, .5, -.7), seed=seed + i, stiff=.3, flat=.35)
    elif kind == "wispy":
        for i, (u, v) in enumerate(spread(9, -.55, .55, .98)): lock(m, (u, v), length - .02 + .04 * random.Random(seed + i).random(), .03, flow=V(math.sin(u) * .5, 1, -1), seed=seed + i, stiff=.45, flat=.4)
    elif kind == "swoop":
        for i, (u, v) in enumerate(spread(7, -.45, .45, 1.1)): lock(m, (u, v), .2, .05, flow=V(1, .7, .25), lift=.25, seed=seed + i, stiff=.12, flat=.4, tipcurl=.5)
    elif kind == "spiky":
        for i, (u, v) in enumerate(spread(6, -.5, .5, 1.05)): lock(m, (u, v), .12, .04, flow=V(math.sin(u) * .6, 1, -.4), lift=.4, seed=seed + i, stiff=.15, taper=.95)

def curtain_back(m, length, seed, n=16, width=.055, wave=0.0, curl=0.0, tipcurl=0.0, u0=.75, v=.55, flat=.42):
    """the fall: locks round the crown and back, hanging to `length`"""
    for i in range(n):
        u = u0 + (2 * math.pi - 2 * u0) * (i + .5) / n
        vv = v + .12 * random.Random(seed + i).random()
        lock(m, (u, vv), length * (.9 + .15 * random.Random(seed * 3 + i).random()), width, seed=seed + i, wave=wave, curl=curl, tipcurl=tipcurl, flat=flat)
    for s in (-1, 1): # side locks framing the face, behind the cheeks
        for k in range(2): lock(m, (s * (1.05 + k * .22), .5), length * (.85 - k * .05), width * .95, seed=seed + 50 + k + (s > 0) * 9, wave=wave, curl=curl, tipcurl=tipcurl, flat=flat)

def tail(m, root_uv, length, width, seed, flow=V(0, -1, 0), wave=0.0, curl=0.0, n=7, lift=.6, tie=True):
    u, v = root_uv; base = scalp(u, v, .03)
    if tie: band(m, base, (base - HC), .045)
    for k in range(n):
        a = k / n * 6.28; du, dv = math.cos(a) * .07, math.sin(a) * .05
        lock(m, (u + du, v + dv), length, width, flow=flow, lift=lift, seed=seed + k, wave=wave, curl=curl, stiff=.22, out=.03)

def bun(m, uv, r, seed, tie=True):
    c = scalp(uv[0], uv[1], r * .75)
    ball(m, c, r, 0, (1, 1, .9), bumps=.12, seed=seed)
    if tie: band(m, scalp(uv[0], uv[1], .015), c - HC, r * .55)
    return c

def spikes(m, n, length, seed, v0=.75):
    rnd = random.Random(seed)
    for i in range(n):
        u = rnd.uniform(-math.pi, math.pi); v = rnd.uniform(v0, 1.45)
        if min(abs(u - .6), abs(u + .6)) < .3 and v > .55 and v < 1.05: continue
        nn = hdir(u, v); lock(m, (u, v), length * rnd.uniform(.7, 1.2), .05, flow=nn + V(0, -.3, .5), lift=1, seed=seed + i, stiff=.05, taper=.97, flat=.7, steps=6)

def S(cap_kw=None, **kw): return dict(cap=cap_kw or {}, **kw)
STYLES = {
  # ---- female: 18 ----
  "f_bob":        lambda m: (cap(m, vol=.03), bangs(m, "blunt", 1), curtain_back(m, .26, 10, n=18, width=.06, tipcurl=.6)),
  "f_long":       lambda m: (cap(m, vol=.025, part=0), bangs(m, "curtain", 2), curtain_back(m, .62, 20, n=18, width=.06)),
  "f_ponytail":   lambda m: (cap(m, vol=.018, back=.1, side=.05), bangs(m, "wispy", 3), tail(m, (math.pi, .85), .48, .05, 30, wave=.15)),
  "f_twintails":  lambda m: (cap(m, vol=.02, back=.0), bangs(m, "blunt", 4), [tail(m, (s * 2.1, .65), .55, .05, 40 + s, flow=V(s * .8, -.4, -.3), lift=.4) for s in (-1, 1)]),
  "f_sidebraid":  lambda m: (cap(m, vol=.02, back=.05, part=.3), bangs(m, "side", 5), braid(m, lock(M(), (2.5, .3), .5, .05, flow=V(.6, .2, -1), seed=55, stiff=.4, out=.05), .07)),
  "f_messybun":   lambda m: (cap(m, vol=.02, back=.15, side=.1, rough=.01), bangs(m, "wispy", 6, .14), bun(m, (math.pi * .97, 1.2), .1, 60), [lock(m, (s * 1.25, .4), .2, .025, seed=61 + s, wave=.3) for s in (-1, 1)]),
  "f_spacebuns":  lambda m: (cap(m, vol=.02, back=.05, part=0), bangs(m, "blunt", 7, .15), [bun(m, (s * 2.0, 1.15), .085, 70 + s) for s in (-1, 1)]),
  "f_pixie":      lambda m: (cap(m, vol=.03, back=-.05, side=.1, rough=.012), bangs(m, "side", 8, .12), curtain_back(m, .12, 80, n=12, width=.06, v=.45)),
  "f_wavy":       lambda m: (cap(m, vol=.03, part=.25), bangs(m, "side", 9), curtain_back(m, .55, 90, n=18, width=.065, wave=.5)),
  "f_curly":      lambda m: (cap(m, vol=.045, rough=.015), bangs(m, "wispy", 10, .13), curtain_back(m, .32, 100, n=20, width=.06, curl=.9, flat=.8)),
  "f_hime":       lambda m: (cap(m, vol=.02, part=0), bangs(m, "blunt", 11, .19), [lock(m, (s * (1.0 + k * .12), .45), .3, .055, seed=112 + k + s * 5, stiff=.6, flat=.35, taper=.15) for s in (-1, 1) for k in range(2)], curtain_back(m, .6, 113, n=16, width=.06, u0=1.3)),
  "f_sidetail":   lambda m: (cap(m, vol=.02, back=.05, part=-.3), bangs(m, "side", 12), tail(m, (2.2, .75), .45, .05, 120, flow=V(.8, -.4, -.2), wave=.2, lift=.4)),
  "f_twinbraids": lambda m: (cap(m, vol=.018, back=-.1, part=0), bangs(m, "wispy", 13), [braid(m, lock(M(), (s * 2.3, .1), .45, .05, flow=V(s * .3, .4, -1), seed=130 + s, stiff=.5, out=.05), .065) for s in (-1, 1)]),
  "f_curtainmid": lambda m: (cap(m, vol=.025, part=0), bangs(m, "curtain", 14, .2), curtain_back(m, .38, 140, n=18, width=.06, tipcurl=.4)),
  "f_wolfcut":    lambda m: (cap(m, vol=.04, rough=.015), bangs(m, "wispy", 15, .16), spikes(m, 10, .1, 150, v0=.9), curtain_back(m, .34, 151, n=16, width=.05, wave=.4)),
  "f_afropuff":   lambda m: (cap(m, vol=.02, back=.1, side=.05, rough=.008), ball(m, scalp(math.pi * .92, 1.15, .14), .16, 0, (1, 1, .85), bumps=.18, seed=160, seg=16), band(m, scalp(math.pi * .92, 1.15, .02), hdir(math.pi * .92, 1.15), .08)),
  "f_halfup":     lambda m: (cap(m, vol=.025, part=.2), bangs(m, "curtain", 17), bun(m, (math.pi, 1.0), .07, 170), curtain_back(m, .5, 171, n=16, width=.06, wave=.25, v=.3)),
  "f_ringlets":   lambda m: (cap(m, vol=.025, back=0), bangs(m, "blunt", 18, .16), [tail(m, (s * 2.05, .75), .45, .055, 180 + s * 3, flow=V(s * .6, -.2, -.6), curl=1.4, n=5, lift=.3) for s in (-1, 1)]),
  # ---- male: 12 ----
  "m_crop":       lambda m: (cap(m, front=.6, side=.15, back=-.15, vol=.022, rough=.006), bangs(m, "wispy", 201, .07)),
  "m_spiky":      lambda m: (cap(m, front=.6, side=.15, back=-.15, vol=.025), spikes(m, 26, .14, 210, v0=.55), bangs(m, "spiky", 211)),
  "m_sidepart":   lambda m: (cap(m, front=.6, side=.12, back=-.18, vol=.03, part=-.45), bangs(m, "swoop", 220)),
  "m_fluffy":     lambda m: (cap(m, front=.5, side=.05, back=-.2, vol=.045, rough=.016), bangs(m, "wispy", 230, .13), curtain_back(m, .12, 231, n=14, width=.055, v=.4, curl=.4)),
  "m_undercut":   lambda m: (cap(m, front=.65, side=.6, back=.55, vol=.04, rough=.006), cap(m, front=.6, side=.15, back=-.2, vol=.006, rough=0), bangs(m, "swoop", 240)),
  "m_mohawk":     lambda m: (cap(m, front=.6, side=.15, back=-.2, vol=.004, rough=0), [lock(m, (u, 1.0 + .45 * math.cos(u)), .16, .05, flow=hdir(u, 1.2) + V(0, -.2, .4), lift=1, seed=250 + i, stiff=.04, taper=.95, flat=.3, steps=6) for i, u in enumerate([math.pi * (k / 8 - .5) * 2 for k in range(9)]) if abs(u) > 2.2 or abs(u) < .3]),
  "m_manbun":     lambda m: (cap(m, front=.55, back=.1, side=.1, vol=.018, part=0), bun(m, (math.pi, 1.05), .075, 260)),
  "m_shaggy":     lambda m: (cap(m, front=.5, side=0, back=-.25, vol=.035, rough=.012), bangs(m, "wispy", 270, .16), curtain_back(m, .24, 271, n=16, width=.055, wave=.35)),
  "m_curtains":   lambda m: (cap(m, front=.55, side=.05, back=-.2, vol=.028, part=0), bangs(m, "curtain", 280, .15), curtain_back(m, .16, 281, n=14, width=.055, v=.45)),
  "m_buzz":       lambda m: (cap(m, front=.62, side=.2, back=-.12, vol=.009, rough=.002),),
  "m_slick":      lambda m: (cap(m, front=.62, side=.15, back=-.18, vol=.03), [lock(m, (u, 1.05), .3, .05, flow=V(0, -1, .2), lift=.5, seed=300 + i, stiff=.15, flat=.3) for i, u in enumerate([(k / 6 - .5) * 1.1 for k in range(7)])]),
  "m_curlytop":   lambda m: (cap(m, front=.6, side=.25, back=-.1, vol=.012, rough=.003), [ball(m, scalp(u, v, .035), .045, 0, bumps=.25, seg=7, seed=310 + i) for i, (u, v) in enumerate([(random.Random(i).uniform(-math.pi, math.pi), random.Random(i * 7).uniform(.55, 1.5)) for i in range(70)]) if not (min(abs(u - .6), abs(u + .6)) < .28 and .55 < v < 1.05)]),
}

def mats():
    h = bpy.data.materials.new("hair"); h.use_nodes = True; b = h.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (.32, .17, .09, 1); b.inputs["Roughness"].default_value = .55
    t = bpy.data.materials.new("hairtie"); t.use_nodes = True; b = t.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (.85, .2, .35, 1); b.inputs["Roughness"].default_value = .4
    return [h, t]

def skin(ob, rig):
    g = ob.vertex_groups.new(name="Head"); g.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    ob.parent = rig; md = ob.modifiers.new("skin", "ARMATURE"); md.object = rig

def proof(objs, name):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 300
    sc.render.film_transparent = False
    if not sc.world: sc.world = bpy.data.worlds.new("w")
    sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (.5, .5, .52, 1)
    if "Key" not in bpy.data.objects:
        L = bpy.data.lights.new("Key", "SUN"); L.energy = 3; lo = bpy.data.objects.new("Key", L); sc.collection.objects.link(lo); lo.rotation_euler = (.9, .2, 2.6)
        cd = bpy.data.cameras.new("Cam"); cd.lens = 50; co = bpy.data.objects.new("Cam", cd); sc.collection.objects.link(co); sc.camera = co
    co = bpy.data.objects["Cam"]; files = []
    for k, a in enumerate((0.0, 1.57, 2.6)):
        pos = HC + V(math.sin(a) * 1.9, math.cos(a) * 1.9, .1) + V(0, 0, -.12); co.location = pos
        co.rotation_euler = (HC + V(0, 0, -.12) - pos).to_track_quat("-Z", "Y").to_euler()
        bpy.data.objects["Key"].rotation_euler = (.9, .2, 3.14 - a * .7)
        f = os.path.join(PROOF, f"{name}_{k}.png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True); files.append(f)
    return files

def run(sex):
    global H
    H = Head(HEADS[sex]); MATS = mats()
    for name, fn in STYLES.items():
        if not name.startswith(sex + "_") or (ONLY and name not in ONLY): continue
        m = M(); fn(m); o = m.obj("Hair_" + name, MATS); skin(o, H.rig)
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if os.environ.get("PROOF"): proof([o], name)
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); H.rig.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f"hair-{name}.glb"), use_selection=True, export_apply=False, export_skins=True, export_animations=False)
        print("HAIR", name, "tris", tris)
        bpy.data.objects.remove(o)

for sx in ("f", "m"): run(sx)
