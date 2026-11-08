# Critter body LOD v2: hit a whole-file triangle budget. Every mesh keeps its name, materials, vertex groups (weights), armature;
# shape-keyed meshes are decimated on the basis and every key is re-projected (barycentric on the original basis triangle).
# blender -b --factory-startup --python-exit-code 1 --python art/critter-lod/build2.py -- in.glb out.glb budget bodyRatio proofprefix
import bpy, sys, math, mathutils, bmesh
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
a = sys.argv[sys.argv.index("--") + 1:]; src, dst, budget, bodyR, proof = a[0], a[1], int(a[2]), float(a[3]), a[4]
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def load(p):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]
def shoot(path, show):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 480; sc.render.resolution_y = 640
    for o in sc.objects:
        if o.type == "MESH": o.hide_render = not (o.name in show)
    pts = [o.matrix_world @ mathutils.Vector(c) for o in sc.objects if o.type == "MESH" and not o.hide_render for c in o.bound_box]
    mn = mathutils.Vector([min(p[i] for p in pts) for i in range(3)]); mx = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
    ctr = (mn + mx) / 2; h = mx.z - mn.z
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(l); l.data.energy = 3.5
    w = bpy.data.worlds.new("w"); w.color = (0.5, 0.5, 0.5); sc.world = w
    for i, ang in enumerate((-30, 150)):
        r = math.radians(ang); d = h * 1.9
        cam.location = ctr + mathutils.Vector((math.sin(r) * d, -math.cos(r) * d, h * 0.15))
        cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler(); l.rotation_euler = (math.radians(50), 0, r)
        sc.render.filepath = f"{path}_{i}.png"; bpy.ops.render.render(write_still=True)
SHOW = ("Body", "Top_tee", "Bot_shorts", "Shoes_sneakers", "Top_dress", "Bot_skirt", "Hat_beanie")
objs = load(src); t0 = sum(tris(o) for o in objs)
show = [n for n in SHOW if n in [o.name for o in objs]]
shoot(proof + "_before", show[:4] if "Top_tee" in show else show)
objs = load(src)
fixed = sum(tris(o) for o in objs if o.name != "Body" and tris(o) < 700)
body = next(o for o in objs if o.name == "Body"); bodyT = int(tris(body) * bodyR)
big = [o for o in objs if o.name != "Body" and tris(o) >= 700]
r = max(0.08, (budget - fixed - bodyT) / max(1, sum(tris(o) for o in big)))
print("CLOD2 ratio clothes", round(r, 3), "body", bodyR)
def decimate(o, ratio):
    keys = o.data.shape_keys
    saved = None
    if keys:
        kb = keys.key_blocks; basis = kb[0]
        bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table(); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.faces.ensure_lookup_table()
        base_co = [v.co.copy() for v in basis.data]
        tri = [[v.index for v in f.verts] for f in bm.faces]
        tree = BVHTree.FromPolygons(base_co, tri)
        saved = [(k.name, k.value, k.relative_key.name, k.slider_min, k.slider_max, k.vertex_group, k.mute, [v.co.copy() for v in k.data]) for k in kb[1:]]
        bm.free()
        o.shape_key_clear()
    m = o.modifiers.new("lod", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = ratio; m.use_collapse_triangulate = True
    o.modifiers.move(o.modifiers.find("lod"), 0)
    bpy.context.view_layer.objects.active = o
    with bpy.context.temp_override(object=o, active_object=o): bpy.ops.object.modifier_apply(modifier="lod")
    if saved:
        o.shape_key_add(name=basis.name, from_mix=False)
        newco = [v.co.copy() for v in o.data.vertices]
        hits = []
        for c in newco:
            loc, nrm, fi, d = tree.find_nearest(c)
            t = tri[fi]; hits.append((t, loc))
        for (name, val, rel, smin, smax, vg, mute, kco) in saved:
            k = o.shape_key_add(name=name, from_mix=False); k.slider_min, k.slider_max, k.value, k.vertex_group, k.mute = smin, smax, val, vg, mute
            for i, (t, loc) in enumerate(hits):
                p = barycentric_transform(loc, base_co[t[0]], base_co[t[1]], base_co[t[2]], kco[t[0]], kco[t[1]], kco[t[2]])
                k.data[i].co = newco[i] + (p - loc)
        for (name, val, rel, *_r) in saved:
            if rel in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks[name].relative_key = o.data.shape_keys.key_blocks[rel]
decimate(body, bodyR)
for o in big: decimate(o, r)
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_skins=True, export_morph=True, export_animations=True)
objs = load(dst); t1 = sum(tris(o) for o in objs)
print("CLOD2", src, "tris", t0, "->", t1, "body", tris(next(o for o in objs if o.name == "Body")), "keys", {o.name: len(o.data.shape_keys.key_blocks) for o in objs if o.data.shape_keys})
shoot(proof + "_after", show[:4] if "Top_tee" in show else show)
