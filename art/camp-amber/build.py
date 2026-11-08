# Level 6.1 Camp Amber outpost: a sagging canvas ridge tent, a folding camp kitchen, a hand-painted sign frame, bedrolls, camp chairs, a lantern.
# Front is +Y in Blender (glTF -Z: the sim says forward "-z"); every model stands on z = 0, centred on x/y.
# Run: blender -b --factory-startup --python art/camp-amber/build.py -- tent kitchen sign bedroll chair lantern
import bpy, math, os, sys, random
from mathutils import Vector, Euler
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out"); os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["tent", "kitchen", "sign", "bedroll", "chair", "lantern"]
random.seed(7)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough=0.6, metal=0.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*col, 1); b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*col, 1); return m
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def bev(o, w, s=2):
    md = o.modifiers.new("b", "BEVEL"); md.width = w; md.segments = s; md.limit_method = "ANGLE"; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="b")
def box(name, size, loc, m, bevel=0.008, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.name = name; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    if bevel: bev(o, bevel)
    if any(rot): o.data.transform(Euler(rot, "XYZ").to_matrix().to_4x4())
    o.location = loc; o.data.materials.append(m); smooth(o); return o
def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=14, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name; o.data.materials.append(m); smooth(o); return o
def rod(name, a, b, r, m, verts=8):
    a, b = Vector(a), Vector(b); d = b - a; o = cyl(name, r, d.length, (a + b) / 2, m, verts=verts)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); return o
def torus(name, R, r, loc, m, rot=(0, 0, 0), ms=24, mi=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=ms, minor_segments=mi, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name; o.data.materials.append(m); smooth(o); return o
def lathe(name, prof, m, segs=24, loc=(0, 0, 0)):
    verts, faces = [], []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        for r, z in prof: verts.append((r * math.cos(a), r * math.sin(a), z))
    n = len(prof)
    for i in range(segs):
        j = (i + 1) % segs
        for k in range(n - 1): faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.location = loc; o.data.materials.append(m); smooth(o); return o
def sheet(name, fn, nu, nv, m, thick=0.012):
    verts = [fn(u / nu, v / nv) for v in range(nv + 1) for u in range(nu + 1)]
    faces = [(v * (nu + 1) + u, v * (nu + 1) + u + 1, (v + 1) * (nu + 1) + u + 1, (v + 1) * (nu + 1) + u) for v in range(nv) for u in range(nu)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    md = o.modifiers.new("s", "SOLIDIFY"); md.thickness = thick; md.offset = 0; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="s")
    o.data.materials.append(m); smooth(o); return o
def join_export(name, objs):
    bpy.context.view_layer.update(); bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    path = os.path.join(OUT, name + ".glb"); bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions)); return ob
def preview(name, ob, az=35, dist=1.7, el=0.45):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 700; sc.render.resolution_y = 500
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.5, 0.52, 0.55)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 35
    d = max(ob.dimensions.x, ob.dimensions.y, ob.dimensions.z); t = Vector((0, 0, ob.dimensions.z / 2)); a = math.radians(az)
    cam.location = t + Vector((math.sin(a) * d * dist, math.cos(a) * d * dist, d * el)); cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, "preview_%s.png" % name); bpy.ops.render.render(write_still=True)
def M():
    return dict(canvas=mat("canvas", (0.52, 0.36, 0.14), 0.95), canvas2=mat("canvasPatch", (0.42, 0.3, 0.12), 0.95), floor=mat("groundsheet", (0.12, 0.16, 0.1), 0.9),
        pole=mat("pole", (0.45, 0.45, 0.42), 0.4, 0.8), rope=mat("rope", (0.62, 0.55, 0.4), 0.95), wood=mat("wood", (0.33, 0.2, 0.1), 0.7), woodd=mat("woodDark", (0.16, 0.09, 0.05), 0.75),
        green=mat("stoveGreen", (0.07, 0.2, 0.09), 0.45, 0.3), steel=mat("steel", (0.4, 0.4, 0.4), 0.35, 0.9), blk=mat("black", (0.03, 0.03, 0.03), 0.6, 0.4),
        enamel=mat("enamelBlue", (0.08, 0.14, 0.3), 0.3), fleck=mat("enamelWhite", (0.8, 0.8, 0.75), 0.3), tabletop=mat("tableTop", (0.55, 0.52, 0.45), 0.6),
        red=mat("bedrollRed", (0.32, 0.05, 0.04), 0.9), plaid=mat("bedrollPlaid", (0.15, 0.2, 0.3), 0.9), strap=mat("strap", (0.1, 0.07, 0.04), 0.8),
        chairc=mat("chairCanvas", (0.1, 0.2, 0.12), 0.9), glass=mat("Glass", (1.0, 0.75, 0.4), 0.2, 0, 3.0), brass=mat("brass", (0.7, 0.5, 0.2), 0.35, 1.0), tin=mat("tin", (0.6, 0.6, 0.58), 0.4, 0.8))

