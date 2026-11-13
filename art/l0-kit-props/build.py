# Level 0 office props kit: Tripo source -> faced -Z, floor origin, true size, cleaned, proof, .glb
# blender -b --factory-startup --python-exit-code 1 --python art/l0-kit-props/build.py -- <kind> [src.glb] [yawDeg]
import bpy, sys, math, json, bmesh
from mathutils import Vector, Matrix
W = "/workspace/l0props"
# axis: w (x), h (up), d (depth); value in metres. yaw: degrees about up applied to the Tripo file so its front lands on glTF -Z.
SPEC = {
 "boxes-stack":   dict(axis="h", v=1.00, yaw=90, src="boxes-stack-v2"),
 "box-single":    dict(axis="w", v=0.40, yaw=90, src="box-single-v3"),
 "folding-table": dict(yaw=90, fit=(1.80, 0.74, 0.75)),
 "stack-chair":   dict(axis="h", v=0.80, yaw=0),
 "filing":        dict(yaw=0, fit=(0.38, 1.32, None), src="filing-v3"),
 "crt":           dict(axis="h", v=0.50, yaw=0, trim=True),
 "phone":         dict(axis="w", v=0.22, yaw=0),
 "bin":           dict(axis="h", v=0.30, yaw=0),
 "fakeplant":     dict(axis="h", v=1.50, yaw=0, squeeze=0.8),
 "copier":        dict(axis="h", v=1.05, yaw=0),
}
a = sys.argv[sys.argv.index("--") + 1:]
kind = a[0]; sp = SPEC[kind]
src = a[1] if len(a) > 1 else f"{W}/{sp.get('src', kind)}.glb"
yaw = float(a[2]) if len(a) > 2 else sp["yaw"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.parent = None if ob.parent is None else ob.parent
mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o != ob: bpy.data.objects.remove(o)
me = ob.data
# junk islands: loose pieces (welded by position) whose box touches nothing connected to the main body
bm = bmesh.new(); bm.from_mesh(me)
key = lambda v: (round(v.co.x, 4), round(v.co.y, 4), round(v.co.z, 4))
par = {}
def find(k):
    while par.setdefault(k, k) != k:
        par[k] = par[par[k]]; k = par[k]
    return k
for e in bm.edges: par[find(key(e.verts[0]))] = find(key(e.verts[1]))
isl = {}
for f in bm.faces: isl.setdefault(find(key(f.verts[0])), []).append(f)
rows = []
for fs in isl.values():
    cs = [v.co for f in fs for v in f.verts]
    rows.append([fs, [min(c[i] for c in cs) for i in range(3)], [max(c[i] for c in cs) for i in range(3)]])
rows.sort(key=lambda r: -len(r[0]))
m = 0.015 * max(rows[0][2][i] - rows[0][1][i] for i in range(3))
touch = lambda p, q: all(p[1][i] - m <= q[2][i] and q[1][i] - m <= p[2][i] for i in range(3))
kept, rest, grew = [rows[0]], rows[1:], True
while grew:
    grew = False
    for r in list(rest):
        if any(touch(r, k) for k in kept): kept.append(r); rest.remove(r); grew = True
dead = [f for r in rest for f in r[0]] + [f for r in kept if len(r[0]) < 4 for f in r[0]]
if sp.get("trim"):  # thin stray bits (a cable stub) poking out of the body's own box
    tot = sum(len(r[0]) for r in rows); big = [r for r in rows if len(r[0]) >= tot * 0.05]
    lo = [min(r[1][i] for r in big) - 2 * m for i in range(3)]; hi = [max(r[2][i] for r in big) + 2 * m for i in range(3)]
    for r in kept:
        if len(r[0]) < tot * 0.01 and any(r[1][i] < lo[i] or r[2][i] > hi[i] for i in range(3)): dead += r[0]
dead = list(set(dead))
print("ISLANDS", len(rows), "junk islands", len(rest), "junk faces", len(dead))
bmesh.ops.delete(bm, geom=dead, context="FACES")
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context="VERTS")
bm.to_mesh(me); bm.free()
# face -Z in glTF (= +Y in Blender), long axis on X for the table
me.transform(Matrix.Rotation(math.radians(yaw), 4, "Z"))
def bb():
    xs = [v.co for v in me.vertices]
    mn = Vector((min(c.x for c in xs), min(c.y for c in xs), min(c.z for c in xs)))
    mx = Vector((max(c.x for c in xs), max(c.y for c in xs), max(c.z for c in xs)))
    return mn, mx
mn, mx = bb(); sz = mx - mn
if sp.get("fit"):  # a hard-surface piece takes its catalogue size per axis (d None: follows the height's scale)
    fw, fh, fd = sp["fit"]; kz = fh / sz.z; kx = fw / sz.x; ky = fd / sz.y if fd else kz
    me.transform(Matrix.Diagonal((kx, ky, kz, 1)))
else:
    s = sp["v"] / {"w": sz.x, "h": sz.z, "d": sz.y}[sp["axis"]]; q = sp.get("squeeze", 1)
    me.transform(Matrix.Diagonal((s * q, s * q, s, 1)))
mn, mx = bb()
me.transform(Matrix.Translation((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)))
mn, mx = bb(); sz = mx - mn
for p in me.polygons: p.use_smooth = True
me.set_sharp_from_angle(angle=math.radians(40))
me.update(); me.calc_loop_triangles(); tris = len(me.loop_triangles)
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
out = f"{W}/out/{kind}.glb"
bpy.ops.export_scene.gltf(filepath=out, export_apply=True, export_image_format="AUTO")
json.dump({"kind": kind, "size": [round(sz.x, 3), round(sz.z, 3), round(sz.y, 3)], "tris": tris}, open(f"{W}/out/{kind}.json", "w"))
print("DONE", kind, [round(sz.x, 3), round(sz.z, 3), round(sz.y, 3)], tris)
# proof: front 3/4 (camera on the +Y side = the face that exports as -Z) and back 3/4
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
sc.render.resolution_x = sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.1
R = max(sz) * 1.9; c = Vector((0, 0, sz.z / 2))
for name, ang in (("a", 35), ("b", 215)):
    cd = bpy.data.cameras.new(name); cam = bpy.data.objects.new(name, cd); sc.collection.objects.link(cam)
    t = math.radians(ang); cam.location = c + Vector((math.sin(t) * R, math.cos(t) * R, R * 0.45))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); cd.lens = 50
    sc.camera = cam; sc.render.filepath = f"{W}/out/{kind}_{name}.png"; bpy.ops.render.render(write_still=True)
