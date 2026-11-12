# Tripo hats fitted to the new cat heads (Shelly Nov 12: "every hat that is confirmed to be in the game, remake them with tripo and fit them on the heads").
# Each hat: Tripo mesh -> cleaned, smoothed, scaled to the head by its own recipe, seated on the crown, then every vertex that dips inside the head
# (plus a clearance) is pushed back out along the head's surface, so nothing clips. Exported skinned to the cat's armature, weight 1 on mixamorig:Head.
# Recipe: w = hat width / head width, sink = how far the hat's bottom rides below the crown top (share of head height), tilt (deg, back), dy (fwd m), dx
import bpy, bmesh, json, os, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = "/workspace/hats"; OUT = "/workspace/hats/out"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/hf/proof", exist_ok=True)
# fit: "wrap" = the rim hugs the skull's own oval at `band` (share of head height down from the crown), the inside of the crown resting on the skull (beanie, cap);
#      "enclose" = a helmet sized round the whole head, the face in its opening; "perch" = set down until the rim rests on the dome, then sunk `sink` m (top hat, crown, bows)
#      "band" = headphones over the ears (the old recipe). Nov 12 refit (Shelly: "the hats arent being worn correctly"): width-only scaling floated beanies, shrank the top hat, turned the dive helmet sideways.
R = {
  "cap":        dict(fit="wrap", band=0.30, ease=1.04, tilt=-6),
  "beanie":     dict(fit="wrap", band=0.36, ease=1.05, tilt=-8),
  "souwester":  dict(fit="wrap", band=0.40, ease=1.06, tilt=-6),
  "chitinhelm": dict(fit="wrap", band=0.44, ease=1.06, tilt=-4),
  "beret":      dict(fit="wrap", band=0.20, ease=1.03, tilt=-12, roll=10, dx=0.015),
  "divehelm":   dict(fit="enclose", ease=1.10, yaw=-90),
  "tophat":     dict(fit="perch", w=0.74, sink=0.03, tilt=-8, dy=-0.01),
  "crown":      dict(fit="perch", w=0.70, sink=0.02, tilt=-6),
  "partyhat":   dict(fit="perch", w=0.42, sink=0.01, tilt=-12, dx=0.03, roll=8),
  "bow":        dict(fit="perch", w=0.40, sink=0.0, tilt=-25, dy=-0.03),
  "flower":     dict(fit="perch", w=0.34, sink=0.0, tilt=-15, dx=0.10),
  "headphones": dict(fit="band", w=0.98, sink=0.55, tilt=0, dy=0.0, yaw=90),
}
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(R)
CLEAR = 0.018   # room for the pressed-flat hair under a hat
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
        import math
        rad = math.radians
        # 1. yaw the source so its front faces -Y, then sit its rim centre on the origin
        hat.data.transform(Matrix.Rotation(rad(r.get("yaw", 0)), 4, "Z")); hat.data.update()
        vs = [v.co.copy() for v in hat.data.vertices]
        a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
        hgt = b.z - a.z
        rim = [v for v in vs if v.z < a.z + hgt * 0.08] or vs
        rx0, rx1 = min(v.x for v in rim), max(v.x for v in rim); ry0, ry1 = min(v.y for v in rim), max(v.y for v in rim)
        hat.data.transform(Matrix.Translation(Vector((-(rx0 + rx1) / 2, -(ry0 + ry1) / 2, -a.z)))); hat.data.update()
        rimW, rimD = max(rx1 - rx0, 1e-6), max(ry1 - ry0, 1e-6)
        fit = r.get("fit", "perch")
        def slice_at(z):
            sl = [p for p in pts if abs(p.z - z) < 0.012] or pts
            return min(p.x for p in sl), max(p.x for p in sl), min(p.y for p in sl), max(p.y for p in sl)
        hb = BVHTree.FromObject(hat, bpy.context.evaluated_depsgraph_get())
        def inner_top():   # the underside of the crown above the rim's centre, in the hat's own frame
            loc, *_ = hb.ray_cast(Vector((0, 0, -0.001)), Vector((0, 0, 1)))
            return loc.z if loc is not None and loc.z > hgt * 0.25 else hgt * 0.8
        if fit in ("wrap", "enclose"):
            if fit == "wrap":
                zb = H["top"] - H["h"] * r["band"]; x0, x1, y0, y1 = slice_at(zb)
            else:
                allp = pts; x0, x1 = min(p.x for p in allp), max(p.x for p in allp); y0, y1 = min(p.y for p in allp), max(p.y for p in allp)
                zb = H["bot"] - 0.02
            e = r.get("ease", 1.05)
            sx, sy = (x1 - x0) * e / rimW, (y1 - y0) * e / rimD
            zi = inner_top()
            sz = (H["top"] + 0.02 - zb) / zi if fit == "wrap" else (H["top"] + 0.05 - zb) / zi
            sz = max(min(sz, max(sx, sy) * 1.25), min(sx, sy) * 0.7)   # a crown pressed to the skull, never a stretched tube or a pancake
            cx, cy = (x0 + x1) / 2 + r.get("dx", 0), (y0 + y1) / 2 + r.get("dy", 0)
            M = Matrix.Translation(Vector((cx, cy, zb))) @ Matrix.Rotation(rad(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Diagonal(Vector((sx, sy, sz, 1)))
            s = (sx + sy) / 2
            hat.data.transform(M); hat.data.update()
        elif fit == "perch":
            s = (2 * H["half"] * r["w"]) / max(rimW, rimD)
            cy = (H["ymin"] + H["ymax"]) / 2 + r.get("dy", 0); cx = r.get("dx", 0)
            hat.data.transform(Matrix.Rotation(rad(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Scale(s, 4)); hat.data.update()
            low = sorted(hat.data.vertices, key=lambda v: v.co.z)[: max(8, len(hat.data.vertices) // 25)]
            rest = -1e9
            for v in low:   # the skull's height under each low vertex: the hat comes down until the first one touches
                loc, *_ = bvh.ray_cast(Vector((cx + v.co.x, cy + v.co.y, H["top"] + 1)), Vector((0, 0, -1)))
                if loc is not None: rest = max(rest, loc.z - v.co.z)
            if rest < -1e8: rest = H["top"]
            hat.data.transform(Matrix.Translation(Vector((cx, cy, rest - r.get("sink", 0))))); hat.data.update()
        else:   # band: headphones, the old recipe
            wid = rimD if r.get("yaw") else rimW
            s = (2 * H["half"] * r["w"]) / max(wid, 1e-6)
            cy = (H["ymin"] + H["ymax"]) / 2 + r.get("dy", 0); bz = H["top"] - H["h"] * r["sink"]
            hat.data.transform(Matrix.Translation(Vector((r.get("dx", 0), cy, bz))) @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Scale(s, 4)); hat.data.update()
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
