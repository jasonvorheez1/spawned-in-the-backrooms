# Level 7 "Thalassophobia" models, built procedurally in Blender (headless) and exported as glb.
#   blender -b -P art/level7/build.py -- [fort circle skeleton]
# Lore (backrooms-wiki.wikidot.com/level-7): Fort Surrender is a haphazard shelter of broken furniture held together by tar; the circular formation is a
# round stone platform ringed by stone pillars and massive pipes with a wooden door in its floor (Level 9, Tiny's lair); the deep skeletons are humanoid
# with large jaws and flipper-like legs.
# Conventions: metres, origin at the middle of the base, the front faces Blender -Y (glTF +Z), up is +Z (glTF +Y).
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

D = os.path.dirname(os.path.abspath(__file__))
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["fort", "circle", "skeleton"]
R = random.Random(707)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

MATS = {}
def mat(name, rgb, rough=0.7, metal=0.0, emit=None):
    key = (name, rgb, rough, metal, emit)
    if key in MATS and MATS[key].name in bpy.data.materials: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 2.0
    MATS[key] = m
    return m
def palette():
    global TAR, WOOD, WOOD2, WOOD3, METAL, RUST, BONE, STONE, STONE2, ROPE, CLOTH, GLASS
    TAR = mat("tar", (0.015, 0.014, 0.018), 0.22, 0.1)
    WOOD = mat("wood", (0.20, 0.12, 0.07), 0.85); WOOD2 = mat("wood2", (0.30, 0.20, 0.11), 0.85); WOOD3 = mat("wood3", (0.11, 0.08, 0.06), 0.9)
    METAL = mat("metal", (0.28, 0.28, 0.30), 0.5, 0.8); RUST = mat("rust", (0.30, 0.13, 0.06), 0.9, 0.3)
    BONE = mat("bone", (0.78, 0.74, 0.62), 0.8); STONE = mat("stone", (0.20, 0.21, 0.22), 0.95); STONE2 = mat("stone2", (0.13, 0.14, 0.15), 0.95)
    ROPE = mat("rope", (0.34, 0.27, 0.16), 0.95); CLOTH = mat("cloth", (0.22, 0.20, 0.16), 0.95); GLASS = mat("glass", (0.3, 0.45, 0.45), 0.1)

def finish(ob, m, smooth=True):
    ob.data.materials.clear(); ob.data.materials.append(m)
    for p in ob.data.polygons: p.use_smooth = smooth
    return ob
def box(loc, size, m, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object; ob.scale = size; ob.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bevel:
        md = ob.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2; bpy.ops.object.modifier_apply(modifier="b")
    return finish(ob, m, False)
def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=16, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc)
    ob = bpy.context.active_object; ob.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True)
    return finish(ob, m)
def sph(loc, scale, m, seg=14, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    ob = bpy.context.active_object; ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(ob, m)
def displace(ob, strength, scale=0.5, seed=1):
    t = bpy.data.textures.new("n%d" % seed, "CLOUDS"); t.noise_scale = scale
    md = ob.modifiers.new("d", "DISPLACE"); md.texture = t; md.strength = strength
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier="d")
def subdivide(ob, cuts=2):
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide(number_cuts=cuts); bpy.ops.object.mode_set(mode="OBJECT")
def tar_drip(loc, w, drop):  # a black tar smear running down a face
    box((loc[0], loc[1], loc[2] - drop / 2), (w, 0.05, drop), TAR, bevel=0.015)
def lash(loc, size):  # a band of rope or tar round a joint
    box(loc, size, ROPE if R.random() < 0.5 else TAR, bevel=0.01)

def join_all(name):
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name
    return ob
def export(name):
    ob = join_all(name)
    if name == "fort_surrender": uv_box(ob)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    path = os.path.join(D, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions))
    render(name, ob)
