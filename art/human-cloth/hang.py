"""Loose cut for a grown top (Nov 10, Shelly: every clothing remade; a hoodie hangs, it doesn't hug).
in.glb is a body.glb with only the grown garment kept (tee_shell output). Below the chest the cloth hangs straight from the
widest ring above it (no waist, no crotch shape); sleeves open to the arm's widest ring and gather back at the cuff; a hood
lies rolled behind the neck; a kangaroo pocket sits on the belly. Every shape key (Bust) gets the same treatment from its own shape.
blender -b --factory-startup --python-exit-code 1 --python hang.py -- in.glb body.glb out.glb"""
import bpy, bmesh, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, bodyf, out = a
EASE = 0.012   # extra room on the hanging part, metres. Savi's pick
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
J = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
g = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_'))
M = g.matrix_world; Mi = M.inverted()
cz = J['Spine1'].z; hemz = J['Hips'].z - 0.2
NB = 48
def hang(P):
    # torso: per angle bin, the widest radius at or above each height down from the chest line
    ax = Vector((J['Spine'].x, J['Spine'].y, 0))
    tor = [i for i, p in enumerate(P) if p.z < cz and abs(p.x) < abs(J['LeftArm'].x) * 1.25]
    def pol(p): d = Vector((p.x, p.y, 0)) - ax; return d.length, (math.atan2(d.y, d.x) % (2 * math.pi)) / (2 * math.pi) * NB
    ref = [0.0] * NB
    for i, p in enumerate(P):
        if cz <= p.z < cz + 0.06 and abs(p.x) < abs(J['LeftArm'].x):
            r, b = pol(p); ref[int(b) % NB] = max(ref[int(b) % NB], r)
    for k in range(NB):   # fill empty bins from neighbours
        if ref[k] == 0: ref[k] = max(ref[(k - 1) % NB], ref[(k + 1) % NB])
    for _ in range(3): ref = [(ref[(k - 1) % NB] + 2 * ref[k] + ref[(k + 1) % NB]) / 4 for k in range(NB)]   # no bin steps
    for i in sorted(tor, key=lambda i: -P[i].z):
        p = P[i]; r, b = pol(p); k0 = int(b) % NB; f = b - int(b)
        R = ref[k0] * (1 - f) + ref[(k0 + 1) % NB] * f + EASE * min(1, (cz - p.z) / 0.08)
        t = min(1.0, (cz - p.z) / 0.06)
        if R > r:
            d = Vector((p.x, p.y, 0)) - ax; d.normalize(); P[i] = p + d * (R - r) * t
    # sleeves: open to the widest ring, gather to the cuff over the last 6 cm
    for side in ('Left', 'Right'):
        A, H = J[side + 'Arm'], J[side + 'Hand']; d = (H - A); L = d.length; d /= L
        idx = [i for i, p in enumerate(P) if (p.x > 0) == (side == 'Left') and abs(p.x) > abs(J['LeftArm'].x) * 0.9]
        rs = [((P[i] - A) - d * (P[i] - A).dot(d)).length for i in idx]
        if not rs: continue
        mid = [r for i, r in zip(idx, rs) if 0.3 < (P[i] - A).dot(d) / L < 0.8]
        Rm = sorted(mid)[len(mid) // 2] * 1.18 + 0.004 if mid else max(rs)   # the sleeve's own median, a little roomier
        for i, r in zip(idx, rs):
            t = (P[i] - A).dot(d) / L
            if t < 0.15: continue
            cuff = max(0.0, min(1.0, (t - 0.82) / 0.1)) if t > 0.82 else 0
            R = (Rm * (1 - cuff) + (r + 0.003) * cuff)
            ramp = min(1.0, (t - 0.15) / 0.15)
            if R > r:
                q = (P[i] - A) - d * (P[i] - A).dot(d); q.normalize(); P[i] = P[i] + q * (R - r) * ramp
    return P
base = [M @ v.co for v in g.data.vertices]
keys = g.data.shape_keys.key_blocks if g.data.shape_keys else None
if keys:
    kp = {kb.name: [M @ c.co for c in kb.data] for kb in keys}
    for n, P in kp.items():
        P = hang(P)
        for c, p in zip(keys[n].data, P): c.co = Mi @ p
    for v, c in zip(g.data.vertices, keys[0].data): v.co = c.co
else:
    for v, p in zip(g.data.vertices, hang(base)): v.co = Mi @ p
# hood (lying down) and pocket: new parts, skinned from the body by nearest weights
def tube(curve_pts, radius, ring=12, flat=1.0):
    bm = bmesh.new(); rings = []
    for j, c in enumerate(curve_pts):
        t = (curve_pts[min(j + 1, len(curve_pts) - 1)] - curve_pts[max(j - 1, 0)]).normalized()
        u = t.cross(Vector((0, 0, 1))).normalized() if abs(t.z) < 0.9 else Vector((1, 0, 0)); w = t.cross(u)
        rad = radius(j / (len(curve_pts) - 1))
        rings.append([bm.verts.new(c + (u * math.cos(k / ring * 2 * math.pi) * flat + w * math.sin(k / ring * 2 * math.pi)) * rad) for k in range(ring)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(ring): bm.faces.new((r0[k], r0[(k + 1) % ring], r1[(k + 1) % ring], r1[k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('part'); bm.to_mesh(me); return me
nk = J['Neck']; P0 = [M @ v.co for v in g.data.vertices]
B = None
bpy.ops.import_scene.gltf(filepath=bodyf); bo = next(o for o in bpy.context.selected_objects if o.name.startswith('Body'))
BP = [bo.matrix_world @ v.co for v in bo.data.vertices]
nr = sorted((p - nk).to_2d().length for p in BP if abs(p.z - (nk.z + 0.03)) < 0.008)
rn = (nr[len(nr) * 3 // 4] if nr else 0.05) + 0.03   # rests on the trapezius just outside the neck tube
for o in list(bpy.context.selected_objects): bpy.data.objects.remove(o, do_unlink=True)
pts = []
for j in range(25):   # a U from one collarbone, round the back of the neck, to the other
    th = -math.pi * 0.15 + (math.pi * 1.3) * j / 24
    pts.append(Vector((nk.x + math.cos(th) * rn * 1.05, nk.y + math.sin(th) * rn * 1.1, nk.z + 0.012 + 0.03 * math.sin(th) ** 2)))
hood = bpy.data.objects.new('hood', tube(pts, lambda t: 0.012 + 0.03 * math.sin(t * math.pi) ** 1.5, 14, 1.25)); bpy.context.collection.objects.link(hood)
sy = min(p.y for p in P0 if abs(p.x) < 0.04 and abs(p.z - (J['Spine'].z - 0.02)) < 0.02)
bm = bmesh.new(); W, H, D = 0.13, 0.11, 0.008
for x, z in ((-W, 0), (W, 0), (W * 0.75, H), (-W * 0.75, H)): pass
pv = [bm.verts.new(Vector((x, sy - D, J['Spine'].z - 0.07 + z))) for x, z in ((-W, 0), (W, 0), (W * 0.72, H), (-W * 0.72, H))]
f = bm.faces.new(pv); bmesh.ops.solidify(bm, geom=[f], thickness=0.006); me = bpy.data.meshes.new('pocket'); bm.to_mesh(me)
pocket = bpy.data.objects.new('pocket', me); bpy.context.collection.objects.link(pocket)
for o in (hood, pocket):
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = 1
    o.data.materials.append(g.data.materials[0])
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sub')
    for vg in g.vertex_groups: o.vertex_groups.new(name=vg.name)
    dt = o.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = g; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.modifier_apply(modifier='dt')
    o.parent = arm; am = o.modifiers.new('arm', 'ARMATURE'); am.object = arm
if keys:   # parts ride the Bust key: give them Basis + Bust with the pocket moved by the torso's own delta
    for o in (hood, pocket): o.shape_key_add(name='Basis'); o.shape_key_add(name='Bust')
bpy.ops.object.select_all(action='DESELECT'); hood.select_set(True); pocket.select_set(True); g.select_set(True)
bpy.context.view_layer.objects.active = g; bpy.ops.object.join()
g.data.calc_loop_triangles(); print('HANG', g.name, len(g.data.vertices), 'tris', len(g.data.loop_triangles))
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
