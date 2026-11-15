# Kitsune mask (l178_kitsune_mask): the Tripo fox mask fitted over each cat's face, skinned weight 1 to mixamorig:Head,
# exported per body like the Thrift masks (cat-wardrobe.yml masks.kitsune). Proof renders with the body in.
import bpy, glob, os
from mathutils import Vector
SRC = "/workspace/tripo178/l178_kitsune_mask.glb"
BODY = {"f": "/tmp/mk/value.a97800de*.glb", "m": "/tmp/mk/value.d3fd050e*.glb"}
OUT = "/workspace/kitsune"; os.makedirs(OUT, exist_ok=True)
def clear(): bpy.ops.wm.read_factory_settings(use_empty=True)
for sex in ("f", "m"):
    clear(); bpy.ops.import_scene.gltf(filepath=glob.glob(BODY[sex])[0])
    pts = []
    for o in bpy.context.scene.objects:
        if o.type != "MESH" or o.name not in ("Head", "Face"): continue
        g = o.vertex_groups.get("mixamorig:Head")
        for v in o.data.vertices:
            if any(e.group == g.index and e.weight > 0.5 for e in v.groups): pts.append(o.matrix_world @ v.co)
    core = [p for p in pts if abs(p.x) < 0.24]
    mn = Vector([min(p[i] for p in core) for i in range(3)]); mx = Vector([max(p[i] for p in core) for i in range(3)])
    face = [p for p in core if p.y < (mn.y + mx.y) / 2]                       # the front half of the head
    fw = 2 * sorted(abs(p.x) for p in face if p.z < (mn.z + mx.z) / 2 + 0.08)[-1]   # cheek width, ears excluded
    clear(); bpy.ops.import_scene.gltf(filepath=SRC)
    ms = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    keep = bpy.context.view_layer.objects.active
    for o in list(bpy.context.scene.objects):
        if o != keep: bpy.data.objects.remove(o)
    keep.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    keep.vertex_groups.clear(); keep.name = "KitsuneMask"
    vs = [v.co.copy() for v in keep.data.vertices]
    a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
    s = fw * 1.0 / (b.x - a.x)                                                # uniform: the mask keeps its own shape
    cz = mn.z + (mx.z - mn.z) * 0.52                                           # centred on the eyes
    back = mn.y + 0.36 * (mx.y - mn.y)                                   # its rim sits on the cheeks, the snout over the muzzle
    for v in keep.data.vertices:
        c = v.co
        v.co = Vector(((c.x - (a.x + b.x) / 2) * s, back - (b.y - c.y) * s, (c.z - (a.z + b.z) / 2) * s + cz))
    keep.data.update()
    bpy.ops.import_scene.gltf(filepath=glob.glob(BODY[sex])[0])
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    if arm.animation_data: arm.animation_data.action = None
    g = keep.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(keep.data.vertices))), 1.0, "REPLACE")
    mw = keep.matrix_world.copy(); keep.parent = arm; keep.matrix_world = mw
    keep.modifiers.new("skin", "ARMATURE").object = arm
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 420
    w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.8, 0.8, 0.8)
    hz = (mn.z + mx.z) / 2
    for nm, loc in (("front", (0, -2.2, hz)), ("side", (-2.2, 0.0, hz)), ("top", (-1.2, -1.2, hz + 1.2))):
        cam = bpy.data.objects.new(nm, bpy.data.cameras.new(nm)); sc.collection.objects.link(cam); cam.location = loc
        e = bpy.data.objects.new("e" + nm, None); sc.collection.objects.link(e); e.location = (0, (mn.y + mx.y) / 2, hz)
        t = cam.constraints.new("TRACK_TO"); t.target = e; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"; cam.data.lens = 70
        sc.camera = cam; sc.render.filepath = f"/tmp/mk/kit-{sex}-{nm}.png"; bpy.ops.render.render(write_still=True)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o != keep: bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/kitsune-{sex}.glb", export_skins=True, export_animations=False)
    print("KIT", sex, round(s, 4), round(fw, 3), [round(x, 3) for x in mn], [round(x, 3) for x in mx])
