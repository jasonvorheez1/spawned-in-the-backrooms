"""Shoulders (Nov 10, Shelly: "theres no way you think those shoulders and arms are normal"): the female base hangs its arms
off the armpit: narrow, sloped clavicles and a bare stick of upper arm. One warp, driven by each vertex's own skin weights so
the body and every garment fitted to it move identically:
  - the arm chain (Arm, ForeArm, Hand, fingers) slides out DX and up DZ; the Shoulder bone's share of a vertex takes SH of it,
    so the clavicle line lifts and widens instead of sloping off
  - the upper arm swells around its bone near the shoulder (a deltoid), fading to nothing by the elbow
  - the armature's arm joints move by the same offset, so the rig bends at the new shoulder
Usage: blender -b --python-exit-code 1 -P shoulders.py -- in.glb out.glb [in2.glb out2.glb ...]"""
import bpy, sys, os
from mathutils import Vector
DX = float(os.environ.get('DX', '0.026')); DZ = float(os.environ.get('DZ', '0.011')); SH = 0.6; DELT = float(os.environ.get('DELT', '0.16'))
a = sys.argv[sys.argv.index('--') + 1:]
def warp(src, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    R = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.data.bones}
    def chain(side):
        return [n for n in R if n.startswith(side) and n != side + 'Shoulder' and any(n.startswith(side + p) for p in ('Arm', 'ForeArm', 'Hand'))]
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups]:
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        names = {g.index: g.name for g in o.vertex_groups}
        kb = o.data.shape_keys.key_blocks if o.data.shape_keys else None
        moves = {}
        for v in o.data.vertices:
            p = mw @ v.co; d = Vector()
            for ge in v.groups:
                n = names[ge.group]; w = ge.weight
                for side, sg in (('Left', 1), ('Right', -1)):
                    if not n.startswith(side): continue
                    if n == side + 'Shoulder': d += Vector((sg * DX, 0, DZ)) * (w * SH)
                    elif n in chain(side): d += Vector((sg * DX, 0, DZ)) * w
                    if n == side + 'Arm':  # the deltoid: swell off the bone's axis, strongest at the shoulder
                        h, t = R[n]; h, t = arm.matrix_world @ h, arm.matrix_world @ t
                        ax = (t - h); L = ax.length; ax.normalize()
                        s = (p - h).dot(ax); f = max(0.0, 1 - max(0.0, s) / (0.55 * L))
                        rad = (p - h) - ax * s
                        if rad.z > -0.01: f *= 1.0   # top and sides of the arm
                        else: f *= 0.5               # the underarm swells less
                        d += rad * (DELT * f * w)
            if d.length > 1e-7: moves[v.index] = mi.to_3x3() @ d
        for i, d in moves.items():
            o.data.vertices[i].co += d
            if kb:
                for k in kb: k.data[i].co += d
    # move the joints with the flesh
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        for side, sg in (('Left', 1), ('Right', -1)):
            D = Vector((sg * DX, 0, DZ))
            if eb.name == side + 'Shoulder': eb.tail += D * 1.0
            elif eb.name in chain(side): eb.head += D; eb.tail += D
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=False, export_skins=True, export_morph=True, export_animations=False)
    print('SHOULDERS', os.path.basename(src), '->', out)
for i in range(0, len(a), 2): warp(a[i], a[i + 1])
