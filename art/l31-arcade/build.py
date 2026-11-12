# Level 31 arcade machines: one pass builds, proofs and exports all eight. Front of every machine is -Y (glTF +Z).
import bpy, bmesh, math, sys
from math import radians as R, sin, cos, atan2, hypot
OUT = "/workspace/l31"
ONLY = [a for a in sys.argv[sys.argv.index("--") + 1:]] if "--" in sys.argv else []
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 12
    s.render.resolution_x = s.render.resolution_y = 560
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
MATS = {}
def mat(name, rgb, rough=0.5, metal=0.0, emit=0.0):
    if name in bpy.data.materials: return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    return m
def fin(o, m, bevel=0.0, smooth=True):
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 3; b.limit_method = "ANGLE"; b.angle_limit = R(35)
    wn = o.modifiers.new("wn", "WEIGHTED_NORMAL"); wn.keep_sharp = False; wn.weight = 100
    return o
def box(size, loc, m, bevel=0.015, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True); return fin(o, m, bevel)
def cyl(r, h, loc, m, rot=(0, 0, 0), bevel=0.006, v=32, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot); return fin(bpy.context.object, m, bevel)
def ball(scale, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=14, radius=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(scale=True); return fin(o, m)
def torus(Rr, r, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=Rr, minor_radius=r, major_segments=36, minor_segments=10, location=loc, rotation=rot); return fin(bpy.context.object, m)
def plane(w, h, loc, m, tilt=0.0, rot=None):  # faces -Y, top leaned back by tilt degrees; u along +x, v up
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot if rot else (R(90 - tilt), 0, 0)); o = bpy.context.object; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m); return o
def prism(pts, x0, x1, m, bevel=0.01):  # pts: (y, z) outline, extruded along x
    me = bpy.data.meshes.new("p"); bm = bmesh.new()
    vs = [bm.verts.new((x0, y, z)) for y, z in pts]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(x1 - x0, 0, 0), verts=[e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("p", me); bpy.context.scene.collection.objects.link(o); return fin(o, m, bevel)
def wedges(Rr, y, cx, cz, n, ms):
    for i in range(n):
        me = bpy.data.meshes.new("w"); bm = bmesh.new(); a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n
        vs = [bm.verts.new((cx, y, cz))] + [bm.verts.new((cx + Rr * cos(a0 + (a1 - a0) * k / 4), y, cz + Rr * sin(a0 + (a1 - a0) * k / 4))) for k in range(5)]
        bm.faces.new(vs); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new("w", me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(ms[i % len(ms)])
RED = lambda: mat("body_red", (0.62, 0.03, 0.03), 0.3)
BLK = lambda: mat("trim_black", (0.02, 0.02, 0.025), 0.45)
CHR = lambda: mat("chrome", (0.75, 0.76, 0.78), 0.2, 1.0)
SCR = lambda: mat("screen", (0.2, 0.6, 1.0), 0.2, 0, 2.0)
MRQ = lambda: mat("marquee", (1.0, 0.85, 0.4), 0.3, 0, 1.5)

def dispenser():
    M = mat("metal", (0.62, 0.63, 0.64), 0.38, 1.0)
    box((0.5, 0.36, 0.06), (0, 0, 0.03), BLK(), 0.004)
    box((0.55, 0.42, 1.34), (0, 0, 0.06 + 0.67), M, 0.012)
    plane(0.47, 0.66, (0, -0.2125, 1.03), mat("print", (0.1, 0.5, 0.2), 0.5))
    torus(0.085, 0.012, (0, -0.214, 0.9), CHR(), (R(90), 0, 0))
    ball((0.075, 0.035, 0.075), (0, -0.218, 0.9), mat("button", (0.05, 0.2, 0.9), 0.25, 0, 0.6))
    box((0.26, 0.012, 0.022), (0, -0.211, 0.62), BLK(), 0.002)
    box((0.32, 0.15, 0.012), (0, -0.285, 0.52), M, 0.003); box((0.32, 0.012, 0.06), (0, -0.356, 0.545), M, 0.003)
    for s in (-1, 1): box((0.012, 0.15, 0.06), (s * 0.156, -0.285, 0.545), M, 0.003)
    cyl(0.018, 0.012, (0.18, -0.212, 0.3), CHR(), (R(90), 0, 0), 0.002)
    box((0.4, 0.008, 0.3), (0, -0.211, 0.28), mat("metal_dark", (0.3, 0.3, 0.31), 0.5, 1.0), 0.003)

def upright():
    SIDE = mat("side", (0.1, 0.25, 0.6), 0.5)
    P = [(-0.34, 0), (0.38, 0), (0.38, 1.75), (-0.26, 1.75), (-0.36, 1.70), (-0.36, 1.50), (-0.08, 1.45), (-0.22, 1.02), (-0.42, 0.92), (-0.42, 0.86), (-0.34, 0.80)]
    for s in (-1, 1): prism(P, s * 0.335, s * 0.31, SIDE, 0.006)
    prism([(y + (0.014 if y < 0.3 else -0.01), z - (0.008 if z > 1.7 else 0)) for y, z in P], -0.31, 0.31, BLK(), 0.0)
    plane(0.6, 0.18, (0, -0.349, 1.60), MRQ())
    t = math.degrees(atan2(0.14, 0.43)); n = (-cos(R(t)), sin(R(t)))
    plane(0.48, 0.38, (0, -0.136 + n[0] * 0.006, 1.235 + n[1] * 0.006), SCR(), t)
    box((0.56, 0.02, 0.46), (0, -0.136 + n[0] * 0.002, 1.235 + n[1] * 0.002), mat("bezel", (0.04, 0.04, 0.05), 0.3), 0.004, (R(-t), 0, 0))
    a = atan2(0.10, 0.20); cn = (-sin(a), cos(a))
    def on(u, x, h): return (x, -0.306 + u * cos(a) + cn[0] * h, 0.977 + u * sin(a) + cn[1] * h)
    box((0.6, 0.2, 0.012), on(0, 0, 0.0), mat("cpanel", (0.9, 0.85, 0.2), 0.4), 0.003, (a, 0, 0))
    cyl(0.008, 0.09, on(0, -0.16, 0.05), CHR(), (a, 0, 0)); ball((0.024, 0.024, 0.024), on(0, -0.16, 0.1), RED())
    for i, c in enumerate([(0.9, 0.1, 0.1), (0.95, 0.95, 0.95), (0.1, 0.3, 0.9)]): cyl(0.018, 0.016, on(0.01 * (i % 2), 0.06 + i * 0.07, 0.012), mat(f"btn{i}", c, 0.3), (a, 0, 0), 0.003)
    box((0.3, 0.012, 0.36), (0, -0.33, 0.45), mat("metal_dark", (0.12, 0.12, 0.13), 0.45, 1.0), 0.004)
    for s in (-1, 1): box((0.035, 0.008, 0.06), (s * 0.06, -0.338, 0.52), mat("coin", (1, 0.25, 0.05), 0.4, 0, 2.0), 0.002)

def pinball():
    B = mat("body", (0.08, 0.1, 0.35), 0.4)
    prism([(-0.70, 0.60), (0.56, 0.66), (0.56, 1.12), (-0.70, 0.94)], -0.30, 0.30, B, 0.012)
    sl = atan2(0.18, 1.26)
    plane(0.54, 1.2, (0, -0.07, 1.036), mat("playfield", (0.8, 0.7, 0.3), 0.15, 0, 0.6), rot=(sl, 0, 0))
    for s in (-1, 1):
        box((0.035, 1.27, 0.05), (s * 0.288, -0.07, 1.045), CHR(), 0.006, (sl, 0, 0))
        cyl(0.02, 0.012, (s * 0.303, -0.6, 0.86), mat("btn1", (0.95, 0.95, 0.95), 0.3), (0, R(90), 0), 0.003)
        for y in (-0.64, 0.5): cyl(0.024, 0.9, (s * 0.29 + s * 0.02, y + (-0.03 if y < 0 else 0.02), 0.44), CHR(), (R(4 if y < 0 else -3), R(s * 3), 0), 0.004, 16)
    cyl(0.03, 0.62, (0, -0.70, 0.955), CHR(), (0, R(90), 0), 0.008)
    box((0.74, 0.24, 0.76), (0, 0.50, 1.50), B, 0.02)
    box((0.3, 0.1, 0.5), (0, 0.52, 0.95), B, 0.01)
    plane(0.64, 0.66, (0, 0.376, 1.50), mat("backglass", (0.9, 0.4, 0.7), 0.15, 0, 1.2))
    box((0.24, 0.012, 0.2), (0, -0.70, 0.72), mat("metal_dark", (0.12, 0.12, 0.13), 0.45, 1.0), 0.004)
    cyl(0.012, 0.1, (0.22, -0.74, 0.82), CHR(), (R(90), 0, 0), 0.002); ball((0.022, 0.022, 0.022), (0.22, -0.79, 0.82), BLK())

def racer():
    box((0.9, 1.9, 0.10), (0, -0.05, 0.05), BLK(), 0.02)
    box((0.9, 0.55, 1.5), (0, 0.63, 0.85), RED(), 0.04)
    box((0.94, 0.36, 0.34), (0, 0.60, 1.74), BLK(), 0.03); plane(0.86, 0.26, (0, 0.418, 1.74), MRQ())
    box((0.8, 0.03, 0.6), (0, 0.352, 1.26), BLK(), 0.008, (R(-8), 0, 0)); plane(0.72, 0.52, (0, 0.333, 1.262), SCR(), 8)
    box((0.82, 0.34, 0.26), (0, 0.22, 0.86), BLK(), 0.05)
    for s in (-1, 1):
        prism([(0.40, 0.1), (0.40, 1.02), (0.02, 1.02), (-0.30, 0.50), (-0.30, 0.1)], s * 0.45, s * 0.41, RED(), 0.012)
        box((0.1, 0.03, 0.16), (s * 0.12, 0.2, 0.2), CHR(), 0.006, (R(-35), 0, 0))
        box((0.07, 0.36, 0.14), (s * 0.235, -0.60, 0.50), RED(), 0.03)
        box((0.07, 0.12, 0.5), (s * 0.235, -0.80, 0.80), RED(), 0.03, (R(-12), 0, 0))
    cyl(0.025, 0.2, (0, 0.03, 0.93), BLK(), (R(65), 0, 0)); torus(0.17, 0.022, (0, -0.06, 0.975), BLK(), (R(65), 0, 0))
    cyl(0.05, 0.03, (0, -0.065, 0.977), RED(), (R(65), 0, 0), 0.004)
    for k in range(3): box((0.03, 0.16, 0.012), (0.08 * cos(R(90 + k * 120)), -0.06, 0.975 + 0.08 * sin(R(90 + k * 120)) * 0.9), CHR(), 0.003, (R(-25), R(-k * 120), 0))
    box((0.36, 0.5, 0.26), (0, -0.60, 0.23), BLK(), 0.03)
    box((0.42, 0.48, 0.12), (0, -0.58, 0.42), mat("seat", (0.05, 0.05, 0.06), 0.7), 0.05)
    box((0.42, 0.12, 0.72), (0, -0.86, 0.80), mat("seat", (0, 0, 0)), 0.05, (R(-12), 0, 0))
    box((0.28, 0.1, 0.2), (0, -0.955, 1.25), RED(), 0.045, (R(-12), 0, 0))
    cyl(0.012, 0.2, (0.33, -0.3, 0.4), CHR(), (0, 0, 0)); ball((0.03, 0.03, 0.03), (0.33, -0.3, 0.52), BLK()); box((0.12, 0.2, 0.22), (0.33, -0.3, 0.2), BLK(), 0.02)

def moto():
    PL = mat("platform", (0.55, 0.56, 0.58), 0.4, 1.0)
    box((1.05, 2.4, 0.2), (0, -0.15, 0.1), PL, 0.025)
    box((1.07, 0.03, 0.05), (0, -1.345, 0.17), mat("hazard", (0.95, 0.75, 0.05), 0.5), 0.004)
    box((0.8, 0.42, 1.42), (0, 0.80, 0.91), BLK(), 0.04); box((0.86, 0.34, 0.34), (0, 0.78, 1.79), RED(), 0.03); plane(0.78, 0.26, (0, 0.607, 1.79), MRQ())
    plane(0.66, 0.5, (0, 0.586, 1.3), SCR(), 5); box((0.74, 0.03, 0.58), (0, 0.598, 1.3), mat("bezel", (0.04, 0.04, 0.05), 0.3), 0.008, (R(-5), 0, 0))
    for s in (-1, 1): prism([(0.99, 0.2), (0.99, 1.6), (0.55, 1.6), (0.40, 0.2)], s * 0.43, s * 0.40, RED(), 0.012)
    T = mat("tire", (0.03, 0.03, 0.03), 0.9)
    for y, z in ((-0.98, 0.52), (0.12, 0.52)):
        torus(0.24, 0.085, (0, y, z), T, (0, R(90), 0)); cyl(0.17, 0.08, (0, y, z), CHR(), (0, R(90), 0), 0.01)
    cyl(0.07, 0.4, (0, -0.42, 0.38), CHR(), (0, 0, 0), 0.01)
    ball((0.2, 0.5, 0.22), (0, -0.42, 0.66), mat("fairing_grey", (0.7, 0.7, 0.72), 0.35))
    ball((0.21, 0.42, 0.2), (0, -0.25, 0.93), RED(), (R(8), 0, 0))
    ball((0.23, 0.3, 0.27), (0, 0.06, 0.98), RED(), (R(-25), 0, 0))
    ball((0.17, 0.42, 0.1), (0, -0.92, 0.98), RED(), (R(14), 0, 0))
    ball((0.15, 0.3, 0.06), (0, -0.66, 1.0), mat("seat", (0.04, 0.04, 0.05), 0.75), (R(6), 0, 0))
    ball((0.15, 0.1, 0.17), (0, 0.2, 1.2), mat("glass", (0.05, 0.08, 0.12), 0.05, 0.5), (R(-30), 0, 0))
    cyl(0.016, 0.66, (0, 0.0, 1.2), CHR(), (0, R(90), 0), 0.003)
    for s in (-1, 1):
        cyl(0.024, 0.13, (s * 0.3, 0.0, 1.2), BLK(), (0, R(90), 0), 0.006)
        cyl(0.022, 0.72, (s * 0.115, 0.08, 0.86), CHR(), (R(-10), 0, 0), 0.004)
        cyl(0.016, 0.16, (s * 0.27, -0.5, 0.52), BLK(), (0, R(90), 0), 0.004)
        box((0.02, 0.62, 0.05), (s * 0.1, -0.72, 0.56), CHR(), 0.008, (R(-4), 0, 0))
    box((0.1, 0.06, 0.06), (0, -1.3, 0.98), mat("tail", (1, 0.1, 0.05), 0.3, 0, 2.0), 0.02)

def skee():
    B = mat("body", (0.55, 0.06, 0.08), 0.4); W = mat("wood", (0.55, 0.38, 0.2), 0.45)
    box((0.78, 2.1, 0.8), (0, -0.45, 0.4), B, 0.03)
    plane(0.6, 2.0, (0, -0.45, 0.803), mat("lane", (0.25, 0.3, 0.32), 0.6), rot=(0, 0, 0))
    for s in (-1, 1):
        box((0.08, 2.1, 0.14), (s * 0.35, -0.45, 0.85), W, 0.025)
        prism([(0.58, 0.8), (1.5, 0.8), (1.5, 2.12), (1.22, 2.12), (0.58, 0.98)], s * 0.39, s * 0.36, B, 0.01)
    prism([(0.25, 0.80), (0.60, 0.80), (0.60, 0.93)], -0.3, 0.3, mat("lane", (0, 0, 0)), 0.0)
    box((0.78, 0.9, 0.8), (0, 1.05, 0.4), B, 0.03)
    sl = atan2(0.62, 0.88); L = hypot(0.62, 0.88); n = (-sin(sl), cos(sl)); c = (1.04, 1.21)
    box((0.72, L, 0.04), (0, c[0], c[1]), mat("board", (0.12, 0.14, 0.3), 0.6), 0.004, (sl, 0, 0))
    def on(u, x, h): return (x, c[0] + u * cos(sl) + n[0] * h, c[1] + u * sin(sl) + n[1] * h)
    RG = mat("rings", (0.92, 0.9, 0.85), 0.35)
    for u, x, r in ((-0.18, 0, 0.27), (-0.18, 0, 0.15), (0.18, 0, 0.1), (0.37, 0, 0.075), (0.36, -0.24, 0.07), (0.36, 0.24, 0.07)):
        torus(r, 0.022, on(u, x, 0.04), RG, (sl, 0, 0))
        if r < 0.2: cyl(r - 0.02, 0.006, on(u, x, 0.024), BLK(), (sl, 0, 0), 0)
    box((0.78, 0.3, 0.52), (0, 1.36, 1.86), BLK(), 0.02)
    plane(0.5, 0.18, (0, 1.208, 1.74), SCR()); plane(0.7, 0.2, (0, 1.208, 1.97), MRQ())
    for k in range(5): cyl(0.006, 0.74, (0, 0.6 + k * 0.16, 1.5 + k * 0.155), CHR(), (0, R(90), 0), 0, 8)
    box((0.3, 0.1, 0.12), (-0.18, -1.47, 0.6), BLK(), 0.01)
    for k in range(3): ball((0.04, 0.04, 0.04), (-0.26 + k * 0.082, -1.5, 0.6), W)
    box((0.2, 0.012, 0.26), (0.2, -1.502, 0.5), mat("metal_dark", (0.12, 0.12, 0.13), 0.45, 1.0), 0.004)

def hockey():
    B = mat("body", (0.05, 0.2, 0.6), 0.35)
    box((2.3, 1.2, 0.44), (0, 0, 0.56), B, 0.07)
    for sx in (-1, 1):
        for sy in (-1, 1): box((0.2, 0.2, 0.36), (sx * 0.92, sy * 0.42, 0.18), BLK(), 0.03); 
        box((0.09, 1.3, 0.1), (sx * 1.155, 0, 0.80), BLK(), 0.03)
        box((0.03, 0.34, 0.035), (sx * 1.115, 0, 0.775), mat("goal", (0.9, 0.1, 0.1), 0.4, 0, 1.5), 0.004)
        cyl(0.05, 0.02, (sx * 0.7, 0.1 * sx, 0.795), RED(), bevel=0.004); cyl(0.022, 0.06, (sx * 0.7, 0.1 * sx, 0.83), RED(), bevel=0.008)
    for sy in (-1, 1):
        box((2.4, 0.09, 0.1), (0, sy * 0.605, 0.80), BLK(), 0.03)
        cyl(0.03, 1.0, (0, sy * 0.63, 1.3), CHR(), bevel=0)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.782)); o = bpy.context.object; o.scale = (2.22, 1.12, 1); bpy.ops.object.transform_apply(scale=True); o.data.materials.append(mat("field", (0.92, 0.95, 1.0), 0.15, 0, 0.5))
    L = mat("lines", (0.1, 0.25, 0.9), 0.3)
    box((0.02, 1.12, 0.002), (0, 0, 0.784), L, 0); torus(0.2, 0.008, (0, 0, 0.782), L)
    cyl(0.035, 0.008, (0.25, -0.2, 0.788), mat("goal", (0, 0, 0)), bevel=0.002)
    box((0.3, 1.34, 0.26), (0, 0, 1.9), BLK(), 0.04)
    for sx in (-1, 1): plane(1.0, 0.18, (sx * 0.152, 0, 1.9), SCR(), rot=(R(90), 0, R(sx * 90)))
    box((0.2, 1.1, 0.02), (0, 0, 1.765), mat("lamp", (1, 0.95, 0.85), 0.3, 0, 3.0), 0.004)

