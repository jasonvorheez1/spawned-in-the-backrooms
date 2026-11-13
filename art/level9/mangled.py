# The Mangled (Level 9): Tripo mesh + Tripo biped/mixamo rig -> metres, feet at origin, front -Y (glb +Z), weld, smooth, slot "skin".
# run: blender -b --factory-startup --python-exit-code 1 --python art/level9/mangled.py
import bpy, math, mathutils
SRC, OUT, H = "/workspace/l9/mangled/mangled-rig.glb", "/workspace/l9/mangled/mangled-final.glb", 2.5
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
rig = next(o for o in sc.objects if o.type == "ARMATURE")
meshes = [o for o in sc.objects if o.type == "MESH" and o.vertex_groups]
for o in list(sc.objects):
    if o not in meshes and o is not rig and o.type == "MESH": bpy.data.objects.remove(o)  # bone widgets
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
if rig.animation_data: rig.animation_data_clear()
print("bones", [b.name for b in rig.data.bones][:70])
def bounds():
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for m in meshes:
        e = m.evaluated_get(dg); pts += [e.matrix_world @ v.co for v in e.data.vertices]
    return pts
# unparent everything to world keeping transforms, then turn + scale body and rig together through data
for o in [rig] + meshes:
    mw = o.matrix_world.copy(); 
    if o is rig: o.parent = None
    o.matrix_world = mw
bpy.context.view_layer.update()
pts = bounds(); zs = [p.z for p in pts]; s = H / (max(zs) - min(zs))
M = mathutils.Matrix.Scale(s, 4) @ mathutils.Matrix.Rotation(math.radians(-90), 4, "Z")   # file front +X -> Blender -Y
for o in [rig] + meshes:
    if o.parent is None or o is rig: o.matrix_world = M @ o.matrix_world
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="DESELECT")
for o in [rig] + meshes: o.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
pts = bounds(); cx = (max(p.x for p in pts) + min(p.x for p in pts)) / 2; cy = (max(p.y for p in pts) + min(p.y for p in pts)) / 2; z0 = min(p.z for p in pts)
T = mathutils.Matrix.Translation((-cx, -cy, -z0))
rig.data.transform(T)
for m in meshes: m.data.transform(T)
bpy.context.view_layer.update()
tris = 0
for m in meshes:
    bpy.context.view_layer.objects.active = m
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode="OBJECT")
    for p in m.data.polygons: p.use_smooth = True
    for i, sl in enumerate(m.material_slots):
        if sl.material:
            sl.material.name = "skin" if i == 0 else f"skin{i}"
            b = sl.material.node_tree.nodes.get("Principled BSDF") if sl.material.node_tree else None
            if b: b.inputs["Roughness"].default_value = 0.28   # wet
    m.data.calc_loop_triangles(); tris += len(m.data.loop_triangles)
pts = bounds(); print("SIZE", [round(max(getattr(p, a) for p in pts) - min(getattr(p, a) for p in pts), 3) for a in "xyz"], "minz", round(min(p.z for p in pts), 4), "tris", tris)
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_animations=False, export_yup=True)
# ---- proof: rest front + stride pose side/34 (weights), lit from each camera
def bone(n): return next(b for b in rig.pose.bones if b.name.split(":")[-1] == n)
def cam(name, loc):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(c); c.location = loc
    c.rotation_euler = (mathutils.Vector((0, 0, 1.25)) - mathutils.Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    l = bpy.data.objects.new(name + "L", bpy.data.lights.new(name + "L", "SUN")); sc.collection.objects.link(l); l.rotation_euler = c.rotation_euler; l.data.energy = 3
    return c
sc.render.engine, sc.cycles.samples = "CYCLES", 12
sc.render.resolution_x, sc.render.resolution_y = 560, 760
sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1)
bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=1.7, location=(1.1, 0, 0.85))   # a 1.7 m player post
cams = [cam("front", (0, -6, 1.3)), cam("side", (6, 0, 1.3)), cam("q", (4.2, -4.2, 2.0))]
def shot(tag, c):
    for o in sc.objects:
        if o.type == "LIGHT": o.hide_render = o.name != c.name + "L"
    sc.camera = c; sc.render.filepath = f"/tmp/mangled/{tag}.png"; bpy.ops.render.render(write_still=True)
shot("a_rest", cams[0])
for n, ax, deg in (("LeftUpLeg", "X", -45), ("RightUpLeg", "X", 35), ("LeftLeg", "X", 50), ("RightLeg", "X", 25), ("LeftArm", "Z", -60), ("RightArm", "Z", 60), ("LeftForeArm", "Z", -40), ("Spine", "X", 15)):
    b = bone(n); b.rotation_mode = "XYZ"; setattr(b.rotation_euler, ax.lower(), math.radians(deg))
bpy.context.view_layer.update()
shot("b_stride_side", cams[1]); shot("c_stride_q", cams[2])
