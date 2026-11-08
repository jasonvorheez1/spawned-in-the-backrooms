# Critter hair (Shelly, Nov 8: "at least 18 different hairs for females and 12 for males"; Nov rebuild: soft clumps, no sawtooth).
# Each style is its own GLB skinned whole to the Head bone of the critter rig (attachment skin in game), slots:
#   hair (tinted by the look's hair colour), hairtie (bands, ties).
# The hair grows over an ENVELOPE of every species' head of that sex (ears excluded), so one GLB fits them all:
#   hug radius = 75th percentile skull radius per direction, sink radius = smallest skull - 1.5 cm (a hairline melts into fur).
#   Ears: the cap sinks under the fur round every species' ear base (the hairline parts round them) and every lock is pushed off them.
# Building blocks (all smooth tubes with rounded tips, no strand noise):
#   cap()      the skull shell, hairline mask + ear parting          drape()   a lock's path: hugs the skull, then falls with gravity
#   clump()    one flat soft lock (ribbon tube, rounded tip)         hem()     the back/side fringe: 5-9 clumps per side, two overlapping layers
#   bangs()    rounded clumps ON the forehead, stopping above the eyes   tail()  a fat teardrop tail rooted in a hairtie
#   bun() / puff()  lobed balls with a tie    braid()  overlapping beads + tie + tuft    spikes() / fins()  stiff rounded clumps
# One function per style at the bottom (STYLES). A later pass (hat squash) can add a shape key on the finished mesh in finish().
# Run:  blender -b --factory-startup --python-exit-code 1 --python art/critter-hair/build.py   (env ONLY=f_bob,m_crop  PROOF=1)
# Heads: spawn fetch each species' headF/headM (scripts/lib/data/critter-models.yml) into HEADS/<species>_<f|m>.glb.
import bpy, bmesh, math, os, random, glob
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HEADS = "/workspace/hair/heads/heads"; RIG_FROM = "cat"
OUT = "/workspace/hair/out"; PROOF = "/workspace/hair/proof"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
TRI_CAP = 8000
ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
HC = Vector((0, 0, 1.265)); DOWN = Vector((0, 0, -1))
V = lambda x, y, z: Vector((x, y, z))
HAT_V = .62        # hatted variants: crown flattened above this elevation (cap/beanie/tophat/partyhat brims sit about here)
EYE_Z = 1.43       # nothing in front of the face goes below this (eye ink tops out at 1.391)
def hdir(u, v):    # u: azimuth from the face (+Y) toward +X, v: elevation
    return V(math.sin(u) * math.cos(v), math.cos(u) * math.cos(v), math.sin(v))
def sstep(a, b, x): t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

