# Thrift Mode masks refit for the new Tripo cats: the shop's own bag / shell mesh and paint, fitted around each cat's head (ears inside),
# exported skinned to the cat's own armature, weight 1 on mixamorig:Head, so the game hangs it like every garment: attachment { skin: true }.
import bpy, glob, os
from mathutils import Vector
SRC = {"bag": ("/tmp/mk/5f5897c1*.glb", "MaskBag"), "shell": ("/tmp/mk/4089c36c*.glb", "MaskShell")}
BODY = {"f": "/tmp/mk/a97800de*.glb", "m": "/tmp/mk/d3fd050e*.glb"}
OUT = "/workspace/thrift-mask"; os.makedirs(OUT, exist_ok=True); os.makedirs("/tmp/mk/proof", exist_ok=True)
def clear(): bpy.ops.wm.read_factory_settings(use_empty=True)
def head_box(sex):
    clear(); bpy.ops.import_scene.gltf(filepath=glob.glob(BODY[sex])[0])
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    b = arm.data.bones["mixamorig:Head"]; hp = arm.matrix_world @ b.head_local
    pts = []
    for o in bpy.context.scene.objects:
        if o.type != "MESH" or o.name not in ("Head", "Face"): continue
        g = o.vertex_groups.get("mixamorig:Head")
        for v in o.data.vertices:
            if any(e.group == g.index and e.weight > 0.5 for e in v.groups): pts.append(o.matrix_world @ v.co)
    core = [p for p in pts if abs(p.x) < 0.24]
    mn = Vector([min(p[i] for p in core) for i in range(3)]); mx = Vector([max(p[i] for p in core) for i in range(3)])
    top = max(p.z for p in pts); wide = max(abs(p.x) for p in pts)
    return hp, mn, mx, top, wide
for sex in ("f", "m"):
    hp, mn, mx, top, wide = head_box(sex)
    print("HEAD", sex, [round(x, 3) for x in hp], [round(x, 3) for x in mn], [round(x, 3) for x in mx], round(top, 3), round(wide, 3))
    for kind, (pat, mesh) in SRC.items():
        clear(); bpy.ops.import_scene.gltf(filepath=glob.glob(pat)[0])
        keep = bpy.data.objects[mesh]
        for o in list(bpy.context.scene.objects):
            if o != keep and o.type == "MESH": bpy.data.objects.remove(o)
        for m in keep.modifiers[:]: keep.modifiers.remove(m)
        keep.parent = None
        for o in list(bpy.context.scene.objects):
            if o != keep: bpy.data.objects.remove(o)
        if keep.data.shape_keys: keep.shape_key_clear()
        keep.vertex_groups.clear()
        bpy.context.view_layer.objects.active = keep; keep.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for v in keep.data.vertices: v.co = Vector((-v.co.x, -v.co.y, v.co.z))   # the shop paint faces +Y: turned 180 deg so the face looks out the cat front (-Y)
        vs = [v.co.copy() for v in keep.data.vertices]
        a = Vector([min(v[i] for v in vs) for i in range(3)]); b = Vector([max(v[i] for v in vs) for i in range(3)])
        # target box: wraps the head with 1.5 cm clearance, from just under the chin up over the ear tips
        pad = 0.015
        # wide enough for the ear tips, deep enough for the muzzle: nothing of the cat shows through
        tx = (2 * wide + 2 * pad) * (1.3 if kind == "shell" else 1.08); ty = (mx.y - mn.y) + 2 * pad + (0.07 if kind == "shell" else 0.03)
        tz0 = mn.z - (0.05 if kind == "shell" else 0.02); tz1 = top + (0.12 if kind == "shell" else 0.08)   # the bag's slanted lip and the shell's round crown both clear the ear tips   # the shell's egg tapers, so it drops lower to close under the chin
        s = Vector((tx / (b.x - a.x), ty / (b.y - a.y), (tz1 - tz0) / (b.z - a.z)))
        cen = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, tz0))
        for v in keep.data.vertices:
            c = v.co
            v.co = Vector(((c.x - (a.x + b.x) / 2) * s.x + cen.x, (c.y - (a.y + b.y) / 2) * s.y + cen.y, (c.z - a.z) * s.z + cen.z))
        keep.data.update()
        # her armature, bodies dropped: the mask rides the head bone alone
        bpy.ops.import_scene.gltf(filepath=glob.glob(BODY[sex])[0])
        arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
        for o in list(bpy.context.scene.objects):
            if o.type == "MESH" and o != keep: bpy.data.objects.remove(o)
        if arm.animation_data: arm.animation_data.action = None
        for a_ in list(bpy.data.actions): bpy.data.actions.remove(a_)
        g = keep.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(keep.data.vertices))), 1.0, "REPLACE")
        mw = keep.matrix_world.copy(); keep.parent = arm; keep.matrix_world = mw
        keep.modifiers.new("skin", "ARMATURE").object = arm
        sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 420
        w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.8, 0.8, 0.8)
        cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); cam.location = (0, -1.6, 0.25)
        e = bpy.data.objects.new("e", None); sc.collection.objects.link(e); e.location = (0, 0, 0.2); t = cam.constraints.new("TRACK_TO"); t.target = e
        sc.camera = cam; sc.render.filepath = f"/tmp/mk/proof/{kind}-{sex}.png"; bpy.ops.render.render(write_still=True)
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", export_skins=True, export_animations=False)
        print("MASK", kind, sex, [round(x, 3) for x in s])
