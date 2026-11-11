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
  rem=0
  for g in list(v.groups):
    n=gi[g.group]
    if n in legs(other): rem+=g.weight; G[n].remove([v.index])
  if rem:
    fixed+=1; own=[g for g in v.groups if gi[g.group] in legs(s)]
    if own: max(own,key=lambda g:g.weight).weight+=rem
    else: G[s+'UpLeg'].add([v.index],rem,'ADD')
print("FIX crotch",round(crotch,3),"seam edges",len(seam),"fixed",fixed)
# tried: flipping inner-thigh faces outward and one-sided cloth; neither cleared the slivers in a stride test (Nov 11)
# 14 faces near the knees bridged one leg to the other (verts led by opposite legs): a stride stretched them into a web. Cut them
lead=lambda v:(lambda l,r:'L' if l>r+0.05 else 'R' if r>l+0.05 else '?')(sum(g.weight for g in v.groups if gi[g.group] in legs('Left')),sum(g.weight for g in v.groups if gi[g.group] in legs('Right')))
bm=bmesh.new(); bm.from_mesh(o.data); dv=o.data.vertices
bridge=[f for f in bm.faces if (lambda s:'L' in s and 'R' in s)({lead(dv[v.index]) for v in f.verts}) and sum(W(v).z for v in f.verts)/len(f.verts)<crotch]
bmesh.ops.delete(bm,geom=bridge,context='FACES_ONLY'); bm.to_mesh(o.data); bm.free(); o.data.update()
print("BRIDGE cut",len(bridge))
# the imported custom normals still pointed across the old shared seam: those faces lit pale mid-stride. Recompute them from the split mesh
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.object.shade_smooth()
print("NORMALS custom", o.data.has_custom_normals)
for ob in bpy.data.objects: ob.select_set(ob==o or ob.type=='ARMATURE')
bpy.ops.export_scene.gltf(filepath=dst,use_selection=True,export_morph=True,export_skins=True)
