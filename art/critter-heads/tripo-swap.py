# Nov 16 (Shelly "go" on the full swap): the Tripo head (art/critter-head-tripo/head-v1.glb, from her 3/4 headshot guide)
# REPLACES the critter body's Head mesh. It keeps the game's contract: slots headFur/innerEar (colourable fur, projected face),
# Head/Neck skin weights, and every snout/ear shape key (Snout_*, Ear_*, Ear_Hide) carried over from the old head by
# nearest-surface deltas. Scaled to the old skull width so hats and hair seat where they did.
# usage: blender -b --factory-startup --python-exit-code 1 --python tripo-swap.py -- <body.glb> <tripo.glb> <out.glb> <proofdir> [faces]
import bpy, sys, os, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
a = sys.argv[sys.argv.index("--") + 1:]; SRC, TRI, OUT, PD = a[:4]; NF = int(a[4]) if len(a) > 4 else 9000
os.makedirs(PD, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
old = bpy.data.objects["Head"]; arm = bpy.data.objects["Armature"]
om = old.data; omw = old.matrix_world.copy()
kb = om.shape_keys.key_blocks
OB = [omw @ k.co for k in kb["Basis"].data]
# old head, triangulated, for nearest-surface lookups (vertex indices survive triangulation)
bm = bmesh.new(); bm.from_mesh(om)
for v, p in zip(bm.verts, OB): v.co = p
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
TRIS = [(tuple(v.index for v in f.verts), f.material_index) for f in bm.faces]
bvh = BVHTree.FromBMesh(bm)
# old skull frame
mid = [p for p in OB if abs(p.x) < 0.02]
tip = min(mid, key=lambda p: p.y)
wid = max(p.x for p in OB if p.z < tip.z + 0.12) - min(p.x for p in OB if p.z < tip.z + 0.12)
# the Tripo head
pre = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=TRI)
new = [o for o in set(bpy.data.objects) - pre]
tri = next(o for o in new if o.type == "MESH")
M = tri.matrix_world.copy(); tri.parent = None
for o in new:
    if o is not tri: bpy.data.objects.remove(o)
tri.data.transform(M); tri.matrix_world = Matrix()
P = [v.co for v in tri.data.vertices]
ext = lambda i: max(p[i] for p in P) - min(p[i] for p in P)
# its muzzle points along the horizontal axis whose far end is the narrower (snout) end: test +-X, +-Y
EX = [ext(0), ext(1), ext(2)]
def snout_dir():
    best = None
    for ax, sg in ((0, 1), (0, -1), (1, 1), (1, -1)):
        far = max(p[ax] * sg for p in P); lim = far - 0.12 * EX[ax]; band = [p for p in P if p[ax] * sg > lim]
        w = max(p[1 - ax] for p in band) - min(p[1 - ax] for p in band)
        if best is None or w < best[0]: best = (w, ax, sg)
    return best[1:]
ax, sg = snout_dir()
rot = {(1, -1): 0, (0, 1): -1.5708, (0, -1): 1.5708, (1, 1): 3.1416}[(ax, sg)]
tri.data.transform(Matrix.Rotation(rot, 4, "Z")); print("snout axis", ax, sg)
P = [v.co for v in tri.data.vertices]
EX = [ext(0), ext(1), ext(2)]
xl = 0.02 * EX[0] + 1e-3
ttip = min([p for p in P if abs(p.x) < xl] or P, key=lambda p: p.y)
zl = ttip.z + 0.36
twid = max(p.x for p in P if p.z < zl) - min(p.x for p in P if p.z < zl)
s = wid / max(ext(0) * 0.0 + twid, 1e-6)
for v in tri.data.vertices:
    p = v.co; v.co = Vector((tip.x + (p.x - ttip.x) * s, tip.y + (p.y - ttip.y) * s, tip.z + (p.z - ttip.z) * s))
