# the slim kemono for play: faces glTF +Z, every transform applied so the mesh's own coordinates are metres (mat-catskin paints clothes in that bind space),
# its one material named "fur" (its baked picture saved apart, the shader's fur picture); prints the landmarks W.body.slim needs
import bpy, math, json
from mathutils import Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/kemono/kemono-slim-rig.glb")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in [o for o in bpy.data.objects if o.name.startswith("Icosphere")]: bpy.data.objects.remove(o)
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.vertex_groups)
B = lambda n: rig.matrix_world @ rig.data.bones["mixamorig:" + n].head_local
t = B("LeftToeBase") - B("LeftFoot")
R = Matrix.Rotation(math.atan2(-1, 0) - math.atan2(t.y, t.x), 4, "Z")
for o in bpy.data.objects:
    if o.parent is None: o.matrix_world = R @ o.matrix_world
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()
# feet on 0
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]; z0 = min(zs)
mat = body.data.materials[0]; mat.name = "fur"
img = next((n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
if img: img.filepath_raw = "/workspace/kemono/slim-fur.png"; img.file_format = "PNG"; img.save()
# landmarks in glTF space: x = Blender x, y = Blender z (up), z = -Blender y (front)
g = lambda v: [round(v.x, 4), round(v.z - z0, 4), round(-v.y, 4)]
J = {n: g(B(n)) for n in ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase"]}
tail = [g(rig.matrix_world @ b.head_local) for b in rig.data.bones if "tail" in b.name.lower()]
V = [g(body.matrix_world @ v.co) for v in body.data.vertices]
H = max(v[1] for v in V)
# chest front: the most forward z of the torso between waist and armpit, and the torso's back
band = [v for v in V if abs(v[0]) < 0.08 and 0.5 * H < v[1] < 0.66 * H]
print("LANDMARKS", json.dumps({"H": round(H, 4), "J": J, "tailBones": tail, "torsoFront": max(v[2] for v in band), "torsoBack": min(v[2] for v in band), "img": bool(img), "verts": len(V)}))
# tail extent: verts behind the back below hips
back = min(v[2] for v in band)
tv = [v for v in V if v[2] < back - 0.03]
if tv: print("TAILVERTS", len(tv), "y", min(v[1] for v in tv), max(v[1] for v in tv), "z", min(v[2] for v in tv), "x", min(v[0] for v in tv), max(v[0] for v in tv))
bpy.ops.export_scene.gltf(filepath="/workspace/kemono/kemono-slim-play.glb", export_apply=True)
