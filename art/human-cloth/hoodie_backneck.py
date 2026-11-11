# Nov 11: women's Ward_hoodie back neckline lowered under the scarf (Dawn: hood rim at z 1.27 met the scarf's
# back edge at z 1.267, so the rim's points poked through as white/pink triangles). Rim behind the neck,
# z > 1.235, |x| < 0.09, y 0.09..0.2, eased down up to 2 cm; shape keys follow.
import bpy, sys
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = bpy.data.objects["Ward_hoodie"]
M = o.matrix_world; Mi = M.inverted()
def d(co):
    w = M @ co
    if w.z < 1.235 or abs(w.x) > 0.09 or not (0.09 < w.y < 0.2): return 0.0
    t = min(1.0, (w.z - 1.235) / 0.035) * (1 - (abs(w.x) / 0.09) ** 2)
    return 0.02 * t
n = 0
deltas = [d(v.co) for v in o.data.vertices]
import mathutils
def apply(co, dz):
    w = M @ co; w.z -= dz; return Mi @ w
if o.data.shape_keys:
    for kb in o.data.shape_keys.key_blocks:
        for i, p in enumerate(kb.data):
            if deltas[i]: p.co = apply(p.co, deltas[i])
for i, v in enumerate(o.data.vertices):
    if deltas[i]: v.co = apply(v.co, deltas[i]); n += 1
print("MOVED", n)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_morph=True, export_skins=True)
