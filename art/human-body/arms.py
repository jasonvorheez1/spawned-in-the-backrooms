"""Arms (Nov 10, Shelly: "keep working on the shoulders and arms"): the female base's arms are a ~5 cm tube from shoulder to wrist.
One additive radial warp around the arm's own centre line (measured off the body's skin, not the bone, which sits 3 cm off it),
driven by each vertex's arm-chain skin weight, so the body and every garment fitted to it move by the same amount and cloth keeps
its gap. Savi's picks (cm added to the radius): a rounded deltoid cap 0.9 at the shoulder, upper arm 0.6 base + 0.7 bicep/deltoid
peak at 30 % down, elbow 0.6, forearm 0.55 at the elbow + 0.25 belly tapering to 0.15 at the wrist; the underside takes 60 %
(no armpit clash), the front of the upper arm 110 % (the bicep).
Usage: blender -b --python-exit-code 1 -P arms.py -- in.glb out.glb [in2 out2 ...]"""
import bpy, sys, os, math
from mathutils import Vector
K = float(os.environ.get('K', '1.0'))
S, E, W = Vector((0.17, 0.10, 1.235)), Vector((0.42, 0.072, 1.212)), Vector((0.585, 0.07, 1.205))  # left shoulder, elbow, wrist on the skin's centre line (rest pose)
def g(x, m, s): return math.exp(-((x - m) / s) ** 2)
def delta(p):
    """radial push (cm) and the unit direction, for a point on the LEFT arm"""
    ua = E - S; L1 = ua.length; ua.normalize(); fa = W - E; L2 = fa.length; fa.normalize()
    u = (p - S).dot(ua) / L1
    if u < 1.0:
        ax, base, t = ua, S, u
        if u < -0.25: return 0, None
        if u < 0: mag = 0.9 * (1 + u / 0.25)                     # the cap, fading in toward the collarbone
        else: mag = 0.6 + 0.7 * g(u, 0.3, 0.28) + 0.3 * max(0, 1 - u / 0.15)
    else:
        v = (p - E).dot(fa) / L2; ax, base, t = fa, E, v
        if v > 1.15: return 0, None
        vv = min(1, max(0, v)); mag = 0.55 * (1 - vv) + 0.15 * vv + 0.25 * g(vv, 0.22, 0.2)
        if v > 1: mag *= max(0, 1 - (v - 1) / 0.15)
    rad = (p - base) - ax * (p - base).dot(ax)
    if rad.length < 1e-5: return 0, None
    rd = rad.normalized()
    if rd.z < -0.3: mag *= 0.6 + 0.4 * (1 - min(1, (-rd.z - 0.3) / 0.5))   # underside: less
    if u < 1 and rd.y < -0.4: mag *= 1.1                                   # front of the upper arm: bicep
    return mag * K / 100, rd
a = sys.argv[sys.argv.index('--') + 1:]
def warp(src, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
    n = 0
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups]:
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        names = {gr.index: gr.name for gr in o.vertex_groups}
        kb = o.data.shape_keys.key_blocks if o.data.shape_keys else None
        for vtx in o.data.vertices:
            ws = {}
            for ge in vtx.groups: ws[names[ge.group]] = ge.weight
            p = mw @ vtx.co
            for side, sg in (('Left', 1), ('Right', -1)):
                w = sum(ws.get(side + b, 0) for b in ('Arm', 'ForeArm', 'Hand')) + 0.6 * ws.get(side + 'Shoulder', 0)
                if w < 0.02: continue
                q = Vector((p.x * sg, p.y, p.z)); m, rd = delta(q)
                if not rd: continue
                d = Vector((rd.x * sg, rd.y, rd.z)) * (m * min(1, w))
                dl = mi.to_3x3() @ d
                vtx.co += dl
                if kb:
                    for k in kb: k.data[vtx.index].co += dl
                n += 1
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=False, export_skins=True, export_morph=True, export_animations=False)
    print('ARMS', os.path.basename(src), n, '->', out)
for i in range(0, len(a), 2): warp(a[i], a[i + 1])
