import bpy, sys, mathutils
src = sys.argv[sys.argv.index("--")+1]; out = sys.argv[sys.argv.index("--")+2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.render.resolution_x=600; sc.render.resolution_y=800
for o in list(sc.objects):
  if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
meshes=[o for o in sc.objects if o.type=="MESH"]
for o in meshes:
  if o.data.shape_keys:
    for k in o.data.shape_keys.key_blocks[1:]: k.value = 1.0 if k.name=="Chest" else 0.0
  for m in o.data.materials:
    if m and m.use_nodes:
      b=m.node_tree.nodes.get("Principled BSDF")
      if b: b.inputs["Base Color"].default_value=(0.9,0.62,0.35,1)
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
shoot("front",mathutils.Vector((0,0,0.62)),1.9,(0,-1))
shoot("chestside",mathutils.Vector((0,-0.06,0.53)),0.55,(1,0))
shoot("chestq",mathutils.Vector((0,-0.06,0.53)),0.55,(0.6,-0.8))
shoot("headside",mathutils.Vector((0,-0.1,0.85)),0.75,(1,0))
shoot("headq",mathutils.Vector((0,-0.1,0.85)),0.75,(0.5,-0.87))
shoot("hipsq",mathutils.Vector((0,-0.04,0.32)),0.8,(0.6,-0.8))
shoot("feetq",mathutils.Vector((0,-0.1,0.04)),0.5,(0.45,-0.89))
