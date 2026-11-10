import bpy,math
from mathutils import Vector
def finish_fit(r,neck=False,waist=False,overalls=False):
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  if not waist and not(neck and o.name=='Skin_neck'):continue
  mw=o.matrix_world;inv=mw.inverted();ps=[mw@v.co for v in o.data.vertices]
  if not ps:continue
  lo=min(p.z for p in ps);hi=max(p.z for p in ps);center=r.matrix_world@((r.data.bones.get('Neck')or r.data.bones['Head'])if neck else r.data.bones['Hips']).head_local
  if waist and overalls:hi=center.z*1.155
  def smooth(a,b,x):t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
  collections=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[];collections.append(o.data.vertices)
  for points in collections:
   old=[v.co.copy()for v in points]
   for v,p0 in zip(points,old):
    p=mw@p0
    if neck:
     f=1-smooth(lo+.005,lo+.04,p.z);p.z-=.004*f;p.x=center.x+(p.x-center.x)*(1+.03*f);p.y=center.y+(p.y-center.y)*(1+.03*f)
    else:
     f=smooth(hi-.13,hi-.035,p.z)*(1-smooth(hi+.025,hi+.085,p.z));rad=Vector((p.x-center.x,p.y-center.y,0))
     if rad.length>1e-5:p+=rad.normalized()*(.012*f)
    v.co=inv@p
  if neck:
   spine=o.vertex_groups.get('Spine2')or o.vertex_groups.new(name='Spine2');ng=o.vertex_groups.get('Neck')
   for v,p in zip(o.data.vertices,ps):
    f=1-smooth(lo+.005,lo+.04,p.z);weights={o.vertex_groups[g.group].name:g.weight for g in v.groups};transfer=weights.get('Neck',0)*.5*f
    if ng:ng.add([v.index],weights.get('Neck',0)-transfer,'REPLACE')
    spine.add([v.index],weights.get('Spine2',0)+transfer,'REPLACE')
  if o.data.has_custom_normals:
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
   try:bpy.ops.mesh.customdata_custom_splitnormals_clear()
   except RuntimeError:pass
  for p in o.data.polygons:p.use_smooth=True
