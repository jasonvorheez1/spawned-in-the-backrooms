# Proof sheet for a cat hairstyle on its own body: FRONT, SIDE, BACK, 3/4, and SIDE with Hatted = 1; prints fit metrics.
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/hair-proof.py -- <dir with name.glb> <outdir> name:sex ...
import bpy, bmesh, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT, jobs = a[0], a[1], a[2:]
def headinfo(pts):
    bot = min(p.z for p in pts); top = max(p.z for p in pts if abs(p.x) < 0.02)
    band = [p for p in pts if p.z > top - (top - bot) * 0.45 and p.z < top + 0.005]
    xs = sorted(abs(p.x) for p in band); half = xs[int(len(xs) * 0.97)]
    return top, bot, half
for job in jobs:
    name, sex = job.split(":")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
    for o in list(bpy.context.scene.objects):
        if o.name.startswith("Icosphere"): bpy.data.objects.remove(o, do_unlink=True)
    head = bpy.data.objects["Head"]
    pts = [head.matrix_world @ v.co for v in head.data.vertices]
    top, bot, half = headinfo(pts)
    bm = bmesh.new(); bm.from_mesh(head.data); bm.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm)
    for k in head.data.shape_keys.key_blocks: k.value = 0
    head.data.shape_keys.key_blocks["Ear_Hide"].value = 1   # as the game shows it: own ears sunk, the sculpted pair on top
    bpy.ops.import_scene.gltf(filepath=f"/workspace/hairfit2/ears/upright-{sex}.glb")
    for o in list(bpy.context.scene.objects):
        if o.name.startswith("Icosphere"): bpy.data.objects.remove(o, do_unlink=True)
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    hair = [o for o in bpy.context.scene.objects if o not in before and o.type == "MESH" and not o.name.startswith("Icosphere")]
    for o in bpy.context.scene.objects:
        if o not in before and o.type == "MESH" and o not in hair: o.hide_render = True
    def flat(nm, col, rough=0.6):
        m = bpy.data.materials.new(nm); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; return m
    hm = flat("proofhair", (0.16, 0.07, 0.035)); sm = flat("proofskin", (0.85, 0.62, 0.45))
    for o in hair: o.data.materials.clear(); o.data.materials.append(hm)
    for o in before:
        if o.type == "MESH":
            for i, m in enumerate(o.data.materials):
                if m: o.data.materials[i] = sm
    info = []
    for o in hair:
        ks = [k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []
        M = o.matrix_world; P = [M @ v.co for v in o.data.vertices]
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        # metrics
        inside = 0; gaps = []; eye = 0
        for p in P:
            loc, nrm, idx, d = bvh.find_nearest(p)
            sgn = (p - loc).dot(nrm)
            if sgn < -0.002: inside += 1
            if p.z < top - 0.19 and p.y < -0.10 and abs(p.x) < 0.14: eye += 1
        # air gap: for skull directions on the upper dome, distance from skull to nearest hair vert
        c = Vector((0, 0.0, top - 0.2)); hb = bmesh.new(); hb.from_mesh(o.data); hb.transform(M); hbvh = BVHTree.FromBMesh(hb)
        import random; random.seed(1)
        for i in range(600):
            d = Vector((random.uniform(-1, 1), random.uniform(-.3, 1), random.uniform(.25, 1))).normalized()
            h = bvh.ray_cast(c, d)
            if not h[0]: continue
            h2 = hbvh.ray_cast(h[0] + d * 0.0005 - d*0.02, d)   # first hair surface outward from just under the skull
            if h2[0]: gaps.append((h2[0] - h[0]).dot(d))
        gaps.sort()
        xs = [p.x for p in P]
        g = lambda q: gaps[int(len(gaps) * q)] if gaps else -1
        info.append(f"{o.name} mats={[m.name for m in o.data.materials]} keys={ks} tris={tris} vg={[v.name for v in o.vertex_groups][:3]} inside={inside}/{len(P)} eyezone={eye} gap50={g(.5):.3f} gap90={g(.9):.3f} cover={len(gaps)}/600 x[{min(xs):.3f},{max(xs):.3f}] xmean={sum(xs)/len(xs):.3f} z[{min(p.z for p in P):.3f},{max(p.z for p in P):.3f}] y[{min(p.y for p in P):.3f},{max(p.y for p in P):.3f}]")
    print("INFO", name, sex, f"top={top:.3f} half={half:.3f}", " | ".join(info))
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 800; sc.render.use_border = True; sc.render.use_crop_to_border = True; sc.render.border_min_x = sc.render.border_min_y = 0.19; sc.render.border_max_x = sc.render.border_max_y = 0.81
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.55, .57, .62, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    aim = Vector((0, 0, top - 0.05))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); cam.data.lens = 50; sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3; sun.data.angle = 0.5
    views = [("1front", (0, -1, .08), 0), ("2side", (1, 0, .08), 0), ("3back", (0, 1, .12), 0), ("4q", (.7, -.7, .2), 0), ("5hatside", (.8, -.5, .25), 1), ("6top", (0.01, -.35, 1), 0)]
    for vn, d, hat in views:
        d = Vector(d).normalized(); cam.location = aim + d * 1.6
        cam.rotation_euler = (aim - cam.location).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (-(d + Vector((0.25, 0, .35)))).to_track_quat("-Z", "Y").to_euler()
        for o in hair:
            if o.data.shape_keys and "Hatted" in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks["Hatted"].value = hat
        sc.render.filepath = f"{OUT}/{name}_{vn}.png"; bpy.ops.render.render(write_still=True)
