import bpy,bmesh,math,os,sys,json
from mathutils import Vector
W=sys.argv[sys.argv.index('--')+1] if '--'in sys.argv else os.getcwd()
OUT=os.path.join(W,'out');os.makedirs(OUT,exist_ok=True)
PI=math.pi

def clean_normals(o):
 if o.type!='MESH':return
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 if o.data.has_custom_normals:
  try:bpy.ops.mesh.customdata_custom_splitnormals_clear()
  except RuntimeError:pass
 for p in o.data.polygons:p.use_smooth=True
 for e in o.data.edges:e.use_edge_sharp=False

def export(name,objects=None):
 bpy.ops.object.select_all(action='DESELECT')
 for o in (objects or list(bpy.context.scene.objects)):
  if o.type in ['ARMATURE','MESH']:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_morph=True,export_morph_normal=True,export_apply=False,export_materials='EXPORT',export_yup=True)

def mat(name,col,rough=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;m.diffuse_color=(*col,1);return m

def head_polish(sex):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(W,'human_'+sex+'.glb'))
 h=bpy.data.objects.get('Head');mw=h.matrix_world;mi=mw.inverted();ids={i for i,m in enumerate(h.data.materials)if m.name.split('.')[0]=='Head_Skin'};skin={v for p in h.data.polygons if p.material_index in ids for v in p.vertices}
 eyeids={i for i,m in enumerate(h.data.materials)if m.name.split('.')[0]=='Iris'};iris={v for p in h.data.polygons if p.material_index in eyeids for v in p.vertices};pts=[mw@h.data.vertices[i].co for i in iris];eye=sum(p.z for p in pts)/len(pts);chin=min((mw@h.data.vertices[i].co).z for i in skin)
 neighbors={i:set() for i in skin}
 for e in h.data.edges:
  a,b=e.vertices
  if a in skin and b in skin:neighbors[a].add(b);neighbors[b].add(a)
 keys=h.data.shape_keys.key_blocks
 for key in keys:
  if key.name.startswith(('X_','M_','HT_','Jaw','Nose','Cheek','Brow','Chin','Face','Head','Basis')):
   original=[v.co.copy()for v in key.data]
   for i in skin:
    p=mw@original[i];front=max(0,min(1,(.10-p.y)/.07));lower=max(0,min(1,(eye+.015-p.z)/.10));center=math.exp(-(p.x/.026)**2-((p.z-(eye-.055))/.038)**2)
    p.y += (.010 if sex=='m' else .0025)*center*front
    p.x *= 1-(.055 if sex=='m' else .012)*front*lower
    if sex=='m':p.z+=.004*max(0,1-(p.z-chin)/.06)*front
    if len(neighbors[i])>=4 and front>0 and chin+.015<p.z<eye+.08:
     avg=sum((mw@original[j]for j in neighbors[i]),Vector())/len(neighbors[i]);p=p.lerp(avg,.18*front)
    key.data[i].co=mi@p
 # Seat teeth behind the resting lips, retaining their expression deltas.
 teethids={i for i,m in enumerate(h.data.materials)if m.name.split('.')[0]=='Teeth'};teeth={v for p in h.data.polygons if p.material_index in teethids for v in p.vertices}
 for key in keys:
  for i in teeth:
   p=mw@key.data[i].co;p.y+=.008;key.data[i].co=mi@p
 # Dedicated iris UVs: each oval uses the entire texture, independent of the source atlas.
 uv=h.data.uv_layers.active or h.data.uv_layers.new(name='UVMap')
 for sign in [-1,1]:
  vs=[i for i in iris if (mw@h.data.vertices[i].co).x*sign>0];ps=[mw@h.data.vertices[i].co for i in vs];xmin,xmax=min(p.x for p in ps),max(p.x for p in ps);zmin,zmax=min(p.z for p in ps),max(p.z for p in ps);vset=set(vs)
  for poly in h.data.polygons:
   if poly.material_index not in eyeids:continue
   for li in poly.loop_indices:
    vi=h.data.loops[li].vertex_index
    if vi in vset:
     p=mw@h.data.vertices[vi].co;uv.data[li].uv=((p.x-xmin)/(xmax-xmin),(p.z-zmin)/(zmax-zmin))
 # Small painted anime iris: dark limbal ring, black pupil, colored radial fibers, two highlights.
 image=bpy.data.images.new('PolishedIris',width=256,height=256);pixels=[]
 for y in range(256):
  for x in range(256):
   u=(x+.5)/256;v=(y+.5)/256;rx=(u-.5)*2;ry=(v-.5)*2;rad=math.hypot(rx,ry);angle=math.atan2(ry,rx);fiber=(math.sin(angle*55+rad*22)+math.sin(angle*87-rad*15))*.025
   value=.025 if rad<.32 else .12 if rad>.91 else .55+.30*(1-v)+fiber
   if ((u-.32)/.10)**2+((v-.74)/.13)**2<1:value=1
   if ((u-.68)/.04)**2+((v-.28)/.055)**2<1:value=.95
   pixels.extend([value,value,value,1])
 image.pixels.foreach_set(pixels);image.filepath_raw=os.path.join(OUT,'anime-iris.png');image.file_format='PNG';image.save();image.pack()
 for i in eyeids:
  m=h.data.materials[i];m.use_nodes=True;n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=image;p=m.node_tree.nodes.get('Principled BSDF');m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color']);p.inputs['Roughness'].default_value=.38
 for o in bpy.context.scene.objects:clean_normals(o)
 export('human_'+sex)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'human_'+sex+'-polished.blend'))
 print('POLISHED human',sex,flush=True)