def wheel():
    B = mat("body", (0.3, 0.05, 0.45), 0.35); G = mat("gold", (0.9, 0.65, 0.15), 0.25, 1.0)
    box((1.5, 0.9, 0.95), (0, 0, 0.475), B, 0.05)
    prism([(-0.45, 0.93), (-0.05, 0.93), (-0.05, 1.12)], -0.5, 0.5, BLK(), 0.01)
    a = atan2(0.19, 0.4); ball((0.11, 0.11, 0.06), (0, -0.25 - sin(a) * 0.02, 1.03 + cos(a) * 0.02), mat("button", (0.9, 0.08, 0.05), 0.25, 0, 0.8), (a, 0, 0))
    torus(0.12, 0.014, (0, -0.25, 1.028), CHR(), (a, 0, 0))
    box((1.1, 0.36, 0.5), (0, 0.27, 1.15), B, 0.03)
    cz = 2.0
    cyl(1.12, 0.36, (0, 0.27, cz), B, (R(90), 0, 0), 0.03, 64)
    torus(1.07, 0.035, (0, 0.085, cz), G, (R(90), 0, 0))
    wedges(1.0, 0.082, 0, cz, 16, [mat("wheel_a", (0.9, 0.1, 0.1), 0.35), mat("wheel_b", (0.98, 0.8, 0.1), 0.35), mat("wheel_c", (0.1, 0.5, 0.9), 0.35), mat("wheel_d", (0.95, 0.95, 0.9), 0.35)])
    cyl(0.14, 0.06, (0, 0.06, cz), G, (R(90), 0, 0), 0.015); ball((0.07, 0.04, 0.07), (0, 0.03, cz), RED())
    BU = mat("bulbs", (1, 0.85, 0.5), 0.3, 0, 4.0)
    for i in range(24):
        an = 2 * math.pi * i / 24; ball((0.028, 0.028, 0.028), (1.07 * cos(an), 0.05, cz + 1.07 * sin(an)), BU)
    for i in range(16):
        an = 2 * math.pi * i / 16; cyl(0.012, 0.05, (0.95 * cos(an), 0.06, cz + 0.95 * sin(an)), CHR(), (R(90), 0, 0), 0, 10)
    cyl(0.0, 0.2, (0, 0.03, cz + 0.98), RED(), (0, 0, 0), 0, 4, r2=0.07)
    plane(0.5, 0.2, (0, -0.452, 0.68), SCR()); box((0.3, 0.012, 0.03), (0, -0.452, 0.4), BLK(), 0.002)
    box((1.3, 0.03, 0.3), (0, 0.105, 0.98 + 0.0), mat("marquee_box", (0.02, 0.02, 0.03)), 0.006) ; plane(1.2, 0.24, (0, 0.088, 1.26), MRQ())

