import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, noise
TEX="/tmp/l70tex/"; OUT="/workspace/l70c/out/"; SRC="/workspace/l70c/"; os.makedirs(OUT+"kit",exist_ok=True)
R=random.Random(70); I=Matrix.Identity(4)
def B(x,y,z): return Vector((x,-z,y))
def T(x,y,z): return Matrix.Translation(B(x,y,z))
def RY(d): return Matrix.Rotation(math.radians(d),4,'Z')
def RX(d): return Matrix.Rotation(math.radians(d),4,'X')
def RZ(d): return Matrix.Rotation(math.radians(d),4,'Y')
def Sc(x,y,z): return Matrix.Diagonal((x,z,y,1))
BM=None; ML=[]
def mat(name,tex=None,col=(.8,.8,.8),rough=.8,metal=0,emit=None,scale=1.0,two=False):
    m=bpy.data.materials.get(name)
    if not m:
        m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes["Principled BSDF"]
        b.inputs["Roughness"].default_value=rough; b.inputs["Metallic"].default_value=metal; b.inputs["Base Color"].default_value=(*col,1)
        if tex:
            n=m.node_tree.nodes.new("ShaderNodeTexImage"); n.image=bpy.data.images.load(TEX+tex+".jpg",check_existing=True); m.node_tree.links.new(n.outputs["Color"],b.inputs["Base Color"])
        if emit: b.inputs["Emission Color"].default_value=(*emit[0],1); b.inputs["Emission Strength"].default_value=emit[1]
        m.use_backface_culling=not two; m["uvs"]=scale
    if m not in ML: ML.append(m)
    return m
def M_(k):
    D=dict(wains=("wains",dict(scale=3.8,rough=.7)),marble=("marble",dict(scale=2.4,rough=.25)),tin=("tin",dict(scale=1.6,rough=.6)),oak=("oak",dict(scale=1.4,rough=.5)),
      conc=("conc",dict(scale=3,rough=.9)),cinder=("cinder",dict(scale=2.4,rough=.85)),gfloor=("gfloor",dict(scale=4,rough=.75)),steel=("steel",dict(scale=1.2,rough=.5,metal=0)),
      galv=("galv",dict(scale=.6,rough=.4,metal=1)),barn=("barn",dict(scale=.9,rough=.8)),logs=("logs",dict(scale=.35,rough=.9)),snow=("snow",dict(scale=1.6,rough=.95)),
      ice=("ice",dict(scale=.5,rough=.12)),rope=("rope",dict(scale=.3,rough=1)),cork=("cork",dict()),banner=("banner",dict(two=True,rough=1)),label=("label",dict(rough=.6)),dial=("dial",dict(rough=.3)),
      brick=("brick",dict(scale=2,rough=.9)),drum=("drum",dict(scale=.8,rough=.6)))
    C=dict(yellow=dict(col=(.75,.5,.05),rough=.6),white=dict(col=(.8,.8,.78),rough=.7),tube_on=dict(col=(1,1,1),emit=((.85,.95,1),6)),tube_off=dict(col=(.45,.46,.45),rough=.4),
      bulb=dict(col=(1,.8,.5),emit=((1,.62,.25),5)),black=dict(col=(.03,.03,.03),rough=.5),red=dict(col=(.5,.03,.02),rough=.4),brass=dict(col=(.6,.45,.2),rough=.35,metal=1),wire=dict(col=(.02,.02,.02),rough=.7))
    if k in D: return mat("l70_"+k,D[k][0],**D[k][1])
    return mat("l70_"+k,**C[k])