def render(name, ob):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = 900; sc.render.resolution_y = 700
    big = max(ob.dimensions); mid = Vector((0, 0, ob.dimensions.z * 0.35))
    for tag, off in (("a", Vector((big * 0.9, -big * 1.2, big * 0.75))), ("b", Vector((-big * 1.0, big * 0.9, big * 1.0)))):
        cam_d = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cam_d); bpy.context.collection.objects.link(cam)
        cam.location = mid + off; cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler(); cam_d.lens = 35; sc.camera = cam
        sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.55, 0.58, 0.62)
        sc.render.filepath = os.path.join(D, "preview_%s_%s.png" % (name, tag)); bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- Fort Surrender
# Rebuilt Nov 8 (Savi, "de ai slop"): one wall that reads as built, not a heap of floating blocks. A tarred plank palisade
# on log posts, real furniture (panelled wardrobes, drawer chests, bed ends, doors) stacked and seated against its outside face,
# tar run down every seam, a braced log watchtower, corrugated lean-tos. Slots by surface: paint1..4, wood, plank, tar, corr,
# rope, cloth, bone, metal; the sim mounts a texture on each (UVs are box-projected in metres at export).
def fpal():
    global P1, P2, P3, P4, WD, PL, TR, CO, RP, CL, BN, MT
    P1 = mat("paint1", (0.42, 0.45, 0.36), 0.8); P2 = mat("paint2", (0.62, 0.56, 0.44), 0.8)
    P3 = mat("paint3", (0.30, 0.36, 0.40), 0.8); P4 = mat("paint4", (0.40, 0.22, 0.16), 0.8)
    WD = mat("wood", (0.28, 0.19, 0.12), 0.85); PL = mat("plank", (0.32, 0.29, 0.25), 0.9)
    TR = mat("tar", (0.02, 0.02, 0.025), 0.18, 0.1); CO = mat("corr", (0.36, 0.22, 0.13), 0.75, 0.5)
    RP = mat("rope", (0.40, 0.32, 0.20), 0.95); CL = mat("cloth", (0.34, 0.30, 0.24), 0.95)
    BN = mat("bone", (0.78, 0.74, 0.62), 0.8); MT = mat("metal", (0.25, 0.25, 0.27), 0.45, 0.85)

def rot2(x, y, a): return (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))
def at(o, lx, ly, z, a): dx, dy = rot2(lx, ly, a); return (o[0] + dx, o[1] + dy, z)
def knob(p): sph(p, (0.035, 0.035, 0.035), MT, 8, 6)
def drip(x, y, z, w, n=3):  # tar poured over a joint: a fillet and tapered runs
    for k in range(n):
        L = R.uniform(0.25, 0.9); ox = R.uniform(-w / 2, w / 2)
        cyl((x + ox * 0.7, y + ox * 0.7, z - L / 2), R.uniform(0.03, 0.06), L, TR, verts=6, r2=0.008)

# a piece of furniture standing with its back toward the wall: local +y is "toward the courtyard"; returns its height
def wardrobe(o, a, z, paint):
    w, d, h = R.uniform(0.95, 1.2), 0.58, R.uniform(1.85, 2.1)
    box(at(o, 0, 0, z + 0.06, a), (w + 0.04, d + 0.04, 0.12), WD, rot=(0, 0, a), bevel=0.01)          # plinth
    box(at(o, 0, 0, z + 0.12 + (h - 0.24) / 2, a), (w, d, h - 0.24), paint, rot=(0, 0, a), bevel=0.012)
    box(at(o, 0, 0, z + h - 0.06, a), (w + 0.1, d + 0.08, 0.12), WD, rot=(0, 0, a), bevel=0.02)       # cornice
    for s in (-1, 1):  # two doors, each with two raised panels and a knob, on the OUTSIDE face (-y)
        cx = s * w / 4
        for pz, ph in ((0.5, 0.55), (1.25, 0.75)):
            box(at(o, cx, -d / 2 - 0.012, z + 0.12 + pz * (h - 0.24) / 1.95 + ph * 0.3, a), (w / 2 - 0.14, 0.025, ph * (h - 0.24) / 2.1), paint, rot=(0, 0, a), bevel=0.008)
        knob(at(o, s * 0.05, -d / 2 - 0.04, z + h * 0.52, a))
    return h
