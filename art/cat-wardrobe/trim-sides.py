import bpy, bmesh, sys
a=sys.argv[sys.argv.index("--")+1:]; src,dst,T=a[0],a[1],float(a[2])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in bpy.data.objects:
    if o.type!="MESH" or not o.name.startswith("Garment"): continue
    bm=bmesh.new(); bm.from_mesh(o.data); M=o.matrix_world
    kill=[f for f in bm.faces if all(abs((M@v.co).x)>T for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose=[v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(o.data); print("killed",len(kill))
bpy.ops.export_scene.gltf(filepath=dst, export_apply=True)