def tent(m):
    L, W, H, E = 3.0, 2.5, 2.05, 0.4  # length (x), width (y), ridge height, wall height
    o = []
    def roof(side):
        def f(u, v):
            x = (u - 0.5) * L; y = side * v * W / 2; z = H - (H - E) * v
            sag = 0.07 * math.sin(math.pi * u) * math.sin(math.pi * v) + 0.015 * math.sin(u * 37 + v * 11)
            return (x, y * (1 + 0.02 * sag), z - sag)
        return sheet("roof%d" % side, f, 18, 8, m["canvas"])
    o += [roof(1), roof(-1)]
    for s in (1, -1):  # short side walls, a little slack
        o.append(sheet("wall%d" % s, lambda u, v, s=s: ((u - 0.5) * L, s * (W / 2 + 0.03 * math.sin(math.pi * u) * v), E * (1 - v) + 0.02 * math.sin(math.pi * u)), 12, 2, m["canvas"]))
    # back wall: a pentagon of canvas
    bk = [(-L / 2, -W / 2, 0), (-L / 2, W / 2, 0), (-L / 2, W / 2, E), (-L / 2, 0, H), (-L / 2, -W / 2, E)]
    me = bpy.data.meshes.new("back"); me.from_pydata(bk, [], [(0, 1, 2, 3, 4)]); ob = bpy.data.objects.new("back", me); bpy.context.collection.objects.link(ob)
    md = ob.modifiers.new("s", "SOLIDIFY"); md.thickness = 0.012; bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier="s"); ob.data.materials.append(m["canvas"]); o.append(ob)
    # front: door flaps rolled and tied back to each side, plus the gable triangle above the door
    for s in (1, -1):
        o.append(rod("roll%d" % s, (L / 2 + 0.03, s * W * 0.36, 0.05), (L / 2 + 0.03, s * 0.12, H - 0.18), 0.075, m["canvas2"], 10))
        o.append(torus("tie%d" % s, 0.085, 0.012, (L / 2 + 0.03, s * W * 0.27, 0.6), m["rope"], (0, math.radians(90), math.radians(90))))
    # a patch on the roof, the canvas mended once
    o.append(box("patch", (0.4, 0.32, 0.016), (-0.5, 0.62, H - (H - E) * 0.5 + 0.0), m["canvas2"], 0.003, (math.atan2(H - E, W / 2), 0, 0)))
    # poles: upright at each end, ridge pole along the top
    for x in (-L / 2 - 0.02, L / 2 + 0.06): o.append(rod("up", (x, 0, 0), (x, 0, H + 0.12), 0.022, m["pole"]))
    o.append(rod("ridge", (-L / 2 - 0.05, 0, H + 0.02), (L / 2 + 0.09, 0, H + 0.02), 0.02, m["pole"]))
    # guy ropes to stakes (indoors they're weighted with sandbags and bricks)
    for x in (-L / 2 - 0.02, L / 2 + 0.06):
        sx = x + (-0.9 if x < 0 else 0.9)
        o.append(rod("guy", (x, 0, H + 0.08), (sx, 0, 0.12), 0.006, m["rope"], 5))
        o.append(box("bag", (0.32, 0.2, 0.12), (sx, 0, 0.06), m["canvas2"], 0.04))
    for x in (-L / 2 + 0.3, 0, L / 2 - 0.3):
        for s in (1, -1):
            o.append(rod("guy2", (x, s * W / 2, E + 0.05), (x, s * (W / 2 + 0.6), 0.06), 0.005, m["rope"], 5))
            o.append(box("brick", (0.2, 0.1, 0.07), (x, s * (W / 2 + 0.62), 0.035), m["woodd"], 0.01))
    o.append(box("sheet", (L + 0.3, W + 0.2, 0.01), (0.1, 0, 0.005), m["floor"], 0.002))
    return o

