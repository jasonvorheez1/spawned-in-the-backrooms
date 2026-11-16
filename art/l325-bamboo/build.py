# Level 325 bamboo scaffold kit. One pass: Tripo sources -> textures -> pieces -> proofs -> glb.
# blender -b --factory-startup --python-exit-code 1 --python art/l325-bamboo/build.py -- [raw|tex|build|all]
import bpy, sys, os, math, random, json, struct
import numpy as np
from mathutils import Vector, Matrix
W = "/workspace/l325-bamboo"; SRC = W + "/src"; TEX = W + "/tex"; OUT = W + "/out"; PROOF = "/tmp/l325-bamboo"
for d in (TEX, OUT, PROOF): os.makedirs(d, exist_ok=True)
MODE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "all"
ONLY = sys.argv[sys.argv.index("--") + 2:] if "--" in sys.argv else []
STOREY = 3.2; UP = np.array([0, 0, 1.0])

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"; s.cycles.samples = 8; s.cycles.device = "CPU"
    s.view_settings.view_transform = "Standard"
    return s

def load(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    obs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

def emissive(o):
    for m in o.data.materials:
        nt = m.node_tree; img = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and n.outputs[0].links), None)
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        e = nt.nodes.new("ShaderNodeEmission")
        if img: nt.links.new(img.outputs[0], e.inputs[0])
        nt.links.new(e.outputs[0], out.inputs[0])

def ortho(name, loc, rot, scale, rx, ry, path=None, transparent=True):
    s = bpy.context.scene
    cd = bpy.data.cameras.new(name); cd.type = "ORTHO"; cd.ortho_scale = scale; cd.clip_end = 500
    c = bpy.data.objects.new(name, cd); s.collection.objects.link(c); c.location = loc; c.rotation_euler = rot
    s.camera = c; s.render.resolution_x, s.render.resolution_y = rx, ry
    s.render.film_transparent = transparent; s.render.image_settings.color_mode = "RGBA"
    s.render.filepath = path or f"{TEX}/raw_{name}.png"; bpy.ops.render.render(write_still=True)

def bounds(o):
    v = np.array([o.matrix_world @ x.co for x in o.data.vertices]); return v.min(0), v.max(0)

def align_pole(o):
    v = np.array([x.co for x in o.data.vertices]); c = v.mean(0)
    w, vec = np.linalg.eigh(np.cov((v - c).T)); ax = Vector(vec[:, 2])
    if ax.z < 0: ax = -ax
    o.matrix_world = ax.rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4() @ Matrix.Translation(-Vector(c))
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return bounds(o)

def make_raw():
    reset()
    o = load("polerun"); emissive(o); lo, hi = align_pole(o); L = hi[2] - lo[2]
    ortho("pole", (0, -5, (lo[2] + hi[2]) / 2), (math.pi / 2, 0, 0), L, 512, 4096)
    bpy.data.objects.remove(o)
    o = load("net"); emissive(o); lo, hi = bounds(o)
    ortho("net", (5, 0, 0), (math.pi / 2, 0, math.pi / 2), 1.5, 1024, 1024)
    bpy.data.objects.remove(o)
    o = load("platform"); emissive(o); lo, hi = bounds(o)
    ortho("plat", (0, 0, 5), (0, 0, 0), max(hi[0] - lo[0], hi[1] - lo[1]), 1024, 1024)
    bpy.data.objects.remove(o)
    o = load("joint"); emissive(o); lo, hi = bounds(o)
    ortho("joint", (0, 0, 5), (0, 0, 0), max(hi[0] - lo[0], hi[1] - lo[1]), 1024, 1024)

# ---------- pixels (numpy, top-down rows) ----------
def load_px(path):
    im = bpy.data.images.load(path); w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1].copy()
def save_px(path, a):
    h, w = a.shape[:2]; im = bpy.data.images.new("o", w, h, alpha=True)
    im.pixels.foreach_set(np.clip(a[::-1], 0, 1).astype(np.float32).ravel()); im.filepath_raw = path; im.file_format = "PNG"; im.save(); bpy.data.images.remove(im)
def resize(a, H, W_):
    h, w = a.shape[:2]
    ys = np.clip((np.arange(H) + .5) * h / H - .5, 0, h - 1); xs = np.clip((np.arange(W_) + .5) * w / W_ - .5, 0, w - 1)
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int); y1 = np.minimum(y0 + 1, h - 1); x1 = np.minimum(x0 + 1, w - 1)
    fy = (ys - y0)[:, None, None]; fx = (xs - x0)[None, :, None]
    return (a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx) * (1 - fy) + (a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx) * fy
