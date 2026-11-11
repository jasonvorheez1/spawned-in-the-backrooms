# men's jeans: inner-leg verts below the crotch carried weight from the OTHER leg, so a stride tore the inseam open (pale inside showing). Each leg's cloth follows its own leg only.
import bpy,sys
src,dst=sys.argv[-2],sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o=max([o for o in bpy.data.objects if o.type=='MESH' and o.vertex_groups],key=lambda o:len(o.data.vertices))
M=o.matrix_world; G={g.name:g for g in o.vertex_groups}; gi={g.index:g.name for g in o.vertex_groups}
# which x side is Left: mean x of verts led by LeftUpLeg
xs=[(M@v.co).x for v in o.data.vertices for g in v.groups if gi[g.group]=='LeftUpLeg' and g.weight>0.8]
lsign=1 if sum(xs)/len(xs)>0 else -1
zs=[(M@v.co).z for v in o.data.vertices for g in v.groups if gi[g.group] in('LeftUpLeg','RightUpLeg') and g.weight>0.95]
crotch=max(zs)-0.02 if zs else 0.8
legs=lambda s:[n for n in G if n.startswith(s) and any(k in n for k in('UpLeg','Leg','Foot','Toe'))]
fixed=0
for v in o.data.vertices:
  p=M@v.co
  if p.z>crotch: continue
  side='Left' if p.x*lsign>0 else 'Right'; other='Right' if side=='Left' else 'Left'
  ow=[(n,v) for n in legs(other)]
  removed=0
  for g in list(v.groups):
    n=gi[g.group]
    if n.startswith(other) and n in legs(other) and g.weight>0: removed+=g.weight; G[n].remove([v.index])
  if removed>0:
    fixed+=1
    own=[g for g in v.groups if gi[g.group].startswith(side)]
    tgt=own[0] if own else None
    if tgt: tgt.weight=min(1,tgt.weight+removed)
    else: G[side+'UpLeg'].add([v.index],removed,'ADD')
print("FIX lsign",lsign,"crotch",round(crotch,3),"fixed",fixed)
for ob in list(bpy.data.objects):
  ob.select_set(ob==o or ob.type=='ARMATURE')
bpy.ops.export_scene.gltf(filepath=dst,use_selection=True,export_morph=True,export_skins=True)
