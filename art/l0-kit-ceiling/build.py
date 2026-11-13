# Level 0 ceiling kit: raw Tripo glb -> oriented, true-size, origin set, cleaned, exported. One run per piece:
# blender -b --factory-startup --python-exit-code 1 --python art/l0-kit-ceiling/build.py -- <kind> [src.glb]
import bpy, bmesh, sys, math, os
from mathutils import Vector, Euler, Matrix
W = "/workspace/l0ceil"
# rot: euler degrees (Blender Z-up) taking the raw mesh to: face/underside toward -Z (ceiling) or lying on +Z (floor)
# size: target [x, y, z] in Blender axes (x width, y depth, z height); None on an axis = keep uniform from x
# cut: keep only the lowest <cut> metres after scaling to width (drops the plenum box above the ceiling plane)
KIT = {
  "diffuser":     dict(rot=(0, 90, 0),  size=(0.6, 0.6, None), cut=0.08, origin="ceiling"),
  "returngrille": dict(src="returngrille3", rot=(90, 0, 0), size=(0.6, 0.6, None), cut=0.03, back=True, junk=0, origin="ceiling"),
  "sprinkler":    dict(rot=(0, 0, 0),   size=(0.08, 0.08, 0.07), junk=0.002, origin="ceiling"),
  "smokedet":     dict(src="smokedet2", rot=(0, 90, 0),  size=(0.14, 0.14, 0.05), origin="ceiling"),
  "troffer-hang": dict(src="troffer-hang3", rot=(180, 90, 0),  size=(0.6, 1.2, 0.12), hang=32, junk=0, origin="ceiling"),
  "tile-fallen":  dict(rot=(0, 0, 0),   size=(None, None, 0.05), fit=0.64, renormal=True, origin="floor"),
}
a = sys.argv[sys.argv.index("--") + 1:]
kind = a[0]
C = dict(KIT[kind])
for kv in a[1:]:
    k, v = kv.split("=", 1); C[k] = eval(v)
src = f"{W}/{C.get('src', kind)}.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, merge_vertices=True)
ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
def bounds():
    cs = [v.co for v in me.vertices]
    return Vector([min(c[i] for c in cs) for i in range(3)]), Vector([max(c[i] for c in cs) for i in range(3)])
def xf(M): me.transform(M); me.update()
xf(Euler([math.radians(d) for d in C["rot"]]).to_matrix().to_4x4())
# junk: loose islands under 1.5% of the verts
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
seen = set(); isl = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; grp = []; seen.add(v.index)
    while st:
        x = st.pop(); grp.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in seen: seen.add(y.index); st.append(y)
    isl.append(grp)
tot = len(bm.verts); junk = [v for g in isl if len(g) < tot * C.get("junk", 0.015) for v in g]
print("islands", sorted((len(g) for g in isl), reverse=True)[:12], "junk verts", len(junk))
bmesh.ops.delete(bm, geom=junk, context="VERTS")
if C.get("renormal"): bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.to_mesh(me); bm.free()
mn, mx = bounds(); d = mx - mn
sz = C["size"]
if "fit" in C: u = C["fit"] / max(d.x, d.y)       # the broken pieces' spread on the floor
else: u = sz[0] / d.x
s = [u, u, u]
for i in range(3):
    if sz[i] is not None and "fit" not in C: s[i] = sz[i] / d[i] if not C.get("cut") or i < 2 else u
if "fit" in C and sz[2]: s[2] = sz[2] / d.z
xf(Matrix.Diagonal((*s, 1)))
if C.get("cut"):
    mn, mx = bounds()
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, mn.z + C["cut"]), plane_no=(0, 0, 1), clear_outer=True)
    bm.to_mesh(me); bm.free()
    mn, mx = bounds(); d = mx - mn      # the flange alone now: refit it to the grid module
    xf(Matrix.Diagonal((sz[0] / d.x, sz[1] / d.y, 1, 1)))
if C.get("back"):    # an open lattice gets the dark plenum behind it
    mn, mx = bounds()
    pm = bpy.data.materials.new("plenum"); pm.use_nodes = True
    bs = pm.node_tree.nodes["Principled BSDF"]; bs.inputs["Base Color"].default_value = (0.012, 0.011, 0.01, 1); bs.inputs["Roughness"].default_value = 1
    me.materials.append(pm)
    bm = bmesh.new(); bm.from_mesh(me); h = sz[0] / 2 - 0.002
    for v in bm.verts: v.co.x = max(-sz[0] / 2, min(sz[0] / 2, v.co.x)); v.co.y = max(-sz[1] / 2, min(sz[1] / 2, v.co.y))
    bm.normal_update()   # the pale pocket floors go: every cell opens onto the plenum
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.8 and f.calc_center_median().z > mn.z + 0.008 and max(abs(f.calc_center_median().x), abs(f.calc_center_median().y)) < h - 0.03], context="FACES")
    f = bm.faces.new([bm.verts.new((x, y, mx.z - 0.0015)) for x, y in ((-h, -h), (-h, h), (h, h), (h, -h))]); f.material_index = len(me.materials) - 1
    bm.to_mesh(me); bm.free(); me.update()
