# Kyoto Dreams garden kit: Tripo meshes cleaned for the game (+ the spring's rock rim and raked gravel ring).
# blender -b --factory-startup --python-exit-code 1 --python art/kyoto/garden/build.py
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
SRC = "/workspace/k178/tripo"; OUT = "/workspace/k178/out"; os.makedirs(OUT, exist_ok=True)
# name: (source, target tris, slot name, cut base disc fraction)
KIT = {"chochin": ("chochin", 6000, "washi", 0), "toro": ("toro", 9000, "stone", 0), "rocka": ("rocka", 4000, "stone", 0),
       "rockb": ("rockb", 3500, "stone", 0), "shrub": ("shrub", 14000, "leaves", 0), "maple": ("maple", 36000, "leaves", 0.045),
       "shishi": ("shishi", 9000, "bamboo", 0), "moss": ("moss", 2500, "moss", 0), "tobi": ("tobi", 2000, "stone", 0)}

def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def load(name):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    new = [o for o in bpy.context.scene.objects if o not in before]
    ms = [o for o in new if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for e in [x for x in new if x != o]: bpy.data.objects.remove(e)
    return o

def ground(o, cut=0.0):
    me = o.data
    zs = [v.co.z for v in me.vertices]; z0, z1 = min(zs), max(zs)
    if cut:
        bm = bmesh.new(); bm.from_mesh(me)
        h = z0 + (z1 - z0) * cut
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < h], context="VERTS")
        bm.to_mesh(me); bm.free()
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    me.transform(Matrix.Translation((-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs))))

def decimate(o, tris):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n > tris:
        m = o.modifiers.new("dec", "DECIMATE"); m.ratio = tris / n
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="dec")
    for p in o.data.polygons: p.use_smooth = True

def shrink_images():
    for im in bpy.data.images:
        if im.size[0] > 1024: im.scale(1024, 1024)

def export(o, name, slot):
    for i, m in enumerate(o.data.materials):
        m.name = slot if i == 0 else f"{slot}_{i}"
    shrink_images()
    o.name = name
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
report = {}
for name, (src, t, slot, cut) in (KIT.items() if not os.environ.get("RIMONLY") else []):
    clean(); o = load(src); ground(o, cut); decimate(o, t)
    d = o.dimensions; report[name] = (tris(o), round(d.x, 2), round(d.z, 2), round(d.y, 2), [im.size[:] for im in bpy.data.images])
    export(o, name, slot)

# --- the spring rim: Tripo stones set round the pool's oval, a gap at the south for the stepping stones ---
HX, HZ = 3.0, 1.8  # pool half extents (level178.yml pool hx/hz)
random.seed(178)
clean()
lib = {}
for src in ("rockb", "rocka", "tobi"):
    o = load(src); ground(o); decimate(o, 900); o.name = "lib_" + src; lib[src] = o
parts = []
# walk the rectangle-ish oval perimeter outside the pool edge
per = []
N = 46
for i in range(N):
    a = 2 * math.pi * i / N
    c, s = math.cos(a), math.sin(a)
    # superellipse (n=4) through the pool corners, pushed 0.32 m out
    r = 1 / ((abs(c) / (HX + 0.32)) ** 4 + (abs(s) / (HZ + 0.32)) ** 4) ** 0.25
    per.append((a, r * c, r * s))
for (a, x, y) in per:
    # blender y = -glTF z; south (+Z in game) = -Y here: leave the entry gap
    if -y > 1.5 and abs(x) < 0.75: continue
    src = "rocka" if random.random() < 0.25 else "rockb"
    base = lib[src]
    ob = base.copy(); ob.data = base.data.copy(); bpy.context.scene.collection.objects.link(ob)
    big = 1.0 + random.random() * 0.45
    d = base.dimensions
    sx = big * 0.62 / d.x; sz = (0.26 + random.random() * 0.2) / d.z if src == "rockb" else (0.36 + random.random() * 0.22) / d.z
    ob.scale = (sx, sx * (0.8 + random.random() * 0.3), sz)
    ob.rotation_euler = (0, 0, a + math.pi / 2 + random.uniform(-0.4, 0.4))
    ob.location = (x, y, -0.06)
    parts.append(ob)
for o in lib.values(): bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); rim = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
mn = min(v.co.z for v in rim.data.vertices)
rim.data.transform(Matrix.Translation((0, 0, -mn)))   # origin at the stones' bottom (they sink 6 cm in game)
# merge identical materials by base name
mats = {}
for i, m in enumerate(rim.data.materials):
    key = m.name.split(".")[0]; mats.setdefault(key, m)
for k in list(mats):
    pass
report["rim"] = (tris(rim), round(rim.dimensions.x, 2), round(rim.dimensions.z, 2), round(rim.dimensions.y, 2), len(rim.data.materials))
shrink_images(); rim.name = "spring_rim"
for i, m in enumerate(rim.data.materials): m.name = f"stone_{i}"
bpy.ops.export_scene.gltf(filepath=f"{OUT}/spring_rim.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)

# --- raked gravel ring round the rim: concentric rake grooves, planar UVs, slot "gravel" ---
clean()
bm = bmesh.new()
RI, RO, NA, NR = 0.62, 1.55, 160, 26   # from rim inner offset to outer offset (m beyond the pool edge)
grid = []
for j in range(NR + 1):
    off = RI + (RO - RI) * j / NR
    row = []
    for i in range(NA):
        a = 2 * math.pi * i / NA; c, s = math.cos(a), math.sin(a)
        r = 1 / ((abs(c) / (HX + off)) ** 4 + (abs(s) / (HZ + off)) ** 4) ** 0.25
        h = 0.012 + 0.012 * math.cos(j * math.pi)   # alternate ridge / furrow every row = rake lines
        if j in (0, NR): h = 0.0
        row.append(bm.verts.new((r * c, r * s, h)))
    grid.append(row)
for j in range(NR):
    for i in range(NA):
        bm.faces.new((grid[j][i], grid[j][(i + 1) % NA], grid[j + 1][(i + 1) % NA], grid[j + 1][i]))
me = bpy.data.meshes.new("gravel"); bm.to_mesh(me); bm.free()
uv = me.uv_layers.new()
for l in me.loops:
    co = me.vertices[l.vertex_index].co; uv.data[l.index].uv = (co.x / 1.5, co.y / 1.5)
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new("gravel_ring", me); bpy.context.scene.collection.objects.link(ob)
mat = bpy.data.materials.new("gravel"); mat.use_nodes = True; me.materials.append(mat)
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.78, 0.76, 0.72, 1)
report["gravel"] = (tris(ob), round(ob.dimensions.x, 2), round(ob.dimensions.z, 3), round(ob.dimensions.y, 2))
bpy.ops.export_scene.gltf(filepath=f"{OUT}/gravel_ring.glb", export_apply=True)
for k, v in report.items(): print("R", k, v)
