# Level 70 wild layer: authored meshes (open container, jetty, fence, banner, signs, papers, snow heap, ice hole). Blender Z up.
import bpy, bmesh, math, random
from mathutils import Vector, noise
from PIL import Image, ImageDraw, ImageFont
OUT = "/workspace/l70wild/out/"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
random.seed(70)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
def mat(name, col, rough=0.8, metal=0, img=None):
    if name in bpy.data.materials: return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if img:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(img); t.image.pack(); m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    return m
def fin(o, m, bevel=0.012, smooth=False, uv=True):
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        mo = o.modifiers.new("b", "BEVEL"); mo.width = bevel; mo.segments = 2; mo.limit_method = "ANGLE"; bpy.ops.object.modifier_apply(modifier="b")
    if uv:
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.cube_project(cube_size=1.0, scale_to_bounds=False); bpy.ops.object.mode_set(mode="OBJECT")
    o.data.materials.clear(); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    if not smooth:
        mo = o.modifiers.new("n", "WEIGHTED_NORMAL"); mo.keep_sharp = True; bpy.ops.object.modifier_apply(modifier="n")
    o.select_set(False); return o
def box(sz, loc, m, rot=(0, 0, 0), bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = sz; return fin(o, m, bevel)
def cyl(r, h, loc, m, rot=(0, 0, 0), v=14, r2=None, bevel=0.01):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2 if r2 is not None else r, depth=h, location=loc, rotation=rot); return fin(bpy.context.object, m, bevel, smooth=True)
def snow(sx, sy, h, loc, m, seed=0, flat=0.25):
    # a soft lumpy mound: half an icosphere, noise-pushed, base flared
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1, location=(0, 0, 0)); o = bpy.context.object
    for v in o.data.vertices:
        c = v.co; n = noise.fractal(Vector((c.x * 1.3 + seed, c.y * 1.3, c.z * 1.3)), 1.0, 2.0, 3)
        z = max(c.z, 0) ** (1 - flat); r = 1 + 0.22 * n
        c.x *= r * sx * (1 + 0.25 * (1 - z)); c.y *= r * sy * (1 + 0.25 * (1 - z)); c.z = (z * (1 + 0.3 * n)) * h if c.z > 0 else -0.05
    o.location = loc; return fin(o, m, 0, smooth=True)
def corr(L, H, m, origin, axis="x", flip=1):
    # corrugated sheet: trapezoid wave along its length, standing up H
    prof = []; x = 0
    while x < L - 1e-6:
        for dx, d in ((0, 0), (0.07, 0), (0.11, 0.036), (0.21, 0.036), (0.25, 0)):
            if x + dx <= L: prof.append((x + dx, d * flip))
        x += 0.28
    prof.append((L, 0)); bm = bmesh.new(); prev = None
    for (u, d) in prof:
        p = (u, d, 0) if axis == "x" else (d, u, 0)
        a = bm.verts.new(Vector(origin) + Vector(p)); b = bm.verts.new(Vector(origin) + Vector(p) + Vector((0, 0, H)))
        if prev: bm.faces.new((prev[0], a, b, prev[1]))
        prev = (a, b)
    me = bpy.data.meshes.new("corr"); bm.to_mesh(me); o = bpy.data.objects.new("corr", me); bpy.context.collection.objects.link(o); return fin(o, m, 0)
def export(name):
    for o in bpy.context.scene.objects: o.select_set(o.type == "MESH")
    bpy.context.view_layer.objects.active = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
    bpy.ops.object.join(); bpy.context.object.name = name
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", export_apply=True)
    print("TRIS", name, sum(len(p.vertices) - 2 for p in bpy.context.object.data.polygons), [round(x, 2) for x in bpy.context.object.dimensions])
def proof(name, cam, tgt):
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 12; s.render.resolution_x = s.render.resolution_y = 640
    c = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(c); c.location = cam
    c.rotation_euler = (Vector(tgt) - Vector(cam)).to_track_quat("-Z", "Y").to_euler(); s.camera = c
    l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); l.data.energy = 3; s.collection.objects.link(l); l.rotation_euler = c.rotation_euler
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.55, 0.65, 1)
    s.render.filepath = "/tmp/l70/" + name + ".png"; bpy.ops.render.render(write_still=True)
