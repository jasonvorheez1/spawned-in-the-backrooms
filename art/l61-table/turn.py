# stage 2 over build.py's export (fetched as /tmp/t/spaced.glb): every chair turned 180 deg about its own centre so its seat faces the table
import bpy, bmesh, mathutils, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/t/spaced.glb")
ms=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in ms: bpy.context.view_layer.objects.active=o; o.select_set(True)
if len(ms)>1: bpy.ops.object.join()
o=bpy.context.view_layer.objects.active
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
groups={}
for I in islands:
    c=sum((v.co for v in I),mathutils.Vector())/len(I)
    r=math.hypot(c.x,c.y)
    if r>0.45 and max(v.co.z for v in I)<1.2:
        q=(c.x>0, c.y>0); groups.setdefault(q,[]).append(I)
R=mathutils.Matrix.Rotation(math.pi,3,"Z")
for q,G in groups.items():
    vs=[v for I in G for v in I]
    xs=[v.co.x for v in vs]; ys=[v.co.y for v in vs]
    c=mathutils.Vector(((min(xs)+max(xs))/2,(min(ys)+max(ys))/2,0))
    for v in vs: v.co=R@(v.co-c)+c
    print("chair",q,len(G),"islands")
bm.to_mesh(o.data); bm.free()
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=500
w=bpy.data.worlds.new("w"); w.color=(0.7,0.7,0.7); sc.world=w
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.6,0,0.6); l.data.energy=4
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
for n,loc,rot in (("a",(2.6,-2.6,2.0),(60,0,45)),("b",(0,0,4),(0,0,0))):
    cam.location=loc; cam.rotation_euler=tuple(math.radians(x) for x in rot)
    sc.render.filepath=f"/tmp/t/turn_{n}.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
bpy.ops.export_scene.gltf(filepath="/workspace/l61-table-faced.glb",export_apply=True)
