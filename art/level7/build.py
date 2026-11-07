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
def furniture(kind, loc, yaw, tilt=0.0):
    x, y, z = loc
    if kind == "wardrobe":
        w, d, h = R.uniform(0.9, 1.2), R.uniform(0.5, 0.65), R.uniform(1.8, 2.2)
        ob = box((x, y, z + h / 2), (w, d, h), R.choice([WOOD, WOOD2, WOOD3]), rot=(tilt, 0, yaw), bevel=0.02)
        box((x, y - d / 2 * math.cos(yaw) - 0.01, z + h / 2), (w * 0.46, 0.03, h * 0.9), WOOD3, rot=(tilt, 0, yaw))  # door panel
    elif kind == "bed":
        box((x, y, z + 0.35), (1.0, 2.0, 0.12), WOOD2, rot=(tilt, 0, yaw)); box((x, y + math.cos(yaw) * 1.0, z + 0.7), (1.0, 0.1, 0.8), WOOD, rot=(tilt, 0, yaw))
    elif kind == "table":
        box((x, y, z + 0.78), (R.uniform(1.0, 1.6), R.uniform(0.7, 0.95), 0.07), WOOD2, rot=(tilt, 0, yaw), bevel=0.01)
        for sx in (-0.4, 0.4):
            for sy in (-0.28, 0.28): cyl((x + sx, y + sy, z + 0.38), 0.04, 0.76, WOOD3, verts=6)
    elif kind == "door":
        box((x, y, z + 1.0), (0.85, 0.05, 2.0), R.choice([WOOD, WOOD2]), rot=(tilt, 0, yaw))
    elif kind == "chair":
        box((x, y, z + 0.45), (0.45, 0.45, 0.06), WOOD2, rot=(tilt, 0, yaw)); box((x, y + 0.2, z + 0.78), (0.45, 0.05, 0.6), WOOD, rot=(tilt, 0, yaw))
        for sx in (-0.2, 0.2):
            for sy in (-0.2, 0.2): cyl((x + sx, y + sy, z + 0.22), 0.025, 0.45, WOOD3, verts=6)
    elif kind == "sofa":
        box((x, y, z + 0.35), (1.9, 0.85, 0.5), CLOTH, rot=(tilt, 0, yaw), bevel=0.06); box((x, y + 0.38, z + 0.75), (1.9, 0.18, 0.55), CLOTH, rot=(tilt, 0, yaw), bevel=0.05)
    elif kind == "dresser":
        box((x, y, z + 0.5), (1.2, 0.5, 1.0), WOOD2, rot=(tilt, 0, yaw), bevel=0.02)
        for k in range(3): box((x, y - 0.26, z + 0.2 + k * 0.3), (1.0, 0.02, 0.22), WOOD3, rot=(tilt, 0, yaw))