# ---------------- the envelope of every head of one sex ----------------
class Envelope:
    def __init__(s, sex):
        s.bvhs = []; ears = []; s.base = []
        for f in sorted(glob.glob(f"{HEADS}/*_{sex}.glb")):
            bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
            ob = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.vertex_groups and not o.name.startswith("Ico"))
            me = ob.data; gi = {g.index: g.name for g in ob.vertex_groups}
            vs = [ob.matrix_world @ v.co for v in me.vertices]
            ear = [any(gi.get(g.group, "").startswith("Ear") and g.weight > .3 for g in v.groups) for v in me.vertices]
            polys = [list(p.vertices) for p in me.polygons if not any(ear[i] for i in p.vertices) and all(vs[i].z > .95 for i in p.vertices)]
            bvh = BVHTree.FromPolygons(vs, polys); s.bvhs.append(bvh)
            for i, v in enumerate(vs):
                if ear[i]:
                    ears.append(v); ears.append(V(-v.x, v.y, v.z))
                    n = bvh.find_nearest(v)
                    if n[0] is not None and n[3] < .02: s.base += [v, V(-v.x, v.y, v.z)]
        s.ear = KDTree(len(ears)); [s.ear.insert(p, i) for i, p in enumerate(ears)]; s.ear.balance()
        s.eb = KDTree(len(s.base)); [s.eb.insert(p, i) for i, p in enumerate(s.base)]; s.eb.balance()
        s.cache = {}
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=f"{HEADS}/{RIG_FROM}_{sex}.glb")
        s.rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
        for o in list(bpy.context.scene.objects):
            if o is not s.rig: bpy.data.objects.remove(o)
    def radii(s, d):
        d = d.normalized(); k = (round(d.x, 2), round(d.y, 2), round(d.z, 2))
        if k not in s.cache:
            rs = []
            for b in s.bvhs:
                h = b.ray_cast(HC + d * 1.0, -d, 1.0); rs.append((h[0] - HC).length if h[0] else .3)
            rs.sort(); med = rs[len(rs) // 2]
            s.cache[k] = (min(rs[-1], med + .03) + .004, rs[0])   # cover: outside every head (a big outlier capped at +3 cm), never sunk into fur
        return s.cache[k]
    def hug(s, d): return s.radii(d)[0]
    def sink(s, d): return s.radii(d)[1] - .015
E = None
def scalp(u, v, out=0.0): d = hdir(u, v); return HC + d * (E.hug(d) + out)

# ---------------- mesh builder ----------------
class M:
    def __init__(s): s.v = []; s.f = []; s.m = []
    def add(s, pts): b = len(s.v); s.v += [p.copy() for p in pts]; return b
    def face(s, idx, mat=0): s.f.append(idx); s.m.append(mat)

def keep_off(p, off, hug=None, eyes=True):
    """push a point out of the skull envelope (and off the ears, the neck, the eyes); hug pulls it back if it floats"""
    d = p - HC; r = E.hug(d) + off
    if d.length < r: p = HC + d.normalized() * r
    elif hug is not None and d.length > r + hug: p = HC + d.normalized() * (r + hug)
    for _ in range(2):
        q, _i, dist = E.ear.find(p)
        if q is not None and dist < off + .012:
            a = (p - q); a = a.normalized() if a.length > 1e-5 else V(math.copysign(1, p.x), -.3, 0).normalized()
            p = q + a * (off + .012)
    if p.z < 1.02:   # neck and shoulders
        rr = math.hypot(p.x, p.y + .01); lim = .13 + .06 * sstep(.97, .86, p.z)
        if rr < lim: k = lim / max(rr, 1e-4); p = V(p.x * k, (p.y + .01) * k - .01, p.z)
    if eyes and p.z < EYE_Z and p.y > .08 and abs(p.x) < .32:   # never over the eyes: slide behind the cheek
        p = V(p.x, .08, p.z)
    return p

def drape(p0, d0, length, off, stiff=.82, hug=.01, free_z=1.0, steps=10, stop_z=None, eyes=True):
    """a lock's centre line: leaves p0 along d0, bends to gravity, hugs the skull above free_z, then hangs free"""
    p = p0.copy(); d = d0.normalized(); pts = [p.copy()]; st = length / steps
    for k in range(steps):
        d = (d * stiff + DOWN * (1 - stiff)).normalized()
        q = keep_off(p + d * st, off, hug if p.z > free_z else None, eyes)
        if (q - p).length > 1e-5: d = (q - p).normalized()
        p = q; pts.append(p.copy())
        if stop_z is not None and p.z < stop_z: break
    return pts

def tube(m, path, rw, rt, up=None, K=8, mat=0, lobes=0, lobe_amp=0.0, twist=0.0):
    """a smooth closed tube along path; rw/rt: half width/thickness per point (0 at the ends closes a rounded pole)"""
    n = len(path); rings = []
    for i, p in enumerate(path):
        t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]); t = t.normalized() if t.length > 1e-6 else V(0, 0, -1)
        nr = (up if up is not None else (p - HC)); side = t.cross(nr)
        if side.length < 1e-4: side = t.orthogonal()
        side.normalize(); nn = side.cross(t).normalized()
        if rw[i] < 1e-4: rings.append(m.add([p])); continue
        ring = []
        for k in range(K):
            a = 2 * math.pi * k / K + twist * i
            f = 1 + lobe_amp * math.cos(lobes * a) if lobes else 1
            ring.append(p + side * math.cos(a) * rw[i] * f + nn * math.sin(a) * rt[i] * f)
        rings.append(m.add(ring))
    for i in range(n - 1):
        a, b = rings[i], rings[i + 1]; pa, pb = rw[i] < 1e-4, rw[i + 1] < 1e-4
        for k in range(K):
            k2 = (k + 1) % K
            if pa and pb: continue
            if pa: m.face([a, b + k, b + k2], mat)
            elif pb: m.face([a + k, b, a + k2], mat)
            else: m.face([a + k, b + k, b + k2, a + k2], mat)

def lock_profile(n, W, T, tip=.4, root=.12, blunt=0.0):
    """half widths along a lock: rounded root (sunk under the cap), full body, a rounded taper to the tip"""
    rw, rt = [], []
    for i in range(n):
        t = i / (n - 1)
        if i == 0 or i == n - 1: rw.append(0); rt.append(0); continue
        a = math.sin(min(1, t / root) * math.pi / 2) if t < root else 1
        if t > 1 - tip:
            x = (t - (1 - tip)) / tip
            a *= math.sqrt(max(0, 1 - x ** (2 + 6 * blunt))) ** .7
        rw.append(W * max(a, .15)); rt.append(T * max(a, .25))
    return rw, rt

def clump(m, path, W, T, tip=.45, blunt=0.0, mat=0, K=8):
    """one soft flat lock along a path: the unit of every hem, bang and fringe"""
    if len(path) < 3: return
    # resample so the tube has an even ring spacing and a pole cap at both ends
    pts = [path[0] - (path[1] - path[0]).normalized() * T * .5] + path + [path[-1] + (path[-1] - path[-2]).normalized() * T]
    rw, rt = lock_profile(len(pts), W, T, tip, blunt=blunt)
    tube(m, pts, rw, rt, K=K, mat=mat)

def wave_path(path, amp, freq, ph, axis=None):
    """a gentle S wave sideways along a path, growing from the root"""
    out = []; n = len(path)
    for i, p in enumerate(path):
        t = i / max(1, n - 1)
        t_dir = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        side = axis or t_dir.cross(p - HC).normalized()
        out.append(keep_off(p + side * amp * t * math.sin(freq * t * math.pi * 2 + ph), .012, None))
    return out

