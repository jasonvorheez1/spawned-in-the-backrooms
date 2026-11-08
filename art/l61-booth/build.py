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
# welded, each bench is whole: the table stays, the back bench slides +y and the side bench -x so a body fits
PUSH=0.2
big=sorted(islands,key=len,reverse=True)
for I in big[:12]:
    xs=[v.co.x for v in I]; ys=[v.co.y for v in I]; zs=[v.co.z for v in I]
    print("isl",len(I),"x",round(min(xs),2),round(max(xs),2),"y",round(min(ys),2),round(max(ys),2),"z",round(min(zs),2),round(max(zs),2))
mb=ms=0
for I in islands:
    xs=[v.co.x for v in I]; ys=[v.co.y for v in I]
    c=sum((v.co for v in I),mathutils.Vector())/len(I)
    w=max(xs)-min(xs); h=max(ys)-min(ys)
    d=mathutils.Vector((0,0,0))
    if c.y>0.25 and w>h*0.6: d.y=PUSH; mb+=1        # back bench: wide along x, at the back
    elif c.x<-0.3: d.x=-PUSH; ms+=1                  # side bench: along y, on the left
    if d.length:
        for v in I: v.co+=d
print("islands",len(islands),"back",mb,"side",ms)
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
