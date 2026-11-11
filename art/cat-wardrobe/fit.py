# Fit one Tripo garment to a new-cat body and skin it to her rig.  blender -b -P fit.py -- <garment.glb> <f|m> <top|skirt|boots> <out.glb> [body.glb]
# garment: Tripo raw (front +X glTF, arms along Z). body: the wisp's cat-<sex>-rigged.glb (front -Y in Blender, arms along X, feet z=0, 1.2 m).
# Steps: turn to the body's front, cut any hands/feet Tripo grew, two-point scale onto the body's own landmarks, push every vertex out of the skin
# (margin), copy the Body's bone weights by nearest surface, export garment + armature only (material "cloth", tinted in game by mat-cloth.js).
import bpy, sys, math, numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index("--") + 1:]; GARM, SEX, KIND, OUT = A[:4]
BODYF = A[4] if len(A) > 4 else f"/workspace/tripo-cat/cat-{'female' if SEX == 'f' else 'male'}-rigged.glb"
B = {"f": dict(top=(0.425, 0.626), arm=(0.095, 0.245, 0.36), leg=(0.36, 0.19, 0.065), waist=0.435),
     "m": dict(top=(0.435, 0.705), arm=(0.11, 0.27, 0.405), leg=(0.40, 0.21, 0.075), waist=0.47)}[SEX]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODYF)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); body = bpy.data.objects["Body"]
arm.data.pose_position = "REST"; bpy.context.view_layer.update()
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name != "Body": bpy.data.objects.remove(o, do_unlink=True)
bw = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
print("body bounds", bw.min(0).round(3), bw.max(0).round(3))
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=GARM)
gs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in gs: o.select_set(True)
bpy.context.view_layer.objects.active = gs[0]
if len(gs) > 1: bpy.ops.object.join()
g = bpy.context.view_layer.objects.active; g.name = "Garment"
g.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = g.data
P = np.array([v.co[:] for v in me.vertices])
# front +X -> -Y (turn -90 deg about Z): (x, y, z) -> (y, -x, z)
P = np.stack([P[:, 1], -P[:, 0], P[:, 2]], 1)
if KIND == "boots": P = np.stack([P[:, 0], P[:, 1], P[:, 2]], 1)
lo, hi = P.min(0), P.max(0); c = (lo + hi) / 2
P[:, 0] -= c[0]; P[:, 1] -= c[1]; P[:, 2] -= lo[2]
H = P[:, 2].max(); half = np.abs(P[:, 0]).max()
kill = np.zeros(len(P), bool)
def torso_y(pts, x_in, z0, z1):
    s = pts[(np.abs(pts[:, 0]) < x_in) & (pts[:, 2] > z0) & (pts[:, 2] < z1)]; return s[:, 1].min(), s[:, 1].max()
if KIND == "top":
    kill = np.abs(P[:, 0]) > half * 0.90                      # the hands Tripo grows past the cuffs
    cuff = half * 0.90
    sl = P[(np.abs(P[:, 0]) > half * 0.55) & ~kill]; zs = np.median(sl[:, 2])     # sleeve axis height
    ba = bw[(np.abs(bw[:, 0]) > B["arm"][1] - 0.03) & (np.abs(bw[:, 0]) < B["arm"][1] + 0.03)]; za = np.median(ba[:, 2])
    z_hem = B["top"][0] - 0.035
    sz = (za - z_hem) / zs; P[:, 2] = z_hem + P[:, 2] * sz
    sx = (B["arm"][2] - 0.025) / cuff; P[:, 0] *= sx
    gy0, gy1 = torso_y(P, B["arm"][0] * 0.8, z_hem, za - 0.02); by0, by1 = torso_y(bw, B["arm"][0] * 0.8, z_hem, za - 0.02)
    sy = ((by1 - by0) * 1.22 + 0.03) / (gy1 - gy0); P[:, 1] = (P[:, 1] - (gy0 + gy1) / 2) * sy + (by0 + by1) / 2
    region = lambda q: q[:, 2] > z_hem - 0.05
elif KIND == "skirt":
    z_top = B["waist"] + 0.012; z_bot = B["leg"][0] - (B["leg"][0] - B["leg"][1]) * 0.55
    P[:, 2] = z_bot + P[:, 2] / H * (z_top - z_bot)
    wb = bw[(bw[:, 2] > B["waist"] - 0.02) & (bw[:, 2] < B["waist"] + 0.02) & (np.abs(bw[:, 0]) < 0.2)]
    top = P[P[:, 2] > z_top - 0.02 * (z_top - z_bot) / 0.1]
    sx = (np.abs(wb[:, 0]).max() + 0.012) / np.abs(top[:, 0]).max(); P[:, 0] *= sx
    sy = ((wb[:, 1].max() - wb[:, 1].min()) / 2 + 0.012) / np.abs(top[:, 1]).max(); P[:, 1] = P[:, 1] * sy + (wb[:, 1].max() + wb[:, 1].min()) / 2
    region = lambda q: (q[:, 2] > z_bot - 0.03) & (q[:, 2] < z_top + 0.03)
else:  # boots: a pair side by side -> each foot
    z_top = B["leg"][2] + (B["leg"][1] - B["leg"][2]) * 0.45
    P[:, 2] = P[:, 2] / H * (z_top + 0.004) - 0.004
    ft = bw[bw[:, 2] < z_top]; fx = np.abs(ft[:, 0])
    sx = (fx.max() + 0.012) / half; P[:, 0] *= sx
    sy = ((ft[:, 1].max() - ft[:, 1].min()) / 2 + 0.014) / np.abs(P[:, 1]).max(); P[:, 1] = P[:, 1] * sy + (ft[:, 1].max() + ft[:, 1].min()) / 2
    region = lambda q: q[:, 2] < z_top + 0.03
