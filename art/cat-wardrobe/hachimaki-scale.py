import bpy, sys
a=sys.argv[sys.argv.index('--')+1:]; HIN,HOUT,K,DZ,TILT=a[0],a[1],float(a[2]),float(a[3]),float(a[4])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=HIN)
hat=next(o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('Icosphere'))
mw=hat.matrix_world; inv=mw.inverted(); P=[mw@v.co for v in hat.data.vertices]
cx=sum(p.x for p in P)/len(P); cy=sum(p.y for p in P)/len(P); ry=max(abs(p.y-cy) for p in P) or 1
for v,p in zip(hat.data.vertices,P):
    p=p.copy(); t=(p.y-cy)/ry; p.x=cx+(p.x-cx)*K; p.y=cy+(p.y-cy)*K; p.z+=DZ-TILT*max(t,0); v.co=inv@p
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=HOUT, export_skins=True, export_morph=True)
