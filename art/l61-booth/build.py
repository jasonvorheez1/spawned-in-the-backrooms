# Level 6.1 diner booth: the Tripo booth's table shrunk and slid toward the open corner so a body fits between table and benches
import bpy, bmesh, mathutils, math
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
# welded, the benches are the two big islands; the table (top + pedestal) shrinks a touch and slides toward the open corner, out of the backrests
big=sorted(islands,key=len,reverse=True)
TV=[v for I in big[2:] for v in I]
top=big[2]; c=sum((v.co for v in top),mathutils.Vector())/len(top)
S=0.86; SH=mathutils.Vector((0.13,-0.13,0))
for v in TV:
    if v in set(top): v.co.x=c.x+(v.co.x-c.x)*S; v.co.y=c.y+(v.co.y-c.y)*S
    v.co+=SH
# the two benches each slide 0.22 m away from the table, along the line from the table to the bench
for B in big[:2]:
    bc=sum((v.co for v in B),mathutils.Vector())/len(B); d=mathutils.Vector((bc.x-c.x,bc.y-c.y,0))
    d=mathutils.Vector((d.x,0,0)) if abs(d.x)>abs(d.y) else mathutils.Vector((0,d.y,0))
    d.normalize(); 
    for v in B: v.co+=d*0.22
print("islands",len(islands),"table verts",len(TV))
bm.to_mesh(o.data); bm.free()
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=600
w=bpy.data.worlds.new("w"); w.color=(0.7,0.7,0.7); sc.world=w
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.5,0,0.8); l.data.energy=4
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
for n,loc,rot in (("a",(2.2,-2.2,1.6),(62,0,45)),("b",(0,0,3.2),(0,0,0))):
    cam.location=loc; cam.rotation_euler=tuple(math.radians(r) for r in rot)
    sc.render.filepath=f"/tmp/b/proof_{n}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
bpy.ops.export_scene.gltf(filepath="/workspace/l61-booth-spaced.glb",export_apply=True)