def rgb2hsv(c):
    mx = c.max(-1); mn = c.min(-1); d = mx - mn + 1e-9; r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return np.stack([h % 1, d / (mx + 1e-9), mx], -1)
def hsv2rgb(c):
    h, s, v = c[..., 0] * 6, c[..., 1], c[..., 2]; k = lambda n: (n + h) % 6
    f = lambda n: v - v * s * np.clip(np.minimum(k(n), 4 - k(n)), 0, 1)
    return np.stack([f(5), f(3), f(1)], -1)
def noise(N, cells, seed):
    r = np.random.RandomState(seed).rand(cells, cells, 1); r = np.concatenate([r, r[:1]], 0); r = np.concatenate([r, r[:, :1]], 1)
    h = cells + 1; ys = np.arange(N) * cells / N; y0 = ys.astype(int); f = ys - y0; f = f * f * (3 - 2 * f)
    a = r[y0] * (1 - f)[:, None, None] + r[y0 + 1] * f[:, None, None]
    return (a[:, y0] * (1 - f)[None, :, None] + a[:, y0 + 1] * f[None, :, None])[..., 0]

VARIANTS = [(0, .8, .95), (22, .8, .9), (-4, .45, .85), (-22, 1.0, .62), (-14, 1.15, .9), (0, .55, 1.0), (35, .7, .8), (-8, .5, .6)]
VW = [.15, .1, .15, .2, .25, .05, .05, .05]
def make_tex():
    reset()
    p = load_px(f"{TEX}/raw_pole.png"); H = p.shape[0]; rows = []
    for y in range(int(H * .02), int(H * .98)):
        xs = np.where(p[y, :, 3] > .5)[0]
        if len(xs) < 8: rows.append(rows[-1] if rows else np.zeros((64, 3))); continue
        x0, x1 = xs[0], xs[-1]; m = (x1 - x0) * .1
        rows.append(resize(p[y:y + 1, int(x0 + m):int(x1 - m) + 1, :3], 1, 64)[0])
    strip = resize(np.array(rows), 1024, 64)
    hsv = rgb2hsv(strip); grey = (hsv[..., 1] < .25)
    med = np.median(strip, axis=1, keepdims=True) * .55
    strip = np.where(grey[..., None], np.broadcast_to(med, strip.shape), strip)
    for i in range(24):
        f = i / 24; strip[1023 - 23 + i] = strip[1023 - 23 + i] * (1 - f) + strip[23 - i] * f * 1.0 + 0 * strip[0]
    hsv = rgb2hsv(strip); atlas = np.ones((1024, 512, 4), np.float32)
    for i, (dh, sm, vm) in enumerate(VARIANTS):
        c = hsv.copy(); c[..., 0] = (c[..., 0] + dh / 360) % 1; c[..., 1] = np.clip(c[..., 1] * sm, 0, 1); c[..., 2] = np.clip(c[..., 2] * vm, 0, 1)
        col = hsv2rgb(c) * (0.85 + 0.3 * noise(1024, 16, 50 + i)[:, :64, None])
        atlas[:, i * 64:(i + 1) * 64, :3] = np.roll(col, i * 137, axis=0)
    save_px(f"{TEX}/bamboo.png", atlas)
    # net: Tripo net colour, mirror tiled, woven alpha with worn and ripped patches
    n = load_px(f"{TEX}/raw_net.png"); c = resize(n[260:760, 260:760, :3], 512, 512)
    c = np.concatenate([c, c[:, ::-1]], 1); c = np.concatenate([c, c[::-1]], 0); N = 1024
    c = c * (0.7 + 0.5 * noise(N, 8, 1))[..., None]
    dust = (noise(N, 6, 2) ** 2 * 0.45)[..., None]; c = c * (1 - dust) + np.array([.42, .5, .46]) * dust
    yy, xx = np.mgrid[0:N, 0:N]; thin = noise(N, 7, 3) > .58
    th = np.where(thin, 3, 4); a = ((xx % 8) < th) | ((yy % 8) < th)
    rip = (noise(N, 5, 4) + 0.12 * noise(N, 64, 5)) > .84
    cross = (((xx % 8) < th) & ((yy % 8) < th))[..., None]; c = c * np.where(cross, 1.12, 0.94)
    net = np.concatenate([c, (a & ~rip)[..., None].astype(np.float32)], -1); save_px(f"{TEX}/net.png", net)
    pl = load_px(f"{TEX}/raw_plat.png"); save_px(f"{TEX}/plank.png", np.concatenate([resize(pl[455:565, 150:900, :3], 128, 512), np.ones((128, 512, 1))], -1))
    j = load_px(f"{TEX}/raw_joint.png"); t = resize(j[492:532, 492:532, :3], 64, 64) * (0.8 + 0.5 * noise(64, 16, 9))[..., None]
    save_px(f"{TEX}/lashing.png", np.concatenate([np.clip(t, .02, .16), np.ones((64, 64, 1))], -1))

