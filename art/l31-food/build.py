import bpy, bmesh, math, random
from mathutils import Vector
random.seed(31)
OUT = "/workspace/l31food/"
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
MATS = {}
def mat(name, col, metal=0.0, rough=0.5, emit=0.0, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*col, 1); b.inputs["Emission Strength"].default_value = emit
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND"
    MATS[name] = m; return m
STEEL = lambda: mat("steel", (0.72, 0.73, 0.75), 1, 0.32)
CHROME = lambda: mat("chrome", (0.85, 0.86, 0.88), 1, 0.15)
DARK = lambda: mat("dark", (0.05, 0.05, 0.06), 0.2, 0.5)
GLASS = lambda: mat("glass", (0.8, 0.9, 0.95), 0, 0.05, 0, 0.18)
def fin(o, m, bevel=0.0, seg=2):
    o.data.materials.append(m)
    if bevel: 
        b = o.modifiers.new("bev", "BEVEL"); b.width = bevel; b.segments = seg; b.limit_method = "ANGLE"
    for p in o.data.polygons: p.use_smooth = True
    return o
def box(size, loc, m, bevel=0.008, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True); return fin(o, m, bevel)
def cyl(r, h, loc, m, rot=(0, 0, 0), verts=28, bevel=0.0, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, vertices=verts, location=loc, rotation=rot)
    return fin(bpy.context.object, m, bevel)
def sph(r, loc, m, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=14, ring_count=8, location=loc, rotation=rot); o = bpy.context.object; o.scale = scale
    return fin(o, m)
def tube(a, b, r, m):
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl(r, d.length, (a + b) / 2, m, verts=14); o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); return o
def text(body, size, loc, m, rot=(math.pi / 2, 0, 0), ext=0.002):
    bpy.ops.object.text_add(location=loc, rotation=rot); o = bpy.context.object
    o.data.body = body; o.data.size = size; o.data.align_x = "CENTER"; o.data.align_y = "CENTER"; o.data.extrude = ext
    bpy.ops.object.convert(target="MESH"); o = bpy.context.object; o.data.materials.append(m); return o
