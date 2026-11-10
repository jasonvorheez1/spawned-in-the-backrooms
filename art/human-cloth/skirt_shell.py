"""Skirts grown from the body's own silhouette (Nov 10 clothing redo, Shelly: "every clothing including bottomwear").
Each ring is the convex drape of the body below the waist (the cloth hangs off the widest point above it, never tucks in),
pushed out by STANDOFF and opened by FLARE per metre of drop; the same shape keys as the body so hip morphs carry it.
Weights: Hips at the band, sharing to each UpLeg toward the hem so it swings with the stride.
Usage: WARD=Ward_skirt HEM=-0.35 FLARE=0.10 blender -b -P skirt_shell.py -- body.glb out.glb   (HEM like CUFF: 0 knee, 1 ankle, negative up the thigh)"""
import bpy, bmesh, sys, os, math
from mathutils import Vector
NAME = os.environ.get('WARD', 'Ward_skirt'); HEM = float(os.environ.get('HEM', '-0.35'))
FLARE = float(os.environ.get('FLARE', '0.10')); T = float(os.environ.get('STANDOFF', '0.012')); WAIST = float(os.environ.get('WAIST', '0.03'))
LEG = float(os.environ.get('LEG', '0.7')); SEG = int(os.environ.get('SEG', '56')); BIB = os.environ.get('BIB') == '1'
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
J = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
body = bpy.data.objects['Body']
parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Skin_')]
M = body.matrix_world.copy()
keys = [k.name for k in body.data.shape_keys.key_blocks[1:]] if body.data.shape_keys else []
def pts(o, key=None):
    me = o.data; Mo = o.matrix_world
    if key and me.shape_keys and key in me.shape_keys.key_blocks: return [Mo @ d.co for d in me.shape_keys.key_blocks[key].data]
    return [Mo @ v.co for v in me.vertices]
s = J['Neck'].z / 1.276
waistz = J['Spine'].z + WAIST * s
K = (J['LeftLeg'].z + J['RightLeg'].z) / 2; U = (J['LeftUpLeg'].z + J['RightUpLeg'].z) / 2; A = (J['LeftFoot'].z + J['RightFoot'].z) / 2
hemz = K + (A - K) * HEM if HEM >= 0 else K + (U - K) * -HEM
cx, cy = J['Hips'].x, J['Hips'].y
ROWS = max(6, int((waistz - hemz) / 0.025))
def rings(P):
    P = [p for p in P if hemz - 0.05 < p.z < waistz + 0.01]
    out = []
    for r in range(ROWS + 1):
        z = waistz - (waistz - hemz) * r / ROWS
        band = [p for p in P if p.z >= z - 0.015] or P
        ring = []
        for i in range(SEG):
            th = 2 * math.pi * i / SEG; d = Vector((math.sin(th), -math.cos(th), 0))  # i=0 faces front (-Y)
            sup = max((p.x - cx) * d.x + (p.y - cy) * d.y for p in band)
            rad = sup + T + FLARE * (waistz - z) * (1.0 if r else 0.0)
            ring.append(Vector((cx + d.x * rad, cy + d.y * rad, z)))
        out.append(ring)
    # smooth down each column: the support steps where a new bulge enters the band; cloth hangs over those as one curve
    for _ in range(6):
        for i in range(SEG):
            c = [out[r][i].copy() for r in range(len(out))]
            for r in range(1, len(out) - 1):
                cen = Vector((cx, cy, c[r].z)); m = ((c[r - 1] - Vector((cx, cy, c[r - 1].z))).length + 2 * (c[r] - cen).length + (c[r + 1] - Vector((cx, cy, c[r + 1].z))).length) / 4
                out[r][i] = cen + (c[r] - cen).normalized() * max(m, (c[r] - cen).length - 0.004)
    # smooth around each ring so the support's corners don't read as facets
    for ring in out:
        for _ in range(2):
            c = [Vector(v) for v in ring]
            for i in range(SEG): ring[i].xy = (c[i - 1].xy + c[i].xy * 2 + c[(i + 1) % SEG].xy) / 4
    return out
allP = lambda key=None: sum((pts(o, key) for o in [body] + parts), [])
base = rings(allP())
K_R = {k: rings(allP(k)) for k in keys}
bm = bmesh.new()
outer = [[bm.verts.new(v) for v in ring] for ring in base]
inner = [[bm.verts.new(base[r][i] - (base[r][i] - Vector((cx, cy, base[r][i].z))).normalized() * 0.004) for i in range(SEG)] for r in range(ROWS + 1)]
for r in range(ROWS):
    for i in range(SEG):
        j = (i + 1) % SEG
        bm.faces.new((outer[r][i], outer[r][j], outer[r + 1][j], outer[r + 1][i]))
        bm.faces.new((inner[r][j], inner[r][i], inner[r + 1][i], inner[r + 1][j]))
for i in range(SEG):  # hem and waist lips
    j = (i + 1) % SEG
    bm.faces.new((outer[ROWS][i], outer[ROWS][j], inner[ROWS][j], inner[ROWS][i]))
    bm.faces.new((outer[0][j], outer[0][i], inner[0][i], inner[0][j]))
for f in bm.faces: f.smooth = True
me = bpy.data.meshes.new(NAME); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new(NAME, me); bpy.context.scene.collection.objects.link(ob)
# shape keys: same offsets the body's keys make, outer and inner alike
ob.shape_key_add(name='Basis')
n = SEG * (ROWS + 1)
for k in keys:
    kb = ob.shape_key_add(name=k); R = K_R[k]
    for r in range(ROWS + 1):
        for i in range(SEG):
            dlt = R[r][i] - base[r][i]
            kb.data[r * SEG + i].co = me.vertices[r * SEG + i].co + dlt
            kb.data[n + r * SEG + i].co = me.vertices[n + r * SEG + i].co + dlt
# weights
g = {b: ob.vertex_groups.new(name=b) for b in ('Hips', 'LeftUpLeg', 'RightUpLeg', 'Spine')}
for v in me.vertices:
    p = v.co; t = max(0.0, min(1.0, (waistz - p.z) / max(1e-4, waistz - hemz)))
    side = max(0.0, min(1.0, (p.x - cx) / 0.12 + 0.5))
    leg = LEG * t * t
    g['Hips'].add([v.index], 1 - leg, 'REPLACE')
    if leg > 0:
        g['LeftUpLeg'].add([v.index], leg * side, 'REPLACE'); g['RightUpLeg'].add([v.index], leg * (1 - side), 'REPLACE')
ob.parent = arm; ob.matrix_parent_inverse = arm.matrix_world.inverted()
ob.modifiers.new('skin', 'ARMATURE').object = arm
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o != ob: bpy.data.objects.remove(o, do_unlink=True)
for _m in list(bpy.data.materials):
    if _m.name.startswith('cloth_'): _m.name = 'old_' + _m.name
mat = bpy.data.materials.new('cloth_bottom'); me.materials.append(mat)
uv = me.uv_layers.new(name='UVMap')
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index; r, i = divmod(vi % n, SEG)
        uv.data[li].uv = (i / SEG * 2.0, r / ROWS)
print('SKIRT', NAME, len(me.vertices), 'rows', ROWS, 'waist', round(waistz, 3), 'hem', round(hemz, 3), 'keys', keys)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_skins=True, export_morph=True, export_animations=False, export_apply=False)
