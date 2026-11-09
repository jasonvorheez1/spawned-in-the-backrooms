# Shoulder re-blend (Shelly Nov 9: "you really need to work on the rig").
# Read off the live male: LeftShoulder still held 0.21 of the upper arm 8 cm past the joint and LeftArm only 0.38 on the deltoid,
# so with the arm lowered a fifth of the arm stayed horizontal: a peaked, hunched shoulder and an upper arm bowed out from the body.
# Here, every skinned mesh (body and each garment alike, so cloth moves with skin) near each shoulder joint gets one spatial ramp:
# LeftArm grows smoothly from 0 at 7 cm inside the joint to 1 at 4.5 cm outside (the armpit side shifts later so the chest stays put);
# the rest is split between LeftShoulder and Spine2 in the ratio they had. Forearm/hand/finger weights are left untouched.
# blender -b --factory-startup --python-exit-code 1 --python art/human-base/shoulders.py -- in.glb out.glb   (after refit.py)
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
R = next(o for o in bpy.data.objects if o.type == "ARMATURE")
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
# Savi's picks, metres
IN_TOP, OUT_TOP = -0.11, 0.035   # deltoid cap: ramp start/end along the arm
IN_PIT, OUT_PIT = -0.02, 0.05    # armpit: later, the chest wall must not follow the arm
REACH = 0.17                     # radial reach from the arm axis
FAR = ("ForeArm", "Hand")
changed = 0
for side, sg in (("Left", 1), ("Right", -1)):
    J = R.matrix_world @ R.data.bones[f"{side}Arm"].head_local
    E = R.matrix_world @ R.data.bones[f"{side}ForeArm"].head_local
    u = (E - J).normalized()
    ARM, SH, SP = f"{side}Arm", f"{side}Shoulder", "Spine2"
    for o in bpy.data.objects:
        if o.type != "MESH" or ARM not in o.vertex_groups: continue
        for n in (SH, SP):
            if n not in o.vertex_groups: o.vertex_groups.new(name=n)
        gi = {g.index: g.name for g in o.vertex_groups}
        ga, gs, gp = o.vertex_groups[ARM], o.vertex_groups[SH], o.vertex_groups[SP]
        M = o.matrix_world
        for v in o.data.vertices:
            p = M @ v.co
            if (p.x > 0) != (sg > 0): continue
            d = p - J; t = d.dot(u); rad = (d - u * t).length
            if t < -0.13 or t > 0.11 or rad > REACH: continue
            w = {gi[g.group]: g.weight for g in v.groups}
            if any(k.startswith(side + f) for k in w for f in FAR) and sum(x for k, x in w.items() if any(k.startswith(side + f) for f in FAR)) > 0.05: continue
            pool = w.get(ARM, 0) + w.get(SH, 0) + w.get(SP, 0)
            if pool < 0.5: continue          # neck/head/other: not ours
            dz = d.z
            k = ss(-0.03, 0.02, dz)          # 0 = armpit side, 1 = top
            wa = ss(IN_PIT, OUT_PIT, t) * (1 - k) + ss(IN_TOP, OUT_TOP, t) * k
            fall = 1 - ss(REACH - 0.04, REACH, rad)   # fade the change out at the zone's rim
            wa = w.get(ARM, 0) * (1 - fall) + wa * fall
            wa = min(wa, pool)
            rs, rp = w.get(SH, 0), w.get(SP, 0)
            if rs + rp < 1e-4: rs, rp = 0.8, 0.2
            rest = pool - wa; fs = rs / (rs + rp)
            ga.add([v.index], wa, "REPLACE"); gs.add([v.index], rest * fs, "REPLACE"); gp.add([v.index], rest * (1 - fs), "REPLACE")
            changed += 1
print("shoulder verts reblended", changed)
for o in bpy.data.objects: o.select_set(o.type in ("MESH", "ARMATURE"))
bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_image_format="JPEG", export_jpeg_quality=88)
