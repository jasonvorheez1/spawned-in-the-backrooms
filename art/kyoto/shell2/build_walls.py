# Level 178 wall kit v2: real carpentry at the old module dims/pivots.
# blender -b --factory-startup --python-exit-code 1 --python art/kyoto/shell2/build_walls.py [-- names...]
import sys, os, math, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import kit
from kit import *
kit.OUT = "/workspace/kyoto/shell2/glb"; kit.PROOF = "/workspace/kyoto/shell2/proof"; kit.KIT = "/workspace/kyoto/shell2/kit.json"
kit.M["fusuma_paper"] = ("fusuma_karakami", .42, .85, 0, None, None, 1)
kit.M["lacquer"] = (None, 1, .18, 0, (.018, .014, .012), None, 1)
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
random.seed(178)
W, H, KAMOI = 1.82, 2.5, 1.80; LW, LH = 0.91, 1.77; TR = 0.018
AX = {"x": 0, "y": 2, "z": 1}
SEED = [0]

def rect(a0, a1, b0, b1, c=.008):
    if c <= 0: return [(a0, b0), (a1, b0), (a1, b1), (a0, b1)]
    return [(a0 + c, b0), (a1 - c, b0), (a1, b0 + c), (a1, b1 - c), (a1 - c, b1), (a0 + c, b1), (a0, b1 - c), (a0, b0 + c)]
def rrect(a0, a1, b0, b1, r, seg=3):
    pts = []
    for (ca, cb, st) in ((a1 - r, b0 + r, -90), (a1 - r, b1 - r, 0), (a0 + r, b1 - r, 90), (a0 + r, b0 + r, 180)):
        for k in range(seg + 1):
            t = math.radians(st + 90 * k / seg); pts.append((ca + r * math.cos(t), cb + r * math.sin(t)))
    return pts

