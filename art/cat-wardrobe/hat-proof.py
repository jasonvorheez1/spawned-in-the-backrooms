# proof sheet: each fitted hat on its cat body, front 3/4 and back, Cycles
import bpy, sys, os, math
from mathutils import Vector
OUT="/workspace/hats/out"; P="/tmp/hf/proof"; os.makedirs(P, exist_ok=True)
kinds = sys.argv[sys.argv.index("--")+1:]
def cam(name, loc, tgt):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); bpy.context.scene.collection.objects.link(c)
    c.location = loc; d = Vector(tgt) - Vector(loc); c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); c.data.lens = 50
    return c
for sex in ("f","m"):
  for k in kinds:
    f = f"{OUT}/{k}-{sex}.glb"
    if not os.path.exists(f): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/tmp/hf/body{sex}.glb")
    for o in list(bpy.context.scene.objects):
        if o.type=="MESH" and o.name not in ("Head","Body") and "Body" not in o.name and "Head" not in o.name: bpy.data.objects.remove(o)
    bpy.ops.import_scene.gltf(filepath=f)
    hats=[o for o in bpy.context.selected_objects if o.type=="MESH"]
    red = bpy.data.materials.new("r"); red.diffuse_color=(0.8,0.15,0.1,1); red.use_nodes=True
    red.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.8,0.15,0.1,1)
    for h in hats:
        h.data.materials.clear(); h.data.materials.append(red)
    hd=bpy.data.objects.get("Head"); hz=[(hd.matrix_world@Vector(b)).z for b in hd.bound_box]; zs=[(h.matrix_world@Vector(b)).z for h in hats for b in h.bound_box]; top=max(zs+hz); cz=max(hz)-0.12
    sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=sc.render.resolution_y=420
    w=bpy.data.worlds.new("w"); sc.world=w; w.color=(0.5,0.5,0.5)
    for n,(loc) in (("a",(0.55,-0.95,cz+0.12)),("b",(-0.6,0.9,cz+0.15)),("c",(1.1,0.0,cz))):
        c=cam(n,loc,(0,0,cz)); sc.camera=c
        L=bpy.data.objects.new("L"+n,bpy.data.lights.new("L"+n,"SUN")); sc.collection.objects.link(L); L.data.energy=3
        L.rotation_euler=(Vector((0,0,cz))-Vector(loc)).to_track_quat("-Z","Y").to_euler()
        sc.render.filepath=f"{P}/{k}-{sex}-{n}.png"; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(L)
