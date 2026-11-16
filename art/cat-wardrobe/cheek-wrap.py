# Nov 16 (Shelly "the snout on the critters arent covering to their cheeks"): the muzzle dome stopped short of the cheeks and left a
# crease under the eye. One shallow wide fill on the lower face carries the muzzle's sides out into the cheeks. It moves only along
# the face axis (Blender -Y) so the painted face stays registered, and the same delta goes on every Head key so every snout type gets it.
# usage: blender -b --factory-startup --python-exit-code 1 --python cheek-wrap.py -- <in.glb> <out.glb> [proof.png]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; SRC, OUT = a[0], a[1]; PROOF = a[2] if len(a) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.to_3x3().inverted()
kb = me.shape_keys.key_blocks; B = [k.co.copy() for k in kb["Basis"].data]; W = [mw @ c for c in B]
ZC = 0.80
FY = min(p.y for p in W if abs(p.x) < 0.01 and abs(p.z - ZC) < 0.01)
EYE = 0.835   # the drawn eyes' lower lids: the fill fades out before it reaches them
def fill(p):
    dz = p.z - (ZC - 0.012)
    r = math.hypot(p.x / 0.165, dz / (0.05 if dz > 0 else 0.085))
    if r >= 1: return 0.0
    w = (1 - r * r) ** 2
    side = sm((abs(p.x) - 0.03) / 0.07)          # nothing on the muzzle itself: only its sides and the cheeks
    face = 1 - sm((p.y - FY) / 0.16)             # the front half of the head, out to where the cheeks turn back
    top = 1 - sm((p.z - (EYE - 0.025)) / 0.025)
    return 0.022 * w * side * face * top
D = [Vector((0, -fill(p), 0)) for p in W]
print("MAX", round(max(d.length for d in D), 4), "moved", sum(1 for d in D if d.length > 1e-5))
for k in kb:
    for i in range(len(B)): k.data[i].co = k.data[i].co + inv @ D[i]
for i, v in enumerate(me.vertices): v.co = kb["Basis"].data[i].co
if PROOF:
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 600
    mat = bpy.data.materials.new("clay"); mat.diffuse_color = (0.9, 0.9, 0.9, 1)
    for o in bpy.data.objects:
        if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(mat)
    bpy.ops.object.light_add(type="SUN", rotation=(0.9, 0.3, -0.6)); bpy.context.object.data.energy = 3
    w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.3, 0.3, 0.33)
    import os
    for nm, pos in (("side", (-0.55, -0.35, 0.82)), ("front", (0, -0.6, 0.82))):
        bpy.ops.object.camera_add(location=pos); cam = bpy.context.object; cam.data.lens = 70
        d = Vector((0, FY + 0.06, 0.80)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.camera = cam; sc.render.filepath = PROOF.replace(".png", f"-{nm}.png"); bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
