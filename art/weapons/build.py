# Tripo weapon meshes -> game convention (glTF space): length along +Z (handle near 0, head/muzzle far +Z),
# melee heads/blades toward +X, guns upright (+Y top, grip -Y). Fit to the old scripted weapon's box.
import bpy, json, sys, os, math
from mathutils import Matrix, Vector
D = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(D, "fit.json")))
SRC = "/workspace/tripo"; OUT = "/tmp/weapons"; os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(CFG)
# glTF (x,y,z) -> Blender (x,-z,y)
def g2b(v): return Vector((v[0], -v[2], v[1]))
for kind in only:
    c = CFG[kind]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects: o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o != ob: bpy.data.objects.remove(o)
    # a manual pre-rotation (degrees, Blender XYZ) from fit.json, then axis mapping by extents
    r = c.get("rot", [0, 0, 0])
    ob.data.transform(Matrix.Rotation(math.radians(r[0]), 4, "X") @ Matrix.Rotation(math.radians(r[1]), 4, "Y") @ Matrix.Rotation(math.radians(r[2]), 4, "Z"))
    if c.get("pca"):  # a model Tripo posed on a diagonal: turn its principal axes onto Blender's before the extents pick them
        import numpy as np
        P = np.array([tuple(v.co) for v in ob.data.vertices]); ctr = P.mean(0)
        Vt = np.linalg.svd(P - ctr, full_matrices=False)[2]
        if np.linalg.det(Vt) < 0: Vt[2] *= -1
        ob.data.transform(Matrix.Translation(-Vector(ctr.tolist())))
        ob.data.transform(Matrix([list(r) + [0] for r in Vt.tolist()] + [[0, 0, 0, 1]]))
    vs = [v.co for v in ob.data.vertices]
    ext = [max(v[i] for v in vs) - min(v[i] for v in vs) for i in range(3)]
    order = sorted(range(3), key=lambda i: -ext[i])  # longest, second, third (Blender axes)
    L, S2, S3 = order
    # targets in Blender axes: length -> -Y (glTF +Z); second -> X (melee head) or Z (gun height / crowbar bend)
    sec = 2 if c.get("second") == "up" else 0
    third = 2 if sec == 0 else 0
    M = Matrix.Identity(3) * 0
    def put(src, dst, sign): M[dst][src] = sign
    put(L, 1, -1 * (-1 if c.get("flipLen") else 1))
    put(S2, sec, -1 if c.get("flip2") else 1)
    put(S3, third, 1)
    if M.determinant() < 0: M[third][S3] *= -1
    ob.data.transform(M.to_4x4())
    vs = [v.co for v in ob.data.vertices]
    lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
    tmin, tmax = g2b(c["min"]), g2b(c["max"])
    tlo = Vector([min(tmin[i], tmax[i]) for i in range(3)]); thi = Vector([max(tmin[i], tmax[i]) for i in range(3)])
    s = (thi.y - tlo.y) / (hi.y - lo.y)
    ob.data.transform(Matrix.Scale(s, 4))
    lo *= s; hi *= s
    off = Vector(((tlo.x + thi.x) / 2 - (lo.x + hi.x) / 2, thi.y - hi.y, tlo.z - lo.z))
    if c.get("second") == "up": off.z = (tlo.z + thi.z) / 2 - (lo.z + hi.z) / 2
    ob.data.transform(Matrix.Translation(off))
    if len(ob.data.polygons) > 7000:
        m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = 7000 / len(ob.data.polygons)
        bpy.ops.object.modifier_apply(modifier="dec")
    ob.name = kind
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}.glb", export_apply=True, use_selection=False)
    # proof: top view (glTF +Z = up the picture) and side view, plus a red dot at the glTF +Z end, green at +X
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    sc.render.resolution_x = 900; sc.render.resolution_y = 450
    w = bpy.data.worlds.new("w"); w.color = (0.25, 0.25, 0.25); sc.world = w
    for loc, col in [((0, -thi.y - 0.0, 0), (1, 0, 0, 1)), ((0.25, -thi.y / 2, 0), (0, 1, 0, 1))]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, location=(loc[0], -(thi.y - tlo.y) - tlo.y if False else loc[1], loc[2]))
        mt = bpy.data.materials.new("m"); mt.diffuse_color = col; mt.use_nodes = True
        mt.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = col
        mt.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 3
        bpy.context.object.data.materials.append(mt)
    bpy.ops.object.light_add(type="SUN", rotation=(0.6, 0.3, 0)); bpy.context.object.data.energy = 4
    ctr = Vector(((tlo.x + thi.x) / 2, (tlo.y + thi.y) / 2, (tlo.z + thi.z) / 2)); span = thi.y - tlo.y
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = span * 1.3
    for tag, loc, rot in [("top", ctr + Vector((0, 0, 3)), (0, 0, math.radians(90))), ("side", ctr + Vector((3, 0, 0)), (math.radians(90), 0, math.radians(90)))]:
        cam.location = loc; cam.rotation_euler = rot
        sc.render.filepath = f"{OUT}/{kind}-{tag}.png"; bpy.ops.render.render(write_still=True)
    print("DONE", kind, "faces", len(ob.data.polygons), "ext", [round(e, 3) for e in ext], "scale", round(s, 4))
