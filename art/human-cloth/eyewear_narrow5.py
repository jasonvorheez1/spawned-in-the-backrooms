# Nov 11: women's Ward_glasses 5% narrower across x (every shape key too). Measured: frame ±0.128 on a 0.229 m head bone,
# body head ±0.111 on a 0.212 m bone -> frame stood ~8 mm proud each side; at 0.95 it stands ~2 mm proud of the widest head point.
import bpy, sys
src, out = sys.argv[-2], sys.argv[-1]
S = 0.95
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = bpy.data.objects["Ward_glasses"]
if o.data.shape_keys:
    for kb in o.data.shape_keys.key_blocks:
        for d in kb.data: d.co.x *= S
for v in o.data.vertices: v.co.x *= S
xs = [v.co.x for v in o.data.vertices]; print("NEWX", round(min(xs), 4), round(max(xs), 4))
for ob in list(bpy.data.objects):
    if ob.type == "MESH" and ob.name.startswith("Icosphere"): bpy.data.objects.remove(ob)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
