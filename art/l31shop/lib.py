# Level 31 gift shop props: shared helpers. Units m, Z up, front = -Y (placed with forward "+z"). Origin = floor centre.
import bpy, bmesh, math, os, random
from mathutils import Vector
OUT = "/workspace/l31shop"; PROOF = "/tmp/l31shop"
os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf"
_m = {}
def start(seed=1):
    bpy.ops.wm.read_factory_settings(use_empty=True); _m.clear(); random.seed(seed)
def hx(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)
def mat(name, col, rough=0.5, metal=0.0, alpha=1.0, emit=0.0):
    if name in _m: return _m[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; rgb = hx(col)
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = "BLENDED"
        except Exception: m.blend_method = "BLEND"
    if emit: b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    _m[name] = m; return m
def _obj(bm, m, loc, rot, scale=(1, 1, 1)):
    me = bpy.data.meshes.new("p"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("p", me); bpy.context.scene.collection.objects.link(o); me.materials.append(m)
    o.location = loc; o.rotation_euler = rot; o.scale = scale; return o
def box(size, loc, m, bevel=0.006, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(bevel, min(size) * 0.4), segments=2, affect="EDGES", profile=0.5)
    return _obj(bm, m, loc, rot)
def cyl(r, h, loc, m, rot=(0, 0, 0), r2=None, seg=24):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    return _obj(bm, m, loc, rot)
def sph(r, loc, m, scale=(1, 1, 1), seg=20):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=r)
    return _obj(bm, m, loc, (0, 0, 0), scale)
def torus(R, r, loc, m, rot=(0, 0, 0), seg=28):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=8, location=loc, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); return o
def tube(pts, r, m, cyclic=False):
    cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for p, q in zip(sp.bezier_points, pts): p.co = q; p.handle_left_type = p.handle_right_type = "AUTO"
    sp.use_cyclic_u = cyclic; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.use_fill_caps = True; cu.resolution_u = 8
    o = bpy.data.objects.new("c", cu); bpy.context.scene.collection.objects.link(o); cu.materials.append(m); return o
def text(txt, size, loc, m, font=SANS, tube_r=0, extrude=0.002, rot=(math.pi / 2, 0, 0)):
    cu = bpy.data.curves.new("t", "FONT"); cu.body = txt; cu.font = bpy.data.fonts.load(font, check_existing=True); cu.size = size
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    if tube_r: cu.fill_mode = "NONE"; cu.bevel_depth = tube_r; cu.bevel_resolution = 2; cu.resolution_u = 6
    else: cu.extrude = extrude
    o = bpy.data.objects.new("t", cu); bpy.context.scene.collection.objects.link(o); cu.materials.append(m)
    o.location = loc; o.rotation_euler = rot; return o
def finish(name, views=((-0.75, -1.6, 0.55),)):
    sc = bpy.context.scene; bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = sc.objects[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = [o for o in sc.objects if o.type == "MESH"][0]
    bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    try: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))
    except Exception: bpy.ops.object.shade_smooth()
    o.data.calc_loop_triangles(); bb = [Vector(c) for c in o.bound_box]
    lo = Vector([min(c[i] for c in bb) for i in range(3)]); hi = Vector([max(c[i] for c in bb) for i in range(3)])
    print(f"MODEL {name} tris {len(o.data.loop_triangles)} min {tuple(round(v,3) for v in lo)} max {tuple(round(v,3) for v in hi)}")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True)
    sc.render.engine = "CYCLES"; sc.cycles.samples = 10; sc.render.resolution_x = sc.render.resolution_y = 560
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1); sc.world = w
    ctr = (lo + hi) / 2; d = max((hi - lo).length, 0.3)
    for i, v in enumerate(views):
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
        cam.location = ctr + Vector(v).normalized() * d * 1.25; cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
        sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3; sc.collection.objects.link(sun); sun.rotation_euler = cam.rotation_euler
        sc.render.filepath = f"{PROOF}/{name}_{i}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam); bpy.data.objects.remove(sun)
R = random
BRIGHT = ["#ff3fa4", "#3fd0ff", "#ffd23a", "#7dff5a", "#ff7a1e", "#b06aff", "#ff3b2e", "#ffffff"]
