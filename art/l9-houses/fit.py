# Level 9 house fit: front (Tripo's +X) turned to the kit's +Z, ground at 0, centred, uniform scale into the lot footprint, decimated.
import bpy, sys, math, json, mathutils
a = sys.argv[sys.argv.index("--")+1:]
src, dst, W, D, faces = a[0], a[1], float(a[2]), float(a[3]), int(a[4])
# the front door hole, in the fitted file's Blender metres: door centre x, the shell's front face y (negative), threshold z; the game hangs a real door there
CUT = {k: v for k, v in (x.split("=") for x in a[5:])}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(o in ms)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
o.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
o.data.transform(mathutils.Matrix.Rotation(-math.pi/2, 4, 'Z'))  # Tripo's front (-X in Blender here) turned to Blender -Y, glTF +Z: the kit's front; glTF import is quaternion-mode, so the mesh turns, not the object
vs = [o.matrix_world @ v.co for v in o.data.vertices]
mn = mathutils.Vector([min(v[i] for v in vs) for i in range(3)]); mx = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
sx, sy, sz = mx - mn
s = min(W / sx, D / sy)
for v in o.data.vertices: v.co = (v.co - mathutils.Vector(((mn.x+mx.x)/2, (mn.y+mx.y)/2, mn.z))) * s
import bmesh
if "door" in CUT:
    dx, fy, fz = map(float, CUT["door"].split(","))
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = [f for f in bm.faces if abs(f.calc_center_median().x - dx) < 0.5 and fy - 0.5 < f.calc_center_median().y < fy + 0.6 and fz - 0.05 < f.calc_center_median().z < fz + 2.1]
    bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(o.data); bm.free(); print("CUT", len(kill))
n = len(o.data.polygons)
if n > faces:
    m = o.modifiers.new("dec", 'DECIMATE'); m.ratio = faces / n
    bpy.ops.object.modifier_apply(modifier="dec")
o.name = "house"
# the inside: Tripo shells are one-sided, so from indoors the walls vanish. A copy, normals flipped and pulled 4 cm in, wears its own
# "interior" slot (the game paints it plaster) so every room reads walled and roofed from within.
inn = o.copy(); inn.data = o.data.copy(); bpy.context.scene.collection.objects.link(inn); inn.name = "interior"
bm = bmesh.new(); bm.from_mesh(inn.data); bm.normal_update()
for v in bm.verts: v.co -= v.normal * 0.04
bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update()
# box-projected UVs in metres (the Tripo atlas smeared any tiled paper), and the faces looking down are the ceiling slot
uv = bm.loops.layers.uv.verify()
for f in bm.faces:
    n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
    f.material_index = 1 if n.z < -0.5 else 0
    for lp in f.loops:
        c = lp.vert.co; lp[uv].uv = (c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y)
bm.to_mesh(inn.data); bm.free()
mat = bpy.data.materials.new("interior"); mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.78, 0.72, 0.6, 1); b.inputs["Roughness"].default_value = 0.9
ceil = bpy.data.materials.new("ceiling"); ceil.use_nodes = True; ceil.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.82, 0.74, 1)
inn.data.materials.clear(); inn.data.materials.append(mat); inn.data.materials.append(ceil)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=False, export_image_format='JPEG')
print("FIT", json.dumps({"w": sx*s, "d": sy*s, "h": sz*s, "faces": len(o.data.polygons)}))
