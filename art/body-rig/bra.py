# Rebuilds the female body's Under_top (bra) as a clean band offset from the torso skin: no shoulder pieces, straight cut edges.
# blender -b --factory-startup --python-exit-code 1 --python art/body-rig/bra.py -- <body-plain.glb> <out.json> <proofdir>
import bpy, bmesh, sys, json, mathutils
src, out, proof = sys.argv[sys.argv.index("--")+1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
B = sc.objects["Body"]; old = sc.objects["Under_top"]
names = [g.name for g in B.vertex_groups]
TORSO = {"Spine", "Spine1", "Spine2", "Chest", "UpperChest", "Hips"}
OFF, TOP_F, TOP_B, BOT = 0.0045, 1.212, 1.168, 1.040   # metres: skin gap, top edge front/back, bottom edge
SIDE = 0.120                                            # half-width past which the armpit is cut off
bm = bmesh.new(); bm.from_mesh(B.data)
dl = bm.verts.layers.deform.active
def dom(v):
    w = v[dl]; return names[max(w.items(), key=lambda kv: kv[1])[0]] if w else ""
keep = [f for f in bm.faces if 0.98 < f.calc_center_median().z < 1.23 and abs(f.calc_center_median().x) < 0.16]
bm2 = bmesh.new()
del_faces = [f for f in bm.faces if f not in set(keep)]
bmesh.ops.delete(bm, geom=del_faces, context="FACES")
bm.verts.ensure_lookup_table()
# straight cuts: top plane tilted front-high, bottom plane flat, sides vertical
yc = 0.077; ymin = min(v.co.y for v in bm.verts); ymax = max(v.co.y for v in bm.verts)
slope = (TOP_F - TOP_B) / (ymin - ymax)   # front is -y
def cut(co, no):
    g = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=g, plane_co=co, plane_no=no, clear_outer=True)
cut((0, ymin, TOP_F), mathutils.Vector((0, -slope, 1)).normalized())
cut((0, 0, BOT), (0, 0, -1))
cut((SIDE, 0, 0), (1, 0, 0)); cut((-SIDE, 0, 0), (-1, 0, 0))
# weld uv seams so the offset can't crack the back open
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context="VERTS")
bm.normal_update()
sk = {k.name: bm.verts.layers.shape.get(k.name) for k in B.data.shape_keys.key_blocks}
for v in bm.verts:
    n = v.normal.copy()
    v.co += n * OFF
    for nm, L in sk.items(): v[L] = v[L] + n * OFF
bm.verts.index_update(); BL = sk.get("Bust"); BA = sk.get("Basis")
bdel = [(v[BL] - v[BA]) if BL else mathutils.Vector() for v in bm.verts]
me = bpy.data.meshes.new("bra"); bm.to_mesh(me)
ob = bpy.data.objects.new("BraNew", me); sc.collection.objects.link(ob)
ob.parent = B.parent; ob.matrix_world = B.matrix_world.copy()
for g in B.vertex_groups: ob.vertex_groups.new(name=g.name)
# the deform layer travelled in bmesh; shape keys too
ob.data.materials.append(old.data.materials[0])
mod = ob.modifiers.new("arm", "ARMATURE"); mod.object = B.find_armature()
for p in ob.data.polygons: p.use_smooth = True
ob.shape_key_add(name="Basis"); kb = ob.shape_key_add(name="Bust", from_mix=False)
for i, v in enumerate(me.vertices): kb.data[i].co = v.co + bdel[i]
print("bra verts", len(me.vertices), "tris", sum(len(p.vertices) - 2 for p in me.polygons), "keys", [k.name for k in me.shape_keys.key_blocks] if me.shape_keys else None)
# dump for splice: glTF space (x, z, -y)
uv = me.uv_layers.active.data
vuv = [None] * len(me.vertices)
for l in me.loops: vuv[l.vertex_index] = tuple(uv[l.index].uv)
bust = me.shape_keys.key_blocks["Bust"].data if me.shape_keys else None
V = []
for v in me.vertices:
    ws = sorted(((ob.vertex_groups[g.group].name, g.weight) for g in v.groups if g.weight > 0), key=lambda t: -t[1])[:4]
    t = sum(w for _, w in ws) or 1
    d = (bust[v.index].co - v.co) if bust else mathutils.Vector()
    V.append({"p": [v.co.x, v.co.z, -v.co.y], "n": [v.normal.x, v.normal.z, -v.normal.y], "uv": [vuv[v.index][0], 1 - vuv[v.index][1]] if vuv[v.index] else [0, 0], "w": [[n, w / t] for n, w in ws], "bust": [d.x, d.z, -d.y]})
me.calc_loop_triangles()
json.dump({"v": V, "i": [i for t in me.loop_triangles for i in t.vertices]}, open(out, "w"))
# proof: old bra hidden, new shown, on the body, back/front/side
old.hide_render = True
B.data.shape_keys.key_blocks["Bust"].value = 0.7; me.shape_keys.key_blocks["Bust"].value = 0.7
for o in sc.objects:
    if o.type == "MESH" and o.name not in ("Body", "BraNew") and not o.name.startswith("Skin_") and "Eye" not in o.name: o.hide_render = True
sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = 656; sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); w.color = (0.35, 0.35, 0.35); sc.world = w
for i, (nm, pos) in enumerate((("back", (0, 1.0, 1.25)), ("front", (0, -1.0, 1.2)), ("side", (0.95, 0.35, 1.25)))):
    cam = bpy.data.objects.new(nm, bpy.data.cameras.new(nm)); sc.collection.objects.link(cam)
    cam.location = pos; cam.rotation_euler = (mathutils.Vector((0, 0.077, 1.12)) - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 45
    L = bpy.data.objects.new("L" + nm, bpy.data.lights.new("L" + nm, "AREA")); L.data.energy = 120; L.data.size = 1.5; L.location = (pos[0] * 1.5, pos[1] * 1.5, 2.2); sc.collection.objects.link(L)
    L.rotation_euler = (mathutils.Vector((0, 0.077, 1.12)) - L.location).to_track_quat("-Z", "Y").to_euler()
for nm in ("back", "front", "side"):
    for o in sc.objects:
        if o.type == "LIGHT": o.hide_render = o.name != "L" + nm
    sc.camera = sc.objects[nm]; sc.render.filepath = f"{proof}/bra_{nm}.png"; bpy.ops.render.render(write_still=True)