# ---------------- the cap: the skull shell ----------------
def cap(m, front=.8, side=.2, back=-.35, vol=.02, part=None, ear_gap=.035):
    """the shell over the skull: hairline at elevation front/side/back (radians), thickness vol, sinks under fur past
    the hairline and round every ear base so the hair parts round the ears; part=azimuth of a soft part line"""
    NU, NV = 56, 30; grid = []; w = []
    for j in range(NV + 1):
        v = -.75 + (math.pi / 2 + .75) * j / NV; row = []; wrow = []
        for i in range(NU):
            u = -math.pi + 2 * math.pi * i / NU; au = abs(u)
            line = (front + (side - front) * sstep(0, math.pi / 2, au)) if au < math.pi / 2 else (side + (back - side) * sstep(math.pi / 2, math.pi, au))
            hm = sstep(line - .025, line + .06, v)
            d = hdir(u, v); hp = HC + d * E.hug(d)
            _q, _i, ed = E.eb.find(hp)
            em = sstep(ear_gap * .55, ear_gap * 1.5, ed)
            th = max(.016, vol * (.6 + .4 * max(0, math.sin(v))))   # never thinner than the fur's own bumps
            if part is not None: th *= 1 - .45 * math.exp(-((u - part) / .07) ** 2) * sstep(.6, 1.0, v)
            k = hm * em
            r = E.sink(d) + (E.hug(d) + th - E.sink(d)) * k
            row.append(HC + d * r); wrow.append(k)
        grid.append(row); w.append(wrow)
    base = len(m.v); m.v += [p for row in grid for p in row]; top = m.add([HC + V(0, 0, 1) * (E.hug(V(0, 0, 1)) + vol)])
    for j in range(NV):
        for i in range(NU):
            i2 = (i + 1) % NU
            if max(w[j][i], w[j][i2], w[j + 1][i], w[j + 1][i2]) < .02: continue
            m.face([base + j * NU + i, base + j * NU + i2, base + (j + 1) * NU + i2, base + (j + 1) * NU + i])
    for i in range(NU): m.face([base + NV * NU + i, base + NV * NU + (i + 1) % NU, top])

# ---------------- hems, bangs ----------------
def hem(m, length, per_side=7, W=.05, T=.016, u_from=1.25, v_lo=.42, v_hi=.95, wave=0.0, stiff=.85, seed=0, layers=2, blunt=0.0, spread=0.0, free_z=1.0):
    """the back and side fringe: per_side clumps each side from behind the ear (u_from) to the nape, two layers that overlap
    so no scalp shows; each a soft lock with a rounded tip; lengths vary gently, never a sawtooth"""
    rnd = random.Random(seed)
    if length < .16: layers = 1; W *= 1.15; T *= .8   # a short hem is one soft row, never a braided band
    for L in range(layers):
        n = per_side * 2; shift = .5 * L
        for k in range(n + (0 if L else 1)):
            t = (k + shift) / n                      # 0..1 across the back, side to side
            u = (u_from + (2 * math.pi - 2 * u_from) * t)
            ub = u if u <= math.pi else u - 2 * math.pi
            back = abs(abs(ub) - math.pi) / (math.pi - u_from)   # 1 at the side, 0 at the nape
            v = v_hi + (v_lo - v_hi) * back
            ln = length * (1 - .14 * L) * (1 + (rnd.random() - .5) * .14) * (1 - .1 * back * (1 - min(1, length / .3)))
            off = T + .004 + L * T * 1.1
            d = hdir(ub, v); p0 = HC + d * (E.hug(d) + T * .4)
            fwd = (hdir(ub, v - .1) - hdir(ub, v)).normalized() + V(math.sin(ub), math.cos(ub), 0) * spread
            path = drape(p0, fwd, ln, off, stiff=stiff, hug=.008, free_z=free_z, steps=max(6, min(10, int(ln / .035))))
            if wave: path = wave_path(path, wave, max(.8, ln / .35), rnd.random() * 6.28)
            clump(m, path, W * (1 - .1 * L), T, tip=.42, blunt=blunt)

def bangs(m, kind="blunt", seed=0, n=7, stop=EYE_Z + .02, W=.05, T=.017, span=.62, root_v=1.18):
    """fringe clumps sitting ON the forehead: root under the cap, flow over the brow, rounded tips above the eyes.
    kind: blunt (even), wispy (alternating, pointier), side (all swept to +x), curtain (parted, to both temples),
    spiky (short stiff up-forward points), swoop (one big sideways sweep)"""
    rnd = random.Random(seed)
    for k in range(n):
        t = (k / (n - 1)) * 2 - 1 if n > 1 else 0
        u = t * span; v = root_v - .08 * abs(t)
        d = hdir(u, v); p0 = HC + d * (E.hug(d) + T * .3)
        fwd = (hdir(u, v - .1) - hdir(u, v)).normalized(); sd = V(math.cos(u), -math.sin(u), 0)
        st = stop + .025 * abs(t) ** 2; ln = .3; tip = .5; w = W; blunt = .3
        if kind == "wispy": st += (.025 if k % 2 else 0) + rnd.random() * .01; tip = .6; w = W * .85; blunt = 0
        elif kind == "side": fwd = (fwd + sd * .9).normalized(); st += .03 * (t + 1); blunt = .1
        elif kind == "curtain": fwd = (fwd + sd * 1.3 * (1 if t >= 0 else -1)).normalized(); st += .05 * (1 - abs(t)); tip = .55; blunt = 0
        elif kind == "spiky": st = stop + .07 + .02 * (k % 2); fwd = (fwd + V(0, 0, .5)).normalized(); tip = .7; blunt = 0
        elif kind == "swoop": fwd = (fwd + sd * 1.6).normalized(); st = stop + .05 + .05 * (1 - t); w = W * 1.15; blunt = 0
        path = drape(p0, fwd, ln, T + .006, stiff=.93, hug=.006, free_z=0, steps=10, stop_z=st)
        clump(m, path, w, T, tip=tip, blunt=blunt)

