# Level 6.1 Liquorette: the old-world tavern set. Front is +Y in Blender (glTF -Z, so the sim says forward "-z"), models stand on z = 0, centred on x/y.
# Run: blender -b --factory-startup --python art/liquorette/build.py -- backbar bar stool chair table boiler   (out: art/liquorette/out/<name>.glb + preview_<name>.png)
import bpy, math, os, sys, random
from mathutils import Vector, Euler
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out"); os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["backbar", "bar", "stool", "chair", "table", "boiler"]

def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough=0.6, metal=0.0, emit=0.0, ecol=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*(ecol or col), 1); b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*col, 1); return m
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def box(name, size, loc, m, bevel=0.01, segs=2, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = segs; md.limit_method = "ANGLE"; bpy.ops.object.modifier_apply(modifier="b")
    if any(rot): o.data.transform(Euler(rot, "XYZ").to_matrix().to_4x4())   # rotate the mesh itself about its own centre, then put it where it goes
    o.location = loc; o.data.materials.append(m); smooth(o); return o
def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=16, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name
    o.data.materials.append(m); smooth(o); return o
def sph(name, r, loc, m, scale=(1, 1, 1), seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=r, location=loc); o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m); smooth(o); return o
def torus(name, R, r, loc, m, rot=(0, 0, 0), ms=24, mi=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=ms, minor_segments=mi, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name
    o.data.materials.append(m); smooth(o); return o
def join_export(name, objs):
    bpy.context.view_layer.update()
    if os.environ.get('DBG'):
        for o in objs:
            bb=[o.matrix_world @ Vector(c) for c in o.bound_box]
            if max(v.z for v in bb)>3.9 or max(abs(v.x) for v in bb)>3.6: print('FAR', o.name, round(max(v.z for v in bb),2), round(max(abs(v.x) for v in bb),2))
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    path = os.path.join(OUT, name + ".glb"); bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions)); return ob
def preview(name, ob, az=25, dist=1.9, el=0.2):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 900; sc.render.resolution_y = 600
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.5, 0.52, 0.55)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 40
    d = max(ob.dimensions.x, ob.dimensions.z); t = Vector((0, 0, ob.dimensions.z / 2)); a = math.radians(az); cam.location = t + Vector((math.sin(a) * d * dist, math.cos(a) * d * dist, d * el))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.render.filepath = os.path.join(OUT, "preview_%s.png" % name); bpy.ops.render.render(write_still=True)

def M():
    return dict(
        wood=mat("wood", (0.20, 0.065, 0.035), 0.42), wood2=mat("wood2", (0.34, 0.14, 0.07), 0.5), woodd=mat("woodd", (0.09, 0.03, 0.02), 0.5),
        brass=mat("brass", (0.8, 0.58, 0.22), 0.28, 1.0), mirror=mat("mirror", (0.62, 0.52, 0.42), 0.12, 0.9), lead=mat("lead", (0.05, 0.05, 0.05), 0.6, 0.6),
        gy=mat("glassY", (0.75, 0.85, 0.28), 0.3, 0, 2.4, (0.8, 0.88, 0.32)), gw=mat("glassW", (0.95, 0.88, 0.8), 0.3, 0, 2.8, (1.0, 0.85, 0.7)),
        gg=mat("glassG", (0.4, 0.75, 0.3), 0.3, 0, 2.2, (0.45, 0.8, 0.3)), gp=mat("glassP", (0.85, 0.35, 0.4), 0.3, 0, 2.2, (0.9, 0.35, 0.4)),
        bg=mat("bottleG", (0.06, 0.16, 0.07), 0.12), ba=mat("bottleA", (0.34, 0.15, 0.03), 0.12), bc=mat("bottleC", (0.8, 0.85, 0.85), 0.1, 0, 0.0), br=mat("bottleR", (0.35, 0.04, 0.05), 0.12),
        lab=mat("label", (0.9, 0.82, 0.62), 0.8), cream=mat("cream", (0.85, 0.8, 0.68), 0.7), face=mat("clockface", (0.92, 0.9, 0.82), 0.5), dark=mat("dark", (0.03, 0.025, 0.02), 0.8),
        copper=mat("copper", (0.72, 0.36, 0.2), 0.3, 1.0), red=mat("red", (0.55, 0.06, 0.05), 0.4, 0.4), steel=mat("steel", (0.75, 0.75, 0.78), 0.25, 1.0),
        seat=mat("seat", (0.28, 0.11, 0.05), 0.55), marble=mat("marble", (0.82, 0.8, 0.76), 0.2))