def tex_banner():
    im = Image.new("RGB", (1024, 512), (150, 96, 30)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1024, 70), fill=(40, 38, 36)); d.rectangle((0, 442, 1024, 512), fill=(40, 38, 36))
    d.text((512, 220), "B.N.T.G.", font=ImageFont.truetype(F, 190), fill=(232, 226, 210), anchor="mm")
    d.text((512, 372), "FROSTON EXTRACTION SITE 4  ·  AUTHORIZED PERSONNEL", font=ImageFont.truetype(F, 30), fill=(232, 226, 210), anchor="mm")
    for i in range(2600):
        x, y = random.randrange(1024), random.randrange(512); g = random.randrange(40, 235); d.ellipse((x, y, x + random.randrange(2, 9), y + random.randrange(1, 5)), fill=(g, g, g + 8) if random.random() < 0.5 else (90, 60, 30))
    for i in range(14): x = random.randrange(1024); d.line((x, 0, x + random.randrange(-30, 30), 512), fill=(120, 80, 30), width=2)
    im.save("/tmp/l70/banner.png"); return "/tmp/l70/banner.png"
def tex_sign(kind):
    im = Image.new("RGB", (512, 512), (200, 200, 200)); d = ImageDraw.Draw(im)
    if kind == "moose":
        d.rectangle((0, 0, 512, 512), fill=(222, 178, 20)); d.polygon([(256, 14), (498, 256), (256, 498), (14, 256)], outline=(20, 20, 20), width=12)
        d.ellipse((170, 220, 330, 300), fill=(20, 20, 20)); d.rectangle((185, 280, 203, 380), fill=(20, 20, 20)); d.rectangle((225, 280, 240, 375), fill=(20, 20, 20)); d.rectangle((285, 280, 300, 380), fill=(20, 20, 20)); d.rectangle((312, 270, 328, 372), fill=(20, 20, 20))
        d.polygon([(310, 230), (350, 170), (385, 175), (392, 215), (360, 222), (335, 262)], fill=(20, 20, 20))
        d.line((352, 172, 330, 130, 300, 122), fill=(20, 20, 20), width=11); d.line((330, 130, 345, 100), fill=(20, 20, 20), width=9); d.line((362, 172, 392, 132, 420, 130), fill=(20, 20, 20), width=11); d.line((392, 132, 388, 104), fill=(20, 20, 20), width=9)
    else:
        d.rectangle((0, 0, 512, 512), fill=(236, 236, 230)); d.rounded_rectangle((16, 16, 496, 496), 30, outline=(20, 20, 20), width=10)
        d.text((256, 96), "MAXIMUM", font=ImageFont.truetype(F, 78), fill=(20, 20, 20), anchor="mm"); d.text((256, 290), "50", font=ImageFont.truetype(F, 250), fill=(20, 20, 20), anchor="mm"); d.text((256, 452), "km/h", font=ImageFont.truetype(F, 56), fill=(20, 20, 20), anchor="mm")
    for i in range(900):
        x, y = random.randrange(512), random.randrange(512); d.ellipse((x, y, x + random.randrange(2, 12), y + random.randrange(2, 8)), fill=random.choice([(240, 244, 250), (120, 70, 30), (150, 150, 150)]))
    p = f"/tmp/l70/sign-{kind}.png"; im.save(p); return p
def tex_paper():
    im = Image.new("RGB", (256, 256), (226, 222, 208)); d = ImageDraw.Draw(im)
    d.text((16, 14), "B.N.T.G.", font=ImageFont.truetype(F, 22), fill=(40, 40, 60))
    for y in range(56, 236, 12): d.line((16, y, random.randrange(120, 240), y), fill=(70, 70, 80), width=2)
    d.ellipse((150, 150, 230, 230), outline=(140, 90, 60), width=5); im.save("/tmp/l70/paper.png"); return "/tmp/l70/paper.png"

# ---------- open shipping container: 6.06 x 2.44 x 2.59, long on X, open at +X ----------
reset(); steel = mat("steel", (0.18, 0.28, 0.38), 0.6, 0); wood = mat("wood", (0.35, 0.25, 0.16), 0.8); sn = mat("snow", (0.9, 0.93, 0.97), 0.9); rust = mat("frame", (0.25, 0.2, 0.17), 0.55, 0)
L, W, H = 6.06, 2.44, 2.59
corr(L - 0.2, H - 0.3, steel, (-L / 2 + 0.1, -W / 2 + 0.03, 0.17)); corr(L - 0.2, H - 0.3, steel, (-L / 2 + 0.1, W / 2 - 0.03, 0.17), flip=-1)
corr(W - 0.2, H - 0.3, steel, (-L / 2 + 0.03, -W / 2 + 0.1, 0.17), axis="y")
box((L, W, 0.04), (0, 0, H - 0.1), steel, bevel=0.01)  # roof skin (snow covers the top)
for i in range(8):  # plank floor, top at 0.17
    box((L - 0.12, W / 8 - 0.012, 0.035), (0, -W / 2 + W / 16 + i * W / 8, 0.152 + random.uniform(-0.004, 0.004)), wood, bevel=0.006)
