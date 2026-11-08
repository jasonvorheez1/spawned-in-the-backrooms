# shared Blender helpers for the Level 26 ship (world coords in, Blender coords out: (x,y,z) -> (x,-z,y))
import bpy, bmesh, math
from mathutils import Vector, Matrix
TEX = "/workspace/l26ship/tex/"
def W(p): return Vector((p[0], -p[2], p[1]))
MATS = {}
def mat(name, color=(1, 1, 1), tex=None, rough=0.6, metal=0.0, emit=None, estr=0.0, alpha=False):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; m.use_backface_culling = False
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if tex:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(TEX + tex)
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
        if alpha:
            nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
            try: m.surface_render_method = "BLENDED"
            except Exception: m.blend_method = "BLEND"
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = estr
    MATS[name] = m; return m
class Mesh:
    def __init__(s): s.V = []; s.F = []
    def v(s, p): s.V.append(W(p)); return len(s.V) - 1
    def f(s, idx, m, uv=None): s.F.append((list(idx), m, uv))
    def loft(s, rings, m, uvs=None, skip=None):
        """rings: list of equal-length point lists (top to bottom); uvs same shape; skip(i,j) drops a quad"""
        ids = [[s.v(p) for p in r] for r in rings]
        for j in range(len(rings) - 1):
            for i in range(len(rings[0]) - 1):
                if skip and skip(i, j): continue
                q = [ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]]
                uv = [uvs[j][i], uvs[j][i + 1], uvs[j + 1][i + 1], uvs[j + 1][i]] if uvs else None
                s.f(q, m, uv)
        return ids
    def build(s, name, smooth=True, weld=True, angle=0.7):
        me = bpy.data.meshes.new(name); bm = bmesh.new(); vs = [bm.verts.new(p) for p in s.V]; bm.verts.ensure_lookup_table()
        uvl = bm.loops.layers.uv.new("UVMap"); mats = []
        for idx, m, uv in s.F:
            if m not in mats: mats.append(m)
            try: fc = bm.faces.new([vs[i] for i in idx])
            except ValueError: continue
            fc.material_index = mats.index(m); fc.smooth = smooth
            if uv:
                for l, u in zip(fc.loops, uv): l[uvl].uv = u
        if weld: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
        bm.to_mesh(me); bm.free()
        for m in mats: me.materials.append(m)
        o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
        if smooth: autosmooth(o, angle)
        return o
def autosmooth(o, angle=0.7):
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.shade_auto_smooth(angle=angle)
        o.select_set(False)
    except Exception as e: print("autosmooth", e)
def rbox(name, c, size, m, bevel=0.02, seg=2, yaw=0.0, pitch=0.0, roll=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    me.materials.append(m); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.scale = (size[0], size[2], size[1]); o.location = W(c)
    o.rotation_euler = (math.radians(pitch), math.radians(roll), math.radians(yaw))
    if bevel > 0:
        bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.transform_apply(scale=True); o.select_set(False)
        md = o.modifiers.new("bev", "BEVEL"); md.width = bevel; md.segments = seg; md.limit_method = "ANGLE"
        autosmooth(o, 0.6)
    return o
def tube(name, pts, r, m, res=2, closed=False, cap=True):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = cap
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): w = W(q); p.co = (w.x, w.y, w.z, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); cu.materials.append(m)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o); o2 = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o2)
    for p in me.polygons: p.use_smooth = True
    return o2
def sphere(name, c, r, m, scale=(1, 1, 1), seg=16, rings=10):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0); bm.to_mesh(me); bm.free()
    me.materials.append(m); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = W(c); o.scale = (r * scale[0], r * scale[2], r * scale[1])
    for p in me.polygons: p.use_smooth = True
    return o
def cyl(name, c, r, h, m, seg=16, r2=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h); bm.to_mesh(me); bm.free()
    me.materials.append(m); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = W((c[0], c[1] + h / 2, c[2])); autosmooth(o, 0.8); return o
def plane(name, c, w, h, m, face="+x"):
    """vertical decal plane centred at c, w x h, facing an axis; uv 0..1 reads right way round from the facing side"""
    s = Mesh(); x, y, z = c
    if face == "+x": P = [(x, y - h/2, z + w/2), (x, y - h/2, z - w/2), (x, y + h/2, z - w/2), (x, y + h/2, z + w/2)]
    elif face == "-x": P = [(x, y - h/2, z - w/2), (x, y - h/2, z + w/2), (x, y + h/2, z + w/2), (x, y + h/2, z - w/2)]
    elif face == "+z": P = [(x - w/2, y - h/2, z), (x + w/2, y - h/2, z), (x + w/2, y + h/2, z), (x - w/2, y + h/2, z)]
    else: P = [(x + w/2, y - h/2, z), (x - w/2, y - h/2, z), (x - w/2, y + h/2, z), (x + w/2, y + h/2, z)]
    s.f([s.v(p) for p in P], m, [(0, 0), (1, 0), (1, 1), (0, 1)]); return s.build(name, smooth=False, weld=False)
def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers):
            try: bpy.ops.object.modifier_apply(modifier=md.name)
            except Exception as e: print("apply", e)
        o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.active_object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); o.select_set(False); return o
def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_apply=True, use_selection=True, export_image_format="AUTO", export_jpeg_quality=85)
def rr_loop(xh, z0, z1, rf, ra, off=0.0, n=10):
    """rounded rectangle plan, CCW seen from above: x in [-xh,xh], z in [z0 (fore), z1 (aft)], fore corner radius rf, aft ra; offset outward"""
    pts = []
    def arc(cx, cz, r, a0, a1):
        for k in range(n + 1):
            a = a0 + (a1 - a0) * k / n; pts.append((cx + math.cos(a) * (r + off), cz + math.sin(a) * (r + off)))
    arc(xh - ra, z1 - ra, ra, 0, math.pi / 2)                 # aft starboard
    arc(-xh + ra, z1 - ra, ra, math.pi / 2, math.pi)         # aft port
    arc(-xh + rf, z0 + rf, rf, math.pi, 1.5 * math.pi)       # fore port
    arc(xh - rf, z0 + rf, rf, 1.5 * math.pi, 2 * math.pi)    # fore starboard
    return pts
