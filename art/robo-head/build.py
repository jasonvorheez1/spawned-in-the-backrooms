# Backrooms Robotics unit head fittings (Shelly Nov 15 "they should look like robots"): lamp eyes, speaker grille, brow seam with rivets, cheek seams, a brass antenna.
# Fitted per cat body by rays onto the skull, skinned to mixamorig:Head. Slots: lamp, brass, seam, grille.
# run: cd /workspace && blender -b --factory-startup --python-exit-code 1 --python <world>/art/robo-head/build.py
import bpy, bmesh, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
OUT = "/workspace/robohead"
def mat(n, c, em=0, metal=0.9, rough=0.35):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if em: b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = em
    return m
def obj(bm, name, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return o
def frame(n):   # a matrix whose +Z is n
    return n.to_track_quat("Z", "Y").to_matrix().to_4x4()
def tube(bm, pts, r, closed=False, seg=8):
    rings = []
    N = len(pts)
    for i, p in enumerate(pts):
        a = pts[(i - 1) % N] if (closed or i > 0) else p; b = pts[(i + 1) % N] if (closed or i < N - 1) else p
        t = (b - a).normalized(); q = t.to_track_quat("Z", "Y")
        rings.append([bm.verts.new(p + q @ Vector((r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg), 0))) for k in range(seg)])
    for i in range(N if closed else N - 1):
        A, B = rings[i], rings[(i + 1) % N]
        for k in range(seg): bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
