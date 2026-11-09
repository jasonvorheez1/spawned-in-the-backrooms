# Zenith Station kit, Blender pass: the hall rib (portal frame), swivel chair, workstation desk and the Z-7 sentinel drone.
# One script, four .glb files in /workspace/zenith/, a proof each in /tmp/zenith/. Slots are named for what the game mounts.
import bpy, bmesh, math, os
from mathutils import Vector
OUT, PROOF = "/workspace/zenith", "/tmp/zenith"
os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 16
    s.render.resolution_x = s.render.resolution_y = 560
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
MATS = {}
def mat(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m
def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o
def bevel(o, w=0.01, seg=2):
    md = o.modifiers.new("bv", "BEVEL"); md.width = w; md.segments = seg; md.limit_method = "ANGLE"; return o
def smooth(o, lv=2):
    md = o.modifiers.new("ss", "SUBSURF"); md.levels = lv; md.render_levels = lv
    for p in o.data.polygons: p.use_smooth = True
    return o
def box(name, size, loc, m, bw=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True); setmat(o, m); return bevel(o, bw) if bw else o
def cyl(name, r, d, loc, m, rot=(0, 0, 0), v=24, bw=0.004):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=v); o = bpy.context.object; o.name = name
    setmat(o, m); [setattr(p, "use_smooth", True) for p in o.data.polygons]
    return bevel(o, bw) if bw else o
def sph(name, r, loc, m, scale=(1, 1, 1), seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.name = name
    o.scale = scale; bpy.ops.object.transform_apply(scale=True); setmat(o, m); [setattr(p, "use_smooth", True) for p in o.data.polygons]; return o
def rod(name, a, b, r, m, v=12):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=v); o = bpy.context.object; o.name = name
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = d.to_track_quat("Z", "Y"); setmat(o, m)
    [setattr(p, "use_smooth", True) for p in o.data.polygons]; return o
def light_rig(target=(0, 0, 1)):
    for i, (loc, e) in enumerate([((3, -4, 4), 900), ((-4, 3, 3), 400), ((0, 4, -1), 150)]):
        L = bpy.data.lights.new(f"L{i}", "AREA"); L.energy = e; L.size = 3
        o = bpy.data.objects.new(f"L{i}", L); bpy.context.scene.collection.objects.link(o); o.location = loc
        o.rotation_mode = "QUATERNION"; o.rotation_quaternion = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y")
def shoot(name, loc, target, lens=40):
    c = bpy.data.cameras.new("cam"); c.lens = lens; o = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y")
    s = bpy.context.scene; s.camera = o; s.render.filepath = f"{PROOF}/{name}.png"; bpy.ops.render.render(write_still=True)
def export(name):
    dg = bpy.context.evaluated_depsgraph_get()
    tris = sum(len(o.evaluated_get(dg).data.loop_triangles) for o in bpy.context.scene.objects if o.type == "MESH")
    for o in bpy.context.scene.objects: o.select_set(o.type == "MESH")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True, use_selection=True)
    print(f"EXPORT {name} tris={tris}")

