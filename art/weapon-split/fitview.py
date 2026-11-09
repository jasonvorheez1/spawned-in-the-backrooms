# art/weapon-split/fitview.py: the first-person composite offline: the fp arm (fist = its origin) and a split weapon,
# both in viewmodel space (glTF x right, y up, -z forward), shot from the eye. Args after --: arm.glb seat_x seat_y seat_z out.png
import bpy, sys, math, mathutils as mu
a = sys.argv[sys.argv.index("--") + 1:]
ARM, SEAT, OUT = a[0], mu.Vector([float(v) for v in a[1:4]]), a[4]
G = lambda x, y, z: mu.Vector((x, -z, y))           # glTF -> Blender
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(path, at):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        if o.parent is None: o.location += at
imp(ARM, G(*SEAT))
GUN = G(0, 0.03, 0.04) + G(0, 0.0319, -0.114)       # gun child + file->gun delta of the split
imp("/workspace/wpn/pistol.glb", GUN)
mat = bpy.data.materials.new("skin"); mat.diffuse_color = (0.9, 0.75, 0.65, 1)
for o in bpy.data.objects:
    if o.type == "MESH" and "tripo" not in o.data.name: o.data.materials.clear(); o.data.materials.append(mat)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
sc.render.resolution_x, sc.render.resolution_y = 960, 540
def shot(name, eye, look, fov):
    cam = bpy.data.cameras.new(name); cam.sensor_fit = "VERTICAL"; cam.angle = math.radians(fov)
    co = bpy.data.objects.new(name, cam); sc.collection.objects.link(co); co.location = eye
    co.rotation_euler = (look - eye).to_track_quat("-Z", "Y").to_euler(); sc.camera = co
    sc.render.filepath = OUT.replace(".png", f"_{name}.png"); bpy.ops.render.render(write_still=True)
l = bpy.data.lights.new("l", "SUN"); l.energy = 3.5; lo = bpy.data.objects.new("l", l); sc.collection.objects.link(lo); lo.rotation_euler = (0.6, 0.3, 0.4)
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.35, 0.33, 0.28)
grip = G(0, 0.039, 0.096)
shot("eye", G(-0.2, 0.2, 0.42), G(-0.2, 0.2, -1), 55)          # the player's view
shot("side", grip + G(0.5, 0, 0), grip, 30)                     # from the right
shot("left", grip + G(-0.5, 0.05, 0), grip, 30)                 # from the left: fingers and thumb