for v, p in zip(me.vertices, P): v.co = p
if kill.any():
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero(kill)[0]], context="VERTS"); bm.to_mesh(me); bm.free()
# push out of the skin
dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(body, dg)
M = 0.007 if KIND != "boots" else 0.004; moved = 0
for it in range(3):
    for v in me.vertices:
        hit = bvh.find_nearest(v.co)
        if hit[0] is None: continue
        p, n = hit[0], hit[1]; d = (v.co - p).dot(n)
        if d < M and (v.co - p).length < 0.12: v.co = p + n * M; moved += 1
print("pushed", moved, "of", len(me.vertices) * 3)
# smooth the pushed shell a touch, then re-push once so it stays outside
sm = g.modifiers.new("s", "SMOOTH"); sm.factor = 0.5; sm.iterations = 2
bpy.context.view_layer.objects.active = g; bpy.ops.object.modifier_apply(modifier="s")
inside = 0
for v in me.vertices:
    hit = bvh.find_nearest(v.co); p, n = hit[0], hit[1]
    if (v.co - p).dot(n) < M * 0.6 and (v.co - p).length < 0.12: v.co = p + n * M; inside += 1
print("re-pushed", inside)
# weights from the body
for vg in body.vertex_groups: g.vertex_groups.new(name=vg.name)
dt = g.modifiers.new("dt", "DATA_TRANSFER"); dt.object = body; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
bpy.ops.object.modifier_apply(modifier="dt")
if KIND == "top":   # nothing on a top follows the tail or the legs
    for n in [vg.name for vg in g.vertex_groups if "Tail" in vg.name or "Leg" in vg.name or "Foot" in vg.name or "Toe" in vg.name]: g.vertex_groups.remove(g.vertex_groups[n])
if KIND != "top":
    for n in [vg.name for vg in g.vertex_groups if "Tail" in vg.name]: g.vertex_groups.remove(g.vertex_groups[n])
bpy.ops.object.vertex_group_normalize_all(lock_active=False); bpy.ops.object.vertex_group_limit_total(limit=4)
g.parent = arm; am = g.modifiers.new("Armature", "ARMATURE"); am.object = arm
mat = bpy.data.materials.new("cloth"); mat.use_nodes = True
old = me.materials[0] if me.materials else None
if old and old.use_nodes:   # keep Tripo's grey fabric picture as the base map
    tex = next((n for n in old.node_tree.nodes if n.type == "TEX_IMAGE"), None)
    if tex:
        t = mat.node_tree.nodes.new("ShaderNodeTexImage"); t.image = tex.image
        mat.node_tree.links.new(t.outputs["Color"], mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
me.materials.clear(); me.materials.append(mat)
bpy.ops.object.shade_smooth()

# proof: the garment on its own body and rig, rest then a stride with one arm up, three sides each, lit from the camera
import os
if os.environ.get("PROOF"):
    arm.data.pose_position = "POSE"
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    arm.animation_data_clear()
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    pm = bpy.data.materials.new("pg"); pm.diffuse_color = (0.8, 0.22, 0.28, 1); pm.use_nodes = True; pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.22, 0.28, 1)
    me.materials.clear(); me.materials.append(pm)
    fm = bpy.data.materials.new("pf"); fm.use_nodes = True; fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.7, 0.45, 1)
    body.data.materials.clear(); body.data.materials.append(fm)
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x = 440; sc.render.resolution_y = 520; sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    zc = float(bw[:, 2].max()) * 0.5
    for pose in ("rest", "walk"):
        if pose == "walk":
            for n, q in (("LeftUpLeg", (-40, 0, 0)), ("RightUpLeg", (35, 0, 0)), ("LeftArm", (0, 0, 60)), ("RightArm", (0, 0, -70)), ("RightForeArm", (0, 0, -40)), ("Spine1", (14, 0, 0))):
                pb = arm.pose.bones.get("mixamorig:" + n)
                if pb: pb.rotation_mode = "XYZ"; pb.rotation_euler = [math.radians(v) for v in q]
        for ang in (25, 115, 180):
            r = math.radians(ang); cd = bpy.data.cameras.new("c"); cd.lens = 55; c = bpy.data.objects.new("c", cd); sc.collection.objects.link(c)
            c.location = (2.9 * math.sin(r), -2.9 * math.cos(r), zc + 0.25); c.rotation_euler = (Vector((0, 0, zc)) - c.location).to_track_quat("-Z", "Y").to_euler()
            ld = bpy.data.lights.new("l", "SUN"); ld.energy = 3; l = bpy.data.objects.new("l", ld); sc.collection.objects.link(l); l.rotation_euler = c.rotation_euler
            sc.camera = c; sc.render.filepath = f"{os.environ['PROOF']}_{pose}_{ang:03d}.png"; bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(l); bpy.data.objects.remove(c)
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0)
    me.materials.clear(); me.materials.append(mat)
arm.data.pose_position = "POSE"
bpy.data.objects.remove(body, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animations=False, export_image_format="JPEG", export_jpeg_quality=80)
gw = np.array([v.co[:] for v in me.vertices]); print("garment", len(gw), gw.min(0).round(3), gw.max(0).round(3), "->", OUT)
