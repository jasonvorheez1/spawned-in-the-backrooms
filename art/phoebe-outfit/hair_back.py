# Shelly Nov 14: "phoebe's hair isnt using the model from before". Puts the earlier outfit's hair (the Nov 8 original johnadams2 built, peach fringe over one eye and the bun:
# /cdn/value.e43b3c86…glb, fetched as /workspace/phoebe/outfit-old.glb) back on the cat outfit (build_cat.py → outfit-cat.glb),
# fitted to the cat skull: scaled by the two caps' widths, moved Head bone onto Head bone, weighted whole to the head.
# blender -b --factory-startup --python-exit-code 1 --python art/phoebe-outfit/hair_back.py
import bpy, bmesh, sys
from mathutils import Vector
W = "/workspace/phoebe"; OUT = W + "/phoebe-outfit-cat-hair.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=W + "/outfit-cat.glb")
CAT = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
catHead = CAT.matrix_world @ CAT.data.bones["mixamorig:Head"].head_local
newHair = [o for o in bpy.data.objects if o.type == "MESH" and o.data.materials and o.data.materials[0].name.startswith("hair")]
hv = [o.matrix_world @ v.co for o in newHair if o.name.startswith("hair") for v in o.data.vertices]
newW = max(v.x for v in hv) - min(v.x for v in hv); newD = max(v.y for v in hv) - min(v.y for v in hv); newCy = (max(v.y for v in hv) + min(v.y for v in hv)) / 2; newTop = max(v.z for v in hv)
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
# which way the old outfit faces: its bow sits on the chest. The cat outfit faces -Y; if the old one faces +Y the hair turns 180
bi = [i for i, m in enumerate(src.data.materials) if m.name.startswith("bow")]
bowY = [ (src.matrix_world @ src.data.vertices[vi].co).y for p in src.data.polygons if p.material_index in bi for vi in p.vertices ]
FLIP = bool(bowY) and sum(bowY) / len(bowY) > oldHead.y
if FLIP: ov = [Vector((2 * oldHead.x - w.x, 2 * oldHead.y - w.y, w.z)) for w in ov]
print("FLIP", FLIP, "bowY", round(sum(bowY) / max(1, len(bowY)), 3), "headY", round(oldHead.y, 3))
cap = [v for v in ov if v.z > oldHead.z + 0.05]
oldW = max(v.x for v in cap) - min(v.x for v in cap)
s = newW / oldW
oldD = max(v.y for v in cap) - min(v.y for v in cap); oldCy = (max(v.y for v in cap) + min(v.y for v in cap)) / 2
sy = max(s, newD / oldD) * 1.04   # the cat skull runs deeper front to back than the human one: the back hair sat inside it
for v, w in zip(me.vertices, ov):
    d = w - Vector((oldHead.x, oldCy, oldHead.z))
    v.co = Vector((catHead.x + d.x * s, newCy + d.y * sy, catHead.z + d.z * s))
print("sy", round(sy, 3), "newD", round(newD, 3), "oldD", round(oldD, 3))
HC = Vector((catHead.x, newCy, catHead.z + 0.5 * (newTop - catHead.z)))
for v in me.vertices:   # a shell clear of the cat skull: its crown poked through the old cap; the top half swells more, the hanging strands less
    up = max(0.0, min(1.0, (v.co.z - HC.z) / max(0.001, newTop - HC.z)))
    v.co = HC + (v.co - HC) * (1.1 + 0.08 * up)
top = max(v.co.z for v in me.vertices); dz = newTop + 0.02 - top
for v in me.vertices: v.co.z += dz            # crown on the crown the cat cap sat on
# the original fringe hung to a human chin; on her shorter muzzle it covered both eyes. Front strands below the brow are drawn
# up toward it, the left side (her right eye) kept longer so one eye stays half-hidden, the other eye and the mouth clear
TRIM = False  # set True only if the fringe still hides both eyes
BROW = catHead.z + 0.56 * (newTop - catHead.z)
for v in me.vertices:
    c = v.co
    if TRIM and c.y < catHead.y - 0.02 and c.z < BROW:
        k = 0.6 if c.x > catHead.x + 0.03 else 0.12
        c.z = BROW + (c.z - BROW) * k
me.materials.clear(); me.materials.append(hairMat)
hair = bpy.data.objects.new("hair", me); bpy.context.scene.collection.objects.link(hair)
g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
hair.parent = CAT; hair.modifiers.new("skin", "ARMATURE").object = CAT
for o in olds: bpy.data.objects.remove(o)
# a hair-coloured cap under the strands: the old cut was parted for a human skull, and on the rounder cat crown the part opened onto fur
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1.0)
cz = HC.z; rz = (newTop - cz) * 0.9
for v in bm.verts: v.co = Vector((catHead.x + v.co.x * newW / 2 * 0.93, newCy + v.co.y * newD / 2 * 0.95, cz + v.co.z * rz))
cut = [v for v in bm.verts if (v.co.z < cz + (0.38 if v.co.y < newCy - newD * 0.2 else 0.0) * rz)]
bmesh.ops.delete(bm, geom=cut, context="VERTS")
cm = bpy.data.meshes.new("cap"); bm.to_mesh(cm); bm.free(); cm.materials.append(hairMat)
cap = bpy.data.objects.new("hair_cap", cm); bpy.context.scene.collection.objects.link(cap)
cg = cap.vertex_groups.new(name="mixamorig:Head"); cg.add(list(range(len(cm.vertices))), 1.0, "REPLACE")
cap.parent = CAT; cap.modifiers.new("skin", "ARMATURE").object = CAT
print("cap verts", len(cm.vertices))
print("scale", round(s, 3), "dz", round(dz, 3), "verts", len(me.vertices), "newW", round(newW, 3), "oldW", round(oldW, 3))
for o in bpy.data.objects:
    if o.type == "MESH": o.data.shade_smooth() if hasattr(o.data, "shade_smooth") else None
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_skins=True)
# proof: front and side of the head, on her body
bpy.ops.import_scene.gltf(filepath=W + "/body_cat.glb")
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 600; sc.render.resolution_y = 600
w = bpy.data.worlds.new("w"); w.color = (0.5, 0.5, 0.5); sc.world = w
L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); L.data.energy = 3; sc.collection.objects.link(L); L.rotation_euler = (0.6, 0, 0.3)
for n, p in (("front", (0, -0.9, 0.78)), ("side", (-0.7, -0.6, 0.78)), ("back", (0, 1.2, 0.8)), ("top", (0.25, -0.55, 1.25))):
    cam = bpy.data.objects.new(n, bpy.data.cameras.new(n)); sc.collection.objects.link(cam); cam.location = p
    d = Vector((0, 0, 0.76)) - Vector(p); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 50
    sc.camera = cam; sc.render.filepath = f"/tmp/phoebe/hair_{n}.png"; bpy.ops.render.render(write_still=True)
