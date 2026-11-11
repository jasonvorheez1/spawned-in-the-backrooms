# Nov 11: the guys' pants waistband poked out through untucked shirts (dark/white patches at the hem). Pull every pants vertex
# above Z0 in toward the skin (outer offset x K, inner shell kept) (blend over 2 cm below Z0), so any top worn over it covers the band.
# Usage: blender -b -P waist_snug.py -- body.glb garment.glb out.glb [Z0] [OFF]
import bpy,sys,mathutils
from mathutils.bvhtree import BVHTree
a=sys.argv[sys.argv.index('--')+1:]; Z0=float(a[3]) if len(a)>3 else 0.87; K=float(a[4]) if len(a)>4 else 0.35
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0]); body_objs=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=a[1]); new=[o for o in bpy.data.objects if o not in body_objs]
G=next(o for o in new if o.type=='MESH' and o.name.startswith('Ward_')); GR=G.find_armature()
skins=[o for o in body_objs if o.type=='MESH' and (o.name=='Body' or o.name.startswith('Skin_'))]
vs=[];fs=[]
for o in skins:
  off=len(vs); vs+=[o.matrix_world@v.co for v in o.data.vertices]; fs+=[[off+i for i in p.vertices] for p in o.data.polygons]
bvh=BVHTree.FromPolygons(vs,fs)
mw=G.matrix_world; inv=mw.inverted()
keys=G.data.shape_keys.key_blocks if G.data.shape_keys else []
moved=0; far=0
for v in G.data.vertices:
  p=mw@v.co
  if p.z<Z0-0.02: continue
  t=min(1,(p.z-(Z0-0.02))/0.02)
  loc,n,i,d=bvh.find_nearest(p)
  if loc is None: continue
  s=(p-loc).dot(n)
  if s<=0: continue
  tgt=loc+n*(s*K); np_=p.lerp(tgt,t); delta=inv.to_3x3()@(np_-p)
  v.co=v.co+delta; moved+=1; far=max(far,s)
  for k in keys: k.data[v.index].co=k.data[v.index].co+delta
print("MOVED",moved,"max gap was",round(far,4))
for o in bpy.data.objects: o.select_set(o in (G,GR))
bpy.ops.export_scene.gltf(filepath=a[2],use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_skins=True)