def emit(tb,m,M=I,uv=None,uvo=(0,0,0)):
    mi=ML.index(m); s=m["uvs"]; tb.normal_update(); L=tb.loops.layers.uv.get("UVMap") or tb.loops.layers.uv.new("UVMap"); uvo=Vector(uvo)
    for f in tb.faces:
        f.material_index=mi; n=f.normal; a=max(range(3),key=lambda i:abs(n[i]))
        for l in f.loops:
            c=l.vert.co+uvo
            l[L].uv=uv(c,n) if uv else (((c.y,c.z) if a==0 else (c.x,c.z) if a==1 else (c.x,c.y))[0]/s,((c.y,c.z) if a==0 else (c.x,c.z) if a==1 else (c.x,c.y))[1]/s)
    bmesh.ops.transform(tb,matrix=M,verts=tb.verts)
    me=bpy.data.meshes.new("t"); tb.to_mesh(me); tb.free(); BM.from_mesh(me); bpy.data.meshes.remove(me)
def box(s,m,M=I,bev=.015,uv=None,uvo=(0,0,0)):
    if isinstance(m,str): m=M_(m)
    tb=bmesh.new(); bmesh.ops.create_cube(tb,size=1); bmesh.ops.transform(tb,matrix=Matrix.Translation((0,0,s[1]/2))@Matrix.Diagonal((s[0],s[2],s[1],1)),verts=tb.verts)
    if bev>0: bmesh.ops.bevel(tb,geom=tb.edges[:],offset=min(bev,min(s)*.3),segments=2,profile=.5,affect='EDGES')
    emit(tb,m,M,uv,uvo)
def cyl(r1,r2,h,m,M=I,seg=18,uv=None):
    if isinstance(m,str): m=M_(m)
    tb=bmesh.new(); bmesh.ops.create_cone(tb,cap_ends=True,segments=seg,radius1=r1,radius2=r2,depth=h); bmesh.ops.translate(tb,vec=(0,0,h/2),verts=tb.verts); emit(tb,m,M,uv)
def blob(s,m,M=I,amp=.18,sub=3,cut=True):
    if isinstance(m,str): m=M_(m)
    tb=bmesh.new(); bmesh.ops.create_icosphere(tb,subdivisions=sub,radius=1); o=Vector((R.random()*9,R.random()*9,0))
    for v in tb.verts: v.co*=1+amp*noise.noise(v.co*1.6+o)+amp*.4*noise.noise(v.co*4+o)
    bmesh.ops.transform(tb,matrix=Matrix.Translation((0,0,-s[1]*.25))@Matrix.Diagonal((s[0]/2,s[2]/2,s[1]*.8,1)),verts=tb.verts)
    if cut: bmesh.ops.bisect_plane(tb,geom=tb.verts[:]+tb.edges[:]+tb.faces[:],plane_co=(0,0,0),plane_no=(0,0,1),clear_inner=True)
    emit(tb,m,M)
def tube(pts,r,m,M=I,res=3):
    if isinstance(m,str): m=M_(m)
    cu=bpy.data.curves.new("c","CURVE"); cu.dimensions="3D"; cu.bevel_depth=r; cu.bevel_resolution=res; cu.use_fill_caps=True
    sp=cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for p,q in zip(sp.points,pts): p.co=(*B(*q),1)
    ob=bpy.data.objects.new("c",cu); bpy.context.scene.collection.objects.link(ob); bpy.context.view_layer.update()
    me=bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get())); tb=bmesh.new(); tb.from_mesh(me); bpy.data.objects.remove(ob); bpy.data.meshes.remove(me); emit(tb,m,M)
def sag(a,b,d,n=10): return [(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-d*4*t*(1-t),a[2]+(b[2]-a[2])*t) for t in [i/n for i in range(n+1)]]
def fit(sx,sy):
    return lambda c,n: ((.5-c.x/sx) if n.y>0 else (.5+c.x/sx), c.z/sy)
def wall(p0,p1,h,m,th=.3,ops=(),y0=0):
    (x0,z0),(x1,z1)=p0,p1; L=math.hypot(x1-x0,z1-z0); ang=math.atan2(-(z1-z0),x1-x0)
    def seg(a,b,ya,yb):
        if b-a<.01 or yb-ya<.01: return
        mid=(a+b)/2; box((b-a,yb-ya,th),m,T(x0+(x1-x0)*mid/L,ya,z0+(z1-z0)*mid/L)@Matrix.Rotation(ang,4,'Z'),bev=.008,uvo=(mid,0,ya))
    cur=0
    for a,b,top in sorted(ops): seg(cur,a,y0,h); seg(a,b,top,h); cur=b
    seg(cur,L,y0,h)
