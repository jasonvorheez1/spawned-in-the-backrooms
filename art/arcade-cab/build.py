# 90s candy-cab arcade cabinet (Shelly, Nov 9: "sega arcade machines from the 90s", "dont make them blocky").
# One rounded shell extruded from a side profile and bevelled, a real recessed bezel with a bulged CRT, a backlit
# marquee box, a sloped control panel with sticks and buttons, coin door, T-molding on both edges.
# Slots: shell, trim, bezel, screen, marquee, panel, button, stick, metal, coin, grille. Front = Blender -Y (glTF +z).
import bpy, bmesh, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
W = 0.74                                  # cabinet width (my pick)
def mat(name, col, rough=0.4, metal=0.0, emit=None, es=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    return m
M = dict(shell=mat('shell', (0.85, 0.85, 0.82), 0.32), trim=mat('trim', (0.05, 0.05, 0.06), 0.5),
         bezel=mat('bezel', (0.02, 0.02, 0.025), 0.6), screen=mat('screen', (0.02, 0.05, 0.08), 0.08, emit=(0.2, 0.5, 0.9), es=1.0),
         marquee=mat('marquee', (0.9, 0.5, 0.2), 0.2, emit=(1, 0.6, 0.3), es=1.5), panel=mat('panel', (0.08, 0.08, 0.12), 0.45),
         button=mat('button', (0.85, 0.08, 0.1), 0.25), stick=mat('stick', (0.9, 0.1, 0.1), 0.2), metal=mat('metal', (0.6, 0.6, 0.62), 0.3, 1.0),
         coin=mat('coin', (0.9, 0.1, 0.05), 0.3, emit=(1, 0.1, 0.05), es=2.0), grille=mat('grille', (0.03, 0.03, 0.035), 0.7))
def obj(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o)
    for k in (m if isinstance(m, list) else [m]): me.materials.append(M[k])
    return o
def smooth(o, bevel=0.0, segs=3, sub=0):
    bpy.context.view_layer.objects.active = o
    if bevel: b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = segs; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(25); b.harden_normals = False
    if sub: s = o.modifiers.new('sd', 'SUBSURF'); s.levels = s.render_levels = sub
    o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    for p in o.data.polygons: p.use_smooth = True
# side profile (y forward is -Y, z up)
P = [(0.42, 0.0), (-0.30, 0.0), (-0.30, 0.60), (-0.47, 0.70), (-0.50, 0.76), (-0.46, 0.80), (-0.24, 0.86),
     (-0.22, 0.90), (-0.02, 1.42), (-0.06, 1.47), (-0.10, 1.72), (0.06, 1.77), (0.42, 1.74)]
def prism(profile, x0, x1):
    bm = bmesh.new(); a = [bm.verts.new((x0, y, z)) for y, z in profile]; b = [bm.verts.new((x1, y, z)) for y, z in profile]
    bm.faces.new(a[::-1]); bm.faces.new(b); n = len(profile)
    for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
shell = obj('Shell', prism(P, -W / 2, W / 2), 'shell'); smooth(shell, 0.035, 4)
# T-molding: a tube along each side's profile edge
for sx in (-1, 1):
    cu = bpy.data.curves.new('tm', 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(P))
    for i, (y, z) in enumerate(P + [P[0]]): sp.points[i].co = (sx * (W / 2 + 0.003), y, z, 1)
    cu.bevel_depth = 0.013; cu.bevel_resolution = 3
    t = bpy.data.objects.new('Trim', cu); S.collection.objects.link(t); t.data.materials.append(M['trim'])
    bpy.context.view_layer.objects.active = t; t.select_set(True); bpy.ops.object.convert(target='MESH'); t.select_set(False)
    for p in t.data.polygons: p.use_smooth = True
# bezel + CRT on the screen slope (from (-0.22,0.90) to (-0.02,1.42))
a, b = Vector((0, -0.22, 0.90)), Vector((0, -0.02, 1.42)); up = (b - a).normalized(); nrm = Vector((0, -up.z, up.y)).normalized()
L = (b - a).length; mid = (a + b) / 2
def slab(name, w, h, d, m, off=0.0, bev=0.01):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); 
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    o = obj(name, bm, m); o.rotation_euler = (math.atan2(up.y, up.z) * -1 + 0, 0, 0)
    o.rotation_euler = (-math.atan2(up.y, up.z), 0, 0); o.location = mid + nrm * off; smooth(o, bev, 3); return o