for sx in (-1, 1):
    for sy in (-1, 1): box((0.16, 0.16, H), (sx * (L / 2 - 0.08), sy * (W / 2 - 0.08), H / 2), rust, bevel=0.02)
    box((0.14, W, 0.16), (sx * (L / 2 - 0.07), 0, H - 0.08), rust, bevel=0.02); box((0.14, W, 0.13), (sx * (L / 2 - 0.07), 0, 0.065), rust, bevel=0.02)
for sy in (-1, 1):
    box((L, 0.12, 0.14), (0, sy * (W / 2 - 0.06), H - 0.07), rust, bevel=0.02); box((L, 0.12, 0.13), (0, sy * (W / 2 - 0.06), 0.065), rust, bevel=0.02)
for sy, ang in ((-1, 105), (1, 62)):  # two door leaves swung open on their corner hinges
    a = math.radians(ang) * sy; hx, hy = L / 2, sy * (W / 2 - 0.05); dw = W / 2 - 0.08
    cx, cy = hx + math.sin(abs(a)) * dw / 2, hy - sy * math.cos(abs(a)) * dw / 2
    yaw = math.atan2(math.sin(abs(a)), -sy * math.cos(abs(a)))  # leaf runs from hinge toward the opening, swung out
    box((dw, 0.05, H - 0.34), (cx, cy, H / 2), steel, rot=(0, 0, yaw), bevel=0.012)
    for k in (-0.3, 0.3): cyl(0.018, H - 0.4, (cx + math.cos(yaw) * k * dw, cy + math.sin(yaw) * k * dw + 0.0, H / 2), rust, v=10, bevel=0)
    for zz in (0.5, 1.3, 2.1): box((dw, 0.07, 0.07), (cx, cy, zz), rust, rot=(0, 0, yaw), bevel=0.012)
snow(L / 2 + 0.15, W / 2 + 0.12, 0.42, (0, 0, H - 0.1), sn, 3, flat=0.6); snow(2.6, 0.9, 0.9, (-0.6, -W / 2 - 0.5, 0), sn, 9); snow(1.1, 1.3, 0.7, (-L / 2 - 0.5, 0.2, 0), sn, 5)
snow(0.9, 0.7, 0.17, (L / 2 + 0.75, 0.1, 0), sn, 11, flat=0.5)  # trodden snow ramp at the sill
export("container-open"); proof("container-open", (9, -6, 2.6), (0, 0, 1.2))

# ---------- jetty: 6 m plank deck on log piles, runs along -Y (out onto the ice), deck top 0.28 ----------
reset(); wood = mat("wood", (0.33, 0.25, 0.18), 0.85); sn = mat("snow", (0.9, 0.93, 0.97), 0.9)
y = 0.0
while y < 6.0:
    w = random.uniform(0.17, 0.22); box((1.5 + random.uniform(-0.06, 0.06), w, 0.045), (random.uniform(-0.03, 0.03), -y - w / 2, 0.255), wood, rot=(random.uniform(-0.012, 0.012), 0, random.uniform(-0.02, 0.02)), bevel=0.008); y += w + 0.012
for sx in (-1, 1):
    box((0.09, 6.0, 0.14), (sx * 0.6, -3, 0.16), wood, bevel=0.01)
    for yy in (0.3, 2.9, 5.7):
        hgt = random.uniform(0.75, 1.15); cyl(0.085, hgt + 0.4, (sx * 0.78, -yy, hgt / 2 - 0.2), wood, rot=(random.uniform(-0.05, 0.05), random.uniform(-0.05, 0.05), 0), r2=0.07); snow(0.11, 0.11, 0.09, (sx * 0.78, -yy, hgt - 0.01), sn, yy)
bm = None
for i, (px, py, sx_, sy_) in enumerate(((0.3, -1.2, 0.5, 0.9), (-0.35, -3.4, 0.4, 1.1), (0.2, -5.2, 0.55, 0.6))): snow(sx_, sy_, 0.07, (px, py, 0.275), sn, i * 7, flat=0.6)
snow(1.2, 0.8, 0.26, (0, 0.55, 0), sn, 2, flat=0.5)
# a coil of rope on a pile
bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.035, location=(0.5, -5.5, 0.31)); fin(bpy.context.object, mat("rope", (0.45, 0.38, 0.25), 0.9), 0, smooth=True)
export("jetty"); proof("jetty", (4.5, 2.5, 2.2), (0, -3, 0.2))

