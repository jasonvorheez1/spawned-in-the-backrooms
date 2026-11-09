# Shelly Nov 9: "either the hair is too big to fit my character or too small". The live Tripo rows (hair.yml human 14+) ballooned off the skull
# with shards over the cheeks. Each live GLB is re-seated on the live body's head: shrink about the skull centre to the smallest scale where
# under 2% of the near-skull verts sink in, side volume pulled in toward the head, stragglers pushed 4 mm out. Same rig, same Head skin.
# blender -b --factory-startup --python-exit-code 1 --python art/tripo-hair/refit.py -- <f|m> <row> [<row> ...]
import bpy, bmesh, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index("--") + 1:]; SEX, ROWS = A[0], A[1:]
D = "/workspace/hair/tri"; OUT = f"{D}/out"; os.makedirs(OUT, exist_ok=True)
def head_of(path):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=path)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    hz = (rig.matrix_world @ rig.data.bones["Head"].head_local).z
    ms = [o for o in bpy.data.objects if o.type == "MESH"]
    hd = next((o for o in ms if o.name.lower().startswith("head")), None)
    src = [hd] if hd else ms
    bm = bmesh.new()
    for o in src:
        m = o.data.copy(); m.transform(o.matrix_world); t = bmesh.new(); t.from_mesh(m)
        bmesh.ops.delete(t, geom=[v for v in t.verts if v.co.z < hz - 0.02], context="VERTS"); tm = bpy.data.meshes.new("t"); t.to_mesh(tm); t.free(); bm.from_mesh(tm)
    P = [v.co.copy() for v in bm.verts]; top = max(p.z for p in P)
    cy = (min(p.y for p in P) + max(p.y for p in P)) / 2
    return BVHTree.FromBMesh(bm), hz, top, cy, max(abs(p.x) for p in P if p.z > top - 0.09)
TREE, HZ, TOP, CY, RX = head_of(f"{D}/body_{SEX}.glb")
print("head", round(HZ, 3), round(TOP, 3), round(CY, 3), round(RX, 3))
C = Vector((0, CY, HZ + (TOP - HZ) * 0.45))
def inside(q):
    loc, n, i, d = TREE.find_nearest(q)
    return loc is not None and d < 0.06 and (q - loc).dot(n) < 0
for r in ROWS:
    for tag in ("", "_hat"):
        src = f"{D}/{SEX}{r}{tag}.glb"
        if not os.path.exists(src): continue
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
        hair = [o for o in bpy.data.objects if o.type == "MESH"]
        pts = [(o, v, o.matrix_world) for o in hair for v in o.data.vertices]
        W = lambda o, v: o.matrix_world @ v.co
        near = [(o, v) for o, v, m in pts if (TREE.find_nearest(W(o, v))[3] or 1) < 0.06]
        smp = near[:: max(1, len(near) // 1500)]
        best = 1.0
        for k in range(25):
            f = 0.70 + k * 0.0125
            if sum(1 for o, v in smp if inside(C + (W(o, v) - C) * f)) / max(1, len(smp)) < 0.02: best = f; break
        moved = 0
        for o, v, m in pts:
            mi = m.inverted(); p = W(o, v); p = C + (p - C) * best
            # side bulk above the jaw hugs the head: what stands > 3 cm off the skin beside the face comes in by half
            loc, n, i, d = TREE.find_nearest(p)
            if loc is not None and abs(p.x) > RX * 0.6 and p.z > HZ - 0.02 and (p - loc).dot(n) > 0.03:
                p = loc + n * (0.03 + ((p - loc).dot(n) - 0.03) * 0.5)
            loc, n, i, d = TREE.find_nearest(p)
            if loc is not None and d < 0.06 and (p - loc).dot(n) < 0.003: p = loc + n * 0.004; moved += 1
            v.co = mi @ p
        for o in hair: o.data.update()
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{SEX}{r}{tag}.glb", use_selection=True, export_animations=False, export_image_format="JPEG", export_jpeg_quality=85)
        print("refit", SEX + r + tag, "scale", round(best, 4), "pushed", moved, "of", len(pts))
