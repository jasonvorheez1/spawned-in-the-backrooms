# almond water bottle, lightened: 14.5k tris -> ~3k, textures to 512 (lagscope: 45 copies carried 63% of nearby tris)
import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/art/almond-lod/src.glb")
def proof(path):
    sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=12
    sc.render.resolution_x=sc.render.resolution_y=400
    if "Cam" not in bpy.data.objects:
        cam=bpy.data.cameras.new("Cam"); co=bpy.data.objects.new("Cam",cam); sc.collection.objects.link(co)
        co.location=(0.45,-0.55,0.3); co.rotation_euler=(math.radians(80),0,math.radians(40)); sc.camera=co
        l=bpy.data.lights.new("L","SUN"); l.energy=4; lo=bpy.data.objects.new("L",l); lo.rotation_euler=(0.6,0.2,0.8); sc.collection.objects.link(lo)
        w=bpy.data.worlds.new("W"); w.color=(0.4,0.4,0.4); sc.world=w
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
proof("/workspace/art/almond-lod/before.png")
tot=0
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':
        n=sum(len(p.vertices)-2 for p in o.data.polygons)
        m=o.modifiers.new("d",'DECIMATE'); m.ratio=min(1.0,3000/max(n,1))
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier="d")
        for p in o.data.polygons: p.use_smooth=True
        tot+=sum(len(p.vertices)-2 for p in o.data.polygons)
for im in bpy.data.images:
    if im.size[0]>512: im.scale(512,512*im.size[1]//im.size[0])
print("TRIS",tot)
proof("/workspace/art/almond-lod/after.png")
bpy.ops.export_scene.gltf(filepath="/workspace/art/almond-lod/almond-lod.glb",export_apply=True,export_image_format="JPEG")
