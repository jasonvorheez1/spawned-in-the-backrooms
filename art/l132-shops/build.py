# Lumiria walk-in shop shells: Tripo exterior -> fitted 16x11 footprint (front = glTF +Z), door cut, room liner with named slots.
# run: blender -b --factory-startup --python-exit-code 1 --python art/l132-shops/build.py -- <key> <H> <yawdeg>
import bpy, bmesh, sys, json, math
from mathutils import Vector, Matrix
key, H, yaw, FX, FY, XS = sys.argv[-6], *[float(a) for a in sys.argv[-5:]]
W, D = 16.0 * FX, 11.0 * FY  # eaves overhang the walls: the fit puts the door threshold 5.5 m from the centre
SRC = f"/workspace/l132shops/shell-{key}.glb"; OUT = f"/workspace/l132shops/out-{key}"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ms = [o for o in bpy.data.objects if o.type == "MESH"]
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
sh = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
sh.data.transform(Matrix.Rotation(math.radians(yaw), 4, "Z"))
def bb(o):
    vs = [v.co for v in o.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
lo, hi = bb(sh); sz = hi - lo; print("SRCDIMS", key, tuple(round(c, 3) for c in sz))
c = (lo + hi) / 2
sh.data.transform(Matrix.Translation((-c.x, -c.y, -lo.z)))
sh.data.transform(Matrix.Diagonal((W / sz.x, D / sz.y, H / sz.z, 1)))
sh.data.transform(Matrix.Translation((XS, 0, 0)))
sh.data.update(); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
def ray(o, d):
    ok, loc, n, i = sh.ray_cast(Vector(o), Vector(d)); return loc if ok else None
# wall planes at body height: innermost hit of several rays per side
def side(axis, sgn):
    best = None
    for t in (-3.5, -2, 2, 3.5):
        for z in (1.0, 1.6):
            o = [0, 0, z]; o[axis] = sgn * 20; o[1 - axis] = t
            d = [0, 0, 0]; d[axis] = -sgn
            h = ray(o, d)
            if h is not None:
                v = abs(h[axis]); best = v if best is None else min(best, v)
    return best
xr, xl, yb, yf = side(0, 1), side(0, -1), side(1, 1), side(1, -1)
print("WALLS", key, xr, xl, yb, yf)
IN = 0.32
rx = min(xr, xl) - IN; ryb = yb - IN; ryf = yf - IN  # room: x in ±rx, y in -ryf..ryb
CH = min(3.3, H * 0.52)
DW, DH = 0.65, 2.3
def cube(x0, x1, y0, y1, z0, z1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.active_object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True); return o
nv0 = len(sh.data.vertices)
for cut in (cube(-rx - 0.08, rx + 0.08, -ryf - 0.08, ryb + 0.08, -0.5, CH + 0.08), cube(-DW, DW, -9, -ryf + 0.5, -0.5, DH)):
    m = sh.modifiers.new("b", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = cut; m.solver = "EXACT"
    bpy.context.view_layer.objects.active = sh; bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cut)
print("BOOL", key, nv0, len(sh.data.vertices))
# front surface right beside the door, for the jamb depth
fy = None
for x in (-DW - 0.15, DW + 0.15):
    for z in (0.6, 1.4, 2.0):
        h = ray((x, -20, z), (0, 1, 0))
        if h is not None: fy = h.y if fy is None else min(fy, h.y)
fy = (fy if fy is not None else -yf) - 0.06
# liner
def mat(name, col):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = 0.8; return m
mats = [mat("wall_in", (0.8, 0.78, 0.7)), mat("floor_in", (0.4, 0.4, 0.42)), mat("ceil_in", (0.85, 0.85, 0.82)), mat("jamb", (0.3, 0.2, 0.12))]
me = bpy.data.meshes.new("liner"); ln = bpy.data.objects.new("liner", me); bpy.context.collection.objects.link(ln)
for m in mats: me.materials.append(m)
bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
def quad(p, mi, ua, va, s=0.5):
    f = bm.faces.new([bm.verts.new(q) for q in p]); f.material_index = mi
    for l in f.loops: l[uv].uv = (l.vert.co[ua] * s, l.vert.co[va] * s)
F0 = 0.02; x0, x1, y0, y1 = -rx, rx, -ryf, ryb
quad([(x0, y0, F0), (x1, y0, F0), (x1, y1, F0), (x0, y1, F0)], 1, 0, 1)
quad([(x0, y0, CH), (x0, y1, CH), (x1, y1, CH), (x1, y0, CH)], 2, 0, 1)
quad([(x0, y1, F0), (x1, y1, F0), (x1, y1, CH), (x0, y1, CH)], 0, 0, 2)
quad([(x0, y0, F0), (x0, y1, F0), (x0, y1, CH), (x0, y0, CH)], 0, 1, 2)
quad([(x1, y1, F0), (x1, y0, F0), (x1, y0, CH), (x1, y1, CH)], 0, 1, 2)
quad([(x0, y0, F0), (x0, y0, CH), (-DW, y0, CH), (-DW, y0, F0)], 0, 0, 2)
quad([(DW, y0, F0), (DW, y0, CH), (x1, y0, CH), (x1, y0, F0)], 0, 0, 2)
quad([(-DW, y0, DH), (-DW, y0, CH), (DW, y0, CH), (DW, y0, DH)], 0, 0, 2)
# jamb tunnel + threshold (a 6 cm timber frame face on both ends)
quad([(-DW, fy, F0), (-DW, y0, F0), (-DW, y0, DH), (-DW, fy, DH)], 3, 1, 2, 1)
quad([(DW, y0, F0), (DW, fy, F0), (DW, fy, DH), (DW, y0, DH)], 3, 1, 2, 1)
quad([(-DW, fy, DH), (-DW, y0, DH), (DW, y0, DH), (DW, fy, DH)], 3, 0, 1, 1)
quad([(-DW, fy, F0), (DW, fy, F0), (DW, y0, F0), (-DW, y0, F0)], 3, 0, 1, 1)
T = 0.12
for yy in (fy, y0 + 0.001):
    quad([(-DW - T, yy, 0), (-DW, yy, 0), (-DW, yy, DH), (-DW - T, yy, DH + T)], 3, 0, 2, 1)
    quad([(DW, yy, 0), (DW + T, yy, 0), (DW + T, yy, DH + T), (DW, yy, DH)], 3, 0, 2, 1)
    quad([(-DW, yy, DH), (DW, yy, DH), (DW + T, yy, DH + T), (-DW - T, yy, DH + T)], 3, 0, 2, 1)
bm.normal_update(); bm.to_mesh(me); bm.free()
info = dict(key=key, H=H, rx=rx, front=ryf, back=ryb, ceil=CH, doorHalf=DW, doorH=DH, jambOut=-fy, wallFront=yf, floor=F0)
json.dump(info, open(OUT + ".json", "w")); print("INFO", json.dumps(info))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT + ".glb", export_apply=True, use_selection=True)
# proofs
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = 720; sc.render.resolution_y = 480
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(60), 0, math.radians(20))); bpy.context.active_object.data.energy = 3
bpy.ops.object.light_add(type="POINT", location=(0, 0, 2.8)); bpy.context.active_object.data.energy = 1500
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); bpy.context.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 22
def shot(p, t, name):
    cam.location = p; cam.rotation_euler = (Vector(t) - Vector(p)).to_track_quat("-Z", "Y").to_euler(); sc.render.filepath = f"{OUT}-{name}.png"; bpy.ops.render.render(write_still=True)
shot((5, -24, 3.5), (0, 0, 3), "front"); shot((4.5, 3, 1.6), (-1, -ryf, 1.3), "in"); shot((-2.5, -11, 1.6), (0, -5, 1.4), "back")
