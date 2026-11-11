# A real bust for the girl cat (Shelly Nov 11: "bust isnt there"): the Tripo body's Chest key moved ~1 cm, unreadable.
# Rebuild Chest as two rounded forms on the front of the ribcage, so look.chest 0..1 reads from flat to full.
# The same field runs on any top garment carrying a Chest key (it sits in the body's rest space), so cloth swells with her.
# usage: blender -b --factory-startup --python art/cat-wardrobe/bust.py -- <in.glb> <out.glb> [cloth]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]; CLOTH = len(a) > 2
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
CX, CZ, SIG, AMP = 0.042, 0.492, 0.030, 0.030          # glb units: body 0.668 tall, chest line at Spine1/2
if CLOTH: SIG, AMP = 0.034, 0.031                       # cloth spans the gap between the two forms
def field(p, n):
    if p.y > -0.055 or n.y > 0.15: return Vector((0, 0, 0))
    best = Vector((0, 0, 0)); bl = 0
    for sx in (-1, 1):
        dx = p.x - sx * CX; dz = p.z - CZ
        dz = dz / (1.35 if dz < 0 else 0.85)            # fuller underneath, flatter toward the collarbone
        w = math.exp(-(dx * dx + dz * dz) / (2 * SIG * SIG))
        if CLOTH and abs(p.x) < CX: w = max(w, math.exp(-(dz * dz) / (2 * SIG * SIG)) * 0.92)
        if w > bl: bl = w; best = Vector((sx * 0.12 * AMP * w, -AMP * w, -0.18 * AMP * w))
    face = min(1, max(0, (-n.y - 0.05) / 0.5))
    return best * face
done = 0
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys and "Chest" in o.data.shape_keys.key_blocks]:
    kb = o.data.shape_keys.key_blocks; b = kb[0]; c = kb["Chest"]; me = o.data
    for i, v in enumerate(me.vertices):
        c.data[i].co = b.data[i].co + field(b.data[i].co, v.normal)
    done += 1; print("BUST", o.name, len(me.vertices))
assert done, "no Chest key"
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
