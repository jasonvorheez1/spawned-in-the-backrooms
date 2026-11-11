# Dawn's ponytail cut (hair.yml style 7 free): 43% of its faces point into the head and it carried
# custom split normals, so cards lit from the back read dark. Clear custom normals, point every face
# away from the head centre, smooth, export. Renders back views before/after.
import bpy, sys, bmesh
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--")+1:][:2]
def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    return next(o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('AnimeHair'))
def shoot(path):
    sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.render.resolution_x=sc.render.resolution_y=500
    h=next(o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('AnimeHair'))
    for o in bpy.data.objects:
        if o.type=='MESH' and o!=h: o.hide_render=True
    bb=[h.matrix_world@Vector(c) for c in h.bound_box]; c=sum(bb,Vector())/8; r=max((p-c).length for p in bb)
    cam=bpy.data.objects.new('C',bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera=cam
    cam.location=c+Vector((0,r*2.6,r*0.4)); cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
    l=bpy.data.objects.new('L',bpy.data.lights.new('L','SUN')); l.data.energy=3; sc.collection.objects.link(l); l.rotation_euler=(cam.location-c).to_track_quat('Z','Y').to_euler()
    w=bpy.data.worlds.new('W'); sc.world=w; w.color=(0.3,0.3,0.3)
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
h=load(); shoot('/tmp/hf/before.png')
h=load(); me=h.data
cen=sum((v.co for v in me.vertices),Vector())/len(me.vertices)
bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
flip=[f for f in bm.faces if f.normal.dot(f.calc_center_median()-cen)<0]
bmesh.ops.reverse_faces(bm,faces=flip); bm.to_mesh(me); bm.free()
if me.has_custom_normals: 
    bpy.context.view_layer.objects.active=h; bpy.ops.mesh.customdata_custom_splitnormals_clear()
for p in me.polygons: p.use_smooth=True
print("flipped",len(flip),"of",len(me.polygons))
shoot('/tmp/hf/after.png')
for o in bpy.data.objects: o.select_set(o.type!='CAMERA' and o.type!='LIGHT')
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_apply=True)
