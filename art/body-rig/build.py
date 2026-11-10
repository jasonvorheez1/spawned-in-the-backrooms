import bpy,sys,os,json,math
from mathutils import Vector
from mathutils.kdtree import KDTree
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from repair import reshape,repair,skin_surface,finish_skin
from finish_fit import finish_fit
from arm_shape import profile,refine_arms,weld_skin_normals
W=os.path.abspath(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else os.path.abspath('work/body-rig');OUT=W+'/out';os.makedirs(OUT,exist_ok=True);inputs=json.load(open(W+'/inputs.json'));fields={};profiles={}
def limit_weights(o):
 for v in o.data.vertices:
  ws=sorted([(g.group,g.weight)for g in v.groups if g.weight>1e-6],key=lambda x:-x[1])[:4];total=sum(w for _,w in ws)
  if not total:continue
  for idx in [g.group for g in v.groups]:
   try:o.vertex_groups[idx].remove([v.index])
   except RuntimeError:pass
  for idx,w in ws:o.vertex_groups[idx].add([v.index],w/total,'REPLACE')
def export(name):
 for o in bpy.context.scene.objects:o.select_set(o.type in ['ARMATURE','MESH'])
 bpy.ops.export_scene.gltf(filepath=OUT+'/'+name+'.glb',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_morph_normal=True,export_skins=True,export_format='GLB')
for name in ['human_f','human_m','body_f','body_m']+[n for n in inputs if n.startswith('Ward_')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=W+'/'+name+'-plain.glb');r=next(o for o in bpy.data.objects if o.type=='ARMATURE');isbody=name.startswith(('human_','body_'));skin=skin_surface()if isbody else None
 # Unchanged neck/head bones keep their bind matrices and all animation axes remain untouched.
 reshape(r);repair(r)
 if isbody:
  fields[name]=finish_skin(r,skin);json.dump(fields,open(W+'/surface-fields.json','w'))
 elif name.startswith('Ward_'):
  data=fields['human_'+name[-1]];kd=KDTree(len(data))
  for i,(p,_)in enumerate(data):kd.insert(Vector(p),i)
  kd.balance()
  for o in bpy.context.scene.objects:
   if o.type!='MESH':continue
   mw=o.matrix_world;inv=mw.inverted();deltas=[]
   for v in o.data.vertices:
    near=kd.find_n(mw@v.co,3);weight=sum(1/max(.002,d)**2 for _,_,d in near)
    delta=sum((Vector(data[i][1])*(1/max(.002,d)**2)for _,i,d in near),Vector())/weight if near and near[0][2]<.065 else Vector();deltas.append(inv.to_3x3()@delta)
   collections=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[];collections.append(o.data.vertices)
   for points in collections:
    for v,d in zip(points,deltas):v.co+=d
   if o.data.has_custom_normals:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    try:bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except RuntimeError:pass
   for poly in o.data.polygons:poly.use_smooth=True
 for o in bpy.context.scene.objects:
  if o.type=='MESH':limit_weights(o)
 finish_fit(r,neck=isbody,waist=name.rsplit('_',1)[0]in json.load(open(W+'/bottom-parts.json')),overalls=name.startswith('Ward_overalls_'))
 if name.startswith('human_'):profiles[name[-1]]=profile(r)
 if not name.startswith('body_'):
  refine_arms(r,profiles[name[-1]],name[-1])
  if isbody:weld_skin_normals()
 export(name);print('BUILT',name,flush=True)
json.dump(fields,open(W+'/surface-fields.json','w'))
