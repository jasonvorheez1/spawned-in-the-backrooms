# Tripo semantic segment of the Level 70 stall -> separate usable props, real scale, origin at bottom centre
import bpy, mathutils, os, json
SRC="/workspace/stall/stalla_seg.glb"; OUT="/workspace/stall/parts"; os.makedirs(OUT,exist_ok=True); os.makedirs("/tmp/stallp",exist_ok=True)
S=2.6  # seg file is ~0.92 tall; the stall stands ~2.4 m
G={"stall_frame":[1,2,3,4,6,13,17,24],"stall_tarp":[0],"stall_jars":[7,14,15,18,20],"stall_cans":[11,12,16,21,22,23],
   "stall_sack":[5],"stall_can":[8],"stall_lantern":[9],"stall_boot":[10],"stall_bit":[19]}
rep={}
for name,ids in G.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    keep=[bpy.data.objects[f"tripo_part_{i}"] for i in ids]
    for o in list(bpy.context.scene.objects):
        if o.type=="MESH" and o not in keep: bpy.data.objects.remove(o)
    for o in keep:
        o.parent=None
    bpy.ops.object.select_all(action="DESELECT")
    for o in keep: o.select_set(True)
    bpy.context.view_layer.objects.active=keep[0]
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if len(keep)>1: bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active; o.name=name
    for e in [x for x in bpy.context.scene.objects if x.type!="MESH"]: bpy.data.objects.remove(e)
    vs=[v.co for v in o.data.vertices]
    lo=mathutils.Vector([min(v[i] for v in vs) for i in range(3)]); hi=mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
    o.data.transform(mathutils.Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
    o.data.transform(mathutils.Matrix.Scale(S,4))
    o.location=(0,0,0); bpy.ops.object.shade_smooth()
    d=(hi-lo)*S; rep[name]={"w":round(d.x,2),"d":round(d.y,2),"h":round(d.z,2),"tris":sum(len(p.vertices)-2 for p in o.data.polygons)}
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb",export_apply=True)
    r=max(d)*1.0+0.2; c=mathutils.Vector((0,0,d.z/2))
    cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); bpy.context.scene.collection.objects.link(cam)
    cam.location=c+mathutils.Vector((r*1.1,-r*1.4,r*0.8)); cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler(); bpy.context.scene.camera=cam
    l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); l.data.energy=4; l.rotation_euler=(0.8,0.2,-0.6); bpy.context.scene.collection.objects.link(l)
    w=bpy.data.worlds.new("w"); bpy.context.scene.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.5,0.5,0.5,1)
    s=bpy.context.scene; s.render.engine="CYCLES"; s.cycles.samples=12; s.render.resolution_x=s.render.resolution_y=360; s.render.filepath=f"/tmp/stallp/{name}.png"
    bpy.ops.render.render(write_still=True)
print("REP",json.dumps(rep))
