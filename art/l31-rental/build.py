# Level 31 skate rental: quad skate pairs (one per heel size), carpeted lacing bench, foot-measuring device.
# blender -b --factory-startup --python-exit-code 1 --python art/l31-rental/build.py
import bpy, bmesh, math
from mathutils import Vector
OUT = "/workspace/l31r/"
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
def mat(name, rgb, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
M = {k: mat(k, *v) for k, v in {
    "suede": ((0.62, 0.42, 0.24), 0.95), "trim": ((0.23, 0.12, 0.06), 0.8), "sole": ((0.06, 0.045, 0.04), 0.7),
    "metal": ((0.62, 0.63, 0.65), 0.35, 1.0), "wheel": ((0.95, 0.33, 0.03), 0.45), "lace": ((0.93, 0.91, 0.85), 0.9),
    "label": ((0.95, 0.94, 0.9), 0.6), "ink": ((0.03, 0.03, 0.03), 0.6), "lining": ((0.05, 0.04, 0.04), 1.0),
    "carpet": ((0.16, 0.2, 0.42), 1.0), "kick": ((0.03, 0.03, 0.035), 0.6), "blackmetal": ((0.035, 0.035, 0.04), 0.4, 0.6), "scale": ((0.85, 0.85, 0.8), 0.5)}.items()}
def fin(o, m, smooth=False):
    o.data.materials.clear(); o.data.materials.append(M[m])
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o
def box(m, size, loc, rot=(0, 0, 0), bevel=0, smooth=False, seg=1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = seg; bpy.ops.object.modifier_apply(modifier="b"); smooth = True
    return fin(o, m, smooth)
def cyl(m, r, depth, loc, rot=(0, 0, 0), seg=12, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth, location=loc, rotation=rot)
    o = fin(bpy.context.object, m, True)
    md = o.modifiers.new("e", "EDGE_SPLIT"); md.split_angle = math.radians(50); bpy.ops.object.modifier_apply(modifier="e")
    return o
def join(name, objs):
    me = bpy.data.meshes.new(name); root = bpy.data.objects.new(name, me); S.collection.objects.link(root)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    root.select_set(True); bpy.context.view_layer.objects.active = root; bpy.ops.object.join()
    return root
# rings: z above the sole, centre y (heel is +Y), half length, half width
RINGS = [(0, 0, .140, .046), (.03, 0, .142, .049), (.058, .012, .129, .047), (.083, .05, .089, .043), (.108, .075, .063, .041), (.155, .082, .056, .040), (.20, .086, .056, .043)]
def boot(z0):
    bm = bmesh.new(); N = 20; loops = []
    def ring(z, cy, a, b):
        vs = []
        for i in range(N):
            t = 2 * math.pi * i / N; c, s = math.cos(t), math.sin(t); e = 2 / 2.5
            vs.append(bm.verts.new((b * math.copysign(abs(c) ** e, c), cy + a * math.copysign(abs(s) ** e, s), z0 + z)))
        return vs
    for r in RINGS: loops.append(ring(*r))
    for a, b in zip(loops, loops[1:]):
        for i in range(N): bm.faces.new((a[i], a[(i + 1) % N], b[(i + 1) % N], b[i]))
    bm.faces.new(loops[0][::-1])
    z, cy, a, b = RINGS[-1]; inner = ring(z - .002, cy, a * .8, b * .78); deep = ring(z - .05, cy, a * .75, b * .7)
    for i in range(N): bm.faces.new((loops[-1][i], loops[-1][(i + 1) % N], inner[(i + 1) % N], inner[i]))
    wall = [bm.faces.new((inner[i], inner[(i + 1) % N], deep[(i + 1) % N], deep[i])) for i in range(N)]; cap = bm.faces.new(deep)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("boot"); me.materials.append(M["suede"]); me.materials.append(M["lining"]); me.materials.append(M["trim"])
    for f in wall + [cap]: f.material_index = 1
    for f in bm.faces:
        f.smooth = True
        c = f.calc_center_median()
        if f.material_index == 0 and c.y > .095 and c.z < z0 + .07: f.material_index = 2      # heel counter
        if f.material_index == 0 and c.z > z0 + .18: f.material_index = 2                      # collar band
        if f.material_index == 0 and c.y < -.10 and c.z < z0 + .05: f.material_index = 2       # toe cap
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new("boot", me); S.collection.objects.link(o); return o
def digits(txt, loc):
    bpy.ops.object.text_add(location=loc, rotation=(math.radians(90), 0, math.radians(180))); t = bpy.context.object
    t.data.body = txt; t.data.size = .04; t.data.align_x = "CENTER"; t.data.align_y = "CENTER"; t.data.extrude = .0008; t.data.resolution_u = 2
    bpy.ops.object.convert(target="MESH"); return fin(bpy.context.object, "ink")
def skate(size, x, yaw):
    P = []; z0 = .066; H = math.pi / 2
    P.append(boot(z0))
    P.append(box("sole", (.094, .275, .012), (0, 0, z0 - .006), bevel=.004))
    P.append(box("sole", (.07, .075, .016), (0, .098, z0 - .018), bevel=.004))                # heel block
    P.append(box("metal", (.05, .225, .01), (0, .005, .049)))
    for y in (-.078, .082):
        P.append(cyl("metal", .0045, .12, (0, y, .029), (0, H, 0), 8))
        P.append(box("metal", (.03, .034, .022), (0, y, .037)))
        for sx in (-1, 1):
            P.append(cyl("wheel", .029, .031, (sx * .052, y, .029), (0, H, 0), 14))
            P.append(cyl("metal", .011, .033, (sx * .052, y, .029), (0, H, 0), 6))
    P.append(cyl("wheel", .019, .026, (0, -.128, .026), (math.radians(-28), 0, 0), 12, .015))   # toe stop
    for i in range(7):                                                                         # laces up the front
        t = i / 6; z = z0 + .07 + t * .12
        yf = None
        for (za, ca, aa, _), (zb, cb, ab, _) in zip(RINGS, RINGS[1:]):
            if za <= z - z0 <= zb: k = (z - z0 - za) / (zb - za); yf = (ca - aa) + k * ((cb - ab) - (ca - aa))
        P.append(box("lace", (.042, .005, .005), (0, yf - .001, z), (0, math.radians(12 if i % 2 else -12), 0)))
    P.append(box("label", (.05, .003, .048), (0, .1375, z0 + .118), bevel=.001))
    P.append(digits(str(size), (0, .1396, z0 + .118)))
    o = join("sk", P); o.rotation_euler = (0, 0, yaw); o.location = (x, 0, 0)
    return o
def pair(size):
    o = join(f"pair{size}", [skate(size, -.058, math.radians(-3)), skate(size, .058, math.radians(4))])
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); return o
def bench():
    P = [box("carpet", (1.8, .46, .37), (0, 0, .285), bevel=.035, seg=3), box("kick", (1.68, .36, .1), (0, 0, .05))]
    o = join("bench", P)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.cube_project(cube_size=0.5); bpy.ops.object.mode_set(mode="OBJECT")
    return o
def device():
    H = math.pi / 2
    P = [box("blackmetal", (.17, .40, .012), (0, 0, .006), bevel=.004)]
    P.append(box("scale", (.022, .30, .002), (-.068, -.02, .013))); P.append(box("scale", (.022, .30, .002), (.068, -.02, .013)))
    for i in range(14): P.append(box("ink", (.022, .002, .0005), (-.068, -.16 + i * .021, .0143))); P.append(box("ink", (.012, .002, .0005), (.068, -.16 + i * .021, .0143)))
    # heel cup: a low curved wall round the back
    for i in range(9):
        a = math.radians(-80 + i * 20); P.append(box("metal", (.024, .005, .04), (.05 * math.sin(a), .135 + .045 * math.cos(a), .032), (0, 0, -a), bevel=.0015))
    P.append(box("metal", (.15, .028, .01), (0, -.06, .019), bevel=.003))             # width bar
    P.append(box("metal", (.012, .05, .034), (.074, -.06, .029), bevel=.003))         # its upright cheek
    P.append(box("metal", (.05, .03, .014), (-.068, -.13, .021), bevel=.004))         # length pointer
    P.append(cyl("blackmetal", .009, .012, (-.068, -.13, .034), (0, 0, 0), 10))
    return join("device", P)
def export(o, name):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", export_apply=True, use_selection=True)
    print("TRIS", name, sum(len(p.vertices) - 2 for p in o.data.polygons), [round(v, 3) for v in o.dimensions])
pairs = {}
for n in (5, 6, 7, 8, 9, 10, 11, 12):
    pairs[n] = pair(n); export(pairs[n], f"skates-{n}"); pairs[n].location.x = 50 + n
b = bench(); export(b, "bench"); d = device(); export(d, "device")
# proof
pairs[9].location = (0, 0, 0); b.location = (1.5, 0, 0); d.location = (-.5, 0, 0)
S.render.engine = "CYCLES"; S.cycles.samples = 16; S.render.resolution_x = S.render.resolution_y = 656
w = bpy.data.worlds.new("w"); S.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.5, .5, .52, 1)
bpy.ops.mesh.primitive_plane_add(size=20); fin(bpy.context.object, "kick")
def shot(name, pos, tgt):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); S.collection.objects.link(cam); cam.data.lens = 50; cam.data.clip_start = .01
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    l = bpy.data.objects.new(name + "l", bpy.data.lights.new(name + "l", "POINT")); l.data.energy = 30 * max(1, (Vector(tgt) - Vector(pos)).length ** 2); l.location = Vector(pos) + Vector((0, 0, .3)); S.collection.objects.link(l)
    S.camera = cam; S.render.filepath = f"/tmp/l31r/{name}.png"; bpy.ops.render.render(write_still=True); l.hide_render = True
shot("a", (.33, .5, .3), (0, 0, .12)); shot("b", (-.4, -.5, .35), (0, 0, .1)); shot("c", (.5, -2.2, 1.2), (.6, 0, .2))