def bottle(P, x, y, z, h, r, m, lab=None):
    P.append(cyl("bb", r, h * 0.62, (x, y, z + h * 0.31), m, verts=8)); P.append(cyl("bn", r * 0.38, h * 0.38, (x, y, z + h * 0.62 + h * 0.19), m, verts=8, r2=r * 0.28))
    if lab: P.append(cyl("bl", r * 1.04, h * 0.2, (x, y, z + h * 0.3), lab, verts=8))

# --------------------------------------------------------------------- the back bar: a carved arched canopy over a mirrored shelf wall, stained glass under the arch, bottles everywhere, a clock on the crest.
# 6.4 wide, 0.7 deep, 3.7 tall. Front +Y.
def backbar():
    m = M(); P = []; rnd = random.Random(7); Wd, Dp = 6.4, 0.7
    P.append(box("base", (Wd, Dp, 0.96), (0, 0, 0.48), m["wood"], 0.02, 3))                                         # the cabinet under the shelves
    P.append(box("plinth", (Wd + 0.04, Dp + 0.04, 0.1), (0, 0, 0.05), m["woodd"], 0.01, 2))
    P.append(box("top", (Wd + 0.1, Dp + 0.08, 0.05), (0, 0.02, 0.985), m["wood2"], 0.015, 3))                      # the counter shelf
    for i in range(10):                                                                                             # raised panelled doors
        x = -Wd / 2 + 0.36 + i * (Wd - 0.72) / 9
        P.append(box("door", (0.5, 0.04, 0.72), (x, Dp / 2, 0.5), m["wood2"], 0.012, 2)); P.append(box("panel", (0.34, 0.03, 0.54), (x, Dp / 2 + 0.02, 0.5), m["wood"], 0.01, 2))
        P.append(cyl("knob", 0.02, 0.03, (x + 0.18, Dp / 2 + 0.05, 0.5), m["brass"], rot=(math.pi / 2, 0, 0), verts=10))
    # the mirrored wall behind the shelves + the three open shelves
    P.append(box("mirror", (4.5, 0.04, 2.0), (0, -Dp / 2 + 0.04, 1.98), m["mirror"], 0.0, 1))
    P.append(box("frame_l", (0.1, 0.12, 2.1), (-2.3, -Dp / 2 + 0.1, 1.98), m["wood"], 0.015, 2)); P.append(box("frame_r", (0.1, 0.12, 2.1), (2.3, -Dp / 2 + 0.1, 1.98), m["wood"], 0.015, 2))
    cols = [m["bg"], m["ba"], m["bc"], m["br"], m["ba"], m["bg"]]
    for si, sz in enumerate((1.28, 1.7, 2.1)):
        P.append(box("shelf", (4.5, 0.3, 0.035), (0, -Dp / 2 + 0.2, sz), m["wood2"], 0.008, 2))
        x = -2.12
        while x < 2.12:
            h = rnd.choice((0.26, 0.3, 0.34, 0.24)); r = rnd.choice((0.04, 0.045, 0.05)); bottle(P, x, -Dp / 2 + 0.2 + rnd.uniform(-0.03, 0.03), sz + 0.018, h, r, rnd.choice(cols), m["lab"] if rnd.random() < 0.45 else None); x += r * 2 + rnd.uniform(0.02, 0.07)
    # a glass-fronted tall cabinet at each end, bottles on its shelves
    for sx in (-1, 1):
        cx = sx * 2.85
        P.append(box("cab", (1.1, Dp - 0.1, 2.3), (cx, -0.04, 2.13), m["wood"], 0.02, 3))
        P.append(box("cabin", (0.86, 0.1, 2.05), (cx, 0.22, 2.12), m["mirror"], 0.0, 1))
        for k, sz in enumerate((1.3, 1.7, 2.1, 2.5)):
            P.append(box("cshelf", (0.9, 0.26, 0.03), (cx, 0.16, sz), m["wood2"], 0.005, 1))
            x = cx - 0.38
            while x < cx + 0.38: h = rnd.choice((0.22, 0.26, 0.3)); bottle(P, x, 0.16, sz + 0.015, h, 0.04, rnd.choice(cols), m["lab"] if rnd.random() < 0.5 else None); x += 0.1
        P.append(box("cframe", (0.07, 0.08, 2.3), (cx - 0.5, 0.28, 2.13), m["wood2"], 0.012, 2)); P.append(box("cframe", (0.07, 0.08, 2.3), (cx + 0.5, 0.28, 2.13), m["wood2"], 0.012, 2))
        P.append(box("cornice", (1.28, 0.5, 0.14), (cx, 0.0, 3.32), m["wood2"], 0.02, 3)); P.append(box("cornice2", (1.18, 0.44, 0.08), (cx, 0.0, 3.42), m["wood"], 0.015, 2))
        for k in range(5): P.append(sph("fin", 0.04, (cx - 0.5 + k * 0.25, 0.26, 3.5), m["wood2"], seg=8))
    # the arch: a wooden ellipse band with a stained-glass band inside it
    CZ, RX, RZ, N = 2.2, 2.25, 0.72, 22
    gl = [m["gy"], m["gw"], m["gg"], m["gw"], m["gy"], m["gp"]]
    for i in range(N):
        t0, t1 = math.pi * i / N, math.pi * (i + 1) / N
        for (rr, th, dp, mm, push) in ((1.0, 0.2, 0.62, m["wood2"], 0.0), (0.84, 0.17, 0.07, gl[i % len(gl)], 0.0)):
            a0 = (RX * rr * math.cos(t0), CZ + RZ * rr * math.sin(t0)); a1 = (RX * rr * math.cos(t1), CZ + RZ * rr * math.sin(t1))
            mx, mz = (a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2; ln = math.hypot(a1[0] - a0[0], a1[1] - a0[1]); ang = -math.atan2(a1[1] - a0[1], a1[0] - a0[0])
            P.append(box("arch", (ln * 1.04, dp, th), (mx, 0.1 + (0.0 if mm is m["wood2"] else 0.0), mz), mm, 0.006 if mm is m["wood2"] else 0.0, 1, rot=(0, ang, 0)))
            if mm is not m["wood2"]: P.append(box("lead", (0.012, 0.08, th + 0.02), (mx, 0.1, mz), m["lead"], 0.0, 1, rot=(0, ang, 0)))
    # the carved posts the arch springs from, scrolls on top
    for sx in (-1, 1):
        P.append(box("post", (0.22, 0.4, 1.9), (sx * 2.25, 0.05, 1.95), m["wood2"], 0.025, 3))
        for k in range(4): P.append(cyl("flute", 0.025, 1.6, (sx * 2.25 + (k - 1.5) * 0.045, 0.27, 1.95), m["wood"], verts=8))
        P.append(sph("scroll", 0.15, (sx * 2.25 + sx * 0.08, 0.12, 2.95), m["wood2"], (1, 0.7, 1.1), 14)); P.append(torus("curl", 0.12, 0.035, (sx * 2.25 + sx * 0.22, 0.16, 2.78), m["wood2"], rot=(math.pi / 2, 0, 0), ms=16, mi=6))
    # the crest: carved curls, a cresting finial, and the round clock
    P.append(box("crestbase", (1.5, 0.5, 0.16), (0, 0.1, CZ + RZ + 0.08), m["wood2"], 0.025, 3))
    for k, (dx, dz, rr) in enumerate(((-0.62, 0.2, 0.15), (0.62, 0.2, 0.15), (-0.42, 0.34, 0.12), (0.42, 0.34, 0.12), (-0.85, 0.12, 0.1), (0.85, 0.12, 0.1))):
        P.append(torus("curl", rr, 0.035, (dx, 0.22, CZ + RZ + dz), m["wood2"], rot=(math.pi / 2, 0, 0), ms=16, mi=6))
    P.append(cyl("clockrim", 0.3, 0.12, (0, 0.2, CZ + RZ + 0.5), m["brass"], rot=(math.pi / 2, 0, 0), verts=28)); P.append(cyl("clockface", 0.26, 0.14, (0, 0.2, CZ + RZ + 0.5), m["face"], rot=(math.pi / 2, 0, 0), verts=28))
    for k in range(12):
        a = k / 12 * math.tau; P.append(box("tick", (0.014, 0.02, 0.04), (math.sin(a) * 0.22, 0.28, CZ + RZ + 0.5 + math.cos(a) * 0.22), m["dark"], 0, 1, rot=(0, -a, 0)))
    P.append(box("hand1", (0.016, 0.02, 0.2), (0.04, 0.285, CZ + RZ + 0.58), m["dark"], 0, 1, rot=(0, -0.3, 0))); P.append(box("hand2", (0.012, 0.02, 0.15), (-0.05, 0.288, CZ + RZ + 0.47), m["dark"], 0, 1, rot=(0, 1.9, 0)))
    P.append(cyl("fin", 0.05, 0.2, (0, 0.2, CZ + RZ + 0.9), m["wood2"], verts=10, r2=0.012)); P.append(sph("finb", 0.07, (0, 0.2, CZ + RZ + 0.84), m["brass"], seg=10))
    # a few things on the counter shelf: a candle, tin boxes, jars
    for k in range(5): P.append(cyl("jar", 0.06, 0.16, (-1.7 + k * 0.28, 0.0, 1.085), m["bc"], verts=10)); P.append(cyl("jarlid", 0.062, 0.03, (-1.7 + k * 0.28, 0.0, 1.18), m["brass"], verts=10))
    P.append(cyl("candle", 0.04, 0.2, (0.9, 0.05, 1.12), m["cream"], verts=10)); P.append(box("tin", (0.22, 0.14, 0.12), (1.3, 0.0, 1.05), m["red"], 0.01, 2))
    ob = join_export("liq_backbar", P); preview("backbar", ob, 20, 1.0, 0.1); return ob

# --------------------------------------------------------------------- the bar: a long panelled counter with a brass foot rail and a lighter bar top. 6.4 long (x), 0.8 deep, top at 1.1. Front +Y.
def bar():
    m = M(); P = []; L, Dp, H = 6.4, 0.8, 1.1
    P.append(box("body", (L, Dp - 0.1, H - 0.06), (0, -0.04, (H - 0.06) / 2 + 0.0), m["wood"], 0.02, 3))
    P.append(box("kick", (L - 0.04, Dp - 0.05, 0.14), (0, 0.0, 0.07), m["woodd"], 0.01, 2))
    P.append(box("top", (L + 0.1, Dp + 0.2, 0.07), (0, 0.06, H - 0.035), m["wood2"], 0.025, 3))                    # the bar top, overhanging the front
    P.append(box("lip", (L + 0.1, 0.05, 0.1), (0, Dp / 2 + 0.17, H - 0.1), m["wood"], 0.02, 2))
    P.append(box("moulding", (L, 0.1, 0.08), (0, Dp / 2 - 0.04, H - 0.14), m["wood2"], 0.02, 2))
    n = 14
    for i in range(n):
        x = -L / 2 + 0.25 + i * (L - 0.5) / (n - 1)
        P.append(box("pil", (0.1, 0.05, 0.78), (x - (L - 0.5) / (n - 1) / 2, Dp / 2 - 0.0, 0.54), m["wood2"], 0.012, 2)) if i else None
        P.append(box("pan", ((L - 0.5) / (n - 1) - 0.14, 0.04, 0.58), (x, Dp / 2 - 0.01, 0.55), m["woodd"], 0.012, 2))
        P.append(box("panin", ((L - 0.5) / (n - 1) - 0.26, 0.05, 0.42), (x, Dp / 2 + 0.01, 0.55), m["wood"], 0.012, 2))
    P.append(cyl("rail", 0.028, L - 0.2, (0, Dp / 2 + 0.28, 0.2), m["brass"], rot=(0, math.pi / 2, 0), verts=14))                    # the brass foot rail
    for k in range(6):
        x = -L / 2 + 0.3 + k * (L - 0.6) / 5; P.append(cyl("brk", 0.015, 0.3, (x, Dp / 2 + 0.14, 0.2), m["brass"], rot=(math.pi / 2, 0, 0), verts=8))
    P.append(box("gutter", (L - 0.1, 0.1, 0.02), (0, Dp / 2 + 0.28, 0.02), m["woodd"], 0.004, 1))
    # on the bar top, behind the pickup spot: a bell, a tissue box, a plate of snacks, a pair of glasses
    P.append(box("tissues", (0.2, 0.12, 0.09), (-2.9, 0.05, H + 0.045), m["lab"], 0.012, 2))
    P.append(cyl("plate", 0.17, 0.02, (2.2, 0.1, H + 0.01), m["face"], verts=18)); P.append(sph("snack", 0.07, (2.2, 0.1, H + 0.07), m["ba"], (1.2, 1, 0.6), 10))
    for k in range(3): P.append(cyl("glass", 0.04, 0.12, (1.2 + k * 0.12, 0.0, H + 0.06), m["bc"], verts=10, r2=0.03))
    ob = join_export("liq_bar", P); preview("bar", ob, 25, 1.0, 0.15); return ob

# --------------------------------------------------------------------- a bentwood bar stool: splayed legs, two rings, a round seat, a hooped back. 0.42 wide, 0.75 seat. Front +Y.
def stool():
    m = M(); P = []; sh = 0.78
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4; x, y = math.cos(a) * 0.17, math.sin(a) * 0.17; ox, oy = math.cos(a) * 0.25, math.sin(a) * 0.25
        P.append(cyl("leg", 0.02, sh, ((x + ox) / 2, (y + oy) / 2, sh / 2), m["wood"], rot=(math.atan2(oy - y, 1) * 0 + (oy - y) * 0.9 * -1 / 1.0 * 0, 0, 0), verts=8))
    P.clear()
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4; top = Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, sh - 0.04)); bot = Vector((math.cos(a) * 0.23, math.sin(a) * 0.23, 0.0))
        mid = (top + bot) / 2; d = top - bot; ln = d.length
        o = cyl("leg", 0.02, ln, mid, m["wood"], verts=8); o.rotation_mode = "QUATERNION"; o.rotation_quaternion = d.to_track_quat("Z", "Y"); P.append(o)
    for z, R in ((0.26, 0.2), (0.5, 0.18)): P.append(torus("ring", R, 0.013, (0, 0, z), m["wood"], ms=20, mi=6))
    P.append(cyl("seat", 0.2, 0.05, (0, 0, sh), m["seat"], verts=22)); P.append(cyl("seatrim", 0.205, 0.02, (0, 0, sh - 0.025), m["wood"], verts=22))
    # the back: two bent uprights and a hoop rail with a slat between
    for sx in (-1, 1): P.append(box("up", (0.025, 0.025, 0.4), (sx * 0.14, -0.17, sh + 0.2), m["wood"], 0.008, 2, rot=(0.12, 0, 0)))
    P.append(box("rail", (0.34, 0.03, 0.06), (0, -0.2, sh + 0.38), m["wood"], 0.012, 2)); P.append(box("slat", (0.3, 0.02, 0.05), (0, -0.19, sh + 0.24), m["wood2"], 0.008, 2))
    for k in range(3): P.append(cyl("spindle", 0.01, 0.16, (-0.09 + k * 0.09, -0.19, sh + 0.31), m["wood"], verts=6))
    ob = join_export("liq_stool", P); preview("stool", ob, 35, 2.2, 0.3); return ob