def side_locks(m, per=1, length=.3, W=.05, T=.017, u=1.3, v=.45, blunt=0.0, seed=0, wave=0.0):
    """face-framing locks that fall close behind the cheeks"""
    rnd = random.Random(seed)
    for s in (-1, 1):
        for k in range(per):
            uu = s * (u + .14 * k); d = hdir(uu, v + .1 * k); p0 = HC + d * (E.hug(d) + T * .4)
            path = drape(p0, (hdir(uu, v - .1) - hdir(uu, v)).normalized(), length * (1 - .12 * k), T + .006 + k * .012, stiff=.9, hug=.008, steps=10)
            if wave: path = wave_path(path, wave, 1.0, rnd.random() * 6.28)
            clump(m, path, W, T, tip=.4, blunt=blunt)

def taper(path, xk=.68, end_y=-.16, pull=.6, z0=None, z1=.86, minx=.0):
    """long hair below the skull narrows: x draws in toward the shoulders, y toward the back of the neck, so the
    front and side profiles taper to the tips instead of hanging as a block (no helmet, no flare)"""
    z0 = HC.z - .03 if z0 is None else z0; out = []
    for p in path:
        f = sstep(z0, z1, p.z)
        x = p.x * (1 - (1 - xk) * f)
        if minx and abs(p.x) >= minx: x = math.copysign(max(abs(x), minx), p.x)
        y = p.y + (end_y - p.y) * pull * f if p.y < end_y else p.y
        out.append(keep_off(V(x, y, p.z), .012, None))
    sm = [out[0]] + [(out[i - 1] + out[i] * 2 + out[i + 1]) / 4 for i in range(1, len(out) - 1)] + [out[-1]]
    return sm

