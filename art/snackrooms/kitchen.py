# Level 6.1 kitchen and bar pieces: deck pizza oven, flat-top grill, 50s bubbler jukebox, Liquorette back bar. Front at Blender -Y (glTF +Z), origin bottom centre.
import bpy, math, os, sys
sys.argv = [a for a in sys.argv]; here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
exec(open(os.path.join(here, "counters.py")).read().split("def bar(")[0])  # shared helpers: clear, mat, put, bevel, box, rod, finish

def oven():  # two stacked stainless decks with glowing slots, handles, brick hearth inside, on a black stand
    clear()
    S = mat("steel", (0.72, 0.72, 0.74), 1, 0.28); K = mat("black", (0.04, 0.04, 0.04), 0.3, 0.5); Gl = mat("glow", (1, 0.45, 0.12), 0, 0.5, 1, 6)
    for x in (-1.35, 1.35):
        for y in (-0.4, 0.4): put(box(0.06, 0.06, 0.7, x, y, 0), K)
    put(box(2.8, 0.85, 0.04, 0, 0, 0.3), K)
    for k in range(2):
        z = 0.7 + k * 0.72
        put(bevel(box(3.0, 1.0, 0.68, 0, 0, z), 0.02, 3), S)
        put(box(2.4, 0.02, 0.06, 0, -0.505, z + 0.28), Gl)
        put(rod(0.025, 2.2, 0, -0.58, z + 0.5, "X"), S)
        for x in (-1.0, 1.0): put(box(0.04, 0.08, 0.04, x, -0.54, z + 0.48), S)
        put(box(0.3, 0.02, 0.14, 1.25, -0.51, z + 0.05), K)
    put(rod(0.12, 0.25, 0, 0.3, 2.25, "Z"), S)
    finish("l61-oven", 3.4, 2.2, 3)

def grill():  # flat-top griddle: black steel plate with grease trough, splash guards, four knobs, cabinet base
    clear()
    S = mat("steel", (0.7, 0.7, 0.72), 1, 0.3); P = mat("plate", (0.06, 0.055, 0.05), 0.9, 0.35); K = mat("knob", (0.05, 0.05, 0.05), 0, 0.4)
    put(bevel(box(4.0, 0.95, 0.82, 0, 0, 0), 0.015), S)
    for i in range(4): put(box(0.9, 0.01, 0.6, -1.5 + i, -0.476, 0.1), mat("door", (0.6, 0.6, 0.62), 1, 0.35))
    put(box(3.9, 0.8, 0.04, 0, 0.03, 0.82), P)
    put(box(3.9, 0.08, 0.03, 0, -0.42, 0.82), S)
    put(box(4.0, 0.03, 0.25, 0, 0.465, 0.82), S)
    for x in (-1.985, 1.985): put(box(0.03, 0.95, 0.18, x, 0, 0.82), S)
    for i in range(4): put(rod(0.035, 0.05, -1.5 + i, -0.5, 0.7, "Y", 16), K)
    for i in range(3): put(bevel(box(0.16, 0.16, 0.025, -0.6 + i * 0.6, 0.05, 0.86), 0.02, 3), mat("patty", (0.2, 0.1, 0.05), 0, 0.7))
    finish("l61-grill", 3.2, 1.1, 4)

