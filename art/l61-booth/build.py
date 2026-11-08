# Level 6.1 diner booth: the Tripo booth's table shrunk and slid toward the open corner so a body fits between table and benches
import bpy, bmesh, mathutils, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/b/booth.glb")
o=[o for o in bpy.context.scene.objects if o.type=="MESH"][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bm=bmesh.new(); bm.from_mesh(o.data)
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
# backrests run along +y (back bench) and -x (side bench); the table stands inside them
tab=[]
for I in islands:
    xs=[v.co.x for v in I]; ys=[v.co.y for v in I]; zs=[v.co.z for v in I]
    if min(xs)>-0.42 and max(ys)<0.36 and max(zs)<0.30 and max(xs)<0.42 and min(ys)>-0.5:
        # a seat block is low and wide; the table is a top (z 0.1-0.3) or the thin pedestal
        if max(zs)>0.12 or (max(xs)-min(xs))<0.2:
            tab.append(I)
TV=[v for I in tab for v in I]
c=sum((v.co for v in TV),mathutils.Vector())/len(TV)
S=0.8; SH=mathutils.Vector((0.07,-0.07,0))
for v in TV:
    v.co.x=c.x+(v.co.x-c.x)*S+SH.x; v.co.y=c.y+(v.co.y-c.y)*S+SH.y
print("islands",len(islands),"table islands",len(tab),"verts",len(TV),"centre",tuple(round(k,2) for k in c))
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