def begin(shell=None):
    global BM,ML
    bpy.ops.wm.read_factory_settings(use_empty=True); BM=bmesh.new(); ML=[]
    if shell: ML+=list(shell.materials); BM.from_mesh(shell)
    if not BM.loops.layers.uv.get("UVMap"): BM.loops.layers.uv.new("UVMap")
def finish(name):
    me=bpy.data.meshes.new(name); BM.to_mesh(me); BM.free()
    for m in ML: me.materials.append(m)
    me.polygons.foreach_set("use_smooth",[True]*len(me.polygons)); me.set_sharp_from_angle(angle=math.radians(38))
    ob=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(ob); ob.select_set(True); bpy.context.view_layer.objects.active=ob
    bpy.ops.export_scene.gltf(filepath=OUT+name+".glb",use_selection=True,export_apply=True,export_image_format='JPEG')
    xs=[v.co for v in me.vertices]; print("BUILT",name,"tris",sum(len(p.vertices)-2 for p in me.polygons),"size",[round(max(c[i] for c in xs)-min(c[i] for c in xs),2) for i in range(3)])
def shell(f,size,dx,cut):
    p=SRC+f+".glb"
    if not os.path.exists(p) or os.path.getsize(p)<1e5: print("NOSHELL",f); return None
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
    obs=[o for o in bpy.context.scene.objects if o.type=="MESH"]; o=obs[0]; me=o.data; me.transform(o.matrix_world); me.transform(Matrix.Rotation(math.pi,4,'Z'))
    cs=[v.co for v in me.vertices]; mn=Vector([min(c[i] for c in cs) for i in range(3)]); mx=Vector([max(c[i] for c in cs) for i in range(3)]); print("SHELL",f,"native",[round(mx[i]-mn[i],3) for i in range(3)])
    sc=(size[0]/(mx.x-mn.x),size[2]/(mx.y-mn.y),size[1]/(mx.z-mn.z))
    me.transform(Matrix.Translation((dx,0,0))@Matrix.Diagonal((*sc,1))@Matrix.Translation((-(mn.x+mx.x)/2,-(mn.y+mx.y)/2,-mn.z)))
    if me.uv_layers: me.uv_layers[0].name="UVMap"
    tb=bmesh.new(); tb.from_mesh(me); cut(tb); tb.to_mesh(me); tb.free()
    me.use_fake_user=True; mats=list(me.materials)
    for m in mats: m.use_fake_user=True
    keep=bpy.data.meshes.new("keep"); return me
def begin_keep(me):
    global BM,ML
    BM=bmesh.new(); ML=[]
    if me: ML+=list(me.materials); BM.from_mesh(me)
    else: bpy.ops.wm.read_factory_settings(use_empty=True)
    if not BM.loops.layers.uv.get("UVMap"): BM.loops.layers.uv.new("UVMap")

