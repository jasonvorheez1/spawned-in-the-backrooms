# Ferry's map desk, split: the Tripo desk (/cdn/value.d58e97…glb, fetched to /tmp/desk/desk.glb) cut by loose part into
# desk, map, books, mug, compass, pencils; each exported with its origin at its own bottom centre. offsets.json = where each sat on the desk.
import bpy, bmesh, json, os
exec(open(os.path.join(os.path.dirname(__file__), "split_groups.py")).read())
groups['map'] += groups.pop('other')
OUT = "/tmp/desk/out"; os.makedirs(OUT, exist_ok=True)
Z0 = -0.38
offs = {}
for name, ps in groups.items():
    keep = set(i for p in ps for i in p['v'])
    bpy.ops.object.select_all(action='DESELECT')
    o = SRC.copy(); o.data = SRC.data.copy(); bpy.context.collection.objects.link(o)
    b2 = bmesh.new(); b2.from_mesh(o.data); b2.verts.ensure_lookup_table()
    bmesh.ops.delete(b2, geom=[v for v in b2.verts if v.index not in keep], context='VERTS')
    b2.to_mesh(o.data); b2.free()
    o.data.transform(o.matrix_world); o.matrix_world.identity()
    b = bb(ps); cx, cy = (b[0]+b[1])/2, (b[2]+b[3])/2; bz = b[4] if name != 'desk' else Z0
    for v in o.data.vertices: v.co.x -= cx; v.co.y -= cy; v.co.z -= bz
    o.name = f"desk_{name}"
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", use_selection=True, export_apply=True)
    # glTF frame: x = x, y = up, z = -blender y
    offs[name] = {"x": round(cx, 4), "y": round(bz - Z0, 4), "z": round(-cy, 4), "size": [round(b[1]-b[0], 3), round(b[5]-bz, 3), round(b[3]-b[2], 3)], "tris": len(o.data.polygons)}
    bpy.data.objects.remove(o)
json.dump(offs, open(f"{OUT}/offsets.json", "w"), indent=1); print(json.dumps(offs))