def long_back(m, length=.66, groups=(1.75, 2.12, 2.48, 2.84), per=3, W=.05, T=.017, v_root=.62, seed=0, wave=0.0, blunt=0.0, fill=.24):
    """long hair down the back in separate clumps: per side, groups of locks rooted under the cap behind the ears, hugging
    the skull to its widest point, then falling and tapering; each group's locks gather at their tips, the groups stay apart
    and the innermost pair leaves a gap at the nape; a short underlayer (fill) hides the scalp between the groups up top"""
    rnd = random.Random(seed)
    for sgn in (-1, 1):
        for gi, gu in enumerate(groups):
            inner = gi == len(groups) - 1
            gl = length * (1 - .06 * gi) * (1 + (rnd.random() - .5) * .08)
            for k in range(per):
                du = (k - (per - 1) / 2) * .13
                u = sgn * (gu + du); v = v_root + .12 * (gu - groups[0]) / 1.2 + rnd.uniform(-.03, .03)
                d = hdir(u, v); p0 = HC + d * (E.hug(d) + T * .4)
                fwd = (hdir(u, v - .1) - hdir(u, v)).normalized()
                off = T + .005 + (.008 if k == (per - 1) // 2 else 0)
                path = drape(p0, fwd, gl * (1 - .07 * abs(k - (per - 1) / 2)), off, stiff=.86, hug=.008, free_z=HC.z - .02, steps=14)
                if wave: path = wave_path(path, wave, max(.8, gl / .35), rnd.random() * 6.28)
                # the group's locks gather toward its middle as they fall
                gx = HC + hdir(sgn * gu, v) * .3
                path = [p + (V(gx.x, p.y, p.z) - p) * .45 * sstep(HC.z, HC.z - .3, p.z) * (1 if per > 1 else 0) for p in path]
                path = taper(path, xk=.7, end_y=-.15, pull=.55, minx=.055 if inner else 0)
                clump(m, path, W * (1 - .08 * abs(k - (per - 1) / 2)), T, tip=.4, blunt=blunt)
    if fill:   # the underlayer: shorter soft locks across the back, ending above the neck so the nape shows between the clumps
        hem(m, fill, per_side=5, W=W * 1.05, T=T * .9, u_from=1.7, v_lo=.3, v_hi=.55, seed=seed + 50, layers=1, stiff=.86)

def front_locks(m, length=.5, W=.05, T=.017, u=1.32, v=.5, blunt=0.0, seed=0, wave=0.0):
    """face-framing locks before the ears: fall close past the cheeks, tips drawn in toward the collarbone"""
    rnd = random.Random(seed)
    for sgn in (-1, 1):
        uu = sgn * u; d = hdir(uu, v); p0 = HC + d * (E.hug(d) + T * .4)
        path = drape(p0, (hdir(uu, v - .1) - hdir(uu, v)).normalized(), length, T + .006, stiff=.9, hug=.008, steps=12)
        if wave: path = wave_path(path, wave, 1.0, rnd.random() * 6.28)
        path = taper(path, xk=.72, end_y=.0, pull=0, z0=HC.z - .08, z1=.9)
        clump(m, path, W, T, tip=.4, blunt=blunt)

# ---------------- tails, buns, braids, spikes ----------------
def tie(m, c, axis, R=.03, r=.011, mat=1):
    """a hairtie: a soft torus round a tail or bun root"""
    axis = axis.normalized(); a = axis.orthogonal().normalized(); b = axis.cross(a); NU, NV = 14, 6; base = len(m.v)
    for i in range(NU):
        th = 2 * math.pi * i / NU; ctr = c + (a * math.cos(th) + b * math.sin(th)) * R
        rad = (a * math.cos(th) + b * math.sin(th))
        for j in range(NV):
            ph = 2 * math.pi * j / NV; m.v.append(ctr + rad * math.cos(ph) * r + axis * math.sin(ph) * r)
    for i in range(NU):
        for j in range(NV):
            i2, j2 = (i + 1) % NU, (j + 1) % NV
            m.face([base + i * NV + j, base + i2 * NV + j, base + i2 * NV + j2, base + i * NV + j2], mat)

def frame(t, out):
    """a side/normal pair across a path tangent t, side facing away from 'out' (the head's outward)"""
    a = out - t * out.dot(t)
    if a.length < 1e-4: a = t.orthogonal()
    a.normalize(); return a, t.cross(a).normalized()

def tail(m, uv, length=.42, W=.12, flow=None, out=.04, stiff=.78, seed=0, curl=0.0, tie_r=.03, locks=4, s_amp=.03):
    """a full teardrop tail: a hairtie on the skull, then 3-5 soft locks wound round a core that swell together to W
    across a third of the way down and gather to a rounded point; the centre line hangs with gravity in a gentle S"""
    rnd = random.Random(seed)
    u, v = uv; n = hdir(u, v); root = HC + n * (E.hug(n) + .006)
    tie(m, root + n * .014, n, R=tie_r, r=.013)
    hz = V(n.x, n.y, 0); hz = hz.normalized() if hz.length > 1e-4 else V(0, -1, 0)
    sway = V(-hz.y, hz.x, 0)                                  # the S bends across the hang, seen from front and side
    p = root + n * .03; d = (n * .9 + (flow or V(0, 0, 0)) + DOWN * .25).normalized()
    N = 16; st = length / N; C = [root - n * .012, root + n * .016, p.copy()]; R = [0, tie_r * .85, tie_r * .95]
    def prof(t):
        if t < .3: return tie_r * .95 + (W / 2 - tie_r * .95) * math.sin(t / .3 * math.pi / 2)
        return W / 2 * max(0.0, math.cos((t - .3) / .7 * math.pi / 2)) ** .8
    for k in range(N):
        t = (k + 1) / N; r = prof(t)
        d = (d * stiff + DOWN * (1 - stiff)).normalized()
        q = p + d * st + sway * s_amp * (math.cos(t * 2 * math.pi) - math.cos((t - 1 / N) * 2 * math.pi)) * .5
        q = keep_off(q, max(r, .02) + .01, None)
        d = (q - p).normalized(); p = q; C.append(p.copy()); R.append(r)
    C.append(p + d * .015); R.append(0)
    # core: fills the clump so no gap shows between the locks
    tube(m, C, [x * .72 for x in R], [x * .7 for x in R], K=10)
    # the locks: each wound a little round the core, its own taper, tips ending at slightly different lengths
    for j in range(locks):
        a0 = 2 * math.pi * j / locks + rnd.uniform(-.3, .3); tw = rnd.uniform(.5, .9); end = rnd.uniform(.86, 1.0)
        pts, rw, rt = [], [], []
        for i in range(1, len(C) - 1):
            tt = (C[min(i + 1, len(C) - 1)] - C[i - 1]).normalized(); sa, sb = frame(tt, hz)
            f = (i - 1) / (len(C) - 3)
            if f > end: break
            a = a0 + tw * f * math.pi
            off = R[i] * .48 * sstep(0, .12, f)
            pts.append(C[i] + (sa * math.cos(a) + sb * math.sin(a)) * off)
            g = math.sin(min(1, f / .08) * math.pi / 2) * (math.cos(max(0, f - end + .25) / .25 * math.pi / 2) ** .6 if f > end - .25 else 1)
            rw.append(max(R[i] * .6 * g, .004)); rt.append(max(R[i] * .5 * g, .004))
        pts.append(pts[-1] + (pts[-1] - pts[-2]).normalized() * .01); rw.append(0); rt.append(0)
        pts.insert(0, pts[0] - n * .01); rw.insert(0, 0); rt.insert(0, 0)
        tube(m, pts, rw, rt, K=8)

def ball(m, c, R, scl=(1, 1, 1), lobes=5, amp=.06, seg=14, mat=0, swirl=0.0):
    """a smooth lobed ball (bun, puff, curl)"""
    base = len(m.v); NU, NV = seg, max(6, seg // 2)
    m.v.append(c + V(0, 0, -R * scl[2]))
    for j in range(1, NV):
        ph = -math.pi / 2 + math.pi * j / NV
        for i in range(NU):
            th = 2 * math.pi * i / NU
            f = 1 + amp * math.cos(lobes * (th + swirl * ph)) * math.cos(ph)
            m.v.append(c + V(math.cos(th) * math.cos(ph) * scl[0], math.sin(th) * math.cos(ph) * scl[1], math.sin(ph) * scl[2]) * R * f)
    m.v.append(c + V(0, 0, R * scl[2])); topi = len(m.v) - 1
    for i in range(NU): m.face([base, base + 1 + (i + 1) % NU, base + 1 + i], mat)
    for j in range(NV - 2):
        for i in range(NU):
            a = base + 1 + j * NU; b = a + NU; i2 = (i + 1) % NU
            m.face([a + i, a + i2, b + i2, b + i], mat)
    last = base + 1 + (NV - 2) * NU
    for i in range(NU): m.face([last + i, last + (i + 1) % NU, topi], mat)

def bun(m, uv, R=.075, swirl=1.6, with_tie=True):
    """a twisted bun seated on the skull with a tie at its base"""
    n = hdir(*uv); root = HC + n * E.hug(n)
    ball(m, root + n * (R * .82), R, (1, 1, .9), lobes=5, amp=.08, swirl=swirl)
    if with_tie: tie(m, root + n * .012, n, R=R * .55, r=.011)

def braid(m, uv, length=.42, R=.036, flow=None, seed=0, lobes=12):
    """a three-strand plait: slanted lobes alternating left and right down a hanging path (the chevrons of a braid),
    over a thin core; a tie and a rounded tuft at the end"""
    n = hdir(*uv); root = HC + n * (E.hug(n) + R * .7)
    path = drape(root, (n * .5 + (flow or V(0, 0, 0)) + DOWN).normalized(), length, R + .012, stiff=.75, hug=None, steps=12)
    L = [0.0]
    for i in range(1, len(path)): L.append(L[-1] + (path[i] - path[i - 1]).length)
    def at(sd):
        sd = max(0, min(L[-1], sd))
        for i in range(1, len(L)):
            if L[i] >= sd:
                f = (sd - L[i - 1]) / max(1e-6, L[i] - L[i - 1]); return path[i - 1].lerp(path[i], f), (path[i] - path[i - 1]).normalized()
        return path[-1], (path[-1] - path[-2]).normalized()
    tie(m, root - n * .004, n, R=R * .75, r=.011)
    core = [at(L[-1] * k / 12)[0] for k in range(13)]
    tube(m, [core[0] - n * .01] + core + [core[-1] + DOWN * .01], [0] + [R * .45] * 13 + [0], [0] + [R * .4] * 13 + [0], K=8)
    span = L[-1] * .93
    for k in range(lobes):
        sd = span * (k + .5) / lobes; c, t = at(sd); r = R * (1 - .28 * k / lobes)
        hz = V(c.x - HC.x, c.y - HC.y, 0); hz = hz.normalized() if hz.length > 1e-4 else V(1, 0, 0)
        sa, sb = frame(t, hz); s = 1 if k % 2 else -1          # sa: outward (seen), sb: across
        step = span / lobes
        a = c - t * step * .75 + sb * s * r * .75 + sa * r * .05
        mid = c + sb * s * r * .12 + sa * r * .32
        b = c + t * step * .6 - sb * s * r * .45 + sa * r * .1
        pts = [a - (mid - a).normalized() * .004, a, a.lerp(mid, .5), mid, mid.lerp(b, .5), b, b + (b - mid).normalized() * .004]
        tube(m, pts, [0, r * .5, r * .66, r * .7, r * .62, r * .42, 0], [0, r * .4, r * .5, r * .55, r * .5, r * .34, 0], K=8)
    end, t = at(L[-1]); tie(m, end - t * .004, t, R=R * .5, r=.009)
    clump(m, [end, end + t * .03 + DOWN * .01, end + t * .055 + DOWN * .03], R * .85, R * .75, tip=.6)

def spikes(m, n=12, length=.12, seed=0, v0=.6, v1=1.45, u_span=2.6, W=.045, T=.03, back=.6):
    """stiff rounded spikes over the crown, swept back"""
    rnd = random.Random(seed)
    for k in range(n):
        u = (rnd.random() * 2 - 1) * u_span; v = v0 + (v1 - v0) * rnd.random()
        d = hdir(u, v); p0 = HC + d * (E.hug(d) + .005)
        _q, _i, ed = E.eb.find(p0)
        if ed < .07: continue
        aim = (d + V(0, -back, .2)).normalized()
        path = [p0]
        for s in range(1, 6): path.append(keep_off(p0 + aim * length * s / 5 + DOWN * .02 * (s / 5) ** 2, .006 + T * (1 - s / 6), None))
        clump(m, path, W, T, tip=.75)

def fins(m, n=7, height=.13, W=.045, T=.018):
    """a mohawk: a row of fat swept-back fins on the centre line, forehead over the crown to the nape"""
    for k in range(n):
        t = k / (n - 1); e = hdir(0, 1.15 + (math.pi + .15 - 1.15) * t)   # past pi/2 the elevation walks down the back
        p0 = HC + e * (E.hug(e) + .004)
        aim = (e + V(0, -.45, .1)).normalized(); h = height * (1 - .35 * abs(t - .4))
        path = [p0 + aim * h * s / 6 + DOWN * .02 * (s / 6) ** 2 for s in range(7)]
        tube(m, path, *lock_profile(7, W, T, tip=.6), up=V(1, 0, 0), K=8)

# ---------------- styles: one function each ----------------
def f_bob(m):        cap(m, vol=.026); bangs(m, "blunt", 1); hem(m, .3, 7, W=.055, T=.018, seed=1, v_lo=.45)
def f_long(m):       cap(m, vol=.026, part=0); bangs(m, "curtain", 2, n=6); front_locks(m, .56, W=.05, u=1.3, v=.5, seed=2, wave=.014); long_back(m, .7, seed=2, wave=.016)
def f_ponytail(m):   cap(m, vol=.02, side=.05, back=-.5); bangs(m, "wispy", 3, n=6); tail(m, (math.pi, .62), .46, .11, flow=V(0, -.3, 0), seed=3)
def f_twintails(m):  cap(m, vol=.02, back=-.4); bangs(m, "blunt", 4); [tail(m, (s * 2.0, .58), .56, .12, flow=V(s * .22, -.15, 0), stiff=.7, seed=4 + s, locks=4) for s in (-1, 1)]
def f_sidebraid(m):  cap(m, vol=.02, part=.35); bangs(m, "side", 5); braid(m, (2.0, .3), .42, flow=V(.3, .3, 0), seed=5); hem(m, .14, 5, W=.05, seed=5, u_from=2.2)
def f_messybun(m):   cap(m, vol=.02, back=-.3); bangs(m, "wispy", 6, n=6); bun(m, (math.pi * .97, 1.05), .085, swirl=2.4); side_locks(m, 1, .22, W=.035, T=.013, seed=6, wave=.012)
def f_spacebuns(m):  cap(m, vol=.02, part=0); bangs(m, "blunt", 7); [bun(m, (s * 2.25, .95), .075) for s in (-1, 1)]
def f_pixie(m):      cap(m, vol=.028, side=.15, back=-.15); bangs(m, "side", 8, n=6); hem(m, .1, 6, W=.05, T=.016, seed=8, stiff=.9)
def f_wavy(m):       cap(m, vol=.028, part=.3); bangs(m, "side", 9); side_locks(m, 1, .5, W=.055, seed=9, wave=.03); hem(m, .55, 8, W=.058, seed=9, wave=.035)
def f_curly(m):      cap(m, vol=.04); bangs(m, "wispy", 10, n=6, T=.02); hem(m, .32, 8, W=.06, T=.022, seed=10, wave=.03)
def f_hime(m):       cap(m, vol=.022, part=0); bangs(m, "blunt", 11, W=.055); front_locks(m, .36, W=.05, u=1.28, v=.42, blunt=.7, seed=11); long_back(m, .64, groups=(1.8, 2.2, 2.6, 2.92), per=2, W=.058, seed=11, blunt=.45, fill=.26)
def f_sidetail(m):   cap(m, vol=.02, part=-.35, back=-.4); bangs(m, "side", 12); tail(m, (2.1, .7), .44, .11, flow=V(.4, -.2, 0), seed=12)
def f_twinbraids(m): cap(m, vol=.018, part=0, back=-.3); bangs(m, "wispy", 13); [braid(m, (s * 2.0, .25), .46, R=.04, flow=V(s * .2, .2, 0), seed=13 + s) for s in (-1, 1)]
def f_curtainmid(m): cap(m, vol=.024, part=0); bangs(m, "curtain", 14, n=6); hem(m, .4, 7, W=.056, seed=14)
def f_wolfcut(m):    cap(m, vol=.035); bangs(m, "wispy", 15); spikes(m, 9, .09, 15, v0=.7, v1=1.2, W=.045, T=.02, back=.9); hem(m, .34, 7, W=.05, seed=15, wave=.02)
def f_afropuff(m):   cap(m, vol=.016, back=-.3); ball(m, scalp(math.pi * .92, 1.05, .13), .15, (1, 1, .88), lobes=7, amp=.06, seg=18); tie(m, scalp(math.pi * .92, 1.05, .015), hdir(math.pi * .92, 1.05), .07, .013)
def f_halfup(m):     cap(m, vol=.024, part=.2); bangs(m, "curtain", 17, n=6); bun(m, (math.pi, .95), .06); hem(m, .5, 7, W=.056, seed=17, wave=.02)
def f_ringlets(m):
    cap(m, vol=.024); bangs(m, "blunt", 18); hem(m, .16, 6, W=.05, seed=18)
    for s in (-1, 1):
        for k, u in enumerate((1.55, 1.95, 2.35)):
            n = hdir(s * u, .25 + .1 * k); root = HC + n * (E.hug(n) + .01); pts = []
            for i in range(26):
                t = i / 25; a = t * 6 * math.pi + k
                ax = root + n * .03 + DOWN * (.36 - .05 * k) * t
                pts.append(keep_off(ax + (V(n.x, n.y, 0).normalized() * math.cos(a) + V(-n.y, n.x, 0).normalized() * math.sin(a)) * .024, .02, None))
            clump(m, pts, .02, .018, tip=.25)
def m_crop(m):       cap(m, front=.82, side=.25, back=-.15, vol=.02); bangs(m, "wispy", 201, n=6, stop=EYE_Z + .06, T=.014); hem(m, .07, 5, W=.045, T=.012, seed=201, stiff=.9)
def m_spiky(m):      cap(m, front=.82, side=.25, back=-.15, vol=.02); spikes(m, 18, .13, 210, v0=.45, v1=1.4); bangs(m, "spiky", 211, n=5)
def m_sidepart(m):   cap(m, front=.82, side=.22, back=-.18, vol=.026, part=-.45); bangs(m, "swoop", 220, n=6); hem(m, .08, 5, W=.045, T=.013, seed=220, stiff=.9)
def m_fluffy(m):     cap(m, front=.75, side=.15, back=-.25, vol=.04); bangs(m, "wispy", 230, n=6, T=.02); hem(m, .15, 6, W=.055, T=.02, seed=231, stiff=.88)
def m_undercut(m):   cap(m, front=.82, side=.0, back=-.3, vol=.006); cap(m, front=.8, side=.75, back=.7, vol=.035); bangs(m, "swoop", 240, n=6, root_v=1.25)
def m_mohawk(m):     cap(m, front=.82, side=.25, back=-.25, vol=.005); fins(m, 9, .12, W=.06)
def m_manbun(m):     cap(m, front=.78, side=.15, back=-.25, vol=.018, part=0); bun(m, (math.pi, 1.0), .065)
def m_shaggy(m):     cap(m, front=.75, side=.1, back=-.25, vol=.032); bangs(m, "wispy", 270, n=6); hem(m, .22, 7, W=.052, seed=271, wave=.018)
def m_curtains(m):   cap(m, front=.78, side=.15, back=-.2, vol=.026, part=0); bangs(m, "curtain", 280, n=6); hem(m, .13, 6, W=.05, seed=281, stiff=.88)
def m_buzz(m):       cap(m, front=.85, side=.3, back=-.12, vol=.008)
def m_slick(m):
    """slicked back: wide flat locks laid on the scalp from the hairline over the crown, tips tucked at the back"""
    cap(m, front=.85, side=.22, back=-.18, vol=.022)
    for k in range(7):
        u = (k / 6 - .5) * 1.2
        path = [scalp(u * (1 - .3 * t), .95 + 1.4 * t, .012 + .006 * math.sin(t * math.pi)) for t in [i / 10 for i in range(11)]]
        clump(m, path, .055, .015, tip=.4)
def m_curlytop(m):
    cap(m, front=.82, side=.3, back=-.1, vol=.01)
    rnd = random.Random(310)
    for i in range(30):
        u = rnd.uniform(-2.9, 2.9); v = rnd.uniform(.8, 1.5)
        p = scalp(u, v, .028); _q, _i, ed = E.eb.find(p)
        if ed > .07: ball(m, p, .042, lobes=4, amp=.1, seg=10, swirl=1.0)

STYLES = {f.__name__: f for f in (f_afropuff, f_bob, f_curly, f_curtainmid, f_halfup, f_hime, f_long, f_messybun, f_pixie, f_ponytail,
          f_ringlets, f_sidebraid, f_sidetail, f_spacebuns, f_twinbraids, f_twintails, f_wavy, f_wolfcut,
          m_buzz, m_crop, m_curlytop, m_curtains, m_fluffy, m_manbun, m_mohawk, m_shaggy, m_sidepart, m_slick, m_spiky, m_undercut)}

# ---------------- materials, skin, proof, export ----------------
def mats():
    h = bpy.data.materials.new("hair"); h.use_nodes = True; b = h.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (.32, .17, .09, 1); b.inputs["Roughness"].default_value = .55
    t = bpy.data.materials.new("hairtie"); t.use_nodes = True; b = t.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (.85, .2, .35, 1); b.inputs["Roughness"].default_value = .4
    return [h, t]

def finish(m, name, MATS):
    """the mesh object: welded, normals outward, smooth shaded (a hat-squash shape key would be added here)"""
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in m.v], [], m.f); me.update()
    for p, mi in zip(me.polygons, m.m): p.material_index = mi
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    for mt in MATS: me.materials.append(mt)
    return o

