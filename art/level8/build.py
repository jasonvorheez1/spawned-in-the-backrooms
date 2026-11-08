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
def mat(name, rgb, rough=0.9, metal=0.0, emit=None, emit_s=3.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = (*(emit if emit else rgb), 1); m.roughness = rough; m.metallic = metal
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emit_s
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
    # Multi-material palette for the karst cavern system
    rock = mat("rock", (0.085, 0.08, 0.075), 0.93)
    wet_rock = mat("wet_rock", (0.045, 0.05, 0.055), 0.28, 0.15)
    flowstone = mat("flowstone", (0.28, 0.24, 0.18), 0.62, 0.05)
    road_bed = mat("road_bed", (0.13, 0.12, 0.105), 0.88)
    biolum = mat("biolum", (0.12, 0.55, 0.52), 0.35, 0.1, emit=(0.15, 0.78, 0.72), emit_s=2.8)
    tar_rock = mat("tar_rock", (0.02, 0.018, 0.025), 0.16, 0.25)

    me = bpy.data.meshes.new("cave"); ob = bpy.data.objects.new("cave", me); bpy.context.collection.objects.link(ob)
    for m in (rock, wet_rock, flowstone, road_bed, biolum, tar_rock): ob.data.materials.append(m)

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

    for idx, (r0, r1) in enumerate(zip(rings, rings[1:])):
        s, x, fy, z, h, rx, ry = info[idx]
        for k in range(N):
            a, b, c, d = r0[k], r0[(k + 1) % N], r1[(k + 1) % N], r1[k]
            try:
                f = bm.faces.new((a, d, c, b))  # the winding that faces inward
                th = (k + 0.5) / N * math.tau
                uy_norm = math.sin(th)
                ux_norm = abs(math.cos(th))
                # Assign material index based on cave zone and height/angle
                if uy_norm < -0.58 and ux_norm * rx < 2.2 and s >= 32:
                    f.material_index = 3  # road_bed: the worn 9th Road path
                elif 352 <= s <= 404 and uy_norm < -0.25:
                    f.material_index = 5  # tar_rock: glossy pitch-stained basin
                elif (s <= 38 or (160 <= s <= 214) or (218 <= s <= 268 and uy_norm < -0.35)) and uy_norm < -0.15:
                    f.material_index = 1  # wet_rock: glistening damp walls & floor
                elif uy_norm > 0.22 and noise.noise(Vector((x * 0.11, z * 0.11, k * 0.25))) > 0.28:
                    f.material_index = 2  # flowstone: pale calcite wall/vault drapery veins
                else:
                    f.material_index = 0  # rock
            except ValueError:
                pass
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
    for p in ob.data.polygons: p.use_smooth = True

    # Keep exact RNG sequence for the 210 primary stalactites & stalagmites, now properly oriented along vertical Y axis!
    objs = [ob]
    for i in range(210):
        j = R.randrange(2, len(info) - 2); s, x, fy, z, h, rx, ry = info[j]
        if rx < 5 and R.random() < 0.8: continue
        up = R.random() < 0.55  # True = hanging from ceiling (-Y), False = rising from floor (+Y)
        off = R.uniform(-0.72, 0.72) * rx; right = Vector((math.cos(h), 0, math.sin(h)))
        L = R.uniform(0.9, 2.8) * (1.4 if rx > 8 else 0.7); w = L * R.uniform(0.14, 0.24)
        # Keep the center road walkable for ground stalagmites
        off_use = off
        if not up and abs(off_use) < 2.2:
            off_use = (2.3 + abs(off_use) * 0.5) * (1 if off_use >= 0 else -1)
            if abs(off_use) > 0.75 * rx: continue
        ceil = fy + 0.62 * ry + ry * math.sqrt(max(0.04, 1 - (off_use / rx) ** 2)) * 1.05
        base_y = min(14.45, ceil) if up else max(-2.35, fy - 0.15)
        cy_pos = base_y - L / 2 if up else base_y + L / 2
        if cy_pos - L / 2 < -2.48 or cy_pos + L / 2 > 14.52: continue
        loc_x, loc_z = x + right.x * off_use, z + right.z * off_use
        use_flow = (i % 3 == 0) or (216 <= s <= 270 and i % 2 == 0)
        chosen_mat = flowstone if use_flow else rock
        # Rotate cone +Z tip to point -Y (hanging stalactite) or +Y (standing stalagmite)
        rot_x = math.pi / 2 if up else -math.pi / 2
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=w, radius2=0.02, depth=L, location=(loc_x, cy_pos, loc_z), rotation=(rot_x, i * 0.7, 0))
        c = bpy.context.active_object
        c.data.materials.append(chosen_mat); objs.append(c)

    # Secondary detail pass: fluted karst pillars, twin stalactite icicles, and glowing crystal shards in Hyperspace Lane
    R2 = random.Random(1808)
    for j in range(6, len(info) - 6, 3):
        s, x, fy, z, h, rx, ry = info[j]
        right = Vector((math.cos(h), 0, math.sin(h)))
        fwd = Vector((math.sin(h), 0, -math.cos(h)))
        # Glowing cyan crystal clusters & ceiling draperies in Hyperspace Lane (s=216..270) and scattered caverns
        if (216 <= s <= 272) or (rx > 8 and j % 9 == 0):
            for side_sign in (-1, 1):
                off = side_sign * R2.uniform(0.38, 0.72) * rx
                ceil = fy + 0.62 * ry + ry * math.sqrt(max(0.04, 1 - (off / rx) ** 2)) * 1.05
                if ceil > 14.45: continue
                px, pz = x + right.x * off, z + right.z * off
                for k in range(3):
                    cl = R2.uniform(0.85, 1.75)
                    cw = cl * R2.uniform(0.11, 0.18)
                    dx = R2.uniform(-0.28, 0.28); dz = R2.uniform(-0.28, 0.28)
                    tilt_x = math.pi / 2 + R2.uniform(-0.18, 0.18)
                    tilt_z = R2.uniform(-0.18, 0.18)
                    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=cw, radius2=0.015, depth=cl, location=(px + dx, ceil - cl * 0.42, pz + dz), rotation=(tilt_x, k * 1.1, tilt_z))
                    cr = bpy.context.active_object
                    cr.data.materials.append(biolum if 216 <= s <= 272 else flowstone)
                    objs.append(cr)
        # Fluted floor-to-ceiling karst columns near chamber walls
        if rx >= 8.5 and j % 6 == 0:
            for side_sign in (-1, 1):
                if R2.random() < 0.45: continue
                off = side_sign * R2.uniform(0.58, 0.74) * rx
                ceil = fy + 0.62 * ry + ry * math.sqrt(max(0.04, 1 - (off / rx) ** 2)) * 1.06
                y0 = max(-2.35, fy - 0.2); y1 = min(14.45, ceil)
                col_h = y1 - y0
                if col_h < 2.0: continue
                rad = R2.uniform(0.28, 0.52)
                px, pz = x + right.x * off, z + right.z * off
                bpy.ops.mesh.primitive_cylinder_add(vertices=9, radius=rad, depth=col_h, location=(px, (y0 + y1) * 0.5, pz), rotation=(math.pi / 2, 0, 0))
                col = bpy.context.active_object
                col.data.materials.append(flowstone if R2.random() < 0.65 else rock)
                objs.append(col)

    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.join()
    out = {"stations": [], "road": []}
    for name, a, b in STATIONS:
        sa = [t for t in info if a <= t[0] <= b]; mid = sa[len(sa) // 2]
        out["stations"].append({"name": name, "s0": a, "s1": b, "x": round(mid[1], 2), "y": round(mid[2], 2), "z": round(mid[3], 2), "yaw": round(math.degrees(mid[4]), 1), "rx": round(mid[5], 1), "ry": round(mid[6], 1)})
    out["road"] = [[t[0], round(t[1], 2), round(t[2], 2), round(t[3], 2), round(math.degrees(t[4]), 1)] for t in info[::5]]
    return "cave_road", out

# ---------------------------------------------------------------- a cave spider (detailed Backrooms Arachnid, eight multi-jointed legs, glowing eye cluster, dorsal markings)
def build_spider():
    body = mat("spider", (0.05, 0.038, 0.032), 0.38, 0.25)
    joint = mat("joint", (0.18, 0.11, 0.07), 0.5, 0.15)
    mark = mat("mark", (0.78, 0.09, 0.04), 0.35, 0.1, emit=(0.65, 0.07, 0.02), emit_s=1.8)
    eyes = mat("eyes", (0.98, 0.08, 0.04), 0.2, 0.0, emit=(1.0, 0.14, 0.05), emit_s=4.0)
    fang = mat("fang", (0.42, 0.31, 0.19), 0.25, 0.35)

    def sph(loc, sc, m, rot=(0, 0, 0), segs=16, rings=12):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, location=loc, rotation=rot)
        o = bpy.context.active_object; o.scale = sc
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        return o

    def seg(a, b, r1, r2, m, verts=10):
        a, b = Vector(a), Vector(b); d = b - a
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2)
        o = bpy.context.active_object
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        return o

    # Abdomen (opisthosoma) - large bulbous rear sac with dorsal markings, spines, and spinnerets
    sph((0, 0.46, 0.38), (0.33, 0.49, 0.32), body, rot=(0.16, 0, 0), segs=20, rings=14)
    # Dorsal crimson chevron/hourglass markings sitting clearly on top of the abdomen carapace
    for k, (yk, zk, w, l) in enumerate([
        (0.22, 0.65, 0.14, 0.07),
        (0.36, 0.69, 0.21, 0.08),
        (0.52, 0.68, 0.17, 0.075),
        (0.67, 0.62, 0.11, 0.06),
    ]):
        sph((0, yk, zk), (w, l, 0.045), mark, rot=(-0.12 + k * 0.1, 0, 0), segs=12, rings=8)
    # Dorsal chitin spikes along abdomen flanks
    for sx in (-1, 1):
        for k, (yk, zk) in enumerate([(0.28, 0.58), (0.46, 0.61), (0.64, 0.55)]):
            seg((sx * 0.22, yk, zk), (sx * 0.31, yk + 0.08, zk + 0.11), 0.026, 0.004, fang)
    # Spinnerets at rear tip of abdomen
    for sx in (-1, 1):
        seg((sx * 0.065, 0.88, 0.26), (sx * 0.09, 1.00, 0.19), 0.04, 0.012, joint)
    # Pedicel (narrow waist connecting abdomen and cephalothorax)
    seg((0, 0.05, 0.29), (0, -0.04, 0.29), 0.095, 0.085, joint)

    # Cephalothorax (prosoma) - armored head/thorax plate with ocular turret
    sph((0, -0.14, 0.30), (0.24, 0.26, 0.175), body, segs=18, rings=12)
    sph((0, -0.25, 0.36), (0.135, 0.125, 0.105), body, segs=14, rings=10)  # ocular turret
    sph((0, -0.12, 0.465), (0.08, 0.14, 0.025), mark, segs=12, rings=8)     # cephalic crest mark

    # Chelicerae (heavy jaws) + curved venomous fangs + pedipalps (front feeler claws)
    for sx in (-1, 1):
        sph((sx * 0.07, -0.32, 0.26), (0.062, 0.09, 0.08), body, rot=(0.3, 0, sx * 0.15))
        seg((sx * 0.072, -0.35, 0.23), (sx * 0.048, -0.44, 0.08), 0.034, 0.005, fang)
        # Pedipalps (3-segment feelers flanking the jaws)
        p0 = (sx * 0.12, -0.27, 0.26)
        p1 = (sx * 0.25, -0.44, 0.36)
        p2 = (sx * 0.19, -0.56, 0.14)
        seg(p0, p1, 0.026, 0.021, body); sph(p1, (0.026, 0.026, 0.026), joint)
        seg(p1, p2, 0.021, 0.008, fang)

        # 8 glowing crimson eyes arranged in two curved rows on the ocular turret
        eye_layout = [
            (0.034, -0.362, 0.365, 0.027),  # large anterior median eye
            (0.080, -0.345, 0.360, 0.022),  # anterior lateral eye
            (0.048, -0.340, 0.415, 0.023),  # posterior median eye
            (0.098, -0.312, 0.402, 0.020),  # posterior lateral eye
        ]
        for ex, ey, ez, er in eye_layout:
            sph((sx * ex, ey, ez), (er, er, er), eyes, segs=10, rings=8)

    # 8 multi-jointed legs fanned out cleanly from front (-Y) to back (+Y)
    leg_angles = [-0.82, -0.26, 0.32, 0.88]  # radians in XY plane from lateral (+X/-X) axis
    leg_spans = [1.08, 1.02, 1.00, 1.12]
    for sx in (-1, 1):
        for k, (ang, span) in enumerate(zip(leg_angles, leg_spans)):
            ca, sa = math.cos(ang), math.sin(ang)
            coxa = (sx * 0.18, -0.22 + k * 0.08, 0.27)
            femur_top = (sx * (0.18 + 0.48 * ca), coxa[1] + 0.52 * sa, 0.68 + (0.05 if k in (1, 2) else 0.0))
            tibia_mid = (sx * (0.18 + 0.78 * ca), coxa[1] + 0.84 * sa, 0.36)
            foot = (sx * (0.18 + span * ca), coxa[1] + (span * 1.08) * sa, 0.015)

            sph(coxa, (0.044, 0.044, 0.044), joint, segs=10, rings=8)
            seg(coxa, femur_top, 0.038, 0.029, body)
            sph(femur_top, (0.034, 0.034, 0.034), joint, segs=10, rings=8)
            seg(femur_top, tibia_mid, 0.028, 0.020, body)
            sph(tibia_mid, (0.023, 0.023, 0.023), joint, segs=8, rings=6)
            seg(tibia_mid, foot, 0.019, 0.006, fang)

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
    bb = [Vector(v) for v in ob.bound_box]
    bmin = tuple(round(min(v[i] for v in bb), 2) for i in range(3))
    bmax = tuple(round(max(v[i] for v in bb), 2) for i in range(3))
    print("exported", path, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 1) for x in ob.dimensions), "box", bmin, bmax)
    return ob
def preview(name, ob, top=False):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = 1100; sc.render.resolution_y = 700; big = max(ob.dimensions)
    cam_d = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cam_d); bpy.context.collection.objects.link(cam)
    if top:
        pts = spine()
        _, x0, z0 = pts[116]; _, x1, z1 = pts[124]  # inside Hyperspace Lane (s=220..236)
        cam.location = Vector((x0, floor_y(220) + 2.2, z0))
        mid = Vector((x1, floor_y(236) + 2.0, z1))
        fwd = (mid - cam.location).normalized()
        up_v = Vector((0, 1, 0))
        right_v = fwd.cross(up_v).normalized()
        true_up = right_v.cross(fwd).normalized()
        from mathutils import Matrix
        rot_m = Matrix((right_v, true_up, -fwd)).transposed()
        cam.rotation_euler = rot_m.to_euler(); cam_d.lens = 22
    else:
        mid = Vector((0, 0.1, 0.32))
        cam.location = mid + Vector((big * 0.72, -big * 0.82, big * 0.55))
        cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler(); cam_d.lens = 38
    sc.camera = cam
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