def poly(pts, z0, z1, m):
    me = bpy.data.meshes.new("p"); bm = bmesh.new(); vs = [bm.verts.new((x, y, z0)) for x, y in pts]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, verts=[v for v in r["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, z1 - z0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); o = bpy.data.objects.new("p", me); sc.collection.objects.link(o); o.data.materials.append(m); return o

def table():
    top = mat("laminate", (0.86, 0.82, 0.72), 0, 0.35); edge = mat("edgeband", (0.12, 0.1, 0.1), 0, 0.5)
    return [box((0.8, 0.8, 0.03), (0, 0, 0.735), top, 0.006), box((0.81, 0.81, 0.022), (0, 0, 0.732), edge, 0.01),
            cyl(0.04, 0.68, (0, 0, 0.375), CHROME()), cyl(0.09, 0.02, (0, 0, 0.71), STEEL()),
            cyl(0.24, 0.035, (0, 0, 0.0175), DARK(), bevel=0.012), cyl(0.07, 0.05, (0, 0, 0.05), DARK(), r2=0.045)]
def chair():
    org = mat("plastic_orange", (0.93, 0.36, 0.05), 0, 0.38)
    prof = [(-0.23, 0.425), (-0.2, 0.445), (-0.1, 0.44), (0.02, 0.43), (0.13, 0.425), (0.19, 0.45), (0.215, 0.52), (0.225, 0.62), (0.235, 0.72), (0.245, 0.8), (0.25, 0.84)]
    me = bpy.data.meshes.new("shell"); bm = bmesh.new(); N = 8; rows = []
    for j, (y, z) in enumerate(prof):
        w = 0.21 if j < 6 else 0.21 - 0.015 * (j - 6) / 4
        row = []
        for i in range(N + 1):
            u = i / N * 2 - 1; back = j >= 6
            row.append(bm.verts.new((u * w, y - (0.035 * u * u if back else 0), z + (0.022 * u * u if not back else 0))))
        rows.append(row)
    for j in range(len(rows) - 1):
        for i in range(N): bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bm.to_mesh(me); o = bpy.data.objects.new("shell", me); sc.collection.objects.link(o); o.data.materials.append(org)
    s = o.modifiers.new("s", "SOLIDIFY"); s.thickness = 0.014; s.offset = 0
    ss = o.modifiers.new("ss", "SUBSURF"); ss.levels = 2
    for p in o.data.polygons: p.use_smooth = True
    out = [o]
    for sx in (-1, 1):
        for sy, yy in ((-1, -0.17), (1, 0.15)):
            out.append(tube((sx * 0.15, yy, 0.43), (sx * 0.2, yy + sy * 0.05, 0.0), 0.011, CHROME()))
            out.append(cyl(0.015, 0.012, (sx * 0.2, yy + sy * 0.05, 0.006), DARK()))
        out.append(tube((sx * 0.15, -0.17, 0.42), (sx * 0.15, 0.15, 0.415), 0.011, CHROME()))
    return out
def bench(col, name):
    p = mat("paint_" + name, col, 0.6, 0.42); out = []
    for i in range(5): out.append(box((1.8, 0.075, 0.022), (0, -0.2 + i * 0.095, 0.45 - (0.004 * i)), p, 0.006))
    for i in range(4): out.append(box((1.8, 0.022, 0.075), (0, 0.24 + i * 0.012, 0.56 + i * 0.095), p, 0.006))
    for sx in (-0.82, 0.82):
        out += [tube((sx, -0.2, 0.0), (sx, -0.2, 0.64), 0.022, p), tube((sx, 0.27, 0.0), (sx, 0.3, 0.9), 0.022, p),
                tube((sx, -0.22, 0.43), (sx, 0.27, 0.43), 0.02, p), tube((sx, -0.24, 0.64), (sx, 0.285, 0.64), 0.024, p),
                box((0.12, 0.12, 0.012), (sx, -0.2, 0.006), p, 0.003), box((0.12, 0.12, 0.012), (sx, 0.27, 0.006), p, 0.003)]
        for bx, by in ((-0.04, -0.24), (0.04, -0.16), (-0.04, 0.23), (0.04, 0.31)): out.append(cyl(0.011, 0.02, (sx + bx, by, 0.014), STEEL(), verts=6))
    return out
def trash():
    body = mat("trash_body", (0.36, 0.2, 0.1), 0, 0.55); topm = mat("trash_top", (0.14, 0.12, 0.11), 0, 0.5); wh = mat("white", (0.9, 0.9, 0.86), 0, 0.6)
    out = [box((0.56, 0.56, 0.82), (0, 0, 0.43), body, 0.02), box((0.6, 0.6, 0.04), (0, 0, 0.02), topm, 0.01),
           box((0.6, 0.6, 0.3), (0, 0, 0.97), topm, 0.03), box((0.38, 0.02, 0.2), (0, -0.295, 0.97), body, 0.006, rot=(0.12, 0, 0)),
           box((0.62, 0.62, 0.03), (0, 0, 1.135), topm, 0.012), box((0.5, 0.42, 0.02), (0, 0, 1.16), mat("tray", (0.55, 0.3, 0.12), 0, 0.5), 0.008)]
    out.append(text("PUSH", 0.07, (0, -0.31, 0.975), wh, rot=(math.pi / 2 + 0.12, 0, 0)))
    out.append(text("THANK YOU", 0.045, (0, -0.283, 0.6), wh))
    return out
def pump(x, y, z, col):
    m = mat("sauce_%d" % int(col[0] * 100 + col[1] * 10), col, 0, 0.4)
    return [cyl(0.05, 0.2, (x, y, z + 0.1), m, bevel=0.008), cyl(0.03, 0.03, (x, y, z + 0.215), mat("white", (0.9, 0.9, 0.86), 0, 0.6)),
            tube((x, y, z + 0.22), (x, y, z + 0.29), 0.008, mat("white", (0.9, 0.9, 0.86))), tube((x, y, z + 0.285), (x, y - 0.06, z + 0.275), 0.007, mat("white", (0.9, 0.9, 0.86)))]
def condi():
    lam = mat("condi_body", (0.5, 0.12, 0.08), 0, 0.5); wh = mat("white", (0.9, 0.9, 0.86), 0, 0.6)
    out = [box((1.0, 0.5, 0.86), (0, 0, 0.47), lam, 0.012), box((1.0, 0.5, 0.04), (0, 0, 0.02), DARK(), 0.008), box((1.04, 0.54, 0.035), (0, 0, 0.917), STEEL(), 0.008)]
    out += pump(-0.36, 0.05, 0.935, (0.7, 0.05, 0.03)) + pump(-0.22, 0.05, 0.935, (0.9, 0.7, 0.05)) + pump(-0.08, 0.05, 0.935, (0.25, 0.45, 0.1))
    out += [box((0.14, 0.18, 0.2), (0.14, 0.05, 1.035), STEEL(), 0.012), box((0.1, 0.01, 0.1), (0.14, -0.042, 1.04), wh, 0.002)]
    out += [cyl(0.045, 0.14, (0.36, 0.08, 1.005), STEEL())] + [tube((0.36 + random.uniform(-.025, .025), 0.08 + random.uniform(-.025, .025), 1.0), (0.36 + random.uniform(-.05, .05), 0.08 + random.uniform(-.05, .05), 1.2), 0.003, mat("straw%d" % (i % 2), ((0.9, 0.2, 0.2), (0.95, 0.95, 0.95))[i % 2])) for i in range(9)]
    out += [box((0.16, 0.12, 0.05), (0.36, -0.13, 0.96), mat("lidstack", (0.92, 0.92, 0.95), 0, 0.3), 0.01)]
    out.append(text("NAPKINS", 0.022, (0.14, -0.049, 1.1), DARK()))
    return out
def pizza(cx, cy, z, pep, missing):
    cheese = mat("cheese", (0.95, 0.68, 0.2), 0, 0.45); crust = mat("crust", (0.72, 0.45, 0.2), 0, 0.7); pp = mat("pepperoni", (0.55, 0.08, 0.05), 0, 0.5)
    out = [cyl(0.25, 0.012, (cx, cy, z + 0.006), mat("pan", (0.3, 0.3, 0.32), 1, 0.4), bevel=0.003)]
    R, RI, g = 0.225, 0.195, 0.012
    for k in range(8):
        if k in missing: continue
        a0, a1 = k * math.pi / 4, (k + 1) * math.pi / 4; am = (a0 + a1) / 2; ox, oy = cx + math.cos(am) * g, cy + math.sin(am) * g
        arc = lambda r: [(ox + math.cos(a0 + (a1 - a0) * t / 6) * r, oy + math.sin(a0 + (a1 - a0) * t / 6) * r) for t in range(7)]
        out.append(poly([(ox, oy)] + arc(RI), z + 0.012, z + 0.024, cheese))
        out.append(poly(arc(RI) + arc(R)[::-1], z + 0.012, z + 0.034, crust))
        if pep:
            for (rr, aa) in ((0.07, 0.5), (0.14, 0.28), (0.15, 0.74)):
                a = a0 + (a1 - a0) * aa; out.append(cyl(0.02, 0.004, (ox + math.cos(a) * rr, oy + math.sin(a) * rr, z + 0.026), pp, verts=12))
    return out
def pizzawarm():
    lamp = mat("heatlamp", (1.0, 0.45, 0.1), 0, 0.4, 6.0); red = mat("warmer_red", (0.6, 0.06, 0.04), 0.3, 0.4)
    out = [box((1.5, 0.66, 0.08), (0, 0, 0.04), STEEL(), 0.01), box((1.5, 0.3, 0.1), (0, 0.1, 0.75), red, 0.02), box((1.4, 0.24, 0.012), (0, 0.1, 0.695), STEEL(), 0.003)]
    for sx in (-0.7, 0.7): out += [tube((sx, 0.27, 0.08), (sx, 0.27, 0.72), 0.018, CHROME()), tube((sx, 0.27, 0.72), (sx, 0.12, 0.74), 0.018, CHROME())]
    for lx in (-0.36, 0.36): out += [cyl(0.085, 0.07, (lx, 0.1, 0.665), CHROME(), r2=0.05), sph(0.06, (lx, 0.1, 0.63), lamp, (1, 1, 0.6))]
    out += pizza(-0.36, 0.0, 0.08, False, {2}) + pizza(0.36, 0.0, 0.08, True, {5, 6})
    out.append(box((1.46, 0.006, 0.42), (0, -0.3, 0.33), GLASS(), 0, rot=(-0.35, 0, 0)))
    out.append(text("HOT PIZZA", 0.07, (0, -0.052, 0.75), mat("gold", (1.0, 0.8, 0.3), 0, 0.4, 1.5)))
    # a slice on a paper plate beside the pan
    out += [cyl(0.11, 0.006, (0.0, -0.2, 0.083), mat("white", (0.9, 0.9, 0.86), 0, 0.6))]
    return out
def grill():
    dog = mat("hotdog", (0.6, 0.2, 0.1), 0, 0.3)
    out = [box((0.95, 0.5, 0.2), (0, 0, 0.1), STEEL(), 0.012), box((0.95, 0.03, 0.12), (0, -0.25, 0.1), DARK(), 0.004)]
    for sx in (-0.455, 0.455): out.append(box((0.04, 0.5, 0.1), (sx, 0, 0.24), STEEL(), 0.008))
    for i in range(11): out.append(cyl(0.017, 0.87, (0, -0.2 + i * 0.04, 0.235), CHROME(), rot=(0, math.pi / 2, 0), verts=14))
    for i, (x, r) in enumerate(((-0.25, 1), (0.22, 3), (-0.22, 5), (0.25, 7), (-0.1, 9))):
        y = -0.2 + r * 0.04 + 0.02
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.016, segments=12, ring_count=8, location=(x, y, 0.262)); o = bpy.context.object
        for v in o.data.vertices: v.co.z += 0.136 if v.co.z > 0 else -0.136
        o.rotation_euler = (0, math.pi / 2, 0); out.append(fin(o, dog))
    for kx in (-0.3, 0.3): out.append(cyl(0.025, 0.03, (kx, -0.27, 0.1), mat("knob", (0.75, 0.1, 0.08), 0, 0.4), rot=(math.pi / 2, 0, 0)))
    out.append(box((0.93, 0.006, 0.3), (0, -0.2, 0.47), GLASS(), 0, rot=(-0.5, 0, 0)))
    for sx in (-0.46, 0.46): out.append(tube((sx, 0.0, 0.28), (sx, -0.12, 0.6), 0.008, CHROME()))
    out.append(text("FOOT-LONGS", 0.045, (0, -0.268, 0.1), mat("white", (0.9, 0.9, 0.86), 0, 0.6)))
    return out
def wings():
    out = [box((1.1, 0.55, 0.12), (0, 0, 0.06), STEEL(), 0.01), box((1.1, 0.55, 0.06), (0, 0, 0.6), STEEL(), 0.012), box((1.04, 0.01, 0.42), (0, 0.27, 0.34), STEEL(), 0)]
    for sx in (-0.535, 0.535):
        for sy in (-0.26, 0.26): out.append(box((0.03, 0.03, 0.46), (sx, sy, 0.35), STEEL(), 0.004))
        out.append(box((0.006, 0.5, 0.44), (sx, 0, 0.35), GLASS(), 0))
    out.append(box((1.06, 0.006, 0.44), (0, -0.27, 0.35), GLASS(), 0))
    out.append(box((1.0, 0.03, 0.03), (0, 0, 0.56), mat("heatlamp", (1.0, 0.45, 0.1), 0, 0.4, 6.0), 0.01))
    wh = mat("white", (0.9, 0.9, 0.86), 0, 0.6)
    for k, (nm, col) in enumerate((("MILD", (0.85, 0.5, 0.15)), ("HOT", (0.75, 0.22, 0.05)), ("TOO HOT", (0.45, 0.04, 0.02)))):
        px = -0.34 + k * 0.34; wm = mat("wing_" + nm, col, 0, 0.35)
        out.append(box((0.3, 0.42, 0.05), (px, 0, 0.145), mat("pan", (0.3, 0.3, 0.32), 1, 0.4), 0.008))
        for i in range(22):
            out.append(sph(0.03, (px + random.uniform(-0.11, 0.11), random.uniform(-0.16, 0.16), 0.185 + random.uniform(0, 0.05)), wm, (1.7, 0.85, 0.7), (random.uniform(-.4, .4), random.uniform(-.4, .4), random.uniform(0, 3.1))))
        out.append(box((0.2, 0.004, 0.05), (px, -0.277, 0.09), wh, 0.001)); out.append(text(nm, 0.03, (px, -0.281, 0.09), DARK()))
    return out
def soda():
    body = mat("soda_body", (0.09, 0.09, 0.1), 0.3, 0.4); wh = mat("white", (0.9, 0.9, 0.86), 0, 0.6)
    out = [box((1.0, 0.6, 0.16), (0, 0, 0.08), STEEL(), 0.01), box((1.0, 0.36, 0.56), (0, 0.12, 0.44), body, 0.02),
           box((1.0, 0.4, 0.2), (0, 0.1, 0.82), mat("marquee", (0.95, 0.9, 0.7), 0, 0.4, 2.5), 0.02), box((0.92, 0.3, 0.012), (0, -0.14, 0.166), DARK(), 0.002)]
    for i in range(12): out.append(box((0.9, 0.008, 0.006), (0, -0.27 + i * 0.024, 0.175), CHROME(), 0))
    out.append(text("ICE COLD DRINKS", 0.075, (0, -0.103, 0.82), mat("soda_red", (0.7, 0.05, 0.05), 0, 0.4)))
    for k, (nm, col, sz) in enumerate((("COLA", (0.45, 0.06, 0.04), 0.036), ("ORANGE", (0.95, 0.45, 0.05), 0.03), ("LIME", (0.25, 0.7, 0.15), 0.036), ("ALMOND\nWATER", (0.93, 0.9, 0.8), 0.026))):
        px = -0.36 + k * 0.24; lm = mat("tap_" + nm[:4], col, 0, 0.4, 0.6)
        out += [box((0.11, 0.1, 0.2), (px, -0.1, 0.52), STEEL(), 0.012), box((0.15, 0.008, 0.1), (px, -0.154, 0.56), lm, 0.002),
                cyl(0.022, 0.06, (px, -0.11, 0.39), DARK(), r2=0.014), box((0.05, 0.012, 0.11), (px, -0.16, 0.42), CHROME(), 0.004, rot=(0.25, 0, 0))]
        out.append(text(nm, sz, (px, -0.16, 0.56), DARK() if k == 3 else wh))
    cupm = mat("cup", (0.9, 0.25, 0.2), 0, 0.5)
    for i in range(6): out.append(cyl(0.04, 0.1, (0.43, -0.2, 0.22 + i * 0.022), cupm, r2=0.03, verts=20))
    return out

PROPS = [("table", table), ("chair", chair), ("bench_orange", lambda: bench((0.9, 0.33, 0.04), "orange")), ("bench_green", lambda: bench((0.1, 0.42, 0.18), "green")), ("trash", trash), ("condi", condi), ("pizza", pizzawarm), ("grill", grill), ("wings", wings), ("soda", soda)]
x = 0; tris = {}
for name, fn in PROPS:
    objs = fn(); bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH"); bpy.ops.object.join(); j = bpy.context.object; j.name = name
    bpy.ops.object.shade_smooth()
    try: bpy.ops.object.shade_auto_smooth(angle=0.7)
    except Exception as e: print("nosmooth", e)
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", use_selection=True, export_apply=True)
    j.data.calc_loop_triangles(); tris[name] = len(j.data.loop_triangles)
    base = {"pizza": 0.92, "grill": 0.92, "wings": 0.92, "soda": 0.92}.get(name, 0)
    j.location = (x, 0, base); x += 1.9
print("TRIS", tris)
bpy.ops.mesh.primitive_plane_add(size=60, location=(8, 0, 0))
bpy.ops.object.light_add(type="SUN", rotation=(0.9, 0, -0.5)); bpy.context.object.data.energy = 3
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 1900; sc.render.resolution_y = 520
for i, (cx, w2) in enumerate(((3.8, 9.5), (13.3, 9.5))):
    bpy.ops.object.camera_add(location=(cx, -7.5, 2.6)); c = bpy.context.object
    c.rotation_euler = (Vector((cx, 0, 0.8)) - c.location).to_track_quat("-Z", "Y").to_euler(); c.data.lens = 42
    sc.camera = c; sc.render.filepath = "/tmp/l31food/p%d.png" % i; bpy.ops.render.render(write_still=True)