# ---------- mesh builder ----------
MATS = ["bamboo", "lashing", "plank", "net"]
class MB:
    def __init__(s, seed): s.v = []; s.f = []; s.uv = []; s.m = []; s.sm = []; s.r = random.Random(seed)
    def col(s): return s.r.choices(range(8), VW)[0]
    def tris(s): return sum(len(f) - 2 for f in s.f)
    def tube(s, a, b, r, sides=4, col=None, segs=1, bend=0.0, mat=0, taper=1.0):
        a = np.array(a, float); b = np.array(b, float); d = b - a; L = np.linalg.norm(d); d /= L
        if col is None: col = s.col()
        ref = UP if abs(d[2]) < .9 else np.array([1., 0, 0]); e1 = np.cross(d, ref); e1 /= np.linalg.norm(e1); e2 = np.cross(d, e1)
        ph = s.r.random() * 6.283; bd = e1 * math.cos(ph) + e2 * math.sin(ph); v0 = s.r.random(); base = len(s.v)
        for j in range(segs + 1):
            t = j / segs; c = a + d * L * t + bd * bend * math.sin(math.pi * t); rr = r * (1 + (taper - 1) * t)
            for k in range(sides):
                an = 6.283185 * k / sides + ph; s.v.append(tuple(c + rr * (e1 * math.cos(an) + e2 * math.sin(an))))
        u = lambda k: (col + .06 + .88 * (1 - abs(2 * k / sides - 1))) / 8
        for j in range(segs):
            for k in range(sides):
                k1 = (k + 1) % sides; q = (base + j * sides + k, base + j * sides + k1, base + (j + 1) * sides + k1, base + (j + 1) * sides + k)
                va = v0 + L * j / segs / 2.6; vb = v0 + L * (j + 1) / segs / 2.6
                s.f.append(q); s.uv.append([(u(k), va), (u(k + 1), va), (u(k + 1), vb), (u(k), vb)]); s.m.append(mat); s.sm.append(True)
    def box(s, c, ex, ey, ez, mat=2):
        c = np.array(c, float); base = len(s.v); u0 = s.r.random()
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1): s.v.append(tuple(c + sx * np.array(ex) + sy * np.array(ey) + sz * np.array(ez)))
        L = 2 * np.linalg.norm(ex)
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            s.f.append(tuple(base + i for i in q)); s.m.append(mat); s.sm.append(False)
            s.uv.append([(u0 + (L / 3 if (i & 4) else 0), .1 + .8 * (((i >> 1) ^ i) & 1)) for i in q])
    def octa(s, c, ex, ey, ez, mat=1):
        c = np.array(c, float); base = len(s.v)
        for e in (ex, ey, ez):
            s.v.append(tuple(c + np.array(e))); s.v.append(tuple(c - np.array(e)))
        for i in (0, 1):
            for j in (2, 3):
                for k in (4, 5):
                    t = (i, j, k) if (i + j + k) % 2 == 0 else (i, k, j)
                    s.f.append(tuple(base + x for x in t)); s.uv.append([(.2, .2), (.8, .2), (.5, .8)]); s.m.append(mat); s.sm.append(True)
    def quad(s, pts, uvs, mat=3):
        base = len(s.v); s.v += [tuple(p) for p in pts]; s.f.append(tuple(range(base, base + len(pts)))); s.uv.append(list(uvs)); s.m.append(mat); s.sm.append(True)
    def obj(s, name, mats):
        me = bpy.data.meshes.new(name); me.from_pydata(s.v, [], s.f)
        uv = me.uv_layers.new(name="UVMap"); uv.data.foreach_set("uv", [x for f in s.uv for p in f for x in p])
        me.polygons.foreach_set("material_index", s.m); me.polygons.foreach_set("use_smooth", s.sm)
        for m in mats: me.materials.append(m)
        me.update(); o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o

def frame(k):
    a = k * math.pi / 2; return np.array([math.cos(a), math.sin(a), 0]), np.array([-math.sin(a), math.cos(a), 0])
def P(k, s, d, z):
    n, t = frame(k); return n * d + t * s + UP * z

