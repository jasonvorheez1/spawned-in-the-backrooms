# Nov 16 (Shelly: "redo the heads with tripo with the guide references i gave you, then refine them with blender code"):
# the live critter Head mesh is pulled onto the Tripo head sculpt (art/critter-head-tripo/head-v1.glb, made from her
# 3/4 headshot guide): skull, cheeks and muzzle take the sculpt's surface; ears, neck rim, UVs, weights and every
# shape key stay the game's own (the deltas ride every key), so paint, hats and hair still seat.
# usage: blender -b --factory-startup --python-exit-code 1 --python tripo-conform.py -- <in.glb> <tripo.glb> <out.glb> <proofdir> [strength]
import bpy, sys, math, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; SRC, TRI, OUT, PD = a[:4]; K = float(a[4]) if len(a) > 4 else 1.0
os.makedirs(PD, exist_ok=True)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
head = bpy.data.objects["Head"]; me = head.data; mw = head.matrix_world; inv = mw.to_3x3().inverted()
kb = me.shape_keys.key_blocks; B = [k.co.copy() for k in kb["Basis"].data]; W = [mw @ c for c in B]
# the sculpt, scaled and set so its muzzle tip meets the head's (Blender front is -Y, up +Z)
pre = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=TRI)
tri = next(o for o in set(bpy.data.objects) - pre if o.type == "MESH")
TW = [tri.matrix_world @ v.co for v in tri.data.vertices]
HTIP = min(W, key=lambda p: p.y if abs(p.x) < 0.02 else 9)
TTIP = min(TW, key=lambda p: p.y if abs(p.x) < 0.01 else 9)
skull = lambda P: [p for p in P if abs(p.x) < 0.02]
hd = max(p.y for p in skull(W) if p.z > HTIP.z) - HTIP.y
td = max(p.y for p in skull(TW) if p.z > TTIP.z) - TTIP.y
S = hd / td; print("scale", round(S, 3), "head depth", round(hd, 3), "sculpt depth", round(td, 3))
T = [Vector((p.x * S, HTIP.y + (p.y - TTIP.y) * S, HTIP.z + (p.z - TTIP.z) * S)) for p in TW]
for i, v in enumerate(tri.data.vertices): v.co = tri.matrix_world.inverted() @ T[i]
tri.data.update()
bvh = BVHTree.FromPolygons([tuple(T[i]) for i in range(len(T))], [tuple(p.vertices) for p in tri.data.polygons])
# which head verts follow: not the ears, not the neck rim
gi = {g.name: g.index for g in head.vertex_groups}
EARS = {gi[n] for n in gi if n.lower().startswith("ear")}
zlo = min(p.z for p in W)
wgt = []
for i, v in enumerate(me.vertices):
    ear = sum(g.weight for g in v.groups if g.group in EARS)
    w = (1 - min(1, ear * 2)) * sm((W[i].z - zlo - 0.03) / 0.07)
    wgt.append(w)
D = []
for i, p in enumerate(W):
    hit = bvh.find_nearest(p)
    D.append((hit[0] - p) if hit and hit[0] is not None and (hit[0] - p).length < 0.12 else Vector())
# smooth the field over the mesh so nothing spikes, then carry ear bases with the skull
nb = [[] for _ in me.vertices]
for e in me.edges: a0, b0 = e.vertices; nb[a0].append(b0); nb[b0].append(a0)
for _ in range(6):
    D = [(D[i] * 2 + sum((D[j] for j in nb[i]), Vector())) / (2 + len(nb[i])) if nb[i] else D[i] for i in range(len(D))]
E = [d * w * K for d, w in zip(D, wgt)]
for _ in range(10):   # ears and rim inherit the motion of their roots, fading out
    E = [E[i] if wgt[i] > 0.6 else (E[i] + sum((E[j] for j in nb[i]), Vector())) / (1 + len(nb[i])) if nb[i] else E[i] for i in range(len(E))]
print("max move", round(max(e.length for e in E), 4))
for k in kb:
    for i in range(len(B)): k.data[i].co = k.data[i].co + inv @ E[i]
for i, v in enumerate(me.vertices): v.co = kb["Basis"].data[i].co
me.update()
tri.hide_render = True
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_image_format="JPEG")
# proof: clay, before (ghost) and after, front, 3/4, side
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 656
clay = bpy.data.materials.new("clay"); clay.use_nodes = True; clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.6, 0.4, 1)
for o in bpy.data.objects:
    if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(clay)
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.52, 1)
c = Vector((0, 0, 0.84))
for nm, d in (("front", (0, -1, 0.05)), ("34", (-0.75, -0.75, 0.12)), ("side", (-1, 0, 0.05))):
    cd = bpy.data.cameras.new(nm); cd.lens = 70; cam = bpy.data.objects.new(nm, cd); sc.collection.objects.link(cam)
    cam.location = c + Vector(d).normalized() * 1.9; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    ld = bpy.data.lights.new(nm + "L", "SUN"); ld.energy = 3; L = bpy.data.objects.new(nm + "L", ld); sc.collection.objects.link(L); L.rotation_euler = cam.rotation_euler
    for o in sc.objects:
        if o.type == "LIGHT": o.hide_render = o is not L
    sc.camera = cam; sc.render.filepath = f"{PD}/{nm}.png"; bpy.ops.render.render(write_still=True)
