# Level 3 lore set pieces, built in Blender (headless) and exported as glb.
#   blender -b --factory-startup --python-exit-code 1 --python art/level3/lore.py -- [purp moths pipe kegs boiler drum]
# Metres; origin at the base, on the wall plane for wall pieces (wall = Blender y 0, the room is +Y = glTF -Z, up +Z).
import bpy, bmesh, math, os, sys, random
from mathutils import Vector
MATS = {}
OUT = "/workspace/lore"; os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["purp", "moths", "pipe", "kegs", "boiler", "drum"]
R = random.Random(56)

def reset(): MATS.clear(); bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, es=2.0, img=None):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    if img:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(img)
        m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    MATS[name] = m; return m
def fin(ob, m, smooth=True):
    ob.data.materials.clear(); ob.data.materials.append(m)
    for p in ob.data.polygons: p.use_smooth = smooth
    return ob
def act(): return bpy.context.active_object
def box(loc, size, m, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); ob = act(); ob.scale = size
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bevel:
        md = ob.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2; bpy.ops.object.modifier_apply(modifier="b")
    return fin(ob, m, False)
def cyl(loc, r, depth, m, axis="Z", verts=20, r2=None, rot=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc)
    ob = act()
    if axis == "X": ob.rotation_euler = (0, math.radians(90), 0)
    if axis == "Y": ob.rotation_euler = (math.radians(90), 0, 0)
    if rot: ob.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True); return fin(ob, m)
def torus(loc, R0, r, m, axis="Z", maj=24, mn=6):
    bpy.ops.mesh.primitive_torus_add(location=loc, major_radius=R0, minor_radius=r, major_segments=maj, minor_segments=mn); ob = act()
    if axis == "Y": ob.rotation_euler = (math.radians(90), 0, 0)
    if axis == "X": ob.rotation_euler = (0, math.radians(90), 0)
    bpy.ops.object.transform_apply(rotation=True); return fin(ob, m)
def sph(loc, scale, m, seg=14, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc); ob = act(); ob.scale = scale
    bpy.ops.object.transform_apply(scale=True); return fin(ob, m)
def tube(pts, r, m, res=2, taper=None, poly=False):
    cu = bpy.data.curves.new("t", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = res; cu.resolution_u = 6
    cu.use_fill_caps = True
    if poly:
        sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts): p.co = (*c[:3], 1); p.radius = c[3] if len(c) > 3 else 1
    else:
        sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
        for p, c in zip(sp.bezier_points, pts):
            p.co = c[:3]; p.handle_left_type = p.handle_right_type = "AUTO"; p.radius = c[3] if len(c) > 3 else 1
    ob = bpy.data.objects.new("t", cu); bpy.context.collection.objects.link(ob)
    for o in bpy.context.selected_objects: o.select_set(False)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target="MESH")
    return fin(act(), m)
def mesh(name, verts, faces, m, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); return fin(ob, m, smooth)
def blob(elems, m, res=0.035, cut=None):
    mb = bpy.data.metaballs.new("mb"); mb.resolution = res; mb.render_resolution = res; mb.threshold = 0.6
    for kind, co, rad, extra in elems:
        e = mb.elements.new(type=kind); e.radius = rad
        if co is not None: e.co = co
        if kind == "CAPSULE":
            a, b = Vector(extra[0]), Vector(extra[1]); e.co = (a + b) / 2; e.size_x = (b - a).length / 2
            e.rotation = Vector((1, 0, 0)).rotation_difference((b - a).normalized())
        if kind == "ELLIPSOID": e.size_x, e.size_y, e.size_z = extra
    ob = bpy.data.objects.new("mb", mb); bpy.context.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); o2 = bpy.data.objects.new("body", me); bpy.context.collection.objects.link(o2)
    if cut is not None:
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, cut, 0), plane_no=(0, 1, 0), clear_inner=True)
        bm.to_mesh(me); bm.free()
    md = o2.modifiers.new("d", "DECIMATE"); md.ratio = 0.3
    for o in bpy.context.selected_objects: o.select_set(False)
    bpy.context.view_layer.objects.active = o2; o2.select_set(True); bpy.ops.object.modifier_apply(modifier="d")
    return fin(o2, m)

