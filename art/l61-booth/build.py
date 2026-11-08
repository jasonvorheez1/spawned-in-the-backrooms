# Level 6.1 diner booth: the Tripo booth with its two benches slid OUT from the table (not stretched), so a body fits between
# table and seat. Prints the engine-local sit spots and the layout box that keeps the placed scale.
import bpy, bmesh, mathutils, math, json
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/b/booth.glb")
o=[o for o in bpy.context.scene.objects if o.type=="MESH"][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bm=bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=0.002)
seen=set(); islands=[]
for v in bm.verts:
    if v in seen: continue
    st=[v]; I=[]; seen.add(v)
    while st:
        a=st.pop(); I.append(a)
        for e in a.link_edges:
            b=e.other_vert(a)
            if b not in seen: seen.add(b); st.append(b)
    islands.append(I)
big=sorted(islands,key=len,reverse=True)
# the old placement: the 1.22-widened booth fitted into this box (engine local, metres); its per-axis scale is kept
OLD_EXT=None
def ext(vs): return [max(v.co[i] for v in vs)-min(v.co[i] for v in vs) for i in range(3)]
allv=list(bm.verts)
TV=[v for I in big[2:] for v in I]
top=big[2]; c=sum((v.co for v in top),mathutils.Vector())/len(top)
S=0.86; SH=mathutils.Vector((0.13,-0.13,0)); topset=set(top)
for v in TV:
    if v in topset: v.co.x=c.x+(v.co.x-c.x)*S; v.co.y=c.y+(v.co.y-c.y)*S
    v.co+=SH
BV=[v for B in big[:2] for v in B]
# old extents (benches *1.22) measured for the scale the game used
old=[(v.co.x*1.22,v.co.y*1.22,v.co.z) for v in BV]+[tuple(v.co) for v in TV]
OLD=[max(p[i] for p in old)-min(p[i] for p in old) for i in range(3)]
# slide: the -x bench out along -x, the +y bench out along +y, eased across the plain seat runs so the corner rides both
D=0.24
def ramp(t): t=max(0.0,min(1.0,t)); return t*t*(3-2*t)
for v in BV:
    x,y=v.co.x,v.co.y
    v.co.x = x*1.22 - D*ramp((0.10-x)/0.25)
    v.co.y = y*1.22 + D*ramp((y+0.25)/0.25)
bm.to_mesh(o.data)
me=o.data
xs=[v.co.x for v in me.vertices]; ys=[v.co.y for v in me.vertices]; zs=[v.co.z for v in me.vertices]
mn=(min(xs),min(ys),min(zs)); mx=(max(xs),max(ys),max(zs)); NEW=[mx[i]-mn[i] for i in range(3)]
# the game's box was local x 2.2 (blender x), y 1.35 (blender z), z 1.8 (blender y)
s=(2.2/OLD[0], 1.8/OLD[1], 1.35/OLD[2])
# seat tops of the upholstery
up=[p for p in me.polygons if p.normal.z>0.9 and -0.25<p.center.z<0.1 and p.index<10**9]
bench_faces=set()
upv=set(v.index for v in big[0])
seatA=[p for p in up if p.center.x< -0.35 and p.center.y<0.2]   # -x bench run
seatB=[p for p in up if p.center.y> 0.3 and p.center.x> -0.2]    # +y bench run
def box(ps): return (min(p.center.x for p in ps),max(p.center.x for p in ps),min(p.center.y for p in ps),max(p.center.y for p in ps),max(p.center.z for p in ps))
# engine local of a blender point, with the box centred on the feet: ex=(bx-cx)*sx, ey=(bz-mnz)*sy, ez=-(by-cy)*sz
cx=(mn[0]+mx[0])/2; cy=(mn[1]+mx[1])/2
def eng(bx,by,bz): return [round((bx-cx)*s[0],3), round((bz-mn[2])*s[2],3), round(-(by-cy)*s[1],3)]
A=box(seatA); B=box(seatB)
out={"layout":{"x":round(NEW[0]*s[0]/2,3),"y":round(NEW[2]*s[2],3),"z":round(NEW[1]*s[1]/2,3)},
 "seatA":{"c":eng((A[0]+A[1])/2,(A[2]+A[3])/2,A[4]),"len":round((A[3]-A[2])*s[1],2),"depth":round((A[1]-A[0])*s[0],2)},
 "seatB":{"c":eng((B[0]+B[1])/2,(B[2]+B[3])/2,B[4]),"len":round((B[1]-B[0])*s[0],2),"depth":round((B[3]-B[2])*s[1],2)},
 "table":eng(c.x+0.13,c.y-0.13,0.29),"nA":len(seatA),"nB":len(seatB)}
print("BOOTH",json.dumps(out))
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=600
w=bpy.data.worlds.new("w"); w.color=(0.7,0.7,0.7); sc.world=w
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.5,0,0.8); l.data.energy=4
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
for n,loc,rot in (("a",(2.2,-2.2,1.6),(62,0,45)),("b",(0,0,3.2),(0,0,0))):
    cam.location=loc; cam.rotation_euler=tuple(math.radians(r) for r in rot)
    sc.render.filepath=f"/tmp/b/proof_{n}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
bpy.ops.export_scene.gltf(filepath="/workspace/l61-booth-spaced2.glb",export_apply=True)
