# Clippers back bar and bentwood stools: Tripo meshes refined to true scale, feet origin, decimated, re-exported.
import bpy, mathutils, sys
SRC="/workspace/l61clip"; OUT="/workspace/l61clip/out"
import os; os.makedirs(OUT,exist_ok=True)
# name: (target height m, max tris)
SET={"backbar_raw":(3.1,16000),"stool_raw":(1.05,5000)}
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.render.resolution_x=sc.render.resolution_y=520
for name,(H,tris) in SET.items():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc=bpy.context.scene
    sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.render.resolution_x=sc.render.resolution_y=520
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    ms=[o for o in sc.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active=ms[0]
    if len(ms)>1: bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active
    for p in list(sc.objects):
        if p!=o and p.type!='MESH': pass
    o.parent=None
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    vs=[v.co for v in o.data.vertices]
    mn=mathutils.Vector((min(v.x for v in vs),min(v.y for v in vs),min(v.z for v in vs)))
    mx=mathutils.Vector((max(v.x for v in vs),max(v.y for v in vs),max(v.z for v in vs)))
    s=H/(mx.z-mn.z)
    off=mathutils.Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
    for v in o.data.vertices: v.co=(v.co-off)*s
    n=len(o.data.polygons)
    if n>tris:
        d=o.modifiers.new("d","DECIMATE"); d.ratio=tris/n
        bpy.ops.object.modifier_apply(modifier="d")
    bpy.ops.object.shade_smooth_by_angle(angle=0.6)
    for m in o.data.materials:
        if m and m.use_nodes:
            b=m.node_tree.nodes.get("Principled BSDF")
            if b: b.inputs["Roughness"].default_value=max(0.45,b.inputs["Roughness"].default_value)
    o.name=name
    dims=o.dimensions; print("DIM",name,round(dims.x,2),round(dims.y,2),round(dims.z,2),"tris",len(o.data.polygons))
    # proof at 1.7 m eye with a 1.8 m man-sized post for scale
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2,depth=1.8,location=(max(dims.x,dims.y)/2+0.5,0,0.9))
    w=bpy.data.worlds.new("w"); w.color=(0.5,0.5,0.5); sc.world=w
    cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
    L=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(L); L.rotation_euler=(0.9,0.2,-0.6)
    cam.location=(2.6*max(1,dims.z),-3.4*max(1,dims.z),1.7); dv=mathutils.Vector((0,0,dims.z/2))-cam.location; cam.rotation_euler=dv.to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"/tmp/clip_{name}.png"; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(sc.objects["Cylinder"]); bpy.data.objects.remove(cam); bpy.data.objects.remove(L)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb",export_apply=True,use_selection=True)
# textures to 1024 so the bar loads light
