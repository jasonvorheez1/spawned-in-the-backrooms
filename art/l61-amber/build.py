# Camp Amber dressing: fire ring, supply crate, clothesline (poles + rope), garments. One pass: build, proof, export.
import bpy, bmesh, math, random, mathutils
random.seed(11)
OUT="/workspace/amber/"
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,col,rough=0.8,img=None,emit=None):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value=(*col,1); b.inputs["Roughness"].default_value=rough
    if img:
        t=m.node_tree.nodes.new("ShaderNodeTexImage"); t.image=bpy.data.images.load(img)
        m.node_tree.links.new(t.outputs["Color"],b.inputs["Base Color"])
    if emit:
        b.inputs["Emission Color"].default_value=(*emit,1); b.inputs["Emission Strength"].default_value=2.0
    return m
def finish(o,m,sub=0,smooth=True):
    o.data.materials.append(m)
    if sub: md=o.modifiers.new("s","SUBSURF"); md.levels=sub; md.render_levels=sub
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    if smooth: bpy.ops.object.shade_smooth()
    o.select_set(False); return o
def rock(name,loc,size,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=loc); o=bpy.context.object; o.name=name
    for v in o.data.vertices:
        n=v.co.normalized(); v.co=v.co*(1+0.18*math.sin(v.co.x*4.1+random.random())*math.cos(v.co.y*3.3)+random.uniform(-.06,.06))
    o.scale=size; o.rotation_euler=(random.uniform(-.2,.2),random.uniform(-.2,.2),random.uniform(0,6.3))
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return finish(o,m)
def log(name,a,b,r,m):
    a=mathutils.Vector(a); b=mathutils.Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=d.length,location=(a+b)/2); o=bpy.context.object; o.name=name
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    for v in o.data.vertices: v.co.x*=1+random.uniform(-.12,.12); v.co.y*=1+random.uniform(-.12,.12)
    md=o.modifiers.new("b","BEVEL"); md.width=r*0.3; md.segments=2
    return finish(o,m)
def export(name):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT+name+".glb",export_apply=True,use_selection=True)
    dg=bpy.context.evaluated_depsgraph_get()
    print("TRIS",name,sum(len(o.evaluated_get(dg).data.loop_triangles) for o in bpy.context.scene.objects if o.type=="MESH"))

# ---------- fire ring
reset()
stone=mat("stone",(0.42,0.40,0.37),0.9); char=mat("charwood",(0.09,0.06,0.04),0.95); ash=mat("ash",(0.22,0.21,0.2),1.0); ember=mat("ember",(0.3,0.08,0.02),0.7,emit=(1.0,0.32,0.05))
N=10
for i in range(N):
    a=i/N*6.283+random.uniform(-.1,.1); R=0.46
    rock(f"stone_{i}",(math.cos(a)*R,math.sin(a)*R,0.07),(0.13*random.uniform(.85,1.2),0.10*random.uniform(.85,1.1),0.09*random.uniform(.8,1.2)),stone)
bpy.ops.mesh.primitive_circle_add(vertices=24,radius=0.38,fill_type="TRIFAN",location=(0,0,0.015)); o=bpy.context.object; o.name="ashbed"
for v in o.data.vertices: v.co.z+=random.uniform(0,.025)*(1-v.co.length/0.4)
finish(o,ash)
for i,(a,b) in enumerate([((-.26,-.12,.05),(.08,.04,.2)),((.24,-.14,.05),(-.04,.06,.21)),((0,.27,.05),(0,-.05,.2))]): log(f"log_{i}",a,b,0.045,char)
for i in range(6): rock(f"coal_{i}",(random.uniform(-.14,.14),random.uniform(-.14,.14),.04),(.04,.035,.025),ember)
# Blender Z up; glTF exporter converts
export("firering")

# ---------- crate (0.62 x 0.46 x 0.46, critter-sized), plank body + corner battens
reset()
wood=mat("wood",(1,1,1),0.85,img=OUT+"crate.png"); batt=mat("wood_trim",(0.36,0.25,0.15),0.85)
W,D,H=0.62,0.46,0.46
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,H/2)); o=bpy.context.object; o.name="crate"; o.scale=(W-0.04,D-0.04,H-0.02)
bpy.ops.object.transform_apply(scale=True)
md=o.modifiers.new("b","BEVEL"); md.width=0.012; md.segments=2
bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier="b")
uvl=o.data.uv_layers[0]  # each face's stencil reads the right way round from outside: u runs along the viewer's right
for f in o.data.polygons:
    n=f.normal; ax=max(range(3),key=lambda k:abs(n[k]))
    for li in f.loop_indices:
        c=o.data.vertices[o.data.loops[li].vertex_index].co
        if ax==2: u,v=(c.x+W/2)/W,(c.y+D/2)/D
        elif ax==0: u,v=((c.y if n.x>0 else -c.y)+D/2)/D,c.z/H
        else: u,v=((-c.x if n.y>0 else c.x)+W/2)/W,c.z/H
        uvl.data[li].uv=(u,v)