bez = slab('Bezel', W - 0.07, L - 0.04, 0.03, 'bezel', 0.005, 0.012)
# CRT: a bulged grid, UV 0..1
bm = bmesh.new(); sw, sh = 0.56, 0.42; nx, ny = 16, 12; vs = []
uv = bm.loops.layers.uv.new('UVMap')
for j in range(ny + 1):
    row = []
    for i in range(nx + 1):
        u, v = i / nx, j / ny; x, z = (u - .5) * sw, (v - .5) * sh
        bulge = 0.022 * (1 - (2 * u - 1) ** 2) * (1 - (2 * v - 1) ** 2)
        row.append((bm.verts.new((x, -bulge, z)), u, v))
    vs.append(row)
for j in range(ny):
    for i in range(nx):
        q = [vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]]; f = bm.faces.new([c[0] for c in q])
        for l, c in zip(f.loops, q): l[uv].uv = (c[1], c[2])
crt = obj('Screen', bm, 'screen'); crt.rotation_euler = (-math.atan2(up.y, up.z), 0, 0); crt.location = mid + nrm * 0.024 + up * 0.01
for p in crt.data.polygons: p.use_smooth = True
# marquee: a backlit box front between (-0.06,1.47) and (-0.10,1.72), face UV 0..1
mq0, mq1 = Vector((0, -0.065, 1.485)), Vector((0, -0.095, 1.705)); mu = (mq1 - mq0).normalized(); mn = Vector((0, -mu.z, mu.y)).normalized()
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); mw = W - 0.06; mh = (mq1 - mq0).length
c = [bm.verts.new((x, 0, z)) for x, z in ((-mw / 2, -mh / 2), (mw / 2, -mh / 2), (mw / 2, mh / 2), (-mw / 2, mh / 2))]
f = bm.faces.new(c)
for l, t in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uvl].uv = t
mq = obj('Marquee', bm, 'marquee'); mq.rotation_euler = (-math.atan2(mu.y, mu.z), 0, 0); mq.location = (mq0 + mq1) / 2 + mn * 0.012
# marquee frame lip
fr = slab('MarqueeFrame', W - 0.02, 0.025, 0.05, 'metal', 0, 0.008); fr.rotation_euler = (0, 0, 0); fr.location = (0, -0.07, 1.47)
fr2 = slab('MarqueeFrame2', W - 0.02, 0.025, 0.05, 'metal', 0, 0.008); fr2.rotation_euler = (0, 0, 0); fr2.location = (0, -0.11, 1.725)
# control panel: sloped deck from (-0.50,0.77) to (-0.24,0.865)
p0, p1 = Vector((0, -0.50, 0.775)), Vector((0, -0.24, 0.865)); pu = (p1 - p0).normalized(); pn = Vector((0, -pu.z, pu.y)).normalized()
if pn.z < 0: pn = -pn
pan = slab('Panel', W - 0.04, (p1 - p0).length - 0.02, 0.012, 'panel', 0, 0.004); pan.rotation_euler = (math.pi / 2 - math.atan2(pu.z, -pu.y), 0, 0)
pan.rotation_euler = (-(math.pi / 2) + math.atan2(pu.z, -pu.y) * -1 + math.pi, 0, 0)
pan.location = (p0 + p1) / 2 + pn * 0.012
def on_panel(t, x, h=0.0): return p0 + (p1 - p0) * t + Vector((x, 0, 0)) + pn * (0.018 + h)
def part(name, kind, loc, m, r, d):
    bm = bmesh.new()
    if kind == 'cyl': bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r, depth=d)
    else: bmesh.ops.create_uvsphere(bm, u_segments=18, v_segments=12, radius=r)
    o = obj(name, bm, m); o.location = loc; o.rotation_euler = (math.atan2(-pn.y, pn.z), 0, 0); smooth(o, 0.003 if kind == 'cyl' else 0, 2); return o