RO, RL, RB, RI = 12.82, 12.91, 12.97, 12.30
def ring(mb, z0, Q):
    r = mb.r; ju = lambda a: r.uniform(-a, a)
    rows_o = [0.45 + ju(.04), 1.5 + ju(.05), 2.55 + ju(.05)]; rows_i = [0.30, 1.55 + ju(.05)]
    for k in range(4):
        n, t = frame(k)
        for i in range(20):                                   # standards, lapped beside the storey above
            so = -RO + i * 2 * RO / 20 + ju(.05); a = r.uniform(.035, .06); top = r.uniform(3.35, 3.7)
            mb.tube(P(k, so - a, RO + ju(.015), z0), P(k, so + a + (top - 3.2) * a / 1.6, RO + ju(.02), z0 + top), r.uniform(.042, .058), Q["so"], segs=Q["sseg"], bend=r.uniform(0, .03), taper=.9)
            if r.random() < Q["lash"]:
                for y in rows_o:
                    if r.random() < .8: mb.octa(P(k, so + ju(.02), (RO + RL) / 2, z0 + y), t * .075, n * .12, UP * .085)
            if i % Q["istep"] == 0:
                si = -RI + i * 2 * RI / 20 + ju(.05); a = r.uniform(.03, .06)
                mb.tube(P(k, si - a, RI + ju(.02), z0), P(k, si + a * 1.2, RI + ju(.02), z0 + r.uniform(3.3, 3.65)), r.uniform(.04, .052), Q["si"], taper=.9)
            if i % 2 == 1 and r.random() < .93:               # putlogs to 12.1 m
                y = z0 + .39 + ju(.02); mb.tube(P(k, so + .09, RL + r.uniform(.05, .2), y), P(k, so + .09 + ju(.05), 12.1, y + ju(.02)), .042, 3)
        for d, rows, sd, R in ((RL, rows_o, Q["lo"], RO), (RI - .09, rows_i, Q["li"], RI)):   # ledgers, four lapped poles a side
            for y in rows:
                cuts = [-R - r.uniform(.15, .55)] + [(-R + (j + 1) * 2 * R / 4) + ju(.6) for j in range(3)] + [R + r.uniform(.15, .55)]
                for j in range(4):
                    lap = r.uniform(.3, .5); dz = .05 if j % 2 else -.02; sl = ju(.03)
                    mb.tube(P(k, cuts[j] - (lap if j else 0), d + (.02 if j % 2 else 0), z0 + y + dz - sl), P(k, cuts[j + 1] + (lap if j < 3 else 0), d + (.02 if j % 2 else 0), z0 + y + dz + sl), r.uniform(.04, .052), sd, segs=Q["lseg"], bend=r.uniform(0, .04))
        for j in range(2):                                    # diagonal braces, some missing
            if r.random() < .2: continue
            s0 = -RO + r.uniform(1, 6) + j * 12.5; w = r.uniform(4.2, 6) * r.choice((-1, 1)); s1 = s0 + max(w, 0); s0 = s0 + max(-w, 0)
            a, b = (s0, s1) if w > 0 else (s1, s0)
            mb.tube(P(k, a, RB, z0 + .05), P(k, b, RB, z0 + 3.45), .045, Q["lo"], segs=Q["lseg"], bend=r.uniform(0, .05))
        s = -RI + .3                                          # plank walkway on the inner layer
        while s < RI - 1:
            L = min(r.uniform(3.2, 4.4), RI - .3 - s)
            if r.random() > .08:
                yaw = ju(.012); ex = (t + n * yaw) * (L / 2); mb.box(P(k, s + L / 2, 12.57 + ju(.03), z0 + .455 + ju(.008)), ex, n * .24, UP * .02)
            s += L + r.uniform(.02, .15)
FULL = dict(so=5, sseg=2, si=4, istep=1, lo=4, li=3, lseg=1, lash=.62)
LITE = dict(so=4, sseg=1, si=3, istep=2, lo=3, li=3, lseg=1, lash=.3)

def net(mb, z0, cols, rows, miss=.1):
    r = mb.r
    for k in range(4):
        w = 26.0 / cols
        for i in range(cols):
            if r.random() < miss: continue
            s0 = -13 + i * w - r.uniform(0, .12); s1 = -13 + (i + 1) * w + r.uniform(0, .12); u0 = r.random(); vv = r.random()
            torn = r.random() < .12; lift = r.uniform(.1, .6) if r.random() < .2 else 0; d0 = 13.02 + r.uniform(0, .04)
            g = [[None] * 2 for _ in range(rows + 1)]
            for j in range(rows + 1):
                f = j / rows; z = z0 + STOREY * (1.015 - f * 1.03) + (lift * (f == 1))
                for e, s in enumerate((s0, s1)):
                    bulge = math.sin(math.pi * f) * r.uniform(.03, .13) + (r.uniform(0, .08) if j == rows else 0)
                    g[j][e] = (P(k, s, d0 + bulge, z + (r.uniform(-.15, .1) if j == rows else 0)), (u0 + (s - s0) / 4, vv + f * .8))
            for j in range(rows - (1 if torn else 0)):
                a, b, c, d = g[j][0], g[j][1], g[j + 1][1], g[j + 1][0]
                mb.quad([a[0], d[0], c[0], b[0]], [a[1], d[1], c[1], b[1]])