tri.data.update(); print("scale", round(s, 4))
# clean: weld, decimate to budget, smooth
bpy.context.view_layer.objects.active = tri; tri.select_set(True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode="OBJECT")
if len(tri.data.polygons) > NF:
    d = tri.modifiers.new("dec", "DECIMATE"); d.ratio = NF / len(tri.data.polygons); bpy.ops.object.modifier_apply(modifier="dec")
for f in tri.data.polygons: f.use_smooth = True
for u in list(tri.data.uv_layers): tri.data.uv_layers.remove(u)
tri.data.materials.clear()
for m in om.materials: tri.data.materials.append(m)
# per new vertex: nearest old triangle
def near(p):
    loc, nrm, fi, d = bvh.find_nearest(p); return fi, loc
NV = [v.co.copy() for v in tri.data.vertices]
hits = [near(p) for p in NV]
# slots: each face takes the old surface's slot under its centre
for f in tri.data.polygons:
    fi, _ = near(f.center); f.material_index = TRIS[fi][1]
# weights: barycentric blend of the old triangle's vertex weights
gname = {g.index: g.name for g in old.vertex_groups}
OW = [{gname[g.group]: g.weight for g in v.groups} for v in om.vertices]
for n in gname.values(): tri.vertex_groups.new(name=n)
def bary(fi, loc):
    a_, b_, c_ = (OB[i] for i in TRIS[fi][0])
    w = barycentric_transform(loc, a_, b_, c_, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    w = [max(0, x) for x in w]; t = sum(w) or 1; return [x / t for x in w]
for vi, (fi, loc) in enumerate(hits):
    acc = {}
    for wt, oi in zip(bary(fi, loc), TRIS[fi][0]):
        for n, g in OW[oi].items(): acc[n] = acc.get(n, 0) + g * wt
    for n, g in acc.items():
        if g > 1e-4: tri.vertex_groups[n].add([vi], g, "REPLACE")
# shape keys: each old key's delta, carried by the same barycentric blend
tri.shape_key_add(name="Basis")
R = omw.to_3x3()
for k in kb[1:]:
    D = [R @ (k.data[i].co - kb["Basis"].data[i].co) for i in range(len(om.vertices))]
    nk = tri.shape_key_add(name=k.name, from_mix=False)
    for vi, (fi, loc) in enumerate(hits):
        dd = Vector()
        for wt, oi in zip(bary(fi, loc), TRIS[fi][0]): dd += D[oi] * wt
        nk.data[vi].co = NV[vi] + dd
# seat it where the old head was: same parent, skin, name
oldname = old.name; bpy.data.objects.remove(old); tri.name = oldname; tri.data.name = oldname
tri.parent = arm; tri.matrix_parent_inverse = arm.matrix_world.inverted()
tri.modifiers.new("skin", "ARMATURE").object = arm
print("faces", len(tri.data.polygons), "verts", len(tri.data.vertices), "keys", [k.name for k in tri.data.shape_keys.key_blocks])
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_skins=True, export_morph=True, export_animation_mode="ACTIONS", export_yup=True)
# proof: front 3/4, side, with the old fur grey
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = sc.render.resolution_y = 640
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
for m in tri.data.materials:
    m.use_nodes = True; bs = m.node_tree.nodes.get("Principled BSDF")
    if bs: bs.inputs[0].default_value = (0.85, 0.62, 0.4, 1) if m.name == "headFur" else (0.9, 0.55, 0.6, 1)
hc = sum((tri.matrix_world @ v.co for v in tri.data.vertices), Vector()) / len(tri.data.vertices)
cd = bpy.data.cameras.new("c"); cd.lens = 70; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
ld = bpy.data.lights.new("k", "SUN"); ld.energy = 3; L = bpy.data.objects.new("k", ld); sc.collection.objects.link(L)
for nm, d in (("a", Vector((-0.6, -1, 0.15))), ("b", Vector((-1, 0, 0.05))), ("c", Vector((0.5, 1, 0.2)))):
    cam.location = hc + d.normalized() * 1.1; cam.rotation_euler = (hc - cam.location).to_track_quat("-Z", "Y").to_euler(); L.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{PD}/{nm}.png"; bpy.ops.render.render(write_still=True)