# ---------- 1. hall rib: a portal frame hugging the 4 m x 3.2 m hall, rounded haunches, a light line under the crown ----------
def rib():
    reset()
    panel, steel, light, seam = mat("panel", (0.86, 0.86, 0.84), 0.5), mat("steel", (0.55, 0.57, 0.6), 0.35, 0.9), mat("light", (1, 1, 1), 0.3, 0, (1, 0.97, 0.9), 6), mat("seam", (0.03, 0.03, 0.035), 0.7, 0.3)
    hw, H, R = 2.0, 3.2, 0.75; pts = []
    for i in range(9): z = 0.2 + (H - R - 0.2) * i / 8; pts.append(((-hw, z), (1, 0)))
    for i in range(1, 13):
        a = math.pi - (math.pi / 2) * i / 12; c = (-hw + R, H - R); pts.append(((c[0] + R * math.cos(a), c[1] + R * math.sin(a)), (-math.cos(a), -math.sin(a))))
    for i in range(1, 8): x = -hw + R + (2 * (hw - R)) * i / 8; pts.append(((x, H), (0, -1)))
    for i in range(0, 13):
        a = math.pi / 2 - (math.pi / 2) * i / 12; c = (hw - R, H - R); pts.append(((c[0] + R * math.cos(a), c[1] + R * math.sin(a)), (-math.cos(a), -math.sin(a))))
    for i in range(1, 9): z = H - R - (H - R - 0.2) * i / 8; pts.append(((hw, z), (-1, 0)))
    prof = [(0, -0.17), (0.1, -0.17), (0.135, -0.135), (0.135, 0.135), (0.1, 0.17), (0, 0.17)]
    bm = bmesh.new(); rings = []
    for (x, z), (nx, nz) in pts: rings.append([bm.verts.new((x + nx * n, y, z + nz * n)) for n, y in prof])
    for a, b in zip(rings, rings[1:]):
        for j in range(len(prof) - 1): bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new("rib"); bm.to_mesh(me); o = bpy.data.objects.new("rib", me); bpy.context.scene.collection.objects.link(o); setmat(o, panel)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
    # a seam groove on each face of the frame, a brushed-steel shoe at each foot, bolts, and the crown's light line
    for sx in (-1, 1):
        box(f"shoe{sx}", (0.17, 0.4, 0.22), (sx * (hw - 0.085), 0, 0.11), steel, 0.015)
        box(f"seamL{sx}", (0.005, 0.33, 0.01), (sx * (hw - 0.137), 0, 1.3), seam, 0)
        for z in (0.45, 2.1): 
            for y in (-0.12, 0.12): cyl(f"bolt{sx}{z}{y}", 0.012, 0.012, (sx * (hw - 0.138), y, z), steel, (0, math.pi / 2, 0), 10, 0)
        box(f"panelbox{sx}", (0.06, 0.16, 0.22), (sx * (hw - 0.16), 0, 1.45), seam, 0.006)
        box(f"panelled{sx}", (0.012, 0.03, 0.03), (sx * (hw - 0.195), 0, 1.5), light, 0)
    box("strip", (2 * (hw - R) + 0.2, 0.12, 0.02), (0, 0, H - 0.14), light, 0.004)
    box("stripframe", (2 * (hw - R) + 0.3, 0.2, 0.012), (0, 0, H - 0.132), steel, 0.003)
    light_rig((0, 0, 1.6)); shoot("rib", (2.6, -5.5, 1.7), (0, 0, 1.6), 30); export("rib")

# ---------- 2. swivel chair (front faces Blender -Y) ----------
def chair():
    reset()
    fab, plas, steel = mat("fabric", (0.1, 0.12, 0.14), 0.95), mat("plastic", (0.05, 0.05, 0.055), 0.55), mat("steel", (0.6, 0.62, 0.65), 0.3, 0.9)
    for i in range(5):
        a = i * 2 * math.pi / 5; x, y = math.cos(a) * 0.29, math.sin(a) * 0.29
        o = rod(f"leg{i}", (0, 0, 0.1), (x, y, 0.075), 0.022, plas); 
        sph(f"caster{i}", 0.032, (x, y, 0.035), plas, (1, 0.7, 1), 16)
    cyl("hub", 0.05, 0.06, (0, 0, 0.1), plas)
    cyl("gas", 0.022, 0.28, (0, 0, 0.27), steel); cyl("gasboot", 0.032, 0.12, (0, 0, 0.18), plas)
    box("mech", (0.2, 0.22, 0.05), (0, 0, 0.41), plas, 0.01)
    s = box("seat", (0.5, 0.48, 0.09), (0, -0.02, 0.475), fab, 0); bevel(s, 0.035, 4)
    box("seatshell", (0.48, 0.46, 0.025), (0, -0.02, 0.432), plas, 0.01)
    for sx in (-1, 1):
        rod(f"armpost{sx}", (sx * 0.24, 0.05, 0.44), (sx * 0.26, 0.04, 0.66), 0.016, plas)
        a = box(f"armpad{sx}", (0.07, 0.26, 0.03), (sx * 0.26, 0.0, 0.67), plas, 0); bevel(a, 0.012, 3)
    rod("spine", (0, 0.2, 0.44), (0, 0.25, 0.62), 0.03, plas)
    bk = box("back", (0.46, 0.08, 0.5), (0, 0.25, 0.9), fab, 0)
    bd = bk.modifiers.new("bend", "SIMPLE_DEFORM"); bd.deform_method = "BEND"; bd.angle = math.radians(-25); bd.deform_axis = "Z"
    bevel(bk, 0.03, 4)
    box("backshell", (0.42, 0.03, 0.46), (0, 0.29, 0.9), plas, 0.01)
    light_rig((0, 0, 0.5)); shoot("chair", (1.2, -1.5, 1.2), (0, 0, 0.5), 40); export("chair")

