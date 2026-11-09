# Level 1, the Level 2 entrance dressing: hazard-painted door surround, cone, drum, toolbox, pallet + cartons,
# disconnect box, door mat, lamp guard, valve wheel. One glb per prop; Blender X = world X, Blender -Y = world Z.
# blender -b --factory-startup --python-exit-code 1 --python art/level1/props.py
import bpy, bmesh, math, random, os
from mathutils import Vector
exec(open(os.path.join(os.path.dirname(__file__), "build.py")).read().split("# ---------- 1.")[0])
R = random.Random(5)
def bolts(objs, xs, ys, zs, m, r=0.009):
    for x in xs:
        for y in ys:
            for z in zs: objs.append(cyl("bolt", (x, y, z), r, 0.012, m, "X", 6))
def finish(objs, name, ground=True):
    o = join(objs, name)
    if ground: ground_origin(o)
    bpy.ops.object.shade_auto_smooth(angle=0.7) if hasattr(bpy.ops.object, "shade_auto_smooth") else None
    return o
ALL = {}
reset()
haz = mat("hazard_paint", (1, 1, 1), 0.6, 0.25, img=TEX + "hazard.png")
steel = mat("steel_dark", (0.14, 0.15, 0.15), 0.45, 0.85)
# 1. hazard posts / lintel: steel box section with a welded base plate and bolts
p = cube("post", (0, 0, 1.25), (0.18, 0.2, 2.5), haz, 0.012, 2); boxuv(p, 0.5)
P = [p, cube("plate", (0, 0, 0.006), (0.24, 0.26, 0.012), steel, 0.004)]
bolts(P, [-0.095], [-0.06, 0.06], [0.4, 1.25, 2.1], steel)
ALL["l1_hazpost"] = finish(P, "l1_hazpost")
bpy.ops.object.select_all(action="DESELECT")
l = cube("lintel", (0, 0, 0.12), (0.18, 1.68, 0.24), haz, 0.012, 2); boxuv(l, 0.5)
P = [l]; bolts(P, [-0.095], [-0.7, 0, 0.7], [0.12], steel)
ALL["l1_hazlintel"] = finish(P, "l1_hazlintel")
# 2. traffic cone on its square base, two reflective collars
orange = mat("cone_orange", (0.9, 0.22, 0.04), 0.55); refl = mat("reflective_band", (0.85, 0.85, 0.82), 0.3, 0.2); black = mat("rubber_base", (0.04, 0.04, 0.04), 0.9)
b = cube("base", (0, 0, 0.015), (0.34, 0.34, 0.03), black, 0.02, 3)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.15, radius2=0.022, depth=0.47, location=(0, 0, 0.265)); c = bpy.context.object; bpy.ops.object.shade_smooth(); c.data.materials.append(orange)
P = [b, c]
for z, h in ((0.33, 0.06), (0.43, 0.04)):
    r = 0.15 + (0.022 - 0.15) * ((z - 0.03) / 0.47) + 0.003
    P.append(cyl("band", (0, 0, z), r, h, refl, "Z", 32))
ALL["l1_cone"] = finish(P, "l1_cone")
# 3. 55-gallon drum: shell, chimes, rolling hoops, lid bungs
dm = mat("drum_paint", (1, 1, 1), 0.5, 0.45, img=TEX + "drum.png")
P = [cyl("shell", (0, 0, 0.44), 0.285, 0.86, dm, "Z", 40)]
for z in (0.012, 0.868): 
    bpy.ops.mesh.primitive_torus_add(major_radius=0.285, minor_radius=0.012, major_segments=40, minor_segments=8, location=(0, 0, z)); t = bpy.context.object; bpy.ops.object.shade_smooth(); t.data.materials.append(dm); P.append(t)
for z in (0.3, 0.58):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.287, minor_radius=0.014, major_segments=40, minor_segments=8, location=(0, 0, z)); t = bpy.context.object; t.scale.z = 0.6; bpy.ops.object.shade_smooth(); t.data.materials.append(dm); P.append(t)
P.append(cyl("bung1", (0.17, 0, 0.87), 0.03, 0.02, steel, "Z", 12)); P.append(cyl("bung2", (-0.19, 0.04, 0.87), 0.02, 0.02, steel, "Z", 12))
ALL["l1_drum"] = finish(P, "l1_drum")
# 4. toolbox: red steel body, lid, carry handle, two latches
red = mat("toolbox_red", (0.55, 0.05, 0.03), 0.4, 0.6); chrome = mat("chrome", (0.75, 0.75, 0.72), 0.25, 1.0)
P = [cube("body", (0, 0, 0.09), (0.5, 0.24, 0.18), red, 0.01, 2), cube("lid", (0, 0, 0.205), (0.505, 0.245, 0.05), red, 0.018, 3)]
bpy.ops.mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.009, major_segments=24, minor_segments=8, location=(0, 0, 0.23), rotation=(math.pi / 2, 0, 0)); h = bpy.context.object; bpy.ops.object.shade_smooth(); h.data.materials.append(black); P.append(h)
for x in (-0.17, 0.17): P.append(cube("latch", (x, -0.124, 0.175), (0.04, 0.012, 0.05), chrome, 0.003))
ALL["l1_toolbox"] = finish(P, "l1_toolbox")
# 5. pallet: 7 deck boards across three stringers, 3 bottom boards
wood = mat("pallet_wood", (0.42, 0.31, 0.19), 0.85); wood2 = mat("pallet_wood_grey", (0.33, 0.28, 0.22), 0.9)
P = []
for i, y in enumerate([-0.6 + k * 0.2 for k in range(7)]): P.append(cube("deck", (R.uniform(-0.005, 0.005), y, 0.13), (0.8, 0.095, 0.02), wood if i % 3 else wood2, 0.003))
for x in (-0.36, 0, 0.36): P.append(cube("stringer", (x, 0, 0.07), (0.07, 1.3, 0.1), wood, 0.003))
for y in (-0.6, 0, 0.6): P.append(cube("bottom", (0, y, 0.01), (0.8, 0.1, 0.02), wood2, 0.003))
ALL["l1_pallet"] = finish(P, "l1_pallet")
# 6. cartons: taped kraft boxes, flap seam on top
card = mat("cardboard", (1, 1, 1), 0.92, img=TEX + "cardboard.png"); tape = mat("tape", (0.62, 0.5, 0.33), 0.35)
for name, hgt in (("l1_carton_a", 0.45), ("l1_carton_b", 0.35)):
    bx = cube("box", (0, 0, hgt / 2), (0.55, 0.5, hgt - 0.002), card, 0.008, 2); boxuv(bx, hgt)
    P = [bx, cube("seam", (0, 0, hgt - 0.001), (0.552, 0.004, 0.003), black, 0), cube("tape", (0, 0, hgt), (0.553, 0.06, 0.002), tape, 0),
         cube("tape_f", (0, -0.25, hgt - 0.05), (0.553 * 0 + 0.06, 0.003, 0.1), tape, 0), cube("tape_b", (0, 0.25, hgt - 0.05), (0.06, 0.003, 0.1), tape, 0)]
    ALL[name] = finish(P, name)