def jukebox():  # arched bubbler: wood body, chrome grille, glowing tube arch, glass dome with record rack
    clear()
    W = mat("wood", (0.3, 0.12, 0.05), 0, 0.4); C = mat("chrome", (0.85, 0.85, 0.87), 1, 0.15)
    T1 = mat("tubeA", (1.0, 0.5, 0.1), 0, 0.3, 1, 5); T2 = mat("tubeB", (0.9, 0.15, 0.4), 0, 0.3, 1, 5); G = mat("glass", (0.9, 0.95, 1), 0, 0.05, 0.3)
    put(bevel(box(0.95, 0.65, 1.15, 0, 0, 0), 0.04, 4), W)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.475, depth=0.62, location=(0, 0, 1.15)); a = bpy.context.object; a.rotation_euler = (math.pi / 2, 0, 0); bevel(a, 0.03, 3); put(a, W)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.43, minor_radius=0.035, location=(0, -0.33, 1.15)); t = bpy.context.object; t.rotation_euler = (math.pi / 2, 0, 0); put(t, T1)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.36, minor_radius=0.02, location=(0, -0.33, 1.15)); t = bpy.context.object; t.rotation_euler = (math.pi / 2, 0, 0); put(t, T2)
    for x in (-0.43, 0.43): put(rod(0.035, 1.1, x, -0.33, 0.05, "Z"), T1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, -0.2, 1.12)); d = bpy.context.object; d.scale = (1, 0.45, 0.8); put(d, G)
    for i in range(7): put(rod(0.12, 0.004, -0.18 + i * 0.06, -0.2, 1.12, "X", 24), mat("vinyl", (0.02, 0.02, 0.02), 0, 0.3))
    for i in range(6): put(box(0.6, 0.02, 0.02, 0, -0.335, 0.25 + i * 0.07), C)
    put(bevel(box(0.7, 0.04, 0.2, 0, -0.33, 0.75), 0.01), C)
    finish("l61-jukebox", 2.2, 1.6, 1.0)

def backbar():  # Liquorette back bar, after the ref: dark wood case, arched mirror bays with carved crown, shelves of lit bottles. Front -Y, length X.
    clear()
    W = mat("wood", (0.11, 0.04, 0.02), 0, 0.4); M = mat("mirror", (0.8, 0.75, 0.6), 1, 0.08); Br = mat("brass", (0.85, 0.6, 0.25), 1, 0.25)
    cols = [mat(f"b{i}", c, 0, 0.1, 0.8, 0.6) for i, c in enumerate([(0.6, 0.35, 0.05), (0.1, 0.35, 0.1), (0.5, 0.08, 0.05), (0.85, 0.8, 0.6), (0.3, 0.15, 0.05)])]
    L = 7.0
    put(bevel(box(L, 0.5, 0.95, 0, 0, 0), 0.015), W)
    put(bevel(box(L + 0.1, 0.56, 0.05, 0, -0.02, 0.95), 0.015), W)
    put(box(L, 0.08, 1.8, 0, 0.21, 1.0), W)
    n = 4; bw = L / n
    for i in range(n):
        x = -L / 2 + bw * (i + 0.5)
        put(box(bw - 0.3, 0.01, 1.1, x, 0.165, 1.05), M)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=(bw - 0.3) / 2, depth=0.01, location=(x, 0.165, 2.15)); c = bpy.context.object; c.rotation_euler = (math.pi / 2, 0, 0); put(c, M)
        for sh in range(3):
            z = 1.1 + sh * 0.42
            put(bevel(box(bw - 0.35, 0.22, 0.03, x, 0.06, z), 0.008), W)
            for b in range(7):
                bx = x - (bw - 0.6) / 2 + b * (bw - 0.6) / 6; h = 0.24 + ((i + b + sh) % 3) * 0.05
                bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.04, radius2=0.015, depth=h, location=(bx, 0.06, z + 0.03 + h / 2)); put(bpy.context.object, cols[(i * 3 + b + sh) % 5])
    for i in range(n + 1):
        x = -L / 2 + i * bw
        put(bevel(box(0.18, 0.3, 2.0, x, 0.1, 0.95), 0.02, 3), W)
        put(rod(0.06, 0.06, x, -0.06, 2.0, "Y", 16), Br)
    put(bevel(box(L + 0.2, 0.42, 0.14, 0, 0.12, 2.75), 0.03, 3), W)
    for i in range(n):
        x = -L / 2 + bw * (i + 0.5)
        bpy.ops.mesh.primitive_torus_add(major_radius=(bw - 0.3) / 2 + 0.06, minor_radius=0.04, location=(x, 0.12, 2.15)); t = bpy.context.object; t.rotation_euler = (math.pi / 2, 0, 0); put(t, W)
    finish("l61-backbar", 5.0, 2.8, L)

which = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "all"
for k, f in {"oven": oven, "grill": grill, "jukebox": jukebox, "backbar": backbar}.items():
    if which in ("all", k): f()