# Smooth, closed leaf-shaped locks. These are shaded volumes rather than intersecting alpha cards.
def lock(verts,faces,points,width,thick=.004):
 off=len(verts);n=10;cs=8
 for i in range(n+1):
  t=i/n;co=(1-t)**3*points[0]+3*(1-t)**2*t*points[1]+3*(1-t)*t*t*points[2]+t**3*points[3];d=3*(1-t)**2*(points[1]-points[0])+6*(1-t)*t*(points[2]-points[1])+3*t*t*(points[3]-points[2]);d.normalize();side=Vector((1,0,0));side=(side-d*side.dot(d)).normalized();normal=d.cross(side).normalized();w=width*max(.015,math.sin(PI*(.06+.94*t))**.7)*(1-.55*t)
  for j in range(cs):
   a=2*PI*j/cs;verts.append(co+side*(math.cos(a)*w)+normal*(math.sin(a)*thick*max(.06,1-t)))
 for i in range(n):
  for j in range(cs):a=off+i*cs+j;b=off+i*cs+(j+1)%cs;faces.append((a,b,b+cs,a+cs))
 faces.append(tuple(off+j for j in reversed(range(cs))));faces.append(tuple(off+n*cs+j for j in range(cs)))

def hair(sex,style,hat=False):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(W,'human_'+sex+'.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');head=bpy.data.objects.get('Head');ps=[head.matrix_world@v.co for v in head.data.vertices];top=max(p.z for p in ps);eye=1.615 if sex=='m'else 1.487;cz=top-.125;cy=.095 if sex=='f'else .105;rx=.102 if sex=='f'else .111;ry=.125 if sex=='f'else .137;rz=.137;v=[];f=[]
 # Fitted scalp with a curved hairline, no exposed bald cap through the locks.
 rings=16;segs=40
 for i in range(rings+1):
  for j in range(segs):
   phi=j/segs*2*PI;front=(1+math.cos(phi))/2;end=2.0-front*.94;t=.025+(end-.025)*i/rings;v.append(Vector((rx*math.sin(t)*math.sin(phi),cy-ry*math.sin(t)*math.cos(phi),cz+rz*math.cos(t))))
 for i in range(rings):
  for j in range(segs):a=i*segs+j;b=i*segs+(j+1)%segs;f.append((a,b,b+segs,a+segs))
 # Broad crown layers bridge the cap and fringe without exposing a smooth helmet.
 for j in range(11):
  phi=j/11*2*PI;side=math.sin(phi);back=-math.cos(phi);root=Vector((.012*side,cy+.012*back,top+.015));end=Vector((rx*side*1.03,cy+ry*back*1.03,top-.10));lock(v,f,[root,Vector((rx*.55*side,cy+ry*.55*back,top+.023)),Vector((rx*1.08*side,cy+ry*1.08*back,top-.025)),end],.030,.007)
 # Bangs sweep across the forehead, with enough separation to read as layered hair.
 for i in range(9):
  u=(i-4)/4;x=u*rx*.88;asym=.014*math.sin(i*2.1);tip=eye+.026+abs(u)*.02+asym
  if style in ['curtains','ponytail','twintails']:tip+=.025*(1-abs(u));shift=.025*(1 if u>0 else -1)
  else:shift=.018*math.sin(i*.7)
  if style=='crop':tip+=.035
  root=Vector((x*.7,cy-.045,top-.012));mid=Vector((x*.95,cy-ry*.90,top-.045));end=Vector((x+shift,cy-ry-.012,tip));lock(v,f,[root,mid,Vector((x+shift*.5,cy-ry-.025,tip+.035)),end],.024 if style!='crop'else .018,.006)
 # Layered temple and back locks; lower layers taper to a soft silhouette.
 length={'crop':.12,'fluffy':.19,'curtains':.20,'bob':.25,'wolfcut':.30,'long':.48,'ponytail':.19,'twintails':.20}[style]
 for j in range(17):
  phi=.85+j/16*(2*PI-1.7);side=math.sin(phi);back=-math.cos(phi);x=rx*side;y=cy+ry*back;tail=length*(.85+.12*math.sin(j*2.7));root=Vector((x*.64,cy+ry*.62*back,top-.045));end=Vector((x*(1.06+.06*math.sin(j)),y*.98,top-tail));lock(v,f,[root,Vector((x*1.15,y,top-.10)),Vector((x*1.12,y+.015,top-tail*.75)),end],.024,.006)
 if style in ['ponytail','twintails']:
  for sign in ([0]if style=='ponytail'else[-1,1]):
   for j in range(7):
    x=sign*.105+(j-3)*.008;root=Vector((x,cy+.11,top-.07));lock(v,f,[root,Vector((x+sign*.045,cy+.20,top-.10)),Vector((x+sign*.055,cy+.17,top-.35)),Vector((x+sign*.05+(j-3)*.008,cy+.13,top-.44+.012*abs(j-3)))],.019,.006)
 if hat:
  for p in v:p.z=min(p.z,top-.065)
 mesh=bpy.data.meshes.new('AnimeHair');mesh.from_pydata(v,[],f);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new('AnimeHair',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(mat('hair',(.055,.026,.032),.6));group=o.vertex_groups.new(name='Head');group.add(list(range(len(v))),1,'REPLACE');mod=o.modifiers.new('Rig','ARMATURE');mod.object=rig;clean_normals(o)
 export('hair_'+sex+'_'+style+('_hat'if hat else ''),[rig,o]);print('HAIR',sex,style,hat,flush=True)

def furry(species,sex):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=os.path.join(W,species+'_'+sex+'-plain.glb'))
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  skinids={i for i,m in enumerate(o.data.materials)if m.name.split('.')[0]in ['fur','belly','tip']};ids={v for p in o.data.polygons if p.material_index in skinids for v in p.vertices};neighbors={i:set()for i in ids}
  for e in o.data.edges:
   a,b=e.vertices
   if a in ids and b in ids:neighbors[a].add(b);neighbors[b].add(a)
  keys=o.data.shape_keys.key_blocks if o.data.shape_keys else [None]
  for key in keys:
   points=key.data if key else o.data.vertices;old=[v.co.copy()for v in points]
   for i in ids:
    ns=[j for j in neighbors[i]if (old[j]-old[i]).length<.045]
    if len(ns)>=4:points[i].co=old[i].lerp(sum((old[j]for j in ns),Vector())/len(ns),.12)
  clean_normals(o)
 export(species+'_'+sex)
 print('FURRY',species,sex,flush=True)

args=sys.argv[sys.argv.index('--')+2:]if'--'in sys.argv else[]
if not args or args[0]=='human':
 for sex in ['f','m']:head_polish(sex)
if not args or args[0]=='hair':
 for sex in ['f','m']:
  for style in ['crop','curtains','fluffy','bob','wolfcut','long','ponytail','twintails']:
   for hat in [False,True]:hair(sex,style,hat)

if args and args[0]=='fur':
 for species in ['cat','dog','fox','bunny','bear','deer','wolf']:
  for sex in ['m','f']:furry(species,sex)
