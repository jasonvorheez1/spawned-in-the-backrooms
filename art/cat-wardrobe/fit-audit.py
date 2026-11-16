# Nov 16 (Shelly "then readjust all clothing type fits"): every Tripo garment on the CURRENT body (the cheek-filled glbs), front + side,
# clay body, blue garment, so a gap, a clip, a float or a sunk piece reads at a glance. blender -b -P fit-audit.py -- <f|m> <dir>
import bpy, sys, os, glob, math
A = sys.argv[sys.argv.index("--") + 1:]; SEX, D = A
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"{D}/body-{SEX}.glb")
base = set(bpy.data.objects)
clay = bpy.data.materials.new("clay"); clay.diffuse_color = (0.85, 0.82, 0.78, 1)
blue = bpy.data.materials.new("blue"); blue.diffuse_color = (0.15, 0.35, 0.85, 1)
for o in base:
    if o.type == "ARMATURE": o.data.pose_position = "REST"
    if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(clay)
sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "CYCLES"
sc.cycles.samples = 6; sc.render.resolution_x, sc.render.resolution_y = 300, 380
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.55, 0.55, 0.58)
bpy.ops.object.light_add(type="SUN", rotation=(0.8, 0.2, -0.5)); bpy.context.object.data.energy = 3.5
cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = 1.35
co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co
for f in sorted(glob.glob(f"{D}/g_*_{SEX}.glb")):
    name = os.path.basename(f)[2:-6]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == "ARMATURE": o.data.pose_position = "REST"
        if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(blue)
    hat = any(k in name for k in ("hat", "cap", "beanie", "bow", "flower", "crown", "beret", "souwester", "helm", "headphones", "cowboy", "hachimaki", "goggles", "visor", "glasses", "shades", "specs"))
    cz, sc_ = (0.95, 0.55) if hat else (0.55, 1.3)
    cam.ortho_scale = sc_
    for tag, loc, rot in (("a", (0, -3, cz), (math.pi / 2, 0, 0)), ("b", (3, 0, cz), (math.pi / 2, 0, math.pi / 2))):
        co.location, co.rotation_euler = loc, rot
        sc.render.filepath = f"{D}/r/{SEX}_{name}_{tag}.png"; bpy.ops.render.render(write_still=True)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
