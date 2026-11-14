# every pack and carton from the creator's cigarette mod -> a glb at real size (pack 8.8 cm tall), feet at bottom centre
import bpy, json, os, math
OBJ = "/workspace/art/cigs/obj"; OUT = "/workspace/art/cigs/out"; os.makedirs(OUT, exist_ok=True)
S = 0.0071  # mod units -> metres (pack 12.4 -> 0.088)
items = json.load(open(OBJ + "/items.json"))
def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
for it in items:
    clear(); n = it["name"]
    bpy.ops.wm.obj_import(filepath=f"{OBJ}/{n}.obj", forward_axis="Y", up_axis="Z")
    o = bpy.context.selected_objects[0]; bpy.context.view_layer.objects.active = o
    o.scale = (S, S, S); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    off = ((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs))
    for v in o.data.vertices: v.co.x -= off[0]; v.co.y -= off[1]; v.co.z -= off[2]
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.0002); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
    m = bpy.data.materials.new(n); m.use_nodes = True; bsdf = m.node_tree.nodes["Principled BSDF"]
    img = m.node_tree.nodes.new("ShaderNodeTexImage"); img.image = bpy.data.images.load(f"{OBJ}/{n}.png")
    m.node_tree.links.new(img.outputs["Color"], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = 0.55
    o.data.materials.clear(); o.data.materials.append(m); o.name = n
    d = o.dimensions; print(n, "%.3f x %.3f x %.3f" % tuple(d), len(o.data.polygons), "faces")
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{n}.glb", export_apply=True)
