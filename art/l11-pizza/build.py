# Level 11 pizza counter: cut the one Tripo counter mesh into separate props, true metres, origin at each bottom centre.
# blender -b --factory-startup --python-exit-code 1 --python art/l11-pizza/build.py
import bpy, bmesh, json, math, os
from mathutils import Vector, Matrix
SRC = "/workspace/art/l11-pizza/counter.glb"
OUT = "/workspace/art/l11-pizza/out"
PROOF = "/tmp/l11pz"
os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
FLOOR, TOP = -0.6, -0.135          # source units: floor and counter worktop
S = 0.97 / (TOP - FLOOR)           # worktop at 0.97 m
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
src = [o for o in bpy.data.objects if o.type == "MESH"][0]
MAT = src.data.materials[0]; MAT.name = "pizza_counter"
base = bmesh.new(); base.from_mesh(src.data); base.transform(src.matrix_world)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
bmesh.ops.remove_doubles(base, verts=base.verts, dist=0.0004)

# jar caps -> centres (tops of the shakers on the back bar)
def on_bar(c): return 0.08 < c.x < 0.44 and -0.13 < c.y < 0.92 and 0.172 < c.z < 0.34
caps = [f.calc_center_median() for f in base.faces if on_bar(f.calc_center_median()) and f.normal.z > 0.85 and f.calc_center_median().z > 0.235 and f.calc_center_median().y > 0.6]
cl = []
for c in caps:
    for k in cl:
        if (Vector((k["x"], k["y"])) - Vector((c.x, c.y))).length < 0.018: k["p"].append(c); k["x"] = sum(p.x for p in k["p"]) / len(k["p"]); k["y"] = sum(p.y for p in k["p"]) / len(k["p"]); break
    else: cl.append({"x": c.x, "y": c.y, "p": [c]})
JARS = sorted([k for k in cl if len(k["p"]) >= 3], key=lambda k: -len(k["p"]))
print("JARS", [(round(k["x"], 3), round(k["y"], 3), len(k["p"]), round(max(p.z for p in k["p"]), 3)) for k in JARS])

def part_of(c):
    if c.z > 0.335 and c.x > 0.0 and c.y > -0.42: return "menu_board"
    if c.x < 0.10 and c.y < -0.105 and c.z > 0.345: return "pizza_boxes"
    if c.x < 0.10 and c.y < -0.105 and c.z > -0.125: return "oven"
    if c.y < -0.585 and c.x < 0.06 and c.z <= -0.125:
        if -0.29 < c.z < -0.165 and -0.27 < c.x < 0.03: return "plates"
        return "rack"
    if on_bar(c):
        if c.y > 0.6:
            d = [(Vector((k["x"], k["y"])) - Vector((c.x, c.y))).length for k in JARS]
            return f"jar{d.index(min(d))}"
        if 0.42 < c.y < 0.58: return "napkin_holder"
        if c.y < 0.05: return "pan_stack"
        return "jar_lone"
    return "counter"

groups = {}
for f in base.faces: groups.setdefault(part_of(f.calc_center_median()), []).append(f.index)
print({k: len(v) for k, v in groups.items()})

def make(name, idx):
    bm = base.copy(); bm.faces.ensure_lookup_table()
    keep = set(idx)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(MAT)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o

def finish(o, extra=None):
    me = o.data
    vs = [v.co for v in me.vertices]
    mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)])
    cen = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    me.transform(Matrix.Translation(-cen)); me.transform(Matrix.Scale(S, 4))
    for p in me.polygons: p.use_smooth = True
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35)); o.select_set(False)
    size = (mx - mn) * S
    return {"cx": cen.x * S, "cy": cen.y * S, "z0": (cen.z - FLOOR) * S, "size": [round(size.x, 3), round(size.y, 3), round(size.z, 3)]}

def post_steel():
    m = bpy.data.materials.new("post_steel"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.32, 0.32, 0.33, 1); b.inputs["Metallic"].default_value = 0.9; b.inputs["Roughness"].default_value = 0.35
    return m

parts = {}
objs = {}
for name, idx in groups.items():
    o = make(name, idx)
    if name == "menu_board":   # the board floats in the source: two square steel posts down to the back bar top
        bm = bmesh.new(); bm.from_mesh(o.data)
        for y in (0.02, 0.62):
            r = bmesh.ops.create_cube(bm, size=1.0)["verts"]
            bmesh.ops.scale(bm, vec=(0.018, 0.018, 0.345 - 0.17 + 0.02), verts=r)
            bmesh.ops.translate(bm, vec=(0.05, y, (0.345 + 0.17) / 2), verts=r)
            for f in {f for v in r for f in v.link_faces}: f.material_index = 1
        bm.to_mesh(o.data); bm.free(); o.data.materials.append(post_steel())
    objs[name] = o
    parts[name] = finish(o)

json.dump(parts, open(f"{OUT}/parts.json", "w"), indent=1)
print(json.dumps(parts, indent=1))

# proofs: each part alone, 3/4 from +X (the drawer side) lit from the camera
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8
sc.render.resolution_x = sc.render.resolution_y = 300; sc.view_settings.view_transform = "Standard"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 3.5
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sc.collection.objects.link(sun)
for n, o in objs.items(): o.hide_render = True
for n, o in objs.items():
    o.hide_render = False
    d = max(parts[n]["size"]); h = parts[n]["size"][2]
    for tag, dirv in (("a", Vector((1, -0.8, 0.55))), ("b", Vector((-1, 0.8, 0.45)))):
        cam.location = Vector((0, 0, h / 2)) + dirv.normalized() * d * 2.3
        cam.rotation_euler = (Vector((0, 0, h / 2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        sun.rotation_euler = (-dirv).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{n}_{tag}.png"; bpy.ops.render.render(write_still=True)
    o.hide_render = True
    for x in objs.values(): x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{n}.glb", use_selection=True, export_apply=True, export_format="GLB")
    print("tris", n, sum(len(p.vertices) - 2 for p in o.data.polygons))
