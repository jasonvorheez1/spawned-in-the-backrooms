# Nov 11: women's Ward_glasses (f, wardrobe-split.yml) tapered to the face.
# Measured on the female body (head bone same length as the glasses rig, eyes 0.103 m lower):
# face front 4 cm is ±0.064-0.083 wide, 4-8 cm deep ±0.088-0.103; the frame front stood at ±0.110 (2.5 cm proud each side).
# Front scaled to 0.84 (±0.092), easing back to 1.0 by mid-arm so the arms keep meeting the ears.
import bpy, sys
src, out = sys.argv[-2], sys.argv[-1]
FRONT = 0.84
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = bpy.data.objects["Ward_glasses"]
ys = [v.co.y for v in o.data.vertices]
y0, y1 = min(ys), max(ys)
def f(y):
    t = (y - y0) / (y1 - y0)
    return FRONT + (1 - FRONT) * min(1.0, t / 0.5)
fac = [f(v.co.y) for v in o.data.vertices]
if o.data.shape_keys:
    for kb in o.data.shape_keys.key_blocks:
        for i, d in enumerate(kb.data): d.co.x *= fac[i]
for i, v in enumerate(o.data.vertices): v.co.x *= fac[i]
front = [v.co.x for v in o.data.vertices if v.co.y < y0 + 0.01]
print("FRONT", round(min(front), 4), round(max(front), 4))
for ob in list(bpy.data.objects):
    if ob.type == "MESH" and ob.name.startswith("Icosphere"): bpy.data.objects.remove(ob)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