def canopy(mb, zb):
    r = mb.r; D0, D1, RISE = 13.0, 15.0, 1.1
    for k in range(4):
        prev = None
        for i in range(11):
            s = -13 + i * 2.6; f = lambda d: s * d / 13
            if i < 10:
                top = P(k, f(D1), D1 + r.uniform(-.05, .15), zb + RISE + r.uniform(-.05, .05))
                mb.tube(P(k, s, RO, zb + r.uniform(-.03, .03)), top, .048, 4)
                if i % 2 == 0 and r.random() < .85: mb.tube(P(k, f(14.9), 14.9, zb + RISE - .04), P(k, s + r.uniform(-.1, .1), RB, zb + r.uniform(2.4, 2.9)), .04, 3)
                if r.random() < .7: mb.octa(P(k, s, RL, zb), frame(k)[1] * .075, frame(k)[0] * .12, UP * .085)
            sag = r.uniform(.02, .1)
            cur = [(P(k, f(D0 + .06), D0 + .06, zb + .07), ), (P(k, f(14.0), 14.0, zb + RISE * .5 + .05 - sag), ), (P(k, f(D1), D1, zb + RISE + .06), )]
            if prev is not None and r.random() > .06:
                u0 = r.random()
                for j in range(2):
                    mb.quad([prev[j][0], cur[j][0], cur[j + 1][0], prev[j + 1][0]], [(u0, j * .3), (u0 + .65, j * .3), (u0 + .65, j * .3 + .3), (u0, j * .3 + .3)])
            prev = cur
        for d, h in ((14.0, .5), (14.95, 1.0)):
            cuts = [-d - .3, -d / 3 + r.uniform(-.5, .5), d / 3 + r.uniform(-.5, .5), d + .3]
            for j in range(3): mb.tube(P(k, cuts[j] - .3, d, zb + RISE * h + (.05 if j % 2 else 0)), P(k, cuts[j + 1] + .3, d, zb + RISE * h + (.05 if j % 2 else 0)), .047, 4, segs=2, bend=.05)

# ---------- materials, proofs, export ----------
def mats():
    out = []
    for nme in MATS + ["net_far"]:
        m = bpy.data.materials.new(nme); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        path = f"{TEX}/{'far' if nme == 'net_far' else nme}.png"
        if os.path.exists(path):
            t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True); nt.links.new(t.outputs[0], b.inputs["Base Color"])
            if nme == "net": nt.links.new(t.outputs[1], b.inputs["Alpha"]); m.use_backface_culling = False
        b.inputs["Roughness"].default_value = .95 if nme.startswith("net") else .7; b.inputs["Metallic"].default_value = 0
        out.append(m)
    return out

def look(loc, tgt, lens=35):
    s = bpy.context.scene; cd = bpy.data.cameras.new("c"); cd.lens = lens; cd.clip_end = 1000
    c = bpy.data.objects.new("c", cd); s.collection.objects.link(c); c.location = loc
    c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); s.camera = c; return c
def stage_light():
    s = bpy.context.scene
    if not s.world: s.world = bpy.data.worlds.new("w")
    s.world.use_nodes = True; bg = s.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.62, .66, .7, 1); bg.inputs[1].default_value = 1.0
    if "sun" not in bpy.data.objects:
        l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); l.data.energy = 3; l.rotation_euler = (.9, 0, .6); s.collection.objects.link(l)
def shots(name, views, res=656):
    s = bpy.context.scene; stage_light(); s.render.film_transparent = False; s.render.resolution_x = s.render.resolution_y = res
    for i, (loc, tgt, lens) in enumerate(views):
        look(loc, tgt, lens); bpy.data.objects["sun"].rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        bpy.data.objects["sun"].rotation_euler.rotate_axis("X", .35)
        s.render.filepath = f"{PROOF}/{name}_{i}.png"; bpy.ops.render.render(write_still=True)
