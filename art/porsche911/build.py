# 1995 Porsche 911 Carrera RS (Sims 3 pack by Fresh-Prince) -> GLB. Input: /workspace/porsche/mesh.npz from geo.py, diffuse.jpg composite.
import bpy, numpy as np, math, mathutils
W="/workspace/porsche/"
D=np.load(W+"mesh.npz")
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
S=4.3/4.816
def mat(name,rough,metal=0.0,tex=True,alpha=1.0,color=(1,1,1,1),coat=0.0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value=rough; b.inputs["Metallic"].default_value=metal
    b.inputs["Base Color"].default_value=color
    if coat: b.inputs["Coat Weight"].default_value=coat
    if tex:
        t=m.node_tree.nodes.new("ShaderNodeTexImage"); t.image=IMG
        m.node_tree.links.new(t.outputs["Color"],b.inputs["Base Color"])
    if alpha<1:
        b.inputs["Alpha"].default_value=alpha; m.surface_render_method="BLENDED"
    return m
IMG=bpy.data.images.load(W+"diffuse.jpg")
M={"body":mat("body",0.28,0.15,coat=0.6),"trim":mat("trim",0.5),"wheel":mat("wheel",0.45,0.3),
   "glass":mat("glass",0.05,0,False,0.35,(0.04,0.05,0.06,1)),"lamp_glass":mat("lamp_glass",0.05,0,False,0.25,(0.8,0.85,0.9,1))}
def conv(p): return np.stack([-p[:,0],p[:,2],p[:,1]],1)*S
def make(name,P,N,U,F,m,origin=None):
    used=np.unique(F); remap=np.full(len(P),-1); remap[used]=np.arange(len(used))
    P,N,U,F=P[used],N[used],U[used],remap[F]
    if origin is not None: P=P-origin
    me=bpy.data.meshes.new(name); me.from_pydata(P.tolist(),[],F.tolist()); me.update()
    uv=me.uv_layers.new(name="UVMap"); lu=U[[l.vertex_index for l in me.loops]]
    lu=np.stack([lu[:,0],1-lu[:,1]],1); uv.data.foreach_set("uv",lu.ravel())
    me.normals_split_custom_set_from_vertices(N.tolist())
    me.materials.append(M[m])
    o=bpy.data.objects.new(name,me); sc.collection.objects.link(o)
    if origin is not None: o.location=origin
    return o
role={0:"body",1:"trim",2:"glass",5:"trim",6:"lamp_glass"}
objs=[]
for i in range(7):
    P=conv(D[f"p{i}"]); N=conv(D[f"n{i}"])/S; U=D[f"u{i}"]; F=D[f"f{i}"]
    if i in (3,4):
        c=P[F].mean(1); fr=(c[:,1]>0.27*S); lf=(c[:,0]>0)  # front = +Y in blender (glTF -Z); left = -X in glTF... blender x = glTF x
        for fl,fn in ((True,"F"),(False,"R")):
            for ll,ln in ((False,"L"),(True,"R")):
                sel=F[(fr==fl)&(lf==ll)]
                q=P[np.unique(sel)]; org=(q.min(0)+q.max(0))/2
                if i==4: name=f"wheel_{fn}{ln}_rim"
                else: name=f"wheel_{fn}{ln}"
                o=make(name,P,N,U,sel,"wheel",org); objs.append(o)
                print(name,"size",(q.max(0)-q.min(0)).round(3),"center",org.round(3))
    else:
        o=make({0:"body",1:"interior",2:"windows",5:"lights",6:"headlamp_glass"}[i],P,N,U,F,role[i]); objs.append(o)
for o in objs:
    if o.name.endswith("_rim"):
        par=bpy.data.objects[o.name[:-4]]; mw=o.matrix_world.copy(); o.parent=par; o.matrix_world=mw
allv=[o.matrix_world@v.co for o in objs for v in o.data.vertices]
mn=[min(v[k] for v in allv) for k in range(3)]; mx=[max(v[k] for v in allv) for k in range(3)]
print("bounds",[round(a,3) for a in mn],[round(a,3) for a in mx])
# drop to z=0
for o in objs:
    if o.parent is None: o.location.z-=mn[2]
# proof
sc.render.engine="CYCLES"; sc.cycles.samples=24; sc.render.resolution_x=sc.render.resolution_y=656
sc.render.film_transparent=False
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.6,0.68,1); w.node_tree.nodes["Background"].inputs[1].default_value=0.8
sun=bpy.data.objects.new("sun",bpy.data.lights.new("sun","SUN")); sun.data.energy=3.5; sun.rotation_euler=(math.radians(50),0,math.radians(30)); sc.collection.objects.link(sun)
pl=bpy.data.meshes.new("gp"); pl.from_pydata([(-8,-8,0),(8,-8,0),(8,8,0),(-8,8,0)],[],[(0,1,2,3)]); g=bpy.data.objects.new("ground",pl); sc.collection.objects.link(g)
gm=bpy.data.materials.new("g"); gm.use_nodes=True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.3,0.3,0.3,1); pl.materials.append(gm)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam; cam.data.lens=40
def shot(n,pos):
    cam.location=pos; d=mathutils.Vector((0,0,0.55))-cam.location; cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"/tmp/proof/p_{n}.png"; bpy.ops.render.render(write_still=True)
shot("a",(-4.2,5.2,2.2)); shot("b",(4.5,-5.0,2.0)); shot("c",(0.5,-1.0,7.5))
bpy.data.objects.remove(g); bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
bpy.ops.export_scene.gltf(filepath=W+"porsche911.glb",export_apply=True,export_image_format="JPEG",export_jpeg_quality=88)