cols = [(0.9, 0.08, 0.1), (0.1, 0.35, 0.95), (0.98, 0.8, 0.1)]
for side in (-1, 1):
    cx = side * 0.19
    part('StickBase', 'cyl', on_panel(0.45, cx - side * 0.09, -0.005), 'metal', 0.028, 0.008)
    part('StickShaft', 'cyl', on_panel(0.45, cx - side * 0.09, 0.03), 'metal', 0.006, 0.07)
    part('StickBall', 'sph', on_panel(0.45, cx - side * 0.09, 0.075), 'stick', 0.02, 0)
    for k in range(6):
        bx = cx + side * (0.0 + (k % 3) * 0.045) - side * 0.0 + (0.035 if side < 0 else -0.035) * 0
        part('Btn', 'cyl', on_panel(0.62 - (k // 3) * 0.3, bx + (0.02 * side) + ((k % 3) - 1) * 0.0, 0.004), 'button', 0.0135, 0.014)
part('Start', 'cyl', on_panel(0.85, 0, 0.002), 'coin', 0.009, 0.01)
# coin door
cd = slab('CoinDoor', 0.30, 0.26, 0.02, 'metal', 0, 0.006); cd.rotation_euler = (0, 0, 0); cd.location = (0, -0.305, 0.36)
for x in (-0.06, 0.06):
    s = slab('CoinSlot', 0.035, 0.06, 0.01, 'coin', 0, 0.003); s.rotation_euler = (0, 0, 0); s.location = (x, -0.318, 0.40)
# speaker grilles under the marquee
for x in (-0.22, 0.22):
    g = slab('Grille', 0.12, 0.03, 0.01, 'grille', 0, 0.006); g.rotation_euler = (math.radians(-12), 0, 0); g.location = (x, -0.035, 1.452)
# kick plate
k = slab('Kick', W - 0.02, 0.08, 0.02, 'trim', 0, 0.008); k.rotation_euler = (0, 0, 0); k.location = (0, -0.305, 0.04)
# apply, join by nothing (separate meshes keep slots), export
bpy.ops.object.select_all(action='SELECT')
for o in S.objects:
    if o.type == 'MESH':
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
for o in S.objects:
    if o.type == 'MESH' and not o.data.uv_layers: o.data.uv_layers.new(name='UVMap')
bpy.ops.object.select_all(action='SELECT'); bpy.context.view_layer.objects.active = crt; bpy.ops.object.join()
J = bpy.context.view_layer.objects.active
J.name = 'Cabinet'; J.data.name = 'Cabinet'  # a node named like a slot takes that slot's override over every face
uvd = J.data.uv_layers.active.data
for slot in ('screen', 'marquee'):
    i = [m.name for m in J.data.materials].index(slot)
    us = [uvd[l].uv[:] for p in J.data.polygons if p.material_index == i for l in p.loop_indices]
    print('uvcheck', slot, round(min(u[0] for u in us), 2), round(max(u[0] for u in us), 2), round(min(u[1] for u in us), 2), round(max(u[1] for u in us), 2))
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
dg = bpy.context.evaluated_depsgraph_get(); print('tris', sum(len(o.evaluated_get(dg).data.loop_triangles) for o in S.objects if o.type == 'MESH'))
import os; os.makedirs('/workspace/arcade', exist_ok=True)
bpy.ops.export_scene.gltf(filepath='/workspace/arcade/cab.glb', export_apply=True)
# proof
S.render.engine = 'CYCLES'; S.cycles.samples = 24; S.render.resolution_x = S.render.resolution_y = 656
w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
for rot, e in (((0.9, 0, -0.7), 3), ((0.9, 0, 2.6), 2)):
    l = bpy.data.objects.new('sun', bpy.data.lights.new('s', 'SUN')); l.data.energy = e; l.rotation_euler = rot; S.collection.objects.link(l)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('c')); S.collection.objects.link(cam); S.camera = cam; cam.data.lens = 40
for n, (pos) in (('a', (-1.6, -2.2, 1.5)), ('b', (2.5, 0.2, 1.1)), ('c', (0.0, -1.2, 1.25))):
    cam.location = pos; d = Vector((0, 0, 0.95)) - Vector(pos); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    S.render.filepath = f'/tmp/arcade/cab_{n}.png'; bpy.ops.render.render(write_still=True)
