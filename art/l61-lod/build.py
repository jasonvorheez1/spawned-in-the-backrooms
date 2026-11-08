# Level 6.1 lighter models: decimate (Collapse) a fetched .glb to a triangle target, keep slots/names, proof before vs after from ~2 m.
# usage: blender -b --factory-startup --python-exit-code 1 --python art/l61-lod/build.py -- <in.glb> <out.glb> <targetTris> <proofPrefix>
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index("--") + 1:]
src, dst, target, proof = a[0], a[1], int(a[2]), a[3]
def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]
def tris(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    return sum(len(o.evaluated_get(dg).data.loop_triangles) for o in objs)
def shoot(path):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
    sc.render.resolution_x = sc.render.resolution_y = 520
    ms = [o for o in sc.objects if o.type == "MESH"]
    pts = [o.matrix_world @ mathutils.Vector(c) for o in ms for c in o.bound_box]
    mn = mathutils.Vector([min(p[i] for p in pts) for i in range(3)]); mx = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
    ctr = (mn + mx) / 2; size = (mx - mn).length
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 35
    d = max(2.0, size * 1.1)
    for i, ang in enumerate((-35, 35)):  # front 3/4 both sides, Blender front is -Y
        r = math.radians(ang)
        cam.location = ctr + mathutils.Vector((math.sin(r) * d, -math.cos(r) * d, size * 0.25))
        cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler()
        if not any(o.type == "LIGHT" for o in sc.objects):
            l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(l); l.data.energy = 3.5
            w = bpy.data.worlds.new("w"); w.color = (0.45, 0.45, 0.45); sc.world = w
        sc.objects["sun"].rotation_euler = (math.radians(50), 0, r)
        sc.render.filepath = f"{path}_{i}.png"; bpy.ops.render.render(write_still=True)
objs = load(); before = tris(objs); shoot(proof + "_before")
objs = load()
ratio = min(1.0, target / before)
for o in objs:
    if o.data.shape_keys: continue
    m = o.modifiers.new("lod", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = ratio; m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="lod")
after = tris(objs); shoot(proof + "_after")
bpy.ops.export_scene.gltf(filepath=dst, export_apply=True)
print("LOD", src, "before", before, "after", after, "ratio", round(ratio, 3))
