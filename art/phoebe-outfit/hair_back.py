# Shelly Nov 14: "phoebe's hair isnt using the model from before". Puts the earlier outfit's hair (the Nov 8 original johnadams2 built, peach fringe over one eye and the bun:
# /cdn/value.e43b3c86…glb, fetched as /workspace/phoebe/outfit-old.glb) back on the cat outfit (build_cat.py → outfit-cat.glb),
# fitted to the cat skull: scaled by the two caps' widths, moved Head bone onto Head bone, weighted whole to the head.
# blender -b --factory-startup --python-exit-code 1 --python art/phoebe-outfit/hair_back.py
import bpy, bmesh
from mathutils import Vector
W = "/workspace/phoebe"; OUT = W + "/phoebe-outfit-cat-hair.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=W + "/outfit-cat.glb")
CAT = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
catHead = CAT.matrix_world @ CAT.data.bones["mixamorig:Head"].head_local
newHair = [o for o in bpy.data.objects if o.type == "MESH" and o.data.materials and o.data.materials[0].name.startswith("hair")]
hv = [o.matrix_world @ v.co for o in newHair if o.name.startswith("hair") for v in o.data.vertices]
newW = max(v.x for v in hv) - min(v.x for v in hv); newTop = max(v.z for v in hv)
hairMat = newHair[0].data.materials[0]
for o in newHair: bpy.data.objects.remove(o)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=W + "/outfit-old.glb")
olds = [o for o in bpy.data.objects if o not in before]
OA = [o for o in olds if o.type == "ARMATURE"][0]
oldHead = OA.matrix_world @ OA.data.bones["Head"].head_local
src = [o for o in olds if o.type == "MESH" and o.name.startswith("PhoebeOutfit")][0]
# the hair faces alone, into their own mesh
bm = bmesh.new(); bm.from_mesh(src.data)
hi = [i for i, m in enumerate(src.data.materials) if m.name.startswith("hair")][0]
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != hi], context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
me = bpy.data.meshes.new("hair"); bm.to_mesh(me); bm.free()
ov = [src.matrix_world @ v.co for v in me.vertices]
cap = [v for v in ov if v.z > oldHead.z + 0.05]
oldW = max(v.x for v in cap) - min(v.x for v in cap)
s = newW / oldW
for v, w in zip(me.vertices, ov): v.co = catHead + (w - oldHead) * s
top = max(v.co.z for v in me.vertices); dz = newTop - top
for v in me.vertices: v.co.z += dz            # crown on the crown the cat cap sat on
me.materials.clear(); me.materials.append(hairMat)
hair = bpy.data.objects.new("hair", me); bpy.context.scene.collection.objects.link(hair)
g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
hair.parent = CAT; hair.modifiers.new("skin", "ARMATURE").object = CAT
for o in olds: bpy.data.objects.remove(o)
print("scale", round(s, 3), "dz", round(dz, 3), "verts", len(me.vertices), "newW", round(newW, 3), "oldW", round(oldW, 3))
for o in bpy.data.objects:
    if o.type == "MESH": o.data.shade_smooth() if hasattr(o.data, "shade_smooth") else None
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_skins=True)
# proof: front and side of the head
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 600; sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); w.color = (0.5, 0.5, 0.5); sc.world = w
L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); L.data.energy = 3; sc.collection.objects.link(L); L.rotation_euler = (0.6, 0, 0.3)
for n, p in (("front", (0, -1.4, 0.75)), ("side", (1.4, 0, 0.75)), ("back", (0, 1.4, 0.75))):
    cam = bpy.data.objects.new(n, bpy.data.cameras.new(n)); sc.collection.objects.link(cam); cam.location = p
    d = Vector((0, 0, 0.7)) - Vector(p); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 50
    sc.camera = cam; sc.render.filepath = f"/tmp/phoebe/hair_{n}.png"; bpy.ops.render.render(write_still=True)