def kitchen(m):
    o = []
    TW, TD, TH = 1.2, 0.6, 0.74
    o.append(box("top", (TW, TD, 0.03), (0, 0, TH - 0.015), m["tabletop"], 0.01))
    o.append(box("apron", (TW - 0.04, TD - 0.04, 0.05), (0, 0, TH - 0.055), m["steel"], 0.004))
    for sx in (-1, 1):  # folding X legs
        x = sx * (TW / 2 - 0.08)
        o.append(rod("legA", (x, -TD / 2 + 0.04, 0), (x, TD / 2 - 0.04, TH - 0.06), 0.013, m["steel"]))
        o.append(rod("legB", (x, TD / 2 - 0.04, 0), (x, -TD / 2 + 0.04, TH - 0.06), 0.013, m["steel"]))
    # a two-burner camp stove, lid up and wind wings out
    sz = TH
    o.append(box("stove", (0.56, 0.3, 0.09), (0.18, 0, sz + 0.045), m["green"], 0.012))
    o.append(box("lid", (0.56, 0.02, 0.3), (0.18, -0.16, sz + 0.24), m["green"], 0.008))
    for s in (1, -1): o.append(box("wing", (0.02, 0.3, 0.18), (0.18 + s * 0.29, -0.01, sz + 0.18), m["green"], 0.006, (0, 0, s * 0.35)))
    o.append(box("grate", (0.5, 0.26, 0.012), (0.18, 0, sz + 0.096), m["blk"], 0.002))
    for x in (0.05, 0.31): o.append(torus("burner", 0.05, 0.008, (x, 0, sz + 0.1), m["blk"]))
    o.append(cyl("tank", 0.05, 0.24, (0.56, 0.05, sz + 0.12), m["green"], verts=16))
    o.append(rod("hose", (0.56, 0.05, sz + 0.22), (0.46, 0.0, sz + 0.06), 0.008, m["blk"]))
    # the big blue enamel stew pot, flecked, with a ladle
    pz = sz + 0.105
    o.append(lathe("pot", [(0.0, 0), (0.15, 0.0), (0.17, 0.02), (0.175, 0.2), (0.185, 0.215), (0.17, 0.215), (0.162, 0.205), (0.155, 0.03), (0.0, 0.03)], m["enamel"], 28, (0.05, 0, pz)))
    o.append(torus("rim", 0.18, 0.006, (0.05, 0, pz + 0.215), m["fleck"], ms=28, mi=6))
    o.append(cyl("stew", 0.158, 0.01, (0.05, 0, pz + 0.17), m["woodd"], verts=24))
    for s in (1, -1): o.append(torus("handle", 0.035, 0.007, (0.05 + s * 0.18, 0, pz + 0.17), m["blk"], (math.radians(90), 0, 0)))
    o.append(rod("ladle", (0.0, 0.05, pz + 0.12), (-0.12, 0.13, pz + 0.42), 0.007, m["tin"]))
    # a kettle on the table, tin cups, a stack of bowls, a roll of paper towel
    o.append(lathe("kettle", [(0, 0), (0.08, 0), (0.09, 0.03), (0.085, 0.12), (0.05, 0.16), (0.02, 0.17), (0, 0.17)], m["tin"], 18, (-0.4, 0.08, TH)))
    o.append(rod("spout", (-0.33, 0.08, TH + 0.06), (-0.27, 0.08, TH + 0.14), 0.012, m["tin"]))
    o.append(torus("khandle", 0.06, 0.007, (-0.4, 0.08, TH + 0.17), m["blk"], (math.radians(90), 0, 0)))
    for i, (x, y) in enumerate(((-0.22, -0.16), (-0.12, -0.2), (-0.5, -0.16))):
        o.append(lathe("cup%d" % i, [(0, 0), (0.035, 0), (0.04, 0.08), (0.036, 0.08), (0.03, 0.005), (0, 0.005)], m["enamel"] if i % 2 else m["fleck"], 14, (x, y, TH)))
    for k in range(4): o.append(lathe("bowl%d" % k, [(0, 0), (0.05, 0), (0.08, 0.04), (0.076, 0.04), (0.046, 0.005), (0, 0.005)], m["fleck"], 16, (-0.5, 0.14, TH + k * 0.012)))
    o.append(cyl("towel", 0.055, 0.24, (-0.25, 0.2, TH + 0.12), m["fleck"], (0, math.radians(90), 0), 16))
    # a water jug under the table
    o.append(box("jug", (0.26, 0.18, 0.3), (-0.3, 0.05, 0.15), m["enamel"], 0.04))
    o.append(cyl("cap", 0.03, 0.04, (-0.3, 0.05, 0.32), m["fleck"]))
    return o

