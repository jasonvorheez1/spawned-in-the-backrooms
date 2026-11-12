# Tripo neckwear fitted to the new cat bodies (Shelly Nov 12: "work on neckwear (eg scarves, capes, and necklaces) and disperse them in loot and npcs" + "use tripo").
# Each piece: Tripo mesh -> welded, decimated, smoothed, turned to face the cat's front (Tripo's +X -> the body's -Y), scaled to the neck or shoulders,
# seated, every vertex inside the body (plus CLEAR) pushed out along the skin, then skin weights copied from the nearest body surface, so it bends with the rig.
# Recipe: w = width / neck (or shoulder) width, at = "neck" | "shoulders", dz = drop below the neck bone (m), dy = forward (m, -y is front)
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = "/workspace/necks"; OUT = "/workspace/necks/out"; os.makedirs(OUT, exist_ok=True)
R = {
  "scarf":    dict(w=1.55, at="neck", dz=0.010, tall=None),
  "necklace": dict(w=1.30, at="neck", dz=0.020, tall=None),
  "bell":     dict(w=1.25, at="neck", dz=0.000, tall=None),
  "bowtie":   dict(w=0.75, at="neck", dz=0.012, dy=-0.035, front=True),
  "cape":     dict(w=1.10, at="shoulders", dz=-0.015, back=True),
}
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(R)
CLEAR = 0.008
def clear(): bpy.ops.wm.read_factory_settings(use_empty=True)
def body(sex):
    bpy.ops.import_scene.gltf(filepath=f"/tmp/hf/body{sex}.glb")
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name in ("Body", "Head")]   # the import carries a helper Cube and Icosphere 2 m wide: they wrecked the neck ring and the push-out
    dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new()
    for o in meshes:
        me = o.evaluated_get(dg).to_mesh(); t = bmesh.new(); t.from_mesh(me); t.transform(o.matrix_world)
        tm = bpy.data.meshes.new("t"); t.to_mesh(tm); bm.from_mesh(tm); t.free()
    bvh = BVHTree.FromBMesh(bm); pts = [v.co.copy() for v in bm.verts]
    nb = arm.pose.bones.get("mixamorig:Neck"); neck = arm.matrix_world @ nb.head
    return arm, meshes, bvh, pts, neck
def ring(pts, z, band=0.012):
    r = [p for p in pts if abs(p.z - z) < band]
    xs = sorted(abs(p.x) for p in r); return xs[int(len(xs) * 0.95)] if xs else 0.06
def load(kind):
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    ms = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data); bm.free()
    d = o.modifiers.new("d", "DECIMATE"); d.ratio = min(1.0, 6000 / max(1, len(o.data.polygons))); bpy.ops.object.modifier_apply(modifier="d")
    m = o.modifiers.new("s", "CORRECTIVE_SMOOTH"); m.iterations = 4; bpy.ops.object.modifier_apply(modifier="s")
    for p in o.data.polygons: p.use_smooth = True
    for s in o.material_slots:
        if s.material: s.material.name = "cloth"
    o.data.transform(Matrix.Rotation(math.radians(-90), 4, "Z"))   # Tripo's front (+X) to the cat's front (-Y)
    o.name = "Neck_" + o.name
    return o
for sex in ("f", "m"):
    for kind in only:
        if not os.path.exists(f"{SRC}/{kind}.glb"): print("MISSING", kind); continue
        clear(); arm, meshes, bvh, pts, neck = body(sex); r = R[kind]
        o = load(kind)
        vs = [v.co for v in o.data.vertices]
        a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
        if r["at"] == "neck":
            half = ring(pts, neck.z - r["dz"]); target = 2 * half * r["w"]
        else:
            sh = neck.z - 0.03; half = ring(pts, sh, 0.02); target = 2 * half * r["w"]
        s = target / max(b.x - a.x, 1e-6)
        # neck pieces: centre on the neck; a cape's top hangs at the shoulder line; a bow tie sits at the throat front
        if r.get("back"): anchor = Vector(((a.x + b.x) / 2, (a.y + b.y) / 2, b.z))
        else: anchor = Vector(((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2 if not r.get("front") else (a.z + b.z) / 2))
        at = Vector((0, neck.y + r.get("dy", 0), neck.z - r["dz"]))
        if r.get("back"): at = Vector((0, neck.y + 0.01, neck.z - r["dz"] + 0.02))
        if r.get("front"):
            loc, n, i, d = bvh.ray_cast(Vector((0, -1, at.z)), Vector((0, 1, 0)))
            if loc: at.y = loc.y - (b.y - a.y) * s * 0.5 - 0.004
        o.data.transform(Matrix.Translation(at) @ Matrix.Scale(s, 4) @ Matrix.Translation(-anchor)); o.data.update()
        pushed = 0
        for v in o.data.vertices:
            loc, n, i, d = bvh.find_nearest(v.co)
            if loc is None: continue
            if (v.co - loc).dot(n) < 0 or d < CLEAR: v.co = loc + n * CLEAR; pushed += 1
        o.data.update()
        # weights from the nearest skin
        src = next(m for m in meshes if m.name == "Body") if any(m.name == "Body" for m in meshes) else meshes[0]
        for vg in src.vertex_groups: o.vertex_groups.new(name=vg.name)
        dt = o.modifiers.new("w", "DATA_TRANSFER"); dt.object = src; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
        dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="w")
        for vg in list(o.vertex_groups):
            if not any(vg.index in [g.group for g in v.groups if g.weight > 0] for v in o.data.vertices[:]): o.vertex_groups.remove(vg)
        for x in list(bpy.context.scene.objects):
            if x.type == "MESH" and x != o: bpy.data.objects.remove(x)
        print("SEAT", kind, sex, "neck", tuple(round(c, 3) for c in neck))
        if arm.animation_data: arm.animation_data.action = None
        for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
        o.parent = arm; o.modifiers.new("skin", "ARMATURE").object = arm
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", export_skins=True, export_animations=False, export_apply=False)
        print("NECK", kind, sex, "scale", round(s, 4), "pushed", pushed, "tris", sum(len(p.vertices) - 2 for p in o.data.polygons), "groups", len(o.vertex_groups))
