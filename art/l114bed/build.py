# Level 114's childhood bed: a pine kid's single, sculpted. Head at +Y, foot at -Y (Blender front, exports +z).
# Posts with rounded caps, slatted head- and footboards, side rails, a sagging mattress, a rumpled duvet thrown back, a dented pillow.
import bpy, bmesh, math, random
from mathutils import Vector, noise
random.seed(114)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
W, L = 1.0, 2.0          # outer width, length (m)
def mat(name, col, rough, bump=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; return m
PINE = mat("pine", (0.62, 0.42, 0.22), 0.55); SHEET = mat("sheet", (0.78, 0.76, 0.70), 0.9)
DUVET = mat("duvet", (0.33, 0.38, 0.47), 0.85); PILLOW = mat("pillow", (0.86, 0.84, 0.78), 0.9)
# pine grain: wave texture into colour
nt = PINE.node_tree; w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 3; w.inputs["Distortion"].default_value = 6; w.wave_type = "BANDS"; w.bands_direction = "Z"
r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = (0.50, 0.32, 0.15, 1); r.color_ramp.elements[1].color = (0.70, 0.50, 0.28, 1)
nt.links.new(w.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
def box(name, sx, sy, sz, x, y, z, m, bev=0.008, seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True); b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = seg; o.data.materials.append(m); return o
def cyl(name, r_, h, x, y, z, m):
    bpy.ops.mesh.primitive_cylinder_add(radius=r_, depth=h, vertices=16, location=(x, y, z)); o = bpy.context.object; o.name = name; o.data.materials.append(m)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.006; b.segments = 2; return o
parts = []
P = 0.06  # post section
for sx in (-1, 1):
    for sy, hgt in ((1, 0.95), (-1, 0.72)):
        x, y = sx * (W / 2 - P / 2), sy * (L / 2 - P / 2)
        parts.append(box("post", P, P, hgt - 0.03, x, y, (hgt - 0.03) / 2, PINE))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.038, segments=16, ring_count=8, location=(x, y, hgt - 0.03)); c = bpy.context.object; c.scale.z = 0.7; c.data.materials.append(PINE); parts.append(c)
# side rails
for sx in (-1, 1): parts.append(box("rail", 0.03, L - 2 * P, 0.14, sx * (W / 2 - 0.035), 0, 0.30, PINE))
# head and foot boards: top and bottom rails + slats
for sy, top in ((1, 0.86), (-1, 0.64)):
    y = sy * (L / 2 - P / 2)
    parts.append(box("topRail", W - 2 * P, 0.035, 0.07, 0, y, top, PINE)); parts.append(box("lowRail", W - 2 * P, 0.035, 0.06, 0, y, 0.42, PINE))
    n = 7
    for i in range(n):
        x = -W / 2 + P + (i + 0.5) * (W - 2 * P) / n
        parts.append(box("slat", 0.045, 0.022, top - 0.45 - 0.035, x, y, (top + 0.45) / 2 - 0.0, PINE, 0.005))
# mattress: subdivided slab, centre sagging
def soft(name, sx, sy, sz, loc, m, sub=3, sag=0.0, rumple=0.0, nscale=4.0):
    # a flat-cut slab (not a subsurf blob): cube, even grid cuts, rounded edges, then the sag and the rumple
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("bv", "BEVEL"); bv.width = min(sz * 0.45, 0.05); bv.segments = 4; bpy.ops.object.modifier_apply(modifier="bv")
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True); bm.to_mesh(o.data); bm.free()
    for v in o.data.vertices:
        c = v.co; u = max(-1, min(1, c.x / (sx / 2))); t = max(-1, min(1, c.y / (sy / 2)))
        if c.z > 0: c.z -= sag * (1 - u * u) * (1 - t * t)
        if rumple: c.z += noise.noise(Vector((c.x * nscale, c.y * nscale, 3.0))) * rumple * (1 if c.z > 0 else 0.3)
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); print("part", name, tuple(round(x, 3) for x in o.dimensions)); return o
parts.append(soft("mattress", W - 0.1, L - 0.14, 0.2, (0, 0, 0.47), SHEET, sub=3, sag=0.03, rumple=0.006))
# duvet: thin sheet over the lower 60 %, thrown back fold at the head end, drapes over the sides
bpy.ops.mesh.primitive_grid_add(x_subdivisions=40, y_subdivisions=60, size=1, location=(0, 0, 0)); d = bpy.context.object; d.name = "duvet"
for v in d.data.vertices:
    x = v.co.x * (W + 0.1); y = v.co.y * 1.25 - 0.32; ax = abs(x); top = 0.62
    z = top if ax < (W - 0.1) / 2 else top - (ax - (W - 0.1) / 2) * 3.2   # drape over the edges
    z = max(z, 0.40)
    if y > 0.22: yy = y - 0.22; y = 0.22 - yy * 0.35; z = top + 0.05 + 0.03 * math.sin(yy * 9)   # folded back on itself
    n = noise.noise(Vector((x * 3, y * 3, 1.7))); z += n * 0.035 + 0.015 * math.sin(x * 14 + y * 5)
    v.co = Vector((x, y, z))
sol = d.modifiers.new("t", "SOLIDIFY"); sol.thickness = 0.03; s = d.modifiers.new("s", "SUBSURF"); s.levels = 1; s.render_levels = 1
d.data.materials.append(DUVET); bpy.ops.object.shade_smooth(); parts.append(d); print("part duvet", tuple(round(x, 3) for x in d.dimensions))
pl = soft("pillow", 0.62, 0.36, 0.13, (0, L / 2 - 0.3, 0.62), PILLOW, sub=3, sag=0.035, rumple=0.012, nscale=6)
for v in pl.data.vertices: v.co.z *= 1 - 0.35 * min(1, abs(v.co.x) / 0.31) ** 2   # pillow ears thinner
parts.append(pl)
for o in parts:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): o.select_set(True); bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); bed = bpy.context.object; bed.name = "bed114"
bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY"); bed.location = (0, 0, 0)
mn = min((bed.matrix_world @ v.co).z for v in bed.data.vertices); bed.location.z -= mn; bpy.ops.object.transform_apply(location=True)
print("tris", sum(len(p.vertices) - 2 for p in bed.data.polygons), "dims", tuple(round(x, 3) for x in bed.dimensions))
# proof
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 656
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
bpy.ops.object.light_add(type="AREA", location=(2, -2.5, 3)); bpy.context.object.data.energy = 400; bpy.context.object.data.size = 3
bpy.ops.object.light_add(type="AREA", location=(-2, 2.5, 2.5)); bpy.context.object.data.energy = 150; bpy.context.object.data.size = 3
import os; os.makedirs("/tmp/bed", exist_ok=True)
for nm, loc in (("a", (2.0, -2.6, 1.6)), ("b", (-2.2, 1.6, 1.4)), ("c", (0.4, -0.6, 3.2))):
    bpy.ops.object.camera_add(location=loc); cam = bpy.context.object; sc.camera = cam
    d_ = Vector((0, 0, 0.4)) - cam.location; cam.rotation_euler = d_.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"/tmp/bed/{nm}.png"; bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT"); bed.select_set(True)
bpy.ops.export_scene.gltf(filepath="/workspace/world/art/l114bed/bed114s.glb", use_selection=True, export_apply=True)
