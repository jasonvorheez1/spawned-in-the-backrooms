# Level 178 "Kyoto Dreams" kit: shared Blender helpers. Helpers take ENGINE coords (x, y up, z; north = -z); Blender = (x, -z, y).
# box/cyl/lathe/blob make world-space meshes tagged with a node; export(name) writes node "body" as <name>.glb (origin 0)
# and every other node as <name>_<node>.glb with its origin at the pivot given (a moving leaf: its own row in the scene).
import bpy, bmesh, math, os, json, random
from mathutils import Vector, Matrix, noise
TEX = "/workspace/kyoto/tex"; OUT = "/workspace/kyoto/glb"; PROOF = "/workspace/kyoto/proof"; KIT = "/workspace/kyoto/kit.json"
M = {  # name: (texture, metres per tile, roughness, metal, colour, emission, alpha)
 "wood_dark": ("wood_dark", 1.4, .32, 0, None, None, 1), "wood_mid": ("wood_mid", 1.4, .5, 0, None, None, 1), "wood_light": ("wood_light", 1.2, .55, 0, None, None, 1),
 "wood_wet": ("wood_wet", 1.4, .2, 0, None, None, 1), "tatami": ("tatami", .9, .9, 0, None, None, 1), "border": (None, 1, .9, 0, (.035, .05, .04), None, 1),
 "washi": ("washi", .6, .9, 0, None, (.30, .28, .22), 1), "lampshade": ("washi", .3, .9, 0, None, (1.6, 1.05, .55), 1), "plaster": ("plaster", 2, .92, 0, None, None, 1),
 "ochre": ("plaster_ochre", 2, .92, 0, None, None, 1), "slate": ("slate", 1.6, .55, 0, None, None, 1), "subway": ("subway", .8, .18, 0, None, None, 1),
 "kawara": ("kawara", 1.2, .45, .1, None, None, 1), "flagstone": ("flagstone", 2.2, .45, 0, None, None, 1), "stone": ("stone", 1.2, .9, 0, None, None, 1),
 "mossrock": ("mossrock", 1.2, .95, 0, None, None, 1), "steel": ("steel", .6, .28, 1, None, None, 1), "bamboo": ("bamboo", .5, .4, 0, None, None, 1),
 "bark": ("bark", .6, .95, 0, None, None, 1), "leaf_green": ("leaf_green", .5, .8, 0, None, None, 1), "leaf_maple": ("leaf_maple", .5, .8, 0, None, None, 1),
 "azalea": ("azalea", .4, .85, 0, None, None, 1), "fab_indigo": ("fabric_indigo", .5, .95, 0, None, None, 1), "fab_stripe": ("fabric_stripe", .5, .95, 0, None, None, 1),
 "fab_check": ("fabric_check", .5, .95, 0, None, None, 1), "fab_white": ("fabric_white", .5, .95, 0, None, None, 1), "fab_kimono": ("fabric_kimono", .6, .9, 0, None, None, 1),
 "porcelain": ("porcelain", .22, .12, 0, None, None, 1), "scroll": ("scroll", 1, .9, 0, None, None, 1), "iron": (None, 1, .5, .9, (.03, .03, .035), None, 1),
 "brass": (None, 1, .3, 1, (.75, .55, .22), None, 1), "enamel": (None, 1, .25, 0, (.86, .87, .84), None, 1), "glass": (None, 1, .05, 0, (.75, .9, .9), None, .22),
 "lacquer": (None, 1, .15, 0, (.02, .02, .02), None, 1), "redlac": (None, 1, .2, 0, (.45, .04, .03), None, 1), "rope": (None, 1, .95, 0, (.5, .4, .25), None, 1),
 "blade": (None, 1, .15, 1, (.8, .82, .85), None, 1), "rubber": (None, 1, .8, 0, (.05, .05, .05), None, 1) }
MATS = {}; INFO = json.load(open(KIT)) if os.path.exists(KIT) else {}
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 480
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.75, .78, .85, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .7
def mat(name):
    if name in MATS: return MATS[name]
    tex, tile, rough, metal, color, emit, alpha = M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if tex:
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(f"{TEX}/{tex}.jpg", check_existing=True); nt.links.new(n.outputs[0], b.inputs["Base Color"])
    if color: b.inputs["Base Color"].default_value = (*color, 1)
    if emit:
        b.inputs["Emission Color"].default_value = (*[min(1, c) for c in emit], 1); b.inputs["Emission Strength"].default_value = max(emit)
        if tex: nt.links.new(n.outputs[0], b.inputs["Emission Color"])
    if alpha < 1: b.inputs["Alpha"].default_value = alpha; m.blend_method = "BLEND"
    MATS[name] = m; return m
def B(p): return Vector((p[0], -p[2], p[1]))   # engine -> blender
GI = {"x": 0, "z": 1, "y": 2}
def finish(bm, name, m, grain="x", node="body", bevel=0, smooth=False):
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); ob["node"] = node
    me.materials.append(mat(m)); tile = M[m][1]; uv = me.uv_layers.new(name="UVMap"); ox, oy = random.random(), random.random(); g = GI[grain]
    for p in me.polygons:
        p.use_smooth = True; n = p.normal; a = max(range(3), key=lambda i: abs(n[i])); ax = [i for i in range(3) if i != a]
        iu, iv = (g, ax[0] if ax[1] == g else ax[1]) if g in ax else ax
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = (co[iu] / tile + ox, co[iv] / tile + oy)
    ob["smooth"] = 1 if smooth else 0
    return ob
