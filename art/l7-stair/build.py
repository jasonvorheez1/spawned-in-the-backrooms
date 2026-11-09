# Level 7 timber stair over the l7-ft-step-* colliders. Built in engine-local metres around O = (-48.5, 1.1, -66.5):
# engine (ex, ey, ez) -> Blender (ex, -ez, ey); glTF export turns it back (Blender -Y = glTF +Z), so the GLB is engine-local, origin at O.
import bpy, bmesh, math, random, json, os
from mathutils import Vector
OUT = "/workspace/stair"; os.makedirs(OUT, exist_ok=True)
O = (-48.5, 1.1, -66.5)
GROUND = {0:(-2.13,-2.22,-1.85),1:(-0.72,-1.22,-0.32),2:(0.31,0.21,0.5),3:(2.42,1.2,2.91),4:(4,3.76,4.24),5:(4.7,4.46,4.94),6:(5.4,5.16,5.64),7:(6.1,5.86,6.34),8:(6.8,6.56,7.04),9:(7.5,7.26,7.74),10:(8.2,7.96,8.44),11:(8.9,8.66,9.14),12:(9.6,9.36,9.84),13:(10.27,10.06,10.3)}  # centre, seaward(+x), landward(-x)
R = random.Random(7)
def cx(k): return -k * 1.35
def cz(k): return -k * 1.65
def top(k): return 1.55 + k * 0.7 + 0.72 - O[1]   # tread top, local
def gy(k, i): return GROUND[k][i] - O[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}
def mat(name, col, rough=0.9, metal=0.0, tex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if tex:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(tex)
        mix = m.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1.0
        m.node_tree.links.new(t.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (*col, 1)
        m.node_tree.links.new(mix.outputs[2], b.inputs["Base Color"])
    MATS[name] = m; return m
mat("wood", (0.95, 0.92, 0.88), 0.92, tex=OUT + "/wood.png")
mat("rope", (0.09, 0.06, 0.035), 0.85)
mat("iron", (0.05, 0.045, 0.04), 0.6, 0.8)
mat("tar", (0.012, 0.01, 0.008), 0.25)
SLOT = {n: i for i, n in enumerate(MATS)}

bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
def V(p): return bm.verts.new((p[0], -p[2], p[1]))
def face(vs, uvs, m):
    try: f = bm.faces.new(vs)
    except ValueError: return
    f.material_index = SLOT[m]
    for l, uv in zip(f.loops, uvs): l[uvl].uv = uv
def loft(rings, m, cap=True, us=None, vscale=1.0, v0=0.0):
    """rings: list of lists of 3D points (same count, closed loops). us: per-ring u coords."""
    n = len(rings[0]); vr = [[V(p) for p in r] for r in rings]
    if us is None:
        us = [0.0]; 
        for a, b in zip(rings, rings[1:]): us.append(us[-1] + (Vector(sum((Vector(p) for p in b), Vector()) / n) - Vector(sum((Vector(p) for p in a), Vector()) / n)).length)
    per = [0.0]
    r0 = rings[0]
    for j in range(n): per.append(per[-1] + (Vector(r0[(j + 1) % n]) - Vector(r0[j])).length)
    for i in range(len(rings) - 1):
        for j in range(n):
            j2 = (j + 1) % n
            face([vr[i][j], vr[i + 1][j], vr[i + 1][j2], vr[i][j2]],
                 [(us[i], v0 + per[j] * vscale), (us[i + 1], v0 + per[j] * vscale), (us[i + 1], v0 + per[j + 1] * vscale), (us[i], v0 + per[j + 1] * vscale)], m)
    if cap:
        for r, rev in ((vr[0], True), (vr[-1], False)):
            vs = list(reversed(r)) if rev else list(r)
            face(vs, [(0.5 + 0.05 * math.cos(a * 6.283 / n), v0 + 0.05 * math.sin(a * 6.283 / n)) for a in range(n)], m)
def frame(t):
    t = Vector(t).normalized(); up = Vector((0, 1, 0)) if abs(t.y) < 0.95 else Vector((1, 0, 0))
    s = t.cross(up).normalized(); u = s.cross(t).normalized(); return s, u
def ring(c, t, shape, rot=0.0):
    s, u = frame(t); c = Vector(c); out = []
    ca, sa = math.cos(rot), math.sin(rot)
    for (a, b) in shape:
        a2, b2 = a * ca - b * sa, a * sa + b * ca
        out.append(tuple(c + s * a2 + u * b2))
    return out
def rrect(w, h, ch):   # chamfered rectangle, centred
    w2, h2 = w / 2, h / 2
    return [(-w2 + ch, -h2), (w2 - ch, -h2), (w2, -h2 + ch), (w2, h2 - ch), (w2 - ch, h2), (-w2 + ch, h2), (-w2, h2 - ch), (-w2, -h2 + ch)]
def circ(r, n=10, jit=0.0): return [(r * (1 + R.uniform(-jit, jit)) * math.cos(a * 6.283 / n), r * (1 + R.uniform(-jit, jit)) * math.sin(a * 6.283 / n)) for a in range(n)]
def beam(a, b, w, h, ch=0.012, n=2, m="wood", sag=0.0, jit=0.004, vscale=0.5, v0=None):
    a, b = Vector(a), Vector(b); t = b - a; rings = []; sh = rrect(w, h, ch)
    for i in range(n + 1):
        f = i / n; c = a + t * f; c.y -= sag * 4 * f * (1 - f)
        rings.append(ring(c + Vector((R.uniform(-jit, jit), R.uniform(-jit, jit), R.uniform(-jit, jit))), t, sh))
    loft(rings, m, us=[t.length * i / n / 2.4 for i in range(n + 1)], vscale=vscale, v0=R.random() if v0 is None else v0)
def log(a, b, r, n=10, segs=5, jit=0.08, m="wood", taper=0.85):
    a, b = Vector(a), Vector(b); t = b - a; rings = []
    for i in range(segs + 1):
        f = i / segs; rr = r * (1 - (1 - taper) * f)
        rings.append(ring(a + t * f + Vector((R.uniform(-.01, .01), 0, R.uniform(-.01, .01))), t, circ(rr, n, jit), rot=f * 0.4))
    loft(rings, m, us=[t.length * i / segs / 2.0 for i in range(segs + 1)], vscale=1 / (6.283 * r) * 0.14, v0=R.random())

stats = {"planks": 0, "nails": 0}
# ---- treads, bearers, nails
GAP, NPL = 0.025, 4
PW = (1.7 - GAP * (NPL - 1)) / NPL
for k in range(14):
    x, z, T = cx(k), cz(k), top(k)
    for side in (-1, 1):   # bearers under the side edges
        bx = x + side * 1.0
        beam((bx, T - 0.05 - 0.15, z + 0.9), (bx, T - 0.05 - 0.15, z - 0.9), 0.12, 0.3, ch=0.02, n=1)
        beam((bx, T - 0.355 - 0.035, z + 0.06), (bx, T - 0.355 - 0.035, z - 0.06), 0.12, 0.075, ch=0.01, n=1)   # shim onto the stringer
    for i in range(NPL):
        if k == 12 and i == 1: continue   # the missing plank near the top
        pz = z + 0.85 - PW / 2 - i * (PW + GAP)
        x0 = x - 1.2 + R.uniform(-0.035, 0.02); x1 = x + 1.2 + R.uniform(-0.02, 0.035)
        yaw = R.uniform(-0.012, 0.012); tilt = R.uniform(-0.004, 0.004)
        sh = rrect(PW * R.uniform(0.97, 1.0), 0.05, 0.01); rings = []; N = 6
        strip = R.randrange(7)
        for j in range(N + 1):
            f = j / N; px = x0 + (x1 - x0) * f
            c = Vector((px, T - 0.025 - 0.004 * math.sin(f * math.pi) + tilt * (f - 0.5) + R.uniform(-0.002, 0.002), pz + yaw * (px - x)))
            rings.append(ring(c, (1, 0, 0), sh))
        loft(rings, "wood", us=[(x1 - x0) * j / N / 2.4 + R.random() * 0 for j in range(N + 1)], vscale=0.85 / 7.27 / PW * 0.5, v0=strip / 7.27 + 0.005)
        stats["planks"] += 1
        for side in (-1, 1):
            for dz in (-0.12, 0.12):
                nx, nz = x + side * 1.0 + R.uniform(-0.01, 0.01), pz + dz + R.uniform(-0.015, 0.015)
                log((nx, T - 0.002, nz), (nx, T + 0.004, nz), 0.009, n=6, segs=1, jit=0.0, m="iron", taper=1.0); stats["nails"] += 1

# ---- stringers: one straight timber per side from the wharf to the summit, under the bearers
def sy(kf): return 1.55 + kf * 0.7 + 0.72 - O[1] - 0.42 - 0.15
for side in (-1, 1):
    a = (cx(-0.6) + side * 1.0, sy(-0.6), cz(-0.6)); b = (cx(13.4) + side * 1.0, sy(13.4), cz(13.4))
    beam(a, b, 0.12, 0.3, ch=0.02, n=14, jit=0.006)

# ---- legs under every bearer down to the rock / sea floor
for k in range(14):
    for side, gi in ((1, 1), (-1, 2)):
        x, z = cx(k) + side * 1.0, cz(k)
        ytop = top(k) - 0.42 - 0.3; g = min(gy(k, 0), gy(k, gi)) - 0.45
        if ytop - g > 0.35: log((x, g, z), (x, ytop, z), 0.075, n=8, segs=max(2, int((ytop - g) / 0.6)), jit=0.07)

# ---- posts every 2 steps, both sides, driven into the rock; numbered 2j+1 seaward, 2j+2 landward
PX = 1.31; RAIL = 0.95; posts = {}; hooks = []
for j, k in enumerate(range(0, 14, 2)):
    for side, gi, num in ((1, 1, 2 * j + 1), (-1, 2, 2 * j + 2)):
        x, z = cx(k) + side * PX, cz(k)
        g = min(gy(k, gi), top(k) - 1.5) - 0.5
        tp = top(k) + RAIL + 0.12 + R.uniform(-0.03, 0.03)
        log((x, g, z), (x, tp, z), 0.095, n=11, segs=max(5, int((tp - g) / 0.45)), jit=0.09, taper=0.9)
        # chopped, slightly domed top
        loft([ring((x, tp, z), (0, 1, 0), circ(0.085, 11, 0.05)), ring((x, tp + 0.03, z), (0, 1, 0), circ(0.05, 11, 0.1))], "wood")
        posts[num] = (x, tp, z, k, side)
        if num in (3, 9):   # lantern hook: iron arm out to sea, bent down at the tip
            yh = tp - 0.1
            beam((x + 0.08, yh, z), (x + 0.42, yh, z), 0.022, 0.022, ch=0.005, n=1, m="iron")
            beam((x + 0.42, yh + 0.01, z), (x + 0.42, yh - 0.12, z), 0.016, 0.016, ch=0.004, n=1, m="iron")
            beam((x + 0.045, yh + 0.08, z), (x + 0.045, yh - 0.08, z), 0.025, 0.04, ch=0.006, n=1, m="iron")   # strap on the post
            hooks.append({"post": num, "k": k, "x": x + 0.42, "y": yh - 0.12, "z": z})

# ---- seaward rope handrail: tarred, sagging between post tops, a coil round each post
sea = [posts[n] for n in sorted(posts) if n % 2 == 1]
for p0, p1 in zip(sea, sea[1:]):
    a = Vector((p0[0], top(p0[3]) + RAIL, p0[2])); b = Vector((p1[0], top(p1[3]) + RAIL, p1[2]))
    rings = []; N = 14; t = b - a
    for i in range(N + 1):
        f = i / N; c = a + t * f; c.y -= 0.16 * 4 * f * (1 - f)
        tt = t.copy(); tt.y -= 0.16 * 4 * (1 - 2 * f)
        rings.append(ring(c, tt, circ(0.015, 6), rot=f * 9))
    loft(rings, "rope", us=[f / N * t.length for f in range(N + 1)], vscale=1)
for p in sea:
    x, z, y = p[0], p[2], top(p[3]) + RAIL
    rings = []
    for i in range(17):
        a = i / 16 * 6.283 * 1.9; c = (x + math.cos(a) * 0.11, y - 0.03 + i * 0.004, z + math.sin(a) * 0.11)
        rings.append(ring(c, (-math.sin(a), 0.004, math.cos(a)), circ(0.017, 6)))
    loft(rings, "rope")
# ---- landward split-log rail: half-round, flat face toward the treads
half = [(0.07 * math.cos(a), 0.07 * math.sin(a)) for a in [math.pi * (i / 6) - math.pi / 2 for i in range(7)]]
land = [posts[n] for n in sorted(posts) if n % 2 == 0]
for p0, p1 in zip(land, land[1:]):
    a = Vector((p0[0] - 0.02, top(p0[3]) + RAIL, p0[2])); b = Vector((p1[0] - 0.02, top(p1[3]) + RAIL, p1[2]))
    t = b - a; ext = t.normalized() * 0.12; a -= ext; b += ext; t = b - a; rings = []
    for i in range(5):
        f = i / 4; c = a + t * f + Vector((0, R.uniform(-0.008, 0.008), 0))
        s, u = frame(t); sh = [(-hy, hx * (1 + R.uniform(-.06, .06))) for hx, hy in half]  # round side out (-x side)
        rings.append(ring(c, t, [(q[1] * -1 if False else q[0], q[1]) for q in [(-hx, hy) for hx, hy in half]]))
    loft(rings, "wood", us=[t.length * i / 4 / 2.4 for i in range(5)], vscale=0.5, v0=R.random())
    # iron spike through the rail into the post
# ---- tar drips: on bearers and posts
for k, side in ((1, 1), (3, -1), (5, 1), (8, 1), (10, -1), (12, 1), (6, -1)):
    x, z = cx(k) + side * 1.0 + 0.061 * side, cz(k) + R.uniform(-0.6, 0.6)
    y0 = top(k) - 0.06; L = R.uniform(0.12, 0.3); rings = []
    for i in range(6):
        f = i / 5; r = 0.012 * (1 - f * 0.6) + (0.01 if i == 5 else 0)
        rings.append(ring((x + side * 0.004 * math.sin(f * 3), y0 - L * f, z), (0, -1, 0), circ(r, 6)))
    loft(rings, "tar")
    loft([ring((x - side * 0.005, y0 + 0.005, z), (0, -1, 0), [(a * 2.5, b * 4) for a, b in circ(0.012, 6)]), ring((x - side * 0.005, y0 - 0.03, z), (0, -1, 0), circ(0.013, 6))], "tar")
for n in (5, 11):   # tar run down two posts
    x, tp, z, k, s = posts[n]
    loft([ring((x + 0.093 * s, tp - 0.2 - f * 0.5, z + 0.02), (0, -1, 0), circ(0.016 * (1 - f * 0.5), 6)) for f in (0, .25, .5, .75, 1)], "tar")

me = bpy.data.meshes.new("l7_stair"); bm.normal_update(); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("l7_stair", me); scene.collection.objects.link(ob)
for m in MATS.values(): me.materials.append(m)
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
try: me.set_sharp_from_angle(angle=math.radians(50))
except Exception as e: print("sharp", e)
for p in me.polygons: p.use_smooth = True
dg = bpy.context.evaluated_depsgraph_get(); me.calc_loop_triangles()
tris = len(me.loop_triangles)
xs = [v.co for v in me.vertices]
bmin = (min(v.x for v in xs), min(v.z for v in xs), min(-v.y for v in xs)); bmax = (max(v.x for v in xs), max(v.z for v in xs), max(-v.y for v in xs))
json.dump({"tris": tris, "min": bmin, "max": bmax, "hooks": hooks, **stats}, open(OUT + "/info.json", "w"), indent=1)
print("TRIS", tris, bmin, bmax)

# ---- proof
scene.render.engine = "CYCLES"; scene.cycles.samples = 16; scene.render.resolution_x = 900; scene.render.resolution_y = 656
w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.28, 0.32, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3.5; sun.rotation_euler = (0.8, 0.2, 2.4); scene.collection.objects.link(sun)
def cam(name, eye, tgt):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); scene.collection.objects.link(c)
    e = Vector((eye[0], -eye[2], eye[1])); t = Vector((tgt[0], -tgt[2], tgt[1])); c.location = e
    c.rotation_euler = (t - e).to_track_quat("-Z", "Y").to_euler(); c.data.lens = 28; return c
shots = [("a", (6, 6, 5), (-6, 4, -8)), ("b", (-4, 6.5, -5), (-6, 5.2, -7)), ("c", (-20, 12, -12), (-9, 5, -11))]
for n, e, t in shots:
    scene.camera = cam(n, e, t); scene.render.filepath = f"{OUT}/proof_{n}.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=OUT + "/l7-stair.glb", export_apply=True, export_cameras=False, export_lights=False, use_selection=True)
