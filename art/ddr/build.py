# DDR cab for the Bonus Room arcade (Shelly, Nov 11: "this should be literally just DDR").
# Source: Tripo task ab7926cc-713a-4b95-9c3a-cdc2428807c6 from her photo. Edit: drop the photo watermark disc Tripo sculpted at the stage's front-left corner.
import bpy, bmesh, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/ddr/ddr.glb")
m=[o for o in bpy.data.objects if o.type=='MESH'][0]
bm=bmesh.new(); bm.from_mesh(m.data)
W=m.matrix_world
kill=[v for v in bm.verts if (W@v.co).x>0.62 and (W@v.co).y<-0.5]
print("killed",len(kill))
bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(m.data); bm.free()
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=16
sc.render.resolution_x=sc.render.resolution_y=700
w=bpy.data.worlds.new("w"); w.color=(0.6,0.6,0.62); sc.world=w
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
cam.location=(2.6,-1.6,0.4); 
d=cam.location.copy(); import mathutils
cam.rotation_euler=(mathutils.Vector((0,0,-0.2))-d).to_track_quat('-Z','Y').to_euler()
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); l.data.energy=3; sc.collection.objects.link(l); l.rotation_euler=(0.8,0.3,0.9)
sc.render.filepath="/tmp/ddr_proof.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/ddr/ddr_clean.glb", export_apply=True)