# ---------------- HOTEL (root 34,0,-80) ----------------
def hotel():
    def cut(tb):
        d=[f for f in tb.faces if all(v.co.x<-7.4 and abs(v.co.y)<1.2 and v.co.z<2.55 for v in f.verts)]
        d+=[f for f in tb.faces if f not in d and all(-8.2<v.co.x<2.8 and abs(v.co.y)<5.8 and .1<v.co.z<3.7 for v in f.verts)]
        bmesh.ops.delete(tb,geom=list(set(d)),context='FACES')
    begin_keep(shell("hotel",(18,18,16),0,cut)); H=3.8
    box((11.9,.2,12.5),"marble",T(-2.7,-.16,0),bev=0); box((5.3,.2,2.9),"oak",T(5.5,-.16,0),bev=0)
    box((11.9,.2,12.5),"tin",T(-2.7,H,0),bev=0); box((5.3,.2,2.9),"tin",T(5.5,2.9,0),bev=0)
    wall((-8.4,6),(-8.4,-6),H,M_("wains"),ops=[(4.9,7.1,2.5)]); wall((-8.4,-6),(3,-6),H,M_("wains")); wall((3,6),(-8.4,6),H,M_("wains"))
    wall((3,-6),(3,6),H,M_("wains"),ops=[(4.8,7.2,2.6)]); wall((3,-1.35),(8,-1.35),2.9,M_("wains")); wall((8,1.35),(3,1.35),2.9,M_("wains")); wall((8,-1.35),(8,1.35),2.9,M_("wains"))
    for z in (-2,2): box((11.2,.26,.3),"oak",T(-2.7,H-.26,z),bev=.03)
    for (x,z,sx,sz) in ((-2.7,-5.8,11.2,.12),(-2.7,5.8,11.2,.12),(-8.2,0,.12,11.6),(2.8,0,.12,11.6)): box((sx,.16,sz),"oak",T(x,H-.16,z),bev=.04)
    for z in (-1.22,1.22):  # entrance surround, stone
        box((1.5,2.62,.34),"conc",T(-8.95,0,z),bev=.05); box((.5,2.3,.3),"oak",T(2.95,0,z*1.05),bev=.03)
    box((1.5,.4,3.0),"conc",T(-8.95,2.5,0),bev=.06); box((1.7,.1,2.2),"conc",T(-9.0,-.06,0),bev=.03); box((.5,.3,2.9),"oak",T(2.95,2.6,0),bev=.03)
    box((.07,2.12,1.0),"oak",T(7.8,0,0),bev=.02)
    for z in (-.56,.56): box((.1,2.2,.12),"oak",T(7.8,0,z),bev=.02)
    box((.1,.12,1.24),"oak",T(7.8,2.14,0),bev=.02)
    for y,t,l in ((.55,7,1.5),(1.05,-12,1.6),(1.5,4,1.45),(1.85,-6,1.5),(1.2,38,1.9)): box((.03,.15,l),"barn",T(7.74,y,0)@RX(t),bev=.01)
    cyl(.03,.03,.012,"brass",T(7.75,1.0,.38)@RZ(90),seg=12)
    blob((2.4,.35,3.4),"snow",T(-9.9,0,2.6)); blob((2.0,.3,2.6),"snow",T(-9.8,0,-2.8))
    finish("hotel")
