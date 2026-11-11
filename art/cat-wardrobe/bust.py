# A real bust for the girl cat (Shelly Nov 11: "bust isnt there"): the Tripo body's Chest key moved ~1 cm, unreadable.
# Rebuild Chest as two rounded forms on the front of the ribcage, so look.chest 0..1 reads from flat to full.
# The same field runs on any top garment carrying a Chest key (it sits in the body's rest space), so cloth swells with her.
# usage: blender -b --factory-startup --python art/cat-wardrobe/bust.py -- <in.glb> <out.glb> [cloth]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]; CLOTH = len(a) > 2
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
# v2 (Shelly #221537 'do better with breasts'): v1 was a narrow gaussian taller than it was wide, so it read as a shelf with a hard underside.
# Now: two soft lobes joined by a smooth union, a long gentle slope from the collarbone, a round fuller underside, the peak a touch low and
# turned slightly outward; cloth never undercuts: below the peak it drapes straight down and fades over the ribs. Modest PG (ruling), fuller than Tripo's.
CX, CZ, AMP = 0.043, 0.522, 0.044
SX, SUP, SDN = 0.031, 0.046, 0.023
if CLOTH: AMP = 0.047
def lobe(p, sx):
    dx = (p.x - sx * CX) / SX; dz = p.z - CZ
    dz = dz / (SUP if dz > 0 else SDN)
    if CLOTH and dz < 0: dz = dz * 0.35          # cloth hangs from the peak instead of following the underside
    return math.exp(-0.5 * (dx * dx + dz * dz))
def field(p, n):
    if p.y > -0.045 or n.y > 0.25: return Vector((0, 0, 0))
    a, b = lobe(p, -1), lobe(p, 1)
    w = (a ** 3 + b ** 3) ** (1 / 3)              # smooth union: no crease where the lobes meet
    if CLOTH and abs(p.x) < CX: w = max(w, min(a, b) ** 0.5 * 0.9 if min(a, b) > 0 else 0, math.exp(-0.5 * (((p.z - CZ) / (SUP if p.z > CZ else SDN * 2.6)) ** 2)) * 0.9)
    side = 1 if p.x > 0 else -1
    lower = max(0.0, min(1.0, (CZ + 0.01 - p.z) / 0.03))
    off = Vector((side * 0.16 * AMP * w, -AMP * w, -0.22 * AMP * w * (0.5 + 0.5 * lower)))
    face = min(1, max(0, (-n.y + 0.1) / 0.45))
    return off * face
done = 0
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys and "Chest" in o.data.shape_keys.key_blocks]:
    kb = o.data.shape_keys.key_blocks; b = kb[0]; c = kb["Chest"]; me = o.data
    for i, v in enumerate(me.vertices):
        c.data[i].co = b.data[i].co + field(b.data[i].co, v.normal)
    done += 1; print("BUST", o.name, len(me.vertices))
assert done, "no Chest key"
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
