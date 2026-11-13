# art/weapon-split/pistols.py: each fitted pistol variant cut into frame, slide and magazine (as pistol.py did the service pistol),
# so the slide kicks on a shot and the magazine drops in the reload. Cuts are fractions of each gun's own box.
# usage: blender -b -P pistols.py -- pocket9 govt45 target22   (reads /tmp/weapons/<kind>.glb from art/weapons/build.py,
# writes /workspace/wsplit/<kind>-{frame,slide,mag}.glb and bc.json: each part's bottom-centre in glTF axes)
import bpy, bmesh, json, sys, os, mathutils as mu
CUT = {  # slide: faces above zs of the height and within ls of the length from the rear; mag: faces below zm of the height
    "pocket9": {"zs": 0.70, "ls": 1.0, "zm": 0.07},
    "govt45": {"zs": 0.74, "ls": 1.0, "zm": 0.05},
    "target22": {"zs": 0.70, "ls": 0.42, "zm": 0.06},
}
OUT = "/workspace/wsplit"; os.makedirs(OUT, exist_ok=True)
kinds = sys.argv[sys.argv.index("--") + 1:]
rep = json.load(open(f"{OUT}/bc.json")) if os.path.exists(f"{OUT}/bc.json") else {}
for kind in kinds:
    c = CUT[kind]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/tmp/weapons/{kind}.glb")
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    for o in bpy.context.scene.objects: o.select_set(o == src)
    bpy.context.view_layer.objects.active = src
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = src.data; vs = [v.co for v in me.vertices]
    mn = mu.Vector([min(v[i] for v in vs) for i in range(3)]); mx = mu.Vector([max(v[i] for v in vs) for i in range(3)])
    H = mx.z - mn.z; L = mx.y - mn.y  # Blender: rear at +y max (glTF z 0), muzzle toward -y
    def which(p):
        h = (p.z - mn.z) / H; l = (mx.y - p.y) / L
        if h > c["zs"] and l <= c["ls"]: return "slide"
        if h < c["zm"]: return "mag"
        return "frame"
    part = [which(p.center) for p in me.polygons]
    rep[kind] = {}
    for name in ("frame", "slide", "mag"):
        o = src.copy(); o.data = me.copy(); o.name = name; bpy.context.scene.collection.objects.link(o)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f, pp in zip(bm.faces, part) if pp != name], context="FACES")
        bm.to_mesh(o.data); bm.free()
        if name == "mag":  # a steel body up the grip, hidden while seated, seen as it drops
            gl = [v for v in vs if (v.z - mn.z) / H < 0.12]
            gh = [v for v in vs if 0.25 < (v.z - mn.z) / H < 0.35]
            if gl and gh:
                lo = sum(gl, mu.Vector()) / len(gl); hi = sum(gh, mu.Vector()) / len(gh); hi.z = mn.z + H * 0.55
                bmb = bmesh.new(); bmesh.ops.create_cube(bmb, size=1.0); body = bpy.data.meshes.new("mb"); bmb.to_mesh(body); bmb.free()
                mb = bpy.data.objects.new("mb", body); bpy.context.scene.collection.objects.link(mb)
                ax = hi - lo; mb.scale = (0.018, 0.026, ax.length)
                mb.rotation_euler = mu.Vector((0, 0, 1)).rotation_difference(ax.normalized()).to_euler(); mb.location = (lo + hi) / 2
                if o.data.materials: mb.data.materials.append(o.data.materials[0])
                for x in bpy.context.scene.objects: x.select_set(False)
                mb.select_set(True); o.select_set(True); bpy.context.view_layer.objects.active = o
                bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); bpy.ops.object.join()
        for x in bpy.context.scene.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        ov = [v.co for v in o.data.vertices]
        if not ov: print("EMPTY", kind, name); continue
        a = mu.Vector([min(v[i] for v in ov) for i in range(3)]); b = mu.Vector([max(v[i] for v in ov) for i in range(3)])
        rep[kind][name] = [round((a.x + b.x) / 2, 4), round(a.z, 4), round(-(a.y + b.y) / 2, 4)]
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{name}.glb", use_selection=True, export_apply=True)
        print(kind, name, len(o.data.polygons), "faces")
    rep[kind]["whole"] = [round((mn.x + mx.x) / 2, 4), round(mn.z, 4), round(-(mn.y + mx.y) / 2, 4)]
json.dump(rep, open(f"{OUT}/bc.json", "w")); print("BC", json.dumps(rep))
