# Level 9 props: the 3D Modeling Studio pass over the Tripo meshes.
# blender -b --factory-startup --python-exit-code 1 --python art/level9/props.py   (L9_ONLY=a,b for a subset)
# raw /workspace/l9/raw/<name>.glb -> /workspace/l9/props/<name>.glb : real metres, origin ground centre, front Blender -Y (glb +Z)
import bpy, bmesh, json, math, os
from mathutils import Matrix, Vector
RAW, OUT, TILE = "/workspace/l9/raw", "/workspace/l9/props", "/tmp/l9proof"
os.makedirs(OUT, exist_ok=True); os.makedirs(TILE, exist_ok=True)
# key: (axis, metres) uniform scale; yaw: degrees about Z bringing the front to -Y; fit: exact [x, y, z] non-uniform after (None = leave)
# stretch: (z0 frac, z1 frac, target height) lengthens a shaft; cut_above: drop everything over this height fraction; tris: budget
P = {
  "streetlight":    dict(key=("z", 6.0), stretch=(0.26, 0.70, 7.5), tris=6000),
  "mailbox":        dict(key=("y", 0.50), stretch=(0.04, 0.26, 1.15), tris=5000),
  "sedan_a":        dict(key=("y", 4.6), tris=14000),
  "sedan_b":        dict(key=("y", 4.8), tris=14000),
  "trash_bin":      dict(key=("z", 1.05)),
  "hydrant":        dict(key=("z", 0.75)),
  "fence":          dict(key=("x", 2.4), fit=[None, None, 1.0]),
  "street_tree":    dict(key=("z", 7.0)),
  "kitchen_counter": dict(key=("x", 2.0), cut_above=0.56, fit=[None, 0.62, 0.9]),
  "stove":          dict(key=("x", 0.76)),
  "dresser":        dict(key=("x", 1.4), fit=[None, None, 0.85]),
  "nightstand":     dict(key=("z", 0.62)),
  "toilet":         dict(key=("z", 0.78), yaw=-90, tris=6000),
  "bathtub":        dict(key=("x", 1.5)),
  "kitchen_table_small": dict(key=("z", 0.75)),
  "washing_machine": dict(key=("x", 0.69)),
  "front_door":     dict(key=("z", 2.03), door=True, tris=5000),
}
OVR = "/workspace/l9/overrides.json"   # per-name tweaks found at the proof (yaw, crop ...)
if os.path.exists(OVR):
    for k, v in json.load(open(OVR)).items(): P[k].update(v)
only = [s for s in os.environ.get("L9_ONLY", "").split(",") if s] or list(P)
SIZES = os.path.join(OUT, "sizes.json")
sizes = json.load(open(SIZES)) if os.path.exists(SIZES) else {}
AX = {"x": 0, "y": 1, "z": 2}

def bounds(o):
    xs = [v.co for v in o.data.vertices]
    lo = Vector((min(c.x for c in xs), min(c.y for c in xs), min(c.z for c in xs)))
    hi = Vector((max(c.x for c in xs), max(c.y for c in xs), max(c.z for c in xs)))
    return lo, hi

def xform(o, M): o.data.transform(M); o.data.update()

