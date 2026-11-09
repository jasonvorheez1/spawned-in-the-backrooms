"""Blender finish for the catalog's two separate mask assets: sewn rims and straps."""
import bpy,sys,math
from mathutils import Vector
src,dst=sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=src)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');meshes=[o for o in bpy.data.objects if o.type=='MESH'];p=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector(tuple(min(v[i] for v in p) for i in range(3)));hi=Vector(tuple(max(v[i] for v in p) for i in range(3)));c=(lo+hi)/2
mat=bpy.data.materials.new('Mask_binding');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.075,.055,.035,1);bs.inputs['Roughness'].default_value=.87
for level,width in [(lo.z+.018,.005),(c.z,.0035)]:
 verts=[];faces=[];n=64
 for z in [level-width,level+width]:
  for k in range(n):a=(2*math.pi*k/n if level<c.z else math.pi*k/(n-1));verts.append([c.x+(hi.x-lo.x)*.51*math.cos(a),c.y+(hi.y-lo.y)*.51*math.sin(a),z])
 for k in range(n if level<c.z else n-1):faces.append((k,(k+1)%n,(k+1)%n+n,k+n))
 me=bpy.data.meshes.new('Stitched mask binding');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Mask_sewn_binding',me);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 uv=me.uv_layers.new(name='Binding UV')
 for loop in me.loops:uv.data[loop.index].uv=((loop.vertex_index%n)/(n-1),loop.vertex_index//n)
 bpy.context.view_layer.objects.active=o;o.select_set(True);sd=o.modifiers.new('Binding thickness','SOLIDIFY');sd.thickness=.002;bpy.ops.object.modifier_apply(modifier=sd.name)
 vg=o.vertex_groups.new(name='Head');vg.add(list(range(len(o.data.vertices))),1,'REPLACE');o.parent=rig;arm=o.modifiers.new('Mask skin','ARMATURE');arm.object=rig
 for poly in me.polygons:poly.use_smooth=True
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_animations=False,export_skins=True,export_morph=True)
bpy.ops.wm.save_as_mainfile(filepath=dst+'.blend')
