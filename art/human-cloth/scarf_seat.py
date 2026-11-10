"""Seat the scarf ring on the shoulders (Nov 10: it floated above them). Moves the scarf mesh (and its shape keys) down so the
ring's underside rests on the trapezius beside the neck, and draws it in a little so it wraps the neck.
Usage: blender -b --python-exit-code 1 -P scarf_seat.py -- body.glb scarf.glb out.glb"""
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; bodyf, scarff, out = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=bodyf)
P = [o.matrix_world @ v.co for o in bpy.data.objects if o.type == 'MESH' and (o.name == 'Body' or o.name.startswith('Skin_')) for v in o.data.vertices]
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); neck = arm.matrix_world @ arm.data.bones['Neck'].head_local
trap = max(p.z for p in P if 0.06 < abs(p.x) < 0.10 and abs(p.y - neck.y) < 0.05 and p.z < neck.z + 0.06)
neckR = max(abs(p.x) for p in P if abs(p.z - (neck.z + 0.02)) < 0.01)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=scarff)
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    W = o.matrix_world; Wi = W.inverted()
    pts = [W @ v.co for v in o.data.vertices]
    top = max(p.z for p in pts)
    ring = [p for p in pts if p.z > top - 0.07]
    bot = min(p.z for p in ring)
    cx = sum(p.x for p in ring) / len(ring); cy = sum(p.y for p in ring) / len(ring)
    inner = min(((p.x - cx) ** 2 + (p.y - cy) ** 2) ** 0.5 for p in ring)
    def surf(p):  # the body's own top under this point
        c = [q.z for q in P if abs(q.x - p.x) < 0.012 and abs(q.y - p.y) < 0.012 and q.z < p.z + 0.3]
        return max(c) if c else None
    gaps = [p.z - z for p in ring for z in [surf(p)] if z is not None]
    dz = -(min(gaps) - 0.004) if gaps else (trap - 0.012) - bot  # the lowest ring point lands just on the skin
    k = max(0.8, min(1.0, (neckR + 0.012) / inner)) if inner > 0 else 1.0
    print('SCARF', o.name, 'drop', round(dz, 3), 'inner', round(inner, 3), 'neck', round(neckR, 3), 'k', round(k, 3))
    def fix(co):
        p = W @ co
        isring = p.z > top - 0.07
        q = Vector((cx + (p.x - cx) * (k if isring else 1), cy + (p.y - cy) * (k if isring else 1), p.z + dz))
        return Wi @ q
    if o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks:
            for d in kb.data: d.co = fix(d.co)
    for v in o.data.vertices: v.co = fix(v.co)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False)
