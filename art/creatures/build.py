# Tripo smiler + lurker: decimate to <=40k faces (weights kept), smiler gets an emissive mask (only eyes/teeth glow).
import bpy, numpy as np, sys, os
def run(src, dst, ratio, glow):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o.name.startswith("Icosphere"): bpy.data.objects.remove(o); continue
        if o.type == "MESH":
            m = o.modifiers.new("dec", "DECIMATE"); m.ratio = ratio
            bpy.context.view_layer.objects.active = o
            # armature modifier must stay last: move decimate first
            while o.modifiers[0].name != "dec": bpy.ops.object.modifier_move_up(modifier="dec")
            bpy.ops.object.modifier_apply(modifier="dec")
            print("faces", o.name, len(o.data.polygons))
    if glow:
        for mat in bpy.data.materials:
            if not mat.use_nodes: continue
            nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
            tex = next((l.from_node for l in nt.links if l.to_socket == bsdf.inputs["Base Color"]), None)
            img = tex.image; w, h = img.size; px = np.array(img.pixels[:]).reshape(h, w, 4)
            lum = px[..., :3].mean(-1); mask = np.clip((lum - 0.55) / 0.2, 0, 1)
            em = bpy.data.images.new("glow", w, h); out = np.zeros_like(px); out[..., :3] = mask[..., None]; out[..., 3] = 1
            em.pixels[:] = out.ravel(); em.file_format = "PNG"; em.pack()
            et = nt.nodes.new("ShaderNodeTexImage"); et.image = em
            nt.links.new(et.outputs["Color"], bsdf.inputs["Emission Color"]); bsdf.inputs["Emission Strength"].default_value = 3.0
            for s in ("Roughness",):
                for l in list(nt.links):
                    if l.to_socket == bsdf.inputs[s]: nt.links.remove(l)
                bsdf.inputs[s].default_value = 0.85
            bsdf.inputs["Metallic"].default_value = 0.0
            for l in list(nt.links):
                if l.to_socket == bsdf.inputs["Metallic"]: nt.links.remove(l)
    bpy.ops.export_scene.gltf(filepath=dst, export_apply=False, export_skins=True)
T = "/workspace/tr/"
run(T + "smiler-rig.glb", T + "smiler-final.glb", 0.86, True)
run(T + "lurker-rig.glb", T + "lurker-final.glb", 0.85, False)