def chest(o, a, z, paint):
    w, d, h = R.uniform(1.0, 1.25), 0.5, R.uniform(0.85, 1.05)
    box(at(o, 0, 0, z + h / 2, a), (w, d, h), paint, rot=(0, 0, a), bevel=0.012)
    box(at(o, 0, 0, z + h + 0.025, a), (w + 0.06, d + 0.05, 0.05), WD, rot=(0, 0, a), bevel=0.01)
    n = 3 if h > 0.95 else 2
    for k in range(n):
        dz = z + 0.08 + (k + 0.5) * (h - 0.12) / n
        box(at(o, 0, -d / 2 - 0.01, dz, a), (w - 0.1, 0.022, (h - 0.12) / n - 0.05), paint, rot=(0, 0, a), bevel=0.006)
        for s in (-1, 1): knob(at(o, s * w * 0.25, -d / 2 - 0.035, dz, a))
    return h + 0.05
def bedend(o, a, z, paint):  # a bed's head end stood up: two turned posts, a top rail and spindles
    w, h = 1.15, 1.25
    for s in (-1, 1):
        cyl(at(o, s * w / 2, 0, z + h / 2, a), 0.05, h, WD, verts=8); sph(at(o, s * w / 2, 0, z + h + 0.03, a), (0.07, 0.07, 0.07), WD, 8, 6)
    box(at(o, 0, 0, z + h - 0.12, a), (w, 0.06, 0.16), paint, rot=(0, 0, a), bevel=0.01)
    box(at(o, 0, 0, z + 0.35, a), (w, 0.05, 0.12), paint, rot=(0, 0, a))
    for k in range(7): cyl(at(o, -w / 2 + (k + 1) * w / 8, 0, z + 0.75, a), 0.018, 0.7, WD, verts=6)
    return h
def door(o, a, z, paint, lean=0.0):  # a four-panel door stood on end
    box(at(o, 0, 0, z + 1.0, a), (0.84, 0.045, 2.0), paint, rot=(lean, 0, a), bevel=0.01)
    for px in (-0.19, 0.19):
        for pz in (0.55, 1.4):
            box(at(o, px, -0.03, z + pz, a), (0.3, 0.02, 0.62 if pz > 1 else 0.7), paint, rot=(lean, 0, a), bevel=0.006)
    knob(at(o, 0.32, -0.06, z + 1.0, a))
    return 2.0

def corr(loc, w, d, a, tilt, m=None):  # corrugated sheet: ridges along d
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=max(4, int(w / 0.07)), y_subdivisions=2, size=1, location=(0, 0, 0))
    ob = bpy.context.active_object; ob.scale = (w, d, 1); bpy.ops.object.transform_apply(scale=True)
    for v in ob.data.vertices: v.co.z = 0.02 * math.sin(v.co.x / 0.07 * math.pi)
    sol = ob.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.01; bpy.ops.object.modifier_apply(modifier="s")
    ob.rotation_euler = (tilt, 0, a); ob.location = loc; bpy.ops.object.transform_apply(location=True, rotation=True)
    return finish(ob, m or CO, True)

