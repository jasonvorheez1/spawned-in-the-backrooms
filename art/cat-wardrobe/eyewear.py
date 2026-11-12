# Tripo eyewear fitted to the new cat heads (Shelly #252235). Each source is turned so its lenses face -Y (the cat's front),
# scaled so its front frame spans `w` x the skull's width at eye height, its lens centre set on the eye line (`eye`: share of the
# head's height from its base), its back pressed `gap` in front of the face; verts that fall inside the skull slide out; skinned to the head bone.
# run: cd /workspace && blender -b --factory-startup --python-exit-code 1 --python <world>/art/cat-wardrobe/eyewear.py -- [kinds...]
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = "/workspace/hats"; OUT = "/workspace/hats/out"; BODY = "/workspace/catrev/body%s.glb"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/ey", exist_ok=True)
EYE = {"f": 0.86, "m": 0.915}   # world z of the painted eye line on each body
R = {
  "megoggles":      dict(w=1.06, gap=0.010, strap=True),
  "asyncvisor":     dict(w=1.10, gap=0.030, dz=-0.03, strap=True, front=(0, 1)),
  "crackedglasses": dict(w=0.92, gap=0.012),
  "lobbyshades":    dict(w=0.94, gap=0.012),
  "almondspecs":    dict(w=0.86, gap=0.012),
}
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv and sys.argv[-1] != "--" else list(R)
def body(sex):
    bpy.ops.import_scene.gltf(filepath=BODY % sex)
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE"); head = bpy.data.objects["Head"]
    kb = head.data.shape_keys.key_blocks if head.data.shape_keys else {}
    if "Ear_Hide" in kb: kb["Ear_Hide"].value = 1
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); me = head.evaluated_get(dg).to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm)
    pts = [head.matrix_world @ v.co for v in me.vertices]
    return arm, bvh, pts
def load(kind):
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    ms = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for s in o.material_slots:
        if s.material: s.material.name = "eyew"
    vs = [v.co for v in o.data.vertices]
    a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
    # the front is the horizontal end whose slice stands tallest across (the lens frame); temples and straps trail thin behind it
    def area(axis, sign):
        lo, hi = a[axis], b[axis]; d = hi - lo
        sl = [v for v in vs if (v[axis] > hi - d * 0.12 if sign > 0 else v[axis] < lo + d * 0.12)]
        if len(sl) < 8: return 0
        o2 = 1 - axis; return (max(v.z for v in sl) - min(v.z for v in sl)) * (max(v[o2] for v in sl) - min(v[o2] for v in sl))
    best = R[kind].get("front") or max(((ax, sg) for ax in (0, 1) for sg in (1, -1)), key=lambda k: area(*k))
    yaw = {(1, -1): 0, (1, 1): math.pi, (0, 1): -math.pi / 2, (0, -1): math.pi / 2}[best]   # turn that end to -Y
    if yaw: o.data.transform(Matrix.Rotation(yaw, 4, "Z"))
    print("FRONT", kind, best)
    o.name = "Eyew_" + kind; o.data.update(); return o
def bbox(o):
    vs = [v.co for v in o.data.vertices]
    return Vector([min(v[i] for v in vs) for i in range(3)]), Vector([max(v[i] for v in vs) for i in range(3)])
def push_out(o, bvh, clear):
    n = 0
    for v in o.data.vertices:
        loc, nor, i, d = bvh.find_nearest(v.co)
        if loc is None: continue
        if (v.co - loc).dot(nor) < clear: v.co = loc + nor * clear; n += 1
    o.data.update(); return n
for sex in ("f", "m"):
    for kind in only:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        arm, bvh, pts = body(sex); r = R[kind]; ez = EYE[sex] + r.get("dz", 0)
        band = [p for p in pts if abs(p.z - ez) < 0.01 and p.y < 0.05]
        half = sorted(abs(p.x) for p in band)[int(len(band) * 0.97)]
        o = load(kind); a, b = bbox(o)
        front = [v.co for v in o.data.vertices if v.co.y < a.y + (b.y - a.y) * 0.2]
        fw = max(v.x for v in front) - min(v.x for v in front)
        s = 2 * half * r["w"] / fw
        fz = (min(v.z for v in front) + max(v.z for v in front)) / 2
        o.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(a.x + b.x) / 2, 0, -fz)))); a, b = bbox(o)
        # the face's front at the eye line, either side of the snout
        fy = min(h[0].y for h in (bvh.ray_cast(Vector((x, -2, ez)), Vector((0, 1, 0))) for x in (-0.09, 0.09, -0.13, 0.13)) if h[0] is not None)
        lensback = max(v.co.y for v in o.data.vertices if v.co.y < a.y + 0.03 * s / s and abs(v.co.x) < half * 0.5) if not r.get("strap") else a.y + 0.02
        o.data.transform(Matrix.Translation(Vector((0, fy - r["gap"] - (lensback - a.y) - a.y, ez)))); o.data.update()
        n = push_out(o, bvh, 0.006)
        for x in list(bpy.context.scene.objects):
            if x.type == "MESH" and x != o: bpy.data.objects.remove(x)
        if arm.animation_data: arm.animation_data.action = None
        for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
        g = o.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        o.parent = arm; o.modifiers.new("skin", "ARMATURE").object = arm
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", export_skins=True, export_animations=False, export_apply=False)
        print("FIT", kind, sex, "scale", round(s, 3), "half", round(half, 3), "faceY", round(fy, 3), "pushed", n)
