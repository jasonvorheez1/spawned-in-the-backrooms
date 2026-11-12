# Level 11 subway stair railing: the Tripo enclosure with its floor slab cut out, so the stair shows through
import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/art/l11sub/sub-rail.glb")
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objs:
    mw=o.matrix_world
    vs=[mw@v.co for v in o.data.vertices]
    xs=[v.x for v in vs]; ys=[v.y for v in vs]; zs=[v.z for v in vs]
    print("bounds",o.name,round(min(xs),3),round(max(xs),3),round(min(ys),3),round(max(ys),3),round(min(zs),3),round(max(zs),3))