# ---------------- OFFICE (root 38,0,-22) ----------------
def office():
    def cut(tb): bmesh.ops.bisect_plane(tb,geom=tb.verts[:]+tb.edges[:]+tb.faces[:],plane_co=(0,0,3.32),plane_no=(0,0,1),clear_inner=True)
    begin_keep(shell("office",(30,14,19),-1,cut)); H=3.0
    box((28.6,.2,18.6),"gfloor",T(-2,-.16,0),bev=0); box((29,.34,19),"conc",T(-2,H,0),bev=.03)
    wall((-16,9),(-16,-9),H,M_("cinder"),ops=[(5.5,12.5,2.6)]); wall((-16,-9),(12,-9),H,M_("cinder")); wall((12,9),(-16,9),H,M_("cinder")); wall((12,-9),(12,9),H,M_("cinder"))
    wall((6,3),(6,-3),H,M_("conc"),th=.25,ops=[(2.42,3.58,2.1)]); wall((6,-3),(12,-3),H,M_("conc"),th=.25); wall((12,3),(6,3),H,M_("conc"),th=.25)
    for x in (-10,-4,2):
        box((.45,.4,18),"conc",T(x,H-.4,0),bev=.03)
        for z in (-3,3): box((.55,H-.4,.55),"cinder",T(x,0,z),bev=.07); box((.57,1.1,.57),"yellow",T(x,.02,z),bev=.07); box((.58,.12,.58),"black",T(x,1.12,z),bev=.07)
    for x in [-14+i*2.6 for i in range(8)]:
        for z in (-6.4,6.4): box((.1,.008,5),"white",T(x,.04,z),bev=0)
    for i,x in enumerate([-12.7+j*2.6 for j in range(7)]):
        for z in (-8.3,8.3): box((1.7,.12,.2),"conc",T(x,.04,z),bev=.04)
    k=0
    for x in (-13,-7,-1,4.2):
        for z in (-4.5,4.5):
            box((1.34,.07,.18),"white",T(x,H-.07,z),bev=.02); tube([(x-.6,H-.1,z),(x+.6,H-.1,z)],.02,"tube_on" if k in (0,3,5,6) else "tube_off"); k+=1
    box((.5,.09,.2),"white",T(9,H-.09,0),bev=.03); tube([(8.8,H-.12,0),(9.2,H-.12,0)],.03,"tube_on")
    # steel door, hinged at (6,-.58) swung into the garage
    D=T(5.88,0,-.58)@RY(108)
    box((1.14,2.06,.05),"steel",D@Matrix.Translation((.57,0,0)),bev=.012); box((.9,.75,.02),"steel",D@Matrix.Translation((.57,.035,1.1)),bev=.01); box((.9,.75,.02),"steel",D@Matrix.Translation((.57,.035,.2)),bev=.01)
    tube([(0,0,0),(0,0,0.001)],.001,"brass"); cyl(.02,.02,.14,"brass",D@Matrix.Translation((1.02,.06,1.0))@RX(-90),seg=10)
    for z in (-.62,.62): box((.3,2.14,.07),"steel",T(6,0,z),bev=.015)
    box((.3,.07,1.3),"steel",T(6,2.1,0),bev=.015)
    # manifold on east wall
    X=11.5; HY=.75
    tube([(X,2.45,-2.7),(X,2.45,2.7)],.09,"galv",res=4)
    for i in range(4):
        z=-1.5+i
        tube([(X,2.45,z-.44),(X,HY,z-.44),(X,HY,z-.2)],.055,"galv"); tube([(X,HY,z+.2),(X,HY,z+.44),(X,-.02,z+.44)],.055,"galv")
        for zz in (z-.33,z+.33): cyl(.1,.1,.03,"galv",T(X,HY,zz)@RX(90)@Matrix.Translation((0,0,-.015)),seg=16)
        for yy in (1.5,2.1): box((.3,.03,.05),"steel",T(X+.15,yy,z-.44),bev=.008)
    tube([(X,2.45,1.5),(X-1.2,2.45,1.5),(X-5.6,2.45,1.5)],.11,"galv",res=4)
    box((1.0,.26,.02),"label",T(11.84,1.95,0)@RY(-90),bev=0,uv=fit(1.0,.26))
    for (x,z) in ((-7,1.5),(-1,1.5)): box((.72,.16,.012),"label",T(x,1.84,z-.34),bev=0,uv=fit(.72,.16)); tube([(x-.3,2.0,z-.34),(x-.3,2.2,z-.2)],.004,"wire",res=1); tube([(x+.3,2.0,z-.34),(x+.3,2.2,z-.2)],.004,"wire",res=1)
    box((.9,.16,1.5),"conc",T(8.6,0,1.9),bev=.04); tube([(8.6,.6,2.5),(8.6,.6,2.78),(8.6,2.45,2.78),(11.5,2.45,2.78)],.07,"galv")
    blob((3.5,.4,2.2),"snow",T(-17.6,0,5.2)); blob((2.6,.3,2.0),"snow",T(-17.4,0,-5.4)); blob((2.2,.14,3.0),"snow",T(-14.4,0,2.2),amp=.1)
    finish("office")
# ---------------- KIT ----------------
def kit(name,fn):
    begin(); fn(); finish("kit/"+name)
