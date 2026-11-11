# Nov 11: the guys' long sleeve crumples at the back armpit with arms down (clean at rest): arm/shoulder/spine weights jump
# between neighbours there. Laplacian-smooth those weights over the mesh in a box behind each shoulder joint, then measure the
# sharpest folds in that box, arms down, before and after. Usage: -- body.glb in.glb out.glb [ITER]
import bpy, sys, math, mathutils
a=sys.argv[sys.argv.index('--')+1:]; IT=int(a[3]) if len(a)>3 else 12
bpy.ops.wm.read_factory_settings(use_empty=True)
for f in a[:2]: bpy.ops.import_scene.gltf(filepath=f, bone_heuristic="BLENDER")
arms=[o for o in bpy.data.objects if o.type=='ARMATURE']
G=next(o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('Ward_')); GR=G.find_armature()
R0=arms[0]
def pose(on):
  for R in arms:
    for s in ("Left","Right"):
      pb=R.pose.bones[s+"Arm"]; pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=(1,0,0,0)
  bpy.context.view_layer.update()
  if not on: return
  for R in arms:
    for s,sg in (("Left",1),("Right",-1)):
      pb=R.pose.bones[s+"Arm"]; M=R.matrix_world.inverted()@mathutils.Matrix.Rotation(math.radians(68*sg),4,'Y')@R.matrix_world
      t=mathutils.Matrix.Translation(pb.head.copy()); pb.matrix=t@M.to_3x3().to_4x4()@t.inverted()@pb.matrix.copy(); bpy.context.view_layer.update()
J={s:R0.matrix_world@R0.data.bones[s+"Arm"].head_local for s in ("Left","Right")}
me=G.data
rest=[G.matrix_world@v.co for v in me.vertices]
def region(i):
  p=rest[i]; s="Left" if p.x>0 else "Right"; sg=1 if p.x>0 else -1; j=J[s]
  t=(p.x-j.x)*sg; return -0.13<t<0.09 and 0.0<(p.y-j.y)<0.2 and j.z-0.16<p.z<j.z+0.15
reg=[i for i in range(len(me.vertices)) if region(i)]
nb={i:set() for i in range(len(me.vertices))}
for e in me.edges: a0,b0=e.vertices; nb[a0].add(b0); nb[b0].add(a0)
# also weld by position: glb splits verts at seams
from mathutils.kdtree import KDTree
kd=KDTree(len(rest))
for i,p in enumerate(rest): kd.insert(p,i)
kd.balance()
for i in reg:
  for (_,j,d) in kd.find_range(rest[i],1e-5):
    if j!=i: nb[i]|=nb[j]
def folds():
  pose(True); dg=bpy.context.evaluated_depsgraph_get(); m=G.evaluated_get(dg).to_mesh()
  rs=set(reg); angs=[]
  for e in m.edges:
    if e.vertices[0] not in rs: continue
  m.calc_loop_triangles() if hasattr(m,'calc_loop_triangles') else None
  fn=[p.normal.copy() for p in m.polygons]; ef={}
  for pi,p in enumerate(m.polygons):
    if not any(v in rs for v in p.vertices): continue
    for k in p.edge_keys: ef.setdefault(k,[]).append(pi)
  for k,ps in ef.items():
    if len(ps)==2: angs.append(math.degrees(fn[ps[0]].angle(fn[ps[1]],0)))
  angs.sort(reverse=True); pose(False); return round(sum(angs[:40])/40,1), round(angs[0],1)
print("REGION",len(reg),"FOLDS before",folds())
gi={g.index:g.name for g in G.vertex_groups}
W=[{gi[g.group]:g.weight for g in v.groups} for v in me.vertices]
rs=set(reg)
for _ in range(IT):
  N={}
  for i in reg:
    acc={}; ns=[i]+list(nb[i]); 
    for j in ns:
      for k,w in W[j].items(): acc[k]=acc.get(k,0)+w
    tot=sum(acc.values()) or 1; N[i]={k:w/tot for k,w in acc.items() if w/tot>0.003}
  for i,w in N.items(): W[i]=w
# seam-split twins get one shared weight set
for i in reg:
  tw=[j for (_,j,d) in kd.find_range(rest[i],1e-5)]
  acc={}
  for j in tw:
    for k,w in W[j].items(): acc[k]=acc.get(k,0)+w/len(tw)
  for j in tw: W[j]=dict(acc)
rs2=set(reg)
for i in list(reg):
  for (_,j,d) in kd.find_range(rest[i],1e-5):
    if j not in rs2: rs2.add(j); reg.append(j)
for i in reg:
  v=me.vertices[i]
  for g in list(v.groups): G.vertex_groups[g.group].remove([i])
  s=sum(W[i].values()) or 1
  for k,w in W[i].items(): (G.vertex_groups.get(k) or G.vertex_groups.new(name=k)).add([i],w/s,'REPLACE')
print("FOLDS after",folds())
for o in bpy.data.objects: o.select_set(o==G or o==GR)
bpy.ops.export_scene.gltf(filepath=a[2], use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_skins=True)
