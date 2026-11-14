# Level 114 bedroom kit: dresser, kid's desk, desk chair, toy chest, rag rug. One file each, origin at bottom centre, front = -Y (exports +z).
import bpy, bmesh, math, os, random
from mathutils import Vector, noise
random.seed(1140)
OUT = "/workspace/world/art/l114kit"; os.makedirs("/tmp/kit", exist_ok=True)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough=0.6, grain=False, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if grain:
        nt = m.node_tree; w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 4; w.inputs["Distortion"].default_value = 7; w.bands_direction = "Z"
        r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = (col[0]*0.7, col[1]*0.7, col[2]*0.7, 1); r.color_ramp.elements[1].color = (*col, 1)
        nt.links.new(w.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    return m
def box(sx, sy, sz, x, y, z, m, bev=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.object; o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = 3; o.data.materials.append(m); return o
def knob(x, y, z, m, r=0.018):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=12, ring_count=8, location=(x, y, z)); o = bpy.context.object; o.scale.y = 0.6; o.data.materials.append(m); return o
def leg(r, h, x, y, m, taper=0.7):
    bpy.ops.mesh.primitive_cone_add(radius1=r * taper, radius2=r, depth=h, vertices=12, location=(x, y, h / 2)); o = bpy.context.object; o.data.materials.append(m)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.004; b.segments = 2; return o
def finish(name, parts):
    for o in parts:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); ob = bpy.context.object; ob.name = name
    mn = min((ob.matrix_world @ v.co).z for v in ob.data.vertices); ob.location.z -= mn; bpy.ops.object.transform_apply(location=True)
    bpy.ops.object.shade_auto_smooth() if hasattr(bpy.ops.object, "shade_auto_smooth") else None
    print(name, "dims", tuple(round(x, 3) for x in ob.dimensions), "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons))
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 480
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    bpy.ops.object.light_add(type="AREA", location=(1.5, -2.5, 2.5)); bpy.context.object.data.energy = 300; bpy.context.object.data.size = 3
    d = max(ob.dimensions) * 1.7 + 0.6
    bpy.ops.object.camera_add(location=(d * 0.6, -d, d * 0.55)); cam = bpy.context.object; sc.camera = cam
    cam.rotation_euler = (Vector((0, 0, ob.dimensions.z * 0.45)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/tmp/kit/{name}.png"; bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=True)

# dresser: 1.0 w, 0.46 d, 0.86 h, 2 small + 3 wide drawers, kicked plinth, top overhang, one drawer pulled open a crack
reset(); WOOD = mat("pine", (0.55, 0.36, 0.2), 0.5, True); BR = mat("brass", (0.75, 0.6, 0.3), 0.3, metal=0.9)
P = [box(1.0, 0.46, 0.06, 0, 0, 0.83, WOOD, 0.012), box(0.96, 0.42, 0.72, 0, 0.02, 0.44, WOOD), box(0.94, 0.38, 0.08, 0, 0.03, 0.04, WOOD)]
rows = [(0.68, [(-0.235, 0.44), (0.235, 0.44)]), (0.5, [(0, 0.9)]), (0.33, [(0, 0.9)]), (0.16, [(0, 0.9)])]
for i, (z, ds) in enumerate(rows):
    for x, w in ds:
        out = 0.06 if (i == 2) else 0.0
        P.append(box(w, 0.025, 0.15, x, -0.205 - out, z, WOOD, 0.006))
        for kx in ((x - w * 0.25, x + w * 0.25) if w > 0.5 else (x,)): P.append(knob(kx, -0.225 - out, z, BR))
finish("dresser114", P)

# kid's desk: 0.9 w, 0.5 d, 0.66 h, a drawer, a hutch shelf at the back
reset(); WOOD = mat("pine", (0.62, 0.42, 0.24), 0.5, True); BR = mat("brass", (0.75, 0.6, 0.3), 0.3, metal=0.9)
P = [box(0.9, 0.5, 0.035, 0, 0, 0.64, WOOD, 0.01), box(0.86, 0.02, 0.12, 0, 0.22, 0.56, WOOD), box(0.5, 0.42, 0.1, 0.15, 0, 0.56, WOOD), knob(0.15, -0.215, 0.56, BR)]
for x in (-0.42, 0.42):
    for y in (-0.22, 0.22): P.append(leg(0.022, 0.62, x, y, WOOD, 0.8))
P += [box(0.9, 0.2, 0.025, 0, 0.15, 0.9, WOOD), box(0.025, 0.2, 0.26, -0.44, 0.15, 0.78, WOOD), box(0.025, 0.2, 0.26, 0.44, 0.15, 0.78, WOOD), box(0.9, 0.015, 0.26, 0, 0.245, 0.78, WOOD)]
finish("desk114", P)

# chair: seat 0.38 at 0.42 h, curved spindle back
reset(); WOOD = mat("pine", (0.6, 0.4, 0.22), 0.5, True)
P = [box(0.38, 0.36, 0.03, 0, 0, 0.42, WOOD, 0.01)]
for x in (-0.16, 0.16):
    for y in (-0.15, 0.15): P.append(leg(0.016, 0.41, x, y, WOOD, 0.75))
for x in (-0.16, 0.16): P.append(box(0.025, 0.025, 0.42, x, 0.16, 0.64, WOOD, 0.006))
P.append(box(0.36, 0.03, 0.08, 0, 0.165, 0.82, WOOD, 0.01))
for x in (-0.08, 0, 0.08): P.append(box(0.012, 0.012, 0.3, x, 0.165, 0.62, WOOD, 0.004))
finish("chair114", P)

# toy chest: 0.7 x 0.4 x 0.42, lid slightly open, painted blue with a stripe
reset(); BLUE = mat("paint", (0.18, 0.3, 0.55), 0.6); WH = mat("stripe", (0.85, 0.8, 0.65), 0.6); BR = mat("brass", (0.75, 0.6, 0.3), 0.3, metal=0.9)
P = [box(0.7, 0.4, 0.38, 0, 0, 0.19, BLUE, 0.015), box(0.71, 0.405, 0.05, 0, 0, 0.27, WH, 0.01)]
P.append(box(0.72, 0.42, 0.05, 0, 0, 0.405, BLUE, 0.015))
P.append(knob(0, -0.21, 0.31, BR, 0.022))
finish("toychest114", P)

# braided rag rug: oval 1.5 x 1.0, concentric coils in faded colours, slight curl at the edge
reset(); cols = [(0.55, 0.25, 0.2), (0.75, 0.62, 0.42), (0.35, 0.42, 0.55), (0.5, 0.45, 0.3), (0.62, 0.35, 0.3)]
mats = [mat(f"rag{i}", c, 0.95) for i, c in enumerate(cols)]
P = []
n = 9
for i in range(n):
    s = 1 - i / n
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5 * s, minor_radius=0.03, major_segments=64, minor_segments=8, location=(0, 0, 0.022))
    t = bpy.context.object; t.scale = (1.5, 1.0, 1.0); bpy.ops.object.transform_apply(scale=True); t.data.materials.append(mats[i % len(mats)])
    for v in t.data.vertices: v.co.z += noise.noise(Vector((v.co.x * 5, v.co.y * 5, i))) * 0.004 + (0.006 if i == 0 else 0)
    P.append(t)
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=0.06, fill_type="NGON", location=(0, 0, 0.02)); c = bpy.context.object; c.scale = (1.5, 1, 1); bpy.ops.object.transform_apply(scale=True); c.data.materials.append(mats[0]); P.append(c)
finish("rug114", P)