# 7. fused disconnect: grey enclosure, door seam, side lever, 480V plate on the -X face
grey = mat("enclosure_grey", (0.42, 0.44, 0.42), 0.55, 0.5); lab = mat("label_480v", (1, 1, 1), 0.6, img=TEX + "label480.png")
P = [cube("box", (0, 0, 0.25), (0.22, 0.32, 0.5), grey, 0.01), cube("door", (-0.112, 0, 0.25), (0.008, 0.29, 0.46), grey, 0.004)]
bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.1175, 0, 0.32), rotation=(math.pi / 2, 0, -math.pi / 2)); pl = bpy.context.object; pl.scale = (0.14, 0.14, 1); bpy.ops.object.transform_apply(scale=True, rotation=True); pl.data.materials.append(lab); P.append(pl)
P.append(cube("lever_pivot", (0, -0.17, 0.3), (0.06, 0.03, 0.06), steel, 0.005)); P.append(cube("lever", (0, -0.2, 0.22), (0.025, 0.025, 0.18), red, 0.006))
ALL["l1_disconnect"] = finish(P, "l1_disconnect")
# 8. ribbed rubber door mat
rub = mat("mat_rubber", (0.07, 0.07, 0.065), 0.85)
P = [cube("mat", (0, 0, 0.004), (0.7, 1.5, 0.008), rub, 0.004)]
for k in range(14): P.append(cube("rib", (0, -0.68 + k * 0.105, 0.011), (0.64, 0.03, 0.007), rub, 0.002))
ALL["l1_mat"] = finish(P, "l1_mat")
# 9. bulkhead lamp guard: wire cage around the bulb (origin at bulb centre), arm back to the wall at +X
wire = mat("cage_wire", (0.1, 0.1, 0.1), 0.5, 0.8)
P = []
for a in range(4):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.006, major_segments=24, minor_segments=6, location=(0, 0, 0), rotation=(0, math.pi / 2, a * math.pi / 4)); t = bpy.context.object; t.data.materials.append(wire); P.append(t)
bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.007, major_segments=24, minor_segments=6, location=(0, 0, 0)); t = bpy.context.object; t.data.materials.append(wire); P.append(t)
P.append(cyl("socket", (0, 0, 0.13), 0.05, 0.07, steel, "Z", 16)); P.append(cube("arm", (0.17, 0, 0.17), (0.34, 0.03, 0.03), steel, 0.004)); P.append(cube("wallplate", (0.34, 0, 0.17), (0.012, 0.12, 0.16), steel, 0.004))
ALL["l1_lampguard"] = finish(P, "l1_lampguard", ground=False)
# 10. valve handwheel: rim, five spokes, hub, axis along X (origin at the hub)
vred = mat("valve_red", (0.6, 0.05, 0.03), 0.5, 0.5)
bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.016, major_segments=32, minor_segments=10, location=(0, 0, 0), rotation=(0, math.pi / 2, 0)); rim = bpy.context.object; bpy.ops.object.shade_smooth(); rim.data.materials.append(vred)
P = [rim, cyl("hub", (0, 0, 0), 0.03, 0.05, vred, "X", 16), cyl("nut", (-0.03, 0, 0), 0.016, 0.02, steel, "X", 6)]
for k in range(5):
    a = k * 2 * math.pi / 5; bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.008, depth=0.15, location=(0, math.cos(a) * 0.085, math.sin(a) * 0.085), rotation=(a - math.pi / 2, 0, 0)); s = bpy.context.object; s.data.materials.append(vred); P.append(s)
ALL["l1_valve"] = finish(P, "l1_valve", ground=False)
for n, o in ALL.items(): export(o, n)
# proof: lay them out
sc = scene_setup(None)
for i, (n, o) in enumerate(ALL.items()):
    o.location = ((i % 4) * 1.4 - 2.1, (i // 4) * 1.6, 0 if n not in ("l1_lampguard", "l1_valve") else 0.4)
proof(sc, "props", [((-2.5, -5.5, 2.6), (0, 1.2, 0.5)), ((3.5, 6, 2.2), (0, 1.2, 0.5))])
