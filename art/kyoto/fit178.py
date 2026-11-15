# Level 178 kitchen/interior: fit each Tripo mesh to its kit slot. Engine dims W(x) H(y) D(z), front -Z, origin bottom centre.
# zc = engine z of the box centre (bodies sit behind their kit leaves); counter = height of the front-half top (worktop).
import bpy, os, math, sys
from mathutils import Vector, Matrix
SRC = "/workspace/t178"; OUT = "/workspace/t178/fit"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/pf2", exist_ok=True)
T = {  # name: (W, H, D, zc, counter)
 "basecab": (0.94, 0.89, 0.58, 0.02, None),
 "sink":    (0.94, None, 0.62, 0.00, 0.89),
 "oven":    (0.62, None, 0.58, 0.01, 0.89),
 "fridge":  (0.70, 1.75, 0.65, 0.035, None),
 "wallcup": (0.90, 0.60, 0.32, 0.01, None),
 "shelf":   (0.90, 0.60, 0.32, 0.00, None),
 "chabudai2": (1.50, 0.345, 0.85, 0, None),
 "bowl":    (0.13, None, 0.13, 0, None),
 "cup2":    (0.075, None, 0.075, 0, None),
 "zabuton": (0.60, 0.12, 0.60, 0, None),
 "futon_a": (1.06, 0.30, 2.0, 0, None),
 "futon_b": (1.06, 0.30, 2.0, 0, None),
 "futon_c": (1.06, 0.30, 2.0, 0, None),
 "kimono":  (1.60, 1.60, 0.45, 0, None),
 "swords":  (1.20, 1.10, 0.36, 0, None),
 "geta":    (0.23, 0.075, 0.30, 0, None),
 "towels":  (0.36, None, 0.33, 0, None),
}
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(T)
def bb(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
for n in only:
    if not os.path.exists(f"{SRC}/{n}.glb"): print("MISSING", n); continue
    W, H, D, zc, counter = T[n]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{n}.glb")
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in ms:  # bake world transform, drop parents
        o.data.transform(o.matrix_world); o.parent = None; o.matrix_world = Matrix()
    for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]: bpy.data.objects.remove(o)
    # Tripo front +X (blender) -> engine -Z = blender +Y: rotate +90 about Z
    R = Matrix.Rotation(math.radians(90), 4, "Z")
    for o in ms: o.data.transform(R)
    mn, mx = bb(ms); sz = mx - mn
    sx, sy = W / sz.x, D / sz.y          # blender x = engine x, blender y = engine -z
    if counter:   # worktop: the top of the front 40% must land at `counter`
        fy = mn.y + sz.y * 0.6           # front = +Y
        top = max((v.co.z for o in ms for v in o.data.vertices if v.co.y > fy), default=mx.z)
        sz_ = counter / (top - mn.z)
    elif H: sz_ = H / sz.z
    else: sz_ = (sx + sy) / 2
    S = Matrix.Diagonal((sx, sy, sz_, 1)) @ Matrix.Translation(-Vector(((mn.x+mx.x)/2, (mn.y+mx.y)/2, mn.z)))
    for o in ms: o.data.transform(S)
    for o in ms: o.data.transform(Matrix.Translation((0, -zc, 0)))   # engine z centre = zc
    mn, mx = bb(ms)
    print("FIT %s W%.3f H%.3f D%.3f enginez[%.3f,%.3f]" % (n, mx.x-mn.x, mx.z-mn.z, mx.y-mn.y, -mx.y, -mn.y))
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{n}.glb", export_apply=True)
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = sc.render.resolution_y = 300
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.6
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    c = (mn + mx) / 2; r = (mx - mn).length
    cam.location = c + Vector((-0.5, 1, 0.45)).normalized() * r * 1.6   # engine front (-Z) = blender +Y
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/tmp/pf2/{n}.png"; bpy.ops.render.render(write_still=True)
