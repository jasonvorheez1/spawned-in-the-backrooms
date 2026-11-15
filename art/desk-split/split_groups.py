bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/desk/desk.glb")
SRC=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]; mw=SRC.matrix_world
bm=bmesh.new(); bm.from_mesh(SRC.data); bm.verts.ensure_lookup_table()
seen=set(); parts=[]
for v in bm.verts:
    if v.index in seen: continue
    st=[v]; comp=[]; seen.add(v.index)
    while st:
        a=st.pop(); comp.append(a.index)
        for e in a.link_edges:
            b=e.other_vert(a)
            if b.index not in seen: seen.add(b.index); st.append(b)
    cs=[mw@bm.verts[i].co for i in comp]
    parts.append(dict(n=len(comp),v=comp,b=[min(c.x for c in cs),max(c.x for c in cs),min(c.y for c in cs),max(c.y for c in cs),min(c.z for c in cs),max(c.z for c in cs)]))
def bb(ps): return [min(p['b'][0] for p in ps),max(p['b'][1] for p in ps),min(p['b'][2] for p in ps),max(p['b'][3] for p in ps),min(p['b'][4] for p in ps),max(p['b'][5] for p in ps)]
def ext(p): return max(p['b'][1]-p['b'][0], p['b'][3]-p['b'][2])
TOP=0.262
desk=[p for p in parts if p['b'][4]<TOP or (p['b'][1]-p['b'][0]>0.6 and p['b'][3]-p['b'][2]>1.0)]
rest=[p for p in parts if p not in desk]
inbooks=lambda p: p['b'][2]>=-0.56 and p['b'][3]<=-0.28 and p['b'][0]>=-0.21 and p['b'][1]<=0.07
mapS=[p for p in rest if ext(p)>0.2 and p['b'][5]<0.296 and not inbooks(p)]
rest=[p for p in rest if p not in mapS]
g=0.003
def near(a,b): return all(a['b'][2*k]-g<=b['b'][2*k+1] and b['b'][2*k]-g<=a['b'][2*k+1] for k in range(3))
lab=list(range(len(rest)))
def f(i):
    while lab[i]!=i: lab[i]=lab[lab[i]]; i=lab[i]
    return i
for i in range(len(rest)):
    for j in range(i+1,len(rest)):
        if near(rest[i],rest[j]): lab[f(i)]=f(j)
cl={}
for i,p in enumerate(rest): cl.setdefault(f(i),[]).append(p)
groups={'desk':desk,'map':mapS,'books':[],'mug':[],'compass':[],'pencils':[],'other':[]}
for ps in cl.values():
    b=bb(ps); cx=(b[0]+b[1])/2; cy=(b[2]+b[3])/2
    if b[5]<0.29 and -0.29<=b[0] and b[1]<=0.345 and -0.39<=b[2] and b[3]<=0.32 and ext({'b':b})<0.12 and not (cy>0.29): groups['map']+=ps
    elif cy<-0.28: groups['books']+=ps
    elif cy>0.33 and cx<-0.1: groups['mug']+=ps
    elif 0.14<cy<0.29 and -0.12<cx<0.04: groups['compass']+=ps
    elif cy>0.28 and cx>-0.1: groups['pencils']+=ps
    else: groups['other']+=ps
