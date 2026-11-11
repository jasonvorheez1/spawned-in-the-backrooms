# Tripo cat body preview (Shelly #206589/#206618). CHEST: bust push, a bit fuller, PG and cartoonish (#205392, 13:11 "a bit bigger").
import bpy, math, os, mathutils
from mathutils import Vector
SRC = os.environ.get("BODY", "/workspace/tripo-cat/cat-body.glb"); CHEST = float(os.environ.get("CHEST", "1"))
OUT = "/workspace/art/critter-cute/proof"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ms = [o for o in bpy.data.objects if o.type == "MESH"]
pts = [o.matrix_world @ v.co for o in ms for v in o.data.vertices]
zmin = min(p.z for p in pts); zmax = max(p.z for p in pts); h = zmax - zmin
# the torso band: find the narrowest-width row under the head to locate the chest front
def band(z0, z1): return [p for p in pts if z0 < p.z < z1 and abs(p.y) < .03]
cz = zmin + h * float(os.environ.get("CZ", ".47"))
row = band(cz - .004, cz + .004); fx = max(p.x for p in row) if row else .03
print("CHEST z", round(cz, 4), "front x", round(fx, 4), "h", round(h, 4))
R = h * .045; A = h * .03 * CHEST; SX = h * .06
for o in ms:
    mw = o.matrix_world; inv = mw.inverted()
    for v in o.data.vertices:
        p = mw @ v.co
        if p.x < fx - h * .07: continue
        for s in (-1, 1):
            c = Vector((fx, s * SX * .5, cz))
            d2 = ((p.y - c.y) ** 2 + ((p.z - c.z) * 1.15) ** 2) / (R * R)
            if d2 > 4: continue
            w = math.exp(-d2 * 1.6) * max(0, 1 - (fx - p.x) / (h * .07))
            p = p + Vector((A * w, s * A * .15 * w, -A * .25 * w))
        v.co = inv @ p
    o.data.update()
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 420; sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.85, .84, .82, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(L); L.data.energy = 3
c = Vector((0, 0, zmin + h * .5))
for i, yaw in enumerate((0, 90, 45)):
    a = math.radians(yaw); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = c + d * 2.0 * h; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); L.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{OUT}/body_chest_{i}.png"; bpy.ops.render.render(write_still=True)
if os.environ.get("EXPORT"): bpy.ops.export_scene.gltf(filepath="/workspace/tripo-cat/cat-body-chest.glb", export_apply=True)
