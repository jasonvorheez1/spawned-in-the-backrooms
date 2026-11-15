# Cowboy hat source for the cat wardrobe (Shelly Nov 14: Backrooms Robotics robots are cartoonish western gunslingers).
# Z-up, opening down, front on -Y, as art/cat-wardrobe/hats.py expects. A lathe crown pinched on top, a wide brim curled up at the sides, a band.
import bpy, bmesh, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
def lathe(profile, seg=48, name="p"):
    bm = bmesh.new(); rings = []
    for (r, z) in profile:
        ring = [bm.verts.new((r * math.cos(2*math.pi*i/seg), r * math.sin(2*math.pi*i/seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg; bm.faces.new((a[i], a[j], b[j], b[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o
# crown: outer up, top, inner down (open bottom)
crown = [(0.50, 0.0), (0.49, 0.25), (0.47, 0.45), (0.42, 0.58), (0.30, 0.64), (0.0, 0.62)]
co = lathe(crown, name="crown")
# brim: a disc ring with thickness, inner hole for the head
brim = [(0.46, 0.015), (0.95, 0.015), (1.0, 0.04), (0.95, 0.06), (0.46, 0.06)]
bo = lathe(brim, name="brim")
band = [(0.505, 0.06), (0.51, 0.15), (0.50, 0.16), (0.495, 0.06)]
bd = lathe(band, name="band")
# pinch the crown: a crease down the top front-to-back, dents at the front sides
for v in co.data.vertices:
    x, y, z = v.co
    if z > 0.45:
        t = (z - 0.45) / 0.2
        v.co.z -= 0.13 * t * math.exp(-(x / 0.12) ** 2)       # center crease
        if y < 0: v.co.x *= 1 - 0.12 * t * (-y / 0.5)          # front pinch
# brim: curl up hard at the sides, dip a little front and back
for v in bo.data.vertices:
    x, y, z = v.co; r = math.hypot(x, y)
    if r > 0.5:
        k = (r - 0.5) / 0.5
        side = (x / r) ** 2
        v.co.z += 0.32 * side * k * k - 0.05 * (1 - side) * k
        v.co.y *= 0.88
for o, col in ((co, (0.36, 0.22, 0.12, 1)), (bo, (0.36, 0.22, 0.12, 1)), (bd, (0.08, 0.06, 0.05, 1))):
    sol = o.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.03 if o is co else 0.0
    sub = o.modifiers.new("sub", "SUBSURF"); sub.levels = 1
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons: p.use_smooth = True
    mat = bpy.data.materials.new("cloth"); mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = col
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    o.data.materials.append(mat)
bpy.ops.object.select_all(action="SELECT"); bpy.context.view_layer.objects.active = co; bpy.ops.object.join()
# glTF exports Y-up: rotate so Blender Z-up survives the round trip (hats.py reimports via gltf, which restores Z-up)
bpy.ops.export_scene.gltf(filepath="/workspace/hats/cowboy.glb", export_apply=True)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); bpy.context.collection.objects.link(cam)
cam.location = (2.2, -2.6, 1.6); cam.rotation_euler = (math.radians(68), 0, math.radians(40)); bpy.context.scene.camera = cam
l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); bpy.context.collection.objects.link(l); l.rotation_euler = (0.6, 0.3, 0.8)
w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.55, 1)
s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 16; s.render.resolution_x = s.render.resolution_y = 512
s.render.filepath = "/tmp/cowboy-proof.png"; bpy.ops.render.render(write_still=True)