def box(sx, sy, sz, at=(0, 0, 0), m="wood_mid", grain="x", bevel=.005, node="body", name="p"):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(sx, sz, sy), verts=bm.verts); bmesh.ops.translate(bm, vec=B((at[0], at[1] + sy / 2, at[2])), verts=bm.verts)
    return finish(bm, name, m, grain, node, min(bevel, min(sx, sy, sz) * .3))
def cyl(r, h, at=(0, 0, 0), axis="y", m="wood_mid", seg=20, r2=None, node="body", grain=None, bevel=0, name="c", cap=True):
    # axis y: at = base centre; axis x/z: at = centre
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=cap, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if axis == "y": bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    elif axis == "x": bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"), verts=bm.verts)
    else: bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"), verts=bm.verts)
    bmesh.ops.translate(bm, vec=B(at), verts=bm.verts)
    return finish(bm, name, m, grain or axis, node, bevel, True)
def lathe(profile, at=(0, 0, 0), m="porcelain", seg=28, node="body", name="l"):
    # profile: [(radius, y)] bottom to top, revolved round engine Y
    bm = bmesh.new(); rings = []
    for r, y in profile:
        rings.append([bm.verts.new(B((at[0] + r * math.cos(2 * math.pi * i / seg), at[1] + y, at[2] + r * math.sin(2 * math.pi * i / seg)))) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if profile[0][0] > 1e-4: bm.faces.new(rings[0])
    if profile[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    return finish(bm, name, m, "y", node, 0, True)
def blob(r, at=(0, 0, 0), m="stone", scale=(1, 1, 1), rough=.25, freq=1.2, sub=3, node="body", seed=0, flat=None, name="b"):
    # a displaced icosphere: rocks, bushes, canopies. flat: clamp below this local y (sits on the ground)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    for v in bm.verts:
        d = 1 + rough * noise.noise(v.co * freq + Vector((seed * 7.1, seed * 3.3, seed))) + rough * .4 * noise.noise(v.co * freq * 3 + Vector((seed, 0, 0)))
        v.co = Vector((v.co.x * d * r * scale[0], v.co.y * d * r * scale[2], v.co.z * d * r * scale[1]))
        if flat is not None and v.co.z < flat: v.co.z = flat
    bmesh.ops.translate(bm, vec=B(at), verts=bm.verts)
    return finish(bm, name, m, "x", node, 0, True)
def sheet(pts, m, node="body", grain="x", thick=0, name="s"):
    # one polygon through engine points (a slope, a cloth panel); thick > 0 extrudes it downward along its normal
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(B(p)) for p in pts])
    if thick > 0:
        r = bmesh.ops.extrude_face_region(bm, geom=[f]); vs = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
        f.normal_update(); bmesh.ops.translate(bm, vec=f.normal * thick, verts=vs)
    return finish(bm, name, m, grain, node, 0)
def export(name, piv=None, proof=True):
    piv = piv or {}; sc = bpy.context.scene; obs = [o for o in sc.objects if o.type == "MESH"]; groups = {}
    for o in obs: groups.setdefault(o["node"], []).append(o)
    info = {}
    if proof: shoot(name, obs)
    for node, os_ in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for o in os_:
            o.data.set_sharp_from_angle(angle=math.radians(80 if o["smooth"] else 32)); o.select_set(True)
        bpy.context.view_layer.objects.active = os_[0]
        if len(os_) > 1: bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active; nm = name if node == "body" else f"{name}_{node}"; ob.name = nm
        md = ob.modifiers.new("wn", "WEIGHTED_NORMAL"); md.keep_sharp = True; bpy.ops.object.modifier_apply(modifier="wn")
        p = piv.get(node, (0, 0, 0)); ob.data.transform(Matrix.Translation(-B(p)))
        vs = [v.co for v in ob.data.vertices]; ob.data.calc_loop_triangles()
        lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
        info[nm] = {"pivot": [round(c, 4) for c in p], "min": [round(lo[0], 3), round(lo[2], 3), round(-hi[1], 3)], "max": [round(hi[0], 3), round(hi[2], 3), round(-lo[1], 3)], "tris": len(ob.data.loop_triangles)}
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{nm}.glb", use_selection=True, export_apply=True, export_yup=True, export_image_format="JPEG", export_jpeg_quality=85)
    for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
    INFO.update(info); json.dump(INFO, open(KIT, "w"), indent=0); print("KIT", name, {k: v["tris"] for k, v in info.items()})
def shoot(name, obs):
    sc = bpy.context.scene; lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in obs:
        for v in o.data.vertices:
            for i in range(3): lo[i] = min(lo[i], v.co[i]); hi[i] = max(hi[i], v.co[i])
    c = (lo + hi) / 2; s = max((hi - lo).length, .2)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); cam.data.lens = 50
    cam.location = c + Vector((.55, -.75, .45)).normalized() * s * 1.5; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    sc.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True); bpy.data.objects.remove(sun, do_unlink=True)