def std_views(sz, h):
    c = (0, 0, h / 2); d = max(sz, h) * 1.25
    return [((d, -d, h * .5 + d * .45), c, 35), ((-d, d, h * .5 + d * .25), c, 35), ((0, -.01, h + d * 1.5), c, 35)]

RESULT = {}
def export(name, o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    path = f"{OUT}/{name}.glb"
    bpy.ops.export_scene.gltf(filepath=path, export_apply=True, use_selection=True, export_yup=True)
    b = open(path, "rb").read(); jl = struct.unpack("<I", b[12:16])[0]; J = json.loads(b[20:20 + jl]); rest = b[20 + jl:]
    for m in J.get("materials", []):
        if m["name"] == "net": m["alphaMode"] = "MASK"; m["alphaCutoff"] = .4; m["doubleSided"] = True
        if m["name"] == "net_far": m["doubleSided"] = True; m.pop("alphaMode", None)
    js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * (-len(js) % 4)
    open(path, "wb").write(b[:8] + struct.pack("<I", 12 + 8 + len(js) + len(rest)) + struct.pack("<I", len(js)) + b[16:20] + js + rest)
    tris = 0; lo = np.full(3, 1e9); hi = -lo
    for me in J["meshes"]:
        for p in me["primitives"]:
            tris += J["accessors"][p["indices"]]["count"] // 3; a = J["accessors"][p["attributes"]["POSITION"]]
            lo = np.minimum(lo, a["min"]); hi = np.maximum(hi, a["max"])
    RESULT[name] = dict(tris=tris, size=[round(float(x), 2) for x in hi - lo], min=[round(float(x), 2) for x in lo], mats=[m["name"] for m in J["materials"]])
    print("EXPORT", name, RESULT[name])

def want(n): return not ONLY or n in ONLY
def critter(x, y):
    bpy.ops.mesh.primitive_cylinder_add(radius=.25, depth=1.2, location=(x, y, .6)); o = bpy.context.object
    m = bpy.data.materials.new("crit"); m.diffuse_color = (1, .1, .6, 1); m.use_nodes = True; m.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (1, .1, .6, 1); o.data.materials.append(m); return o
def hide_all():
    for o in bpy.data.objects:
        if o.type == "MESH": o.hide_render = True

def build():
    reset(); M = mats(); stage_light()
    if want("ring") or want("ring_net"):
        mb = MB(325); ring(mb, 0, FULL); o = mb.obj("ring", M); export("ring", o)
        nb = MB(11); net(nb, 0, 18, 3); no = nb.obj("ring_net", M); export("ring_net", no)
        # stack proof: three rings at 3.2 pitch with nets, a 1.2 m body beside
        extra = []
        for i in (1, 2):
            for src in (o, no):
                c = src.copy(); c.location.z = i * STOREY; c.rotation_euler.z = i * math.pi / 2; bpy.context.scene.collection.objects.link(c); extra.append(c)
        extra.append(critter(14.2, -11))
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 4.8)); bx = bpy.context.object; bx.scale = (24, 24, 9.6); extra.append(bx)
        dm = bpy.data.materials.new("dark"); dm.diffuse_color = (.25, .25, .25, 1); bx.data.materials.append(dm)
        shots("stack", [((19, -19, 3), (13, -11, 2.6), 35), ((16.5, -9, 1.5), (12.6, -12.6, 3.4), 28), ((12.6, -4, 2.2), (12.6, -12, 1.2), 24)])
        for e in extra: bpy.data.objects.remove(e)
        no.hide_render = True; shots("ring", std_views(26, 3.5) [:1] + [((17, -15, 2.2), (12.5, -9, 1.6), 40), ((0, -.01, 45), (0, 0, 0), 35)])
        o.hide_render = True; no.hide_render = False; shots("ring_net", [((30, -30, 12), (0, 0, 1.6), 35), ((17, -15, 2.2), (12.5, -9, 1.6), 40), ((-30, 30, 8), (0, 0, 1.6), 35)])
    if want("ring10") or want("ring_far"):
        hide_all(); mb = MB(77)
        for i in range(10): ring(mb, i * STOREY, LITE); net(mb, i * STOREY, 14, 2, miss=.08)
        canopy(mb, .5); o = mb.obj("ring10", M); export("ring10", o)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 16)); bx = bpy.context.object; bx.scale = (24, 24, 32)
        dm = bpy.data.materials.new("dark"); dm.use_nodes = True; dm.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (.16, .17, .17, 1); bx.data.materials.append(dm)
        bpy.data.objects["sun"].rotation_euler = (math.radians(65), 0, math.radians(75))
        ortho("far", (60, 0, 16), (math.pi / 2, 0, math.pi / 2), 32, 832, 1024, path=f"{TEX}/far.png", transparent=False)
        o2 = o.copy(); o2.location.z = 32; o2.rotation_euler.z = math.pi / 2; bpy.context.scene.collection.objects.link(o2)
        bx.scale = (24, 24, 64); bx.location.z = 32; cr = critter(16, -16)
        shots("ring10", [((55, -70, 20), (0, 0, 30), 35), ((-30, 34, 3), (-10, 10, 12), 24), ((24, -22, 1.6), (13, -11, 3), 28)], res=800)
        for e in (o2, cr): bpy.data.objects.remove(e)
        o.hide_render = True
        # far: the same silhouette on flat planes
        M = mats(); fb = MB(5)
        for k in range(4):
            for j in range(10):
                z0, z1 = j * 3.2, (j + 1) * 3.2; b = .06 if j % 2 else 0
                fb.quad([P(k, -13, 13.03 + b, z0), P(k, 13, 13.03 + b, z0), P(k, 13, 13.03 + b, z1), P(k, -13, 13.03 + b, z1)], [(0, z0 / 32), (1, z0 / 32), (1, z1 / 32), (0, z1 / 32)], mat=4)
            for i in range(10):
                s0, s1 = -13 + i * 2.6, -13 + (i + 1) * 2.6
                fb.quad([P(k, s0, 13, .55), P(k, s1, 13, .55), P(k, s1 * 15 / 13, 15, 1.65), P(k, s0 * 15 / 13, 15, 1.65)], [((s0 + 13) / 26, .016), ((s1 + 13) / 26, .016), ((s1 + 13) / 26, .05), ((s0 + 13) / 26, .05)], mat=4)
            for i in range(20):
                s = -RO + i * 2 * RO / 20; fb.tube(P(k, s, RO, 31.8), P(k, s + .08, RO, 32 + fb.r.uniform(.15, .5)), .05, 3)
            for d in (14.95,): fb.tube(P(k, -d - .5, d, 1.62), P(k, d + .5, d, 1.62), .05, 3)
            fb.tube(P(k, -13.3, RL, .5), P(k, 13.3, RL, .5), .05, 3)
        fo = fb.obj("ring_far", M); 
        for p in fo.data.polygons:
            if p.material_index == 4: p.use_smooth = False
        export("ring_far", fo); bx.scale = (24, 24, 32); bx.location.z = 16
        shots("ring_far", [((55, -70, 20), (0, 0, 16), 35), ((-55, 70, 30), (0, 0, 16), 35), ((0, -.01, 110), (0, 0, 0), 35)])
        bpy.data.objects.remove(bx)
    if want("poles"):
        hide_all(); src = load("polerun"); lo, hi = align_pole(src); L = hi[2] - lo[2]
        d = src.modifiers.new("d", "DECIMATE"); d.ratio = 520 / len(src.data.polygons); bpy.ops.object.modifier_apply(modifier="d")
        V = np.array([v.co for v in src.data.vertices]); F = [tuple(p.vertices) for p in src.data.polygons]
        cxy = V[:, :2].mean(0); ang = np.arctan2(V[:, 1] - cxy[1], V[:, 0] - cxy[0]); tt = (V[:, 2] - lo[2]) / L
        bpy.data.objects.remove(src); M = mats(); mb = MB(12)
        for k in range(4):
            for i in (3, 10, 16):
                r = mb.r; s = -RO + i * 2 * RO / 20 + r.uniform(-.1, .1); H = r.uniform(3.05, 3.2); rad = r.uniform(.72, 1.0); rot = r.uniform(0, 6.28); col = mb.col()
                tx, ty = r.uniform(-.03, .03), r.uniform(-.03, .03); base = len(mb.v); n, t = frame(k)
                for vi in range(len(V)):
                    x, y = (V[vi, 0] - cxy[0]) * rad, (V[vi, 1] - cxy[1]) * rad; z = tt[vi] * H
                    xr = x * math.cos(rot) - y * math.sin(rot) + tx * z; yr = x * math.sin(rot) + y * math.cos(rot) + ty * z
                    mb.v.append(tuple(n * (RO + xr) + t * (s + yr) + UP * z))
                for f in F:
                    mb.f.append(tuple(base + i2 for i2 in f)); mb.m.append(0); mb.sm.append(True)
                    mb.uv.append([((col + .06 + .88 * abs(ang[i2]) / math.pi) / 8, (tt[i2] - .02) / .96) for i2 in f])
        o = mb.obj("poles", M); export("poles", o)
        cr = critter(13.8, -9)
        shots("poles", [((40, -40, 22), (0, 0, 1.6), 35), ((15.6, -11.5, 1.3), (12.8, -9, 1.5), 35), ((14.3, -7.6, 2.6), (12.8, -9, 2.6), 50)])
        bpy.data.objects.remove(cr)
    if want("wreck"):
        hide_all(); src = load("tangle"); S = 2.2
        src.scale = (S, S, S); bpy.ops.object.transform_apply(scale=True); lo, hi = bounds(src); src.location = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2] - .05); bpy.ops.object.transform_apply(location=True)
        d = src.modifiers.new("d", "DECIMATE"); d.ratio = 1500 / len(src.data.polygons); bpy.ops.object.modifier_apply(modifier="d")
        src.data.materials[0].name = "bamboo_heap"; bpy.ops.object.shade_smooth()
        M = mats(); mb = MB(99); r = mb.r
        for i in range(52):
            a = r.uniform(0, 6.28); rr = 3.9 * math.sqrt(r.random()); c = np.array([math.cos(a) * rr, math.sin(a) * rr, 0]); hmax = max(.1, (1 - rr / 4.2)) * 2.3
            L = r.uniform(1.6, 4.6); yaw = r.uniform(0, 6.28); pitch = r.uniform(-.25, .25) if r.random() < .8 else r.uniform(.5, 1.0)
            dv = np.array([math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)]); zc = r.uniform(.06, hmax) + abs(dv[2]) * L / 2
            a0 = c + UP * zc - dv * L / 2; b0 = c + UP * zc + dv * L / 2
            for p in (a0, b0):
                p[2] = max(p[2], .05); p[0] = max(-4.1, min(4.1, p[0])); p[1] = max(-4.1, min(4.1, p[1]))
            b0[2] = min(b0[2], 3.0); a0[2] = min(a0[2], 3.0)
            mb.tube(a0, b0, r.uniform(.04, .058), 4, segs=2, bend=r.uniform(0, .28) if r.random() < .4 else r.uniform(0, .05), taper=.88)
        for i in range(7):
            a = r.uniform(0, 6.28); rr = r.uniform(.5, 3.2); c = np.array([math.cos(a) * rr, math.sin(a) * rr, 0]); yaw = r.uniform(0, 6.28); e1 = np.array([math.cos(yaw), math.sin(yaw), 0]); e2 = np.array([-e1[1], e1[0], 0])
            hh = lambda p: max(.04, (1 - np.linalg.norm(p[:2]) / 4.3) * 2.2 * r.uniform(.5, 1.05))
            g = [[None] * 4 for _ in range(4)]; u0 = r.random()
            for x in range(4):
                for y in range(4):
                    p = c + e1 * (x - 1.5) * r.uniform(.5, .8) + e2 * (y - 1.5) * r.uniform(.5, .9); p = np.clip(p, -4.1, 4.1); p[2] = hh(p); g[x][y] = (p, (u0 + x * .2, y * .2))
            for x in range(3):
                for y in range(3):
                    if r.random() < .15: continue
                    q = (g[x][y], g[x + 1][y], g[x + 1][y + 1], g[x][y + 1]); mb.quad([e[0] for e in q], [e[1] for e in q])
        for i in range(7):
            a = r.uniform(0, 6.28); rr = r.uniform(1, 3.7); yaw = r.uniform(0, 6.28); t = np.array([math.cos(yaw), math.sin(yaw), r.uniform(-.2, .3)]); nn = np.array([-math.sin(yaw), math.cos(yaw), r.uniform(-.2, .2)])
            L = r.uniform(.5, 1.6); z = max(.12 + abs(t[2]) * L, r.uniform(.1, 1.2) * (1 - rr / 4.2))
            mb.box((math.cos(a) * rr, math.sin(a) * rr, z), t * L, nn * .12, np.cross(t, nn) * .02)
        o = mb.obj("wreck_x", M); bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); src.select_set(True); bpy.context.view_layer.objects.active = src; bpy.ops.object.join()
        src.name = "wreck"; export("wreck", src); cr = critter(4.8, -3)
        shots("wreck", [((9, -9, 5), (0, 0, 1), 35), ((-9, 9, 3), (0, 0, 1), 35), ((0, -.01, 15), (0, 0, 0), 35)])
        bpy.data.objects.remove(cr)
    prev = json.load(open(f"{OUT}/result.json")) if os.path.exists(f"{OUT}/result.json") else {}
    prev.update(RESULT); json.dump(prev, open(f"{OUT}/result.json", "w"), indent=1)

if MODE in ("raw", "all"): make_raw()
if MODE in ("tex", "all"): make_tex()
if MODE in ("build", "all"): build()
