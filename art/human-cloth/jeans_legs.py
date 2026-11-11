# men's jeans: the two legs shared their inseam verts at x=0 all the way to the ankle, so a stride stretched a web between them (the pale patches).
# Rip that seam below the crotch, then each copy follows only the leg its faces belong to.
import bpy,bmesh,sys
src,dst=sys.argv[-2],sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o=max([o for o in bpy.data.objects if o.type=='MESH' and o.vertex_groups],key=lambda o:len(o.data.vertices))
M=o.matrix_world
xs=[(M@v.co).x for v in o.data.vertices for g in v.groups if o.vertex_groups[g.group].name=='LeftUpLeg' and g.weight>0.8]
lsign=1 if sum(xs)/len(xs)>0 else -1
span=[f for f in o.data.polygons if min((M@o.data.vertices[i].co).x for i in f.vertices)<-0.005 and max((M@o.data.vertices[i].co).x for i in f.vertices)>0.005]
crotch=min(sum((M@o.data.vertices[i].co).z for i in f.vertices)/len(f.vertices) for f in span)-0.01
bm=bmesh.new(); bm.from_mesh(o.data)
W=lambda v:(M@v.co)
seam=[e for e in bm.edges if all(abs(W(v).x)<0.003 and W(v).z<crotch for v in e.verts)]
bmesh.ops.split_edges(bm,edges=seam)
bm.to_mesh(o.data); bm.free(); o.data.update()
# side per vertex from the faces around it
side={}
for f in o.data.polygons:
  cx=sum(W(o.data.vertices[i]).x for i in f.vertices)/len(f.vertices)
  for i in f.vertices: side.setdefault(i,[]).append(cx*lsign)
gi={g.index:g.name for g in o.vertex_groups}; G={g.name:g for g in o.vertex_groups}
legs=lambda s:[n for n in G if n.startswith(s) and any(k in n for k in('UpLeg','Leg','Foot','Toe'))]
fixed=0
for v in o.data.vertices:
  if W(v).z>=crotch or v.index not in side: continue
  s='Left' if sum(side[v.index])>0 else 'Right'; other='Right' if s=='Left' else 'Left'
  # weight on the other leg's bone moves to this leg's SAME bone (LeftLeg -> RightLeg): sending a shin vertex to the thigh stretched pale facets at every knee bend
  moves=[(gi[g.group],g.weight) for g in v.groups if gi[g.group] in legs(other)]
  for n,w in moves:
    G[n].remove([v.index]); G[s+n[len(other):]].add([v.index],w,'ADD')
  if moves: fixed+=1
print("FIX crotch",round(crotch,3),"seam edges",len(seam),"fixed",fixed)
# tried: flipping inner-thigh faces outward and one-sided cloth; neither cleared the slivers in a stride test (Nov 11)
# faces near the knees bridged one leg to the other (verts led by opposite legs): a stride stretched them into a web.
# Each goes whole to the leg most of its verts follow; its stray verts are copied and re-weighted to that leg, so the surface stays closed
LN={'L':legs('Left'),'R':legs('Right')}
bm=bmesh.new(); bm.from_mesh(o.data); dl=bm.verts.layers.deform.active
def ld(v):
  w=v[dl]; l=sum(x for g,x in w.items() if gi[g] in LN['L']); r=sum(x for g,x in w.items() if gi[g] in LN['R'])
  return 'L' if l>r+0.05 else 'R' if r>l+0.05 else '?'
gid={n:g.index for n,g in G.items()}
fresh=[]
bridge=[f for f in bm.faces if {'L','R'}<={ld(v) for v in f.verts} and sum(W(v).z for v in f.verts)/len(f.verts)<crotch]
for f in bridge:
  sides=[ld(v) for v in f.verts]; s_=max('LR',key=sides.count); o_='R' if s_=='L' else 'L'
  nv=[]
  for v,sd in zip(f.verts,sides):
    if sd!=o_: nv.append(v); continue
    c=bm.verts.new(v.co); w=dict(v[dl].items()); moved=0
    for g in list(w):
      if gi[g] in LN[o_]: moved+=w.pop(g)
    k=gid[('Left' if s_=='L' else 'Right')+'UpLeg'] if v.co is None else None
    own=[g for g in w if gi[g] in LN[s_]]
    tgt=max(own,key=lambda g:w[g]) if own else gid[('Left' if s_=='L' else 'Right')+('Leg' if W(v).z<0.5 else 'UpLeg')]
    w[tgt]=w.get(tgt,0)+moved
    for g,x in w.items(): c[dl][g]=x
    nv.append(c)
  uvs=[[l[u].uv.copy() for u in bm.loops.layers.uv.values()] for l in f.loops]; mi=f.material_index; sm=f.smooth
  fresh.append((nv,uvs,mi,sm))
