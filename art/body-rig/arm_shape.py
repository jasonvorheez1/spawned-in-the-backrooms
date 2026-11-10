import bpy,math
from mathutils import Vector
def smooth(a,b,x):t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def profile(r):
 result={}
 for side in ['Left','Right']:
  S,E,W=[r.matrix_world@r.data.bones[side+n].head_local for n in ['Arm','ForeArm','Hand']];sg=1 if S.x>0 else-1;points=[]
  for o in bpy.context.scene.objects:
   if o.type!='MESH'or o.name not in ['Skin_upperarms','Skin_forearms']:continue
   for v in o.data.vertices:
    p=o.matrix_world@v.co
    if p.x*sg>0:points.append(p)
  rows=[];length=(W.x-S.x)*sg
  for i in range(19):
   u=.025+(length-.05)*i/18;near=sorted(points,key=lambda p:abs((p.x-S.x)*sg-u))[:18];ys=sorted(p.y for p in near);zs=sorted(p.z for p in near);cy=(ys[0]+ys[-1])/2;cz=(zs[0]+zs[-1])/2;rows.append([u,cy,cz,max(.018,(ys[-1]-ys[0])/2),max(.018,(zs[-1]-zs[0])/2)])
  result[side]={'S':list(S),'E':list(E),'W':list(W),'rows':rows}
 return result

def refine_arms(r,data,sex):
 for o in bpy.context.scene.objects:
  if o.type!='MESH'or not o.vertex_groups or o.name in ['Head','Skin_neck']or o.name.startswith(('Beard','Blush','Hat_','Eyew_')):continue
  mw=o.matrix_world;inv=mw.inverted();masks=[]
  for v in o.data.vertices:
   p=mw@v.co;ws={o.vertex_groups[g.group].name:g.weight for g in v.groups};side='Left'if p.x*data['Left']['S'][0]>0 else'Right';D=data[side];S,E,W=map(Vector,[D['S'],D['E'],D['W']]);sg=1 if S.x>0 else-1;u=(p.x-S.x)*sg;total=(W.x-S.x)*sg;weight=sum(value for name,value in ws.items()if name.startswith(side)and any(name.startswith(side+n)for n in ['Arm','ForeArm','Hand']))
   masks.append((side,u,weight>.1 and -.02<u<total+.01))
  collections=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[];collections.append(o.data.vertices)
  for points in collections:
   old=[v.co.copy()for v in points]
   for i,v in enumerate(points):
    side,_,active=masks[i]
    if not active:continue
    D=data[side];S,E,W=map(Vector,[D['S'],D['E'],D['W']]);sg=1 if S.x>0 else-1;p=mw@old[i];u=(p.x-S.x)*sg;upper=(E.x-S.x)*sg;total=(W.x-S.x)*sg;lower=total-upper;rows=D['rows'];a=rows[0];b=rows[-1]
    for j in range(len(rows)-1):
     if rows[j][0]<=u<=rows[j+1][0]:a,b=rows[j],rows[j+1];break
    f=max(0,min(1,(u-a[0])/max(.001,b[0]-a[0])));_,cy,cz,ry,rz=[a[k]+(b[k]-a[k])*f for k in range(5)];dy,dz=p.y-cy,p.z-cz;rad=math.hypot(dy,dz)
    if rad>.001:
     ny,nz=dy/rad,dz/rad;current=1/math.sqrt((ny/ry)**2+(nz/rz)**2)
     if u<=upper:
      t=max(0,min(1,u/upper));radius=.047+(.033-.047)*smooth(.25,1,t)+.003*math.exp(-((t-.35)/.22)**2)
     else:
      t=max(0,min(1,(u-upper)/lower));radius=.033*(1-t)+.021*t+.004*math.sin(math.pi*t)*math.exp(-1.5*t)
     if sex=='m':radius*=1.2
     target=1/math.sqrt((ny/(radius*.94))**2+(nz/radius)**2);blend=smooth(-.015,.045,u)*(1-smooth(total-.035,total+.005,u));shift=target-current;centerY=S.y+.004*(1-max(0,min(1,u/total)));centerZ=S.z+.006*(1-max(0,min(1,u/total)));p.y+=(ny*shift+centerY-cy)*blend;p.z+=(nz*shift+centerZ-cz)*blend
    elbow_shift=.020
    if 0<u<total:
     newu=u*(upper+elbow_shift)/upper if u<=upper else upper+elbow_shift+(u-upper)*(lower-elbow_shift)/lower;p.x+=sg*(newu-u)
    v.co=inv@p
  if o.data.has_custom_normals:
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
   try:bpy.ops.mesh.customdata_custom_splitnormals_clear()
   except RuntimeError:pass
  for poly in o.data.polygons:poly.use_smooth=True
 # A longer upper arm and shorter forearm, with the elbow kept on the same T-pose axis.
 bpy.context.view_layer.objects.active=r;bpy.ops.object.mode_set(mode='EDIT')
 for side in ['Left','Right']:
  sg=1 if data[side]['S'][0]>0 else-1;delta=r.matrix_world.inverted().to_3x3()@Vector((sg*.020,0,0));r.data.edit_bones[side+'Arm'].tail+=delta;r.data.edit_bones[side+'ForeArm'].head+=delta
 bpy.ops.object.mode_set(mode='OBJECT')

def weld_skin_normals():
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'and o.name.startswith('Skin_')];sums={}
 def key(p):return tuple(round(x,4)for x in p)
 for o in meshes:
  for face in o.data.polygons:
   ps=[o.matrix_world@o.data.vertices[i].co for i in face.vertices]
   if len(ps)<3:continue
   normal=(ps[1]-ps[0]).cross(ps[2]-ps[0])
   for p in ps:k=key(p);sums[k]=sums.get(k,Vector())+normal
 for o in meshes:
  transform=o.matrix_world.to_3x3().transposed();normals=[(transform@sums[key(o.matrix_world@v.co)]).normalized()for v in o.data.vertices]
  for face in o.data.polygons:face.use_smooth=True
  o.data.normals_split_custom_set_from_vertices(normals)
