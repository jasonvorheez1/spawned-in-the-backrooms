# Level 11 subway stair railing: the Tripo enclosure (sub-rail.glb) with its floor slab cut out so the stairs show through
import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/art/l11sub/sub-rail.glb")
o=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me=o.data
hi=[v.co for v in me.vertices if v.co.z>0.2]
print("sides", "x+",sum(1 for c in hi if c.x>1.0),"x-",sum(1 for c in hi if c.x<-1.0),"y+",sum(1 for c in hi if c.y>0.65),"y-",sum(1 for c in hi if c.y<-0.65))
bm=bmesh.new(); bm.from_mesh(me)
kill=[f for f in bm.faces if f.calc_center_median().z < -0.38 and abs(f.calc_center_median().x) < 1.02 and abs(f.calc_center_median().y) < 0.66]
print("floor faces", len(kill), "of", len(bm.faces))
bmesh.ops.delete(bm, geom=kill, context='FACES')
bm.to_mesh(me); bm.free()
bpy.ops.export_scene.gltf(filepath="/workspace/art/l11sub/sub-rail-open.glb", export_apply=True)
