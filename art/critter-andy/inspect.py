# Look at the live critter male body (Dandy key on) beside Shelly's Eclipsed Andy reference.
import bpy, os, math
from mathutils import Vector
W = "/workspace/cr"; OUT = "/tmp/cra"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=p); return [o for o in bpy.data.objects if o not in before]
body = imp(f"{W}/body_m.glb")
meshes = [o for o in body if o.type == "MESH"]
print("MESHES", len(meshes), [o.name for o in meshes][:200])
for o in meshes:
    keys = o.data.shape_keys.key_blocks.keys() if o.data.shape_keys else []
    if "Dandy" in keys: o.data.shape_keys.key_blocks["Dandy"].value = 1
    show = o.name in ("Body",) or o.name.startswith(("Top_longsleeve", "Bot_pants", "Shoes_sneakers"))
    o.hide_render = not show
head = imp(f"{W}/head_cat_m.glb")
andy = imp(f"{W}/andy.glb")
for o in andy:
    if o.parent is None: o.location.x += 1.2
# report sizes
dg = bpy.context.evaluated_depsgraph_get()
def bb(objs):
    zs=[];xs=[]
    for o in objs:
        if o.type!="MESH" or o.hide_render: continue
        e=o.evaluated_get(dg); m=e.to_mesh()
        for v in m.vertices:
            w=o.matrix_world@v.co; zs.append(w.z); xs.append(w.x)
        e.to_mesh_clear()
    return (min(xs),max(xs),min(zs),max(zs)) if zs else None
print("BODY", bb(body+head)); print("ANDY", bb(andy))
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 900; sc.render.resolution_y = 700
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
w.node_tree.nodes["Background"].inputs[0].default_value = (0.25,0.25,0.28,1)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(l); l.data.energy = 3
for name, pos in (("front", (0.6, -4.2, 0.9)), ("side", (4.6, 0.6, 0.9)), ("back", (0.6, 4.2, 0.9))):
    cam.location = Vector(pos); d = Vector((0.6, 0, 0.75)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    l.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{OUT}/{name}.png"; bpy.ops.render.render(write_still=True)
