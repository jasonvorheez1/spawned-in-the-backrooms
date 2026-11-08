# Critter body LOD: decimate every mesh without shape keys to RATIO, keeping names, materials, armature, weights.
# blender -b --factory-startup --python-exit-code 1 --python art/critter-lod/build.py -- in.glb out.glb ratio proofprefix
import bpy, sys, math, mathutils, json
a = sys.argv[sys.argv.index("--") + 1:]; src, dst, ratio, proof = a[0], a[1], float(a[2]), a[3]
def load(p):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]
def sig():
    ms = sorted(o for o in bpy.context.scene.objects if o.type == "MESH") if False else [o for o in bpy.context.scene.objects if o.type == "MESH"]
    return {o.name: [len(o.data.polygons) and sum(len(p.vertices) - 2 for p in o.data.polygons), [m.name for m in o.data.materials], len(o.vertex_groups), bool(o.data.shape_keys)] for o in ms}
def bones():
    return sorted(b.name for o in bpy.context.scene.objects if o.type == "ARMATURE" for b in o.data.bones)
def shoot(path):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 520; sc.render.resolution_y = 700
    pts = [o.matrix_world @ mathutils.Vector(c) for o in sc.objects if o.type == "MESH" and o.visible_get() for c in o.bound_box]
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
objs = load(src); s0 = sig(); b0 = bones(); shoot(proof + "_before")
objs = load(src)
for o in objs:
    if o.data.shape_keys or len(o.data.polygons) < 60: continue
    m = o.modifiers.new("lod", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = ratio; m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    with bpy.context.temp_override(object=o, active_object=o): bpy.ops.object.modifier_apply(modifier="lod")
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_skins=True, export_morph=True, export_animations=True)
objs = load(dst); s1 = sig(); b1 = bones(); shoot(proof + "_after")
t0 = sum(v[0] for v in s0.values()); t1 = sum(v[0] for v in s1.values())
bad = [k for k in s0 if k not in s1 or s0[k][1] != s1[k][1] or s0[k][2] != s1[k][2] or s0[k][3] != s1[k][3]]
print("CLOD", src[-20:], "tris", t0, "->", t1, "meshes", len(s0), len(s1), "bones same", b0 == b1, len(b0), "mismatch", bad[:8], "shapekeyed", [k for k in s0 if s0[k][3]])
