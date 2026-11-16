# Nov 16 (Shelly "then readjust all clothing type fits"): long garments (robes, coats, yukata) had their hems weighted to ONE leg,
# so a stride tore the hem open and the fur leg poked through. Below the crotch the hem now follows both thighs half each
# (no shin/foot pull), eased in over 6 cm, and stands off the body a little more the lower it hangs (stride room).
# blender -b --factory-startup --python-exit-code 1 -P robe-weights.py -- <f|m> <dir>  -> <dir>/robe/<name>_<sex>.glb + proof
import bpy, sys, os, glob, math, json
A = sys.argv[sys.argv.index("--") + 1:]; SEX, D = A
OUT = f"{D}/robe"; os.makedirs(OUT, exist_ok=True)
L = ["mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:LeftToeBase"]
R = ["mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot", "mixamorig:RightToeBase"]
EASE, ROOM = 0.06, 0.03   # Savi's picks: 6 cm blend under the crotch, up to 3 cm extra stand-off at the hem
def load(f):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    g = [o for o in bpy.data.objects if o.type == "MESH" and o.vertex_groups and len(o.data.vertices) > 100]
    return rig, g
rep = {}
for f in sorted(glob.glob(f"{D}/out/*_{SEX}.glb")):
    name = os.path.basename(f)[:-6]
    rig, gs = load(f)
    crotch = (rig.matrix_world @ rig.data.bones["mixamorig:LeftUpLeg"].head_local).z - 0.03
    lowest = min((o.matrix_world @ v.co).z for o in gs for v in o.data.vertices)
    if lowest > crotch - 0.08: continue          # ends above mid-thigh: trousers/tops keep their own legs
    # is it a skirt (one tube round both legs) or trousers (two tubes)? sample the band 10 cm under the crotch: a gap at x≈0 means trousers
    band = [(o.matrix_world @ v.co) for o in gs for v in o.data.vertices if crotch - 0.12 < (o.matrix_world @ v.co).z < crotch - 0.08]
    mid = sum(1 for p in band if abs(p.x) < 0.015 and p.y < 0)   # front centre seam
    if mid < 3: rep[name] = "trousers"; continue
    moved = 0
    for o in gs:
        gi = {g.name: g.index for g in o.vertex_groups}
        for n in L + R:
            if n not in gi: gi[n] = o.vertex_groups.new(name=n).index
        grp = {i: o.vertex_groups[i] for i in gi.values()}
        cx = sum(p.x for p in band) / max(1, len(band)); cy = sum(p.y for p in band) / max(1, len(band))
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            if p.z > crotch: continue
            t = min(1.0, (crotch - p.z) / EASE)
            w = {o.vertex_groups[e.group].name: e.weight for e in v.groups}
            lt, rt = sum(w.get(n, 0) for n in L), sum(w.get(n, 0) for n in R)
            leg = lt + rt
            if leg <= 0: continue
            half = leg / 2
            tgt = {n: 0.0 for n in L + R}; tgt[L[0]] = half; tgt[R[0]] = half
            for n in L + R:
                nv = (1 - t) * w.get(n, 0) + t * tgt[n]
                if nv > 1e-4: grp[gi[n]].add([v.index], nv, "REPLACE")
                else: grp[gi[n]].remove([v.index])
            dx, dy = p.x - cx, p.y - cy; r = math.hypot(dx, dy) or 1
            push = ROOM * min(1.0, (crotch - p.z) / 0.25)
            v.co = o.matrix_world.inverted() @ (p + __import__("mathutils").Vector((dx / r * push, dy / r * push, 0)))
            moved += 1
    rep[name] = moved
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=False, export_skins=True, export_animations=False)
json.dump(rep, open(f"{OUT}/report_{SEX}.json", "w"), indent=1); print("REPORT", json.dumps(rep))