# ---------- buried rail fence: 6 m along X, posts leaning, a drift along its foot ----------
reset(); wood = mat("wood", (0.3, 0.26, 0.22), 0.9); sn = mat("snow", (0.9, 0.93, 0.97), 0.9)
for i in range(4):
    x = -3 + i * 2 + random.uniform(-0.08, 0.08); h = random.uniform(1.0, 1.25); cyl(0.065, h + 0.4, (x, 0, h / 2 - 0.2), wood, rot=(random.uniform(-0.12, 0.12), random.uniform(-0.08, 0.08), 0), v=9, r2=0.055); snow(0.09, 0.09, 0.08, (x, 0, h - 0.02), sn, i)
for zz in (0.45, 0.85):
    for i in range(3):
        if zz > 0.8 and i == 1: box((1.3, 0.035, 0.11), (-0.45, 0.05, 0.6), wood, rot=(0, 0.42, 0.05), bevel=0.008); continue  # one rail broken, hanging
        box((2.05, 0.035, 0.12), (-2 + i * 2, 0.05, zz + random.uniform(-0.03, 0.03)), wood, rot=(0, random.uniform(-0.03, 0.03), 0), bevel=0.008)
snow(3.3, 0.6, 0.38, (0, -0.25, 0), sn, 4); snow(1.2, 0.5, 0.55, (1.6, -0.2, 0), sn, 8)
export("fence"); proof("fence", (3, -5, 1.6), (0, 0, 0.5))

# ---------- torn banner between two leaning poles, 3.4 m wide, faces -Y ----------
reset(); wood = mat("wood", (0.3, 0.26, 0.22), 0.9); cloth = mat("banner", (1, 1, 1), 0.95, 0, tex_banner()); sn = mat("snow", (0.9, 0.93, 0.97), 0.9)
bm = bmesh.new(); NX, NZ = 48, 20; g = [[None] * (NZ + 1) for _ in range(NX + 1)]; uvl = bm.loops.layers.uv.new()
for i in range(NX + 1):
    for j in range(NZ + 1):
        u, v = i / NX, j / NZ; sag = 0.22 * math.sin(u * math.pi)
        g[i][j] = bm.verts.new((-1.6 + 3.2 * u, 0.1 * math.sin(u * 9 + v * 3) * (0.3 + (1 - v)) + 0.05 * math.sin(v * 14), 1.5 + 1.3 * v - sag * (1 - v * 0.4)))
for i in range(NX):
    for j in range(NZ):
        u, v = i / NX, j / NZ
        if v < 0.45 and noise.noise(Vector((u * 5, v * 2.2, 3.1))) > 0.12 + v * 0.9: continue  # torn lower edge
        if u > 0.78 and v < 0.75 - (u - 0.78) * 1.2 and u + v > 1.05: continue  # one corner ripped away
        f = bm.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
        for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uvl].uv = (a / NX, b / NZ)
me = bpy.data.meshes.new("cloth"); bm.to_mesh(me); o = bpy.data.objects.new("cloth", me); bpy.context.collection.objects.link(o); fin(o, cloth, 0, smooth=True, uv=False)
cyl(0.05, 3.5, (-1.66, 0, 1.55), wood, rot=(0, -0.06, 0), v=10, r2=0.04); cyl(0.05, 3.3, (1.66, 0, 1.45), wood, rot=(0.05, 0.09, 0), v=10, r2=0.04)
snow(0.5, 0.45, 0.3, (-1.66, 0, 0), sn, 1); snow(0.6, 0.5, 0.35, (1.7, 0, 0), sn, 6)
export("banner"); proof("banner", (1.5, -6, 1.8), (0, 0, 1.6))

