# Tripo hats fitted to the new cat heads (Shelly Nov 12: "every hat that is confirmed to be in the game, remake them with tripo and fit them on the heads").
# Each hat: Tripo mesh -> cleaned, smoothed, scaled to the head by its own recipe, seated on the crown, then every vertex that dips inside the head
# (plus a clearance) is pushed back out along the head's surface, so nothing clips. Exported skinned to the cat's armature, weight 1 on mixamorig:Head.
# Recipe: w = hat width / head width, sink = how far the hat's bottom rides below the crown top (share of head height), tilt (deg, back), dy (fwd m), dx
import bpy, bmesh, json, os, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = "/workspace/hats"; OUT = "/workspace/hats/out"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/hf/proof", exist_ok=True)
R = {
  "cap":        dict(w=1.02, sink=0.30, tilt=-6,  dy=0.0),
  "beanie":     dict(w=1.06, sink=0.36, tilt=-10, dy=-0.005),
  "tophat":     dict(w=0.62, sink=0.08, tilt=-8,  dy=-0.005),
  "headphones": dict(w=1.16, sink=0.62, tilt=0,   dy=0.0, fit="band", yaw=90),
  "bow":        dict(w=0.62, sink=0.06, tilt=-25, dy=-0.03, dx=0.0),
  "flower":     dict(w=0.34, sink=0.10, tilt=-15, dy=0.0, dx=0.10, side=True),
  "partyhat":   dict(w=0.42, sink=0.06, tilt=-12, dy=0.0, dx=0.03, roll=8),
  "crown":      dict(w=0.80, sink=0.12, tilt=-6,  dy=0.0),
  "beret":      dict(w=1.00, sink=0.22, tilt=-14, dy=-0.01, dx=0.02, roll=10),
  "souwester":  dict(w=1.22, sink=0.34, tilt=-8,  dy=-0.01),
  "divehelm":   dict(w=1.08, sink=0.55, tilt=0,   dy=-0.01),
  "chitinhelm": dict(w=1.08, sink=0.34, tilt=-6,  dy=0.0),
}
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(R)
CLEAR = 0.012
def clear(): bpy.ops.wm.read_factory_settings(use_empty=True)
def body(sex):
    bpy.ops.import_scene.gltf(filepath=f"/tmp/hf/body{sex}.glb")
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    head = bpy.data.objects["Head"]
    dg = bpy.context.evaluated_depsgraph_get(); ev = head.evaluated_get(dg); me = ev.to_mesh()
    g = head.vertex_groups.get("mixamorig:Head")
    W = {v.index: max([e.weight for e in v.groups if e.group == g.index] or [0]) for v in head.data.vertices}
    pts = [head.matrix_world @ v.co for v in me.vertices if W.get(v.index, 0) > 0.5]
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm)
    return arm, pts, bvh
def headinfo(pts):
    top0 = max(p.z for p in pts); bot = min(p.z for p in pts)
    top = max(p.z for p in pts if abs(p.x) < 0.02)   # the skull's crown on the midline: the ear tips left out (they set the old top too high, hats floated)
    band = [p for p in pts if p.z > top - (top - bot) * 0.45 and p.z < top + 0.005]   # the skull above the eyes, ears and snout left out by width
    xs = sorted(abs(p.x) for p in band); half = xs[int(len(xs) * 0.97)]
    ys = [p.y for p in band if abs(p.x) < half * 0.5]
    return dict(top=top, bot=bot, h=top - bot, half=half, ymin=min(ys), ymax=max(ys))
def load_hat(kind):
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    ms = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    for x in list(bpy.context.scene.objects):
        if x != o and x.type != "ARMATURE" and x.name not in ("Body", "Head", "Icosphere"): pass
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # weld + smooth shade, a light Laplacian to take the Tripo crumple out
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data); bm.free()
    d = o.modifiers.new("d", "DECIMATE"); d.ratio = min(1.0, 9000 / max(1, len(o.data.polygons)))   # ~9k tris: a hat rides every cat's head, NPCs too
    bpy.ops.object.modifier_apply(modifier="d")
    m = o.modifiers.new("s", "CORRECTIVE_SMOOTH"); m.iterations = 4; m.smooth_type = "LENGTH_WEIGHTED"
    bpy.ops.object.modifier_apply(modifier="s")
    for p in o.data.polygons: p.use_smooth = True
    o.name = "Hat_" + kind
    for i, s in enumerate(o.material_slots):
        if s.material: s.material.name = "cloth"
    return o
for sex in ("f", "m"):
    for kind in only:
        if not os.path.exists(f"{SRC}/{kind}.glb"): print("MISSING", kind); continue
        clear(); arm, pts, bvh = body(sex); H = headinfo(pts); r = R[kind]
        hat = load_hat(kind)
        vs = [v.co.copy() for v in hat.data.vertices]
        a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
        wid = (b.y - a.y) if r.get("yaw") else (b.x - a.x)
        s = (2 * H["half"] * r["w"]) / max(wid, 1e-6)
        cy = (H["ymin"] + H["ymax"]) / 2 + r.get("dy", 0); bz = H["top"] - H["h"] * r["sink"]
        M = Matrix.Translation(Vector((r.get("dx", 0) * (-1 if False else 1), cy, bz))) @ Matrix.Rotation(__import__("math").radians(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(__import__("math").radians(r["tilt"]), 4, "X") @ Matrix.Scale(s, 4) @ Matrix.Rotation(__import__("math").radians(r.get("yaw", 0)), 4, "Z") @ Matrix.Translation(Vector((-(a.x + b.x) / 2, -(a.y + b.y) / 2, -a.z)))
        hat.data.transform(M); hat.data.update()
        # no clip: any vertex inside the head (or nearer than CLEAR) slides out along the head's normal
        pushed = 0
        for v in hat.data.vertices:
            loc, n, i, d = bvh.find_nearest(v.co)
            if loc is None: continue
            inside = (v.co - loc).dot(n) < 0
            if inside or d < CLEAR:
                v.co = loc + n * CLEAR; pushed += 1
        hat.data.update()
        for o in list(bpy.context.scene.objects):
            if o.type == "MESH" and o != hat: bpy.data.objects.remove(o)
        if arm.animation_data: arm.animation_data.action = None
        for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
        g = hat.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hat.data.vertices))), 1.0, "REPLACE")
        hat.parent = arm; hat.modifiers.new("skin", "ARMATURE").object = arm
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", export_skins=True, export_animations=False, export_apply=False)
        print("HAT", kind, "top", round(H["top"],3), "half", round(H["half"],3), sex, "scale", round(s, 4), "pushed", pushed, "tris", sum(len(p.vertices) - 2 for p in hat.data.polygons))
