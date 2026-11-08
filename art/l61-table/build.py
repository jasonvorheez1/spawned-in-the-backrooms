# Level 6.1 food-court table: the source set's chairs pushed out from the table so a body fits between them
import bpy, bmesh, mathutils, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/t/table.glb")
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in meshes:
    bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.join(); o=bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bm=bmesh.new(); bm.from_mesh(o.data)
# islands
seen=set(); islands=[]
for v in bm.verts:
    if v in seen: continue
    st=[v]; isl=[]; seen.add(v)
    while st:
        a=st.pop(); isl.append(a)
        for e in a.link_edges:
            b=e.other_vert(a)
            if b not in seen: seen.add(b); st.append(b)
    islands.append(isl)
PUSH=0.32
moved=0
for isl in islands:
    c=sum((v.co for v in isl),mathutils.Vector())/len(isl)
    r=math.hypot(c.x,c.y)
    zmax=max(v.co.z for v in isl)
    if r>0.38 and zmax<1.2:  # a chair part (the table is centred on the origin)
        d=mathutils.Vector((c.x/r,c.y/r,0))*PUSH
        for v in isl: v.co+=d
        moved+=1
bm.to_mesh(o.data); bm.free()
print("islands",len(islands),"moved",moved)
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=500
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam
cam.location=(2.6,-2.6,2.4); cam.rotation_euler=(math.radians(58),0,math.radians(45))
l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.7,0,0.5); l.data.energy=4
w=bpy.data.worlds.new("w"); w.color=(0.6,0.6,0.6); sc.world=w
sc.render.filepath="/tmp/t/proof.png"; bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(l)
bpy.ops.export_scene.gltf(filepath="/workspace/l61-table-spaced.glb",export_apply=True)
