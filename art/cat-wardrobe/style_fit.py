"""Art-directed kemono ears, head tufts and hairstyles on the current demo rigs.

Blender -b --factory-startup --python style_fit.py -- DECODED_BODY_DIR OUTPUT_DIR
The two input GLBs are cat-f.glb and cat-m.glb from the current wardrobe.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

P = "mixamorig:Head"
EAR_KEYS = ("Ear_Tall", "Ear_Small", "Ear_Fold", "Ear_Wide")
FLUFF = ("cheeks", "burns", "crest", "lynx", "nape", "cowlick")
HAIR = ("afropuff", "crop", "halfup", "long", "pixie", "shaggy", "sidetail", "twintails", "undercut")

def ease(a,b,x):
    t = min(1,max(0,(x-a)/(b-a)))
    return t*t*(3-2*t)

def parts(obj, points):
    # GLB may split the pink cup from its rim at a material seam.
    roots, adj = {}, [set() for _ in points]
    for i,p in enumerate(points):
        k = tuple(round(c,5) for c in p)
        j = roots.setdefault(k,i)
        if j != i:
            adj[i].add(j)
            adj[j].add(i)
    for edge in obj.data.edges:
        a,b=edge.vertices
        adj[a].add(b)
        adj[b].add(a)
    pending=set(range(len(points)))
    islands=[]
    while pending:
        todo=[pending.pop()]
        group=[]
        while todo:
            i=todo.pop()
            group.append(i)
            take=adj[i]&pending
            pending.difference_update(take)
            todo.extend(take)
        islands.append(group)
    return sorted(islands,key=len,reverse=True)

def ears_fit(head):
    basis = head.data.shape_keys.key_blocks["Basis"]
    world = head.matrix_world
    points=[world@v.co for v in basis.data]
    skull,*rest=parts(head,points)
    earparts=sorted((p for p in rest if len(p)>30),key=lambda p:sum(points[i].x for i in p)/len(p))
    assert len(earparts)==2
    ears={}
    for side,ids in zip((-1,1),earparts):
        low=min(points[i].z for i in ids)
        tip=max((points[i] for i in ids),key=lambda v:v.z)
        roots=[points[i] for i in ids if points[i].z < low+.065]
        pivot=sum(roots,Vector())/len(roots)
        pivot.z=low+.035
        ears[side]=(pivot,tip,ids)
    inv=world.inverted()
    for name in EAR_KEYS:
        key=head.data.shape_keys.key_blocks.get(name) or head.shape_key_add(name=name,from_mix=False)
        key.value=0
        for i,p in enumerate(points):
            key.data[i].co=inv@p
        for side,(pivot,tip,ids) in ears.items():
            for i in ids:
                key.data[i].co=inv@ear_point(points[i],pivot,tip,side,name)
    keep=set(skull)
    tree=BVHTree.FromPolygons(points,[tuple(f.vertices) for f in head.data.polygons
                                      if all(i in keep for i in f.vertices)])
    core=[points[i] for i in skull]
    crown=max(p.z for p in core)
    low=min(p.z for p in core)
    cy=(min(p.y for p in core)+max(p.y for p in core))/2
    return tree,Vector((0,cy,low+.64*(crown-low))),ears

def ear_point(p,c,tip,side,name):
    x,y,z = p-c
    height=tip.z-c.z
    t=max(0,z/height)
    w=ease(0,.46,t)
    if name=="Ear_Tall":
        return p+Vector((-.16*x*w, -.10*y*w, z*.24*w))
    if name=="Ear_Small":
        return p+Vector((-.10*x*w, .08*y*w, -.32*z*w))
    if name=="Ear_Wide":
        return p+Vector((side*.110*t*w, .014*t*w, -.075*t*w))
    # Roll the upper cartilage forward and down around a soft bend. Rotate the
    # cup section too, so it folds as a surface instead of shearing the rim.
    start=.39*height
    d=max(0,z-start)
    span=.61*height
    a=1.88*d/span
    radius=span/1.88
    dy=-radius*(1-math.cos(a)) + y*(math.cos(a)-1)
    dz=start+radius*math.sin(a)+y*math.sin(a)-z
    return p+Vector((side*.022*w*t,dy,dz)) if d else p

class Sculpt:
    def __init__(self,tree,center):
        self.tree,self.center=tree,center
        self.verts=[]
        self.faces=[]

    def surface(self, direction, lift=0):
        u=Vector(direction).normalized()
        hit,n,_,_=self.tree.ray_cast(self.center+u*.8,-u,1.1)
        assert hit is not None
        return hit+n*lift

    def lock(self, path, width, depth, outward):
        # A flattened, swept oval with a buried root and one rounded taper.
        from mathutils.geometry import interpolate_bezier
        points=interpolate_bezier(*[Vector(p) for p in path],15)
        rings=[]
        for i,c in enumerate(points):
            t=i/(len(points)-1)
            d=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
            normal=Vector(outward)
            lateral=d.cross(normal).normalized()
            if not lateral.length:
                lateral=d.cross(Vector((1,0,0))).normalized()
            normal=lateral.cross(d).normalized()
            envelope=(.72+.36*math.sin(math.pi*t))*(1-ease(.49,1.01,t))
            ring=[]
            for j in range(12):
                a=2*math.pi*j/12
                ring.append(len(self.verts))
                self.verts.append(c+(lateral*math.cos(a)*width+normal*math.sin(a)*depth)*max(.025,envelope))
            if rings:
                prev=rings[-1]
                self.faces.extend((prev[j],prev[(j+1)%12],ring[(j+1)%12],ring[j]) for j in range(12))
            rings.append(ring)
        self.faces.extend([tuple(reversed(rings[0])),tuple(rings[-1])])

    def cap(self, length):
        start=len(self.verts)
        seg=96
        for j in range(17):
            f=max(.002,j/16)
            for i in range(seg):
                a=i*2*math.pi/seg
                front=max(0,-math.sin(a))
                back=max(0,math.sin(a))
                notch=.22*ease(.82,.99,abs(math.cos(a)))
                scallop=.035*front*math.cos(9*a)+.075*front*math.cos(a)
                polar=f*(1.07+.63*back-.29*front+length*(1-front)+scallop-notch)
                n=(math.sin(polar)*math.cos(a),math.sin(polar)*math.sin(a),math.cos(polar))
                self.verts.append(self.surface(n, .018 + .007*math.sin(f*math.pi) - .020*f**14))
            if j:
                for i in range(seg):
                    a=start+(j-1)*seg+i
                    b=start+(j-1)*seg+(i+1)%seg
                    self.faces.append((a,b,b+seg,a+seg))
        self.faces.append(tuple(reversed(range(start,start+seg))))

    def puff(self, center, radius):
        # Rounded curls grouped into one tied silhouette.
        c=Vector(center)
        start=len(self.verts)
        for j in range(11):
            a=max(.001,min(math.pi-.001,j*math.pi/10))
            for i in range(16):
                b=i*2*math.pi/16
                self.verts.append(c+Vector((radius*math.sin(a)*math.cos(b),
                                            radius*.93*math.sin(a)*math.sin(b),radius*math.cos(a))))
            if j:
                for i in range(16):
                    k=start+(j-1)*16+i
                    n=start+(j-1)*16+(i+1)%16
                    self.faces.append((k,n,n+16,k+16))

def fluff_art(s,kind,ears):
    for side in (-1,1):
        if kind in ("cheeks","burns"):
            for i in range(3 if kind=="cheeks" else 4):
                root=s.surface((side,-.53+.15*i,-.31+.08*i),-.026)
                d=Vector((side*(.086-.009*i),.018+.013*i,-.035-.009*i))
                if kind=="burns":
                    d.y+=.042
                    d.z+=.008
                s.lock((root,root+d*.25+Vector((0,0,.014)),root+d*.77,root+d),.029,.017,(side,-.5,.35))
        if kind=="nape":
            for i in range(3):
                root=s.surface((side*(.19+.19*i),1,-.34+.08*i),-.014)
                d=Vector((side*(.022+.012*i),.043,-.058+.007*i))
                s.lock((root,root+d*.27,root+d*.65+Vector((0,.012,0)),root+d),.033,.02,(side*.3,1,0))
        if kind=="lynx":
            pivot,tip,_=ears[side]
            root=tip.lerp(pivot,.22)
            d=tip-root+Vector((side*.018,-.008,.041))
            s.lock((root,root+d*.24+Vector((0,0,.013)),root+d*.7,root+d),.014,.012,(0,-1,0))
    if kind=="crest":
        for i in (-1,0,1):
            root=s.surface((i*.21,-.63,1),-.013)
            d=Vector((.045+.012*i,-.027,.067-.013*abs(i)))
            s.lock((root,root+d*.2+Vector((0,0,.023)),root+d*.61,root+d),.040,.021,(0,-.65,.75))
    if kind=="cowlick":
        root=s.surface((-.14,.05,1),-.012)
        s.lock((root,root+Vector((-.027,-.02,.080)),root+Vector((.044,-.045,.126)),
                root+Vector((.071,-.075,.069))),.024,.016,(0,-1,0))

def hair_art(s,style):
    lengths={"crop":-.10,"undercut":-.21,"pixie":-.01,"shaggy":.28,"long":.55,
             "halfup":.40,"sidetail":.25,"twintails":.17,"afropuff":.02}
    s.cap(lengths[style])
    settings={
        "crop":      (5, .22, .70, .045), "undercut": (4,-.33,.68,.046),
        "pixie":     (7,-.36, .54, .035), "shaggy":   (7, .18,.35,.038),
        "long":      (7,-.15, .42, .037), "halfup":   (6, .04,.53,.042),
        "twintails": (6, .00, .57, .039), "sidetail": (6,-.27,.47,.041),
        "afropuff":  (5, .04, .66, .046),
    }
    count,sweep,reach,width=settings[style]
    for i in range(count):
        x=2*(i+.5)/count-1
        curtain=style in ("twintails","halfup")
        side=-1 if x<0 else 1
        root_x=x*.32-sweep*.38
        end_x=x*.84+sweep+(side*.13 if curtain else 0)
        root=s.surface((root_x,.12,1),.012)
        middle=s.surface((x*.49+sweep*.14,-.46,.97),.033)
        far=s.surface((x*.65+sweep*.60,-.80,.73),.027)
        end_z=reach+.12*math.cos(i*2.11)+.23*abs(x)
        if curtain:end_z+=.13*(1-abs(x))
        end=s.surface((end_x,-.95,max(.36,end_z)),.007)
        s.lock((root,middle,far,end),width*(.84+.19*math.sin(i*1.7)**2),.016,(0,-.8,.56))
    if style in ("shaggy","long","halfup","pixie"):
        for side in (-1,1):
            for i in range(4):
                root=s.surface((side*(.64+.09*i),.06+.28*i,.74),.021)
                anchor=s.surface((side*(.87-.1*i),.36+.32*i,.17),.024)
                drop={"long":.20,"halfup":.145,"shaggy":.068,"pixie":.02}[style]
                end=anchor+Vector((side*(.018-.005*i),.036+.005*i,-drop+.008*i))
                s.lock((root,root.lerp(anchor,.55)+Vector((side*.012,.011,.01)),anchor,end),
                       .043,.024,(side,.6,.1))
    tails={"twintails":(-1,1),"sidetail":(1,),"halfup":(0,)}.get(style,())
    for side in tails:
        root=s.surface((side*.77,.94,.25 if side else .77),.006)
        for j in range(4):
            d=Vector((side*(.035+.014*j),.055+.009*j,-(.125+.026*j)))
            p=root+Vector((.010*(j-1.5),.006*j,.006*j))
            s.lock((p,p+Vector((side*.028,.059,.028)),p+d*.65,p+d),.036,.029,(side*.45,1,0))
    if style=="afropuff":
        for side in (-1,1):
            root=s.surface((side*.75,.82,.75),.019)
            c=root+Vector((side*.026,.017,.020))
            s.puff(c,.080)
            for j in range(6):
                a=j*math.pi/3
                s.puff(c+Vector((.053*math.cos(a),.042*math.sin(a),.020*math.sin(2*a))),.049)

def accessory(s,rig,material,name):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(s.verts,[],s.faces)
    mesh.update()
    # Flip inconsistent sweep winding, preserving the smooth silhouette.
    import bmesh
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for f in mesh.polygons:f.use_smooth=True
    obj.vertex_groups.new(name=P).add(list(range(len(mesh.vertices))),1,"REPLACE")
    obj.parent=rig
    obj.matrix_parent_inverse=rig.matrix_world.inverted()
    obj.modifiers.new("Head binding","ARMATURE").object=rig
    return obj

def export(path,objects,animations=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,
        export_skins=True,export_morph=True,export_animations=animations,export_animation_mode="NLA_TRACKS")

def main():
    src,out=map(Path,sys.argv[-2:])
    out.mkdir(parents=True,exist_ok=True)
    for sex in "fm":
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(src/f"cat-{sex}.glb"))
        rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
        head=bpy.data.objects["Head"]
        tree,center,ears=ears_fit(head)
        export(out/f"cat-{sex}.glb",{rig,head,bpy.data.objects["Body"]},True)
        rig.animation_data_clear()
        for mat,styles,build in (("fluff",FLUFF,fluff_art),("hair",HAIR,hair_art)):
            material=bpy.data.materials.new(mat)
            for kind in styles:
                s=Sculpt(tree,center)
                if mat=="fluff":build(s,kind,ears)
                else:build(s,kind)
                obj=accessory(s,rig,material,kind)
                if kind=="lynx":
                    basis=obj.shape_key_add(name="Basis",from_mix=False)
                    for name in EAR_KEYS:
                        key=obj.shape_key_add(name=name,from_mix=False)
                        for i,v in enumerate(basis.data):
                            side=-1 if v.co.x<0 else 1
                            c,tip,_=ears[side]
                            key.data[i].co=ear_point(v.co,c,tip,side,name)
                assert len(obj.data.vertices)>0 and len(obj.data.vertices)<15000
                export(out/f"{mat}-{kind}-{sex}.glb",{rig,obj})
                mesh=obj.data
                bpy.data.objects.remove(obj,do_unlink=True)
                bpy.data.meshes.remove(mesh)

if __name__=="__main__":
    main()