def skin(ob, rig):
    g = ob.vertex_groups.new(name="Head"); g.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    ob.parent = rig; md = ob.modifiers.new("skin", "ARMATURE"); md.object = rig

def proof(o, name, sex):
    """front / side / back on two species, one row per style"""
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x = sc.render.resolution_y = 260
    if not sc.world: sc.world = bpy.data.worlds.new("w")
    sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (.55, .55, .58, 1)
    if "Cam" not in bpy.data.objects:
        L = bpy.data.lights.new("Key", "SUN"); L.energy = 3.2; lo = bpy.data.objects.new("Key", L); sc.collection.objects.link(lo)
        cd = bpy.data.cameras.new("Cam"); cd.type = "ORTHO"; cd.ortho_scale = 1.15; co = bpy.data.objects.new("Cam", cd); sc.collection.objects.link(co); sc.camera = co
    co = bpy.data.objects["Cam"]; lo = bpy.data.objects["Key"]; files = []
    for sp in ("cat", "bunny", "bear"):
        before = set(x.name for x in bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f"{HEADS}/{sp}_{sex}.glb")
        new = [x.name for x in bpy.data.objects if x.name not in before]
        for x in new:
            if x.startswith("Ico"): bpy.data.objects[x].hide_render = True
        for k, a in enumerate((0.0, 1.57, 3.14, None)):
            tgt = HC + V(0, 0, -.12); pos = tgt + (V(0, .35, 3) if a is None else V(math.sin(a) * 3, math.cos(a) * 3, .25)); co.location = pos
            co.rotation_euler = (tgt - pos).to_track_quat("-Z", "Y").to_euler(); lo.rotation_euler = co.rotation_euler.copy(); lo.rotation_euler.x -= .4
            f = os.path.join(PROOF, f"{name}_{sp}_{k}.png"); sc.render.filepath = f; bpy.ops.render.render(write_still=True); files.append(f)
        for x in new:
            if x in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[x])
    return files