for sex in ("f", "m"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath="/workspace/catrev/body%s.glb" % sex)
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE"); head = bpy.data.objects["Head"]
    kb = head.data.shape_keys.key_blocks if head.data.shape_keys else {}
    if "Ear_Hide" in kb: kb["Ear_Hide"].value = 1
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); me = head.evaluated_get(dg).to_mesh()
    g = head.vertex_groups.get("mixamorig:Head")
    pts = [head.matrix_world @ v.co for v, sv in zip(me.vertices, head.data.vertices) if max([e.weight for e in sv.groups if e.group == g.index] or [0]) > 0.5]
    bm0 = bmesh.new(); bm0.from_mesh(me); bm0.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm0)
    bot = min(p.z for p in pts); top = max(p.z for p in pts if abs(p.x) < 0.02); h = top - bot
    xs = sorted(abs(p.x) for p in pts if p.z > top - h * 0.45); half = xs[int(len(xs) * 0.97)]
    yc = sum(p.y for p in pts) / len(pts)
    print("HEAD", sex, "bot", round(bot, 3), "top", round(top, 3), "half", round(half, 3), "yc", round(yc, 3))
    front = lambda x, z: bvh.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)))
    M = dict(lamp=mat("lamp", (1, 0.12, 0.05), em=6, metal=0), brass=mat("brass", (0.78, 0.57, 0.2)), seam=mat("seam", (0.06, 0.06, 0.07), rough=0.6), grille=mat("grille", (0.1, 0.1, 0.11), rough=0.5))
    parts = []
    # lamp eyes: a brass bezel and a domed red lens, laid on the skin's normal
    for sx in (-1, 1):
        loc, nrm = front(sx * half * 0.40, bot + h * 0.50)[:2]; R = half * 0.21; F = Matrix.Translation(loc) @ frame(nrm)
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=R); bmesh.ops.scale(bm, vec=(1, 1, 0.45), verts=bm.verts); bm.transform(F); parts.append(obj(bm, "lamp", M["lamp"]))
        bm = bmesh.new(); tube(bm, [Vector((R * 1.05 * math.cos(2 * math.pi * i / 28), R * 1.05 * math.sin(2 * math.pi * i / 28), R * 0.1)) for i in range(28)], R * 0.2, closed=True); bm.transform(F); parts.append(obj(bm, "bezel", M["brass"]))
    # speaker grille: a dark oval plate with raised bars, under the nose
    loc, nrm = front(0, bot + h * 0.17)[:2]; F = Matrix.Translation(loc) @ frame(nrm); gw, gh = half * 0.34, h * 0.075
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=10, radius=1); bmesh.ops.scale(bm, vec=(gw, gh, 0.012), verts=bm.verts); bm.transform(F); parts.append(obj(bm, "grilleplate", M["grille"]))
    bm = bmesh.new()
    for k in range(-2, 3):
        x = k * gw * 0.36; hh = gh * math.sqrt(max(0.05, 1 - (x / gw) ** 2)) * 0.85
        tube(bm, [Vector((x, -hh + 2 * hh * i / 6, 0.012)) for i in range(7)], gw * 0.07, seg=6)
    tube(bm, [Vector((gw * 1.04 * math.cos(2 * math.pi * i / 32), gh * 1.08 * math.sin(2 * math.pi * i / 32), 0.004)) for i in range(32)], gw * 0.07, closed=True)
    bm.transform(F); parts.append(obj(bm, "grillebars", M["brass"]))
    # seams: a brow ring round the skull, a jaw line cheek to cheek, each riveted
    def ring(z, a0, a1, n):
        out = []
        for i in range(n):
            a = a0 + (a1 - a0) * i / (n - 1 if a1 - a0 < 2 * math.pi - 1e-3 else n); d = Vector((math.sin(a), -math.cos(a), 0))
            hit = bvh.ray_cast(Vector((0, yc, z)) + d * 2, -d)
            if hit[0] is not None: out.append((hit[0], hit[1]))
        return out
    for z, a0, a1, n, closed in ((bot + h * 0.74, 0, 2 * math.pi, 56, True), (bot + h * 0.30, math.radians(42), math.radians(150), 22, False), (bot + h * 0.30, math.radians(-150), math.radians(-42), 22, False)):
        rp = ring(z, a0, a1, n)
        bm = bmesh.new(); tube(bm, [p + nn * 0.001 for p, nn in rp], 0.0035, closed=closed, seg=6); parts.append(obj(bm, "seam", M["seam"]))
        bm = bmesh.new()
        for i, (p, nn) in enumerate(rp):
            if i % 4 != 2: continue
            for dz in (-0.014, 0.014):
                hit = bvh.ray_cast(p + Vector((0, 0, dz)) + nn * 0.3, -nn)
                if hit[0] is None: continue
                r = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.0062)
                bmesh.ops.scale(bm, vec=(1, 1, 0.6), verts=r["verts"]); bmesh.ops.transform(bm, matrix=Matrix.Translation(hit[0]) @ frame(hit[1]), verts=r["verts"])
        parts.append(obj(bm, "rivets", M["brass"]))
    # antenna: a brass rod and ball off the back of the skull, clear of a hat's brim
    a = math.radians(152); d = Vector((math.sin(a), -math.cos(a), 0)); hit = bvh.ray_cast(Vector((0, yc, bot + h * 0.56)) + d * 2, -d)
    if hit[0] is not None:
        dirv = (d * 0.75 + Vector((0, 0, 0.66))).normalized(); p0 = hit[0] - dirv * 0.01; L = h * 0.75
        bm = bmesh.new(); tube(bm, [p0 + dirv * L * i / 6 for i in range(7)], 0.006, seg=8)
        r = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=0.017); bmesh.ops.translate(bm, vec=p0 + dirv * L, verts=r["verts"])
        r = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=0.022); bmesh.ops.scale(bm, vec=(1, 1, 0.5), verts=r["verts"]); bmesh.ops.transform(bm, matrix=Matrix.Translation(hit[0]) @ frame(hit[1]), verts=r["verts"])
        parts.append(obj(bm, "antenna", M["brass"]))
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); kit = bpy.context.view_layer.objects.active; kit.name = "robohead"
    # proof: front 3/4 with the head under it
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.collection.objects.link(cam); cam.data.lens = 70
    cam.location = (0.55, -1.25, bot + h * 0.6); cam.rotation_euler = (Vector((0, yc, bot + h * 0.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sun.rotation_euler = (math.radians(60), 0, math.radians(25)); bpy.context.collection.objects.link(sun)
    sc = bpy.context.scene; sc.camera = cam; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 640
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1)
    sc.render.filepath = f"{OUT}/proof-{sex}.png"; bpy.ops.render.render(write_still=True)
    for o in list(sc.objects):
        if o.type in ("MESH",) and o != kit: bpy.data.objects.remove(o)
    if arm.animation_data: arm.animation_data.action = None
    for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
    vg = kit.vertex_groups.new(name="mixamorig:Head"); vg.add(list(range(len(kit.data.vertices))), 1.0, "REPLACE")
    kit.parent = arm; kit.modifiers.new("skin", "ARMATURE").object = arm
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/robohead-{sex}.glb", export_skins=True, export_animations=False, export_apply=False)
    print("KIT", sex, "tris", sum(len(p.vertices) - 2 for p in kit.data.polygons))
