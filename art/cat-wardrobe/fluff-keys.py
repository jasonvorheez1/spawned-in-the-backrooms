# Fluff follows the head's shape keys (Shelly Nov 11: "the faces of the model forming into the other model ... the snout too").
# The fluff glbs had no keys, so a Snout/Ear/Chest morph on the body pushed skin up through the locks. Each fluff vertex takes the
# inverse-distance blend of its 6 nearest body vertices' offsets for every key, exported as morph targets with the same names.
# run: blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/fluff-keys.py
import bpy, os, glob
from mathutils import Vector
from mathutils.kdtree import KDTree
BODY = {"f": "/tmp/ears/f.glb", "m": "/tmp/ears/m.glb"}   # live CAT_BODY glbs, fetched ?raw
SRC = "/workspace/catfluff"; OUT = "/workspace/catfluff-keys"; os.makedirs(OUT, exist_ok=True)
def run(path, sex):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    mine = set(bpy.data.objects)
    fl = [o for o in mine if o.type == "MESH"]
    bpy.ops.import_scene.gltf(filepath=BODY[sex])
    body = [o for o in bpy.data.objects if o not in mine and o.type == "MESH" and o.data.shape_keys]
    pts, deltas, names = [], [], []
    for b in body: names += [k.name for k in b.data.shape_keys.key_blocks[1:] if k.name not in names]
    for b in body:
        M = b.matrix_world; kb = b.data.shape_keys.key_blocks; base = kb[0].data
        for i, v in enumerate(b.data.vertices):
            pts.append(M @ v.co)
            deltas.append({k.name: (M.to_3x3() @ (k.data[i].co - base[i].co)) for k in kb[1:]})
    kd = KDTree(len(pts))
    for i, p in enumerate(pts): kd.insert(p, i)
    kd.balance()
    moved = 0
    for o in fl:
        M = o.matrix_world; Mi = M.inverted().to_3x3()
        if not o.data.shape_keys: o.shape_key_add(name="Basis")
        for n in names:
            sk = o.shape_key_add(name=n, from_mix=False)
            for i, v in enumerate(o.data.vertices):
                hits = kd.find_n(M @ v.co, 6); wsum = 0; d = Vector()
                for _, j, dist in hits:
                    w = 1 / max(dist, 1e-4) ** 2; wsum += w; d += deltas[j].get(n, Vector()) * w
                d = d / wsum
                near = hits[0][2]
                fall = max(0.0, 1 - max(0.0, near - 0.03) / 0.05)   # locks far off the skin (tips) still ride, fading past 8 cm
                if d.length * fall > 1e-5: moved += 1
                sk.data[i].co = v.co + Mi @ (d * fall)
    for o in list(bpy.data.objects):
        if o not in mine: bpy.data.objects.remove(o)
    for o in bpy.data.objects: o.select_set(True)
    out = OUT + "/" + os.path.basename(path)
    bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_skins=True, export_morph=True, export_animations=False, export_apply=False)
    print("KEYED", out, names, moved)
for p in sorted(glob.glob(SRC + "/*-[fm].glb")):
    run(p, p[-5])