def run(sex):
    global E
    E = Envelope(sex); MATS = mats()
    for name, fn in STYLES.items():
        if not name.startswith(sex + "_") or (ONLY and name not in ONLY): continue
        m = M(); fn(m)
        for hat in (False, True):
            if hat: m.v = [squash(p) for p in m.v]
            export_one(m, name + ("-hat" if hat else ""), sex, MATS)

def squash(p):
    """hatted: above the hat line (elevation HAT_V) everything lies flat on the skull, under the hat shell; sides and back untouched"""
    d = p - HC
    if d.length < 1e-6: return p
    v = math.asin(max(-1, min(1, d.normalized().z))); k = sstep(HAT_V - .18, HAT_V, v)
    if k <= 0: return p
    r = E.hug(d) + .006
    return p if d.length <= r else HC + d.normalized() * (d.length + (r - d.length) * k)

def export_one(m, name, sex, MATS):
    if True:
        o = finish(m, "Hair_" + name, MATS)
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if tris > TRI_CAP:   # long styles: collapse to the cap so the GLB stays under 250 KB (welded, smooth)
            dm = o.modifiers.new("dec", "DECIMATE"); dm.ratio = TRI_CAP / tris
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="dec")
        skin(o, E.rig)
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if os.environ.get("PROOF") and not name.endswith("-hat"): proof(o, name, sex)
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); E.rig.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f"hair-{name}.glb"), use_selection=True, export_apply=False, export_skins=True,
                                  export_animations=False)
        print("HAIR", name, "tris", tris, "kb", os.path.getsize(os.path.join(OUT, f"hair-{name}.glb")) // 1024)
        bpy.data.objects.remove(o)

for sx in ("f", "m"):
    if not ONLY or any(s.startswith(sx + "_") for s in ONLY): run(sx)
