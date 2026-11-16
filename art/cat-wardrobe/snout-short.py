# Nov 16 (Shelly #445xxx "why is the snout still long"): second pass on cute-f.glb, the guide's SMALLEST snout:
# the muzzle pulled back toward the face (length x0.62 about its root), a touch taller, tip blunted round. Shape keys follow.
# usage: blender -b --factory-startup --python snout-short.py -- <in.glb> <out.glb>
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
SC = Vector((0, -0.165, 0.796)); LY, HZ = 0.62, 1.06
def f(p):
    v = p - SC
    if v.y > 0.004: return Vector()
    side = math.hypot(v.x / 0.085, v.z / 0.075)
    if side >= 1.3: return Vector()
    w = sm((-v.y) / 0.03) * (1 - sm((side - 0.75) / 0.55))
    d = Vector((0, v.y * (LY - 1), v.z * (HZ - 1))) * w
    # blunt: the front-most 1.5 cm squashes back a little more at the centre line, so the tip reads round, not pointed
    d.y += max(0, -v.y - 0.035) * 0.35 * (1 - sm(side / 0.9))
    return d
n = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    me = o.data; mw = o.matrix_world; inv = mw.to_3x3().inverted()
    base = [v.co.copy() for v in me.vertices]
    disp = [inv @ f(mw @ c) for c in base]
    if max(d.length for d in disp) < 1e-6: continue
    kb = me.shape_keys.key_blocks if me.shape_keys else None
    if kb:
        for k in kb:
            for i in range(len(base)): k.data[i].co = k.data[i].co + disp[i]
    for i, v in enumerate(me.vertices): v.co = base[i] + disp[i]
    n += 1; print("SNOUT", o.name, round(max(d.length for d in disp), 4))
assert n
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
