# Level 11 strip-mall props: Tripo source -> Studio refine (true scale, feet origin, -Z front, decimate, clean mats) -> glb + proof
import bpy, sys, math
from mathutils import Vector
SRC = "/workspace/art/l11-mall/src/"; OUT = "/workspace/art/l11-mall/out/"
PIECES = {  # name: (target height m, face budget tris)
  "labstool": (0.62, 8000), "specfridge": (1.85, 8000), "drawchair": (1.15, 10000), "breadrack": (1.45, 12000), "backdoor": (2.10, 6000),
}
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def clear():
  bpy.ops.wm.read_factory_settings(use_empty=True)
for name, (h, budget) in PIECES.items():
  if ONLY and name not in ONLY: continue
  clear()
  bpy.ops.import_scene.gltf(filepath=SRC + name + ".glb")
  meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
  bpy.ops.object.select_all(action="DESELECT")
  for o in meshes: o.select_set(True)
  bpy.context.view_layer.objects.active = meshes[0]
  bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
  if len(meshes) > 1: bpy.ops.object.join()
  ob = bpy.context.view_layer.objects.active
  ob.parent = None
  # measure, scale to true height, feet at origin, centred in XZ
  pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
  mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
  mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
  s = h / (mx.z - mn.z)
  for v in ob.data.vertices:
    p = ob.matrix_world @ v.co
    v.co = Vector(((p.x - (mn.x + mx.x) / 2) * s, (p.y - (mn.y + mx.y) / 2) * s, (p.z - mn.z) * s))
  ob.matrix_world.identity()
  # topology: merge doubles, decimate to budget, smooth by angle
  bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
  bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode="OBJECT")
  tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
  if tris > budget:
    m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = budget / tris
    bpy.ops.object.modifier_apply(modifier="dec")
  bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
  for mat in ob.data.materials:
    if mat and mat.node_tree:
      for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED": n.inputs["Roughness"].default_value = max(0.25, n.inputs["Roughness"].default_value)
  tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
  d = ob.dimensions; print(f"{name}: {d.x:.3f} x {d.y:.3f} x {d.z:.3f} m, {tris} tris")
  bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", export_apply=True, export_yup=True)
  # proof
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
  sc.render.resolution_x = 512; sc.render.resolution_y = 512; sc.render.film_transparent = False
  w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.55, 0.55, 0.55)
  cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
  r = max(d) * 2.2; cam.location = (r * 0.7, -r * 0.9, h * 0.9)
  cam.rotation_euler = (Vector((0, 0, h * 0.45)) - cam.location).to_track_quat("-Z", "Y").to_euler()
  L = bpy.data.objects.new("L", bpy.data.lights.new("L", "AREA")); L.data.energy = 300 * r * r; L.data.size = r
  L.location = cam.location + Vector((0, 0, r)); sc.collection.objects.link(L)
  L.rotation_euler = (Vector((0, 0, 0)) - L.location).to_track_quat("-Z", "Y").to_euler()
  sc.render.filepath = OUT + name + "-proof.png"; bpy.ops.render.render(write_still=True)
