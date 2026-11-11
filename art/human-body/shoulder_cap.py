"""Shoulder cap (Nov 10, Shelly's "no pointy shoulders" + the boxy-shoulder note on the guys' tops).
In T-pose rest, LeftArm/RightArm held up to ~0.45 of verts 8-11 cm INSIDE the shoulder joint (trapezius side). Lowering the
arm swings those verts up about the joint, so the top of the shoulder rose into a flat shelf: a box on the bare body, worse
under a shirt. Here each vert's arm weight is capped by its distance along the arm: LO at E0 inside the joint, 1 at 3 cm out;
the excess goes to the Shoulder bone. Same rule on the body and every garment, so cloth keeps following skin.
Proofed in Blender with arms dropped 68 deg: LO=0.35 E0=-0.10 rounds the cap without the rejected coat-hanger slope.
Usage: blender -b --python-exit-code 1 -P shoulder_cap.py -- in.glb out.glb [in2 out2 ...]"""
import bpy, sys, os
LO = float(os.environ.get('LO', '0.35')); E0 = float(os.environ.get('E0', '-0.10'))
a = sys.argv[sys.argv.index('--') + 1:]
def ss(e0, e1, x): t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
for src, dst in zip(a[0::2], a[1::2]):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
    R = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); n = 0
    for side, sg in (("Left", 1), ("Right", -1)):
        J = R.matrix_world @ R.data.bones[side + "Arm"].head_local
        for o in bpy.data.objects:
            if o.type != 'MESH' or side + "Arm" not in o.vertex_groups: continue
            ga = o.vertex_groups[side + "Arm"]; gs = o.vertex_groups.get(side + "Shoulder") or o.vertex_groups.new(name=side + "Shoulder")
            gi = {g.index: g.name for g in o.vertex_groups}
            for v in o.data.vertices:
                p = o.matrix_world @ v.co
                if (p.x > 0) != (sg > 0): continue
                t = (p.x - J.x) * sg
                if t > 0.03 or t < -0.15 or abs(p.y - J.y) > 0.12 or p.z < J.z - 0.12: continue
                w = {gi[g.group]: g.weight for g in v.groups}
                if any(k.startswith((side + "ForeArm", side + "Hand")) for k in w): continue
                wa = w.get(side + "Arm", 0); cap = LO + (1 - LO) * ss(E0, 0.03, t)
                if wa > cap: gs.add([v.index], w.get(side + "Shoulder", 0) + wa - cap, "REPLACE"); ga.add([v.index], cap, "REPLACE"); n += 1
    print("CAPPED", os.path.basename(src), n)
    for o in bpy.data.objects: o.select_set(o.type in ("MESH", "ARMATURE"))
    bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_skins=True)
