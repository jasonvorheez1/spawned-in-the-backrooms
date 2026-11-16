# The slim kemono for play (Shelly Nov 16 "make her slimmer, more anime"): faces glTF +Z, hips over the origin, feet on 0, every transform applied,
# so the mesh's own coordinates are metres in the bind space scripts/mat-catskin.js paints clothes in. Its one material is "fur"; the Tripo colour picture
# is saved apart as the shader's fur picture. Prints the landmarks for cat-wardrobe.yml body.slim.
import bpy, math, json
from mathutils import Matrix, Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/kemono/kemono-slim-rig.glb")
for o in [o for o in bpy.data.objects if o.name.startswith("Icosphere")]: bpy.data.objects.remove(o)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.vertex_groups)
B = lambda n: rig.matrix_world @ rig.data.bones["mixamorig:" + n].head_local
t = B("LeftToeBase") - B("LeftFoot")
R = Matrix.Rotation(math.atan2(-1, 0) - math.atan2(t.y, t.x), 4, "Z")
rig.matrix_world = R @ rig.matrix_world
bpy.context.view_layer.update()
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
h = B("Hips")
rig.matrix_world = Matrix.Translation((-h.x, -h.y, -min(zs))) @ rig.matrix_world
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()
mat = body.data.materials[0]; mat.name = "fur"
img = next(n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Color"))
img.filepath_raw = "/workspace/kemono/slim-fur.png"; img.file_format = "PNG"; img.save()
g = lambda v: [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]   # glTF: y up, +z front
J = {n: g(B(n)) for n in ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "LeftUpLeg", "LeftLeg", "LeftFoot"]}
V = [g(body.matrix_world @ v.co) for v in body.data.vertices]
def slab(y0, y1, xmax=0.09):
    s = [v for v in V if y0 < v[1] < y1 and abs(v[0]) < xmax]
    return (round(min(v[2] for v in s), 4), round(max(v[2] for v in s), 4), round(max(abs(v[0]) for v in s), 4)) if s else None
prof = {round(y, 2): slab(y - 0.01, y + 0.01, 0.12) for y in [0.36 + 0.02 * i for i in range(19)]}
# the crotch: lowest y where the gap between the legs closes at x = 0
crotch = min((v[1] for v in V if abs(v[0]) < 0.006 and 0.3 < v[1] < 0.55), default=None)
# the tail: verts well behind the back at hip height and outward, centreline by distance from its root
back = -0.08   # the rump's back at hip height (PROFILE y 0.36: -0.074); everything behind it there is tail
tv = [v for v in V if v[2] < back and 0.3 < v[1] < 0.62]
root = min(tv, key=lambda v: v[0] ** 2 + (v[1] - 0.45) ** 2 + (v[2] - back) ** 2) if tv else None
segs = []
if tv:
    d = lambda v: math.dist(v, root); tv.sort(key=d); n = len(tv)
    for a, b in [(0, .08), (.3, .38), (.62, .7), (.92, 1)]:
        c = tv[int(a * n):max(int(b * n), int(a * n) + 1)]; segs.append([round(sum(p[i] for p in c) / len(c), 3) for i in range(3)])
print("LANDMARKS", json.dumps({"J": J, "crotch": crotch, "back": back, "tail": segs, "tailN": len(tv)}))
print("PROFILE", json.dumps(prof))
bpy.ops.export_scene.gltf(filepath="/workspace/kemono/kemono-slim-play.glb", export_apply=True)