bmesh.ops.delete(bm,geom=bridge,context='FACES_ONLY')
for nv,uvs,mi,sm in fresh:
  nf=bm.faces.new(nv); nf.material_index=mi; nf.smooth=sm
  for l,uv in zip(nf.loops,uvs):
    for u,x in zip(bm.loops.layers.uv.values(),uv): l[u].uv=x
bm.normal_update()
bm.normal_update(); bm.to_mesh(o.data); bm.free(); o.data.update()
print("BRIDGE resewn",len(bridge))
# the legs were one closed skin: front and back met at x=0 with no inner-leg cloth at all. Ripped apart, each leg is an open slot there,
# and the slot showed the pale lining-side mid-stride. Close each leg's slot with its own cap, weighted like the edge it hangs from
from collections import Counter,defaultdict
LS={'L':set(legs('Left')),'R':set(legs('Right'))}
def vside(v):
  l=sum(g.weight for g in v.groups if gi[g.group] in LS['L']); r=sum(g.weight for g in v.groups if gi[g.group] in LS['R'])
  return 'L' if l>r+0.05 else 'R' if r>l+0.05 else '?'
me=o.data; K=lambda i:tuple(round(x,5) for x in me.vertices[i].co)
fside={f.index:Counter(vside(me.vertices[i]) for i in f.vertices).most_common(1)[0][0] for f in me.polygons}
ek=defaultdict(list); rep={}
for f in me.polygons:
  vs=list(f.vertices)
  for a,b in zip(vs,vs[1:]+vs[:1]):
    ek[frozenset((K(a),K(b)))].append(fside[f.index])
    for i in (a,b): rep.setdefault((K(i),fside[f.index]),i)
caps=0
bm=bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); dl=bm.verts.layers.deform.active
for sd in 'LR':
  # the slot left by the rip is a long thin loop (front chain + back chain at x=0): zip the two chains by height into a strip of
  # triangles, so the inner leg is cloth that follows this leg alone. A fan across the slot (the old cap) made long pale slivers.
  od='R' if sd=='L' else 'L'
  bnd=[tuple(e) for e,s_ in ek.items() if s_.count(sd)==1 and od in s_ and all((k,sd) in rep for k in e) and all(W(me.vertices[rep[(k,sd)]]).z<crotch for k in e)]
  adj=defaultdict(list)
  for a_,b_ in bnd: adj[a_].append(b_); adj[b_].append(a_)
  seen=set()
  for start in list(adj):
    if start in seen: continue
    loop=[start]; seen.add(start); cur=start
    while True:
      nx=[n for n in adj[cur] if n not in seen]
      if not nx: break
      cur=nx[0]; loop.append(cur); seen.add(cur)
    if len(loop)<4 or start not in adj[cur]: continue
    bm.verts.ensure_lookup_table()
    src=[bm.verts[rep[(k,sd)]] for k in loop]; Z=[W(v).z for v in src]
    lo=Z.index(min(Z)); src=src[lo:]+src[:lo]; Z=Z[lo:]+Z[:lo]; hi=Z.index(max(Z))
    A=src[:hi+1]; B=[src[0]]+src[hi:][::-1]
    push=0.003*(1 if (sd=='L')==(lsign>0) else -1)/M.to_scale().x
    cp={}
    def cv(v):
      return v  # sewn onto the slot's own edge verts: one closed skin per leg, nothing for a stride to open
      if v not in cp:
        c=bm.verts.new(v.co.copy()); c.co.x+=push
        for g,x in v[dl].items(): c[dl][g]=x
        cp[v]=c
      return cp[v]
    i=j=0; tris=[]
    while i<len(A)-1 or j<len(B)-1:
      if j>=len(B)-1 or (i<len(A)-1 and W(A[i+1]).z<=W(B[j+1]).z): tris.append((A[i],A[i+1],B[j])); i+=1
      else: tris.append((A[i],B[j+1],B[j])); j+=1
    for t in tris:
      if len(set(t))<3: continue
      try: f=bm.faces.new([cv(v) for v in t])
      except ValueError: continue
      f.smooth=True; f.normal_update()
      if (f.normal.x>0)==((sd=='L')==(lsign>0)): f.normal_flip()
      caps+=1
print("CAPS",caps)
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
# the imported custom normals still pointed across the old shared seam: those faces lit pale mid-stride. Recompute them from the split mesh
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.object.shade_smooth()
print("NORMALS custom", o.data.has_custom_normals)
for ob in bpy.data.objects: ob.select_set(ob==o or ob.type=='ARMATURE')
bpy.ops.export_scene.gltf(filepath=dst,use_selection=True,export_morph=True,export_skins=True)
