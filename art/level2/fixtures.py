# Level 2 fixtures: the smooth meshes that replace the sim's primitive lamps, puddles and stair boxes.
# Built in ENGINE coords (x, y up, z; -Z = front) mapped to Blender (x, -z, y), so the glTF reads in engine axes.
# Slots named for the surface: steel, tube (emissive, tinted per lamp in the spec), glass, cage, enamel, sludge, concrete, nosing.
import bpy, bmesh, math, os, random
from mathutils import Vector, noise
OUT = "/workspace/l2fix"; os.makedirs(OUT, exist_ok=True); random.seed(22)
def E(x, y, z): return Vector((x, -z, y))
def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
def mat(name, col, rough, metal=0.0, emit=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 4
    return m
M = {"steel": mat("steel", (0.32, 0.31, 0.29), 0.55, 0.8), "tube": mat("tube", (0.95, 0.95, 0.92), 0.3, 0, (1, 0.98, 0.9)),
     "glass": mat("glass", (0.95, 0.9, 0.75), 0.2, 0, (1, 0.85, 0.55)), "cage": mat("cage", (0.12, 0.12, 0.11), 0.6, 0.7),
     "enamel": mat("enamel", (0.30, 0.36, 0.30), 0.45, 0.2), "sludge": mat("sludge", (0.02, 0.02, 0.025), 0.06, 0.3),
     "concrete": mat("concrete", (0.42, 0.40, 0.37), 0.9), "nosing": mat("nosing", (0.78, 0.58, 0.08), 0.55, 0.3)}
def put(o, m, smooth=True):
    o.data.materials.clear(); o.data.materials.append(M[m])
    for p in o.data.polygons: p.use_smooth = smooth
    return o
def cyl(r, depth, at, rot=(0, 0, 0), m="steel", v=24, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=depth, location=at, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=depth, location=at, rotation=rot)
    return put(bpy.context.object, m)
def box(sx, sy, sz, at, m, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    if bevel: md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2; md.limit_method = "ANGLE"
    return put(o, m, smooth=False)
def torus(R, r, at, rot=(0, 0, 0), m="cage"):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=24, minor_segments=8, location=at, rotation=rot)
    return put(bpy.context.object, m)
def sphere(r, at, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r, location=at); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(scale=True); return put(o, m)
def export(name):
    for o in bpy.data.objects:
        for md in list(o.modifiers):
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True)
    dg = bpy.context.evaluated_depsgraph_get()
    print("TRIS", name, sum(len(o.evaluated_get(dg).data.loop_triangles) for o in bpy.data.objects if o.type == "MESH"))
X90 = (math.pi / 2, 0, 0)  # a Blender cylinder (along Z = engine up) turned to lie along Blender Y = engine Z

# 1. twin-tube industrial batten: 1.25 m, steel reflector channel, two T8 tubes, bi-pin end caps, two hanger rods. Origin = top centre.
reset()
box(0.22, 1.25, 0.012, E(0, -0.006, 0), "steel")                          # back plate
for s in (-1, 1):
    o = box(0.012, 1.25, 0.05, E(s * 0.104, -0.03, 0), "steel"); o.rotation_euler = (0, s * 0.35, 0)  # flared reflector lips
    cyl(0.013, 1.17, E(s * 0.05, -0.045, 0), X90, "tube", 16)              # the tubes
    for e in (-1, 1): box(0.035, 0.03, 0.035, E(s * 0.05, -0.04, e * 0.595), "steel", 0.006)  # lampholders
for e in (-1, 1): box(0.22, 0.012, 0.05, E(0, -0.03, e * 0.62), "steel")  # end plates
for e in (-1, 1): cyl(0.004, 0.25, E(0, 0.12, e * 0.45), (0, 0, 0), "steel", 8)  # hanger rods into the slab
export("l2-tube")

# 2. caged bulkhead lamp: cast base, frosted globe (emissive), wire guard. Hangs from its top; origin = top centre, 0.2 m tall.
reset()
cyl(0.075, 0.03, E(0, -0.015, 0), (0, 0, 0), "steel", 24)
cyl(0.06, 0.03, E(0, -0.045, 0), (0, 0, 0), "steel", 24, 0.05)
sphere(0.055, E(0, -0.11, 0), "glass", (1, 1, 1.25))
for i in range(3): torus(0.066 - i * 0.012, 0.004, E(0, -0.075 - i * 0.045, 0))
for k in range(6):
    a = k * math.pi / 3
    pts = [(0.066 * math.cos(a), -0.06, 0.066 * math.sin(a)), (0.0, -0.2, 0.0)]
    p0, p1 = E(*pts[0]), E(*pts[1]); mid = (p0 + p1) / 2; d = p1 - p0
    o = cyl(0.0035, d.length, mid, (0, 0, 0), "cage", 6); o.rotation_mode = "QUATERNION"; o.rotation_quaternion = d.to_track_quat("Z", "Y")
