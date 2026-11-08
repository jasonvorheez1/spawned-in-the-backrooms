import bpy, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/l61-vend-snack.glb")
o=[x for x in bpy.context.scene.objects if x.type=="MESH"][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
vs=[o.matrix_world@v.co for v in o.data.vertices]
mn=mathutils.Vector([min(v[i] for v in vs) for i in range(3)]); mx=mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
print("bbox",tuple(mn),tuple(mx))
s=1.83/(mx.z-mn.z)
c=mathutils.Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
R=mathutils.Matrix.Rotation(-1.5708,3,'Z')
for v in o.data.vertices: v.co=R@((v.co-c)*s)
o.data.update()
# proof from -Y (blender front)
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=400
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
cam.location=(1.5,-3.5,1.4); cam.rotation_euler=(1.45,0,0.4)
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.8,0,0.4); l.data.energy=4
w=bpy.data.worlds.new("w"); w.color=(0.5,0.5,0.5); sc.world=w
sc.render.filepath="/tmp/vend_proof.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
bpy.ops.export_scene.gltf(filepath="/workspace/l61-vend-snack-fixed.glb",export_apply=True)
