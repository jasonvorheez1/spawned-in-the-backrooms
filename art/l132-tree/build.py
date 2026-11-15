# Lumiria hollow oak: Tripo source -> deepen hollow, turn hollow to engine +Z (south), bake size 16 m tall.
import bpy,math,mathutils,numpy as np
SRC="/workspace/l132sq/tree.glb"; OUT="/workspace/l132sq/tree-final.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
o=[x for x in bpy.context.scene.objects if x.type=='MESH'][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
n=0
for v in o.data.vertices:
    c=v.co
    if -0.21<c.y<0.01 and c.z<-1.12 and 0.40<c.x<0.63:
        c.x-=0.36; n+=1
print("PUSHED",n)
# hollow centre y=-0.1 -> 0 ; then rotate +X -> -Y (engine +Z)
M=mathutils.Matrix.Diagonal((5.6,5.6,16/3.5,1))@mathutils.Matrix.Rotation(math.radians(-90),4,'Z')@mathutils.Matrix.Translation((0,0.1,1.75))
o.data.transform(M); o.data.update()
bpy.ops.export_scene.gltf(filepath=OUT,export_apply=True)
sc=bpy.context.scene
sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.render.resolution_x=700; sc.render.resolution_y=700
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[1].default_value=1.2
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
for name,loc,tg in (("a",(0,-11,1.7),(0,0,2.2)),("b",(0,-30,6),(0,0,7))):
    cam.location=loc; cam.rotation_euler=(mathutils.Vector(tg)-cam.location).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"/tmp/treef-{name}.png"; bpy.ops.render.render(write_still=True)
