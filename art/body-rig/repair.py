import bpy,sys,os,math,json
from mathutils import Vector,Quaternion
W=os.path.abspath(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else os.path.abspath('work/body-rig')
def ss(a,b,x):t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def skin_surface():
 from mathutils.kdtree import KDTree
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'and o.name.startswith('Skin_')];items=[];lookup={}
 for o in meshes:
  for v in o.data.vertices:lookup[(o.name,v.index)]=len(items);items.append((o,v.index,o.matrix_world@v.co))
 kd=KDTree(len(items))
 for i,(_,_,p)in enumerate(items):kd.insert(p,i)
 kd.balance();parent=list(range(len(items)))
 def root(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 for i,(_,_,p)in enumerate(items):
  for _,j,_ in kd.find_range(p,.002):
   a,b=root(i),root(j)
   if a!=b:parent[b]=a
 groups={}
 for i in range(len(items)):groups.setdefault(root(i),[]).append(i)
 gids={i:g for g,ids in enumerate(groups.values())for i in ids};clusters=list(groups.values());neighbors=[set()for _ in clusters]
 for o in meshes:
  for e in o.data.edges:
   a,b=[gids[lookup[(o.name,v)]]for v in e.vertices]
   if a!=b:neighbors[a].add(b);neighbors[b].add(a)
 return items,clusters,neighbors,gids,lookup

def finish_skin(r,skin):
 items,clusters,neighbors,gids,lookup=skin;points=[];weights=[]
 for ids in clusters:
  points.append(sum((items[i][0].matrix_world@items[i][0].data.vertices[items[i][1]].co for i in ids),Vector())/len(ids));w={}
  for i in ids:
   o,vi,_=items[i]
   for g in o.data.vertices[vi].groups:
    n=o.vertex_groups[g.group].name;w[n]=w.get(n,0)+g.weight/len(ids)
  weights.append(w)
 # Taubin pairs soften coarse elbow/shoulder contours without shrinking the limb.
 movable=[]
 for p in points:
  side='Left'if p.x>0 else'Right';J=r.matrix_world@r.data.bones[side+'Arm'].head_local;K=r.matrix_world@r.data.bones[side+'Leg'].head_local
  movable.append(abs(p.x)>.105 and p.z>J.z-.12 or abs(p.z-K.z)<.085)
 for _ in range(4):
  for factor in [.45,-.47]:
   old=points;points=[p.lerp(sum((old[j]for j in neighbors[i]),Vector())/len(neighbors[i]),factor)if movable[i]and len(neighbors[i])>=3 else p for i,p in enumerate(old)]
 field=[]
 for ids,p,w in zip(clusters,points,weights):
  previous=sum((items[i][0].matrix_world@items[i][0].data.vertices[items[i][1]].co for i in ids),Vector())/len(ids);field.append((list(previous),list(p-previous)))
  top=sorted(w.items(),key=lambda kv:-kv[1])[:4];total=sum(v for _,v in top)or 1
  for i in ids:
   o,vi,_=items[i];v=o.data.vertices[vi];local=o.matrix_world.inverted()@p;delta=local-v.co;v.co=local
   if o.data.shape_keys:
    for key in o.data.shape_keys.key_blocks:key.data[vi].co+=delta
   for g in o.vertex_groups:
    try:g.remove([vi])
    except RuntimeError:pass
   for n,value in top:(o.vertex_groups.get(n)or o.vertex_groups.new(name=n)).add([vi],value/total,'REPLACE')
 # A skin-mask seam shares normals as well as coordinates and weights.
 normals=[Vector()for _ in clusters]
 for o in {o.name:o for o,_,_ in items}.values():
  for poly in o.data.polygons:
   vs=[o.matrix_world@o.data.vertices[i].co for i in poly.vertices]
   if len(vs)<3:continue
   n=(vs[1]-vs[0]).cross(vs[2]-vs[0])
   for vi in poly.vertices:normals[gids[lookup[(o.name,vi)]]]+=n
 for o in {o.name:o for o,_,_ in items}.values():
  for poly in o.data.polygons:poly.use_smooth=True
  transform=o.matrix_world.to_3x3().transposed();ns=[(transform@normals[gids[lookup[(o.name,v.index)]]]).normalized()for v in o.data.vertices];o.data.normals_split_custom_set_from_vertices(ns)
 print('SKIN_SURFACE',len(items),'vertices',len(clusters),'shared points',flush=True)
 return field

def reshape(r):
 # Round the overbuilt cap around the existing joint; preserve the T-pose bind and all animation axes.
 joints={side:r.matrix_world@r.data.bones[side+'Arm'].head_local for side in ['Left','Right']}
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or not o.name.startswith(('Skin_','Under_','Top_','Ward_','Body')) or o.name=='Skin_neck':continue
  gi={g.index:g.name for g in o.vertex_groups};mw=o.matrix_world;inv=mw.inverted();masks=[]
  for v in o.data.vertices:
   weights={gi[g.group]:g.weight for g in v.groups};p=mw@v.co;side='Left'if p.x*joints['Left'].x>=0 else'Right';J=joints[side];sg=1 if J.x>0 else-1;t=(p.x-J.x)*sg;rad=math.hypot(p.y-J.y,p.z-J.z);arm=weights.get(side+'Arm',0)+weights.get(side+'Shoulder',0)
   g=ss(-.115,-.015,t)*math.exp(-((t-.01)/.085)**2)*(1-ss(.18,.26,rad)) if arm>.06 else 0
   masks.append((J,g))
  collections=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[]
  collections.append(o.data.vertices)
  for points in collections:
   old=[v.co.copy()for v in points]
   for i,v in enumerate(points):
    J,g=masks[i]
    if not g:continue
    p=mw@old[i];p.z=J.z+(p.z-J.z)*(1-.72*g);p.y=J.y+(p.y-J.y)*(1-.20*g);v.co=inv@p

def repair(r):
 changed=0
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or not o.name.startswith(('Skin_','Under_','Top_','Bot_','Ward_','Body')) or o.name=='Skin_neck':continue
  names={g.index:g.name for g in o.vertex_groups};mw=o.matrix_world
  for side in ['Left','Right']:
   sg=1 if (r.matrix_world@r.data.bones[side+'Arm'].head_local).x>0 else -1
   J=r.matrix_world@r.data.bones[side+'Arm'].head_local;E=r.matrix_world@r.data.bones[side+'ForeArm'].head_local
   required=[side+'Arm',side+'Shoulder','Spine2',side+'ForeArm']
   for n in required:
    if n not in o.vertex_groups:o.vertex_groups.new(name=n)
   for v in o.data.vertices:
    p=mw@v.co
    if p.x*sg<0:continue
    weights={names.get(g.group,o.vertex_groups[g.group].name):g.weight for g in v.groups};arm=side+'Arm';sh=side+'Shoulder';fore=side+'ForeArm';far=sum(w for n,w in weights.items()if n.startswith(side+'Hand')or any(n.startswith(side+x)for x in ['Thumb','Index','Middle','Ring','Pinky']))
    t=(p.x-J.x)*sg;rad=math.hypot(p.y-J.y,p.z-J.z)
    if -.125<t<.15 and rad<.195 and weights.get(fore,0)+far<.08:
     pool=sum(weights.get(n,0)for n in [arm,sh,'Spine2','Spine1','Spine','Neck'])
     if pool>.6 and weights.get(arm,0)+weights.get(sh,0)>.08:
      top=ss(-.035,.055,p.z-J.z);wa=ss(-.035,.035,t)*(1-top)+ss(-.115,-.025,t)*top;wa*=pool;rest=pool-wa
      for n in [arm,sh,'Spine2','Spine1','Spine','Neck']:
       if n in o.vertex_groups:
        try:o.vertex_groups[n].remove([v.index])
        except RuntimeError:pass
      o.vertex_groups[arm].add([v.index],wa,'REPLACE');o.vertex_groups[sh].add([v.index],rest*.32,'REPLACE');o.vertex_groups['Spine2'].add([v.index],rest*.68,'REPLACE');changed+=1
    elif abs(p.x-E.x)<.055 and math.hypot(p.y-E.y,p.z-E.z)<.14 and far<.04:
     pool=weights.get(arm,0)+weights.get(fore,0)
     if pool>.8:
      f=ss(-.045,.045,(p.x-E.x)*sg);o.vertex_groups[arm].add([v.index],pool*(1-f),'REPLACE');o.vertex_groups[fore].add([v.index],pool*f,'REPLACE')
   # Knees share weight across a short bend zone rather than a hard island seam.
   K=r.matrix_world@r.data.bones[side+'Leg'].head_local
   for v in o.data.vertices:
    p=mw@v.co
    if p.x*sg<0 or abs(p.z-K.z)>.065:continue
    weights={o.vertex_groups[g.group].name:g.weight for g in v.groups};up=side+'UpLeg';leg=side+'Leg';pool=weights.get(up,0)+weights.get(leg,0)
    if pool>.9:
     for n in [up,leg]:
      if n not in o.vertex_groups:o.vertex_groups.new(name=n)
     f=ss(K.z+.05,K.z-.05,p.z);o.vertex_groups[up].add([v.index],pool*(1-f),'REPLACE');o.vertex_groups[leg].add([v.index],pool*f,'REPLACE')
 print('REPAIRED',changed,flush=True)

def pose(r,kind):
 for p in r.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion()
 def rotate(name,axis,angle):
  b=r.data.bones[name];q=b.matrix_local.to_quaternion();r.pose.bones[name].rotation_quaternion=q.inverted()@Quaternion(Vector(axis),math.radians(angle))@q
 for side,sg in [('Left',1),('Right',-1)]:rotate(side+'Arm',(0,1,0),sg*82)
 if kind=='bend':
  for side,sg in [('Left',1),('Right',-1)]:
   rotate(side+'ForeArm',(0,0,1),sg*85);rotate(side+'UpLeg',(1,0,0),-45);rotate(side+'Leg',(1,0,0),85)
 bpy.context.view_layer.update()

def proof(sex,fix):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=W+'/human_'+sex+'-plain.glb');r=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 spec=json.load(open(W+'/look-'+sex+'.json'))['spec'];spec['model']['parts']['Skin_hips']={'visible':True}
 for part in (['tank']if sex=='f'else['tee'])+['shorts','boots']:
  before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=W+'/Ward_'+part+'_'+sex+'-plain.glb')
  for o in set(bpy.context.scene.objects)-before:
   if o.type=='MESH':
    for mod in o.modifiers:
     if mod.type=='ARMATURE':mod.object=r
    o.parent=r
 for o in list(bpy.context.scene.objects):
  if o.type=='ARMATURE'and o!=r:bpy.data.objects.remove(o,do_unlink=True)
 if fix:
  skin=skin_surface();reshape(r);repair(r);finish_skin(r,skin)
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  o.hide_render=not(o.name.startswith('Ward_')or o.name=='Head'or spec['model']['parts'].get(o.name,{}).get('visible',False))
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=spec['morph'].get(k.name,0)
 for m in bpy.data.materials:
  p=m.node_tree.nodes.get('Principled BSDF')if m.use_nodes else None
  if not p:continue
  col=(.64,.4,.29,1)if m.name.startswith(('Head_Skin','Body_Skin'))else (.04,.055,.07,1)if m.name=='under'else (0.65,.30,.025,1)if m.name.startswith('cloth_top')else (.025,.03,.04,1)if m.name.startswith(('cloth_bottom','cloth_shoes'))else None
  if col:
   for link in list(p.inputs['Base Color'].links):m.node_tree.links.remove(link)
   p.inputs['Base Color'].default_value=col;p.inputs['Roughness'].default_value=.75
 target=Vector((0,0,.85));bpy.ops.object.camera_add(location=(.6,-3.5,1.4));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.95;sc=bpy.context.scene;sc.camera=cam
 for loc,power in [((2,-3,4),240),((-2,-1,3),130),((1,2,4),220)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=3;l.rotation_euler=(target-l.location).to_track_quat('-Z','Y').to_euler()
 sc.world=bpy.data.worlds.new('Studio');sc.world.color=(.15,.15,.15);sc.render.engine='CYCLES';sc.cycles.samples=16;sc.cycles.use_denoising=True;sc.view_settings.view_transform='AgX';sc.render.resolution_x=512;sc.render.resolution_y=768;sc.render.resolution_percentage=100
 for kind in ['stand','bend']:
  pose(r,kind);sc.render.filepath=W+'/'+sex+'-'+('after'if fix else'before')+'-'+kind+'.png';bpy.ops.render.render(write_still=True)
 if fix:bpy.ops.wm.save_as_mainfile(filepath=W+'/rig-'+sex+'.blend')
if __name__=='__main__':
 for sex in ['f','m']:
  for fix in [False,True]:proof(sex,fix)