export("l2-cage")

# 3. enamel high-bay pendant for the Boiler Hall: conduit drop, gear box, deep reflector, lamp. Origin = top of the drop, 1.0 m tall.
reset()
cyl(0.012, 0.5, E(0, -0.25, 0), (0, 0, 0), "steel", 12)
cyl(0.09, 0.16, E(0, -0.58, 0), (0, 0, 0), "steel", 24)
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.36, radius2=0.1, depth=0.28, end_fill_type="NOTHING", location=E(0, -0.8, 0)); o = put(bpy.context.object, "enamel")
o.modifiers.new("s", "SOLIDIFY").thickness = 0.008
torus(0.36, 0.008, E(0, -0.94, 0), (0, 0, 0), "enamel")
sphere(0.09, E(0, -0.82, 0), "glass", (1, 1, 1.3))
export("l2-pendant")

# 4. sludge pool: an irregular, slightly domed black slick with a soft lip. Origin = centre at floor, ~2.3 m across, 1.5 cm thick.
reset()
bm = bmesh.new(); n = 64; ring = []
c = bm.verts.new(E(0, 0.018, 0))
for rr, h in ((0.55, 0.016), (0.85, 0.012), (1.0, 0.002)):
    row = []
    for i in range(n):
        a = i / n * math.tau; R = 1.15 * (1 + 0.18 * noise.noise(Vector((math.cos(a) * 1.6, math.sin(a) * 1.6, 0.3))) + 0.07 * math.sin(a * 5 + 1))
        row.append(bm.verts.new(E(math.cos(a) * R * rr, h, math.sin(a) * R * rr)))
    ring.append(row)
for i in range(n): bm.faces.new((c, ring[0][(i + 1) % n], ring[0][i]))
for k in range(2):
    for i in range(n): bm.faces.new((ring[k][i], ring[k][(i + 1) % n], ring[k + 1][(i + 1) % n], ring[k + 1][i]))
me = bpy.data.meshes.new("pool"); bm.normal_update(); bm.to_mesh(me); o = bpy.data.objects.new("pool", me); bpy.context.collection.objects.link(o); put(o, "sludge")
export("l2-sludge")

# 5. the stairwell flight: 13 cast steps (0.25 rise, 0.3 going, 1.7 wide) on a sloped soffit, chamfered noses with yellow anti-slip strips, steel stringer
#    angles each side. Origin = feet of step 0's centre; climbs toward -Z. Matches the 13 collider boxes it dresses.
reset()
W, R, G = 1.7, 0.25, 0.3
bm = bmesh.new(); prof = []   # side profile in (z, y): treads and risers then the soffit back down
z0 = 0.15
for i in range(13):
    zf = z0 - i * G
    prof += [(zf, i * R), (zf, (i + 1) * R - 0.02), (zf - 0.02, (i + 1) * R)]
prof += [(z0 - 13 * G, 13 * R), (z0 - 13 * G, 13 * R - 0.35), (z0 - 0.35, 0.0)]
def face_side(x):
    return [bm.verts.new(E(x, y, z)) for (z, y) in prof]
Lv, Rv = face_side(-W / 2), face_side(W / 2)
bm.faces.new(list(reversed(Lv))); bm.faces.new(Rv)
m_ = len(prof)
for i in range(m_):
    j = (i + 1) % m_; bm.faces.new((Lv[i], Lv[j], Rv[j], Rv[i]))
me = bpy.data.meshes.new("flight"); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
o = bpy.data.objects.new("flight", me); bpy.context.collection.objects.link(o); put(o, "concrete", smooth=False)
for i in range(13):
    zf = z0 - i * G
    box(W - 0.1, 0.006, 0.05, E(0, (i + 1) * R + 0.002, zf - 0.04), "nosing", 0.002)
import math as _m
ang = _m.atan2(13 * R, 13 * G); Ls = _m.hypot(13 * R, 13 * G)
for s in (-1, 1):
    o = box(0.012, 0.22, Ls, E(s * (W / 2 + 0.006), 13 * R / 2 - 0.05, z0 - 13 * G / 2), "steel", 0.003)
    o.rotation_euler = (-ang, 0, 0)
export("l2-stair")
