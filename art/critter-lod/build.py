# Critter body LOD: weld, then decimate every mesh to fit a whole-body triangle budget, keeping object, material,
# bone names, skin weights; shape keys (Bust) are carried onto the decimated mesh from the source by nearest vertices.
# blender -b --factory-startup --python-exit-code 1 --python art/critter-lod/build.py -- in.glb out.glb totalTris bodyTris proofprefix
import bpy, sys, math, mathutils
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index("--") + 1:]; src, dst, TOTAL, BODY, proof = a[0], a[1], int(a[2]), int(a[3]), a[4]
KEEP_SMALL = 400   # parts this small stay whole
def load(p):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p, merge_vertices=True)
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def sig():
    return {o.name: [tris(o), [m.name for m in o.data.materials], sorted(g.name for g in o.vertex_groups), [k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []] for o in bpy.context.scene.objects if o.type == "MESH"}
def bones(): return sorted(b.name for o in bpy.context.scene.objects if o.type == "ARMATURE" for b in o.data.bones)
def shoot(path, bust):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 520; sc.render.resolution_y = 700
    for o in sc.objects:
        if o.type == "MESH" and o.data.shape_keys and "Bust" in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks["Bust"].value = bust
    pts = [o.matrix_world @ mathutils.Vector(c) for o in sc.objects if o.type == "MESH" for c in o.bound_box]
    mn = mathutils.Vector([min(p[i] for p in pts) for i in range(3)]); mx = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
    ctr = (mn + mx) / 2; h = mx.z - mn.z
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(l); l.data.energy = 3.5
    w = bpy.data.worlds.new("w"); w.color = (0.5, 0.5, 0.5); sc.world = w
    for i, ang in enumerate((-30, 150)):
        r = math.radians(ang); d = h * 1.9
        cam.location = ctr + mathutils.Vector((math.sin(r) * d, -math.cos(r) * d, h * 0.15))
        cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler(); l.rotation_euler = (math.radians(50), 0, r)
        sc.render.filepath = f"{path}_{i}.png"; bpy.ops.render.render(write_still=True)
objs = load(src); s0 = sig(); b0 = bones(); shoot(proof + "_before", 1.0)
objs = load(src)
small = sum(tris(o) for o in objs if tris(o) <= KEEP_SMALL)
body = next(o for o in objs if o.name == "Body")
rest = [o for o in objs if tris(o) > KEEP_SMALL and o is not body]
rr = max(0.05, (TOTAL - BODY - small) / sum(tris(o) for o in rest))
for o in objs:
    t = tris(o)
    if t <= KEEP_SMALL: continue
    ratio = min(1.0, BODY / t) if o is body else rr
    keys = None
    if o.data.shape_keys:
        kb = o.data.shape_keys.key_blocks; base = [v.co.copy() for v in kb[0].data]
        keys = {k.name: [k.data[i].co - base[i] for i in range(len(base))] for k in kb[1:]}
        kd = KDTree(len(base)); [kd.insert(c, i) for i, c in enumerate(base)]; kd.balance()
        o.shape_key_clear()
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    m = o.modifiers.new("lod", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = ratio; m.use_collapse_triangulate = True
    with bpy.context.temp_override(object=o, active_object=o): bpy.ops.object.modifier_apply(modifier="lod")
    for p in o.data.polygons: p.use_smooth = True
    if keys:
        o.shape_key_add(name="Basis")
        for name, delta in keys.items():
            k = o.shape_key_add(name=name)
            for i, v in enumerate(o.data.vertices):
                near = kd.find_n(v.co, 3); ws = [1 / max(d, 1e-5) for _, _, d in near]; s = sum(ws)
                k.data[i].co = v.co + sum((delta[j] * (w / s) for (_, j, _), w in zip(near, ws)), mathutils.Vector())
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_skins=True, export_morph=True, export_animations=True)
objs = load(dst); s1 = sig(); b1 = bones(); shoot(proof + "_after", 1.0)
t0 = sum(v[0] for v in s0.values()); t1 = sum(v[0] for v in s1.values())
bad = [k for k in s0 if k not in s1 or s0[k][1:] != s1[k][1:]]
print("CLOD", src[-20:], "tris", t0, "->", t1, "body", s1["Body"][0], "meshes", len(s0), len(s1), "bones same", b0 == b1, "mismatch", bad[:8])