def build_fort():
    fpal()
    Rr = 8.6
    GATE = lambda ang: math.sin(ang) < -0.88          # the gate gap faces Blender -Y (world +Z, the fort pier)
    # --- the palisade: tarred vertical planks on log posts and two wales, buried 0.6 m into the rock
    n = int(math.tau * Rr / 0.27)
    for i in range(n):
        ang = i / n * math.tau
        if GATE(ang): continue
        x, y = math.cos(ang) * Rr, math.sin(ang) * Rr; h = R.uniform(2.5, 3.0)
        box((x, y, -0.6 + (h + 0.6) / 2), (0.25, 0.07, h + 0.6), PL if R.random() < 0.8 else TR, rot=(R.uniform(-0.02, 0.02), 0, ang + math.pi / 2), bevel=0.01)
    npost = 22
    for i in range(npost):
        ang = (i + 0.5) / npost * math.tau
        if GATE(ang): continue
        x, y = math.cos(ang) * (Rr - 0.16), math.sin(ang) * (Rr - 0.16)
        cyl((x, y, 1.1), 0.11, 3.4, TR if i % 3 == 0 else WD, verts=10)
        for wz in (0.7, 2.1):  # wale: a beam from this post to the next
            a2 = (i + 1.5) / npost * math.tau
            if GATE(a2): continue
            x2, y2 = math.cos(a2) * (Rr - 0.16), math.sin(a2) * (Rr - 0.16)
            L = math.hypot(x2 - x, y2 - y)
            box(((x + x2) / 2, (y + y2) / 2, wz), (L + 0.1, 0.1, 0.14), WD, rot=(0, 0, math.atan2(y2 - y, x2 - x)), bevel=0.01)
        if R.random() < 0.6: box((x, y, R.uniform(0.6, 2.2)), (0.32, 0.32, 0.06), RP, rot=(0, 0, ang), bevel=0.01)  # rope lashing
    # tar seal along the foot, inside and out
    for i in range(90):
        ang = i / 90 * math.tau
        if GATE(ang): continue
        for rr in (Rr - 0.08, Rr + 0.12):
            box((math.cos(ang) * rr, math.sin(ang) * rr, 0.05), (0.66, 0.16, 0.22), TR, rot=(0, 0, ang + math.pi / 2), bevel=0.05)
    # --- furniture stacked against the OUTSIDE face, each tier seated on the one below, tar over every joint
    paints = [P1, P2, P3, P4]
    i, ang = 0, 0.0
    while ang < math.tau:
        kind = R.choice(["wardrobe", "wardrobe", "chest", "chest", "bed", "door"])
        wdt = {"wardrobe": 1.15, "chest": 1.15, "bed": 1.2, "door": 0.9}[kind]
        mid = ang + wdt / 2 / (Rr + 0.45)
        ang += (wdt + R.uniform(0.02, 0.1)) / (Rr + 0.45)
        if GATE(mid) or GATE(ang): continue
        rr = Rr + (0.08 if kind in ("bed", "door") else 0.4)
        o = (math.cos(mid) * rr, math.sin(mid) * rr); fa = mid - math.pi / 2  # local -y faces outward
        paint = R.choice(paints)
        footing = box((o[0], o[1], -0.3), (wdt * 0.9, 0.5, 0.6), TR, rot=(0, 0, fa))  # seated in tar over the rock
        h = {"wardrobe": wardrobe, "chest": chest, "bed": bedend, "door": door}[kind](o, fa, 0.0, paint)
        if kind in ("chest",) and R.random() < 0.75:  # a second piece sat on the first
            h2 = (chest if R.random() < 0.5 else wardrobe)(o, fa + R.uniform(-0.05, 0.05), h, R.choice(paints))
            box((o[0], o[1], h), (wdt * 0.95, 0.56, 0.05), TR, rot=(0, 0, fa)); drip(o[0], o[1], h, wdt)
        elif kind == "wardrobe" and R.random() < 0.3:
            chest(o, fa + R.uniform(-0.04, 0.04), h, R.choice(paints)); drip(o[0], o[1], h, wdt)
        if R.random() < 0.55: drip(o[0] * 1.02, o[1] * 1.02, h * R.uniform(0.6, 1.0), wdt, 2)
        i += 1
    # --- the gate: two tarred logs, a lintel, a door leaf swung open, a curtain of chain and a hanging bone charm
    for sx in (-2.6, 2.6):
        cyl((sx, -Rr, 1.6), 0.18, 4.4, TR, verts=12)
        sph((sx, -Rr, 3.85), (0.22, 0.22, 0.12), TR, 10, 6)
    box((0, -Rr, 3.45), (5.8, 0.24, 0.26), WD, bevel=0.03)
    box((0, -Rr, 3.45), (5.9, 0.28, 0.08), TR, bevel=0.02)
    door((-2.0, -Rr - 0.5), math.radians(-60), 0.0, P2)
    for k in range(9): cyl((-2.2 + k * 0.55, -Rr, 3.0 - (k % 3) * 0.12), 0.018, 0.75 + (k % 3) * 0.2, MT, verts=5)
    cyl((0, -Rr - 0.05, 2.95), 0.01, 0.9, RP, verts=4); sph((0, -Rr - 0.05, 2.45), (0.12, 0.1, 0.14), BN, 10, 8)
    # --- the watchtower: four log legs, X-braced, a planked deck at 6 m with a rail, a corrugated roof, a ladder
    tx, ty, s = 0.0, 8.0, 1.2
    legs = [(tx - s, ty - s), (tx + s, ty - s), (tx + s, ty + s), (tx - s, ty + s)]
    for lx, ly in legs: cyl((lx, ly, 3.2), 0.13, 7.6, WD, verts=10); box((lx, ly, 0.0), (0.5, 0.5, 0.25), TR, bevel=0.05)
    for k in range(4):
        (x1, y1), (x2, y2) = legs[k], legs[(k + 1) % 4]
        if k == 0: continue  # the ladder side stays open
        L = math.hypot(x2 - x1, y2 - y1); yaw = math.atan2(y2 - y1, x2 - x1); tilt = math.atan2(2.6, L)
        for z0 in (0.4, 3.2):
            for sg in (1, -1):
                box(((x1 + x2) / 2, (y1 + y2) / 2, z0 + 1.3), (math.hypot(L, 2.6), 0.08, 0.12), WD, rot=(sg * tilt, 0, yaw) if False else (0, sg * tilt, yaw), bevel=0.01)
        box(((x1 + x2) / 2, (y1 + y2) / 2, 3.15), (L, 0.1, 0.12), WD)
    for k in range(10): box((tx, ty - s - 0.25 + k * 0.32, 6.0), (3.1, 0.28, 0.06), PL, rot=(0, R.uniform(-0.02, 0.02), 0), bevel=0.008)
    for lx, ly in legs: cyl((lx, ly, 6.55), 0.06, 1.1, WD, verts=8)
    for k in range(4):
        (x1, y1), (x2, y2) = legs[k], legs[(k + 1) % 4]
        box(((x1 + x2) / 2, (y1 + y2) / 2, 7.0), (math.hypot(x2 - x1, y2 - y1) + 0.1, 0.08, 0.08), WD, rot=(0, 0, math.atan2(y2 - y1, x2 - x1)))
    door((tx + 0.5, ty + s + 0.05), 0.0, 6.03, P3)        # a door nailed up as the back wall of the crow's nest
    chest((tx - 0.7, ty + s - 0.35), 0.0, 6.03, P1)
    corr((tx, ty, 8.15), 3.4, 3.2, 0.0, 0.18)
    for lx, ly in legs: cyl((lx, ly, 7.55), 0.05, 1.0, WD, verts=8)
    for sx in (-0.28, 0.28): box((tx + sx, ty - s - 0.35, 3.0), (0.06, 0.06, 6.2), WD, rot=(0.08, 0, 0))
    for k in range(19): box((tx, ty - s - 0.35 - k * 0.0, 0.3 + k * 0.31), (0.6, 0.05, 0.05), WD)
    drip(tx - s, ty - s, 5.8, 0.3); drip(tx + s, ty + s, 5.8, 0.3)
    # --- lean-tos inside the ring (the 4 to 9 sleep here): two posts, a corrugated roof sloping to the wall, a hung rag
    for k, aa in enumerate([0.5, 1.2, 1.9, 2.6, 3.4, 4.1, 5.9]):
        o = (math.cos(aa) * 6.3, math.sin(aa) * 6.3); fa = aa - math.pi / 2
        for sx in (-1.0, 1.0): cyl(at(o, sx, 0.65, 0.85, fa), 0.06, 1.9, WD, verts=8)
        corr(at(o, 0, -0.15, 1.95, fa), 2.5, 2.2, fa, -0.28)
        box(at(o, 0, 0.65, 1.75, fa), (2.2, 0.08, 0.1), WD)
        box(at(o, -0.6, 0.7, 1.15, fa), (0.9, 0.015, 1.1), CL, rot=(0.05, 0, fa))
        box(at(o, 0.1, -0.2, 0.15, fa), (1.6, 0.75, 0.14), CL, rot=(0, 0, fa), bevel=0.04)
    # --- the courtyard: salvaged planks of every length, laid with gaps, leaving the tar pit open
    for row in range(-28, 29):
        y = row * 0.29; x = -Rr
        while x < Rr:
            L = R.uniform(0.9, 2.6)
            cx = x + L / 2
            if cx * cx + y * y < (Rr - 0.4) ** 2 and (cx + 5.2) ** 2 + (y + 1.5) ** 2 > 3.6:
                box((cx, y, 0.05), (L - 0.03, 0.26, 0.05), PL if R.random() < 0.85 else WD, bevel=0.006)
            x += L
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=Rr, fill_type="NGON", location=(0, 0, 0.01)); finish(bpy.context.active_object, TR, False)
    # offerings: oars stood in the ground by the altar side, bound with rope
    for k in range(4):
        aa = 1.2 + k * 0.25; x, y = math.cos(aa) * (Rr - 0.7), math.sin(aa) * (Rr - 0.7)
        cyl((x, y, 1.2), 0.03, 2.4, WD, verts=6); box((x, y, 2.25), (0.16, 0.03, 0.55), WD, bevel=0.01)

