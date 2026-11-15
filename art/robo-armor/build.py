# Backrooms Robotics gunslinger chassis (Shelly Nov 14 #386742/#386756): the robots are cats in removable robot armor.
# Built ON each cat body: the torso skin (hips to collar, shoulder caps, no arms past the elbow) lifted off along its normals,
# thickened into a plate, with a brass hem band and rivet studs. Faces keep the body's own bone weights, so it rides her rig.
# run: blender -b --factory-startup --python-exit-code 1 --python art/robo-armor/build.py -- f m
import bpy, bmesh, sys, math
from mathutils import Vector
SEXES = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else ["f", "m"]
def mat(name, col, metal, rough, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = col; b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = emit; b.inputs["Emission Strength"].default_value = 3
    return m
for sex in SEXES:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = bpy.data.objects["Body"]
    arm.data.pose_position = "REST"; bpy.context.view_layer.update()
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o is not body: bpy.data.objects.remove(o, do_unlink=True)
    zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]; H = max(zs) - min(zs); z0 = min(zs)
    xs = [abs((body.matrix_world @ v.co).x) for v in body.data.vertices]
    # torso band by share of height (feet 0 .. ears 1): hips to collar
    lo, hi = z0 + H * (0.40 if sex == "f" else 0.40), z0 + H * (0.635 if sex == "f" else 0.665)
    sh = body.data.copy(); ar = bpy.data.objects.new("Armor", sh); bpy.context.collection.objects.link(ar); ar.matrix_world = body.matrix_world
    ar.shape_key_clear() if sh.shape_keys else None
    bm = bmesh.new(); bm.from_mesh(sh)
    # find the torso half-width at chest height: arm verts are those farther out than the ribcage
    chest = [abs(v.co.x) for v in bm.verts if abs(v.co.z - (lo + hi) / 2) < H * 0.03]
    chest.sort(); rib = chest[int(len(chest) * 0.55)] if chest else 0.12
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        inz = lo < c.z < hi
        cap = c.z > hi - H * 0.06 and abs(c.x) < rib * 1.9   # shoulder caps reach a little onto the upper arm
        if not (inz and (abs(c.x) < rib * 1.25 or cap)): kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    # keep the biggest island (the tail root or a stray finger tip falls away)
    bm.verts.ensure_lookup_table(); seen = set(); best = []
    for v in bm.verts:
        if v in seen: continue
        isl = []; st = [v]; seen.add(v)
        while st:
            a = st.pop(); isl.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b not in seen: seen.add(b); st.append(b)
        if len(isl) > len(best): best = isl
    keep = set(best); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in keep], context="VERTS")
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * (0.022 if v.co.z < hi - H * 0.05 else 0.03)
    bm.to_mesh(sh); bm.free()
    for m in list(sh.materials): pass
    sh.materials.clear()
    ar.data.materials.append(mat("steel", (0.42, 0.45, 0.5, 1), 0.9, 0.32))
    ar.data.materials.append(mat("brass", (0.78, 0.55, 0.22, 1), 1.0, 0.3))
    for p in sh.polygons:
        c = p.center
        p.material_index = 1 if (c.z < lo + H * 0.03 or (abs(c.x) < 0.012)) else 0   # brass hem and the centre seam
    sm = ar.modifiers.new("sm", "SMOOTH"); sm.iterations = 6; sm.factor = 0.6
    so = ar.modifiers.new("so", "SOLIDIFY"); so.thickness = 0.012; so.offset = 1
    bpy.context.view_layer.objects.active = ar
    for m in list(ar.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    # rivets: brass studs along the hem and up the seam, each weighted to the nearest plate vertex's bones
    from mathutils.kdtree import KDTree
    kd = KDTree(len(sh.vertices))
    for i, v in enumerate(sh.vertices): kd.insert(v.co, i)
    kd.balance()
    studs = []
    hemz = lo + H * 0.03
    ring = [v for v in sh.vertices if abs(v.co.z - hemz) < H * 0.012]
    ring.sort(key=lambda v: math.atan2(v.co.y, v.co.x))
    for k in range(0, len(ring), max(1, len(ring) // 14)): studs.append(ring[k].co.copy() + ring[k].normal * 0.004)
    for k in range(6):
        z = lo + H * 0.06 + k * (hi - lo - H * 0.1) / 6
        cand = [v for v in sh.vertices if abs(v.co.z - z) < H * 0.01 and abs(v.co.x) < 0.03 and v.co.y < 0]
        if cand: c = min(cand, key=lambda v: v.co.y); studs.append(c.co.copy() + Vector((0.025, -0.002, 0))); studs.append(c.co.copy() + Vector((-0.025, -0.002, 0)))
    bm = bmesh.new(); bm.from_mesh(sh)
    dl = bm.verts.layers.deform.verify()
    for p in studs:
        _, src, _ = kd.find(p)
        w = dict(bm.verts[src][dl]) if hasattr(bm.verts, "ensure_lookup_table") and not bm.verts.ensure_lookup_table() else {}
        r = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.008)
        for v in r["verts"]: v.co += p; v[dl].clear(); [v[dl].__setitem__(g, x) for g, x in w.items()]
        for f in {f for v in r["verts"] for f in v.link_faces}: f.material_index = 1
    bm.to_mesh(sh); bm.free()
    for p in sh.polygons: p.use_smooth = True
    body.hide_render = True
    bpy.data.objects.remove(body, do_unlink=True)
    # proof
    arm.hide_render = True
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 16; s.render.resolution_x = s.render.resolution_y = 512
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.6, 1)
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam
    mid = (lo + hi) / 2; cam.location = (0.9, -1.4, mid + 0.25); d = Vector((0, 0, mid)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); s.collection.objects.link(l); l.rotation_euler = (0.7, 0.2, 0.6)
    s.render.filepath = f"/tmp/robo-{sex}.png"; bpy.ops.render.render(write_still=True)
    ar.parent = arm; ar.matrix_parent_inverse = arm.matrix_world.inverted()
    if not any(m.type == "ARMATURE" for m in ar.modifiers): ar.modifiers.new("skin", "ARMATURE").object = arm
    arm.data.pose_position = "POSE"
    for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
    bpy.ops.object.select_all(action="DESELECT"); ar.select_set(True); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"/workspace/robo/robochassis-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False)
    print("ARMOR", sex, "tris", sum(len(p.vertices) - 2 for p in sh.polygons), "studs", len(studs), "band", round(lo, 3), round(hi, 3), "rib", round(rib, 3))