ALL = dict(dispenser=dispenser, upright=upright, pinball=pinball, racer=racer, moto=moto, skee=skee, hockey=hockey, wheel=wheel)
for name, fn in ALL.items():
    if ONLY and name not in ONLY: continue
    reset(); fn()
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.convert(target="MESH"); bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    xs = [v.co for v in o.data.vertices]; mn = [min(v[i] for v in xs) for i in range(3)]; mx = [max(v[i] for v in xs) for i in range(3)]
    print("DIM", name, [round(a, 3) for a in mn], [round(a, 3) for a in mx], "tris", sum(len(p.vertices) - 2 for p in o.data.polygons))
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, use_selection=True)
    size = max(mx[i] - mn[i] for i in range(3)); ctr = [(mn[i] + mx[i]) / 2 for i in range(3)]
    for tag, (dx, dy) in (("a", (-0.75, -1.0)), ("b", (1.0, 0.45))):
        cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); bpy.context.scene.collection.objects.link(cam)
        d = size * 1.7; cam.location = (ctr[0] + dx * d, ctr[1] + dy * d, ctr[2] + d * 0.45)
        dirv = [ctr[i] - cam.location[i] for i in range(3)]
        cam.rotation_euler = (atan2(hypot(dirv[0], dirv[1]), -dirv[2]), 0, atan2(dirv[1], dirv[0]) - math.pi / 2)
        sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); bpy.context.scene.collection.objects.link(sun); sun.data.energy = 3; sun.rotation_euler = cam.rotation_euler
        bpy.context.scene.camera = cam; bpy.context.scene.render.filepath = f"/tmp/l31/{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(sun)