def uv_box(ob, scale=0.5):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda k: abs(n[k]))
        for l in f.loops:
            c = l.vert.co
            l[uv].uv = ((c.x, c.y) if ax == 2 else (c.y, c.z) if ax == 0 else (c.x, c.z))
            l[uv].uv = (l[uv].uv[0] * scale, l[uv].uv[1] * scale)
    bm.to_mesh(ob.data); bm.free()

# ---------------------------------------------------------------- the circular formation (Level 9)
def build_circle():
    palette()
    cyl((0, 0, 0.35), 6.2, 0.7, STONE, verts=48)  # the platform
    cyl((0, 0, 0.72), 5.9, 0.06, STONE2, verts=48)
    for k in range(10):  # a ring of cut pillars, some snapped
        a = k / 10 * math.tau; r = 9.5
        h = R.choice([9.0, 9.0, 7.0, 5.2, 8.2]); w = 0.95
        p = cyl((math.cos(a) * r, math.sin(a) * r, h / 2), w, h, STONE, verts=10)
        sub = cyl((math.cos(a) * r, math.sin(a) * r, 0.25), w * 1.3, 0.5, STONE2, verts=10)
        if h < 9: box((math.cos(a) * r + 0.3, math.sin(a) * r, h + 0.2), (1.3, 1.0, 0.6), STONE, rot=(R.uniform(-0.4, 0.4), R.uniform(-0.4, 0.4), R.uniform(0, 3)))
    for k in range(5):  # massive pipes running between the pillars and over the platform, flanged and rusted
        a = k / 5 * math.tau + 0.3; r = 9.5
        x0, y0 = math.cos(a) * r, math.sin(a) * r; a2 = a + R.uniform(1.0, 1.7); x1, y1 = math.cos(a2) * r, math.sin(a2) * r
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2; ln = math.hypot(x1 - x0, y1 - y0); ang = math.atan2(y1 - y0, x1 - x0)
        z = R.choice([2.2, 3.4, 4.6])
        pipe = cyl((mx, my, z), 0.8, ln, RUST if k % 2 else METAL, rot=(math.pi / 2, 0, ang - math.pi / 2), verts=18)
        for t in (0.0, 0.5, 1.0): cyl((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z), 0.95, 0.25, METAL, rot=(math.pi / 2, 0, ang - math.pi / 2), verts=18)
    for k in range(3):  # a pipe lying across the floor
        a = k * 2.1 + 0.8
        cyl((math.cos(a) * 4.0, math.sin(a) * 4.0, 1.25), 0.5, 5.0, RUST, rot=(math.pi / 2, 0, a + math.pi / 2), verts=14)
    # the wooden door in the floor, at the middle: planks, iron straps, a ring handle
    box((0, 0, 0.78), (1.7, 1.7, 0.08), WOOD, bevel=0.015)
    for k in range(5): box((-0.68 + k * 0.34, 0, 0.83), (0.3, 1.66, 0.04), WOOD2 if k % 2 else WOOD3)
    for sy in (-0.55, 0.55): box((0, sy, 0.86), (1.7, 0.12, 0.03), METAL)
    cyl((0, -0.7, 0.9), 0.14, 0.03, METAL, rot=(0, 0, 0), verts=14); cyl((0, -0.7, 0.9), 0.1, 0.05, WOOD3, verts=14)
    box((0, 0, 0.74), (2.0, 2.0, 0.05), STONE2)
    for k in range(14):  # rubble and growth
        a = R.uniform(0, math.tau); r = R.uniform(6.5, 12)
        sph((math.cos(a) * r, math.sin(a) * r, 0.3), (R.uniform(0.3, 1.0), R.uniform(0.3, 1.0), R.uniform(0.2, 0.6)), STONE2)

