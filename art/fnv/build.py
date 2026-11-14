# picks.yml + nif2json output -> one glb per kept piece: real size, feet at bottom centre, welded, smooth, textured
import bpy, bmesh, json, os, sys, math

PICKS = json.load(open("/workspace/art/picks.json"))  # picks.yml as json (blender has no yaml): python3 -c "import yaml,json;..."
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for pack, items in PICKS.items():
    J = f"/workspace/art/{pack}/json"; OUT = f"/workspace/art/{pack}/out"; os.makedirs(OUT, exist_ok=True)
    for name, size in items.items():
        if ONLY and name not in ONLY: continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        d = json.load(open(f"{J}/{name}.json"))
        mats = {}; objs = []
        for i, s in enumerate(d["shapes"]):
            me = bpy.data.meshes.new(f"{name}{i}"); bm = bmesh.new()
            vs = [bm.verts.new(v) for v in s["v"]]; bm.verts.ensure_lookup_table()
            uvl = bm.loops.layers.uv.new("UVMap")
            for t in s["tris"]:
                if len(set(t)) < 3: continue
                try: f = bm.faces.new([vs[k] for k in t])
                except ValueError: continue
                for lp, k in zip(f.loops, t): lp[uvl].uv = s["uv"][k]
            bm.to_mesh(me); bm.free()
            key = s["tex"] or "plain"
            if key not in mats:
                m = bpy.data.materials.new(os.path.splitext(key)[0]); m.use_nodes = True
                b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.6
                if s["png"] and os.path.exists(s["png"]):
                    im = m.node_tree.nodes.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(s["png"])
                    m.node_tree.links.new(im.outputs["Color"], b.inputs["Base Color"])
                    if s["alpha"] and im.image.channels == 4:
                        m.node_tree.links.new(im.outputs["Alpha"], b.inputs["Alpha"]); m.blend_method = "CLIP" if hasattr(m, "blend_method") else None
                else:
                    b.inputs["Base Color"].default_value = (0.75, 0.75, 0.75, 1) if "glass" not in key else (0.8, 0.9, 0.95, 1)
                mats[key] = m
            me.materials.append(mats[key])
            o = bpy.data.objects.new(f"{name}{i}", me); bpy.context.scene.collection.objects.link(o); objs.append(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1: bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active; o.name = name
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.01); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.shade_auto_smooth(angle=math.radians(40))
        V = [v.co for v in o.data.vertices]
        lo = [min(v[i] for v in V) for i in range(3)]; hi = [max(v[i] for v in V) for i in range(3)]
        ext = [hi[i] - lo[i] for i in range(3)]
        k = (size["len"] / max(ext)) if isinstance(size, dict) else size / ext[2]
        for v in o.data.vertices:
            v.co.x = (v.co.x - (lo[0] + hi[0]) / 2) * k; v.co.y = (v.co.y - (lo[1] + hi[1]) / 2) * k; v.co.z = (v.co.z - lo[2]) * k
        print(name, "%.2f x %.2f x %.2f m" % tuple(e * k for e in ext), len(o.data.polygons), "faces")
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_apply=True)