# --------------------------------------------------------------------- a bentwood tavern chair: 0.42 wide, seat 0.46, back to 0.9. Front +Y.
def chair():
    m = M(); P = []; sh = 0.46
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = Vector((sx * 0.17, sy * 0.17, sh - 0.03)); bot = Vector((sx * 0.21, sy * 0.21, 0.0)); mid = (top + bot) / 2; d = top - bot
            o = cyl("leg", 0.018, d.length, mid, m["wood"], verts=8); o.rotation_mode = "QUATERNION"; o.rotation_quaternion = d.to_track_quat("Z", "Y"); P.append(o)
    for z in (0.18,): P.append(box("strH", (0.42, 0.02, 0.02), (0, 0.19, z), m["wood"], 0.004, 1)); P.append(box("strB", (0.42, 0.02, 0.02), (0, -0.19, z), m["wood"], 0.004, 1))
    P.append(cyl("seat", 0.215, 0.04, (0, 0, sh), m["seat"], verts=22)); P.append(cyl("seatrim", 0.22, 0.02, (0, 0, sh - 0.02), m["wood"], verts=22))
    for sx in (-1, 1): P.append(box("up", (0.022, 0.022, 0.46), (sx * 0.15, -0.19, sh + 0.23), m["wood"], 0.008, 2, rot=(0.1, 0, 0)))
    P.append(box("rail", (0.36, 0.026, 0.07), (0, -0.215, sh + 0.43), m["wood"], 0.012, 2)); P.append(box("rail2", (0.32, 0.02, 0.04), (0, -0.2, sh + 0.2), m["wood2"], 0.008, 2))
    for k in range(5): P.append(cyl("spindle", 0.008, 0.2, (-0.12 + k * 0.06, -0.207, sh + 0.33), m["wood"], verts=6))
    ob = join_export("liq_chair", P); preview("chair", ob, 35, 2.4, 0.3); return ob

