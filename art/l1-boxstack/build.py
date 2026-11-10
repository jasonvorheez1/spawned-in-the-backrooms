# Splits the Tripo "pallet of boxes" into a pallet and three separate boxes (Shelly: "the boxes in this model should be separated")
import bpy, bmesh, json, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/pal/pal.glb")
src=[o for o in bpy.context.scene.objects if o.type=="MESH"][0]
bpy.context.view_layer.objects.active=src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
S=1.3/0.6
src.data.transform(__import__("mathutils").Matrix.Scale(S,4))
CUTS=[-0.205*S,-0.012*S,0.166*S]
names=["pallet","box0","box1","box2"]
def band(z):
    for i,c in enumerate(CUTS):
        if z<c: return i
    return 3
out={}
base=-0.3*S
for k,nm in enumerate(names):
    o=src.copy(); o.data=src.data.copy(); o.name=nm; bpy.context.collection.objects.link(o)
    bm=bmesh.new(); bm.from_mesh(o.data)
    kill=[f for f in bm.faces if band(f.calc_center_median().z)!=k]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    edges=[e for e in bm.edges if e.is_boundary]
    if edges: bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    vs=[v.co for v in o.data.vertices]
    mn=Vector((min(v.x for v in vs),min(v.y for v in vs),min(v.z for v in vs))); mx=Vector((max(v.x for v in vs),max(v.y for v in vs),max(v.z for v in vs)))
    feet=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
    o.data.transform(__import__("mathutils").Matrix.Translation(-feet))
    # glTF: blender x -> x, z -> y(up), y -> -z
    out[nm]={"off":[round(feet.x,3),round(feet.z-base,3),round(-feet.y,3)],"size":[round(mx.x-mn.x,3),round(mx.z-mn.z,3),round(mx.y-mn.y,3)],"tris":len(o.data.polygons)}
bpy.data.objects.remove(src)
for nm in names:
    bpy.ops.object.select_all(action="DESELECT"); o=bpy.data.objects[nm]; o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.export_scene.gltf(filepath=f"/workspace/pal/{nm}.glb", use_selection=True, export_apply=True)
json.dump(out,open("/workspace/pal/parts.json","w"),indent=1); print(json.dumps(out))
# proof: parts pulled apart
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=16; sc.render.resolution_x=900; sc.render.resolution_y=700
for i,nm in enumerate(names): bpy.data.objects[nm].location=(i*1.1-1.6,0,0)
cam=bpy.data.cameras.new("c"); co=bpy.data.objects.new("c",cam); sc.collection.objects.link(co); co.location=(0,-5,1.6); co.rotation_euler=(math.radians(78),0,0); sc.camera=co
L=bpy.data.lights.new("l","SUN"); L.energy=4; lo=bpy.data.objects.new("l",L); sc.collection.objects.link(lo); lo.rotation_euler=(math.radians(50),0,math.radians(20))
sc.world=bpy.data.worlds.new("w"); sc.world.color=(0.4,0.4,0.42)
sc.render.filepath="/tmp/pal_proof.png"; bpy.ops.render.render(write_still=True)
