import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="sub-rail.glb")
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
import mathutils
for o in objs:
    mw=o.matrix_world
    bm=bmesh.new(); bm.from_mesh(o.data)
    vs=[mw@v.co for v in bm.verts]
    xs=[v.x for v in vs]; ys=[v.y for v in vs]; zs=[v.z for v in vs]
    print("bounds",min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))
    bm.free()