def export(name):
    for o in bpy.data.objects: o.select_set(o.type == "MESH")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons)
    print(f"EXPORT {name} tris={tris}")
    render(name)
def render(name):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 520; sc.render.resolution_y = 520
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.12, 0.11, 0.1, 1)
    obs = [o for o in bpy.data.objects if o.type == "MESH"]
    lo = Vector((min(v[i] for o in obs for v in o.bound_box) for i in range(3))); hi = Vector((max(v[i] for o in obs for v in o.bound_box) for i in range(3)))
    c = (lo + hi) / 2; sz = max((hi - lo).length, 0.5)
    cam_d = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cam_d); bpy.context.collection.objects.link(cam)
    cam.location = c + Vector((sz * 0.55, sz * 1.25, sz * 0.35)); cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); cam_d.lens = 40; sc.camera = cam
    L = bpy.data.lights.new("l", "AREA"); L.energy = 120 * sz * sz; L.size = sz; lo_ = bpy.data.objects.new("l", L); bpy.context.collection.objects.link(lo_)
    lo_.location = cam.location + Vector((-sz * 0.5, 0, sz * 0.6)); lo_.rotation_euler = (c - lo_.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{OUT}/{name}.png"; bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- purpified: a dead body sunk into the brick, the wall stained violet
def purp():
    reset()
    skin = mat("body", (0.012, 0.01, 0.014), 0.8, emit=(0.05, 0.0, 0.09), es=0.12)
    stain = mat("stain", (0.07, 0.015, 0.1), 0.6, emit=(0.18, 0.02, 0.35), es=0.8)
    vein = mat("vein", (0.5, 0.15, 0.9), 0.4, emit=(0.55, 0.12, 1.0), es=3.5)
    brick = mat("pbrick", (0.32, 0.08, 0.45), 0.5, emit=(0.35, 0.05, 0.6), es=1.6)
    E = [("ELLIPSOID", (0, 0.02, 1.0), 0.2, (1.0, 0.75, 0.8)),  # pelvis
         ("CAPSULE", None, 0.16, ((0, 0.02, 1.05), (0.02, 0.07, 1.42))),  # torso
         ("ELLIPSOID", (0.01, 0.06, 1.42), 0.21, (1.15, 0.7, 0.8)),  # chest, shoulders
         ("CAPSULE", None, 0.06, ((0.02, 0.08, 1.52), (0.06, 0.15, 1.6))),  # neck lolling forward
         ("ELLIPSOID", (0.1, 0.2, 1.62), 0.12, (0.85, 1.0, 1.05)),  # head, dropped to the side, no face
         ("CAPSULE", None, 0.06, ((0.2, 0.06, 1.45), (0.27, 0.15, 1.16))), ("CAPSULE", None, 0.05, ((0.27, 0.15, 1.16), (0.3, 0.2, 0.88))),  # right arm hangs
         ("ELLIPSOID", (0.31, 0.22, 0.83), 0.06, (0.8, 0.6, 1.2)),  # hand
         ("CAPSULE", None, 0.06, ((-0.2, 0.0, 1.45), (-0.28, -0.04, 1.2))),  # left arm, sunk
         ("CAPSULE", None, 0.085, ((0.1, 0.03, 0.95), (0.13, 0.17, 0.55))), ("CAPSULE", None, 0.065, ((0.13, 0.17, 0.55), (0.15, 0.13, 0.14))),  # right leg
         ("ELLIPSOID", (0.16, 0.2, 0.08), 0.07, (0.8, 1.6, 0.6)),  # foot
         ("CAPSULE", None, 0.08, ((-0.1, 0.0, 0.95), (-0.13, 0.06, 0.55))), ("CAPSULE", None, 0.06, ((-0.13, 0.06, 0.55), (-0.15, -0.02, 0.2)))]
    blob(E, skin, 0.03, cut=-0.03)
    # the stain: an irregular violet blot centred on the chest, drawn just off the brick
    n = 40; v = [(0, 0.006, 1.25)]
    for i in range(n):
        a = i / n * 6.2832; r = 1.0 + 0.35 * math.sin(a * 3 + 1) + 0.2 * math.sin(a * 7) + R.uniform(-0.12, 0.12)
        v.append((math.cos(a) * r * 1.1, 0.006, max(0.02, 1.25 + math.sin(a) * r)))
    mesh("stain", v, [(0, i + 1, (i + 1) % n + 1) for i in range(n)], stain)
    # veins crawling out of the body over the brick
    for k in range(14):
        a = k / 14 * 6.2832 + R.uniform(-0.2, 0.2); p = Vector((math.cos(a) * 0.2, 0.012, 1.25 + math.sin(a) * 0.35)); pts = []
        for s in range(7):
            pts.append((p.x, 0.012, max(0.02, p.z), 1.0 - s / 8)); a += R.uniform(-0.6, 0.6); p += Vector((math.cos(a), 0, math.sin(a))) * R.uniform(0.1, 0.2)
        tube(pts, 0.012, vein, res=1)
    # purpified bricks: whole bricks gone violet, proud of the course
    for k in range(22):
        a = R.uniform(0, 6.2832); r = R.uniform(0.35, 1.1); x = round(math.cos(a) * r * 1.1 / 0.23) * 0.23; z = 0.04 + round((1.25 + math.sin(a) * r) / 0.075) * 0.075
        if z > 0.05: box((x + (0.115 if int(z / 0.075) % 2 else 0), 0.012, z), (0.215, 0.02, 0.064), brick, 0.004)
    export("purp")

# ---------------------------------------------------------------- moth wall: hundreds of still moths on the brick
def moths():
    reset()
    ms = [mat("m0", (0.32, 0.29, 0.25), 0.95), mat("m1", (0.22, 0.18, 0.14), 0.95), mat("m2", (0.45, 0.41, 0.34), 0.95), mat("m3", (0.12, 0.1, 0.09), 0.95)]
    V = [[], [], [], []]; F = [[], [], [], []]
    for i in range(420):
        x = R.gauss(0, 0.75); z = 1.5 + R.gauss(0, 0.55)
        if abs(x) > 1.55 or z < 0.25 or z > 2.85: continue
        k = R.randrange(4); a = R.uniform(-0.6, 0.6) + (math.pi if R.random() < 0.1 else 0); L = R.uniform(0.022, 0.034); W = L * R.uniform(1.1, 1.5)
        c, s = math.cos(a), math.sin(a)
        def P(u, w, y): return (x + u * c - w * s, y, z + u * s + w * c)
        b = len(V[k]); V[k] += [P(0, L * 0.5, 0.014), P(0, -L * 0.6, 0.012), P(-W, L * 0.15, 0.004), P(-W * 0.7, -L * 0.55, 0.004), P(W, L * 0.15, 0.004), P(W * 0.7, -L * 0.55, 0.004)]
        F[k] += [(b, b + 2, b + 3), (b, b + 3, b + 1), (b, b + 1, b + 5), (b, b + 5, b + 4)]
    for k in range(4): mesh(f"moth{k}", V[k], F[k], ms[k])
    export("moths")

# ---------------------------------------------------------------- a wall pipe leaking black sludge into a glossy pool
def sludge_mat(): return mat("sludge", (0.008, 0.007, 0.01), 0.04, 0.25)
def pipe_run(x, ztop, out, zend, steel, goo, pour=None):
    cyl((x, 0.03, ztop), 0.12, 0.05, steel, "Y")  # wall flange
    tube([(x, 0, ztop), (x, out * 0.7, ztop), (x, out, ztop - 0.12), (x, out, zend)], 0.065, steel, res=3, poly=False)
    torus((x, out, zend + 0.02), 0.075, 0.02, steel); torus((x, out, ztop - 0.5), 0.07, 0.016, steel)
    box((x, out * 0.5, ztop + 0.08), (0.04, out * 0.4, 0.03), steel)  # hanger strap
    tube([(x, out + 0.06, ztop - 0.2, 1), (x, out + 0.068, (ztop + zend) / 2, 1.3), (x, out + 0.06, zend + 0.02, 1.6)], 0.012, goo, res=2)  # the run down the pipe face
    if pour is None:
        sph((x, out, zend - 0.05), (0.035, 0.035, 0.07), goo); sph((x, out, zend - 0.2), (0.02, 0.02, 0.035), goo)
    else:
        tube([(x, out, zend, 1), (x, out + 0.01, (zend + pour) / 2, 0.7), (x, out + 0.015, pour, 0.9)], 0.028, goo, res=2)
def pool(cx, cy, r, goo):
    n = 28; v = [(cx, cy, 0.004)]
    for i in range(n):
        a = i / n * 6.2832; rr = r * (1 + 0.25 * math.sin(a * 3 + 2) + 0.12 * math.sin(a * 5))
        v.append((cx + math.cos(a) * rr * 1.3, max(0.005, cy + math.sin(a) * rr), 0.004))
    mesh("pool", v, [(0, i + 1, (i + 1) % n + 1) for i in range(n)], goo, True)
    sph((cx + 0.1, cy - 0.05, 0.0), (r * 0.5, r * 0.4, 0.025), goo, 16, 6)
def pipe():
    reset()
    steel = mat("steel", (0.32, 0.31, 0.29), 0.55, 0.6); goo = sludge_mat()
    pipe_run(0, 2.45, 0.24, 1.15, steel, goo)
    box((0.0, 0.24, 1.1), (0.16, 0.16, 0.02), steel, 0.005)  # broken valve body
    tube([(0, 0.18, 1.09), (0.12, 0.25, 0.6), (0.06, 0.22, 0.02)], 0.01, goo)  # streak to the floor
    pool(0.05, 0.25, 0.42, goo)
    export("pipe")

# ---------------------------------------------------------------- rustic corner: plank walls, four kegs, a pipe pouring sludge in
def kegs():
    reset()
    wood = mat("plank", (0.3, 0.17, 0.08), 0.85); dark = mat("plankdark", (0.16, 0.09, 0.04), 0.9); iron = mat("iron", (0.12, 0.11, 0.1), 0.5, 0.7)
    steel = mat("steel", (0.32, 0.31, 0.29), 0.55, 0.6); goo = sludge_mat()
    for i in range(9): box((0.1 + 0.09 + i * 0.178, 0.012, 1.2), (0.17, 0.02, 2.4), wood if i % 2 else dark, 0.004)  # back wall planks
    for i in range(8): box((1.688, 0.1 + 0.09 + i * 0.178, 1.2), (0.02, 0.17, 2.4), dark if i % 2 else wood, 0.004)  # side wall planks
    box((0.95, 0.03, 2.38), (1.7, 0.05, 0.08), dark, 0.01); box((1.66, 0.75, 2.38), (0.05, 1.5, 0.08), dark, 0.01)  # rails
    for i in range(8): box((1.0, 0.1 + 0.09 + i * 0.178, 0.008), (1.4, 0.17, 0.016), wood if i % 2 else dark, 0.003)  # floor boards
    for (kx, ky) in [(0.85, 0.4), (1.35, 0.4), (0.85, 0.9), (1.35, 0.9)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.23, depth=0.62, location=(kx, ky, 0.32)); k = act()
        for vv in k.data.vertices: vv.co.x *= 1 + 0.12 * math.cos(vv.co.z / 0.31 * 1.57) - 0.12; vv.co.y *= 1 + 0.12 * math.cos(vv.co.z / 0.31 * 1.57) - 0.12
        fin(k, wood, False)
        for hz in (0.06, 0.24, 0.42, 0.58): torus((kx, ky, hz), 0.23 * (1.0 + 0.12 * math.cos((hz - 0.32) / 0.31 * 1.57) - 0.12) + 0.004, 0.01, iron, maj=18, mn=4)
        cyl((kx, ky, 0.6), 0.19, 0.01, goo, verts=16)
    # a wooden splitter over the four kegs, fed by the pipe
    box((1.1, 0.65, 1.0), (0.5, 0.5, 0.06), dark, 0.01); box((1.1, 0.65, 1.04), (0.4, 0.4, 0.02), goo)
    for (kx, ky) in [(0.85, 0.4), (1.35, 0.4), (0.85, 0.9), (1.35, 0.9)]:
        sx, sy = 1.1 + (kx - 1.1) * 0.8, 0.65 + (ky - 0.65) * 0.8
        cyl((sx, sy, 0.93), 0.025, 0.1, dark, verts=8); tube([(sx, sy, 0.9, 1), (kx * 0.5 + sx * 0.5, ky * 0.5 + sy * 0.5, 0.75, 0.6), (kx, ky, 0.61, 0.9)], 0.012, goo, res=1)
    for (x, y) in [(0.88, 0.43), (1.32, 0.87)]: box((x, y, 0.75), (0.04, 0.04, 0.5), dark)  # posts under the splitter
    pipe_run(1.1, 2.5, 0.65, 1.45, steel, goo, pour=1.05)
    pool(0.6, 1.2, 0.25, goo)
    export("kegs")

# ---------------------------------------------------------------- a riveted boiler with a glowing firebox
def boiler():
    reset()
    shell = mat("boilershell", (0.18, 0.17, 0.15), 0.6, 0.6); band = mat("band", (0.1, 0.09, 0.08), 0.5, 0.7); rust = mat("rust", (0.28, 0.12, 0.05), 0.85, 0.3)
    fire = mat("fire", (0.9, 0.2, 0.03), 0.6, emit=(1.0, 0.25, 0.03), es=6.0); face = mat("gauge", (0.85, 0.82, 0.7), 0.4, emit=(0.4, 0.38, 0.3), es=0.4)
    cyl((0, 0.55, 0.12), 0.56, 0.24, band, verts=28)
    cyl((0, 0.55, 1.15), 0.5, 1.9, shell, verts=28); sph((0, 0.55, 2.1), (0.5, 0.5, 0.22), shell, 28, 10)
    for z in (0.35, 0.95, 1.55, 2.05): torus((0, 0.55, z), 0.505, 0.018, band, maj=28, mn=4)
    for z in (0.35, 0.95, 1.55):
        for i in range(24): a = i / 24 * 6.2832; sph((math.cos(a) * 0.515, 0.55 + math.sin(a) * 0.515, z + 0.04), (0.012, 0.012, 0.012), band, 6, 3)
    box((0, 1.0, 0.5), (0.5, 0.22, 0.56), shell, 0.02)  # firebox
    box((0, 1.115, 0.5), (0.36, 0.02, 0.36), band, 0.01)  # door
    for i in range(5): box((-0.12 + i * 0.06, 1.13, 0.5), (0.025, 0.012, 0.22), fire)  # glowing grate slots
    cyl((0.19, 1.13, 0.6), 0.02, 0.06, band, "Y", 8); box((0.19, 1.16, 0.5), (0.025, 0.02, 0.2), band)  # latch
    for (x, z, r) in [(-0.2, 1.65, 0.09), (0.12, 1.75, 0.07)]:
        cyl((x, 1.04, z), r, 0.05, band, "Y", 16); cyl((x, 1.07, z), r * 0.85, 0.01, face, "Y", 16); box((x + r * 0.3, 1.077, z + r * 0.2), (0.005, 0.004, r * 0.8), band, rot=(0, 0.7, 0))
        tube([(x, 1.0, z - r), (x, 0.98, z - r - 0.1)], 0.012, band)
    tube([(0, 0.55, 2.25), (0, 0.55, 2.7), (0, 0.4, 2.85), (0, 0.0, 2.85)], 0.09, rust, res=3)  # flue to the wall
    tube([(0.42, 0.75, 1.9), (0.62, 0.75, 1.9), (0.62, 0.75, 2.98)], 0.04, band)  # steam main to the ceiling
    torus((0.62, 0.87, 1.4), 0.12, 0.012, rust, "Y", 16, 4); cyl((0.62, 0.8, 1.4), 0.02, 0.14, band, "Y", 8)
    tube([(0.42, 0.75, 1.4), (0.62, 0.75, 1.4), (0.62, 0.75, 1.9)], 0.035, band)
    tube([(-0.45, 0.6, 0.8), (-0.62, 0.55, 0.8), (-0.62, 0.3, 0.2), (-0.62, 0.05, 0.2)], 0.035, rust)
    box((0, 1.02, 1.25), (0.22, 0.01, 0.08), face)  # makers' plate
    export("boiler")

# ---------------------------------------------------------------- the small round brick room, one weak tube
def brick_png():
    from PIL import Image, ImageDraw
    p = f"{OUT}/drum_brick.png"; W = 512; im = Image.new("RGB", (W, W), (70, 64, 58)); d = ImageDraw.Draw(im); r = random.Random(3)
    bw, bh = W / 9.3, W / 30.7
    for row in range(31):
        off = (bw / 2) if row % 2 else 0; y = row * bh
        for col in range(-1, 11):
            x = col * bw + off; t = r.uniform(0.55, 1.0); base = r.choice([(120, 50, 34), (104, 44, 30), (132, 62, 40), (92, 40, 30)])
            d.rectangle([x + 2, y + 2, x + bw - 2, y + bh - 2], fill=tuple(int(c * t) for c in base))
    im.save(p); return p
def drum():
    reset()
    br = mat("drumbrick", (1, 1, 1), 0.9, img=brick_png()); cap = mat("drumcap", (0.2, 0.17, 0.15), 0.9)
    metal = mat("fixture", (0.5, 0.5, 0.48), 0.5, 0.5); tubem = mat("tube", (0.9, 0.95, 0.85), 0.3, emit=(0.75, 0.85, 0.7), es=1.8)
    Ri, Ro, Hh, gap = 1.52, 1.68, 3.0, math.radians(40); n = 40; v = []; f = []; uv = []
    a0, a1 = math.pi / 2 + gap, math.pi / 2 + 2 * math.pi - gap
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        for r in (Ri, Ro):
            for z in (0, Hh): v.append((math.cos(a) * r, math.sin(a) * r, z))
    for i in range(n):
        b = i * 4; c = b + 4
        f += [(b, c, c + 1, b + 1), (b + 2, b + 3, c + 3, c + 2), (b + 1, c + 1, c + 3, b + 3)]
    f += [(0, 1, 3, 2), (n * 4, n * 4 + 2, n * 4 + 3, n * 4 + 1)]
    me = bpy.data.meshes.new("drum"); me.from_pydata(v, [], f); me.update(); ob = bpy.data.objects.new("drum", me); bpy.context.collection.objects.link(ob)
    ul = me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; x, y, z = v[vi]; a = math.atan2(y, x); ul.data[li].uv = (a * Ri / 2.0, z / 2.0 if abs(poly.normal.z) < 0.5 else math.hypot(x, y))
    fin(ob, br, True)
    for poly in me.polygons: poly.use_smooth = abs(poly.normal.z) < 0.5 and len(poly.vertices) == 4 and not (poly.index >= n * 3)
    for s in (-1, 1):  # brick jambs at the doorway
        a = math.pi / 2 + s * gap; box((math.cos(a) * 1.6, math.sin(a) * 1.6, 1.5), (0.2, 0.2, 3.0), cap, 0.02, rot=(0, 0, a))
    box((0, -1.47, 2.45), (0.7, 0.08, 0.06), metal, 0.01); cyl((0, -1.42, 2.45), 0.016, 0.6, tubem, "X", 10)  # the one weak tube
    tube([(0, -1.5, 2.48), (0, -1.5, 3.0)], 0.01, metal)
    export("drum")

for name in only: globals()[name]()