def build_fort():
    palette()
    Rr = 8.6  # ring radius around the courtyard; the gate faces glTF +Z (Blender -Y)
    for ring, (rad, n, off) in enumerate([(Rr, 46, 0.0), (Rr + 0.95, 40, 0.5)]):  # two rows of heavy furniture, offset like bricks
        for i in range(n):
            a = (i + off) / n * math.tau
            gx, gy = math.cos(a), math.sin(a)
            if gy < -0.86: continue  # the gate: a gap of about 5 m across the south
            r = rad + R.uniform(-0.25, 0.3)
            x, y = gx * r, gy * r; yaw = a + math.pi / 2 + R.uniform(-0.12, 0.12)
            kind = R.choice(["wardrobe", "wardrobe", "wardrobe", "wardrobe", "dresser", "dresser", "bed", "sofa", "door"])
            furniture(kind, (x, y, 0), yaw, R.uniform(-0.05, 0.05))
            tier = 1.9 if kind == "wardrobe" else 1.0
            if kind != "bed" and kind != "door" and R.random() < 0.8:  # a second tier, and for some a third
                furniture(R.choice(["wardrobe", "dresser", "wardrobe", "table"]), (x * 0.99, y * 0.99, tier), yaw + R.uniform(-0.2, 0.2), R.uniform(-0.08, 0.08))
                if R.random() < 0.4: furniture(R.choice(["chair", "dresser", "door"]), (x * 0.99, y * 0.99, tier + 1.9), yaw + R.uniform(-0.5, 0.5), R.uniform(-0.1, 0.1))
            if R.random() < 0.6: tar_drip((x, y, 2.0), R.uniform(0.2, 0.6), R.uniform(0.6, 2.0))
            if R.random() < 0.5: lash((x, y, R.uniform(0.6, 1.6)), (0.5, 0.5, 0.07))
    # infill: leaning doors and table-tops, tar-sealed, between the heavy pieces
    for i in range(46):
        a = R.uniform(0, math.tau)
        if math.sin(a) < -0.84: continue
        r = Rr + R.uniform(-1.0, 1.0)
        furniture(R.choice(["door", "door", "table", "chair", "bed"]), (math.cos(a) * r, math.sin(a) * r, 0), a + math.pi / 2 + R.uniform(-0.6, 0.6), R.uniform(-0.25, 0.25))
    # lean-to shanties inside the ring: a door roof on stacked crates, a bed, a hanging cloth (where the 4 to 9 live)
    for k, a in enumerate([0.5, 1.2, 1.9, 2.6, 3.4, 4.1, 5.9]):
        r = 6.0; x, y = math.cos(a) * r, math.sin(a) * r
        box((x, y, 1.45), (2.4, 1.7, 0.07), WOOD2 if k % 2 else WOOD, rot=(R.uniform(-0.12, 0.12), R.uniform(-0.12, 0.12), a + math.pi / 2), bevel=0.01)
        for sx, sy in ((-1.0, -0.7), (1.0, -0.7), (-1.0, 0.7), (1.0, 0.7)):
            ca, sa = math.cos(a + math.pi / 2), math.sin(a + math.pi / 2)
            cyl((x + sx * ca - sy * sa, y + sx * sa + sy * ca, 0.72), 0.05, 1.45, WOOD3, verts=6)
        box((x, y, 0.2), (1.3, 0.8, 0.15), CLOTH, rot=(0, 0, a))  # a pallet of rags
        box((x + 0.3, y - 0.2, 0.7), (0.5, 0.35, 0.25), RUST, rot=(0, 0, a))  # a tin, a lamp
        tar_drip((x, y + 0.8, 1.45), 0.3, 0.9)
    # the watchtower: stacked wardrobes lashed and tarred, a plank deck, a ladder, a rail
    tx, ty = 0.0, 8.8
    for k in range(4):
        for sx in (-0.7, 0.7): box((tx + sx, ty, 1.0 + k * 2.05), (1.0, 0.7, 2.0), R.choice([WOOD, WOOD2, WOOD3]), rot=(0, 0, R.uniform(-0.05, 0.05)), bevel=0.02)
        lash((tx, ty, 1.0 + k * 2.05), (2.0, 0.8, 0.08))
    box((tx, ty, 8.4), (3.0, 2.0, 0.12), WOOD2); box((tx, ty, 8.9), (3.0, 0.06, 0.9), WOOD3); box((tx - 1.45, ty, 8.9), (0.06, 2.0, 0.9), WOOD3)
    box((tx + 1.6, ty - 1.2, 4.2), (0.12, 0.05, 8.4), WOOD3, rot=(0.0, 0.0, 0.0))
    for k in range(14): box((tx + 1.6, ty - 1.25, 0.5 + k * 0.58), (0.7, 0.05, 0.05), WOOD3)
    tar_drip((tx, ty - 0.4, 8.4), 1.6, 3.5); tar_drip((tx + 0.8, ty - 0.4, 6.0), 0.5, 3.0)
    # the roofline: a fringe of salvaged beams and lamps; the gate: two tarred door-posts and a hanging chain
    for sx in (-2.7, 2.7):
        cyl((sx, -Rr - 0.4, 1.7), 0.14, 3.4, TAR, verts=8); sph((sx, -Rr - 0.4, 3.45), (0.2, 0.2, 0.2), TAR)
    box((0, -Rr - 0.4, 3.3), (5.6, 0.14, 0.14), TAR)
    for k in range(7): cyl((-2.4 + k * 0.8, -Rr - 0.4, 2.7), 0.025, 1.1, METAL, verts=5)  # a curtain of chains
    # ropes between the furniture and a few stuck-in oars and bones as offerings
    for k in range(5):
        a = R.uniform(0.3, 2.8); x, y = math.cos(a) * (Rr + 0.8), math.sin(a) * (Rr + 0.8)
        cyl((x, y, 1.1), 0.05, 2.2, BONE, rot=(0.2, 0.1, 0), verts=6)
    # the courtyard floor: tarred planks laid over the rock
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=Rr - 0.6, fill_type="NGON", location=(0, 0, 0.03))
    fl = bpy.context.active_object; finish(fl, STONE2, False)
    for k in range(-6, 7): box((k * 1.0, 0, 0.06), (0.9, 12.0, 0.04), WOOD3 if k % 3 else TAR)

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
