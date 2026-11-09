# Level 2.1 props that were boxes: sandbag wall, steel bunk bed, coil-water cooler, blasting plunger + dynamite crate, saltine cartons, specimen case.
# Front +Y (glTF -Z), stands on z=0. Out: art/props/out/<name>.glb + previews.
import bpy, os, sys, math, random
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "props", "build.py")).read().split("# ------------------------------------------------------------ a maintenance locker")[0]
exec(src)
which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["sandbags", "bunk", "cooler", "plunger", "saltines", "specimen", "sorttable", "lbench"]
def pillow(name, size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for v in o.data.vertices:  # squared-off bag: push toward the box, keep the soft seams
        v.co.x = math.copysign(abs(v.co.x) ** 0.8 * (size[0] / 2) ** 0.2, v.co.x)
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def sandbags():
    reset(); random.seed(3); burlap = mat("burlap", (0.42, 0.34, 0.22), 0.95); dark = mat("burlap_dark", (0.33, 0.27, 0.18), 0.95)
    parts = []; W = 1.4
    for row in range(3):
        n = 3 if row % 2 == 0 else 2; off = 0 if row % 2 == 0 else 0.23
        for i in range(n):
            x = -W / 2 + 0.24 + off + i * 0.46 + random.uniform(-0.03, 0.03)
            parts.append(pillow("bag", (0.5, 0.34, 0.2), (x, random.uniform(-0.03, 0.03), 0.1 + row * 0.18), burlap if (i + row) % 3 else dark, (0, 0, random.uniform(-0.12, 0.12))))
    ob = join_export("l21_sandbags", parts); preview("l21_sandbags", ob); return ob

def bunk():
    reset(); steel = mat("steel", (0.28, 0.3, 0.27), 0.55, 0.7); mattress = mat("mattress", (0.42, 0.4, 0.33), 0.95); stripe = mat("ticking", (0.28, 0.3, 0.36), 0.9); blanket = mat("blanket", (0.24, 0.28, 0.2), 0.95)
    L, W, H = 1.95, 0.95, 1.6; parts = []
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(cyl("post", 0.022, H, (sx * (W / 2), sy * (L / 2), H / 2), steel, verts=10))
    for z in (0.32, 1.2):
        for sx in (-1, 1): parts.append(cyl("rail", 0.018, L, (sx * W / 2, 0, z), steel, rot=(math.pi / 2, 0, 0), verts=8))
        for sy in (-1, 1): parts.append(cyl("rail", 0.018, W, (0, sy * L / 2, z), steel, rot=(0, math.pi / 2, 0), verts=8))
        for k in range(6): parts.append(box("slat", (W - 0.04, 0.03, 0.01), (0, -L / 2 + 0.2 + k * 0.31, z - 0.01), steel, 0.002, 1))
        parts.append(box("mattress", (W - 0.06, L - 0.06, 0.12), (0, 0, z + 0.07), mattress, 0.04, 3))
        parts.append(box("stripe", (W - 0.05, 0.02, 0.122), (0, -0.4, z + 0.07), stripe, 0.0, 1))
    parts.append(box("blanket", (W - 0.02, 0.9, 0.04), (0.02, 0.35, 0.32 + 0.14), blanket, 0.02, 2))
    parts.append(box("pillow", (0.5, 0.3, 0.08), (0, -L / 2 + 0.25, 1.2 + 0.17), mattress, 0.035, 3))
    parts.append(cyl("stile", 0.016, 1.3, (W / 2 - 0.4, L / 2 + 0.03, 0.65), steel, verts=10))
    for z in (0.32, 1.2): parts.append(cyl("stay", 0.012, 0.05, (W / 2 - 0.4, L / 2 + 0.005, z), steel, rot=(math.pi / 2, 0, 0), verts=8))
    for k in range(4): parts.append(cyl("ladder", 0.012, 0.4, (W / 2 - 0.2, L / 2 + 0.03, 0.5 + k * 0.22), steel, rot=(0, math.pi / 2, 0), verts=8))
    ob = join_export("l21_bunk", parts); preview("l21_bunk", ob); return ob

def cooler():
    reset(); body = mat("enamel", (0.78, 0.8, 0.8), 0.45, 0.1); glass = mat("jug", (0.35, 0.6, 0.85), 0.1); copper = mat("copper", (0.72, 0.42, 0.2), 0.3, 0.9); tap = mat("tap", (0.1, 0.25, 0.65), 0.4)
    parts = [box("cab", (0.32, 0.32, 0.86), (0, 0, 0.43), body, 0.03, 3), box("drip", (0.2, 0.1, 0.02), (0, 0.17, 0.5), tap, 0.005, 1)]
    for sx in (-0.06, 0.06): parts.append(box("tap", (0.035, 0.05, 0.05), (sx, 0.18, 0.66), tap, 0.008, 2))
    j = cyl("jug", 0.14, 0.38, (0, 0, 1.08), glass, verts=24); parts.append(j); parts.append(cyl("neck", 0.05, 0.08, (0, 0, 0.87), glass, verts=16))
    for k in range(5): parts.append(cyl("ring", 0.145, 0.012, (0, 0, 0.94 + k * 0.07), glass, verts=24))
    # Ned's copper coil climbing the back, into the jug's cap
    for k in range(10):
        a = k * 0.9; parts.append(cyl("coil", 0.008, 0.12, (math.cos(a) * 0.05 - 0.0, -0.18, 0.2 + k * 0.08), copper, rot=(0, math.pi / 2, a), verts=6))
    parts.append(cyl("pipe", 0.008, 0.95, (0, -0.18, 0.6), copper, verts=6)); parts.append(cyl("pipe2", 0.008, 0.25, (0, -0.06, 1.3), copper, rot=(math.pi / 2.5, 0, 0), verts=6))
    ob = join_export("l21_cooler", parts); preview("l21_cooler", ob); return ob

def plunger():
    reset(); wood = mat("wood", (0.36, 0.24, 0.13), 0.8); dark = mat("wood_dark", (0.22, 0.14, 0.08), 0.85); steel = mat("steel", (0.4, 0.4, 0.42), 0.4, 0.85); red = mat("dynamite", (0.62, 0.12, 0.08), 0.75); brass = mat("brass", (0.7, 0.55, 0.25), 0.35, 0.9); paper = mat("stencil", (0.85, 0.8, 0.65), 0.9)
    parts = [box("case", (0.3, 0.24, 0.32), (-0.25, 0, 0.16), wood, 0.012, 2), box("lid", (0.32, 0.26, 0.03), (-0.25, 0, 0.335), dark, 0.008, 2)]
    parts.append(cyl("shaft", 0.014, 0.34, (-0.25, 0, 0.5), steel, verts=10)); parts.append(cyl("handle", 0.022, 0.32, (-0.25, 0, 0.67), dark, rot=(0, math.pi / 2, 0), verts=12))
    for sx in (-0.08, 0.08): parts.append(cyl("post", 0.015, 0.04, (-0.25 + sx, 0.08, 0.36), brass, verts=8))
    # the dynamite crate: open, sticks inside
    cx = 0.22; parts += [box("cb", (0.4, 0.28, 0.02), (cx, 0, 0.01), wood, 0.004, 1)]
    for sx in (-1, 1): parts.append(box("cs", (0.02, 0.28, 0.22), (cx + sx * 0.19, 0, 0.11), wood, 0.004, 1))
    for sy in (-1, 1): parts.append(box("ce", (0.4, 0.02, 0.22), (cx, sy * 0.13, 0.11), wood, 0.004, 1))
    parts.append(box("label", (0.22, 0.004, 0.08), (cx, 0.142, 0.12), paper, 0.0, 1))
    for k in range(7): parts.append(cyl("stick", 0.03, 0.24, (cx - 0.12 + (k % 4) * 0.075, -0.05 + (k // 4) * 0.07, 0.12 + (k // 4) * 0.03), red, rot=(math.pi / 2, 0, 0.1 * k), verts=12))
    parts.append(box("lidopen", (0.4, 0.02, 0.28), (cx, -0.15, 0.32), wood, 0.004, 1))
    ob = join_export("l21_plunger", parts); preview("l21_plunger", ob); return ob

def saltines():
    reset(); random.seed(5); card = mat("carton", (0.82, 0.72, 0.45), 0.85); red = mat("brand", (0.7, 0.12, 0.1), 0.7); wax = mat("sleeve", (0.92, 0.88, 0.75), 0.5)
    parts = []
    for k in range(5):
        x = -0.18 + (k % 3) * 0.2 + random.uniform(-0.015, 0.015); y = -0.05 + (k // 3) * 0.12; z = 0.0 + (0.17 if k >= 3 else 0)
        parts.append(box("carton", (0.19, 0.11, 0.17), (x, y, z + 0.085), card, 0.006, 1)); parts.append(box("band", (0.192, 0.112, 0.04), (x, y, z + 0.12), red, 0.0, 1))
    for k in range(3): parts.append(box("sleeve", (0.055, 0.15, 0.055), (0.25 + k * 0.012, 0.12 - k * 0.04, 0.03 + k * 0.0), wax, 0.02, 3))
    ob = join_export("l21_saltines", parts); preview("l21_saltines", ob); return ob

def specimen():
    reset(); steel = mat("steel", (0.35, 0.37, 0.4), 0.4, 0.8); glass = mat("glass", (0.6, 0.75, 0.8), 0.05); berry = mat("berries", (0.55, 0.04, 0.08), 0.3); tape = mat("hazard", (0.85, 0.65, 0.05), 0.6)
    parts = [box("cabinet", (0.8, 0.6, 0.86), (0, 0, 0.43), steel, 0.02, 2), box("top", (0.84, 0.64, 0.03), (0, 0, 0.875), steel, 0.01, 2)]
    for k in range(2): parts.append(box("drawer", (0.7, 0.01, 0.32), (0, 0.305, 0.22 + k * 0.38), steel, 0.004, 1)); parts.append(box("pull", (0.18, 0.025, 0.02), (0, 0.32, 0.3 + k * 0.38), steel, 0.004, 1))
    parts.append(cyl("jar", 0.17, 0.42, (0, 0, 1.1), glass, verts=28)); parts.append(cyl("lid", 0.18, 0.04, (0, 0, 1.33), steel, verts=28)); parts.append(cyl("base", 0.19, 0.04, (0, 0, 0.91), steel, verts=28))
    random.seed(9)
    for k in range(14):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.03, location=(random.uniform(-0.09, 0.09), random.uniform(-0.09, 0.09), 0.95 + random.uniform(0, 0.12))); o = bpy.context.active_object; o.data.materials.append(berry); parts.append(o)
    parts.append(box("tape", (0.81, 0.61, 0.04), (0, 0, 0.75), tape, 0.0, 1))
    ob = join_export("l21_specimen", parts); preview("l21_specimen", ob); return ob

def sorttable():
    # Refrigerator Paradise sorting table: 3.6 x 1.7 m, top at 0.80, plank top on welded steel trestles, saltine cartons piled on it
    reset(); random.seed(11); wood = mat("plank", (0.36, 0.24, 0.13), 0.82); worn = mat("plank_worn", (0.45, 0.32, 0.19), 0.85); steel = mat("steel", (0.2, 0.21, 0.2), 0.5, 0.7)
    card = mat("carton", (0.82, 0.72, 0.45), 0.85); red = mat("brand", (0.7, 0.12, 0.1), 0.7); wax = mat("sleeve", (0.92, 0.88, 0.75), 0.5)
    L, W, T = 3.6, 1.7, 0.8; parts = []
    n = 6
    for k in range(n):
        pw = W / n; y = -W / 2 + pw * (k + 0.5)
        parts.append(box("plank", (L + random.uniform(-0.03, 0.03), pw - 0.008, 0.045), (random.uniform(-0.01, 0.01), y, T - 0.0225), wood if k % 2 else worn, 0.006, 2))
    for sx in (-1, 1):
        x = sx * (L / 2 - 0.25)
        parts.append(box("apron", (0.05, W - 0.1, 0.08), (x, 0, T - 0.085), steel, 0.004, 1))
        for sy in (-1, 1): parts.append(box("leg", (0.045, 0.045, T - 0.045), (x, sy * (W / 2 - 0.1), (T - 0.045) / 2), steel, 0.005, 1)); parts.append(box("foot", (0.08, 0.12, 0.012), (x, sy * (W / 2 - 0.1), 0.006), steel, 0.003, 1))
        parts.append(box("brace", (0.03, W - 0.2, 0.03), (x, 0, 0.18), steel, 0.003, 1))
    parts.append(box("stretcher", (L - 0.5, 0.03, 0.03), (0, 0, 0.18), steel, 0.003, 1))
    for k in range(14):
        if k % 7 in (3, 4): continue  # the middle is the interactive carton stack (l21-saltines)
        x = -1.5 + (k % 7) * 0.42 + random.uniform(-0.05, 0.05); y = -0.45 + (k // 7) * 0.62 + random.uniform(-0.08, 0.08)
        h = 1 + (k % 3 == 0); a = random.uniform(-0.25, 0.25)
        for j in range(h):
            b = box("carton", (0.19, 0.11, 0.17), (x, y, T + 0.085 + j * 0.17), card, 0.006, 1); b.rotation_euler[2] = a; parts.append(b)
            c = box("band", (0.192, 0.112, 0.04), (x, y, T + 0.12 + j * 0.17), red, 0.0, 1); c.rotation_euler[2] = a; parts.append(c)
    for k in range(5): parts.append(box("sleeve", (0.055, 0.15, 0.055), (1.2 + k * 0.07, 0.55 - k * 0.05, T + 0.0275), wax, 0.02, 3))
    for k in range(4):
        b = box("carton", (0.19, 0.11, 0.17), (-1.0 + k * 0.6, -1.05 + random.uniform(-0.05, 0.05), 0.085), card, 0.006, 1); b.rotation_euler[2] = random.uniform(-0.6, 0.6); parts.append(b)
    ob = join_export("l21_sorttable", parts); preview("l21_sorttable", ob); return ob

def lbench():
    # locker-room bench, 4.4 m: two hardwood boards on cast steel pedestals, bolted to the tile
    reset(); random.seed(12); wood = mat("hardwood", (0.42, 0.27, 0.13), 0.6); steel = mat("pedestal", (0.16, 0.17, 0.17), 0.5, 0.75)
    L = 4.4; parts = []
    for k, y in enumerate((-0.12, 0.12)): parts.append(box("board", (L, 0.22, 0.045), (0, y, 0.4575), wood, 0.012, 3))
    for x in (-1.8, 0, 1.8):
        parts.append(box("cleat", (0.06, 0.46, 0.04), (x, 0, 0.415), steel, 0.006, 1))
        parts.append(cyl("post", 0.03, 0.4, (x, 0, 0.2), steel, verts=16))
        parts.append(cyl("flange", 0.09, 0.015, (x, 0, 0.0075), steel, verts=20))
    ob = join_export("l21_lbench", parts); preview("l21_lbench", ob); return ob

for w in which: globals()[w]()
