# Nov 11: women's Ward_scarf back band pushed 9 mm off the neck. Measured: the band's back at y 0.150-0.157
# (z 1.29-1.31) sat on the neck/collar skin (y 0.153-0.155), so skin showed through it as triangles on Dawn.
# Back half only (y > 0.08, Blender +Y = back), eased in from the sides; shape keys follow.
import bpy, sys
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = bpy.data.objects["Ward_scarf"]; M = o.matrix_world; Mi = M.inverted()
def off(co):
    w = M @ co
    if w.y <= 0.08 or w.z < 1.2: return None
    t = min(1.0, (w.y - 0.08) / 0.06)
    w.y += 0.009 * t; w.z -= 0.004 * t
    return Mi @ w
new = [off(v.co.copy()) for v in o.data.vertices]
if o.data.shape_keys:
    for kb in o.data.shape_keys.key_blocks:
        for i, p in enumerate(kb.data):
            if new[i] is not None: p.co = off(p.co.copy())
n = 0
for i, v in enumerate(o.data.vertices):
    if new[i] is not None: v.co = new[i]; n += 1
print("MOVED", n)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