mn, mx = bounds()
z0 = mx.z if C["origin"] == "ceiling" else mn.z
xf(Matrix.Translation((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -z0)))
if C.get("hang"):   # dropped out of the grid: pivot on one end's top edge, then two hanger wires and the flex whip up to the ceiling
    ang, gap = math.radians(C["hang"]), C.get("gap", 0.04)
    mn, mx = bounds(); P = Vector((0, mx.y, 0))
    T = Matrix.Translation(Vector((0, -mx.y, -gap))) @ Matrix.Translation(P) @ Matrix.Rotation(-ang, 4, "X") @ Matrix.Translation(-P)
    xf(T)
    wm = bpy.data.materials.new("wire"); wm.use_nodes = True
    bs = wm.node_tree.nodes["Principled BSDF"]; bs.inputs["Base Color"].default_value = (0.32, 0.31, 0.29, 1); bs.inputs["Metallic"].default_value = 0.8; bs.inputs["Roughness"].default_value = 0.55
    me.materials.append(wm); wi = len(me.materials) - 1
    bm = bmesh.new(); bm.from_mesh(me)
    def tube(pts, r, n=6):
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            u = t.cross(Vector((1, 0, 0))); u = (u if u.length > 1e-4 else t.cross(Vector((0, 1, 0)))).normalized(); w = t.cross(u)
            rings.append([bm.verts.new(p + (u * math.cos(k * 6.2832 / n) + w * math.sin(k * 6.2832 / n)) * r) for k in range(n)])
        for a_, b_ in zip(rings, rings[1:]):
            for k in range(n):
                f = bm.faces.new((a_[k], a_[(k + 1) % n], b_[(k + 1) % n], b_[k])); f.material_index = wi; f.smooth = True
    hw = sz[0] / 2 - 0.035
    for sx in (-1, 1):
        a0 = Vector((sx * hw, -0.03, -gap - 0.02)); tube([a0, a0 + Vector((sx * 0.004, 0.012, gap * 0.5)), Vector((sx * (hw + 0.01), 0.0, 0.0))], 0.0025)
    q = T @ Vector((0.12, mx.y - 0.42, -0.005)); e = Vector((0.2, -0.05, 0.0)); pts = []
    for i in range(13):
        t = i / 12; p = q.lerp(e, t); p.z -= 0.11 * math.sin(t * math.pi) * (1 - 0.5 * t); p.x += 0.03 * math.sin(t * 6.3); pts.append(p)
    tube(pts, 0.011, 8)
    bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
    mn, mx = bounds(); xf(Matrix.Translation((0, -(mn.y + mx.y) / 2, -mx.z)))
me.calc_loop_triangles(); tris = len(me.loop_triangles)
if tris > 11800:
    m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = 11500 / tris
    bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(C.get("smooth", 40)))
ob.name = kind; me.name = kind
for m in me.materials:
    if m.name not in ('wire', 'plenum'): m.name = kind
me.calc_loop_triangles(); mn, mx = bounds(); d = mx - mn
for im in bpy.data.images:
    if im.size[0] > 1024: im.scale(1024, 1024)
out = f"{W}/out/{kind}.glb"; os.makedirs(f"{W}/out", exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_apply=True)
print(f"RESULT {kind} size_xyz(blender) {d.x:.3f} {d.y:.3f} {d.z:.3f} engine[w,h,d] [{d.x:.3f},{d.z:.3f},{d.y:.3f}] tris {len(me.loop_triangles)} zmin {mn.z:.3f} zmax {mx.z:.3f}")
# proof: from below (ceiling) / above (floor), 3/4, and side
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
sc.render.resolution_x = sc.render.resolution_y = 656
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.5, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
ctr = Vector((0, 0, (mn.z + mx.z) / 2)); R = max(d) * 1.9; up = -1 if C["origin"] == "ceiling" else 1
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sc.collection.objects.link(sun)
for n, p in (("a", Vector((0.0, -0.02, up)) * R), ("b", Vector((0.7, -0.8, up * 0.6)).normalized() * R), ("c", Vector((0.2, -1, up * 0.12)).normalized() * R)):
    cam.location = ctr + p; q = (ctr - cam.location).to_track_quat("-Z", "Y"); cam.rotation_euler = q.to_euler(); sun.rotation_euler = q.to_euler()
    sc.render.filepath = f"/tmp/proof/{kind}_{n}.png"; bpy.ops.render.render(write_still=True)
