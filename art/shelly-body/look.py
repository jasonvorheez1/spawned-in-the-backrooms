import bpy, sys, mathutils
src = sys.argv[sys.argv.index("--")+1]; out = sys.argv[sys.argv.index("--")+2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.render.resolution_x=600; sc.render.resolution_y=800
meshes=[o for o in sc.objects if o.type=="MESH"]
for o in meshes: print("MESH",o.name,len(o.data.vertices),[k.name for k in (o.data.shape_keys.key_blocks if o.data.shape_keys else [])], [ (k.name,round(k.value,2)) for k in (o.data.shape_keys.key_blocks if o.data.shape_keys else [])][:3])
dg=bpy.context.evaluated_depsgraph_get()
zs=[ (o.matrix_world@v.co) for o in meshes for v in o.evaluated_get(dg).data.vertices]
mn=mathutils.Vector((min(p.x for p in zs),min(p.y for p in zs),min(p.z for p in zs))); mx=mathutils.Vector((max(p.x for p in zs),max(p.y for p in zs),max(p.z for p in zs)))
print("BOUNDS",mn,mx)
w=bpy.data.worlds.new("w"); w.color=(0.6,0.6,0.65); sc.world=w
sun=bpy.data.objects.new("s",bpy.data.lights.new("s","SUN")); sun.data.energy=3; sun.rotation_euler=(0.8,0,0.6); sc.collection.objects.link(sun)
c=(mn+mx)/2; H=mx.z-mn.z
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera=cam; cam.data.lens=50
import math
views={"front":(0,-1),"side":(1,0),"q":(0.7,-0.7)}
def shoot(name,target,dist,dirv):
  cam.location=target+mathutils.Vector((dirv[0]*dist,dirv[1]*dist,0))
  d=target-cam.location; cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
  sc.render.filepath=f"{out}_{name}.png"; bpy.ops.render.render(write_still=True)
for n,dv in views.items(): shoot(n,c,H*2.6,dv)
head=mathutils.Vector((c.x,c.y,mn.z+H*0.78))
shoot("headside",head,H*1.1,(1,0)); shoot("headq",head,H*1.1,(0.6,-0.8))
chest=mathutils.Vector((c.x,c.y,mn.z+H*0.5))
shoot("chestside",chest,H*1.1,(1,0))
