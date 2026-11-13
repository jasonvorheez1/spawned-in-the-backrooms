# blender -b --python rigcheck.py -- <body.glb> [label]
# Poses every big joint hard and reports, per joint region, edge strain (posed/rest length) and weight sharpness.
import bpy, sys, math, json
import numpy as np
from mathutils import Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
label = a[1] if len(a) > 1 else a[0]
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = bpy.data.objects['Body']
pb = arm.pose.bones
def reset():
    for b in pb: b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
def bend(name, ax, deg):
    b = pb['mixamorig:' + name]; M = (arm.matrix_world @ b.matrix).to_3x3()
    b.rotation_quaternion = Quaternion((M.inverted() @ Vector(ax)).normalized(), math.radians(deg)) @ b.rotation_quaternion
    bpy.context.view_layer.update()
POSES = {
  'shoulder': [('LeftArm', (0, 1, 0), 75), ('RightArm', (0, 1, 0), -75)],
  'shoulder_fwd': [('LeftArm', (0, 1, 0), 70), ('LeftArm', (0, 0, 1), -70), ('RightArm', (0, 1, 0), -70), ('RightArm', (0, 0, 1), 70)],
  'elbow': [('LeftForeArm', (0, 0, 1), -110), ('RightForeArm', (0, 0, 1), 110)],
  'hip': [('LeftUpLeg', (1, 0, 0), -80), ('RightUpLeg', (1, 0, 0), -80)],
  'hip_side': [('LeftUpLeg', (0, 1, 0), 35), ('RightUpLeg', (0, 1, 0), -35)],
  'knee': [('LeftLeg', (1, 0, 0), 110), ('RightLeg', (1, 0, 0), 110)],
  'tail': [('Tail1', (0, 0, 1), 40), ('Tail2', (0, 0, 1), 35), ('Tail3', (0, 0, 1), 30)],
}
JOINT = {'shoulder': ['LeftArm', 'RightArm'], 'shoulder_fwd': ['LeftArm', 'RightArm'], 'elbow': ['LeftForeArm', 'RightForeArm'], 'hip': ['LeftUpLeg', 'RightUpLeg'], 'hip_side': ['LeftUpLeg', 'RightUpLeg'], 'knee': ['LeftLeg', 'RightLeg'], 'tail': ['Tail1', 'Tail2', 'Tail3']}
me = body.data
E = np.array([e.vertices[:] for e in me.edges])
def coords():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    c = np.array([body.matrix_world @ v.co for v in m.vertices]); ev.to_mesh_clear(); return c
# shape keys off (Basis)
if me.shape_keys:
    for k in me.shape_keys.key_blocks[1:]: k.value = 0
reset(); R = coords(); L0 = np.linalg.norm(R[E[:, 0]] - R[E[:, 1]], axis=1) + 1e-9
gi = {g.name: g.index for g in body.vertex_groups}
W = np.zeros((len(me.vertices), len(gi)))
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
out = {}
for name, steps in POSES.items():
    reset()
    for s in steps: bend(*s)
    P = coords(); L = np.linalg.norm(P[E[:, 0]] - P[E[:, 1]], axis=1); r = L / L0
    # region: edges touching a vertex with any weight on the joint bone or its parent
    bones = []
    for j in JOINT[name]:
        bones.append('mixamorig:' + j); par = pb['mixamorig:' + j].parent
        if par: bones.append(par.name)
    idx = [gi[b] for b in bones if b in gi]
    near = (W[:, idx].sum(1) > 0.02) & (W[:, idx].sum(1) < 0.98)   # the blend zone
    em = near[E[:, 0]] | near[E[:, 1]]
    rr = r[em]
    # weight sharpness: largest weight change along an edge, in the zone, per unit rest length (per cm)
    dW = np.abs(W[E[:, 0]][:, idx] - W[E[:, 1]][:, idx]).max(1) / (L0 * 100)
    out[name] = dict(n=int(em.sum()), stretch95=round(float(np.percentile(rr, 95)), 3), stretchMax=round(float(rr.max()), 3), crush05=round(float(np.percentile(rr, 5)), 3), crushMin=round(float(rr.min()), 3), dWcm95=round(float(np.percentile(dW[em], 95)), 3), dWcmMax=round(float(dW[em].max()), 3))
# weights sanity
nb = (W > 0).sum(1); s = W.sum(1)
out['weights'] = dict(verts=len(me.vertices), unweighted=int((s < 0.5).sum()), over4=int((nb > 4).sum()), sumErr=round(float(np.abs(s - 1).max()), 4))
print('RIGCHECK', label, json.dumps(out))
if '--where' in sys.argv:
    for name in ['shoulder_fwd', 'hip', 'hip_side']:
        reset()
        for s in POSES[name]: bend(*s)
        P = coords(); L = np.linalg.norm(P[E[:, 0]] - P[E[:, 1]], axis=1); r = L / L0
        bad = np.argsort(-np.abs(np.log(r)))[:12]
        print('WHERE', name)
        for k in bad:
            v0, v1 = E[k]; c = R[v0]
            top = sorted([(W[v0, j], g) for g, j in gi.items() if W[v0, j] > 0.05], reverse=True)
            top1 = sorted([(W[v1, j], g) for g, j in gi.items() if W[v1, j] > 0.05], reverse=True)
            print('  r=%.2f L0=%.4f at (%.3f %.3f %.3f) w0=%s w1=%s' % (r[k], L0[k], c[0], c[1], c[2], [(g[10:], round(w, 2)) for w, g in top], [(g[10:], round(w, 2)) for w, g in top1]))
