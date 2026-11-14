# 3D Model Studio pass for the Level 6.1 Tripo props (payphones, vent grille, coffee urn, planter, tray-return cabinet).
# Source: the raw Tripo GLBs in /workspace/l61pass (see *.log). Per prop: join, weld seams, drop loose crumbs,
# retopo to a mobile budget (collapse decimate, triangulated), auto-smooth, true height, bottom-centre origin,
# material cleanup (ORM: metallic capped per prop, roughness floored so steel doesn't render black; textures 1024),
# proof renders of the true front (Blender +X = glTF +x, so placements use forward "+x") and the side, beside a 1.7 m figure.
import bpy, bmesh, mathutils, math, os
import numpy as np
SRC, OUT = "/workspace/l61pass", "/workspace/l61pass/out"
os.makedirs(OUT, exist_ok=True)
SPEC = {  # name: (height m, tri budget, metallic cap, roughness floor)
  "phone":   (0.95, 16000, 0.55, 0.38),
  "vent":    (0.96, 10000, 0.45, 0.45),
  "urn":     (0.55, 10000, 0.70, 0.30),
  "planter": (2.60, 16000, 0.00, 0.55),
  "cabinet": (1.20, 12000, 0.45, 0.40),
}
ONLY = os.environ.get("ONLY")
def bbox(o):
  vs = [o.matrix_world @ v.co for v in o.data.vertices]
  return mathutils.Vector([min(v[i] for v in vs) for i in range(3)]), mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
for name, (h, budget, mcap, rfloor) in SPEC.items():
  if ONLY and name != ONLY: continue
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
  ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
  bpy.ops.object.select_all(action="DESELECT")
  for o in ms: o.select_set(True)
  bpy.context.view_layer.objects.active = ms[0]
  if len(ms) > 1: bpy.ops.object.join()
  o = bpy.context.view_layer.objects.active
  bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
  for e in [x for x in bpy.context.scene.objects if x.type != "MESH"]: bpy.data.objects.remove(e)
  bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
  t0 = len(o.data.polygons)
  # weld + crumbs
  bm = bmesh.new(); bm.from_mesh(o.data)
  bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
  bm.verts.ensure_lookup_table()
  seen, isl = set(), []
  for v in bm.verts:
    if v.index in seen: continue
    stack, comp = [v], []
    seen.add(v.index)
    while stack:
      x = stack.pop(); comp.append(x)
      for e in x.link_edges:
        y = e.other_vert(x)
        if y.index not in seen: seen.add(y.index); stack.append(y)
    isl.append(comp)
  crumbs = [c for c in isl if len(c) < 12]
  bmesh.ops.delete(bm, geom=[v for c in crumbs for v in c], context="VERTS")
  bm.to_mesh(o.data); bm.free()
  # retopo to budget
  tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
  if tris > budget:
    m = o.modifiers.new("dec", "DECIMATE"); m.ratio = budget / tris; m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")
  bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
  for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
  # true scale, bottom-centre origin
  a, b = bbox(o); s = h / (b.z - a.z)
  o.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True)
  a, b = bbox(o); c = (a + b) / 2
  o.data.transform(mathutils.Matrix.Translation((-c.x, -c.y, -a.z))); o.data.update()
  # materials: one slot named for the prop, textures 1024, ORM cleaned
  for mat in o.data.materials:
    if mat: mat.name = f"{name}_body"
  for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
    if img.name.startswith("ORM"):
      px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
      px[:, 1] = np.maximum(px[:, 1], rfloor)          # G = roughness
      px[:, 2] = np.minimum(px[:, 2], mcap)            # B = metallic
      img.pixels[:] = px.ravel(); img.update()
  a, b = bbox(o); d = b - a
  print(f"FIT {name}: front-width(y)={d.y:.3f} depth(x)={d.x:.3f} h={d.z:.3f} tris {t0} -> {sum(len(p.vertices)-2 for p in o.data.polygons)} crumbs={len(crumbs)}")
  bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
  # proofs: true front from +X, side from -Y, a 1.7 m figure beside for scale, lit from the camera side
  sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16
  sc.render.resolution_x = sc.render.resolution_y = 512
  w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
  w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.55, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
  bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.7, location=(0, d.y / 2 + 0.45, 0.85))
  fig = bpy.context.active_object
  fm = bpy.data.materials.new("fig"); fm.diffuse_color = (0.2, 0.4, 0.8, 1); fig.data.materials.append(fm)
  cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
  sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3.5; sc.collection.objects.link(sun)
  R = max(max(d), 1.7) * 2.0
  for tag, pos in (("front", (R, 0.3, 0.9)), ("side", (0.3, -R, 0.9))):
    cam.location = pos
    rot = (mathutils.Vector((0, 0.2, 0.85)) - mathutils.Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    cam.rotation_euler = rot; sun.rotation_euler = rot
    sc.render.filepath = f"{OUT}/{name}-{tag}.png"; bpy.ops.render.render(write_still=True)