# ---------- road signs: 3 m steel post, plate at 2.2-2.9 m, faces -Y ----------
for kind in ("moose", "max50"):
    reset(); post = mat("post", (0.45, 0.47, 0.48), 0.45, 1); face = mat("face", (1, 1, 1), 0.5, 0, tex_sign(kind)); sn = mat("snow", (0.9, 0.93, 0.97), 0.9)
    cyl(0.032, 3.0, (0, 0.02, 1.5), post, v=10, bevel=0)
    bpy.ops.mesh.primitive_plane_add(size=0.75, location=(0, -0.022, 2.5), rotation=(math.pi / 2, math.pi / 4 if kind == "moose" else 0, 0)); p = bpy.context.object
    bpy.context.view_layer.objects.active = p; p.select_set(True); bpy.ops.object.transform_apply(rotation=True)
    for l in p.data.loops: pass
    uv = p.data.uv_layers[0].data
    if kind == "moose":
        for l in p.data.loops:
            c = p.data.vertices[l.vertex_index].co; uv[l.index].uv = (0.5 - (c.x) / 1.06, 0.5 + (c.z - 2.5) / 1.06)  # diamond art fills the plate
        for l in p.data.loops:
            c = p.data.vertices[l.vertex_index].co; uv[l.index].uv = (0.5 + c.x / 1.0607 , 0.5 + (c.z - 2.5) / 1.0607)
    mo = p.modifiers.new("s", "SOLIDIFY"); mo.thickness = 0.006; bpy.ops.object.modifier_apply(modifier="s"); p.data.materials.append(face); p.select_set(False)
    top = 2.5 + (0.53 if kind == "moose" else 0.375)
    snow(0.2 if kind == "moose" else 0.38, 0.05, 0.1, (0, -0.02, top - 0.03), sn, 2, flat=0.4)
    export("sign-" + kind); proof("sign-" + kind, (0.8, -3.2, 2.2), (0, 0, 2.2))

# ---------- scattered paperwork: ~1.6 m patch of curled sheets ----------
reset(); pm = mat("paper", (1, 1, 1), 0.9, 0, tex_paper())
for k in range(13):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = 6; curl = random.uniform(0.0, 0.06); vs = [[bm.verts.new((0.21 * (i / n - 0.5), 0.297 * (j / n - 0.5), curl * ((i / n - 0.5) ** 2 * 4) * (j / n))) for j in range(n + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(n):
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uvl].uv = (a / n, b / n)
    me = bpy.data.meshes.new("p"); bm.to_mesh(me); o = bpy.data.objects.new("p", me); bpy.context.collection.objects.link(o)
    r = random.uniform(0, 0.8); a = random.uniform(0, 6.28); o.location = (math.cos(a) * r, math.sin(a) * r, 0.004 + k * 0.0015); o.rotation_euler = (0, 0, random.uniform(0, 6.28)); fin(o, pm, 0, smooth=True, uv=False)
export("papers"); proof("papers", (1.2, -1.4, 1.1), (0, 0, 0))

# ---------- snow heap (1 m radius unit, scaled in game) ----------
reset(); sn = mat("snow", (0.9, 0.93, 0.97), 0.9); snow(1.0, 0.8, 0.5, (0, 0, 0), sn, 21); snow(0.55, 0.6, 0.34, (0.75, 0.3, 0), sn, 33)
export("snowheap"); proof("snowheap", (3, -3, 1.6), (0, 0, 0.2))

# ---------- ice-fishing hole: chipped rim of ice blocks, black water, a tip-up with a line ----------
reset(); ice = mat("ice", (0.62, 0.78, 0.86), 0.2); water = mat("water", (0.01, 0.02, 0.03), 0.05); wood = mat("wood", (0.33, 0.25, 0.18), 0.85); line = mat("line", (0.85, 0.85, 0.8), 0.6); sn = mat("snow", (0.9, 0.93, 0.97), 0.9)
cyl(0.36, 0.012, (0, 0, 0.012), water, v=24, bevel=0)
for k in range(15):
    a = k / 15 * 6.283 + random.uniform(-0.1, 0.1); r = 0.42 + random.uniform(0, 0.1)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(math.cos(a) * r, math.sin(a) * r, 0.03)); o = bpy.context.object; o.scale = (random.uniform(0.06, 0.13), random.uniform(0.06, 0.12), random.uniform(0.04, 0.09)); o.rotation_euler = (random.random(), random.random(), random.random()); fin(o, ice, 0.008)
snow(0.5, 0.35, 0.16, (-0.75, 0.5, 0), sn, 4)
for a in (0.3, 2.4, 4.5): cyl(0.014, 0.95, (math.cos(a) * 0.3, math.sin(a) * 0.3 + 0.0, 0.4), wood, rot=(math.sin(a) * 0.62, -math.cos(a) * 0.62, 0), v=7, bevel=0)
cyl(0.012, 0.8, (0.18, 0, 0.82), wood, rot=(0, 1.2, 0), v=7, bevel=0); cyl(0.003, 0.74, (-0.19, 0, 0.385), line, v=5, bevel=0)
box((0.07, 0.004, 0.05), (0.52, 0, 0.95), mat("flag", (0.7, 0.1, 0.08), 0.8), bevel=0)
export("icehole"); proof("icehole", (1.6, -1.8, 1.2), (0, 0, 0.2))
