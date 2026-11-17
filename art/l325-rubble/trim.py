# Trims the flat grey base sheets (the heap source's plinth) off the mound and pile, re-renders, exports.
import bpy, bmesh, math, sys
from mathutils import Vector
SRC = {"mound": "/tmp/rb/1e059aea4fa96f4b965268b5e8dc344ea48d153f3cd278b0e1e134abe7418ce1.glb", "pile": "/tmp/rb/ad7125f717a9144ce9918439f2ea0d70976324a96d20d429b97c6b9e19987ded.glb"}
for n, path in SRC.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    o = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    seen = set(); kill = []
    for f0 in bm.faces:
        if f0.index in seen: continue
        st = [f0]; isl = []; seen.add(f0.index)
        while st:
            f = st.pop(); isl.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen: seen.add(g.index); st.append(g)
        vs = {v for f in isl for v in f.verts}
        zs = [v.co.z for v in vs]; ext = max(max(v.co.x for v in vs) - min(v.co.x for v in vs), max(v.co.y for v in vs) - min(v.co.y for v in vs))
        tot = sum(f.calc_area() for f in isl); flat = sum(f.calc_area() for f in isl if abs(f.normal.z) > 0.95)
        if min(zs) < 0.05 and max(zs) < 0.85 and ext > 4 and flat / max(tot, 1e-6) > 0.9: kill += isl
    print(n, "killing", len(kill), "faces")
    bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(o.data); bm.free()
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8; sc.render.resolution_x = 900; sc.render.resolution_y = 600
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 1.5
    R = max(o.dimensions)
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (R * .9, -R * .9, R * .35); cam.rotation_euler = (Vector((0, 0, R * .05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f"/tmp/rb/{n}_t.png"; bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"/workspace/l325-rubble/{n}.glb", use_selection=True, export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
