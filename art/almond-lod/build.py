import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/art/almond-lod/src.glb")
tot=0
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        n=sum(len(p.vertices)-2 for p in o.data.polygons)
        m=o.modifiers.new("d",'DECIMATE'); m.ratio=min(1.0,1200/max(n,1))
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier="d")
        tot+=sum(len(p.vertices)-2 for p in o.data.polygons)
print("TRIS",tot)
bpy.ops.export_scene.gltf(filepath="/workspace/art/almond-lod/almond-lod.glb",export_apply=True)
