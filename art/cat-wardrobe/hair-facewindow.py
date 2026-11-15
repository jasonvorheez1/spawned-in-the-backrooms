# Face window: clear hair off the eyes and snout of the cat head, and (wolfcut) pull the volume in toward the skull.
import bpy, bmesh, sys
from mathutils.bvhtree import BVHTree
src, dst, sex, style = sys.argv[sys.argv.index("--")+1:][:4]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
head = bpy.data.objects["Head"]
for k in head.data.shape_keys.key_blocks: k.value = 0
hb = bmesh.new(); hb.from_mesh(head.data); hb.transform(head.matrix_world); bvh = BVHTree.FromBMesh(hb)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=src)
BROW = {'buzz': 0.945, 'wolfcut': 0.935, 'mullet': 0.935, 'locs': 0.935}[style]
LIFT = {'f': 0.0, 'm': 0.057}[sex]; WID = {'f': 0.215, 'm': 0.222}[sex]  # the male head stands 5.7 cm taller (top 1.109 vs 1.052)
SQUEEZE = {'wolfcut': 0.55}.get(style, 1.0)
def inwindow(c):
    if c.y > -0.04: return False                     # front half only: sides and back keep their length
    ax = abs(c.x)
    if ax > WID: return False                      # outside the face: side locks frame it
    brow = BROW + LIFT - 0.10 * (ax / WID) ** 2           # the fringe line arches down at the temples
    return c.z < brow
removed = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    M = o.matrix_world; Mi = M.inverted()
    bm = bmesh.new(); bm.from_mesh(o.data)
    shp = list(bm.verts.layers.shape.values())
    if SQUEEZE < 1:
        for v in bm.verts:
            w = M @ v.co
            loc, nrm, _, d = bvh.find_nearest(w)
            if loc is None or d < 0.012: continue
            nw = loc + (w - loc) * SQUEEZE + (w - loc).normalized() * 0.012 * (1 - SQUEEZE)
            delta = Mi.to_3x3() @ (nw - w)
            v.co += delta
            for L in shp: v[L] += delta
    kill = [f for f in bm.faces if inwindow(M @ f.calc_center_median())]
    removed += len(kill)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(o.data); bm.free(); o.data.update()
print("WINDOW", style, sex, "removed", removed)
bpy.ops.export_scene.gltf(filepath=dst, export_skins=True, export_morph=True, export_animations=False, export_apply=False, export_image_format="JPEG")
