# Nov 11: hold a top's hem band at least MIN off the skin below Z1 so a pants waistband (pulled in by waist_snug.py) stays under it.
# Usage: blender -b -P shirt_out.py -- body.glb garment.glb out.glb [Z1] [MIN]
import bpy,sys
from mathutils.bvhtree import BVHTree
a=sys.argv[sys.argv.index('--')+1:]; Z1=float(a[3]) if len(a)>3 else 0.98; MIN=float(a[4]) if len(a)>4 else 0.011
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0]); B=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=a[1]); new=[o for o in bpy.data.objects if o not in B]
G=next(o for o in new if o.type=='MESH' and o.name.startswith('Ward_')); GR=G.find_armature()
sk=[o for o in B if o.type=='MESH' and (o.name=='Body' or o.name.startswith('Skin_'))]
vs=[];fs=[]
for o in sk:
  off=len(vs); vs+=[o.matrix_world@v.co for v in o.data.vertices]; fs+=[[off+i for i in p.vertices] for p in o.data.polygons]
bvh=BVHTree.FromPolygons(vs,fs); mw=G.matrix_world; inv=mw.inverted()
keys=G.data.shape_keys.key_blocks if G.data.shape_keys else []
m=0
for v in G.data.vertices:
  p=mw@v.co
  if p.z>Z1: continue
  t=min(1,(Z1-p.z)/0.02)
  loc,n,i,d=bvh.find_nearest(p)
  if loc is None: continue
  s=(p-loc).dot(n)
  if s>=MIN or s<-0.004: continue
  delta=inv.to_3x3()@(n*((MIN-s)*t)); v.co=v.co+delta; m+=1
  for k in keys: k.data[v.index].co=k.data[v.index].co+delta
print("MOVED",m)
for o in bpy.data.objects: o.select_set(o in (G,GR))
bpy.ops.export_scene.gltf(filepath=a[2],use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_skins=True)