# ---------- 3. workstation: the user side faces Blender -Y; two monitors on the back edge ----------
def desk():
    reset()
    top, frame, steel, screen, bezel, keys = mat("top", (0.82, 0.83, 0.82), 0.4), mat("frame", (0.25, 0.27, 0.3), 0.5, 0.6), mat("steel", (0.6, 0.62, 0.65), 0.3, 0.9), mat("screen", (0.02, 0.04, 0.05), 0.2, 0, (0.55, 0.85, 0.95), 2), mat("bezel", (0.05, 0.05, 0.06), 0.4), mat("keys", (0.12, 0.12, 0.13), 0.6)
    t = box("top", (2.4, 0.8, 0.035), (0, 0, 0.745), top, 0); bevel(t, 0.012, 3)
    box("edge", (2.4, 0.02, 0.045), (0, -0.405, 0.74), frame, 0.006)
    for sx in (-1, 1):
        box(f"ped{sx}", (0.42, 0.72, 0.7), (sx * 0.96, 0.02, 0.37), frame, 0.012)
        for k in range(3):
            box(f"drw{sx}{k}", (0.38, 0.012, 0.2), (sx * 0.96, -0.345, 0.17 + k * 0.215), top, 0.004)
            box(f"pull{sx}{k}", (0.14, 0.015, 0.012), (sx * 0.96, -0.355, 0.24 + k * 0.215), steel, 0.003)
        box(f"foot{sx}", (0.44, 0.74, 0.03), (sx * 0.96, 0.02, 0.015), steel, 0.004)
    box("modesty", (1.5, 0.025, 0.5), (0, 0.32, 0.45), frame, 0.006)
    box("cabletray", (1.5, 0.12, 0.05), (0, 0.28, 0.66), steel, 0.004)
    for sx in (-0.42, 0.42):
        box(f"mbase{sx}", (0.22, 0.16, 0.012), (sx, 0.22, 0.769), bezel, 0.004)
        rod(f"mpost{sx}", (sx, 0.24, 0.77), (sx, 0.24, 1.0), 0.018, steel)
        m = box(f"mon{sx}", (0.6, 0.035, 0.36), (sx, 0.2, 1.08), bezel, 0); bevel(m, 0.01, 3)
        box(f"scr{sx}", (0.56, 0.004, 0.32), (sx, 0.181, 1.08), screen, 0)
    k = box("kbd", (0.44, 0.15, 0.02), (0, -0.15, 0.772), keys, 0.004)
    box("mouse", (0.06, 0.1, 0.025), (0.34, -0.14, 0.775), keys, 0.01)
    box("tower", (0.2, 0.45, 0.45), (-0.96, 0.05, 0.98), frame, 0.008)
    box("towerled", (0.012, 0.004, 0.08), (-0.96, -0.177, 1.1), screen, 0)
    light_rig((0, 0, 0.8)); shoot("desk", (1.9, -2.6, 1.8), (0, 0, 0.8), 32); export("desk")