def bench():
    for x in (-.68,.66): cyl(.17,.15,.42,"logs",T(x,0,0)@RY(R.uniform(0,90)),seg=14)
    for i,z in enumerate((-.17,0,.17)): box((1.9+R.uniform(-.08,.06),.045,.155),"barn",T(R.uniform(-.03,.03),.42+i*.002,z)@RY(R.uniform(-1.5,1.5)),bev=.012)
    blob((.6,.1,.4),"snow",T(.62,.465,.02),amp=.12,cut=False)
def firewood():
    for row in range(5):
        for i in range(7-(row%2)):
            r=R.uniform(.075,.1); cyl(r,r*R.uniform(.9,1),R.uniform(.44,.52),"logs",T(-.6+i*.2+(row%2)*.1+R.uniform(-.01,.01),.1+row*.165,-.25+R.uniform(-.03,.03))@RX(-90)@Matrix.Rotation(R.random()*6,4,'Z'),seg=12)
    for x in (-.8,.8): cyl(.04,.035,1.15,"barn",T(x,0,0)@RZ(R.uniform(-3,3)),seg=10)
    blob((1.7,.2,.62),"snow",T(0,.9,0),amp=.14,cut=False)
def sled():
    for z in (-.23,.23):
        tube([(-.75,.025,z),(.45,.025,z),(.68,.07,z),(.83,.2,z),(.86,.36,z),(.78,.44,z)],.022,"barn")
        for x in (-.55,-.05,.4): box((.035,.16,.035),"barn",T(x,.03,z),bev=.006)
    for z in (-.21,-.07,.07,.21): box((1.35,.022,.11),"barn",T(-.08,.19,z)@RY(R.uniform(-1,1)),bev=.008)
    tube([(.78,.44,-.23),(.78,.44,.23)],.02,"barn"); tube([(.8,.44,-.1),(1.1,.2,-.2),(1.5,.02,-.05),(1.7,.02,.3),(1.3,.02,.5)],.012,"rope")
    blob((.7,.09,.36),"snow",T(-.3,.21,0),amp=.12,cut=False)
def noticeboard():
    for x in (-.78,.78): cyl(.055,.045,2.3,"logs",T(x,0,0)@RZ(R.uniform(-2,2)),seg=12)
    box((1.46,1.0,.05),"cork",T(0,.95,0),bev=.006,uv=fit(1.46,1.0))
    for x,s in ((-.74,1),(.74,-1)): box((.05,1.06,.07),"barn",T(x,.92,0),bev=.01)
    box((1.56,.05,.07),"barn",T(0,.9,0),bev=.01); box((1.56,.05,.07),"barn",T(0,1.95,0),bev=.01)
    box((1.9,.03,.42),"barn",T(0,2.1,.0)@RX(-14),bev=.008); blob((1.9,.16,.5),"snow",T(0,2.13,0)@RX(-14),amp=.12,cut=False)
    blob((1.6,.2,.9),"snow",T(.2,0,.25),amp=.15)
def banner():
    for x in (-5.3,5.3): cyl(.09,.06,5.1,"logs",T(x,0,0)@RZ(-x*.5),seg=12); blob((.3,.1,.3),"snow",T(x*1.0+(-.04 if x>0 else .04)*0,5.08,0),amp=.1,cut=False)
    tb=bmesh.new(); L=tb.loops.layers.uv.new("UVMap"); nx,ny=40,5; g=[]
    def P(i,j):
        u=i/nx; x=-4.3+8.6*u; top=4.6-.34*(1-(2*u-1)**2); return B(x,top-1.2*j/ny,.07*math.sin(x*1.9)*(.4+j/ny)+.04*math.sin(x*5+1))
    vs=[[tb.verts.new(P(i,j)) for j in range(ny+1)] for i in range(nx+1)]
    for i in range(nx):
        for j in range(ny):
            f=tb.faces.new((vs[i][j],vs[i][j+1],vs[i+1][j+1],vs[i+1][j]))
            for l,(a,b) in zip(f.loops,((i,j),(i,j+1),(i+1,j+1),(i+1,j))): l[L].uv=(1-a/nx,1-b/ny)
    emit(tb,M_("banner"),uv=lambda c,n:(.5-c.x/8.6,0))
    for s in (-1,1):
        tube(sag((s*4.3,4.6,0),(s*5.27,4.95,0),.03,4),.012,"rope"); tube(sag((s*4.3,3.4,0),(s*5.28,3.2,0),.05,4),.012,"rope")
