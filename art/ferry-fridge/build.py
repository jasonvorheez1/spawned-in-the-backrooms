# Ferry's fridge (Level 169): Tripo body, mirrored so the handle sits on the viewer's right, scaled around the scripted cabinet,
# split into a body (front cut open) and a door leaf whose origin is Ferry's hinge (root local x .39, z -.262, y .16).
import bpy, bmesh, math
from mathutils import Matrix, Vector
D = "/workspace/art/ferry-fridge/"
W, H, BACK, FRONT, CUT, Y0, HX = 0.83, 1.77, -0.31, 0.36, 0.262, 0.16, 0.39
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/art/kitchen169/fridge.glb")
src = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.context.view_layer.objects.active = src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = src.data
# face +Y (exports as engine -Z) and mirror x: rot 180 about z then x -> -x  == just y -> -y
M = Matrix.Diagonal((1, -1, 1, 1)); me.transform(M); me.flip_normals()
vs = [v.co for v in me.vertices]
mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
sx, sy, sz = W / (mx[0]-mn[0]), (FRONT-BACK) / (mx[1]-mn[1]), H / (mx[2]-mn[2])
for v in me.vertices:
    v.co = Vector(((v.co.x-(mn[0]+mx[0])/2)*sx, BACK + (v.co.y-mn[1])*sy, (v.co.z-mn[2])*sz))
me.update()
# cut: plane y = CUT, then z = Y0 on the front part
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:]+bm.edges[:]+bm.faces[:], plane_co=(0, CUT, 0), plane_no=(0, 1, 0))
bmesh.ops.bisect_plane(bm, geom=bm.verts[:]+bm.edges[:]+bm.faces[:], plane_co=(0, 0, Y0), plane_no=(0, 0, 1))
bm.faces.ensure_lookup_table()
keep = set(f.index for f in bm.faces if f.calc_center_median().y > CUT and f.calc_center_median().z > Y0)
door = [f for f in bm.faces if f.index in keep]
bmd = bm.copy()
bmesh.ops.delete(bm, geom=door, context="FACES")
bm.to_mesh(me); bm.free()
dme = bpy.data.meshes.new("door"); bmd.faces.ensure_lookup_table()
bmesh.ops.delete(bmd, geom=[f for f in bmd.faces if f.index not in keep], context="FACES")
for v in bmd.verts: v.co = Vector((v.co.x - HX, v.co.y - CUT, v.co.z))   # hinge at origin; engine lands the lowest point (Y0) on the door's feet
bmd.to_mesh(dme); bmd.free()
for p in me.polygons: p.use_smooth = True
for p in dme.polygons: p.use_smooth = True
for m in me.materials: dme.materials.append(m)
dobj = bpy.data.objects.new("door", dme); bpy.context.scene.collection.objects.link(dobj)
src.name = "body"
def export(o, path):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)
export(src, D + "body.glb"); export(dobj, D + "door.glb")
print("tris body", sum(len(p.vertices)-2 for p in me.polygons), "door", sum(len(p.vertices)-2 for p in dme.polygons))
# proof: door opened 100 deg on the body
dobj.location = (HX, CUT, 0); dobj.rotation_euler = (0, 0, math.radians(-100))
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 700; sc.render.resolution_y = 900
w = bpy.data.worlds.new("w"); w.color = (0.6, 0.6, 0.6); sc.world = w
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (-1.6, 3.0, 1.6); cam.rotation_euler = (math.radians(72), 0, math.radians(208))
L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); L.data.energy = 3; L.rotation_euler = (math.radians(50), 0, math.radians(200)); sc.collection.objects.link(L)
sc.render.filepath = "/tmp/ferry_proof.png"; bpy.ops.render.render(write_still=True)