def sign(m):
    o = []
    for s in (1, -1): o.append(box("post", (0.09, 0.09, 2.95), (s * 1.0, 0, 1.475), m["woodd"], 0.012))
    for k in range(3):  # three planks, a gap between
        z = 2.05 + k * 0.3
        o.append(box("plank%d" % k, (1.9, 0.035, 0.28), (0, -0.06, z + random.uniform(-0.01, 0.01)), m["wood"], 0.01, (0, random.uniform(-0.015, 0.015), 0)))
        for s in (1, -1): o.append(cyl("nail", 0.009, 0.01, (s * 0.92, -0.08, z), m["blk"], (math.radians(90), 0, 0), 6))
    o.append(box("cross", (2.1, 0.06, 0.07), (0, 0.0, 2.95), m["woodd"], 0.01))
    o.append(rod("lamparm", (0.95, -0.02, 2.95), (0.95, -0.35, 3.05), 0.012, m["blk"]))
    o.append(lathe("shade", [(0.0, 0.0), (0.03, 0.0), (0.12, -0.07), (0.115, -0.075), (0.0, -0.005)], m["green"], 16, (0.95, -0.35, 3.05)))
    return o

def bedroll(m):
    o = [cyl("roll", 0.13, 0.75, (0, 0, 0.13), m["red"], (0, math.radians(90), 0), 20)]
    for s in (1, -1): o.append(cyl("end", 0.11, 0.02, (s * 0.376, 0, 0.13), m["plaid"], (0, math.radians(90), 0), 20))
    for x in (-0.22, 0.22): o.append(torus("strap", 0.135, 0.012, (x, 0, 0.13), m["strap"], (0, math.radians(90), 0), 20, 5))
    # unrolled one beside it, a pillow made of a folded jacket
    o.append(sheet("mat", lambda u, v: ((u - 0.5) * 0.7, 0.35 + v * 1.8, 0.012 + 0.01 * math.sin(u * 9 + v * 13)), 6, 12, m["plaid"], 0.03))
    o.append(box("pillow", (0.5, 0.3, 0.1), (0, 2.0, 0.07), m["red"], 0.04))
    return o

def chair(m):
    o = []
    for s in (1, -1):
        o.append(rod("legX1", (s * 0.24, -0.22, 0), (s * 0.24, 0.22, 0.44), 0.012, m["steel"]))
        o.append(rod("legX2", (s * 0.24, 0.22, 0), (s * 0.24, -0.22, 0.44), 0.012, m["steel"]))
        o.append(rod("arm", (s * 0.27, 0.22, 0.6), (s * 0.27, -0.2, 0.6), 0.012, m["steel"]))
        o.append(rod("armUp", (s * 0.27, -0.2, 0.44), (s * 0.27, -0.2, 0.86), 0.012, m["steel"]))
    o.append(sheet("seat", lambda u, v: ((u - 0.5) * 0.5, (v - 0.5) * 0.42, 0.44 - 0.06 * math.sin(math.pi * u) * math.sin(math.pi * v)), 8, 6, m["chairc"], 0.008))
    o.append(sheet("back", lambda u, v: ((u - 0.5) * 0.52, -0.2 - 0.04 * math.sin(math.pi * u), 0.52 + v * 0.34), 8, 4, m["chairc"], 0.008))
    o.append(lathe("cupholder", [(0, 0), (0.04, 0), (0.042, 0.06), (0.038, 0.06), (0.036, 0.004), (0, 0.004)], m["chairc"], 12, (0.31, 0.12, 0.54)))
    return o

def lantern(m):
    o = [lathe("base", [(0, 0), (0.07, 0), (0.075, 0.05), (0.05, 0.07), (0, 0.07)], m["green"], 18)]
    o.append(lathe("globe", [(0.0, 0.07), (0.045, 0.07), (0.055, 0.12), (0.045, 0.18), (0.0, 0.18)], m["glass"], 18))
    for a in range(4): o.append(rod("guard", (0.058 * math.cos(a * 1.57), 0.058 * math.sin(a * 1.57), 0.07), (0.058 * math.cos(a * 1.57), 0.058 * math.sin(a * 1.57), 0.19), 0.003, m["blk"], 5))
    o.append(lathe("cap", [(0, 0.19), (0.065, 0.19), (0.04, 0.23), (0, 0.24)], m["green"], 18))
    o.append(torus("bail", 0.06, 0.004, (0, 0, 0.25), m["blk"], (math.radians(90), 0, 0), 16, 5))
    return o

for name in only:
    reset(); m = M(); objs = globals()[name](m); ob = join_export(name, objs); preview(name, ob)