# --------------------------------------------------------------------- a square wooden tavern table: 0.9 x 0.9, turned legs, an apron, a worn top. Front +Y.
def table():
    m = M(); P = []; S, H = 0.9, 0.76
    P.append(box("top", (S + 0.06, S + 0.06, 0.05), (0, 0, H - 0.025), m["wood2"], 0.015, 3))
    P.append(box("apron", (S - 0.12, S - 0.12, 0.09), (0, 0, H - 0.095), m["wood"], 0.01, 2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (S / 2 - 0.08), sy * (S / 2 - 0.08)
            P.append(cyl("leg", 0.035, H - 0.06, (x, y, (H - 0.06) / 2), m["wood"], verts=10)); P.append(sph("knob", 0.05, (x, y, 0.3), m["wood"], (1, 1, 0.9), 10)); P.append(cyl("foot", 0.045, 0.06, (x, y, 0.03), m["woodd"], verts=10))
    P.append(cyl("candle", 0.03, 0.1, (0.05, 0.05, H + 0.05), m["cream"], verts=8)); P.append(cyl("ash", 0.07, 0.015, (-0.2, -0.1, H + 0.008), m["steel"], verts=14))
    ob = join_export("liq_table", P); preview("table", ob, 35, 2.2, 0.3); return ob

# --------------------------------------------------------------------- a copper boiler and espresso urn for the end of the bar: a tall riveted drum with a dome, gauge and brass taps. Front +Y.
def boiler():
    m = M(); P = []
    P.append(cyl("drum", 0.3, 0.8, (0, 0, 0.55), m["copper"], verts=28)); P.append(sph("dome", 0.3, (0, 0, 0.95), m["copper"], (1, 1, 0.8), 20)); P.append(cyl("base", 0.34, 0.16, (0, 0, 0.08), m["woodd"], verts=28))
    for z in (0.3, 0.55, 0.8): P.append(torus("band", 0.305, 0.012, (0, 0, z), m["brass"], ms=28, mi=6))
    P.append(cyl("cap", 0.06, 0.1, (0, 0, 1.17), m["brass"], verts=12, r2=0.03)); P.append(cyl("gauge", 0.07, 0.04, (0.0, 0.31, 0.78), m["brass"], rot=(math.pi / 2, 0, 0), verts=20)); P.append(cyl("gfa", 0.055, 0.045, (0, 0.315, 0.78), m["face"], rot=(math.pi / 2, 0, 0), verts=20))
    for sx in (-1, 1):
        P.append(cyl("tap", 0.02, 0.16, (sx * 0.1, 0.34, 0.3), m["brass"], rot=(math.pi / 2, 0, 0), verts=8)); P.append(box("handle", (0.07, 0.015, 0.02), (sx * 0.1, 0.42, 0.3), m["brass"], 0.004, 1))
    P.append(box("tray", (0.5, 0.2, 0.025), (0, 0.32, 0.16), m["steel"], 0.006, 1))
    ob = join_export("liq_boiler", P); preview("boiler", ob, 30, 2.4, 0.2); return ob

for name in only:
    reset()
    {"backbar": backbar, "bar": bar, "stool": stool, "chair": chair, "table": table, "boiler": boiler}[name]()