def build(name, C):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{RAW}/{name}.glb")
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for e in [e for e in bpy.context.scene.objects if e != o]: bpy.data.objects.remove(e)
    o.name = o.data.name = name
    if C.get("yaw"): xform(o, Matrix.Rotation(math.radians(C["yaw"]), 4, "Z"))
    lo, hi = bounds(o); raw = hi - lo
    if C.get("cut_above"):
        bm = bmesh.new(); bm.from_mesh(o.data); zc = lo.z + raw.z * C["cut_above"]
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > zc], context="VERTS"); bm.to_mesh(o.data); bm.free()
    if C.get("crop"):   # [x0, x1, z1] fractions of the raw box: keep the slab inside, cap the cuts (a door out of its frame)
        x0, x1, z1 = C["crop"]; bm = bmesh.new(); bm.from_mesh(o.data)
        for co, no in ((Vector((lo.x + raw.x * x0, 0, 0)), Vector((-1, 0, 0))), (Vector((lo.x + raw.x * x1, 0, 0)), Vector((1, 0, 0))), (Vector((0, 0, lo.z + raw.z * z1)), Vector((0, 0, 1)))):
            r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
            bmesh.ops.holes_fill(bm, edges=[e for e in r["geom_cut"] if isinstance(e, bmesh.types.BMEdge)], sides=0)
        bm.to_mesh(o.data); bm.free()
    lo, hi = bounds(o); a, m = C["key"]; s = m / (hi - lo)[AX[a]]
    xform(o, Matrix.Scale(s, 4))
    if C.get("fit"):
        lo, hi = bounds(o); d = hi - lo
        xform(o, Matrix.Diagonal([(float(f[1:]) if isinstance(f, str) else f / d[i]) if f else 1 for i, f in enumerate(C["fit"])] + [1]))   # "*0.64" = a plain factor
    if C.get("stretch"):
        lo, hi = bounds(o); H = hi.z - lo.z; f0, f1, T = C["stretch"]; z0, z1, add = lo.z + f0 * H, lo.z + f1 * H, T - H
        for v in o.data.vertices:
            if v.co.z >= z1: v.co.z += add
            elif v.co.z > z0: v.co.z += add * (v.co.z - z0) / (z1 - z0)
    lo, hi = bounds(o)
    if C.get("door"):   # knob side to +X, origin at the bottom of the hinge edge (x = 0)
        yy = sorted(abs(v.co.y - (lo.y + hi.y) / 2) for v in o.data.vertices); far = yy[int(len(yy) * 0.995)]
        kx = [v.co.x for v in o.data.vertices if abs(v.co.y - (lo.y + hi.y) / 2) >= far]
        if sum(kx) / len(kx) < (lo.x + hi.x) / 2: xform(o, Matrix.Scale(-1, 4, (1, 0, 0))); o.data.flip_normals()
        lo, hi = bounds(o); xform(o, Matrix.Translation((-lo.x, -(lo.y + hi.y) / 2, -lo.z)))
    else: xform(o, Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004); bm.to_mesh(o.data); bm.free()
    o.data.calc_loop_triangles(); n = len(o.data.loop_triangles); budget = C.get("tris", 8000)
    if n > budget:
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = budget / n; d.delimit = {"UV"}
        bpy.ops.object.modifier_apply(modifier="dec")
    bm = bmesh.new(); bm.from_mesh(o.data)
    for f in bm.faces: f.smooth = True
    for e in bm.edges: e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(42))
    bm.to_mesh(o.data); bm.free()
    for i, sl in enumerate(o.material_slots):
        if sl.material: sl.material.name = name if i == 0 else f"{name}_{i}"
    for img in bpy.data.images:
        if img.size[0] > 1024: img.scale(1024, 1024); img.pack()
    o.data.calc_loop_triangles(); lo, hi = bounds(o); d = hi - lo
    row = {"size": [round(d.x, 2), round(d.z, 2), round(d.y, 2)], "tris": len(o.data.loop_triangles)}
    if name == "streetlight":   # the lens: underside of the head, at the -Y (front) end of the arm
        head = [v.co for v in o.data.vertices if v.co.y < lo.y + 0.9 and v.co.z > hi.z - 1.6]
        row["lamp"] = [0, round(min(c.z for c in head) + 0.04, 2), round(-(lo.y + 0.45), 2)]
    sizes[name] = row; print("L9", name, row, flush=True)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
    proof(name, o, lo, hi)

def proof(name, o, lo, hi):
    sc = bpy.context.scene
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25, location=(hi.x + 0.55, 0, 0.85)); cap = bpy.context.object; cap.scale.z = 3.4   # the 1.7 m player
    g = bpy.data.materials.new("grey"); g.diffuse_color = (0.35, 0.35, 0.35, 1); cap.data.materials.append(g)
    bpy.ops.mesh.primitive_plane_add(size=60); fl = bpy.context.object; f = bpy.data.materials.new("fl"); f.diffuse_color = (0.55, 0.55, 0.55, 1); fl.data.materials.append(f)
    bpy.ops.mesh.primitive_cone_add(radius1=0.12, depth=0.35, location=(0, lo.y - 0.45, 0.02), rotation=(math.radians(90), 0, 0)); ar = bpy.context.object   # points at -Y: the front
    r = bpy.data.materials.new("red"); r.diffuse_color = (0.9, 0.1, 0.1, 1); ar.data.materials.append(r)
    c = Vector(((lo.x + hi.x + 0.8) / 2, (lo.y + hi.y) / 2, max(hi.z, 1.7) / 2)); ext = max(hi.x - lo.x + 1.4, hi.y - lo.y + 0.8, max(hi.z, 1.7))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); cam.data.type = "ORTHO"; cam.data.ortho_scale = ext * 1.3
    cam.location = c + Vector((0.75, -1, 0.5)) * 30; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.clip_end = 200; sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(55), 0, math.radians(25))
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.82, 0.9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 500
    sc.render.filepath = f"{TILE}/{name}.png"; bpy.ops.render.render(write_still=True)

for n in only: build(n, P[n])
json.dump(sizes, open(SIZES, "w"), indent=1)
