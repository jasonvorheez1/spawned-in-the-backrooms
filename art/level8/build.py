# Level 8 "Cave Systems" models, built procedurally in Blender (headless) and exported as glb; the stations of the 9th Road go to scripts/lib/data/level8.yml.
#   blender -b -P art/level8/build.py -- [cave spider]
# Lore (backrooms-wiki.wikidot.com/level-8): a sprawling network of organic karst caves, cold and dark, jagged stalactites and stalagmites, tunnels that narrow to a crawl,
# large chambers; the 9th Road runs through them from the entrance lake to Level 9. The cave is one closed shell (inside faces out), x y z = the game's x y z.
import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector, noise

D = os.path.dirname(os.path.abspath(__file__))
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["cave", "spider"]
R = random.Random(808)

def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgb, rough=0.9, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 3.0
    m.use_backface_culling = False
    return m
def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- the 9th Road: one long cave
# (s, half-width, half-height): chambers and tunnels along the spine, in metres from the entrance lake
CTRL = [(-12, 2, 1.5), (-6, 13, 6), (28, 14, 6), (48, 3.6, 2.8), (66, 10, 5.5), (95, 10, 5.5), (106, 3.2, 2.6), (112, 1.5, 1.05), (150, 1.5, 1.05), (160, 3.2, 2.6), (170, 15, 7), (204, 15, 7),
        (216, 3.5, 2.8), (230, 9, 5), (268, 9, 5), (280, 3.5, 2.8), (292, 13, 6), (336, 13, 6), (346, 3.5, 2.8), (358, 11, 6), (396, 11, 6), (406, 3.5, 2.8), (418, 14, 6.5), (456, 14, 6.5),
        (466, 3.6, 2.9), (480, 4.6, 3.6), (500, 4.6, 3.6), (506, 1.5, 1.2)]
STATIONS = [  # name, s from, s to
    ("lake", -12, 36), ("hall", 50, 100), ("crawl", 100, 158), ("flooded", 160, 214), ("lane", 216, 270), ("nest", 280, 346), ("tar", 346, 406), ("camp", 406, 466), ("road", 466, 506)]
def prof(s):
    for (s0, a0, b0), (s1, a1, b1) in zip(CTRL, CTRL[1:]):
        if s0 <= s <= s1:
            t = smooth(s0, s1, s); return a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
    return CTRL[-1][1], CTRL[-1][2]
def heading(s): return 0.55 * math.sin(s / 85.0) + 0.28 * math.sin(s / 37.0 + 1.0) + 0.12 * math.sin(s / 150.0 + 2)
def floor_y(s):  # the floor along the road: the lake bed, the ledge at the end of the flooded cavern, a long slow dip
    y = 0.5 * math.sin(s / 70.0) - 2.4 * (1 - smooth(18, 34, s)) * smooth(-14, -8, s) * 1.0
    y += 2.9 * smooth(176, 186, s) * (1 - smooth(204, 220, s))
    y += -0.7 * smooth(358, 366, s) * (1 - smooth(392, 400, s))
    return y
def spine(ds=2.0):
    pts, x, z, s = [], 0.0, 0.0, -12.0
    while s <= 506:
        pts.append((s, x, z)); h = heading(s); x += math.sin(h) * ds; z += -math.cos(h) * ds; s += ds
    return pts

