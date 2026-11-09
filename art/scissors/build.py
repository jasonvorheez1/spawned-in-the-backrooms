# Stylist's hair shears: 16 cm, two steel blades on a pivot screw, pink ring handles. Blender -Y front = glTF +Z; blade tips point -Y (forward).
import bpy, bmesh, math
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n, c, m=0.0, r=0.4):
    M = bpy.data.materials.new(n); b = M.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Metallic"].default_value = m; b.inputs["Roughness"].default_value = r; return M
steel, pink, screw = mat("steel", (0.8, 0.82, 0.85), 1, 0.18), mat("handle_pink", (0.9, 0.25, 0.55), 0, 0.35), mat("screw", (0.3, 0.3, 0.32), 1, 0.3)
parts = []
def blade(side):
    bm = bmesh.new()
    pts = [(0, 0.0), (0.006 * side, -0.01), (0.007 * side, -0.04), (0.003 * side, -0.085), (0.0, -0.09), (-0.001 * side, -0.04), (-0.002 * side, 0.0)]
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]; f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, 0.0025))
    me = bpy.data.meshes.new("blade"); bm.to_mesh(me); o = bpy.data.objects.new("blade", me); bpy.context.collection.objects.link(o)
    o.data.materials.append(steel); o.location.z = 0.0025 if side > 0 else 0; o.rotation_euler.z = math.radians(-6 * side); parts.append(o)
    # shank and ring handle
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0025, depth=0.035, location=(0.006 * side, 0.018, o.location.z + 0.001)); s = bpy.context.object
    s.rotation_euler.x = math.radians(90); s.rotation_euler.z = math.radians(-14 * side); s.data.materials.append(steel); parts.append(s)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.012 if side > 0 else 0.0105, minor_radius=0.0032, location=(0.013 * side, 0.045, o.location.z + 0.001)); t = bpy.context.object
    t.data.materials.append(pink); parts.append(t)
blade(1); blade(-1)
bpy.ops.mesh.primitive_cylinder_add(radius=0.004, depth=0.008, location=(0, 0, 0.0025)); sc = bpy.context.object; sc.data.materials.append(screw); parts.append(sc)
bpy.ops.object.select_all(action="DESELECT")
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
for p in o.data.polygons: p.use_smooth = True
s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 16; s.render.resolution_x = s.render.resolution_y = 512
bpy.ops.object.camera_add(location=(0.1, -0.05, 0.18)); cam = bpy.context.object; s.camera = cam
c = cam.constraints.new("TRACK_TO"); c.target = o
bpy.ops.object.light_add(type="AREA", location=(0.1, -0.1, 0.3)); bpy.context.object.data.energy = 30
w = bpy.data.worlds.new("w"); s.world = w; w.color = (0.6, 0.6, 0.65)
s.render.filepath = "/workspace/scissors/proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
bpy.ops.export_scene.gltf(filepath="/workspace/scissors/scissors.glb", use_selection=True, export_apply=True)
print("tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
