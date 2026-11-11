# Skin the fitted Tripo cat hairstyles (/workspace/hair/cat/<sex>_<style>.glb, built by art/critter-hair-tripo/fit.py) to the current cat's Head bone,
# one glb per style with the cat's armature, slot "hair" the game tints. Prints the head-box offset between fit body and current body as a fit check.
import bpy, glob, os
SRC = {"f": "/tmp/fl/f.glb", "m": "/tmp/fl/m.glb"}; FIT = {"f": "/workspace/hair/cat/body_f.glb", "m": "/workspace/hair/cat/body_m.glb"}
def head_box(p):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
    H = bpy.data.objects.get("Head") or max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: max((o.matrix_world @ v.co).z for v in o.data.vertices))
    vs = [H.matrix_world @ v.co for v in H.data.vertices]
    return [round(min(v[i] for v in vs), 4) for i in range(3)] + [round(max(v[i] for v in vs), 4) for i in range(3)]
for sex in ("f", "m"):
    print("HEADBOX", sex, "fit", head_box(FIT[sex]), "now", head_box(SRC[sex]))
    for hp in sorted(glob.glob(f"/workspace/hair/cat/{sex}_*.glb")):
        if hp.endswith("-raw.glb"): continue
        st = os.path.basename(hp)[2:-4]
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC[sex])
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        if arm.animation_data: arm.animation_data.action = None
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
        for o in list(bpy.data.objects):
            if o.type == "MESH": bpy.data.objects.remove(o)
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=hp)
        hair = [o for o in bpy.data.objects if o not in before and o.type == "MESH"][0]
        for o in [o for o in bpy.data.objects if o not in before and o is not hair]: bpy.data.objects.remove(o)
        M = hair.matrix_world.copy(); hair.parent = None; hair.data.transform(M); hair.matrix_world.identity()
        hair.name = "hair"; hair.vertex_groups.clear()
        g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")
        hair.parent = arm; hair.modifiers.new("skin", "ARMATURE").object = arm
        for m in hair.data.materials: m.name = "hair"
        bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"/workspace/cathair/{st}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False, export_image_format="JPEG")
        print("HAIR", sex, st, len(hair.data.polygons))