def build_cave():
    rock = mat("rock", (0.075, 0.07, 0.065), 0.95)
    me = bpy.data.meshes.new("cave"); ob = bpy.data.objects.new("cave", me); bpy.context.collection.objects.link(ob)
    bm = bmesh.new(); N = 34; rings = []; info = []
    for s, x, z in spine():
        h = heading(s); rx, ry = prof(s); fy = floor_y(s); cy = fy + 0.62 * ry
        right = Vector((math.cos(h), 0, math.sin(h))); base = Vector((x, cy, z)); ring = []
        for k in range(N):
            th = k / N * math.tau; ux, uy = math.cos(th) * rx, math.sin(th) * ry
            n = noise.noise(Vector((x * 0.09 + math.cos(th) * 1.3, z * 0.09 + math.sin(th) * 1.3, s * 0.07)))
            n2 = noise.noise(Vector((x * 0.31, z * 0.31, (s + k) * 0.23)))
            amp = 0.17 if rx > 5 else 0.12
            ux *= 1 + amp * n + 0.04 * n2; uy *= 1 + amp * n + 0.04 * n2
            if uy < -0.62 * ry: uy = -0.62 * ry + 0.2 * noise.noise(Vector((x * 0.4, z * 0.4, th))) * (1 if rx > 5 else 0.5)  # a flat, rubbly floor
            p = base + right * ux + Vector((0, uy, 0)); ring.append(bm.verts.new(p))
        rings.append(ring); info.append((s, x, fy, z, h, rx, ry))
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(N):
            a, b, c, d = r0[k], r0[(k + 1) % N], r1[(k + 1) % N], r1[k]
            try: bm.faces.new((a, d, c, b))  # the winding that faces inward
            except ValueError: pass
    for ring, rev in ((rings[0], False), (rings[-1], True)):  # the shell is sealed at both ends
        try: bm.faces.new(list(reversed(ring)) if rev else ring)
        except ValueError: pass
    bm.normal_update()
    # the shell must face inward (you stand inside it): count how many faces look toward the spine, and flip them all if most look away
    inward = 0; total = 0
    for f in bm.faces:
        if len(f.verts) != 4: continue
        c = f.calc_center_median(); base = min((Vector(i[1:4:2] and (i[1], i[2] + 0.62 * i[6], i[3])) for i in info), key=lambda b: (b - c).length)
        total += 1; inward += 1 if f.normal.dot(base - c) > 0 else 0
    print("inward faces", inward, "of", total)
    if inward < total / 2: bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.normal_update()
    bm.to_mesh(me); bm.free()
    ob.data.materials.append(rock)
    for p in ob.data.polygons: p.use_smooth = True
    # stalactites hanging from the ceiling and stalagmites standing on the floor, in every chamber, and a few in the tunnels
    objs = [ob]
    for i in range(210):
        j = R.randrange(2, len(info) - 2); s, x, fy, z, h, rx, ry = info[j]
        if rx < 5 and R.random() < 0.8: continue
        up = R.random() < 0.55
        off = R.uniform(-0.72, 0.72) * rx; right = Vector((math.cos(h), 0, math.sin(h)))
        L = R.uniform(0.9, 2.8) * (1.4 if rx > 8 else 0.7); w = L * R.uniform(0.14, 0.24)
        ceil = fy + 0.62 * ry + ry * math.sqrt(max(0.04, 1 - (off / rx) ** 2)) * 0.92
        base_y = ceil - 0.2 if up else fy
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=w, radius2=0.02, depth=L, location=(x + right.x * off, base_y + (-L / 2 if up else L / 2), z + right.z * off))
        c = bpy.context.active_object
        if up: c.rotation_euler.x = math.pi
        c.data.materials.append(rock); objs.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.join()
    out = {"stations": [], "road": []}
    for name, a, b in STATIONS:
        sa = [t for t in info if a <= t[0] <= b]; mid = sa[len(sa) // 2]
        out["stations"].append({"name": name, "s0": a, "s1": b, "x": round(mid[1], 2), "y": round(mid[2], 2), "z": round(mid[3], 2), "yaw": round(math.degrees(mid[4]), 1), "rx": round(mid[5], 1), "ry": round(mid[6], 1)})
    out["road"] = [[t[0], round(t[1], 2), round(t[2], 2), round(t[3], 2), round(math.degrees(t[4]), 1)] for t in info[::5]]
    return "cave_road", out

# ---------------------------------------------------------------- a cave spider (a metre across, eight legs, a bright cluster of eyes)
def build_spider():
    body = mat("spider", (0.035, 0.028, 0.025), 0.45, 0.2); eyes = mat("eyes", (0.9, 0.05, 0.03), 0.3, 0, emit=(1.0, 0.1, 0.05)); fang = mat("fang", (0.5, 0.42, 0.3), 0.5)
    def sph(loc, sc, m):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, location=loc); o = bpy.context.active_object; o.scale = sc
        bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        return o
    def seg(a, b, r, m):
        a, b = Vector(a), Vector(b); d = b - a
        bpy.ops.mesh.primitive_cylinder_add(vertices=7, radius=r, depth=d.length, location=(a + b) / 2); o = bpy.context.active_object
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        return o
    sph((0, 0.42, 0.34), (0.3, 0.46, 0.3), body); sph((0, -0.12, 0.3), (0.2, 0.22, 0.17), body)  # abdomen, cephalothorax
    for sx in (-1, 1):
        seg((sx * 0.07, -0.3, 0.26), (sx * 0.06, -0.38, 0.1), 0.025, fang)  # fangs
        for k in range(4):  # eyes
            sph((sx * (0.04 + (k % 2) * 0.045), -0.3, 0.33 + (k // 2) * 0.05), (0.022, 0.022, 0.022), eyes)
    for sx in (-1, 1):
        for k in range(4):  # legs: out and up to a knee, then down to a foot
            fy = 0.18 - k * 0.19; ph = (k - 1.5) * 0.35
            hip = (sx * 0.14, fy * 0.5 - 0.02, 0.3); knee = (sx * (0.66 + 0.1 * abs(ph)), fy + ph * 0.3, 0.62); foot = (sx * (1.0 + 0.12 * abs(ph)), fy * 1.5 + ph * 0.55, 0.02)
            seg(hip, knee, 0.024, body); seg(knee, foot, 0.017, body)
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.join(); o = bpy.context.active_object
    return "spider", None

def join_export(name, yup=True):
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # the object's origin is the world origin: the node carries no translation (the physics mesh and the draw agree)
    path = os.path.join(D, name + ".glb"); bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=yup, export_materials="EXPORT")
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 1) for x in ob.dimensions))
    return ob
def preview(name, ob, top=False):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = 1100; sc.render.resolution_y = 700; big = max(ob.dimensions)
    cam_d = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cam_d); bpy.context.collection.objects.link(cam)
    mid = Vector((0, 0, 0)) if not top else Vector((sum(v[0] for v in ob.bound_box) / 8, sum(v[1] for v in ob.bound_box) / 8, 0))
    cam.location = (mid + Vector((0, 0, big * 1.05))) if top else (mid + Vector((big * 1.2, -big * 1.2, big * 0.9)))
    cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler(); cam_d.lens = 30; sc.camera = cam
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.55, 0.58, 0.62)
    sc.render.filepath = os.path.join(D, "preview_%s.png" % name); bpy.ops.render.render(write_still=True)

for key in only:
    reset()
    if key == "cave":
        name, data = build_cave(); ob = join_export(name, yup=False)  # the cave is already built Y-up (x, up, z) in game coordinates
        # the road's stations, for places/level8/sim.js
        path = os.path.normpath(os.path.join(D, "..", "..", "scripts", "lib", "data", "level8.yml"))
        open(path, "w").write(json.dumps(data, indent=1)); print("wrote", path)
        preview("cave_road", ob, top=True)
    else:
        name, _ = build_spider(); ob = join_export(name); preview("spider", ob)