def bulbring():
    Pp=[(9.6*math.cos(math.radians(a)),9.6*math.sin(math.radians(a))) for a in (25,95,155,205,275,335)]
    for (x,z) in Pp: cyl(.07,.045,3.7,"logs",T(x,0,z)@RZ(R.uniform(-3,3))@RX(R.uniform(-3,3)),seg=10); blob((1.1,.18,1.1),"snow",T(x,0,z),amp=.15)
    runs=[(Pp[i],Pp[(i+1)%6]) for i in range(6)]+[(Pp[0],Pp[3]),(Pp[1],Pp[4])]
    for a,b in runs:
        pts=sag((a[0],3.62,a[1]),(b[0],3.62,b[1]),.55,14); tube(pts,.008,"wire",res=1); n=int(math.dist(a,b)/.85)
        for k in range(1,n):
            t=k/n; i=min(int(t*14),13); f=t*14-i; p=[pts[i][q]+(pts[i+1][q]-pts[i][q])*f for q in range(3)]
            tb=bmesh.new(); bmesh.ops.create_icosphere(tb,subdivisions=1,radius=.045); bmesh.ops.transform(tb,matrix=Matrix.Diagonal((1,1,1.3,1)),verts=tb.verts); emit(tb,M_("bulb"),T(p[0],p[1]-.07,p[2]))
def snowheap(): blob((2.4,.7,2.0),"snow",amp=.2,sub=4)
def icicles():
    for i in range(11):
        l=R.uniform(.12,.5); cyl(.004,R.uniform(.018,.035),l,"ice",T(-.6+i*.12+R.uniform(-.03,.03),.5-l,R.uniform(-.015,.015)),seg=8)
    box((1.36,.03,.07),"snow",T(0,.49,0),bev=.012)
def gauge():
    box((.95,.72,.04),"steel",T(0,0,0),bev=.012)
    for x in (-.24,.24):
        for y in (.19,.53):
            Mx=T(x,y,-.02)@RX(90)
            cyl(.135,.135,.06,"black",Mx,seg=28); cyl(.118,.118,.064,"dial",Mx,seg=28,uv=lambda c,n:(.5+c.x/.236,.5+c.y/.236))
            tube([(x,y-.13,-.03),(x,-.05,-.03)],.012,"brass",res=2)
    tube([(-.4,-.05,-.03),(.4,-.05,-.03)],.02,"galv"); tube([(.4,-.05,-.03),(.4,-.6,-.03)],.02,"galv")
def breaker():
    box((.36,.52,.15),"steel",T(0,0,0),bev=.02); box((.3,.2,.02),"yellow",T(0,.28,-.085),bev=.006); box((.06,.2,.03),"black",T(0,.05,-.085),bev=.008)
    tube([(0,.15,-.09),(0,.2,-.2),(0,.34,-.27)],.016,"galv"); blob((.09,.11,.09),"red",T(0,.31,-.27),amp=.02,sub=2,cut=False)
    tube([(0,.52,0),(0,1.4,0)],.018,"galv")
import sys
which=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
for n,f in dict(bench=bench,firewood=firewood,sled=sled,noticeboard=noticeboard,banner=banner,bulbring=bulbring,snowheap=snowheap,icicles=icicles,gauge=gauge,breaker=breaker).items():
    if not which or "kit" in which: kit(n,f)
if not which or "hotel" in which: hotel()
if not which or "office" in which: office()
