# Fluff types for the new Tripo cats (Shelly Nov 11: "add different types of fluffs to them ... different types for customization").
# Each type is clumps of curved, tapered locks grown off the body surface (raycast onto the real Head/Body mesh), skinned to the cat's own armature,
# exported per sex as one glb with one slot "fluff" the game tints. blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/fluff.py
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = {"f": "/workspace/cathead/f-anime.glb", "m": "/workspace/cathead/m-anime.glb"}   # the anime-pass heads (head-sculpt.py)
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

def lock(bm, root, d, L, r, curl, side, rng, segs=9, ring=10, hug=None, flare=0.0, hugT=1.0):
    # one tapered lock: root sunk into the surface, grows along d, bends toward `curl`.
    # hug = the head's BVH: every point is kept just outside the skin, so the lock lies ON the head (fringe over the brow,
    # cheek fur combed back) and only its tip lifts by `flare`; its flat side faces the skin (Nov 11: chunky locks read blocky / stuck out like wings)
    d = d.normalized(); up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    t1 = d.cross(up).normalized()
    pts = []; p = root - d * 0.012; dirv = d.copy(); prev = None
    for i in range(segs + 1):
        t = i / segs; nrm = None
        if hug is not None and 0 < i and t <= hugT:   # past hugT the point is free: the tip flicks off the skin
            loc, n, _, _ = hug.find_nearest(p)
            if loc is not None:
                want = r * 0.45 + flare * t * t
                p = loc + n * want   # held at that height both ways: combed flat onto the head, never flaring off as a wing
                nrm = n
        if prev is not None and (p - prev).length > 1e-6: dirv = (p - prev).normalized()
        pts.append((p.copy(), dirv.copy(), nrm)); prev = p.copy()
        dirv = (dirv + curl * (1.0 / segs)).normalized(); p = p + dirv * (L / segs)
    rings = []
    for i, (c, dv, nrm) in enumerate(pts):
        if nrm is not None and abs(dv.dot(nrm)) < 0.95: a = dv.cross(nrm).normalized()
        else: a = dv.cross(up).normalized() if abs(dv.dot(up)) < 0.95 else t1
        b = dv.cross(a).normalized(); t = i / segs
        rad = r * (0.75 + 0.25 * math.sin(math.pi * min(1, t * 2.2) / 2)) * (1 - t) ** 0.85   # soft round root, long tapering point
        if i == segs: rings.append([bm.verts.new(c)]); continue
        rings.append([bm.verts.new(c + (a * math.cos(k * 2 * math.pi / ring) * (1.7 if hugT >= 1 else 1.3) + b * math.sin(k * 2 * math.pi / ring) * 0.55) * rad) for k in range(ring)])
    for i in range(segs - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(ring): bm.faces.new((A[k], A[(k + 1) % ring], B[(k + 1) % ring], B[k]))
    tip = rings[-1][0]; A = rings[-2]
    for k in range(ring): bm.faces.new((A[k], A[(k + 1) % ring], tip))
    bm.faces.new(list(reversed(rings[0])))

def grow(bm, bvh, centre, dirs, rng, L, r, n, spread, out_bias, curl_dir, lmul=None, hug=False, flare=0.0, hugT=1.0):
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
            lock(bm, h2, d, L * m, r * rng.uniform(0.85, 1.15), curl_dir * 0.8, 0, rng, hug=bvh if hug else None, flare=flare, hugT=hugT)

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
    # every type is a HEAD tuft (Shelly: "i wanted the tufts on the heads"): rays aimed from the skull's centre, roots on the skull
    sk = [v for v in hv if abs(v.x) < 0.2]; crown = max(v.z for v in sk); z0 = min(v.z for v in sk)
    C = Vector((0, sum(v.y for v in sk) / len(sk), (z0 + crown) / 2))
    def tuft(dirs, L, r, n, spread, bias, curl, hug=True, flare=0.012, hugT=1.0):
        grow(bm, hb, C, [Vector(d) for d in dirs], rng, L * S * 1.8, r * S * 1.2, n * 2, spread * S * 1.8 + 0.008 * S, bias, Vector(curl).normalized(), hug=hug, flare=flare * S, hugT=hugT)   # Nov 11 rework: twice the locks, slimmer, fanned: soft clumps not chunks
    for sx in (-1, 1):
        if kind == "cheeks":    # anime cat cheek fluff: three points out of the widest part of the face, below the eyes
            tuft([(sx, -0.45, -0.35), (sx, -0.2, -0.3), (sx, 0.05, -0.2)], 0.075, 0.022, 1, 0.006, 0.55, (sx, 0.25, -0.35), hugT=0.55)   # separate soft points flicking out, never one flap
        elif kind == "burns":   # big swept cheek fluff, a lion-cub ruff around the face, combed back
            tuft([(sx, -0.25, -0.4), (sx, 0.0, -0.3), (sx, 0.2, -0.15), (sx, 0.1, 0.05)], 0.11, 0.026, 2, 0.012, 0.35, (sx * 0.6, 0.75, -0.3), hugT=0.6)
        elif kind == "nape":    # tufts at the back of the skull, flicked out under the hairline
            tuft([(sx * 0.35, 1, -0.35), (sx * 0.7, 0.8, -0.2)], 0.09, 0.026, 2, 0.01, 0.45, (sx * 0.4, 0.6, -0.6), hugT=0.6)
    if kind == "crest":         # forelock: a flame of fur on the brow between the ears, curling up and forward
        tuft([(0, -0.55, 1), (0.18, -0.45, 1), (-0.18, -0.45, 1)], 0.1, 0.034, 1, 0.006, 0.55, (0, -0.35, 0.8), hug=False)
    elif kind == "cowlick":     # one fat curl on the crown, an anime ahoge
        tuft([(0, -0.15, 1)], 0.16, 0.03, 1, 0.0, 0.85, (0, -0.95, -0.2), hug=False)
        tuft([(0.12, 0.1, 1)], 0.09, 0.026, 1, 0.0, 0.7, (0.4, 0.6, 0.1), hug=False)
    elif kind == "bangs":       # fur bangs (Shelly: "fur bangs on the head would be nice too"): a fringe of pointed locks off the hairline, falling over the brow, parted in chunky anime spikes
        for x, L in ((-0.52, 0.7), (-0.42, 0.82), (-0.31, 0.95), (-0.2, 1.08), (-0.09, 1.0), (0.02, 1.12), (0.13, 1.04), (0.24, 1.1), (0.35, 0.92), (0.45, 0.8), (0.54, 0.68)):
            tuft([(x, -0.3, 1)], 0.17 * L, 0.03, 1, 0.0, 0.1, (x * 0.35, -0.6, -1), flare=0.01)   # eleven slim overlapping points, a soft fringe
    elif kind == "lynx":
        for sx in (-1, 1):
            ear = max((v for v in hv if v.x * sx > 0.05), key=lambda v: v.z)
            for k in range(3):
                d = Vector((sx * 0.25 + rng.uniform(-.15, .15), rng.uniform(-.1, .1), 1)).normalized()
                lock(bm, ear + Vector((rng.uniform(-.006, .006), rng.uniform(-.006, .006), -0.012)), d, 0.085 * S * rng.uniform(.8, 1.1), 0.022 * S, Vector((sx * 0.4, 0.2, 0)), 0, rng)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new("fluff"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("fluff", me); bpy.context.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    sub = o.modifiers.new("s", "SUBSURF"); sub.levels = 1; sub.render_levels = 1   # with 10-sided rings this already reads round
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier="s")
    mat = bpy.data.materials.new("fluff"); mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1)
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

import sys
KINDS = ["cheeks", "burns", "crest", "lynx", "nape", "cowlick", "bangs"]
if "--only" in sys.argv: KINDS = sys.argv[sys.argv.index("--only") + 1].split(",")
for sex in ("f", "m"):
    for kind in KINDS:
        arm = load(sex); o, nf = build(sex, kind, arm)
        for x in bpy.data.objects: x.select_set(False)
        o.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False)
        print("FLUFF", sex, kind, nf)
        if "--proof" in sys.argv: proof(sex, [o], f"{kind}-{sex}")
