# art/weapon-split/pistol.py: the Tripo pistol cut into frame, slide and magazine so the reload moves real parts.
# slide: every face above the frame rail (z > 0.062); mag: the floor plate below the grip plus a steel body inside it.
import bpy, bmesh, json, mathutils as mu
SRC, OUT = "/workspace/wpn/pistol.glb", "/workspace/wpn/out"
import os; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = src.data
cent = [p.center.copy() for p in me.polygons]
part = ["slide" if c.z > 0.062 else "mag" if c.z < -0.072 else "frame" for c in cent]
# the grip's line from its centroids at two heights: the mag body runs along it
def ring(z0, z1):
    vs = [v.co for v in me.vertices if z0 < v.co.z < z1]
    return sum(vs, mu.Vector()) / len(vs), max(v.y for v in vs) - min(v.y for v in vs)
lo, wlo = ring(-0.075, -0.06); hi, whi = ring(-0.005, 0.01)
objs = {}
for name in ("frame", "slide", "mag"):
    o = src.copy(); o.data = me.copy(); o.name = name; bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f, pp in zip(bm.faces, part) if pp != name], context="FACES")
    bm.to_mesh(o.data); bm.free(); objs[name] = o
# the magazine body: a steel box down the grip, hidden while seated, seen when it drops
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
body = bpy.data.meshes.new("magbody"); bm.to_mesh(body); bm.free()
mb = bpy.data.objects.new("magbody", body); bpy.context.scene.collection.objects.link(mb)
axis = (hi - lo); L = axis.length
mb.scale = (0.022, min(wlo, whi) * 0.55, L + 0.01)
mb.rotation_euler = mu.Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_euler()
mb.location = (lo + hi) / 2
mb.data.materials.append(objs["mag"].data.materials[0])
for o in bpy.context.scene.objects: o.select_set(False)
mb.select_set(True); objs["mag"].select_set(True); bpy.context.view_layer.objects.active = objs["mag"]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); bpy.ops.object.join()
src.hide_render = True
report = {}
for name, o in objs.items():
    for x in bpy.context.scene.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    vs = [v.co for v in o.data.vertices]
    mn = mu.Vector([min(v[i] for v in vs) for i in range(3)]); mx = mu.Vector([max(v[i] for v in vs) for i in range(3)])
    # bottom-centre in glTF axes (x, y=z, z=-y): where the engine stands this part
    report[name] = [round((mn.x + mx.x) / 2, 4), round(mn.z, 4), round(-(mn.y + mx.y) / 2, 4)]
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/pistol-{name}.glb", use_selection=True, export_apply=True)
    print(name, len(o.data.polygons), "faces")
vs = [v.co for v in me.vertices]; mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
report["whole"] = [round((mn[0] + mx[0]) / 2, 4), round(mn[2], 4), round(-(mn[1] + mx[1]) / 2, 4)]
json.dump(report, open(f"{OUT}/pistol-bc.json", "w")); print("BC", report)
# proof: the parts pulled apart
objs["slide"].location.y -= 0.05; objs["mag"].location.z -= 0.08
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 700
cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = 0.42
co = bpy.data.objects.new("c", cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0.6, -0.114, -0.01); co.rotation_euler = (1.5708, 0, 1.5708)
l = bpy.data.lights.new("l", "SUN"); l.energy = 4; lo_ = bpy.data.objects.new("l", l); sc.collection.objects.link(lo_); lo_.rotation_euler = (0.8, 0, 1.2)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.5, 0.5, 0.5)
sc.render.filepath = "/tmp/psplit.png"; bpy.ops.render.render(write_still=True)
