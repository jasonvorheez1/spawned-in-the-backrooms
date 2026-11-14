# 3D Model Studio pass on the Tripo wet floor sign: weld, decimate, shade smooth, base at origin, 1k textures
import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/wet-sign.glb")
ms=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in ms:
    bpy.context.view_layer.objects.active=o
    bm=bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=0.0004); bm.to_mesh(o.data); bm.free()
    n=len(o.data.polygons)
    if n>6000:
        d=o.modifiers.new("dec","DECIMATE"); d.ratio=6000/n; bpy.ops.object.modifier_apply(modifier="dec")
    w=o.modifiers.new("wn","WEIGHTED_NORMAL"); w.keep_sharp=True; bpy.ops.object.modifier_apply(modifier="wn")
    for m in o.data.materials:
        if m and m.use_nodes:
            b=m.node_tree.nodes.get("Principled BSDF")
            if b: b.inputs["Roughness"].default_value=0.55
for im in bpy.data.images:
    if im.size[0]>1024: im.scale(1024,1024)
import mathutils
zs=[ (o.matrix_world@v.co) for o in ms for v in o.data.vertices]
mn=min(p.z for p in zs); cx=(min(p.x for p in zs)+max(p.x for p in zs))/2; cy=(min(p.y for p in zs)+max(p.y for p in zs))/2
for o in [o for o in bpy.context.scene.objects if o.parent is None]: o.location-=mathutils.Vector((cx,cy,mn))
print("faces",sum(len(o.data.polygons) for o in ms))
bpy.ops.export_scene.gltf(filepath="/workspace/wet-sign-studio.glb",export_format="GLB",export_image_format="JPEG",export_jpeg_quality=85)
