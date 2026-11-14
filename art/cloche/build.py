# Studio pass on the Tripo cloche: weld, smooth, clear glass material, base at origin
import bpy, bmesh, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/pie-cloche.glb")
ms=[o for o in bpy.context.scene.objects if o.type=="MESH"]
g=bpy.data.materials.new("glass"); g.use_nodes=True
b=g.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value=(0.86,0.95,0.92,1); b.inputs["Roughness"].default_value=0.05
b.inputs["Alpha"].default_value=0.22; g.blend_method="BLEND"
for o in ms:
    bm=bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=0.0004); bm.to_mesh(o.data); bm.free()
    for p in o.data.polygons: p.use_smooth=True
    o.data.materials.clear(); o.data.materials.append(g)
ps=[o.matrix_world@v.co for o in ms for v in o.data.vertices]
c=mathutils.Vector(((min(p.x for p in ps)+max(p.x for p in ps))/2,(min(p.y for p in ps)+max(p.y for p in ps))/2,min(p.z for p in ps)))
for o in [o for o in bpy.context.scene.objects if o.parent is None]: o.location-=c
print("faces",sum(len(o.data.polygons) for o in ms))
bpy.ops.export_scene.gltf(filepath="/workspace/pie-cloche-studio.glb",export_format="GLB")