finish(o,wood,smooth=False)
t=0.045
for sx in (-1,1):
    for sy in (-1,1):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(sx*(W/2-t/2+0.004),sy*(D/2-t/2+0.004),H/2)); b=bpy.context.object; b.scale=(t,t,H); b.name=f"batten_{sx}_{sy}"
        bpy.ops.object.transform_apply(scale=True); m2=b.modifiers.new("b","BEVEL"); m2.width=0.008; m2.segments=2
        for v in b.data.vertices: v.co.x+=random.uniform(-.003,.003)
        finish(b,batt,smooth=False)
for z in (0.02,H-0.02):
    for sy in (-1,1):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,sy*(D/2+0.002),z)); b=bpy.context.object; b.scale=(W-0.02,0.03,0.04); b.name="rail"
        bpy.ops.object.transform_apply(scale=True); m2=b.modifiers.new("b","BEVEL"); m2.width=0.007; m2.segments=2; finish(b,batt,smooth=False)
export("crate")

# ---------- clothesline: two wooden T poles 3 m apart + sagging rope; origin at line centre floor
reset()
pw=mat("polewood",(0.38,0.27,0.17),0.85); rope=mat("rope",(0.78,0.72,0.58),0.9)
L=3.0; HT=1.95
for sx in (-1,1):
    log(f"pole_{sx}",(sx*L/2,0,0),(sx*L/2,0,HT),0.035,pw)
    log(f"arm_{sx}",(sx*L/2,-.22,HT-.08),(sx*L/2,.22,HT-.08),0.025,pw)
    for k in range(3):
        a=k/3*6.283+.4; log(f"foot_{sx}_{k}",(sx*L/2,0,0.32),(sx*L/2+math.cos(a)*.32,math.sin(a)*.32,0.0),0.022,pw)
for side in (-0.16,0.16):
    pts=[]
    for i in range(25):
        u=i/24; x=-L/2+u*L; z=HT-0.04-0.14*math.sin(u*math.pi)
        pts.append((x,side,z))
    cu=bpy.data.curves.new("rope","CURVE"); cu.dimensions="3D"; cu.bevel_depth=0.007; cu.bevel_resolution=1
    sp=cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for p,c in zip(sp.points,pts): p.co=(*c,1)
    o=bpy.data.objects.new("rope",cu); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target="MESH"); o.select_set(False)
    o.data.materials.append(rope)
export("clothesline")

# ---------- garments: origin = the pin line at top (z=0), cloth hangs down -Z
def cloth(name,outline,col,thick=0.008):
    reset()
    m=mat("cloth_"+name,col,0.95); pin=mat("pin",(0.7,0.55,0.35),0.7)
    me=bpy.data.meshes.new(name); bm=bmesh.new()
    vs=[bm.verts.new((x,0,z)) for x,z in outline]; bm.faces.new(vs)
    bmesh.ops.triangulate(bm,faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.beautify_fill(); bpy.ops.mesh.subdivide(number_cuts=6); bpy.ops.object.mode_set(mode="OBJECT")
    for v in o.data.vertices:  # hanging folds: vertical ripples growing toward the hem
        dn=-v.co.z; v.co.y+=0.02*math.sin(v.co.x*28+dn*3)*(0.3+dn*1.5)+0.01*math.sin(v.co.x*61)
    md=o.modifiers.new("t","SOLIDIFY"); md.thickness=thick; md.offset=0
    o.modifiers.new("s","SUBSURF").levels=1
    o.select_set(False); finish(o,m)
    xs=[x for x,z in outline if z>-0.01]
    for px in (min(xs)+0.05,max(xs)-0.05):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(px,0,0.01)); p=bpy.context.object; p.scale=(0.012,0.02,0.07); p.name="pin"
        bpy.ops.object.transform_apply(scale=True); b=p.modifiers.new("b","BEVEL"); b.width=0.004; b.segments=2; finish(p,pin)
    export("garment_"+name)
cloth("shirt",[(-.2,0),(-.07,0),(0,-.05),(.07,0),(.2,0),(.34,-.12),(.27,-.22),(.17,-.15),(.17,-.62),(-.17,-.62),(-.17,-.15),(-.27,-.22),(-.34,-.12)],(0.85,0.55,0.15))
cloth("pants",[(-.19,0),(.19,0),(.21,-.75),(.04,-.75),(0,-.22),(-.04,-.75),(-.21,-.75)],(0.2,0.25,0.38),0.01)
cloth("towel",[(-.24,0),(.24,0),(.25,-.58),(.18,-.6),(.1,-.58),(0,-.6),(-.1,-.58),(-.18,-.6),(-.25,-.58)],(0.75,0.22,0.2))
cloth("socks",[(-.09,0),(-.02,0),(-.02,-.28),(-.11,-.33),(-.15,-.29),(-.09,-.22),(.02,0),(.09,0),(.09,-.22),(.15,-.29),(.11,-.33),(.02,-.28),(.02,0)][:6]+[(-.09,-0.0)][0:0],(0.92,0.9,0.85))
