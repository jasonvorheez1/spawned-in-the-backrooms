# Lower half of the cat head pulled up toward the eye line (Shelly #459857-#459874: "move the eyes up a little",
# "im ok if you cut off the lower half a bit"): verts between the eye line and the neck rim compress toward the eye line,
# easing back to zero at the neck so the seam to the body never opens. Every shape key moves by the basis delta.
# blender -b --factory-startup --python-exit-code 1 -P art/cat-wardrobe/head-trim.py -- <in.glb> <out.glb> [k]
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; src, out = a[:2]; K = float(a[2]) if len(a) > 2 else 0.8
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
h = bpy.data.objects["Head"]; me = h.data; W = h.matrix_world; Wi = W.inverted()
P = [W @ v.co for v in me.vertices]
zs = sorted(p.z for p in P); top, bot = zs[-1], zs[0]; H = top - bot
nose = min((p for p in P if abs(p.x) < 0.012), key=lambda p: p.y)
ze = nose.z + 0.16 * H          # eye line: a little over the nose
zn = bot + 0.10 * H             # neck rim stays put below this
def ss(e0, e1, x): t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
D = []
for p in P:
    if p.z >= ze: D.append(Vector()); continue
    w = ss(zn, zn + 0.18 * H, p.z)                # 0 at the neck rim, 1 a bit above it
    nz = ze - (ze - p.z) * K
    dz = (nz - p.z) * w
    # cheeks below the eyes come in a touch too, so the jowl bulge goes, not just slides up
    sx = 1 - (1 - K) * 0.35 * w * ss(ze, zn + 0.3 * H, p.z)
    D.append(Vector((p.x * sx - p.x, 0, dz)))
L = [Wi.to_3x3() @ d for d in D]
if me.shape_keys:
    for kb in me.shape_keys.key_blocks:
        for i, d in enumerate(L): kb.data[i].co += d
for i, d in enumerate(L): me.vertices[i].co += d
print(f"trim H={H:.3f} eye={ze:.3f} neck={zn:.3f} moved={sum(1 for d in D if d.length>1e-5)} max={max(d.length for d in D)*1000:.1f}mm")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=False, export_morph=True, export_skins=True, export_animations=True)