# ---------- 4. Z-7 sentinel drone: front (the lens) faces Blender -Y; origin under the prongs ----------
def drone():
    reset()
    shell, dark, steel, lens, thrust, arc = mat("shell", (0.88, 0.88, 0.86), 0.35, 0.05), mat("dark", (0.04, 0.045, 0.05), 0.45, 0.5), mat("steel", (0.6, 0.62, 0.65), 0.3, 0.9), mat("lens", (0.3, 0.0, 0.0), 0.1, 0, (1, 0.12, 0.06), 12), mat("thrust", (0.1, 0.2, 0.3), 0.3, 0, (0.4, 0.8, 1), 6), mat("arc", (0.4, 0.6, 1), 0.2, 0, (0.5, 0.75, 1), 8)
    Z = 0.5
    body = sph("body", 0.28, (0, 0, Z), shell, (1, 1, 0.82), 48)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.284, minor_radius=0.03, location=(0, 0, Z), major_segments=48, minor_segments=10); tor = bpy.context.object; setmat(tor, dark); [setattr(p, "use_smooth", True) for p in tor.data.polygons]
    cap = sph("cap", 0.12, (0, 0, Z + 0.21), dark, (1, 1, 0.45), 32)
    cyl("eyehouse", 0.105, 0.12, (0, -0.24, Z), dark, (math.pi / 2, 0, 0), 32, 0.01)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.098, minor_radius=0.012, location=(0, -0.3, Z), rotation=(math.pi / 2, 0, 0), major_segments=32, minor_segments=8); setmat(bpy.context.object, steel)
    sph("lens", 0.072, (0, -0.29, Z), lens, (1, 0.6, 1), 32)
    for sx in (-1, 1):
        rod(f"strut{sx}", (sx * 0.22, 0, Z), (sx * 0.38, 0.02, Z - 0.02), 0.028, steel)
        cyl(f"pod{sx}", 0.075, 0.26, (sx * 0.42, 0.02, Z - 0.02), shell, (math.pi / 2, 0, 0), 24, 0.02)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.072, minor_radius=0.014, location=(sx * 0.42, 0.15, Z - 0.02), rotation=(math.pi / 2, 0, 0), major_segments=24, minor_segments=8); setmat(bpy.context.object, dark)
        cyl(f"nozzle{sx}", 0.055, 0.02, (sx * 0.42, 0.16, Z - 0.02), thrust, (math.pi / 2, 0, 0), 20, 0)
        cyl(f"vent{sx}", 0.05, 0.02, (sx * 0.42, 0.02, Z - 0.1), thrust, (0, 0, 0), 20, 0)
        rod(f"prong{sx}", (sx * 0.035, -0.04, Z - 0.37), (sx * 0.05, -0.08, Z - 0.47), 0.008, steel, 8)
        sph(f"tip{sx}", 0.014, (sx * 0.05, -0.08, Z - 0.475), arc, (1, 1, 1), 12)
    rod("arm", (0, 0, Z - 0.22), (0, -0.03, Z - 0.37), 0.024, steel)
    cyl("wrist", 0.04, 0.05, (0, -0.035, Z - 0.37), dark, (0, 0, 0), 16, 0.005)
    rod("antenna", (0.08, 0.1, Z + 0.2), (0.14, 0.16, Z + 0.42), 0.006, steel, 8); sph("antip", 0.014, (0.14, 0.16, Z + 0.42), lens, (1, 1, 1), 12)
    for i in range(6):
        a = i * math.pi / 3 + 0.4; box(f"panelseam{i}", (0.004, 0.06, 0.004), (math.cos(a) * 0.27, math.sin(a) * 0.27, Z + 0.1), dark, 0)
    light_rig((0, 0, Z)); shoot("drone", (0.9, -1.2, 0.95), (0, 0, Z), 45); export("drone")

for f in (rib, chair, desk, drone): f()
