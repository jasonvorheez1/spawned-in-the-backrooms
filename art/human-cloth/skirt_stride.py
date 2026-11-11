# skirts, gowns and aprons: the hem rides the thigh it hangs over, so a lifted knee carries the cloth instead of poking through it.
# below the hip joints each vertex blends Hips -> nearest UpLeg: more leg toward the hem, half and half at the centre line.
import bpy, sys, math
args = sys.argv[sys.argv.index("--") + 1:]
src, out, mode = args[0], args[1], args[2]  # mode: render | export
MAXLEG = 0.95
RAMP = 0.35  # fraction of hip-to-hem over which the leg takes over
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
H = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
lh, rh = H("LeftUpLeg"), H("RightUpLeg")
hipz = (lh.z + rh.z) / 2; cx = (lh.x + rh.x) / 2; half = abs(lh.x - rh.x) / 2
lsign = 1 if lh.x > cx else -1
g = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Ward_"))
zs = [(g.matrix_world @ v.co).z for v in g.data.vertices]; hem = min(zs)
for n in ("Hips", "LeftUpLeg", "RightUpLeg"):
    if n not in g.vertex_groups: g.vertex_groups.new(name=n)
VG = {n: g.vertex_groups[n] for n in ("Hips", "LeftUpLeg", "RightUpLeg")}
moved = 0
for v in g.data.vertices:
    p = g.matrix_world @ v.co
    if p.z >= hipz: continue
    t = min(1, (hipz - p.z) / max(1e-4, RAMP * (hipz - hem))); t = t * t * (3 - 2 * t)
    u = max(-1, min(1, (p.x - cx) * lsign / (half * 1.2))); sl = 0.5 + 0.5 * math.sin(u * math.pi / 2)
    wl, wr = MAXLEG * t * sl, MAXLEG * t * (1 - sl)
    for gr in list(v.groups): g.vertex_groups[gr.group].remove([v.index])
    VG["Hips"].add([v.index], 1 - wl - wr, "REPLACE"); VG["LeftUpLeg"].add([v.index], wl, "REPLACE"); VG["RightUpLeg"].add([v.index], wr, "REPLACE")
    moved += 1
print("MOVED", moved, "of", len(g.data.vertices), "hipz", round(hipz, 3), "hem", round(hem, 3))
if mode == "export":
    bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
