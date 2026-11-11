# Fluff types for the new Tripo cats (Shelly Nov 11: "add different types of fluffs to them ... different types for customization").
# Each type is clumps of curved, tapered locks grown off the body surface (raycast onto the real Head/Body mesh), skinned to the cat's own armature,
# exported per sex as one glb with one slot "fluff" the game tints. blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/fluff.py
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = {"f": "/tmp/fl/f.glb", "m": "/tmp/fl/m.glb"}
OUT = "/workspace/catfluff"; os.makedirs(OUT + "/proof", exist_ok=True)

def load(sex):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC[sex])
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    if arm.animation_data: arm.animation_data.action = None
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name not in ("Body", "Head"): bpy.data.objects.remove(o)
    return arm

def bvh_of(o):
    me = o.data; M = o.matrix_world
    return BVHTree.FromPolygons([M @ v.co for v in me.vertices], [p.vertices[:] for p in me.polygons])

def lock(bm, root, d, L, r, curl, side, rng, segs=5, ring=6):
    # one tapered lock: root on the surface (sunk 6 mm), grows along d, bends toward `curl`
    d = d.normalized(); up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    t1 = d.cross(up).normalized(); t2 = d.cross(t1).normalized()
    pts = []; p = root - d * 0.006; dirv = d.copy()
    for i in range(segs + 1):
        pts.append((p.copy(), dirv.copy())); dirv = (dirv + curl * (1.0 / segs)).normalized(); p = p + dirv * (L / segs)
    rings = []
    for i, (c, dv) in enumerate(pts):
        a = dv.cross(up).normalized() if abs(dv.dot(up)) < 0.95 else t1
        b = dv.cross(a).normalized(); rad = r * math.sin(math.pi * (0.35 + 0.65 * i / segs)) ** 0.7 * (1 - 0.15 * i / segs)
        if i == segs: rings.append([bm.verts.new(c)]); continue
        rings.append([bm.verts.new(c + (a * math.cos(k * 2 * math.pi / ring) * 2.1 + b * math.sin(k * 2 * math.pi / ring) * 0.55) * rad) for k in range(ring)])
    for i in range(segs - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(ring): bm.faces.new((A[k], A[(k + 1) % ring], B[(k + 1) % ring], B[k]))
    tip = rings[-1][0]; A = rings[-2]
    for k in range(ring): bm.faces.new((A[k], A[(k + 1) % ring], tip))
    bm.faces.new(list(reversed(rings[0])))

def grow(bm, bvh, centre, dirs, rng, L, r, n, spread, out_bias, curl_dir, lmul=None):
    # a clump: n locks fanned around the surface point hit by each ray from `centre`
    for ray in dirs:
        hit, nrm, _, _ = bvh.ray_cast(centre + ray.normalized() * 0.6, -ray.normalized(), 1.2)
        if hit is None: continue
        t1 = nrm.cross(Vector((0, 0, 1))).normalized(); t2 = nrm.cross(t1).normalized()
        for k in range(n):
            o = (t1 * rng.uniform(-1, 1) + t2 * rng.uniform(-1, 1)) * spread
            h2, n2, _, _ = bvh.ray_cast(hit + o + nrm * 0.1, -nrm, 0.3)
            if h2 is None: continue
            d = (n2 * out_bias + curl_dir * (1 - out_bias) + Vector((rng.uniform(-.2, .2), rng.uniform(-.2, .2), rng.uniform(-.2, .2)))).normalized()
            m = (lmul(k, n) if lmul else 1) * rng.uniform(0.75, 1.15)
            lock(bm, h2, d, L * m, r * rng.uniform(0.85, 1.15), curl_dir * 0.8, 0, rng)

def build(sex, kind, arm):
    H = bpy.data.objects["Head"]; B = bpy.data.objects["Body"]
    hv = [H.matrix_world @ v.co for v in H.data.vertices]; bv = [B.matrix_world @ v.co for v in B.data.vertices]
    hb = bvh_of(H); bb = bvh_of(B); rng = random.Random(7 if sex == "f" else 11)
    zmin = min(v.z for v in hv); zmax = max(v.z for v in hv)
    core = [v for v in hv if abs(v.x) < 0.2 and v.z < zmin + 0.62 * (zmax - zmin)]
    cz = sum(v.z for v in core) / len(core); cy = sum(v.y for v in core) / len(core); C = Vector((0, cy, cz))
    hh = max(v.z for v in core) - min(v.z for v in core); S = hh / 0.45      # head scale: 1 on the girl
    neck = arm.matrix_world @ arm.data.bones["mixamorig:Neck"].head_local
    bm = bmesh.new(); bone = "mixamorig:Head"
    if kind in ("cheeks", "burns"):
        for sx in (-1, 1):
            if kind == "cheeks":
                dirs = [Vector((sx, -0.55, -0.25)), Vector((sx, -0.2, -0.45))]
                grow(bm, hb, C, dirs, rng, 0.085 * S, 0.055 * S, 2, 0.02 * S, 0.3, Vector((sx * 0.7, 0.15, -0.55)).normalized())
            else:
                dirs = [Vector((sx, -0.3, -0.1)), Vector((sx, -0.1, -0.35)), Vector((sx, 0.15, -0.2))]
                grow(bm, hb, C, dirs, rng, 0.115 * S, 0.055 * S, 2, 0.025 * S, 0.25, Vector((sx * 0.55, 0.45, -0.6)).normalized())
    elif kind == "crest":
        top = Vector((0, cy - 0.02, zmax + 0.5))
        dirs = [Vector((0, -0.45, 1)), Vector((0.25, -0.3, 1)), Vector((-0.25, -0.3, 1)), Vector((0, -0.15, 1))]
        grow(bm, hb, C, dirs, rng, 0.11 * S, 0.05 * S, 1, 0.01 * S, 0.45, Vector((0, 0.55, 0.35)).normalized())
    elif kind == "lynx":
        for sx in (-1, 1):
            ear = max((v for v in hv if v.x * sx > 0.05), key=lambda v: v.z)
            for k in range(3):
                d = Vector((sx * 0.25 + rng.uniform(-.15, .15), rng.uniform(-.1, .1), 1)).normalized()
                lock(bm, ear + Vector((rng.uniform(-.006, .006), rng.uniform(-.006, .006), -0.012)), d, 0.085 * S * rng.uniform(.8, 1.1), 0.022 * S, Vector((sx * 0.4, 0.2, 0)), 0, rng)
    elif kind == "ruff":
        bone = "mixamorig:Spine2"; nc = Vector((0, neck.y, neck.z - 0.03 * S))
        dirs = [Vector((math.sin(a), -math.cos(a), -0.15)) for a in [math.radians(x) for x in range(-80, 81, 32)]]
        grow(bm, bb, nc, dirs, rng, 0.1 * S, 0.065 * S, 2, 0.02 * S, 0.25, Vector((0, -0.35, -0.9)).normalized())
    elif kind == "mane":
        bone = "mixamorig:Neck"; nc = Vector((0, neck.y, neck.z + 0.02 * S))
        dirs = [Vector((math.sin(a), math.cos(a), 0.1)) for a in [math.radians(x) for x in range(-100, 101, 40)]]
        grow(bm, bb, nc, dirs + [Vector((math.sin(a), -math.cos(a), 0.1)) for a in [math.radians(x) for x in (-60, -20, 20, 60)]], rng, 0.11 * S, 0.065 * S, 2, 0.025 * S, 0.3, Vector((0, 0.6, -0.75)).normalized())
    me = bpy.data.meshes.new("fluff"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("fluff", me); bpy.context.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    sub = o.modifiers.new("s", "SUBSURF"); sub.levels = 1; sub.render_levels = 1
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier="s")
    mat = bpy.data.materials.new("fluff"); mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1.0, 0.62, 0.22, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    me.materials.append(mat)
    g = o.vertex_groups.new(name=bone); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
    o.parent = arm; o.modifiers.new("skin", "ARMATURE").object = arm
    return o, len(me.polygons)

def proof(sex, objs, tag):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 460
    if not sc.world: sc.world = bpy.data.worlds.new("w")
    sc.world.color = (0.5, 0.5, 0.52)
    fm = bpy.data.materials.new("f"); fm.use_nodes = True; fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.9, 0.42, 0.08, 1)
    for n in ("Body", "Head"):
        ob = bpy.data.objects[n]; ob.data.materials.clear(); ob.data.materials.append(fm)
    sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sc.collection.objects.link(sun); sun.rotation_euler = (0.9, 0.2, -0.5); sun.data.energy = 3
    z = 0.95 if sex == "f" else 1.0
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    e = bpy.data.objects.new("e", None); sc.collection.objects.link(e); e.location = (0, 0, z - 0.2); cam.constraints.new("TRACK_TO").target = e
    out = []
    for i, p in enumerate([(0, -1.9, z), (1.4, -1.3, z), (1.7, 0.9, z)]):
        cam.location = p; sc.render.filepath = f"{OUT}/proof/{tag}_{i}.png"; bpy.ops.render.render(write_still=True); out.append(sc.render.filepath)
    return out

KINDS = ["cheeks", "burns", "crest", "lynx", "ruff", "mane"]
import sys
for sex in ("f", "m"):
    for kind in KINDS:
        arm = load(sex); o, nf = build(sex, kind, arm)
        for x in bpy.data.objects: x.select_set(False)
        o.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False)
        print("FLUFF", sex, kind, nf)
        if "--proof" in sys.argv: proof(sex, [o], f"{kind}-{sex}")