def prism(prof, axis, s0, s1, m, grain=None, n=1, jit=0.0, taper=0.0, node="body", seed=None):
    # extrude a 2D section: axis x -> prof (z, y); y -> (x, z); z -> (x, y)
    SEED[0] += 1; sd = SEED[0] if seed is None else seed
    bm = bmesh.new(); rings = []
    ca = sum(p[0] for p in prof) / len(prof); cb = sum(p[1] for p in prof) / len(prof)
    for k in range(n + 1):
        t = k / n; s = s0 + (s1 - s0) * t; sc = 1 - taper * t
        ja = jit * noise.noise(Vector((sd * 3.1, t * 2.7, .5))) if 0 < k < n or jit else 0
        jb = jit * noise.noise(Vector((sd * 1.7, t * 2.7, 4.5))) if 0 < k < n or jit else 0
        ring = []
        for a, b in prof:
            a2 = ca + (a - ca) * sc + ja; b2 = cb + (b - cb) * sc + jb
            p = {"x": (s, b2, a2), "y": (a2, s, b2), "z": (a2, b2, s)}[axis]
            ring.append(bm.verts.new(B(p)))
        rings.append(ring)
    L = len(prof)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(L): bm.faces.new((r0[i], r0[(i + 1) % L], r1[(i + 1) % L], r1[i]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    ob = finish(bm, "t", m, grain or axis, node, 0)
    # end grain: caps get a tight, squashed sample of the wood so cut ends read as end grain
    me = ob.data; uv = me.uv_layers[0]; ai = AX[axis]
    for p in me.polygons:
        if abs(p.normal[ai]) > .95:
            o = [i for i in range(3) if i != ai]
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = (co[o[0]] * 6 + .37, co[o[1]] * .35 + .11)
    return ob

def plaster(x0, x1, y0, y1, f, m="plaster", cell=.1, amp=.0025, node="body"):
    # tsuchikabe slab, both faces hand-troweled (2-3 mm undulation), closed edges
    SEED[0] += 1; sd = SEED[0]
    nx = max(2, round((x1 - x0) / cell)); ny = max(2, round((y1 - y0) / cell)); bm = bmesh.new(); G = {}
    for side in (1, -1):
        for i in range(nx + 1):
            for j in range(ny + 1):
                x = x0 + (x1 - x0) * i / nx; y = y0 + (y1 - y0) * j / ny
                edge = i in (0, nx) or j in (0, ny)
                dz = 0 if edge else amp * noise.noise(Vector((x * 3.2, y * 3.2, sd + side * 7))) + amp * .4 * noise.noise(Vector((x * 11, y * 11, sd * 2 + side)))
                G[side, i, j] = bm.verts.new(B((x, y, side * (f + dz))))
    for side in (1, -1):
        for i in range(nx):
            for j in range(ny):
                q = [G[side, i, j], G[side, i + 1, j], G[side, i + 1, j + 1], G[side, i, j + 1]]
                bm.faces.new(q if side > 0 else q[::-1])
    per = [(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)] + [(i, ny) for i in range(nx, 0, -1)] + [(0, j) for j in range(ny, 0, -1)]
    for k in range(len(per)):
        a, b = per[k], per[(k + 1) % len(per)]
        bm.faces.new((G[1, a[0], a[1]], G[-1, a[0], a[1]], G[-1, b[0], b[1]], G[1, b[0], b[1]]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    ob = finish(bm, "plaster", m, "x", node, 0, True); return ob

def disc_z(cx, cy, z, sgn, prof, m, seg=24, petals=0, node="body"):
    # lathe around engine Z at (cx, cy); prof [(r, h)] with h outward from face z along sgn
    bm = bmesh.new(); rings = []
    for r, h in prof:
        ring = []
        for i in range(seg):
            t = 2 * math.pi * i / seg; rr = r * (1 + (.12 * math.cos(petals * t) if petals else 0))
            ring.append(bm.verts.new(B((cx + rr * math.cos(t), cy + rr * math.sin(t), z + sgn * h))))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if prof[0][0] > 1e-4: bm.faces.new(rings[0])
    if prof[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return finish(bm, "disc", m, "x", node, 0, True)

def objs(): return set(o for o in bpy.context.scene.objects if o.type == "MESH")
def place(new, mtx):
    for o in new: o.data.transform(mtx)

# ---------- frame ----------
def sill_prof(y0, y1, grooves, d=.055, gd=.012, c=.005):
    if not grooves: return rect(-d, d, y0, y1, c)
    g = [(-.0285, -.0075), (.0075, .0285)]
    pts = [(-d, y0 + c), (-d + c, y0), (d - c, y0), (d, y0 + c), (d, y1 - c), (d - c, y1)]
    for a, b in reversed(g): pts += [(b, y1), (b, y1 - gd), (a, y1 - gd), (a, y1)]
    pts += [(-d + c, y1), (-d, y1 - c)]
    return pts
def kamoi_prof(y0, y1, grooves, d=.055, gd=.015, c=.007):
    if not grooves: return rect(-d, d, y0, y1, c)
    pts = [(-d, y0 + c), (-d + c, y0)]
    for a, b in ((-.0285, -.0075), (.0075, .0285)): pts += [(a, y0), (a, y0 + gd), (b, y0 + gd), (b, y0)]
    pts += [(d - c, y0), (d, y0 + c), (d, y1 - c), (d - c, y1), (-d + c, y1), (-d, y1 - c)]
    return pts
def nageshi(x0, x1):
    for s in (1, -1):
        p = [(.044, 1.858), (.072, 1.858), (.079, 1.866), (.079, 1.948), (.071, 1.968), (.044, 1.972)]
        p = [(s * a, b) for a, b in p]
        if s < 0: p = p[::-1]
        prism(p, "x", x0, x1, "wood_dark", n=4, jit=.0006)
def kugikakushi(x):
    for s in (1, -1):
        disc_z(x, 1.913, s * .079, s, [(.034, 0), (.034, .003), (.026, .006), (.012, .009), (.006, .013), (0, .014)], "brass", 24, 6)
def post(x, w=.12, d=.12):
    prism(rect(x - w / 2, x + w / 2, -d / 2, d / 2, .008), "y", 0, H, "wood_dark", n=6, jit=.0008, taper=.012)
def frame(w=W, ranma="plaster", grooves=False, nage=True, kamoi=True):
    x0 = -w / 2; xa, xb = x0 + .06, w / 2 - .06
    post(x0)
    prism(sill_prof(0, .025, grooves), "x", xa, xb, "wood_dark", n=3, jit=.0004)
    if kamoi: prism(kamoi_prof(KAMOI, KAMOI + .10, grooves), "x", xa, xb, "wood_dark", n=4, jit=.0006)
    prism(rect(-.065, .065, H - .14, H, .009), "x", xa, xb, "wood_dark", n=4, jit=.0008)
    if nage: nageshi(x0 - .06, xb); kugikakushi(x0)
    if ranma in ("plaster", "ochre"): plaster(xa, xb, 1.90, H - .14, .04, ranma)
    elif ranma == "shoji": transom(xa, xb)
    elif ranma == "osa": osa(xa, xb)
    elif ranma == "board":
        prism(rect(-.012, .012, 1.90, 2.13, .002), "x", xa, xb, "wood_mid", n=2, jit=.0004)
        prism(rect(-.012, .012, 2.131, H - .14, .002), "x", xa, xb, "wood_mid", n=2, jit=.0004)
    return x0, xa, xb
def transom(xa, xb, y0=1.972, y1=H - .14):
    for x in (xa + .011, xb - .011): prism(rect(x - .011, x + .011, -.014, .014, .002), "y", y0, y1, "wood_light")
    prism(rect(-.014, .014, y0, y0 + .02, .002), "x", xa + .022, xb - .022, "wood_light")
    n = round((xb - xa) / .14)
    for i in range(1, n): x = xa + (xb - xa) * i / n; prism(rect(x - .004, x + .004, -.006, .006, .001), "y", y0 + .02, y1, "wood_light")
    for k in (1, 2): y = y0 + .02 + (y1 - y0 - .02) * k / 3; prism(rect(-.006, .006, y - .004, y + .004, .001), "x", xa + .022, xb - .022, "wood_light")
    box(xb - xa - .044, y1 - y0 - .02, .0015, ((xa + xb) / 2, y0 + .02, -.00075), "washi", bevel=0)
def osa(xa, xb, y0=1.972, y1=H - .14):
    for yy in ((y0, y0 + .025), (y1 - .025, y1)): prism(rect(-.016, .016, yy[0], yy[1], .003), "x", xa, xb, "wood_dark")
    n = round((xb - xa) / .032)
    for i in range(1, n): x = xa + (xb - xa) * i / n; prism(rect(x - .0055, x + .0055, -.01, .01, .0015), "y", y0 + .025, y1 - .025, "wood_dark")
    for k in (1, 2): y = y0 + (y1 - y0) * k / 3; prism(rect(-.013, .013, y - .006, y + .006, .002), "x", xa, xb, "wood_dark")
def lower_wall(xa, xb, m, y1=KAMOI, nuki=True):
    plaster(xa, xb, .025, y1, .045, m)
    for s in (1, -1):  # habaki skirting, top edge eased
        p = [(.038, .025), (.053, .025), (.053, .083), (.05, .087), (.038, .087)]; p = [(s * a, b) for a, b in p]
        prism(p if s > 0 else p[::-1], "x", xa, xb, "wood_dark", n=2, jit=.0003)
    if nuki:
        prism(rect(-.051, .051, .88, .96, .004), "x", xa, xb, "wood_dark", n=3, jit=.0005)
        prism(rect(-.0545, .0545, .962, .99, .002), "x", xa, xa + .035, "wood_dark", taper=.5)   # kusabi wedge driven beside the nuki at the post

# ---------- leaves (built along x at u 0..LW, t centred 0) ----------
def shoji_leaf(koshi=True):
    for u in (0, LW - .03): prism(rect(u, u + .03, -.014, .014, .003), "y", 0, LH, "wood_light", n=3, jit=.0003)
    prism(rect(-.014, .014, 0, .05, .003), "x", .03, LW - .03, "wood_light")
    prism(rect(-.014, .014, LH - .035, LH, .003), "x", .03, LW - .03, "wood_light")
    y0 = .05
    if koshi:
        ws = [.31, .25, .29]; t = sum(ws); x = .03
        for wv in ws:
            x1 = x + (LW - .06) * wv / t; prism(rect(x + .0006, x1 - .0006, -.004, .004, .0012), "y", .05, .41, "wood_mid"); x = x1
        prism(rect(-.014, .014, .41, .435, .003), "x", .03, LW - .03, "wood_light"); y0 = .435
    y1 = LH - .035; hh = y1 - y0
    for i in range(1, 4): x = .03 + (LW - .06) * i / 4; prism(rect(x - .004, x + .004, -.006, .006, .001), "y", y0, y1, "wood_light")
    rows = 6 if koshi else 8
    for i in range(1, rows): y = y0 + hh * i / rows; prism(rect(-.006, .006, y - .004, y + .004, .001), "x", .03, LW - .03, "wood_light")
    box(LW - .06, hh, .0015, (LW / 2, y0, -.00075), "washi", bevel=0)
    for s in (1, -1):   # hikite: small brass finger plate on the pulling stile
        disc_z(LW - .015, .9, s * .014, s, [(.011, 0), (.011, .0015), (.007, .0015), (.007, .0005), (0, .0005)], "brass", 16)
def fusuma_leaf():
    fw, ft = .019, .011
    for u in (0, LW - fw): prism(rrect(u, u + fw, -ft, ft, .004), "y", 0, LH, "lacquer")
    for y in (0, LH - fw): prism(rrect(-ft, ft, y, y + fw, .004), "x", fw - .001, LW - fw + .001, "lacquer")
    core = box(LW - 2 * fw + .004, LH - 2 * fw + .004, .018, (LW / 2, fw - .002, 0), "fusuma_paper", "y", .001)
    hx, hy = LW - .09, .85
    bpy.ops.mesh.primitive_cylinder_add(radius=.024, depth=.05, vertices=24, location=B((hx, hy, 0)), rotation=(math.pi / 2, 0, 0))
    cut = bpy.context.active_object; md = core.modifiers.new("b", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cut
    bpy.context.view_layer.objects.active = core; bpy.ops.object.modifier_apply(modifier="b"); bpy.data.objects.remove(cut, do_unlink=True)
    for pl in core.data.polygons: pl.use_smooth = False
    core["smooth"] = 0
    for s in (1, -1):   # recessed round hikite: brass rim, dished well, lacquer floor
        disc_z(hx, hy, s * .009, s, [(.032, -.001), (.032, .0012), (.027, .0016), (.024, .0006), (.024, -.006), (.019, -.0075), (.0, -.0075)], "brass", 28)
        disc_z(hx, hy, s * .009, s, [(.0185, -.0072), (0, -.0072)], "lacquer", 20)

def put_leaf(fn, u0, t0, *a):
    before = objs(); fn(*a); place(objs() - before, Matrix.Translation(B((u0, 0, t0))))

def exp(name):
    sc = bpy.context.scene; obs = [o for o in sc.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.data.set_sharp_from_angle(angle=math.radians(80 if o["smooth"] else 32)); o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active; ob.name = name
    md = ob.modifiers.new("wn", "WEIGHTED_NORMAL"); md.keep_sharp = True; bpy.ops.object.modifier_apply(modifier="wn")
    ob.data.calc_loop_triangles(); vs = [v.co for v in ob.data.vertices]
    lo = [round(min(v[i] for v in vs), 3) for i in range(3)]; hi = [round(max(v[i] for v in vs), 3) for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=f"{kit.OUT}/{name}.glb", use_selection=True, export_apply=True, export_yup=True, export_image_format="JPEG", export_jpeg_quality=80,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7, export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
    for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
    print("KIT", name, len(ob.data.loop_triangles) if False else "", "engine min", (lo[0], lo[2], -hi[1]), "max", (hi[0], hi[2], -lo[1]))
# ---------- export: textures on scene-skinned slots are stripped (the scene's skin table mounts them) ----------
OVR = {"wood_dark", "wood_mid", "wood_light", "washi", "plaster", "ochre"}
def ship(name):
    if ONLY and name not in ONLY:
        for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
        return
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]; shoot(name, obs)
    R = Matrix.Rotation(math.pi, 4, "Z")
    for o in obs: o.data.transform(R)
    shoot(name + "_b", obs)
    for o in obs: o.data.transform(R)
    cut = []
    for k, m in MATS.items():
        if k in OVR:
            for l in list(m.node_tree.links):
                if l.from_node.type == "TEX_IMAGE": cut.append((m, l.from_socket, l.to_socket)); m.node_tree.links.remove(l)
    exp(name)
    for m, a, b in cut: m.node_tree.links.new(a, b)

reset(); bpy.context.scene.render.resolution_x = bpy.context.scene.render.resolution_y = 720
x0, xa, xb = frame(ranma="osa", grooves=True); ship("bay_open")
for nm, m in (("bay_plaster", "plaster"), ("bay_ochre", "ochre")):
    x0, xa, xb = frame(ranma=m); lower_wall(xa, xb, m); ship(nm)
frame(ranma="shoji", grooves=True); put_leaf(shoji_leaf, -LW, -TR); put_leaf(shoji_leaf, 0, TR); ship("bay_shoji")
frame(ranma="shoji", grooves=True); put_leaf(shoji_leaf, 0, TR); ship("bay_door")
frame(2 * W, "shoji", grooves=True); put_leaf(shoji_leaf, -2 * LW, TR); put_leaf(shoji_leaf, LW, TR); ship("bay_wide")
frame(grooves=True); put_leaf(fusuma_leaf, -LW, -TR); put_leaf(fusuma_leaf, 0, TR); ship("bay_fusuma")
x0, xa, xb = frame()
for s in (-1, 1):
    a, b = sorted((s * .525, s * xb if s > 0 else s * -xa)); lower_wall(a, b, "plaster", nuki=True)
    prism(rect(s * .5 - .025, s * .5 + .025, -.05, .05, .006), "y", .025, KAMOI, "wood_dark", n=4, jit=.0005)
ship("bay_hub")
x0, xa, xb = frame(); lower_wall(xa, xb, "plaster", y1=.85, nuki=False)
prism([(-.052, .845), (.062, .845), (.075, .86), (.075, .89), (.068, .9), (-.052, .9)], "x", xa, xb, "wood_dark", n=3, jit=.0005)   # madodai sill with nosing
box(xb - xa, .9, .004, ((xa + xb) / 2, .9, 0), "glass", bevel=0)
for x in (xa + .015, xb - .015): prism(rect(x - .015, x + .015, -.018, .018, .004), "y", .9, KAMOI, "wood_dark")
for i in range(1, 6):
    x = -.85 + 1.7 * i / 6; c = .02 if i == 3 else .01
    prism(rect(x - c, x + c, -.016, .016, .003), "y", .9, KAMOI, "wood_dark")
for y in (1.2, 1.5): prism(rect(-.014, .014, y, y + .02, .003), "x", xa + .03, xb - .03, "wood_dark")
ship("bay_window")
x0, xa, xb = frame(ranma="board")
ws = [random.uniform(.8, 1.2) for _ in range(7)]; t = sum(ws); x = xa
for i, wv in enumerate(ws):
    x1 = x + (xb - xa) * wv / t; th = .013 + random.uniform(-.001, .001)
    prism(rect(x + .0005, x1 - .0005, -th, th, .004), "y", .025, KAMOI, "wood_mid", n=3, jit=.0004); x = x1
for s in (1, -1):
    for y in (.06, .9): prism(rect(s * .012 - .009 if s > 0 else -.021, s * .012 + .009 if s > 0 else -.003, y, y + .05, .003)[::1], "x", xa, xb, "wood_dark")
ship("bay_wood")
before = objs(); shoji_leaf(); place(objs() - before, Matrix.Rotation(-math.pi / 2, 4, "Z")); ship("shoji_leaf")
before = objs(); fusuma_leaf(); place(objs() - before, Matrix.Rotation(-math.pi / 2, 4, "Z")); ship("fusuma_leaf")