# ---------------------------------------------------------------- the humanoid with the large jaw and flipper legs
def bone(a, b, r, m=None):
    mid = [(a[i] + b[i]) / 2 for i in range(3)]; d = Vector(b) - Vector(a)
    ob = cyl(mid, r * 1.9, d.length, m or BONE, verts=8)
    ob.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return ob
def build_skeleton():
    palette()
    # lying on its back, head toward +Y; ~2.3 m long
    sph((0, 1.05, 0.12), (0.17, 0.2, 0.15), BONE)  # cranium
    jaw = box((0, 1.38, 0.05), (0.2, 0.46, 0.09), BONE, rot=(0.1, 0, 0), bevel=0.025)  # the large jaw: long, heavy, hinged wide
    box((0, 1.35, 0.17), (0.15, 0.36, 0.06), BONE, bevel=0.02)
    for k in range(9):  # teeth
        box((-0.11 + (k % 2) * 0.01, 1.2 + k * 0.045, 0.14), (0.012, 0.012, 0.05), BONE); box((0.11, 1.2 + k * 0.045, 0.14), (0.012, 0.012, 0.05), BONE)
    for k in range(10): bone((0, 0.88 - k * 0.085, 0.07), (0, 0.8 - k * 0.085, 0.07), 0.025)  # spine
    for k in range(8):  # ribs, curved, lessening toward the pelvis
        y = 0.82 - k * 0.075; s = 0.2 - k * 0.012
        for sx in (-1, 1): bone((sx * 0.02, y, 0.08), (sx * s, y - 0.04, 0.2), 0.012); bone((sx * s, y - 0.04, 0.2), (sx * s * 0.8, y - 0.1, 0.1), 0.01)
    box((0, 0.1, 0.07), (0.3, 0.14, 0.07), BONE, bevel=0.03)  # pelvis
    for sx in (-1, 1):
        bone((sx * 0.18, 0.78, 0.07), (sx * 0.34, 0.5, 0.06), 0.02); bone((sx * 0.34, 0.5, 0.06), (sx * 0.5, 0.2, 0.05), 0.018)  # arms
        bone((sx * 0.5, 0.2, 0.05), (sx * 0.55, 0.05, 0.05), 0.012)
        bone((sx * 0.1, 0.05, 0.07), (sx * 0.16, -0.5, 0.07), 0.03); bone((sx * 0.16, -0.5, 0.07), (sx * 0.2, -1.0, 0.06), 0.025)  # legs
        fl = box((sx * 0.22, -1.25, 0.05), (0.2, 0.42, 0.02), BONE, rot=(0, 0, sx * 0.12), bevel=0.01)  # the flipper: a flat paddle of fanned bone
        for k in range(5): bone((sx * 0.2, -1.05, 0.05), (sx * (0.1 + k * 0.045), -1.44, 0.05), 0.008)
    for k in range(5):  # scattered small bones and a curl of tar on the seabed side
        sph((R.uniform(-0.5, 0.5), R.uniform(-1.2, 1.0), 0.02), (0.05, 0.03, 0.02), BONE)
    sph((0.5, -0.5, 0.0), (0.35, 0.5, 0.03), TAR)

BUILD = {"fort": ("fort_surrender", build_fort), "circle": ("circular_formation", build_circle), "skeleton": ("skeleton", build_skeleton)}
for key in only:
    reset(); MATS.clear(); name, fn = BUILD[key]; R.seed(707 + len(key)); fn(); export(name)
