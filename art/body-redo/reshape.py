# body redo (Shelly Nov 10 #177511): your smooth base, thickened around its own bones: no bone moves, no new geometry
import bpy, sys, json
from mathutils import Vector
args = sys.argv[sys.argv.index('--')+1:]; src, dst, sex = args[0], args[1], args[2]
# k = cross-section scale along each bone, [at head, at tail]; picked against the refs (Anime Girl / Miyu, Zhongli)
K = {
 'f': {'LeftUpLeg': (1.24, 1.14), 'LeftLeg': (1.10, 1.02), 'Hips': (1.12, 1.12), 'Spine': (1.04, 1.0), 'LeftArm': (1.10, 1.06), 'LeftForeArm': (1.05, 1.0)},
 'm': {'LeftUpLeg': (1.18, 1.12), 'LeftLeg': (1.14, 1.04), 'Hips': (1.06, 1.08), 'Spine': (1.06, 1.12), 'Spine1': (1.12, 1.18), 'Spine2': (1.18, 1.16), 'LeftShoulder': (1.15, 1.25), 'LeftArm': (1.25, 1.14), 'LeftForeArm': (1.14, 1.06), 'Neck': (1.12, 1.05)},
}[sex]
for n in list(K):
    if n.startswith('Left'): K['Right' + n[4:]] = K[n]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bones = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in arm.data.bones}
def disp(p, b):
    h, t = bones[b]; ax = t - h; L = ax.length
    if L < 1e-6: return Vector()
    u = ax / L; s = max(0.0, min(1.0, (p - h).dot(u) / L))
    k0, k1 = K[b]; k = k0 + (k1 - k0) * s
    foot = h + u * (s * L); r = p - foot
    if b in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'): r.z = 0  # trunk: widen across, never stretch up
    return r * (k - 1)
n = 0
for o in bpy.data.objects:
    if o.type != 'MESH' or not o.vertex_groups: continue
    gi = {g.index: g.name for g in o.vertex_groups}
    mw = o.matrix_world; inv = mw.inverted()
    def move(co, groups):
        p = mw @ co; d = Vector(); 
        for g in groups:
            nm = gi.get(g.group)
            if nm in K and g.weight > 0: d += disp(p, nm) * g.weight
        return inv @ (p + d) - co
    ds = [move(v.co, v.groups) for v in o.data.vertices]
    sk = o.data.shape_keys
    if sk:
        for kb in sk.key_blocks:
            for i, d in enumerate(ds): kb.data[i].co += d
    for i, d in enumerate(ds): o.data.vertices[i].co += d
    n += 1
print('RESHAPED', n, 'meshes')
bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_morph=True, export_skins=True)
